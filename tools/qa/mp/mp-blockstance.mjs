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

const IDX = { E: 0, SE: 1, S: 2, SW: 3, W: 4 };

async function pin(P, k) {
  await P.page.evaluate((kk) => { window.__pin.k = kk; window.__pin.on = true; }, k);
  await P.page.waitForTimeout(360);
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

  /* ── 2. a raised shield plants the stance ──
     Only the count of arms matters and only the pose can be measured: jog draws
     two, the composited block arm is a third. */
  await P.page.keyboard.down('a');
  await P.page.waitForTimeout(800);
  const moving = await probe(P);
  await P.page.keyboard.up('a');
  rec.ok('the player really is moving (guard)', !!(moving && moving.moving), moving);
  rec.ok('blocking while moving holds the STAND pose, so no third arm swings',
    !!(moving && moving.pose === 'stand'), moving);
  rec.ok('...and the block arm is still drawn while moving',
    !!(moving && moving.armVisible), moving);

  /* Facing SOUTH there is no arm to composite (the bow art's south frames are
     foreshortened), so freezing the legs would cost the jog and buy nothing —
     south must keep jogging. */
  await pin(P, IDX.S);
  await P.page.keyboard.down('a');
  await P.page.waitForTimeout(800);
  const southMoving = await probe(P);
  await P.page.keyboard.up('a');
  rec.ok('facing south there is no block arm (guard)',
    !!(southMoving && !southMoving.armVisible), southMoving);
  rec.ok('...so south keeps jogging — the freeze is only where an arm is drawn',
    !!(southMoving && southMoving.moving && southMoving.pose === 'jog'), southMoving);

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

  await P.page.screenshot({ path: 'tools/qa/mp/out/blockstance.png' });
  await P.ctx.close().catch(() => {});
}
