import { createRenderer } from '../utils/createRenderer.js';

const ELEMENTS = [
  { id: 'fire',   solidFn: 'Tetrahedron',  angle: 270, color: 0xC49A1F },
  { id: 'earth',  solidFn: 'Hexahedron',   angle: 342, color: 0x2D8050 },
  { id: 'air',    solidFn: 'Octahedron',   angle:  54, color: 0x3B5FC8 },
  { id: 'water',  solidFn: 'Icosahedron',  angle: 126, color: 0x20A8C8 },
  { id: 'aether', solidFn: 'Dodecahedron', angle: 198, color: 0x9B7BE0 },
];

// Glow edge spec from CLAUDE.md -- exact values
const GLOW_LAYERS        = [[1.000, 0.88], [1.022, 0.27], [1.058, 0.10], [1.105, 0.04]];
const GLOW_LAYERS_ACTIVE = [[1.000, 0.88], [1.022, 0.54], [1.058, 0.20], [1.105, 0.08]];

const ORBIT_RADIUS = 2.2;
const ROT_SPEED    = 0.003;

let _intervalId  = null;
let _initialized = false;

export function init() {
  if (_initialized) return;
  _initialized = true;

  const section = document.querySelector('[data-section="dashboard"]');
  if (!section) return;

  _buildMarkup(section);

  // 80ms delay -- CSS layout must complete before reading canvas dimensions
  setTimeout(() => {
    _initConstellation(section);
    _initMetrics(section);
  }, 80);
}

// -- DOM (safe construction -- no HTML string injection) --
function _el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'className') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function _buildMarkup(section) {
  const wrap = _el('div', { className: 'dashboard-wrap' });

  const header = _el('div', { className: 'dashboard-header' },
    _el('span', { className: 'dashboard-title' }, 'Agent Constellation'),
    _el('span', { className: 'dashboard-label' }, 'ContextForge · Live'),
  );

  const canvas = _el('canvas', { className: 'dashboard-constellation' });
  const legend = _el('div',   { className: 'dashboard-legend' });

  const metrics = _el('div', { className: 'dashboard-metrics' });
  for (const [status, label] of [
    ['open', 'Open'], ['in_progress', 'Active'], ['blocked', 'Blocked'], ['done', 'Done'],
  ]) {
    const cell = _el('div', { className: 'metric-cell', dataset: { status } });
    const val  = _el('span', { className: 'metric-value', id: `metric-${status}` }, '—');
    const lbl  = _el('span', { className: 'metric-label' }, label);
    cell.appendChild(val);
    cell.appendChild(lbl);
    metrics.appendChild(cell);
  }

  wrap.appendChild(header);
  wrap.appendChild(canvas);
  wrap.appendChild(legend);
  wrap.appendChild(metrics);

  section.appendChild(wrap);
}

// -- Three.js constellation --
function _initConstellation(section) {
  const canvas = section.querySelector('.dashboard-constellation');
  if (!canvas) return;

  const W = canvas.parentElement.clientWidth;
  const H = Math.max(canvas.parentElement.clientHeight * 0.6, 340);

  let renderer;
  try {
    renderer = createRenderer(canvas);
    renderer.setSize(W, H);
    renderer.setClearColor(0x050210, 1);
  } catch (err) {
    console.error('[dashboard] WebGL init failed:', err);
    return;
  }

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
  camera.position.set(0, 0, 8);

  const element = document.documentElement.dataset.element || null;
  const groups  = {};

  for (const el of ELEMENTS) {
    const group = _buildSolid(el, element);
    scene.add(group);
    groups[el.id] = group;
  }

  _positionSolids(groups, element, 0);
  _updateLegend(section, element);

  let frame = 0;
  (function animate() {
    requestAnimationFrame(animate);
    frame += ROT_SPEED;
    _positionSolids(groups, element, frame);
    renderer.render(scene, camera);
  })();
}

function _buildSolid(el, activeElement) {
  const group    = new THREE.Group();
  const isActive = el.id === activeElement;
  const layers   = isActive ? GLOW_LAYERS_ACTIVE : GLOW_LAYERS;

  let geo;
  try {
    switch (el.solidFn) {
      case 'Tetrahedron':  geo = new THREE.TetrahedronGeometry(0.55); break;
      case 'Hexahedron':   geo = new THREE.BoxGeometry(0.8, 0.8, 0.8); break;
      case 'Octahedron':   geo = new THREE.OctahedronGeometry(0.6); break;
      case 'Icosahedron':  geo = new THREE.IcosahedronGeometry(0.6); break;
      case 'Dodecahedron': geo = new THREE.DodecahedronGeometry(0.6); break;
      default:             geo = new THREE.IcosahedronGeometry(0.5);
    }
  } catch (err) {
    console.error('[dashboard] geometry failed:', err);
    return group;
  }

  for (const [scale, opacity] of layers) {
    const mat = new THREE.LineBasicMaterial({
      color: el.color, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ls = new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
    ls.scale.setScalar(scale);
    group.add(ls);
  }

  group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: el.color, transparent: true,
    opacity: isActive ? 0.08 : 0.04, side: THREE.DoubleSide,
  })));

  return group;
}

function _positionSolids(groups, activeElement, rotOffset) {
  for (const el of ELEMENTS) {
    const group = groups[el.id];
    if (!group) continue;
    const isActive = el.id === activeElement;
    const a = (el.angle * Math.PI / 180) + rotOffset;
    group.position.set(
      Math.cos(a) * ORBIT_RADIUS,
      Math.sin(a) * ORBIT_RADIUS * 0.55,
      0,
    );
    group.scale.setScalar(isActive ? 1.3 : 1.0);
    group.rotation.y += isActive ? 0.012 : 0.006;
    group.rotation.x += 0.003;
  }
}

function _updateLegend(section, element) {
  const legend = section.querySelector('.dashboard-legend');
  if (!legend) return;
  if (element) {
    const el   = ELEMENTS.find(e => e.id === element);
    const name = el ? el.id.charAt(0).toUpperCase() + el.id.slice(1) : element;
    legend.textContent = 'Your element — ' + name + ' — colours the constellation';
  } else {
    legend.textContent = 'Complete the Oracle to unlock your element assignment';
  }
}

// -- Task metrics --
async function _fetchAndRender(section) {
  try {
    const res  = await fetch('/api/tasks/summary');
    const data = await res.json();
    for (const key of ['open', 'in_progress', 'blocked', 'done']) {
      const node = section.querySelector('#metric-' + key);
      if (node) node.textContent = String(data[key] ?? '—');
    }
  } catch (err) {
    console.error('[dashboard] metrics fetch failed:', err);
  }
}

function _initMetrics(section) {
  _fetchAndRender(section);
  if (_intervalId) clearInterval(_intervalId);
  _intervalId = setInterval(() => _fetchAndRender(section), 30_000);
}
