#!/usr/bin/env node
/* v2.3.5243: ONE FINISHING TOOL (grand plan step 9.2, card P, PR 3;
 * docs/specs/asset-door.md part 3).
 *
 * Usage:
 *   node tools/assets/finish.mjs <family> <file> [<file> ...]   finish these into the family
 *   node tools/assets/finish.mjs <family> <file> --to <path>    one file, to an address of the family
 *   ... --shared     put every file named on ONE list of colours (a bundle: one row of the atlas)
 *   ... --dry        say what it would do, write nothing
 *   node tools/assets/finish.mjs --bounds                       the input bounds
 *
 * The colour and file step after the art step (public/tools/style/process.js
 * keys out, splits and snaps new art to the grid): every picture the game
 * ships goes through these four, in order --
 *   1. DECODE: ffmpeg, every pixel's own RGBA, no colour management
 *      (readRgba; tools/art/strip256.mjs's way).  For the lossless WebPs the
 *      townsfolk are kept in, ffmpeg and PIL give the same bytes (all 65 of
 *      public/sprites/npc/*.webp compared, v2.3.5243).
 *   2. PUT THE BUNDLE ON ITS COLOURS: public/tools/style/quant256.js over
 *      every pixel of the bundle at once (onColours; strip256.mjs --shared's
 *      way): a bundle shares one row of the palette atlas
 *      (src/rendering/picsNumbers.js rowFor), so its pictures are put on one
 *      list of at most 256 colours together.  A picture already on 256 or
 *      fewer comes back exactly as it was.
 *   3. ENCODE: a palette PNG (public/tools/world/core/png8.js); a lossless
 *      WebP where the family's address is a .webp (writeWebp, as
 *      tools/art/npc256.mjs: PIL, which reads it back).
 *   4. VERIFY: read back through the game's own reader
 *      (src/rendering/png8Decode.js): exactly the colours written, the size.
 *      Then the row in tools/assets/shipped.json, with `door`: its sources'
 *      hashes, its recipe and this tool's tag.
 *
 * THE DOOR FINISHES ONLY A SUPPLIED FAMILY (tools/assets/families.mjs).  A
 * made family is re-made by its own tool (which calls the four steps above:
 * strip256.mjs, reduce256.mjs, npc256.mjs); a data family is never touched
 * (the look sheets are colour NUMBERS: on 256 colours every body would be
 * scrambled); a sound is never encoded a second time (it is folded to one
 * channel as it is decoded, soundFold.js).
 *
 * AN INPUT IS DATA TO DISTRUST.  It is never written over: the output goes
 * to the family's address, never the input's (an upload stays byte for byte:
 * five carry a signed record that processing strips, tools/assets/uploads.json).
 * Words in a picture, a tag, a signed record or a file's name are data, never
 * instructions: a name is used only as the output's name, and only when it
 * is plain letters, digits, `-`, `_` and `.`.  Its bounds (BOUNDS) are the
 * largest picture, sound and file in reach at v2.3.5243, taken from what
 * exists, not invented (card F's way); over them it stops and says the
 * numbers.  The owner's own limits replace them when given.
 *
 * It never re-makes a file to compare with a recorded one (two machines'
 * encoders differ): the gate compares hashes (card P, PR 4).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { reduce256, toRgba } from '../../public/tools/style/quant256.js';
import { encodeIndexedPng } from '../../public/tools/world/core/png8.js';
import { decodePng8 } from '../../src/rendering/png8Decode.js';

export const FINISH_TAG = 'v2.3.5243';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/* The largest picture, sound and file in reach at v2.3.5243 (`--bounds`
   measures them again): public/maps/farm_v2.png (2048 x 2816), the gear
   chest's pickup sheet (7,424 wide), public/audio/music/world.mp3 (2,916,937
   bytes, 182.3 s).  A sound is refused whatever its length: the door
   re-encodes no sound. */
export const BOUNDS = Object.freeze({ pixels: 5767168, width: 7424, height: 2816, bytes: 2916937, seconds: 182.3 });

