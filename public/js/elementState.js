const VALID = ['fire', 'earth', 'air', 'water', 'aether'];

export async function getElement() {
  try {
    const res  = await fetch('/api/element');
    const data = await res.json();
    if (data.element) return applyElement(data.element);
  } catch { /* fall through to localStorage */ }
  const local = localStorage.getItem('hh-element');
  if (local && VALID.includes(local)) applyElement(local);
  return local || null;
}

export async function setElement(element) {
  if (!VALID.includes(element)) return;
  localStorage.setItem('hh-element', element);
  applyElement(element);
  try {
    await fetch('/api/element', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ element })
    });
  } catch { /* offline: localStorage still has the value */ }
}

function applyElement(element) {
  document.documentElement.dataset.element = element;
  return element;
}
