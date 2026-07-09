// hero-m1.js -- the module-1 hero scene: a joint probability mass function
// over two independent variables is the first genuinely 3D object in the
// course. A single-variable PMF is a bar chart on a line (one axis for
// outcomes, one for probability); a joint PMF needs two axes for outcomes
// (X, Y) plus a third for probability, which is exactly a bar standing up
// off a floor grid. Bar heights below are computed live as the product of
// two marginals, not hardcoded, and a Monte Carlo simulation (fixed seed)
// checks the analytic joint against simulated draws from the same two
// marginals, independently.

const host = document.getElementById('hero-m1-host');
const readout = document.getElementById('hero-m1-readout');
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

  // ---- the two marginals ----
  // X: the die-game payout from Part 1 (-2, 10, 100 dollars), same probabilities.
  // Y: an illustrative second variable, which traffic channel the visit came
  // through, independent of the payout by construction. Three outcomes each,
  // so the joint sample space is a 3x3 grid, nine cells.
  const payoutVals = [-2, 10, 100];
  const pX = [4 / 6, 1 / 6, 1 / 6];
  const channelVals = ['Search', 'Social', 'Direct'];
  const pY = [0.5, 0.3, 0.2];

  // Joint PMF under independence: P(X=x, Y=y) = P(X=x) * P(Y=y). Computed
  // here, not hardcoded, so it is exactly what the readout below sums.
  const joint = pX.map(px => pY.map(py => px * py));

  let sumJoint = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) sumJoint += joint[i][j];

  // ---- Monte Carlo check: simulate independent draws from the two
  // marginals separately and see whether the empirical joint frequency
  // lands near the analytic product above. Fixed seed, reproducible. ----
  const rand = TL.rng(1105);
  function cum(arr) { let c = 0; return arr.map(p => (c += p)); }
  const cumX = cum(pX), cumY = cum(pY);
  function drawCat(u, c) { for (let i = 0; i < c.length; i++) if (u < c[i]) return i; return c.length - 1; }

  const N = 20000;
  const counts = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let k = 0; k < N; k++) {
    const i = drawCat(rand(), cumX);
    const j = drawCat(rand(), cumY);
    counts[i][j]++;
  }
  let maxDev = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const emp = counts[i][j] / N;
    maxDev = Math.max(maxDev, Math.abs(emp - joint[i][j]));
  }

  if (readout) {
    readout.innerHTML = `<span>outcomes: <b>3 &times; 3 = 9</b></span>` +
      `<span>&Sigma; P(x,y) = <b>${sumJoint.toFixed(4)}</b></span>` +
      `<span>largest bar: P(x=-2, Search) = <b>${joint[0][0].toFixed(3)}</b></span>` +
      `<span>Monte Carlo (N=${N.toLocaleString()}): max |empirical &minus; analytic| = <b>${maxDev.toFixed(4)}</b></span>`;
  }

  const s = TL.initScene(host, { height: 420, cameraPos: [7.2, 5.5, 7.6], minDistance: 3, maxDistance: 24, autoRotate: true, autoRotateSpeed: 0.28 });

  const heightScale = 6;
  const spacing = 2.3;
  const footprint = 1.5;
  const rowColors = [TL.HEX.ink, TL.HEX.rust, TL.HEX.gold];

  const maxP = Math.max(...joint.flat());
  const maxH = maxP * heightScale;

  const content = new THREE.Group();
  content.position.y = -maxH / 2;
  s.scene.add(content);

  const grid = TL.groundGrid(12, 12);
  grid.position.y = -0.05;
  content.add(grid);

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const p = joint[i][j];
      const h = p * heightScale;
      const geo = new THREE.BoxGeometry(footprint, h, footprint);
      const mesh = new THREE.Mesh(geo, TL.material(rowColors[i]));
      const x = (i - 1) * spacing;
      const z = (j - 1) * spacing;
      mesh.position.set(x, h / 2, z);
      content.add(mesh);
      content.add(TL.label(p.toFixed(3), { position: [x, h + 0.28, z], size: '11px', color: '#3d5a73', weight: '600' }));
    }
  }

  payoutVals.forEach((v, i) => {
    content.add(TL.label('x = ' + v, { position: [(i - 1) * spacing, 0.05, spacing * 1.7], size: '12px', weight: '700', color: '#12233b' }));
  });
  channelVals.forEach((name, j) => {
    content.add(TL.label(name, { position: [-spacing * 1.7, 0.05, (j - 1) * spacing], size: '12px', weight: '700', color: '#12233b' }));
  });
  content.add(TL.label('height = P(X = x, Y = y)', { position: [0, maxH + 0.75, 0], size: '13px' }));

  s.camera.lookAt(0, 0, 0);
  TL.loop(s, () => {});
}
