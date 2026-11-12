/* ═══ v2.3.4885: ONE PICTURE PER STANDING PLAYER (?onepic=1) ═══
 *
 * src/rendering/peerImpostor.js, stage 1 (docs/specs/crowd-lanes.md "One
 * picture per player").  Two phones in the Wheel's BroTown.  B watches with
 * `?onepic=1&onepicnear=0` (every calm player a picture, so one other player
 * is enough to see it) at an iPhone's 3 device px a CSS px.
 *
 *   1. A stands on B's screen: B draws A as ONE picture (the probe's `ids`),
 *      and A's figure is no longer drawn (`renderable` false) but kept.
 *   2. THE PICTURE IS THE FIGURE: the game's own picture of the stage read
 *      three times in one moment (A a picture, A as layers, A not drawn):
 *      inside A the colours the same to the eye, no shift, and 99.5% of A's
 *      pixels matched within their 3 x 3.  Not bit for bit -- the layers
 *      are drawn from the world's large coordinates in 32-bit numbers (the
 *      note at the check).
 *   3. A walks: the picture is let go of (A is drawn as layers while moving),
 *      and A standing again is a picture again.
 *   4. No page errors.
 *
 *   node tools/qa/mp/run.mjs onepic
 */
import * as H from './harness.mjs';

const VIEW = { width: 390, height: 844 };

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

    /* ── 2. the picture is the figure ────────────────────────────────── */
    /* settled: no paint for a change in 10 frames (the slow safety refresh
       does not count) */
    const changePaints = async () => { const p0 = await probe(); return p0.paints - p0.refreshes; };
    for (let i = 0; i < 30; i++) {
      const before = await changePaints();
      await frames(B, 10);
      if ((await changePaints()) === before) break;
    }
    /* THREE READS OF THE GAME'S OWN PICTURE IN ONE MOMENT: the stage drawn as
       it is (A a picture), with the pictures off (A as layers) and with A not
       drawn (the ground), one after another with no frame between -- so
       nothing in the scene can move between them, and nothing on the page
       over the canvas is in them (screenshots were: a 💬 at A's feet that
       came and went, the sun's shadows, B's own plate).  Only A's picture's
       rectangle is read. */
    const diff = await B.page.evaluate((id) => {
      const app = window._pixiRenderer && window._pixiRenderer.app;
      const R = app && app.renderer;
      if (!R) return { error: 'no renderer' };
      const st = [app.stage];
      let sp = null, d = null;
      while (st.length && !(sp && d)) {
        const c = st.pop();
        if (c && c.label === 'onepic_' + id) sp = c;
        else if (c && c.label === 'other_' + id) d = c;
        if (c && c.children) for (const k of c.children) st.push(k);
      }
      if (!sp || !d) return { error: 'no picture or figure', sp: !!sp, d: !!d };
      const bb = sp.getBounds();
      const frame = new (app.screen.constructor)(Math.floor(bb.minX), Math.floor(bb.minY), Math.ceil(bb.maxX - bb.minX), Math.ceil(bb.maxY - bb.minY));
      const read = () => R.extract.pixels({ target: app.stage, frame, resolution: R.resolution });
      const P = read();
      window.__btOnePicSet(false);
      const L = read();
      d.renderable = false;
      const G = read();
      d.renderable = true;
      window.__btOnePicSet(true);
      const w = Math.min(P.width, L.width, G.width), h = Math.min(P.height, L.height, G.height);
      const at = (X, x, y) => { const i = (y * X.width + x) * 4; return [X.pixels[i], X.pixels[i + 1], X.pixels[i + 2]]; };
      const dif = (u, v) => Math.max(Math.abs(u[0] - v[0]), Math.abs(u[1] - v[1]), Math.abs(u[2] - v[2]));
      const isA = (x, y) => x >= 0 && y >= 0 && x < w && y < h && dif(at(L, x, y), at(G, x, y)) > 6;
      let mask = 0, n = 0, over2 = 0, over8 = 0, max = 0, inside = 0, insideOver8 = 0, unmatched = 0;
      const pts = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!isA(x, y)) continue;
          mask++;
          pts.push(x, y);
          const u = at(P, x, y), v = at(L, x, y);
          const dd = dif(u, v);
          if (dd > 0) n++;
          if (dd > 2) over2++;
          if (dd > 8) over8++;
          if (dd > max) max = dd;
          let flat = true;
          for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!isA(x + ox, y + oy) || dif(at(L, x + ox, y + oy), v) > 8) { flat = false; break; }
          if (flat) { inside++; if (dd > 8) insideOver8++; }
          let near = false;
          for (let oy = -1; oy <= 1 && !near; oy++) for (let ox = -1; ox <= 1 && !near; ox++) {
            const xx = x + ox, yy = y + oy;
            if (xx >= 0 && yy >= 0 && xx < w && yy < h && dif(u, at(L, xx, yy)) <= 16) near = true;
          }
          if (!near) unmatched++;
        }
      }
      let bestShift = null, bestN = Infinity;
      for (let sy = -2; sy <= 2; sy++) for (let sx = -2; sx <= 2; sx++) {
        let c = 0;
        for (let i = 0; i < pts.length; i += 2) {
          const x = pts[i], y = pts[i + 1], xx = x + sx, yy = y + sy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h || dif(at(P, xx, yy), at(L, x, y)) > 2) c++;
        }
        if (c < bestN) { bestN = c; bestShift = [sx, sy]; }
      }
      return { figurePixels: mask, differing: n, over2, over8, max, inside, insideOver8, unmatched, bestShift, w, h };
    }, idA);
    /* NOT bit for bit: the layers are drawn from the world's coordinates (x
       about 87,000 in BroTown) in the chip's 32-bit numbers, about 0.02 of a
       device px apart there, which shades a sharp edge or tips a rounding a
       little differently; the picture is drawn in the figure's own small
       coordinates, and a see-through piece (the name plate) is kept at 8 bits
       a channel and blended again, a level or two off.  So: the inside's
       colours the same to the eye (under 1% off by more than 8 of 255), no
       shift, and 99.5% of its pixels matched within their own 3 x 3 (nothing
       moved, nothing missing).  The raw counts are reported. */
    console.log('  onepic, picture against layers:', JSON.stringify(diff));
    rec.ok('the picture is the figure: its inside\'s colours the same to the eye, no shift, and 99.5% of its pixels matched within their 3 x 3',
      !!diff && !diff.error && diff.figurePixels > 2000 && diff.inside > 1000 && diff.insideOver8 <= diff.inside * 0.01
        && diff.bestShift && diff.bestShift[0] === 0 && diff.bestShift[1] === 0 && diff.unmatched <= diff.figurePixels * 0.005, diff);

    /* ── 3. walking lets the picture go; standing again makes it ──────── */
    let back = null;
    for (let i = 0; i < 40; i++) {
      back = await probe();
      if (back && back.ids.includes(idA)) break;
      await B.page.waitForTimeout(250);
    }
    let moving = null;
    const t0 = Date.now();
    /* A WALKS on its stick (hopTo moves in hops, which B never sees as a walk) */
    const stick = (x, y) => A.page.evaluate(([sx, sy]) => { const S = window._gameState.current; S.stickX = sx; S.stickY = sy; }, [x, y]);
    await stick(0, 1);
    const walk = (async () => { await A.page.waitForTimeout(2500); await stick(0, -1); await A.page.waitForTimeout(2500); await stick(0, 0); })();
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
