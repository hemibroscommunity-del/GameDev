/* ═══ A SPRINT, SEEN AND HEARD (v2.3.3015) ═══
 *
 * Asked of the sprint "other players' legs run at walking pace when they
 * sprint; no sprint sound or dust at the feet", the owner, 2026-10-03: "Yes
 * continue working on those items".
 *
 * Two real players against a real worker, in the Wheel's Brotown, the second
 * standing beside the first:
 *   1. the runner's first stride pushes off: the push-off sound
 *      (BT_AUDIO.sprintPush), and dust at every footfall of the sprint
 *      (game/sprint.js sprintDust, on the jog's own foot-plant frames);
 *   2. the watcher hears from the worker that the runner sprints (`spr` on the
 *      tick's player, server/src/tick.js), and draws the runner's legs at
 *      sprint pace -- the jog loop SPRINT_MULT quicker -- kicking up dust;
 *   3. once the runner walks again, the watcher's copy walks too: no `spr`,
 *      the loop back to its walking length;
 *   4. no page errors on either side.
 * A picture of the watcher's view: tools/qa/mp/out/sprintpeer-watcher.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const VIEW = { width: 900, height: 700 };
const MULT = 1.33;   /* SPRINT_MULT (game/sprint.js) */

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const A = await H.newPlayer(browser, { name: 'Runner', wsPort, webPort, world: 'wheel', viewport: VIEW });
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, world: 'wheel', viewport: VIEW, guest: true });
  await H.enterWorld(A);
  await H.enterWorld(B);
  const inWheel = async (P) => {
    for (let i = 0; i < 120; i++) {
      const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
      if (z === 'wheel') return true;
      await P.page.waitForTimeout(500);
    }
    return false;
  };
  const okA = await inWheel(A), okB = await inWheel(B);
  await A.page.waitForTimeout(2500);
  const idA = await H.readState(A, (S) => S.myId);
  const idB = await H.readState(B, (S) => S.myId);
  /* past the Mayor's gate (the commons is all this needs, but a held player
     is walked back inside it) */
  await H.devOp(wsPort, 'quests', idA);
  await H.devOp(wsPort, 'quests', idB);
  /* real input on a loop on both: a page logs itself out after two minutes
     without any (Control does nothing in the game) */
  let stopAlive = false;
  for (const P of [A, B]) {
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
  }
  /* open ground in the town square: the runner west of it, the watcher a
     little south of the line the runner will run along */
  const spot = await A.page.evaluate(() => {
    const S = window._gameState.current, W = window.__btWheelObjects;
    for (let r = 300; r <= 1600; r += 50) {
      for (let a = 0; a < 360; a += 10) {
        const x = 21504 + Math.cos(a * Math.PI / 180) * r, y = 21504 + Math.sin(a * Math.PI / 180) * r;
        let clear = true;
        for (let dx = -200; dx <= 520 && clear; dx += 40) {
          if (window.__btIsSolid && (window.__btIsSolid(x + dx, y) || window.__btIsSolid(x + dx, y + 60))) clear = false;
          if (clear && W && W.near && W.near(x + dx, y, 40).length) clear = false;
        }
        if (clear) return { x, y };
      }
    }
    return { x: S.player.x, y: S.player.y };
  });
  await H.hopTo(A, spot.x, spot.y, { step: 100, gap: 260, tries: 60 });
  await H.hopTo(B, spot.x + 160, spot.y + 70, { step: 100, gap: 260, tries: 60 });
  await A.page.waitForTimeout(1500);
  const seen = await B.page.evaluate((id) => !!(window._gameState.current.others || {})[id], idA);
  rec.ok(`setup: both in the Wheel's Brotown, the watcher beside the runner and seeing them`, okA && okB && seen, { okA, okB, seen, spot });

  /* ── 1-2. the sprint ── */
  /* the page's frame rate rides along in the details: a test machine draws a
     few frames a second, and the dust must not depend on drawing every one */
  const fpsOn = () => { window.__rafN = 0; window.__rafT0 = performance.now(); (function f() { window.__rafN++; requestAnimationFrame(f); })(); };
  const fpsOf = () => Math.round(window.__rafN / Math.max(0.001, (performance.now() - window.__rafT0) / 1000) * 10) / 10;
  await A.page.evaluate(() => { window.__btSprintDust = 0; if (window.BT_AUDIO) window.BT_AUDIO._lastSprintSound = null; });
  await A.page.evaluate(fpsOn);
  await B.page.evaluate(fpsOn);
  await B.page.evaluate(() => { window.__btPeerSprintDust = 0; window.__btPeerJogCyc = Object.create(null); });
  await A.page.keyboard.down('Shift');
  await A.page.keyboard.down('d');
  let watch = null;
  for (let i = 0; i < 16; i++) {
    await B.page.waitForTimeout(150);
    watch = await B.page.evaluate((id) => {
      const o = (window._gameState.current.others || {})[id];
      const c = (window.__btPeerJogCyc || {})[id] || null;
      return { sp: !!(o && o._sp), cyc: c, dust: window.__btPeerSprintDust || 0 };
    }, idA);
    if (watch.sp && watch.cyc && watch.cyc.sp && watch.dust > 0 && i >= 6) break;
  }
  watch.fps = await B.page.evaluate(fpsOf);
  await B.page.screenshot({ path: join(OUT, 'sprintpeer-watcher.png') }).catch(() => {});
  const runner = await A.page.evaluate(() => ({ sprinting: !!(window._gameState.current._sprint && window._gameState.current._sprint.on),
    push: window.BT_AUDIO && window.BT_AUDIO._lastSprintSound, dust: window.__btSprintDust || 0,
    jog: window.__btJogCyc || null }));
  runner.fps = await A.page.evaluate(fpsOf);
  await A.page.keyboard.up('d');
  await A.page.keyboard.up('Shift');
  rec.ok(`runner: the first stride pushes off (${runner.push}) and every footfall of the sprint kicks up dust (${runner.dust} puffs)`,
    runner.push === 'push' && runner.dust >= 2, runner);
  const ratio = watch && watch.cyc ? watch.cyc.base / watch.cyc.cyc : 0;
  rec.ok(`watcher: the worker says the runner sprints, and their legs run ${ratio.toFixed(2)}x quicker (the loop ${watch && watch.cyc && Math.round(watch.cyc.cyc)} ms against ${watch && watch.cyc && Math.round(watch.cyc.base)})`,
    !!watch && watch.sp && Math.abs(ratio - MULT) < 0.01, watch);
  rec.ok(`watcher: ...kicking up dust at their footfalls (${watch && watch.dust} puffs)`, !!watch && watch.dust >= 1, watch);

  /* ── 3. walking again ── */
  await A.page.keyboard.down('a');
  let after = null;
  for (let i = 0; i < 16; i++) {
    await B.page.waitForTimeout(150);
    after = await B.page.evaluate((id) => {
      const o = (window._gameState.current.others || {})[id];
      const c = (window.__btPeerJogCyc || {})[id] || null;
      return { sp: !!(o && o._sp), cyc: c };
    }, idA);
    if (!after.sp && after.cyc && !after.cyc.sp && i >= 6) break;
  }
  await A.page.keyboard.up('a');
  rec.ok(`watcher: walking again, the runner's copy walks too -- no sprint, the loop back to ${after && after.cyc && Math.round(after.cyc.cyc)} ms`,
    !!after && !after.sp && !!after.cyc && Math.abs(after.cyc.cyc - after.cyc.base) < 1, after);

  stopAlive = true;
  const errs = [...A.logs, ...B.logs].filter((l) => /pageerror/.test(l));
  rec.ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  void idB;
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
