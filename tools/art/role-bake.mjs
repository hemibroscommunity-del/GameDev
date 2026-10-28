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

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(REPO, 'public/sprites/look');
/* v2.3.3750: every pose the body draws through getBodyFrame, in the facings
   each is authored in (playerSprites.js POSE_DIRS) -- the walk and the sprint
   are the jog's sheets, the roll and the flip the dodge's, the hit taken hit's */
const POSES = ['stand', 'jog', 'hit', 'dodge', 'mine', 'fish', 'pickup'];
const DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
const POSE_DIRS = { dodge: ['east', 'south'], mine: ['south'], fish: ['south'], pickup: ['south'] };
export const dirsOf = (pose) => POSE_DIRS[pose] || DIRS;
const PORT = Number(process.env.ROLE_BAKE_PORT || 5197);
const CHECK = process.argv.includes('--check');
/* ROLE_BAKE_PROBE=jog-east:948,53 -- one display texel's story, for debugging a bake */
const PROBE_AT = process.env.ROLE_BAKE_PROBE ? ((m) => [m[1], [Number(m[2]), Number(m[3])]])(/^([a-z-]+):(\d+),(\d+)$/.exec(process.env.ROLE_BAKE_PROBE)) : null;
export const ROLE_NAMES = ['keep', 'skin', 'pants', 'boots', 'iris', 'iris-skin', 'iris-pants', 'iris-boots'];

/* the source sheets' bytes (the .png and the .webp twin the game reads), so
   a stale bake is caught */
export function sheetHash(pose, dir) {
  const h = crypto.createHash('sha1');
  for (const ext of ['png', 'webp']) {
    const f = path.join(REPO, 'public/sprites/player', `${pose}-${dir}.${ext}`);
    if (fs.existsSync(f)) h.update(fs.readFileSync(f));
  }
  return h.digest('hex').slice(0, 16);
}
/* ...and of the code that decides the roles */
export function codeHash() {
  const h = crypto.createHash('sha1');
  for (const f of ['src/rendering/playerSkins.js', 'src/rendering/garmentConfine.js', 'src/rendering/spriteScale.js',
    'src/rendering/eyeMask.json', 'src/rendering/playerDecal.js',
    'src/rendering/toolRecolor.js', 'src/rendering/toolWood.js'])   /* v2.3.3750: + the rod's pine and the pickaxe's wood */ h.update(fs.readFileSync(path.join(REPO, f)));
  return h.digest('hex').slice(0, 16);
}

