/* ═══ v2.3.2110: THE ROSTER, ON A COOKIE, SO A NEW BUILD IS NOT A NEW DEVICE ═══
 *
 * Owner: "People don't remember their key or know they have one.  The
 * continue button should allow them to continue their character from previous
 * builds.  Right now it shows empty each time an update is pushed."
 *
 * WHY IT WAS EMPTY, and it is not what it looks like.  Nothing in this repo
 * ever clears a character on a deploy — the roster (charRoster.js), the
 * passphrase and the caches all sit in localStorage untouched by a build.
 * What changes on a deploy is the ORIGIN.  Cloudflare Pages gives every
 * deployment its own hostname (`<hash>.<project>.pages.dev`) alongside the
 * project's stable one, and the PR bot posts that per-deploy link — so
 * opening the newest build means opening a DIFFERENT origin, and localStorage
 * is per-origin.  The old character was never lost; the new page simply could
 * not see the drawer it was in.  That is why the answer was always "type your
 * Login Key", and why it was the wrong answer: it asked the player to carry
 * something across a gap they did not know existed.
 *
 * COOKIES CROSS THAT GAP AND localStorage CANNOT.  A cookie can be scoped to
 * the REGISTRABLE domain rather than the exact host, and every one of those
 * deploy hostnames is a subdomain of the same registrable domain
 * (`<project>.pages.dev` is the registrable domain — `pages.dev` itself is a
 * public suffix, so browsers refuse a cookie scoped there, which is precisely
 * the boundary we want to stop at anyway: another Pages project must never
 * see this).  So this module keeps a compact MIRROR of the roster in one such
 * cookie.  localStorage stays the working copy — it is bigger, it is not sent
 * on requests, and it is what every read already uses; the cookie exists only
 * so a first read on a brand-new origin has something to restore from.
 *
 * FINDING THE DOMAIN WITHOUT SHIPPING THE PUBLIC SUFFIX LIST.  Getting this
 * wrong is silent in both directions (too broad and the browser drops it, too
 * narrow and it is per-host again), and the list that would answer it
 * properly is 15k lines.  So this PROBES instead: set a throwaway cookie at
 * the two-label domain, then three, then four, and use the first one that
 * reads back.  A public suffix fails the probe by definition, which makes the
 * rule self-correcting on a custom domain, on pages.dev, and on localhost
 * (where every candidate fails and it falls back to a host-only cookie —
 * useless for sharing, harmless to keep).
 *
 * WHAT IS IN IT, AND WHAT THAT COSTS.  The phrase IS the character (see
 * charRoster.js), so the mirror has to carry it; a cookie is sent to the page
 * host on every request, which localStorage is not.  That host is the static
 * site the player is already running, the cookie is Secure + SameSite=Lax on
 * https, and the same phrase already crosses the wire to the worker on every
 * join — but it is a real difference from localStorage and is written down
 * here rather than discovered later.
 *
 * TOMBSTONES.  Deleting a character has to cross the origin gap too, or the
 * next build would restore what was just removed.  So the cookie carries a
 * short list of forgotten phrases beside the live ones, and a restore skips
 * them.  A phrase that comes BACK (re-entered by key) drops out of the
 * tombstones when it is written — see charRoster's _write.
 */

const NAME = 'bt_chars';

/* Browsers cap a cookie around 4096 bytes INCLUDING the name and attributes.
   Ten characters encode to roughly 1.2KB, so this is headroom rather than a
   limit anyone meets — but a bug that appends must not silently produce a
   cookie the browser drops whole, which would look exactly like "it stopped
   working" with nothing to see.  Over budget, the OLDEST rows go last. */
const MAX_BYTES = 3400;
const TOMB_MAX = 24;
const TWO_YEARS = 63072000;

function _jar() { try { return document.cookie || ''; } catch (e) { return ''; } }

function _readRaw(name) {
  const all = _jar().split(';');
  for (let i = 0; i < all.length; i++) {
    const s = all[i].replace(/^\s+/, '');
    if (s.slice(0, name.length + 1) === name + '=') return s.slice(name.length + 1);
  }
  return null;
}

