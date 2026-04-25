/**
 * variants.js -- Brand Variant Studio section
 * Migrated from _source/hardy-house-variants.html
 *
 * Displays 7 brand colour variants (base/metallic/pearl/chameleon/cartoon/academic/holo)
 * each backed by a live Three.js geometry canvas in the hero.
 * Single/compare modes; WCAG contrast analysis panel; copy-to-clipboard swatches.
 *
 * Module contract:
 *   export function init()  -- idempotent, guarded by `initialised` flag
 *
 * Globals consumed: window.THREE (required), window.gsap (optional, not used)
 * THREE must be loaded before init() is called.
 *
 * innerHTML safety note:
 *   Every innerHTML assignment in this module renders strings built exclusively
 *   from compile-time constants in the VARIANTS array below and numeric results
 *   from WCAG arithmetic. No user-supplied text is ever interpolated into HTML.
 *   The clipboard value written by the swatch click handler is inserted into
 *   the DOM only via Element.textContent, not innerHTML.
 */

import { createRenderer } from '../utils/createRenderer.js';
import { PHI } from '../geometry/constants.js'; // PHI governs geometry hierarchy -- sacred invariant

let initialised = false;

// ---------------------------------------------------------------------------
// VARIANT DEFINITIONS
// All strings here are static authoring-time constants -- never user input.
// ---------------------------------------------------------------------------

