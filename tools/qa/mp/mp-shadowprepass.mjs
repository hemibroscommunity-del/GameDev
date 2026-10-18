/* ═══ v2.3.3408: THE SHADOWS DRAWN BEFORE THE FRAME ═══
 *
 * The owner, 2026-10-18: "iterate on what best improves framerate without
 * loss of quality (or negligible loss) for phone gameplay (iPhone, android)".
 * The shadow layer was drawn through a filter: a render pass in the MIDDLE of
 * the frame, so a phone's tile-based graphics chip wrote the half-drawn frame
 * out to memory and read it back in, every frame (shadows.js's header, TRAPS
 * §221's point about passes).  Now the pieces are drawn into their picture
 * BEFORE the frame (shadows.js _prepass) and the shade is one more quad in the
 * frame; `?shadowpass` is the filter as it was.
 *
 * On a phone (390 x 844, 3x) in BroTown's ore yard (props and their shadows)
 * and at a fight at the Flame Fields:
 *   1. the shadows are drawn before the frame: the probe says so, the shade's
 *      quad is drawn and the layer has no filter (guard);
 *   2. THE SAME FRAME: the game's frames held, the scene drawn twice before
 *      the frame (identical, or the comparison means nothing), once the old
 *      way -- the Speed test's own lever (window.__btShadowPrepass.set) and
 *      the same pieces made into the shade again (redraw) -- and once before
 *      again: the old way within one level of 255 (the two read the same
 *      picture at the same points, by a quad laid two ways), and the new way
 *      the same as itself;
 *   3. the shadows are in the comparison: with the shade put away, thousands
 *      of pixels change;
 *   4. the screen is never set aside: drawing that held frame, the screen
 *      is picked up again after another picture at least once less than the
 *      old way's (the shadows' picture drawn before the frame), the screen's
 *      raw binds and the live frames' counts printed beside;
 *   5. no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const DPR = 3;

/* the frames held, the scene drawn: `steps` say what to do before each draw */
const sameFrame = (P) => P.page.evaluate(async () => {
  const w = window;
  const app = w._pixiRenderer.app, R = app.renderer, gl = R.gl;
  const SP = w.__btShadowPrepass;
  w.__spHeld = [];
  w.__spRaf = w.requestAnimationFrame;
  w.requestAnimationFrame = (cb) => { w.__spHeld.push(cb); return 0; };
  await new Promise((r) => setTimeout(r, 700));
  const W = gl.drawingBufferWidth, Hh = gl.drawingBufferHeight;
  /* the frame set aside while it is drawn: every bind of the screen that
     comes after a bind of another picture is the frame picked up again
     (`resumes`).  The screen's binds themselves (`screens`) count more: Pixi
     binds the screen again when it is already bound (a filter's pop), which
     costs a chip nothing */
  const fb = gl.bindFramebuffer;
  let screens = 0, resumes = 0, last = undefined;
  gl.bindFramebuffer = function (t, f) {
    if (f == null) { screens++; if (last != null && last !== undefined) resumes++; }
    last = f;
    return fb.call(this, t, f);
  };
  const binds = [];
  const grab = () => {
    screens = 0; resumes = 0; last = undefined;
    R.render(app.stage);
    binds.push({ screens, resumes });
    const px = new Uint8Array(W * Hh * 4); gl.readPixels(0, 0, W, Hh, gl.RGBA, gl.UNSIGNED_BYTE, px); return px;
  };
  const cmp = (a, b) => {
    let n = 0, maxd = 0, n1 = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (d) { n++; if (d === 1) n1++; if (d > maxd) maxd = d; }
    }
    return { n, n1, maxd };
  };
  /* the shade's quad, wherever the scene keeps it */
  let shade = null;
  const find = (c, d) => { if (shade || !c || d > 6) return; if (c.label === 'shadowShade') { shade = c; return; } for (const k of (c.children || [])) find(k, d + 1); };
  find(app.stage, 0);
  const probe = () => { const p = w.__btLightFx && w.__btLightFx.probe(); return p && p.shadows ? { prepass: p.shadows.prepass, filtered: p.shadows.filtered, pieces: p.shadows.pieces } : null; };
  const before = probe();
  const st0 = SP.stats();
  const a1 = grab();
  const a2 = grab();
  SP.set(false);
  const redrawOld = SP.redraw();
  const oldP = probe();
  const st1 = SP.stats();
  const b = grab();
  SP.set(true);
  const redrawNew = SP.redraw();
  const st2 = SP.stats();
  const a3 = grab();
  let none = null;
  if (shade) { shade.visible = false; none = grab(); shade.visible = true; }
  const diff = cmp(a1, b);
  /* the pixels the old way changed, marked over the new way's picture (rows
     the right way up) */
  const mark = new Uint8Array(a1);
  for (let i = 0; i < a1.length; i += 4) {
    if (a1[i] !== b[i] || a1[i + 1] !== b[i + 1] || a1[i + 2] !== b[i + 2]) { mark[i] = 255; mark[i + 1] = 0; mark[i + 2] = 255; mark[i + 3] = 255; }
  }
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = Hh;
  const g2 = cv.getContext('2d');
  const img = g2.createImageData(W, Hh);
  for (let y = 0; y < Hh; y++) img.data.set(mark.subarray((Hh - 1 - y) * W * 4, (Hh - y) * W * 4), y * W * 4);
  g2.putImageData(img, 0, 0);
  const png = cv.toDataURL('image/png');
  cv.width = 0; cv.height = 0;
  gl.bindFramebuffer = fb;
  const held = w.__spHeld;
  w.requestAnimationFrame = w.__spRaf;
  w.__spHeld = null;
  held.forEach((cb) => w.requestAnimationFrame(cb));
  return {
    W, H: Hh, before, oldP, st0, st1, st2, redrawOld, redrawNew, hasShade: !!shade, binds,
    steady: cmp(a1, a2), diff, back: cmp(a1, a3), none: none ? cmp(a1, none) : null, png,
  };
});