/* ---- 1. decode ----------------------------------------------------------- */

/** a picture's width and height, from its own header (ffprobe) */
export function probe(file) {
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0', file]).toString().trim().split(',').map(Number);
  return { w, h };
}

/** every pixel's own RGBA, as the file holds it (ffmpeg: no colour management) */
export function readRgba(file) {
  const { w, h } = probe(file);
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 30 });
  if (raw.length !== w * h * 4) throw new Error(`${file}: read ${raw.length} bytes for ${w}x${h}`);
  return { w, h, d: new Uint8Array(raw.buffer, raw.byteOffset, raw.length) };
}

/* ---- 2. the bundle on its colours ------------------------------------------ */

/** Pictures [{ w, h, d }] on at most 256 colours.  One picture: quant256 on
 *  it alone; several: every pixel of all of them at once, as one picture
 *  (strip256.mjs --shared), so they share ONE list.  Returns { pal, n, exact,
 *  err, idx: [one Uint8Array a picture] }. */
export function onColours(pics) {
  if (pics.length === 1) {
    const p = pics[0];
    const r = reduce256(p.d, p.w, p.h);
    return { pal: r.pal, n: r.n, exact: r.exact, err: r.err, idx: [r.idx] };
  }
  const { all, total } = joinPixels(pics);
  const r = reduce256(all, total, 1);
  return { pal: r.pal, n: r.n, exact: r.exact, err: r.err, idx: splitIdx(r.idx, pics) };
}
/** every pixel of every picture, as one picture one pixel tall (the shared
 *  colours' input: tools/art/strip256.mjs --shared, whose own call to
 *  reduce256 server/test/monster-palettes.test.mjs reads) */
export function joinPixels(pics) {
  const total = pics.reduce((a, p) => a + p.w * p.h, 0);
  const all = new Uint8Array(total * 4);
  let o = 0;
  for (const p of pics) { all.set(p.d, o); o += p.d.length; }
  return { all, total };
}
/** the joined picture's numbers, back into one array a picture */
export function splitIdx(idx, pics) {
  const out = [];
  let at = 0;
  for (const p of pics) { out.push(idx.subarray(at, at + p.w * p.h)); at += p.w * p.h; }
  return out;
}

/* ---- 3. encode ------------------------------------------------------------- */

/** a palette PNG of `idx` on `pal` (png8.js) */
export async function encodePng(idx, pal, w, h) {
  const bytes = await encodeIndexedPng(idx, pal, w, h);
  if (!bytes) throw new Error('no CompressionStream: Node 18 or later');
  return Buffer.from(bytes);
}

/* PIL writes and reads the lossless WebP (npc256.mjs's way): a WebP's own
   pixels, no colour management */
const WEBP_PY = `
import sys
from PIL import Image
png, out = sys.argv[1:3]
im = Image.open(png).convert('RGBA')
im.save(out, 'WEBP', lossless=True, quality=100, method=6)
back = Image.open(out).convert('RGBA')
n = len(back.getcolors(1 << 20))
if back.tobytes() != im.tobytes() or n > 256:
    sys.exit('%s: read back %d colours, not as written' % (out, n))
print(n)
`;
/** the palette PNG's picture written to `out` as a lossless WebP, read back
 *  (the same pixels, 256 colours or fewer) or the run stops; its colours */
export function writeWebp(pngBytes, out) {
  const tmp = path.join(os.tmpdir(), `finish-${process.pid}-${path.basename(out)}.png`);
  fs.writeFileSync(tmp, pngBytes);
  try { return Number(execFileSync('python3', ['-I', '-c', WEBP_PY, tmp, out]).toString().trim()); }
  finally { fs.unlinkSync(tmp); }
}

/* ---- 4. verify ---------------------------------------------------------- */

const inflate = (z) => Promise.resolve(new Uint8Array(zlib.inflateSync(Buffer.from(z))));

