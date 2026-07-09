// webr-lib.js -- shared live-R notebook framework. Loads real R, compiled to
// WebAssembly, and runs it client-side: no server, no pyodide-style sandbox
// standing in for the real thing. Verified working on plain static hosting
// (GitHub Pages cannot set the COOP/COEP headers webR's fast path wants; it
// auto-falls-back to the documented PostMessage channel, which is what this
// file requests explicitly). The one real limitation of that fallback:
// readline()/menu()/browser() and interrupting a running eval are
// unsupported. Nothing on this site needs interactive mid-script input, so
// that limitation costs nothing here.
//
// Usage, one call per page that wants a live cell:
//   import { mountLiveR } from './webr-lib.js';
//   mountLiveR(document.getElementById('cell-host'), {
//     code: 'x <- c(4, 8, 15, 16, 23, 42)\nmean(x)\nsd(x)',
//     height: 110,     // editor height in px
//     autorun: false,  // run once on mount, or wait for the Run button
//   });
//
// One WebR runtime is shared across every cell on a page (a second cell
// reuses the first's ~6s init instead of paying it twice), and the runtime
// itself is only requested the first time a visitor actually opens/runs a
// cell, never eagerly on page load.

let _webRPromise = null;
function getWebR() {
  if (!_webRPromise) {
    _webRPromise = (async () => {
      const { WebR, ChannelType } = await import('https://webr.r-wasm.org/latest/webr.mjs');
      const webR = new WebR({ channelType: ChannelType.PostMessage });
      await webR.init();
      return webR;
    })();
  }
  return _webRPromise;
}

let _cmPromise = null;
function getCodeMirror() {
  if (!_cmPromise) {
    _cmPromise = Promise.all([
      import('https://esm.sh/@codemirror/view@6'),
      import('https://esm.sh/@codemirror/state@6'),
      import('https://esm.sh/@codemirror/commands@6'),
      import('https://esm.sh/@codemirror/language@6'),
      import('https://esm.sh/codemirror-lang-r@0.1.1'),
    ]).then(([view, state, commands, language, langR]) => ({ ...view, ...state, ...commands, ...language, ...langR }));
  }
  return _cmPromise;
}

export function supportsWebR() {
  // webR needs WebAssembly and a modern module-worker-capable browser; the
  // realistic gate in practice is WebAssembly itself.
  return typeof WebAssembly === 'object';
}

const editorTheme = () => {
  // Built lazily, after CodeMirror's own module is available, since EditorView.theme
  // is a method on the imported class, not a free function.
  return null;
};

/**
 * Mount one live R cell into `host`. Returns nothing; the cell manages its
 * own DOM. `opts.code` is the starting script. `opts.height` sets the editor's
 * visible height in px (it still scrolls for longer scripts). `opts.autorun`
 * runs the starting code once the runtime is ready, without waiting for a
 * click, useful for a cell whose whole point is showing output immediately.
 */
