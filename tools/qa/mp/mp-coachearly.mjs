/* THE FIRST MINUTE TEACHES ITSELF (v2.3.2130)
 *
 * Demo feedback, three reviewers of four, in their own words: dropped into
 * town with no idea what to do.  The repo's answer to that looked, on paper,
 * like it already existed -- and none of it reached them:
 *
 *   - the §15 teach-by-doing step machine has been switched OFF since
 *     v2.3.1593, on the owner's own instruction ("remove the tutorial and the
 *     mayor bro pop up and greeting").  Still written, never runs.
 *   - ControlsTutorial teaches Move and Attack properly, and opens from
 *     exactly one place: a row in Settings reading "Controls -- replay the
 *     tutorial".  A first-time player has not replayed anything.
 *   - QuestCoach teaches beautifully and starts too late.  Its gate is
 *     inTutorial(), which wants a tut quest already 'active', and its first
 *     lesson waits for gear to land in the bag.  A player who has just
 *     spawned has neither.
 *
 * So the gap was the walk from the spawn point to Mayor Bro -- the first
 * minute, with nothing on screen at all.  v2.3.2130 widens the coach's gate
 * to cover it and adds the two controls nothing else taught: drag to move,
 * drag to attack.
 *
 * WHAT THIS FILE REFUSES TO LET PASS:
 *  1. The mark is up before any quest exists -- the actual regression.
 *  2. It rings the REAL left joystick, measured off the live DOM, not a
 *     remembered coordinate (the failure ControlsTutorial was rebuilt to
 *     escape in v2.3.1205).
 *  3. It does not eat the touch it is asking for.
 *  4. A REAL joystick drag retires it.  Driven through window.__touch on
 *     [data-joyzone="L"] -- the same path a player's thumb takes, and the
 *     only honest way to prove a lesson can be satisfied.
 *  5. Once it is done, the coach falls silent again until the questline
 *     starts.  Without this the feature could "pass" as an overlay that is
 *     simply always on -- which is the guard mp-questcoach's section 0 used
 *     to provide, and which this file now owns.
 *  6. The ATTACK mark stays down while the bag is empty.  swingAttack()
 *     returns at `if (!S.rpg.weapon)` (v2.3.1682), so a mark there would be
 *     asking for a gesture the game refuses -- worse than no mark, by
 *     QuestCoach's own rule.
 */
import * as H from './harness.mjs';

const coach = (P) => P.page.evaluate(() => {
  const el = document.querySelector('[data-coach]');
  if (!el) return null;
  const ring = el.querySelector('[data-coach-ring]');
  const card = el.querySelector('[data-coach-card]');
  const rr = ring && ring.getBoundingClientRect();
  return {
    id: el.getAttribute('data-coach'),
    text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
    layerPE: getComputedStyle(el).pointerEvents,
    ringPE: ring ? getComputedStyle(ring).pointerEvents : null,
    cardPE: card ? getComputedStyle(card).pointerEvents : null,
    ring: rr ? { left: rr.left, top: rr.top, width: rr.width, height: rr.height } : null,
  };
});

const probe = (P) => P.page.evaluate(() => (window.__btCoach ? window.__btCoach() : null));

const rectOf = (P, sel) => P.page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}, sel);