/* ── in the page: the game's own modules ── */
async function pageBake({ pose, dir, probeAt }) {
  const PS = await import('/rendering/playerSkins.js');
  const SS = await import('/rendering/spriteScale.js');
  const SP = await import('/rendering/playerSprites.js');
  const GS = await import('/rendering/gearSheets.js');
  const WI = await import('/rendering/webpImage.js');
  const EYE_MASK = (await import('/rendering/eyeMask.json')).default;
  if (SS.DISPLAY_DS !== 2) throw new Error('role-bake knows DISPLAY_DS 2 only (it is ' + SS.DISPLAY_DS + ')');
  const sheet = `${pose}-${dir}`;
  /* the sheet as the GAME reads it: its lossless .webp twin where there is
     one (webpImage.js), which a browser decodes a shade differently from the
     .png where a pixel is see-through (measured: 4,510 such pixels in
     jog-east) -- a bake from the .png put a few of them in the wrong role */
  const img = await WI.loadWebpOrPng(`/sprites/player/${sheet}.png?v=${SP.SPRITE_VERSION}`);
  const srcH = img.naturalHeight;
  const up = SS.upscaleToFrameHeight(img, 256);
  const W = up.width, H = up.height;
  const frames = Math.max(1, Math.floor(W / 256));
  const read = (cv) => {
    const c = cv.getContext ? cv : (() => { const k = document.createElement('canvas'); k.width = cv.width; k.height = cv.height; k.getContext('2d').drawImage(cv, 0, 0); return k; })();
    return c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  };
  /* the art as the recolour reads it (it upscales and draws the same way) */
  const c0 = document.createElement('canvas'); c0.width = W; c0.height = H;
  c0.getContext('2d').drawImage(up, 0, 0);
  const d = c0.getContext('2d').getImageData(0, 0, W, H).data;
  /* buildBodySheet's own call, argument for argument */
  /* v2.3.3750: buildBodySheet's own call for every pose -- the jog's steadied
     drawing, the fish's boots under its legs, the pickaxe's wood -- and the
     rod's pine after it, only where the FILE has the key (its _fileKeyMask) */
  const TR = await import('/rendering/toolRecolor.js');
  let fileKey = null;
  if (pose === 'fish') {
    const k = document.createElement('canvas'); k.width = W; k.height = H;
    const kg = k.getContext('2d', { willReadFrequently: true });
    kg.imageSmoothingEnabled = false;
    kg.drawImage(up, 0, 0);
    fileKey = TR.toolKeyMask(kg.getImageData(0, 0, W, H).data, W, H);
    k.width = 0; k.height = 0;
  }
  const run = (L) => {
    const cv = PS.recolorBodyToCanvas(img, L.s || null, L.p || null, L.b || null, null, 256,
      L.e || null, EYE_MASK[sheet], null, undefined, pose === 'jog', null, pose === 'fish', null, false, pose === 'mine');
    if (fileKey) TR.recolorToolKeyCanvas(cv, TR.TOOL_SPECS.rod, 1, fileKey);
    return cv;
  };
  const disp = (full) => {
    let c = SS.bakeDisplayCanvas(full, srcH);
    if (pose === 'jog' && dir === 'northeast') c = SP.stripDetachedComponents(c, frames);
    return c;
  };
  const P1 = { s: [214, 48, 40], p: [40, 196, 52], b: [44, 64, 210], e: [251, 3, 247] };
  const P2 = { s: [60, 190, 200], p: [205, 70, 190], b: [200, 200, 40], e: [5, 249, 9] };
  const P3 = { s: P1.s, p: P1.p, b: P1.b };
  const f1 = read(run(P1)), f2 = read(run(P2)), f3 = read(run(P3));
  const REF = [0, 149, 112, 75];
  const retint = (i, T, ref) => {
    const k = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / ref;
    return [Math.min(255, Math.round(T[0] * k)), Math.min(255, Math.round(T[1] * k)), Math.min(255, Math.round(T[2] * k))];
  };
  /* premultiplied, as the canvas keeps it: a see-through pixel's colour is
     only as exact as its alpha lets it be */
  const near = (o, i, rgb) => {
    const a = d[i + 3];
    for (let k = 0; k < 3; k++) if (Math.abs(o[i + k] * a / 255 - rgb[k] * a / 255) > 1.01) return false;
    return true;
  };
  /* v2.3.3750: a KEPT pixel is what the bake leaves whatever the look -- the
     art's colour, or the rod's pine painted over it: the default look's output */
  const f0 = read(run({}));
  const keepRGB = (i) => [f0[i], f0[i + 1], f0[i + 2]];
  const roleOut = (i, r, L) => (r === 0 ? keepRGB(i) : retint(i, r === 1 ? L.s : r === 2 ? L.p : L.b, REF[r]));
  const role = new Uint8Array(W * H);
  let unexplained = 0, ambiguous = 0;
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    if (d[i + 3] === 0) continue;
    const iris = near(f1, i, P1.e) && near(f2, i, P2.e);
    const cand = [];
    for (let r = 0; r < 4; r++) {
      if (iris) { if (near(f3, i, roleOut(i, r, P3))) cand.push(r); }
      else if (near(f1, i, roleOut(i, r, P1)) && near(f2, i, roleOut(i, r, P2)) && near(f3, i, roleOut(i, r, P3))) cand.push(r);
    }
    if (!cand.length) { unexplained++; continue; }
    if (cand.length > 1 && cand[0] !== 0) ambiguous++;
    role[p] = cand[0] + (iris ? 4 : 0);
  }
  /* the display: which pixels it shows, and (ds 1) which source pixel each is */
  const defFull = run({});
  const defDisp = disp(defFull);
  const dd = read(defDisp);
  const DW = defDisp.width, DH = defDisp.height;
  const ds = (srcH === Math.round(H / 2)) ? 1 : 2;   /* bakeDisplayCanvas: nearest, or the 2x2 box */
  let ox = 1, oy = 1;
  if (ds === 1) {
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
  const keyOf = (p) => {
    const c = (role[p] & 3) === 0 ? f0 : d;   /* v2.3.3750: a kept entry's colour is the bake's (keepRGB) */
    return role[p] * 4294967296 + ((c[p * 4] << 24) >>> 0) + (c[p * 4 + 1] << 16) + (c[p * 4 + 2] << 8) + d[p * 4 + 3];
  };
  const keys = new Map();
  const nw = ds === 1 ? DW : W, nh = ds === 1 ? DH : H;
  const srcOf = new Int32Array(nw * nh).fill(-1);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    let p;
    if (ds === 1) {
      if (!dd[(y * DW + x) * 4 + 3]) continue;   /* see-through on the display (and the stripped specks) */
      p = (2 * y + oy) * W + 2 * x + ox;
    } else p = y * W + x;
    if (!d[p * 4 + 3]) continue;
    srcOf[y * nw + x] = p;
    keys.set(keyOf(p), 0);
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
  if (ds === 1) {
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      if (srcOf[y * nw + x] < 0) continue;
      const k0 = keyOf((2 * y) * W + 2 * x);
      if (keyOf((2 * y) * W + 2 * x + 1) !== k0 || keyOf((2 * y + 1) * W + 2 * x) !== k0 || keyOf((2 * y + 1) * W + 2 * x + 1) !== k0) split++;
    }
  }
  const sorted = [...keys.keys()].sort((a, b) => a - b);
  if (sorted.length + 1 > 65535) throw new Error(sheet + ': ' + sorted.length + ' colours, over 16 bits');
  const table = new Uint8Array((sorted.length + 1) * 4);
  const count = new Array(8).fill(0);
  sorted.forEach((k, n) => {
    keys.set(k, n + 1);
    const r = Math.floor(k / 4294967296), v = k - r * 4294967296;
    table.set([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255], (n + 1) * 4);
    count[r]++;
  });
  /* one past each role's last entry (entry 0, see-through, counts as keep) */
  const ends = [];
  for (let r = 0, e = 1; r < 8; r++) { e += count[r]; ends.push(e); }
  const strip = new Uint16Array(nw * nh);
  for (let q = 0; q < nw * nh; q++) if (srcOf[q] >= 0) strip[q] = keys.get(keyOf(srcOf[q]));
  /* the layout: the old path's packed sheet, cell for cell -- its crops are
     the display's (ds 2: each display texel's four numbers, at twice the
     crop), so every frame's quad is the old path's own */
  let cells, PW, PH, nums;
  const packed = GS.packTrimmed(defDisp, 128, 128, frames);
  if (packed) {
    cells = packed.cells.map((c) => [c.ax, c.ay, c.tx, c.ty, c.w, c.h, c.blank ? 1 : 0]);
    PW = packed.canvas.width * ds; PH = packed.canvas.height * ds;
    packed.canvas.width = 0; packed.canvas.height = 0;
    nums = new Uint16Array(PW * PH);
    packed.cells.forEach((c, f) => {
      if (c.blank) return;
      for (let y = 0; y < c.h * ds; y++) for (let x = 0; x < c.w * ds; x++) {
        nums[(c.ay * ds + y) * PW + c.ax * ds + x] = strip[(c.ty * ds + y) * nw + (f * 128 + c.tx) * ds + x];
      }
    });
  } else {
    cells = Array.from({ length: frames }, (_, f) => [f * 128, 0, -1, -1, 128, 128, 0]);   /* tx -1: no trim */
    PW = nw; PH = nh; nums = strip;
  }
  /* ── the self-check: real looks, drawn from the numbers as the chip will ── */
  const LOOKS = [
    { s: [61, 40, 28], p: [185, 58, 46], b: [222, 222, 228], e: [60, 110, 220] },
    { s: [249, 236, 226], p: [214, 112, 168], b: [190, 160, 110] },
    { p: [46, 56, 120], e: [40, 160, 70] },
  ];
  const colour = (n, L) => {
    if (!n) return [0, 0, 0, 0];
    let r = 0; while (r < 7 && n >= ends[r]) r++;
    const o = n * 4, a = table[o + 3];
    let c = [table[o], table[o + 1], table[o + 2]];
    const base = r >= 4 ? r - 4 : r;
    if (r >= 4 && L.e) c = L.e;
    else if (base > 0) {
      const T = base === 1 ? L.s : base === 2 ? L.p : L.b;
      if (T) { const k = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / REF[base]; c = [0, 1, 2].map((q) => Math.min(255, Math.round(T[q] * k))); }
    }
    return [Math.round(c[0] * a / 255), Math.round(c[1] * a / 255), Math.round(c[2] * a / 255), a];
  };
  const check = { looks: LOOKS.length, texels: 0, over1: 0, max: 0 };
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
      check.texels++;
      /* v2.3.3750: the old fish bake re-tests the rod's hue AFTER the
         retint, so a boot pixel inside the file's key turns to pine for a
         look whose boots land in that hue (2 texels of the 1.57 million, a
         tan boot): counted apart, not copied -- the file says it is a boot */
      if (fileKey && m > 1.5 && fileKey[(2 * y + oy) * W + 2 * x + ox]) { check.toolFlip = (check.toolFlip || 0) + 1; continue; }
      if (m > check.max) check.max = +m.toFixed(2);
      if (m > 1.5) check.over1++;
    }
  }
  let probe = null;
  if (probeAt && probeAt[0] === sheet) {
    const [x, y] = probeAt[1];
    const blk = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => { const p = (2 * y + b) * W + 2 * x + a; return { a, b, d: Array.from(d.slice(p * 4, p * 4 + 4)), f1: Array.from(f1.slice(p * 4, p * 4 + 4)), role: role[p] }; });
    const L0 = read(disp(run(LOOKS[0])));
    probe = { pick: [ox, oy], n: strip[y * nw + x], blk, dispDef: Array.from(dd.slice((y * DW + x) * 4, (y * DW + x) * 4 + 4)), dispL0: Array.from(L0.slice((y * DW + x) * 4, (y * DW + x) * 4 + 4)) };
  }
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); };
  return {
    sheet, ds, frames, w: PW, h: PH, entries: sorted.length + 1, ends, cells,
    unexplained, ambiguous, pick: [ox, oy], split, check, probe,
    counts: ROLE_COUNT(role),
    nums: b64(new Uint8Array(nums.buffer, nums.byteOffset, nums.byteLength)), table: b64(table),
  };
  function ROLE_COUNT(rr) { const c = new Array(8).fill(0); for (let p = 0; p < rr.length; p++) if (d[p * 4 + 3]) c[rr[p]]++; return c; }
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

