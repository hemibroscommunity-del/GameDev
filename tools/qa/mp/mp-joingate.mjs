/* THE WORLD WAITS FOR THE SERVER (v2.3.2439).
 *
 * Owner, 2026-09-10, twice: "THIS IS AN ONLINE GAME ONLY. Just don't let the
 * player in if there's no online connection" / "don't let the player in at
 * all unless it's ready to go".
 *
 * WHAT THIS PINS.  Before this change the loading screen lifted on the asset
 * preload alone -- with a 20s safety cap that lifted it even when nothing
 * had loaded.  Nothing waited for the server.  So a game room that stopped
 * answering joins put the player in the client-local legacy game: no caps,
 * local monsters, the old six-tile Points grid, combat levels of 0.  The
 * owner's report ("zeros for combat primary skills", "old menus", "offline
 * legacy stuff") was that world, and a day was spent chasing a capability
 * flag because the client had covered for a room that was not there.
 *
 * FOUR ROADS, each against a real worker, each manufacturing the ONE thing a
 * healthy worker never gives you on demand:
 *   1. control     -- a normal join lifts the loading screen, as always.
 *   2. dead socket -- the socket never opens (the room never answers the
 *                     upgrade): the loading screen holds PAST the 20s cap and
 *                     says it is connecting.
 *   3. not ready   -- state_sync arrives without caps.prog3 (an old worker, or
 *                     a live flag): the loading screen holds, says the server
 *                     is not ready, and the client keeps re-joining.
 *   4. dropped     -- in-world, the socket drops for longer than a blip: a
 *                     veil covers the world and movement freezes; when the
 *                     server is back, the veil goes.
 * Every socket wrapper here copies the constructor's statics (TRAPS 69).
 */
import * as H from './harness.mjs';

/* enterWorld minus its final wait: the login door, the creator, PLAY -- and
   then STOP, because on roads 2 and 3 the world must never arrive. */
async function openLoadingScreen(P) {
  const { page, name } = P;
  await page.waitForFunction(() => {
    if (window.__btBootRoute === 'resume') return true;
    return !!(document.querySelector('input.bt-cc-name') || document.querySelector('[data-tut="login-create"]'));
  }, null, { timeout: 30000, polling: 250 });
  const resumed = await page.evaluate(() => window.__btBootRoute === 'resume');
  if (!resumed) {
    await H.uncoverDoor(page);
    if (await page.$('[data-tut="login-create"]')) {
      await page.click('[data-tut="login-create"]');
      await page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
    }
    await page.fill('input.bt-cc-name', name);
    await page.click('button.bt-cc-play');
  }
  await page.waitForSelector('.bt-intro', { timeout: 30000 });
}

const gate = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  const st = (window.__btIntro || []);
  const statusEl = document.querySelector('[data-intro-status]');
  return {
    introUp: !!document.querySelector('.bt-intro'),
    finished: st.some((e) => e.ev === 'finish'),
    lifted: !!(S && S.__introLiftedAt),
    status: statusEl ? statusEl.textContent : '',
    caps: S && S._serverCaps ? Object.keys(S._serverCaps).length : -1,
    prog3: !!(S && S._serverCaps && S._serverCaps.prog3),
    netHold: !!(S && S._netHold),
    veil: !!document.querySelector('.bt-connect-veil'),
    veilText: (document.querySelector('.bt-connect-veil-text') || {}).textContent || '',
    joins: window.__joins || 0,
  };
});

/* Statics copied onto every wrapper: wsClient guards eight sends with
   `readyState !== WebSocket.OPEN`, and OPEN lives on the constructor. */
const STATICS = 'W.CONNECTING = 0; W.OPEN = 1; W.CLOSING = 2; W.CLOSED = 3;';

