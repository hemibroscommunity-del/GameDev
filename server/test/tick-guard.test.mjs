/* ═══ v2.3.4653: EVERY PART OF THE TICK IS GUARDED ═══
 *
 * The state-machine sweep (VA, S3-1): v2.3.1562's `guard` left four of the
 * tick's systems outside it -- the parties' housekeeping, the health regen,
 * the player-state flush and the ping / AFK sweep.  A throw in one aborted
 * the rest of the tick, the broadcast with it, every tick it threw again: a
 * silent room.
 *   1. each of the four, throwing every tick, stops only itself: the other
 *      three still run and the tick still reaches its end (tickSeq);
 *   2. the throw is counted by name in `_tickErrs` and logged once;
 *   3. a throw before the guards (the snapshot) is caught at the tick's top
 *      ('body'): the interval's callback never throws.
 * The real 22 ms interval is never started: setInterval is stubbed and the
 * tick is called by hand (the aggro-grid.test convention).
 */
import { GameRoom } from '../src/index.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };

const realSetInterval = globalThis.setInterval, realClear = globalThis.clearInterval;
const realErr = console.error;
let logged = [];
console.error = (...a) => { logged.push(a.join(' ')); };

function roomWithTick() {
  const room = new GameRoom(makeState(), mockEnv);
  let tickFn = null;
  globalThis.setInterval = (fn) => { if (!tickFn) tickFn = fn; return 1; };
  globalThis.clearInterval = () => {};
  room.startTickLoop();
  return { room, tick: () => tickFn() };
}

const PARTS = [['parties', '_tickParties'], ['regen', '_tickPlayerRegen'], ['flush', '_flushPendingPlayerStates'], ['pingAfk', '_tickPingAndAfk']];
const N = 200;   /* more than the ping's 90 ticks and the regen's interval */

for (const [label, method] of PARTS) {
  const { room, tick } = roomWithTick();
  const ran = Object.create(null);
  for (const [, m] of PARTS) {
    const real = room[m];
    room[m] = function (...a) {
      ran[m] = (ran[m] || 0) + 1;
      if (m === method) throw new Error('boom in ' + m);
      return real.apply(this, a);
    };
  }
  logged = [];
  const seq0 = room.tickSeq || 0;
  let escaped = null;
  for (let i = 0; i < N; i++) { try { tick(); } catch (e) { escaped = e; break; } }
  check('1 ' + label + ' throwing every tick: the tick never throws', !escaped, escaped && escaped.message);
  const others = PARTS.filter(([, m]) => m !== method).map(([, m]) => [m, ran[m] || 0]);
  check('1 ...and the other three still run (' + others.map(([m, n]) => m + ' ' + n).join(', ') + ')', others.every(([, n]) => n > 0), others);
  check('1 ...and every tick reaches its end (tickSeq +' + ((room.tickSeq || 0) - seq0) + ')', (room.tickSeq || 0) - seq0 === N);
  const n = room._tickErrs && room._tickErrs[label];
  check('2 counted as \'' + label + '\' each time it threw (' + n + ')', n === ran[method] && n > 0, room._tickErrs);
  check('2 ...and logged once', logged.filter((l) => l.includes('[tick] ' + label + ' threw')).length === 1, logged.slice(0, 3));
}

{
  const { room, tick } = roomWithTick();
  Object.defineProperty(room, 'playerState', { configurable: true, get() { throw new Error('boom in the snapshot'); } });
  let escaped = null;
  for (let i = 0; i < 5; i++) { try { tick(); } catch (e) { escaped = e; break; } }
  check('3 a throw before the guards does not leave the tick', !escaped, escaped && escaped.message);
  check('3 ...it is counted as \'body\'', room._tickErrs && room._tickErrs.body === 5, room._tickErrs);
}

globalThis.setInterval = realSetInterval; globalThis.clearInterval = realClear; console.error = realErr;
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
