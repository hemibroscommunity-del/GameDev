/* ═══ v2.3.3489: AN ARROW COMES DOWN WHERE THE AIMING LINE SAYS ═══
 *
 * An arrow comes down short of the screen's edge (v2.3.1095).  The arrow, the
 * bow's fire gate and the aiming line each had their own idea of where:
 *   - the ARROW came down the frame its point was within 24 px of ANY edge,
 *     whichever way it flew -- so a bow held by the screen's edge (where the
 *     camera stops at the world's edge) dropped every arrow at once, even at a
 *     monster right in front of you: mp-hitreal's frost bow row, a snowman by
 *     the map's east edge;
 *   - the GATE counted a monster out to the bow's 675 px range, so one off the
 *     screen to your side opened it, and every arrow came down at the edge,
 *     short of it;
 *   - the LINE was drawn to the range, off the screen.
 * Now one rule (src/game/arrowEdge.js): 24 px of flight short of the edge the
 * arrow flies TOWARD, read by all three.  The owner, offered "end the aiming
 * line where the arrow comes down, and let an arrow flying along the edge keep
 * going": "Go recommended".
 *
 * In frost (whose 1024 px map the camera stops at), on a phone, with a real bow
 * held the way the right stick holds it and the game's own gate and arrows
 * deciding:
 *   1. setup: in frost, a bow in hand;
 *   2. BY THE MAP'S EAST EDGE, the bow inside the band the old rule dropped
 *      arrows in, a snowman 150 px south along the edge: the gate reads it, the
 *      bow fires, and the snowman takes the arrows;
 *   3. A SNOWMAN OFF THE SCREEN to your east, inside the bow's range, on the
 *      line: the gate does not read it, the bow does not fire, and the empty
 *      line is drawn to where an arrow comes down -- not the range;
 *   4. CONTROL: the snowman on the screen, 150 px east: the gate reads it and it takes
 *      the arrows;
 *   5. no page errors.
 * On the build before the rule, 2 and 3 fail.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* A bow in hand, the attack let go, every shot the game fires counted (its
   broadcast to the other players: one a shot). */
const armBow = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
  const t = ((F.WOODWORKING_TIERS || {}).pine) || { tierMult: 1 };
  R.rangedWeapon = { type: 'bow', tierMult: t.tierMult, gearBase: 'pine', name: 'Pine Bow', tier: 'common' };
  R.activeSlot = 'ranged';
  S.lockedTarget = null;
  S.autoAttack = false;
  window.__qaShots = 0;
  const ch = S.channel;
  if (ch && !ch.__qaCounted) {
    const send = ch.send.bind(ch);
    ch.send = (m) => { try { if (m && m.event === 'player_projectile') window.__qaShots++; } catch (e) { /* counting only */ } return send(m); };
    ch.__qaCounted = true;
  }
  return { slot: R.activeSlot, wpn: R.rangedWeapon.type };
});

/* Where your boots can stand at `x` with the ground clear for `len` px along
   heading (dx, dy): the first such y from `y0`, by the game's own prop sweep. */
const clearSpot = (P, x, y0, dx, dy, len) => P.page.evaluate(({ x, y0, dx, dy, len }) => {
  const S = window._gameState.current, z = S.currentZone;
  const boxes = (window.__btBlockers ? window.__btBlockers(z) : []) || [];
  const near = (px, py, m) => boxes.some((b) => b && px >= b.x0 - m && px <= b.x1 + m && py >= b.y0 - m && py <= b.y1 + m);
  for (let y = y0; y < 980; y += 8) {
    if (near(x, y, 40)) continue;
    let ok = true;
    for (const side of [-30, 0, 30]) {   /* the bow's grip is beside you: clear a lane, not a line */
      const sx = x - dy * side, sy = y + dx * side;
      if (window.__btSweepBlockPoint(z, sx, sy, sx + dx * len, sy + dy * len)) { ok = false; break; }
    }
    if (ok) return { x, y };
  }
  return null;
}, { x, y0, dx, dy, len });

/* Put your BOOTS at (x, y), then wait for the camera to stop moving (at the
   map's edge it stops short of you, and never centres). */
const bootsAt = async (P, x, y, dy) => {
  await H.hopTo(P, x, y - dy, { tries: 80 });
  let last = null, still = 0;
  for (let i = 0; i < 40 && still < 3; i++) {
    await P.page.waitForTimeout(250);
    const c = await P.page.evaluate(() => { const S = window._gameState.current; return S.camera ? [S.camera.x, S.camera.y] : null; });
    still = (c && last && Math.hypot(c[0] - last[0], c[1] - last[1]) < 0.5) ? still + 1 : 0;
    last = c;
  }
  return P.page.evaluate(() => { const S = window._gameState.current; return { x: S.player.x, y: S.player.y, boots: window.__btPlayerGround() }; });
};

