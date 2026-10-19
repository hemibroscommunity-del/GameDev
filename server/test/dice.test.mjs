/* /roll and /flip -- v2.3.3393 (server/src/dice.js, docs/specs/dice.md).
 *
 * The fun & social plan's Phase 1: "/roll" (1-100, or "/roll 20"), "/flip",
 * rolled by the WORKER -- a phone's own roll could always say 100.
 *
 *   1. the ask: a roll (1-100, or 2..1000 faces), a flip; anything else is
 *      nothing;
 *   2. the number is fair: in range, every face comes up about as often as
 *      every other (60,000 rolls on a seeded source, and 60,000 on the crypto
 *      one against a line no fair die reaches -- v2.3.3478), and the draw that
 *      would favour the low faces is drawn again (a rigged source);
 *   3. one every DICE.GAP_MS a player; the dead roll nothing; `dice: false`;
 *      state_sync's caps.dice;
 *   4. through the tick, in the Wheel: the roller and a phone near hear it in
 *      the roller's name, the same number; a phone far off, one in today's
 *      town and one that muted the roller do not;
 *   5. no phone can forge one: a `dice_roll` sent by a phone goes nowhere, and
 *      it is PRIVILEGED;
 *   6. the phone's copy (src/game/dice.js): the same gap and faces, its
 *      commands, and its check of the worker's answer.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { DICE, fairInt, diceAsk } from '../src/dice.js';
import { EVENT_PLACE } from '../src/eventplace.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { DICE_GAP_MS, DICE_SIDES, DICE_MAX_SIDES, slashDice, diceResult, diceLineText, diceBubbleText } from '../../src/game/dice.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

function mockState() {
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
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }

async function makeRoom() {
  const room = new GameRoom(mockState(), mockEnv);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => {
    if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; }
    return realSetInterval(fn, ms);
  };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  return { room, tickFn };
}
async function join(room, id, { z = 'town', x = 1000, y = 1000 } = {}) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, data: { x, y, z } }));
  return { ws, id };
}
async function move(room, p, x, y, z) {
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x, y, d: 'south', f: 'south', z, vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
}
function place(room, p, x, y, z) {
  const ps = room.playerState[p.id];
  ps.x = x; ps.y = y; ps.z = z;
}
function keepAlive(room, ps) {
  for (const p of ps) {
    const s = room.playerState[p.id];
    if (s) { s.hp = Math.max(s.hp || 0, 1e6); s.maxHp = Math.max(s.maxHp || 0, 1e6); s.dead = false; s.dying = false; }
  }
}
/* the rolls a phone was sent in ticks since `from` (an index into ws.sent) */
function rollsOf(p, from = 0) {
  const out = [];
  for (let i = from; i < p.ws.sent.length; i++) {
    const s = p.ws.sent[i];
    if (!s.startsWith('{"type":"tick"')) continue;
    const d = JSON.parse(s);
    if (Array.isArray(d.events)) for (const e of d.events) if (e && e.type === 'dice_roll') out.push(e);
  }
  return out;
}
/* ask once, with the gap behind the asker; the rolls it made */
async function ask(room, p, msg) {
  const ps = room.playerState[p.id];
  if (ps) ps._diceAt = 0;
  room.eventBuffer.length = 0;
  await room.webSocketMessage(p.ws, JSON.stringify(Object.assign({ type: 'dice' }, msg)));
  return room.eventBuffer.filter((e) => e && e.type === 'dice_roll');
}

/* ── 1. the ask ────────────────────────────────────────────────────────── */
check('1a "/roll" alone is a roll of 100', JSON.stringify(diceAsk({ kind: 'roll' })) === JSON.stringify({ kind: 'roll', sides: 100 }));
check('1b a roll of 20, of 2, of 1000', diceAsk({ kind: 'roll', max: 20 }).sides === 20 && diceAsk({ kind: 'roll', max: 2 }).sides === 2 && diceAsk({ kind: 'roll', max: 1000 }).sides === 1000);
check('1c a flip is two faces', JSON.stringify(diceAsk({ kind: 'flip', max: 99 })) === JSON.stringify({ kind: 'flip', sides: 2 }));
for (const bad of [{ kind: 'roll', max: 1 }, { kind: 'roll', max: 0 }, { kind: 'roll', max: 1001 }, { kind: 'roll', max: 2.5 }, { kind: 'roll', max: '20' },
  { kind: 'roll', max: -6 }, { kind: 'roll', max: Infinity }, { kind: 'ROLL' }, { kind: '__proto__' }, { kind: 'toString' }, {}, null, 'roll', [1]]) {
  check('1d not an ask (' + JSON.stringify(bad) + ')', diceAsk(bad) === null, diceAsk(bad));
}

