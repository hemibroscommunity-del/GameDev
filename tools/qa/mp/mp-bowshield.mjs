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
  /* a monster in reach, so the button's "during combat" test is satisfied and
     a hidden button can only be the weapon rule */
  S.monsters = [{ id: 'qa-m', alive: true, curHp: 40, maxHp: 40, x: S.player.x + 60, y: S.player.y, type: 'slime' }];
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
  return { up: !!S._shieldUp, ang: S._shieldAngle, hold: !!S._rShieldHold, auto: !!S.autoAttack };
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
