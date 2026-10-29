#!/usr/bin/env node
/* ═══ v2.3.3716: THE BODY'S PIXELS, EACH GIVEN ITS ROLE, ONCE, OFFLINE ═══
 *
 * The owner: "The game needs to be extremely memory efficient."  Today every
 * look (a skin, trousers, boots, an eye colour) gets its own recoloured copy of
 * the body's sheets (playerSkins.js recolorBodyToCanvas), so the memory grows
 * with every look on screen.  The look-palette path (src/rendering/
 * lookPalette.js, `?lookpalette`) keeps each sheet ONCE, as colour numbers,
 * and colours it on the graphics chip as it is drawn: a look is one row of
 * role colours.  This tool makes those numbers.
 *
 * WHAT IT WRITES, beside the player sheets (public/sprites/look/, not inside
 * public/sprites/player/: that folder belongs to optimize-assets.yml, which
 * would mint a .webp twin of every file -- these are read as exact numbers and
 * have no use for one):
 *   <pose>-<dir>.png   rows [0, h): one colour NUMBER a texel (red = its low
 *                      byte, green = its high byte, alpha 255; alpha 0 is
 *                      number 0, see-through), laid out exactly as the old
 *                      path's packed sheet (gearSheets.packTrimmed's cells,
 *                      at twice their size for a ds 2 sheet);
 *                      rows [h, h + tableRows): the sheet's colour TABLE, two
 *                      pixels an entry, (r, g, 0, 255) then (b, a, 0, 255): the
 *                      art's own colour, straight, as recolorBodyToCanvas read
 *                      it.  Every pixel is opaque, so a browser decodes it
 *                      exactly (no premultiplying).
 *   roles.json         per sheet: its scale (ds 1: one number a display texel,
 *                      the jog sheets; ds 2: one a source pixel, four to a
 *                      display texel, the stand sheets), its frames' cells,
 *                      and where each ROLE's entries end in its table (the
 *                      table is sorted by role).
 *
 * THE ROLES are decided by the GAME'S OWN RECOLOUR, never re-implemented here:
 * this runs recolorBodyToCanvas itself (the Vite dev server serves the game's
 * modules, rooted at src/, to a Chromium page) with three probe looks whose colours no art
 * pixel has, then asks of every pixel which rule explains what came out:
 *   0 keep   the art's colour, whatever the look (outline, eye white, ...)
 *   1 skin   _retint(art, skin target, SKIN_REF)
 *   2 pants  _retint(art, trousers target, PANTS_REF)
 *   3 boots  _retint(art, boots target, SHOES_REF)
 *   4-7      an iris pixel (EYE_MASK): the eye colour when one is picked, and
 *            otherwise roles 0-3 as above (the eye is painted after the retint)
 * so the garment bands, the eye creams, the trouser judge and every other rule
 * in the bake are in the numbers exactly as they run.  A pixel no rule explains
 * is counted (`unexplained`) and the bake FAILS: the numbers must reproduce the
 * old path, or the path must not ship.
 *
 * Then it checks itself: three real looks are drawn from the numbers the way
 * the graphics chip will draw them (premultiplied, the stand's 2x2 box) and
 * compared with the old path's own display canvases.  mp-lookpalette is the
 * real oracle, on the chip; this only stops a bad bake being written.
 *
 *   node tools/art/role-bake.mjs            (writes public/sprites/look/)
 *   node tools/art/role-bake.mjs --check    (bakes, compares with what is on disk)
 *   node tools/art/role-bake.mjs --hashes   (no browser: were the numbers baked
 *                                           from these sheets and this code?)
 *
 * Re-run it when a stand or jog sheet, playerSkins.js's recolour, garmentConfine,
 * the eye masks or DISPLAY_DS change: precheck's `look-roles` runs --hashes
 * (a sheet changed: FAIL; the code: WARN, since most edits to playerSkins.js
 * leave the roles as they were -- a --check says whether this one did).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { encode, decode } from '../png.mjs';
import { cutPerRole } from './lookCut.mjs';   /* v2.3.3750: the one 8-bit cut (P4's module, error-bounded) */

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(REPO, 'public/sprites/look');
const PORT = Number(process.env.ROLE_BAKE_PORT || 5197);
const CHECK = process.argv.includes('--check');
/* v2.3.3750: the 8-bit cut's bar -- the worst colour of a sheet within this
   many levels a channel of the 16-bit truth, in any look (the orchestrator's
   line for the owner's "I won't notice at all from anything at 256") */
