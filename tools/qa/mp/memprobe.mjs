/* ═══ WHAT THE PAGE HOLDS, READ THE SAME WAY BY EVERY MEMORY SCENARIO (v2.3.3101) ═══
 *
 * Moved here from mp-memledger (v2.3.3075) when mp-membudget arrived, so the
 * land tour and the budget on every PR measure with one ruler: a number in
 * tools/qa/mp/memory-budget.mjs means what the tour's numbers mean.
 *
 *   MEM_INIT          an init script (H.newPlayer's `init`): every 2D canvas
 *                     the page makes and every AudioBuffer it decodes, by weak
 *                     reference, and `window.__memLedger()` to count them --
 *                     so a reading is what is still REACHABLE, never what was
 *                     ever made.  A canvas with a WebGL context is the
 *                     screen, counted by the GPU's own figure, not here.
 *   memSampler(P, browser)
 *     .sample(label)  after two forced GCs: the asset cache (__btTex), the
 *                     GPU's textures (__btGpuTex), the 2D canvases, decoded
 *                     sound (and BT_AUDIO.decodedMB, the game's own count),
 *                     the main thread's JS heap and its ArrayBuffers.
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
  window.__memLedger = () => {
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
    return {
      cache: t ? t.mb : null, gpu: g ? g.mb : null,
      canvasMB: +(cb / 1048576).toFixed(1), canvasN: cn, canvasTop: top,
      decodedMB: +(ab / 1048576).toFixed(1), decodedN: an, soundHeld: snd,
    };
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
  const sample = async (label) => {
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    await P.page.waitForTimeout(300);
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    const heap = await cdp.send('Runtime.getHeapUsage').catch(() => ({}));
    const pg = await P.page.evaluate(() => {
      const S = window._gameState.current;
      return { zone: S.currentZone, ...window.__memLedger() };
    });
    return { label, ...pg, heapMB: +((heap.usedSize || 0) / 1048576).toFixed(1),
      buffersMB: heap.backingStorageSize != null ? +(heap.backingStorageSize / 1048576).toFixed(1) : null };
  };
  return { cdp, sample, workers };
}
