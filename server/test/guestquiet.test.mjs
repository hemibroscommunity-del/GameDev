/* ═══ v2.3.5708: A GUEST THAT HAS DONE NOTHING WRITES NOTHING (card SEC PR 9) ═══
 * (server/src/guestlazy.js "QUIET"; docs/specs/guest-lazy.md)
 *
 * guestlazy (v2.3.5610) took a fresh guest's join down from five rows to
 * none of its own, but the join still reported to the board (`player:` in
 * the Leaderboard object: join.js's forced reportToLeaderboard) and the bot
 * signals wrote `botstat:` (botfp.js), about twice a guest, never deleted.
 *
 *   1. A fresh guest's join and leave, having done nothing: no row in the
 *      room (not even `botstat:`), and no board report.
 *   2. A guest who then plays (earns gold: its record written) is counted as
 *      today: the board report goes at the next track, `botstat:` is written
 *      at its pace.
 *   3. A join with a key is untouched: reported to the board at once.
 *   4. The owner's sweep (`DELETE /api/botstat?sweep=1`, the owner's key)
 *      takes away the `botstat:` rows whose character has no record, a page
 *      at a time, and only those: a character with a record keeps its row,
 *      and so does one playing now.
 *   5. `guestquiet: false`: the old way (reported at the join, `botstat:`
 *      written).
 * The sitting-38 review's two holds and its note:
 *   6. evidence is never held back: a quiet guest flagged (or cap-clamped)
 *      has its `botstat:` written at once and at its leave;
 *   7. a quiet id pushed out of the set (QUIET_MAX) gets the board's clock
 *      back: it earns, and the next track reports it; and the leave drops a
 *      quiet guest's id (the set holds the guests here);
 *   8. the sweep keeps an orphan row holding a flag (`?flagged=1` reads it).
 *
 * BREAK PROOF (rule 8), tried by hand: main's guestlazy.js, join.js and
 * botfp.js -> FAIL 1 and 4.
 * Not a phone test: node, a real GameRoom (guest-lazy.test's harness). */
import { GameRoom } from '../src/index.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}
let NOW = Date.UTC(2026, 10, 17, 12, 0, 0);
Date.now = () => NOW;
const settle = () => new Promise((r) => setTimeout(r, 10));
const KEY = 'guest-quiet-key';

function makeState(seed) {
  const m = new Map(seed || []); const writes = [];
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  return { writes, m, id: { toString: () => 'brotown-1', name: 'brotown-1' }, blockConcurrencyWhile: async (f) => f(), waitUntil: () => {},
    storage: {
      async get(k) { if (Array.isArray(k)) { const r = new Map(); for (const x of k) if (m.has(x)) r.set(x, clone(m.get(x))); return r; } return clone(m.get(k)); },
      async put(k, v) { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) { writes.push(kk); m.set(kk, clone(vv)); } return; } writes.push(k); m.set(k, clone(v)); },
      async delete(k) { const ks = Array.isArray(k) ? k : [k]; let n = 0; for (const x of ks) { writes.push('DEL ' + x); if (m.delete(x)) n++; } return Array.isArray(k) ? n : n > 0; },
      async list(opts) {
        const r = new Map(); const p = (opts && opts.prefix) || '';
        for (const [k, v] of [...m].sort()) {
          if (!k.startsWith(p)) continue;
          if (opts && opts.startAfter !== undefined && k <= opts.startAfter) continue;
          if (opts && opts.start !== undefined && k < opts.start) continue;
          r.set(k, clone(v));
          if (opts && opts.limit && r.size >= opts.limit) break;
        }
        return r;
      },
      async setAlarm() {}, async getAlarm() { return null; }, async deleteAlarm() {},
    }, getWebSockets: () => [], acceptWebSocket: () => {} };
}
function makeEnv() {
  const reports = [];
  return { reports, env: { ADMIN_KEY: KEY, LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async (r) => {
    try { const b = await r.clone().json(); if (b && b.playerId) reports.push(b.playerId); } catch (e) { /* not a report */ }
    return new Response('{}');
  } }) } } };
}
async function openRoom(seed, flags) {
  const state = makeState(seed);
  const { reports, env } = makeEnv();
  const room = new GameRoom(state, env);
  await room._liveFlagsEnsure();
  if (flags) Object.assign(room._liveFlags, flags);
  return { room, state, reports };
}
const fakeWs = () => ({ sent: [], send(s) { this.sent.push(s); }, close() {} });
async function join(room, id, phrase) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: NOW });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'Guesty', ...(phrase ? { phrase } : {}), protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town', name: 'Guesty' } }));
  await settle();
  return ws;
}
const leave = async (room, ws) => { await room.webSocketClose(ws, 1000, 'bye', true); await settle(); };
const mine = (state, id, from = 0) => state.writes.slice(from).filter((k) => k.endsWith(':' + id) || k.endsWith(' ' + id) || k.indexOf(':' + id + ':') >= 0);
/* the bot signals' record, made dirty as play would (a tap, a harvest) */
const botDirty = (room, id) => { const rec = room._botfp && room._botfp.get(id); if (rec) { rec.dirty = true; rec.lastPutAt = 0; } return !!rec; };

