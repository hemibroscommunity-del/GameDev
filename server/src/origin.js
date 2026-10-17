/* ═══ v2.3.3312: ONLY THE GAME'S OWN SITE MAY OPEN A GAME SOCKET ═══
 *
 * The owner, 2026-10-17, asked how to protect the game against copies, and
 * then, asked which addresses players use: "I only use Brotown.net for this
 * game and that's the only domain I plan to keep using."
 *
 * Until now ANY web page could connect to wss://api.brotown.net.  A copy of
 * the game, renamed and re-skinned on another site, could play in OUR world,
 * with our players, on our bill, under somebody else's name -- the cheapest
 * clone there is, since it needs no server of its own.  A browser puts the
 * address of the page that opens a socket on the request (the Origin header)
 * and no page can change it.  So the worker now lets in:
 *
 *   - the game's own sites and every address under them (`ORIGIN_LOCK.SITES`):
 *     brotown.net (and www., api.) and gamedev-aix.pages.dev, Cloudflare
 *     Pages' own name for the project, whose `<hash>.` and `<branch>.`
 *     addresses are the preview every pull request gets -- plus any site
 *     `env.ORIGINS` lists (wrangler.toml, comma separated);
 *   - a machine's own pages (`localHost`): localhost, *.localhost and the
 *     private network addresses -- a developer's build, the QA harness, a
 *     phone on the same wifi.  No public site has one of those;
 *   - no Origin at all: a browser always sends one, so a request without it
 *     is a program -- the load test, the bot lab, curl.  This is NOT a lock
 *     against bots, which can write any Origin they like (TRAPS §195); it
 *     stops other WEBSITES, which is what a copy is.
 *
 * Everything else -- another domain, `null` (a page opened from a file, or a
 * sandboxed frame), a look-alike (evilbrotown.net, brotown.net.evil.com) --
 * is refused in the worker, BEFORE any room: the socket is opened only to say
 * why (join_rejected {reason: 'origin', home}, then close 4015), so a copy
 * built from our code tells its players where the real game is, and the room
 * never wakes for it.  A plain request with no upgrade gets a 403.  The
 * page's own handling: wsClient.js showOriginGate.  A page from before this
 * reads an unknown refusal as final and stops trying (v2.3.1181).
 *
 * The lever: ORIGIN_LOCK = "off" in wrangler.toml lets every site in again
 * (merged, it deploys in a few minutes; the dashboard's Variables are quicker
 * and last until the next deploy).  docs/specs/origin-lock.md.
 */
import { ROOMS } from './flood.js';

export const ORIGIN_LOCK = Object.freeze({
  SITES: Object.freeze(['brotown.net', 'gamedev-aix.pages.dev']),
  HOME: 'https://brotown.net',
  REASON: 'origin',
  CLOSE: 4015,
  /* a refused site is written to the worker's log once per isolate, so a
     copy can be found by name (Workers -> brotown-server -> Logs) */
  LOG_MAX: 64,
});

/** Is this page's host a machine's own -- loopback or a private network? */
export function localHost(host) {
  const h = String(host || '').toLowerCase();
  if (ROOMS.LOCAL_HOSTS.has(h) || h.endsWith('.localhost')) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(h);
  if (!m) return false;
  const a = Number(m[1]), b = Number(m[2]);
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

/* a site written as a host or an address ("https://x.com/"), lower case, no
   port, path or trailing dot */
function siteName(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/[/:?#].*$/, '').replace(/\.$/, '');
}

export function originSites(env) {
  const extra = String((env && env.ORIGINS) || '').split(',').map(siteName).filter(Boolean);
  return ORIGIN_LOCK.SITES.concat(extra);
}

export function originLockOn(env) {
  return String((env && env.ORIGIN_LOCK) || 'on').trim().toLowerCase() !== 'off';
}

/** May a page at `origin` (the request's Origin header) open a game socket?
 *  { ok, why }: 'off' (the lock is off), 'none' (no Origin: a program),
 *  'local', 'site' -- or refused: 'unreadable' (`null` and the like),
 *  'scheme' (not a web page), 'elsewhere'. */
export function originAllowed(origin, env) {
  if (!originLockOn(env)) return { ok: true, why: 'off' };
  if (origin === null || origin === undefined || origin === '') return { ok: true, why: 'none' };
  let u;
  try { u = new URL(String(origin)); } catch (e) { return { ok: false, why: 'unreadable' }; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, why: 'scheme' };
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (localHost(host)) return { ok: true, why: 'local' };
  for (const s of originSites(env)) {
    if (host === s || host.endsWith('.' + s)) return { ok: true, why: 'site' };
  }
  return { ok: false, why: 'elsewhere' };
}

const _logged = new Set();
function logRefusal(origin, why) {
  const o = String(origin).slice(0, 120);
  if (_logged.has(o) || _logged.size >= ORIGIN_LOCK.LOG_MAX) return;
  _logged.add(o);
  try { console.log('[bt] origin refused (' + why + '): ' + o); } catch (e) { /* no console */ }
}

/** The answer to a page that may not play here.  A socket request gets a
 *  socket that says why and closes (the room-full refusal's way, join.js
 *  _roomFullRefusal), anything else a 403.  `deps` stands in for the
 *  runtime's WebSocketPair and Response in tests. */
export function refuseOrigin(request, origin, why, deps = {}) {
  logRefusal(origin, why);
  const Pair = deps.WebSocketPair || globalThis.WebSocketPair;
  const Resp = deps.Response || Response;
  let upgrade = '';
  try { upgrade = String(request.headers.get('Upgrade') || '').toLowerCase(); } catch (e) { upgrade = ''; }
  const plain = () => new Resp(JSON.stringify({ ok: false, error: 'not the official site', home: ORIGIN_LOCK.HOME }), {
    status: 403, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  });
  if (upgrade !== 'websocket' || typeof Pair !== 'function') return plain();
  try {
    const [client, server] = Object.values(new Pair());
    server.accept();
    server.send(JSON.stringify({ type: 'join_rejected', reason: ORIGIN_LOCK.REASON, home: ORIGIN_LOCK.HOME }));
    server.close(ORIGIN_LOCK.CLOSE, 'play at brotown.net');
    return new Resp(null, { status: 101, webSocket: client });
  } catch (e) {
    return plain();
  }
}
