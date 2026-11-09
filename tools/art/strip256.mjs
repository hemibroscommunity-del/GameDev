#!/usr/bin/env node
/* ═══ v2.3.4355: A CUT STRIP ON 256 COLOURS ═══
 *
 *   node tools/art/strip256.mjs <from dir> <to dir> <name> [<name> ...]
 *
 * Each <from dir>/<name>.png, read exactly as its file holds it (ffmpeg, as
 * tools/art/reduce256.mjs does), put on at most 256 colours by the game's own
 * quantiser (public/tools/style/quant256.js: the memory law, "new art is 256
 * colours a picture at most") and written to <to dir>/<name>.png as a palette
 * PNG.  Each is read back and must give exactly the colours written.
 * Called by the cutting tools (tools/art/cut_water_frog.py).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { reduce256, toRgba } from '../../public/tools/style/quant256.js';
import { encodeIndexedPng } from '../../public/tools/world/core/png8.js';

function readRgba(file) {
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0', file]).toString().trim().split(',').map(Number);
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 30 });
  if (raw.length !== w * h * 4) throw new Error(`${file}: read ${raw.length} bytes for ${w}x${h}`);
  return { w, h, d: new Uint8Array(raw.buffer, raw.byteOffset, raw.length) };
}

const [from, to, ...names] = process.argv.slice(2);
if (!from || !to || !names.length) { console.error('usage: strip256.mjs <from dir> <to dir> <name> ...'); process.exit(2); }
for (const name of names) {
  const { w, h, d } = readRgba(path.join(from, name + '.png'));
  const r = reduce256(d, w, h);
  const bytes = await encodeIndexedPng(r.idx, r.pal, w, h);
  if (!bytes) throw new Error('no CompressionStream: Node 18 or later');
  const out = path.join(to, name + '.png');
  fs.writeFileSync(out, bytes);
  const back = readRgba(out), want = toRgba(r.idx, r.pal);
  for (let i = 0; i < want.length; i++) {
    if (back.d[i] !== want[i] && !(want[(i & ~3) + 3] === 0 && back.d[(i & ~3) + 3] === 0)) {
      throw new Error(`${out}: reads back differently at byte ${i}`);
    }
  }
  console.log(`  ${name}.png ${w}x${h}: ${r.n} colours${r.exact ? '' : `, moved ${r.err.toFixed(4)}`}, ${Math.round(bytes.length / 1024)} KB`);
}
