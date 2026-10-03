/* ═══ THE VIEW 25% FURTHER OUT, AND THE TOWN AT 1.15x (v2.3.2997) ═══
 *
 * Owner, 2026-10-03: "Change buildings from 1.5x to 1.15x and let me see
 * what making the default scale looks like about 25% more zoomed out for
 * everything by default (make both changes)".
 *
 * On a phone viewport, against a real worker, the game as a player gets it,
 * twice: as it is now (no switches in the address), and as it was the day
 * before (`?zoom=1&bigtown=1.5`, the two switches that bring the old view
 * and the old town back for a tab):
 *   1. the world is drawn at VIEW_OUT (0.8) of the scale it was, so the view
 *      takes in 1.25x the world each way, and the bro is drawn 0.8 the size;
 *
 * v2.3.3011, the owner: "If it is already zoom it out another 25%" -- so
 * VIEW_OUT is 0.64, and the "was" here is the view this step left
 * (`?zoom=0.8`, still with the old town, `bigtown=1.5`, for check 2): the
 * same 0.8 of the scale, 1.25x the view, 0.8 the bro, one step further out.
 *   2. the town's buildings are drawn 1.15x their pictures (1.5x before),
 *      all 17 of them standing;
 *   3. the ground under the wider view is laid before the overlay lifts and
 *      nothing is missing on screen once it settles;
 *   4. what the wider view costs: ground pieces and object pages in memory,
 *      now against before (printed, and held under a bound);
 *   5. no page errors.
 * Pictures in tools/qa/mp/out/zoomout-{now,was}-{arrival,square,land}.png.
 */
import * as H from './harness.mjs';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const WHEELISH = (z) => z === 'worldview' || z === 'wheel';
/* Frost Ridge's second stage, the north-west spoke: trees and rocks, past
   its monsters (mp-wheelobjects goes there too) */
const LAND = { x: 18464, y: 18464 };

const look = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const v = window.__btWorldView ? window.__btWorldView(S.currentZone) : null;
  const g = window.__btWorldTrial && window.__btWorldTrial.stats ? window.__btWorldTrial.stats : null;
  const o = window.__btWorldTrial && window.__btWorldTrial.objects ? window.__btWorldTrial.objects() : null;
  return {
    zone: S.currentZone, loading: !!S._zoneLoading, x: Math.round(S.player.x), y: Math.round(S.player.y),
    scale: +(S._worldScaleX || 0).toFixed(4), view: v,
    bodyCss: S._bodyDrawH ? +(S._bodyDrawH * (S._worldScaleY || 1)).toFixed(1) : null,
    ground: g ? { resident: g.resident, loading: g.loading, popIns: g.popIns, pieceBytes: g.pieceBytes, failures: g.failures } : null,
    objects: o ? { pages: o.pages, mb: o.mb, drawn: o.drawn, loading: o.loading, placed: o.placed } : null,
    /* every picture the game holds decoded (pixiApp __btTex: w x h x 4, the
       GPU's measure) -- the ground's pieces are counted on their own above */
    texMB: window.__btTex ? (window.__btTex() || {}).mb : null,
  };
});

/* the buildings round you, drawn: each one's width against its picture's */
const buildingsDrawn = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, W = window.__btWheelObjects;
  if (!W) return [];
  return W.near(S.player.x, S.player.y, 2600).map((o) => ({ id: o.id, w: o.w, s: W.sprite(o.i) })).filter((o) => o.s)
    .map((o) => ({ id: o.id, w: +o.s.w.toFixed(1) }));
});

