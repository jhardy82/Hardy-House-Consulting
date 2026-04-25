/**
 * home.js -- Hero / landing section (#home)
 *
 * Renders a full-viewport Three.js background: three nested sacred-geometry
 * solids (Dodecahedron, Icosahedron, Octahedron) with 4-layer glow edges
 * plus a particle field, all driven by a module-level RAF loop.
 *
 * Exports: init()  -- idempotent, safe to call multiple times.
 */

import { createRenderer } from '../utils/createRenderer.js';
import { PHI }            from '../geometry/constants.js';

// -- Constants derived from PHI (particle radius range) --------------
const PARTICLE_R_MIN = PHI * 3.7;                         // ~6.0
const PARTICLE_R_MAX = PARTICLE_R_MIN + PHI * 4.9;        // ~14

// -- Idempotency guard -----------------------------------------------
let initialised = false;

// -- Module-level RAF loop -------------------------------------------
let _animId      = null;
let _sceneTickFn = null;

// -- buildGlowEdge ---------------------------------------------------
// Exact 4-layer spec from CLAUDE.md. col is an integer 0xRRGGBB.
function buildGlowEdge(geo, col) {
  const group = new THREE.Group();
  [[1.000, 0.88], [1.022, 0.27], [1.058, 0.10], [1.105, 0.04]]
    .forEach(([scale, opacity]) => {
      try {
        const mat = new THREE.LineBasicMaterial({
          color: col, transparent: true, opacity,
          blending: THREE.AdditiveBlending, depthWrite: false
        });
        const ls = new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
        ls.scale.setScalar(scale);
        group.add(ls);
      } catch (err) {
        console.warn('[home] buildGlowEdge layer failed:', err.message);
      }
    });
  return group;
}

// -- buildFaceMesh ---------------------------------------------------
function buildFaceMesh(geo, col, opacity) {
  try {
    return new THREE.Mesh(
      geo,
      new THREE.MeshPhongMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.1,
        transparent: true,
        opacity,
        side: THREE.DoubleSide
      })
    );
  } catch (err) {
    console.warn('[home] buildFaceMesh failed:', err.message);
    return new THREE.Object3D(); // safe no-op fallback
  }
}

// -- buildScene -------------------------------------------------------
function buildScene(canvas) {
  const parent = canvas.parentElement;
  const W = parent.clientWidth  || window.innerWidth;
  const H = parent.clientHeight || window.innerHeight;

  // Renderer -- always via factory, never new THREE.WebGLRenderer directly
  const renderer = createRenderer(canvas, {
    alpha:      false,
    clearColor: 0x07040F,
    clearAlpha: 1
  });

  const scene = new THREE.Scene();
  try {
    scene.fog = new THREE.FogExp2(0x07040F, 0.032);
  } catch (err) {
    console.warn('[home] fog failed:', err.message);
  }

  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 60);
  camera.position.set(0, 0, 7);

  // Lighting
  try {
    scene.add(new THREE.AmbientLight(0x1A0D3D, 0.6));
  } catch (err) {
    console.warn('[home] AmbientLight failed:', err.message);
  }

  let pl1 = null;
  try {
    pl1 = new THREE.PointLight(0xC49A1F, 1.2, 20);
    pl1.position.set(3, 2, 4);
    scene.add(pl1);
  } catch (err) {
    console.warn('[home] PointLight pl1 failed:', err.message);
  }

  try {
    const pl2 = new THREE.PointLight(0x1E3FAA, 0.4, 12);
    pl2.position.set(-2, -1, 2);
    scene.add(pl2);
  } catch (err) {
    console.warn('[home] PointLight pl2 failed:', err.message);
  }

  // Particle field
  let ptMat = null;
  try {
    const count  = 350;
    const ptPos  = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const r  = PARTICLE_R_MIN + Math.random() * (PARTICLE_R_MAX - PARTICLE_R_MIN);
      ptPos[i * 3]     = r * Math.sin(ph) * Math.cos(th);
      ptPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      ptPos[i * 3 + 2] = r * Math.cos(ph);
    }
    const ptGeo = new THREE.BufferGeometry();
    ptGeo.setAttribute('position', new THREE.Float32BufferAttribute(ptPos, 3));
    ptMat = new THREE.PointsMaterial({
      color: 0xC49A1F,
      size: 0.04,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending
    });
    scene.add(new THREE.Points(ptGeo, ptMat));
  } catch (err) {
    console.warn('[home] particle field failed:', err.message);
  }

  // Nested solids: Dodecahedron (Aether) -- Icosahedron (Water) -- Octahedron (Air)
  const group = new THREE.Group();
  scene.add(group);

  const solidDefs = [
    { geoFn: () => new THREE.DodecahedronGeometry(2.2, 0), col: 0x9B7BE0, faceOp: 0.08 },
    { geoFn: () => new THREE.IcosahedronGeometry(1.5, 0),  col: 0x20A8C8, faceOp: 0.06 },
    { geoFn: () => new THREE.OctahedronGeometry(1.0, 0),   col: 0x3B5FC8, faceOp: 0.05 }
  ];

  solidDefs.forEach(({ geoFn, col, faceOp }) => {
    try {
      const geo = geoFn();
      group.add(buildGlowEdge(geo, col));
      group.add(buildFaceMesh(geo, col, faceOp));
    } catch (err) {
      console.warn('[home] solid construction failed:', err.message);
    }
  });

  // Camera aspect sync on resize
  try {
    new ResizeObserver(() => {
      const W2 = parent.clientWidth  || window.innerWidth;
      const H2 = parent.clientHeight || window.innerHeight;
      if (W2 && H2) {
        camera.aspect = W2 / H2;
        camera.updateProjectionMatrix();
      }
    }).observe(parent);
  } catch (err) {
    console.warn('[home] camera ResizeObserver failed:', err.message);
  }

  return { scene, camera, renderer, group, ptMat, pl1 };
}

