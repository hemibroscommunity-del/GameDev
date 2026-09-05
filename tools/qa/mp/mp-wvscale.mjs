/* DOES YOUR OWN CHARACTER'S ART SHRINK ON THE VISTA? (v2.3.2287)
 *
 * Owner: "Some actions are gigantic in the worldview mode ... I shot an arrow
 * and it was gigantic. I think when you start fires in worldview you're also
 * gigantic. Character needs to stay at small size through all animations in
 * worldview."
 *
 * ── THE ASYMMETRY BEING FIXED ──
 * The World View shrinks every BODY by a perspective curve. Other players'
 * stand-in figures were given that curve at v2.3.1574, with the sentence "the
 * stand-in was sized in absolute pixels while the peer's BODY is scaled by the
 * zone's perspective curve". Your OWN copies never got it -- and on every
 * normal zone the curve is exactly 1, so nothing looked wrong anywhere except
 * the one place the owner was standing.
 *
 * ── THE NEGATIVE MATTERS AS MUCH AS THE FIX ──
 * `zonePlayerScale` returns literal 1 for every zone but worldview, so each
 * edit should be a provable no-op elsewhere. The real hazard is not that the
 * multiply is wrong, it is that a missing `|| 1` makes it NaN -- and a NaN
 * scale does not draw a big arrow, it draws NO arrow, in every zone. So the
 * town numbers are asserted EXACTLY (0.01 tolerance, not a percentage), which
 * a wrong-but-close fix cannot slip through.
 */
import * as H from './harness.mjs';

const TILE = 32;
const ARROW_FLAT_PX = 52.5;   /* ARROW_PINE.lenPx */
const FIRE_FLAT_H = 154;      /* the fire stand-in's FH */

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

/* Fire an arrow and read what the renderer actually drew. */
const shootAndRead = async (P) => {
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg) { S.rpg.activeSlot = 'ranged'; S.rpg.rangedWeapon = S.rpg.rangedWeapon || { type: 'bow', name: 'QA Bow', dmg: 3 }; }
    S._aimAngle = 0; S._aimSrc = 'qa';
    /* The real shape (src/game/playerActions.js): an arrow carries ang + dist,
       and the projectile step derives _renderX/_renderY from the player. A
       {x,y,vx,vy} object never gets a render position, so the draw loop skips
       it and the probe stays null -- which is how the first cut of this failed. */
    S.arrows = S.arrows || [];
    S.arrows.push({ ang: 0, dist: 14, dmg: 3, life: 120, maxLife: 120,
      hitIds: new Set(), isSpecial: false, isStaff: false, pierce: false });
  });
  await P.page.waitForTimeout(400);
  return P.page.evaluate(() => {
    const r = window._pixiRenderer;
    return r && r.projScaleProbe ? r.projScaleProbe() : null;
  });
};

/* Roll, then read the radius the ghost circles were ACTUALLY drawn at.
   `rolling && mine > 0` is required so the reading is from a live ghost this
   frame and not the stale value the previous zone's roll left behind -- the
   renderer never clears the field, and a leaked 8 from town would otherwise
   read as a pass in town and a fail on the vista for the wrong reason. */
const dodgeGhostR = async (P) => {
  await H.callFn(P, 'contextualDodge', 0).catch(() => {});
  const t0 = Date.now();
  while (Date.now() - t0 < 1200) {
    const t = await P.page.evaluate(() => (window.__btDodgeTrails ? window.__btDodgeTrails() : null));
    if (t && t.rolling && t.mine > 0 && typeof t.mineR === 'number') return t;
  }
  return null;
};

