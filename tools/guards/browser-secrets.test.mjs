/* ═══ v2.3.5718: SECRETS IN THE BROWSER STAY ON THE REAL SITE (card SEC PR 19) ═══
 *
 * Two page modules, tested in node with a browser's own rules stood in:
 *
 *   A. src/networking/rosterCookie.js: the roster's cookie (every Login Key
 *      the phone holds) was written on the WHOLE registrable domain, so every
 *      preview build (`<hash>.gamedev-aix.pages.dev`) could read the keys a
 *      player used on the project's own address.  Now it is host-only:
 *        1. keys written on gamedev-aix.pages.dev: a preview host reads none;
 *        2. ...the host that wrote them reads them back (the real site keeps
 *           its roster);
 *        3. a wide copy an older build wrote is taken away at the first write;
 *        4. `?rostercookie=0`: the wide cookie, as before (a preview reads it);
 *        5. the small flags (readSharedValue, no secret) keep the wide scope.
 *   B. src/game/adminKeyStore.js: the Test panel's admin key:
 *        6. kept for the browser session by default (sessionStorage), never
 *           on the device;
 *        7. with "Remember on this device", on the device, and not in both;
 *        8. a key remembered before this version is still read (remembered);
 *           forget clears both; a store that throws is survived;
 *        9. the Test panel uses it, with the tick.
 *
 * BREAK PROOF (rule 8), tried by hand: rosterCookie.js's writeShared on
 * _domainFor() as before -> FAIL 1, 3; DevPanel.jsx back on localStorage ->
 * FAIL 9.
 *
 * Run from the repository's root: node tools/guards/browser-secrets.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600)));
};

/* ── a cookie jar with the browser's rules: host-only or a Domain the host is
   under; a public suffix refused; Max-Age=0 deletes ── */
const PUBLIC_SUFFIX = new Set(['dev', 'pages.dev', 'net', 'com']);
const jar = new Map();   /* name|scope -> { name, value, domain|null, host } */
globalThis.location = { hostname: 'gamedev-aix.pages.dev', protocol: 'https:', search: '' };
const host = () => globalThis.location.hostname;
globalThis.document = {
  get cookie() {
    const H = host();
    return [...jar.values()].filter((c) => (c.domain === null ? c.host === H : (H === c.domain || H.endsWith('.' + c.domain))))
      .map((c) => c.name + '=' + c.value).join('; ');
  },
  set cookie(str) {
    const parts = String(str).split(';').map((s) => s.trim());
    const eq = parts[0].indexOf('=');
    const name = parts[0].slice(0, eq), value = parts[0].slice(eq + 1);
    let domain = null, maxAge = null;
    for (const p of parts.slice(1)) {
      const [k, v] = p.split('=');
      if (/^domain$/i.test(k)) domain = String(v || '').replace(/^\./, '').toLowerCase();
      if (/^max-age$/i.test(k)) maxAge = Number(v);
    }
    const H = host();
    if (domain !== null && (PUBLIC_SUFFIX.has(domain) || !(H === domain || H.endsWith('.' + domain)))) return;   /* refused */
    const keyOf = name + '|' + (domain === null ? 'host:' + H : 'dom:' + domain);
    if (maxAge !== null && maxAge <= 0) { jar.delete(keyOf); return; }
    jar.set(keyOf, { name, value, domain, host: H });
  },
};
const at = (h, search) => { globalThis.location.hostname = h; globalThis.location.search = search || ''; };
const KEY = 'blaze-frost-nova-titan-ember-crown-river-stone';
const RC = await import('../../src/networking/rosterCookie.js');
const keysSeen = () => { const r = RC.readShared(); return r ? r.list.map((e) => e.phrase) : []; };

/* 1 + 2 */
{
  at('gamedev-aix.pages.dev');
  RC.writeShared([{ phrase: KEY, at: 5, name: 'Pat', level: 3 }], []);
  check('2: the host that wrote the roster reads its key back', keysSeen().includes(KEY), keysSeen());
  at('abc123.gamedev-aix.pages.dev');
  check('1: a preview build on another host of the domain reads no key', !keysSeen().includes(KEY), [...jar.keys()]);
  at('brotown.net');
  RC.writeShared([{ phrase: KEY, at: 6, name: 'Pat', level: 3 }], []);
  at('pr9.brotown.net');
  check('1: ...and the real site\'s roster is not readable from a host under it', !keysSeen().includes(KEY));
  at('brotown.net');
  check('2: brotown.net keeps its roster', keysSeen().includes(KEY));
}

