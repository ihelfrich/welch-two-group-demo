// hero-m5.js -- the module-5 hero scene: multiple regression with a
// continuous predictor and a 0/1 group dummy is a genuinely 3D object (a
// fitted plane), unlike simple regression's single line. Verified against R:
// the normal-equations solve below matches lm(y ~ x + g) to 6 decimal places
// on an exported dataset (see the module's build notes).

const host = document.getElementById('hero-m5-host');
const readout = document.getElementById('hero-m5-readout');
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

  // ---- synthetic data: VolatilityScore = b0 + b1*exchanges + b2*channel + noise ----
  const rand = TL.rng(9105);
  const normal = (() => {
    let s = true, z2 = 0;
    return () => { if (!s) { s = true; return z2; }
      const u = Math.max(rand(), 1e-12), v = rand();
      const r = Math.sqrt(-2 * Math.log(u));
      z2 = r * Math.sin(2 * Math.PI * v); s = false; return r * Math.cos(2 * Math.PI * v); };
  })();
  const n = 60, X = [], y = [];
  for (let i = 0; i < n; i++) {
    const x = rand() * 10;
    const g = i % 2;
    X.push([1, x, g]);
    y.push(2 + 1.3 * x + 4 * g + normal() * 1.4);
  }

  // OLS via normal equations, 3x3 Gaussian elimination (no matrix library needed at this size).
  function XtX(X) { const p = X[0].length; const M = Array.from({ length: p }, () => new Array(p).fill(0));
    for (const row of X) for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) M[i][j] += row[i] * row[j];
    return M; }
  function Xty(X, y) { const p = X[0].length; const v = new Array(p).fill(0);
    for (let k = 0; k < X.length; k++) for (let i = 0; i < p; i++) v[i] += X[k][i] * y[k];
    return v; }
  function solve(A, b) { const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
    for (let i = 0; i < n; i++) {
      let piv = i; for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[piv][i])) piv = k;
      [M[i], M[piv]] = [M[piv], M[i]];
      for (let k = i + 1; k < n; k++) { const f = M[k][i] / M[i][i]; for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j]; }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
    return x; }
  const [b0, b1, b2] = solve(XtX(X), Xty(X, y));

  if (readout) {
    readout.innerHTML = `<span>n = <b>${n}</b></span><span>b₀ = <b>${b0.toFixed(2)}</b></span>` +
      `<span>b₁ (exchanges) = <b>${b1.toFixed(2)}</b></span><span>b₂ (channel) = <b>${b2.toFixed(2)}</b></span>`;
  }

  const s = TL.initScene(host, { height: 420, cameraPos: [8.5, 5.5, 10], minDistance: 4, maxDistance: 30, autoRotate: true, autoRotateSpeed: 0.35 });

  const xMax = 10, yScale = 0.45;
  const yhatAt = (x, g) => (b0 + b1 * x + b2 * g) * yScale;
  const corners = [yhatAt(0, 0), yhatAt(xMax, 0), yhatAt(0, 1), yhatAt(xMax, 1)];
  const yMid = (Math.min(...corners) + Math.max(...corners)) / 2;

  const content = new THREE.Group();
  content.position.y = -yMid;
  s.scene.add(content);

  const grid = TL.groundGrid(14, 14);
  grid.position.y = Math.min(...corners) - 0.6;
  content.add(grid);

  const toScene = (x, g, yy) => [x - xMax / 2, yy * yScale, g * 4 - 2];
  for (let i = 0; i < n; i++) {
    const [, x, g] = X[i];
    const [sx, sy, sz] = toScene(x, g, y[i]);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), TL.material(g ? TL.HEX.rust : TL.HEX.ink));
    mesh.position.set(sx, sy, sz);
    content.add(mesh);
  }

  const planeGeo = new THREE.PlaneGeometry(xMax, 4, 24, 4);
  planeGeo.rotateX(-Math.PI / 2);
  const pos = planeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i) + xMax / 2;
    const pg = (pos.getZ(i) + 2) / 4;
    pos.setY(i, yhatAt(px, pg));
  }
  planeGeo.computeVertexNormals();
  const planeMat = TL.material(TL.HEX.gold, { opacity: 0.6 });
  planeMat.side = THREE.DoubleSide;
  content.add(new THREE.Mesh(planeGeo, planeMat));

  const yLo = Math.min(...corners), yHi = Math.max(...corners);
  content.add(TL.label('exchanges (x)', { position: [xMax / 2 + 1, yLo, -2.6] }));
  content.add(TL.label('channel (0 / 1)', { position: [-xMax / 2 - 1, yLo, 2] }));
  content.add(TL.label('VolatilityScore, fitted', { position: [-xMax / 2 - 1.2, yHi + 0.4, -2.6], size: '13px' }));
  content.add(TL.label('ink = channel 0', { position: [-xMax / 2 - 1, yLo - 0.7, -1.4], color: '#12233b', size: '11px' }));
  content.add(TL.label('rust = channel 1', { position: [-xMax / 2 - 1, yLo - 1.15, -1.4], color: '#b4532a', size: '11px' }));

  s.camera.lookAt(0, 0, 0);
  TL.loop(s, () => {});
}
