/* ═══ v2.3.1664: CHAIN WRITER — the Worker's ability to SEND ═══
 *
 * Until now the Worker could only READ Hemi (onchain.js: `ownerOf` for the
 * Hemi Bros badge, plus the ecrecover precompile).  It held no key, had no
 * curve library, and never built a transaction.  This module adds exactly
 * one capability: sign and broadcast a score attestation to the
 * BroTownScores contract (contracts/BroTownScores.sol).
 *
 * WHAT IS REUSED, DELIBERATELY.  keccak-256 and the hex helpers already
 * exist in onchain.js and are correct — verified against the canonical
 * "private key 1 → 0x7E5F4552091A69125d5DfCb7b8C2659029395BdF" vector, which
 * exercises keccak and the curve together.  `rpcCall` already carries an
 * injectable `fetchImpl`, so every path below is testable with no network.
 * Nothing here re-implements a primitive that was already there.
 *
 * WHAT IS NEW: RLP encoding, EIP-1559 transaction assembly, ABI encoding for
 * one function, and secp256k1 signing via the vendored noble library
 * (src/vendor/noble-secp256k1.js — Web Crypto implements P-256/384/521 but
 * NOT secp256k1, so a library is unavoidable).
 *
 * KEY HANDLING.  The relayer key arrives as `env.RELAYER_KEY`, a Cloudflare
 * secret.  It is read at the call site, passed down as bytes, and never
 * stored on `this`, never logged, never echoed, and never sent to a client.
 * Every error thrown from this module is scrubbed of key material by
 * construction: no error message interpolates a key.
 *
 * FAILURE POSTURE.  A chain outage MUST NOT affect gameplay.  Every entry
 * point resolves to a {ok:false, reason} result rather than throwing into a
 * game path, and callers treat a failed write as a no-op to retry later.
 */

import * as secp from './vendor/noble-secp256k1.js';
import { keccak256, toHex, fromHex, rpcCall, CHAIN } from './onchain.js';

/* ── RLP (Ethereum Yellow Paper appendix B) ──────────────────────────────
 * Two shapes only: a byte string, or a list of items.  Integers are encoded
 * as their MINIMAL big-endian byte string (no leading zeros; zero is the
 * empty string) — getting that wrong produces a transaction that encodes
 * fine and is rejected by every node, so `uintToBytes` is pinned by test
 * vectors in test/chainwriter.test.mjs. */

/** Minimal big-endian bytes for a non-negative integer. 0 → empty. */
export function uintToBytes(value) {
  let n = typeof value === 'bigint' ? value : BigInt(value);
  if (n < 0n) throw new Error('negative not encodable');
  if (n === 0n) return new Uint8Array(0);
  const out = [];
  while (n > 0n) { out.unshift(Number(n & 0xffn)); n >>= 8n; }
  return new Uint8Array(out);
}

function encodeLength(len, offset) {
  if (len < 56) return new Uint8Array([offset + len]);
  const lenBytes = uintToBytes(len);
  const out = new Uint8Array(1 + lenBytes.length);
  out[0] = offset + 55 + lenBytes.length;
  out.set(lenBytes, 1);
  return out;
}

function concat(chunks) {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/** RLP-encode a Uint8Array (byte string) or an Array (list, recursively). */
export function rlpEncode(item) {
  if (Array.isArray(item)) {
    const body = concat(item.map(rlpEncode));
    return concat([encodeLength(body.length, 0xc0), body]);
  }
  const bytes = item instanceof Uint8Array ? item : uintToBytes(item);
  if (bytes.length === 1 && bytes[0] < 0x80) return bytes;
  return concat([encodeLength(bytes.length, 0x80), bytes]);
}

/* ── keys + addresses ───────────────────────────────────────────────────*/

/** Normalize a 0x-prefixed or bare 32-byte hex private key to bytes. */
export function normalizePrivKey(hex) {
  if (typeof hex !== 'string') throw new Error('private key must be a hex string');
  const h = hex.trim().startsWith('0x') ? hex.trim().slice(2) : hex.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(h)) throw new Error('private key must be 32 hex bytes');
  return fromHex(h);
}

/** The 0x address for a private key: last 20 bytes of keccak(uncompressed
 *  pubkey without its 0x04 prefix). */
export function privToAddress(priv) {
  const pub = secp.getPublicKey(priv, false).slice(1);
  return '0x' + toHex(keccak256(pub).slice(12));
}

