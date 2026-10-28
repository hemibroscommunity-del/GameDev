#!/usr/bin/env node
/* ═══ v2.3.3753: THE HEAD PIECES' PIXELS, EACH GIVEN ITS ROLE, ONCE, OFFLINE ═══
 *
 * Phase 2 of the look palette (docs/specs/look-palette.md), lane P4: the
 * head pieces.  Today every colour of a hair, a hat, a beard, a pair of
 * glasses or an eye style is its own recoloured copy of the piece's facings
 * (traits/*ColorCatalog.js: recolorHairToCanvas, a whole 128 frame a facing,
 * ~430 KB on the graphics chip a copy, twelve kept a category).  This keeps
 * each piece ONCE as colour numbers (the set 'heads', public/sprites/look/
 * heads/), and a colour is one entry of a row (LOOK_ROW_RANGES.head):
 *   64 hair, 65 hat, 66 beard, 67 eyewear, 68 eye style.
 *
 * THE ROLES are decided by the GAME'S OWN RECOLOUR, never re-implemented: the
 * page runs recolorHairToCanvas with each catalog's own profile (getHatRef,
 * getEyewearRef, getEyeStyleRef; hair and beards none, so each facing's own
 * reference) and two probe colours no art pixel has, then asks of every pixel
 * which rule explains what came out:
 *   keep    the art's colour, whatever the colour (outlines, the Kermit hat's
 *           eyes, see-through fringe at alpha 30 or less, ...)
 *   paint   min(255, round(target x luminance / ref)) -- ONE role a facing
 *           where the reference is the facing's own (hair, beard), one for
 *           the piece where it is pooled (hats, glasses, eye styles)
 *   flat    the target itself (One Eye, WTF, the Alien Eyes: ref 0)
 * A pixel no rule explains FAILS the bake (none does: 59 pieces, 0).
 *
 * A SHEET is a piece: its facings side by side, each CROPPED to its art (a
 * piece is 2-9% of its frame) with two see-through texels round it and every
 * cell on even texels, so the chip's bilinear read and the first mip level
 * see what they saw in the old 128 frame.  16 bits a number: a facing has up
 * to 771 colours (the wavy hair's east), and every colour stays exact.
 *
 * It checks itself: three real colours drawn from the numbers in JavaScript
 * the way the chip will (premultiplied), against recolorHairToCanvas's own
 * canvases, every texel of every facing.  mp-lookheads is the real oracle.
 *
 *   node tools/art/head-bake.mjs            (writes public/sprites/look/heads/)
 *   node tools/art/head-bake.mjs --check    (bakes, compares with what is on disk)
 *   node tools/art/head-bake.mjs --hashes   (no browser: were the numbers baked
 *                                           from this art and this code?)
 *
 * Re-run it when a head piece's art, meta-independent recolour code
 * (characterPortrait.js recolorHairToCanvas, traitMaterials.js, the colour
 * catalogs' profiles and which pieces they paint) or a catalog changes:
 * precheck's `look-heads` runs --hashes.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { encode, decode } from '../png.mjs';
import { cutPerRole } from './lookCut.mjs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(REPO, 'public/sprites/look/heads');
const PORT = Number(process.env.HEAD_BAKE_PORT || 5198);
const CHECK = process.argv.includes('--check');
/* --bits 8: each piece cut to 255 colours per role (lookCut.mjs, the owner's
   "anything at 256"), held to BAR8 levels of the old path on every texel, or
   kept at 16 bits (exact) where it cannot be */
const BITS = (() => { const i = process.argv.indexOf('--bits'); return i > 0 && Number(process.argv[i + 1]) === 8 ? 8 : 16; })();
const BAR8 = 16;
const VERSION = 'v2.3.3753';
/* the row's entry for each category (LOOK_ROW_RANGES.head is 64-127) */
export const HEAD_ENTRY = Object.freeze({ hair: 64, headwear: 65, facialhair: 66, eyewear: 67, eyestyle: 68 });
/* the facings each colour catalog recolours (its own DIRS) */
const CAT_DIRS = Object.freeze({
  hair: ['east', 'north', 'northeast', 'south', 'southwest'],
  headwear: ['east', 'north', 'northeast', 'south', 'southwest'],
  facialhair: ['east', 'north', 'northeast', 'south', 'southwest'],
  eyewear: ['east', 'northeast', 'south', 'southwest'],
  eyestyle: ['east', 'south', 'southwest'],
});
/* a ref is carried in 1/64ths (the header's 16 bits hold up to 1023.98) */
export const REF_SCALE = Number(process.env.HEAD_REF_SCALE || 64);

