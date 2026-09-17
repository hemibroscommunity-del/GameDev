/* MEASURE THE GENERAL STORE'S INTERIOR ART (v2.3.2620).
 *
 * VendorPanel places the storekeeper against numbers -- the room's alpha
 * bbox, the keeper strip's frame box, the row where his forearms are cut off
 * -- and this is where those numbers come from.  Every one of them is read
 * off the pixels here rather than guessed at in a style attribute, because a
 * placement that is eyeballed at one width drifts at another and nobody can
 * re-derive it later (docs/TRAPS.md §80: a control run that still contains
 * the thing it was meant to test).
 *
 * It also renders a PREVIEW composite, which is the half that actually
 * caught something: drawn behind the room painting the keeper is invisible
 * (the room is one flat opaque image with no layer to slide him into), and
 * that was the first attempt.  The preview showed an empty shop; the numbers
 * alone would not have.
 *
 *   node tools/qa/art/measure-store-interior.mjs
 *   node tools/qa/art/measure-store-interior.mjs --preview=/tmp/store.png
 *   node tools/qa/art/measure-store-interior.mjs --w=24 --cx=45 --base=51
 *
 * --w/--cx/--base are the three placement numbers as percentages of the
 * room's own box: the figure's painted width, the centre of that width, and
 * the row his forearms sit on.  They are the same three constants VendorPanel
 * uses, so a change can be tried here and read off the picture before it is
 * typed into the panel.
 */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const PREVIEW = arg('preview', '');
const W_PCT = +arg('w', '24'), CX_PCT = +arg('cx', '45'), BASE_PCT = +arg('base', '51');

const ROOM = join(REPO, 'public/sprites/props/general-store-interior.png');
const KEEPER = join(REPO, 'public/sprites/npc/storekeeper-bro-idle.png');
const b64 = (p) => 'data:image/png;base64,' + readFileSync(p).toString('base64');

const browser = await chromium.launch({ executablePath: process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
const out = await page.evaluate(async ([roomSrc, keepSrc, wPct, cxPct, basePct, wantPreview]) => {
  const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
  /* Alpha bbox of a column slice: a pixel counts as painted over alpha 8, so
     a soft edge does not read as empty and a stray 1-alpha pixel does not
     read as art. */
  const bbox = (img, sx, sw) => {
    const c = document.createElement('canvas');
    c.width = sw; c.height = img.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, sx, 0, sw, img.height, 0, 0, sw, img.height);
    const d = x.getImageData(0, 0, sw, img.height).data;
    let x0 = sw, y0 = img.height, x1 = -1, y1 = -1;
    for (let y = 0; y < img.height; y++) for (let X = 0; X < sw; X++) {
      if (d[(y * sw + X) * 4 + 3] > 8) { if (X < x0) x0 = X; if (X > x1) x1 = X; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };
  const R = await load(roomSrc), K = await load(keepSrc);
  const room = bbox(R, 0, R.width);
  const fw = Math.round(K.width / 6);
  const frames = []; for (let f = 0; f < 6; f++) frames.push(bbox(K, f * fw, fw));
  const F0 = frames[0];
  const cw = F0.x1 - F0.x0 + 1;
  const scale = (wPct / 100 * room.w) / cw;
  const place = {
    scale: +scale.toFixed(4),
    drawW: +(fw * scale).toFixed(1), drawH: +(K.height * scale).toFixed(1),
    left: +(cxPct / 100 * room.w - (F0.x0 + cw / 2) * scale).toFixed(1),
    top: +(basePct / 100 * room.h - (F0.y1 + 1) * scale).toFixed(1),
  };
  let preview = null;
  if (wantPreview) {
    const c = document.createElement('canvas'); c.width = room.w; c.height = room.h;
    const x = c.getContext('2d');
    x.drawImage(R, room.x0, room.y0, room.w, room.h, 0, 0, room.w, room.h);
    /* ON TOP of the room, deliberately: see this file's header. */
    x.drawImage(K, 0, 0, fw, K.height, place.left, place.top, place.drawW, place.drawH);
    preview = c.toDataURL('image/png');
  }
  return { room: { src: [R.width, R.height], bbox: room }, keeper: { src: [K.width, K.height], frameW: fw, frames }, place, preview };
}, [b64(ROOM), b64(KEEPER), W_PCT, CX_PCT, BASE_PCT, !!PREVIEW]);
await browser.close();

const { preview, ...report } = out;
console.log(JSON.stringify(report, null, 1));
if (PREVIEW && preview) {
  writeFileSync(PREVIEW, Buffer.from(preview.split(',')[1], 'base64'));
  console.log('preview -> ' + PREVIEW);
}