/* ── 2. the number is fair ─────────────────────────────────────────────── */
{
  /* v2.3.3478: 2a rolls on a SEEDED source (mulberry32), the same 60,000
     numbers every run.  On the platform's own crypto numbers a fair die
     crosses the 0.1% line one run in a thousand, and #1017's CI was that run
     (chi 22.65, nothing near the dice changed).  What 2a tests is fairInt's
     own arithmetic, the modulo and the redraw, which a seeded stream shows
     just as well.  2a2 still rolls the crypto source, against the line a
     fair die crosses one run in a hundred million: it catches a broken
     source, never a fair one. */
  const rolls = (draw) => {
    const counts = new Array(7).fill(0);
    let outOfRange = 0;
    for (let i = 0; i < 60000; i++) {
      const v = fairInt(6, draw);
      if (!(Number.isInteger(v) && v >= 1 && v <= 6)) outOfRange++; else counts[v]++;
    }
    const e = 60000 / 6;
    let chi = 0;
    for (let f = 1; f <= 6; f++) chi += (counts[f] - e) * (counts[f] - e) / e;
    return { outOfRange, counts: counts.slice(1), chi: +chi.toFixed(2) };
  };
  let seed = 0x5eed;
  const seeded = () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  const s = rolls(seeded);
  /* chi-square with 5 degrees of freedom: 20.5 is the 0.1% line */
  check('2a 60,000 rolls of six faces from a seeded source: every one 1-6, as often as each other (chi-square under the 0.1% line)', s.outOfRange === 0 && s.chi < 20.5, s);
  const c = rolls(undefined);
  /* ...and 45.7 the one-in-a-hundred-million line */
  check('2a2 60,000 rolls from the crypto source: every one 1-6, none lopsided (chi-square under the 1e-8 line)', c.outOfRange === 0 && c.chi < 45.7, c);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 20000; i++) { const v = fairInt(100); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  check('2b a hundred faces reaches both ends', lo === 1 && hi === 100, { lo, hi });
  /* a rigged source: its first draw is in the top sliver that would make face
     1 likelier than the rest (2^32 is not a multiple of 100), its second is 0 */
  const SPAN = 0x100000000;
  const draws = [SPAN - 1, 41];
  let k = 0;
  const v = fairInt(100, () => draws[k++]);
  check('2c a draw from the top sliver is drawn again (no modulo bias)', k === 2 && v === 42, { k, v });
  let q = 0;
  check('2d a source that never gives a fair draw still ends, in range', (() => { const w = fairInt(100, () => { q++; return SPAN - 1; }); return w >= 1 && w <= 100 && q === 64; })());
}

