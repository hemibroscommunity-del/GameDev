/* DO SNOWMEN ATTACK?  (v2.3.2419)
 *
 * Owner: "Also snowman monsters aren't attacking."
 *
 * The snowman has THREE ways to hurt you and they occupy different distance
 * bands, so "isn't attacking" could be any one of them missing:
 *
 *   <= 70px   melee swing        (_atkRange is 70 for this arch, not ATTACK_RANGE)
 *   100-300px snowball           (MONSTER_RANGED_BY_ARCH.snowman minRange/range)
 *   any       the snow pile      (burrow, at or under BURROW.HP_FRAC health)
 *
 * ═══ THE ANSWER, MEASURED ═══
 * They attack, hard, in all three bands.  Against a worker built from this
 * repo's own server/ a starting character is killed in about fifteen seconds
 * at any of 55, 85 or 200 px:
 *
 *   85px   103 -> 43   in 14s
 *   200px   89 ->  0   in 13s (dead)
 *   55px    89 ->  0   in 12s (dead)
 *
 * So "snowman monsters aren't attacking" DOES NOT REPRODUCE against this
 * server code, and nothing in the liveops rail can turn monster attacks off
 * (the only kill switches are disable_jackpot / weapon_drops / dungeons /
 * threats / event_capes -- none of them touch the monster tick).
 *
 * ═══ A PREDICTION THIS FILE MADE AND THEN REFUTED ═══
 * The two range constants leave a gap: melee reach 70, snowball minRange 100.
 * That looked like the report -- 70-100px is exactly where you stand when you
 * walk up to fight one -- so the 85px round was written to confirm it.  It
 * did not: 60 hp came off in 14 seconds there.  Frost spawns SIX snowmen and
 * the round holds its distance from ONE, so the others close and swing; the
 * band is only "dead" for a single snowman in an empty zone, which is not a
 * situation the game produces.  The prediction is left here because it is the
 * kind of arithmetic that reads as an answer and is not one.
 *
 * What this file therefore pins is the FLOOR: a bro standing in the frost
 * zone loses health. If that ever stops being true, this goes red.
 */
import * as H from './harness.mjs';

const TILE = 32;

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

/* Park the bro at `gap` px from the snowman and watch for `ms`.
   THE DIRECTION IS NOT ARBITRARY, and the first cut of this file got it
   wrong: placing him at monster + (an angle) * gap put him outside the frost
   map, which fires the zone exit -- so the round spent 14 seconds in TOWN,
   measured no damage, and would have reported a passive snowman.  He is
   placed on the segment from the monster TOWARD the map centre instead, and
   clamped well inside the edges, so the spot is always in-bounds.

   Position is re-asserted every 400ms: the snowman's whole identity is that
   he closes, and a band test that lets him close is measuring another band. */
