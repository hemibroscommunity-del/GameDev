/* ═══ mp-flagwave (v2.3.3347): THE TOWN HALL'S FLAG WAVES ═══
 *
 * The owner: "Also make the town square flag wave using code it looks silly
 * being still".  There is no flag object: the flag is painted into the Town
 * Hall's picture, so the game cuts its cloth out and waves it
 * (src/rendering/wheelLife.js FLAG, worldLife.js _updateWheelFlags).  On a
 * phone, in the Wheel, standing in the square below the Town Hall:
 *   1. the cloth was cut out of the Town Hall's page, nothing refused, and
 *      hangs in the building's life;
 *   2. calm (the harness's __btAmbienceOff) it lies exactly where it was
 *      painted -- its box on the screen is the picture's [412, 12)-[538, 84)
 *      of 812 x 807 -- and red cloth fills that box as the painting did;
 *   3. hidden, none of it is left painted on the building (no red there),
 *      while the pole's gold knob and finial are still drawn;
 *   4. with the wind on it waves: its free end rises and falls, the picture
 *      in its box changes between two frames, the building's wall beside it
 *      does not;
 *   5. calm again it lies as painted;
 *   6. `?nopalette` (the old way of drawing): nothing is cut, and the
 *      painted flag is there, still;
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/flagwave-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const DPR = 2;
/* src/data/buildingLife.js: the cloth's box on the Town Hall's picture */
const BOX = [412, 12, 538, 84], PW = 812, PH = 807;

async function intoWheel(P) {
  await H.enterWorld(P);
  return H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
    { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
}

/* stand in the square in front of the Town Hall, at its foot, a little east
   of its middle -- under the flag, so it is drawn mid-screen: from further
   south it lies under the top bar, and from west of the middle under the
   minimap (drawn in the canvas itself) -- with the tutorial handed in first
   (the dev op), as a fresh character beside Mayor Bro is shown his first
   quest's window, which dims the world */
async function toTheSquare(P, wsPort) {
  const id = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', id).catch(() => null);
  await P.page.waitForTimeout(800);
  const hall = await H.waitFor(P, () => {
    const S = window._gameState && window._gameState.current, W = window.__btWheelObjects;
    if (!S || !W) return null;
    return W.near(S.player.x, S.player.y, 2400).find((o) => o.id === 'townhall') || null;
  }, (v) => !!v, { timeout: 30000, label: 'the Town Hall' }).catch(() => null);
  if (!hall) return false;
  /* the cloth's middle is 0.085 of the picture east of its foot (412-538 of 812) */
  await H.hopTo(P, hall.x + hall.w * 0.085, hall.y + 24, { step: 100, gap: 260, tries: 60 });
  await P.page.waitForTimeout(1500);
  await P.page.keyboard.press('Escape').catch(() => {});
  return true;
}
/* the game's own picture: every page element (the top bar, the dashboard,
   a window) hidden while `fn` looks, the canvas alone shown */
async function canvasOnly(P, fn) {
  await P.page.addStyleTag({ content: 'body.bt-qa-canvas-only * { visibility: hidden !important; } body.bt-qa-canvas-only canvas.brotown-canvas { visibility: visible !important; }' }).catch(() => {});
  await P.page.evaluate(() => document.body.classList.add('bt-qa-canvas-only'));
  await P.page.waitForTimeout(250);
  try { return await fn(); } finally {
    await P.page.evaluate(() => document.body.classList.remove('bt-qa-canvas-only'));
  }
}

/* the Town Hall's picture's rect on the screen (CSS px), from the world */
const hallRect = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current, W = window.__btWheelObjects;
  if (!S || !W) return null;
  const hall = W.near(S.player.x, S.player.y, 2000).find((o) => o.id === 'townhall');
  if (!hall) return null;
  const sp = W.sprite(hall.i);
  if (!sp) return { drawn: false };
  const r = document.querySelector('.brotown-canvas').getBoundingClientRect();
  const kx = S._worldScaleX || 1, ky = S._worldScaleY || kx;
  const left = sp.x - sp.ax * sp.w, top = sp.y - sp.h;
  return { drawn: true, life: sp.life, x: r.left + (left - S.camera.x) * kx, y: r.top + (top - S.camera.y) * ky, w: sp.w * kx, h: sp.h * ky };
});
const flagRect = (h) => ({ x: h.x + h.w * BOX[0] / PW, y: h.y + h.h * BOX[1] / PH, w: h.w * (BOX[2] - BOX[0]) / PW, h: h.h * (BOX[3] - BOX[1]) / PH });
/* the pole's knob, just under the cloth's lower left: x 396-418, y 65-84 */
const knobRect = (h) => ({ x: h.x + h.w * 398 / PW, y: h.y + h.h * 67 / PH, w: h.w * 18 / PW, h: h.h * 16 / PH });
/* the wall left of the door: nothing of the building's life is there */
const wallRect = (h) => ({ x: h.x + h.w * 0.08, y: h.y + h.h * 0.56, w: h.w * 0.16, h: h.h * 0.12 });
const clip = (r) => ({ x: Math.max(0, Math.floor(r.x)), y: Math.max(0, Math.floor(r.y)), width: Math.max(2, Math.ceil(r.w)), height: Math.max(2, Math.ceil(r.h)) });

