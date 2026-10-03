/* ═══ SWIMMING IN THE WHEEL (v2.3.3003) ═══
 *
 * Owner, 2026-10-03: "I'm thinking you can add swimming and just use the
 * characters head poking out of the water plus code effects to make it look
 * like swimming and change the movement behavior".
 *
 * A real player, real keys, real collision, in the Wheel as players get it,
 * on a phone-sized page:
 *   1. walking south off a pond's bank he goes INTO the water (it stopped him
 *      at the bank before), and swims: only his head out of it (the figure
 *      sunk and cut at the neck, swimFx.js), a splash going in;
 *   2. in the water he moves at about SWIM_MULT of his walk, in strokes he
 *      hears, his footsteps silent;
 *   3. he GLIDES: let go and he drifts on a little, then stops;
 *   4. no swing, special or roll in the water, and a held attack lets go --
 *      "Swimming!" over his head instead;
 *   5. walking out he stands up again, whole, with a drip;
 *   6. the OPEN SEA past the shallows is still a wall: swimming out to it
 *      stops his boots at its line;
 *   7. another player in the same water is drawn swimming too;
 *   8. no page errors, and the look costs the frame next to nothing.
 * Speeds are the game's own per-frame ones (S.player.vy): the test machine
 * draws a few frames a second, and below 20 the game's clock runs slow
 * (BroTown's _dtScale cap), so speeds off the wall clock would mislead.
 * Pictures: tools/qa/mp/out/wheelswim-*.png, the look's in open water by the
 * sea (no tree in front).  `?noswim` (every drop of water a wall, as before)
 * is mp-wheelshore's.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const HS = 10;          /* the walk box's half-width (hs in BroTown.jsx) */
const RUN = 130;        /* boots this far up the bank from the water at the start */

/* Banks near the player: a cell of land with water to swim in straight south
   of it -- 8 cells of land above, 10 of swimmable water below, three columns
   wide -- nearest first.  Or ('sea') the open sea's line: 6 cells of
   swimmable water above, the sea below. */
const FIND = (P, what) => P.page.evaluate(({ what }) => {
  const S = window._gameState.current;
  const g = S._tiledWalkable && S._tiledWalkable[S.currentZone];
  const Z = window.__btZones[S.currentZone];
  const at = window.__btSwimAt;
  if (!g || !g.length || !Z || !at) return { error: 'no grid or hook', zone: S.currentZone };
  const rows = g.length, cols = g[0].length, cell = (Z.h * 32) / rows;
  const held = new Map();
  const rowOf = (r) => { let a = held.get(r); if (!a) { a = g[r]; held.set(r, a); } return a; };
  const open = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols && rowOf(r)[c] !== false;
  const swim = (r, c) => at((c + 0.5) * cell, (r + 0.5) * cell).swim;
  const kind = (r, c) => (!open(r, c) ? 'shut' : swim(r, c) ? 'swim' : 'land');
  const px = S.player.x, py = S.player.y;
  const c0 = Math.floor(px / cell), r0 = Math.floor(py / cell);
  const R = what === 'sea' ? 260 : 110;
  const out = [];
  for (let c = c0 - R; c <= c0 + R; c += 2) {
    for (let r = r0 - R; r <= r0 + R; r++) {
      if (what === 'bank') {
        if (kind(r - 1, c) !== 'land' || kind(r, c) !== 'swim') continue;
        let ok = true;
        for (let cc = c - 1; ok && cc <= c + 1; cc++) {
          for (let k = 1; ok && k <= 8; k++) if (kind(r - k, cc) !== 'land') ok = false;
          for (let k = 0; ok && k < 10; k++) if (kind(r + k, cc) !== 'swim') ok = false;
        }
        if (ok) out.push({ x: (c + 0.5) * cell, bankY: r * cell, d: Math.hypot((c + 0.5) * cell - px, r * cell - py) });
      } else {
        if (kind(r - 1, c) !== 'swim' || kind(r, c) !== 'shut') continue;
        let ok = true;
        for (let cc = c - 3; ok && cc <= c + 3; cc++) {
          for (let k = 1; ok && k <= 6; k++) if (kind(r - k, cc) !== 'swim') ok = false;
        }
        for (let cc = c - 1; ok && cc <= c + 1; cc++) for (let k = 0; ok && k < 4; k++) if (kind(r + k, cc) !== 'shut') ok = false;
        if (ok) out.push({ x: (c + 0.5) * cell, lineY: r * cell, d: Math.hypot((c + 0.5) * cell - px, r * cell - py) });
      }
    }
  }
  out.sort((a, b) => a.d - b.d);
  return { cell, list: out.slice(0, 12) };
}, { what });

