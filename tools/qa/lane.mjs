/* ═══ v2.3.5223: EVERY PAGE OF THE GAME A TEST OPENS NAMES ITS LANE (card O PR 3; the grand plan's 2.1, its last sentence) ═══
 *
 * The game draws with one row of knobs, its LANE (src/game/drawLanes.js,
 * docs/LANES.md), picked from the device's facts; `?lane=<name>` in the
 * address picks it instead, and holds the governor's ladder still (unless
 * `?govern=1`: src/game/framePacer.js governOn).  So a test names the lane it
 * plays, and never meets a lane or a rung by accident of the box it runs on:
 *   - a phone scenario (tools/qa/mp/mp-*.mjs) exports `lane` (`export const
 *     lane = 'full';`, written by tools/dev/name-lanes.mjs), and `govern =
 *     true` to ask for the governor; run.mjs refuses one with no lane, or a
 *     lane not in the table, and the harness puts it on every page it opens;
 *   - any other tool that opens the game's page wraps its address in
 *     withLane() (the `full` lane: today's drawing, exactly).
 * No imports: the harness, run.mjs and the guard (tools/guards/
 * scenario-lanes.test.mjs) read it.
 */

/* the lane every test plays unless its scenario names another */
export const TEST_LANE = 'full';

/** The lane's part of a page's query, unless the query already names one:
 *  'lane=<lane>', and 'govern=1' where asked (and not named).  '' when the
 *  query has both. */
export function laneParts(query, lane = TEST_LANE, govern = false) {
  const q = typeof query === 'string' ? query : '';
  const out = [];
  if (!/(?:^|[?&])lane=/.test(q)) out.push('lane=' + (lane || TEST_LANE));
  if (govern && !/(?:^|[?&])govern=/.test(q)) out.push('govern=1');
  return out.join('&');
}

/** The game's address with its lane on it (and `govern=1` where asked): kept
 *  as written otherwise -- no parameter is re-spelled (the game reads some by
 *  their bare name, `?nospawn`). */
export function withLane(url, lane = TEST_LANE, govern = false) {
  const s = String(url);
  const hashAt = s.indexOf('#');
  const head = hashAt >= 0 ? s.slice(0, hashAt) : s;
  const hash = hashAt >= 0 ? s.slice(hashAt) : '';
  const qAt = head.indexOf('?');
  const add = laneParts(qAt >= 0 ? head.slice(qAt + 1) : '', lane, govern);
  if (!add) return s;
  const sep = qAt < 0 ? '?' : (head.endsWith('?') || head.endsWith('&') ? '' : '&');
  return head + sep + add + hash;
}

/** v2.3.5860 (card O2 PR 1): the lane a page plays under a slow profile
 *  (tools/qa/profiles.mjs, BT_QA_PROFILE): the profile's, in place of the
 *  scenario's own; `lane` itself with no profile. */
export function profileLane(lane, profile) {
  return profile && typeof profile.lane === 'string' && profile.lane ? profile.lane : lane;
}
