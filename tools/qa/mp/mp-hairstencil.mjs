/* ═══ v2.3.3421: THE HAIR CLIPPED BY THE STENCIL, NOT IN A PASS OF ITS OWN ═══
 *
 * The owner, 2026-10-18: "iterate on what best improves framerate without
 * loss of quality (or negligible loss) for phone gameplay (iPhone, android)".
 * The hair under a hat that clips it (31 of the 40), and under a hood, was cut
 * to the silhouette by Pixi's alpha mask: a filter, so a pass in the middle of
 * the frame for every figure wearing one.  hairClip.js cuts it with the
 * stencil instead; `?alphaclip` is the alpha mask.
 *
 * On a phone (390 x 844, 3x) in BroTown, the bro in an afro:
 *   1. under the army helmet the hair is clipped through the stencil (guard:
 *      the hat clips and the hair shows);
 *   2. THE SAME FRAME: the game's frames held, the scene drawn twice the new
 *      way (identical: guard), once with the alpha mask (the live switch), once
 *      the new way again: the new way is the same as itself, and the alpha
 *      mask's picture differs only at the hair -- a few hundred pixels at
 *      most, all of them in the box round the head (out/hairstencil-*.png);
 *   3. the cut is real: with the hair unclipped the picture changes by
 *      hundreds of pixels, fully; and where the two ways differ is split by
 *      the unclipped picture: AT THE CUT (the clip changes that pixel) or on
 *      hair that SHOWS (it does not): there the new way draws the hair exactly
 *      as with no hat, and the alpha mask's pass had moved it a little;
 *   4. the screen is set aside for no clip: drawing the frame the new way, the
 *      screen is picked up again after another picture no more often than for
 *      the frame's other passes, the alpha mask at least once more;
 *   5. under a hood (the crimson cape, no hat) the same three checks;
 *   6. the silhouettes cast no shadow (the bro's shadow as many pieces either
 *      way), and no page errors.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const HAT = 'army-helmet';
const HAIR = 'afro';

/* the frame held and drawn: the new way, the new way, the alpha mask, the new
   way again, and with the hair unclipped; the screen's binds while each is
   drawn; the head's box on the screen */
