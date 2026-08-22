/* A REAL special attack, with a shield on: slung or held? (v2.3.1838)
 *
 * Owner: "the screenshot showing the special attack facing north but the
 * shield showing in front of the character (shield should be on back)", and
 * then the theory that made this test worth writing: "maybe special
 * circumstances apply during the tutorial when you're supposed to perform the
 * special attack".
 *
 * WHY THE EARLIER TEST MISSED IT.  mp-specshield SYNTHESISED the special by
 * setting S.isSwinging and S._specialAttack directly.  That reproduces the
 * flags but not the PATH, and the path is the whole question here: a special
 * is a quick swipe on the RIGHT joystick, which is the same stick that raises
 * the shield on a double-tap-and-hold.  Anything that stick leaves behind —
 * _shieldUp, a bash pose, a stale guard angle — changes which shield is drawn,
 * because _placeStandInShield bails out entirely when the shield is HELD
 * ("held beats slung") and the held sprite lives in a container that cannot be
 * ordered against the stand-in at all.
 *
 * So this fires the real specialAttack() the way mp-questcoach does — the
 * desktop key, which runs the same function the swipe does, gates and all —
 * and samples the whole swing window.  A shield on his BACK is the slung pair
 * of clones; a shield in his HAND is anything else.
 */
import * as H from './harness.mjs';
import fsMod from 'fs';

const ANG = { north: -Math.PI / 2, east: 0, south: Math.PI / 2, west: Math.PI };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Spec2', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  const setup = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const R = S.rpg || {};
    if (!R.shield) R.shield = { id: 'wood-shield', name: 'Pine Shield', type: 'shield' };
    /* A fresh character's kit is in the BAG, not on the body — mp-questcoach
       asserts exactly that — so specialAttack() refuses with no weapon in
       hand and nothing fires.  Take one out of the stash if there is one
       (the real object, with the real stats), and fall back to the same
       greatsword literal mp-blockstance uses only if the stash is empty. */
    if (!R.weapon) {
      const stash = R.weaponStash || [];
      const i = stash.findIndex((w) => w && w.type === 'greatsword');
      if (i >= 0) R.weapon = stash.splice(i, 1)[0];
      else if (stash.length) R.weapon = stash.pop();
      else R.weapon = { type: 'greatsword', name: 'Copper Great Sword', dmg: 5 };
    }
    /* The special is gated on more than a weapon; report what it can see so a
       refusal names itself instead of looking like "the flag never set". */
    return { hasShield: !!R.shield, hasWeapon: !!R.weapon,
      weapon: R.weapon && (R.weapon.id || R.weapon.type),
      mana: R.mana, maxMana: R.maxMana, stamina: R.stamina, dead: !!S._dead,
      fromStash: (R.weaponStash || []).length };
  });
  rec.ok('the character has a weapon and a shield to fight with (guard)',
    !!(setup && setup.hasShield && setup.hasWeapon), setup);

  for (const dir of ['north', 'northeast', 'south']) {
    const a = ANG[dir] != null ? ANG[dir] : -Math.PI / 4;
    /* Aim, from a rAF — _facingAngle is slewed, so a one-shot write is gone
       before the next draw. */
    await P.page.evaluate((ang) => {
      window.__fa = { on: true, a: ang };
      const tick = () => {
        const S = window._gameState && window._gameState.current;
        if (S && window.__fa && window.__fa.on) {
          S._aimAngle = ang; S._lastAimAngle = ang; S._facingAngle = ang;
          if (S.player) { S.player.vx = 0; S.player.vy = 0; }
        }
        if (window.__fa && window.__fa.on) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, a);
    await P.page.waitForTimeout(800);

    /* FIRE A REAL ONE — same entry point mp-questcoach uses. */
    await P.page.evaluate(() => { window.__shots = []; });
    await P.page.keyboard.press('f');

    /* Sample the whole swing window, not one moment: the shield could be
       right at the start and wrong two frames later. */
    for (let i = 0; i < 22; i++) {
      await P.page.evaluate(() => {
        const S = window._gameState && window._gameState.current;
        const si = window.__btStandInShield;
        const bp = window.__btBlockPose;
        window.__shots.push({
          special: !!S._specialAttack, swinging: !!S._swordSwinging,
          shieldUp: !!S._shieldUp, bash: !!S._bashPose,
          blockPose: !!S._blockPose, bowShowing: !!S._bowShowing,
          slungOn: !!(si && si.on), slungBehind: !!(si && si.behind),
          slungFront: !!(si && si.front),
          heldVisible: !!(bp && bp.shieldSpriteVisible),
          facing: S._renderFacing, src: S._facingSrc,
        });
      });
      await P.page.waitForTimeout(45);
    }
    if (process.env.BT_SPEC_SHOTS) {
      /* Fire a second one and photograph it mid-swing, clipped to the player.
         The state assertions above say the shield is slung; a picture is what
         the owner can actually compare against what they saw. */
      await P.page.keyboard.press('f');
      await P.page.waitForTimeout(140);
      try {
        const clip = await P.page.evaluate(() => {
          const b = window.__btBlockPose, cv = document.querySelector('canvas');
          const S = window._gameState.current;
          if (!cv) return null;
          const r = cv.getBoundingClientRect();
          /* pixi toGlobal is CSS px; the camera holds the player centred. */
          const cx = r.left + (b && b.screen ? b.screen.x : r.width / 2);
          const cy = r.top + (b && b.screen ? b.screen.y : r.height / 2);
          const SZ = 150;
          return { x: Math.max(0, cx - SZ / 2), y: Math.max(0, cy - SZ * 0.62),
            width: SZ, height: SZ };
        });
        fsMod.mkdirSync('tools/qa/mp/out', { recursive: true });
        await P.page.screenshot({ path: `tools/qa/mp/out/spa-${dir}.png`, ...(clip ? { clip } : {}) });
      } catch (e) { /* a missing shot must not fail the run */ }
      await P.page.waitForTimeout(600);
    }
    const shots = await P.page.evaluate(() => window.__shots);
    await P.page.evaluate(() => { window.__fa.on = false; });

    const during = shots.filter((s) => s.special || s.swinging);
    rec.ok(`${dir}: the special actually ran (guard)`, during.length > 0,
      { frames: shots.length, during: during.length, first: shots[0] });
    if (!during.length) continue;

    /* THE ASK: during a special the shield is on his BACK — the slung pair —
       because both hands are on the weapon. */
    const noShield = during.filter((s) => !s.slungOn && !s.heldVisible);
    const held = during.filter((s) => s.heldVisible);
    rec.ok(`${dir}: the shield is on his BACK for the whole special, never in hand`,
      held.length === 0,
      { heldFrames: held.length, ofFrames: during.length, examples: held.slice(0, 4) });
    rec.ok(`${dir}: ...and it is drawn at all, not dropped mid-swing`,
      noShield.length === 0,
      { missingFrames: noShield.length, ofFrames: during.length,
        examples: noShield.slice(0, 4) });
    /* And the block stand-in must not hijack a swing: it is a different pose
       entirely, and if _shieldUp survives the swipe it would. */
    const blocked = during.filter((s) => s.blockPose || s.shieldUp);
    rec.ok(`${dir}: the swipe did not leave him in a BLOCK while swinging`,
      blocked.length === 0,
      { frames: blocked.length, examples: blocked.slice(0, 4) });

    await P.page.waitForTimeout(700);
  }
}
