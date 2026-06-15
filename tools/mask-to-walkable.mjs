/* mask-to-walkable: convert a ChatGPT-painted walkability mask (magenta =
 * blocked, original art = walkable) into the {width,height,grid} JSON the
 * engine consumes via WALKABILITY_MAPS / loadWalkabilityMaps (tiledMaps.js).
 * grid[ty][tx] = true means walkable, false means blocked.
 *
 * Dependency-free PNG decode (8-bit RGB/RGBA, non-interlaced) via zlib.
 *
 * Usage: node tools/mask-to-walkable.mjs <mask.png> <out.json> <gridW> <gridH> [blockThreshold=0.5]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

function decodePNG(buf) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) throw new Error('not a PNG');
  let off = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); off += 4;
    const type = buf.toString('ascii', off, off + 4); off += 4;
    const data = buf.subarray(off, off + len); off += len + 4; // +4 skip CRC
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (bitDepth !== 8) throw new Error('only 8-bit depth supported, got ' + bitDepth);
  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : colorType === 0 ? 1 : 0;
  if (!channels) throw new Error('unsupported colorType ' + colorType);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const rowStart = y * stride;
    for (let x = 0; x < stride; x++) {
      const rb = raw[pos++];
      const a = x >= channels ? out[rowStart + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = (x >= channels && y > 0) ? out[(y - 1) * stride + x - channels] : 0;
      let v;
      switch (filter) {
        case 0: v = rb; break;
        case 1: v = rb + a; break;
        case 2: v = rb + b; break;
        case 3: v = rb + ((a + b) >> 1); break;
        case 4: { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = rb + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break; }
        default: throw new Error('bad filter ' + filter);
      }
      out[rowStart + x] = v & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

const [, , maskPath, outPath, gwArg, ghArg, threshArg, dilateArg, modeArg] = process.argv;
if (!maskPath || !outPath || !gwArg || !ghArg) {
  console.error('usage: node tools/mask-to-walkable.mjs <mask.png> <out.json> <gridW> <gridH> [blockThreshold=0.5] [dilate=0] [mode=magenta|black]');
  process.exit(1);
}
const gw = parseInt(gwArg, 10), gh = parseInt(ghArg, 10);
const thresh = threshArg ? parseFloat(threshArg) : 0.5;
const dilate = dilateArg ? parseInt(dilateArg, 10) : 0;
const mode = modeArg || 'magenta';

const img = decodePNG(readFileSync(maskPath));
const total = Array.from({ length: gh }, () => new Array(gw).fill(0));
const mag = Array.from({ length: gh }, () => new Array(gw).fill(0));
for (let y = 0; y < img.height; y++) {
  const ty = Math.min(gh - 1, Math.floor((y / img.height) * gh));
  for (let x = 0; x < img.width; x++) {
    const tx = Math.min(gw - 1, Math.floor((x / img.width) * gw));
    const i = (y * img.width + x) * img.channels;
    const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
    total[ty][tx]++;
    // 'magenta' mode: pink overlay = green well below BOTH red and blue
    //   (relative, so it catches the overlay at any brightness).
    // 'black' mode: blocked = near-black paint (all channels very low).
    const hit = mode === 'black'
      ? (r < 50 && g < 50 && b < 50)
      : (r - g >= 50 && b - g >= 40);
    if (hit) mag[ty][tx]++;
  }
}
let grid = [];
for (let ty = 0; ty < gh; ty++) {
  const row = [];
  for (let tx = 0; tx < gw; tx++) {
    const frac = mag[ty][tx] / Math.max(1, total[ty][tx]);
    row.push(frac < thresh); // true = walkable
  }
  grid.push(row);
}

// Morphology on the blocked region (8-neighbour). dilate>0 GROWS blocked (a
// safety buffer against ragged edges). dilate<0 ERODES blocked: shrinks walls
// back and removes thin/small obstacles so the player doesn't catch on every
// prop. Run as |dilate| passes.
{
  const erode = dilate < 0;
  for (let d = 0; d < Math.abs(dilate); d++) {
    const prev = grid.map((r) => r.slice());
    for (let ty = 0; ty < gh; ty++) {
      for (let tx = 0; tx < gw; tx++) {
        const cell = prev[ty][tx];                 // true = walkable
        if (erode ? cell : !cell) continue;        // erode: skip walkable; dilate: skip blocked
        let flip = false;
        for (let dy = -1; dy <= 1 && !flip; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = ty + dy, nx = tx + dx;
            if (ny < 0 || ny >= gh || nx < 0 || nx >= gw) continue;
            if (prev[ny][nx] === (erode ? true : false)) { flip = true; break; }
          }
        }
        if (flip) grid[ty][tx] = erode;            // erode -> walkable; dilate -> blocked
      }
    }
  }
}

let blocked = 0;
for (let ty = 0; ty < gh; ty++) for (let tx = 0; tx < gw; tx++) if (!grid[ty][tx]) blocked++;

// ASCII preview so the collision can be eyeballed against the art.
console.log(`source ${img.width}x${img.height} (${img.channels}ch) -> ${gw}x${gh} grid, threshold ${thresh}`);
console.log(`blocked ${blocked}/${gw * gh} tiles (${((100 * blocked) / (gw * gh)).toFixed(0)}% blocked)\n`);
for (let ty = 0; ty < gh; ty++) console.log(grid[ty].map((w) => (w ? '·' : '#')).join(''));

writeFileSync(outPath, JSON.stringify({ width: gw, height: gh, grid }));
console.log(`\nwrote ${outPath}`);
