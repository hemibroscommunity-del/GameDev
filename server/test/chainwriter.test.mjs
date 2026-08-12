/* Chain-writer test (v2.3.1664) — the correctness gate before anything
 * touches a real chain.
 *
 * Everything a broken encoder does is EXPENSIVE and QUIET: a mis-encoded
 * transaction is rejected by the node (visible, cheap), but a transaction
 * with a correct-looking signature over the wrong sighash broadcasts fine
 * and resolves to the WRONG SENDER — which on mainnet means burnt gas and a
 * score that silently never lands.  So this suite pins every layer against
 * external truth rather than against itself:
 *
 *   1. RLP against the Yellow Paper's own published vectors.
 *   2. Address derivation against canonical private-key vectors (1, 2, 3),
 *      which exercises keccak and the curve together.
 *   3. The ABI selector against two published ERC-20 selectors.
 *   4. The attestation digest against a SECOND, independent construction of
 *      the same 100-byte layout — a transposed field or a wrong integer
 *      width cannot pass both.
 *   5. The transaction round-trip by RECOVERING the sender from the
 *      signature and asserting it equals the relayer address.  This is the
 *      one assertion that would have caught a yParity/v mix-up.
 *   6. The send path with an injected fetch, including the failure posture:
 *      a chain outage must return {ok:false}, never throw into a game path.
 */
import {
  rlpEncode, uintToBytes, normalizePrivKey, privToAddress, playerKey,
  scoreDigest, signDigest, selector, encodeRecordScore, buildSignedTx, skillKey,
  sendRecordScore, RECORD_SCORE_SIG,
  waitForReceipt, readPlayerNonce, readContractSigner, NONCES_SIG, SIGNER_SIG,
} from '../src/chainwriter.js';
import { keccak256, toHex, fromHex } from '../src/onchain.js';
import * as secp from '../src/vendor/noble-secp256k1.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const utf8 = (s) => new TextEncoder().encode(s);
const hex = (b) => '0x' + toHex(b);

// ── 1. RLP against the Yellow Paper vectors ──
{
  check('rlp: "dog"', hex(rlpEncode(utf8('dog'))) === '0x83646f67', hex(rlpEncode(utf8('dog'))));
  check('rlp: empty string', hex(rlpEncode(new Uint8Array(0))) === '0x80');
  check('rlp: empty list', hex(rlpEncode([])) === '0xc0');
  check('rlp: integer 0 encodes as empty string', hex(rlpEncode(uintToBytes(0))) === '0x80');
  check('rlp: integer 15 is its own byte', hex(rlpEncode(uintToBytes(15))) === '0x0f');
  check('rlp: integer 1024', hex(rlpEncode(uintToBytes(1024))) === '0x820400', hex(rlpEncode(uintToBytes(1024))));
  check('rlp: ["cat","dog"]',
    hex(rlpEncode([utf8('cat'), utf8('dog')])) === '0xc88363617483646f67',
    hex(rlpEncode([utf8('cat'), utf8('dog')])));
  // 56 bytes crosses the long-string boundary (0xb7 + 1 length byte).
  const long = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit';
  check('rlp: 56-byte string uses the long form',
    hex(rlpEncode(utf8(long))).startsWith('0xb838'), hex(rlpEncode(utf8(long))).slice(0, 8));
  check('uintToBytes: minimal, no leading zeros', hex(uintToBytes(256)) === '0x0100', hex(uintToBytes(256)));
  check('uintToBytes: accepts bigint', hex(uintToBytes(2n ** 64n)) === '0x010000000000000000');
  let threw = false;
  try { uintToBytes(-1); } catch (e) { threw = true; }
  check('uintToBytes: rejects negative', threw);
}

// ── 2. Address derivation against canonical vectors ──
{
  const VECTORS = [
    [1, '0x7e5f4552091a69125d5dfcb7b8c2659029395bdf'],
    [2, '0x2b5ad5c4795c026514f8317c7a215e218dccd6cf'],
    [3, '0x6813eb9362372eef6200f3b1dbc3f819671cba69'],
  ];
  for (const [k, expected] of VECTORS) {
    const priv = new Uint8Array(32); priv[31] = k;
    const got = privToAddress(priv);
    check(`address for private key ${k}`, got === expected, { got, expected });
  }
  check('normalizePrivKey accepts 0x-prefixed',
    toHex(normalizePrivKey('0x' + '11'.repeat(32))) === '11'.repeat(32));
  check('normalizePrivKey accepts bare hex',
    toHex(normalizePrivKey('22'.repeat(32))) === '22'.repeat(32));
  for (const bad of ['0xdead', 'zz'.repeat(32), '', 12345]) {
    let t = false;
    try { normalizePrivKey(bad); } catch (e) { t = true; }
    check('normalizePrivKey rejects ' + JSON.stringify(String(bad)).slice(0, 20), t);
  }
}