async function waitCoach(P, want, ms = 9000) {
  const t0 = Date.now();
  for (;;) {
    const c = await coach(P);
    if (want === null ? !c : (c && c.id === want)) return c;
    if (Date.now() - t0 > ms) return c;
    await P.page.waitForTimeout(200);
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* A touch viewport, non-negotiable: the joystick is display:none under
     (pointer:fine), a lesson whose anchor cannot be measured is SKIPPED by
     design, and so a desktop box would assert nothing here and pass. */
  const P = await H.newPlayer(browser, {
    name: 'Rookie', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2600);
  await H.pastWelcome(P);   /* v2.3.2880: the first card waits out the WELCOME plate now */

  /* ── 0. this really is a brand-new bro ──
     The guard that gives every assertion below its meaning.  If the harness
     ever starts seeding a quest or a level, the "before the questline" claim
     silently stops being about a new player. */
  const who = await H.readState(P, (S) => ({
    level: (S.rpg && S.rpg.level) || 1,
    quests: (S.rpg && S.rpg._quests) || null,
    weapon: !!(S.rpg && S.rpg.weapon),
    stash: ((S.rpg && S.rpg.weaponStash) || []).length,
  }));
  const untouched = !who.quests || !['tut_1', 'tut_2', 'tut_3', 'tut_4'].some((k) => who.quests[k]);
  rec.ok('the player has taken no quest and owns no weapon (guard)',
    untouched && who.level <= 3 && !who.weapon, who);

  const g0 = await probe(P);
  rec.ok('the coach is open on the PRE-questline gate, which is the new one',
    !!g0 && g0.gate === 'pre', g0);

  /* ── 1. THE REGRESSION: something is being taught in the first minute ── */
  /* ═══ v2.3.2580: THE FIRST MARK IS THE DASHBOARD, NOT THE STICK ═══
   *
   * These rows asserted that `move` is the first lesson a new character meets,
   * and they have been RED since 2026-09-14.  The game is right and the test
   * was stale; re-pointed rather than relaxed, and the reason is recorded here
   * because a test updated without one is indistinguishable from a test bent
   * to go green.
   *
   * WHAT v2.3.2495 INTENDED.  Owner: "on the first join after making a
   * character the dashboard should start FOLDED, with an attention ring on the
   * fold chip, and the tutorial then resumes."  QuestCoach's own note on the
   * `openDash` lesson spells out the mechanism: "FIRST IN THE ARRAY because the
   * marks show one at a time in order, so position is what makes the rest of
   * the tutorial wait: `move` and everything behind it resume the moment this
   * one is answered."
   *
   * WHAT THE GAME DOES NOW.  Exactly that.  `openDash` and `move` share one
   * predicate (preTutorial), the picker walks LESSONS in order and stops at the
   * first that measures, and `openDash` is LESSONS[0].  So a new character is
   * shown the fold chip first and the stick second.
   *
   * WHICH COMMIT CHANGED IT, and it was not this lane: 6b755e3b (v2.3.2495,
   * 2026-09-14) added `openDash` ahead of `move` and did NOT touch this file.
   * This scenario was last edited 67d1f6ab (v2.3.2130, 2026-08-29), sixteen
   * days earlier -- an ancestor of the reorder, so it was never re-pointed.
   *
   * WHY THE NEW ORDER IS ACCEPTABLE.  It is the owner's own requested design,
   * `move` is deferred rather than lost (it resumes the instant the band is
   * opened, which the rows below now prove rather than assume), and the
   * openDash selector carries the folded state so the mark cannot outlive the
   * tap that answers it.
   *
   * THE CLAIMS GET STRONGER, NOT WEAKER.  The old file asserted one thing about
   * the first minute; this asserts the whole sequence -- the dashboard mark
   * arrives, rings the real chip, is answerable by a real finger, and HANDS OVER
   * to the stick lesson, which then keeps every assertion it always had. */
  const c0 = await waitCoach(P, 'openDash');
  rec.ok('the first mark a new character meets is the DASHBOARD fold (v2.3.2495 order)',
    !!c0 && c0.id === 'openDash', c0);
  rec.ok('...and it says what to do with it', !!c0 && /tap open/i.test(c0.text), c0 && c0.text);
  const chip = await rectOf(P, '[data-dash-fold="min"]');
  if (c0 && c0.ring && chip) {
    const dx = Math.abs((c0.ring.left + c0.ring.width / 2) - (chip.left + chip.width / 2));
    const dy = Math.abs((c0.ring.top + c0.ring.height / 2) - (chip.top + chip.height / 2));
    rec.ok('...ringing the actual fold chip, measured off the live DOM',
      dx < 14 && dy < 14, { dx: Math.round(dx), dy: Math.round(dy), ring: c0.ring, chip });
  } else {
    rec.skip('the dashboard mark rings the fold chip', 'no ring or no chip to measure');
  }
  /* ANSWER IT WITH A REAL FINGER.  page.touchscreen.tap goes through the
     browser's own hit testing; a dispatched event would prove the handler and
     say nothing about whether the chip is reachable under the coach's own
     overlay (TRAPS 67) -- which is the whole question on a control the coach is
     pointing at. */
  if (chip) {
    await P.page.touchscreen.tap(Math.round(chip.left + chip.width / 2),
      Math.round(chip.top + chip.height / 2));
    await P.page.waitForTimeout(900);
  }
  const opened = await P.page.evaluate(() => {
    const bus = window.__broDashPanelBus;
    return { mode: (bus && bus.state && bus.state.mode) || null,
      dest: (bus && bus.state && bus.state.dest) || null,
      stillFolded: !!document.querySelector('[data-dash-fold="min"]') };
  });
  console.log(`    dashboard after the tap: ${JSON.stringify(opened)}`);
  rec.ok('a real tap on the ringed chip opens the band -- the lesson is answerable',
    opened.stillFolded === false, opened);

  /* ── 1b. ...AND THE STICK LESSON RESUMES, which is the half the old order
        asserted and the new order defers rather than drops. ── */
  const c1 = await waitCoach(P, 'move');
  rec.ok('...and answering it hands over to the stick lesson (move resumes, it is not lost)',
    !!c1 && c1.id === 'move', c1);
  rec.ok('...and it says what to do with the stick',
    !!c1 && /drag/i.test(c1.text), c1 && c1.text);

  /* ── 2. it points at the REAL control ── */
  const joy = await rectOf(P, '.bt-joystick-zone');
  if (c1 && c1.ring && joy) {
    const dx = Math.abs((c1.ring.left + c1.ring.width / 2) - (joy.left + joy.width / 2));
    const dy = Math.abs((c1.ring.top + c1.ring.height / 2) - (joy.top + joy.height / 2));
    rec.ok('...ringing the actual left joystick, measured off the live DOM',
      dx < 14 && dy < 14, { dx: Math.round(dx), dy: Math.round(dy), ring: c1.ring, joy });
  } else {
    rec.skip('the mark rings the actual left joystick', 'no ring or no joystick to measure');
  }

  /* ── 3. it must not eat the touch it is asking for ──
     ═══ v2.3.2580: THE CARD IS SUPPOSED TO TAKE TAPS NOW ═══
     This asserted `cardPE !== 'auto'` and has been red since 2026-09-06.  Same
     story as the ordering rows above, same rule applied, reason recorded.

     WHAT CHANGED AND WHEN: 82019824 (v2.3.2312) made the card
     pointerEvents:'auto' on the owner's request -- "the save your login key pop
     up needs to be layered in front so I can tap it to dismiss.  Right now it
     just swings the weapon attack by activating the right joystick."  Before
     that the card was inert and a finger aimed at it went THROUGH to the touch
     zone underneath and started a swing, which is worse than a card that
     ignores you: one that does something else instead.  That commit did not
     touch this file, so the row was never re-pointed.  NOT this lane: it
     predates it by nine days, and v2.3.2564 changed no pointerEvents in
     QuestCoach at all (its only match is a comment quoting this very version).

     WHY THE NEW BEHAVIOUR IS ACCEPTABLE, and what the row asks instead.  "Does
     not swallow the gesture it wants" was always a claim about the CONTROL the
     lesson is pointing at, not about the card being inert -- a dismissable card
     is a feature.  So the claim is now the honest form of the original: the
     overlay is still inert, the ring is still inert, and the card does not lie
     on the control being taught.  The outcome is proved independently a few
     lines below, where a real drag on that control walks the bro. */
  const joyZone = await rectOf(P, '[data-joyzone="L"]');
  const cardBox = await P.page.evaluate(() => {
    const el = document.querySelector('[data-coach-card]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  });
  rec.ok('the coach layer and its ring stay inert, so neither can eat a gesture',
    !!c1 && c1.layerPE === 'none' && c1.ringPE !== 'auto', c1);
  if (cardBox && joy) {
    /* The joystick DISC is the thing the lesson rings and the thumb aims at.
       The zone is the whole left half and the card legitimately floats over
       part of it -- that is what v2.3.2312 bought, and the drag below proves
       the zone still answers. */
    const clear = cardBox.right <= joy.left || cardBox.left >= joy.left + joy.width
      || cardBox.bottom <= joy.top || cardBox.top >= joy.top + joy.height;
    rec.ok('...and the tappable card does not lie on the joystick it is teaching',
      clear, { card: cardBox, joy, joyZone });
  } else {
    rec.skip('the card clears the control it teaches', 'no card or no joystick to measure');
  }

  /* ── 4. A REAL DRAG RETIRES IT ──
     Through the joystick zone, the way a thumb does it.  Faking the position
     would prove the tracker counts numbers; this proves a player can finish
     the lesson. */
  await P.page.evaluate(() => {
    window.__touch = (el, type, x, y, id) => {
      const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
      const end = type === 'touchend' || type === 'touchcancel';
      el.dispatchEvent(new TouchEvent(type, {
        bubbles: true, cancelable: true,
        touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t],
      }));
    };
  });
  const before = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  await P.page.evaluate(() => {
    const z = document.querySelector('[data-joyzone="L"]');
    const r = z.getBoundingClientRect();
    const x = r.x + r.width / 2, y = r.y + r.height * 0.7;
    window.__touch(z, 'touchstart', x, y, 11);
    window.__touch(z, 'touchmove', x + 55, y, 11);
  });
  await P.page.waitForTimeout(2600);
  const after = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  const walked = Math.hypot(after.x - before.x, after.y - before.y);
  await P.page.evaluate(() => {
    const z = document.querySelector('[data-joyzone="L"]');
    const r = z.getBoundingClientRect();
    window.__touch(z, 'touchend', r.x + r.width / 2 + 55, r.y + r.height * 0.7, 11);
  });
  rec.ok('holding the stick really walks the bro (guard)', walked > 60,
    { walked: Math.round(walked), before, after });

  const pAfter = await probe(P);
  rec.ok('...and the walk was counted against the lesson',
    !!pAfter && pAfter.walkedPx >= pAfter.needPx, pAfter);
  const gone = await waitCoach(P, null, 6000);
  rec.ok('...so the mark retires once you have walked', !gone, gone);

  /* ── 5. AND STAYS DOWN.  The always-on-overlay guard. ── */
  await P.page.waitForTimeout(1800);
  const still = await coach(P);
  rec.ok('nothing else is taught before the questline starts', !still, still);

  /* ── 6. THE ATTACK MARK WAITS FOR A WEAPON ──
     Not a style point: swingAttack() refuses on an empty melee slot, so a
     mark here would be asking for something the game will not do. */
  const st = await H.readState(P, (S) => ({
    weapon: !!(S.rpg && S.rpg.weapon),
    ranged: !!(S.rpg && S.rpg.rangedWeapon),
    staff: !!(S.rpg && S.rpg.staffWeapon),
  }));
  const pEnd = await probe(P);
  rec.ok('the attack lesson stays down while every weapon slot is empty',
    !st.weapon && !st.ranged && !st.staff && !(pEnd && pEnd.done && pEnd.done.attack),
    { st, done: pEnd && pEnd.done });

  await P.ctx.close().catch(() => {});
}
