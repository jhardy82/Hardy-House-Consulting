/**
 * tree.js -- Tree of Life section module.
 * Built from _docs/next-steps-research.html spec.
 *
 * Two tabs inside the #tree section:
 *   Tab 1 -- Kabbalistic Tree of Life (10 Sephiroth, 22 paths)
 *   Tab 2 -- ContextForge Agent Graph (custom Verlet spring solver)
 *
 * Tree of Life / ContextForge mapping (from research):
 *   Middle Pillar  (Kether -> Tiphareth -> Yesod -> Malkuth) = Apex coordination chain
 *   Pillar of Mercy (right, Chokmah -> Chesed -> Netzach)    = Expansion agents
 *   Pillar of Severity (left, Binah -> Geburah -> Hod)       = Constraint agents
 *   Tiphareth (centre)                                        = QSE integration node
 *   Yesod (foundation)                                        = UCL context/memory store
 *   Malkuth (kingdom)                                         = Execution / delivery layer
 *
 * Exports a single idempotent init() function.
 * THREE and gsap are window globals -- never import them.
 */

import { createRenderer } from '../utils/createRenderer.js';

/* ============================================================
   IDEMPOTENCY GUARD
============================================================ */
let initialised = false;

/* ============================================================
   MODULE-LEVEL STATE
============================================================ */
let _treeRenderer    = null;
let _treeScene       = null;
let _treeCamera      = null;
let _treeRAF         = null;
let _graphRenderer   = null;
let _graphScene      = null;
let _graphCamera     = null;
let _graphRAF        = null;
let _nodeMeshes      = null;   // Tree of Life sphere meshes keyed by sephirah id
let _pathLines       = [];     // Tree of Life path line objects
let _selectedSeph    = null;   // Currently selected sephirah id
let _fourWorldsOn    = false;  // Four Worlds overlay toggle state
let _worldZones      = [];     // THREE.Mesh planes for Four Worlds overlay
let _graphNodes      = [];     // Agent graph simulation node state
let _graphNodeMeshes = [];     // THREE.Mesh spheres for agent graph
let _graphLineMeshes = [];     // THREE.Line objects for agent graph edges
let _batonParticles  = [];     // Active baton pulse particles
let _orbitTheta      = 0;      // Auto-orbit angle for tree scene
let _graphOrbitTheta = 0;      // Auto-orbit angle for graph scene

/* ============================================================
   SACRED GEOMETRY CONSTANTS
   Sephiroth positions normalised to [-1, 1] range (x, y).
   Source: research spec (next-steps-research.html, section 02).
   These are hardcoded facts -- no algorithmic construction.
============================================================ */
const SEPHIROTH = [
  { id: 'kether',    x:  0,   y:  1.00, label: 'Crown',         cf: 'Strategic Vision',   pillar: 'middle'   },
  { id: 'chokmah',   x:  1,   y:  0.75, label: 'Wisdom',        cf: 'Insight Agent',      pillar: 'mercy'    },
  { id: 'binah',     x: -1,   y:  0.75, label: 'Understanding', cf: 'Structure Agent',    pillar: 'severity' },
  { id: 'chesed',    x:  1,   y:  0.35, label: 'Mercy',         cf: 'Scale Agent',        pillar: 'mercy'    },
  { id: 'geburah',   x: -1,   y:  0.35, label: 'Severity',      cf: 'Enforcement Agent',  pillar: 'severity' },
  { id: 'tiphareth', x:  0,   y:  0.05, label: 'Beauty',        cf: 'QSE Integration',    pillar: 'middle'   },
  { id: 'netzach',   x:  1,   y: -0.30, label: 'Victory',       cf: 'Creative Output',    pillar: 'mercy'    },
  { id: 'hod',       x: -1,   y: -0.30, label: 'Splendour',     cf: 'Analysis Agent',     pillar: 'severity' },
  { id: 'yesod',     x:  0,   y: -0.60, label: 'Foundation',    cf: 'UCL Context Store',  pillar: 'middle'   },
  { id: 'malkuth',   x:  0,   y: -1.00, label: 'Kingdom',       cf: 'Execution Layer',    pillar: 'middle'   },
];

/**
 * 22 Paths of the Tree of Life.
 * Each entry is [fromId, toId]. Count = 22 (sacred invariant).
 * Traditional Kabbalistic numbering.
 */
