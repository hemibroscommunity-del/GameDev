/* ═══ v2.3.4362: THE TRADE WINDOW NEVER OUTLIVES ITS SERVER ═══
 *
 * The state-machine sweep (2026-11-03, V8b P2-1): with a trade window open,
 * the phone dropped its connection or the worker updated.  The window stayed
 * up; its ✕, Cancel and Leave Trade only sent trade2_cancel and waited, and the
 * worker, with no trade on file, answers nothing (trade2.js
 * _handleTrade2Cancel).  Until a reload the window could not be closed.  And a
 * 'busy' refusal (a second "Open trade" tap) cleared a window showing your own
 * live trade.  Phone side only (src/game/tradeSlot.js):
 *   1. the rules: a join clears the slot, its receipt watcher and a pending
 *      leave; a leave closes here with no answer in 3 s or a dead socket, and
 *      the worker's answer first stops that; 'busy' keeps a live window;
 *   2. the real trade2_invite / trade2_state cases, cut from gameEvents.js and
 *      run here with stubs;
 *   3. the worker side this leans on, read: a closed socket cancels the trade,
 *      a second login keeps it and every broadcast re-sends the full state;
 *   4. the wiring: wsClient's state_sync and its local end, the panel's three
 *      leave buttons.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* loaded so a missing module is FAIL lines, not a crash */
let T = {};
try { T = await import('../../src/game/tradeSlot.js'); } catch (e) { T = {}; }
const has = (n) => typeof T[n] === 'function';

/* a fake clock: timers run when the test says */
function clock() {
  let t = Date.now(), seq = 0;   /* the real handler reads Date.now() */
  const timers = new Map();
  return {
    now: () => t,
    setTimer: (fn, ms) => { const id = ++seq; timers.set(id, { fn, at: t + ms }); return id; },
    clearTimer: (id) => { timers.delete(id); },
    advance(ms) {
      t += ms;
      for (const [id, x] of [...timers]) if (x.at <= t) { timers.delete(id); x.fn(); }
    },
    pending: () => timers.size,
  };
}

/* ── 1. the rules ── */
check('1a the rules file exports its five rules',
  ['t2LinkUp', 't2Leave', 't2LeaveDrop', 't2IgnoreBusy', 't2OnStateSync'].every(has),
  Object.keys(T));
