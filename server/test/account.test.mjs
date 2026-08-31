/* Account-login pre-flight test (v2.3.1143).
 * Stateful storage mock (auth:/rpg: records must persist across calls,
 * same as identity.test.mjs) and checks:
 *   1. passphraseToId parity: literal fixtures generated from the
 *      CLIENT implementation (src/networking/index.js) -- if this test
 *      fails after touching either copy, the two have drifted.
 *   2. Registered phrase -> ok/exists/id/preview/settled.
 *   3. Preview level comes from the rpg blob.
 *   4. Unregistered phrase -> exists:false AND nothing stamped
 *      (the read-only invariant that protects typos).
 *   5. Wrong phrase on a registered id -> 'auth'; 5 fails -> 'locked';
 *      the SAME lockout blocks a join (shared _authFails budget);
 *      expiry restores access.
 *   6. Per-IP throttle: 21st attempt in a window -> 'rate'; other IPs
 *      unaffected.
 *   7. _accountFetch surface: malformed JSON -> bad_request, unknown
 *      subpath -> 404, CORS header present.
 */
import { GameRoom } from '../src/index.js';
import { accountPassphraseToId, ACCOUNT } from '../src/account.js';

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

// ── 1. passphraseToId parity fixtures ──
// Generated from the client implementation with:
//   node -e "function f(p){let h=0;for(let i=0;i<p.length;i++)h=((h<<5)-h+p.charCodeAt(i))|0;return 'bp_'+Math.abs(h).toString(36)+'_'+p.split('-').slice(0,2).join('')};[...].forEach(p=>console.log(p,f(p)))"
const FIXTURES = [
  ['alpha-blaze-coral-drift-7', 'bp_uac7yb_alphablaze'],
  ['zeal-wisp-vault-umbra-0', 'bp_f1dl4q_zealwisp'],
  ['karma-lunar-mango-nexus-3', 'bp_ktayze_karmalunar'],
  ['storm-titan-nova-echo-42', 'bp_rr3p56_stormtitan'],
];
for (const [phrase, expected] of FIXTURES) {
  check('parity: ' + phrase, accountPassphraseToId(phrase) === expected, accountPassphraseToId(phrase));
}

// ── 2. registered phrase found ──
const ALICE_PHRASE = 'alpha-blaze-coral-drift-7';
const ALICE_ID = 'bp_uac7yb_alphablaze';
const wsA = fakeWs('alice');
await join(wsA, ALICE_ID, ALICE_PHRASE);
check('setup: join registered alice', msgsOfType(wsA, 'state_sync').length === 1);
let r = await room._accountLogin(ALICE_PHRASE, '1.1.1.1');
check('registered phrase -> exists', r.ok === true && r.exists === true && r.settled === true, r);
check('registered phrase -> derived id', r.id === ALICE_ID, r.id);
check('registered phrase -> preview present', !!r.preview && r.preview.level >= 1 && typeof r.preview.createdAt === 'number', r.preview);

// ── 3. preview reads the rpg blob ──
const rpgBlob = state._store.get('rpg:' + ALICE_ID) || {};
rpgBlob.level = 12;
state._store.set('rpg:' + ALICE_ID, rpgBlob);
r = await room._accountLogin(ALICE_PHRASE, '1.1.1.1');
check('preview level from rpg blob', r.preview && r.preview.level === 12, r.preview);

// ── 3b. v2.3.2193: the preview carries the APPEARANCE ──
// The picker draws a portrait of a character it is not playing, and this is
// the only place it can learn what one looks like: the roster on the device
// holds keys and names, never cosmetics.
//
// A SEPARATE, DRESSED join, because alice's setup join above carries no
// cosmetics at all -- and a join with no cosmetics deliberately creates no
// char record (join.js _loadOrCreateCharacter: a blank look must never be made
// permanent).  Asserting against the stored record rather than a fixture, so a
// change to what a look contains cannot leave this passing on a stale shape.
const DRESSED_PHRASE = 'karma-lunar-mango-nexus-3';
const DRESSED_ID = 'bp_ktayze_karmalunar';            // from the parity fixtures above
const wsD = fakeWs('dressed');
room.sessions.set(wsD, baseSession());
await room.webSocketMessage(wsD, JSON.stringify({
  type: 'join', id: DRESSED_ID, name: 'Dressy', phrase: DRESSED_PHRASE,
  /* `name` INSIDE data, not the top-level one: _loadOrCreateCharacter reads
     cleanJoinData.name, and a nameless join deliberately creates no character
     (join.js, v2.3.1814 -- a blank character must never be made permanent). */
  data: { x: 100, y: 100, z: 'town', name: 'Dressy', sk: '#c98', hr: 'afro', hc: 'black', st: 'tshirt' },
}));
const charRec = state._store.get('char:' + DRESSED_ID);
check('setup: the dressed join stored a char record with a look', !!(charRec && charRec.look), charRec);
r = await room._accountLogin(DRESSED_PHRASE, '1.1.1.1');
check('preview carries the character look, so the picker can draw a face',
  !!(r.preview && r.preview.look) && JSON.stringify(r.preview.look) === JSON.stringify(charRec.look),
  { look: r.preview && r.preview.look });
