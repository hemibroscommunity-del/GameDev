/* ═══ A FRAME THAT THROWS DOES NOT LEAVE THE SCREEN BLACK (v2.3.3152) ═══
 *
 * Owner, 2026-10-11: "I also encountered an issue where the screen went
 * black..."  The leak hunt made it happen on main: after a Great Cave trip one
 * frame threw (Pixi's pooled mask filter, bindGroupFix.js), and the screen
 * stayed 0% lit for 22 s, until the watchdog rebuilt the renderer.  The frame
 * that threw had opened a stencil mask (a cut monster's death nests a sprite
 * mask inside a polygon one) and never closed it, and Pixi keeps that from one
 * frame to the next: every frame after drew with a stencil test nothing
 * passes.  renderHeal.js puts Pixi's masks and filters back to "nothing open"
 * whenever app.render throws.
 *
 * The throw is made here as it happened, on a page with the bind-group fix
 * off (`bindfix=0`, Pixi as it ships): a sprite mask drawn with a picture of
 * its own inside a polygon mask, the picture freed, the same drawn again.
 *   1. the frame throws -- the crash this reproduces (guard);
 *   2. with the heal, the screen is lit again a few frames later, with no
 *      rebuild and no watchdog strike, and the heal counted;
 *   3. a second page with `noheal` too stays dark after the same throw (the
 *      bug, shown) -- and the watchdog would have rebuilt it;
 *   4. no page errors.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* the watchdog's own lit share, as it reads the screen (BroTown.jsx __btWdSample) */
const litNow = async (P) => {
  const s = await P.page.evaluate(() => (window.__btWdSample ? window.__btWdSample() : null)).catch(() => null);
  if (!s) return null;
  return s.gl != null ? s.gl : s.image;
};

/* a sprite mask inside a polygon mask, its picture freed, then the same again */
const throwInsideAMask = (P) => P.page.evaluate(async () => {
  const r = window._pixiRenderer, app = r && r.app;
  if (!app) return { err: 'no app' };
  let spr = null, gfx = null;
  const find = (n) => {
    if (!n || (spr && gfx)) return;
    if (!spr && n.texture && n.anchor && !n.children.length && n.constructor) spr = n;
    if (!gfx && n.context && typeof n.rect === 'function') gfx = n;
    for (const c of n.children || []) find(c);
  };
  find(app.stage);
  if (!spr || !gfx) return { err: 'no classes to borrow' };
  const SpriteCls = spr.constructor, TexCls = spr.texture.constructor, GfxCls = gfx.constructor, ContCls = app.stage.constructor;   /* the stage is a plain Container */
  const frames = (n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const pic = (color) => { const c = document.createElement('canvas'); c.width = 32; c.height = 32; const g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, 32, 32); return TexCls.from(c); };
  const S = window._gameState.current;
  const world = app.stage.children.find((c) => c.label === 'world') || app.stage;
  const nest = (tex) => {
    const outer = new (ContCls)();
    const poly = new GfxCls();
    poly.rect(S.player.x - 60, S.player.y - 120, 120, 120).fill({ color: 0xffffff });
    const shown = new SpriteCls(tex), mask = new SpriteCls(tex);
    shown.x = mask.x = S.player.x - 16; shown.y = mask.y = S.player.y - 90;
    shown.mask = mask;
    outer.addChild(poly, shown, mask);
    outer.mask = poly;
    world.addChild(outer);
    return outer;
  };
  const before = window.__btRenderHeal ? window.__btRenderHeal().heals : null;
  const t1 = pic('#fff');
  const a = nest(t1);
  await frames(4);
  a.destroy({ children: true });
  t1.destroy(true);
  /* at once: the pooled filter that held t1 is the first the next sprite mask takes */
  const b = nest(pic('#0f0'));
  await frames(4);
  b.destroy({ children: true });
  await frames(12);
  return { ok: true, heals: window.__btRenderHeal ? window.__btRenderHeal().heals - (before || 0) : null };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const pages = [];
  try {
    for (const [name, query] of [['Healbro', 'bindfix=0'], ['Darkbro', 'bindfix=0&noheal']]) {
      const P = await H.newPlayer(browser, { name, wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel', query });
      pages.push(P);
      await H.enterWorld(P);
      const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
        { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
      rec.ok(`${name}: in the Wheel (guard)`, !!inW, inW);
      if (!inW) return;
      await P.page.waitForTimeout(5000);
      await P.page.evaluate(() => { window.__btRebuilds = []; window.__btRealRebuild = window._rebuildRenderer; window._rebuildRenderer = (why) => { window.__btRebuilds.push(String(why)); }; const S = window._gameState.current; S.__wdDark = 0; });
      const litBefore = await litNow(P);
      H.takeRenderThrows();
      const res = await throwInsideAMask(P);
      const threw = H.takeRenderThrows();
      const litAfter = await litNow(P);
      const after = await P.page.evaluate(() => ({ rebuilds: (window.__btRebuilds || []).length, heal: window.__btRenderHeal ? window.__btRenderHeal() : null }));
      if (name === 'Healbro') {
        rec.ok(`the frame throws inside a mask, as on main after a cave trip (${threw.length} throw)`, threw.length >= 1 && !!(res && res.ok), { res, threw: threw.slice(0, 1) });
        rec.ok(`...and with the heal the screen is lit again a moment later (${litBefore}% -> ${litAfter}%), the heal counted (${res && res.heals}), no rebuild (${after.rebuilds})`,
          litBefore != null && litBefore >= 90 && litAfter != null && litAfter >= 90 && res && res.heals >= 1 && after.rebuilds === 0, { litBefore, litAfter, res, after });
      } else {
        rec.ok(`...without it (noheal) the same throw leaves the screen dark (${litBefore}% -> ${litAfter}%): the black screen, shown`,
          threw.length >= 1 && litBefore != null && litBefore >= 90 && litAfter != null && litAfter < 30, { litBefore, litAfter, threw: threw.length, after });
      }
      const errors = P.logs.filter((l) => /pageerror/.test(l));
      rec.ok(`${name}: no page errors`, errors.length === 0, errors.slice(0, 4));
    }
  } finally {
    for (const P of pages) await P.ctx.close().catch(() => {});
  }
}
