/* ═══ v2.3.5286: THE PAGED EXPORT (grand plan step 4.7, card R PR 7) ═══
 * (the code: server/src/admin.js exportSources / exportPage and its route
 *  GET /api/admin/export; the switch: liveops.js _roomExportOn; the owner's
 *  steps: docs/OPERATIONS.md, "A copy of the room's records, a page at a time")
 *
 * The owner's copy of the room's records, a page at a time, by a registry
 * prefix or by one character's id, behind the admin key, OFF by default.
 *
 *   1. OFF BY DEFAULT: with no flag, `roomexport: false` or anything but
 *      `true`, the route answers "off" (409) and reads nothing; without the
 *      owner's key, 401;
 *   2. BY A PREFIX: pages walk every record of that prefix once, in key
 *      order, a record of another prefix never in them (`rpg:` never gives
 *      `rpgsnap:`), `next` null at the end; a single-key entry (`shop_stock`)
 *      is its one record;
 *   3. NEVER A LOGIN KEY OR THE HIDDEN SETTINGS: asked for by prefix, a 400;
 *      a character's pages never hold their `auth:`;
 *   4. BY A PLAYER: every record the registry marks as a character's
 *      (`whose: 'player'`), the snapshots' ring, the login wheel's stamp and
 *      the streak included, and nothing of another character's -- an id
 *      that starts with theirs included;
 *   5. THE ASK: a cursor from another ask, a limit not a number, an id with
 *      a `:` are refused; a limit past the most is clamped;
 *   6. IT WRITES NOTHING, and a page reads at most its limit;
 *   7. THE REGISTRY: no marked prefix is the start of another (so a prefix's
 *      page is that prefix's alone), and every character's prefix but the
 *      login's is in their pages.
 *
 * BREAK PROOF (rule 8), tried by hand, 2026-11-14:
 *   - `|| exportNever(p)` deleted from exportSources        -> FAIL 7 (the login's places read; the page's own
 *                                                              filter still drops them: a second wall)
 *   - ...and `exportNever(k) ||` deleted from exportPage too -> FAIL 3 (a character's pages give their `auth:`)
 *   - `opt.startAfter = cursor` deleted from exportPage     -> FAIL 2 (a page given again: the walk never ends)
 *   - `f.roomexport === true` made `!!f.roomexport`         -> FAIL 1 (`'yes'` turns it on)
 */
import { makeStorage, settle } from './testroom.mjs';
import { EXPORT, exportNever, exportSources, exportPage } from '../src/admin.js';
import { STORAGE_MARKS } from '../src/storagemarks.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 700) : ''); }
}

const A = 'bp_alpha', A2 = 'bp_alpha2', B = 'bp_beta';
const playerPrefixes = Object.keys(STORAGE_MARKS).filter((p) => STORAGE_MARKS[p].whose === 'player');
/* where a character's record of each prefix is kept (the registry's shapes) */
const keyOf = (p, id) => (p === 'rpgsnap:' ? p + id + ':20261114' : p === 'lspin:' ? 'lspin:p:' + id : p === 'cadence:' ? 'cadence:login:' + id : p === 'keyidx:' ? 'keyidx:h_' + id : p + id);

/* a room's storage: three characters with a record of every kind, a second
   snapshot and a parachute for A, three listings, the shop's pile, the hidden
   settings, a device's login wheel */
function seeded() {
  const seed = [];
  for (const id of [A, A2, B]) for (const p of playerPrefixes) seed.push([keyOf(p, id), { p, id }]);
  seed.push(['rpgsnap:' + A + ':20261113', { p: 'rpgsnap:', id: A, day: 13 }]);
  seed.push(['rpgsnap:' + A + ':prerestore-1763100000000', { p: 'rpgsnap:', id: A, pre: 1 }]);
  for (const n of [1, 2, 3]) seed.push(['store_listing:L' + n, { n }]);
  seed.push(['shop_stock', { herb: 4 }]);
  seed.push(['hidden_settings', { v: 1, s: { SECRET: 7 } }]);
  seed.push(['lspin:d:dev1', { pid: A }]);
  return makeStorage(seed);
}

/* every page of one ask, walked by its `next` (at most 100 pages) */
async function walk(storage, q) {
  const pages = [];
  let cursor = null;
  for (let n = 0; n < 100; n++) {
    const r = await exportPage(storage, { ...q, ...(cursor ? { cursor } : {}) });
    pages.push(r);
    if (!r.ok || !r.next) break;
    cursor = r.next;
  }
  return pages;
}
const keysOf = (pages) => pages.flatMap((r) => (r.rows || []).map((x) => x.k));

