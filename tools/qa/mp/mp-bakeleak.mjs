/* ═══ A BLACK SCREEN'S RECOVERY, AND A STROKE IN THE DESIGNER, GIVE BACK WHAT THEY REPLACE (v2.3.3074) ═══
 *
 * Owner: "It happens too often that the screen goes black."  The game's own
 * way back from a black screen rebuilds the renderer (BroTown
 * _rebuildRenderer: the black-screen watchdog, a lost context, a dead one on
 * resume) -- and, measured on main, every rebuild left the old one's art
 * behind: the asset cache 172 -> 200 -> 252 -> 303 MB over three of them,
 * 2D canvases 128 -> 321 MB, and three WebGLRenderers alive after two.  So
 * each black screen made the next one more likely.  A stroke in the character
 * designer (one setArt) re-bakes the sword / bow stand-ins and left the old
 * set behind too: +11.5 MB a stroke, 92 MB for eight -- and after the three
 * rebuilds, 580 MB for eight, every dead renderer still listening and baking
 * its own copy.  TRAPS §139.
 *
 * What held them, from heap snapshots (scratch tooling, not kept):
 *   - effectsRenderer's eleven skin / drawing listeners, never unsubscribed,
 *     and the WebGL renderer it held for photographs (_captureRenderer);
 *   - every bake's canvas, kept in Pixi's Cache: Texture.from(canvas) keys
 *     the Cache by the canvas and a release that destroyed only the SOURCE
 *     never took it out;
 *   - the Wheel's ground, which tileRenderer.destroy never destroyed (the
 *     module's 'got' listeners kept it, every piece's pixels with it);
 *   - Pixi's render-target system's "destroy" listener on every render
 *     texture it drew into -- the TexturePool's outlive any renderer.
 *
 * This runs a phone (390 x 844, dpr 3) in the Wheel and asserts, after three
 * rebuilds and then after eight strokes, that the asset cache (__btTex) and
 * the 2D canvases alive (every canvas the page made, tracked from creation,
 * the WebGL ones left out) stay where they were, that every WebGL context but
 * the live one is lost (its GPU memory given back), and that the figure is
 * still drawn from live frames (window.__btFxBakes: no strip the stand-ins
 * draw from points at a released source -- the failure releasing the wrong
 * array would be, TRAPS §49).  Each figure is read after a forced GC.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const REBUILDS = 3;
const STROKES = 8;

/* Every canvas the page makes, and every WebGL context, by weak reference. */
const INIT = () => {
  const canv = [];
  const gls = [];
  const glCanvas = new WeakSet();
  const ce = Document.prototype.createElement;
  Document.prototype.createElement = function (tag) {
    const el = ce.apply(this, arguments);
    try { if (String(tag).toLowerCase() === 'canvas') canv.push(new WeakRef(el)); } catch (e) { /* ignore */ }
    return el;
  };
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type) {
    const ctx = gc.apply(this, arguments);
    try {
      if (ctx && /^webgl/.test(String(type))) { glCanvas.add(this); if (!gls.some((r) => r.ctx.deref() === ctx)) gls.push({ ctx: new WeakRef(ctx), cv: new WeakRef(this) }); }
    } catch (e) { /* ignore */ }
    return ctx;
  };
  window.__bakeLeak = () => {
    let bytes = 0, n = 0;
    for (const r of canv) {
      const el = r.deref();
      if (!el || glCanvas.has(el)) continue;
      const w = el.width | 0, h = el.height | 0;
      if (!w || !h) continue;
      n++; bytes += w * h * 4;
    }
    /* contexts on a canvas with pixels only: Pixi's own WebGL-support check
       makes one on a 0 x 0 canvas at startup, which holds nothing */
    let live = 0, lost = 0;
    for (const r of gls) {
      const g = r.ctx.deref(), cv = r.cv.deref();
      if (!g || !cv || !(cv.width * cv.height)) continue;
      if (g.isContextLost()) lost++; else live++;
    }
    return { canvasMB: +(bytes / 1048576).toFixed(1), canvasN: n, liveGl: live, lostGl: lost };
  };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'bakeleak', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: INIT });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!ok, ok);
    if (!ok) return;
    const cdp = await P.ctx.newCDPSession(P.page);
    await cdp.send('HeapProfiler.enable').catch(() => {});
    const sample = async () => {
      await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
      await P.page.waitForTimeout(300);
      await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
      return P.page.evaluate(() => {
        const t = window.__btTex ? window.__btTex() : null;
        const d = window.__btPlayerDrawn ? window.__btPlayerDrawn() : null;
        return { cache: t ? t.mb : null, ...window.__bakeLeak(), fx: window.__btFxBakes ? window.__btFxBakes() : null,
          drawn: d ? { w: Math.round(d.width), h: Math.round(d.height), visible: d.visible } : null };
      });
    };
    /* the stand-ins bake from images that load after the zone does: wait for
       the strips to be there before taking a reading */
    /* (a build without the probe -- main, before v2.3.3074 -- waits a fixed
       time instead, so the scenario still measures it) */
    const settled = async (atLeast) => {
      const has = await P.page.evaluate(() => !!window.__btFxBakes);
      if (!has) { await P.page.waitForTimeout(15000); return; }
      await P.page.waitForFunction((n) => {
        const f = window.__btFxBakes && window.__btFxBakes();
        return f && !f.destroyed && f.strips >= n;
      }, atLeast, { timeout: 45000 }).catch(() => {});
      await P.page.waitForTimeout(4000);
    };
    await settled(1);
    const base = await sample();
    const strips0 = base.fx ? base.fx.strips : 0;
    rec.ok(`a baseline in the Wheel (guard): cache ${base.cache} MB, 2D canvases ${base.canvasMB} MB, ${base.fx ? base.fx.strips : '?'} stand-in strips`,
      base.cache > 50 && base.canvasMB > 0, base);

    /* ── three rebuilds, the black-screen watchdog's own recovery ── */
    const rows = [];
    for (let i = 1; i <= REBUILDS; i++) {
      await P.page.evaluate(() => window._rebuildRenderer && window._rebuildRenderer('mp-bakeleak'));
      await P.page.waitForTimeout(6000);   /* past the remount; the 5 s debounce lets the next one through */
      await settled(strips0);
      rows.push(await sample());
      console.log(`    after rebuild ${i}: ${JSON.stringify(rows[rows.length - 1])}`);
    }
    const last = rows[rows.length - 1];
    rec.ok(`${REBUILDS} rebuilds give back what the old renderers held: the asset cache ${base.cache} -> ${last.cache} MB (main: 172 -> 327)`,
      last.cache != null && last.cache - base.cache <= 6, { base: base.cache, after: rows.map((r) => r.cache) });
    rec.ok(`...and their canvases: 2D canvases ${base.canvasMB} -> ${last.canvasMB} MB (main: 117 -> 278)`,
      last.canvasMB - base.canvasMB <= 10, { base: base.canvasMB, after: rows.map((r) => r.canvasMB) });
    rec.ok(`every WebGL context but the live one is lost, its GPU memory given back: live ${last.liveGl}, lost ${last.lostGl}`,
      last.liveGl === 1, { liveGl: last.liveGl, lostGl: last.lostGl });
    rec.ok(`the figure is still drawn after the rebuilds, from live frames: body ${last.drawn && last.drawn.w}x${last.drawn && last.drawn.h}, ${last.fx && last.fx.strips} strips, ${last.fx && last.fx.deadInUse} released in use`,
      !!last.drawn && last.drawn.h > 0 && !!last.fx && last.fx.strips >= strips0 && last.fx.deadInUse === 0, { drawn: last.drawn, fx: last.fx });

    /* ── eight strokes in the designer: each one is a setArt, which re-bakes
       the sword / bow stand-ins (and, on the tattoo, the chop / cook / fire
       figures after their 400 ms pause).  Off-centre on purpose, so the
       mirrored twins are baked as for a real drawing.
       Two strokes first, unmeasured: having a drawing at all costs memory a
       player with one pays for (the twins, the drawn body sheets), and some of
       what a stroke replaces is let go of on a 30 s delay on purpose (a head
       overlay may be on screen: playerSkins _dropArtSheets).  So the reading is
       taken 35 s after each run of strokes: what is left then is what stays. ── */
    const stroke = (k) => P.page.evaluate((n) => {
      const a = new Array(256).fill('0');
      for (let c = 0; c < n * 3; c++) a[(c % 16) * 16 + Math.floor(c / 16)] = '1';
      window.__btSetArt(n % 2 ? 'tattoo' : 'shirtFront', a.join(''));
    }, k);
    await stroke(1); await P.page.waitForTimeout(2500);
    await stroke(2); await P.page.waitForTimeout(2500);
    await settled(strips0);
    await P.page.waitForTimeout(35000);
    const s0 = await sample();
    for (let i = 3; i < 3 + STROKES; i++) { await stroke(i); await P.page.waitForTimeout(2500); }
    await settled(strips0);
    await P.page.waitForTimeout(35000);
    const s8 = await sample();
    rec.ok(`${STROKES} strokes in the designer leave nothing behind: the asset cache ${s0.cache} -> ${s8.cache} MB (main: +92 MB alone, +580 MB after the three rebuilds)`,
      s8.cache != null && s8.cache - s0.cache <= 4, { before: s0.cache, after: s8.cache });
    rec.ok(`...and 2D canvases ${s0.canvasMB} -> ${s8.canvasMB} MB`, s8.canvasMB - s0.canvasMB <= 6, { before: s0.canvasMB, after: s8.canvasMB });
    rec.ok(`...and the stand-ins wear the last stroke from live frames: ${s8.fx && s8.fx.strips} strips, ${s8.fx && s8.fx.deadInUse} released in use`,
      !!s8.fx && s8.fx.strips >= strips0 && s8.fx.deadInUse === 0, s8.fx);
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
