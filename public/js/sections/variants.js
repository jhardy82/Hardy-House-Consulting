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
// INIT -- idempotent entry point
// ---------------------------------------------------------------------------

export function init() {
  if (initialised) return;
  if (!window.THREE) {
    console.warn('[variants] Three.js not loaded');
    return;
  }
  initialised = true;

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
