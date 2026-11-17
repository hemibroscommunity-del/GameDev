/* ═══ v2.3.5705: THE LEADERBOARD HOLDS WHAT IT KEEPS AND WHAT IT READS (card SEC PR 6) ═══
 * (server/src/leaderboard.js BOARD_HOLD; docs/specs/board-cache.md)
 *
 * The second red team, on the public board and the room's reports:
 *   1. a negative `limit` returned nearly every row (`slice(0, -n)`): now 1
 *      to 100, at the route and in getTop;
 *   2. the kept board's key was the category AS SENT: every made-up category
 *      was the level board under a new key and a full read each time; now the
 *      board's real name is worked out first (one key, one read);
 *   3. updatePlayer kept clanTag, the name, the colour and five numbers of the
 *      client-reported rpgData as sent, of any size or type: now each held to
 *      its type and a short length (BOARD_HOLD), the series to numbers under
 *      a bounded number of short keys;
 *   4. a row over BOARD_HOLD.ROW_MAX bytes is not kept (the last one stands);
 *      an honest full row is far under it;
 *   5. the read lists `player:` a page at a time (BOARD_HOLD.PAGE) and sweeps
 *      the stale rows it met BEFORE the sort.
 * No board a player sees changes (boards, statboards, hiscores, board-cache
 * stay green).  No kill switch: the object learns the room's flags only by a
 * field on the room's own report (index.js, card K2's file).
 *
 * BREAK PROOF (rule 8), tried by hand: main's leaderboard.js -> FAIL 1, 2,
 * 3, 4 and 5.
 * Not a phone test: node, the object on a storage in memory. */
import * as LBM from '../src/leaderboard.js';
/* read by name, so main's file (with none of these) runs and FAILS: the break proof */
const { Leaderboard } = LBM;
const BOARD_HOLD = LBM.BOARD_HOLD || { LIMIT_MAX: 100, PAGE: 1000, ROW_MAX: 4096, SERIES_KEYS: 64 };
const boardLimit = LBM.boardLimit || ((v) => v);
import { STAT_BOARD_IDS } from '../src/statboards.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
let NOW = Date.UTC(2026, 10, 17, 12, 0, 0);
Date.now = () => NOW;
const DAY = 86400000;

function makeLb() {
  const store = new Map();
  const st = {
    lists: 0, pages: 0, order: [],
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      delete: async (k) => { const ks = Array.isArray(k) ? k : [k]; st.order.push('delete'); let n = 0; for (const x of ks) if (store.delete(x)) n++; return Array.isArray(k) ? n : n > 0; },
      /* a Durable Object's list: prefix, startAfter, limit, in key order */
      list: async ({ prefix, startAfter, limit } = {}) => {
        if (prefix === 'player:') { st.lists++; st.pages++; }
        const m = new Map();
        for (const [k, v] of [...store].sort()) {
          if (prefix && !k.startsWith(prefix)) continue;
          if (startAfter !== undefined && k <= startAfter) continue;
          m.set(k, v);
          if (limit && m.size >= limit) break;
        }
        return m;
      },
    },
  };
  return { lb: new Leaderboard(st, {}), st, store };
}
const row = (i, extra) => ({ playerId: 'bp_bh_' + String(i).padStart(5, '0'), name: 'B' + i, level: 1 + (i % 30), rpgData: { kills: i, playtime: 10 + i }, series: { melee: 1 + (i % 30) }, ts: NOW, ...extra });
const top = async (lb, q) => (await (await lb.fetch(new Request('https://x/api/leaderboard/top?' + q))).json());

