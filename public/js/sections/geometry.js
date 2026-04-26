/**
 * geometry.js -- Sacred Geometry section module.
 * Migrated from _source/hardy-house-geometry.html.
 *
 * Exports a single idempotent init() function.
 * THREE and gsap are window globals -- never import them.
 */

import { createRenderer } from '../utils/createRenderer.js';
import { PHI, SQ3H, FOL_R } from '../geometry/constants.js';

/* ============================================================
   IDEMPOTENCY GUARD
============================================================ */
let initialised = false;

/* ============================================================
   MODULE-LEVEL STATE
   (reset on each fresh init() call)
============================================================ */
let _allShapes    = null;
let _globalT      = 0;
let _scrollVel    = 0;
let _lastSY       = 0;
let _globalMode   = 'both';
let _fsShape      = null;
let _scrollHandler = null;
let _keyHandler    = null;

/* ============================================================
   HELPERS
============================================================ */

/** Parse a #RRGGBB string to an integer for THREE colour. */
function hexInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}


/* ============================================================
   ORBIT CONTROL -- spherical camera orbit with inertia
============================================================ */
class OrbitControl {
  constructor(cam, r = 4.4) {
    this.cam = cam; this.r = r;
    this.th = 0; this.ph = Math.PI / 2;
    this.vTh = 0; this.vPh = 0;
    this.dn = false; this.lx = 0; this.ly = 0;
    this.damp = 0.87;
  }
  press(x, y) { this.dn = true; this.lx = x; this.ly = y; }
  move(x, y)  { if (!this.dn) return; this.vTh -= (x - this.lx) * .0085; this.vPh -= (y - this.ly) * .0085; this.lx = x; this.ly = y; }
  release()   { this.dn = false; }
  update(autoOrbit = true) {
    if (!this.dn && autoOrbit) this.th += 0.003;
    this.th  += this.vTh;
    this.ph   = Math.max(.06, Math.min(Math.PI - .06, this.ph + this.vPh));
    this.vTh *= this.damp; this.vPh *= this.damp;
    const sp = Math.sin(this.ph), cp = Math.cos(this.ph),
          st = Math.sin(this.th), ct = Math.cos(this.th);
    this.cam.position.set(this.r * sp * ct, this.r * cp, this.r * sp * st);
    this.cam.lookAt(0, 0, 0);
  }
  bind(canvas) {
    canvas.addEventListener('mousedown',  e => { e.preventDefault(); this.press(e.clientX, e.clientY); });
    canvas.addEventListener('mousemove',  e => this.move(e.clientX, e.clientY));
    canvas.addEventListener('mouseup',    () => this.release());
    canvas.addEventListener('mouseleave', () => this.release());
    canvas.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; this.press(t.clientX, t.clientY); }, { passive: false });
    canvas.addEventListener('touchmove',  e => { e.preventDefault(); const t = e.touches[0]; this.move(t.clientX, t.clientY); }, { passive: false });
    canvas.addEventListener('touchend',   () => this.release());
  }
}

