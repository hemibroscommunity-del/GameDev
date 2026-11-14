/* The gold door -- v2.3.4670 (spec docs/specs/gold-door.md; src/gold.js).
 *
 * A player's gold was changed by hand in 41 places across 27 files, each with
 * its own sum: six different ways of reading the purse.  The door puts every
 * change through three methods (_goldGive, _goldTake, _goldSet), each call
 * naming its ROAD, its row in GOLD_ROADS.  This suite holds it:
 *
 *   1. THE SUMS: every give and take road, replayed against its own longhand
 *      line (at v2.3.4670, the exact line its place had before the door) for
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
 *      `_creditPlayer` landing, inbox.js) arrives through it;
 *   (6. step 2, v2.3.4803: one sum;)
 *   7. STEP 3's LOG (v2.3.4903): every move noted per purse, memory only --
 *      no storage write, never a field on the purse, capped -- and the
 *      owner's /dev/goldlog reads it; `goldlog: false` notes nothing.
 *   8. THE CLASSES (v2.3.5081, grand plan step 4.4, card E PR 2): every road
 *      is a mint, a burn, a move or an escrow; a move names the road its
 *      other side lands by, an escrow the record it is held in; and every
 *      credit in server/src is classed by its opId's first word
 *      (MAIL_CLASSES), so a new credit with no class fails here.
 *   9. THE COUNT (v2.3.5084, card E PR 5): the door books what it mints
 *      and burns into the record's own `_econ`, by the road's class; a move
 *      or an escrow books nothing; a payout by the mail books its own class.
 *      BREAK PROOF: `econGold(rec, row.class, d)` removed from _goldGive ->
 *      FAIL 9 (a reward books nothing).
 *
 * A new way to change gold: a row in GOLD_ROADS, one call that names it, and
 * its longhand line in EXPECT below.
 */
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SRC_DIR, srcFiles, LEFT_OUT, LEFT_OUT_HOLDS } from './src-walk.mjs';
import { GOLD_ROADS, GOLD_SUMS, goldAfter, goldMethods, goldOneSum, wholeGold, GOLD_LOG, goldLogOf, CLASSES, ESCROW_PLACES, MAIL_CLASSES, mailClassOf, classFaults, GOLD_LOADS, mailMinted } from '../src/gold.js';
import { BAG_ROADS } from '../src/bag.js';
import { flagNameOk } from '../src/liveops.js';
import { GameRoom } from '../src/index.js';
const NOW_SET = (t) => { Date.now = () => t; };

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v))); }
}
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* ── 1. THE SUMS ─────────────────────────────────────────────────────────── */
/* Each road's sum, written out longhand.  At v2.3.4670 each is its place's own
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

/* v2.3.4803: step 1's proof is of the step-1 sums, so it runs on a door with
   step 2's switch off (`goldonesum: false`); §6 proves step 2 */
const STEP1 = Object.assign(Object.create(goldMethods), { _liveFlags: { goldonesum: false } });
const STEP2 = Object.assign(Object.create(goldMethods), { _liveFlags: {} });

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
        const ret = GOLD_ROADS[road].dir === 'give' ? STEP1._goldGive(rec, n, road) : STEP1._goldTake(rec, n, road);
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
    STEP1._goldGive(rec, back, 'ah_offer_back');
    STEP1._goldTake(rec, gold, 'ah_offer');
    if (!Object.is(rec.coins, want)) off.push({ c, back, gold, want, got: rec.coins });
  }
  check('1. ah_offer_back then ah_offer is the offer\'s old line, for every purse', off.length === 0, off.slice(0, 4));

  /* a set road makes the purse exactly what it is given */
  for (const road of Object.keys(GOLD_ROADS).filter((r) => GOLD_ROADS[r].dir === 'set')) {
    const off2 = [];
    for (const v of PURSES) {
      const rec = { coins: 123 };
      const ret = STEP1._goldSet(rec, v, road);
      if (!Object.is(rec.coins, v) || !Object.is(ret, v)) off2.push({ v, got: rec.coins });
    }
    check('1. ' + road + ' (set): the purse is what it is given', off2.length === 0, off2);
  }
}

/* ── 2. ONE DOOR ─────────────────────────────────────────────────────────── */
/* Comments out, line numbers kept (quiet-phone.test's strip). */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
const dir = SRC_DIR;
const files = srcFiles();   /* v2.3.5060: in depth, a folder's files too (src-walk.mjs) */
const code = Object.create(null);
for (const f of files) code[f] = strip(readFileSync(new URL(f, dir), 'utf8'));
const lineOf = (s, i) => s.slice(0, i).split('\n').length;