async function watchBand(P, gap, ms, wsPort, myId) {
  const t0 = Date.now();
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    window.__snowHp0 = S.rpg ? S.rpg.hp : null;
  });
  let hits = 0, leftZone = false, minHp = null; const timeline = [];
  /* The worker-gap guard is sampled EARLY and while he is still alive.
     Reading it at the end is worthless: at every distance tested a starting
     character is dead inside 15s, and a corpse respawns in town -- so the
     end-of-band sample reports a bro standing in the town square and the
     guard fails on the very rounds that worked. */
  let mid = null, tick = 0;
  while (Date.now() - t0 < ms) {
    const r = await P.page.evaluate(({ g }) => {
      const S = window._gameState.current;
      if (S.currentZone !== 'frost') return { lost: true, zone: S.currentZone };
      const m = window.__snowMon && (S.monsters || []).find((x) => String(x.id) === window.__snowMon);
      if (!m) return { lost: true, zone: S.currentZone };
      const W = S.zoneW || 1024, H = S.zoneH || 1024;
      let vx = (W / 2) - m.x, vy = (H / 2) - m.y;
      const vd = Math.hypot(vx, vy) || 1;
      vx /= vd; vy /= vd;
      const pad = 96;
      S.player.x = Math.max(pad, Math.min(W - pad, m.x + vx * g));
      S.player.y = Math.max(pad, Math.min(H - pad, m.y + vy * g));
      return { hp: S.rpg ? S.rpg.hp : null, dead: !!(S.rpg && S.rpg.dead) || !!S._dead || !!S.playerDying,
        gap: Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)),
        projectiles: (S.monsterProjectiles || S.mProjectiles || []).length };
    }, { g: gap }).catch(() => ({ lost: true }));
    if (r && r.lost) { leftZone = true; timeline.push('ZONE=' + (r.zone || '?')); }
    else if (r) {
      timeline.push(r.hp + (r.dead ? 'D' : '') + '@' + r.gap + (r.projectiles ? '+p' + r.projectiles : ''));
      /* LOW-WATER, not the final reading.  A bro who dies respawns at FULL hp
         in town, so end-hp compared against start-hp reports "no damage" for
         the band that hurt him most.  The first cut of this file did exactly
         that and called the melee band harmless. */
      if (typeof r.hp === 'number' && (minHp == null || r.hp < minHp)) minHp = r.hp;
    }
    if (r && !r.lost && r.projectiles > 0) hits++;
    if (++tick === 6 && r && !r.lost) {
      const _sp = await H.serverPlayer(wsPort, myId).catch(() => null);
      const _s = (_sp && (_sp.player || _sp)) || null;
      const here = await P.page.evaluate(() => {
        const S = window._gameState.current;
        const m = window.__snowMon && (S.monsters || []).find((x) => String(x.id) === window.__snowMon);
        return m ? { mx: m.x, my: m.y } : null;
      }).catch(() => null);
      if (_s && here && typeof _s.x === 'number') {
        mid = { srvX: Math.round(_s.x), srvY: Math.round(_s.y),
          srvZone: _s.z || _s.zone || null, hp: r.hp,
          srvGap: Math.round(Math.hypot(here.mx - _s.x, here.my - _s.y)) };
      }
    }
    await P.page.waitForTimeout(400);
  }
  const end = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const m = window.__snowMon && (S.monsters || []).find((x) => String(x.id) === window.__snowMon);
    return { hp0: window.__snowHp0, hp: S.rpg ? S.rpg.hp : null, zone: S.currentZone,
      cx: S.player ? Math.round(S.player.x) : null, cy: S.player ? Math.round(S.player.y) : null,
      mx: m ? Math.round(m.x) : null, my: m ? Math.round(m.y) : null,
      clientGap: m && S.player ? Math.round(Math.hypot(m.x - S.player.x, m.y - S.player.y)) : null };
  });
  /* ═══ THE GAP THE *WORKER* SEES ═══
     The bro is parked by writing S.player.x/y, and a client teleport is not a
     move the worker has to accept: position reaches it through a throttled
     move message and an anticheat that can reject a jump.  Every aggro and
     range decision is made against the WORKER's copy, so a band test that
     reports only the client's gap is measuring a number nothing in combat
     reads. */
  const sp = await H.serverPlayer(wsPort, myId).catch(() => null);
  const srv = (sp && (sp.player || sp)) || null;
  const sx = srv && typeof srv.x === 'number' ? Math.round(srv.x) : null;
  const sy = srv && typeof srv.y === 'number' ? Math.round(srv.y) : null;
  const srvZone = srv ? (srv.z || srv.zone || null) : null;
  return { ...end, minHp, mid, projTicks: hits, leftZone, timeline: timeline.join(' '), srvX: sx, srvY: sy, srvZone,
    srvGap: (sx != null && end.mx != null)
      ? Math.round(Math.hypot(end.mx - sx, end.my - sy)) : null,
    clientToServer: (sx != null && end.cx != null)
      ? Math.round(Math.hypot(end.cx - sx, end.cy - sy)) : null };
}

