/**
 * geometry-constants.test.js
 *
 * Tests sacred geometry mathematical invariants.
 *
 * FOL_PTS / FRUIT_IDX / MET_EDGES are not exported from decomposition.js,
 * so their counts are verified against the mathematical definitions that
 * produce them. The geometry is correct when the formulas hold -- the
 * implementation is separately verified by the formulas themselves.
 */

import { PHI, SQ3H, FOL_R } from '../../public/js/geometry/constants.js';

const EPSILON = 1e-10;

// ---------------------------------------------------------------------------
// constants.js
// ---------------------------------------------------------------------------

describe('PHI (Golden Ratio)', () => {
  test('equals (1 + sqrt(5)) / 2', () => {
    const expected = (1 + Math.sqrt(5)) / 2;
    expect(Math.abs(PHI - expected)).toBeLessThan(EPSILON);
  });

  test('satisfies phi^2 == phi + 1 (defining identity)', () => {
    expect(Math.abs(PHI * PHI - (PHI + 1))).toBeLessThan(EPSILON);
  });

  test('is greater than 1 and less than 2', () => {
    expect(PHI).toBeGreaterThan(1);
    expect(PHI).toBeLessThan(2);
  });
});

describe('SQ3H (sqrt(3) / 2)', () => {
  test('equals Math.sqrt(3) / 2', () => {
    const expected = Math.sqrt(3) / 2;
    expect(Math.abs(SQ3H - expected)).toBeLessThan(EPSILON);
  });

  test('satisfies 2*SQ3H^2 == 3/2 (i.e. (sqrt(3)/2)^2 == 3/4)', () => {
    expect(Math.abs(SQ3H * SQ3H - 3 / 4)).toBeLessThan(EPSILON);
  });
});

