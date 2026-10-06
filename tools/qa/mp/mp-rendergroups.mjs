/* ═══ THE WORLD AND THE SCREEN ARE RENDER GROUPS (v2.3.3079) ═══
 *
 * The owner's yes to "smoother frames (Pixi render groups) -- occasional 1-px
 * shift, not byte-identical".  The world container (the camera) and the screen
 * container (the HUD) are Pixi render groups (pixiApp.js buildScene);
 * `?norendergroups` is the scene as it was.
 *
 * On a phone (390 x 844, 3x) in the Wheel's Brotown and at a fight:
 *   1. both are render groups (guard), and `?norendergroups` turns them off;
 *   2. THE SAME FRAME, drawn with and without them: the game's frames are held
 *      (nothing updates), the scene is drawn twice as it is -- the two must be
 *      identical, or the comparison means nothing -- then once with the groups
 *      off; the pixels that differ are counted, and must be few and small:
 *      edges landing a device pixel over, never a missing or moved object;
 *   3. a picture of each difference (out/rendergroups-*.png), for the owner;
 *   4. the groups back on, the game draws on, no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* Hold the game's frames, draw the scene three times (as it is, as it is
   again, with the groups off), read each back off the drawing buffer at once,
   compare, put everything back. */
const sameFrame = (P) => P.page.evaluate(async () => {
  const w = window;
  const app = w._pixiRenderer.app, R = app.renderer, gl = R.gl;
  const groups = app.stage.children.filter((c) => c.label === 'world' || c.label === 'screen');
  w.__rgHeld = [];
  w.__rgRaf = w.requestAnimationFrame;
  w.requestAnimationFrame = (cb) => { w.__rgHeld.push(cb); return 0; };
  await new Promise((r) => setTimeout(r, 700));   /* a frame already asked for runs out */
  const W = gl.drawingBufferWidth, Hh = gl.drawingBufferHeight;
  const grab = () => {
    R.render(app.stage);
    const px = new Uint8Array(W * Hh * 4);
    gl.readPixels(0, 0, W, Hh, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  };
  const on1 = grab();
  const on2 = grab();
  for (const g of groups) g.isRenderGroup = false;
  const off = grab();
  for (const g of groups) g.isRenderGroup = true;
  const on3 = grab();
  const cmp = (a, b, mark) => {
    let n = 0, big = 0, maxd = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (d) {
        n++; if (d > 48) big++; if (d > maxd) maxd = d;
        if (mark) { mark[i] = 255; mark[i + 1] = 0; mark[i + 2] = 255; mark[i + 3] = 255; }
      }
    }
    return { n, big, maxd };
  };
  const mark = new Uint8Array(on1);
  const steady = cmp(on1, on2, null);
  const diff = cmp(on1, off, mark);
  const back = cmp(on1, on3, null);
  /* the difference as a picture: the frame, every differing pixel magenta
     (readPixels is bottom-up) -- a PNG made by a canvas */
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = Hh;
  const g2 = cv.getContext('2d');
  const img = g2.createImageData(W, Hh);
  for (let y = 0; y < Hh; y++) img.data.set(mark.subarray((Hh - 1 - y) * W * 4, (Hh - y) * W * 4), y * W * 4);
  g2.putImageData(img, 0, 0);
  const png = cv.toDataURL('image/png');
  cv.width = 0; cv.height = 0;
  const held = w.__rgHeld;
  w.requestAnimationFrame = w.__rgRaf;
  w.__rgHeld = null;
  held.forEach((cb) => w.requestAnimationFrame(cb));
  return { W, H: Hh, px: W * Hh, steady, diff, back, groups: groups.map((g) => g.label + ':' + g.isRenderGroup), png };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'grouped', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel' });
  const Q = await H.newPlayer(browser, { name: 'ungrouped', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', query: 'norendergroups' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    await H.enterWorld(Q);
    const inWheel = (X) => H.waitFor(X, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    const okP = await inWheel(P), okQ = await inWheel(Q);
    rec.ok('both phones in the Wheel (guard)', !!okP && !!okQ, { okP, okQ });
    if (!okP || !okQ) return;
    await P.page.waitForTimeout(5000);

    /* 1 */
    const groupsOf = (X) => X.page.evaluate(() => window._pixiRenderer.app.stage.children.map((c) => c.label + ':' + !!c.isRenderGroup));
    const gP = await groupsOf(P), gQ = await groupsOf(Q);
    rec.ok(`the world and the screen are render groups (${gP.join(', ')}); ?norendergroups turns them off (${gQ.join(', ')})`,
      gP.includes('world:true') && gP.includes('screen:true') && gQ.includes('world:false') && gQ.includes('screen:false'), { gP, gQ });
    await Q.ctx.close().catch(() => {});

    /* 2, 3 -- in Brotown, then at a fight */
    const spots = [['brotown', null]];
    try {
      const { WHEEL_SPAWNS } = await import('../../../server/src/wheelspawns.js');
      const g = WHEEL_SPAWNS.ember.points[0];
      spots.push(['fight', [g[0], g[1] + 40]]);
    } catch (e) { /* Brotown only */ }
    await P.page.evaluate(() => { const S = window._gameState.current; S.player.godMode = true; });
    for (const [tag, at] of spots) {
      if (at) {
        await H.hopTo(P, at[0], at[1], { tries: 160 });
        await P.page.waitForTimeout(5000);
      }
      const r = await sameFrame(P);
      writeFileSync(join(OUT, `rendergroups-${tag}.png`), Buffer.from(r.png.split(',')[1], 'base64'));
      const pct = (n) => +(100 * n / r.px).toFixed(3);
      console.log(`    ${tag}: ${r.W}x${r.H}; drawn twice as it is ${r.steady.n} px apart; without the groups ${r.diff.n} px (${pct(r.diff.n)}%), ${r.diff.big} by more than 48 of 255, most ${r.diff.maxd}`);
      rec.ok(`${tag}: the same frame drawn twice with the groups is the same frame (${r.steady.n} px apart) (guard)`, r.steady.n === 0, r.steady);
      rec.ok(`${tag}: ...and without them it differs in ${r.diff.n} device px (${pct(r.diff.n)}% of the screen), the edges landing a pixel over -- out/rendergroups-${tag}.png`,
        r.diff.n / r.px < 0.01, r.diff);
      rec.ok(`${tag}: ...and with them back on it is the same frame again (${r.back.n} px apart)`, r.back.n === 0, r.back);
    }

    /* 4 */
    const moving = await P.page.evaluate(async () => {
      let n = 0;
      await new Promise((res) => { const t0 = performance.now(); const step = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
      return n;
    });
    rec.ok(`the game draws on after (${moving} frames in 1.5 s)`, moving > 1, { moving });
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
    await Q.ctx.close().catch(() => {});
  }
}
