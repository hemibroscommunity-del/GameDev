/* ═══ v2.3.5283: THE SKILL POINTS' DOOR -- every change to a player's build points goes through here ═══
 * (grand plan step 4.3, card R PR 4; spec docs/specs/skillpoints-door.md;
 *  pinned by server/test/skillpoints-door.test.mjs)
 *
 * WHY.  The points a player earns at a level-up and places on a build
 * (`ps.prog3`: the lane points `pool` and `poolBy`, the shared points
 * `shared`, the placed points `alloc` and `atk`, the rates they were dealt
 * at `ppl` and `spl`; and the old grid's `ps.unspentT2` and
 * `ps.buildPointsThisLvl`) were written by hand in 22 places across three
 * files, and the deal's seven fields behind four callers, each place with
 * its own way of reading the count (below), as gold
 * and the bag were before their doors (gold.js, bag.js).  A rule that
 * should hold for every point -- a log, test mode, the fight lock -- had to
 * be copied into each place by hand.  This is the door the gold door is,
 * for build points.
 *
 * THE DOOR is four plain functions (plain, as the bag's: the points live on
 * a plain block, `ps.prog3`, and the old grid's on `ps`):
 *   pointsGive(rec, n, road, k1, k2)   points INTO a count
 *   pointsTake(rec, n, road, k1, k2)   points OUT of a count
 *   pointsSet(rec, v, road, k1, k2)    a count (or its container) MADE `v`
 *   pointsDeal(p3, deal, road)         the whole build dealt at once: every
 *                                      placed point back, the pools what the
 *                                      levels give (the points reset, the
 *                                      one-level re-deal, the owner's Test
 *                                      panel, the power index's control)
 * Every call names its ROAD -- its row in POINT_ROADS -- and the door does
 * what the row says: which count (`field`, and the keys it takes: a lane
 * `cat`, a stat), how it reads the count before adding (`read`) and the most
 * it may hold after (`cap`).  skillpoints-door.test fails:
 *   - a write to a points field anywhere else in server/src (the block's
 *     shaping, the whole-block loads and two writes that are not build
 *     points are listed there, each with why);
 *   - a call naming a road the table has not got, or with the wrong verb,
 *     or from another file than its row's;
 *   - a road with no caller, or with two;
 *   - a road whose sum is not the line its place had before the door.
 *
 * STEP 1 (this version): NOTHING A PLAYER SEES CHANGES.  Each row keeps the
 * exact read and cap its place had, so the five ways of reading a count are
 * still here -- now as one column of one table, side by side.  The test
 * replays each place's old line against the door for every count a block
 * can hold (whole, fractional, below 0, missing, NaN, a string) and they
 * agree to the bit.  Making them one read is a later step, as the gold
 * door's step 2 was.
 *
 * WHAT IS NOT HERE (on purpose, listed in the test with why):
 *   - THE BLOCK'S SHAPING: prog3.js's pure functions that build or heal a
 *     STORED block before the join adopts it (`_sanitizeProg3`, and the
 *     migrations' folds and grants it shares with migrations.js: the
 *     legacy split, the elemental and luck refunds, the two retro grants).
 *     They write a block that is not yet a live player's -- a copy in the
 *     sanitizer, `blob.prog3` in a migration -- as `_saveRpg`'s fixed list
 *     and `econClean` shape a record.  The one-level re-deal they run is the
 *     door's own deal (road `one_level_redeal`);
 *   - the whole-block assigns (`ps.prog3 =`, `blob.prog3 =`): the join's
 *     adoption of the stored block and the legacy build of migration v10;
 *   - the jackpot's `draw.pool` (cadence.js), gold, not points; and the
 *     power index's control (power.js), a build made up in memory to
 *     measure against, never a player's.
 *
 * No imports: node tests it directly, and nothing here reaches the room. */

