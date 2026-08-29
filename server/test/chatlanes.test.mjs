/* ═══ CHAT LANES — @area and @user (v2.3.2134) ═══
 *
 * Owner, from the demo feedback: per-channel chat, @user / @area / @all.
 * @all already existed (the room-wide default relay) and is untouched; these
 * are the two lanes chatlanes.js adds.
 *
 * WHAT THIS SUITE HOLDS DOWN:
 *   1. @area reaches everyone in the SAME zone and nobody outside it -- the
 *      whole point of the lane, and the thing the room relay deliberately
 *      does not do.
 *   2. A whisper reaches exactly one player, and NOT the room.  Asserted
 *      against every other socket, because "delivered to the target" would
 *      still pass if it were also shouted at everybody.
 *   3. The sender is stamped by the SERVER.  A forged id/name in the payload
 *      is ignored -- the room relay's own note records that a client can
 *      forge payload.id/name there, and these lanes must not inherit it.
 *   4. The payload is REBUILT, not filtered: a field nobody allowed does not
 *      ride along (rule 16 / TRAPS #13).
 *   5. Text is clamped and control-stripped, clamp BEFORE trim so padding
 *      cannot smuggle a long line.
 *   6. An unknown or AMBIGUOUS whisper target is refused rather than guessed
 *      at -- names are not unique here, and a private line delivered to the
 *      wrong person is worse than one not delivered.
 *   7. The rate limit exists.  An explicit router case never reaches the
 *      default branch's relay token bucket -- exactly the hole v2.3.1970
 *      found in party_invite -- so these lanes carry their own.
 *   8. Mute is honoured per-recipient, and a muted WHISPER is silent to the
 *      sender (telling them would confirm to a harasser that they got
 *      through).
 *   9. All three emitted types are PRIVILEGED, so a client cannot inject them.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { CHAT_LANES } from '../src/chatlanes.js';

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
    _store: store,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
const ofType = (ws, type) => ws.sent.filter((m) => m.type === type);
const lastOf = (ws, type) => { const r = ofType(ws, type); return r[r.length - 1] && r[r.length - 1].payload; };
const types = (ws) => ws.sent.map((m) => m.type);

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), protocolVersion: 2 });
const P = (n) => 'bp_cl_' + n;
async function joinTo(rm, ws, id, name, zone) {
  rm.sessions.set(ws, baseSession());
  await rm.webSocketMessage(ws, JSON.stringify({
    type: 'join', id, name, phrase: 'p-' + id,
    protocolVersion: 2, data: { x: -90000, y: -90000, z: zone || 'town' },
  }));
}
const cmd = (ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} }));
const clear = (...wss) => { for (const w of wss) w.sent.length = 0; };

/* Four players: three in town, one out in verdant, and a DELIBERATE name
   clash so the ambiguity branch has something real to refuse. */
const wA = fakeWs('A'), wB = fakeWs('B'), wC = fakeWs('C'), wD = fakeWs('D');
await joinTo(room, wA, P('a'), 'Alpha', 'town');
await joinTo(room, wB, P('b'), 'Bravo', 'town');
await joinTo(room, wC, P('c'), 'Charlie', 'verdant');
await joinTo(room, wD, P('d'), 'Bravo', 'town');
room.playerState[P('c')].z = 'verdant';
check('three in town, one in verdant (guard)',
  room.playerState[P('a')].z === 'town' && room.playerState[P('c')].z === 'verdant',
  { a: room.playerState[P('a')].z, c: room.playerState[P('c')].z });

/* -- 1. @area is zone-scoped, which is the whole feature -- */
clear(wA, wB, wC, wD);
await cmd(wA, 'area_chat', { text: 'anyone near the fountain?' });
check('an area line reaches another player in the same zone',
  (lastOf(wB, 'area_chat') || {}).text === 'anyone near the fountain?', lastOf(wB, 'area_chat'));
check('...and does NOT reach a player in another zone',
  ofType(wC, 'area_chat').length === 0, types(wC));
check('...and is never rebroadcast to the room as plain chat',
  ofType(wB, 'chat').length === 0 && ofType(wC, 'chat').length === 0);

/* -- 2. the sender is the SERVER idea of who sent it -- */
const seen = lastOf(wB, 'area_chat');
check('the sender is stamped from the session',
  seen && seen.from === P('a') && seen.fromName === 'Alpha', seen);
clear(wA, wB, wC, wD);
await cmd(wA, 'area_chat', { text: 'still me', from: 'bp_someone_else', fromName: 'Mayor Bro', id: 'x' });
const forged = lastOf(wB, 'area_chat');
check('...so a forged from/fromName in the payload is ignored',
  forged && forged.from === P('a') && forged.fromName === 'Alpha', forged);
check('...and an unallowed field does not ride along (payload is rebuilt)',
  forged && forged.id === undefined, forged);

/* -- 3. clamping, in the order that matters -- */
clear(wA, wB);
await cmd(wA, 'area_chat', { text: 'x'.repeat(CHAT_LANES.TEXT_MAX + 500) });
check('an over-long area line is clamped',
  ((lastOf(wB, 'area_chat') || {}).text || '').length <= CHAT_LANES.TEXT_MAX,
  ((lastOf(wB, 'area_chat') || {}).text || '').length);
