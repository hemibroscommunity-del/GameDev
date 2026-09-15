/* THE SHIELD BUTTON IS ON BOW AND STAFF, AND THE RIGHT CONTROL'S DOUBLE TAP IS
 * BOUND TO NOTHING (v2.3.2542 — owner, after playing the merged build).
 *
 * ═══ THIS FILE HAS BEEN INVERTED TWICE.  READ THIS BEFORE CHANGING IT AGAIN ═══
 * Until v2.3.2472 it asserted v2.3.2446's behaviour: "on a BOW the shield button
 * is gone", "double tap and hold raises the guard", "the drag rotates the arc",
 * "letting go drops it".  v2.3.2472 (owner decision D8) reversed all three parts
 * of that together, because they were one mechanism, and took the freed double
 * tap for the WEAPON SWAP.
 *
 * v2.3.2542 takes the swap back off it.  Owner, on a phone: "Revert the
 * right-joystick double-tap weapon swap.  Weapon swapping goes back to the LEFT
 * joystick only."
 *
 * ═══ AND THE GUARD DOES NOT COME BACK WITH IT -- THAT IS THE TRAP ═══
 * The obvious next edit to this file is to restore the v2.3.2446 rows the header
 * above lists, on the reasoning that the right double tap is free again.  It is
 * NOT free for that: the shield BUTTON is what replaced the gesture on those two
 * weapons (D8, which the owner is keeping), so bringing the gesture back would
 * put two controls on one guard -- the gesture fight the backlog's §0.2 warns
 * about, "two gestures on one classifier".  §6 below asserts the ABSENCE
 * directly, in both directions, so that edit fails here instead of on a phone.
 *
 * What the double tap does now is nothing: two taps are two taps, which on a
 * bow is two shots and on a sword is a lunge and then a swing.  §6b pins the
 * lunge specifically, because a swallowed second press was what v2.3.2472 had
 * to balance against maybeSwordDash and the balance is gone with it.
 *
 * The arc is read as `_shieldAngle` rather than off the screen because that is
 * the number `_blockArcCovers` uses -- a cone drawn at one angle while the
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

/* One monster, due EAST of the player, so every arc assertion has a direction
   to name.
   ═══ v2.3.2451: A STUB MONSTER STOPS THE GAME LOOP DEAD ═══
   This fixture used to be a seven-field literal.  monsterCombat reads
   `m.statuses.freeze` for every monster every frame, so the loop threw on EVERY
   frame, its own try/catch swallowed it, and it never reached the shield
   section ~1500 lines further down.  Nothing looked wrong, and that is the
   point: the touch handlers are NOT in the game loop, so every assertion in
   this file went green over a simulation that was not executing.  The shape
   below is mp-rbutton's seedFodder verbatim -- the shape that survives a frame.
   `_serverMonsters = false` hands the client ownership so the loop actually
   simulates it; spd/dmg 0 keep it from wandering or hitting back. */
const gear = (P, slot, opts) => P.page.evaluate((a) => {
  const S = window._gameState.current;
  S.rpg.weapon = { type: 'sword', name: 'QA Sword', tierMult: 1 };
  S.rpg.rangedWeapon = { type: 'bow', name: 'QA Bow', tierMult: 1 };
  S.rpg.staffWeapon = { type: 'staff', name: 'QA Staff', tierMult: 1 };
  S.rpg.shield = { type: 'shield', name: 'QA Shield', tierMult: 1 };
  S.rpg.activeSlot = a.slot;
  S._serverMonsters = false;
  const mk = (id, dx, dy) => ({
    id, arch: 'fodder', archetype: 'fodder', type: 'fodder',
    x: S.player.x + dx, y: S.player.y + dy,
    renderX: S.player.x + dx, renderY: S.player.y + dy,
    spawnX: S.player.x + dx, spawnY: S.player.y + dy,
    targetX: S.player.x + dx, targetY: S.player.y + dy,
    hp: 5000, curHp: 5000, maxHp: 5000, dmg: 0, level: 1, gold: 0,
    spd: 0, vx: 0, vy: 0,
    alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
    respawnAt: 0, moveTimer: 0, _stuckArrows: [],
  });
  /* The near one is due EAST (angle ~0); the far one due WEST (angle ~pi), so
     "nearest" and "the one you tapped" name different directions and a pass
     cannot be an accident of there being only one monster. */
  S.monsters = a.two ? [mk('qa-near', 150, 0), mk('qa-far', -210, 0)] : [mk('qa-m', 200, 0)];
  S.lockedTarget = null;
  S.lastDamageTaken = Date.now();
}, { slot, two: !!(opts && opts.two) });