/* v2.3.5060 (grand plan 4.1, card N): the walker every door reads the worker
   with.  A file in a folder is read like one at the top (a scratch
   server/src/zz/x.js that writes `.coins` fails §2 below), and only the top's
   vendor/ is left out.  Tried on a folder of its own, so it holds whatever
   server/src holds today. */
{
  const tmp = mkdtempSync(join(tmpdir(), 'srcwalk-'));
  try {
    for (const d of ['zz', 'zz/deep', 'vendor', 'zz/vendor']) mkdirSync(join(tmp, d));
    for (const f of ['a.js', 'zz/x.js', 'zz/m.mjs', 'zz/deep/y.js', 'vendor/v.js', 'zz/vendor/w.js', 'zz/notes.md']) writeFileSync(join(tmp, f), '');
    const got = srcFiles(tmp);
    check('2. the walker reads a folder in depth (.js and .mjs), and leaves out the top\'s vendor/ only (src-walk.mjs)',
      JSON.stringify(got) === JSON.stringify(['a.js', 'zz/deep/y.js', 'zz/m.mjs', 'zz/vendor/w.js', 'zz/x.js']), got);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  const held = Object.keys(LEFT_OUT).map((d) => [d, readdirSync(new URL(d + '/', SRC_DIR)).sort()]);
  check('2. ...a folder left out holds what LEFT_OUT_HOLDS names, and nothing of ours (src-walk.mjs)',
    held.every(([d, fs]) => JSON.stringify(fs) === JSON.stringify([...(LEFT_OUT_HOLDS[d] || [])].sort())), held);
  check('2. ...and server/src: every top file, nothing under a folder LEFT_OUT names',
    files.includes('gold.js') && files.includes('index.js') && !files.some((f) => Object.keys(LEFT_OUT).some((d) => f.startsWith(d + '/'))), files.filter((f) => f.includes('/')));
}

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
    /* v2.3.5084: a give may hand the door its payout after the road (inbox.js,
       the mail): `..., 'mail_gold', entry)` -- the road is then the one before */
    const lit = /,\s*'([A-Za-z0-9_]+)'\s*(,\s*[A-Za-z_$][\w$.]*\s*)?$/.exec(args);
    out.push({ verb: m[1].toLowerCase(), road: lit ? lit[1] : null, credit: !!(lit && lit[2]), line: lineOf(s, m.index) });
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
      if (c.credit && row.other !== 'inbox:') bad.push(where + ' ' + c.road + ' hands the door a payout, and only the mail\'s road may (v2.3.5084)');
      (byRoad[c.road] = byRoad[c.road] || []).push(where);
    }
  }
  check('3. every call names a road the table has, with its verb, from its row\'s file', bad.length === 0, bad);
  const none = Object.keys(GOLD_ROADS).filter((r) => !byRoad[r]);
  const twice = Object.keys(byRoad).filter((r) => byRoad[r].length > 1).map((r) => r + ': ' + byRoad[r].join(', '));
  check('3. every road has a caller (a row nobody calls is deleted with its feature)', none.length === 0, none);
  check('3. no road has two callers (a second place is a second row)', twice.length === 0, twice);
  check('3. at v2.3.4670: 44 roads, 41 places that wrote gold by hand before the door',
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

/* ── 6. STEP 2: ONE SUM (v2.3.4803) ────────────────────────────────────── */
{
  check('6. the switch is on unless `goldonesum: false`, a name the flags route stores', STEP2._goldOneSumOn() && !STEP1._goldOneSumOn() && flagNameOk('goldonesum'));
  /* the one sum, every road: whole, never below 0, the amount likewise */
  const giveTake = Object.keys(GOLD_ROADS).filter((r) => GOLD_ROADS[r].dir !== 'set');
  for (const road of giveTake) {
    const take = GOLD_ROADS[road].dir === 'take';
    const off = [];
    for (const c of PURSES) for (const n of AMOUNTS) {
      const rec = { coins: c };
      const ret = take ? STEP2._goldTake(rec, n, road) : STEP2._goldGive(rec, n, road);
      const want = goldOneSum(c, n, take);
      if (!Object.is(rec.coins, want) || !Object.is(ret, want) || !Number.isInteger(rec.coins) || rec.coins < 0) off.push({ c, n, want, got: rec.coins });
    }
    check('6. ' + road + ': the one sum, a whole number never below 0, for every purse', off.length === 0, off.slice(0, 4));
  }
  /* ...and for an HONEST purse and amount it is the step-1 line exactly: no
     honest player sees a coin of difference */
  const HONEST_PURSES = [0, 1, 7, 100, 4999, 1234567];
  const HONEST_AMOUNTS = [0, 1, 3, 50, 2500];
  for (const road of giveTake) {
    if (!own(EXPECT, road)) continue;
    const take = GOLD_ROADS[road].dir === 'take';
    const off = [];
    for (const c of HONEST_PURSES) for (const n of HONEST_AMOUNTS) {
      if (take && n > c) continue;   /* every take's caller checks the purse holds it */
      const rec = { coins: c };
      if (take) STEP2._goldTake(rec, n, road); else STEP2._goldGive(rec, n, road);
      if (!Object.is(rec.coins, EXPECT[road](c, n))) off.push({ c, n, want: EXPECT[road](c, n), got: rec.coins });
    }
    check('6. ' + road + ': for an honest purse and amount, the same as step 1', off.length === 0, off.slice(0, 4));
  }
  /* a set heals the purse it makes */
  for (const road of Object.keys(GOLD_ROADS).filter((r) => GOLD_ROADS[r].dir === 'set')) {
    const off = [];
    for (const v of PURSES) {
      const rec = { coins: 5 };
      STEP2._goldSet(rec, v, road);
      if (!Object.is(rec.coins, wholeGold(v)) || !Number.isInteger(rec.coins) || rec.coins < 0) off.push({ v, got: rec.coins });
    }
    check('6. ' + road + ' (set): the purse made a whole number never below 0', off.length === 0, off);
  }
  check('6. the stakes that let a fraction in: a 10.5 coin flip wins 10, loses 10', (() => {
    const a = { coins: 100 }, b = { coins: 100 };
    STEP2._goldGive(a, 10.5, 'gamble_win'); STEP2._goldTake(b, 10.5, 'gamble_loss');
    return a.coins === 110 && b.coins === 90;
  })());
  check('6. a broken purse heals on its next move: 10.5 - 3 = 7, -5 + 4 = 4, NaN + 2 = 2', (() => {
    const a = { coins: 10.5 }, b = { coins: -5 }, c = { coins: NaN };
    STEP2._goldTake(a, 3, 'harden'); STEP2._goldGive(b, 4, 'quest_reward'); STEP2._goldGive(c, 2, 'loot_gold');
    return a.coins === 7 && b.coins === 4 && c.coins === 2;
  })());
  /* the room, with and without the switch */
  const mockState = () => ({
    storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [], acceptWebSocket: () => {},
  });
  const room = new GameRoom(mockState(), { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } });
  room._liveFlags = {};
  const ps = { coins: 10.5 };
  room._goldGive(ps, 1, 'quest_reward');
  check('6. the room does the one sum by default', ps.coins === 11, ps);
  room._liveFlags = { goldonesum: false };
  const q = { coins: 10.5 };
  room._goldGive(q, 1, 'quest_reward');
  check('6. ...and `goldonesum: false` puts the step-1 sum back at once', q.coins === 11.5, q);
}

