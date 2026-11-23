/* ═══ v2.3.3496: BACK INTO THE GAME AFTER LEAVING IT, ON A PHONE ═══
 *
 * The owner, after a playtest: "input dead after returning (needs tab
 * switch)" and "Sound only returns via OPEN/weapon-swap buttons".  An iPhone
 * cannot be driven from here, so each way the code could be caught out by a
 * return is made to happen, on an upright touch phone in the Wheel's BroTown,
 * and the game is held to getting out of it by itself:
 *
 *   1. a finger on the stick whose lift the page never sees (the app
 *      switched mid-press): the page going away lets go of it -- the bro
 *      stops walking;
 *   2. a finger on the attack button whose lift the page never sees: the
 *      next press, with that finger no longer on the screen, takes the button
 *      (it was swallowed, every press, until a tab switch); a finger really
 *      still down keeps it;
 *   3. the sound's session reclaim is not spent on a press (pointerdown,
 *      touchstart: not a moment an iPhone lets sound start), and is done on
 *      the touchend -- a new context;
 *   4. after a return, the first tap the browser lets sound start from kicks
 *      the context (resume + a silent sound), once armed and not after;
 *   5. a page frozen for seconds with no visibility event at all (iOS does
 *      not always send one): the sound's kick is armed, and the socket that
 *      survived the freeze is rejoined for a whole world -- v2.3.6309: unless
 *      the socket CARRIED the gap (the worker's pings from inside it all
 *      came): then no rejoin, nothing was missed (5); `?thawjudge=0` the
 *      old way, a rejoin (5b);
 *   6. a connect that never finishes (a radio not awake yet): retried after
 *      CONNECT_STALL_MS, and the world is back -- it used to hold the bro
 *      still for good, until a tab switch killed the socket;
 *   7. no page errors.
 *
 * The only stand-in is the network for 6: a WebSocket that stays CONNECTING
 * when asked (an init script, a browser API, as harness.mjs allows).
 *
 *   node tools/qa/mp/run.mjs comeback
 */
import * as H from './harness.mjs';
export const lane = 'full';

const PHONE = { width: 390, height: 844 };

/* a WebSocket that, once asked (__qaStallNext), never finishes connecting */
const STALL = () => {
  const Real = window.WebSocket;
  window.__qaSockets = [];
  function Q(url, protos) {
    if (window.__qaStallNext) {
      window.__qaStallNext = false;
      window.__qaStalled = (window.__qaStalled || 0) + 1;
      const fake = { url, readyState: 0, bufferedAmount: 0, protocol: '', extensions: '', binaryType: 'blob',
        send() {}, close() { fake.readyState = 3; fake.closed = true; }, addEventListener() {}, removeEventListener() {} };
      window.__qaSockets.push(fake);
      return fake;
    }
    const ws = protos ? new Real(url, protos) : new Real(url);
    window.__qaSockets.push(ws);
    /* v2.3.6309: a WHOLE world arriving is a state_sync frame (step 5b counts them after a rejoin) */
    ws.addEventListener('message', (ev) => { if (typeof ev.data === 'string' && ev.data.startsWith('{"type":"state_sync"')) window.__qaSyncs = (window.__qaSyncs || 0) + 1; });
    return ws;
  }
  Q.prototype = Real.prototype;
  Q.CONNECTING = 0; Q.OPEN = 1; Q.CLOSING = 2; Q.CLOSED = 3;
  window.WebSocket = Q;
};

