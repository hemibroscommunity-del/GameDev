/* ═══ WHAT THE WHEEL HOLDS ON THE WAY TO A FIGHT (v2.3.3017) ═══
 *
 * Owner, 2026-10-04: "I was fighting fire goblins and my screen went black."
 * docs/WORLD-MAP-PIPELINE.md: "iPhone Safari kills the tab at about 250 MB of
 * textures".  The game's own probe (__btTex) counts only the pictures in
 * Pixi's asset cache -- not the Wheel's ground pieces, the render textures
 * (baked bodies, shadows), the name plates' text, or the screen itself.
 *
 * This walks a phone from the Wheel's Brotown out to a land's first monsters
 * (FF_HOME, ember by default) and, at each stop, measures both: the cache
 * (__btTex) and EVERY texture and renderbuffer the GPU was asked to allocate,
 * counted by a shim on WebGL's own calls (init script: a platform API), less
 * the ones deleted.  Once at today's view and once at `?zoom=0.8`, the view
 * before v2.3.3011, so the cost of each is plain.  Results in the log and
 * tools/qa/mp/out/wheelmem.json.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const HOME = process.env.FF_HOME || 'ember';
const SETTLE_MS = +(process.env.WM_SETTLE || 5000);

/* counts the bytes behind every texture / renderbuffer WebGL allocates */
const GPU_SHIM = () => {
  const protos = [window.WebGL2RenderingContext, window.WebGLRenderingContext].filter(Boolean).map((c) => c.prototype);
  const sizes = new Map();        /* texture/renderbuffer object -> bytes */
  const bound = new WeakMap();    /* ctx -> { target: texture } */
  const rbBound = new WeakMap();  /* ctx -> renderbuffer */
  let tex = 0, rb = 0, peakTex = 0;
  const dims = (src) => src ? [src.videoWidth || src.naturalWidth || src.displayWidth || src.codedWidth || src.width || 0,
    src.videoHeight || src.naturalHeight || src.displayHeight || src.codedHeight || src.height || 0] : [0, 0];
  for (const P of protos) {
    const bind = P.bindTexture;
    P.bindTexture = function (target, t) {
      let m = bound.get(this); if (!m) { m = {}; bound.set(this, m); }
      m[target] = t;
      return bind.apply(this, arguments);
    };
    const put = (ctx, target, level, w, h) => {
      if (level !== 0) return;
      const tgt = target >= 0x8515 && target <= 0x851A ? 0x8513 : target;
      const t = (bound.get(ctx) || {})[tgt];
      if (!t) return;
      const was = sizes.get(t) || 0, now = (w | 0) * (h | 0) * 4;
      sizes.set(t, now);
      tex += now - was;
      if (tex > peakTex) peakTex = tex;
    };
    const ti = P.texImage2D;
    P.texImage2D = function (target, level) {
      let w, h;
      if (arguments.length >= 9) { w = arguments[3]; h = arguments[4]; } else { [w, h] = dims(arguments[arguments.length - 1]); }
      put(this, target, level, w, h);
      return ti.apply(this, arguments);
    };
    if (P.texStorage2D) {
      const ts = P.texStorage2D;
      P.texStorage2D = function (target, levels, fmt, w, h) { put(this, target, 0, w, h); return ts.apply(this, arguments); };
    }
    const del = P.deleteTexture;
    P.deleteTexture = function (t) { const s = sizes.get(t); if (s != null) { tex -= s; sizes.delete(t); } return del.apply(this, arguments); };
    const bindRb = P.bindRenderbuffer;
    P.bindRenderbuffer = function (target, r) { rbBound.set(this, r); return bindRb.apply(this, arguments); };
    const rbPut = (ctx, w, h, samples) => {
      const r = rbBound.get(ctx); if (!r) return;
      const was = sizes.get(r) || 0, now = (w | 0) * (h | 0) * 4 * Math.max(1, samples | 0);
      sizes.set(r, now); rb += now - was;
    };
    const rbs = P.renderbufferStorage;
    P.renderbufferStorage = function (target, fmt, w, h) { rbPut(this, w, h, 1); return rbs.apply(this, arguments); };
    if (P.renderbufferStorageMultisample) {
      const rbm = P.renderbufferStorageMultisample;
      P.renderbufferStorageMultisample = function (target, samples, fmt, w, h) { rbPut(this, w, h, samples); return rbm.apply(this, arguments); };
    }
    const delRb = P.deleteRenderbuffer;
    P.deleteRenderbuffer = function (r) { const s = sizes.get(r); if (s != null) { rb -= s; sizes.delete(r); } return delRb.apply(this, arguments); };
  }
  window.__gpuMem = () => ({ tex: +(tex / 1048576).toFixed(1), rb: +(rb / 1048576).toFixed(1), peakTex: +(peakTex / 1048576).toFixed(1), n: sizes.size });
};