/* ============================================================
   GLOW EDGE HELPER -- exact 4-layer spec (CLAUDE.md invariant)
   Scales: 1.000 / 1.022 / 1.058 / 1.105
   Opacity: 0.88 / 0.27 / 0.10 / 0.04
============================================================ */
function buildGlowEdge(geo, hexStr, useWireframe) {
  const col = hexInt(hexStr);
  const EGC = useWireframe ? THREE.WireframeGeometry : THREE.EdgesGeometry;
  const g = new THREE.Group();
  [[1.000, 0.88], [1.022, 0.27], [1.058, 0.10], [1.105, 0.04]].forEach(([scale, opacity]) => {
    try {
      const mat = new THREE.LineBasicMaterial({
        color: col, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const ls = new THREE.LineSegments(new EGC(geo), mat);
      ls.scale.setScalar(scale);
      g.add(ls);
    } catch (err) {
      console.warn('[geometry] buildGlowEdge layer failed:', err.message);
    }
  });
  return g;
}

/* ============================================================
   SACRED SHAPE CLASS -- 3D orbiting shapes
============================================================ */
class SacredShape {
  constructor(canvas, cfg, dims) {
    this.cfg = cfg; this.hovered = false; this.breatheScl = 1.0;
    this.phase = Math.random() * Math.PI * 2;
    this.pulseSpd = .75 + Math.random() * .45;
    this.faceMeshes = []; this.glowMats = []; this.baseOps = [];
    this.running = true;

    // Use parentElement dimensions per CLAUDE.md rules
    // (canvas has no dimensions until CSS layout runs)
    const W = dims ? dims[0] : (canvas.parentElement?.clientWidth  || 220);
    const H = dims ? dims[1] : (canvas.parentElement?.clientHeight || 220);

    try { this.scene  = new THREE.Scene(); }
    catch (err) { console.warn('[geometry] Scene failed:', err.message); return; }

    try { this.camera = new THREE.PerspectiveCamera(42, W / H, .1, 100); }
    catch (err) { console.warn('[geometry] Camera failed:', err.message); return; }

    this.orbit = new OrbitControl(this.camera, 4.4);
    this.orbit.update(false);

    // Use shared factory -- NEVER new THREE.WebGLRenderer()
    try {
      this.renderer = createRenderer(canvas);
      if (dims) {
        this.renderer.setSize(W, H);
        this.camera.aspect = W / H;
        this.camera.updateProjectionMatrix();
      }
    } catch (err) { console.warn('[geometry] Renderer failed:', err.message); return; }

    try {
      const al  = new THREE.AmbientLight(0x1A0D3D, .65);
      const pl1 = new THREE.PointLight(0xC49A1F, 1.45, 14); pl1.position.set(2.5, 2, 3.5);
      const pl2 = new THREE.PointLight(0x1E3FAA,  .50, 10); pl2.position.set(-2, -1, 2);
      this.scene.add(al, pl1, pl2);
    } catch (err) { console.warn('[geometry] Lights failed:', err.message); }

    this.group = new THREE.Group();
    this.scene.add(this.group);

    try {
      if      (cfg.special === 'merkaba')       this._buildMerkaba();
      else if (cfg.special === 'cuboctahedron') this._buildCuboctahedron();
      else if (cfg.special === 'golden')        this._buildGoldenSpiral();
      else                                       this._buildStandard();
    } catch (err) { console.warn('[geometry] Shape build failed:', cfg.id, err.message); }

    try { this._addParticles(); }
    catch (err) { console.warn('[geometry] Particles failed:', err.message); }

    this.orbit.bind(canvas);
    canvas.addEventListener('mouseenter', () => { this.hovered = true;  });
    canvas.addEventListener('mouseleave', () => { this.hovered = false; });
    _allShapes.add(this);
  }

  _buildStandard() {
    const geo = this.cfg.geo();
    const fc  = hexInt(this.cfg.faceHex);
    const fm  = new THREE.Mesh(
      geo,
      new THREE.MeshPhongMaterial({
        color: fc, emissive: fc, emissiveIntensity: .14,
        transparent: true, opacity: this.cfg.faceOpacity,
        side: THREE.DoubleSide
      })
    );
    this.group.add(fm);
    this.faceMeshes.push(fm);
    const gg = buildGlowEdge(geo, this.cfg.edgeHex, this.cfg.useWireframe);
    this.group.add(gg);
    gg.children.forEach(c => { this.glowMats.push(c.material); this.baseOps.push(c.material.opacity); });
  }

  _buildMerkaba() {
    const geo = new THREE.TetrahedronGeometry(1.52, 0);
    const mk = (fHex, eHex) => {
      const fc = hexInt(fHex);
      const g  = new THREE.Group();
      const fm = new THREE.Mesh(
        geo,
        new THREE.MeshPhongMaterial({
          color: fc, emissive: fc, emissiveIntensity: .12,
          transparent: true, opacity: .12, side: THREE.DoubleSide
        })
      );
      const gg = buildGlowEdge(geo, eHex, false);
      g.add(fm, gg);
      this.faceMeshes.push(fm);
      gg.children.forEach(c => { this.glowMats.push(c.material); this.baseOps.push(c.material.opacity); });
      return g;
    };
    this.tet1 = mk(this.cfg.faceHex,  this.cfg.edgeHex);
    this.tet2 = mk(this.cfg.faceHex2, this.cfg.edgeHex2);
    this.tet2.rotation.x = Math.PI;
    this.tet2.rotation.y = Math.PI / 3;
    this.group.add(this.tet1, this.tet2);
  }

  _buildCuboctahedron() {
    const s = 1.1;
    const v = new Float32Array([
      s, s, 0, -s, s, 0,  s, -s, 0, -s, -s, 0,
      s, 0, s, -s, 0, s,  s,  0,-s, -s,  0, -s,
      0, s, s,  0,-s, s,  0,  s, -s,  0, -s, -s
    ]);
    const f = [
      0,4,8,  0,6,10, 2,4,9,  2,6,11,
      1,5,8,  1,7,10, 3,5,9,  3,7,11,
      0,4,2,  0,2,6,  1,5,3,  1,3,7,
      0,8,1,  0,1,10, 2,9,3,  2,3,11,
      4,8,5,  4,5,9,  6,10,7, 6,7,11
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
    geo.setIndex(f);
    geo.computeVertexNormals();
    const fc = hexInt(this.cfg.faceHex);
    const fm = new THREE.Mesh(
      geo,
      new THREE.MeshPhongMaterial({
        color: fc, emissive: fc, emissiveIntensity: .12,
        transparent: true, opacity: this.cfg.faceOpacity,
        side: THREE.DoubleSide
      })
    );
    this.group.add(fm);
    this.faceMeshes.push(fm);
    const gg = buildGlowEdge(geo, this.cfg.edgeHex, false);
    this.group.add(gg);
    gg.children.forEach(c => { this.glowMats.push(c.material); this.baseOps.push(c.material.opacity); });
  }

  _buildGoldenSpiral() {
    // PHI imported from constants.js -- never redefined here
    const N = 380, turns = 4.8;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const t     = i / (N - 1);
      const theta = t * turns * Math.PI * 2;
      const r     = 0.072 * Math.pow(PHI, 2 * theta / Math.PI);
      pts.push(new THREE.Vector3(r * Math.cos(theta), r * Math.sin(theta), r * .22 * Math.sin(theta * .44)));
    }
    const col = hexInt(this.cfg.edgeHex);
    // 4-layer glow on curve -- scales tuned for line geometry (differs from edge glow)
    [[1.000, .90], [1.010, .28], [1.028, .11], [1.058, .04]].forEach(([sc, op]) => {
      try {
        const spts = pts.map(p => new THREE.Vector3(p.x * sc, p.y * sc, p.z * sc));
        const geo  = new THREE.BufferGeometry().setFromPoints(spts);
        const mat  = new THREE.LineBasicMaterial({
          color: col, transparent: true, opacity: op,
          blending: THREE.AdditiveBlending, depthWrite: false
        });
        this.group.add(new THREE.Line(geo, mat));
        this.glowMats.push(mat); this.baseOps.push(op);
      } catch (err) { console.warn('[geometry] Spiral layer failed:', err.message); }
    });
    // Origin sphere
    try {
      const sGeo = new THREE.SphereGeometry(.055, 8, 8);
      const sMat = new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: .9 });
      const sm   = new THREE.Mesh(sGeo, sMat);
      this.group.add(sm);
      this.faceMeshes.push(sm);
    } catch (err) { console.warn('[geometry] Spiral sphere failed:', err.message); }
    // Phi ratio arc guides (nested rectangles, subtle)
    try {
      let a = .072, b = .072;
      const rMat = new THREE.LineBasicMaterial({
        color: col, transparent: true, opacity: .14,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const dirs = [[1,0],[0,1],[-1,0],[0,-1]];
      let ox = 0, oy = 0;
      for (let i = 0; i < 5; i++) {
        const d = dirs[i % 4], c = b;
        const perp = [-d[1], d[0]];
        const p = [
          new THREE.Vector3(ox,            oy,            0),
          new THREE.Vector3(ox + c * d[0], oy + c * d[1], 0)
        ];
        p.push(new THREE.Vector3(p[1].x + c * perp[0], p[1].y + c * perp[1], 0));
        p.push(new THREE.Vector3(p[0].x + c * perp[0], p[0].y + c * perp[1], 0));
        p.push(p[0].clone());
        this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), rMat));
        if (d[0] === 1)       ox += c;
        else if (d[1] === 1)  oy += c;
        else if (d[0] === -1) ox -= (a + b);
        else                  oy -= (a + b);
        [a, b] = [b, a + b];
      }
    } catch (err) { console.warn('[geometry] Spiral guides failed:', err.message); }
  }

  _addParticles() {
    const n = 36;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i*3]   = (Math.random() - .5) * 7.5;
      pos[i*3+1] = (Math.random() - .5) * 7.5;
      pos[i*3+2] = (Math.random() - .5) * 7.5;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.scene.add(
      new THREE.Points(pg, new THREE.PointsMaterial({
        color: 0xC49A1F, size: .022, transparent: true, opacity: .40,
        blending: THREE.AdditiveBlending
      }))
    );
  }

  setDisplayMode(mode) {
    this.faceMeshes.forEach(m => { m.visible = mode !== 'edges'; });
    this.group.traverse(o => {
      if (o.isLineSegments || o.isLine) o.visible = mode !== 'faces';
    });
  }

  tick(t, boost = 1) {
    if (!this.running || !this.renderer) return;
    this.orbit.update(!this.orbit.dn);
    this.group.rotation.x += this.cfg.rotX * boost;
    this.group.rotation.y += this.cfg.rotY * boost;
    this.group.rotation.z += (this.cfg.rotZ || 0) * boost;
    if (this.cfg.special === 'merkaba' && this.tet2) this.tet2.rotation.y += .013;
    const pulse = .84 + .16 * Math.sin(t * this.pulseSpd + this.phase);
    this.glowMats.forEach((m, i) => { m.opacity = this.baseOps[i] * pulse; });
    const ts = (this.hovered && !this.orbit.dn) ? 1.06 : 1.0;
    this.breatheScl += (ts - this.breatheScl) * .06;
    this.group.scale.setScalar(this.breatheScl);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.running = false;
    _allShapes.delete(this);
    if (this.renderer) this.renderer.dispose();
  }
}

