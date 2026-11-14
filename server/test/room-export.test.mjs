/* ═══ v2.3.5286: THE PAGED EXPORT (grand plan step 4.7, card R PR 7) ═══
 * (the code: server/src/admin.js exportSources / exportPage and its route
 *  GET /api/admin/export; the switch: liveops.js _roomExportOff; the owner's
 *  steps: docs/OPERATIONS.md, "A copy of the room's records, a page at a time")
 *
 * The owner's copy of the room's records, a page at a time, by a registry
 * prefix or by one character's id, behind the admin key.  ON (the owner,
 * 2026-11-14: "Just go recommended": it costs only when the owner runs it);
 * `roomexport: false` turns it off.
 *
 *   1. ON, AND ITS SWITCH: with no flag or `roomexport: true`, a page; with
 *      `roomexport: false` (or 0), the route answers "off" (409) and reads
 *      nothing; without the owner's key, 401, on or off;
 *   2. BY A PREFIX: pages walk every record of that prefix once, in key
 *      order, a record of another prefix never in them (`rpg:` never gives
 *      `rpgsnap:`), `next` null at the end; a single-key entry (`shop_stock`)
 *      is its one record;
 *   3. AN ALLOW LIST (the gatekeeper's medium, sitting 16): only the
 *      prefixes on EXPORT.ALLOW come out, each a character's own or one
 *      holding the world's value; every other marked prefix asked for is
 *      refused (so a mark added since is out until it is listed); a record
 *      no mark owns, the logins, the device ids (`device:`, `lspin:`,
 *      `botstat:`) and the hidden settings never come out of any page, even
 *      a storage that hands one back; every character's record is on the
 *      list or kept out with its why;
 *   4. BY A PLAYER: every record of theirs the list gives, the snapshots'
 *      ring and the streak included, and nothing of another character's --
 *      an id that starts with theirs included;
 *   5. THE ASK: a cursor from another ask, a limit not a number, an id with
 *      a `:` are refused; a limit past the most is clamped;
 *   6. IT WRITES NOTHING, and a page reads at most its limit;
 *   6b. A VALUE IT MUST NOT GIVE (the gatekeeper's second medium, sitting 17,
 *      its node probe): a login-wheel pot's opId in the mail,
 *      'loginspin:d:<device id>:<day>', comes out masked by prefix and by
 *      player; the stored opId is unchanged; other entries as they are;
 *   7. THE REGISTRY: no marked prefix is the start of another (so a prefix's
 *      page is that prefix's alone), and every character's prefix the list
 *      gives is in their pages.
 *
 * BREAK PROOF (rule 8), tried by hand, 2026-11-14:
 *   - the `!EXPORT.ALLOW.includes(prefix)` line made `if (false)` -> FAIL 3 (a prefix off the list given)
 *   - `!exportAllowed(k) ||` deleted from exportPage          -> FAIL 3 (a record no mark owns, handed back, given)
 *   - `opt.startAfter = cursor` deleted from exportPage     -> FAIL 2 (a page given again: the walk never ends)
 *   - `hasOwnProperty.call(f, 'roomexport') &&` deleted     -> FAIL 1 (no flag reads as off)
 *   - `v: exportMasked(k, v)` made `v` in exportPage          -> FAIL 6b (the device id comes out)
 */
import { makeStorage, settle } from './testroom.mjs';
import { EXPORT, EXPORT_MASKS, exportAllowed, exportSources, exportPage } from '../src/admin.js';
import { STORAGE_MARKS } from '../src/storagemarks.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 700) : ''); }
}

const A = 'bp_alpha', A2 = 'bp_alpha2', B = 'bp_beta';
const playerPrefixes = Object.keys(STORAGE_MARKS).filter((p) => STORAGE_MARKS[p].whose === 'player');
const allowedPlayer = EXPORT.ALLOW.filter((p) => STORAGE_MARKS[p] && STORAGE_MARKS[p].whose === 'player');
/* where a character's record of each prefix is kept (the registry's shapes) */
const keyOf = (p, id) => (p === 'rpgsnap:' ? p + id + ':20261114' : p === 'lspin:' ? 'lspin:p:' + id : p === 'cadence:' ? 'cadence:login:' + id : p === 'keyidx:' ? 'keyidx:h_' + id : p + id);

/* a room's storage: three characters with a record of every kind, a second
   snapshot and a parachute for A, three listings, the shop's pile, and what
   must never come out: the hidden settings, a device's login wheel and its
   record, the live flags, the owner's log, a record no mark owns */
