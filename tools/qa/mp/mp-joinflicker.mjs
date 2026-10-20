/* ═══ v2.3.3495: DOES ANY OF YOUR BRO'S LAYERS FLICKER WHEN YOU COME BACK? ═══
 *
 * The owner: "flicker of hair/torso after returning/joining".  This watches
 * your own figure, every frame, for the first seconds after each way of
 * coming back:
 *
 *   join     -- a reload and the road a returning player takes (Continue,
 *               the character's row, the loading screen);
 *   rebuild  -- the renderer made again on a fresh canvas, which is what an
 *               iPhone's lost graphics context after time away gets
 *               (window._rebuildRenderer: 'context was lost while away');
 *   tab      -- the page hidden and shown again (no rebuild);
 *   recovery -- the black-screen watchdog's reload (`bt_resume_now`): no
 *               loading screen, straight back into the world (BroTown's
 *               auto-rejoin, v2.3.777), the avatar's pictures preloading
 *               behind a spinner while the world already shows.
 *
 * For each layer (body, hair, hat, beard, shirt, plate, greaves, head
 * overlay) it counts the BLINKS (shown, hidden, shown again within 400 ms)
 * and the SWAPS BACK (picture A, B, then A again within 400 ms), and for the
 * body the PLAIN frames: a frame of a jog or stand drawn with the plain body
 * under the armour because its masked bake was not ready
 * (window.__btBakeWorker().local.plain, entityRenderer _localMaskedFrame).
 * A character dressed to reach every bake: a recoloured afro, a beard, a
 * copper torso and iron greaves (the layered figure), a tee; standing for
 * 3 s, then jogging east.
 *
 *   node tools/qa/mp/run.mjs joinflicker
 */
import * as H from './harness.mjs';

const LAYERS = ['_spriteBody', '_hairSprite', '_headwearSprite', '_facialHairSprite', '_gearShirt', '_gearChest', '_gearLegs', '_bodyHead'];

/* watch the local figure every frame for `ms` */
const watch = (P, ms) => P.page.evaluate(({ ms, LAYERS }) => new Promise((resolve) => {
  const t0 = performance.now();
  const hist = Object.create(null);
  for (const k of LAYERS) hist[k] = [];
  let frames = 0;
  const bw0 = window.__btBakeWorker ? window.__btBakeWorker().local : null;
  const shown = (s) => { for (let c = s; c; c = c.parent) { if (!c.visible || c.renderable === false) return false; if (c.parent == null) return true; } return true; };
  const tick = () => {
    const R = window._pixiRenderer;
    const d = R && R.playerDisplayRaw && R.playerDisplayRaw();
    const t = performance.now() - t0;
    if (d) {
      frames++;
      for (const k of LAYERS) {
        const s = d[k];
        const on = !!(s && s.visible && shown(s) && s.alpha > 0.02 && s.texture && s.texture.uid != null && s.texture.width > 2);
        const src = on && s.texture.source ? s.texture.source.uid : null;
        const h = hist[k];
        const last = h[h.length - 1];
        if (!last || last.on !== on || last.src !== src) h.push({ t: Math.round(t), on, src, pose: d._animPose, dir: d._animDir });
      }
    }
    if (t < ms) requestAnimationFrame(tick);
    else {
      const bw1 = window.__btBakeWorker ? window.__btBakeWorker().local : null;
      const out = { frames, layers: Object.create(null),
        plain: bw0 && bw1 ? bw1.plain - bw0.plain : null, hits: bw0 && bw1 ? bw1.hits - bw0.hits : null };
      for (const k of LAYERS) {
        const h = hist[k];
        let blinks = 0, swapsBack = 0;
        for (let i = 2; i < h.length; i++) {
          const a = h[i - 2], b = h[i - 1], c = h[i];
          if (a.on && !b.on && c.on && c.t - a.t < 400) blinks++;
          if (a.on && b.on && c.on && a.src != null && a.src === c.src && b.src !== a.src && c.t - a.t < 400) swapsBack++;
        }
        out.layers[k] = { changes: h.length - 1, blinks, swapsBack, tail: h.slice(-6).map((e) => (e.on ? e.src : '-') + '@' + e.t) };
      }
      resolve(out);
    }
  };
  requestAnimationFrame(tick);
}), { ms, LAYERS });