const bodyH = (P) => P.page.evaluate(() => {
  const d = window.__btPlayerDrawn ? window.__btPlayerDrawn() : null;
  return d ? d.h : null;
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Vista', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* ═══ 1. THE NEGATIVE, IN TOWN, WHERE THE CURVE IS 1 ═══ */
  const zones = await P.page.evaluate(() => {
    const z = window.__btZones || null;
    if (!z) return null;
    return Object.entries(z).filter(([, v]) => v && v.playerScale).map(([id]) => id);
  });
  if (zones) {
    rec.ok('worldview is still the only zone carrying a perspective curve, so '
      + 'every one of these edits is a provable no-op everywhere else',
      zones.length === 1 && zones[0] === 'worldview', zones);
  } else {
    rec.skip('worldview is the only zone carrying a perspective curve', 'no __btZones handle');
  }

  const townArrow = await shootAndRead(P);
  rec.ok('the arrow probe reports (guard)', !!townArrow, townArrow);
  rec.ok('in town the arrow still draws at its flat 52.5px — the vista term is '
    + 'exactly 1 here, not merely close',
    !!townArrow && Math.abs(townArrow.pk - 1) < 0.0001
      && Math.abs(townArrow.drawnLenPx - ARROW_FLAT_PX) < 0.01, townArrow);

  const chopTown = await P.page.evaluate(() => (window.__btChopFigure ? window.__btChopFigure() : null));
  if (chopTown) {
    rec.ok('...and the chopper is still exactly 104.5 tall in town',
      Math.abs(chopTown.drawnH - 104.5) < 0.01, chopTown);
  }

  const dodgeTown = await dodgeGhostR(P);
  rec.ok('the dodge-ghost radius probe reports (guard)', !!dodgeTown, dodgeTown);
  rec.ok('...and a dodge ghost is still exactly 8px in town — the vista term '
    + 'is 1 here, and a dropped `|| 1` would make it NaN and draw nothing',
    !!dodgeTown && Math.abs(dodgeTown.mineR - 8) < 0.01, dodgeTown);

  /* ═══ 2. THE VISTA ═══ */
  /* The town gate is quest-gated; mp-dashhit walks the same route. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(1800);
  const marks = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null;
  });
  if (!marks) {
    rec.skip('your arrow shrinks with you on the vista', 'no worldview exit');
    await P.ctx.close().catch(() => {}); return;
  }
  await stand(P, marks.tx * TILE + 16, marks.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
    { timeout: 30000, label: 'World View' }).catch(() => {});
  await P.page.waitForTimeout(1500);

  const onVista = await H.readState(P, (S) => S.currentZone === 'worldview');
  rec.ok('the bro reached the World View (guard)', onVista === true, { onVista });
  if (!onVista) { await P.ctx.close().catch(() => {}); return; }

  const wvBody = await bodyH(P);
  const wvArrow = await shootAndRead(P);
  rec.ok('the arrow probe reports on the vista too (guard)', !!wvArrow, wvArrow);
  rec.ok('the vista really is shrinking the character (guard)',
    !!wvArrow && wvArrow.pk > 0 && wvArrow.pk < 0.95, { pk: wvArrow && wvArrow.pk, wvBody });

  /* The verdict, and the `> 0` half is what stops "not drawn" passing as
     "shrank" -- the failure mode a screenshot cannot tell apart. */
  rec.ok("THE OWNER'S REPORT: the arrow shrinks with the archer instead of "
    + 'flying out full size',
    !!wvArrow && wvArrow.drawnLenPx > 0 && wvArrow.drawnLenPx < ARROW_FLAT_PX * 0.95,
    { drawnLenPx: wvArrow && wvArrow.drawnLenPx, flat: ARROW_FLAT_PX, pk: wvArrow && wvArrow.pk });

  /* ═══ 3. THE DODGE SMEAR ═══
     A flat 8px world radius behind a body drawn at 3-55%: the roll left a row
     of blue blobs bigger than the bro that shed them. */
  const dodgeWv = await dodgeGhostR(P);
  rec.ok('the dodge-ghost radius probe reports on the vista too (guard)', !!dodgeWv, dodgeWv);
  rec.ok('...and your dodge smear shrinks with you instead of trailing blobs '
    + 'wider than your body',
    !!dodgeWv && dodgeWv.mineR > 0 && dodgeWv.mineR < 8 * 0.95, dodgeWv);

  /* ═══ 4. THE FIRE FIGURE ═══ */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._firemaking = { startedAt: Date.now(), doneAt: Date.now() + 60000 };
  });
  await P.page.waitForTimeout(500);
  const fire = await P.page.evaluate(() => (window.__btFireFigure ? window.__btFireFigure() : null));
  rec.ok('the fire figure probe reports (guard)', !!fire, fire);
  rec.ok('...and your fire-lighter shrinks with you, the term the PEER copy got '
    + 'at v2.3.1574 and yours never did',
    !!fire && fire.drawnH > 0 && fire.drawnH < FIRE_FLAT_H * 0.95,
    { drawnH: fire && fire.drawnH, flat: FIRE_FLAT_H });

  await P.ctx.close().catch(() => {});
}