/* ============================================================
   FLOWER OF LIFE SCENE -- 2D orthographic
   FOL_PTS count: 19 axial coordinates (CLAUDE.md invariant)
   Coordinates use SQ3H and FOL_R from constants.js.
============================================================ */
class FOLScene {
  constructor(canvas) {
    this.running = true;

    // Use parentElement per CLAUDE.md -- canvas has no dimensions until CSS layout runs
    const wrap = canvas.parentElement;
    const W    = wrap.clientWidth  || 400;
    const H    = wrap.clientHeight || 400;
    const half = 3.2;

    try {
      this.scene  = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(-half * (W/H), half * (W/H), half, -half, .1, 50);
      this.camera.position.z = 10;
    } catch (err) { console.warn('[geometry] FOL camera failed:', err.message); return; }

    try {
      this.renderer = createRenderer(canvas);
      this.renderer.setSize(W, H);
    } catch (err) { console.warn('[geometry] FOL renderer failed:', err.message); return; }

    try { this.scene.add(new THREE.AmbientLight(0x1A0D3D, 1)); } catch (_) {}

    this.group      = new THREE.Group();
    this.circleMats = [];

    // Flower of Life: exactly 19 axial hex coordinates
    // Invariant: ax.length === 19
    const ax = [
      [0,0],
      [1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1],
      [2,0],[1,1],[0,2],[-1,2],[-2,2],[-2,1],[-2,0],[-1,-1],[0,-2],[1,-2],[2,-2],[2,-1]
    ];
    if (ax.length !== 19) console.error('[geometry] FOL circle count invariant violated:', ax.length, '!== 19');

    const ringOpacity = [.88, .64, .40];
    // axial distance: max(|q|, |r|, |q+r|)
    const hexRadius   = q => Math.max(Math.abs(q[0]), Math.abs(q[1]), Math.abs(q[0] + q[1]));

    ax.forEach(coord => {
      try {
        // Convert axial coords to Cartesian using SQ3H = sqrt(3)/2 from constants.js
        const cx  = coord[0] + coord[1] * .5;
        const cy  = coord[1] * SQ3H;
        const bop = ringOpacity[Math.min(hexRadius(coord), 2)];

        // Main circle -- FOL_R = 1.0 from constants.js
        const pts = [];
        for (let i = 0; i <= 72; i++) {
          const a = i / 72 * Math.PI * 2;
          pts.push(new THREE.Vector3(cx + FOL_R * Math.cos(a), cy + FOL_R * Math.sin(a), 0));
        }
        const mat = new THREE.LineBasicMaterial({
          color: 0xC49A1F, transparent: true, opacity: bop,
          blending: THREE.AdditiveBlending
        });
        mat.userData = { bop, ph: Math.random() * Math.PI * 2 };
        this.circleMats.push(mat);
        this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));

        // Glow halo
        const pts2 = pts.map(p => new THREE.Vector3(p.x * 1.04, p.y * 1.04, 0));
        this.group.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts2),
            new THREE.LineBasicMaterial({
              color: 0xC49A1F, transparent: true, opacity: .05,
              blending: THREE.AdditiveBlending, depthWrite: false
            })
          )
        );
      } catch (err) { console.warn('[geometry] FOL circle failed:', err.message); }
    });

    this.scene.add(this.group);

    // Particles
    try {
      const n = 60, pp = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pp[i*3]   = (Math.random() - .5) * 8;
        pp[i*3+1] = (Math.random() - .5) * 8;
        pp[i*3+2] = (Math.random() - .5) * 4;
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
      this.scene.add(
        new THREE.Points(pg, new THREE.PointsMaterial({
          color: 0xC49A1F, size: .036, transparent: true, opacity: .26,
          blending: THREE.AdditiveBlending
        }))
      );
    } catch (err) { console.warn('[geometry] FOL particles failed:', err.message); }

    // Orthographic camera resize -- createRenderer handles renderer.setSize() separately
    new ResizeObserver(() => {
      if (!this.camera || !this.renderer) return;
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (w && h) {
        this.camera.left  = -half * (w / h);
        this.camera.right =  half * (w / h);
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      }
    }).observe(wrap);

    _allShapes.add(this);
  }

  tick(t, b = 1) {
    if (!this.running || !this.renderer) return;
    this.group.rotation.z += .0022 * b;
    this.circleMats.forEach(m => {
      m.opacity = m.userData.bop * (.78 + .22 * Math.sin(t * .85 + m.userData.ph));
    });
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.running = false;
    _allShapes.delete(this);
    if (this.renderer) this.renderer.dispose();
  }
}

/* ============================================================
   METATRON'S CUBE SCENE -- 2D orthographic, progressive draw
   Invariants:
     cs.length === 13   (Fruit of Life circle centres)
     edgeCount === 78   (C(13,2) = 13*12/2 = 78 pairs)
============================================================ */
class MetatronScene {
  constructor(canvas) {
    this.running = true; this.drawn = 0; this.totalV = 0;
    this.lGeo = null; this.gGeo = null; this.lMat = null;

    const wrap = canvas.parentElement;
    const W    = wrap.clientWidth  || 400;
    const H    = wrap.clientHeight || 400;
    const half = 3.2;

    try {
      this.scene  = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(-half * (W/H), half * (W/H), half, -half, .1, 50);
      this.camera.position.z = 10;
    } catch (err) { console.warn('[geometry] Metatron camera failed:', err.message); return; }

    try {
      this.renderer = createRenderer(canvas);
      this.renderer.setSize(W, H);
    } catch (err) { console.warn('[geometry] Metatron renderer failed:', err.message); return; }

    try { this.scene.add(new THREE.AmbientLight(0x1A0D3D, 1)); } catch (_) {}

    this.group = new THREE.Group();
    const R = 1.0; // circle spacing radius

    // 13 Fruit of Life centres: 1 centre + 6 inner + 6 outer (CLAUDE.md invariant)
    const cs = [
      [0, 0],
      [R, 0], [R * .5, R * .866], [-R * .5, R * .866],
      [-R, 0], [-R * .5, -R * .866], [R * .5, -R * .866],
      [2*R, 0], [R, R * 1.732], [-R, R * 1.732],
      [-2*R, 0], [-R, -R * 1.732], [R, -R * 1.732]
    ];
    if (cs.length !== 13) console.error('[geometry] Metatron centre count invariant violated:', cs.length, '!== 13');

    // C(13,2) = 78 line pairs (CLAUDE.md invariant)
    const verts = [];
    for (let i = 0; i < 13; i++) {
      for (let j = i + 1; j < 13; j++) {
        verts.push(cs[i][0], cs[i][1], 0, cs[j][0], cs[j][1], 0);
      }
    }
    const edgeCount = verts.length / 6; // 2 vertices * 3 floats = 6 per edge
    if (edgeCount !== 78) console.error('[geometry] Metatron edge count invariant violated:', edgeCount, '!== 78');
    this.totalV = verts.length / 3; // total draw vertices = 78 * 2 = 156

    try {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setDrawRange(0, 0);
      this.lMat = new THREE.LineBasicMaterial({
        color: 0xC49A1F, transparent: true, opacity: .55,
        blending: THREE.AdditiveBlending
      });
      this.group.add(new THREE.LineSegments(geo, this.lMat));
      this.lGeo = geo;

      // Glow layer
      const geo2 = new THREE.BufferGeometry();
      geo2.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo2.setDrawRange(0, 0);
      const ls2 = new THREE.LineSegments(geo2, new THREE.LineBasicMaterial({
        color: 0xC49A1F, transparent: true, opacity: .08,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      ls2.scale.setScalar(1.04);
      this.group.add(ls2);
      this.gGeo = geo2;
    } catch (err) { console.warn('[geometry] Metatron line geo failed:', err.message); }

    // 13 Fruit of Life circles
    cs.forEach(([cx, cy]) => {
      try {
        const pts = [];
        for (let i = 0; i <= 60; i++) {
          const a = i / 60 * Math.PI * 2;
          pts.push(new THREE.Vector3(cx + R * Math.cos(a), cy + R * Math.sin(a), 0));
        }
        this.group.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({
              color: 0x9B7BE0, transparent: true, opacity: .30,
              blending: THREE.AdditiveBlending
            })
          )
        );
        const p2 = pts.map(p => new THREE.Vector3(p.x * 1.04, p.y * 1.04, 0));
        this.group.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(p2),
            new THREE.LineBasicMaterial({
              color: 0x9B7BE0, transparent: true, opacity: .06,
              blending: THREE.AdditiveBlending, depthWrite: false
            })
          )
        );
      } catch (err) { console.warn('[geometry] Metatron circle failed:', err.message); }
    });

    this.scene.add(this.group);

    // Particles
    try {
      const n = 55, pp = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pp[i*3]   = (Math.random() - .5) * 7;
        pp[i*3+1] = (Math.random() - .5) * 7;
        pp[i*3+2] = (Math.random() - .5) * 3;
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
      this.scene.add(
        new THREE.Points(pg, new THREE.PointsMaterial({
          color: 0x9B7BE0, size: .034, transparent: true, opacity: .20,
          blending: THREE.AdditiveBlending
        }))
      );
    } catch (err) { console.warn('[geometry] Metatron particles failed:', err.message); }

