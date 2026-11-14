/* ═══ WHAT THE PAGE HOLDS, READ THE SAME WAY BY EVERY MEMORY SCENARIO (v2.3.3101) ═══
 *
 * Moved here from mp-memledger (v2.3.3075) when mp-membudget arrived, so the
 * land tour and the budget on every PR measure with one ruler: a number in
 * tools/qa/mp/memory-budget.mjs means what the tour's numbers mean.
 *
 *   MEM_INIT          an init script (H.newPlayer's `init`): every 2D canvas
 *                     the page makes and every AudioBuffer it decodes or makes
 *                     (v2.3.3706), by weak reference, and `window.__memLedger()`
 *                     to count them --
 *                     so a reading is what is still REACHABLE, never what was
 *                     ever made.  A canvas with a WebGL context is the
 *                     screen, counted by the GPU's own figure, not here.
 *   memSampler(P, browser)
 *     .sample(label)  after two forced GCs: the asset cache (__btTex), the
 *                     GPU's textures (__btGpuTex), the 2D canvases, decoded
 *                     sound (and BT_AUDIO.decodedMB, the game's own count),
 *                     the main thread's JS heap and its ArrayBuffers.
 *     .sample(label, { rows: true })
 *                     v2.3.5242 (card P, the asset door's measure): the same
 *                     reading, and with it EVERY row, not the top one, read
 *                     in the same moment, after the same two collections:
 *                     each texture on the chip, each picture the asset cache
 *                     holds in the page, the colour numbers the page keeps,
 *                     each decoded sound by its file, and the palette atlas's
 *                     rows.  tools/assets/fightmb.mjs matches each row to its
 *                     family by its label's path.  Opt-in only: without it the
 *                     page is asked exactly what it is asked today (the
 *                     memory check runs on every PR).
 *     .workers()      each background worker's heap and buffers (the ground
 *                     worker holds the Wheel's plan and pictures), after a GC
 *                     in each.
 */

