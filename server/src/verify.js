/* ═══ v2.3.3275: THE ACCOUNT CHECK -- A NEW CHARACTER PROVES A PERSON IS THERE ═══
 *
 * The owner, 2026-10-16, after the anti-bot review: "Yes start on the urgent
 * five and the account check."  The review (docs/specs/antibot-review.md, 6)
 * found that an account costs nothing: any unused name is a new character,
 * with no limit per device or address and no check of any kind.  A bot
 * operator's whole plan rests on that -- a fleet of free accounts, each
 * collecting what a new character is given, funnelled to one.
 *
 * This puts ONE cheap check at the door: Cloudflare Turnstile, the owner's
 * own host's check, free, and for most people a tick with no puzzle.  The
 * phone renders the widget when the room asks for it, and the room verifies
 * the widget's token with Cloudflare BEFORE the identity is made (join.js
 * _verifyJoinAuth, inside the "no auth record" branch, before the record is
 * stamped -- so a refused join writes nothing).
 *
 * WHO IS ASKED: only a character that does not exist yet -- an id with no
 * `auth:` record: a `bp_` id's first join, and every guest id (`?guest=1`),
 * which never has one.  A character on file is never asked, however it
 * connects.  So the check costs a real player one tick, once, and costs a
 * fleet one tick per account, which is the point.
 *
 * OFF UNTIL THE OWNER TURNS IT ON: configured only when BOTH
 * TURNSTILE_SECRET (a dashboard secret, never in this repo) and
 * TURNSTILE_SITEKEY (wrangler.toml [vars], public by nature) are set.  The
 * `disable_verify` live flag turns it off again without a deploy.  The order
 * matters for old pages: a client from before this version answers a
 * 'verify' refusal as "not retrying", so the secret goes in AFTER the new
 * client is live (docs/OPERATIONS.md, "The account check").
 *
 * FAIL CLOSED: a verifier that cannot be reached, or answers anything but
 * success, refuses the new character -- the player sees the check again.  An
 * attacker cannot cause that outage, and a real one has the live flag.
 *
 * TURNSTILE_VERIFY_URL is a test seam only: the QA scenario (mp-verify)
 * points it at a stand-in verifier on this machine.  Nothing in this repo
 * sets it for the real worker.
 */

export const VERIFY = Object.freeze({
  URL: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  /* a Turnstile token is a few hundred characters; this is the wire bound */
  TOKEN_MAX: 2048,
  TIMEOUT_MS: 6000,
  /* join_rejected {reason:'verify'} is followed by this close; the client's
     onclose opens the gate on it and does NOT take its ordinary backoff */
  CLOSE_CODE: 4014,
  FLAG_OFF: 'disable_verify',
});

export const verifyMethods = {
  /** Both keys set, and the live flag not thrown. */
  _verifyConfigured() {
    const e = this.env || {};
    if (!(typeof e.TURNSTILE_SECRET === 'string' && e.TURNSTILE_SECRET
        && typeof e.TURNSTILE_SITEKEY === 'string' && e.TURNSTILE_SITEKEY)) return false;
    return !(this._flagOn && this._flagOn(VERIFY.FLAG_OFF));
  },

  _verifySiteKey() {
    return String((this.env && this.env.TURNSTILE_SITEKEY) || '');
  },

  /** Ask Cloudflare whether this token is a person's.  `ip` is the socket's
   *  address when the edge gave one (flood.js requestIp), which Turnstile
   *  uses to tie the token to the connection. */
  async _verifyToken(token, ip) {
    if (typeof token !== 'string' || !token || token.length > VERIFY.TOKEN_MAX) return false;
    const url = (this.env && typeof this.env.TURNSTILE_VERIFY_URL === 'string' && this.env.TURNSTILE_VERIFY_URL) || VERIFY.URL;
    const body = new URLSearchParams();
    body.set('secret', String(this.env.TURNSTILE_SECRET));
    body.set('response', token);
    if (ip) body.set('remoteip', ip);
    let timer = null;
    try {
      const ctl = new AbortController();
      timer = setTimeout(() => { try { ctl.abort(); } catch (e) {} }, VERIFY.TIMEOUT_MS);
      const res = await fetch(url, { method: 'POST', body, signal: ctl.signal });
      const j = await res.json();
      return !!(j && j.success === true);
    } catch (e) {
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  },

  /** The refusal, in one place: the reason and the site key the phone
   *  renders the widget with, then the close the client's gate keys on. */
  _verifyRefuse(ws) {
    try { ws.send(JSON.stringify({ type: 'join_rejected', reason: 'verify', sitekey: this._verifySiteKey() })); } catch (e) {}
    try { ws.close(VERIFY.CLOSE_CODE, 'verify'); } catch (e) {}
    this.sessions.delete(ws);
  },
};
