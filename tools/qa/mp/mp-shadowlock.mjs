/* ═══ THE SHADOWS GLIDE WITH THE WORLD (v2.3.3149) ═══
 *
 * Owner, 2026-10-11: "the shadows look a bit flickery when you move on some
 * of the props".
 *
 * The shadow layer is drawn through one filter at CSS resolution (one texel a
 * CSS px, three device px on an iPhone).  The camera slides in fractions of a
 * pixel, so each frame every shadow was drawn again at a new fraction of that
 * coarse grid while the prop casting it moved a device pixel at a time: the
 * shadow crawled against its prop.  v2.3.3149 draws the layer on a grid that
 * does not move with the camera's fraction and slides the finished picture
 * back by it (shadows.js lockToWorldGrid); `?shadowlock=0` is the layer as it
 * was.
 *
 * A phone (390 x 844, dpr 3) stands in the ore yard east of BroTown's square
 * -- a trough, a minecart, coal, crates, barrels, a lamp post -- and the camera
 * is stepped ONE DEVICE PIXEL at a time.  Each step is photographed with the
 * props' shadows on and off (window.__btLightFx.world), the difference is the
 * props' shadows alone, and each step's picture is lined up with the world
 * (moved back by its steps).  Something drawn where the world is lines up to
 * the pixel; the measure is how much the lined-up shadows still change from
 * one step to the next.  Then:
 *   1. the camera really moved a device pixel a step, and there are shadows
 *      to watch (guards);
 *   2. with the lock the shadows change at most 0.4 of what they did without
 *      it (measured: ~0.011 against ~0.055 of a luma level a pixel, five times
 *      steadier; a full-resolution pass, ~32 MB of graphics memory, ~0.008);
 *   3. at rest they are the same shadows: the same darkness, within 3%;
 *   4. the probe says what fraction the layer is drawn back by;
 *   5. no page errors.
 *
 *
 * v2.3.3338, the owner again: "prop shadows right now still flicker as you run
 * around".  Seven one-device-pixel steps cross a whole CSS px only twice, and
 * between crossings the locked picture cannot change -- so the mean above
 * watered the crossings down.  At a crossing Pixi re-snapped every shadow
 * corner to a grid 0.77 x 0.83 of a texel (its roundPixels inside a filter
 * uses the pooled texture's full size; shadows.js's header).  So the camera
 * is also stepped a WHOLE CSS px (three device px) at a time, across and
 * then down -- every step a crossing, and the camera's fraction the same at
 * every step, so a shadow drawn where the world is lines up EXACTLY -- and
 * compared with `?shadowsnap=1`, Pixi's snapping put back:
 *   6. the probe says the shadow pieces are drawn unsnapped (and at highp),
 *      and `?shadowsnap=1` says they are not;
 *   7. across, a CSS px a step: the shadows change at most a third of what
 *      they did snapped;
 *   8. down, the same.
 * (The half precision `?shadowhp=0` puts back is an iPhone's alone: the QA
 * box runs mediump at full precision, so no picture here can show it.)
 *
 * v2.3.3408: the shadows are drawn BEFORE the frame now, into a picture
 * exactly the screen's size (shadows.js _prepass, docs/specs/shadow-prepass.md),
 * and there Pixi's snapping lands on the picture's own texel grid: snapped,
 * they are as steady as unsnapped (measured: across 0 and 0.0003, down 0.0183
 * and 0.0184).  So the snapped run is the OLD way, `?shadowsnap=1&shadowpass`
 * -- the filter whose flicker v2.3.3338 fixed and checks 7 and 8 measure
 * against (0.0332 and 0.1098 there), and the way the game falls back to.
 *
 * NOTE, from the hunt that led here: a picture of the world under the Mayor's
 * welcome (its scrim) does not move when the camera does -- every first
 * measurement of this taken with his greeting open read "the shadows never
 * move" (TRAPS §141).  So his window is talked away first, and the camera's
 * move is checked in the pictures themselves.
 *
 * Pictures: tools/qa/mp/out/shadowlock-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const DPR = 3;
const STEPS = 7;
const SPOT = [23450 + (await H.wheelGeom()).shift, 21750 + (await H.wheelGeom()).shift];   /* v2.3.3315: the hub is the same ground at either size, moved */
/* the part of the screen measured (CSS px): the props' yard, clear of the top
   bar, the minimap, the controls and the bro himself (masked below) */
