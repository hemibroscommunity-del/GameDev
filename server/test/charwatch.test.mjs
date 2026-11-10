/* What players drew, for the owner to look at; and the faces of old
 * leaderboard rows -- v2.3.4545 (server/src/charwatch.js, boards.js
 * _boardsFaceFill, docs/specs/char-watch.md).
 *
 *   1. THE PAGE (pure): only characters with ink, newest first, a page at a
 *      time; NEW is "made after the mark"; a row's face never holds a drawing.
 *   2. THE ROOM: every character's drawings come back exactly as stored.
 *   3. THE DOOR: the owner's key or nothing (the admin surface's own gate).
 *   4. SEEN: one mark in time; what is made after it is NEW.
 *   5. REMOVE: the drawings leave the record for good, the players who can
 *      see them are told at once, no phone can put them back, the traits and
 *      the name stay, the act is logged.
 *   6. OLD LEADERBOARD ROWS: a row with no face gets its character's, once a
 *      worker's life -- never a row that has one, never its lastSeen; the
 *      biggest fish's rows too; under `boards2`. */
import { readFileSync } from 'node:fs';
import { GameRoom, Leaderboard } from '../src/index.js';
import { CHAR_WATCH, artHasInk, inkedArt, watchPage } from '../src/charwatch.js';
import { DRAWING_KEYS } from '../src/join.js';

function makeState() {
  const store = new Map();
  const puts = [];
  return {
    _store: store, _puts: puts,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { puts.push(k); store.set(k, typeof v === 'string' ? v : JSON.parse(JSON.stringify(v))); },
      list: async (o) => { const out = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) out.set(k, v); return out; },
      delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) store.delete(x); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const lbState = makeState();
