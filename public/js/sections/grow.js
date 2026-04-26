/**
 * grow.js -- #grow section
 *
 * Two interactive demos on the theme of PHI-governed expansion:
 *   1. Phyllotaxis Slider  -- golden angle (137.5 deg) produces sunflower packing.
 *                            Drag to show how 0.1 deg off-axis produces visible spokes.
 *                            Fibonacci N-markers mapped to GCMT team sizes.
 *   2. L-System Fractal Tree -- recursive Canvas 2D, sliders for angle/depth/ratio,
 *                               phi-mode toggle (child/parent = 1/PHI), golden-angle mode.
 *
 * Three.js background canvas: an ambient PHI-spiral particle field visualises
 * PHI-governed hierarchy. createRenderer() is used per the module contract.
 *
 * ES Module. Named export: init(). Idempotent via initialised guard.
 */

import { createRenderer } from '../utils/createRenderer.js';
import { PHI } from '../geometry/constants.js';

// THREE and gsap are window globals -- never import

let initialised = false;

// ── Golden angle -- 360 / PHI^2 ──────────────────────────────────────────────────
const GOLDEN_ANGLE_DEG = 360 / (PHI * PHI); // ~137.5076...

// ── GCMT team-size Fibonacci markers ─────────────────────────────────────────────
const GCMT_MARKERS = [
  { n: 2,  label: 'Duo' },
  { n: 3,  label: 'Triad' },
  { n: 5,  label: 'Pentad' },
  { n: 8,  label: 'Octad' },
  { n: 13, label: 'Tridecad' },
  { n: 21, label: 'Hecatontad' },
];

// ── Colour helpers (no hardcoded hex -- pulls from CSS custom properties) ─────────

function getAccentColor() {
  return (
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() ||
    getComputedStyle(document.documentElement).getPropertyValue('--hh-gold').trim() ||
    '#C49A1F'
  );
}

// Parse a CSS hex colour to rgba() string. Falls back to gold on invalid input.
function hexToRgba(hex, alpha) {
  const clean = (hex || '').trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(clean)) return `rgba(196,154,31,${alpha})`;
  const r = parseInt(clean.slice(1, 3), 16);
  const g = parseInt(clean.slice(3, 5), 16);
  const b = parseInt(clean.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Accent -> THREE.Color hex integer
function accentToThreeHex() {
  const raw = getAccentColor();
  if (raw.startsWith('#') && raw.length === 7) {
    return parseInt('0x' + raw.slice(1), 16);
  }
  return 0xC49A1F; // gold fallback
}

// ── Safe DOM element builder ──────────────────────────────────────────────────────
// No innerHTML is used anywhere in this module; all DOM is constructed via the API.

function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') {
        (v || '').split(' ').filter(Boolean).forEach(c => node.classList.add(c));
      } else if (k === 'text') {
        node.textContent = v;
      } else {
        node.setAttribute(k, v);
      }
    });
  }
  children.flat().forEach(ch => {
    if (ch instanceof Node) node.appendChild(ch);
  });
  return node;
}

// ══════════════════════════════════════════════════════════════════════════════════
// PUBLIC ENTRY POINT
// ══════════════════════════════════════════════════════════════════════════════════

export function init() {
  if (initialised) return;
  if (!window.THREE) {
    console.warn('[grow] Three.js not loaded');
    return;
  }

  const section = document.querySelector('[data-section="grow"]');
  if (!section) return;

  initialised = true;

  _buildMarkup(section);
  _initBackground(section);
  _initPhyllotaxis(section);
  _initFractalTree(section);
  _initTabs(section);
}

// ══════════════════════════════════════════════════════════════════════════════════
// MARKUP CONSTRUCTION (DOM API only -- no innerHTML)
// ══════════════════════════════════════════════════════════════════════════════════

