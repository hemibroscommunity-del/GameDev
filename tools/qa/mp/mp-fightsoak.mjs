/* SOAK, FIGHTING REAL MONSTERS (v2.3.2124)
 *
 * Owner, pressing on the unexplained slowdown: "if the soak came back with no
 * issues then what caused the slowdown? It certainly happened a few times over
 * the course of the quest line and fighting monsters" -- and, decisively, "It
 * was smooth after I logged out and back in and I did that several times."
 *
 * A reload clearing it, repeatably, puts the accumulation in the PAGE.  So the
 * question is what the existing soaks do not touch, and the answer is
 * embarrassing but useful:
 *
 *   - mp-soak fights, but it fights LOCAL monsters.  It sets
 *     `S._serverMonsters = false` on purpose and injects its own 1-HP fodder,
 *     so the whole server-monster path -- per-entity tick deltas, the display
 *     pool keyed by worker-assigned ids, server loot piles, server XP and
 *     level-ups -- never runs.  That is the path the demo was on.
 *   - mp-crowdsoak has peers and zone changes, and does no combat at all.
 *
 * So neither of them has ever driven the thing the owner was doing.  This one
 * stands in a real spoke zone with the worker spawning, moving and dying its
 * own monsters, swinging continuously, taking the loot, for as long as it is
 * given -- and watches the same counters (mp-soak's PROBE, imported, so the
 * three cannot drift apart) plus frame cost.
 *
 * HP IS PINNED rather than the fight being made fair: dying warps you to town
 * and ends the soak early, and what is under test is accumulation over a long
 * session, not whether the player can win.
 *
 * ═══ STATUS: THIS DOES NOT YET DRIVE A REAL FIGHT.  READ BEFORE TRUSTING IT.
 * As of v2.3.2124 a ten-minute run lands 17 hits and sits at mons=0 for the
 * rest of it: the zone's opening pack dies in the first thirty seconds and
 * nothing the client can see replaces it.  Whether the worker is not
 * respawning, or is respawning outside what it mirrors to this client, is
 * unresolved.
 *
 * So a GREEN result from this file currently means nothing, which is the trap
 * its own header warns about two paragraphs up.  The "it actually fought"
 * guard below is what stops it lying: it demands 50+ hits and fails the run
 * otherwise, so the scenario reports its own uselessness rather than a clean
 * bill of health.  Fix the spawning before reading anything here as evidence.
 */
import * as H from './harness.mjs';
import { PROBE } from './mp-soak.mjs';

