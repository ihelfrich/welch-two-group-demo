// hero-m2.js -- the module-2 hero scene: the sampling distribution of the mean
// built one particle at a time. Every ~80ms the scene draws a fresh sample of
// n = 30 from a right-skewed lognormal(0,1) population (the same generator as
// the module's rlnorm() code in Part 3) and adds ONE sphere for that sample's
// mean. Spheres stack by bin along x (the value of the mean), climb in y as
// their bin fills (the count), and land with a small jitter in x and z so an
// individually-arriving particle stays visible as a discrete object instead of
// fusing into a single grown bar. The coffee-scale widget lower on this page
// already shows a 2D running mean, so the third axis here is not decoration,
// it is what lets several hundred discrete arrivals occupy distinct positions
// while stacking. The population mean and standard deviation used for the
// readout's theoretical SE are the closed-form lognormal(0,1) moments (mean =
// e^0.5, var = (e-1)*e), not a simulation: they match the sd = 2.1612 printed
// in Part 3's R output on this same page.

const host = document.getElementById('hero-m2-host');
const readout = document.getElementById('hero-m2-readout');
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

  // ---- population: lognormal(0,1), same shape as the module's rlnorm() ----
  const rand = TL.rng(22055);
  const normal = (() => {
    let s = true, z2 = 0;
    return () => { if (!s) { s = true; return z2; }
      const u = Math.max(rand(), 1e-12), v = rand();
      const r = Math.sqrt(-2 * Math.log(u));
      z2 = r * Math.sin(2 * Math.PI * v); s = false; return r * Math.cos(2 * Math.PI * v); };
  })();
  const lognormalDraw = () => Math.exp(normal());

  const SAMPLE_N = 30;
  // Closed-form lognormal(mu=0, sigma=1) moments, computed analytically (not
  // simulated): mean = e^0.5 = 1.6487, sd = sqrt((e-1)*e) = 2.1612. This is
  // the same population Part 3's R block draws from with rlnorm().
  const meanPop = Math.exp(0.5);
  const sigmaPop = Math.sqrt((Math.E - 1) * Math.E);
  const seTheory = sigmaPop / Math.sqrt(SAMPLE_N);

  function drawSampleMean() {
    let sum = 0;
    for (let i = 0; i < SAMPLE_N; i++) sum += lognormalDraw();
    return sum / SAMPLE_N;
  }

  // ---- histogram layout: bins along x, particles stack in y, jitter in z ----
  const domainMin = 0.2, domainMax = 3.8, nBins = 30;
  const binWidth = (domainMax - domainMin) / nBins;
  const sceneHalfWidth = 3.5;
  const xScale = (2 * sceneHalfWidth) / (domainMax - domainMin);
  const domainMid = (domainMin + domainMax) / 2;
  const sceneX = (v) => (v - domainMid) * xScale;
  const binCenter = (i) => domainMin + (i + 0.5) * binWidth;

  const PARTICLE_R = 0.045;
  const STEP_Y = 0.105;
  const MAX_SAMPLES = 200;
  const SAMPLE_INTERVAL = 0.08;   // seconds between draws, the ~80ms cadence in the spec
  const RESET_PAUSE = 2.5;        // seconds the finished histogram holds before it clears

  // Anticipated peak bar height under the CLT normal approximation, used only
  // to center the camera (not shown to the reader): expected count in the
  // tallest bin after MAX_SAMPLES draws is MAX_SAMPLES * binWidth * peak
  // density of N(meanPop, seTheory).
  const peakDensity = 1 / (seTheory * Math.sqrt(2 * Math.PI));
  const estMaxHeight = MAX_SAMPLES * binWidth * peakDensity * STEP_Y;

  const binCounts = new Array(nBins).fill(0);
  let totalSamples = 0, sumMeans = 0, sumSqMeans = 0;

  function updateReadout() {
    if (!readout) return;
    const runningMean = totalSamples ? sumMeans / totalSamples : NaN;
    const runningSd = totalSamples > 1
      ? Math.sqrt(Math.max(0, sumSqMeans - totalSamples * runningMean * runningMean) / (totalSamples - 1))
      : NaN;
    readout.innerHTML =
      `<span>samples drawn = <b>${totalSamples}</b></span>` +
      `<span>mean of means = <b>${totalSamples ? runningMean.toFixed(3) : '--'}</b></span>` +
      `<span>sd of means = <b>${totalSamples > 1 ? runningSd.toFixed(3) : '--'}</b></span>` +
      `<span>theoretical SE = &sigma;/&radic;30 = <b>${seTheory.toFixed(3)}</b></span>`;
  }
  updateReadout();

  const s = TL.initScene(host, { height: 420, cameraPos: [6.6, 4.6, 7.6], minDistance: 3, maxDistance: 24, autoRotate: true, autoRotateSpeed: 0.15 });

  const content = new THREE.Group();
  content.position.y = -estMaxHeight / 2;
  s.scene.add(content);

  const grid = TL.groundGrid(10, 20);
  grid.position.y = -0.05;
  content.add(grid);

  const particleGeo = new THREE.SphereGeometry(PARTICLE_R, 10, 8);
  const particleMat = TL.material(TL.HEX.rust, { roughness: 0.5 });
  const particles = new THREE.Group();
  content.add(particles);

  // Population-mean reference: a thin gold line laid flat across the depth
  // of the stage at the true lognormal(0,1) mean, so the particle cloud's
  // eventual center can be checked against it by eye.
  const meanX = sceneX(meanPop);
  content.add(TL.thickLine([meanX, 0, -1.7], [meanX, 0, 1.7], TL.HEX.gold, 0.012));
  content.add(TL.label(`population mean μ = ${meanPop.toFixed(3)}`, { position: [meanX, estMaxHeight + 0.4, -1.7], size: '11px', color: '#8a6d1f' }));

  content.add(TL.label('sample mean, n = 30', { position: [0, -0.35, 2.4], size: '12px', weight: '700' }));
  content.add(TL.label('lognormal(0,1) population, right-skewed', { position: [sceneX(domainMin) - 0.2, estMaxHeight + 0.4, 0], size: '11px' }));
  content.add(TL.label('each sphere = one sample mean', { position: [sceneX(domainMin) - 0.2, estMaxHeight * 0.55, 1.5], size: '11px', color: '#3d5a73' }));

  s.camera.lookAt(0, 0, 0);

  let acc = 0, pausedFor = 0;

  TL.loop(s, (dtRaw) => {
    const dt = Math.min(dtRaw, 0.25); // guard against a huge dt after a backgrounded tab

    if (pausedFor > 0) {
      pausedFor -= dt;
      if (pausedFor <= 0) {
        particles.clear();
        binCounts.fill(0);
        totalSamples = 0; sumMeans = 0; sumSqMeans = 0;
        acc = 0;
        updateReadout();
      }
      return;
    }

    acc += dt;
    while (acc >= SAMPLE_INTERVAL && pausedFor <= 0) {
      acc -= SAMPLE_INTERVAL;

      const m = drawSampleMean();
      let idx = Math.floor((m - domainMin) / binWidth);
      if (idx < 0) idx = 0;
      if (idx >= nBins) idx = nBins - 1;
      const countInBin = binCounts[idx]++;
      totalSamples++; sumMeans += m; sumSqMeans += m * m;

      const mesh = new THREE.Mesh(particleGeo, particleMat);
      const jitterX = (rand() - 0.5) * (binWidth * xScale) * 0.55;
      const jitterZ = (rand() - 0.5) * 1.5;
      mesh.position.set(sceneX(binCenter(idx)) + jitterX, countInBin * STEP_Y + STEP_Y / 2, jitterZ);
      particles.add(mesh);

      if (totalSamples >= MAX_SAMPLES) { pausedFor = RESET_PAUSE; break; }
    }
    updateReadout();
  });
}
