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

  /* ═══ v2.3.2278: AND THE CASE THE OWNER ACTUALLY REPORTED ═══
     Owner: "Fishing animation the reel hand while wearing leg armor gets cut
     off."  Everything above runs on the DEFAULT character, whose tee is what
     makes _shirtW true -- so the overlay was being built for the reason the
     shirt case needs, and the greaves case was never exercised at all.  With
     the shirt OFF and greaves ON, the local gate was `(_chestW || _shirtW)`
     and neither held: no overlay was built, so there was nothing to lift, and
     _gearLegs (child index 9, above _bodyHead at 4) drew straight over the
     reeling fist.
     Stripping the shirt first is the whole point of the fixture -- leaving it
     on would let _shirtW carry the assertion and it would pass against the
     unfixed build. */
  await P.page.evaluate(() => {
    /* CLEAR THE PROBE FIRST.  __btFishTop is written by _placeFishHead, and
       the whole question below is whether that function runs at all for a
       legs-only angler -- so a stale reading from the shirt phase above would
       make this pass against the very build it exists to fail. */
    window.__btFishTop = null;
    window.__btGearSet('shirt', 'none');
    window.__btGearSet('chest', 'none');
    window.__btGearSet('legs', 'steelgreaves');
  });
  await P.page.waitForTimeout(1400);
  const worn = await P.page.evaluate(() => (window.__btGearCatalog ? window.__btGearCatalog() : null));
  const legs = await P.page.evaluate(() => window.__btFishTop || null);
  console.log('    greaves-only overlay: ' + JSON.stringify(legs));
  rec.ok('greaves on, shirt off, chest off (guard: the other two must not carry this)',
    !!(worn && worn.worn) && worn.worn.legs === 'steelgreaves'
      && worn.worn.shirt === 'none' && worn.worn.chest === 'none', worn && worn.worn);
  rec.ok('the overlay is built for a legs-only angler at all (it was not)',
    !!legs && legs.rod > 0, legs);
  rec.ok('...and the reel hand rides up over the greaves',
    !!legs && legs.grip > 0, legs);
  rec.ok('...still an arm, not the torso',
    !!legs && legs.grip < legs.w * legs.h * 0.12, legs);

  await P.ctx.close().catch(() => {});
}
