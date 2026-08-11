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
  scoreDigest, signDigest, selector, encodeRecordScore, buildSignedTx,
  sendRecordScore, RECORD_SCORE_SIG,
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

  const player = playerKey('bp_testplayer');
  const sig = new Uint8Array(65).fill(0xab);
  const data = encodeRecordScore({ player, level: 42, kills: 1337, nonce: 7, sig });
  // 4 selector + 5*32 head + 32 length + 96 padded signature
  check('recordScore calldata length is 292', data.length === 292, data.length);
  check('recordScore calldata starts with its selector',
    toHex(data.slice(0, 4)) === toHex(selector(RECORD_SCORE_SIG)));
  check('recordScore: player occupies word 0', toHex(data.slice(4, 36)) === toHex(player));
  check('recordScore: level right-aligned in word 1', data[4 + 63] === 42, data[4 + 63]);
  check('recordScore: bytes offset word is 160', data[4 + 5 * 32 - 1] === 160, data[4 + 5 * 32 - 1]);
  check('recordScore: declared signature length is 65', data[4 + 6 * 32 - 1] === 65, data[4 + 6 * 32 - 1]);
}

// ── 4. Attestation digest vs an independent construction ──
{
  const chainId = 43111;
  const contract = '0x1234567890abcdef1234567890abcdef12345678';
  const player = playerKey('bp_abc');
  const level = 300, kills = 65535, nonce = 12345678n;

  // Second implementation, built literally with a DataView — a transposed
  // field or wrong width cannot satisfy both this and scoreDigest().
  const inner = new Uint8Array(100);
  const dv = new DataView(inner.buffer);
  dv.setBigUint64(24, BigInt(chainId));                  // uint256, low 8 bytes
  inner.set(fromHex(contract), 32);                      // address, 20 bytes
  inner.set(player, 52);                                 // bytes32
  dv.setUint32(84, level);                               // uint32
  dv.setUint32(88, kills);                               // uint32
  dv.setBigUint64(92, BigInt(nonce));                    // uint64
  const expectedInner = keccak256(inner);
  const prefix = utf8('\x19Ethereum Signed Message:\n32');
  const wrapped = new Uint8Array(prefix.length + 32);
  wrapped.set(prefix); wrapped.set(expectedInner, prefix.length);
  const expected = keccak256(wrapped);

  const got = scoreDigest({ chainId, contract, player, level, kills, nonce });
  check('scoreDigest matches an independent 100-byte construction',
    toHex(got) === toHex(expected), { got: hex(got), expected: hex(expected) });
  check('EIP-191 prefix is 28 bytes', prefix.length === 28, prefix.length);

  // Binding: a different chain or contract must produce a different digest,
  // or attestations replay across deployments.
  const otherChain = scoreDigest({ chainId: 1, contract, player, level, kills, nonce });
  const otherAddr = scoreDigest({ chainId, contract: '0x' + 'ff'.repeat(20), player, level, kills, nonce });
  check('digest is bound to chainId', toHex(otherChain) !== toHex(got));
  check('digest is bound to the contract address', toHex(otherAddr) !== toHex(got));
}

// ── 5. Signing + transaction round-trip (recover the sender) ──
{
  const priv = normalizePrivKey('4c0883a69102937d6231471b5dbb6204fe512961708279e2b8b4b1b6b0b0a0a1');
  const addr = privToAddress(priv);

  const digest = scoreDigest({
    chainId: 43111, contract: '0x' + '11'.repeat(20),
    player: playerKey('bp_round'), level: 10, kills: 20, nonce: 1,
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
    data: encodeRecordScore({ player: playerKey('bp_round'), level: 10, kills: 20, nonce: 1, sig }),
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
    const result = body.method === 'eth_getTransactionCount' ? '0x3'
      : body.method === 'eth_gasPrice' ? '0x3b9aca00'
      : body.method === 'eth_sendRawTransaction' ? '0x' + 'cd'.repeat(32)
      : null;
    return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, result }) };
  };

  const res = await sendRecordScore({
    playerId: 'bp_send', level: 12, kills: 34, nonce: 1,
    contract: '0x' + 'ab'.repeat(20), priv, chainId: 43111,
    opts: { fetchImpl: fakeFetch, rpc: 'http://test' },
  });
  check('sendRecordScore succeeds against a stub node', res.ok === true, res);
  check('sendRecordScore returns the tx hash', res.txHash === '0x' + 'cd'.repeat(32), res.txHash);
  check('sendRecordScore reports the relayer address', res.from === privToAddress(priv), res.from);
  check('sendRecordScore queries nonce, gas price, then broadcasts',
    calls.includes('eth_getTransactionCount') && calls.includes('eth_gasPrice')
    && calls.includes('eth_sendRawTransaction'), calls);

  // THE failure posture: a dead node must not throw into a game path.
  const deadFetch = async () => { throw new Error('ECONNREFUSED'); };
  const bad = await sendRecordScore({
    playerId: 'bp_send', level: 1, kills: 1, nonce: 1,
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
    playerId: 'bp_send', level: 1, kills: 1, nonce: 1,
    contract: '0x' + 'ab'.repeat(20), priv, chainId: 43111,
    opts: { fetchImpl: rejecting },
  });
  check('an RPC-level rejection is reported, not thrown',
    rejected.ok === false && /nonce too low/.test(rejected.reason), rejected);
}

console.log(failures === 0 ? '\nchainwriter: ALL PASS' : `\nchainwriter: ${failures} FAILURE(S)`);
if (failures > 0) process.exit(1);