/* ── 7. STEP 3: THE GOLD LOG (v2.3.4903) ────────────────────────────────── */
{
  const writes = [];
  const state = {
    storage: { get: async () => undefined, put: async (k) => { writes.push(k); }, list: async () => new Map(), delete: async (k) => { writes.push(k); } },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
  const room = new GameRoom(state, { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } });
  room._liveFlags = {};
  check('7. the log switch is on by default, a name the flags route stores', room._goldLogOn() && flagNameOk('goldlog'));
  const ps = { coins: 100 };
  NOW_SET(5000);
  room._goldGive(ps, 25, 'quest_reward');
  room._goldTake(ps, 40, 'harden');
  room._goldSet(ps, 7, 'nml_loss');
  const log = goldLogOf(ps);
  check('7. every move is noted: when, the road, how much, the purse after', log.length === 3
    && log[0].road === 'quest_reward' && log[0].d === 25 && log[0].c === 125 && log[0].at === 5000
    && log[1].road === 'harden' && log[1].d === -40 && log[1].c === 85
    && log[2].road === 'nml_loss' && log[2].d === -78 && log[2].c === 7, log);
  /* v2.3.5084: `_econ` is on the purse now on purpose -- the running minted
     and burned, which DOES ride the save (rule 1's second exception, card E);
     the log is still never a field */
  check('7. memory only: no storage write, and nothing of the log on the purse a save could carry', writes.length === 0 && JSON.stringify(Object.keys(ps).filter((k) => k !== '_econ')) === '["coins"]', { writes, keys: Object.keys(ps) });
  for (let i = 0; i < GOLD_LOG.KEEP + 10; i++) room._goldGive(ps, 1, 'loot_gold');
  const l2 = goldLogOf(ps);
  check('7. capped at GOLD_LOG.KEEP, the oldest dropped', l2.length === GOLD_LOG.KEEP && l2[l2.length - 1].c === 7 + GOLD_LOG.KEEP + 10 && l2.every((e) => e.road === 'loot_gold'), l2.length);
  l2[0].road = 'tampered';
  check('7. a read is a copy', goldLogOf(ps)[0].road === 'loot_gold');
  check('7. a purse never moved has an empty log; junk too', goldLogOf({ coins: 3 }).length === 0 && goldLogOf(null).length === 0 && goldLogOf(5).length === 0);
  room._liveFlags = { goldlog: false };
  const q = { coins: 10 };
  room._goldGive(q, 5, 'quest_reward');
  check('7. goldlog: false notes nothing (the gold still moves)', q.coins === 15 && goldLogOf(q).length === 0);
  /* the owner's read */
  room._liveFlags = {};
  room.playerState.p_gl = { coins: 50 };
  room._goldGive(room.playerState.p_gl, 5, 'daily_chest');
  const json = (o, st) => ({ o, st: st || 200 });
  const r = await room._devFetch({ method: 'GET', url: 'https://x/dev/goldlog?id=p_gl' }, '/dev/goldlog', json);
  check('7. GET /dev/goldlog?id= returns the live player\'s log', r && r.st === 200 && r.o.ok && r.o.coins === 55 && r.o.log.length === 1 && r.o.log[0].road === 'daily_chest', r && r.o);
  const r404 = await room._devFetch({ method: 'GET', url: 'https://x/dev/goldlog?id=__proto__' }, '/dev/goldlog', json);
  check('7. ...and 404 for nobody here (an Object.prototype name included)', r404 && r404.st === 404);
}

