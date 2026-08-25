/* "When fishing that hand needs to be over the shirt during the reel animation
 *  instead of under it." (owner)
 *
 * The fish pose draws in three layers: the body, the shirt/plate over it, then
 * a "top" overlay (_fishTopFrame) that lifts the head band and the rod back
 * above the gear. Below the head band that overlay keeps ONLY the rod's magenta
 * pixels — every other pixel is erased so the plate shows through — so the hand
 * gripping the rod stays down in the body layer, under the shirt.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Angler', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* Force the pose rather than walking to water: what is under test is the
     layering of the frames, not the route to them. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    window.__fishPin = () => {
      const s = window._gameState.current;
      if (!s) return;
      const now = Date.now();
      /* The SHAPE matters: mp-coppergear's working fixture supplies nodeRef and
         the window timings, and a minimal {status, skill} left the body in its
         stand pose. */
      s._extraction = { nodeId: 'qa', nodeRef: { id: 'qa', x: s.player.x + 20, y: s.player.y,
        gatherLvl: 1, alive: true, nodeType: 'water' },
        skill: 'fishing', startedAt: now, windowOpensAt: now + 4000,
        windowClosesAt: now + 6000, status: 'waiting', swipeSamples: [] };
      requestAnimationFrame(window.__fishPin);
    };
    window.__fishPin();
  });
  await P.page.waitForTimeout(1200);

  /* The overlay's own census. The fix is a BOUNDED amount of extra coverage:
     zero grip pixels is the reported bug (the hand left under the shirt), and
     a flood of them would undo v2.3.1123 by painting the torso back over the
     chest plate. Assert both ends. */
  await P.page.waitForTimeout(900);
  const top = await P.page.evaluate(() => window.__btFishTop || null);
  console.log('    fish top overlay: ' + JSON.stringify(top));
  rec.ok('the fish overlay was built at all (guard)', !!top && top.rod > 0, top);
  if (!top) { await P.ctx.close().catch(() => {}); return; }
  rec.ok('the GRIP now rides up with the rod (was 0 — the hand stayed under the shirt)',
    top.grip > 0, top);
  /* The upper bound is about the TORSO, not about the rod. The arm holding
     the rod SHOULD come forward — that is the fix — so a ratio against the
     rod's own pixel count was measuring the wrong thing (a thin diagonal rod
     is ~100px while a legitimate forearm is several hundred). What must never
     happen is the body flooding back over the chest plate, undoing v2.3.1123.
     Measured on the real pose: rod ~100, grip ~510 on a 128px frame, about 5%
     of the area below the head band; a torso flood is several times that. */
  rec.ok('...and it is an arm, not the whole torso (v2.3.1123 still holds)',
    top.grip < top.w * top.h * 0.12, top);

  await P.ctx.close().catch(() => {});
}
