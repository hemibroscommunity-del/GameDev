/* THE ROAD THE OWNER NAMED (v2.3.1866).
 *
 * Owner, narrowing the report: "The continue pop up when you choose the
 * create a character."  So: log out, tap Create Character, tap "Continue as
 * <name>" on the warning — and the screen goes black.
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
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* LIT belongs in the trail, not just the phase.  The first cut watched the
     phase alone and showed a clean join followed by the page vanishing seven
     seconds later - which reads as "something reloads it" and says nothing
     about WHY.  The watchdog reloads a first join that renders dark, so
     whether those frames were lit is the difference between "the world is
     broken" and "something else reloaded the page". */
  const snap = () => P.page.evaluate(() => {
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
    return {
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
    };
  });

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

  const create = await P.page.$('[data-tut="login-create"]');
  rec.ok('the door offers Create Character (guard)', !!create, {});
  if (!create) return;
  await create.click();
  await P.page.waitForTimeout(700);
  console.log('  WARN OPEN', JSON.stringify(await snap()));

  const cont = await P.page.$('[data-tut="login-existing-continue"]');
  rec.ok('the pop-up offers Continue (guard)', !!cont, {});
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

  await P.page.screenshot({ path: 'tools/qa/mp/out/road2.png' });
  await P.ctx.close().catch(() => {});
}
