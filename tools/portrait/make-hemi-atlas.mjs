#!/usr/bin/env node
/* ═══ v2.3.3957: THE HEMI BROS ATLAS, AND THE TOWNSFOLK'S BUSTS AS A FIXTURE ═══
 *
 *   node tools/portrait/make-hemi-atlas.mjs           write them
 *   node tools/portrait/make-hemi-atlas.mjs --check   say whether they are current
 *
 * Your portrait is a Hemi Bro (docs/specs/hemi-portrait.md): the game stacks
 * a 32 x 32 bust from the collection's trait layers in the page
 * (src/rendering/hemiBust.js).  The layers it needs -- every trait a look can
 * name (src/rendering/hemiLook.js) and every one the townsfolk's busts use
 * (tools/portrait/hemiNpcRecipes.mjs) -- ship as ONE picture:
 *
 *   public/portrait/hemi-bros-atlas.png   32 x 32 a layer, 8 a row, a palette
 *                                         PNG on 256 colours at most (the
 *                                         memory law; public/tools/style/
 *                                         quant256.js, as every new picture)
 *   src/rendering/hemiAtlasIndex.js       GENERATED: the layers' order, the
 *                                         collection's backgrounds, the URL
 *
 * The layers are read from assets/portrait-source/hemi-bros/ (made once from
 * the collection's catalogue by tools/qa/nft_portraits.py extract).  Past 256
 * colours (the 61 layers hold about 400, most of them the WebP's smear of one
 * colour) the reducer moves a colour a few levels at most; the test holds the
 * busts built from the atlas to the Python tool's own tolerance, and the
 * compositor itself to the busts pixel for pixel on the source layers.
 *
 *   server/test/fixtures/hemi-npc-busts.png   the townsfolk's baked busts
 *                                         (public/sprites/npc/<head>.webp, read
 *                                         with ffmpeg), 32 x 32 each, a row,
 *                                         in NPC_BUSTS order: what the test
 *                                         compares the compositor with
 *
 * Re-run it when a trait layer, the mapping's trait list or a townsperson's
 * bust changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { reduce256, toRgba } from '../../public/tools/style/quant256.js';
import { encodeIndexedPng } from '../../public/tools/world/core/png8.js';
import { readPngRgba, writePngRgb } from './pngRgba.mjs';
import { hemiLayerNames } from '../../src/rendering/hemiLook.js';
import { NPC_BUSTS, npcLayerNames } from './hemiNpcRecipes.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(REPO, 'assets/portrait-source/hemi-bros');
const ATLAS = path.join(REPO, 'public/portrait/hemi-bros-atlas.png');
const INDEX = path.join(REPO, 'src/rendering/hemiAtlasIndex.js');
const FIXTURE = path.join(REPO, 'server/test/fixtures/hemi-npc-busts.png');
const VERSION = '2.3.3957';
const COLS = 8, CELL = 32, SCALE = 6;
const CHECK = process.argv.includes('--check');

export function atlasLayerNames() {
  const s = new Set([...hemiLayerNames(), ...npcLayerNames()]);
  /* the bro first, then by name: a stable order, so a re-run moves nothing */
  return ['bro', ...[...s].filter((n) => n !== 'bro').sort()];
}

function readWebpRgba(file) {
  const dims = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0', file]).toString().trim().split(',').map(Number);
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 26 });
  return { w: dims[0], h: dims[1], data: new Uint8Array(raw.buffer, raw.byteOffset, raw.length) };
}

/* ═══ 256 COLOURS, THE ONES THE RULES READ KEPT EXACTLY ═══
   The compositor reads some colours as KEYS, not as paint: the bro's skin
   family (recoloured by brightness only within 24 of it), the tee's main fill
   (every shirt cell's light is measured against it), the outline (kept by
   every ramp), the logos painted out (within 12 of their ink).  A reducer
   free to move them moved the bro's darkest shade out of the family (his
   chin stayed orange on a brown bro) and the tee's fill 29 levels (every
   shirt a shade off).  So the layers whose colours are all keys (the bro,
   the tee, the beard, the eyes), every colour within 12 of the outline and
   of a logo's ink, keep their exact colours; quant256.js puts the rest on
   what is left of the 256. */
const KEY_LAYERS = new Set(['bro', 'yellowshirt', 'beard', 'normaleyes', 'sleepyeyes', 'wtfeyes', 'happyeyes', 'suseyes']);
const KEY_INKS = [[31, 13, 27], [238, 230, 234], [255, 255, 255]];

function quantise(rgba, W, H, names) {
  const keyOf = (i) => ((rgba[i] << 24) | (rgba[i + 1] << 16) | (rgba[i + 2] << 8) | rgba[i + 3]) >>> 0;
  const anchors = new Map();
  const rest = new Uint8Array(rgba);
  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    if (!rgba[i + 3]) continue;
    const layer = names[Math.floor(p / W / CELL) * COLS + Math.floor((p % W) / CELL)];
    const ink = KEY_INKS.some((c) => Math.abs(rgba[i] - c[0]) + Math.abs(rgba[i + 1] - c[1]) + Math.abs(rgba[i + 2] - c[2]) <= 12);
    if (KEY_LAYERS.has(layer) || ink) {
      if (!anchors.has(keyOf(i))) anchors.set(keyOf(i), anchors.size + 1);
      rest[i + 3] = 0;
    }
  }
  const q = reduce256(rest, W, H, { max: 256 - anchors.size });
  const n = 1 + anchors.size + (q.n - 1);
  if (n > 256) throw new Error('the atlas is on ' + n + ' colours');
  const pal = new Uint8Array(n * 4);
  for (const [k, at] of anchors) { pal[at * 4] = k >>> 24; pal[at * 4 + 1] = (k >>> 16) & 255; pal[at * 4 + 2] = (k >>> 8) & 255; pal[at * 4 + 3] = k & 255; }
  pal.set(q.pal.subarray(4, q.n * 4), (1 + anchors.size) * 4);
  const idx = new Uint8Array(W * H);
  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    if (!rgba[i + 3]) continue;
    idx[p] = anchors.has(keyOf(i)) && !rest[i + 3] ? anchors.get(keyOf(i)) : (q.idx[p] ? q.idx[p] + anchors.size : 0);
  }
  return { idx, pal, n, err: q.err };
}

