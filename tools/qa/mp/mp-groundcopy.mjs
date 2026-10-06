/* ═══ THE WHEEL'S GROUND IS KEPT ON THE GPU ONLY (v2.3.3076) ═══
 *
 * docs/MEMORY-PLAN.md, measured in the Wheel's Brotown on main: every piece of
 * ground the worker lays (402 x 402 colours, 0.62 MB) was kept twice -- once on
 * the GPU, where it is drawn from, and once in the page, as the texture's
 * source, for nothing: 54 pieces standing, 34 MB (~56 MB sprinting, the pieces
 * laid ahead).  The page's copy would only be read again if Pixi had to upload
 * the piece a second time -- after a lost context -- and the game never lets it:
 * a lost context is rebuilt, renderer and ground alike, 2.5 s later, whether or
 * not it comes back (crashTrap watchContextLoss, v2.3.773: "restore is not
 * survivable"), and the new ground asks the worker again.  So the piece goes to
 * the GPU as it is placed, and its colours are let go of (wheelGround.js).
 *
 * A phone (390 x 844, dpr 3) in the Wheel.  An init script listens to the
 * ground worker's replies beside the game (the same message objects): it holds
 * a WEAK reference to every piece's colours, and a copy of the last few pieces'
 * bytes to check the GPU against.  Asserted:
 *   1. the GPU holds every piece checked exactly as the worker laid it (read
 *      back through the renderer, every opaque pixel) -- the upload is whole
 *      before the colours go;
 *   2. after a forced GC the page keeps no piece's colours (main: one per piece
 *      laid and standing, 34 MB);
 *   3. ...nor after a walk across the commons, pieces laid and let go on the way,
 *      and the ground there checked the same way;
 *   4. ...nor after a black screen's rebuild (the game's own _rebuildRenderer),
 *      which lays the ground again from the worker, checked the same way.
 * The main thread's ArrayBuffer memory is printed at each step, after a forced
 * GC, for the before / after in the PR.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const INIT = () => {
  const refs = [];                 /* WeakRef to each piece's colours */
  const copies = new Map();        /* "i,j" -> the bytes of its latest laying (the test's own copy, the last 16) */
  const W = window.Worker;
  function Tapped(url, opts) {
    const w = new W(url, opts);
    try {
      w.addEventListener('message', (ev) => {
        const m = ev.data;
        if (!m || m.type !== 'chunk' || !m.data || !m.w) return;
        refs.push({ k: m.i + ',' + m.j, r: new WeakRef(m.data) });
        const k = m.i + ',' + m.j;
        copies.delete(k);
        copies.set(k, { w: m.w, h: m.h, bytes: new Uint8Array(m.data.buffer, m.data.byteOffset, m.data.byteLength).slice() });
        if (copies.size > 16) copies.delete(copies.keys().next().value);
      });
    } catch (e) { /* not a worker we can watch */ }
    return w;
  }
  Tapped.prototype = W.prototype;
  window.Worker = Tapped;
  window.__gcopy = {
    alive() {
      let n = 0, bytes = 0;
      for (const e of refs) { const a = e.r.deref(); if (a && a.byteLength) { n++; bytes += a.byteLength; } }
      return { laid: refs.length, alive: n, mb: +(bytes / 1048576).toFixed(1) };
    },
    keys: () => [...copies.keys()],
    /* the piece sprites the ground shows now: "i,j" -> sprite (the pieces'
       container is labelled; a piece is placed at i * cs - half) */
    pieces() {
      const R = window._pixiRenderer;
      const st = R && R.app && R.app.stage;
      let root = null;
      const find = (c) => { if (root || !c) return; if (c.label === 'wheelGroundPieces') { root = c; return; } for (const k of (c.children || [])) find(k); };
      find(st);
      const out = new Map();
      if (!root) return out;
      const cs = 192;
      for (const s of root.children) {
        if (!s || !s.texture || !s.texture.source || s.width > 4 * cs) continue;   /* the whole-Wheel underlay */
        out.set(Math.round(s.x / cs) + ',' + Math.round(s.y / cs), s);
      }
      return out;
    },
    /* read a piece back from the GPU and compare it with the worker's bytes */
    check(k) {
      const R = window._pixiRenderer;
      const s = this.pieces().get(k);
      const c = copies.get(k);
      if (!R || !s || !c) return { k, err: !s ? 'no sprite' : 'no copy' };
      const src = s.texture.source;
      if (src.pixelWidth !== c.w || src.pixelHeight !== c.h) return { k, err: `size ${src.pixelWidth}x${src.pixelHeight} vs ${c.w}x${c.h}` };
      const SpriteC = s.constructor, TextureC = s.texture.constructor;
      /* which way up the read-back comes: a 1 x 4 probe, top row opaque */
      const cv = document.createElement('canvas'); cv.width = 1; cv.height = 4;
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1, 1);
      const pt = new SpriteC(TextureC.from(cv));
      const pp = R.app.renderer.extract.pixels({ target: pt, resolution: 1 });
      const topDown = pp.pixels[3] > 128;
      pt.destroy(true);
      const t = new TextureC({ source: src });
      const sp = new SpriteC(t);
      const got = R.app.renderer.extract.pixels({ target: sp, resolution: 1 });
      sp.destroy();
      if (got.width !== c.w || got.height !== c.h) return { k, err: `read back ${got.width}x${got.height}` };
      const px = got.pixels, b = c.bytes, w = c.w, h = c.h;
      let opaque = 0, same = 0, worst = 0;
      for (let y = 0; y < h; y++) {
        const ry = topDown ? y : h - 1 - y;
        for (let x = 0; x < w; x++) {
          const o = (y * w + x) * 4, q = (ry * w + x) * 4;
          if (b[o + 3] !== 255) continue;
          opaque++;
          const d = Math.max(Math.abs(px[q] - b[o]), Math.abs(px[q + 1] - b[o + 1]), Math.abs(px[q + 2] - b[o + 2]));
          if (d === 0) same++;
          if (d > worst) worst = d;
        }
      }
      return { k, w, h, opaque, same, worst, cpu: !!(src.resource && src.resource.byteLength) };
    },
  };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'groundcopy', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: INIT });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!ok, ok);
    if (!ok) return;
    const cdp = await P.ctx.newCDPSession(P.page);
    await cdp.send('HeapProfiler.enable').catch(() => {});
    /* the ground settled: nothing in flight, nothing short of a picture */
    const settle = () => P.page.waitForFunction(() => {
      const t = window.__btWorldTrial && window.__btWorldTrial.stats;
      return t && t.resident > 0 && t.loading === 0 && t.short === 0;
    }, null, { timeout: 60000 }).then(() => P.page.waitForTimeout(1500)).catch(() => {});
    const sample = async () => {
      await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
      await P.page.waitForTimeout(300);
      await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
      const heap = await cdp.send('Runtime.getHeapUsage').catch(() => ({}));
      const pg = await P.page.evaluate(() => {
        const t = window.__btWorldTrial.stats;
        return { resident: t.resident, ...window.__gcopy.alive() };
      });
      return { ...pg, buffersMB: +((heap.backingStorageSize || 0) / 1048576).toFixed(1) };
    };
    /* the pieces on screen now that the test holds a copy of */
    const checkHere = async (label) => {
      const res = await P.page.evaluate(() => {
        const g = window.__gcopy, have = new Set(g.keys()), out = [];
        for (const k of g.pieces().keys()) if (have.has(k)) out.push(g.check(k));
        return out;
      });
      const good = res.filter((r) => !r.err && r.opaque > 0.9 * r.w * r.h && r.same === r.opaque);
      console.log(`    ${label}: ${res.length} piece(s) read back -- ${JSON.stringify(res.map((r) => r.err ? `${r.k} ${r.err}` : `${r.k} ${r.same}/${r.opaque} same, worst ${r.worst}${r.cpu ? ', page copy kept' : ''}`))}`);
      return { res, good };
    };

    await settle();
    await P.page.waitForTimeout(4000);   /* past the zone gate's warm pieces (WARM_KEEP_MS) */
    const a = await sample();
    console.log(`    standing: ${JSON.stringify(a)}`);
    const c1 = await checkHere('standing');
    rec.ok(`the GPU holds the ground exactly as the worker laid it: ${c1.good.length} of ${c1.res.length} piece(s) read back identical`,
      c1.res.length >= 2 && c1.good.length === c1.res.length, c1.res);
    rec.ok(`...and the page keeps none of its colours: ${a.alive} of ${a.laid} pieces' alive after a GC, ${a.mb} MB (${a.resident} standing; main: one a piece, 34 MB)`,
      a.resident >= 20 && a.alive === 0, a);

    /* ── a walk across the commons: pieces laid ahead and let go behind ── */
    const home = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    for (const [dx, dy] of [[700, 0], [700, 600], [-500, 600], [-500, -300]]) {
      await H.hopTo(P, home.x + dx, home.y + dy, { tries: 60, step: 120, gap: 120 });
      await P.page.waitForTimeout(600);
    }
    await settle();
    const b = await sample();
    console.log(`    after the walk: ${JSON.stringify(b)}`);
    const c2 = await checkHere('after the walk');
    rec.ok(`after a walk across the commons (${b.laid} pieces laid in all) the page keeps none: ${b.alive} alive, ${b.mb} MB`,
      b.laid > a.laid && b.alive === 0, b);
    rec.ok(`...and the ground there is the worker's to the pixel: ${c2.good.length} of ${c2.res.length}`,
      c2.res.length >= 1 && c2.good.length === c2.res.length, c2.res);

    /* ── a black screen's rebuild: a new renderer, the ground laid again ── */
    await P.page.evaluate(() => window._rebuildRenderer && window._rebuildRenderer('mp-groundcopy'));
    await P.page.waitForTimeout(6000);
    await settle();
    const c = await sample();
    console.log(`    after a rebuild: ${JSON.stringify(c)}`);
    const c3 = await checkHere('after a rebuild');
    rec.ok(`a rebuilt renderer lays the ground again, drawn from the GPU only: ${c.resident} pieces standing, ${c3.good.length} of ${c3.res.length} read back identical`,
      c.resident >= 20 && c3.res.length >= 2 && c3.good.length === c3.res.length, c3.res);
    rec.ok(`...and keeps none of the colours either: ${c.alive} alive, ${c.mb} MB`, c.alive === 0, c);
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
