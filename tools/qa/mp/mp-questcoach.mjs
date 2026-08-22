/* THE QUESTLINE TEACHES THE CONTROLS BY FLASHING THEM (v2.3.1796).
 *
 * Owner: "the controls need to be taught in the quest line by highlighting
 * (flashing) the sequence you should be learning for equipping items, double
 * tap the left joystick for swapping weapons, double tap and hold (maybe text
 * above the right joystick and hold for a certain number of seconds while you
 * rotate in a 360 degree circle)."
 *
 * Three things have to be true for that to be a feature rather than a
 * decoration, and each is asserted here:
 *
 *  1. IT APPEARS WHEN THE QUESTLINE MAKES IT RELEVANT, not on a timer and not
 *     all at once.  One mark at a time, in order.
 *  2. IT POINTS AT THE REAL CONTROL.  The mark is measured off the live DOM,
 *     so this test reads the mark's rect and the control's rect and demands
 *     they agree — a coach mark drawn at a remembered coordinate is the exact
 *     failure ControlsTutorial was rebuilt to escape in v2.3.1205.
 *  3. IT GOES AWAY WHEN YOU DO THE THING.  Every lesson is watched from game
 *     state, so this drives the STATE (equip the gear, change the slot, raise
 *     and sweep the shield) and requires the mark to retire.  A hint you
 *     cannot satisfy is worse than no hint.
 *
 * And one thing must never be true: the mark must not eat the touch that the
 * mark is asking for.  pointerEvents is asserted, on the ring and the card.
 */
import * as H from './harness.mjs';

const coach = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-coach]');
  if (!el) return null;
  const ring = el.querySelector('[data-coach-ring]');
  const card = el.querySelector('[data-coach-card]');
  const rr = ring && ring.getBoundingClientRect();
  const cr = card && card.getBoundingClientRect();
  return {
    id: el.getAttribute('data-coach'),
    text: el.textContent || '',
    zIndex: getComputedStyle(el).zIndex,
    layerPE: getComputedStyle(el).pointerEvents,
    ringPE: ring ? getComputedStyle(ring).pointerEvents : null,
    cardPE: card ? getComputedStyle(card).pointerEvents : null,
    ring: rr ? { left: rr.left, top: rr.top, width: rr.width, height: rr.height } : null,
    card: cr ? { left: cr.left, top: cr.top, width: cr.width, height: cr.height } : null,
    progress: (() => {
      const b = el.querySelector('[data-coach-progress]');
      return b ? b.style.width : null;
    })(),
  };
});

const rectOf = (P, sel) => P.page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}, sel);

