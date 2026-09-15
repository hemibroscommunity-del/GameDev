/* DOES THE BOW'S FIRE GATE TEST THE LINE THE PLAYER IS SHOWN? (v2.3.2527)
 *
 * Owner, after playing the merged bow rework: it "works well with the
 * exception of those moments" -- sometimes the sight line is visibly ON a
 * monster and the bow will not fire, and sometimes it is visibly OFF one and
 * fires anyway.
 *
 * WRONG IN BOTH DIRECTIONS IS NOT A THRESHOLD, IT IS A MISMATCH.  A gate whose
 * radius is a few px too small misses on the edges and never fires early; a
 * gate that tests a DIFFERENT LINE from the one it draws does both at once, and
 * which one the player gets depends only on where the two lines happen to fall.
 * So the claim under test here is not "the bow hits what it aims at" -- that is
 * mp-hitreal's -- it is the one property a sight line exists for:
 *
 *     THE RAY THE GATE TESTS AND THE LINE THE PLAYER IS SHOWN ARE THE SAME
 *     GEOMETRY, on every frame, not only on the frame a shot goes out.
 *
 * ═══ WHY NO EXISTING SCENARIO CAUGHT IT ═══
 * mp-aimpath already compares the beam's ANGLE against the arrow's in the same
 * tick, and passes.  It compares them immediately after a shot -- and the two
 * origins are written together (effectsRenderer publishes `_bowGripX/Y` and
 * `_bowGripDX/DY` on the same line), so they cannot disagree at that instant.
 * They drift only once the PLAYER MOVES while the absolute pair is not being
 * rewritten, and no scenario moved a bow player between a shot and a read.
 * That gap is this file's whole subject, so every block below walks first.
 *
 * ═══ THE MEASUREMENT, AND WHY IT IS PERPENDICULAR ═══
 * With a thumb on the aim (`_aiming`), rangedAimAngle returns `_aimAngle`
 * directly and IGNORES the origin it was handed.  Shifting the player at right
 * angles to the aim therefore leaves the two rays exactly PARALLEL and
 * laterally offset by the shift -- the angle is held fixed by construction, so
 * any hit/miss disagreement is attributable to the ORIGIN alone and to nothing
 * else.  That is what makes this a measurement of one variable rather than an
 * observation that the bow felt wrong.
 *
 * SHIFT is 140px against a fodder's 31.6px effective circle (hit radius 25 +
 * the arrow's 6.6px half-thickness), so neither block is a near miss: the
 * offset ray clears the blob by more than four times its own width.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
/* Off-axis and not a multiple of pi/4, so nothing here can pass by landing on
   a quantised fallback (mp-aimpath's own reasoning). */
const DIAG = 0.9;
const RANGE = 300;          /* well inside the 675px plant cap */
const SHIFT = 140;          /* perpendicular; 4.4x the fodder's effective circle */
const FODDER_R = 25 + 6.6;  /* monsterProjRadius('fodder') + PROJ_BODY.arrow.half */
const BODY_OFF = 23;        /* monsterBodyOffsetY('fodder') */

/* The same touch shim mp-arrowshot / mp-btnlayout install: block D presses the
   REAL button through the DOM rather than calling specialAttack, because the
   claim under test is what the player sees on that control. */
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

const armBow = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
  const t = ((F.WOODWORKING_TIERS || {}).pine) || { tierMult: 1 };
  R.rangedWeapon = { type: 'bow', tierMult: t.tierMult, gearBase: 'pine', name: 'Pine Bow', tier: 'common' };
  R.activeSlot = 'ranged';
  R.mana = R.maxMana = 500;
  S.lockedTarget = null;
  S.arrows = [];
  S._shieldUp = false;
  S._bowSpecialQueued = 0;
  return { slot: R.activeSlot, wpn: R.rangedWeapon.type };
});

/* A fodder standing on the diagonal, pinned: no lock (the bow auto-acquires
   nothing since v2.3.2258), so it feeds the aim ladder nothing and only ever
   satisfies the gate. */