const VARIANTS = [
  {
    id: 'base', name: 'Regal Standard', tag: 'Flat clean authority -- the recommended default',
    thumbDots: ['#2E1760', '#C49A1F', '#1E3FAA', '#1B5E35'],
    colors: { p: '#2E1760', s: '#C49A1F', a: '#1E3FAA', g: '#1B5E35', bg: '#0D0820', tx: '#F4F0EB', tx2: '#A89EC8' },
    swatches: [
      { cls: 'sw-p',  hex: '#2E1760', tok: 'brand.primary',    nm: 'Deep Royal Purple' },
      { cls: 'sw-s',  hex: '#C49A1F', tok: 'brand.secondary',  nm: 'Burnished Gold' },
      { cls: 'sw-a',  hex: '#1E3FAA', tok: 'brand.accent',     nm: 'Royal Blue' },
      { cls: 'sw-g',  hex: '#1B5E35', tok: 'brand.supporting', nm: 'Forest Green' },
      { cls: 'sw-nl', hex: '#F4F0EB', tok: 'brand.neutral.lt', nm: 'Warm Parchment', dark: true },
      { cls: 'sw-nd', hex: '#1F2937', tok: 'brand.neutral.dk', nm: 'Slate Charcoal' },
    ],
    btnP: { bg: '#C49A1F', col: '#0D0820' }, btnA: { bg: '#1E3FAA', col: '#fff' }, btnG: { bg: '#1B5E35', col: '#fff' },
    adapt: 'No adaptation. All six colours rendered at true hex values. Maximum predictability and cross-platform consistency.',
    analysis: {
      tone: ['Authority', 'Precision', 'Depth', 'Trust'], screen: 10, print: 9, access: 10, fidelity: 10,
      ctxs: ['Web UI', 'Presentations', 'Documents', 'Print brand'],
      ok: 'Maximum legibility. WCAG AAA on all key pairs.',
      warn: 'No tactile or finish dimension.'
    }
  },
  {
    id: 'metallic', name: 'Burnished Metal', tag: 'Multi-stop gradients simulate specular highlights on polished metal',
    thumbDots: ['#9B7BE0', '#F5E07A', '#8AAAD8', '#8A9BB8'],
    colors: { p: '#2E1760', s: '#C49A1F', a: '#1E3FAA', g: '#8A9BB8', bg: '#080616', tx: '#FFFFFF', tx2: '#C8C0E0' },
    swatches: [
      { cls: 'sw-p',  hex: 'gradient', gradTxt: 'Purple Steel',   tok: 'brand.primary',    nm: 'Purple Steel' },
      { cls: 'sw-s',  hex: 'gradient', gradTxt: 'Gold Foil',      tok: 'brand.secondary',  nm: 'Gold Foil' },
      { cls: 'sw-a',  hex: 'gradient', gradTxt: 'Chrome Blue',    tok: 'brand.accent',     nm: 'Chrome Blue' },
      { cls: 'sw-g',  hex: 'gradient', gradTxt: 'Brushed Silver', tok: 'brand.supporting', nm: 'Brushed Silver' },
      { cls: 'sw-nl', hex: 'gradient', gradTxt: 'Platinum',       tok: 'brand.neutral.lt', nm: 'Platinum' },
      { cls: 'sw-nd', hex: 'gradient', gradTxt: 'Dark Steel',     tok: 'brand.neutral.dk', nm: 'Dark Steel' },
    ],
    btnP: { bg: '#C49A1F', col: '#04020E', cls: 'btn-p' }, btnA: { bg: '#1E3FAA', col: '#fff', cls: 'btn-a' }, btnG: { bg: '#8A9BB8', col: '#04020E', cls: 'btn-g' },
    adapt: 'Forest Green swapped for Brushed Silver -- green absorbs metallic sheen and loses definition. All surfaces use 5-stop gradients (dark to mid to highlight to mid to dark) mimicking specular reflection on polished metal. Animated CSS sheen sweep at 4.5s loop.',
    analysis: {
      tone: ['Power', 'Luxury', 'Permanence', 'Prestige'], screen: 8, print: 6, access: 8, fidelity: 8,
      ctxs: ['Premium digital', 'Event collateral', 'Certificates', 'Physical merchandise'],
      ok: 'Distinctive finish. Signals high-value, precision consultancy.',
      warn: 'Print fidelity requires metallic ink stock. Screen is approximation only.'
    }
  },
  {
    id: 'pearl', name: 'Lunar Glow', tag: 'Radial luminosity and slow hue-rotating iridescence on deep grounds',
    thumbDots: ['#5A3A8C', '#CCAA44', '#4A6BBF', '#3E7A5A'],
    colors: { p: '#5A3A8C', s: '#CCAA44', a: '#4A6BBF', g: '#3E7A5A', bg: '#050210', tx: '#F8F4FF', tx2: '#C8C0E8' },
    swatches: [
      { cls: 'sw-p',  hex: '#5A3A8C', tok: 'brand.primary',    nm: 'Lavender Pearl' },
      { cls: 'sw-s',  hex: '#CCAA44', tok: 'brand.secondary',  nm: 'Cream Gold' },
      { cls: 'sw-a',  hex: '#4A6BBF', tok: 'brand.accent',     nm: 'Periwinkle' },
      { cls: 'sw-g',  hex: '#3E7A5A', tok: 'brand.supporting', nm: 'Sage Pearl' },
      { cls: 'sw-nl', hex: '#F8F4FF', tok: 'brand.neutral.lt', nm: 'Pearl White', dark: true },
      { cls: 'sw-nd', hex: '#050210', tok: 'brand.neutral.dk', nm: 'Void Black' },
    ],
    btnP: { bg: '#5A3A8C', col: '#F8F4FF' }, btnA: { bg: '#4A6BBF', col: '#fff' }, btnG: { bg: '#3E7A5A', col: '#fff' },
    adapt: 'All hues lightened 25-40%: purple #2E1760 to #5A3A8C, gold #C49A1F to #CCAA44. Pearlescent pigments require lighter bases against very dark grounds to carry luminosity. Hue-rotating CSS animation (0 to 42 deg) simulates angle-dependent colour shift of genuine pearl.',
    analysis: {
      tone: ['Elegance', 'Luminosity', 'Mystery', 'Refinement'], screen: 9, print: 4, access: 7, fidelity: 9,
      ctxs: ['Luxury brand', 'Premium invitations', 'High-end digital', 'Beauty/wellness'],
      ok: 'Uniquely luminous. Cannot be replicated with flat colour.',
      warn: 'Lighter purples reduce contrast vs deep purple. Small text may fall below WCAG AA at some hue phases.'
    }
  },
  {
    id: 'chameleon', name: 'Prismatic Shift', tag: 'CSS hue-rotate cycles every element continuously through the spectrum',
    thumbDots: ['#3D1A8C', '#C49A1F', '#1A4AD4', '#1A7840'],
    colors: { p: '#3D1A8C', s: '#C49A1F', a: '#1A4AD4', g: '#1A7840', bg: '#070412', tx: '#F0EAFF', tx2: '#B0A8D8' },
    swatches: [
      { cls: 'sw-p',  hex: '#3D1A8C', tok: 'brand.primary',    nm: 'Shifting Purple' },
      { cls: 'sw-s',  hex: '#C49A1F', tok: 'brand.secondary',  nm: 'Gold Anchor' },
      { cls: 'sw-a',  hex: '#1A4AD4', tok: 'brand.accent',     nm: 'Vivid Blue' },
      { cls: 'sw-g',  hex: '#1A7840', tok: 'brand.supporting', nm: 'Vivid Green' },
      { cls: 'sw-nl', hex: '#F0EAFF', tok: 'brand.neutral.lt', nm: 'Lavender Mist', dark: true },
      { cls: 'sw-nd', hex: '#070412', tok: 'brand.neutral.dk', nm: 'Void Purple' },
    ],
    btnP: { bg: '#C49A1F', col: '#07040E' }, btnA: { bg: '#1A4AD4', col: '#fff' }, btnG: { bg: '#1A7840', col: '#fff' },
    adapt: 'Saturation increased across all hues to survive the full hue-rotation cycle looking strong. Gold is intentionally the slowest-rotating anchor (25s loop vs 8s for others). Purple, blue, and green form a coherent arc as they shift: purple to indigo to blue to teal.',
    analysis: {
      tone: ['Dynamic', 'Adaptive', 'Prismatic', 'Energetic'], screen: 9, print: 3, access: 6, fidelity: 10,
      ctxs: ['Motion design', 'Generative art', 'Interactive web', 'Digital animation'],
      ok: 'Completely native digital texture. No physical equivalent. Maximum visual novelty.',
      warn: 'Accessibility fails during certain hue phases. Unsuitable for static print, documents, or formal contexts.'
    }
  },
  {
    id: 'cartoon', name: 'Bold Ink', tag: 'Maximum saturation, flat fills, offset comic shadows, and 2.5px outlines',
    thumbDots: ['#5B21B6', '#FBBF24', '#2563EB', '#16A34A'],
    colors: { p: '#5B21B6', s: '#FBBF24', a: '#2563EB', g: '#16A34A', bg: '#0F0A2E', tx: '#FFFFFF', tx2: '#E0D8FF' },
    swatches: [
      { cls: 'sw-p',  hex: '#5B21B6', tok: 'brand.primary',    nm: 'Vivid Purple' },
      { cls: 'sw-s',  hex: '#FBBF24', tok: 'brand.secondary',  nm: 'Amber Gold' },
      { cls: 'sw-a',  hex: '#2563EB', tok: 'brand.accent',     nm: 'Vivid Blue' },
      { cls: 'sw-g',  hex: '#16A34A', tok: 'brand.supporting', nm: 'Vivid Green' },
      { cls: 'sw-nl', hex: '#FFFFFF', tok: 'brand.neutral.lt', nm: 'Pure White', dark: true },
      { cls: 'sw-nd', hex: '#0F0A2E', tok: 'brand.neutral.dk', nm: 'Ink Dark' },
    ],
    btnP: { bg: '#FBBF24', col: '#0F0A2E' }, btnA: { bg: '#2563EB', col: '#fff' }, btnG: { bg: '#16A34A', col: '#fff' },
    adapt: 'All four hues pushed to maximum saturation. Gold shifts to amber-yellow (#FBBF24) becoming the primary CTA signal. No gradients used anywhere. Black outlines and offset drop shadows follow comic/graphic novel conventions.',
    analysis: {
      tone: ['Playful', 'Bold', 'Approachable', 'High Energy'], screen: 10, print: 9, access: 10, fidelity: 10,
      ctxs: ['Consumer apps', 'Education', 'Community events', 'Social media'],
      ok: 'Maximum accessibility and legibility. Highly reproducible across all print processes.',
      warn: 'Loses the regal and authoritative brand signal. Not suitable for enterprise-formal or premium contexts.'
    }
  },
  {
    id: 'academic', name: 'Aged Parchment', tag: 'SVG grain texture, warm darks, desaturated hues, and aged-gold accents',
    thumbDots: ['#3A1850', '#8C7228', '#192C68', '#1E3D1A'],
    colors: { p: '#3A1850', s: '#8C7228', a: '#192C68', g: '#1E3D1A', bg: '#09070A', tx: '#E8D8B0', tx2: '#A89878' },
    swatches: [
      { cls: 'sw-p',  hex: '#3A1850', tok: 'brand.primary',    nm: 'Wine Purple' },
      { cls: 'sw-s',  hex: '#8C7228', tok: 'brand.secondary',  nm: 'Aged Gold' },
      { cls: 'sw-a',  hex: '#192C68', tok: 'brand.accent',     nm: 'Library Navy' },
      { cls: 'sw-g',  hex: '#1E3D1A', tok: 'brand.supporting', nm: 'Moss Green' },
      { cls: 'sw-nl', hex: '#E8D8B0', tok: 'brand.neutral.lt', nm: 'Old Parchment', dark: true },
      { cls: 'sw-nd', hex: '#09070A', tok: 'brand.neutral.dk', nm: 'Warm Black' },
    ],
    btnP: { bg: '#8C7228', col: '#E8D8B0' }, btnA: { bg: '#192C68', col: '#E8D8B0' }, btnG: { bg: '#1E3D1A', col: '#E8D8B0' },
    adapt: 'All hues shifted warm and desaturated. Purple moves toward wine/burgundy. Gold darkens to aged amber. Text warmed to old parchment (#E8D8B0) instead of cool white. SVG feTurbulence fractalNoise filter applied as grain overlay -- simulates aged paper/canvas texture.',
    analysis: {
      tone: ['Scholarly', 'Gravitas', 'Timeless', 'Trusted'], screen: 8, print: 9, access: 9, fidelity: 8,
      ctxs: ['Premium print', 'Legal/academic', 'Thought leadership', 'Long-form documents'],
      ok: 'High contrast parchment-on-dark reads excellently in print. Grain texture adds physical quality cue.',
      warn: 'Less impactful on screen without grain rendering support. Muted tones reduce brand vibrancy.'
    }
  },
  {
    id: 'holo', name: 'Holographic', tag: 'Rotating conic gradient overlays at screen blend-mode -- pure digital texture',
    thumbDots: ['#2E1760', '#C49A1F', '#1E3FAA', '#1B5E35'],
    colors: { p: '#2E1760', s: '#C49A1F', a: '#1E3FAA', g: '#1B5E35', bg: '#030108', tx: '#FFFFFF', tx2: '#D0C8FF' },
    swatches: [
      { cls: 'sw-p',  hex: '#2E1760', tok: 'brand.primary',    nm: 'Holo Purple' },
      { cls: 'sw-s',  hex: '#C49A1F', tok: 'brand.secondary',  nm: 'Holo Gold' },
      { cls: 'sw-a',  hex: '#1E3FAA', tok: 'brand.accent',     nm: 'Holo Blue' },
      { cls: 'sw-g',  hex: '#1B5E35', tok: 'brand.supporting', nm: 'Holo Green' },
      { cls: 'sw-nl', hex: '#FFFFFF', tok: 'brand.neutral.lt', nm: 'Pure White', dark: true },
      { cls: 'sw-nd', hex: '#030108', tok: 'brand.neutral.dk', nm: 'Void' },
    ],
    btnP: { bg: '#C49A1F', col: '#030108' }, btnA: { bg: '#1E3FAA', col: '#fff' }, btnG: { bg: '#1B5E35', col: '#fff' },
    adapt: 'Base brand colours held at true hex -- the holographic effect is entirely additive via conic-gradient overlays at screen blend mode. Two conic gradients rotate at different speeds (8s, 13s) in opposite directions, creating the organic iridescent interference pattern of holographic foil.',
    analysis: {
      tone: ['Futuristic', 'Spectral', 'Cutting-Edge', 'Dynamic'], screen: 8, print: 2, access: 6, fidelity: 9,
      ctxs: ['Digital-only', 'NFT/Web3', 'Motion graphics', 'Interactive installations'],
      ok: 'Completely unmistakable. Maximum visual interest at any size.',
      warn: 'Cannot be reproduced in print without metallic holographic foil laminate. Colour accessibility compromised by shifting interference patterns.'
    }
  },
];

