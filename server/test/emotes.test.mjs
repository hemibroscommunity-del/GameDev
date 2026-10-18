/* Emotes -- v2.3.3391 (server/src/emotes.js, docs/specs/emotes.md).
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
import { POSE } from '../src/poses.js';
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
/* each relay starts with a full allowance: the relay bucket, and the chat and
   emote allowance of #974's chat guard (`session.chatGuard`, chatguard.js),
   which a bare null leaves untouched on a worker without it (v2.3.3391) */
async function relay(room, p, msg) {
  const s = room.sessions.get(p.ws);
  s.relayTokens = room.RELAY_BURST; s.relayAt = Date.now(); s.chatGuard = null;
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
  s.relayTokens = room.RELAY_BURST; s.relayAt = Date.now(); s.chatGuard = null;
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'emote', payload: { id: A.id, emoji: '🎉' } }));
  keepAlive(room, all);
  tickFn();
  const got = all.map((p, i) => emotesOf(p, mark[i]).map((e) => e.payload.emoji + '<' + e.from));
  check('4a the sender\'s own phone is sent it', JSON.stringify(got[0]) === JSON.stringify(['🎉<' + A.id]), got[0]);
  check('4b a phone 1,500 px away hears it', JSON.stringify(got[1]) === JSON.stringify(['🎉<' + A.id]), got[1]);
  check('4c a phone past ' + EVENT_PLACE.R + ' px does not (placed, v2.3.3391)', got[2].length === 0, got[2]);
  check('4d a phone that muted the sender does not, though it is near', got[3].length === 0, got[3]);
  check('4e a phone in today\'s town does not', got[4].length === 0, got[4]);

  /* the placing's own kill switch puts it back room-wide (the zone's), as every placed event */
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags || {}, { eventplace: false });
  const mark2 = all.map((p) => p.ws.sent.length);
  s.relayTokens = room.RELAY_BURST; s.relayAt = Date.now(); s.chatGuard = null;
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'emote', payload: { emoji: '👏' } }));
  keepAlive(room, all);
  tickFn();
  const got2 = all.map((p, i) => emotesOf(p, mark2[i]).length);
  check('4f `eventplace: false`: the far phone and the town phone hear it again; the muter still does not',
    JSON.stringify(got2) === JSON.stringify([1, 1, 1, 0, 1]), got2);
}

/* ── 5. v2.3.3392: the moment moves ── */
{
  const { EMOTE_ONCE_IDS, EMOTE_HOLD_IDS } = await import('../../src/game/emoteMoves.js');
  /* POSE: imported at the top */
  check('5a the worker\'s moment moves are the phone\'s, in order', JSON.stringify(EMOTE.MOVES) === JSON.stringify(EMOTE_ONCE_IDS), { srv: EMOTE.MOVES, cli: EMOTE_ONCE_IDS });
  check('5b the worker\'s held poses are the phone\'s, in order', JSON.stringify(POSE.IDS) === JSON.stringify(EMOTE_HOLD_IDS), { srv: POSE.IDS, cli: EMOTE_HOLD_IDS });
  const { room } = await makeRoom();
  const A = await join(room, 'bp_em_mv_a');
  for (const move of EMOTE.MOVES) {
    const evs = await relay(room, A, { type: 'emote', payload: { id: 'bp_someone', move, text: 'x' } });
    check('5c the move "' + move + '" relays once, as exactly {id, move}',
      evs.length === 1 && JSON.stringify(evs[0].payload) === JSON.stringify({ id: A.id, move }), evs);
  }
  for (const move of ['sit', 'dance', 'WAVE', 'wave ', '__proto__', 7, '', { a: 1 }]) {
    check('5d not a moment move (' + JSON.stringify(move) + '): nothing', (await relay(room, A, { type: 'emote', payload: { move } })).length === 0);
  }
  check('5e a move with an emoji beside it is the move only', (() => true)() && (await relay(room, A, { type: 'emote', payload: { move: 'wave', emoji: '💀' } }))[0].payload.emoji === undefined);
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags || {}, { emotes: false });
  check('5f `emotes: false`: no move either', (await relay(room, A, { type: 'emote', payload: { move: 'wave' } })).length === 0);
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags, { emotes: true, emotemoves: false });
  check('5f2 `emotemoves: false`: no move', (await relay(room, A, { type: 'emote', payload: { move: 'wave' } })).length === 0);
  check('5f3 ...while a plain emote still relays', (await relay(room, A, { type: 'emote', payload: { emoji: '👋' } })).length === 1);
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags, { emotemoves: true });
  const sync = A.ws.sent.map((x) => JSON.parse(x)).find((m) => m.type === 'state_sync');
  check('5g state_sync advertises caps.emotemoves', !!(sync && sync.caps && sync.caps.emotemoves === true), sync && sync.caps && sync.caps.emotemoves);
}