const settle = async (P, n = 60) => {
  let a = null;
  for (let i = 0; i < n; i++) {
    a = await look(P);
    if (WHEELISH(a.zone) && !a.loading && a.ground && a.ground.loading === 0 && a.objects && !a.objects.loading) return a;
    await P.page.waitForTimeout(500);
  }
  return a;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const man = JSON.parse(readFileSync(join(H.REPO, 'public/world/objects/manifest.json'), 'utf8'));
  const pictureW = Object.create(null), isBuilding = Object.create(null);
  for (const o of man.objects) { pictureW[o.id] = o.pieces.map((p) => p.gameW); isBuilding[o.id] = o.kind === 'building'; }

  const got = {};
  /* v2.3.3011: 'was' is the view before this step, 0.8 (v2.3.2997) */
  const WAS_OUT = 0.8, STEP = 0.8;
  for (const [tag, query, K] of [['now', '', 1.15], ['was', `zoom=${WAS_OUT}&bigtown=1.5`, 1.5]]) {
    const P = await H.newPlayer(browser, { name: tag === 'now' ? 'Wideview' : 'Oldview', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query });
    const errors = [];
    P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
    await H.enterWorld(P);
    const myId = await H.readState(P, (S) => S.myId);
    /* real input now and then: the client logs an idle player out after two
       minutes (mp-elemhits) */
    let alive = true;
    const keep = (async () => { while (alive) { await P.page.keyboard.press('Control').catch(() => {}); await P.page.waitForTimeout(20000); } })();

    const first = await settle(P, 120);
    /* standing a while: the pieces the zone gate laid ahead and this view
       never took are let go after WARM_KEEP_MS (wheelGround.js) */
    await P.page.waitForTimeout(6000);
    const arrival = await look(P);
    console.log(`    ${tag}: first ${JSON.stringify(first.ground)}, standing ${JSON.stringify(arrival)}`);
    await P.page.screenshot({ path: join(OUT, `zoomout-${tag}-arrival.png`) });

    const bs = (await buildingsDrawn(P)).filter((o) => isBuilding[o.id]);
    const off = bs.filter((o) => !pictureW[o.id].some((w) => Math.abs(o.w - K * w) < 1.5));

    /* the square, from its south-west corner: the Town Hall and the saloon */
    await H.hopTo(P, arrival.x - 300, arrival.y + 120);
    await settle(P, 30);
    await P.page.waitForTimeout(800);
    await P.page.screenshot({ path: join(OUT, `zoomout-${tag}-square.png`) });

    /* out on a land: the quests that let a player past the commons, and god
       mode, as the monsters stand between */
    await H.devOp(wsPort, 'quests', myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 5 });
    await H.hopTo(P, LAND.x, LAND.y, { tries: 140 });
    const land = await settle(P, 60);
    await P.page.waitForTimeout(1500);
    await P.page.screenshot({ path: join(OUT, `zoomout-${tag}-land.png`) });
    console.log(`    ${tag} on the land: ${JSON.stringify(land)}`);

    alive = false;
    await keep.catch(() => {});
    got[tag] = { first, arrival, land, bs, off, errors };
    await P.ctx.close().catch(() => {});
  }

  const now = got.now, was = got.was;
  /* 1. the scale and the view */
  const ratio = now.arrival.scale / was.arrival.scale;
  rec.ok(`the world is drawn at ${STEP} the scale it was (${was.arrival.scale} -> ${now.arrival.scale}, x${ratio.toFixed(3)})`,
    Math.abs(ratio - STEP) < 0.01, { now: now.arrival.scale, was: was.arrival.scale });
  const wv = now.arrival.view && was.arrival.view ? now.arrival.view.W / was.arrival.view.W : 0;
  rec.ok(`...so the view takes in ${(1 / STEP).toFixed(2)}x the world each way (${was.arrival.view && was.arrival.view.W} -> ${now.arrival.view && now.arrival.view.W} world px across; VIEW_OUT ${was.arrival.view && was.arrival.view.viewOut} -> ${now.arrival.view && now.arrival.view.viewOut})`,
    Math.abs(wv - 1 / STEP) < 0.02 && Math.abs(now.arrival.view.viewOut - WAS_OUT * STEP) < 1e-9 && was.arrival.view.viewOut === WAS_OUT, { now: now.arrival.view, was: was.arrival.view });
  rec.ok(`...and the bro is drawn ${STEP} the size (${was.arrival.bodyCss} -> ${now.arrival.bodyCss} CSS px)`,
    now.arrival.bodyCss > 0 && was.arrival.bodyCss > 0 && Math.abs(now.arrival.bodyCss / was.arrival.bodyCss - STEP) < 0.02,
    { now: now.arrival.bodyCss, was: was.arrival.bodyCss });
  /* 2. the buildings */
  rec.ok(`the town's buildings are drawn 1.15x their pictures (${now.bs.length} near the arrival) -- and 1.5x in the old town (${was.bs.length})`,
    now.bs.length >= 4 && !now.off.length && was.bs.length >= 2 && !was.off.length,
    { now: now.bs.slice(0, 6), offNow: now.off, offWas: was.off });
  /* 3. the ground */
  rec.ok('the ground under the wider view is laid, at the arrival and out on the land, nothing in flight and no piece failed',
    now.arrival.ground && now.arrival.ground.loading === 0 && !now.arrival.ground.failures
      && now.land.ground && now.land.ground.loading === 0 && !now.land.ground.failures, { arrival: now.arrival.ground, land: now.land.ground });
  /* v2.3.3011: ...and laid BEFORE the overlay lifts: the box laid round
     the arrival follows the view (worldTrial.js preloadWheel), so nothing
     pops in on the way in -- with the old fixed box the 0.64 view had 26 */
  rec.ok(`the ground round the arrival is laid before the overlay lifts: no piece pops in on the way in (${now.first.ground && now.first.ground.popIns} now, ${was.first.ground && was.first.ground.popIns} before)`,
    !!now.first.ground && now.first.ground.popIns === 0 && !!was.first.ground && was.first.ground.popIns === 0, { now: now.first.ground, was: was.first.ground });
  /* 4. what it costs */
  const mb = (a) => (a && a.ground ? (a.ground.resident * a.ground.pieceBytes) / 1048576 : 0);
  const costAt = (k) => ({
    groundMB: { now: +mb(now[k]).toFixed(1), was: +mb(was[k]).toFixed(1) },
    groundPieces: { now: now[k].ground.resident, was: was[k].ground.resident },
    objectMB: { now: now[k].objects && now[k].objects.mb, was: was[k].objects && was[k].objects.mb },
    texMB: { now: now[k].texMB, was: was[k].texMB },
    objectsDrawn: { now: now[k].objects && now[k].objects.drawn, was: was[k].objects && was[k].objects.drawn },
  });
  const cost = { arrival: costAt('arrival'), land: costAt('land') };
  console.log('    cost: ' + JSON.stringify(cost));
  /* The view's area is 1.56x.  The pieces it holds go anywhere from ~1.2x
     to ~1.9x, by how the view happens to sit on the 192 px grid of pieces
     (first runs: 28 -> 54 standing at the arrival, 37 -> 45 on the land).
     So the bound is the one that means something: standing still, no more
     pieces than the view and its margin can touch (wheelGround.js MARGIN 96;
     the KEEP_PX ring is only for pieces already laid) -- nothing kept that
     the view does not need. */
  const most = (v) => (Math.ceil((v.W + 192) / 192) + 1) * (Math.ceil((v.H + 192) / 192) + 1);
  rec.ok(`what the wider view costs, standing at the arrival: ground ${cost.arrival.groundMB.was} -> ${cost.arrival.groundMB.now} MB (${cost.arrival.groundPieces.was} -> ${cost.arrival.groundPieces.now} pieces, at most ${most(now.arrival.view)} the view can touch), pictures ${cost.arrival.texMB.was} -> ${cost.arrival.texMB.now} MB; on the land ground ${cost.land.groundMB.was} -> ${cost.land.groundMB.now} MB`,
    cost.arrival.groundPieces.now > 0 && cost.arrival.groundPieces.now <= most(now.arrival.view)
      && cost.arrival.groundPieces.was <= most(was.arrival.view), cost);
  /* 5. */
  rec.ok('no page errors, either way', !now.errors.length && !was.errors.length, { now: now.errors, was: was.errors });
}
