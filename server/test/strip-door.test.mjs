/* ═══ v2.3.4470: ONE DOOR FOR ART THAT LOADS WHILE YOU PLAY ═══
 *
 * The owner, 2026-11-10, of the slowdown by the Blacksmith (the fire goblin's
 * look loading): "I thought fire goblin strips were converted into 256 color
 * art like everything should be."  They were, and the game held them as
 * colour numbers; but the way in unpacked each 256-colour file to full
 * colour, cropped and packed it on a canvas on the page, and read every
 * pixel back to find the numbers the file had held all along.  And then:
 * "make sure that's a system going forward so it doesn't happen again."
 *
 * THE SYSTEM, held here the way hit-door.test holds the monsters' hits:
 *   A. every monster picture is a 256-colour file the reader can read (the
 *      eight snowman strips that were not are converted in this version);
 *   B. a strip of frames comes in through ONE door, zoneTextures.js
 *      loadTrackedStrip, which reads the file's own numbers off the page's
 *      thread first (stripRead.js -> png8Worker.js -> stripPack.js) and
 *      unpacks on the page only what the reader cannot read;
 *   C. the page's own packers have a closed list of callers: a NEW caller
 *      fails this suite, with the rule.
 * Checked:
 *   1. stripPack.js packs a strip's numbers exactly as the page's packer
 *      packs its pixels: the same cells and layout, every pixel the colour
 *      its file gives it; only the colours used; see-through is see-through
 *      whatever a file's entry says; a strip not worth packing comes whole;
 *   2. the same on real art (the fire goblin's attack, the water frog's
 *      death that the packer leaves whole);
 *   3. A: every picture under public/sprites/monsters is an 8-bit palette
 *      PNG, bar a list that can only shrink;
 *   4. B: the door, read from the source;
 *   5. C: the callers of the page's packers;
 *   6. the rule is written where every session reads it (CLAUDE.md).
 * The phone half is tools/qa/mp/mp-stripgentle.mjs.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { decodePng8, readPng8Chunks } from '../../src/rendering/png8Decode.js';
import { packStripNumbers } from '../../src/rendering/stripPack.js';
import { trimScanCell, trimCellOf, trimLayout } from '../../src/rendering/trimRules.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const inflate = async (z) => new Uint8Array(inflateSync(z));
const rng = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

/* a file's numbers as the RGBA a canvas would read (a see-through pixel reads 0,0,0,0) */
function rgbaOf(dec) {
  const { w, h, stride, idx, rgb, alpha } = dec;
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = idx[y * stride + x], a = alpha[k], o = (y * w + x) * 4;
    if (a === 0) continue;
    d[o] = rgb[k * 3]; d[o + 1] = rgb[k * 3 + 1]; d[o + 2] = rgb[k * 3 + 2]; d[o + 3] = a;
  }
  return d;
}
/* the page's packer's rules on those pixels: its cells, its layout, and each packed pixel's colour */
function pageWay(dec, fw, fh, n) {
  const d = rgbaOf(dec), W = dec.w;
  const cells = [];
  for (let i = 0; i < n; i++) cells.push(trimCellOf(trimScanCell(d, W, i * fw, fw, fh), fw, fh));
  const L = trimLayout(cells, fw, fh, n);
  const w = L ? L.W : n * fw, h = L ? L.H : fh;
  const px = new Uint32Array(w * h);
  const d32 = new Uint32Array(d.buffer);
  const copy = (sx, sy, cw, ch, dx, dy) => { for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) px[(dy + y) * w + dx + x] = d32[(sy + y) * W + sx + x]; };
  if (L) cells.forEach((c, i) => { if (!c.blank) copy(i * fw + c.tx, c.ty, c.w, c.h, c.ax, c.ay); }); else copy(0, 0, n * fw, fh, 0, 0);
  return { w, h, px, cells: L ? cells : null };
}
function same(dec, fw, fh, n) {
  const a = pageWay(dec, fw, fh, n), b = packStripNumbers(dec, fw, fh, n);
  if (!b) return { ok: false, why: 'no pack' };
  if (a.w !== b.w || a.h !== b.h) return { ok: false, why: 'size', a: [a.w, a.h], b: [b.w, b.h] };
  if (JSON.stringify(a.cells) !== JSON.stringify(b.cells)) return { ok: false, why: 'cells' };
  for (let i = 0; i < a.px.length; i++) if (a.px[i] !== b.pal[b.idx[i]]) return { ok: false, why: 'pixel', i, a: a.px[i], b: b.pal[b.idx[i]] };
  const used = new Set(b.idx);
  let max = 0;
  for (let i = 0; i < b.idx.length; i++) if (b.idx[i] > max) max = b.idx[i];
  return { ok: true, w: b.w, h: b.h, colours: b.pal.length, used: used.size, whole: !b.cells, see0: b.pal[0] === 0, max };
}
/* a made-up palette strip: n cells, a blob in each (or none), a few colours, some partly see-through, and two
   see-through entries with colours of their own */
