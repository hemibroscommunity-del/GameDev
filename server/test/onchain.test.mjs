/* Onchain Hemi Bro ownership verification — v2.3.1576.
 *
 * server/src/onchain.js is the trust boundary for the verified-owner badge:
 * if it says a wallet holds a Bro, that player wears the badge.  Everything
 * it does is either a pure computation or a read-only RPC call, so the whole
 * module is testable with NO network — the RPC is injected.
 *
 * What this suite is actually protecting:
 *
 *  1. KECCAK.  Hand-written (Workers have no keccak, and this server ships
 *     zero dependencies).  A wrong rotation table does NOT throw — the
 *     sponge still returns 32 plausible bytes, they just aren't Keccak, and
 *     every signature check silently recovers the wrong address.  That is
 *     exactly what happened during development: the ρ offsets had a
 *     duplicated entry and produced confident garbage.  Pinned here by the
 *     official Keccak-256 vectors AND by real Ethereum selectors, which is
 *     the check that ties it to how the module is actually used.
 *
 *  2. FAIL-CLOSED.  Every rejection path must return "not verified" rather
 *     than throwing, half-succeeding, or falling back to a weaker check.  A
 *     chain outage must not hand out badges.
 */
import {
  keccak256, toHex, fromHex, personalHash,
  recoverSigner, ownerOf, verifyBroOwnership, HEMI_BROS, CHAIN,
} from '../src/onchain.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const enc = (s) => new TextEncoder().encode(s);
const hash = (s) => toHex(keccak256(enc(s)));

// ── 1. Keccak-256 official vectors ──
check('keccak256("") matches the official vector',
  hash('') === 'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470', hash(''));
check('keccak256("abc") matches the official vector',
  hash('abc') === '4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45', hash('abc'));
check('keccak256(pangram) matches the official vector',
  hash('The quick brown fox jumps over the lazy dog')
    === '4d741b6f1eb29cb2a9b9911c82f56fa8d73b04959d3d9d222895df6c0b28aa15');

// ── 2. Real Ethereum selectors — ties the hash to its actual use ──
// If keccak were subtly wrong these would not match any EVM tool on earth.
check('selector ownerOf(uint256) === 6352211e (the selector this module sends)',
  hash('ownerOf(uint256)').slice(0, 8) === '6352211e');
check('selector balanceOf(address) === 70a08231',
  hash('balanceOf(address)').slice(0, 8) === '70a08231');
check('selector transfer(address,uint256) === a9059cbb',
  hash('transfer(address,uint256)').slice(0, 8) === 'a9059cbb');
check('Transfer event topic matches',
  hash('Transfer(address,address,uint256)')
    === 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef');

// ── 3. Multi-block absorb (input > the 136-byte rate) ──
// Exercises the loop that a single-block vector cannot reach.
{
  const a136 = keccak256(enc('a'.repeat(136)));   // exactly one full block -> forces a pad-only second block
  const a300 = keccak256(enc('a'.repeat(300)));
  check('136-byte input (exact rate) produces 32 bytes', a136.length === 32);
  check('300-byte input (3 blocks) produces 32 bytes', a300.length === 32);
  check('multi-block results differ from each other', toHex(a136) !== toHex(a300));
  check('keccak is deterministic across calls',
    toHex(keccak256(enc('a'.repeat(300)))) === toHex(a300));
}

// ── 4. hex helpers round-trip ──
{
  const b = fromHex('0xdeadBEEF00');
  check('fromHex parses 0x-prefixed mixed case', toHex(b) === 'deadbeef00', toHex(b));
  check('fromHex/toHex round-trip', toHex(fromHex(toHex(b))) === toHex(b));
}

// ── 5. EIP-191 personal_sign digest ──
// The prefix length must count BYTES, not characters — a multi-byte message
// that counted characters would hash a different preimage than every wallet.
{
  const h = personalHash('hello');
  check('personalHash returns 32 bytes', h.length === 32);
  const manual = toHex(keccak256(enc('\x19Ethereum Signed Message:\n5hello')));
  check('personalHash("hello") === keccak(prefix+5+msg)', toHex(h) === manual, { got: toHex(h), manual });
  // 'é' is 2 UTF-8 bytes: the prefix must say 2, not 1.
  const acc = toHex(personalHash('é'));
  const accManual = toHex(keccak256(new Uint8Array([
    ...enc('\x19Ethereum Signed Message:\n2'), 0xc3, 0xa9,
  ])));
  check('personalHash counts BYTES for multi-byte messages', acc === accManual, { acc, accManual });
}

// ── 6. Signature shape rejection — no RPC should even be attempted ──
{
  let called = 0;
  const spy = async () => { called++; throw new Error('should not be reached'); };
  const short = await recoverSigner(keccak256(enc('x')), '0x1234', { fetchImpl: spy });
  check('a signature that is not 65 bytes is rejected', short === null);
  check('  …and no RPC call was made for it', called === 0, { called });

  // v byte outside {27,28} (and not 0/1) is malformed.
  const badV = '0x' + '11'.repeat(64) + '05';
  const r = await recoverSigner(keccak256(enc('x')), badV, { fetchImpl: spy });
  check('a signature with an illegal v byte is rejected', r === null);
  check('  …and still no RPC call', called === 0, { called });
}

// ── 7. recoverSigner against a mocked precompile ──
{
  const ADDR = '0x1111111111111111111111111111111111111111';
  let seen = null;
  const okFetch = async (url, opts) => {
    seen = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ result: '0x' + '00'.repeat(12) + ADDR.slice(2) }) };
  };
  const sig = '0x' + 'ab'.repeat(32) + 'cd'.repeat(32) + '1b';   // v = 0x1b = 27
  const got = await recoverSigner(keccak256(enc('nonce')), sig, { fetchImpl: okFetch });
  check('recoverSigner returns the recovered address, lowercased', got === ADDR.toLowerCase(), got);
  check('  …via eth_call', seen && seen.method === 'eth_call', seen && seen.method);
  check('  …to the ecrecover precompile 0x01',
    seen && seen.params[0].to === '0x0000000000000000000000000000000000000001', seen && seen.params[0].to);
  check('  …with a 128-byte payload (hash|v|r|s)',
    seen && seen.params[0].data.length === 2 + 256, seen && seen.params[0].data.length);

  // wallets that emit v=0/1 must be normalised to 27/28, not rejected
  const sig0 = '0x' + 'ab'.repeat(32) + 'cd'.repeat(32) + '00';
  const got0 = await recoverSigner(keccak256(enc('nonce')), sig0, { fetchImpl: okFetch });
  check('v=0 from a legacy wallet is normalised to 27', got0 === ADDR.toLowerCase(), got0);

  // an invalid signature makes the precompile return empty -> null, not a throw
  const emptyFetch = async () => ({ ok: true, json: async () => ({ result: '0x' }) });
  const none = await recoverSigner(keccak256(enc('n')), sig, { fetchImpl: emptyFetch });
  check('an empty precompile result means NOT verified (no throw)', none === null);

  // the zero address is never a valid signer
  const zeroFetch = async () => ({ ok: true, json: async () => ({ result: '0x' + '00'.repeat(32) }) });
  const zero = await recoverSigner(keccak256(enc('n')), sig, { fetchImpl: zeroFetch });
  check('a zero-address recovery is rejected', zero === null);
}

