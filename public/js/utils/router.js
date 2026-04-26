/**
 * Hash router for the Hardy House SPA.
 * Each section exports a single idempotent `init()` function.
 * `loaded` Set guarantees init is called at most once per section.
 */
const SECTIONS = {
  home:          () => import('../sections/home.js'),
  oracle:        () => import('../sections/oracle.js'),
  dashboard:     () => import('../sections/dashboard.js'),
  geometry:      () => import('../sections/geometry.js'),
  decomposition: () => import('../sections/decomposition.js'),
  variants:      () => import('../sections/variants.js'),
  tree:          () => import('../sections/tree.js'),
  yantra:        () => import('../sections/yantra.js'),
  grow:          () => import('../sections/grow.js'),
  presentation:  () => import('../sections/presentation.js'),
  contact:       () => import('../sections/contact.js'),
};

const loaded = new Set();
let _activeTween = null;
let _navSerial = 0;

export function initRouter() {
  window.addEventListener('hashchange', navigate);
  navigate();
}

async function navigate() {
  const mySerial = ++_navSerial;
  const id   = location.hash.slice(1) || 'home';
  const all  = document.querySelectorAll('section[data-section]');
  const next = document.querySelector(`section[data-section="${id}"]`);
  const curr = document.querySelector('section[data-section]:not([hidden])');

  if (window.gsap && curr && curr !== next) {
    // Kill any in-flight tween so rapid navigation cannot leave opacity stuck.
    if (_activeTween) { _activeTween.kill(); _activeTween = null; }
    _activeTween = window.gsap.to(curr, { opacity: 0, duration: 0.1, ease: 'power1.in' });
    await _activeTween;
    if (_navSerial !== mySerial) return;
    _activeTween = null;
    all.forEach(el => { el.hidden = el.dataset.section !== id; });
    if (next) {
      next.style.opacity = '0';
      _activeTween = window.gsap.to(next, { opacity: 1, duration: 0.15, ease: 'power1.out' });
      _activeTween.then(() => { _activeTween = null; });
    }
  } else {
    // No GSAP or same section -- reset any lingering inline opacity first.
    if (window.gsap && _activeTween) { _activeTween.kill(); _activeTween = null; }
    all.forEach(el => {
      el.hidden = el.dataset.section !== id;
      if (!el.hidden) el.style.opacity = '';
    });
  }

  document.querySelectorAll('.nav-link').forEach(a => {
    const isCurrent = a.getAttribute('href') === '#' + id;
    a.classList.toggle('active', isCurrent);
    if (isCurrent) {
      a.setAttribute('aria-current', 'page');
    } else {
      a.removeAttribute('aria-current');
    }
  });

  if (!loaded.has(id) && SECTIONS[id]) {
    try {
      const mod = await SECTIONS[id]();
      if (_navSerial !== mySerial) return;
      // 80ms delay: CSS layout must complete before any canvas reads dimensions.
      setTimeout(() => mod.init?.(), 80);
      loaded.add(id);
    } catch (err) {
      console.error(`[router] failed to load section "${id}":`, err);
    }
  }
  localStorage.setItem('hh-last-section', id);
}
