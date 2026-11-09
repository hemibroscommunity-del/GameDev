/* ═══ v2.3.4355: THE WATER ATTACK'S SHAPES, DRAWN IN CODE ═══
 *
 * One cell each (data/waterAttack.js WATER_SHAPES, WATER_FX.CELL px square),
 * drawn into one canvas by rendering/waterAttackFx.js -- one picture for
 * every piece, so a piece changing shape is never a draw-list rebuild (TRAPS
 * §218).  No imports: the node suite calls each one on a stand-in canvas.
 *
 * The colours are the frog's own sac's, read off its strips: a deep blue
 * edge, the water's mid blue, the pale blue of its shine, white foam.  Every
 * shape has the dark edge: the Water Caves' ground is pale sand, and pale
 * water on it reads as nothing without one (the wind-ups learned this,
 * elemWindupShapes.js).
 *
 * Each draws centred in a cell of side `c` at the context's origin.
 */
const EDGE = '#17477E', WATER = '#3F9BE0', LIGHT = '#A9E0FF', FOAM = '#F2FBFF';

const blob = (g, x, y, r, fill, edge, ew) => {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
  if (edge) { g.lineWidth = ew || 2; g.strokeStyle = edge; g.stroke(); }
  g.fillStyle = fill; g.fill();
};

export const WATER_SHAPE_DRAW = Object.freeze({
  /* a drop, its point up (turned to the way it flies, its point trailing) */
  drop(g, c) {
    const m = c / 2, r = c * 0.25;
    const path = () => {
      g.beginPath();
      g.moveTo(m, m - c * 0.42);
      g.bezierCurveTo(m + r * 0.5, m - c * 0.18, m + r, m - r * 0.2, m + r, m + r * 0.5);
      g.arc(m, m + r * 0.5, r, 0, Math.PI);
      g.bezierCurveTo(m - r, m - r * 0.2, m - r * 0.5, m - c * 0.18, m, m - c * 0.42);
      g.closePath();
    };
    path(); g.lineWidth = c * 0.1; g.lineJoin = 'round'; g.strokeStyle = EDGE; g.stroke();
    path(); g.fillStyle = WATER; g.fill();
    blob(g, m - r * 0.35, m + r * 0.35, r * 0.32, LIGHT);
    blob(g, m - r * 0.42, m + r * 0.25, r * 0.13, FOAM);
  },
  /* a round bead of water */
  blob(g, c) {
    const m = c / 2, r = c * 0.27;
    blob(g, m, m, r, WATER, EDGE, c * 0.1);
    blob(g, m, m, r, WATER);
    blob(g, m - r * 0.3, m - r * 0.3, r * 0.38, LIGHT);
    blob(g, m - r * 0.38, m - r * 0.4, r * 0.15, FOAM);
  },
  /* a length of the jet, lying along x: fat at its head (right), a foamy
     line down its back */
  streak(g, c) {
    const m = c / 2;
    const path = () => {
      g.beginPath();
      g.moveTo(c * 0.06, m);
      g.quadraticCurveTo(c * 0.45, m - c * 0.2, c * 0.8, m - c * 0.16);
      g.quadraticCurveTo(c * 0.97, m, c * 0.8, m + c * 0.16);
      g.quadraticCurveTo(c * 0.45, m + c * 0.2, c * 0.06, m);
      g.closePath();
    };
    path(); g.lineWidth = c * 0.09; g.lineJoin = 'round'; g.strokeStyle = EDGE; g.stroke();
    path(); g.fillStyle = WATER; g.fill();
    g.beginPath(); g.moveTo(c * 0.26, m - c * 0.05); g.quadraticCurveTo(c * 0.55, m - c * 0.12, c * 0.8, m - c * 0.07);
    g.lineWidth = c * 0.06; g.lineCap = 'round'; g.strokeStyle = LIGHT; g.stroke();
    blob(g, c * 0.8, m - c * 0.03, c * 0.045, FOAM);
  },
  /* the crest of a wave, standing: a curl of water with foam along its top */
  crest(g, c) {
    const m = c / 2;
    const path = () => {
      g.beginPath();
      g.moveTo(c * 0.08, c * 0.74);
      g.quadraticCurveTo(c * 0.2, c * 0.34, c * 0.5, c * 0.24);
      g.quadraticCurveTo(c * 0.8, c * 0.34, c * 0.92, c * 0.74);
      g.quadraticCurveTo(m, c * 0.6, c * 0.08, c * 0.74);
      g.closePath();
    };
    path(); g.lineWidth = c * 0.09; g.lineJoin = 'round'; g.strokeStyle = EDGE; g.stroke();
    path(); g.fillStyle = WATER; g.fill();
    g.beginPath(); g.moveTo(c * 0.24, c * 0.46); g.quadraticCurveTo(c * 0.5, c * 0.27, c * 0.76, c * 0.46);
    g.lineWidth = c * 0.085; g.lineCap = 'round'; g.strokeStyle = FOAM; g.stroke();
    g.beginPath(); g.moveTo(c * 0.3, c * 0.6); g.quadraticCurveTo(c * 0.5, c * 0.5, c * 0.7, c * 0.6);
    g.lineWidth = c * 0.05; g.strokeStyle = LIGHT; g.stroke();
  },
  /* a ring spreading flat on the ground, seen from above and in front */
  ripple(g, c) {
    const m = c / 2;
    const ring = (rx, ry, w, col) => { g.beginPath(); g.ellipse(m, m, rx, ry, 0, 0, Math.PI * 2); g.lineWidth = w; g.strokeStyle = col; g.stroke(); };
    ring(c * 0.4, c * 0.2, c * 0.1, EDGE);
    ring(c * 0.4, c * 0.2, c * 0.055, LIGHT);
    ring(c * 0.2, c * 0.1, c * 0.07, EDGE);
    ring(c * 0.2, c * 0.1, c * 0.035, FOAM);
  },
  /* a puff of foam: three white beads */
  foam(g, c) {
    const m = c / 2;
    for (const [x, y, r] of [[-0.14, 0.05, 0.15], [0.12, 0.08, 0.13], [0.0, -0.1, 0.16]]) blob(g, m + c * x, m + c * y, c * r, FOAM, EDGE, c * 0.09);
    for (const [x, y, r] of [[-0.14, 0.05, 0.15], [0.12, 0.08, 0.13], [0.0, -0.1, 0.16]]) blob(g, m + c * x, m + c * y, c * r, FOAM);
    blob(g, m + c * 0.03, m + c * 0.03, c * 0.07, LIGHT);
  },
});
