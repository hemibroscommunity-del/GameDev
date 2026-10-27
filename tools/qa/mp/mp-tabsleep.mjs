/* ═══ v2.3.3670: BACK FROM A SLEEPING TAB, AFTER FOUR LENGTHS OF SLEEP ═══
 *
 * The owner, 2026-10-27: "check rebuilding the game at different intervals
 * when returning to the game from putting the tab to sleep (iPhone)".
 *
 * An iPhone cannot be driven from here, so its sleep is made as Safari makes
 * it, on an upright touch phone in the world's BroTown:
 *   - the page goes hidden (visibilitychange, pagehide, blur -- mp-tabwipe's
 *     way), then its JavaScript is FROZEN: a loop holds the page's one thread
 *     for the whole sleep (mp-comeback's way), so no timer, frame or socket
 *     event runs until it wakes.  Not Chrome's own lifecycle state: this
 *     Chromium takes Page.setWebLifecycleState 'frozen' and goes on running
 *     the page's timers (tried: 30 beats of a 100 ms timer in 3 s "frozen",
 *     and a page behind another tab still reads 'visible'), and the first cut
 *     of this test, which used it, measured a hidden tab that kept playing;
 *   - it sleeps, and the socket meets one of a phone's three fates while it
 *     does.  The page talks to the worker through a little relay of this
 *     test's own (`relay` below): Chrome's "offline" switch leaves an open
 *     socket working (tried: a minute "offline" and the socket was still
 *     open), so the relay is what cuts it:
 *       alive   the socket lives through it (a short lock, or Wi-Fi);
 *       closed  the phone closes it while the page sleeps (iOS does, for a
 *               suspended page): the page finds it closed when it wakes;
 *       dead    the radio sleeps: nothing comes back on the old socket, not
 *               even a close (a dead pipe), and a new one works;
 *   - 10 s and a minute alive, 3 minutes closed (past the 2-minute idle
 *     logout's clock), 8 minutes dead;
 *   - then it is thawed and shown again, and the way back is timed.
 * At each wake, read and printed as a table:
 *   - how long until the socket is live again (connected, in the Wheel), and
 *     whether a banner asked for a touch first (an idle logout: any touch is
 *     "I'm back");
 *   - what the game did on the way (its crash log: a rejoin for a stale world,
 *     a dead pipe, a reload);
 *   - the screen lit (the black-screen watchdog's own sample);
 *   - a step taken after the wake reaching the worker (the server's copy of
 *     the bro moves);
 *   - the sound running again after a touch;
 *   - no page errors, no reload.
 * The canvases are not emptied here: that part of a long sleep (Safari
 * throwing pictures away) is mp-tabwipe's.
 *
 *   node tools/qa/mp/run.mjs tabsleep        # ~17 minutes
 *   BT_SLEEP_QUICK=1 ...                     # 3 s and 15 s alive, 30 s closed, 40 s dead
 */
import net from 'node:net';
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const QUICK = !!process.env.BT_SLEEP_QUICK;
const SLEEPS = QUICK
  ? [{ s: 3, label: '3 s', fate: 'alive' }, { s: 15, label: '15 s', fate: 'alive' }, { s: 30, label: '30 s, socket closed', fate: 'closed' }, { s: 40, label: '40 s, radio asleep', fate: 'dead' }]
  : [{ s: 10, label: '10 s', fate: 'alive' }, { s: 60, label: '1 minute', fate: 'alive' }, { s: 180, label: '3 minutes, socket closed', fate: 'closed' }, { s: 480, label: '8 minutes, radio asleep', fate: 'dead' }];
const BACK_MS = 45000;    /* the most a way back may take, from the wake (or the touch a banner asked for) */
const DRIFT_PX = 40;      /* back where you were: the worker's last place, not the town's door */

/* The page's own road to the worker (its WebSocket and its fetches), through
   a relay this test can cut as a phone's network would.  `cut('closed')`
   resets every connection (the page reads them closed when it wakes);
   `cut('dead')` stops carrying anything on them, either way, for good, and
   keeps them open (a close from the worker is swallowed too: a dead pipe);
   new connections are refused until `uncut()`. */
function relay(target) {
  const conns = new Set();
  let refusing = false;
  const srv = net.createServer((client) => {
    if (refusing) { client.destroy(); return; }
    const up = net.connect(target, '127.0.0.1');
    const c = { client, up, black: false };
    conns.add(c);
    client.on('data', (d) => { if (!c.black) up.write(d); });
    up.on('data', (d) => { if (!c.black) client.write(d); });
    const endClient = () => { conns.delete(c); up.destroy(); };
    const endUp = () => { if (c.black) return; conns.delete(c); client.destroy(); };
    client.on('close', endClient); client.on('error', endClient);
    up.on('close', endUp); up.on('error', endUp);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({
    port: srv.address().port,
    cut(fate) {
      refusing = true;
      for (const c of [...conns]) {
        if (fate === 'closed') { conns.delete(c); try { c.client.resetAndDestroy(); } catch (e) { c.client.destroy(); } c.up.destroy(); }
        else c.black = true;
      }
    },
    uncut() { refusing = false; },
    close() { for (const c of conns) { c.client.destroy(); c.up.destroy(); } srv.close(); },
  })));
}