function made(n, fw, fh, seed, { empty = [], full = false, stride = 0 } = {}) {
  const r = rng(seed);
  const w = n * fw, st = stride || w;
  const idx = new Uint8Array(st * fh);
  const N = 40, rgb = new Uint8Array(N * 3), alpha = new Uint8Array(N).fill(255);
  for (let k = 0; k < N; k++) { rgb[k * 3] = Math.floor(r() * 256); rgb[k * 3 + 1] = Math.floor(r() * 256); rgb[k * 3 + 2] = Math.floor(r() * 256); }
  alpha[0] = 0; alpha[7] = 0; rgb[21] = 200;            /* two see-through entries, one with a colour of its own */
  alpha[5] = 90; alpha[6] = 200;                        /* partly see-through */
  rgb[30 * 3] = rgb[31 * 3]; rgb[30 * 3 + 1] = rgb[31 * 3 + 1]; rgb[30 * 3 + 2] = rgb[31 * 3 + 2];   /* one colour listed twice */
  for (let i = 0; i < n; i++) {
    if (empty.includes(i)) { if (i % 2) for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) idx[y * st + i * fw + x] = 7; continue; }
    const x0 = full ? 0 : Math.floor(r() * fw * 0.5), y0 = full ? 0 : Math.floor(r() * fh * 0.5);
    const cw = full ? fw : 6 + Math.floor(r() * (fw - x0 - 6)), ch = full ? fh : 6 + Math.floor(r() * (fh - y0 - 6));
    for (let y = y0; y < y0 + ch; y++) for (let x = x0; x < x0 + cw; x++) idx[y * st + i * fw + x] = 1 + Math.floor(r() * 34);
  }
  return { w, h: fh, stride: st, idx, rgb, alpha, n: N };
}

/* 1 */
{
  let bad = null, count = 0, packedN = 0;
  for (const [n, fw, fh, seed, opt] of [[14, 64, 64, 1, {}], [28, 32, 48, 2, { empty: [0, 5, 27] }], [5, 128, 96, 3, {}], [1, 64, 64, 5, {}], [20, 40, 40, 6, { empty: [3, 4] }], [9, 48, 48, 7, { stride: 9 * 48 + 3 }]]) {
    const r = same(made(n, fw, fh, seed, opt), fw, fh, n);
    count++;
    if (r.ok && !r.whole) packedN++;
    if (!r.ok || !r.see0 || r.max !== r.colours - 1 || r.used > r.colours) bad = bad || { n, fw, fh, seed, r };
  }
  check(`1. ${count} made-up strips from their numbers (${packedN} packed, the rest whole): the page's packer's own cells and layout, and every pixel the colour its file gives it`, !bad && count === 6 && packedN >= 3, bad || { packedN });
  const d = made(6, 64, 64, 11, { empty: [1] });
  const p = packStripNumbers(d, 64, 64, 6);
  const listed = new Set(p.pal), usedInFile = new Set();
  for (let i = 0; i < d.idx.length; i++) { const k = d.idx[i]; if (d.alpha[k]) usedInFile.add((d.rgb[k * 3] | (d.rgb[k * 3 + 1] << 8) | (d.rgb[k * 3 + 2] << 16) | (d.alpha[k] << 24)) >>> 0); }
  check('1b. only the colours the strip uses are listed, each once (one colour listed twice in the file is one), see-through first', p.pal[0] === 0 && listed.size === p.pal.length && p.pal.length === usedInFile.size + 1 && [...usedInFile].every((c) => listed.has(c)), { pal: p.pal.length, used: usedInFile.size });
  check('1c. a see-through entry is see-through whatever colour the file gives it (an empty cell full of one is a blank cell)', p.cells[1].blank === true && d.rgb[21] === 200);
  const f = made(4, 64, 64, 12, { full: true });
  const w = same(f, 64, 64, 4);
  check('1d. art that fills its cells is not worth packing: the strip comes whole, its numbers the same pixels', w.ok && w.whole && w.w === 256 && w.h === 64, w);
  check('1e. not a strip of such frames: nothing', packStripNumbers(made(3, 64, 64, 13), 64, 128, 3) === null && packStripNumbers(made(3, 64, 64, 13), 64, 64, 4) === null && packStripNumbers(null, 64, 64, 1) === null);
  const part = packStripNumbers(made(8, 64, 64, 14), 64, 64, 0);
  check('1f. the frame count is the file\'s own when none is given', !!part && part.n === 8);
}

