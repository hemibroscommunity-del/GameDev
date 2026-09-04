/* THE JOYSTICKS COME UP ON INPUT AND FADE TWO SECONDS AFTER IT STOPS (v2.3.2260)
 *
 * Owner: "Regardless of which weapon is equipped, Make the joysticks both each
 * appear when input is detected (or keep the right joystick appeared if the
 * contextual button is active) then fade to disappearing after 2 seconds of no
 * input."
 *
 * ═══ THE THIRD ASSERTION IS THE ONE THAT MATTERS ═══
 * "Appears" and "fades" are the visible half and are easy to check.  The half
 * that is invisible, and that caused the bug this ships alongside, is whether a
 * painted disc also TAKES TOUCHES.  v2.3.2258 pinned the right disc live for
 * bow and staff so a ranged player would have something to press; the disc is a
 * BUTTON and does not steer, so every touch that landed on it was swallowed,
 * the aim was never written, and every shot left along one of four axes.
 *
 * So this file asserts a THREE-WAY split, not a two-way one:
 *   PAINTED    on input, and while the contextual button is active
 *   PRESSABLE  only while contextual -- a disc painted merely because you
 *              touched nearby a moment ago must decline, or the swallowing
 *              comes straight back
 *   LIT        only while contextual -- a brass-lit disc that declines a thumb
 *              is a discoverability trap (v2.3.2251's complaint, inverted)
 *
 * Run against BOTH a sword and a bow, because "regardless of which weapon is
 * equipped" is the first clause of the owner's sentence and the behaviour it
 * replaces was weapon-dependent.
 *
 * TIMING: the corner boxes carry `transition: opacity .22s ease` (game.css), so
 * every sample here is taken with the transition settled -- a read mid-fade is
 * a read of the browser's interpolation, not of the resolver's decision.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const FADE_MS = 2000;
const SETTLE = 400;   /* comfortably past the 220ms CSS transition */

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

/* Painted / pressable / lit, read from the DOM the way a finger meets it. */
const vis = (P, side) => P.page.evaluate((side) => {
  const box = document.querySelector('[data-disc="' + side + '"]');
  if (!box) return null;
  const inner = box.querySelector(side === 'R' ? '.bt-rjoy-base' : '.bt-joystick-base');
  const cs = getComputedStyle(box);
  const ics = inner ? getComputedStyle(inner) : null;
  return {
    opacity: +Number(cs.opacity).toFixed(2),
    painted: Number(cs.opacity) > 0.5,
    pressable: ics ? ics.pointerEvents === 'auto' : null,
    lit: ics ? ics.borderColor !== 'rgba(0, 0, 0, 0)' && ics.borderColor !== 'transparent' : null,
  };
}, side);

