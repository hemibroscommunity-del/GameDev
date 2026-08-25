/* Idle characters log out (v2.3.1911)
 *
 * Owner: "Sometimes I login to the game and see characters I played in
 * separate window hours ago just idle.  Game should be logging out
 * characters after 2 mins."
 *
 * There are two halves and this drives both against a real worker:
 *
 *   A. THE PAGE hangs up at two idle minutes.  It has to be the page that
 *      says it first, because the page can see the player's THUMB — a tap
 *      that scrolls a panel is activity even though it puts nothing on the
 *      socket.  And having hung up it must STAY hung up: the old onclose
 *      reconnected on anything it didn't recognise, so an eviction and a
 *      reconnect would just have traded the same ghost back and forth.
 *
 *   B. THE WORKER evicts anyway, for a page that is frozen or old.
 *      Simulated by stubbing out S.channel.idleLogout — the page then
 *      behaves EXACTLY like a pre-v2.3.1911 build: genuinely idle, still
 *      pumping the 1 Hz keepalive and the 2 s track, and never hanging
 *      up.  Only the server sweep can end it, which is the owner's bug
 *      stated as a test.
 *
 * Part B waits a real two minutes; there is no clock to fast-forward on the
 * far side of a WebSocket.
 */
import * as H from './harness.mjs';

const IDLE_MS = 120000;

const probe = (P) => H.readState(P, (S) => ({
  status: S ? S._realtimeStatus : null,
  live: !!(S && S.channel && S.channel.isLive && S.channel.isLive()),
  banner: !!document.getElementById('bt-resume-banner'),
  bannerText: (document.getElementById('bt-resume-banner') || {}).textContent || null,
  others: S && S.others ? Object.keys(S.others) : [],
}));

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── A. the page hangs up on its own ── */
  const A = await H.newPlayer(browser, { name: 'Dozer', wsPort, webPort,
    viewport: { width: 390, height: 844 } });
  await H.enterWorld(A);
  await A.page.waitForTimeout(2500);

  const before = await probe(A);
  rec.ok('the idle player starts out connected (guard)',
    before.live === true && before.banner === false, before);

  /* Backdate the input clock instead of sitting here for two minutes.
     _lastInputAt is the real field the real check reads — stamped by the
     window-capture touchstart/pointerdown/keydown listeners — so this is
     the same code path a walked-away player takes, just sooner. */
  await A.page.evaluate((ms) => {
    const S = window._gameState && window._gameState.current;
    if (S) S._lastInputAt = Date.now() - ms - 5000;
  }, IDLE_MS);
  /* The check rides the 2 s track slot. */
  await A.page.waitForTimeout(4000);

  const hungUp = await probe(A);
  rec.ok('two idle minutes logs the character out', hungUp.live === false, hungUp);
  rec.ok('...and the page says why, rather than dying silently',
    hungUp.status === 'idle', hungUp);
  rec.ok('...offering the way back in',
    hungUp.banner === true && /back/i.test(hungUp.bannerText || ''), hungUp);

  /* THE ONE THAT MATTERS: an abandoned tab that auto-reconnects a second
     later is the reported ghost with extra steps. */
  await A.page.waitForTimeout(9000);
  const stayedOut = await probe(A);
  rec.ok('...and it does NOT quietly reconnect behind the banner',
    stayedOut.live === false && stayedOut.status === 'idle', stayedOut);

  /* And a human can come back. */
  const backBtn = await A.page.$('#bt-resume-banner button');
  rec.ok('the resume button is a real button', !!backBtn);
  if (backBtn) {
    await backBtn.click();
    await A.page.waitForTimeout(6000);
    const resumed = await probe(A);
    rec.ok('tapping it puts the character back in the world',
      resumed.live === true, resumed);
    rec.ok('...and takes the banner away', resumed.banner === false, resumed);
  }

  /* ── B. the worker evicts a page that never hangs up ── */
  const G = await H.newPlayer(browser, { name: 'Ghost', wsPort, webPort,
    viewport: { width: 390, height: 844 } });
  const W = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort,
    viewport: { width: 390, height: 844 } });
  await H.enterWorld(G);
  await H.enterWorld(W);
  await H.waitMutualSight(G, W);

  const gId = await H.readState(G, (S) => (S ? S.myId : null));
  const sawGhost = await probe(W);
  rec.ok('the watcher can see the other character (guard)',
    sawGhost.others.includes(gId), { gId, others: sawGhost.others });

  /* Become the pre-v2.3.1911 client: the page never hangs up.  Everything
     else is left completely alone — this player really is idle, really is
     sending the keepalive and the track, and really does report aw:1 once
     it has been two minutes.  Only the worker can end this. */
  await G.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    window.__btIdleLogoutStubbed = !!(S && S.channel && S.channel.idleLogout);
    if (S && S.channel) S.channel.idleLogout = function () { window.__btIdleLogoutCalls = (window.__btIdleLogoutCalls || 0) + 1; };
    /* Backdate the input clock so the page starts reporting aw:1 at once
       instead of after its own two minutes.  This is not cheating the
       result, it is skipping a wait: the player IS idle from here, and
       the worker's clock only starts when the page stops claiming a
       human.  Without it the honest total is nearer five minutes. */
    if (S) S._lastInputAt = Date.now() - 300000;
  });

  /* Two real minutes of nothing but the 1 Hz keepalive and the 2 s track.
     The watcher is nudged along the way — it has a page too, and an
     untouched one would (correctly) log itself out mid-test. */
  const deadline = Date.now() + IDLE_MS + 20000;
  while (Date.now() < deadline) {
    await W.page.waitForTimeout(15000);
    await H.nudge(W, 'w', 200);
  }

  const evicted = await H.readState(G, (S) => ({
    status: S ? S._realtimeStatus : null,
    live: !!(S && S.channel && S.channel.isLive && S.channel.isLive()),
    banner: !!document.getElementById('bt-resume-banner'),
    stubbed: !!window.__btIdleLogoutStubbed,
    stubCalls: window.__btIdleLogoutCalls || 0,
  }));
  rec.ok('the worker logs out an idle character even when the page will not',
    evicted.live === false, evicted);
  rec.ok('...and closes it as an idle timeout, so the page will not rejoin',
    evicted.status === 'idle' && evicted.banner === true, evicted);
  /* Guard: if the stub never took, part B just re-tested part A. */
  rec.ok('...with the page\'s own hang-up stubbed out, so this was the sweep',
    evicted.stubbed === true && evicted.stubCalls > 0, evicted);

  const after = await probe(W);
  rec.ok('...so the idle character is gone from everyone else\'s world',
    !after.others.includes(gId), { gId, others: after.others });
}
