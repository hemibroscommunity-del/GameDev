/* The bag door -- v2.3.4810 (spec docs/specs/bag-door.md; src/bag.js).
 *
 * A count in a player's bag was changed by hand in 69 places across 28 files,
 * each reading the count its own way (eight ways) and emptying a stack its
 * own way (two rules).  The door puts every change through three functions
 * (bagGive, bagTake, bagSet), each call naming its ROAD, its row in
 * BAG_ROADS.  This suite holds it:
 *
 *   1. THE SUMS: every road, replayed against its own longhand line (at
 *      v2.3.4810, the exact line its place had before the door) for every
 *      count a bag can hold -- whole, fractional, below 0, missing, null,
 *      NaN, a string, Infinity -- under a plain key and under 'constructor'
 *      (an Object.prototype name, where the own-key reads differ), and many
 *      amounts: the same bag after, to the bit, stack gone or not;
 *   2. ONE DOOR: no bag count is written anywhere in server/src but bag.js,
 *      directly or through a name that holds the bag; the whole-bag assigns
 *      that stay (a new bag, the join's load, the death wipe) are listed;
 *   3. ONE ROW, ONE PLACE: every call names a road the table has, with that
 *      road's verb, from the file its row names; every road has one caller;
 *   4. A WRONG ROAD moves nothing: each throws, the bag untouched;
 *   5. THE ROOM: a mail item credit lands through the door;
 *   6. STEP 2 (v2.3.4900): one read and one empty rule for every road, behind
 *      `bagonesum`: a whole count never below 0 for every count a bag can
 *      hold, the step-1 line exactly for every honest one, and the room's
 *      switch.  §1-5 run with the switch OFF (the step-1 sums).
 *
 * A new way to change the bag: a row in BAG_ROADS, one call that names it,
 * and its longhand line in EXPECT below.
 */
import { readFileSync } from 'node:fs';
import { SRC_DIR, srcFiles } from './src-walk.mjs';
import { BAG_ROADS, BAG_READS, BAG_EMPTY, bagAfter, bagGive, bagTake, bagSet, bagCount, bagOneSum, wholeCount, setBagOneSum, bagOneSumOn } from '../src/bag.js';
import { GameRoom } from '../src/index.js';
import { flagNameOk } from '../src/liveops.js';
setBagOneSum(false);   /* v2.3.4900: §1-5 hold the step-1 sums; §6 turns step 2 on */

let failures = 0, passes = 0;
const show = (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v === undefined ? 'undefined' : typeof v === 'function' ? '[fn]' : v);
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail, show)); }
}
const N_ROADS_4810 = 69;
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* ── 1. THE SUMS ─────────────────────────────────────────────────────────── */
/* Each road's old line, longhand, on the bag `b` under key `k`, amount `n`
   (the amount itself is still worked out at the call, as before).  Helpers
   are the old code's own: trapsIn, _invCount, gems.js num, the `has` test. */
const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const invCount = (b, k) => { if (!b || typeof k !== 'string') return 0; if (!has(b, k)) return 0; return Number(b[k]) || 0; };
const trapsIn = (b, k) => Math.max(0, has(b, k) ? Math.floor(Number(b[k]) || 0) : 0);
const num = (v) => { const x = Math.floor(Number(v)); return Number.isFinite(x) && x > 0 ? x : 0; };
const whole = (b, k) => Math.floor(Number(b[k]) || 0);
/* the shapes the old lines came in, each written as its place wrote it */
const minusEq = (b, k, n) => { b[k] -= n; if (b[k] <= 0) delete b[k]; };                 // inv[k] -= n; if (inv[k] <= 0) delete inv[k]
const orZeroAdd = (b, k, n) => { b[k] = (b[k] || 0) + n; };                             // inv[k] = (inv[k] || 0) + n
const wholeAdd = (b, k, n) => { b[k] = (Math.floor(Number(b[k]) || 0)) + n; };           // inv[k] = Math.floor(Number(inv[k]) || 0) + n
const haveLe = (have) => (b, k, n) => { b[k] = have(b, k) - n; if (b[k] <= 0) delete b[k]; };   // inv[k] = have - n; if (inv[k] <= 0) delete
const haveGt = (have) => (b, k, n) => { const h = have(b, k); if (h - n > 0) b[k] = h - n; else delete b[k]; };   // if (have - n > 0) inv[k] = have - n; else delete
const ownWhole = (b, k) => (has(b, k) ? Math.floor(Number(b[k]) || 0) : 0);
const ownWholeFloor = (b, k) => (has(b, k) ? Math.max(0, Math.floor(Number(b[k]) || 0)) : 0);

