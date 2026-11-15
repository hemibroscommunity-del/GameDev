/* ═══ v2.3.5608: THE BOARDS, KEPT A MINUTE AND SWEPT (server/src/leaderboard.js; card OPS PR 9) ═══
 *
 * Red team RT-2 F8: getTop listed every `player:` row ever written, for every
 * public request.  RT-3 P1: anyone could read every player's playtime.  This
 * holds:
 *
 *   1. a board is kept TOP_TTL_MS: the second read inside it lists nothing;
 *      past it, the rows are read again; each board (category and limit) its
 *      own;
 *   2. `boardcache: false` (the room's post says `bc: 0`): every read lists,
 *      as before; the next post without it keeps again;
 *   3. the read sweeps the `player:` rows past 7 days it met, at most
 *      SWEEP_MAX a pass; a fresh row and a `gone:` stand-in are never swept;
 *   4. a row says `playtime` only on the playtime board, which still ranks
 *      by it;
 *   5. a character gone (markGone) is never served from a kept board;
 *   6. the room's own post says `bc: 0` when `boardcache` is thrown, and
 *      nothing otherwise;
 *   7. a row's lastSeen is its hour, and the answer says `seen: 'hour'`
 *      (RT-3 P1; public/tools/draw.html reads the window by the hour then);
 *      `exactseen: true` (the post says `xs: 1`): the exact time, no word,
 *      never from a board kept the other way; the next post without it,
 *      the hour again.
 */
import { readFileSync } from 'node:fs';
import { Leaderboard } from '../src/leaderboard.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

let NOW = Date.UTC(2026, 10, 15, 12, 0, 0);
const realNow = Date.now;
Date.now = () => NOW;
const DAY = 86400000;

function makeLb() {
  const store = new Map();
  const st = {
    lists: 0, deleted: 0,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      delete: async (k) => { const ks = Array.isArray(k) ? k : [k]; if (ks.length > 128) throw new Error('over 128 keys'); let n = 0; for (const x of ks) if (store.delete(x)) n++; st.deleted += n; return Array.isArray(k) ? n : n > 0; },
      list: async ({ prefix } = {}) => { if (prefix === 'player:') st.lists++; const m = new Map(); for (const [k, v] of [...store].sort()) if (!prefix || k.startsWith(prefix)) m.set(k, v); return m; },
    },
  };
  return { lb: new Leaderboard(st, {}), st, store };
}
const row = (i, extra) => ({ playerId: 'bp_bc_' + String(i).padStart(4, '0'), name: 'B' + i, level: 1 + (i % 30), rpgData: { playtime: 100 + i, kills: i }, series: { melee: 1 + (i % 30) }, ts: NOW, ...extra });

/* ── 1. kept a minute ── */
{
  const { lb, st } = makeLb();
  for (let i = 0; i < 20; i++) await lb.updatePlayer(row(i));
  const a = await lb.getTop('level', 50);
  const b = await lb.getTop('level', 50);
  check('1. the second read inside the minute lists nothing', st.lists === 1 && a.length === 20 && JSON.stringify(a) === JSON.stringify(b), st.lists);
  await lb.getTop('kills', 50);
  check('1. each board its own', st.lists === 2);
  NOW += 60001;
  await lb.getTop('level', 50);
  check('1. past the minute, read again', st.lists === 3);
}

/* ── 2. the switch ── */
{
  const { lb, st } = makeLb();
  await lb.updatePlayer(row(1, { bc: 0 }));
  await lb.getTop('level', 50); await lb.getTop('level', 50);
  check('2. `boardcache: false` (bc: 0 on the room\'s post): every read lists', st.lists === 2, st.lists);
  await lb.updatePlayer(row(2));
  await lb.getTop('level', 50); await lb.getTop('level', 50);
  check('2. the next post without it keeps again', st.lists === 3, st.lists);
}

