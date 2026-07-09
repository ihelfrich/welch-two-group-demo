// problems.js -- practice problem bank. Each problem.make(seed) returns a fresh
// instance with its own generated data, answers, and worked solution. Answers
// are computed from the data in-browser, so they are correct by construction.
// Depends on lib.js (mulberry32).

function ri(rng,a,b){return a+Math.floor(rng()*(b-a+1));}
function rf(rng,a,b,dp){const m=Math.pow(10,dp==null?1:dp);return Math.round((a+rng()*(b-a))*m)/m;}
function sm(x){return x.reduce((a,b)=>a+b,0);}
function mn(x){return sm(x)/x.length;}
function vr(x){const m=mn(x);return sm(x.map(v=>(v-m)*(v-m)))/(x.length-1);}
function r2(x){return Math.round(x*100)/100;}
function r1(x){return Math.round(x*10)/10;}
function dataChips(x){return `<div class="data">[${x.join(",  ")}]</div>`;}
function sumTable(rows){ // rows: [[label, val], ...]
  return `<table class="mini"><tbody>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td></tr>`).join("")}</tbody></table>`;}

const PROBLEMS = [

// ---------------------------------------------------------------- descriptive
{ id:"pctile", topic:"Extremeness", kind:"numeric", title:"Percentile of a value",
  make(seed){ const rng=mulberry32(seed);
    const n=ri(rng,10,14); const x=Array.from({length:n},()=>rf(rng,0.2,18,1)).sort((a,b)=>a-b);
    const v=x[ri(rng,2,n-2)]; const k=x.filter(z=>z<=v).length; const p=100*k/n;
    return {
      promptHTML:`A channel's volumes (n = ${n}):${dataChips(x)}<p>Using the simple definition (share of values at or below it), what <b>percentile</b> is the value <b>${v}</b>? Answer in percent.</p>`,
      fields:[{key:"p",label:"percentile",ans:p,tolAbs:0.6,suffix:"%"}],
      solutionHTML:`Count values ≤ ${v}: that is ${k} of ${n}. Percentile = ${k}/${n} = <b>${r1(p)}%</b>. Extremeness is just this tail position on the data's own distribution, no model needed.`
    };}
},

{ id:"meddiff", topic:"Extremeness", kind:"numeric", title:"Median and its meaning",
  make(seed){ const rng=mulberry32(seed);
    const n=2*ri(rng,4,6)+1; const x=Array.from({length:n},()=>rf(rng,0.5,25,1)).sort((a,b)=>a-b);
    const med=x[(n-1)/2];
    return {
      promptHTML:`Sorted volumes (n = ${n}):${dataChips(x)}<p>What is the <b>median</b>?</p>`,
      fields:[{key:"m",label:"median",ans:med,tolAbs:0.05}],
      solutionHTML:`With n = ${n} (odd), the median is the middle value, position ${(n+1)/2}: <b>${med}</b>. The median is the 50th percentile and, unlike the mean, is not dragged by the long right tail.`
    };}
},

// ---------------------------------------------------------------- two means
{ id:"diffmeans", topic:"t-test", kind:"numeric", title:"Difference in means",
  make(seed){ const rng=mulberry32(seed);
    const A=Array.from({length:6},()=>rf(rng,0.5,4,1)); const B=Array.from({length:6},()=>rf(rng,3,9,1));
    const mA=mn(A), mB=mn(B), d=mB-mA;
    return {
      promptHTML:`Group A: ${dataChips(A)}Group B: ${dataChips(B)}<p>Compute the mean of each group and the difference <b>B − A</b>.</p>`,
      fields:[{key:"a",label:"mean A",ans:mA,tolAbs:0.05},{key:"b",label:"mean B",ans:mB,tolAbs:0.05},{key:"d",label:"B − A",ans:d,tolAbs:0.05}],
      solutionHTML:`mean A = ${r2(mA)}, mean B = ${r2(mB)}, difference = <b>${r2(d)}</b>. In a regression Vol ~ group with group 0/1, this difference is exactly the coefficient b₁.`
    };}
},

