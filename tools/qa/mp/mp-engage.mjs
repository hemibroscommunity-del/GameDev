/* ENGAGED: TARGET-RELATIVE MOVEMENT + THE ATTACK INDICATOR (v2.3.2246).
 *
 * Owner, on the control redesign after playing it:
 *   "There is an attack indicator that will appear for nearby monsters (while
 *    in a monster's detectable perimeter). Once you tap 'attack' ... the
 *    auto-targeting engages. Every move you make is now relative to that
 *    target (just like the old targeting behavior when you tap on a monster
 *    to lock on target)."
 *   "Player movement (backwards, left, right) should revolve around the
 *    targeted monster so if you move backwards you should be doing a
 *    backwards jog (just like behavior of former controls moving down but
 *    angling up directionally with the right joystick)."
 *
 * mp-rbutton owns the BUTTON (the two-step press, the shield exclusion, the
 * hidden discs).  This scenario owns the two things that happen once you are
 * engaged and are invisible to it:
 *
 *   1. MOVEMENT IS RELATIVE TO THE LOCK, with no finger on the attack button.
 *      That is the whole change: before v2.3.2246 the backpedal flag and the
 *      aim-relative facing were computed only `if (S.autoAttack)` -- i.e.
 *      only while the button was physically held -- which was faithful to
 *      the OLD right stick (deflecting it set autoAttack in the same
 *      handler) and wrong for a lock that outlives the finger.
 *      Read off S._backpedaling (the flag that reverses the jog cycle) and
 *      S._facingSrc, which entityRenderer publishes to name WHICH branch of
 *      its facing ladder won -- 'aim' means the body is held on the target,
 *      'stick' means it turned to follow the thumb.  v2.3.1807 added that
 *      string for exactly this class of question.
 *
 *   2. THE INDICATOR IS ACTUALLY PAINTED.  "The ability shipped working and
 *      invisible" is this repo's signature failure, so the caret is counted
 *      counted -- but not by CLASSIFYING them, because this scenario runs in
 *      town and town cobble is very nearly the same warm yellow the mark is
 *      drawn in (TRAPS §21: a brass filter scored 4627 "brass" pixels in a
 *      1496-px control crop of bare cobble).  Instead two frames of one tight
 *      crop are DIFFERENCED, and they differ in exactly one thing: whether
 *      this monster is a candidate (caret) or the lock (no caret -- it gets
 *      the red reticle at its feet instead).  Plus a probe, __btAtkMark, for
 *      the half a crop cannot answer: which monsters were marked, and where.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* A still, harmless monster due EAST of the player.  spd 0 and dmg 0 for the
   same reason mp-rbutton's fixture has them: a monster that walks or hits
   moves the geometry every assertion depends on. */
const seedFodder = (P, id, dx, dy) => P.page.evaluate(([id, dx, dy]) => {
  const S = window._gameState.current;
  S._serverMonsters = false;
  S.monsters = [{
    id, arch: 'fodder', archetype: 'fodder', type: 'fodder',
    x: S.player.x + dx, y: S.player.y + dy, renderX: S.player.x + dx, renderY: S.player.y + dy,
    spawnX: S.player.x + dx, spawnY: S.player.y + dy, targetX: S.player.x + dx, targetY: S.player.y + dy,
    hp: 5000, curHp: 5000, maxHp: 5000, dmg: 0, level: 1, gold: 0,
    spd: 0, vx: 0, vy: 0,
    alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
    respawnAt: 0, moveTimer: 0, _stuckArrows: [],
  }];
  S.lockedTarget = null;
}, [id, dx, dy]);

const st = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  return {
    lock: S.lockedTarget ? S.lockedTarget.id : null,
    back: !!S._backpedaling,
    src: S._facingSrc || null,
    facing: S._renderFacing || null,
    aim: S._aimAngle,
    auto: !!S.autoAttack,
    cands: (S._targetCands || []).length,
    vx: S.player.vx, vy: S.player.vy,
  };
});

/* Drive the LEFT movement zone by hand: the stick is a relative drag from
   the touch origin, so a push is start-here then move-there. */