const lb = new Leaderboard(lbState, {});
const lbCalls = [];
const KEY = 'owner-key-for-this-test';
const mockEnv = { ADMIN_KEY: KEY, LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async (req) => { lbCalls.push(new URL(req.url).pathname); return lb.fetch(req); } }) } };
const fakeWs = () => ({ sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} });
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name); else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
let clock = 1800000000000;
Date.now = () => clock;
const state = makeState();
const room = new GameRoom(state, mockEnv);
const settle = () => new Promise((r) => setTimeout(r, 15));
const ART = (c) => ('0'.repeat(100) + c.repeat(56) + '0'.repeat(100));
const BLANK = '0'.repeat(256);
async function join(id, name, look) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id, name, phrase: 'p-' + id, device: { id: 'dev' + id }, ws: [1, 5],
    data: { x: 0, y: 0, z: 'town', name, sk: 'tan', hr: 'mop', hc: 'brown', st: 'tee', ...(look || {}) },
  }));
  await settle();
  return ws;
}
const admin = async (path, body) => {
  const r = await room.fetch(new Request('https://x/api/admin' + path, {
    method: body ? 'POST' : 'GET',
    headers: Object.assign({ Authorization: 'Bearer ' + KEY }, body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined,
  }));
  return { status: r.status, j: await r.json() };
};

// ── 1. the page ──
{
  check('1a. ink is anything but the blank canvas', artHasInk(ART('a')) && !artHasInk(BLANK) && !artHasInk('') && !artHasInk(null) && !artHasInk(12));
  const look = { sk: 'tan', hr: 'mop', sp: 'stripes', tf: ART('3'), sa: BLANK, pa: ART('8'), zz: ART('1') };
  const ink = inkedArt(look);
  check('1b. a look\'s inked drawings: the drawing keys only, and only those with ink', !!ink && Object.keys(ink).sort().join() === 'pa,tf' && ink.tf === ART('3'), ink && Object.keys(ink));
  check('1c. a look with none has none', inkedArt({ sk: 'tan', sa: BLANK }) === null && inkedArt(null) === null);
  const chars = new Map([
    ['char:bp_old', { name: 'Old', createdAt: 1000, look: { sk: 'tan', tf: ART('1') } }],
    ['char:bp_plain', { name: 'Plain', createdAt: 5000, look: { sk: 'tan', hr: 'mop' } }],
    ['char:bp_new', { name: 'New', createdAt: 9000, look: { sk: 'ebony', hr: 'long', sa: ART('2'), sb: ART('4') } }],
    ['char:bp_mid', { name: 'Mid', createdAt: 4000, look: { tm: ART('5') } }],
    ['char:bp_broken', null],
    ['rpg:bp_new', { level: 9 }],
  ]);
  const p = watchPage(chars, { limit: 2, seenAt: 3000, online: (id) => id === 'bp_mid' });
  check('1d. only characters that drew, newest first, a page at a time', p.rows.map((r) => r.id).join() === 'bp_new,bp_mid' && p.total === 3 && p.more === true, p.rows.map((r) => r.id));
  check('1e. NEW is "made after the mark"', p.fresh === 2 && p.rows[0].fresh === true && p.rows[1].fresh === true && watchPage(chars, { seenAt: 9000 }).fresh === 0);
  const p2 = watchPage(chars, { limit: 2, before: p.rows[p.rows.length - 1].createdAt, seenAt: 3000 });
  check('1f. the next page starts before the last row shown', p2.rows.map((r) => r.id).join() === 'bp_old' && p2.more === false && p2.rows[0].fresh === false);
  check('1g. a row carries its drawings as stored, who is in the world, and a face with no drawing in it',
    p.rows[0].art.sa === ART('2') && p.rows[0].art.sb === ART('4') && p.rows[1].online === true && p.rows[0].online === false
    && !!p.rows[0].face && p.rows[0].face.sk === 'ebony' && Object.keys(p.rows[0].face).every((k) => !DRAWING_KEYS.has(k)), p.rows[0].face);
}

// ── 2. the room ──
const a = await join('bp_cw_a', 'Ada', { tf: ART('3'), pa: ART('8') });
clock += 60000;
const b = await join('bp_cw_b', 'Bea');
clock += 60000;
const c = await join('bp_cw_c', 'Cy', { sa: ART('b') });
{
  const r = await room._watchLooks(new URLSearchParams(''));
  check('2a. every character that drew something, newest first; one that did not is not listed',
    r.ok && r.rows.map((x) => x.id).join() === 'bp_cw_c,bp_cw_a' && r.total === 2, r.rows && r.rows.map((x) => x.id));
  check('2b. the drawings come back exactly as stored, with the name and the day made',
    r.rows[1].name === 'Ada' && r.rows[1].art.tf === ART('3') && r.rows[1].art.pa === ART('8') && r.rows[1].createdAt === 1800000000000 && r.rows[0].online === true, r.rows[1]);
  check('2c. nothing has been marked seen: all NEW', r.seenAt === 0 && r.fresh === 2);
}

// ── 3. the door ──
{
  const no = await room.fetch(new Request('https://x/api/admin/dev/looks'));
  const bad = await room.fetch(new Request('https://x/api/admin/dev/looks', { headers: { Authorization: 'Bearer nope' } }));
  const ok = await admin('/dev/looks?limit=1');
  check('3a. without the owner\'s key the page does not answer; with it, it does', no.status === 401 && bad.status === 401 && ok.status === 200 && ok.j.ok && ok.j.rows.length === 1 && ok.j.more === true, [no.status, bad.status, ok.status]);
  const idx = src('server/src/index.js');
  check('3b. no player message reaches any of it: the routes are the admin surface\'s alone', !/case 'look(s|wipe|seen)'/.test(idx) && /path === '\/dev\/looks'/.test(src('server/src/devtools.js')));
  const wipeNoKey = await room.fetch(new Request('https://x/api/admin/dev/lookwipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: 'bp_cw_a' }) }));
  check('3c. ...removing included', wipeNoKey.status === 401 && !!state._store.get('char:bp_cw_a').look.tf);
}

// ── 4. seen ──
{
  clock += 60000;
  const s = await admin('/dev/lookseen', {});
  check('4a. "mark all seen" is one mark in time, kept', s.status === 200 && s.j.seenAt === clock && state._store.get(CHAR_WATCH.SEEN_KEY).at === clock);
  const r = await admin('/dev/looks');
  check('4b. after it nothing is NEW', r.j.fresh === 0 && r.j.rows.every((x) => x.fresh === false) && r.j.seenAt === clock);
  clock += 60000;
  await join('bp_cw_d', 'Dee', { tm: ART('c') });
  const r2 = await admin('/dev/looks');
  check('4c. a character made after it is', r2.j.fresh === 1 && r2.j.rows[0].id === 'bp_cw_d' && r2.j.rows[0].fresh === true && r2.j.rows[1].fresh === false);
}

// ── 5. remove ──
{
  b.sent.length = 0; a.sent.length = 0;
  const w = await admin('/dev/lookwipe', { playerId: 'bp_cw_a' });
  const rec = state._store.get('char:bp_cw_a');
  check('5a. the drawings leave the record, with when; the traits and the name stay',
    w.status === 200 && w.j.ok && w.j.wiped.sort().join() === 'pa,tf' && w.j.wasOnline === true
    && rec.look.tf === undefined && rec.look.pa === undefined && rec.look.sk === 'tan' && rec.look.hr === 'mop' && rec.name === 'Ada' && rec.artWipedAt === clock, rec);
  const upd = b.sent.filter((m) => m.type === 'player_update' && m.id === 'bp_cw_a').pop();
  check('5b. the players who can see them are told at once: null, the only way a phone clears a key',
    !!upd && upd.data.tf === null && upd.data.pa === null, upd && upd.data);
  check('5c. ...the character\'s own session holds them no more', (() => {
    const s = [...room.sessions.values()].find((x) => x.id === 'bp_cw_a');
    const ps = room.playerState['bp_cw_a'];
    return s && s.char.look.tf === undefined && s.data.tf === undefined && s.data.pa === undefined && ps.tf === undefined;
  })());
  /* the phone still holds its own copy and sends it: it goes nowhere */
  b.sent.length = 0;
  clock += 3000;
  await room.webSocketMessage(a, JSON.stringify({ type: 'track', data: { x: 3, y: 3, name: 'Ada', sk: 'tan', hr: 'mop', tf: ART('3'), pa: ART('8') } }));
  await settle();
  const leak = b.sent.filter((m) => m.type === 'player_update' && m.data && (m.data.tf || m.data.pa));
  check('5d. no phone can put them back: the record is blank, so the relay drops them', leak.length === 0 && room.playerState['bp_cw_a'].tf === undefined, leak.length);
  await room.webSocketClose(a);
  await settle();
  const a2 = await join('bp_cw_a', 'Ada', { tf: ART('3'), pa: ART('8') });
  const sync = a2.sent.find((m) => m.type === 'state_sync');
  const seenByC = c.sent.filter((m) => m.type === 'player_join' && m.id === 'bp_cw_a').pop();
  check('5e. ...nor a new join: the character comes back without them, on its own phone and on everyone else\'s',
    !!sync && sync.char && sync.char.look.tf === undefined && sync.char.look.pa === undefined && sync.char.look.sk === 'tan'
    && (!seenByC || (!seenByC.data.tf && !seenByC.data.pa)), sync && sync.char && Object.keys(sync.char.look));
  const r = await admin('/dev/looks');
  check('5f. the page no longer lists it', r.j.rows.every((x) => x.id !== 'bp_cw_a') && r.j.total === 2, r.j.rows.map((x) => x.id));
  const log = state._store.get('admin_log') || [];
  check('5g. the act is in the admin log', log.some((e) => e.op === 'dev/lookwipe' && e.playerId === 'bp_cw_a'), log.map((e) => e.op));
  const again = await admin('/dev/lookwipe', { playerId: 'bp_cw_a' });
  const none = await admin('/dev/lookwipe', { playerId: 'bp_nobody' });
  check('5h. removing twice is nothing; a character that is not there is said so', again.j.ok && again.j.wiped.length === 0 && none.status === 404 && none.j.ok === false, [again.j, none.status]);
  /* a character that is not in the world */
  await room.webSocketClose(c);
  await settle();
  const off = await admin('/dev/lookwipe', { playerId: 'bp_cw_c' });
  check('5i. a character that is not in the world: its record alone', off.j.ok && off.j.wasOnline === false && state._store.get('char:bp_cw_c').look.sa === undefined);
}

// ── 6. old leaderboard rows ──
{
  const now0 = clock;
  /* rows from before a row carried a face: one of a character with a record, one of a guest with none, and one
     that has its face already */
  lbState._store.set('player:bp_cw_b', JSON.stringify({ id: 'bp_cw_b', name: 'Bea', level: 4, lastSeen: now0 - 3600000, series: {} }));
  lbState._store.set('player:bp_guest', JSON.stringify({ id: 'bp_guest', name: 'Guest', level: 1, lastSeen: now0 - 3600000, series: {} }));
  lbState._store.set('player:bp_cw_d', JSON.stringify({ id: 'bp_cw_d', name: 'Dee', level: 2, lastSeen: now0 - 3600000, series: {}, look: { sk: 'pale' } }));
  lbState._store.set('player:bp_stale', JSON.stringify({ id: 'bp_stale', name: 'Gone', level: 2, lastSeen: now0 - 30 * 86400000, series: {} }));
  state._store.set('char:bp_stale', { name: 'Gone', createdAt: 1, look: { sk: 'tan' } });
  room._faceFilled = false;
  lbCalls.length = 0;
  const n = await room._boardsFaceFill();
  const rowB = JSON.parse(lbState._store.get('player:bp_cw_b')), rowG = JSON.parse(lbState._store.get('player:bp_guest')), rowD = JSON.parse(lbState._store.get('player:bp_cw_d'));
  check('6a. a row with no face gets the one its character\'s record draws', n >= 1 && !!rowB.look && rowB.look.sk === 'tan' && rowB.look.hr === 'mop' && Object.keys(rowB.look).every((k) => !DRAWING_KEYS.has(k)), rowB.look);
  check('6b. ...and nothing else about it changes: it is not a player who played', rowB.lastSeen === now0 - 3600000 && rowB.level === 4 && rowB.name === 'Bea');
  check('6c. a row that has a face keeps it; a guest with no record keeps its initial; a row off the boards is left alone',
    rowD.look.sk === 'pale' && !rowG.look && !JSON.parse(lbState._store.get('player:bp_stale')).look);
  const calls = lbCalls.slice();
  await room._boardsFaceFill();
  check('6d. once a worker\'s life', lbCalls.length === calls.length && calls.filter((p) => /faceless$/.test(p)).length === 1, calls);
  const pub = await lb.fetch(new Request('https://x/api/leaderboard/top?category=level'));
  const top = (await pub.json()).results || [];
  check('6e. the board the phone reads carries the face', top.some((r) => r.id === 'bp_cw_b' && r.look && r.look.sk === 'tan'));
  check('6f. the public route cannot reach the fill: it is read-only (POST refused before the object)',
    /if \(request\.method !== 'GET'\) \{\s*return new Response\(JSON\.stringify\(\{ ok: false, error: 'Read-only' \}\)/.test(src('server/src/index.js')));
  /* the biggest fish: a record stands until it is beaten, so an old row would show an initial for good */
  if (room._fishBoardEnsure) {
    const fb = await room._fishBoardEnsure();
    const sp = Object.keys(fb.boards)[0];
    fb.boards[sp] = [{ pid: 'bp_cw_b', name: 'Bea', g: 900, at: 5 }, { pid: 'bp_cw_d', name: 'Dee', g: 800, at: 6, look: { sk: 'pale' } }, { pid: 'bp_gone#77', name: 'X', g: 700, at: 7, gone: true }];
    room._faceFilled = false;
    await room._boardsFaceFill();
    check('6g. the biggest fish\'s faceless rows too; a row with a face and a deleted character\'s row are left as they are',
      !!fb.boards[sp][0].look && fb.boards[sp][0].look.sk === 'tan' && fb.boards[sp][1].look.sk === 'pale' && !fb.boards[sp][2].look, fb.boards[sp]);
  } else check('6g. the fish board is there to fill', false);
  /* the kill switch */
  lbState._store.set('player:bp_cw_c', JSON.stringify({ id: 'bp_cw_c', name: 'Cy', level: 4, lastSeen: now0, series: {} }));
  room._faceFilled = false;
  room._liveFlags = { boards2: false };
  await room._boardsFaceFill();
  check('6h. under `boards2: false` nothing is filled', !JSON.parse(lbState._store.get('player:bp_cw_c')).look);
  room._liveFlags = {};
  check('6i. the room starts it from its report to the ranks, once',
    /if \(!this\._faceFilled && this\._boardsFaceFill\) \{ try \{ await this\._boardsFaceFill\(\); \}/.test(src('server/src/index.js')));
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
