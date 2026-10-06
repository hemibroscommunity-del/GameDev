/* ═══ THE SCREEN HAS NO DEPTH BUFFER (v2.3.3072) ═══
 *
 * Pixi asked for the canvas's WebGL context with a stencil buffer and said
 * nothing of depth, so the screen also carried a depth buffer nothing reads:
 * on an iPhone one packed depth + stencil buffer the size of the screen,
 * where a stencil buffer alone is a byte a pixel (pixiApp.js
 * withoutDepthBuffer, ~11 MB at 1170 x 2532).  Chrome allocates a packed
 * buffer either way, so this test cannot weigh the saving; it checks what the
 * saving rests on:
 *
 * An init script counts every gl.enable(DEPTH_TEST) and records what each
 * WebGL getContext asked for.  Two phones (390 x 844) in the Wheel, one with
 * `?depthbuf` (the depth buffer kept, as before):
 *   1. the game's context has no depth buffer and keeps its stencil (the
 *      masks), asked for as such;
 *   2. ...and every other attribute is the `?depthbuf` page's: the only
 *      difference is the depth buffer;
 *   3. a fight at a land's monsters (hits, numbers, sparks), then a swim (the
 *      swimmer cut at the neck: a stencil mask) -- DEPTH_TEST never turned
 *      on, so the depth buffer could never have changed a pixel, and no GL
 *      error;
 *   4. the renderer rebuilt (a black screen's recovery, a fresh canvas): the
 *      new context has no depth buffer either, and DEPTH_TEST is still never
 *      on; the world draws again.
 */
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const DEPTH_TEST = 0x0B71;

const INIT = () => {
  window.__nd = { depthTest: 0, asked: [] };
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C || !C.prototype) continue;
    const en = C.prototype.enable;
    C.prototype.enable = function (cap) {
      if (cap === 0x0B71) window.__nd.depthTest++;
      return en.apply(this, arguments);
    };
  }
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    try { if (/^(webgl2?|experimental-webgl)$/.test(String(type)) && attrs && typeof attrs === 'object') window.__nd.asked.push(Object.assign({ type: String(type) }, attrs)); } catch (e) { /* the game goes on */ }
    return gc.apply(this, arguments);
  };
};

/* the game's context, as it stands: its attributes, buffer sizes, errors */
const ctxNow = (P) => P.page.evaluate((DT) => {
  const R = window._pixiRenderer, gl = R && R.app && R.app.renderer && R.app.renderer.gl;
  if (!gl) return null;
  const a = gl.getContextAttributes() || {};
  const attrs = {};
  for (const k of Object.keys(a).sort()) attrs[k] = a[k];
  let err = 0;
  try { err = gl.getError(); } catch (e) { err = -1; }
  return {
    attrs, webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext,
    depthBits: gl.getParameter(gl.DEPTH_BITS), stencilBits: gl.getParameter(gl.STENCIL_BITS),
    depthTestOn: gl.isEnabled(DT), err, lost: gl.isContextLost(),
    depthTests: window.__nd.depthTest, asked: window.__nd.asked.slice(-3),
  };
}, DEPTH_TEST);

/* the nearest point well inside swimmable water: the spot and four steps
   round it all swim cells */
