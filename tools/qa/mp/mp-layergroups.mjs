/* ═══ v2.3.3431: EACH WORLD LAYER KEEPS ITS OWN DRAW LIST ═══
 *
 * The owner, 2026-10-18: "iterate on what best improves framerate without
 * loss of quality (or negligible loss) for phone gameplay (iPhone, android)".
 * mp-phoneframe found Pixi rebuilding the world's whole draw list and the
 * screen's every frame -- ~25 shapes wiped every frame (most of them empty),
 * dust and footprints coming and going, the depth sort re-keying everything
 * that walks -- 0.9 ms of a ~5 ms frame in BroTown, 1.3 of ~6 at a fight on
 * this box.  Three changes, each with its own switch:
 *   - every world layer but `shadows` its own render group (pixiApp.js,
 *     `?nolayergroups`);
 *   - wiping a shape that is already empty is no change (quietClear.js,
 *     `?loudclear`);
 *   - the depth sort stores a new key quietly while the order holds
 *     (depthSort.js, `?zindexall`).
 *
 * On a phone (390 x 844, 3x) in BroTown and at a fight at the Flame Fields:
 *   1. the layers are render groups and an empty wipe is let be (guard), and
 *      the three switches turn them off on a second page;
 *   2. THE SAME FRAME: the game's frames held, the scene drawn twice as it is
 *      (identical, or the comparison means nothing), once with every layer
 *      back in the world's one list, once again as it is -- all IDENTICAL,
 *      to the pixel (the layers sit at the world's origin unscaled, so their
 *      groups draw with the world's own camera matrix);
 *   3. THE SAME ORDER: after every frame of a walk and a fight, the two
 *      depth-sorted layers stand in the order of their keys (what Pixi's
 *      stable sort of the old code gave), and most frames' sorts were quiet;
 *   4. the world's and the screen's own lists are not rebuilt every frame
 *      any more standing in BroTown (they were rebuilt every one);
 *   2a. THE WORLD'S OWN NUMBERS: in the same held frame, the layers drawn
 *      with every render group's uniforms pushed and popped as Pixi does
 *      (layerUniforms.js off) -- IDENTICAL too; and in a frame most layers
 *      were drawn with the world's numbers, the empty ones skipped;
 *   2b. NOTHING STALE: just arrived in the Wheel (a zone change), in BroTown
 *      and at the fight, every list rebuilt by force -- every quad packed
 *      again, as the old code did every frame -- changes no pixel of the held
 *      frame (drawLists.js; formShade.js's figure span went stale before
 *      refreshFigureShades);
 *   5. no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const OFF = 'nolayergroups&loudclear&zindexall';

/* the layers' render groups, off then on, in one held frame (mp-rendergroups' way) */
const sameFrame = (P) => P.page.evaluate(async () => {
  const w = window;
  const app = w._pixiRenderer.app, R = app.renderer, gl = R.gl;
  const world = app.stage.children.find((c) => c.label === 'world');
  const layers = world.children.filter((c) => c.isRenderGroup);
  w.__lgHeld = [];
  w.__lgRaf = w.requestAnimationFrame;
  w.requestAnimationFrame = (cb) => { w.__lgHeld.push(cb); return 0; };
  await new Promise((r) => setTimeout(r, 700));
  const W = gl.drawingBufferWidth, Hh = gl.drawingBufferHeight;
  const grab = () => { R.render(app.stage); const px = new Uint8Array(W * Hh * 4); gl.readPixels(0, 0, W, Hh, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
  const cmp = (a, b) => { let n = 0, maxd = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); if (d) { n++; if (d > maxd) maxd = d; } } return { n, maxd }; };
  const lu0 = w.__btLayerUniforms ? w.__btLayerUniforms() : null;
  const on1 = grab();
  const lu1 = w.__btLayerUniforms ? w.__btLayerUniforms() : null;
  const on2 = grab();
  for (const l of layers) l.isRenderGroup = false;
  const off = grab();
  for (const l of layers) l.isRenderGroup = true;
  const on3 = grab();
  /* layerUniforms.js: every group pushed and popped as Pixi does */
  let pushAll = null;
  if (w.__btLayerPushAll) { w.__btLayerPushAll(true); const p = grab(); w.__btLayerPushAll(false); pushAll = cmp(on1, p); }
  const held = w.__lgHeld;
  w.requestAnimationFrame = w.__lgRaf;
  w.__lgHeld = null;
  held.forEach((cb) => w.requestAnimationFrame(cb));
  const lu = lu0 && lu1 ? { empty: lu1.empty - lu0.empty, shared: lu1.shared - lu0.shared, pushed: lu1.pushed - lu0.pushed } : null;
  return { W, H: Hh, layers: layers.length, steady: cmp(on1, on2), diff: cmp(on1, off), back: cmp(on1, on3), pushAll, lu };
});