function seeded() {
  const seed = [];
  for (const id of [A, A2, B]) for (const p of playerPrefixes) seed.push([keyOf(p, id), { p, id }]);
  seed.push(['rpgsnap:' + A + ':20261113', { p: 'rpgsnap:', id: A, day: 13 }]);
  seed.push(['rpgsnap:' + A + ':prerestore-1763100000000', { p: 'rpgsnap:', id: A, pre: 1 }]);
  for (const n of [1, 2, 3]) seed.push(['store_listing:L' + n, { n }]);
  seed.push(['shop_stock', { herb: 4 }]);
  seed.push(['hidden_settings', { v: 1, s: { SECRET: 7 } }]);
  seed.push(['lspin:d:dev1', { pid: A }]);
  seed.push(['device:dev1', { ids: [A] }]);
  seed.push(['liveflags', { roomexport: true }]);
  seed.push(['admin_log', [{ op: 'grant' }]]);
  seed.push(['zz_unmarked:1', { secret: 1 }]);
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
  for (const [what, set] of [['`roomexport: false`', () => { room._liveFlags.roomexport = false; }], ['`roomexport: 0`', () => { room._liveFlags.roomexport = 0; }]]) {
    set();
    read = 0;
    const r = await ask('k-owner', 'prefix=rpg:');
    const j = await r.json();
    check('1. ' + what + ': "off" (409), nothing read', r.status === 409 && j.error === 'off' && /roomexport: false/.test(j.words) && read === 0, { status: r.status, j, read });
  }
  for (const [what, set] of [['no flag (the default)', () => { delete room._liveFlags.roomexport; }], ['`roomexport: true`', () => { room._liveFlags.roomexport = true; }]]) {
    set();
    const r = await ask('k-owner', 'prefix=rpg:&limit=1');
    check('1. ' + what + ': on, a page', r.status === 200 && (await r.json()).rows.length === 1 && room._roomExportOff() === false);
  }
  delete room._liveFlags.roomexport;
  const noKey = await ask(null, 'prefix=rpg:'), badKey = await ask('nope', 'prefix=rpg:');
  check('1. without the owner\'s key: 401, on or off', noKey.status === 401 && badKey.status === 401);
  const good = await ask('k-owner', 'prefix=rpg:&limit=2');
  const gj = await good.json();
  check('1. with the key: a page', good.status === 200 && gj.ok && gj.rows.length === 2 && gj.rows[0].k === 'rpg:' + A && gj.next === 'rpg:' + A2 && gj.marks.whose === 'player', gj);
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

/* ══════════ 3. AN ALLOW LIST ══════════ */
{
  const st = seeded();
  const marked = Object.keys(STORAGE_MARKS);
  const offList = marked.filter((p) => !EXPORT.ALLOW.includes(p));
  const given = [];
  for (const p of offList) { const r = await exportPage(st.storage, { prefix: p }); if (r.ok || r.error !== 'never') given.push(p); }
  check('3. every marked prefix off the list (' + offList.length + ') asked for: refused (a mark added since is out until it is listed)', offList.length > 20 && given.length === 0, given);
  check('3. ...the logins, the device ids, the anti-bot evidence and the hidden settings among them', ['auth:', 'keyidx:', 'botstat:', 'lspin:', 'device:', 'hidden_settings', 'liveflags', 'admin_log'].every((p) => offList.includes(p)));
  const badAllow = EXPORT.ALLOW.filter((p) => !STORAGE_MARKS[p] || (STORAGE_MARKS[p].whose !== 'player' && STORAGE_MARKS[p].value === 'none'));
  check('3. the list holds only marked prefixes, each a character\'s own or one holding the world\'s value', badAllow.length === 0 && new Set(EXPORT.ALLOW).size === EXPORT.ALLOW.length, badAllow);
  const both = playerPrefixes.filter((p) => EXPORT.ALLOW.includes(p) === Object.prototype.hasOwnProperty.call(EXPORT.KEPT_OUT, p));
  check('3. every character\'s record is on the list or kept out with its why, never both', both.length === 0 && Object.keys(EXPORT.KEPT_OUT).every((p) => playerPrefixes.includes(p) && EXPORT.KEPT_OUT[p].length > 10), both);
  check('3. a key is allowed only by the mark that owns it', exportAllowed('rpg:' + A) && exportAllowed('cadence:login:' + A) && exportAllowed('shop_stock')
    && !exportAllowed('zz_unmarked:1') && !exportAllowed('hidden_settings') && !exportAllowed('device:dev1') && !exportAllowed('lspin:p:' + A) && !exportAllowed('auth:' + A) && !exportAllowed('__proto__') && !exportAllowed(null));
  /* every page of every prefix on the list, and A's: never a key off it */
  const all = [];
  for (const p of EXPORT.ALLOW) all.push(...keysOf(await walk(st.storage, { prefix: p, limit: 7 })));
  all.push(...keysOf(await walk(st.storage, { player: A, limit: 4 })));
  const leaked = all.filter((k) => !exportAllowed(k) || /dev1|zz_|hidden|liveflags|admin_log|^auth:|^keyidx:|^botstat:|^lspin:|^friend_msg:|^bro_link:/.test(k));
  check('3. every page of the list, and a character\'s, gives nothing off it (' + all.length + ' records)', all.length > 50 && leaked.length === 0, leaked);
  /* a storage that hands back a record no mark owns, or a login, inside a
     page: the page's own filter drops it (a second wall) */
  const sly = seeded();
  const list0 = sly.storage.list;
  sly.storage.list = async (o) => { const m = await list0(o); m.set('zz_unmarked:1', { secret: 1 }); m.set('auth:' + A, { pfHash: 'x' }); return m; };
  const r = await exportPage(sly.storage, { prefix: 'store_listing:', limit: 50 });
  check('3. ...a storage that hands one back: left out, counted in `skipped`', r.ok && r.rows.length === 3 && r.skipped === 2 && !r.rows.some((x) => !exportAllowed(x.k)), r);
  /* ...and in a character's pages, where no prefix's mark stands guard: the
     snapshots' list hands them back too */
  const pk = [];
  let pskip = 0;
  for (const pg of await walk(sly.storage, { player: A, limit: 200 })) { pk.push(...(pg.rows || []).map((x) => x.k)); pskip += pg.skipped || 0; }
  check('3. ...in a character\'s pages too: left out, counted', pk.length > 20 && !pk.some((k) => !exportAllowed(k)) && pskip >= 2, { off: pk.filter((k) => !exportAllowed(k)), pskip });
}

/* ══════════ 4. BY A PLAYER ══════════ */
{
  const st = seeded();
  for (const limit of [1, 3, 7, 200]) {
    const pages = await walk(st.storage, { player: A, limit });
    const ks = keysOf(pages);
    const want = allowedPlayer.map((p) => keyOf(p, A))
      .concat(['rpgsnap:' + A + ':20261113', 'rpgsnap:' + A + ':prerestore-1763100000000']).sort();
    check('4. A\'s pages of ' + limit + ': every record of theirs the list gives, each once, in key order, and nothing else', JSON.stringify(ks) === JSON.stringify(want) && pages.every((r) => r.ok && r.player === A), { missing: want.filter((k) => !ks.includes(k)), extra: ks.filter((k) => !want.includes(k)), pages: pages.length });
    if (limit === 3) {
      check('4. ...the snapshots\' ring and the streak in them; the login wheel\'s stamp (keyed by a device) not', ks.includes('rpgsnap:' + A + ':prerestore-1763100000000') && ks.includes('cadence:login:' + A) && !ks.includes('lspin:p:' + A) && !ks.includes('lspin:d:dev1'));
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

/* ══════════ 6b. A VALUE IT MUST NOT GIVE ══════════ */
{
  const DEV = 'devsecret9x';
  const box = [
    { opId: 'loginspin:d:' + DEV + ':20261114', ts: 1, source: 'dailyspin', kind: 'gold', payload: { amount: 30 }, note: 'Free daily spin' },
    { opId: 'loginspin:p:' + A + ':20261113', ts: 2, source: 'dailyspin', kind: 'gold', payload: { amount: 20 }, note: 'Free daily spin' },
    { opId: 'questitem:' + A + ':7', ts: 3, source: 'quest', kind: 'item', payload: { key: 'herb', count: 2 }, note: '' },
  ];
  const st = makeStorage([['inbox:' + A, box], ['rpg:' + A, { coins: 5 }]]);
  const stored = JSON.stringify(st._store.get('inbox:' + A));
  const byPrefix = await walk(st.storage, { prefix: 'inbox:' });
  const byPlayer = await walk(st.storage, { player: A });
  const out = JSON.stringify([byPrefix, byPlayer]);
  check('6b. a login-wheel pot\'s device id never comes out of the mail, by prefix or by player (the probe)', !out.includes(DEV) && byPrefix[0].rows.length === 1 && byPlayer.some((p) => p.rows.some((r) => r.k === 'inbox:' + A)), out.slice(0, 300));
  const got = byPrefix[0].rows[0].v;
  check('6b. ...masked, its day kept; the character\'s own wheel and the other entries as they are', got[0].opId === 'loginspin:d:masked:20261114' && got[1].opId === box[1].opId && JSON.stringify(got[2]) === JSON.stringify(box[2]) && got[0].payload.amount === 30, got);
  check('6b. ...the stored opId unchanged (a retried pot finds its stamp by it)', JSON.stringify(st._store.get('inbox:' + A)) === stored && st._store.get('inbox:' + A)[0].opId.includes(DEV));
  check('6b. ...the masks are on records the list gives', Object.keys(EXPORT_MASKS).every((p) => EXPORT.ALLOW.includes(p)));
}

/* ══════════ 7. THE REGISTRY ══════════ */
{
  const marked = Object.keys(STORAGE_MARKS);
  const nested = [];
  for (const a of marked) for (const b of marked) if (a !== b && a.endsWith(':') && b.startsWith(a)) nested.push(a + ' ' + b);
  check('7. no marked prefix is the start of another (a prefix\'s page is its own)', nested.length === 0, nested);
  const src = exportSources({ player: A });
  const reached = new Set(src.sources.map((s) => (s.key || s.list)));
  const lost = allowedPlayer.filter((p) => ![...reached].some((k) => k.startsWith(p)));
  check('7. every character\'s prefix the list gives is in their pages (' + src.sources.length + ' places), and no other', lost.length === 0 && src.sources.length === allowedPlayer.length && allowedPlayer.length === playerPrefixes.length - Object.keys(EXPORT.KEPT_OUT).length, lost);
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
if (failures) { console.log('room-export: FAILED'); process.exit(1); }
console.log('all room-export checks passed');
