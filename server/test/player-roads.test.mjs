/* ═══ v2.3.5280: THE ROADS BETWEEN PLAYERS, ONE TABLE (grand plan step 10.5, card R PR 1) ═══
 * (spec docs/specs/player-roads.md; the table: server/src/playerroads.js)
 *
 * Every way value passes from one account to another is a row of
 * PLAYER_ROADS, with its fee, its hold, its pace and its ledger.  Strict
 * from the start (the plan's rule 3: a set that value hangs on).  This suite
 * fails:
 *
 *   1. THE ZEROS: a `fee`, `hold` or `pace` that is not 0.  The owner's call
 *      12: "YES to building the table with everything at zero; turning one
 *      up is a later call."  No settlement reads them yet; turning one up is
 *      a PR that builds its reader, the owner's call;
 *   2. A ROW THAT IS NOT WHOLE: no `at` or `why`; a `carries` off ROAD_KINDS
 *      or empty; a ledger off ROAD_LEDGERS, or `none` with no `ledgerWhy`; a
 *      row that names no road; a road no door has; a `mint` or `burn` road
 *      (it has no other account); a kind it carries with a door (gold, the
 *      bag) and no road of that door named, or a door's road named for a
 *      kind it does not carry;
 *   3. A `move` ROAD ON NO ROW: every `move` road of the two doors (gold.js
 *      GOLD_ROADS, bag.js BAG_ROADS, and the bag's whole assigns BAG_WHOLE)
 *      is named on a row;
 *   4. AN `escrow` ROAD ON NO ROW: every `escrow` road is on a row or is a
 *      player's own (OWN_ROADS, with why: the bank); an escrow into a place
 *      the registry marks `between` (storagemarks.js) is on a row, never
 *      only OWN; an OWN road holds only in places marked `player`, and is on
 *      no row;
 *   5. THE KINDS WITH NO DOOR YET: every kind is behind a door (KIND_DOORS)
 *      or listed DOORLESS, never both (a kind leaves DOORLESS in the PR that
 *      builds its door: weapons and gear, card R PR 2);
 *   6. THE GUARD SEES A PLANT: the checks above run on a copy of the tables
 *      with a `move` road on no row, and with a fee of 1, and fail each.
 *
 * (That XFER.ROADS and XFER.KILLS are this table's rows by ledger, and that
 * every `move` road writes an `xfer:` row or is a kill, is xfer.test §2's:
 * one guard a rule.)
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   - `planted: R('take', 'plain', 'x', 'move', 'mail_gold'),` added to
 *     gold.js GOLD_ROADS                        -> FAIL 3 (gold-door.test fails too: no caller)
 *   - `fee: 1` on playerroads.js trade_window   -> FAIL 1
 *
 * Run: cd server && node test/player-roads.test.mjs (npm test runs it).
 */
import { GOLD_ROADS } from '../src/gold.js';
import { BAG_ROADS, BAG_WHOLE } from '../src/bag.js';
import { marksOf } from '../src/storagemarks.js';
import { PLAYER_ROADS, OWN_ROADS, ROAD_KINDS, KIND_DOORS, DOORLESS, ROAD_LEDGERS } from '../src/playerroads.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 900) : ''); }
}

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const placesOf = (r) => (Array.isArray(r.other) ? r.other : [r.other]);

/* Every check as one pure function of the tables, so §6 can run it on a
   planted copy.  Returns {zeros, rows, moves, escrows, kinds}: a list of
   faults for each section. */