/* nothing standing in the lane from y0 to y1 at x (a footprint stops the
   boots first, and the walk proves nothing about the water), and how many
   objects are drawn over the spot (fx, fy): standing in front of it (their
   foot below it) with a picture reaching across it */
const LANE = (P, x, y0, y1, fy) => P.page.evaluate(({ x, y0, y1, hs, fy }) => {
  const S = window._gameState.current, W = window.__btWheelObjects;
  const bx = W && W.blockers ? W.blockers() : [];
  const lo = Math.min(y0, y1) - hs - 8, hi = Math.max(y0, y1) + hs + 8;
  const hit = bx.filter((b) => b.x1 > x - hs - 8 && b.x0 < x + hs + 8 && b.y1 > lo && b.y0 < hi).length;
  const npc = (S.npcs || []).filter((n) => n && n.x != null && Math.abs(n.x - x) < 40 && n.y > lo - 20 && n.y < hi + 20).length;
  const cover = fy == null ? 0 : (W && W.near ? W.near(x, fy, 700) : []).filter((o) => o.y > fy && Math.abs(o.x - x) < o.w / 2 + 30 && o.y - o.h < fy + 10).length;
  return { hit, npc, cover };
}, { x, y0, y1, hs: HS, fy: fy == null ? null : fy });

const swimState = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, f = window.__btSwimFx ? window.__btSwimFx() : null;
  const sw = S._wheelSwim;
  const A = window.BT_AUDIO;
  return {
    x: S.player.x, y: S.player.y, vy: S.player.vy || 0, zone: S.currentZone,
    on: !!(sw && sw.on), strokes: sw ? sw.strokes : null,
    fx: f && f.self, peers: f ? f.peers : null, ripples: f ? f.ripples : null, drops: f ? f.drops : null, ms: f ? f.ms : null,
    swimCounts: A && A._swimCounts ? Object.assign({}, A._swimCounts) : {}, stepCounts: A && A._stepCounts ? Object.assign({}, A._stepCounts) : {},
    audio: !!(A && A.ctx), muted: !!(A && A.muted),
  };
});

/* hold a key, sampling where he is and his per-frame speed every ~100 ms,
   for `ms` or until `until(samples)` says to let go; `mid(samples)` is asked
   along the way (a picture mid-stroke) */
