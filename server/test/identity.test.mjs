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

/* Lawless wilderness: it USED to need no consent.  v2.3.1917 turned that
   off (owner: "remove the option to kill other players for now") -- this
   assertion is the old one inverted, deliberately, because it is the whole
   point of the change: standing next to a stranger in the meadow with a
   drawn sword now does nothing at all.  Flip GameRoom.OPEN_PVP back to
   true and the original behaviour returns; test/threat.test.mjs covers
   that direction. */
const wsC = fakeWs('carol'); const wsD = fakeWs('dave');
await join(wsC, 'bp_carol', 'echo-flare-ghost-haze-1', 'meadow');
await join(wsD, 'bp_dave', 'orbit-prism-quest-ridge-2', 'meadow');
room.playerState['bp_carol'].x = -100000; room.playerState['bp_carol'].y = -100000;
room.playerState['bp_dave'].x = -99960; room.playerState['bp_dave'].y = -100000;
room.eventBuffer.length = 0;
await room.webSocketMessage(wsC, JSON.stringify({ type: 'player_attack', payload: { ...atk } }));
check('a lawless zone no longer allows PvP without consent',
  room.eventBuffer.filter((e) => e.type === 'pvp_hit' && e.payload.target === 'bp_dave').length === 0,
  room.eventBuffer.map((e) => e.type));
check('...and the victim takes no damage from it',
  room.playerState['bp_dave'].hp === room.playerState['bp_dave'].maxHp,
  { hp: room.playerState['bp_dave'].hp, maxHp: room.playerState['bp_dave'].maxHp });
/* Guard: the refusal must be the CONSENT gate, not a broken fixture --
   the same swing lands the moment the pair agree to a duel. */
if (!room._pvpConsent) room._pvpConsent = new Map();
room._pvpConsent.set(room._pvpPairKey('bp_carol', 'bp_dave'), Date.now() + 60000);
room._pvpHitLanes = new Map();
room.eventBuffer.length = 0;
await room.webSocketMessage(wsC, JSON.stringify({ type: 'player_attack', payload: { ...atk } }));
check('...but the identical swing lands once they duel (guard)',
  room.eventBuffer.filter((e) => e.type === 'pvp_hit' && e.payload.target === 'bp_dave').length === 1,
  room.eventBuffer.map((e) => e.type));
room._pvpConsent.delete(room._pvpPairKey('bp_carol', 'bp_dave'));

// ── 8. death clears consent ──
room.playerState['bp_bob'].hp = 1;
room.eventBuffer.length = 0;
room._pvpHitLanes = new Map(); // v2.3.1306: cadence floor would drop this back-to-back alice->bob hit
await room.webSocketMessage(wsA4, JSON.stringify({ type: 'player_attack', payload: { ...atk } }));
check('lethal duel hit kills', room.playerState['bp_bob'].dying === true);
check('death clears the consent pair', !room._pvpConsent.has(room._pvpPairKey('bp_alice', 'bp_bob')));

