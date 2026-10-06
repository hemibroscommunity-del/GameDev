/* ═══ THE WORLD MAP'S CANVAS IS EMPTIED AS IT CLOSES (v2.3.3066) ═══
 *
 * The world map (src/ui/WorldMapOverlay.jsx) draws on a canvas the size of
 * the screen at the device's pixels -- 390 x 844 at 3x is 11.3 MB -- made when
 * the map opens and dropped when it closes.  Dropped, its pixels stayed until
 * the garbage collector came round to it: open and close the map five times
 * and up to five dead canvases' worth was held (docs/MEMORY-PLAN.md, freed on
 * close).  Now it is emptied as the map closes.
 *
 * A phone (390 x 844, dpr 3) in the Wheel; an init script keeps a weak
 * reference to every canvas made.  The map opened and closed five times
 * (window.__btWorldMapOpen, the QA hook):
 *   1. each time it opened, drawn (window.__btWorldMap: open, the eight lands
 *      labelled) -- the map works as before;
 *   2. after the five, with NO garbage collection, the map canvases still
 *      holding pixels: none (main: 3 of the 5, 31.4 MB, the GC having taken
 *      two in between);
 *   3. ...and the map opens and draws once more after it all.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const INIT = () => {
  const canv = [];
  const ce = Document.prototype.createElement;
  Document.prototype.createElement = function (tag) {
    const el = ce.apply(this, arguments);
    try { if (String(tag).toLowerCase() === 'canvas') canv.push(new WeakRef(el)); } catch (e) { /* ignore */ }
    return el;
  };
  window.__mapCanvases = () => {
    let n = 0, bytes = 0, open = 0;
    for (const r of canv) {
      const el = r.deref();
      if (!el || !el.hasAttribute || !el.hasAttribute('data-world-map-canvas')) continue;
      if (el.isConnected) { open++; continue; }
      const px = (el.width | 0) * (el.height | 0);
      if (px) { n++; bytes += px * 4; }
    }
    return { closedHolding: n, mb: +(bytes / 1048576).toFixed(1), open };
  };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'mapfree', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: INIT });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!ok, ok);
    if (!ok) return;
    await P.page.waitForTimeout(4000);
    const hook = await P.page.evaluate(() => typeof window.__btWorldMapOpen === 'function');
    rec.ok('the world map can be opened (guard: window.__btWorldMapOpen)', hook);
    if (!hook) return;
    const openOnce = async () => {
      await P.page.evaluate(() => window.__btWorldMapOpen(true));
      const w = await H.waitFor(P, () => window.__btWorldMap || null, (v) => !!v && v.open && v.labels && v.labels.lands === 8,
        { timeout: 15000, label: 'the map drawn' }).catch(() => null);
      await P.page.waitForTimeout(600);
      await P.page.evaluate(() => window.__btWorldMapOpen(false));
      await P.page.waitForTimeout(600);
      return !!w;
    };
    const drawn = [];
    for (let i = 0; i < 5; i++) drawn.push(await openOnce());
    rec.ok(`each of five times it opened, it drew the Wheel with its eight lands: ${drawn.join(', ')}`, drawn.every(Boolean), drawn);
    const held = await P.page.evaluate(() => window.__mapCanvases());
    console.log(`    after five, no GC: ${JSON.stringify(held)}`);
    rec.ok(`...and once closed, no map canvas holds its pixels, without waiting for a garbage collection: ${held.closedHolding} holding, ${held.mb} MB (main: 3 of the 5 still holding, 31.4 MB measured)`,
      held.closedHolding === 0 && held.open === 0, held);
    const again = await openOnce();
    rec.ok('...and the map opens and draws once more after it all', again, { again });
    const errors = P.logs.filter((l) => /pageerror/.test(l));
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 4));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
