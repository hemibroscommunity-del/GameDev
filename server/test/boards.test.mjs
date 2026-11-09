/* The leaderboards, with faces -- v2.3.4355 (server/src/boards.js,
 * docs/specs/leaderboards.md).
 *
 *   1. CAPS AND THE WIRE: caps.boards2 advertised; `spin_board` privileged;
 *      the ask is routed.
 *   2. THE FACE IS A LOOK: boardFace keeps the short ids a bust is drawn
 *      from and nothing else (never a drawing).
 *   3. THE LOGIN WHEEL'S RECORDS: a pot collected is a WIN with the name, the
 *      level, the face and the doubles; a pot lost to a double is a LOSS of
 *      what it held; one row a player a list, their best.
 *   4. A POT PAID AFTER THE PLAYER LEFT still gets its name and level.
 *   5. THE GAMBLING DEN'S SPIN feeds the same board.
 *   6. THE FISH AND ACE BOARDS: a row carries the level (and the fish row the
 *      face) it was set with.
 *   7. A DELETED CHARACTER: its rows stay as `gone` stand-ins on every board,
 *      the ranks are told, and its next life's record is a row of its own.
 *   8. THE RANKS (the Leaderboard object): a row carries `look` and `lv`; a
 *      deleted one moves to a stand-in, is listed 7 days, then pruned.
 *   9. THE KILL SWITCH `boards2: false`: no cap, no record, no stamp, no
 *      retiring.
 *  10. COST: a spin that takes no place writes no board. */
import { readFileSync } from 'node:fs';
import { GameRoom, Leaderboard } from '../src/index.js';
import { BOARDS, boardFace, goneId, retireRows, normalizeSpinBoard } from '../src/boards.js';
import { DAILY } from '../src/dailyrewards.js';

function makeState() {
  const store = new Map();
  const puts = [];
  return {
    _store: store, _puts: puts,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { puts.push(k); store.set(k, typeof v === 'string' ? v : JSON.parse(JSON.stringify(v))); },
      list: async (o) => { const out = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) out.set(k, v); return out; },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
/* the ranks: a real Leaderboard object behind the binding the room calls */
const lbState = makeState();
const lb = new Leaderboard(lbState, {});
const lbCalls = [];
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async (req) => { lbCalls.push(new URL(req.url).pathname); return lb.fetch(req); } }) } };
const fakeWs = () => ({ sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} });
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name); else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const state = makeState();
const room = new GameRoom(state, mockEnv);
let now = Date.UTC(2026, 10, 9, 12);
room._loginSpinNow = () => now;
room._drNow = () => now;
const settle = () => new Promise((r) => setTimeout(r, 15));
const DRAWING = 'a'.repeat(256);
async function join(id, device, name, look) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id, name: name || 'T', phrase: 'p-' + id, device: device ? { id: device } : undefined, ws: [1, 5],
    data: { x: 0, y: 0, z: 'town', name: name || 'T', ...(look || { sk: 'tan', hr: 'mop', hc: 'brown', st: 'tee', sa: DRAWING }) },
  }));
  await settle();
  return ws;
}
const send = async (ws, type, payload) => { ws.sent.length = 0; await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await settle(); return ws.sent; };
const got = (sent, t) => { const m = sent.filter((x) => x.type === t); return m.length ? m[m.length - 1].payload : null; };
const board = async (ws) => got(await send(ws, 'spin_board_request'), 'spin_board');

// ── 1. caps and the wire ──
const a = await join('bp_bd_a', 'devbda', 'Ada');
{
  const sync = a.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('1a caps.boards2 is advertised', sync && sync.caps.boards2 === true, sync && sync.caps && sync.caps.boards2);
  const src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  const priv = src.slice(src.indexOf('const PRIVILEGED_EVENTS'), src.indexOf('const PRIVILEGED_EVENTS') + 60000);
  check('1b `spin_board` is a privileged event (a phone cannot forge the board)', /'spin_board'/.test(priv));
  check('1c the kill switch is a lower-case name the flags route takes (TRAPS §117)', /^[a-z0-9_]{1,32}$/.test('boards2'));
  const b0 = await board(a);
  check('1d the ask is answered: two empty lists', b0 && Array.isArray(b0.wins) && Array.isArray(b0.losses) && b0.wins.length === 0 && b0.losses.length === 0, b0);
  const forged = await send(a, 'spin_board', { wins: [{ pid: 'x', name: 'Forger', n: 999999 }], losses: [] });
  const b1 = await board(a);
  check('1e a phone sending `spin_board` writes nothing', b1 && b1.wins.length === 0, [forged.length, b1]);
}