// -- buildHTML -------------------------------------------------------
// Builds hero markup via DOM API (no innerHTML with dynamic content).
function buildHTML(section) {
  if (section.querySelector('.hero-content')) return;

  // Canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'home-hero-canvas';
  canvas.id = 'heroCanvas';
  section.appendChild(canvas);

  // Content wrapper
  const content = document.createElement('div');
  content.className = 'hero-content';

  // Eyebrow
  const eye = document.createElement('div');
  eye.className = 'hero-eye';
  eye.textContent = 'Hardy House Consulting';
  content.appendChild(eye);

  // Title
  const title = document.createElement('h1');
  title.className = 'hero-title';
  const titleLine = document.createTextNode('Geometry is not');
  const br = document.createElement('br');
  const em = document.createElement('em');
  em.textContent = 'metaphor.';
  title.appendChild(titleLine);
  title.appendChild(br);
  title.appendChild(em);
  content.appendChild(title);

  // Subtitle
  const sub = document.createElement('p');
  sub.className = 'hero-sub';
  sub.textContent =
    'It is the actual structural logic of how teams coordinate, ' +
    'how systems scale, and how information flows. ' +
    'Sacred geometry as operating system.';
  content.appendChild(sub);

  // CTA buttons
  const cta = document.createElement('div');
  cta.className = 'hero-cta';

  const btnPrimary = document.createElement('button');
  btnPrimary.className = 'btn-primary';
  btnPrimary.textContent = 'Find Your Element \u2192';
  btnPrimary.dataset.nav = 'oracle';

  const btnGhost = document.createElement('button');
  btnGhost.className = 'btn-ghost';
  btnGhost.textContent = 'Explore Geometry';
  btnGhost.dataset.nav = 'geometry';

  cta.appendChild(btnPrimary);
  cta.appendChild(btnGhost);
  content.appendChild(cta);
  section.appendChild(content);

  // Wire CTA navigation -- uses hash router event pattern
  cta.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.nav;
      history.pushState(null, '', '#' + target);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  });
}

