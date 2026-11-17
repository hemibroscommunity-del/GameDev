/* ═══ v2.3.5538: THE FIGHT DOOR -- THE ROOM'S FIGHT CLOCK, ITS ONE WRITER (card L PR 5) ═══
 * (docs/specs/fight-door.md)
 *
 * A fight between players is a clock, not a field: the fight lock and the
 * bite rule derive it at each ask.  The clock's one store is
 * `this._pvpHealClocks` (id -> { pvpAt, healAt }), written only by cooking.js
 * _fightTo, by a way of FIGHT_WAYS (open, exchange, heal, prune, forget).  An
 * id that is no string is refused (live flag `fightdoor: false` lifts that).
 * This suite:
 *
 *   1. the door's own rules: each way, the prune's keep, the cap, a hostile
 *      way or id, the switch;
 *   2. A SECOND WRITER FAILS: a write of this._pvpHealClocks (its birth, a
 *      set, a delete, a clear) or of a clock's .pvpAt or .healAt anywhere in
 *      server/src outside _fightTo (the phase table's guard reads the map's
 *      writes off the tree too: DOOR_SUITES); the old names are the door's;
 *   3. through the real room: a hit between players stamps both sides
 *      (the fight is on: _pvpInFight), a heal stamps its eater, a sparring
 *      clone's removal forgets its clock.
 *
 * Break proof, tried by hand: `this._pvpHealClocks.delete(id);` back in
 * spar.js _sparRemove -> FAIL 2 (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { FIGHT_WAYS } from '../src/cooking.js';
import { PVP_HEAL } from '../src/data.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const mockState = {
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
};
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const room = new GameRoom(mockState, mockEnv);
room._liveFlags = {};

/* ── 1. the door's own rules ── */
{
  check('1. the ways', JSON.stringify(Object.keys(FIGHT_WAYS)) === JSON.stringify(['open', 'exchange', 'heal', 'prune', 'forget']));
  room._pvpHealClocks = undefined;
  check('1. open makes a clock at zero, once', room._fightTo('open', 'a') === true && JSON.stringify(room._pvpHealClocks.get('a')) === '{"pvpAt":0,"healAt":0}');
  const c = room._pvpHealClocks.get('a');
  room._fightTo('open', 'a');
  check('1. ...and an open of a clock there keeps it', room._pvpHealClocks.get('a') === c);
  check('1. exchange stamps both sides\' pvpAt', room._fightTo('exchange', ['a', 'b'], 1000) === true && room._pvpHealClocks.get('a').pvpAt === 1000 && room._pvpHealClocks.get('b').pvpAt === 1000 && room._pvpHealClocks.get('b').healAt === 0);
  check('1. heal stamps healAt alone', room._fightTo('heal', 'a', 2000) === true && room._pvpHealClocks.get('a').healAt === 2000 && room._pvpHealClocks.get('a').pvpAt === 1000);
  const keep = Math.max(PVP_HEAL.WINDOW_MS, PVP_HEAL.GAP_MS);
  check('1. prune drops a clock past the window and the gap, keeps one inside',
    room._fightTo('prune', null, 1000 + keep) === true && !room._pvpHealClocks.has('b') && room._pvpHealClocks.has('a'));
  check('1. forget drops a clock', room._fightTo('forget', 'a') === true && !room._pvpHealClocks.has('a'));
  let bad = 0;
  for (const id of [null, undefined, '', 7, {}, ['x', 3]]) if (room._fightTo('exchange', id, 5) !== false) bad++;
  check('1. an id that is no string is refused, and writes nothing', bad === 0 && room._pvpHealClocks.size === 0, { bad, size: room._pvpHealClocks.size });
  check('1. an unknown way, or one off the prototype, is refused',
    room._fightTo('hit', 'a') === false && room._fightTo('constructor', 'a') === false && room._fightTo('__proto__', 'a') === false && room._pvpHealClocks.size === 0);
  room._liveFlags = { fightdoor: false };
  check('1. fightdoor: false writes under any id, as the old lines could have', room._fightTo('heal', 7, 9) === true && room._pvpHealClocks.get(7).healAt === 9);
  check('1. ...but never an unknown way', room._fightTo('hit', 'a') === false);
  room._liveFlags = { fightdoor: true };
  check('1. fightdoor: true is the default', room._fightTo('heal', 8, 9) === false);
  room._liveFlags = {};
  room._pvpHealClocks = new Map();
  for (let i = 0; i < 512; i++) room._pvpHealClocks.set('old' + i, { pvpAt: 0, healAt: 0 });
  room._fightTo('open', 'new');
  check('1. a full map is pruned before a new clock (the old cap)', room._pvpHealClocks.size === 1 && room._pvpHealClocks.has('new'), room._pvpHealClocks.size);
  check('1. the old names go through the door: _pvpHealClock, _notePvpExchange, _noteInstantHeal, _pvpHealPrune',
    room._pvpHealClock('n2') === room._pvpHealClocks.get('n2')
    && (room._notePvpExchange('n2', 'n3', 77), room._pvpHealClocks.get('n3').pvpAt === 77)
    && (room._noteInstantHeal('n3', 88), room._pvpHealClocks.get('n3').healAt === 88)
    && (room._pvpHealPrune(1e12), room._pvpHealClocks.size === 0));
}

