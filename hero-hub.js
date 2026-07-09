// hero-hub.js -- the landing-page hero scene: the five-module course laid
// out as an orbitable, clickable arc instead of a flat menu. A flat list of
// five links doesn't need a third dimension; an arc that curves back in
// depth as it sweeps from module 1 to module 5 does, because orbiting it
// changes which nodes read as nearer and which as farther, the same way
// walking past a curved row of framed pictures does. Every node position
// below is computed from its angle on that arc, not typed in by hand, and
// the real <a href> tiles stay on the page directly under this scene, so
// this is a second way in, not a replacement for the reliable one.

const host = document.getElementById('hero-hub-host');
if (!host) { /* not on this page */ }
else if (!window.WebGLRenderingContext) {
  host.innerHTML = '<div class="hero-fallback">Your browser does not support WebGL, so the 3D scene cannot render here. The module list below works without it.</div>';
} else {
  runScene().catch(err => {
    console.error(err);
    host.innerHTML = '<div class="hero-fallback">The 3D scene failed to load (' + err.message + '). The module list below works without it.</div>';
  });
}

async function runScene() {
  const TL = await import('./three-lib.js');
  const { THREE } = TL;

  const modules = [
    { title: '1. Distributions',      href: 'm1-distributions.html',      color: 'ink' },
    { title: '2. Estimation & CLT',   href: 'm2-estimation-clt.html',     color: 'rust' },
    { title: '3. Hypothesis testing', href: 'm3-hypothesis-testing.html', color: 'sage' },
    { title: '4. Bayes',              href: 'm4-bayes.html',              color: 'gold' },
    { title: '5. Regression',         href: 'm5-regression.html',         color: 'violet' },
  ];

  // Five points on an arc of a circle in the x-z plane (radius 5, sweeping
  // about 116 degrees), plus a gentle vertical rise toward the middle node,
  // so the formation is a real space curve rather than five markers pinned
  // flat to a card. Positions come from the angle; nothing here is a typed
  // in (x, y, z) triple.
  const n = modules.length;
  const radius = 5.0;
  const angleMax = 58 * Math.PI / 180;
  const angleStep = (2 * angleMax) / (n - 1);
  const basePositions = modules.map((_, i) => {
    const angle = -angleMax + i * angleStep;
    const x = radius * Math.sin(angle);
    const z = -radius * (1 - Math.cos(angle));
    const y = 0.5 * (Math.cos(angle) - Math.cos(angleMax));
    return new THREE.Vector3(x, y, z);
  });
  const centroid = basePositions
    .reduce((a, p) => a.add(p), new THREE.Vector3())
    .multiplyScalar(1 / n);

  const s = TL.initScene(host, {
    height: 420, cameraPos: [1.5, 3.2, 12], minDistance: 4, maxDistance: 30,
    autoRotate: true, autoRotateSpeed: 0.18,
  });

  const content = new THREE.Group();
  content.position.copy(centroid).multiplyScalar(-1);
  s.scene.add(content);

  const grid = TL.groundGrid(16, 16);
  grid.position.y = -1.1;
  content.add(grid);

  // A faint line tracing the arc in module order, so the shape also reads
  // as a sequence, module 1 through module 5, not five unconnected points.
  for (let i = 0; i < n - 1; i++) {
    content.add(TL.thickLine(
      [basePositions[i].x, basePositions[i].y, basePositions[i].z],
      [basePositions[i + 1].x, basePositions[i + 1].y, basePositions[i + 1].z],
      TL.HEX.mist, 0.018
    ));
  }

  const toCss = (hex) => '#' + hex.toString(16).padStart(6, '0');

  const nodes = modules.map((m, i) => {
    const geo = new THREE.IcosahedronGeometry(0.55, 1);
    const colorHex = TL.HEX[m.color];
    const mesh = new THREE.Mesh(geo, TL.material(colorHex));
    mesh.position.copy(basePositions[i]);
    mesh.userData.href = m.href;
    content.add(mesh);
    content.add(TL.label(m.title, {
      position: [basePositions[i].x, basePositions[i].y + 0.92, basePositions[i].z],
      size: '13px', weight: '700', color: toCss(colorHex),
    }));
    return { mesh };
  });

  content.add(TL.label('click a node to open its module', {
    position: [0, -0.62, 0.5], size: '11px', weight: '600', color: '#8a8f98',
  }));

  // ---- raycasting: the documented Three.js pointer-to-3D pattern
  // (raycaster.setFromCamera + intersectObjects), plus a small drag-distance
  // guard so orbiting the scene with the mouse never fires a navigation by
  // accident on release. ----
  const raycaster = new THREE.Raycaster();
  function toNDC(e) {
    const rect = s.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
  }
  function hitIndex(e) {
    raycaster.setFromCamera(toNDC(e), s.camera);
    const hits = raycaster.intersectObjects(nodes.map(nd => nd.mesh), false);
    return hits.length ? nodes.findIndex(nd => nd.mesh === hits[0].object) : -1;
  }

  let downPt = null;
  let hoverIndex = -1;
  const canvas = s.renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => { downPt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downPt) return;
    const moved = Math.hypot(e.clientX - downPt[0], e.clientY - downPt[1]);
    downPt = null;
    if (moved > 6) return; // a drag/orbit release, not a click
    const idx = hitIndex(e);
    if (idx >= 0) window.location.href = nodes[idx].mesh.userData.href;
  });
  canvas.addEventListener('pointermove', (e) => {
    hoverIndex = hitIndex(e);
    canvas.style.cursor = hoverIndex >= 0 ? 'pointer' : 'grab';
  });
  canvas.addEventListener('pointerleave', () => { hoverIndex = -1; canvas.style.cursor = 'grab'; });

  s.camera.lookAt(0, 0, 0);
  TL.loop(s, (dt) => {
    nodes.forEach((nd, i) => {
      nd.mesh.rotation.y += dt * (0.22 + 0.03 * i);
      const target = i === hoverIndex ? 1.16 : 1.0;
      nd.mesh.scale.setScalar(THREE.MathUtils.lerp(nd.mesh.scale.x, target, 0.15));
    });
  });
}