const seedOnLine = (P) => P.page.evaluate((a) => {
  const S = window._gameState.current, F = window._gameFns || {};
  S._serverMonsters = false;
  const m = F.createMonster('gate-line', 'fodder', 2,
    S.player.x + Math.cos(a.ang) * a.d, S.player.y + Math.sin(a.ang) * a.d, null);
  m.alive = true; m.curHp = m.maxHp = 900000; m.spd = 0; m.vx = 0; m.vy = 0;
  m.renderX = m.x; m.renderY = m.y;
  S.monsters = [m];
  S.lockedTarget = null;
  return { mx: m.x, my: m.y, px: S.player.x, py: S.player.y };
}, { ang: DIAG, d: RANGE });

/* Read the gate's ray and the drawn line IN ONE FRAME.  Two reads separated by
   a wait are two different frames, which is the mistake mp-aimpath's own
   "phantom" note records having made once already. */
const sample = (P, fodderR, bodyOff) => P.page.evaluate((k) => new Promise((resolve) => {
  const S = window._gameState.current;
  const t0 = Date.now();
  const iv = setInterval(() => {
    const beam = window.__btSightBeam ? window.__btSightBeam() : null;
    const g = S._bowSight;
    if (beam && beam.origin && beam.angle != null && g) {
      clearInterval(iv);
      const m = (S.monsters || [])[0];
      const cx = m ? ((typeof m.renderX === 'number') ? m.renderX : m.x) : null;
      const cy = m ? (((typeof m.renderY === 'number') ? m.renderY : m.y) - k.bodyOff) : null;
      /* Perpendicular distance from the monster's body centre to the DRAWN
         ray, so "the line is on him" is a number rather than an impression. */
      let drawnGap = null;
      if (cx != null) {
        const vx = cx - beam.origin.x, vy = cy - beam.origin.y;
        const t = vx * Math.cos(beam.angle) + vy * Math.sin(beam.angle);
        const px = beam.origin.x + Math.cos(beam.angle) * Math.max(0, t);
        const py = beam.origin.y + Math.sin(beam.angle) * Math.max(0, t);
        drawnGap = Math.hypot(cx - px, cy - py);
      }
      resolve({
        gate: { ox: g.ox, oy: g.oy, ang: g.ang, d: g.d, id: g.id },
        beam: { ox: beam.origin.x, oy: beam.origin.y, ang: beam.angle, src: beam.src,
          visible: beam.visible, clipped: beam.clipped },
        originGap: Math.hypot(g.ox - beam.origin.x, g.oy - beam.origin.y),
        angGap: Math.abs(Math.atan2(Math.sin(g.ang - beam.angle), Math.cos(g.ang - beam.angle))),
        drawnGap, drawnOnTarget: drawnGap != null && drawnGap <= k.fodderR,
        player: { x: S.player.x, y: S.player.y },
        gripAbs: { x: S._bowGripX, y: S._bowGripY },
        gripDelta: { x: S._bowGripDX, y: S._bowGripDY },
        arrows: (S.arrows || []).length,
      });
    } else if (Date.now() - t0 > 4000) {
      clearInterval(iv);
      resolve({ timeout: true, beam, gate: g || null });
    }
  }, 16);
}), { fodderR, bodyOff });

/* Hold the fire control, sample the two rays WHILE IT IS STILL HELD, then
   report whether anything actually left.
 *
 * THE SAMPLE HAS TO BE INSIDE THE HOLD.  `shouldDraw` requires `bowFiring`,
 * which is `autoAttack` -- release the control first and the renderer stops
 * publishing an angle at all, so the probe reports a null heading and every
 * comparison against it is vacuous.  (It reported exactly that on the first
 * run of this file.)
 *
 * Two readings, because they answer different questions: the gate's own `d` is
 * what it BELIEVES, and an arrow in `S.arrows` is what it DID.  The second is
 * the one the owner can see, so both are asserted. */