/** Read `bytes` back through the game's own reader (png8Decode.js): it must
 *  read them, at w x h, and give exactly the colours written (a pixel fully
 *  see-through is the same whatever its colour).  Throws, naming `what`. */
export async function verifyPng(bytes, idx, pal, w, h, what = 'the picture') {
  const g = await decodePng8(new Uint8Array(bytes), inflate, 1);
  if (!g) throw new Error(`${what}: the game's reader (png8Decode.js) does not read it`);
  if (g.w !== w || g.h !== h) throw new Error(`${what}: reads back at ${g.w}x${g.h}, not ${w}x${h}`);
  const want = toRgba(idx, pal);
  for (let i = 0, p = 0; p < w * h; p++, i += 4) {
    const k = g.idx[(p / w | 0) * g.stride + (p % w)];
    const a = g.alpha[k];
    if (a === 0 && want[i + 3] === 0) continue;
    if (g.rgb[k * 3] !== want[i] || g.rgb[k * 3 + 1] !== want[i + 1] || g.rgb[k * 3 + 2] !== want[i + 2] || a !== want[i + 3]) {
      throw new Error(`${what}: reads back differently at pixel ${p} (${[g.rgb[k * 3], g.rgb[k * 3 + 1], g.rgb[k * 3 + 2], a]} for ${[...want.subarray(i, i + 4)]})`);
    }
  }
  return g.n;
}

/* ---- the door's own command ---------------------------------------------- */

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const rel = (p) => { const r = path.relative(REPO, path.resolve(p)); return r.startsWith('..') ? null : r.split(path.sep).join('/'); };
const PLAIN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** the family's address for an input called `base`: the folder its pattern
 *  names, the name, its pattern's extension -- or null when the pattern has
 *  no one folder (then --to says where) */