/* ── the attestation digest ─────────────────────────────────────────────
 * MUST byte-match BroTownScores.digest():
 *   inner  = keccak(abi.encodePacked(uint256 chainId, address contract,
 *                                    bytes32 player,
 *                                    keccak(abi.encodePacked(bytes32[] keys)),
 *                                    keccak(abi.encodePacked(uint32[] vals)),
 *                                    uint64 nonce))                 // 156 B
 *   digest = keccak("\x19Ethereum Signed Message:\n32" || inner)     //  60 B
 *
 * The chainId and contract address are inside the inner hash so an
 * attestation cannot be replayed onto another chain or another deployment.
 *
 * The two arrays are hashed SEPARATELY, then folded in as fixed-size words.
 * Concatenating two dynamic arrays directly would let an attacker slide the
 * boundary between them and produce a different (keys, values) pair with the
 * same preimage; hashing first makes every component fixed-width, so there is
 * no boundary to move.
 *
 * SOLIDITY GOTCHA, and the reason the conformance test exists: inside
 * abi.encodePacked, ARRAY ELEMENTS ARE PADDED TO 32 BYTES even when the
 * element type is smaller.  So uint32[] hashes as 32 bytes per element, not 4
 * — hence beBytes(v, 32) below.  A standalone uint32 argument would pack to 4.
 * If you change either side, change BOTH. */

function beBytes(value, width) {
  let n = typeof value === 'bigint' ? value : BigInt(value);
  const out = new Uint8Array(width);
  for (let i = width - 1; i >= 0; i--) { out[i] = Number(n & 0xffn); n >>= 8n; }
  if (n !== 0n) throw new Error('value overflows ' + width + ' bytes');
  return out;
}

/** keccak256 of the player's stable game id — the raw `bp_` id never goes
 *  on a public chain. */
export function playerKey(playerId) {
  return keccak256(new TextEncoder().encode(String(playerId)));
}

/** A skill's short name as a bytes32 key — the same value Solidity produces
 *  for bytes32("fishing"): ASCII, RIGHT-padded with zeros.  Readable in a
 *  block explorer, and cheap: the padding is zero bytes, the cheap kind of
 *  calldata. */
export function skillKey(name) {
  const s = String(name);
  const bytes = new TextEncoder().encode(s);
  if (bytes.length > 32) throw new Error('skill name too long for bytes32: ' + s);
  const out = new Uint8Array(32);
  out.set(bytes);            // right-padded, matching Solidity's bytes32 literal
  return out;
}

export function scoreDigest({ chainId, contract, player, skills, values, nonce }) {
  const keyBytes = skills.map((k) => (k instanceof Uint8Array ? k : skillKey(k)));
  /* 32 bytes per element on BOTH arrays — abi.encodePacked pads array
     elements to a full word even when the element type is narrower. */
  const keysHash = keccak256(concat(keyBytes));
  const valsHash = keccak256(concat(values.map((v) => beBytes(v, 32))));
  const inner = keccak256(concat([
    beBytes(chainId, 32),
    fromHex(contract),
    player instanceof Uint8Array ? player : fromHex(player),
    keysHash,
    valsHash,
    beBytes(nonce, 8),
  ]));
  const prefix = new TextEncoder().encode('\x19Ethereum Signed Message:\n32');
  return keccak256(concat([prefix, inner]));
}

/** Sign a 32-byte digest, returning the 65-byte r||s||v signature the
 *  contract's ecrecover expects (v = 27/28).  noble emits low-s by default,
 *  which is what the contract's EIP-2 guard requires. */
export async function signDigest(digest, priv) {
  const sig = await secp.signAsync(digest, priv);
  const compact = sig.toCompactRawBytes();          // r||s, 64 bytes
  const out = new Uint8Array(65);
  out.set(compact);
  out[64] = sig.recovery + 27;
  return out;
}

/* ── ABI encoding for
 *    recordScore(bytes32,bytes32[],uint32[],uint64,bytes)            ───────
 *
 * Standard ABI (NOT the packed form used by the digest): a five-slot head of
 * static values and offsets, then each dynamic tail in argument order.  Both
 * arrays and the signature are dynamic, so three of the five head slots are
 * offsets measured from the start of the arguments — i.e. AFTER the 4-byte
 * selector.  Getting that base wrong is the classic way to produce calldata
 * that broadcasts happily and then reverts on decode. */

export const RECORD_SCORE_SIG = 'recordScore(bytes32,bytes32[],uint32[],uint64,bytes)';

export function selector(signature) {
  return keccak256(new TextEncoder().encode(signature)).slice(0, 4);
}

export function encodeRecordScore({ player, skills, values, nonce, sig }) {
  const keyBytes = skills.map((k) => (k instanceof Uint8Array ? k : skillKey(k)));
  const n = keyBytes.length;
  if (values.length !== n) throw new Error('skills/values length mismatch');

  const HEAD = 5 * 32;
  const keysOff = HEAD;
  const valsOff = keysOff + 32 + n * 32;
  const sigOff = valsOff + 32 + n * 32;

  const head = concat([
    player instanceof Uint8Array ? player : fromHex(player),
    beBytes(keysOff, 32),
    beBytes(valsOff, 32),
    beBytes(nonce, 32),
    beBytes(sigOff, 32),
  ]);

  const keysTail = concat([beBytes(n, 32), ...keyBytes]);
  const valsTail = concat([beBytes(n, 32), ...values.map((v) => beBytes(v, 32))]);

  const sigBytes = sig instanceof Uint8Array ? sig : fromHex(sig);
  const padded = new Uint8Array(Math.ceil(sigBytes.length / 32) * 32);
  padded.set(sigBytes);
  const sigTail = concat([beBytes(sigBytes.length, 32), padded]);

  return concat([selector(RECORD_SCORE_SIG), head, keysTail, valsTail, sigTail]);
}

