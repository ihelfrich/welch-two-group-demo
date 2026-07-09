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

// ---------------------------------------------------------------- distributions
{ id:"pmfmv", topic:"Distributions", kind:"numeric", title:"Mean and variance from a PMF",
  make(seed){ const rng=mulberry32(seed);
    const allX=[-3,-2,-1,0,1,2,3,4,5]; const xs=[]; const pool=allX.slice();
    for(let i=0;i<4;i++){ const j=ri(rng,0,pool.length-1); xs.push(pool.splice(j,1)[0]); }
    xs.sort((a,b)=>a-b);
    const cuts=[]; while(cuts.length<3){ const c=ri(rng,1,19); if(!cuts.includes(c)) cuts.push(c); }
    cuts.sort((a,b)=>a-b);
    const w=[cuts[0], cuts[1]-cuts[0], cuts[2]-cuts[1], 20-cuts[2]];
    const probs=w.map(v=>v/20);
    const Ex=sm(xs.map((x,i)=>x*probs[i]));
    const Ex2=sm(xs.map((x,i)=>x*x*probs[i]));
    const Vx=Ex2-Ex*Ex;
    const rows=xs.map((x,i)=>`<tr><td>x = ${x}</td><td>P(X=x) = ${probs[i].toFixed(2)}</td></tr>`).join("");
    return {
      promptHTML:`A discrete random variable X has this distribution:<table class="mini"><tbody>${rows}</tbody></table><p>Compute $E[X]$ and $\\mathrm{Var}(X)$. Recall $\\mathrm{Var}(X)=E[X^2]-(E[X])^2$.</p>`,
      fields:[{key:"e",label:"E[X]",ans:Ex,tolAbs:0.03},{key:"v",label:"Var(X)",ans:Vx,tolAbs:0.05}],
      solutionHTML:`E[X] = ${xs.map((x,i)=>`(${x})(${probs[i].toFixed(2)})`).join(" + ")} = <b>${r2(Ex)}</b>.<br>
        E[X²] = ${xs.map((x,i)=>`(${x*x})(${probs[i].toFixed(2)})`).join(" + ")} = ${r2(Ex2)}.<br>
        Var(X) = E[X²] − (E[X])² = ${r2(Ex2)} − ${r2(Ex)}² = <b>${r2(Vx)}</b>. Every mean and variance in the rest of this guide is this same weighted sum, just over a continuum instead of four points.`
    };}
},

{ id:"zscore_calc", topic:"Distributions", kind:"numeric", title:"Standardizing a value",
  make(seed){ const rng=mulberry32(seed);
    const mu=ri(rng,20,80), sig=ri(rng,4,12); const k=[-2,-1.5,-1,-0.5,0.5,1,1.5,2][ri(rng,0,7)];
    const x=r1(mu+k*sig); const z=(x-mu)/sig;
    return {
      promptHTML:`A distribution has mean $\\mu=${mu}$ and standard deviation $\\sigma=${sig}$. Standardize $x=${x}$: compute $z=(x-\\mu)/\\sigma$.</p>`,
      fields:[{key:"z",label:"z",ans:z,tolAbs:0.03}],
      solutionHTML:`z = (${x} − ${mu}) / ${sig} = <b>${r2(z)}</b>. A z-score gives a tail probability only when the underlying distribution is (approximately) normal; on skewed data the same z corresponds to a different percentile.`
    };}
},

{ id:"emprule", topic:"Distributions", kind:"numeric", title:"The 95% interval",
  make(seed){ const rng=mulberry32(seed);
    const mu=ri(rng,50,150), sig=ri(rng,5,20); const lo=mu-1.96*sig, hi=mu+1.96*sig;
    return {
      promptHTML:`X is approximately normal with mean $\\mu=${mu}$ and standard deviation $\\sigma=${sig}$. Give the interval that contains the middle 95% of the distribution: $\\mu \\pm 1.96\\sigma$.</p>`,
      fields:[{key:"lo",label:"lower",ans:lo,tolAbs:0.5},{key:"hi",label:"upper",ans:hi,tolAbs:0.5}],
      solutionHTML:`${mu} − 1.96(${sig}) = <b>${r1(lo)}</b>, and ${mu} + 1.96(${sig}) = <b>${r1(hi)}</b>. This is where 1.96 in every confidence interval formula comes from: it is the z that cuts off the middle 95% of a normal.`
    };}
},