// ── 2. the face is a look ──
{
  const f = boardFace({ sk: 'tan', hr: 'mop', sa: DRAWING, tf: DRAWING, name: 'x', hw: 'h'.repeat(65), ec: 3, __proto__: { st: 'inherited' } });
  check('2a only the bust\'s short ids are kept (no drawing, no stranger key, nothing inherited, nothing over-long)',
    f && f.sk === 'tan' && f.hr === 'mop' && f.ec === 3 && !('sa' in f) && !('tf' in f) && !('name' in f) && !('hw' in f) && !('st' in f), f);
  check('2b nothing to draw is null', boardFace({}) === null && boardFace(null) === null && boardFace({ sa: DRAWING }) === null);
  check('2c every face key is one the join carries', BOARDS.FACE_KEYS.every((k) => /^[a-z]{2,3}$/.test(k)));
}

// ── 3. the login wheel's records ──
{
  room._loginSpinRand = () => 0.05;   /* 100 gold */
  await send(a, 'loginspin_go');
  room._loginSpinRand = () => 0.2;    /* a double won */
  await send(a, 'loginspin_double', { k: 0 });
  await send(a, 'loginspin_double', { k: 1 });
  await send(a, 'loginspin_collect', { k: 2 });
  const b = await board(a);
  const w = b && b.wins[0];
  check('3a a pot collected is a WIN: the gold, the name, the level, the doubles', w && w.pid === 'bp_bd_a' && w.n === 400 && w.name === 'Ada' && w.lv === 1 && w.k === 2 && w.at > 0, w);
  check('3b ...with the face it was won with, as a look (no drawing)', w && w.look && w.look.sk === 'tan' && w.look.hr === 'mop' && !('sa' in w.look), w && w.look);
  check('3c nothing lost yet', b.losses.length === 0, b.losses);
  check('3d the board is saved under its one key', state._store.has(BOARDS.SPIN_KEY) && state._store.get(BOARDS.SPIN_KEY).v === BOARDS.V && state._store.get(BOARDS.SPIN_KEY).w.length === 1);

  /* another device, another character: a loss */
  const c = await join('bp_bd_c', 'devbdc', 'Cy', { sk: 'pale', hr: 'bald' });
  room._loginSpinRand = () => 0.3;    /* 100 */
  await send(c, 'loginspin_go');
  room._loginSpinRand = () => 0.2;
  await send(c, 'loginspin_double', { k: 0 });   /* 200 */
  room._loginSpinRand = () => 0.9;    /* lost */
  await send(c, 'loginspin_double', { k: 1 });
  const b2 = await board(c);
  const l = b2 && b2.losses[0];
  check('3e a pot lost to a double is a LOSS of what it held (200), on its second double', l && l.pid === 'bp_bd_c' && l.n === 200 && l.k === 2 && l.name === 'Cy' && l.look && l.look.sk === 'pale', l);
  check('3f ...and a loss is no win', b2.wins.length === 1 && b2.wins[0].pid === 'bp_bd_a', b2.wins);

  /* the next day: a smaller win does not replace Ada's best; a bigger one does, in place */
  now += 86400000;
  room._loginSpinRand = () => 0.05;
  await send(a, 'loginspin_ask');
  await send(a, 'loginspin_go');
  await send(a, 'loginspin_collect', { k: 0 });   /* 100 */
  let b3 = await board(a);
  check('3g one row a player: a smaller win leaves their best', b3.wins.length === 1 && b3.wins[0].n === 400, b3.wins);
  now += 86400000;
  room._loginSpinRand = () => 0.99;   /* 10K */
  await send(a, 'loginspin_ask');
  await send(a, 'loginspin_go');
  await send(a, 'loginspin_collect', { k: 0 });
  b3 = await board(a);
  check('3h ...and a bigger one takes its place, still one row', b3.wins.length === 1 && b3.wins[0].n === 10000 && b3.wins[0].k === 0, b3.wins);
}

