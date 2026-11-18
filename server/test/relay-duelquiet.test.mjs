/* ═══ v2.3.5731: A DUEL'S FRAMES REACH ITS TARGET ALONE (card K2 PR 12; `duelquiet`) ═══
 *
 * Card RV's review: a duel's challenge, wager, accept and decline went to
 * every phone in the room, which threw them away (gameEvents.js acts only on
 * its own `payload.target`) after reading who challenged whom.  This holds
 * (eventplace.js duelPlaceOf, eventHeardBy's `only`; tick.js eventsFor):
 *
 *   1. the reader: on with no flag, off only with `duelquiet: false`;
 *   2. where each is placed: its target and the sender the room stamped,
 *      no one else; a frame with no target, and any other type, is not;
 *   3. a room, v2 and v1 phones: a challenge reaches its target and not a
 *      bystander; the accept reaches the challenger and the accepter's own
 *      phone (duel-pending.test 1's echo) and not the bystander; the
 *      worker's own decline reaches its target alone; chat still reaches
 *      everyone;
 *   4. with `eventplace: false`, a duel's frames are still quiet;
 *   5. `duelquiet: false`: the bystander hears them all again.
 *
 * Red on main (v2.3.5730): 1, 2, 3 and 4. */
import { GameRoom } from '../src/index.js';
import * as EP from '../src/eventplace.js';
import { makeStorage, mockEnv } from './testroom.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });

async function makeRoom(flags) {
  const room = new GameRoom(makeStorage(), mockEnv);
  await room._liveFlagsEnsure();
  if (flags) Object.assign(room._liveFlags, flags);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return realSetInterval(fn, ms); };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  return { room, tickFn };
}
async function join(room, id, pv) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  const msg = { type: 'join', id, name: id, phrase: 'p-' + id, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } };
  if (pv === 2) msg.protocolVersion = 2;
  await room.webSocketMessage(ws, JSON.stringify(msg));
  return ws;
}
const send = (room, ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));
/* the events a phone's ticks carried since `from` */
function eventsOf(ws, from) {
  const out = [];
  for (let i = from; i < ws.sent.length; i++) {
    const s = ws.sent[i];
    if (!s.startsWith('{"type":"tick"')) continue;
    const d = JSON.parse(s);
    if (Array.isArray(d.events)) out.push(...d.events);
  }
  return out;
}
const typesOf = (evs) => evs.map((e) => e.type);

/* ── 1. the reader ── */
{
  const a = await makeRoom();
  const b = await makeRoom({ duelquiet: false });
  check('1. `duelquiet` is on with no flag', typeof a.room._duelQuietOn === 'function' && a.room._duelQuietOn() === true);
  check('1. ...off with `duelquiet: false`', typeof b.room._duelQuietOn === 'function' && b.room._duelQuietOn() === false);
  for (const r of [a, b]) if (r.room.tickInterval) clearInterval(r.room.tickInterval);
}

/* ── 2. where each is placed ── */
{
  const P = EP.duelPlaceOf || (() => undefined);
  const req = P({ type: 'duel_request', from: 'bp_a', payload: { target: 'bp_b', from: 'bp_forged' } });
  check('2. a challenge is placed for its target and the stamped sender, no one else', !!req && req.only === true && JSON.stringify(req.who) === '["bp_b","bp_a"]', req);
  const dec = P({ type: 'duel_decline', payload: { target: 'bp_a' } });
  check('2. the worker\'s own decline (no sender) is placed for its target alone', !!dec && dec.only === true && JSON.stringify(dec.who) === '["bp_a"]', dec);
  check('2. every duel type is quiet', ['duel_request', 'duel_wager_request', 'duel_accept', 'duel_decline'].every((t) => !!P({ type: t, payload: { target: 'x' } })));
  check('2. a frame with no target, and any other type, is not', !P({ type: 'duel_request', payload: {} }) && !P({ type: 'chat', payload: { target: 'x' } }) && !P({ type: 'trade_offer', payload: { target: 'x' } }));
  const heard = (sid) => EP.eventHeardBy(req || { who: [] }, sid, { z: 'town', x: 0, y: 0 }, false);
  check('2. heard by the two it names and not a phone in the same zone', heard('bp_b') && heard('bp_a') && !heard('bp_c'));
}

/* ── 3, 4 and 5. a room ── */
async function play(flags) {
  const { room, tickFn } = await makeRoom(flags);
  const wa = await join(room, 'bp_dq_a', 2), wb = await join(room, 'bp_dq_b', 1), wc = await join(room, 'bp_dq_c', 2), wd = await join(room, 'bp_dq_d', 1);
  tickFn();
  const m = [wa, wb, wc, wd].map((w) => w.sent.length);
  await send(room, wa, 'duel_request', { target: 'bp_dq_b', from: 'bp_dq_a', fromName: 'A' });
  tickFn();
  const m2 = [wa, wb, wc, wd].map((w) => w.sent.length);
  await send(room, wb, 'duel_accept', { target: 'bp_dq_a', from: 'bp_dq_b', fromName: 'B', wager: 0 });
  tickFn();
  const m3 = [wa, wb, wc, wd].map((w) => w.sent.length);
  room.eventBuffer.push({ type: 'duel_decline', payload: { target: 'bp_dq_a', from: 'bp_dq_b' } });   /* the worker's own decline */
  await send(room, wc, 'chat', { text: 'hello', color: '#D95C54' });
  tickFn();
  const ev = (w, i, from) => typesOf(eventsOf(w, from[i])).filter((t) => t.startsWith('duel_') || t === 'chat');
  const r = {
    req: [wa, wb, wc, wd].map((w, i) => ev(w, i, m).filter((t) => t === 'duel_request').length),
    acc: [wa, wb, wc, wd].map((w, i) => ev(w, i, m2).filter((t) => t === 'duel_accept').length),
    dec: [wa, wb, wc, wd].map((w, i) => ev(w, i, m3).filter((t) => t === 'duel_decline').length),
    chat: [wa, wb, wc, wd].map((w, i) => ev(w, i, m3).filter((t) => t === 'chat').length),
  };
  if (room.tickInterval) clearInterval(room.tickInterval);
  return r;
}
{
  const r = await play();
  check('3. a challenge reaches its target (v1) and not the bystanders (v2, v1)', r.req[1] === 1 && r.req[2] === 0 && r.req[3] === 0, r.req);
  check('3. the accept reaches the challenger and the accepter\'s own phone, not the bystanders', r.acc[0] === 1 && r.acc[1] === 1 && r.acc[2] === 0 && r.acc[3] === 0, r.acc);
  check('3. the worker\'s own decline reaches its target alone', r.dec[0] === 1 && r.dec[1] === 0 && r.dec[2] === 0 && r.dec[3] === 0, r.dec);
  check('3. chat still reaches everyone', r.chat.every((n) => n === 1), r.chat);
}
{
  const r = await play({ eventplace: false });
  check('4. with `eventplace: false` a duel\'s frames are still quiet', r.req[2] === 0 && r.acc[2] === 0 && r.dec[2] === 0 && r.req[1] === 1 && r.acc[1] === 1, r);
}
{
  const r = await play({ duelquiet: false });
  check('5. `duelquiet: false`: the bystanders hear every duel frame again, as before', r.req[2] === 1 && r.req[3] === 1 && r.acc[2] === 1 && r.dec[2] === 1, r);
}

console.log(failed === 0 ? '\nALL PASS (' + passed + ')' : '\n' + failed + ' FAILURE(S)');
process.exit(failed === 0 ? 0 : 1);
