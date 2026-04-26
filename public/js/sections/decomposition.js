/**
 * decomposition.js -- Sacred Geometry Decomposition section
 *
 * Migrated from _source/hardy-house-decomposition.html
 *
 * Exports a single named function: init()
 * THREE and gsap are window globals -- never imported.
 * createRenderer factory is used for all WebGLRenderer instances.
 *
 * Geometry invariants (mathematical facts -- never change these):
 *   FOL_PTS.length   = 19   (Flower of Life circle centres)
 *   FRUIT_IDX.length = 13   (Fruit of Life)
 *   MET_EDGES.length = 78   (C(13,2) -- all Metatron edges)
 *   Glow layers      = 4    (scales 1.000 / 1.022 / 1.058 / 1.105)
 *
 * Security note: innerHTML is used below to inject a static author-controlled
 * HTML template (never user input), so XSS risk is not applicable here.
 */

import { createRenderer }   from '../utils/createRenderer.js';
import { SQ3H, FOL_R } from '../geometry/constants.js';

/* ============================================================
   IDEMPOTENCY GUARD
============================================================ */
let initialised = false;

export function init() {
  if (initialised) return;
  if (!window.THREE) {
    console.warn('[decomposition] Three.js not loaded');
    return;
  }
  initialised = true;
  // 80ms delay: CSS layout must complete before reading parentElement dimensions
  setTimeout(_boot, 80);
}

/* ============================================================
   INTERNAL BOOT
============================================================ */
function _boot() {
  const section = document.querySelector('[data-section="decomposition"]')
                 || document.getElementById('decomposition');
  if (!section) {
    console.warn('[decomposition] section element not found');
    return;
  }
  _injectHTML(section);
  _initScenes();
}

/* ============================================================
   HTML INJECTION
   Static author-controlled content only -- no user input ever reaches here.
============================================================ */
function _injectHTML(section) {
  // nosec: static author-controlled template, never user input
  section.innerHTML = `
<!-- Hero -->
<div class="dec-hero">
  <div class="dec-eyebrow">Hardy House Consulting &middot; Sacred Geometry</div>
  <h2 class="dec-title">From Circle to <em>Cosmos</em></h2>
  <p class="dec-sub">Every Platonic solid is hidden within the Flower of Life. This demonstration traces the geometric path: from overlapping circles, through the Fruit of Life, into Metatron's Cube -- and finally reveals each perfect form extracted from the pattern.</p>
  <div class="dec-path-strip" id="dec-pathStrip">
    <span class="dec-path-node" id="dec-pn-fol">Flower of Life</span>
    <span class="dec-path-arrow">&#8594;</span>
    <span class="dec-path-node" id="dec-pn-seed">Seed of Life</span>
    <span class="dec-path-arrow">&#8594;</span>
    <span class="dec-path-node" id="dec-pn-fruit">Fruit of Life</span>
    <span class="dec-path-arrow">&#8594;</span>
    <span class="dec-path-node" id="dec-pn-met">Metatron's Cube</span>
    <span class="dec-path-arrow">&#8594;</span>
    <span class="dec-path-node" id="dec-pn-solid">Platonic Solids</span>
  </div>
</div>

<!-- Section 1: Flower of Life -->
<div class="dec-demo-section">
  <div class="dec-demo-header">
    <span class="dec-demo-num">01</span>
    <h3 class="dec-demo-title">Flower of Life Decomposition</h3>
  </div>
  <div class="dec-canvas-pair">
    <div class="dec-canvas-panel" id="dec-fol2D-wrap">
      <canvas id="dec-fol2D"></canvas>
      <div class="dec-cp-label">2D Source Pattern</div>
      <div class="dec-cp-hint">Slowly rotating</div>
    </div>
    <div class="dec-canvas-panel" id="dec-fol3D-wrap">
      <canvas id="dec-fol3D"></canvas>
      <div class="dec-cp-label">3D Extracted Form</div>
      <div class="dec-cp-hint">Drag to orbit</div>
    </div>
  </div>
  <div class="dec-btn-strip" id="dec-folButtons"></div>
  <div class="dec-info-panel" id="dec-folInfo">
    <div class="dec-ip-head">
      <div class="dec-ip-title" id="dec-fol-ip-title">Flower of Life</div>
      <div class="dec-ip-el" id="dec-fol-ip-el" style="color:#C49A1F;border-color:rgba(196,154,31,.3);background:rgba(196,154,31,.08)">Pattern</div>
    </div>
    <div class="dec-ip-facts" id="dec-fol-ip-facts">19 circles &middot; Hexagonal grid &middot; R-spaced centres</div>
    <div class="dec-ip-desc" id="dec-fol-ip-desc">The Flower of Life is the foundation of all sacred geometry. Begin with one circle -- the Seed of Life. Surround it with six identical circles. Surround those with twelve more. The result encodes every geometric form that follows.</div>
    <div class="dec-ip-cf" id="dec-fol-ip-cf">In ContextForge, the Flower of Life represents the generative origin of the entire framework -- the single Circle from which all team topologies, agent architectures, and dimensional structures expand.</div>
  </div>
</div>

<!-- Divider -->
<div class="dec-section-div">
  <div class="dec-sd-line"></div>
  <div class="dec-sd-text">Fruit of Life + Lines = Metatron's Cube &rarr; Platonic Solids</div>
  <div class="dec-sd-line"></div>
</div>

<!-- Section 2: Metatron Extraction -->
<div class="dec-demo-section">
  <div class="dec-demo-header">
    <span class="dec-demo-num">02</span>
    <h3 class="dec-demo-title">Metatron's Cube -- Platonic Solid Extraction</h3>
  </div>
  <div class="dec-canvas-pair">
    <div class="dec-canvas-panel" id="dec-met2D-wrap">
      <canvas id="dec-met2D"></canvas>
      <div class="dec-cp-label">2D Metatron's Cube &middot; Edges highlighted</div>
      <div class="dec-cp-hint">Select a solid below</div>
    </div>
    <div class="dec-canvas-panel" id="dec-met3D-wrap">
      <canvas id="dec-met3D"></canvas>
      <div class="dec-cp-label">3D Extracted Solid</div>
      <div class="dec-cp-hint">Drag to orbit</div>
    </div>
  </div>
  <div class="dec-btn-strip" id="dec-solidButtons"></div>
  <div class="dec-info-panel" id="dec-solidInfo">
    <div class="dec-ip-head">
      <div class="dec-ip-title" id="dec-met-ip-title">Select a solid above</div>
    </div>
    <div class="dec-ip-desc" id="dec-met-ip-desc">Each of the five Platonic solids is encoded within Metatron's Cube. The 78 connecting lines contain all their edges as subsets -- the solid exists within the pattern, waiting to be revealed.</div>
  </div>
</div>
`;
}

/* ============================================================
   GEOMETRIC DATA
   All constants derived -- PHI / SQ3H / FOL_R imported from constants.js
============================================================ */
const R = FOL_R; // 1.0

