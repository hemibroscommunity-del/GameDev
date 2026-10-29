#!/usr/bin/env node
/* ═══ v2.3.3751: THE SHIRT'S PIXELS, ITS PRINT CELLS AND ITS PATTERN ANCHORS, ONCE, OFFLINE ═══
 *
 * The look palette's shirt part (docs/specs/look-palette.md, "Shirts and their
 * prints").  Today a shirt with a pattern or a print is a COPY of every sheet
 * it is seen in, per player (gearSheets.getShirtLookFrame -> playerDecal
 * composeShirt: tint, then pattern, then print, baked into a canvas).  But
 * WHERE the pattern and the print land is the white sheet's alone: the print's
 * box is each frame's chest box (chestBox), the pattern's anchor the centroid of
 * the frame's lit fabric (litFabricMask), and neither knows the player.  So
 * this keeps each shirt sheet ONCE and the graphics chip dresses it as it is
 * drawn, from the look's row (lookPalette.js): the tint, the pattern's tile and
 * colour, the drawing's 256 cells.
 *
 * WHAT IT WRITES (public/sprites/look/shirt/, one PNG a sheet, every pixel
 * opaque so a browser decodes it exactly; read as an RG8 texture):
 *   rows [0, h)  a texel: red its colour NUMBER (0: see-through), green its
 *                FRAME + 1 -- laid out cell for cell as the old path's packed
 *                sheet (gearSheets.packTrimmed), at the display size (the tee
 *                ships at 128, sliced raw: ds 1);
 *   then         the TABLE, two texels an entry: (r, g | b, a), the sheet's own
 *                colour, straight; entries sorted by ROLE: 0 fabric the
 *                pattern and the print never touch (the outline, the shading:
 *                litFabricMask's dark pixels), 1 the LIT fabric they paint;
 *   then         per frame, ten numbers, a texel each (lo | hi): its packed
 *                cell (ax, ay, tx, ty), its pattern anchor (x, y), its print
 *                box (x, y, w, h; w 0: no chest box, no print), frame-local;
 *   last row     the header (the body's, lookPalette.js readSheet): ds 1, n,
 *                the table's first row, the role ends, and at 11 the KIND (2,
 *                a shirt), 12 where the frames' numbers start, 13 how many.
 *   roles.json   per sheet its cells and table size, as the body's manifest.
 *
 * NOTHING HERE DECIDES A PLACEMENT.  The print boxes are the game's own:
 * stampShirtArt's `report` (the record the shirt designer hit-tests with).
 * The lit fabric is litFabricMask itself.  The pattern's anchor is stampPattern's
 * rule (the centroid of the lit fabric, rounded), and the bake then CHECKS its
 * model against composeShirt: every tile of the catalog, four tints, two probe
 * drawings, both mirrors, every texel of every sheet, drawn from the numbers the
 * way the chip will (shade below) against the old path's canvas.  Any texel more
 * than a level of 255 apart fails the bake.
 *
 *   node tools/art/shirt-bake.mjs            (writes public/sprites/look/shirt/)
 *   node tools/art/shirt-bake.mjs --check    (bakes, compares with what is on disk)
 *   node tools/art/shirt-bake.mjs --hashes   (no browser: were they baked from
 *                                            these sheets and this code?)
 *
 * Re-run it when a tshirt stand or jog sheet, playerDecal.js (composeShirt,
 * chestBox, litFabricMask, stampPattern) or the pattern catalog change:
 * precheck's `look-roles` runs --hashes.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { encode, decode } from '../png.mjs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(REPO, 'public/sprites/look/shirt');
const ITEM = 'tshirt';
const POSES = ['stand', 'jog'];
const DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
const PORT = Number(process.env.SHIRT_BAKE_PORT || 5198);
const CHECK = process.argv.includes('--check');
export const SHIRT_KIND = 2;
export const FRAME_NUMS = 10;

export function sheetHash(pose, dir) {
  const h = crypto.createHash('sha1');
  for (const ext of ['png', 'webp']) {
    const f = path.join(REPO, 'public/sprites/gear/shirt', ITEM, `${pose}-${dir}.${ext}`);
    if (fs.existsSync(f)) h.update(fs.readFileSync(f));
  }
  return h.digest('hex').slice(0, 16);
}
/* the code that decides the numbers (role-bake.mjs --hashes reads the list
   from the manifest, `codeFiles`, and checks every set's) */
const CODE_FILES = ['src/rendering/playerDecal.js', 'src/rendering/traits/patternCatalog.js', 'src/rendering/traits/playerArt.js',
  'src/rendering/gearSheets.js', 'src/rendering/lookShirt.js'];
