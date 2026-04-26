// public/js/sections/yantra.js
import { createRenderer } from '../utils/createRenderer.js';
import { TRIANGLES, OUTER_RINGS, LOTUS_8, LOTUS_16, BHUPURA, tikzToCanvas }
  from '../geometry/yantraCoords.js';

let initialised  = false;
let _renderer    = null;
let _bgObserver  = null;
let _constructed = false;
let _animTimers  = [];

export function init() {
  if (initialised) return;
  initialised = true;

  const section = document.querySelector('[data-section="yantra"]');
  if (!section) return;

  _initBackground(section);
  setTimeout(() => _initGeoCanvas(section), 80);
}

function _initBackground(section) {
  const bg = section.querySelector('.yantra-bg');
  if (!bg || _renderer) return;
  try {
    _renderer = createRenderer(bg);
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60, bg.parentElement.clientWidth / bg.parentElement.clientHeight, 0.1, 100
    );
    camera.position.z = 3;

    const COUNT = 600;
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x9b7be0, size: 0.03,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.Points(geo, mat));

    let raf;
    function tick() {
      raf = requestAnimationFrame(tick);
      scene.rotation.y += 0.0003;
      _renderer.render(scene, camera);
    }
    tick();

    _bgObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) { cancelAnimationFrame(raf); raf = null; }
      else if (!raf) tick();
    }, { threshold: 0.1 });
    _bgObserver.observe(section);

    new ResizeObserver(() => {
      const w = bg.parentElement.clientWidth;
      const h = bg.parentElement.clientHeight;
      if (w && h) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
    }).observe(bg.parentElement);
  } catch (err) {
    console.error('[yantra] background init failed:', err);
  }
}

function _sizeCanvases(section) {
  const stage = section.querySelector('.yantra-stage');
  const size  = Math.min(stage.clientWidth, stage.clientHeight) * 0.9;
  ['.yantra-geo', '.yantra-overlay'].forEach(sel => {
    const c  = section.querySelector(sel);
    c.width  = size;
    c.height = size;
  });
}

function _transform(canvas) {
  const w = canvas.width, h = canvas.height;
  return { cx: w / 2, cy: h / 2, scale: Math.min(w, h) * 0.44 };
}

function _initGeoCanvas(section) {
  const stage  = section.querySelector('.yantra-stage');
  const geo    = section.querySelector('.yantra-geo');
  if (!stage || !geo) { console.error('[yantra] geo canvas or stage missing'); return; }
  const geoCtx = geo.getContext('2d');
  if (!geoCtx) { console.error('[yantra] could not get 2D context'); return; }

  const obs = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !_constructed) {
      obs.disconnect();
      _sizeCanvases(section);
      const { cx, cy, scale } = _transform(geo);
      animateConstruction(geoCtx, cx, cy, scale, () => {
        _constructed = true;
        const controls = section.querySelector('.yantra-controls');
        controls.removeAttribute('aria-disabled');
        const toggle = controls.querySelector('[data-yantra="toggle"]');
        toggle.disabled = false;
        _initOverlay(section);
      });
    }
  }, { threshold: 0.3 });
  obs.observe(stage);
}

export function animateConstruction(ctx, cx, cy, scale, onDone) {
  _animTimers.forEach(clearTimeout);
  _animTimers = [];

  function drawTriangle(t) {
    const pts = t.verts.map(([x, y]) => tikzToCanvas(x, y, cx, cy, scale));
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    ctx.lineTo(...pts[1]);
    ctx.lineTo(...pts[2]);
    ctx.closePath();
    ctx.strokeStyle = t.dir === 'up' ? '#C49A1F' : '#9B7BE0';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  }

  function drawRings() {
    OUTER_RINGS.forEach(r => {
      const radius = r * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(196, 154, 31, 0.6)';
      ctx.lineWidth   = 1;
      ctx.stroke();
    });
  }

  function drawLotus(config, petalCount) {
    const r    = config.r * scale;
    const step = (Math.PI * 2) / petalCount;
    ctx.strokeStyle = 'rgba(155, 123, 224, 0.5)';
    ctx.lineWidth   = 0.8;
    for (let i = 0; i < petalCount; i++) {
      const angle = i * step;
      ctx.beginPath();
      ctx.ellipse(
        cx + Math.cos(angle) * r * 0.7,
        cy + Math.sin(angle) * r * 0.7,
        config.petalW * scale,
        config.petalH * scale,
        angle, 0, Math.PI * 2
      );
      ctx.stroke();
    }
  }

  function drawBhupura() {
    const hs = BHUPURA.halfSize * scale;
    const gw = BHUPURA.gateWidth * scale;
    ctx.strokeStyle = 'rgba(196, 154, 31, 0.7)';
    ctx.lineWidth   = 2;
    ctx.strokeRect(cx - hs, cy - hs, hs * 2, hs * 2);
    // clearRect cuts gate openings in all four sides -- intentional; erases any
    // overlapping triangle strokes to produce traditional Sri Yantra gate breaks.
    const half = gw / 2;
    ctx.clearRect(cx - half, cy - hs - 1, gw, 3);
    ctx.clearRect(cx - half, cy + hs - 1, gw, 3);
    ctx.clearRect(cx - hs - 1, cy - half, 3, gw);
    ctx.clearRect(cx + hs - 1, cy - half, 3, gw);
  }

  TRIANGLES.forEach((t, i) => {
    _animTimers.push(setTimeout(() => drawTriangle(t), i * 35));
  });

  const base = TRIANGLES.length * 35;
  _animTimers.push(setTimeout(drawRings,                       base));
  _animTimers.push(setTimeout(() => drawLotus(LOTUS_8, 8),    base + 80));
  _animTimers.push(setTimeout(() => drawLotus(LOTUS_16, 16),  base + 160));
  _animTimers.push(setTimeout(drawBhupura,                    base + 240));
  _animTimers.push(setTimeout(() => { if (onDone) onDone(); }, base + 280));
}