async function walk(P, key, ms, until, mid) {
  const out = [];
  const t0 = Date.now();
  await P.page.keyboard.down(key);
  while (Date.now() - t0 < ms) {
    const s = await P.page.evaluate(() => {
      const S = window._gameState.current, sw = S._wheelSwim;
      return { t: performance.now(), x: S.player.x, y: S.player.y, vy: S.player.vy || 0, on: !!(sw && sw.on), ph: sw ? sw.ph : null };
    });
    out.push(s);
    if (mid) await mid(out);
    if (until && until(out)) break;
    await P.page.waitForTimeout(90);
  }
  await P.page.keyboard.up(key);
  return out;
}
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (Q, name) => Q.page.screenshot({ path: join(OUT, `wheelswim-${name}.png`) });
  const P = await H.newPlayer(browser, { name: 'Swimmer', wsPort, webPort, world: 'wheel', viewport: PHONE });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(P);
  const myId = await H.readState(P, (S) => S.myId);
  let alive = true;
  const keep = (async () => { while (alive) { await P.page.keyboard.press('Shift').catch(() => {}); await P.page.waitForTimeout(20000); } })();
  const done = async () => { alive = false; await keep.catch(() => {}); await P.ctx.close().catch(() => {}); };
  const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, grid: !!(S._tiledWalkable && S._tiledWalkable.wheel && S._tiledWalkable.wheel.length) }),
    (v) => v.zone === 'wheel' && !v.loading && v.grid, { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
  rec.ok('in the Wheel, its walk grid there (guard)', !!inWheel, inWheel);
  if (!inWheel) { await done(); return; }
  /* past the Mayor gate (it holds a new bro in the commons) and out of harm's way */
  await H.devOp(wsPort, 'quests', myId);
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 20 });
  await P.page.waitForTimeout(1500);
  const feetDy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround ? window.__btPlayerGround() : null; return g ? g.y - S.player.y : 52; });

  /* ── 1. into a pond ── */
  const banks = await FIND(P, 'bank');
  console.log(`    banks: ${JSON.stringify({ cell: banks.cell, n: (banks.list || []).length, near: (banks.list || []).slice(0, 2), error: banks.error })}`);
  rec.ok('a bank with water to swim in south of it near town (guard)', !!(banks.list && banks.list.length), banks.error || null);
  let bank = null;
  for (const b of (banks.list || []).slice(0, 10)) {
    const footStart = b.bankY - RUN - HS;
    await H.hopTo(P, b.x, footStart - feetDy, { tries: 200 });
    await P.page.waitForTimeout(1200);
    for (let i = 0; i < 16; i++) {
      if (await P.page.evaluate(() => !(window.__btWheelObjects && window.__btWheelObjects.stats.loading))) break;
      await P.page.waitForTimeout(500);
    }
    const lane = await LANE(P, b.x, footStart, b.bankY + 220);
    const here = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    if (lane.hit || lane.npc || Math.abs(here.x - b.x) > 8) { console.log(`    bank skipped ${JSON.stringify({ b, lane })}`); continue; }
    bank = b;
    break;
  }
  rec.ok('a clear lane down the bank into the water (guard)', !!bank, null);
  if (!bank) { await done(); return; }
  const before = await swimState(P);
  rec.ok('on the bank he is not swimming, drawn whole', !before.on && (!before.fx || before.fx.k === 0) && !(before.fx && before.fx.masked), before.fx);
  /* down the bank and on into the water, letting go once he has swum 2.5 s
     (the pond is only known to run 10 cells south of the bank) */
  const samples = await walk(P, 's', 7000, (o) => { const f = o.find((q) => q.on); return !!f && o[o.length - 1].t - f.t > 2500; });
  const r0 = samples[samples.length - 1];
  const inWater = await swimState(P);
  const feetIn = inWater.y + feetDy;
  const into = feetIn - bank.bankY;
  console.log(`    in: ${JSON.stringify({ bank, into: Math.round(into), fx: inWater.fx, swimCounts: inWater.swimCounts, audio: inWater.audio })}`);
  rec.ok(`walking south off the bank he goes into the water: his boots ${Math.round(into)} px past it (they stopped at it before)`, into > 40, { into, bank });
  rec.ok('...and swims: the figure sunk to its neck and cut there, only his head out', inWater.on && !!inWater.fx && inWater.fx.k === 1 && inWater.fx.masked && inWater.fx.sink > 20, inWater.fx);
  /* (the renderer's ground point is the drawn frame's -- a jog's feet sit a
     few px from a stand's, which is what the test's 52 is) */
  rec.ok('...the waterline is where he swims: the cut at his boots\' ground point', !!inWater.fx && Math.abs(inWater.fx.surface - feetIn) < 6, { surface: inWater.fx && inWater.fx.surface, feetIn });
  if (inWater.audio && !inWater.muted) rec.ok('...with a splash going in', (inWater.swimCounts.in || 0) >= 1, inWater.swimCounts);

  /* ── 2. how he moves in it ── */
  {
    const tIn = (samples.find((s) => s.on) || {}).t;
    const landV = mean(samples.filter((s) => !s.on && s.y + feetDy < bank.bankY - 24 && s.vy > 0).map((s) => s.vy));
    const waterV = tIn ? mean(samples.filter((s) => s.on && s.t > tIn + 500).map((s) => s.vy)) : null;
    const ratio = landV && waterV ? waterV / landV : null;
    console.log(`    speeds (px a frame): ${JSON.stringify({ landV, waterV, ratio, n: samples.length })}`);
    rec.ok(`in the water he moves at about 0.55 of his walk: ${ratio != null ? ratio.toFixed(2) : '?'} (${waterV != null ? waterV.toFixed(2) : '?'} against ${landV != null ? landV.toFixed(2) : '?'} px a frame)`,
      ratio != null && ratio > 0.45 && ratio < 0.65, { landV, waterV });
    const surge = samples.filter((s) => s.on && s.t > tIn + 500).map((s) => s.vy / (landV * 0.55));
    rec.ok(`...in strokes: his speed swells and eases with each (${surge.length ? Math.min(...surge).toFixed(2) + '-' + Math.max(...surge).toFixed(2) : '?'} of the average)`,
      surge.length >= 4 && Math.max(...surge) - Math.min(...surge) > 0.08, surge.map((v) => +v.toFixed(2)));
  }
  if (inWater.audio && !inWater.muted) rec.ok(`...strokes he hears (${inWater.swimCounts.stroke || 0} so far)`, (inWater.swimCounts.stroke || 0) >= 2, inWater.swimCounts);

  /* ── 3. the glide ── */
  {
    const trail = [];
    for (let i = 0; i < 40; i++) {
      await P.page.waitForTimeout(100);
      const s = await H.readState(P, (S) => ({ y: S.player.y, vy: S.player.vy || 0 }));
      trail.push(s);
      if (Math.abs(s.vy) < 0.005 && i > 2) break;
    }
    const last = trail[trail.length - 1];
    const drift = Math.abs(last.y - r0.y);
    console.log(`    glide: ${JSON.stringify({ drift: +drift.toFixed(1), stoppedAfter: trail.length * 100, vy0: +trail[0].vy.toFixed(3) })}`);
    rec.ok(`let go and he glides on (${drift.toFixed(1)} px), easing to a stop`, drift > 2 && drift < 45 && Math.abs(last.vy) < 0.005 && trail[0].vy > 0.01, { drift, vy0: trail[0].vy, last });
  }
  const steps0 = (await swimState(P)).stepCounts;
  await P.page.waitForTimeout(1200);
  const tread = await swimState(P);
  rec.ok('treading water he stays a head in it, ripples spreading round him', tread.on && !!tread.fx && tread.fx.k === 1 && tread.ripples >= 1, { fx: tread.fx, ripples: tread.ripples });
  await shot(P, 'pond');
  /* a few strokes on south (known water): the steps' sound */
  await walk(P, 's', 900);
  const swum = await swimState(P);
  if (swum.audio && !swum.muted) {
    const grew = Object.keys(swum.stepCounts).filter((k) => (swum.stepCounts[k] || 0) > (steps0[k] || 0));
    rec.ok(`...and no footsteps while he swims: his foot plants are the water's, silent (${grew.length ? grew.join(', ') : 'none'} counted)`, grew.every((k) => k === 'swim'), { before: steps0, after: swum.stepCounts });
  }

  /* ── 4. no fighting in the water ── */
  {
    const r = await P.page.evaluate(async () => {
      const S = window._gameState.current, f = window._gameFns;
      const n0 = S.dmgNumbers.filter((p) => p.text === 'Swimming!').length;
      const swingAt = S.swingTimer;
      f.swingAttack();
      const swing = { isSwinging: !!S.isSwinging, timer: S.swingTimer === swingAt };
      f.specialAttack();
      f.contextualDodge(0);
      const roll = !!S._dodgeRoll;
      S.autoAttack = true;
      await new Promise((res) => setTimeout(res, 400));
      return { swing, roll, auto: !!S.autoAttack, notes: S.dmgNumbers.filter((p) => p.text === 'Swimming!').length - n0, on: !!(S._wheelSwim && S._wheelSwim.on) };
    });
    console.log(`    refusals: ${JSON.stringify(r)}`);
    rec.ok('no swing in the water', r.on && !r.swing.isSwinging && r.swing.timer, r);
    rec.ok('no roll in the water', !r.roll, r);
    rec.ok('a held attack lets go', !r.auto, r);
    rec.ok(`...and "Swimming!" says why, over his head, not once per try (${r.notes})`, r.notes >= 1 && r.notes <= 2, r);
  }

  /* ── 5. out again ── */
  {
    const c0 = (await swimState(P)).swimCounts;
    const back = await walk(P, 'w', 6000, (o) => o[o.length - 1].y + feetDy < bank.bankY - 60);
    await P.page.waitForTimeout(500);
    const out = await swimState(P);
    console.log(`    out: ${JSON.stringify({ fx: out.fx, on: out.on, n: back.length, feet: Math.round(out.y + feetDy), bank: bank.bankY, counts: out.swimCounts })}`);
    rec.ok('walking back north he climbs out onto the bank, whole again: not swimming, no cut, not sunk',
      !out.on && out.y + feetDy < bank.bankY && (!out.fx || (out.fx.k === 0 && !out.fx.masked && out.fx.sink === 0)), out.fx);
    if (out.audio && !out.muted) rec.ok('...with a drip coming out', (out.swimCounts.out || 0) > (c0.out || 0), out.swimCounts);
  }

  /* ── 6. the open sea is still a wall (and the look, in open water) ── */
  let sea = null;
  {
    const seas = await FIND(P, 'sea');
    console.log(`    sea lines: ${JSON.stringify({ n: (seas.list || []).length, near: (seas.list || [])[0], error: seas.error })}`);
    rec.ok('the open sea\'s line in reach of town (guard)', !!(seas.list && seas.list.length), seas.error || null);
    let res = null;
    for (const s of (seas.list || []).slice(0, 10)) {
      /* in the shallows, boots 120 px from the line */
      const footStart = s.lineY - 120 - HS;
      await H.hopTo(P, s.x, footStart - feetDy, { tries: 400 });
      await P.page.waitForTimeout(1500);
      const lane = await LANE(P, s.x, footStart, s.lineY, footStart);
      const here = await swimState(P);
      if (lane.hit || lane.npc || lane.cover || Math.abs(here.x - s.x) > 8) { console.log(`    sea skipped ${JSON.stringify({ s, lane })}`); continue; }
      await P.page.waitForTimeout(1500);
      await shot(P, 'tread');
      const edge = await P.page.evaluate(({ x, y, fdy }) => [window.__btIsSolid(x, y - fdy - 2), window.__btIsSolid(x, y - fdy + 2)], { x: s.x, y: s.lineY, fdy: feetDy });
      let pic = false;
      const tr = await walk(P, 's', 6000, (o) => o.length > 8 && Math.abs(o[o.length - 1].y - o[o.length - 4].y) < 0.5,
        async (o) => { if (!pic && o.length >= 7) { pic = true; await shot(P, 'swim'); } });
      await P.page.waitForTimeout(300);
      const end = await swimState(P);
      const fy = end.y + feetDy;
      res = { s, edge, on: end.on, start: Math.round(tr[0].y + feetDy), feet: Math.round(fy), into: +((fy + HS) - s.lineY).toFixed(1), moved: Math.round(Math.abs(end.y - tr[0].y)), zone: end.zone };
      console.log(`    sea: ${JSON.stringify(res)}`);
      await shot(P, 'sea');
      sea = s;
      break;
    }
    rec.ok('a clear lane to the open sea (guard)', !!res, null);
    if (res) {
      rec.ok(`swimming out to the open sea he stops at its line (${res.into} px past it): the sea past the shallows is still a wall`, res.on && res.moved >= 30 && res.into <= 0.5 && res.into >= -24, res);
      rec.ok('...and the game\'s walk test agrees: open 2 px before it, shut 2 px after', res.edge[0] === false && res.edge[1] === true, res.edge);
    }
  }

  /* ── 7. another player swimming ── */
  if (sea) {
    const Q = await H.newPlayer(browser, { name: 'Paddler', wsPort, webPort, world: 'wheel', guest: true, viewport: { width: 360, height: 640 } });
    const qErrors = [];
    Q.page.on('pageerror', (e) => qErrors.push(String((e && e.message) || e).slice(0, 200)));
    try {
      await H.enterWorld(Q);
      const qId = await H.readState(Q, (S) => S.myId);
      const qIn = await H.waitFor(Q, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading, { timeout: 90000, label: 'peer into the Wheel' }).catch(() => null);
      rec.ok('a second player in the Wheel (guard)', !!qIn, qIn);
      if (qIn) {
        await H.devOp(wsPort, 'quests', qId);
        await H.devOp(wsPort, 'vitals', qId, { heal: true, god: true, godMinutes: 10 });
        /* beside him in the shallows: 48 px west, 70 px back from the line */
        await H.hopTo(Q, sea.x - 48, sea.lineY - 70 - HS - feetDy, { tries: 500 });
        let seen = null;
        for (let i = 0; i < 40; i++) {
          await P.page.waitForTimeout(500);
          seen = await swimState(P);
          if (seen.peers >= 1) break;
        }
        const qs = await swimState(Q);
        console.log(`    peer: ${JSON.stringify({ seenPeers: seen && seen.peers, qOn: qs.on, qAt: { x: Math.round(qs.x), y: Math.round(qs.y) } })}`);
        rec.ok('the other player swims in his own game', qs.on, { on: qs.on });
        rec.ok('...and is drawn swimming in yours: a head in the water beside you', !!seen && seen.peers >= 1, { peers: seen && seen.peers });
        await P.page.waitForTimeout(800);
        await shot(P, 'peer');
        rec.ok('no page errors in the other player\'s game', qErrors.length === 0, qErrors.slice(0, 5));
      }
    } finally {
      await Q.ctx.close().catch(() => {});
    }
  }
  const cost = await swimState(P);
  rec.ok(`the look costs the frame next to nothing (${cost.ms} ms)`, cost.ms != null && cost.ms < 1, { ms: cost.ms });
  rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  await done();
}
