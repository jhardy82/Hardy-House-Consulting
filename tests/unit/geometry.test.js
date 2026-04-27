// tests/unit/geometry.test.js
import { buildTesseractVerts, buildTesseractEdges, buildStelFaces, project4D }
  from '../../public/js/geometry/metatron3d.js';

describe('metatron3d helpers', () => {

  // --- Tesseract vertices ---
  test('Tesseract has 16 vertices', () => {
    expect(buildTesseractVerts().length).toBe(16);
  });

  test('Tesseract vertices are all ±1 in 4 axes', () => {
    const verts = buildTesseractVerts();
    verts.forEach(v => {
      expect(v).toHaveLength(4);
      v.forEach(coord => expect(Math.abs(coord)).toBe(1));
    });
  });

  // --- Tesseract edges ---
  test('Tesseract has 32 edges', () => {
    expect(buildTesseractEdges().length).toBe(32);
  });

  test('All Tesseract edges differ in exactly one bit', () => {
    const edges = buildTesseractEdges();
    edges.forEach(([i, j]) => {
      const xor = i ^ j;
      // xor must be a power of 2: nonzero and only one bit set
      expect(xor).toBeGreaterThan(0);
      expect(xor & (xor - 1)).toBe(0);
    });
  });

  // --- Stellated dodecahedron faces ---
  test('Stellated Dodecahedron has 60 triangular faces', () => {
    expect(buildStelFaces().length).toBe(60);
  });

  test('Each Stellated Dodecahedron face has 3 non-NaN vertices', () => {
    const faces = buildStelFaces();
    faces.forEach(tri => {
      expect(tri).toHaveLength(3);
      tri.forEach(vert => {
        expect(vert).toHaveLength(3);
        vert.forEach(coord => expect(isNaN(coord)).toBe(false));
      });
    });
  });

  test('Each face has exactly 2 base vertices from the dodecahedron set', () => {
    const BASE_RADIUS_SQ = 3; // all 20 dodec verts at sqrt(3)
    const EPSILON = 0.01;
    buildStelFaces().forEach((tri, fi) => {
      const baseCount = tri.filter(v => {
        const r2 = v[0]*v[0] + v[1]*v[1] + v[2]*v[2];
        return Math.abs(r2 - BASE_RADIUS_SQ) < EPSILON;
      }).length;
      expect(baseCount).toBe(2); // tri[0], tri[1] are base; tri[2] is spike tip
    });
  });

  test('4D projection scales with non-zero w (perspective divide activates)', () => {
    // w=0.5: s=2.5/(2.5-0.5)=1.25; w=1.5: s=2.5/(2.5-1.5)=2.5
    const [x05] = project4D([1, 0, 0, 0.5], 0, 0, 2.5);
    const [x15] = project4D([1, 0, 0, 1.5], 0, 0, 2.5);
    expect(x15).toBeGreaterThan(x05); // larger w → stronger perspective magnification
  });

  // --- 4D projection ---
  test('4D projection: (1,0,0,0) at zero rotation projects to (1,0,0)', () => {
    const [x, y, z] = project4D([1, 0, 0, 0], 0, 0, 2.5);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(0);
  });

  test('4D projection output changes with non-zero angleXW', () => {
    const angle = Math.PI / 4;
    const [x0] = project4D([1, 0, 0, 0], 0, 0, 2.5);
    const [x1] = project4D([1, 0, 0, 0], angle, 0, 2.5);
    // At PI/4, x coord should differ from identity projection
    expect(Math.abs(x0 - x1)).toBeGreaterThan(0.01);
  });

  test('4D projection: larger viewDist reduces perspective distortion', () => {
    // With w=0, scale factor = viewDist/(viewDist-0) = 1 regardless of viewDist
    const [x1] = project4D([1, 0, 0, 0], 0, 0, 2.5);
    const [x2] = project4D([1, 0, 0, 0], 0, 0, 10.0);
    // Both should project x=1 when w=0
    expect(x1).toBeCloseTo(1);
    expect(x2).toBeCloseTo(1);
  });
});