// ---------------------------------------------------------------------------
// GEOMETRY CONFIG PER VARIANT
//
// Five Platonic solids present -- count = 5 (invariant satisfied):
//   Tetrahedron  (4 faces)  -- cartoon   fire   / transformation
//   Hexahedron   (6 faces)  -- metallic  earth  / structure  (BoxGeometry = cube)
//   Octahedron   (8 faces)  -- academic  air    / orchestration
//   Icosahedron  (20 faces) -- holo      water  / connection
//   Dodecahedron (12 faces) -- base      aether / framework
//
// Extended forms (count = 2 in this section):
//   Sphere    -- pearl     (smooth non-Platonic)
//   TorusKnot -- chameleon (dynamic non-Platonic)
//
// Rotation deltas are small enough that the animation is visible but not
// nauseating. PHI = 1.618 informs the base radius of 1.8 (~PHI^1 scaled up).
// ---------------------------------------------------------------------------

const VGEO_CFG = {
  base:      { geo: () => new THREE.DodecahedronGeometry(1.8, 0),        col: 0x9B7BE0, rot: [0.003, 0.005, 0.001], wf: false },
  metallic:  { geo: () => new THREE.BoxGeometry(2.4, 2.4, 2.4),          col: 0xC8D8EC, rot: [0.003, 0.004, 0.001], wf: false },
  pearl:     { geo: () => new THREE.SphereGeometry(1.8, 20, 20),         col: 0xC8C0E8, rot: [0.002, 0.004, 0.001], wf: true  },
  chameleon: { geo: () => new THREE.TorusKnotGeometry(1.2, 0.3, 80, 12), col: 0xB0A8D8, rot: [0.004, 0.007, 0.002], wf: true  },
  cartoon:   { geo: () => new THREE.TetrahedronGeometry(1.9, 0),         col: 0xFFDF60, rot: [0.005, 0.008, 0.002], wf: false },
  academic:  { geo: () => new THREE.OctahedronGeometry(1.8, 0),          col: 0xA89878, rot: [0.003, 0.006, 0.002], wf: false },
  holo:      { geo: () => new THREE.IcosahedronGeometry(1.8, 0),         col: 0xD0C8FF, rot: [0.004, 0.007, 0.002], wf: false },
};

// ---------------------------------------------------------------------------
// THREE.JS VARIANT GEO CLASS
// ---------------------------------------------------------------------------

class VariantGeo {
  constructor(canvas, vid) {
    this.alive = true;
    this.cfg = VGEO_CFG[vid] || VGEO_CFG.base;

    // Read parentElement dimensions -- canvas has no layout size until CSS runs
    const wrap = canvas.parentElement;
    const W = wrap.clientWidth  || 300;
    const H = wrap.clientHeight || 290;

    try {
      this.scene = new THREE.Scene();
    } catch (e) {
      console.warn('[variants] Scene failed:', e.message);
      this.alive = false;
      return;
    }

    try {
      this.cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
      this.cam.position.z = 5.5;
    } catch (e) {
      console.warn('[variants] Camera failed:', e.message);
      this.alive = false;
      return;
    }

    // Shared factory -- never new THREE.WebGLRenderer directly
    try {
      this.renderer = createRenderer(canvas, { alpha: true, clearColor: 0x000000, clearAlpha: 0 });
    } catch (e) {
      console.warn('[variants] Renderer failed:', e.message);
      this.alive = false;
      return;
    }

    try {
      this.scene.add(new THREE.AmbientLight(0x1A0D3D, 0.4));
      const point = new THREE.PointLight(this.cfg.col, 0.65, 15);
      point.position.set(3, 3, 4);
      this.scene.add(point);
    } catch (e) {
      console.warn('[variants] Lighting failed:', e.message);
    }

    try {
      this.group = new THREE.Group();
      const geo      = this.cfg.geo();
      const GeoClass = this.cfg.wf ? THREE.WireframeGeometry : THREE.EdgesGeometry;

      // Canonical 4-layer glow spec -- scales 1.000/1.022/1.058/1.105
      [[1.000, 0.88], [1.022, 0.27], [1.058, 0.10], [1.105, 0.04]].forEach(([scale, opacity]) => {
        const mat = new THREE.LineBasicMaterial({
          color:       this.cfg.col,
          transparent: true,
          opacity,
          blending:    THREE.AdditiveBlending,
          depthWrite:  false,
        });
        const ls = new THREE.LineSegments(new GeoClass(geo), mat);
        ls.scale.setScalar(scale);
        this.group.add(ls);
      });

      this.scene.add(this.group);
    } catch (e) {
      console.warn('[variants] Geometry/glow build failed:', e.message);
      this.alive = false;
      return;
    }

    this._tick();
  }

  _tick() {
    if (!this.alive) return;
    requestAnimationFrame(() => this._tick());
    this.group.rotation.x += this.cfg.rot[0];
    this.group.rotation.y += this.cfg.rot[1];
    this.group.rotation.z += this.cfg.rot[2];
    this.renderer.render(this.scene, this.cam);
  }