/* ── EIP-1559 transaction ───────────────────────────────────────────────
 * type 2:
 *   sighash = keccak(0x02 || rlp([chainId, nonce, maxPriorityFee, maxFee,
 *                                 gas, to, value, data, accessList]))
 *   raw     = 0x02 || rlp([...same..., yParity, r, s])
 * yParity is the recovery bit RAW (0/1) — not the 27/28 form used for
 * personal_sign.  Mixing those two up yields a transaction that broadcasts
 * and then resolves to the wrong sender, which is why the round-trip test
 * recovers the sender and asserts it equals the relayer address. */

export async function buildSignedTx(tx, priv) {
  const fields = [
    uintToBytes(tx.chainId),
    uintToBytes(tx.nonce),
    uintToBytes(tx.maxPriorityFeePerGas),
    uintToBytes(tx.maxFeePerGas),
    uintToBytes(tx.gasLimit),
    fromHex(tx.to),
    uintToBytes(tx.value || 0),
    tx.data instanceof Uint8Array ? tx.data : fromHex(tx.data || '0x'),
    [],                                              // empty access list
  ];
  const sighash = keccak256(concat([new Uint8Array([0x02]), rlpEncode(fields)]));
  const sig = await secp.signAsync(sighash, priv);
  const signed = fields.concat([
    uintToBytes(sig.recovery),                       // yParity, RAW 0/1
    uintToBytes(sig.r),
    uintToBytes(sig.s),
  ]);
  return {
    raw: '0x02' + toHex(rlpEncode(signed)),
    sighash,
  };
}

/* ── the send path ──────────────────────────────────────────────────────*/

/** Pull nonce + fee data and broadcast. Returns {ok, txHash} | {ok:false,
 *  reason}.  Never throws into a caller: a chain outage is not a game bug. */
export async function sendRecordScore({
  playerId, skills, values, nonce, contract, priv, chainId, opts = {},
}) {
  try {
    if (!Array.isArray(skills) || !skills.length) return { ok: false, reason: 'no-skills' };
    const cid = chainId || CHAIN.id;
    const from = privToAddress(priv);
    const player = playerKey(playerId);

    const attestation = await signDigest(
      scoreDigest({ chainId: cid, contract, player, skills, values, nonce }), priv);
    const data = encodeRecordScore({ player, skills, values, nonce, sig: attestation });

    const [txNonceHex, feeHex] = await Promise.all([
      rpcCall('eth_getTransactionCount', [from, 'pending'], opts),
      rpcCall('eth_gasPrice', [], opts),
    ]);
    const baseFee = BigInt(feeHex);
    /* Headroom over the observed price: a checkpoint that lands a block late
       costs nothing, one that never lands is a silently missing score. */
    const maxFeePerGas = baseFee * 2n;
    const maxPriorityFeePerGas = baseFee / 10n > 0n ? baseFee / 10n : 1n;

    const { raw } = await buildSignedTx({
      chainId: cid,
      nonce: BigInt(txNonceHex),
      maxPriorityFeePerGas,
      maxFeePerGas,
      /* MEASURED, not guessed.  tools/dev/evm-conformance.mjs runs the real
         compiled contract in a local EVM: a first-ever 14-skill write costs
         1,087,613 gas of execution.  The worst case per skill is THREE cold
         SSTOREs (the level itself, the `_seenSkill` flag, and the push onto
         `skills`) ≈ 66k, not the one I first assumed — an earlier version of
         this line budgeted 45k per skill and would have run out of gas on
         the very first mainnet checkpoint.
         A gas LIMIT is a ceiling, not a charge: unused gas is refunded, so
         over-estimating costs nothing while under-estimating burns the whole
         fee on a failed transaction.  Hence ~35% headroom over measured. */
      gasLimit: 250000n + 90000n * BigInt(skills.length),
      to: contract,
      value: 0n,
      data,
    }, priv);

    const txHash = await rpcCall('eth_sendRawTransaction', [raw], opts);
    return { ok: true, txHash, from };
  } catch (e) {
    /* Message only — never the key, and never the raw transaction. */
    return { ok: false, reason: (e && e.message) ? String(e.message).slice(0, 200) : 'send failed' };
  }
}
