/* ═══ NOTHING FOR THE WORLD WHILE A LOADING SCREEN IS UP (v2.3.4126) ═══
 *
 * The owner, 2026-11-03: "Before the loading screen is finished I'm seeing pop
 * up messages meant for the main screen area (like the star on minimap etc).
 * Needs to wait until it's done."  (src/ui/loadingGate.js)
 *
 * A brand-new character on a SLOW upright phone (BT_QA_CPU_THROTTLE, 4 unless
 * set), in the world's BroTown.  The page records, every 100 ms, any pop-up
 * meant for the world (a coach card, the big arrow, the minimap's big star, a
 * quest or level-up banner, a toast, an achievement, the NEW MONSTER card,
 * the swap hint, the install card) that is in the page while a loading screen
 * (the ocean clip, or a zone's veil) is:
 *   1. through the whole loading screen: none;
 *   2. the WELCOME plate (step 1 of the first steps) comes only after the clip
 *      has gone, and the minimap's big star too;
 *   3. the first steps still run in order: Talk to Mayor Bro, Gear up, Your
 *      map, Your quest;
 *   4. a zone's veil (the farm, through the Land Office's Travel to Farm)
 *      with a toast and a quest banner coming while it is up: neither in the
 *      page while the veil is; both shown once it has gone;
 *   5. no pop-up in the page with a loading screen, start to end; no page
 *      errors.
 * Pictures: tools/qa/mp/out/loadinggate-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const POPUPS = ['[data-coach]', '[data-guide-arrow]', '[data-star-cue]', '[data-quest-banner]', '[data-store-toast]', '[data-levelup-banner]',
  '[data-achv-banner]', '[data-new-monster]', '[data-swap-hint]', '[data-install-hint]'];

const RECORDER = `(() => {
  const SEL = ${JSON.stringify(POPUPS)};
  window.__lgBad = []; window.__lgIntroGone = 0; window.__lgIntroSeen = 0; window.__lgWelcomeAt = 0; window.__lgStarAt = 0;
  window.__lgVeilSeen = 0; window.__lgVeilGone = 0;
  setInterval(() => {
    try {
      const intro = document.querySelector('.bt-intro') || document.body.classList.contains('bt-intro-up');
      const veil = document.querySelector('.bt-zone-loading');
      if (intro && !window.__lgIntroSeen) window.__lgIntroSeen = Date.now();
      if (!intro && window.__lgIntroSeen && !window.__lgIntroGone) window.__lgIntroGone = Date.now();
      if (veil && !window.__lgVeilSeen) window.__lgVeilSeen = Date.now();
      if (!veil && window.__lgVeilSeen && !window.__lgVeilGone) window.__lgVeilGone = Date.now();
      if (intro || veil) {
        for (const s of SEL) if (document.querySelector(s) && window.__lgBad.length < 40) window.__lgBad.push({ sel: s, intro: !!intro, veil: !!veil, at: Date.now() });
      }
      if (!window.__lgWelcomeAt && document.querySelector('[data-quest-banner="welcome"]')) window.__lgWelcomeAt = Date.now();
      if (!window.__lgStarAt && document.querySelector('[data-star-cue]')) window.__lgStarAt = Date.now();
    } catch (e) { /* a probe only */ }
  }, 100);
})();`;

const coachId = (P) => P.page.evaluate(() => { const c = document.querySelector('[data-coach]'); return c ? c.getAttribute('data-coach') : null; });
async function waitCoach(P, id, ms = 40000) {
  for (const t0 = Date.now(); Date.now() - t0 < ms;) {
    if ((await coachId(P)) === id) return true;
    await P.page.waitForTimeout(300);
  }
  return false;
}

export async function run({ browser, wsPort, webPort, rec }) {
  if (!process.env.BT_QA_CPU_THROTTLE) process.env.BT_QA_CPU_THROTTLE = '4';
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Slowphone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, init: RECORDER });
  const shot = (n) => P.page.screenshot({ path: join(OUT, `loadinggate-${n}.png`) }).catch(() => {});
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P, 180000);
    await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 180000, label: 'world' });

    /* 1-2. through the clip: nothing; the welcome and the star after it */
    for (let i = 0; i < 80; i++) {
      if (await P.page.evaluate(() => !!window.__lgWelcomeAt)) break;
      await P.page.waitForTimeout(250);
    }
    await shot('1-welcome');
    const t = await P.page.evaluate(() => ({ seen: window.__lgIntroSeen, gone: window.__lgIntroGone, welcome: window.__lgWelcomeAt, star: window.__lgStarAt, bad: window.__lgBad.slice() }));
    rec.ok(`1. through the loading screen (${t.gone && t.seen ? t.gone - t.seen : '?'} ms on this slow phone) no pop-up meant for the world was in the page`,
      !!t.seen && !!t.gone && t.bad.length === 0, t.bad.slice(0, 5));
    rec.ok(`2. the WELCOME plate came ${t.welcome - t.gone} ms after the loading screen had gone${t.star ? `, the minimap's big star ${t.star - t.gone} ms after` : ''}`,
      !!t.welcome && t.welcome > t.gone && (!t.star || t.star > t.gone), t);

    /* 3. the first steps, in order */
    const m = await waitCoach(P, 'mayor');
    await H.approachNpc(P, 'mayor_bro');
    await H.acceptQuestFromGiver(P).catch(() => null);
    await H.closeNpcDialogue(P).catch(() => {});
    const g = await waitCoach(P, 'equip');
    await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null);
    await P.page.evaluate(() => {
      const S = window._gameState.current, R = S && S.rpg;
      if (!R || R.shield || !Array.isArray(R.shieldStash) || !R.shieldStash.length) return;
      const sh = R.shieldStash.shift();
      R.shield = sh;
      if (S.channel && S._serverCaps && S._serverCaps.shieldwear) {
        const payload = (typeof sh.gid === 'string' && sh.gid) ? { gid: sh.gid } : { sig: [sh.name || '', sh.gearBase || '', sh.tierMult == null ? '' : sh.tierMult, sh.tier || ''].join('|') };
        try { S.channel.send({ type: 'shield_wear', payload }); } catch (e) { /* the next change reports it */ }
      }
    });
    const mm = await waitCoach(P, 'minimap', 30000);
    const qp = await waitCoach(P, 'questPill', 30000);
    rec.ok(`3. the first steps still run in order on the slow phone (mayor ${m}, gear ${g}, map ${mm}, quest ${qp})`, m && g && mm && qp, { m, g, mm, qp });
    await P.page.waitForTimeout(8000);

    /* 4. a zone's veil, with a toast and a banner coming while it is up */
    await P.page.evaluate(() => { window.__lgVeilSeen = 0; window.__lgVeilGone = 0; window.__lgBad = []; });
    await P.page.evaluate(() => { if (window.__btBuildingWindow) window.__btBuildingWindow.open('farmhome'); });
    /* the window's button, waited for (a slow phone draws it a few seconds later) */
    let went = false;
    for (let i = 0; i < 80 && !went; i++) {
      went = await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((q) => /Travel to Farm/.test(q.textContent || '')); if (b) { b.click(); return true; } return false; });
      if (!went) await P.page.waitForTimeout(250);
    }
    let veil = false;
    for (let i = 0; i < 60 && !veil; i++) { veil = await P.page.evaluate(() => !!document.querySelector('.bt-zone-loading')); if (!veil) await P.page.waitForTimeout(100); }
    if (veil) {
      await P.page.evaluate(() => {
        try { window.__broStoreToasts.push('A toast that came during the veil'); } catch (e) { /* none */ }
        try { window._setQuestMsg({ kind: 'accepted', title: 'A banner that came during the veil', ts: Date.now() }); } catch (e) { /* none */ }
      });
    }
    let during = null;
    if (veil) { await P.page.waitForTimeout(300); during = await P.page.evaluate(() => ({ veil: !!document.querySelector('.bt-zone-loading'), toast: !!document.querySelector('[data-store-toast]'), banner: !!document.querySelector('[data-quest-banner]') })); }
    for (let i = 0; i < 300; i++) { if (await P.page.evaluate(() => !!window.__lgVeilGone)) break; await P.page.waitForTimeout(200); }
    let after = null;
    for (let i = 0; i < 40; i++) {
      after = await P.page.evaluate(() => ({ zone: window._gameState.current.currentZone, toast: !!document.querySelector('[data-store-toast]'), banner: !!document.querySelector('[data-quest-banner]'), gone: window.__lgVeilGone }));
      if (after.toast && after.banner) break;
      await P.page.waitForTimeout(250);
    }
    await shot('4-after-veil');
    const bad4 = await P.page.evaluate(() => window.__lgBad.slice());
    rec.ok(`4. a zone's veil (the farm: ${went ? 'Travel to Farm' : 'NO BUTTON'}, veil ${veil}): the toast and the banner that came under it are not in the page while it is up (${JSON.stringify(during)}), and show once it has gone (${JSON.stringify(after)})`,
      went && veil && !!during && !during.toast && !during.banner && !!after && after.toast && after.banner && bad4.length === 0, { during, after, bad4: bad4.slice(0, 5) });

    const allBad = t.bad.concat(await P.page.evaluate(() => window.__lgBad.slice()));
    rec.ok(`5. no pop-up in the page with a loading screen (${allBad.length}); no page errors (${errors.length})`, allBad.length === 0 && errors.length === 0, { allBad: allBad.slice(0, 5), errors: errors.slice(0, 3) });
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