const sample = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const t = window.__btTex ? window.__btTex(true) : null;
  const g = window.__gpuMem ? window.__gpuMem() : null;
  const cv = document.querySelector('canvas');
  const art = window.__btWheelArt ? window.__btWheelArt() : null;
  /* the cache's biggest residents, grouped by folder */
  const groups = {};
  for (const r of (t && t.list) || []) {
    const k = String(r.k || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    const parts = k.split('/').filter(Boolean);
    const key = parts.slice(0, Math.min(3, parts.length - 1)).join('/') || k.slice(0, 40);
    groups[key] = +((groups[key] || 0) + r.mb).toFixed(1);
  }
  const top = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 12);
  return { zone: S.currentZone, x: Math.round(S.player.x), y: Math.round(S.player.y), cache: t ? t.mb : null, gpu: g,
    canvas: cv ? [cv.width, cv.height] : null, mons: (S.monsters || []).length, looks: art ? Object.keys(art.looks || {}) : null, top };
});

async function walk(browser, wsPort, webPort, query, label, rows) {
  const P = await H.newPlayer(browser, { name: label, wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: GPU_SHIM, query });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    if (!ok) return null;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 15 });
    /* the gate round the commons, open (the panel's "Finish all quests" is not needed: the worker's god mode and a quest flag do) */
    await P.page.evaluate(() => { const R = window._gameState.current.rpg; R._quests = R._quests || {}; R._quests.tut_1 = true; });
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS[HOME].points[0];
    const start = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    const out = [];
    await P.page.waitForTimeout(SETTLE_MS);
    out.push({ stop: 0, ...(await sample(P)) });
    const N = 6;
    for (let i = 1; i <= N; i++) {
      const tx = start.x + (at[0] + 200 - start.x) * (i / N), ty = start.y + (at[1] + 200 - start.y) * (i / N);
      await H.hopTo(P, tx, ty, { tries: 80 });
      await P.page.waitForTimeout(SETTLE_MS);
      out.push({ stop: i, ...(await sample(P)) });
    }
    rows[label] = out;
    for (const r of out) {
      console.log(`    ${label} stop ${r.stop} (${r.x},${r.y}) ${r.zone}: cache ${r.cache} MB, GPU textures ${r.gpu && r.gpu.tex} MB (+${r.gpu && r.gpu.rb} MB buffers, peak ${r.gpu && r.gpu.peakTex}), ${r.gpu && r.gpu.n} objects, canvas ${r.canvas}, looks ${JSON.stringify(r.looks)}`);
    }
    const last = out[out.length - 1];
    console.log(`    ${label} at the fight, cache by folder: ${JSON.stringify(last.top)}`);
    return out;
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const rows = {};
  const now = await walk(browser, wsPort, webPort, '', 'today', rows);
  const before = await walk(browser, wsPort, webPort, 'zoom=0.8', 'zoom08', rows);
  writeFileSync(join(OUT, 'wheelmem.json'), JSON.stringify(rows, null, 1));
  const peak = (o) => (o ? Math.max(...o.map((r) => (r.gpu ? r.gpu.tex + r.gpu.rb : 0))) : null);
  const peakCache = (o) => (o ? Math.max(...o.map((r) => r.cache || 0)) : null);
  rec.ok(`measured the walk to the ${HOME} land's first monsters: GPU ${peak(now)} MB at the most today (cache ${peakCache(now)}), ${peak(before)} MB at ?zoom=0.8 (cache ${peakCache(before)})`,
    !!now && !!before, { now: now && now.map((r) => [r.stop, r.cache, r.gpu]), before: before && before.map((r) => [r.stop, r.cache, r.gpu]) });
}