// ---------------------------------------------------------------- CLT / CI
{ id:"se_clt", topic:"CLT/CI", kind:"numeric", title:"Standard error of the mean",
  make(seed){ const rng=mulberry32(seed);
    const sig=ri(rng,4,20), n=[16,25,36,64,100,400][ri(rng,0,5)]; const se=sig/Math.sqrt(n);
    return {
      promptHTML:`A population has standard deviation $\\sigma=${sig}$. For a sample of size $n=${n}$, compute the standard error of the mean, $SE=\\sigma/\\sqrt{n}$.</p>`,
      fields:[{key:"se",label:"SE",ans:se,tolRel:0.02}],
      solutionHTML:`SE = ${sig}/√${n} = ${sig}/${Math.sqrt(n)} = <b>${r2(se)}</b>. This is why more data narrows an estimate slowly: SE shrinks with $\\sqrt n$, not $n$.`
    };}
},

{ id:"n_precision", topic:"CLT/CI", kind:"numeric", title:"Quadrupling n",
  make(seed){ const rng=mulberry32(seed);
    const n=[10,20,25,40,50,80][ri(rng,0,5)]; const need=4*n;
    return {
      promptHTML:`A sample of $n=${n}$ gives a standard error $SE_0$. Because $SE\\propto 1/\\sqrt n$, what sample size is needed to cut the standard error in <b>half</b>?</p>`,
      fields:[{key:"n",label:"required n",ans:need,tolAbs:0.5}],
      solutionHTML:`Halving SE means $\\sqrt n$ must double, so $n$ must quadruple: $4\\times ${n} = $ <b>${need}</b>. This is the sqrt(n) law: to cut your margin of error in half, you need four times the data, not two.`
    };}
},

{ id:"ci_manual", topic:"CLT/CI", kind:"numeric", title:"Building a 95% CI",
  make(seed){ const rng=mulberry32(seed);
    const xbar=rf(rng,10,60,1), s=ri(rng,3,15), n=[36,49,64,100,150][ri(rng,0,4)];
    const se=s/Math.sqrt(n), margin=1.96*se, lo=xbar-margin, hi=xbar+margin;
    return {
      promptHTML:`A sample of $n=${n}$ has mean $\\bar x=${xbar}$ and sd $s=${s}$. Using $z=1.96$ (valid at this $n$), give the margin of error and the 95% CI endpoints.</p>`,
      fields:[{key:"m",label:"margin",ans:margin,tolRel:0.02},{key:"lo",label:"lower",ans:lo,tolRel:0.02},{key:"hi",label:"upper",ans:hi,tolRel:0.02}],
      solutionHTML:`SE = ${s}/√${n} = ${r2(se)}. Margin = 1.96 × ${r2(se)} = <b>${r2(margin)}</b>. CI = ${xbar} ± ${r2(margin)} = [<b>${r2(lo)}</b>, <b>${r2(hi)}</b>]. A value $\\mu_0$ outside this interval is exactly the set of values a two-sided test at $\\alpha=0.05$ would reject.`
    };}
},

