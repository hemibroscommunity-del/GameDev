/* ═══ WHAT THE GPU HOLDS IN THE WHEEL, NAMED, AND ITS PEAKS (v2.3.3037) ═══
 *
 * Owner, 2026-10-05: "are there any quick wins when it comes to freeing up
 * memory? It happens too often that the screen goes black".
 *
 * mp-wheelmem says HOW MUCH the GPU holds on the walk out; this says WHAT, and
 * what it PEAKS at on the two trips every player makes: the way in (the
 * client starts in today's town and is taken down its stairs into the Wheel)
 * and the way back from a death (the worker's respawn is today's town, and the
 * same trip again).  A phone (390 x 844, 3x):
 *   1. logs in to the Wheel: the GPU's peak on the way in, and what it holds
 *      on arrival (window.__btGpuTex: pictures from a file, canvases, render
 *      textures, grouped by folder, biggest first) and after standing GA_WAIT s;
 *   2. walks to the Flame Fields' goblins and dies (no god mode), back through
 *      today's town to the Wheel's Brotown: the peak on that trip, and what it
 *      holds once back.
 * Beside each, the asset cache (__btTex, decoded) and the GPU's own count (a
 * shim on WebGL's calls).  And (v2.3.3037) neither trip loads today's town's
 * map, its largest picture: a stop under one veil that nobody sees.  Results
 * in the log and tools/qa/mp/out/gpuaudit.json.
 * QA_GA_NODIE=1 skips the death.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const WAIT_S = +(process.env.GA_WAIT || 20);
const NODIE = !!process.env.QA_GA_NODIE;

/* the GPU's own count: texture and renderbuffer bytes allocated, less deleted,
   and the highest it has been since the last __gpuPeakReset() (mp-wheelmem's
   shim, with a resettable peak) */