const CUT_BAR = Number(process.env.ROLE_BAKE_BAR || 16);
/* ROLE_BAKE_PROBE=jog-east:948,53 -- one display texel's story, for debugging a bake */
const PROBE_AT = process.env.ROLE_BAKE_PROBE ? ((m) => [m[1], [Number(m[2]), Number(m[3])]])(/^([a-z-]+):(\d+),(\d+)$/.exec(process.env.ROLE_BAKE_PROBE)) : null;

/* ── in the page: the set's module, and through it the game's own code ── */
async function pageMeta({ set }) {
  const S = (await import(`/rendering/lookSets/${set}.js`)).default;
  return { mip: S.mip !== false, kind: S.kind, bits: S.bits, refScale: S.refScale || 1, fw: S.fw || 128, fh: S.fh || 128, out: S.out || null, roleDefs: S.roleDefs,
    sheets: S.sheets, code: S.code || [], art: Object.fromEntries(S.sheets.map((k) => [k, S.art(k)])) };
}
async function pageBake({ set, sheet, bits, probeAt, bar, cutSrc }) {
  const CUT_BAR = bar;   /* v2.3.3750: the 8-bit cut's worst colour, in levels */
  const S = (await import(`/rendering/lookSets/${set}.js`)).default;
  const GS = await import('/rendering/gearSheets.js');
  /* v2.3.3757: a set whose sheets differ in frame size (the stand-ins) says so per sheet */
  const fr0 = S.frameOf ? S.frameOf(sheet) : null;
  const FW = (fr0 && fr0.fw) || S.fw || 128, FH = (fr0 && fr0.fh) || S.fh || 128;
  const RS = S.refScale || 1;   /* v2.3.3737: a role's ref in 1/RS's (P4's fractional refs) */
  const roles = S.roleDefs;   /* role r (1..R) is roles[r - 1] */
  const R = roles.length;
  const src = await S.source(sheet);
  const { d, W, H, frames } = src;
  const read = (cv) => {
    const c = cv.getContext ? cv : (() => { const k = document.createElement('canvas'); k.width = cv.width; k.height = cv.height; k.getContext('2d').drawImage(cv, 0, 0); return k; })();
    return c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  };
  const run = (T) => S.run(src, sheet, T);
  const disp = (full) => S.display(src, sheet, full);
  /* the probes: every entry a role uses, in colours no art pixel has; the
     third leaves out the entries of roles that fall back (`under`), so the
     role under them shows */
  const P1C = [[214, 48, 40], [40, 196, 52], [44, 64, 210], [251, 3, 247], [236, 200, 20], [20, 220, 230], [160, 30, 200], [250, 130, 10]];
  const P2C = [[60, 190, 200], [205, 70, 190], [200, 200, 40], [5, 249, 9], [30, 60, 120], [210, 40, 90], [90, 230, 120], [10, 120, 250]];
  const used = [...new Set(roles.map((ro) => ro.entry))];
  const P1 = {}, P2 = {}, P3 = {};
  used.forEach((e, i) => { P1[e] = P1C[i % P1C.length].map((v) => (v + 7 * Math.floor(i / P1C.length)) % 256); P2[e] = P2C[i % P2C.length].map((v) => (v + 11 * Math.floor(i / P2C.length)) % 256); });
  const fallsBack = new Set(roles.filter((ro) => ro.under).map((ro) => ro.entry));
  for (const e of used) if (!fallsBack.has(e)) P3[e] = P1[e];
  const f1 = read(run(P1)), f2 = read(run(P2)), f3 = read(run(P3));
  /* v2.3.3750: `keepFromDefault` (a set module's option) -- a KEPT pixel is
     what the bake leaves whatever the look, the default look's output: the
     art's own colour, or something the bake paints over it for everyone (the
     fishing rod's pine).  Without it, the art's colour, as before. */
  const kd = S.keepFromDefault ? read(run({})) : d;
  const recol = (i, T, ref) => {
    if (!ref) return T;
    const k = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / (ref / RS);
    return [Math.min(255, Math.round(T[0] * k)), Math.min(255, Math.round(T[1] * k)), Math.min(255, Math.round(T[2] * k))];
  };
  /* what role r makes of pixel i in look L -- lookPalette.js's entry(), in JS */
  const out = (i, r, L) => {
    if (!r) return [kd[i], kd[i + 1], kd[i + 2]];
    const ro = roles[r - 1], T = L[ro.entry];
    if (T) return recol(i, T, ro.ref);
    return ro.under ? out(i, ro.under, L) : [d[i], d[i + 1], d[i + 2]];
  };
  /* premultiplied, as the canvas keeps it: a see-through pixel's colour is
     only as exact as its alpha lets it be */
  const near = (o, i, rgb) => {
    const a = d[i + 3];
    for (let k = 0; k < 3; k++) if (Math.abs(o[i + k] * a / 255 - rgb[k] * a / 255) > 1.01) return false;
    return true;
  };
  const role = new Uint8Array(W * H);
  let unexplained = 0, ambiguous = 0;
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    if (d[i + 3] === 0) continue;   /* (see-through in the art: kept as the bake leaves it, below -- v2.3.3876) */
    const cand = [];
    for (let r = 0; r <= R; r++) {
      if (near(f1, i, out(i, r, P1)) && near(f2, i, out(i, r, P2)) && near(f3, i, out(i, r, P3))) cand.push(r);
    }
    if (!cand.length) { unexplained++; continue; }
    if (cand.length > 1 && cand[0] !== 0) ambiguous++;
    role[p] = cand[0];
  }
  /* the display: which pixels it shows, and (ds 1) which source pixel each is */
  const defDisp = disp(run({}));
  const dd = read(defDisp);
  const DW = defDisp.width, DH = defDisp.height;
  const ds = S.ds(src);
  /* v2.3.3757: a ds 1 display is the full bake halved (the body's jog: hx 2)
     or the full bake itself (the stand-ins, drawn at their own size: hx 1) */
  const hx = ds === 1 ? Math.round(W / DW) : 2;
  let ox = hx === 2 ? 1 : 0, oy = hx === 2 ? 1 : 0;
  if (ds === 1 && hx === 2) {
    /* the nearest pick's offset in its 2x2 block, read off a probe look */
    const p1d = read(disp(run(P1)));
    let best = -1;
    for (const [tx, ty] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      let n = 0;
      for (let y = 0; y < DH; y++) for (let x = 0; x < DW; x++) {
        const j = (y * DW + x) * 4, i = ((2 * y + ty) * W + 2 * x + tx) * 4;
        if (p1d[j + 3] && p1d[j] === f1[i] && p1d[j + 1] === f1[i + 1] && p1d[j + 2] === f1[i + 2]) n++;
      }
      if (n > best) { best = n; ox = tx; oy = ty; }
    }
  }
  /* the table: one entry per (role, colour), sorted by role; entry 0 is see-through */
  /* v2.3.3876: ...and its ALPHA the bake's too: the mining bake draws the
     pickaxe solid (toolWood.js solidTool), opaque where the art's stroke was
     see-through and out into the empty pixels round it for its outline */
  const keyOf = (p) => {
    const c = role[p] ? d : kd;   /* v2.3.3750: a kept entry's colour is the bake's (keepFromDefault) */
    return role[p] * 4294967296 + ((c[p * 4] << 24) >>> 0) + (c[p * 4 + 1] << 16) + (c[p * 4 + 2] << 8) + c[p * 4 + 3];
  };
  const keys = new Map();   /* key -> pixels */
  const nw = ds === 1 ? DW : W, nh = ds === 1 ? DH : H;
  const srcOf = new Int32Array(nw * nh).fill(-1);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    let p;
    if (ds === 1) {
      if (!dd[(y * DW + x) * 4 + 3]) continue;   /* see-through on the display (and the stripped specks) */
      p = (hx * y + oy) * W + hx * x + ox;
    } else p = y * W + x;
    if (!d[p * 4 + 3] && !kd[p * 4 + 3]) continue;   /* v2.3.3876: or drawn by the bake alone (the pickaxe's outline: kept) */
    srcOf[y * nw + x] = p;
    const k = keyOf(p);
    keys.set(k, (keys.get(k) || 0) + 1);
  }
  /* ═══ THE HALVING'S PICK ═══
     A jog sheet is drawn at twice its size (nearest), recoloured, and halved
     again (nearest): a display texel is ONE of its 2x2 block's pixels, and
     which one is the canvas's choice.  Measured in Chromium: a software canvas
     (this tool, and the QA phones: --disable-gpu) always takes the top-left;
     a canvas drawn on the graphics chip lands on the pixels' shared edge and
     takes one or another, unevenly across the sheet -- so on such a device the
     old path's own output differs, texel by texel, wherever a block's four
     pixels differ.  Those blocks are counted here (`split`): a few dozen a
     sheet, along a garment's edge, where the bake's band or the eye's box
     cuts a block. */
  let split = 0;
  if (ds === 1 && hx === 2) {
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      if (srcOf[y * nw + x] < 0) continue;
      const k0 = keyOf((2 * y) * W + 2 * x);
      if (keyOf((2 * y) * W + 2 * x + 1) !== k0 || keyOf((2 * y + 1) * W + 2 * x) !== k0 || keyOf((2 * y + 1) * W + 2 * x + 1) !== k0) split++;
    }
  }
  /* ═══ v2.3.3737: 8 BITS -- AT MOST 255 COLOURS, CHOSEN PER ROLE ═══
     The owner: "You can go ahead and reduce it. I won't notice at all from
     anything at 256."  v2.3.3750: the cut is tools/art/lookCut.mjs (one for
     every bake), bounded by its WORST colour, CUT_BAR levels as the screen
     shows it; a sheet it cannot hold to the bar stays 16-bit (below). */
  let mapKey = (k) => k;
  let quant = null;
  if (bits === 8) {
    /* tools/art/lookCut.mjs, the one cut every bake uses (passed in as source) */
    const cutPerRole = new Function('return ' + cutSrc)();
    const cut = cutPerRole(keys, 255, { roles, refScale: RS, bar: CUT_BAR });
    if (cut) {
      mapKey = (k) => cut.remap.get(k);
      keys.clear();
      for (const [k, n] of cut.keys) keys.set(k, n);
      quant = cut.quant;
    }
  }

  const sorted = [...keys.keys()].sort((a, b) => a - b);
  const cap = bits === 8 ? 256 : 65536;   /* numbers 0..255 (0 see-through) or 0..65535 */
  if (sorted.length + 1 > cap) throw new Error(sheet + ': ' + sorted.length + ' colours, over ' + bits + ' bits');
  const index = new Map();
  const table = new Uint8Array((sorted.length + 1) * 4);
  const count = new Array(16).fill(0);
  sorted.forEach((k, n) => {
    index.set(k, n + 1);
    const r = Math.floor(k / 4294967296), v = k - r * 4294967296;
    table.set([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255], (n + 1) * 4);
    count[r]++;
  });
  /* one past each role's last entry (entry 0, see-through, counts as keep) */
  const ends = [];
  for (let r = 0, e = 1; r <= R; r++) { e += count[r]; ends.push(e); }
  const strip = new Uint16Array(nw * nh);
  for (let q = 0; q < nw * nh; q++) if (srcOf[q] >= 0) strip[q] = index.get(mapKey(keyOf(srcOf[q])));
  /* the layout: the old path's packed sheet, cell for cell -- its crops are
     the display's (ds 2: each display texel's four numbers, at twice the
     crop), so every frame's quad is the old path's own */
  let cells, PW, PH, nums;
  const packed = GS.packTrimmed(defDisp, FW, FH, frames);
  if (packed) {
    cells = packed.cells.map((c) => [c.ax, c.ay, c.tx, c.ty, c.w, c.h, c.blank ? 1 : 0]);
    PW = packed.canvas.width * ds; PH = packed.canvas.height * ds;
    packed.canvas.width = 0; packed.canvas.height = 0;
    nums = new Uint16Array(PW * PH);
    packed.cells.forEach((c, f) => {
      if (c.blank) return;
      for (let y = 0; y < c.h * ds; y++) for (let x = 0; x < c.w * ds; x++) {
        nums[(c.ay * ds + y) * PW + c.ax * ds + x] = strip[(c.ty * ds + y) * nw + (f * FW + c.tx) * ds + x];
      }
    });
  } else {
    cells = Array.from({ length: frames }, (_, f) => [f * FW, 0, -1, -1, FW, FH, 0]);   /* tx -1: no trim */
    PW = nw; PH = nh; nums = strip;
  }
  /* ── the self-check: real looks, drawn from the numbers as the chip will,
     against the old path's own display canvases (an 8-bit sheet: how far its
     cut moved them, reported, not failed) ── */
  const LOOKC = [[61, 40, 28], [185, 58, 46], [222, 222, 228], [60, 110, 220], [249, 236, 226], [214, 112, 168], [190, 160, 110], [46, 56, 120], [40, 160, 70]];
  const LOOKS = [0, 1, 2].map((j) => { const L = {}; used.forEach((e, i) => { if ((i + j) % 3 !== 2) L[e] = LOOKC[(i * 2 + j) % LOOKC.length]; }); return L; });
  const colour = (n, L) => {
    if (!n) return [0, 0, 0, 0];
    let r = 0; while (r < R && n >= ends[r]) r++;
    const o = n * 4, a = table[o + 3];
    const c0 = [table[o], table[o + 1], table[o + 2]];
    const one = (rr) => {
      if (!rr) return c0;
      const ro = roles[rr - 1], T = L[ro.entry];
      if (T) {
        if (!ro.ref) return T;
        const k = (0.299 * c0[0] + 0.587 * c0[1] + 0.114 * c0[2]) / (ro.ref / RS);
        return [0, 1, 2].map((q) => Math.min(255, Math.round(T[q] * k)));
      }
      return ro.under ? one(ro.under) : c0;
    };
    const c = one(r);
    return [Math.round(c[0] * a / 255), Math.round(c[1] * a / 255), Math.round(c[2] * a / 255), a];
  };
  const check = { looks: LOOKS.length, texels: 0, over1: 0, max: 0, sum: 0 };
  const fickle = S.fickle ? S.fickle(src, sheet) : null;   /* v2.3.3750: full-size pixels, or null */
  for (const L of LOOKS) {
    const od = read(disp(run(L)));
    for (let y = 0; y < DH; y++) for (let x = 0; x < DW; x++) {
      const j = (y * DW + x) * 4;
      let want;
      if (ds === 1) want = colour(strip[y * nw + x], L);
      else {
        want = [0, 0, 0, 0];
        for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const c = colour(strip[(2 * y + b) * nw + 2 * x + a], L);
          for (let k = 0; k < 4; k++) want[k] += c[k];
        }
        /* the canvas's 'high' halving: the 2x2 box of the premultiplied
           bytes, truncated (measured in Chromium) */
        want = want.map((v) => Math.floor(v / 4));
      }
      const a = od[j + 3];
      const got = [od[j] * a / 255, od[j + 1] * a / 255, od[j + 2] * a / 255, a];
      let m = 0;
      for (let k = 0; k < 4; k++) m = Math.max(m, Math.abs(got[k] - want[k]));
      /* v2.3.3750: a pixel the set says the old bake colours by more than its
         role (`fickle`: the fish's rod key, re-tested after the retint) is
         counted apart, not held to the old path (an 8-bit sheet's: only past
         the cut's bar, which the cut itself is held to on every pixel) */
      if (fickle && m > (quant ? CUT_BAR : 1.5) && fickle[ds === 1 ? (hx * y + oy) * W + hx * x + ox : (2 * y) * W + 2 * x]) { check.fickle = (check.fickle || 0) + 1; continue; }
      check.texels++;
      check.sum += m;
      if (m > check.max) check.max = +m.toFixed(2);
      if (m > 1.5) check.over1++;
    }
  }
  check.mean = +(check.sum / Math.max(1, check.texels)).toFixed(3);
  delete check.sum;
  let probe = null;
  if (probeAt && probeAt[0] === sheet) {
    const [x, y] = probeAt[1];
    const blk = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => { const p = (2 * y + b) * W + 2 * x + a; return { a, b, d: Array.from(d.slice(p * 4, p * 4 + 4)), f1: Array.from(f1.slice(p * 4, p * 4 + 4)), role: role[p] }; });
    probe = { pick: [ox, oy], n: strip[y * nw + x], blk, dispDef: Array.from(dd.slice((y * DW + x) * 4, (y * DW + x) * 4 + 4)) };
  }
  const roleCount = new Array(R + 1).fill(0);
  for (let p = 0; p < role.length; p++) if (d[p * 4 + 3]) roleCount[role[p]]++;
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); };
  return {
    sheet, ds, frames, fw: FW, fh: FH, w: PW, h: PH, entries: sorted.length + 1, ends, cells,
    unexplained, ambiguous, pick: [ox, oy], split, check, probe, quant,
    counts: roleCount,
    nums: b64(new Uint8Array(nums.buffer, nums.byteOffset, nums.byteLength)), table: b64(table),
  };
}

