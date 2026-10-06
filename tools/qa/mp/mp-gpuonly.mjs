/* ═══ PICTURES KEPT ON THE GRAPHICS CHIP ONLY (v2.3.3088) ═══
 *
 * The owner's yes to "character art kept only on the graphics chip".  Once on
 * the GPU, the canvases behind two kinds of picture are emptied (gpuOnly.js):
 * the combat poses' gear layers (effectsRenderer._gearStrip) and the damage
 * numbers' font pages.  `?gpucopies` keeps them, as before.
 *
 * Two phones (390 x 844, 3x) in the Wheel, one of each:
 *   1. on arrival the canvases are emptied (window.__btGpuOnly) and the page
 *      holds that much less in 2D canvases than the phone that keeps them;
 *   2. what the GPU draws for every combat strip is the same on both: their
 *      frames drawn back off the GPU (renderer.extract), byte for byte;
 *   3. the font's pages on the GPU hold exactly what their canvases held when
 *      they were let go of (each page's alpha, read before and read back), and
 *      a damage number draws.  (Not compared across the two phones: the font is
 *      installed as the game's code loads, before the web font arrives, and
 *      two page loads can catch it differently -- as before this change.);
 *   4. after a black screen's rebuild of both renderers: the strips cut and let
 *      go of again, still the same on both; the font installed afresh in the
 *      face the first install drew (its fingerprint) and page for page the
 *      same glyphs, on the GPU; a number draws; and the page still holds the
 *      saving against the phone keeping its canvases;
 *   5. a minute without drawing them, as Pixi's own GPU collector sees it (each
 *      picture aged 61 s and the collector run): none is unloaded -- it would
 *      come back from an emptied canvas, blank -- and a number still draws;
 *   6. no page errors.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* every 2D canvas the page makes, by weak reference (mp-memledger's), and the
   game's own record of what each canvas held when it was let go of */
const INIT = () => {
  window.__btGpuOnlyHeld = [];
  window.__btDmgFontLog = [];
  const canv = [];
  const gl = new WeakSet();
  const ce = Document.prototype.createElement;
  Document.prototype.createElement = function (tag) {
    const el = ce.apply(this, arguments);
    try { if (String(tag).toLowerCase() === 'canvas') canv.push(new WeakRef(el)); } catch (e) { /* ignore */ }
    return el;
  };
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type) {
    const ctx = gc.apply(this, arguments);
    try { if (ctx && /^webgl/.test(String(type))) gl.add(this); } catch (e) { /* ignore */ }
    return ctx;
  };
  window.__canvasMB = () => {
    let b = 0, n = 0;
    for (const r of canv) {
      const el = r.deref();
      if (!el || gl.has(el)) continue;
      const w = el.width | 0, h = el.height | 0;
      if (!w || !h) continue;
      n++; b += w * h * 4;
    }
    return { mb: +(b / 1048576).toFixed(1), n };
  };
};

async function canvases(P) {
  const cdp = await P.ctx.newCDPSession(P.page);
  await cdp.send('HeapProfiler.enable').catch(() => {});
  await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
  await cdp.detach().catch(() => {});
  return P.page.evaluate(() => window.__canvasMB());
}

/* Every combat strip this renderer cut, its frames drawn back off the GPU
   (extract reads the texture through a framebuffer), hashed per strip. */
const stripPrints = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  const strips = window._pixiRenderer.combatStrips();
  const out = {};
  if (!R) return { err: 'no renderer' };
  for (const key of Object.keys(strips)) {
    const frames = strips[key];
    if (!frames || !frames.length) continue;
    let h = 2166136261 >>> 0, lit = 0;
    for (const f of frames) {
      if (!f || f.destroyed) continue;
      const { pixels } = window._pixiRenderer.drawnPixels(f);
      for (let i = 0; i < pixels.length; i++) {
        h ^= pixels[i]; h = Math.imul(h, 16777619) >>> 0;
        if ((i & 3) === 3 && pixels[i] > 0) lit++;
      }
    }
    const src = frames[0].source;
    out[key] = { h, lit, n: frames.length, canvasW: src && src.resource ? src.resource.width : null };
  }
  return out;
});