// ── 4. a pot paid after the player left ──
{
  now += 86400000;
  const d1 = await join('bp_bd_d1', 'devbdd', 'Dee', { sk: 'dark', hr: 'afro' });
  room._loginSpinRand = () => 0.97;   /* 1,000 */
  await send(d1, 'loginspin_go');
  const rec = state._store.get('lspin:d:devbdd');
  check('4a the spin stamps who spun (name, level) into its record', rec && rec.nm === 'Dee' && rec.lv === 1, rec);
  /* Dee leaves with the pot open; another character of the account asks */
  await room.webSocketClose(d1);
  room.sessions.delete(d1);
  delete room.playerState.bp_bd_d1;
  const d2 = await join('bp_bd_d2', 'devbdd', 'Dov');
  await send(d2, 'loginspin_ask');
  const b = await board(d2);
  const w = b.wins.find((e) => e.pid === 'bp_bd_d1');
  check('4b the kept pot is on the board under the SPINNER: name and face off the character record, level off the stamp',
    w && w.n === 1000 && w.name === 'Dee' && w.lv === 1 && w.look && w.look.sk === 'dark', w);
}

// ── 5. the Gambling Den's spin ──
{
  const PR = DAILY.SPIN.PRIZES;
  const total = PR.reduce((t, p) => t + p.w, 0);
  const AT = (i) => (PR.slice(0, i).reduce((t, p) => t + p.w, 0) + PR[i].w / 2) / total;
  const force = (...vals) => { let i = 0; room._drRand = () => (i < vals.length ? vals[i++] : 0.99); };
  const e = await join('bp_bd_e', 'devbde', 'Eli', { sk: 'tan', hr: 'spike' });
  room.playerState.bp_bd_e._quests = { tut_1: 'turnedIn' };
  force(AT(5), 0.1);                  /* 1,000, then a double won */
  await send(e, 'daily_spin', { act: 'spin', opId: 'bd-e-1' });
  room.playerState.bp_bd_e._lastDailySpinAt = 0;
  await send(e, 'daily_spin', { act: 'double', opId: 'bd-e-2' });
  room.playerState.bp_bd_e._lastDailySpinAt = 0;
  await send(e, 'daily_spin', { act: 'collect', opId: 'bd-e-3' });
  let b = await board(e);
  const w = b.wins.find((x) => x.pid === 'bp_bd_e');
  check('5a the Den\'s pot taken is a win on the same board', w && w.n >= 2000 && w.k === 1 && w.name === 'Eli' && w.look && w.look.hr === 'spike', [w, b.wins.map((x) => [x.pid, x.n])]);
  check('5b the wins are sorted, biggest first', b.wins.every((x, i) => i === 0 || b.wins[i - 1].n >= x.n), b.wins.map((x) => x.n));
  /* the next day, a double lost */
  now += 86400000;
  room.playerState.bp_bd_e._lastDailySpinAt = 0;
  force(AT(6), 0.9);                  /* 2,500, then lost */
  await send(e, 'daily_spin', { act: 'spin', opId: 'bd-e-4' });
  room.playerState.bp_bd_e._lastDailySpinAt = 0;
  await send(e, 'daily_spin', { act: 'double', opId: 'bd-e-5' });
  b = await board(e);
  const l = b.losses.find((x) => x.pid === 'bp_bd_e');
  check('5c the Den\'s pot lost to a double is a loss of what it held', l && l.n >= 2500 && l.k === 1, [l, b.losses.map((x) => [x.pid, x.n])]);
}

// ── 6. the fish and Ace boards ──
{
  const fb = await room._fishBoardEnsure();
  const place = room._fishBoardEnter(fb, 'bp_bd_a', 'Ada', 'trout', 2400, null, 1000);
  const row = fb.boards.trout[0];
  check('6a a fish row carries the level and the face it was weighed with', place === 1 && row.lv === 1 && row.look && row.look.sk === 'tan' && !('sa' in row.look), row);
  const stored = state._store.get('fish_board');
  check('6b ...and they are stored and read back', stored && stored.b.trout[0].lv === 1 && stored.b.trout[0].look.hr === 'mop', stored && stored.b.trout);
  await room._aceBoardRecord('bp_bd_a', room.playerState.bp_bd_a, 900, true, 'coin');
  const ab = await room._aceBoardRead();
  check('6c an Ace row carries the level beside its look', ab.wins[0] && ab.wins[0].pid === 'bp_bd_a' && ab.wins[0].lv === 1 && ab.wins[0].look, ab.wins[0]);
}