// ---------------------------------------------------------------- more t-test / OLS / Bayes
{ id:"ci_ttest_link", topic:"t-test", kind:"numeric", title:"Test and CI, the same information",
  make(seed){ const rng=mulberry32(seed);
    const mu0=ri(rng,90,110), n=[36,49,64,100][ri(rng,0,3)]; const s=ri(rng,8,16);
    const xbar=mu0+[-1,1][ri(rng,0,1)]*rf(rng,3,8,1);
    const se=s/Math.sqrt(n), t=(xbar-mu0)/se, lo=xbar-1.96*se, hi=xbar+1.96*se;
    return {
      promptHTML:`Test $H_0: \\mu=${mu0}$ against a sample with $n=${n}$, $\\bar x=${r1(xbar)}$, $s=${s}$. Compute the $t$ statistic (using $z\\approx t$ at this $n$), then the 95% CI for $\\mu$. Confirm ${mu0} falls ${Math.abs(t)>1.96?"outside":"inside"} it.</p>`,
      fields:[{key:"t",label:"t",ans:t,tolRel:0.03},{key:"lo",label:"CI lower",ans:lo,tolRel:0.02},{key:"hi",label:"CI upper",ans:hi,tolRel:0.02}],
      solutionHTML:`t = (${r1(xbar)} − ${mu0})/(${s}/√${n}) = <b>${r2(t)}</b>. CI = ${r1(xbar)} ± 1.96(${r2(se)}) = [<b>${r2(lo)}</b>, <b>${r2(hi)}</b>]. |t| ${Math.abs(t)>1.96?">":"<"} 1.96 exactly when $\\mu_0=${mu0}$ falls ${Math.abs(t)>1.96?"outside":"inside"} the CI. A hypothesis test and a confidence interval are the same computation read two ways.`
    };}
},

{ id:"bayes_flag", topic:"Bayes", kind:"numeric", title:"Bayes for a flagging rule",
  make(seed){ const rng=mulberry32(seed);
    const per=[0.01,0.02,0.03,0.05][ri(rng,0,3)]; const se=[0.90,0.95,0.98][ri(rng,0,2)]; const fpr=[0.05,0.10,0.15][ri(rng,0,2)];
    const post=se*per/(se*per+fpr*(1-per));
    const N=Math.round(1/per)*10; const bad=Math.round(per*N); const tpos=Math.round(se*bad); const fpos=Math.round(fpr*(N-bad));
    return {
      promptHTML:`In one channel, <b>${(per*100).toFixed(0)}%</b> of rows are genuinely anomalous. A flagging rule catches <b>${(se*100).toFixed(0)}%</b> of true anomalies and also flags <b>${(fpr*100).toFixed(0)}%</b> of normal rows by mistake.<p>Given a row is flagged, what is the probability it is actually anomalous? Answer in percent.</p>`,
      fields:[{key:"p",label:"P(anomalous | flagged)",ans:post*100,tolAbs:2,suffix:"%"}],
      solutionHTML:`Out of ${N.toLocaleString()} rows: ${bad} anomalous, ~${tpos} of them flagged; ${(N-bad).toLocaleString()} normal, ~${fpos} flagged anyway. P = ${tpos}/(${tpos}+${fpos}) = <b>${(post*100).toFixed(1)}%</b>. This is exactly the composition question from the threshold page: most flags can be false alarms even with a good rule, if the base rate is low.`
    };}
},

{ id:"rsquared", topic:"OLS", kind:"numeric", title:"R² from the variance decomposition",
  make(seed){ const rng=mulberry32(seed);
    const SStot=ri(rng,80,400); const frac=rf(rng,0.15,0.7,2); const SSres=r2(SStot*frac); const R2=1-SSres/SStot;
    return {
      promptHTML:`A regression has $SS_{tot}=${SStot}$ and $SS_{res}=${SSres}$. Compute $R^2=1-SS_{res}/SS_{tot}$.</p>`,
      fields:[{key:"r2",label:"R²",ans:R2,tolAbs:0.01}],
      solutionHTML:`R² = 1 − ${SSres}/${SStot} = <b>${r2(R2)}</b>. This is the fraction of the variance in y that the line explains, and only that. It says nothing about whether the line is the right functional form or whether the effect is causal.`
    };}
},

