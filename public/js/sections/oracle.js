/**
 * oracle.js -- Element detection quiz section.
 *
 * Presents 5 binary questions, scores answers to determine the user's element,
 * then reveals the assigned Platonic solid with a Three.js visualisation.
 *
 * Exports: init()
 * Calls:   setElement(element) from ../elementState.js
 */

import { setElement } from '../elementState.js';
import { createRenderer } from '../utils/createRenderer.js';

// -- Module-level state -------------------------------------------------------

let initialised = false;
let _oRevealScene = null; // registered into _scenes; cleared on re-init

// -- Questions ----------------------------------------------------------------

const ORACLE_QUESTIONS = [
  {
    q:   'How do you work best?',
    ctx: 'Choose the one that feels most natural.',
    a:   ['I initiate -- I start things', 'I complete -- I finish things'],
    el:  ['fire', 'earth'],
  },
  {
    q:   'Structure: create or follow?',
    ctx: 'Which describes your relationship to process.',
    a:   ['I create the structure', 'I work within structure'],
    el:  ['aether', 'earth'],
  },
  {
    q:   'Motion or stillness?',
    ctx: 'Where does your best thinking happen.',
    a:   ['In motion -- walking, driving', 'In stillness -- quiet focus'],
    el:  ['air', 'water'],
  },
  {
    q:   'Detail or vision?',
    ctx: 'Your natural orientation.',
    a:   ['Detail -- I notice everything', 'Vision -- I see the whole picture'],
    el:  ['water', 'fire'],
  },
  {
    q:   'Alone or collective?',
    ctx: 'When do you produce your best work.',
    a:   ['Deep solo focus', 'Collaborative energy'],
    el:  ['aether', 'air'],
  },
];

// -- Element data -------------------------------------------------------------
// Hex values here match the token values declared in tokens.css exactly.
// They are required as numeric colours for Three.js lights and geometry.
// Do not change without also updating tokens.css.

const ELEMENT_DATA = {
  fire: {
    name:    'Fire',
    solid:   'Tetrahedron',
    hex:     '#C49A1F',
    col:     0xC49A1F,
    meaning: 'You initiate, focus, and execute. The Tetrahedron -- minimum structure, maximum directed force. In ContextForge, the Fire agent starts every pipeline. A Triangle team (3+1) is a Tetrahedron.',
    geo:     () => new THREE.TetrahedronGeometry(1.5, 0),
  },
  earth: {
    name:    'Earth',
    solid:   'Hexahedron',
    hex:     '#2D8050',
    col:     0x2D8050,
    meaning: 'You build and stabilise. The Cube tiles space perfectly with no gaps -- the geometry of foundation, infrastructure, and reliable delivery. In ContextForge, the Earth agent is the six-agent operational ring.',
    geo:     () => new THREE.BoxGeometry(2, 2, 2),
  },
  air: {
    name:    'Air',
    solid:   'Octahedron',
    hex:     '#3B5FC8',
    col:     0x3B5FC8,
    meaning: 'You orchestrate information flow. The Octahedron rotates freely from any vertex -- the geometry of balanced exchange. In ContextForge, the Air agent runs the QSE Quantum Sync Engine.',
    geo:     () => new THREE.OctahedronGeometry(1.55, 0),
  },
  water: {
    name:    'Water',
    solid:   'Icosahedron',
    hex:     '#20A8C8',
    col:     0x20A8C8,
    meaning: "You connect and adapt. The Icosahedron's 12 vertices each connect to exactly 5 others -- no single node is critical. The most resilient Platonic solid. In ContextForge, the Water agent maintains maximum interconnection.",
    geo:     () => new THREE.IcosahedronGeometry(1.45, 0),
  },
  aether: {
    name:    'Aether',
    solid:   'Dodecahedron',
    hex:     '#9B7BE0',
    col:     0x9B7BE0,
    meaning: 'You hold the framework. The Dodecahedron has 12 pentagonal faces, each saturated with phi -- Plato assigned it to the cosmos itself. In ContextForge, the Aether agent holds the COF-13D dimensional structure.',
    geo:     () => new THREE.DodecahedronGeometry(1.38, 0),
  },
};

