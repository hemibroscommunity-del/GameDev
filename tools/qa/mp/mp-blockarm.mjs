/* THE RAISED SHIELD IS HELD BY AN ARM (v2.3.1785 + 1788 + 1789).
 *
 * Owner: "I might be able to re use some bow shooting animation frames to make
 * it look like the arm held outward is holding the shield.  Right now it's just
 * floating" — then, after I tried masking the walking body instead: "There is
 * no outstretched arm the shield orbits the body.  Thats why you need the bow
 * frames for the outstretched arm."
 *
 * A mask only reveals pixels that are already there, and the stand/jog frames
 * draw the arms at the sides.  So the arm is CUT from the bow-shot sheets,
 * which do contain an outstretched one, as a texture sub-frame — no new files
 * and nothing extra to load.
 *
 * The two things that kept v2.3.1785 disabled are what this file mostly
 * guards, because both were invisible in the obvious test:
 *   - SKIN.  The bow art is painted oranger than the walking art, and on the
 *     default skin no recolour target was applied, so the arm did not match the
 *     body it was composited onto.  v2.3.1788 fixed it a layer up.
 *   - SLEEVE.  The arm is cut from the BALD body sheet, so an armoured bro
 *     reached out with a bare arm.  v2.3.1789 cuts the same rect from the worn
 *     chest piece's `bowshot` strip.
 *
 * MEASURED BASELINE (pine shield raised, 390x844):
 *     E/SE/SW/W  arm drawn, cut 78x32 (east) or 58x34 (southwest)
 *     S          NO arm — the bow's south frames are foreshortened, both hands
 *                sit on the chest, so there is nothing to cut.  The shield
 *                falls back to its free-floating placement there, deliberately.
 *     bare       sleeve hidden;  copperplate  sleeve drawn and tinted
 */
import * as H from './harness.mjs';

const ARMED = ['E', 'SE', 'SW', 'W'];          /* facings that get an arm */
const IDX = { E: 0, SE: 1, S: 2, SW: 3, W: 4 };

async function face(P, name) {
  await P.page.evaluate((k) => {
    const S = window._gameState.current;
    S._facingAngle = k * Math.PI / 4; S._aimAngle = k * Math.PI / 4; S._shieldAngle = k * Math.PI / 4;
    S._shieldUp = true; S.lockedMonster = null;
    S.rpg.shield = { name: 'Pine Shield', type: 'shield' };
  }, IDX[name]);
  await P.page.waitForTimeout(340);
  return P.page.evaluate(() => window.__btBlockArm || null);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Arm', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  const first = await face(P, 'E');
  rec.ok('the block arm is drawn at all', !!(first && first.on && first.armVisible), { probe: first });
  if (!first || !first.on) { await P.ctx.close().catch(() => {}); return; }
  /* GUARD: the cut resolved to real pixels.  Without it every assertion below
     is satisfied by an empty texture. */
  rec.ok('the arm cut has real dimensions (guard)', first.armW > 0 && first.armH > 0,
    { armW: first.armW, armH: first.armH });

  for (const n of ARMED) {
    const m = await face(P, n);
    rec.ok(`${n}: an arm reaches out to the shield`, !!(m && m.on && m.armVisible), { probe: m });
    rec.ok(`${n}: bare, the arm has no sleeve`, !!(m && !m.sleeveVisible),
      { sleeveVisible: m && m.sleeveVisible, worn: m && m.worn });
    /* The shield is held IN the hand — the placement returns the hand point and
       the caller puts the shield there, so a regression that reverts to the
       free-floating angle placement shows up as a missing hand. */
    rec.ok(`${n}: the placement reports a hand for the shield to sit in`,
      !!(m && m.hand && Number.isFinite(m.hand.x) && Number.isFinite(m.hand.y)),
      { hand: m && m.hand });
    /* The arm must sit UNDER the shield, so the boss covers the hand. */
    rec.ok(`${n}: the arm is drawn beneath the shield`,
      !!(m && m.shieldIdx > m.armIdx), { armIdx: m && m.armIdx, shieldIdx: m && m.shieldIdx });
  }

  /* SOUTH HAS NO ARM, and that is the honest state of the art rather than a
     gap to paper over — asserted so nobody "fixes" it by pointing south at a
     sheet that cannot supply one. */
  const south = await face(P, 'S');
  rec.ok('facing the camera there is no arm, and it says so',
    !!(south && south.on === false && south.hasSheet === false),
    { probe: south });

  /* THE SLEEVE.  This is the half that a bare-bro test cannot see at all. */
  await P.page.evaluate(() => { try { window.__btSetGear('chest', 'copperplate'); } catch (e) {} });
  await P.page.waitForTimeout(1000);
  for (const n of ['E', 'SW']) {
    const m = await face(P, n);
    rec.ok(`${n}: a worn chest piece reaches out with the arm`,
      !!(m && m.sleeveVisible && m.sleeveW > 0),
      { sleeveVisible: m && m.sleeveVisible, sleeveW: m && m.sleeveW, worn: m && m.worn });
    rec.ok(`${n}: ...and the sleeve is tinted to its metal`,
      !!(m && m.sleeveTint != null && m.sleeveTint !== 0xffffff),
      { sleeveTint: m && m.sleeveTint });
  }
  await P.page.evaluate(() => { try { window.__btSetGear('chest', 'none'); } catch (e) {} });
  await P.page.waitForTimeout(700);

  /* LOWERING THE SHIELD TAKES THE ARM WITH IT. */
  await P.page.evaluate(() => { window._gameState.current._shieldUp = false; });
  await P.page.waitForTimeout(400);
  const down = await P.page.evaluate(() => window.__btBlockArm || null);
  rec.ok('dropping the shield hides the arm', !!(down && down.on === false), { probe: down });

  await P.ctx.close().catch(() => {});
}
