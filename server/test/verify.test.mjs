/* ═══ v2.3.3275: THE ACCOUNT CHECK (server/src/verify.js) ═══
 *
 * A new character proves a person is there -- Cloudflare Turnstile, verified
 * by the room before the identity is made.  Checks:
 *   1. OFF without both keys: a new character is let in, the verifier never
 *      called; the same with the `disable_verify` live flag;
 *   2. ON: a new character with no token is refused -- join_rejected
 *      {reason:'verify', sitekey}, close 4014, the socket gone, and NOTHING
 *      written (no auth:, no rpg:);
 *   3. a good token lets the character in, the verifier asked once with the
 *      secret, the token and the socket's address; the record is then on file;
 *   4. a character on file is never asked, token or none;
 *   5. a guest id (no phrase) is asked on every join;
 *   6. a token the verifier refuses is refused; a verifier that throws
 *      refuses (fail closed); a token over the wire bound is refused without
 *      a call; a non-string token the same;
 *   7. TURNSTILE_VERIFY_URL is the address asked when set.
 */
import { GameRoom } from '../src/index.js';
import { VERIFY } from '../src/verify.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => (Array.isArray(k) ? new Map(k.filter((x) => store.has(x)).map((x) => [x, store.get(x)])) : store.get(k)),
      put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); return; } store.set(k, v); },
      list: async (opts) => { const out = new Map(); for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v); return out; },
      delete: async (k) => store.delete(k),
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const LB = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const ON = { ...LB, TURNSTILE_SECRET: 'the-secret', TURNSTILE_SITEKEY: 'the-sitekey' };

/* the verifier, stubbed: what it is asked, and what it answers */
const calls = [];
let answer = (body) => ({ success: body.get('response') === 'good' });
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const body = init && init.body;
  const params = body instanceof URLSearchParams ? body : new URLSearchParams(String(body || ''));
  calls.push({ url: String(url), secret: params.get('secret'), response: params.get('response'), remoteip: params.get('remoteip') });
  if (params.get('response') === 'boom') throw new Error('verifier down');
  const j = answer(params);
  return { json: async () => j };
};

function fakeWs(label) {
  return { label, sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(code, reason) { this.closed = { code, reason }; } };
}
function room(env) {
  const state = makeState();
  const r = new GameRoom(state, env);
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = () => 0;
  r.startTickLoop();
  globalThis.setInterval = realSetInterval;
  r._eventLive = false;
  return { r, state };
}
async function join(r, id, extra, ip) {
  const ws = fakeWs(id);
  r.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '', ip: ip || null });
  await r.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' }, ...(extra || {}) }));
  return ws;
}
const rejected = (ws) => ws.sent.find((m) => m.type === 'join_rejected');
const synced = (ws) => ws.sent.some((m) => m.type === 'state_sync');
const rows = (state, prefix) => [...state._store.keys()].filter((k) => k.startsWith(prefix));

/* ═══ 1. off ═══ */
{
  const { r, state } = room(LB);
  const ws = await join(r, 'bp_off1', { phrase: 'alpha-bolt-coral-dusk-7' });
  check('1. no keys: a new character is let in, the verifier never asked', synced(ws) && calls.length === 0 && rows(state, 'auth:').length === 1, { calls: calls.length, synced: synced(ws) });
  const only = room({ ...LB, TURNSTILE_SITEKEY: 'k' });
  const ws2 = await join(only.r, 'bp_off2', { phrase: 'alpha-bolt-coral-dusk-8' });
  check('1. a site key alone is off too', synced(ws2) && calls.length === 0);
  const flagged = room(ON);
  flagged.r._liveFlags = { [VERIFY.FLAG_OFF]: true };
  const ws3 = await join(flagged.r, 'bp_off3', { phrase: 'alpha-bolt-coral-dusk-9' });
  check('1. the disable_verify live flag turns it off', synced(ws3) && calls.length === 0 && !flagged.r._verifyConfigured());
}

/* ═══ 2. on: no token ═══ */
{
  const { r, state } = room(ON);
  check('2. configured with both keys', r._verifyConfigured());
  const ws = await join(r, 'bp_new1', { phrase: 'blaze-coral-drift-ember-1' });
  const rj = rejected(ws);
  check('2. a new character with no token is refused with reason "verify" and the site key', rj && rj.reason === 'verify' && rj.sitekey === 'the-sitekey', rj);
  check('2. ...closed with the gate\'s code, the socket gone', ws.closed && ws.closed.code === VERIFY.CLOSE_CODE && !r.sessions.has(ws), ws.closed);
  check('2. ...and nothing written: no auth record, no character', rows(state, 'auth:').length === 0 && rows(state, 'rpg:').length === 0 && !r.playerState.bp_new1, [...state._store.keys()]);
  check('2. ...and the verifier was not asked for a missing token', calls.length === 0, calls);
  /* an empty string, a number, an object: the same */
  for (const bad of ['', 42, { t: 'x' }]) {
    const w = await join(r, 'bp_new1', { phrase: 'blaze-coral-drift-ember-1', verify: bad });
    if (!(rejected(w) && rejected(w).reason === 'verify')) check('2. a token of ' + JSON.stringify(bad) + ' is refused', false, w.sent);
  }
  check('2. an empty, numeric or object token is refused without a call', calls.length === 0, calls);
}

