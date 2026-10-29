/* ═══ v2.3.3751: THE SHIRT DRESSED ON THE GRAPHICS CHIP (the look palette's shirt part) ═══
 *
 * A plain tee is one shared sheet and a sprite tint, and always was.  A tee
 * with a PATTERN or a PRINT was a copy of every sheet it is seen in, per
 * player (gearSheets.getShirtLookFrame -> playerDecal.composeShirt).  Where the
 * pattern and the print land is the white sheet's alone (each frame's chest
 * box, the lit fabric's centroid), so tools/art/shirt-bake.mjs bakes it once
 * (public/sprites/look/shirt/) and the chip paints the look's tint, tile and
 * drawing as it draws (lookPalette.js).  This file is the part both sides
 * share: what a look's row holds for its shirt, and shirtTexel, the shader's
 * arithmetic in JavaScript (the bake checks itself with it against
 * composeShirt; the GLSL in lookPalette.js is its line-for-line twin).
 *
 * THE ROW (paletteTex.js's atlas, 256 entries of RGBA; entries 8-31 are the
 * shirt's, docs/specs/look-palette.md):
 *   8          the tint (r, g, b, 255), or 0: the white sheet as drawn
 *   9          the pattern's colour (r, g, b, 255), or 0: no pattern
 *   10         the pattern's tile: (w, h, cell, 0)
 *   11-12      its ink, a bit a tile cell (cell i: byte i >> 3, bit i & 7)
 *   13         (0, 0, 0, 255) when there is a print
 *   16-31      the drawing's palette (playerArt ART_PALETTE; 16 is see-through)
 *   PRINT_AT.. the drawing, 4 bits a cell (cell i = y x 16 + x: byte i >> 1,
 *              the low nibble the even cell), 32 entries
 * The order composeShirt paints in is the order here: tint, pattern, print.
 */
import { ART_PALETTE, ART_W, ART_H, isValidArt, artHasInk } from './traits/playerArt.js';

export const SHIRT_E = Object.freeze({ TINT: 8, PAT: 9, TILE: 10, INK: 11, PRINT: 13, PAL: 16, ART: 128 });
/* the tee's frame width, the mirror's axis (the bake refuses a sheet of any
   other, so a resized sheet fails loudly rather than mirroring off-centre) */
export const SHIRT_FW = 128;
/* a tile's ink is two entries, 64 bits: a bigger tile is drawn the old way */
export const SHIRT_TILE_MAX = 64;
const HEX = '0123456789abcdef';
const rgbOf = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

/** The shirt's entries of a look's row, into `row` (a 1024-byte Uint8Array, or
 *  a new one).  `pattern` is patternCatalog.parsePattern's; `art` the side's
 *  drawing (already the front or the back), or null. */
export function shirtRowEntries(tint, pattern, art, row) {
  const r = row || new Uint8Array(1024);
  const put = (e, v) => r.set(v, e * 4);
  if (tint) put(SHIRT_E.TINT, [tint[0], tint[1], tint[2], 255]);
  if (pattern && pattern.tile) {
    const t = pattern.tile;
    put(SHIRT_E.PAT, [...rgbOf(pattern.color), 255]);
    put(SHIRT_E.TILE, [t.w, t.h, Math.max(1, t.cell), 0]);
    for (let i = 0; i < t.w * t.h && i < SHIRT_TILE_MAX; i++) {
      if (t.cells.charCodeAt(i) === 49) r[SHIRT_E.INK * 4 + (i >> 3)] |= 1 << (i & 7);
    }
  }
  if (art && isValidArt(art) && artHasInk(art)) {
    put(SHIRT_E.PRINT, [0, 0, 0, 255]);
    for (let i = 1; i < 16; i++) if (ART_PALETTE[i]) put(SHIRT_E.PAL + i, [...rgbOf(ART_PALETTE[i]), 255]);
    for (let i = 0; i < ART_W * ART_H; i++) {
      const v = HEX.indexOf(art[i]);
      r[SHIRT_E.ART * 4 + (i >> 1)] |= (v & 15) << ((i & 1) * 4);
    }
  }
  return r;
}

/** The canvas's 'multiply' of an opaque fill over an opaque pixel (composeShirt's
 *  tint), one channel. */