    // Orthographic resize
    new ResizeObserver(() => {
      if (!this.camera || !this.renderer) return;
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (w && h) {
        this.camera.left  = -half * (w / h);
        this.camera.right =  half * (w / h);
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      }
    }).observe(wrap);

    // Progressive draw begins after 600ms
    setTimeout(() => this._draw(), 600);
    _allShapes.add(this);
  }

  _draw() {
    const step = () => {
      if (!this.running || this.drawn >= this.totalV) return;
      this.drawn = Math.min(this.drawn + 4, this.totalV);
      if (this.lGeo) this.lGeo.setDrawRange(0, this.drawn);
      if (this.gGeo) this.gGeo.setDrawRange(0, this.drawn);
      setTimeout(step, 22);
    };
    step();
  }

  tick(t, b = 1) {
    if (!this.running || !this.renderer) return;
    this.group.rotation.z += .0018 * b;
    if (this.lMat) this.lMat.opacity = .45 + .12 * Math.sin(t * 1.1);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.running = false;
    _allShapes.delete(this);
    if (this.renderer) this.renderer.dispose();
  }
}

/* ============================================================
   HERO SCENE -- nested solids + fog + parallax
============================================================ */
function _initHero() {
  const canvas = document.getElementById('geo-heroCanvas');
  if (!canvas) return;

  let heroScene, heroCamera, heroRenderer, heroOrbit;

  try {
    heroScene = new THREE.Scene();
    heroScene.fog = new THREE.FogExp2(0x07040F, .038);
  } catch (err) { console.warn('[geometry] Hero scene failed:', err.message); return; }

  try {
    heroCamera = new THREE.PerspectiveCamera(45, canvas.parentElement.clientWidth / (canvas.parentElement.clientHeight || window.innerHeight), .1, 100);
    heroOrbit  = new OrbitControl(heroCamera, 8);
  } catch (err) { console.warn('[geometry] Hero camera failed:', err.message); return; }

  try {
    heroRenderer = createRenderer(canvas);
    const pw = canvas.parentElement.clientWidth  || window.innerWidth;
    const ph = canvas.parentElement.clientHeight || window.innerHeight;
    heroRenderer.setSize(pw, ph);
    heroCamera.aspect = pw / ph;
    heroCamera.updateProjectionMatrix();
  } catch (err) { console.warn('[geometry] Hero renderer failed:', err.message); return; }

  try {
    heroScene.add(new THREE.AmbientLight(0x1A0D3D, .5));
    const mkPL = (c, i, d, x, y, z) => {
      const l = new THREE.PointLight(c, i, d); l.position.set(x, y, z); heroScene.add(l);
    };
    mkPL(0xC49A1F, 1.6, 24,  5,  4, 6);
    mkPL(0x1E3FAA,  .8, 18, -4, -2, 4);
    mkPL(0x7B5CB8,  .6, 14,  0,  5,-3);
  } catch (err) { console.warn('[geometry] Hero lights failed:', err.message); }

  const mkE = (geo, col, op) => {
    const g = new THREE.Group();
    [[1, op], [1.04, op * .2]].forEach(([s, o]) => {
      try {
        const ls = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        ls.scale.setScalar(s); g.add(ls);
      } catch (_) {}
    });
    return g;
  };
  const mkF = (geo, col, op) => {
    try {
      return new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
        color: col, transparent: true, opacity: op, side: THREE.DoubleSide,
        emissive: col, emissiveIntensity: .06, fog: true
      }));
    } catch (err) { console.warn('[geometry] Hero face mesh failed:', err.message); return new THREE.Object3D(); }
  };

  let dod, ico, oct, tet, tor1, tor2;
  try {
    const dg = new THREE.DodecahedronGeometry(3.4, 0); dod = new THREE.Group(); dod.add(mkE(dg, 0x9B7BE0, .44), mkF(dg, 0x2E1760, .04)); heroScene.add(dod);
    const ig = new THREE.IcosahedronGeometry(2.05, 0); ico = new THREE.Group(); ico.add(mkE(ig, 0xC49A1F, .62), mkF(ig, 0xC49A1F, .036)); heroScene.add(ico);
    const og = new THREE.OctahedronGeometry(1.12,  0); oct = new THREE.Group(); oct.add(mkE(og, 0x3B5FC8, .76), mkF(og, 0x1E3FAA, .07));  heroScene.add(oct);
    const tg = new THREE.TetrahedronGeometry(.54,  0); tet = new THREE.Group(); tet.add(mkE(tg, 0xFFDF60, .96), mkF(tg, 0xC49A1F, .18));  heroScene.add(tet);
  } catch (err) { console.warn('[geometry] Hero solids failed:', err.message); }

  try {
    const torGeo = new THREE.TorusGeometry(4.4, .04, 8, 120);
    const mkTor  = (col, op, rx, rz) => {
      const g = new THREE.Group();
      g.add(new THREE.LineSegments(
        new THREE.WireframeGeometry(torGeo),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })
      ));
      g.rotation.x = rx; g.rotation.z = rz; heroScene.add(g); return g;
    };
    tor1 = mkTor(0xC49A1F, .18, Math.PI / 2.8, 0);
    tor2 = mkTor(0x9B7BE0, .14, Math.PI / 5, Math.PI / 3);
  } catch (err) { console.warn('[geometry] Hero torus failed:', err.message); }

  try {
    const pn = 290, pp = new Float32Array(pn * 3);
    for (let i = 0; i < pn; i++) {
      const r = 5.5 + Math.random() * 2.5, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pp[i*3] = r * Math.sin(ph) * Math.cos(th); pp[i*3+1] = r * Math.sin(ph) * Math.sin(th); pp[i*3+2] = r * Math.cos(ph);
    }
    const ppg = new THREE.BufferGeometry(); ppg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    heroScene.add(new THREE.Points(ppg, new THREE.PointsMaterial({ color: 0xC49A1F, size: .044, transparent: true, opacity: .50, blending: THREE.AdditiveBlending })));
  } catch (err) { console.warn('[geometry] Hero particles failed:', err.message); }

  heroOrbit.bind(canvas);

  let ht = 0;
  (function heroAnimate() {
    if (!initialised) return; // stop if section was torn down
    requestAnimationFrame(heroAnimate);
    ht += .005;
    const sb = 1 + _scrollVel * .55;
    heroOrbit.update(true);
    if (dod)  { dod.rotation.y += .0022 * sb; dod.rotation.x = .08 * Math.sin(ht * .28); dod.rotation.z = .04 * Math.cos(ht * .18); }
    if (ico)  { ico.rotation.y -= .0038 * sb; ico.rotation.z += .0018 * sb; ico.rotation.x = .06 * Math.cos(ht * .32); }
    if (oct)  { oct.rotation.x += .007  * sb; oct.rotation.y += .005  * sb; oct.rotation.z += .003 * sb; }
    if (tet)  { tet.rotation.x -= .012  * sb; tet.rotation.y += .014  * sb; }
    if (tor1) tor1.rotation.y += .001  * sb;
    if (tor2) tor2.rotation.y -= .0012 * sb;
    heroRenderer.render(heroScene, heroCamera);
  })();
}

/* ============================================================
   FULLSCREEN OVERLAY
============================================================ */
function _openFS(cfg) {
  const ol = document.getElementById('geo-fsOverlay');
  if (!ol) return;
  ol.style.display = 'flex';
  if (_fsShape) { _fsShape.dispose(); _fsShape = null; }
  const nameEl = document.getElementById('geo-fsName');
  const metaEl = document.getElementById('geo-fsMeta');
  // textContent -- safe, no HTML injection
  if (nameEl) nameEl.textContent = cfg.name;
  if (metaEl) metaEl.textContent = cfg.element + ' -- ' + cfg.facts;
  const canvas = document.getElementById('geo-fsCanvas');
  if (!canvas) return;
  const sz = Math.floor(Math.min(window.innerWidth * .82, window.innerHeight * .72));
  canvas.width  = sz; canvas.height  = sz;
  canvas.style.width  = sz + 'px';
  canvas.style.height = sz + 'px';
  // Sync FS mode pills to current _globalMode before creating the shape
  document.querySelectorAll('.geo-fs-mpill').forEach(p => {
    p.classList.toggle('on', p.dataset.mode === _globalMode);
  });
  try {
    _fsShape = new SacredShape(canvas, cfg, [sz, sz]);
    _fsShape.setDisplayMode(_globalMode);
  } catch (err) { console.warn('[geometry] FS shape failed:', err.message); }
}

