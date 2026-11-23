/* The skill points' door -- v2.3.5283 (grand plan step 4.3, card R PR 4;
 * spec docs/specs/skillpoints-door.md; src/skillpoints.js).
 *
 * A player's build points (`ps.prog3`'s lane, shared and placed points and
 * their rates; the old grid's `unspentT2` and `buildPointsThisLvl`) were
 * written by hand in 22 places across three files (and the deal's seven
 * fields behind four callers), each reading the count its own way.  The door puts every change through four functions
 * (pointsGive, pointsTake, pointsSet, pointsDeal), each call naming its
 * ROAD, its row in POINT_ROADS.  This suite holds it:
 *
 *   1. THE SUMS: every give and take road, replayed against its own
 *      longhand line (EXPECT: at v2.3.5283, the exact line its place had
 *      before the door) for every count a block can hold -- whole,
 *      fractional, below 0, missing, null, NaN, a string, huge -- and many
 *      amounts: the same value, to the bit.  A set leaves what it is given;
 *      a deal writes its seven fields, in their old order.  Step 1 changes
 *      nothing a player can see, and this is the proof;
 *   2. ONE DOOR: no points field is written anywhere in server/src but
 *      skillpoints.js -- but for the block's shaping (SHAPERS: prog3.js's
 *      pure functions on a stored block or a copy, before the join adopts
 *      it), the whole-block assigns (WHOLE) and two writes that are not
 *      build points (NOT_POINTS), each with why; a stale entry fails;
 *   3. ONE ROW, ONE PLACE: every call names a road the table has, with its
 *      verb, from the file its row names; every road has exactly one caller;
 *   4. A WRONG ROAD changes nothing: an unknown road, a wrong verb, an
 *      Object.prototype name, the wrong number of keys -- each throws, the
 *      block untouched;
 *   5. THE ROOM: a level-up mints, a placed point spends, and the points
 *      reset deals, on a GameRoom, through the door.
 *
 * BREAK PROOF (rule 8), tried by hand, 2026-11-14:
 *   - `p3.pool = poolN - 1;` put back in prog3.js _handleProg3Allocate      -> FAIL 2
 *   - level_shared's cap 999 changed to 9999 in POINT_ROADS                 -> FAIL 1
 *   - a second `pointsGive(p3, 1, 'level_lane')` in prog3.js                -> FAIL 3
 *
 * A new way to change build points: a row in POINT_ROADS, one call that
 * names it, and (a give or a take) its longhand line in EXPECT below.
 */
import { readFileSync } from 'node:fs';
import { SRC_DIR, srcFiles } from './src-walk.mjs';
import { POINT_ROADS, POINT_READS, POINT_FIELDS, DEAL_FIELDS, POINTS_WHOLE, pointsAfter, pointsGive, pointsTake, pointsSet, pointsDeal } from '../src/skillpoints.js';
import { PROG3, prog3XpRequired } from '../src/prog3.js';
import { openRoom, makeStorage, join, fakeWs, settle, playTour, roomGuard } from './testroom.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 900) : ''); }
}
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const same = (a, b) => Object.is(a, b) || (typeof a === 'string' && a === b);
const show = (v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v === undefined ? 'undefined' : v);

/* ── 1. THE SUMS ─────────────────────────────────────────────────────────── */
/* Each give and take road's line before the door (v2.3.5283), `c` the count
   as it was, `n` the amount. */