function faults({ doors, rows, ownRoads, kinds, kindDoors, doorless, ledgers }) {
  const out = { zeros: [], rows: [], moves: [], escrows: [], kinds: [] };
  /* where each door road is named: 'gold:trade_window' -> [row keys] */
  const named = new Map();
  for (const [key, row] of Object.entries(rows)) {
    /* 1. the zeros */
    for (const c of ['fee', 'hold', 'pace']) {
      if (row[c] !== 0) out.zeros.push(key + ': ' + c + ' is ' + JSON.stringify(row[c]) + ', not 0 (the owner\'s call 12: turning one up is a later call, with its reader)');
    }
    /* 2. the row is whole */
    if (typeof row.at !== 'string' || !row.at) out.rows.push(key + ': no `at`');
    if (typeof row.why !== 'string' || !row.why) out.rows.push(key + ': no `why`');
    if (!Array.isArray(row.carries) || !row.carries.length) out.rows.push(key + ': carries nothing');
    for (const k of (row.carries || [])) if (!kinds.includes(k)) out.rows.push(key + ': carries "' + k + '", not a kind (ROAD_KINDS)');
    if (!ledgers.includes(row.ledger)) out.rows.push(key + ': ledger "' + row.ledger + '" is not one of ' + ledgers.join(', '));
    if (row.ledger === 'none' && !(typeof row.ledgerWhy === 'string' && row.ledgerWhy)) out.rows.push(key + ': ledger `none` with no `ledgerWhy`');
    const roads = row.roads && typeof row.roads === 'object' ? row.roads : {};
    let n = 0;
    for (const [door, list] of Object.entries(roads)) {
      if (!own(doors, door)) { out.rows.push(key + ': names roads of "' + door + '", which is no door'); continue; }
      for (const r of (Array.isArray(list) ? list : [])) {
        n++;
        const dr = own(doors[door], r) ? doors[door][r] : null;
        if (!dr) { out.rows.push(key + ': ' + door + ' road "' + r + '" does not exist'); continue; }
        if (dr.class !== 'move' && dr.class !== 'escrow') out.rows.push(key + ': ' + door + ' road "' + r + '" is a ' + dr.class + ' (a mint or a burn has no other account)');
        const id = door + ':' + r;
        if (!named.has(id)) named.set(id, []);
        named.get(id).push(key);
      }
    }
    if (!n) out.rows.push(key + ': names no road');
    for (const k of (row.carries || [])) {
      const ds = own(kindDoors, k) ? kindDoors[k] : null;
      if (ds && !ds.some((d) => (roads[d] || []).length)) out.rows.push(key + ': carries ' + k + ' but names no road of its door (' + ds.join(' or ') + ')');
    }
    for (const [k, ds] of Object.entries(kindDoors)) {
      if (ds.some((d) => (roads[d] || []).length) && !(row.carries || []).includes(k)) out.rows.push(key + ': names a road of ' + ds.join('/') + ' but does not carry ' + k);
    }
  }
  /* the player's own escrows */
  const owned = new Map();
  for (const [key, o] of Object.entries(ownRoads)) {
    if (typeof o.why !== 'string' || !o.why) out.escrows.push('OWN_ROADS.' + key + ': no why');
    for (const [door, list] of Object.entries(o.roads || {})) {
      for (const r of list) {
        const dr = own(doors, door) && own(doors[door], r) ? doors[door][r] : null;
        const id = door + ':' + r;
        if (!dr) { out.escrows.push('OWN_ROADS.' + key + ': ' + id + ' does not exist'); continue; }
        if (dr.class !== 'escrow') { out.escrows.push('OWN_ROADS.' + key + ': ' + id + ' is a ' + dr.class + ', not an escrow'); continue; }
        for (const p of placesOf(dr)) {
          const m = marksOf(p);
          if (!m || m.whose !== 'player') out.escrows.push('OWN_ROADS.' + key + ': ' + id + ' holds in "' + p + '", which the registry marks ' + (m ? '`' + m.whose + '`' : 'not at all') + ', not `player`');
        }
        if (named.has(id)) out.escrows.push(id + ' is a player\'s own (OWN_ROADS.' + key + ') and on a row (' + named.get(id).join(', ') + '): one or the other');
        owned.set(id, key);
      }
    }
  }
  /* 3 and 4: every move and escrow road placed */
  for (const [door, table] of Object.entries(doors)) {
    for (const [r, dr] of Object.entries(table)) {
      const id = door + ':' + r;
      if (dr.class === 'move' && !named.has(id)) out.moves.push(id + ': a `move` road on no row of PLAYER_ROADS');
      if (dr.class !== 'escrow') continue;
      const between = placesOf(dr).filter((p) => { const m = marksOf(p); return m && m.whose === 'between'; });
      if (between.length && !named.has(id)) out.escrows.push(id + ': an escrow into ' + between.join(', ') + ' (marked `between`) on no row of PLAYER_ROADS');
      else if (!named.has(id) && !owned.has(id)) out.escrows.push(id + ': an escrow on no row of PLAYER_ROADS and not a player\'s own (OWN_ROADS)');
    }
  }
  /* 5. the kinds */
  for (const k of kinds) {
    const d = own(kindDoors, k), dl = doorless.includes(k);
    if (d === dl) out.kinds.push(k + (d ? ': behind a door AND listed DOORLESS' : ': neither behind a door (KIND_DOORS) nor DOORLESS'));
  }
  for (const k of [...Object.keys(kindDoors), ...doorless]) if (!kinds.includes(k)) out.kinds.push(k + ': not a kind (ROAD_KINDS)');
  for (const ds of Object.values(kindDoors)) for (const d of ds) if (!own(doors, d)) out.kinds.push('KIND_DOORS names "' + d + '", which is no door');
  return out;
}

