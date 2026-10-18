/* ═══ v2.3.3431: WHERE A PHONE'S FRAME GOES ═══
 *
 * The owner, 2026-10-18: "iterate on what best improves framerate without loss
 * of quality (or negligible loss) for phone gameplay (iPhone, android)".  A
 * frame-rate change is only as good as the measurement that picked it, so this
 * stands ONE phone page (390 x 844, dpr 3: an iPhone's own pixels) in four
 * scenes -- BroTown standing, BroTown walking, a fight at the Flame Fields'
 * inner end, a walk there -- and for each, for BT_PF_MS (default 8 s):
 *
 *   - the game's own frame cost (perfTracker, renderFrame.js): workMs (the
 *     whole frame callback), simMs (the game), renderMs (drawing), and the
 *     renderer's stages (tileMs, entityMs, effectsMs, appMs = Pixi's own
 *     render), p50 / p95 / mean;
 *   - the page's whole main-thread time a second (CDP Performance metrics:
 *     script, layout, style -- what React and the DOM cost outside the frame);
 *   - a CPU profile of the window (CDP Profiler), every function's own time
 *     and its time with what it calls, mapped back to the source file and line
 *     when the build has source maps (QA_DIST=dist-prof, a build made with
 *     `npx vite build --minify false --sourcemap --outDir ../dist-prof`);
 *   - then 3 s of the WebGL calls a frame (draw calls, texture and buffer
 *     uploads, the calls that make the page wait for the GPU), counted by
 *     wrapping the renderer's own context -- a separate window, so the
 *     counting costs nothing in the profile.
 *
 * READ IT AS A RANKING, NOT AS A PHONE'S NUMBERS.  This box draws in software
 * (SwiftShader), so the GPU's share is not a phone's; what the main thread
 * does a frame -- JavaScript, and the GL calls it makes -- carries over, and so
 * does a call that waits for the GPU, which stalls a phone too.
 *
 *   QA_DIST=dist-prof node tools/qa/mp/run.mjs phoneframe
 *   BT_PF_QUERY='nopalette' ...    # extra address switches for the page
 *   BT_PF_SCENES=town,fight ...    # only these scenes
 *   BT_QA_CPU_THROTTLE=4 ...       # a slower phone
 *
 * Writes tools/qa/mp/out/phoneframe.json (every number and the profiles' top
 * lists) and prints a summary. */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { SourceMap } from 'node:module';

const PHONE = { width: 390, height: 844 };
const SCENE_MS = Number(process.env.BT_PF_MS || 8000);
const GL_MS = Number(process.env.BT_PF_GL_MS || 3000);
const PROFILE = process.env.BT_PF_PROFILE !== '0';
const QUERY = process.env.BT_PF_QUERY || '';
const WANT = (process.env.BT_PF_SCENES || 'town,townwalk,fight,landwalk').split(',').map((s) => s.trim()).filter(Boolean);
const TOP = Number(process.env.BT_PF_TOP || 45);
/* the page's device pixel ratio: 3 is an iPhone's own pixels; 1 lets this
   box's software drawing keep up, for a profile with more frames in it */
const DPR = Number(process.env.BT_PF_DPR || 3);

const q = (arr, p) => {
  if (!arr.length) return 0;
  const v = [...arr].sort((a, b) => a - b);
  return +v[Math.min(v.length - 1, Math.floor(v.length * p))].toFixed(2);
};
const mean = (arr) => (arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 0);

