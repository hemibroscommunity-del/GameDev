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
  };
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
  const stick = await P.page.evaluate(() => !!document.querySelector('.bt-rjoy-base .bt-joystick-knob'));
  rec.ok('the stick knob is gone from the right control', stick === false);
  rec.ok('no lock-on arc buttons exist any more',
    (await P.page.evaluate(() => document.querySelectorAll('[data-lockon]').length)) === 0);

  /* ── engage + hold = auto attack ── */
  await seedFodder(P, 'qa_rb_1', 60);
  await P.page.waitForTimeout(400);
  rec.ok('nothing is locked before the press', (await st(P)).lock === null);
  await P.page.evaluate(() => { const c = window.__centre('.bt-rjoy-base'); window.__touch(c.el, 'touchstart', c.x, c.y, 41); });
  await P.page.waitForTimeout(120);
  const pressed = await st(P);
  rec.ok('pressing Attack ENGAGES: the nearest monster in the perimeter is locked', pressed.lock === 'qa_rb_1', pressed);
  rec.ok('...and auto-attack is on while the finger is down', pressed.autoAttack === true, pressed);
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
  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); window.__touch(c.el, 'touchstart', c.x, c.y, 43); window.__touch(c.el, 'touchend', c.x, c.y, 43); });
  await P.page.waitForTimeout(200);
  const up = await st(P);
  rec.ok('one tap raises the shield', up.shield === true, up);
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

  /* ── a successful block lowers it by itself ── */
  await P.page.evaluate(() => { const c = window.__centre('[data-shield]'); window.__touch(c.el, 'touchstart', c.x, c.y, 46); window.__touch(c.el, 'touchend', c.x, c.y, 46); });
  await P.page.waitForTimeout(150);
  rec.ok('raised again for the block test', (await st(P)).shield === true);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = S.monsters[0];
    /* The worker's own word for a landed block: monster_attack {blocked:true}. */
    window.__btDispatch({ type: 'monster_attack', payload: {
      monsterId: m.id, targetId: S.myId, dmg: 5, dmgTaken: 0, blocked: true,
      zone: S.currentZone, attackerX: m.x, attackerY: m.y } });
  });
  await P.page.waitForTimeout(150);
  const afterBlock = await st(P);
  rec.ok('a blocked hit drops the shield automatically', afterBlock.shield === false && afterBlock.droppedWhy === 'blocked', afterBlock);

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

  /* ── a tap on the right half outside the button no longer attacks ── */
  await P.page.waitForTimeout(700);
  await P.page.evaluate(() => { const S = window._gameState.current; S.__swings = 0; S.autoAttack = false; });
  await P.page.evaluate(() => {
    const z = document.querySelector('[data-joyzone="R"]');
    const r = z.getBoundingClientRect();
    window.__touch(z, 'touchstart', r.x + r.width / 2, r.y + 80, 49);
  });
  await P.page.waitForTimeout(150);
  const zoneHeld = await st(P);
  rec.ok('a touch on the right half OUTSIDE the button is not an attack', zoneHeld.autoAttack === false && zoneHeld.swings === 0, zoneHeld);
  await P.page.evaluate(() => {
    const z = document.querySelector('[data-joyzone="R"]');
    const r = z.getBoundingClientRect();
    window.__touch(z, 'touchend', r.x + r.width / 2, r.y + 80, 49);
  });

  /* ── the button leaves when the fight does ── */
  await P.page.evaluate(() => { const S = window._gameState.current; S.monsters = []; S.lockedTarget = null; S.lastDamageTaken = 0; });
  await P.page.waitForTimeout(600);
  rec.ok('with no monster near and no lock, the shield button goes away',
    (await P.page.evaluate(() => !!document.querySelector('[data-shield]'))) === false);

  await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/.last-rbutton.png' }).catch(() => {});
  await P.ctx.close().catch(() => {});
}
