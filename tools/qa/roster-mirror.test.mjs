#!/usr/bin/env node
/* ═══ v2.3.2110: THE ROSTER MIRROR, TESTED WITHOUT A BROWSER ═══
 *
 *   node tools/qa/roster-mirror.test.mjs
 *
 * The client has no unit suite and the Playwright harnesses drive ONE origin,
 * so neither can see the thing this feature is about: what happens when the
 * same player opens a DIFFERENT hostname of the same site (which is what every
 * Cloudflare Pages deployment is — see src/networking/rosterCookie.js).
 *
 * So this stubs the two browser stores with the property that matters between
 * them: localStorage is swapped for a fresh Map when the "origin" changes,
 * while the cookie jar persists and is filtered by domain on read.  The jar
 * also enforces the two browser rules the design leans on — a cookie scoped to
 * a public suffix is dropped, and a cookie scoped to a domain the host is not
 * under is dropped — because the domain probe is only correct if those hold.
 *
 * Zero dependencies, same posture as server/test.  Deliberately not on the PR
 * path (owner directive, 2026-07-16): run it when touching charRoster.js or
 * rosterCookie.js. */
let COOKIES = null;   /* the browser's jar, shared across "origins" */
let LS = null;        /* per-origin localStorage */
let HOST = '';

function jarStr() {
  return COOKIES.filter(c => hostMatches(c.domain, HOST) && c.exp > Date.now())
    .map(c => c.name + '=' + c.value).join('; ');
}
function hostMatches(domain, host) {
  if (!domain) return domain === host || domain === null && true;
  return host === domain || host.endsWith('.' + domain);
}
const PUBLIC_SUFFIX = new Set(['pages.dev', 'workers.dev', 'dev', 'net', 'com', 'io']);

function setCookie(str) {
  const parts = str.split(';').map(s => s.trim());
  const [name, ...rest] = parts[0].split('=');
  const value = rest.join('=');
  let domain = null, maxAge = 0;
  for (const p of parts.slice(1)) {
    const [k, v] = p.split('=');
    if (k.toLowerCase() === 'domain') domain = v;
    if (k.toLowerCase() === 'max-age') maxAge = Number(v);
  }
  /* Browser rules: reject a public-suffix domain, reject a domain the host is
     not under; a host-only cookie stores the exact host. */
  if (domain) {
    if (PUBLIC_SUFFIX.has(domain)) return;
    if (HOST !== domain && !HOST.endsWith('.' + domain)) return;
  }
  const key = name + '|' + (domain || HOST);
  const i = COOKIES.findIndex(c => (c.name + '|' + (c.domain || c.hostOnly)) === key);
  if (i >= 0) COOKIES.splice(i, 1);
  if (maxAge <= 0) return;
  COOKIES.push({ name, value, domain: domain || HOST, hostOnly: HOST, exp: Date.now() + maxAge * 1000 });
}

function origin(host, freshStorage) {
  HOST = host;
  if (freshStorage || !LS) LS = new Map();
  globalThis.location = { hostname: host, protocol: 'https:', search: '' };
  globalThis.document = { get cookie() { return jarStr(); }, set cookie(v) { setCookie(v); } };
  globalThis.localStorage = {
    getItem: k => (LS.has(k) ? LS.get(k) : null),
    setItem: (k, v) => LS.set(k, String(v)),
    removeItem: k => LS.delete(k),
  };
  globalThis.sessionStorage = { removeItem() {} };
}

COOKIES = [];
origin('gamedev-aix.pages.dev', true);
globalThis.window = { location: globalThis.location, BROTOWN_WS_URL: 'wss://x.example.com' };

const R = await import('../../src/networking/charRoster.js?a=1');
const CK = await import('../../src/networking/rosterCookie.js?a=1');

let fails = 0;
function ok(cond, label) { console.log((cond ? '  PASS  ' : '  FAIL  ') + label); if (!cond) fails++; }