/* how much of a patch of the screen is the cloth's red, and its gold */
async function colours(P, r) {
  const img = await H.screenshotPixels(P, clip(r));
  let red = 0, gold = 0, n = 0;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const [R, G, B] = img.at(x, y);
    n++;
    if (R > 140 && G < 95 && B < 85) red++;
    else if (R > 190 && G > 140 && B < 120) gold++;
  }
  return { red: red / n, gold: gold / n, n, img };
}
/* the share of a patch's pixels that differ between two pictures of it */
function changed(a, b) {
  let d = 0, n = 0;
  const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = a.at(x, y), q = b.at(x, y);
    n++;
    if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) > 60) d++;
  }
  return n ? d / n : 0;
}
const flags = (P) => P.page.evaluate(() => (window.__btWheelFlags ? window.__btWheelFlags() : null));
const calm = (P, on) => P.page.evaluate((v) => { window.__btAmbienceOff = v; }, on);

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `flagwave-${name}.png`) }).catch(() => {});

  const P = await H.newPlayer(browser, { name: 'Flagbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: DPR });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  const stopAlive = H.keepAlive(P);
  try {
    rec.ok('in the Wheel (guard)', !!(await intoWheel(P)));
    rec.ok('in the square below the Town Hall (guard)', await toTheSquare(P, wsPort));
    let h = null;
    for (let i = 0; !h && i < 40; i++) { const v = await hallRect(P); if (v && v.drawn) h = v; else await P.page.waitForTimeout(500); }
    rec.ok('the Town Hall is drawn, with its life (guard)', !!h && h.life > 0, h);
    if (!h) return;

    /* ── 1. cut, once, and hung ── */
    const f1 = await H.waitFor(P, () => (window.__btWheelFlags ? window.__btWheelFlags() : null), (v) => !!v && v.flags.length >= 1,
      { timeout: 15000, label: 'the flag' }).catch(() => null);
    console.log('    FLAGS ' + JSON.stringify(f1));
    rec.ok(`1. the Town Hall's cloth was cut out of its page and hangs in its life (${f1 && f1.cuts} cut, ${f1 && f1.refused} refused)`,
      !!f1 && f1.cuts >= 1 && f1.refused === 0 && f1.flags.length === 1, f1);

    /* ── 2. calm, it lies where it was painted ── */
    await calm(P, true);
    await P.page.waitForTimeout(600);
    h = (await hallRect(P)) || h;
    const fr = flagRect(h);
    const f2 = await flags(P);
    const m = f2 && f2.flags[0] && f2.flags[0].mesh, pb = f2 && f2.flags[0] && f2.flags[0].pic;
    const near = (a, b) => Math.abs(a - b) <= 1.5;
    rec.ok(`2. calm, the cloth lies exactly where it was painted: its box ${m && [m.x, m.y, m.w, m.h].join(',')} is the picture's [412,12)-[538,84) (${[fr.x, fr.y, fr.w, fr.h].map((v) => v.toFixed(1)).join(',')})`,
      !!m && f2.flags[0].rest === true && f2.flags[0].amp === 0 && near(m.x, fr.x) && near(m.y, fr.y) && near(m.w, fr.w) && near(m.h, fr.h)
        && !!pb && near(pb.x, h.x) && near(pb.y, h.y) && near(pb.w, h.w) && near(pb.h, h.h),
      { mesh: m, want: fr, pic: pb, hall: h });
    const shown = await canvasOnly(P, async () => { const c = await colours(P, fr); await shot(P, 'calm'); return c; });
    rec.ok(`...and red cloth fills its box as the painting did (${(shown.red * 100).toFixed(0)}% red, ${(shown.gold * 100).toFixed(0)}% gold)`,
      shown.red > 0.15 && shown.gold > 0.08, { red: shown.red, gold: shown.gold, n: shown.n });

    /* ── 3. hidden, nothing of it is left painted on the building ── */
    await P.page.evaluate(() => window.__btWheelFlags.hide(true));
    await P.page.waitForTimeout(400);
    const [bare, knob] = await canvasOnly(P, async () => { const r = [await colours(P, fr), await colours(P, knobRect(h))]; await shot(P, 'hidden'); return r; });
    await P.page.evaluate(() => window.__btWheelFlags.hide(false));
    rec.ok(`3. with the cloth hidden none of it is left painted on the building (${(bare.red * 100).toFixed(1)}% red), and the pole's gold knob is still there (${(knob.gold * 100).toFixed(0)}% gold)`,
      bare.red < 0.01 && knob.gold > 0.1, { bare: { red: bare.red, gold: bare.gold }, knob: { red: knob.red, gold: knob.gold } });

    /* ── 4. with the wind on, it waves ── */
    await calm(P, false);
    const tips = [];
    for (let i = 0; i < 14; i++) {
      await P.page.waitForTimeout(220);
      const f = await flags(P);
      if (f && f.flags[0]) tips.push(f.flags[0].tipDy);
    }
    const f4 = await flags(P);
    const spread = tips.length ? Math.max(...tips) - Math.min(...tips) : 0;
    console.log('    TIPS ' + JSON.stringify(tips) + ' ' + JSON.stringify(f4 && f4.flags[0]));
    rec.ok(`4. with the wind on it waves: its free end rose and fell ${spread.toFixed(1)} px of cloth over 3 s (swing ${f4 && f4.flags[0] && f4.flags[0].amp})`,
      !!f4 && f4.flags[0] && f4.flags[0].rest === false && f4.flags[0].amp > 3 && spread > 3, { tips, flag: f4 && f4.flags[0] });
    h = (await hallRect(P)) || h;
    const frA = flagRect(h), wl = wallRect(h);
    const [a1, w1, a2, w2] = await canvasOnly(P, async () => {
      const x1 = await colours(P, frA), y1 = await colours(P, wl);
      await P.page.waitForTimeout(330);
      const x2 = await colours(P, frA), y2 = await colours(P, wl);
      await shot(P, 'waving');
      return [x1, y1, x2, y2];
    });
    const cf = changed(a1.img, a2.img), cw = changed(w1.img, w2.img);
    rec.ok(`...the picture in its box changes between two frames (${(cf * 100).toFixed(1)}% of it), the wall beside the door does not (${(cw * 100).toFixed(1)}%)`,
      cf > 0.02 && cw < 0.005, { flag: cf, wall: cw });
    /* BT_FLAG_FRAMES=n: n pictures of the flag waving, for a person to look at */
    const nFrames = Math.min(40, Number(process.env.BT_FLAG_FRAMES) || 0);
    if (nFrames) {
      await canvasOnly(P, async () => {
        const r = flagRect((await hallRect(P)) || h);
        const c = clip({ x: r.x - r.w * 0.35, y: r.y - r.h * 0.6, w: r.w * 1.7, h: r.h * 2.2 });
        for (let k = 0; k < nFrames; k++) {
          await P.page.screenshot({ path: join(OUT, `flagwave-frame-${String(k).padStart(2, '0')}.png`), clip: c }).catch(() => {});
          await P.page.waitForTimeout(120);
        }
      });
    }

    /* ── 5. calm again ── */
    await calm(P, true);
    await P.page.waitForTimeout(500);
    const f5 = await flags(P);
    rec.ok('5. calm again, it lies as painted (at rest, no swing)', !!f5 && f5.flags[0] && f5.flags[0].rest === true && f5.flags[0].tipDy === 0, f5 && f5.flags[0]);
    rec.ok('7. no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }

  /* ── 6. ?nopalette: nothing cut, the painted flag there and still ── */
  const Q = await H.newPlayer(browser, { name: 'Oldway', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: DPR, query: 'nopalette' });
  try {
    rec.ok('?nopalette: in the Wheel (guard)', !!(await intoWheel(Q)));
    await toTheSquare(Q, wsPort);
    let h = null;
    for (let i = 0; !h && i < 40; i++) { const v = await hallRect(Q); if (v && v.drawn) h = v; else await Q.page.waitForTimeout(500); }
    await calm(Q, false);
    await Q.page.waitForTimeout(800);
    const f6 = await flags(Q);
    const painted = h ? await canvasOnly(Q, async () => { const c = await colours(Q, flagRect(h)); await shot(Q, 'nopalette'); return c; }) : null;
    rec.ok(`6. with ?nopalette nothing is cut and the painted flag is there (${painted ? (painted.red * 100).toFixed(0) : '?'}% red), still`,
      !!h && !!f6 && f6.cuts === 0 && f6.flags.length === 0 && !!painted && painted.red > 0.15, { f6, red: painted && painted.red });
  } finally {
    await Q.ctx.close().catch(() => {});
  }
}