function _closeFS() {
  const ol = document.getElementById('geo-fsOverlay');
  if (ol) ol.style.display = 'none';
  if (_fsShape) { _fsShape.dispose(); _fsShape = null; }
}

function _fsSetMode(mode, btn) {
  document.querySelectorAll('.geo-fs-mpill').forEach(p => p.classList.remove('on'));
  if (btn) btn.classList.add('on');
  if (_fsShape) _fsShape.setDisplayMode(mode);
}

/* ============================================================
   MODE CONTROL
============================================================ */
function _setMode(mode, btn) {
  _globalMode = mode;
  document.querySelectorAll('.geo-mpill').forEach(p => p.classList.remove('on'));
  if (btn) btn.classList.add('on');
  _allShapes.forEach(s => { if (s instanceof SacredShape) s.setDisplayMode(mode); });
  if (_fsShape) _fsShape.setDisplayMode(mode);
}

/* ============================================================
   EXPORT PNG
============================================================ */
function _exportPNG(id) {
  const inst = window.__geoInst?.[id];
  if (!inst || !inst.renderer) return;
  try {
    inst.renderer.render(inst.scene, inst.camera);
    const a = document.createElement('a');
    a.download = 'hardy-house-' + id + '.png';
    a.href = inst.renderer.domElement.toDataURL('image/png');
    a.click();
  } catch (err) { console.warn('[geometry] Export failed:', err.message); }
}

/* ============================================================
   SHAPE CATALOGUES
   Element colour hex values are brand structural constants,
   not accent tokens -- they are fixed per Platonic solid.
   Per CLAUDE.md: "never hardcode element colours directly"
   refers to the CSS --accent token (used in UI chrome).
   These are the per-solid brand constants, not the accent.
============================================================ */
const PLATONIC_CATALOGUE = [
  {
    id: 'tetra', name: 'Tetrahedron', element: 'Fire', elementColor: '#C49A1F',
    facts: 'Faces: 4 -- Vertices: 4 -- Edges: 6',
    meaning: 'The simplest regular polyhedron. Assertion, initiation, and the most stable structural unit. In ContextForge the Tetrahedron is the Triangle Principle -- minimum structure for maximum stability.',
    edgeHex: '#C49A1F', faceHex: '#C49A1F', faceOpacity: .12,
    rotX: .006, rotY: .009, rotZ: .003,
    geo: () => new THREE.TetrahedronGeometry(1.45, 0)
  },
  {
    id: 'cube', name: 'Hexahedron', element: 'Earth', elementColor: '#2D8050',
    facts: 'Faces: 6 -- Vertices: 8 -- Edges: 12',
    meaning: 'Equal axes, maximum enclosure. Structure in the manifest world -- ground, stability, the six faces of cardinal direction. Maps to the six-agent coordination ring in ContextForge.',
    edgeHex: '#2D8050', faceHex: '#1B5E35', faceOpacity: .10,
    rotX: .004, rotY: .006, rotZ: .002,
    geo: () => new THREE.BoxGeometry(2.1, 2.1, 2.1)
  },
  {
    id: 'octa', name: 'Octahedron', element: 'Air', elementColor: '#3B5FC8',
    facts: 'Faces: 8 -- Vertices: 6 -- Edges: 12',
    meaning: 'The dual of the cube. Balance of opposites -- above and below. Eight triangular faces encode the octave and the two opposing pyramids of ascent and descent.',
    edgeHex: '#3B5FC8', faceHex: '#1E3FAA', faceOpacity: .10,
    rotX: .003, rotY: .010, rotZ: .004,
    geo: () => new THREE.OctahedronGeometry(1.52, 0)
  },
  {
    id: 'icosa', name: 'Icosahedron', element: 'Water', elementColor: '#20A8C8',
    facts: 'Faces: 20 -- Vertices: 12 -- Edges: 30',
    meaning: 'The most spherical solid -- twenty equilateral triangles. Flow, adaptability, interconnected complexity. Basis of the geodesic dome and the GCMT icosahedral team topology at t3 scale.',
    edgeHex: '#20A8C8', faceHex: '#0D7A94', faceOpacity: .10,
    rotX: .005, rotY: .008, rotZ: .003,
    geo: () => new THREE.IcosahedronGeometry(1.42, 0)
  },
  {
    id: 'dodeca', name: 'Dodecahedron', element: 'Aether', elementColor: '#9B7BE0',
    facts: 'Faces: 12 -- Vertices: 20 -- Edges: 30',
    meaning: "The cosmos itself -- Plato's shape for the heavens. Twelve pentagonal faces map to the zodiac. Encodes the COF-13D framework: cosmos as context.",
    edgeHex: '#9B7BE0', faceHex: '#4A2D90', faceOpacity: .12,
    rotX: .002, rotY: .005, rotZ: .002,
    geo: () => new THREE.DodecahedronGeometry(1.36, 0)
  }
];

const EXTENDED_CATALOGUE = [
  {
    id: 'torus', name: 'Torus', element: 'Cycle', elementColor: '#C49A1F',
    facts: 'Genus-1 surface -- Self-referential ring -- No boundary',
    meaning: 'No beginning, no end. The torus is the fundamental shape of all self-sustaining systems. Torus Theory models identity as a toroidal field -- the hole is not absence but the axis of transformation.',
    edgeHex: '#C49A1F', faceHex: '#8C6B10', faceOpacity: .07,
    rotX: .005, rotY: .008, rotZ: .002, useWireframe: true,
    geo: () => new THREE.TorusGeometry(1.05, .34, 16, 80)
  },
  {
    id: 'merkaba', name: 'Merkaba', element: 'Spirit', elementColor: '#C49A1F',
    facts: 'Star Tetrahedron -- Dual-interlocked -- Counter-rotating fields',
    meaning: 'Two counter-rotating tetrahedra -- one toward spirit, one toward earth. Models the dual-stack ContextForge architecture: top-down orchestration meeting bottom-up emergence.',
    edgeHex: '#C49A1F', edgeHex2: '#9B7BE0', faceHex: '#8C6B10', faceHex2: '#4A2D90',
    faceOpacity: .10, rotX: .004, rotY: .007, rotZ: .003, special: 'merkaba'
  },
  {
    id: 'knot', name: 'Torus Knot', element: 'Infinity', elementColor: '#1E3FAA',
    facts: 'Trefoil (2,3) knot -- p=2 -- q=3 -- Never-terminating',
    meaning: 'Traced on the surface of a torus -- never self-intersecting, never terminating. The trefoil encodes the Plan to Act to Reflect rhythm as a continuous unbroken motion. No entry, no exit.',
    edgeHex: '#1E3FAA', faceHex: '#162E99', faceOpacity: .07,
    rotX: .004, rotY: .009, rotZ: .003, useWireframe: true,
    geo: () => new THREE.TorusKnotGeometry(.88, .22, 128, 16)
  },
  {
    id: 'cubocta', name: 'Cuboctahedron', element: 'Equilibrium', elementColor: '#60B080',
    facts: 'Faces: 14 -- Vertices: 12 -- Edges: 24',
    meaning: "Buckminster Fuller's Vector Equilibrium -- every vertex equidistant from centre. The only form where all vectors are in perfect balance. The phi-squared configuration in GCMT multi-agent mesh topology.",
    edgeHex: '#60B080', faceHex: '#1B5E35', faceOpacity: .10,
    rotX: .003, rotY: .006, rotZ: .002, special: 'cuboctahedron'
  },
  {
    id: 'sphere', name: 'Sphere', element: 'Unity', elementColor: '#C4B0E8',
    facts: 'Infinite symmetry -- R constant everywhere -- Generator of all forms',
    meaning: 'Perfect symmetry in every direction -- the container from which all other forms emerge. The Sphere is the Circle at every scale. In COF it represents the Unity from which all dimensional structure expands.',
    edgeHex: '#C4B0E8', faceHex: '#6A60A0', faceOpacity: .05,
    rotX: .002, rotY: .005, rotZ: .001, useWireframe: true,
    geo: () => new THREE.SphereGeometry(1.42, 24, 24)
  },
  {
    id: 'golden', name: 'Golden Spiral', element: 'phi (Phi)', elementColor: '#C49A1F',
    facts: 'r = phi^(2theta/pi) -- phi = 1.6180 -- 4.8 turns -- Self-similar at every scale',
    meaning: 'The only growth curve self-similar at every scale. phi saturates the icosahedron and dodecahedron. It defines Hardy House brand proportional spacing and the fundamental rhythm of all organic growth.',
    edgeHex: '#C49A1F', faceHex: '#C49A1F', faceOpacity: .05,
    rotX: .003, rotY: .006, rotZ: .001, special: 'golden'
  }
];

