/* THE CUT ARM IS NOW A MEASUREMENT, NOT A PICTURE (v2.3.1785 → v2.3.1800).
 *
 * This file used to assert that an arm cut out of the bow sheets was DRAWN
 * over the walking body.  It was, and it worked, and the owner then found what
 * was wrong with the whole idea:
 *
 *   "One downside to the shield arm is that jogging backwards still shows both
 *    arms moving AND the outstretched arm."
 *   "I can see a slight arm straight down on the southwest angle above where
 *    he's holding the shield straight out arm."
 *   "East (the mirror of west) is showing two arms.  The outstretched arm that
 *    came with the bow attack pose looks more natural.  I think if you just
 *    removed the extra arm you put on there it'd look natural."
 *
 * All three are the same fault: the body underneath already had two arms, so a
 * third was always going to show somewhere.  v2.3.1800 hands the block to the
 * BOW STAND-IN — the same art the arm was cut from, drawn whole — so the pose
 * brings its own outstretched arm and there is no body under it to poke out.
 *
 * What survives, and what this file now pins: the CUT still runs, because the
 * hand it computes is what the shield is positioned by.  Its sprites are just
 * never shown.  That distinction is the thing a future reader will get wrong —
 * "the arm isn't drawn, delete blockArm.js" would silently move the shield.
 *
 * The stand-in itself (legs jogging, top half held, south finally working) is
 * covered by mp-blockstance.mjs.
 */
import * as H from './harness.mjs';

const IDX = { E: 0, SE: 1, S: 2, SW: 3, W: 4 };

async function face(P, k) {
  await P.page.evaluate((kk) => {
    const S = window._gameState.current;
    S._facingAngle = kk * Math.PI / 4; S._aimAngle = kk * Math.PI / 4;
    S._shieldAngle = kk * Math.PI / 4; S._shieldKb = false;
    S._shieldUp = true; S.lockedTarget = null;
    S.rpg.shield = { name: 'Pine Shield', type: 'shield' };
  }, k);
  await P.page.waitForTimeout(360);
  return P.page.evaluate(() => ({
    arm: window.__btBlockArm || null,
    block: window.__btBlockPose || null,
  }));
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Arm', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  for (const n of ['E', 'SW', 'W']) {
    const m = await face(P, IDX[n]);
    /* THE CUT STILL RESOLVES.  Without this the "not drawn" assertions below
       would be satisfied by a cut that had stopped resolving to any pixels at
       all — which is the same screen, and a completely different bug. */
    rec.ok(`${n}: the arm cut still resolves to real pixels`,
      !!(m.arm && m.arm.armW > 0 && m.arm.armH > 0), m.arm);
    /* ...AND IS NOT DRAWN.  The pose has its own arm; this one would be a
       duplicate sitting a pixel off it, which is what the owner was seeing. */
    rec.ok(`${n}: ...and is NOT drawn — the stand-in brings its own arm`,
      !!(m.arm && !m.arm.armVisible), m.arm);
    /* The shield is still placed by that cut's hand. */
    rec.ok(`${n}: the stand-in is what renders the block`,
      !!(m.block && m.block.standIn), m.block);
    rec.ok(`${n}: the shield is drawn, held out`,
      !!(m.block && m.block.shieldW > 0), m.block);
  }

  /* Drop the shield and everything about the block goes with it. */
  await P.page.evaluate(() => { window._gameState.current._shieldUp = false; });
  await P.page.waitForTimeout(400);
  const down = await P.page.evaluate(() => ({
    arm: window.__btBlockArm || null,
    blockPose: !!(window._gameState.current._blockPose),
  }));
  rec.ok('dropping the shield ends the block pose', !down.blockPose, down);
  rec.ok('...and the arm stays hidden', !!(down.arm && !down.arm.armVisible), down.arm);

  await P.ctx.close().catch(() => {});
}