export async function run({ browser, wsPort, webPort, rec }) {
  const vp = { width: 390, height: 844 };

  /* ══ 1. CONTROL: a normal join still lifts the loading screen ══ */
  const A = await H.newPlayer(browser, { name: 'GateCtl', wsPort, webPort, touch: true, viewport: vp });
  await H.enterWorld(A);
  await A.page.waitForTimeout(1500);
  const a = await gate(A);
  rec.ok('control: a normal join lifts the loading screen', a.introUp === false && a.lifted === true, a);
  rec.ok('control: ...because this worker advertised prog3', a.prog3 === true, a);
  rec.ok('control: no veil over a healthy world', a.veil === false && a.netHold === false, a);
  await A.ctx.close().catch(() => {});

  /* ══ 2. THE ROOM NEVER ANSWERS THE UPGRADE ══
     A socket that stays CONNECTING forever.  Not a refusal -- a refusal
     closes and the client retries; this is the production shape, where the
     Durable Object simply did not reply and no ws-close was ever logged. */
  const B = await H.newPlayer(browser, {
    name: 'GateDead', wsPort, webPort, touch: true, viewport: vp,
    init: new Function(`
      function W(url) { this.url = url; this.readyState = 0; window.__deadSockets = (window.__deadSockets || 0) + 1; }
      W.prototype = { send() {}, close() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } };
      ${STATICS}
      window.WebSocket = W;
    `),
  });
  await openLoadingScreen(B);
  /* Past MIN_MS (3s) + the old 20s hard cap + the 1s fade, with margin. */
  await B.page.waitForTimeout(26000);
  const b = await gate(B);
  console.log('    dead socket @26s: ' + JSON.stringify(b));
  rec.ok('dead socket: the loading screen is STILL up 26s in (the 20s cap no longer opens the world)',
    b.introUp === true && b.finished === false && b.lifted === false, b);
  rec.ok('dead socket: ...and it says it is connecting', /connecting/i.test(b.status), b);
  rec.ok('dead socket: no caps ever arrived (guard: the hold is for a real reason)', b.caps === -1 || b.caps === 0, b);
  rec.ok('dead socket: a socket really was attempted (guard)', await B.page.evaluate(() => (window.__deadSockets || 0) >= 1), {});
  await B.ctx.close().catch(() => {});

  /* ══ 3. THE SERVER ANSWERS, BUT WITHOUT THE CAPS THE GAME NEEDS ══
     state_sync with caps.prog3 stripped -- mp-prog3's own pattern for "new
     client, old worker" / "a live flag switched it off".  Before, the client
     obeyed it and showed the legacy game.  Now it holds and asks again. */
  const C = await H.newPlayer(browser, {
    name: 'GateOld', wsPort, webPort, touch: true, viewport: vp,
    init: new Function(`
      const RealWS = window.WebSocket;
      window.__joins = 0;
      const W = function (...a) {
        const ws = new RealWS(...a);
        ws.addEventListener('message', (e) => {
          try {
            const m = JSON.parse(e.data);
            if (m && m.type === 'state_sync' && m.caps) delete m.caps.prog3; else return;
            Object.defineProperty(e, 'data', { value: JSON.stringify(m) });
          } catch (err) {}
        }, true);
        const send = ws.send.bind(ws);
        ws.send = (d) => { try { if (JSON.parse(d).type === 'join') window.__joins++; } catch (e) {} return send(d); };
        return ws;
      };
      W.prototype = RealWS.prototype;
      ${STATICS}
      window.WebSocket = W;
    `),
  });
  await openLoadingScreen(C);
  await C.page.waitForTimeout(26000);
  const c = await gate(C);
  console.log('    not-ready server @26s: ' + JSON.stringify(c));
  rec.ok('not ready: caps arrived (guard: the server DID answer)', c.caps > 0, c);
  rec.ok('not ready: ...without prog3 (guard: the strip took)', c.prog3 === false, c);
  rec.ok('not ready: the loading screen holds instead of showing the legacy game',
    c.introUp === true && c.finished === false && c.lifted === false, c);
  rec.ok('not ready: ...and says the server is not ready', /not fully up|retrying/i.test(c.status), c);
  rec.ok('not ready: the client keeps asking -- more than one join in 26s (' + c.joins + ')', c.joins >= 2, c);
  await C.ctx.close().catch(() => {});

  /* ══ 4. IN-WORLD, THE SOCKET DROPS FOR LONGER THAN A BLIP ══
     Manufacturing a real mid-session drop against a loopback worker turned
     out to be the hard part: Playwright's offline emulation leaves an
     already-open 127.0.0.1 WebSocket alive (measured: still 'connected' 5s
     in), and a plain close() from the page is a polite handshake the client
     does not see as a drop.  So the drop is delivered the way the browser
     delivers one -- the client's onclose, code 1006, no reason -- and the
     real socket is closed behind it so the worker forgets the session.  For
     six seconds after that every reconnect the client attempts is refused
     (a socket that never opens, then reports itself closed), so the
     client walks its OWN backoff past the 3s grace.  Then real sockets
     again: it reconnects, state_sync returns, the veil goes.  A reconnect
     inside the grace is the blip case and must show nothing. */
  const D = await H.newPlayer(browser, {
    name: 'GateDrop', wsPort, webPort, touch: true, viewport: vp,
    init: new Function(`
      const RealWS = window.WebSocket;
      window.__blockUntil = 0;
      const W = function (url, ...rest) {
        if (Date.now() < window.__blockUntil) {
          const fake = { url, readyState: 0, send() {}, close() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } };
          setTimeout(() => { fake.readyState = 3; try { fake.onclose && fake.onclose({ code: 1006, reason: '' }); } catch (e) {} }, 120);
          window.__blockedSockets = (window.__blockedSockets || 0) + 1;
          return fake;
        }
        const ws = new RealWS(url, ...rest);
        window.__btWs = ws;
        return ws;
      };
      W.prototype = RealWS.prototype;
      ${STATICS}
      window.WebSocket = W;
    `),
  });
  await H.enterWorld(D);
  await D.page.waitForTimeout(1500);
  const d0 = await gate(D);
  rec.ok('drop: healthy before the drop (guard)', d0.veil === false && d0.netHold === false && d0.lifted === true, d0);
  await D.page.evaluate(() => {
    window.__blockUntil = Date.now() + 6000;
    const w = window.__btWs;
    const h = w.onclose;
    w.onclose = null; w.onmessage = null; w.onerror = null;
    try { w.close(); } catch (e) {}
    h && h.call(w, { code: 1006, reason: '' });
  });
  await D.page.waitForTimeout(5000);
  const d1 = await gate(D);
  const rt1 = await H.readState(D, (S) => S._realtimeStatus);
  console.log('    5s after the drop: ' + JSON.stringify(d1) + ' status=' + rt1);
  rec.ok('drop: the client really was refused while reconnecting (guard)', await D.page.evaluate(() => (window.__blockedSockets || 0) >= 1), {});
  rec.ok('drop: after the grace, a veil covers the world', d1.veil === true, d1);
  rec.ok('drop: ...that says it is reconnecting', /reconnecting/i.test(d1.veilText), d1);
  rec.ok('drop: ...and movement is held underneath it', d1.netHold === true, d1);
  rec.ok('drop: the loading screen did NOT come back (this is the veil, not a reload)', d1.introUp === false, d1);
  /* The block window ends; the backoff (<=10s) lands a real join. */
  await D.page.waitForFunction(() => !document.querySelector('.bt-connect-veil'), null, { timeout: 30000, polling: 250 }).catch(() => {});
  const d2 = await gate(D);
  console.log('    after recovery: ' + JSON.stringify(d2));
  rec.ok('drop: when the server is back, the veil goes', d2.veil === false, d2);
  rec.ok('drop: ...movement is released', d2.netHold === false, d2);
  rec.ok('drop: ...and the world is the real one again (prog3 advertised)', d2.prog3 === true, d2);
  await D.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/joingate.png` }).catch(() => {});
  await D.ctx.close().catch(() => {});
}