/* 3. an older build's wide copy */
{
  jar.clear();
  at('gamedev-aix.pages.dev', '?rostercookie=0');
  RC.writeShared([{ phrase: KEY, at: 7, name: 'Old', level: 1 }], []);
  at('abc123.gamedev-aix.pages.dev', '');
  check('3: (an older build\'s wide copy, a preview reads it: guard)', keysSeen().includes(KEY));
  at('gamedev-aix.pages.dev', '');
  RC.writeShared([{ phrase: KEY, at: 8, name: 'New', level: 1 }], []);
  at('abc123.gamedev-aix.pages.dev', '');
  check('3: the first write of this build takes the wide copy away', !keysSeen().includes(KEY), [...jar.keys()]);
}

/* 4. the off-ramp */
{
  jar.clear();
  at('gamedev-aix.pages.dev', '?rostercookie=0');
  RC.writeShared([{ phrase: KEY, at: 9, name: 'Pat', level: 3 }], []);
  at('abc123.gamedev-aix.pages.dev', '?rostercookie=0');
  check('4: ?rostercookie=0: the wide cookie, as before (a preview reads it)', keysSeen().includes(KEY));
}

/* 5. the flags */
{
  jar.clear();
  at('gamedev-aix.pages.dev', '');
  RC.writeSharedValue('bt_welcome_shared', '1');
  at('abc123.gamedev-aix.pages.dev', '');
  check('5: a small flag (no secret) keeps the wide scope', RC.readSharedValue('bt_welcome_shared') === '1');
}

/* ── B. the admin key ── */
const AK = await import('../../src/game/adminKeyStore.js');
const store = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
{
  const s = { local: store(), session: store() };
  AK.saveAdminKey(s, ' secret-1 ', false);
  check('6: by default the key is kept for the session, never on the device', s.session.m.get(AK.ADMIN_KEY_STORE) === 'secret-1' && !s.local.m.has(AK.ADMIN_KEY_STORE));
  check('6: ...and read back, not remembered', JSON.stringify(AK.loadAdminKey(s)) === JSON.stringify({ key: 'secret-1', remembered: false }));
  AK.saveAdminKey(s, 'secret-2', true);
  check('7: "Remember on this device": on the device, and not in both', s.local.m.get(AK.ADMIN_KEY_STORE) === 'secret-2' && !s.session.m.has(AK.ADMIN_KEY_STORE) && AK.loadAdminKey(s).remembered === true);
  const legacy = { local: store(), session: store() };
  legacy.local.setItem(AK.ADMIN_KEY_STORE, 'old-key');
  check('8: a key remembered before this version is still read, as remembered', AK.loadAdminKey(legacy).key === 'old-key' && AK.loadAdminKey(legacy).remembered === true);
  AK.forgetAdminKey(s);
  check('8: forget clears both', !s.local.m.has(AK.ADMIN_KEY_STORE) && !s.session.m.has(AK.ADMIN_KEY_STORE) && AK.loadAdminKey(s).key === '');
  const boom = { getItem() { throw new Error('private'); }, setItem() { throw new Error('private'); }, removeItem() { throw new Error('private'); } };
  let threw = false;
  try { AK.saveAdminKey({ local: boom, session: boom }, 'k', false); AK.loadAdminKey({ local: boom, session: boom }); AK.forgetAdminKey({ local: boom, session: boom }); } catch (e) { threw = true; }
  check('8: a store that throws (Safari private mode) is survived', !threw);
}
{
  const dev = readFileSync(join(ROOT, 'src/ui/panels/DevPanel.jsx'), 'utf8');
  check('9: the Test panel keeps its key through adminKeyStore, never localStorage directly', /from '\.\.\/\.\.\/game\/adminKeyStore\.js'/.test(dev) && !/localStorage\.(get|set|remove)Item\(KEY_LS/.test(dev) && /saveAdminKey\(pageStores\(\), k, rememberKey\)/.test(dev));
  check('9: ...with the tick, "Remember on this device", off by default', /Remember on this device/.test(dev) && /useState\(false\);?\s*$/m.test(dev.split('rememberKey, setRememberKey')[1].split('\n')[0]));
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