/* One band, one FRESH bro.  They cannot share a player: at 200px a snowman
   kills a starting character in about 13 seconds, and a corpse respawns in
   town -- so band two of a shared run measures an empty town and reports a
   passive snowman.  A new browser context per band is how every other
   scenario in this harness gets isolation, and it is what makes "he took no
   damage at 85px" mean something. */
async function bandRun({ browser, wsPort, webPort }, gap, ms) {
  const P = await H.newPlayer(browser, { name: 'Frost' + gap, wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
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
      frost: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'frost') || null,
    };
  });
  if (!marks.townOut || !marks.frost) { await P.ctx.close().catch(() => {}); return { noExit: true }; }

  for (let i = 0; i < 6; i++) {
    if (await H.readState(P, (S) => S.currentZone) === 'worldview') break;
    await stand(P, marks.townOut.tx * TILE + 16, marks.townOut.ty * TILE + 16);
    await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
      { timeout: 8000, label: 'World View' }).catch(() => {});
  }
  await P.page.waitForTimeout(800);
  for (let i = 0; i < 6; i++) {
    if (await H.readState(P, (S) => S.currentZone) === 'frost') break;
    await stand(P, marks.frost.tx * TILE + 16, marks.frost.ty * TILE + 16);
    await H.waitFor(P, (S) => S.currentZone, (z) => z === 'frost',
      { timeout: 8000, label: 'the frost zone' }).catch(() => {});
  }
  await P.page.waitForTimeout(2500);

  const setup = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const snow = (S.monsters || []).filter((m) => m && m.alive !== false
      && (m.arch === 'snowman' || /snow/i.test(String(m.variant || m.name || ''))));
    if (snow.length) window.__snowMon = String(snow[0].id);
    return { zone: S.currentZone, serverDriven: !!S._serverMonsters,
      snowmen: snow.length, arch: snow[0] && snow[0].arch,
      hp: S.rpg && S.rpg.hp, maxHp: S.rpg && S.rpg.maxHp,
      mHpFrac: snow[0] && snow[0].maxHp ? +(snow[0].curHp / snow[0].maxHp).toFixed(2) : null };
  });
  if (setup.zone !== 'frost' || !setup.snowmen) {
    await P.ctx.close().catch(() => {});
    return { unreached: true, ...setup };
  }
  const myId = await H.readState(P, (S) => S.myId);
  const r = await watchBand(P, gap, ms, wsPort, myId);
  await P.ctx.close().catch(() => {});
  return { ...setup, ...r, gap };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const ctx = { browser, wsPort, webPort };
  const BANDS = [
    { gap: 85,  what: 'the 70-100 gap between his melee reach and his snowball minRange' },
    { gap: 200, what: 'the snowball band' },
    { gap: 55,  what: 'inside melee reach' },
  ];

  for (const b of BANDS) {
    const r = await bandRun(ctx, b.gap, 14000);
    console.log('    ' + b.gap + 'px (' + b.what + '): ' + JSON.stringify(r));
    if (r.noExit || r.unreached) {
      rec.skip('a snowman attacks at ' + b.gap + 'px', 'never reached the frost zone');
      continue;
    }
    rec.ok(b.gap + 'px: the bro stood in frost beside a worker-driven snowman (guard)',
      r.serverDriven === true && r.snowmen > 0, r);
    /* The WORKER's gap, not the client's.  He is parked by writing
       S.player.x/y, and every aggro and range decision is made against the
       worker's copy -- so without this the round could be measuring a bro the
       worker still thinks is at the zone entrance. */
    rec.ok(b.gap + 'px: ...and the WORKER agrees that is where he stood (guard, sampled alive at ~2.4s)',
      !!r.mid && r.mid.srvZone === 'frost' && Math.abs(r.mid.srvGap - b.gap) <= 30, r.mid || r);
    rec.ok(b.gap + 'px: a snowman zone HURTS HIM within 14s -- ' + b.what,
      r.minHp != null && r.hp0 != null && r.minHp < r.hp0, r);
  }
}
