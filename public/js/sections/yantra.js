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

function _initOverlay(section) {
  // Implemented in Task 4 -- stub so router can load without errors.
}