{ id:"ttest", topic:"t-test", kind:"numeric", title:"Student two-sample t (pooled)",
  make(seed){ const rng=mulberry32(seed);
    const nA=ri(rng,20,60), nB=ri(rng,20,60);
    const mA=rf(rng,4,8,1), mB=rf(rng,9,15,1), sA=rf(rng,2,4,1), sB=rf(rng,2,4,1);
    const sp2=((nA-1)*sA*sA+(nB-1)*sB*sB)/(nA+nB-2);
    const se=Math.sqrt(sp2*(1/nA+1/nB)); const t=(mB-mA)/se;
    return {
      promptHTML:`${sumTable([["nₐ, n_b",`${nA}, ${nB}`],["mean A, B",`${mA}, ${mB}`],["sd A, B",`${sA}, ${sB}`]])}
        <p>Equal-variance (pooled) test. Pooled variance $s_p^2=\\frac{(n_A-1)s_A^2+(n_B-1)s_B^2}{n_A+n_B-2}$, then $SE=s_p\\sqrt{1/n_A+1/n_B}$. Give the <b>SE</b> and the <b>t</b> statistic.</p>`,
      fields:[{key:"se",label:"SE",ans:se,tolRel:0.03},{key:"t",label:"t",ans:t,tolRel:0.03}],
      solutionHTML:`s_p² = ${r2(sp2)}, so SE = ${r2(se)} and t = (${mB} − ${mA})/${r2(se)} = <b>${r2(t)}</b>. At these n the p-value is tiny; report the estimate and its interval, not the star.`
    };}
},

{ id:"welch", topic:"Welch", kind:"numeric", title:"Welch t (unequal variance)",
  make(seed){ const rng=mulberry32(seed);
    const nA=ri(rng,30,80), nB=ri(rng,30,80);
    const mA=rf(rng,1,3,1), mB=rf(rng,6,10,1), sA=rf(rng,1,2,1), sB=rf(rng,5,8,1); // very unequal sd
    const se=Math.sqrt(sA*sA/nA+sB*sB/nB); const t=(mB-mA)/se;
    return {
      promptHTML:`${sumTable([["nₐ, n_b",`${nA}, ${nB}`],["mean A, B",`${mA}, ${mB}`],["sd A, B",`${sA}, ${sB}  (note: very unequal)`]])}
        <p>The spreads differ, so use Welch: $SE=\\sqrt{s_A^2/n_A+s_B^2/n_B}$. Give the <b>Welch SE</b> and <b>t</b>.</p>`,
      fields:[{key:"se",label:"Welch SE",ans:se,tolRel:0.03},{key:"t",label:"t",ans:t,tolRel:0.03}],
      solutionHTML:`SE = √(${sA}²/${nA} + ${sB}²/${nB}) = ${r2(se)}, t = <b>${r2(t)}</b>. For a 0/1 regressor this equals the HC2 robust SE. The pooled SE would be wrong here because the variances differ.`
    };}
},

// ---------------------------------------------------------------- OLS
{ id:"olsslope", topic:"OLS", kind:"numeric", title:"OLS slope and intercept",
  make(seed){ const rng=mulberry32(seed);
    const n=5, b1t=ri(rng,1,4), b0t=ri(rng,0,3);
    const xs=Array.from({length:n},(_,i)=>i+1);
    const ys=xs.map(x=>b0t+b1t*x+rf(rng,-1,1,1));
    const mx=mn(xs),my=mn(ys); const Sxy=sm(xs.map((x,i)=>(x-mx)*(ys[i]-my))); const Sxx=sm(xs.map(x=>(x-mx)*(x-mx)));
    const b1=Sxy/Sxx, b0=my-b1*mx;
    return {
      promptHTML:`${sumTable([["x","1, 2, 3, 4, 5"],["y",ys.join(", ")]])}
        <p>Fit $y=b_0+b_1x$ by least squares: $b_1=\\dfrac{\\sum(x-\\bar x)(y-\\bar y)}{\\sum(x-\\bar x)^2}$, $b_0=\\bar y-b_1\\bar x$. Give <b>b₁</b> (slope) and <b>b₀</b> (intercept).</p>`,
      fields:[{key:"b1",label:"b₁ (slope)",ans:b1,tolRel:0.04,tolAbs:0.03},{key:"b0",label:"b₀ (intercept)",ans:b0,tolRel:0.06,tolAbs:0.05}],
      solutionHTML:`Sₓy = ${r2(Sxy)}, Sₓₓ = ${Sxx}, so b₁ = <b>${r2(b1)}</b> and b₀ = ${r2(my)} − ${r2(b1)}·${mx} = <b>${r2(b0)}</b>.`
    };}
},

