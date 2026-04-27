// tests/unit/geometry.test.js
import { buildTesseractVerts, buildTesseractEdges, buildStelFaces, project4D }
  from '../../public/js/geometry/metatron3d.js';

describe('metatron3d helpers', () => {
  test('Tesseract has 16 vertices', () => {
    expect(buildTesseractVerts().length).toBe(16);
  });

  test('Tesseract has 32 edges', () => {
    expect(buildTesseractEdges().length).toBe(32);
  });

  test('Stellated Dodecahedron has 60 triangular faces', () => {
    expect(buildStelFaces().length).toBe(60);
  });

  test('4D projection: (1,0,0,0) at zero rotation projects to (1,0,0)', () => {
    const [x, y, z] = project4D([1, 0, 0, 0], 0, 0, 2.5);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(0);
  });
});