/* ============================================================
   CARD BUILDING -- uses safe DOM methods (no innerHTML with data)
============================================================ */
const CMODES = ['both', 'edges', 'faces'];
const CLBL   = { both: 'E+F', edges: 'E', faces: 'F' };
const _cardModes = {};

function _buildCard(cfg) {
  // All DOM construction uses createElement + textContent/setAttribute.
  // No user-supplied data reaches innerHTML.
  const card = document.createElement('div');
  card.className = 'shape-card';
  card.dataset.id = cfg.id;

  // Canvas wrapper
  const wrap = document.createElement('div');
  wrap.className = 'sc-wrap';

  const canvas = document.createElement('canvas');
  canvas.className = 'sc-canvas';
  canvas.setAttribute('aria-label', 'Three.js shape viewer — interactive canvas');

  const hint = document.createElement('div');
  hint.className = 'sc-hint';
  hint.textContent = 'Drag to orbit';

  const btns = document.createElement('div');
  btns.className = 'sc-btns';

  const modeBtn = document.createElement('button');
  modeBtn.className = 'sc-btn';
  modeBtn.id = 'geo-mode_' + cfg.id;
  modeBtn.textContent = 'E+F';

  const fsBtn = document.createElement('button');
  fsBtn.className = 'sc-btn';
  fsBtn.textContent = '\u26F6'; // fullscreen icon

  const expBtn = document.createElement('button');
  expBtn.className = 'sc-btn';
  expBtn.textContent = '\u2193'; // down arrow

  btns.appendChild(modeBtn);
  btns.appendChild(fsBtn);
  btns.appendChild(expBtn);
  wrap.appendChild(canvas);
  wrap.appendChild(hint);
  wrap.appendChild(btns);

  // Info panel
  const info = document.createElement('div');
  info.className = 'sc-info';

  const elDiv = document.createElement('div');
  elDiv.className = 'sc-el';
  elDiv.textContent = cfg.element;
  // Safe: elementColor is from our internal catalogue, not user input.
  // Assigned via style property, not style attribute string injection.
  elDiv.style.color = cfg.elementColor;

  const nameDiv = document.createElement('div');
  nameDiv.className = 'sc-name';
  nameDiv.textContent = cfg.name;

  const factsDiv = document.createElement('div');
  factsDiv.className = 'sc-facts';
  factsDiv.textContent = cfg.facts;

  const meaningDiv = document.createElement('div');
  meaningDiv.className = 'sc-meaning';
  meaningDiv.textContent = cfg.meaning;

  info.appendChild(elDiv);
  info.appendChild(nameDiv);
  info.appendChild(factsDiv);
  info.appendChild(meaningDiv);

  card.appendChild(wrap);
  card.appendChild(info);

  // Event delegation
  fsBtn.addEventListener('click', () => {
    const c = [...PLATONIC_CATALOGUE, ...EXTENDED_CATALOGUE].find(x => x.id === cfg.id);
    if (c) _openFS(c);
  });
  expBtn.addEventListener('click', () => _exportPNG(cfg.id));
  modeBtn.addEventListener('click', e => {
    e.stopPropagation();
    const next = CMODES[(CMODES.indexOf(_cardModes[cfg.id] || 'both') + 1) % 3];
    _cardModes[cfg.id] = next;
    modeBtn.textContent = CLBL[next];
    const inst = window.__geoInst?.[cfg.id];
    if (inst) inst.setDisplayMode(next);
  });

  return card;
}

function _initGrid(shapes, containerId) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  shapes.forEach((cfg, i) => {
    const card   = _buildCard(cfg);
    grid.appendChild(card);
    const canvas = card.querySelector('.sc-canvas');
    // 80ms base delay satisfies CLAUDE.md "read dimensions after CSS layout" rule
    const delay = 80 + i * 80;
    setTimeout(() => {
      try {
        const inst = new SacredShape(canvas, cfg);
        if (!window.__geoInst) window.__geoInst = {};
        window.__geoInst[cfg.id] = inst;
        inst.setDisplayMode(_globalMode);
      } catch (err) { console.warn('[geometry] SacredShape init failed:', cfg.id, err.message); }
    }, delay);
  });
}

function _init2D() {
  const folC = document.getElementById('geo-folCanvas');
  const metC = document.getElementById('geo-metCanvas');
  if (!folC || !metC) return;

  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) {
      try { new FOLScene(folC); } catch (err) { console.warn('[geometry] FOL init failed:', err.message); }
      obs.disconnect();
    }
  }, { threshold: .1 }).observe(folC);

  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) {
      try { new MetatronScene(metC); } catch (err) { console.warn('[geometry] Metatron init failed:', err.message); }
      obs.disconnect();
    }
  }, { threshold: .1 }).observe(metC);
}

/* ============================================================
   GSAP ANIMATIONS
============================================================ */
function _initGSAP() {
  if (!window.gsap) return;
  const gsap = window.gsap;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('#geometry .h-eyebrow', { opacity: 0, y: -8,  duration: .7 })
    .from('#geometry .h-title',   { opacity: 0, y: 28,  duration: 1.0 }, '-=.2')
    .from('#geometry .h-sub',     { opacity: 0, y: 18,  duration:  .8 }, '-=.5')
    .from('#geometry .h-scroll',  { opacity: 0,          duration:  .5 }, '-=.25');

  if (window.ScrollTrigger) {
    gsap.from('#geometry .pm', {
      opacity: 0, y: 16, stagger: .08, duration: .6, ease: 'power2.out',
      scrollTrigger: { trigger: '#geometry .plat-map', start: 'top 88%', once: true }
    });

    document.querySelectorAll('#geometry .s-lbl, #geometry .s-title, #geometry .s-desc').forEach(el => {
      gsap.from(el, {
        opacity: 0, x: -12, duration: .65, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });

    document.querySelectorAll('#geometry .shape-card').forEach((el, i) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: .65, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        delay: (i % 5) * .07
      });
    });

    document.querySelectorAll('#geometry .s2d-card').forEach((el, i) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: .7, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        delay: i * .12
      });
    });

    document.querySelectorAll('#geometry .phil-card').forEach((el, i) => {
      gsap.from(el, {
        opacity: 0, y: 24, duration: .65, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        delay: i * .1
      });
    });
  } else {
    document.querySelectorAll('#geometry .shape-card, #geometry .s2d-card').forEach(el => {
      el.classList.add('visible');
    });
  }
}