// ── 7. a deleted character ──
{
  /* Ada reports to the ranks first, with a level worth ranking */
  const sA = room._sessionById('bp_bd_a');
  room.playerState.bp_bd_a.prog3.sk.sword.level = 12;
  await room.reportToLeaderboard(sA, true);
  let top = await lb.getTop('combat', 50);
  const live = top.find((p) => p.id === 'bp_bd_a');
  check('7a the ranks row carries the face and the level', live && live.lv === 12 && live.value === 12 && live.look && live.look.sk === 'tan' && !live.gone, live);

  lbCalls.length = 0;
  const done = await room._resetCharacterData('bp_bd_a');
  await settle();
  check('7b the restart goes through', done === true && !room.playerState.bp_bd_a && a.sent.some((m) => m.type === 'character_reset_done'));
  const sb = state._store.get(BOARDS.SPIN_KEY);
  const gw = sb.w.find((e) => e.gone);
  check('7c its spin record STAYS, retired: a new id, `gone`, the name, level and face kept',
    gw && gw.pid.startsWith('bp_bd_a' + BOARDS.GONE_MARK) && gw.n === 10000 && gw.name === 'Ada' && gw.lv === 1 && gw.look && gw.look.sk === 'tan'
    && !sb.w.some((e) => e.pid === 'bp_bd_a'), sb.w);
  const fbs = state._store.get('fish_board').b.trout;
  check('7d its fish record too', fbs.length === 1 && fbs[0].gone && fbs[0].pid.startsWith('bp_bd_a#') && fbs[0].g === 2400 && fbs[0].lv === 1 && fbs[0].look, fbs);
  const abs = state._store.get('ace_board');
  check('7e and its Ace record', abs.wins.length === 1 && abs.wins[0].gone && abs.wins[0].pid.startsWith('bp_bd_a#') && abs.wins[0].amount === 900, abs.wins);
  check('7f the ranks are told', lbCalls.includes('/api/leaderboard/gone'), lbCalls);
  top = await lb.getTop('combat', 50);
  const ghost = top.find((p) => p.gone);
  check('7g ...and list the stand-in: `gone`, its own id, the level and face it had', ghost && ghost.id.startsWith('bp_bd_a#') && ghost.lv === 12 && ghost.look && ghost.look.sk === 'tan' && ghost.name === 'Ada'
    && !top.some((p) => p.id === 'bp_bd_a'), top.map((p) => [p.id, p.gone, p.lv]));

  /* the next life, same id: its records are rows of their own */
  const a2 = await join('bp_bd_a', 'devbda', 'Ada');
  now += 86400000;
  room._loginSpinRand = () => 0.05;
  await send(a2, 'loginspin_ask');
  await send(a2, 'loginspin_go');
  await send(a2, 'loginspin_collect', { k: 0 });
  const b = await board(a2);
  const mineRows = b.wins.filter((e) => e.pid === 'bp_bd_a' || e.pid.startsWith('bp_bd_a#'));
  check('7h the next life\'s win is a row of its own beside the stand-in', mineRows.length === 2 && mineRows.some((e) => e.gone && e.n === 10000) && mineRows.some((e) => !e.gone && e.n === 100), mineRows);
  const fb = await room._fishBoardEnsure();
  room._fishBoardEnter(fb, 'bp_bd_a', 'Ada', 'trout', 600, null, 2000);
  check('7i ...and its fish too: the stand-in still holds the record', fb.boards.trout.length === 2 && fb.boards.trout[0].gone && fb.boards.trout[0].g === 2400 && fb.boards.trout[1].pid === 'bp_bd_a' && !fb.boards.trout[1].gone, fb.boards.trout);
  top = await lb.getTop('combat', 50);
  check('7j the ranks hold both: the new life live, the old one gone', top.some((p) => p.id === 'bp_bd_a' && !p.gone) && top.some((p) => p.gone && p.lv === 12), top.map((p) => [p.id, p.gone, p.lv]));
  /* retiring twice changes nothing more */
  const r = retireRows([{ pid: 'x', n: 1 }, { pid: 'x#5', n: 2, gone: 5 }, { pid: 'y', n: 3 }], 'x', 9);
  check('7k retireRows: only the live rows of that id, once', r.n === 1 && r.rows[0].pid === goneId('x', 9) && r.rows[0].gone === 9 && r.rows[1].gone === 5 && r.rows[2].pid === 'y' && !r.rows[2].gone, r);
}