/* ── HOW EACH ROAD READS THE COUNT (step 1: as its place did) ──
 * `x` is the count as it is.  The columns differ only for a count no
 * honest road makes -- missing, NaN, fractional, below 0, a string -- which
 * is why they could drift apart unseen. */
export const POINT_READS = Object.freeze({
  /* `p3.pool += n`: the count as it is */
  plain: (x) => x,
  /* `(Number(p3.poolBy[cat]) || 0) + n`: a number, a missing one 0 */
  orZero: (x) => Number(x) || 0,
  /* `Math.max(0, Math.floor(Number(p3.shared) || 0)) + n`: whole, never below 0 */
  whole: (x) => Math.max(0, Math.floor(Number(x) || 0)),
  /* `Math.max(0, Number(p3.poolBy[c]) || 0) - 1`: never below 0, not floored */
  pos: (x) => Math.max(0, Number(x) || 0),
  /* `(typeof cur === 'number' ? cur : 0) + 1`: a number as it is, else 0 */
  num: (x) => (typeof x === 'number' ? x : 0),
});

/* ── THE COUNTS A ROAD MAY WRITE ──
 * on:   the block the count is on: 'p3' (`ps.prog3`) or 'ps' (the old grid's
 *       two, on the player state itself);
 * keys: how many keys name the count under the field (poolBy[cat] 1,
 *       alloc[stat] 1, atk[cat] 1, atk[cat][stat] 2; a road's own `keys`
 *       says which it writes). */
export const POINT_FIELDS = Object.freeze({
  pool: Object.freeze({ on: 'p3', what: 'the lane points not yet placed (all lanes, and the old unchannelled remainder)' }),
  poolBy: Object.freeze({ on: 'p3', what: 'the lane points by the skill that earned them (sword, bow, staff)' }),
  shared: Object.freeze({ on: 'p3', what: 'the shared points not yet placed' }),
  alloc: Object.freeze({ on: 'p3', what: 'the shared (body) stats\' placed points' }),
  atk: Object.freeze({ on: 'p3', what: 'each lane\'s weapon stats\' placed points' }),
  ppl: Object.freeze({ on: 'p3', what: 'the lane points a level the block was dealt at' }),
  spl: Object.freeze({ on: 'p3', what: 'the shared points a level the block was dealt at' }),
  unspentT2: Object.freeze({ on: 'ps', what: 'the old grid\'s points not yet placed' }),
  buildPointsThisLvl: Object.freeze({ on: 'ps', what: 'the old grid\'s points toward its next level' }),
});
/* The fields a deal writes, in the order the deal wrote them (prog3.js
   prog3RespecPoints before the door). */
export const DEAL_FIELDS = Object.freeze(['alloc', 'atk', 'poolBy', 'pool', 'shared', 'ppl', 'spl']);

/* ── EVERY ROAD BUILD POINTS MOVE BY ──
 * verb:  'give', 'take', 'set' or 'deal';
 * field: the count it writes (POINT_FIELDS; a deal writes DEAL_FIELDS);
 * keys:  how many keys it names under the field (0, 1 or 2);
 * read:  how a give or take reads the count (POINT_READS), else null;
 * cap:   the most a give leaves (null: no cap);
 * at:    where its one caller is, for people (the test checks the file).
 * A new way to change build points is a new row here and one call that
 * names it. */
