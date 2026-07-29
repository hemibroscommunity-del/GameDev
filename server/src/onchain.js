/* Read-only chain access for Hemi Bro ownership verification (v2.3.1576).
 *
 * WHY THIS EXISTS
 * The game lets a player wear any of the 3,333 Hemi Bros by typing its id.
 * Nothing checked that they own it.  This module is the server half of the
 * fix: prove the player controls a wallet, then ask the chain whether that
 * wallet holds the token.
 *
 * WHY IT LOOKS LIKE THIS
 * Cloudflare Workers have no secp256k1, and this server is deliberately
 * zero-dependency (see package.json — the 40-suite test run installs
 * nothing).  Hand-rolling secp256k1 signature recovery is not an acceptable
 * risk: a subtle bug there means accepting FORGED signatures, which is the
 * whole security property.  So the recovery is delegated to the chain
 * itself — `eth_call` against precompile 0x01 (ecrecover) makes an EVM node
 * do the elliptic-curve work and hand back the signer.  The Worker only
 * needs `fetch`.
 *
 * The one primitive that IS implemented here is keccak-256, because the
 * message digest must be computed by the SERVER (if the client supplied the
 * hash, it would control what got "signed").  A hash is a very different
 * risk profile from signature math: it is deterministic, has no secret
 * material and no timing surface, and is pinned below by the official
 * Keccak-256 vectors in test/onchain.test.mjs.  If those pass, it is right.
 *
 * NOTHING HERE MUTATES GAME STATE.  Every function is a pure computation or
 * a read-only RPC call, so a chain outage degrades to "cannot verify right
 * now" and never to a corrupted player.
 */

/* ── configuration ────────────────────────────────────────────────────────
 * Hemi mainnet.  Testnet (Hemi Sepolia) is chain 743111 at
 * https://testnet.rpc.hemi.network/rpc — override via the Worker env to
 * test without touching the real collection.
 *
 * NOTE: HEMI_BROS is the collection the owner supplied.  It could not be
 * verified from the build sandbox (its network policy denies both the Hemi
 * RPC and the block explorers), and the address is not publicly indexed, so
 * `chainSelfTest()` below exists to confirm it on a live deploy. */
export const CHAIN = {
  id: 43111,
  rpc: 'https://rpc.hemi.network/rpc',
  name: 'Hemi',
};
export const HEMI_BROS = '0xeab71f90235e6b885c05afff3baf0e41244cf874';

/* ERC-721 ownerOf(uint256) — the collection is assumed ERC-721.  If it is
   ERC-1155 instead, this selector reverts and verification fails CLOSED
   (nobody gets a badge they didn't earn); the fix is balanceOf(address,
   uint256) != 0, which needs the holder's address as well as the id. */
const SEL_OWNER_OF = '0x6352211e';
const ECRECOVER = '0x0000000000000000000000000000000000000001';

/* ── keccak-256 ───────────────────────────────────────────────────────────
 * Keccak-f[1600] on 32-bit lane pairs (no BigInt: Workers run this on every
 * verify, and the split-lane form is the portable one).  This is the
 * ORIGINAL Keccak padding (0x01), not SHA3's 0x06 — Ethereum uses Keccak. */
const RC = [
  0x00000001, 0x00000000, 0x00008082, 0x00000000, 0x0000808a, 0x80000000,
  0x80008000, 0x80000000, 0x0000808b, 0x00000000, 0x80000001, 0x00000000,
  0x80008081, 0x80000000, 0x00008009, 0x80000000, 0x0000008a, 0x00000000,
  0x00000088, 0x00000000, 0x80008009, 0x00000000, 0x8000000a, 0x00000000,
  0x8000808b, 0x00000000, 0x0000008b, 0x80000000, 0x00008089, 0x80000000,
  0x00008003, 0x80000000, 0x00008002, 0x80000000, 0x00000080, 0x80000000,
  0x0000800a, 0x00000000, 0x8000000a, 0x80000000, 0x80008081, 0x80000000,
  0x00008080, 0x80000000, 0x80000001, 0x00000000, 0x80008008, 0x80000000,
];
/* ρ offsets in lane order (x + 5y) — 25 entries.  Getting this table wrong
   is silent: the sponge still runs and still returns 32 plausible bytes, it
   just isn't Keccak.  Pinned by the official vectors in the suite. */
const ROT = [
  0, 1, 62, 28, 27,
  36, 44, 6, 55, 20,
  3, 10, 43, 25, 39,
  41, 45, 15, 21, 8,
  18, 2, 61, 56, 14,
];

