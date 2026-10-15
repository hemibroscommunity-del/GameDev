/* ═══ v2.3.3204: A STEADY WALK ON THE SAFE GROUND IS SENT HALF AS OFTEN ═══
 *
 * Owner, 2026-10-13: "begin looking at additional ways to increase the
 * maximum number of concurrent players without noticeably decreasing
 * quality."
 *
 * While anyone shares your zone this phone sends its position every 33 ms
 * (networking/wsClient.js MOVE_GAP_SEEN_MS) -- in the Wheel, which is one
 * zone, that is always.  Since v2.3.3203 the worker passes a steady walker on
 * to the other phones at most every 66 ms (server/src/steadymovers.js): the
 * phones draw other players moving along the speed of their last update, so
 * the updates in between change nothing anyone sees.  Half of a steady
 * walker's moves were taken in, parsed, judged -- and then held.  This holds
 * them here instead, by the same rule:
 *   - every field of the move but the position and speed is as it was sent
 *     (facing, zone, gear, harvest, shield, roll, sprint ... -- read off the
 *     move itself, so a field added later is covered too);
 *   - still moving, or still standing (a start or a stop goes at once);
 *   - the speed of the last move sent, give or take a thumb's wobble (V_REL,
 *     about 2 degrees), within ERR_PX of the line it drew and about as far
 *     along it as that speed takes you.
 * Then the move may wait until GAP_MS after the last one sent.  A turn, a
 * stop, new gear, a shove -- anything else -- goes on the next batch, 33 ms,
 * as before; what waits is never lost, the next frame overwrites it with
 * where you are then.
 *
 * ONLY ON THE WHEEL'S SAFE GROUND, and not in a fight (wsClient.js
 * moveDietOn): there the worker's copy of you is used for nothing a few
 * pixels matter to.  Off it, monsters chase that copy and a player's hit is
 * judged against it.  66 ms is the rate a phone alone in its zone has always
 * sent at (v2.3.1767, the owner's call).
 *
 * The numbers MIRROR the worker's STEADY (server/test/move-diet.test.mjs pins
 * them), so what this lets wait is what the worker would have held.  No
 * imports: node tests it, and the load test's bots use it.
 */
export const MOVE_DIET = Object.freeze({
  /* the longest a steady walk's move waits: STEADY.MAX_MS */
  GAP_MS: 66,
  /* off the line it was drawn along: STEADY.ERR_PX */
  ERR_PX: 2,
  /* the speed may differ by this share of it, or V_MIN hundredths:
     STEADY.V_REL / V_MIN */
  V_REL: 0.04,
  V_MIN: 3,
  /* along the line: a frame or two of this phone's own timing */
  JITTER_MS: 33,
});

/* a move's vx/vy: hundredths of a pixel a 60 Hz frame -> pixels a ms */
const PX_PER_MS = 60 / 100 / 1000;
const MOTION = { x: 1, y: 1, vx: 1, vy: 1 };

function num(v) { return typeof v === 'number' && Number.isFinite(v) ? v : 0; }

/**
 * May this move wait?  `last` is the move that went out last and `lastAt`
 * when it was made, `m` the move now and `at` when IT was made (the frame
 * that wrote it, not the batch that sends it).
 */
export function steadyMove(last, m, lastAt, at) {
  if (!last || !m || typeof lastAt !== 'number' || typeof at !== 'number') return false;
  const dt = at - lastAt;
  if (!(dt >= 0)) return false;
  for (const k in m) if (!MOTION[k] && m[k] !== last[k]) return false;
  for (const k in last) if (!MOTION[k] && m[k] !== last[k]) return false;
  if (typeof m.x !== 'number' || typeof m.y !== 'number' || typeof last.x !== 'number' || typeof last.y !== 'number') return false;
  const vx = num(m.vx), vy = num(m.vy), lvx = num(last.vx), lvy = num(last.vy);
  const moving = vx !== 0 || vy !== 0;
  if (moving !== (lvx !== 0 || lvy !== 0)) return false;
  const dx = m.x - last.x, dy = m.y - last.y;
  const E = MOVE_DIET.ERR_PX;
  /* standing: where you stood */
  if (!moving) return dx * dx + dy * dy <= E * E;
  /* walking: at the speed that was sent ... */
  const sp = Math.sqrt(lvx * lvx + lvy * lvy);
  const vtol = Math.max(MOVE_DIET.V_MIN, sp * MOVE_DIET.V_REL);
  if (Math.abs(vx - lvx) > vtol || Math.abs(vy - lvy) > vtol) return false;
  /* ... on its line ... */
  const ux = lvx / sp, uy = lvy / sp;
  if (Math.abs(dx * uy - dy * ux) > E) return false;
  /* ... and about as far along it as that speed takes you */
  const along = dx * ux + dy * uy;
  return Math.abs(along - sp * PX_PER_MS * dt) <= E + sp * PX_PER_MS * MOVE_DIET.JITTER_MS;
}

/** Inside the safe ground's circle (`centre`, radius `r`, game px)? */
export function onSafeGround(x, y, centre, r) {
  if (typeof x !== 'number' || typeof y !== 'number' || !centre || !(r > 0)) return false;
  const dx = x - centre[0], dy = y - centre[1];
  return dx * dx + dy * dy < r * r;
}

/**
 * The batch's question (wsClient.js flushInputBuffer): may the pending move
 * wait until GAP_MS after the last one sent?  `on` is the phone's own say
 * (wsClient.js moveDietOn: the worker advertises caps.movediet, you are in
 * the Wheel, not in a fight); both moves in the Wheel, both on its safe
 * ground (`centre`, `safeR`), and the pending one steady.
 */
export function dietMayWait(on, pending, pendingAt, sent, sentAt, centre, safeR) {
  if (!on || !pending || !sent) return false;
  if (pending.z !== 'wheel' || sent.z !== 'wheel') return false;
  if (!onSafeGround(pending.x, pending.y, centre, safeR) || !onSafeGround(sent.x, sent.y, centre, safeR)) return false;
  return steadyMove(sent, pending, sentAt, pendingAt);
}