/* A minute without drawing them, as Pixi's GPU collector sees it: every
   picture kept on the chip only is aged 61 s and the collector run (pixi 8.17
   unloads after 60 s what may be collected -- and would upload it again from
   an emptied canvas). */
const ageAndCollect = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer.app.renderer;
  const srcs = new Set(window.__btDmgFont().pages.map((t) => t.source));
  const strips = window._pixiRenderer.combatStrips();
  for (const k in strips) for (const f of strips[k]) srcs.add(f.source);
  const back = performance.now() - 61000;
  for (const s of srcs) if (s._gcLastUsed !== -1) s._gcLastUsed = back;
  if (R.gc && R.gc.run) R.gc.run();
  let kept = 0;
  for (const s of srcs) if (s._gpuData && s._gpuData[R.uid]) kept++;
  return { sources: srcs.size, kept };
});
const sameStrips = (a, b) => {
  const keys = Object.keys(b || {});
  const diff = keys.filter((k) => !a[k] || a[k].h !== b[k].h || a[k].lit !== b[k].lit);
  return { keys: keys.length, diff, lit: keys.reduce((n, k) => n + ((a[k] && a[k].lit) || 0), 0) };
};

/* The font's pages now: each one's alpha read back off the GPU, beside what
   its canvas held when it was let go of (gpuOnly.js's QA record). */
const fontPages = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer.app.renderer;
  const F = window.__btDmgFont();
  const held = window.__btGpuOnlyHeld || [];
  const pages = F.pages.map((tex) => {
    const rec = held.find((r) => r.source === tex.source);
    const { pixels } = window._pixiRenderer.drawnPixels(tex);
    let h = 2166136261 >>> 0, lit = 0;
    for (let i = 3; i < pixels.length; i += 4) { h ^= pixels[i]; h = Math.imul(h, 16777619) >>> 0; if (pixels[i]) lit++; }
    return { gpu: h, lit, held: rec ? rec.alpha : null, canvasW: tex.source.resource ? tex.source.resource.width : null };
  });
  return { sameFace: !!F.first && F.first === F.now, pages };
});

/* A damage number, as pushDmgPopup builds one (mp-dmgsize's way); its glyphs
   drawn back off the GPU at full strength and the font's own size. */