const CODE_FILES = ['src/rendering/characterPortrait.js', 'src/rendering/traits/traitMaterials.js',
  'src/rendering/traits/hairColorCatalog.js', 'src/rendering/traits/hatColorCatalog.js',
  'src/rendering/traits/facialHairColorCatalog.js', 'src/rendering/traits/eyewearColorCatalog.js',
  'src/rendering/traits/eyeStyleColorCatalog.js', 'src/rendering/traits/recolorOptions.js',
  'src/rendering/traits/hairCatalog.js', 'src/rendering/traits/headwearCatalog.js',
  'src/rendering/traits/facialHairCatalog.js', 'src/rendering/traits/eyewearCatalog.js',
  'src/rendering/traits/eyeStyleCatalog.js', 'src/rendering/traits/pendingTraits.js'];
export function codeHash() {
  const h = crypto.createHash('sha1');
  for (const f of CODE_FILES) h.update(fs.readFileSync(path.join(REPO, f)));
  return h.digest('hex').slice(0, 16);
}
export function artHash(cat, id) {
  const h = crypto.createHash('sha1');
  for (const dir of CAT_DIRS[cat]) {
    const f = path.join(REPO, 'public/sprites/traits', cat, id, dir + '.png');
    if (fs.existsSync(f)) h.update(dir).update(fs.readFileSync(f));
  }
  return h.digest('hex').slice(0, 16);
}

/* ── in the page: the pieces the catalogs recolour ── */
async function pageList() {
  const H = await import('/rendering/traits/hairCatalog.js');
  const W = await import('/rendering/traits/headwearCatalog.js');
  const F = await import('/rendering/traits/facialHairCatalog.js');
  const EW = await import('/rendering/traits/eyewearColorCatalog.js');
  const ES = await import('/rendering/traits/eyeStyleColorCatalog.js');
  const EWC = await import('/rendering/traits/eyewearCatalog.js');
  const ESC = await import('/rendering/traits/eyeStyleCatalog.js');
  const ids = (c) => c.map((e) => e.id).filter((i) => i && i !== 'none');
  return [
    /* long hair is always drawn native (hairColorCatalog getColoredHairTextures) */
    ...ids(H.HAIR_CATALOG).filter((i) => i !== 'long').map((id) => ({ cat: 'hair', id })),
    ...ids(W.HEADWEAR_CATALOG).map((id) => ({ cat: 'headwear', id })),
    ...ids(F.FACIALHAIR_CATALOG).map((id) => ({ cat: 'facialhair', id })),
    ...ids(EWC.EYEWEAR_CATALOG).filter((i) => EW.eyewearPaints(i)).map((id) => ({ cat: 'eyewear', id })),
    ...ids(ESC.EYE_STYLE_CATALOG).filter((i) => ES.eyeStylePaints(i)).map((id) => ({ cat: 'eyestyle', id })),
  ];
}

