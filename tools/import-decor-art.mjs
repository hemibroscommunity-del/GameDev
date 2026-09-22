/* IMPORT ENVIRONMENT DECOR ART A GENERATOR PRODUCED  (v2.3.2649).
 *
 *   node tools/import-decor-art.mjs <in.png...> [--long=512] [--world=N]
 *                                   [--out=dir] [--name=id] [--report]
 *
 * Sibling of tools/import-building-art.mjs, which does the same three things
 * for the buildings the owner sends.  This one exists because DECOR is sized
 * by its LONG EDGE rather than its height -- a snowbank or a cliff lip is
 * wider than it is tall, and `--h=512` on a 2:1 ridge silently produces a
 * 1024-wide texture, which is four times the RGBA of the 512 that was asked
 * for.  That is precisely the mistake this tool is here to stop.
 *
 * ═══ WHY THE BUDGET IS IN DECODED RGBA AND NOT IN KILOBYTES ═══
 * Every asset brief written for this game so far has asked for a "file size
 * goal", and file size is the wrong number.  What an iPhone runs out of is
 * DECODED texture: width x height x 4 bytes, the same figure whether the art
 * is a flat silhouette or densely painted.  The repo has the receipt --
 * fire-goblin is 1.9MB as PNG and 60.5MB as RGBA (zoneTextures.js), which is
 * why file sizes never made the +92MB texture drift of v2.3.2272 look like a
 * problem while it was happening.  So `--report` prints RGBA, loudly, and
 * "don't over-texture" is not a lever this tool offers: only DIMENSIONS are.
 *
 * ═══ THE THREE THINGS THAT MUST HAPPEN, ALL GOT WRONG HERE BEFORE ═══
 * (Carried over from import-building-art.mjs -- see its header for the
 * incidents.  Restated rather than cross-referenced because a reader who
 * reaches for this file will not necessarily open that one.)
 *
 * 1. TRIM TO THE ALPHA BBOX.  worldProps places a prop by `worldH` and a
 *    bottom-centre anchor, so empty canvas under the art floats the prop
 *    above the ground and reads as the wrong size.  Generators export onto a
 *    big square canvas as a matter of course; 1254x1254 is the usual one.
 *
 * 2. RESIZE PREMULTIPLIED.  Averaging straight RGBA lets transparent black
 *    bleed into every antialiased edge and leaves a dark halo round the
 *    silhouette (v2.3.2626, the auction-house roofline).  Snow on a blue
 *    sky-tinted edge is the worst case there is for this.
 *
 * 3. ENCODE WITH ADAPTIVE ROW FILTERS.  tools/png.mjs writes filter None on
 *    every row, which on painted art costs MORE bytes than the source
 *    (v2.3.2627: a 2.4MB painting came back 3.3MB).  Per-row selection by the
 *    spec's minimum-sum-of-absolute-differences heuristic gets it back under.
 *
 * ═══ AND ONE THING THIS TOOL CHECKS THAT THAT ONE DOES NOT ═══
 * Whether the art is FREE-STANDING or CROPPED.  An asset whose ink runs off
 * its own canvas edge has no ground-contact line, and the renderer has
 * nowhere to put it: WORLD_PROPS positions everything by where it touches the
 * world (depthSort.js), and there is no screen-space foreground layer in
 * WORLD_LAYER_NAMES to hang an edge-cropped framing piece on.  Three of the
 * first four frost overlays generated for this game were edge-cropped, so
 * this is reported per file rather than left to be discovered at placement
 * time.  See docs/ART-ASSET-PHASES.md.
 */
import zlib from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { basename, join, extname } from 'node:path';
import { decode } from './png.mjs';

const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const SRCS = args.filter((a) => !a.startsWith('--'));
const LONG = +arg('long', '512');
const WORLD = arg('world', null) ? +arg('world', '0') : null;
const OUTDIR = arg('out', null);
const NAME = arg('name', null);
const REPORT = args.includes('--report');

if (!SRCS.length) {
  console.error('usage: node tools/import-decor-art.mjs <in.png...> [--long=512] [--world=N] [--out=dir] [--name=id] [--report]');
  process.exit(1);
}
if (OUTDIR && !REPORT) mkdirSync(OUTDIR, { recursive: true });

const MB = (w, h) => (w * h * 4) / 1048576;

/* Alpha threshold 8, matching tools/qa/art/* and import-building-art: a soft
   edge still counts as art, a stray 1-alpha pixel does not. */
