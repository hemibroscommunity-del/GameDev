/* Restore the pre-v2.3.1526 256px trait art as a parallel hi-res set (v2.3.1579).
 *
 * WHY THE ART GOT SMALL, AND WHY THAT WAS RIGHT
 * v2.3.1526 halved every trait frame from 256 to 128.  The reason was GPU
 * texture memory, not disk: preloadTraits() puts every catalog entry x 5
 * directions on the STARTUP GATE as a Pixi texture, and a 256x256 RGBA frame
 * costs 256KB of VRAM whatever the PNG weighs (they compress to well under a
 * megabyte, which is why it never looked like a problem in the repo).  48 ids
 * at 256 was ~62MB of VRAM; at 128 it is ~15.7MB.  On the iPhone this game
 * targets, that saving is real and must not be undone.
 *
 * WHY THE LOGIN SCREEN LOOKS BAD ANYWAY
 * The character portrait is NOT part of that pipeline.
 * src/rendering/characterPortrait.js is a plain 2D-canvas compositor
 * (new Image + drawImage) that builds a 256x256 bitmap, which NameModal then
 * CSS-upscales to fill the stage with image-rendering: pixelated.  So a 128px
 * hat is enlarged twice — 2x into the bitmap, then again to the stage — and
 * the second one is deliberately hard-edged.  Next to a body drawn from
 * 256-native art, the hat reads as visibly worse, which is the report.
 *
 * THE FIX THIS TOOL ENABLES
 * Put the ORIGINAL 256 art back, in a `hi/` subfolder, for the portrait to
 * prefer.  Costs ~0.93 MB of disk across all three categories and ZERO VRAM,
 * because nothing in the Pixi preload path ever looks in `hi/`.  The
 * in-world renderer keeps its 128 textures and the v2.3.1526 saving stands.
 *
 * The art is recovered from git rather than regenerated: v2.3.1526 overwrote
 * the files in place, so the 256 originals are exactly one commit back and are
 * the real source, not an upscale of the downscale.
 *
 * Run: node tools/restore-trait-hires.mjs [--rev=17755fe~1] [--dry-run]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const h = argv.find(a => a.startsWith('--' + n + '=')); return h ? h.slice(n.length + 3) : d; };
const DRY = argv.includes('--dry-run');
/* The commit that did the halving; its parent holds the 256 art. */
const REV = flag('rev', '17755fe~1');
const DIRS = ['south', 'east', 'north', 'northeast', 'southwest'];
const CATS = ['headwear', 'hair', 'facialhair'];

function gitShow(path) {
  try {
    return execFileSync('git', ['show', `${REV}:${path}`], { maxBuffer: 64 * 1024 * 1024 });
  } catch { return null; }
}
const dims = (buf) => (buf && buf.length > 24 ? `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}` : '?');

let wrote = 0, bytes = 0, skipped = 0, missing = 0;
for (const cat of CATS) {
  const base = `public/sprites/traits/${cat}`;
  if (!existsSync(base)) continue;
  for (const id of readdirSync(base)) {
    const dir = `${base}/${id}`;
    for (const d of DIRS) {
      const src = `${dir}/${d}.png`;
      if (!existsSync(src)) continue;            /* this id has no such facing */
      const buf = gitShow(src);
      if (!buf) { missing++; continue; }
      /* Only worth storing if it is genuinely bigger than what ships now. */
      const w = buf.readUInt32BE(16);
      if (w <= 128) { skipped++; continue; }
      const out = `${dir}/hi/${d}.png`;
      if (!DRY) { mkdirSync(`${dir}/hi`, { recursive: true }); writeFileSync(out, buf); }
      wrote++; bytes += buf.length;
    }
  }
  console.log(`${cat.padEnd(11)} done`);
}
console.log(`\n${DRY ? '[dry-run] would write' : 'wrote'} ${wrote} files, ${(bytes / 1048576).toFixed(2)} MB`);
if (skipped) console.log(`${skipped} already <=128 at ${REV} (nothing to recover)`);
if (missing) console.log(`${missing} not present at ${REV}`);
