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
import { broVerifyMethods, RECHECK_MS, BRO_VERIFY_GAP_MS } from '../src/broverify.js';
import { readFileSync } from 'node:fs';
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
  /* v2.3.3255: a stale link is read again in the background -- offline here,
     so this section never reaches a real chain */
  room2._broFetch = async () => { throw new Error('offline'); };
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

/* ═══ v2.3.3255: THE WALLET CHECK -- the checkmark at 1 or more, and the count ═══ */
const n = (k) => '0x' + BigInt(k).toString(16).padStart(64, '0');
/* by callee and selector: the precompile answers the signer, ownerOf the
   holder, balanceOf the count (null: the chain would not say) */
const chain2 = ({ signer, holder, count }) => async (url, opts) => {
  const b = JSON.parse(opts.body);
  const { to, data } = b.params[0];
  let result = '0x';
  if (to === '0x0000000000000000000000000000000000000001') result = signer ? word(signer) : '0x';
  else if (data.startsWith('0x6352211e')) result = holder ? word(holder) : '0x';
  else if (data.startsWith('0x70a08231')) result = count === null || count === undefined ? '0x' : n(count);
  return { ok: true, json: async () => ({ result }) };
};
const walletVerify = async (opts, payload, pid = 'bp_w') => {
  const room = mkRoom(), ws = mkWs();
  const session = { id: pid };
  room.playerState[pid] = {};
  room._broFetch = chain2(opts);
  room._handleBroNonce(session, ws);
  await room._handleBroVerify(session, payload, ws);
  return { room, ws, session, res: last(ws), link: room._store.get('bro_link:' + pid), ps: room.playerState[pid] };
};

// ── 11. no worn Bro: the wallet's count ──
{
  const { room, res, link, ps } = await walletVerify({ signer: ME, count: 3 }, { count: 1, signature: SIG });
  check('wallet check: ok with no token id', res.ok === true, res);
  check('  …the reply says how many', res.count === 3 && res.tokenId === null && res.address === ME.toLowerCase(), res);
  check('  …the link stores the address and count, no token', link && link.address === ME && link.count === 3 && link.tokenId === undefined && typeof link.ts === 'number', link);
  check('  …ps.broN is the count (server-owned)', ps.broN === 3, ps);
  check('  …and no worn-Bro id is claimed', ps.bro === undefined, ps);
  check('  …the player is marked so the others see the checkmark', room.dirtyPlayers.has('bp_w'));
}

// ── 12. the worn Bro, checked along the way ──
{
  const owned = await walletVerify({ signer: ME, holder: ME, count: 2 }, { count: 1, tokenId: 77, signature: SIG });
  check('wallet check + a worn Bro they hold: the id is verified too', owned.res.ok && owned.res.tokenId === 77 && owned.ps.bro === 77 && owned.ps.broN === 2, owned.res);
  check('  …and stored', owned.link.tokenId === 77 && owned.link.count === 2, owned.link);
  const notOwned = await walletVerify({ signer: ME, holder: THEM, count: 2 }, { count: 1, tokenId: 77, signature: SIG });
  check('wallet check + a worn Bro someone ELSE holds: still ok, the count stands', notOwned.res.ok === true && notOwned.res.count === 2, notOwned.res);
  check('  …but no id is claimed', notOwned.res.tokenId === null && notOwned.ps.bro === undefined && notOwned.link.tokenId === undefined, notOwned.link);
  const odd = await walletVerify({ signer: ME, holder: ME, count: 0 }, { count: 1, tokenId: 77, signature: SIG });
  check('holding the worn Bro is holding at least one, whatever two reads said', odd.res.count === 1 && odd.ps.broN === 1, odd.res);
}

// ── 13. a wallet holding none ──
{
  const { res, link, ps } = await walletVerify({ signer: ME, count: 0 }, { count: 1, signature: SIG });
  check('a wallet holding none: ok, count 0 (the wallet is proven, it holds none)', res.ok === true && res.count === 0, res);
  check('  …linked at 0', link && link.count === 0, link);
  check('  …and NO badge: neither field set', ps.broN === undefined && ps.bro === undefined, ps);
}

// ── 14. the chain will not say: nothing granted, nothing written ──
{
  const { res, link, ps } = await walletVerify({ signer: ME, count: null }, { count: 1, signature: SIG });
  check('no count from the chain refuses', res.ok === false && res.reason === 'chain_unreachable', res);
  check('  …and writes nothing', link === undefined && ps.broN === undefined && ps.bro === undefined);
  const bad = await walletVerify({ signer: null, count: 4 }, { count: 1, signature: SIG });
  check('an unrecoverable signature refuses before any count', bad.res.ok === false && bad.res.reason === 'bad_signature' && bad.link === undefined, bad.res);
  const down = await walletVerify({}, { count: 1, signature: SIG });
  check('an outage refuses', down.res.ok === false && down.link === undefined, down.res);
}

