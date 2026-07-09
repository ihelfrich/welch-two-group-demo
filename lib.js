// lib.js -- shared helpers for the applied-methods demos.
// Deterministic PRNG, synthetic channel generator, and small stats utilities.
// All data is synthetic and generated in the browser.

const PAL = { ink:"#12233b", rust:"#b4532a", sage:"#6b8e5a", gold:"#d69f43",
              violet:"#6b5b8e", dim:"#8a8f98" };

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function makeNormal(rng){let s=true,z2=0;return function(){if(!s){s=true;return z2;}
  let u=Math.max(rng(),1e-12),v=rng();let r=Math.sqrt(-2*Math.log(u));
  z2=r*Math.sin(2*Math.PI*v);s=false;return r*Math.cos(2*Math.PI*v);};}
function normcdf(x){const t=1/(1+0.2316419*Math.abs(x));const d=0.3989423*Math.exp(-x*x/2);
  let p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return x>0?1-p:p;}

// Four synthetic channels that mirror the real relative structure (clearly not
// the client's data): Type small, DoubleClick ~5-7x, 2FA bimodal (off or maxed),
// Unknown a mixed bucket. Cap at 100 to make the 2FA ceiling visible.
const CAP = 100;
function channels(n, seed){
  seed = seed || 20240701;
  const rng = mulberry32(seed); const N = makeNormal(rng);
  const ln = (mu,sig)=>Math.exp(mu+sig*N());
  const mk = (count, draw)=>{const a=new Array(count);for(let i=0;i<count;i++)a[i]=Math.min(CAP,draw());return a;};
  return [
    { name:"Type", color:PAL.ink,
      data: mk(n, ()=> rng()<0.12 ? 0 : ln(Math.log(1.3)-0.36, 0.85)) },
    { name:"DoubleClick", color:PAL.rust,
      data: mk(n, ()=> rng()<0.06 ? 0 : ln(Math.log(6.9)-0.55, 1.05)) },
    { name:"2FA", color:PAL.violet,
      data: mk(Math.round(n*0.25), ()=>{ const u=rng();
        return u<0.30 ? 0 : (u<0.55 ? ln(Math.log(30),0.8) : CAP - rng()*2); }) },
    { name:"Unknown", color:PAL.sage,
      data: mk(Math.round(n*0.25), ()=> rng()<0.85 ? ln(Math.log(2.2),0.6) : ln(Math.log(60),0.7)) },
  ];
}

function mean(x){let m=0;for(const v of x)m+=v;return m/x.length;}
function variance(x){const m=mean(x);let s=0;for(const v of x)s+=(v-m)*(v-m);return s/(x.length-1);}
function sortedCopy(x){return x.slice().sort((a,b)=>a-b);}
function quantileSorted(s,p){ // type-7 interpolation, fine for display
  if(s.length===0)return NaN; const h=(s.length-1)*p; const lo=Math.floor(h);
  const hi=Math.min(lo+1,s.length-1); return s[lo]+(h-lo)*(s[hi]-s[lo]);}
function survivalAt(x,t){let k=0;for(const v of x) if(v>t) k++; return k/x.length;}    // P(X>t)
function leAt(x,t){let k=0;for(const v of x) if(v<=t) k++; return k/x.length;}          // P(X<=t)
function wilson(k,n,conf){conf=conf||0.95; if(n===0)return[0,0,0];
  const z=conf===0.95?1.959964:2.575829; const ph=k/n, den=1+z*z/n;
  const c=(ph+z*z/(2*n))/den, h=(z/den)*Math.sqrt(ph*(1-ph)/n+z*z/(4*n*n));
  return [Math.max(0,c-h), ph, Math.min(1,c+h)];}
const pct = p => (100*p).toFixed(1)+"%";