/* the PNG: numbers on top, the table under them, every pixel opaque */
function sheetPng(r) {
  const nums = new Uint16Array(new Uint8Array(Buffer.from(r.nums, 'base64')).buffer);
  const table = new Uint8Array(Buffer.from(r.table, 'base64'));
  const tableRows = Math.ceil((r.entries * 2) / r.w);
  const H = r.h + tableRows;
  const px = new Uint8Array(r.w * H * 4);
  for (let q = 0; q < r.w * r.h; q++) {
    const n = nums[q];
    if (!n) continue;
    px.set([n & 255, n >> 8, 0, 255], q * 4);
  }
  for (let e = 0; e < r.entries; e++) {
    const o = (r.w * r.h + 2 * e) * 4;
    px.set([table[e * 4], table[e * 4 + 1], 0, 255, table[e * 4 + 2], table[e * 4 + 3], 0, 255], o);
  }
  /* the rest of the table's last row: opaque zeros, so nothing in it reads as a premultiplied colour */
  for (let q = r.w * r.h + 2 * r.entries; q < r.w * H; q++) px[q * 4 + 3] = 255;
  return { png: encode({ width: r.w, height: H, data: Buffer.from(px.buffer) }), tableRows };
}

function argOf(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}
function hashFiles(files) {
  const h = crypto.createHash('sha1');
  for (const f of files) {
    const full = path.join(REPO, f);
    if (fs.existsSync(full)) h.update(fs.readFileSync(full));
  }
  return h.digest('hex').slice(0, 16);
}

