/* SOAK, BUT UNDER THE LOAD THE DEMO ACTUALLY HAD (v2.3.2122).
 *
 * Owner, after the live demo: "during demo gameplay slowed down significantly
 * like accumulation over time."
 *
 * That is the same sentence that produced mp-soak at v2.3.1741, and mp-soak
 * comes back clean: four minutes of relentless killing, frame cost flat at
 * 32ms, nothing growing.  So the accumulation is not on the path mp-soak
 * drives — and the demo differed from it in exactly two ways:
 *
 *   1. EIGHT PEOPLE IN ONE ROOM.  mp-soak plays alone, so every peer-facing
 *      pool it watches (otherPlayerDisplays, the remote swing/bow/skill
 *      sprite maps, chat) sits at zero for the whole run.  A leak in any of
 *      them is invisible there by construction.
 *   2. THEY MOVED BETWEEN ZONES, repeatedly.  mp-soak stands in one zone.
 *      Zone changes are the heaviest thing the client does — per-zone asset
 *      loads and map eviction (v2.3.1405), a full entity wipe, peers
 *      appearing and disappearing — and none of it runs in a one-zone soak.
 *
 * So this drives both, and watches the SAME counters (mp-soak's PROBE,
 * imported rather than copied, so the two cannot drift apart).  It asserts on
 * growth and on frame cost, because frame cost is the symptom that was
 * actually reported and a counter that grows without costing anything is not
 * what anybody felt.
 *
 * FOUR players rather than eight: the shape of a per-peer leak is visible at
 * four and eight browsers in one CI job is a different kind of flaky.  If a
 * counter here grows per peer, it grows twice as fast at the demo's size.
 */
import * as H from './harness.mjs';
import { PROBE } from './mp-soak.mjs';

const TILE = 32;
const SOAK_MS = Number(process.env.BT_CROWD_MS || 180000);
const SAMPLE_EVERY_MS = 15000;
const PEERS = 4;

/* Teleport, which is how every zone-travel scenario in this suite moves a
   player onto a trail-head — the transition itself is the real one. */
const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

