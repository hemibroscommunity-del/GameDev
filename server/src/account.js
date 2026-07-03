/* ═══ v2.3.1143: ACCOUNT LOGIN PRE-FLIGHT (Login Key) ═══
 *
 * One HTTP endpoint -- POST /api/account/login {phrase} -- that tells a
 * client whether a typed Login Key (the bt_passphrase) matches a
 * registered character BEFORE the client switches identity.  The
 * pre-flight exists because blind write+reload has two footguns:
 *   1. a wrong key trips the client's join_rejected auto-regen, which
 *      DESTROYS the device's current passphrase (wsClient.js);
 *   2. a typo'd unregistered key would first-join-lock a fresh
 *      character (_verifyJoinAuth stamps auth:<id> on first join).
 *
 * READ-ONLY BY DESIGN: this module never writes storage.  Registration
 * stays exclusively in _verifyJoinAuth's first-join lock, so probing
 * this endpoint can never mint or claim an id.
 *
 * Brute-force posture: shares the join gate's _authFails map, so HTTP
 * probes and join spam draw from the SAME 5-fails/60s per-id budget --
 * the endpoint is never a weaker oracle than the join gate.  A per-IP
 * throttle (20/min, in-memory; a deploy wipe loses nothing per handoff
 * Rule 11) caps sweep speed across many ids.
 */

// Exact port of the client's passphraseToId (src/networking/index.js).
// 32-bit rolling hash with |0 truncation, Math.abs, base36, then the
// first two words as a suffix.  Parity is locked by literal fixtures in
// test/account.test.mjs -- change BOTH implementations or NEITHER.
export function accountPassphraseToId(phrase) {
  let hash = 0;
  for (let i = 0; i < phrase.length; i++) {
    hash = ((hash << 5) - hash + phrase.charCodeAt(i)) | 0;
  }
  return 'bp_' + Math.abs(hash).toString(36) + '_' + phrase.split('-').slice(0, 2).join('');
}

export const ACCOUNT = {
  IP_WINDOW_MS: 60000, // per-IP throttle window
  IP_MAX_ATTEMPTS: 20, // attempts allowed per window per IP
  PHRASE_MAX_LEN: 128, // sanity bound; real keys are ~30 chars
};

export const accountMethods = {

  // HTTP surface -- the outer worker routes /api/account/* here (same
  // room resolution as /api/market, default brotown-1).  Market
  // conventions: HTTP 200 + {ok:false, reason} for every logical
  // failure (the client branches on ok/reason, not status), 404 for
  // unknown subpaths, 500 on throw, CORS header on every response.
  // `settled: true` on every logical response is the deploy-order
  // capability signal (Rule 19): an OLD worker answers unknown paths
  // with 200 text/plain, so the client requires JSON + settled before
  // trusting any answer, and refuses to switch identity otherwise.
  async _accountFetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/account', '');
    const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    try {
      if (request.method === 'POST' && path.startsWith('/login')) {
        let body = null;
        try { body = await request.json(); } catch (e) { /* malformed -> bad_request below */ }
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const result = await this._accountLogin(body && body.phrase, ip);
        return new Response(JSON.stringify(result), { headers: H });
      }
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: H });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: H });
    }
  },

  // Core check, split from the fetch wrapper as the test seam.
  // Returns a plain object; never touches storage beyond reads.
  async _accountLogin(phrase, ip) {
    if (typeof phrase !== 'string') return { ok: false, settled: true, reason: 'bad_request' };
    phrase = phrase.trim();
    if (!phrase || phrase.length > ACCOUNT.PHRASE_MAX_LEN) {
      return { ok: false, settled: true, reason: 'bad_request' };
    }

    // Per-IP throttle.  Counts EVERY attempt (even bad_request would
    // have returned above -- only derivable attempts land here) so a
    // sweep across many ids can't sidestep the per-id lockout.
    const now = Date.now();
    if (!this._acctIp) this._acctIp = new Map();
    const ipRec = this._acctIp.get(ip);
    if (!ipRec || now - ipRec.windowStart > ACCOUNT.IP_WINDOW_MS) {
      // Lazy prune: reuse the reset moment to drop other expired
      // entries so the map can't grow unboundedly between deploys.
      if (this._acctIp.size > 500) {
        for (const [k, v] of this._acctIp) {
          if (now - v.windowStart > ACCOUNT.IP_WINDOW_MS) this._acctIp.delete(k);
        }
      }
      this._acctIp.set(ip, { count: 1, windowStart: now });
    } else {
      ipRec.count += 1;
      if (ipRec.count > ACCOUNT.IP_MAX_ATTEMPTS) return { ok: false, settled: true, reason: 'rate' };
    }

    const id = accountPassphraseToId(phrase);

    // Shared lockout with the join gate (see module header).
    if (!this._authFails) this._authFails = new Map();
    const fails = this._authFails.get(id);
    if (fails && fails.until > now) return { ok: false, settled: true, reason: 'locked' };

    const auth = await this.state.storage.get('auth:' + id);
    if (!auth) {
      // Unregistered key.  Report exists:false and stamp NOTHING --
      // this is what protects a typo from silently minting a fresh
      // character (registration only happens on a real join).
      return { ok: true, settled: true, exists: false };
    }

    if ((await this._phraseHash(phrase)) === auth.pfHash) {
      this._authFails.delete(id);
      // Small preview so the login UI can confirm before switching.
      // The rpg blob has no name field (fixed field list, Rule 1), so
      // level + account age is the whole preview.
      const rpg = await this.state.storage.get('rpg:' + id);
      return {
        ok: true, settled: true, exists: true, id,
        preview: { level: (rpg && rpg.level) || 1, createdAt: auth.createdAt },
      };
    }

    // Registered id, wrong phrase (31-bit hash collision, or a guess
    // that hit a real id).  Count it exactly like _verifyJoinAuth so
    // the shared budget stays coherent.
    const f = this._authFails.get(id) || { count: 0, until: 0 };
    f.count += 1;
    if (f.count >= 5) { f.until = now + 60000; f.count = 0; }
    this._authFails.set(id, f);
    return { ok: false, settled: true, reason: 'auth' };
  },
};
