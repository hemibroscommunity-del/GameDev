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

/* --shared: ONE list of colours for every strip named (v2.3.4359).  The game
   holds a monster's strips as colour numbers on one row of colours a bundle
   (src/rendering/picsNumbers.js rowFor): strips each on their own 256 would
   need a row each, and the rows are few.  So a monster's strips are put on
   256 colours TOGETHER -- every pixel of every strip, as one picture -- and
   each written with that same list. */
const argv = process.argv.slice(2);
const shared = argv[0] === '--shared';
if (shared) argv.shift();
const [from, to, ...names] = argv;
if (!from || !to || !names.length) { console.error('usage: strip256.mjs [--shared] <from dir> <to dir> <name> ...'); process.exit(2); }
async function write(name, w, h, idx, pal, note) {
  const bytes = await encodeIndexedPng(idx, pal, w, h);
  if (!bytes) throw new Error('no CompressionStream: Node 18 or later');
  const out = path.join(to, name + '.png');
  fs.writeFileSync(out, bytes);
  const back = readRgba(out), want = toRgba(idx, pal);
  for (let i = 0; i < want.length; i++) {
    if (back.d[i] !== want[i] && !(want[(i & ~3) + 3] === 0 && back.d[(i & ~3) + 3] === 0)) {
      throw new Error(`${out}: reads back differently at byte ${i}`);
    }
  }
  console.log(`  ${name}.png ${w}x${h}: ${note}, ${Math.round(bytes.length / 1024)} KB`);
}
if (shared) {
  const pics = names.map((name) => Object.assign({ name }, readRgba(path.join(from, name + '.png'))));
  const total = pics.reduce((a, p) => a + p.w * p.h, 0);
  const all = new Uint8Array(total * 4);
  let o = 0;
  for (const p of pics) { all.set(p.d, o); o += p.d.length; }
  const r = reduce256(all, total, 1);
  let at = 0;
  for (const p of pics) {
    await write(p.name, p.w, p.h, r.idx.subarray(at, at + p.w * p.h), r.pal, `the ${r.n} colours shared by all ${pics.length}`);
    at += p.w * p.h;
  }
  console.log(`  ${pics.length} strips on ${r.n} colours together${r.exact ? '' : `, moved ${r.err.toFixed(4)}`}`);
} else {
  for (const name of names) {
    const { w, h, d } = readRgba(path.join(from, name + '.png'));
    const r = reduce256(d, w, h);
    await write(name, w, h, r.idx, r.pal, `${r.n} colours${r.exact ? '' : `, moved ${r.err.toFixed(4)}`}`);
  }
}