const artFiles = (pose, dir) => ['png', 'webp'].map((x) => `public/sprites/gear/shirt/${ITEM}/${pose}-${dir}.${x}`);
export function codeHash() {
  const h = crypto.createHash('sha1');
  for (const f of CODE_FILES) h.update(fs.readFileSync(path.join(REPO, f)));
  return h.digest('hex').slice(0, 16);
}

/* ── in the page: the game's own modules ── */
async function pageBake({ pose, dir }) {
  const GS = await import('/rendering/gearSheets.js');
  const PD = await import('/rendering/playerDecal.js');
  const PC = await import('/rendering/traits/patternCatalog.js');
  const PA = await import('/rendering/traits/playerArt.js');
  const WI = await import('/rendering/webpImage.js');
  const LS = await import('/rendering/lookShirt.js');
  const sheet = `${pose}-${dir}`;
  /* the sheet as the game reads it (gearSheets loadImg: the .webp twin) */
  const img = await WI.loadWebpOrPng(`/sprites/gear/shirt/tshirt/${sheet}.png?v=${window.__btGearVersion()}`);
  const W = img.naturalWidth, H = img.naturalHeight;
  if (H !== LS.SHIRT_FW) throw new Error(sheet + ': ' + H + ' tall (the shirt bake knows the 128 sheets, sliced raw)');
  const FW = LS.SHIRT_FW, frames = Math.max(1, Math.floor(W / FW));   /* the shader mirrors about this width */
  const read = (cv) => {
    const c = document.createElement('canvas'); c.width = cv.width || cv.naturalWidth; c.height = cv.height || cv.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    g.drawImage(cv, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    c.width = 0; c.height = 0;
    return d;
  };
  const d = read(img);
  /* composeShirt's own masks: the fabric (alpha over 40) and its lit part */
  const alpha = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) if (d[p * 4 + 3] > 40) alpha[p] = 1;
  const lit = PD.litFabricMask(d, alpha, W * H, PD.SHIRT_LIT_MIN);
  /* the print boxes: stampShirtArt's report, from a blank drawing */
  const rep = [];
  PD.composeShirt(img, FW, { art: PA.emptyArt(), report: rep });
  const box = new Array(frames).fill(null);
  for (const r of rep) box[r.frame] = { ox: r.ox - r.frame * FW, oy: r.oy, dw: Math.round(r.cw * PA.ART_W), dh: Math.round(r.ch * PA.ART_H) };
  /* the pattern anchors: stampPattern's centroid of the lit fabric */
  const anc = [];
  for (let f = 0; f < frames; f++) {
    let sx = 0, sy = 0, n = 0;
    for (let y = 0; y < H; y++) for (let x = f * FW; x < Math.min(W, f * FW + FW); x++) {
      if (!lit[y * W + x]) continue;
      sx += x - f * FW; sy += y; n++;
    }
    anc.push(n ? [Math.round(sx / n), Math.round(sy / n)] : [0, 0]);
  }
  /* the table: (role, colour), sorted by role */
  const keyOf = (p) => (lit[p] ? 4294967296 : 0) + ((d[p * 4] << 24) >>> 0) + (d[p * 4 + 1] << 16) + (d[p * 4 + 2] << 8) + d[p * 4 + 3];
  const keys = new Map();
  for (let p = 0; p < W * H; p++) if (d[p * 4 + 3]) keys.set(keyOf(p), 0);
  const sorted = [...keys.keys()].sort((a, b) => a - b);
  if (sorted.length + 1 > 255) throw new Error(sheet + ': ' + sorted.length + ' colours, over 8 bits');
  const table = new Uint8Array((sorted.length + 1) * 4);
  let unlitN = 0;
  sorted.forEach((k, n) => {
    keys.set(k, n + 1);
    const r = Math.floor(k / 4294967296), v = k - r * 4294967296;
    table.set([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255], (n + 1) * 4);
    if (!r) unlitN++;
  });
  const ends = [1 + unlitN, sorted.length + 1];
  /* the layout: the old path's packed cells */
  const packed = GS.packTrimmed(img, FW, H, frames);
  if (!packed) throw new Error(sheet + ': packTrimmed refused');
  const PW = packed.canvas.width, PH = packed.canvas.height;
  packed.canvas.width = 0; packed.canvas.height = 0;
  const cells = packed.cells.map((c) => [c.ax, c.ay, c.tx, c.ty, c.w, c.h, c.blank ? 1 : 0]);
  const nums = new Uint8Array(PW * PH * 2);
  packed.cells.forEach((c, f) => {
    if (c.blank) return;
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      const p = (c.ty + y) * W + f * FW + c.tx + x;
      if (!d[p * 4 + 3]) continue;
      const q = (c.ay + y) * PW + c.ax + x;
      nums[q * 2] = keys.get(keyOf(p));
      nums[q * 2 + 1] = f + 1;
    }
  });
  /* each frame's ten numbers, after the colours: five entries, two 16-bit
     numbers an entry (lookShirt.shirtFrameNum) */
  const ftab = new Uint8Array(frames * 5 * 4);
  for (let f = 0; f < frames; f++) {
    const c = packed.cells[f], b = box[f];
    [c.ax, c.ay, c.tx, c.ty, anc[f][0], anc[f][1], b ? b.ox : 0, b ? b.oy : 0, b ? b.dw : 0, b ? b.dh : 0].forEach((v, k) => {
      if (v < 0 || v > 65535) throw new Error(sheet + ': frame ' + f + ' number ' + k + ' is ' + v);
      ftab[f * 20 + k * 2] = v & 255; ftab[f * 20 + k * 2 + 1] = v >> 8;
    });
  }
  const full = new Uint8Array(table.length + ftab.length);
  full.set(table); full.set(ftab, table.length);
  /* ── the self-check: the model the shader runs (lookShirt.js shirtTexel),
     on the PACKED numbers, against composeShirt's canvas ── */
  const sheetM = { table: full, ends, fw: FW };
  const art1 = (() => { let s = ''; for (let i = 0; i < 256; i++) s += '0123456789abcdef'[(i * 7 + (i >> 4)) % 16]; return s; })();
  const art2 = (() => { let s = ''; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) s += (x < 5 && y > 3) ? '3' : (x === y ? 'f' : (x + y) % 5 === 0 ? '9' : '0'); return s; })();
  const tints = [null, [200, 40, 40], [30, 30, 34], [244, 236, 120]];
  const looks = [];
  tints.forEach((tint, ti) => {
    looks.push({ tint });
    PC.PATTERN_CATALOG.forEach((t, k) => { if ((k + ti) % 2 === 0) looks.push({ tint, pattern: (t.id + ':' + (1 + (k * 3 + ti) % 15)) }); });
    looks.push({ tint, art: ti % 2 ? art1 : art2 });
    looks.push({ tint, art: ti % 2 ? art2 : art1, pattern: 'check:' + (4 + ti) });
  });
  const check = { looks: looks.length * 2, texels: 0, over1: 0, max: 0, worst: null, dressed: 0 };
  const plainRow = LS.shirtRowEntries(null, null, null);
  for (const mirror of [false, true]) {
    for (const L of looks) {
      const pat = L.pattern ? PC.parsePattern(L.pattern, 'shirt') : null;
      const out = read(PD.composeShirt(img, FW, { art: L.art || null, pattern: pat, tint: L.tint, mirror }));
      const row = LS.shirtRowEntries(L.tint, pat, L.art || null);
      packed.cells.forEach((c, f) => {
        if (c.blank) return;
        for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
          const q = (c.ay + y) * PW + c.ax + x;
          const want = LS.shirtTexel(sheetM, row, nums[q * 2] | (nums[q * 2 + 1] << 8), c.ax + x, c.ay + y, mirror);
          const p = ((c.ty + y) * W + f * FW + c.tx + x) * 4;
          const a = out[p + 3];
          const got = [out[p] * a / 255, out[p + 1] * a / 255, out[p + 2] * a / 255, a];
          let m = 0;
          for (let k = 0; k < 4; k++) m = Math.max(m, Math.abs(got[k] - want[k]));
          check.texels++;
          /* a texel the pattern or the print painted (the check is not idle) */
          if (L.pattern || L.art) { const pl = LS.shirtTexel(sheetM, plainRow, nums[q * 2] | (nums[q * 2 + 1] << 8), c.ax + x, c.ay + y, mirror); if (pl[0] !== want[0] || pl[1] !== want[1] || pl[2] !== want[2]) check.dressed++; }
          if (m > check.max) { check.max = +m.toFixed(2); check.worst = { L: JSON.stringify(L), mirror, f, x: c.tx + x, y: c.ty + y, got: got.map((v) => Math.round(v)), want }; }
          if (m > 1.01) check.over1++;
        }
      });
    }
  }
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); };
  return {
    sheet, frames, w: PW, h: PH, colours: sorted.length + 1, entries: sorted.length + 1 + frames * 5, ends, cells, check,
    lit: ends[1] - ends[0], prints: box.filter(Boolean).length,
    nums: b64(nums), table: b64(full),
  };
}