export function mulTint(t, c) { return Math.round(t * c / 255); }

/** Frame `f`'s number `k` of a shirt sheet's table (after its colours, five
 *  entries a frame, two 16-bit numbers an entry): 0-3 its packed cell (ax, ay,
 *  tx, ty), 4-5 its pattern anchor, 6-9 its print box (x, y, w, h). */
export function shirtFrameNum(sh, f, k) {
  const o = (sh.ends[1] + f * 5 + (k >> 1)) * 4 + (k & 1) * 2;
  return sh.table[o] | (sh.table[o + 1] << 8);
}

/**
 * One texel of a shirt sheet in a look, premultiplied, 0..255 as the old path's
 * canvas kept it: the shader's arithmetic.  `sh` { table, ends, fw }, `v` the
 * texel's 16-bit number (its colour number + 256 x (its frame + 1)), (X, Y) its
 * place in the packed sheet, `mirror` a facing drawn flipped (the print and the
 * tile read pre-flipped, as composeShirt bakes them).
 */
export function shirtTexel(sh, row, v, X, Y, mirror) {
  const n = v & 255, fr = v >> 8;
  if (!n) return [0, 0, 0, 0];
  const o = n * 4;
  let c = [sh.table[o], sh.table[o + 1], sh.table[o + 2]];
  let alpha = sh.table[o + 3];
  const E = (e, k) => row[e * 4 + k];
  if (E(SHIRT_E.TINT, 3)) c = [0, 1, 2].map((k) => mulTint(E(SHIRT_E.TINT, k), c[k]));
  const lit = n >= sh.ends[0];
  if (lit && fr > 0) {
    const F = (k) => shirtFrameNum(sh, fr - 1, k);
    const fx = X - F(0) + F(2), fy = Y - F(1) + F(3);
    if (E(SHIRT_E.PAT, 3)) {
      const tw0 = E(SHIRT_E.TILE, 0), th0 = E(SHIRT_E.TILE, 1), cell = E(SHIRT_E.TILE, 2);
      const tw = tw0 * cell, th = th0 * cell;
      const sx = mirror ? SHIRT_FW - 1 - fx : fx;
      const ax = mirror ? SHIRT_FW - 1 - F(4) : F(4);
      const tx = Math.floor((((sx - ax) % tw) + tw) % tw / cell);
      const ty = Math.floor((((fy - F(5)) % th) + th) % th / cell);
      const i = ty * tw0 + tx;
      if ((E(SHIRT_E.INK + (i >> 5), (i >> 3) & 3) >> (i & 7)) & 1) c = [E(SHIRT_E.PAT, 0), E(SHIRT_E.PAT, 1), E(SHIRT_E.PAT, 2)];
    }
    const dw = F(8), dh = F(9);
    if (E(SHIRT_E.PRINT, 3) && dw > 0) {
      const gx = cellOf(fx, F(6), dw / ART_W), gy = cellOf(fy, F(7), dh / ART_H);
      if (gx >= 0 && gy >= 0) {
        const ci = gy * ART_W + (mirror ? ART_W - 1 - gx : gx);
        const p = (row[SHIRT_E.ART * 4 + (ci >> 1)] >> ((ci & 1) * 4)) & 15;
        if (p > 0 && E(SHIRT_E.PAL + p, 3)) { c = [E(SHIRT_E.PAL + p, 0), E(SHIRT_E.PAL + p, 1), E(SHIRT_E.PAL + p, 2)]; alpha = 255; }
      }
    }
  }
  return [Math.round(c[0] * alpha / 255), Math.round(c[1] * alpha / 255), Math.round(c[2] * alpha / 255), alpha];
}
/* stampShirtArt's cell edges: cell g runs [round(o + g w), round(o + (g + 1) w)) */
export function cellOf(x, o, w) {
  let g = Math.floor((x - o) / w);
  if (g > 0 && x < Math.round(o + g * w)) g--;
  else if (g < 15 && x >= Math.round(o + (g + 1) * w)) g++;
  if (g < 0 || g > 15 || x < Math.round(o + g * w) || x >= Math.round(o + (g + 1) * w)) return -1;
  return g;
}

