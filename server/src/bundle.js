/* ═══ v2.3.3254: SEVERAL MESSAGES IN ONE FRAME (the quiet phone) ═══
 *
 * Owner, 2026-10-14: "I want you to cut as much as you possibly can IF the
 * loss in quality is negligible or unnoticeable".  On Cloudflare's free plan
 * every incoming socket message may count against the account's 100,000
 * Durable Object requests a day (docs/specs/cloudflare-lab.md, the limit
 * test) -- the game's busiest day was 76,277 -- and the phone sent each of its
 * messages as a frame of its own: a move, the swing beside it, the damage it
 * claimed and the reply to the worker's ping, each one counted.
 *
 * Now a phone the worker tells `caps.bundle` sends everything it has at one
 * moment as ONE frame: a JSON array of the messages it would have sent one by
 * one (src/game/quietPhone.js, wsClient.js wsOut).  The worker takes each in
 * order exactly as if it had come alone (index.js webSocketMessage ->
 * _onMessage): the same handlers, the same AFK clock, the same cadence lanes
 * and caps -- the frame's size gate is the frame's.  What a bundle may not
 * carry:
 *   - a `join` (it opens a session: always a frame of its own);
 *   - anything that is not a plain object (an array in an array, a string);
 *   - more than BUNDLE.MAX messages (the rest are dropped, as a frame over the
 *     size gate is: a phone never sends one).
 * A message that closes the socket (an eviction) ends the bundle there; one
 * whose handler throws does not stop the rest (frames of their own never did).
 *
 * Deploy order: the phone bundles only against a worker that advertises
 * `caps.bundle`, from that socket's own state_sync on (wsClient.js
 * `_capsHere`: a reconnect keeps the last worker's caps until the new one's
 * arrive).  `bundle: false` in the live flags stops
 * advertising it; a worker always TAKES a bundle, so a phone that joined
 * before the switch keeps working until its next join.  A worker without this
 * file never advertised the cap, and a deploy reconnects every phone, so an
 * older worker is never sent one (its default branch would relay the array to
 * the whole room).
 */
export const BUNDLE = Object.freeze({
  /* messages in one frame, at most -- the phone keeps to QUIET.BUNDLE_MAX
     (src/game/quietPhone.js); quiet-phone.test.mjs pins the two */
  MAX: 24,
});

/** The messages a bundle carries that the worker will take, in order. */
export function bundleParts(arr) {
  const out = [];
  if (!Array.isArray(arr)) return out;
  const n = Math.min(arr.length, BUNDLE.MAX);
  for (let i = 0; i < n; i++) {
    const m = arr[i];
    if (!m || typeof m !== 'object' || Array.isArray(m)) continue;
    if (m.type === 'join') continue;
    out.push(m);
  }
  return out;
}