/* Wait for a specific lesson (or for the marks to fall silent). */
async function waitCoach(P, want, ms = 8000) {
  const t0 = Date.now();
  for (;;) {
    const c = await coach(P);
    if (want === null ? !c : (c && c.id === want)) return c;
    if (Date.now() - t0 > ms) return c;
    await P.page.waitForTimeout(200);
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* A touch viewport: the joystick lessons anchor to controls that are
     display:none under (pointer:fine), and a lesson with no live anchor is
     SKIPPED by design.  Testing them on a desktop box would assert nothing
     and pass — which is the failure mode this note exists to prevent. */
  const P = await H.newPlayer(browser, {
    name: 'Cadet', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* ── 0. before the questline, nothing is being taught ──
     The coach is gated on Mayor Bro's chain, so a player who has not taken
     his first quest gets no marks at all.  Without this the whole file could
     pass on an overlay that is simply always on. */
  const idle = await coach(P);
  rec.ok('no coach mark before the questline starts', !idle, idle);

  /* ── 1. the gear lesson, off the REAL quest ──
     Nothing is fabricated here on purpose.  The lesson's trigger is a claim
     about what accepting tut_1 leaves behind — that the sword and shield land
     in the STASHES rather than in your hands — and if that claim is wrong the
     mark never appears in the actual game while a test that had hand-placed
     the stash would sail through.  So: walk up to Mayor Bro, take the quest,
     and let the worker put the kit wherever it really puts it. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const npc = (S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    const cv = document.querySelector('canvas');
    if (!S || !npc || !cv || !S.camera) return;
    S.player.x = npc.x; S.player.y = npc.y + 40;
    const rect = cv.getBoundingClientRect();
    const cx = rect.left + (npc.x - S.camera.x) * (S._worldScaleX || 1);
    const cy = rect.top + (npc.y - S.camera.y) * (S._worldScaleY || 1);
    for (const type of ['pointerdown', 'pointerup', 'click']) {
      cv.dispatchEvent(new PointerEvent(type, {
        clientX: cx, clientY: cy, bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch',
      }));
    }
  });
  await P.page.waitForTimeout(1200);
  /* v2.3.1827: he speaks first now, and the Accept lives on a second panel
     behind his lines (v2.3.1820) — see harness.advanceNpcDialogue. */
  const landed = await H.advanceNpcDialogue(P);
  rec.ok("Mayor Bro's lines lead to the offer panel (guard)", landed === 'offer', { landed });
  const took = await H.confirmQuestOffer(P);
  rec.ok("Mayor Bro's first quest was accepted for real (guard)", took, { took });
  await P.page.waitForTimeout(2500);
  /* Close the dialogue — it stays open after accepting, and its scrim is
     exactly the kind of thing the mark is supposed to stand down behind. */
  await P.page.keyboard.press('Escape').catch(() => {});
  await H.closeNpcDialogue(P);
  await P.page.waitForTimeout(900);
  const granted = await H.readState(P, (S) => ({
    quests: S.rpg._quests,
    weaponStash: (S.rpg.weaponStash || []).length,
    shieldStash: (S.rpg.shieldStash || []).length,
    weapon: !!S.rpg.weapon, shield: !!S.rpg.shield,
  }));
  rec.ok('the quest really is active on the client', granted.quests && granted.quests.tut_1 === 'active', granted);
  /* THE CLAIM THE LESSON RESTS ON.  If the worker ever starts auto-equipping
     the starter kit this fails here, loudly, instead of the coach quietly
     never appearing for a real player. */
  rec.ok('accepting it leaves gear UNEQUIPPED in the bag — which is why the lesson exists',
    granted.weaponStash + granted.shieldStash > 0 && !(granted.weapon && granted.shield), granted);

  const c1 = await waitCoach(P, 'equip');
  rec.ok('with the kit in the bag and nothing equipped, the gear lesson appears',
    !!(c1 && c1.id === 'equip'), c1);
  rec.ok('...and it says what to do with it',
    !!(c1 && /equip/i.test(c1.text)), c1 && c1.text);

  await P.page.screenshot({ path: 'tools/qa/mp/out/coach-1-equip.png' });
  /* IT POINTS AT THE ITEM ITSELF.  On a phone the bag grid is already on
     the dashboard, so the gear is right there and the mark goes straight to
     it — telling a player to "open your bag" while the sword is visible in
     front of them would be worse than silence. */
  const tile = await rectOf(P, '[data-tut="coach-gear"]');
  rec.ok('the unequipped gear is on the dashboard to point at (guard)', !!tile, tile);
  if (tile && c1 && c1.ring) {
    const dx = Math.abs((c1.ring.left + c1.ring.width / 2) - (tile.left + tile.width / 2));
    const dy = Math.abs((c1.ring.top + c1.ring.height / 2) - (tile.top + tile.height / 2));
    rec.ok('the ring is measured onto the real item tile, not a remembered spot',
      dx < 6 && dy < 6, { ring: c1.ring, tile, dx, dy });
  }

  /* ── 2. THE MARK MUST NOT EAT THE TAP IT IS ASKING FOR ──
     The overlay covers the whole viewport so it can draw anywhere; if any part
     of it were hit-testable, the one control the player has just been told to
     press would stop responding.  That is the worst possible bug for this
     feature, so it is checked on every layer of it. */
  rec.ok('the coach layer is not hit-testable',
    !!(c1 && c1.layerPE === 'none' && c1.ringPE === 'none' && c1.cardPE === 'none'),
    { layer: c1 && c1.layerPE, ring: c1 && c1.ringPE, card: c1 && c1.cardPE });
  /* ...and proven by USE: the tile it rings still takes the tap, and the
     item popup opens through the mark. */
  await P.page.evaluate(() => {
    const el = document.querySelector('[data-tut="coach-gear"]');
    const r = el.getBoundingClientRect();
    for (const type of ['pointerdown', 'pointerup']) {
      el.dispatchEvent(new PointerEvent(type, {
        clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
        bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch',
      }));
    }
  });
  await P.page.waitForTimeout(800);
  const popped = await H.bodyText(P);
  rec.ok('the ringed tile still works — the item opens through the mark',
    /Equip/.test(popped), popped.slice(0, 200));

  /* ── 2b. AND THE MARK GETS OUT OF THE WAY OF WHAT IT ASKED FOR ──
     Since v2.3.1796 this overlay lives OUTSIDE .brotown-wrap (the only place
     it is visible over the dashboard at all — see BroTown.jsx), which also
     puts it above the in-wrap popups.  It must therefore stand down while
     one is open, and it does it by hit-testing the control rather than by
     knowing the popup's class: with the popup's scrim over the tile, the
     tile is not reachable, so there is nothing to point at. */
  const duringPopup = await coach(P);
  rec.ok('with the item popup open, the mark stands down', !duringPopup, duringPopup);
  /* Dismiss it the way a player does — a tap on the scrim outside the card
     (ItemDetailPopup closes on the scrim's own pointerdown). */
  await P.page.evaluate(() => {
    const scrim = Array.from(document.querySelectorAll('div'))
      .find((d) => getComputedStyle(d).zIndex === '50' && d.getBoundingClientRect().height > 700);
    if (scrim) scrim.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: 195, clientY: 40, bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch',
    }));
  });
  await P.page.waitForTimeout(700);
  /* GUARD.  If the popup were still up its scrim would cover every control,
     no lesson would be reachable, and the four assertions after this would
     all read "no mark" — which is how the first cut of this file silently
     tested nothing. */
  const scrimGone = await P.page.evaluate(() => !Array.from(document.querySelectorAll('div'))
    .some((d) => getComputedStyle(d).zIndex === '50' && d.getBoundingClientRect().height > 700));
  rec.ok('the item popup is closed again (guard)', scrimGone, { scrimGone });

  /* ── 3. doing it retires it ──
     Driven through STATE rather than through the popup, because what is under
     test is the coach's completion rule, not ItemDetailPopup's buttons (which
     mp-questui and the layer suites already cover). */
  await P.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    R.weapon = R.weaponStash.pop();
    R.shield = R.shieldStash.pop();
  });
  await P.page.waitForTimeout(700);
  const afterEquip = await coach(P);
  rec.ok('once the sword and shield are on, the gear lesson stops',
    !afterEquip || afterEquip.id !== 'equip', afterEquip);

  /* ── 4. the special attack ──
     Owner: "I think mayor bro ought to require you to perform your special
     attack too during the tutorial."
     It comes straight after the gear lesson because the swipe needs nothing
     but a weapon in hand — which is exactly what the player has just put
     there — and because that is the order Mayor Bro says them in. */
  const cS = await waitCoach(P, 'special');
  rec.ok('with a weapon in hand, the special-attack lesson appears',
    !!(cS && cS.id === 'special'), cS);
  /* THE WORDING IS THE ASSERTION.  v2.3.1681 corrected the quest dialogue
     from "flick it and let go" to "a quick swipe" after the owner reported it
     as wrong — the handler measures release SPEED. This line has to say the
     same thing in the same words, or the game teaches one gesture in the
     dialogue and a different one on the joystick. */
  /* v2.3.1831: the dialogue no longer says it — the coach is now the ONLY
     place this wording lives, which is why this assertion matters more. */
  rec.ok("...calling it a quick SWIPE, the wording v2.3.1681 settled on",
    !!(cS && /quick swipe/i.test(cS.text)), cS && cS.text);
  rec.ok('...and NOT the "flick and let go" wording v2.3.1681 removed',
    !!(cS && !/flick/i.test(cS.text)), cS && cS.text);
  await P.page.screenshot({ path: 'tools/qa/mp/out/coach-2-special.png' });
  const rJoyS = await rectOf(P, '.bt-rjoy-base');
  rec.ok('the right joystick is on screen to point at (guard)', !!rJoyS, rJoyS);
  if (rJoyS && cS && cS.ring) {
    const dx = Math.abs((cS.ring.left + cS.ring.width / 2) - (rJoyS.left + rJoyS.width / 2));
    const dy = Math.abs((cS.ring.top + cS.ring.height / 2) - (rJoyS.top + rJoyS.height / 2));
    rec.ok('the mark rings the RIGHT joystick', dx < 6 && dy < 6, { ring: cS.ring, rJoyS, dx, dy });
  }

  /* FIRE A REAL ONE.  Not by setting the flag — through the desktop special
     key, which runs the same specialAttack() the swipe does, gates and all
     (dead / mid-harvest / cooldown / no weapon / no mana).  So this asserts
     two things at once: that the coach credits the gesture, and that it
     credits it however the player got there. */
  await P.page.keyboard.press('f');
  await P.page.waitForTimeout(900);
  const firedTrk = await P.page.evaluate(() => ({
    hasUsedSwipe: !!window._gameState.current._hasUsedSwipe,
    coach: window.__btCoach && window.__btCoach(),
  }));
  /* GUARD: if the special was REFUSED (no mana, empty active slot) the flag
     never sets, the lesson correctly stays up, and the assertion below would
     be testing nothing.  Say which it was. */
  rec.ok('the special actually fired (guard — a refused swipe sets no flag)',
    firedTrk.hasUsedSwipe, firedTrk);
  const afterSpecial = await coach(P);
  rec.ok('performing the special retires its lesson',
    !afterSpecial || afterSpecial.id !== 'special', { afterSpecial, firedTrk });

  /* ── 5. the block lesson: the owner's whole gesture, not half of it ── */
  const c4 = await waitCoach(P, 'block');
  rec.ok('with a shield on, the block lesson appears', !!(c4 && c4.id === 'block'), c4);
  rec.ok('...and it teaches the HOLD and the turn, not just a tap',
    !!(c4 && /hold/i.test(c4.text) && /(turn|around|circle)/i.test(c4.text)), c4 && c4.text);
  await P.page.screenshot({ path: 'tools/qa/mp/out/coach-3-block.png' });
  const rJoy = await rectOf(P, '.bt-rjoy-base');
  rec.ok('the right joystick is on screen to point at (guard)', !!rJoy, rJoy);
  if (rJoy && c4 && c4.ring) {
    const dx = Math.abs((c4.ring.left + c4.ring.width / 2) - (rJoy.left + rJoy.width / 2));
    const dy = Math.abs((c4.ring.top + c4.ring.height / 2) - (rJoy.top + rJoy.height / 2));
    rec.ok('the mark rings the RIGHT joystick', dx < 6 && dy < 6, { ring: c4.ring, rJoy, dx, dy });
  }
  /* "maybe text above the right joystick" — literally above it. */
  if (rJoy && c4 && c4.card) {
    rec.ok('the text sits ABOVE the right joystick, as asked',
      c4.card.top + c4.card.height <= rJoy.top + 2, { card: c4.card, rJoy });
  }

  /* HOLDING ALONE IS NOT ENOUGH.  Raise the shield, hold it well past the
     time requirement, but keep it pointed one way: the lesson must NOT
     complete, because the half of the gesture that is worth teaching (drag
     during the hold to aim) has not been used. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._shieldUp = true; S._shieldAngle = 0;
  });
  await P.page.waitForTimeout(3200);
  const held = await coach(P);
  const heldTrk = await P.page.evaluate(() => window.__btCoach && window.__btCoach());
  rec.ok('holding without turning does NOT finish the lesson',
    !!(held && held.id === 'block'), { held, heldTrk });
  /* Both halves, separately — the owner asked for a hold AND a turn, and a
     single "is it done" flag cannot tell you which half is missing. */
  rec.ok('...the hold is counted (well past the requirement)',
    !!(heldTrk && heldTrk.heldMs >= heldTrk.needMs), heldTrk);
  rec.ok('...and the turn is not, because there was none',
    !!(heldTrk && heldTrk.sectors < heldTrk.needSectors), heldTrk);
  /* And the bar says so.  A bar reading 100% next to a lesson that refuses
     to finish is worse than no bar: the first cut clamped only the SUM, so
     a long hold in one direction filled it. */
  rec.ok('...and the progress bar does NOT read finished',
    !!(held && held.progress && parseFloat(held.progress) > 0 && parseFloat(held.progress) < 100),
    held && held.progress);

  /* Now sweep the full circle while held — the owner's "rotate in a 360
     degree circle" — and it completes. */
  /* Swept from OUT HERE, one direction per step with a real pause between
     them, rather than in a tight in-page rAF loop.  The in-page version
     recorded two sectors out of eight: both loops are driven by the same
     frame clock, so the writer and the reader interleaved and the coach only
     ever sampled a couple of the angles.  A player's thumb moves in real
     time; so does this. */
  for (let i = 0; i < 8; i++) {
    await P.page.evaluate((a) => {
      const S = window._gameState.current;
      /* Re-stamped every step: the shield is dropped by a dozen paths in
         BroTown (death, zone change, sheet interlocks) and a sweep that
         quietly lost it half way would look like a coach bug. */
      S._shieldUp = true;
      S._shieldAngle = a;
    }, -Math.PI + (i / 8) * Math.PI * 2);
    await P.page.waitForTimeout(120);
  }
  await P.page.waitForTimeout(900);
  const sweptTrk = await P.page.evaluate(() => window.__btCoach && window.__btCoach());
  rec.ok('the sweep is seen as a full circle', !!(sweptTrk && sweptTrk.sectors === sweptTrk.needSectors), sweptTrk);
  const afterBlock = await coach(P);
  rec.ok('holding the shield through a full turn finishes the lesson',
    !afterBlock || afterBlock.id !== 'block', { afterBlock, sweptTrk });
  await P.page.evaluate(() => { window._gameState.current._shieldUp = false; });

  /* ── 5b. the turn-in pays two more weapons, and that is two more lessons ──
     Owner: "When player turns in quest and receives bow and staff there should
     be a tutorial requiring you equip them all and double tap the left joystick
     to swap through the weapons and just a little message to use what you like
     best."
     LAST of the five, and that is chronology rather than preference: tut_1's
     TURN-IN is what hands you the bow and the staff, so until then there is
     nothing to equip and nothing to cycle between.  The other three are all
     usable the moment the quest is accepted. */
  await P.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    R._quests = Object.assign({}, R._quests, { tut_1: 'turnedIn' });
    R.weaponStash = [{ type: 'bow', name: 'Pine Bow', dmg: 4 },
                     { type: 'staff', name: 'Pine Staff', dmg: 4 }];
    R.rangedWeapon = null; R.staffWeapon = null;
    R.activeSlot = 'melee';
  });
  const cE = await waitCoach(P, 'equipAll');
  rec.ok('after the turn-in, the equip-them-all lesson appears',
    !!(cE && cE.id === 'equipAll'), cE);
  rec.ok('...and it names the bow and the staff',
    !!(cE && /bow/i.test(cE.text) && /staff/i.test(cE.text)), cE && cE.text);
  await P.page.screenshot({ path: 'tools/qa/mp/out/coach-4-equipall.png' });

  /* IT IS NOT FINISHED BY EQUIPPING ONE OF THEM.  "equip them all" is the
     ask, so a player who puts the bow on and stops is still mid-lesson. */
  /* EQUIP THE WAY THE GAME EQUIPS.  ItemDetailPopup's onEquipStashWeapon sets
     R.activeSlot to the slot it just filled, so the bro swings what you put
     on.  The first cut of this test set only the weapon field and therefore
     never reproduced the bug the owner hit: equipping all three marks all
     three slots active, which satisfied the cycle lesson's finish rule before
     its mark had ever been on screen. */
  await P.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    R.rangedWeapon = R.weaponStash.shift();
    R.activeSlot = 'ranged';
  });
  await P.page.waitForTimeout(700);
  const halfWay = await coach(P);
  rec.ok('equipping only the bow does NOT finish it — the staff is still in the bag',
    !!(halfWay && halfWay.id === 'equipAll'), halfWay);

  await P.page.evaluate(() => {
    const R = window._gameState.current.rpg;
    R.staffWeapon = R.weaponStash.shift();
    R.activeSlot = 'staff';
  });
  await P.page.waitForTimeout(700);
  const cC = await waitCoach(P, 'cycle');
  rec.ok('with all three on, the lesson moves to cycling between them',
    !!(cC && cC.id === 'cycle'), cC);
  rec.ok('...it names the gesture the left joystick actually uses',
    !!(cC && /double-tap/i.test(cC.text)), cC && cC.text);
  /* "just a little message to use what you like best" — literally that. */
  rec.ok('...and it says to use whichever you like best',
    !!(cC && /like best/i.test(cC.text)), cC && cC.text);
  await P.page.screenshot({ path: 'tools/qa/mp/out/coach-5-cycle.png' });
  const lJoy = await rectOf(P, '.bt-joystick-zone');
  rec.ok('the left joystick is on screen at this viewport (guard)', !!lJoy, lJoy);
  if (lJoy && cC && cC.ring) {
    const dx = Math.abs((cC.ring.left + cC.ring.width / 2) - (lJoy.left + lJoy.width / 2));
    const dy = Math.abs((cC.ring.top + cC.ring.height / 2) - (lJoy.top + lJoy.height / 2));
    rec.ok('the mark rings the LEFT joystick', dx < 6 && dy < 6, { ring: cC.ring, lJoy, dx, dy });
  }

  /* ...AND IT IS NOT ALREADY FINISHED.  This is the assertion that was
     missing: equipping the three weapons had already touched melee, ranged
     and staff, so the lesson completed itself before it could appear.  The
     owner saw exactly that — "it needs to guide you to double tap the left
     joystick" — because the mark was gone before they could act on it. */
  const armed = await P.page.evaluate(() => window.__btCoach && window.__btCoach());
  rec.ok('the cycle counter starts when the mark goes up, not when you equip',
    !!(armed && armed.cycleArmed && !armed.done.cycle), armed);
  rec.ok('...and it only counts the slot the player is standing on',
    !!(armed && Object.keys(armed.slots).length === 1), armed && armed.slots);

  /* ONE SWAP IS NOT A CYCLE.  This is the difference between v2.3.1796's
     lesson and the owner's ask: going melee -> ranged proves the gesture
     exists, but they asked the player to go round all three and pick. */
  /* The player arrives on STAFF, because that is what they equipped last, so
     melee is the slot still missing.  Ordering the test this way rather than
     melee-first is not cosmetic: it is the state the previous lesson really
     leaves behind, and assuming melee is where you start is how the counting
     bug got written in the first place. */
  await P.page.evaluate(() => { window._gameState.current.rpg.activeSlot = 'ranged'; });
  await P.page.waitForTimeout(700);
  const oneSwap = await coach(P);
  const trk1 = await P.page.evaluate(() => window.__btCoach && window.__btCoach());
  rec.ok('a single swap does NOT finish it — melee has not been held yet',
    !!(oneSwap && oneSwap.id === 'cycle'), { oneSwap, slots: trk1 && trk1.slots });

  await P.page.evaluate(() => { window._gameState.current.rpg.activeSlot = 'melee'; });
  await P.page.waitForTimeout(700);
  const trk2 = await P.page.evaluate(() => window.__btCoach && window.__btCoach());
  rec.ok('...every slot has now been active (guard)',
    !!(trk2 && trk2.slots && trk2.slots.melee && trk2.slots.ranged && trk2.slots.staff), trk2);
  const afterCycle = await coach(P);
  /* Credit is for the CYCLE HAPPENING, not for the gesture being performed the
     one way the hint describes — a player who swaps with the desktop key or
     the quick bar has learned the same fact and should not keep being told. */
  rec.ok('going round all three retires the lesson',
    !afterCycle || afterCycle.id !== 'cycle', afterCycle);

  /* ── 6. it is over when the lessons are learned ── */
  await P.page.waitForTimeout(800);
  const end = await coach(P);
  rec.ok('with every lesson learned, the coach is silent', !end, end);

  /* ── 7. and it stays learned across a reload ──
     A tutorial that re-teaches itself every session is a nag.  The record is
     in localStorage, so this reloads the page and requires the marks to stay
     down even though the state that made them relevant is still true. */
  const remembered = await P.page.evaluate(() => localStorage.getItem('bt_coach_v1'));
  /* ALL FOUR by name.  Checking only one of them let the file stay green
     through the v2.3.1797 reorder even if a lesson had silently stopped
     completing — the coach going quiet proves nothing on its own, because a
     lesson that never becomes LIVE is also quiet. */
  rec.ok('every lesson is written down by name',
    !!remembered && ['equip', 'special', 'block', 'equipAll', 'cycle']
      .every((k) => new RegExp('"' + k + '":true').test(remembered)),
    remembered);

  await P.page.screenshot({ path: 'tools/qa/mp/out/questcoach.png' }).catch(() => {});
  await P.ctx.close().catch(() => {});
}
