/* ═══ v2.3.4382: A REJOIN IS TOLD ITS LIVE DUEL AND TRADE AGAIN ═══
 *
 * The state-machine sweep (2026-11-03; V6 N2-18, V8b P2-1 / S6-2, review R2
 * W1.3): the phone kept its own copies of a duel and a trade across a
 * reconnect, and the worker never said whether they were still on.  Now
 * (server/src/rejoinresend.js, src/game/rejoinSlots.js):
 *   1. a rejoin with a live social or wagered duel is sent `duel_resume`
 *      AFTER state_sync, on that socket only, on protocol v1 and v2; a duel
 *      that ended while away is not; an arena match is left to the arena;
 *   2. a live trade comes back as its full trade2_state, a live invite as
 *      trade2_invite (or your own waiting drawer); an ended one not at all;
 *   3. trade2_cancel naming a trade the worker no longer holds is answered
 *      'gone'; an invite's Decline (no id) and a live trade's leave as before;
 *   4. the cap (caps.rejoinResend, a count) and the kill switch
 *      (`rejoinresend: false`): off, no re-send, no cap, no 'gone';
 *   5. the phone: cleared at state_sync only as far as the cap says, put back
 *      by the re-send; an old worker (no cap) keeps today's phone; the pending
 *      duel and the trade leave's timeout still work;
 *   6. THE REGISTRY: every slot wsClient.js's state_sync clears is a row of
 *      REJOIN_SLOTS with a worker re-send called after state_sync (or the
 *      reason it needs none);
 *   7. a rejoin's re-sends add no storage write.
 */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { flagNameOk } from '../src/liveops.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
let R = {};
try { R = await import('../../src/game/rejoinSlots.js'); } catch (e) { R = {}; }
const T = await import('../../src/game/tradeSlot.js');
let REJOIN = {};
try { ({ REJOIN } = await import('../src/rejoinresend.js')); } catch (e) { REJOIN = {}; }
const P = await import('../../src/game/duelPending.js');
check('0 rejoinSlots.js exports its rules',
  ['rejoinClear', 'duelResume', 'rejoinCount'].every((f) => typeof R[f] === 'function') && Array.isArray(R.REJOIN_SLOTS), Object.keys(R));

/* ── the worker ── */
function mockState() {
  const store = new Map();
  let puts = 0;
  return {
    _store: store, puts: () => puts,
    storage: {
      get: async (k) => store.get(k), put: async (k, v) => { puts++; if (typeof k === 'object') { for (const kk of Object.keys(k)) store.set(kk, k[kk]); } else store.set(k, v); },
      list: async (o) => { const m = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) m.set(k, v); return m; },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const fakeWs = () => ({ sent: [], send(s) { this.sent.push(s); }, close() {} });
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });
function makeRoom(flags) {
  const st = mockState();
  const room = new GameRoom(st, mockEnv);
  room._liveFlags = flags || {};
  return { room, st };
}
async function join(room, id, pv) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  const m = { type: 'join', id, name: id, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } };
  if (pv === 2) m.protocolVersion = 2;
  await room.webSocketMessage(ws, JSON.stringify(m));
  return ws;
}
const send = (room, ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));
const parsed = (ws) => ws.sent.map((s) => { try { return JSON.parse(s); } catch (e) { return {}; } });
const typesOf = (ws) => parsed(ws).map((m) => m.type);
const firstOf = (ws, type) => parsed(ws).find((m) => m.type === type);
const after = (ws, type, first) => { const t = typesOf(ws); const i = t.indexOf(first); return i >= 0 && t.indexOf(type, i) > i; };
function stopTick(room) { if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; } }
async function duelPair(pv, wager) {
  const { room, st } = makeRoom();
  const wsA = await join(room, 'bp_rj_a', pv);
  const wsB = await join(room, 'bp_rj_b', pv);
  await send(room, wsA, 'duel_request', { target: 'bp_rj_b', from: 'bp_rj_a', fromName: 'A' });
  await send(room, wsB, 'duel_accept', { target: 'bp_rj_a', from: 'bp_rj_b', fromName: 'B', wager: 0 });
  const d = room._duelFor('bp_rj_b');
  if (d && wager) d.wager = wager;   /* the record a wagered duel holds; the escrow is duel.test's */
  return { room, st, wsA, wsB, d };
}

