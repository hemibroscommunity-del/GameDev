/* Accuracy: how many of your shots hit, a weapon -- v2.3.4480
 * (server/src/accuracy.js, src/game/accuracy.js, docs/specs/accuracy.md).
 *
 *   1. CAPS AND THE WIRE: caps.accuracy advertised, on a line of its own;
 *      `acc_state` privileged; the ask routed; the phone's gate listed.
 *   2. THE RECORD: shots and hits add up; hits never pass shots; "the last
 *      200" is four buckets of fifty; a stored record is read safely.
 *   3. SHOTS are the phone's count, riding `track` (`ac`): counted by how
 *      much they grew, bounded by time, never stored on the player, never
 *      relayed.
 *   4. HITS are the worker's: once a shot (`sn`), in any order; a special
 *      and a claim with no number count nothing; both accept points call it.
 *   5. `acc_request` answers your own numbers, written and unwritten.
 *   6. WRITES: standing writes nothing; a fight writes at most every
 *      FLUSH_MS; leaving writes the rest; a restart deletes it.
 *   7. A REJOIN counts nothing twice.
 *   8. THE OWNER'S DAYS: every player's, a UTC day, unwritten included; a
 *      character in test mode left out; old days pruned.
 *   9. THE KILL SWITCH `accuracy: false`: no cap, nothing counted, {off}.
 *  10. THE PHONE: shots are numbered only against a worker that counts;
 *      the counts ride the track without making it news; each basic swing,
 *      arrow and bolt is numbered and its hit claims carry the number. */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { ACC, accAdd, accBlank, accDay, accDayKey, accKey, accNormalize, accView } from '../src/accuracy.js';
import { accLive, accPct, accReset, accShot, accSn, accTrack, onAccState } from '../../src/game/accuracy.js';
import { lookNews } from '../../src/game/quietPhone.js';

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
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response(JSON.stringify({ ok: true, ids: [] })) }) } };
const fakeWs = () => ({ sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} });
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name); else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
/* the test's clock: every Date.now() the room reads (a join, the real `track`) is on it */
let clock = 1800000000000;
Date.now = () => clock;
const state = makeState();
const room = new GameRoom(state, mockEnv);
const settle = () => new Promise((r) => setTimeout(r, 15));
async function join(id, name) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id, name: name || 'T', phrase: 'p-' + id, device: { id: 'dev' + id }, ws: [1, 5],
    data: { x: 0, y: 0, z: 'town', name: name || 'T', sk: 'tan', hr: 'mop' },
  }));
  await settle();
  return ws;
}
const sessionOf = (ws) => room.sessions.get(ws);
const accPuts = () => state._puts.filter((k) => k.startsWith('acc'));

// ── 1. caps and the wire ──
const a = await join('bp_acc_a', 'Ada');
{
  const sync = a.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('1a. caps.accuracy is advertised', !!(sync && sync.caps && sync.caps.accuracy === true), sync && sync.caps && sync.caps.accuracy);
  const idx = src('server/src/index.js'), jn = src('server/src/join.js'), dev = src('src/ui/panels/DevPanel.jsx');
  check('1b. `acc_state` is privileged, and the ask is routed and awaited',
    /\n {2}'acc_state',\n/.test(idx) && /case 'acc_request':\s*if \(session\.id\) await this\._handleAccRequest\(session\);/.test(idx));
  check('1c. the cap is on a line of its own in the caps literal (TRAPS §316)', /\n {8}accuracy: this\._accOn\(\) \/\*[^\n]*\*\/ \},\n/.test(jn));
  const gates = (dev.match(/const CAP_GATES = \[([\s\S]*?)\];/) || [])[1] || '';
  check('1d. ...and in CAP_GATES, on its own line', /\n {2}'accuracy' \/\*[^\n]*\*\/,\n$/.test(gates));
}