const EXPECT = {
  level_lane:      (c, n) => c + n,                                                    /* p3.pool += PROG3.POINTS_PER_LEVEL */
  level_lane_by:   (c, n) => (Number(c) || 0) + n,                                     /* p3.poolBy[cat] = (Number(p3.poolBy[cat]) || 0) + ... */
  level_shared:    (c, n) => Math.min(999, Math.max(0, Math.floor(Number(c) || 0)) + n),  /* p3.shared = Math.min(999, Math.max(0, Math.floor(Number(p3.shared) || 0)) + ...) */
  place_atk:       (c, n) => (typeof c === 'number' ? c : 0) + n,                      /* cur = typeof ... === 'number' ? ... : 0; p3.atk[cat][stat] = cur + 1 */
  place_lane_pool: (c, n) => Math.max(0, Math.floor(Number(c) || 0)) - n,              /* poolN = Math.max(0, Math.floor(Number(p3.pool) || 0)); p3.pool = poolN - 1 */
  place_lane_by:   (c, n) => Math.max(0, Number(c) || 0) - n,                          /* chan(cat) = Math.max(0, Number(p3.poolBy[c]) || 0); p3.poolBy[cat] = chan(cat) - 1 */
  place_body:      (c, n) => (typeof c === 'number' ? c : 0) + n,                      /* p3.alloc[stat] = cur + 1 */
  place_shared:    (c, n) => Math.max(0, Math.floor(Number(c) || 0)) - n,              /* sharedN = ...; p3.shared = sharedN - 1 */
  place_body_pool: (c, n) => Math.max(0, Math.floor(Number(c) || 0)) - n,              /* p3.pool = poolN - 1 */
  bp_level_bp:     (c, n) => c - n,                                                    /* ps.buildPointsThisLvl -= 5 */
  bp_level_t2:     (c, n) => c + n,                                                    /* ps.unspentT2 += 5 */
  stat_allocate:   (c, n) => c - n,                                                    /* ps.unspentT2 -= 1 */
};
const COUNTS = [0, 1, 3, 7.5, 998, 999, 1000, 9999, -1, -2.5, undefined, null, NaN, Infinity, -Infinity, '5', '', 'x', '2.9', true];
const AMOUNTS = [1, 3, 5, 6, 9, 0];
{
  const gives = Object.keys(POINT_ROADS).filter((r) => POINT_ROADS[r].verb === 'give' || POINT_ROADS[r].verb === 'take');
  check('1. every give and take road has its longhand line in EXPECT, and EXPECT nothing else', gives.every((r) => own(EXPECT, r)) && Object.keys(EXPECT).every((r) => gives.includes(r)), { missing: gives.filter((r) => !own(EXPECT, r)), extra: Object.keys(EXPECT).filter((r) => !gives.includes(r)) });
  for (const road of gives) {
    if (!own(EXPECT, road)) continue;
    const off = [];
    for (const c of COUNTS) for (const n of AMOUNTS) {
      const want = EXPECT[road](c, n), got = pointsAfter(c, n, road);
      if (!same(got, want)) off.push({ c: show(c), n, want: show(want), got: show(got) });
    }
    /* through the door on a block, at its keys */
    const row = POINT_ROADS[road];
    for (const c of COUNTS) {
      const rec = row.keys === 0 ? { [row.field]: c } : row.keys === 1 ? { [row.field]: { k: c } } : { [row.field]: { a: { b: c } } };
      const keys = row.keys === 0 ? [] : row.keys === 1 ? ['k'] : ['a', 'b'];
      const fn = row.verb === 'give' ? pointsGive : pointsTake;
      fn(rec, 1, road, ...keys);
      const landed = row.keys === 0 ? rec[row.field] : row.keys === 1 ? rec[row.field].k : rec[row.field].a.b;
      if (!same(landed, EXPECT[road](c, 1))) off.push({ via: 'door', c: show(c), want: show(EXPECT[road](c, 1)), got: show(landed) });
    }
    check('1. ' + road + ' (' + row.verb + ', ' + row.field + '): the same count as its line before the door', off.length === 0, off.slice(0, 4));
  }
  /* a set leaves what it is given, at its keys */
  const sets = Object.keys(POINT_ROADS).filter((r) => POINT_ROADS[r].verb === 'set');
  const offSet = [];
  for (const road of sets) {
    const row = POINT_ROADS[road];
    for (const v of [0, 4, -1, 2.5, NaN, undefined, { sword: 0, bow: 0, staff: 0 }]) {
      const rec = row.keys === 0 ? { [row.field]: 9 } : { [row.field]: { k: 9 } };
      const keys = row.keys === 0 ? [] : ['k'];
      pointsSet(rec, v, road, ...keys);
      const landed = row.keys === 0 ? rec[row.field] : rec[row.field].k;
      if (!Object.is(landed, v)) offSet.push({ road, v: show(v), got: show(landed) });
    }
  }
  check('1. every set road leaves what it is given (' + sets.length + ' roads)', offSet.length === 0 && sets.length > 0, offSet.slice(0, 4));
  /* a deal: its seven fields, in their old order */
  const order = [];
  const rec = new Proxy({}, { set(t, k, v) { order.push(k); t[k] = v; return true; } });
  const deal = { alloc: { hp: 0 }, atk: { sword: {} }, poolBy: { sword: 3, bow: 0, staff: 0 }, pool: 3, shared: 3, ppl: 3, spl: 3 };
  pointsDeal(rec, deal, 'points_reset');
  check('1. a deal writes its seven fields, in the order prog3RespecPoints wrote them before the door', order.join() === DEAL_FIELDS.join() && order.join() === 'alloc,atk,poolBy,pool,shared,ppl,spl' && DEAL_FIELDS.every((f) => rec[f] === deal[f]), order);
  let threw = false;
  try { pointsDeal({}, { pool: 1 }, 'points_reset'); } catch (e) { threw = /every field/.test(String(e.message)); }
  check('1. ...and a deal missing a field throws, writing nothing', threw);
  check('1. every road\'s field is a points field, its read a read, and only a give caps',
    Object.entries(POINT_ROADS).every(([, r]) => (r.verb === 'deal' ? r.field === null : own(POINT_FIELDS, r.field))
      && (r.verb === 'give' || r.verb === 'take' ? own(POINT_READS, r.read) : r.read === null)
      && (r.cap === null || (r.verb === 'give' && Number.isFinite(r.cap)))));
}