// Flower of Life -- 19 axial coordinates (hex grid, cube coords q,r)
const FOL_AX = [
  [0,0],[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1],
  [2,0],[1,1],[0,2],[-1,2],[-2,2],[-2,1],[-2,0],[-1,-1],[0,-2],[1,-2],[2,-2],[2,-1]
];
// Cartesian conversion -- produces exactly 19 points
const FOL_PTS = FOL_AX.map(([q, r]) => [q + r * 0.5, r * SQ3H]);

// Fruit of Life -- exactly 13 indices into FOL_PTS
const FRUIT_IDX = [0, 1, 2, 3, 4, 5, 6, 7, 9, 11, 13, 15, 17];

// Metatron centres -- exactly 13 points
const MET_PTS = FRUIT_IDX.map(i => FOL_PTS[i]);

// All Metatron edges -- exactly 78 = C(13,2)
const MET_EDGES = [];
for (let i = 0; i < 13; i++) {
  for (let j = i + 1; j < 13; j++) {
    MET_EDGES.push([i, j]);
  }
}

/* ============================================================
   GLOW EDGE BUILDER -- canonical 4-layer spec
   Scales: 1.000 / 1.022 / 1.058 / 1.105
   Always EdgesGeometry -- never WireframeGeometry
============================================================ */
function buildGlowEdge(geo, hexColor) {
  const col = parseInt(hexColor.replace('#', ''), 16);
  const g = new THREE.Group();
  [[1.000, 0.88], [1.022, 0.27], [1.058, 0.10], [1.105, 0.04]].forEach(([scale, opacity]) => {
    const mat = new THREE.LineBasicMaterial({
      color: col,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ls = new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
    ls.scale.setScalar(scale);
    g.add(ls);
  });
  return g;
}

/* ============================================================
   SOLID DEFINITIONS
============================================================ */
const SOLIDS = {
  merkaba: {
    name: 'Star Tetrahedron',
    aka: 'Merkaba',
    element: 'Spirit',
    ecol: '#C49A1F',
    ebg: 'rgba(196,154,31,.08)',
    facts: 'Star Tetrahedron \u00b7 Two interlocked \u00b7 Dual-counter-rotating',
    edges1: [[1,3],[3,5],[5,1],[0,1],[0,3],[0,5]],
    edges2: [[2,4],[4,6],[6,2],[0,2],[0,4],[0,6]],
    col1: 0xC49A1F, col2: 0x9B7BE0,
    desc: "Two equilateral triangles within the inner ring of Metatron's Cube form the 2D shadow of the Star Tetrahedron. The upward gold triangle (vertices c1, c3, c5) is the spirit-bound tetrahedron; the downward purple triangle (c2, c4, c6) is the earth-bound tetrahedron. Together they form the Star of David -- the hexagram central to sacred geometry.",
    cf: 'In ContextForge, the Merkaba encodes the dual-stack architecture: top-down orchestration from the apex agent meets bottom-up emergent behaviour from the Pentagon ring. The two counter-rotating fields are the Plan phase and the Observe phase in dynamic equilibrium.',
    geo: 'merkaba',
    vertHighlight: [0,1,2,3,4,5,6],
  },
  cube: {
    name: 'Hexahedron',
    aka: 'Cube',
    element: 'Earth',
    ecol: '#2D8050',
    ebg: 'rgba(45,128,80,.08)',
    facts: 'Faces: 6 \u00b7 Vertices: 8 \u00b7 Edges: 12 \u00b7 Face-diagonal view',
    edges1: [[1,2],[2,3],[3,4],[4,5],[5,6],[6,1],[1,4],[2,5],[3,6],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6]],
    col1: 0x2D8050,
    desc: "The 6 inner circle centres of Metatron's Cube form a regular hexagon -- the face-on 2D projection of a cube viewed along its 3-fold body diagonal. The 3 long diagonals through the centre (c1-c4, c2-c5, c3-c6) are the cube's three mutually perpendicular body axes.",
    cf: 'In ContextForge, the Hexahedron is the Earth Principle: the six-agent coordination ring, the grounding operational scaffold. Six equal axes, maximum structural stability. The cube is the only Platonic solid that tiles 3D space without gaps -- the grid of all implementation work.',
    geo: 'cube',
    vertHighlight: [0,1,2,3,4,5,6],
  },
  octahedron: {
    name: 'Octahedron',
    aka: 'Octahedron',
    element: 'Air',
    ecol: '#3B5FC8',
    ebg: 'rgba(59,95,200,.08)',
    facts: 'Faces: 8 \u00b7 Vertices: 6 \u00b7 Edges: 12 \u00b7 Dual of the Cube',
    edges1: [[1,2],[2,3],[3,4],[4,5],[5,6],[6,1],[1,3],[3,5],[5,1],[2,4],[4,6],[6,2]],
    col1: 0x3B5FC8,
    desc: "The octahedron is the dual of the cube -- the same 6 vertices, different edge connections. The 6 inner circle centres, connected by both hexagon sides and the inner triangle chords, reveal the octahedron's 12 edges.",
    cf: 'In ContextForge, the Octahedron encodes the Air Principle: the information-flow and synchronisation medium between agents. The QSE Quantum Sync Engine operates on octahedral symmetry -- balanced exchange between all polarities simultaneously.',
    geo: 'octahedron',
    vertHighlight: [1,2,3,4,5,6],
  },
  icosahedron: {
    name: 'Icosahedron',
    aka: 'Icosahedron',
    element: 'Water',
    ecol: '#20A8C8',
    ebg: 'rgba(32,168,200,.08)',
    facts: 'Faces: 20 \u00b7 Vertices: 12 \u00b7 Edges: 30 \u00b7 5-valent vertices',
    edges1: [
      [1,2],[2,3],[3,4],[4,5],[5,6],[6,1],
      [7,8],[8,9],[9,10],[10,11],[11,12],[12,7],
      [1,7],[1,8],[2,8],[2,9],[3,9],[3,10],[4,10],[4,11],[5,11],[5,12],[6,12],[6,7],
      [7,9],[8,10],[9,11],[10,12],[11,7],[12,8]
    ],
    col1: 0x20A8C8,
    desc: 'The icosahedron uses all 12 non-centre Metatron circle centres as its 12 vertices. Its 30 edges span both hexagonal rings. Each vertex connects to exactly 5 others (5-valent), encoding the golden ratio in every non-adjacent vertex distance.',
    cf: 'In ContextForge, the Icosahedron encodes the Water Principle: flow, adaptability, and maximum interconnected resilience. The GCMT icosahedral team topology at t3 scale (12 agents + 1 apex) derives directly from this vertex structure.',
    geo: 'icosahedron',
    vertHighlight: [1,2,3,4,5,6,7,8,9,10,11,12],
  },
  dodecahedron: {
    name: 'Dodecahedron',
    aka: 'Dodecahedron',
    element: 'Aether',
    ecol: '#9B7BE0',
    ebg: 'rgba(155,123,224,.08)',
    facts: 'Faces: 12 \u00b7 Vertices: 20 \u00b7 Edges: 30 \u00b7 Pentagonal faces \u00b7 phi-saturated',
    edges1: [
      [7,8],[8,9],[9,10],[10,11],[11,12],[12,7],
      [7,9],[9,11],[11,7],[8,10],[10,12],[12,8],
      [1,9],[2,10],[3,11],[4,12],[5,7],[6,8],
      [0,7],[0,8],[0,9],[0,10],[0,11],[0,12],
      [1,7],[2,8],[3,9],[4,10],[5,11],[6,12]
    ],
    col1: 0x9B7BE0,
    desc: "The dodecahedron requires the full outer ring of Metatron's Cube -- it alone goes one dimension beyond the inner solids. The alternating triangular cross-connections of the outer hexagon create pentagonal star patterns encoding its 12 pentagonal faces.",
    cf: 'In ContextForge, the Dodecahedron encodes Aether -- the COF-13D framework itself. Its 12 pentagonal faces map to the 12 primary dimensional axes. The golden ratio embedded in every pentagon is the phi^5 Cosmic Consciousness principle.',
    geo: 'dodecahedron',
    vertHighlight: [0,1,2,3,4,5,6,7,8,9,10,11,12],
  }
};

/* ============================================================
   FOL STATE DEFINITIONS
============================================================ */
const FOL_STATES = {
  fol: {
    label: 'Flower of Life',
    pathKey: 'dec-pn-fol',
    circleOps: new Array(19).fill(0.68),
    circleColors: new Array(19).fill(0xC49A1F),
    showMetLines: false,
    title: 'Flower of Life',
    elLabel: 'Pattern', elCol: '#C49A1F', elBg: 'rgba(196,154,31,.08)',
    facts: '19 overlapping circles \u00b7 Hexagonal arrangement \u00b7 R-spaced centres \u00b7 Encodes all that follows',
    desc: 'The Flower of Life begins with one circle (the Seed). Six identical circles are placed touching the first. Twelve more complete the outer ring. All have the same radius R, and all adjacent centres are separated by exactly R -- so each circle passes through the centre of its neighbours.',
    cf: 'In ContextForge, the Flower of Life is the primordial generative pattern -- the single origin (Circle) from which the COF framework, the PAOAL cycle, and all team geometries emanate outward in hexagonal rings of increasing complexity.',
    form3D: 'fol',
  },
  seed: {
    label: 'Seed of Life',
    pathKey: 'dec-pn-seed',
    circleOps: [.88,.88,.88,.88,.88,.88,.88,.08,.08,.08,.08,.08,.08,.08,.08,.08,.08,.08,.08],
    circleColors: [...new Array(7).fill(0xC49A1F), ...new Array(12).fill(0x3B3028)],
    showMetLines: false,
    title: 'Seed of Life',
    elLabel: '7 Circles', elCol: '#C49A1F', elBg: 'rgba(196,154,31,.08)',
    facts: '7 circles \u00b7 Centre + 6 \u00b7 6-fold symmetry \u00b7 6 days of creation',
    desc: 'The 7 innermost circles of the Flower of Life form the Seed of Life -- the central circle surrounded by 6. Each of the 6 surrounding circles touches the centre and its two neighbours, forming 6 vesica piscis intersections.',
    cf: 'In ContextForge, the Seed of Life is the 7-agent nucleus: one apex agent at centre, six Pentagon-ring agents surrounding it. This is the minimum complete team topology.',
    form3D: 'seed',
  },
  fruit: {
    label: 'Fruit of Life',
    pathKey: 'dec-pn-fruit',
    circleOps: i => FRUIT_IDX.includes(i) ? 0.80 : 0.08,
    circleColors: i => FRUIT_IDX.includes(i) ? 0xC49A1F : 0x3B3028,
    showMetLines: false,
    title: 'Fruit of Life',
    elLabel: '13 Circles', elCol: '#C49A1F', elBg: 'rgba(196,154,31,.08)',
    facts: "13 circles \u00b7 1 + 6 + 6 alternating outer \u00b7 The generator of Metatron's Cube",
    desc: "By taking every other circle from the outer ring of the Flower of Life, 13 circles are revealed: the centre, the 6 inner ring, and 6 alternating outer ring circles. This is the Fruit of Life -- the direct geometric precursor to Metatron's Cube.",
    cf: 'In ContextForge, the Fruit of Life is the master topology: 13 dimensional coordinates from which all agent configurations, all team geometries, and all workflow structures can be derived.',
    form3D: 'fruit',
  },
  vesica: {
    label: 'Vesica Piscis',
    pathKey: null,
    circleOps: i => [0,1].includes(i) ? 0.85 : 0.06,
    circleColors: i => [0,1].includes(i) ? 0xC49A1F : 0x3B3028,
    showMetLines: false,
    showVesica: true,
    title: 'Vesica Piscis',
    elLabel: 'Foundation', elCol: '#C49A1F', elBg: 'rgba(196,154,31,.08)',
    facts: 'Two intersecting circles \u00b7 Height = R*sqrt(3) \u00b7 Width = R \u00b7 Ratio 1:sqrt(3)',
    desc: 'The Vesica Piscis is formed where any two adjacent FOL circles overlap -- the lens-shaped intersection. Its height-to-width ratio is sqrt(3) : 1. This shape is the geometric mother of the equilateral triangle and ultimately the golden ratio phi.',
    cf: "In ContextForge, the Vesica Piscis represents the fundamental overlap between any two agents' context fields -- the shared relational space where collaboration occurs.",
    form3D: 'vesica',
  },
  metatron: {
    label: "Metatron's Cube",
    pathKey: 'dec-pn-met',
    circleOps: i => FRUIT_IDX.includes(i) ? 0.65 : 0.06,
    circleColors: i => FRUIT_IDX.includes(i) ? 0xC49A1F : 0x3B3028,
    showMetLines: true,
    title: "Metatron's Cube",
    elLabel: '78 Lines', elCol: '#9B7BE0', elBg: 'rgba(155,123,224,.08)',
    facts: '13 circles \u00b7 78 connecting lines \u00b7 All 5 Platonic solids encoded within',
    desc: "Connecting every Fruit of Life circle centre to every other with a straight line creates Metatron's Cube -- 78 lines encoding all five Platonic solids simultaneously. The solid geometry of the universe is encoded in this flat pattern.",
    cf: "In ContextForge, Metatron's Cube is the COF-13D unified field -- all dimensional relationships encoded in a single geometric structure.",
    form3D: 'metatron',
  }
};

/* ============================================================
   ORBIT CONTROL
============================================================ */
class OrbitControl {
  constructor(cam, r = 4.5) {
    this.cam = cam; this.r = r;
    this.th = 0; this.ph = Math.PI / 2;
    this.vTh = 0; this.vPh = 0;
    this.dn = false; this.lx = 0; this.ly = 0;
  }
  press(x, y)  { this.dn = true; this.lx = x; this.ly = y; }
  move(x, y)   { if (!this.dn) return; this.vTh -= (x - this.lx) * .0088; this.vPh -= (y - this.ly) * .0088; this.lx = x; this.ly = y; }
  release()    { this.dn = false; }
  update(auto = true) {
    if (!this.dn && auto) this.th += .003;
    this.th += this.vTh;
    this.ph = Math.max(.06, Math.min(Math.PI - .06, this.ph + this.vPh));
    this.vTh *= .88; this.vPh *= .88;
    const sp = Math.sin(this.ph), cp = Math.cos(this.ph), st = Math.sin(this.th), ct = Math.cos(this.th);
    this.cam.position.set(this.r * sp * ct, this.r * cp, this.r * sp * st);
    this.cam.lookAt(0, 0, 0);
  }
  bind(canvas) {
    canvas.addEventListener('mousedown',  e => { e.preventDefault(); this.press(e.clientX, e.clientY); });
    canvas.addEventListener('mousemove',  e => this.move(e.clientX, e.clientY));
    canvas.addEventListener('mouseup',    () => this.release());
    canvas.addEventListener('mouseleave', () => this.release());
    canvas.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; this.press(t.clientX, t.clientY); }, { passive: false });
    canvas.addEventListener('touchmove',  e => { e.preventDefault(); const t = e.touches[0]; this.move(t.clientX, t.clientY); }, { passive: false });
    canvas.addEventListener('touchend',   () => this.release());
    canvas.style.cursor = 'grab';
    canvas.addEventListener('mousedown',  () => { canvas.style.cursor = 'grabbing'; });
    canvas.addEventListener('mouseup',    () => { canvas.style.cursor = 'grab'; });
  }
}

