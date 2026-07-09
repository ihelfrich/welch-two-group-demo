// hero-m4.js -- the module-4 hero scene: the 10,000-person natural-frequency
// table from Part 1, rebuilt as an actual population instead of a table. A
// single-variable "is this test accurate" question doesn't need three
// dimensions, but a population does: every one of the 10,000 grid cells
// below is its own coin flip for the condition (prevalence 0.01) and, for
// people who tested positive or negative, a second flip conditional on that
// (sensitivity 0.95, false-positive rate 0.04), the same two-coin logic as
// the R simulation in Part 3, run once more here independently in the
// browser. The x/z grid position carries no meaning, it is just where a
// person happens to stand; the y-height does carry meaning, the roughly 100
// people who actually have the condition float on a raised layer above the
// 9,900 who don't, a literal, physical answer to "how rare is rare." Color
// then crosses that condition status with the test result. Orbit around it
// and the rare disease is not an abstraction, it is a thin scatter of boxes
// hanging over an ocean of ground-level ones. The isolate toggle hides
// everyone but the tested-positive group, which is the 95-vs-396 comparison
// Part 1 makes in a table, seen instead as a handful of sage boxes lost in a
// field of rust ones.

const host = document.getElementById('hero-m4-host');
const readout = document.getElementById('hero-m4-readout');
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

  // ---- the same three numbers as the rest of the page: prevalence 1%,
  // sensitivity 95%, false-positive rate 4% ----
  const prevalence = 0.01, sensitivity = 0.95, fpr = 0.04;
  const N = 10000, GRID = 100;

  // ---- one Bernoulli(prevalence) draw per person for condition status,
  // then one Bernoulli draw for the test result at whichever rate that
  // person's condition status implies, exactly the two-coin logic the R
  // simulation on this page uses. This is an independent fresh draw: it
  // will not reproduce 19.3% exactly, and it shouldn't. ----
  const rand = TL.rng(41041);
  const CAT_TN = 0, CAT_FP = 1, CAT_FN = 2, CAT_TP = 3;
  const categories = new Uint8Array(N);
  const positions = new Float32Array(N * 3);
  let TP = 0, FN = 0, TN = 0, FP = 0;

  const boxSize = 0.1, spacing = 0.13, groundY = boxSize / 2, sickY = 1.5;
  const half = (GRID - 1) / 2;

  for (let i = 0; i < N; i++) {
    const row = Math.floor(i / GRID), col = i % GRID;
    const x = (col - half) * spacing;
    const z = (row - half) * spacing;
    const sick = rand() < prevalence;
    const testPos = sick ? (rand() < sensitivity) : (rand() < fpr);
    let cat;
    if (sick && testPos) { cat = CAT_TP; TP++; }
    else if (sick && !testPos) { cat = CAT_FN; FN++; }
    else if (!sick && testPos) { cat = CAT_FP; FP++; }
    else { cat = CAT_TN; TN++; }
    categories[i] = cat;
    positions[i * 3] = x;
    positions[i * 3 + 1] = sick ? sickY : groundY;
    positions[i * 3 + 2] = z;
  }

  const flagged = TP + FP;
  const ppv = flagged > 0 ? TP / flagged : NaN;
  const ppvStr = flagged > 0 ? (100 * ppv).toFixed(1) + '%' : 'n/a';

  if (readout) {
    readout.innerHTML =
      `<span>n = <b>${N.toLocaleString()}</b></span>` +
      `<span>has condition = <b>${TP + FN}</b></span>` +
      `<span>true positive = <b>${TP}</b></span>` +
      `<span>false negative = <b>${FN}</b></span>` +
      `<span>true negative = <b>${TN}</b></span>` +
      `<span>false positive = <b>${FP}</b></span>` +
      `<span>tested positive = <b>${flagged}</b></span>` +
      `<span>P(condition&nbsp;|&nbsp;positive) = <b>${ppvStr}</b></span>` +
      `<span style="color:#8a8f98">Part 1's exact-division value: 19.3%</span>`;
  }

  // ---- colors: sage/muted-sage/ink/rust, crossing condition x test result ----
  const mutedSage = TL.PAL3.sage.clone().lerp(new THREE.Color(0xffffff), 0.55);
  const catColor = [TL.PAL3.ink, TL.PAL3.rust, mutedSage, TL.PAL3.sage]; // indexed by CAT_*

  const s = TL.initScene(host, {
    height: 460, cameraPos: [10, 8.5, 12.5], fov: 40,
    minDistance: 5, maxDistance: 34, autoRotate: true, autoRotateSpeed: 0.22,
  });

  // OrbitControls re-targets (0,0,0) every frame inside TL.loop, so the
  // group that holds the population is offset to put its vertical center
  // (midway between the ground layer and the raised layer) at the origin,
  // the same trick hero-m5 and hero-m3 use, rather than fighting the
  // controls with a one-time camera.lookAt() to an off-origin point.
  const content = new THREE.Group();
  content.position.y = -(groundY + sickY) / 2;
  s.scene.add(content);

  const grid = TL.groundGrid(14, 14);
  content.add(grid);

  // ---- 10,000 people as one InstancedMesh: a real perf requirement at this
  // count, 10,000 individual THREE.Mesh objects would tank the frame rate ----
  const geo = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
  const mat = TL.material(0xffffff, { roughness: 0.6, metalness: 0.04 });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const dummy = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, catColor[categories[i]]);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  content.add(mesh);

  // ---- thin support posts under the ~100 people who have the condition, so
  // the raised layer reads as "lifted out of the crowd" rather than
  // "floating for no reason" ----
  const stalks = [];
  for (let i = 0; i < N; i++) {
    const cat = categories[i];
    if (cat !== CAT_TP && cat !== CAT_FN) continue;
    const x = positions[i * 3], z = positions[i * 3 + 2];
    const post = TL.thickLine([x, 0, z], [x, sickY, z], catColor[cat], 0.008);
    content.add(post);
    stalks.push({ mesh: post, cat });
  }

  // ---- isolate-positives toggle: hides everyone whose test came back
  // negative, leaving only the tested-positive group visible (95-ish sage
  // boxes floating over roughly 396 rust boxes on the ground) ----
  function applyFilter(onlyPositive) {
    for (let i = 0; i < N; i++) {
      const cat = categories[i];
      const visible = !onlyPositive || cat === CAT_TP || cat === CAT_FP;
      dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      const sc = visible ? 1 : 0.0001;
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    for (const st of stalks) st.mesh.visible = !onlyPositive || st.cat === CAT_TP;
  }

  const toggle = document.getElementById('hero-m4-toggle');
  const toggleState = document.getElementById('hero-m4-toggle-state');
  if (toggle) {
    toggle.addEventListener('change', () => {
      applyFilter(toggle.checked);
      if (toggleState) toggleState.textContent = toggle.checked ? 'on' : 'off';
    });
  }

  // ---- labels ----
  content.add(TL.label('has condition: raised, rare', { position: [-half * spacing - 0.9, sickY, 0], size: '12px', weight: '700' }));
  content.add(TL.label('no condition: grounded, common', { position: [-half * spacing - 0.9, groundY + 0.2, 1.1], size: '12px', weight: '700', color: '#3d5a73' }));
  const legendX = half * spacing + 1.0;
  content.add(TL.label('sage = true positive', { position: [legendX, 2.0, -3], size: '11px', color: '#' + TL.PAL3.sage.getHexString() }));
  content.add(TL.label('muted sage = false negative', { position: [legendX, 1.65, -3], size: '11px', color: '#' + mutedSage.getHexString() }));
  content.add(TL.label('ink = true negative', { position: [legendX, 1.3, -3], size: '11px', color: '#12233b' }));
  content.add(TL.label('rust = false positive', { position: [legendX, 0.95, -3], size: '11px', color: '#b4532a' }));

  s.camera.lookAt(0, 0, 0);
  TL.loop(s, () => {});
}