/* ── 6. v2.3.3392: a held pose is state on the player ── */
{
  const { room, tickFn } = await makeRoom();
  const A = await join(room, 'bp_em_po_a');   /* the sitter */
  const B = await join(room, 'bp_em_po_b');   /* a phone near */
  for (const p of [A, B]) await move(room, p, ARRIVAL.x, ARRIVAL.y, WHEEL_ZONE);
  place(room, A, ARRIVAL.x, ARRIVAL.y, WHEEL_ZONE);
  place(room, B, ARRIVAL.x + 300, ARRIVAL.y, WHEEL_ZONE);
  keepAlive(room, [A, B]);
  tickFn();
  const poOf = (p, from) => {
    let last;
    for (let i = from; i < p.ws.sent.length; i++) {
      const sx = p.ws.sent[i];
      if (!sx.startsWith('{"type":"tick"')) continue;
      const d = JSON.parse(sx);
      if (d.players && d.players[A.id]) last = d.players[A.id];
    }
    return last;
  };
  const pose = async (id) => { const sess = room.sessions.get(A.ws); sess._poseAt = 0; await room.webSocketMessage(A.ws, JSON.stringify({ type: 'pose', id })); };
  let m = B.ws.sent.length;
  await pose('sit');
  keepAlive(room, [A, B]); tickFn();
  let e = poOf(B, m);
  check('6a a pose is on the poser\'s tick entry to a phone near: po "sit"', !!e && e.po === 'sit', e);
  check('6b ...kept on the player (ps.po)', room.playerState[A.id].po === 'sit');

  /* the point of it being state: a phone that comes near LATER is told */
  const C = await join(room, 'bp_em_po_c');
  await move(room, C, ARRIVAL.x, ARRIVAL.y, WHEEL_ZONE);
  place(room, C, ARRIVAL.x - 400, ARRIVAL.y, WHEEL_ZONE);
  keepAlive(room, [A, B, C]);
  const mc = C.ws.sent.length;
  /* the roster sends every near player whole about once a second */
  for (let i = 0; i < 60; i++) { keepAlive(room, [A, B, C]); tickFn(); }
  let seenByC;
  for (let i = mc; i < C.ws.sent.length; i++) {
    const sx = C.ws.sent[i];
    if (!sx.startsWith('{"type":"tick"')) continue;
    const d = JSON.parse(sx);
    if (d.players && d.players[A.id]) seenByC = d.players[A.id];
  }
  check('6c a phone that arrives LATER is told the sitter sits (TRAPS §176: a relay would have missed it)', !!seenByC && seenByC.po === 'sit', seenByC);

  /* standing still (the quiet phone's keepalive move) keeps the pose */
  m = B.ws.sent.length;
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'move', x: ARRIVAL.x, y: ARRIVAL.y, d: 'south', f: 'south', z: WHEEL_ZONE, vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
  check('6d a keepalive move where they stand keeps the pose', room.playerState[A.id].po === 'sit', room.playerState[A.id].po);
  /* a real step ends it, on the worker's own word */
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'move', x: ARRIVAL.x + 12, y: ARRIVAL.y, d: 'east', f: 'east', z: WHEEL_ZONE, vx: 300, vy: 0, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
  keepAlive(room, [A, B]); tickFn();
  e = poOf(B, m);
  check('6e a real step ends it: no po on the walker\'s entry', room.playerState[A.id].po == null && !!e && e.po === undefined, { po: room.playerState[A.id].po, e });

  await pose('bounce');
  check('6f a dance is a pose', room.playerState[A.id].po === 'bounce');
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'move', x: room.playerState[A.id].x, y: room.playerState[A.id].y, d: 'east', f: 'east', z: WHEEL_ZONE, vx: 0, vy: 0, dodging: false, blocking: true, ba: 0, dead: false, ex: null }));
  check('6g raising the shield ends it', room.playerState[A.id].po == null);
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'move', x: room.playerState[A.id].x, y: room.playerState[A.id].y, d: 'east', f: 'east', z: WHEEL_ZONE, vx: 0, vy: 0, dodging: false, blocking: false, ba: 0, dead: false, ex: null }));
  await pose('sleep');
  await pose(null);
  check('6h pose null stands up', room.playerState[A.id].po == null);
  for (const bad of ['dance', 'wave', 'SIT', '__proto__', 5, { id: 'sit' }]) {
    await pose(bad);
    check('6i not a pose (' + JSON.stringify(bad) + '): none held', room.playerState[A.id].po == null, room.playerState[A.id].po);
  }
  await pose('sit');
  const sess = room.sessions.get(A.ws);
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'pose', id: 'robot' }));
  check('6j two pose changes inside 300 ms: the second waits (it is not held)', room.playerState[A.id].po === 'sit', room.playerState[A.id].po);
  /* standing up is never spaced, and never holds back the next pose */
  sess._poseAt = Date.now() - POSE.MIN_GAP_MS - 5;
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'pose', id: null }));
  check('6j2 standing up is heard at once', room.playerState[A.id].po == null, room.playerState[A.id].po);
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'pose', id: 'robot' }));
  check('6j3 ...and a pose straight after it is held (standing up stamps no gap)', room.playerState[A.id].po === 'robot', room.playerState[A.id].po);
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'pose', id: null }));
  sess._poseAt = 0;
  room.playerState[A.id].dead = true;
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'pose', id: 'robot' }));
  check('6k the dead strike no pose (and stand up)', room.playerState[A.id].po == null, room.playerState[A.id].po);
  room.playerState[A.id].dead = false;
  sess._poseAt = 0;
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags || {}, { emotes: false });
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'pose', id: 'sit' }));
  check('6l `emotes: false`: no pose', room.playerState[A.id].po == null);
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags, { emotes: true, emotemoves: false });
  sess._poseAt = 0;
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'pose', id: 'sit' }));
  check('6l2 `emotemoves: false`: no pose either', room.playerState[A.id].po == null);
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags, { emotemoves: true });
  sess._poseAt = 0;
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'pose', id: 'sit' }));
  m = B.ws.sent.length;
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'move', x: ARRIVAL.x + 500, y: ARRIVAL.y, d: 'east', f: 'east', z: 'town', vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
  check('6m a zone change ends it', room.playerState[A.id].po == null, room.playerState[A.id].po);
}

