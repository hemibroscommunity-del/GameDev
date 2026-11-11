/* The gold door -- v2.3.4652 (spec docs/specs/gold-door.md; src/gold.js).
 *
 * A player's gold was changed by hand in 41 places across 27 files, each with
 * its own sum: six different ways of reading the purse.  The door puts every
 * change through three methods (_goldGive, _goldTake, _goldSet), each call
 * naming its ROAD, its row in GOLD_ROADS.  This suite holds it:
 *
 *   1. THE SUMS: every give and take road, replayed against its own longhand
 *      line (at v2.3.4652, the exact line its place had before the door) for
 *      every purse it can hold -- whole, fractional, below 0, missing, null,
 *      NaN, huge -- and many amounts: the same number, to the bit.  Step 1
 *      changes nothing a player can see, and this is the proof;
 *   2. ONE DOOR: no `.coins` is written anywhere in server/src but gold.js
 *      (the one note that is not a purse is listed below, with why);
 *   3. ONE ROW, ONE PLACE: every call names a road the table has, with that
 *      road's verb, from the file its row names; every road has exactly one
 *      caller (so deleting a feature deletes its row);
 *   4. A WRONG ROAD moves nothing: an unknown road, a wrong verb, an
 *      Object.prototype name -- each throws, the purse untouched;
 *   5. THE ROOM: the door is on the GameRoom, and a settlement's gold (the
 *      `_creditPlayer` landing, inbox.js) arrives through it.
 *
 * A new way to change gold: a row in GOLD_ROADS, one call that names it, and
 * its longhand line in EXPECT below.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { GOLD_ROADS, GOLD_SUMS, goldAfter, goldMethods } from '../src/gold.js';
import { GameRoom } from '../src/index.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v))); }
}
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* ── 1. THE SUMS ─────────────────────────────────────────────────────────── */
/* Each road's sum, written out longhand.  At v2.3.4652 each is its place's own
   line from before the door, `ps.coins` read as `c` and the amount as `n` (the
   amount itself is still worked out at the call, exactly as before: the
   mail's `Math.max(0, Math.floor(p.amount || 0))`, the quest's
   `reward.gold || 0`, the group debit's `Math.floor(Number(d.amount))`). */
