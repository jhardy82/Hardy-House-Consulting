// presentation.js — Hardy House Consulting presentation section
// Migrated from _source/demo-presentation.html
// ES Module with idempotent init() for hash-router section system

import { createRenderer } from '../utils/createRenderer.js';

let initialised = false;
let _ticking = false;
let renderer, scene, camera, canvas;
let currentSlide = 0;
let shapeGroup;
let mouseX = 0, mouseY = 0;

const SLIDES = [
  {
    layout: 'title',
    title: 'Hardy House',
    eyebrow: 'Modern Workplace Consulting',
    shape: 'dodeca',
    shapeSize: 4,
    shapePos: { x: 0, y: 0, z: 0 },
    col: 0xC49A1F,
    fogCol: 0x0D0612
  },
  {
    layout: 'title',
    title: 'ContextForge',
    eyebrow: 'Agent Orchestration Framework',
    shape: 'icosa',
    shapeSize: 5,
    shapePos: { x: 0, y: 0, z: 0 },
    col: 0x9B7BE0,
    fogCol: 0x0D0612
  },
  {
    layout: 'split',
    title: 'Sacred Geometry',
    sub: 'Structural Logic',
    shape: 'merkaba',
    shapeSize: 3,
    shapePos: { x: 2, y: -1, z: 0 },
    col: 0x3B5FC8,
    fogCol: 0x0D0612,
    list: ['Platonic Solids', 'Golden Ratio (φ)', 'Metatron Cube', 'Team Sizing']
  },
  {
    layout: 'split',
    title: 'Multi-Agent Systems',
    sub: 'Adversarial Triad Pattern',
    shape: 'tetra',
    shapeSize: 4,
    shapePos: { x: 2, y: 0, z: 0 },
    col: 0xC49A1F,
    fogCol: 0x0D0612,
    list: ['Builder', 'Challenger', 'Arbiter']
  },
  {
    layout: 'split',
    title: 'Semantic Decomposition',
    sub: 'Agent Specialization',
    shape: 'cube',
    shapeSize: 4,
    shapePos: { x: 2, y: 0, z: 0 },
    col: 0x2D8050,
    fogCol: 0x0D0612,
    list: ['Domain Focus', 'Tool Scope', 'Model Selection', 'Context Boundaries']
  },
  {
    layout: 'title',
    title: 'Team Scaling',
    eyebrow: 'Fibonacci Complexity Model',
    shape: 'knot',
    shapeSize: 2.5,
    shapePos: { x: 0, y: 0, z: 0 },
    col: 0x20A8C8,
    fogCol: 0x0D0612
  },
  {
    layout: 'split',
    title: 'Constitutional AI',
    sub: 'Safety & Alignment',
    shape: 'octa',
    shapeSize: 3.5,
    shapePos: { x: 2, y: 0, z: 0 },
    col: 0x1B5E35,
    fogCol: 0x0D0612,
    list: ['Injection Defense', 'Privacy Protection', 'Ethical Boundaries']
  },
  {
    layout: 'split',
    title: 'Implementation Stack',
    sub: 'Three.js, GSAP, ES Modules',
    shape: 'torus',
    shapeSize: 3,
    shapePos: { x: 2, y: 0, z: 0 },
    col: 0x1E3FAA,
    fogCol: 0x0D0612,
    list: ['Node.js + Express', 'Vanilla JS', 'WebGL Rendering']
  },
  {
    layout: 'split',
    title: 'Deployment & Scale',
    sub: 'Cloud Infrastructure',
    shape: 'dodeca',
    shapeSize: 3.5,
    shapePos: { x: 2, y: 0, z: 0 },
    col: 0x9B7BE0,
    fogCol: 0x0D0612,
    list: ['Render.com', 'CI/CD Pipeline', 'Session Management']
  },
  {
    layout: 'title',
    title: 'Questions?',
    eyebrow: 'james.hardy1124@gmail.com',
    shape: 'golden',
    shapeSize: 4,
    shapePos: { x: 0, y: 0, z: 0 },
    col: 0xC49A1F,
    fogCol: 0x0D0612
  }
];

function buildGlowEdges(geometry, color) {
  const group = new THREE.Group();
  const layers = [
    [1.000, 0.88],
    [1.022, 0.27],
    [1.058, 0.10],
    [1.105, 0.04]
  ];

  layers.forEach(([scale, opacity]) => {
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const edges = new THREE.EdgesGeometry(geometry);
    const lineSegments = new THREE.LineSegments(edges, mat);
    lineSegments.scale.setScalar(scale);
    group.add(lineSegments);
  });

  return group;
}

