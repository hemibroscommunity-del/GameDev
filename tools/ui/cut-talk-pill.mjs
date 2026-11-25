#!/usr/bin/env node
/* ═══ v2.3.6552: THE OWNER'S TALK PILL, CUT (card CT part 19) ═══
 *
 *   node tools/ui/cut-talk-pill.mjs            write the pill
 *   node tools/ui/cut-talk-pill.mjs --dry      say what it would write
 *   node tools/ui/cut-talk-pill.mjs --png F    and the picture as a file F (to look at)
 *
 * The owner, 2026-11-25, with a picture: "Your talk button is intrusive use
 * the left icon I attached here instead (ignore the right one)."  The left
 * icon, cropped by the orchestrator (assets/icons-source/owner-2026-11-25/
 * talk-icon-owner.png, 320 x 235, kept byte for byte): a dark slate pill, a
 * gold rim, a cream speech bubble with three dots.  It is the TALK button
 * under a townsperson in the two buttons (`?manual=5`;
 * src/ui/panels/ContextButton.jsx), drawn CTX_TALK_W x CTX_TALK_H CSS px
 * (src/game/contextButton.js).
 *
 * The art step, then the asset door's four (tools/assets/finish.mjs, the
 * way strip256.mjs and npc256.mjs re-make their own families):
 *   1. DECODE the upload (finish.mjs readRgba: ffmpeg, no colour management).
 *      Its ground is already see-through; what is left outside the rim is the
 *      picture's soft drop shadow (alpha 135 and under, under the pill).
 *   2. CUT THE SHADOW: alpha under SHADOW_A goes, alpha over SOLID_A is solid,
 *      a short ramp between (the rim's own anti-aliased edge, alpha 240 and
 *      over, stays whole: a clean edge on any ground).  Cropped to what is left.
 *   3. SCALE to 3 x the drawn size (an iPhone's 3 device pixels a point), on
 *      premultiplied colour so a see-through pixel's colour never bleeds into
 *      the rim (cut-owner-icons.py resize's rule), by area: every source pixel
 *      counts by how much of it falls in the cell.
 *   4. THE DOOR: on COLOURS colours (quant256.js reduce256, the door's own
 *      colour step: under the law's 256), a palette PNG (encodePng), read
 *      back through the game's own reader (verifyPng).
 *   5. WRITTEN AS A DATA ADDRESS into src/data/talkPill.js (GENERATED: never
 *      by hand): the picture rides IN the page's script, nothing to fetch,
 *      ever, so nothing loads on first use (PRELOADING IS LAW);
 *      controlsPreload.js decodes it on the loading screen with the
 *      controls' other pictures.  A module, not an imported .png: Vite would
 *      inline one under 4 kB, but the guards that bundle the screens with
 *      esbuild (traps-fight, traps-join-identity) have no loader for a
 *      picture, and node reads a module as it is.
 * COLOURS is 48, not 256: on 256 the PNG is 7.9 kB, on 48 3.4 kB (4.5 kB as
 * text), and the two side by side at 3 x zoom show no difference (the mean
 * OKLab move 0.0052 -> 0.0117).  context-button.test holds its size.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRgba, encodePng, verifyPng } from '../assets/finish.mjs';
import { reduce256 } from '../../public/tools/style/quant256.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SOURCE = 'assets/icons-source/owner-2026-11-25/talk-icon-owner.png';
export const OUT = 'src/data/talkPill.js';
/** the drawn size (CSS px) and the device pixels a CSS px (an iPhone's 3) */
export const DRAWN_W = 44;
export const DPR = 3;
/** its colours (see the header: 48 keeps it inline) */
export const COLOURS = 48;
const SHADOW_A = 160, SOLID_A = 228;

/** step 2: the shadow out, the body solid, cropped to what is left */
export function cutShadow({ w, h, d }) {
  const o = new Uint8Array(d.length);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, a = d[i + 3];
    const k = a <= SHADOW_A ? 0 : a >= SOLID_A ? 255 : Math.round(255 * (a - SHADOW_A) / (SOLID_A - SHADOW_A));
    if (!k) continue;
    o[i] = d[i]; o[i + 1] = d[i + 1]; o[i + 2] = d[i + 2]; o[i + 3] = k;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, c = new Uint8Array(cw * ch * 4);
  for (let y = 0; y < ch; y++) c.set(o.subarray(((y + y0) * w + x0) * 4, ((y + y0) * w + x1 + 1) * 4), y * cw * 4);
  return { w: cw, h: ch, d: c };
}

/** step 3: by area, on premultiplied colour */
export function scaleArea({ w, h, d }, W, H) {
  const out = new Uint8Array(W * H * 4), sx = w / W, sy = h / H;
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const fx0 = X * sx, fx1 = fx0 + sx, fy0 = Y * sy, fy1 = fy0 + sy;
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let y = Math.floor(fy0); y < Math.ceil(fy1); y++) {
      const wy = Math.min(fy1, y + 1) - Math.max(fy0, y);
      for (let x = Math.floor(fx0); x < Math.ceil(fx1); x++) {
        const wx = Math.min(fx1, x + 1) - Math.max(fx0, x), k = wx * wy, i = (y * w + x) * 4, al = d[i + 3] / 255;
        r += d[i] * al * k; g += d[i + 1] * al * k; b += d[i + 2] * al * k; a += al * k; n += k;
      }
    }
    const o = (Y * W + X) * 4, A = a / n;
    if (A > 0) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
    out[o + 3] = Math.round(A * 255);
  }
  return { w: W, h: H, d: out };
}

async function main(argv) {
  const dry = argv.includes('--dry');
  const at = argv.indexOf('--png');
  const pngOut = at >= 0 ? argv[at + 1] : null;
  const out = path.join(REPO, OUT);
  const src = path.join(REPO, SOURCE);
  const cut = cutShadow(readRgba(src));
  const W = DRAWN_W * DPR, H = Math.round(W * cut.h / cut.w);
  const pic = scaleArea(cut, W, H);
  const r = reduce256(pic.d, W, H, { max: COLOURS });
  const png = await encodePng(r.idx, r.pal, W, H);
  await verifyPng(png, r.idx, r.pal, W, H, out);
  console.log(`${SOURCE} (cut ${cut.w}x${cut.h}) -> ${path.relative(REPO, out)}: ${W}x${H}, ${r.n} colours${r.exact ? '' : `, moved ${r.err.toFixed(4)}`}, ${png.length} bytes${dry ? ' (dry)' : ''}`);
  if (dry) return;
  const uri = 'data:image/png;base64,' + png.toString('base64');
  fs.writeFileSync(out, `/* GENERATED by tools/ui/cut-talk-pill.mjs (v2.3.6552, card CT part 19): never by hand.
   The owner's TALK pill (${SOURCE}), ${W} x ${H} on ${r.n} colours, ${png.length} bytes, as a data address:
   it rides in the script (ui/panels/controlSkin.jsx TALK_PILL_URL; decoded on the loading screen). */
export const TALK_PILL_W = ${W};
export const TALK_PILL_H = ${H};
export const TALK_PILL_DATA = '${uri}';
`);
  /* read back from the disk: the module's address gives exactly the picture */
  const back = (await import(out + '?' + Date.now())).TALK_PILL_DATA;
  await verifyPng(Buffer.from(back.slice(back.indexOf(',') + 1), 'base64'), r.idx, r.pal, W, H, out);
  if (pngOut) fs.writeFileSync(pngOut, png);
}

if (import.meta.url === `file://${process.argv[1]}`) await main(process.argv.slice(2));