export const MEM_INIT = () => {
  const canv = [];
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
    try { if (ctx && /^webgl/.test(String(type))) glCanvas.add(this); } catch (e) { /* ignore */ }
    return ctx;
  };
  const bufs = [];
  const B = window.BaseAudioContext || window.AudioContext;
  if (B && B.prototype.decodeAudioData) {
    const dad = B.prototype.decodeAudioData;
    B.prototype.decodeAudioData = function (buf, ok, bad) {
      const note = (ab) => { try { bufs.push(new WeakRef(ab)); } catch (e) { /* ignore */ } return ab; };
      const p = dad.call(this, buf, ok ? (ab) => { note(ab); ok(ab); } : undefined, bad);
      return p && p.then ? p.then((ab) => { if (!ok) note(ab); return ab; }) : p;
    };
  }
  /* v2.3.3706: and every buffer the page MAKES -- a stereo sound whose sides
     are one is kept as a one-channel buffer of the context's createBuffer
     (data/soundFold.js), which the decode hook above never saw: counting
     decodes alone, the fold's six went missing from the line (6.3 MB less
     sound where 3.2 MB were saved) */
  if (B && B.prototype.createBuffer) {
    const cb = B.prototype.createBuffer;
    B.prototype.createBuffer = function () {
      const ab = cb.apply(this, arguments);
      try { bufs.push(new WeakRef(ab)); } catch (e) { /* ignore */ }
      return ab;
    };
  }
  window.__memLedger = (wantRows) => {
    let cb = 0, cn = 0;
    const sizes = [];
    for (const r of canv) {
      const el = r.deref();
      if (!el || glCanvas.has(el)) continue;
      const w = el.width | 0, h = el.height | 0;
      if (!w || !h) continue;
      cn++; cb += w * h * 4; sizes.push(w + 'x' + h);
    }
    const bySize = {};
    for (const s of sizes) bySize[s] = (bySize[s] || 0) + 1;
    const top = Object.entries(bySize).map(([k, n]) => { const [w, h] = k.split('x').map(Number); return { k, n, mb: +(n * w * h * 4 / 1048576).toFixed(1) }; })
      .sort((a, b) => b.mb - a.mb).slice(0, 8);
    let ab = 0, an = 0;
    for (const r of bufs) { const a = r.deref(); if (a) { an++; ab += a.length * a.numberOfChannels * 4; } }
    const t = window.__btTex ? window.__btTex() : null;
    const g = window.__btGpuTex ? window.__btGpuTex(1) : null;
    const snd = window.BT_AUDIO && window.BT_AUDIO.decodedMB ? window.BT_AUDIO.decodedMB() : null;
    const out = {
      cache: t ? t.mb : null, gpu: g ? g.mb : null,
      canvasMB: +(cb / 1048576).toFixed(1), canvasN: cn, canvasTop: top,
      decodedMB: +(ab / 1048576).toFixed(1), decodedN: an, soundHeld: snd,
    };
    if (wantRows) out.rows = window.__memRows();
    return out;
  };
  /* ═══ v2.3.5242: EVERY ROW, FOR THE ASSET DOOR'S CENSUS (opt-in) ═══
     Read only when a scenario asks (sample(label, { rows: true })).  Each row
     is a label (an address without its host and query, or the name a picture
     made in play was given) and its MB:
       chip     every texture on the graphics chip (__btGpuTex's own list and
                its own sizes: bytes a pixel by format, x 4/3 with mipmaps),
                with its kind and, for colour numbers, its row of the atlas;
       page     every picture the asset cache holds in the page, counted by
                __btTex's own rule (four bytes a pixel, as the artCache line
                counts it), named by its source's label or its file;
       numbers  the colour numbers the page keeps beside a texture (a palette
                source whose numbers are still its resource: one byte a
                pixel), seen through the chip's and the cache's sources and
                the monsters' strips (__btPicNumSources);
       sound    each decoded sound by its file (BT_AUDIO's own maps: a
                sample's file is its tag, a zone track its address), a buffer
                two keys share counted once; `soundTotal` is BT_AUDIO's own
                count, and the line (decodedMB above) counts every buffer the
                page can still reach, so the two can differ;
       palette  the atlas's rows: used, the most, how often it was full;
                and the monsters' bundles (__btPicNumbers). */
  window.__memRows = () => {
    const clean = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0].split('#')[0];
    const r = { chip: [], page: [], numbers: [], sound: [], soundTotal: null, palette: null, picNumbers: null };
    const byUid = new Map();
    try {
      for (const s of (window.__btGpuTexSources ? window.__btGpuTexSources() : [])) if (s && !s.destroyed) byUid.set(s.uid, s);
      for (const s of (window.__btPicNumSources ? window.__btPicNumSources() : [])) if (s && !s.destroyed) byUid.set(s.uid, s);
    } catch (e) { /* a probe that moved: the rows it gave stand */ }
    /* a picture with no label is named by its own file where it has one */
    const srcOf = (s) => { const res = s && s.resource; return clean(res && (res.currentSrc || res.src) || ''); };
    try {
      const g = window.__btGpuTex ? window.__btGpuTex(1e9) : null;
      for (const x of (g && g.list) || []) {
        const s = byUid.get(x.uid);
        r.chip.push([x.label || srcOf(s), x.mb, x.kind, s && s._btPal ? s._btPal.row : null]);
      }
    } catch (e) { /* none */ }
    /* the page's copies, counted by __btTex's own rule (a destroyed source
       is not held, one let go of is not either, a canvas holds its own
       size, four bytes a pixel) but each named by its source: __btTex's own
       list names a picture the cache keys by its element "[object
       HTMLImageElement]" */
    try {
      for (const s of (window.__btCacheSources ? window.__btCacheSources() : [])) {
        if (!s || s.destroyed || (s.resource && s.resource.__btReleased)) continue;
        let w = s.pixelWidth || s.width || 0, h = s.pixelHeight || s.height || 0;
        const res = s.resource;
        if (res && typeof res.getContext === 'function') { w = res.width | 0; h = res.height | 0; }
        r.page.push([clean(s.label) || srcOf(s), +((w * h * 4) / 1048576).toFixed(3)]);
      }
    } catch (e) { /* none */ }
    for (const s of byUid.values()) {
      const res = s.resource;
      if (!s._btPal || !res || !ArrayBuffer.isView(res)) continue;
      r.numbers.push([clean(s.label), +(res.byteLength / 1048576).toFixed(3), s._btPal.row]);
    }
    try {
      const A = window.BT_AUDIO;
      if (A) {
        const seen = new Set();
        const add = (file, buf) => {
          if (!buf || seen.has(buf)) return;
          seen.add(buf);
          r.sound.push([clean(String(file).replace(/@low$/, '')), +((buf.length * (buf.numberOfChannels || 1) * 4) / 1048576).toFixed(3)]);
        };
        const tags = A._sampleTag || {};
        for (const k in (A._samples || {})) add(tags[k] || ('sample: ' + k), A._samples[k]);
        for (const u in (A._zoneMusicBuffers || {})) add(u, A._zoneMusicBuffers[u]);
        if (A._globalMusicBuffer) add(A.GLOBAL_MUSIC || 'music: the session track', A._globalMusicBuffer);   /* the session track's file (startGlobalMusic) */
        r.soundTotal = A.decodedMB ? A.decodedMB() : null;
      }
    } catch (e) { /* a half-built audio state */ }
    try { const p = window.__btPalette ? window.__btPalette() : null; if (p) r.palette = { rowsUsed: p.rowsUsed, rowsMax: p.rowsMax, rowsFull: p.rowsFull || 0 }; } catch (e) { /* none */ }
    try { const n = window.__btPicNumbers ? window.__btPicNumbers() : null; if (n) r.picNumbers = { bundles: n.bundles, rows: n.rows, rowsFull: n.rowsFull, strips: n.strips }; } catch (e) { /* none */ }
    return r;
  };
};