/* 2 */
const MON = join(ROOT, 'public/sprites/monsters');
{
  const fg = await decodePng8(readFileSync(join(MON, 'fire-goblin/attack-n.png')), inflate, 1);
  const r = fg ? same(fg, 256, 256, Math.floor(fg.w / 256)) : { ok: false };
  check(`2. the fire goblin's attack, facing north: packed from its numbers to ${r.w} x ${r.h} (the phone's own reading, mp-stripgentle: 1360 x 256), ${r.colours} colours, pixel for pixel the page's way`, r.ok && !r.whole && r.w === 1360 && r.h === 256, r);
  const wf = await decodePng8(readFileSync(join(MON, 'water-frog/death.png')), inflate, 1);
  const r2 = wf ? same(wf, 256, 256, Math.floor(wf.w / 256)) : { ok: false };
  check('2b. the water frog\'s death, whose art fills its cells: whole, as the page\'s packer leaves it (v2.3.4359)', r2.ok && r2.whole, r2);
  let n = 0, bad = null;
  for (const f of walk(join(MON, 'fire-goblin')).filter((x) => /(walk|attack|hit)-[a-z]+\.png$|death\.png$/.test(x))) {
    const d = await decodePng8(readFileSync(f), inflate, 1);
    const rr = d ? same(d, 256, 256, Math.floor(d.w / 256)) : { ok: false };
    n++;
    if (!rr.ok) bad = bad || { f: relative(ROOT, f), rr };
  }
  check(`2c. every one of the fire goblin's ${n} strips of frames`, !bad && n >= 14, bad);
  /* the eight snowman strips put on 256 colours in this version (128 x 128 frames): readable, and packed the page's way */
  let sn = 0, sbad = null, colours = new Set();
  for (const name of ['snowman-attack-e', 'snowman-attack-n', 'snowman-attack-ne', 'snowman-attack-s', 'snowman-attack-sw', 'snowman-burrow', 'snowman-emerge', 'snowman-pile']) {
    const d = await decodePng8(readFileSync(join(MON, 'snowman', name + '.png')), inflate, 1);
    const rr = d ? same(d, 128, 128, Math.floor(d.w / 128)) : { ok: false, why: 'not a palette PNG' };
    sn++;
    if (!rr.ok) sbad = sbad || { name, rr };
    if (d) for (let k = 0; k < d.n; k++) colours.add((d.rgb[k * 3] | (d.rgb[k * 3 + 1] << 8) | (d.rgb[k * 3 + 2] << 16) | (d.alpha[k] << 24)) >>> 0);
  }
  check(`2d. the snowman's ${sn} strips converted in this version: each read as its numbers and packed, and all eight on ONE list of colours (${colours.size}: one row of the bundle's)`, !sbad && sn === 8 && colours.size <= 256, sbad || colours.size);
}

