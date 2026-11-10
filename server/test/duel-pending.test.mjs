/* ═══ v2.3.4361: THE PHANTOM DUEL (the state-machine sweep's V6) ═══
 *
 * Tapping Accept on a duel card marked the phone "in a duel" before the
 * worker agreed, and only `duel_end` cleared it: a refused or silently
 * dropped accept left a duel that did not exist, and in No man's land every
 * melee swing of it was an untargeted player attack (a bystander hit, a red
 * skull).  Now (src/game/duelPending.js):
 *   1. the worker's settled echo of an accept reaches the ACCEPTER's own
 *      phone, on protocol v1 and v2 -- what the timeout below waits for;
 *   2. the Accept tap (DuelRequestPanel's real onClick, run here) still shows
 *      the duel at once, PENDING; its own settled echo (gameEvents' real
 *      duel_accept case) makes it real;
 *   3. unsettled after DUEL_PENDING.SETTLE_MS, it is dropped (the duel, its
 *      lock), and the frame update says so (targeting.js);
 *   4. a duel_decline from that challenger (the worker's declineBoth) drops
 *      it at once; a settled duel is never ended by a decline;
 *   5. a duel live when a second card was accepted comes back if that accept
 *      is refused; the challenger's side and an arena duel are unchanged;
 *   6. a duel's melee swing names its foe as `target` (monsterCombat.js); the
 *      worker already lands a claim that names one on that player only
 *      (combat.js _resolvePvPAttack `onlyTarget`, pinned for shots in
 *      duel.test), never on a bystander in the cone.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { GameRoom } from '../src/index.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
/* a missing module is FAIL lines, not a crash */
let P = {};
try { P = await import('../../src/game/duelPending.js'); } catch (e) { P = {}; }
const L = await import('../../src/game/duelLock.js');
const has = (f) => typeof P[f] === 'function';
check('0 duelPending.js exports its rules',
  ['enterPendingDuel', 'settleOwnAccept', 'dropUnsettledDuel', 'declineDropsDuel', 'duelSwingTarget'].every(has) && P.DUEL_PENDING && P.DUEL_PENDING.SETTLE_MS > 0,
  Object.keys(P));

/* ── 1. the accepter's own settled echo, v1 and v2 ── */
function mockState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); },
      list: async (o) => { const m = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) m.set(k, v); return m; },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const fakeWs = () => ({ sent: [], send(s) { this.sent.push(s); }, close() {} });
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });
async function echoReachesAccepter(pvA, pvB) {
  const room = new GameRoom(mockState(), mockEnv);
  let tickFn = null;
  const realSI = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return realSI(fn, ms); };
  room.startTickLoop();
  globalThis.setInterval = realSI;
  const join = async (id, pv) => {
    const ws = fakeWs();
    room.sessions.set(ws, baseSession());
    const m = { type: 'join', id, name: id, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } };
    if (pv === 2) m.protocolVersion = 2;
    await room.webSocketMessage(ws, JSON.stringify(m));
    return ws;
  };
  const wsA = await join('bp_pend_a', pvA);   /* the challenger */
  const wsB = await join('bp_pend_b', pvB);   /* the accepter */
  const send = (ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));   /* the wire shape wsClient's channel.send puts a broadcast in (relay.test) */
  await send(wsA, 'duel_request', { target: 'bp_pend_b', from: 'bp_pend_a', fromName: 'A' });
  tickFn();
  const from = wsB.sent.length;
  await send(wsB, 'duel_accept', { target: 'bp_pend_a', from: 'bp_pend_b', fromName: 'B', wager: 0 });
  tickFn();
  const evs = [];
  for (let i = from; i < wsB.sent.length; i++) {
    const s = wsB.sent[i];
    if (!s.startsWith('{"type":"tick"')) continue;
    const d = JSON.parse(s);
    if (Array.isArray(d.events)) evs.push(...d.events);
  }
  const echo = evs.find((e) => e.type === 'duel_accept');
  if (room.tickInterval) clearInterval(room.tickInterval);
  return { echo, live: !!room._duelFor('bp_pend_b') };
}
for (const [pa, pb] of [[1, 1], [2, 2], [2, 1], [1, 2]]) {
  const r = await echoReachesAccepter(pa, pb);
  const p = r.echo && (r.echo.payload || r.echo);
  check(`1 the accepter (v${pb}, challenger v${pa}) hears its OWN settled accept in its tick`,
    r.live && !!p && p.settled === true && (r.echo.from === 'bp_pend_b') && p.target === 'bp_pend_a', { live: r.live, echo: r.echo });
}

