/**
 * OrbitControl -- spherical-coordinate pointer/touch camera orbit.
 * Extracted from _source/hardy-house-app-demo.html lines 367-375.
 * Damping: 0.87 per frame (matches tokens.css --damping).
 * Auto-rotate: 0.003 rad/frame when idle (slow drift).
 */
export class OrbitControl {
  constructor(cam, r = 4.5) {
    this.cam = cam;
    this.r   = r;
    this.th  = 0;
    this.ph  = Math.PI / 2;
    this.vTh = 0;
    this.vPh = 0;
    this.dn  = false;
    this.lx  = 0;
    this.ly  = 0;
  }

  press(x, y)   { this.dn = true; this.lx = x; this.ly = y; }
  release()     { this.dn = false; }

  move(x, y) {
    if (!this.dn) return;
    this.vTh -= (x - this.lx) * 0.0085;
    this.vPh -= (y - this.ly) * 0.0085;
    this.lx = x;
    this.ly = y;
  }

  update(auto = true) {
    if (!this.dn && auto) this.th += 0.003;
    this.th += this.vTh;
    this.ph  = Math.max(0.06, Math.min(Math.PI - 0.06, this.ph + this.vPh));
    this.vTh *= 0.87;
    this.vPh *= 0.87;
    const sp = Math.sin(this.ph), cp = Math.cos(this.ph);
    const st = Math.sin(this.th), ct = Math.cos(this.th);
    this.cam.position.set(this.r * sp * ct, this.r * cp, this.r * sp * st);
    this.cam.lookAt(0, 0, 0);
  }

  bind(c) {
    c.addEventListener('mousedown',  e => { e.preventDefault(); this.press(e.clientX, e.clientY); });
    c.addEventListener('mousemove',  e => this.move(e.clientX, e.clientY));
    c.addEventListener('mouseup',    () => this.release());
    c.addEventListener('mouseleave', () => this.release());
    c.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      this.press(t.clientX, t.clientY);
    }, { passive: false });
    c.addEventListener('touchmove', e => {
      e.preventDefault();
      const t = e.touches[0];
      this.move(t.clientX, t.clientY);
    }, { passive: false });
    c.addEventListener('touchend', () => this.release());
    c.style.cursor = 'grab';
  }
}