function _buildMarkup(section) {
  if (section.querySelector('.grow-bg')) return; // already mounted

  // Background canvas (Three.js)
  const bgCanvas = el('canvas', { class: 'grow-bg', 'aria-hidden': 'true' });

  // ── Header ─────────────────────────────────────────────────────────────────────
  const eyebrow = el('p',  { class: 'grow-eyebrow', text: 'Sacred Geometry \u00B7 Growth' });
  const title   = el('h2', { class: 'grow-title',   text: 'Growth & Expansion' });

  const leadParts = [
    `\u03C6 \u2248 ${PHI.toFixed(6)} governs every proportion here. `,
    `The golden angle \u2014 360\u00B0/\u03C6\u00B2 \u2248 ${GOLDEN_ANGLE_DEG.toFixed(4)}\u00B0 \u2014 `,
    `is the only divergence angle that produces fully-packed, non-overlapping spirals. `,
    `Deviate by 0.1\u00B0 and visible spokes appear.`,
  ];
  const lead = el('p', { class: 'grow-lead', text: leadParts.join('') });

  const header = el('header', { class: 'grow-header' }, eyebrow, title, lead);

  // ── Tab nav ────────────────────────────────────────────────────────────────────
  const tabPhyllo  = el('button', {
    class: 'grow-tab grow-tab--active',
    'data-tab': 'phyllo',
    role: 'tab',
    'aria-selected': 'true',
    'aria-controls': 'panel-phyllo',
    text: 'Phyllotaxis Spiral',
  });
  const tabFractal = el('button', {
    class: 'grow-tab',
    'data-tab': 'fractal',
    role: 'tab',
    'aria-selected': 'false',
    'aria-controls': 'panel-fractal',
    text: 'Fractal Tree',
  });
  const tabNav = el('nav', { class: 'grow-tabs', role: 'tablist', 'aria-label': 'Growth demos' },
    tabPhyllo, tabFractal);

  // ── Phyllotaxis panel ──────────────────────────────────────────────────────────
  const phylloCanvas = el('canvas', { class: 'phyllo-canvas', 'aria-label': 'Phyllotaxis spiral' });
  const demoWrapP    = el('div', { class: 'grow-demo-wrap' }, phylloCanvas);

  // Angle slider row
  const phylloAngleVal = el('span', { class: 'ctrl-value', id: 'phyllo-angle-val',
    text: GOLDEN_ANGLE_DEG.toFixed(2) + '\u00B0' });
  const phylloAngleLbl = el('label', { class: 'ctrl-label', for: 'phyllo-angle',
    text: 'Divergence angle\u00A0' });
  phylloAngleLbl.appendChild(phylloAngleVal);
  const phylloAngleSlider = el('input', {
    type: 'range', id: 'phyllo-angle', class: 'ctrl-slider',
    min: '1', max: '180', step: '0.1',
    value: GOLDEN_ANGLE_DEG.toFixed(1),
  });
  const phylloAngleRow = el('div', { class: 'ctrl-row' }, phylloAngleLbl, phylloAngleSlider);

  // N slider row
  const phylloNVal = el('span', { class: 'ctrl-value', id: 'phyllo-n-val', text: '377' });
  const phylloNLbl = el('label', { class: 'ctrl-label', for: 'phyllo-n', text: 'Seed count\u00A0' });
  phylloNLbl.appendChild(phylloNVal);
  const phylloNSlider = el('input', {
    type: 'range', id: 'phyllo-n', class: 'ctrl-slider',
    min: '5', max: '800', step: '1', value: '377',
  });
  const phylloNRow = el('div', { class: 'ctrl-row' }, phylloNLbl, phylloNSlider);

  // Golden-angle snap button
  const phylloGoldenBtn = el('button', {
    class: 'ctrl-btn', id: 'phyllo-golden',
    text: '\u25C8 Snap to golden angle',
  });

  // GCMT marker buttons
  const markerWrap = el('div', { class: 'ctrl-markers' });
  GCMT_MARKERS.forEach(m => {
    const btn = el('button', {
      class: 'ctrl-marker',
      'data-n': String(m.n),
      title: m.label,
      text: String(m.n),
    });
    markerWrap.appendChild(btn);
  });

  const phylloInlineRow = el('div', { class: 'ctrl-row ctrl-row--inline' },
    phylloGoldenBtn, markerWrap);

  const phylloHint = el('p', {
    class: 'ctrl-hint', id: 'phyllo-hint',
    text: 'At \u03C6\u00B2 divisor the spiral is fully packed \u2014 no gaps, no spokes.',
  });

  const phylloControls = el('div', { class: 'phyllo-controls grow-controls' },
    phylloAngleRow, phylloNRow, phylloInlineRow, phylloHint);

  const panelPhyllo = el('div', {
    class: 'grow-panel grow-panel--active',
    id: 'panel-phyllo',
    'data-panel': 'phyllo',
    role: 'tabpanel',
  }, demoWrapP, phylloControls);

  // ── Fractal tree panel ─────────────────────────────────────────────────────────
  const fracCanvas  = el('canvas', { class: 'fractal-canvas', 'aria-label': 'L-system fractal tree' });
  const demoWrapF   = el('div', { class: 'grow-demo-wrap' }, fracCanvas);

  // Angle row
  const fracAngleVal = el('span', { class: 'ctrl-value', id: 'frac-angle-val', text: '25\u00B0' });
  const fracAngleLbl = el('label', { class: 'ctrl-label', for: 'frac-angle', text: 'Branching angle\u00A0' });
  fracAngleLbl.appendChild(fracAngleVal);
  const fracAngleSlider = el('input', {
    type: 'range', id: 'frac-angle', class: 'ctrl-slider',
    min: '5', max: '90', step: '1', value: '25',
  });
  const fracAngleRow = el('div', { class: 'ctrl-row' }, fracAngleLbl, fracAngleSlider);

  // Depth row
  const fracDepthVal = el('span', { class: 'ctrl-value', id: 'frac-depth-val', text: '7' });
  const fracDepthLbl = el('label', { class: 'ctrl-label', for: 'frac-depth', text: 'Recursion depth\u00A0' });
  fracDepthLbl.appendChild(fracDepthVal);
  const fracDepthSlider = el('input', {
    type: 'range', id: 'frac-depth', class: 'ctrl-slider',
    min: '2', max: '10', step: '1', value: '7',
  });
  const fracDepthRow = el('div', { class: 'ctrl-row' }, fracDepthLbl, fracDepthSlider);

  // Ratio row
  const initRatio   = (1 / PHI).toFixed(3);
  const fracRatioVal = el('span', { class: 'ctrl-value', id: 'frac-ratio-val', text: initRatio });
  const fracRatioLbl = el('label', { class: 'ctrl-label', for: 'frac-ratio', text: 'Length ratio\u00A0' });
  fracRatioLbl.appendChild(fracRatioVal);
  const fracRatioSlider = el('input', {
    type: 'range', id: 'frac-ratio', class: 'ctrl-slider',
    min: '0.40', max: '0.85', step: '0.005', value: initRatio,
  });
  const fracRatioRow = el('div', { class: 'ctrl-row' }, fracRatioLbl, fracRatioSlider);

  // Toggle buttons
  const fracPhiBtn     = el('button', {
    class: 'ctrl-btn ctrl-btn--toggle ctrl-btn--active',
    id: 'frac-phi-mode',
    text: '\u03C6-mode ON',
  });
  const fracGoldAngBtn = el('button', {
    class: 'ctrl-btn',
    id: 'frac-golden-angle',
    text: '\u25C8 Golden angle mode (137.5\u00B0)',
  });
  const fracInlineRow  = el('div', { class: 'ctrl-row ctrl-row--inline' },
    fracPhiBtn, fracGoldAngBtn);

  const fracHint = el('p', {
    class: 'ctrl-hint', id: 'frac-hint',
    text: 'Depth = hierarchy level. Trunk = strategy. Branches = epics. Leaves = tasks. \u03C6-mode locks ratio to 1/\u03C6.',
  });

  const fracControls = el('div', { class: 'fractal-controls grow-controls' },
    fracAngleRow, fracDepthRow, fracRatioRow, fracInlineRow, fracHint);

  const panelFractal = el('div', {
    class: 'grow-panel',
    id: 'panel-fractal',
    'data-panel': 'fractal',
    role: 'tabpanel',
  }, demoWrapF, fracControls);
  panelFractal.hidden = true;

  // ── Assemble inner container ───────────────────────────────────────────────────
  const inner = el('div', { class: 'grow-inner' },
    header, tabNav, panelPhyllo, panelFractal);

  section.appendChild(bgCanvas);
  section.appendChild(inner);
}

