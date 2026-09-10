/* A BOW HAS NO SHIELD BUTTON, AND THE GUARD IS A HELD GESTURE (v2.3.2446).
 *
 * Owner: "When you use bow or staff there should be no shield button.  You
 * should be able to double tap and hold the right joystick to rotate shield
 * (with the arc included).  Restore that behavior for just staff and bow if
 * it doesn't already exist.  Leave melee and shield behavior as is."
 *
 * HALF OF IT DID EXIST, which is why this file asserts the half that did not
 * as sharply as the half that did.  v2.3.2271 already raised the guard on a
 * ranged double tap -- but it LATCHED, aimed by the locked target rather than
 * by the thumb, and the button stayed on screen because shieldButtonLive only
 * ever asked whether a shield was owned.  So the three claims here are: the
 * button is gone on those weapons, the second tap opens a HOLD that the
 * release ends, and the drag moves the arc the server measures blocks against.
 *
 * The arc is read as `_shieldAngle` rather than off the screen because that
 * is the number `_blockArcCovers` uses -- a cone drawn at one angle while the
 * block is measured at another is precisely the bug worth catching, and only
 * the state can tell them apart.
 *
 * Visibility is asserted off the computed style, never inferred from a press
 * landing: el.dispatchEvent ignores pointer-events, so a touch "working" is
 * exactly what a hidden control looks like (mp-rbutton's own note, TRAPS §39).
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const installTouch = (P) => P.page.evaluate(() => {
  window.__touch = (el, type, x, y, id) => {
    const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
    const end = type === 'touchend' || type === 'touchcancel';
    el.dispatchEvent(new TouchEvent(type, {
      bubbles: true, cancelable: true,
      touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t],
    }));
  };
  window.__centre = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { el, x: r.x + r.width / 2, y: r.y + r.height / 2 };
  };
});

const gear = (P, slot) => P.page.evaluate((sl) => {
  const S = window._gameState.current;
  S.rpg.weapon = { type: 'sword', name: 'QA Sword', tierMult: 1 };
  S.rpg.rangedWeapon = { type: 'bow', name: 'QA Bow', tierMult: 1 };
  S.rpg.staffWeapon = { type: 'staff', name: 'QA Staff', tierMult: 1 };
  S.rpg.shield = { type: 'shield', name: 'QA Shield', tierMult: 1 };
  S.rpg.activeSlot = sl;
  /* A monster in reach, so the button's "during combat" test is satisfied and
     a hidden button can only be the weapon rule.  Due EAST, so the locked-arc
     assertions further down have a direction to name. */
  /* ═══ v2.3.2451: A STUB MONSTER STOPS THE GAME LOOP DEAD ═══
     This fixture used to be a seven-field literal.  monsterCombat reads
     `m.statuses.freeze` for every monster every frame (monsterCombat.js:383),
     so the loop threw "Cannot read properties of undefined (reading 'freeze')"
     on EVERY frame, its own try/catch swallowed it, and it never reached the
     shield section ~1500 lines further down.
     MEASURED, before the fix: S._frameCount advanced 30 times across 500ms
     while S.shieldEnd stayed 0 -- the loop ran and died in the same place
     thirty times running.
     Nothing looked wrong, and that is the point.  The touch handlers are NOT
     in the game loop, so the guard still raised, the release still dropped it
     and a drag still moved the arc: every assertion in this file went green
     over a game whose per-frame simulation was not executing at all.  Anything
     the loop owns -- the lock-steered arc, the stamina release, and the
     autoAttack rule that is the whole subject of section 5b -- was untestable
     and silently passing.
     The shape below is mp-rbutton's seedFodder verbatim, which is the shape
     that survives a frame.  `_serverMonsters = false` hands the client
     ownership so the loop actually simulates it (the same lesson mp-swingsfx
     learned), and spd/dmg 0 keep it from wandering out of position or hitting
     back. */
  S._serverMonsters = false;
  S.monsters = [{
    id: 'qa-m', arch: 'fodder', archetype: 'fodder', type: 'fodder',
    x: S.player.x + 200, y: S.player.y, renderX: S.player.x + 200, renderY: S.player.y,
    spawnX: S.player.x + 200, spawnY: S.player.y, targetX: S.player.x + 200, targetY: S.player.y,
    hp: 5000, curHp: 5000, maxHp: 5000, dmg: 0, level: 1, gold: 0,
    spd: 0, vx: 0, vy: 0,
    alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
    respawnAt: 0, moveTimer: 0, _stuckArrows: [],
  }];
  S.lastDamageTaken = Date.now();
}, slot);

