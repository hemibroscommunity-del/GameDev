/* Emotes -- v2.3.3345 (server/src/emotes.js, docs/specs/emotes.md).
 *
 * The phone draws an emote now (an emoji over the sender's head, a quick line
 * as their speech bubble), so the worker relays an emote only when it is one
 * of the listed emotes, rebuilt as exactly {id, emoji}, and places it near
 * the sender.
 *
 *   1. a listed emoji and a listed quick line relay once, in the sender's
 *      name, as exactly {id, emoji};
 *   2. anything else relays nothing: an unlisted emoji, text, a long string,
 *      no emoji, a number, an array, prototype names, a near miss;
 *   3. `emotes: false` relays none; state_sync says caps.emotes, and false
 *      under the switch;
 *   4. through the tick, in the Wheel: a phone near the sender hears it, a
 *      phone past EVENT_PLACE.R and one in today's town do not, the sender's
 *      own phone does, and a phone that muted the sender does not.
 */
import { GameRoom } from '../src/index.js';
import { EMOTE, emoteListed } from '../src/emotes.js';
import { EVENT_PLACE } from '../src/eventplace.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';

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
/* the emotes a phone was sent in ticks since `from` (an index into ws.sent) */
function emotesOf(p, from = 0) {
  const out = [];
  for (let i = from; i < p.ws.sent.length; i++) {
    const s = p.ws.sent[i];
    if (!s.startsWith('{"type":"tick"')) continue;
    const d = JSON.parse(s);
    if (Array.isArray(d.events)) for (const e of d.events) if (e && e.type === 'emote') out.push(e);
  }
  return out;
}
/* send one message from `p`; the emotes that went into the room's relay */
async function relay(room, p, msg) {
  const s = room.sessions.get(p.ws);
  s.relayTokens = room.RELAY_BURST; s.relayAt = Date.now();
  room.eventBuffer.length = 0;
  await room.webSocketMessage(p.ws, typeof msg === 'string' ? msg : JSON.stringify(msg));
  return room.eventBuffer.filter((e) => e && e.type === 'emote');
}

const ARRIVAL = { x: 21504, y: 21792 };

/* ── 1. a listed emote relays, as exactly {id, emoji} ──────────────────── */
{
  const { room } = await makeRoom();
  const A = await join(room, 'bp_em_a');
  const B = await join(room, 'bp_em_b');
  for (const emoji of ['👋', '6️⃣', '❤️', '🫶']) {
    const evs = await relay(room, A, { type: 'emote', payload: { id: B.id, emoji } });
    check('1a ' + emoji + ' relays once, in the sender\'s name (not the payload\'s), as {id, emoji}',
      evs.length === 1 && evs[0].from === A.id && JSON.stringify(evs[0].payload) === JSON.stringify({ id: A.id, emoji }), evs);
  }
  for (const emoji of ['GG', 'gg ez', 'Lets go', '67']) {
    const evs = await relay(room, A, { type: 'emote', payload: { emoji } });
    check('1b the quick line "' + emoji + '" relays once', evs.length === 1 && evs[0].payload.emoji === emoji && evs[0].payload.id === A.id, evs);
  }
  const extra = await relay(room, A, { type: 'emote', payload: { emoji: '🔥', text: 'free text over a head', name: 'Mayor Bro', x: 5, color: 'transparent' } });
  check('1c everything else in the payload is dropped: exactly id and emoji go out',
    extra.length === 1 && Object.keys(extra[0].payload).sort().join(',') === 'emoji,id', extra);
  check('1d every listed emote is relayed (the whole list)',
    [...EMOTE.EMOJI, ...EMOTE.LINES].every((e) => emoteListed(e)) && EMOTE.EMOJI.length === 30 && EMOTE.LINES.length === 12);

  /* ── 2. anything else relays nothing ── */
  const junk = ['🤡', 'x', 'hello', 'GG ', ' GG', 'gg', 'gG', '👋👋', '6', '6️', 'x'.repeat(5000), '', null, 7, true, ['👋'], { e: '👋' },
    '__proto__', 'constructor', 'toString', 'hasOwnProperty'];
  for (const emoji of junk) {
    const evs = await relay(room, A, { type: 'emote', payload: { emoji } });
    check('2a not relayed: ' + JSON.stringify(emoji).slice(0, 24), evs.length === 0, evs);
  }
  check('2b no payload at all: nothing', (await relay(room, A, { type: 'emote', emoji: '👋' })).length === 0);
  check('2c an array for a payload: nothing', (await relay(room, A, { type: 'emote', payload: ['👋'] })).length === 0);
  check('2d a "__proto__" payload key changes nothing and relays nothing',
    (await relay(room, A, '{"type":"emote","payload":{"__proto__":{"emoji":"👋"}}}')).length === 0 && ({}).emoji === undefined);
  check('2e the old shape {emote: "wave"} (no phone sends it) relays nothing',
    (await relay(room, A, { type: 'emote', payload: { emote: 'wave' } })).length === 0);
}