/* ============================================================
   SCENE HELPERS
============================================================ */
function makeOrthoScene(canvas, half = 3.6) {
  const wrap = canvas.parentElement;
  const W = wrap.clientWidth  || 400;
  const H = wrap.clientHeight || 400;
  const asp = W / H;
  const scene  = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-half * asp, half * asp, half, -half, 0.1, 50);
  camera.position.z = 10;
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  // Update camera frustum when container resizes
  new ResizeObserver(() => {
    const w = wrap.clientWidth, h = wrap.clientHeight, a = w / h;
    if (w && h) {
      camera.left = -half * a; camera.right = half * a;
      camera.updateProjectionMatrix();
    }
  }).observe(wrap);

  return { scene, camera };
}

function makePerspScene() {
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0x1A0D3D, 0.65));
  const pl1 = new THREE.PointLight(0xC49A1F, 1.4, 14); pl1.position.set(2.5, 2, 3.5); scene.add(pl1);
  const pl2 = new THREE.PointLight(0x1E3FAA, 0.5, 10); pl2.position.set(-2, -1, 2);   scene.add(pl2);
  return { scene, camera };
}

/* ============================================================
   FOL 2D SCENE
============================================================ */
class FOL2DScene {
  constructor(canvas) {
    try { this.renderer = createRenderer(canvas); }
    catch (e) { console.warn('[decomposition] FOL2DScene renderer failed:', e.message); return; }

    try {
      const { scene, camera } = makeOrthoScene(canvas, 3.6);
      this.scene = scene; this.camera = camera;
    } catch (e) { console.warn('[decomposition] FOL2DScene scene failed:', e.message); return; }

    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.circles    = [];
    this.circleMats = [];

    // Build 19 circles
    FOL_PTS.forEach(([cx, cy]) => {
      try {
        const seg = 72;
        const pts = [];
        for (let i = 0; i <= seg; i++) {
          const a = i / seg * Math.PI * 2;
          pts.push(new THREE.Vector3(cx + R * Math.cos(a), cy + R * Math.sin(a), 0));
        }
        const mat  = new THREE.LineBasicMaterial({ color: 0xC49A1F, transparent: true, opacity: 0.68, blending: THREE.AdditiveBlending });
        const mat2 = new THREE.LineBasicMaterial({ color: 0xC49A1F, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false });
        const c  = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
        const c2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x * 1.04, p.y * 1.04, 0))), mat2);
        this.group.add(c, c2);
        this.circles.push(c);
        this.circleMats.push(mat);
      } catch (e) { console.warn('[decomposition] FOL circle geometry failed:', e.message); }
    });

    // Vesica piscis overlay (hidden initially)
    try {
      const vPts = [];
      for (let i = -60; i <= 60; i += 3) { const a = i * Math.PI / 180; vPts.push(new THREE.Vector3(R * Math.cos(a), R * Math.sin(a), 0)); }
      for (let i = 120; i <= 240; i += 3) { const a = i * Math.PI / 180; vPts.push(new THREE.Vector3(R + R * Math.cos(a), R * Math.sin(a), 0)); }
      vPts.push(vPts[0].clone());
      this.vesicaMat     = new THREE.LineBasicMaterial({ color: 0xFFDE80, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
      this.vesicaGlowMat = new THREE.LineBasicMaterial({ color: 0xFFDE80, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      this.vesicaMain = new THREE.Line(new THREE.BufferGeometry().setFromPoints(vPts), this.vesicaMat);
      this.vesicaGlow = new THREE.Line(new THREE.BufferGeometry().setFromPoints(vPts.map(p => new THREE.Vector3(p.x * 1.05, p.y * 1.05, 0))), this.vesicaGlowMat);
      this.group.add(this.vesicaMain, this.vesicaGlow);
      this.vesicaHMat = new THREE.LineBasicMaterial({ color: 0xFFDE80, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
      this.vesicaH    = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(R * 0.5,  R * SQ3H, 0),
        new THREE.Vector3(R * 0.5, -R * SQ3H, 0)
      ]), this.vesicaHMat);
      this.group.add(this.vesicaH);
    } catch (e) { console.warn('[decomposition] vesica geometry failed:', e.message); }

    // Metatron lines overlay (progressive draw)
    try {
      const metVerts = [];
      MET_EDGES.forEach(([a, b]) => { metVerts.push(MET_PTS[a][0], MET_PTS[a][1], 0, MET_PTS[b][0], MET_PTS[b][1], 0); });
      this.metGeo = new THREE.BufferGeometry();
      this.metGeo.setAttribute('position', new THREE.Float32BufferAttribute(metVerts, 3));
      this.metGeo.setDrawRange(0, 0);
      this.metMat   = new THREE.LineBasicMaterial({ color: 0xC49A1F, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending });
      this.metLines = new THREE.LineSegments(this.metGeo, this.metMat);
      this.group.add(this.metLines);
    } catch (e) { console.warn('[decomposition] metatron overlay failed:', e.message); }
  }

  setState(stateKey) {
    const state = FOL_STATES[stateKey];
    if (!state) return;
    const opFn  = typeof state.circleOps    === 'function' ? state.circleOps    : i => state.circleOps[i];
    const colFn = typeof state.circleColors === 'function' ? state.circleColors : i => state.circleColors[i];
    this.circleMats.forEach((m, i) => {
      if (window.gsap) gsap.to(m, { opacity: opFn(i), duration: 0.55 });
      else m.opacity = opFn(i);
      m.color.setHex(colFn(i));
    });

    const showV = !!state.showVesica;
    if (this.vesicaMat) {
      if (window.gsap) {
        gsap.to(this.vesicaMat,     { opacity: showV ? 0.85 : 0, duration: 0.5 });
        gsap.to(this.vesicaGlowMat, { opacity: showV ? 0.20 : 0, duration: 0.5 });
        gsap.to(this.vesicaHMat,    { opacity: showV ? 0.45 : 0, duration: 0.5 });
      } else {
        this.vesicaMat.opacity     = showV ? 0.85 : 0;
        this.vesicaGlowMat.opacity = showV ? 0.20 : 0;
        this.vesicaHMat.opacity    = showV ? 0.45 : 0;
      }
    }

    if (this.metGeo && this.metMat) {
      if (state.showMetLines) {
        this.metGeo.setDrawRange(0, 0);
        if (window.gsap) gsap.to(this.metMat, { opacity: 0.50, duration: 0.3 });
        let drawn = 0;
        const total = MET_EDGES.length * 2;
        const step = () => {
          if (drawn >= total) return;
          drawn = Math.min(drawn + 4, total);
          this.metGeo.setDrawRange(0, drawn);
          setTimeout(step, 18);
        };
        setTimeout(step, 200);
      } else {
        if (window.gsap) gsap.to(this.metMat, { opacity: 0, duration: 0.4 });
        else this.metMat.opacity = 0;
        this.metGeo.setDrawRange(0, 0);
      }
    }
  }

  tick() {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.group.rotation.z += 0.0015;
    this.renderer.render(this.scene, this.camera);
  }
}

/* ============================================================
   FOL 3D SCENE -- extracted forms
============================================================ */
class FOL3DScene {
  constructor(canvas) {
    try { this.renderer = createRenderer(canvas); }
    catch (e) { console.warn('[decomposition] FOL3DScene renderer failed:', e.message); return; }

    try {
      const { scene, camera } = makePerspScene();
      this.scene = scene; this.camera = camera;
    } catch (e) { console.warn('[decomposition] FOL3DScene scene failed:', e.message); return; }

    this.orbit = new OrbitControl(this.camera, 4.5);
    this.orbit.update(false);
    this.orbit.bind(canvas);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.currentForm = 'fol';

    const wrap = canvas.parentElement;
    new ResizeObserver(() => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (w && h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    }).observe(wrap);

    try { this._buildFOL(); }
    catch (e) { console.warn('[decomposition] FOL3D initial build failed:', e.message); }
  }

  _clearGroup() { while (this.group.children.length) this.group.remove(this.group.children[0]); }

  _addGlowSphere(pos, col, r = 0.12) {
    try {
      const geo  = new THREE.SphereGeometry(r, 12, 12);
      const mat  = new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.5 });
      const m    = new THREE.Mesh(geo, mat);
      m.position.set(pos[0], pos[1], 0);
      this.group.add(m);
      const rGeo = new THREE.TorusGeometry(r * 1.6, 0.015, 6, 36);
      const rMat = new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.7, transparent: true, opacity: 0.6 });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.position.set(pos[0], pos[1], 0);
      this.group.add(ring);
    } catch (e) { console.warn('[decomposition] glow sphere failed:', e.message); }
  }

  _buildFOL() {
    this._clearGroup();
    const scale = 0.9;
    FOL_PTS.forEach(([cx, cy]) => {
      try {
        const pts = [];
        for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; pts.push(new THREE.Vector3((cx + R * Math.cos(a)) * scale, (cy + R * Math.sin(a)) * scale, 0)); }
        this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xC49A1F, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending })));
      } catch (e) { console.warn('[decomposition] FOL3D ring failed:', e.message); }
    });
    this.group.rotation.x = 0.3;
  }

  _buildSeed() {
    this._clearGroup();
    const s = 1.1;
    FOL_PTS.slice(0, 7).forEach(([cx, cy]) => {
      this._addGlowSphere([cx * s, cy * s], 0xC49A1F);
      try {
        const pts = [];
        for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; pts.push(new THREE.Vector3((cx + R * Math.cos(a)) * s, (cy + R * Math.sin(a)) * s, 0)); }
        this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xC49A1F, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending })));
      } catch (e) { console.warn('[decomposition] seed ring failed:', e.message); }
    });
  }

  _buildFruit() {
    this._clearGroup();
    const s = 0.8;
    FRUIT_IDX.forEach(i => {
      const [cx, cy] = FOL_PTS[i];
      this._addGlowSphere([cx * s, cy * s], 0xC49A1F, 0.1);
      try {
        const pts = [];
        for (let j = 0; j <= 60; j++) { const a = j / 60 * Math.PI * 2; pts.push(new THREE.Vector3((cx + R * Math.cos(a)) * s, (cy + R * Math.sin(a)) * s, 0)); }
        this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xC49A1F, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending })));
      } catch (e) { console.warn('[decomposition] fruit ring failed:', e.message); }
    });
  }

  _buildVesica() {
    this._clearGroup();
    try {
      const matA = new THREE.MeshPhongMaterial({ color: 0xC49A1F, emissive: 0xC49A1F, emissiveIntensity: 0.08, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
      const matB = new THREE.MeshPhongMaterial({ color: 0x9B7BE0, emissive: 0x9B7BE0, emissiveIntensity: 0.08, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
      const sGeo = new THREE.SphereGeometry(1.8, 24, 24);
      const sA = new THREE.Mesh(sGeo, matA); sA.position.x = -0.9;
      const sB = new THREE.Mesh(sGeo, matB); sB.position.x =  0.9;
      this.group.add(sA, sB);

      [[-0.9, 0xC49A1F], [0.9, 0x9B7BE0]].forEach(([ox, col]) => {
        [[1, 0.7], [1.04, 0.15]].forEach(([sc, op]) => {
          try {
            const pts = [];
            for (let i = 0; i <= 80; i++) { const a = i / 80 * Math.PI * 2; pts.push(new THREE.Vector3(ox + 1.8 * sc * Math.cos(a), 1.8 * sc * Math.sin(a), 0)); }
            this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending })));
          } catch (e) { console.warn('[decomposition] vesica circle failed:', e.message); }
        });
      });

      const vPts = [];
      for (let i = -60; i <= 60; i += 3) { const a = i * Math.PI / 180; vPts.push(new THREE.Vector3(-0.9 + 1.8 * Math.cos(a), 1.8 * Math.sin(a), 0)); }
      for (let i = 120; i <= 240; i += 3) { const a = i * Math.PI / 180; vPts.push(new THREE.Vector3(0.9 + 1.8 * Math.cos(a), 1.8 * Math.sin(a), 0)); }
      vPts.push(vPts[0].clone());
      [[1, 0.9], [1.04, 0.2]].forEach(([sc, op]) => {
        try {
          const sp = vPts.map(p => new THREE.Vector3(p.x * sc, p.y * sc, 0));
          this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(sp), new THREE.LineBasicMaterial({ color: 0xFFDE80, transparent: true, opacity: op, blending: THREE.AdditiveBlending })));
        } catch (e) { console.warn('[decomposition] vesica lens failed:', e.message); }
      });
    } catch (e) { console.warn('[decomposition] vesica build failed:', e.message); }
    this.group.rotation.x = 0.2;
  }

  _buildMetatron() {
    this._clearGroup();
    const sc = 0.82;
    MET_PTS.forEach(([cx, cy]) => {
      try {
        const pts = [];
        for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; pts.push(new THREE.Vector3((cx + R * Math.cos(a)) * sc, (cy + R * Math.sin(a)) * sc, 0)); }
        this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xC49A1F, transparent: true, opacity: 0.30, blending: THREE.AdditiveBlending })));
      } catch (e) { console.warn('[decomposition] metatron 3D ring failed:', e.message); }
    });
    try {
      const verts = [];
      MET_EDGES.forEach(([a, b]) => { verts.push(MET_PTS[a][0] * sc, MET_PTS[a][1] * sc, 0, MET_PTS[b][0] * sc, MET_PTS[b][1] * sc, 0); });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      this.group.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xC49A1F, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })));
    } catch (e) { console.warn('[decomposition] metatron 3D lines failed:', e.message); }
    this.group.rotation.x = 0.3;
  }

  setForm(formKey) {
    if (this.currentForm === formKey) return;
    this.currentForm = formKey;
    if (window.gsap) {
      gsap.to(this.group.scale, { x: 0, y: 0, z: 0, duration: 0.3, ease: 'power2.in', onComplete: () => {
        try { this._buildFor(formKey); } catch (e) { console.warn('[decomposition] FOL3D setForm failed:', e.message); }
        gsap.fromTo(this.group.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.5)' });
      }});
    } else {
      try { this._buildFor(formKey); } catch (e) { console.warn('[decomposition] FOL3D setForm failed:', e.message); }
    }
  }

  _buildFor(k) {
    if      (k === 'fol')      this._buildFOL();
    else if (k === 'seed')     this._buildSeed();
    else if (k === 'fruit')    this._buildFruit();
    else if (k === 'vesica')   this._buildVesica();
    else if (k === 'metatron') this._buildMetatron();
  }

  tick() {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.orbit.update(!this.orbit.dn);
    this.group.rotation.y += 0.006;
    this.group.rotation.x += 0.002;
    this.renderer.render(this.scene, this.camera);
  }
}

