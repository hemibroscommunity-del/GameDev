/* THE RIGHT CONTROL IS A BUTTON (v2.3.2242).
 *
 * Owner: "The right thumbstick no longer acts as independent rotation angle.
 * It becomes a slightly larger contextual button ... Right button will be
 * held down to auto attack. The swipe on button will continue to be the
 * special attack. ... It'll be its own shield button that appears below the
 * right button during combat. Tapping it once holds the shield, tapping it
 * again disengages it. Shield will automatically disengage upon receiving
 * damage (successful block). ... Dodge ... will cancel any blocking action."
 *
 * v2.3.2246 (owner, after playing it): "right button (former right joystick)
 * should not be a standalone attack button anymore. After you engage with an
 * enemy by pressing attack within perimeter of it you auto lock on target and
 * the button turns into an attack button at that point."  And: "you can both
 * swing and block at the same time. That is not right."  And: "Block button
 * appears without an thumbnail icon until you actually tap block."  And:
 * "Hide the joystick overlays."  So the press is TWO-STEP now, the swing and
 * the block are mutually exclusive, the shield icon must READ while the
 * toggle is off, and both discs are hidden until they have something to do.
 *
 * A NOTE ON THE VISIBILITY ASSERTIONS.  el.dispatchEvent goes straight to the
 * element's listeners and ignores pointer-events entirely, so every touch
 * below would keep working against a button the player can neither see nor
 * press.  That is TRAPS §39 with its polarity flipped -- here "the press
 * worked" is exactly what a hidden control looks like -- so visibility is
 * asserted on its own, off the computed style, and never inferred from a
 * press landing.
 *
 * Every claim above is a state transition the player cannot see directly, so
 * each is read off the game state, and the ones the WORKER cares about
 * (blocking on the wire) are read from the worker (H.adminPlayer), because a
 * client that thinks it is blocking while the server disagrees is exactly
 * the class of bug TRAPS #18 describes.
 *
 * Driven with real TouchEvents on the real elements: the disc (.bt-rjoy-base)
 * is the touch target now -- since v2.3.816 it was pointerEvents:none over a
 * half-screen zone -- so a test that touched the zone would be testing the
 * old input.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const seedFodder = (P, id, dx) => P.page.evaluate(([id, dx]) => {
  const S = window._gameState.current;
  S._serverMonsters = false;
  S.monsters = [{
    id, arch: 'fodder', archetype: 'fodder', type: 'fodder',
    x: S.player.x + dx, y: S.player.y, renderX: S.player.x + dx, renderY: S.player.y,
    spawnX: S.player.x + dx, spawnY: S.player.y, targetX: S.player.x + dx, targetY: S.player.y,
    hp: 5000, curHp: 5000, maxHp: 5000, dmg: 0, level: 1, gold: 0,
    spd: 0, vx: 0, vy: 0,   /* see the mp-questcoach fixture note */
    alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
    respawnAt: 0, moveTimer: 0, _stuckArrows: [],
  }];
  S.lockedTarget = null;
}, [id, dx]);

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
    return { el, x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  };
});

const st = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  return {
    autoAttack: !!S.autoAttack, swings: S.__swings || 0, isSwinging: !!S.isSwinging,
    lock: S.lockedTarget ? S.lockedTarget.id : null,
    shield: !!S._shieldUp, ang: S._shieldAngle, aim: S._aimAngle,
    usedSwipe: !!S._hasUsedSwipe, lastSwipe: S._lastSwipe || 0, droppedWhy: S._shieldDroppedWhy || null,
    roll: !!S._dodgeRoll,
    back: !!S._backpedaling, cands: (S._targetCands || []).length,   /* v2.3.2246 */
  };
});

/* v2.3.2246: is a disc PAINTED, and would a finger land on it?  Read from the
   computed style of the corner box the resolver gates (data-disc) plus the
   pointer-events of the disc inside it -- the two halves of "on screen and
   pressable", neither of which a dispatched TouchEvent can tell you. */
const discVis = (P, side) => P.page.evaluate((side) => {
  const box = document.querySelector('[data-disc="' + side + '"]');
  if (!box) return null;
  const inner = box.querySelector(side === 'R' ? '.bt-rjoy-base' : '.bt-joystick-base');
  const cs = getComputedStyle(box);
  return {
    opacity: Number(cs.opacity),
    shown: Number(cs.opacity) > 0.5,
    pe: inner ? getComputedStyle(inner).pointerEvents : null,
    w: box.getBoundingClientRect().width,
  };
}, side);