// ── 2. the record ──
{
  const r = accBlank();
  let left = accAdd(r, 'ranged', 10, 4);
  check('2a. shots and hits add up, a weapon', r.w.ranged.s === 10 && r.w.ranged.h === 4 && left === 0 && r.w.melee.s === 0, r.w);
  left = accAdd(r, 'ranged', 0, 9);
  check('2b. hits never pass shots: the ones with no shot yet come back to wait', r.w.ranged.h === 10 && left === 3, [r.w.ranged, left]);
  const big = accBlank();
  accAdd(big, 'melee', 130, 60);
  check('2c. the last shots are kept in buckets of fifty, their hits with them', JSON.stringify(big.w.melee.r.map((b) => b[0])) === '[50,50,30]' && big.w.melee.r.reduce((t, b) => t + b[1], 0) === 60, big.w.melee.r);
  accAdd(big, 'melee', 500, 100);
  const v = accView(big);
  check(`2d. ...${ACC.BUCKETS} of them: "your last ${ACC.BUCKETS * ACC.BUCKET}" (the newest still filling: ${ACC.BUCKET * (ACC.BUCKETS - 1) + 1} to ${ACC.BUCKETS * ACC.BUCKET}); the totals keep everything`,
    big.w.melee.r.length === ACC.BUCKETS && v.melee.rs > ACC.BUCKET * (ACC.BUCKETS - 1) && v.melee.rs <= ACC.BUCKETS * ACC.BUCKET && v.melee.s === 630 && v.melee.h === 160 && v.melee.rh <= v.melee.rs, v.melee);
  const n = accNormalize({ w: { melee: { s: -5, h: 'x', r: 'no' }, ranged: { s: 10, h: 99, r: [[60, 70], [0, 0], [20, 5], 7] }, __proto__: { s: 1 } }, at: 'x' });
  check('2e. a stored record is read safely: whole numbers, hits within shots, buckets within their size',
    n.w.melee.s === 0 && n.w.melee.h === 0 && n.w.ranged.h === 10 && JSON.stringify(n.w.ranged.r) === '[[50,50],[20,5]]' && n.w.staff.s === 0 && n.at === 0, n.w);
  check('2f. garbage is a blank record', JSON.stringify(accNormalize(null).w) === JSON.stringify(accBlank().w) && JSON.stringify(accNormalize('x').w) === JSON.stringify(accBlank().w));
  check('2g. a day is a UTC day', accDay(Date.UTC(2026, 10, 10, 23, 59)) === '20261110' && accDay(Date.UTC(2026, 0, 1, 0, 0)) === '20260101');
}

// ── 3. shots ──
const b = await join('bp_acc_b', 'Bea');
const t = clock;
{
  const sa = sessionOf(a);
  room._accJoin('bp_acc_a', t);
  room._accBook.get('bp_acc_a').flushedAt = t;   /* the test's clock: this fight began at t */
  await room._accShots(sa, [3, 0, 0], t + 2000);
  let e = room._accBook.get('bp_acc_a');
  check('3a. the first report counts from nothing (the phone starts again at every join)', e.d.melee[0] === 3 && e.d.ranged[0] === 0, e.d);
  await room._accShots(sa, [5, 2, 0], t + 4000);
  check('3b. a later one counts how much each weapon grew', e.d.melee[0] === 5 && e.d.ranged[0] === 2, e.d);
  await room._accShots(sa, [5, 2, 0], t + 6000);
  check('3c. no growth, nothing counted', e.d.melee[0] === 5 && e.d.ranged[0] === 2);
  await room._accShots(sa, [1, 2, 0], t + 8000);
  await room._accShots(sa, [2, 2, 0], t + 10000);
  check('3d. a count that went DOWN is a page that began again: counted from there', e.d.melee[0] === 6, e.d);
  await room._accShots(sa, [2, 2, 1000000], t + 12000);
  const cap = ACC.SHOTS_BURST + 2 * ACC.SHOTS_PER_S;
  check(`3e. a report is bounded by time: ${ACC.SHOTS_PER_S} a second since the last and a backlog of ${ACC.SHOTS_BURST} (a million claimed, ${cap} taken)`, e.d.staff[0] === cap, e.d.staff);
  await room._accShots(sa, ['x', null, {}], t + 14000);
  await room._accShots(sa, 'nope', t + 14000);
  await room._accShots(sa, [-5, 2, 0], t + 16000);
  await room._accShots(sa, [9, NaN, 0], t + 16000);
  await room._accShots(sa, [9, 9], t + 16000);
  check('3f. nonsense counts nothing and breaks nothing', e.d.melee[0] === 6 && e.d.ranged[0] === 2 && e.d.staff[0] === cap, e.d);
  /* end to end: on the real `track`, and nowhere it should not be */
  b.sent.length = 0;
  await room._accShots(sa, [0, 0, 0], t + 18000);   /* the page begins again */
  clock = t + 20000;
  await room.webSocketMessage(a, JSON.stringify({ type: 'track', data: { x: 1, y: 2, name: 'Ada', sk: 'tan', hr: 'mop', ac: [4, 0, 0] } }));
  await settle();
  check('3g. the counts ride the real `track`', e.d.melee[0] === 10, e.d.melee);
  const ps = room.playerState['bp_acc_a'];
  const relayed = b.sent.filter((m) => m.type === 'player_update' && m.data && Object.prototype.hasOwnProperty.call(m.data, 'ac'));
  check('3h. ...and are never stored on the player, kept on the session or relayed to anyone',
    !Object.prototype.hasOwnProperty.call(ps, 'ac') && !Object.prototype.hasOwnProperty.call(sessionOf(a).data, 'ac') && relayed.length === 0, relayed.length);
  check('3i. the handler reads `ac` on its own, before the look keys are gathered',
    /if \(msg\.data\.ac !== undefined\) await this\._accShots\(session, msg\.data\.ac, Date\.now\(\)\);\s*const clean = Object\.create\(null\);/.test(src('server/src/index.js')));
}