function keccakF(s) {
  const C = new Int32Array(10), D = new Int32Array(10), B = new Int32Array(50);
  for (let round = 0; round < 24; round++) {
    /* θ */
    for (let x = 0; x < 5; x++) {
      C[x * 2] = s[x * 2] ^ s[(x + 5) * 2] ^ s[(x + 10) * 2] ^ s[(x + 15) * 2] ^ s[(x + 20) * 2];
      C[x * 2 + 1] = s[x * 2 + 1] ^ s[(x + 5) * 2 + 1] ^ s[(x + 10) * 2 + 1] ^ s[(x + 15) * 2 + 1] ^ s[(x + 20) * 2 + 1];
    }
    for (let x = 0; x < 5; x++) {
      const x1 = ((x + 1) % 5) * 2, x4 = ((x + 4) % 5) * 2;
      D[x * 2] = C[x4] ^ (((C[x1] << 1) | (C[x1 + 1] >>> 31)) | 0);
      D[x * 2 + 1] = C[x4 + 1] ^ (((C[x1 + 1] << 1) | (C[x1] >>> 31)) | 0);
      for (let y = 0; y < 25; y += 5) {
        s[(x + y) * 2] ^= D[x * 2];
        s[(x + y) * 2 + 1] ^= D[x * 2 + 1];
      }
    }
    /* ρ + π */
    for (let i = 0; i < 25; i++) {
      const r = ROT[i];
      const x = i % 5, y = (i / 5) | 0;
      const j = y + ((2 * x + 3 * y) % 5) * 5;   /* π destination */
      let lo = s[i * 2], hi = s[i * 2 + 1];
      if (r > 0) {
        if (r < 32) { const nlo = (lo << r) | (hi >>> (32 - r)); const nhi = (hi << r) | (lo >>> (32 - r)); lo = nlo; hi = nhi; }
        else if (r === 32) { const t = lo; lo = hi; hi = t; }
        else { const rr = r - 32; const nlo = (hi << rr) | (lo >>> (32 - rr)); const nhi = (lo << rr) | (hi >>> (32 - rr)); lo = nlo; hi = nhi; }
      }
      B[j * 2] = lo | 0; B[j * 2 + 1] = hi | 0;
    }
    /* χ */
    for (let y = 0; y < 25; y += 5) {
      for (let x = 0; x < 5; x++) {
        const i = y + x, a = y + ((x + 1) % 5), b = y + ((x + 2) % 5);
        s[i * 2] = B[i * 2] ^ (~B[a * 2] & B[b * 2]);
        s[i * 2 + 1] = B[i * 2 + 1] ^ (~B[a * 2 + 1] & B[b * 2 + 1]);
      }
    }
    /* ι */
    s[0] ^= RC[round * 2];
    s[1] ^= RC[round * 2 + 1];
  }
}

/** keccak-256 over a Uint8Array, returning 32 bytes. */
export function keccak256(bytes) {
  const RATE = 136;                                  /* 1088 bits */
  const s = new Int32Array(50);
  const padded = new Uint8Array(Math.ceil((bytes.length + 1) / RATE) * RATE);
  padded.set(bytes);
  padded[bytes.length] = 0x01;                       /* Keccak padding */
  padded[padded.length - 1] |= 0x80;
  for (let off = 0; off < padded.length; off += RATE) {
    for (let i = 0; i < RATE; i += 4) {
      const w = padded[off + i] | (padded[off + i + 1] << 8) | (padded[off + i + 2] << 16) | (padded[off + i + 3] << 24);
      s[i / 4] ^= w;
    }
    keccakF(s);
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i += 4) {
    const w = s[i / 4];
    out[i] = w & 0xff; out[i + 1] = (w >>> 8) & 0xff; out[i + 2] = (w >>> 16) & 0xff; out[i + 3] = (w >>> 24) & 0xff;
  }
  return out;
}

/* ── hex helpers ──────────────────────────────────────────────────────────*/
export function toHex(bytes) {
  let h = '';
  for (let i = 0; i < bytes.length; i++) h += bytes[i].toString(16).padStart(2, '0');
  return h;
}
export function fromHex(hex) {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}
function utf8(str) { return new TextEncoder().encode(str); }

/** EIP-191 personal_sign digest: keccak256("\x19Ethereum Signed Message:\n"
 *  + len + message).  The SERVER computes this over the nonce IT issued —
 *  never over anything the client supplies as a pre-hash. */
