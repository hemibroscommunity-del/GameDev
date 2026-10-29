#!/usr/bin/env node
/* ═══ v2.3.3776: THE SKATEBOARD, CUT FROM THE OWNER'S PICTURE ═══
 *
 *   node tools/art/cut-skateboard.mjs [--dry]
 *
 * The owner, 2026-10-28: "I just added a skateboard to the root."  The picture
 * (kept in assets/prop-source/skateboard/skateboard-views.png, so this can be
 * run again) is three views of one board on a black ground: from above (the
 * long side up and down), angled three-quarters (the nose down and right),
 * and from the side.
 *
 * Each becomes a game sprite, public/sprites/ride/skateboard-{top,angled,
 * side}.png, by the Object Studio's own pixel steps (public/tools/style/
 * process.js: ownPalette, mapPixels -- hard alpha, the picture's own colours,
 * despeckled), and src/data/skateboardArt.js (GENERATED) says how each sits.
 *
 *   THE BLACK GROUND is cut by a FLOOD FROM THE BORDER: every near-black pixel
 *   joined to the picture's edge through near-black pixels.  Never a global
 *   black key -- the deck itself is near-black, and inside its orange rim it
 *   stays.
 *   THE THREE VIEWS are found by the empty columns between them, left to
 *   right, and refused unless there are exactly three.
 *   THE SIZE: the art law's 2 picture px a game px (public/tools/style/
 *   bible.js PIXEL.gamePxPerArtPx), the board LONG_GAME_PX long
 *   (one scale for the three, from the side view, the longest), shrunk by
 *   averaging only, never blown up.  A bro is ~110 world px tall, his boots
 *   52 below his middle (entityRenderer figureFeetY).
 *   COLOURS: 32, the picture's own (well under the 256 law).
 *
 * --dry writes to a scratch folder instead.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { decodePNG } from '../world/png.mjs';
import { ownPalette, mapPixels } from '../../public/tools/style/process.js';
import { encodePalettePng } from '../../public/tools/world/core/png8.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(REPO, 'assets/prop-source/skateboard/skateboard-views.png');
const DRY = process.argv.includes('--dry');
const OUT = DRY ? fs.mkdtempSync(path.join(os.tmpdir(), 'board-')) : path.join(REPO, 'public/sprites/ride');
const DATA = DRY ? path.join(OUT, 'skateboardArt.js') : path.join(REPO, 'src/data/skateboardArt.js');

const LONG_GAME_PX = 88;      /* the board's length, game px: about four fifths of a bro (v2.3.3776: 70 read small under him) */
const ART_PER_GAME = 2;       /* bible.js PIXEL.gamePxPerArtPx */
const BLACK_MAX = 34;         /* a pixel this dark on every channel is ground, if the flood reaches it */
const COLOURS = 32;
const NAMES = ['top', 'angled', 'side'];

const src = decodePNG(fs.readFileSync(SRC));
const { width: W, height: H } = src;
const d = src.data;

/* 1. the flood from the border: the black ground goes */
const dark = (i) => d[i * 4] <= BLACK_MAX && d[i * 4 + 1] <= BLACK_MAX && d[i * 4 + 2] <= BLACK_MAX;
const ground = new Uint8Array(W * H);
const stack = [];
const seed = (x, y) => { const i = y * W + x; if (!ground[i] && dark(i)) { ground[i] = 1; stack.push(i); } };
for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
while (stack.length) {
  const i = stack.pop(), x = i % W, y = (i - x) / W;
  if (x > 0) seed(x - 1, y);
  if (x < W - 1) seed(x + 1, y);
  if (y > 0) seed(x, y - 1);
  if (y < H - 1) seed(x, y + 1);
}
for (let i = 0; i < W * H; i++) if (ground[i]) d[i * 4 + 3] = 0;