const PATHS_22 = [
  ['kether',    'chokmah'],    // 11
  ['kether',    'binah'],      // 12
  ['kether',    'tiphareth'],  // 13 -- Middle Pillar descent
  ['chokmah',   'binah'],      // 14
  ['chokmah',   'tiphareth'],  // 15
  ['chokmah',   'chesed'],     // 16
  ['binah',     'tiphareth'],  // 17
  ['binah',     'geburah'],    // 18
  ['chesed',    'geburah'],    // 19
  ['chesed',    'tiphareth'],  // 20
  ['chesed',    'netzach'],    // 21
  ['geburah',   'tiphareth'],  // 22
  ['geburah',   'hod'],        // 23
  ['tiphareth', 'netzach'],    // 24
  ['tiphareth', 'hod'],        // 25
  ['tiphareth', 'yesod'],      // 26 -- Middle Pillar descent
  ['netzach',   'hod'],        // 27
  ['netzach',   'yesod'],      // 28
  ['netzach',   'malkuth'],    // 29
  ['hod',       'yesod'],      // 30
  ['hod',       'malkuth'],    // 31
  ['yesod',     'malkuth'],    // 32 -- Middle Pillar base
];
// PATHS_22.length === 22 -- verified

/**
 * Four Worlds zones (horizontal bands across the tree).
 * Atziluth = strategic, Beriah = architectural,
 * Yetzirah = operational, Assiah = physical delivery.
 * yMin/yMax in normalised Sephiroth space.
 */
const FOUR_WORLDS = [
  { id: 'atziluth', label: 'Atziluth',  cf: 'Strategy',      yMin:  0.82, yMax:  1.15, colorHex: 0x2E1760 },
  { id: 'beriah',   label: 'Beriah',    cf: 'Architecture',  yMin:  0.55, yMax:  0.82, colorHex: 0x1E3FAA },
  { id: 'yetzirah', label: 'Yetzirah',  cf: 'Operations',    yMin: -0.45, yMax:  0.55, colorHex: 0x1B5E35 },
  { id: 'assiah',   label: 'Assiah',    cf: 'Delivery',      yMin: -1.15, yMax: -0.45, colorHex: 0x5B1A00 },
];

/* ============================================================
   PILLAR COLOURS
   Structural constants -- not element accent colours.
   Middle Pillar: gold (coordination chain)
   Mercy (right): royal blue (expansion)
   Severity (left): aether violet (constraint)
============================================================ */
const PILLAR_COLOR = {
  middle:   0xC49A1F,
  mercy:    0x3B5FC8,
  severity: 0x9B7BE0,
};

const SPHERE_BASE_COLOR = 0x2E1760;
const PATH_BASE_COLOR   = 0x4A3280;

/* ============================================================
   ELEMENT -> ACCENT COLOUR MAP
   Mirrors the CLAUDE.md element accent system.
============================================================ */
const ELEMENT_COLOR = {
  fire:   0xC49A1F,
  earth:  0x2D8050,
  air:    0x3B5FC8,
  water:  0x20A8C8,
  aether: 0x9B7BE0,
};

/** Which Sephirah is highlighted per element.
 * <UNKNOWN: no canonical ContextForge-to-Sephirah spec; mapping uses structural logic.>
 * fire   -> kether    (initiation / crown)
 * earth  -> malkuth   (grounded / delivery)
 * air    -> tiphareth (orchestration / beauty / integration)
 * water  -> yesod     (foundation / flow / memory)
 * aether -> kether    (unity / framework)
 */
const ELEMENT_SEPH = {
  fire:   'kether',
  earth:  'malkuth',
  air:    'tiphareth',
  water:  'yesod',
  aether: 'kether',
};

/* ============================================================
   AGENT GRAPH CONSTANTS
   6 nodes: 1 apex + 5 Pentagon agents.
   Physics: custom Verlet spring solver.
============================================================ */
const AGENT_DEFS = [
  { id: 'apex',     label: 'Apex',     role: 'Strategic Apex',       color: 0xC49A1F },
  { id: 'miner',    label: 'Miner',    role: 'Context Miner',        color: 0x3B5FC8 },
  { id: 'builder',  label: 'Builder',  role: 'Implementation Agent', color: 0x2D8050 },
  { id: 'attacker', label: 'Attacker', role: 'Adversarial Reviewer', color: 0xE05C20 },
  { id: 'arbiter',  label: 'Arbiter',  role: 'Decision Arbiter',     color: 0x9B7BE0 },
  { id: 'delivery', label: 'Delivery', role: 'Execution Agent',      color: 0x20A8C8 },
];

const AGENT_EDGES = [
  { a: 0, b: 1 }, { a: 0, b: 2 }, { a: 0, b: 3 }, { a: 0, b: 4 }, { a: 0, b: 5 },
  { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 4 }, { a: 4, b: 5 }, { a: 5, b: 1 },
];

