/* ═══ v2.3.4355: THE ZONE GATE'S WAIT -- for a load that is still arriving ═══
 *
 * The owner, at the expo of 2026-11-05, where the judges played on computers
 * while live-streaming: "patches ... showed all round the outer ring of the
 * view, away from my character"; "on a computer the map loads in pieces (many
 * squares not drawn)".  One of its two causes (the other is the ground's
 * pictures on a slow line: public/tools/world/core/ground-worker.js, A SLOW
 * LINE) is the zone gate itself (zoneTransitions.js, v2.3.1405): the loading
 * screen over a zone's way in was raced against a flat 15 s, "so a hung
 * network fetch can never freeze the player forever".  A load that had hung
 * and a load that was merely SLOW looked the same to it.  Reproduced on the
 * test box with the page's processor slowed four times (BT_QA_CPU_THROTTLE=4,
 * the stand-in for a stream's encoder; mp-desksmooth): on a 1920 x 1080
 * window the world's way in took 17.8 s, the gate let go at 15.2 s, and the
 * screen lifted with 14 of the view's 50 pieces of ground not laid -- 11 of
 * them on the view's outer ring, because the pieces were laid row by row from
 * the top and the last rows were the ones cut off.
 *
 * Two rules, both here because node can test them (no imports):
 *
 *   gateCap(progress)   how long the gate waits.  Without `progress`: 15 s,
 *                       as before, for every zone that has no way to say how
 *                       its load is going.  With it (the world's way in:
 *                       worldTrial.js wheelEntryProgress, a number that
 *                       changes each time a piece of ground or a sheet of
 *                       objects comes): past 15 s the gate keeps waiting
 *                       WHILE THE NUMBER KEEPS CHANGING, lets go once it has
 *                       stood still for GATE_QUIET_MS, and never waits past
 *                       GATE_CAP_MAX_MS.  A hung load still frees the player
 *                       at 15 s; a slow one is given the time it is using.
 *
 *   fillOrder(...)      the order the gate's pieces of ground are asked for:
 *                       nearest the arrival first.  So whatever cuts the wait
 *                       short, what is missing is the far edge, for a moment,
 *                       never the ground you stand on.
 *
 * GATE_CAP_MAX_MS stays under the stuck-gate failsafe (zoneTransitions.js,
 * GATE_STALE_MS).  The trip's veil (wheelHome.js TRIP_VEIL_MS, 30 s from the
 * worker's first word) no longer bounds it: the veil holds for as long as
 * the gate into the world is up (wheelTripVeiled), so today's town's art is
 * never loaded for a stop nobody sees, however long the gate waits.
 */

export const GATE_CAP_MS = 15000;       /* a load that says nothing is given this long, as before */
export const GATE_QUIET_MS = 8000;      /* past that: until this long goes by with nothing new (the ground's worker stops waiting for a picture after 3 s without a byte: ground-worker.js GATE_STALL_MS) */
export const GATE_CAP_MAX_MS = 45000;   /* ...and never longer than this (the owner's "Go recommended", 2026-11-09: a slow first visit waits behind the loading screen for the town's pictures -- 2.4 MB, 16 s at 150 KB a second -- and arrives drawn) */
export const GATE_STALE_MS = 50000;     /* the failsafe's age for a gate nothing consumed (zoneTransitions.js; it was 20 s against the flat 15) */
const GATE_TICK_MS = 250;

/** Resolves when the gate should stop waiting for its load.  `progress`: a
 *  function returning a number that changes whenever the load gets something
 *  done, or nothing (the flat GATE_CAP_MS).  `env` (tests): { now, later }. */
export function gateCap(progress, env) {
  const now = (env && env.now) || (() => Date.now());
  const later = (env && env.later) || ((fn, ms) => setTimeout(fn, ms));
  return new Promise((resolve) => {
    if (typeof progress !== 'function') { later(resolve, GATE_CAP_MS); return; }
    const read = () => { try { return progress(); } catch (e) { return null; } };
    const t0 = now();
    let last = read(), lastAt = t0;
    const tick = () => {
      const t = now(), v = read();
      if (v !== last) { last = v; lastAt = t; }
      const age = t - t0;
      if (age >= GATE_CAP_MAX_MS || (age >= GATE_CAP_MS && t - lastAt >= GATE_QUIET_MS)) { resolve(); return; }
      later(tick, GATE_TICK_MS);
    };
    later(tick, GATE_TICK_MS);
  });
}

/** The pieces `i0..i1` x `j0..j1` (each `cs` game px square), nearest the
 *  point (x, y) first: [[i, j], ...].  Ties keep row order, so the same
 *  arrival always asks in the same order. */
export function fillOrder(i0, i1, j0, j1, x, y, cs) {
  const out = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const dx = (i + 0.5) * cs - x, dy = (j + 0.5) * cs - y;
    out.push([i, j, dx * dx + dy * dy, out.length]);
  }
  out.sort((a, b) => a[2] - b[2] || a[3] - b[3]);
  return out.map((p) => [p[0], p[1]]);
}
