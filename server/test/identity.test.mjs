/* Identity + PvP-consent test (v2.3.1116, PR1 of the heavy-systems plan).
 * Runs the GameRoom against a STATEFUL storage mock (unlike the other
 * suites' always-empty mock -- auth records must persist across joins)
 * and checks:
 *   1. First join with a phrase registers an auth:<id> record and is
 *      accepted (state_sync sent).
 *   2. Wrong phrase on a registered id -> join_rejected, and the live
 *      session is NOT evicted (the gate runs before the evict loop).
 *   3. No phrase on a registered id -> join_rejected (hijack via bare
 *      id replay is dead).
 *   4. Correct phrase on reconnect -> accepted, old session evicted
 *      (the v2.3.702 evict still works, now post-auth).
 *   5. Legacy client (no phrase, unregistered id) -> accepted.
 *   6. Brute-force lockout: 5 bad phrases lock the id; even the correct
 *      phrase bounces during the window; works after expiry.
 *   7. PvP consent gate: town attack -> no hit; duel_request+duel_accept
 *      handshake -> hit lands; unilateral (forged) duel_accept -> no hit;
 *      lawless wilderness zone -> hit lands with no consent.
 *   8. Death clears the consent pair.
 */
import { GameRoom } from '../src/index.js';

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
    _store: store,
  };
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};

function fakeWs(label) {
  return { label, sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(code, reason) { this.closed = { code, reason }; } };
}
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });

async function join(ws, id, phrase, z = 'town', name = 'T') {
  room.sessions.set(ws, baseSession());
  const msg = { type: 'join', id, name, data: { x: 100, y: 100, z } };
  if (phrase !== undefined) msg.phrase = phrase;
  await room.webSocketMessage(ws, JSON.stringify(msg));
}

// ── 1. registration ──
const wsA = fakeWs('alice-1');
await join(wsA, 'bp_alice', 'alpha-blaze-coral-drift-7');
check('first join with phrase accepted', msgsOfType(wsA, 'state_sync').length === 1);
const authRec = state._store.get('auth:bp_alice');
check('auth record stamped in own storage key', !!authRec && typeof authRec.pfHash === 'string' && authRec.pfHash.length === 64, authRec);

// ── 2. wrong phrase: rejected, live session untouched ──
const wsA2 = fakeWs('alice-imposter');
await join(wsA2, 'bp_alice', 'wrong-wrong-wrong-wrong-0');
check('wrong phrase gets join_rejected', msgsOfType(wsA2, 'join_rejected').length === 1 && wsA2.closed?.code === 4003, wsA2.sent);
check('rejected join does not evict the live session', room.sessions.has(wsA) && !wsA.closed);
check('rejected join leaves playerState intact', !!room.playerState['bp_alice']);

// ── 3. bare-id replay (no phrase) on a registered id ──
const wsA3 = fakeWs('alice-replayer');
await join(wsA3, 'bp_alice', undefined);
check('no-phrase join on registered id rejected', msgsOfType(wsA3, 'join_rejected').length === 1);

// ── 4. correct phrase on reconnect: accepted + old session evicted ──
const wsA4 = fakeWs('alice-2');
await join(wsA4, 'bp_alice', 'alpha-blaze-coral-drift-7');
check('reconnect with correct phrase accepted', msgsOfType(wsA4, 'state_sync').length === 1);
check('reconnect evicts the superseded session', !room.sessions.has(wsA) && wsA.closed?.reason === 'superseded by reconnect');

// ── 5. legacy client: no phrase, unregistered id ──
const wsL = fakeWs('legacy');
await join(wsL, 'r4nd0m1d', undefined);
check('legacy no-phrase join on fresh id accepted', msgsOfType(wsL, 'state_sync').length === 1);
check('legacy join stamps no auth record', !state._store.has('auth:r4nd0m1d'));

// ── 5b. v2.3.1202: prototype-pollution join-id gate ──
// session.id is client-chosen and keys plain-object maps (playerState,
// stateHistory, extractions, dmgByPlayer).  The three magic
// own-property names must be rejected via the join_rejected/'auth'
// path BEFORE the auth gate, so a magic id never mints an auth:
// storage record or a playerState key.  Legacy phraseless joins on
// other ids stay allowed (section 5 above; re-checked after).
for (const magic of ['__proto__', 'constructor', 'prototype']) {
  const wsM = fakeWs('magic-' + magic);
  await join(wsM, magic, 'evil-evil-evil-evil-1');
  const rej = msgsOfType(wsM, 'join_rejected');
  check(`magic id '${magic}' join rejected with reason auth`,
    rej.length === 1 && rej[0].reason === 'auth' && wsM.closed?.code === 4003, wsM.sent);
  check(`magic id '${magic}' creates no auth record (gate runs BEFORE the auth stamp)`,
    !state._store.has('auth:' + magic));
  check(`magic id '${magic}' creates no playerState key`,
    !Object.keys(room.playerState).includes(magic));
  check(`magic id '${magic}' session removed`, !room.sessions.has(wsM));
}
check('magic-id joins did not pollute Object.prototype', ({}).x === undefined && Object.keys({}).length === 0);
// A normal join still works after the gate (the gate must not
// over-match ordinary ids -- including a phraseless legacy one).
{
  const wsN = fakeWs('normal-after-magic');
  await join(wsN, 'bp_gatecheck', 'quiet-river-stone-fox-9');
  check('normal join still accepted after magic-id rejections', msgsOfType(wsN, 'state_sync').length === 1);
  check('normal join still creates playerState', !!room.playerState['bp_gatecheck']);
}