const PAOAL_FILLS = [
  { color: '#9B7BE0', label: 'Learn (innermost)' },
  { color: '#1E3FAA', label: 'Assess' },
  { color: '#1E3FAA', label: 'Assess' },
  { color: '#20A8C8', label: 'Observe' },
  { color: '#20A8C8', label: 'Observe' },
  { color: '#1B5E35', label: 'Act' },
  { color: '#1B5E35', label: 'Act' },
  { color: '#C49A1F', label: 'Plan' },
  { color: '#C49A1F', label: 'Plan (outermost)' },
];

const ELEMENT_COLORS = {
  fire:   '#C49A1F',
  earth:  '#2D8050',
  air:    '#3B5FC8',
  water:  '#20A8C8',
  aether: '#9B7BE0',
};

function _hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function paintOverlay(ctx, cx, cy, scale, mode) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const element = document.documentElement.dataset.element || null;

  TRIANGLES.forEach((t, i) => {
    let hex, opacity;
    if (mode === 'paoal') {
      hex     = PAOAL_FILLS[i].color;
      opacity = 0.35;
    } else if (element) {
      hex     = ELEMENT_COLORS[element] || '#C49A1F';
      opacity = 0.40;
    } else {
      hex     = '#C49A1F';
      opacity = 0.25;
    }
    const [r, g, b] = _hexToRgb(hex);
    const pts = t.verts.map(([x, y]) => tikzToCanvas(x, y, cx, cy, scale));
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    ctx.lineTo(...pts[1]);
    ctx.lineTo(...pts[2]);
    ctx.closePath();
    ctx.fillStyle = `rgba(${r},${g},${b},${opacity})`;
    ctx.fill();
  });
}

function _paintLegend(legend, mode) {
  while (legend.firstChild) legend.removeChild(legend.firstChild);

  const element = document.documentElement.dataset.element || null;

  let entries;
  if (mode === 'paoal') {
    const seen = new Set();
    entries = PAOAL_FILLS
      .map((p, i) => ({ label: `T${i + 1}: ${p.label}`, color: p.color }))
      .filter(e => {
        if (seen.has(e.label)) return false;
        seen.add(e.label);
        return true;
      });
  } else if (element) {
    const name = element.charAt(0).toUpperCase() + element.slice(1);
    entries = [{ label: name + ' -- your element', color: ELEMENT_COLORS[element] || '#C49A1F' }];
  } else {
    entries = [{ label: 'Complete the Oracle to unlock your element.', color: '#C49A1F' }];
  }

  entries.forEach(({ label, color }) => {
    const row    = document.createElement('div');
    row.className = 'yantra-legend-row';
    const swatch = document.createElement('span');
    swatch.className          = 'yantra-legend-swatch';
    swatch.style.background   = color;
    const text = document.createElement('span');
    text.textContent = label;
    row.appendChild(swatch);
    row.appendChild(text);
    legend.appendChild(row);
  });
}

function _initOverlay(section) {
  const overlayCanvas = section.querySelector('.yantra-overlay');
  const overlayCtx    = overlayCanvas.getContext('2d');
  const geo           = section.querySelector('.yantra-geo');
  const legend        = section.querySelector('[data-yantra="legend"]');
  const toggle        = section.querySelector('[data-yantra="toggle"]');
  const replay        = section.querySelector('[data-yantra="replay"]');

  let mode    = 'paoal';
  let visible = false;

  function repaint() {
    if (!visible) {
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      legend.hidden = true;
      return;
    }
    const { cx, cy, scale } = _transform(geo);
    paintOverlay(overlayCtx, cx, cy, scale, mode);
    _paintLegend(legend, mode);
    legend.hidden = false;
  }

  const paoalPill = section.querySelector('[data-yantra="paoal"]');
  if (paoalPill) paoalPill.classList.add('yantra-pill--active');

  section.querySelectorAll('.yantra-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      mode = pill.dataset.yantra;
      section.querySelectorAll('.yantra-pill').forEach(p =>
        p.classList.toggle('yantra-pill--active', p.dataset.yantra === mode)
      );
      repaint();
    });
  });

  toggle.addEventListener('click', () => {
    visible = !visible;
    toggle.textContent = visible ? 'Hide overlay' : 'Show overlay';
    repaint();
  });

  replay.addEventListener('click', () => {
    _constructed = false;
    visible      = false;
    toggle.textContent = 'Show overlay';
    toggle.disabled    = true;
    const controls = section.querySelector('.yantra-controls');
    controls.setAttribute('aria-disabled', 'true');

    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    legend.hidden = true;

    const geoCtx = geo.getContext('2d');
    geoCtx.clearRect(0, 0, geo.width, geo.height);

    const { cx, cy, scale } = _transform(geo);
    animateConstruction(geoCtx, cx, cy, scale, () => {
      _constructed = true;
      controls.removeAttribute('aria-disabled');
      toggle.disabled = false;
    });
  });
}