function buildFaceMesh(geometry, color) {
  const mat = new THREE.MeshPhongMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  });
  return new THREE.Mesh(geometry, mat);
}

function buildSolid(geometry, color) {
  const group = new THREE.Group();
  group.add(buildFaceMesh(geometry, color));
  group.add(buildGlowEdges(geometry, color));
  return group;
}

function makeShape(type, size, color) {
  let geometry;

  try {
    switch (type) {
      case 'dodeca':
        geometry = new THREE.DodecahedronGeometry(size, 0);
        break;
      case 'icosa':
        geometry = new THREE.IcosahedronGeometry(size, 0);
        break;
      case 'tetra':
        geometry = new THREE.TetrahedronGeometry(size, 0);
        break;
      case 'cube':
        geometry = new THREE.BoxGeometry(size * 2, size * 2, size * 2);
        break;
      case 'octa':
        geometry = new THREE.OctahedronGeometry(size, 0);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(size, size * 0.4, 16, 32);
        break;
      case 'knot':
        geometry = new THREE.TorusKnotGeometry(size * 0.5, size * 0.2, 64, 8);
        break;
      case 'merkaba':
        geometry = new THREE.TetrahedronGeometry(size, 0);
        break;
      case 'golden':
        geometry = new THREE.TorusGeometry(size, size * 0.2, 16, 128);
        break;
      default:
        geometry = new THREE.BoxGeometry(size, size, size);
    }
  } catch (err) {
    console.error('[presentation] Shape creation error:', err);
    geometry = new THREE.BoxGeometry(size, size, size);
  }

  return buildSolid(geometry, color);
}

function buildParticleField() {
  const count = 320;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.4
  });

  return new THREE.Points(geometry, mat);
}

function transitionShape(newShape) {
  if (shapeGroup && shapeGroup.children.length > 0) {
    if (window.gsap) {
      gsap.to(shapeGroup.children[0].material, {
        opacity: 0,
        duration: 0.4,
        onComplete: () => {
          shapeGroup.clear();
          shapeGroup.add(newShape);

          newShape.scale.setScalar(0.5);
          gsap.to(newShape.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 0.6,
            ease: 'back.out'
          });

          if (newShape.children[0]) {
            newShape.children[0].material.opacity = 0;
            gsap.to(newShape.children[0].material, {
              opacity: 0.6,
              duration: 0.4,
              delay: 0.2
            });
          }
        }
      });
    } else {
      shapeGroup.clear();
      shapeGroup.add(newShape);
    }
  } else {
    shapeGroup.add(newShape);
  }
}

function goTo(index) {
  if (index < 0 || index >= SLIDES.length) return;

  currentSlide = index;
  const slide = SLIDES[currentSlide];

  if (scene.fog) {
    const target = new THREE.Color(slide.fogCol);
    if (window.gsap) {
      gsap.to(scene.fog.color, { r: target.r, g: target.g, b: target.b, duration: 0.8 });
    } else {
      scene.fog.color.set(slide.fogCol);
    }
  }

  const newShape = makeShape(slide.shape, slide.shapeSize, slide.col);
  newShape.position.copy(new THREE.Vector3(
    slide.shapePos.x,
    slide.shapePos.y,
    slide.shapePos.z
  ));

  transitionShape(newShape);

  updateSlideDOM();
  updateProgressDots();
}

function updateSlideDOM() {
  const slide = SLIDES[currentSlide];
  const section = document.querySelector('[data-section="presentation"]');
  const titleEl = section.querySelector('.pres-title');
  const eyebrowEl = section.querySelector('.pres-eyebrow');
  const subEl = section.querySelector('.pres-sub');
  const listEl = section.querySelector('.pres-list');

  if (titleEl) titleEl.textContent = slide.title || '';
  if (eyebrowEl) eyebrowEl.textContent = slide.eyebrow || '';
  if (subEl) subEl.textContent = slide.sub || '';

  if (listEl) {
    listEl.innerHTML = '';
    if (slide.list) {
      slide.list.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        listEl.appendChild(li);
      });
    }
  }

  const accentColor = `hsl(${colorToHue(slide.col)}, 100%, 50%)`;
  section.style.setProperty('--accent', accentColor);
}

function colorToHue(hex) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * (((b - r) / delta) + 2);
    else h = 60 * (((r - g) / delta) + 4);
  }

  return (h + 360) % 360;
}

function updateProgressDots() {
  const section = document.querySelector('[data-section="presentation"]');
  const dots = section.querySelectorAll('.pres-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === currentSlide);
  });
}

