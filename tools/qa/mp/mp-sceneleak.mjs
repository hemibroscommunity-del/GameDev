/* ═══ WHAT A BIG FIGHT AND A REBUILD LEAVE BEHIND (v2.3.3152) ═══
 *
 * Owner, 2026-10-11: "Push these to main then continue headless testing to
 * catch memory leaks".
 *
 * The leak hunt (a phone in the Wheel doing each kind of trip four times, every
 * kind of memory and the whole scene counted by path after each) found:
 *   - HIT EFFECTS KEPT EVERY SPRITE A BIG FIGHT MADE.  Their pools grow to the
 *     most pieces drawn at once and never gave one back: a Great Cave wave
 *     cleared in one go drew ~1,400, and 1,436 hidden sprites stayed in the
 *     scene at home for the rest of the visit (scene 851 -> 2,385 nodes, heap
 *     +7 MB).  Now a pool keeps what it drew in the last 6 s and 16 more
 *     (hitMaterialFx.js TRIM_MS / TRIM_SPARE), and a zone change empties it.
 *   - APP.RENDER THREW after the second Great Cave trip: a cut monster's death
 *     mask was its own picture, Pixi's pooled mask filter kept it, freeing the
 *     cave's art made Pixi destroy that filter's bind group, and the next
 *     sprite mask that took the filter broke the frame (bindGroupFix.js).
 *   - PIXI'S TEXTURE POOL KEPT EVERY TEXTURE IT HANDED OUT: the scratch
 *     textures of its filters and every canvas Text's (name plates, words),
 *     on the GPU for good -- render textures at home 2.3 -> 8 -> 10 MB over
 *     two cave trips.  Now one unused for 30 s is destroyed, and a zone
 *     change lets go of them all (texturePoolTrim.js).
 *   - A REBUILD LEFT ITS SHADOW SYSTEM BEHIND, in shadows.js's module list,
 *     with its pools, its filter and its old world container: a black
 *     screen's rebuild (v2.3.3017, v2.3.3151) made one more every time.
 *
 * On a phone-sized page in the Wheel against a real worker:
 *   1. a wave of hit effects (bursts fed into the queue the four hit sites
 *      feed, S._debrisBursts, as many as it takes a frame) is drawn: the pools
 *      hold hundreds of sprites;
 *   2. ...and once it is over they give them back: held no more than the
 *      spare, and the scene back within the spare of where it was;
 *   3. a sprite mask drawn with a picture of its own, that picture freed, and
 *      another sprite mask drawn: no render throw (Pixi's pooled mask filter
 *      kept the freed picture, and Pixi destroyed the filter's bind group --
 *      the hunt's app.render crash after a Great Cave trip; bindGroupFix.js);
 *   4. twenty texts drawn and destroyed (a cave wave's name plates): their
 *      textures go back to Pixi's texture pool, a sweep destroys them
 *      (texturePoolTrim.js), and a text and the filters still draw;
 *   5. after two renderer rebuilds the module holds ONE shadow system;
 *   6. the render loop did not throw, and no page errors.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const SPARE_ALL = 8 * 16;   /* hitMaterialFx: two sides x four pools x TRIM_SPARE */
const KINDS = ['snow', 'goo', 'stone', 'bone', 'goblin', 'ash'];