/* ── 3. the sweep ── */
{
  const { lb, st, store } = makeLb();
  for (let i = 0; i < 200; i++) await lb.updatePlayer(row(i, { ts: NOW - 8 * DAY }));
  for (let i = 200; i < 210; i++) await lb.updatePlayer(row(i));
  store.set('gone:bp_old#1', JSON.stringify({ id: 'bp_old#1', gone: NOW - 8 * DAY, lastSeen: NOW - 8 * DAY, level: 5 }));
  const t = await lb.getTop('level', 50);
  check('3. a read sweeps the rows past 7 days it met, at most 128 a pass', st.deleted === 128 && t.length === 10, { deleted: st.deleted, shown: t.length });
  NOW += 60001;
  await lb.getTop('level', 50);
  const left = [...store.keys()].filter((k) => k.startsWith('player:'));
  check('3. ...the rest at the next', st.deleted === 200 && left.length === 10, { deleted: st.deleted, left: left.length });
  check('3. a gone: stand-in is never swept here', store.has('gone:bp_old#1'));
}

/* ── 4. playtime ── */
{
  const { lb } = makeLb();
  for (let i = 0; i < 5; i++) await lb.updatePlayer(row(i));
  const lvl = await lb.getTop('level', 50);
  const pt = await lb.getTop('playtime', 50);
  check('4. a row says playtime only on the playtime board', lvl.every((r) => !('playtime' in r)) && pt.every((r) => typeof r.playtime === 'number'), { lvl: lvl[0], pt: pt[0] });
  check('4. ...which still ranks by it', JSON.stringify(pt.map((r) => r.playtime)) === JSON.stringify([104, 103, 102, 101, 100]), pt.map((r) => r.playtime));
}

/* ── 5. a character gone ── */
{
  const { lb } = makeLb();
  for (let i = 0; i < 3; i++) await lb.updatePlayer(row(i));
  const before = await lb.getTop('combat', 50);
  await lb.markGone({ playerId: 'bp_bc_0001', ts: NOW });
  const after = await lb.getTop('combat', 50);
  check('5. a character gone is never served from a kept board', before.some((r) => r.id === 'bp_bc_0001' && !r.gone) && !after.some((r) => r.id === 'bp_bc_0001' && !r.gone), after.map((r) => [r.id, !!r.gone]));
}

/* ── 6. the room's post ── */
{
  const src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  check('6. the room\'s post says bc: 0 when boardcache is thrown, and nothing otherwise',
    /this\._liveFlags\?\.boardcache === false \? \{ bc: 0 \} : \{\}/.test(src));
}

/* ── 7. last seen, to the hour ── */
{
  const { lb } = makeLb();
  const at = NOW + 37 * 60000 + 12345;   /* 12:37:12.345 */
  await lb.updatePlayer(row(1, { ts: at }));
  const serve = async () => {
    const res = await lb.fetch(new Request('https://lb/top?category=level&limit=50'));
    return res.json();
  };
  const j = await serve();
  const r = (j.results || [])[0];
  check('7. a row\'s lastSeen is its hour, and the answer says seen: hour',
    j.seen === 'hour' && r && r.lastSeen === Date.UTC(2026, 10, 15, 12, 0, 0), { seen: j.seen, lastSeen: r && r.lastSeen });
  await lb.updatePlayer(row(2, { ts: at, xs: 1 }));
  const jx = await serve();
  const rx = (jx.results || []).find((x) => x.id === 'bp_bc_0001');
  check('7. exactseen (xs: 1): the exact time and no word, never the kept hour board',
    !('seen' in jx) && rx && rx.lastSeen === at, { seen: jx.seen, lastSeen: rx && rx.lastSeen });
  await lb.updatePlayer(row(3, { ts: at }));
  const j2 = await serve();
  check('7. the next post without it: the hour again', j2.seen === 'hour' && (j2.results || []).every((x) => x.lastSeen % 3600000 === 0), j2.results && j2.results.map((x) => x.lastSeen));
  const src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  check('7. the room\'s post says xs: 1 when exactseen is true, and nothing otherwise',
    /this\._liveFlags\?\.exactseen === true \? \{ xs: 1 \} : \{\}/.test(src));
}

Date.now = realNow;
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