const push = (P, dx, dy) => P.page.evaluate(([dx, dy]) => {
  const z = document.querySelector('[data-joyzone="L"]');
  const r = z.getBoundingClientRect();
  const ox = r.x + r.width / 2, oy = r.y + r.height * 0.55;
  const mk = (type, x, y) => {
    const t = new Touch({ identifier: 77, target: z, clientX: x, clientY: y });
    const end = type === 'touchend';
    z.dispatchEvent(new TouchEvent(type, {
      bubbles: true, cancelable: true,
      touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t],
    }));
  };
  mk('touchstart', ox, oy);
  mk('touchmove', ox + dx, oy + dy);
  window.__pushEnd = () => mk('touchend', ox + dx, oy + dy);
}, [dx, dy]);
const release = (P) => P.page.evaluate(() => { if (window.__pushEnd) window.__pushEnd(); });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Engager', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* A weapon, and the coach retired: QuestCoach's marks hold the discs on
     screen while onboarding runs (see mp-rbutton) and its `move` lesson
     tracks the same walking this scenario does. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg) {
      if (!S.rpg.weapon) S.rpg.weapon = { type: 'sword', name: 'QA Sword', tierMult: 1 };
      S.rpg._quests = S.rpg._quests || {}; S.rpg._quests.tut_4 = 'turnedIn';
    }
  });
  await P.page.waitForTimeout(400);

  /* ── 1. the indicator appears for a nearby monster ──
     The extra settle is for the town welcome bubble: it is a timed DOM
     overlay that sits right where the mark goes, and a crop full of chat
     panel is a crop that proves nothing either way. */
  await P.page.waitForTimeout(6000);
  await seedFodder(P, 'qa_eng_1', 120, 0);
  await P.page.waitForTimeout(500);
  const near = await st(P);
  /* v2.3.2251: standing in the perimeter now TARGETS it as well as making it a
     candidate -- acquisition is automatic (owner: "always be nearest enemy"),
     so `lock === null` was the old two-step premise and is false by design. */
  rec.ok('standing inside a monster’s targeting perimeter targets it, with no press',
    near.cands === 1 && near.lock === 'qa_eng_1', near);

  /* ── the indicator, twice over ──
     THE PIXEL TEST NEEDED A DIFFERENT ARGUMENT IN TOWN.  The first cut
     counted brass (#D8A85F) in the crop, and TRAPS §21 is about precisely
     that mistake: town cobble is a warm sandy yellow that sails through any
     brass classifier -- the control frame scored 4627 "brass" pixels in a
     1496-pixel box (a 2x device ratio, all of it cobble) and the signal was
     invisible inside it.  So neither frame is classified at all.  What is
     measured is the DIFFERENCE between two frames of the same crop that
     differ in exactly one thing: whether this monster is a candidate (caret)
     or the lock (no caret -- the locked one gets the red reticle at its feet
     instead and is skipped by the caret loop).  Classifier-free, and the
     control is built into the method.

     And the probe answers what a crop cannot: WHICH monsters were marked and
     at what coordinate.  A caret drawn 200px off screen and no caret at all
     look identical in a crop, which is the failure §28 is about. */
  const marks = await P.page.evaluate(() => (window.__btAtkMark ? window.__btAtkMark() : null));
  /* v2.3.2251: one candidate, and it is now automatically the TARGET -- so it
     is recorded as `target: true` (ground ring + reticle) rather than caret-ed.
     The caret's job changed with acquisition: it says "tap this one instead",
     so it belongs to the candidates that are NOT the target. */
  rec.ok('the renderer marks the candidate (probe: one mark, on this monster, as the target)',
    !!marks && marks.length === 1 && marks[0].id === 'qa_eng_1' && marks[0].target === true, marks);
  const geo = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = S.monsters[0];
    const mk = (window.__btAtkMark() || [])[0] || null;
    return { my: m.y, mx: m.x, mark: mk };
  });
  /* v2.3.2251: a TARGET mark is recorded at the monster's feet (its ground ring
     is drawn there); only a caret sits 56px above the head.  Asserted on the
     axis that still means something for both: the mark is on the monster. */
  rec.ok('...at the monster’s own position, not adrift somewhere else on the map',
    !!geo.mark && Math.abs(geo.mark.x - geo.mx) < 1 && Math.abs(geo.mark.y - geo.my) < 60, geo);

  /* The crop: tight on the caret so nothing else in frame can differ. */
  const caretBox = async () => P.page.evaluate(() => {
    const S = window._gameState.current;
    const mk = (window.__btAtkMark() || [])[0];
    if (!mk) return null;
    const r = document.querySelector('canvas').getBoundingClientRect();
    const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
    const sx = r.left + (mk.x - S.camera.x) * kx;
    const sy = r.top + (mk.y - S.camera.y) * ky;
    const w = 30, h = 26;
    const x = Math.round(sx - w / 2), y = Math.round(sy - h / 2);
    if (x < 0 || y < 0 || x + w > innerWidth || y + h > innerHeight) return null;
    return { x, y, width: w, height: h };
  });
  const box = await caretBox();
  if (!box) {
    rec.ok('the attack indicator is painted over the monster', false, 'the sample crop fell off screen');
  } else {
    const shotA = await H.screenshotPixels(P, box);
    /* Two keepsakes: the whole frame (is the indicator legible in context, or
       lost under a chat bubble?) and a crop around the mark. */
    await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/.last-engage-mark.png' }).catch(() => {});
    await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/.last-engage-caret.png',
      clip: { x: Math.max(0, box.x - 70), y: Math.max(0, box.y - 40), width: 170, height: 170 } }).catch(() => {});
    /* THE CONTROL: same monster, same ground, same camera, the mark suppressed
       by taking the monster out of candidacy without moving it a pixel.
       v2.3.2251: this used to suppress the caret by LOCKING the monster, which
       worked while a lock was something the player asked for.  Acquisition is
       automatic now, so the single candidate is already the lock and locking it
       changes nothing -- the control compared a frame with itself and the
       assertion would have passed on a renderer that drew nothing at all.
       `_zoneLoading` is the one flag the indicator already honours (the marks
       must not paint over a loading overlay), so it suppresses the whole set
       while leaving the monster, the ground and the camera exactly as they
       were -- which is what a control has to hold still. */
    await P.page.evaluate(() => {
      /* isIntangible takes a monster OUT of candidacy (targeting.monLive) while
         the renderer keeps drawing it where it was -- the snow-pile rule,
         reused.  Its real condition is `_burPhase === 'pile' || _burstUntil`
         (data/monsterVariants.js), NOT an `isIntangible` property, so set the
         one the function actually reads.  A flag the game loop owns
         (_zoneLoading) is rewritten on the next frame and would not hold
         still for the screenshot. */
      const m = window._gameState.current.monsters[0];
      m._burstUntil = Date.now() + 60000;
    });
    await P.page.waitForTimeout(450);
    rec.ok('guard: the mark can be suppressed without moving the monster (probe agrees)',
      (await P.page.evaluate(() => window.__btAtkMark().length)) === 0);
    const shotB = await H.screenshotPixels(P, box);
    let moved = 0;
    const n = Math.min(shotA.data.length, shotB.data.length);
    for (let i = 0; i < n; i += shotA.channels) {
      if (Math.abs(shotA.data[i] - shotB.data[i]) > 24
        || Math.abs(shotA.data[i + 1] - shotB.data[i + 1]) > 24
        || Math.abs(shotA.data[i + 2] - shotB.data[i + 2]) > 24) moved++;
    }
    rec.ok('the indicator is really PAINTED: the crop changes when the mark is taken away',
      moved > 20, { movedPx: moved, of: Math.round(n / shotA.channels), box });
    await P.page.evaluate(() => {
      const m = window._gameState.current.monsters[0];
      m._burstUntil = 0;
    });
    await P.page.waitForTimeout(350);
  }

  /* ── 2. movement is relative to the lock, with no finger on the button ── */
  /* ═══ v2.3.2251: A LOCK IS NOT ENGAGEMENT ANY MORE ═══
     This block asserts the owner's v2.3.2246 rule -- movement revolves around
     the target with no finger on the button -- and it used a bare lock to set
     that state up, which was fair while a lock only existed because you had
     asked for one.  Acquisition is automatic now, so a bare lock is present
     whenever ANY monster is within 220px, and target-relative movement on that
     would put you in a backwards jog every time a slime wandered past while
     you were walking somewhere.
     `src: 'tap'` is the deliberate pick -- the state targeting.engagedStance
     reads -- so the rule is set up the way a player would: by tapping it. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = S.monsters[0];
    S.lockedTarget = { type: 'monster', id: m.id, ref: m, src: 'tap' };
    S.autoAttack = false;
  });
  await P.page.waitForTimeout(400);
  const engaged = await st(P);
  rec.ok('guard: TAP-locked, and NOT attacking — this is the state the change is about',
    engaged.lock === 'qa_eng_1' && engaged.auto === false, engaged);
  rec.ok('...and the aim already points at the target with no finger down (east, body centre up)',
    typeof engaged.aim === 'number' && Math.abs(engaged.aim - Math.atan2(-23, 120)) < 0.15, engaged);

  /* AWAY from the monster (it is due east, so push west) = backwards jog. */
  await push(P, -60, 0);
  await P.page.waitForTimeout(450);
  const away = await st(P);
  await release(P);
  rec.ok('moving AWAY from the locked monster is a BACKWARDS jog (the cycle reverses)',
    away.back === true, away);
  rec.ok('...and the body stays held on the target, not turned to follow the thumb',
    away.src === 'aim', away);
  rec.ok('...and it really moved (guard — a frozen player backpedals nothing)',
    Math.abs(away.vx || 0) > 0.01, away);
  await P.page.waitForTimeout(250);

  /* TOWARD the monster = forward jog, body still on the target.  This is the
     case the pre-v2.3.2246 code got wrong in the other direction: not
     backpedaling and moving, so the ladder fell through to the stick. */
  await push(P, 60, 0);
  await P.page.waitForTimeout(450);
  const toward = await st(P);
  await release(P);
  rec.ok('moving TOWARD the locked monster is a forward jog, not a backwards one',
    toward.back === false, toward);
  rec.ok('...and the body is STILL held on the target', toward.src === 'aim', toward);

  /* STRAFE.  There is no sideways strip in the art -- the body holds on the
     target and the legs take whichever of forward/reversed the dot product
     picks -- so what is asserted is the part that has art: the facing. */
  await push(P, 0, -60);
  await P.page.waitForTimeout(450);
  const strafe = await st(P);
  await release(P);
  rec.ok('strafing across the locked monster keeps the body on it', strafe.src === 'aim', strafe);
  rec.ok('...and the rendered facing is the direction of the TARGET (east), not of travel (north)',
    strafe.facing === 'east' || strafe.facing === 'e', strafe);
  await P.page.waitForTimeout(250);

  /* ── 3. the control: no lock, and the thumb owns the facing again ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.lockedTarget = null; S.monsters = []; S._targetCands = [];
  });
  await P.page.waitForTimeout(400);
  await push(P, 0, -60);
  await P.page.waitForTimeout(450);
  const free = await st(P);
  await release(P);
  rec.ok('with nothing locked, movement is NOT target-relative — the stick owns the facing again',
    free.back === false && free.src === 'stick', free);

  /* ── 4. the button lingers rather than strobing on the perimeter edge ──
     Candidacy is a hard 220px test, so a monster pacing the boundary would
     otherwise flick the button on and off several times a second. */
  await seedFodder(P, 'qa_eng_2', 120, 0);
  await P.page.waitForTimeout(500);
  const shownWith = await P.page.evaluate(() => window.__btDiscVis().R.shown);
  rec.ok('guard: the right button is painted with a candidate in range', shownWith === true);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = S.monsters[0];
    m.x = S.player.x + 900; m.renderX = m.x;   /* well outside the perimeter */
    S.lockedTarget = null;
  });
  await P.page.waitForTimeout(120);
  const justAfter = await P.page.evaluate(() => window.__btDiscVis());
  rec.ok('the instant the last candidate leaves, the button is still up (no strobe)',
    justAfter.R.shown === true && justAfter.R.cands === 0, justAfter.R);
  await P.page.waitForTimeout(900);
  const settled = await P.page.evaluate(() => window.__btDiscVis());
  rec.ok('...and it is gone once the linger runs out', settled.R.shown === false, settled.R);

  await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/.last-engage.png' }).catch(() => {});
  await P.ctx.close().catch(() => {});
}
