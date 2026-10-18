/* ═══ mp-frameprofile (v2.3.3339): WHERE A FRAME'S TIME GOES, IN BROTOWN ═══
 *
 * The owner, 2026-10-18: "Not so sure about the performance. The framerate is
 * definitely not totally smooth. It appears to be around 30fps to 40ish fps".
 *
 * A measuring tool, not a pass/fail test: a phone-sized page stands in the
 * Wheel's BroTown for 10 s, then walks for 10 s, with Chrome's CPU profiler
 * running, and reports where the main thread's time went -- by the source file
 * each sample's function came from (the build's source map: build with
 * `npx vite build --sourcemap` first, or every sample reads as one bundle) --
 * with the frame's own split (perfTracker), the long tasks, and how often
 * React committed.  The QA box's CPU and software GL are not a phone's, so
 * read the SHARES, not the milliseconds.
 *
 *   BT_PROFILE_OUT=<dir>   where the .cpuprofile and the report go
 *                          (default tools/qa/mp/out)
 *   BT_PROFILE_QUERY=...   extra address switches (e.g. 'sheen=0')
 *   BT_PROFILE_TAG=...     a name for this run's files
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';

const PHONE = { width: 390, height: 844 };
const SECS = 10;

/* every dialogue talked away (mp-shadowlock's) */
async function talkAway(P) {
  let clear = 0;
  for (let i = 0; i < 40 && clear < 3; i++) {
    const open = await P.page.evaluate(() => !!document.querySelector('.bt-npcdlg, .bt-qoffer, .bt-npcdlg-scrim'));
    if (!open) { clear++; await P.page.waitForTimeout(300); continue; }
    clear = 0;
    const scrim = P.page.locator('.bt-npcdlg-scrim').first();
    if (await scrim.isVisible().catch(() => false)) { await scrim.click({ position: { x: 20, y: 300 } }).catch(() => {}); await P.page.waitForTimeout(400); continue; }
    let hit = false;
    for (const t of ['Next', 'Close', 'Got it', 'Later', 'Not now']) {
      const b = P.page.locator('button:visible', { hasText: t }).first();
      if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); hit = true; break; }
    }
    if (!hit) await H.closeNpcDialogue(P).catch(() => {});
    await P.page.waitForTimeout(400);
  }
  return clear >= 3;
}

/* the build's source maps, by the script's file name */
function loadMaps() {
  const dir = join(H.REPO, 'dist/assets');
  const maps = Object.create(null);
  if (!existsSync(dir)) return maps;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.js.map')) continue;
    try { maps[f.replace(/\.map$/, '')] = new TraceMap(JSON.parse(readFileSync(join(dir, f), 'utf8'))); } catch (e) { /* skip */ }
  }
  return maps;
}

/* a source path, made short and grouped: a library by its package, our own
   code by its file */
function bucketOf(src) {
  if (!src) return null;
  const nm = src.lastIndexOf('node_modules/');
  if (nm >= 0) {
    const rest = src.slice(nm + 13).split('/');
    return 'lib:' + (rest[0].startsWith('@') ? rest[0] + '/' + rest[1] : rest[0]);
  }
  const i = src.indexOf('src/');
  return i >= 0 ? src.slice(i) : src.replace(/^(\.\.\/)+/, '');
}

/* self time by bucket, from a CPU profile */
function analyse(profile, maps) {
  const byId = new Map();
  for (const n of profile.nodes) byId.set(n.id, n);
  const dt = profile.timeDeltas || [];
  const self = new Map();
  let total = 0;
  for (let k = 0; k < profile.samples.length; k++) {
    const n = byId.get(profile.samples[k]);
    const t = (dt[k] || 0) / 1000;   /* ms */
    if (!n) continue;
    total += t;
    const cf = n.callFrame;
    let key;
    if (cf.functionName === '(idle)') key = '(idle)';
    else if (cf.functionName === '(program)') key = '(program: the browser itself, layout, paint, GL)';
    else if (cf.functionName === '(garbage collector)') key = '(garbage collector)';
    else {
      const file = (cf.url || '').split('/').pop().split('?')[0];
      const tm = maps[file];
      if (tm && cf.lineNumber >= 0) {
        const o = originalPositionFor(tm, { line: cf.lineNumber + 1, column: Math.max(0, cf.columnNumber) });
        key = bucketOf(o.source) || file || '(native)';
      } else {
        key = file ? 'bundle:' + file : '(native: ' + (cf.functionName || '?') + ')';
      }
    }
    self.set(key, (self.get(key) || 0) + t);
  }
  const rows = [...self.entries()].sort((a, b) => b[1] - a[1]).map(([k, ms]) => ({ k, ms: +ms.toFixed(1), pct: +((100 * ms) / Math.max(1, total)).toFixed(1) }));
  const busy = total - (self.get('(idle)') || 0);
  return { totalMs: +total.toFixed(0), busyMs: +busy.toFixed(0), busyPct: +((100 * busy) / Math.max(1, total)).toFixed(1), rows };
}