const crashKinds = (P) => P.page.evaluate(() => {
  try { return (JSON.parse(localStorage.getItem('bt-crashlog') || '[]') || []).map((e) => e.kind + ':' + String(e.msg).slice(0, 60)); } catch (e) { return []; }
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Comeback', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel',
    init: `(${STALL.toString()})()` });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await H.enterWorld(P);
  const inWheel = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading, h: !!S._netHold }), (v) => v.z === 'wheel' && !v.l && !v.h,
    { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
  const myId = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', myId);
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
  const probes = await P.page.evaluate(() => ({ release: typeof window.__btReleaseTouches === 'function', finger: typeof window.__btButtonFinger === 'function',
    kick: !!(window.BT_AUDIO && window.BT_AUDIO.gestureKick), sockets: (window.__qaSockets || []).length }));
  rec.ok('setup: in the Wheel, the probes there, the game\'s socket made through the page\'s WebSocket', !!inWheel && probes.release && probes.finger && probes.kick && probes.sockets >= 1, { inWheel, probes });
  const cdp = await P.page.context().newCDPSession(P.page);
  try {
    /* ── 1. a finger on the stick that never lifts, then the page goes away ── */
    const L = await P.page.evaluate(() => {
      const r = document.querySelector('[data-joyzone="L"]').getBoundingClientRect();
      return { x: Math.round(r.left + r.width * 0.45), y: Math.round(r.top + r.height * 0.7) };
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: L.x, y: L.y, id: 1 }] });
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: L.x + i * 9, y: L.y, id: 1 }] });
      await P.page.waitForTimeout(60);
    }
    const walking = await H.readState(P, (S) => ({ sx: S.stickX, held: !!S._lJoyHeld }));
    const x0 = await H.readState(P, (S) => S.player.x);
    /* v2.3.5841: walking until he HAS walked 20 px, up to 8 s, not for 0.6 s of
       the wall clock: the bro moves by frames, and this box draws a few a second
       (TRAPS §200) -- 15 px in 0.6 s on main, run after run, with the stick full
       on (sx 1).  The check is that the page let go of the stick, not his pace. */
    const x1 = await H.waitFor(P, (S) => S.player.x, (x) => x - x0 > 20, { timeout: 8000, label: 'walking 20 px' })
      .catch(() => H.readState(P, (S) => S.player.x));
    /* no touchEnd: the app switched mid-press */
    await P.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await P.page.waitForTimeout(300);
    const after = await P.page.evaluate(() => {
      const S = window._gameState.current;
      return { sx: S.stickX, sy: S.stickY, held: !!S._lJoyHeld, rel: window.__btTouchRelease, stale: S._staleTouches || 0 };
    });
    const xa = await H.readState(P, (S) => S.player.x);
    await P.page.waitForTimeout(700);
    const xb = await H.readState(P, (S) => S.player.x);
    rec.ok(`1. a held stick (walking: ${Math.round(x1 - x0)} px) is let go of when the page goes away: no stick, no walking (${Math.round(xb - xa)} px after), "${after.rel && after.rel.held.join('+')}" released`,
      walking.sx > 0.2 && x1 - x0 > 20 && after.sx === 0 && after.sy === 0 && !after.held && Math.abs(xb - xa) < 3
        && !!after.rel && after.rel.held.includes('stick') && after.stale >= 1, { walking, after });
    /* the finger's own end, late, changes nothing */
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    /* ── 2. a finger on the attack button that never lifts ── */
    const press = (id, others) => P.page.evaluate(({ id, others }) => {
      const el = document.querySelector('[data-rbutton="1"]');
      const r = el.getBoundingClientRect();
      const mk = (i) => new Touch({ identifier: i, target: el, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
      const t = mk(id);
      const all = [t, ...others.map(mk)];
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: all, targetTouches: all, changedTouches: [t] }));
      return window.__btButtonFinger();
    }, { id, others });
    const stale0 = await H.readState(P, (S) => S._staleTouches || 0);
    const f1 = await press(5, []);
    /* no touchend for 5: the shade pulled mid-press.  Now a new finger, with 5 no longer on the screen */
    const f2 = await press(6, []);
    const stale1 = await H.readState(P, (S) => S._staleTouches || 0);
    /* and a third while 6 is really still down: 6 keeps the button */
    const f3 = await press(7, [6]);
    const stale2 = await H.readState(P, (S) => S._staleTouches || 0);
    rec.ok(`2. the button held by a finger that never lifted (${f1}) goes to the next press once that finger is off the screen (${f2}); a finger still down keeps it (${f3})`,
      f1 === 5 && f2 === 6 && f3 === 6 && stale1 === stale0 + 1 && stale2 === stale1, { f1, f2, f3, stale0, stale1, stale2 });
    await P.page.evaluate(() => { const el = document.querySelector('[data-rbutton="1"]'); const t = new Touch({ identifier: 6, target: el, clientX: 0, clientY: 0 }); window.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t] })); });
    await P.page.waitForTimeout(300);

    /* ── 3. the sound's reclaim is not spent on a press ── */
    const reclaim = await P.page.evaluate(async () => {
      const A = window.BT_AUDIO;
      if (!A.ctx) { try { A.unlock(); } catch (e) { /* reported */ } }
      const ctx0 = A.ctx;
      A._needsSessionReclaim = true;
      document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      document.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
      const afterPress = { armed: !!A._needsSessionReclaim, same: A.ctx === ctx0 };
      document.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
      return { ctx0: !!ctx0, afterPress, afterEnd: { armed: !!A._needsSessionReclaim, fresh: A.ctx !== ctx0 && !!A.ctx } };
    });
    rec.ok(`3. a return's sound reclaim waits through the press (still armed: ${reclaim.afterPress.armed}) and is done on the touchend (a new context: ${reclaim.afterEnd.fresh})`,
      reclaim.ctx0 && reclaim.afterPress.armed && reclaim.afterPress.same && !reclaim.afterEnd.armed && reclaim.afterEnd.fresh, reclaim);

    /* ── 4. the kick, once armed ── */
    await P.page.waitForTimeout(1500);
    const kick = await P.page.evaluate(async () => {
      const A = window.BT_AUDIO;
      if (A.ctx && A.ctx.state !== 'running') { try { await A.ctx.resume(); } catch (e) { /* reported */ } }
      A._kickUntil = 0;
      const k0 = A._kicks || 0;
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const quiet = (A._kicks || 0) - k0;
      A.armKick('test');
      document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      const onPress = (A._kicks || 0) - k0 - quiet;
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return { state: A.ctx && A.ctx.state, quiet, onPress, armed: (A._kicks || 0) - k0 - quiet - onPress };
    });
    const kinds4 = await crashKinds(P);
    rec.ok(`4. after a return the first tap that may start sound kicks the context (${kick.armed}), a press does not (${kick.onPress}), and with nothing to mend a tap costs nothing (${kick.quiet}); the kick is in the crash log`,
      kick.state === 'running' && kick.quiet === 0 && kick.onPress === 0 && kick.armed === 1 && kinds4.some((k) => /^audio-kick:first tap after test/.test(k)), { kick, kinds4 });

    /* ── 5. frozen for seconds, no visibility event at all ── */
    const before5 = await P.page.evaluate(() => ({ sockets: window.__qaSockets.length, kick: window.BT_AUDIO._kickUntil || 0 }));
    /* v2.3.5841: the thaw is waited for until the kick is armed AGAIN (newer than
       before5's): check 4's return left one armed for KICK_ARMED_MS (20 s), so
       `kick > 0` was true at once, read before GameApp's 1 s beat had seen the
       gap and re-armed it (red by run on main: thaw.kick === before5.kick) */
    /* v2.3.6309 (card RR PR 4; the planning session's yes): a gap the socket
       CARRIED is not a freeze.  This hold is the page's own (a busy loop);
       the worker went on sending all through it, so its pings from inside
       the gap all arrive, handled late (game/thawCarried.js): nothing was
       missed, and the forced rejoin is skipped -- the rest of the return
       (the sound's kick, the resume's log) runs as before.  A slow device
       rejoined on every such gap, forever (card RD's crowdfight).  With
       `?thawjudge=0` the same hold rejoins for a whole world, as before
       (5b).  A gap whose pings went missing still rejoins (the node suite,
       thaw-carried.test). */
    const thaw0 = await P.page.evaluate(() => (window.__btThaw ? window.__btThaw() : null));
    await P.page.evaluate(() => { const t = Date.now(); while (Date.now() - t < 6500) { /* the page frozen */ } });
    const thaw = await H.waitFor(P, () => ({ sockets: window.__qaSockets.length, kick: window.BT_AUDIO._kickUntil || 0, hold: !!window._gameState.current._netHold,
      st: window._gameState.current._realtimeStatus }), (v) => v.sockets > 0 && v.kick > before5.kick && v.st === 'connected', { timeout: 20000, label: 'the thaw noticed' }).catch(() => null);
    const judged = await H.waitFor(P, () => (window.__btThaw ? window.__btThaw() : null),
      (v) => !!v && !v.pending && !!v.last && v.last.gap > 5000 && (v.carried + v.rejoined) > ((thaw0 && thaw0.carried + thaw0.rejoined) || 0),
      { timeout: 20000, label: 'the gap judged' }).catch(() => null);
    const kinds5 = await crashKinds(P);
    await P.page.waitForTimeout(3000);
    const after5 = await P.page.evaluate(() => ({ sockets: window.__qaSockets.length, st: window._gameState.current._realtimeStatus, hold: !!window._gameState.current._netHold }));
    rec.ok(`5. a page held 6.5 s with no visibility event, its socket carrying the worker's pings all the while: the sound's kick armed, the return run, the gap judged carried and NOT rejoined (sockets ${before5.sockets} -> ${after5.sockets})`,
      !!thaw && thaw.kick > before5.kick && kinds5.some((k) => /^resume:thaw/.test(k)) && !!judged && judged.last.carried === true
        && after5.sockets === before5.sockets && after5.st === 'connected', { before5, thaw, judged, after5, kinds5 });
    /* 5b. the off-ramp: the old way, a rejoin for a whole world */
    await P.page.evaluate(() => history.replaceState(null, '', location.pathname + location.search + (location.search ? '&' : '?') + 'thawjudge=0'));
    /* v2.3.6309 (card LF; the planning session's word, 2026-11-23): 812ab668 made the off path skip the judge and was
       pushed unproven, so `thaw.rejoined` (the gaps the JUDGE handed on) can no longer rise here: 5b asserted a counter
       that path cannot move (the split run on 988dddff alone: 9 of 10, the same 5b).  What the off switch is FOR is
       asserted instead: (a) a new socket opened and the page is connected, no hold; (b) the WHOLE world came again (a
       state_sync frame counted on the new socket; no `__bt*` handle shows a rebuilt world, so the test's own socket
       wrapper counts them); (c) the judge did not run: its counters and `last` are exactly as step 5 left them. */
    const before5b = await P.page.evaluate(() => { const t = window.__btThaw ? window.__btThaw() : null;
      return { sockets: window.__qaSockets.length, syncs: window.__qaSyncs || 0, carried: t && t.carried, rejoined: t && t.rejoined, lastAt: t && t.last && t.last.at, lastGap: t && t.last && t.last.gap }; });
    await P.page.evaluate(() => { const t = Date.now(); while (Date.now() - t < 6500) { /* the page frozen again */ } });
    const after5b = await H.waitFor(P, () => { const t = window.__btThaw ? window.__btThaw() : null;
      return { sockets: window.__qaSockets.length, syncs: window.__qaSyncs || 0, st: window._gameState.current._realtimeStatus, hold: !!window._gameState.current._netHold,
        carried: t && t.carried, rejoined: t && t.rejoined, lastAt: t && t.last && t.last.at, lastGap: t && t.last && t.last.gap, pending: !!(t && t.pending) }; },
      (v) => v.sockets > before5b.sockets && v.st === 'connected' && !v.hold && v.syncs > before5b.syncs,
      { timeout: 30000, label: 'rejoined after the thaw (?thawjudge=0)' }).catch(() => null);
    rec.ok(`5b. ...with ?thawjudge=0 the same hold rejoins for a whole world, as before: a new socket (${before5b.sockets} -> ${after5b && after5b.sockets}), connected, no hold`,
      !!after5b && after5b.sockets > before5b.sockets && after5b.st === 'connected' && !after5b.hold, { before5b, after5b });
    rec.ok(`5b. ...the whole world came again: a state_sync on the new socket (${before5b.syncs} -> ${after5b && after5b.syncs})`,
      !!after5b && after5b.syncs > before5b.syncs, { before5b, after5b });
    rec.ok('5b. ...and the judge did not run: its counters and last gap are exactly as step 5 left them',
      !!after5b && !after5b.pending && after5b.carried === before5b.carried && after5b.rejoined === before5b.rejoined
        && after5b.lastAt === before5b.lastAt && after5b.lastGap === before5b.lastGap && !!judged && after5b.carried === judged.carried && after5b.rejoined === judged.rejoined && after5b.lastAt === judged.last.at, { judged, before5b, after5b });
    await P.page.evaluate(() => history.replaceState(null, '', location.pathname + location.search.replace(/([?&])thawjudge=0(&|$)/, (m, a, b) => (b ? a : '')).replace(/[?&]$/, '')));

    /* ── 6. a connect that never finishes ── */
    const before6 = await P.page.evaluate(() => {
      window.__qaStallNext = true;
      const live = window.__qaSockets.filter((w) => w.readyState === 1);
      const ws = live[live.length - 1];
      if (ws) ws.close();
      return { sockets: window.__qaSockets.length, closed: !!ws };
    });
    const stalled = await H.waitFor(P, () => ({ stalled: window.__qaStalled || 0, hold: !!window._gameState.current._netHold }), (v) => v.stalled >= 1 && v.hold,
      { timeout: 15000, label: 'the stalled connect' }).catch(() => null);
    const t6 = Date.now();
    const back = await H.waitFor(P, () => ({ stalls: (window.__btConnectStalls || []).length, st: window._gameState.current._realtimeStatus, hold: !!window._gameState.current._netHold,
      sockets: window.__qaSockets.length }), (v) => v.stalls >= 1 && v.st === 'connected' && !v.hold, { timeout: 40000, label: 'back after the stall' }).catch(() => null);
    const kinds6 = await crashKinds(P);
    rec.ok(`6. a connect that never finishes (the bro held still meanwhile) is tried again and the world is back (${back ? Math.round((Date.now() - t6) / 1000) : '-'} s after it stalled; sockets ${before6.sockets} -> ${back && back.sockets})`,
      before6.closed && !!stalled && !!back && kinds6.some((k) => /^connect-stall:still connecting/.test(k)), { before6, stalled, back, kinds6 });
    const moves = await (async () => {
      const a = await H.readState(P, (S) => S.player.x);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: L.x, y: L.y, id: 2 }] });
      for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: L.x - i * 9, y: L.y, id: 2 }] }); await P.page.waitForTimeout(80); }
      await P.page.waitForTimeout(500);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      const b = await H.readState(P, (S) => S.player.x);
      return Math.round(a - b);
    })();
    rec.ok(`6b. ...and the stick walks again (${moves} px)`, moves > 15, { moves });

    rec.ok('7. no page errors', errs.length === 0, errs.slice(0, 3));
  } finally {
    await cdp.detach().catch(() => {});
    await P.ctx.close().catch(() => {});
  }
}