const hide = (P) => P.page.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('pagehide'));
  window.dispatchEvent(new Event('blur'));
});
const show = (P) => P.page.evaluate(() => {
  delete document.visibilityState; delete document.hidden;
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('pageshow'));
  window.dispatchEvent(new Event('focus'));
});

/* where the game stands, read in the page */
const state = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return null;
  /* the "You were away" banner: in the page until its touch takes it away
     (never `offsetParent`, which a fixed box never has) */
  const ban = document.getElementById('bt-resume-banner');
  return { status: S._realtimeStatus || null, zone: S.currentZone, loading: !!S._zoneLoading, hold: !!S._netHold,
    x: Math.round(S.player.x), y: Math.round(S.player.y), banner: !!(ban && ban.isConnected),
    bannerText: ban ? String(ban.textContent || '').slice(0, 80) : null,
    snd: window.BT_AUDIO && window.BT_AUDIO.ctx ? window.BT_AUDIO.ctx.state : null };
}).catch(() => null);

const live = (s) => !!s && s.status === 'connected' && s.zone === 'wheel' && !s.loading && !s.hold && !s.banner;

export async function run({ browser, wsPort, webPort, rec }) {
  const road = await relay(wsPort);
  /* the page's road goes through the relay; this test's own calls to the
     worker (the admin's) go straight to it */
  /* two counters of this test's own: the sockets the page makes (a way back
     is one new socket, or none), and a timer's beats, which must stop while
     the page sleeps (or it never slept: an iPhone runs no script then) */
  const COUNT = () => {
    const W = window.WebSocket;
    window.__wsMade = 0;
    window.WebSocket = class extends W { constructor(...a) { super(...a); window.__wsMade++; } };
    window.__beat = 0;
    setInterval(() => { window.__beat++; }, 100);
  };
  const P = await H.newPlayer(browser, { name: 'Sleeper', wsPort: road.port, webPort, viewport: PHONE, touch: true, world: 'wheel', init: COUNT });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  /* the game's own crash log, as it is written (crashTrap prints every entry) */
  const trail = [];
  P.page.on('console', (m) => { const t = m.text(); if (/^\[bt-crash\]/.test(t)) trail.push({ at: Date.now(), t: t.replace(/^\[bt-crash\]\s*/, '').slice(0, 140) }); });
  let loads = 0;
  P.page.on('load', () => { loads++; });
  await H.enterWorld(P);
  const inWheel = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading, h: !!S._netHold }), (v) => v.z === 'wheel' && !v.l && !v.h,
    { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
  rec.ok('in the Wheel (guard)', !!inWheel, inWheel);
  if (!inWheel) { await P.ctx.close().catch(() => {}); return; }
  const myId = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', myId).catch(() => null);
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 60 }).catch(() => null);
  await P.page.waitForTimeout(3000);
  loads = 0;
  const rows = [];
  for (const sl of SLEEPS) {
    const t0 = Date.now();
    const before = await state(P);
    const c0 = await P.page.evaluate(() => ({ ws: window.__wsMade, beat: window.__beat })).catch(() => null);
    await hide(P);
    /* the sleep: the page's thread held for its length (not awaited here, so
       the network's fate can be dealt while it sleeps); the road comes back
       half a second before the page does, as a phone's radio is up before
       the page is drawn again */
    const asleep = P.page.evaluate((ms) => {
      const beat = window.__beat, t = Date.now();
      while (Date.now() - t < ms) { /* asleep */ }
      return beat;
    }, sl.s * 1000).catch(() => null);
    await new Promise((r) => setTimeout(r, 300));
    if (sl.fate !== 'alive') road.cut(sl.fate);
    const radio = setTimeout(() => road.uncut(), Math.max(0, sl.s * 1000 - 800));
    const beatAtSleep = await asleep;
    clearTimeout(radio); road.uncut();
    /* read before anything else runs: a beat counted while asleep means the
       page never slept */
    const c1 = await P.page.evaluate(() => ({ ws: window.__wsMade, beat: window.__beat })).catch(() => null);
    const wake = Date.now();
    await show(P);
    /* the way back: until the world is live, or a banner asks for a touch */
    let s = null, banner = false, tapAt = null, bannerText = null;
    while (Date.now() - wake < BACK_MS) {
      s = await state(P);
      if (s && s.banner && !banner) {
        /* a player reads it and touches the screen: any touch is "I'm back" */
        banner = true; bannerText = s.bannerText;
        tapAt = Date.now();
        await P.page.touchscreen.tap(PHONE.width / 2, 300).catch(() => {});
      }
      if (live(s)) break;
      await P.page.waitForTimeout(250);
    }
    const backMs = live(s) ? Date.now() - wake : null;
    const touchToLiveMs = live(s) && tapAt ? Date.now() - tapAt : null;
    /* a touch, as a player's first: the sound is let start again */
    await P.page.touchscreen.tap(PHONE.width / 2, 260).catch(() => {});
    await P.page.waitForTimeout(600);
    const lit = await P.page.evaluate(() => (window.__btWdSample ? window.__btWdSample() : null)).catch(() => null);
    /* a step: the page moves, and so does the worker's copy of the bro */
    const a0 = await H.adminPlayer(wsPort, myId).catch(() => null);
    const w0 = a0 && a0.live ? { x: a0.live.x, y: a0.live.y } : null;
    const p0 = await state(P);
    /* held long enough for a page drawing a few frames a second here to go
       some way (the walk moves by the frames drawn), and counted on the
       worker from 8 px: a short step on a slow frame was 15 px in all */
    await P.page.keyboard.down('d');
    await P.page.waitForTimeout(1500);
    await P.page.keyboard.up('d');
    let moved = null;
    for (let i = 0; i < 20 && !moved; i++) {
      await P.page.waitForTimeout(250);
      const a1 = await H.adminPlayer(wsPort, myId).catch(() => null);
      const w1 = a1 && a1.live ? { x: a1.live.x, y: a1.live.y } : null;
      if (w0 && w1 && Math.hypot(w1.x - w0.x, w1.y - w0.y) > 8) moved = Math.round(Math.hypot(w1.x - w0.x, w1.y - w0.y));
    }
    const p1 = await state(P);
    const seen = trail.filter((e) => e.at >= t0).map((e) => e.t);
    const kinds = seen.map((t) => t.split(' ')[0]);
    const row = {
      sleep: sl.label, fate: sl.fate, backS: backMs == null ? null : +(backMs / 1000).toFixed(1), banner, bannerText,
      touchS: touchToLiveMs == null ? null : +(touchToLiveMs / 1000).toFixed(1),
      rejoin: kinds.filter((k) => /^(resume-resync|dead-pipe|connect-stall)$/.test(k)).length,
      sockets: null, beats: c1 && beatAtSleep != null ? c1.beat - beatAtSleep : null,
      reload: loads, lit: lit ? (lit.gl != null ? lit.gl : lit.image) : null,
      stepPage: p0 && p1 ? Math.round(Math.hypot(p1.x - p0.x, p1.y - p0.y)) : null, stepWorker: moved,
      sound: p1 ? p1.snd : null, placeDrift: before && p0 ? Math.round(Math.hypot(p0.x - before.x, p0.y - before.y)) : null,
      log: seen.slice(0, 6),
    };
    const c2 = await P.page.evaluate(() => window.__wsMade).catch(() => null);
    row.sockets = c0 && c2 != null ? c2 - c0.ws : null;
    rows.push(row);
    console.log(`    ${sl.label}: back in ${row.backS == null ? 'NEVER' : row.backS + ' s'}${banner ? ` (the banner "${bannerText}" first, then ${row.touchS} s from its touch)` : ''}; `
      + `new sockets ${row.sockets} (rejoins ${row.rejoin}), reloads ${row.reload}; timer beats while asleep ${row.beats}; lit ${row.lit}%; a step ${row.stepPage} px on the page, ${row.stepWorker == null ? 'none' : row.stepWorker + ' px'} on the worker; `
      + `sound ${row.sound}; ${row.placeDrift} px from where it slept; the log: ${seen.join(' | ') || '-'}`);
    loads = 0;
  }
  console.log('    sleep                          socket  back (s)  banner  new sockets  lit %  step on worker  sound    moved (px)');
  for (const r of rows) {
    console.log(`    ${r.sleep.padEnd(31)}${r.fate.padEnd(6)} ${String(r.backS).padStart(8)}  ${String(r.banner).padStart(6)}  ${String(r.sockets).padStart(11)}  ${String(r.lit).padStart(5)}  ${String(r.stepWorker).padStart(14)}  ${String(r.sound).padEnd(8)} ${r.placeDrift}`);
  }
  for (const r of rows) {
    rec.ok(`${r.sleep}: the page really slept (${r.beats} beats of a 100 ms timer while frozen) (guard)`, r.beats != null && r.beats <= 2, r);
    rec.ok(`${r.sleep}: the world back and live within ${BACK_MS / 1000} s of the wake (${r.backS} s${r.banner ? ', after the banner\'s touch' : ''}), and lit (${r.lit}%)`,
      r.backS != null && r.lit != null && r.lit >= 75, r);
    rec.ok(`${r.sleep}: a step after the wake reaches the server (${r.stepWorker} px), the sound running again (${r.sound}), no reload (${r.reload})`,
      r.stepWorker != null && r.sound === 'running' && r.reload === 0, r);
    rec.ok(`${r.sleep}: back where the bro slept (${r.placeDrift} px away)`, r.placeDrift != null && r.placeDrift <= DRIFT_PX, r);
  }
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 4));
  await P.ctx.close().catch(() => {});
  road.close();
}