export function personalHash(message) {
  const msg = utf8(message);
  const prefix = utf8('Ethereum Signed Message:\n' + msg.length);
  const all = new Uint8Array(prefix.length + msg.length);
  all.set(prefix); all.set(msg, prefix.length);
  return keccak256(all);
}

/* ── read-only RPC ────────────────────────────────────────────────────────*/
let _rpcId = 0;
/** One JSON-RPC round trip.  `fetchImpl` is injectable so the suite can run
 *  the whole path with no network (test/onchain.test.mjs). */
export async function rpcCall(method, params, opts = {}) {
  const url = opts.rpc || CHAIN.rpc;
  const f = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!f) throw new Error('no fetch available');
  const res = await f(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++_rpcId, method, params }),
  });
  if (!res || !res.ok) throw new Error('rpc http ' + (res && res.status));
  const j = await res.json();
  if (j.error) throw new Error('rpc error: ' + (j.error.message || 'unknown'));
  return j.result;
}

/** Recover the signer of `hash` from a 65-byte signature, via the ecrecover
 *  precompile.  Returns a lowercase 0x address, or null if the signature is
 *  malformed or does not recover — callers MUST treat null as "not verified"
 *  rather than retrying with weaker checks. */
export async function recoverSigner(hash, signature, opts = {}) {
  const sig = fromHex(signature);
  if (sig.length !== 65) return null;
  let v = sig[64];
  if (v < 27) v += 27;                    /* some wallets emit 0/1 */
  if (v !== 27 && v !== 28) return null;
  const data = '0x' + toHex(hash)
    + v.toString(16).padStart(64, '0')
    + toHex(sig.subarray(0, 32))
    + toHex(sig.subarray(32, 64));
  const out = await rpcCall('eth_call', [{ to: ECRECOVER, data }, 'latest'], opts);
  if (!out || out === '0x') return null;                       /* invalid sig */
  const addr = '0x' + out.slice(2).padStart(64, '0').slice(24);
  if (/^0x0{40}$/.test(addr)) return null;
  return addr.toLowerCase();
}

/** ERC-721 ownerOf.  Returns a lowercase 0x address, or null if the token
 *  does not exist (the call reverts) or the chain is unreachable. */
export async function ownerOf(tokenId, opts = {}) {
  const contract = opts.contract || HEMI_BROS;
  const id = BigInt(tokenId).toString(16).padStart(64, '0');
  let out;
  try {
    out = await rpcCall('eth_call', [{ to: contract, data: SEL_OWNER_OF + id }, 'latest'], opts);
  } catch { return null; }                 /* revert => unminted / wrong ABI */
  if (!out || out === '0x') return null;
  const addr = '0x' + out.slice(2).padStart(64, '0').slice(24);
  if (/^0x0{40}$/.test(addr)) return null;
  return addr.toLowerCase();
}

/** The whole check, in the order that matters: recover the signer of OUR
 *  nonce first, then ask the chain who holds the token, then compare.
 *  Returns { ok, address, owner, reason }.  Fails CLOSED on every error. */
export async function verifyBroOwnership(nonceMessage, signature, tokenId, opts = {}) {
  let address = null;
  try {
    address = await recoverSigner(personalHash(nonceMessage), signature, opts);
  } catch { return { ok: false, reason: 'recover_failed' }; }
  if (!address) return { ok: false, reason: 'bad_signature' };
  const owner = await ownerOf(tokenId, opts);
  if (!owner) return { ok: false, address, reason: 'no_such_token' };
  if (owner !== address) return { ok: false, address, owner, reason: 'not_owner' };
  return { ok: true, address, owner };
}

/** Deploy-time smoke check: confirms the chain id matches and the collection
 *  answers ownerOf.  The build sandbox cannot reach the RPC, so this is how
 *  the contract address gets confirmed for real — call it once after deploy
 *  with a token id known to be minted. */
export async function chainSelfTest(sampleTokenId, opts = {}) {
  const out = { rpc: opts.rpc || CHAIN.rpc, contract: opts.contract || HEMI_BROS };
  try {
    const cid = await rpcCall('eth_chainId', [], opts);
    out.chainId = parseInt(cid, 16);
    out.chainIdMatches = out.chainId === (opts.expectChain || CHAIN.id);
  } catch (e) { out.chainError = String((e && e.message) || e); return out; }
  out.owner = await ownerOf(sampleTokenId, opts);
  out.contractAnswers = !!out.owner;
  return out;
}