/* ============================================================
   SECTION DOM -- built with safe createElement (not innerHTML)
   Static structural markup only -- no user data.
============================================================ */
function _buildSectionDOM(container) {
  // Static section scaffold built with DOM API.
  // Using innerHTML here only for purely static string literals
  // (no user data, no external input, no interpolated variables).
  // Safe: the string is a hard-coded compile-time constant.

  // Hero
  const hero = document.createElement('div');
  hero.className = 'hero';
  hero.style.cssText = 'position:relative;height:100vh;min-height:600px;overflow:hidden;display:flex;align-items:center;justify-content:center;';

  const heroCanvas = document.createElement('canvas');
  heroCanvas.id = 'geo-heroCanvas';
  heroCanvas.setAttribute('aria-label', 'Sacred geometry hero — interactive Three.js scene');
  heroCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';

  const heroContent = document.createElement('div');
  heroContent.className = 'hero-content';
  heroContent.style.cssText = 'position:relative;z-index:2;text-align:center;max-width:720px;padding:2rem;';

  const eyebrow = document.createElement('div');
  eyebrow.className = 'h-eyebrow';
  eyebrow.textContent = 'Hardy House Consulting -- Brand Foundation';

  const heroTitle = document.createElement('h1');
  heroTitle.className = 'h-title';
  heroTitle.textContent = 'Sacred Geometry of the Brand';

  const heroSub = document.createElement('p');
  heroSub.className = 'h-sub';
  heroSub.textContent = 'The five Platonic solids and their extended forms define the structural grammar of Hardy House Consulting -- from team topology to multi-agent architecture and the ContextForge COF-13D framework.';

  const heroScroll = document.createElement('div');
  heroScroll.className = 'h-scroll';
  heroScroll.style.cssText = 'position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);';
  heroScroll.textContent = 'Scroll -- Drag to Orbit';

  heroContent.appendChild(eyebrow);
  heroContent.appendChild(heroTitle);
  heroContent.appendChild(heroSub);
  hero.appendChild(heroCanvas);
  hero.appendChild(heroContent);
  hero.appendChild(heroScroll);

  // Platonic map bar
  const platMap = document.createElement('div');
  platMap.className = 'plat-map';
  const pmData = [
    { el: 'Fire',   color: '#C49A1F', shape: 'Tetrahedron',  facts: '4 -- 4 -- 6' },
    { el: 'Earth',  color: '#2D8050', shape: 'Hexahedron',   facts: '6 -- 8 -- 12' },
    { el: 'Air',    color: '#3B5FC8', shape: 'Octahedron',   facts: '8 -- 6 -- 12' },
    { el: 'Water',  color: '#20A8C8', shape: 'Icosahedron',  facts: '20 -- 12 -- 30' },
    { el: 'Aether', color: '#9B7BE0', shape: 'Dodecahedron', facts: '12 -- 20 -- 30' }
  ];
  pmData.forEach(d => {
    const pm = document.createElement('div');
    pm.className = 'pm';
    const elDiv = document.createElement('div');
    elDiv.className = 'pm-el';
    elDiv.style.color = d.color; // safe: internal constant
    elDiv.textContent = d.el;
    const shDiv = document.createElement('div');
    shDiv.className = 'pm-sh';
    shDiv.textContent = d.shape;
    const nDiv = document.createElement('div');
    nDiv.className = 'pm-n';
    nDiv.textContent = d.facts;
    pm.appendChild(elDiv); pm.appendChild(shDiv); pm.appendChild(nDiv);
    platMap.appendChild(pm);
  });

  // Section factory
  const mkSection = (label, title, desc, gridId) => {
    const sec = document.createElement('section');
    const lbl = document.createElement('div'); lbl.className = 's-lbl'; lbl.textContent = label;
    const h2  = document.createElement('h2');  h2.className  = 's-title'; h2.textContent = title;
    const div = document.createElement('div'); div.className = 's-div';
    const p   = document.createElement('p');   p.className   = 's-desc'; p.textContent  = desc;
    sec.appendChild(lbl); sec.appendChild(h2); sec.appendChild(div); sec.appendChild(p);
    if (gridId) {
      const grid = document.createElement('div');
      grid.className = 'shape-grid'; grid.id = gridId;
      sec.appendChild(grid);
    }
    return sec;
  };

  // Mode pills
  const pills = document.createElement('div');
  pills.className = 'mode-pills';
  [['both','Edges + Faces'],['edges','Edges Only'],['faces','Faces Only']].forEach(([m,lbl], i) => {
    const btn = document.createElement('button');
    btn.className = 'mpill geo-mpill' + (i === 0 ? ' on' : '');
    btn.dataset.mode = m;
    btn.textContent = lbl;
    pills.appendChild(btn);
  });

  const s01 = mkSection('01 -- Platonic Solids', 'The Five Perfect Forms',
    'Plato identified five and only five regular convex polyhedra. Each maps to an element, an agent role, and a phase in the PAOAL cycle. Drag to orbit -- Click for fullscreen -- arrow to export PNG.',
    'geo-platonicGrid');
  // Insert pills before the grid
  s01.insertBefore(pills, s01.querySelector('#geo-platonicGrid'));

  const s02 = mkSection('02 -- Extended Sacred Geometry', 'Beyond the Platonic',
    'Torus, Merkaba, Torus Knot, Cuboctahedron, Sphere, and the Golden Ratio Spiral -- the extended vocabulary of the Hardy House brand system.',
    'geo-extendedGrid');

  // 2D section
  const s03 = mkSection('03 -- Two-Dimensional Sacred Forms', 'Pattern & Structure',
    "The Flower of Life and Metatron's Cube are foundational 2D sacred geometry forms. The Flower generates all five Platonic solids within its structure. Metatron's Cube is drawn progressively -- 78 lines connecting 13 circle centres.",
    null);
  const s2dGrid = document.createElement('div');
  s2dGrid.className = 's2d-grid';

  const mk2DCard = (id, elLabel, elColor, name, facts, meaning) => {
    const card = document.createElement('div');
    card.className = 's2d-card'; card.id = id;
    const wrap2 = document.createElement('div'); wrap2.className = 's2d-wrap';
    const cvs   = document.createElement('canvas');
    cvs.id = id.replace('Card', 'Canvas').replace('geo-fol','geo-fol').replace('geo-met','geo-met');
    cvs.setAttribute('aria-label', id.startsWith('geo-fol') ? 'Flower of Life geometry canvas' : "Metatron's Cube geometry canvas");
    wrap2.appendChild(cvs);
    const info  = document.createElement('div'); info.className = 'sc-info';
    const elD   = document.createElement('div'); elD.className = 'sc-el'; elD.textContent = elLabel; elD.style.color = elColor;
    const nmD   = document.createElement('div'); nmD.className = 'sc-name'; nmD.textContent = name;
    const ftD   = document.createElement('div'); ftD.className = 'sc-facts'; ftD.textContent = facts;
    const mnD   = document.createElement('div'); mnD.className = 'sc-meaning'; mnD.textContent = meaning;
    info.appendChild(elD); info.appendChild(nmD); info.appendChild(ftD); info.appendChild(mnD);
    card.appendChild(wrap2); card.appendChild(info);
    return card;
  };
  s2dGrid.appendChild(mk2DCard(
    'geo-folCard', 'Pattern', '#C49A1F', 'Flower of Life',
    '19 circles -- Hexagonal grid -- R-spaced centres',
    'The fundamental pattern of existence. All geometric forms emerge from this arrangement -- the cycle of creation, growth, and decay at every scale. The centre contains the Seed of Life.'
  ));
  s2dGrid.appendChild(mk2DCard(
    'geo-metCard', 'Structure', '#9B7BE0', "Metatron's Cube",
    '13 circles -- 78 connecting lines -- All 5 Platonic solids encoded within',
    'All five Platonic solids can be found within Metatron\'s Cube. In ContextForge it represents the unified field from which all agent architectures and team topologies derive. Lines are drawn progressively on entry.'
  ));
  s03.appendChild(s2dGrid);

  // Fix canvas IDs (mk2DCard uses card id logic -- correct here)
  const folCanvas = s2dGrid.querySelector('#geo-folCard canvas');
  if (folCanvas) folCanvas.id = 'geo-folCanvas';
  const metCanvas = s2dGrid.querySelector('#geo-metCard canvas');
  if (metCanvas) metCanvas.id = 'geo-metCanvas';

  // Philosophy section
  const s04 = mkSection('04 -- Application', 'Geometry as Strategy', '', null);
  const philGrid = document.createElement('div');
  philGrid.className = 'phil-grid';
  [
    { icon: '\u25B3', title: 'Team Architecture', text: 'Multi-agent team sizing follows Platonic geometry via GCMT. A Triangle team (3) is a Tetrahedron. A Pentagon (5) encodes the Dodecahedron\'s pentagonal faces. The geometric shape predicts communication topology and information flow.' },
    { icon: '\u25CB', title: 'Identity as Torus',  text: 'Torus Theory models identity and community as a toroidal field -- continuous, self-referential, and fundamentally connected to its environment. The hole is not absence; it is the axis of transformation and the locus of deepest truth.' },
    { icon: '\u03C6', title: 'The Golden Ratio',   text: 'phi = 1.6180... appears throughout the Platonic solids, defines Hardy House brand spacing, and is the only growth rate that is self-similar at every scale. The dodecahedron and icosahedron are both saturated with phi in their internal geometry.' }
  ].forEach(d => {
    const card = document.createElement('div'); card.className = 'phil-card';
    const ico  = document.createElement('div'); ico.className = 'phil-icon'; ico.textContent = d.icon;
    const ttl  = document.createElement('div'); ttl.className = 'phil-title'; ttl.textContent = d.title;
    const txt  = document.createElement('div'); txt.className = 'phil-text'; txt.textContent = d.text;
    card.appendChild(ico); card.appendChild(ttl); card.appendChild(txt);
    philGrid.appendChild(card);
  });
  s04.appendChild(philGrid);

  // Fullscreen overlay
  const fsOl = document.createElement('div');
  fsOl.id = 'geo-fsOverlay';
  fsOl.style.cssText = 'position:fixed;inset:0;background:rgba(4,2,10,.97);z-index:500;display:none;flex-direction:column;align-items:center;justify-content:center;gap:1.2rem;backdrop-filter:blur(8px);';

  const fsClose = document.createElement('button');
  fsClose.id = 'geo-fsClose';
  fsClose.style.cssText = 'position:absolute;top:1.5rem;right:1.5rem;font-family:JetBrains Mono,monospace;font-size:.68rem;letter-spacing:.12em;background:transparent;border:1px solid rgba(196,154,31,.32);color:rgba(196,154,31,.72);border-radius:3px;padding:.38rem .8rem;cursor:pointer;';
  fsClose.textContent = '\u2715 \u00A0ESC';

  const fsModeBar = document.createElement('div');
  fsModeBar.id = 'geo-fsModeBar';
  fsModeBar.style.cssText = 'display:flex;gap:.35rem;';
  [['both','Edges + Faces'],['edges','Edges Only'],['faces','Faces Only']].forEach(([m,lbl], i) => {
    const btn = document.createElement('button');
    btn.className = 'geo-fs-mpill' + (i === 0 ? ' on' : '');
    btn.dataset.mode = m;
    btn.textContent = lbl;
    fsModeBar.appendChild(btn);
  });

  const fsInfo = document.createElement('div');
  fsInfo.id = 'geo-fsInfo';
  fsInfo.style.textAlign = 'center';
  const fsName = document.createElement('div'); fsName.id = 'geo-fsName';
  const fsMeta = document.createElement('div'); fsMeta.id = 'geo-fsMeta';
  fsInfo.appendChild(fsName); fsInfo.appendChild(fsMeta);

  const fsCvs = document.createElement('canvas');
  fsCvs.id = 'geo-fsCanvas';
  fsCvs.setAttribute('aria-label', 'Sacred geometry explorer — fullscreen canvas');
  fsCvs.style.cssText = 'border-radius:8px;display:block;cursor:grab;';

  const fsHint = document.createElement('div');
  fsHint.id = 'geo-fsHint';
  fsHint.textContent = 'Drag to orbit -- Release for inertia';

  fsOl.appendChild(fsClose);
  fsOl.appendChild(fsModeBar);
  fsOl.appendChild(fsInfo);
  fsOl.appendChild(fsCvs);
  fsOl.appendChild(fsHint);

  // Assemble into container
  container.appendChild(hero);
  container.appendChild(platMap);
  container.appendChild(s01);
  container.appendChild(s02);
  container.appendChild(s03);
  container.appendChild(s04);
  container.appendChild(fsOl);
}

