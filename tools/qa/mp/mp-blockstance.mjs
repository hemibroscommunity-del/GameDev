/* WHAT A RAISED SHIELD LOOKS LIKE (v2.3.1798 + 1799).
 *
 * Three owner reports, one screen:
 *   "the shield looks much smaller while it's active and straight out.  The
 *    shield on the characters bag looks much larger.  I prefer the larger look"
 *   "One downside to the shield arm is that jogging backwards still shows both
 *    arms moving AND the outstretched arm"
 *   "Add a carat while blocking to indicate the direction you're blocking" —
 *   then "make the carat more noticeable like a light blue and make that color
 *   the same for sword attack carat to make it consistent"
 *
 * The arm-count one is the interesting assertion.  You cannot count arms from a
 * screenshot, so what is pinned instead is the CAUSE: the jog frames draw two
 * arms and the block arm composites a third, so while the shield is up the body
 * must not be playing jog.  That is a fact about the pose, and a pose is
 * readable.
 */
import * as H from './harness.mjs';

const IDX = { E: 0, SE: 1, S: 2, SW: 3, W: 4, NW: 5, N: 6, NE: 7 };

/* Sector index -> the compass name the renderer will report, so pin() can wait
   for the FRAME to arrive rather than for a fixed number of milliseconds. */
const FACING_OF = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