const R = (verb, field, keys, read, cap, at) => Object.freeze({ verb, field, keys, read, cap, at });
export const POINT_ROADS = Object.freeze({
  /* ── a level-up mints (prog3.js _prog3AwardXp) ── */
  level_lane:        R('give', 'pool', 0, 'plain', null, 'prog3.js _prog3AwardXp: a trained level\'s lane points'),
  level_by_heal:     R('set', 'poolBy', 0, null, null, 'prog3.js _prog3AwardXp: a block with no lane breakdown gets an empty one'),
  level_lane_by:     R('give', 'poolBy', 1, 'orZero', null, 'prog3.js _prog3AwardXp: ...stamped to the skill that earned them'),
  level_shared:      R('give', 'shared', 0, 'whole', 999, 'prog3.js _prog3AwardXp: a character level\'s shared points'),

  /* ── a point placed (prog3.js _handleProg3Allocate, prog3_allocate) ── */
  place_by_heal:     R('set', 'poolBy', 0, null, null, 'prog3.js _handleProg3Allocate: a block with no lane breakdown gets an empty one'),
  place_atk_heal:    R('set', 'atk', 0, null, null, 'prog3.js _handleProg3Allocate: a block with no weapon stats gets fresh ones'),
  place_lane_heal:   R('set', 'atk', 1, null, null, 'prog3.js _handleProg3Allocate: a lane with no weapon stats gets fresh ones'),
  place_atk:         R('give', 'atk', 2, 'num', null, 'prog3.js _handleProg3Allocate: a weapon stat placed'),
  place_lane_pool:   R('take', 'pool', 0, 'whole', null, 'prog3.js _handleProg3Allocate: ...its point out of the lane points'),
  place_lane_by:     R('take', 'poolBy', 1, 'pos', null, 'prog3.js _handleProg3Allocate: ...and out of the skill\'s own, when it has one'),
  place_body:        R('give', 'alloc', 1, 'num', null, 'prog3.js _handleProg3Allocate: a shared stat placed'),
  place_shared:      R('take', 'shared', 0, 'whole', null, 'prog3.js _handleProg3Allocate: ...its point out of the shared points'),
  place_body_pool:   R('take', 'pool', 0, 'whole', null, 'prog3.js _handleProg3Allocate: ...or, with none, out of the old remainder'),

  /* ── the whole build dealt again ── */
  points_reset:      R('deal', null, 0, null, null, 'pointsreset.js _handlePointsReset: the free points reset'),
  one_level_redeal:  R('deal', null, 0, null, null, 'prog3.js prog3Redeal: the one-level re-deal, once a block (migration v18 and the join\'s heal)'),
  dev_deal:          R('deal', null, 0, null, null, 'devtools.js _devCombatLevel: the owner\'s Test panel, `deal`'),
  power_control:     R('deal', null, 0, null, null, 'power.js controlBuild: the power index\'s control, a build made up in memory'),

  /* ── the old grid (grids.js; the stat_allocate message) ── */
  bp_level_heal_t2:  R('set', 'unspentT2', 0, null, null, 'grids.js _tryLevelUpFromBuildPoints: a missing count read as 0'),
  bp_level_heal_bp:  R('set', 'buildPointsThisLvl', 0, null, null, 'grids.js _tryLevelUpFromBuildPoints: a missing count read as 0'),
  bp_level_bp:       R('take', 'buildPointsThisLvl', 0, 'plain', null, 'grids.js _tryLevelUpFromBuildPoints: five toward a level, spent'),
  bp_level_t2:       R('give', 'unspentT2', 0, 'plain', null, 'grids.js _tryLevelUpFromBuildPoints: ...five points to place'),
  stat_allocate:     R('take', 'unspentT2', 0, 'plain', null, 'grids.js _handleStatAllocate: an old grid point placed'),

  /* ── a character arrives (join.js _handleJoin) ── */
  join_stored_t2:    R('set', 'unspentT2', 0, null, null, 'join.js _handleJoin: the stored character\'s old grid points'),
  join_stored_bp:    R('set', 'buildPointsThisLvl', 0, null, null, 'join.js _handleJoin: the stored character\'s points toward a level'),
  join_new_t2:       R('set', 'unspentT2', 0, null, null, 'join.js _handleJoin: a new character (0: no claim reaches it)'),
  join_new_bp:       R('set', 'buildPointsThisLvl', 0, null, null, 'join.js _handleJoin: a new character (0: no claim reaches it)'),
});

/* The whole-block assigns: a block made, not a count in it (the test ties
   each to its line).  Like the bag's BAG_WHOLE: what each holds is what the
   stored record held, or what the legacy tracks give a first build. */