/* 1. the limit */
{
  const { lb } = makeLb();
  for (let i = 0; i < 150; i++) await lb.updatePlayer(row(i));
  const neg = await top(lb, 'category=level&limit=-5');
  check('1. a negative limit lists one row, never nearly all of them', neg.ok && neg.results.length === 1, neg.results && neg.results.length);
  const big = await top(lb, 'category=level&limit=100000');
  check('1. a limit past 100 lists 100', big.results.length === 100, big.results.length);
  const none = await top(lb, 'category=ap');
  check('1. no limit lists 50, as before', none.results.length === 50, none.results.length);
  check('1. boardLimit: -5 -> 1, 0 -> 1, "abc" -> 50, 7 -> 7, 101 -> 100', boardLimit(-5) === 1 && boardLimit(0) === 1 && boardLimit('abc') === 50 && boardLimit(7) === 7 && boardLimit(101) === 100);
  const direct = await lb.getTop('level', -3);
  check('1. ...and getTop holds it too', direct.length === 1, direct.length);
}

/* 2. the board's real name before the key */
{
  const { lb, st } = makeLb();
  for (let i = 0; i < 20; i++) await lb.updatePlayer(row(i));
  const lvl = await lb.getTop('level', 50);
  const before = st.lists;
  const a = await lb.getTop('nonsense-1', 50);
  const b = await lb.getTop('x'.repeat(500), 50);
  check('2. made-up categories are the level board, served from its one kept answer (no read)', st.lists === before && JSON.stringify(a) === JSON.stringify(lvl) && JSON.stringify(b) === JSON.stringify(lvl), { reads: st.lists - before });
  check('2. the kept boards hold no key per made-up category', [...(lb._top || new Map()).keys()].every((k) => !k.startsWith('nonsense') && !k.startsWith('xxx')), [...lb._top.keys()]);
  check('2. a real board keeps its own name (kills, melee, power, a stat board, lifeskills, gold)', typeof Leaderboard.boardName === 'function' && ['kills', 'melee', 'power', STAT_BOARD_IDS[0], 'lifeskills', 'gold'].every((c) => Leaderboard.boardName(c) === c) && Leaderboard.boardName('__proto__') === 'level' && Leaderboard.boardName(7) === 'level');
}

/* 3. the kept fields held */
{
  const { lb, store } = makeLb();
  const big = 'Z'.repeat(10000);
  const series = {}; for (let i = 0; i < 1000; i++) series['k' + i] = i;
  series.bad = 'not a number'; series['y'.repeat(200)] = 5;
  await lb.updatePlayer({ playerId: 'bp_bh_hostile', name: big, color: big, level: 'NaN', ts: 'soon', series,
    rpgData: { clanTag: big, kills: 'many', dungeons: -4, goldEarned: 1e400, playtime: { a: 1 }, lifeTotal: [1, 2] } });
  const r = JSON.parse(store.get('player:bp_bh_hostile') || 'null');
  check('3. a hostile report is kept held: clanTag, name and colour past their length dropped', !!r && r.clanTag === null && r.name === 'Anon' && r.color === '#5b52ff', r && { tag: r.clanTag && r.clanTag.length, name: r.name.length, color: r.color.length });
  check('3. ...each number a whole number (kills, dungeons, gold, playtime, lifeTotal, level, lastSeen)', !!r && r.kills === 0 && r.dungeons === 0 && r.goldEarned === 0 && r.playtime === 0 && r.lifeTotal === 0 && r.level === 1 && r.lastSeen === NOW, r);
  check('3. ...the series numbers only, at most ' + BOARD_HOLD.SERIES_KEYS + ' short keys', !!r && Object.keys(r.series).length <= BOARD_HOLD.SERIES_KEYS && Object.values(r.series).every((v) => typeof v === 'number') && !('bad' in r.series), r && Object.keys(r.series).length);
  check('3. ...and the row stays small', (store.get('player:bp_bh_hostile') || '').length <= BOARD_HOLD.ROW_MAX, (store.get('player:bp_bh_hostile') || '').length);
  /* an honest row is kept exactly as before */
  await lb.updatePlayer({ playerId: 'bp_bh_honest', name: 'Lilac Bro', color: '#ff8800', level: 12, ts: NOW, series: { melee: 12, bow: 3, kills: 40, fishing: 8 },
    rpgData: { clanTag: 'HB', kills: 40, dungeons: 2, goldEarned: 1200, playtime: 3600, lifeTotal: 30 } });
  const h = JSON.parse(store.get('player:bp_bh_honest'));
  check('3. an honest row keeps every value as sent', h.name === 'Lilac Bro' && h.color === '#ff8800' && h.level === 12 && h.clanTag === 'HB' && h.kills === 40 && h.dungeons === 2 && h.goldEarned === 1200 && h.playtime === 3600 && h.lifeTotal === 30 && h.series.fishing === 8, h);
}