const DOORS = { gold: GOLD_ROADS, bag: BAG_ROADS, bagWhole: BAG_WHOLE };
const REAL = { doors: DOORS, rows: PLAYER_ROADS, ownRoads: OWN_ROADS, kinds: ROAD_KINDS, kindDoors: KIND_DOORS, doorless: DOORLESS, ledgers: ROAD_LEDGERS };
const f = faults(REAL);

/* ══════════ 1. THE ZEROS ══════════ */
check('1. every road between players has fee, hold and pace 0 (the owner\'s call 12)', f.zeros.length === 0, f.zeros);

/* ══════════ 2. EVERY ROW WHOLE ══════════ */
check('2. every row is whole: where, why, what it carries, its ledger, and only `move` and `escrow` roads that exist', f.rows.length === 0, f.rows);
check('2. ...the table is not empty, and its keys are plain names', Object.keys(PLAYER_ROADS).length >= 10 && Object.keys(PLAYER_ROADS).every((k) => /^[a-z][a-z0-9_]*$/.test(k)), Object.keys(PLAYER_ROADS));

/* ══════════ 3. EVERY MOVE ROAD ON A ROW ══════════ */
const moveCount = Object.values(DOORS).reduce((s, t) => s + Object.values(t).filter((r) => r.class === 'move').length, 0);
check('3. every `move` road of the doors is on a row (' + moveCount + ' of them)', f.moves.length === 0 && moveCount > 0, f.moves);

/* ══════════ 4. EVERY ESCROW ROAD ON A ROW, OR A PLAYER'S OWN ══════════ */
const escrowCount = Object.values(DOORS).reduce((s, t) => s + Object.values(t).filter((r) => r.class === 'escrow').length, 0);
check('4. every `escrow` road is on a row or a player\'s own; one into a `between` place always on a row (' + escrowCount + ' of them)', f.escrows.length === 0 && escrowCount > 0, f.escrows);

/* ══════════ 5. THE KINDS ══════════ */
check('5. every kind is behind a door or listed DOORLESS, never both', f.kinds.length === 0, f.kinds);

/* ══════════ 6. THE GUARD SEES A PLANT ══════════ */
{
  const plantedGold = { ...GOLD_ROADS, planted: Object.freeze({ dir: 'take', sum: 'plain', at: 'x', class: 'move', other: 'mail_gold' }) };
  const g = faults({ ...REAL, doors: { ...DOORS, gold: plantedGold } });
  check('6. a planted `move` road on no row fails §3', g.moves.some((s) => s.startsWith('gold:planted')), g.moves);
  const plantedEscrow = { ...BAG_ROADS, planted: Object.freeze({ dir: 'take', read: 'plain', empty: 'leZero', at: 'x', class: 'escrow', other: 'store_listing:' }) };
  const e = faults({ ...REAL, doors: { ...DOORS, bag: plantedEscrow } });
  check('6. ...a planted escrow into a `between` place on no row fails §4', e.escrows.some((s) => s.startsWith('bag:planted')), e.escrows);
  const fee = faults({ ...REAL, rows: { ...PLAYER_ROADS, trade_window: { ...PLAYER_ROADS.trade_window, fee: 1 } } });
  check('6. ...a fee of 1 fails §1', fee.zeros.some((s) => s.startsWith('trade_window: fee')), fee.zeros);
  const hold = faults({ ...REAL, rows: { ...PLAYER_ROADS, market: { ...PLAYER_ROADS.market, hold: 60000 } } });
  check('6. ...a hold fails §1, and so does a pace', hold.zeros.length === 1 && faults({ ...REAL, rows: { ...PLAYER_ROADS, jackpot: { ...PLAYER_ROADS.jackpot, pace: 3 } } }).zeros.length === 1);
  const minted = faults({ ...REAL, rows: { ...PLAYER_ROADS, diego_pile: { ...PLAYER_ROADS.diego_pile, carries: ['gold', 'bag'], roads: { ...PLAYER_ROADS.diego_pile.roads, gold: ['shop_sell'] } } } });
  check('6. ...a `mint` road named on a row fails §2', minted.rows.some((s) => s.includes('gold road "shop_sell" is a mint')), minted.rows);
  const bank = faults({ ...REAL, ownRoads: {} });
  check('6. ...the bank\'s escrows with no OWN_ROADS row fail §4', bank.escrows.filter((s) => s.includes('bank_')).length === 4, bank.escrows);
  const ownBetween = faults({ ...REAL, ownRoads: { ...OWN_ROADS, wrong: { roads: { gold: ['jackpot_ticket'] }, why: 'x' } } });
  check('6. ...an escrow into a `between` place listed as a player\'s own fails §4', ownBetween.escrows.some((s) => s.includes('jackpot_ticket') && s.includes('`between`')), ownBetween.escrows);
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
if (failures) { console.log('player-roads: FAILED'); process.exit(1); }
console.log('all player-roads checks passed');