/* stand 3 s, then jog east for the rest of the watch */
async function watchStandThenJog(P, ms) {
  const jog = P.page.evaluate(() => new Promise((r) => setTimeout(r, 3000))).then(() => P.page.keyboard.down('d'));
  const w = await watch(P, ms);
  await jog; await P.page.keyboard.up('d');
  return w;
}

const displayUp = (P, label) => H.waitFor(P, () => {
  const R = window._pixiRenderer;
  return !!(R && R.playerDisplayRaw && R.playerDisplayRaw());
}, (v) => v, { timeout: 90000, label });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Flicker', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await H.enterWorld(P);
  const dress = () => P.page.evaluate(() => {
    try {
      window.__btGearSet('shirt', 'tshirt');
      window.__btGearSet('chest', 'copperplate');
      window.__btGearSet('legs', 'irongreaves');
      if (window.__btSetHair) window.__btSetHair('afro');
      /* a recoloured afro and a beard: their stores are read at load */
      localStorage.setItem('bt-haircolor', 'auburn');
      localStorage.setItem('bt-facialhair', 'beard');
    } catch (e) { /* reported below */ }
    const S = window._gameState.current;
    if (S && S.rpg) { S.rpg.weapon = { name: 'Copper Greatsword', type: 'greatsword', gearBase: 'copper' }; S.rpg.activeSlot = 'melee'; }
  });
  await dress();
  await P.page.waitForTimeout(3000);
  const roads = [];
  const report = (road, w) => {
    roads.push({ road, w });
    const summary = Object.entries(w.layers).map(([k, v]) => `${k.replace(/^_/, '')} ${v.blinks}b/${v.swapsBack}s/${v.changes}c`).join(', ');
    console.log(`    ${road}: ${w.frames} frames, ${w.plain} plain body frames (${w.hits} baked); ${summary}`);
  };

  /* 1. JOIN: a reload and the returning player's road */
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await H.enterWorld(P);
  await dress();
  await displayUp(P, 'back in the world');
  report('join', await watchStandThenJog(P, 8000));

  /* 2. REBUILD: the renderer made again, as after a lost context */
  await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y).catch(() => {});
  await P.page.evaluate(() => { window.__btLastGlRebuild = 0; if (window._rebuildRenderer) window._rebuildRenderer('qa: joinflicker'); });
  await P.page.waitForTimeout(300);
  await displayUp(P, 'renderer rebuilt');
  report('rebuild', await watchStandThenJog(P, 8000));

  /* 3. TAB: hidden for 6 s and shown again */
  await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y).catch(() => {});
  await P.page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('blur'));
  });
  await P.page.waitForTimeout(6000);
  await P.page.evaluate(() => {
    delete document.visibilityState; delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  report('tab', await watchStandThenJog(P, 8000));

  /* 4. RECOVERY: the watchdog's reload, straight back in with no loading screen */
  await P.page.evaluate(() => { try { sessionStorage.setItem('bt_resume_now', '1'); } catch (e) { /* none */ } });
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  const route = await P.page.waitForFunction(() => window.__btBootRoute || null, null, { timeout: 30000, polling: 100 })
    .then((h) => h.jsonValue()).catch(() => null);
  await displayUp(P, 'back in after the recovery reload');
  const rw = await watchStandThenJog(P, 8000);
  rw.route = route;
  report('recovery (' + route + ')', rw);

  const worst = roads.flatMap((r) => Object.entries(r.w.layers).map(([k, v]) => ({ road: r.road, k, blinks: v.blinks, swapsBack: v.swapsBack, tail: v.tail })))
    .filter((x) => x.blinks || x.swapsBack);
  rec.ok(`REPORT: layers that blink or swap back after coming back (${worst.length ? worst.map((x) => x.road + ' ' + x.k + ' ' + x.blinks + 'b/' + x.swapsBack + 's').join(', ') : 'none'}); `
    + `plain body frames ${roads.map((r) => r.road + ' ' + r.w.plain).join(', ')}`,
    roads.length === 4 && roads.every((r) => r.w.frames > 5), roads.map((r) => ({ road: r.road, frames: r.w.frames, plain: r.w.plain })));
  rec.ok('no layer blinks or swaps back after coming back in', worst.length === 0, worst);
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