/* ── 3. the gap, the dead, the switch, the cap ─────────────────────────── */
{
  const { room } = await makeRoom();
  const A = await join(room, 'bp_dice_a');
  let r = await ask(room, A, { kind: 'roll' });
  check('3a a roll is one dice_roll in the roller\'s name, from the worker', r.length === 1 && r[0].from === A.id && r[0].payload.id === A.id
    && r[0].payload.kind === 'roll' && r[0].payload.max === 100 && Number.isInteger(r[0].payload.value) && r[0].payload.value >= 1 && r[0].payload.value <= 100
    && r[0].payload.name === room._relayName(room.sessions.get(A.ws)) && r[0].payload.name === 'bp_dice_a', r);
  r = await ask(room, A, { kind: 'flip' });
  check('3b a flip is 1 (heads) or 2 (tails) of 2', r.length === 1 && r[0].payload.kind === 'flip' && r[0].payload.max === 2 && (r[0].payload.value === 1 || r[0].payload.value === 2), r);
  r = await ask(room, A, { kind: 'roll', max: 20, value: 20 });
  check('3c the phone cannot choose its number (a `value` in the ask is ignored)', r.length === 1 && r[0].payload.max === 20 && Object.keys(r[0].payload).sort().join() === 'id,kind,max,name,value,zone', r);
  room.eventBuffer.length = 0;
  room.playerState[A.id]._diceAt = Date.now() - DICE.GAP_MS + 500;
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'dice', kind: 'roll' }));
  check('3d a second roll inside ' + DICE.GAP_MS + ' ms rolls nothing', room.eventBuffer.filter((e) => e.type === 'dice_roll').length === 0);
  room.playerState[A.id]._diceAt = Date.now() - DICE.GAP_MS - 5;
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'dice', kind: 'roll' }));
  check('3e ...and one after it rolls', room.eventBuffer.filter((e) => e.type === 'dice_roll').length === 1);
  room.playerState[A.id].dead = true;
  check('3f the dead roll nothing', (await ask(room, A, { kind: 'roll' })).length === 0);
  room.playerState[A.id].dead = false;
  for (const bad of [{ kind: 'roll', max: 1 }, { kind: 'cheat' }, { kind: 'roll', max: '100' }]) {
    check('3g a bad ask rolls nothing (' + JSON.stringify(bad) + ')', (await ask(room, A, bad)).length === 0);
  }
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags || {}, { dice: false });
  check('3h `dice: false`: no roll', (await ask(room, A, { kind: 'roll' })).length === 0);
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags, { dice: true });
  check('3i back on: it rolls', (await ask(room, A, { kind: 'roll' })).length === 1);
  const sync = A.ws.sent.map((x) => JSON.parse(x)).find((m) => m.type === 'state_sync');
  check('3j state_sync advertises caps.dice', !!(sync && sync.caps && sync.caps.dice === true), sync && sync.caps && sync.caps.dice);
}

/* ── 4. through the tick, in the Wheel ─────────────────────────────────── */
{
  const { room, tickFn } = await makeRoom();
  const T0 = room._wheelT();
  const AT = { x: T0.WHEEL_CENTRE[0], y: T0.WHEEL_CENTRE[1] + 288 };
  const A = await join(room, 'bp_dice_t_a');   /* the roller */
  const B = await join(room, 'bp_dice_t_b');   /* near */
  const F = await join(room, 'bp_dice_t_f');   /* far: past EVENT_PLACE.R */
  const M = await join(room, 'bp_dice_t_m');   /* near, has muted A */
  const T = await join(room, 'bp_dice_t_t');   /* in today's town */
  const all = [A, B, F, M, T];
  for (const p of [A, B, F, M]) await move(room, p, AT.x, AT.y, WHEEL_ZONE);
  await move(room, T, 600, 600, 'town');
  place(room, A, AT.x, AT.y, WHEEL_ZONE);
  place(room, B, AT.x + 1200, AT.y + 900, WHEEL_ZONE);
  place(room, F, AT.x + EVENT_PLACE.R + 400, AT.y, WHEEL_ZONE);
  place(room, M, AT.x - 300, AT.y, WHEEL_ZONE);
  await room.webSocketMessage(M.ws, JSON.stringify({ type: 'chat_mute', target: A.id, on: true, name: 'A' }));
  check('4 setup: M has muted A', room._chatModMuted(M.id, A.id) === true);
  keepAlive(room, all);
  tickFn();
  const mark = all.map((p) => p.ws.sent.length);
  room.playerState[A.id]._diceAt = 0;
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'dice', kind: 'roll', max: 20 }));
  keepAlive(room, all);
  tickFn();
  const got = all.map((p, i) => rollsOf(p, mark[i]));
  const v = got[0][0] && got[0][0].payload.value;
  check('4a the roller\'s own phone is sent it, from the worker in their name', got[0].length === 1 && got[0][0].from === A.id && got[0][0].payload.max === 20, got[0]);
  check('4b a phone 1,500 px away hears it, the same number', got[1].length === 1 && got[1][0].payload.value === v && got[1][0].from === A.id, got[1]);
  check('4c a phone past ' + EVENT_PLACE.R + ' px does not', got[2].length === 0, got[2]);
  check('4d a phone that muted the roller does not, though it is near', got[3].length === 0, got[3]);
  check('4e a phone in today\'s town does not', got[4].length === 0, got[4]);
}

