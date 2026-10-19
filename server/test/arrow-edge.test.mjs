/* ═══ v2.3.3489: WHERE AN ARROW COMES DOWN AT THE SCREEN'S EDGE (src/game/arrowEdge.js) ═══
 *
 * One rule, read by the arrow (projectiles.js), the bow's fire gate and the
 * aiming line (monsterCombat): an arrow comes down 24 px of flight before the
 * screen edge it is flying TOWARD.  Checked here:
 *   1. head-on at each edge it is the old rule exactly: down 24 px inside it;
 *   2. along an edge, or away from it, an arrow already within 24 px of it
 *      flies on -- the old rule dropped it at once (mp-hitreal's frost bow, a
 *      bow held by the map's east edge where the camera stops);
 *   3. at a slant, the first edge it meets, less its 24 px of flight;
 *   4. past an edge and flying out: 0; no camera or view: Infinity;
 *   5. against an independent walk of the flight, 2,000 random shots: the room
 *      is where a stepped arrow first comes within 24 px of flight of leaving.
 */
import { ARROW_EDGE_PX, arrowEdgeRoom } from '../../src/game/arrowEdge.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

/* a 390 x 844 phone at the QA phone's folded scale, the view at (1000, 2000) */
const cam = { x: 1000, y: 2000 }, W = 644, H = 1393;
const E = 0, S_ = Math.PI / 2, Wd = Math.PI, N = -Math.PI / 2;

/* ── 1. head-on: the old rule ──────────────────────────────────────────── */
check('1a. the margin is 24 px', ARROW_EDGE_PX === 24);
check('1b. east from the middle: down 24 px inside the east edge',
  near(arrowEdgeRoom(cam, W, H, 1300, 2600, E), (cam.x + W - 24) - 1300));
check('1c. west, north and south likewise',
  near(arrowEdgeRoom(cam, W, H, 1300, 2600, Wd), 1300 - (cam.x + 24))
  && near(arrowEdgeRoom(cam, W, H, 1300, 2600, N), 2600 - (cam.y + 24))
  && near(arrowEdgeRoom(cam, W, H, 1300, 2600, S_), (cam.y + H - 24) - 2600));
check('1d. head-on inside the band: down at once (0), as before',
  arrowEdgeRoom(cam, W, H, cam.x + W - 10, 2600, E) === 0 && arrowEdgeRoom(cam, W, H, cam.x + 10, 2600, Wd) === 0);

/* ── 2. along an edge, or away from it ─────────────────────────────────── */
{
  const x = cam.x + W - 15;   /* 15 px from the east edge: inside the old band */
  const along = arrowEdgeRoom(cam, W, H, x, 2600, S_);
  check('2a. inside the east band, flying south along the edge: flies to the south edge',
    near(along, (cam.y + H - 24) - 2600), along);
  const away = arrowEdgeRoom(cam, W, H, x, 2600, Wd);
  check('2b. ...flying west, away from it: flies across the screen', near(away, x - (cam.x + 24)), away);
  /* mp-hitreal's frost bow: the grip 15 px from the edge, shooting a snowman
     below and a touch west of it (1.675 rad) */
  const frost = arrowEdgeRoom(cam, W, H, x, 2300, 1.675);
  check('2c. the frost case (heading 1.675, slightly away from the edge): room to the south edge, not 0',
    frost > 600, frost);
  const graze = arrowEdgeRoom(cam, W, H, x, 2600, Math.PI / 2 - 0.05);   /* 3 degrees outward */
  check('2d. grazing outward: it flies until its own last 24 px before leaving (15 / sin 3 deg = ~300 px)',
    near(graze, 15 / Math.sin(0.05) - 24, 1e-6) && graze > 250, graze);
}

/* ── 3. at a slant ─────────────────────────────────────────────────────── */
{
  const a = -Math.PI / 4;   /* north-east */
  const tx = (cam.x + W - 1300) / Math.cos(a), ty = (cam.y - 2600) / Math.sin(a);
  check('3a. north-east: the first edge met, less 24 px of flight', near(arrowEdgeRoom(cam, W, H, 1300, 2600, a), Math.min(tx, ty) - 24));
  check('3b. a heading the cosine calls zero is straight up or down, never "the east edge"',
    near(arrowEdgeRoom(cam, W, H, cam.x + W - 1, 2600, N), 2600 - (cam.y + 24)));
}

/* ── 4. outside, and nothing to measure ────────────────────────────────── */
check('4a. past the east edge, flying out: 0', arrowEdgeRoom(cam, W, H, cam.x + W + 50, 2600, E) === 0);
check('4b. past the east edge, flying back in: across the screen',
  near(arrowEdgeRoom(cam, W, H, cam.x + W + 50, 2600, Wd), (cam.x + W + 50) - (cam.x + 24)));
check('4c. no camera, no view size or a NaN: Infinity (no edge, as before)',
  arrowEdgeRoom(null, W, H, 1300, 2600, E) === Infinity
  && arrowEdgeRoom(cam, 0, H, 1300, 2600, E) === Infinity
  && arrowEdgeRoom(cam, W, undefined, 1300, 2600, E) === Infinity
  && arrowEdgeRoom(cam, W, H, NaN, 2600, E) === Infinity
  && arrowEdgeRoom(cam, W, H, 1300, 2600, NaN) === Infinity
  && arrowEdgeRoom({ x: NaN, y: 0 }, W, H, 1300, 2600, E) === Infinity);

/* ── 5. against a stepped flight ───────────────────────────────────────── */
{
  /* deterministic: a small LCG, so a failure is the same failure every run */
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
  let bad = null, n = 0;
  for (let i = 0; i < 2000 && !bad; i++) {
    const x = cam.x + rnd() * W, y = cam.y + rnd() * H, ang = (rnd() * 2 - 1) * Math.PI;
    const room = arrowEdgeRoom(cam, W, H, x, y, ang);
    /* walk the flight 0.25 px at a time to where it would leave the view; the
       arrow comes down 24 px of flight before that */
    const c = Math.cos(ang), s = Math.sin(ang);
    let d = 0;
    while (d < 5000) {
      const px = x + c * d, py = y + s * d;
      if (px < cam.x || px > cam.x + W || py < cam.y || py > cam.y + H) break;
      d += 0.25;
    }
    const want = Math.max(0, d - 24);
    n++;
    if (!(Math.abs(room - want) <= 0.5)) bad = { x, y, ang, room, want };
  }
  check(`5a. ${n} random shots inside the view: the room is a stepped flight's own, to half a pixel`, !bad, bad);
}

console.log(`\narrow-edge: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