/* ============================================================
   METATRON 2D SCENE -- edge highlight system
============================================================ */
class Met2DScene {
  constructor(canvas) {
    try { this.renderer = createRenderer(canvas); }
    catch (e) { console.warn('[decomposition] Met2DScene renderer failed:', e.message); return; }

    try {
      const { scene, camera } = makeOrthoScene(canvas, 3.6);
      this.scene = scene; this.camera = camera;
    } catch (e) { console.warn('[decomposition] Met2DScene scene failed:', e.message); return; }

    this.group    = new THREE.Group();
    this.scene.add(this.group);
    this.circMats = [];

    // 13 circles (dim background)
    MET_PTS.forEach(([cx, cy]) => {
      try {
        const seg = 60;
        const pts = [];
        for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; pts.push(new THREE.Vector3(cx + R * Math.cos(a), cy + R * Math.sin(a), 0)); }
        const mat = new THREE.LineBasicMaterial({ color: 0xC49A1F, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending });
        this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
        this.circMats.push(mat);
      } catch (e) { console.warn('[decomposition] Met2D circle failed:', e.message); }
    });

    // All 78 lines (very dim background)
    try {
      const bgV = [];
      MET_EDGES.forEach(([a, b]) => { bgV.push(MET_PTS[a][0], MET_PTS[a][1], 0, MET_PTS[b][0], MET_PTS[b][1], 0); });
      const bgGeo = new THREE.BufferGeometry();
      bgGeo.setAttribute('position', new THREE.Float32BufferAttribute(bgV, 3));
      this.bgMat = new THREE.LineBasicMaterial({ color: 0xC49A1F, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending });
      this.group.add(new THREE.LineSegments(bgGeo, this.bgMat));
    } catch (e) { console.warn('[decomposition] Met2D bg lines failed:', e.message); }