{ id:"olsresid", topic:"OLS", kind:"numeric", title:"What the FOCs guarantee",
  make(seed){ const rng=mulberry32(seed);
    const n=5, b1=ri(rng,1,4), b0=ri(rng,0,3);
    const xs=[1,2,3,4,5]; const ys=xs.map(x=>b0+b1*x+rf(rng,-1,1,1));
    const mx=mn(xs), my=mn(ys); const Sxy=sm(xs.map((x,i)=>(x-mx)*(ys[i]-my))); const Sxx=sm(xs.map(x=>(x-mx)*(x-mx)));
    const hb1=Sxy/Sxx, hb0=my-hb1*mx;
    const resid=xs.map((x,i)=>ys[i]-(hb0+hb1*x));
    const sume=sm(resid), sumxe=sm(xs.map((x,i)=>x*resid[i]));
    return {
      promptHTML:`Fit OLS to x = 1,2,3,4,5 and y = ${ys.map(v=>r2(v)).join(", ")}. (b₁ = ${r2(hb1)}, b₀ = ${r2(hb0)}, already computed for you.) Compute the residuals $e_i=y_i-\\hat y_i$ and report $\\sum e_i$ and $\\sum x_i e_i$.</p>`,
      fields:[{key:"se",label:"Σeᵢ",ans:sume,tolAbs:0.02},{key:"sxe",label:"Σxᵢeᵢ",ans:sumxe,tolAbs:0.05}],
      solutionHTML:`Both sums are <b>0</b> (up to rounding), always, for any OLS fit. They are not assumptions, they are the first-order conditions the fit was chosen to satisfy: the least-squares line is defined as the one where these two sums vanish.`
    };}
},

// ---------------------------------------------------------------- more theory (MC)
{ id:"clt_mc", topic:"Theory", kind:"mc", title:"What the CLT actually says",
  make(seed){ void seed;
    return {
      promptHTML:`The population Volume is heavily right-skewed. According to the Central Limit Theorem, the sampling distribution of the SAMPLE MEAN of Volume, for large n, is approximately...`,
      choices:[
        "Normal, regardless of the skew in the original population.",
        "Right-skewed, the same shape as the population.",
        "Normal only if the population itself is already normal.",
        "Undefined, because skewed data breaks the CLT."],
      correct:0,
      solutionHTML:`The CLT is about the sampling distribution of the MEAN, not the data itself. Even though individual Volume values are skewed, the average of many of them is approximately normal for large n. This is why t-tests on means work fine even on skewed data at scale, but it says nothing about individual values or quantiles.`
    };}
},

{ id:"r2_mc", topic:"Theory", kind:"mc", title:"What R² does not tell you",
  make(seed){ void seed;
    return {
      promptHTML:`A regression has R² = 0.94. What can you conclude?`,
      choices:[
        "The model explains 94% of the variance in y; nothing about whether the model is correctly specified or causal.",
        "94% of individual predictions will be within a small margin of the true value.",
        "The relationship between x and y is causal.",
        "The residuals are normally distributed."],
      correct:0,
      solutionHTML:`R² is a variance-explained number, full stop. Anscombe's quartet is the classic demonstration: four datasets with nearly identical R² and regression lines, one of which is linear, one curved, one dominated by an outlier, one nearly vertical. Always pair R² with a residual plot.`
    };}
},

{ id:"exogeneity_mc", topic:"Theory", kind:"mc", title:"Bias vs. noise in OLS",
  make(seed){ void seed;
    return {
      promptHTML:`Of the four Gauss-Markov conditions, which one, if violated, makes OLS coefficients BIASED (wrong on average), rather than merely noisy or mis-measured in their uncertainty?`,
      choices:[
        "Strict exogeneity: E[error | x] = 0.",
        "Homoskedasticity: constant error variance.",
        "No autocorrelation across observations.",
        "Linearity of the functional form, if the true curve is only mildly nonlinear."],
      correct:0,
      solutionHTML:`Violating homoskedasticity or independence leaves OLS unbiased but makes the standard errors wrong (that's the Welch/robust-SE fix). Violating exogeneity is different in kind: if the error is correlated with x, for instance because a variable like UserType is itself partly determined by Volume, the coefficient estimates the wrong quantity, and no amount of data or a better standard error fixes it. That is the question to settle before trusting any b₁.`
    };}
},

];

function makeProblemInstance(p, seed){ const inst=p.make(seed); inst._p=p; inst.seed=seed; return inst; }
