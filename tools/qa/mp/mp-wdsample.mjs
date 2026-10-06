/* ═══ THE BLACK-SCREEN WATCHDOG'S SAMPLE, SHRUNK ON THE GPU (v2.3.3068) ═══
 *
 * Every 5 s the watchdog (BroTown.jsx _sampleLit) takes a 32 x 18 thumbnail of
 * the world canvas and counts the pixels that are neither black nor the
 * canvas's own navy.  It took it with drawImage, which copies the WHOLE WebGL
 * drawing buffer out of the GPU before shrinking it -- 11 MB on a 3x phone,
 * every 5 s; profiled on a phone-sized page with the CPU slowed 4x, ~10% of
 * the main thread, walking or fighting.  Now the GPU shrinks it
 * (blitFramebuffer into a 32 x 18 renderbuffer) and only those 576 pixels
 * come back.
 *
 * A phone (390 x 844, dpr 3) in the Wheel.  window.__btWdSample takes the
 * sample both ways in one animation frame, as the watchdog does:
 *   1. the GPU's way works here (WebGL2) and reads the drawn world lit, as the
 *      old way does -- within 3 points of it, at Brotown and at the coast;
 *   2. the owner's black screen (the stage hidden: only the canvas's navy,
 *      window.__btBlankStage, mp-glrestore) reads dark both ways;
 *   3. ...and the world drawn again reads lit again;
 *   4. what each costs the main thread: the old way once the GPU has finished
 *      the frame (a 1 x 1 read first -- the old way has to wait for that, and
 *      it is not counted here), the GPU's way asked for and collected a frame
 *      or two later with no wait at all: a fraction of the old one even
 *      before the wait the old way also pays.
 * The watchdog acting on it (strikes, the rebuild, nothing behind a veil) is
 * mp-glrestore's, which runs on the same sample.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Wdsample', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!ok, ok);
    if (!ok) return;
    await P.page.waitForTimeout(6000);
    const has = await P.page.evaluate(() => typeof window.__btWdSample === 'function');
    rec.ok('the watchdog\'s sample can be read both ways (guard: window.__btWdSample)', has);
    if (!has) return;
    const take = async (n) => {
      const out = [];
      for (let i = 0; i < n; i++) { out.push(await P.page.evaluate(() => window.__btWdSample())); await P.page.waitForTimeout(250); }
      return out;
    };

    /* 1. the drawn world, at Brotown and at the coast */
    const town = await take(4);
    console.log(`    Brotown: ${JSON.stringify(town)}`);
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    await P.page.evaluate(() => { const R = window._gameState.current.rpg; R._quests = R._quests || {}; R._quests.tut_1 = true; window._gameState.current.player.godMode = true; });
    const far = WHEEL_SPAWNS.tidal.points[0];
    await H.hopTo(P, far[0], far[1] + 40, { tries: 160 });
    await P.page.waitForTimeout(5000);
    const coast = await take(4);
    console.log(`    the Tidal land: ${JSON.stringify(coast)}`);
    const lit = [...town, ...coast];
    rec.ok(`the GPU's way works here and reads the drawn world lit: ${lit.map((r) => r && r.gl).join(', ')}% (the old way ${lit.map((r) => r && r.image).join(', ')}%)`,
      lit.every((r) => r && r.gl != null && r.gl >= 90), lit);
    rec.ok('...within 3 points of the old way, every sample', lit.every((r) => r && r.gl != null && Math.abs(r.gl - r.image) <= 3), lit.map((r) => r && [r.gl, r.image]));

    /* 2. the owner's black screen */
    const hook = await P.page.evaluate(() => { if (!window.__btBlankStage) return false; window.__btBlankStage(true); return true; });
    await P.page.waitForTimeout(800);
    const blank = await take(3);
    console.log(`    the owner's screen: ${JSON.stringify(blank)}`);
    rec.ok(`the owner's black screen (only the canvas's navy) reads dark both ways: ${blank.map((r) => r && r.gl).join(', ')}% (old ${blank.map((r) => r && r.image).join(', ')}%)`,
      hook && blank.every((r) => r && r.gl != null && r.gl < 1 && r.image < 1), { hook, blank });

    /* 3. drawn again */
    await P.page.evaluate(() => window.__btBlankStage(false));
    await P.page.waitForTimeout(800);
    const back = await take(2);
    rec.ok(`...and the world drawn again reads lit again: ${back.map((r) => r && r.gl).join(', ')}%`, back.every((r) => r && r.gl >= 90), back);

    /* 4. the cost, in the frame it is taken */
    const all = [...lit, ...blank, ...back].filter(Boolean);
    const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    const glMs = med(all.map((r) => r.glMs)), imMs = med(all.map((r) => r.imageMs)), waitMs = med(all.map((r) => r.frameWaitMs));
    const frames = med(all.map((r) => r.frames || 0));
    console.log(`    cost (median of ${all.length}): GPU ${glMs} ms of the main thread (asked, then collected ${frames} frame(s) later, no wait), the old way ${imMs} ms after the frame's own wait of ${waitMs} ms`);
    rec.ok(`what each costs in its frame: the GPU's way ${glMs} ms, the old way ${imMs} ms (median of ${all.length})`, glMs < imMs / 2, { glMs, imMs });
    const errors = P.logs.filter((l) => /pageerror/.test(l));
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 4));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