/* ── the source maps of the build being served, for the profile's names ── */
function loadMaps() {
  const root = process.env.QA_DIST
    ? (process.env.QA_DIST.startsWith('/') ? process.env.QA_DIST : join(H.REPO, process.env.QA_DIST))
    : join(H.REPO, 'dist');
  const dir = join(root, 'assets');
  const maps = new Map();
  if (!existsSync(dir)) return maps;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.js.map')) continue;
    try { maps.set(f.slice(0, -4), new SourceMap(JSON.parse(readFileSync(join(dir, f), 'utf8')))); } catch { /* unreadable: names stay the bundle's */ }
  }
  return maps;
}
const shortSrc = (s) => {
  if (!s) return '?';
  const i = s.lastIndexOf('node_modules/');
  if (i >= 0) return s.slice(i + 13);
  const j = s.lastIndexOf('/src/');
  if (j >= 0) return s.slice(j + 1);
  const k = s.lastIndexOf('/public/');
  if (k >= 0) return s.slice(k + 1);
  return s.replace(/^.*?:\/\/[^/]*\//, '');
};

/* every function's own (self) time and its time with its callees (total), ms */
function aggregate(profile, maps) {
  const nodes = profile.nodes || [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of nodes) for (const c of n.children || []) parent.set(c, n.id);
  const keyCache = new Map();
  const keyOf = (n) => {
    if (keyCache.has(n.id)) return keyCache.get(n.id);
    const cf = n.callFrame || {};
    let k;
    const fn = cf.functionName || '(anonymous)';
    if (!cf.url) k = fn;
    else {
      const file = basename(cf.url.split('?')[0]);
      const sm = maps.get(file);
      let src = shortSrc(cf.url), line = cf.lineNumber + 1;
      if (sm) {
        try {
          const e = sm.findEntry(cf.lineNumber, cf.columnNumber);
          if (e && e.originalSource) { src = shortSrc(e.originalSource); line = e.originalLine + 1; }
        } catch { /* outside the map */ }
      }
      k = `${fn} ${src}:${line}`;
    }
    keyCache.set(n.id, k);
    return k;
  };
  const fileOf = (k) => { const m = / ([^ ]+):\d+$/.exec(k); return m ? m[1] : k; };
  const self = new Map(), total = new Map(), files = new Map();
  const samples = profile.samples || [], deltas = profile.timeDeltas || [];
  let all = 0, js = 0, native = 0, gc = 0;
  for (let i = 0; i < samples.length; i++) {
    const dt = (deltas[i + 1] != null ? deltas[i + 1] : deltas[i] || 0) / 1000;
    const n = byId.get(samples[i]);
    if (!n) continue;
    all += dt;
    const cf = n.callFrame || {};
    if (cf.url) js += dt;
    else if (cf.functionName === '(garbage collector)') gc += dt;
    else if (cf.functionName && cf.functionName[0] !== '(') native += dt;
    const k = keyOf(n);
    self.set(k, (self.get(k) || 0) + dt);
    const f = fileOf(k);
    files.set(f, (files.get(f) || 0) + dt);
    const seen = new Set();
    for (let id = n.id; id != null; id = parent.get(id)) {
      const kk = keyOf(byId.get(id));
      if (seen.has(kk)) continue;
      seen.add(kk);
      total.set(kk, (total.get(kk) || 0) + dt);
    }
  }
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, +v.toFixed(1)]);
  return { ms: +all.toFixed(1), js: +js.toFixed(1), native: +native.toFixed(1), gc: +gc.toFixed(1), self: top(self, TOP), total: top(total, TOP), files: top(files, 30) };
}

/* ── the page's WebGL calls, counted on the renderer's own context ── */
const GL_INSTALL = () => {
  const r = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  const gl = r && r.gl;
  if (!gl) return false;
  if (gl.__btCount) return true;
  const c = Object.create(null);
  gl.__btCount = c;
  window.__btGlCounts = c;
  window.__btGlOn = false;
  const bpp = 4;
  const srcPx = (s) => (s && ((s.width || s.videoWidth || 0) * (s.height || s.videoHeight || 0))) || 0;
  const bytes = {
    bufferData: (a) => (typeof a[1] === 'number' ? a[1] : (a[1] && a[1].byteLength) || 0),
    bufferSubData: (a) => (a.length >= 5 && typeof a[4] === 'number' ? a[4] * ((a[2] && a[2].BYTES_PER_ELEMENT) || 1) : (a[2] && a[2].byteLength) || 0),
    texImage2D: (a) => (a.length >= 9 ? (a[3] * a[4] * bpp) : srcPx(a[5]) * bpp),
    texSubImage2D: (a) => (a.length >= 9 ? (a[4] * a[5] * bpp) : srcPx(a[6]) * bpp),
  };
  const names = ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'useProgram', 'bindTexture',
    'bindFramebuffer', 'bindRenderbuffer', 'clear', 'readPixels', 'getError', 'getParameter', 'checkFramebufferStatus',
    'getUniformLocation', 'getProgramParameter', 'getShaderParameter', 'getExtension', 'texImage2D', 'texSubImage2D',
    'texStorage2D', 'texParameteri', 'bufferData', 'bufferSubData', 'scissor', 'viewport', 'blendFunc', 'blendFuncSeparate',
    'blendEquation', 'enable', 'disable', 'bindVertexArray', 'activeTexture', 'stencilFunc', 'stencilOp', 'stencilMask',
    'colorMask', 'generateMipmap', 'fenceSync', 'clientWaitSync', 'getSyncParameter', 'deleteTexture', 'createTexture',
    'deleteBuffer', 'createBuffer', 'framebufferTexture2D', 'createFramebuffer', 'deleteFramebuffer', 'invalidateFramebuffer',
    'uniform1i', 'uniform1f', 'uniform2f', 'uniform3f', 'uniform4f', 'uniform1fv', 'uniform2fv', 'uniform4fv', 'uniform1iv',
    'uniformMatrix3fv', 'uniformMatrix4fv', 'bindBufferBase', 'bindBufferRange', 'bindBuffer', 'vertexAttribPointer',
    'enableVertexAttribArray', 'copyTexSubImage2D', 'blitFramebuffer', 'flush', 'finish', 'isContextLost', 'pixelStorei'];
  const orig = Object.create(null);
  for (const name of names) {
    const f = gl[name];
    if (typeof f !== 'function') continue;
    orig[name] = Object.prototype.hasOwnProperty.call(gl, name) ? f : null;
    const by = bytes[name];
    gl[name] = function () {
      if (window.__btGlOn) {
        c[name] = (c[name] || 0) + 1;
        if (by) { try { c[name + 'Bytes'] = (c[name + 'Bytes'] || 0) + (by(arguments) || 0); } catch (e) { /* odd form */ } }
      }
      return f.apply(this, arguments);
    };
  }
  /* put the context back as it was, so the next profile times the game and
     not these wrappers */
  window.__btGlUninstall = () => {
    for (const name of Object.keys(orig)) { if (orig[name]) gl[name] = orig[name]; else delete gl[name]; }
    delete gl.__btCount;
  };
  return true;
};