/* ── 3. the kill switch, and the cap ───────────────────────────────────── */
{
  const { room } = await makeRoom();
  const A = await join(room, 'bp_em_ks');
  const sync = A.ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === 'state_sync');
  check('3a state_sync advertises caps.emotes', !!(sync && sync.caps && sync.caps.emotes === true), sync && sync.caps && sync.caps.emotes);
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags || {}, { emotes: false });
  check('3b `emotes: false`: a listed emote relays nothing', (await relay(room, A, { type: 'emote', payload: { emoji: '👋' } })).length === 0);
  const B = await join(room, 'bp_em_ks2');
  const sync2 = B.ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === 'state_sync');
  check('3c ...and a join under it is told caps.emotes false (the picker stays shut)',
    !!(sync2 && sync2.caps && sync2.caps.emotes === false), sync2 && sync2.caps && sync2.caps.emotes);
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags, { emotes: true });
  check('3d back on: it relays again', (await relay(room, A, { type: 'emote', payload: { emoji: '👋' } })).length === 1);
}

/* ── 4. through the tick: the phones near the sender hear it ────────────── */
{
  const { room, tickFn } = await makeRoom();
  const A = await join(room, 'bp_em_t_a');   /* the sender */
  const B = await join(room, 'bp_em_t_b');   /* near: 1,500 px */
  const F = await join(room, 'bp_em_t_f');   /* far: past EVENT_PLACE.R */
  const M = await join(room, 'bp_em_t_m');   /* near, but has muted A */
  const T = await join(room, 'bp_em_t_t');   /* in today's town */
  const all = [A, B, F, M, T];
  for (const p of [A, B, F, M]) await move(room, p, ARRIVAL.x, ARRIVAL.y, WHEEL_ZONE);
  await move(room, T, 600, 600, 'town');
  place(room, A, ARRIVAL.x, ARRIVAL.y, WHEEL_ZONE);
  place(room, B, ARRIVAL.x + 1200, ARRIVAL.y + 900, WHEEL_ZONE);
  place(room, F, ARRIVAL.x + EVENT_PLACE.R + 400, ARRIVAL.y, WHEEL_ZONE);
  place(room, M, ARRIVAL.x - 300, ARRIVAL.y, WHEEL_ZONE);
  await room.webSocketMessage(M.ws, JSON.stringify({ type: 'chat_mute', target: A.id, on: true, name: 'A' }));
  check('4 setup: M has muted A', room._chatModMuted(M.id, A.id) === true);
  keepAlive(room, all);
  tickFn();
  const mark = all.map((p) => p.ws.sent.length);
  const s = room.sessions.get(A.ws);
  s.relayTokens = room.RELAY_BURST; s.relayAt = Date.now();
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'emote', payload: { id: A.id, emoji: '🎉' } }));
  keepAlive(room, all);
  tickFn();
  const got = all.map((p, i) => emotesOf(p, mark[i]).map((e) => e.payload.emoji + '<' + e.from));
  check('4a the sender\'s own phone is sent it', JSON.stringify(got[0]) === JSON.stringify(['🎉<' + A.id]), got[0]);
  check('4b a phone 1,500 px away hears it', JSON.stringify(got[1]) === JSON.stringify(['🎉<' + A.id]), got[1]);
  check('4c a phone past ' + EVENT_PLACE.R + ' px does not (placed, v2.3.3345)', got[2].length === 0, got[2]);
  check('4d a phone that muted the sender does not, though it is near', got[3].length === 0, got[3]);
  check('4e a phone in today\'s town does not', got[4].length === 0, got[4]);

  /* the placing's own kill switch puts it back room-wide (the zone's), as every placed event */
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags || {}, { eventplace: false });
  const mark2 = all.map((p) => p.ws.sent.length);
  s.relayTokens = room.RELAY_BURST; s.relayAt = Date.now();
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'emote', payload: { emoji: '👏' } }));
  keepAlive(room, all);
  tickFn();
  const got2 = all.map((p, i) => emotesOf(p, mark2[i]).length);
  check('4f `eventplace: false`: the far phone and the town phone hear it again; the muter still does not',
    JSON.stringify(got2) === JSON.stringify([1, 1, 1, 0, 1]), got2);
}

console.log(`\nemotes: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