/* 3: A */
{
  /* NOT strips of frames, and not this door's: an effect's picture Pixi's own loader loads whole.  Their 256-colour
     twins are the effects' own switch (p256.js, v2.3.3728: measured, off by default).  This list only SHRINKS. */
  const NOT_YET = new Set(['snowman/impact.png', 'snowman/snowball.png']);
  const files = walk(MON).filter((f) => /\.png$/.test(f));
  const notPalette = [], listedButFine = [];
  for (const f of files) {
    const rel = relative(MON, f).split('\\').join('/');
    const okFile = !!readPng8Chunks(readFileSync(f));
    if (!okFile && !NOT_YET.has(rel)) notPalette.push(rel);
    if (okFile && NOT_YET.has(rel)) listedButFine.push(rel);
  }
  check(`3. every one of the ${files.length} monster pictures is a 256-colour file the reader can read (8 bits a pixel, a list of colours, not interlaced).  A new one that is not: put it on 256 colours with tools/art/strip256.mjs (--shared for a monster's strips together)`,
    notPalette.length === 0 && files.length >= 80, notPalette);
  check('3b. the two left are still as listed (one converted comes OFF the list here)', listedButFine.length === 0 && NOT_YET.size === 2, listedButFine);
  const others = walk(MON).filter((f) => !/\.png$/.test(f));
  check('3c. nothing but PNG files there (a twin in another format would dodge this suite)', others.length === 0, others.map((f) => relative(MON, f)));
}