const numberDraws = (P, text) => P.page.evaluate(async (txt) => {
  const S = window._gameState.current;
  const R = window._pixiRenderer.app.renderer;
  const d = { x: S.player.x, y: S.player.y - 140, text: txt, color: '#fff', ts: Date.now(), ttl: 12, rise: 0 };
  S.dmgNumbers.push(d);
  for (let i = 0; i < 40 && !(d._pixiText && !d._pixiText.destroyed); i++) await new Promise((r) => setTimeout(r, 100));
  const t = d._pixiText;
  if (!t) return { err: 'not drawn' };
  const a0 = t.alpha, sx = t.scale.x, sy = t.scale.y, r0 = t.rotation;
  t.alpha = 1; t.scale.set(1, 1); t.rotation = 0;
  const { pixels } = R.extract.pixels(t);
  t.alpha = a0; t.scale.set(sx, sy); t.rotation = r0;
  let white = 0, dark = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    if (pixels[i] > 200 && pixels[i + 1] > 200 && pixels[i + 2] > 200) white++;
    else if (pixels[i] < 60 && pixels[i + 1] < 60 && pixels[i + 2] < 60) dark++;
  }
  d.ts = 0; d.ttl = 0.001;
  return { bitmap: !!t._bmpBaseScale, white, dark };
}, text);

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'chiponly', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: INIT });
  const B = await H.newPlayer(browser, { name: 'chipcopies', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: INIT, query: 'gpucopies' });
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(A);
    await H.enterWorld(B);
    const inWheel = (Q) => H.waitFor(Q, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    const okA = await inWheel(A), okB = await inWheel(B);
    rec.ok('both phones in the Wheel (guard)', !!okA && !!okB, { okA, okB });
    if (!okA || !okB) return;
    await A.page.waitForTimeout(4000);

    /* 1 */
    const gA = await A.page.evaluate(() => window.__btGpuOnly()), gB = await B.page.evaluate(() => window.__btGpuOnly());
    const cA = await canvases(A), cB = await canvases(B);
    console.log(`    let go of: ${JSON.stringify(gA)} / kept: ${JSON.stringify(gB)}; 2D canvases ${cA.mb} MB against ${cB.mb} MB`);
    rec.ok(`arriving, ${gA.emptied} canvases (${gA.mb} MB) are let go of once on the GPU; the phone with ?gpucopies keeps them (${gB.emptied})`,
      gA.emptied >= 40 && gA.mb >= 20 && gB.keep === true && gB.emptied === 0, { gA, gB });
    rec.ok(`...and the page holds that much less in 2D canvases: ${cA.mb} MB against ${cB.mb} MB`,
      cB.mb - cA.mb >= gA.mb * 0.8, { cA, cB });

    /* 2 */
    const sA = await stripPrints(A), sB = await stripPrints(B);
    const s1 = sameStrips(sA, sB);
    const emptied = Object.values(sA).filter((v) => v.canvasW === 0).length;
    rec.ok(`what the GPU draws for every combat strip is the same on both, byte for byte (${s1.keys} strips, ${s1.lit} lit pixels; ${emptied} of them with their canvas let go of here)`,
      s1.keys >= 20 && s1.diff.length === 0 && s1.lit > 0 && emptied >= s1.keys - 1, { diff: s1.diff.slice(0, 4) });

    /* 3 */
    const f1 = await fontPages(A);
    const f1ok = f1.pages.filter((p) => p.held != null && p.gpu === p.held && p.lit > 0 && p.canvasW === 0).length;
    console.log(`    the font's pages: ${JSON.stringify(f1.pages.slice(0, 3))}`);
    rec.ok(`the font's ${f1.pages.length} pages on the GPU hold exactly what their canvases held when let go of (${f1ok} of ${f1.pages.length}, each page's alpha)`,
      f1.pages.length >= 6 && f1ok === f1.pages.length, f1.pages);
    const n1 = await numberDraws(A, '1234');
    const nB1 = await numberDraws(B, '1234');
    rec.ok(`...and a damage number draws from them (fill ${n1.white} px, outline ${n1.dark})`, n1.bitmap && n1.white > 1000 && n1.dark > 1000, n1);

    /* 4 -- both phones' renderers rebuilt, as after a black screen.  (A rebuild
       on main also leaves the old renderer's art behind, which #802 fixes, so
       the two phones are compared with each other.) */
    const rebuild = async (Q) => {
      await Q.page.evaluate(() => { window.__qaOldR = window._pixiRenderer; window._rebuildRenderer('qa: gpuonly'); });
      return H.waitFor(Q, () => !!(window._pixiRenderer && window._pixiRenderer !== window.__qaOldR && window._pixiRenderer.app),
        (v) => v, { timeout: 30000, label: 'the renderer rebuilt' }).catch(() => false);
    };
    const rbA = await rebuild(A), rbB = await rebuild(B);
    rec.ok('both renderers are rebuilt, as after a black screen (guard)', rbA === true && rbB === true, { rbA, rbB });
    /* the new renderer cuts its strips again as it starts (and lets go of
       them); until all are in, the QA map still names some of the old
       renderer's, whose canvases are gone */
    const recut = await H.waitFor(A, () => window.__btGpuOnly().emptied, (n) => n >= gA.emptied * 2,
      { timeout: 45000, label: 'the strips cut again' }).catch(() => null);
    const recutB = await H.waitFor(B, () => Object.keys(window._pixiRenderer.combatStrips()).length, (n) => n >= s1.keys,
      { timeout: 45000, label: 'the other phone\'s strips cut again' }).catch(() => null);
    await A.page.waitForTimeout(1500);
    const sA2 = await stripPrints(A), sB2 = await stripPrints(B);
    const s2 = sameStrips(sA2, sB2);
    const emptied2 = Object.values(sA2).filter((v) => v.canvasW === 0).length;
    rec.ok(`after the rebuild the strips are cut again for the new renderer and let go of again, the same on both (${s2.keys} strips, ${emptied2} let go of)`,
      recut != null && recutB != null && s2.keys >= 20 && s2.diff.length === 0 && emptied2 >= s2.keys - 1,
      { recut, recutB, diff: s2.diff.slice(0, 4).map((k) => ({ k, a: sA2[k], b: sB2[k] })) });
    const f2 = await fontPages(A);
    console.log('    font log: ' + JSON.stringify(await A.page.evaluate(() => window.__btDmgFontLog.map((e) => [e.what, e.uid, e.gone]))));
    console.log('    pages now: ' + JSON.stringify(await A.page.evaluate(() => {
      const R = window._pixiRenderer.app.renderer;
      return window.__btDmgFont().pages.slice(0, 3).map((t) => ({ uid: t.source.uid, destroyed: t.source.destroyed, w: t.source.width, rw: t.source.resource ? t.source.resource.width : null,
        onGpu: !!(t.source._gpuData && t.source._gpuData[R.uid]), gpuKeys: Object.keys(t.source._gpuData || {}), rUid: R.uid }));
    })));
    const f2ok = f2.pages.filter((p) => p.held != null && p.gpu === p.held && p.canvasW === 0).length;
    const samePages = f2.pages.length === f1.pages.length && f2.pages.every((p, i) => p.held === f1.pages[i].held);
    rec.ok(`...the font is installed afresh in the face the first install drew (fingerprint ${f2.sameFace ? 'the same' : 'DIFFERENT'}), page for page the same glyphs (${samePages ? 'all' : 'NOT all'} ${f2.pages.length}), on the GPU and let go of (${f2ok})`,
      f2.sameFace && samePages && f2ok === f2.pages.length, { f2: f2.pages, f1: f1.pages.map((p) => p.held) });
    const n2 = await numberDraws(A, '1234');
    const nB2 = await numberDraws(B, '1234');
    console.log(`    a number before / after the rebuild: this phone ${n1.white}/${n1.dark} -> ${n2.white}/${n2.dark}; the phone keeping its canvases ${nB1.white}/${nB1.dark} -> ${nB2.white}/${nB2.dark}`);
    rec.ok(`...a damage number draws (fill ${n2.white} px, outline ${n2.dark})`, n2.bitmap && n2.white > 1000 && n2.dark > 1000, n2);
    const gA2 = await A.page.evaluate(() => window.__btGpuOnly());
    const cA2 = await canvases(A), cB2 = await canvases(B);
    rec.ok(`...and the new renderer's canvases are let go of too (${gA2.emptied} in all, ${gA2.mb} MB): 2D canvases ${cA2.mb} MB against ${cB2.mb} MB on the phone keeping them`,
      gA2.emptied >= gA.emptied * 2 && cB2.mb - cA2.mb >= gA.mb * 0.8, { cA2, cB2, gA2 });

    /* 5 -- a minute without a fight */
    const aged = await ageAndCollect(A);
    const n3 = await numberDraws(A, '1234');
    const sA3 = await stripPrints(A);
    const s3 = sameStrips(sA3, sB2);
    rec.ok(`a minute without drawing them, Pixi's GPU collector run: all ${aged.sources} pictures kept on the chip stay there (${aged.kept}), a number still draws (fill ${n3.white} px, outline ${n3.dark}) and every strip still the same (${s3.diff.length} differ)`,
      aged.kept === aged.sources && n3.white > 1000 && n3.dark > 1000 && s3.diff.length === 0, { aged, n3, diff: s3.diff.slice(0, 4) });

    /* 6 */
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