const sameFrame = (P) => P.page.evaluate(async () => {
  const w = window;
  const app = w._pixiRenderer.app, R = app.renderer, gl = R.gl;
  w.__hsHeld = [];
  w.__hsRaf = w.requestAnimationFrame;
  w.requestAnimationFrame = (cb) => { w.__hsHeld.push(cb); return 0; };
  await new Promise((r) => setTimeout(r, 700));
  const W = gl.drawingBufferWidth, Hh = gl.drawingBufferHeight;
  /* the frame set aside while it is drawn: every bind of the screen that
     comes after a bind of another picture is the frame picked up again
     (`resumes`); the screen's raw binds (`screens`) count more, as Pixi binds
     it again when it is already bound (a filter's pop), which costs a chip
     nothing (mp-shadowprepass, v2.3.3408) */
  const fb = gl.bindFramebuffer;
  let screens = 0, resumes = 0, last;
  gl.bindFramebuffer = function (t, f) { if (f == null) { screens++; if (last != null) resumes++; } last = f; return fb.call(this, t, f); };
  const binds = [];
  const grab = () => {
    screens = 0; resumes = 0; last = undefined;
    R.render(app.stage);
    binds.push({ screens, resumes });
    const px = new Uint8Array(W * Hh * 4); gl.readPixels(0, 0, W, Hh, gl.RGBA, gl.UNSIGNED_BYTE, px); return px;
  };
  const S = w._gameState.current;
  const k = S._worldScaleX || 1, dpr = W / (app.screen.width || 1);
  /* the head, on the screen in device px from the bottom row up (readPixels) */
  const hx = (S.player.x - S.camera.x) * k * dpr, hy = (S.player.y - S.camera.y) * k * dpr;
  const box = { x0: hx - 70 * dpr, x1: hx + 70 * dpr, y0: hy - 120 * dpr, y1: hy + 10 * dpr };
  const inBox = (i) => { const p = i / 4, x = p % W, y = Hh - 1 - Math.floor(p / W); return x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1; };
  const cmp = (a, b, mark) => {
    let n = 0, maxd = 0, out = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (d) {
        n++; if (d > maxd) maxd = d; if (!inBox(i)) out++;
        if (mark) { mark[i] = 255; mark[i + 1] = 0; mark[i + 2] = 255; mark[i + 3] = 255; }
      }
    }
    return { n, maxd, out };
  };
  /* where the new way (a) and the alpha mask (b) differ: at the cut (the
     unclipped picture u differs from a there) or on hair that shows (u is a
     there, so the new way draws it as unmasked hair) */
  const split = (a, b, u) => {
    let atCut = 0, cutMax = 0, onShown = 0, shownMax = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (!d) continue;
      if (a[i] !== u[i] || a[i + 1] !== u[i + 1] || a[i + 2] !== u[i + 2]) { atCut++; if (d > cutMax) cutMax = d; }
      else { onShown++; if (d > shownMax) shownMax = d; }
    }
    return { atCut, cutMax, onShown, shownMax };
  };
  const probe = () => (w.__btCapeHair ? w.__btCapeHair() : null);
  const before = probe();
  const a1 = grab();
  const a2 = grab();
  w.__btHairClipStencil(false);
  const pAlpha = probe();
  const b = grab();
  w.__btHairClipStencil(true);
  const a3 = grab();
  /* the hair unclipped, for the size of the cut */
  let hair = null;
  const find = (c, d) => { if (hair || !c || d > 8) return; if (c._hairSprite && c._hairSprite.mask) { hair = c._hairSprite; return; } for (const ch of (c.children || [])) find(ch, d + 1); };
  find(app.stage, 0);
  let un = null;
  /* (a stencil box no longer clipping is drawn as an ordinary child unless
     put away -- hairClip.js's header -- so it is put away for this picture,
     as clipHair puts it away, or the silhouette would be drawn white in it) */
  if (hair) {
    const m = hair.mask, isBox = !!m && m.label === 'hairClipBox';
    hair.mask = null;
    if (isBox) m.renderable = false;
    un = grab();
    hair.mask = m;
    if (isBox) m.renderable = true;
  }
  const mark = new Uint8Array(a1);
  const diff = cmp(a1, b, mark);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = Hh;
  const g2 = cv.getContext('2d');
  const img = g2.createImageData(W, Hh);
  for (let y = 0; y < Hh; y++) img.data.set(mark.subarray((Hh - 1 - y) * W * 4, (Hh - y) * W * 4), y * W * 4);
  g2.putImageData(img, 0, 0);
  const sx = Math.max(0, Math.round(box.x0)), sy = Math.max(0, Math.round(box.y0));
  const sw = Math.min(W - sx, Math.round(box.x1 - box.x0)), sh = Math.min(Hh - sy, Math.round(box.y1 - box.y0));
  const crop = document.createElement('canvas');
  crop.width = sw; crop.height = sh;
  crop.getContext('2d').drawImage(cv, sx, sy, sw, sh, 0, 0, sw, sh);
  const png = crop.toDataURL('image/png');
  cv.width = 0; cv.height = 0; crop.width = 0; crop.height = 0;
  gl.bindFramebuffer = fb;
  const held = w.__hsHeld;
  w.requestAnimationFrame = w.__hsRaf;
  w.__hsHeld = null;
  held.forEach((cb) => w.requestAnimationFrame(cb));
  return {
    W, H: Hh, before, pAlpha, binds, png,
    steady: cmp(a1, a2), diff, back: cmp(a1, a3), unclipped: un ? cmp(a1, un) : null, split: un ? split(a1, b, un) : null,
    clip: w.__btHairClip ? w.__btHairClip() : null,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, {
    name: 'Stencil', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel',
    init: () => { try { localStorage.setItem('bt-hair', 'afro'); } catch (e) { /* the default look */ } },
  });
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
    await P.page.evaluate(({ hat, hair }) => { if (window.__btSetHair) window.__btSetHair(hair); if (window.__btSetHeadwear) window.__btSetHeadwear(hat); }, { hat: HAT, hair: HAIR });
    await P.page.waitForTimeout(4000);

    const step = async (tag) => {
      const r = await sameFrame(P);
      writeFileSync(join(OUT, `hairstencil-${tag}.png`), Buffer.from(r.png.split(',')[1], 'base64'));
      console.log(`    ${tag}: ${JSON.stringify(r.before)}; alpha ${r.pAlpha && r.pAlpha.clipKind}; binds ${JSON.stringify(r.binds)}; twice ${r.steady.n}; the alpha mask ${r.diff.n} px apart (most ${r.diff.maxd}, ${r.diff.out} outside the head's box); back ${r.back.n}; unclipped ${r.unclipped && r.unclipped.n}; split ${JSON.stringify(r.split)}; ${JSON.stringify(r.clip)}`);
      return r;
    };

    /* 1-4: the hat */
    const h = await step('hat');
    rec.ok(`the hat: the hair is clipped through the stencil (${JSON.stringify(h.before)}) (guard)`,
      !!h.before && h.before.hairVisible && h.before.maskedToHat && h.before.clipKind === 'stencil' && !!h.clip && h.clip.stencil, h.before);
    rec.ok(`the hat: the same frame drawn twice is the same frame (${h.steady.n} px apart) (guard)`, h.steady.n === 0, h.steady);
    rec.ok(`the hat: the live switch drew it with the alpha mask (${h.pAlpha && h.pAlpha.clipKind}) (guard)`,
      !!h.pAlpha && h.pAlpha.clipKind === 'alpha' && h.pAlpha.maskedToHat, h.pAlpha);
    rec.ok(`the hat: the alpha mask's picture differs only at the hair (${h.diff.n} px, most ${h.diff.maxd}, ${h.diff.out} outside the head's box) -- out/hairstencil-hat.png`,
      h.diff.out === 0 && h.diff.n <= 600, h.diff);
    rec.ok(`the hat: and the new way again is the same frame (${h.back.n} px apart)`, h.back.n === 0, h.back);
    /* (the alpha mask's pass resampled the hair a little everywhere it shows
       -- 418 px by up to 35 on the afro's sides, against a cut of 947 by up to
       232 -- so "the cut is much bigger than the difference" was the wrong
       test; the split says which pixels are which) */
    rec.ok(`the hat: the cut is real (unclipped, ${h.unclipped && h.unclipped.n} px change, most ${h.unclipped && h.unclipped.maxd}); the two ways differ ${h.split && h.split.atCut} px at the cut (most ${h.split && h.split.cutMax}) and ${h.split && h.split.onShown} on hair that shows (most ${h.split && h.split.shownMax}), where the new way is the unmasked hair`,
      !!h.unclipped && h.unclipped.n >= 300 && h.unclipped.maxd >= 100 && !!h.split && h.split.shownMax <= 64, { unclipped: h.unclipped, split: h.split });
    const [b1, , bA, b3] = h.binds;
    rec.ok(`the hat: no pass for the clip -- drawing the frame, the screen is picked up again ${b1 && b1.resumes} time(s) (other passes), with the alpha mask ${bA && bA.resumes}`,
      !!b1 && !!b3 && !!bA && b1.screens >= 1 && b3.resumes === b1.resumes && bA.resumes >= b1.resumes + 1, h.binds);

    /* 5: the hood (the crimson cape, no hat) */
    const pid = await P.page.evaluate(() => (window._gameState && window._gameState.current && window._gameState.current.myId) || null);
    await H.grant(wsPort, pid, 'item', { invKey: 'goldticket_crimson', count: 1 }).catch(() => null);
    await P.page.waitForTimeout(1200);
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      if (S && S.channel) S.channel.send({ type: 'cape_redeem', payload: { invKey: 'goldticket_crimson', opId: 'mp-hairstencil-' + Date.now() } });
    });
    await P.page.waitForTimeout(2500);
    await P.page.evaluate(() => {
      const S = window._gameState.current;
      if (S && S.channel) S.channel.send({ type: 'cape_equip', payload: { worn: true } });
      if (window.__btSetHeadwear) window.__btSetHeadwear('none');
    });
    await P.page.waitForTimeout(4000);
    const d = await step('hood');
    rec.ok(`the hood: the hair is clipped to it through the stencil, and the silhouette is not drawn as a picture (${JSON.stringify(d.before)}) (guard)`,
      !!d.before && d.before.hairVisible && d.before.maskedToHood && d.before.clipKind === 'stencil' && !d.before.hoodMaskDrawn, d.before);
    rec.ok(`the hood: the same frame twice (${d.steady.n}), the alpha mask only round the head (${d.diff.n} px, most ${d.diff.maxd}, ${d.diff.out} outside the head's box: ${d.split && d.split.atCut} at the cut, ${d.split && d.split.onShown} on hair that shows), the new way again the same (${d.back.n})`,
      d.steady.n === 0 && d.diff.out === 0 && d.diff.n <= 600 && d.back.n === 0, { steady: d.steady, diff: d.diff, back: d.back });
    rec.ok(`the hood: no pass for the clip (${JSON.stringify(d.binds)})`,
      !!d.binds[0] && !!d.binds[2] && d.binds[0].screens >= 1 && d.binds[2].resumes >= d.binds[0].resumes + 1, d.binds);

    /* 6: the bro's shadow is cast from as many pieces either way (a
       silhouette in a stencil box would add one: casters.js skips the box) */
    const pieces = () => P.page.evaluate(async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const p = window.__btLightFx && window.__btLightFx.probe();
      return p && p.shadows && p.shadows.self ? p.shadows.self.pieces : null;
    });
    const pStencil = await pieces();
    await P.page.evaluate(() => window.__btHairClipStencil(false));
    const pAlpha = await pieces();
    await P.page.evaluate(() => window.__btHairClipStencil(true));
    rec.ok(`the silhouettes cast no shadow of their own: the bro's shadow is ${pStencil} pieces through the stencil, ${pAlpha} with the alpha mask`,
      pStencil > 2 && pStencil === pAlpha, { pStencil, pAlpha });
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    if (stopAlive) stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