// -- Glow edge builder (exact 4-layer spec) -----------------------------------

function buildGlowEdge(geo, col) {
  const group = new THREE.Group();
  [[1.000, 0.88], [1.022, 0.27], [1.058, 0.10], [1.105, 0.04]]
    .forEach(([scale, opacity]) => {
      const mat = new THREE.LineBasicMaterial({
        color: col, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const ls = new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
      ls.scale.setScalar(scale);
      group.add(ls);
    });
  return group;
}

function buildFace(geo, col, opacity) {
  return new THREE.Mesh(
    geo,
    new THREE.MeshPhongMaterial({
      color: col, emissive: col, emissiveIntensity: 0.1,
      transparent: true, opacity,
      side: THREE.DoubleSide,
    }),
  );
}

// -- Shared render loop -------------------------------------------------------

const _scenes = new Set();
let _loopStarted = false;

function ensureLoop() {
  if (_loopStarted) return;
  _loopStarted = true;
  let t = 0;
  (function tick() {
    requestAnimationFrame(tick);
    t += 0.005;
    _scenes.forEach(s => s.tick(t));
  }());
}

// -- DOM construction helpers -------------------------------------------------

function makeEl(tag, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function buildProgressDots(container, total) {
  while (container.firstChild) container.removeChild(container.firstChild);
  for (let i = 0; i < total; i++) {
    const d = makeEl('div', 'oracle-dot' + (i === 0 ? ' curr' : ''));
    d.id = 'oracle-dot-' + i;
    container.appendChild(d);
  }
}

function buildSteps(container, questions, onAnswer) {
  while (container.firstChild) container.removeChild(container.firstChild);

  questions.forEach((q, i) => {
    const step = makeEl('div', 'oracle-step' + (i === 0 ? ' active' : ''));
    step.id = 'oracle-step-' + i;

    const qEl = makeEl('div', 'oracle-q');
    qEl.textContent = q.q;

    const ctxEl = makeEl('div', 'oracle-ctx');
    ctxEl.textContent = q.ctx;

    const choicesWrap = makeEl('div', 'oracle-choices');
    q.a.forEach((text, j) => {
      const btn = makeEl('button', 'oracle-choice');
      btn.textContent = text;
      btn.dataset.qidx = String(i);
      btn.dataset.aidx = String(j);
      choicesWrap.appendChild(btn);
    });

    step.appendChild(qEl);
    step.appendChild(ctxEl);
    step.appendChild(choicesWrap);
    container.appendChild(step);
  });

  // Single delegated listener for all choice buttons
  container.addEventListener('click', e => {
    const btn = e.target.closest('.oracle-choice');
    if (!btn) return;
    onAnswer(Number(btn.dataset.qidx), Number(btn.dataset.aidx));
  });
}

function advanceDots(qIdx) {
  document.querySelectorAll('.oracle-dot').forEach((d, i) => {
    d.classList.toggle('done', i <= qIdx);
    d.classList.remove('curr');
  });
  const nextDot = document.getElementById('oracle-dot-' + (qIdx + 1));
  if (nextDot) nextDot.classList.add('curr');
}

function showStep(idx) {
  document.querySelectorAll('.oracle-step').forEach(s => s.classList.remove('active'));
  const step = document.getElementById('oracle-step-' + idx);
  if (step) step.classList.add('active');
}

// -- 3D reveal canvas ---------------------------------------------------------

function buildRevealCanvas(canvas, data) {
  if (_oRevealScene) {
    _scenes.delete(_oRevealScene);
    _oRevealScene = null;
  }
  try {
    const renderer = createRenderer(canvas, { alpha: false, clearColor: 0x050210, clearAlpha: 1 });
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
    camera.position.set(0, 0, 4.5);
    scene.add(new THREE.AmbientLight(0x1A0D3D, 0.5));
    const pl = new THREE.PointLight(data.col, 1.2, 12);
    pl.position.set(2, 1.5, 3.5);
    scene.add(pl);
    const geo   = data.geo();
    const group = new THREE.Group();
    group.add(buildGlowEdge(geo, data.col));
    group.add(buildFace(geo, data.col, 0.10));
    scene.add(group);
    _oRevealScene = {
      tick() {
        const sec = document.querySelector('[data-section="oracle"]');
        if (!sec || sec.hidden) {
          _scenes.delete(_oRevealScene);
          _oRevealScene = null;
          return;
        }
        group.rotation.y += 0.007;
        group.rotation.x += 0.003;
        renderer.render(scene, camera);
      },
    };
    _scenes.add(_oRevealScene);
  } catch (err) {
    console.warn('oracle: 3D reveal canvas failed --', err.message);
  }
}

// -- Scoring ------------------------------------------------------------------

function resolveWinner(scores) {
  const max = Math.max(...Object.values(scores));
  const tied = Object.keys(scores).filter(el => scores[el] === max);
  return tied[Math.floor(Math.random() * tied.length)];
}

// -- Reveal -------------------------------------------------------------------

function showReveal(revealDiv, winner) {
  const data = ELEMENT_DATA[winner];

  // Persist + propagate element to entire app via elementState
  setElement(winner);

  // Populate text fields -- these elements must exist in the markup
  const nameEl    = revealDiv.querySelector('[data-oracle="element-name"]');
  const solidEl   = revealDiv.querySelector('[data-oracle="solid-name"]');
  const meaningEl = revealDiv.querySelector('[data-oracle="meaning"]');
  if (nameEl)    nameEl.textContent    = data.name;
  if (solidEl)   solidEl.textContent   = data.solid;
  if (meaningEl) meaningEl.textContent = data.meaning;

  revealDiv.style.display = 'block';

  // 3D canvas -- 80ms delay lets CSS layout complete first
  const canvas = revealDiv.querySelector('[data-oracle="canvas"]');
  if (canvas) {
    canvas.setAttribute('aria-label', 'Element oracle animation');
    setTimeout(() => {
      buildRevealCanvas(canvas, data);
      if (window.gsap) {
        gsap.from(revealDiv, { opacity: 0, y: 20, duration: 0.6, ease: 'power2.out' });
      }
    }, 80);
  }
}

// -- init() -------------------------------------------------------------------

export function init() {
  if (initialised) return;
  if (!window.THREE) {
    console.warn('[oracle] Three.js not loaded');
    return;
  }
  initialised = true;

  const section = document.querySelector('[data-section="oracle"]');
  if (!section) return;

  ensureLoop();

  const progEl    = section.querySelector('[data-oracle="progress"]');
  const stepsEl   = section.querySelector('[data-oracle="steps"]');
  const revealDiv = section.querySelector('[data-oracle="reveal"]');

  if (!progEl || !stepsEl || !revealDiv) {
    console.warn('oracle: missing required [data-oracle] elements. Expected: progress, steps, reveal.');
    return;
  }

  // Fresh per-quiz scores
  const scores = { fire: 0, earth: 0, air: 0, water: 0, aether: 0 };

  buildProgressDots(progEl, ORACLE_QUESTIONS.length);
  buildSteps(stepsEl, ORACLE_QUESTIONS, handleAnswer);
  revealDiv.style.display = 'none';

  function handleAnswer(qIdx, aIdx) {
    const q = ORACLE_QUESTIONS[qIdx];
    scores[q.el[aIdx]]++;
    advanceDots(qIdx);

    const nextIdx = qIdx + 1;
    if (nextIdx < ORACLE_QUESTIONS.length) {
      showStep(nextIdx);
    } else {
      // All 5 questions answered -- determine and reveal element
      progEl.style.display  = 'none';
      stepsEl.style.display = 'none';
      const winner = resolveWinner(scores);
      showReveal(revealDiv, winner);
    }
  }
}