/* ═══ THE SHADER'S SHIRT (lookPalette.js's per-kind hook: registerLookKind
   ('shirt', SHIRT_GLSL), given each texel's 16-bit number and its place) ═══
   shirtTexel above, line for line.  Uses the program's own readers: fetchT /
   tpos (the sheet's table), rowT (the look's row, 0..255), sE (the role ends:
   sE[0] the fabric the pattern and print never touch ends, sE[1] the colours
   end and the frames' numbers begin) and sMirror (the draw's mirror bit).  GLSL's % is undefined on a negative operand, so the
   tile's phase is floored by hand. */
export const SHIRT_GLSL = `
highp int shirtF(highp int f, highp int k)
{
    highp vec2 v = floor(fetchT(tpos(2 * (sE[1] + f * 5 + k / 2) + k % 2)).rg * 255.0 + 0.5);
    return int(v.x) + 256 * int(v.y);
}
highp int shirtEdge(highp int o, highp int g, highp float w)
{
    return int(floor(float(o) + float(g) * w + 0.5));
}
highp int shirtCell(highp int x, highp int o, highp float w)
{
    highp int g = int(floor(float(x - o) / w));
    if (g > 0 && x < shirtEdge(o, g, w)) g--;
    else if (g < 15 && x >= shirtEdge(o, g + 1, w)) g++;
    if (g < 0 || g > 15 || x < shirtEdge(o, g, w) || x >= shirtEdge(o, g + 1, w)) return -1;
    return g;
}
highp int shirtByte(highp int e, highp int b)
{
    return int(rowT(e + b / 4)[b % 4]);
}
highp int shirtMod(highp int m, highp int t)
{
    return m - t * int(floor(float(m) / float(t)));
}
highp vec4 lookKind_shirt(highp int v, highp ivec2 q)
{
    bool mirror = sMirror;
    highp int n = v % 256;
    highp int fr = v / 256;
    if (n == 0) return vec4(0.0);
    highp vec4 c = floor(vec4(fetchT(tpos(2 * n)).rg, fetchT(tpos(2 * n + 1)).rg) * 255.0 + 0.5);
    highp float alpha = c.a;
    highp vec4 T = rowT(${SHIRT_E.TINT});
    if (T.a > 0.5) c.rgb = floor(T.rgb * c.rgb / 255.0 + 0.5);
    if (n >= sE[0] && fr > 0) {
        highp int f = fr - 1;
        highp int fx = q.x - shirtF(f, 0) + shirtF(f, 2);
        highp int fy = q.y - shirtF(f, 1) + shirtF(f, 3);
        highp vec4 P = rowT(${SHIRT_E.PAT});
        if (P.a > 0.5) {
            highp vec4 tl = rowT(${SHIRT_E.TILE});
            highp int tw0 = int(tl.r), th0 = int(tl.g), cell = int(tl.b);
            highp int ax = shirtF(f, 4);
            highp int sx = mirror ? ${SHIRT_FW - 1} - fx : fx;
            if (mirror) ax = ${SHIRT_FW - 1} - ax;
            highp int tx = shirtMod(sx - ax, tw0 * cell) / cell;
            highp int ty = shirtMod(fy - shirtF(f, 5), th0 * cell) / cell;
            highp int i = ty * tw0 + tx;
            if (((shirtByte(${SHIRT_E.INK}, i / 8) >> (i % 8)) & 1) == 1) c.rgb = P.rgb;
        }
        highp int dw = shirtF(f, 8), dh = shirtF(f, 9);
        if (rowT(${SHIRT_E.PRINT}).a > 0.5 && dw > 0) {
            highp int gx = shirtCell(fx, shirtF(f, 6), float(dw) / 16.0);
            highp int gy = shirtCell(fy, shirtF(f, 7), float(dh) / 16.0);
            if (gx >= 0 && gy >= 0) {
                highp int ci = gy * 16 + (mirror ? 15 - gx : gx);
                highp int p = (shirtByte(${SHIRT_E.ART}, ci / 2) >> ((ci % 2) * 4)) & 15;
                highp vec4 A = rowT(${SHIRT_E.PAL} + p);
                if (p > 0 && A.a > 0.5) { c.rgb = A.rgb; alpha = 255.0; }
            }
        }
    }
    return vec4(floor(c.rgb * alpha / 255.0 + 0.5), alpha);
}
`;