/* 1. a fresh guest that does nothing */
{
  const { room, state, reports } = await openRoom();
  const ws = await join(room, 'bp_gq_idle');
  botDirty(room, 'bp_gq_idle');
  NOW += 400000;
  const session = room.sessions.get(ws);
  await room.reportToLeaderboard(session);   /* a track's report, past the throttle */
  await leave(room, ws);
  check('1. an idle guest\'s join and leave write no row in the room (no botstat: either)', mine(state, 'bp_gq_idle').length === 0, mine(state, 'bp_gq_idle'));
  check('1. ...and send no board report (at the join or a track)', !reports.includes('bp_gq_idle'), reports);
}

/* 2. a guest who then plays */
{
  const { room, state, reports } = await openRoom();
  const ws = await join(room, 'bp_gq_play');
  const res = await room.fetch(new Request('https://x/api/admin/grant', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: 'bp_gq_play', kind: 'gold', payload: { amount: 150 }, note: 'a guest earns' }) }));
  await settle();
  check('2. a guest who earns gold has its record written (guestlazy, as before)', res.status === 200 && state.m.has('rpg:bp_gq_play'));
  NOW += 400000;
  await room.reportToLeaderboard(room.sessions.get(ws));
  check('2. ...and is reported to the board at the next track, as any player', reports.includes('bp_gq_play'), reports);
  botDirty(room, 'bp_gq_play');
  await leave(room, ws);
  check('2. ...and its bot signals are written (botstat:)', state.m.has('botstat:bp_gq_play'), mine(state, 'bp_gq_play'));
}

/* 3. a join with a key */
{
  const { room, reports } = await openRoom();
  const ws = await join(room, 'bp_gq_key', 'blaze-frost-nova-titan-7');
  check('3. a join with a key is reported to the board at once, as before', reports.includes('bp_gq_key'), reports);
  await leave(room, ws);
}

/* 4. the owner's sweep */
{
  const seed = [
    ['botstat:bp_gq_orphan1', { v: 1, flags: [] }], ['botstat:bp_gq_orphan2', { v: 1, flags: [] }],
    ['botstat:bp_gq_real', { v: 1, flags: [] }], ['rpg:bp_gq_real', { coins: 5 }],
    ['botstat:bp_gq_here', { v: 1, flags: [] }],
  ];
  const { room, state } = await openRoom(seed);
  const ws = await join(room, 'bp_gq_here', 'blaze-frost-nova-titan-8');
  const sweep = (key, after) => room.fetch(new Request('https://x/api/botstat?sweep=1' + (after ? '&after=' + after : ''), { method: 'DELETE', headers: key ? { Authorization: 'Bearer ' + key } : {} }));
  const stranger = await sweep(null);
  check('4. a stranger cannot sweep (404)', stranger.status === 404 && state.m.has('botstat:bp_gq_orphan1'));
  let removed = 0, next = null, pages = 0;
  do { const r = await (await sweep(KEY, next)).json(); removed += r.removed || 0; next = r.next; pages++; } while (next && pages < 20);
  check('4. the owner\'s sweep removes the botstat: rows with no record (2)', removed === 2 && !state.m.has('botstat:bp_gq_orphan1') && !state.m.has('botstat:bp_gq_orphan2'), { removed, keys: [...state.m.keys()].filter((k) => k.startsWith('botstat:')) });
  check('4. ...and only those: a character with a record, and one playing now, keep theirs', state.m.has('botstat:bp_gq_real') && state.m.has('botstat:bp_gq_here'));
  await leave(room, ws);
}