const SPRING_REST   = 1.6;
const SPRING_K      = 0.04;
const REPULSE_FORCE = 1.8;
const DAMPEN        = 0.88;

/* ============================================================
   UTILITY HELPERS
============================================================ */

function currentElement() {
  return document.documentElement.dataset.element || null;
}

function accentColorInt() {
  return ELEMENT_COLOR[currentElement()] || 0xC49A1F;
}

function sephById(id) {
  return SEPHIROTH.find(s => s.id === id);
}

const TREE_SCALE = 2.2;
function treePos(s) {
  return new THREE.Vector3(s.x * TREE_SCALE, s.y * TREE_SCALE, 0);
}

/* ============================================================
   GLOW LAYERS -- exact 4-layer spec from CLAUDE.md
============================================================ */
function buildNodeGlow(geo, col, parent) {
  [[1.000, 0.88], [1.022, 0.27], [1.058, 0.10], [1.105, 0.04]]
    .forEach(([scale, opacity]) => {
      try {
        const mat = new THREE.LineBasicMaterial({
          color: col, transparent: true, opacity,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const ls = new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
        ls.scale.setScalar(scale);
        parent.add(ls);
      } catch (e) { console.warn('[tree] Glow layer failed:', e); }
    });
}

/* ============================================================
   TREE OF LIFE -- THREE.JS SCENE
============================================================ */

function buildTreeScene(canvas) {
  let renderer, scene, camera;
  try { renderer = createRenderer(canvas); } catch (e) { console.error('[tree] createRenderer failed:', e); return null; }

  const w = canvas.parentElement.clientWidth  || 400;
  const h = canvas.parentElement.clientHeight || 440;

  try { scene  = new THREE.Scene(); }                                                     catch (e) { console.error('[tree] Scene:', e); return null; }
  try { camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100); }                     catch (e) { console.error('[tree] Camera:', e); return null; }

  camera.position.set(0, 0, 9);
  camera.lookAt(0, 0, 0);

  try {
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const pt = new THREE.PointLight(0xC49A1F, 1.2, 30);
    pt.position.set(0, 3, 6);
    scene.add(pt);
  } catch (e) { console.warn('[tree] Lights:', e); }

  return { renderer, scene, camera };
}

function buildSephiroth(scene) {
  const meshes = {};

  SEPHIROTH.forEach(s => {
    const group = new THREE.Group();
    group.position.copy(treePos(s));
    group.userData = { sephId: s.id };

    let sphereGeo;
    try {
      sphereGeo = new THREE.SphereGeometry(0.22, 24, 24);
      const sphereMat = new THREE.MeshPhongMaterial({
        color:             SPHERE_BASE_COLOR,
        emissive:          PILLAR_COLOR[s.pillar],
        emissiveIntensity: 0.35,
        transparent:       true,
        opacity:           0.92,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      group.add(sphere);
      buildNodeGlow(sphereGeo, PILLAR_COLOR[s.pillar], group);
      scene.add(group);
      meshes[s.id] = { group, sphere, sphereMat, sphereGeo };
    } catch (e) { console.error('[tree] Sephirah mesh failed:', s.id, e); }
  });

  return meshes;
}

function buildPaths(scene) {
  const lines = [];

  PATHS_22.forEach(([aId, bId]) => {
    const sa = sephById(aId);
    const sb = sephById(bId);
    if (!sa || !sb) return;

    try {
      const geo = new THREE.BufferGeometry().setFromPoints([treePos(sa), treePos(sb)]);
      const mat = new THREE.LineBasicMaterial({
        color:       PATH_BASE_COLOR,
        transparent: true,
        opacity:     0.45,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false,
      });
      const line = new THREE.Line(geo, mat);
      scene.add(line);
      lines.push({ line, mat, aId, bId });
    } catch (e) { console.warn('[tree] Path line failed:', e); }
  });

  return lines;
}

function buildWorldZones(scene) {
  const zones = [];

  FOUR_WORLDS.forEach(w => {
    try {
      const height = (w.yMax - w.yMin) * TREE_SCALE;
      const geo  = new THREE.PlaneGeometry(TREE_SCALE * 2.8, height);
      const mat  = new THREE.MeshBasicMaterial({
        color:       w.colorHex,
        transparent: true,
        opacity:     0.12,
        side:        THREE.DoubleSide,
        depthWrite:  false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, ((w.yMin + w.yMax) / 2) * TREE_SCALE, -0.5);
      mesh.visible = false;
      scene.add(mesh);
      zones.push({ mesh, mat, world: w });
    } catch (e) { console.warn('[tree] World zone failed:', e); }
  });

  return zones;
}

function applyElementHighlight(nodeMeshes) {
  if (!nodeMeshes) return;
  const accent   = accentColorInt();
  const targetId = ELEMENT_SEPH[currentElement()] || null;

  SEPHIROTH.forEach(s => {
    const m = nodeMeshes[s.id];
    if (!m || !m.sphereMat) return;
    if (s.id === targetId) {
      m.sphereMat.emissive.setHex(accent);
      m.sphereMat.emissiveIntensity = 0.85;
    } else {
      m.sphereMat.emissive.setHex(PILLAR_COLOR[s.pillar]);
      m.sphereMat.emissiveIntensity = 0.35;
    }
  });
}

function selectSephirah(id, nodeMeshes, infoPanel) {
  // Deselect previous
  if (_selectedSeph && nodeMeshes[_selectedSeph]) {
    const prev = nodeMeshes[_selectedSeph];
    if (prev.sphereMat) {
      const ps = sephById(_selectedSeph);
      prev.sphereMat.emissive.setHex(PILLAR_COLOR[ps.pillar]);
      prev.sphereMat.emissiveIntensity = 0.35;
    }
  }

  _selectedSeph = id;
  const s = sephById(id);
  if (!s) return;

  const m = nodeMeshes[id];
  if (m && m.sphereMat) {
    m.sphereMat.emissive.setHex(accentColorInt());
    m.sphereMat.emissiveIntensity = 1.0;
  }

  _pathLines.forEach(({ mat, aId, bId }) => {
    if (aId === id || bId === id) {
      mat.color.setHex(accentColorInt());
      mat.opacity = 0.9;
    } else {
      mat.color.setHex(PATH_BASE_COLOR);
      mat.opacity = 0.45;
    }
  });

  if (!infoPanel) return;
  updateInfoPanel(infoPanel, s);
  infoPanel.classList.add('active');
}

/** Populate the info panel using safe DOM methods -- no innerHTML with user data. */
function updateInfoPanel(panel, s) {
  const PILLAR_LABEL = { middle: 'Middle Pillar', mercy: 'Pillar of Mercy', severity: 'Pillar of Severity' };

  panel.textContent = '';  // clear

  const name = document.createElement('div');
  name.className = 'tree-info-name';
  name.textContent = s.label;

  const hebrew = document.createElement('div');
  hebrew.className = 'tree-info-hebrew';
  hebrew.textContent = s.id.charAt(0).toUpperCase() + s.id.slice(1);

  const pillar = document.createElement('div');
  pillar.className = 'tree-info-pillar';
  pillar.textContent = PILLAR_LABEL[s.pillar] || s.pillar;

  const cfLabel = document.createElement('div');
  cfLabel.className = 'tree-info-cf-label';
  cfLabel.textContent = 'ContextForge Role';

  const cf = document.createElement('div');
  cf.className = 'tree-info-cf';
  cf.textContent = s.cf;

  panel.appendChild(name);
  panel.appendChild(hebrew);
  panel.appendChild(pillar);
  panel.appendChild(cfLabel);
  panel.appendChild(cf);
}

function pickSephirah(event, canvas, camera) {
  const rect   = canvas.getBoundingClientRect();
  const mouseX = ((event.clientX - rect.left)  / rect.width)  * 2 - 1;
  const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  let raycaster;
  try { raycaster = new THREE.Raycaster(); } catch (e) { return null; }

  raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

  const targets = Object.values(_nodeMeshes || {}).map(m => m.sphere).filter(Boolean);
  const hits    = raycaster.intersectObjects(targets);
  if (!hits.length) return null;

  const hitMesh = hits[0].object;
  for (const [id, m] of Object.entries(_nodeMeshes || {})) {
    if (m.sphere === hitMesh) return id;
  }
  return null;
}

/* ============================================================
   TREE ANIMATION LOOP
============================================================ */
function animateTree(renderer, scene, camera) {
  if (_treeRAF) cancelAnimationFrame(_treeRAF);

  function loop() {
    _treeRAF = requestAnimationFrame(loop);

    _orbitTheta += 0.004;
    camera.position.x = Math.sin(_orbitTheta) * 9;
    camera.position.z = Math.cos(_orbitTheta) * 9;
    camera.lookAt(0, 0, 0);

    if (_selectedSeph && _nodeMeshes && _nodeMeshes[_selectedSeph]) {
      const m = _nodeMeshes[_selectedSeph];
      if (m.sphereMat) {
        m.sphereMat.emissiveIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.004);
      }
    }

    try { renderer.render(scene, camera); } catch (_) { /* silent */ }
  }

  loop();
}

/* ============================================================
   AGENT GRAPH -- PHYSICS + THREE.JS SCENE
============================================================ */

function initGraphNodes() {
  return AGENT_DEFS.map((def, i) => {
    const angle = (i === 0) ? 0 : ((i - 1) * (2 * Math.PI / 5));
    const r = (i === 0) ? 0 : 1.4;
    return {
      ...def,
      x:  (i === 0) ? 0   : r * Math.cos(angle),
      y:  (i === 0) ? 1.2 : r * Math.sin(angle) * 0.4,
      z:  (i === 0) ? 0   : r * Math.sin(angle),
      vx: (Math.random() - 0.5) * 0.01,
      vy: (Math.random() - 0.5) * 0.01,
      vz: (Math.random() - 0.5) * 0.01,
    };
  });
}

function buildGraphScene(canvas) {
  let renderer, scene, camera;
  try { renderer = createRenderer(canvas); } catch (e) { console.error('[tree/graph] createRenderer failed:', e); return null; }

  const w = canvas.parentElement.clientWidth  || 400;
  const h = canvas.parentElement.clientHeight || 440;

  try { scene  = new THREE.Scene(); }                                                     catch (e) { console.error('[tree/graph] Scene:', e); return null; }
  try { camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100); }                     catch (e) { console.error('[tree/graph] Camera:', e); return null; }

  camera.position.set(0, 1.5, 7);
  camera.lookAt(0, 0.5, 0);

  try {
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const pt = new THREE.PointLight(0xC49A1F, 1.0, 20);
    pt.position.set(0, 4, 4);
    scene.add(pt);
  } catch (e) { console.warn('[tree/graph] Lights:', e); }

  return { renderer, scene, camera };
}

function buildGraphMeshes(scene, nodes, edges) {
  const nodeMeshes = [];
  const lineMeshes = [];

  nodes.forEach((n, i) => {
    try {
      const geo = new THREE.SphereGeometry(i === 0 ? 0.28 : 0.20, 20, 20);
      const mat = new THREE.MeshPhongMaterial({
        color:             n.color,
        emissive:          n.color,
        emissiveIntensity: 0.4,
        transparent:       true,
        opacity:           0.9,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(n.x, n.y, n.z);
      scene.add(mesh);
      buildNodeGlow(geo, n.color, mesh);
      nodeMeshes.push({ mesh, mat });
    } catch (e) { console.warn('[tree/graph] Node mesh failed:', n.id, e); nodeMeshes.push(null); }
  });

  edges.forEach(e => {
    try {
      const na  = nodes[e.a];
      const nb  = nodes[e.b];
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(na.x, na.y, na.z),
        new THREE.Vector3(nb.x, nb.y, nb.z),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color:       0x4A3280,
        transparent: true,
        opacity:     0.5,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false,
      });
      const line = new THREE.Line(geo, mat);
      scene.add(line);
      lineMeshes.push({ line, geo, mat, edgeRef: e });
    } catch (e) { console.warn('[tree/graph] Edge line failed:', e); lineMeshes.push(null); }
  });

  return { nodeMeshes, lineMeshes };
}

function stepGraphPhysics(nodes, edges) {
  // Repulsion -- all pairs
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a  = nodes[i];
      const b  = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const d  = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
      const f  = REPULSE_FORCE / (d * d);
      a.vx -= f * dx / d;  a.vy -= f * dy / d;  a.vz -= f * dz / d;
      b.vx += f * dx / d;  b.vy += f * dy / d;  b.vz += f * dz / d;
    }
  }

  // Spring attraction along edges
  edges.forEach(e => {
    const a  = nodes[e.a];
    const b  = nodes[e.b];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const d  = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
    const f  = SPRING_K * (d - SPRING_REST);
    a.vx += f * dx / d;  a.vy += f * dy / d;  a.vz += f * dz / d;
    b.vx -= f * dx / d;  b.vy -= f * dy / d;  b.vz -= f * dz / d;
  });

  // Soft pin: apex node (index 0) held above the Pentagon ring
  nodes[0].vy += (1.2 - nodes[0].y) * 0.015;

  // Dampen + integrate
  nodes.forEach(n => {
    n.vx *= DAMPEN; n.vy *= DAMPEN; n.vz *= DAMPEN;
    n.x  += n.vx;  n.y  += n.vy;  n.z  += n.vz;
  });
}

