/* Hemi Bro ownership handshake — v2.3.1576 (broverify.js).
 *
 * onchain.test.mjs pins the crypto; this pins the PROTOCOL around it — the
 * parts an attacker actually touches:
 *
 *   - a nonce is single-use, session-bound, and expires
 *   - the signed text is built by the SERVER (a client that supplied its own
 *     would be choosing what it proved)
 *   - `bro` is written ONLY by a successful verify, never by a client
 *   - every failure path replies and mutates nothing
 *
 * The chain is injected (room._broFetch), so this runs with no network.
 */
import { broVerifyMethods, RECHECK_MS } from '../src/broverify.js';
import { PRIVILEGED_EVENTS, TRACK_COSMETIC_KEYS } from '../src/index.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* ── a minimal room: storage map + a socket that records what it was sent ──*/
function mkRoom() {
  const store = new Map();
  const room = {
    playerState: Object.create(null),
    dirtyPlayers: new Set(),
    state: { storage: {
      async get(k) { return store.has(k) ? JSON.parse(JSON.stringify(store.get(k))) : undefined; },
      async put(k, v) { store.set(k, JSON.parse(JSON.stringify(v))); },
    } },
    _store: store,
  };
  Object.assign(room, broVerifyMethods);
  return room;
}
function mkWs() { const sent = []; return { sent, send: (s) => sent.push(JSON.parse(s)) }; }
const last = (ws) => ws.sent[ws.sent.length - 1];

const ME = '0x1111111111111111111111111111111111111111';
const THEM = '0x2222222222222222222222222222222222222222';
const SIG = '0x' + 'ab'.repeat(32) + 'cd'.repeat(32) + '1b';
const word = (a) => '0x' + '00'.repeat(12) + a.slice(2);
/* Route by callee: precompile 0x01 answers the signer, anything else is the
   collection answering ownerOf. */
const chain = (signer, holder) => async (url, opts) => {
  const b = JSON.parse(opts.body);
  const to = b.params[0].to;
  const v = to === '0x0000000000000000000000000000000000000001' ? signer : holder;
  return { ok: true, json: async () => ({ result: v ? word(v) : '0x' }) };
};

// ── 1. the challenge ──
{
  const room = mkRoom(), ws = mkWs();
  const session = { id: 'bp_alice' };
  room._handleBroNonce(session, ws);
  const msg = last(ws);
  check('bro_nonce replies with a message to sign', msg.type === 'bro_nonce' && !!msg.message, msg);
  check('  …naming the chain id', msg.message.includes('chain: 43111'), msg.message);
  check('  …binding the player id', msg.message.includes('player: bp_alice'), msg.message);
  check('  …and carrying the collection', /^0x[0-9a-f]{40}$/.test(msg.contract), msg.contract);
  check('the nonce is held on the SESSION, not globally', !!session._broNonce);

  /* Re-issuing replaces rather than accumulates — no banking live nonces. */
  const first = session._broNonce.nonce;
  room._handleBroNonce(session, ws);
  check('re-requesting replaces the previous nonce', session._broNonce.nonce !== first);

  /* Two players must never be handed the same text to sign. */
  const s2 = { id: 'bp_bob' }, ws2 = mkWs();
  room._handleBroNonce(s2, ws2);
  check('a different player gets a different message', last(ws2).message !== msg.message);
}

// ── 2. the happy path ──
{
  const room = mkRoom(), ws = mkWs();
  const session = { id: 'bp_alice' };
  room.playerState['bp_alice'] = { x: 0, y: 0 };
  room._broFetch = chain(ME, ME);
  room._handleBroNonce(session, ws);
  await room._handleBroVerify(session, { tokenId: 4242, signature: SIG }, ws);

  const res = last(ws);
  check('a real owner verifies', res.type === 'bro_verify_result' && res.ok === true, res);
  check('  …and is told which token', res.tokenId === 4242, res);
  check('the link is persisted', !!room._store.get('bro_link:bp_alice'));
  check('  …with the address and a timestamp', (() => {
    const l = room._store.get('bro_link:bp_alice');
    return l.address === ME.toLowerCase() && typeof l.ts === 'number';
  })(), room._store.get('bro_link:bp_alice'));
  check('playerState.bro is set to the token id', room.playerState['bp_alice'].bro === 4242);
  check('the player is marked dirty so peers see the badge', room.dirtyPlayers.has('bp_alice'));
}

// ── 3. the nonce is single-use ──
{
  const room = mkRoom(), ws = mkWs();
  const session = { id: 'bp_alice' };
  room.playerState['bp_alice'] = {};
  room._broFetch = chain(ME, ME);
  room._handleBroNonce(session, ws);
  await room._handleBroVerify(session, { tokenId: 7, signature: SIG }, ws);
  check('first verify succeeds', last(ws).ok === true);
  await room._handleBroVerify(session, { tokenId: 8, signature: SIG }, ws);
  check('REPLAYING the same challenge is refused', last(ws).ok === false, last(ws));
  check('  …as nonce_expired', last(ws).reason === 'nonce_expired', last(ws).reason);
  check('  …and the replay did NOT change the stored link',
    room._store.get('bro_link:bp_alice').tokenId === 7);
  check('  …nor playerState.bro', room.playerState['bp_alice'].bro === 7);
}

