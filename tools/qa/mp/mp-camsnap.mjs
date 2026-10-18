/* ═══ THE WORLD MOVES AS ONE PICTURE (v2.3.3444) ═══
 *
 * Owner, 2026-10-18: "When playing the game on PC the world has a warbled
 * underwater effect when the character moves diagonally (sw, nw, ne, se).
 * Can you fix that?"
 *
 * The camera is a fraction of a pixel wherever it is, and every world sprite
 * is snapped to whole device pixels corner by corner (pixiApp's roundPixels),
 * so each piece of ground, each building and each prop rounded at its own
 * fraction of the camera: as the view glided, the world moved a whole pixel
 * at a time, every piece at a moment of its own, and a piece's quad breathed
 * by a pixel.  On a phone a device pixel is a third of a CSS px; on a computer
 * (dpr 1) it is a whole one, and the HD art is shrunk 3.5x, so a hop is seen
 * and a stretched piece re-samples into a new grain.  A diagonal walk there
 * moves each axis ~1.01 px a frame, so the hops came round tile after tile as
 * slow ripples -- the warble.  v2.3.3444 puts the world container on whole
 * device pixels (pixiRenderer.js, THE CAMERA IN WHOLE DEVICE PIXELS); `?camsnap=0`
 * is the camera as it was.
 *
 * In BroTown's ore yard (a trough, a minecart, coal, crates, barrels, a lamp
 * post: mp-shadowlock's spot), the camera is moved EXACTLY as a 60 fps walk
 * moves it (SPEED 2.5 game px a frame, a diagonal 0.71 of it each way), one
 * frame at a time, north-east and then east, and each frame is photographed
 * with the page's controls and the HUD put out of the picture (they do not
 * move with the world).  A world that moves as one picture is, frame after
 * frame, the frame before moved by the camera's whole-pixel step: the measure
 * is the share of the world's pixels that are not (a luma change over 24,
 * the bro and his plate left out -- he moves with the camera here).
 *   1. the probe: the world drawn on whole device pixels every frame, within
 *      half a device pixel of the camera; `?camsnap=0` the camera as it was
 *   2. guard: the camera really moved (the steps add up to the walk)
 *   3. a computer (1280 x 800, dpr 1), north-east: no frame leaves more than
 *      SHARE_OK of the world behind
 *   4. ...and east, the same
 *   5. the camera as it was (`?camsnap=0`): the same walks DO leave pieces
 *      behind -- the warble the test exists for is there to see (guard)
 *   6. a phone (390 x 844, dpr 3), north-east: the probe, and the world moves
 *      as one picture there too
 *   7. YOU stay where you were on screen: the camera follows you, so the old
 *      camera held your figure (and the plate and bars it carries) perfectly
 *      still, and every frame it is still drawn exactly there (within 0.01 of
 *      a device px; __btPlayerDrawn against S.player and the probe), though
 *      the rounding moved the world under you (guard: by 0.1 px or more)
 *   8. no page errors
 * Pictures: tools/qa/mp/out/camsnap-*.png (each worst frame's leftovers).
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DESK = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
const NF = 24;                 /* frames of each walk */
const WALK = 2.5;              /* game px a 60 fps frame (gameSystems.js SPEED, no points) */
const G = await H.wheelGeom();
const SPOT = [23450 + G.shift, 21750 + G.shift];   /* the ore yard (mp-shadowlock) */
const DIRS = [{ id: 'ne', ax: Math.SQRT1_2, ay: -Math.SQRT1_2 }, { id: 'e', ax: 1, ay: 0 }];
const DIFF = 24;               /* a luma change that is a pixel left behind */
const SHARE_OK = 0.004;        /* the most of the world a frame may leave behind */
const SHARE_OLD = 0.02;        /* what the old camera must show on some frame (the guard) */