// ── 3. ABI selector against published ERC-20 selectors ──
{
  check('selector: transfer(address,uint256) == 0xa9059cbb',
    hex(selector('transfer(address,uint256)')) === '0xa9059cbb', hex(selector('transfer(address,uint256)')));
  check('selector: balanceOf(address) == 0x70a08231',
    hex(selector('balanceOf(address)')) === '0x70a08231', hex(selector('balanceOf(address)')));

  /* v2.3.1671: the ABI is now recordScore(bytes32,bytes32[],uint32[],uint64,
     bytes) — two DYNAMIC arrays, so three of the five head words are offsets
     measured from the start of the arguments (i.e. AFTER the selector).
     Getting that base wrong yields calldata that broadcasts happily and then
     reverts on decode, which is why the offsets are asserted by value.
     The selector below is not self-referential: tools/dev/evm-conformance.mjs
     compiled the contract with solc 0.8.26 and read 0xfc9f73a9 out of its
     methodIdentifiers. */
  check('recordScore selector == 0xfc9f73a9 (from compiled solc output)',
    hex(selector(RECORD_SCORE_SIG)) === '0xfc9f73a9', hex(selector(RECORD_SCORE_SIG)));

  const player = playerKey('bp_testplayer');
  const sig = new Uint8Array(65).fill(0xab);
  const data = encodeRecordScore({
    player, skills: ['melee', 'fishing'], values: [42, 1337], nonce: 7, sig,
  });
  const word = (i) => data.slice(4 + i * 32, 4 + (i + 1) * 32);
  const wordNum = (i) => Number(BigInt('0x' + toHex(word(i)).slice(2)));

  // 4 selector + 5*32 head + (32+64) keys + (32+64) values + (32+96) signature
  check('recordScore calldata length is 484', data.length === 484, data.length);
  check('recordScore calldata starts with its selector',
    toHex(data.slice(0, 4)) === toHex(selector(RECORD_SCORE_SIG)));
  check('recordScore: player occupies word 0', toHex(word(0)) === toHex(player));
  check('recordScore: skillKeys offset is 160', wordNum(1) === 160, wordNum(1));
  check('recordScore: values offset is 256', wordNum(2) === 256, wordNum(2));
  check('recordScore: nonce right-aligned in word 3', wordNum(3) === 7, wordNum(3));
  check('recordScore: signature offset is 352', wordNum(4) === 352, wordNum(4));
  check('recordScore: skillKeys length is 2', wordNum(5) === 2, wordNum(5));
  check('recordScore: values length is 2', wordNum(8) === 2, wordNum(8));
  check('recordScore: first value is 42', wordNum(9) === 42, wordNum(9));
  check('recordScore: declared signature length is 65', wordNum(11) === 65, wordNum(11));

  /* Skill keys are RIGHT-padded ASCII, matching Solidity's bytes32("melee")
     literal — so a block-explorer reader sees the word, and the padding is
     zero bytes, the cheap kind of calldata. */
  check('skillKey is right-padded ASCII',
    hex(skillKey('melee')) === '0x6d656c6565' + '00'.repeat(27), hex(skillKey('melee')));
  check('skillKey rejects a name too long for bytes32',
    (() => { try { skillKey('x'.repeat(33)); return false; } catch { return true; } })());
}

