/* ═══ v2.3.3501: AN AIMED SHOT IS JUDGED FROM YOUR FEET TO ITS TARGET'S ═══
 *
 * A shot asks the ground under it about props.  That ground line ran PARALLEL
 * to the drawn shot, from your boots, so aimed at a monster's body it ended
 * short of the monster's feet and off to one side -- and could meet a rock the
 * monster was not behind.  mp-hitreal's frost magic row: a snowman just past
 * the east end of frost's rock ridge, on your side of it, your boots on the
 * ridge's edge line, and every bolt burst on the ridge's end.  Now a shot
 * fired at a target asks from your boots to its feet (src/game/shotGround.js).
 * The owner, offered it: "Go recommended".
 *
 * In frost, at that ridge, on a phone, the game's own casts and arrows
 * deciding (a snowman of the page's own, the worker's set aside, as
 * mp-bowprops does):
 *   1. setup: in frost, the ridge in the zone's props, not a low thing;
 *   2. THE RIDGE'S END: your boots on its top edge line, 55 px past its east
 *      end; a snowman 62 px inside that end, 22 px north of the ridge -- the
 *      staff's bolts reach it (on the build before, they burst on the ridge);
 *   3. ...and the bow's arrows;
 *   4. CONTROL: a snowman BEHIND the ridge, your boots and its feet either side
 *      of it: the bolts do not reach it, and the bow's sight reads the ridge;
 *   5. no page errors.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const RIDGE = 'frost-rock-ridge';

/* A bow or a staff in hand, the attack let go, every shot the game fires
   counted (its broadcast: one a shot). */
const arm = (P, slot) => P.page.evaluate((slot) => {
  const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
  const t = ((F.WOODWORKING_TIERS || {}).pine) || { tierMult: 1 };
  if (slot === 'staff') {
    R.staffWeapon = { type: 'staff', tierMult: t.tierMult, gearBase: 'pine', name: 'Pine Staff', tier: 'common' };
    R.mana = R.maxMana = 500;
  } else {
    R.rangedWeapon = { type: 'bow', tierMult: t.tierMult, gearBase: 'pine', name: 'Pine Bow', tier: 'common' };
  }
  R.activeSlot = slot;
  S.lockedTarget = null;
  S.autoAttack = false;
  window.__qaShots = 0;
  const ch = S.channel;
  if (ch && !ch.__qaCounted) {
    const send = ch.send.bind(ch);
    ch.send = (m) => { try { if (m && m.event === 'player_projectile') window.__qaShots++; } catch (e) { /* counting only */ } return send(m); };
    ch.__qaCounted = true;
  }
  return { slot: R.activeSlot };
}, slot);

/* Put your BOOTS at (x, y), then wait for the camera to stop moving. */
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

/* ONE snowman of the page's own with its FEET at (fx, fy); aim at its body
   from where the shot leaves (the bow's grip, or you for the staff), read the
   bow's sight, HOLD the attack for `ms`, count, and let the last shot land. */