if (['t2LinkUp', 't2Leave', 't2LeaveDrop', 't2IgnoreBusy', 't2OnStateSync', 't2Hushed'].every(has)) {
  {
    const c = clock(); const sent = []; let ended = 0;
    const S = { _realtimeStatus: 'connected' };
    T.t2Leave(S, (e) => sent.push(e), () => ended++, c);
    check('1b a leave on a live socket sends trade2_cancel and waits', sent.join() === 'trade2_cancel' && ended === 0 && c.pending() === 1, { sent, ended });
    c.advance(2900);
    check('1c ...still waiting at 2.9 s (an honest round trip is answered well inside)', ended === 0);
    c.advance(200);
    check('1d ...no answer by 3 s: the window closes here (the bug: it waited forever)', ended === 1 && !S._t2Leave, { ended });
  }
  {
    const c = clock(); let ended = 0;
    const S = { _realtimeStatus: 'connected' };
    T.t2Leave(S, () => {}, () => ended++, c);
    T.t2LeaveDrop(S, c.clearTimer);   /* the worker's answer came (gameEvents) */
    c.advance(10000);
    check('1e the worker answers first: the wait stops, nothing closes twice', ended === 0 && c.pending() === 0, { ended });
  }
  for (const status of ['disconnected', 'frozen', 'linger', undefined]) {
    const c = clock(); const sent = []; let ended = 0;
    const S = { _realtimeStatus: status };
    T.t2Leave(S, (e) => sent.push(e), () => ended++, c);
    check('1f the socket down (' + status + '): the window closes at once', ended === 1 && c.pending() === 0, { ended });
  }
  {
    const c = clock(); let ended = 0;
    const S = { _realtimeStatus: 'connected' };
    T.t2Leave(S, () => {}, () => ended++, c);
    T.t2Leave(S, () => {}, () => ended++, c);   /* a second tap */
    c.advance(5000);
    check('1g two taps on Leave Trade: one wait, one close', ended === 1, { ended });
    check('1h the worker\'s late "declined" after a close here is hushed once, then words come again',
      T.t2Hushed(S, { state: 'cancelled', reason: 'declined' }, c.now()) === true
      && T.t2Hushed(S, { state: 'cancelled', reason: 'declined' }, c.now()) === false);
    T.t2Leave(S, () => {}, () => ended++, c); c.advance(5000);
    check('1i ...a reason that is not the answer to a leave is never hushed, and does not use it up',
      T.t2Hushed(S, { state: 'cancelled', reason: 'expired' }, c.now()) === false
      && T.t2Hushed(S, { state: 'cancelled', reason: 'declined' }, c.now()) === true);
    T.t2Leave(S, () => {}, () => ended++, c); c.advance(5000); c.advance(20000);
    check('1j ...and only within 15 s', T.t2Hushed(S, { state: 'cancelled', reason: 'declined' }, c.now()) === false);
  }
  {
    const busy = { state: 'cancelled', reason: 'busy' };
    check('1k "busy" while the window shows your own live trade: kept', T.t2IgnoreBusy({ _t2Live: 't1' }, busy) === true);
    check('1l "busy" with no live trade showing (they are trading): the old answer', T.t2IgnoreBusy({ _t2Live: null }, busy) === false);
    check('1m any other cancel of a live trade still ends it',
      T.t2IgnoreBusy({ _t2Live: 't1' }, { state: 'cancelled', reason: 'declined' }) === false
      && T.t2IgnoreBusy({ _t2Live: 't1' }, { state: 'cancelled', reason: 'disconnected' }) === false);
  }
  {
    /* the ordinary reconnect: the worker evicts the old socket without
       webSocketClose and keeps the trade (join.js), so the window stays */
    const c = clock(); const live = { state: 'open', id: 't1' }; let slot = live;
    const S = { _realtimeStatus: 'connected', _t2Live: 't1' };
    T.t2OnStateSync(S, (v) => { slot = v; }, () => {});
    check('1n a join while the window shows an open trade leaves it up (the worker may still hold it)',
      slot === live && S._t2Live === 't1', { slot, live: S._t2Live });
    let ended = 0;
    T.t2Leave(S, () => {}, () => { ended++; slot = null; }, c);
    c.advance(3100);
    check('1o ...and it is still closable: a leave with no answer closes it in 3 s', ended === 1 && slot === null, { ended });
  }
  {
    let slot = { state: 'done', receipt: {} }; let ivCleared = null;
    const S = { _t2Live: null, _t2DoneWatch: 77, _t2QuietUntil: 5 };
    T.t2OnStateSync(S, (v) => { slot = v; }, (id) => { ivCleared = id; });
    check('1p a join clears what no worker re-sends (a receipt, an invite card, a waiting drawer) and the receipt watcher',
      slot === null && ivCleared === 77 && S._t2DoneWatch === null && !S._t2QuietUntil, { slot, ivCleared });
    const c = clock(); let ended = 0;
    const S2 = { _realtimeStatus: 'connected', _t2Live: 't2' };
    T.t2Leave(S2, () => {}, () => ended++, c);
    T.t2OnStateSync(S2, () => {}, () => {});
    c.advance(3100);
    check('1q a leave asked for before the join still closes the window if nothing answers', ended === 1, { ended });
  }
}

