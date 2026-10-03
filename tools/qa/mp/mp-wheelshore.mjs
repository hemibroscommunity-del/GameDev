/* ═══ THE WHEEL'S WATER STOPS YOUR BOOTS, NOT YOUR MIDDLE (v2.3.2999) ═══
 *
 * Found while studying elevation for the owner (docs/ELEVATION-PLAN.md,
 * "Things found in the code along the way"): in the Wheel the walk test read
 * the walk grid at the body's CENTRE, 52 px above the boots
 * (playerGroundDy).  So walking south into a river took your boots ~45 px into
 * the water before you stopped, and walking north stopped you with your boots
 * ~52 px short of the shore.  The grid is the ground's own now
 * (wheelTrial.js lazyGrid `atFeet`) and isSolid reads it at the boots.
 *
 * A real player, real keys, real collision, at two shores the game's own grid
 * finds near town:
 *   1. NORTH SHORE (land above, water below): walking south he stops with his
 *      boots on the bank, at its edge -- not in the water, not short of it;
 *   2. SOUTH SHORE (water above, land below): walking north the same, his
 *      body free to stand over the water as a 3/4 view draws it;
 *   3. the game's own walk test (__btIsSolid, a body's centre) answers by the
 *      boots: open 2 px before they reach the water, solid 2 px after;
 *   4. no page errors.
 * Pictures: tools/qa/mp/out/wheelshore-{north,south}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const HS = 10;          /* the walk box's half-width (hs in BroTown.jsx) */
const RUN = 150;        /* how far from the shore the walk starts, boots to bank */

/* Every shore across a column near (x, y) in the game's own grid, nearest
   first: `north` = land above, water below (walk south into it), `south` =
   water above, land below (walk north into it).  Straight across three
   columns, with room for the walk on the land side and real water beyond. */