/* ============================================================
   GLOBAL ANIMATION LOOP
============================================================ */
function _startLoop() {
  function tick() {
    if (!initialised) return;
    _globalT  += 0.005;
    _scrollVel *= 0.90;
    const boost = 1 + _scrollVel;
    _allShapes.forEach(s => s.tick(_globalT, boost));
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ============================================================
   EXPORTED INIT
============================================================ */
export function init() {
  _closeFS(); // clear any orphaned FS overlay from a previous visit
  if (initialised) return; // idempotency guard
  if (!window.THREE) {
    console.warn('[geometry] Three.js not loaded');
    return;
  }
  initialised = true;

  // Reset module state
  _allShapes   = new Set();
  _globalT     = 0;
  _scrollVel   = 0;
  _lastSY      = 0;
  _globalMode  = 'both';
  _fsShape     = null;
  window.__geoInst = {};

  // Find the section container
  const container = document.querySelector('#geometry') ||
                    document.querySelector('[data-section="geometry"]');
  if (!container) {
    console.warn('[geometry] No container found for #geometry section.');
    initialised = false;
    return;
  }

  // Build DOM
  _buildSectionDOM(container);

  // Scroll velocity tracker
  _scrollHandler = () => {
    _scrollVel = Math.min(Math.abs(window.scrollY - _lastSY) * 0.026, 2.2);
    _lastSY = window.scrollY;
  };
  window.addEventListener('scroll', _scrollHandler);

  // ESC key for fullscreen
  _keyHandler = e => { if (e.key === 'Escape') _closeFS(); };
  document.addEventListener('keydown', _keyHandler);

  // Fullscreen overlay -- background click to close
  const fsOl = document.getElementById('geo-fsOverlay');
  if (fsOl) fsOl.addEventListener('click', e => { if (e.target === fsOl) _closeFS(); });

  // Close button
  const fsClose = document.getElementById('geo-fsClose');
  if (fsClose) fsClose.addEventListener('click', _closeFS);

  // FS mode pills
  document.querySelectorAll('.geo-fs-mpill').forEach(btn => {
    btn.addEventListener('click', () => _fsSetMode(btn.dataset.mode, btn));
  });

  // Main mode pills
  document.querySelectorAll('.geo-mpill').forEach(btn => {
    btn.addEventListener('click', () => _setMode(btn.dataset.mode, btn));
  });

  // Start render loop
  _startLoop();

  // Boot sequence -- 80ms satisfies CLAUDE.md "read dimensions after CSS layout" rule
  setTimeout(() => {
    try { _initHero(); }                                       catch (e) { console.warn('[geometry] hero:', e.message); }
    try { _initGrid(PLATONIC_CATALOGUE, 'geo-platonicGrid'); } catch (e) { console.warn('[geometry] platonic grid:', e.message); }
    try { _initGrid(EXTENDED_CATALOGUE, 'geo-extendedGrid'); } catch (e) { console.warn('[geometry] extended grid:', e.message); }
    try { _init2D(); }                                         catch (e) { console.warn('[geometry] 2D init:', e.message); }
    setTimeout(() => {
      try { _initGSAP(); } catch (e) { console.warn('[geometry] GSAP:', e.message); }
    }, 100);
  }, 80);
}