export const POINTS_WHOLE = Object.freeze({
  join_adopt: Object.freeze({ at: 'join.js _handleJoin', why: 'the join adopts the stored block, sanitized (the record IS the character while away), or a first build from the legacy tracks' }),
  migrate_legacy: Object.freeze({ at: 'migrations.js (v10)', why: 'a stored record with no block gets one from its legacy tracks, once' }),
});

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* The row for a road and a verb, or a thrown error (nothing written).  Every
   call names a literal row, so a wrong one is a slip the test catches;
   failing loudly keeps one that slipped past from changing a build by a sum
   nobody chose. */
function roadFor(road, verb, nKeys) {
  const row = typeof road === 'string' && own(POINT_ROADS, road) ? POINT_ROADS[road] : null;
  if (!row) throw new Error('points door: no road "' + road + '" (skillpoints.js POINT_ROADS)');
  if (row.verb !== verb) throw new Error('points door: road "' + road + '" is a ' + row.verb + ', not a ' + verb);
  if (nKeys !== undefined && nKeys !== row.keys) throw new Error('points door: road "' + road + '" names ' + row.keys + ' key(s), not ' + nKeys);
  return row;
}
const keysGiven = (k1, k2) => (k2 !== undefined ? 2 : k1 !== undefined ? 1 : 0);

/* The container and key a count lives under: rec.field, rec.field[k1] or
   rec.field[k1][k2].  A missing container is NOT made here (step 1: each
   place read it as it was, and a missing one threw there too). */
function slot(rec, row, k1, k2) {
  if (row.keys === 0) return [rec, row.field];
  if (row.keys === 1) return [rec[row.field], k1];
  return [rec[row.field][k1], k2];
}

/** The count after `n` moves by `road` -- pure, the test's. */
export function pointsAfter(cur, n, road) {
  const row = own(POINT_ROADS, road) ? POINT_ROADS[road] : null;
  if (!row || (row.verb !== 'give' && row.verb !== 'take')) throw new Error('points door: pointsAfter needs a give or take road, not "' + road + '"');
  const x = POINT_READS[row.read](cur);
  const v = row.verb === 'give' ? x + n : x - n;
  return row.cap === null ? v : Math.min(row.cap, v);
}

/** Points INTO a count by `road`.  Returns the count. */
export function pointsGive(rec, n, road, k1, k2) {
  const row = roadFor(road, 'give', keysGiven(k1, k2));
  const [o, k] = slot(rec, row, k1, k2);
  o[k] = pointsAfter(o[k], n, road);
  return o[k];
}

/** Points OUT of a count by `road`.  The caller has already checked there
 *  is one to take (step 1: as each did before the door).  Returns the count. */
export function pointsTake(rec, n, road, k1, k2) {
  const row = roadFor(road, 'take', keysGiven(k1, k2));
  const [o, k] = slot(rec, row, k1, k2);
  o[k] = pointsAfter(o[k], n, road);
  return o[k];
}

/** A count (or a container of counts) MADE `v` by `road`: a load, a heal of
 *  a missing shape.  Returns `v`. */
export function pointsSet(rec, v, road, k1, k2) {
  const row = roadFor(road, 'set', keysGiven(k1, k2));
  const [o, k] = slot(rec, row, k1, k2);
  o[k] = v;
  return v;
}

/** The whole build DEALT by `road`: `deal` holds every DEAL_FIELDS value
 *  (the caller worked them out from the levels: prog3.js
 *  prog3RespecPoints), written in the order the deal always wrote them.
 *  Returns the block. */
export function pointsDeal(p3, deal, road) {
  roadFor(road, 'deal');
  if (!deal || typeof deal !== 'object' || !DEAL_FIELDS.every((f) => own(deal, f))) throw new Error('points door: a deal names every field (' + DEAL_FIELDS.join(', ') + ')');
  for (const f of DEAL_FIELDS) p3[f] = deal[f];
  return p3;
}