const hitFx = (P) => P.page.evaluate(() => {
  const p = window.__btHitFx ? window.__btHitFx() : null;
  return p ? { live: p.live, drawn: p.drawn.front + p.drawn.back, held: p.held ? p.held.front + p.held.back : null } : null;
});
const sceneTotal = (P) => P.page.evaluate(() => { const s = window.__btScene ? window.__btScene() : null; return s ? s.total : null; });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Sceneleak', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.waitForTimeout(6000);
    const sceneBefore = await sceneTotal(P);
    const before = await hitFx(P);

    /* 1: a wave of bursts round the player, fed as fast as the renderer takes them */
    const fed = await P.page.evaluate((kinds) => new Promise((res) => {
      const S = window._gameState.current;
      let rounds = 0, peakHeld = 0, peakDrawn = 0;
      const t0 = performance.now();
      const tick = () => {
        if (!S._debrisBursts) S._debrisBursts = [];
        if (rounds < 30 && S._debrisBursts.length === 0) {
          for (let i = 0; i < 24; i++) {
            const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 110;
            const x = S.player.x + Math.cos(a) * r, gy = S.player.y + Math.sin(a) * r * 0.6;
            S._debrisBursts.push({ monsterId: 'qa-wave-' + rounds + '-' + i, kind: kinds[(rounds + i) % kinds.length], tint: 0xffffff,
              x, y: gy - 40, gy, h: 40, ang: a, t0: Date.now(), weapon: 'bolt', crit: true, big: true });
          }
          rounds++;
        }
        const p = window.__btHitFx && window.__btHitFx();
        if (p) {
          if (p.held) peakHeld = Math.max(peakHeld, p.held.front + p.held.back);
          peakDrawn = Math.max(peakDrawn, p.drawn.front + p.drawn.back);
        }
        if (performance.now() - t0 < 4000) requestAnimationFrame(tick);
        else res({ rounds, peakHeld, peakDrawn });
      };
      requestAnimationFrame(tick);
    }), KINDS);
    rec.ok(`a wave of hit effects is drawn (${fed.rounds} rounds of 24 bursts, ${fed.peakDrawn} pieces at once) and the pools grow to hold it (${fed.peakHeld} sprites)`,
      fed.rounds >= 10 && fed.peakDrawn >= 300 && fed.peakHeld >= 300, { fed, before });

    /* 2: when it is over (a burst lives 5.4 s), the pools give the sprites back
       at their next trim -- within two 6 s windows */
    const after = await H.waitFor(P, () => {
      const p = window.__btHitFx ? window.__btHitFx() : null;
      return p ? { live: p.live, drawn: p.drawn.front + p.drawn.back, held: p.held ? p.held.front + p.held.back : null } : null;
    }, (v) => !!v && v.live === 0 && v.held != null && v.held <= SPARE_ALL, { timeout: 40000, label: 'the pools trimmed' }).catch(() => hitFx(P));
    const sceneAfter = await sceneTotal(P);
    rec.ok(`...and once it is over they give them back: ${after && after.held} sprites held (at most ${SPARE_ALL}), the scene ${sceneBefore} -> ${sceneAfter} nodes`,
      !!after && after.live === 0 && after.held <= SPARE_ALL && sceneAfter != null && sceneBefore != null && sceneAfter <= sceneBefore + SPARE_ALL + 40,
      { after, sceneBefore, sceneAfter });

    /* 3: a sprite mask's picture freed, then another sprite mask drawn.  Pixi
       draws a sprite mask through a pooled filter that keeps the last mask's
       picture; freeing that picture made Pixi destroy the pooled filter's bind
       group, and the next sprite mask that took it threw inside app.render
       (the hunt's crash: a cut monster's death mask, its art freed leaving the
       Great Cave).  Made here with pictures of our own on the live stage. */
    H.takeRenderThrows();
    const maskTest = await P.page.evaluate(async () => {
      const r = window._pixiRenderer, app = r && r.app;
      if (!app) return { err: 'no app' };
      let any = null;
      const find = (n) => { if (any || !n) return; if (n.texture && n.anchor && n.constructor) { any = n; return; } for (const c of n.children || []) find(c); };
      find(app.stage);
      if (!any) return { err: 'no sprite to borrow the classes from' };
      const SpriteCls = any.constructor, TexCls = any.texture.constructor;
      const frames = (n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const pic = (color) => { const c = document.createElement('canvas'); c.width = 32; c.height = 32; const g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, 32, 32); return TexCls.from(c); };
      const S = window._gameState.current;
      const pair = (tex) => {
        const shown = new SpriteCls(tex), mask = new SpriteCls(tex);
        shown.x = mask.x = S.player.x; shown.y = mask.y = S.player.y - 60;
        shown.mask = mask;
        const world = app.stage.children.find((c) => c.label === 'world') || app.stage;
        world.addChild(shown); world.addChild(mask);
        return { shown, mask };
      };
      const t1 = pic('#fff');
      const a = pair(t1);
      await frames(4);
      a.shown.mask = null;
      a.shown.destroy(); a.mask.destroy();
      t1.destroy(true);   /* the picture freed, as a land's art is on leaving it */
      await frames(2);
      const b = pair(pic('#0f0'));
      await frames(6);
      b.shown.mask = null;
      b.shown.destroy(); b.mask.destroy();
      return { ok: true, fix: window.__btBindFix ? window.__btBindFix() : null };
    });
    const maskThrows = H.takeRenderThrows();
    rec.ok(`a sprite mask's picture freed, the next sprite mask still draws: no render throw (${maskThrows.length}; the fix swapped ${maskTest && maskTest.fix ? maskTest.fix.swaps : '?'} entries)`,
      !!(maskTest && maskTest.ok) && maskThrows.length === 0, { maskTest, maskThrows: maskThrows.slice(0, 2) });

    /* 4: Pixi's texture pool lets go.  Twenty texts drawn at once (a cave
       wave's name plates), then destroyed: their textures go back to the
       pool, which kept them on the GPU for good.  A sweep (the zone change's,
       or the render loop's after 30 s) destroys them; then a text and the
       filters (the shadows' layer, a sprite mask) still draw. */
    H.takeRenderThrows();
    const pool = await P.page.evaluate(async () => {
      const r = window._pixiRenderer, app = r && r.app;
      if (!app || !window.__btTexPool) return { err: 'no probe' };
      let any = null;
      const find = (n) => { if (any || !n) return; if (n.text != null && n.style && n.constructor && n.constructor.name !== 'BitmapText') { any = n; return; } for (const c of n.children || []) find(c); };
      find(app.stage);
      if (!any) return { err: 'no Text on the stage to borrow the class from' };
      const TextCls = any.constructor;
      const frames = (n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const S = window._gameState.current;
      const world = app.stage.children.find((c) => c.label === 'world') || app.stage;
      const before = window.__btTexPool();
      const texts = [];
      for (let i = 0; i < 20; i++) {
        const t = new TextCls({ text: 'Lv 26 Rock Golem ' + i, style: { fontSize: 22, fill: 0xffffff } });
        t.x = S.player.x - 80; t.y = S.player.y - 140 - i * 4;
        world.addChild(t); texts.push(t);
      }
      await frames(4);
      for (const t of texts) t.destroy();
      await frames(3);
      const handedBack = window.__btTexPool();
      window.__btTexPoolSweep(0);
      const swept = window.__btTexPool();
      const t2 = new TextCls({ text: 'still drawn', style: { fontSize: 22, fill: 0xffffff } });
      t2.x = S.player.x - 60; t2.y = S.player.y - 160;
      world.addChild(t2);
      await frames(8);
      t2.destroy();
      return { before, handedBack, swept };
    });
    const poolThrows = H.takeRenderThrows();
    rec.ok(`Pixi's texture pool lets go: twenty name plates' textures handed back (${pool.handedBack ? pool.handedBack.pooled : '?'} pooled, ${pool.handedBack ? pool.handedBack.pooledMB : '?'} MB), swept to ${pool.swept ? pool.swept.pooled : '?'}, and text and filters still draw (${poolThrows.length} render throws)`,
      !!(pool.handedBack && pool.swept) && pool.handedBack.installed && pool.handedBack.pooled >= 20 && pool.swept.pooled === 0 && poolThrows.length === 0,
      { pool, poolThrows: poolThrows.slice(0, 2) });

    /* 5: two rebuilds, one shadow system */
    const systemsOf = () => P.page.evaluate(() => { const p = window.__btLightFx && window.__btLightFx.probe(); return p && p.shadows ? p.shadows.systems : null; });
    const sys0 = await systemsOf();
    for (let k = 0; k < 2; k++) {
      await P.page.evaluate(() => { window.__qaOldR = window._pixiRenderer; window.__btLastGlRebuild = 0; window._rebuildRenderer('qa: mp-sceneleak'); });
      await H.waitFor(P, () => !!(window._pixiRenderer && window._pixiRenderer !== window.__qaOldR && window._pixiRenderer.app), (v) => v,
        { timeout: 30000, label: 'rebuilt' }).catch(() => false);
      await P.page.waitForTimeout(4000);
    }
    const sys2 = await systemsOf();
    rec.ok(`after two renderer rebuilds the module holds one shadow system (${sys0} -> ${sys2})`, sys0 === 1 && sys2 === 1, { sys0, sys2 });

    const threw = H.takeRenderThrows();
    rec.ok('the render loop did not throw', threw.length === 0, threw.slice(0, 3));
    const errors = P.logs.filter((l) => /pageerror/.test(l));
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 4));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