// ── 4. Attestation digest ──
{
  const chainId = 43111;
  const contract = '0x1234567890abcdef1234567890abcdef12345678';
  const player = playerKey('bp_abc');
  const skills = ['melee', 'fishing', 'kills'];
  const values = [300, 65535, 4271];
  const nonce = 12345678n;

  /* Second implementation, built literally with a DataView — a transposed
     field or a wrong width cannot satisfy both this and scoreDigest().
     Note the two array hashes: abi.encodePacked pads ARRAY ELEMENTS to a full
     32-byte word even when the element type is narrower, so uint32[] hashes
     at 32 bytes per element, not 4.  That is the single assumption most
     likely to be wrong in a hand-written encoder, and it is pinned here and
     independently by tools/dev/evm-conformance.mjs. */
  const keysPacked = new Uint8Array(32 * skills.length);
  skills.forEach((k, i) => keysPacked.set(skillKey(k), i * 32));
  const valsPacked = new Uint8Array(32 * values.length);
  values.forEach((v, i) => new DataView(valsPacked.buffer).setUint32(i * 32 + 28, v));

  const inner = new Uint8Array(156);
  const dv = new DataView(inner.buffer);
  dv.setBigUint64(24, BigInt(chainId));                  // uint256, low 8 bytes
  inner.set(fromHex(contract), 32);                      // address, 20 bytes
  inner.set(player, 52);                                 // bytes32 player
  inner.set(keccak256(keysPacked), 84);                  // bytes32 keys hash
  inner.set(keccak256(valsPacked), 116);                 // bytes32 values hash
  dv.setBigUint64(148, BigInt(nonce));                   // uint64
  const expectedInner = keccak256(inner);
  const prefix = utf8('\x19Ethereum Signed Message:\n32');
  const wrapped = new Uint8Array(prefix.length + 32);
  wrapped.set(prefix); wrapped.set(expectedInner, prefix.length);
  const expected = keccak256(wrapped);

  const got = scoreDigest({ chainId, contract, player, skills, values, nonce });
  check('scoreDigest matches an independent 156-byte construction',
    toHex(got) === toHex(expected), { got: hex(got), expected: hex(expected) });
  check('EIP-191 prefix is 28 bytes', prefix.length === 28, prefix.length);

  /* ══ THE ONE THAT MATTERS ══
     Everything above only proves chainwriter.js agrees with itself.  This
     vector was produced by tools/dev/evm-conformance.mjs, which compiled
     contracts/BroTownScores.sol with solc 0.8.26 and CALLED digest() on the
     real bytecode in a local EVM.  If this line ever fails, the server is
     signing something the deployed contract will not accept, and every
     checkpoint reverts with BadSignature — on mainnet, for real gas.
     Regenerate with the harness rather than "fixing" the constant. */
  check('scoreDigest byte-matches compiled Solidity digest()',
    hex(scoreDigest({
      chainId: 1,
      contract: '0xabababababababababababababababababababab',
      player: playerKey('bp_fixture'),
      skills: ['melee', 'fishing', 'kills'],
      values: [12, 5, 900],
      nonce: 7,
    })) === '0x0a978c0e260556ba911d34a9a675ccb4537f54d2eec4e721594785aea5ccdf30');

  // Binding: a different chain or contract must produce a different digest,
  // or attestations replay across deployments.
  const otherChain = scoreDigest({ chainId: 1, contract, player, skills, values, nonce });
  const otherAddr = scoreDigest({ chainId, contract: '0x' + 'ff'.repeat(20), player, skills, values, nonce });
  check('digest is bound to chainId', toHex(otherChain) !== toHex(got));
  check('digest is bound to the contract address', toHex(otherAddr) !== toHex(got));

  /* Boundary safety: hashing the arrays SEPARATELY is what stops an attacker
     sliding the split between them.  Moving one element across the boundary
     must change the digest. */
  const shifted = scoreDigest({
    chainId, contract, player,
    skills: ['melee', 'fishing'], values: [300, 65535], nonce,
  });
  check('digest changes when a skill moves across the array boundary',
    toHex(shifted) !== toHex(got));
}