const GPU_SHIM = () => {
  const protos = [window.WebGL2RenderingContext, window.WebGLRenderingContext].filter(Boolean).map((c) => c.prototype);
  const sizes = new Map();
  const bound = new WeakMap();
  const rbBound = new WeakMap();
  let tex = 0, rb = 0, peak = 0;
  const bump = () => { if (tex + rb > peak) peak = tex + rb; };
  const dims = (src) => src ? [src.videoWidth || src.naturalWidth || src.displayWidth || src.codedWidth || src.width || 0,
    src.videoHeight || src.naturalHeight || src.displayHeight || src.codedHeight || src.height || 0] : [0, 0];
  for (const P of protos) {
    const bind = P.bindTexture;
    P.bindTexture = function (target, t) { let m = bound.get(this); if (!m) { m = {}; bound.set(this, m); } m[target] = t; return bind.apply(this, arguments); };
    const put = (ctx, target, level, w, h) => {
      if (level !== 0) return;
      const t = (bound.get(ctx) || {})[target >= 0x8515 && target <= 0x851A ? 0x8513 : target];
      if (!t) return;
      const was = sizes.get(t) || 0, now = (w | 0) * (h | 0) * 4;
      sizes.set(t, now); tex += now - was; bump();
    };
    const ti = P.texImage2D;
    P.texImage2D = function (target, level) {
      let w, h;
      if (arguments.length >= 9) { w = arguments[3]; h = arguments[4]; } else { [w, h] = dims(arguments[arguments.length - 1]); }
      put(this, target, level, w, h);
      return ti.apply(this, arguments);
    };
    if (P.texStorage2D) { const ts = P.texStorage2D; P.texStorage2D = function (target, levels, fmt, w, h) { put(this, target, 0, w, h); return ts.apply(this, arguments); }; }
    const del = P.deleteTexture;
    P.deleteTexture = function (t) { const s = sizes.get(t); if (s != null) { tex -= s; sizes.delete(t); } return del.apply(this, arguments); };
    const bindRb = P.bindRenderbuffer;
    P.bindRenderbuffer = function (target, r) { rbBound.set(this, r); return bindRb.apply(this, arguments); };
    const rbPut = (ctx, w, h, samples) => { const r = rbBound.get(ctx); if (!r) return; const was = sizes.get(r) || 0, now = (w | 0) * (h | 0) * 4 * Math.max(1, samples | 0); sizes.set(r, now); rb += now - was; bump(); };
    const rbs = P.renderbufferStorage;
    P.renderbufferStorage = function (target, fmt, w, h) { rbPut(this, w, h, 1); return rbs.apply(this, arguments); };
    if (P.renderbufferStorageMultisample) { const rbm = P.renderbufferStorageMultisample; P.renderbufferStorageMultisample = function (target, samples, fmt, w, h) { rbPut(this, w, h, samples); return rbm.apply(this, arguments); }; }
    const delRb = P.deleteRenderbuffer;
    P.deleteRenderbuffer = function (r) { const s = sizes.get(r); if (s != null) { rb -= s; sizes.delete(r); } return delRb.apply(this, arguments); };
  }
  const mb = (b) => +(b / 1048576).toFixed(1);
  window.__gpuMem = () => ({ tex: mb(tex), rb: mb(rb), peak: mb(peak), n: sizes.size });
  window.__gpuPeakReset = () => { peak = tex + rb; };
  /* the asset cache's peak too, sampled: a load and its free can both land
     between two looks, so it is read every 250 ms in the page */
  let cachePeak = 0;
  /* ...and whether today's town's map (its largest picture, 11.3 MB) or its
     NPCs' walk strips were ever in the cache -- since v2.3.3037 neither is
     loaded for the stop on the way to the Wheel */
  let townSeen = null;
  setInterval(() => {
    try {
      const t = window.__btTex && window.__btTex(true);
      if (t && t.mb > cachePeak) cachePeak = t.mb;
      if (t && t.list && !townSeen) {
        const hit = t.list.find((r) => /\/maps\/town_/.test(String(r.k)));
        if (hit) townSeen = { k: String(hit.k).replace(/^https?:\/\/[^/]+/, ''), zone: window._gameState && window._gameState.current && window._gameState.current.currentZone, at: Date.now() };
      }
    } catch (e) { /* not up yet */ }
  }, 250);
  window.__townSeen = () => townSeen;
  window.__townSeenReset = () => { townSeen = null; };
  window.__cachePeak = () => cachePeak;
  window.__cachePeakReset = () => { try { const t = window.__btTex && window.__btTex(); cachePeak = t ? t.mb : 0; } catch (e) { cachePeak = 0; } };
};

const audit = (P) => P.page.evaluate(() => {
  const g = window.__btGpuTex ? window.__btGpuTex(4000) : null;
  const t = window.__btTex ? window.__btTex(true) : null;
  const shim = window.__gpuMem ? window.__gpuMem() : null;
  const S = window._gameState.current;
  const base = { zone: S.currentZone, cache: t ? t.mb : null, cachePeak: window.__cachePeak ? window.__cachePeak() : null, shim,
    townSeen: window.__townSeen ? window.__townSeen() : null };
  /* the cache's biggest residents by folder */
  const cacheTop = {};
  for (const r of (t && t.list) || []) {
    const parts = String(r.k || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0].split('/').filter(Boolean);
    const key = '/' + parts.slice(0, Math.max(1, Math.min(3, parts.length - 1))).join('/');
    cacheTop[key] = +((cacheTop[key] || 0) + r.mb).toFixed(1);
  }
  base.cacheTop = Object.entries(cacheTop).sort((a, b) => b[1] - a[1]).slice(0, 25);
  if (!g || g.err) return { ...base, err: g ? g.err : 'no __btGpuTex' };
  const groups = {};
  for (const r of g.list) {
    let key;
    if (r.kind === 'file') {
      const parts = r.label.split('/').filter(Boolean);
      key = 'file /' + parts.slice(0, Math.max(1, Math.min(3, parts.length - 1))).join('/');
    } else key = r.kind + ' ' + (r.label ? r.label.slice(0, 40) : '(no label)') + ' ' + r.w + 'x' + r.h;
    const o = groups[key] || (groups[key] = { mb: 0, n: 0, idleMax: 0 });
    o.mb += r.mb; o.n++; o.idleMax = Math.max(o.idleMax, r.idleS || 0);
  }
  const top = Object.entries(groups).map(([k, o]) => ({ k, mb: +o.mb.toFixed(1), n: o.n, idleMax: o.idleMax }))
    .sort((a, b) => b.mb - a.mb);
  return { ...base, n: g.n, mb: g.mb, byKind: g.byKind, canvas: g.canvas, top, cacheNotOnGpu: g.cacheNotOnGpu, list: g.list.slice(0, 200) };
});