/* ── 1. the duel ── */
for (const pv of [1, 2]) {
  /* a reload inside the grace: the old socket closed, the new one joins */
  const { room, wsB, d } = await duelPair(pv, 0);
  check(`1a v${pv}: the duel is live on the worker`, !!d);
  room.webSocketClose(wsB, 1001, 'gone', true);
  const ws2 = await join(room, 'bp_rj_b', pv);
  const m = firstOf(ws2, 'duel_resume');
  check(`1b v${pv}: a rejoin inside the 15 s is told its duel goes on (the reverse phantom)`,
    !!m && m.payload.foe === 'bp_rj_a' && m.payload.wager === 0 && !!room._duelFor('bp_rj_b'), typesOf(ws2));
  check(`1c v${pv}: ...AFTER state_sync (the phone clears there)`, after(ws2, 'duel_resume', 'state_sync'), typesOf(ws2));
  /* a second tab (the eviction with no close) */
  const ws3 = await join(room, 'bp_rj_a', pv);
  check(`1d v${pv}: the foe's second tab is told too, naming the other`, (firstOf(ws3, 'duel_resume') || {}).payload?.foe === 'bp_rj_b', typesOf(ws3));
  stopTick(room);
}
{
  const { room, wsB } = await duelPair(1, 250);
  const ws2 = await join(room, 'bp_rj_b', 1);
  check('1e a wagered duel comes back with its stake', (firstOf(ws2, 'duel_resume') || {}).payload?.wager === 250, typesOf(ws2));
  /* it ends while the phone is away: the 15 s forfeit */
  room.webSocketClose(ws2, 1001, 'gone', true);
  room._tickDuels(Date.now() + 20000);
  check('1f the forfeit ended it on the worker', !room._duelFor('bp_rj_b'));
  const ws3 = await join(room, 'bp_rj_b', 1);
  check('1g a rejoin after the duel ended is sent no duel', !typesOf(ws3).includes('duel_resume'), typesOf(ws3));
  check('1h ...and the other player, who did not leave, is sent nothing either', !typesOf(wsB).slice(-50).includes('duel_resume'));
  stopTick(room);
}
{
  const { room, d } = await duelPair(2, 0);
  d.arenaMatch = 'm1';   /* an arena match rides the duel machine */
  const ws2 = await join(room, 'bp_rj_b', 2);
  check('1i an arena match is left to the arena\'s own re-send', !typesOf(ws2).includes('duel_resume'), typesOf(ws2));
  stopTick(room);
}

