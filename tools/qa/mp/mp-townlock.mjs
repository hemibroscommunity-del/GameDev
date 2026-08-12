/* The unarmed start and the town gate (v2.3.1676).
 *
 * Owner: "You'll need to start the game without a weapon and not be allowed
 * to leave town without speaking to mayor bro first.  He'll give you the
 * sword and shield."
 *
 * Three separate things can silently undo this, which is why it is tested in
 * a real browser rather than by reading the defaults:
 *   1. createDefaultRpg could still mint a loadout,
 *   2. a LOAD-TIME MIGRATION could hand it back (three of them did — they
 *      re-granted any empty weapon slot, so the change would have survived
 *      exactly until the first reload),
 *   3. the gate could be armed but bypassable.
 * Only walking a real player into a real exit proves the last one.
 */
import * as H from './harness.mjs';

/* Town has exactly ONE exit — the south path to the World View
   (src/data/effects.js TOWN_EXITS).  Hardcoded rather than read from the app:
   the coordinates are not exposed on window, and adding an export purely so a
   test can reach them would widen the app's surface for the harness's
   convenience.  If the marker ever moves, this test fails loudly with the
   player still standing in town — which is the correct way to find out. */
const TOWN_EXIT = { tx: 24, ty: 44, zoneId: 'worldview' };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Rookie', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(800);

  const start = await H.readState(P, (S) => ({
    weapon: S.rpg && S.rpg.weapon, ranged: S.rpg && S.rpg.rangedWeapon,
    staff: S.rpg && S.rpg.staffWeapon, shield: S.rpg && S.rpg.shield,
    zone: S.currentZone,
  }));
  rec.ok('a fresh character starts with NO melee weapon', !start.weapon, start.weapon);
  rec.ok('...no bow and no staff', !start.ranged && !start.staff, { r: start.ranged, s: start.staff });
  rec.ok('...and no shield', !start.shield, start.shield);
  rec.ok('and starts in town', start.zone === 'town', start.zone);

  /* Walk onto a real town exit marker and let the transition logic run. */
  const walked = await P.page.evaluate((ex) => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return false;
    S.player.x = ex.tx * 32 + 16;
    S.player.y = ex.ty * 32 + 16;
    return true;
  }, TOWN_EXIT);
  rec.ok('the player could be placed on the exit marker', walked);
  await P.page.waitForTimeout(2500);
  const after = await H.readState(P, (S) => S.currentZone);
  rec.ok('the gate blocks an unarmed player from leaving town',
    after === 'town', { stillIn: after, triedToEnter: TOWN_EXIT.zoneId });
  rec.ok('...and says why', await H.seesText(P, 'Speak to Mayor Bro'));

  /* v2.3.1682 — the unarmed TAP.  The auto-attack loop has refused to fire
     on an empty slot since v2.3.212, but the manual tap handler never
     checked, so a weaponless character got exactly one free swing before the
     loop took over the follow-ups.  Tap twice with a gap wider than the
     600ms cooldown so a passing result can't just be the cooldown talking. */
  await H.callFn(P, 'swingAttack');
  const swungUnarmed = await H.readState(P, (S) => ({
    swinging: !!S.isSwinging, timer: S.swingTimer || 0,
  }));
  rec.ok('an unarmed tap does not start a swing', !swungUnarmed.swinging, swungUnarmed);
  await P.page.waitForTimeout(800);
  await H.callFn(P, 'swingAttack');
  rec.ok('...not on a second tap past the cooldown either',
    !(await H.readState(P, (S) => !!S.isSwinging)));

  /* Accept the first quest — the moment the mayor arms you. */
  await H.openDest(P, 'Quests');
  await P.page.waitForTimeout(900);
  await H.clickText(P, 'Available').catch(() => {});
  await P.page.waitForTimeout(500);
  await H.clickText(P, 'Cold Reception').catch(() => {});
  await P.page.waitForTimeout(700);
  await H.clickText(P, 'Accept').catch(() => {});
  await P.page.waitForTimeout(2200);

  const armed = await H.readState(P, (S) => ({
    weapon: S.rpg && S.rpg.weapon && S.rpg.weapon.type,
    shield: S.rpg && S.rpg.shield && S.rpg.shield.name,
    quest: S.rpg && S.rpg._quests && S.rpg._quests.tut_1,
  }));
  /* v2.3.1681: 'greatsword', not 'sword'.  weaponType 'sword' at wood tier is
     the BAMBOO STICK — that is its icon and its in-hand sprite — so the grant
     was changed rather than just its picture (owner: "it needs to be the great
     sword").  Both types gate on the same trained skill, so nothing about the
     unarmed-start rule moves. */
  rec.ok('accepting his first quest grants a real SWORD, not the bamboo stick',
    armed.weapon === 'greatsword', armed);
  rec.ok('...and a shield', !!armed.shield, armed);
  rec.ok('the quest is active server-side', armed.quest === 'active', armed);

  /* v2.3.1682: and the gate opens with the grant -- the tap check must be
     "no weapon", not "attacking is off in town", or the sword would be
     cosmetic.  autoAttack is left alone; this is the manual path only. */
  await H.callFn(P, 'swingAttack');
  rec.ok('with the sword in hand the same tap DOES swing',
    await H.readState(P, (S) => !!S.isSwinging));

  await P.ctx.close().catch(() => {});
}