const A_MIN = 8;

function analyze(sw, sh, sd) {
  let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    if (sd[(y * sw + x) * 4 + 3] > A_MIN) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  /* Edge contact: what FRACTION of each canvas edge row/column carries ink.
     A couple of stray pixels is noise (a generator's antialiasing against the
     canvas bound); a meaningful run means the subject is cut off there. */
  const frac = (pts) => pts.filter(Boolean).length / pts.length;
  const row = (y) => { const o = []; for (let x = 0; x < sw; x++) o.push(sd[(y * sw + x) * 4 + 3] > A_MIN); return o; };
  const col = (x) => { const o = []; for (let y = 0; y < sh; y++) o.push(sd[(y * sw + x) * 4 + 3] > A_MIN); return o; };
  const edges = { top: frac(row(0)), bottom: frac(row(sh - 1)), left: frac(col(0)), right: frac(col(sw - 1)) };
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  /* Base width: how much of the bbox's width carries ink in its bottom 5% of
     rows.  A free-standing prop sits on a base; a cropped canopy tapers to a
     stem or is cut off flat by the canvas. */
  const bandTop = Math.max(y0, y1 - Math.max(1, Math.round(bh * 0.05)));
  let base = 0;
  for (let x = x0; x <= x1; x++) {
    for (let y = bandTop; y <= y1; y++) if (sd[(y * sw + x) * 4 + 3] > A_MIN) { base++; break; }
  }
  return { x0, y0, x1, y1, bw, bh, edges, base };
}

/* The premultiplied box downscale (lesson 2). */
function resize(sw, sh, sd, box, dw, dh) {
  const { x0, y0, bw, bh } = box;
  const rgba = new Uint8Array(dw * dh * 4);
  for (let dy = 0; dy < dh; dy++) {
    const sy0 = y0 + Math.floor((dy * bh) / dh);
    const sy1 = y0 + Math.max(Math.floor((dy * bh) / dh) + 1, Math.floor(((dy + 1) * bh) / dh));
    for (let dx = 0; dx < dw; dx++) {
      const sx0 = x0 + Math.floor((dx * bw) / dw);
      const sx1 = x0 + Math.max(Math.floor((dx * bw) / dw) + 1, Math.floor(((dx + 1) * bw) / dw));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
        const i = (y * sw + x) * 4, A = sd[i + 3];
        r += sd[i] * A; g += sd[i + 1] * A; b += sd[i + 2] * A; a += A; n++;
      }
      const o = (dy * dw + dx) * 4, A = a / n;
      rgba[o + 3] = Math.round(A);
      /* un-premultiply; a fully transparent cell keeps colour 0 and never
         contributes to anything drawn. */
      if (a > 0) { rgba[o] = Math.round(r / a); rgba[o + 1] = Math.round(g / a); rgba[o + 2] = Math.round(b / a); }
    }
  }
  return rgba;
}