const EXPECT = {
  amulet_craft:        (c, n) => c - n,                                   // ps.coins -= tier.goldCost
  gem_extract:         (c, n) => c - n,                                   // ps.coins -= cost
  weapon_forge:        (c, n) => c - n,                                   // ps.coins -= tier.goldCost
  harden:              (c, n) => c - n,                                   // ps.coins -= cost
  tonic_buy:           (c, n) => c - n,                                   // ps.coins -= finalCost
  tonic_refund:        (c, n) => c + n,                                   // ps.coins += finalCost
  farm_buy:            (c, n) => c - n,                                   // ps.coins -= cost
  pet_house:           (c, n) => Math.floor(Number(c) || 0) - n,          // ps.coins = Math.floor(Number(ps.coins) || 0) - price
  clan_create:         (c, n) => c - n,                                   // ps.coins -= CLANS.CREATE_COST
  arena_entry:         (c, n) => c - n,                                   // ps.coins -= ARENA.ENTRY_FEE
  shop_tool:           (c, n) => Math.floor(Number(c) || 0) - n,          // purse = Math.floor(Number(ps.coins) || 0); ps.coins = purse - cost
  shop_staple:         (c, n) => Math.floor(Number(c) || 0) - n,          // (the same)
  shop_pile:           (c, n) => Math.floor(Number(c) || 0) - n,          // (the same)
  shop_sell:           (c, n) => Math.max(0, Math.floor(Number(c) || 0) + n),   // ps.coins = Math.max(0, Math.floor(Number(ps.coins) || 0) + paid)
  weapon_sell:         (c, n) => (c || 0) + n,                            // ps.coins = (ps.coins || 0) + sellVal
  quest_reward:        (c, n) => (c || 0) + n,                            // ps.coins = (ps.coins || 0) + (reward.gold || 0)
  guild_rung:          (c, n) => (c || 0) + n,                            // ps.coins = (ps.coins || 0) + quest.gold
  farm_order:          (c, n) => Math.max(0, Math.floor(Number(c) || 0)) + n,   // ps.coins = Math.max(0, Math.floor(Number(ps.coins) || 0)) + o.gold
  daily_chest:         (c, n) => (c || 0) + n,                            // ps.coins = (ps.coins || 0) + prize.coins
  dungeon_clear:       (c, n) => (c || 0) + n,                            // ps.coins = (ps.coins || 0) + gold
  boss_chest:          (c, n) => (c || 0) + n,                            // ps.coins = (ps.coins || 0) + gold
  loot_gold:           (c, n) => (c || 0) + n,                            // ps.coins = (ps.coins || 0) + coinsForMe
  loot_weapon_sold:    (c, n) => (c || 0) + n,                            // ps.coins = (ps.coins || 0) + weaponSoldFor
  mail_gold:           (c, n) => Math.max(0, (c || 0) + n),               // ps.coins = Math.max(0, (ps.coins || 0) + Math.max(0, Math.floor(p.amount || 0)))
  ace_flip_win:        (c, n) => (c || 0) + n,                            // coins = ps.coins || 0; ps.coins = coins + risk
  ace_flip_loss:       (c, n) => (c || 0) + -n,                           // ...; ps.coins = coins + -risk
  gamble_win:          (c, n) => c + n,                                   // ps.coins += wager
  gamble_loss:         (c, n) => c + -n,                                  // ps.coins += -wager
  jackpot_ticket:      (c, n) => c - n,                                   // ps.coins -= amount
  gift_trade:          (c, n) => c - n,                                   // senderPs.coins -= offer._gold
  trade_window:        (c, n) => c - n,                                   // side.ps.coins -= side.gives._gold
  threat_levy:         (c, n) => c - n,                                   // aPs.coins -= levy
  bank_deposit:        (c, n) => Math.floor(Number(c) || 0) - n,          // purse = Math.floor(Number(ps.coins) || 0); ps.coins = purse - n
  bank_withdraw:       (c, n) => Math.floor(Number(c) || 0) + n,          // ...; ps.coins = purse + n
  market_order:        (c, n) => c - n,                                   // ps.coins -= p
  market_unwind:       (c, n) => (c || 0) + n,                            // back.coins = (back.coins || 0) + p
  ah_offer_back:       (c, n) => (c || 0) + n,                            // (half of the next line: see the pair below)
  ah_offer:            (c, n) => c - n,                                   // (the other half)
  escrow_debit:        (c, n) => c - n,                                   // ps.coins -= amt
  escrow_debit_stored: (c, n) => c - n,                                   // stored.coins -= amt
  escrow_debit_group:  (c, n) => c - n,                                   // ps.coins -= Math.floor(Number(d.amount))
};

/* every purse a record could hold, honest or not, and amounts likewise */
const PURSES = [0, -0, 1, 7, 100, 4999, 1234567, 2 ** 40, 10.5, 0.25, 99.999, -5, -0.5, NaN, undefined, null, Infinity];
const AMOUNTS = [0, 1, 3, 50, 2500, 0.5, 7.25];