clear(wA, wB);
await cmd(wA, 'area_chat', { text: 'hel\x07lo there' });
check('...and control characters are stripped',
  !/[\x00-\x1f\x7f]/.test((lastOf(wB, 'area_chat') || {}).text || ''),
  (lastOf(wB, 'area_chat') || {}).text);
clear(wA, wB);
await cmd(wA, 'area_chat', { text: '   ' });
check('a whitespace-only line is not relayed at all',
  ofType(wB, 'area_chat').length === 0);

/* -- 4. the whisper goes to ONE person -- */
clear(wA, wB, wC, wD);
await cmd(wC, 'whisper', { to: 'Alpha', text: 'meet me in verdant' });
check('a whisper reaches its target',
  (lastOf(wA, 'whisper') || {}).text === 'meet me in verdant', lastOf(wA, 'whisper'));
check('...stamped with the real sender',
  (lastOf(wA, 'whisper') || {}).from === P('c'), lastOf(wA, 'whisper'));
check('...and NOBODY else hears it, in any lane',
  ofType(wB, 'whisper').length === 0 && ofType(wD, 'whisper').length === 0
    && ofType(wB, 'chat').length === 0 && ofType(wB, 'area_chat').length === 0,
  { b: types(wB), d: types(wD) });
check('...and it crossed a zone boundary, unlike area chat',
  !!lastOf(wA, 'whisper'));

/* -- 5. a target that cannot be resolved is refused, never guessed -- */
clear(wA, wB, wC, wD);
await cmd(wA, 'whisper', { to: 'Nobody', text: 'hello?' });
check('whispering a name nobody has is refused, to the sender only',
  (lastOf(wA, 'whisper_error') || {}).reason === 'no-such-player'
    && ofType(wB, 'whisper').length === 0, lastOf(wA, 'whisper_error'));
clear(wA, wB, wC, wD);
await cmd(wA, 'whisper', { to: 'Bravo', text: 'which of you?' });
check('an AMBIGUOUS name is refused rather than delivered to a guess',
  (lastOf(wA, 'whisper_error') || {}).reason === 'ambiguous', lastOf(wA, 'whisper_error'));
check('...and neither namesake receives it',
  ofType(wB, 'whisper').length === 0 && ofType(wD, 'whisper').length === 0);

/* -- 6. the rate limit the default branch would have given us --
   ON A FRESH ROOM, because the bucket is real: the assertions above already
   spent most of wA's, and refill is one token per REFILL_MS, so measuring the
   burst here would have measured what was left over.  The first cut did
   exactly that and read 0 relayed -- the limiter working, invisibly. */
const rl = new GameRoom(makeState(), mockEnv);
const rA = fakeWs('rA'), rB = fakeWs('rB');
await joinTo(rl, rA, P('r1'), 'Spammer', 'town');
await joinTo(rl, rB, P('r2'), 'Earshot', 'town');
clear(rA, rB);
for (let i = 0; i < CHAT_LANES.BURST + 6; i++) {
  await rl.webSocketMessage(rA, JSON.stringify({ type: 'area_chat', payload: { text: 'spam ' + i } }));
}
const relayed = ofType(rB, 'area_chat').length;
check('the lane carries its own rate limit (an explicit case never sees the default bucket)',
  relayed === CHAT_LANES.BURST, { relayed, burst: CHAT_LANES.BURST });
clear(rB);
await rl.webSocketMessage(rA, JSON.stringify({ type: 'whisper', payload: { to: 'Earshot', text: 'still spent' } }));
check('...and the bucket is SHARED, so switching lanes does not buy more',
  ofType(rB, 'whisper').length === 0, { b: types(rB) });

/* -- 7. mute, per recipient -- */
const rm2 = new GameRoom(makeState(), mockEnv);
const m1 = fakeWs('m1'), m2 = fakeWs('m2'), m3 = fakeWs('m3');
await joinTo(rm2, m1, P('m1'), 'Muter', 'town');
await joinTo(rm2, m2, P('m2'), 'Loudmouth', 'town');
await joinTo(rm2, m3, P('m3'), 'Bystander', 'town');
await rm2.webSocketMessage(m1, JSON.stringify({ type: 'chat_mute', payload: { target: P('m2'), on: true } }));
clear(m1, m2, m3);
await rm2.webSocketMessage(m2, JSON.stringify({ type: 'area_chat', payload: { text: 'shouting' } }));
check('a muted speaker area line is not sent to the muter',
  ofType(m1, 'area_chat').length === 0, types(m1));
check('...and still reaches everyone else',
  ofType(m3, 'area_chat').length === 1, types(m3));
clear(m1, m2);
await rm2.webSocketMessage(m2, JSON.stringify({ type: 'whisper', payload: { to: 'Muter', text: 'let me in' } }));
check('a muted whisper is dropped', ofType(m1, 'whisper').length === 0, types(m1));
check('...and the sender is NOT told, so a harasser cannot confirm a hit',
  ofType(m2, 'whisper_error').length === 0, types(m2));

/* -- 8. forgery (rule 13) -- */
check('area_chat is privileged, so a client cannot inject it', PRIVILEGED_EVENTS.has('area_chat'));
check('whisper is privileged too', PRIVILEGED_EVENTS.has('whisper'));
check('...as is whisper_error', PRIVILEGED_EVENTS.has('whisper_error'));

console.log(failures === 0 ? '\nchatlanes: all passed' : '\nchatlanes: ' + failures + ' FAILED');
process.exit(failures === 0 ? 0 : 1);