// ── 15. shape: a worn id, if given, is still checked for shape first ──
{
  const room = mkRoom(), ws = mkWs();
  let reads = 0;
  room._broFetch = async () => { reads++; throw new Error('must not be called'); };
  const fresh = () => ({ id: 'bp_a', _broNonce: { nonce: 'n', exp: Date.now() + 60000 } });
  await room._handleBroVerify(fresh(), { count: 1, tokenId: 0, signature: SIG }, ws);
  check('wallet check with a token id 0 is refused', last(ws).reason === 'bad_token_id');
  await room._handleBroVerify(fresh(), { count: 1, tokenId: 'x', signature: SIG }, ws);
  check('wallet check with a token id that is not a number is refused', last(ws).reason === 'bad_token_id');
  await room._handleBroVerify(fresh(), { count: 1, signature: 'nope' }, ws);
  check('wallet check with a malformed signature is refused', last(ws).reason === 'bad_signature');
  check('  …none of those read the chain', reads === 0, { reads });
  await room._handleBroVerify(fresh(), { signature: SIG }, ws);
  check('the OLD check still needs a token id (an old client is unchanged)', last(ws).reason === 'bad_token_id');
}

// ── 16. one chain read per BRO_VERIFY_GAP_MS a socket ──
{
  const room = mkRoom(), ws = mkWs();
  const session = { id: 'bp_r' };
  room.playerState['bp_r'] = {};
  let reads = 0;
  const inner = chain2({ signer: ME, count: 1 });
  room._broFetch = async (u, o) => { reads++; return inner(u, o); };
  room._handleBroNonce(session, ws);
  await room._handleBroVerify(session, { count: 1, signature: SIG }, ws);
  check('a first wallet check runs', last(ws).ok === true);
  const readsAfterFirst = reads;
  room._handleBroNonce(session, ws);
  await room._handleBroVerify(session, { count: 1, signature: SIG }, ws);
  check('a second within BRO_VERIFY_GAP_MS is refused as slow_down', last(ws).ok === false && last(ws).reason === 'slow_down', last(ws));
  check('  …without touching the chain', reads === readsAfterFirst, { reads, readsAfterFirst });
  session._broVerifyAt = Date.now() - BRO_VERIFY_GAP_MS - 1;
  room._handleBroNonce(session, ws);
  await room._handleBroVerify(session, { count: 1, signature: SIG }, ws);
  check('  …and allowed again after the gap', last(ws).ok === true, last(ws));
}

// ── 17. join: a fresh count-only link restores the checkmark ──
{
  const room = mkRoom();
  room.playerState['bp_c'] = {};
  await room.state.storage.put('bro_link:bp_c', { address: ME, ts: Date.now(), count: 5 });
  const got = await room._restoreBroLink('bp_c');
  check('a fresh count-only link is restored on join', got && got.count === 5 && room.playerState['bp_c'].broN === 5, got);
  check('  …with no worn-Bro id', room.playerState['bp_c'].bro === undefined);
  const r0 = mkRoom();
  r0.playerState['bp_z'] = {};
  await r0.state.storage.put('bro_link:bp_z', { address: ME, ts: Date.now(), count: 0 });
  check('a fresh link holding none restores to nothing', (await r0._restoreBroLink('bp_z')) === null && r0.playerState['bp_z'].broN === undefined);
}

