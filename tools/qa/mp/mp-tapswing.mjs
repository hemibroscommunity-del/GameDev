/* TAP A MONSTER, WALK THERE, AND THEN WHAT? (v2.3.2285)
 *
 * Owner: "When you tap on a monster from a far distance with melee sword the
 * character does not attack when they arrive at the monster."
 *
 * ── WHAT THIS MEASURES, AND WHY IT IS NOT ANY OF THE SIX EXISTING ONES ──
 * mp-target / mp-lockrings / mp-engage all FABRICATE the lock by writing
 * S.lockedTarget by hand, in TOWN, with _serverMonsters false. That skips the
 * shipped hit test AND the client-vs-worker split, so none of them can see the
 * state the owner is describing. mp-dashhit does stand in a real zone with a
 * real forged weapon -- this borrows its route verbatim -- but it asks about
 * the LUNGE, which is a different control.
 *
 * The state under test is narrower than the owner's sentence and is the whole
 * mechanism behind it: a tap-lock is held, NO attack control is pressed, the
 * player is standing in reach -- does a swing start? The distance in his
 * report is how he MET the bug (you only walk a long way if the monster was
 * far), not what causes it. So this taps at whatever range the monster is
 * really drawn at, records that range, and walks in.
 *
 * ── THE SIGNAL ──
 * An outbound `monster_damage` on the wire. The gate under test is the thing
 * that decides whether the client asks at all, so the client's own request is
 * the direct measurement -- and it separates "no swing started" from "the
 * worker refused", which monster hp alone cannot. Monster hp is recorded
 * alongside as corroboration, never as the verdict.
 *
 * ── AND A POSITIVE CONTROL ──
 * The same monster, the same zone, with the attack button really held. If
 * that is also empty the run proves nothing about the gate and says so.
 */
import * as H from './harness.mjs';

const TILE = 32;

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

const installTouch = (P) => P.page.evaluate(() => {
  window.__touch = (el, type, x, y, id) => {
    const t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
    const end = type === 'touchend' || type === 'touchcancel';
    el.dispatchEvent(new TouchEvent(type, {
      bubbles: true, cancelable: true,
      touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t],
    }));
  };
});

/* The farthest live monster that is ALSO drawn inside the canvas, computed
   with the tap handler's own transform -- a monster the thumb cannot reach is
   not a case the owner can have hit. */
const pickTarget = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, P0 = S.player;
  const cv = document.querySelector('canvas');
  if (!cv || !P0) return null;
  const r = cv.getBoundingClientRect();
  const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
  let best = null;
  for (const m of (S.monsters || [])) {
    if (!m || m.alive === false || (typeof m.curHp === 'number' && m.curHp <= 0)) continue;
    const cx = r.left + (m.x - S.camera.x) * sx;
    const cy = r.top + ((m.renderY != null ? m.renderY : m.y) - S.camera.y) * sy;
    if (cx < r.left + 8 || cx > r.right - 8 || cy < r.top + 8 || cy > r.bottom - 8) continue;
    const gap = Math.round(Math.hypot(m.x - P0.x, m.y - P0.y));
    if (!best || gap > best.gap) best = { id: String(m.id), gap, cx: Math.round(cx), cy: Math.round(cy), hp: m.curHp };
  }
  return best;
});

