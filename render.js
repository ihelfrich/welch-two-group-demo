// render.js -- shared practice-problem rendering and grading engine.
// Used by practice.html (the full bank) and by embedded "quick check" blocks
// on individual module pages. Depends on problems.js (PROBLEMS, makeProblemInstance).

function typeset(node){ if(window.MathJax&&MathJax.typesetPromise) MathJax.typesetPromise(node?[node]:undefined).catch(()=>{}); }

function near(v,f){ const tol=Math.max(f.tolAbs||0,(f.tolRel||0)*Math.abs(f.ans)); return Math.abs(v-f.ans)<=tol+1e-9; }

function cardHTML(p, inst){
  const t=p.topic;
  let ans="";
  if(p.kind==="numeric"){
    ans=`<div class="fields">${inst.fields.map(f=>`<div class="field"><label>${f.label} =</label><input type="number" step="any" data-k="${f.key}">${f.suffix?`<span class="suf">${f.suffix}</span>`:""}<span class="mark"></span></div>`).join("")}</div>`;
  } else {
    ans=`<div class="choices">${inst.choices.map((c,i)=>`<button class="choice" data-i="${i}">${c}</button>`).join("")}</div>`;
  }
  return `<div class="prob" data-id="${p.id}" data-topic="${t}">
    <div class="phead"><span class="pill ${t}">${t}</span><b>${p.title}</b><button class="reroll">↻ new numbers</button></div>
    <div class="pbody">${inst.promptHTML}</div>
    ${ans}
    <div class="pbtns"><button class="check">Check</button><button class="reveal">Solution</button></div>
    <div class="feedback"></div>
    <div class="solution" hidden>${inst.solutionHTML}</div>
  </div>`;
}

function mount(card, p, inst){
  card.querySelector(".reveal").onclick=()=>{const s=card.querySelector(".solution");s.hidden=!s.hidden;typeset(s);};
  card.querySelector(".reroll").onclick=()=>{ inst=makeProblemInstance(p, (inst.seed||0)+104729);
    const fresh=document.createElement("div"); fresh.innerHTML=cardHTML(p,inst);
    const nc=fresh.firstElementChild; card.replaceWith(nc); mount(nc,p,inst); typeset(nc); };
  const fb=card.querySelector(".feedback");
  if(p.kind==="numeric"){
    card.querySelector(".check").onclick=()=>{
      let all=true,any=false;
      inst.fields.forEach(f=>{
        const inp=card.querySelector(`input[data-k="${f.key}"]`); const mk=inp.parentElement.querySelector(".mark");
        if(inp.value===""){mk.textContent="";all=false;return;} any=true;
        const ok=near(parseFloat(inp.value),f); mk.textContent=ok?"✓":"✗"; mk.className="mark "+(ok?"ok":"bad"); if(!ok)all=false;
      });
      if(!any){fb.textContent="Enter an answer first.";fb.className="feedback";return;}
      fb.textContent= all?"Correct.":"Not quite. Check the marked fields, or open the solution.";
      fb.className="feedback "+(all?"ok":"bad");
      if(all){const s=card.querySelector(".solution");s.hidden=false;typeset(s);}
    };
  } else {
    let picked=-1;
    card.querySelectorAll(".choice").forEach(btn=>btn.onclick=()=>{
      picked=+btn.dataset.i;
      card.querySelectorAll(".choice").forEach(b=>b.classList.remove("pick","ok","bad"));
      btn.classList.add("pick");
    });
    card.querySelector(".check").onclick=()=>{
      if(picked<0){fb.textContent="Pick an option first.";fb.className="feedback";return;}
      const ok=picked===inst.correct;
      card.querySelectorAll(".choice").forEach((b,i)=>{ if(i===inst.correct)b.classList.add("ok"); if(i===picked&&!ok)b.classList.add("bad"); });
      fb.textContent= ok?"Correct.":"Not quite.";fb.className="feedback "+(ok?"ok":"bad");
      const s=card.querySelector(".solution");s.hidden=false;typeset(s);
    };
  }
}

// Render a full, filterable bank into containerEl (used by practice.html).
function renderBank(containerEl, barEl, opts){
  opts=opts||{}; let BASE=opts.seed||12345, filter="All";
  const pool = opts.topics ? PROBLEMS.filter(p=>opts.topics.includes(p.topic)) : PROBLEMS;
  const topics=["All",...Array.from(new Set(pool.map(p=>p.topic)))];
  function render(){
    containerEl.innerHTML="";
    const shown=pool.filter(p=>filter==="All"||p.topic===filter);
    shown.forEach((p,idx)=>{
      const inst=makeProblemInstance(p, BASE+idx*97);
      const holder=document.createElement("div"); holder.innerHTML=cardHTML(p,inst);
      const card=holder.firstElementChild; containerEl.appendChild(card); mount(card,p,inst);
    });
    typeset(containerEl);
  }
  function renderBar(){
    if(!barEl) { render(); return; }
    barEl.innerHTML = topics.map(t=>`<button class="chip ${t===filter?"on":""}" data-t="${t}">${t}</button>`).join("")
      + `<button class="chip" id="newset">↻ shuffle all</button>`;
    barEl.querySelectorAll(".chip[data-t]").forEach(c=>c.onclick=()=>{filter=c.dataset.t;renderBar();render();});
    barEl.querySelector("#newset").onclick=()=>{BASE=(BASE*1103515245+12345)>>>0;render();};
    render();
  }
  renderBar();
}

// Embed a fixed, small set of problems (by id) into containerEl -- for the
// "quick check" block at the end of a module page. No filter bar, no shuffle
// button per-problem still works (reroll), ids in the order given.
function renderQuickCheck(containerEl, ids, seed){
  containerEl.innerHTML="";
  ids.forEach((id,idx)=>{
    const p=PROBLEMS.find(x=>x.id===id);
    if(!p){ console.warn("renderQuickCheck: unknown problem id", id); return; }
    const inst=makeProblemInstance(p, (seed||5551)+idx*233);
    const holder=document.createElement("div"); holder.innerHTML=cardHTML(p,inst);
    const card=holder.firstElementChild; containerEl.appendChild(card); mount(card,p,inst);
  });
  typeset(containerEl);
}