/* ═══ v2.3.1814: THE CHARACTER RECORD — NAME AND LOOK ARE PERMANENT ═══
   Owner: "character selections in terms of names and traits picked during
   login should be permanent."  On an authoritative server that has to mean
   the STORED record beats the join payload, or "permanent" is only a
   client-side suggestion and a hand-edited join restyles the character.

   Sits in identity.test because the record is keyed by, and only meaningful
   for, the authenticated identity — it is the same first-write-wins lock as
   `auth:`, applied to the face instead of the password. */
{
  const wsE = fakeWs('erin-1');
  await join(wsE, 'bp_erin', 'ember-vault-lucid-crown-3', 'town', 'Erin');
  /* join() sends a bare data block, so give this one a real look the way a
     creating client does. */
  const wsF = fakeWs('finn-1');
  room.sessions.set(wsF, baseSession());
  await room.webSocketMessage(wsF, JSON.stringify({
    type: 'join', id: 'bp_finn', phrase: 'frost-tundra-amber-vigil-5', name: 'Finn',
    data: { x: 10, y: 10, z: 'town', name: 'Finn', hr: 'long', hc: 'ash', sk: 'tan', st: 'tunic',
      ec: 'violet' /* v2.3.1930 */,
      sa: 'b'.repeat(256) /* v2.3.1939: a drawn shirt, 256 chars */,
      pa: 'c'.repeat(256), ta: 'd'.repeat(256) /* v2.3.1940: pants print + tattoo */,
      tf: 'e'.repeat(256), tm: 'f'.repeat(256) /* v2.3.1949: face + arm tattoos */,
      sp: 'check:7', pp: 'dots:2' /* v2.3.1941: clothing patterns */,
      fp: 'stripe-h:4' /* v2.3.1944: shoes */,
      hg: 'short', fr: 'thin' /* v2.3.1953: height + frame */ },
  }));
  const charF = state._store.get('char:bp_finn');
  check('char record stamped in its own storage key on first join',
    !!(charF && charF.look), charF);
  check('...carrying the name and the picked traits',
    !!(charF && charF.name === 'Finn' && charF.look.hr === 'long' && charF.look.sk === 'tan'),
    charF);
  check('...and NOT carrying the top-level name inside the look blob',
    !!(charF && charF.look.name === undefined), charF && charF.look);
  /* v2.3.1930: eye colour joins the permanent look for the same reason every
     other trait is in it -- it is part of the face, and the face is stored
     against the identity rather than the device (v2.3.1814).  This asserts
     the ALLOWLIST admitted it: `ec` is only in the look because it was added
     to JOIN_COSMETIC_KEYS, and an unlisted key is dropped, so a missing entry
     here is exactly how the feature would silently not persist. */
  check('...including the eye colour (v2.3.1930)',
    !!(charF && charF.look.ec === 'violet'), charF && charF.look);
  /* v2.3.1939: a drawn shirt survives the join path AT FULL LENGTH.  Cosmetics
     are truncated at 64 by default and this one is 256, so without its own
     larger bound (alongside `avatar`) the drawing would arrive invalid and the
     print would silently never appear. */
  check('...and the drawn shirt, untruncated (v2.3.1939)',
    !!(charF && charF.look.sa === 'b'.repeat(256)),
    charF && charF.look.sa && charF.look.sa.length);
  /* v2.3.1940: the pants print and the tattoo are the same shape as the shirt
     and need the same two things -- a place on the allowlist and the larger
     cap.  Asserted separately from `sa` because they were added later and
     either one could be missed on its own. */
  check('...and the drawn pants print, untruncated (v2.3.1940)',
    !!(charF && charF.look.pa === 'c'.repeat(256)),
    charF && charF.look.pa && charF.look.pa.length);
  check('...and the tattoo, untruncated (v2.3.1940)',
    !!(charF && charF.look.ta === 'd'.repeat(256)),
    charF && charF.look.ta && charF.look.ta.length);
  /* v2.3.1949: the face and arm tattoos are stored in the same permanent look,
     so this is what makes them survive logging in on a NEW DEVICE -- the join
     data is the only place they travel from, and an unlisted key is dropped
     without a word.  Asserting the whole set at once, because the failure mode
     is always the same: one key added to one gate. */
  check('...and the face + arm tattoos, untruncated (v2.3.1949)',
    !!(charF && charF.look.tf === 'e'.repeat(256) && charF.look.tm === 'f'.repeat(256)),
    charF && { tf: charF.look.tf && charF.look.tf.length, tm: charF.look.tm && charF.look.tm.length });
  /* v2.3.1953: height and frame belong to the permanent look for the same
     reason the face does -- they are what you look like, not what this browser
     remembers.  Without this the build would be a device setting: log in on a
     new phone and your bro would be back to average, silently. */
  check('...and the height + frame (v2.3.1953)',
    !!(charF && charF.look.hg === 'short' && charF.look.fr === 'thin'),
    charF && { hg: charF.look.hg, fr: charF.look.fr });
  /* v2.3.1941: the clothing patterns are SHORT, so unlike the drawings above
     the cap is not the interesting part -- the allowlist is.  An unlisted key
     is dropped, which is exactly how a pattern would silently fail to persist
     across a login on a new device. */
  check('...and both clothing patterns (v2.3.1941)',
    !!(charF && charF.look.sp === 'check:7' && charF.look.pp === 'dots:2'),
    charF && charF.look);
  check('...and the shoe pattern (v2.3.1944)',
    !!(charF && charF.look.fp === 'stripe-h:4'), charF && charF.look);

  /* THE POINT OF THE WHOLE THING: rejoin claiming a different face. */
  const wsF2 = fakeWs('finn-2');
  room.sessions.set(wsF2, baseSession());
  await room.webSocketMessage(wsF2, JSON.stringify({
    type: 'join', id: 'bp_finn', phrase: 'frost-tundra-amber-vigil-5', name: 'Impostor',
    data: { x: 10, y: 10, z: 'town', name: 'Impostor', hr: 'bald', hc: 'pink', sk: 'pale', st: 'robe',
      ec: 'red' /* v2.3.1930: a restyle attempt on the eyes too */ },
  }));
  const charF2 = state._store.get('char:bp_finn');
  check('a later join CANNOT restyle the character (stored record wins)',
    !!(charF2 && charF2.look.hr === 'long' && charF2.look.sk === 'tan' && charF2.name === 'Finn'),
    charF2);
  check('...and the live session wears the stored look, not the claimed one',
    room.sessions.get(wsF2).data.hr === 'long'
    && room.sessions.get(wsF2).data.name === 'Finn'
    && room.sessions.get(wsF2).data.ec === 'violet',   /* v2.3.1930 */
    room.sessions.get(wsF2).data);
  /* The echo is how a NEW DEVICE gets the look at all — it exists nowhere
     locally after a Login Key switch. */
  const syncF = msgsOfType(wsF2, 'state_sync').slice(-1)[0];
  check('state_sync echoes the character record back to its owner',
    !!(syncF && syncF.char && syncF.char.look.hr === 'long' && syncF.char.name === 'Finn'),
    syncF && syncF.char);
  check('...and advertises charLock so an old client is not gated on a flag it cannot see',
    !!(syncF && syncF.caps && syncF.caps.charLock === true), syncF && syncF.caps);

  /* A NAMELESS JOIN MUST NOT CREATE ONE.  Body colours ride every join,
     including one opened behind a pre-game screen before the player has
     chosen anything — and a blank character made permanent has no way back.
     Two locks: the client no longer connects there, and this. */
  const wsG = fakeWs('ghost-1');
  room.sessions.set(wsG, baseSession());
  await room.webSocketMessage(wsG, JSON.stringify({
    type: 'join', id: 'bp_ghost', phrase: 'gale-hollow-quartz-mint-8',
    data: { x: 10, y: 10, z: 'town', bt: '#2563eb', bl: '#1e3a5f' },
  }));
  check('a nameless join does NOT lock a blank character in',
    !state._store.get('char:bp_ghost'), state._store.get('char:bp_ghost'));
  /* GUARD: that id really did join — otherwise the check above passes for
     the wrong reason (no record because no join). */
  check('...but that join was otherwise accepted (guard)',
    msgsOfType(wsG, 'state_sync').length === 1, msgsOfType(wsG, 'state_sync').length);

  /* Guests are throwaways and have nothing to make permanent. */
  const wsH = fakeWs('guest-1');
  room.sessions.set(wsH, baseSession());
  await room.webSocketMessage(wsH, JSON.stringify({
    type: 'join', id: 'guest_xyz', name: 'Guest',
    data: { x: 10, y: 10, z: 'town', name: 'Guest', hr: 'long' },
  }));
  check('a guest id gets no character record', !state._store.get('char:guest_xyz'));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