    // Highlight overlays (empty until a solid is selected)
    this.hl1 = this._makeHL();
    this.hl2 = this._makeHL();
    this.group.add(this.hl1, this.hl2);
  }

  _makeHL() {
    try {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
      geo.setDrawRange(0, 0);
      const mat = new THREE.LineBasicMaterial({ color: 0xC49A1F, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
      return new THREE.LineSegments(geo, mat);
    } catch (e) { console.warn('[decomposition] Met2D HL create failed:', e.message); return new THREE.Object3D(); }
  }

  _buildEdgesGeo(edgePairs) {
    const v = [];
    edgePairs.forEach(([a, b]) => { v.push(MET_PTS[a][0], MET_PTS[a][1], 0, MET_PTS[b][0], MET_PTS[b][1], 0); });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geo.setDrawRange(0, 0);
    return geo;
  }

  selectSolid(solidKey) {
    const def = SOLIDS[solidKey];
    if (!def) return;
    const { edges1, edges2, col1, col2, vertHighlight } = def;

    if (this.bgMat) {
      if (window.gsap) gsap.to(this.bgMat, { opacity: 0.04, duration: 0.35 });
      else this.bgMat.opacity = 0.04;
    }

    this.circMats.forEach((m, i) => {
      const on = vertHighlight.includes(i);
      if (window.gsap) gsap.to(m, { opacity: on ? 0.55 : 0.14, duration: 0.4 });
      else m.opacity = on ? 0.55 : 0.14;
      if (on) m.color.setHex(col1);
    });

    try {
      const geo1 = this._buildEdgesGeo(edges1);
      this.hl1.geometry.dispose();
      this.hl1.geometry = geo1;
      this.hl1.material.color.setHex(col1);
      if (window.gsap) {
        gsap.to(this.hl1.material, { opacity: 0, duration: 0.2, onComplete: () => {
          this.hl1.material.opacity = 0;
          const total = edges1.length * 2; let drawn = 0;
          const step = () => { if (drawn >= total) return; drawn = Math.min(drawn + 2, total); geo1.setDrawRange(0, drawn); setTimeout(step, 35); };
          step();
          gsap.to(this.hl1.material, { opacity: 0.88, duration: 0.3 });
        }});
      } else { geo1.setDrawRange(0, edges1.length * 2); this.hl1.material.opacity = 0.88; }
    } catch (e) { console.warn('[decomposition] Met2D hl1 failed:', e.message); }

    try {
      const geo2 = this._buildEdgesGeo(edges2 || []);
      this.hl2.geometry.dispose();
      this.hl2.geometry = geo2;
      if (edges2 && edges2.length) {
        this.hl2.material.color.setHex(col2 || col1);
        if (window.gsap) {
          gsap.to(this.hl2.material, { opacity: 0, duration: 0.2, onComplete: () => {
            const total = edges2.length * 2; let drawn = 0;
            const step = () => { if (drawn >= total) return; drawn = Math.min(drawn + 2, total); geo2.setDrawRange(0, drawn); setTimeout(step, 50); };
            setTimeout(step, 120);
            gsap.to(this.hl2.material, { opacity: 0.80, duration: 0.3, delay: 0.1 });
          }});
        } else { geo2.setDrawRange(0, edges2.length * 2); this.hl2.material.opacity = 0.80; }
      } else {
        this.hl2.material.opacity = 0;
      }
    } catch (e) { console.warn('[decomposition] Met2D hl2 failed:', e.message); }
  }

  tick() {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.group.rotation.z += 0.0008;
    this.renderer.render(this.scene, this.camera);
  }
}

/* ============================================================
   METATRON 3D SOLID SCENE
============================================================ */
class Met3DScene {
  constructor(canvas) {
    try { this.renderer = createRenderer(canvas); }
    catch (e) { console.warn('[decomposition] Met3DScene renderer failed:', e.message); return; }

    try {
      const { scene, camera } = makePerspScene();
      this.scene = scene; this.camera = camera;
    } catch (e) { console.warn('[decomposition] Met3DScene scene failed:', e.message); return; }

    this.orbit = new OrbitControl(this.camera, 5);
    this.orbit.update(false);
    this.orbit.bind(canvas);

    const wrap = canvas.parentElement;
    new ResizeObserver(() => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (w && h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    }).observe(wrap);

    // Faint Metatron background plane
    try {
      const sc = 1.3;
      const bgV = [];
      MET_EDGES.forEach(([a, b]) => { bgV.push(MET_PTS[a][0] * sc, MET_PTS[a][1] * sc, -1.6, MET_PTS[b][0] * sc, MET_PTS[b][1] * sc, -1.6); });
      const bgGeo = new THREE.BufferGeometry();
      bgGeo.setAttribute('position', new THREE.Float32BufferAttribute(bgV, 3));
      this.scene.add(new THREE.LineSegments(bgGeo, new THREE.LineBasicMaterial({ color: 0xC49A1F, transparent: true, opacity: 0.055, blending: THREE.AdditiveBlending })));
      MET_PTS.forEach(([cx, cy]) => {
        try {
          const pts = [];
          for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; pts.push(new THREE.Vector3(cx * sc + R * sc * Math.cos(a), cy * sc + R * sc * Math.sin(a), -1.6)); }
          this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xC49A1F, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending })));
        } catch (e) { console.warn('[decomposition] Met3D bg circle failed:', e.message); }
      });
    } catch (e) { console.warn('[decomposition] Met3D bg failed:', e.message); }

    this.solidGroup  = new THREE.Group();
    this.scene.add(this.solidGroup);
    this._tet2        = null;
  }

  _clear() { while (this.solidGroup.children.length) this.solidGroup.remove(this.solidGroup.children[0]); }

  _buildMerkaba() {
    try {
      const geo = new THREE.TetrahedronGeometry(1.55, 0);
      const mk  = (hexColor, ry = 0, rx = 0) => {
        const g   = new THREE.Group();
        const col = parseInt(hexColor.replace('#', ''), 16);
        g.add(new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.12, transparent: true, opacity: 0.12, side: THREE.DoubleSide })));
        g.add(buildGlowEdge(geo, hexColor));
        g.rotation.x = rx; g.rotation.y = ry;
        return g;
      };
      this.solidGroup.add(mk('#C49A1F'));
      const t2 = mk('#9B7BE0', Math.PI / 3, Math.PI);
      this.solidGroup.add(t2);
      this._tet2 = t2;
    } catch (e) { console.warn('[decomposition] Merkaba build failed:', e.message); }
  }

  _buildSolid(geoFn, hexColor) {
    try {
      const geo = geoFn();
      const col = parseInt(hexColor.replace('#', ''), 16);
      this.solidGroup.add(new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.13, transparent: true, opacity: 0.13, side: THREE.DoubleSide })));
      this.solidGroup.add(buildGlowEdge(geo, hexColor));
    } catch (e) { console.warn('[decomposition] solid build failed:', e.message); }
  }

  setSolid(solidKey) {
    const def = SOLIDS[solidKey];
    if (!def) return;
    this._tet2 = null;
    if (window.gsap) {
      gsap.to(this.solidGroup.scale, { x: 0, y: 0, z: 0, duration: 0.28, ease: 'power2.in', onComplete: () => {
        this._clear(); this._doBuild(def);
        gsap.fromTo(this.solidGroup.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, duration: 0.55, ease: 'back.out(1.8)' });
      }});
    } else { this._clear(); this._doBuild(def); }
  }

  _doBuild(def) {
    if      (def.geo === 'merkaba')      this._buildMerkaba();
    else if (def.geo === 'cube')         this._buildSolid(() => new THREE.BoxGeometry(2.1, 2.1, 2.1),     '#2D8050');
    else if (def.geo === 'octahedron')   this._buildSolid(() => new THREE.OctahedronGeometry(1.52, 0),     '#3B5FC8');
    else if (def.geo === 'icosahedron')  this._buildSolid(() => new THREE.IcosahedronGeometry(1.42, 0),    '#20A8C8');
    else if (def.geo === 'dodecahedron') this._buildSolid(() => new THREE.DodecahedronGeometry(1.36, 0),   '#9B7BE0');
  }

  tick() {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.orbit.update(!this.orbit.dn);
    this.solidGroup.rotation.x += 0.005;
    this.solidGroup.rotation.y += 0.008;
    if (this._tet2) this._tet2.rotation.y += 0.013;
    this.renderer.render(this.scene, this.camera);
  }
}