/* ── 2. ONE DOOR ─────────────────────────────────────────────────────────── */
/* Comments out, line numbers kept (the gold door's strip). */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
const files = srcFiles();
const code = Object.create(null);
for (const f of files) code[f] = strip(readFileSync(new URL(f, SRC_DIR), 'utf8'));
const lineOf = (s, i) => s.slice(0, i).split('\n').length;
const lineAt = (s, i) => { const a = s.lastIndexOf('\n', i) + 1, b = s.indexOf('\n', i); return s.slice(a, b < 0 ? s.length : b); };
const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'with', 'return', 'else', 'do', 'try']);
/* The function a write sits in: the last `export function NAME(` or a
   method's `  NAME(` (two spaces in) above it. */
function fnAt(s, i) {
  const head = s.slice(0, i);
  let best = null;
  for (const m of head.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(|^ {2}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)\n]*\)\s*\{/gm)) {
    const name = m[1] || m[2];
    if (!KEYWORDS.has(name)) best = name;   /* `  for (...) {` is no method */
  }
  return best;
}

/* The block's shaping: prog3.js's pure functions that build or heal a STORED
   block (a copy in the sanitizer, `blob.prog3` in a migration) before the
   join adopts it.  None runs on a live player's points. */
const SHAPERS = {
  _sanitizeProg3: 'the join\'s clean of a stored block: a fresh block (`out`) built from it, bounded, and adopted whole (POINTS_WHOLE join_adopt)',
  prog3GrantRetroPoints: 'migration v14 and the sanitizer\'s heal: the 3-a-level back-pay, once (its `ppl` stamp)',
  prog3SplitAtk: 'migration v11 and the sanitizer\'s heal (on a copy): the one alloc split into body and weapon stats, the weapon points refunded',
  prog3MoveElemToAtk: 'migration v15 and the sanitizer\'s heal (on a copy): the old body elemental stat refunded',
  prog3FoldLuck: 'migration v17 and the sanitizer\'s heal (on a copy): crit and crit damage refunded into their lane',
  prog3GrantSharedPoints: 'migration v17 and the sanitizer\'s heal: the shared points\' back-pay, once (its `spl` stamp)',
};
/* The whole-block assigns, each tied to a POINTS_WHOLE row. */
const WHOLE = [
  { file: 'join.js', text: '_ps.prog3 = _p3Adopted', row: 'join_adopt' },
  { file: 'migrations.js', text: 'blob.prog3 = prog3FromLegacy(blob)', row: 'migrate_legacy' },
];
/* What writes a points-named field that is NOT a player's build points. */
const NOT_POINTS = [
  { file: 'cadence.js', text: 'draw.pool += amount', why: 'the weekly jackpot\'s gold pool (`jackpot:draw`), not points' },
  { file: 'power.js', text: 'p3.alloc[k] = n', why: 'the power index\'s control: a build made up in memory to measure against (controlBuild), never a player\'s' },
  { file: 'power.js', text: 'p3.shared = Math.max(0, p3.shared - spent)', why: 'the same control' },
  { file: 'power.js', text: 'p3.atk[cat][k] = n', why: 'the same control' },
  { file: 'power.js', text: 'p3.poolBy[cat] = Math.max(0, p3.poolBy[cat] - lane)', why: 'the same control' },
  { file: 'power.js', text: 'p3.pool = Math.max(0, p3.pool - lane)', why: 'the same control' },
];
const FIELDS = '(?:pool|poolBy|shared|alloc|atk|ppl|spl|unspentT2|buildPointsThisLvl|prog3)';
const WRITE = new RegExp('\\.' + FIELDS + '\\b(?:\\s*\\[[^\\]\\n]*\\])*\\s*(?:[-+*/%]?=(?!=)|\\+\\+|--)|(?:\\+\\+|--)\\s*[\\w$.]*\\.' + FIELDS + '\\b|\\bdelete\\s+[\\w$.\\[\\]\'"]*\\.' + FIELDS + '\\b', 'g');
{
  const found = [];
  const seen = new Set();
  const shapersSeen = new Set();
  for (const f of files) {
    if (f === 'skillpoints.js') continue;
    const s = code[f];
    for (const m of s.matchAll(WRITE)) {
      const line = lineAt(s, m.index);
      const np = NOT_POINTS.find((a) => a.file === f && line.includes(a.text));
      if (np) { seen.add(np); continue; }
      const w = WHOLE.find((a) => a.file === f && line.includes(a.text));
      if (w) { seen.add(w); continue; }
      if (f === 'prog3.js') {
        const fn = fnAt(s, m.index);
        if (fn && own(SHAPERS, fn)) { shapersSeen.add(fn); continue; }
      }
      found.push(f + ':' + lineOf(s, m.index) + ' ' + line.trim().slice(0, 100));
    }
  }
  check('2. no build points are written in server/src but through the skill points\' door (skillpoints.js)', found.length === 0, found);
  check('2. every NOT_POINTS and WHOLE entry still exists (a stale one is deleted)', seen.size === NOT_POINTS.length + WHOLE.length,
    [...NOT_POINTS, ...WHOLE].filter((a) => !seen.has(a)).map((a) => a.file + ' ' + a.text));
  check('2. every SHAPERS function still writes points (a stale one is deleted)', Object.keys(SHAPERS).every((k) => shapersSeen.has(k)), Object.keys(SHAPERS).filter((k) => !shapersSeen.has(k)));
  check('2. every WHOLE entry names a POINTS_WHOLE row, and every row is named once',
    WHOLE.every((w) => own(POINTS_WHOLE, w.row)) && Object.keys(POINTS_WHOLE).every((r) => WHOLE.filter((w) => w.row === r).length === 1));
  /* the strip and the finder themselves */
  const probe = strip('function a() {\n  /* p3.pool = 1 */\n  x.pool = 2; // y.shared = 3\n}\n  _m(z) {\n  for (const k of ks) {\n  z.spl = 1;\n');
  const hits = [...probe.matchAll(WRITE)].map((m) => [lineOf(probe, m.index), fnAt(probe, m.index)]);
  check('2. ...the scan skips comments and finds a write\'s function (a method too, never a `for`)', JSON.stringify(hits) === '[[3,"a"],[7,"_m"]]', hits);
}