// ---------------------------------------------------------------- Bayes
{ id:"bayes", topic:"Bayes", kind:"numeric", title:"Posterior from a test",
  make(seed){ const rng=mulberry32(seed);
    const per=[0.001,0.002,0.005,0.01][ri(rng,0,3)];
    const se=[0.95,0.98,0.99][ri(rng,0,2)]; const fpr=[0.01,0.02,0.05][ri(rng,0,2)];
    const post=se*per/(se*per+fpr*(1-per));
    const N=Math.round(1/per)*10; const sick=Math.round(per*N); const tpos=Math.round(se*sick);
    const fpos=Math.round(fpr*(N-sick));
    return {
      promptHTML:`A condition affects <b>${(per*100).toFixed(per<0.01?1:0)}%</b> of people. A test catches <b>${(se*100).toFixed(0)}%</b> of true cases (sensitivity) and has a <b>${(fpr*100).toFixed(0)}%</b> false-positive rate. Someone tests positive.<p>What is the probability they actually have it? Answer in percent.</p>`,
      fields:[{key:"p",label:"P(has it | positive)",ans:post*100,tolAbs:1.5,suffix:"%"}],
      solutionHTML:`Count out of ${N.toLocaleString()}: ${sick} sick, of whom ~${tpos} test positive; ${(N-sick).toLocaleString()} healthy, of whom ~${fpos} test positive falsely. So P = ${tpos}/(${tpos}+${fpos}) = <b>${(post*100).toFixed(1)}%</b>. The base rate dominates: a good test on a rare thing still yields mostly false alarms.`
    };}
},

{ id:"bayesodds", topic:"Bayes", kind:"numeric", title:"Bayes in odds form",
  make(seed){ const rng=mulberry32(seed);
    const priorTo=[19,49,99,999][ri(rng,0,3)]; // prior odds 1 : priorTo
    const lr=[5,10,20,50][ri(rng,0,3)];
    const postOddsFor=lr, postOddsAg=priorTo; const post=postOddsFor/(postOddsFor+postOddsAg);
    return {
      promptHTML:`Prior odds of the event are <b>1 : ${priorTo}</b>. New evidence is <b>${lr}×</b> more likely when the event is true than when it is not (likelihood ratio = ${lr}).<p>Posterior odds = prior odds × likelihood ratio. Give the resulting <b>probability</b> in percent.</p>`,
      fields:[{key:"p",label:"posterior probability",ans:post*100,tolAbs:1.2,suffix:"%"}],
      solutionHTML:`Posterior odds = ${lr} : ${priorTo}. Probability = ${lr}/(${lr}+${priorTo}) = <b>${(post*100).toFixed(1)}%</b>. Odds × likelihood ratio is the fastest way to update.`
    };}
},

