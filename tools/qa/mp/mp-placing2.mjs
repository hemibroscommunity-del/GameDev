/* ═══ PLACING v2, THE `?placing=2` PREVIEW, IN THE GAME (v2.3.2999) ═══
 *
 * Owner, 2026-10-03: "work throughout the night on studying object placement
 * in the game's maps and what a good distribution is".  The study is
 * docs/OBJECT-PLACEMENT-STUDY.md; v2 is its answer, behind `?placing=2`
 * (public/tools/world/core/placing.js PLACING v2).
 *
 * On a phone viewport, against a real worker, twice -- with the switch and
 * without -- at the same spots:
 *   1. the worker places with v2 when asked, v1 when not, and v2 is no
 *      slower than the phone can take on the way in;
 *   2. out on the lands the objects stand, are drawn, and load their pages
 *      as v1's do (no page left loading, none failed);
 *   3. no page errors;
 * and pictures of each spot both ways, for the owner:
 * tools/qa/mp/out/placing2-{v1,v2}-<spot>.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const WHEELISH = (z) => z === 'worldview' || z === 'wheel';
/* a spot on a land's road, a stage in (land:id:tier as render-wheel-objects
   says it), as game px: worked out in Node from the plan.
   v2.3.3461: on EACH run's own Wheel.  The `?placing=2` preview is always the
   short Wheel (v2.3.3315: every preview is) and the game itself the long one;
   the spots were worked out on the short one for both, so the walker without
   the switch stood in the long Wheel's sea, nothing drawn there and no tree
   to stand behind (the sweep of 2026-10-18: "frost-3: 35 vs 0" and so on).
   The same offsets either way -- a square is 1,152 game px on both Wheels --
   and each candidate's cells read from a small piece of the plan round it,
   as wheelGeom's classAt reads them, so the long Wheel is never built whole
   here. */