const TILE = 32;
const SOAK_MS = Number(process.env.BT_FIGHT_MS || 600000);
const SAMPLE_EVERY_MS = 20000;

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Grinder', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2000);

  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.channel) return;
    for (const q of ['tut_1', 'tut_2', 'tut_3']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(2200);

  const marks = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return {
      townOut: (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null,
      spoke: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'verdant')
        || (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId !== 'town') || null,
    };
  });
  if (!marks.townOut || !marks.spoke) {
    rec.skip('the fight soak can reach a monster zone', 'no exit tables');
    await P.ctx.close().catch(() => {});
    return;
  }
  await stand(P, marks.townOut.tx * TILE + 16, marks.townOut.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
    { timeout: 30000, label: 'World View' }).catch(() => {});
  await P.page.waitForTimeout(700);
  await stand(P, marks.spoke.tx * TILE + 16, marks.spoke.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z !== 'worldview' && z !== 'town',
    { timeout: 30000, label: 'a monster zone' }).catch(() => {});
  await P.page.waitForTimeout(2000);

  const zone = await H.readState(P, (S) => S.currentZone);
  const serverDriven = await H.readState(P, (S) => !!S._serverMonsters);
  console.log(`    fighting in ${zone}, serverMonsters=${serverDriven}`);
  rec.ok('the soak reached a monster zone', zone !== 'town' && zone !== 'worldview', zone);
  /* THE WHOLE POINT.  If this is false the run is mp-soak again with extra
     steps, and a green result would mean nothing. */
  rec.ok('...and the WORKER is driving the monsters (this is the gap mp-soak leaves)',
    serverDriven, { zone, serverDriven });

  /* Swing forever, stay alive, and walk a small circuit so monsters keep
     being approached, aggroed and replaced rather than one pack being farmed
     in place. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.autoAttack = true;
    window.__hits = 0;
    if (S.dmgNumbers && !S.dmgNumbers.__hooked) {
      const _push = S.dmgNumbers.push.bind(S.dmgNumbers);
      S.dmgNumbers.push = function (...a) { window.__hits += a.length; return _push(...a); };
      S.dmgNumbers.__hooked = true;
    }
    let a = 0;
    clearInterval(window.__fightPin);
    window.__fightPin = setInterval(() => {
      const St = window._gameState && window._gameState.current;
      if (!St || !St.rpg || !St.player) return;
      St.rpg.hp = St.rpg.maxHp;
      St.rpg.stamina = St.rpg.maxStamina;
      St.rpg.mana = St.rpg.maxMana;
      St.autoAttack = true;
      /* ═══ HUNT, DO NOT WANDER ═══
         The first cut circled in place: it killed the three monsters within
         reach in the first twenty seconds and then swung at nothing for the
         rest of the run -- hits pinned at 13, mons 0.  That is a soak of the
         IDLE path wearing a fight's clothes, and it would have come back
         green while testing nothing.  The worker respawns elsewhere in the
         zone, so the player has to go and find them: seek the nearest live
         monster, and sweep the map when the mirror holds none. */
      const live = (St.monsters || []).filter((m) => m && m.alive !== false && m.curHp > 0);
      if (live.length) {
        let best = null, bestD = Infinity;
        for (const m of live) {
          const d = Math.hypot(m.x - St.player.x, m.y - St.player.y);
          if (d < bestD) { bestD = d; best = m; }
        }
        if (best && bestD > 26) {
          const ux = (best.x - St.player.x) / bestD, uy = (best.y - St.player.y) / bestD;
          St.player.x += ux * 7;
          St.player.y += uy * 7;
        }
      } else {
        /* ═══ WALK THE SWEEP, DO NOT TELEPORT IT ═══
           The first sweep SNAPPED the player to a point on a lissajous every
           140ms -- hundreds of pixels a tick.  That is exactly what the
           worker's anti-teleport is built to reject, so the server stopped
           believing the position, never put the player near a spawn, and the
           run sat at mons=0 with 37 hits in six minutes.  A soak that cannot
           find a monster measures nothing.
           So: pick a roaming target, WALK to it at a plausible speed, pick
           another when it is reached. */
        if (!window.__roam || Math.hypot(window.__roam.x - St.player.x, window.__roam.y - St.player.y) < 40) {
          const Z = (window.__btZones || {})[St.currentZone];
          const w = Z ? Z.w * 32 : 1024, h = Z ? Z.h * 32 : 1024;
          window.__roam = { x: w * (0.15 + 0.7 * Math.random()), y: h * (0.15 + 0.7 * Math.random()) };
        }
        const rx = window.__roam.x - St.player.x, ry = window.__roam.y - St.player.y;
        const rd = Math.hypot(rx, ry) || 1;
        St.player.x += (rx / rd) * 7;
        St.player.y += (ry / rd) * 7;
      }
    }, 140);
  });

  await P.page.evaluate(() => {
    window.__ft = [];
    let last = performance.now();
    const tick = (now) => {
      const d = now - last; last = now;
      if (d > 0 && d < 500) window.__ft.push(d);
      if (window.__ft.length > 4000) window.__ft.shift();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.__ftDrain = () => {
      const a = window.__ft.slice().sort((x, y) => x - y);
      window.__ft = [];
      if (!a.length) return null;
      const mean = a.reduce((s, v) => s + v, 0) / a.length;
      return { n: a.length, mean: +mean.toFixed(2), p95: +a[Math.floor(a.length * 0.95)].toFixed(2) };
    };
  });

  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < SOAK_MS) {
    await P.page.waitForTimeout(SAMPLE_EVERY_MS);
    const s = await P.page.evaluate(PROBE).catch(() => ({}));
    const ft = await P.page.evaluate(() => window.__ftDrain && window.__ftDrain()).catch(() => null);
    const act = await P.page.evaluate(() => ({
      hits: window.__hits || 0,
      lvl: (window._gameState.current.rpg || {}).level || 0,
      mons: (window._gameState.current.monsters || []).length,
    })).catch(() => ({}));
    samples.push({ t: Math.round((Date.now() - t0) / 1000), s, ft });
    console.log(`      fight t=${samples[samples.length - 1].t}s hits=${act.hits} lvl=${act.lvl}`
      + ` mons=${act.mons} heap=${s.heapMB}MB`
      + (ft ? `  frame mean=${ft.mean}ms p95=${ft.p95}ms` : ''));
  }
  await P.page.evaluate(() => clearInterval(window.__fightPin));

  rec.ok('the fight soak collected enough samples to compare', samples.length >= 3, samples.length);
  const swung = await P.page.evaluate(() => window.__hits || 0);
  rec.ok('...and it actually fought (a zero-hit run proves nothing)', swung > 50, swung);
  if (samples.length < 3) { await P.ctx.close().catch(() => {}); return; }

  const first = samples[0].s, last = samples[samples.length - 1].s;
  const grew = [];
  for (const k of Object.keys(last)) {
    if (k === 'heapMB') continue;
    const a = first[k] || 0, b = last[k];
    if (b >= 40 && b > a * 3 + 12) grew.push(`${k} ${a}->${b}`);
  }
  const movers = Object.keys(last)
    .filter((k) => k !== 'heapMB' && (last[k] || 0) !== (first[k] || 0))
    .map((k) => ({ k, a: first[k] || 0, b: last[k] || 0 }))
    .sort((x, y) => (y.b - y.a) - (x.b - x.a)).slice(0, 15);
  console.log('      heap: ' + first.heapMB + 'MB -> ' + last.heapMB + 'MB');
  console.log('      movers: ' + (movers.map((m) => `${m.k} ${m.a}->${m.b}`).join('  ') || 'none'));
  if (grew.length) console.log('      GREW: ' + grew.join('  '));
  rec.ok('nothing grows without bound while fighting the worker\'s monsters',
    grew.length === 0, grew);

  const base = samples[1] ? samples[1].ft : samples[0].ft;
  const end = samples[samples.length - 1].ft;
  if (base && end) {
    console.log(`      frame mean ${base.mean}ms -> ${end.mean}ms   p95 ${base.p95}ms -> ${end.p95}ms`);
    rec.ok('the frame cost is not climbing over a long fight',
      end.mean < base.mean * 1.5 + 4, { base, end });
  }

  await P.ctx.close().catch(() => {});
}