/* the PNG: numbers on top, the table (the colours, then the frames' numbers)
   two pixels an entry, every pixel opaque -- lookPalette.js buildSheet reads it
   as it reads the body's */
function sheetPng(r) {
  const nums = new Uint8Array(Buffer.from(r.nums, 'base64'));
  const table = new Uint8Array(Buffer.from(r.table, 'base64'));
  const tableRows = Math.ceil((r.entries * 2) / r.w);
  const H = r.h + tableRows;
  const px = new Uint8Array(r.w * H * 4);
  for (let q = 0; q < r.w * H; q++) px[q * 4 + 3] = 255;
  for (let q = 0; q < r.w * r.h; q++) { px[q * 4] = nums[q * 2]; px[q * 4 + 1] = nums[q * 2 + 1]; }
  const base = r.w * r.h;
  for (let e = 0; e < r.entries; e++) {
    const o = (base + 2 * e) * 4;
    px[o] = table[e * 4]; px[o + 1] = table[e * 4 + 1];
    px[o + 4] = table[e * 4 + 2]; px[o + 5] = table[e * 4 + 3];
  }
  return { png: encode({ width: r.w, height: H, data: Buffer.from(px.buffer) }), tableRows };
}

async function main() {
  const { createServer } = await import('vite');
  const { chromium } = await import('playwright');
  const server = await createServer({ configFile: path.join(REPO, 'vite.config.js'), logLevel: 'error', server: { port: PORT, strictPort: true, hmr: false, open: false } });
  await server.listen();
  /* a software canvas, as the QA phones' (look-palette.md: nearest halving on
     a GPU canvas is erratic; nothing here halves, but the same box bakes) */
  const opts = { args: ['--no-sandbox', '--disable-gpu'] };
  const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
  if (fs.existsSync(pinned)) opts.executablePath = pinned;
  const browser = await chromium.launch(opts);
  /* P0's manifest (lookPalette.js loadSet): 16-bit numbers (the colour in the
     low byte, the frame + 1 in the high), the shirt's entries of the row */
  const out = { v: 1, version: 'v2.3.3751', set: 'shirt', kind: 'shirt', codeFiles: CODE_FILES, bits: 16, fw: 128, fh: 128, item: ITEM, code: codeHash(),
    roles: ['fabric', 'lit'], roleDefs: [{ name: 'fabric', entry: 8, ref: 0, under: 0 }, { name: 'lit', entry: 8, ref: 0, under: 1 }],
    frameNums: FRAME_NUMS, sheets: {} };
  let bad = 0;
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error('page error:', e.message));
    await page.route('**/__shirtbake', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
    await page.goto(`http://localhost:${PORT}/__shirtbake`);
    if (!CHECK) fs.mkdirSync(OUT, { recursive: true });
    for (const pose of POSES) {
      for (const dir of DIRS) {
        const t0 = Date.now();
        const r = await page.evaluate(pageBake, { pose, dir });
        const { png, tableRows } = sheetPng(r);
        const name = `${pose}-${dir}`;
        const ok = !r.check.over1;
        if (!ok) bad++;
        console.log(`${ok ? 'ok  ' : 'BAD '} ${name.padEnd(15)} ${String(r.w).padStart(4)}x${r.h}+${tableRows}  ${String(r.colours).padStart(3)} colours (${r.lit} lit)  ${r.frames} frames, ${r.prints} print boxes`
          + `  check ${r.check.looks} looks, ${r.check.texels} texels (${r.check.dressed} dressed), ${r.check.over1} over 1, max ${r.check.max}  (${Date.now() - t0} ms)`);
        if (!ok) console.log('  worst: ' + JSON.stringify(r.check.worst));
        out.sheets[name] = { ds: 1, frames: r.frames, w: r.w, h: r.h, tableRows, entries: r.entries, colours: r.colours, ends: r.ends,
          cells: r.cells, art: sheetHash(pose, dir), artFiles: artFiles(pose, dir), bytes: png.length };
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
  if (!CHECK) fs.writeFileSync(path.join(OUT, 'roles.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(bad ? `${bad} sheet(s) failed` : (CHECK ? 'the shirt numbers on disk are a fresh bake' : `wrote ${path.relative(REPO, OUT)}/`));
  process.exit(bad ? 1 : 0);
}

/* --hashes: 0 fresh, 1 a sheet changed since the bake, 2 only the code */
function hashes() {
  const file = path.join(OUT, 'roles.json');
  if (!fs.existsSync(file)) { console.log('no ' + path.relative(REPO, file)); return 1; }
  const m = JSON.parse(fs.readFileSync(file, 'utf8'));
  const stale = [];
  for (const pose of POSES) for (const dir of DIRS) {
    const e = m.sheets[`${pose}-${dir}`];
    if (!e || e.art !== sheetHash(pose, dir)) stale.push(`${pose}-${dir}`);
  }
  if (stale.length) { console.log('shirt numbers baked from other art: ' + stale.join(', ')); return 1; }
  if (m.code !== codeHash()) { console.log('the shirt code changed since the bake (playerDecal.js, patternCatalog.js, playerArt.js, gearSheets.js or lookShirt.js)'); return 2; }
  console.log('the shirt numbers are a bake of these sheets and this code');
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--hashes')) process.exit(hashes());
  main().catch((e) => { console.error(e); process.exit(1); });
}