const atSnowman = (P, fx, fy, ms) => P.page.evaluate(({ fx, fy, ms }) => new Promise((resolve) => {
  const S = window._gameState.current, F = window._gameFns || {};
  window.__qaShots = 0;
  S.arrows = []; S.swingTimer = 0; S.lockedTarget = null; S.autoAttack = false;
  const serverWas = S._serverMonsters;
  S._serverMonsters = false;
  const m = F.createMonster('qa-gl-snowman', 'snowman', 2, fx, fy, null);
  m.alive = true; m.curHp = m.maxHp = 900000; m.spd = 0; m.vx = 0; m.vy = 0; m.renderX = m.x; m.renderY = m.y;
  const keep = S.monsters;
  S.monsters = [m];
  const lift = (F.monsterBodyOffsetY && F.monsterBodyOffsetY('snowman')) || 0;
  const bow = S.rpg.activeSlot === 'ranged';
  const aimNow = () => {
    const sight = bow ? S._bowSight : null;
    const ox = sight && isFinite(sight.ox) ? sight.ox : S.player.x, oy = sight && isFinite(sight.oy) ? sight.oy : S.player.y;
    const ang = Math.atan2((fy - lift) - oy, fx - ox);
    S._aimAngle = ang; S._aiming = true; S._lastAimAngle = ang;
  };
  aimNow();
  const t0 = performance.now();
  let gate = null, stopAt = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    aimNow();
    S.autoAttack = true;
    const tick = () => {
      const tt = performance.now() - t0;
      if (S.monsters.indexOf(m) < 0) S.monsters = [m];
      if (!stopAt) aimNow();
      if (!gate && tt > 300 && bow) {
        const g = S._bowSight;
        gate = g ? { d: g.d == null ? null : Math.round(g.d * 10) / 10, id: g.id } : { none: true };
      }
      if (tt >= ms && !stopAt) { S.autoAttack = false; S._aiming = false; stopAt = tt; }
      const flying = (S.arrows || []).some((a) => a && !a.stuckIn && !a.planted && !a.planting);
      if (stopAt && (!flying || tt - stopAt > 4000)) {
        const out = { gate, mid: m.id, shots: window.__qaShots, monsterHits: m.maxHp - m.curHp,
          you: [Math.round(S.player.x), Math.round(S.player.y)], feet: [fx, fy] };
        S.monsters = keep || []; S._serverMonsters = serverWas;
        resolve(out);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
}), { fx, fy, ms });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Groundline', wsPort, webPort, viewport: PHONE, touch: true });
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
  /* every zone gate open, then the game's own zone chip to frost -- again
     once if a leg stalls, as mp-hitreal does */
  await H.devOp(wsPort, 'quests', id);
  const toFrost = async () => {
    await P.page.evaluate(() => { window._gameState.current._devWarp = { to: 'frost', legs: 0, t: Date.now(), nextAt: 0 }; });
    return H.waitFor(P, (S) => (S._zoneLoading ? null : S.currentZone), (z) => z === 'frost',
      { timeout: 70000, label: 'frost' }).then(() => true).catch(() => false);
  };
  const inFrost = (await toFrost()) || (await toFrost());
  if (inFrost) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 10 });
  await P.page.waitForTimeout(1500);
  const ridge = await P.page.evaluate((rid) => {
    const b = (window.__btBlockers ? window.__btBlockers('frost') : []).find((x) => x && x.id === rid);
    return b ? { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 } : null;
  }, RIDGE);
  const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
  const low = ridge ? await P.page.evaluate((b) => window.__btShotFliesOver(b, null), { ...ridge, id: RIDGE }) : null;
  rec.ok(`1. setup: in frost, the ${RIDGE} (${ridge ? `${ridge.x1 - ridge.x0} x ${ridge.y1 - ridge.y0}` : '?'}) in its props, not a low thing`,
    inFrost && !!ridge && low === false && dy > 30, { inFrost, ridge, low, dy });
  if (!ridge || !inFrost) { stopAlive = true; await P.ctx.close().catch(() => {}); return; }

  /* ── 2-3. just past the ridge's end, on your side ── */
  const bootsX = ridge.x1 + 55, bootsY = ridge.y0;
  const fx = ridge.x1 - 62, fy = ridge.y0 - 22;
  await arm(P, 'staff');
  const at = await bootsAt(P, bootsX, bootsY, dy);
  const staff = await atSnowman(P, fx, fy, 3600);
  console.log(`    the ridge's end, staff: ${JSON.stringify({ at, staff })}`);
  rec.ok(`2. the ridge's end: your boots ${bootsX - ridge.x1} px past it on its edge line, a snowman ${ridge.x1 - fx} px inside it and ${ridge.y0 - fy} px north -- the staff's bolts reach it (${staff.shots} cast, ${staff.monsterHits} damage)`,
    staff.shots >= 1 && staff.monsterHits > 0, staff);
  await P.page.waitForTimeout(600);
  await arm(P, 'ranged');
  await bootsAt(P, bootsX, bootsY, dy);
  const bow = await atSnowman(P, fx, fy, 2600);
  console.log(`    the ridge's end, bow: ${JSON.stringify(bow)}`);
  rec.ok(`3. ...and the bow's arrows (the sight on ${bow.gate && bow.gate.id}; ${bow.shots} fired, ${bow.monsterHits} damage)`,
    !!bow.gate && bow.gate.id === bow.mid && bow.shots >= 1 && bow.monsterHits > 0, bow);
  await P.page.waitForTimeout(600);

  /* ── 4. CONTROL: behind the ridge ── */
  const cx = Math.round((ridge.x0 + ridge.x1) / 2);
  await arm(P, 'staff');
  await bootsAt(P, cx, ridge.y0 - 40, dy);
  const hidS = await atSnowman(P, cx, ridge.y1 + 50, 3000);
  await P.page.waitForTimeout(600);
  await arm(P, 'ranged');
  await bootsAt(P, cx, ridge.y0 - 40, dy);
  const hidB = await atSnowman(P, cx, ridge.y1 + 50, 2200);
  console.log(`    behind the ridge: ${JSON.stringify({ staff: hidS, bow: hidB })}`);
  rec.ok(`4. CONTROL: a snowman behind the ridge -- the bolts do not reach it (${hidS.shots} cast, ${hidS.monsterHits} damage), and the bow's sight reads the ridge (${hidB.gate && hidB.gate.id}, ${hidB.monsterHits} damage)`,
    hidS.shots >= 1 && hidS.monsterHits === 0 && !!hidB.gate && hidB.gate.id === 'prop:' + RIDGE && hidB.monsterHits === 0, { hidS, hidB });

  rec.ok('5. no page errors', errors.length === 0, errors);
  stopAlive = true;
  await P.ctx.close().catch(() => {});
}
