/**
 * createRenderer -- shared WebGLRenderer factory.
 * Always use this instead of `new THREE.WebGLRenderer()` directly.
 * Enables preserveDrawingBuffer for PNG export and wires a ResizeObserver
 * to the parent element so the canvas tracks CSS layout.
 */
export function createRenderer(canvas, {
  alpha = true,
  clearColor = 0x07040F,
  clearAlpha = 0
} = {}) {
  const wrap = canvas.parentElement;
  const W = wrap.clientWidth  || 400;
  const H = wrap.clientHeight || 400;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha,
    preserveDrawingBuffer: true
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(clearColor, clearAlpha);

  new ResizeObserver(() => {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w && h) renderer.setSize(w, h);
  }).observe(wrap);

  return renderer;
}