export async function memSampler(P, browser) {
  const cdp = await P.ctx.newCDPSession(P.page);
  await cdp.send('HeapProfiler.enable').catch(() => {});
  const bs = await browser.newBrowserCDPSession().catch(() => null);
  const workers = async () => {
    if (!bs) return null;
    const res = [];
    try {
      const { targetInfos } = await bs.send('Target.getTargets');
      let id = 1;
      for (const t of targetInfos.filter((x) => /worker/.test(x.type))) {
        const { sessionId } = await bs.send('Target.attachToTarget', { targetId: t.targetId, flatten: false });
        const ask = (method) => new Promise((resolve) => {
          const mid = id++;
          const on = (ev) => { if (ev.sessionId !== sessionId) return; const m = JSON.parse(ev.message); if (m.id === mid) { bs.off('Target.receivedMessageFromTarget', on); resolve(m.result || null); } };
          bs.on('Target.receivedMessageFromTarget', on);
          bs.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id: mid, method }) }).catch(() => resolve(null));
          setTimeout(() => resolve(null), 8000);
        });
        await ask('HeapProfiler.collectGarbage');
        const hu = await ask('Runtime.getHeapUsage');
        res.push({ url: t.url.replace(/^https?:\/\/[^/]+/, '').slice(-60), heapMB: hu ? +((hu.usedSize || 0) / 1048576).toFixed(1) : null,
          buffersMB: hu && hu.backingStorageSize != null ? +(hu.backingStorageSize / 1048576).toFixed(1) : null });
        await bs.send('Target.detachFromTarget', { sessionId }).catch(() => {});
      }
    } catch (e) { /* no worker targets here */ }
    return res;
  };
  const sample = async (label, opts) => {
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    await P.page.waitForTimeout(300);
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    const heap = await cdp.send('Runtime.getHeapUsage').catch(() => ({}));
    /* v2.3.5242: the rows only when asked (the heap is read above, first) */
    const pg = await P.page.evaluate((wantRows) => {
      const S = window._gameState.current;
      return { zone: S.currentZone, ...(wantRows ? window.__memLedger(true) : window.__memLedger()) };
    }, !!(opts && opts.rows));
    return { label, ...pg, heapMB: +((heap.usedSize || 0) / 1048576).toFixed(1),
      buffersMB: heap.backingStorageSize != null ? +(heap.backingStorageSize / 1048576).toFixed(1) : null };
  };
  return { cdp, sample, workers };
}