// -- injectStyles ----------------------------------------------------
// Scoped styles for home section. No hardcoded hex values -- all colours
// via CSS custom properties from tokens.css.
function injectStyles() {
  if (document.getElementById('home-styles')) return;

  const style = document.createElement('style');
  style.id = 'home-styles';

  // Build style text as a plain string -- no dynamic interpolation
  const css = [
    '[data-section="home"] {',
    '  height: 100vh;',
    '  display: flex;',
    '  flex-direction: column;',
    '  align-items: center;',
    '  justify-content: center;',
    '  text-align: center;',
    '  position: relative;',
    '  overflow: hidden;',
    '}',
    '',
    '.home-hero-canvas {',
    '  position: absolute;',
    '  inset: 0;',
    '  width: 100%;',
    '  height: 100%;',
    '}',
    '',
    '.hero-content {',
    '  position: relative;',
    '  z-index: 2;',
    '  padding: 2rem;',
    '}',
    '',
    '.hero-eye {',
    '  font-family: var(--font-mono);',
    '  font-size: .62rem;',
    '  letter-spacing: .25em;',
    '  text-transform: uppercase;',
    '  color: var(--accent-border);',
    '  margin-bottom: 1.2rem;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  gap: .8rem;',
    '}',
    '',
    '.hero-eye::before,',
    '.hero-eye::after {',
    '  content: "";',
    '  width: 32px;',
    '  height: 1px;',
    '  background: var(--accent);',
    '  opacity: .45;',
    '}',
    '',
    '.hero-title {',
    '  font-family: var(--font-display);',
    '  font-size: clamp(2.6rem, 6vw, 5rem);',
    '  font-weight: 300;',
    '  color: var(--fg);',
    '  margin-bottom: .8rem;',
    '  line-height: 1.05;',
    '}',
    '',
    '.hero-title em {',
    '  font-style: italic;',
    '  color: var(--accent-fg);',
    '}',
    '',
    '.hero-sub {',
    '  font-size: clamp(.88rem, 1.6vw, 1.08rem);',
    '  color: var(--fg2);',
    '  max-width: 560px;',
    '  margin: 0 auto 2.2rem;',
    '  line-height: 1.72;',
    '}',
    '',
    '.hero-cta {',
    '  display: flex;',
    '  gap: .75rem;',
    '  justify-content: center;',
    '  flex-wrap: wrap;',
    '}',
    '',
    '.btn-primary {',
    '  font-family: var(--font-mono);',
    '  font-size: .62rem;',
    '  letter-spacing: .12em;',
    '  text-transform: uppercase;',
    '  padding: .5rem 1.3rem;',
    '  border-radius: 3px;',
    '  border: 1px solid var(--accent);',
    '  color: var(--accent);',
    '  background: var(--accent-muted);',
    '  cursor: pointer;',
    '  transition: background var(--dur-base);',
    '}',
    '',
    '.btn-primary:hover {',
    '  background: var(--accent-glow);',
    '}',
    '',
    '.btn-ghost {',
    '  font-family: var(--font-mono);',
    '  font-size: .62rem;',
    '  letter-spacing: .12em;',
    '  text-transform: uppercase;',
    '  padding: .5rem 1.3rem;',
    '  border-radius: 3px;',
    '  border: 1px solid var(--border-1);',
    '  color: var(--fg3);',
    '  background: transparent;',
    '  cursor: pointer;',
    '  transition: all var(--dur-base);',
    '}',
    '',
    '.btn-ghost:hover {',
    '  border-color: var(--border-2);',
    '  color: var(--fg2);',
    '}'
  ].join('\n');

  style.textContent = css;
  document.head.appendChild(style);
}

// -- startLoop -------------------------------------------------------
function startLoop(tickFn) {
  if (_animId !== null) return; // already running
  _sceneTickFn = tickFn;
  let t = 0;
  const loop = () => {
    t += 0.005;
    _sceneTickFn(t);
    _animId = requestAnimationFrame(loop);
  };
  _animId = requestAnimationFrame(loop);
}

// -- GSAP entrance animation -----------------------------------------
function runEntrance(section) {
  if (!window.gsap) return;
  try {
    const content = section.querySelector('.hero-content');
    if (!content) return;
    gsap.from(content, {
      opacity: 0,
      y: 18,
      duration: 0.75,
      ease: 'power2.out',
      delay: 0.1
    });
  } catch (err) {
    console.warn('[home] GSAP entrance failed:', err.message);
  }
}

// -- init (exported) -------------------------------------------------
export function init() {
  if (initialised) return;
  initialised = true;

  const section = document.querySelector('[data-section="home"]');
  if (!section) {
    console.warn('[home] section[data-section="home"] not found -- aborting init');
    return;
  }

  injectStyles();
  buildHTML(section);

  // 80 ms defer so CSS layout settles before reading dimensions (CLAUDE.md rule)
  setTimeout(() => {
    const canvas = section.querySelector('#heroCanvas');
    if (!canvas) {
      console.warn('[home] #heroCanvas missing after buildHTML');
      return;
    }

    const { scene, camera, renderer, group, ptMat, pl1 } = buildScene(canvas);

    startLoop((t) => {
      group.rotation.y += 0.004;
      group.rotation.x += 0.0015;
      if (ptMat) ptMat.opacity = 0.22 + Math.sin(t * 1.2) * 0.07;
      if (pl1)   pl1.intensity  = 1.1  + Math.sin(t * 0.8) * 0.15;
      renderer.render(scene, camera);
    });

    runEntrance(section);
  }, 80);
}