const arm = (P, slot) => P.page.evaluate((slot) => {
  const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
  const t = ((F.WOODWORKING_TIERS || {}).pine) || { tierMult: 1 };
  R.weapon = R.weapon || { type: 'greatsword', tierMult: 1.12, gearBase: 'copper', name: 'QA Great Sword' };
  R.rangedWeapon = { type: 'bow', tierMult: t.tierMult, gearBase: 'pine', name: 'Pine Bow' };
  R.activeSlot = slot;
  /* No context of any kind: no monsters, no nodes, no lock, no harvest. */
  S.monsters = []; S.gatherNodes = []; S.lockedTarget = null;
  S._extraction = null; S._nearNode = null; S._proxNode = null;
  S.autoAttack = false;
  return { slot: R.activeSlot };
}, slot);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Fader', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);
  await installTouch(P);

  /* ═══ RETIRE THE COACH FIRST, OR THE LEFT STICK IS PINNED ═══
     A fresh player is mid-onboarding and QuestCoach's `move` lesson takes a
     HOLD on the left disc on purpose (game/controlVisibility.js) -- a tour
     cannot ring a control that is not painted, and the hold is deliberately one
     of the terms the resolver ors in.  The first run of this file read that as
     "the fade is broken on the left": the left box sat at opacity 1 forever
     while the right faded correctly.  It was the tutorial, not the resolver.
     Asserted as itself before being retired, so the hold's own behaviour is
     covered rather than merely worked around, and read from the probe's
     `holds` rather than guessed from the opacity -- "painted with no thumb on
     it" has two possible causes and the number names neither. */
  const holds0 = await P.page.evaluate(() => (window.__btDiscVis ? window.__btDiscVis() : null));
  rec.ok('mid-onboarding the coach holds the left stick up, and says so (guard)',
    !!holds0 && !!holds0.holds && holds0.holds.L.indexOf('coach') >= 0, holds0 && holds0.holds);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg) { S.rpg._quests = S.rpg._quests || {}; S.rpg._quests.tut_4 = 'turnedIn'; }
  });
  await P.page.waitForTimeout(700);
  const holds1 = await P.page.evaluate(() => (window.__btDiscVis ? window.__btDiscVis() : null));
  rec.ok('...and releases it once the chain is over, so the fade rule is what is measured below',
    !!holds1 && holds1.holds.L.indexOf('coach') < 0, holds1 && holds1.holds);

  for (const slot of ['melee', 'ranged']) {
    const armed = await arm(P, slot);
    await P.page.waitForTimeout(FADE_MS + SETTLE + 400);
    const idle = { L: await vis(P, 'L'), R: await vis(P, 'R') };
    console.log(`    ${slot} idle: ${JSON.stringify(idle)}`);
    rec.ok(`${slot}: with no input and no context BOTH sticks are off screen (guard)`,
      idle.L && idle.R && !idle.L.painted && !idle.R.painted, idle);
    /* The bug this replaces, stated as its own assertion: the right disc used
       to be pinned live for ranged on every frame, so it was painted here AND
       taking touches -- which is what swallowed the aim. */
    rec.ok(`${slot}: ...and the right disc is not silently taking touches while invisible`,
      idle.R && idle.R.pressable === false, idle.R);

    /* ── it appears on input, on each side independently ── */
    for (const [side, sel, dy] of [['L', '[data-joyzone="L"]', 40], ['R', '[data-joyzone="R"]', 40]]) {
      await P.page.evaluate(([sel, dy, id]) => {
        const c = window.__centre(sel);
        window.__touch(c.el, 'touchstart', c.x, c.y + dy, id);
        window.__touch(c.el, 'touchmove', c.x + 30, c.y + dy, id);
      }, [sel, dy, side === 'L' ? 70 : 71]);
      await P.page.waitForTimeout(SETTLE);
      const held = await vis(P, side);
      console.log(`    ${slot} ${side} held: ${JSON.stringify(held)}`);
      rec.ok(`${slot}: a thumb on the ${side === 'L' ? 'movement' : 'aim'} side paints that joystick`,
        held && held.painted, held);

      await P.page.evaluate(([sel, dy, id]) => {
        const c = window.__centre(sel);
        window.__touch(c.el, 'touchend', c.x + 30, c.y + dy, id);
      }, [sel, dy, side === 'L' ? 70 : 71]);
      /* HALF-WAY THROUGH THE WINDOW it must still be there.  Without this the
         "fades after 2 seconds" claim is satisfied by a control that vanished
         the instant the thumb lifted, which is the behaviour being replaced. */
      await P.page.waitForTimeout(FADE_MS / 2);
      const mid = await vis(P, side);
      rec.ok(`${slot}: ...and it is STILL there a second after the thumb lifts (${mid && mid.opacity})`,
        mid && mid.painted, mid);

      await P.page.waitForTimeout(FADE_MS / 2 + SETTLE + 300);
      const gone = await vis(P, side);
      console.log(`    ${slot} ${side} after ${FADE_MS}ms: ${JSON.stringify(gone)}`);
      rec.ok(`${slot}: ...and it has faded out by ${FADE_MS}ms of no input (${gone && gone.opacity})`,
        gone && !gone.painted, gone);
    }
  }

  /* ── the contextual half of the sentence: "or keep the right joystick
     appeared if the contextual button is active" ── */
  await arm(P, 'melee');
  await P.page.waitForTimeout(FADE_MS + SETTLE + 400);
  const ctx = await P.page.evaluate(() => {
    const S = window._gameState.current, F = window._gameFns || {};
    const arch = Object.keys(F.ARCHETYPES || {}).find((k) => k === 'fodder');
    S._serverMonsters = false;
    const m = F.createMonster('joyfade-1', arch, 2, S.player.x + 90, S.player.y, null);
    m.alive = true; m.curHp = m.maxHp = 9000; m.spd = 0; m.vx = 0; m.vy = 0;
    S.monsters = [m];
    return { id: m.id };
  });
  rec.ok('a monster is inside the perimeter (guard)', !!ctx && ctx.id === 'joyfade-1', ctx);
  /* Well past the fade window with NO touch at all: context alone must hold it. */
  await P.page.waitForTimeout(FADE_MS + SETTLE + 600);
  const ctxVis = await vis(P, 'R');
  console.log(`    contextual: ${JSON.stringify(ctxVis)}`);
  rec.ok('the right control stays up while the contextual button is active, with no input at all',
    ctxVis && ctxVis.painted, ctxVis);
  rec.ok('...and NOW it takes touches, because now a press does something',
    ctxVis && ctxVis.pressable === true, ctxVis);
  rec.ok('...and now it is lit, which is what tells you so',
    ctxVis && ctxVis.lit === true, ctxVis);

  await P.ctx.close().catch(() => {});
}