// ── 8. ownerOf ──
{
  const OWNER = '0x2222222222222222222222222222222222222222';
  let seen = null;
  const f = async (url, opts) => {
    seen = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ result: '0x' + '00'.repeat(12) + OWNER.slice(2) }) };
  };
  const got = await ownerOf(4242, { fetchImpl: f });
  check('ownerOf returns the holder, lowercased', got === OWNER.toLowerCase(), got);
  check('  …calls the configured collection', seen.params[0].to === HEMI_BROS, seen.params[0].to);
  check('  …with selector 6352211e + the padded token id',
    seen.params[0].data === '0x6352211e' + (4242).toString(16).padStart(64, '0'), seen.params[0].data);

  // a revert (unminted id / wrong ABI) must read as "no such token", not crash
  const revert = async () => { throw new Error('execution reverted'); };
  check('a reverting ownerOf returns null rather than throwing',
    (await ownerOf(999999, { fetchImpl: revert })) === null);
  const httpFail = async () => ({ ok: false, status: 503 });
  check('an RPC outage returns null rather than throwing',
    (await ownerOf(1, { fetchImpl: httpFail })) === null);
}

// ── 9. verifyBroOwnership — the whole decision, and it must FAIL CLOSED ──
{
  const ME = '0x3333333333333333333333333333333333333333';
  const THEM = '0x4444444444444444444444444444444444444444';
  const sig = '0x' + 'ab'.repeat(32) + 'cd'.repeat(32) + '1b';
  const word = (a) => '0x' + '00'.repeat(12) + a.slice(2);
  /* route by destination: the precompile answers the signer, the collection
     answers the holder. */
  const route = (signer, holder) => async (url, opts) => {
    const b = JSON.parse(opts.body);
    const to = b.params[0].to;
    if (to === '0x0000000000000000000000000000000000000001') {
      return { ok: true, json: async () => ({ result: signer ? word(signer) : '0x' }) };
    }
    return { ok: true, json: async () => ({ result: holder ? word(holder) : '0x' }) };
  };

  const good = await verifyBroOwnership('nonce-abc', sig, 7, { fetchImpl: route(ME, ME) });
  check('owner signing for their own Bro verifies', good.ok === true, good);
  check('  …and reports the address', good.address === ME.toLowerCase(), good.address);

  const notOwner = await verifyBroOwnership('nonce-abc', sig, 7, { fetchImpl: route(ME, THEM) });
  check('signing for someone ELSE\'s Bro is refused', notOwner.ok === false, notOwner);
  check('  …with reason not_owner', notOwner.reason === 'not_owner', notOwner.reason);

  const unminted = await verifyBroOwnership('nonce-abc', sig, 7, { fetchImpl: route(ME, null) });
  check('an unminted / non-existent token is refused', unminted.ok === false && unminted.reason === 'no_such_token', unminted);

  const badSig = await verifyBroOwnership('nonce-abc', sig, 7, { fetchImpl: route(null, ME) });
  check('an unrecoverable signature is refused', badSig.ok === false && badSig.reason === 'bad_signature', badSig);

  const down = await verifyBroOwnership('nonce-abc', sig, 7, { fetchImpl: async () => { throw new Error('offline'); } });
  check('a chain outage refuses rather than granting', down.ok === false, down);

  const malformed = await verifyBroOwnership('nonce-abc', '0xdead', 7, { fetchImpl: route(ME, ME) });
  check('a malformed signature is refused before any chain read', malformed.ok === false, malformed);
}

// ── 10. configuration is the Hemi collection the owner supplied ──
check('collection address is stored lowercase (comparisons are lowercase)',
  HEMI_BROS === HEMI_BROS.toLowerCase() && /^0x[0-9a-f]{40}$/.test(HEMI_BROS), HEMI_BROS);
check('chain id is Hemi mainnet 43111', CHAIN.id === 43111, CHAIN.id);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