export function mountLiveR(host, opts = {}) {
  const startCode = opts.code || '';
  const height = opts.height || 120;

  host.innerHTML = `
    <div class="liver-shell">
      <div class="liver-ed"></div>
      <div class="liver-bar">
        <button class="liver-run" disabled>Loading R…</button>
        <button class="liver-reset" title="Restore the starting code" type="button">↺ reset</button>
        <span class="liver-status"></span>
      </div>
      <div class="liver-out" hidden></div>
    </div>`;
  const edHost = host.querySelector('.liver-ed');
  const runBtn = host.querySelector('.liver-run');
  const resetBtn = host.querySelector('.liver-reset');
  const status = host.querySelector('.liver-status');
  const out = host.querySelector('.liver-out');
  edHost.style.height = height + 'px';

  let view = null;

  getCodeMirror().then(CM => {
    const state = CM.EditorState.create({
      doc: startCode,
      extensions: [
        CM.lineNumbers(),
        CM.keymap.of([...CM.defaultKeymap, CM.indentWithTab,
          { key: 'Mod-Enter', run: () => { runBtn.click(); return true; } }]),
        CM.r(),
        CM.EditorView.theme({
          '&': { fontSize: '13px', backgroundColor: '#fff' },
          '.cm-content': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', padding: '8px 0' },
          '.cm-gutters': { backgroundColor: '#f4f1ea', color: '#8a8f98', border: 'none' },
        }),
      ],
    });
    view = new CM.EditorView({ state, parent: edHost });
    resetBtn.onclick = () => {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: startCode } });
    };
  }).catch(err => {
    edHost.innerHTML = `<div class="liver-fallback">The code editor failed to load (${escapeHtml(err.message)}). <textarea class="liver-textarea">${escapeHtml(startCode)}</textarea></div>`;
    view = { state: { doc: { toString: () => edHost.querySelector('.liver-textarea').value } } };
  });

  runBtn.textContent = 'Loading R…';
  getWebR().then(webR => {
    runBtn.disabled = false;
    runBtn.textContent = '▶ Run';
    status.textContent = '';
  }).catch(err => {
    runBtn.textContent = 'R failed to load';
    status.textContent = err.message;
    status.style.color = 'var(--rust, #b4532a)';
  });

  async function run() {
    if (!view) return;
    const code = view.state.doc.toString();
    runBtn.disabled = true;
    const prevLabel = runBtn.textContent;
    runBtn.textContent = 'Running…';
    out.hidden = false;
    out.innerHTML = '<span class="liver-running">running…</span>';
    try {
      const webR = await getWebR();
      const shelter = await new webR.Shelter();
      try {
        // captureR() evaluates code like eval(), not like the interactive
        // console: a bare `median(x)` at top level produces no output unless
        // wrapped so each statement is echoed and auto-printed the way typing
        // it into a real R console would. source(..., echo=TRUE) is base R's
        // own tool for exactly this, so it stays real R behavior rather than
        // a hand-rolled auto-print reimplementation. The code is smuggled in
        // as an R string literal (not interpolated as raw R syntax) so the
        // user's own quotes/backslashes/newlines can't break the wrapper.
        const rEscaped = code.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        const wrapped = `.webr_src <- "${rEscaped}"\nsource(textConnection(.webr_src), echo = TRUE, print.eval = TRUE)`;
        const capture = await shelter.captureR(wrapped, {
          captureGraphics: { width: 500, height: 340, bg: 'white' },
          captureConditions: true,
        });
        renderOutput(out, capture);
      } finally {
        shelter.purge();
      }
    } catch (err) {
      out.innerHTML = `<div class="liver-error">${escapeHtml(err.message || String(err))}</div>`;
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = prevLabel;
    }
  }
  runBtn.onclick = run;
  if (opts.autorun) {
    getWebR().then(run);
  }
}

function renderOutput(out, capture) {
  out.innerHTML = '';
  let any = false;
  for (const line of capture.output || []) {
    if (line.type === 'stdout' && String(line.data).trim() === '') continue; // source(echo=TRUE)'s blank separators
    any = true;
    const div = document.createElement('div');
    const isEcho = line.type === 'stdout' && /^>\s?/.test(line.data);
    div.className = 'liver-line liver-' + line.type + (isEcho ? ' liver-echo' : '');
    if (line.type === 'stderr' || line.type === 'error') {
      div.textContent = (line.data && line.data.message) ? line.data.message : String(line.data);
    } else if (line.type === 'warning') {
      div.textContent = 'Warning: ' + ((line.data && line.data.message) ? line.data.message : String(line.data));
    } else {
      div.textContent = typeof line.data === 'string' ? line.data : JSON.stringify(line.data);
    }
    out.appendChild(div);
  }
  for (const img of capture.images || []) {
    any = true;
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    canvas.className = 'liver-plot';
    canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
    out.appendChild(canvas);
  }
  if (!any) {
    const div = document.createElement('div');
    div.className = 'liver-line liver-empty';
    div.textContent = '(no output)';
    out.appendChild(div);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
