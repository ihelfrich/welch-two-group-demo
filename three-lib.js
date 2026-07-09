// three-lib.js -- shared Three.js scene framework for every hero visualization
// on the site. One place for camera/light/palette/perf conventions so five
// independently-built scenes still read as one system.
//
// Every page that imports this needs the import map in its <head> BEFORE any
// module script (import maps cannot live in an external file):
//
// <script type="importmap">
// { "imports": {
//   "three": "https://unpkg.com/three@0.170.0/build/three.module.js",
//   "three/addons/": "https://unpkg.com/three@0.170.0/examples/jsm/"
// } }
// </script>
//
// Usage:
//   import * as TL from './three-lib.js';
//   const s = TL.initScene(document.getElementById('host'), { height: 480 });
//   s.scene.add(new THREE.Mesh(geo, TL.material(TL.PAL3.rust)));
//   TL.loop(s, (dt, t) => { ... per-frame updates ... });

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export { THREE, CSS2DObject };

// Same hex values as lib.js's PAL, as THREE.Color instances plus raw hex ints
// (THREE.Color, MeshStandardMaterial color, and Sprite tint all want slightly
// different forms, so both are exported).
export const HEX = {
  ink: 0x12233b, slate: 0x3d5a73, rust: 0xb4532a, sage: 0x6b8e5a,
  gold: 0xd69f43, violet: 0x6b5b8e, mist: 0xc9d1d9, paper: 0xfaf8f3,
};
export const PAL3 = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, new THREE.Color(v)])
);

export function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

export function fallbackMessage(container, text) {
  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;
    min-height:260px;background:#f4f1ea;border-radius:10px;color:#8a8f98;
    font-size:.92rem;text-align:center;padding:1.5rem">${text}</div>`;
}

// Sets up a renderer + CSS2D label overlay + camera + lights + optional
// orbit controls, sized to `container`. Returns everything a scene needs plus
// a resize() that's already wired to a ResizeObserver.
export function initScene(container, opts = {}) {
  const height = opts.height || 460;
  const cameraPos = opts.cameraPos || [4, 3.2, 5];
  const fov = opts.fov || 42;
  const orbit = opts.orbit !== false;
  const bg = opts.background === undefined ? PAL3.paper : opts.background;

  container.style.position = 'relative';

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: bg === null });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.borderRadius = '10px';

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  if (bg !== null) scene.background = bg;

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  camera.position.set(...cameraPos);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.72));
  const key = new THREE.DirectionalLight(0xffffff, 0.65);
  key.position.set(6, 8, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.25);
  fill.position.set(-5, 3, -4);
  scene.add(fill);

  let controls = null;
  if (orbit) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = opts.minDistance || 2;
    controls.maxDistance = opts.maxDistance || 30;
    if (opts.autoRotate) { controls.autoRotate = true; controls.autoRotateSpeed = opts.autoRotateSpeed || 0.6; }
  }

  function resize() {
    const w = container.clientWidth;
    const h = height;
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  return { scene, camera, renderer, labelRenderer, controls, container, resize };
}

// requestAnimationFrame loop that pauses when the scene's container scrolls
// off-screen (WebGL is not cheap; five idle scenes redrawing at 60fps each
// while the reader is three modules away is real, avoidable battery cost).
export function loop(s, update) {
  let running = true;
  let raf = null;
  const io = new IntersectionObserver((entries) => {
    running = entries[0].isIntersecting;
    if (running && raf === null) tick(performance.now());
  }, { threshold: 0.01 });
  io.observe(s.container);

  const clock = new THREE.Clock();
  function tick(t) {
    if (!running) { raf = null; return; }
    const dt = clock.getDelta();
    if (update) update(dt, clock.elapsedTime);
    if (s.controls) s.controls.update();
    s.renderer.render(s.scene, s.camera);
    s.labelRenderer.render(s.scene, s.camera);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  return () => { running = false; if (raf) cancelAnimationFrame(raf); io.disconnect(); };
}

export function material(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: opts.roughness ?? 0.55, metalness: opts.metalness ?? 0.05,
    transparent: !!opts.opacity, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide,
  });
}

// A floor grid plus three faint axis lines, the spatial reference every
// scene below uses instead of a bespoke one each.
export function groundGrid(size = 10, divisions = 10) {
  const g = new THREE.Group();
  const grid = new THREE.GridHelper(size, divisions, HEX.mist, HEX.mist);
  grid.position.y = 0;
  grid.material.opacity = 0.5;
  grid.material.transparent = true;
  g.add(grid);
  return g;
}

// An HTML label positioned at a 3D point, rendered by CSS2DRenderer so it
// uses the page's own font/MathJax instead of a baked 3D-text mesh.
export function label(text, opts = {}) {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.font = (opts.size || '12px') + ' -apple-system, sans-serif';
  div.style.color = opts.color || '#12233b';
  div.style.fontWeight = opts.weight || '600';
  div.style.whiteSpace = 'nowrap';
  div.style.textShadow = '0 1px 0 rgba(255,255,255,.7), 0 0 6px rgba(250,248,243,.9)';
  const obj = new CSS2DObject(div);
  if (opts.position) obj.position.set(...opts.position);
  return obj;
}

// A thin cylinder standing in for a line with real width (WebGL native
// lines are 1px regardless of linewidth on most platforms; this looks right
// at every zoom level instead).
export function thickLine(a, b, color, radius = 0.02) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, 10);
  const mesh = new THREE.Mesh(geo, material(color, { roughness: 0.4 }));
  mesh.position.copy(start).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

// Simple linear-congruential RNG matching lib.js's mulberry32, reimplemented
// here so three-lib has no load-order dependency on lib.js.
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