/* The encode, with per-row filter selection (lesson 3). */
const TBL = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (buf) => { let c = -1; for (let i = 0; i < buf.length; i++) c = TBL[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };

function encodePng(dw, dh, rgba) {
  const BPP = 4, stride = dw * BPP;
  const out = Buffer.alloc((stride + 1) * dh);
  const prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  const cand = [0, 1, 2, 3, 4].map(() => new Uint8Array(stride));
  for (let y = 0; y < dh; y++) {
    cur.set(rgba.subarray(y * stride, (y + 1) * stride));
    for (let x = 0; x < stride; x++) {
      const a = x >= BPP ? cur[x - BPP] : 0, b = prev[x], c = x >= BPP ? prev[x - BPP] : 0;
      cand[0][x] = cur[x];
      cand[1][x] = (cur[x] - a) & 255;
      cand[2][x] = (cur[x] - b) & 255;
      cand[3][x] = (cur[x] - ((a + b) >> 1)) & 255;
      cand[4][x] = (cur[x] - paeth(a, b, c)) & 255;
    }
    let best = 0, bestScore = Infinity;
    for (let f = 0; f < 5; f++) {
      let s = 0; for (let x = 0; x < stride; x++) { const v = cand[f][x]; s += v < 128 ? v : 256 - v; }
      if (s < bestScore) { bestScore = s; best = f; }
    }
    out[y * (stride + 1)] = best;
    Buffer.from(cand[best]).copy(out, y * (stride + 1) + 1);
    prev.set(cur);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(dw, 0); ihdr.writeUInt32BE(dh, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(out, { level: 9, memLevel: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

let failed = 0;
for (const SRC of SRCS) {
  const raw = readFileSync(SRC);
  const { width: sw, height: sh, data: sd } = decode(raw);
  const box = analyze(sw, sh, sd);
  if (!box) { console.error(`${SRC}: fully transparent`); failed++; continue; }
  const { bw, bh, edges, base } = box;

  /* Scale by the LONG edge -- the whole reason this tool is not the building
     importer.  Never upscale: a generator that exported small did so once, and
     enlarging invents detail while paying full RGBA for it. */
  const scale = Math.min(1, LONG / Math.max(bw, bh));
  const dw = Math.max(1, Math.round(bw * scale));
  const dh = Math.max(1, Math.round(bh * scale));

  /* The free-standing test.  0.02 of an edge is the noise floor; above that
     the subject is genuinely cut off by its own canvas. */
  const cut = Object.entries(edges).filter(([, f]) => f > 0.02).map(([k, f]) => `${k} ${(f * 100).toFixed(0)}%`);
  const baseFrac = base / bw;
  const standing = cut.length === 0;

  const name = NAME || basename(SRC, extname(SRC));
  console.log(`── ${name}`);
  console.log(`   source      ${sw}x${sh}  ${(raw.length / 1024).toFixed(0)}KB disk  ${MB(sw, sh).toFixed(2)}MB RGBA`);
  console.log(`   alpha bbox  ${bw}x${bh}   (${(100 - (bw * bh) / (sw * sh) * 100).toFixed(0)}% of the canvas is empty)`);
  console.log(`   output      ${dw}x${dh}  ${MB(dw, dh).toFixed(2)}MB RGBA   ${scale < 1 ? `${(1 / scale).toFixed(1)}x smaller, ${(MB(sw, sh) / MB(dw, dh)).toFixed(1)}x less RGBA` : 'no downscale needed'}`);
  console.log(`   ground line ${standing ? `FREE-STANDING, base is ${(baseFrac * 100).toFixed(0)}% of its width` : `CROPPED by its own canvas (${cut.join(', ')}) -- no ground-contact line`}`);
  if (!standing) {
    console.log(`               -> not placeable as a WORLD_PROPS prop; needs the foreground`);
    console.log(`                  layer that does not exist yet (DEPTH-ROADMAP item 5).`);
  }
  if (WORLD) {
    /* ═══ v2.3.2650: THE FIRST VERSION OF THIS WARNING WAS WRONG ═══
       It reasoned from REF_VIEW_W = 390 * WORLD_ZOOM(3.0) = 1170 world px and
       warned past 1.5x, which understated the requirement by about 2.5x.
       REF_VIEW_W is a TARGET a combat zone never reaches: worldViewport()
       floors the scale per zone (v2.3.2247) so a map smaller than the viewport
       is never ringed with empty tray, and a 32x32 zone is only 1024 world px
       deep against a tall phone -- so the HEIGHT term wins and the zone zooms
       IN.  Evaluated for frost, every modern iPhone lands at ~472 visible
       world px and 2.5-2.7 DEVICE px per world px.  So ~2-2.5x world is the
       target and 3x is where nothing further is resolved. */
    const worldW = Math.round(WORLD * (bw / bh));
    const ratio = Math.max(dw, dh) / Math.max(WORLD, worldW);
    const note = ratio > 3 ? '  <-- OVER-RESOLVED, no iPhone can show this much'
      : ratio < 1.2 ? '  <-- UNDER-RESOLVED, it will look soft'
      : '';
    console.log(`   at worldH ${WORLD}  the prop draws ${worldW}x${WORLD} world px; texture is ${ratio.toFixed(2)}x its world size (want 2-2.5x)${note}`);
    console.log(`   suggested   worldH: ${WORLD}, blockW: ${Math.round(worldW * 0.8)}, blockD: ${Math.round(WORLD * 0.35)}   (tune blockD on the art's own base)`);
  }

  if (!REPORT) {
    const png = encodePng(dw, dh, resize(sw, sh, sd, box, dw, dh));
    const out = join(OUTDIR || '.', `${name}.png`);
    writeFileSync(out, png);
    console.log(`   wrote       ${out}  ${(png.length / 1024).toFixed(0)}KB  (source was ${(raw.length / 1024).toFixed(0)}KB)`);
  }
  console.log('');
}
process.exit(failed ? 1 : 0);