/* ═══ 3. on: a good token ═══ */
{
  const { r, state } = room(ON);
  calls.length = 0;
  const ws = await join(r, 'bp_new2', { phrase: 'coral-drift-ember-frost-2', verify: 'good' }, '203.0.113.9');
  check('3. a good token lets the new character in', synced(ws) && !!r.playerState.bp_new2, ws.sent.map((m) => m.type).slice(0, 3));
  check('3. ...the verifier asked once, at Cloudflare\'s address, with the secret, the token and the socket\'s address',
    calls.length === 1 && calls[0].url === VERIFY.URL && calls[0].secret === 'the-secret' && calls[0].response === 'good' && calls[0].remoteip === '203.0.113.9', calls);
  check('3. ...and the record is on file now', rows(state, 'auth:').length === 1 && rows(state, 'rpg:').length === 1);
  /* 4. on file: never asked again */
  calls.length = 0;
  r.sessions.clear();
  const back = await join(r, 'bp_new2', { phrase: 'coral-drift-ember-frost-2' });
  check('4. the same character coming back, no token: let in, the verifier not asked', synced(back) && calls.length === 0, { calls: calls.length });
  r.sessions.clear();
  const backTok = await join(r, 'bp_new2', { phrase: 'coral-drift-ember-frost-2', verify: 'whatever' });
  check('4. ...with a token: still not asked (a character on file is never checked)', synced(backTok) && calls.length === 0);
  /* a wrong phrase for a character on file is still the auth refusal, not a verify */
  r.sessions.clear();
  const wrong = await join(r, 'bp_new2', { phrase: 'wrong-wrong-wrong-wrong-0' });
  check('4. a wrong key for a character on file is the auth refusal, unchanged', rejected(wrong) && rejected(wrong).reason === 'auth' && wrong.closed && wrong.closed.code === 4003);
}

/* ═══ 5. guests ═══ */
{
  const { r } = room(ON);
  calls.length = 0;
  const g1 = await join(r, 'guest1abc');
  check('5. a guest id (no key) with no token is asked', rejected(g1) && rejected(g1).reason === 'verify' && calls.length === 0);
  const g2 = await join(r, 'guest1abc', { verify: 'good' });
  check('5. ...and let in with a good one', synced(g2) && calls.length === 1);
  r.sessions.clear();
  const g3 = await join(r, 'guest1abc');
  check('5. ...and asked again next time, having no record to be on file', rejected(g3) && rejected(g3).reason === 'verify');
}

/* ═══ 6. refusals ═══ */
{
  const { r, state } = room(ON);
  calls.length = 0;
  const bad = await join(r, 'bp_new3', { phrase: 'drift-ember-frost-grove-3', verify: 'bad' });
  check('6. a token the verifier refuses is refused, nothing written', rejected(bad) && rejected(bad).reason === 'verify' && calls.length === 1 && rows(state, 'auth:').length === 0);
  const boom = await join(r, 'bp_new3', { phrase: 'drift-ember-frost-grove-3', verify: 'boom' });
  check('6. a verifier that throws refuses (fail closed)', rejected(boom) && rejected(boom).reason === 'verify' && calls.length === 2);
  const long = await join(r, 'bp_new3', { phrase: 'drift-ember-frost-grove-3', verify: 'x'.repeat(VERIFY.TOKEN_MAX + 1) });
  check('6. a token over the wire bound is refused without a call', rejected(long) && rejected(long).reason === 'verify' && calls.length === 2);
  /* a verifier answer with no success field */
  answer = () => ({ 'error-codes': ['timeout-or-duplicate'] });
  const dup = await join(r, 'bp_new3', { phrase: 'drift-ember-frost-grove-3', verify: 'good' });
  check('6. an answer without success:true is a refusal', rejected(dup) && rejected(dup).reason === 'verify');
  answer = (body) => ({ success: body.get('response') === 'good' });
}

/* ═══ 7. the test seam ═══ */
{
  const { r } = room({ ...ON, TURNSTILE_VERIFY_URL: 'http://127.0.0.1:1/siteverify' });
  calls.length = 0;
  await join(r, 'bp_new4', { phrase: 'ember-frost-grove-haven-4', verify: 'good' });
  check('7. TURNSTILE_VERIFY_URL is the address asked when set', calls.length === 1 && calls[0].url === 'http://127.0.0.1:1/siteverify', calls);
  check('7. the close code is the room\'s own, not one the client reads as something else', ![4003, 4004, 4005, 4006, 4009, 4010, 4011, 4012].includes(VERIFY.CLOSE_CODE));
}

globalThis.fetch = realFetch;
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