/* every draw list rebuilt by force -- every quad packed again, which the old
   code did every frame by accident -- in one held frame: no sprite may come
   out different, or something read as it is packed went stale (formShade.js's
   figure span did, standing after a zone change) */
const freshFrame = (P) => P.page.evaluate(async () => {
  const w = window;
  const app = w._pixiRenderer.app, R = app.renderer, gl = R.gl;
  w.__lgHeld = [];
  w.__lgRaf = w.requestAnimationFrame;
  w.requestAnimationFrame = (cb) => { w.__lgHeld.push(cb); return 0; };
  await new Promise((r) => setTimeout(r, 700));
  const W = gl.drawingBufferWidth, Hh = gl.drawingBufferHeight;
  const grab = () => { R.render(app.stage); const px = new Uint8Array(W * Hh * 4); gl.readPixels(0, 0, W, Hh, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
  const cmp = (a, b) => { let n = 0, maxd = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); if (d) { n++; if (d > maxd) maxd = d; } } return { n, maxd }; };
  const a = grab(), b = grab();
  const groups = w.__btRebuildDrawLists ? w.__btRebuildDrawLists() : -1;
  const c = grab();
  const held = w.__lgHeld;
  w.requestAnimationFrame = w.__lgRaf;
  w.__lgHeld = null;
  held.forEach((cb) => w.requestAnimationFrame(cb));
  return { W, H: Hh, groups, steady: cmp(a, b), fresh: cmp(a, c) };
});

/* after every render: are the depth-sorted layers in the order of their keys? */
const ORDER_WATCH = () => {
  const app = window._pixiRenderer.app, R = app.renderer;
  if (R.__lgOrder) return;
  const world = app.stage.children.find((c) => c.label === 'world');
  const sorted = world.children.filter((c) => c.label === 'entities' || c.label === 'gatherNodesFront');
  const st = R.__lgOrder = { frames: 0, bad: 0, badAt: [], children: 0 };
  const render = R.render;
  /* v2.3.3431: after the SCREEN's render only.  The shadows drawn before the
     frame (shadow-prepass.md) are a render of their own, first in the frame,
     and a re-sort the depth pass asked for is done when the screen's render
     draws the layer -- after the shadows' render the layer can still stand
     in the old order, which is never drawn (the combined build's run counted
     exactly the frames whose sort was loud: 1 of 1 in BroTown, 11 of 11 at a
     fight) */
  R.render = function (opts) {
    const out = render.apply(this, arguments);
    const what = opts && opts.container ? opts.container : opts;
    if (window.__lgWatch && what === app.stage) {
      st.frames++;
      for (const L of sorted) {
        const k = L.children;
        st.children += k.length;
        for (let i = 1; i < k.length; i++) {
          if (k[i]._zIndex < k[i - 1]._zIndex) { st.bad++; if (st.badAt.length < 5) st.badAt.push([L.label, i, k[i - 1]._zIndex, k[i]._zIndex]); break; }
        }
      }
    }
    return out;
  };
};