const shieldBtnShown = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-shield]');
  if (!el) return false;
  const cs = getComputedStyle(el);
  return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.01;
});

const st = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  return { up: !!S._shieldUp, ang: S._shieldAngle, auto: !!S.autoAttack,
    slot: S.rpg && S.rpg.activeSlot,
    lock: !!(S.lockedTarget && S.lockedTarget.ref),
    lockId: S.lockedTarget && S.lockedTarget.ref ? String(S.lockedTarget.ref.id) : null,
    why: S._shieldDroppedWhy || null };
});

const tapShield = async (P, id) => {
  await P.page.evaluate((i) => {
    const c = window.__centre('[data-shield]');
    if (!c) return;
    window.__touch(c.el, 'touchstart', c.x, c.y, i);
    window.__touch(c.el, 'touchend', c.x, c.y, i);
  }, id);
  await P.page.waitForTimeout(300);
};

/* ═══ THE ZONE, NOT THE DISC ═══
 * The right JOYSTICK in the owner's words is [data-joyzone="R"], the full-height
 * right-half layer -- v2.3.949's relative drag, measured from wherever the thumb
 * went down.  The disc is the little contextual button inside it.  Both press
 * through handleRBtnPress, so both classify the double tap; the sections below
 * drive each in turn so a pass on one cannot stand in for the other. */
const ZONE = '[data-joyzone="R"]';
/* High in the zone, clear of the disc and the button column that sit on top of
   its lower portion -- the zone is full height, they are not. */
const zonePt = (P) => P.page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x + r.width * 0.5), y: Math.round(r.y + r.height * 0.26) };
}, ZONE);

/* Two taps in the SAME place, 90ms apart -- inside any double-tap window this
   side of the screen has ever used (v2.3.2269's RBTN_DBL_MS was 300).  `dx`
   offsets the second tap, so a pair can be driven both as a tight pair and as
   two taps in different places. */
const doubleTap = async (P, sel, id, dx) => {
  const p = sel === ZONE ? await zonePt(P)
    : await P.page.evaluate((s) => { const c = window.__centre(s); return c ? { x: Math.round(c.x), y: Math.round(c.y) } : null; }, sel);
  if (!p) return null;
  await P.page.evaluate((a) => {
    const el = document.querySelector(a.sel);
    window.__touch(el, 'touchstart', a.x, a.y, a.id);
    window.__touch(el, 'touchend', a.x, a.y, a.id);
  }, { sel, x: p.x, y: p.y, id });
  await P.page.waitForTimeout(90);            /* inside RBTN_DBL_MS */
  await P.page.evaluate((a) => {
    const el = document.querySelector(a.sel);
    window.__touch(el, 'touchstart', a.x, a.y, a.id);
    window.__touch(el, 'touchend', a.x, a.y, a.id);
  }, { sel, x: p.x + (dx || 0), y: p.y, id: id + 1 });
  await P.page.waitForTimeout(350);
  return p;
};

/* ═══ v2.3.2451: THE LOOP'S OWN PULSE ═══
 * The arc assertions below are things only the per-frame simulation can do, and
 * a game loop that throws is completely invisible from outside: BroTown's loop
 * wraps its whole body in one try/catch, so a bad fixture kills every frame
 * silently while the touch handlers -- which live outside it -- keep working
 * perfectly.  `_frameCount` proves the loop RUNS; `shieldEnd` proves it reaches
 * PAST the shield section, ~1500 lines in, which is the only part that matters
 * here.  Asserted rather than assumed, because assuming it is exactly how the
 * first cut of this file went green over a simulation that never executed. */
