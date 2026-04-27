// public/js/geometry/metatron3d.js
// Pure geometry helpers — no DOM, no THREE dependency.
// Mirrors the constants.js pattern: importable by both geometry.js and Jest.

const PHI_LOCAL = (1 + Math.sqrt(5)) / 2;

/**
 * Returns 16 vertices of a unit tesseract.
 * Vertex i has coordinate +1 on bit-k axis if bit k of i is set, else -1.
 */
export function buildTesseractVerts() {
  return Array.from({ length: 16 }, (_, i) => [
    i & 1 ? 1 : -1,
    i & 2 ? 1 : -1,
    i & 4 ? 1 : -1,
    i & 8 ? 1 : -1,
  ]);
}

/**
 * Returns 32 edges of the tesseract.
 * An edge [i, j] exists when i^j is a power of 2 (exactly one bit differs).
 */
export function buildTesseractEdges() {
  const edges = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      const xor = i ^ j;
      if (xor > 0 && (xor & (xor - 1)) === 0) edges.push([i, j]);
    }
  }
  return edges; // length === 32
}

/**
 * Returns 60 triangular faces of a stellated dodecahedron.
 * Each face is [vertA, vertB, tipVertex] as [x,y,z] arrays.
 * 12 pentagonal base faces x 5 spike triangles = 60 total.
 */
export function buildStelFaces() {
  const p = PHI_LOCAL;
  const ip = 1 / p;
  const verts = [
    // 8 cube vertices
    [ 1, 1, 1], [ 1, 1,-1], [ 1,-1, 1], [ 1,-1,-1],
    [-1, 1, 1], [-1, 1,-1], [-1,-1, 1], [-1,-1,-1],
    // 12 golden rectangle vertices
    [0, p, ip], [0, p,-ip], [0,-p, ip], [0,-p,-ip],
    [ip, 0, p], [-ip, 0, p], [ip, 0,-p], [-ip, 0,-p],
    [p, ip, 0], [p,-ip, 0], [-p, ip, 0], [-p,-ip, 0],
  ];

  // 12 pentagonal faces (vertex index groups, outward-wound)
  const pentagons = [
    [0, 8, 9, 1,16], [0,16,17, 2,12], [0,12,13, 4, 8],
    [5, 9, 8, 4,18], [5,18,19, 7,15], [5,15,14, 1, 9],
    [3,11,10, 2,17], [3,17,16, 1,14], [3,14,15, 7,11],
    [6,13,12, 2,10], [6,10,11, 7,19], [6,19,18, 4,13],
  ];

  const spikeH = 0.8;
  const triangles = [];

  pentagons.forEach(fi => {
    const fv = fi.map(i => verts[i]);
    const cx = fv.reduce((s, v) => s + v[0], 0) / 5;
    const cy = fv.reduce((s, v) => s + v[1], 0) / 5;
    const cz = fv.reduce((s, v) => s + v[2], 0) / 5;
    const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
    const tip = [cx + (cx / len) * spikeH, cy + (cy / len) * spikeH, cz + (cz / len) * spikeH];
    for (let k = 0; k < 5; k++) {
      triangles.push([fv[k], fv[(k + 1) % 5], tip]);
    }
  });

  return triangles; // length === 60
}

/**
 * Projects a 4D vertex to 3D via two rotation planes + perspective divide.
 * @param {number[]} vert4 - [x, y, z, w]
 * @param {number} angleXW - rotation angle in XW plane (radians)
 * @param {number} angleYZ - rotation angle in YZ plane (radians)
 * @param {number} viewDist - perspective distance (default 2.5)
 * @returns {number[]} [x3, y3, z3]
 */
export function project4D([x, y, z, w], angleXW, angleYZ, viewDist = 2.5) {
  const c1 = Math.cos(angleXW), s1 = Math.sin(angleXW);
  const c2 = Math.cos(angleYZ), s2 = Math.sin(angleYZ);
  const x1 = x * c1 - w * s1;
  const w1 = x * s1 + w * c1;
  const y1 = y * c2 - z * s2;
  const z1 = y * s2 + z * c2;
  const s  = viewDist / (viewDist - w1);
  return [x1 * s, y1 * s, z1 * s];
}