const EXPECT = {
  eat_meal:          minusEq,                                                     // cooking.js: ps.inventory[invKey] -= 1; <= 0 delete
  eat_fish:          minusEq,
  firemaking:        minusEq,
  drink:             minusEq,
  shop_item_trap:    orZeroAdd,                                                   // ps.inventory.basic_trap = (ps.inventory.basic_trap || 0) + 1
  cook_ingredient:   minusEq,                                                     // ps.inventory[k] -= take; ...; <= 0 delete
  cook_recipe:       wholeAdd,
  cook_fish_used:    minusEq,
  cook_fish_cooked:  orZeroAdd,
  cook_burnt:        orZeroAdd,
  armor_forge:       haveLe(whole),                                               // have = Math.floor(Number(..)||0); = have - r.bars; <= 0 delete
  weapon_forge:      minusEq,                                                     // ps.inventory[resourceKey] -= cost; <= 0 delete
  harden_mats:       haveLe(ownWhole),                                            // haveMats = hasOwn ? floor : 0; = haveMats - amount
  hardwood_logs:     haveLe(ownWholeFloor),                                       // held = has ? max(0, floor) : 0; = held - count*logCost
  hardwood_made:     (b, k, n) => { b[k] = (has(b, k) ? Math.floor(Number(b[k]) || 0) : 0) + n; },
  smelt_ore:         haveLe(whole),
  smelt_bar:         wholeAdd,
  salvage_bars:      (b, k, n) => { b[k] = Math.floor(Number(b[k]) || 0) + n; },
  salvage_essence:   (b, k, n) => { b[k] = Math.floor(Number(b[k]) || 0) + n; },
  essence_apply:     (b, k, n) => { b[k] = Math.floor(Number(b[k]) || 0) - n; if (b[k] <= 0) delete b[k]; },
  trap_logs:         haveLe(ownWholeFloor),
  trap_made:         (b, k, n) => { b[k] = trapsIn(b, k) + n; },                  // = trapsIn(ps) + count
  trap_sprung:       (b, k, n) => { b[k] = trapsIn(b, k) - n; if (b[k] <= 0) delete b[k]; },
  trap_legacy_in:    (b, k, n) => { b[k] = trapsIn(b, k) + n; },
  gem_take:          haveGt((b, k) => (has(b, k) ? num(b[k]) : 0)),               // gems.js: have = num(bag[k]); if (have - t > 0) .. else delete
  gem_give:          (b, k, n) => { b[k] = (has(b, k) ? num(b[k]) : 0) + n; },
  shard_crack:       haveGt(ownWholeFloor),
  rare_gem_combine:  haveGt(ownWholeFloor),
  harvest:           orZeroAdd,
  harvest_shard:     orZeroAdd,
  fish_catch_plain:  orZeroAdd,
  fish_catch:        orZeroAdd,
  farm_plant:        haveGt(whole),                                               // seeds = floor; seeds -= did.n (loop); if (seeds > 0) .. else delete
  farm_feed:         haveGt(whole),
  farm_harvest:      wholeAdd,
  farm_buy:          wholeAdd,
  farm_order:        haveGt(whole),
  shop_staple:       wholeAdd,
  shop_pile:         wholeAdd,
  chest_key:         minusEq,
  chest_prize:       wholeAdd,
  boss_chest_item:   (b, k, n) => { b[k] = Math.max(0, Math.floor(Number(has(b, k) ? b[k] : 0) || 0)) + n; },
  quest_collect:     haveGt((b, k) => b[k] || 0),                                 // have = inv[k] || 0; if (have - take > 0) .. else delete
  quest_item:        (b, k, n, cap) => { const have = b[k] || 0; b[k] = Math.min(cap, have + n); },
  cape_ticket:       orZeroAdd,
  cape_ticket_spent: minusEq,
  cape_trophy:       wholeAdd,
  loot_death_items:  orZeroAdd,
  loot_skull:        orZeroAdd,
  loot_shard:        orZeroAdd,
  loot_gem:          orZeroAdd,
  ace_items_win:     (b, k, n) => { const held = whole(b, k); b[k] = held + n; },
  ace_items_loss:    (b, k, n) => { const held = whole(b, k); const left = held - n; if (left > 0) b[k] = left; else delete b[k]; },
  gift_trade:        (b, k, n) => { b[k] = invCount(b, k) - n; if (b[k] <= 0) delete b[k]; },
  trade_window:      (b, k, n) => { b[k] = invCount(b, k) - n; if (b[k] <= 0) delete b[k]; },
  item_drop:         haveGt(ownWhole),
  bank_deposit:      haveGt(ownWhole),
  bank_withdraw:     (b, k, n) => { b[k] = ownWhole(b, k) + n; },
  ah_listing:        (b, k, n) => { b[k] = invCount(b, k) - n; if (b[k] <= 0) delete b[k]; },
  mail_item:         (b, k, n) => { b[k] = invCount(b, k) + n; },
  escrow_item:       (b, k, n) => { b[k] = invCount(b, k) - n; if (b[k] <= 0) delete b[k]; },
  escrow_item_stored: (b, k, n) => { b[k] = invCount(b, k) - n; if (b[k] <= 0) delete b[k]; },
  dev_shards:        (b, k, n) => { b[k] = Math.max(0, Math.floor(Number(b[k]) || 0)) + n; },
  fish_dev:          orZeroAdd,
  shop_sell:         haveLe(whole),                                               // v2.3.4900: was a set of `have - sold`, have read before the await; now read after
  /* the set roads: the value as the place wrote it */
  shop_tool:         (b, k, v) => { b[k] = v; },                                  // = 1
  trap_legacy_out:   (b, k) => { delete b[k]; },                                  // delete inv[LEGACY_TRAP] (the door: set 0, gtZero)
  dev_traps:         (b, k, v) => { if (v > 0) b[k] = v; else delete b[k]; },
  dev_logs:          (b, k, v) => { if (v > 0) b[k] = v; else delete b[k]; },
};

