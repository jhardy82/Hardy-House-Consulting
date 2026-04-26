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
  grow:          () => import('../sections/grow.js'),
  presentation:  () => import('../sections/presentation.js'),
  contact:       () => import('../sections/contact.js'),
};

const loaded = new Set();

export function initRouter() {
  window.addEventListener('hashchange', navigate);
  navigate();
}

async function navigate() {
  const id  = location.hash.slice(1) || 'home';
  const all = document.querySelectorAll('[data-section]');
  all.forEach(el => {
    if (el.tagName === 'SECTION') el.hidden = el.dataset.section !== id;
  });
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
      // 80ms delay: CSS layout must complete before any canvas reads dimensions.
      setTimeout(() => mod.init?.(), 80);
      loaded.add(id);
    } catch (err) {
      console.error(`[router] failed to load section "${id}":`, err);
    }
  }
  localStorage.setItem('hh-last-section', id);
}