async function pin(P, k) {
  await P.page.evaluate((kk) => { window.__pin.k = kk; window.__pin.on = true; }, k);
  /* WAIT FOR THE RENDER, NOT THE CLOCK.  A flat 360ms was enough while this
     file only tested three neighbouring facings; adding the north half made it
     wrong, and wrong in the most misleading way — the probe returned the
     PREVIOUS facing's numbers, so "NW draws the shield in front" failed while
     reporting facing:"west", and the renderer was right both times.  The guard
     angle is slewed toward its target over several frames rather than snapped,
     so the only safe wait is until the renderer says it got there. */
  const want = FACING_OF[k];
  const t0 = Date.now();
  for (;;) {
    const b = await P.page.evaluate(() => window.__btBlockPose || null);
    if (b && b.facing === want) break;
    if (Date.now() - t0 > 4000) break;      /* let the assertion report it */
    await P.page.waitForTimeout(80);
  }
  await P.page.waitForTimeout(120);
}
const probe = (P) => P.page.evaluate(() => window.__btBlockPose || null);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Guard', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.shield = { name: 'Pine Shield', type: 'shield' };
    S.rpg.weapon = S.rpg.weapon || { type: 'greatsword', name: 'Copper Great Sword', dmg: 5 };
    /* The movement system rewrites vx/vy from real input every frame and several
       paths clear _shieldUp, so the facing and the guard are re-stamped from a
       rAF inside the page rather than poked once. */
    window.__pin = { k: 0, on: false };
    const tick = () => {
      const S2 = window._gameState.current;
      if (S2 && window.__pin.on) {
        S2._shieldUp = true;
        /* _shieldKb OFF.  With it set, BroTown re-derives _shieldAngle from
           _mouseAimAngle every frame (the desktop mouse-aims-the-guard path),
           which silently overrode the pinned angle: the first cut of this file
           asked for east and rendered a guard at 0.51 rad, then blamed the
           caret.  The caret was right and the pin was not. */
        S2._shieldKb = false;
        /* ...and its SOURCE.  Clearing _shieldKb was not enough: the guard
           angle still came back as 0.637 rad with _aimAngle pinned to 0, which
           is _mouseAimAngle — wherever Playwright happens to leave the pointer.
           Pin the input, not just the derived value, or the game re-derives it
           on its own frame after this one. */
        S2._mouseAimAngle = window.__pin.k * Math.PI / 4;
        S2._facingAngle = window.__pin.k * Math.PI / 4;
        S2._aimAngle = window.__pin.k * Math.PI / 4;
        S2._shieldAngle = window.__pin.k * Math.PI / 4;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  /* ── 1. the shield is the size the owner asked for ── */
  await pin(P, IDX.E);
  const held = await probe(P);
  rec.ok('the block probe reports (guard)', !!held, held);
  rec.ok('the raised shield is drawn at the same world size as the slung one',
    !!(held && held.shieldW === held.backShieldPx), held);
  /* The number that was wrong, pinned so a revert is loud: 56 was the old
     `scale = 56/64`, which also silently assumed 64px source art. */
  rec.ok('...and is no longer the old 56px', !!(held && held.shieldW > 56), held);

  /* ── 2. blocking while moving: legs jog, top half holds ──
     Owner: "are you allowing the legs to move (jog motion while blocking) and
     just freezing the top half?  Thats what I'd prefer.  Otherwise the
     character will look like they're sliding."
     v2.3.1800 answers it by handing the block to the BOW stand-in, whose
     jog-legs composite (v2.3.1072/1080/1088) is exactly that shape: animated
     legs under a leg-erased torso strip.  So what has to be true is that the
     stand-in is what is on screen, and that its legs are cycling. */
  await P.page.keyboard.down('a');
  await P.page.waitForTimeout(800);
  const moving = await probe(P);
  await P.page.keyboard.up('a');
  rec.ok('the player really is moving (guard)', !!(moving && moving.moving), moving);
  rec.ok('a raised shield draws the bow-pose stand-in, not the walking body',
    !!(moving && moving.standIn), moving);
  rec.ok('...and its legs are jogging, so the feet stride instead of sliding',
    !!(moving && moving.jogLegs), moving);

  /* THE THIRD ARM IS GONE BECAUSE THERE IS NO LONGER A BODY UNDER IT.
     v2.3.1785 pasted an arm cut from the bow art onto the walking body, which
     already had two of its own — swinging while jogging, and poking out below
     at southwest ("I can see a slight arm straight down on the southwest
     angle").  The stand-in draws the bow body whole, so there is nothing to
     poke out.  Pinned as the STAND-IN being what renders, at the facing the
     owner reported, because arms cannot be counted from a screenshot. */
  await pin(P, IDX.SW);
  await P.page.keyboard.down('a');
  await P.page.waitForTimeout(700);
  const sw = await probe(P);
  await P.page.keyboard.up('a');
  rec.ok('southwest blocks with the stand-in too — no pasted arm over a walking body',
    !!(sw && sw.standIn), sw);

  /* SOUTH.  There was never a south block arm: the bow's south frames are
     foreshortened with both hands on the chest, so there was nothing to CUT
     (v2.3.1789 recorded it as needing new art).  As a whole POSE it works, and
     that gap closes without anyone painting anything. */
  await pin(P, IDX.S);
  await P.page.waitForTimeout(500);
  const south = await probe(P);
  /* v2.3.1805 REVERSED THIS.  It read "facing south now has a block pose at
     last"; the pose was there and its FACE was cut open by the erased bow.
     The claim now lives at 2c, inverted.  Left as a marker rather than deleted
     so the next reader sees that south was tried and why it does not work. */

  /* ── 2b. FACING AWAY, THE SHIELD IS ON THE FAR SIDE ──
     Owner: "The northeast/northwest and north facings put the shield facing
     the camera but should show the character's back with the shield in front
     of them facing those directions."
     There has been a rule for this since v2.3.190 (shieldBehind, sectors
     5/6/7) and under the stand-in it could not work: it is a child-index rule,
     and the body is drawn by effectsRenderer into its nodeLayer while the
     shield is a child of the player display.  No index in one container orders
     against another, so the shield sat on top — facing north it covered the
     character entirely.  v2.3.1805 hands it to the stand-in's lower clone.
     Asserted as WHICH RENDERER DRAWS IT, because "in front" and "behind" are
     not readable from a screenshot when the thing in front is opaque. */
  for (const n of ['NW', 'N', 'NE']) {
    await pin(P, IDX[n]);
    const b = await probe(P);
    rec.ok(`${n}: the block still uses the stand-in`, !!(b && b.standIn), b);
    rec.ok(`${n}: the shield is handed to the clone BEHIND the body`,
      !!(b && b.shieldBehind), b);
    rec.ok(`${n}: ...and the display's own shield sprite is not also drawn`,
      !!(b && !b.shieldSpriteVisible), b);
  }
  /* ...and the south half keeps it in front, drawn the normal way. */
  for (const n of ['E', 'SW']) {
    await pin(P, IDX[n]);
    const b = await probe(P);
    rec.ok(`${n}: the shield stays in front, on the display's own sprite`,
      !!(b && !b.shieldBehind && b.shieldSpriteVisible), b);
  }

  /* ── 2c. SOUTH IS NOT A STAND-IN FACING ──
     Owner: "For shield hold, part of the characters face is missing or keyed
     out facing south."  v2.3.1800 claimed the stand-in had finally given south
     a block pose; that claim was wrong, checked in a crop where the shield hid
     the torso.  bow-south-body.png is the sheet with the WEAPON erased, and
     the south bow is held vertically in front of the face — erasing it cuts a
     slot down through the head, which the bow was covering.  All three frames
     are holed, so no BLOCK_POSE_FRAME escapes it.
     Pinned as "south does not use the stand-in", which is the decision; the
     art fact behind it is measured in the commit, not here. */
  await pin(P, IDX.S);
  const southB = await probe(P);
  rec.ok('south does NOT use the bow stand-in — its body sheet is holed through the face',
    !!(southB && !southB.standIn), southB);
  rec.ok('...and still draws a shield, the pre-stand-in way',
    !!(southB && southB.shieldW > 0 && southB.shieldSpriteVisible), southB);

  /* ── 3. the caret points where you are GUARDING ──
     Not where you are facing, and not where you are aiming.  Those are three
     different numbers — the pin below cannot force them together, because the
     game re-derives the guard angle from its own aim tracking every frame, and
     the first cut of this file spent three runs blaming the caret for that.
     It turns out to be the useful case: with facing, aim and guard all
     different on screen at once, "which one does the caret follow" is a
     question with a discriminating answer. */
  const seen = [];
  for (const n of ['E', 'SW', 'W']) {
    await pin(P, IDX[n]);
    const c = await probe(P);
    rec.ok(`${n}: the block caret is drawn`, !!(c && c.caretVisible), c);
    if (!c || !c.caretTip) continue;
    seen.push(c);
    const bearing = Math.atan2(c.caretTip.y - c.shieldY, c.caretTip.x - c.shieldX);
    const off = (a, b) => { let d = Math.abs(a - b); while (d > Math.PI) d = Math.abs(d - Math.PI * 2); return d; };
    rec.ok(`${n}: ...along the GUARD angle`, off(bearing, c.stateShieldAng) < 0.02,
      { bearing, guard: c.stateShieldAng, c });
    /* Clear of the shield: the first cut measured 21px from the shield's
       centre, which is inside a 72px shield — it only showed at all because
       the art does not fill its box. */
    const r = Math.hypot(c.caretTip.x - c.shieldX, c.caretTip.y - c.shieldY);
    rec.ok(`${n}: ...and clear of the shield, not inside it`, r > c.shieldW / 2, { r, shieldW: c.shieldW });
  }
  /* THE GUARD DIRECTION IS ITS OWN THING.  Without this, every "along the
     GUARD angle" assertion above could be satisfied by a caret that quietly
     used the facing or the aim instead — they would all be the same number.
     At least one sample has to prove they are not. */
  const discriminating = seen.some((c) => {
    const off = (a, b) => { let d = Math.abs(a - b); while (d > Math.PI) d = Math.abs(d - Math.PI * 2); return d; };
    return off(c.stateShieldAng, c.stateAimAng) > 0.15;
  });
  rec.ok('the guard angle really does differ from the aim (so the check above discriminates)',
    discriminating, seen.map((c) => ({ guard: c.stateShieldAng, aim: c.stateAimAng, facing: c.facing })));

  /* ── 4. one blue for both direction marks ── */
  const col = await P.page.evaluate(() => window.__btAimCaret || null);
  rec.ok('the block caret and the sword direction chip share one colour',
    !!(col && col.block === col.melee), col);

  /* THE RENDER MUST NOT HAVE THROWN.  pixiRenderer catches per system, so a
     ReferenceError in _updatePlayer does not white-screen — it silently drops
     the whole player and leaves an empty patch of ground.  That is exactly how
     the first cut of v2.3.1800 failed (a `const` read 40 lines before its own
     declaration), and a screenshot of grass looks like a camera problem. */
  const threw = P.logs.filter((l) => /entityRenderer threw|effectsRenderer threw|pageerror/.test(l));
  rec.ok('no renderer system threw while blocking', threw.length === 0, threw);

  /* look-at-it shots */
  for (const n of ['E', 'SW', 'W', 'S']) {
    await pin(P, IDX[n] != null ? IDX[n] : 1);
    for (const mv of [false, true]) {
      if (mv) await P.page.keyboard.down('a');
      await P.page.waitForTimeout(700);
      const c = await probe(P);
      const cv = await P.page.evaluate(() => {
        const S = window._gameState.current; const r = document.querySelector('canvas').getBoundingClientRect();
        return { x: r.left + (S.player.x - S.camera.x) * (S._worldScaleX || 1),
                 y: r.top + (S.player.y - S.camera.y) * (S._worldScaleY || 1) };
      });
      await P.page.screenshot({ path: `tools/qa/mp/out/bs-${n}-${mv ? 'jog' : 'stand'}.png`,
        clip: { x: Math.max(0, Math.round(cv.x - 75)), y: Math.max(0, Math.round(cv.y - 105)), width: 150, height: 150 } });
      if (mv) await P.page.keyboard.up('a');
      await P.page.waitForTimeout(250);
    }
  }
  await P.page.screenshot({ path: 'tools/qa/mp/out/blockstance.png' });
  await P.ctx.close().catch(() => {});
}