/* ══════════ 1. OFF BY DEFAULT ══════════ */
{
  const { GameRoom } = await import('../src/index.js');
  const st = seeded();
  const room = new GameRoom(st, { ADMIN_KEY: 'k-owner', LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } });
  await room._liveFlagsEnsure();
  const ask = (key, qs) => room._adminFetch(new Request('https://x/api/admin/export?' + qs, { headers: key ? { Authorization: 'Bearer ' + key } : {} }));
  let read = 0;
  const realList = st.storage.list, realGet = st.storage.get;
  st.storage.list = async (o) => { if (o && o.prefix && o.prefix !== 'liveflags') read++; return realList(o); };
  st.storage.get = async (k) => { if (Array.isArray(k) || (typeof k === 'string' && !['liveflags', 'admin_log'].includes(k))) read++; return realGet(k); };
  for (const [what, set] of [['no flag (the default)', () => { delete room._liveFlags.roomexport; }], ['`roomexport: false`', () => { room._liveFlags.roomexport = false; }], ['`roomexport: \'yes\'`', () => { room._liveFlags.roomexport = 'yes'; }], ['`roomexport: 1`', () => { room._liveFlags.roomexport = 1; }]]) {
    set();
    read = 0;
    const r = await ask('k-owner', 'prefix=rpg:');
    const j = await r.json();
    check('1. ' + what + ': "off" (409), nothing read', r.status === 409 && j.error === 'off' && /roomexport: true/.test(j.words) && read === 0, { status: r.status, j, read });
  }
  room._liveFlags.roomexport = true;
  check('1. ...on only with `roomexport: true`', room._roomExportOn() === true);
  const noKey = await ask(null, 'prefix=rpg:'), badKey = await ask('nope', 'prefix=rpg:');
  check('1. without the owner\'s key: 401, on or off', noKey.status === 401 && badKey.status === 401);
  const good = await ask('k-owner', 'prefix=rpg:&limit=2');
  const gj = await good.json();
  check('1. with the key and the flag: a page', good.status === 200 && gj.ok && gj.rows.length === 2 && gj.rows[0].k === 'rpg:' + A && gj.next === 'rpg:' + A2 && gj.marks.whose === 'player', gj);
  const bad = await ask('k-owner', 'prefix=auth:');
  check('1. ...a refused ask is a 400 with its words', bad.status === 400 && (await bad.json()).error === 'never');
  await settle();
}

/* ══════════ 2. BY A PREFIX ══════════ */
{
  const st = seeded();
  const pages = await walk(st.storage, { prefix: 'rpg:', limit: 2 });
  const ks = keysOf(pages);
  check('2. `rpg:` in pages of 2: every character\'s record once, in key order, then `next` null', JSON.stringify(ks) === JSON.stringify(['rpg:' + A, 'rpg:' + A2, 'rpg:' + B]) && pages[pages.length - 1].next === null && pages.every((r) => r.ok), { ks, pages: pages.length });
  check('2. ...never a record of another prefix (`rpgsnap:`, `rpgsnap_at:`)', !ks.some((k) => !k.startsWith('rpg:') || k.startsWith('rpgsnap')));
  const one = await walk(st.storage, { prefix: 'store_listing:', limit: 3 });
  check('2. a full last page says `next`, and the page after it is empty and ends', one.length === 2 && one[0].rows.length === 3 && one[0].next === 'store_listing:L3' && one[1].rows.length === 0 && one[1].next === null, one.map((r) => [r.rows.length, r.next]));
  const shop = await exportPage(st.storage, { prefix: 'shop_stock' });
  check('2. a single-key entry is its one record', shop.ok && shop.rows.length === 1 && shop.rows[0].k === 'shop_stock' && shop.rows[0].v.herb === 4 && shop.next === null && shop.marks.whose === 'room');
  const none = await exportPage(st.storage, { prefix: 'mkt_order:' });
  check('2. a prefix with no records: an empty page that ends', none.ok && none.rows.length === 0 && none.next === null && none.read === 0);
}

/* ══════════ 3. NEVER A LOGIN KEY OR THE HIDDEN SETTINGS ══════════ */
{
  const st = seeded();
  for (const p of ['auth:', 'keyidx:', 'hidden_settings']) {
    const r = await exportPage(st.storage, { prefix: p });
    check('3. `' + p + '` asked for: refused, nothing read', !r.ok && r.error === 'never' && !r.rows);
  }
  check('3. the list is the login\'s two and the hidden settings', JSON.stringify(EXPORT.NEVER) === JSON.stringify(['auth:', 'keyidx:', 'hidden_settings']) && exportNever('auth:' + A) && exportNever('keyidx:abc') && exportNever('hidden_settings') && !exportNever('hidden_settings2') && !exportNever('rpg:' + A));
  const ks = keysOf(await walk(st.storage, { player: A, limit: 4 }));
  check('3. a character\'s pages never give their login (`auth:`) nor a key\'s index', ks.length > 10 && !ks.some((k) => k.startsWith('auth:') || k.startsWith('keyidx:') || k === 'hidden_settings'), ks.filter((k) => /^(auth|keyidx):|hidden/.test(k)));
}