// ── 4. verifying with no challenge at all ──
{
  const room = mkRoom(), ws = mkWs();
  room._broFetch = chain(ME, ME);
  await room._handleBroVerify({ id: 'bp_x' }, { tokenId: 1, signature: SIG }, ws);
  check('a verify with no outstanding nonce is refused', last(ws).ok === false && last(ws).reason === 'nonce_expired');
}

// ── 5. an expired challenge ──
{
  const room = mkRoom(), ws = mkWs();
  const session = { id: 'bp_alice', _broNonce: { nonce: 'stale', exp: Date.now() - 1 } };
  room._broFetch = chain(ME, ME);
  await room._handleBroVerify(session, { tokenId: 1, signature: SIG }, ws);
  check('an expired challenge is refused', last(ws).ok === false && last(ws).reason === 'nonce_expired');
}

// ── 6. input shape — refused before any chain read ──
{
  const room = mkRoom(), ws = mkWs();
  let reads = 0;
  room._broFetch = async () => { reads++; throw new Error('must not be called'); };
  const fresh = () => ({ id: 'bp_a', _broNonce: { nonce: 'n', exp: Date.now() + 60000 } });

  await room._handleBroVerify(fresh(), { tokenId: 0, signature: SIG }, ws);
  check('token id 0 is refused', last(ws).reason === 'bad_token_id');
  await room._handleBroVerify(fresh(), { tokenId: 6667, signature: SIG }, ws);
  check('a token id past the 6666 ceiling is refused', last(ws).reason === 'bad_token_id');
  await room._handleBroVerify(fresh(), { tokenId: 1.5, signature: SIG }, ws);
  check('a non-integer token id is refused', last(ws).reason === 'bad_token_id');
  await room._handleBroVerify(fresh(), { tokenId: 5, signature: 'nope' }, ws);
  check('a malformed signature is refused', last(ws).reason === 'bad_signature');
  await room._handleBroVerify(fresh(), { tokenId: 5, signature: '0x' + 'ab'.repeat(64) }, ws);
  check('a wrong-length signature is refused', last(ws).reason === 'bad_signature');
  check('  …and NONE of those touched the chain', reads === 0, { reads });
}

// ── 7. the chain says no ──
{
  const mk = async (signer, holder) => {
    const room = mkRoom(), ws = mkWs();
    const session = { id: 'bp_a' };
    room.playerState['bp_a'] = {};
    room._broFetch = chain(signer, holder);
    room._handleBroNonce(session, ws);
    await room._handleBroVerify(session, { tokenId: 9, signature: SIG }, ws);
    return { room, res: last(ws) };
  };
  const notOwner = await mk(ME, THEM);
  check('signing for a Bro someone ELSE holds is refused', notOwner.res.ok === false && notOwner.res.reason === 'not_owner', notOwner.res);
  check('  …and grants nothing', notOwner.room.playerState['bp_a'].bro === undefined
    && !notOwner.room._store.has('bro_link:bp_a'));

  const unminted = await mk(ME, null);
  check('an unminted token is refused', unminted.res.ok === false && unminted.res.reason === 'no_such_token');

  const badSig = await mk(null, ME);
  check('an unrecoverable signature is refused', badSig.res.ok === false && badSig.res.reason === 'bad_signature');
}

// ── 8. a chain outage must refuse, never grant ──
{
  const room = mkRoom(), ws = mkWs();
  const session = { id: 'bp_a' };
  room.playerState['bp_a'] = {};
  room._broFetch = async () => { throw new Error('offline'); };
  room._handleBroNonce(session, ws);
  await room._handleBroVerify(session, { tokenId: 3, signature: SIG }, ws);
  check('an RPC outage refuses rather than granting', last(ws).ok === false, last(ws));
  check('  …and writes nothing', room.playerState['bp_a'].bro === undefined && !room._store.has('bro_link:bp_a'));
}

// ── 9. reconnect restore, and its expiry ──
{
  const room = mkRoom();
  room.playerState['bp_a'] = {};
  await room.state.storage.put('bro_link:bp_a', { tokenId: 55, address: ME, ts: Date.now() });
  const fresh = await room._restoreBroLink('bp_a');
  check('a fresh link is restored on join', fresh && fresh.tokenId === 55, fresh);
  check('  …repopulating playerState.bro', room.playerState['bp_a'].bro === 55);

  const room2 = mkRoom();
  room2.playerState['bp_b'] = {};
  await room2.state.storage.put('bro_link:bp_b', { tokenId: 55, address: ME, ts: Date.now() - RECHECK_MS - 1 });
  const stale = await room2._restoreBroLink('bp_b');
  check('a link older than RECHECK_MS is NOT restored', stale === null, stale);
  check('  …leaving the badge off until re-verified', room2.playerState['bp_b'].bro === undefined);

  const room3 = mkRoom();
  room3.playerState['bp_c'] = {};
  check('a player with no link restores to nothing', (await room3._restoreBroLink('bp_c')) === null);
}

// ── 10. the trust boundary ──
{
  check('bro_verify_result is PRIVILEGED (a client cannot forge a badge to peers)',
    PRIVILEGED_EVENTS.has('bro_verify_result'));
  check('bro_nonce is PRIVILEGED (a client cannot choose the text it "signed")',
    PRIVILEGED_EVENTS.has('bro_nonce'));
  check('`bro` is NOT client-settable — absent from TRACK_COSMETIC_KEYS',
    !TRACK_COSMETIC_KEYS.has('bro'));
  check('  …and neither is tokenId or address', !TRACK_COSMETIC_KEYS.has('tokenId') && !TRACK_COSMETIC_KEYS.has('address'));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
