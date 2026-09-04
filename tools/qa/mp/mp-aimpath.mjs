/* BOW AND MAGIC FLY WHERE YOU ARE POINTING, NOT ALONG AN AXIS (v2.3.2260)
 *
 * Owner: "Right now the flight path behavior of the bow and magic are both
 * broken.  The line of site is stuck in a straight path either vertically or
 * horizontally."  Clarified: "By 'line of site' I just mean flight path.  There
 * is no visible line of site anymore (which is how I want it for both magic and
 * bow -- this is part of the new combat system)."
 *
 * So the claim under test is about the PROJECTILE'S ANGLE, and the sight beam
 * staying invisible is a separate promise this file also keeps.
 *
 * ═══ WHY "NOT CARDINAL" IS THE ASSERTION ═══
 * Four independent mechanisms fed the same fallback, and all four produced
 * angles from a set of FOUR: monsterCombat's chain ended at `S._facing`
 * quantised to 0, ±pi/2, pi.  A test that pinned one expected angle would pass
 * on three of the four broken paths by luck.  What is actually wrong is that
 * the shot cannot express a diagonal at all -- so the assertion is that a
 * diagonal aim produces a diagonal shot, and that the angle MATCHES the one the
 * game says the player is aiming at.
 *
 * The specials are asserted separately because they were broken by a DIFFERENT
 * rule with a DIFFERENT floor: playerActions read `S._aimAngle || 0`, no
 * `_aiming` gate and no facing fallback, so a player who had never dragged
 * fired every special due EAST.  Fixing the auto-attack alone leaves that live,
 * which is why it has its own block here.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
/* A deliberately awkward diagonal: not a multiple of pi/4 either, so a fix that
   quantised to EIGHT directions instead of four would still be caught. */
const DIAG = 0.9;

/* How far an angle sits from the nearest cardinal, in radians. */
const offAxis = (a) => {
  const q = Math.PI / 2;
  const r = Math.abs(((a % q) + q) % q);
  return Math.min(r, q - r);
};