const SYNC = ['readPixels', 'getError', 'getParameter', 'checkFramebufferStatus', 'getUniformLocation', 'getProgramParameter',
  'getShaderParameter', 'clientWaitSync', 'getSyncParameter', 'finish'];

/* ── why Pixi rebuilds a render group's draw list ──
   A render group whose structure changed rebuilds its whole instruction set
   in the next render (RenderGroupSystem _buildInstructions: the group's tree
   walked, every renderable re-added to a batch).  This counts, per frame,
   the rebuilds and their causes: the stack of whoever set
   `structureDidChange` (an addChild, a visible or zIndex change...), and for
   the ones Pixi's own pipes asked for (validateRenderable: a batched
   Graphics redrawn, a sprite's texture from another source) the renderable
   and its parents' labels. */
const SDC_INSTALL = () => {
  const app = window._pixiRenderer && window._pixiRenderer.app;
  if (!app) return 0;
  const R = app.renderer;
  const st = window.__btSdc || (window.__btSdc = { on: false, sets: new Map(), pipes: new Map(), builds: new Map(), hooked: new WeakSet() });
  const path = (c) => {
    const out = [];
    for (let n = c, i = 0; n && i < 6; n = n.parent, i++) out.push(n.label || (n.constructor && n.constructor.name) || '?');
    return out.join(' < ');
  };
  const groups = [];
  const walk = (c) => { if (c.renderGroup) groups.push(c.renderGroup); const k = c.children; if (k) for (let i = 0; i < k.length; i++) walk(k[i]); };
  walk(app.stage);
  for (const g of groups) {
    if (st.hooked.has(g)) continue;
    st.hooked.add(g);
    let v = g.structureDidChange;
    const name = path(g.root);
    Object.defineProperty(g, 'structureDidChange', {
      configurable: true,
      get() { return v; },
      set(x) {
        if (x && st.on) {
          const s = (new Error().stack || '').split('\n').slice(2, 6).map((l) => l.trim().replace(/^at /, '')).join(' <- ');
          const k = name + ' :: ' + s;
          st.sets.set(k, (st.sets.get(k) || 0) + 1);
        }
        v = x;
      },
    });
  }
  /* the pipes' own asks */
  const pipes = R.renderPipes || {};
  for (const pn of Object.keys(pipes)) {
    const p = pipes[pn];
    if (!p || typeof p.validateRenderable !== 'function' || p.__btSdc) continue;
    p.__btSdc = true;
    const f = p.validateRenderable;
    p.validateRenderable = function (r) {
      const out = f.apply(this, arguments);
      if (out && st.on) { const k = pn + ': ' + path(r); st.pipes.set(k, (st.pipes.get(k) || 0) + 1); }
      return out;
    };
  }
  /* every shape wiped a frame (a small one asks for a rebuild when its group
     has not already: GraphicsPipe.validateRenderable), and every visible /
     zIndex / addChild change -- by where it sits, whatever the frame's first
     cause was */
  st.clears = st.clears || new Map();
  if (!st.gproto) {
    let g = null;
    const find = (c) => { if (g) return; if (c.constructor && c.constructor.name === 'Graphics' && typeof c.clear === 'function') { g = c; return; } const k = c.children; if (k) for (let i = 0; i < k.length && !g; i++) find(k[i]); };
    find(app.stage);
    if (g) {
      let proto = Object.getPrototypeOf(g);
      while (proto && !Object.prototype.hasOwnProperty.call(proto, 'clear')) proto = Object.getPrototypeOf(proto);
      if (proto) {
        st.gproto = proto;
        const clr = proto.clear;
        proto.clear = function () {
          if (st.on) {
            let inGroup = '';
            for (let n = this; n; n = n.parent) if (n.renderGroup && n !== this) { inGroup = n.label || '?'; break; }
            const who = (new Error().stack || '').split('\n').slice(2, 4).map((l) => l.trim().replace(/^at /, '')).join(' <- ');
            const k = (inGroup || 'no group') + ' :: ' + path(this) + ' :: ' + who;
            st.clears.set(k, (st.clears.get(k) || 0) + 1);
          }
          return clr.apply(this, arguments);
        };
      }
    }
  }
  /* the rebuilds themselves, by group */
  const sys = R.renderGroup;
  if (sys && !sys.__btSdc && typeof sys._buildInstructions === 'function') {
    sys.__btSdc = true;
    const b = sys._buildInstructions;
    st.ms = st.ms || new Map();
    sys._buildInstructions = function (g) {
      if (!st.on) return b.apply(this, arguments);
      const k = path(g.root);
      st.builds.set(k, (st.builds.get(k) || 0) + 1);
      const t0 = performance.now();
      try { return b.apply(this, arguments); } finally { st.ms.set(k, (st.ms.get(k) || 0) + performance.now() - t0); }
    };
  }
  return groups.length;
};