{
  const giveTake = Object.keys(GOLD_ROADS).filter((r) => GOLD_ROADS[r].dir !== 'set');
  const missing = giveTake.filter((r) => !own(EXPECT, r));
  const stale = Object.keys(EXPECT).filter((r) => !own(GOLD_ROADS, r) || GOLD_ROADS[r].dir === 'set');
  check('1. every give and take road has its longhand line, and every line a road', missing.length === 0 && stale.length === 0, { missing, stale });
  check('1. every road\'s sum is one of GOLD_SUMS', giveTake.every((r) => own(GOLD_SUMS, GOLD_ROADS[r].sum)),
    giveTake.filter((r) => !own(GOLD_SUMS, GOLD_ROADS[r].sum)));
  check('1. a set road has no sum', Object.keys(GOLD_ROADS).filter((r) => GOLD_ROADS[r].dir === 'set').every((r) => GOLD_ROADS[r].sum === null));
  check('1. every row is give, take or set', Object.values(GOLD_ROADS).every((row) => ['give', 'take', 'set'].includes(row.dir)));

  for (const road of giveTake) {
    if (!own(EXPECT, road)) continue;
    const off = [];
    for (const c of PURSES) {
      for (const n of AMOUNTS) {
        const want = EXPECT[road](c, n);
        const pure = goldAfter(c, n, road);
        const rec = { coins: c };
        const ret = GOLD_ROADS[road].dir === 'give' ? goldMethods._goldGive(rec, n, road) : goldMethods._goldTake(rec, n, road);
        if (!Object.is(pure, want) || !Object.is(rec.coins, want) || !Object.is(ret, want)) off.push({ c, n, want, pure, got: rec.coins });
      }
    }
    check('1. ' + road + ' (' + GOLD_ROADS[road].dir + ', ' + GOLD_ROADS[road].sum + '): the door\'s sum is its line, for every purse', off.length === 0, off.slice(0, 4));
  }

  /* the Auction House's offer was one line, `ps.coins = (ps.coins || 0) + back - gold`;
     the door makes it two roads, in the order the line added them */
  const off = [];
  for (const c of PURSES) for (const back of AMOUNTS) for (const gold of AMOUNTS) {
    const want = (c || 0) + back - gold;
    const rec = { coins: c };
    goldMethods._goldGive(rec, back, 'ah_offer_back');
    goldMethods._goldTake(rec, gold, 'ah_offer');
    if (!Object.is(rec.coins, want)) off.push({ c, back, gold, want, got: rec.coins });
  }
  check('1. ah_offer_back then ah_offer is the offer\'s old line, for every purse', off.length === 0, off.slice(0, 4));

  /* a set road makes the purse exactly what it is given */
  for (const road of Object.keys(GOLD_ROADS).filter((r) => GOLD_ROADS[r].dir === 'set')) {
    const off2 = [];
    for (const v of PURSES) {
      const rec = { coins: 123 };
      const ret = goldMethods._goldSet(rec, v, road);
      if (!Object.is(rec.coins, v) || !Object.is(ret, v)) off2.push({ v, got: rec.coins });
    }
    check('1. ' + road + ' (set): the purse is what it is given', off2.length === 0, off2);
  }
}