/* 4: B */
{
  const zt = src('src/rendering/zoneTextures.js');
  const door = zt.slice(zt.indexOf('export function loadTrackedStrip'), zt.indexOf('function _stripByImage'));
  check('4. the door reads the file\'s own numbers off the page\'s thread FIRST, wherever pictures are held as numbers', /if \(stripReadOn\(\) && picNumbersOn\(\) && !\(typeof window !== 'undefined' && window\.__btPicNumVerify === true\)\) \{\s*return readStrip\(url, fw, fh\)\.then\(\(m\) => \{/.test(door));
  check('4b. ...what the reader cannot read is unpacked on the page, as before; a zone left meanwhile keeps nothing', /if \(!m\) return _stripByImage\(bundle, url, fw, fh, gen\);/.test(door) && /if \(\(_gen\.get\(bundle\) \|\| 0\) !== gen\) return \[\];/.test(door)
    && /return _stripByImage\(bundle, url, fw, fh, gen\);\s*\}\s*$/.test(door.slice(0, door.indexOf('/* ═══ v2.3.4470: THE SAME STRIP IN ANOTHER COLOUR'))));
  check('4c. ...in play, one strip\'s texture a slice, in the same line as the strips unpacked gently', /if \(stripFrameMs\(\) > 0\) return _inLine\(async \(\) => \{ await stripTurn\(\); return _stripOfNumbers\(bundle, url, fw, fh, gen, m\); \}\);/.test(door));
  check('4d. ...and its numbers go on the bundle\'s row of colours with no canvas at all', /const numSrc = stripAsNumbers\(bundle, null, url, \{ w: m\.w, h: m\.h, idx: m\.idx, pal: m\.pal \}\);/.test(door)
    && /if \(!picNumbersOn\(\) \|\| \(!canvas && !read\)\) return null;/.test(src('src/rendering/picsNumbers.js')));
  const wk = src('src/rendering/png8Worker.js');
  check('4e. the worker reads the strip as its numbers and packs them there', /if \(m\.strip\) \{/.test(wk) && /decodePng8\(new Uint8Array\(await pr\.arrayBuffer\(\)\), undefined, 1\)/.test(wk) && /const out = packStripNumbers\(dec, m\.fw, m\.fh, m\.n \|\| 0\);/.test(wk)
    && /\[out\.idx\.buffer, out\.pal\.buffer\]/.test(wk));
  const sp = src('src/rendering/stripPack.js');
  const imports = sp.match(/^import .*$/gm) || [];
  check('4f. the packer of numbers has no canvas and no import but the packer\'s rules (so a worker and node can run it)', imports.length === 1 && /from '\.\/trimRules\.js'/.test(imports[0]) && !/document|canvas\.|getContext|window\./.test(sp.replace(/\/\*[\s\S]*?\*\//g, '')));
  const sr = src('src/rendering/stripRead.js');
  check('4g. one strip is asked for at a time (a strip\'s unpacked bytes sit on the worker\'s side meanwhile), the worker is let go when idle, and `?stripworker=0` is the page\'s way', /const p = _line\.then\(job, job\);/.test(sr) && /IDLE_MS/.test(sr) && /stripworker=\(0\|off\|false\)/.test(sr));
  /* every module that draws a monster from strips of frames comes through the door */
  const mods = readdirSync(join(ROOT, 'src/rendering')).filter((f) => /Sprites\.js$/.test(f));
  const loose = [];
  for (const f of mods) {
    const t = src('src/rendering/' + f);
    if (!/\/sprites\/monsters\//.test(t)) continue;
    /* a strip of frames is sliced by a frame count: Rectangle(i * w ...) on a picture it loaded itself is a strip
       brought in round the door */
    if (!/loadTrackedStrip\(/.test(t) && /new Rectangle\(\s*i \* /.test(t) && f !== 'slimeSprites.js') loose.push(f);
  }
  check('4h. every monster drawn from strips of frames loads them through the door (the slime\'s are the game\'s own art, loaded behind the first loading screen)', loose.length === 0, loose);
}

/* 5: C */
{
  /* The page's own packers.  They are right for a picture MADE on the device (a look's baked body, a dressed
     shirt, a stand-in in a player's colours) and for the door's own fallback.  They are wrong for art that only has
     to be LOADED while the world is in play: that is read off the page's thread (stripRead.js).  A new caller here
     is a new job on the page's thread: route it through loadTrackedStrip, or add it to this list in the same change
     with the reason it cannot be. */
  const ALLOWED = {
    'packTrimmed(': ['src/rendering/gearSheets.js', 'src/rendering/lookPaletteProbe.js', 'src/rendering/playerSkins.js', 'src/rendering/systems/effectsRenderer.js', 'src/rendering/systems/entityRenderer.js', 'src/rendering/zoneTextures.js'],
    'packTrimmedSliced(': ['src/rendering/gearSheets.js', 'src/rendering/zoneTextures.js'],
    'stripAsNumbers(': ['src/rendering/p256.js', 'src/rendering/picsNumbers.js', 'src/rendering/zoneTextures.js'],
    'numbersOf(': ['src/rendering/heldNumbers.js', 'src/rendering/picsNumbers.js', 'src/rendering/zoneTextures.js'],
    'numbersOfSliced(': ['src/rendering/heldNumbers.js', 'src/rendering/zoneTextures.js'],
  };
  const all = walk(join(ROOT, 'src')).filter((f) => /\.(js|jsx)$/.test(f));
  const text = new Map(all.map((f) => [relative(ROOT, f).split('\\').join('/'), readFileSync(f, 'utf8')]));
  for (const [fn, allowed] of Object.entries(ALLOWED)) {
    const callers = [...text.entries()].filter(([, t]) => t.includes(fn)).map(([f]) => f).sort();
    const fresh = callers.filter((f) => !allowed.includes(f)), gone = allowed.filter((f) => !callers.includes(f));
    check(`5. ${fn.slice(0, -1)}: its ${callers.length} callers are the known ones.  A NEW caller unpacks a picture on the page's thread: art that loads in play goes through loadTrackedStrip (read off the page's thread)`, fresh.length === 0, { fresh });
    check(`5b. ...and a caller that is gone comes off the list (${fn.slice(0, -1)})`, gone.length === 0, { gone });
  }
}

/* 6 */
{
  const c = src('CLAUDE.md');
  check('6. CLAUDE.md carries the rule and its checklist row', /strip-door/.test(c) && /loadTrackedStrip/.test(c) && /256-colour/.test(c));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