/* ── the draw list a frame, as Pixi will execute it ──
   Every render group's instruction set: how many batches each batcher made
   ('default', 'sharp' -- the characters, 'bt-palette' -- the Wheel's ground
   and objects), how often consecutive batches switch batcher (a new program
   on the GPU), and what else breaks a batch. */
const BATCH_CENSUS = () => {
  const app = window._pixiRenderer && window._pixiRenderer.app;
  if (!app) return null;
  const groups = [];
  const walk = (c) => { if (c.renderGroup) groups.push(c.renderGroup); const k = c.children; if (k) for (let i = 0; i < k.length; i++) walk(k[i]); };
  walk(app.stage);
  const out = { groups: groups.length, batches: {}, switches: 0, other: {}, seq: [], texSlots: {}, perGroup: [] };
  for (const g of groups) {
    const is = g.instructionSet;
    const ins = is.instructions, n = is.instructionSize;
    let prev = null, row = { name: (g.root.label || '?'), batches: 0, other: 0 };
    for (let i = 0; i < n; i++) {
      const it = ins[i];
      if (!it) continue;
      if (it.renderPipeId === 'batch' && it.batcher) {
        const b = it.batcher.name || '?';
        out.batches[b] = (out.batches[b] || 0) + 1;
        out.texSlots[b] = (out.texSlots[b] || 0) + (it.textures ? it.textures.count : 0);
        if (prev && prev !== b) out.switches++;
        prev = b;
        row.batches++;
        if (out.seq.length < 400) out.seq.push(row.name[0] + ':' + (b === 'default' ? 'D' : b === 'sharp' ? 'S' : 'P') + (it.blendMode !== 'normal' ? '/' + it.blendMode : ''));
      } else {
        const k = it.renderPipeId || it.constructor && it.constructor.name || '?';
        out.other[k] = (out.other[k] || 0) + 1;
        row.other++;
        if (out.seq.length < 400) out.seq.push(row.name[0] + ':<' + k + '>');
      }
    }
    if (row.batches || row.other) out.perGroup.push(row);
  }
  return out;
};

/* a finger on an element: touchstart, then touchend (mp-membudget's) */
const tapSel = (P, sel, id, fx = 0.5, fy = 0.5) => P.page.evaluate(({ sel, id, fx, fy }) => {
  const el = document.querySelector(sel);
  if (!el) return false;
  const b = el.getBoundingClientRect(), x = b.left + b.width * fx, y = b.top + b.height * fy;
  const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: id, target: el, clientX: x, clientY: y })],
    changedTouches: [new Touch({ identifier: id, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk('touchstart'));
  el.dispatchEvent(mk('touchend'));
  return true;
}, { sel, id, fx, fy });

const near = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (!S || !S.player) return null;
  let m = null, d = Infinity;
  for (const x of S.monsters || []) {
    if (!x || x.alive === false || x.dead) continue;
    const dd = Math.hypot(x.x - S.player.x, x.y - S.player.y);
    if (dd < d) { d = dd; m = { x: x.x, y: x.y, d: dd }; }
  }
  return { px: S.player.x, py: S.player.y, m };
});

async function stepToward(P, dx, dy, ms) {
  const keys = [];
  if (dy < -12) keys.push('w'); else if (dy > 12) keys.push('s');
  if (dx < -12) keys.push('a'); else if (dx > 12) keys.push('d');
  for (const k of keys) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(ms);
  for (const k of keys) await P.page.keyboard.up(k);
}