/* ── 2. the real handler: gameEvents.js's trade2_invite and trade2_state ── */
const ge = src('src/networking/gameEvents.js');
const a = ge.indexOf("case 'trade2_invite':");
const b = ge.indexOf("case 'party_invited':", a);
check('2a the trade cases are found in gameEvents.js', a > 0 && b > a);
function makeHandler(c) {
  const said = [];
  const ctx = {
    console, Date, setInterval, clearInterval, clearTimeout, said,
    cue: (n) => said.push('cue:' + n),
    pushDmgPopup: (S, x, y, text) => said.push('popup:' + text),
    isBlockedId: () => false,
    _toConsumableArray: (x) => [...x],
    _objectSpread: Object.assign,
    /* the handler stops the wait with its default clearTimeout: here, the fake clock's */
    t2LeaveDrop: T.t2LeaveDrop ? (S) => T.t2LeaveDrop(S, c.clearTimer) : (() => {}),
    t2IgnoreBusy: T.t2IgnoreBusy || (() => false),
    t2Hushed: T.t2Hushed || (() => false),
  };
  vm.createContext(ctx);
  vm.runInContext('function run(type, payload, S, setTrade2, setChatLog, setRpgState) { switch (type) {'
    + ge.slice(a, b) + '} }', ctx);
  return ctx;
}
if (a > 0 && b > a) {
  const c = clock();
  const h = makeHandler(c);
  const S = { myId: 'me', player: { x: 0, y: 0 }, chatLog: [], _realtimeStatus: 'connected' };
  let slot = null;
  const set = (v) => { slot = v; };
  const run = (type, p) => h.run(type, p, S, set, () => {}, () => {});
  const live = { state: 'open', id: 'tA', a: 'me', b: 'you', offers: { me: {}, you: {} }, confirmed: {} };
  run('trade2_state', live);
  check('2b an open trade draws the window and marks it live', slot === live && !!S._t2Live, { slot, live: S._t2Live });
  h.said.length = 0;
  run('trade2_state', { state: 'cancelled', reason: 'busy' });
  check('2c a "busy" refusal (a second "Open trade" tap) keeps your live window (the bug: it cleared it)', slot === live, slot);
  check('2d ...and says nothing ("They are already trading" was wrong: you are)', h.said.length === 0, h.said);
  run('trade2_state', { state: 'cancelled', reason: 'declined' });
  check('2e the partner leaving still ends it, with its words', slot === null && h.said.includes('popup:Trade declined') && !S._t2Live, h.said);
  h.said.length = 0;
  run('trade2_state', { state: 'cancelled', reason: 'busy' });
  check('2f "busy" with no live window: told as before', h.said.includes('popup:They are already trading'), h.said);

  /* a leave the worker never answers, closed through the real handler */
  if (has('t2Leave')) {
    run('trade2_state', live);
    h.said.length = 0;
    T.t2Leave(S, () => {}, () => run('trade2_state', { state: 'cancelled', reason: 'gone' }), c);
    c.advance(3100);
    check('2g no answer to Leave Trade: the window closes with "The trade was cancelled"',
      slot === null && h.said.includes('popup:The trade was cancelled') && S.chatLog.some((l) => /The trade was cancelled/.test(l.text)), h.said);
    h.said.length = 0;
    run('trade2_state', { state: 'cancelled', reason: 'declined' });
    check('2h ...the worker\'s late "declined" is not told a second time', h.said.length === 0 && slot === null, h.said);
    run('trade2_state', live);
    T.t2Leave(S, () => {}, () => run('trade2_state', { state: 'cancelled', reason: 'gone' }), c);
    h.said.length = 0;
    run('trade2_state', { state: 'cancelled', reason: 'declined' });   /* answered in time */
    c.advance(5000);
    check('2i the worker answers in time: told once, by the worker, and the timer is stopped',
      h.said.filter((x) => x.startsWith('popup:')).join() === 'popup:Trade declined' && c.pending() === 0, h.said);
    run('trade2_state', live);
    T.t2Leave(S, () => {}, () => run('trade2_state', { state: 'cancelled', reason: 'gone' }), c);
    run('trade2_invite', { from: 'x', fromName: 'X' });
    check('2j an invite arriving also stops the wait (the worker spoke)', c.pending() === 0 && slot && slot.invite === true && !S._t2Live, slot);
  }
}

