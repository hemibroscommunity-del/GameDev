/* MEASURE THE AUCTION HOUSE'S INTERIOR ART (v2.3.2627).
 *
 * The successor to measure-store-interior.mjs, which measured a room that no
 * longer exists: #686 renamed the vendor building to the AUCTION HOUSE and
 * #678 took the shopkeeper's stock list out of its panel, so the general
 * store's painting had nothing left to be the inside of.  This measures the
 * owner's auction-house interior instead, against the same three questions:
 * where does the art actually stop, how much of it should the panel show, and
 * is there a place in the room where a figure can believably stand.
 *
 * The third question is the one this tool exists for.  The old room had a
 * plainly empty spot behind the counter; this one is a fully dressed
 * composition built around the gavel, so "does he fit" had to be SEEN.  Four
 * placements were rendered and looked at before one was chosen -- the
 * rejected three and the reason each was rejected are in
 * docs/triage-2026-09-18/auction-interior.md.
 *
 *   node tools/qa/art/measure-auction-interior.mjs
 *   node tools/qa/art/measure-auction-interior.mjs --preview=/tmp/room.png
 *   node tools/qa/art/measure-auction-interior.mjs --keeper --w=12 --cx=37 --base=77 --preview=/tmp/try.png
 *   node tools/qa/art/measure-auction-interior.mjs --ruler --preview=/tmp/ruler.png
 *
 * --crop is the percentage of the room's painted height the panel shows,
 * measured from the top; the shipped PNG is already cropped to the scene, so
 * it defaults to 100 and is only useful against an uncropped raw via --room.
 * --w/--cx/--base are a figure's painted width, its centre and the row its
 * forearms sit on, all as percentages of the room's own box -- the same three
 * constants VendorPanel uses, so a placement can be tried here and read off
 * the picture before it is typed into the panel.  --ruler draws a 5% grid over
 * the output, which is how the counter's surface row (77%) was read.
 */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const has = (k) => args.includes(`--${k}`);
const PREVIEW = arg('preview', '');
const CROP = +arg('crop', '100');
const KEEPER_ON = has('keeper');
const W_PCT = +arg('w', '12'), CX_PCT = +arg('cx', '37'), BASE_PCT = +arg('base', '77');

const ROOM = arg('room', join(REPO, 'public/sprites/props/auction-house-interior.png'));
const KEEPER = join(REPO, 'public/sprites/npc/storekeeper-bro-idle.png');
const b64 = (p) => 'data:image/png;base64,' + readFileSync(p).toString('base64');

const browser = await chromium.launch({ executablePath: process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
const out = await page.evaluate(async ([roomSrc, keepSrc, cfg]) => {
  const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
  /* Alpha bbox of a column slice: a pixel counts as painted over alpha 8, so a
     soft edge does not read as empty and a stray 1-alpha pixel does not read
     as art.  This room is opaque RGB, so its bbox is the whole canvas -- the
     measurement is kept anyway so a future re-export WITH a margin does not
     silently shift every number below it. */
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
  const R = await load(roomSrc);
  const room = bbox(R, 0, R.width);
  const sceneH = Math.round(room.h * cfg.crop / 100);
  const report = { room: { src: [R.width, R.height], bbox: room }, sceneH, aspect: +(room.w / sceneH).toFixed(3) };

  let K = null, place = null;
  if (cfg.keeper) {
    K = await load(keepSrc);
    const fw = Math.round(K.width / 6);
    const F0 = bbox(K, 0, fw);
    const cw = F0.x1 - F0.x0 + 1;
    const scale = (cfg.w / 100 * room.w) / cw;
    place = {
      frameW: fw, frame0: F0, scale: +scale.toFixed(4),
      drawW: +(fw * scale).toFixed(1), drawH: +(K.height * scale).toFixed(1),
      left: +(cfg.cx / 100 * room.w - (F0.x0 + cw / 2) * scale).toFixed(1),
      top: +(cfg.base / 100 * room.h - (F0.y1 + 1) * scale).toFixed(1),
    };
    report.keeper = { src: [K.width, K.height], place };
  }

  let preview = null;
  if (cfg.preview) {
    const c = document.createElement('canvas'); c.width = room.w; c.height = sceneH;
    const x = c.getContext('2d');
    x.drawImage(R, room.x0, room.y0, room.w, sceneH, 0, 0, room.w, sceneH);
    /* ON TOP of the room, deliberately: it is one flat opaque painting with no
       layer to slide a figure behind (the lesson measure-store-interior.mjs
       was written around -- drawn behind it, he is simply invisible). */
    if (K && place) x.drawImage(K, 0, 0, place.frameW, K.height, place.left, place.top, place.drawW, place.drawH);
    if (cfg.ruler) {
      x.font = 'bold 26px monospace'; x.lineWidth = 2;
      for (let p = 5; p < 100; p += 5) {
        const y = Math.round(room.h * p / 100);
        if (y >= sceneH) break;
        x.strokeStyle = (p % 25 === 0) ? 'rgba(255,0,0,.95)' : 'rgba(0,255,255,.8)';
        x.beginPath(); x.moveTo(0, y); x.lineTo(room.w, y); x.stroke();
        x.fillStyle = '#000'; x.fillRect(2, y - 22, 96, 26);
        x.fillStyle = '#fff'; x.fillText(p + '%', 6, y - 3);
      }
      for (let p = 10; p < 100; p += 10) {
        const X = Math.round(room.w * p / 100);
        x.strokeStyle = 'rgba(255,255,0,.55)';
        x.beginPath(); x.moveTo(X, 0); x.lineTo(X, sceneH); x.stroke();
      }
    }
    preview = c.toDataURL('image/png');
  }
  return { ...report, preview };
}, [b64(ROOM), b64(KEEPER), { crop: CROP, keeper: KEEPER_ON, w: W_PCT, cx: CX_PCT, base: BASE_PCT, preview: !!PREVIEW, ruler: has('ruler') }]);
await browser.close();

const { preview, ...report } = out;
console.log(JSON.stringify(report, null, 1));
if (PREVIEW && preview) {
  writeFileSync(PREVIEW, Buffer.from(preview.split(',')[1], 'base64'));
  console.log('preview -> ' + PREVIEW);
}