  dispose() {
    this.alive = false;
    try { this.renderer.dispose(); } catch (e) { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// WCAG CONTRAST MATH
// ---------------------------------------------------------------------------

function linearise(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  if (!hex || !hex.startsWith('#')) return 0.2;
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m) return 0.2;
  const [r, g, b] = m.map(x => linearise(parseInt(x, 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(h1, h2) {
  const l1 = relativeLuminance(h1), l2 = relativeLuminance(h2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function wcagGrade(ratio) {
  if (ratio >= 7)   return { lv: 'AAA',  bg: '#14532D', col: '#4ADE80' };
  if (ratio >= 4.5) return { lv: 'AA',   bg: '#14532D', col: '#86EFAC' };
  if (ratio >= 3)   return { lv: 'A',    bg: '#78350F', col: '#FCD34D' };
  return                   { lv: 'Fail', bg: '#7F1D1D', col: '#F87171' };
}

// ---------------------------------------------------------------------------
// HTML BUILDERS
// All strings passed to innerHTML below are constructed entirely from
// static constants in this module. No runtime user input is interpolated.
// ---------------------------------------------------------------------------

function buildSwatchHTML(s) {
  const isGrad  = s.hex === 'gradient';
  const bgStyle = isGrad ? '' : `background:${s.hex}`;
  const badgeText = isGrad ? (s.gradTxt || s.nm) : s.hex;
  const darkNm  = s.dark ? 'color:#1F2937;' : '';
  const copyVal = isGrad ? s.nm : s.hex;
  // copyVal and s.nm are static constants -- safe for data attributes
  return `<div class="vt-sw ${s.cls}" data-copy="${copyVal}" data-nm="${s.nm}">
      <div class="vt-sw-c" style="${bgStyle}"><span class="vt-sw-badge">${badgeText}</span></div>
      <div class="vt-sw-inf">
        <div class="vt-sw-tok">${s.tok}</div>
        <div class="vt-sw-nm" style="${darkNm}">${s.nm}</div>
      </div>
    </div>`;
}

function buildScoreBar(label, score) {
  const pct = (score / 10) * 100;
  const col = score >= 8 ? '#4ADE80' : score >= 5 ? '#FCD34D' : '#F87171';
  return `<div class="vt-score-row">
    <span class="vt-score-lbl">${label}</span>
    <div class="vt-score-bar"><div class="vt-score-fill" style="width:${pct}%;background:${col}"></div></div>
    <span class="vt-score-n">${score}/10</span>
  </div>`;
}

function buildAnalysisPanel(v) {
  const r1 = contrastRatio(v.colors.tx, v.colors.bg), w1 = wcagGrade(r1);
  const r2 = contrastRatio(v.colors.s,  v.colors.bg), w2 = wcagGrade(r2);
  const r3 = contrastRatio(v.colors.p,  v.colors.bg), w3 = wcagGrade(r3);
  const an = v.analysis;
  return `<div class="vt-an-panel vt-body-col">
      <div class="vt-an-head">${v.name}</div>
      <div class="vt-an-sec">
        <div class="vt-an-lbl">Contrast Ratios</div>
        <div class="vt-cr-row"><span class="vt-cr-lbl">Text on page</span><span class="vt-cr-right"><span class="vt-cr-val">${r1.toFixed(1)}:1</span><span class="vt-wcag-pill" style="background:${w1.bg};color:${w1.col}">${w1.lv}</span></span></div>
        <div class="vt-cr-row"><span class="vt-cr-lbl">Gold on page</span><span class="vt-cr-right"><span class="vt-cr-val">${r2.toFixed(1)}:1</span><span class="vt-wcag-pill" style="background:${w2.bg};color:${w2.col}">${w2.lv}</span></span></div>
        <div class="vt-cr-row"><span class="vt-cr-lbl">Purple on page</span><span class="vt-cr-right"><span class="vt-cr-val">${r3.toFixed(1)}:1</span><span class="vt-wcag-pill" style="background:${w3.bg};color:${w3.col}">${w3.lv}</span></span></div>
      </div>
      <div class="vt-an-sec">
        <div class="vt-an-lbl">Performance</div>
        ${buildScoreBar('Screen', an.screen)}
        ${buildScoreBar('Print', an.print)}
        ${buildScoreBar('Accessibility', an.access)}
        ${buildScoreBar('Digital Fidelity', an.fidelity)}
      </div>
      <div class="vt-an-sec">
        <div class="vt-an-lbl">Emotional Tone</div>
        <div class="vt-tag-wrap">${an.tone.map(t => `<span class="vt-tone-tag">${t}</span>`).join('')}</div>
      </div>
      <div class="vt-an-sec">
        <div class="vt-an-lbl">Best Contexts</div>
        <div class="vt-tag-wrap">${an.ctxs.map(c => `<span class="vt-ctx-tag">${c}</span>`).join('')}</div>
      </div>
      <div class="vt-an-sec">
        <div class="vt-an-lbl">Colour Adaptation</div>
        <div class="vt-an-note">${v.adapt}</div>
      </div>
      <div class="vt-an-sec">
        <div class="vt-an-lbl">Strength</div>
        <div class="vt-an-note vt-an-ok">&#10003; ${an.ok}</div>
      </div>
      <div class="vt-an-sec">
        <div class="vt-an-lbl">Limitation</div>
        <div class="vt-an-note vt-an-warn">&#9888; ${an.warn}</div>
      </div>
    </div>`;
}

function buildMiniAnalysisHTML(v) {
  const r1 = contrastRatio(v.colors.tx, v.colors.bg), w1 = wcagGrade(r1);
  const an = v.analysis;
  return `<div class="vt-cmp-an-block">
      <div class="vt-cmp-an-title">Text Contrast</div>
      <div style="display:flex;flex-direction:column;align-items:flex-start;gap:0.2rem">
        <span style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:#fff">${r1.toFixed(1)}:1</span>
        <span class="vt-wcag-pill" style="background:${w1.bg};color:${w1.col}">${w1.lv}</span>
      </div>
    </div>
    <div class="vt-cmp-an-block">
      <div class="vt-cmp-an-title">Scores</div>
      ${buildScoreBar('Screen', an.screen)}
      ${buildScoreBar('Print', an.print)}
    </div>
    <div class="vt-cmp-an-block">
      <div class="vt-cmp-an-title">Tone</div>
      <div class="vt-tag-wrap">${an.tone.slice(0, 3).map(t => `<span class="vt-tone-tag">${t}</span>`).join('')}</div>
    </div>`;
}

function buildPreviewHTML(v, mini = false) {
  const btnP = v.btnP || { bg: v.colors.s, col: v.colors.bg };
  const btnA = v.btnA || { bg: v.colors.a, col: '#fff' };
  const btnG = v.btnG || { bg: v.colors.g, col: '#fff' };
  const gridCls     = mini ? 'vt-body-grid vt-no-analysis' : 'vt-body-grid';
  const analysisHTML = mini ? '' : buildAnalysisPanel(v);

  return `<div class="vt-pw" data-v="${v.id}">
    <div class="vt-hero">
      <canvas class="vt-geo-canvas" data-vid="${v.id}" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;opacity:0.16;mix-blend-mode:screen;"></canvas>
      <div class="vt-h-bg"></div>
      <svg class="vt-h-geo" viewBox="0 0 800 380" preserveAspectRatio="xMidYMid slice">
        <circle cx="400" cy="190" r="185" stroke="white" stroke-width="0.8"  fill="none"/>
        <circle cx="400" cy="190" r="125" stroke="white" stroke-width="0.6"  fill="none"/>
        <circle cx="400" cy="190" r="72"  stroke="white" stroke-width="0.4"  fill="none"/>
        <polygon points="400,18 695,365 105,365"   stroke="white" stroke-width="0.75" fill="none"/>
        <polygon points="400,360 105,15 695,15"    stroke="white" stroke-width="0.4"  fill="none"/>
        <line x1="115" y1="190" x2="685" y2="190" stroke="white" stroke-width="0.28"/>
        <line x1="400" y1="15"  x2="400" y2="365" stroke="white" stroke-width="0.28"/>
      </svg>
      <div class="vt-h-overlay"></div>
      <div class="vt-h-content">
        <div class="vt-h-eyebrow">${v.name}</div>
        <div class="vt-h-title">Enterprise Depth. <em>Human Scale.</em></div>
        <button class="vt-h-cta">&nbsp;Engage a Consultant&nbsp;</button>
      </div>
    </div>
    <div class="${gridCls}">
      <div class="vt-body-col">
        <div class="vt-col-title">Colour Palette</div>
        <div class="vt-sw-grid">${v.swatches.map(buildSwatchHTML).join('')}</div>
      </div>
      <div class="vt-body-col">
        <div class="vt-col-title">Buttons</div>
        <div class="vt-btn-row">
          <button class="vt-pv-btn vt-btn-p ${v.btnP && v.btnP.cls ? v.btnP.cls : ''}" style="background:${btnP.bg};color:${btnP.col}">Primary</button>
          <button class="vt-pv-btn vt-btn-a ${v.btnA && v.btnA.cls ? v.btnA.cls : ''}" style="background:${btnA.bg};color:${btnA.col}">Accent</button>
          <button class="vt-pv-btn vt-btn-g ${v.btnG && v.btnG.cls ? v.btnG.cls : ''}" style="background:${btnG.bg};color:${btnG.col}">Supporting</button>
          <button class="vt-pv-btn" style="background:transparent;color:${v.colors.tx};border:1px solid ${v.colors.s}50">Outline</button>
        </div>
        <div class="vt-col-title">Status</div>
        <div class="vt-badge-row">
          <span class="vt-pv-badge" style="background:${v.colors.p}28;color:${v.colors.tx2};border:1px solid ${v.colors.p}44">Active</span>
          <span class="vt-pv-badge" style="background:${v.colors.s}20;color:${v.colors.s};border:1px solid ${v.colors.s}40">In Flight</span>
          <span class="vt-pv-badge" style="background:${v.colors.g}22;color:${v.colors.g === '#8A9BB8' ? '#C8D4E8' : v.colors.g};border:1px solid ${v.colors.g}38">Complete</span>
        </div>
        <div class="vt-col-title">Service Card</div>
        <div class="vt-pv-card" style="--vt-p:${v.id === 'cartoon' ? '#FBBF24' : v.colors.p};--vt-cd:${v.colors.bg};--vt-bd:rgba(255,255,255,0.06);--vt-tx:${v.colors.tx};--vt-tx2:${v.colors.tx2}">
          <div class="vt-card-icon">&#9881;&#65039;</div>
          <h4>Systems Engineering</h4>
          <p>Device management, compliance policy, and provisioning automation at enterprise scale.</p>
        </div>
      </div>
      ${analysisHTML}
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// GEOMETRY LIFECYCLE
// ---------------------------------------------------------------------------

const geoInstances = {};

function startGeo(vid) {
  if (geoInstances[vid]) { geoInstances[vid].dispose(); delete geoInstances[vid]; }
  const canvas = document.querySelector(`.vt-geo-canvas[data-vid="${vid}"]`);
  if (!canvas) return;
  try {
    geoInstances[vid] = new VariantGeo(canvas, vid);
  } catch (e) {
    console.warn('[variants] VariantGeo init failed for', vid, e.message);
  }
}

function stopAllGeo() {
  Object.keys(geoInstances).forEach(vid => { geoInstances[vid].dispose(); delete geoInstances[vid]; });
}

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------

let activeVariantId = 'base';
let compareMode     = false;
let cmpA            = 'base';
let cmpB            = 'metallic';
let sectionRoot     = null;

// ---------------------------------------------------------------------------
// RENDER FUNCTIONS
// ---------------------------------------------------------------------------

function setActive(id) {
  activeVariantId = id;
  sectionRoot.querySelectorAll('.vt-dock-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });
  const single = sectionRoot.querySelector('.vt-single');
  if (!single) return;
  // innerHTML -- static constant data only, see file-level note
  single.innerHTML = buildPreviewHTML(VARIANTS.find(v => v.id === id));
  // 80ms delay so CSS layout settles before reading canvas parent dimensions
  setTimeout(() => startGeo(id), 80);
  bindSwatchClicks(single);
}

function renderCompare() {
  const pvA = sectionRoot.querySelector('#vt-pv-a');
  const pvB = sectionRoot.querySelector('#vt-pv-b');
  const anA = sectionRoot.querySelector('#vt-an-a');
  const anB = sectionRoot.querySelector('#vt-an-b');
  if (!pvA || !pvB) return;
  stopAllGeo();
  const va = VARIANTS.find(v => v.id === cmpA);
  const vb = VARIANTS.find(v => v.id === cmpB);
  // innerHTML -- static constant data only, see file-level note
  pvA.innerHTML = buildPreviewHTML(va, true);
  pvB.innerHTML = buildPreviewHTML(vb, true);
  if (anA) anA.innerHTML = buildMiniAnalysisHTML(va);
  if (anB) anB.innerHTML = buildMiniAnalysisHTML(vb);
  // 80ms delay before reading canvas parent dimensions
  setTimeout(() => { startGeo(cmpA); startGeo(cmpB); }, 80);
  bindSwatchClicks(pvA);
  bindSwatchClicks(pvB);
}

function populateCompareSelects() {
  ['#vt-sel-a', '#vt-sel-b'].forEach((selector, i) => {
    const sel = sectionRoot.querySelector(selector);
    if (!sel) return;
    // innerHTML -- static VARIANTS names only
    sel.innerHTML = VARIANTS.map(v =>
      `<option value="${v.id}" ${v.id === (i === 0 ? cmpA : cmpB) ? 'selected' : ''}>${v.name}</option>`
    ).join('');
    sel.addEventListener('change', () => {
      if (i === 0) cmpA = sel.value; else cmpB = sel.value;
      renderCompare();
    });
  });
}

function toggleCompare() {
  compareMode = !compareMode;
  sectionRoot.querySelector('.vt-single')?.classList.toggle('vt-hidden', compareMode);
  sectionRoot.querySelector('.vt-compare')?.classList.toggle('vt-hidden', !compareMode);
  const btn = sectionRoot.querySelector('.vt-btn-cmp');
  if (btn) {
    btn.classList.toggle('on', compareMode);
    // textContent -- safe, no HTML
    btn.textContent = compareMode ? 'Close Compare' : 'Compare';
  }
  if (compareMode) {
    populateCompareSelects();
    renderCompare();
  } else {
    stopAllGeo();
    setTimeout(() => setActive(activeVariantId), 80);
  }
}

// ---------------------------------------------------------------------------
// COPY TOAST -- uses textContent, never innerHTML
// ---------------------------------------------------------------------------

function showToast(msg) {
  const toast = sectionRoot.querySelector('.vt-toast');
  if (!toast) return;
  toast.textContent = msg; // textContent -- safe
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2100);
}

function bindSwatchClicks(container) {
  container.querySelectorAll('.vt-sw').forEach(el => {
    el.addEventListener('click', () => {
      const val  = el.dataset.copy; // static hex or gradient name from VARIANTS
      const name = el.dataset.nm;
      try { navigator.clipboard.writeText(val); } catch (e) { /* clipboard may be unavailable */ }
      showToast(`${val} -- ${name} Copied`); // shown via textContent inside showToast
    });
  });
}

// ---------------------------------------------------------------------------
// SECTION SHELL
// ---------------------------------------------------------------------------

function buildShell() {
  const el = document.createElement('section');
  el.id = 'section-variants';
  el.className = 'vt-root';

  const dockTabs = VARIANTS.map(v =>
    `<div class="vt-dock-tab${v.id === activeVariantId ? ' active' : ''}" data-id="${v.id}">
      <div class="vt-thumb-dots">${v.thumbDots.map(c => `<span class="vt-thumb-dot" style="background:${c}"></span>`).join('')}</div>
      <span class="vt-tab-name">${v.name}</span>
    </div>`
  ).join('');

  // innerHTML -- static string only
  el.innerHTML = `
    <header class="vt-dock">
      <div class="vt-dock-brand">HH &middot; Variant Studio</div>
      <div class="vt-dock-tabs">${dockTabs}</div>
      <div class="vt-dock-sep"></div>
      <div class="vt-dock-actions">
        <button class="vt-btn-cmp">Compare</button>
      </div>
    </header>
    <div class="vt-app">
      <div class="vt-single"></div>
      <div class="vt-compare vt-hidden">
        <div class="vt-cmp-wrap">
          <div class="vt-cmp-col">
            <div class="vt-cmp-header">
              <span class="vt-cmp-label">Variant A</span>
              <select class="vt-cmp-select" id="vt-sel-a"></select>
            </div>
            <div id="vt-pv-a"></div>
            <div id="vt-an-a" class="vt-cmp-analysis"></div>
          </div>
          <div class="vt-cmp-col">
            <div class="vt-cmp-header">
              <span class="vt-cmp-label">Variant B</span>
              <select class="vt-cmp-select" id="vt-sel-b"></select>
            </div>
            <div id="vt-pv-b"></div>
            <div id="vt-an-b" class="vt-cmp-analysis"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="vt-toast"></div>`;
  return el;
}

// ---------------------------------------------------------------------------
// STYLES -- scoped under .vt-root and .vt-pw[data-v="..."] prefixes
// ---------------------------------------------------------------------------

function injectStyles() {
  if (document.getElementById('vt-styles')) return;
  const style = document.createElement('style');
  style.id = 'vt-styles';
  // textContent -- safe CSS string
  style.textContent = `
.vt-root{font-family:'Lora',Georgia,serif;color:#F4F0EB;}
.vt-hidden{display:none!important;}
.vt-dock{position:sticky;top:0;z-index:200;background:rgba(7,4,15,.96);backdrop-filter:blur(14px);border-bottom:1px solid rgba(196,154,31,.14);padding:.55rem 1.4rem;display:flex;align-items:center;gap:.9rem;overflow-x:auto;}
.vt-dock-brand{font-family:'Cormorant',serif;font-size:.95rem;font-weight:600;color:#C49A1F;letter-spacing:.1em;white-space:nowrap;padding-right:1rem;border-right:1px solid rgba(196,154,31,.18);flex-shrink:0;}
.vt-dock-tabs{display:flex;gap:.5rem;align-items:center;flex-shrink:0;}
.vt-dock-sep{width:1px;height:28px;background:rgba(196,154,31,.12);flex-shrink:0;}
.vt-dock-actions{display:flex;gap:.45rem;margin-left:auto;flex-shrink:0;}
.vt-dock-tab{display:flex;flex-direction:column;align-items:center;gap:.28rem;padding:.35rem .65rem;border:1px solid rgba(255,255,255,.06);border-radius:6px;cursor:pointer;transition:all .2s;white-space:nowrap;background:rgba(255,255,255,.025);min-width:82px;user-select:none;}
.vt-dock-tab:hover{border-color:rgba(196,154,31,.3);background:rgba(196,154,31,.05);}
.vt-dock-tab.active{border-color:rgba(196,154,31,.8);background:rgba(196,154,31,.08);}
.vt-thumb-dots{display:flex;gap:3px;}
.vt-thumb-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
.vt-tab-name{font-family:'JetBrains Mono',monospace;font-size:.57rem;letter-spacing:.07em;color:rgba(244,240,235,.55);}
.vt-dock-tab.active .vt-tab-name{color:#C49A1F;}
.vt-btn-cmp{font-family:'JetBrains Mono',monospace;font-size:.65rem;letter-spacing:.09em;padding:.35rem .8rem;border-radius:3px;background:transparent;border:1px solid rgba(196,154,31,.35);color:rgba(196,154,31,.75);cursor:pointer;transition:all .2s;}
.vt-btn-cmp:hover,.vt-btn-cmp.on{background:rgba(196,154,31,.12);border-color:#C49A1F;color:#C49A1F;}
.vt-pw[data-v="base"]     {--vt-p:#2E1760;--vt-s:#C49A1F;--vt-a:#1E3FAA;--vt-g:#1B5E35;--vt-bg:#0D0820;--vt-cd:#1E1442;--vt-tx:#F4F0EB;--vt-tx2:#A89EC8;--vt-bd:rgba(196,154,31,.13);}
.vt-pw[data-v="metallic"] {--vt-p:#2E1760;--vt-s:#C49A1F;--vt-a:#1E3FAA;--vt-g:#8A9BB8;--vt-bg:#080616;--vt-cd:#181030;--vt-tx:#FFFFFF; --vt-tx2:#C8C0E0;--vt-bd:rgba(200,180,255,.1);}
.vt-pw[data-v="pearl"]    {--vt-p:#5A3A8C;--vt-s:#CCAA44;--vt-a:#4A6BBF;--vt-g:#3E7A5A;--vt-bg:#050210;--vt-cd:#140A2A;--vt-tx:#F8F4FF;--vt-tx2:#C8C0E8;--vt-bd:rgba(200,180,255,.13);}
.vt-pw[data-v="chameleon"]{--vt-p:#3D1A8C;--vt-s:#C49A1F;--vt-a:#1A4AD4;--vt-g:#1A7840;--vt-bg:#070412;--vt-cd:#180C36;--vt-tx:#F0EAFF;--vt-tx2:#B0A8D8;--vt-bd:rgba(150,100,255,.15);}
.vt-pw[data-v="cartoon"]  {--vt-p:#5B21B6;--vt-s:#FBBF24;--vt-a:#2563EB;--vt-g:#16A34A;--vt-bg:#0F0A2E;--vt-cd:#221866;--vt-tx:#FFFFFF; --vt-tx2:#E0D8FF;--vt-bd:rgba(0,0,0,.5);}
.vt-pw[data-v="academic"] {--vt-p:#3A1850;--vt-s:#8C7228;--vt-a:#192C68;--vt-g:#1E3D1A;--vt-bg:#09070A;--vt-cd:#181410;--vt-tx:#E8D8B0;--vt-tx2:#A89878;--vt-bd:rgba(140,114,40,.2);}
.vt-pw[data-v="holo"]     {--vt-p:#2E1760;--vt-s:#C49A1F;--vt-a:#1E3FAA;--vt-g:#1B5E35;--vt-bg:#030108;--vt-cd:#0E082A;--vt-tx:#FFFFFF; --vt-tx2:#D0C8FF;--vt-bd:rgba(200,100,255,.22);}
.vt-hero{position:relative;height:290px;overflow:hidden;display:flex;align-items:center;justify-content:center;text-align:center;}
.vt-h-bg{position:absolute;inset:0;z-index:0;}
.vt-h-geo{position:absolute;inset:0;z-index:1;opacity:.06;pointer-events:none;}
.vt-h-overlay{position:absolute;inset:0;z-index:2;pointer-events:none;}
.vt-h-content{position:relative;z-index:3;max-width:600px;padding:1.5rem;}
.vt-h-eyebrow{font-family:'JetBrains Mono',monospace;font-size:.64rem;letter-spacing:.24em;text-transform:uppercase;color:var(--vt-s,#C49A1F);margin-bottom:.9rem;display:flex;align-items:center;justify-content:center;gap:.75rem;}
.vt-h-eyebrow::before,.vt-h-eyebrow::after{content:'';width:28px;height:1px;background:var(--vt-s,#C49A1F);opacity:.5;}
.vt-h-title{font-family:'Cormorant',serif;font-size:clamp(2rem,4.5vw,3.5rem);font-weight:300;color:#fff;line-height:1.08;}
.vt-h-title em{font-style:italic;color:var(--vt-s,#C49A1F);}
.vt-h-cta{display:inline-block;margin-top:1.3rem;font-family:'JetBrains Mono',monospace;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;padding:.58rem 1.4rem;border-radius:2px;border:none;transition:all .2s;background:var(--vt-s,#C49A1F);color:var(--vt-bg,#0D0820);font-weight:700;cursor:pointer;}
.vt-h-cta:hover{transform:translateY(-1px);}
.vt-pw[data-v="base"] .vt-h-bg{background:linear-gradient(148deg,#0D0820 0%,#1A0D3D 26%,#2E1760 60%,#220F52 100%);}
.vt-pw[data-v="metallic"] .vt-h-bg{background:linear-gradient(145deg,#04020E 0%,#150A30 14%,#2E1760 26%,#5A3A9C 36%,#9B7BE0 44%,#CBBCF4 50%,#9B7BE0 56%,#5A3A9C 64%,#2E1760 74%,#150A30 86%,#04020E 100%);}
.vt-pw[data-v="metallic"] .vt-h-overlay{background:linear-gradient(88deg,transparent 0%,transparent 32%,rgba(255,255,255,0) 40%,rgba(255,255,255,.07) 48%,rgba(255,255,255,.14) 50%,rgba(255,255,255,.07) 52%,rgba(255,255,255,0) 60%,transparent 68%,transparent 100%);animation:vt-metal-sheen 4.5s ease-in-out infinite;}
@keyframes vt-metal-sheen{0%{transform:translateX(-220%)}100%{transform:translateX(320%)}}
.vt-pw[data-v="pearl"] .vt-h-bg{background:radial-gradient(ellipse 65% 60% at 22% 28%,rgba(155,123,224,.48) 0%,transparent 100%),radial-gradient(ellipse 55% 45% at 78% 72%,rgba(196,154,31,.22) 0%,transparent 100%),radial-gradient(ellipse 45% 65% at 62% 18%,rgba(74,107,191,.32) 0%,transparent 100%),#050210;}
.vt-pw[data-v="pearl"] .vt-h-overlay{background:linear-gradient(135deg,rgba(255,255,255,.02) 0%,rgba(210,190,255,.07) 20%,rgba(255,255,255,.10) 42%,rgba(190,210,255,.06) 62%,rgba(210,230,255,.08) 80%,rgba(255,255,255,.02) 100%);animation:vt-pearl 6s ease-in-out infinite alternate;}
@keyframes vt-pearl{0%{opacity:.45;filter:hue-rotate(0deg) brightness(.95)}100%{opacity:1;filter:hue-rotate(42deg) brightness(1.05)}}
.vt-pw[data-v="chameleon"] .vt-h-bg{background:linear-gradient(148deg,#070412 0%,#150926 26%,#3D1A8C 60%,#2A1272 100%);animation:vt-cham-bg 12s linear infinite;}
.vt-pw[data-v="chameleon"] .vt-h-overlay{background:conic-gradient(from 180deg,rgba(255,0,180,.06),rgba(0,200,255,.07),rgba(100,255,50,.05),rgba(255,180,0,.06),rgba(255,0,180,.06));animation:vt-cham-cone 8s linear infinite;transform-origin:50% 50%;}
@keyframes vt-cham-bg{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}
@keyframes vt-cham-cone{from{transform:rotate(0deg) scale(2.5)}to{transform:rotate(360deg) scale(2.5)}}
.vt-pw[data-v="cartoon"] .vt-h-bg{background:#1A1248;}
.vt-pw[data-v="cartoon"] .vt-hero{border-bottom:4px solid rgba(0,0,0,.88);}
.vt-pw[data-v="cartoon"] .vt-h-title{text-shadow:3px 3px 0 rgba(0,0,0,.85);-webkit-text-stroke:.8px rgba(0,0,0,.3);}
.vt-pw[data-v="cartoon"] .vt-h-title em{color:#FBBF24;}
.vt-pw[data-v="cartoon"] .vt-h-eyebrow{color:#FBBF24;}
.vt-pw[data-v="cartoon"] .vt-h-eyebrow::before,.vt-pw[data-v="cartoon"] .vt-h-eyebrow::after{background:#FBBF24;}
.vt-pw[data-v="cartoon"] .vt-h-cta{background:#FBBF24;color:#0F0A2E;font-weight:800;letter-spacing:.14em;border:2.5px solid rgba(0,0,0,.85);box-shadow:4px 4px 0 rgba(0,0,0,.8);}
.vt-pw[data-v="cartoon"] .vt-h-cta:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 rgba(0,0,0,.8);}
.vt-pw[data-v="academic"] .vt-h-bg{background:#09070A;}
.vt-pw[data-v="academic"] .vt-h-overlay{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23g)' opacity='0.18'/%3E%3C/svg%3E");background-size:200px 200px;mix-blend-mode:overlay;opacity:.55;}
.vt-pw[data-v="academic"] .vt-h-title em{color:#8C7228;}
.vt-pw[data-v="academic"] .vt-h-eyebrow{color:#8C7228;}
.vt-pw[data-v="academic"] .vt-h-eyebrow::before,.vt-pw[data-v="academic"] .vt-h-eyebrow::after{background:#8C7228;}
.vt-pw[data-v="academic"] .vt-h-cta{background:#8C7228;color:#E8D8B0;letter-spacing:.18em;}
.vt-pw[data-v="holo"] .vt-h-bg{background:#030108;}
.vt-pw[data-v="holo"] .vt-h-bg::after{content:'';position:absolute;inset:-50%;background:conic-gradient(from 0deg at 50% 50%,rgba(255,0,128,.12) 0deg,rgba(255,100,0,.09) 51deg,rgba(255,220,0,.07) 102deg,rgba(0,255,120,.10) 154deg,rgba(0,120,255,.12) 205deg,rgba(120,0,255,.14) 256deg,rgba(255,0,200,.11) 308deg,rgba(255,0,128,.12) 360deg);animation:vt-holo-spin 8s linear infinite;mix-blend-mode:screen;}
@keyframes vt-holo-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.vt-pw[data-v="holo"] .vt-h-overlay{background:conic-gradient(from 90deg at 30% 70%,rgba(0,200,255,.07),rgba(200,0,255,.09),rgba(255,100,0,.05),rgba(0,255,180,.07));animation:vt-holo-spin 13s linear infinite reverse;transform-origin:30% 70%;}
.vt-pw[data-v="holo"] .vt-h-title em{background:linear-gradient(90deg,#ff80b0,#ffb040,#80ffb0,#40b0ff,#b080ff,#ff80b0);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;background-size:200%;animation:vt-holo-txt 2.5s linear infinite;}
@keyframes vt-holo-txt{0%{background-position:0%}100%{background-position:200%}}
.vt-pw[data-v="holo"] .vt-h-cta{background:linear-gradient(90deg,#2E1760,#1E3FAA,#1B5E35,#C49A1F,#2E1760);background-size:300%;color:#fff;animation:vt-holo-txt 3s linear infinite;border:1px solid rgba(255,255,255,.18);}
.vt-body-grid{display:grid;grid-template-columns:1fr 1fr 290px;background:var(--vt-bg,#0D0820);border-top:1px solid var(--vt-bd,rgba(196,154,31,.13));}
.vt-body-grid.vt-no-analysis{grid-template-columns:1fr 1fr;}
.vt-body-col{padding:1.35rem;border-right:1px solid var(--vt-bd,rgba(196,154,31,.13));}
.vt-body-col:last-child{border-right:none;}
.vt-col-title{font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:.85rem;padding-bottom:.4rem;border-bottom:1px solid var(--vt-bd,rgba(196,154,31,.13));}
.vt-sw-grid{display:grid;grid-template-columns:1fr 1fr;gap:.65rem;}
.vt-sw{border-radius:6px;overflow:hidden;cursor:pointer;position:relative;box-shadow:0 2px 10px rgba(0,0,0,.2);transition:transform .2s;}
.vt-sw:hover{transform:translateY(-3px);}
.vt-sw-c{height:76px;position:relative;}
.vt-sw-badge{position:absolute;bottom:.35rem;left:.35rem;font-family:'JetBrains Mono',monospace;font-size:.56rem;background:rgba(0,0,0,.3);color:rgba(255,255,255,.88);padding:.1rem .32rem;border-radius:2px;backdrop-filter:blur(4px);}
.vt-sw-inf{padding:.48rem .6rem;background:var(--vt-cd,#1E1442);border:1px solid var(--vt-bd,rgba(196,154,31,.13));border-top:none;}
.vt-sw-tok{font-family:'JetBrains Mono',monospace;font-size:.56rem;color:var(--vt-s,#C49A1F);margin-bottom:.1rem;}
.vt-sw-nm{font-size:.75rem;font-weight:500;color:var(--vt-tx,#F4F0EB);}
.vt-pw[data-v="metallic"] .sw-p .vt-sw-c{background:linear-gradient(135deg,#04020E 0%,#2E1760 28%,#9B7BE0 50%,#2E1760 72%,#04020E 100%)!important;}
.vt-pw[data-v="metallic"] .sw-s .vt-sw-c{background:linear-gradient(135deg,#3A2606 0%,#C49A1F 28%,#F5E07A 50%,#C49A1F 72%,#3A2606 100%)!important;}
.vt-pw[data-v="metallic"] .sw-a .vt-sw-c{background:linear-gradient(135deg,#080E38 0%,#1E3FAA 28%,#8AAAD8 50%,#1E3FAA 72%,#080E38 100%)!important;}
.vt-pw[data-v="metallic"] .sw-g .vt-sw-c{background:linear-gradient(135deg,#080C14 0%,#8A9BB8 28%,#C8D8EC 50%,#8A9BB8 72%,#080C14 100%)!important;}
.vt-pw[data-v="metallic"] .sw-nl .vt-sw-c{background:linear-gradient(135deg,#28203A 0%,#9890B4 28%,#E0D8F0 50%,#9890B4 72%,#28203A 100%)!important;}
.vt-pw[data-v="metallic"] .sw-nd .vt-sw-c{background:linear-gradient(135deg,#04020E 0%,#180E2E 28%,#3A2858 50%,#180E2E 72%,#04020E 100%)!important;}
.vt-pw[data-v="chameleon"] .vt-sw{animation:vt-cham-bg 10s linear infinite;}
.vt-pw[data-v="chameleon"] .sw-s{animation:vt-cham-bg 25s linear infinite;}
.vt-pw[data-v="chameleon"] .vt-pv-btn{animation:vt-cham-bg 8s linear infinite;}
.vt-pw[data-v="chameleon"] .vt-pv-card{animation:vt-cham-bg 15s linear infinite;}
.vt-pw[data-v="cartoon"] .vt-sw{border:2.5px solid rgba(0,0,0,.75);box-shadow:3px 3px 0 rgba(0,0,0,.6);}
.vt-pw[data-v="cartoon"] .vt-pv-btn{border:2px solid rgba(0,0,0,.75)!important;box-shadow:3px 3px 0 rgba(0,0,0,.6);}
.vt-pw[data-v="cartoon"] .vt-pv-btn:hover{transform:translate(-1px,-1px)!important;box-shadow:4px 4px 0 rgba(0,0,0,.6)!important;}
.vt-pw[data-v="cartoon"] .vt-pv-card{border:2.5px solid rgba(0,0,0,.75);box-shadow:5px 5px 0 rgba(0,0,0,.65);border-radius:6px;}
.vt-pw[data-v="cartoon"] .vt-pv-card::before{height:4px;background:#FBBF24;}
.vt-pw[data-v="cartoon"] .vt-body-grid{border-top:3px solid rgba(0,0,0,.7);}
.vt-pw[data-v="academic"] .vt-sw-inf{background:#18140E;}
.vt-pw[data-v="academic"] .vt-pv-btn.vt-btn-p{background:#8C7228;color:#E8D8B0;}
.vt-pw[data-v="academic"] .vt-pv-card::before{background:linear-gradient(90deg,#3A1850,#8C7228);}
.vt-pw[data-v="academic"] .vt-body-grid{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23g)' opacity='0.07'/%3E%3C/svg%3E");background-size:180px 180px;}
.vt-pw[data-v="holo"] .vt-sw{position:relative;}
.vt-pw[data-v="holo"] .vt-sw::after{content:'';position:absolute;inset:0;border-radius:inherit;background:conic-gradient(from 0deg,rgba(255,0,128,.1),rgba(0,200,255,.1),rgba(100,255,0,.07),rgba(255,0,128,.1));animation:vt-holo-spin 5s linear infinite;mix-blend-mode:screen;pointer-events:none;}
.vt-pw[data-v="holo"] .vt-pv-card{position:relative;}
.vt-pw[data-v="holo"] .vt-pv-card::after{content:'';position:absolute;inset:0;border-radius:inherit;background:conic-gradient(from 0deg,rgba(255,0,128,.08),rgba(0,200,255,.08),rgba(100,255,0,.05),rgba(255,0,128,.08));animation:vt-holo-spin 7s linear infinite;mix-blend-mode:screen;pointer-events:none;}
.vt-pw[data-v="holo"] .vt-pv-btn.vt-btn-p{background:linear-gradient(90deg,#2E1760,#1E3FAA,#1B5E35,#C49A1F,#2E1760);background-size:300%;color:#fff;animation:vt-holo-txt 3s linear infinite;border:1px solid rgba(255,255,255,.15);}
.vt-pw[data-v="metallic"] .vt-pv-btn.vt-btn-p{background:linear-gradient(135deg,#3A2606,#C49A1F,#F5E07A,#C49A1F,#3A2606);color:#04020E;position:relative;overflow:hidden;}
.vt-pw[data-v="metallic"] .vt-pv-btn.vt-btn-p::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);animation:vt-btn-sheen 2.8s ease-in-out infinite;}
@keyframes vt-btn-sheen{0%{transform:translateX(-200%)}100%{transform:translateX(300%)}}
.vt-pw[data-v="metallic"] .vt-pv-btn.vt-btn-a{background:linear-gradient(135deg,#080E38,#1E3FAA,#8AAAD8,#1E3FAA,#080E38);color:#fff;}
.vt-pw[data-v="metallic"] .vt-pv-btn.vt-btn-g{background:linear-gradient(135deg,#080C14,#8A9BB8,#C8D8EC,#8A9BB8,#080C14);color:#04020E;}
.vt-pw[data-v="pearl"] .vt-pv-btn.vt-btn-p{background:radial-gradient(ellipse at 50% 50%,#8A6AB8 0%,#5A3A8C 100%);color:#F8F4FF;box-shadow:0 4px 18px rgba(155,123,224,.3),inset 0 1px 0 rgba(255,255,255,.14);}
.vt-pw[data-v="pearl"] .vt-pv-card{box-shadow:0 4px 24px rgba(90,58,140,.15),inset 0 1px 0 rgba(255,255,255,.04);}
.vt-pw[data-v="metallic"] .vt-pv-card{box-shadow:0 0 24px rgba(155,123,224,.07);}
.vt-btn-row{display:flex;flex-wrap:wrap;gap:.45rem;margin-bottom:1rem;}
.vt-badge-row{display:flex;flex-wrap:wrap;gap:.38rem;margin-bottom:1rem;}
.vt-pv-btn{font-family:'JetBrains Mono',monospace;font-size:.63rem;letter-spacing:.08em;text-transform:uppercase;padding:.48rem .95rem;border-radius:2px;border:none;transition:all .2s;position:relative;overflow:hidden;cursor:pointer;}
.vt-pv-btn:hover{transform:translateY(-1px);}
.vt-pv-badge{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:.06em;padding:.18rem .55rem;border-radius:2px;}
.vt-pv-card{border-radius:6px;padding:1rem;position:relative;overflow:hidden;background:var(--vt-cd,#1E1442);border:1px solid var(--vt-bd,rgba(196,154,31,.13));transition:transform .2s;}
.vt-pv-card:hover{transform:translateY(-2px);}
.vt-pv-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2.5px;background:var(--vt-p,#2E1760);}
.vt-card-icon{font-size:1.1rem;margin-bottom:.45rem;}
.vt-pv-card h4{font-family:'Cormorant',serif;font-size:1rem;font-weight:600;color:var(--vt-tx,#F4F0EB);margin-bottom:.28rem;}
.vt-pv-card p{font-size:.73rem;color:var(--vt-tx2,#A89EC8);line-height:1.55;}
.vt-an-panel{background:var(--vt-cd,#1E1442);}
.vt-an-head{font-family:'Cormorant',serif;font-size:1.05rem;font-weight:600;color:var(--vt-tx,#F4F0EB);margin-bottom:1rem;}
.vt-an-sec{margin-bottom:1.1rem;}
.vt-an-lbl{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:.45rem;}
.vt-cr-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:.38rem;}
.vt-cr-lbl{font-size:.68rem;color:var(--vt-tx2,#A89EC8);}
.vt-cr-right{display:flex;align-items:center;gap:.38rem;}
.vt-cr-val{font-family:'JetBrains Mono',monospace;font-size:.68rem;color:#fff;}
.vt-wcag-pill{font-family:'JetBrains Mono',monospace;font-size:.55rem;padding:.12rem .38rem;border-radius:2px;font-weight:700;}
.vt-score-row{display:flex;align-items:center;gap:.5rem;margin-bottom:.38rem;}
.vt-score-lbl{font-size:.66rem;color:var(--vt-tx2,#A89EC8);width:88px;flex-shrink:0;}
.vt-score-bar{flex:1;height:5px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden;}
.vt-score-fill{height:100%;border-radius:3px;transition:width .7s ease;}
.vt-score-n{font-family:'JetBrains Mono',monospace;font-size:.62rem;color:#fff;width:30px;text-align:right;}
.vt-tag-wrap{display:flex;flex-wrap:wrap;gap:.32rem;}
.vt-tone-tag{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:.05em;padding:.16rem .5rem;border-radius:2px;background:rgba(196,154,31,.1);color:rgba(196,154,31,.85);border:1px solid rgba(196,154,31,.2);}
.vt-ctx-tag{font-size:.58rem;font-family:'JetBrains Mono',monospace;padding:.16rem .5rem;border-radius:2px;background:rgba(30,63,170,.14);color:rgba(122,154,224,.9);border:1px solid rgba(30,63,170,.25);}
.vt-an-note{font-size:.7rem;color:var(--vt-tx2,#A89EC8);line-height:1.55;}
.vt-an-ok{color:#86EFAC;}
.vt-an-warn{color:#FCD34D;}
.vt-cmp-wrap{display:grid;grid-template-columns:1fr 1fr;}
.vt-cmp-col{border-right:2px solid rgba(196,154,31,.18);}
.vt-cmp-col:last-child{border-right:none;}
.vt-cmp-header{display:flex;align-items:center;justify-content:space-between;padding:.65rem 1.2rem;background:rgba(255,255,255,.025);border-bottom:1px solid rgba(196,154,31,.12);}
.vt-cmp-label{font-family:'JetBrains Mono',monospace;font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(196,154,31,.65);}
.vt-cmp-select{font-family:'JetBrains Mono',monospace;font-size:.66rem;background:#0D0820;color:#F4F0EB;border:1px solid rgba(196,154,31,.3);border-radius:3px;padding:.28rem .55rem;cursor:pointer;outline:none;}
.vt-cmp-col .vt-hero{height:220px;}
.vt-cmp-col .vt-body-grid{grid-template-columns:1fr 1fr;}
.vt-cmp-analysis{padding:.85rem 1.2rem;background:rgba(255,255,255,.02);border-top:1px solid rgba(196,154,31,.1);display:grid;grid-template-columns:1fr 1fr 1fr;gap:.75rem;}
.vt-cmp-an-title{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.28);margin-bottom:.35rem;}
.vt-toast{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(60px);background:#2E1760;color:#F4F0EB;padding:.48rem 1.15rem;border-radius:100px;font-family:'JetBrains Mono',monospace;font-size:.68rem;letter-spacing:.07em;border:1px solid rgba(196,154,31,.45);z-index:500;opacity:0;transition:transform .28s,opacity .28s;pointer-events:none;white-space:nowrap;}
.vt-toast.show{transform:translateX(-50%) translateY(0);opacity:1;}
@media(max-width:768px){
  .vt-body-grid,.vt-body-grid.vt-no-analysis{grid-template-columns:1fr!important;}
  .vt-cmp-wrap{grid-template-columns:1fr;}
  .vt-cmp-analysis{grid-template-columns:1fr;}
}`;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// INIT -- idempotent entry point
// ---------------------------------------------------------------------------

export function init() {
  if (initialised) return;
  initialised = true;

  injectStyles();

  // Find the section mount point created by the router
  let container = document.getElementById('section-variants')
    || document.querySelector('[data-section="variants"]')
    || document.querySelector('main')
    || document.body;

  sectionRoot = buildShell();
  container.appendChild(sectionRoot);

  // Wire dock tab clicks
  sectionRoot.querySelectorAll('.vt-dock-tab').forEach(el => {
    el.addEventListener('click', () => { if (!compareMode) setActive(el.dataset.id); });
  });

  // Wire compare toggle
  sectionRoot.querySelector('.vt-btn-cmp')?.addEventListener('click', toggleCompare);

  // 80ms delay -- CSS layout must settle before reading canvas parent dimensions
  setTimeout(() => setActive(activeVariantId), 80);

  // PHI governs the geometry hierarchy; radius 1.8 approximates PHI scaled to the scene.
  // Explicit reference prevents tree-shaking removing the sacred invariant import.
  void PHI;
}