/* ── 2. ONE DOOR ─────────────────────────────────────────────────────────── */
/* Comments out, line numbers kept (quiet-phone.test's strip). */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
const dir = new URL('../src/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
const code = Object.create(null);
for (const f of files) code[f] = strip(readFileSync(new URL(f, dir), 'utf8'));
const lineOf = (s, i) => s.slice(0, i).split('\n').length;

/* What writes a `.coins` that is NOT a purse, and why.  Each is matched by
   its file and the text of its write; anything else is a second door. */
const NOT_A_PURSE = [
  { file: 'nomansland.js', text: 'lost.coins =', why: 'the loss\'s own note of what the purse held, for the killer\'s mail; the purse itself goes by nml_loss' },
];
{
  const WRITE = /(?:\.coins|\[\s*['"]coins['"]\s*\])\s*(?:[-+*/%]?=(?!=)|\+\+|--)|(?:\+\+|--)\s*[\w$.]*\.coins\b/g;
  const found = [];
  const allowedSeen = new Set();
  for (const f of files) {
    if (f === 'gold.js') continue;
    const s = code[f];
    for (const m of s.matchAll(WRITE)) {
      const lineStart = s.lastIndexOf('\n', m.index) + 1;
      const lineEnd = s.indexOf('\n', m.index);
      const line = s.slice(lineStart, lineEnd < 0 ? s.length : lineEnd);
      const ok = NOT_A_PURSE.find((a) => a.file === f && line.includes(a.text));
      if (ok) { allowedSeen.add(ok); continue; }
      found.push(f + ':' + lineOf(s, m.index) + ' ' + line.trim().slice(0, 100));
    }
  }
  check('2. no `.coins` is written in server/src but through the gold door (gold.js)', found.length === 0, found);
  check('2. every NOT_A_PURSE entry still exists (a stale one is deleted)', allowedSeen.size === NOT_A_PURSE.length,
    NOT_A_PURSE.filter((a) => !allowedSeen.has(a)).map((a) => a.file + ' ' + a.text));
}

/* ── 3. ONE ROW, ONE PLACE ───────────────────────────────────────────────── */
/* Every this._goldGive / _goldTake / _goldSet call, its last argument read to
   the call's own closing bracket (strings skipped). */
function callsIn(s) {
  const out = [];
  const re = /this\._gold(Give|Take|Set)\(/g;
  for (const m of s.matchAll(re)) {
    let i = m.index + m[0].length, depth = 1, q = null;
    for (; i < s.length && depth > 0; i++) {
      const ch = s[i];
      if (q) { if (ch === '\\') i++; else if (ch === q) q = null; continue; }
      if (ch === '\'' || ch === '"' || ch === '`') q = ch;
      else if (ch === '(') depth++;
      else if (ch === ')') depth--;
    }
    const args = s.slice(m.index + m[0].length, i - 1);
    const lit = /,\s*'([A-Za-z0-9_]+)'\s*$/.exec(args);
    out.push({ verb: m[1].toLowerCase(), road: lit ? lit[1] : null, line: lineOf(s, m.index) });
  }
  return out;
}
{
  const byRoad = Object.create(null);
  const bad = [];
  for (const f of files) {
    if (f === 'gold.js') continue;
    for (const c of callsIn(code[f])) {
      const where = f + ':' + c.line;
      if (!c.road) { bad.push(where + ' names no road as a plain string'); continue; }
      if (!own(GOLD_ROADS, c.road)) { bad.push(where + ' names "' + c.road + '", which GOLD_ROADS has not got'); continue; }
      const row = GOLD_ROADS[c.road];
      if (row.dir !== c.verb) bad.push(where + ' ' + c.road + ' is a ' + row.dir + ', called as a ' + c.verb);
      if (row.at.split(' ')[0] !== f) bad.push(where + ' ' + c.road + '\'s row says it is in ' + row.at.split(' ')[0]);
      (byRoad[c.road] = byRoad[c.road] || []).push(where);
    }
  }
  check('3. every call names a road the table has, with its verb, from its row\'s file', bad.length === 0, bad);
  const none = Object.keys(GOLD_ROADS).filter((r) => !byRoad[r]);
  const twice = Object.keys(byRoad).filter((r) => byRoad[r].length > 1).map((r) => r + ': ' + byRoad[r].join(', '));
  check('3. every road has a caller (a row nobody calls is deleted with its feature)', none.length === 0, none);
  check('3. no road has two callers (a second place is a second row)', twice.length === 0, twice);
  check('3. at v2.3.4652: 44 roads, 41 places that wrote gold by hand before the door',
    Object.keys(GOLD_ROADS).length >= 44, Object.keys(GOLD_ROADS).length);
}

/* ── 4. A WRONG ROAD MOVES NOTHING ───────────────────────────────────────── */
{
  const tries = [
    ['_goldGive', 'no_such_road'], ['_goldTake', 'no_such_road'], ['_goldSet', 'no_such_road'],
    ['_goldGive', 'constructor'], ['_goldTake', '__proto__'], ['_goldSet', 'toString'],
    ['_goldGive', 'harden'],          /* a take, called as a give */
    ['_goldTake', 'quest_reward'],    /* a give, called as a take */
    ['_goldSet', 'shop_sell'],        /* a give, called as a set */
    ['_goldGive', 'join_stored'],     /* a set, called as a give */
    ['_goldTake', undefined], ['_goldGive', null],
  ];
  for (const [m, road] of tries) {
    const rec = { coins: 500 };
    let threw = false;
    try { goldMethods[m](rec, 40, road); } catch (e) { threw = /gold door/.test(String(e && e.message)); }
    check('4. ' + m + '(' + String(road) + ') throws and leaves the purse at 500', threw && rec.coins === 500, { threw, coins: rec.coins });
  }
  let threw = false;
  try { goldAfter(10, 1, 'join_new'); } catch (e) { threw = true; }
  check('4. goldAfter has no answer for a set road', threw);
}

/* ── 5. THE ROOM ─────────────────────────────────────────────────────────── */
{
  const mockState = () => ({
    storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [], acceptWebSocket: () => {},
  });
  const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
  const room = new GameRoom(mockState(), mockEnv);
  check('5. the door is on the GameRoom', typeof room._goldGive === 'function' && typeof room._goldTake === 'function' && typeof room._goldSet === 'function');
  const ps = { coins: 120, inventory: {} };
  room._goldTake(ps, 20, 'harden');
  room._goldGive(ps, 5, 'quest_reward');
  check('5. a take and a give on a live purse', ps.coins === 105, ps);
  /* a settlement's gold (every _creditPlayer credit) lands through mail_gold */
  room._applyCreditToPs(ps, { kind: 'gold', payload: { amount: 37.9 } }, 'p1');
  check('5. _creditPlayer\'s gold lands through the door (floored, as before)', ps.coins === 142, ps);
  room._applyCreditToPs(ps, { kind: 'gold', payload: { amount: -50 } }, 'p1');
  check('5. ...and a negative credit still pays nothing', ps.coins === 142, ps);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
