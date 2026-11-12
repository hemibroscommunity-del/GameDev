/* ═══ v2.3.4989: OTHER PLAYERS' NAME PLATES DRAWN AFTER THE FIGURES (?platelayer=1) ═══
 *
 * src/rendering/plateLayer.js.  Two phones in the Wheel's BroTown; B watches
 * with `?platelayer=1&onepicnear=0` (the pictures off until switched on below).
 * Every comparison reads the game's own picture of the stage, over A's plate
 * only, with no frame between the reads (mp-onepic's way):
 *
 *   1. A's plate is drawn by a plates layer (attached), and it IS drawn:
 *      not drawing it changes its rectangle.
 *   2. The same picture: A's plate drawn by the layer and drawn in place
 *      (window.__btPlateLayerSet off) are the same to the eye.
 *   3. As a picture (window.__btOnePicSet on, A standing): A's plate leaves
 *      the layer and is in A's picture, still the same to the eye.
 *   4. No page errors.
 *
 *   node tools/qa/mp/run.mjs platelayer
 */
import * as H from './harness.mjs';

const VIEW = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];
  const A = await H.newPlayer(browser, { name: 'Plated', wsPort, webPort, world: 'wheel', viewport: VIEW, touch: true });
  const B = await H.newPlayer(browser, { name: 'Reader', wsPort, webPort, world: 'wheel', viewport: VIEW, touch: true, guest: true, dpr: 3, query: 'platelayer=1&onepicnear=0' });
  for (const [n, P] of [['A', A], ['B', B]]) P.page.on('pageerror', (e) => errors.push(n + ': ' + String(e).slice(0, 200)));
  await H.enterWorld(A);
  await H.enterWorld(B);
  const inWheel = async (P) => {
    for (let i = 0; i < 120; i++) {
      const z = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
      if (z === 'wheel') return true;
      await P.page.waitForTimeout(500);
    }
    return false;
  };
  const okA = await inWheel(A), okB = await inWheel(B);
  rec.ok('setup: both phones in the Wheel', okA && okB, { okA, okB });
  if (!(okA && okB)) return;
  const stopA = H.keepAlive(A), stopB = H.keepAlive(B);
  const frames = (P, n) => P.page.evaluate((k) => new Promise((res) => { let i = 0; const f = () => (++i >= k ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

  /* in the page: A's display, its plate, and reads of the stage over the plate */
  const READS = ([id, steps]) => {
    const app = window._pixiRenderer && window._pixiRenderer.app;
    const R = app && app.renderer;
    const st = [app && app.stage];
    let d = null;
    while (st.length && !d) { const c = st.pop(); if (c && c.label === 'other_' + id) d = c; else if (c && c.children) for (const k of c.children) st.push(k); }
    if (!R || !d || !d._uiLayer) return { error: 'no figure or plate', d: !!d };
    const ui = d._uiLayer;
    const bb = ui.getBounds();
    const frame = new (app.screen.constructor)(Math.floor(bb.minX) - 2, Math.floor(bb.minY) - 2, Math.ceil(bb.maxX - bb.minX) + 4, Math.ceil(bb.maxY - bb.minY) + 4);
    const read = () => R.extract.pixels({ target: app.stage, frame, resolution: R.resolution });
    const cmp = (P, Q) => {
      let n = 0, over8 = 0, max = 0;
      const w = Math.min(P.width, Q.width), h = Math.min(P.height, Q.height);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * P.width + x) * 4, j = (y * Q.width + x) * 4;
        const dd = Math.max(Math.abs(P.pixels[i] - Q.pixels[j]), Math.abs(P.pixels[i + 1] - Q.pixels[j + 1]), Math.abs(P.pixels[i + 2] - Q.pixels[j + 2]));
        if (dd > 2) n++;
        if (dd > 8) over8++;
        if (dd > max) max = dd;
      }
      return { pixels: w * h, over2: n, over8, max };
    };
    const out = { layer: ui.parentRenderLayer ? ui.parentRenderLayer.label : null, frame: [frame.x, frame.y, frame.width, frame.height] };
    if (steps === 'layer') {
      const withLayer = read();
      ui.renderable = false;
      const noPlate = read();
      ui.renderable = true;
      window.__btPlateLayerSet(false);
      const inPlace = read();
      window.__btPlateLayerSet(true);
      out.drawn = cmp(withLayer, noPlate);
      out.same = cmp(withLayer, inPlace);
      window.__btPlateRef = inPlace;   /* for step 3 */
    } else if (steps === 'picture') {
      out.picture = cmp(read(), window.__btPlateRef);
      out.isPicture = (window.__btOnePic().ids || []).includes(id);
    }
    return out;
  };

  try {
    await H.waitMutualSight(A, B);
    const idA = await H.readState(A, (S) => S.myId);
    const posB = await H.readState(B, (S) => ({ x: S.player.x, y: S.player.y }));
    /* A north of B, so A stands in the back layer ('entities'), well on screen */
    await H.hopTo(A, posB.x + 90, posB.y - 120);
    await A.page.waitForTimeout(2000);
    await frames(B, 10);
    const att = await B.page.evaluate(() => (window.__btPlateLayer ? window.__btPlateLayer() : null));

    /* ── 1 and 2 ── */
    const r1 = await B.page.evaluate(READS, [idA, 'layer']);
    console.log('  platelayer, by the layer:', JSON.stringify(r1));
    rec.ok('A\'s plate is drawn by a plates layer, and drawn: not drawing it changes its rectangle',
      !!att && att.on && att.attached >= 1 && !r1.error && /^plates_/.test(r1.layer || '') && r1.drawn && r1.drawn.over8 > 200, { att, r1 });
    rec.ok('the same picture: drawn by the layer and drawn in place, A\'s plate is the same to the eye (under 0.5% of its pixels off by more than 8)',
      !r1.error && r1.same && r1.same.over8 <= r1.same.pixels * 0.005, r1.same);

    /* ── 3. as a picture, the plate goes with it ── */
    await B.page.evaluate(() => window.__btOnePicSet(true));
    let r3 = null;
    for (let i = 0; i < 40; i++) {
      await frames(B, 3);
      r3 = await B.page.evaluate(READS, [idA, 'picture']);
      if (r3 && r3.isPicture) break;
    }
    await frames(B, 10);
    r3 = await B.page.evaluate(READS, [idA, 'picture']);
    console.log('  platelayer, as a picture:', JSON.stringify(r3));
    rec.ok('as a picture, A\'s plate leaves the layer and is in the picture, the same to the eye',
      !!r3 && !r3.error && r3.isPicture && r3.layer === null && r3.picture && r3.picture.over8 <= r3.picture.pixels * 0.005, r3);
    await B.page.evaluate(() => window.__btOnePicSet(false));

    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopA(); stopB();
  }
}