const print = (when, a) => {
  if (!a) { console.log(`    ${when}: (none)`); return; }
  console.log(`    ${when}: zone ${a.zone}; GPU ${a.shim && a.shim.tex} MB textures + ${a.shim && a.shim.rb} MB buffers (peak since the mark ${a.shim && a.shim.peak}); renderer's list ${a.mb} MB in ${a.n} ${JSON.stringify(a.byKind)}; asset cache ${a.cache} MB (peak ${a.cachePeak}); canvas ${JSON.stringify(a.canvas)}`);
  if (a.err) { console.log(`      ${a.err}`); return; }
  for (const g of (a.top || []).slice(0, 40)) console.log(`      ${String(g.mb).padStart(6)} MB  x${String(g.n).padEnd(4)} idle<=${g.idleMax}s  ${g.k}`);
  console.log(`      cache by folder: ${JSON.stringify(a.cacheTop)}`);
  if (a.cacheNotOnGpu) {
    console.log(`      in the cache, never on the GPU: ${a.cacheNotOnGpu.mb} MB`);
    for (const [k, mb] of a.cacheNotOnGpu.top.slice(0, 25)) console.log(`        ${String(mb).padStart(6)} MB  ${k}`);
  }
};

/* QA_GA_THUMBS=N: a thumbnail of each of the N biggest canvases with no
   label (on the GPU or only in the cache), written to out/gpuaudit-thumb-<i>.png
   -- a canvas made in code has no file name, so its picture is its name */