// ══════════════════════════════════════════════════════════════════════════════════
// BACKGROUND -- Three.js PHI-spiral particle field
// 6 concentric rings at radii PHI^1 through PHI^6, each populated by the
// corresponding Fibonacci count (2, 3, 5, 8, 13, 21 particles).
// This directly models the PHI hierarchy: each ring is PHI x the one below.
// ══════════════════════════════════════════════════════════════════════════════════

function _initBackground(section) {
  const canvas = section.querySelector('.grow-bg');
  if (!canvas) return;

  setTimeout(() => {
    try {
      const parent = canvas.parentElement;
      const W = parent.clientWidth  || 800;
      const H = parent.clientHeight || 600;

      const renderer = createRenderer(canvas);

      let scene, camera;
      try {
        scene  = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 200);
        camera.position.set(0, 0, 40);
      } catch (e) {
        console.warn('[grow] background scene/camera init failed:', e);
        return;
      }

      const hexCol = accentToThreeHex();

      // Particle positions: 6 Fibonacci rings, each at radius PHI^(k+1)
      const FIB = [2, 3, 5, 8, 13, 21];
      const positions = [];

      FIB.forEach((count, ringIdx) => {
        const radius = Math.pow(PHI, ringIdx + 1) * 2.8;
        for (let i = 0; i < count; i++) {
          const theta = i * GOLDEN_ANGLE_DEG * (Math.PI / 180);
          const zOff  = (Math.random() - 0.5) * 4;
          positions.push(
            radius * Math.cos(theta),
            radius * Math.sin(theta),
            zOff
          );
        }
      });

      let pts;
      try {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
          color: hexCol,
          size: 0.45,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        });
        pts = new THREE.Points(geo, mat);
        scene.add(pts);
      } catch (e) {
        console.warn('[grow] background particles failed:', e);
      }

      // Connecting lines between adjacent rings (parent-child linkage)
      // <UNKNOWN> exact visual weight not specified; using low-opacity additive lines as default.
      try {
        const linePos = [];
        FIB.forEach((count, ringIdx) => {
          if (ringIdx === 0) return;
          const prevR = Math.pow(PHI, ringIdx)     * 2.8;
          const curR  = Math.pow(PHI, ringIdx + 1) * 2.8;
          const pairs = Math.min(count, FIB[ringIdx - 1]);
          for (let i = 0; i < pairs; i++) {
            const tPrev = i * GOLDEN_ANGLE_DEG * (Math.PI / 180);
            const tCur  = i * GOLDEN_ANGLE_DEG * (Math.PI / 180);
            linePos.push(
              prevR * Math.cos(tPrev), prevR * Math.sin(tPrev), 0,
              curR  * Math.cos(tCur),  curR  * Math.sin(tCur),  0
            );
          }
        });

        const lGeo = new THREE.BufferGeometry();
        lGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
        const lMat = new THREE.LineBasicMaterial({
          color: hexCol,
          transparent: true,
          opacity: 0.11,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        scene.add(new THREE.LineSegments(lGeo, lMat));
      } catch (e) {
        console.warn('[grow] background lines failed:', e);
      }

      // Animate: slow rotation, opacity pulse governed by PHI
      let animFrame;
      let t = 0;
      let running = true;

      const animate = () => {
        if (!running) return;
        animFrame = requestAnimationFrame(animate);
        t += 0.004;
        if (pts) {
          pts.rotation.z      = t * 0.12;
          pts.material.opacity = 0.4 + 0.25 * Math.sin(t * PHI);
        }
        renderer.render(scene, camera);
      };
      animate();

      // Camera aspect update on resize
      new ResizeObserver(() => {
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        if (w && h) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
      }).observe(parent);

      // Pause/resume when section leaves viewport
      // <UNKNOWN> -- no router teardown hook specified; IntersectionObserver as default.
      const vis = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          running = true;
          animate();
        } else {
          running = false;
          cancelAnimationFrame(animFrame);
        }
      }, { threshold: 0 });
      vis.observe(section);

    } catch (e) {
      console.warn('[grow] background Three.js block failed:', e);
    }
  }, 80);
}