/* ── the phone's real code, cut from src and run with stubs ── */
function cutBraces(text, startIdx) {
  const open = text.indexOf('{', startIdx);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) return text.slice(open + 1, i); }
  }
  throw new Error('unbalanced');
}
const GE = src('src/networking/gameEvents.js');
const geFrom = GE.indexOf("case 'duel_accept':");
const geTo = GE.indexOf("case 'pvp_threat':", geFrom);
const duelCases = GE.slice(geFrom, geTo);
const PANEL = src('src/ui/panels/DuelRequestPanel.jsx');
const accIdx = PANEL.indexOf("event: 'duel_accept'");
const onClickIdx = PANEL.lastIndexOf('onClick: function onClick()', accIdx);
const acceptBody = cutBraces(PANEL, onClickIdx);

const popups = [];
const ctx = vm.createContext({
  lockOntoDuelOpponent: L.lockOntoDuelOpponent,
  enterPendingDuel: P.enterPendingDuel, settleOwnAccept: P.settleOwnAccept, declineDropsDuel: P.declineDropsDuel,
  pushDmgPopup: (S, x, y, text) => popups.push(text),
  cue: () => {}, dropShield: () => {}, BT_AUDIO: { _now: () => 0 },
  String, Date,
});
const onEvent = vm.runInContext(`(function (type, payload, S) { switch (type) { ${duelCases} } })`, ctx);
const tapAccept = vm.runInContext(`(function (stateRef, duelRequest, setDuelRequest) { ${acceptBody} })`, ctx);

const ME = 'bp_me', FOE = 'bp_foe', OTHER = 'bp_other';
function phone() {
  const sent = [];
  return {
    myId: ME, myName: 'Me', player: { x: 0, y: 0 }, sent,
    channel: { send: (m) => sent.push(m) },
    others: { [FOE]: { id: FOE, x: 10, y: 0 }, [OTHER]: { id: OTHER, x: 20, y: 0 } },
    lockedTarget: null, _inDuel: null, _activeDuel: null,
  };
}
const accept = (S, fromId = FOE) => tapAccept({ current: S }, { fromId, fromName: 'Foe', wager: 0 }, () => {});
const ownEcho = (fromId = FOE) => ({ from: ME, id: ME, target: fromId, fromName: 'Me', wager: 0, settled: true });
const frame = (S, now) => (has('dropUnsettledDuel') ? P.dropUnsettledDuel(S, now) : false);
const SETTLE = (P.DUEL_PENDING && P.DUEL_PENDING.SETTLE_MS) || 8000;

/* ── 2. the tap still shows the duel at once; its echo makes it real ── */
{
  popups.length = 0;
  const S = phone();
  const t0 = Date.now();
  accept(S);
  check('2a the tap sends the accept and shows the duel at once (DUEL!, the lock)',
    S.sent.length === 1 && S.sent[0].event === 'duel_accept' && S._inDuel && S._inDuel.opponent === FOE
    && S.lockedTarget && S.lockedTarget.id === FOE && popups.includes('DUEL!'), { inDuel: S._inDuel, popups });
  check('2b ...and it is PENDING the worker', !!(S._inDuel && S._inDuel.settleBy), S._inDuel);
  onEvent('duel_accept', ownEcho(), S);
  check('2c its own settled echo settles it (no clock left)', !!S._inDuel && !S._inDuel.settleBy && S._inDuel.opponent === FOE, S._inDuel);
  frame(S, t0 + SETTLE * 3);
  check('2d a settled duel outlives the clock', !!S._inDuel && S._inDuel.opponent === FOE && S.lockedTarget && S.lockedTarget.id === FOE);
  onEvent('duel_decline', { from: FOE, id: FOE, target: ME }, S);
  check('4c a settled duel is never ended by a decline', !!S._inDuel && S._inDuel.opponent === FOE);
  check('2e the echo raised no second "DUEL STARTED!" on the accepter', !popups.includes('DUEL STARTED!'), popups);
}