/* ── 3. ONE ROW, ONE PLACE ───────────────────────────────────────────────── */
/* Every door call (and prog3RespecPoints, the deal's front), its arguments
   split at the top level (strings and brackets skipped): the road is the
   third. */
const CALL = /\b(pointsGive|pointsTake|pointsSet|pointsDeal|prog3RespecPoints)\(/g;
const VERB = { pointsGive: 'give', pointsTake: 'take', pointsSet: 'set', pointsDeal: 'deal', prog3RespecPoints: 'deal' };
function callsIn(s) {
  const out = [];
  for (const m of s.matchAll(CALL)) {
    const before = s.slice(Math.max(0, m.index - 12), m.index);
    if (/function\s+$|\.\s*$/.test(before)) continue;   /* its own definition, or a method of something else */
    const args = [];
    let i = m.index + m[0].length, depth = 1, q = null, start = i;
    for (; i < s.length && depth > 0; i++) {
      const ch = s[i];
      if (q) { if (ch === '\\') i++; else if (ch === q) q = null; continue; }
      if (ch === '\'' || ch === '"' || ch === '`') q = ch;
      else if (ch === '(' || ch === '{' || ch === '[') depth++;
      else if (ch === ')' || ch === '}' || ch === ']') { depth--; if (depth === 0) args.push(s.slice(start, i)); }
      else if (ch === ',' && depth === 1) { args.push(s.slice(start, i)); start = i + 1; }
    }
    const lit = args[2] !== undefined ? /^\s*'([A-Za-z0-9_]+)'\s*$/.exec(args[2]) : null;
    out.push({ fn: m[1], verb: VERB[m[1]], road: lit ? lit[1] : null, raw: (args[2] || '').trim(), at: m.index, line: lineOf(s, m.index) });
  }
  return out;
}
{
  const byRoad = Object.create(null);
  const bad = [];
  const passThrough = [];
  for (const f of files) {
    if (f === 'skillpoints.js') continue;
    for (const c of callsIn(code[f])) {
      const where = f + ':' + c.line;
      /* the one call that hands on its caller's road: the deal's front */
      if (!c.road && f === 'prog3.js' && c.fn === 'pointsDeal' && c.raw === 'road' && fnAt(code[f], c.at) === 'prog3RespecPoints') { passThrough.push(where); continue; }
      if (!c.road) { bad.push(where + ' ' + c.fn + ' names no road as a plain string (' + c.raw + ')'); continue; }
      if (!own(POINT_ROADS, c.road)) { bad.push(where + ' names "' + c.road + '", which POINT_ROADS has not got'); continue; }
      const row = POINT_ROADS[c.road];
      if (row.verb !== c.verb) bad.push(where + ' ' + c.road + ' is a ' + row.verb + ', called as a ' + c.verb);
      if (row.at.split(' ')[0] !== f) bad.push(where + ' ' + c.road + '\'s row says it is in ' + row.at.split(' ')[0]);
      (byRoad[c.road] = byRoad[c.road] || []).push(where);
    }
  }
  check('3. every call names a road the table has, with its verb, from its row\'s file', bad.length === 0, bad);
  check('3. ...and one call alone hands on its caller\'s road (pointsDeal in prog3RespecPoints)', passThrough.length === 1, passThrough);
  const none = Object.keys(POINT_ROADS).filter((r) => !byRoad[r]);
  const twice = Object.keys(byRoad).filter((r) => byRoad[r].length > 1).map((r) => r + ': ' + byRoad[r].join(', '));
  check('3. every road has a caller (a row nobody calls is deleted with its feature)', none.length === 0, none);
  check('3. no road has two callers (a second place is a second row)', twice.length === 0, twice);
  check('3. at v2.3.5283: 26 roads, 22 live places and the 4 deals\' callers',
    Object.keys(POINT_ROADS).length >= 26, Object.keys(POINT_ROADS).length);
}

/* ── 4. A WRONG ROAD CHANGES NOTHING ─────────────────────────────────────── */
{
  const tries = [
    [pointsGive, 'no_such_road', []], [pointsTake, 'no_such_road', []], [pointsSet, 'no_such_road', []], [pointsDeal, 'no_such_road', []],
    [pointsGive, 'constructor', []], [pointsTake, '__proto__', []], [pointsSet, 'toString', []], [pointsDeal, 'hasOwnProperty', []],
    [pointsGive, 'place_lane_pool', []],   /* a take, called as a give */
    [pointsTake, 'level_lane', []],        /* a give, called as a take */
    [pointsSet, 'level_shared', []],       /* a give, called as a set */
    [pointsGive, 'points_reset', []],      /* a deal, called as a give */
    [pointsGive, 'level_lane', ['sword']], /* one key too many */
    [pointsGive, 'place_atk', ['sword']],  /* one key too few */
    [pointsTake, undefined, []], [pointsGive, null, []],
  ];
  for (const [fn, road, keys] of tries) {
    const p3 = { pool: 5, poolBy: { sword: 5, bow: 0, staff: 0 }, shared: 5, alloc: { hp: 0 }, atk: { sword: { dmg: 0 } } };
    const before = JSON.stringify(p3);
    let threw = false;
    try { fn === pointsDeal ? fn(p3, { alloc: {}, atk: {}, poolBy: {}, pool: 0, shared: 0, ppl: 3, spl: 3 }, road) : fn(p3, 1, road, ...keys); } catch (e) { threw = /points door/.test(String(e && e.message)); }
    check('4. ' + fn.name + '(' + String(road) + (keys.length ? ', ' + keys.join(', ') : '') + ') throws and leaves the block as it was', threw && JSON.stringify(p3) === before, { threw, p3 });
  }
  let threw = false;
  try { pointsAfter(1, 1, 'join_new_t2'); } catch (e) { threw = true; }
  check('4. pointsAfter has no answer for a set road', threw);
}

/* ── 5. THE ROOM ─────────────────────────────────────────────────────────── */
{
  const st = makeStorage();
  const room = await openRoom(st);
  const ws = fakeWs('a');
  const pid = 'bp_points_a';
  await join(room, ws, pid, { loginTaken: true });
  const ps = room.playerState[pid];
  const p3 = ps && ps.prog3;
  check('5. a new character joins with a build: no points, the old grid\'s two at 0 (join_new_t2, join_new_bp)',
    !!p3 && p3.pool === 0 && p3.shared === 0 && ps.unspentT2 === 0 && ps.buildPointsThisLvl === 0, p3 && { pool: p3.pool, shared: p3.shared, t2: ps.unspentT2, bp: ps.buildPointsThisLvl });
  /* a level-up: one sword level's worth of xp */
  room._prog3AwardXp(pid, ps, 'sword', prog3XpRequired(1), { flat: true });
  check('5. a level-up mints the lane points and the shared points (level_lane, level_lane_by, level_shared)',
    p3.sk.sword.level === 2 && p3.pool === PROG3.POINTS_PER_LEVEL && p3.poolBy.sword === PROG3.POINTS_PER_LEVEL && p3.shared === PROG3.SHARED_POINTS_PER_LEVEL,
    { lv: p3.sk.sword.level, pool: p3.pool, poolBy: p3.poolBy, shared: p3.shared });
  /* a point placed on a shared stat, and one on a weapon stat */
  room._handleProg3Allocate({ id: pid }, { stat: 'hp' });
  room._handleProg3Allocate({ id: pid }, { stat: 'dmg', cat: 'sword' });
  await settle();
  check('5. a placed point moves one point from its pool to its stat (place_body and place_shared; place_atk, place_lane_pool and place_lane_by)',
    p3.alloc.hp === 1 && p3.shared === PROG3.SHARED_POINTS_PER_LEVEL - 1 && p3.atk.sword.dmg === 1 && p3.pool === PROG3.POINTS_PER_LEVEL - 1 && p3.poolBy.sword === PROG3.POINTS_PER_LEVEL - 1,
    { alloc: p3.alloc.hp, shared: p3.shared, dmg: p3.atk.sword.dmg, pool: p3.pool, poolBy: p3.poolBy });
  /* the points reset deals it all back */
  room._handlePointsReset({ id: pid });
  await settle();
  check('5. the points reset deals every placed point back (points_reset)',
    p3.alloc.hp === 0 && p3.atk.sword.dmg === 0 && p3.pool === PROG3.POINTS_PER_LEVEL && p3.poolBy.sword === PROG3.POINTS_PER_LEVEL && p3.shared === PROG3.SHARED_POINTS_PER_LEVEL,
    { alloc: p3.alloc.hp, dmg: p3.atk.sword.dmg, pool: p3.pool, poolBy: p3.poolBy, shared: p3.shared });
}

/* ══════════ R. THE RUNNING ROOM (v2.3.6440, card DG PR 1) ══════════
   The tour (testroom.mjs playTour: a quest handed in) played on a guarded
   room.  A second writer of build points planted on its paths is refused there,
   however it is spelled (Object.assign, `||=`, a computed key, an alias, a
   destructure, `delete`), and fails this suite: testroom.mjs "THE RUNNING
   ROOM REFUSES".  Break proof: plants1.json (tools/dev/plants/). */
{
  const t = await playTour({ tag: 'skillpoints' });
  check('R. the tour plays under the running room\'s guard', roomGuard.armed());
  check('R. ...each of its steps did what it does (a quest handed in, paid)', t.steps.length > 0 && t.steps.every((x) => x.paid), t.steps);
  check('R. ...and no write of a guarded field was refused (testroom.mjs)', roomGuard.refusals().length === 0, roomGuard.refusals().slice(0, 5));
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
if (failures) { console.log('skillpoints-door: FAILED'); process.exit(1); }
console.log('all skillpoints-door checks passed');