async function build() {
  const names = atlasLayerNames();
  const rows = Math.ceil(names.length / COLS);
  const W = COLS * CELL, H = rows * CELL;
  const rgba = new Uint8Array(W * H * 4);
  names.forEach((n, k) => {
    const f = path.join(SRC, n + '.png');
    if (!fs.existsSync(f)) throw new Error('no trait layer ' + f);
    const p = readPngRgba(fs.readFileSync(f));
    if (p.w !== CELL || p.h !== CELL) throw new Error(n + ': ' + p.w + 'x' + p.h + ', not 32 x 32');
    const ox = (k % COLS) * CELL, oy = Math.floor(k / COLS) * CELL;
    for (let y = 0; y < CELL; y++) rgba.set(p.data.subarray(y * CELL * 4, (y + 1) * CELL * 4), ((oy + y) * W + ox) * 4);
  });
  const r = quantise(rgba, W, H, names);
  const back = toRgba(r.idx, r.pal);
  const png = await encodeIndexedPng(r.idx, r.pal, W, H);
  if (!png) throw new Error('no CompressionStream here');

  const bgs = JSON.parse(fs.readFileSync(path.join(SRC, 'backgrounds.json'), 'utf8'));
  const index = `/* GENERATED by tools/portrait/make-hemi-atlas.mjs (v${VERSION}): never by hand.
 * The Hemi Bros atlas (public/portrait/hemi-bros-atlas.png): the collection's
 * trait layers, ${CELL} x ${CELL} each, ${COLS} a row, in LAYERS order, on ${r.n} colours;
 * and the collection's flat backgrounds (backgrounds.json).  No imports. */
export const HEMI_ATLAS = Object.freeze({
  url: '/portrait/hemi-bros-atlas.png?v=${VERSION}',
  cols: ${COLS},
  cell: ${CELL},
  width: ${W},
  height: ${H},
  colours: ${r.n},
  layers: Object.freeze(${JSON.stringify(names)}),
  backgrounds: Object.freeze(${JSON.stringify(bgs)}),
});
`;

  /* the townsfolk's busts, read back to their 32 x 32 pixels: every 6 x 6
     block one colour, or the file is not what the bake writes */
  const FW = NPC_BUSTS.length * CELL;
  const fix = new Uint8Array(FW * CELL * 4);
  NPC_BUSTS.forEach(([head], k) => {
    const im = readWebpRgba(path.join(REPO, 'public/sprites/npc', head + '.webp'));
    if (im.w !== CELL * SCALE || im.h !== CELL * SCALE) throw new Error(head + ': not 192 x 192');
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const s = ((y * SCALE) * im.w + x * SCALE) * 4;
        for (let dy = 0; dy < SCALE; dy++) {
          for (let dx = 0; dx < SCALE; dx++) {
            const q = ((y * SCALE + dy) * im.w + x * SCALE + dx) * 4;
            for (let c = 0; c < 3; c++) if (im.data[q + c] !== im.data[s + c]) throw new Error(head + ': pixel ' + x + ',' + y + ' is not one flat block');
          }
        }
        const o = (y * FW + k * CELL + x) * 4;
        fix[o] = im.data[s]; fix[o + 1] = im.data[s + 1]; fix[o + 2] = im.data[s + 2]; fix[o + 3] = 255;
      }
    }
  });
  return { png, index, fixture: writePngRgb(fix, FW, CELL), colours: r.n, err: r.err, names, back, W, H, src: rgba };
}

const out = await build();
const same = (f, bytes) => fs.existsSync(f) && Buffer.compare(fs.readFileSync(f), Buffer.from(bytes)) === 0;
if (CHECK) {
  const stale = [[ATLAS, out.png], [INDEX, out.index], [FIXTURE, out.fixture]].filter(([f, b]) => !same(f, typeof b === 'string' ? Buffer.from(b) : b)).map(([f]) => path.relative(REPO, f));
  if (stale.length) { console.log('STALE (re-run node tools/portrait/make-hemi-atlas.mjs):', stale.join(', ')); process.exit(1); }
  console.log('hemi atlas, index and fixture are current');
} else {
  fs.mkdirSync(path.dirname(ATLAS), { recursive: true });
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(ATLAS, out.png);
  fs.writeFileSync(INDEX, out.index);
  fs.writeFileSync(FIXTURE, out.fixture);
  let worst = 0;
  for (let i = 0; i < out.src.length; i += 4) {
    if (!out.src[i + 3] && !out.back[i + 3]) continue;
    worst = Math.max(worst, Math.abs(out.src[i] - out.back[i]) + Math.abs(out.src[i + 1] - out.back[i + 1]) + Math.abs(out.src[i + 2] - out.back[i + 2]) + Math.abs(out.src[i + 3] - out.back[i + 3]));
  }
  console.log(`wrote ${path.relative(REPO, ATLAS)} (${out.W} x ${out.H}, ${out.names.length} layers, ${out.colours} colours, ${out.png.length} bytes; worst pixel moved ${worst} levels in all)`);
  console.log(`wrote ${path.relative(REPO, INDEX)} and ${path.relative(REPO, FIXTURE)} (${NPC_BUSTS.length} busts, ${out.fixture.length} bytes)`);
}
