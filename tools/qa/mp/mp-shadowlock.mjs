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
const SPOT = [23450, 21750];
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

/* one page: the camera stepped, the props' shadows lined up with the world */
async function measure(browser, wsPort, webPort, query, OUT, tag) {
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
    const X0 = BOX[0] * DPR, Y0 = BOX[1] * DPR, X1 = BOX[2] * DPR, Y1 = BOX[3] * DPR;
    const W = X1 - X0 - STEPS - 2, HH = Y1 - Y0;
    const shadows = [], worlds = [];
    let lock = null;
    for (let k = 0; k < STEPS; k++) {
      await P.page.evaluate(({ b, k, dpr }) => {
        const S = window._gameState.current;
        const cx = b.cx + k / (dpr * b.sx);   /* exactly k device px of world motion */
        S.player.x = cx + b.vw / 2; S.player.y = b.cy + b.vh / 2; S.player.vx = 0; S.player.vy = 0;
        S.camera.x = cx; S.camera.y = b.cy;
      }, { b: base, k, dpr: DPR });
      await P.page.evaluate(() => window.__btLightFx.world(true));
      await frames(P, 4);
      const A = H.decodePng(await P.page.screenshot({ type: 'png' }));
      if (k === 1) lock = await P.page.evaluate(() => { const p = window.__btLightFx.probe(); return p && p.shadows ? p.shadows.lock : undefined; });
      await P.page.evaluate(() => window.__btLightFx.world(false));
      await frames(P, 4);
      const B = H.decodePng(await P.page.screenshot({ type: 'png' }));
      await P.page.evaluate(() => window.__btLightFx.world(true));
      const sd = new Float32Array(W * HH), wd = new Float32Array(W * HH);
      for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) {
        /* the world moved k device px left: its pixel at x sits at x - k */
        const ix = X0 + x + STEPS - k, iy = Y0 + y;
        const cssx = ix / DPR, cssy = iy / DPR;
        if (cssx > 160 && cssx < 230 && cssy > 320 && cssy < 430) continue;   /* the bro, who moves with the camera */
        const i = (iy * A.width + ix) * A.channels;
        sd[y * W + x] = Math.max(0, luma(B.data, i) - luma(A.data, i));
        wd[y * W + x] = luma(B.data, i);
      }
      shadows.push(sd); worlds.push(B);
      if (k < 2) {
        const od = new Uint8Array(W * HH * 4);
        for (let j = 0; j < W * HH; j++) { const v = Math.min(255, sd[j] * 6); od[j * 4] = v; od[j * 4 + 1] = v; od[j * 4 + 2] = v; od[j * 4 + 3] = 255; }
        await writePng(join(OUT, `shadowlock-${tag}-k${k}.png`), W, HH, od);
      }
    }
    /* the camera's move, read off the pictures: the best horizontal match of
       each step's shadows-off picture with step 0's */
    const shiftOf = (P0, P1) => {
      let best = null;
      for (let s = -2; s <= STEPS + 3; s++) {
        let t = 0, n = 0;
        for (let y = Y0; y < Y1; y += 3) for (let x = X0 + 12; x < X1 - 12; x += 2) {
          const i0 = (y * P0.width + x) * P0.channels, i1 = (y * P1.width + (x - s)) * P1.channels;
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
    const errs = P.logs.filter((l) => /pageerror/.test(l));
    return { away, moved, step, mean, dark: +amt(shadows[0]).toFixed(3), lock, errs };
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const now = await measure(browser, wsPort, webPort, '', OUT, 'locked');
  const was = await measure(browser, wsPort, webPort, 'shadowlock=0', OUT, 'unlocked');
  console.log('    locked:   ' + JSON.stringify(now));
  console.log('    unlocked: ' + JSON.stringify(was));
  for (const [r, name] of [[now, 'locked'], [was, '?shadowlock=0']]) {
    rec.ok(`${name}: the Mayor's window talked away (guard: under his scrim the world does not move)`, !r.err && r.away === true, r);
    rec.ok(`${name}: the camera moved one device pixel a step, in the pictures (guard: ${JSON.stringify(r.moved)})`,
      Array.isArray(r.moved) && r.moved.every((s, k) => Math.abs(s - k) <= 1) && r.moved[r.moved.length - 1] >= STEPS - 2, r.moved);
    rec.ok(`${name}: there are props' shadows to watch (guard: ${r.dark} of a luma level a pixel)`, r.dark > 0.5, r.dark);
  }
  rec.ok(`with the shadows drawn on the world's grid they glide with it: ${now.mean} against ${was.mean} of a luma level a pixel from one step to the next (at most 0.4 of it)`,
    now.mean >= 0 && was.mean > 0 && now.mean <= 0.4 * was.mean, { locked: now.step, unlocked: was.step });
  rec.ok(`...and they are the same shadows at rest (darkness ${now.dark} against ${was.dark}, within 3%)`,
    was.dark > 0 && Math.abs(now.dark - was.dark) / was.dark <= 0.03, { now: now.dark, was: was.dark });
  rec.ok('the probe says the fraction the layer is drawn back by (each in [0, 1) CSS px); none with ?shadowlock=0',
    !!now.lock && now.lock.fx >= 0 && now.lock.fx < 1 && now.lock.fy >= 0 && now.lock.fy < 1 && was.lock === null, { now: now.lock, was: was.lock });
  rec.ok('no page errors', !(now.errs || []).length && !(was.errs || []).length, { now: now.errs, was: was.errs });
}