/* over `n` live frames, the way the switch says: the frame picked up again a
   frame (`resumes`: a bind of the screen after one of another picture, the
   frame's own start not counted -- a render to the screen starts afresh), the
   screen's raw binds and every bind */
const screenBinds = (P, n) => P.page.evaluate(async (k) => {
  const R = window._pixiRenderer.app.renderer, gl = R.gl;
  const fb = gl.bindFramebuffer, rr = R.render;
  let screens = 0, resumes = 0, binds = 0, frames = 0, last;
  R.render = function (o, ...rest) { if (!(o && o.target)) last = undefined; return rr.call(this, o, ...rest); };
  gl.bindFramebuffer = function (t, f) { binds++; if (f == null) { screens++; if (last != null) resumes++; } last = f; return fb.call(this, t, f); };
  await new Promise((res) => { const f = () => { if (++frames >= k) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
  gl.bindFramebuffer = fb;
  R.render = rr;
  return { frames, resumes: +(resumes / frames).toFixed(2), screens: +(screens / frames).toFixed(2), binds: +(binds / frames).toFixed(2) };
}, n);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const G = await H.wheelGeom();
  const P = await H.newPlayer(browser, { name: 'prepass', wsPort, webPort, viewport: PHONE, touch: true, dpr: DPR, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = null;
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!ok, ok);
    if (!ok) return;
    stopAlive = H.keepAlive(P, 15000);
    await P.page.evaluate(() => { const S = window._gameState.current; S.player.godMode = true; });
    /* the ore yard east of BroTown's square (mp-shadowlock's), then a fight */
    const spots = [['oreyard', [23450 + G.shift, 21750 + G.shift]]];
    try {
      const { WHEEL_SPAWNS } = await import('../../../server/src/wheelspawns.js');
      const g = WHEEL_SPAWNS.ember.points[0];
      spots.push(['fight', [g[0], g[1] + 40]]);
    } catch (e) { /* the yard only */ }
    for (const [tag, at] of spots) {
      await H.hopTo(P, at[0], at[1], { tries: 400, step: 140, gap: 200 });
      await P.page.waitForTimeout(6000);
      const r = await sameFrame(P);
      writeFileSync(join(OUT, `shadowprepass-${tag}.png`), Buffer.from(r.png.split(',')[1], 'base64'));
      console.log(`    ${tag}: ${r.W}x${r.H}; probe ${JSON.stringify(r.before)}; old way ${JSON.stringify(r.oldP)}; twice ${r.steady.n} px apart; the old way ${r.diff.n} px apart (${r.diff.n1} by one level, most ${r.diff.maxd}); back ${r.back.n}; shade put away ${r.none && r.none.n}`);
      console.log(`      stats ${JSON.stringify([r.st0, r.st1, r.st2])}`);
      /* 1 */
      rec.ok(`${tag}: the shadows are drawn before the frame (${JSON.stringify(r.before)}; ${JSON.stringify(r.st0)}) (guard)`,
        !!r.before && r.before.prepass === true && r.before.filtered === true && r.before.pieces > 2 && r.hasShade
          && Array.isArray(r.st0) && r.st0.length === 1 && r.st0[0].home === 'cast' && r.st0[0].shade === true, { before: r.before, st0: r.st0 });
      /* 2 */
      rec.ok(`${tag}: the same frame drawn twice is the same frame (${r.steady.n} px apart) (guard)`, r.steady.n === 0, r.steady);
      rec.ok(`${tag}: the old way switched on, the same pieces drawn through the filter (${JSON.stringify(r.oldP)}; ${JSON.stringify(r.st1)}) (guard)`,
        r.redrawOld === 1 && !!r.oldP && r.oldP.prepass === false && r.oldP.filtered === true && r.st1[0].home === 'layer' && r.st1[0].shade === false, { oldP: r.oldP, st1: r.st1 });
      rec.ok(`${tag}: drawn the old way it is the same picture to one level of 255 (${r.diff.n} px apart, ${r.diff.n1} of them by one, most ${r.diff.maxd}) -- out/shadowprepass-${tag}.png`,
        r.diff.maxd <= 1, r.diff);
      rec.ok(`${tag}: and before the frame again, the same frame (${r.back.n} px apart; ${JSON.stringify(r.st2)})`,
        r.back.n === 0 && r.redrawNew === 1 && r.st2[0].home === 'cast' && r.st2[0].prepass === true, { back: r.back, st2: r.st2 });
      /* 3 */
      rec.ok(`${tag}: the shadows are in the picture (the shade put away changes ${r.none && r.none.n} px)`, !!r.none && r.none.n > 2000, r.none);
      /* 4: binds = [before, before, the old way, before again, (no shade)] --
         each {screens, resumes}: the frame's first bind of the screen is its
         start, not a resume (the pre-pass left its own picture bound) */
      const [b1, b2, bOld, b3] = r.binds;
      rec.ok(`${tag}: the screen is never set aside for the shadows: drawn before the frame, the frame is picked up again ${b1 && b1.resumes} time(s) (the screen bound ${b1 && b1.screens}), the old way ${bOld && bOld.resumes} (bound ${bOld && bOld.screens})`,
        !!b1 && !!b2 && !!b3 && !!bOld && b1.screens >= 1 && b1.resumes === b2.resumes && b1.resumes === b3.resumes
          && bOld.resumes >= b1.resumes + 1, r.binds);
    }
    /* 4, live: the counts a frame each way, for the record (other passes
       come and go from frame to frame: the held frame above is the check) */
    const nowB = await screenBinds(P, 24);
    await P.page.evaluate(() => window.__btShadowPrepass.set(false));
    await P.page.waitForTimeout(500);
    const oldB = await screenBinds(P, 24);
    await P.page.evaluate(() => window.__btShadowPrepass.set(true));
    console.log(`    live: before the frame ${JSON.stringify(nowB)}; the old way ${JSON.stringify(oldB)}`);
    /* 5 */
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    if (stopAlive) stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