// ── 4. hits ──
{
  const e = room._accBook.get('bp_acc_a');
  const h0 = e.d.ranged[1];
  room._accHit('bp_acc_a', 'ranged', false, 1, t);
  room._accHit('bp_acc_a', 'ranged', false, 1, t);
  room._accHit('bp_acc_a', 'ranged', false, 1, t);
  check('4a. an arrow through three monsters is one hit', e.d.ranged[1] === h0 + 1, e.d.ranged);
  room._accHit('bp_acc_a', 'ranged', false, 3, t);
  room._accHit('bp_acc_a', 'ranged', false, 2, t);
  check('4b. arrows land in any order: each shot once', e.d.ranged[1] === h0 + 3, e.d.ranged);
  room._accHit('bp_acc_a', 'ranged', true, 9, t);
  room._accHit('bp_acc_a', 'ranged', false, undefined, t);
  room._accHit('bp_acc_a', 'ranged', false, 0, t);
  room._accHit('bp_acc_a', 'ranged', false, -4, t);
  room._accHit('bp_acc_a', 'ranged', false, 'abc', t);
  room._accHit('bp_acc_a', 'laser', false, 7, t);
  room._accHit('', 'ranged', false, 7, t);
  check('4c. a special, a claim with no number, a weapon that is not one: nothing', e.d.ranged[1] === h0 + 3, e.d.ranged);
  const m0 = e.d.melee[1];
  room._accHit('bp_acc_a', 'melee', false, 1, t);
  room._accHit('bp_acc_a', 'ranged', false, 4, t);
  check('4d. each weapon numbers its own shots', e.d.melee[1] === m0 + 1 && e.d.ranged[1] === h0 + 4);
  for (let i = 100; i < 100 + ACC.SN_KEEP + 10; i++) room._accHit('bp_acc_a', 'staff', false, i, t);
  const s1 = e.d.staff[1];
  room._accHit('bp_acc_a', 'staff', false, 100 + ACC.SN_KEEP + 9, t);
  room._accHit('bp_acc_a', 'staff', false, 5, t);
  check('4e. the shots remembered are bounded; one far older than any of them is not a shot still in the air',
    e.sn.staff.length === ACC.SN_KEEP && e.d.staff[1] === s1, [e.sn.staff.length, e.d.staff[1], s1]);
  const cb = src('server/src/combat.js');
  check('4f. a hit on a monster is counted where its health is taken, past every gate',
    /m\.hp -= actualDmg;\s*\/\*[\s\S]{0,300}?\*\/\s*this\._accHit\(session\.id, _effSlot, isSpecial, payload\.sn\);/.test(cb));
  check('4g. ...and a hit on a player where the hit is settled, by the weapon the worker itself decided',
    /this\._accHit\(attackerId, kind, _special, payload\.sn\);/.test(cb));
}

