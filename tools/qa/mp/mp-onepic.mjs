/* ═══ v2.3.4885: ONE PICTURE PER STANDING PLAYER (?onepic=1) ═══
 *
 * src/rendering/peerImpostor.js, stage 1 (docs/specs/crowd-lanes.md "One
 * picture per player").  Two phones in the Wheel's BroTown.  B watches with
 * `?onepic=1&onepicnear=0` (every calm player a picture, so one other player
 * is enough to see it) at an iPhone's 3 device px a CSS px.
 *
 *   1. A stands on B's screen: B draws A as ONE picture (the probe's `ids`),
 *      and A's figure is no longer drawn (`renderable` false) but kept.
 *   2. TO THE PIXEL: the same scene photographed with A as a picture and as
 *      layers (window.__btOnePicSet off, a few frames, on again): the two
 *      crops of A's figure differ in no pixel by more than 2 of 255 (the
 *      prototype: 0 of 160,000).
 *   3. A walks: the picture is let go of (A is drawn as layers while moving),
 *      and A standing again is a picture again.
 *   4. No page errors.
 *
 *   node tools/qa/mp/run.mjs onepic
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const VIEW = { width: 390, height: 844 };
const OUT = join(process.cwd(), 'tools/qa/mp/out');

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];
  const A = await H.newPlayer(browser, { name: 'Stander', wsPort, webPort, world: 'wheel', viewport: VIEW, touch: true });
  const B = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, world: 'wheel', viewport: VIEW, touch: true, guest: true, dpr: 3, query: 'onepic=1&onepicnear=0' });
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
  const probe = () => B.page.evaluate(() => (window.__btOnePic ? window.__btOnePic() : null));

  try {
    await H.waitMutualSight(A, B);
    const idA = await H.readState(A, (S) => S.myId);
    const posB = await H.readState(B, (S) => ({ x: S.player.x, y: S.player.y }));
    /* A a little east and south of B, well on B's screen; B never moves after */
    await H.hopTo(A, posB.x + 110, posB.y + 40);
    await A.page.waitForTimeout(1500);

    /* ── 1. a picture ─────────────────────────────────────────────────── */
    let p = null;
    for (let i = 0; i < 40; i++) {
      p = await probe();
      if (p && p.ids && p.ids.includes(idA)) break;
      await B.page.waitForTimeout(250);
    }
    const fig = await B.page.evaluate((id) => {
      const R = window._pixiRenderer;
      const st = [R && R.app && R.app.stage];
      while (st.length) {
        const c = st.pop();
        if (c && c.label === 'other_' + id) return { renderable: c.renderable, visible: c.visible, kids: c.children.length };
        if (c && c.children) for (const k of c.children) st.push(k);
      }
      return null;
    }, idA);
    rec.ok('A standing on B\'s screen is drawn as one picture: in the probe\'s pictures, its figure kept but not drawn',
      !!p && p.on && p.ids.includes(idA) && !!fig && fig.renderable === false && fig.visible === true && fig.kids > 10, { probe: p, fig });

    /* ── 2. to the pixel ─────────────────────────────────────────────── */
    const box = await H.figureBox(B, { pad: 30, peerId: idA });
    let diff = null;
    if (box) {
      await frames(B, 4);
      const asPic = await B.page.screenshot({ clip: box });
      await B.page.evaluate(() => window.__btOnePicSet(false));
      await frames(B, 6);
      const asLayers = await B.page.screenshot({ clip: box });
      await B.page.evaluate(() => window.__btOnePicSet(true));
      const a = H.decodePng(asPic), b = H.decodePng(asLayers);
      let n = 0, big = 0, max = 0, opaque = 0;
      const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const u = a.at(x, y), v = b.at(x, y);
          const dd = Math.max(Math.abs(u[0] - v[0]), Math.abs(u[1] - v[1]), Math.abs(u[2] - v[2]));
          if (dd > 0) n++;
          if (dd > 2) big++;
          if (dd > max) max = dd;
          opaque++;
        }
      }
      diff = { pixels: opaque, differing: n, over2: big, max, box };
      try { mkdirSync(OUT, { recursive: true }); writeFileSync(join(OUT, 'onepic-picture.png'), asPic); writeFileSync(join(OUT, 'onepic-layers.png'), asLayers); } catch (e) { /* pictures are for a person */ }
    }
    rec.ok('to the pixel: A as a picture and A as layers, the same scene, differ in no pixel by more than 2 of 255',
      !!diff && diff.over2 === 0, diff);

    /* ── 3. walking lets the picture go; standing again makes it ──────── */
    let back = null;
    for (let i = 0; i < 40; i++) {
      back = await probe();
      if (back && back.ids.includes(idA)) break;
      await B.page.waitForTimeout(250);
    }
    await H.hopTo(A, posB.x + 110, posB.y + 160);
    let moving = null;
    const t0 = Date.now();
    /* sampled while A walks back and forth */
    const walk = (async () => { for (let i = 0; i < 3; i++) { await H.hopTo(A, posB.x + 110, posB.y + 40); await H.hopTo(A, posB.x + 110, posB.y + 160); } })();
    let sawLayered = false;
    while (Date.now() - t0 < 6000) {
      moving = await B.page.evaluate((id) => {
        const S = window._gameState.current;
        const R = window._pixiRenderer;
        const st = [R && R.app && R.app.stage];
        let d = null;
        while (st.length && !d) { const c = st.pop(); if (c && c.label === 'other_' + id) d = c; else if (c && c.children) for (const k of c.children) st.push(k); }
        const o = S.others && S.others[id];
        return { moving: !!(d && d._remoteMoving), renderable: d ? d.renderable : null, pic: window.__btOnePic().ids.includes(id), x: o && o.x };
      }, idA);
      if (moving.moving && moving.renderable === true && !moving.pic) { sawLayered = true; break; }
      await B.page.waitForTimeout(100);
    }
    await walk.catch(() => {});
    rec.ok('A walking is drawn as layers (no picture while moving)', sawLayered, moving);
    await A.page.waitForTimeout(2500);
    let again = null;
    for (let i = 0; i < 40; i++) {
      again = await probe();
      if (again && again.ids.includes(idA)) break;
      await B.page.waitForTimeout(250);
    }
    rec.ok('A standing again is a picture again', !!again && again.ids.includes(idA), again);

    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
    console.log('  onepic probe:', JSON.stringify(await probe()));
  } finally {
    stopA(); stopB();
  }
}