/* ── in the page: one piece ── */
async function pageBake({ cat, id, dirs, refScale, bits, cutSrc }) {
  const CP = await import('/rendering/characterPortrait.js');
  const TI = await import('/rendering/traits/traitImg.js');
  const HC = await import('/rendering/traits/hatColorCatalog.js');
  const EW = await import('/rendering/traits/eyewearColorCatalog.js');
  const ES = await import('/rendering/traits/eyeStyleColorCatalog.js');
  /* the profile exactly as the catalog's build() passes it (none: each
     facing's own reference, recolorHairToCanvas's fallback) */
  const prof = cat === 'headwear' ? await HC.getHatRef(id) : cat === 'eyewear' ? await EW.getEyewearRef(id)
    : cat === 'eyestyle' ? await ES.getEyeStyleRef(id) : undefined;
  /* two probes no art pixel has, and the two ends of the scale: a faint
     pixel (alpha 31 is an eighth) is told apart only by a big swing */
  const PROBES = [[214, 48, 40], [40, 196, 210], [252, 250, 251], [3, 5, 2]];
  const flat = !!(prof && prof.flat);
  const facings = [];
  for (const dir of dirs) {
    let img;
    try { img = await TI.loadTraitImg(`/sprites/traits/${cat}/${id}/${dir}.png?v=2.3.3590`); } catch (e) { continue; }
    const W = img.width, H = img.height;
    const c0 = document.createElement('canvas'); c0.width = W; c0.height = H;
    const g0 = c0.getContext('2d', { willReadFrequently: true }); g0.drawImage(img, 0, 0);
    const d = g0.getImageData(0, 0, W, H).data;
    const rd = (cv) => cv.getContext('2d').getImageData(0, 0, W, H).data;
    const run = (T) => rd(CP.recolorHairToCanvas(img, T, prof));
    const fs = PROBES.map(run);
    let ref = prof ? (prof.matRef || prof.ref) : 0;
    if (!ref) {
      let s = 0, n = 0, mx = 1;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 30) { const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; s += l; n++; if (l > mx) mx = l; }
      ref = Math.max(1, n ? (s / n) * 1.15 : mx);
    }
    facings.push({ dir, W, H, d, fs, ref, img });
  }
  /* roles: 1 paint per facing (its own ref) or one for the piece (pooled), or flat */
  const pooled = !!prof;
  const roleDefs = [];
  const roleOf = (fi) => {
    const want = flat ? 0 : Math.round(facings[fi].ref * refScale);
    let r = roleDefs.findIndex((ro) => ro.ref64 === want);
    if (r < 0) { roleDefs.push({ name: flat ? 'flat' : (pooled ? 'paint' : 'paint-' + facings[fi].dir), ref64: want }); r = roleDefs.length - 1; }
    return r + 1;
  };
  const near = (o, i, d, rgb) => { const a = d[i + 3]; for (let k = 0; k < 3; k++) if (Math.abs(o[i + k] * a / 255 - rgb[k] * a / 255) > 1.01) return false; return true; };
  let unexplained = 0, ambiguous = 0;
  const keyOf = (role, d, i) => role * 4294967296 + ((d[i] << 24) >>> 0) + (d[i + 1] << 16) + (d[i + 2] << 8) + d[i + 3];
  const keys = new Map();
  const counts = [0, 0];
  facings.forEach((F, fi) => {
    const { W, H, d, fs } = F;
    const ret = (i, T) => { const k = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / F.ref; return [0, 1, 2].map((q) => Math.min(255, Math.round(T[q] * k))); };
    const pr = roleOf(fi);
    F.role = new Uint8Array(W * H);
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let p = 0; p < W * H; p++) {
      const i = p * 4;
      if (!d[i + 3]) continue;
      const x = p % W, y = (p / W) | 0;
      if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
      const own = [d[i], d[i + 1], d[i + 2]];
      const keep = fs.every((f) => near(f, i, d, own));
      const paint = fs.every((f, q) => near(f, i, d, flat ? PROBES[q] : ret(i, PROBES[q])));
      if (keep && paint) ambiguous++;
      /* painted where it is painted (a pixel already its own colour under
         both probes is no colour's) */
      const r = paint && !keep ? pr : keep ? 0 : -1;
      if (r < 0) { unexplained++; continue; }
      F.role[p] = r;
      counts[r ? 1 : 0]++;
      const k = keyOf(r, d, i);
      keys.set(k, (keys.get(k) || 0) + 1);
    }
    /* the crop: even, with two see-through texels round the art */
    if (x1 < 0) { F.crop = null; return; }
    const cx0 = Math.max(0, (x0 - 2) & ~1), cy0 = Math.max(0, (y0 - 2) & ~1);
    const cx1 = Math.min(W, x1 + 3), cy1 = Math.min(H, y1 + 3);
    F.crop = [cx0, cy0, cx1 - cx0, cy1 - cy0];
  });
  /* 8 bits: the colours cut to 255, per role (lookCut.mjs) */
  let remap = null, quant = null;
  if (bits === 8) {
    const cut = (new Function('return ' + cutSrc))()(keys, 255);
    if (cut) {
      remap = cut.remap; quant = cut.quant;
      keys.clear();
      for (const [k, n] of cut.keys) keys.set(k, n);
    }
  }
  const sorted = [...keys.keys()].sort((a, b) => a - b);
  if (sorted.length + 1 > 65535) throw new Error(cat + '/' + id + ': ' + sorted.length + ' colours, over 16 bits');
  const table = new Uint8Array((sorted.length + 1) * 4);
  const perRole = new Array(16).fill(0);
  sorted.forEach((k, n) => {
    keys.set(k, n + 1);
    const r = Math.floor(k / 4294967296), v = k - r * 4294967296;
    table.set([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255], (n + 1) * 4);
    perRole[r]++;
  });
  const ends = [];
  for (let r = 0, e = 1; r <= roleDefs.length; r++) { e += perRole[r]; ends.push(e); }
  /* the layout: the facings side by side, every cell on even texels, two
     texels between them */
  let PW = 0, PH = 0;
  const cells = [], cellDirs = [];
  for (const F of facings) {
    if (!F.crop) continue;
    const [, , w, h] = F.crop;
    F.ax = PW; F.ay = 0;
    PW = (PW + w + 2 + 1) & ~1;
    PH = Math.max(PH, h);
  }
  PH = (PH + 2 + 1) & ~1;
  const nums = new Uint16Array(PW * PH);
  for (const F of facings) {
    if (!F.crop) continue;
    const [cx, cy, w, h] = F.crop;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = (cy + y) * F.W + cx + x;
      if (!F.d[p * 4 + 3]) continue;
      const k = keyOf(F.role[p], F.d, p * 4);
      nums[(F.ay + y) * PW + F.ax + x] = keys.get(remap ? remap.get(k) : k);
    }
    cells.push([F.ax, F.ay, cx, cy, w, h, 0]);
    cellDirs.push(F.dir);
  }
  /* ── the self-check: real colours, drawn from the numbers as the chip will ── */
  const LOOKS = [[196, 64, 50], [74, 96, 200], [228, 228, 234]];
  const colour = (n, T, F) => {
    if (!n) return [0, 0, 0, 0];
    let r = 0; while (r < roleDefs.length && n >= ends[r]) r++;
    const o = n * 4, a = table[o + 3];
    let c = [table[o], table[o + 1], table[o + 2]];
    if (r > 0) {
      const ref = roleDefs[r - 1].ref64 / refScale;
      if (!ref) c = T.slice();
      else { const k = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / ref; c = [0, 1, 2].map((q) => Math.min(255, Math.round(T[q] * k))); }
    }
    return [Math.round(c[0] * a / 255), Math.round(c[1] * a / 255), Math.round(c[2] * a / 255), a];
  };
  const check = { texels: 0, over1: 0, max: 0 };
  for (const T of LOOKS) {
    for (const F of facings) {
      const od = CP.recolorHairToCanvas(F.img, T, prof).getContext('2d').getImageData(0, 0, F.W, F.H).data;
      for (let y = 0; y < F.H; y++) for (let x = 0; x < F.W; x++) {
        const j = (y * F.W + x) * 4;
        let want = [0, 0, 0, 0];
        if (F.crop) {
          const [cx, cy, w, h] = F.crop;
          if (x >= cx && x < cx + w && y >= cy && y < cy + h) want = colour(nums[(F.ay + y - cy) * PW + F.ax + x - cx], T, F);
        }
        const a = od[j + 3];
        const got = [od[j] * a / 255, od[j + 1] * a / 255, od[j + 2] * a / 255, a];
        let m = 0;
        for (let k = 0; k < 4; k++) m = Math.max(m, Math.abs(got[k] - want[k]));
        check.texels++;
        if (m > check.max) check.max = +m.toFixed(2);
        if (m > 1.5) check.over1++;
      }
    }
  }
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); };
  return {
    bits, quant, w: PW, h: PH, entries: sorted.length + 1, ends, cells, dirs: cellDirs, roleDefs, counts, unexplained, ambiguous, check, flat,
    nums: b64(new Uint8Array(nums.buffer, nums.byteOffset, nums.byteLength)), table: b64(table),
  };
}