// A key with NO character yet must not invent one: the picker falls back to its
// letter tile on null, where a {} would read as "a character with no features"
// and draw a blank bro.  alice is exactly that case -- registered, no look.
r = await room._accountLogin(ALICE_PHRASE, '1.1.1.1');
check('a key with no character previews look:null, not an empty look',
  r.ok === true && r.exists === true && r.preview && r.preview.look === null
    && r.preview.hasChar === false,
  r.preview);

// ── 4. unregistered phrase: exists:false, NOTHING stamped ──
const authKeysBefore = [...state._store.keys()].filter((k) => k.startsWith('auth:')).length;
r = await room._accountLogin('ghost-haze-iron-jet-9', '1.1.1.1');
check('unregistered phrase -> exists:false', r.ok === true && r.exists === false && r.settled === true, r);
const authKeysAfter = [...state._store.keys()].filter((k) => k.startsWith('auth:')).length;
check('unregistered check stamps no auth record (read-only)', authKeysAfter === authKeysBefore, { authKeysBefore, authKeysAfter });

// ── 5. wrong phrase / shared lockout ──
// Hand-plant an auth record whose pfHash can't match, at the id our
// probe phrase derives to -- simulates a guess landing on a registered id.
const PROBE = 'echo-flare-ghost-haze-1';
const PROBE_ID = accountPassphraseToId(PROBE);
state._store.set('auth:' + PROBE_ID, { pfHash: 'f'.repeat(64), createdAt: Date.now() });
r = await room._accountLogin(PROBE, '2.2.2.2');
check('mismatch -> auth', r.ok === false && r.reason === 'auth', r);
for (let i = 0; i < 4; i++) await room._accountLogin(PROBE, '2.2.2.2');
r = await room._accountLogin(PROBE, '2.2.2.2');
check('5 fails -> locked', r.ok === false && r.reason === 'locked', r);
// The same budget must block a JOIN for that id (shared _authFails).
const wsP = fakeWs('probe-join');
await join(wsP, PROBE_ID, PROBE);
check('HTTP lockout blocks join too (shared budget)', msgsOfType(wsP, 'join_rejected').length === 1, wsP.sent);
// Expiry restores.
room._authFails.set(PROBE_ID, { count: 0, until: 0 });
state._store.delete('auth:' + PROBE_ID);
r = await room._accountLogin(PROBE, '2.2.2.2');
check('after expiry + unregister -> exists:false again', r.ok === true && r.exists === false, r);

// ── 6. per-IP throttle ──
for (let i = 0; i < ACCOUNT.IP_MAX_ATTEMPTS; i++) {
  await room._accountLogin('knack-lava-mystic-nova-' + (i % 10), '3.3.3.3');
}
r = await room._accountLogin('knack-lava-mystic-nova-0', '3.3.3.3');
check('21st attempt from one IP -> rate', r.ok === false && r.reason === 'rate', r);
r = await room._accountLogin(ALICE_PHRASE, '4.4.4.4');
check('other IP unaffected by throttle', r.ok === true && r.exists === true, r);

// ── 7. fetch surface ──
const resBad = await room._accountFetch(new Request('https://x/api/account/login', { method: 'POST', body: 'not json' }));
const bodyBad = JSON.parse(await resBad.text());
check('malformed JSON body -> bad_request', resBad.status === 200 && bodyBad.reason === 'bad_request', bodyBad);
check('CORS header on response', resBad.headers.get('Access-Control-Allow-Origin') === '*');
const res404 = await room._accountFetch(new Request('https://x/api/account/nope', { method: 'GET' }));
check('unknown subpath -> 404', res404.status === 404);
const resOk = await room._accountFetch(new Request('https://x/api/account/login', { method: 'POST', body: JSON.stringify({ phrase: ALICE_PHRASE }), headers: { 'CF-Connecting-IP': '5.5.5.5' } }));
const bodyOk = JSON.parse(await resOk.text());
check('fetch login round-trip', resOk.status === 200 && bodyOk.ok === true && bodyOk.exists === true && bodyOk.settled === true && bodyOk.id === ALICE_ID, bodyOk);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