async function phase(P, cdp, name, OUT, tag, maps, during) {
  await P.page.evaluate(() => {
    window.perfTracker && window.perfTracker.reset && window.perfTracker.reset();
    window.__fpLong = [];
    window.__fpCommits = 0;
    if (!window.__fpObs && typeof PerformanceObserver !== 'undefined') {
      try {
        window.__fpObs = new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__fpLong.push(Math.round(e.duration)); });
        window.__fpObs.observe({ entryTypes: ['longtask'] });
      } catch (e) { /* none */ }
    }
    /* how often Pixi rebuilt each render group's draw list (every Graphics
       change, a texture swap across batchers, a z-order change...) */
    window.__fpRebuilds = Object.create(null);
    try {
      const sys = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer.renderGroup;
      if (sys && !sys.__fpWrapped) {
        const orig = sys._buildInstructions;
        sys._buildInstructions = function (rg, r) {
          const k = (rg && rg.root && rg.root.label) || '?';
          if (window.__fpRebuilds) window.__fpRebuilds[k] = (window.__fpRebuilds[k] || 0) + 1;
          return orig.call(this, rg, r);
        };
        sys.__fpWrapped = true;
      }
      /* and WHAT made them: every renderable whose pipe said "rebuild" (a
         Graphics redrawn, a sprite moved across batchers...), by the nearest
         labelled container above it */
      window.__fpWhy = Object.create(null);
      const pipes = window._pixiRenderer.app.renderer.renderPipes;
      const pathOf = (o) => {
        const parts = [];
        for (let n = o, d = 0; n && d < 8; n = n.parent, d++) if (n.label) parts.push(n.label);
        return (o.constructor && o.constructor.name ? o.constructor.name : '?') + ' in ' + (parts.slice(0, 3).join(' < ') || '?');
      };
      for (const name of ['graphics', 'sprite', 'mesh', 'text', 'bitmapText', 'nineSliceSprite', 'tilingSprite', 'particle']) {
        const pipe = pipes && pipes[name];
        if (!pipe || pipe.__fpWrapped || typeof pipe.validateRenderable !== 'function') continue;
        const origV = pipe.validateRenderable;
        pipe.validateRenderable = function (r) {
          const out = origV.call(this, r);
          if (out && window.__fpWhy) { const k = name + ': ' + pathOf(r); window.__fpWhy[k] = (window.__fpWhy[k] || 0) + 1; }
          return out;
        };
        pipe.__fpWrapped = true;
      }
    } catch (e) { /* no count */ }
    const f0 = performance.now();
    window.__fpFrames = 0;
    window.__fpT0 = f0;
    const tick = () => { window.__fpFrames++; if (window.__fpRun) requestAnimationFrame(tick); };
    window.__fpRun = true;
    requestAnimationFrame(tick);
  });
  await cdp.send('Profiler.start');
  const stop = during ? during() : null;
  await P.page.waitForTimeout(SECS * 1000);
  if (stop) await stop();
  const { profile } = await cdp.send('Profiler.stop');
  const page = await P.page.evaluate(() => {
    window.__fpRun = false;
    const a = (window.perfTracker && window.perfTracker.getSamples && window.perfTracker.getSamples()) || [];
    const avg = (k) => (a.length ? +(a.reduce((t, s) => t + (s[k] || 0), 0) / a.length).toFixed(2) : null);
    const p95 = (k) => { if (!a.length) return null; const v = a.map((s) => s[k] || 0).sort((x, y) => x - y); return +v[Math.floor(v.length * 0.95)].toFixed(2); };
    const secs = (performance.now() - window.__fpT0) / 1000;
    return {
      fps: +(window.__fpFrames / secs).toFixed(1),
      samples: a.length,
      keys: a[0] ? Object.keys(a[0]) : [],
      work: { avg: avg('workMs'), p95: p95('workMs') },
      tile: avg('tileMs'), entity: avg('entityMs'), effects: avg('effectsMs'), app: avg('appMs'),
      interval: avg('intervalMs'),
      outside: a.length ? +(a.reduce((t, s) => t + Math.max(0, (s.intervalMs || 0) - (s.workMs || 0)), 0) / a.length).toFixed(2) : null,
      longTasks: (window.__fpLong || []).slice(0, 40),
      rebuildsPerSec: Object.fromEntries(Object.entries(window.__fpRebuilds || {}).map(([k, v]) => [k, +(v / secs).toFixed(1)])),
      framesCounted: window.__fpFrames,
      why: Object.entries(window.__fpWhy || {}).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => [k, +(v / secs).toFixed(1)]),
    };
  });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `frameprofile-${tag}-${name}.cpuprofile`), JSON.stringify(profile));
  const an = analyse(profile, maps);
  return { name, page, profile: an };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = process.env.BT_PROFILE_OUT || join(H.REPO, 'tools/qa/mp/out');
  const tag = process.env.BT_PROFILE_TAG || 'run';
  const maps = loadMaps();
  console.log(`    source maps: ${Object.keys(maps).length ? Object.keys(maps).join(', ') : 'NONE (build with --sourcemap to see files)'}`);
  const P = await H.newPlayer(browser, { name: 'Profiler', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, query: process.env.BT_PROFILE_QUERY || '' });
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const inWheel = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
      { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inWheel, inWheel);
    await P.page.waitForTimeout(6000);
    await talkAway(P);
    await P.page.waitForTimeout(2000);
    const cdp = await P.page.context().newCDPSession(P.page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
    const stand = await phase(P, cdp, 'stand', OUT, tag, maps, null);
    const walk = await phase(P, cdp, 'walk', OUT, tag, maps, () => {
      let on = true;
      const keys = ['KeyD', 'KeyS', 'KeyA', 'KeyW'];
      const loop = (async () => {
        let i = 0;
        while (on) {
          const k = keys[i++ % keys.length];
          await P.page.keyboard.down(k).catch(() => {});
          await P.page.waitForTimeout(1200);
          await P.page.keyboard.up(k).catch(() => {});
        }
      })();
      return async () => { on = false; await loop; };
    });
    const report = { tag, query: process.env.BT_PROFILE_QUERY || '', stand, walk };
    writeFileSync(join(OUT, `frameprofile-${tag}.json`), JSON.stringify(report, null, 1));
    for (const ph of [stand, walk]) {
      console.log(`    ── ${ph.name}: ${ph.page.fps} fps on this box; frame work avg ${ph.page.work.avg} ms (p95 ${ph.page.work.p95}); main thread busy ${ph.profile.busyPct}% of ${ph.profile.totalMs} ms`);
      console.log(`       draw lists rebuilt a second: ${JSON.stringify(ph.page.rebuildsPerSec)} (frames ${ph.page.framesCounted})`);
      for (const [k, v] of ph.page.why || []) console.log(`         rebuild asked ${v}/s by ${k}`);
      console.log(`       split: tile ${ph.page.tile} entity ${ph.page.entity} effects ${ph.page.effects} app ${ph.page.app}; interval ${ph.page.interval} outside ${ph.page.outside}; long tasks ${JSON.stringify(ph.page.longTasks)}`);
      for (const r of ph.profile.rows.slice(0, 28)) console.log(`       ${String(r.pct).padStart(5)}%  ${String(r.ms).padStart(8)} ms  ${r.k}`);
    }
    rec.ok('profiles taken (guard)', stand.profile.totalMs > 0 && walk.profile.totalMs > 0, { stand: stand.profile.totalMs, walk: walk.profile.totalMs });
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
