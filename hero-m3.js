// hero-m3.js -- the module-3 hero scene: the full Binomial(20, 0.5) sampling
// distribution as a 3D bar forest, 21 bars standing on a floor grid, one per
// possible head count k = 0..20. A single-variable PMF is usually drawn flat,
// bars on a line. Give every bar real depth and the same object becomes
// something you can walk around: viewed side-on it is the familiar histogram
// from Part 1's 2D coin widget, viewed at an angle the bars read as physical
// blocks whose volume, not just their silhouette, thins out toward the tails.
// The slider below reuses the exact two-sided extremity rule already verified
// on that 2D widget (distance from the center k=10, both directions), so the
// two scenes always agree on the printed p-value for the same k.

const host = document.getElementById('hero-m3-host');
const readout = document.getElementById('hero-m3-readout');
if (!host) { /* not on this page */ }
else if (!window.WebGLRenderingContext) {
  host.innerHTML = '<div class="hero-fallback">Your browser does not support WebGL, so the 3D scene cannot render here. The rest of the module works without it.</div>';
} else {
  runScene().catch(err => {
    console.error(err);
    host.innerHTML = '<div class="hero-fallback">The 3D scene failed to load (' + err.message + '). The rest of the module works without it.</div>';
  });
}

async function runScene() {
  const TL = await import('./three-lib.js');
  const { THREE } = TL;

  // ---- Binomial(20, 0.5) pmf, computed live: P(X=k) = C(20,k) * 0.5^20 ----
  const N = 20;
  function choose(n, k) {
    let c = 1;
    for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1);
    return Math.round(c);
  }
  const TOTAL = Math.pow(2, N);
  const probs = [];
  for (let k = 0; k <= N; k++) probs.push(choose(N, k) / TOTAL);

  // ---- Monte Carlo check: simulate M independent 20-flip experiments from a
  // fixed-seed generator and compare the empirical head-count frequencies
  // against the analytic pmf above. Independent of the exact-formula
  // computation, so agreement is a real check, not a tautology. ----
  const rand = TL.rng(2003);
  const M = 20000;
  const counts = new Array(N + 1).fill(0);
  for (let trial = 0; trial < M; trial++) {
    let heads = 0;
    for (let flip = 0; flip < N; flip++) if (rand() < 0.5) heads++;
    counts[heads]++;
  }
  let maxDev = 0;
  for (let k = 0; k <= N; k++) maxDev = Math.max(maxDev, Math.abs(counts[k] / M - probs[k]));

  // Two-sided extremity, identical rule to the Part 1 coin widget: k is at
  // least as extreme as kobs if its distance from the center (10) is at
  // least as large as kobs's distance from the center.
  function twoSidedP(kobs) {
    let s = 0;
    for (let k = 0; k <= N; k++) if (Math.abs(k - 10) >= Math.abs(kobs - 10)) s += probs[k];
    return s;
  }
  function rejectionCount(kobs) {
    let c = 0;
    for (let k = 0; k <= N; k++) if (Math.abs(k - 10) >= Math.abs(kobs - 10)) c++;
    return c;
  }

  // ---- scene ----
  const s = TL.initScene(host, { height: 440, cameraPos: [6, 6.6, 14.5], minDistance: 4, maxDistance: 34, autoRotate: true, autoRotateSpeed: 0.22 });

  const heightScale = 9.0;
  const spacing = 0.82, barW = 0.62, barD = 0.55;
  const maxH = Math.max(...probs) * heightScale;
  const xFor = (k) => (k - 10) * spacing;

  const content = new THREE.Group();
  content.position.y = -maxH / 2;
  s.scene.add(content);

  const grid = TL.groundGrid(20, 20);
  grid.position.y = -0.05;
  content.add(grid);

  const bars = [];
  for (let k = 0; k <= N; k++) {
    const h = Math.max(probs[k] * heightScale, 0.002);
    const geo = new THREE.BoxGeometry(barW, h, barD);
    const mat = TL.material(TL.HEX.sage);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(xFor(k), h / 2, 0);
    content.add(mesh);
    bars.push(mesh);
  }

  let highlight = null;
  function setHighlight(k) {
    if (highlight) { content.remove(highlight); highlight.geometry.dispose(); highlight.material.dispose(); }
    const h = Math.max(probs[k] * heightScale, 0.002);
    const geo = new THREE.BoxGeometry(barW * 1.08, h * 1.08, barD * 1.35);
    const edges = new THREE.EdgesGeometry(geo);
    highlight = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: TL.HEX.gold }));
    highlight.position.set(xFor(k), h / 2, 0);
    content.add(highlight);
  }

  // axis ticks every 5 heads, plus the two axis labels. Placed at a small
  // positive local y so they sit just above the ground grid (grid is at
  // local y = -0.05) rather than appearing to sink below it.
  for (let k = 0; k <= N; k += 5) {
    content.add(TL.label(String(k), { position: [xFor(k), 0.05, 0.85], size: '11px', color: '#3d5a73' }));
  }
  content.add(TL.label('k, heads out of 20', { position: [0, 0.05, 1.35], size: '12px', weight: '700' }));
  content.add(TL.label('P(X = k)', { position: [xFor(0) - 0.9, maxH + 0.25, 0], size: '12px', weight: '700' }));

  function recolor(kobs) {
    for (let k = 0; k <= N; k++) {
      const extreme = Math.abs(k - 10) >= Math.abs(kobs - 10);
      bars[k].material.color.setHex(extreme ? TL.HEX.rust : TL.HEX.sage);
    }
    setHighlight(kobs);
  }

  const slider = document.getElementById('hero-m3-slider');
  const kOut = document.getElementById('hero-m3-k');

  function update(kobs) {
    recolor(kobs);
    if (kOut) kOut.textContent = kobs + ' / 20';
    if (readout) {
      const p = twoSidedP(kobs);
      const pStr = (p < 0.0001) ? p.toExponential(2) : (100 * p).toFixed(2) + '%';
      readout.innerHTML = `<span>k = <b>${kobs}</b></span>` +
        `<span>P(X = k) = <b>${probs[kobs].toFixed(4)}</b></span>` +
        `<span>two-sided p-value = <b>${pStr}</b></span>` +
        `<span>rejection region = <b>${rejectionCount(kobs)}</b> of 21 outcomes</span>` +
        `<span style="color:#8a8f98">Monte Carlo (M=${M.toLocaleString()} trials): max |empirical &minus; analytic| = ${maxDev.toFixed(4)}</span>`;
    }
  }

  let kobs = slider ? +slider.value : 15;
  update(kobs);
  if (slider) {
    slider.addEventListener('input', () => update(+slider.value));
  }

  s.camera.lookAt(0, 0, 0);
  TL.loop(s, () => {});
}
