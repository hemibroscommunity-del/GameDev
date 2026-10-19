/* ═══ v2.3.3485: THE BOW'S LINE IS NOT ON A MONSTER BEHIND A ROCK ═══
 *
 * Found by mp-hitreal on the QA machine (its frost bow row), with a scratch
 * copy of the game that logged each arrow's own decisions.  You stood just
 * south of frost's snowbank, a snowman just north of it, 98 px off:
 *   - the bow's gate said "on the snowman": its hit circle (38.6 px) reaches
 *     right back to your bow, met at distance 0, before the bank's face 12 px
 *     up the ground line -- so the bow loosed;
 *   - the drawn arrow passed 4 px, then 0 px, from the snowman's centre;
 *   - the hit test refused it both frames: a hit also has to pass
 *     _rockBetween, no prop between the arrow's ground point and the
 *     monster's FEET (projectiles.js, v2.3.2701), and the bank stood between;
 *   - the arrow stuck in the bank's face, drawn at the snowman's feet, for no
 *     damage: the line said one thing, the arrow did another.
 * firstSightHit now asks the hit test's rock question before it counts a
 * target as on the line (TRAPS §236, docs/specs/bow-at-props.md "v2.3.3485").
 *
 * In frost, at that very bank, on a phone, with a real bow held the way the
 * right stick holds it and the game's own gate and arrows deciding:
 *   1. setup: in frost, a bow in hand, the bank in the zone's props;
 *   2. your boots 12 px south of the bank's face, a snowman 41 px north of it
 *      on the bow's line (where mp-hitreal's stood): the gate reads the BANK,
 *      not the snowman, and the drawn line stops at it;
 *   3. ...held, the arrows go into the bank and the snowman takes nothing;
 *   4. CONTROL: the same snowman on the near side of the bank, between you
 *      and it: the gate reads the SNOWMAN, and it takes the arrows;
 *   5. no page errors.
 * On the build before the gate, 2 fails: the gate reads the snowman.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const BANK = 'frost-snowbank-e';

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

/* Put your BOOTS at (x, y), and wait for the camera to come round to you (the
   bow's sight looks only as far as the screen's edge, monsterCombat
   _viewEdgeDist). */
const bootsAt = async (P, x, y, dy) => {
  await H.hopTo(P, x, y - dy, { tries: 80 });
  await P.page.waitForTimeout(600);
  for (let i = 0; i < 40; i++) {
    const off = await P.page.evaluate(() => {
      const S = window._gameState.current;
      if (!S.camera || !(S._viewW > 0) || !(S._viewH > 0)) return 0;
      return Math.hypot(S.camera.x + S._viewW / 2 - S.player.x, S.camera.y + S._viewH / 2 - S.player.y);
    });
    if (off < 60) break;
    await P.page.waitForTimeout(250);
  }
  return P.page.evaluate(() => { const S = window._gameState.current; return { x: S.player.x, y: S.player.y, boots: window.__btPlayerGround() }; });
};

/* Aim north, let the gate settle, put ONE snowman of this page's own (the
   worker's monsters set aside for the while, as mp-bowprops D and J do) with
   its feet at (the bow's line, feetY), read the gate and the drawn line, then
   HOLD the attack for `ms` and count. */