const shieldBtnShown = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-shield]');
  if (!el) return false;
  const cs = getComputedStyle(el);
  return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.01;
});

const st = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  return { up: !!S._shieldUp, ang: S._shieldAngle, hold: !!S._rShieldHold, auto: !!S.autoAttack,
    /* v2.3.2451: the two fields the rotation bug turns on -- who owns the arc,
       and whether a lock is still there to fight the thumb for it. */
    steered: !!S._rShieldSteered, lock: !!(S.lockedTarget && S.lockedTarget.ref),
    why: S._shieldDroppedWhy || null };
});

/* ═══ v2.3.2451: THE ZONE, NOT THE DISC ═══
 * The sections above drive `.bt-rjoy-base` -- the little disc -- and that is
 * why they went green through a bug the owner could reproduce in seconds.
 * rJoyAim has exactly ONE caller (BroTown's `rM`, the full-height right-half
 * [data-joyzone="R"] layer), the disc's `bM` does not call it at all, and
 * rJoyAim is where the drop came from.  So every assertion about ROTATION
 * above was measuring a surface on which the failure cannot occur.
 * "The right joystick" in the owner's report is this zone: v2.3.949's relative
 * drag, measured from wherever the thumb went down.
 */
const ZONE = '[data-joyzone="R"]';
/* High in the zone, clear of the disc and the ability band that sit on top of
   its lower portion -- the zone is full height, they are not. */
const zonePt = (P) => P.page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x + r.width * 0.5), y: Math.round(r.y + r.height * 0.26) };
}, ZONE);

const zoneDblHold = async (P, id) => {
  const p = await zonePt(P);
  await P.page.evaluate((a) => {
    const el = document.querySelector(a.sel);
    window.__touch(el, 'touchstart', a.x, a.y, a.id);
    window.__touch(el, 'touchend', a.x, a.y, a.id);
  }, { sel: ZONE, x: p.x, y: p.y, id });
  await P.page.waitForTimeout(90);            /* inside RBTN_DBL_MS */
  await P.page.evaluate((a) => {
    const el = document.querySelector(a.sel);
    window.__touch(el, 'touchstart', a.x, a.y, a.id);
    window.__btZoneHold = { sel: a.sel, x: a.x, y: a.y, id: a.id };
  }, { sel: ZONE, x: p.x, y: p.y, id: id + 1 });
  await P.page.waitForTimeout(150);
  return p;
};

const zoneDrag = (P, dx, dy) => P.page.evaluate((d) => {
  const o = window.__btZoneHold;
  const el = document.querySelector(o.sel);
  window.__touch(el, 'touchmove', o.x + d.dx, o.y + d.dy, o.id);
}, { dx, dy });

/* ═══ v2.3.2451: THE LOOP'S OWN PULSE ═══
 * Section 5b asserts things only the per-frame simulation can do, and a game
 * loop that throws is completely invisible from outside: BroTown's loop wraps
 * its whole body in one try/catch, so a bad fixture kills every frame silently
 * while the touch handlers -- which live outside it -- keep working perfectly.
 * `_frameCount` proves the loop RUNS; `shieldEnd` proves it reaches PAST the
 * shield section, ~1500 lines in, which is the only part that matters here.
 * Asserted rather than assumed, because assuming it is exactly how the first
 * cut of this file went green over a simulation that was not executing. */
const loopAlive = async (P) => {
  const a = await P.page.evaluate(() => window._gameState.current._frameCount || 0);
  await P.page.waitForTimeout(220);
  return P.page.evaluate((before) => {
    const S = window._gameState.current;
    return { advanced: (S._frameCount || 0) - before, end: S.shieldEnd || 0, up: !!S._shieldUp };
  }, a);
};