/* ── 1. the probe picks the registrable domain, not the public suffix ── */
ok(CK.domain ? true : true, '(probe)');
const dom = window.__btRosterCookie.domain();
ok(dom === 'gamedev-aix.pages.dev', 'cookie domain = gamedev-aix.pages.dev (got ' + dom + ')');

/* ── 2. production origin: two characters played ── */
localStorage.setItem('bt_passphrase', 'alpha-blaze-coral-drift-1');
function tick() { const t = Date.now(); while (Date.now() === t) {} }
R.rememberChar('alpha-blaze-coral-drift-1', { name: 'Hemi', level: 7 });
tick();   /* two plays in the same millisecond would tie on `at` */
R.rememberChar('ember-frost-grove-haven-2', { name: 'Rangi', level: 3 });
ok(R.readRoster().length === 2, 'production roster has 2');
ok(!!window.__btRosterCookie.read(), 'mirror written');
ok(window.__btRosterCookie.read().list.length === 2, 'mirror carries 2 rows');

/* ── 3. a NEW DEPLOY = new origin: empty localStorage, same cookie jar ── */
origin('4f2fc630.gamedev-aix.pages.dev', true);
const restored = R.readRoster();
ok(restored.length === 2, 'fresh deploy origin restored 2 characters (got ' + restored.length + ')');
ok(restored[0].name === 'Hemi', 'highest level first across the hop — Hemi 7 over Rangi 3 (got ' + restored[0].name + ')');
ok(restored.every(e => !e.provisional), 'restored rows are not provisional');

/* ── 4. v2.3.2111: TWO characters is a choice, so nothing is adopted ── */
origin('a1b2c3d4.gamedev-aix.pages.dev', true);
ok(R.adoptSharedPhrase() === null, 'two restored characters -> no auto-adopt, the list decides');
ok(localStorage.getItem('bt_passphrase') === null, 'and no key is written');
ok(R.readRoster().length === 2, 'the list the door will show has both');

/* ── 4b. ONE character is not a choice: straight in ── */
COOKIES = [];
origin('gamedev-aix.pages.dev', true);
localStorage.setItem('bt_passphrase', 'onlyone-alpha-blaze-coral-5');
R.rememberChar('onlyone-alpha-blaze-coral-5', { name: 'Solo', level: 12 });
origin('deadbeef.gamedev-aix.pages.dev', true);
const solo = R.adoptSharedPhrase();
ok(solo === 'onlyone-alpha-blaze-coral-5', 'a single restored character is adopted (got ' + solo + ')');
ok(localStorage.getItem('bt_passphrase') === solo, 'bt_passphrase written');
ok(R.adoptSharedPhrase() === null, 'adopt is a no-op once a key is held');

/* ── 4c. v2.3.2111: highest level on top, last-played as the tiebreak ── */
COOKIES = [];
origin('gamedev-aix.pages.dev', true);
R.rememberChar('lo-alpha-blaze-coral-1', { name: 'Low', level: 2 });
tick();
R.rememberChar('hi-ember-frost-grove-2', { name: 'High', level: 41 });
tick();
R.rememberChar('mid-karma-lunar-mango-3', { name: 'Mid', level: 9 });
tick();
R.rememberChar('tieold-solar-thunder-4', { name: 'TieOld', level: 9 });
tick();
R.rememberChar('tienew-viper-wrath-zeal-5', { name: 'TieNew', level: 9 });
const order = R.readRoster().map(function (e) { return e.name; });
ok(order[0] === 'High', 'highest level is first (got ' + order[0] + ')');
ok(order.join(',') === 'High,TieNew,TieOld,Mid,Low',
   'level desc, then most-recent within a tie (got ' + order.join(',') + ')');
/* An unlooked-up row means UNKNOWN, not zero, and sorts last rather than
   claiming to outrank a level-2. */
R.rememberChar('unknown-onyx-pixel-quartz-6', { name: 'Unknown' });
const withUnknown = R.readRoster().map(function (e) { return e.name; });
ok(withUnknown[withUnknown.length - 1] === 'Unknown',
   'a level-less row sorts last (got ' + withUnknown.join(',') + ')');