/* ── 5. no phone can forge one ─────────────────────────────────────────── */
{
  const { room } = await makeRoom();
  const A = await join(room, 'bp_dice_f_a');
  check('5a dice_roll is PRIVILEGED (index.js)', PRIVILEGED_EVENTS.has('dice_roll'));
  for (const forged of [
    { type: 'dice_roll', payload: { id: A.id, kind: 'roll', value: 100, max: 100 } },
    { type: 'broadcast', event: 'dice_roll', payload: { id: A.id, kind: 'roll', value: 100, max: 100 } },
  ]) {
    const s = room.sessions.get(A.ws);
    s.relayTokens = room.RELAY_BURST; s.relayAt = Date.now(); s.chatGuard = null;
    room.eventBuffer.length = 0;
    await room.webSocketMessage(A.ws, JSON.stringify(forged));
    check('5b a phone\'s own dice_roll goes nowhere (' + forged.type + ')', room.eventBuffer.filter((e) => e && (e.type === 'dice_roll' || e.event === 'dice_roll')).length === 0, room.eventBuffer);
  }
}

/* ── 6. the phone's copy (src/game/dice.js) ────────────────────────────── */
check('6a the phone holds its asks to the worker\'s gap, with the worker\'s faces', DICE_GAP_MS === DICE.GAP_MS && DICE_SIDES === DICE.SIDES && DICE_MAX_SIDES === DICE.MAX_SIDES,
  { phone: [DICE_GAP_MS, DICE_SIDES, DICE_MAX_SIDES], worker: [DICE.GAP_MS, DICE.SIDES, DICE.MAX_SIDES] });
const slashes = {
  '/roll': { kind: 'roll', max: 100 }, '/ROLL': { kind: 'roll', max: 100 }, ' /roll 20 ': { kind: 'roll', max: 20 }, '/dice 6': { kind: 'roll', max: 6 },
  '/flip': { kind: 'flip' }, '/coin': { kind: 'flip' },
  '/roll 1': null, '/roll 1001': null, '/roll 0': null, '/roll the bones': null, '/flip 2': null, 'roll': null, '/rolls': null, '/roll -5': null, '/roll 2.5': null,
};
for (const [txt, want] of Object.entries(slashes)) {
  check('6b slashDice(' + JSON.stringify(txt) + ')', JSON.stringify(slashDice(txt)) === JSON.stringify(want), slashDice(txt));
}
check('6c the phone takes the worker\'s answers', !!diceResult({ kind: 'roll', value: 57, max: 100 }) && !!diceResult({ kind: 'flip', value: 2, max: 2 }) && !!diceResult({ kind: 'roll', value: 1000, max: 1000 }));
for (const bad of [{ kind: 'roll', value: 101, max: 100 }, { kind: 'roll', value: 0, max: 100 }, { kind: 'roll', value: 5.5, max: 100 }, { kind: 'roll', value: 5, max: 1001 },
  { kind: 'flip', value: 3, max: 2 }, { kind: 'flip', value: 1, max: 6 }, { kind: 'roll', value: '57', max: 100 }, { kind: 'jackpot', value: 1, max: 2 }, null]) {
  check('6d ...and nothing else (' + JSON.stringify(bad) + ')', diceResult(bad) === null);
}
check('6e the words', diceLineText({ kind: 'roll', value: 57, max: 100 }) === '🎲 rolled 57 (1-100)' && diceLineText({ kind: 'flip', value: 1, max: 2 }) === '🪙 flipped heads'
  && diceBubbleText({ kind: 'flip', value: 2, max: 2 }) === '🪙 Tails!' && diceBubbleText({ kind: 'roll', value: 7, max: 20 }) === '🎲 7');

console.log(`\ndice: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