/* ── 7. v2.3.3392: the moves' math (src/game/emoteMoves.js, no imports) ── */
{
  const M = await import('../../src/game/emoteMoves.js');
  const fin = (f) => !!f && ['hop', 'dx', 'rot', 'kx', 'ky'].every((k) => Number.isFinite(f[k]));
  const restish = (f) => !!f && Math.abs(f.hop) < 0.6 && Math.abs(f.dx) < 0.6 && Math.abs(f.rot) < 0.01 && Math.abs(f.kx - 1) < 0.01 && Math.abs(f.ky - 1) < 0.01;
  for (const id of M.EMOTE_ONCE_IDS) {
    const ms = M.EMOTE_MOVES[id].ms;
    let ok = true;
    for (let t = 0; t < ms; t += 7) if (!fin(M.onceFrame(id, t))) ok = false;
    check('7a ' + id + ': every frame is a number, it starts and ends at rest, and is over at ' + ms + ' ms',
      ok && restish(M.onceFrame(id, 0)) && restish(M.onceFrame(id, ms - 1)) && M.onceFrame(id, ms) === null,
      { start: M.onceFrame(id, 0), end: M.onceFrame(id, ms - 1) });
  }
  for (const id of M.EMOTE_HOLD_IDS) {
    let ok = true, tiltOk = true;
    const t0 = 1700000000000;
    for (let t = t0; t < t0 + 20000; t += 13) {
      const f = M.settleFrame(M.holdFrame(id, t, t0));
      if (!fin(f)) ok = false;
      if (Math.abs(f.rot) > 1e-6 && Math.abs(Math.abs(f.kx) - f.ky) > 1e-9) tiltOk = false;
    }
    check('7b ' + id + ': 20 s of frames, all numbers, and a tilt never squashes (|kx| = ky)', ok && tiltOk, id);
  }
  /* a dance keeps the wall's beat: two phones that saw it start at different
     times draw the same frame once both have settled in */
  for (const id of ['bounce', 'robot', 'sprinkler']) {
    const now = 1700000012345;
    check('7c ' + id + ' is the same frame on two phones that saw it start 0.8 s apart',
      JSON.stringify(M.holdFrame(id, now, now - 3000)) === JSON.stringify(M.holdFrame(id, now, now - 2200)));
  }
  /* feet planted, the HUD held still: 20,000 random figures and frames */
  const mul = (A, B) => ({ a: A.a * B.a + A.c * B.b, b: A.b * B.a + A.d * B.b, c: A.a * B.c + A.c * B.d, d: A.b * B.c + A.d * B.d, tx: A.a * B.tx + A.c * B.ty + A.tx, ty: A.b * B.tx + A.d * B.ty + A.ty });
  const T = (x, y, r, sx, sy) => ({ a: sx * Math.cos(r), b: sx * Math.sin(r), c: -sy * Math.sin(r), d: sy * Math.cos(r), tx: x, ty: y });
  let feetErr = 0, hudErr = 0, groundErr = 0;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 20000; i++) {
    const b = { x: rnd() * 1e5, y: rnd() * 1e5, sx: 0.4 + rnd(), sy: 0.4 + rnd() };
    const F = 30 + rnd() * 30;
    const f = M.settleFrame({ hop: rnd() * 30 - 5, dx: rnd() * 8 - 4, rot: (rnd() - 0.5) * 4, kx: (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd()), ky: 0.5 + rnd() });
    const Hc = F + 60 + rnd() * 40;
    const r = M.placeEmote(b, f, F, Hc);
    const P2 = T(r.x, r.y, r.rot, r.sx, r.sy);
    feetErr = Math.max(feetErr, Math.hypot(P2.c * F + P2.tx - (b.x + f.dx), P2.d * F + P2.ty - (b.y + b.sy * F - f.hop)));
    groundErr = Math.max(groundErr, Math.abs(r.y + F * r.sy - r.feetFix - (b.y + b.sy * F)), Math.abs(r.x - r.xFix - (b.x + f.dx)));
    const u = { x: rnd() * 40 - 20, y: rnd() * 80 - 60, sx: 0.7 + rnd() * 0.6, sy: 0.7 + rnd() * 0.6 };
    /* the HUD as it was, only `hudDrop` lower */
    const W0 = mul(T(b.x, b.y + r.hudDrop, 0, b.sx, b.sy), T(u.x, u.y, 0, u.sx, u.sy)), W1 = mul(P2, M.holdMatrix(r.q, u));
    for (const k of ['a', 'b', 'c', 'd', 'tx', 'ty']) hudErr = Math.max(hudErr, Math.abs(W0[k] - W1[k]));
    if (!(r.hudDrop >= 0) || (f.hop > 0 && f.rot === 0 && f.ky >= 1 && r.hudDrop !== 0)) hudErr = Infinity;
  }
  check('7d the boots stay where they were (moved only by dx and the hop)', feetErr < 1e-6, feetErr);
  check('7e the figure\'s feet read back as the ground under it (figureFeetY/X)', groundErr < 1e-6, groundErr);
  check('7f the name plate and bars are exactly as they were, untilted, only lower (never higher)', hudErr < 1e-6, hudErr);
  /* how far the plate comes down: a sitter's head is 30% lower, a sleeper lies
     at about 0.4 of his height; a wave, a dance's lean, a hop: not at all */
  const drop = (id, t) => M.placeEmote({ x: 0, y: 0, sx: 1, sy: 1 }, M.settleFrame(t == null ? M.holdFrame(id, 1e6, 1) : M.onceFrame(id, t)), 40, 100).hudDrop;
  check('7f2 the plate comes down 30 px of 100 with a sitter, 60 with a sleeper or a flop, none with a wave or a cheer',
    Math.abs(drop('sit') - 30) < 0.5 && Math.abs(drop('sleep') - 60) < 3.5 && Math.abs(drop('flop') - 60) < 0.5
      && drop('wave', 300) === 0 && drop('cheer', 270) === 0,
    { sit: drop('sit'), sleep: drop('sleep'), flop: drop('flop'), wave: drop('wave', 300), cheer: drop('cheer', 270) });
  /* the chat's commands */
  const sl = { '/wave': 'wave', '/hi': 'wave', '/dance': 'bounce', ' /SIT ': 'sit', '/nap': 'sleep', '/robot': 'robot',
    '/wave hi': null, 'wave': null, '/': null, '/__proto__': null, '/constructor': null, '/p hi': null, '/w bob hi': null };
  for (const [txt, want] of Object.entries(sl)) {
    check('7g slashMove(' + JSON.stringify(txt) + ') is ' + JSON.stringify(want), M.slashMove(txt) === want, M.slashMove(txt));
  }
  check('7h moveKind knows only its twelve', M.moveKind('wave') === 'once' && M.moveKind('sit') === 'hold'
    && M.moveKind('__proto__') === null && M.moveKind('toString') === null && M.moveKind(5) === null && M.EMOTE_MOVE_IDS.length === 12);
  check('7i a held pose wins over a moment, and nothing is ZERO',
    JSON.stringify(M.emoteFrameFor({ id: 'wave', at: 0 }, 'sit', 1000, 5000)) === JSON.stringify(M.holdFrame('sit', 5000, 1000))
    && M.emoteFrameFor(null, null, 0, 5) === M.EMOTE_ZERO);
}

console.log(`\nemotes: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