/* ── 2. no second writer ── */
{
  const ROOT = new URL('../../', import.meta.url);
  const files = [];
  (function walk(rel) {
    for (const n of readdirSync(new URL(rel, ROOT))) {
      const r = rel + n;
      if (statSync(new URL(r, ROOT)).isDirectory()) { if (n !== 'vendor') walk(r + '/'); }
      else if (/\.(js|mjs)$/.test(n)) files.push(r);
    }
  })('server/src/');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  const WRITE = /\._pvpHealClocks\s*(?:=(?!=)|\.(?:set|delete|clear)\()|\.(?:pvpAt|healAt)\s*(?:[-+*/]?=(?!=)|\+\+|--)|delete\s+[\w$.]+\._pvpHealClocks\b/;
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!/_pvpHealClocks|pvpAt|healAt/.test(raw)) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'server/src/cooking.js') {
        if (/^\s{2}_fightTo\(way, ids, now\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\s{2}\},?\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. _fightTo writes the map and the clocks (six lines: the prune\'s and the forget\'s deletes, the birth, a set, the two stamps)', doorWrites === 6, doorWrites);
  check('2. no write of this._pvpHealClocks, .pvpAt or .healAt in server/src outside _fightTo', outside.length === 0, outside);
}

/* ── 3. through the real room ── */
{
  room._pvpHealClocks = new Map();
  const ways = [];
  const realTo = room._fightTo;
  room._fightTo = function (way, ids, now) { ways.push(way); return realTo.call(this, way, ids, now); };
  const A = { hp: 100 }, B = { hp: 100 };
  room._notePvpExchange('bp_fdr_a', 'bp_fdr_b', Date.now());
  check('3. a hit between players: both in the fight, through the exchange way',
    ways.join() === 'exchange' && room._pvpInFight('bp_fdr_a', A) && room._pvpInFight('bp_fdr_b', B), ways);
  ways.length = 0;
  room._noteInstantHeal('bp_fdr_a');
  check('3. a heal eaten at once: its eater\'s healAt, through the heal way; the next bite waits', ways.join() === 'heal' && room._pvpHealWait('bp_fdr_a', A) > 0, ways);
  ways.length = 0;
  room._fightTo = realTo;
  const src = readFileSync(new URL('../src/spar.js', import.meta.url), 'utf8');
  check('3. a sparring clone\'s removal forgets its clock (spar.js, the forget way)', /_sparRemove[\s\S]*?this\._fightTo\('forget', id\)/.test(src));
  clearInterval(room.tickInterval);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