/* ============================================================
   GLOBAL TICK LOOP (module-scoped, started once)
============================================================ */
const _scenes = new Set();
let _tickRunning = false;

function _startTick() {
  if (_tickRunning) return;
  _tickRunning = true;
  let t = 0;
  const loop = () => {
    requestAnimationFrame(loop);
    t += 0.005;
    _scenes.forEach(s => s.tick(t));
  };
  loop();
}

/* ============================================================
   UI INTERACTION
============================================================ */
let fol2D, fol3D, met2D, met3D;
let currentFolState = 'fol';

const FOL_BTN_ORDER = [
  ['fol',      'Flower of Life'],
  ['seed',     'Seed of Life'],
  ['fruit',    'Fruit of Life'],
  ['vesica',   'Vesica Piscis'],
  ['metatron', "Metatron's Cube"]
];

function buildFOLButtons() {
  const strip = document.getElementById('dec-folButtons');
  if (!strip) return;
  FOL_BTN_ORDER.forEach(([key, label]) => {
    const btn = document.createElement('button');
    btn.className   = 'dec-state-btn' + (key === 'fol' ? ' on' : '');
    btn.textContent = label;
    btn.dataset.key = key;
    btn.addEventListener('click', () => selectFOLState(key));
    strip.appendChild(btn);
  });
}