/* ── 2. the trade ── */
async function tradePair(pv) {
  const { room, st } = makeRoom();
  const wsA = await join(room, 'bp_tr_a', pv);
  const wsB = await join(room, 'bp_tr_b', pv);
  return { room, st, wsA, wsB };
}
for (const pv of [1, 2]) {
  const { room, wsA, wsB } = await tradePair(pv);
  await send(room, wsA, 'trade2_open', { target: 'bp_tr_b' });
  /* the invitee reloads: the invite card comes back */
  const ws2 = await join(room, 'bp_tr_b', pv);
  const inv = firstOf(ws2, 'trade2_invite');
  check(`2a v${pv}: a rejoin with a live invite toward you gets the card back`,
    !!inv && inv.payload.from === 'bp_tr_a' && inv.payload.rejoin === true && after(ws2, 'trade2_invite', 'state_sync'), typesOf(ws2));
  /* the inviter reloads: the waiting drawer comes back */
  const ws3 = await join(room, 'bp_tr_a', pv);
  const drw = parsed(ws3).find((m) => m.type === 'trade2_state' && m.payload.state === 'invited');
  check(`2b v${pv}: ...and the inviter gets its waiting drawer back`, !!drw && drw.payload.target === 'bp_tr_b', typesOf(ws3));
  /* it goes live, then the invitee reloads */
  await send(room, ws2, 'trade2_open', { target: 'bp_tr_a' });
  const s = room._t2SessionFor('bp_tr_b');
  check(`2c v${pv}: the trade is open`, !!s);
  const ws4 = await join(room, 'bp_tr_b', pv);
  const st4 = parsed(ws4).find((m) => m.type === 'trade2_state');
  check(`2d v${pv}: a rejoin with an open trade gets the full window back, after state_sync`,
    !!st4 && st4.payload.state === 'open' && st4.payload.id === s.id && !!st4.payload.offers && after(ws4, 'trade2_state', 'state_sync'), typesOf(ws4));
  /* the partner leaves; the next rejoin is told nothing */
  await send(room, ws3, 'trade2_cancel', {});
  const ws5 = await join(room, 'bp_tr_b', pv);
  check(`2e v${pv}: a rejoin after the trade ended gets no trade`, !typesOf(ws5).includes('trade2_state') && !typesOf(ws5).includes('trade2_invite'), typesOf(ws5));
  stopTick(room);
}
{
  const { room, wsA } = await tradePair(1);
  await send(room, wsA, 'trade2_open', { target: 'bp_tr_b' });
  for (const k of room._t2Invites.keys()) room._t2Invites.set(k, Date.now() - 61000);   /* past its 60 s */
  const ws2 = await join(room, 'bp_tr_b', 1);
  check('2f an invite past its time is not said again', !typesOf(ws2).includes('trade2_invite'), typesOf(ws2));
  stopTick(room);
}

/* ── 3. a leave from a window the worker no longer holds ── */
{
  const { room, wsA, wsB } = await tradePair(2);
  const n0 = wsA.sent.length;
  await send(room, wsA, 'trade2_cancel', { id: 'gone-trade-id' });
  const ans = parsed(wsA).slice(n0).find((m) => m.type === 'trade2_state');
  check('3a trade2_cancel naming a trade the worker no longer holds is answered "gone" (it waited 3 s on the phone)',
    !!ans && ans.payload.state === 'cancelled' && ans.payload.reason === 'gone', ans);
  const n1 = wsA.sent.length;
  await send(room, wsA, 'trade2_cancel', {});
  check('3b an invite\'s Decline (no id) is answered as before: nothing to the decliner', !parsed(wsA).slice(n1).some((m) => m.type === 'trade2_state'));
  await send(room, wsA, 'trade2_open', { target: 'bp_tr_b' });
  await send(room, wsB, 'trade2_open', { target: 'bp_tr_a' });
  const s = room._t2SessionFor('bp_tr_a');
  const n2 = wsA.sent.length;
  await send(room, wsA, 'trade2_cancel', { id: s.id });
  const end = parsed(wsA).slice(n2).filter((m) => m.type === 'trade2_state');
  check('3c a live trade\'s leave is the "declined" it always was, once', end.length === 1 && end[0].payload.reason === 'declined', end);
  stopTick(room);
}

/* ── 4. the cap and the kill switch ── */
{
  const { room } = makeRoom();
  const ws = await join(room, 'bp_cap', 2);
  const caps = (firstOf(ws, 'state_sync') || {}).caps || {};
  check('4a the join advertises caps.rejoinResend as a count', caps.rejoinResend === REJOIN.COUNT && REJOIN.COUNT === 2, caps.rejoinResend);
  stopTick(room);
}
{
  check('4b `rejoinresend` is a lower-case name the operator\'s route takes', flagNameOk('rejoinresend'));
  const { room, wsB } = await duelPair(1, 0);
  room._liveFlags = { rejoinresend: false };
  const wsA0 = room._wsBySessionId('bp_rj_a');
  await send(room, wsA0, 'trade2_open', { target: 'bp_rj_b' });
  const ws2 = await join(room, 'bp_rj_b', 1);
  const caps = (firstOf(ws2, 'state_sync') || {}).caps || {};
  check('4c switched off: the cap is un-advertised', !('rejoinResend' in caps), caps.rejoinResend);
  check('4d ...and nothing is said again (the duel and the invite live on, as before)',
    !typesOf(ws2).includes('duel_resume') && !typesOf(ws2).includes('trade2_invite') && !!room._duelFor('bp_rj_b'), typesOf(ws2));
  const n = ws2.sent.length;
  await send(room, ws2, 'trade2_cancel', { id: 'x' });
  check('4e ...and a leave of a missing trade is not answered "gone"', !parsed(ws2).slice(n).some((m) => m.type === 'trade2_state' && m.payload.reason === 'gone'));
  room._liveFlags = {};
  check('4f cleared, the worker re-sends again', typeof room._rejoinResendCount === 'function' && room._rejoinResendCount() === REJOIN.COUNT);
  void wsB;
  stopTick(room);
}