/* drivers: each runs until stop() says so */
const drivers = {
  stand: async () => {},
  walk: async (P, stop) => {
    const legs = [['d'], ['s'], ['a'], ['w']];
    let i = 0;
    while (!stop()) {
      const keys = legs[i++ % legs.length];
      for (const k of keys) await P.page.keyboard.down(k).catch(() => {});
      for (let t = 0; t < 1400 && !stop(); t += 100) await P.page.waitForTimeout(100).catch(() => {});
      for (const k of keys) await P.page.keyboard.up(k).catch(() => {});
    }
  },
  fight: async (P, stop) => {
    while (!stop()) {
      const s = await near(P).catch(() => null);
      if (!s || !s.m || s.m.d > 900) { await P.page.waitForTimeout(300).catch(() => {}); continue; }
      if (s.m.d > 70) await stepToward(P, s.m.x - s.px, s.m.y - s.py, Math.min(450, 60 + s.m.d * 1.2)).catch(() => {});
      else {
        await tapSel(P, '[data-joyzone="R"]', 52, 0.5, 0.4).catch(() => {});
        await P.page.waitForTimeout(220).catch(() => {});
      }
    }
  },
};

/* one page, every scene asked for, with `query` in its address */
async function measure({ browser, wsPort, webPort, rec, maps, query: q0 }) {
  /* `ambience` in a variant is no address switch: it turns the drifting air
     (cloud shadows, fog, motes) back on, which the harness turns off for every
     scenario (harness.mjs, "every scenario plays at noon") and a player has */
  const amb = /(^|&)ambience(&|$)/.test(q0 || '');
  const query = (q0 || '').split('&').filter((t) => t && t !== 'ambience').join('&');
  const P = await H.newPlayer(browser, { name: 'frame', wsPort, webPort, viewport: PHONE, touch: true, dpr: DPR, world: 'wheel', query,
    init: amb ? (() => { window.__btAmbienceOff = false; }) : null });
  const QUERY = query;
  const out = { query: q0, dpr: DPR, sceneMs: SCENE_MS, throttle: Number(process.env.BT_QA_CPU_THROTTLE) || 1, maps: maps.size, scenes: [] };
  let stopAlive = null;
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok(`in the Wheel's BroTown${QUERY ? ` (?${QUERY})` : ''} (guard)`, !!ok, ok);
    if (!ok) return;
    const myId = await H.readState(P, (S) => S.myId);
    await P.page.evaluate(() => { const S = window._gameState.current; const R = S.rpg; R._quests = R._quests || {}; R._quests.tut_1 = true; });
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 20 }).catch(() => null);
    stopAlive = H.keepAlive(P, 15000);
    await P.page.waitForTimeout(6000);

    const cdp = await P.page.context().newCDPSession(P.page);
    await cdp.send('Performance.enable');
    if (PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 250 }); }
    const metrics = async () => { const r = await cdp.send('Performance.getMetrics'); const o = {}; for (const m of r.metrics) o[m.name] = m.value; return o; };

    const scene = async (label, drive) => {
      let stopped = false;
      const stop = () => stopped;
      const driving = drive(P, stop);
      await P.page.waitForTimeout(1500);
      await P.page.evaluate(() => { window.perfTracker && window.perfTracker.reset(); });
      const m0 = await metrics();
      const t0 = Date.now();
      if (PROFILE) await cdp.send('Profiler.start');
      await P.page.waitForTimeout(SCENE_MS);
      const prof = PROFILE ? (await cdp.send('Profiler.stop')).profile : null;
      /* BT_PF_RAW=1: the profile itself too, for a look at who calls whom
         (out/phoneframe-<scene>.cpuprofile; Chrome's DevTools opens it) */
      if (prof && process.env.BT_PF_RAW === '1') {
        try { writeFileSync(join(H.REPO, 'tools/qa/mp/out', `phoneframe-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}${query ? '-' + query.replace(/[^a-z0-9]+/gi, '_') : ''}.cpuprofile`), JSON.stringify(prof)); } catch { /* the numbers still print */ }
      }
      const m1 = await metrics();
      const secs = (Date.now() - t0) / 1000;
      const pt = await P.page.evaluate(() => {
        const t = window.perfTracker;
        const a = (t && t.getSamples && t.getSamples()) || [];
        const S = window._gameState.current;
        return { a, monsters: (S.monsters || []).length, others: Object.keys(S.others || {}).length, zone: S.currentZone,
          x: Math.round(S.player.x), y: Math.round(S.player.y) };
      });
      /* the GL calls, in a window of their own */
      let gl = null;
      const glOk = await P.page.evaluate(GL_INSTALL);
      if (glOk) {
        await P.page.evaluate(() => { const c = window.__btGlCounts; for (const k of Object.keys(c)) delete c[k]; window.perfTracker.reset(); window.__btGlOn = true; });
        await P.page.waitForTimeout(GL_MS);
        gl = await P.page.evaluate(() => {
          window.__btGlOn = false;
          const frames = (window.perfTracker.getSamples() || []).length || 1;
          const c = window.__btGlCounts, o = { frames };
          for (const k of Object.keys(c)) o[k] = +(c[k] / frames).toFixed(k.endsWith('Bytes') ? 0 : 2);
          window.__btGlUninstall();
          return o;
        });
      }
      const census = await P.page.evaluate(BATCH_CENSUS).catch(() => null);
      if (process.env.BT_PF_DUMPSHADERS === '1') {
        const sh = await P.page.evaluate(() => {
          const app = window._pixiRenderer.app, seen = {}, out = [];
          const walk = (c) => { if (c.renderGroup) { const is = c.renderGroup.instructionSet; for (let i = 0; i < is.instructionSize; i++) { const it = is.instructions[i]; if (it && it.batcher && !seen[it.batcher.name]) { seen[it.batcher.name] = 1; const gp = it.batcher.shader && it.batcher.shader.glProgram; out.push({ name: it.batcher.name, vertex: gp && (gp._vertex || gp.vertex), fragment: gp && (gp._fragment || gp.fragment), attrs: Object.keys(it.batcher.attributeSize ? {} : {}), vsize: it.batcher.vertexSize }); } } } for (const k of c.children || []) walk(k); };
          walk(app.stage);
          return out;
        });
        writeFileSync(join(H.REPO, 'tools/qa/mp/out', 'phoneframe-shaders.json'), JSON.stringify(sh, null, 1));
      }
      if (census) {
        const tb = Object.values(census.batches).reduce((a, b) => a + b, 0);
        console.log(`     the draw list: ${tb} batches (${Object.entries(census.batches).map(([k, v]) => `${k} ${v}`).join(', ')}), ${census.switches} switches of batcher in a row, other steps: ${Object.entries(census.other).map(([k, v]) => `${k} ${v}`).join(', ')}`);
        console.log(`       by group: ${census.perGroup.map((r) => `${r.name} ${r.batches}+${r.other}`).join(', ')}`);
        console.log(`       sequence: ${census.seq.join(' ').slice(0, 1200)}`);
      }
      /* the rebuilds and their causes, in a window of their own */
      let sdc = null;
      if (process.env.BT_PF_SDC !== '0') {
        const groups = await P.page.evaluate(SDC_INSTALL);
        await P.page.evaluate(() => { const s = window.__btSdc; s.sets.clear(); s.pipes.clear(); s.builds.clear(); if (s.ms) s.ms.clear(); if (s.clears) s.clears.clear(); window.perfTracker.reset(); s.on = true; });
        await P.page.waitForTimeout(GL_MS);
        sdc = await P.page.evaluate(() => {
          const s = window.__btSdc;
          s.on = false;
          const frames = (window.perfTracker.getSamples() || []).length || 1;
          const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => [k, +(v / frames).toFixed(2)]);
          return { frames, builds: top(s.builds), buildMs: top(s.ms || new Map()), sets: top(s.sets), pipes: top(s.pipes), clears: top(s.clears || new Map()) };
        });
        sdc.groups = groups;
        /* the setters' stacks are the bundle's lines: put them back in the source */
        const unbundle = (k) => k.replace(/\(?(https?:\/\/[^\s)]+?\/assets\/([^:\s)]+)):(\d+):(\d+)\)?/g, (m, url, file, line, col) => {
          const sm = maps.get(file);
          if (!sm) return m;
          try { const e = sm.findEntry(+line - 1, +col - 1); if (e && e.originalSource) return `${shortSrc(e.originalSource)}:${e.originalLine + 1}`; } catch { /* outside */ }
          return m;
        });
        sdc.clears = (sdc.clears || []).map(([k, v]) => [unbundle(k), v]);
        sdc.sets = sdc.sets.map(([k, v]) => [k.replace(/\(?(https?:\/\/[^\s)]+?\/assets\/([^:\s)]+)):(\d+):(\d+)\)?/g, (m, url, file, line, col) => {
          const sm = maps.get(file);
          if (!sm) return m;
          try { const e = sm.findEntry(+line - 1, +col - 1); if (e && e.originalSource) return `${shortSrc(e.originalSource)}:${e.originalLine + 1}`; } catch { /* outside */ }
          return m;
        }), v]);
      }
      stopped = true;
      await driving.catch(() => {});
      const s = pt.a;
      const col = (k) => s.map((x) => x[k] || 0);
      const row = {
        label, frames: s.length, fps: +(s.length / secs).toFixed(1), zone: pt.zone, at: [pt.x, pt.y], monsters: pt.monsters, others: pt.others,
        work: { p50: q(col('workMs'), 0.5), p95: q(col('workMs'), 0.95), mean: mean(col('workMs')) },
        sim: { p50: q(col('simMs'), 0.5), mean: mean(col('simMs')) },
        render: { p50: q(col('renderMs'), 0.5), mean: mean(col('renderMs')) },
        tile: mean(col('tileMs')), entity: mean(col('entityMs')), effects: mean(col('effectsMs')), app: mean(col('appMs')),
        interval: { p50: q(col('totalMs'), 0.5), p95: q(col('totalMs'), 0.95) },
        mainPerSec: {
          task: +(((m1.TaskDuration - m0.TaskDuration) / secs) * 1000).toFixed(0),
          script: +(((m1.ScriptDuration - m0.ScriptDuration) / secs) * 1000).toFixed(0),
          layout: +(((m1.LayoutDuration - m0.LayoutDuration) / secs) * 1000).toFixed(0),
          style: +(((m1.RecalcStyleDuration - m0.RecalcStyleDuration) / secs) * 1000).toFixed(0),
        },
        gl,
        census,
        sdc,
        profile: prof ? aggregate(prof, maps) : null,
      };
      out.scenes.push(row);
      console.log(`\n  ── ${label}: ${row.frames} frames (${row.fps}/s), work p50 ${row.work.p50} p95 ${row.work.p95} mean ${row.work.mean} ms`
        + ` | sim ${row.sim.mean} render ${row.render.mean} (tile ${row.tile} entity ${row.entity} effects ${row.effects} pixi ${row.app})`
        + ` | main thread a second: task ${row.mainPerSec.task} script ${row.mainPerSec.script} layout ${row.mainPerSec.layout} style ${row.mainPerSec.style} ms`);
      if (gl) {
        const draws = (gl.drawElements || 0) + (gl.drawArrays || 0) + (gl.drawElementsInstanced || 0) + (gl.drawArraysInstanced || 0);
        const sync = SYNC.reduce((a, k) => a + (gl[k] || 0), 0);
        console.log(`     gl a frame: ${draws} draws, ${gl.useProgram || 0} programs, ${gl.bindTexture || 0} texture binds, ${gl.bindFramebuffer || 0} target switches,`
          + ` ${gl.clear || 0} clears, uploads ${((gl.texImage2DBytes || 0) + (gl.texSubImage2DBytes || 0)) / 1024 | 0} KB tex / ${((gl.bufferDataBytes || 0) + (gl.bufferSubDataBytes || 0)) / 1024 | 0} KB buf, ${sync} calls that wait (${SYNC.filter((k) => gl[k]).map((k) => `${k} ${gl[k]}`).join(', ')})`);
      }
      if (sdc) {
        const per = sdc.builds.reduce((a, [, v]) => a + v, 0);
        console.log(`     draw-list rebuilds a frame: ${per.toFixed(2)} (${sdc.builds.map(([k, v]) => `${v} ${k.split(' < ')[0]}`).join(', ')}) of ${sdc.groups} render groups; ms a frame: ${sdc.buildMs.map(([k, v]) => `${k.split(' < ')[0]} ${v}`).join(', ')}`);
        for (const [k, v] of sdc.sets.slice(0, 12)) console.log(`       set ${String(v).padStart(5)}  ${k.slice(0, 330)}`);
        for (const [k, v] of sdc.pipes.slice(0, 12)) console.log(`       pipe ${String(v).padStart(5)}  ${k.slice(0, 200)}`);
        for (const [k, v] of (sdc.clears || []).slice(0, 30)) console.log(`       clear ${String(v).padStart(5)}  ${k.slice(0, 300)}`);
      }
      if (row.profile) {
        const f = row.frames || 1;
        row.perFrame = { js: +(row.profile.js / f).toFixed(2), native: +(row.profile.native / f).toFixed(2), gc: +(row.profile.gc / f).toFixed(2) };
        console.log(`     a frame, by the profile: JavaScript ${row.perFrame.js} ms, browser calls (GL and the like) ${row.perFrame.native} ms, garbage collection ${row.perFrame.gc} ms`);
        console.log(`     profile ${row.profile.ms} ms sampled; own time:`);
        for (const [k, v] of row.profile.self.slice(0, 22)) console.log(`       ${String(v).padStart(7)}  ${k}`);
        console.log('     by file:');
        for (const [k, v] of row.profile.files.slice(0, 14)) console.log(`       ${String(v).padStart(7)}  ${k}`);
      }
      return row;
    };

    if (WANT.includes('town')) await scene('BroTown, standing', drivers.stand);
    if (WANT.includes('townwalk')) await scene('BroTown, walking', drivers.walk);
    if (WANT.includes('fight') || WANT.includes('landwalk')) {
      const geom = await H.wheelGeom().catch(() => null);
      const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
      const at = WHEEL_SPAWNS.ember.points[0];
      const reached = await H.hopTo(P, at[0], at[1] + 40, { tries: 400, step: 140, gap: 200 });
      rec.ok('reached the Flame Fields\' first monsters (guard)', reached, { at, geom: !!geom });
      await P.page.waitForTimeout(3000);
      if (WANT.includes('fight')) await scene('Flame Fields, fighting', drivers.fight);
      if (WANT.includes('landwalk')) await scene('Flame Fields, walking', drivers.walk);
    }
    rec.ok(`every scene measured${query ? ` (?${query})` : ''}`, out.scenes.length >= 1 && out.scenes.every((s) => s.frames > 10), out.scenes.map((s) => [s.label, s.frames]));
    return out;
  } finally {
    if (stopAlive) stopAlive();
    await P.ctx.close().catch(() => {});
  }
}

