// tests/unit/yantraCoords.test.js
import { TRIANGLES, OUTER_RINGS, tikzToCanvas }
  from '../../public/js/geometry/yantraCoords.js';

const EPSILON = 1e-6;

function lineIntersect([ax, ay], [bx, by], [cx, cy], [dx, dy]) {
  const a1 = by - ay, b1 = ax - bx, c1 = a1 * ax + b1 * ay;
  const a2 = dy - cy, b2 = cx - dx, c2 = a2 * cx + b2 * cy;
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < 1e-12) return null;
  return [(b2 * c1 - b1 * c2) / det, (a1 * c2 - a2 * c1) / det];
}

function dist([ax, ay], [bx, by]) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function onSegment(a, b, p) {
  return Math.abs(dist(a, p) + dist(b, p) - dist(a, b)) < EPSILON;
}

describe('yantraCoords', () => {
  test('TRIANGLES.length === 9', () => {
    expect(TRIANGLES.length).toBe(9);
  });

  test('4 upward and 5 downward triangles', () => {
    const up   = TRIANGLES.filter(t => t.dir === 'up');
    const down = TRIANGLES.filter(t => t.dir === 'down');
    expect(up.length).toBe(4);
    expect(down.length).toBe(5);
  });

  test('OUTER_RINGS.length === 3', () => {
    expect(OUTER_RINGS.length).toBe(3);
  });

  test('each triangle has exactly 3 vertices', () => {
    TRIANGLES.forEach(t => {
      expect(t.verts).toHaveLength(3);
    });
  });

  test('tikzToCanvas maps correctly (y-flip, scale, translate)', () => {
    const cx = 400, cy = 300, scale = 200;
    const [px, py] = tikzToCanvas(0.5, -0.3, cx, cy, scale);
    expect(px).toBeCloseTo(cx + 0.5 * scale, 10);
    expect(py).toBeCloseTo(cy - (-0.3) * scale, 10);
  });

  test('Huet coordinates satisfy concurrency constraint', () => {
    let intersections = 0;
    for (let i = 0; i < TRIANGLES.length - 1; i++) {
      const t1 = TRIANGLES[i];
      const t2 = TRIANGLES[i + 1];
      for (let e1 = 0; e1 < 3; e1++) {
        for (let e2 = 0; e2 < 3; e2++) {
          const a = t1.verts[e1], b = t1.verts[(e1 + 1) % 3];
          const c = t2.verts[e2], d = t2.verts[(e2 + 1) % 3];
          const pt = lineIntersect(a, b, c, d);
          if (!pt) continue;
          if (onSegment(a, b, pt) && onSegment(c, d, pt)) {
            intersections++;
          }
        }
      }
    }
    expect(intersections).toBeGreaterThanOrEqual(8);

    // Bindu (innermost triangle centroid) near origin
    const [bx, by] = TRIANGLES[0].verts.reduce(
      ([sx, sy], [x, y]) => [sx + x / 3, sy + y / 3], [0, 0]
    );
    expect(Math.abs(bx)).toBeLessThan(0.05);
    expect(Math.abs(by)).toBeLessThan(0.05);
  });
});
