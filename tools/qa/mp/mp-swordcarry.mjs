/* THE CARRIED SWORD POINTS UP, AND FORWARD (v2.3.1786).
 *
 * Owner: "can you invert the sword held angle so instead of running around
 * with it facing downward it points upward?" — then, on the first cut: "The
 * sword needs to always aim forward though.  And I'm just talking about
 * JOGGING and IDLE sword position, not attacking."
 *
 * That correction is the property under test, and it is why this asserts the
 * SIGN OF scale.y rather than "the sword looks different".  There are two ways
 * to point a blade up and they are not interchangeable:
 *   - rotation by 180 degrees inverts BOTH axes, so the blade ends up up and
 *     BACK, over the shoulder, away from the way he is running;
 *   - a vertical flip inverts only the vertical, so the art's baked forward
 *     lean survives and the blade points up and FORWARD.
 * The first cut used the rotation and had to be redone.  A screenshot check
 * would have passed against both.
 *
 * MEASURED BASELINE (copper greatsword, idle, all eight facings):
 *     scaleY -0.24 on every facing, rotation 0, visible true
 *     scaleX +/-0.24, sign carrying the per-facing mirror, untouched
 *
 * NOTE FOR ANYONE EXTENDING THIS: do not set S.autoAttack to drive the weapon
 * on.  isInCombat is unconditionally true (SHEATHED_DEFAULT_ENABLED is false),
 * so it is not needed — and autoAttack makes the bro swing on his own, so the
 * probe lands mid-swing on the stand-in.  That cost me an hour reading it as
 * texture corruption.
 */
import * as H from './harness.mjs';

const NAMES = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

async function face(P, idx) {
  await P.page.evaluate((i) => {
    const S = window._gameState.current;
    S._facingAngle = i * Math.PI / 4; S._aimAngle = i * Math.PI / 4;
    S.lockedMonster = null; S.isSwinging = false; S.swingTimer = 0; S.autoAttack = false;
  }, idx);
  await P.page.waitForTimeout(280);
  /* Re-assert the weapon right before reading: the worker is authoritative for
     equipment and its player_state delta clears a client-side assignment
     within about a second. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.activeSlot = 'melee';
    S.rpg.weapon = { name: 'Copper Great Sword', type: 'greatsword', gearBase: 'copper' };
  });
  await P.page.waitForTimeout(140);
  return P.page.evaluate(() => window.__btWeapon || null);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Carry', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  const first = await face(P, 2);
  rec.ok('the carried sword is drawn at all', !!(first && first.visible), { probe: first });
  if (!first) { await P.ctx.close().catch(() => {}); return; }
  /* GUARD: the per-facing art actually resolved.  Without this every sign
     assertion below is satisfied by an empty texture. */
  rec.ok('the greatsword art resolved (guard)', first.texW > 0 && first.texH > 0,
    { texW: first.texW, texH: first.texH });

  const seen = [];
  for (let i = 0; i < 8; i++) {
    const m = await face(P, i);
    seen.push({ f: NAMES[i], scaleY: m && m.scaleY, scaleX: m && m.scaleX, rot: m && m.rotation });
    rec.ok(`${NAMES[i]}: the facing under test is the one that rendered (guard)`,
      !!(m && m.facing), { probe: m });
    rec.ok(`${NAMES[i]}: the blade points UP`, !!(m && m.bladeUp && m.scaleY < 0),
      { bladeUp: m && m.bladeUp, scaleY: m && m.scaleY });
    /* FORWARD, not backward: a 180-degree rotation would also read as
       "blade up", so pin rotation to 0 — with rotation 0 the only thing
       inverted is the vertical, which is what keeps the art's forward lean. */
    rec.ok(`${NAMES[i]}: ...by flipping, not rotating, so the lean stays forward`,
      !!(m && Math.abs(m.rotation) < 1e-6), { rotation: m && m.rotation });
    /* The per-facing horizontal mirror must be untouched by any of this. */
    rec.ok(`${NAMES[i]}: the facing mirror is left alone`,
      !!(m && Math.abs(Math.abs(m.scaleX) - Math.abs(m.scaleY)) < 1e-6),
      { scaleX: m && m.scaleX, scaleY: m && m.scaleY });
  }
  console.log('    facings', JSON.stringify(seen));

  /* ── v2.3.1787: WHICH SIDE OF THE BODY THE BLADE IS ON ──
     Owner: "SW SE and E need the sword layered in front of" ... "Looks like it
     is probably the shirt."  In front for E/SE/S/SW/NE, behind for W/NW/N —
     the facings where you are looking at his back. */
  const FRONT = new Set(['E', 'SE', 'S', 'SW', 'NE']);
  for (let i = 0; i < 8; i++) {
    const m = await face(P, i);
    const want = FRONT.has(NAMES[i]);
    rec.ok(`${NAMES[i]}: the blade is ${want ? 'in front of' : 'behind'} the body`,
      !!m && (m.wcIdx > m.spriteBodyIdx) === want,
      { wcIdx: m && m.wcIdx, spriteBodyIdx: m && m.spriteBodyIdx, expectedInFront: want });
  }

  /* THE SHIRT, WHICH IS WHAT THIS WAS ACTUALLY ABOUT.  "In front" used to be
     measured against _spriteBody — which is NOT DRAWN (v2.3.608 made it the
     invisible transform reference the gear copies), so the blade landed under
     every worn layer.  Bare, the shirt is baked into the body sheet and the
     bug is invisible; put a chest plate on and it is the whole defect.  This
     is the case that would silently regress if someone re-anchored to
     _spriteBody again. */
  await P.page.evaluate(() => { try { window.__btSetGear('chest', 'copperplate'); } catch (e) {} });
  await P.page.waitForTimeout(900);
  const armoured = await face(P, 0);
  console.log('    armoured E', JSON.stringify(armoured));
  if (armoured && armoured.gearChestVis) {
    rec.ok('with a chest plate on, the blade still clears it',
      armoured.wcIdx > armoured.gearChestIdx,
      { wcIdx: armoured.wcIdx, gearChestIdx: armoured.gearChestIdx });
  } else {
    rec.ok('the chest plate actually went on (guard for the check above)',
      false, { gearChestVis: armoured && armoured.gearChestVis });
  }
  await P.page.evaluate(() => { try { window.__btSetGear('chest', 'none'); } catch (e) {} });
  await P.page.waitForTimeout(600);

  /* ATTACKING IS NOT THIS.  The owner drew the line explicitly, and the swing
     lives in its own branch — so a swing must still drive rotation and leave
     the blade unflipped. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.activeSlot = 'melee';
    S.rpg.weapon = { name: 'Copper Great Sword', type: 'greatsword', gearBase: 'copper' };
    S._facingAngle = 0; S._aimAngle = 0;
    S.isSwinging = true; S.swingTimer = Date.now(); S._swingAng = 0;
  });
  await P.page.waitForTimeout(90);
  const sw = await P.page.evaluate(() => window.__btWeapon || null);
  console.log('    mid-swing', JSON.stringify(sw));
  if (sw) {
    rec.ok('a swing is not flipped — it keeps its own rotation path',
      sw.bladeUp === false && sw.scaleY > 0, { bladeUp: sw.bladeUp, scaleY: sw.scaleY });
  }

  await P.ctx.close().catch(() => {});
}