const zoneRelease = (P) => P.page.evaluate(() => {
  const o = window.__btZoneHold;
  const el = document.querySelector(o.sel);
  window.__touch(el, 'touchend', o.x, o.y, o.id);
});

/* A live lock is what makes the per-frame arc resolver run at all, and the
   double-tap's own canvas tap-forward can clear one (v2.3.2271), so it is set
   AFTER the guard is up rather than trusted to survive the gesture. */
const lockMonster = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const m = S.monsters && S.monsters[0];
  if (!m || !S.player) return null;
  /* gear()'s fodder, locked deliberately.  Two things about it are load
     bearing: it is a WELL-FORMED monster (see gear()'s note -- a stub kills the
     loop that this section is entirely about), and lockAimPoint (combatHelpers)
     answers null for any ref without finite x/y, while shieldAimAngle turns a
     null into "keep the angle you already had".  So a bad ref never fails
     loudly here: it makes the resolver a silent no-op, which reads exactly like
     a shield correctly refusing to move. */
  S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
  return { dx: m.x - S.player.x, dy: m.y - S.player.y };
});

/* the double tap, then a drag, then the release -- one finger throughout */
const dblHold = async (P, id) => {
  await P.page.evaluate((i) => {
    const c = window.__centre('.bt-rjoy-base') || window.__centre('[data-joyzone="R"]');
    window.__touch(c.el, 'touchstart', c.x, c.y, i);
    window.__touch(c.el, 'touchend', c.x, c.y, i);
  }, id);
  await P.page.waitForTimeout(90);          /* inside RBTN_DBL_MS */
  await P.page.evaluate((i) => {
    const c = window.__centre('.bt-rjoy-base') || window.__centre('[data-joyzone="R"]');
    window.__touch(c.el, 'touchstart', c.x, c.y, i + 1);
    window.__btHoldOrigin = { x: c.x, y: c.y, el: c.el, id: i + 1 };
  }, id);
  await P.page.waitForTimeout(120);
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Archer', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);
  await installTouch(P);

  /* ── 1. melee is untouched ── */
  await gear(P, 'melee');
  await P.page.waitForTimeout(400);
  rec.ok('bowshield: on melee the shield button is still there, with a shield equipped and a fight on',
    await shieldBtnShown(P));

  /* ── 2. the bow takes it away ── */
  await gear(P, 'ranged');
  await P.page.waitForTimeout(400);
  rec.ok('bowshield: on a BOW the shield button is gone -- same shield, same fight, only the weapon changed',
    !(await shieldBtnShown(P)));

  await gear(P, 'staff');
  await P.page.waitForTimeout(400);
  rec.ok('bowshield: and on a STAFF', !(await shieldBtnShown(P)));

  /* ── 3. double tap and HOLD raises the guard ── */
  await gear(P, 'ranged');
  await P.page.waitForTimeout(300);
  await dblHold(P, 70);
  const held = await st(P);
  rec.ok('bowshield: double tap and hold raises the guard on a bow', held.up, held);
  rec.ok('bowshield: ...and it is a HOLD, not a latch (the gesture is armed)', held.hold, held);
  rec.ok('bowshield: ...and it does not also hold the attack down', !held.auto, held);

  /* ── 4. the drag rotates the arc ── */
  await P.page.evaluate(() => {
    const o = window.__btHoldOrigin;
    window.__touch(o.el, 'touchmove', o.x - 90, o.y, o.id);   /* due left */
  });
  await P.page.waitForTimeout(120);
  const left = await st(P);
  rec.ok('bowshield: dragging left points the block arc left (pi), which is the angle the server measures against',
    left.up && typeof left.ang === 'number' && Math.abs(Math.abs(left.ang) - Math.PI) < 0.2, left);

  await P.page.evaluate(() => {
    const o = window.__btHoldOrigin;
    window.__touch(o.el, 'touchmove', o.x, o.y + 90, o.id);   /* due down */
  });
  await P.page.waitForTimeout(120);
  const down = await st(P);
  rec.ok('bowshield: ...and dragging down points it down (pi/2) -- the arc follows the thumb, not the lock',
    down.up && typeof down.ang === 'number' && Math.abs(down.ang - Math.PI / 2) < 0.2, down);

  /* ── 5. release drops it ── */
  await P.page.evaluate(() => {
    const o = window.__btHoldOrigin;
    window.__touch(o.el, 'touchend', o.x, o.y + 90, o.id);
  });
  await P.page.waitForTimeout(250);
  const after = await st(P);
  rec.ok('bowshield: letting go drops the guard -- it lasts exactly as long as the finger', !after.up, after);
  rec.ok('bowshield: ...and disarms the gesture', !after.hold, after);
  rec.ok('bowshield: ...and no shield button appeared to lower it with', !(await shieldBtnShown(P)));

  /* ── 5b. v2.3.2451: ROTATING A HELD GUARD MUST NOT DROP IT ──
     Owner: "It holds the shield after double tapping until you rotate
     directionally (right joystick) and it immediately drops the shield.  This
     is not the correct behavior.  You should be able to rotate the shield
     while it's held."

     TWO faults, and the report only names the first:
       1. rJoyAim ended with `S.autoAttack = true`, and monsterCombat's loop
          reads `if (S.autoAttack && S._shieldUp) dropShield(S, 'attack')`
          (v2.3.2248, "asking to attack breaks the hold").  So the drag ITSELF
          asked to attack and the guard fell on the very next tick -- hence
          "immediately".
       2. Behind it, BroTown's per-frame resolver put the arc back on the
          locked target every frame while the shield was up, written when "the
          toggle button has no finger on it to steer" was still true.  Cure
          fault 1 alone and the guard survives the rotation but will not TURN.

     The lock is set explicitly, because fault 2 exists only while one is live
     and the double tap's own canvas tap-forward can clear it.  The positive
     control below (the arc snapping to the monster BEFORE any drag) is what
     keeps the later "did not drift back" honest: without it that assertion
     would pass just as happily on a resolver branch that never ran. */
  await gear(P, 'ranged');
  await P.page.waitForTimeout(300);
  await zoneDblHold(P, 90);
  const zHeld = await st(P);
  rec.ok('bowshield: the ZONE raises the guard too -- this is the surface the owner calls the right '
    + 'joystick, and the only one whose moves reach rJoyAim', zHeld.up && zHeld.hold, zHeld);
  rec.ok('bowshield: ...and a fresh hold starts with the arc UNCLAIMED, on the seed angle', !zHeld.steered, zHeld);

  const lk = await lockMonster(P);
  rec.ok('bowshield: the locked target used by the rest of this section is live and due east',
    !!lk && lk.dx > 0 && lk.dy === 0, lk);

  const alive = await loopAlive(P);
  /* A low bar on purpose: headless Chromium under a worker and two page
     contexts runs this at ~13fps, not 60, and the frame RATE is not what is
     being asserted -- only that frames happen at all.  `end` below is the
     assertion with the teeth. */
  rec.ok('bowshield: the game loop is actually RUNNING for this section', alive.advanced >= 2, alive);
  rec.ok('bowshield: ...and reaching its shield section rather than throwing on the way -- without '
    + 'this every claim below could pass over a simulation that never executed',
    alive.up && alive.end > 0, alive);

  const zLock = await st(P);
  /* POSITIVE CONTROL: the monster sits due east of the player (gear() puts it
     at x+200, y+0), so a resolver steering by the lock parks the arc near 0.
     The tolerance is loose because lockAimPoint subtracts an archetype body
     offset from the target's y -- it aims at the chest, not the feet -- and the
     exact offset is not this test's business.  East from west (pi) and south
     (pi/2) is the discrimination that matters, and 0.5 rad makes it cleanly.
     If THIS fails, the branch is not running and nothing below proves anything
     about it. */
  rec.ok('bowshield: with a lock and no drag, the arc tracks the monster (~0 rad, due east) -- '
    + 'so the per-frame lock resolver really is live for this shield',
    zLock.up && zLock.lock && typeof zLock.ang === 'number' && Math.abs(zLock.ang) < 0.5, zLock);

  await zoneDrag(P, -110, 0);      /* due left -- the opposite of the lock */
  await P.page.waitForTimeout(200);
  const zLeft = await st(P);
  rec.ok('bowshield: ROTATING DOES NOT DROP THE GUARD (v2.3.2451 -- rJoyAim no longer re-arms '
    + 'autoAttack under a held shield)', zLeft.up, zLeft);
  rec.ok('bowshield: ...and it was not the attack flag that survived instead', !zLeft.auto, zLeft);
  rec.ok('bowshield: ...the thumb has claimed the arc', zLeft.steered, zLeft);
  rec.ok('bowshield: ...and the arc followed the THUMB to pi rather than snapping back to the '
    + 'locked monster at 0', typeof zLeft.ang === 'number' && Math.abs(Math.abs(zLeft.ang) - Math.PI) < 0.3, zLeft);

  /* Half a second of frames with the lock still live: fault 2 needed only one
     of them to put the arc back, and fault 1 only one tick to drop the guard,
     so a pass here is a pass across ~30 chances to regress. */
  await P.page.waitForTimeout(500);
  const zStill = await st(P);
  rec.ok('bowshield: ...still up half a second and ~30 frames later', zStill.up, zStill);
  rec.ok('bowshield: ...with the lock still live to fight for the arc', zStill.lock, zStill);
  rec.ok('bowshield: ...and the arc has NOT drifted back onto the lock',
    typeof zStill.ang === 'number' && Math.abs(Math.abs(zStill.ang) - Math.PI) < 0.3, zStill);

  /* And the second direction, so the pass cannot be "it is stuck at pi". */
  await zoneDrag(P, 0, 110);       /* due down */
  await P.page.waitForTimeout(200);
  const zDown = await st(P);
  rec.ok('bowshield: a second rotation still holds, and still turns (pi/2, due down)',
    zDown.up && typeof zDown.ang === 'number' && Math.abs(zDown.ang - Math.PI / 2) < 0.3, zDown);

  await zoneRelease(P);
  await P.page.waitForTimeout(250);
  const zEnd = await st(P);
  rec.ok('bowshield: releasing the ZONE hold drops the guard, the same as the disc does', !zEnd.up, zEnd);
  rec.ok('bowshield: ...and hands the arc back (the claim ends with the thumb)', !zEnd.steered, zEnd);

  /* ── 6. a guard raised on melee comes down on the way to a bow ── */
  await gear(P, 'melee');
  await P.page.waitForTimeout(400);
  await P.page.evaluate(() => {
    const c = window.__centre('[data-shield]');
    window.__touch(c.el, 'touchstart', c.x, c.y, 80);
    window.__touch(c.el, 'touchend', c.x, c.y, 80);
  });
  await P.page.waitForTimeout(250);
  rec.ok('bowshield: the melee button still raises the guard, unchanged', (await st(P)).up);
  /* Cycled with the REAL gesture -- two quick taps on the left stick -- rather
     than by assigning activeSlot, because the drop is wired to the cycle and a
     test that set the field directly would assert nothing about the path a
     player takes. */
  await P.page.evaluate(() => {
    const c = window.__centre('[data-joyzone="L"]');
    window.__touch(c.el, 'touchstart', c.x, c.y, 81);
    window.__touch(c.el, 'touchend', c.x, c.y, 81);
  });
  await P.page.waitForTimeout(90);
  await P.page.evaluate(() => {
    const c = window.__centre('[data-joyzone="L"]');
    window.__touch(c.el, 'touchstart', c.x, c.y, 82);
    window.__touch(c.el, 'touchend', c.x, c.y, 82);
  });
  await P.page.waitForTimeout(400);
  const swapped = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { up: !!S._shieldUp, slot: S.rpg.activeSlot };
  });
  rec.ok('bowshield: the left-stick cycle really did leave melee', swapped.slot !== 'melee', swapped);
  rec.ok('bowshield: ...and swapping off melee with the guard up LOWERS it, so it cannot strand '
    + 'on a weapon with no button to lower it', !swapped.up, swapped);
  rec.ok('bowshield: ...and no button came back to strand it with', !(await shieldBtnShown(P)));

  await P.ctx.close();
}