function syncGraphMeshes(nodes, nodeMeshes, lineMeshes, edges) {
  nodes.forEach((n, i) => {
    const m = nodeMeshes[i];
    if (m) m.mesh.position.set(n.x, n.y, n.z);
  });

  lineMeshes.forEach((lm, i) => {
    if (!lm) return;
    const e   = edges[i];
    const na  = nodes[e.a];
    const nb  = nodes[e.b];
    const pos = lm.geo.attributes.position;
    pos.setXYZ(0, na.x, na.y, na.z);
    pos.setXYZ(1, nb.x, nb.y, nb.z);
    pos.needsUpdate = true;
  });

  // Advance baton particles
  _batonParticles = _batonParticles.filter(p => {
    p.t += p.speed;
    const t = Math.min(p.t, 1);
    p.mesh.position.lerpVectors(p.from, p.to, t);
    if (t >= 1) {
      p.scene.remove(p.mesh);
      return false;
    }
    return true;
  });
}

function fireBaton(scene, nodes, a, b) {
  try {
    const geo  = new THREE.SphereGeometry(0.09, 8, 8);
    const mat  = new THREE.MeshBasicMaterial({
      color:       accentColorInt(),
      transparent: true,
      opacity:     0.95,
      blending:    THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const from = new THREE.Vector3(nodes[a].x, nodes[a].y, nodes[a].z);
    const to   = new THREE.Vector3(nodes[b].x, nodes[b].y, nodes[b].z);
    mesh.position.copy(from);
    scene.add(mesh);
    _batonParticles.push({ mesh, from, to, t: 0, speed: 0.012, scene });
  } catch (e) { console.warn('[tree/graph] Baton failed:', e); }
}

function animateGraph(renderer, scene, camera, nodes, nodeMeshes, lineMeshes, edges) {
  if (_graphRAF) cancelAnimationFrame(_graphRAF);

  function loop() {
    _graphRAF = requestAnimationFrame(loop);

    stepGraphPhysics(nodes, edges);
    syncGraphMeshes(nodes, nodeMeshes, lineMeshes, edges);

    _graphOrbitTheta += 0.006;
    camera.position.x = Math.sin(_graphOrbitTheta) * 7;
    camera.position.z = Math.cos(_graphOrbitTheta) * 7;
    camera.lookAt(0, 0.5, 0);

    try { renderer.render(scene, camera); } catch (_) { /* silent */ }
  }

  loop();
}

/* ============================================================
   SCENARIO TRIGGERS -- baton pulses for the agent graph
============================================================ */
const SCENARIOS = {
  standup: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]],
  sprint:  [[0,1],[0,2],[0,3],[0,4],[0,5]],
  aar:     [[1,0],[2,0],[3,0],[4,0],[5,0],[0,1]],
};