const SPOTS = async (plan) => {
  const L = await import(H.REPO + '/public/tools/world/core/layout.js');
  const { wheelInfo, spokePoint } = await import(H.REPO + '/public/tools/world/core/wheel.js');
  const { gridInfo } = await import(H.REPO + '/public/tools/world/core/grid.js');
  const F = L.planFeatures(plan), W = wheelInfo(plan), g = gridInfo(plan), WPA = plan.worldPxPerArtPx;
  const C = L.C, cellG = F.S * WPA;
  const dry = (x, y) => {
    const bx = Math.floor(x / cellG), by = Math.floor(y / cellG);
    const bp = L.buildBlueprint(plan, { x: bx - 4, y: by - 4, w: 9, h: 9 });
    if (bp.w !== 9 || bp.h !== 9) return false;
    for (const c of bp.cls) if (c === C.water || c === C.river || c === C.ocean) return false;
    const c = bp.cls[4 * 9 + 4];
    return c === C.ground || c === C.obstacle;
  };
  /* beside the land's road a stage in, on dry open ground (the sea is two
     squares off the road in places) */
  const at = (id, tier) => {
    for (const side of [0.7, -0.7, 0.45, -0.45, 1, -1, 0.25, -0.25]) for (const dt of [0, 0.15, -0.15, 0.3, -0.3]) {
      const [sx, sy] = spokePoint(W.byId[id], W.tierMid(tier + dt), side);
      const p = { x: Math.round((g.cx + sx * g.P - F.x0) * WPA), y: Math.round((g.cy + sy * g.P - F.y0) * WPA) };
      if (dry(p.x, p.y)) return p;
    }
    return null;
  };
  return [['frost-3', at('frost', 3)], ['verdant-3', at('verdant', 3)], ['mist-3', at('mist', 3)], ['ember-1', at('ember', 1)]].filter(([, p]) => p);
};
const look = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, o = window.__btWorldTrial && window.__btWorldTrial.objects ? window.__btWorldTrial.objects() : null;
  return { zone: S.currentZone, loading: !!S._zoneLoading, x: Math.round(S.player.x), y: Math.round(S.player.y),
    o: o ? { placed: o.placed, placeMs: o.placeMs, version: o.version, drawn: o.drawn, pages: o.pages, loading: o.loading, failed: o.failed, mb: o.mb } : null };
});
const settle = async (P, n = 60) => {
  let a = null;
  for (let i = 0; i < n; i++) {
    a = await look(P);
    if (WHEELISH(a.zone) && !a.loading && a.o && !a.o.loading) return a;
    await P.page.waitForTimeout(500);
  }
  return a;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const { PLAN } = await import(H.REPO + '/public/tools/world/plan.js');
  const spotsOf = { v2: await SPOTS(PLAN), v1: await SPOTS((await H.wheelGeom()).plan) };
  console.log(`    spots: ${JSON.stringify(spotsOf)}`);
  const got = {};
  for (const [tag, query] of [['v2', 'placing=2'], ['v1', '']]) {
    const spots = spotsOf[tag];
    const P = await H.newPlayer(browser, { name: tag === 'v2' ? 'Forester' : 'Walker', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    await H.enterWorld(P);
    const myId = await H.readState(P, (S) => S.myId);
    let alive = true;
    const keep = (async () => { while (alive) { await P.page.keyboard.press('Control').catch(() => {}); await P.page.waitForTimeout(20000); } })();
    const first = await settle(P, 120);
    console.log(`    ${tag} arrival: ${JSON.stringify(first.o)}`);
    await H.devOp(wsPort, 'quests', myId);
    /* v2.3.3461: 30 minutes -- on the long Wheel the walk out to the four
       spots alone is ~15,600 px and back across (it was 10) */
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    const at = {};
    for (const [name, p] of spots) {
      await H.hopTo(P, p.x, p.y, { tries: 160 });
      const a = await settle(P, 60);
      await P.page.waitForTimeout(1500);
      await P.page.screenshot({ path: join(OUT, `placing2-${tag}-${name}.png`) });
      at[name] = { ...(await look(P)).o, x: a.x, y: a.y, want: p };
    }
    /* a tree you stand behind goes see-through (wheelObjects.js, with
       placing v2), and comes back when you step out in front of it */
    const tree = await P.page.evaluate(() => {
      const S = window._gameState.current, W = window.__btWheelObjects;
      const CROWNS = ['oak', 'orchard', 'pine', 'birch', 'deadtree', 'palm', 'slimetree', 'mangrove', 'jungletree', 'wildfruit'];
      const near = W.near(S.player.x, S.player.y, 900).map((o) => ({ ...o, s: W.sprite(o.i) })).filter((o) => o.s && CROWNS.includes(o.id) && o.s.h > 200);
      near.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
      return near[0] ? { x: near[0].x, y: near[0].y, h: near[0].s.h, i: near[0].i, id: near[0].id } : null;
    });
    let see = null;
    if (tree) {
      const feetDy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround ? window.__btPlayerGround() : null; return g ? g.y - S.player.y : 50; });
      /* behind it: your boots a third of its height up its picture */
      await H.hopTo(P, tree.x, tree.y - tree.h * 0.3 - feetDy, { tries: 40 });
      await P.page.waitForTimeout(700);
      const behind = await P.page.evaluate((i) => { const s = window.__btWheelObjects.sprite(i); return s ? s.alpha : null; }, tree.i);
      await H.hopTo(P, tree.x, tree.y + 90 - feetDy, { tries: 40 });
      await P.page.waitForTimeout(700);
      const front = await P.page.evaluate((i) => { const s = window.__btWheelObjects.sprite(i); return s ? s.alpha : null; }, tree.i);
      see = { tree, behind, front };
    }
    console.log(`    ${tag} see-through: ${JSON.stringify(see)}`);
    alive = false;
    await keep.catch(() => {});
    got[tag] = { first, at, errors, see };
    await P.ctx.close().catch(() => {});
  }
  /* v2.3.3461: THE YARDSTICK FOR v2's TIME: v1 placed LIVE, as v2 is.  Since
     v2.3.3298 the game reads v1's places from the bake (129 ms on this box),
     so "2.5 x v1" measured a file read and the 4,000 ms floor alone judged
     v2's 4,119 (the sweep of 2026-10-18).  `?plaintown` is v1 worked out on
     the phone the way v2 is -- its plan matches no bake -- on the short
     Wheel, as every preview is. */
  const Y = await H.newPlayer(browser, { name: 'Planner', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query: 'plaintown' });
  await H.enterWorld(Y);
  const yard = await settle(Y, 120);
  console.log(`    v1 placed live (?plaintown): ${JSON.stringify(yard && yard.o)}`);
  await Y.ctx.close().catch(() => {});
  const live = yard && yard.o;
  rec.ok(`the yardstick is v1 placed on the phone (${live && live.version}, ${live && live.placed} things, ${live && live.placeMs} ms) (guard)`,
    !!live && live.version !== 'v2.3.2999' && live.placed > 8000 && live.placeMs > 0, live);
  const v1 = got.v1, v2 = got.v2;
  rec.ok(`the worker places with v2 when asked (${v2.first.o && v2.first.o.version}, ${v2.first.o && v2.first.o.placed} things, ${v2.first.o && v2.first.o.placeMs} ms, v1 placed live ${live && live.placeMs} ms) and v1 when not (${v1.first.o && v1.first.o.version}, ${v1.first.o && v1.first.o.placed})`,
    v2.first.o && v1.first.o && v2.first.o.version === 'v2.3.2999' && v1.first.o.version !== 'v2.3.2999' && v2.first.o.placed > 8000
      && !!live && v2.first.o.placeMs < Math.max(4000, 2.5 * live.placeMs), { v1: v1.first.o, v2: v2.first.o, live });
  const reached = (g) => Object.values(g.at).every((a) => Math.hypot(a.x - a.want.x, a.y - a.want.y) < 200);
  const fine = (g) => Object.values(g.at).every((a) => a.drawn > 0 && !a.loading && !a.failed);
  const names = [...new Set([...spotsOf.v2, ...spotsOf.v1].map(([n]) => n))];
  const drawnAt = (g, n) => (g.at[n] ? g.at[n].drawn : '-');
  rec.ok('out on the lands its things stand and are drawn, their pages loaded, as v1\'s are ('
    + names.map((n) => `${n}: ${drawnAt(v2, n)} vs ${drawnAt(v1, n)}`).join(', ') + ')',
  spotsOf.v2.length === 4 && spotsOf.v1.length === 4 && reached(v2) && reached(v1) && fine(v2) && fine(v1), { v1: v1.at, v2: v2.at });
  rec.ok(`with v2 a tree you stand behind goes see-through and comes back when you step out (${v2.see && v2.see.tree && v2.see.tree.id}: ${v2.see && v2.see.behind} behind, ${v2.see && v2.see.front} in front); without the switch it stays as it was (${v1.see && v1.see.behind})`,
    !!(v2.see && v2.see.behind != null && v2.see.behind < 0.6 && v2.see.front > 0.95 && v1.see && v1.see.behind === 1), { v1: v1.see, v2: v2.see });
  rec.ok('no page errors, either way', !v1.errors.length && !v2.errors.length, { v1: v1.errors, v2: v2.errors });
}