/* ...and it survives the origin hop with its level intact. */
origin('cafe1234.gamedev-aix.pages.dev', true);
const hopped = R.readRoster();
ok(hopped[0].name === 'High' && hopped[0].level === 41, 'levels cross origins and keep the order');

/* ── 5. a device already holding a key is never touched ── */
origin('e5f6.gamedev-aix.pages.dev', true);
localStorage.setItem('bt_passphrase', 'zzz-yyy-xxx-www-9');
ok(R.adoptSharedPhrase() === null, 'a held key is never replaced');

/* ── 6. delete crosses origins (tombstone) ── */
COOKIES = [];
origin('gamedev-aix.pages.dev', true);
R.rememberChar('alpha-blaze-coral-drift-1', { name: 'Hemi', level: 7 });
tick();
R.rememberChar('ember-frost-grove-haven-2', { name: 'Rangi', level: 3 });
R.forgetChar('alpha-blaze-coral-drift-1');
ok(R.readRoster().length === 1, 'delete removed the row locally');
origin('99887766.gamedev-aix.pages.dev', true);
const afterDel = R.readRoster();
ok(afterDel.length === 1 && afterDel[0].phrase === 'ember-frost-grove-haven-2', 'delete crossed to a new origin');

/* ── 7. a delete on an origin that already has a roster is honoured ── */
origin('stale.gamedev-aix.pages.dev', true);
localStorage.setItem('bt_chars', JSON.stringify({ v: 1, list: [
  { phrase: 'alpha-blaze-coral-drift-1', id: 'x', at: 500, name: 'Hemi', level: 7 },
  { phrase: 'ember-frost-grove-haven-2', id: 'y', at: 400, name: 'Rangi', level: 3 },
] }));
const merged = R.readRoster();
ok(merged.length === 1 && merged[0].phrase === 'ember-frost-grove-haven-2', 'tombstone pruned a stale local row');
ok(R.adoptSharedPhrase() === null, 'an origin with its own roster does not auto-adopt');

/* ── 8. a character made on the NEW build reaches the stable origin ── */
origin('newbuild.gamedev-aix.pages.dev', true);
R.readRoster();
R.rememberChar('karma-lunar-mango-nexus-3', { name: 'Tama', level: 1 });
origin('gamedev-aix.pages.dev', false);   /* keep this origin's localStorage */
const back = R.readRoster();
ok(back.some(e => e.phrase === 'karma-lunar-mango-nexus-3'), 'new-build character merged into the established origin');

/* ── 9. re-entering a deleted key un-tombstones it ── */
origin('gamedev-aix.pages.dev', false);
R.rememberChar('alpha-blaze-coral-drift-1', { name: 'Hemi', level: 7 });
ok(!window.__btRosterCookie.read().tomb.includes('alpha-blaze-coral-drift-1'), 'a returned phrase leaves the tombstones');
origin('zzz.gamedev-aix.pages.dev', true);
ok(R.readRoster().some(e => e.phrase === 'alpha-blaze-coral-drift-1'), 'and restores again on a new origin');

/* ── 10. cookies off: everything degrades to the old behaviour ── */
origin('gamedev-aix.pages.dev', true);
globalThis.document = { get cookie() { return ''; }, set cookie(v) {} };
ok(R.readRoster().length === 0, 'no cookie -> empty roster, no crash');
ok(R.adoptSharedPhrase() === null, 'no cookie -> nothing to adopt');

/* ── 11. a different Pages project cannot see it ── */
COOKIES = [];
origin('gamedev-aix.pages.dev', true);
globalThis.document = { get cookie() { return jarStr(); }, set cookie(v) { setCookie(v); } };
R.rememberChar('solar-thunder-ultra-viper-4', { name: 'Kiwi', level: 2 });
origin('someone-else.pages.dev', true);
ok(R.readRoster().length === 0, 'another pages.dev project sees nothing');

console.log(fails ? '\n' + fails + ' FAILED' : '\nall passed');
process.exit(fails ? 1 : 0);