/* the world's and the screen's own draw lists rebuilt, a frame */
const ROOT_BUILDS = (ms) => new Promise((res) => {
  const app = window._pixiRenderer.app, sys = app.renderer.renderGroup;
  const roots = { world: 0, screen: 0, layers: 0 };
  const b = sys._buildInstructions;
  sys._buildInstructions = function (g) {
    const l = g && g.root && g.root.label;
    if (l === 'world' || l === 'screen') roots[l]++; else roots.layers++;
    return b.apply(this, arguments);
  };
  let frames = 0;
  const t0 = performance.now();
  const tick = () => { frames++; if (performance.now() - t0 < ms) requestAnimationFrame(tick); else { sys._buildInstructions = b; res({ frames, ...roots }); } };
  requestAnimationFrame(tick);
});

async function walkFor(P, ms) {
  const legs = ['d', 's', 'a', 'w'];
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < ms) {
    const k = legs[i++ % legs.length];
    await P.page.keyboard.down(k);
    await P.page.waitForTimeout(900);
    await P.page.keyboard.up(k);
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(join(H.REPO, 'tools/qa/mp/out'), { recursive: true });
  const P = await H.newPlayer(browser, { name: 'layered', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
  const Q = await H.newPlayer(browser, { name: 'onelist', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: OFF });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = null;
  try {
    await H.enterWorld(P);
    await H.enterWorld(Q);
    const inWheel = (X) => H.waitFor(X, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    const okP = await inWheel(P), okQ = await inWheel(Q);
    rec.ok('both phones in the Wheel (guard)', !!okP && !!okQ, { okP, okQ });
    if (!okP || !okQ) return;
    stopAlive = H.keepAlive(P, 15000);
    /* 2b: just arrived (a zone change), standing: every list rebuilt by force
       changes nothing */
    {
      await P.page.waitForTimeout(600);
      const f = await freshFrame(P);
      console.log(`    just arrived: ${f.groups} groups rebuilt by force; drawn twice ${f.steady.n} px apart, after the rebuild ${f.fresh.n} (most ${f.fresh.maxd})`);
      rec.ok(`just arrived in the Wheel, standing: every draw list rebuilt by force changes nothing on screen (${f.fresh.n} px apart; ${f.groups} groups)`,
        f.groups > 15 && f.steady.n === 0 && f.fresh.n === 0, f);
    }
    await P.page.waitForTimeout(5000);

    /* 1 */
    const look = (X) => X.page.evaluate(() => {
      const world = window._pixiRenderer.app.stage.children.find((c) => c.label === 'world');
      const qc = window.__btQuietClear ? window.__btQuietClear() : { on: false, skipped: 0 };
      return { groups: world.children.filter((c) => c.isRenderGroup).map((c) => c.label), notGroups: world.children.filter((c) => !c.isRenderGroup).map((c) => c.label), quiet: qc };
    });
    const lP = await look(P), lQ = await look(Q);
    rec.ok(`every world layer but shadows is a render group (${lP.groups.length}; not: ${lP.notGroups.join(', ')}), and an empty wipe is let be (${lP.quiet.skipped} so far) (guard)`,
      lP.groups.length >= 15 && lP.notGroups.length === 1 && lP.notGroups[0] === 'shadows' && lP.quiet.on && lP.quiet.skipped > 0, lP);
    rec.ok(`?${OFF} keeps the world one list (${lQ.groups.length} layer groups) and Pixi's own clear (${JSON.stringify(lQ.quiet)})`,
      lQ.groups.length === 0 && !lQ.quiet.on, lQ);
    await Q.ctx.close().catch(() => {});

    /* 4: standing in BroTown */
    const rb = await P.page.evaluate(ROOT_BUILDS, 3000);
    console.log(`    standing in BroTown: ${rb.frames} frames; the world's own list rebuilt ${rb.world}x, the screen's ${rb.screen}x, a layer's ${rb.layers}x`);
    rec.ok(`standing in BroTown the world's and the screen's own draw lists are not rebuilt every frame (world ${rb.world}, screen ${rb.screen} in ${rb.frames} frames; every frame before)`,
      rb.frames >= 3 && rb.world <= Math.max(1, rb.frames * 0.34) && rb.screen <= Math.max(1, rb.frames * 0.34), rb);

    /* 2 and 3, in BroTown and at a fight */
    await P.page.evaluate(ORDER_WATCH);
    await P.page.evaluate(() => { const S = window._gameState.current; S.player.godMode = true; });
    const spots = [['brotown', null]];
    try {
      const { WHEEL_SPAWNS } = await import('../../../server/src/wheelspawns.js');
      const g = WHEEL_SPAWNS.ember.points[0];
      spots.push(['fight', [g[0], g[1] + 40]]);
    } catch (e) { /* BroTown only */ }
    for (const [tag, at] of spots) {
      if (at) {
        await H.hopTo(P, at[0], at[1], { tries: 400, step: 140, gap: 200 });
        await P.page.waitForTimeout(5000);
      }
      const f = await freshFrame(P);
      console.log(`    ${tag}: every list rebuilt by force: ${f.fresh.n} px apart (most ${f.fresh.maxd})`);
      rec.ok(`${tag}: every draw list rebuilt by force changes nothing on screen (${f.fresh.n} px apart)`, f.steady.n === 0 && f.fresh.n === 0, f);
      const r = await sameFrame(P);
      console.log(`    ${tag}: ${r.W}x${r.H}, ${r.layers} layer groups; drawn twice ${r.steady.n} px apart; in one list ${r.diff.n} px apart (most ${r.diff.maxd}); back ${r.back.n}`);
      rec.ok(`${tag}: the same frame drawn twice is the same frame (${r.steady.n} px apart) (guard)`, r.steady.n === 0, r.steady);
      rec.ok(`${tag}: with every layer back in the world's one list it is the SAME frame, to the pixel (${r.diff.n} px apart)`, r.diff.n === 0, r.diff);
      rec.ok(`${tag}: and with the layers' groups back it is the same frame again (${r.back.n} px apart)`, r.back.n === 0, r.back);
      rec.ok(`${tag}: the layers draw with the world's own camera numbers (a frame: ${r.lu && r.lu.shared} drawn with them, ${r.lu && r.lu.empty} empty skipped, ${r.lu && r.lu.pushed} pushed) (guard)`,
        !!r.lu && r.lu.shared > 0, r.lu);
      rec.ok(`${tag}: with every layer's numbers pushed and popped as Pixi does it is the same frame, to the pixel (${r.pushAll && r.pushAll.n} px apart)`,
        !!r.pushAll && r.pushAll.n === 0, r.pushAll);
      await P.page.evaluate(() => { window.__lgWatch = true; if (window.__btDepthQuiet) { window.__btDepthQuiet.quiet = 0; window.__btDepthQuiet.loud = 0; } });
      await walkFor(P, 7000);
      const o = await P.page.evaluate(() => { window.__lgWatch = false; const s = window._pixiRenderer.app.renderer.__lgOrder; const out = { ...s, dq: window.__btDepthQuiet ? { ...window.__btDepthQuiet } : null }; s.frames = 0; s.bad = 0; s.badAt = []; s.children = 0; return out; });
      console.log(`    ${tag}, walking: ${o.frames} frames watched (${o.children} sorted children seen), ${o.bad} out of order; sorts quiet ${o.dq && o.dq.quiet}, re-sorted ${o.dq && o.dq.loud}`);
      rec.ok(`${tag}: after every frame of a walk the depth-sorted layers stand in the order of their keys (${o.frames} frames, ${o.bad} out of order)`,
        o.frames >= 5 && o.bad === 0, o);
      /* in BroTown hardly anything walks past anything, so most sorts keep
         their order; at a fight monsters cross each other all the time, and
         how often is the fight's (14 of 24 quiet one run, 12 another) -- so
         there the check is that the quiet way is taken at all */
      const most = tag !== 'fight';
      rec.ok(`${tag}: ...and ${most ? 'most sorts were' : 'sorts whose order held were'} quiet (${o.dq && o.dq.quiet} quiet, ${o.dq && o.dq.loud} re-sorted)`,
        !!o.dq && (most ? o.dq.quiet > o.dq.loud : o.dq.quiet > 0), o.dq);
    }

    /* 5 */
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    if (stopAlive) stopAlive();
    await P.ctx.close().catch(() => {});
    await Q.ctx.close().catch(() => {});
  }
}