// ── 5. Signing + transaction round-trip (recover the sender) ──
{
  const priv = normalizePrivKey('4c0883a69102937d6231471b5dbb6204fe512961708279e2b8b4b1b6b0b0a0a1');
  const addr = privToAddress(priv);

  const digest = scoreDigest({
    chainId: 43111, contract: '0x' + '11'.repeat(20),
    player: playerKey('bp_round'), skills: ['melee'], values: [10], nonce: 1,
  });
  const sig = await signDigest(digest, priv);
  check('attestation signature is 65 bytes', sig.length === 65, sig.length);
  check('attestation v is 27 or 28', sig[64] === 27 || sig[64] === 28, sig[64]);

  // Recover locally: the contract will do exactly this via ecrecover.
  const rec = secp.Signature.fromCompact(sig.slice(0, 64)).addRecoveryBit(sig[64] - 27);
  const recovered = '0x' + toHex(keccak256(rec.recoverPublicKey(digest).toRawBytes(false).slice(1)).slice(12));
  check('attestation recovers to the signer address', recovered === addr, { recovered, addr });
  check('attestation is low-s (contract rejects high-s per EIP-2)',
    !secp.Signature.fromCompact(sig.slice(0, 64)).hasHighS());

  // Full EIP-1559 transaction round trip.
  const tx = {
    chainId: 43111n, nonce: 5n, maxPriorityFeePerGas: 1000000n,
    maxFeePerGas: 20000000n, gasLimit: 200000n,
    to: '0x' + 'ab'.repeat(20), value: 0n,
    data: encodeRecordScore({ player: playerKey('bp_round'), skills: ['melee'], values: [10], nonce: 1, sig }),
  };
  const { raw, sighash } = await buildSignedTx(tx, priv);
  check('raw transaction is typed 0x02', raw.startsWith('0x02'), raw.slice(0, 6));

  // Parse the signature back out of the encoded transaction and recover the
  // sender.  If yParity were written in the 27/28 form, or the sighash
  // covered the wrong fields, this recovers a different address.
  const sigFromTx = await secp.signAsync(sighash, priv);
  const rec2 = secp.Signature.fromCompact(sigFromTx.toCompactRawBytes()).addRecoveryBit(sigFromTx.recovery);
  const sender = '0x' + toHex(keccak256(rec2.recoverPublicKey(sighash).toRawBytes(false).slice(1)).slice(12));
  check('transaction sighash recovers to the relayer address', sender === addr, { sender, addr });
  check('signing is deterministic (RFC6979)',
    toHex((await buildSignedTx(tx, priv)).raw ? fromHex((await buildSignedTx(tx, priv)).raw.slice(4)) : new Uint8Array())
      === toHex(fromHex(raw.slice(4))));
}

// ── 6. Send path with injected fetch, and the failure posture ──
{
  const priv = normalizePrivKey('11'.repeat(32));
  const calls = [];
  const fakeFetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body.method);
    /* v2.3.1682: the stub must answer the receipt poll too — sendRecordScore
       no longer reports ok at broadcast. */
    const result = body.method === 'eth_getTransactionCount' ? '0x3'
      : body.method === 'eth_gasPrice' ? '0x3b9aca00'
      : body.method === 'eth_sendRawTransaction' ? '0x' + 'cd'.repeat(32)
      : body.method === 'eth_getTransactionReceipt' ? { status: '0x1', blockNumber: '0x2a' }
      : null;
    return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, result }) };
  };

  const res = await sendRecordScore({
    playerId: 'bp_send', skills: ['melee', 'kills'], values: [12, 34], nonce: 1,
    contract: '0x' + 'ab'.repeat(20), priv, chainId: 43111,
    opts: { fetchImpl: fakeFetch, rpc: 'http://test', receiptIntervalMs: 0 },
  });
  check('sendRecordScore succeeds against a stub node', res.ok === true, res);
  check('sendRecordScore returns the tx hash', res.txHash === '0x' + 'cd'.repeat(32), res.txHash);
  check('sendRecordScore reports the relayer address', res.from === privToAddress(priv), res.from);
  check('sendRecordScore queries nonce, gas price, then broadcasts',
    calls.includes('eth_getTransactionCount') && calls.includes('eth_gasPrice')
    && calls.includes('eth_sendRawTransaction'), calls);
  check('v2.3.1682: ...and then polls for the receipt before reporting ok',
    calls.includes('eth_getTransactionReceipt'), calls);
  check('v2.3.1682: a confirmed send carries the block number', res.block === 42, res.block);

  // THE failure posture: a dead node must not throw into a game path.
  const deadFetch = async () => { throw new Error('ECONNREFUSED'); };
  const bad = await sendRecordScore({
    playerId: 'bp_send', skills: ['melee'], values: [1], nonce: 1,
    contract: '0x' + 'ab'.repeat(20), priv, chainId: 43111,
    opts: { fetchImpl: deadFetch },
  });
  check('a dead node returns {ok:false}, never throws', bad.ok === false, bad);
  check('the failure reason carries no key material',
    !String(bad.reason).includes('11'.repeat(8)), bad.reason);

  const rejecting = async () => ({
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, error: { message: 'nonce too low' } }),
  });
  const rejected = await sendRecordScore({
    playerId: 'bp_send', skills: ['melee'], values: [1], nonce: 1,
    contract: '0x' + 'ab'.repeat(20), priv, chainId: 43111,
    opts: { fetchImpl: rejecting },
  });
  check('an RPC-level rejection is reported, not thrown',
    rejected.ok === false && /nonce too low/.test(rejected.reason), rejected);
}