const armRanged = (P, slot) => P.page.evaluate((slot) => {
  const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
  const t = ((F.WOODWORKING_TIERS || {}).pine) || { tierMult: 1 };
  R.rangedWeapon = { type: 'bow', tierMult: t.tierMult, gearBase: 'pine', name: 'Pine Bow', tier: 'common' };
  R.staffWeapon = { type: 'staff', tierMult: t.tierMult, gearBase: 'pine', name: 'Pine Staff', tier: 'common' };
  R.activeSlot = slot;
  R.mana = R.maxMana = 500;
  S.lockedTarget = null;
  S.arrows = [];
  S._shieldUp = false;
  return { slot: R.activeSlot, wpn: slot === 'staff' ? R.staffWeapon.type : R.rangedWeapon.type };
}, slot);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Archer', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  for (const slot of ['ranged', 'staff']) {
    const armed = await armRanged(P, slot);
    rec.ok(`guard: a ${armed.wpn} is in hand with no lock`, !!armed.wpn, armed);

    /* ── 1. THE ORDINARY SHOT ──
       The player is aiming on a diagonal and holding the attack.  This is the
       state a bow player is in for most of a fight: no lock (the owner's own
       rule -- "you must tap on the monster"), a thumb on the right side. */
    const shot = await P.page.evaluate((ang) => {
      const S = window._gameState.current;
      S.arrows = [];
      S._aimAngle = ang;
      S._aiming = true;
      S._facing = 'down';          /* the WALK direction, deliberately at odds with the aim */
      S.swingTimer = 0;            /* let the auto-attack loop fire on the next tick */
      S.autoAttack = true;
      return { aim: S._aimAngle, facing: S._facing };
    }, DIAG);
    await P.page.waitForTimeout(700);
    const fired = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const a = (S.arrows || [])[0];
      S.autoAttack = false;
      return a ? { ang: a.ang, isStaff: !!a.isStaff, n: S.arrows.length } : { ang: null, n: 0 };
    });
    console.log(`    ${slot} aimed: ${JSON.stringify(shot)} -> ${JSON.stringify(fired)}`);
    rec.ok(`${slot}: holding the attack with an aim actually fires (guard)`, fired.n > 0, fired);
    if (fired.ang != null) {
      rec.ok(`${slot}: the shot goes where the aim points, not along an axis (${fired.ang.toFixed(3)} rad)`,
        Math.abs(fired.ang - DIAG) < 0.05, { fired, want: DIAG });
      rec.ok(`${slot}: ...and that angle is genuinely off-axis (${offAxis(fired.ang).toFixed(3)} rad from the nearest cardinal)`,
        offAxis(fired.ang) > 0.2, fired);
    }

    /* ── 2. NO AIM AT ALL, ONLY A HEADING ──
       The case the owner is actually in: a thumb pressed on the contextual
       disc, which never writes an aim.  Before v2.3.2260 the shot fell through
       to `S._facing` -- one of four strings -- and came out cardinal.  The
       smoothed CONTINUOUS heading is what the renderer already points the body
       down, so the shot should agree with the character it leaves. */
    const noAim = await P.page.evaluate((ang) => {
      const S = window._gameState.current;
      S.arrows = [];
      S._aimAngle = null;
      S._aiming = false;
      S._facing = 'down';
      S._facingAngle = ang;        /* the body is drawn pointing here */
      S._targetFacingAngle = ang;  /* ...and the smoother will not drag it away */
      S.swingTimer = 0;
      S.autoAttack = true;
      return { facingAngle: S._facingAngle, facing: S._facing };
    }, DIAG);
    await P.page.waitForTimeout(700);
    const firedNo = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const a = (S.arrows || [])[0];
      S.autoAttack = false;
      return a ? { ang: a.ang, n: S.arrows.length } : { ang: null, n: 0 };
    });
    console.log(`    ${slot} unaimed: ${JSON.stringify(noAim)} -> ${JSON.stringify(firedNo)}`);
    rec.ok(`${slot}: a press with no aim still fires (guard)`, firedNo.n > 0, firedNo);
    if (firedNo.ang != null) {
      /* THIS IS THE BUG.  On the build this replaces the answer here was
         exactly pi/2 -- 'down', the walk direction -- for any heading. */
      rec.ok(`${slot}: with no aim the shot follows the BODY's heading, not one of four axes (${firedNo.ang.toFixed(3)} rad)`,
        offAxis(firedNo.ang) > 0.2, firedNo);
    }

    /* ── 3. THE SPECIAL HAD ITS OWN FLOOR, AND IT WAS DUE EAST ──
       playerActions read `S._aimAngle || 0`: no _aiming gate, no facing
       fallback.  A player who had never dragged the right stick fired every
       special horizontally.  Asserted separately because fixing the ordinary
       shot does not touch this path. */
    const spec = await P.page.evaluate(() => {
      const S = window._gameState.current, F = window._gameFns || {};
      S.arrows = [];
      S._aimAngle = null;
      S._aiming = false;
      S._lastSwipe = 0;
      S.rpg.mana = S.rpg.maxMana = 500;
      S.lockedTarget = null;
      if (F.specialAttack) F.specialAttack();
      const a = (S.arrows || [])[0];
      return { n: (S.arrows || []).length, ang: a ? a.ang : null, facingAngle: S._facingAngle };
    });
    console.log(`    ${slot} special: ${JSON.stringify(spec)}`);
    rec.ok(`${slot}: the special fires with no lock and no aim (guard)`, spec.n > 0, spec);
    if (spec.ang != null) {
      rec.ok(`${slot}: the special does not default to due EAST (${spec.ang.toFixed(3)} rad, was 0.000)`,
        Math.abs(spec.ang) > 0.2, spec);
      rec.ok(`${slot}: ...it takes the same heading the body is drawn at`,
        Math.abs(spec.ang - spec.facingAngle) < 0.05, spec);
    }
  }

  /* ── 3b. A DEAD LOCK MUST NOT KEEP AIMING FOR YOU ──
     Owner: "It also forced me to shoot a different direction (as if shooting an
     invisible monster) even when a monster was close nearby."

     monsterCombat writes S._aimAngle toward a held lock EVERY FRAME, and nothing
     in the client ever writes it back to null.  So once a lock has existed, that
     field holds a lock-derived angle for the rest of the session.  v2.3.2260
     relaxed the fire chain to use _aimAngle whenever it is non-null (to kill the
     cardinal fallback) -- which turned that permanent residue into the aim.
     Lock a monster, let the aim be written toward it, take the monster away, and
     the shot must NOT still fly at the empty space where it stood. */
  await armRanged(P, 'ranged');
  const phantom = await P.page.evaluate(() => {
    const S = window._gameState.current, F = window._gameFns || {};
    const arch = Object.keys(F.ARCHETYPES || {}).find((k) => k === 'fodder');
    S._serverMonsters = false;
    /* Straight UP from the player, a direction nothing else in this file uses. */
    const m = F.createMonster('phantom-1', arch, 2, S.player.x, S.player.y - 260, null);
    m.alive = true; m.curHp = m.maxHp = 9000; m.spd = 0; m.vx = 0; m.vy = 0;
    S.monsters = [m];
    S.lockedTarget = { type: 'monster', id: 'phantom-1', ref: m, src: 'tap' };
    S.autoAttack = true;             /* what makes monsterCombat write the lock aim */
    S._facingAngle = 0.9;            /* the body's heading, deliberately elsewhere */
    S._targetFacingAngle = 0.9;
    return { mx: m.x, my: m.y };
  });
  await P.page.waitForTimeout(400);
  const locked = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { aim: S._aimAngle, lastAim: S._lastAimAngle == null ? null : S._lastAimAngle };
  });
  rec.ok('the lock wrote an aim toward the monster (guard)',
    locked.aim != null && Math.abs(locked.aim - (-Math.PI / 2)) < 0.2, locked);
  /* Now the monster is gone -- killed and despawned, the ordinary end of a
     fight.  The lock's ref is stale from this frame on. */
  const gone = await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.monsters = [];
    S.arrows = [];
    S.swingTimer = 0;
    S.autoAttack = true;
    return { aimBefore: S._aimAngle };
  });
  await P.page.waitForTimeout(800);
  const ghost = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const a = (S.arrows || [])[0];
    S.autoAttack = false;
    return { ang: a ? a.ang : null, n: (S.arrows || []).length, aim: S._aimAngle,
      lock: S.lockedTarget ? (S.lockedTarget.id || 'set') : null, facingAngle: S._facingAngle };
  });
  console.log(`    phantom: ${JSON.stringify(phantom)} ${JSON.stringify(locked)} ${JSON.stringify(gone)} -> ${JSON.stringify(ghost)}`);
  rec.ok('a shot still goes out after the locked monster is gone (guard)', ghost.n > 0, ghost);
  if (ghost.ang != null) {
    rec.ok(`the shot does NOT keep flying at where the dead lock stood (${ghost.ang.toFixed(3)} rad vs the ghost's -1.571)`,
      Math.abs(ghost.ang - (-Math.PI / 2)) > 0.2, ghost);
    rec.ok(`...it falls back to the body's own heading instead (${ghost.facingAngle})`,
      Math.abs(ghost.ang - ghost.facingAngle) < 0.05, ghost);
  }

  /* ── 4. AND MAGIC KEEPS THE LINE IT WAS FIRED ON ──
     v2.3.2258 made bow arrows freeze their path at release and deliberately
     left staff bolts homing.  The owner's follow-up settles it the other way
     ("bow and magic are BOTH broken"), and it is load-bearing: freeAim is
     re-read every frame by anything that is not a released bow arrow, so
     turning the aim back on for ranged would otherwise have restored
     mid-flight steering to every bolt and to the three-orb line. */
  await armRanged(P, 'staff');
  const steer = await P.page.evaluate((ang) => {
    const S = window._gameState.current;
    S.arrows = [];
    S._aimAngle = ang; S._aiming = true;
    S.swingTimer = 0; S.autoAttack = true;
    return { aim: ang };
  }, DIAG);
  await P.page.waitForTimeout(500);
  const before = await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.autoAttack = false;
    const a = (S.arrows || [])[0];
    return a ? { ang: a.ang, dist: a.dist } : null;
  });
  rec.ok('a staff bolt is in flight to steer (guard)', !!before && before.dist > 14, before);
  /* Swing the aim hard while it flies.  A homing bolt snaps to the new angle
     on the very next frame; one that kept its line does not move. */
  await P.page.evaluate(() => { const S = window._gameState.current; S._aimAngle = -2.2; S._aiming = true; });
  await P.page.waitForTimeout(350);
  const after = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const a = (S.arrows || [])[0];
    return a ? { ang: a.ang, dist: a.dist } : null;
  });
  console.log(`    staff steer: ${JSON.stringify(steer)} ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  if (before && after) {
    rec.ok(`a magic bolt keeps the line it was fired on when the aim swings (${before.ang.toFixed(3)} -> ${after.ang.toFixed(3)})`,
      Math.abs(after.ang - before.ang) < 0.02, { before, after });
  }

  /* ── 5. AND THE SIGHT BEAM IS STILL GONE ──
     The owner keeps it that way deliberately.  Turning the aim back on for
     ranged is exactly the change that could bring it back, so it is asserted
     in the same file as the change that threatens it. */
  const beam = await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._aimAngle = 0.9; S._aiming = true; S.autoAttack = true;
    return { slot: S.rpg.activeSlot };
  });
  await P.page.waitForTimeout(400);
  const beamSeen = await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.autoAttack = false; S._aiming = false;
    return (window.__btSightBeam ? window.__btSightBeam() : { unavailable: true });
  });
  console.log(`    beam: ${JSON.stringify(beam)} ${JSON.stringify(beamSeen)}`);
  if (beamSeen && beamSeen.unavailable) {
    rec.skip('the sight beam stays hidden for magic and bow', 'no __btSightBeam probe');
  } else {
    rec.ok('the sight beam stays hidden for magic and bow, aim or no aim',
      beamSeen && beamSeen.visible === false, beamSeen);
  }

  await P.ctx.close().catch(() => {});
}