// ── 5. the answer ──
{
  a.sent.length = 0;
  await room.webSocketMessage(a, JSON.stringify({ type: 'acc_request', payload: {} }));
  await settle();
  const m = a.sent.filter((x) => x.type === 'acc_state').pop();
  const w = m && m.payload && m.payload.w;
  check('5a. `acc_request` answers your own numbers, the unwritten ones included', !!w && w.melee.s === 10 && w.melee.h === 1 && w.ranged.s === 2 && w.ranged.h === 2, w);
  check('5b. ...hits within shots even while a shot\'s report is still on its way (four arrows hit, two reported)', !!w && w.ranged.h <= w.ranged.s);
  check('5c. nobody else is told', b.sent.filter((x) => x.type === 'acc_state').length === 0);
}

// ── 6. writes ──
{
  check('6a. nothing has been written yet: a fight younger than the pace writes nothing', accPuts().length === 0, accPuts());
  const c = await join('bp_acc_c', 'Cy');
  await room.webSocketMessage(c, JSON.stringify({ type: 'track', data: { x: 5, y: 5, name: 'Cy', sk: 'tan' } }));
  await room.webSocketMessage(c, JSON.stringify({ type: 'track', data: { x: 9, y: 5, name: 'Cy', sk: 'tan' } }));
  await settle();
  await room.webSocketClose(c);
  await settle();
  check('6b. standing and walking write nothing, in the world or on the way out', accPuts().length === 0, accPuts());
  const sa = sessionOf(a);
  const e = room._accBook.get('bp_acc_a');
  e.flushedAt = t;
  await room._accShots(sa, [5, 0, 0], t + ACC.FLUSH_MS - 1000);
  check('6c. within the pace: counted, not written', accPuts().length === 0 && e.d.melee[0] === 11);
  await room._accShots(sa, [6, 0, 0], t + ACC.FLUSH_MS + 1000);
  const rec = state._store.get(accKey('bp_acc_a'));
  check('6d. past it: the character\'s record is written, and the day\'s with it', !!rec && rec.w.melee.s === 12 && rec.w.melee.h === 1 && accPuts().length === 2
    && accPuts().some((k) => k.startsWith('accday:')), [rec && rec.w.melee, accPuts()]);
  check('6e. ...hits whose shots have not been reported wait in memory, not in the record', rec.w.ranged.s === 2 && rec.w.ranged.h === 2 && e.d.ranged[1] === 2 && e.dirty === true, [rec.w.ranged, e.d.ranged]);
  const before = accPuts().length;
  await room._accShots(sa, [7, 9, 0], t + ACC.FLUSH_MS + 3000);
  check('6f. the next write waits for the pace again', accPuts().length === before && e.d.ranged[0] === 9);   /* (9 since the page began again in 3g) */
  await room.webSocketClose(a);
  await settle();
  const rec2 = state._store.get(accKey('bp_acc_a'));
  check('6g. leaving writes what was not yet written: the waiting hits found their shots',
    rec2.w.melee.s === 13 && rec2.w.ranged.s === 11 && rec2.w.ranged.h === 4, [rec2.w.melee, rec2.w.ranged]);
  await room._accDayFlush();
  check('6g2. ...and the room forgets a player who has gone, once nothing of theirs is left to write', !room._accBook.has('bp_acc_a'));
  await room._accGone('bp_acc_a');
  check('6h. a character restarted for good takes its accuracy with it', !state._store.has(accKey('bp_acc_a')));
  check('6i. ...and the restart calls it', /if \(this\._accGone\) await this\._accGone\(pid\)/.test(src('server/src/persistence.js')));
}

