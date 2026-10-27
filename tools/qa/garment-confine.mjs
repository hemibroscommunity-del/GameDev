#!/usr/bin/env node
/* v2.3.3647: what garmentConfine.js (src/rendering) leaves unpainted, on every
 * player body sheet's real pixels -- the trouser- and boot-coloured specks the
 * recolour used to paint, and proof that no real trouser or boot is among them.
 *
 *   node tools/qa/garment-confine.mjs [out_dir] [sheet.png ...]
 *
 * Needs sharp (`npm i --no-save sharp@0.33.5`, as CI's optimize-assets).  Each
 * sheet is brought to the height the game bakes it at (nearest neighbour, as
 * spriteScale.upscaleToFrameHeight), classified as recolorBodyToCanvas does
 * (skin, then trousers, then a boot's flat grey; no shirt), and confined.  For
 * each sheet: the counts, and <out_dir>/<sheet>.png with every frame drawn
 * twice, the trousers and boots the rule paints in pink and blue on the left,
 * what it leaves (unpainted, the art's own colour) in yellow and magenta on the
 * right.  A whole-sheet number to watch: boots left in a frame's bottom fifth
 * (where nothing but a boot can be) -- 0 on every whole figure.  A head sheet
 * paints no garment and a torso strip no boot, as the game bakes them, so
 * theirs count outline.
 */
import { readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { confineGarments } from '../../src/rendering/garmentConfine.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = join(REPO, 'public/sprites/player');
const OUT = process.argv[2] || join(REPO, 'tools/qa/out/garment-confine');
const ONLY = process.argv.slice(3);
/* playerDecal's bands (SHOES_MAX_UP, PANTS_MAX_UP), and a torso strip's:
   the waist's sliver of trousers and no boots (playerSkins TORSO_WAIST_UP) */
const SHOES_UP = 0.35, PANTS_UP = 0.68, TORSO_UP = 0.05;
/* the stand-in strips' frame boxes, effectsRenderer's _swordCfg / _bowCfg */
const STANDIN = {
  'sword-south': [320, 320], 'sword-east': [402, 246], 'sword-north': [340, 227],
  'bow-east': [214, 241], 'bow-southwest': [154, 233], 'bow-south': [130, 234], 'bow-northwest': [160, 248], 'bow-north': [122, 260],
};
/* playerSkins._isSkin / _isEyeCream, copied: playerSkins imports Pixi */
const isSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25;
const isEyeCream = (r, g) => g >= 0.8 * r;

mkdirSync(OUT, { recursive: true });
const files = (ONLY.length ? ONLY : readdirSync(DIR).filter((f) => f.endsWith('.png') && !/weapon|armored|welcome/.test(f))).sort();
console.log('sheet                         frames | boots painted, left (bottom fifth) | trousers painted, left');
for (const fn of files) {
  const base = fn.replace(/\.png$/, '');
  const key = Object.keys(STANDIN).find((k) => base === k || base.startsWith(k + '-'));
  let { data, info } = await sharp(join(DIR, fn)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let W = info.width, H = info.height;
  let FW, wantH;
  if (key) { [FW, wantH] = STANDIN[key]; } else { wantH = 256; FW = 256; }
  if (H !== wantH) {
    const k = wantH / H;
    const r = await sharp(join(DIR, fn)).ensureAlpha().resize(Math.round(W * k), wantH, { kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });
    data = r.data; W = r.info.width; H = r.info.height;
  }
  if (!key && W % FW) FW = H;   /* a square-framed sheet at another size */
  const d = data;
  const pants = new Uint8Array(W * H), boots = new Uint8Array(W * H);
  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (isSkin(r, g, b, a) && !isEyeCream(r, g)) continue;
    if (a > 180 && g >= r - 10 && g > b + 8 && r < 150) { pants[p] = 1; continue; }
    if (a > 180) {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if ((mx - mn) < 28 && mx >= 45 && mx < 140) boots[p] = 1;
    }
  }
  /* a head sheet takes no garment colour at all (playerSkins
     _buildPickupHeadSheet), a torso strip only its waist's sliver */
  const torso = /-torso$/.test(base), head = /-head$/.test(base);
  const kept = head ? { pants: new Uint8Array(W * H), boots: new Uint8Array(W * H) }
    : torso ? { pants: confineGarments(d, W, H, FW, pants, null, 0, TORSO_UP).pants, boots: new Uint8Array(W * H) }
    : confineGarments(d, W, H, FW, pants, boots, SHOES_UP, PANTS_UP);
  const frames = Math.max(1, Math.floor(W / FW));
  let bp = 0, bl = 0, blLow = 0, pp = 0, pl = 0;
  /* each frame's figure bottom, for the bottom-fifth count */
  const bottom = new Int32Array(frames).fill(-1), topY = new Int32Array(frames).fill(-1);
  for (let f = 0; f < frames; f++) {
    for (let y = 0; y < H; y++) {
      let any = false;
      for (let x = f * FW; x < Math.min(W, f * FW + FW); x++) if (d[(y * W + x) * 4 + 3] > 40) { any = true; break; }
      if (any) { if (topY[f] < 0) topY[f] = y; bottom[f] = y; }
    }
  }
  const out = Buffer.alloc(W * 2 * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x, i = p * 4;
      const f = Math.min(frames - 1, Math.floor(x / FW));
      let c = [d[i], d[i + 1], d[i + 2], d[i + 3]];
      let left = c, right = c;
      if (boots[p]) {
        if (kept.boots[p]) { bp++; left = [72, 98, 192, 255]; }
        else {
          bl++; right = [255, 0, 255, 255];
          if (bottom[f] >= 0 && y >= bottom[f] - (bottom[f] - topY[f] + 1) * 0.2) blLow++;
        }
      } else if (pants[p]) {
        if (kept.pants[p]) { pp++; left = [214, 112, 168, 255]; }
        else { pl++; right = [255, 255, 0, 255]; }
      }
      const fx = x % FW, fo = f * FW * 2;
      for (const [o, px] of [[fo + fx, left], [fo + FW + fx, right]]) {
        const j = (y * W * 2 + o) * 4;
        out[j] = px[0]; out[j + 1] = px[1]; out[j + 2] = px[2]; out[j + 3] = px[3];
      }
    }
  }
  await sharp(out, { raw: { width: W * 2, height: H, channels: 4 } })
    .flatten({ background: { r: 40, g: 40, b: 52 } }).png().toFile(join(OUT, base + '.png'));
  console.log(`${fn.padEnd(30)} ${String(frames).padStart(4)} | ${String(bp).padStart(6)} ${String(bl).padStart(6)} (${blLow}) | ${String(pp).padStart(6)} ${String(pl).padStart(6)}`);
}
