/* ═══ A BIG DRAWING'S LISTS LET GO, THE SAME PIXELS (v2.3.4080) ═══
 *
 * `?gfxlean` (src/rendering/gfxLean.js): once Pixi has made a big, unbatched
 * Graphics' own vertex buffers, the three plain arrays it built them from are
 * emptied -- the Wheel minimap's roads, river and railway, ~1 MB of the page's
 * heap (docs/specs/heap-trim-2026-11-03.md).  This proves it costs nothing:
 *
 *   1. a phone (dpr 3) in the Wheel's BroTown: the minimap's lines are let go
 *      (__btGfxLean: at least one drawing, 20,000+ numbers), and the lines'
 *      Graphics holds no list now while its buffers are made;
 *   2. the lines photographed off the chip (Pixi's extract, the whole Wheel
 *      at a tenth of its size: the box in BroTown shows only the town), drawn
 *      from Pixi's own buffers with the lists let go; then their context
 *      unloaded as Pixi's collector unloads one (60 s off the screen: the
 *      world map open) and photographed at once, built afresh from their
 *      shapes with full lists: the same picture to the pixel, with 500+
 *      pixels drawn (the control: the lines are in it); and once the game
 *      draws on, the rebuilt lines are let go again;
 *   3. `?gfxlean=0`: a second phone keeps them (on: false, none let go).
 *
 *   node tools/qa/mp/run.mjs gfxlean
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* in the page: the minimap's Graphics, biggest first (by the points Pixi
   built its shapes into: the lines, four strokes of the whole Wheel), each
   with how many numbers its lists hold and whether its own buffers are made;
   `act` 'shot' photographs the biggest off the chip (Pixi's extract, at a
   tenth of its size), 'unloadShot' first unloads its context as Pixi's
   collector does (GraphicsContext.unload: a fresh build from its shapes when
   next drawn -- the collector itself never takes a drawing on screen, whose
   use it renews every frame) */
const LINES = (act) => {
  const R = window._pixiRenderer && window._pixiRenderer.app;
  if (!R) return null;
  let box = null;
  const find = (c) => { if (box) return; if (c.label === 'wheel-minimap') { box = c; return; } for (const k of c.children || []) find(k); };
  find(R.stage);
  if (!box) return null;
  const out = [];
  const walk = (c) => {
    if (c.context && c.context.instructions) {
      let lists = 0, built = false, batched = false, points = 0;
      for (const k in c.context._gpuData || {}) {
        const g = c.context._gpuData[k];
        if (!g) continue;
        lists += g.geometryData ? g.geometryData.vertices.length : 0;
        built = built || !!g.graphicsData;
        batched = batched || !!g.isBatchable;
        /* the floats Pixi made its own buffer of, or (not drawn yet) the list's */
        points = Math.max(points, g.graphicsData && g.graphicsData.batcher ? g.graphicsData.batcher.attributeSize || 0 : 0, g.geometryData ? g.geometryData.vertices.length : 0);
      }
      out.push({ g: c, shapes: c.context.instructions.length, points, lists, built, batched });
    }
    for (const k of c.children || []) walk(k);
  };
  walk(box);
  out.sort((a, b) => b.points - a.points);
  const big = out[0] && out[0].g;
  if (big && (act === 'shot' || act === 'unloadShot')) {
    const lists0 = (() => { let n = 0; for (const k in big.context._gpuData || {}) { const g = big.context._gpuData[k]; if (g && g.geometryData) n += g.geometryData.vertices.length; } return n; })();
    if (act === 'unloadShot') big.context.unload();
    const ex = R.renderer.extract.pixels({ target: big, resolution: 0.1 });
    const px = ex.pixels;
    let lists = 0;
    for (const k in big.context._gpuData || {}) { const g = big.context._gpuData[k]; if (g && g.geometryData) lists += g.geometryData.vertices.length; }
    let sum = 0, drawn = 0;
    for (let i = 0; i < px.length; i++) sum = (sum * 31 + px[i]) >>> 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] > 0) drawn++;
    return { w: ex.width, h: ex.height, sum, drawn, lists: act === 'unloadShot' ? lists : lists0 };
  }
  return out.map(({ g, ...r }) => r);
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Lean', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
  try {
    await H.enterWorld(P);
    const inWheel = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel\'s BroTown (guard)', !!inWheel, inWheel);
    if (!inWheel) return;

    /* 1. let go */
    const lean = await H.waitFor(P, () => window.__btGfxLean || null, (v) => v && v.lean >= 1, { timeout: 30000, label: 'the lines let go' }).catch(() => null);
    const g1 = await P.page.evaluate(LINES, null);
    rec.ok('1. the minimap\'s lines are let go once drawn (the switch on, 20,000+ numbers)',
      !!lean && lean.on === true && lean.numbers >= 20000, lean);
    rec.ok('1b. the lines\' Graphics (the most points) holds no list now, and its own buffers are made (not batched)',
      !!g1 && g1.length > 0 && g1[0].points >= 10000 && g1[0].lists === 0 && g1[0].built && !g1[0].batched, g1 && g1.slice(0, 3));

    /* 2. the same pixels: the lines photographed off the chip now, drawn
       from Pixi's own buffers with the lists let go; then their context
       unloaded and photographed at once, built afresh from their shapes
       (full lists); the two the same to the pixel.  (The whole Wheel's lines
       at a tenth of their size: the box in BroTown shows only the town.) */
    const shot1 = await P.page.evaluate(LINES, 'shot');
    const before = await P.page.evaluate(() => (window.__btGfxLean ? window.__btGfxLean.lean : 0));
    const shot2 = await P.page.evaluate(LINES, 'unloadShot');
    rec.ok('2. the lines drawn from Pixi\'s buffers with the lists let go are the same picture as built afresh from their shapes',
      !!shot1 && !!shot2 && shot1.lists === 0 && shot2.lists > 0 && shot1.w === shot2.w && shot1.h === shot2.h && shot1.sum === shot2.sum,
      { leaned: shot1, fresh: shot2 });
    rec.ok('2b. control: the photograph has the lines in it (500+ drawn pixels at a tenth of their size)', !!shot1 && shot1.drawn >= 500, shot1 && shot1.drawn);
    /* ...and the game draws on: the rebuilt lines let go again (by the
       renderer's clock: a frame drew them) */
    const again = await H.waitFor(P, () => (window.__btGfxLean ? window.__btGfxLean.lean : 0), (v) => v > before, { timeout: 20000, label: 'let go again' }).catch(() => null);
    const g2 = await P.page.evaluate(LINES, null);
    rec.ok('2c. once drawn again they are let go again, their buffers made', again != null && !!g2 && g2[0].points >= 10000 && g2[0].lists === 0 && g2[0].built, { before, again, lines: g2 && g2[0] });
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* 3. the off-ramp */
  const Q = await H.newPlayer(browser, { name: 'Full', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'gfxlean=0' });
  try {
    await H.enterWorld(Q);
    await H.waitFor(Q, (S) => S.currentZone, (z) => z === 'wheel', { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    await Q.page.waitForTimeout(6000);
    const st = await Q.page.evaluate(() => window.__btGfxLean || null);
    const g = await Q.page.evaluate(LINES, null);
    rec.ok('3. ?gfxlean=0: the switch off, nothing let go, the lines keep their lists',
      !!st && st.on === false && st.lean === 0 && !!g && g.length > 0 && g[0].lists > 0, { st, lines: g && g[0] });
  } finally {
    await Q.ctx.close().catch(() => {});
  }
}