async function main() {
  const { createServer } = await import('vite');
  const { chromium } = await import('playwright');
  const server = await createServer({ configFile: path.join(REPO, 'vite.config.js'), logLevel: 'error', server: { port: PORT, strictPort: true, hmr: false, open: false } });
  await server.listen();
  const opts = { args: ['--no-sandbox'] };
  const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
  if (fs.existsSync(pinned)) opts.executablePath = pinned;
  const browser = await chromium.launch(opts);
  const out = { v: 1, version: 'v2.3.3716', roles: ROLE_NAMES, refs: [0, 149, 112, 75], code: codeHash(), sheets: {} };
  let bad = 0;
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error('page error:', e.message));
    await page.route('**/__rolebake', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
    await page.goto(`http://localhost:${PORT}/__rolebake`);
    if (!CHECK) fs.mkdirSync(OUT, { recursive: true });
    for (const pose of POSES) {
      for (const dir of dirsOf(pose)) {
        const t0 = Date.now();
        const r = await page.evaluate(pageBake, { pose, dir, probeAt: PROBE_AT });
        if (r.probe) console.log(JSON.stringify(r.probe));
        const { png, tableRows } = sheetPng(r);
        const name = `${pose}-${dir}`;
        const ok = !r.unexplained && !r.check.over1;
        if (!ok) bad++;
        console.log(`${ok ? 'ok  ' : 'BAD '} ${name.padEnd(15)} ds ${r.ds}  ${String(r.w).padStart(4)}x${r.h}+${tableRows}  ${String(r.entries).padStart(5)} colours`
          + `  roles ${r.counts.join('/')}  unexplained ${r.unexplained}  ambiguous ${r.ambiguous}  pick ${r.pick}, ${r.split} split`
          + `  check ${r.check.texels} texels, ${r.check.over1} over 1, max ${r.check.max}${r.check.toolFlip ? ', ' + r.check.toolFlip + ' rod flips' : ''}  (${Date.now() - t0} ms)`);
        out.sheets[name] = { ds: r.ds, frames: r.frames, w: r.w, h: r.h, tableRows, entries: r.entries, ends: r.ends,
          cells: r.cells, split: r.split, art: sheetHash(pose, dir), bytes: png.length };
        const file = path.join(OUT, name + '.png');
        if (CHECK) {
          const on = fs.existsSync(file) ? decode(fs.readFileSync(file)) : null;
          const now = decode(png);
          if (!on || on.width !== now.width || on.height !== now.height || Buffer.compare(Buffer.from(on.data), Buffer.from(now.data))) {
            console.log(`  STALE: ${path.relative(REPO, file)} differs from a fresh bake`);
            bad++;
          }
        } else fs.writeFileSync(file, png);
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
  const jsonFile = path.join(OUT, 'roles.json');
  if (!CHECK) fs.writeFileSync(jsonFile, JSON.stringify(out, null, 1) + '\n');
  console.log(bad ? `${bad} sheet(s) failed` : (CHECK ? 'the numbers on disk are a fresh bake' : `wrote ${path.relative(REPO, OUT)}/`));
  process.exit(bad ? 1 : 0);
}

/* --hashes: 0 fresh, 1 a sheet changed since the bake, 2 only the code */
function hashes() {
  const file = path.join(OUT, 'roles.json');
  if (!fs.existsSync(file)) { console.log('no ' + path.relative(REPO, file)); return 1; }
  const m = JSON.parse(fs.readFileSync(file, 'utf8'));
  const stale = [];
  for (const pose of POSES) for (const dir of dirsOf(pose)) {
    const e = m.sheets[`${pose}-${dir}`];
    if (!e || e.art !== sheetHash(pose, dir)) stale.push(`${pose}-${dir}`);
  }
  if (stale.length) { console.log('baked from other art: ' + stale.join(', ')); return 1; }
  if (m.code !== codeHash()) { console.log('the recolour code changed since the bake (playerSkins.js, garmentConfine.js, spriteScale.js, eyeMask.json or playerDecal.js)'); return 2; }
  console.log('the numbers are a bake of these sheets and this code');
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--hashes')) process.exit(hashes());
  main().catch((e) => { console.error(e); process.exit(1); });
}