function selectFOLState(key) {
  if (currentFolState === key) return;
  currentFolState = key;
  document.querySelectorAll('#dec-folButtons .dec-state-btn').forEach(b => b.classList.toggle('on', b.dataset.key === key));
  if (fol2D) fol2D.setState(key);
  const state = FOL_STATES[key];
  if (fol3D) fol3D.setForm(state.form3D);
  updateFOLInfo(state);
  updatePathStrip(state.pathKey);
}

function updateFOLInfo(state) {
  const ip = document.getElementById('dec-folInfo');
  if (!ip) return;
  if (window.gsap) {
    gsap.to(ip, { opacity: 0, duration: 0.2, onComplete: () => { _setFOLInfo(state); gsap.to(ip, { opacity: 1, duration: 0.35 }); }});
  } else { _setFOLInfo(state); }
}

function _setFOLInfo(s) {
  const t = document.getElementById('dec-fol-ip-title'); if (t) t.textContent = s.title;
  const el = document.getElementById('dec-fol-ip-el');
  if (el) {
    el.textContent    = s.elLabel;
    el.style.color    = s.elCol;
    el.style.borderColor = s.elBg.replace('.08)', '.3)');
    el.style.background  = s.elBg;
  }
  const f = document.getElementById('dec-fol-ip-facts'); if (f) f.textContent = s.facts;
  const d = document.getElementById('dec-fol-ip-desc');  if (d) d.textContent = s.desc;
  const c = document.getElementById('dec-fol-ip-cf');    if (c) c.textContent = s.cf;
}