// ══════════════════════════════════════════════════════════════════════════════════
// DEMO 1: PHYLLOTAXIS SLIDER
// Formula: theta = n * angle_deg * PI / 180,  r = c * sqrt(n)
// Golden angle: 360 / PHI^2 = ~137.5076 deg
// GCMT markers light up Fibonacci-count seeds with glow rings.
// ══════════════════════════════════════════════════════════════════════════════════

function _initPhyllotaxis(section) {
  const canvas        = section.querySelector('.phyllo-canvas');
  const sliderA       = section.querySelector('#phyllo-angle');
  const sliderN       = section.querySelector('#phyllo-n');
  const valA          = section.querySelector('#phyllo-angle-val');
  const valN          = section.querySelector('#phyllo-n-val');
  const btnGold       = section.querySelector('#phyllo-golden');
  const hintEl        = section.querySelector('#phyllo-hint');
  const markerBtns    = section.querySelectorAll('.ctrl-marker');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) { console.warn('[grow] phyllotaxis: no 2D context'); return; }

  let angleDeg = GOLDEN_ANGLE_DEG;
  let N        = 377;
  const DPR    = window.devicePixelRatio || 1;

  // Map a seed index to a Fibonacci ring ordinal (0-based)
  function seedRing(n) {
    const fibs = [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,800];
    for (let i = 0; i < fibs.length - 1; i++) {
      if (n >= fibs[i] && n < fibs[i + 1]) return i;
    }
    return fibs.length - 1;
  }

  function drawPhyllotaxis() {
    const W  = canvas.width  / DPR;
    const H  = canvas.height / DPR;
    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.min(W, H) * 0.46;
    const c    = maxR / Math.sqrt(Math.max(N, 1));
    const DOT  = Math.max(1.5, c * 0.52);
    const ga   = angleDeg * Math.PI / 180;

    const accentRaw = getAccentColor();
    const accent    = accentRaw.startsWith('#') ? accentRaw : '#C49A1F';

    ctx.save();
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, W, H);

    for (let n = 0; n < N; n++) {
      const theta = n * ga;
      const r     = c * Math.sqrt(n);
      const x     = cx + r * Math.cos(theta);
      const y     = cy + r * Math.sin(theta);
      const ring  = seedRing(n);
      const isGcmt = GCMT_MARKERS.some(m => n === m.n - 1);

      ctx.beginPath();
      ctx.arc(x, y, DOT, 0, Math.PI * 2);

      if (isGcmt) {
        ctx.fillStyle = hexToRgba(accent, 0.95);
        ctx.fill();
        // Outer glow ring
        ctx.beginPath();
        ctx.arc(x, y, DOT * 1.9, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(accent, 0.2);
        ctx.fill();
      } else {
        const shade = 0.28 + (ring % 3) * 0.18;
        ctx.fillStyle = `rgba(196,154,31,${shade})`;
        ctx.fill();
      }
    }

    ctx.restore();

    // Update hint
    if (hintEl) {
      const dev = Math.abs(angleDeg - GOLDEN_ANGLE_DEG);
      if (dev < 0.15) {
        hintEl.textContent =
          `At exactly ${angleDeg.toFixed(2)}\u00B0 -- the golden angle -- the spiral is fully packed.`;
      } else if (dev < 3) {
        hintEl.textContent =
          `${dev.toFixed(2)}\u00B0 off the golden angle -- faint spokes are forming.`;
      } else {
        hintEl.textContent =
          `${angleDeg.toFixed(1)}\u00B0 produces visible arm structure. Not optimal for packing.`;
      }
    }
  }

  function resizeAndDraw() {
    const parent = canvas.parentElement;
    const w = parent.clientWidth  || 600;
    const h = parent.clientHeight || 420;
    canvas.width  = w * DPR;
    canvas.height = h * DPR;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    drawPhyllotaxis();
  }

  let rAF = null;
  function scheduleDraw() {
    if (rAF) cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(() => { drawPhyllotaxis(); rAF = null; });
  }

  sliderA.addEventListener('input', () => {
    angleDeg = parseFloat(sliderA.value);
    valA.textContent = angleDeg.toFixed(2) + '\u00B0';
    scheduleDraw();
  });

  sliderN.addEventListener('input', () => {
    N = parseInt(sliderN.value, 10);
    valN.textContent = String(N);
    scheduleDraw();
  });

  btnGold.addEventListener('click', () => {
    angleDeg = GOLDEN_ANGLE_DEG;
    sliderA.value = angleDeg.toFixed(1);
    valA.textContent = angleDeg.toFixed(2) + '\u00B0';
    scheduleDraw();
  });

  markerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.n, 10);
      N = Math.min(n * 20, 800);
      sliderN.value = String(N);
      valN.textContent = String(N);
      markerBtns.forEach(b => b.classList.remove('ctrl-marker--active'));
      btn.classList.add('ctrl-marker--active');
      scheduleDraw();
    });
  });

  setTimeout(() => {
    resizeAndDraw();
    new ResizeObserver(resizeAndDraw).observe(canvas.parentElement);
  }, 80);
}

