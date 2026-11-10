/* A mute tapped while the connection is down is kept -- v2.3.4402 (the
 * state-machine sweep, 2026-11-03: VA "chat mute during reconnect"; PLAN
 * cause 5; review R3 item 18).
 *
 * The phone's channel dropped a send while the socket was not OPEN and said
 * nothing; setMuted had already written "Muted" locally, and the rejoin's
 * chat_mute_list replaced the local list with the worker's, which had never
 * heard of it.  The muted player's chat came back.
 *
 * This plays the REAL src/game/chatMute.js against a REAL GameRoom: the
 * phone's channel is a stand-in that, like wsClient.js's channelShim,
 * returns false when the socket is down and true when it takes a message.
 *   1. connected: a mute is sent once and holds (unchanged);
 *   2. a mute while down: nothing sent; on the rejoin the worker is told,
 *      once, and the mute holds on the phone and on the worker;
 *   3. an unmute while down: the same;
 *   4. a mute and an unmute of the same player in one gap: the worker
 *      already agrees, so nothing is sent;
 *   5. no message is ever sent twice (a later rejoin sends nothing);
 *   6. the shim returns false on its dropped path and true on the mute's.
 */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

const ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => { ls.set(k, String(v)); },
  removeItem: (k) => { ls.delete(k); },
};
ls.set('bt_mutesMigrated', '1');   /* no legacy upload in play */
const { setMuted, readMutedIds, applyServerMuteList } = await import('../../src/game/chatMute.js');

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), protocolVersion: 2 });

const room = new GameRoom(makeState(), mockEnv);
const ME = 'bp_mk_me', X = 'bp_mk_x', Y = 'bp_mk_y', Z = 'bp_mk_z';

/* The phone: a socket to the room, and a channel that answers like the shim. */
const phone = { ws: null, open: false, sentMutes: [], outbox: [] };
const S = {
  _serverCaps: { chatMute: true },   /* survives a blip, as on a real phone */
  channel: {
    send(msg) {
      if (!phone.open) return false;
      if (msg.type === 'broadcast' && msg.event === 'chat_mute') phone.sentMutes.push(msg.payload);
      phone.outbox.push({ type: msg.event, payload: msg.payload });
      return true;
    },
  },
};
/* the worker's frames to the phone go through the real handler; the phone's
   frames to the worker go in order, as a socket carries them */
async function pump() {
  for (let round = 0; round < 10; round++) {
    const inbound = phone.ws.sent.splice(0);
    for (const m of inbound) if (m.type === 'chat_mute_list') applyServerMuteList(m.payload, S);
    const outbound = phone.outbox.splice(0);
    for (const o of outbound) await room.webSocketMessage(phone.ws, JSON.stringify(o));
    if (!inbound.length && !outbound.length) return;
  }
}
async function connect() {
  const ws = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id: ME, name: 'Me', phrase: 'p-' + ME, ws: [1, 5],
    protocolVersion: 2, data: { x: -90000, y: -90000, z: 'town' },
  }));
  phone.ws = ws; phone.open = true;
  await pump();
}
async function drop() {
  phone.open = false;
  const old = phone.ws;
  await room.webSocketClose(old);
}
const serverMuted = (id) => room._chatModMuted(ME, id) === true;
const localMuted = (id) => readMutedIds().indexOf(id) >= 0;

await connect();

/* ── 1. connected: unchanged ── */
{
  setMuted(S, X, true, 'Ex');
  await pump();
  check('1a a mute while connected is sent once', phone.sentMutes.length === 1 && phone.sentMutes[0].target === X, phone.sentMutes);
  check('1b ...and holds on the worker and the phone', serverMuted(X) && localMuted(X), readMutedIds());
}

/* ── 2. a mute while down ── */
{
  await drop();
  phone.sentMutes.length = 0;
  setMuted(S, Y, true, 'Why');
  check('2a a mute while down sends nothing (the socket cannot carry it)', phone.sentMutes.length === 0, phone.sentMutes);
  check('2b ...the card shows it muted (the local prediction)', localMuted(Y));
  await connect();
  check('2c on the rejoin the worker is told', phone.sentMutes.length === 1 && phone.sentMutes[0].target === Y && phone.sentMutes[0].on === true, phone.sentMutes);
  check('2d ...and the mute holds on the worker (it used to be lost)', serverMuted(Y));
  check('2e ...and on the phone after the worker\'s echo', localMuted(Y) && localMuted(X), readMutedIds());
}

/* ── 3. an unmute while down ── */
{
  await drop();
  phone.sentMutes.length = 0;
  setMuted(S, X, false);
  check('3a an unmute while down sends nothing', phone.sentMutes.length === 0, phone.sentMutes);
  await connect();
  check('3b on the rejoin the worker is told, once', phone.sentMutes.length === 1 && phone.sentMutes[0].target === X && phone.sentMutes[0].on === false, phone.sentMutes);
  check('3c ...and the unmute holds on the worker and the phone', !serverMuted(X) && !localMuted(X) && localMuted(Y), readMutedIds());
}

/* ── 4. a mute and an unmute in one gap ── */
{
  await drop();
  phone.sentMutes.length = 0;
  setMuted(S, Z, true, 'Zed');
  setMuted(S, Z, false);
  await connect();
  check('4a a mute undone in the same gap sends nothing (the worker already agrees)', phone.sentMutes.length === 0, phone.sentMutes);
  check('4b ...and Z is not muted anywhere', !serverMuted(Z) && !localMuted(Z), readMutedIds());
}

/* ── 5. nothing twice ── */
{
  await drop();
  phone.sentMutes.length = 0;
  await connect();
  check('5a a later rejoin sends nothing again', phone.sentMutes.length === 0, phone.sentMutes);
  check('5b ...and the list is what it was', localMuted(Y) && !localMuted(X) && !localMuted(Z) && serverMuted(Y), readMutedIds());
  setMuted(S, Y, true, 'Why');   /* tapped again while connected */
  await pump();
  check('5c a tap while connected still goes (one message, no kept copy behind it)', phone.sentMutes.length === 1, phone.sentMutes);
  await drop(); phone.sentMutes.length = 0; await connect();
  check('5d ...and is not sent again on the next rejoin', phone.sentMutes.length === 0, phone.sentMutes);
}

/* ── 6. the real channel answers ── */
{
  const ws = readFileSync(new URL('../../src/networking/wsClient.js', import.meta.url), 'utf8');
  const i = ws.indexOf('var channelShim = {');
  const head = ws.slice(i, i + 1400);
  check('6a the shim returns false when the socket is not OPEN', /readyState !== WebSocket\.OPEN\)[\s\S]*?return false;\s*\}/.test(head), head.slice(0, 200));
  const j = ws.indexOf("if (msg.type === 'broadcast' && msg.event) {", i);
  const k = ws.indexOf('track: function track', j);
  check('6b ...and true once a broadcast (the mute\'s path) is on its way', j > 0 && k > j && /startBatchTimer\(\);\s*\}\s*return true;/.test(ws.slice(j, k)));
  const cm = readFileSync(new URL('../../src/game/chatMute.js', import.meta.url), 'utf8');
  check('6c chatMute counts only a true answer as sent', /\}\) === true;/.test(cm));
}

if (room.tickInterval) clearInterval(room.tickInterval);
delete globalThis.localStorage;
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
process.exit(0);