/* ── 3. no echo: dropped after the clock ── */
{
  popups.length = 0;
  const S = phone();
  const t0 = Date.now();
  accept(S);
  frame(S, t0 + SETTLE - 1000);
  check('3a still shown while the echo may yet come', !!S._inDuel && S._inDuel.opponent === FOE);
  const dropped = frame(S, t0 + SETTLE + 50);
  check('3b the worker never settled it: dropped after the clock (the phantom duel)',
    dropped === true && S._inDuel === null && S.lockedTarget === null, { inDuel: S._inDuel, lock: S.lockedTarget });
  const TG = src('src/game/targeting.js');
  check('3c the frame update drops it and says so (targeting.js updateTargeting)',
    /dropUnsettledDuel\(S, Date\.now\(\)\)/.test(TG) && /Duel did not start/.test(TG));
  /* an echo for some OTHER accept never settles this one */
  const S2 = phone();
  accept(S2);
  onEvent('duel_accept', ownEcho(OTHER), S2);
  onEvent('duel_accept', { ...ownEcho(), settled: undefined }, S2);
  check('3d an unsettled echo, or one naming another challenger, settles nothing', !!(S2._inDuel && S2._inDuel.settleBy));
}

/* ── 4. the worker's declineBoth drops it at once ── */
{
  popups.length = 0;
  const S = phone();
  accept(S);
  onEvent('duel_decline', { from: FOE, id: FOE, target: ME }, S);
  check('4a a decline from that challenger drops the pending duel and its lock',
    S._inDuel === null && S.lockedTarget === null && popups.includes('Duel declined'), { inDuel: S._inDuel, popups });
  const S2 = phone();
  accept(S2);
  onEvent('duel_decline', { from: OTHER, id: OTHER, target: ME }, S2);
  check('4b a decline from someone else leaves it', !!S2._inDuel && S2._inDuel.opponent === FOE);
}

/* ── 5. a live duel kept; the challenger and the arena unchanged ── */
{
  const S = phone();
  onEvent('duel_accept', { from: OTHER, id: OTHER, target: ME, fromName: 'Other', settled: true }, S);
  check('5a the challenger enters on the accept naming it, settled at once (as before)',
    S._inDuel && S._inDuel.opponent === OTHER && !S._inDuel.settleBy && S._activeDuel && S._activeDuel.partnerId === OTHER && S.lockedTarget.id === OTHER);
  const t0 = Date.now();
  accept(S);   /* a second card, accepted mid-duel: the worker drops it (one duel at a time) */
  check('5b a second card accepted mid-duel points the duel at its challenger, pending', S._inDuel.opponent === FOE && !!S._inDuel.settleBy);
  frame(S, t0 + SETTLE + 50);
  check('5c ...and when the worker drops it, the live duel comes back with its lock',
    S._inDuel && S._inDuel.opponent === OTHER && !S._inDuel.settleBy && S.lockedTarget && S.lockedTarget.id === OTHER
    && S._activeDuel && S._activeDuel.partnerId === OTHER, { inDuel: S._inDuel, lock: S.lockedTarget });
  const A = phone();
  A._inDuel = { opponent: FOE, opponentName: 'Foe', wager: 0, startTime: 0, arena: 'm1' };
  frame(A, Date.now() + SETTLE * 10);
  check('5d an arena duel has no clock: never dropped', A._inDuel && A._inDuel.arena === 'm1');
}

/* ── 6. a duel's swing names its foe ── */
{
  const S = phone();
  check('6a no duel: the swing names nobody (free-fire keeps its cone)', has('duelSwingTarget') && P.duelSwingTarget(S) === null);
  S._inDuel = { opponent: FOE };
  check('6b in a duel: the swing names the foe', has('duelSwingTarget') && P.duelSwingTarget(S) === FOE);
  const MC = src('src/game/monsterCombat.js');
  const at = MC.indexOf("event: 'player_attack'");
  const body = cutBraces(MC, MC.indexOf('payload:', at));
  check('6c monsterCombat\'s melee claim sends it as `target`', /target:\s*duelSwingTarget\(S\)/.test(body) && /kind: 'melee'/.test(body));
}
console.log(`\nduel-pending: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
