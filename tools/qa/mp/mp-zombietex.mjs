/* ═══ A DESTROYED TEXTURE LETS GO OF ITS PIXELS (v2.3.3069) ═══
 *
 * Pixi keeps destroyed texture sources reachable -- a pooled Batch remembers
 * the up to 32 sources of its last frame, a sprite drawn and then hidden keeps
 * its texture in its per-renderer draw data (the shadows' pools), and so do
 * the render group's meshes -- and every TextureSource keeps its constructor's
 * `options`, resource and all, after destroy() has nulled `resource`.  Found
 * by a heap snapshot after a tour of four lands: 43 destroyed sources alive,
 * 22.6 MB of the Wheel's object sheets (freed as you walked away, loaded again
 * when you came back, beside the copy still held) and canvases kept through
 * `options`.  pixiApp.js now lets go of `options.resource` on destroy.
 *
 * A phone (390 x 844, dpr 3) in the Wheel.  An init script wraps the base
 * TextureSource's destroy (the one prototype with destroy AND unload of its
 * own -- names are mangled in a production build) and keeps a WEAK reference
 * to every source destroyed and to the picture it was made from.  The phone
 * tours four lands and comes home; after a forced GC:
 *   1. sources were destroyed on the way (guard: the looks and sheets freed);
 *   2. none of the destroyed sources still alive holds its picture (main:
 *      22.6 MB in the heap-snapshot probe, 35.2 MB in this test's run);
 *   3. ...and the pictures they were made from are gone with them, unless the
 *      game still draws them (a live source made from the same picture).
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const LANDS = ['frost', 'ember', 'sky', 'hollows'];

const INIT = () => {
  window.__zt = [];
  const hook = () => {
    const R = window._pixiRenderer;
    const r = R && R.app && R.app.renderer;
    const list = r && r.texture && r.texture.managedTextures;
    if (!list || !list.length) return false;
    let p = Object.getPrototypeOf(list[0]);
    const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    while (p && !(own(p, 'destroy') && own(p, 'unload'))) p = Object.getPrototypeOf(p);
    if (!p) return false;
    if (p.__ztHooked) return true;
    p.__ztHooked = true;
    const d = p.destroy;
    p.destroy = function () {
      try {
        const res = this.resource || (this.options && this.options.resource);
        let kind = '-', bytes = 0;
        if (res) {
          if (typeof HTMLImageElement !== 'undefined' && res instanceof HTMLImageElement) { kind = 'picture'; bytes = (res.naturalWidth || 0) * (res.naturalHeight || 0) * 4; }
          else if (typeof HTMLCanvasElement !== 'undefined' && res instanceof HTMLCanvasElement) { kind = 'canvas'; bytes = res.width * res.height * 4; }
          else if (ArrayBuffer.isView(res)) { kind = 'buffer'; bytes = res.byteLength; }
          else kind = 'other';
        }
        window.__zt.push({ src: new WeakRef(this), res: res ? new WeakRef(res) : null, kind, bytes, label: String(this.label || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0].slice(0, 60) });
      } catch (e) { /* the game goes on */ }
      return d.apply(this, arguments);
    };
    return true;
  };
  const iv = setInterval(() => { try { if (hook()) clearInterval(iv); } catch (e) { /* not yet */ } }, 200);
  window.__ztCount = () => {
    const R = window._pixiRenderer;
    const r = R && R.app && R.app.renderer;
    const liveRes = new Set();
    try { for (const s of (r.texture.managedTextures || [])) if (s && !s.destroyed && s.resource) liveRes.add(s.resource); } catch (e) { /* none */ }
    const out = { destroyed: window.__zt.length, aliveSources: 0, holding: 0, holdingMB: 0, picturesAlive: 0, picturesMB: 0, sample: [] };
    for (const z of window.__zt) {
      const s = z.src.deref(), res = z.res && z.res.deref();
      if (s) out.aliveSources++;
      if (s && res && (s.resource === res || (s.options && s.options.resource === res))) {
        out.holding++; out.holdingMB += z.bytes / 1048576;
        if (out.sample.length < 8) out.sample.push(`${z.kind} ${(z.bytes / 1048576).toFixed(1)} MB ${z.label}`);
      }
      if (res && !liveRes.has(res)) { out.picturesAlive++; out.picturesMB += z.bytes / 1048576; }
    }
    out.holdingMB = +out.holdingMB.toFixed(1);
    out.picturesMB = +out.picturesMB.toFixed(1);
    return out;
  };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'zombietex', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: INIT });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!ok, ok);
    if (!ok) return;
    await P.page.evaluate(() => { const S = window._gameState.current; const R = S.rpg; R._quests = R._quests || {}; R._quests.tut_1 = true; S.player.godMode = true; });
    await P.page.waitForTimeout(5000);
    const hooked = await P.page.evaluate(() => typeof window.__ztCount === 'function' && Array.isArray(window.__zt));
    rec.ok('the destroy hook is in (guard)', hooked);
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const home = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    for (const land of LANDS) {
      const pt = WHEEL_SPAWNS[land].points[0];
      await H.hopTo(P, pt[0], pt[1] + 40, { tries: 200, step: 140, gap: 200 });
      await P.page.waitForTimeout(8000);
    }
    await H.hopTo(P, home.x, home.y, { tries: 200, step: 140, gap: 200 });
    await P.page.waitForTimeout(20000);   /* past every look's free-on-leaving (10 s) */
    const cdp = await P.ctx.newCDPSession(P.page);
    await cdp.send('HeapProfiler.enable').catch(() => {});
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    await P.page.waitForTimeout(500);
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    const z = await P.page.evaluate(() => window.__ztCount());
    console.log(`    home after the tour: ${JSON.stringify(z)}`);
    rec.ok(`the tour of ${LANDS.length} lands destroyed textures on the way (guard): ${z.destroyed}`, z.destroyed >= 50, z);
    rec.ok(`...and none of those still alive holds its picture: ${z.holding} of ${z.aliveSources} alive, ${z.holdingMB} MB (main: 22-35 MB measured)`, z.holding === 0, z);
    rec.ok(`...so the pictures they were made from go with them, but for any the game still draws: ${z.picturesAlive} alive, ${z.picturesMB} MB`, z.picturesMB < 2, z);
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
