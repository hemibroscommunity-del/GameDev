#!/usr/bin/env node
/* v2.3.3671: what toolWood.js (src/rendering) takes for the pickaxe, on the
 * mining sheets' real pixels at the size the game bakes them (256 px frames),
 * and -- to show why it is the mining sheets only -- what it would take on
 * every other player sheet, whose own skin is pale enough to pass the wood's
 * test.
 *
 *   node tools/qa/tool-wood.mjs            counts, every player sheet
 *   node tools/qa/tool-wood.mjs --draw     + tools/qa/out/tool-wood/<sheet>.png
 *                                          (the wood magenta, the steel cyan)
 *
 * Each frame of mine-south.png should show the handle and the head's rim in
 * magenta and nothing of the miner himself. */
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toolWoodMask } from '../../src/rendering/toolWood.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = join(REPO, 'public/sprites/player');
const OUT = join(REPO, 'tools/qa/out/tool-wood');
const draw = process.argv.includes('--draw');
if (draw) mkdirSync(OUT, { recursive: true });

const sheets = readdirSync(DIR).filter((f) => f.endsWith('.png')).sort();
console.log('sheet                          wood   steel     ms');
for (const fn of sheets) {
  const meta = await sharp(join(DIR, fn)).metadata();
  const k = 256 / meta.height;
  const { data: d, info } = await sharp(join(DIR, fn)).ensureAlpha()
    .resize(Math.round(meta.width * k), 256, { kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const t0 = performance.now();
  const m = toolWoodMask(d, W, H, 256);
  const ms = performance.now() - t0;
  let wood = 0, steel = 0;
  for (let p = 0; p < W * H; p++) { if (m[p] === 1) wood++; else if (m[p] === 2) steel++; }
  const mark = /^mine-south/.test(fn) ? '  <- the game asks it of this one' : '';
  console.log(`${fn.padEnd(28)} ${String(wood).padStart(6)} ${String(steel).padStart(7)} ${ms.toFixed(1).padStart(6)}${mark}`);
  if (draw && (wood || steel)) {
    const out = Buffer.from(d);
    for (let p = 0; p < W * H; p++) {
      if (m[p] === 1) { out[p * 4] = 255; out[p * 4 + 1] = 0; out[p * 4 + 2] = 255; out[p * 4 + 3] = 255; }
      else if (m[p] === 2) { out[p * 4] = 0; out[p * 4 + 1] = 255; out[p * 4 + 2] = 255; out[p * 4 + 3] = 255; }
    }
    await sharp(out, { raw: { width: W, height: H, channels: 4 } }).flatten({ background: { r: 40, g: 40, b: 52 } }).png().toFile(join(OUT, fn));
  }
}