// ══════════════════════════════════════════════════════════════════════════════════
// DEMO 2: L-SYSTEM FRACTAL TREE
// Recursive Canvas 2D turtle drawing.
// phi-mode: branch length = parent / PHI at each level.
// golden-angle mode: branching angle = GOLDEN_ANGLE_DEG (phyllotaxis tree).
// ContextForge: depth=hierarchy, trunk=strategy, branches=epics, leaves=tasks.
// ══════════════════════════════════════════════════════════════════════════════════

function _initFractalTree(section) {
  const canvas       = section.querySelector('.fractal-canvas');
  const sliderAngle  = section.querySelector('#frac-angle');
  const sliderDepth  = section.querySelector('#frac-depth');
  const sliderRatio  = section.querySelector('#frac-ratio');
  const valAngle     = section.querySelector('#frac-angle-val');
  const valDepth     = section.querySelector('#frac-depth-val');
  const valRatio     = section.querySelector('#frac-ratio-val');
  const btnPhiMode   = section.querySelector('#frac-phi-mode');
  const btnGoldAng   = section.querySelector('#frac-golden-angle');
  const hintEl       = section.querySelector('#frac-hint');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) { console.warn('[grow] fractalTree: no 2D context'); return; }

  const DPR = window.devicePixelRatio || 1;

  let branchAngle = 25;      // degrees
  let depth       = 7;
  let ratio       = 1 / PHI; // phi-mode default
  let phiMode     = true;
  let goldenMode  = false;

  // Recursive branch: ctx is already translated to the base of this branch.
  // Draws upward then recurses for left and right children.
  function drawBranch(length, curDepth, maxDepth) {
    if (curDepth === 0 || length < 0.6) return;

    const accentRaw = getAccentColor();
    const accent    = accentRaw.startsWith('#') ? accentRaw : '#C49A1F';
    const frac      = curDepth / maxDepth;
    const alpha     = 0.2 + 0.75 * frac;
    const lineW     = Math.max(0.5, frac * 2.6);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -length);
    ctx.strokeStyle = hexToRgba(accent, alpha);
    ctx.lineWidth   = lineW;
    ctx.stroke();

    ctx.translate(0, -length);

    const childLen = phiMode ? length / PHI : length * ratio;
    const rad      = branchAngle * (Math.PI / 180);

    ctx.save();
    ctx.rotate(rad);
    drawBranch(childLen, curDepth - 1, maxDepth);
    ctx.restore();

    ctx.save();
    ctx.rotate(-rad);
    drawBranch(childLen, curDepth - 1, maxDepth);
    ctx.restore();
  }

  function drawTree() {
    const W  = canvas.width  / DPR;
    const H  = canvas.height / DPR;

    ctx.save();
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, W, H);

    const trunkLen = H * 0.26;

    ctx.save();
    ctx.translate(W / 2, H * 0.92);
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    drawBranch(trunkLen, depth, depth);
    ctx.restore();

    ctx.restore();

    if (hintEl) {
      if (goldenMode) {
        hintEl.textContent =
          'Golden angle mode (137.5\u00B0): branches spiral into phyllotaxis-like arcs.';
      } else if (phiMode) {
        hintEl.textContent =
          '\u03C6-mode: every sub-branch is 1/\u03C6 of its parent -- true Fibonacci proportions.';
      } else {
        hintEl.textContent =
          `Depth ${depth}: up to ${Math.pow(2, depth)} leaf nodes. Length ratio ${ratio.toFixed(3)}.`;
      }
    }
  }

  function resizeAndDraw() {
    const parent = canvas.parentElement;
    const w = parent.clientWidth  || 600;
    const h = parent.clientHeight || 420;
    canvas.width  = w * DPR;
    canvas.height = h * DPR;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    drawTree();
  }

  let rAF2 = null;
  function scheduleDraw2() {
    if (rAF2) cancelAnimationFrame(rAF2);
    rAF2 = requestAnimationFrame(() => { drawTree(); rAF2 = null; });
  }

  sliderAngle.addEventListener('input', () => {
    branchAngle = parseInt(sliderAngle.value, 10);
    valAngle.textContent = branchAngle + '\u00B0';
    goldenMode = false;
    btnGoldAng.classList.remove('ctrl-btn--active');
    scheduleDraw2();
  });

  sliderDepth.addEventListener('input', () => {
    depth = parseInt(sliderDepth.value, 10);
    valDepth.textContent = String(depth);
    scheduleDraw2();
  });

  sliderRatio.addEventListener('input', () => {
    ratio = parseFloat(sliderRatio.value);
    valRatio.textContent = ratio.toFixed(3);
    if (phiMode) {
      phiMode = false;
      btnPhiMode.textContent = '\u03C6-mode OFF';
      btnPhiMode.classList.remove('ctrl-btn--active');
    }
    scheduleDraw2();
  });

  btnPhiMode.addEventListener('click', () => {
    phiMode = !phiMode;
    if (phiMode) {
      ratio = 1 / PHI;
      sliderRatio.value    = ratio.toFixed(3);
      valRatio.textContent = ratio.toFixed(3);
      btnPhiMode.textContent = '\u03C6-mode ON';
      btnPhiMode.classList.add('ctrl-btn--active');
    } else {
      btnPhiMode.textContent = '\u03C6-mode OFF';
      btnPhiMode.classList.remove('ctrl-btn--active');
    }
    scheduleDraw2();
  });

  btnGoldAng.addEventListener('click', () => {
    goldenMode = !goldenMode;
    branchAngle = goldenMode ? Math.round(GOLDEN_ANGLE_DEG) : 25;
    sliderAngle.value    = String(branchAngle);
    valAngle.textContent = branchAngle + '\u00B0';
    btnGoldAng.classList.toggle('ctrl-btn--active', goldenMode);
    scheduleDraw2();
  });

  setTimeout(() => {
    resizeAndDraw();
    new ResizeObserver(resizeAndDraw).observe(canvas.parentElement);
  }, 80);
}