/* 4. the row's ceiling */
{
  const { lb, store } = makeLb();
  const face = { sk: 's1', hr: 'h2', hc: '#123456', ew: 'e1' };
  await lb.updatePlayer({ playerId: 'bp_bh_full', name: 'Twentyletternameeeee', color: '#abcdef', level: 40, ts: NOW, look: face,
    powerIndex: { v: 1, melee: 900, bow: 800, magic: 700 }, statPoints: { vit: 40, end: 30 },
    series: { melee: 40, bow: 40, magic: 40, kills: 99999, woodcutting: 40, fishing: 40, mining: 40, farming: 40, cooking: 40, blacksmithing: 40, woodworking: 40, gemCutting: 40, enchanting: 40, trapping: 40 },
    rpgData: { clanTag: 'HBRO', kills: 99999, dungeons: 500, goldEarned: 9999999, playtime: 9999999, lifeTotal: 400 } });
  const full = store.get('player:bp_bh_full') || '';
  check('4. an honest full row (every board filled) is far under the ceiling', full.length > 0 && full.length * 2 < BOARD_HOLD.ROW_MAX, full.length);
  const series = {}; for (let i = 0; i < 64; i++) series[('k' + i).padEnd(32, 'q')] = -1.2345678901234567e+300;
  const bigFace = {}; for (const k of ['sk', 'hr', 'hc', 'hw', 'htc', 'fh', 'fhc', 'ew', 'ewc', 'es', 'ec', 'sc', 'st', 'stc', 'sp']) bigFace[k] = 'f'.repeat(64);
  await lb.updatePlayer({ playerId: 'bp_bh_full', name: 'N'.repeat(64), color: 'c'.repeat(32), level: 1, ts: NOW, look: bigFace, series, rpgData: { clanTag: 't'.repeat(16) } });
  check('4. a report filling every held field to its length is past the ceiling: not kept, the last row stands', store.get('player:bp_bh_full') === full, (store.get('player:bp_bh_full') || '').length);
}

/* 5. the read paged; the sweep before the sort */
{
  const { lb, st, store } = makeLb();
  const N = BOARD_HOLD.PAGE * 2 + 37;
  for (let i = 0; i < N; i++) store.set('player:' + row(i).playerId, JSON.stringify({ id: row(i).playerId, name: 'B' + i, level: 1 + (i % 50), dungeons: i, lastSeen: i < 40 ? NOW - 8 * DAY : NOW, series: {} }));
  st.pages = 0;
  const r = await lb.getTop('dungeons', 10);
  check('5. the read lists a page at a time (' + BOARD_HOLD.PAGE + ')', st.pages === 3, st.pages);
  check('5. ...and every live row was read (the top dungeons are the last rows)', r.length === 10 && r[0].dungeons === N - 1, r.map((x) => x.dungeons));
  check('5. the stale rows it met are swept', [...store.keys()].filter((k) => k.startsWith('player:')).length === N - 40, [...store.keys()].length);
  /* the sweep ran inside the read, before the sort: _topRead deleted, getTop had nothing left */
  const { lb: lb2, st: st2, store: s2 } = makeLb();
  for (let i = 0; i < 5; i++) s2.set('player:' + row(i).playerId, JSON.stringify({ id: row(i).playerId, level: 1, lastSeen: NOW - 9 * DAY }));
  const stale = [];
  await lb2._topRead('level', 10, stale);
  check('5. _topRead itself sweeps before it sorts (getTop finds nothing left to delete)', st2.order.includes('delete') && stale.length === 0 && s2.size === 0, { order: st2.order, left: s2.size });
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
