/* v2.3.1576: HEMI BRO WALLET — the client half of ownership verification.
 *
 * The game has always let a player wear any of the 3,333 Hemi Bros by typing
 * its id, with nothing checking ownership.  The server can now settle that
 * against the chain (server/src/broverify.js); this drives the browser side
 * of the handshake and holds the result for the UI.
 *
 * WHAT THIS FILE DOES NOT DO, DELIBERATELY:
 *
 *   - It does not decide anything.  The badge is granted by the server and
 *     arrives on the authoritative echo.  `state.verified` here is a UI
 *     mirror for spinner/error copy — the renderer reads the SERVER's value
 *     (S.rpg._bro / the peer's `bro` field), never this.  If this file lied,
 *     no badge would appear.
 *   - It never touches a private key or a seed.  `personal_sign` asks the
 *     wallet to sign; the key never leaves it.
 *   - It never sends an address.  The server RECOVERS the signer from the
 *     signature, so a client claiming to be an address it does not control
 *     is not a case that needs handling — the recovery simply yields someone
 *     else and the ownership check fails.
 *
 * The wallet is reached through EIP-1193 (`window.ethereum`), which every
 * injected wallet implements.  Nothing is imported: no wallet SDK, no
 * bundle-size cost, and nothing new in the dependency tree.
 */

/* Round-trip states the UI renders.  `pending` covers both the wallet prompt
   and the chain read; they are one wait from the player's point of view. */
export const BRO_IDLE = 'idle';
export const BRO_PENDING = 'pending';
export const BRO_OK = 'ok';
export const BRO_ERROR = 'error';

const state = { status: BRO_IDLE, error: null, tokenId: null, address: null };
const listeners = new Set();

export function getBroState() { return { ...state }; }
export function onBroState(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => { try { fn(getBroState()); } catch (e) { /* a bad subscriber must not break the flow */ } });
}

/** True when an EIP-1193 provider is injected.  The UI uses this to explain
 *  WHY the button is unavailable rather than showing a control that fails. */
export function hasWallet() {
  return typeof window !== 'undefined' && !!window.ethereum;
}

/* The in-flight round trip.  One at a time: the server burns a nonce per
   verify, so two overlapping attempts would race for one challenge and the
   loser would report a confusing `nonce_expired`. */
let _pending = null;

/** Called by gameEvents when the server answers.  Kept here so the whole
 *  handshake reads in one file rather than being split across the switch. */
export function _onBroNonce(msg) {
  if (_pending && _pending.onNonce) _pending.onNonce(msg);
}
export function _onBroResult(msg) {
  if (_pending && _pending.onResult) _pending.onResult(msg);
}

/* Server reasons -> copy a player can act on.  An unrecognised reason falls
   through to its raw string rather than a generic "failed", so a new server
   reason is still legible in the wild. */
const REASONS = {
  not_owner: 'That Hemi Bro belongs to a different wallet.',
  no_such_token: 'That Hemi Bro does not exist yet.',
  bad_signature: 'Could not read that signature — try again.',
  bad_token_id: 'Enter a Hemi Bro id between 1 and 6666.',
  nonce_expired: 'The request timed out — try again.',
  chain_unreachable: 'Could not reach Hemi right now — try again shortly.',
};

/**
 * Run the full handshake for `tokenId`.
 *
 * connect -> ask the server for a challenge -> sign it -> send the signature.
 * Resolves with {ok, reason} and mirrors the same into the subscribable state.
 * Rejections are converted to results: the caller is UI, and a thrown error
 * at a button press is a worse outcome than a message.
 */
export async function verifyBro(S, tokenId, opts = {}) {
  const timeoutMs = opts.timeoutMs || 90000;
  if (_pending) return { ok: false, reason: 'A verification is already running.' };
  if (!hasWallet()) {
    emit({ status: BRO_ERROR, error: 'No wallet found in this browser.' });
    return { ok: false, reason: 'No wallet found in this browser.' };
  }
  if (!S || !S.channel) {
    emit({ status: BRO_ERROR, error: 'Not connected.' });
    return { ok: false, reason: 'Not connected.' };
  }

  emit({ status: BRO_PENDING, error: null, tokenId: Number(tokenId) });

  let settle;
  const done = new Promise((res) => { settle = res; });
  let timer = null;
  const finish = (out) => {
    if (!_pending) return;
    clearTimeout(timer);
    _pending = null;
    if (out.ok) emit({ status: BRO_OK, error: null, tokenId: out.tokenId, address: out.address });
    else emit({ status: BRO_ERROR, error: out.reason });
    settle(out);
  };

  _pending = {
    onNonce: async (msg) => {
      try {
        /* eth_requestAccounts first: personal_sign on a locked wallet throws
           an opaque provider error, and the player has no idea they needed to
           unlock.  Asking explicitly makes the wallet show its own prompt. */
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const from = accounts && accounts[0];
        if (!from) return finish({ ok: false, reason: 'No account selected in the wallet.' });
        /* personal_sign takes (message, address).  The message is the server's
           own text, passed through untouched — signing anything we composed
           here would prove nothing the server asked for. */
        const signature = await window.ethereum.request({
          method: 'personal_sign', params: [msg.message, from],
        });
        S.channel.send({ type: 'broadcast', event: 'bro_verify', payload: { tokenId: Number(tokenId), signature } });
      } catch (e) {
        /* 4001 is the EIP-1193 code for "user rejected" — not an error worth
           an alarming message. */
        const code = e && (e.code || (e.data && e.data.code));
        finish({ ok: false, reason: code === 4001 ? 'Signature cancelled.' : 'Wallet refused the signature.' });
      }
    },
    onResult: (msg) => {
      if (msg && msg.ok) return finish({ ok: true, tokenId: msg.tokenId, address: msg.address });
      const raw = (msg && msg.reason) || 'not_verified';
      finish({ ok: false, reason: REASONS[raw] || raw });
    },
  };

  timer = setTimeout(() => finish({ ok: false, reason: 'Timed out waiting for the wallet or the chain.' }), timeoutMs);
  try {
    S.channel.send({ type: 'broadcast', event: 'bro_nonce', payload: {} });
  } catch {
    return finish({ ok: false, reason: 'Not connected.' }), done;
  }
  return done;
}

/** Whether the server has claimed this job (rule 19).  The UI shows the
 *  control only when the worker can actually settle it — an old worker
 *  simply never advertises the cap. */
export function broVerifySupported(S) {
  return !!(S && S._serverCaps && S._serverCaps.broVerify);
}