function runScenario(name, nodes, scene) {
  const seq = SCENARIOS[name] || SCENARIOS.standup;
  seq.forEach(([a, b], i) => {
    setTimeout(() => fireBaton(scene, nodes, a, b), i * 400);
  });
}

/* ============================================================
   TAB SWITCHER
============================================================ */
function switchTab(tabId, tabBtns, tabPanels) {

  tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
  tabPanels.forEach(panel => { panel.hidden = panel.dataset.tabPanel !== tabId; });

  if (tabId !== 'tree'  && _treeRAF)  { cancelAnimationFrame(_treeRAF);  _treeRAF  = null; }
  if (tabId !== 'graph' && _graphRAF) { cancelAnimationFrame(_graphRAF); _graphRAF = null; }

  if (tabId === 'tree' && _treeRenderer && _treeScene && _treeCamera) {
    animateTree(_treeRenderer, _treeScene, _treeCamera);
  }
  if (tabId === 'graph' && _graphRenderer && _graphScene && _graphCamera) {
    animateGraph(_graphRenderer, _graphScene, _graphCamera, _graphNodes, _graphNodeMeshes, _graphLineMeshes, AGENT_EDGES);
  }
}

/* ============================================================
   DOM CONSTRUCTION -- safe DOM methods only, no innerHTML with dynamic data
============================================================ */

