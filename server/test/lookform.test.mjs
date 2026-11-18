/* ═══ v2.3.5807 (card RV, PR 7): A PLAYER'S `avatar` AND `color` IN THE GAME'S OWN FORMS ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md), finding S2: a player's `avatar` and
 * `color` were any text, drawn as a picture and a CSS background on other
 * screens -- a picture of their choosing, or every phone that looked fetching
 * from a server of theirs (each viewer's address and when they looked), and
 * through the board while they were away.  server/src/lookform.js holds the
 * two forms; the board keeps a colour only as a colour; the page draws only
 * the forms (src/game/lookForm.js; `?lookform=0` draws any, as before).
 *
 *   1. the forms: every honest value passes, each other value is dropped;
 *   2. the page's forms are the worker's, character for character, and the
 *      page's two draws agree with the worker's on every fixture;
 *   3. the board: a row's colour off its form is the board's own default; an
 *      honest one kept;
 *   4. `?lookform=0`: the page draws any value, as before.
 *
 * Red on main before this change: 1 and 2 (no forms at all) and 3a fail.
 * (The join's half is card K2's join.js; `track`'s is index.js's: both
 * import lookform.js once their files are free, the census says.)
 */
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}

let W = null, P = null;
try { W = await import('../src/lookform.js'); } catch (e) { W = null; }
try { P = await import('../../src/game/lookForm.js'); } catch (e) { P = null; }

const wsrv = (url, size) => `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&fit=cover&output=png`;
const HONEST_AVATARS = [
  wsrv('https://ipfs.io/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/1234.png', 64),
  wsrv('https://example-cdn.net/hemi bros/bro_#42.png?v=2', 64),
  wsrv('https://arweave.net/abc-DEF_123', 32),
];
const BAD_AVATARS = [
  'data:image/png;base64,iVBORw0KGgo=',
  'https://e.example/beacon.png',
  '//e.example/x',
  'javascript:alert(1)',
  'https://wsrv.nl/?url=x" onerror="y',
  "https://wsrv.nl/?url=x')",
  'https://wsrv.nl/?url=a b',
  'https://wsrv.nl/?url=a\\b',
  'https://wsrv.nl.evil.example/?url=x',
  'https://wsrv.nl/?url=',
  'https://wsrv.nl/?url=' + 'a'.repeat(600),
  42, null, { toString: () => 'x' },
];
const HONEST_COLORS = ['#5b52ff', '#FFF', '#a1b2c3d4', '#abcd'];
const BAD_COLORS = ['url(//e.co/x)', 'url(https://e.example/d)', 'red', '#12345', '#ggg', 'rgb(1,2,3)', '#5b52ff;background:url(x)', '', 7, null];

/* ── 1. the forms ── */
{
  const ok = !!W;
  check('1a. (the worker has the forms: server/src/lookform.js)', ok);
  if (ok) {
    const missA = HONEST_AVATARS.filter((v) => W.lookAvatar(v) !== v);
    const missC = HONEST_COLORS.filter((v) => W.lookColor(v) !== v);
    check('1b. every honest avatar and colour passes as it is', !missA.length && !missC.length, { missA, missC });
    const leakA = BAD_AVATARS.filter((v) => W.lookAvatar(v) !== null);
    const leakC = BAD_COLORS.filter((v) => W.lookColor(v) !== null);
    check('1c. every other value is dropped (null)', !leakA.length && !leakC.length, { leakA, leakC });
  }
}

/* ── 2. the page's forms are the worker's ── */
{
  check('2a. (the page has the forms: src/game/lookForm.js)', !!P);
  if (W && P) {
    const same = ['COLOR_RE', 'AVATAR_REST_RE'].every((k) => String(W.LOOK_FORM[k]) === String(P.PAGE_LOOK_FORM[k]))
      && W.LOOK_FORM.AVATAR_PREFIX === P.PAGE_LOOK_FORM.AVATAR_PREFIX && W.LOOK_FORM.AVATAR_MAX === P.PAGE_LOOK_FORM.AVATAR_MAX;
    check('2b. the page\'s forms are the worker\'s, character for character', same, { w: String(W.LOOK_FORM.COLOR_RE), p: String(P.PAGE_LOOK_FORM.COLOR_RE) });
    const diff = [...HONEST_AVATARS, ...BAD_AVATARS].filter((v) => P.drawAvatar(v) !== W.lookAvatar(v))
      .concat([...HONEST_COLORS, ...BAD_COLORS].filter((v) => P.drawColor(v, null) !== W.lookColor(v)));
    check('2c. the page draws exactly what the worker keeps, on every fixture', diff.length === 0, diff);
  }
}

/* ── 3. the board ── */
{
  const { Leaderboard } = await import('../src/index.js');
  const store = new Map();
  const st = { storage: {
    get: async (k) => store.get(k),
    put: async (k, v) => { store.set(k, typeof v === 'string' ? v : JSON.parse(JSON.stringify(v))); },
    list: async (o) => { const out = new Map(); for (const [k, v] of [...store].sort()) if (!o?.prefix || k.startsWith(o.prefix)) out.set(k, v); return out; },
    delete: async (k) => { store.delete(k); },
  }, getWebSockets: () => [], acceptWebSocket: () => {} };
  const L = new Leaderboard(st, {});
  const now = Date.now();
  await L.updatePlayer({ playerId: 'bp_rvlf_bad1', name: 'Beacon', color: 'url(//e.co/x)', level: 9, ts: now });
  await L.updatePlayer({ playerId: 'bp_rvlf_ok01', name: 'Honest', color: '#123456', level: 8, ts: now });
  const top = await L.getTop('level', 50);
  const rows = (top && (top.rows || top.players || top.top || top)) || [];
  const list = Array.isArray(rows) ? rows : [];
  const bad = list.find((r) => r && (r.id === 'bp_rvlf_bad1' || r.playerId === 'bp_rvlf_bad1'));
  const ok = list.find((r) => r && (r.id === 'bp_rvlf_ok01' || r.playerId === 'bp_rvlf_ok01'));
  check('3a. a board row\'s colour off its form is the board\'s own default', !!bad && bad.color === '#5b52ff', bad);
  check('3b. ...an honest colour is kept', !!ok && ok.color === '#123456', ok);
}

/* ── 4. the page's switch ── */
if (P) {
  const prev = globalThis.location;
  globalThis.location = { search: '?lookform=0', href: 'https://x.test/?lookform=0' };
  const a = P.drawAvatar('https://e.example/beacon.png');
  const c = P.drawColor('url(//e.co/x)', '#000');
  if (prev === undefined) delete globalThis.location; else globalThis.location = prev;
  check('4. `?lookform=0`: the page draws any value, as before', a === 'https://e.example/beacon.png' && c === 'url(//e.co/x)', { a, c });
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