const MISSING = Symbol('missing');
const COUNTS = [MISSING, 0, -0, 1, 7, 100, 4999, 2 ** 40, 10.5, 0.25, 99.999, -5, -0.5, NaN, undefined, null, Infinity, -Infinity, '3', '2.5', 'abc', ''];
const AMOUNTS = [0, 1, 3, 50, 2500, 0.5, 7.25, -2];
const KEYS = ['wood_pine_log', 'constructor'];
const CAPS = [1, 5, 99999];
const bagWith = (k, c) => { const b = { other_thing: 4 }; if (c !== MISSING) b[k] = c; return b; };
const same = (a, b, k) => own(a, k) === own(b, k) && Object.is(a[k], b[k]) && a.other_thing === b.other_thing && Object.keys(a).length === Object.keys(b).length;

{
  const roads = Object.keys(BAG_ROADS);
  const missing = roads.filter((r) => !own(EXPECT, r));
  const stale = Object.keys(EXPECT).filter((r) => !own(BAG_ROADS, r));
  check('1. every road has its longhand line, and every line a road', missing.length === 0 && stale.length === 0, { missing, stale });
  check('1. every give and take road\'s read is one of BAG_READS',
    roads.every((r) => (BAG_ROADS[r].dir === 'set' ? BAG_ROADS[r].read === null : own(BAG_READS, BAG_ROADS[r].read))));
  check('1. every road\'s empty rule is one of BAG_EMPTY', roads.every((r) => BAG_EMPTY.includes(BAG_ROADS[r].empty)));
  check('1. every row is give, take or set', roads.every((r) => ['give', 'take', 'set'].includes(BAG_ROADS[r].dir)));
  check('1. only a give takes a cap', roads.every((r) => !BAG_ROADS[r].cap || BAG_ROADS[r].dir === 'give'));

  for (const road of roads) {
    if (!own(EXPECT, road)) continue;
    const row = BAG_ROADS[road];
    const off = [];
    const caps = row.cap ? CAPS : [undefined];
    /* a set road is handed the counts themselves as its value */
    const amounts = road === 'trap_legacy_out' ? [0]   /* its one call sets 0: the old key gone */
      : row.dir === 'set' ? COUNTS.filter((c) => c !== MISSING) : AMOUNTS;
    for (const k of KEYS) for (const c of COUNTS) for (const n of amounts) for (const cap of caps) {
      const want = bagWith(k, c);
      EXPECT[road](want, k, n, cap);
      const got = bagWith(k, c);
      const ret = row.dir === 'give' ? bagGive(got, k, n, road, cap) : row.dir === 'take' ? bagTake(got, k, n, road) : bagSet(got, k, n, road);
      if (!same(want, got, k) || !Object.is(ret, got[k])) off.push({ k, c: c === MISSING ? 'missing' : c, n, cap, want: want[k], got: got[k], wantOwn: own(want, k), gotOwn: own(got, k) });
      if (row.dir !== 'set') {
        /* the pure sum, before the empty rule */
        const pure = bagAfter(bagWith(k, c), k, n, road, cap);
        const r0 = BAG_READS[row.read](bagWith(k, c), k);
        const raw = row.dir === 'take' ? r0 - n : row.cap ? Math.min(cap, r0 + n) : r0 + n;
        if (!Object.is(pure, raw)) off.push({ pure: true, k, c, n, pureGot: pure, raw });
      }
    }
    check('1. ' + road + ' (' + row.dir + ', ' + (row.read || '-') + ', ' + row.empty + '): the door is its old line, for every count', off.length === 0, off.slice(0, 4));
  }
}