/** Create a labelled button element. */
function makeBtn(text, cls, dataset) {
  const btn = document.createElement('button');
  btn.className = cls;
  btn.textContent = text;
  if (dataset) Object.entries(dataset).forEach(([k, v]) => { btn.dataset[k] = v; });
  return btn;
}

/** Create a div with className and optional textContent. */
function makeDiv(cls, text) {
  const d = document.createElement('div');
  d.className = cls;
  if (text !== undefined) d.textContent = text;
  return d;
}

function buildDOM(section) {
  // Outer wrapper
  const wrap = makeDiv('tree-wrap');

  // Header
  const header = document.createElement('header');
  header.className = 'tree-header';
  header.appendChild(makeDiv('tree-eyebrow', 'Sacred Architecture'));
  const title = document.createElement('h2');
  title.className = 'tree-title';
  title.textContent = 'The Tree of Life';
  header.appendChild(title);
  header.appendChild(makeDiv('tree-lead', 'The Kabbalistic Sephiroth overlaid on the ContextForge agent coordination chain. Ten nodes. Twenty-two paths. Three pillars.'));
  wrap.appendChild(header);

  // Tab nav
  const nav = document.createElement('nav');
  nav.className = 'tree-tabs';
  nav.setAttribute('role', 'tablist');
  const btnTree  = makeBtn('Tree of Life', 'tree-tab-btn active', { tab: 'tree'  });
  const btnGraph = makeBtn('Agent Graph',  'tree-tab-btn',        { tab: 'graph' });
  btnTree.setAttribute('role', 'tab');
  btnGraph.setAttribute('role', 'tab');
  nav.appendChild(btnTree);
  nav.appendChild(btnGraph);
  wrap.appendChild(nav);

  // ── Tab panel 1: Tree of Life ──────────────────────────────────
  const panelTree = makeDiv('tree-tab-panel');
  panelTree.dataset.tabPanel = 'tree';

  const layoutTree = makeDiv('tree-layout');

  const canvasWrapTree = makeDiv('tree-canvas-wrap');
  const treeCanvas = document.createElement('canvas');
  treeCanvas.className = 'tree-canvas';
  treeCanvas.id = 'tree-canvas';
  canvasWrapTree.appendChild(treeCanvas);
  layoutTree.appendChild(canvasWrapTree);

  const sidebarTree = makeDiv('tree-sidebar');

  const infoPanel = makeDiv('tree-info-panel');
  infoPanel.id = 'tree-info';
  const placeholder = makeDiv('tree-info-placeholder', 'Click a Sephirah to explore its ContextForge mapping');
  infoPanel.appendChild(placeholder);
  sidebarTree.appendChild(infoPanel);

  const ctrlsTree = makeDiv('tree-controls');
  const btnFourWorlds = makeBtn('Four Worlds Overlay', 'tree-ctrl-btn');
  btnFourWorlds.id = 'btn-four-worlds';
  ctrlsTree.appendChild(btnFourWorlds);

  const legend = makeDiv('tree-pillar-legend');
  const legendItems = [
    ['#C49A1F', 'Middle Pillar -- Coordination Chain'],
    ['#1E3FAA', 'Pillar of Mercy -- Expansion'],
    ['#9B7BE0', 'Pillar of Severity -- Constraint'],
  ];
  legendItems.forEach(([color, text]) => {
    const item = makeDiv('tree-legend-item');
    const dot  = makeDiv('tree-legend-dot');
    dot.style.background = color;
    item.appendChild(dot);
    item.appendChild(document.createTextNode(text));
    legend.appendChild(item);
  });
  ctrlsTree.appendChild(legend);
  sidebarTree.appendChild(ctrlsTree);
  layoutTree.appendChild(sidebarTree);
  panelTree.appendChild(layoutTree);
  wrap.appendChild(panelTree);

  // ── Tab panel 2: Agent Graph ───────────────────────────────────
  const panelGraph = makeDiv('tree-tab-panel');
  panelGraph.dataset.tabPanel = 'graph';
  panelGraph.hidden = true;

  const layoutGraph = makeDiv('tree-layout');

  const canvasWrapGraph = makeDiv('tree-canvas-wrap');
  const graphCanvas = document.createElement('canvas');
  graphCanvas.className = 'tree-canvas';
  graphCanvas.id = 'graph-canvas';
  canvasWrapGraph.appendChild(graphCanvas);
  layoutGraph.appendChild(canvasWrapGraph);

  const sidebarGraph = makeDiv('tree-sidebar');
  const graphInfo = makeDiv('tree-graph-info');
  graphInfo.appendChild(makeDiv('tree-graph-desc', 'Six-node ContextForge agent graph. Self-organises toward the Dodecahedron vertex projection at equilibrium. Powered by a custom Verlet spring solver.'));

  const agentList = makeDiv('tree-agent-list');
  agentList.id = 'agent-list';
  AGENT_DEFS.forEach(n => {
    const item = makeDiv('tree-agent-item');
    const dot  = makeDiv('tree-agent-dot');
    dot.style.background = '#' + n.color.toString(16).padStart(6, '0');
    const strong = document.createElement('strong');
    strong.textContent = n.label;
    item.appendChild(dot);
    item.appendChild(strong);
    item.appendChild(document.createTextNode('\u00a0-- ' + n.role));
    agentList.appendChild(item);
  });
  graphInfo.appendChild(agentList);
  sidebarGraph.appendChild(graphInfo);

  const ctrlsGraph = makeDiv('tree-controls');
  const btnStandup = makeBtn('Daily Standup', 'tree-ctrl-btn');
  btnStandup.id = 'btn-standup';
  const btnSprint = makeBtn('Sprint Kickoff', 'tree-ctrl-btn');
  btnSprint.id = 'btn-sprint';
  const btnAar = makeBtn('AAR Loop', 'tree-ctrl-btn');
  btnAar.id = 'btn-aar';
  ctrlsGraph.appendChild(btnStandup);
  ctrlsGraph.appendChild(btnSprint);
  ctrlsGraph.appendChild(btnAar);
  sidebarGraph.appendChild(ctrlsGraph);

  layoutGraph.appendChild(sidebarGraph);
  panelGraph.appendChild(layoutGraph);
  wrap.appendChild(panelGraph);

  // Mount everything
  section.textContent = '';  // clear
  section.appendChild(wrap);
}