/* ══════════ 4. BY A PLAYER ══════════ */
{
  const st = seeded();
  for (const limit of [1, 3, 7, 200]) {
    const pages = await walk(st.storage, { player: A, limit });
    const ks = keysOf(pages);
    const want = playerPrefixes.filter((p) => !exportNever(p)).map((p) => keyOf(p, A))
      .concat(['rpgsnap:' + A + ':20261113', 'rpgsnap:' + A + ':prerestore-1763100000000']).sort();
    check('4. A\'s pages of ' + limit + ': every record marked a character\'s, each once, in key order, and nothing else', JSON.stringify(ks) === JSON.stringify(want) && pages.every((r) => r.ok && r.player === A), { missing: want.filter((k) => !ks.includes(k)), extra: ks.filter((k) => !want.includes(k)), pages: pages.length });
    if (limit === 3) {
      check('4. ...the snapshots\' ring, the login wheel\'s stamp and the streak in them', ks.includes('rpgsnap:' + A + ':prerestore-1763100000000') && ks.includes('lspin:p:' + A) && ks.includes('cadence:login:' + A) && !ks.includes('lspin:d:dev1'));
      check('4. ...nothing of `' + A2 + '` (an id that starts with A\'s) nor of B', !ks.some((k) => k.includes(A2) || k.includes(B)));
      check('4. ...each page at most its limit', pages.every((r) => r.rows.length <= 3 && r.read <= 3));
    }
  }
}

/* ══════════ 5. THE ASK ══════════ */
{
  const st = seeded();
  const cases = [
    ['nothing asked', {}, 'ask'],
    ['both a prefix and a player', { prefix: 'rpg:', player: A }, 'ask'],
    ['a prefix the registry does not mark', { prefix: 'rp' }, 'prefix'],
    ['a prefix by another spelling (`rpg`)', { prefix: 'rpg' }, 'prefix'],
    ['`__proto__`', { prefix: '__proto__' }, 'prefix'],
    ['an id with a `:`', { player: A + ':x' }, 'player'],
    ['an id too long', { player: 'b'.repeat(121) }, 'player'],
    ['a limit not a number', { prefix: 'rpg:', limit: 'lots' }, 'limit'],
    ['a cursor from another prefix', { prefix: 'rpg:', cursor: 'bank:' + A }, 'cursor'],
    ['a cursor from another character', { player: A, cursor: 'rpg:' + B }, 'cursor'],
    ['a cursor too long', { prefix: 'rpg:', cursor: 'rpg:' + 'x'.repeat(400) }, 'cursor'],
  ];
  for (const [what, q, err] of cases) {
    const r = await exportPage(st.storage, q);
    check('5. ' + what + ': refused (' + err + ')', !r.ok && r.error === err && typeof r.words === 'string', r);
  }
  const big = await exportPage(st.storage, { prefix: 'rpg:', limit: '999' });
  const small = await exportPage(st.storage, { prefix: 'rpg:', limit: '-4' });
  check('5. a limit past the most is clamped to ' + EXPORT.MAX + ', below 1 to 1', big.ok && big.limit === EXPORT.MAX && small.ok && small.limit === 1 && small.rows.length === 1);
  const dflt = await exportPage(st.storage, { prefix: 'rpg:' });
  check('5. no limit is ' + EXPORT.LIMIT, dflt.ok && dflt.limit === EXPORT.LIMIT);
}

/* ══════════ 6. IT WRITES NOTHING ══════════ */
{
  const st = seeded();
  const before = st.batches();
  const snap = JSON.stringify([...st._store.entries()].sort());
  await walk(st.storage, { player: A, limit: 2 });
  await walk(st.storage, { prefix: 'rpgsnap:', limit: 2 });
  await settle();
  check('6. a whole walk writes nothing', st.batches() === before && JSON.stringify([...st._store.entries()].sort()) === snap);
}

/* ══════════ 7. THE REGISTRY ══════════ */
{
  const marked = Object.keys(STORAGE_MARKS);
  const nested = [];
  for (const a of marked) for (const b of marked) if (a !== b && a.endsWith(':') && b.startsWith(a)) nested.push(a + ' ' + b);
  check('7. no marked prefix is the start of another (a prefix\'s page is its own)', nested.length === 0, nested);
  const src = exportSources({ player: A });
  const reached = new Set(src.sources.map((s) => (s.key || s.list)));
  const lost = playerPrefixes.filter((p) => !exportNever(p) && ![...reached].some((k) => k.startsWith(p)));
  check('7. every prefix marked a character\'s but the login\'s is in their pages (' + src.sources.length + ' places)', lost.length === 0 && src.sources.length === playerPrefixes.length - 2, lost);
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
if (failures) { console.log('room-export: FAILED'); process.exit(1); }
console.log('all room-export checks passed');