const atSnowman = (P, feetY, ms) => P.page.evaluate(({ feetY, ms }) => new Promise((resolve) => {
  const S = window._gameState.current, F = window._gameFns || {};
  window.__qaShots = 0;
  S.arrows = []; S.swingTimer = 0; S.lockedTarget = null; S.autoAttack = false;
  const ang = -Math.PI / 2;
  S._aimAngle = ang; S._aiming = true; S._lastAimAngle = ang;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const ox = S._bowSight && isFinite(S._bowSight.ox) ? S._bowSight.ox : S.player.x;
    const serverWas = S._serverMonsters;
    S._serverMonsters = false;
    const m = F.createMonster('qa-sr-snowman', 'snowman', 2, ox, feetY, null);
    m.alive = true; m.curHp = m.maxHp = 900000; m.spd = 0; m.vx = 0; m.vy = 0; m.renderX = m.x; m.renderY = m.y;
    const keep = S.monsters;
    S.monsters = [m];
    const t0 = performance.now();
    let gate = null, beam = null, stopAt = 0;
    S.autoAttack = true;
    const tick = () => {
      const t = performance.now() - t0;
      if (S.monsters.indexOf(m) < 0) S.monsters = [m];
      if (!gate && t > 250) {
        const g = S._bowSight;
        const b = window.__btSightBeam ? window.__btSightBeam() : null;
        gate = g ? { d: g.d == null ? null : Math.round(g.d * 10) / 10, id: g.id } : { none: true };
        beam = b ? { visible: b.visible, clipped: b.clipped, len: b.len == null ? null : Math.round(b.len * 10) / 10 } : null;
      }
      if (t >= ms && !stopAt) { S.autoAttack = false; S._aiming = false; stopAt = t; }
      const ends = (S.arrows || []).map((a) => (a.stuckIn ? 'stuck' : a.planted ? (a._inProp ? 'prop' : 'ground') : a.planting ? 'spent' : 'flying'));
      /* the attack let go, the last arrow lands before anything is read: on a
         page drawing a few frames a second it may have left this very frame */
      if (stopAt && (ends.indexOf('flying') < 0 || t - stopAt > 3000)) {
        const out = { gate, beam, mid: m.id, shots: window.__qaShots, monsterHits: m.maxHp - m.curHp, ends,
          gripX: Math.round(ox), feet: [Math.round(m.x), Math.round(m.y)] };
        S.monsters = keep || []; S._serverMonsters = serverWas;
        resolve(out);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
}), { feetY, ms });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Sightline', wsPort, webPort, viewport: PHONE, touch: true });
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
  /* every zone gate open (a new character is held in town until its first
     quests), then the game's own zone chip walks the real doors to frost --
     again once if a leg stalls, as mp-hitreal does */
  await H.devOp(wsPort, 'quests', id);
  const toFrost = async () => {
    await P.page.evaluate(() => { window._gameState.current._devWarp = { to: 'frost', legs: 0, t: Date.now(), nextAt: 0 }; });
    return H.waitFor(P, (S) => (S._zoneLoading ? null : S.currentZone), (z) => z === 'frost',
      { timeout: 70000, label: 'frost' }).then(() => true).catch(() => false);
  };
  const inFrost = (await toFrost()) || (await toFrost());
  /* the zone's own snowmen are real: you must outlive the test */
  if (inFrost) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 10 });
  await P.page.waitForTimeout(1500);
  const armed = await armBow(P);
  const bank = await P.page.evaluate((id) => {
    const b = (window.__btBlockers ? window.__btBlockers('frost') : []).find((x) => x && x.id === id);
    return b ? { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 } : null;
  }, BANK);
  const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
  const low = bank ? await P.page.evaluate((b) => window.__btShotFliesOver(b, null), { ...bank, id: BANK }) : null;
  rec.ok(`1. setup: in frost with a bow, the ${BANK} (${bank ? `${bank.x1 - bank.x0} x ${bank.y1 - bank.y0}` : '?'}) in its props, not a low thing`,
    inFrost && armed.wpn === 'bow' && !!bank && low === false && dy > 30, { inFrost, armed, bank, low, dy });
  if (!bank || !inFrost) { stopAlive = true; await P.ctx.close().catch(() => {}); return; }

  /* ── 2-3. behind the bank ── */
  const bx = Math.round(bank.x1 - 30);
  const at = await bootsAt(P, bx, bank.y1 + 12, dy);
  const behind = await atSnowman(P, bank.y0 - 41, 2200);
  console.log(`    behind the bank: ${JSON.stringify({ at, behind })}`);
  rec.ok(`2. a snowman just behind the bank, your boots 12 px off its face: the gate reads the BANK (${behind.gate && behind.gate.id}), not the snowman`,
    !!behind.gate && behind.gate.id === 'prop:' + BANK, behind);
  /* the line is never drawn shorter than 24 px (effectsRenderer's _beamLen),
     and the bank's face is 12 px off */
  rec.ok(`2. ...and the drawn line stops at the bank (${behind.beam && behind.beam.len} px, the gate's ${behind.gate && behind.gate.d}, never under 24)`,
    !!behind.beam && behind.beam.clipped === true && behind.gate.d != null && Math.abs(behind.beam.len - Math.max(24, behind.gate.d)) < 1, { beam: behind.beam, gate: behind.gate });
  rec.ok(`3. ...the arrows go into the bank (${behind.shots} fired: ${behind.ends.join(', ')}) and the snowman takes nothing (${behind.monsterHits})`,
    behind.shots >= 1 && behind.monsterHits === 0 && behind.ends.every((e) => e === 'prop'), behind);
  await P.page.waitForTimeout(800);   /* the last arrows land */

  /* ── 4. CONTROL: the snowman in front of the bank ── */
  await bootsAt(P, bx, bank.y1 + 200, dy);
  const front = await atSnowman(P, bank.y1 + 70, 2200);
  console.log(`    in front of the bank: ${JSON.stringify(front)}`);
  rec.ok(`4. CONTROL: the snowman between you and the bank: the gate reads the SNOWMAN (${front.gate && front.gate.id}), and it takes the arrows (${front.shots} fired, ${front.monsterHits} damage)`,
    !!front.gate && front.gate.id === front.mid && front.shots >= 1 && front.monsterHits > 0, front);

  rec.ok('5. no page errors', errors.length === 0, errors);
  stopAlive = true;
  await P.ctx.close().catch(() => {});
}