const luma = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
const frames = (P, n) => P.page.evaluate((k) => new Promise((res) => { let i = 0; const f = () => (++i >= k ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

/* every dialogue talked away, and kept away three checks running */
async function talkAway(P) {
  let clear = 0;
  for (let i = 0; i < 40 && clear < 3; i++) {
    const open = await P.page.evaluate(() => !!document.querySelector('.bt-npcdlg, .bt-qoffer, .bt-npcdlg-scrim'));
    if (!open) { clear++; await P.page.waitForTimeout(300); continue; }
    clear = 0;
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

/* the share of the world's pixels frame B left behind against frame A moved
   by (ox, oy) device px; `skip` marks the pixels not measured */
function leftBehind(A, B, ox, oy, W, Hh, skip, out) {
  let bad = 0, n = 0;
  for (let y = 12; y < Hh - 12; y++) {
    const yy = y + oy;
    if (yy < 0 || yy >= Hh) continue;
    for (let x = 12; x < W - 12; x++) {
      const xx = x + ox;
      if (xx < 0 || xx >= W || skip[y * W + x]) continue;
      const d = Math.abs(luma(A.data, (y * A.width + x) * A.channels) - luma(B.data, (yy * B.width + xx) * B.channels));
      n++;
      if (d > DIFF) { bad++; if (out) { const j = (y * W + x) * 4; out[j] = out[j + 1] = out[j + 2] = 255; } }
    }
  }
  return n ? bad / n : 1;
}

async function measure(browser, wsPort, webPort, OUT, { tag, viewport, dpr, touch, query }) {
  const P = await H.newPlayer(browser, { name: 'Glide' + tag, wsPort, webPort, viewport, touch, dpr, world: 'wheel', query });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    if (!ok) return { err: 'never reached the Wheel' };
    await P.page.waitForTimeout(4000);
    await H.hopTo(P, SPOT[0], SPOT[1], { tries: 160, step: 140, gap: 200 });
    await P.page.waitForTimeout(6000);
    const away = await talkAway(P);
    /* the page's controls and the HUD do not move with the world: out of the
       picture (the canvas kept), and the screen's Pixi layer (the minimap) hidden */
    await P.page.addStyleTag({ content: 'body *:not(canvas):not(html):not(body){visibility:hidden !important} canvas{visibility:visible !important}' });
    const base = await P.page.evaluate(() => {
      const S = window._gameState.current;
      S.player.vx = 0; S.player.vy = 0;
      const scr = window._pixiRenderer.app.stage.children.find((c) => c.label === 'screen');
      if (scr) scr.visible = false;
      const r = document.querySelector('canvas').getBoundingClientRect();
      return { cx: Math.round(S.camera.x), cy: Math.round(S.camera.y), sx: S._worldScaleX, vw: S._viewW, vh: S._viewH,
        r: { x: r.left, y: r.top, w: r.width, h: r.height } };
    });
    const clip = { x: Math.round(base.r.x), y: Math.round(base.r.y), width: Math.round(base.r.w), height: Math.round(base.r.h) };
    const W = clip.width * dpr, Hh = clip.height * dpr;
    /* the bro (and his plate and shadow) stand at the view's middle: left out */
    const k = base.sx * dpr;
    const skip = new Uint8Array(W * Hh);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const gx = (x - W / 2) / k, gy = (y - Hh / 2) / k;
      if (gx > -110 && gx < 110 && gy > -190 && gy < 110) skip[y * W + x] = 1;
    }
    const out = { away, dpr, sx: base.sx, walks: {} };
    for (const D of DIRS) {
      const pics = [], probes = [];
      for (let f = 0; f < NF; f++) {
        await P.page.evaluate(({ b, f, v, D }) => {
          const S = window._gameState.current;
          const cx = b.cx + D.ax * v * f, cy = b.cy + D.ay * v * f;
          S.player.x = cx + b.vw / 2; S.player.y = cy + b.vh / 2; S.player.vx = 0; S.player.vy = 0;
          S.camera.x = cx; S.camera.y = cy;
        }, { b: base, f, v: WALK, D });
        await frames(P, 2);
        probes.push(await P.page.evaluate(() => {
          const c = window.__btCamSnap ? window.__btCamSnap() : null;
          const d = window.__btPlayerDrawn ? window.__btPlayerDrawn() : null;
          const S = window._gameState.current;
          if (c && d) c.self = { dx: d.x, dy: d.footY, px: S.player.x, py: S.player.y, sx: S._worldScaleX, sy: S._worldScaleY };
          return c;
        }));
        pics.push(H.decodePng(await P.page.screenshot({ type: 'png', clip })));
      }
      const shares = [], steps = [];
      let worst = -1, worstAt = 0;
      for (let f = 1; f < NF; f++) {
        const a = probes[f - 1], b = probes[f];
        const ex = a && b ? (b.x - a.x) * dpr : 0, ey = a && b ? (b.y - a.y) * dpr : 0;
        /* the world's whole-pixel step: exact when the camera is on whole
           device pixels; for the old camera the better of the two either side */
        let best = Infinity, bs = [0, 0];
        for (const sx of new Set([Math.floor(ex), Math.ceil(ex)])) for (const sy of new Set([Math.floor(ey), Math.ceil(ey)])) {
          /* the world's pixel at x in the frame before is at x + sx in this one */
          const s = leftBehind(pics[f - 1], pics[f], sx, sy, W, Hh, skip, null);
          if (s < best) { best = s; bs = [sx, sy]; }
        }
        shares.push(+best.toFixed(5)); steps.push(bs);
        if (best > worst) { worst = best; worstAt = f; }
      }
      const pic = new Uint8Array(W * Hh * 4);
      for (let j = 3; j < pic.length; j += 4) pic[j] = 255;
      const ws = steps[worstAt - 1];
      leftBehind(pics[worstAt - 1], pics[worstAt], ws[0], ws[1], W, Hh, skip, pic);
      await writePng(join(OUT, `camsnap-${tag}-${D.id}-worst.png`), W, Hh, pic);
      /* the probe: on whole device pixels, within half a device pixel of the camera */
      const onGrid = probes.every((p) => p && Math.abs(p.x * dpr - Math.round(p.x * dpr)) < 1e-3 && Math.abs(p.y * dpr - Math.round(p.y * dpr)) < 1e-3);
      const near = probes.every((p) => p && Math.abs(p.x - p.rawX) * dpr <= 0.5 + 1e-3 && Math.abs(p.y - p.rawY) * dpr <= 0.5 + 1e-3);
      /* how far the pictures moved (the steps that matched), how far the world
         was drawn moved (the probe), and how far the walk goes */
      const travel = [steps.reduce((t, s) => t + s[0], 0), steps.reduce((t, s) => t + s[1], 0)];
      const p0 = probes[0], p1 = probes[NF - 1];
      const cam = p0 && p1 ? [+((p1.x - p0.x) * dpr).toFixed(1), +((p1.y - p0.y) * dpr).toFixed(1)] : null;
      const want = [-D.ax * WALK * (NF - 1) * k, -D.ay * WALK * (NF - 1) * k];
      /* YOU: where your figure was drawn on screen against where the old
         camera drew it (device px), and how far the rounding moved the world
         from the old camera -- what you would have swayed by */
      let selfOff = 0, rounded = 0;
      for (const p of probes) {
        if (!p || !p.self) { selfOff = Infinity; continue; }
        const s = p.self;
        selfOff = Math.max(selfOff, Math.abs((s.dx * s.sx + p.x) - (s.px * s.sx + p.rawX)) * dpr, Math.abs((s.dy * s.sy + p.y) - (s.py * s.sy + p.rawY)) * dpr);
        rounded = Math.max(rounded, Math.abs(p.x - p.rawX) * dpr, Math.abs(p.y - p.rawY) * dpr);
      }
      out.walks[D.id] = { worst: +worst.toFixed(5), worstAt, mean: +(shares.reduce((a, b) => a + b, 0) / shares.length).toFixed(5),
        shares, travel, cam, want: want.map((v) => +v.toFixed(1)), on: probes.every((p) => p && p.on), onGrid, near,
        selfOff: +selfOff.toFixed(4), rounded: +rounded.toFixed(3) };
    }
    out.errs = P.logs.filter((l) => /pageerror/.test(l));
    return out;
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const desk = await measure(browser, wsPort, webPort, OUT, { tag: 'desk', viewport: DESK, dpr: 1, touch: false, query: '' });
  const old = await measure(browser, wsPort, webPort, OUT, { tag: 'old', viewport: DESK, dpr: 1, touch: false, query: 'camsnap=0' });
  const phone = await measure(browser, wsPort, webPort, OUT, { tag: 'phone', viewport: PHONE, dpr: 3, touch: true, query: '' });
  for (const [n, m] of [['desk', desk], ['old', old], ['phone', phone]]) console.log(`    ${n}: ` + JSON.stringify(m));
  const w = (m, d) => (m && m.walks && m.walks[d]) || null;
  for (const [name, m] of [['computer', desk], ['computer, ?camsnap=0', old], ['phone', phone]]) {
    rec.ok(`${name}: in the Wheel, the Mayor's window talked away`, !!m && !m.err && m.away === true, m && (m.err || m.away));
  }
  /* 1. the probe */
  rec.ok('1. the world is drawn on whole device pixels every frame of both walks, within half a device pixel of the camera',
    ['ne', 'e'].every((d) => w(desk, d) && w(desk, d).on && w(desk, d).onGrid && w(desk, d).near), ['ne', 'e'].map((d) => w(desk, d) && { on: w(desk, d).on, onGrid: w(desk, d).onGrid, near: w(desk, d).near }));
  rec.ok('...and ?camsnap=0 is the camera as it was (not snapped)',
    ['ne', 'e'].every((d) => w(old, d) && !w(old, d).on), ['ne', 'e'].map((d) => w(old, d) && w(old, d).on));
  /* 2. guard: the world was drawn as far as the walk goes, and the pictures
     moved with it -- step for step where the world moves as one picture, and
     within a pixel a frame for the old camera, whose pieces do not agree */
  for (const [name, m, slack] of [['computer', desk, 1.5], ['computer, ?camsnap=0', old, NF / 2], ['phone', phone, 1.5]]) {
    rec.ok(`2. ${name}: the camera really moved, in the pictures (guard: ${['ne', 'e'].map((d) => w(m, d) && JSON.stringify({ pics: w(m, d).travel, drawn: w(m, d).cam, walk: w(m, d).want })).join(' ')})`,
      ['ne', 'e'].every((d) => {
        const r = w(m, d);
        return r && r.cam && Math.hypot(r.want[0], r.want[1]) > 20
          && Math.abs(r.cam[0] - r.want[0]) <= 1 && Math.abs(r.cam[1] - r.want[1]) <= 1
          && Math.abs(r.travel[0] - r.cam[0]) <= slack && Math.abs(r.travel[1] - r.cam[1]) <= slack;
      }),
      ['ne', 'e'].map((d) => w(m, d) && { pics: w(m, d).travel, drawn: w(m, d).cam, walk: w(m, d).want }));
  }
  /* 3-4. the computer */
  rec.ok(`3. a computer walking north-east: no frame leaves more than ${SHARE_OK * 100}% of the world behind (worst ${w(desk, 'ne') && (w(desk, 'ne').worst * 100).toFixed(2)}%)`,
    !!w(desk, 'ne') && w(desk, 'ne').worst <= SHARE_OK, w(desk, 'ne') && w(desk, 'ne').shares);
  rec.ok(`4. ...and walking east (worst ${w(desk, 'e') && (w(desk, 'e').worst * 100).toFixed(2)}%)`,
    !!w(desk, 'e') && w(desk, 'e').worst <= SHARE_OK, w(desk, 'e') && w(desk, 'e').shares);
  /* 5. guard: the old camera shows the hops */
  rec.ok(`5. the camera as it was leaves pieces of the world behind on the same walks (guard: worst ne ${w(old, 'ne') && (w(old, 'ne').worst * 100).toFixed(2)}%, e ${w(old, 'e') && (w(old, 'e').worst * 100).toFixed(2)}%; at least ${SHARE_OLD * 100}%)`,
    !!w(old, 'ne') && !!w(old, 'e') && w(old, 'ne').worst >= SHARE_OLD && w(old, 'e').worst >= SHARE_OLD,
    { ne: w(old, 'ne') && w(old, 'ne').shares, e: w(old, 'e') && w(old, 'e').shares });
  /* 6. the phone */
  rec.ok(`6. a phone (dpr 3): the world on whole device pixels, and walking north-east no frame leaves more than ${SHARE_OK * 100}% of it behind (worst ${w(phone, 'ne') && (w(phone, 'ne').worst * 100).toFixed(2)}%)`,
    !!w(phone, 'ne') && w(phone, 'ne').on && w(phone, 'ne').onGrid && w(phone, 'ne').near && w(phone, 'ne').worst <= SHARE_OK,
    w(phone, 'ne') && { on: w(phone, 'ne').on, onGrid: w(phone, 'ne').onGrid, near: w(phone, 'ne').near, shares: w(phone, 'ne').shares });
  /* 7. you: the camera follows you, so the old camera held you still -- and
     you are still held exactly there, though the world was rounded under you */
  for (const [name, m] of [['computer', desk], ['phone', phone]]) {
    const rs = ['ne', 'e'].map((d) => w(m, d));
    rec.ok(`7. ${name}: your figure (and the plate and bars it carries) is drawn every frame exactly where the old camera drew it (worst ${rs.map((r) => r && r.selfOff).join(' / ')} device px), though the rounding moved the world up to ${rs.map((r) => r && r.rounded).join(' / ')} px from it`,
      rs.every((r) => r && r.selfOff <= 0.01) && rs.some((r) => r && r.rounded >= 0.1), rs.map((r) => r && { selfOff: r.selfOff, rounded: r.rounded }));
  }
  rec.ok('8. no page errors', [desk, old, phone].every((m) => m && !(m.errs || []).length), [desk, old, phone].map((m) => m && m.errs));
}