// ══════════════════════════════════════════════════════════════════════════════════
// TAB SWITCHER
// ══════════════════════════════════════════════════════════════════════════════════

function _initTabs(section) {
  const tabs   = section.querySelectorAll('.grow-tab');
  const panels = section.querySelectorAll('.grow-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => {
        t.classList.toggle('grow-tab--active', t.dataset.tab === target);
        t.setAttribute('aria-selected', t.dataset.tab === target ? 'true' : 'false');
      });

      panels.forEach(p => {
        const active = p.dataset.panel === target;
        p.hidden = !active;
        p.classList.toggle('grow-panel--active', active);
      });

      // Trigger canvas resize after tab shows so dimensions are non-zero
      requestAnimationFrame(() => {
        const pnl = section.querySelector(`.grow-panel[data-panel="${target}"]`);
        if (!pnl) return;
        // Guard: abort if this panel is no longer the active one (rapid tab switch)
        if (!pnl.classList.contains('grow-panel--active')) return;
        const c = pnl.querySelector('canvas');
        if (c) {
          const parent = c.parentElement;
          const w = parent.clientWidth  || 600;
          const h = parent.clientHeight || 420;
          const DPR = window.devicePixelRatio || 1;
          c.width  = w * DPR;
          c.height = h * DPR;
          c.style.width  = w + 'px';
          c.style.height = h + 'px';
          // The canvases will redraw via their own ResizeObserver,
          // but force an immediate redraw by dispatching a custom event.
          c.dispatchEvent(new CustomEvent('grow:resize'));
        }
      });
    });
  });
}
