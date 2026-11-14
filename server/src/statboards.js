/* ═══ v2.3.5484: THE STAT BOARDS (card PW) ═══
 *
 * The owner, 2026-11-14: "You can add more stats to leaderboard if you think
 * it's worth it.  Like highest skills in stat allocation?"  The planning
 * session's call, which the owner left to it: ONE BOARD FOR EACH SHARED
 * STAT a player allocates points into (prog3.js PROG3.BODY: whatever that
 * list is, so a new shared stat gets its board and the count grows), ranked
 * by the points allocated, plus ONE board summing the three weapons' damage
 * points (PROG3.ATK `dmg`, "Power" on the Bro tab).  No other per-weapon
 * board: three of each would bury the list.  The names the phone shows are
 * the game's own (src/data/prog3.js PROG3_BODY_META / PROG3_ATK_META), never
 * the retired Might / Fortitude / Vitality / Agility / Mind.
 *
 * THE SERVER'S WORD.  The points are the worker's prog3 record (ps.prog3:
 * `alloc` and `atk`, server-owned end to end), never the phone's; a board
 * row carries them as `statPoints` {<stat>: n, ..., dmg: n}, made by the room
 * (index.js reportToLeaderboard) and kept by the Leaderboard object
 * (leaderboard.js), which ranks `pts_<stat>` by them.  A row without them,
 * or with 0 in a stat, is off that board (a list of fifty players at 0 is
 * worse than a short honest one -- the skill boards' rule).
 *
 * NO NEW WRITE OCCASION.  They ride the board report the room already sends,
 * inside its change signature: a report goes when they change exactly as it
 * goes when a level or a kill does (at most once every LEADERBOARD_MIN_MS),
 * and points change only when a player spends them.
 *
 * THE WIRE.  `caps.statboards` is HOW MANY boards this worker ranks (TRAPS
 * §9: a cap that grows gates by its count): the phone shows the first that
 * many of the order below.  Kill switch `statboards: false` in the live
 * flags: no cap, and no report carries the points (each row loses them at
 * its next report).  Suite: server/test/statboards.test.mjs; spec
 * docs/specs/stat-boards.md.
 */
import { PROG3 } from './prog3.js';

/* the stats, in the boards' order: the shared ones as the table lists them,
   then the weapons' damage summed */
const STATS = Object.freeze([...Object.keys(PROG3.BODY), 'dmg']);

/** The boards' category ids, in order: `pts_<stat>`. */
export const STAT_BOARD_IDS = Object.freeze(STATS.map((k) => 'pts_' + k));

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const MAX = 999 * 3;   /* the storage bound of a stat (PROG3 `cap`), three lanes for dmg */
const whole = (v) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX) : 0;
};

/** The stat a board ranks, or null for a category that is not one. */
export function statOfBoard(category) {
  if (typeof category !== 'string' || !category.startsWith('pts_')) return null;
  const k = category.slice(4);
  return STATS.includes(k) ? k : null;
}

/** A player's allocated points, the worker's own record: every shared stat
 *  and the weapons' damage summed -- or null with no prog3 record. */
export function statPointsOf(ps) {
  const p3 = ps && ps.prog3;
  if (!p3 || typeof p3 !== 'object') return null;
  const out = {};
  for (const k of Object.keys(PROG3.BODY)) out[k] = whole(p3.alloc && own(p3.alloc, k) ? p3.alloc[k] : 0);   // proto-ok: k is one of PROG3.BODY's
  let dmg = 0;
  for (const cat of PROG3.SKILLS) {
    const lane = p3.atk && own(p3.atk, cat) ? p3.atk[cat] : null;
    dmg += whole(lane && own(lane, 'dmg') ? lane.dmg : 0);
  }
  out.dmg = Math.min(MAX, dmg);
  return out;
}

/** Stored or reported points made safe: the known stats only, whole, never
 *  below 0 -- or null. */
export function cleanStatPoints(x) {
  if (!x || typeof x !== 'object') return null;
  const out = {};
  for (const k of STATS) out[k] = whole(own(x, k) ? x[k] : 0);   // proto-ok: k is one of STATS
  return out;
}

export const statBoardMethods = {
  /* the kill switch, read the lower-case way (TRAPS §117): on unless written false */
  _statBoardsOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && own(f, 'statboards') && !f.statboards);
  },
  /* caps.statboards: how many boards, or nothing under the switch */
  _statBoardsCap() { return this._statBoardsOn() ? STAT_BOARD_IDS.length : undefined; },
  /* a board row's points for this player, or null (the switch thrown, no record) */
  _statPointsFor(ps) { return this._statBoardsOn() ? statPointsOf(ps) : null; },
};