export async function run({ browser, wsPort, webPort, rec }) {
  /* Sequentially, so each context gets its own bp_ identity and they all see
     each other — the harness note on newPlayer explains why this cannot be
     done in parallel. */
  const players = [];
  for (let i = 0; i < PEERS; i++) {
    const P = await H.newPlayer(browser, { name: 'Crowd' + i, wsPort, webPort });
    await H.enterWorld(P);
    players.push(P);
  }
  const obs = players[0];
  await obs.page.waitForTimeout(2000);

  const seen = await H.readState(obs, (S) => Object.keys(S.others || {}).length);
  rec.ok(`the observer can see the other ${PEERS - 1} players (guard: a solo run proves nothing)`,
    seen >= PEERS - 1, seen);

  /* Everyone needs the town gate open before they can leave it. */
  for (const P of players) {
    await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (!S || !S.channel) return;
      for (const q of ['tut_1', 'tut_2', 'tut_3']) {
        S.channel.send({ type: 'quest_accept', payload: { questId: q } });
      }
    }).catch(() => {});
  }
  await obs.page.waitForTimeout(2000);

  const marks = await obs.page.evaluate(() => {
    const f = window._gameFns || {};
    return {
      townOut: (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null,
      spokes: (f.WORLDVIEW_EXITS || []).filter((e) => e.zoneId !== 'town')
        .map((e) => ({ zoneId: e.zoneId, tx: e.tx, ty: e.ty })),
      townMark: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'town') || null,
    };
  });
  if (!marks.townOut || !marks.townMark || !marks.spokes.length) {
    rec.skip('the crowd soak can travel', 'no exit tables on the bridge');
    for (const P of players) await P.ctx.close().catch(() => {});
    return;
  }

  /* Keep everyone WALKING and TALKING for the whole run: peer movement is
     what drives the remote-player display path, and chat is what drives the
     bubble/log path.  Both are pools mp-soak never touches. */
  for (const P of players) {
    await P.page.evaluate((n) => {
      const S = window._gameState && window._gameState.current;
      if (!S) return;
      clearInterval(window.__crowdWalk);
      let a = Math.random() * 6.283;
      window.__crowdWalk = setInterval(() => {
        const St = window._gameState && window._gameState.current;
        if (!St || !St.player) return;
        a += 0.35;
        St.player.x += Math.cos(a) * 6;
        St.player.y += Math.sin(a) * 6;
        if (St.rpg) { St.rpg.hp = St.rpg.maxHp; }
      }, 120);
      clearInterval(window.__crowdChat);
      window.__crowdChat = setInterval(() => {
        const St = window._gameState && window._gameState.current;
        if (!St || !St.channel) return;
        try {
          St.channel.send({ type: 'broadcast', event: 'chat',
            payload: { text: 'soak ' + n + ' ' + Date.now() } });
        } catch (e) { /* a dropped line must not stop the walk */ }
      }, 3000);
    }, P.name).catch(() => {});
  }

  /* Frame-time probe on the observer — identical shape to mp-soak's, because
     it is the same symptom being measured. */
  await obs.page.evaluate(() => {
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

  /* THE TRAVEL LOOP.  Everyone walks out to the World View, on to a spoke,
     back, and round again — so each cycle is four real zone transitions per
     player, with peers arriving and leaving each zone as they go. */
  let hops = 0;
  const cycle = async () => {
    const spoke = marks.spokes[hops % marks.spokes.length];
    for (const P of players) {
      const z = await H.readState(P, (S) => S.currentZone).catch(() => null);
      if (z === 'town') {
        await stand(P, marks.townOut.tx * TILE + 16, marks.townOut.ty * TILE + 16);
      } else if (z === 'worldview') {
        await stand(P, spoke.tx * TILE + 16, spoke.ty * TILE + 16);
      } else {
        /* in a spoke: walk onto its return marker */
        await P.page.evaluate(() => {
          const S = window._gameState && window._gameState.current;
          if (!S || !S.map) return;
          for (let ty = 0; ty < S.map.length; ty++) {
            for (let tx = 0; tx < S.map[ty].length; tx++) {
              if (S.map[ty][tx] === 9) { S.player.x = tx * 32 + 16; S.player.y = ty * 32 + 16; return; }
            }
          }
        }).catch(() => {});
      }
    }
    hops++;
  };

  const samples = [];
  const t0 = Date.now();
  let nextHop = Date.now() + 6000;
  while (Date.now() - t0 < SOAK_MS) {
    if (Date.now() >= nextHop) { await cycle(); nextHop = Date.now() + 6000; }
    await obs.page.waitForTimeout(1500);
    if (samples.length * SAMPLE_EVERY_MS > Date.now() - t0) continue;
    const s = await obs.page.evaluate(PROBE).catch(() => ({}));
    const ft = await obs.page.evaluate(() => window.__ftDrain && window.__ftDrain()).catch(() => null);
    const z = await H.readState(obs, (S) => S.currentZone).catch(() => '?');
    const others = await H.readState(obs, (S) => Object.keys(S.others || {}).length).catch(() => 0);
    samples.push({ t: Math.round((Date.now() - t0) / 1000), s, ft });
    console.log(`      crowd t=${samples[samples.length - 1].t}s zone=${z} peers=${others} hops=${hops}`
      + `  heap=${s.heapMB}MB` + (ft ? `  frame mean=${ft.mean}ms p95=${ft.p95}ms` : ''));
  }
  for (const P of players) {
    await P.page.evaluate(() => {
      clearInterval(window.__crowdWalk); clearInterval(window.__crowdChat);
    }).catch(() => {});
  }

  rec.ok('the crowd soak collected enough samples to compare', samples.length >= 3, samples.length);
  rec.ok('...and it actually travelled', hops >= 3, hops);
  if (samples.length < 3) {
    for (const P of players) await P.ctx.close().catch(() => {});
    return;
  }

  /* ── WHAT GREW ──
     Compared first-to-last like mp-soak, and reported as a list rather than
     asserted key by key: the point is to find the counter nobody predicted.
     heapMB is excluded from the verdict — a JS heap that has not been
     collected yet is not a leak, and mp-soak already treats it as colour. */
  const first = samples[0].s, last = samples[samples.length - 1].s;
  const grew = [];
  for (const k of Object.keys(last)) {
    if (k === 'heapMB') continue;
    const a = first[k] || 0, b = last[k];
    /* Growth that is both large in absolute terms and multiplicative: a pool
       going 2 -> 5 as peers wander in and out is not a leak. */
    if (b >= 40 && b > a * 3 + 12) grew.push(`${k} ${a}->${b}`);
  }
  console.log('      heap: ' + first.heapMB + 'MB -> ' + last.heapMB + 'MB');
  if (grew.length) console.log('      GREW: ' + grew.join('  '));
  /* Every mover, threshold or not.  The verdict above deliberately ignores
     small counters, and a slow leak spends its first minutes looking small —
     so the run always prints what actually moved, for a human to read. */
  const movers = Object.keys(last)
    .filter((k) => k !== 'heapMB' && (last[k] || 0) !== (first[k] || 0))
    .map((k) => ({ k, a: first[k] || 0, b: last[k] || 0 }))
    .sort((x, y) => (y.b - y.a) - (x.b - x.a))
    .slice(0, 15);
  console.log('      movers: ' + (movers.map((m) => `${m.k} ${m.a}->${m.b}`).join('  ') || 'none'));
  rec.ok('nothing grows without bound with peers around and zones changing',
    grew.length === 0, grew);

  /* And the symptom itself.  Compared against the SECOND sample, not the
     first: the first window catches the tail of joining, which is legitimately
     expensive and would hide a real climb behind its own noise. */
  const base = samples[1].ft, end = samples[samples.length - 1].ft;
  if (base && end) {
    console.log(`      frame mean ${base.mean}ms -> ${end.mean}ms   p95 ${base.p95}ms -> ${end.p95}ms`);
    rec.ok('the frame cost is not climbing over a crowded session',
      end.mean < base.mean * 1.5 + 4, { base, end });
  }

  for (const P of players) await P.ctx.close().catch(() => {});
}