const waterNear = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, at = window.__btSwimAt;
  if (!at) return null;
  const px = S.player.x, py = S.player.y, st = 48;
  const deep = (x, y) => [[0, 0], [st, 0], [-st, 0], [0, st], [0, -st]].every(([dx, dy]) => { try { return !!at(x + dx, y + dy).swim; } catch (e) { return false; } });
  for (let r = st; r <= 4200; r += st) {
    let best = null;
    for (let a = 0; a < 360; a += 6) {
      const x = px + Math.cos(a * Math.PI / 180) * r, y = py + Math.sin(a * Math.PI / 180) * r;
      if (deep(x, y)) { best = { x: Math.round(x), y: Math.round(y), r }; break; }
    }
    if (best) return best;
  }
  return null;
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'nodepth', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: INIT });
  const B = await H.newPlayer(browser, { name: 'depthbuf', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: INIT, query: 'depthbuf' });
  try {
    await H.enterWorld(P);
    await H.enterWorld(B);
    const inWheel = (Q) => H.waitFor(Q, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    const okP = await inWheel(P), okB = await inWheel(B);
    rec.ok('both phones in the Wheel (guard)', !!okP && !!okB, { okP, okB });
    if (!okP || !okB) return;
    await P.page.waitForTimeout(3000);

    /* 1 */
    const a = await ctxNow(P);
    const b = await ctxNow(B);
    console.log(`    the game:     ${JSON.stringify(a)}`);
    console.log(`    ?depthbuf:    ${JSON.stringify(b)}`);
    rec.ok('the game\'s context can be read on both (guard)', !!a && !!b, { a, b });
    if (!a || !b) return;
    const asked = a.asked.filter((x) => x.type === 'webgl2' || x.type === 'webgl').pop() || {};
    rec.ok(`the game's context has no depth buffer (depth ${a.attrs.depth}, ${a.depthBits} bits) and keeps its stencil for the masks (stencil ${a.attrs.stencil}, ${a.stencilBits} bits); Pixi's request went out with depth ${asked.depth}`,
      a.attrs.depth === false && a.attrs.stencil === true && a.stencilBits >= 8 && asked.depth === false, { attrs: a.attrs, asked, depthBits: a.depthBits, stencilBits: a.stencilBits });
    rec.ok(`...where ?depthbuf keeps it as before (depth ${b.attrs.depth}, ${b.depthBits} bits), nothing asked of it`,
      b.attrs.depth === true && b.depthBits > 0 && (b.asked.filter((x) => /webgl/.test(x.type)).pop() || {}).depth === undefined, { attrs: b.attrs, depthBits: b.depthBits });
    /* 2 */
    const differ = Object.keys(Object.assign({}, a.attrs, b.attrs)).filter((k) => k !== 'depth' && JSON.stringify(a.attrs[k]) !== JSON.stringify(b.attrs[k]));
    rec.ok(`...and every other attribute is the same on both (${Object.keys(a.attrs).length} compared; differing: ${differ.join(', ') || 'none'}), WebGL ${a.webgl2 ? 2 : 1} on both, stencil bits ${a.stencilBits} / ${b.stencilBits}`,
      differ.length === 0 && a.webgl2 === b.webgl2 && a.stencilBits === b.stencilBits, { differ, a: a.attrs, b: b.attrs });
    await B.ctx.close().catch(() => {});

    /* 3: a fight */
    await P.page.evaluate(() => { const S = window._gameState.current; const R = S.rpg; R._quests = R._quests || {}; R._quests.tut_1 = true; S.player.godMode = true; });
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const home = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    const g = WHEEL_SPAWNS.ember.points[0];
    await H.hopTo(P, g[0], g[1] + 40, { tries: 200, step: 140, gap: 200 });
    let swings = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 12000) {
      const s = await P.page.evaluate(() => {
        const S = window._gameState.current; let best = null, bd = Infinity;
        for (const m of S.monsters || []) { if (!m || m.alive === false) continue; const d = Math.hypot(m.x - S.player.x, m.y - S.player.y); if (d < bd) { bd = d; best = m; } }
        return { m: best ? { x: best.x, y: best.y } : null };
      });
      if (s.m) await H.hopTo(P, s.m.x + 10, s.m.y, { tries: 3, step: 60, gap: 150 });
      await P.page.mouse.click(195, 500).catch(() => {});
      swings++;
      await P.page.waitForTimeout(200);
    }
    const fought = await ctxNow(P);
    await P.page.screenshot({ path: join(OUT, 'nodepth-fight.png') }).catch(() => {});
    rec.ok(`a fight at the Flame Fields' goblins (${swings} swings): DEPTH_TEST never turned on (${fought.depthTests} times), none on now, no GL error (${fought.err})`,
      fought.depthTests === 0 && fought.depthTestOn === false && fought.err === 0 && !fought.lost, fought);

    /* 3: a swim -- the swimmer is cut at the neck by a stencil mask */
    await H.hopTo(P, home.x, home.y, { tries: 200, step: 140, gap: 200 });
    const w = await waterNear(P);
    rec.ok(`swimmable water found near Brotown (guard): ${JSON.stringify(w)}`, !!w, w);
    if (w) {
      await H.hopTo(P, w.x, w.y, { tries: 200, step: 70, gap: 200 });
      const sw = await H.waitFor(P, () => { const f = window.__btSwimFx && window.__btSwimFx(); return f && f.self; }, (v) => !!v && v.on && v.masked,
        { timeout: 12000, label: 'swimming, masked' }).catch(() => null);
      await P.page.waitForTimeout(1500);
      await P.page.screenshot({ path: join(OUT, 'nodepth-swim.png') }).catch(() => {});
      const swum = await ctxNow(P);
      rec.ok(`a swim, the figure cut at the neck by its stencil mask (${JSON.stringify(sw)}): DEPTH_TEST still never on (${swum.depthTests}), no GL error (${swum.err})`,
        !!sw && swum.depthTests === 0 && swum.err === 0 && !swum.lost, { sw, swum });
    }

    /* 4: a black screen's recovery builds a new renderer on a fresh canvas */
    await H.hopTo(P, home.x, home.y, { tries: 200, step: 140, gap: 200 });
    await P.page.evaluate(() => { window.__ndOldGl = window._pixiRenderer.app.renderer.gl; window.__btLastGlRebuild = 0; window._rebuildRenderer('qa: nodepth'); });
    const rebuilt = await H.waitFor(P, () => { const R = window._pixiRenderer; const gl = R && R.app && R.app.renderer && R.app.renderer.gl; return !!gl && gl !== window.__ndOldGl; }, (v) => v,
      { timeout: 30000, label: 'a new renderer' }).catch(() => false);
    await P.page.waitForTimeout(6000);
    const after = rebuilt ? await ctxNow(P) : null;
    console.log(`    after the rebuild: ${JSON.stringify(after)}`);
    rec.ok(`the renderer rebuilt on a fresh canvas: its context has no depth buffer either (depth ${after && after.attrs.depth}) and keeps its stencil (${after && after.attrs.stencil})`,
      !!after && after.attrs.depth === false && after.attrs.stencil === true && after.stencilBits >= 8, after);
    rec.ok(`...DEPTH_TEST still never on (${after && after.depthTests}), no GL error`, !!after && after.depthTests === 0 && after.err === 0 && !after.lost, after);
    const drawn = await P.page.evaluate(() => { const R = window._pixiRenderer; const st = R && R.app && R.app.stage; let n = 0; const walk = (c) => { if (!c || c.visible === false) return; if (c.renderPipeId) n++; for (const k of c.children || []) walk(k); }; walk(st); return n; });
    await P.page.screenshot({ path: join(OUT, 'nodepth-rebuilt.png') }).catch(() => {});
    rec.ok(`...and the world draws again (${drawn} things drawn)`, drawn > 50, { drawn });
    const errors = P.logs.filter((l) => /pageerror/.test(l));
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 4));
  } finally {
    await P.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
