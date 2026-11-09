/* ═══ v2.3.4356: THE STORM EYE'S LIGHTNING, DRAWN IN CODE ═══
 *
 * One cell each (data/stormSparks.js STORM_SHAPES, STORM_FX.CELL px square),
 * drawn into one canvas by rendering/stormSparksFx.js -- one picture for
 * every piece, so a piece changing shape is never a draw-list rebuild (TRAPS
 * §218).  No imports: the node suite calls each one on a stand-in canvas.
 *
 * Lightning the colour of the eye's own iris: a deep blue edge, a pale blue
 * body, a white core.  The dark edge is what lets it read on the Foundry's
 * pale floor and over the eye's own white (the wind-ups learned this,
 * elemWindupShapes.js).
 *
 * Each draws centred in a cell of side `c` at the context's origin.
 */
const EDGE = '#1F4FB0', BODY = '#9FE3FF', CORE = '#FFFFFF', HOT = '#FFF6A8';

const line = (g, c, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * c, y * c) : g.moveTo(x * c, y * c))); };
const jag = (g, c, pts, w) => {
  g.lineJoin = 'miter'; g.lineCap = 'round'; g.miterLimit = 3;
  line(g, c, pts); g.lineWidth = c * w; g.strokeStyle = EDGE; g.stroke();
  line(g, c, pts); g.lineWidth = c * w * 0.58; g.strokeStyle = BODY; g.stroke();
  line(g, c, pts); g.lineWidth = c * w * 0.22; g.strokeStyle = CORE; g.stroke();
};

export const STORM_SHAPE_DRAW = Object.freeze({
  /* a bolt, top to bottom (turned to point away from the eye) */
  bolt(g, c) {
    jag(g, c, [[0.5, 0.05], [0.36, 0.3], [0.58, 0.42], [0.4, 0.66], [0.6, 0.74], [0.48, 0.95]], 0.15);
  },
  /* a bolt that forks: a trunk and a branch off its middle */
  fork(g, c) {
    jag(g, c, [[0.56, 0.42], [0.76, 0.56], [0.7, 0.74], [0.84, 0.9]], 0.11);
    jag(g, c, [[0.46, 0.05], [0.34, 0.26], [0.56, 0.42], [0.36, 0.62], [0.5, 0.74], [0.3, 0.95]], 0.15);
  },
  /* an arc jumping across the body: a shallow bow, side to side */
  arc(g, c) {
    jag(g, c, [[0.05, 0.56], [0.2, 0.4], [0.34, 0.52], [0.5, 0.36], [0.64, 0.5], [0.8, 0.38], [0.95, 0.54]], 0.13);
  },
  /* a spark: four sharp rays, hot in its middle */
  spark(g, c) {
    const m = c / 2;
    const star = () => {
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = (i & 1) ? c * 0.09 : c * 0.4;
        const a = (i * Math.PI) / 4 + 0.3;
        const x = m + Math.cos(a) * r, y = m + Math.sin(a) * r;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath();
    };
    star(); g.lineJoin = 'round'; g.lineWidth = c * 0.1; g.strokeStyle = EDGE; g.stroke();
    star(); g.fillStyle = BODY; g.fill();
    g.beginPath(); g.arc(m, m, c * 0.1, 0, Math.PI * 2); g.fillStyle = HOT; g.fill();
    g.beginPath(); g.arc(m, m, c * 0.05, 0, Math.PI * 2); g.fillStyle = CORE; g.fill();
  },
});