const THUMBS = +(process.env.QA_GA_THUMBS || 0);
const thumbs = (P, n) => P.page.evaluate((n) => {
  const out = [];
  const seen = new Set();
  const cands = [];
  const consider = (src) => {
    if (!src || src.destroyed || seen.has(src.uid) || src.label) return;
    seen.add(src.uid);
    const res = src.resource;
    if (!res || typeof res.getContext !== 'function' || !(res.width > 0) || !(res.height > 0)) return;
    cands.push(src);
  };
  try {
    const g = window.__btGpuTexSources ? window.__btGpuTexSources() : [];
    g.forEach(consider);
  } catch (e) { /* none */ }
  cands.sort((a, b) => b.pixelWidth * b.pixelHeight - a.pixelWidth * a.pixelHeight);
  for (const src of cands.slice(0, n)) {
    const c = src.resource;
    const k = Math.min(1, 480 / Math.max(c.width, c.height));
    const t = document.createElement('canvas');
    t.width = Math.max(1, Math.round(c.width * k)); t.height = Math.max(1, Math.round(c.height * k));
    const x = t.getContext('2d');
    x.fillStyle = '#556'; x.fillRect(0, 0, t.width, t.height);
    try { x.drawImage(c, 0, 0, t.width, t.height); } catch (e) { /* tainted */ }
    out.push({ w: c.width, h: c.height, url: t.toDataURL('image/png') });
  }
  return out;
}, n);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'gpuaudit', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: GPU_SHIM });
  const rows = {};
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!ok, ok);
    if (!ok) return;
    await P.page.waitForTimeout(5000);
    rows.arrival = await audit(P);   /* its shim peak: the whole way in */
    print('on arrival (peak: the way in)', rows.arrival);
    /* v2.3.3037: the stop in today's town on the way in loaded none of its art */
    rec.ok(`the way in loaded nothing of today's town for the stop (its map: ${rows.arrival.townSeen ? 'loaded, ' + rows.arrival.townSeen.k + ' in ' + rows.arrival.townSeen.zone : 'never'})`,
      !rows.arrival.townSeen, rows.arrival.townSeen);
    await P.page.evaluate(() => { window.__gpuPeakReset(); window.__cachePeakReset(); });
    await P.page.waitForTimeout(WAIT_S * 1000);
    rows.stood = await audit(P);
    print(`after standing ${WAIT_S} s`, rows.stood);
    if (THUMBS > 0) {
      const { writeFileSync: wf } = await import('node:fs');
      const t = await thumbs(P, THUMBS).catch(() => []);
      t.forEach((o, i) => { wf(join(OUT, `gpuaudit-thumb-${i}.png`), Buffer.from(o.url.split(',')[1], 'base64')); console.log(`    thumb ${i}: ${o.w}x${o.h}`); });
    }

    if (!NODIE) {
      const myId = await H.readState(P, (S) => S.myId);
      await P.page.evaluate(() => { const R = window._gameState.current.rpg; R._quests = R._quests || {}; R._quests.tut_1 = true; });
      const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
      const gob = WHEEL_SPAWNS.ember.points[0];
      await H.hopTo(P, gob[0], gob[1] + 40, { tries: 120 });
      await P.page.waitForTimeout(3000);
      rows.atFight = await audit(P);
      print('at the fight', rows.atFight);
      await P.page.evaluate(() => { window.__gpuPeakReset(); window.__cachePeakReset(); window.__townSeenReset(); });
      let died = false;
      const tDie = Date.now();
      while (Date.now() - tDie < 150000) {
        const s = await P.page.evaluate(() => {
          const S = window._gameState.current;
          if (S._dying) return { dying: true };
          const live = (S.monsters || []).filter((m) => m && m.alive !== false && (m.curHp == null || m.curHp > 0));
          let best = null, bd = Infinity;
          for (const m of live) { const d = Math.hypot(m.x - S.player.x, m.y - S.player.y); if (d < bd) { bd = d; best = m; } }
          return { dying: false, best: best ? { x: best.x, y: best.y, d: bd } : null };
        });
        if (s.dying) { died = true; break; }
        if (s.best) await H.hopTo(P, s.best.x + 10, s.best.y, { tries: s.best.d > 150 ? 20 : 2, step: 80 });
        else await P.page.waitForTimeout(400);
      }
      rec.ok('died to the goblins (guard)', died, { died });
      if (died) {
        const back = [];
        for (let i = 0; i < 240; i++) {
          const z = await H.readState(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading, dying: !!S._dying }));
          if (!back.length || back[back.length - 1] !== z.zone) back.push(z.zone);
          if (z.zone === 'wheel' && !z.loading && !z.dying && back.includes('town')) break;
          await P.page.waitForTimeout(500);
        }
        await P.page.waitForTimeout(5000);
        rows.back = await audit(P);
        rows.back.trip = back;
        print(`back in the Wheel after the death (${back.join(' -> ')}; peak: the trip)`, rows.back);
        rec.ok(`...and the death's trip through today's town loaded nothing of it either (its map: ${rows.back.townSeen ? 'loaded in ' + rows.back.townSeen.zone : 'never'}; ${back.join(' -> ')})`,
          back.includes('town') && !rows.back.townSeen, { back, townSeen: rows.back.townSeen });
        void myId;
      }
    }
    writeFileSync(join(OUT, 'gpuaudit.json'), JSON.stringify(rows, null, 1));
    const a = rows.stood;
    rec.ok(`listed what the GPU holds in the Wheel: ${a && a.mb} MB in ${a && a.n} textures; peaks: the way in ${rows.arrival && rows.arrival.shim && rows.arrival.shim.peak} MB, the death trip ${rows.back && rows.back.shim && rows.back.shim.peak} MB`,
      !!a && !a.err && a.n > 0, a && { mb: a.mb, n: a.n, byKind: a.byKind });
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