function _set(name, value, domain, maxAge) {
  let secure = '';
  try { if (location.protocol === 'https:') secure = '; Secure'; } catch (e) {}
  let c = name + '=' + value + '; Path=/; Max-Age=' + maxAge + '; SameSite=Lax' + secure;
  if (domain) c += '; Domain=' + domain;
  try { document.cookie = c; } catch (e) {}
}

/* Most general first: the first candidate the browser ACCEPTS is the widest
   scope it will allow, which is the one that reaches sibling deploys. */
function _candidates() {
  let h = '';
  try { h = location.hostname || ''; } catch (e) { h = ''; }
  /* No dots (localhost), a bare IPv4, or an IPv6 literal: nothing to widen
     to.  A host-only cookie is the honest answer for all three. */
  if (!h || h.indexOf('.') < 0 || /^[0-9.]+$/.test(h) || h.indexOf(':') >= 0) return [null];
  const p = h.split('.');
  const out = [];
  const top = Math.min(p.length, 4);
  for (let n = 2; n <= top; n++) out.push(p.slice(-n).join('.'));
  out.push(null);
  return out;
}

/* Memoized on the HOSTNAME, not on a bare "have we probed" flag: the answer is
   a property of the host, so caching it under the host is what makes the cache
   correct rather than merely fast.  A page never changes hostname under itself,
   but a test harness walking a device across origins does — and a stale domain
   silently makes every write a no-op, which reads exactly like the feature not
   working. */
let _probedHost = null;
let _domain = null;

function _domainFor() {
  let host = '';
  try { host = location.hostname || ''; } catch (e) { host = ''; }
  if (_probedHost === host) return _domain;
  _probedHost = host;
  _domain = null;
  const cands = _candidates();
  for (let i = 0; i < cands.length; i++) {
    const d = cands[i];
    if (d === null) { _domain = null; break; }
    /* A distinct value per attempt, so a probe cookie left behind by an
       earlier candidate cannot read back as this one's success. */
    const tag = 'p' + i;
    _set('bt_dprobe', tag, d, 120);
    const ok = _readRaw('bt_dprobe') === tag;
    _set('bt_dprobe', '', d, 0);
    if (ok) { _domain = d; break; }
  }
  return _domain;
}

/* Reads the shared mirror.  Returns null when there is no cookie, cookies are
   off, or the payload is unreadable — every caller treats that as "no shared
   store", which is exactly the behaviour this file had before it existed. */
export function readShared() {
  const raw = _readRaw(NAME);
  if (!raw) return null;
  let o = null;
  try { o = JSON.parse(decodeURIComponent(raw)); } catch (e) { return null; }
  if (!o || !Array.isArray(o.l)) return null;
  const list = [];
  for (let i = 0; i < o.l.length; i++) {
    const r = o.l[i];
    if (!r || typeof r.p !== 'string' || !r.p) continue;
    list.push({
      phrase: r.p,
      at: Number(r.a) || 1,
      name: typeof r.n === 'string' ? r.n : '',
      level: Number(r.lv) || 0,
    });
  }
  const tomb = [];
  if (Array.isArray(o.x)) {
    for (let i = 0; i < o.x.length; i++) {
      if (typeof o.x[i] === 'string' && o.x[i]) tomb.push(o.x[i]);
    }
  }
  return { list: list, tomb: tomb };
}

export function writeShared(list, tomb) {
  const d = _domainFor();
  let rows = (list || []).slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
  let tombs = (tomb || []).slice(0, TOMB_MAX);
  for (;;) {
    const body = encodeURIComponent(JSON.stringify({
      v: 1,
      l: rows.map(function (e) {
        return { p: e.phrase, a: e.at || 1, n: e.name || '', lv: e.level || 0 };
      }),
      x: tombs,
    }));
    if (body.length <= MAX_BYTES) { _set(NAME, body, d, TWO_YEARS); return; }
    /* Shed the cheap thing first: a forgotten phrase costs one restore that
       should not happen, a dropped row costs a character nobody can find. */
    if (tombs.length > 4) tombs = tombs.slice(0, tombs.length - 1);
    else if (rows.length > 1) rows = rows.slice(0, rows.length - 1);
    else { _set(NAME, '', d, 0); return; }
  }
}

/* QA/debug handle, same pattern as window.__btRoster. */
try {
  if (typeof window !== 'undefined') {
    window.__btRosterCookie = { read: readShared, write: writeShared, domain: _domainFor };
  }
} catch (e) {}