function buildDOM() {
  const section = document.querySelector('[data-section="presentation"]');

  canvas = section.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    section.insertBefore(canvas, section.firstChild);
  }

  let overlay = section.querySelector('.pres-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'pres-overlay';
    overlay.innerHTML = `
      <div class="pres-content">
        <div class="pres-eyebrow"></div>
        <h1 class="pres-title"></h1>
        <p class="pres-sub"></p>
        <ul class="pres-list"></ul>
      </div>
      <div class="pres-controls">
        <div class="pres-dots"></div>
        <div class="pres-nav">
          <button class="pres-prev" aria-label="Previous slide">prev</button>
          <button class="pres-next" aria-label="Next slide">next</button>
        </div>
      </div>
    `;
    section.appendChild(overlay);
  }

  const dotsContainer = section.querySelector('.pres-dots');
  if (dotsContainer.children.length === 0) {
    for (let i = 0; i < SLIDES.length; i++) {
      const dot = document.createElement('div');
      dot.className = 'pres-dot';
      dot.setAttribute('data-slide', i);
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(dot);
    }
  }

  const prevBtn = section.querySelector('.pres-prev');
  const nextBtn = section.querySelector('.pres-next');

  if (prevBtn) prevBtn.addEventListener('click', () => goTo(currentSlide - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo(currentSlide + 1));
}

function handleKeyDown(e) {
  const sec = document.querySelector('[data-section="presentation"]');
  if (!sec || sec.hidden) return;
  switch (e.key) {
    case 'ArrowRight':
    case ' ':
      goTo(currentSlide + 1);
      break;
    case 'ArrowLeft':
      goTo(currentSlide - 1);
      break;
    case 'Escape':
      window.location.hash = '#home';
      break;
    case 'f':
    case 'F':
      document.documentElement.requestFullscreen().catch(() => {});
      break;
    case 'h':
    case 'H':
      window.location.hash = '#home';
      break;
    default:
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num > 0 && num <= SLIDES.length) {
        goTo(num - 1);
      }
  }
}

function handleClick(e) {
  const section = document.querySelector('[data-section="presentation"]');
  const rect = section.getBoundingClientRect();
  const x = e.clientX - rect.left;

  if (x < rect.width / 2) {
    goTo(currentSlide - 1);
  } else {
    goTo(currentSlide + 1);
  }
}

function tick() {
  if (!renderer || !scene || !camera) { _ticking = false; return; }

  if (shapeGroup && shapeGroup.children[0]) {
    shapeGroup.children[0].rotation.x += 0.003;
    shapeGroup.children[0].rotation.y += 0.005;
  }

  camera.position.x = mouseX * 0.5;
  camera.position.y = mouseY * 0.3;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  const sec = document.querySelector('[data-section="presentation"]');
  if (sec && !sec.hidden) {
    requestAnimationFrame(tick);
  } else {
    _ticking = false;
  }
}

export function init() {
  if (initialised) {
    if (!_ticking && renderer && scene && camera) {
      const sec = document.querySelector('[data-section="presentation"]');
      if (sec && !sec.hidden) { _ticking = true; requestAnimationFrame(tick); }
    }
    return;
  }
  if (!window.THREE) {
    console.warn('[presentation] Three.js not loaded');
    return;
  }
  initialised = true;

  const section = document.querySelector('[data-section="presentation"]');
  if (!section) return;

  buildDOM();

  const canvas = section.querySelector('canvas');
  if (!canvas) return;

  setTimeout(() => {
    try {
      renderer = createRenderer(canvas);
    } catch (err) {
      console.error('[presentation] Renderer error:', err);
      return;
    }

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      75,
      canvas.parentElement.clientWidth / canvas.parentElement.clientHeight,
      0.1,
      1000
    );

    camera.position.z = 12;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    scene.add(buildParticleField());

    shapeGroup = new THREE.Group();
    scene.add(shapeGroup);

    scene.fog = new THREE.Fog(SLIDES[0].fogCol, 80, 100);

    const handleMouseMove = (e) => {
      const section = document.querySelector('[data-section="presentation"]');
      const rect = section.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleKeydown = (e) => handleKeyDown(e);
    const handleMouseClick = (e) => handleClick(e);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeydown);
    section.addEventListener('click', handleMouseClick);

    goTo(0);

    _ticking = true;
    requestAnimationFrame(tick);

    window.addEventListener('resize', () => {
      if (renderer && canvas) {
        const width = canvas.parentElement.clientWidth;
        const height = canvas.parentElement.clientHeight;
        renderer.setSize(width, height, false);
        if (camera) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
      }
    });
  }, 80);
}