// ── 7. a rejoin ──
{
  const sb = sessionOf(b);
  room._accJoin('bp_acc_b', t);
  room._accBook.get('bp_acc_b').flushedAt = t + ACC.FLUSH_MS;   /* (not due for a write in this section) */
  await room._accShots(sb, [20, 0, 0], t + 5000);
  room._accHit('bp_acc_b', 'melee', false, 20, t + 5000);
  const e = room._accBook.get('bp_acc_b');
  /* the socket drops and comes back: the phone starts from nothing, and so does the worker's copy */
  room._accJoin('bp_acc_b', t + 9000);
  await room._accShots(sb, [2, 0, 0], t + 11000);
  room._accHit('bp_acc_b', 'melee', false, 2, t + 11000);
  check('7a. a rejoin counts nothing twice and loses nothing counted: 20 shots then 2 more; shot 2 of the new life can hit',
    e.d.melee[0] === 22 && e.d.melee[1] === 2, e.d.melee);
  /* a second login: the FIRST socket closes after the new one joined -- the new session's counts must survive it */
  const left = room._accDirtyCopy('bp_acc_b');
  await room._accShots(sb, [5, 0, 0], t + 13000);
  check('7a2. an old socket closing does not make the next report count every shot again (3 more, not 5)',
    !!left && left.d.melee[0] === 22 && room._accBook.get('bp_acc_b').d.melee[0] === 3, [left && left.d.melee, room._accBook.get('bp_acc_b').d.melee]);
  await room._accPut('bp_acc_b', left);
  room._accBook.get('bp_acc_b').flushedAt = t + ACC.FLUSH_MS;
  /* a count is never allowed to break what it rides on */
  const boom = room._accEntry;
  room._accEntry = () => { throw new Error('boom'); };
  let threw = false;
  try { room._accHit('bp_acc_b', 'melee', false, 99, t); room._accJoin('bp_acc_b', t); await room._accShots(sb, [9, 0, 0], t + 14000); } catch (e) { threw = true; }
  room._accEntry = boom;
  check('7a3. a fault in the counting never reaches the hit, the join or the track that carries it', threw === false);
  check('7b. the join resets the worker\'s copy before the state goes out',
    /if \(this\._accJoin\) this\._accJoin\(session\.id, Date\.now\(\)\);\s*ws\.send\(JSON\.stringify\(\{\s*type: 'state_sync',/.test(src('server/src/join.js')));
}

// ── 8. the owner's days ──
{
  const d = await room._accAdminDays(14);
  const today = d.days.find((x) => x.day === accDay(t));
  check('8a. every player\'s shots and hits, a day, written and unwritten together', d.ok && !!today && today.melee[0] === 13 + 22 + 3 && today.ranged[0] === 11, today);
  check('8b. hits within shots there too', d.days.every((x) => ['melee', 'ranged', 'staff'].every((s) => x[s][1] <= x[s][0])));
  /* a character in test mode is the owner testing: not the players' aim */
  const was = room._testMode;
  room._testMode = (ps) => ps === room.playerState['bp_acc_b'];
  const before = JSON.stringify((await room._accAdminDays(14)).days);
  await room._accShots(sessionOf(b), [40, 0, 0], t + 20000);
  room._accHit('bp_acc_b', 'melee', false, 30, t + 20000);
  const e = room._accBook.get('bp_acc_b');
  check('8c. a character in test mode keeps its own count but is left out of the day\'s', e.d.melee[0] === 38 && JSON.stringify((await room._accAdminDays(14)).days) === before);
  room._testMode = was;
  /* a new day */
  const tomorrow = t + 86400000;
  await room._accShots(sessionOf(b), [41, 0, 0], tomorrow);
  const d2 = await room._accAdminDays(14);
  check('8d. a new UTC day is a new row, newest first', d2.days[0].day === accDay(tomorrow) && d2.days[0].melee[0] === 1 && d2.days.length >= 2, d2.days.map((x) => x.day));
  for (let i = 0; i < ACC.DAY_KEEP + 5; i++) state._store.set(accDayKey('2020' + String(1000 + i).slice(1) + '1'), { v: 1, melee: [1, 0], ranged: [0, 0], staff: [0, 0] });
  room._accPrunedDay = null;
  room._accDayBook.dirty = true;
  await room._accDayFlush();
  const kept = [...state._store.keys()].filter((k) => k.startsWith('accday:'));
  check(`8e. days past the last ${ACC.DAY_KEEP} are let go`, kept.length === ACC.DAY_KEEP && kept.includes(accDayKey(accDay(tomorrow))), kept.length);
  check('8f. the owner\'s route is read-only and behind the admin surface', /if \(request\.method === 'GET' && path === '\/dev\/accuracy'\) \{\s*const r = await this\._accAdminDays\(/.test(src('server/src/devtools.js')));
}

// ── 9. the kill switch ──
{
  room._liveFlags = { accuracy: false };
  const z = await join('bp_acc_z', 'Zed');
  const sync = z.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('9a. `accuracy: false`: the cap is not advertised', !!sync && !sync.caps.accuracy, sync && sync.caps.accuracy);
  await room._accShots(sessionOf(z), [9, 9, 9], t + 5000);
  room._accHit('bp_acc_z', 'melee', false, 1, t + 5000);
  check('9b. ...nothing is counted', !room._accBook.has('bp_acc_z'));
  z.sent.length = 0;
  await room.webSocketMessage(z, JSON.stringify({ type: 'acc_request', payload: {} }));
  await settle();
  const m = z.sent.filter((x) => x.type === 'acc_state').pop();
  check('9c. ...and the ask is answered {off: true}', !!m && m.payload.off === true && !m.payload.w, m && m.payload);
  room._liveFlags = {};
}

// ── 10. the phone ──
{
  const S = { _serverCaps: {} };
  check('10a. against a worker that does not count, nothing is numbered or sent', accShot(S, 'melee') === 0 && accTrack(S) === undefined && accSn(S, 'melee') === 0 && !accLive(S));
  S._serverCaps.accuracy = true;
  accReset(S);
  check('10b. no shot yet: the track carries nothing', accTrack(S) === undefined);
  const n1 = accShot(S, 'ranged'), n2 = accShot(S, 'ranged'), m1 = accShot(S, 'melee');
  check('10c. each weapon numbers its own shots from 1; a swing\'s hits claim the swing in progress', n1 === 1 && n2 === 2 && m1 === 1 && accSn(S, 'melee') === 1 && accShot(S, 'wand') === 0);
  check('10d. the track carries [sword, bow, staff] since this join', JSON.stringify(accTrack(S)) === '[1,2,0]');
  accReset(S);
  check('10e. a new state_sync starts them again', accTrack(S) === undefined && accShot(S, 'staff') === 1);
  check('10f. the counts are not NEWS to the quiet phone: a shot does not send a track of its own',
    lookNews({ name: 'A', sk: 'tan', ac: [1, 0, 0] }) === lookNews({ name: 'A', sk: 'tan', ac: [9, 4, 2] }) && lookNews({ name: 'A', sk: 'tan' }) === lookNews({ name: 'A', sk: 'tan', ac: [1, 0, 0] }));
  onAccState(S, { w: { melee: { s: 10, h: 99, rs: 5, rh: 9 }, ranged: 'x' } });
  check('10g. the answer is kept safely: hits within shots, a missing weapon blank', S._accState.w.melee.h === 10 && S._accState.w.melee.rh === 5 && S._accState.w.ranged.s === 0 && S._accState.off === false, S._accState.w);
  check('10h. "62%", and a dash before the first shot', accPct(200, 124) === '62%' && accPct(0, 0) === '—' && accPct(3, 9) === '100%');
  const mc = src('src/game/monsterCombat.js'), pa = src('src/game/playerActions.js'), pr = src('src/game/projectiles.js'), bt = src('src/ui/BroTown.jsx'), ws = src('src/networking/wsClient.js');
  check('10i. a basic arrow or bolt is numbered as it is made; the two basic swings as they start',
    /_sn: accShot\(S, isStaff \? 'staff' : 'ranged'\) \|\| undefined,/.test(mc)
    && /clearSwingHitFlags\(S\); \/\* v2\.3\.1421: fresh dedup per swing \*\/\s*accShot\(S, 'melee'\);/.test(mc)
    && /clearSwingHitFlags\(S\); \/\* v2\.3\.1421: fresh dedup per swing \(quick re-tap fix\) \*\/\s*accShot\(S, 'melee'\);/.test(pa));
  check('10j. a hit claim carries its shot\'s number -- never a special\'s',
    /sn: S\._specialAttack \? undefined : \(accSn\(S, 'melee'\) \|\| undefined\)\s*\}\}\);/.test(mc)
    && (pr.match(/sn: \(!a\.isSpecial && a\._sn\) \|\| undefined,/g) || []).length === 2
    && (mc.match(/sn: S\._specialAttack \? undefined : \(accSn\(S, 'melee'\) \|\| undefined\)/g) || []).length === 2);
  check('10k. the counts ride the track; the answer is taken in the direct switch (never a relayed copy); the ask leaves the phone',
    /S\.channel\.track\(\{\s*ac: accTrack\(S\),/.test(bt) && /case 'acc_state':\s*\{ if \(msg\.from\) break; try \{ onAccState\(S, msg\.payload\); \}/.test(ws)
    && /if \(msg\.type === 'acc_request'\) \{\s*wsOut\(msg\);/.test(ws) && /accReset\(S\);[^\n]*\n\s*S\._serverCaps = msg\.caps \|\| \{\};/.test(ws));
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