const loopAlive = async (P) => {
  const a = await P.page.evaluate(() => window._gameState.current._frameCount || 0);
  await P.page.waitForTimeout(220);
  return P.page.evaluate((before) => {
    const S = window._gameState.current;
    return { advanced: (S._frameCount || 0) - before, end: S.shieldEnd || 0, up: !!S._shieldUp };
  }, a);
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Archer', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);
  await installTouch(P);

  /* ── 1. the button is there on every weapon ── */
  await gear(P, 'melee');
  await P.page.waitForTimeout(400);
  rec.ok('bowshield: on melee the shield button is there, with a shield equipped and a fight on',
    await shieldBtnShown(P));

  await gear(P, 'ranged');
  await P.page.waitForTimeout(400);
  rec.ok('bowshield: on a BOW the shield button is BACK (D8 -- this row asserted the opposite until v2.3.2472)',
    await shieldBtnShown(P), await P.page.evaluate(() => window.__btShieldBtn && window.__btShieldBtn()));

  await gear(P, 'staff');
  await P.page.waitForTimeout(400);
  rec.ok('bowshield: and on a STAFF', await shieldBtnShown(P));

  /* ── 2. tapping it raises the guard, aimed at the NEAREST monster ──
     A bow acquires nothing automatically (v2.3.2258), so there is no lock here
     and the arc can only be coming from shieldAimAngle's new nearest rung. */
  await gear(P, 'ranged', { two: true });
  await P.page.waitForTimeout(500);
  const preLock = await st(P);
  rec.ok('bowshield: guard: a bow has no automatic lock, so the arc below can only be the nearest rung',
    preLock.lock === false, preLock);

  await tapShield(P, 60);
  const up = await st(P);
  rec.ok('bowshield: one tap raises the guard on a bow', up.up, up);
  rec.ok('bowshield: ...and it does not hold the attack down under it', !up.auto, up);
  rec.ok('bowshield: ...and the arc points at the NEAREST monster (150px EAST, ~0 rad) rather '
    + 'than at the one 210px west', typeof up.ang === 'number' && Math.abs(up.ang) < 0.5, up);

  const alive = await loopAlive(P);
  /* A low bar on purpose: headless Chromium under a worker and two page
     contexts runs this at ~13fps, not 60, and the frame RATE is not what is
     being asserted -- only that frames happen at all.  `end` below is the
     assertion with the teeth. */
  rec.ok('bowshield: the game loop is actually RUNNING for this section', alive.advanced >= 2, alive);
  rec.ok('bowshield: ...and reaching its shield section rather than throwing on the way -- without '
    + 'this every claim below could pass over a simulation that never executed',
    alive.up && alive.end > 0, alive);

  /* ── 3. the arc TRACKS, frame by frame ──
     Move the near monster due SOUTH and the per-frame resolver must follow it.
     This is the branch that used to require a lock and therefore never ran for
     a bow: without it a raised guard keeps its seed angle forever. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = (S.monsters || []).find((x) => String(x.id) === 'qa-near');
    m.x = S.player.x; m.renderX = S.player.x;
    m.y = S.player.y + 150; m.renderY = S.player.y + 150;
  });
  await P.page.waitForTimeout(400);
  const moved = await st(P);
  rec.ok('bowshield: the arc FOLLOWS the nearest monster as it moves (now due south, ~pi/2) -- '
    + 'the per-frame resolver no longer requires a lock',
    moved.up && typeof moved.ang === 'number' && Math.abs(moved.ang - Math.PI / 2) < 0.5, moved);

  /* ── 4. a tapped lock still outranks the nearest ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const far = (S.monsters || []).find((x) => String(x.id) === 'qa-far');
    S.lockedTarget = { type: 'monster', id: far.id, ref: far, src: 'tap' };
  });
  await P.page.waitForTimeout(400);
  const locked = await st(P);
  rec.ok('bowshield: ...but a LOCK still outranks the nearest -- the arc swings west (pi) to the '
    + 'monster that was tapped, not to the one that is closer',
    locked.up && typeof locked.ang === 'number' && Math.abs(Math.abs(locked.ang) - Math.PI) < 0.5, locked);

  /* ── 5. a second tap lowers it, and no gesture is needed to do so ── */
  await tapShield(P, 62);
  const down = await st(P);
  rec.ok('bowshield: a second tap lowers the guard on a bow', !down.up, down);
  rec.ok('bowshield: ...and the button is still on screen to raise it again', await shieldBtnShown(P));

  /* ── 6. THE DOUBLE TAP DOES NOTHING AT ALL NOW ──
     Two claims per surface, and BOTH have to be made: the swap is gone
     (v2.3.2542, the owner's ask) and the v2.3.2446 guard has NOT come back in
     its place (the trap this file's header is about).  Driven on BOTH surfaces,
     because handleRBtnPress is what used to classify the pair and both the
     zone's rS and the disc's bS come through it -- a classifier restored on
     either one would be a regression. */
  await gear(P, 'ranged');
  await P.page.waitForTimeout(400);
  const beforeZ = await st(P);
  await doubleTap(P, ZONE, 90);
  const afterZ = await st(P);
  rec.ok('bowshield: a double tap on the right ZONE does NOT swap the weapon (v2.3.2542 -- '
    + 'this row asserted the opposite at v2.3.2472)',
    afterZ.slot === beforeZ.slot, { before: beforeZ.slot, after: afterZ.slot });
  rec.ok('bowshield: ...and it does NOT raise a guard either -- v2.3.2446 is not restored by the '
    + 'swap going away; the shield BUTTON is what replaced it', !afterZ.up, afterZ);

  await gear(P, 'ranged');
  await P.page.waitForTimeout(400);
  const beforeD = await st(P);
  await doubleTap(P, '.bt-rjoy-base', 94);
  const afterD = await st(P);
  rec.ok('bowshield: ...and the same is true on the DISC -- no swap, no guard, on either surface',
    afterD.slot === beforeD.slot && !afterD.up, { before: beforeD.slot, after: afterD });
  /* The shield is still reachable on this weapon, which is the half of D8 the
     owner KEPT -- asserted right here so "no gesture" can never be read as "no
     way to guard with a bow". */
  rec.ok('bowshield: ...and the guard is still one tap away on the BUTTON, which is what the '
    + 'retired gesture was replaced by', await shieldBtnShown(P));

  /* ── 6b. AND THE MELEE OPENER IS BACK TO ITSELF ──
     v2.3.2472 CONSUMED the second press of a pair before it could reach
     maybeSwordDash, and had to argue that the 2500ms lunge cooldown made that
     safe.  With no pair to recognise, nothing is consumed: tap one lunges, and
     that is the owner's own check ("a melee first tap must still lunge"). */
  await gear(P, 'melee');
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = S.monsters[0];
    /* A lock the lunge can commit to, at a distance it will actually cover. */
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
    S.rpg.stamina = S.rpg.maxStamina || 100;
    S._abilCd = null;
    S._lastSwipe = 0;
  });
  await P.page.waitForTimeout(400);
  const dashReady = await P.page.evaluate(() =>
    (window.__btAbilityStatus ? window.__btAbilityStatus('sworddash') : null));
  const beforeM = await st(P);
  await doubleTap(P, '.bt-rjoy-base', 98);
  const afterM = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { slot: S.rpg.activeSlot, up: !!S._shieldUp,
      dashCd: window.__btAbilityStatus ? window.__btAbilityStatus('sworddash').cdLeft : null,
      lunged: !!(S._abilCd && S._abilCd.sworddash) };
  });
  rec.ok('bowshield: a double tap on MELEE does not swap the weapon either',
    afterM.slot === beforeM.slot, { before: beforeM.slot, after: afterM });
  /* Only claimed when the lunge was actually available -- a fixture without the
     ability equipped would make this row a tautology (TRAPS §33). */
  if (dashReady && dashReady.visible && dashReady.equipped && dashReady.afford) {
    rec.ok('bowshield: ...and tap ONE still lunged -- RBTN_DBL_MS and maybeSwordDash have nothing '
      + 'left to fight over', afterM.lunged === true, { dashReady, afterM });
  } else {
    rec.skip('bowshield: tap one still lunges', 'sworddash not available on this fixture: '
      + JSON.stringify(dashReady));
  }

  /* ── 6c. A DOUBLE TAP AND HOLD IS NOT A GUARD EITHER (v2.3.2542) ──
     v2.3.2472's 50px distance row stood here -- it proved that two taps in
     DIFFERENT places were not a swap.  With no swap on this surface that claim
     is vacuous, so the row is spent on the thing that can still go wrong
     instead: the exact gesture v2.3.2446 shipped, tap-tap-and-HOLD, which is
     what a hand restoring that code would make work again.  Held past the old
     300ms window and sampled while the finger is still down, because the old
     gesture raised the guard on the second touch-DOWN. */
  await gear(P, 'ranged');
  await P.page.waitForTimeout(400);
  const beforeH = await st(P);
  const heldPt = await zonePt(P);
  await P.page.evaluate((pt) => {
    const el = document.querySelector('[data-joyzone="R"]');
    window.__touch(el, 'touchstart', pt.x, pt.y, 104);
    window.__touch(el, 'touchend', pt.x, pt.y, 104);
    return new Promise((res) => setTimeout(() => {
      window.__touch(el, 'touchstart', pt.x, pt.y, 105);   /* and HOLD */
      res(true);
    }, 90));
  }, heldPt);
  await P.page.waitForTimeout(450);
  const heldSt = await st(P);
  const heldFlags = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { hold: !!S._rShieldHold, steered: !!S._rShieldSteered };
  });
  await P.page.evaluate((pt) => {
    const el = document.querySelector('[data-joyzone="R"]');
    window.__touch(el, 'touchend', pt.x, pt.y, 105);
  }, heldPt);
  await P.page.waitForTimeout(250);
  rec.ok('bowshield: tap-tap-and-HOLD on the zone raises no guard -- the v2.3.2446 gesture stays '
    + 'retired (§0.2: two gestures on one classifier)',
    !heldSt.up && heldFlags.hold === false, { heldSt, heldFlags });
  rec.ok('bowshield: ...and holding does not swap the weapon on the way either',
    heldSt.slot === beforeH.slot, { before: beforeH.slot, after: heldSt.slot });

  /* ── 7. a guard raised on melee SURVIVES the swap to a bow ──
     The inverse of v2.3.2446's rule, which dropped it: that drop existed only
     because the destination weapon had no button to lower the guard with. */
  await gear(P, 'melee');
  await P.page.waitForTimeout(400);
  await tapShield(P, 110);
  rec.ok('bowshield: the melee button still raises the guard, unchanged', (await st(P)).up);
  /* Cycled with the REAL gesture -- two quick taps on the left stick -- rather
     than by assigning activeSlot, because a test that set the field directly
     would assert nothing about the path a player takes. */
  await P.page.evaluate(() => {
    const c = window.__centre('[data-joyzone="L"]');
    window.__touch(c.el, 'touchstart', c.x, c.y, 121);
    window.__touch(c.el, 'touchend', c.x, c.y, 121);
  });
  await P.page.waitForTimeout(90);
  await P.page.evaluate(() => {
    const c = window.__centre('[data-joyzone="L"]');
    window.__touch(c.el, 'touchstart', c.x, c.y, 122);
    window.__touch(c.el, 'touchend', c.x, c.y, 122);
  });
  await P.page.waitForTimeout(500);
  const swapped = await st(P);
  rec.ok('bowshield: the left-stick cycle still swaps, and really did leave melee',
    swapped.slot !== 'melee', swapped);
  rec.ok('bowshield: ...and the guard SURVIVES the swap now (v2.3.2446 dropped it; D8 gives the '
    + 'destination weapon a button of its own, so there is nothing to strand)', swapped.up, swapped);
  rec.ok('bowshield: ...with the button on screen to lower it with', await shieldBtnShown(P));
  await tapShield(P, 130);
  rec.ok('bowshield: ...and it lowers on a bow exactly as it does on a sword', !(await st(P)).up);

  await P.ctx.close();
}