const holdAndSample = async (P, ms, fodderR, bodyOff) => {
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.arrows = []; S.swingTimer = 0; S.autoAttack = true;
  });
  await P.page.waitForTimeout(150);       /* the beam comes up, the gate settles */
  const s = await sample(P, fodderR, bodyOff);
  await P.page.waitForTimeout(ms);
  const f = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const n = (S.arrows || []).length;
    S.autoAttack = false;
    return { fired: n };
  });
  return { s, f };
};

/* Stop shooting and let the 360ms bow pose lapse, so `_bowGripX/Y` stop being
   rewritten -- the state a bow player is in for most of a fight, and the state
   in which the absolute grip goes stale. */
const restAndWalk = (P, aimFrom) => P.page.evaluate((k) => {
  const S = window._gameState.current;
  S.autoAttack = false;
  S.arrows = [];
  /* Perpendicular to the aim: the angle is untouched, only the origin moves. */
  S.player.x += Math.cos(k.ang + Math.PI / 2) * k.shift;
  S.player.y += Math.sin(k.ang + Math.PI / 2) * k.shift;
  return { x: S.player.x, y: S.player.y };
}, aimFrom);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Gate', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await installTouch(P);

  const armed = await armBow(P);
  rec.ok('guard: a bow is in hand with no lock', armed.wpn === 'bow', armed);
  const seed = await seedOnLine(P);
  console.log(`    target: ${JSON.stringify(seed)}`);

  /* ── A. THE CONTROL: STANDING STILL, EVERYTHING FRESH ──
     This is the state every existing scenario tests in, and it is expected to
     pass on the broken build too -- that is the point of a control.  It also
     stamps the grip, which is what the two blocks after it let go stale. */
  await P.page.evaluate((ang) => {
    const S = window._gameState.current;
    S._aimAngle = ang; S._aiming = true; S._lastAimAngle = ang;
  }, DIAG);
  const { s: a, f: fireA } = await holdAndSample(P, 700, FODDER_R, BODY_OFF);
  console.log(`    A still: ${JSON.stringify(a)}`);
  rec.ok('A (control): standing still, the line is on the monster (guard)',
    a.drawnOnTarget === true, a);
  rec.ok('A (control): standing still, the bow fires', fireA.fired > 0, fireA);
  rec.ok('A (control): standing still, gate ray and drawn line share an origin',
    a.originGap != null && a.originGap < 1, a);

  /* ── B. WALK, AND KEEP THE LINE ON HIM ──
     The owner's first symptom.  The player steps sideways and re-points at the
     monster: the drawn line is on the blob (asserted, not assumed) and the aim
     angle is the only thing that changed -- so a bow that now refuses to fire
     is testing a ray from somewhere the player no longer is. */
  const moved = await restAndWalk(P, { ang: DIAG, shift: SHIFT });
  await P.page.waitForTimeout(600);        /* > BOW_SHOT_MS 360: the pose lapses */
  const aimAtB = await P.page.evaluate((k) => {
    const S = window._gameState.current;
    const m = (S.monsters || [])[0];
    const gx = S.player.x + (S._bowGripDX || 0), gy = S.player.y + (S._bowGripDY || 0);
    const ang = Math.atan2((m.y - k.bodyOff) - gy, m.x - gx);
    S._aimAngle = ang; S._aiming = true; S._lastAimAngle = ang;
    return { ang, gx, gy };
  }, { bodyOff: BODY_OFF });
  const { s: b, f: fireB } = await holdAndSample(P, 900, FODDER_R, BODY_OFF);
  console.log(`    B walked: moved=${JSON.stringify(moved)} aim=${JSON.stringify(aimAtB)}`);
  console.log(`    B sample: ${JSON.stringify(b)}`);
  rec.ok('B: after walking, the drawn line really is on the monster (guard)',
    b.drawnOnTarget === true, b);
  rec.ok('B: the rays stayed parallel, so only the ORIGIN is under test (guard)',
    b.angGap != null && b.angGap < 0.01, b);
  rec.ok(`B: the gate tests the line the player is shown (origin gap ${b.originGap == null ? '?' : b.originGap.toFixed(1)}px)`,
    b.originGap != null && b.originGap < 1, b);
  rec.ok('B: ...so a line that is ON the monster opens the gate',
    b.gate && b.gate.d != null, b);
  rec.ok('B: ...and the bow actually fires', fireB.fired > 0, fireB);

  /* ── C. THE CONVERSE: WALK, AND POINT PAST HIM ──
     The owner's second symptom, and the half a radius fix cannot produce.  The
     aim is the heading that pointed at the monster from where the player USED
     to stand, so from where they stand NOW the drawn line clears the blob by
     SHIFT.  A bow that fires here is firing at a line nobody is shown. */
  const aimAtC = await P.page.evaluate((k) => {
    const S = window._gameState.current;
    const m = (S.monsters || [])[0];
    /* the pre-walk grip point: back out the perpendicular step */
    const ox = S.player.x + (S._bowGripDX || 0) - Math.cos(k.ang + Math.PI / 2) * k.shift;
    const oy = S.player.y + (S._bowGripDY || 0) - Math.sin(k.ang + Math.PI / 2) * k.shift;
    const ang = Math.atan2((m.y - k.bodyOff) - oy, m.x - ox);
    S._aimAngle = ang; S._aiming = true; S._lastAimAngle = ang;
    return { ang, ox, oy };
  }, { ang: DIAG, shift: SHIFT, bodyOff: BODY_OFF });
  const { s: c, f: fireC } = await holdAndSample(P, 900, FODDER_R, BODY_OFF);
  console.log(`    C past him: aim=${JSON.stringify(aimAtC)}`);
  console.log(`    C sample: ${JSON.stringify(c)}`);
  rec.ok(`C: the drawn line genuinely clears the monster (guard, gap ${c.drawnGap == null ? '?' : c.drawnGap.toFixed(1)}px vs ${FODDER_R.toFixed(1)})`,
    c.drawnOnTarget === false, c);
  rec.ok('C: a line that is OFF the monster keeps the gate shut',
    c.gate && c.gate.d == null, c);
  rec.ok('C: ...and the bow does NOT fire', fireC.fired === 0, fireC);

  /* ── D. THE HELD SPECIAL IS SHOWN, NOT SAID ──
     Owner, same report: swiping the bow's special on a monster "often pops a
     message saying the ability is queued", and "the player does not need
     telling every time; they swiped, they expect a shot."

     The QUEUE itself is good behaviour and stays (v2.3.2473: the request is
     remembered and goes out on the first frame the line lands, spending no
     mana and starting no cooldown while it waits).  What moved is where it is
     reported: out of a pushDmgPopup over the player's head and into the state
     of the button that is holding it.  So this block asserts both halves --
     the popup is GONE, and the button says so instead -- because dropping the
     message without replacing it would leave a control that silently does
     nothing, which is the thing v2.3.2473's popup was right to avoid.

     The monster is moved INSIDE TARGET_PERIMETER_PX (220) here: that is
     specialButtonLive's own predicate, and the button is not on screen without
     a fight near enough to justify it.  It stays off the aim line, so the gate
     is still shut and the press still has something to wait for. */
  const setup = await P.page.evaluate((k) => {
    const S = window._gameState.current;
    const m = (S.monsters || [])[0];
    /* close enough for the button, still off the line the bow is pointing down */
    m.x = S.player.x + Math.cos(k.ang) * 150;
    m.y = S.player.y + Math.sin(k.ang) * 150;
    m.renderX = m.x; m.renderY = m.y;
    S.autoAttack = false;
    S.arrows = [];
    S.dmgNumbers = [];            /* so any popup below is THIS press's */
    S._bowSpecialQueued = 0;
    S._lastSwipe = 0;
    S._hasUsedSwipe = false;
    S._shieldUp = false;
    S.rpg.mana = S.rpg.maxMana = 500;
    /* point at right angles to the monster: the line is empty */
    const off = k.ang + Math.PI / 2;
    S._aimAngle = off; S._aiming = true; S._lastAimAngle = off;
    return { mx: m.x, my: m.y, px: S.player.x, py: S.player.y };
  }, { ang: DIAG });
  await P.page.waitForTimeout(400);
  const before = await P.page.evaluate(() => {
    const el = document.querySelector('[data-special]');
    const S = window._gameState.current;
    return { present: !!el, state: el ? el.getAttribute('data-special') : null,
      label: el ? el.textContent : null,
      sightD: S._bowSight ? S._bowSight.d : undefined,
      queued: window.__btSpecialBtn ? window.__btSpecialBtn().queued : null };
  });
  console.log(`    D setup: ${JSON.stringify(setup)} -> ${JSON.stringify(before)}`);
  rec.ok('D: the Special button is on screen with a monster near (guard)',
    before.present === true, before);
  rec.ok('D: the line is empty, so the press has something to wait for (guard)',
    before.sightD == null, before);
  rec.ok('D: ...and nothing is queued yet (guard)', before.queued === false, before);

  const pressed = await P.page.evaluate(() => {
    const c = window.__centre('[data-special]');
    window.__touch(c.el, 'touchstart', c.x, c.y, 81);
    window.__touch(c.el, 'touchend', c.x, c.y, 81);
    return true;
  });
  await P.page.waitForTimeout(350);        /* > the button's own 200ms poll */
  const held = await P.page.evaluate(() => {
    const el = document.querySelector('[data-special]');
    const S = window._gameState.current;
    const texts = (S.dmgNumbers || []).map((p) => String(p.text || ''));
    return { state: el ? el.getAttribute('data-special') : null,
      label: el ? el.textContent : null,
      queuedFlag: !!S._bowSpecialQueued,
      queuedProbe: window.__btSpecialBtn ? window.__btSpecialBtn().queued : null,
      popups: texts,
      /* a queued special must still be FREE -- it has not happened yet */
      mana: S.rpg.mana, lastSwipe: S._lastSwipe || 0 };
  });
  console.log(`    D pressed=${pressed}: ${JSON.stringify(held)}`);
  rec.ok('D: the swipe is remembered (guard)', held.queuedFlag === true, held);
  /* THE OWNER'S ACTUAL COMPLAINT. */
  rec.ok('D: ...with NO message interrupting the player',
    held.popups.every((t) => !/lining|queue/i.test(t)), held);
  rec.ok('D: ...the button shows the held state instead',
    held.state === 'queued' && held.queuedProbe === true, held);
  rec.ok('D: ...and says what to do about it', /AIM/.test(held.label || ''), held);
  rec.ok('D: ...while still spending nothing -- no mana, no cooldown',
    held.mana === 500 && held.lastSwipe === 0, held);

  /* And it is a WAIT, not a refusal: bring the line onto him and the special
     the player already asked for goes out on its own. */
  const landed = await P.page.evaluate((k) => {
    const S = window._gameState.current;
    const m = (S.monsters || [])[0];
    const gx = S.player.x + (S._bowGripDX || 0), gy = S.player.y + (S._bowGripDY || 0);
    const ang = Math.atan2((m.y - k.bodyOff) - gy, m.x - gx);
    S._aimAngle = ang; S._aiming = true; S._lastAimAngle = ang;
    S.swingTimer = 0; S.autoAttack = true;
    return { ang };
  }, { bodyOff: BODY_OFF });
  await P.page.waitForTimeout(600);
  const went = await P.page.evaluate(() => {
    const el = document.querySelector('[data-special]');
    const S = window._gameState.current;
    S.autoAttack = false;
    return { queuedFlag: !!S._bowSpecialQueued, lastSwipe: S._lastSwipe || 0,
      mana: S.rpg.mana, state: el ? el.getAttribute('data-special') : null };
  });
  console.log(`    D landed: ${JSON.stringify(landed)} -> ${JSON.stringify(went)}`);
  rec.ok('D: bringing the line onto him fires the special the player asked for',
    went.lastSwipe > 0 && went.mana < 500, went);
  rec.ok('D: ...and the button drops the held state once it has gone',
    went.queuedFlag === false && went.state !== 'queued', went);

  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.lockedTarget = null; S.monsters = []; S.arrows = [];
    S._aiming = false; S.autoAttack = false; S._bowSpecialQueued = 0;
  });
  await P.ctx.close().catch(() => {});
}