async function main() {
  const set = argOf('--set') || 'body';
  const { createServer } = await import('vite');
  const { chromium } = await import('playwright');
  const server = await createServer({ configFile: path.join(REPO, 'vite.config.js'), logLevel: 'error', server: { port: PORT, strictPort: true, hmr: false, open: false } });
  await server.listen();
  const opts = { args: ['--no-sandbox'] };
  const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
  if (fs.existsSync(pinned)) opts.executablePath = pinned;
  const browser = await chromium.launch(opts);
  let bad = 0, outDir = null, out = null;
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error('page error:', e.message));
    await page.route('**/__rolebake', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
    await page.goto(`http://localhost:${PORT}/__rolebake`);
    const meta = await page.evaluate(pageMeta, { set });
    const bits = Number(argOf('--bits') || meta.bits || 8) === 16 ? 16 : 8;   /* v2.3.3737: a new set is 8 bits unless it says */
    const sheets = argOf('--sheets') ? argOf('--sheets').split(',').map((x) => x.trim()).filter(Boolean) : meta.sheets;
    outDir = argOf('--out') ? path.resolve(argOf('--out')) : path.join(REPO, meta.out || `public/sprites/look/${set}`);   /* --out: a trial bake elsewhere */
    const codeFiles = [...meta.code, `src/rendering/lookSets/${set}.js`];
    const jsonFile = path.join(outDir, 'roles.json');
    /* a bake of some sheets keeps the manifest's others */
    const prev = fs.existsSync(jsonFile) ? JSON.parse(fs.readFileSync(jsonFile, 'utf8')) : null;
    out = { v: 2, version: 'v2.3.3737', set, kind: meta.kind, bits, ...(meta.mip ? {} : { mip: false }),   /* v2.3.3757: drawn without mipmaps */ refScale: meta.refScale, fw: meta.fw, fh: meta.fh,
      roles: ['keep', ...meta.roleDefs.map((ro) => ro.name)], roleDefs: meta.roleDefs.map(({ name, entry, ref, under }) => ({ name, entry, ref: ref || 0, under: under || 0 })),
      code: hashFiles(codeFiles), codeFiles, sheets: (prev && argOf('--sheets') && prev.bits === bits) ? prev.sheets : {} };
    if (!CHECK) fs.mkdirSync(outDir, { recursive: true });
    for (const name of sheets) {
      const t0 = Date.now();
      let r = await page.evaluate(pageBake, { set, sheet: name, bits, probeAt: PROBE_AT, bar: CUT_BAR, cutSrc: cutPerRole.toString() });
      /* v2.3.3750: a sheet the 8-bit cut cannot hold to the bar stays 16-bit
         (its own `bits` in the manifest; lookPalette.js reads a sheet's
         over the set's) */
      let sheetBits = bits;
      /* ...or whose self-check (three real looks against the old path's own
         canvases) shows a texel over the bar */
      if (bits === 8 && r.quant && (r.quant.over || r.check.max > CUT_BAR)) {
        console.log(`  ${name}: the 8-bit cut's worst colour is ${r.quant.worstMoved} levels, ${r.check.max} in the self-check (the bar ${CUT_BAR}): kept 16-bit`);
        r = await page.evaluate(pageBake, { set, sheet: name, bits: 16, probeAt: PROBE_AT, bar: CUT_BAR, cutSrc: cutPerRole.toString() });
        sheetBits = 16;
      }
      if (r.probe) console.log(JSON.stringify(r.probe));
      const { png, tableRows } = sheetPng(r);
      /* an 8-bit sheet is a cut of the art (the owner's "anything at 256"):
         its self-check says how far, it does not fail it */
      const ok = !r.unexplained && (sheetBits === 8 || !r.check.over1);
      if (!ok) bad++;
      console.log(`${ok ? 'ok  ' : 'BAD '} ${name.padEnd(15)} ds ${r.ds}  ${String(r.w).padStart(4)}x${r.h}+${tableRows}  ${String(r.entries).padStart(5)} colours`
        + (r.quant ? ` (cut from ${r.quant.from}: a pixel moved ${r.quant.meanMoved} on average, ${r.quant.worstMoved} at most)` : '')
        + `  roles ${r.counts.join('/')}  unexplained ${r.unexplained}  ambiguous ${r.ambiguous}  pick ${r.pick}, ${r.split} split`
        + `  check ${r.check.texels} texels, ${r.check.over1} over 1, max ${r.check.max}, mean ${r.check.mean}${r.check.fickle ? ', ' + r.check.fickle + ' fickle' : ''}  (${Date.now() - t0} ms)`);
      const artFiles = meta.art[name] || [];
      out.sheets[name] = { ...(sheetBits !== bits ? { bits: sheetBits } : {}), ds: r.ds, frames: r.frames, ...(r.fw !== meta.fw || r.fh !== meta.fh ? { fw: r.fw, fh: r.fh } : {}), w: r.w, h: r.h, tableRows, entries: r.entries, ends: r.ends,
        cells: r.cells, split: r.split, quant: r.quant || undefined, artFiles, art: hashFiles(artFiles), bytes: png.length };
      const file = path.join(outDir, name + '.png');
      if (CHECK) {
        const on = fs.existsSync(file) ? decode(fs.readFileSync(file)) : null;
        const now = decode(png);
        if (!on || on.width !== now.width || on.height !== now.height || Buffer.compare(Buffer.from(on.data), Buffer.from(now.data))) {
          console.log(`  STALE: ${path.relative(REPO, file)} differs from a fresh bake`);
          bad++;
        }
      } else fs.writeFileSync(file, png);
    }
    if (!CHECK) fs.writeFileSync(jsonFile, JSON.stringify(out, null, 1) + '\n');
  } finally {
    await browser.close();
    await server.close();
  }
  console.log(bad ? `${bad} sheet(s) failed` : (CHECK ? 'the numbers on disk are a fresh bake' : `wrote ${path.relative(REPO, outDir)}/`));
  process.exit(bad ? 1 : 0);
}

