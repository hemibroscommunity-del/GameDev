/* ═══ v2.3.5607: THE OWNER'S READS, A PAGE AT A TIME (card OPS PR 8) ═══
 *
 * Red team RT-2, F9: the owner's own Test panel reads listed a whole prefix
 * in one request -- the bot flags (`botstat:`, twice), the drawings and a
 * name's AP (`char:`), the economy (`rpg:`, `mkt_order:`, `inbox:`, every
 * page in one request).  After a viral week, ~20,000 rows of 1-2 KB read
 * into the room at once, against its 128 MB.  Each puts 1,000 rows here and
 * reads them through its route, a page at a time (`after`, `next`):
 *   1. no list made for any of them reads more than 200 rows (OWNER_PAGE),
 *      and every one carries a limit;
 *   2. /dev/botflags: every flagged player exactly once over the pages,
 *      a live record (in memory) on the one page whose ids hold it;
 *   3. /api/botstat?flagged=1: the same, the stored ones;
 *   4. /dev/looks: every character that drew, exactly once; the pages'
 *      total and fresh add up to the whole;
 *   5. /dev/apinfo: a name found on whichever page holds it; a page with
 *      nobody of the name answers ok and its `next`;
 *   6. /economy: the pages' sums are the whole (gold, players, orders and
 *      their gold, mailboxes and their entries); a bad cursor is a 400;
 *   7. a request with no `after` is the first page (an older panel). */
import { GameRoom } from '../src/index.js';
import { OWNER_PAGE } from '../src/liveops.js';

const KEY = 'test-admin-key-owner-pages';
const N = 1000;
let failed = 0, passed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

function makeState() {
  const store = new Map();
  const lists = [];
  return {
    store, lists,
    storage: {
      get: async (k) => { if (Array.isArray(k)) { const r = new Map(); for (const x of k) if (store.has(x)) r.set(x, store.get(x)); return r; } return store.get(k); },
      put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) store.delete(x); },
      /* in key order, with startAfter and limit, as the runtime's; each list noted */
      list: async (o) => {
        lists.push({ prefix: (o && o.prefix) || '', limit: (o && o.limit) || 0 });
        const out = new Map();
        for (const [k, v] of [...store].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
          if (o && o.prefix && !k.startsWith(o.prefix)) continue;
          if (o && o.startAfter && k <= o.startAfter) continue;
          if (o && o.limit && out.size >= o.limit) break;
          out.set(k, v);
        }
        return out;
      },
      setAlarm: async () => {}, getAlarm: async () => null, deleteAlarm: async () => {},
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const env = { ADMIN_KEY: KEY, LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } };
const pad = (i) => String(i).padStart(4, '0');
async function get(room, path) {
  const r = await room.fetch(new Request('https://w' + path, { headers: { Authorization: 'Bearer ' + KEY } }));
  let j = null; try { j = await r.json(); } catch (e) { j = null; }
  return { status: r.status, j };
}
/* walk a route's pages: `field` the list in each answer */
async function walk(room, path, field) {
  const pages = [];
  for (let after = null, i = 0; i < 60; i++) {
    const sep = path.includes('?') ? '&' : '?';
    const r = await get(room, path + (after ? sep + 'after=' + encodeURIComponent(after) : ''));
    pages.push(r);
    if (!r.j || !r.j.next) break;
    after = r.j.next;
  }
  return { pages, rows: pages.flatMap((p) => (p.j && Array.isArray(p.j[field]) ? p.j[field] : [])) };
}
const OWNER_PREFIXES = ['botstat:', 'char:', 'rpg:', 'mkt_order:', 'inbox:'];
function listsOk(state, from) {
  const mine = state.lists.slice(from).filter((l) => OWNER_PREFIXES.includes(l.prefix));
  return { ok: mine.length > 0 && mine.every((l) => l.limit > 0 && l.limit <= OWNER_PAGE), mine: mine.length, over: mine.filter((l) => !(l.limit > 0 && l.limit <= OWNER_PAGE)) };
}

const T = Date.UTC(2026, 10, 17, 12, 0, 0);
const INK = 'f'.repeat(256);