// ── 8. the ranks, by themselves ──
{
  const st = makeState();
  const L = new Leaderboard(st, {});
  const t0 = Date.now();
  await L.updatePlayer({ playerId: 'bp_r1', name: 'Rae', level: 7, series: { melee: 7, fishing: 4 }, look: { sk: 'tan', sa: DRAWING, junk: 1 }, ts: t0 });
  await L.updatePlayer({ playerId: 'bp_r2', name: 'Old', level: 3, ts: t0 });
  let top = await L.getTop('fishing', 50);
  check('8a every board\'s row has `lv` (the name plate\'s level), whatever it ranks', top.length === 1 && top[0].value === 4 && top[0].lv === 7, top);
  check('8b the stored look is the bust\'s ids only', top[0].look && top[0].look.sk === 'tan' && !('sa' in top[0].look) && !('junk' in top[0].look), top[0].look);
  const legacy = (await L.getTop('level', 50)).find((p) => p.id === 'bp_r2');
  check('8c a row from before the series falls back to its stored level; no look, no field', legacy && legacy.lv === 3 && !('look' in legacy), legacy);
  /* over the public route nothing can retire a row: index.js lets only GET through */
  const idx = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  check('8d the public leaderboard route stays read-only (a phone cannot retire a row)', /if \(request\.method !== 'GET'\) \{\s*return new Response\(JSON\.stringify\(\{ ok: false, error: 'Read-only' \}\)/.test(idx));
  check('8e retiring a row moves it', await L.markGone({ playerId: 'bp_r1', ts: t0 + 1000 }) === true
    && !st._store.has('player:bp_r1') && st._store.has('gone:bp_r1:' + (t0 + 1000)));
  check('8f ...and a second time finds nothing', await L.markGone({ playerId: 'bp_r1', ts: t0 + 2000 }) === false);
  top = await L.getTop('combat', 50);
  check('8g the stand-in is listed with `gone`', top.length === 1 && top[0].gone === t0 + 1000 && top[0].id === goneId('bp_r1', t0 + 1000) && top[0].lv === 7, top);
  const draw = await L.getTop('level', 100);
  check('8g2 the legacy `level` column (the contest draw\'s entrants) lists no stand-in', draw.length === 1 && draw[0].id === 'bp_r2' && !draw.some((p) => p.gone), draw.map((p) => [p.id, p.gone]));
  /* 7 days on, another delete sweeps it out of storage */
  await L.updatePlayer({ playerId: 'bp_r3', name: 'New', level: 2, series: { melee: 2 }, ts: t0 });
  await L.markGone({ playerId: 'bp_r3', ts: t0 + 8 * 86400000 });
  check('8h a stand-in older than 7 days is pruned by the next delete', !st._store.has('gone:bp_r1:' + (t0 + 1000)) && [...st._store.keys()].filter((k) => k.startsWith('gone:')).length === 1, [...st._store.keys()]);
  check('8i markGone refuses nonsense', await L.markGone({}) === false && await L.markGone(null) === false);
}

// ── 9. the kill switch ──
{
  const st = makeState();
  const calls = [];
  const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async (req) => { calls.push([new URL(req.url).pathname, await req.clone().json().catch(() => null)]); return new Response('{}'); } }) } };
  const r2 = new GameRoom(st, env);
  r2._liveFlags = { boards2: false };
  let t = Date.UTC(2026, 10, 9, 12);
  r2._loginSpinNow = () => t;
  const ws = fakeWs();
  r2.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await r2.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_bd_k', name: 'Kay', phrase: 'p-k', device: { id: 'devbdk' }, ws: [1, 5], data: { x: 0, y: 0, z: 'town', name: 'Kay', sk: 'tan', hr: 'mop' } }));
  await settle();
  const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('9a `boards2: false`: the cap is not advertised', sync && sync.caps.boards2 === false, sync && sync.caps.boards2);
  const snd = async (type, payload) => { ws.sent.length = 0; await r2.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await settle(); return ws.sent; };
  check('9b the ask is answered `off`', got(await snd('spin_board_request'), 'spin_board')?.off === true);
  r2._loginSpinRand = () => 0.99;
  await snd('loginspin_go');
  await snd('loginspin_collect', { k: 0 });
  check('9c a spin is paid and no record is taken', r2.playerState.bp_bd_k.coins >= 10000 && !st._store.has(BOARDS.SPIN_KEY), [r2.playerState.bp_bd_k.coins, [...st._store.keys()].filter((k) => k.includes('board'))]);
  const fb = await r2._fishBoardEnsure();
  r2._fishBoardEnter(fb, 'bp_bd_k', 'Kay', 'trout', 900, null, 1);
  check('9d a fish row is stamped with no face or level', fb.boards.trout[0] && !('lv' in fb.boards.trout[0]) && !('look' in fb.boards.trout[0]), fb.boards.trout[0]);
  calls.length = 0;
  await r2.reportToLeaderboard(r2._sessionById('bp_bd_k'), true);
  check('9e the ranks report carries no look', calls.length === 1 && calls[0][1] && !('look' in calls[0][1]), calls);
  calls.length = 0;
  await r2._resetCharacterData('bp_bd_k');
  check('9f a restart retires nothing and tells the ranks nothing', !calls.some((c) => c[0].endsWith('/gone')) && !fb.boards.trout[0].gone, [calls.map((c) => c[0]), fb.boards.trout]);
}