/* 5. the switch */
{
  const { room, state, reports } = await openRoom(null, { guestquiet: false });
  const ws = await join(room, 'bp_gq_old');
  botDirty(room, 'bp_gq_old');
  await leave(room, ws);
  check('5. guestquiet: false: the old way (reported at the join; botstat: written)', reports.includes('bp_gq_old') && state.m.has('botstat:bp_gq_old'), { reports, rows: mine(state, 'bp_gq_old') });
}

/* 6. evidence is never held back */
{
  const { room, state } = await openRoom();
  const ws = await join(room, 'bp_gq_flag');
  check('6. a fresh guest is quiet (guard)', room._guestQuiet('bp_gq_flag'));
  const rec = room._botfp && room._botfp.get('bp_gq_flag');
  room._botfpFlag('bp_gq_flag', rec, 'test_flag', { n: 1 }, NOW);
  await settle();
  const row = state.m.get('botstat:bp_gq_flag');
  check('6. a quiet guest flagged has its botstat: written at once, the flag in it', !!row && Array.isArray(row.flags) && row.flags.length === 1, row);
  await leave(room, ws);
  check('6. ...and its leave writes it too (the leave\'s flush)', state.writes.filter((k) => k === 'botstat:bp_gq_flag').length >= 2, mine(state, 'bp_gq_flag'));
}

/* 7. out of the set: the board's clock back; the leave drops the id */
{
  const { room, state, reports } = await openRoom();
  const ws = await join(room, 'bp_gq_evict');
  check('7. quiet at its join, its board clock held off (guard)', room._guestQuiet('bp_gq_evict') && room.sessions.get(ws)._lbAt === Infinity);
  for (let i = 0; i < 5000; i++) await room._guestLazyCheck('bp_gq_fill_' + i);
  check('7. pushed out of the set by 5000 newer guests', !room._guestQuiet('bp_gq_evict'));
  check('7. ...its session has the board\'s clock back (not held off for the sitting)', room.sessions.get(ws)._lbAt !== Infinity, room.sessions.get(ws)._lbAt);
  await room.fetch(new Request('https://x/api/admin/grant', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: 'bp_gq_evict', kind: 'gold', payload: { amount: 150 }, note: 'earns after' }) }));
  await settle();
  NOW += 400000;
  await room.reportToLeaderboard(room.sessions.get(ws));
  check('7. ...so it earns, is saved, and the next track reports it', state.m.has('rpg:bp_gq_evict') && reports.includes('bp_gq_evict'), reports.filter((x) => x === 'bp_gq_evict'));
  await leave(room, ws);
  const ws2 = await join(room, 'bp_gq_drop');
  check('7. a quiet guest here is in the set (guard)', room._guestQuietIds.has('bp_gq_drop'));
  await leave(room, ws2);
  check('7. ...and its leave drops its id (the set holds the guests here)', !room._guestQuietIds.has('bp_gq_drop'));
}

/* 8. the sweep keeps a flagged orphan */
{
  const seed = [['botstat:bp_gq_flagged', { v: 1, flags: [{ at: 1, kind: 'x' }] }], ['botstat:bp_gq_plain', { v: 1, flags: [] }]];
  const { room, state } = await openRoom(seed);
  let next = null, pages = 0;
  do { const r = await (await room.fetch(new Request('https://x/api/botstat?sweep=1' + (next ? '&after=' + next : ''), { method: 'DELETE', headers: { Authorization: 'Bearer ' + KEY } }))).json(); next = r.next; pages++; } while (next && pages < 20);
  check('8. the sweep keeps an orphan row holding a flag, and takes the plain one', state.m.has('botstat:bp_gq_flagged') && !state.m.has('botstat:bp_gq_plain'), [...state.m.keys()]);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