const snap = (P, id) => P.page.evaluate((mid) => {
  const S = window._gameState.current;
  const m = (S.monsters || []).find((x) => String(x.id) === mid) || null;
  const lt = S.lockedTarget;
  return {
    lock: lt ? { id: String(lt.id), src: lt.src } : null,
    autoAttack: !!S.autoAttack,
    shieldUp: !!S._shieldUp,
    slot: S.rpg && S.rpg.activeSlot,
    engaged: !!S._engaged,
    hp: m ? m.curHp : null,
    gap: m && S.player ? Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) : null,
    droppedWhy: S._lockDroppedWhy || null,
  };
}, id);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Tapper', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 },
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await installTouch(P);

  /* ── the route into a zone the WORKER drives (mp-dashhit's, verbatim) ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(1800);
  const marks = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return {
      townOut: (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null,
      spoke: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'verdant')
        || (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId !== 'town') || null,
    };
  });
  if (!marks.townOut || !marks.spoke) {
    rec.skip('the tap-swing can be tested against a server monster', 'no exit tables');
    await P.ctx.close().catch(() => {}); return;
  }
  await stand(P, marks.townOut.tx * TILE + 16, marks.townOut.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
    { timeout: 30000, label: 'World View' }).catch(() => {});
  await P.page.waitForTimeout(800);
  await stand(P, marks.spoke.tx * TILE + 16, marks.spoke.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z !== 'worldview' && z !== 'town',
    { timeout: 30000, label: 'a monster zone' }).catch(() => {});
  await P.page.waitForTimeout(2500);

  /* A real forged weapon, so the WORKER holds one too -- an injected
     S.rpg.weapon is undone by the next player_state echo. */
  const myId = await H.readState(P, (S) => S.myId);
  await H.grant(wsPort, myId, 'gold', { amount: 500 }).catch(() => {});
  await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine_log', count: 9 }).catch(() => {});
  await P.page.waitForTimeout(1200);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'forge_weapon',
      payload: { weaponType: 'greatsword', tierKey: 'wood', isWoodwork: false } });
  });
  await P.page.waitForTimeout(2200);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.rpg) S.rpg.activeSlot = 'melee';
    S._shieldUp = false;
  });

  const adm = await H.adminPlayer(wsPort, myId).catch(() => null);
  const setup = await H.readState(P, (S) => ({
    zone: S.currentZone, serverDriven: !!S._serverMonsters,
    monsters: (S.monsters || []).length,
  }));
  rec.ok('the bro is in a spoke zone the WORKER is driving (guard)',
    setup.serverDriven === true && setup.zone !== 'town', setup);
  rec.ok('the WORKER holds the sword, not just the browser (guard)',
    !!(adm && adm.rpg && adm.rpg.weapon), adm && adm.rpg ? { weapon: adm.rpg.weapon } : adm);
  if (!setup.serverDriven || !setup.monsters) {
    rec.skip('a tapped monster is attacked on arrival', 'no server monsters in this zone');
    await P.ctx.close().catch(() => {}); return;
  }

  /* ── THE REAL TAP, on the LEFT half ──
     lE forwards a bare click into the canvas and never touches autoAttack, so
     this is a pure lock -- exactly the gesture the owner describes and the one
     that cannot smuggle a held attack button in with it. */
  const target = await pickTarget(P);
  rec.ok('there is a live monster drawn on screen to tap (guard)', !!target, target);
  if (!target) { await P.ctx.close().catch(() => {}); return; }

  await P.page.evaluate(({ x, y }) => {
    const el = document.querySelector('[data-joyzone="L"]') || document.querySelector('canvas');
    window.__touch(el, 'touchstart', x, y, 7);
    window.__touch(el, 'touchend', x, y, 7);
  }, { x: target.cx, y: target.cy });
  await P.page.waitForTimeout(600);

  const locked = await snap(P, target.id);
  /* THE GUARD THAT MAKES THIS NON-VACUOUS. Every other scenario writes the
     lock by hand; if the real tap did not take, this run measures nothing and
     must say so rather than fall back to fabricating it. */
  rec.ok('the REAL tap locked that monster, and the lock says it came from a tap',
    !!(locked.lock && locked.lock.id === target.id && locked.lock.src === 'tap'),
    { locked, tappedAt: { x: target.cx, y: target.cy }, gap: target.gap });
  rec.ok('...and the tap left no finger on the attack control', locked.autoAttack === false, locked);
  if (!(locked.lock && locked.lock.src === 'tap')) {
    rec.skip('a tapped monster is attacked on arrival', 'the real tap did not lock');
    await P.ctx.close().catch(() => {}); return;
  }

  /* ── WALK IN, through the field the real joystick writes ── */
  await H.instrumentWire(P);
  await P.page.evaluate((mid) => {
    const S = window._gameState.current;
    window.__walk = setInterval(() => {
      const m = (S.monsters || []).find((x) => String(x.id) === mid);
      if (!m || !S.player) return;
      const dx = m.x - S.player.x, dy = m.y - S.player.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 40) { S.stickX = 0; S.stickY = 0; return; }
      S.stickX = dx / d; S.stickY = dy / d;
    }, 50);
  }, target.id);
  /* Polled from node rather than through H.waitFor: the predicate needs the
     target id, and a readState arrow is stringified into the PAGE where a
     node-scope binding is a ReferenceError. */
  for (let i = 0; i < 100; i++) {
    const g = await P.page.evaluate((mid) => {
      const S = window._gameState.current;
      const m = (S.monsters || []).find((x) => String(x.id) === mid);
      return (m && S.player) ? Math.hypot(m.x - S.player.x, m.y - S.player.y) : null;
    }, target.id);
    if (g == null || g < 60) break;
    await P.page.waitForTimeout(250);
  }
  await P.page.evaluate(() => { clearInterval(window.__walk); const S = window._gameState.current; S.stickX = 0; S.stickY = 0; });
  await P.page.waitForTimeout(300);

  const arrived = await snap(P, target.id);
  rec.ok('the bro really walked into melee reach (guard)',
    arrived.gap != null && arrived.gap < 90, arrived);
  /* ═══ THE ASSUMPTION THIS ASSERTION STARTED WITH WAS WRONG ═══
     It first read `arrived.lock.src === 'tap'`, and it failed -- on the same
     monster id, with src flipped to 'auto'. That is not a defect: 900ms after
     the tap, tapStealable lets anything 12% nearer take the lock (v2.3.2263,
     the owner's own "go by the nearest monster" ask), and over a 730px walk
     you pass something; the auto rule then re-points at your target when it is
     nearest again. So the LOCK is allowed to move and the src is allowed to
     change -- which is exactly why the fix keys off an engagement flag rather
     than off the lock's provenance. Gating the swing on src === 'tap' would
     have been a no-op in the very case being reported.
     What must survive the walk is the INTENT, and that is what is asserted. */
  rec.ok('...and the ENGAGEMENT survived the walk, even though the lock was '
    + 'stolen and re-acquired on the way',
    arrived.engaged === true,
    { engaged: arrived.engaged, lockSrcNow: arrived.lock && arrived.lock.src, arrived });
  rec.ok('...and the lock is back on the monster that was tapped',
    !!(arrived.lock && arrived.lock.id === target.id), arrived);
  rec.ok('...with still no finger on the attack control (guard)',
    arrived.autoAttack === false, arrived);

  /* ── STAND THERE. NO PRESS. Five swing cooldowns' worth. ──
     Counted as a DELTA from arrival, not cumulatively: the walk passes other
     monsters, and a swing landed on one of those on the way would satisfy a
     running total while the tapped monster was never touched. The first cut of
     this assertion did exactly that. */
  const wireAtArrival = (await H.wireCounts(P)).monster_damage || 0;
  const hpAtArrival = arrived.hp;
  await P.page.waitForTimeout(3000);
  const after = await snap(P, target.id);
  const wire = await H.wireCounts(P);
  const askedHere = (wire.monster_damage || 0) - wireAtArrival;
  rec.ok("THE OWNER'S REPORT: you tapped it, you walked all the way there, and "
    + 'the swing never starts', askedHere > 0,
    { askedAfterArrival: askedHere, cumulative: wire.monster_damage || 0,
      gapAtTap: target.gap, hpAtArrival, hpNow: after.hp, after });
  /* Corroboration, never the verdict: the client's mirror of the worker's hp. */
  rec.ok('...and the monster it was aimed at actually lost health',
    typeof hpAtArrival === 'number' && typeof after.hp === 'number' && after.hp < hpAtArrival,
    { hpAtArrival, hpNow: after.hp });

  /* ── POSITIVE CONTROL: the same monster, with the button really held.
        If this is empty too, the assertion above proves nothing. ── */
  const before = (wire.monster_damage || 0);   /* cumulative here is fine: the control only needs a RISE */
  const held = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-rjoy-base');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    window.__touch(el, 'touchstart', r.x + r.width / 2, r.y + r.height / 2, 9);
    return true;
  });
  await P.page.waitForTimeout(2500);
  const heldState = await snap(P, target.id);
  await P.page.evaluate(() => {
    const el = document.querySelector('.bt-rjoy-base');
    if (!el) return;
    const r = el.getBoundingClientRect();
    window.__touch(el, 'touchend', r.x + r.width / 2, r.y + r.height / 2, 9);
  });
  const wire2 = await H.wireCounts(P);
  /* ═══ THE CONTROL, AND WHEN IT HAS NOTHING LEFT TO PROVE ═══
     Its job is to show that a swing was POSSIBLE here, so that "no swing"
     above would have meant the gate rather than a broken fixture. Once the fix
     works, the engagement usually fights the monster to death inside the 3s
     wait -- and then there is nothing to hit and the control cannot rise. That
     is not a failure, it is the fix working, so it is reported as a skip with
     the reason rather than as red. On the UNFIXED build the monster is
     untouched and the control runs for real, which is the case it exists for. */
  const stillAlive = typeof heldState.hp === 'number' && heldState.hp > 0;
  rec.ok('CONTROL: the attack button really was held (guard)',
    held === true && heldState.autoAttack === true,
    { held, heldAutoAttack: heldState.autoAttack });
  if (stillAlive) {
    rec.ok('CONTROL: holding the attack button DOES swing, so the reading above '
      + 'is about the gate and not about the setup',
      (wire2.monster_damage || 0) > before,
      { before, after: wire2.monster_damage || 0, hp: heldState.hp });
  } else {
    rec.skip('CONTROL: holding the attack button DOES swing',
      'the tapped monster was already dead — the engagement had finished it, '
      + 'which is the outcome under test');
  }

  await P.ctx.close().catch(() => {});
}