/* the PNG: numbers on top (red low byte, green high), the table under them,
   two pixels an entry, every pixel opaque (role-bake.mjs's form) */
function sheetPng(r) {
  const nums = new Uint16Array(new Uint8Array(Buffer.from(r.nums, 'base64')).buffer);
  const table = new Uint8Array(Buffer.from(r.table, 'base64'));
  const tableRows = Math.ceil((r.entries * 2) / r.w);
  const H = r.h + tableRows;
  const px = new Uint8Array(r.w * H * 4);
  for (let q = 0; q < r.w * r.h; q++) {
    px[q * 4 + 3] = 255;
    const n = nums[q];
    if (n) { px[q * 4] = n & 255; px[q * 4 + 1] = n >> 8; }
  }
  for (let e = 0; e < r.entries; e++) {
    const o = (r.w * r.h + 2 * e) * 4;
    px.set([table[e * 4], table[e * 4 + 1], 0, 255, table[e * 4 + 2], table[e * 4 + 3], 0, 255], o);
  }
  for (let q = r.w * r.h + 2 * r.entries; q < r.w * H; q++) px[q * 4 + 3] = 255;
  return { png: encode({ width: r.w, height: H, data: Buffer.from(px.buffer) }), tableRows };
}

async function main() {
  const { createServer } = await import('vite');
  const { chromium } = await import('playwright');
  const server = await createServer({ configFile: path.join(REPO, 'vite.config.js'), logLevel: 'error', server: { port: PORT, strictPort: true, hmr: false, open: false } });
  await server.listen();
  const opts = { args: ['--no-sandbox', '--disable-gpu'] };
  const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
  if (fs.existsSync(pinned)) opts.executablePath = pinned;
  const browser = await chromium.launch(opts);
  const out = { v: 1, version: VERSION, kind: 'head', bits: BITS, fw: 128, fh: 128, refScale: REF_SCALE, entry: HEAD_ENTRY, code: codeHash(), sheets: {} };
  let bad = 0, bytes = 0, texels = 0, texBytes = 0, worst = 0;
  const nBits = { 8: 0, 16: 0 };
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error('page error:', e.message));
    await page.route('**/__headbake', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
    await page.goto(`http://localhost:${PORT}/__headbake`);
    const list = await page.evaluate(pageList);
    if (!CHECK) {
      fs.mkdirSync(OUT, { recursive: true });
      for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));
    }
    for (const { cat, id } of list) {
      const args = { cat, id, dirs: CAT_DIRS[cat], refScale: REF_SCALE, bits: BITS, cutSrc: cutPerRole.toString() };
      let r = await page.evaluate(pageBake, args);
      /* a cut that misses the bar: this piece stays exact */
      if (r.bits === 8 && r.check.max > BAR8) r = await page.evaluate(pageBake, { ...args, bits: 16 });
      const { png, tableRows } = sheetPng(r);
      const name = `${cat}-${id}`;
      const ok = !r.unexplained && (r.quant ? r.check.max <= BAR8 : !r.check.over1) && r.cells.length;
      if (!ok) bad++;
      bytes += png.length; texels += r.w * (r.h + tableRows);
      console.log(`${ok ? 'ok  ' : 'BAD '} ${name.padEnd(28)} ${String(r.w).padStart(4)}x${r.h}+${tableRows}  ${String(r.entries).padStart(5)} colours  roles ${r.roleDefs.map((ro) => ro.name + '@' + (ro.ref64 / REF_SCALE).toFixed(2)).join(',')}`
        + `  keep/paint ${r.counts.join('/')}  unexplained ${r.unexplained}  check ${r.check.texels} texels, ${r.check.over1} over 1, max ${r.check.max}`
        + `  ${r.bits} bits${r.quant ? ` (cut from ${r.quant.from}: a pixel moved ${r.quant.meanMoved} on average, ${r.quant.worstMoved} at most)` : ''}`);
      worst = Math.max(worst, r.check.max);
      texBytes += r.w * (r.h + tableRows) * (r.bits === 8 ? 1 : 2);
      nBits[r.bits]++;
      const entry = HEAD_ENTRY[cat];
      out.sheets[name] = { ds: 1, bits: r.bits, w: r.w, h: r.h, tableRows, entries: r.entries, ends: r.ends, cells: r.cells, dirs: r.dirs,
        roleDefs: r.roleDefs.map((ro) => ({ name: ro.name, entry, ref: ro.ref64, under: 0 })), art: artHash(cat, id), bytes: png.length };
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
  } finally {
    await browser.close();
    await server.close();
  }
  if (!CHECK) fs.writeFileSync(path.join(OUT, 'roles.json'), JSON.stringify(out) + '\n');
  void texels;
  console.log(`${Object.keys(out.sheets).length} pieces (${nBits[8]} at 8 bits, ${nBits[16]} at 16), ${(bytes / 1024).toFixed(0)} KB of PNG, ${(texBytes / 1048576).toFixed(2)} MB on the chip, worst texel against the old path ${worst}`);
  console.log(bad ? `${bad} sheet(s) failed` : (CHECK ? 'the numbers on disk are a fresh bake' : `wrote ${path.relative(REPO, OUT)}/`));
  process.exit(bad ? 1 : 0);
}

/* --hashes: 0 fresh, 1 a piece's art changed since the bake, 2 only the code */
function hashes() {
  const file = path.join(OUT, 'roles.json');
  if (!fs.existsSync(file)) { console.log('no ' + path.relative(REPO, file)); return 1; }
  const m = JSON.parse(fs.readFileSync(file, 'utf8'));
  const stale = [];
  for (const name of Object.keys(m.sheets)) {
    const i = name.indexOf('-');
    if (m.sheets[name].art !== artHash(name.slice(0, i), name.slice(i + 1))) stale.push(name);
  }
  if (stale.length) { console.log('baked from other art: ' + stale.join(', ')); return 1; }
  if (m.code !== codeHash()) { console.log('the head recolour code or a catalog changed since the bake (head-bake.mjs CODE_FILES): run node tools/art/head-bake.mjs --check'); return 2; }
  console.log('the head numbers are a bake of this art and this code');
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--hashes')) process.exit(hashes());
  main().catch((e) => { console.error(e); process.exit(1); });
}