/* --hashes: every set's manifest (public/sprites/look/roles.json, the body,
   and public/sprites/look/<set>/roles.json): 0 fresh, 1 a sheet's art
   changed since its bake, 2 only the code that decides the roles */
const LEGACY_CODE = ['src/rendering/playerSkins.js', 'src/rendering/garmentConfine.js', 'src/rendering/spriteScale.js',
  'src/rendering/eyeMask.json', 'src/rendering/playerDecal.js'];
function hashes() {
  const files = [path.join(OUT, 'roles.json')];
  if (fs.existsSync(OUT)) for (const e of fs.readdirSync(OUT, { withFileTypes: true })) if (e.isDirectory() && fs.existsSync(path.join(OUT, e.name, 'roles.json'))) files.push(path.join(OUT, e.name, 'roles.json'));
  let worst = 0;
  for (const file of files) {
    if (!fs.existsSync(file)) { console.log('no ' + path.relative(REPO, file)); worst = 1; continue; }
    const m = JSON.parse(fs.readFileSync(file, 'utf8'));
    const label = m.set || 'body';
    const stale = [];
    for (const [name, e] of Object.entries(m.sheets)) {
      const art = e.artFiles || [`public/sprites/player/${name}.png`, `public/sprites/player/${name}.webp`];
      if (e.art !== hashFiles(art)) stale.push(name);
    }
    if (stale.length) { console.log(`${label}: baked from other art: ${stale.join(', ')}`); worst = 1; continue; }
    if (m.code !== hashFiles(m.codeFiles || LEGACY_CODE)) { console.log(`${label}: the code that decides its roles changed since the bake (${(m.codeFiles || LEGACY_CODE).join(', ')})`); worst = Math.max(worst, 2); continue; }
    console.log(`${label}: the numbers are a bake of these sheets and this code`);
  }
  return worst;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--hashes')) process.exit(hashes());
  main().catch((e) => { console.error(e); process.exit(1); });
}