// ---------------------------------------------------------------- threshold
{ id:"exceed", topic:"Exceedance", kind:"numeric", title:"Flag rate at a threshold",
  make(seed){ const rng=mulberry32(seed);
    const n=15; const x=Array.from({length:n},()=>rf(rng,0,20,1));
    const t=ri(rng,3,8); const k=x.filter(v=>v>t).length; const rate=100*k/n;
    const N=[5000,8000,10000][ri(rng,0,2)]; const flagged=Math.round(k/n*N);
    return {
      promptHTML:`A sample of n = ${n}:${dataChips(x)}<p>Flag every value strictly above <b>${t}</b>. (a) What <b>fraction</b> of the sample is flagged (percent)? (b) If this channel has <b>${N.toLocaleString()}</b> rows total, roughly how many are flagged?</p>`,
      fields:[{key:"r",label:"flag rate",ans:rate,tolAbs:0.1,suffix:"%"},{key:"c",label:"rows flagged",ans:flagged,tolRel:0.02,tolAbs:1}],
      solutionHTML:`${k} of ${n} exceed ${t}, so the flag rate is ${r1(rate)}%. Applied to ${N.toLocaleString()} rows: ${r1(rate)}% × ${N.toLocaleString()} ≈ <b>${flagged.toLocaleString()}</b>. This is the survival S(t) = P(X > t), the object a flagging policy actually needs.`
    };}
},

// ---------------------------------------------------------------- theory (MC)
{ id:"mw", topic:"Theory", kind:"mc", title:"Why Mann-Whitney rejects",
  make(seed){ const rng=mulberry32(seed); void rng;
    return {
      promptHTML:`You run Mann-Whitney on two channels with 70,000 rows each and get p < 10⁻¹⁶. What does that tell you about where to set a flagging threshold?`,
      choices:[
        "Nothing useful: at this n the test rejects for any non-identical distributions, and its null is 'identical', not 'equal medians'.",
        "The medians differ by a large, decision-relevant amount.",
        "Channel B should be flagged more aggressively than channel A.",
        "The variances are equal, so a pooled t-test is valid."],
      correct:0,
      solutionHTML:`Correct: the rejection is preordained. t grows like effect × √n, so any real difference underflows the p-value, and the null is full distributional equality. It says the two are not identical, which you already knew. It says nothing about a threshold.`
    };}
},

{ id:"welcheq", topic:"Theory", kind:"mc", title:"When pooled equals Welch",
  make(seed){ void seed;
    return {
      promptHTML:`Under what condition do the pooled (equal-variance) SE and the Welch SE for a two-group difference coincide exactly?`,
      choices:[
        "When the two groups have equal sample sizes.",
        "When the two groups have equal variances.",
        "Never; they always differ.",
        "When the sample size is very large."],
      correct:0,
      solutionHTML:`With equal group sizes the two formulas are algebraically identical, so they coincide regardless of the variances. They diverge only when the group sizes differ. The robust (HC2) SE equals Welch either way, so it is the safe default.`
    };}
},

{ id:"zscore", topic:"Theory", kind:"mc", title:"When a z-score gives the percentile",
  make(seed){ void seed;
    return {
      promptHTML:`A value has z = 2, i.e. it is two SDs above the mean. It corresponds to the 97.7th percentile only when…`,
      choices:[
        "…the data is (approximately) normal.",
        "…the sample size is large.",
        "…always; z = 2 is always the 97.7th percentile.",
        "…the variance is finite."],
      correct:0,
      solutionHTML:`z = 2 maps to the 97.7th percentile only under normality. On a right-skewed variable a z of 2 can sit anywhere, which is why extremeness across channels uses the empirical percentile, not the z-score.`
    };}
},

{ id:"b1mean", topic:"Theory", kind:"mc", title:"What b₁ means",
  make(seed){ void seed;
    return {
      promptHTML:`In the regression Volume = b₀ + b₁·UserType + e, with UserType coded 0 for Type and 1 for DoubleClick, what is b₁?`,
      choices:[
        "The difference in mean Volume between DoubleClick and Type.",
        "The correlation between Volume and UserType.",
        "The median Volume of DoubleClick.",
        "The probability that DoubleClick exceeds Type."],
      correct:0,
      solutionHTML:`b₁ is exactly the difference in group means, mean(DoubleClick) − mean(Type). b₀ is the mean of the reference group, Type. That is why a regression on a 0/1 variable is a two-group comparison.`
    };}
},

];

function makeProblemInstance(p, seed){ const inst=p.make(seed); inst._p=p; inst.seed=seed; return inst; }