/* ── 3. the worker side this leans on (read, never changed here) ── */
const ix = src('server/src/index.js'), t2 = src('server/src/trade2.js'), jn = src('server/src/join.js');
/* v2.3.4830: the close's duties live in the session door's table (leave.js) */
const lv = src('server/src/leave.js');
const { LEAVE_WAYS } = await import('../src/leave.js');
check('3a a socket the worker sees close cancels its trade (so a cleared window hides nothing)',
  LEAVE_WAYS.close.trade === true && /if \(d\.trade\) this\._trade2OnDisconnect\(session\.id\)/.test(lv)
  && /webSocketClose\(ws\) \{ return this\._playerLeaves\(ws, 'close'\)/.test(ix)
  && /_trade2OnDisconnect\(playerId\)\s*\{[^}]*_t2Cancel\(s, 'disconnected'\)/.test(t2));
check('3b a second login evicts the old socket without the trade\'s cancel: that trade lives on',
  !LEAVE_WAYS.takeover.trade && /this\._playerLeaves\(oldWs, 'takeover', \{ kept: !!_body \}\);\s*try \{ oldWs\.close\(1000, 'superseded by reconnect'\)/.test(jn));
check('3c ...and every broadcast sends the full state to both, so the partner\'s next action draws it again',
  /_t2Broadcast\(s, extra\) \{\s*const wire = Object\.assign\(this\._t2Wire\(s\), extra \|\| \{\}\);\s*this\._t2Send\(s\.a, 'trade2_state', wire\);\s*this\._t2Send\(s\.b, 'trade2_state', wire\);/.test(t2));
/* v2.3.4382: the worker now answers a leave that names a trade it no longer
   holds ('gone'; rejoin-resend.test §3), and an invite's Decline (no id) as
   before -- an older worker answers nothing, so the phone's wait stays */
check('3d ...and the worker answers a cancel with no trade on file only when the leave names the trade (why the phone still waits for an older one)',
  /_handleTrade2Cancel\(session, payload\) \{\s*const s = this\._t2SessionFor\(session\.id\);\s*if \(s\) this\._t2Cancel[\s\S]{0,600}else if \(payload && typeof payload\.id === 'string'/.test(t2));

/* ── 4. the wiring ── */
const ws = src('src/networking/wsClient.js');
const sync = ws.indexOf("setParty(null); S._party = null;");
check('4a wsClient\'s state_sync runs the trade window\'s join rule beside the party',
  sync > 0 && /t2OnStateSync\(S, setTrade2\)/.test(ws.slice(sync, sync + 1200)));
check('4b ...t2OnStateSync imported from game/tradeSlot.js', /import \{[^}]*\bt2OnStateSync\b[^}]*\} from '@\/game\/tradeSlot\.js';/.test(ws));
check('4c wsClient gives the panel its local end, through the real handler',
  /S\._t2LocalEnd = function \(reason\) \{\s*processGameEvent\('trade2_state', \{ state: 'cancelled', reason: reason \|\| 'gone' \}, S, _gameEventDeps\);/.test(ws));
const pn = src('src/ui/panels/TradeWindowPanel.jsx');
check('4d the panel: no Leave Trade sends trade2_cancel alone any more',
  !/onClick=\{\(\) => send\('trade2_cancel'\)\}/.test(pn), (pn.match(/onClick=\{\(\) => send\('trade2_cancel'\)\}/g) || []).length);
check('4e ...both Leave Trade buttons and the ✕/Cancel guard go through t2Leave',
  (pn.match(/onClick=\{leave /g) || []).length === 2 && /else leave\(\);/.test(pn) && /const leave = \(\) => t2Leave\(S, send,/.test(pn));
check('4f gameEvents imports its three rules from game/tradeSlot.js',
  /import \{ t2LeaveDrop, t2IgnoreBusy, t2Hushed \} from '@\/game\/tradeSlot\.js';/.test(ge));

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