// ── 1-3. the bot flags ──
{
  const state = makeState();
  const room = new GameRoom(state, env);
  const flagged = new Set();
  for (let i = 0; i < N; i++) {
    const id = 'bp_f' + pad(i);
    const isFlagged = i % 2 === 0;
    state.store.set('botstat:' + id, { v: 1, counters: {}, score: isFlagged ? 12 : 0, updatedAt: T,
      flags: isFlagged ? [{ at: T - i * 1000, kind: 'variance-collapse', detail: {} }] : [] });
    if (isFlagged) flagged.add(id);
  }
  /* in memory: one stored too (counted once), two only here, far apart in the ids */
  for (const id of ['bp_f0002', 'bp_f0451x', 'bp_f9999']) {
    const rec = room._botfpRecord(id, T);
    rec.flags.push({ at: T, kind: 'suspicion-threshold', detail: {} });
    flagged.add(id);
  }
  const l0 = state.lists.length;
  const w = await walk(room, '/api/admin/dev/botflags', 'flagged');
  const ids = w.rows.map((r) => r.id);
  check(`2. /dev/botflags: ${flagged.size} flagged over ${w.pages.length} pages, each exactly once`,
    w.pages.length >= Math.ceil(N / OWNER_PAGE) && ids.length === flagged.size && new Set(ids).size === ids.length && ids.every((id) => flagged.has(id)),
    { pages: w.pages.length, n: ids.length, want: flagged.size });
  check('2. ...a live record on the page whose ids hold it (the last page holds the one past every stored id)',
    !!(w.pages[w.pages.length - 1].j.flagged || []).find((r) => r.id === 'bp_f9999')
    && !!w.pages.find((p) => (p.j.flagged || []).some((r) => r.id === 'bp_f0451x') && p !== w.pages[0]));
  check('2. ...newest flag first within a page', w.pages.every((p) => (p.j.flagged || []).every((r, k, a) => k === 0 || ((a[k - 1].last && a[k - 1].last.at) || 0) >= ((r.last && r.last.at) || 0))));
  const lc = listsOk(state, l0);
  check(`1. /dev/botflags: every list it made carried a limit of at most ${OWNER_PAGE} (${lc.mine} lists)`, lc.ok, lc);
  check('7. no `after`: the first page, with its `next`', w.pages[0].j.ok === true && typeof w.pages[0].j.next === 'string');

  const l1 = state.lists.length;
  const w3 = await walk(room, '/api/botstat?flagged=1', 'flagged');
  const ids3 = w3.rows.map((r) => r.id);
  const storedFlagged = [...flagged].filter((id) => state.store.has('botstat:' + id));
  check(`3. /api/botstat?flagged=1: the ${storedFlagged.length} stored flagged over ${w3.pages.length} pages, each once`,
    ids3.length === storedFlagged.length && new Set(ids3).size === ids3.length, { n: ids3.length, want: storedFlagged.length });
  const lc3 = listsOk(state, l1);
  check('1. /api/botstat?flagged=1: every list at most ' + OWNER_PAGE, lc3.ok, lc3);
}

// ── 4-5. the characters: drawings, and a name's AP ──
{
  const state = makeState();
  const room = new GameRoom(state, env);
  const drew = new Set();
  const SEEN = T - 500 * 1000;
  state.store.set('artwatch_seen', { at: SEEN });
  for (let i = 0; i < N; i++) {
    const id = 'bp_c' + pad(i);
    const look = { sk: 'tan', hr: 'mop', hc: 'brown', st: 'tee' };
    if (i % 3 === 0) { look.tf = INK; drew.add(id); }
    state.store.set('char:' + id, { name: i === 120 || i === 750 ? 'Needle' : 'Hay' + i, createdAt: T - i * 1000, look });
  }
  const l0 = state.lists.length;
  const w = await walk(room, '/api/admin/dev/looks', 'rows');
  const ids = w.rows.map((r) => r.id);
  const total = w.pages.reduce((n, p) => n + ((p.j && p.j.total) || 0), 0);
  const fresh = w.pages.reduce((n, p) => n + ((p.j && p.j.fresh) || 0), 0);
  const wantFresh = [...drew].filter((id) => T - Number(id.slice(4)) * 1000 > SEEN).length;
  check(`4. /dev/looks: the ${drew.size} who drew over ${w.pages.length} pages, each once`,
    ids.length === drew.size && new Set(ids).size === ids.length && ids.every((id) => drew.has(id)), { n: ids.length, want: drew.size });
  check(`4. ...the pages' total and fresh add up to the whole (${total}, ${fresh})`, total === drew.size && fresh === wantFresh, { total, fresh, wantFresh });
  check('4. ...newest first within a page', w.pages.every((p) => (p.j.rows || []).every((r, k, a) => k === 0 || a[k - 1].createdAt >= r.createdAt)));
  const lc = listsOk(state, l0);
  check('1. /dev/looks: every list at most ' + OWNER_PAGE, lc.ok, lc);

  const l1 = state.lists.length;
  const a = await walk(room, '/api/admin/dev/apinfo?name=needle', 'players');
  const found = a.rows.map((p) => p.id).sort();
  check(`5. /dev/apinfo: both "Needle"s found, on the pages that hold them (${a.pages.length} pages)`,
    found.join() === 'bp_c0120,bp_c0750' && a.pages.length <= Math.ceil(N / OWNER_PAGE) + 1   /* a last full page answers a next, read empty */, { found, pages: a.pages.length });
  check('5. ...a page with nobody of the name answers ok, with its next', a.pages.some((p) => p.status === 200 && p.j.ok && p.j.players.length === 0 && typeof p.j.next === 'string'));
  const none = await get(room, '/api/admin/dev/apinfo?name=nobody');
  check('5. ...and a first page that is not the whole list never says "no character named"', none.status === 200 && none.j.ok && none.j.players.length === 0 && !!none.j.next, none);
  const lc5 = listsOk(state, l1);
  check('1. /dev/apinfo: every list at most ' + OWNER_PAGE, lc5.ok, lc5);
}

