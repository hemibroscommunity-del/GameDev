/* ═══ v2.3.5536: THE GUARD DOOR -- THE SHIELD'S ONE WRITER (card L PR 5) ═══
 * (docs/specs/guard-door.md)
 *
 * The shield is one field, `ps.blocking` (down, raised), with its parry
 * stamp `ps.blockStartT` and its break latch `ps._guardBrokenUntil` written
 * beside it; written only by moveclaims.js _guardTo, by a way of GUARD_WAYS
 * (raise, lower, break).  A raise is refused while the latch is live (live
 * flag `guarddoor: false` lifts that).  This suite:
 *
 *   1. the door's own rules: the ways, the stamp, the latch, a hostile way,
 *      no body, the switch; the phase (guardPhase);
 *   2. A SECOND WRITER FAILS: a write of `.blocking`, `.blockStartT` or
 *      `._guardBrokenUntil` anywhere in server/src outside _guardTo (the
 *      sparring clone's birth and the tick's copy are the phase table's
 *      `besides`, read off the tree there: DOOR_SUITES);
 *   3. through the real room: a move raises (stamped), holds (no write),
 *      lowers; a sword's claim lowers; the regen's empty bar breaks, and a
 *      move inside the latch writes no raise.
 *
 * Break proof, tried by hand: `ps.blocking = false;` put back in
 * linger.js -> FAIL 2 (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { moveClaimMethods, GUARD_WAYS, guardPhase } from '../src/moveclaims.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* ── 1. the door's own rules ── */
{
  check('1. the ways: raise, lower, break', JSON.stringify(GUARD_WAYS) === JSON.stringify({ raise: 'raised', lower: 'down', break: 'broken' }));
  const door = Object.assign(Object.create(null), moveClaimMethods, { _liveFlags: {}, GUARD_BREAK_MS: 3000 });
  const ps = { blocking: false, blockStartT: 0 };
  check('1. a raise with a stamp: up, stamped', door._guardTo(ps, 'raise', 1234) === true && ps.blocking === true && ps.blockStartT === 1234);
  check('1. a raise with none: up, unstamped (blocks, never parries)', door._guardTo(ps, 'raise') === true && ps.blocking === true && ps.blockStartT === 0);
  let bad = 0;
  for (const at of [NaN, Infinity, -5, '9', null]) { door._guardTo(ps, 'raise', at); if (ps.blockStartT !== 0) bad++; }
  check('1. a stamp that is no time is unstamped', bad === 0, bad);
  check('1. a lower: down, the stamp cleared', door._guardTo(ps, 'lower') === true && ps.blocking === false && ps.blockStartT === 0);
  check('1. a lower of a guard already down writes it again (true)', door._guardTo(ps, 'lower') === true && ps.blocking === false);
  ps.blocking = true; ps.blockStartT = 7;
  const t0 = Date.now();
  check('1. a break: down, latched for GUARD_BREAK_MS from now', door._guardTo(ps, 'break') === true && ps.blocking === false && ps.blockStartT === 0 && ps._guardBrokenUntil >= t0 + 3000 && ps._guardBrokenUntil <= Date.now() + 3000);
  door._guardTo(ps, 'break', 5000);
  check('1. a break at a given clock: latched from it', ps._guardBrokenUntil === 8000);
  ps._guardBrokenUntil = Date.now() + 3000;
  check('1. a raise inside the latch is refused, the guard stays down', door._guardTo(ps, 'raise', 1) === false && ps.blocking === false);
  ps._guardBrokenUntil = Date.now() - 1;
  check('1. ...and taken once it is past', door._guardTo(ps, 'raise', 1) === true && ps.blocking === true);
  check('1. an unknown way, one off the prototype, or no body is refused',
    door._guardTo(ps, 'drop') === false && door._guardTo(ps, 'constructor') === false && door._guardTo(ps, '__proto__') === false && door._guardTo(null, 'lower') === false && ps.blocking === true);
  door._liveFlags = { guarddoor: false };
  ps.blocking = false; ps._guardBrokenUntil = Date.now() + 3000;
  check('1. guarddoor: false writes a raise inside the latch, as the old lines could have', door._guardTo(ps, 'raise', 1) === true && ps.blocking === true);
  check('1. ...but never an unknown way', door._guardTo(ps, 'drop') === false);
  door._liveFlags = { guarddoor: true };
  ps.blocking = false;
  check('1. guarddoor: true is the default', door._guardTo(ps, 'raise', 1) === false);
  const P = (o) => Object.assign({ blocking: false, blockStartT: 0, _guardBrokenUntil: 0 }, o);
  check('1. the phase: down, parry, raised, broken',
    guardPhase(P({}), 1000, 250) === 'down' && guardPhase(P({ blocking: true, blockStartT: 900 }), 1000, 250) === 'parry'
    && guardPhase(P({ blocking: true, blockStartT: 500 }), 1000, 250) === 'raised' && guardPhase(P({ blocking: true }), 1000, 250) === 'raised'
    && guardPhase(P({ _guardBrokenUntil: 2000 }), 1000, 250) === 'broken' && guardPhase(null, 1000, 250) === 'down');
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
  const NAMES = 'blocking|blockStartT|_guardBrokenUntil';
  const WRITE = new RegExp(`(?:\\.(?:${NAMES})\\b|\\[\\s*['"](?:${NAMES})['"]\\s*\\])\\s*(?:[-+*/]?=(?!=)|\\+\\+|--)|delete\\s+[\\w$.]+\\.(?:${NAMES})\\b|Object\\.assign\\(\\s*[\\w$.]+\\s*,[^)]*\\{[^}]*\\b(?:${NAMES})\\s*:`);
  /* the tick's copy onto its entry (tick.js), not a player's guard */
  const COPY = /^\s*e\.blocking = ps\.blocking \|\| false;/;
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!new RegExp(NAMES).test(raw)) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'server/src/moveclaims.js') {
        if (/^\s{2}_guardTo\(ps, way, at\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\s{2}\},?\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l) || COPY.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. _guardTo writes the guard, its stamp and its latch (five writes: raise two, lower two, the break\'s latch)', doorWrites === 5, doorWrites);
  check('2. no write of .blocking, .blockStartT or ._guardBrokenUntil in server/src outside _guardTo', outside.length === 0, outside);
  const calls = files.flatMap((f) => [...strip(readFileSync(new URL(f, ROOT), 'utf8')).matchAll(/_guardTo\([\w$.]+, '([a-z]+)'/g)].map((m) => m[1]));
  check('2. every call names a way of GUARD_WAYS, and each way has callers (raise 2, break 4, lower 7)',
    calls.every((w) => Object.prototype.hasOwnProperty.call(GUARD_WAYS, w))
    && calls.filter((w) => w === 'raise').length === 2 && calls.filter((w) => w === 'break').length === 4 && calls.filter((w) => w === 'lower').length === 7, calls);
}

/* ── 3. through the real room ── */
{
  const mockState = {
    storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
  const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
  const room = new GameRoom(mockState, mockEnv);
  room._liveFlags = {};
  const ws = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_gd_a', name: 'Guard', protocolVersion: 2, ws: [1, 5], data: { x: 200, y: 200, z: 'town' } }));
  const ps = room.playerState.bp_gd_a;
  const ways = [];
  const realTo = room._guardTo;
  room._guardTo = function (p, way, at) { ways.push(way); return realTo.call(this, p, way, at); };
  let x = 200;
  const move = (extra) => room.webSocketMessage(ws, JSON.stringify(Object.assign({ type: 'move', x: (x += 1), y: 200, d: 'down', z: 'town' }, extra)));
  check('3. a joined player, guard down', !!ps && ps.blocking === false);

  ps._guardDownAt = 0; ways.length = 0;
  await move({ blocking: true, ba: 0 });
  check('3. a move raises through the raise way, stamped', ps.blocking === true && ps.blockStartT > 0 && ways.join() === 'raise', { ways, t: ps.blockStartT });
  const t = ps.blockStartT; ways.length = 0;
  await move({ blocking: true, ba: 0 });
  check('3. a move holding it up writes nothing (the stamp stands)', ps.blocking === true && ps.blockStartT === t && ways.length === 0, ways);
  await move({ blocking: false });
  check('3. a move lowering it: the lower way', ps.blocking === false && ps.blockStartT === 0 && ways.join() === 'lower', ways);

  await move({ blocking: true, ba: 0 }); ways.length = 0;
  const dropped = room._swingDropsGuard({ id: 'bp_gd_a' }, 'player_attack', { kind: 'melee' });
  check('3. a sword\'s claim lowers it: the lower way', dropped === true && ps.blocking === false && ways.join() === 'lower', ways);

  await move({ blocking: true, ba: 0 }); ways.length = 0;
  ps.stamina = 1; ps.maxStamina = 100; ps.dying = false; ps.dead = false; ps._guardBrokenUntil = 0;
  room._tickPlayerRegen();
  check('3. the regen empties the bar: the break way, latched', ps.blocking === false && ps._guardBrokenUntil > Date.now() && ways.includes('break'), { ways, b: ps.blocking });
  ways.length = 0;
  await move({ blocking: true, ba: 0 });
  check('3. a move inside the latch writes no raise; the guard stays down', ps.blocking === false && !ways.includes('raise'), ways);
  room._guardTo = realTo;
  clearInterval(room.tickInterval);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