function updatePathStrip(activeKey) {
  ['dec-pn-fol', 'dec-pn-seed', 'dec-pn-fruit', 'dec-pn-met', 'dec-pn-solid'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', id === activeKey);
  });
}

function buildSolidButtons() {
  const strip = document.getElementById('dec-solidButtons');
  if (!strip) return;
  const order = [
    ['merkaba',      'Star Tetrahedron', '#C49A1F'],
    ['cube',         'Hexahedron (Cube)', '#2D8050'],
    ['octahedron',   'Octahedron',        '#3B5FC8'],
    ['icosahedron',  'Icosahedron',       '#20A8C8'],
    ['dodecahedron', 'Dodecahedron',      '#9B7BE0'],
  ];
  order.forEach(([key, label, col]) => {
    const btn = document.createElement('button');
    btn.className   = 'dec-solid-btn';
    btn.textContent = label;
    btn.dataset.key = key;
    btn.style.setProperty('--c', col);
    btn.addEventListener('click', () => selectSolid(key));
    strip.appendChild(btn);
  });
}

function selectSolid(key) {
  document.querySelectorAll('#dec-solidButtons .dec-solid-btn').forEach(b => {
    const on = b.dataset.key === key;
    b.classList.toggle('on', on);
    if (on) {
      const def = SOLIDS[key];
      b.style.borderColor = def.ecol + '99';
      b.style.color       = def.ecol;
      b.style.background  = def.ebg;
    } else {
      b.style.borderColor = '';
      b.style.color       = '';
      b.style.background  = '';
    }
  });
  if (met2D) met2D.selectSolid(key);
  if (met3D) met3D.setSolid(key);
  updateSolidInfo(SOLIDS[key]);
  const pnSolid = document.getElementById('dec-pn-solid');
  if (pnSolid) pnSolid.classList.add('active');
}

function updateSolidInfo(def) {
  const ip = document.getElementById('dec-solidInfo');
  if (!ip) return;
  if (window.gsap) {
    gsap.to(ip, { opacity: 0, duration: 0.2, onComplete: () => { _setSolidInfo(def); gsap.to(ip, { opacity: 1, duration: 0.35 }); }});
  } else { _setSolidInfo(def); }
}

function _setSolidInfo(def) {
  const t = document.getElementById('dec-met-ip-title');
  if (t) t.textContent = def.name;

  const ipHead = document.querySelector('#dec-solidInfo .dec-ip-head');
  if (ipHead) {
    let el = document.getElementById('dec-met-ip-el');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dec-met-ip-el'; el.className = 'dec-ip-el';
      ipHead.appendChild(el);
    }
    el.textContent       = def.element;
    el.style.color       = def.ecol;
    el.style.borderColor = def.ecol + '55';
    el.style.background  = def.ebg;
  }

  let facts = document.getElementById('dec-met-ip-facts');
  if (!facts) {
    facts = document.createElement('div');
    facts.id = 'dec-met-ip-facts'; facts.className = 'dec-ip-facts';
    const title = document.getElementById('dec-met-ip-title');
    if (title) title.after(facts);
  }
  facts.textContent = def.facts;

  const d = document.getElementById('dec-met-ip-desc');
  if (d) d.textContent = def.desc;

  let cf = document.getElementById('dec-met-ip-cf');
  if (!cf) {
    cf = document.createElement('div');
    cf.id = 'dec-met-ip-cf'; cf.className = 'dec-ip-cf';
    const desc = document.getElementById('dec-met-ip-desc');
    if (desc) desc.after(cf);
  }
  cf.textContent = def.cf;
}

/* ============================================================
   SCENE INIT
============================================================ */
function _initScenes() {
  buildFOLButtons();
  buildSolidButtons();
  updatePathStrip('dec-pn-fol');

  const _decFol2D = document.getElementById('dec-fol2D');
  if (_decFol2D) _decFol2D.setAttribute('aria-label', 'Sacred geometry decomposition canvas');
  try { fol2D = new FOL2DScene(_decFol2D); _scenes.add(fol2D); }
  catch (e) { console.warn('[decomposition] fol2D init failed:', e.message); }

  const _decFol3D = document.getElementById('dec-fol3D');
  if (_decFol3D) _decFol3D.setAttribute('aria-label', 'Sacred geometry decomposition canvas');
  try { fol3D = new FOL3DScene(_decFol3D); _scenes.add(fol3D); }
  catch (e) { console.warn('[decomposition] fol3D init failed:', e.message); }

  const _decMet2D = document.getElementById('dec-met2D');
  if (_decMet2D) _decMet2D.setAttribute('aria-label', 'Sacred geometry decomposition canvas');
  try { met2D = new Met2DScene(_decMet2D); _scenes.add(met2D); }
  catch (e) { console.warn('[decomposition] met2D init failed:', e.message); }

  const _decMet3D = document.getElementById('dec-met3D');
  if (_decMet3D) _decMet3D.setAttribute('aria-label', 'Sacred geometry decomposition canvas');
  try { met3D = new Met3DScene(_decMet3D); _scenes.add(met3D); }
  catch (e) { console.warn('[decomposition] met3D init failed:', e.message); }

  _startTick();

  if (window.gsap) {
    gsap.from('.dec-eyebrow',    { opacity: 0, y: -8,  duration: 0.7, ease: 'power2.out' });
    gsap.from('.dec-title',      { opacity: 0, y:  24, duration: 0.9, ease: 'power3.out', delay: 0.1 });
    gsap.from('.dec-sub',        { opacity: 0, y:  16, duration: 0.8, ease: 'power2.out', delay: 0.3 });
    gsap.from('.dec-path-strip', { opacity: 0, y:  10, duration: 0.6, delay: 0.6 });
  }
}
