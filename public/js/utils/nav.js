// nav.js — mobile hamburger toggle
const toggle = document.querySelector('.nav-toggle');
const list   = document.getElementById('nav-links-list');

if (toggle && list) {
  function open() {
    list.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.textContent = '✕';
  }
  function close() {
    list.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '☰';
    toggle.focus();
  }

  toggle.addEventListener('click', () =>
    list.classList.contains('open') ? close() : open()
  );

  list.addEventListener('click', e => {
    if (e.target.matches('.nav-link')) close();
  });

  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !list.contains(e.target)) close();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && list.classList.contains('open')) close();
  });
}