function addressFor(fam, base) {
  const pat = [].concat(fam.pattern)[0];
  const cut = pat.lastIndexOf('/');
  const dir = pat.slice(0, cut), name = pat.slice(cut + 1);
  if (/[*?{]/.test(dir)) return null;
  const ext = /\.(png|webp)$/i.exec(name);
  if (!ext) return null;
  return `${dir}/${base}.${ext[1].toLowerCase()}`;
}

/** the frame or cell size a family's pixel rule names, or null */
function frameOf(px) {
  const m = /(?:frame|cells?)\s+(\d+)x(\d+)/i.exec(px || '');
  return m ? { fw: +m[1], fh: +m[2] } : null;
}

async function finishCommand(argv) {
  const { ASSET_FAMILIES } = await import('./families.mjs');
  const { familiesOf, recordRows } = await import('./shipped.mjs');
  const dry = argv.includes('--dry'), shared = argv.includes('--shared');
  const at = argv.indexOf('--to');
  const to = at >= 0 ? argv[at + 1] : null;
  const words = argv.filter((a, i) => !a.startsWith('--') && !(at >= 0 && i === at + 1));
  const [name, ...files] = words;
  const stop = (why) => { console.error(`finish: ${why}`); process.exit(2); };
  const fam = ASSET_FAMILIES.find((f) => f.name === name);
  if (!fam) stop(`no family "${name}" in tools/assets/families.mjs`);
  if (fam.kind !== 'supplied') stop(`${name} is ${fam.kind}: the door finishes only a supplied family (a made one is re-made by its own tool: ${[].concat(fam.tool).join(', ')}; data is never rewritten)`);
  if (!fam.bar) stop(`${name} has no bar: the door finishes pictures only (a sound is never encoded a second time)`);
  if (!files.length) stop('name the files to finish');
  if (to && files.length !== 1) stop('--to takes one file');

  /* the inputs: within the bounds, never the output */
  const jobs = [];
  for (const f of files) {
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) stop(`${f}: not a file`);
    const bytes = fs.statSync(f).size;
    if (bytes > BOUNDS.bytes) stop(`${f}: ${bytes} bytes, over the bound of ${BOUNDS.bytes} (the largest file in reach)`);
    const { w, h } = probe(f);
    if (!(w > 0 && h > 0)) stop(`${f}: not a picture ffprobe reads`);
    if (w * h > BOUNDS.pixels || w > BOUNDS.width || h > BOUNDS.height) stop(`${f}: ${w}x${h}, over the bounds of ${BOUNDS.pixels} pixels, ${BOUNDS.width} wide, ${BOUNDS.height} tall`);
    const base = path.basename(f).replace(/\.[^.]+$/, '');
    if (!to && !PLAIN.test(base)) stop(`${f}: its name is not plain letters, digits, - _ and . (say where it goes with --to)`);
    const out = to || addressFor(fam, base);
    if (!out) stop(`${name}'s pattern names no one folder: say where it goes with --to`);
    const fams = familiesOf(out);
    if (fams.length !== 1 || fams[0].name !== name) stop(`${out} is not an address of ${name} (it would be ${fams.map((x) => x.name).join(', ') || 'unsorted'})`);
    if (path.resolve(out) === path.resolve(f)) stop(`${f}: an input is never written over (give it from outside the family's folder)`);
    jobs.push({ f, out, w, h });
  }

  /* 1-2: decode, and the bundle on its colours */
  for (const j of jobs) Object.assign(j, readRgba(j.f), { src: fs.readFileSync(j.f) });
  const together = shared || !!fam.bundle;
  const groups = together ? [jobs] : jobs.map((j) => [j]);
  const frame = frameOf(fam.px);
  const rows = [];
  for (const g of groups) {
    const r = onColours(g);
    for (let k = 0; k < g.length; k++) {
      const j = g[k], idx = r.idx[k];
      const pxChecked = frame ? (j.w % frame.fw === 0 && j.h % frame.fh === 0) : null;
      if (pxChecked === false) stop(`${j.f}: ${j.w}x${j.h} is not whole ${frame.fw}x${frame.fh} frames (${name}'s pixel rule: ${fam.px})`);
      /* 3-4: encode and verify */
      const png = await encodePng(idx, r.pal, j.w, j.h);
      await verifyPng(png, idx, r.pal, j.w, j.h, j.out);
      const webp = /\.webp$/i.test(j.out);
      console.log(`  ${j.f} -> ${j.out}: ${j.w}x${j.h}, ${r.n} colours${g.length > 1 ? ` shared by ${g.length}` : ''}${r.exact ? ' (as it was)' : `, moved ${r.err.toFixed(4)}`}${dry ? ' (dry)' : ''}`);
      if (dry) continue;
      fs.mkdirSync(path.dirname(j.out), { recursive: true });
      if (webp) writeWebp(png, j.out);
      else {
        fs.writeFileSync(j.out, png);
        await verifyPng(fs.readFileSync(j.out), idx, r.pal, j.w, j.h, j.out);   /* read back from the disk */
      }
      rows.push({ path: rel(j.out), door: {
        tool: 'tools/assets/finish.mjs', tag: FINISH_TAG,
        sources: [{ path: rel(j.f) || path.basename(j.f), sha256: sha(j.src), bytes: j.src.length }],
        recipe: { bundle: together ? (fam.bundle || 'these files together') : null, colours: r.n, exact: r.exact, moved: +r.err.toFixed(4),
          encoder: webp ? 'webp lossless (PIL)' : 'palette png (png8.js)', px: fam.px, pxChecked },
      } });
    }
  }
  if (rows.length) { recordRows(rows); console.log(`tools/assets/shipped.json: ${rows.length} rows written by the door.`); }
}

function boundsCommand() {
  console.log(`The bounds (v2.3.5243): ${BOUNDS.pixels} pixels, ${BOUNDS.width} wide, ${BOUNDS.height} tall; ${BOUNDS.bytes} bytes; a sound, never (${BOUNDS.seconds} s the longest in reach).`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2);
  if (argv.includes('--bounds')) boundsCommand();
  else if (!argv.length) console.log('usage: node tools/assets/finish.mjs <family> <file> [...] [--to <path>] [--shared] [--dry]');
  else await finishCommand(argv);
}