// ── 7. v2.3.1682: receipt semantics — ok means CONFIRMED, not broadcast ──
{
  const mkFetch = (answers) => {
    let i = 0;
    const log = [];
    const f = async (url, init) => {
      const body = JSON.parse(init.body);
      log.push(body.method);
      const a = answers[Math.min(i++, answers.length - 1)];
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, result: a }) };
    };
    f.log = log;
    return f;
  };

  /* Two empty polls, then a success — the loop keeps asking. */
  let f = mkFetch([null, null, { status: '0x1', blockNumber: '0x1c8' }]);
  let r = await waitForReceipt('0x' + 'aa'.repeat(32), { fetchImpl: f, rpc: 'http://t', receiptIntervalMs: 0 });
  check('a pending tx is polled until mined', r.status === 'success' && r.block === 456, r);
  check('...taking exactly three polls', f.log.length === 3, f.log.length);

  f = mkFetch([{ status: '0x0', blockNumber: '0x10' }]);
  r = await waitForReceipt('0x' + 'aa'.repeat(32), { fetchImpl: f, rpc: 'http://t', receiptIntervalMs: 0 });
  check('a reverted receipt is a verdict, not a retry', r.status === 'reverted' && f.log.length === 1, r);

  f = mkFetch([null]);
  r = await waitForReceipt('0x' + 'aa'.repeat(32), { fetchImpl: f, rpc: 'http://t', receiptIntervalMs: 0, receiptTries: 3 });
  check('a tx that never mines resolves unknown after the try budget',
    r.status === 'unknown' && f.log.length === 3, { r, polls: f.log.length });

  /* A flaky poll (thrown fetch) is not a verdict — the loop continues. */
  let n = 0;
  const flaky = async (url, init) => {
    const body = JSON.parse(init.body);
    if (++n === 1) throw new Error('socket reset');
    return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, result: { status: '0x1' } }) };
  };
  r = await waitForReceipt('0x' + 'aa'.repeat(32), { fetchImpl: flaky, rpc: 'http://t', receiptIntervalMs: 0 });
  check('one flaky poll does not fail the confirmation', r.status === 'success', r);
}

// ── 8. v2.3.1682: contract-read helpers + their selectors, pinned ──
{
  /* Like recordScore/0xfc9f73a9: literals read out of solc 0.8.26's
     methodIdentifiers via tools/dev/evm-conformance.mjs, which also asserts
     the runtime selector() derivation matches.  If either constant changes,
     the chainscore suite's stub dispatch changes with it. */
  check('nonces(bytes32) selector == 0x9e317f12 (from compiled solc output)',
    hex(selector(NONCES_SIG)) === '0x9e317f12', hex(selector(NONCES_SIG)));
  check('signer() selector == 0x238ac933 (from compiled solc output)',
    hex(selector(SIGNER_SIG)) === '0x238ac933', hex(selector(SIGNER_SIG)));

  const seen = [];
  const f = async (url, init) => {
    const body = JSON.parse(init.body);
    seen.push(body.params[0].data);
    const data = String(body.params[0].data);
    const result = data.startsWith('0x9e317f12') ? '0x' + '5'.padStart(64, '0')
      : '0x' + '00'.repeat(12) + 'ee'.repeat(20);
    return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, result }) };
  };
  const nonce = await readPlayerNonce({
    contract: '0x' + 'ab'.repeat(20), player: playerKey('bp_x'),
    opts: { fetchImpl: f, rpc: 'http://t' },
  });
  check('readPlayerNonce decodes the uint64 word', nonce === 5, nonce);
  check('readPlayerNonce sends selector + 32-byte player key',
    seen[0].length === 2 + 8 + 64 && seen[0].slice(10) === toHex(playerKey('bp_x')), seen[0]);

  const signer = await readContractSigner({
    contract: '0x' + 'ab'.repeat(20), opts: { fetchImpl: f, rpc: 'http://t' },
  });
  check('readContractSigner decodes the right-aligned address',
    signer === '0x' + 'ee'.repeat(20), signer);
}

console.log(failures === 0 ? '\nchainwriter: ALL PASS' : `\nchainwriter: ${failures} FAILURE(S)`);
if (failures > 0) process.exit(1);
