/**
 * yantraCoords.js
 *
 * Sri Yantra coordinate data module.
 *
 * Source: Gerard Huet, "Sri Yantra Geometry", Theoretical Computer Science 281
 * (2002) 609-628. Coordinates derived from the TeXample.net TikZ implementation
 * (Huet 2002 construction), normalized so the outermost concentric circle = r 1.
 *
 * TikZ space: center (0,0), y-up, outer circle r = 1.
 * Triangle ordering: innermost (Bindu/D5) to outermost (D1).
 * 9 triangles total: 4 upward (Shiva) + 5 downward (Shakti).
 */

// ---------------------------------------------------------------------------
// 9 interlocking triangles -- innermost to outermost
// dir: 'up' = apex up (Shiva), 'down' = apex down (Shakti)
// verts: [[x,y],[x,y],[x,y]] in TikZ space
// ---------------------------------------------------------------------------
export const TRIANGLES = [
  // T1 -- innermost downward (Shakti) -- D5
  {
    dir: 'down',
    verts: [
      [-0.25388,  0.05202],
      [ 0.00000, -0.24247],
      [ 0.25388,  0.05202],
    ],
  },
  // T2 -- upward (Shiva) -- U4
  {
    dir: 'up',
    verts: [
      [-0.35051, -0.10660],
      [ 0.00000,  0.46878],
      [ 0.35051, -0.10660],
    ],
  },
  // T3 -- downward (Shakti) -- D4
  {
    dir: 'down',
    verts: [
      [-0.33649,  0.15692],
      [ 0.00000, -0.47923],
      [ 0.33649,  0.15692],
    ],
  },
  // T4 -- upward (Shiva) -- U3
  {
    dir: 'up',
    verts: [
      [-0.51282, -0.20038],
      [ 0.00000,  0.56795],
      [ 0.51282, -0.20038],
    ],
  },
  // T5 -- downward (Shakti) -- D3
  {
    dir: 'down',
    verts: [
      [-0.49514,  0.31895],
      [ 0.00000, -0.60660],
      [ 0.49514,  0.31895],
    ],
  },
  // T6 -- upward (Shiva) -- U2
  {
    dir: 'up',
    verts: [
      [-0.71735, -0.47923],
      [ 0.00000,  0.71895],
      [ 0.71735, -0.47923],
    ],
  },
  // T7 -- downward (Shakti) -- D2
  {
    dir: 'down',
    verts: [
      [-0.69016,  0.46878],
      [ 0.00000, -0.70038],
      [ 0.69016,  0.46878],
    ],
  },
  // T8 -- upward (Shiva) -- U1
  {
    dir: 'up',
    verts: [
      [-0.97016, -0.24247],
      [ 0.00000,  1.00000],
      [ 0.97016, -0.24247],
    ],
  },
  // T9 -- outermost downward (Shakti) -- D1
  {
    dir: 'down',
    verts: [
      [-0.96343,  0.26795],
      [ 0.00000, -1.00000],
      [ 0.96343,  0.26795],
    ],
  },
];

// ---------------------------------------------------------------------------
// Three concentric circles (inner to outer, r=1 = outermost)
// ---------------------------------------------------------------------------
export const OUTER_RINGS = [0.60, 0.80, 1.00];

// ---------------------------------------------------------------------------
// 8-petal inner lotus (Ashtadala Padma)
// ---------------------------------------------------------------------------
export const LOTUS_8 = { r: 0.60, petalW: 0.18, petalH: 0.22 };

// ---------------------------------------------------------------------------
// 16-petal outer lotus (Shodasha Dala)
// ---------------------------------------------------------------------------
export const LOTUS_16 = { r: 0.80, petalW: 0.12, petalH: 0.15 };

// ---------------------------------------------------------------------------
// Bhupura -- outer square frame with four gate openings
// ---------------------------------------------------------------------------
export const BHUPURA = { halfSize: 1.10, gateWidth: 0.20 };

// ---------------------------------------------------------------------------
// TikZ space (center 0,0, y-up) -> Canvas 2D pixel space (y-down).
// ---------------------------------------------------------------------------
export function tikzToCanvas(x, y, cx, cy, scale) {
  return [cx + x * scale, cy - y * scale];
}