// ── 10. cost, and a stored board made safe ──
{
  const st = makeState();
  const r3 = new GameRoom(st, mockEnv);
  const book = await r3._spinBoardEnsure();
  for (let i = 0; i < BOARDS.SIZE; i++) r3._spinBoardEnter(book, 'bp_fill_' + i, { name: 'F' + i, lv: 5 }, 1000 + i, true, 0, i + 1);
  await settle();
  const before = st._puts.filter((k) => k === BOARDS.SPIN_KEY).length;
  const place = r3._spinBoardEnter(book, 'bp_small', { name: 'S', lv: 1 }, 100, true, 0, 99);
  await settle();
  check('10a a full board is ten rows, one write each', book.wins.length === BOARDS.SIZE && before === BOARDS.SIZE, [book.wins.length, before]);
  check('10b a spin that takes no place writes nothing', place === 0 && st._puts.filter((k) => k === BOARDS.SPIN_KEY).length === before);
  check('10c a tie keeps the earlier row above', r3._spinBoardEnter(book, 'bp_tie', { name: 'T', lv: 1 }, 1009, true, 0, 500) === 2 && book.wins[0].pid === 'bp_fill_9', book.wins.slice(0, 2));
  const n = normalizeSpinBoard({ v: BOARDS.V, w: [{ pid: 'p', name: 'x'.repeat(99), n: 50, lv: 99999, look: { sk: 'a', sa: DRAWING } }, { pid: 'p', n: 70 }, { pid: '', n: 5 }, { pid: 'q', n: -3 }, null, 7], l: 'nope' });
  check('10d a stored board is made safe: one row an id, names and levels bounded, the look cut to a face, junk dropped',
    !n.locked && n.wins.length === 1 && n.wins[0].name.length === BOARDS.NAME_MAX && n.wins[0].lv === BOARDS.LV_MAX && !('sa' in n.wins[0].look) && n.losses.length === 0, n);
  check('10e a board a NEWER worker wrote is locked: shown as unavailable, never written', normalizeSpinBoard({ v: BOARDS.V + 1, w: [] }).locked === true);
  const r4 = new GameRoom(makeState(), mockEnv);
  r4.state.storage.get = async () => { throw new Error('storage down'); };
  const failed = await r4._spinBoardEnsure();
  check('10f a failed read is locked and not cached (the next ask reads again)', failed.locked === true && !r4._spinBoardBook && r4._spinBoardEnter(failed, 'p', { name: 'P' }, 5, true, 0, 1) === 0);
}

if (failures) { console.log(failures + ' FAILED'); process.exit(1); }
console.log('boards: all passed');