/* Aim from the bow's grip at (dx, dy) off it, put ONE snowman of this page's
   own (the worker's monsters set aside for the while, as mp-bowprops D and J
   do) with its BODY there, read the gate, the drawn line and where an arrow on
   that heading comes down by the rule written out again here; then HOLD the
   attack for `ms` and count; then let the last arrow land. */
const atSnowman = (P, dx, dy, ms) => P.page.evaluate(({ dx, dy, ms }) => new Promise((resolve) => {
  const S = window._gameState.current, F = window._gameFns || {};
  window.__qaShots = 0;
  S.arrows = []; S.swingTimer = 0; S.lockedTarget = null; S.autoAttack = false;
  const ang = Math.atan2(dy, dx);
  S._aimAngle = ang; S._aiming = true; S._lastAimAngle = ang;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const sight = S._bowSight || {};
    const gx = isFinite(sight.ox) ? sight.ox : S.player.x, gy = isFinite(sight.oy) ? sight.oy : S.player.y;
    const lift = (F.monsterBodyOffsetY && F.monsterBodyOffsetY('snowman')) || 0;
    const serverWas = S._serverMonsters;
    S._serverMonsters = false;
    const m = F.createMonster('qa-be-snowman', 'snowman', 2, gx + dx, gy + dy + lift, null);
    m.alive = true; m.curHp = m.maxHp = 900000; m.spd = 0; m.vx = 0; m.vy = 0; m.renderX = m.x; m.renderY = m.y;
    const keep = S.monsters;
    S.monsters = [m];
    /* the rule, written out again: 24 px of flight short of the screen edge
       the arrow flies toward */
    const cam = S.camera, W = S._viewW, Hh = S._viewH;
    const c = Math.cos(ang), s = Math.sin(ang);
    let t = Infinity;
    if (c > 1e-9) t = Math.min(t, (cam.x + W - gx) / c); else if (c < -1e-9) t = Math.min(t, (cam.x - gx) / c);
    if (s > 1e-9) t = Math.min(t, (cam.y + Hh - gy) / s); else if (s < -1e-9) t = Math.min(t, (cam.y - gy) / s);
    const room = Math.max(0, t - 24);
    const view = { x0: cam.x, x1: cam.x + W, y0: cam.y, y1: cam.y + Hh };
    const oldBand = gx < view.x0 + 24 || gx > view.x1 - 24 || gy < view.y0 + 24 || gy > view.y1 - 24;
    const t0 = performance.now();
    let gate = null, beam = null, stopAt = 0;
    S.autoAttack = true;
    const tick = () => {
      const tt = performance.now() - t0;
      if (S.monsters.indexOf(m) < 0) S.monsters = [m];
      if (!gate && tt > 250) {
        const g = S._bowSight;
        const b = window.__btSightBeam ? window.__btSightBeam() : null;
        gate = g ? { d: g.d == null ? null : Math.round(g.d * 10) / 10, id: g.id, reach: g.reach == null ? null : Math.round(g.reach * 10) / 10 } : { none: true };
        beam = b ? { visible: b.visible, clipped: b.clipped, len: b.len == null ? null : Math.round(b.len * 10) / 10, fullLen: b.fullLen } : null;
      }
      if (tt >= ms && !stopAt) { S.autoAttack = false; S._aiming = false; stopAt = tt; }
      const ends = (S.arrows || []).map((a) => (a.stuckIn ? 'stuck' : a.planted ? (a._inProp ? 'prop' : 'ground') : a.planting ? 'spent' : 'flying'));
      if (stopAt && (ends.indexOf('flying') < 0 || tt - stopAt > 3000)) {
        const out = { gate, beam, mid: m.id, shots: window.__qaShots, monsterHits: m.maxHp - m.curHp, ends,
          grip: [Math.round(gx), Math.round(gy)], body: [Math.round(gx + dx), Math.round(gy + dy)],
          view: { x0: Math.round(view.x0), x1: Math.round(view.x1), y0: Math.round(view.y0), y1: Math.round(view.y1) },
          room: Math.round(room * 10) / 10, oldBand };
        S.monsters = keep || []; S._serverMonsters = serverWas;
        resolve(out);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
}), { dx, dy, ms });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Edgeline', wsPort, webPort, viewport: PHONE, touch: true });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const id = await H.readState(P, (S) => S.myId);
  /* a real key now and then: the page logs itself out after two minutes with
     no input (mp-hitreal's note), and nothing here is a real touch */
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  /* every zone gate open, then the game's own zone chip walks the real doors
     to frost -- again once if a leg stalls, as mp-hitreal does */
  await H.devOp(wsPort, 'quests', id);
  const toFrost = async () => {
    await P.page.evaluate(() => { window._gameState.current._devWarp = { to: 'frost', legs: 0, t: Date.now(), nextAt: 0 }; });
    return H.waitFor(P, (S) => (S._zoneLoading ? null : S.currentZone), (z) => z === 'frost',
      { timeout: 70000, label: 'frost' }).then(() => true).catch(() => false);
  };
  const inFrost = (await toFrost()) || (await toFrost());
  if (inFrost) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 10 });
  await P.page.waitForTimeout(1500);
  const armed = await armBow(P);
  const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
  const mapW = await P.page.evaluate(() => { const S = window._gameState.current, F = window._gameFns || {}; const z = (F.ZONES || {})[S.currentZone]; return z && z.w ? z.w * 32 : 1024; });
  rec.ok('1. setup: in frost with a bow', inFrost && armed.wpn === 'bow' && dy > 30, { inFrost, armed, dy, mapW });
  if (!inFrost) { stopAlive = true; await P.ctx.close().catch(() => {}); return; }

  /* ── 2. by the map's east edge ── */
  const edgeX = mapW - 12;
  const spotE = await clearSpot(P, edgeX, 160, 0, 1, 260);
  if (spotE) {
    const at = await bootsAt(P, spotE.x, spotE.y, dy);
    const edge = await atSnowman(P, 0, 150, 2400);
    console.log(`    by the east edge: ${JSON.stringify({ spotE, at, edge })}`);
    rec.ok(`2. by the map's east edge (your bow ${edge.view.x1 - edge.grip[0]} px from the screen's edge, inside the band the old rule dropped arrows in) (guard)`,
      edge.oldBand === true, edge);
    rec.ok(`2. ...a snowman 150 px south along the edge: the gate reads it (${edge.gate && edge.gate.id})`,
      !!edge.gate && edge.gate.id === edge.mid, edge.gate);
    rec.ok(`2. ...and it takes the arrows (${edge.shots} fired, ${edge.monsterHits} damage) -- they no longer come down at your feet`,
      edge.shots >= 1 && edge.monsterHits > 0, edge);
  } else {
    rec.ok('2. a clear spot by the map\'s east edge (guard)', false, { edgeX });
  }
  await P.page.waitForTimeout(800);

  /* ── 3-4. off the screen, and on it ── */
  const spotM = await clearSpot(P, 420, 200, 1, 0, 560);
  if (spotM) {
    await bootsAt(P, spotM.x, spotM.y, dy);
    const off = await atSnowman(P, 470, 0, 1800);
    console.log(`    off the screen: ${JSON.stringify(off)}`);
    const offScreen = off.body[0] - 40 > off.view.x1;
    rec.ok(`3. a snowman 470 px east, off the screen (its body from x ${off.body[0] - 40}, the screen to ${off.view.x1}) and inside the bow's 675 px range (guard)`,
      offScreen, off);
    rec.ok(`3. ...the gate does not read it (${off.gate && off.gate.id}) and the bow does not fire (${off.shots} shots)`,
      !!off.gate && off.gate.id !== off.mid && off.shots === 0, { gate: off.gate, shots: off.shots });
    rec.ok(`3. ...the empty line ends where an arrow comes down (${off.beam && off.beam.len} px, the rule's ${off.room}), not at the bow's range`,
      !!off.beam && off.beam.clipped === false && off.room < 600 && Math.abs(off.beam.len - off.room) < 1, { beam: off.beam, room: off.room });
    await P.page.waitForTimeout(600);
    const on = await atSnowman(P, 150, 0, 2200);
    console.log(`    on the screen: ${JSON.stringify(on)}`);
    rec.ok(`4. CONTROL: the snowman 150 px east, on the screen: the gate reads it (${on.gate && on.gate.id}) and it takes the arrows (${on.shots} fired, ${on.monsterHits} damage)`,
      !!on.gate && on.gate.id === on.mid && on.shots >= 1 && on.monsterHits > 0, on);
  } else {
    rec.ok('3. a clear spot in the middle of frost (guard)', false, {});
  }

  rec.ok('5. no page errors', errors.length === 0, errors);
  stopAlive = true;
  await P.ctx.close().catch(() => {});
}
