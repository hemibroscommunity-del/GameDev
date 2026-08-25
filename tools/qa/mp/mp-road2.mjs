/* THE ROAD THE OWNER NAMED (v2.3.1866).
 *
 * Owner, narrowing the report: "The continue pop up when you choose the
 * create a character."  So: log out, tap Create Character, tap "Continue as
 * <name>" on the warning — and the screen goes black.
 *
 * v2.3.1923: that warning is retired (the device keeps up to ten characters
 * now, so creating one destroys nothing to warn about).  The road walks
 * through its replacement — Continue -> your row in the character picker —
 * because the thing under test was never the dialog: it is the handoff from a
 * pre-game screen to the world, and whether the world arrives.
 *
 * Everything else is stripped out so this runs in about a minute and can be
 * re-run after each hypothesis.  The one thing it does that no existing test
 * did is watch the PRE-GAME PHASE over time.  A single reading after the tap
 * cannot tell these apart, and they have different causes:
 *   - the phase never left 'login'      -> the tap did not take effect;
 *   - it left and came back             -> something re-routed to the door;
 *   - it left and stayed, with no canvas-> the join went somewhere else.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Returner', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  /* EVERY console line, not just errors.  The harness keeps errors only, and
     a renderer that quietly declines to start says so in a warn or a log. */
  const consoleLines = [];
  P.page.on('console', (m) => consoleLines.push(`${m.type()} ${m.text().slice(0, 180)}`));

  /* ═══ THE CAUSE, MADE DELIBERATE ═══
     The owner's black screen came from the loading screen's video failing to
     load: its onError forced readyRef — the ASSET GATE — true and finished
     the overlay on the spot, so the world was revealed with nothing loaded.
     In the harness that failure arrived by accident (the dist server reset a
     connection), which is no basis for a regression test: it would pass or
     fail on the weather.  So the clip is aborted ON PURPOSE here, every run.
     That turns "sometimes black" into a fixed, reproducible input, and this
     scenario then asserts the thing that must remain true — a dead video
     costs you the clip, not the game. */
  await P.page.route('**/intro/loading-ashore.mp4', (r) => r.abort());
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* LIT belongs in the trail, not just the phase.  The first cut watched the
     phase alone and showed a clean join followed by the page vanishing seven
     seconds later - which reads as "something reloads it" and says nothing
     about WHY.  The watchdog reloads a first join that renders dark, so
     whether those frames were lit is the difference between "the world is
     broken" and "something else reloaded the page". */
  /* INSIDE rAF, and this is not a detail: a WebGL canvas without
     preserveDrawingBuffer is empty to drawImage outside the frame, so a
     synchronous sample reads 0% lit on a perfectly healthy world.  The
     in-game watchdog samples inside rAF for exactly this reason
     (BroTown.jsx _sampleLit) and this has to match it, or the two disagree
     and neither can be trusted.  (The first cut of this file sampled
     synchronously; its lit:0 readings happened to agree with the watchdog,
     which is the kind of luck that hides a broken instrument.) */
  const snap = () => P.page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => {
    let lit = -1;
    try {
      const cv = document.querySelector('canvas');
      if (cv) {
        const c2 = document.createElement('canvas');
        c2.width = 32; c2.height = 18;
        const g2 = c2.getContext('2d');
        g2.drawImage(cv, 0, 0, 32, 18);
        const d = g2.getImageData(0, 0, 32, 18).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 30) n++;
        lit = Math.round(100 * n / (32 * 18));
      }
    } catch (e) {}
    const S = (window._gameState && window._gameState.current) || {};
    let resumeNow = null;
    try { resumeNow = sessionStorage.getItem('bt_resume_now'); } catch (e) {}
    resolve({
      phase: window.__btPhase || null,
      route: window.__btBootRoute || null,
      joinError: window.__btJoinError || null,
      name: S.myName || null,
      canvas: !!document.querySelector('canvas'),
      lit,
      /* The watchdog's own counters - it is the prime suspect for the reload,
         and these say whether it struck and how often. */
      wdDark: S.__wdDark || 0, wdEverLit: !!S.__wdEverLit,
      introLiftedAt: S.__introLiftedAt || null,
      /* Set by _recoveryReload just before it reloads: proof of who did it. */
      resumeNow,
      /* mount/finish/unmount of the loading overlay, with timestamps. */
      intro: (window.__btIntro || []).slice(-6),
      ready: document.readyState,
      url: location.search,
    });
    });
  }));

  const first = await snap();
  rec.ok('in world before logging out (guard)', first.canvas === true, first);

  await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) {} });
  await P.page.waitForTimeout(400);
  const chip = await P.page.$('[aria-label="Log out to the character screen"]');
  rec.ok('the log-out chip is there (guard)', !!chip, {});
  if (!chip) return;
  await chip.click();
  await P.page.waitForTimeout(500);
  const c = await P.page.$('text=Log Out');
  rec.ok('the log-out confirm is there (guard)', !!c, {});
  if (!c) return;
  await Promise.all([P.page.waitForNavigation({ waitUntil: 'load' }).catch(() => {}), c.click()]);
  await P.page.waitForTimeout(3500);
  console.log('  AT DOOR', JSON.stringify(await snap()));

  /* v2.3.1923: through the picker now.  The owner's original road was
     Create Character -> "Continue as <name>" on the overwrite warning; the
     roster retired that warning (a device keeps ten characters, so making one
     destroys nothing).  Continuing an existing character is a row in the
     picker, and it is the same handoff — pre-game screen to world — that went
     black. */
  const open = await P.page.$('[data-tut="login-key"]');
  rec.ok('the door offers Continue (guard)', !!open, {});
  if (!open) return;
  await open.click();
  await P.page.waitForTimeout(700);
  console.log('  PICKER OPEN', JSON.stringify(await snap()));

  const cont = await P.page.$('[data-tut="char-row"][data-char-name="Returner"]');
  rec.ok('the picker lists this device\'s character (guard)', !!cont, {});
  if (!cont) return;
  await cont.click();

  /* The trail, deduped: one entry per CHANGE, so twenty seconds of samples
     read as a short story instead of forty identical lines. */
  const trail = [];
  /* 45s, not 20: the reload lands around 7s and the real question is whether
     the page EVER comes back — a watch that stops at 20s cannot tell a slow
     recovery from a permanent black screen. */
  for (let i = 0; i < 90; i++) {
    await P.page.waitForTimeout(500);
    const s = await snap().catch(() => null);
    const key = s && s.phase
      ? `${s.phase.bootPhase}|intro:${s.phase.showIntro}|canvas:${s.canvas}|lit:${s.lit}|wdDark:${s.wdDark}|ready:${s.ready}|iv:${(s.intro || []).length}`
      : 'unreadable';
    if (!trail.length || trail[trail.length - 1].key !== key) {
      /* The intro's own mount/finish/unmount log has to ride the TRAIL, not
         be read at the end: the page reloads at ~7s and window.__btIntro dies
         with it, which is why the first run of this reported it as null. */
      trail.push({ tMs: i * 500, key, name: s && s.name, joinError: s && s.joinError,
        resumeNow: s && s.resumeNow, route: s && s.route, intro: s && s.intro });
    }
  }
  console.log('  PHASE TRAIL', JSON.stringify(trail, null, 1));
  const introLog = await P.page.evaluate(() => window.__btIntro || null).catch(() => null);
  console.log('  INTRO EVENTS', JSON.stringify(introLog));
  console.log('  CONSOLE', JSON.stringify(consoleLines.slice(-25), null, 1));

  const last = trail[trail.length - 1] || { key: '' };
  rec.ok('the Continue pop-up leaves the login door at all',
    trail.some((x) => /^null\|/.test(x.key)), trail);
  rec.ok('...and the world is on screen when the dust settles',
    /canvas:true/.test(last.key), trail);
  rec.ok('...without the join having thrown', !last.joinError, last);

  /* ── the three claims that make this a regression test ── */

  /* 1. THE WORLD PAINTS.  The whole report in one line: with the intro clip
     dead, does the player end up looking at the game or at nothing?  Read off
     the same 32x18 sample the in-game watchdog judges by, so a pass here
     means the watchdog would not have struck either. */
  const litAtEnd = /\|lit:(\d+)/.exec(last.key);
  rec.ok('a dead intro clip still ends with a LIT world',
    !!(litAtEnd && Number(litAtEnd[1]) >= 1), { last, trail });

  /* 2. THE OVERLAY HELD.  The mechanism, asserted separately from the
     symptom: the fix is that a video error stops forcing the asset gate, so
     the overlay must now last longer than the video took to fail.  Without
     it the overlay finished 761ms after mounting against a 3000ms floor. */
  const iv = (trail.find((x) => (x.intro || []).some((e) => e.ev === 'finish')) || {}).intro || [];
  const mount = iv.find((e) => e.ev === 'mount');
  const finish = iv.find((e) => e.ev === 'finish');
  rec.ok('the loading overlay mounted and finished (guard)', !!(mount && finish), iv);
  if (mount && finish) {
    rec.ok('...and it held for its minimum, instead of being dismissed by the dead video',
      (finish.at - mount.at) >= 2500, { heldMs: finish.at - mount.at, iv });
    /* The gate itself.  `ready` false at finish would mean the overlay lifted
       without the assets — the exact lie the old onError told. */
    rec.ok('...and lifted because the ASSETS were ready, not because the video died',
      finish.ready === true, { finish, iv });
  }

  /* 3. NO WATCHDOG RESCUE WAS NEEDED.  A pass on (1) with a reload in the
     middle would mean the game recovered rather than worked; bt_resume_now is
     set only by _recoveryReload, so it is the fingerprint. */
  rec.ok('...without the black-screen watchdog having to reload the page',
    !trail.some((x) => x.resumeNow === '1'), trail.map((x) => ({ tMs: x.tMs, resumeNow: x.resumeNow })));

  await P.page.screenshot({ path: 'tools/qa/mp/out/road2.png' });
  await P.ctx.close().catch(() => {});
}