/* ============================================================
   MAIN INIT
============================================================ */
export function init() {
  if (initialised) return;
  initialised = true;

  const section = document.querySelector('[data-section="tree"]');
  if (!section) return;

  buildDOM(section);

  // 80ms delay -- CSS layout must settle before reading canvas dimensions
  setTimeout(() => {

    // ── Tree of Life scene ──────────────────────────────
    const treeCanvas = section.querySelector('#tree-canvas');
    if (treeCanvas) {
      const result = buildTreeScene(treeCanvas);
      if (result) {
        _treeRenderer = result.renderer;
        _treeScene    = result.scene;
        _treeCamera   = result.camera;

        _nodeMeshes = buildSephiroth(_treeScene);
        _pathLines  = buildPaths(_treeScene);
        _worldZones = buildWorldZones(_treeScene);

        applyElementHighlight(_nodeMeshes);
        animateTree(_treeRenderer, _treeScene, _treeCamera);

        const infoPanel = section.querySelector('#tree-info');
        treeCanvas.addEventListener('click', e => {
          const id = pickSephirah(e, treeCanvas, _treeCamera);
          if (id) selectSephirah(id, _nodeMeshes, infoPanel);
        });
      }
    }

    // ── Agent graph scene ───────────────────────────────
    const graphCanvas = section.querySelector('#graph-canvas');
    if (graphCanvas) {
      const result = buildGraphScene(graphCanvas);
      if (result) {
        _graphRenderer   = result.renderer;
        _graphScene      = result.scene;
        _graphCamera     = result.camera;

        _graphNodes = initGraphNodes();
        const meshes     = buildGraphMeshes(_graphScene, _graphNodes, AGENT_EDGES);
        _graphNodeMeshes = meshes.nodeMeshes;
        _graphLineMeshes = meshes.lineMeshes;
        // Graph animation starts only when its tab becomes active
      }
    }

    // ── Four Worlds toggle ──────────────────────────────
    const btnFourWorlds = section.querySelector('#btn-four-worlds');
    if (btnFourWorlds) {
      btnFourWorlds.addEventListener('click', () => {
        _fourWorldsOn = !_fourWorldsOn;
        _worldZones.forEach(z => { z.mesh.visible = _fourWorldsOn; });
        btnFourWorlds.classList.toggle('active', _fourWorldsOn);
      });
    }

    // ── Scenario buttons ────────────────────────────────
    const btnStandup = section.querySelector('#btn-standup');
    const btnSprint  = section.querySelector('#btn-sprint');
    const btnAar     = section.querySelector('#btn-aar');
    if (btnStandup) btnStandup.addEventListener('click', () => runScenario('standup', _graphNodes, _graphScene));
    if (btnSprint)  btnSprint.addEventListener('click',  () => runScenario('sprint',  _graphNodes, _graphScene));
    if (btnAar)     btnAar.addEventListener('click',     () => runScenario('aar',     _graphNodes, _graphScene));

    // ── Tab switcher ────────────────────────────────────
    const tabBtns   = Array.from(section.querySelectorAll('.tree-tab-btn'));
    const tabPanels = Array.from(section.querySelectorAll('.tree-tab-panel'));
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab, tabBtns, tabPanels));
    });

    // ── React to oracle element changes ─────────────────
    document.documentElement.addEventListener('elementchange', () => {
      applyElementHighlight(_nodeMeshes);
    });

  }, 80);
}