// ── 6. brute-force lockout ──
const wsB = fakeWs('bob');
await join(wsB, 'bp_bob', 'karma-lunar-mango-nexus-3');
for (let i = 0; i < 5; i++) {
  await join(fakeWs('bob-bruteforce-' + i), 'bp_bob', 'guess-' + i);
}
const wsB2 = fakeWs('bob-locked');
await join(wsB2, 'bp_bob', 'karma-lunar-mango-nexus-3');
check('correct phrase bounces during lockout window', msgsOfType(wsB2, 'join_rejected').length === 1);
room._authFails.set('bp_bob', { count: 0, until: 0 }); // simulate expiry
const wsB3 = fakeWs('bob-after-lockout');
await join(wsB3, 'bp_bob', 'karma-lunar-mango-nexus-3');
check('correct phrase accepted after lockout expiry', msgsOfType(wsB3, 'state_sync').length === 1);

// ── 7. PvP consent gate ──
// alice (wsA4) and bob (wsB3) are both in town at (100,100).  Aim east
// with a wide arc and generous range so geometry never masks the gate.
const atk = { range: 200, arc: Math.PI, angle: 0, dmgBase: 10, critChance: 0 };
room.playerState['bp_alice'].x = 100; room.playerState['bp_alice'].y = 100;
room.playerState['bp_bob'].x = 140; room.playerState['bp_bob'].y = 100;

room.eventBuffer.length = 0;
await room.webSocketMessage(wsA4, JSON.stringify({ type: 'player_attack', payload: { ...atk } }));
check('town attack without consent: no hit event', room.eventBuffer.filter((e) => e.type === 'pvp_hit').length === 0, room.eventBuffer);
check('town attack without consent: no damage', room.playerState['bp_bob'].hp === room.playerState['bp_bob'].maxHp, room.playerState['bp_bob'].hp);

// Forged unilateral accept: alice "accepts" a duel bob never requested.
room.eventBuffer.length = 0;
await room.webSocketMessage(wsA4, JSON.stringify({ type: 'duel_accept', payload: { target: 'bp_bob' } }));
await room.webSocketMessage(wsA4, JSON.stringify({ type: 'player_attack', payload: { ...atk } }));
check('forged duel_accept consents to nothing', room.eventBuffer.filter((e) => e.type === 'pvp_hit').length === 0);

// Real handshake: bob requests, alice accepts -> alice may hit bob.
room.eventBuffer.length = 0;
await room.webSocketMessage(wsB3, JSON.stringify({ type: 'duel_request', payload: { target: 'bp_alice' } }));
await room.webSocketMessage(wsA4, JSON.stringify({ type: 'duel_accept', payload: { target: 'bp_bob' } }));
await room.webSocketMessage(wsA4, JSON.stringify({ type: 'player_attack', payload: { ...atk } }));
const duelHits = room.eventBuffer.filter((e) => e.type === 'pvp_hit');
check('duel handshake enables town PvP for the pair', duelHits.length === 1 && duelHits[0].payload.target === 'bp_bob', room.eventBuffer.map((e) => e.type));
check('duel hit applies damage', room.playerState['bp_bob'].hp < room.playerState['bp_bob'].maxHp, room.playerState['bp_bob'].hp);

// Lawless wilderness: no consent needed.  carol & dave, fresh pair.
const wsC = fakeWs('carol'); const wsD = fakeWs('dave');
await join(wsC, 'bp_carol', 'echo-flare-ghost-haze-1', 'meadow');
await join(wsD, 'bp_dave', 'orbit-prism-quest-ridge-2', 'meadow');
room.playerState['bp_carol'].x = -100000; room.playerState['bp_carol'].y = -100000;
room.playerState['bp_dave'].x = -99960; room.playerState['bp_dave'].y = -100000;
room.eventBuffer.length = 0;
await room.webSocketMessage(wsC, JSON.stringify({ type: 'player_attack', payload: { ...atk } }));
check('lawless zone allows PvP without consent', room.eventBuffer.filter((e) => e.type === 'pvp_hit' && e.payload.target === 'bp_dave').length === 1, room.eventBuffer.map((e) => e.type));

// ── 8. death clears consent ──
room.playerState['bp_bob'].hp = 1;
room.eventBuffer.length = 0;
room._pvpHitLanes = new Map(); // v2.3.1306: cadence floor would drop this back-to-back alice->bob hit
await room.webSocketMessage(wsA4, JSON.stringify({ type: 'player_attack', payload: { ...atk } }));
check('lethal duel hit kills', room.playerState['bp_bob'].dying === true);
check('death clears the consent pair', !room._pvpConsent.has(room._pvpPairKey('bp_alice', 'bp_bob')));

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