/* BT_PF_AB='<switches>': the same scenes again on a page with those switches
   in its address (the game as it was, when a change has its own `?off`),
   BT_PF_ROUNDS times each, taking turns, and the two side by side */
const AB = process.env.BT_PF_AB || '';
const ROUNDS = Math.max(1, Number(process.env.BT_PF_ROUNDS || 1));

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const maps = loadMaps();
  const join2 = (a, b) => [a, b].filter(Boolean).join('&');
  /* BT_PF_VARIANTS='a|b|c': one page each, these switches added -- a
     ranking of what each part of the picture costs to draw */
  const VARIANTS = process.env.BT_PF_VARIANTS ? process.env.BT_PF_VARIANTS.split('|').map((v) => join2(QUERY, v.trim())) : null;
  const variants = VARIANTS || (AB ? [QUERY, join2(QUERY, AB)] : [QUERY]);
  const runs = [];
  for (let r = 0; r < ROUNDS; r++) {
    for (const v of (r % 2 ? [...variants].reverse() : variants)) {
      console.log(`\n  ════ round ${r + 1}, ?${v || '(as it is)'} ════`);
      const out = await measure({ browser, wsPort, webPort, rec, maps, query: v });
      if (out) runs.push(out);
    }
  }
  writeFileSync(join(OUT, 'phoneframe.json'), JSON.stringify(runs.length === 1 ? runs[0] : { runs }, null, 1));
  console.log(`\n  wrote ${join(OUT, 'phoneframe.json')}`);
  if (VARIANTS) {
    console.log(`\n  ════ the variants, dpr ${DPR}: frames a second and the frame interval (median) by scene ════`);
    for (const o of runs) {
      console.log(`     ?${(o.query || '(as it is)').padEnd(36)} ` + o.scenes.map((sc) => `${sc.label}: ${sc.fps}/s, ${sc.interval.p50} ms (work ${sc.work.mean})`).join(' | '));
    }
  }
  if (AB && runs.length >= 2) {
    /* each scene's mean over its rounds, per variant */
    const by = new Map();
    for (const o of runs) for (const sc of o.scenes) {
      const k = sc.label, v = o.query === QUERY ? 'new' : 'old';
      if (!by.has(k)) by.set(k, { new: [], old: [] });
      by.get(k)[v].push(sc);
    }
    const avg = (xs, f) => (xs.length ? +(xs.reduce((a, x) => a + (f(x) || 0), 0) / xs.length).toFixed(2) : null);
    const draws = (g) => g && ((g.drawElements || 0) + (g.drawArrays || 0) + (g.drawElementsInstanced || 0) + (g.drawArraysInstanced || 0));
    console.log(`\n  ════ side by side: as it is  vs  ?${AB} (the mean of ${ROUNDS} round(s) each) ════`);
    for (const [k, v] of by) {
      const line = (name, f) => `       ${name.padEnd(30)} ${String(avg(v.new, f)).padStart(8)}  ${String(avg(v.old, f)).padStart(8)}`;
      console.log(`     ${k}                               now      before`);
      console.log(line('JavaScript a frame (ms)', (x) => x.perFrame && x.perFrame.js));
      console.log(line('browser calls a frame (ms)', (x) => x.perFrame && x.perFrame.native));
      console.log(line('the frame\'s work, mean (ms)', (x) => x.work.mean));
      console.log(line('the frame\'s work, p95 (ms)', (x) => x.work.p95));
      console.log(line('pixi render (ms)', (x) => x.app));
      console.log(line('draw calls a frame', (x) => draws(x.gl)));
      console.log(line('programs a frame', (x) => x.gl && x.gl.useProgram));
      console.log(line('uniform uploads a frame', (x) => x.gl && Object.keys(x.gl).filter((n) => n.startsWith('uniform')).reduce((a, n) => a + (x.gl[n] || 0), 0)));
      console.log(line('buffer uploads a frame', (x) => x.gl && ((x.gl.bufferSubData || 0) + (x.gl.bufferData || 0))));
      console.log(line('rebuilds a frame', (x) => x.sdc && x.sdc.builds.reduce((a, [, n]) => a + n, 0)));
      console.log(line('rebuild ms a frame', (x) => x.sdc && x.sdc.buildMs.reduce((a, [, n]) => a + n, 0)));
    }
  }
}