const SHORES = (P) => P.page.evaluate(({ run }) => {
  const S = window._gameState.current, Z = window.__btZones[S.currentZone];
  const g = S._tiledWalkable && S._tiledWalkable[S.currentZone];
  if (!g || !g.length || !Z) return { error: 'no grid', zone: S.currentZone };
  const rows = g.length, cols = g[0].length, cell = (Z.h * 32) / rows;
  const px = S.player.x, py = S.player.y;
  const c0 = Math.floor(px / cell), r0 = Math.floor(py / cell), R = 170;
  const landRun = Math.ceil((run + 40) / cell), waterRun = 5;
  /* rows held here as they are read: the grid makes a row when it is read
     and keeps only its last 160, and this reads 340 rows a column */
  const held = new Map();
  const rowOf = (r) => { let a = held.get(r); if (!a) { a = g[r]; held.set(r, a); } return a; };
  const open = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols && rowOf(r)[c] !== false;
  const edgeAt = (c, from, to) => {      /* first row in [from, to) whose openness differs from the row above */
    for (let r = from; r < to; r++) if (open(r, c) !== open(r - 1, c)) return r;
    return -1;
  };
  const out = [];
  for (let c = c0 - R; c <= c0 + R; c += 3) {
    let r = Math.max(1, r0 - R);
    while (r < r0 + R) {
      const e = edgeAt(c, r, r0 + R);
      if (e < 0) break;
      const kind = open(e - 1, c) ? 'north' : 'south';
      const same = [c - 1, c + 1].every((cc) => open(e - 1, cc) === open(e - 1, c) && open(e, cc) === open(e, c));
      let ok = same;
      const landSide = kind === 'north' ? [e - landRun, e] : [e, e + landRun];
      const waterSide = kind === 'north' ? [e, e + waterRun] : [e - waterRun, e];
      for (let cc = c - 1; ok && cc <= c + 1; cc++) {
        for (let rr = landSide[0]; ok && rr < landSide[1]; rr++) if (!open(rr, cc)) ok = false;
        for (let rr = waterSide[0]; ok && rr < waterSide[1]; rr++) if (open(rr, cc)) ok = false;
      }
      if (ok) out.push({ kind, x: (c + 0.5) * cell, shoreY: e * cell, d: Math.hypot((c + 0.5) * cell - px, e * cell - py) });
      r = e + 1;
    }
  }
  out.sort((a, b) => a.d - b.d);
  return { cell, rows, cols, north: out.filter((s) => s.kind === 'north').slice(0, 10), south: out.filter((s) => s.kind === 'south').slice(0, 10) };
}, { run: RUN });

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Shorewalk', wsPort, webPort, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  await H.enterWorld(P);
  const myId = await H.readState(P, (S) => S.myId);
  let alive = true;
  const keep = (async () => { while (alive) { await P.page.keyboard.press('Shift').catch(() => {}); await P.page.waitForTimeout(20000); } })();
  const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, grid: !!(S._tiledWalkable && S._tiledWalkable.wheel && S._tiledWalkable.wheel.length) }),
    (v) => v.zone === 'wheel' && !v.loading && v.grid, { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
  rec.ok('in the Wheel, its walk grid there (guard)', !!inWheel, inWheel);
  if (!inWheel) { alive = false; await keep.catch(() => {}); await P.ctx.close().catch(() => {}); return; }
  /* past the Mayor gate (it holds a new bro in the commons) and out of harm's way */
  await H.devOp(wsPort, 'quests', myId);
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 10 });
  await P.page.waitForTimeout(1500);
  const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround ? window.__btPlayerGround() : null; return g ? g.y - S.player.y : null; });
  const flag = await P.page.evaluate(() => { const S = window._gameState.current; return S._tiledWalkable.wheel.atFeet === true; });
  rec.ok(`the boots are ${dy != null ? Math.round(dy) : '?'} px below the body's centre, and the Wheel's grid says it is read at them`, dy != null && Math.abs(dy - 52) < 3 && flag, { dy, flag });
  const feetDy = dy != null ? dy : 52;

  const shores = await SHORES(P);
  console.log(`    shores: ${JSON.stringify({ cell: shores.cell, north: (shores.north || []).length, south: (shores.south || []).length, near: [(shores.north || [])[0], (shores.south || [])[0]] })}`);
  rec.ok('the game\'s grid has shores near town to walk into, both ways (guard)', !!(shores.north && shores.north.length && shores.south && shores.south.length), shores.error || null);

  for (const kind of ['north', 'south']) {
    const list = shores[kind] || [];
    const key = kind === 'north' ? 's' : 'w';
    const sign = kind === 'north' ? 1 : -1;          /* +1: walking south (y grows) */
    let done = null;
    for (const s of list.slice(0, 8)) {
      /* the start: boots RUN px from the bank on the land side */
      const footStart = s.shoreY - sign * (RUN + HS);
      await H.hopTo(P, s.x, footStart - feetDy, { tries: 160 });
      await P.page.waitForTimeout(1500);
      /* the footprints round here come with their pages (wheelObjects.js) */
      for (let i = 0; i < 16; i++) {
        if (await P.page.evaluate(() => !(window.__btWheelObjects && window.__btWheelObjects.stats.loading))) break;
        await P.page.waitForTimeout(500);
      }
      /* nothing standing in the lane (an object's footprint stops the boots
         first and the walk proves nothing about the water), and the start
         open by the game's own answer at all four corners (TRAPS §35) */
      const lane = await P.page.evaluate(({ x, y0, y1, hs, fdy }) => {
        const S = window._gameState.current, W = window.__btWheelObjects;
        const bx = W && W.blockers ? W.blockers() : [];
        const lo = Math.min(y0, y1) - hs - 6, hi = Math.max(y0, y1) + hs + 6;
        const hit = bx.filter((b) => b.x1 > x - hs - 6 && b.x0 < x + hs + 6 && b.y1 > lo && b.y0 < hi).length;
        const npc = (S.npcs || []).filter((n) => n && n.x != null && Math.abs(n.x - x) < 40 && n.y > lo - 20 && n.y < hi + 20).length;
        const by = S.player.y;
        const startOpen = [[-hs, -hs], [hs, -hs], [-hs, hs], [hs, hs]].every(([dx, dyy]) => !window.__btIsSolid(S.player.x + dx, by + dyy));
        /* for the picture: nothing drawn over him where he will stop -- an
           object standing in front (its foot below his) whose picture
           reaches across his body */
        const fy = y1 + (y1 > y0 ? -hs : hs);
        const cover = (W && W.near ? W.near(x, fy, 700) : []).filter((o) => o.y > fy && Math.abs(o.x - x) < o.w / 2 + 16 && o.y - o.h < fy).length;
        return { hit, npc, cover, startOpen, at: { x: Math.round(S.player.x), y: Math.round(S.player.y) } };
      }, { x: s.x, y0: footStart, y1: s.shoreY, hs: HS, fdy: feetDy });
      if (lane.hit || lane.npc || lane.cover || !lane.startOpen || Math.abs(lane.at.x - s.x) > 8) { console.log(`    ${kind}: skip ${JSON.stringify({ s, lane })}`); continue; }
      /* the game's own walk test, a body's centre either side of the boots
         meeting the bank */
      const edge = await P.page.evaluate(({ x, y, fdy }) => [window.__btIsSolid(x, y - fdy - 2), window.__btIsSolid(x, y - fdy + 2)], { x: s.x, y: s.shoreY, fdy: feetDy });
      const s0 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
      await P.page.keyboard.down(key);
      await P.page.waitForTimeout(2400);
      await P.page.keyboard.up(key);
      await P.page.waitForTimeout(300);
      const s1 = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y, zone: S.currentZone }));
      const fy = s1.y + feetDy;
      /* how far the boots' box got past the bank (+ = into the water) */
      const into = sign > 0 ? (fy + HS) - s.shoreY : s.shoreY - (fy - HS);
      done = { shore: s, edge, from: { x: Math.round(s0.x), y: Math.round(s0.y) }, stop: { x: Math.round(s1.x), y: Math.round(s1.y) }, feetY: Math.round(fy),
        moved: Math.round(Math.hypot(s1.x - s0.x, s1.y - s0.y)), into: +into.toFixed(1), bodyOverWater: sign < 0 ? s1.y < s.shoreY : null, zone: s1.zone };
      console.log(`    ${kind}: ${JSON.stringify(done)}`);
      await P.page.screenshot({ path: join(OUT, `wheelshore-${kind}.png`) });
      break;
    }
    const what = kind === 'north' ? 'walking south to a river\'s north bank' : 'walking north to a river\'s south bank';
    rec.ok(`${kind}: a clear lane to walk, ${what} (guard)`, !!done, { tried: list.slice(0, 8).length });
    if (!done) continue;
    rec.ok(`${kind}: ${what}, he walked there (guard)`, done.moved >= 80 && done.zone === 'wheel', done);
    rec.ok(`${kind}: ...and stopped with his boots on the bank, not in the water (${done.into} px past it; at the body's centre this was ${kind === 'north' ? '+45' : '-52'})`, done.into <= 0.5, done);
    rec.ok(`${kind}: ...at the water's edge, not short of it (within a stride)`, done.into >= -16, done);
    rec.ok(`${kind}: the game's walk test answers by the boots: open 2 px before they meet the bank, solid 2 px after`,
      kind === 'north' ? (done.edge[0] === false && done.edge[1] === true) : (done.edge[0] === true && done.edge[1] === false), done.edge);
  }
  rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  alive = false;
  await keep.catch(() => {});
  await P.ctx.close().catch(() => {});
}