/* 2. the three views, by the empty columns between them */
const colFull = new Uint8Array(W);
for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (!ground[y * W + x]) { colFull[x] = 1; break; }
const runs = [];
for (let x = 0; x < W;) {
  if (!colFull[x]) { x++; continue; }
  const x0 = x;
  while (x < W && colFull[x]) x++;
  runs.push([x0, x]);
}
/* specks: a run narrower than 2% of the picture joins nothing and is dropped */
const views = runs.filter(([a, b]) => b - a > W * 0.02);
if (views.length !== 3) throw new Error(`cut-skateboard: found ${views.length} views (want 3): ${JSON.stringify(runs)}`);
const boxes = views.map(([x0, x1]) => {
  let y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) if (!ground[y * W + x]) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, x1, y0, y1: y1 + 1 };
});

/* 3. one scale for the three: the side view's length is LONG_GAME_PX */
const side = boxes[2];
const k = (LONG_GAME_PX * ART_PER_GAME) / (side.x1 - side.x0);
if (!(k < 1)) throw new Error('cut-skateboard: the picture is smaller than the sprite -- it would be blown up');

/* an average of the solid pixels under each new one; solid where at least
   half was */
function shrink(b) {
  const sw = b.x1 - b.x0, sh = b.y1 - b.y0;
  const w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy0 = b.y0 + Math.floor(y * sh / h), sy1 = Math.max(sy0 + 1, b.y0 + Math.floor((y + 1) * sh / h));
    for (let x = 0; x < w; x++) {
      const sx0 = b.x0 + Math.floor(x * sw / w), sx1 = Math.max(sx0 + 1, b.x0 + Math.floor((x + 1) * sw / w));
      let r = 0, g = 0, bl = 0, n = 0, all = 0;
      for (let yy = sy0; yy < sy1; yy++) for (let xx = sx0; xx < sx1; xx++) {
        all++;
        const i = (yy * W + xx) * 4;
        if (d[i + 3] === 0) continue;
        r += d[i]; g += d[i + 1]; bl += d[i + 2]; n++;
      }
      const o = (y * w + x) * 4;
      if (n * 2 >= all && n > 0) { out[o] = r / n; out[o + 1] = g / n; out[o + 2] = bl / n; out[o + 3] = 255; }
    }
  }
  return { w, h, data: out };
}

fs.mkdirSync(OUT, { recursive: true });
const meta = {};
for (let v = 0; v < 3; v++) {
  const s = shrink(boxes[v]);
  const pal = ownPalette(s.data, s.w, s.h, COLOURS);
  mapPixels(s.data, s.w, s.h, pal);
  const png = await encodePalettePng(s.data, s.w, s.h, { clear: true });
  if (!png) throw new Error('cut-skateboard: no palette PNG (needs CompressionStream, Node 18+)');
  const file = `skateboard-${NAMES[v]}.png`;
  fs.writeFileSync(path.join(OUT, file), Buffer.from(png));
  /* the deck's top line in the side and angled views: the first row from the
     top with a solid run a third of the width long (the wheels hang below
     it); the top view stands on its middle */
  let deckTop = 0;
  for (let y = 0; y < s.h; y++) {
    let solid = 0;
    for (let x = 0; x < s.w; x++) if (s.data[(y * s.w + x) * 4 + 3]) solid++;
    if (solid >= s.w / 3) { deckTop = y; break; }
  }
  meta[NAMES[v]] = { file, w: s.w, h: s.h, deckTop };
  console.log(`  ${file}: ${s.w} x ${s.h} art px, ${pal.length} colours, ${png.length} bytes, deck top ${deckTop}`);
}

const js = `/* GENERATED by tools/art/cut-skateboard.mjs (v2.3.3776) -- do not edit by hand.
   The owner's skateboard, three views at ${ART_PER_GAME} picture px a game px, the board
   ${LONG_GAME_PX} game px long (rendering/rideFx.js draws it under a rider's feet). */
export const SKATEBOARD_ART = ${JSON.stringify({ artPerGame: ART_PER_GAME, longGamePx: LONG_GAME_PX, views: meta }, null, 2)};
`;
fs.writeFileSync(DATA, js);
console.log(`wrote ${Object.keys(meta).length} pictures to ${path.relative(REPO, OUT) || OUT} and ${path.relative(REPO, DATA)}`);