/* v2.3.2246: the shield button's thumbnail, as the browser resolves it. */
const shieldIcon = (P) => P.page.evaluate(() => {
  const img = document.querySelector('[data-shield] img');
  if (!img) return null;
  const cs = getComputedStyle(img);
  return { filter: cs.filter, opacity: Number(cs.opacity),
           w: img.getBoundingClientRect().width, complete: img.complete, nw: img.naturalWidth };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Presser', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);
  await installTouch(P);
  const myId = await H.readState(P, (S) => S.myId);

  /* A weapon and a shield, so nothing below is refused for want of gear. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg && !S.rpg.weapon) S.rpg.weapon = { type: 'sword', name: 'QA Sword', tierMult: 1 };
    if (S.rpg && !S.rpg.shield) S.rpg.shield = { type: 'shield', name: 'QA Shield', tierMult: 1 };
    /* Count swings by watching the swing timer move. */
    S.__swings = 0; S.__lastSwingT = S.swingTimer || 0;
    clearInterval(window.__swingCounter);
    window.__swingCounter = setInterval(() => {
      const s = window._gameState.current;
      if (s.swingTimer && s.swingTimer !== s.__lastSwingT) { s.__swings++; s.__lastSwingT = s.swingTimer; }
    }, 20);
  });

  /* ── the surface ── */
  const disc = await P.page.evaluate(() => window.__centre('.bt-rjoy-base'));
  rec.ok('the right button is on screen at the old disc anchor (.bt-rjoy-base)', !!disc, disc);
  rec.ok('...and it is "slightly larger" than the 75px stick was', !!disc && disc.w >= 90, disc && { w: disc.w });
  const label = await P.page.evaluate(() => (document.querySelector('.bt-rjoy-base') || {}).textContent || '');
  rec.ok('...and it says Attack', /attack/i.test(label), label);
  /* ═══ v2.3.2258: THE KNOB IS BACK, SO THIS PIN INVERTS ═══
     v2.3.2242 asserted the knob was GONE, because the owner had just replaced
     the right joystick with a button.  He has now played the result and asked
     for the other half back: "I want both joysticks back and restore the
     previous behavior right joystick for auto attack and rotation.  BUT I also
     want the right joystick to keep its contextual button properties that
     exist now."  Both, on one control -- so the knob has to be there AND the
     contextual label above has to keep saying what a press will do. */
  const stick = await P.page.evaluate(() => !!document.querySelector('.bt-rjoy-base .bt-joystick-knob'));
  rec.ok('the right control is a joystick again -- it has its knob back', stick === true);
  rec.ok('no lock-on arc buttons exist any more',
    (await P.page.evaluate(() => document.querySelectorAll('[data-lockon]').length)) === 0);

  /* ── v2.3.2246: the overlays are hidden until they have something to do ──
     A FRESH PLAYER IS MID-ONBOARDING, and QuestCoach's `move` lesson holds
     the left disc up on purpose (game/controlVisibility.js) -- a tour cannot
     ring a control that is not painted.  So that state is asserted first, as
     itself, and the coach is retired before the contextual rule is tested.
     Reading __btDiscVis().holds rather than guessing from the opacity is the
     whole point: "painted with no thumb on it" has two possible causes and a
     screenshot names neither. */
  const holds0 = await P.page.evaluate(() => (window.__btDiscVis ? window.__btDiscVis() : null));
  rec.ok('the resolver publishes its reasons (probe present)', !!holds0 && !!holds0.holds, holds0);
  rec.ok('mid-onboarding the coach HOLDS the left disc up, which is why it is painted',
    !!holds0 && holds0.holds.L.indexOf('coach') >= 0 && (await discVis(P, 'L')).shown === true,
    holds0 && holds0.holds);
  /* Retire the coach (tut_4 turned in ends the chain — QuestCoach's own gate)
     so the contextual rule is what is being measured below. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg) { S.rpg._quests = S.rpg._quests || {}; S.rpg._quests.tut_4 = 'turnedIn'; }
  });
  await P.page.waitForTimeout(600);
  const vis0R = await discVis(P, 'R');
  const vis0L = await discVis(P, 'L');
  rec.ok('with the coach retired, nothing in range and nothing in reach, the right button is NOT painted',
    !!vis0R && vis0R.shown === false, { vis0R, why: await P.page.evaluate(() => window.__btDiscVis()) });
  rec.ok('...and it declines the tap, so one falls through to the lock-on zone beneath',
    !!vis0R && vis0R.pe === 'none', vis0R);
  rec.ok('...and with no thumb on it the left joystick is not painted either',
    !!vis0L && vis0L.shown === false, vis0L);
  rec.ok('...yet both corner boxes still occupy their layout box, so a coach mark can measure them',
    !!vis0R && vis0R.w > 50 && !!vis0L && vis0L.w > 50, { R: vis0R, L: vis0L });
  await P.page.evaluate(() => { const c = window.__centre('[data-joyzone="L"]'); window.__touch(c.el, 'touchstart', c.x, c.y + 40, 30); window.__touch(c.el, 'touchmove', c.x + 30, c.y + 40, 30); });
  await P.page.waitForTimeout(250);
  const visLdown = await discVis(P, 'L');
  rec.ok('a thumb on the movement side paints the left joystick', !!visLdown && visLdown.shown === true, visLdown);
  await P.page.evaluate(() => { const c = window.__centre('[data-joyzone="L"]'); window.__touch(c.el, 'touchend', c.x + 30, c.y + 40, 30); });
  await P.page.waitForTimeout(600);
  rec.ok('...and it goes again when the thumb lifts', (await discVis(P, 'L')).shown === false, await discVis(P, 'L'));

  /* ── v2.3.2246: press ONE engages, press TWO attacks ── */
  await seedFodder(P, 'qa_rb_1', 60);
  await P.page.waitForTimeout(400);
  /* ═══ v2.3.2251: THE LOCK ARRIVES BEFORE THE PRESS DOES ═══
     This asserted `lock === null` before pressing, which was the whole premise
     of the two-step press.  Targeting is automatic now (owner: "always be
     nearest enemy"), so a monster inside the perimeter IS the target the
     moment it gets there -- acquired by updateTargeting, not by a press. */
  rec.ok('the nearest monster is targeted automatically, with no press at all',
    (await st(P)).lock === 'qa_rb_1', await st(P));
  const visRmon = await discVis(P, 'R');
  rec.ok('a monster inside the targeting perimeter paints the right button, pressable',
    !!visRmon && visRmon.shown === true && visRmon.pe === 'auto', visRmon);
  /* v2.3.2246 regression pin: TouchControls is a React component whose JSX
     carries the RESTING opacity/pointer-events, so a re-render re-stamps them
     over whatever the resolver set.  A change-gated resolver would never
     notice and the button would be left painted-but-dead (or, before the
     JSX default was flipped, invisible-but-pressable).  An orientation change
     is the cheapest real re-render there is. */
  await P.page.setViewportSize({ width: 844, height: 390 });
  await P.page.waitForTimeout(600);
  const visLand = await discVis(P, 'R');
  rec.ok('the button survives a re-render (rotate to landscape): still painted, still pressable',
    !!visLand && visLand.shown === true && visLand.pe === 'auto', visLand);
  await P.page.setViewportSize(PHONE);
  await P.page.waitForTimeout(600);
  rec.ok('...and back in portrait', (await discVis(P, 'R')).shown === true, await discVis(P, 'R'));

  /* ═══ v2.3.2251: ONE PRESS, AND IT ATTACKS ═══
     The v2.3.2246 two-step (press one engages, press two attacks) is gone with
     the engage step -- there is nothing left for a press to acquire, so the
     button is a plain attack button again.  Asserted as the property that
     replaced it: the FIRST press swings, and it does not need a press before
     it to become an attack button. */
  await P.page.evaluate(() => { const c = window.__centre('.bt-rjoy-base'); window.__touch(c.el, 'touchstart', c.x, c.y, 41); });
  await P.page.waitForTimeout(250);
  const pressed = await st(P);
  rec.ok('the FIRST press ATTACKS: auto-attack runs while the finger is down', pressed.autoAttack === true, pressed);
  rec.ok('...at the target it already had, with no engage press in between',
    pressed.lock === 'qa_rb_1', pressed);
  await P.page.waitForTimeout(1500);
  const held = await st(P);
  rec.ok('holding keeps swinging (>=2 swings in 1.6s at the 600ms cadence)', held.swings >= 2, held);
  /* The aim goes to the BODY CENTRE (lockAimPoint: y - monsterBodyOffsetY,
     23 for a slime), not the feet -- so a slime 60px due east is aimed at
     atan2(-23, 60) = -0.37, and that is the number to expect.  (The first
     cut of this expected ~0 and "failed" on a correct aim.) */
  const wantAim = Math.atan2(-23, 60);
  rec.ok('...and the aim follows the lock (slime 60px east, body centre 23px up -> atan2(-23,60))',
    typeof held.aim === 'number' && Math.abs(held.aim - wantAim) < 0.12, { aim: held.aim, wantAim });
  await P.page.evaluate(() => { const c = window.__centre('.bt-rjoy-base'); window.__touch(c.el, 'touchend', c.x, c.y, 41); });
  await P.page.waitForTimeout(150);
  const released = await st(P);
  rec.ok('release stops the auto-attack', released.autoAttack === false, released);
  const swingsAtRelease = released.swings;
  await P.page.waitForTimeout(1300);
  rec.ok('...and no further swings arrive after release', (await st(P)).swings === swingsAtRelease, { swingsAtRelease, now: (await st(P)).swings });

  /* ── a quick swipe on the button is the special ── */
  await P.page.evaluate(() => { const S = window._gameState.current; S._hasUsedSwipe = false; S._lastSwipe = 0; if (S.rpg) S.rpg.mana = S.rpg.maxMana || 100; });
  await P.page.evaluate(() => {
    const c = window.__centre('.bt-rjoy-base');
    window.__touch(c.el, 'touchstart', c.x, c.y, 42);
    window.__touch(c.el, 'touchmove', c.x + 18, c.y - 4, 42);
  });
  await P.page.waitForTimeout(40);
  await P.page.evaluate(() => {
    const c = window.__centre('.bt-rjoy-base');
    window.__touch(c.el, 'touchmove', c.x + 40, c.y - 8, 42);
    window.__touch(c.el, 'touchend', c.x + 44, c.y - 8, 42);
  });
  await P.page.waitForTimeout(200);
  const flicked = await st(P);
  rec.ok('a quick swipe on the button fires the special', flicked.usedSwipe === true, flicked);
  rec.ok('...and leaves auto-attack off afterwards', flicked.autoAttack === false, flicked);

  /* ── the shield button ── */
  await P.page.waitForTimeout(300);
  const sb = await P.page.evaluate(() => window.__centre('[data-shield]'));
  rec.ok('with a monster in the perimeter, a shield button is on screen', !!sb, sb);
  if (sb && disc) {
    rec.ok('...directly BELOW the right button', sb.y > disc.y + disc.h / 2 - 2 && Math.abs(sb.x - disc.x) < 6,
      { shield: { x: sb.x, y: sb.y }, disc: { x: disc.x, y: disc.y, h: disc.h } });
  }
  /* ── v2.3.2246: the thumbnail has to READ while the toggle is OFF ── */
  const iconDown = await shieldIcon(P);
  rec.ok('the shield button carries a real, loaded thumbnail',
    !!iconDown && iconDown.complete === true && iconDown.nw > 0 && iconDown.w > 8, iconDown);
  /* The bug, exactly: `filter: brightness(0) opacity(.55)` painted the sprite
     solid black on a #34444B..#202C32 button, so there was no icon at all
     until the tap flipped the filter to 'none'.  Assert the CAUSE rather than
     a pixel count (TRAPS §21) -- and any filter here is also the documented
     iOS-over-WebGL grain hazard, so 'none' is the whole rule. */
  rec.ok('...painted with NO css filter, at a readable opacity, while the shield is DOWN',
    !!iconDown && (iconDown.filter === 'none' || !iconDown.filter) && iconDown.opacity >= 0.5, iconDown);

  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); window.__touch(c.el, 'touchstart', c.x, c.y, 43); window.__touch(c.el, 'touchend', c.x, c.y, 43); });
  await P.page.waitForTimeout(200);
  const up = await st(P);
  rec.ok('one tap raises the shield', up.shield === true, up);
  const iconUp = await shieldIcon(P);
  rec.ok('...and the lit state is the same sprite with no filter either, just brighter',
    !!iconUp && (iconUp.filter === 'none' || !iconUp.filter) && iconUp.opacity > iconDown.opacity,
    { iconUp, iconDown });
  rec.ok('...pointing at the locked target (same body-centre aim as the swing)',
    typeof up.ang === 'number' && Math.abs(up.ang - wantAim) < 0.12, { ang: up.ang, wantAim });
  rec.ok('...and the button did not start an auto-attack under it', up.autoAttack === false, up);
  /* On the wire: walk a step so a move packet carries `blocking`. */
  await P.page.evaluate(() => { const c = window.__centre('[data-joyzone="L"]'); window.__touch(c.el, 'touchstart', c.x, c.y + 40, 44); window.__touch(c.el, 'touchmove', c.x + 40, c.y + 40, 44); });
  await P.page.waitForTimeout(400);
  await P.page.evaluate(() => { const c = window.__centre('[data-joyzone="L"]'); window.__touch(c.el, 'touchend', c.x + 40, c.y + 40, 44); });
  await P.page.waitForTimeout(600);
  const live = await H.adminPlayer(wsPort, myId).then((a) => (a && a.live) || null).catch(() => null);
  rec.ok('the worker sees the shield up (blocking rides the move packet as before)', !!live && live.blocking === true, live);
  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); window.__touch(c.el, 'touchstart', c.x, c.y, 45); window.__touch(c.el, 'touchend', c.x, c.y, 45); });
  await P.page.waitForTimeout(200);
  rec.ok('a second tap lowers it', (await st(P)).shield === false);

  /* ── v2.3.2246: you do not swing and block at the same time ──
     Owner: "you can both swing and block at the same time. That is not
     right."  Tested in BOTH directions, because the exclusion is enforced in
     two places for two different reasons: the attack paths refuse to START
     while the shield is up (playerActions + the auto-attack gate in
     monsterCombat, which is the one bow and staff go through), and raising
     the shield cancels an attack already in flight (shieldToggle).

     ═══ v2.3.2248: WHICH ONE YIELDS CHANGED; THE EXCLUSION DID NOT ═══
     The owner's shield rule now names attacking as the thing that ends a
     block, so the attack no longer BOUNCES off a raised shield -- it lowers it
     and goes through on the same press.  The property this block exists to
     defend is still exactly true and is what is asserted: the two are never up
     at once.  What is no longer true is "the press lands nothing", which was
     never the owner's ask; it was v2.3.2246's way of achieving the exclusion,
     and there is now a better one. */
  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); window.__touch(c.el, 'touchstart', c.x, c.y, 60); window.__touch(c.el, 'touchend', c.x, c.y, 60); });
  await P.page.waitForTimeout(180);
  rec.ok('guard: shield raised for the exclusion test', (await st(P)).shield === true);
  await P.page.evaluate(() => { const S = window._gameState.current; S.__swings = 0; S.__lastSwingT = S.swingTimer || 0; });
  await P.page.evaluate(() => { const c = window.__centre('.bt-rjoy-base'); window.__touch(c.el, 'touchstart', c.x, c.y, 61); });
  await P.page.waitForTimeout(1400);
  const whileBlocking = await st(P);
  rec.ok('holding Attack with the shield UP breaks the hold and the swing lands',
    whileBlocking.swings > 0 && whileBlocking.droppedWhy === 'attack', whileBlocking);
  rec.ok('...and the shield is DOWN while it swings — never both at once',
    whileBlocking.shield === false, whileBlocking);
  await P.page.evaluate(() => { const c = window.__centre('.bt-rjoy-base'); window.__touch(c.el, 'touchend', c.x, c.y, 61); });
  await P.page.waitForTimeout(150);
  /* v2.3.2248: the attack already lowered it, so this is a state check rather
     than the second tap it used to be -- tapping here would RAISE it again. */
  rec.ok('guard: shield still lowered after the attack', (await st(P)).shield === false);
  /* The other direction: the guard goes up mid-attack, finger still down. */
  await P.page.evaluate(() => { const c = window.__centre('.bt-rjoy-base'); window.__touch(c.el, 'touchstart', c.x, c.y, 63); });
  await P.page.waitForTimeout(320);
  rec.ok('guard: auto-attack is running', (await st(P)).autoAttack === true, await st(P));
  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); window.__touch(c.el, 'touchstart', c.x, c.y, 64); window.__touch(c.el, 'touchend', c.x, c.y, 64); });
  await P.page.waitForTimeout(180);
  const raisedMidAttack = await st(P);
  rec.ok('raising the shield mid-attack cancels the attack outright',
    raisedMidAttack.shield === true && raisedMidAttack.autoAttack === false
    && raisedMidAttack.isSwinging === false, raisedMidAttack);
  await P.page.evaluate(() => { const c = window.__centre('.bt-rjoy-base'); window.__touch(c.el, 'touchend', c.x, c.y, 63); });
  await P.page.waitForTimeout(150);
  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); window.__touch(c.el, 'touchstart', c.x, c.y, 65); window.__touch(c.el, 'touchend', c.x, c.y, 65); });
  await P.page.waitForTimeout(180);
  rec.ok('guard: back to shield down for the block test below', (await st(P)).shield === false);

  /* ── ═══ v2.3.2248: A LANDED BLOCK KEEPS THE SHIELD UP ═══
     This asserted the opposite until the owner played it: "Instead of dropping
     the shield at first hit I want it to keep being held ... until you attack
     (thus breaking the shield hold) or you tap the shield button again."
     Inverted rather than deleted, because "the shield survives a hit" is the
     new rule and needs a gate of its own -- and a SECOND blocked hit is
     asserted too, since "drops on the second one" would pass a one-hit test. ── */
  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); window.__touch(c.el, 'touchstart', c.x, c.y, 46); window.__touch(c.el, 'touchend', c.x, c.y, 46); });
  await P.page.waitForTimeout(150);
  rec.ok('raised again for the block test', (await st(P)).shield === true);
  const landBlock = async (id) => {
    await P.page.evaluate((tid) => {
      const S = window._gameState.current;
      const m = S.monsters[0];
      /* The worker's own word for a landed block: monster_attack {blocked:true}. */
      window.__btDispatch({ type: 'monster_attack', payload: {
        monsterId: m.id, targetId: S.myId, dmg: 5, dmgTaken: 0, blocked: true,
        zone: S.currentZone, attackerX: m.x, attackerY: m.y } });
    }, id);
    await P.page.waitForTimeout(150);
    return st(P);
  };
  const afterBlock = await landBlock(1);
  rec.ok('a blocked hit does NOT drop the shield -- the hold survives it',
    afterBlock.shield === true, afterBlock);
  const afterBlock2 = await landBlock(2);
  rec.ok('...and neither does a second one (it is held, not charged)',
    afterBlock2.shield === true, afterBlock2);

  /* ── ═══ v2.3.2252: THE SHIELD BASH BUTTON FOLLOWS THE SHIELD ═══ ──
     Owner: "Make shield bash an ability for any level (no gates) the only
     requirement is you must have your shield held.  Then the button for shield
     bash appears."  Asserted off COMPUTED STYLE, never off whether a press
     lands: this file's own header records that dispatchEvent ignores
     pointer-events entirely, so a press landing proves nothing about
     visibility.  The character here is at the ungated floor (level 3), which
     is the whole point -- before this it needed level 4. ── */
  const bashVis = () => P.page.evaluate(() => {
    const el = document.querySelector('[data-ability="bash"]');
    if (!el) return { present: false };
    const cs = getComputedStyle(el);
    return { present: true, shown: cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05 };
  });
  /* Self-contained: put the shield DOWN first rather than assuming the block
     above left it that way -- a scenario that inherits state silently becomes
     order-dependent, and this one is inserted between two shield tests. */
  if ((await st(P)).shield === true) {
    await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); window.__touch(c.el, 'touchstart', c.x, c.y, 79); window.__touch(c.el, 'touchend', c.x, c.y, 79); });
    await P.page.waitForTimeout(240);
  }
  rec.ok('guard: shield is down for the bash-button test', (await st(P)).shield === false, await st(P));
  const bashDown = await bashVis();
  rec.ok('with the shield DOWN there is no Shield Bash button', bashDown.present === false || bashDown.shown === false, bashDown);
  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); window.__touch(c.el, 'touchstart', c.x, c.y, 80); window.__touch(c.el, 'touchend', c.x, c.y, 80); });
  await P.page.waitForTimeout(260);
  rec.ok('guard: the shield went up', (await st(P)).shield === true);
  const bashUp = await bashVis();
  rec.ok('...and raising it puts the Shield Bash button on screen, at level 3 (no level gate)',
    bashUp.present === true && bashUp.shown === true, bashUp);
  /* And the v2.3.2248 exemption, which nothing pinned until now: bash is the
     one attack that does NOT break the hold -- bashing out of a block is its
     whole point, and a bash that dropped the shield would delete its own
     button mid-cooldown. */
  await P.page.evaluate(() => {
    const el = document.querySelector('[data-ability="bash"]');
    if (el) { const b = el.getBoundingClientRect(); window.__touch(el, 'touchstart', b.x + b.width / 2, b.y + b.height / 2, 81); window.__touch(el, 'touchend', b.x + b.width / 2, b.y + b.height / 2, 81); }
  });
  await P.page.waitForTimeout(320);
  const afterBash = await st(P);
  rec.ok('a Shield Bash does NOT break the shield hold (it is the one attack that does not)',
    afterBash.shield === true, afterBash);
  const bashStill = await bashVis();
  rec.ok('...so its button is still there for the next one', bashStill.shown === true, bashStill);
  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); window.__touch(c.el, 'touchstart', c.x, c.y, 82); window.__touch(c.el, 'touchend', c.x, c.y, 82); });
  await P.page.waitForTimeout(220);
  rec.ok('guard: shield down again, and the bash button goes with it',
    (await st(P)).shield === false && ((await bashVis()).shown !== true));
  /* Put the shield back UP: the block below is the attack-breaks-the-hold
     test and it needs a hold to break.  Restoring what this section borrowed
     keeps the file order-independent in both directions. */
  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); window.__touch(c.el, 'touchstart', c.x, c.y, 83); window.__touch(c.el, 'touchend', c.x, c.y, 83); });
  await P.page.waitForTimeout(260);
  rec.ok('guard: shield raised again for the attack-breaks-the-hold test', (await st(P)).shield === true);

  /* ── attacking is what breaks the hold ── */
  await P.page.evaluate(() => { const c = window.__centre('.bt-rjoy-base'); window.__touch(c.el, 'touchstart', c.x, c.y, 66); });
  await P.page.waitForTimeout(220);
  const afterAtk = await st(P);
  await P.page.evaluate(() => { const c = window.__centre('.bt-rjoy-base'); window.__touch(c.el, 'touchend', c.x, c.y, 66); });
  await P.page.waitForTimeout(120);
  rec.ok('attacking breaks the shield hold (owner: "thus breaking the shield hold")',
    afterAtk.shield === false && afterAtk.droppedWhy === 'attack', afterAtk);

  /* ── a dodge cancels it ── */
  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); window.__touch(c.el, 'touchstart', c.x, c.y, 47); window.__touch(c.el, 'touchend', c.x, c.y, 47); });
  await P.page.waitForTimeout(150);
  rec.ok('raised again for the dodge test', (await st(P)).shield === true);
  await P.page.evaluate(() => { const S = window._gameState.current; if (S.rpg) S.rpg.stamina = S.rpg.maxStamina || 100; });
  /* The left-side swipe, as the owner keeps it: fast, >30px, <300ms. */
  await P.page.evaluate(() => {
    const c = window.__centre('[data-joyzone="L"]');
    window.__touch(c.el, 'touchstart', c.x - 40, c.y, 48);
    window.__touch(c.el, 'touchmove', c.x + 20, c.y, 48);
    window.__touch(c.el, 'touchend', c.x + 60, c.y, 48);
  });
  await P.page.waitForTimeout(80);
  const afterDodge = await st(P);
  rec.ok('a left-side swipe dodges', afterDodge.roll === true, afterDodge);
  rec.ok('...and the dodge cancels the block', afterDodge.shield === false && afterDodge.droppedWhy === 'dodge', afterDodge);

  /* ── the button leaves when the fight does -- unless the shield is still up ── */
  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); window.__touch(c.el, 'touchstart', c.x, c.y, 50); window.__touch(c.el, 'touchend', c.x, c.y, 50); });
  await P.page.waitForTimeout(150);
  rec.ok('raised again for the leave test', (await st(P)).shield === true);
  await P.page.evaluate(() => { const S = window._gameState.current; S.monsters = []; S.lockedTarget = null; S.lastDamageTaken = 0; });
  await P.page.waitForTimeout(600);
  /* post-review: the first cut hid the button here with the shield still
     up -- a slower walk and no way down but a dodge. */
  rec.ok('the fight is over but the shield is UP: the button stays so it can be tapped off',
    (await P.page.evaluate(() => { const e = document.querySelector('[data-shield]'); return e ? e.getAttribute('data-shield') : null; })) === 'up');
  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); window.__touch(c.el, 'touchstart', c.x, c.y, 51); window.__touch(c.el, 'touchend', c.x, c.y, 51); });
  await P.page.waitForTimeout(600);
  rec.ok('...tapped down, with no monster near and no lock, the shield button goes away',
    (await P.page.evaluate(() => !!document.querySelector('[data-shield]'))) === false
    && (await st(P)).shield === false);

  /* ═══ THE RIGHT HALF IS THE JOYSTICK AGAIN (v2.3.2258) ═══
     LAST, on purpose.  This block presses and drags the zone, nulls the lock
     and releases -- state the shield-button tests above are sensitive to, and
     when it sat mid-file it turned the "shield button goes away" assertion red
     by leaving the fight looking live.  New assertions do not get to reorder
     old ones. */
  /* ── the right half outside the button IS the joystick again (v2.3.2258) ── */
  await P.page.waitForTimeout(700);
  await P.page.evaluate(() => { const S = window._gameState.current; S.__swings = 0; S.autoAttack = false; });
  await P.page.evaluate(() => {
    const z = document.querySelector('[data-joyzone="R"]');
    const r = z.getBoundingClientRect();
    window.__touch(z, 'touchstart', r.x + r.width / 2, r.y + 80, 49);
  });
  await P.page.waitForTimeout(150);
  const zoneHeld = await st(P);
  /* ═══ v2.3.2258: THIS PIN INVERTS TOO ═══
     v2.3.2242 made the right half inert -- the disc was the only combat input
     -- and this asserted it.  The owner has played that and asked for the
     other half back: "I want both joysticks back and restore the previous
     behavior right joystick for auto attack and rotation."  The zone is the
     STICK again (a press auto-attacks, a drag aims) and the disc stays the
     contextual BUTTON, which is the rest of his sentence.  A press outside the
     button therefore MUST attack now, and the assertion says so. */
  rec.ok('a touch on the right half outside the button holds the attack (the stick is back)',
    zoneHeld.autoAttack === true, zoneHeld);
  /* ...and a DRAG on it aims, which is the "rotation" half of the request.
     ═══ WITH THE LOCK DROPPED FIRST, AND THAT IS THE DESIGN ═══
     monsterCombat re-aims at the locked target every frame while the attack is
     held (monsterCombat.js:1342), so a lock BEATS the stick -- the first cut of
     this assertion held a lock and measured the stomp: _lastAimAngle showed the
     stick's PI and _aimAngle showed the lock's -1.16.  That is correct and is
     the melee auto-targeting the owner asked to keep ("For ONLY melee (sword) I
     want to keep the auto targeting behavior that exists now"): a lock means
     "aim at this".  Rotation is what governs when there is NO lock -- which is
     every bow and staff shot now that ranged does not auto-acquire, and melee
     with nothing in the perimeter.  So the test drops the lock, which is the
     state the stick actually steers in. */
  await P.page.evaluate(() => { window._gameState.current.lockedTarget = null; });
  await P.page.waitForTimeout(60);
  const aimBefore = await P.page.evaluate(() => window._gameState.current._lastAimAngle);
  await P.page.evaluate(() => {
    const z = document.querySelector('[data-joyzone="R"]');
    const r = z.getBoundingClientRect();
    window.__touch(z, 'touchmove', r.x + r.width / 2 - 60, r.y + 80, 49);
  });
  await P.page.waitForTimeout(120);
  const zoneAimed = await P.page.evaluate(() => {
    const S = window._gameState.current;
    return { aim: S._aimAngle, aiming: !!S._aiming, facing: S._facing, last: S._lastAimAngle };
  });
  /* MEASURED ON _lastAimAngle AND _facing, not on _aimAngle.  _aimAngle is a
     SHARED field with two other writers that both outrank a stick by design --
     monsterCombat aims it at a locked target every frame (:1342), and the
     desktop mouse path re-points it from _mouseAimAngle whenever autoAttack is
     on (BroTown:9540).  This harness is a real browser with a real cursor, so
     the mouse writer is live here and is not on the owner's phone: the first
     cut of this assertion read _aimAngle and measured that, reporting the
     stick's PI in _lastAimAngle beside the cursor's -1.16 in _aimAngle.
     _lastAimAngle is the stick's own record and nothing else writes it, which
     makes it the honest witness for "did the drag rotate". */
  /* The drag runs 60px LEFT along the zone's own row, so the stick's angle
     must come out near PI.  _facing is not asserted for the same reason
     _aimAngle is not: both are re-stamped by monsterCombat and by the desktop
     mouse path in the frames after the drag, and this harness has a cursor. */
  rec.ok(`...and with no lock, dragging it left rotates the stick (${aimBefore} -> ${zoneAimed.last})`,
    zoneAimed.aiming === true && typeof zoneAimed.last === 'number'
      && Math.abs(zoneAimed.last) > Math.PI / 2,
    { before: aimBefore, after: zoneAimed, wanted: 'about PI' });
  /* _lastAimAngle has had no writer since PR #546 deleted handleRJoyMove --
     abilities and the renderer read it and got undefined.  Restored with the
     stick, and pinned here so the next deletion is noticed. */
  rec.ok('...and it writes _lastAimAngle again, which nothing has since PR #546',
    typeof zoneAimed.last === 'number', zoneAimed);
  await P.page.evaluate(() => {
    const z = document.querySelector('[data-joyzone="R"]');
    const r = z.getBoundingClientRect();
    window.__touch(z, 'touchend', r.x + r.width / 2 - 60, r.y + 80, 49);
  });
  await P.page.waitForTimeout(120);
  const zoneUp = await st(P);
  rec.ok('...and letting go stops the attack', zoneUp.autoAttack === false, zoneUp);
  await P.page.evaluate(() => {
    const z = document.querySelector('[data-joyzone="R"]');
    const r = z.getBoundingClientRect();
    window.__touch(z, 'touchend', r.x + r.width / 2, r.y + 80, 49);
  });


  await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/.last-rbutton.png' }).catch(() => {});
  await P.ctx.close().catch(() => {});
}
