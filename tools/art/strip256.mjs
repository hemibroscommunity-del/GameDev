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
 *
 * v2.3.5243: its four steps are the asset door's finishing tool's
 * (tools/assets/finish.mjs: readRgba, onColours, encodePng, verifyPng), and
 * the read-back is the game's own reader (src/rendering/png8Decode.js) where
 * it was ffmpeg.  The same command line, the same colours (compared, card P
 * PR 3), the same bytes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { readRgba, onColours, encodePng, verifyPng } from '../assets/finish.mjs';

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
  const bytes = await encodePng(idx, pal, w, h);
  const out = path.join(to, name + '.png');
  fs.writeFileSync(out, bytes);
  await verifyPng(fs.readFileSync(out), idx, pal, w, h, out);   /* read back: exactly the colours written */
  console.log(`  ${name}.png ${w}x${h}: ${note}, ${Math.round(bytes.length / 1024)} KB`);
}
if (shared) {
  const pics = names.map((name) => Object.assign({ name }, readRgba(path.join(from, name + '.png'))));
  const r = onColours(pics);
  for (let k = 0; k < pics.length; k++) {
    const p = pics[k];
    await write(p.name, p.w, p.h, r.idx[k], r.pal, `the ${r.n} colours shared by all ${pics.length}`);
  }
  console.log(`  ${pics.length} strips on ${r.n} colours together${r.exact ? '' : `, moved ${r.err.toFixed(4)}`}`);
} else {
  for (const name of names) {
    const pic = readRgba(path.join(from, name + '.png'));
    const r = onColours([pic]);
    await write(name, pic.w, pic.h, r.idx[0], r.pal, `${r.n} colours${r.exact ? '' : `, moved ${r.err.toFixed(4)}`}`);
  }
}