/* ── 8. THE CLASSES (v2.3.5081) ────────────────────────────────────────── */
/* What a road row must say to be counted by the world's sum (SHAPES part 3):
   gold.js classFaults, one checker for both tables (bag-door.test §8 runs it
   on BAG_ROADS).  It is run on a planted table first, so a checker that
   passes everything fails. */
{
  /* the checker itself: a planted row with no class, a move or an escrow with
     none, a mint that names one, a move to nowhere, an escrow into nowhere */
  const planted = {
    a: { class: undefined }, b: { class: 'move', other: null }, c: { class: 'escrow', other: [] },
    d: { class: 'mint', other: 'bank:' }, e: { class: 'move', other: 'no_road' }, f: { class: 'escrow', other: 'nowhere:' },
    g: { class: 'gift', other: null }, ok: { class: 'escrow', other: 'bank:' },
  };
  const pf = classFaults(planted, GOLD_ROADS);
  check('8. the checker fails each planted fault and passes the good row', pf.length === 7 && !pf.some((x) => x.startsWith('ok:')), pf);
  check('8. CLASSES are the four, frozen', JSON.stringify(CLASSES) === '["mint","burn","move","escrow"]' && Object.isFrozen(CLASSES) && Object.isFrozen(ESCROW_PLACES));
  const gf = classFaults(GOLD_ROADS, GOLD_ROADS);
  check('8. every GOLD_ROADS row has a class, a move or an escrow its other side', gf.length === 0, gf);
  const counts = {};
  for (const r of Object.values(GOLD_ROADS)) counts[r.class] = (counts[r.class] || 0) + 1;
  check('8. at v2.3.5084: 14 mints, 15 burns (+ nml_lost), 13 escrows, 3 moves (a change of class is a change here)', counts.mint === 14 && counts.burn === 15 && counts.escrow === 13 && counts.move === 3, counts);
  /* a move lands on the other player by the mail; the mail is the escrow
     every credit passes */
  const moves = Object.entries(GOLD_ROADS).filter(([, r]) => r.class === 'move');
  check('8. every gold move lands by mail_gold, the mail paid on (an escrow of inbox:)',
    moves.every(([, r]) => r.other === 'mail_gold') && GOLD_ROADS.mail_gold.class === 'escrow' && GOLD_ROADS.mail_gold.other === 'inbox:', moves.map(([n, r]) => n + '>' + r.other));
  /* the mail's table: every row a class, every move naming the road its
     sender's side ran by (gold's, or the bag's of the same name) */
  const both = Object.assign(Object.create(null), GOLD_ROADS, BAG_ROADS);
  const mf = classFaults(MAIL_CLASSES, both);
  check('8. every MAIL_CLASSES row has a class, and a move the road its other side ran by', mf.length === 0, mf);
  check('8. ...each move\'s other side is itself a move that lands by the mail',
    Object.values(MAIL_CLASSES).filter((r) => r.class === 'move').every((r) => [GOLD_ROADS[r.other], BAG_ROADS[r.other]].some((x) => x && x.class === 'move' && /^mail_/.test(x.other))));
  check('8. edge 3: the champion\'s prize is the one credit that carries two amounts (`house`, minted)', Object.entries(MAIL_CLASSES).filter(([, r]) => r.house).map(([w]) => w).join() === 'arenapot');
  check('8. mailClassOf reads the first word; an unknown word, a non-string and a prototype name are null',
    mailClassOf('store:abc:gold') === MAIL_CLASSES.store && mailClassOf('trade2:s:p:gold').class === 'move' && mailClassOf('nope:1') === null && mailClassOf(7) === null && mailClassOf('constructor:x') === null && mailClassOf('__proto__:x') === null);
}
{
  /* every credit in server/src, by its opId's first word: a _creditPlayer
     call, and each `entry: {...}` a _creditLiveTogether is handed (the call
     itself takes a list built above it).  A credit whose opId is not a
     literal is listed here with the word it builds, and why. */
  const NOT_LITERAL = [
    { file: 'admin.js', word: 'admin', why: 'the operator\'s grant: `opId` is built a line above (\'admin:\' + a uuid, or the one the operator passes back to retry)' },
  ];
  const argText = (s, i) => {
    let depth = 0, q = null;
    const start = i;
    for (; i < s.length; i++) {
      const ch = s[i];
      if (q) { if (ch === '\\') i++; else if (ch === q) q = null; continue; }
      if (ch === '\'' || ch === '"' || ch === '`') q = ch;
      else if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') { depth--; if (depth === 0) return s.slice(start, i + 1); }
    }
    return s.slice(start);
  };
  const words = new Map(), bad = [], notLitSeen = new Set();
  let calls = 0;
  for (const f of files) {
    const s = code[f];
    for (const re of [/\b_creditPlayer\s*\(/g, /\bentry\s*:\s*\{/g]) {
      for (const m of s.matchAll(re)) {
        const t = argText(s, m.index + m[0].length - 1);
        if (/^\(playerId, entry\)/.test(t)) continue;   /* the definition (inbox.js) */
        calls++;
        const ws = [...t.matchAll(/opId\s*:\s*['`]([A-Za-z0-9_]+):/g)].map((x) => x[1]);
        const where = f + ':' + lineOf(s, m.index);
        if (!ws.length) {
          const nl = NOT_LITERAL.find((n) => n.file === f);
          if (nl) { notLitSeen.add(nl); ws.push(nl.word); }
          else { bad.push(where + ' a credit whose opId is not a literal word: ' + t.slice(0, 80).replace(/\s+/g, ' ')); continue; }
        }
        for (const w of ws) {
          if (!mailClassOf(w + ':')) bad.push(where + ' credits under "' + w + ':", which MAIL_CLASSES has not got');
          if (!words.has(w)) words.set(w, []);
          words.get(w).push(where);
        }
      }
    }
  }
  check(`8. every credit in server/src (${calls}) is classed by its opId's first word`, bad.length === 0 && calls >= 60, bad.length ? bad : calls);
  check('8. ...every NOT_LITERAL entry still exists', notLitSeen.size === NOT_LITERAL.length);
  const stale = Object.keys(MAIL_CLASSES).filter((w) => !words.has(w));
  check('8. every MAIL_CLASSES row is a word some credit uses (a stale row is deleted)', stale.length === 0, stale);
}

/* ── 9. THE COUNT (v2.3.5084) ─────────────────────────────────────────────── */
{
  const room = new GameRoom({ storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} }, getWebSockets: () => [], acceptWebSocket: () => {} },
    { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } });
  room._liveFlags = {};
  const g = (rec) => (rec._econ ? [rec._econ.g.m, rec._econ.g.b] : null);
  const a = { coins: 100 };
  room._goldGive(a, 40, 'quest_reward');
  check('9. a mint road books what it gave under m', JSON.stringify(g(a)) === '[40,0]', g(a));
  room._goldTake(a, 30, 'harden');
  check('9. a burn road books what it took under b', JSON.stringify(g(a)) === '[40,30]' && a.coins === 110, g(a));
  room._goldTake(a, 50, 'bank_deposit'); room._goldGive(a, 20, 'bank_withdraw');
  room._goldTake(a, 10, 'trade_window'); room._goldTake(a, 5, 'arena_entry');
  check('9. an escrow or a move books nothing (the world\'s total did not change)', JSON.stringify(g(a)) === '[40,30]' && a.coins === 65, { e: g(a), coins: a.coins });
  room._goldTake(a, 999, 'gamble_loss');
  check('9. a burn books what really left (the purse never below 0): 65, not 999', JSON.stringify(g(a)) === '[40,95]' && a.coins === 0, g(a));
  /* sets, by their difference */
  const n = {};
  room._goldSet(n, 25, 'join_new');
  check('9. join_new books the start gold as minted', JSON.stringify(g(n)) === '[25,0]', g(n));
  const st = { coins: 0 };
  room._goldSet(st, 300, 'join_stored');
  check('9. a load books nothing (GOLD_LOADS: the stored purse was the world\'s while away)', !st._econ && GOLD_LOADS.join() === 'join_stored');
  const red = { coins: 80, _econ: { v: 1, g: { m: 80, b: 0 }, i: Object.create(null) } };
  room._goldSet(red, 0, 'nml_lost');
  const kill = { coins: 80 };
  room._goldSet(kill, 0, 'nml_loss');
  check('9. a red skull killed by no player burns the purse (nml_lost); a kill moves it (nml_loss, nothing booked)', JSON.stringify(g(red)) === '[80,80]' && !kill._econ, { red: g(red) });
  /* the mail: the payout's own class */
  const m = { coins: 0 };
  room._goldGive(m, 50, 'mail_gold', { opId: 'dq:bp:20261114:0', payload: { amount: 50 } });
  room._goldGive(m, 70, 'mail_gold', { opId: 'duelpot:d1', payload: { amount: 70 } });
  room._goldGive(m, 30, 'mail_gold', { opId: 'trade2:s:p:gold', payload: { amount: 30 } });
  check('9. a payout by the mail books its own class: a daily quest\'s 50 minted, a duel\'s pot (escrow) and a trade (move) nothing', JSON.stringify(g(m)) === '[50,0]' && m.coins === 150, g(m));
  room._goldGive(m, 1000, 'mail_gold', { opId: 'arenapot:t1', payload: { amount: 1000, house: 400 } });
  check('9. the champion\'s prize books only the house\'s part (edge 3): 400 of 1000', JSON.stringify(g(m)) === '[450,0]', g(m));
  room._goldGive(m, 10, 'mail_gold', { opId: 'nosuchword:1', payload: {} });
  room._goldGive(m, 10, 'mail_gold');
  check('9. a payout with no class, or none handed over, books nothing', JSON.stringify(g(m)) === '[450,0]', g(m));
  check('9. mailMinted: the house\'s part is held to what landed', mailMinted({ opId: 'arenapot:x', payload: { house: 900 } }, 300) === 300 && mailMinted({ opId: 'arenapot:x', payload: {} }, 300) === 0 && mailMinted(null, 5) === 0);
  /* a newer worker's shape is never counted into */
  const nv = { coins: 0, _econ: { v: 2, future: 1 } };
  room._goldGive(nv, 10, 'quest_reward');
  check('9. a NEWER _econ is left whole (never counted into by a rolled-back worker)', JSON.stringify(nv._econ) === '{"v":2,"future":1}' && nv.coins === 10);
  /* step 1's sums: counted by the whole-coin difference all the same */
  room._liveFlags = { goldonesum: false };
  const f = { coins: 10.5 };
  room._goldGive(f, 1, 'quest_reward');
  room._liveFlags = {};
  check('9. with `goldonesum: false` the count is the whole-coin difference (10 -> 11: one)', JSON.stringify(g(f)) === '[1,0]', g(f));
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