/* ── 2. ONE DOOR ─────────────────────────────────────────────────────────── */
/* Comments out, line numbers kept (gold-door.test's strip). */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
const dir = SRC_DIR;
const files = srcFiles();   /* v2.3.5060: in depth, a folder's files too (src-walk.mjs) */
const code = Object.create(null);
for (const f of files) code[f] = strip(readFileSync(new URL(f, dir), 'utf8'));
const lineOf = (s, i) => s.slice(0, i).split('\n').length;
const lineAt = (s, i) => { const a = s.lastIndexOf('\n', i) + 1; const e = s.indexOf('\n', i); return s.slice(a, e < 0 ? s.length : e); };

/* The whole-bag assigns that stay in step 1, and why.  They make the bag;
   they do not change a count in it. */
const WHOLE_BAG = [
  { file: '*', re: /\.inventory\s*=\s*(?:\{\s*\}|Object\.create\(null\))\s*;/, why: 'a new, empty bag for a player who has none (the callers\' own guard, as before)' },
  { file: 'join.js', re: /\.inventory\s*=\s*stored\.inventory\s*\|\|\s*\{\}/, why: 'the join loads the stored character\'s bag' },
  { file: 'join.js', re: /\.inventory\s*=\s*_cappedInv\b/, why: 'the join\'s first-connect bag, capped (trapping.js _trapJoinCap)' },
  { file: 'index.js', re: /ps\.inventory\s*=\s*this\._wipeInventoryOnDeath\(/, why: 'the death wipe: the bag made what the dead keep (the tools); twice, the plain death and No man\'s land' },
];
{
  /* a name that holds the bag: `const inv = ps.inventory`, `= ...inventory : null`, `= bagOf(...)` */
  const ALIAS = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]*)/g;
  const found = [];
  const seen = new Set();
  for (const f of files) {
    if (f === 'bag.js') continue;
    const s = code[f];
    const names = new Set();
    for (const m of s.matchAll(ALIAS)) if (/\.inventory\b(?!\s*\[)|\bbagOf\(/.test(m[2]) && !/Object\.(?:keys|entries|values)|JSON|[\w$]\(\s*[\w$.]*\.inventory\s*\)/.test(m[2])) names.add(m[1]);   /* not a copy made from it (index.js `keep = this._keepGatherTools(ps.inventory)`) */
    const holders = ['[\\w$.]*\\.inventory', ...[...names].map((n) => '\\b' + n.replace(/\$/g, '\\$'))];
    const H = '(?:' + holders.join('|') + ')';
    const COUNT_WRITE = new RegExp(H + '\\s*(?:\\[[^\\]\\n]*\\]|\\.[A-Za-z_$][\\w$]*)\\s*(?:[-+*/%]?=(?!=)|\\+\\+|--)|delete\\s+' + H + '\\s*[\\[.]|(?:\\+\\+|--)\\s*' + H + '\\s*[\\[.]', 'g');
    for (const m of s.matchAll(COUNT_WRITE)) found.push(f + ':' + lineOf(s, m.index) + ' ' + lineAt(s, m.index).trim().slice(0, 100));
    /* whole-bag assigns: only those listed */
    for (const m of s.matchAll(/\.inventory\s*=(?!=)/g)) {
      const line = lineAt(s, m.index);
      const ok = WHOLE_BAG.find((w) => (w.file === '*' || w.file === f) && w.re.test(line));
      if (ok) { seen.add(ok); continue; }
      found.push(f + ':' + lineOf(s, m.index) + ' (whole bag) ' + line.trim().slice(0, 100));
    }
  }
  check('2. no bag count is written in server/src but through the bag door (bag.js)', found.length === 0, found);
  check('2. every WHOLE_BAG entry still exists (a stale one is deleted)', seen.size === WHOLE_BAG.length,
    WHOLE_BAG.filter((w) => !seen.has(w)).map((w) => w.file + ' ' + w.re));
  /* the scan sees what it must: an alias write, a dot write, a delete */
  const probe = (src) => { const s = strip(src); const H = '(?:[\\w$.]*\\.inventory|\\binv)'; return new RegExp(H + '\\s*(?:\\[[^\\]\\n]*\\]|\\.[A-Za-z_$][\\w$]*)\\s*(?:[-+*/%]?=(?!=)|\\+\\+|--)|delete\\s+' + H + '\\s*[\\[.]').test(s); };
  check('2. the scan catches `inv[k] = 1`, `ps.inventory.x += 1`, `delete ps.inventory[k]`, `inv[k]--`',
    probe('inv[k] = 1') && probe('ps.inventory.x += 1') && probe('delete ps.inventory[k]') && probe('inv[k]--') && !probe('const a = inv[k] === 1') && !probe('if (ps.inventory[k] <= 0) x()'));
}

/* ── 3. ONE ROW, ONE PLACE ───────────────────────────────────────────────── */
/* Every bagGive / bagTake / bagSet call, its arguments split at the top level
   (strings skipped); the road is the 4th. */
function callsIn(s) {
  const out = [];
  for (const m of s.matchAll(/\bbag(Give|Take|Set)\(/g)) {
    if (/(?:function|\.)\s*$/.test(s.slice(Math.max(0, m.index - 10), m.index))) continue;
    let i = m.index + m[0].length, depth = 1, q = null, start = i;
    const args = [];
    for (; i < s.length && depth > 0; i++) {
      const ch = s[i];
      if (q) { if (ch === '\\') i++; else if (ch === q) q = null; continue; }
      if (ch === '\'' || ch === '"' || ch === '`') q = ch;
      else if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') { depth--; if (depth === 0) args.push(s.slice(start, i).trim()); }
      else if (ch === ',' && depth === 1) { args.push(s.slice(start, i).trim()); start = i + 1; }
    }
    const lit = /^'([A-Za-z0-9_]+)'$/.exec(args[3] || '');
    out.push({ verb: m[1].toLowerCase(), road: lit ? lit[1] : null, nargs: args.length, line: lineOf(s, m.index) });
  }
  return out;
}
{
  const byRoad = Object.create(null);
  const bad = [];
  for (const f of files) {
    if (f === 'bag.js') continue;
    for (const c of callsIn(code[f])) {
      const where = f + ':' + c.line;
      if (!c.road) { bad.push(where + ' names no road as a plain string (4th argument)'); continue; }
      if (!own(BAG_ROADS, c.road)) { bad.push(where + ' names "' + c.road + '", which BAG_ROADS has not got'); continue; }
      const row = BAG_ROADS[c.road];
      if (row.dir !== c.verb) bad.push(where + ' ' + c.road + ' is a ' + row.dir + ', called as a ' + c.verb);
      if (row.at.split(' ')[0] !== f) bad.push(where + ' ' + c.road + '\'s row says it is in ' + row.at.split(' ')[0]);
      if (row.cap !== (c.nargs === 5)) bad.push(where + ' ' + c.road + (row.cap ? ' needs its cap (5th argument)' : ' passes a cap its row has not got'));
      (byRoad[c.road] = byRoad[c.road] || []).push(where);
    }
  }
  check('3. every call names a road the table has, with its verb, from its row\'s file', bad.length === 0, bad);
  const none = Object.keys(BAG_ROADS).filter((r) => !byRoad[r]);
  const twice = Object.keys(byRoad).filter((r) => byRoad[r].length > 1).map((r) => r + ': ' + byRoad[r].join(', '));
  check('3. every road has a caller (a row nobody calls is deleted with its feature)', none.length === 0, none);
  check('3. no road has two callers (a second place is a second row)', twice.length === 0, twice);
  check('3. at v2.3.4810: one road for each of the places that wrote a bag count by hand before the door',
    Object.keys(BAG_ROADS).length >= N_ROADS_4810, Object.keys(BAG_ROADS).length);
}

/* ── 4. A WRONG ROAD MOVES NOTHING ───────────────────────────────────────── */
{
  const fns = { bagGive, bagTake, bagSet };
  const tries = [
    ['bagGive', 'no_such_road'], ['bagTake', 'no_such_road'], ['bagSet', 'no_such_road'],
    ['bagGive', 'constructor'], ['bagTake', '__proto__'], ['bagSet', 'toString'],
    ['bagGive', 'eat_meal'],       /* a take, called as a give */
    ['bagTake', 'harvest'],        /* a give, called as a take */
    ['bagSet', 'loot_gem'],        /* a give, called as a set */
    ['bagGive', 'shop_tool'],      /* a set, called as a give */
    ['bagTake', undefined], ['bagGive', null], ['bagSet', 7],
  ];
  for (const [m, road] of tries) {
    const bag = { wood_pine_log: 5 };
    let threw = false;
    try { fns[m](bag, 'wood_pine_log', 4, road); } catch (e) { threw = /bag door/.test(String(e && e.message)); }
    check('4. ' + m + '(' + String(road) + ') throws and leaves the bag as it was', threw && bag.wood_pine_log === 5 && Object.keys(bag).length === 1, { threw, bag });
  }
  let threw = false;
  try { bagAfter({}, 'k', 1, 'shop_tool'); } catch (e) { threw = true; }
  check('4. bagAfter has no answer for a set road', threw);
}

/* ── 5. THE ROOM ─────────────────────────────────────────────────────────── */
{
  const mockState = () => ({
    storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [], acceptWebSocket: () => {},
  });
  const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
  const room = new GameRoom(mockState(), mockEnv);
  const ps = { coins: 0, inventory: { wood_pine_log: 3 } };
  room._applyCreditToPs(ps, { kind: 'item', payload: { invKey: 'wood_pine_log', count: 2.7 } }, 'p1');
  check('5. a mail item credit lands through the door (floored, as before)', ps.inventory.wood_pine_log === 5, ps.inventory);
  room._applyCreditToPs(ps, { kind: 'item', payload: { invKey: 'constructor', count: 1 } }, 'p1');
  check('5. ...and never onto an Object.prototype name', !own(ps.inventory, 'constructor'), ps.inventory);
}

/* ── 6. STEP 2: ONE READ, ONE EMPTY RULE (v2.3.4900) ─────────────────────── */
setBagOneSum(true);
{
  check('6. the switch is a name the flags route stores, and on here', flagNameOk('bagonesum') && bagOneSumOn());
  const roads = Object.keys(BAG_ROADS);
  /* every road: a whole count never below 0, or no stack at all */
  for (const road of roads) {
    const row = BAG_ROADS[road];
    const caps = row.cap ? CAPS : [undefined];
    const amounts = row.dir === 'set' ? COUNTS.filter((c) => c !== MISSING) : AMOUNTS;
    const off = [];
    for (const k of KEYS) for (const c of COUNTS) for (const n of amounts) for (const cap of caps) {
      const b = bagWith(k, c);
      const ret = row.dir === 'give' ? bagGive(b, k, n, road, cap) : row.dir === 'take' ? bagTake(b, k, n, road) : bagSet(b, k, n, road);
      const want = row.dir === 'set' ? wholeCount(n) : bagOneSum(bagWith(k, c), k, n, row.dir === 'take', cap);
      const left = own(b, k) ? b[k] : 0;
      const okShape = own(b, k) ? Number.isInteger(b[k]) && b[k] > 0 : true;
      if (!okShape || left !== want || !Object.is(ret, b[k]) || b.other_thing !== 4) off.push({ k, c: c === MISSING ? 'missing' : c, n, cap, want, got: b[k] });
    }
    check('6. ' + road + ': the one read and the one empty rule, for every count', off.length === 0, off.slice(0, 4));
  }
  /* ...and for an HONEST bag and amount it is the step-1 line exactly (a 0
     stack and no stack are the same: step 2 leaves no 0 behind) */
  const HONEST_COUNTS = [MISSING, 1, 7, 100, 4999];
  const HONEST_AMOUNTS = [0, 1, 3, 50, 2500];
  const countOf = (b, k) => (own(b, k) ? b[k] : 0);
  for (const road of roads) {
    const row = BAG_ROADS[road];
    if (road === 'trap_legacy_out') continue;   /* its one call sets 0 */
    const caps = row.cap ? CAPS : [undefined];
    const amounts = row.dir === 'set' ? [0, 1, 7, 999] : HONEST_AMOUNTS;
    const off = [];
    for (const c of HONEST_COUNTS) for (const n of amounts) for (const cap of caps) {
      const have = c === MISSING ? 0 : c;
      if (row.dir === 'take' && (n > have || c === MISSING)) continue;   /* every take's caller checks the stack holds it (a take of 0 from no stack is step 1's NaN, healed) */
      if (row.cap && have > cap) continue;            /* the quest grant fills up to its cap, never past it */
      const k = 'wood_pine_log';
      setBagOneSum(false); const want = bagWith(k, c); EXPECT[road](want, k, n, cap); setBagOneSum(true);
      const got = bagWith(k, c);
      if (row.dir === 'give') bagGive(got, k, n, road, cap); else if (row.dir === 'take') bagTake(got, k, n, road); else bagSet(got, k, n, road);
      if (countOf(want, k) !== countOf(got, k) || (own(got, k) && got[k] <= 0)) off.push({ c: c === MISSING ? 'missing' : c, n, cap, want: want[k], got: got[k] });
    }
    check('6. ' + road + ': for an honest bag and amount, the same count as step 1', off.length === 0, off.slice(0, 4));
  }
  check('6. bagCount is the one read: own key, whole, never below 0', bagCount({ a: 3.9 }, 'a') === 3 && bagCount({ a: '4' }, 'a') === 4 && bagCount({ a: -2 }, 'a') === 0
    && bagCount({ a: NaN }, 'a') === 0 && bagCount({ a: Infinity }, 'a') === 0 && bagCount({}, 'constructor') === 0 && bagCount(null, 'a') === 0);
  check('6. what it heals: a string stack, a fraction, NaN, a prototype name', (() => {
    const a = { x: '3' }; bagGive(a, 'x', 2, 'harvest');                 /* step 1: '32' */
    const b = { x: 2.5 }; bagTake(b, 'x', 1, 'eat_meal');                /* step 1: 1.5 */
    const c = { x: NaN }; bagGive(c, 'x', 2, 'loot_gem');                /* step 1: 2 (orZero) -- the same */
    const d = {}; bagGive(d, 'constructor', 1, 'harvest');               /* step 1: 'function Object()...1' */
    const e = { x: 5 }; bagTake(e, 'x', 9, 'chest_key');                 /* step 1: -4, deleted; the same */
    return a.x === 5 && b.x === 1 && c.x === 2 && d.constructor === 1 && !own(e, 'x');
  })());
  /* the room hands the switch down whenever its flags load or change */
  const mockState = () => ({
    storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [], acceptWebSocket: () => {},
  });
  const room = new GameRoom(mockState(), { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } });
  room._liveFlags = { bagonesum: false }; room._syncBagCaps();
  const step1 = bagOneSumOn();
  const q = { x: 2.5 }; bagTake(q, 'x', 1, 'eat_meal');
  room._liveFlags = {}; room._syncBagCaps();
  const step2 = bagOneSumOn();
  const r = { x: 2.5 }; bagTake(r, 'x', 1, 'eat_meal');
  room._liveFlags = { bagonesum: true }; room._syncBagCaps();
  check('6. the room: `bagonesum: false` puts step 1 back, anything else is step 2', !step1 && q.x === 1.5 && step2 && r.x === 1 && bagOneSumOn(), { step1, step2, q, r });
}

/* ── 7. THE SALE READS THE BAG AFTER ITS AWAIT (v2.3.4900) ───────────────── */
{
  const src = code['shop.js'];
  const i = src.indexOf('async _shopSell(');
  const body = src.slice(i, src.indexOf('async _shopBuy(', i));
  const aw = body.indexOf('await this._shopStock()');
  const chk = body.indexOf('bagCount(ps.inventory, key) < sold');
  const take = body.indexOf("bagTake(ps.inventory, key, sold, 'shop_sell')");
  const pay = body.indexOf("_goldGive(ps, paid, 'shop_sell')");
  check('7. _shopSell asks the bag again after the stock\'s await, then takes, then pays', aw > 0 && chk > aw && take > chk && pay > take, { aw, chk, take, pay });
  const room = new GameRoom({
    storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [], acceptWebSocket: () => {},
  }, { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } });
  /* drive it: a stack that shrinks during the await is refused, no coin moves */
  room._shopBaseValue = () => 10; room._shopBuyRaw = () => 5; room._saveRpg = () => {}; room._shopSaveStock = async () => {};
  const ps = { coins: 0, inventory: { wood_pine_log: 4 } };
  room._shopStock = async () => { ps.inventory.wood_pine_log = 1; return Object.create(null); };
  const res = await room._shopSell(ps, 'wood_pine_log', 4, null);
  check('7. a stack that shrank across the await: refused, nothing paid', res && res.ok === false && ps.coins === 0 && ps.inventory.wood_pine_log === 1, { res, ps });
  room._shopStock = async () => Object.create(null);
  const ps2 = { coins: 0, inventory: { wood_pine_log: 4 } };
  const res2 = await room._shopSell(ps2, 'wood_pine_log', 3, null);
  check('7. an honest sale: sold, paid, the rest left', res2 && res2.ok && ps2.inventory.wood_pine_log === 1 && ps2.coins > 0, { res2, ps2 });
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