// ── 18. a stale link is READ AGAIN, never re-signed ──
{
  const room = mkRoom();
  room.playerState['bp_s'] = {};
  const sent = [];
  room._wsBySessionId = (pid) => (pid === 'bp_s' ? { send: (x) => sent.push(JSON.parse(x)) } : null);
  room._broFetch = chain2({ holder: ME, count: 4 });
  const stale = { tokenId: 55, address: ME, ts: Date.now() - RECHECK_MS - 1 };
  await room.state.storage.put('bro_link:bp_s', stale);
  let kicked = null;
  const real = room._broRefresh;
  /* the spy only records: the read itself is run below, on its own */
  room._broRefresh = (pid, link) => { kicked = { pid, link }; return Promise.resolve(null); };
  const restored = await room._restoreBroLink('bp_s');
  check('join with a stale link: nothing restored at once (the join never waits on the chain)', restored === null);
  check('  …but a background read is started', kicked && kicked.pid === 'bp_s', kicked);
  room._broRefresh = real;
  const next = await room._broRefresh('bp_s', stale);
  check('the read refreshes the count and keeps the worn Bro still held', next && next.count === 4 && next.tokenId === 55, next);
  check('  …stored with a new timestamp', room._store.get('bro_link:bp_s').ts > stale.ts);
  check('  …the badge back on', room.playerState['bp_s'].broN === 4 && room.playerState['bp_s'].bro === 55, room.playerState['bp_s']);
  check('  …and the player\'s own screen told (refresh: true)', sent.length === 1 && sent[0].type === 'bro_verify_result' && sent[0].ok === true && sent[0].refresh === true && sent[0].count === 4, sent);

  const sold = mkRoom();
  sold.playerState['bp_x'] = { bro: 55, broN: 2 };
  sold._broFetch = chain2({ holder: THEM, count: 0 });
  const after = await sold._broRefresh('bp_x', { tokenId: 55, address: ME, ts: 0 });
  check('a Bro since sold drops off: no id, count 0', after && after.count === 0 && after.tokenId === undefined, after);
  check('  …and the badge comes off', sold.playerState['bp_x'].bro === undefined && sold.playerState['bp_x'].broN === undefined, sold.playerState['bp_x']);

  const down = mkRoom();
  down.playerState['bp_d'] = {};
  down._broFetch = async () => { throw new Error('offline'); };
  const was = { address: ME, ts: 1, count: 3 };
  await down.state.storage.put('bro_link:bp_d', was);
  const r = await down._broRefresh('bp_d', was);
  check('a chain outage writes nothing and grants nothing (the next join tries again)', r === null && down._store.get('bro_link:bp_d').ts === 1 && down.playerState['bp_d'].broN === undefined, r);

  const twice = mkRoom();
  twice.playerState['bp_t'] = {};
  let reads = 0;
  const slow = chain2({ count: 1 });
  twice._broFetch = async (u, o) => { reads++; await new Promise((res) => setTimeout(res, 20)); return slow(u, o); };
  const lk = { address: ME, ts: 0 };
  const [a, b] = await Promise.all([twice._broRefresh('bp_t', lk), twice._broRefresh('bp_t', lk)]);
  check('two joins at once read the chain once', reads === 1 && (a === null) !== (b === null), { reads, a, b });

  const gone = mkRoom();
  gone._broFetch = chain2({ count: 2 });
  const g = await gone._broRefresh('bp_gone', { address: ME, ts: 0 });
  check('a player who left before the chain answered: stored, nothing else touched', g && g.count === 2 && !gone.dirtyPlayers.has('bp_gone'), g);
}

// ── 19. the wire and the trust boundary ──
{
  const tick = readFileSync(new URL('../src/tick.js', import.meta.url), 'utf8');
  const join = readFileSync(new URL('../src/join.js', import.meta.url), 'utf8');
  check('the tick carries the count as `brn`, absent at 0', /\.\.\.\(ps\.broN > 0 \? \{ brn: ps\.broN \} : \{\}\)/.test(tick));
  check('state_sync carries the own count as `broN`', /broN: \(this\.playerState\[session\.id\] && this\.playerState\[session\.id\]\.broN\) \|\| 0/.test(join));
  check('the worker advertises caps.broCount', /broCount: true/.test(join));
  check('`brn` / `broN` are NOT client-settable (absent from TRACK_COSMETIC_KEYS)',
    !TRACK_COSMETIC_KEYS.has('brn') && !TRACK_COSMETIC_KEYS.has('broN') && !TRACK_COSMETIC_KEYS.has('count'));
}

// ── 20. the phone's rules (src/networking/broWallet.js: no imports, node-tested) ──
{
  const W = await import('../../src/networking/broWallet.js');
  check('broCountOf: a whole positive number is the count', W.broCountOf(3) === 3 && W.broCountOf('7') === 7);
  check('broCountOf: anything else is 0', W.broCountOf(0) === 0 && W.broCountOf(-2) === 0 && W.broCountOf(1.5) === 0
    && W.broCountOf(null) === 0 && W.broCountOf(undefined) === 0 && W.broCountOf('x') === 0 && W.broCountOf({}) === 0);
  check('broCountOf: never past the collection', W.broCountOf(99999) === W.BRO_COUNT_MAX && W.BRO_COUNT_MAX === 6666);
  check('the checkmark: a verified worn Bro, or a wallet holding one or more',
    W.broBadgeOf(55, 0) === true && W.broBadgeOf(null, 2) === true && W.broBadgeOf(null, 0) === false
      && W.broBadgeOf(undefined, undefined) === false);
  check('  …the join payload\'s avatar OBJECT is not a badge (only the worker\'s number is)',
    W.broBadgeOf({ ID: 12, rank: 3 }, 0) === false);
  check('a far player\'s slim entry says nothing about the badge', W.peerEntrySlim({ x: 1, y: 2, d: 'down', z: 'wheel', vx: 0, vy: 0 }) === true);
  check('  …a full entry does', W.peerEntrySlim({ x: 1, y: 2, eqc: 'none' }) === false && W.peerEntrySlim({ x: 1, brn: 3 }) === false);
  check('  …a wire key `__proto__` is not a slim key', W.peerEntrySlim(JSON.parse('{"x":1,"__proto__":1}')) === false);
  check('caps.broCount must be exactly true',
    W.broCountSupported({ _serverCaps: { broCount: true } }) === true
      && W.broCountSupported({ _serverCaps: { broCount: 1 } }) === false
      && W.broCountSupported({ _serverCaps: {} }) === false && W.broCountSupported(null) === false);
  const { MAX_BRO_COUNT } = await import('../src/onchain.js');
  check('the phone\'s ceiling is the worker\'s', W.BRO_COUNT_MAX === MAX_BRO_COUNT);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