const BOX = [40, 260, 350, 600];

const luma = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
const frames = (P, n) => P.page.evaluate((k) => new Promise((res) => { let i = 0; const f = () => (++i >= k ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

/* every dialogue talked away, and kept away three checks running */
async function talkAway(P) {
  let clear = 0;
  for (let i = 0; i < 40 && clear < 3; i++) {
    const open = await P.page.evaluate(() => !!document.querySelector('.bt-npcdlg, .bt-qoffer, .bt-npcdlg-scrim'));
    if (!open) { clear++; await P.page.waitForTimeout(300); continue; }
    clear = 0;
    const scrim = P.page.locator('.bt-npcdlg-scrim').first();
    if (await scrim.isVisible().catch(() => false)) { await scrim.click({ position: { x: 20, y: 300 } }).catch(() => {}); await P.page.waitForTimeout(400); continue; }
    let hit = false;
    for (const t of ['Next', 'Close', 'Got it', 'Later', 'Not now']) {
      const b = P.page.locator('button:visible', { hasText: t }).first();
      if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); hit = true; break; }
    }
    if (!hit) await H.closeNpcDialogue(P).catch(() => {});
    await P.page.waitForTimeout(400);
  }
  return clear >= 3;
}

/* a minimal PNG writer (RGBA), for the pictures */
async function writePng(path, w, h, rgba) {
  const zlib = (await import('node:zlib')).default;
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  writeFileSync(path, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

/* one page: the camera stepped, the props' shadows lined up with the world.
   v2.3.3338: `runs` -- each a way of stepping it: `axis` 'x' (across) or 'y'
   (down), `dev` device px a step */
async function measure(browser, wsPort, webPort, query, OUT, tag, runs) {
  const P = await H.newPlayer(browser, { name: 'Shade' + tag, wsPort, webPort, viewport: PHONE, touch: true, dpr: DPR, world: 'wheel', query });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    if (!ok) return { err: 'never reached the Wheel' };
    await P.page.waitForTimeout(4000);
    await H.hopTo(P, SPOT[0], SPOT[1], { tries: 160, step: 140, gap: 200 });
    await P.page.waitForTimeout(6000);
    const away = await talkAway(P);
    const base = await P.page.evaluate(() => {
      const S = window._gameState.current;
      S.player.vx = 0; S.player.vy = 0;
      return { cx: Math.round(S.camera.x), cy: Math.round(S.camera.y), sx: S._worldScaleX, vw: S._viewW, vh: S._viewH };
    });
    const out = { away, runs: {} };
    for (const R of runs) {
      const across = R.axis !== 'y';
      const maxShift = (STEPS - 1) * R.dev;
      const X0 = BOX[0] * DPR, Y0 = BOX[1] * DPR, X1 = BOX[2] * DPR, Y1 = BOX[3] * DPR;
      const W = X1 - X0 - (across ? maxShift + 2 : 0), HH = Y1 - Y0 - (across ? 0 : maxShift + 2);
      const shadows = [], worlds = [];
      let lock = null;
      /* the bro moves with the camera, so his box is left out of every step's
         picture wherever it lies at ANY step -- left out at one step and read
         at the next, its edge was a difference of its own */
      const skip = new Uint8Array(W * HH);
      for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) {
        for (let k = 0; k < STEPS; k++) {
          const cssx = (X0 + x + (across ? maxShift - k * R.dev : 0)) / DPR, cssy = (Y0 + y + (across ? 0 : maxShift - k * R.dev)) / DPR;
          if (cssx > 160 && cssx < 230 && cssy > 320 && cssy < 430) { skip[y * W + x] = 1; break; }
        }
      }
      for (let k = 0; k < STEPS; k++) {
        await P.page.evaluate(({ b, k, dpr, dev, across }) => {
          const S = window._gameState.current;
          /* exactly k x dev device px of world motion, along the axis */
          const d = (k * dev) / (dpr * b.sx);
          const cx = b.cx + (across ? d : 0), cy = b.cy + (across ? 0 : d);
          S.player.x = cx + b.vw / 2; S.player.y = cy + b.vh / 2; S.player.vx = 0; S.player.vy = 0;
          S.camera.x = cx; S.camera.y = cy;
        }, { b: base, k, dpr: DPR, dev: R.dev, across });
        await P.page.evaluate(() => window.__btLightFx.world(true));
        await frames(P, 4);
        const A = H.decodePng(await P.page.screenshot({ type: 'png' }));
        if (k === 1) lock = await P.page.evaluate(() => { const p = window.__btLightFx.probe(); return p && p.shadows ? p.shadows.lock : undefined; });
        await P.page.evaluate(() => window.__btLightFx.world(false));
        await frames(P, 4);
        const B = H.decodePng(await P.page.screenshot({ type: 'png' }));
        await P.page.evaluate(() => window.__btLightFx.world(true));
        const sd = new Float32Array(W * HH);
        for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) {
          /* the world moved k x dev device px left (or up): its pixel at x sits there */
          if (skip[y * W + x]) continue;   /* the bro (above) */
          const ix = X0 + x + (across ? maxShift - k * R.dev : 0), iy = Y0 + y + (across ? 0 : maxShift - k * R.dev);
          const i = (iy * A.width + ix) * A.channels;
          sd[y * W + x] = Math.max(0, luma(B.data, i) - luma(A.data, i));
        }
        shadows.push(sd); worlds.push(B);
        if (k < 2) {
          const od = new Uint8Array(W * HH * 4);
          for (let j = 0; j < W * HH; j++) { const v = Math.min(255, sd[j] * 6); od[j * 4] = v; od[j * 4 + 1] = v; od[j * 4 + 2] = v; od[j * 4 + 3] = 255; }
          await writePng(join(OUT, `shadowlock-${tag}-${R.axis}${R.dev}-k${k}.png`), W, HH, od);
        }
      }
      /* the camera's move, read off the pictures: the best match along the
         axis of each step's shadows-off picture with step 0's */
      const shiftOf = (P0, P1) => {
        let best = null;
        for (let s = -2; s <= maxShift + 3; s++) {
          let t = 0, n = 0;
          for (let y = Y0 + 12; y < Y1 - 12; y += 3) for (let x = X0 + 12; x < X1 - 12; x += 2) {
            const i0 = (y * P0.width + x) * P0.channels;
            const i1 = across ? (y * P1.width + (x - s)) * P1.channels : ((y - s) * P1.width + x) * P1.channels;
            const e = luma(P0.data, i0) - luma(P1.data, i1); t += e * e; n++;
          }
          if (!best || t / n < best.e) best = { s, e: t / n };
        }
        return best.s;
      };
      const moved = worlds.map((w) => shiftOf(worlds[0], w));
      const mad = (a, b) => { let t = 0; for (let j = 0; j < a.length; j++) t += Math.abs(a[j] - b[j]); return t / a.length; };
      const amt = (a) => { let t = 0; for (let j = 0; j < a.length; j++) t += a[j]; return t / a.length; };
      const step = shadows.slice(1).map((p, i) => +mad(p, shadows[i]).toFixed(4));
      const mean = +(step.reduce((a, b) => a + b, 0) / step.length).toFixed(4);
      out.runs[R.axis + R.dev] = { moved, step, mean, dark: +amt(shadows[0]).toFixed(3), lock, dev: R.dev };
    }
    out.snap = await P.page.evaluate(() => (window.__btShadowSnap ? window.__btShadowSnap() : null));
    out.errs = P.logs.filter((l) => /pageerror/.test(l));
    return out;
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  /* a device px a step (v2.3.3149's measure), and a whole CSS px a step across
     and down (v2.3.3338's) */
  const now = await measure(browser, wsPort, webPort, '', OUT, 'locked', [{ axis: 'x', dev: 1 }, { axis: 'x', dev: DPR }, { axis: 'y', dev: DPR }]);
  const was = await measure(browser, wsPort, webPort, 'shadowlock=0', OUT, 'unlocked', [{ axis: 'x', dev: 1 }]);
  /* v2.3.3408: snapped, the old way (the filter): drawn before the frame,
     snapping costs nothing (the header) */
  const snapped = await measure(browser, wsPort, webPort, 'shadowsnap=1&shadowpass', OUT, 'snapped', [{ axis: 'x', dev: DPR }, { axis: 'y', dev: DPR }]);
  console.log('    locked:   ' + JSON.stringify(now));
  console.log('    unlocked: ' + JSON.stringify(was));
  console.log('    snapped:  ' + JSON.stringify(snapped));
  const guards = (page, name) => {
    rec.ok(`${name}: the Mayor's window talked away (guard: under his scrim the world does not move)`, !page.err && page.away === true, page.err || page.away);
    for (const key of Object.keys(page.runs || {})) {
      const r = page.runs[key];
      const what = r.dev === 1 ? 'one device pixel' : `${r.dev} device px (a CSS px)`;
      const dir = key[0] === 'y' ? 'down' : 'across';
      rec.ok(`${name}, ${dir}: the camera moved ${what} a step, in the pictures (guard: ${JSON.stringify(r.moved)})`,
        Array.isArray(r.moved) && r.moved.every((s, k) => Math.abs(s - k * r.dev) <= 1) && r.moved[r.moved.length - 1] >= (STEPS - 1) * r.dev - 1, r.moved);
      rec.ok(`${name}, ${dir} ${r.dev}: there are props' shadows to watch (guard: ${r.dark} of a luma level a pixel)`, r.dark > 0.5, r.dark);
    }
  };
  guards(now, 'locked');
  guards(was, '?shadowlock=0');
  guards(snapped, '?shadowsnap=1&shadowpass');
  const N1 = now.runs && now.runs.x1, W1 = was.runs && was.runs.x1;
  rec.ok(`with the shadows drawn on the world's grid they glide with it: ${N1 && N1.mean} against ${W1 && W1.mean} of a luma level a pixel from one step to the next (at most 0.4 of it)`,
    !!N1 && !!W1 && N1.mean >= 0 && W1.mean > 0 && N1.mean <= 0.4 * W1.mean, { locked: N1 && N1.step, unlocked: W1 && W1.step });
  rec.ok(`...and they are the same shadows at rest (darkness ${N1 && N1.dark} against ${W1 && W1.dark}, within 3%)`,
    !!N1 && !!W1 && W1.dark > 0 && Math.abs(N1.dark - W1.dark) / W1.dark <= 0.03, { now: N1 && N1.dark, was: W1 && W1.dark });
  rec.ok('the probe says the fraction the layer is drawn back by (each in [0, 1) CSS px); none with ?shadowlock=0',
    !!N1 && !!N1.lock && N1.lock.fx >= 0 && N1.lock.fx < 1 && N1.lock.fy >= 0 && N1.lock.fy < 1 && !!W1 && W1.lock === null, { now: N1 && N1.lock, was: W1 && W1.lock });
  /* ── v2.3.3338 ── */
  rec.ok('6. the shadow pieces are drawn unsnapped, at highp; ?shadowsnap=1 leaves Pixi\'s snapping on them',
    !!now.snap && now.snap.hooked && now.snap.unsnapped > 0 && now.snap.highp && !now.snap.snapOld
      && !!snapped.snap && snapped.snap.snapOld && !snapped.snap.hooked, { now: now.snap, snapped: snapped.snap });
  for (const [key, dir] of [['x3', 'across'], ['y3', 'down']]) {
    const a = now.runs && now.runs[key], b = snapped.runs && snapped.runs[key];
    rec.ok(`${key === 'x3' ? 7 : 8}. ${dir}, a whole CSS px a step (every step a crossing): ${a && a.mean} against ${b && b.mean} snapped the old way, of a luma level a pixel (at most a third of it)`,
      !!a && !!b && b.mean > 0 && a.mean <= b.mean / 3, { unsnapped: a && a.step, snapped: b && b.step });
  }
  rec.ok('...and unsnapped they are the same shadows (darkness within 3% of the snapped)',
    !!now.runs && !!snapped.runs && !!now.runs.x3 && !!snapped.runs.x3 && snapped.runs.x3.dark > 0
      && Math.abs(now.runs.x3.dark - snapped.runs.x3.dark) / snapped.runs.x3.dark <= 0.03, { now: now.runs && now.runs.x3 && now.runs.x3.dark, snapped: snapped.runs && snapped.runs.x3 && snapped.runs.x3.dark });
  rec.ok('no page errors', !(now.errs || []).length && !(was.errs || []).length && !(snapped.errs || []).length, { now: now.errs, was: was.errs, snapped: snapped.errs });
}