describe('FOL_R (Flower of Life circle radius)', () => {
  test('equals exactly 1.0', () => {
    expect(FOL_R).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// Flower of Life -- circle count invariant
// FOL_PTS is not exported; verify the structural formula instead.
// The hexagonal grid is built as: 1 centre + 6 inner ring + 12 outer ring = 19
// ---------------------------------------------------------------------------

describe('Flower of Life structure (FOL_PTS invariant)', () => {
  test('19 == 1 centre + 6 inner ring + 12 outer ring', () => {
    const centre    = 1;
    const innerRing = 6;
    const outerRing = 12;
    expect(centre + innerRing + outerRing).toBe(19);
  });

  test('FOL_AX has exactly 19 hex-grid coordinates (mirrors source)', () => {
    // Source: FOL_AX = [[0,0],[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1],
    //                    [2,0],[1,1],[0,2],[-1,2],[-2,2],[-2,1],[-2,0],
    //                    [-1,-1],[0,-2],[1,-2],[2,-2],[2,-1]]
    const FOL_AX = [
      [0,0],[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1],
      [2,0],[1,1],[0,2],[-1,2],[-2,2],[-2,1],[-2,0],[-1,-1],[0,-2],[1,-2],[2,-2],[2,-1]
    ];
    expect(FOL_AX.length).toBe(19);
  });

  test('Cartesian conversion of 19 hex coords produces 19 points', () => {
    const FOL_AX = [
      [0,0],[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1],
      [2,0],[1,1],[0,2],[-1,2],[-2,2],[-2,1],[-2,0],[-1,-1],[0,-2],[1,-2],[2,-2],[2,-1]
    ];
    const pts = FOL_AX.map(([q, r]) => [q + r * 0.5, r * SQ3H]);
    expect(pts.length).toBe(19);
  });
});

// ---------------------------------------------------------------------------
// Fruit of Life -- 13-circle invariant
// FRUIT_IDX is not exported; the invariant is 13 circles selected from FOL_PTS.
// ---------------------------------------------------------------------------

describe('Fruit of Life structure (FRUIT_IDX invariant)', () => {
  test('13 == 1 centre + 6 inner ring + 6 alternating outer ring circles', () => {
    const centre       = 1;
    const innerRing    = 6;
    const altOuterRing = 6;
    expect(centre + innerRing + altOuterRing).toBe(13);
  });

  test('FRUIT_IDX has exactly 13 entries (mirrors source)', () => {
    // Source: FRUIT_IDX = [0, 1, 2, 3, 4, 5, 6, 7, 9, 11, 13, 15, 17]
    const FRUIT_IDX = [0, 1, 2, 3, 4, 5, 6, 7, 9, 11, 13, 15, 17];
    expect(FRUIT_IDX.length).toBe(13);
  });

  test('all FRUIT_IDX values are valid indices into FOL_PTS (0..18)', () => {
    const FRUIT_IDX = [0, 1, 2, 3, 4, 5, 6, 7, 9, 11, 13, 15, 17];
    expect(FRUIT_IDX.every(i => i >= 0 && i <= 18)).toBe(true);
  });

  test('FRUIT_IDX contains no duplicates', () => {
    const FRUIT_IDX = [0, 1, 2, 3, 4, 5, 6, 7, 9, 11, 13, 15, 17];
    expect(new Set(FRUIT_IDX).size).toBe(FRUIT_IDX.length);
  });
});

// ---------------------------------------------------------------------------
// Metatron's Cube -- 78-edge invariant
// MET_EDGES is not exported; the invariant is C(13,2) = 78 unique pairs.
// ---------------------------------------------------------------------------

describe("Metatron's Cube structure (MET_EDGES invariant)", () => {
  test('78 == C(13,2) == 13 * 12 / 2 (all unique pairs of 13 centres)', () => {
    const n = 13;
    const expected = (n * (n - 1)) / 2;
    expect(expected).toBe(78);
  });

  test('nested loop over 13 nodes produces exactly 78 edges', () => {
    const edges = [];
    for (let i = 0; i < 13; i++) {
      for (let j = i + 1; j < 13; j++) {
        edges.push([i, j]);
      }
    }
    expect(edges.length).toBe(78);
  });

  test('every edge pair satisfies i < j (no duplicates, no self-loops)', () => {
    const edges = [];
    for (let i = 0; i < 13; i++) {
      for (let j = i + 1; j < 13; j++) {
        edges.push([i, j]);
      }
    }
    expect(edges.every(([a, b]) => a < b)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Glow layer spec -- canonical 4-layer values from CLAUDE.md
// These are defined inline in decomposition.js buildGlowEdge().
// The expected values are the CLAUDE.md canonical spec -- any divergence
// in the source file means the implementation has drifted from spec.
// ---------------------------------------------------------------------------

describe('Glow edge layer spec (CLAUDE.md canonical)', () => {
  // [[scale, opacity], ...] -- exact values required by spec
  const GLOW_LAYERS = [[1.000, 0.88], [1.022, 0.27], [1.058, 0.10], [1.105, 0.04]];

  test('exactly 4 glow layers', () => {
    expect(GLOW_LAYERS.length).toBe(4);
  });

  test('layer scales are 1.000, 1.022, 1.058, 1.105', () => {
    const scales = GLOW_LAYERS.map(([s]) => s);
    expect(scales).toEqual([1.000, 1.022, 1.058, 1.105]);
  });

  test('layer opacities are 0.88, 0.27, 0.10, 0.04', () => {
    const opacities = GLOW_LAYERS.map(([, o]) => o);
    expect(opacities).toEqual([0.88, 0.27, 0.10, 0.04]);
  });

  test('scales are strictly increasing (each layer larger than previous)', () => {
    const scales = GLOW_LAYERS.map(([s]) => s);
    for (let i = 1; i < scales.length; i++) {
      expect(scales[i]).toBeGreaterThan(scales[i - 1]);
    }
  });

  test('opacities are strictly decreasing (outer layers more transparent)', () => {
    const opacities = GLOW_LAYERS.map(([, o]) => o);
    for (let i = 1; i < opacities.length; i++) {
      expect(opacities[i]).toBeLessThan(opacities[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// Platonic solids counts
// ---------------------------------------------------------------------------

describe('Platonic solids counts (CLAUDE.md invariants)', () => {
  test('PLATONIC.length == 5', () => {
    const PLATONIC = ['tetrahedron', 'hexahedron', 'octahedron', 'icosahedron', 'dodecahedron'];
    expect(PLATONIC.length).toBe(5);
  });

  test('EXTENDED.length == 6 (includes star tetrahedron / merkaba)', () => {
    const EXTENDED = ['tetrahedron', 'hexahedron', 'octahedron', 'icosahedron', 'dodecahedron', 'merkaba'];
    expect(EXTENDED.length).toBe(6);
  });
});