/* ── 5. the phone ── */
function phone() {
  return {
    myId: 'bp_rj_b', player: { x: 0, y: 0 },
    others: { bp_rj_a: { id: 'bp_rj_a', x: 10, y: 0 } },
    lockedTarget: null, _inDuel: null, _activeDuel: null, _realtimeStatus: 'connected',
  };
}
const inDuel = (S) => { S._inDuel = { opponent: 'bp_rj_a', wager: 0, startTime: 1 }; S._activeDuel = { partnerId: 'bp_rj_a' }; S.lockedTarget = { type: 'player', id: 'bp_rj_a' }; };
/* the phone's side of a join: what the worker sent, in its order */
function playJoin(S, msgs, slot) {
  for (const m of msgs) {
    if (m.type === 'state_sync') {
      T.t2OnStateSync(S, slot.set, () => {});
      R.rejoinClear(S, (m.caps || {}).rejoinResend, slot.set, () => {});
    } else if (m.type === 'duel_resume' && !m.from) R.duelResume(S, m.payload);
    else if (m.type === 'trade2_state' && m.payload.state === 'open') { slot.set(m.payload); S._t2Live = m.payload.id; }
    else if (m.type === 'trade2_invite') { slot.set({ invite: true, from: m.payload.from }); S._t2Live = null; }
  }
}
if (typeof R.rejoinClear === 'function') {
  {
    const S = phone(); inDuel(S);
    R.rejoinClear(S, undefined, () => {});
    check('5a an old worker (no cap): the duel is kept, as today', !!S._inDuel && !!S.lockedTarget);
    R.rejoinClear(S, 0, () => {});
    check('5b the kill switch (count 0): kept too', !!S._inDuel);
    let slot = { state: 'open', id: 't1' };
    S._t2Live = 't1';
    R.rejoinClear(S, 1, (v) => { slot = v; });
    check('5c a count of 1: the duel and its lock are cleared, a trade window is not', !S._inDuel && !S._activeDuel && !S.lockedTarget && !!slot && S._t2Live === 't1');
    R.rejoinClear(S, 2, (v) => { slot = v; }, () => {});
    check('5d a count of 2: the trade window is cleared too', slot === null && !S._t2Live);
  }
  /* end to end: the worker's real messages played on the phone's rules */
  {
    const { room, wsB } = await duelPair(2, 0);
    room.webSocketClose(wsB, 1001, 'gone', true);
    const ws2 = await join(room, 'bp_rj_b', 2);
    const S = phone(); inDuel(S); S._inDuel.opponent = 'bp_rj_a';
    playJoin(S, parsed(ws2), { set: () => {} });
    check('5e a rejoin with a live duel: the phone shows it, locked on the foe', !!S._inDuel && S._inDuel.opponent === 'bp_rj_a' && S.lockedTarget && S.lockedTarget.id === 'bp_rj_a', S._inDuel);
    const S2 = phone();
    playJoin(S2, parsed(ws2), { set: () => {} });
    check('5f ...and a phone that had lost it (a reload) is put back in it', !!S2._inDuel && S2._inDuel.opponent === 'bp_rj_a');
    room.webSocketClose(ws2, 1001, 'gone', true);
    room._tickDuels(Date.now() + 20000);
    const ws3 = await join(room, 'bp_rj_b', 2);
    const S3 = phone(); inDuel(S3);
    playJoin(S3, parsed(ws3), { set: () => {} });
    check('5g a rejoin after the duel ended away: the phone shows none (the phantom)', !S3._inDuel && !S3._activeDuel && !S3.lockedTarget, S3._inDuel);
    stopTick(room);
  }
  {
    const { room, wsA } = await tradePair(1);
    await send(room, wsA, 'trade2_open', { target: 'bp_tr_b' });
    const wsB2 = await join(room, 'bp_tr_b', 1);
    await send(room, wsB2, 'trade2_open', { target: 'bp_tr_a' });
    const ws3 = await join(room, 'bp_tr_b', 1);
    let slot = { state: 'open', id: 'stale' };
    const S = phone(); S._t2Live = 'stale';
    playJoin(S, parsed(ws3), { set: (v) => { slot = v; } });
    check('5h a rejoin with a live trade: the window shows the worker\'s trade', !!slot && slot.state === 'open' && slot.id === room._t2SessionFor('bp_tr_b').id && S._t2Live === slot.id, slot);
    room._t2Cancel(room._t2SessionFor('bp_tr_b'), 'declined');
    const ws4 = await join(room, 'bp_tr_b', 1);
    let slot2 = { state: 'open', id: 'dead' };
    const S4 = phone(); S4._t2Live = 'dead';
    playJoin(S4, parsed(ws4), { set: (v) => { slot2 = v; } });
    check('5i a rejoin after it was cancelled: no window (it stayed up until closed)', slot2 === null && !S4._t2Live, slot2);
    /* an invite card the worker still holds survives the reconnect now */
    await send(room, wsA, 'trade2_open', { target: 'bp_tr_b' });
    const ws5 = await join(room, 'bp_tr_b', 1);
    let slot3 = { invite: true, from: 'bp_tr_a' };
    const S5 = phone();
    playJoin(S5, parsed(ws5), { set: (v) => { slot3 = v; } });
    check('5j a live invite card comes back after the clear (it was dropped at every reconnect)', !!slot3 && slot3.invite === true && slot3.from === 'bp_tr_a', slot3);
    stopTick(room);
  }
  /* the pending duel and the leave's timeout still work */
  {
    const S = phone();
    P.enterPendingDuel(S, 'bp_rj_a', 'A', 0, 1000);
    check('5k a duel accepted after the rejoin is pending as before, and dropped unsettled', !!S._inDuel.settleBy && P.dropUnsettledDuel(S, 1000 + P.DUEL_PENDING.SETTLE_MS + 1) && !S._inDuel);
    let pending = null, ended = 0;
    const S2 = { _realtimeStatus: 'connected', _t2Live: 't9' };
    const sent = [];
    T.t2Leave(S2, (e, p) => sent.push([e, p]), () => ended++, { setTimer: (fn) => { pending = fn; return 1; }, clearTimer: () => { pending = null; } });
    check('5l a leave names its trade\'s id (so the worker can answer "gone")', sent.length === 1 && sent[0][0] === 'trade2_cancel' && sent[0][1] && sent[0][1].id === 't9', sent);
    R.rejoinClear(S2, 2, () => {}, () => {});
    if (pending) pending();
    check('5m a leave asked before the rejoin still closes the window when nothing answers', ended === 1, { ended });
    check('5n the worker\'s late "gone" to a leave closed here is not told twice', T.t2Hushed({ _t2QuietUntil: Date.now() + 5000 }, { reason: 'gone' }) === true);
  }
}
/* the wiring in the phone's real files */
{
  const ws = src('src/networking/wsClient.js');
  const a = ws.indexOf("case 'state_sync':"), b = ws.indexOf("case 'zone_loot':", a);
  const body = ws.slice(a, b);
  check('5o wsClient\'s state_sync calls rejoinClear with the worker\'s count, after the trade slot\'s own clear',
    /rejoinClear\(S, S\._serverCaps\.rejoinResend, setTrade2\)/.test(body) && body.indexOf('rejoinClear(') > body.indexOf('t2OnStateSync('));
  check('5p duel_resume is in the direct switch and refuses a relayed copy',
    /case 'duel_resume':\s*\{\s*if \(!msg\.from\)/.test(ws));
  const idx = src('server/src/index.js');
  check('5q duel_resume is PRIVILEGED', /PRIVILEGED_EVENTS[\s\S]*'duel_resume'/.test(idx));
  const ge = src('src/networking/gameEvents.js');
  const ia = ge.indexOf("case 'trade2_invite':"), ib = ge.indexOf("case 'trade2_state':", ia);
  check('5r an invite said again after a rejoin raises no second popup or sound', /if \(payload\.rejoin\) break;/.test(ge.slice(ia, ib)));
  const dev = src('src/ui/panels/DevPanel.jsx');
  check('5s the cap is in CAP_GATES', /const CAP_GATES = \[[\s\S]*'rejoinResend'/.test(dev));
}

/* ── 6. THE REGISTRY ── */
if (Array.isArray(R.REJOIN_SLOTS)) {
  const ws = src('src/networking/wsClient.js');
  const a = ws.indexOf("case 'state_sync':"), b = ws.indexOf("case 'zone_loot':", a);
  const body = ws.slice(a, b);
  const clears = new Set([...body.matchAll(/\b(set[A-Z]\w*)\(null\)|\b(clear[A-Z]\w*|\w*OnStateSync|rejoinClear)\(/g)].map((m) => m[1] || m[2]));
  const named = new Set(R.REJOIN_SLOTS.flatMap((r) => r.clears));
  const loose = [...clears].filter((c) => !named.has(c));
  check('6a every slot the phone clears at state_sync is a row of REJOIN_SLOTS (a clear with no re-send fails here)', clears.size >= 4 && loose.length === 0, { loose, clears: [...clears] });
  const join = src('server/src/join.js');
  const ss = join.indexOf("type: 'state_sync'");
  const rr = src('server/src/rejoinresend.js');
  const rrBody = rr.slice(rr.indexOf('_rejoinResend(playerId, ws) {'), rr.indexOf('_duelResend(playerId, ws) {'));
  for (const row of R.REJOIN_SLOTS) {
    if (!row.resend) { check(`6b ${row.slot}: no re-send, and the row says why`, typeof row.why === 'string' && row.why.length > 10); continue; }
    const onRoom = typeof GameRoom.prototype[row.resend] === 'function';
    const called = join.indexOf('this.' + row.resend + '(', ss) > ss
      || (rrBody.includes('this.' + row.resend + '(') && join.indexOf('this._rejoinResend(', ss) > ss);
    check(`6b ${row.slot}: its re-send ${row.resend} is the worker's and is called after state_sync`, onRoom && called, { onRoom, called });
  }
  check('6c the worker\'s count is the highest slot the phone clears on it', REJOIN.COUNT === Math.max(...R.REJOIN_SLOTS.map((r) => r.since)));
  /* v2.3.4415: the held pose left "not yet" for its row (renderer-life.test §4) */
  check('6d the held pose is a row now, off the "not yet" list', Array.isArray(R.REJOIN_NOT_YET) && !R.REJOIN_NOT_YET.some((s) => /pose/.test(s)) && R.REJOIN_SLOTS.some((r) => r.slot === 'pose'));
  check('6e rejoinCount reads the count', R.rejoinCount({ rejoinResend: 2 }) === 2 && R.rejoinCount({}) === 0 && R.rejoinCount(null) === 0 && R.rejoinCount({ rejoinResend: 'x' }) === 0);
}

/* ── 7. no storage write ── */
{
  const writes = async (flags) => {
    const { room, st, wsA } = await duelPair(1, 0);
    await send(room, wsA, 'trade2_open', { target: 'bp_rj_b' });
    await join(room, 'bp_rj_b', 1);   /* warm: the first rejoin's own saves */
    room._liveFlags = flags;
    const p0 = st.puts();
    const ws = await join(room, 'bp_rj_b', 1);
    const n = st.puts() - p0;
    stopTick(room);
    return { n, resent: typesOf(ws).includes('duel_resume') };
  };
  const on = await writes({}), off = await writes({ rejoinresend: false });
  check('7 a rejoin that re-sends a duel and an invite writes no more than one that does not', on.resent && !off.resent && on.n === off.n, { on, off });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