// ── 6. the economy ──
{
  const state = makeState();
  const room = new GameRoom(state, env);
  let gold = 0, esc = 0, entries = 0;
  for (let i = 0; i < N; i++) { state.store.set('rpg:bp_e' + pad(i), { coins: i, level: 1 + (i % 40) }); gold += i; }
  for (let i = 0; i < N; i++) { state.store.set('mkt_order:o' + pad(i), { type: i % 2 ? 'buy' : 'sell', price: 3, item: 'x' }); }
  for (let i = 0; i < 120; i++) { state.store.set('inbox:bp_e' + pad(i), [{ kind: 'gold', amount: 1 }, { kind: 'gold', amount: 2 }]); }
  const l0 = state.lists.length;
  const pages = [];
  for (let after = null, i = 0; i < 60; i++) {
    const r = await get(room, '/api/admin/economy' + (after ? '?after=' + encodeURIComponent(after) : ''));
    pages.push(r);
    if (!r.j || !r.j.next) break;
    after = r.j.next;
  }
  const sum = (f) => pages.reduce((n, p) => n + (f(p.j) || 0), 0);
  for (const p of pages) if (p.j && p.j.market) esc += p.j.market.escrowedGold;
  for (const p of pages) if (p.j && p.j.inbox) entries += p.j.inbox.pendingEntries;
  check(`6. /economy over ${pages.length} pages: the players' gold and count are the whole (${sum((j) => j.totalGold)}, ${sum((j) => j.playerBlobs)})`,
    sum((j) => j.totalGold) === gold && sum((j) => j.playerBlobs) === N, { gold, pages: pages.length });
  check('6. ...the orders and the mail too', sum((j) => j.market && j.market.openOrders) === N && esc === (N / 2) * 3
    && sum((j) => j.inbox && j.inbox.inboxes) === 120 && entries === 240, { esc, entries });
  check('6. ...each page one table\'s, in order: players, market, inbox', pages.every((p) => p.status === 200 && p.j.ok)
    && pages.map((p) => p.j.part).join().replace(/(players,)+/, 'P,').replace(/(market,)+/, 'M,').replace(/(inbox,?)+/, 'I') === 'P,M,I');
  check('6. ...the top 10 of a page are its richest, and the history rides every page', pages[0].j.top10.length === 10 && pages[0].j.top10[0].coins >= pages[0].j.top10[9].coins && pages.every((p) => Array.isArray(p.j.history)));
  const lc = listsOk(state, l0);
  check('1. /economy: every list at most ' + OWNER_PAGE + ', one table-page a request', lc.ok && lc.mine === pages.length, lc);
  const bad = await get(room, '/api/admin/economy?after=nonsense');
  check('6. a cursor that is no table\'s is a 400, in words', bad.status === 400 && bad.j.error === 'cursor' && /next/.test(bad.j.words || ''), bad);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
