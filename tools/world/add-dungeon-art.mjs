#!/usr/bin/env node
/* ═══ v2.3.3566: THE DUNGEONS' ART, CUT FROM THE OWNER'S CHATGPT PICTURES ═══
 *
 *   node tools/world/add-dungeon-art.mjs [--dry]
 *
 * The owner, of the dungeons' bare arenas: "instead of code drawn walls give
 * prompt for me to give chatGPT to draw dungeon walls and any other assets you
 * think would be good" -- the prompts are docs/art/DUNGEON-ART-PROMPTS.md
 * (tools/world/dungeon-art-prompts.mjs) -- and then, 2026-10-22, the first
 * four pictures back: "Here's the first 4" -- the Goo Grotto's entrance, its
 * walls, the things that stand inside its arena, and the boss's chest.  The
 * originals are kept in assets/prop-source/dungeons/ (<land>-entrance.png,
 * <land>-walls.png, <land>-inside.png, and chest.png for all four), so this
 * can be run again; a land whose three pictures are not there yet is skipped,
 * and keeps the code-drawn mouth and walls it has today.
 *
 * Each becomes game art by the Object Studio's own steps alone
 * (public/tools/style/process.js), in a headless Chromium as add-ore-art.mjs
 * does: the flat background cut away (keyOut finds it); the objects found BY
 * COUNT (objectsIn) and read like a page (the studio's readingOrder, app.js);
 * each at its own size in game px, at 2 picture px a game px (bible.js
 * PIXEL.gamePxPerArtPx), only ever shrunk, never blown up; 64 colours of its
 * own (ownPalette); trimmed; written as see-through palette PNGs (png8.js).
 *
 *   ENTRANCE  one object, `gameW` game px wide.  `foot` is where its rock
 *             meets the ground, a share of its height (`footAt`, read off the
 *             picture by eye: the front edge of the cave's floor).  The game
 *             stands the picture above that line and lays what lies below it
 *             -- the slime spilling out, the ferns at its foot -- flat on the
 *             ground, under anyone standing on it (rendering/wheelDoors.js).
 *   WALLS     two strips, top to bottom: the wall's FRONT and its TOP, each
 *             made to repeat along its length by the Ground Studio's own cut
 *             (process.js seamlessAlongX: where its two ends look alike, never
 *             a cross-fade), the front `frontH` game px tall and the top at
 *             the same scale.
 *   INSIDE    a sheet of things, found by count and read row by row, each
 *             kind at the size its prompt asked (the tallest -- or, with `w`,
 *             widest -- of a kind at `size` game px, the rest at its scale),
 *             packed into one picture; each frame's `foot` measured as the
 *             ore's is (the middle of its lowest rows' solid run).
 *   CHEST     the shut chest and the open one, at one scale, `gameW` game px
 *             wide shut, packed into one picture.
 *
 * Writes public/world/dungeons/ and src/data/dungeonArt.js (GENERATED).  A
 * picture whose count does not come out is refused whole, never guessed at.
 */
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(REPO, 'assets/prop-source/dungeons');

/* ── what each picture holds, and the size it is drawn ──
   The sizes are the ones the prompts asked for (tools/world/
   dungeon-art-prompts.mjs `entrance.size`, `inside`), a person being 106
   game px (bible.js PIXEL.personGamePx).  `rows` is the sheet's rows, each
   kind's ones in the order the prompt asked for them. */
export const DUNGEON_PICTURES = {
  verdant: {
    entrance: { gameW: 440, footAt: 0.78 },
    walls: { frontH: 120 },
    inside: {
      kinds: {
        pillar: { size: 100 }, torch: { size: 110 }, boulder: { size: 60 },
        mushroom: { size: 38 }, fern: { size: 40 },
        puddle: { size: 90, fit: 'w' }, heap: { size: 70, fit: 'w' },
      },
      rows: [
        ['pillar', 'pillar', 'torch', 'torch', 'boulder', 'boulder', 'boulder'],
        ['mushroom', 'mushroom', 'mushroom', 'fern', 'fern', 'fern'],
        ['puddle', 'puddle', 'puddle', 'heap'],
      ],
    },
  },
};
/* The boss's chest, one for every dungeon: nine tenths as wide as a person is
   tall (the prompt's), shut and open at one scale. */
export const CHEST_PICTURE = { gameW: 96 };

/* The atlases' width (picture px): wide enough for a row of the sheet's
   biggest things, small enough for any phone's texture limit. */
const ATLAS_W = 1024;
const PAD = 2;


async function main() {
  const DRY = process.argv.includes('--dry');
  const require_ = createRequire(path.join(REPO, 'noop.cjs'));
  const { chromium } = require_('playwright-core');
  const lands = Object.keys(DUNGEON_PICTURES).filter((id) => ['entrance', 'walls', 'inside'].every((k) => fs.existsSync(path.join(SRC, `${id}-${k}.png`))));
  const haveChest = fs.existsSync(path.join(SRC, 'chest.png'));
  if (!lands.length && !haveChest) { console.error(`no pictures in ${path.relative(REPO, SRC)}`); process.exit(2); }

  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
  const PUB = path.join(REPO, 'public');
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/__dungeon-art.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><meta charset="utf-8"><body>dungeon art</body>'); }
    const f = path.join(PUB, p);
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const out = { lands: {}, chest: null };
  try {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(`http://127.0.0.1:${server.address().port}/__dungeon-art.html`);
    await page.evaluate(PAGE_LIB);
    const run = async (fn, job) => {
      const got = await page.evaluate(fn, job);
      if (errs.length) throw new Error('the page threw: ' + errs[0]);
      if (got && got.err) throw new Error(got.err);
      return got;
    };
    const b64 = (f) => fs.readFileSync(path.join(SRC, f)).toString('base64');
    for (const id of lands) {
      const spec = DUNGEON_PICTURES[id];
      const mouth = await run(async (j) => window.__cutOne(j), { b64: b64(`${id}-entrance.png`), gameW: spec.entrance.gameW, name: `${id} entrance` });
      const walls = await run(async (j) => window.__cutWalls(j), { b64: b64(`${id}-walls.png`), frontH: spec.walls.frontH, name: `${id} walls` });
      const inside = await run(async (j) => window.__cutSheet(j), { b64: b64(`${id}-inside.png`), kinds: spec.inside.kinds, rows: spec.inside.rows, atlasW: ATLAS_W, pad: PAD, name: `${id} inside` });
      out.lands[id] = { mouth, walls, inside, footAt: spec.entrance.footAt };
      console.log(`  ${id}: entrance ${mouth.w} x ${mouth.h}, wall front ${walls.front.w} x ${walls.front.h} (cut at ${walls.front.overlap}), top ${walls.top.w} x ${walls.top.h} (cut at ${walls.top.overlap}), ${inside.frames.length} things on ${inside.w} x ${inside.h}`);
    }
    if (haveChest) {
      out.chest = await run(async (j) => window.__cutChest(j), { b64: b64('chest.png'), gameW: CHEST_PICTURE.gameW, atlasW: ATLAS_W, pad: PAD, name: 'chest' });
      console.log(`  chest: shut and open on ${out.chest.w} x ${out.chest.h}`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  const OUT = DRY ? fs.mkdtempSync(path.join(os.tmpdir(), 'dungeon-art-')) : path.join(REPO, 'public/world/dungeons');
  fs.mkdirSync(OUT, { recursive: true });
  let bytes = 0, decoded = 0;
  const write = (name, pic) => {
    const data = Buffer.from(pic.png, 'base64');
    bytes += data.length;
    decoded += pic.w * pic.h * 4;
    fs.writeFileSync(path.join(OUT, name), data);
    return `/world/dungeons/${name}`;
  };
  const ART = {};
  for (const [id, L] of Object.entries(out.lands)) {
    const footY = Math.round(L.mouth.h * L.footAt);
    ART[id] = {
      mouth: { url: write(`${id}-mouth.png`, L.mouth), w: L.mouth.w, h: L.mouth.h, foot: [Math.round(L.mouth.w / 2), footY] },
      walls: {
        front: { url: write(`${id}-wall-front.png`, L.walls.front), w: L.walls.front.w, h: L.walls.front.h },
        top: { url: write(`${id}-wall-top.png`, L.walls.top), w: L.walls.top.w, h: L.walls.top.h },
      },
      inside: { url: write(`${id}-inside.png`, L.inside), w: L.inside.w, h: L.inside.h, frames: L.inside.frames },
    };
  }
  let CHEST = null;
  if (out.chest) CHEST = { url: write('chest.png', out.chest), w: out.chest.w, h: out.chest.h, frames: out.chest.frames };

  const stamp = new Date().toISOString();
  const frameRow = (f) => `{ id: ${JSON.stringify(f.id)}, x: ${f.x}, y: ${f.y}, w: ${f.w}, h: ${f.h}, foot: [${f.foot[0]}, ${f.foot[1]}] }`;
  const landJs = Object.entries(ART).map(([id, a]) => `  ${id}: {
    mouth: { url: '${a.mouth.url}', w: ${a.mouth.w}, h: ${a.mouth.h}, foot: [${a.mouth.foot[0]}, ${a.mouth.foot[1]}] },
    walls: {
      front: { url: '${a.walls.front.url}', w: ${a.walls.front.w}, h: ${a.walls.front.h} },
      top: { url: '${a.walls.top.url}', w: ${a.walls.top.w}, h: ${a.walls.top.h} },
    },
    inside: {
      url: '${a.inside.url}', w: ${a.inside.w}, h: ${a.inside.h},
      frames: [
${a.inside.frames.map((f) => '        ' + frameRow(f) + ',').join('\n')}
      ],
    },
  },`).join('\n');
  const chestJs = CHEST ? `{
  url: '${CHEST.url}', w: ${CHEST.w}, h: ${CHEST.h},
  frames: [
${CHEST.frames.map((f) => '    ' + frameRow(f) + ',').join('\n')}
  ],
}` : 'null';
  const js = `/* v2.3.3566: GENERATED by tools/world/add-dungeon-art.mjs -- do not edit by
   hand; run the tool again from assets/prop-source/dungeons/.  The owner's
   ChatGPT pictures of the dungeons (docs/art/DUNGEON-ART-PROMPTS.md), cut by
   the Object Studio's own steps: every size in picture px, 2 a game px.
     mouth   the entrance; \`foot\` where its rock meets the ground (what lies
             below that row is laid flat on the ground: rendering/wheelDoors.js)
     walls   the wall's front and its top, each repeating along its length
     inside  the things that stand in its arena, one picture; each frame's
             \`id\` its kind and number (pillar-1 ...), \`foot\` where it meets
             the ground (the middle of its lowest rows)
   BOSS_CHEST_ART: the boss's chest, \`shut-1\` and \`open-1\`, for every
   dungeon.  Where each thing stands: src/data/dungeonArena.js. */
export const DUNGEON_ART_V = ${JSON.stringify(stamp)};
export const DUNGEON_ART = {
${landJs}
};
export const BOSS_CHEST_ART = ${chestJs};
`;
  const jsPath = DRY ? path.join(OUT, 'dungeonArt.js') : path.join(REPO, 'src/data/dungeonArt.js');
  fs.writeFileSync(jsPath, js);
  console.log(`wrote ${(bytes / 1024).toFixed(0)} KB of pictures (${(decoded / 1048576).toFixed(1)} MB decoded) to ${path.relative(REPO, OUT) || OUT}, and ${path.relative(REPO, jsPath) || jsPath}`);
}

/* ── the page's half: the studio's steps, in the browser ── */
const PAGE_LIB = async () => {
  const P = await import('/tools/style/process.js');
  const { PIXEL } = await import('/tools/style/bible.js');
  const { encodePalettePng } = await import('/tools/world/core/png8.js');
  const ART = 1 / PIXEL.gamePxPerArtPx;          /* picture px a game px (2) */
  const OWN = PIXEL.ownColours || 64;
  const load = async (b64) => P.blobToCanvas(await (await fetch('data:image/png;base64,' + b64)).blob(), 4096);
  const pixels = (c) => c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
  const toB64 = (u8) => { let s = ''; for (let q = 0; q < u8.length; q += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(q, q + 0x8000)); return btoa(s); };
  /* never blown up: a picture drawn smaller than its game size is refused */
  const shrinkTo = (c, w, h, name) => {
    const k = Math.min(w / c.width, h / c.height);
    if (k > 1.0001) throw new Error(`${name} is drawn ${c.width} x ${c.height} px, smaller than the ${Math.round(w)} x ${Math.round(h)} it is shown at: it would be blown up`);
    return P.resize(c, Math.max(1, Math.round(c.width * k)), Math.max(1, Math.round(c.height * k)), true);
  };
  /* one set of colours for every canvas given, each hardened onto it */
  const harden = (cs) => {
    const all = P.mk(Math.max(...cs.map((c) => c.width)), cs.reduce((s, c) => s + c.height, 0));
    const ag = all.getContext('2d', { willReadFrequently: true });
    let y = 0;
    for (const c of cs) { ag.drawImage(c, 0, y); y += c.height; }
    const pal = P.ownPalette(pixels(all), all.width, all.height, OWN);
    for (const c of cs) P.hardenAndMap(c, pal);
    return pal.length;
  };
  const encode = async (c, name) => {
    const png = await encodePalettePng(pixels(c), c.width, c.height, { clear: true });
    if (!png) throw new Error(`${name} would not pack as a palette PNG`);
    return toB64(png);
  };
  /* the foot: the middle of the solid run over the lowest tenth, row by row,
     the middle value kept (add-ore-art.mjs) */
  const footOf = (c) => {
    const w = c.width, h = c.height, d = pixels(c);
    const solid = (x, y) => d[(y * w + x) * 4 + 3] > 24;
    let bottom = h - 1;
    outer: for (; bottom > 0; bottom--) for (let x = 0; x < w; x++) if (solid(x, bottom)) break outer;
    const mids = [];
    for (let y = bottom - Math.max(1, Math.round(h * 0.1)); y <= bottom; y++) {
      if (y < 0) continue;
      let l = -1, r = -1;
      for (let x = 0; x < w; x++) if (solid(x, y)) { if (l < 0) l = x; r = x; }
      if (l >= 0) mids.push((l + r) / 2);
    }
    const s = mids.sort((p, q) => p - q);
    return [Math.round(s.length ? s[s.length >> 1] : w / 2), bottom + 1];
  };
  /* the studio's own readingOrder (objects/app.js): rows by overlap, each
     row left to right */
  const readingOrder = (parts) => {
    const rows = [];
    for (const p of [...parts].sort((a, b) => a.y - b.y)) {
      let best = null, bestO = 0;
      for (const r of rows) {
        const o = Math.min(p.y + p.h, r.y1) - Math.max(p.y, r.y0);
        if (o > bestO) { bestO = o; best = r; }
      }
      if (best && bestO >= 0.4 * Math.min(p.h, best.y1 - best.y0)) {
        best.items.push(p); best.y0 = Math.min(best.y0, p.y); best.y1 = Math.max(best.y1, p.y + p.h);
      } else rows.push({ y0: p.y, y1: p.y + p.h, items: [p] });
    }
    rows.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
    for (const r of rows) r.items.sort((a, b) => (a.x + a.w / 2) - (b.x + b.w / 2));
    return rows.map((r) => r.items);
  };
  /* a shelf packing, tallest first, row by row */
  const pack = (pieces, atlasW, pad) => {
    const order = pieces.map((p, i) => i).sort((a, b) => pieces[b].c.height - pieces[a].c.height);
    let x = pad, y = pad, rowH = 0;
    const at = new Array(pieces.length);
    for (const i of order) {
      const c = pieces[i].c;
      if (x + c.width + pad > atlasW) { x = pad; y += rowH + pad; rowH = 0; }
      at[i] = { x, y };
      x += c.width + pad;
      rowH = Math.max(rowH, c.height);
    }
    const W = Math.max(...pieces.map((p, i) => at[i].x + p.c.width)) + pad, H = y + rowH + pad;
    const atlas = P.mk(W, H), g = atlas.getContext('2d');
    pieces.forEach((p, i) => g.drawImage(p.c, at[i].x, at[i].y));
    return { atlas, at };
  };
  const cutAll = async (b64, want, name) => {
    const { canvas: cut } = P.keyOut(await load(b64));
    const found = P.objectsIn(cut, want, { minArea: 0, relMin: 0.002 });
    if (found.boxes.length !== want) throw new Error(`${name}: found ${found.boxes.length} objects, the picture has ${want}`);
    return { cut, found };
  };

  window.__cutOne = async ({ b64, gameW, name }) => {
    try {
      const { cut, found } = await cutAll(b64, 1, name);
      const piece = P.cropObject(cut, found, found.boxes[0]);
      const c = shrinkTo(piece, gameW * ART, Infinity, name);
      const colours = harden([c]);
      const t = P.trim(c) || c;
      return { w: t.width, h: t.height, colours, png: await encode(t, name) };
    } catch (e) { return { err: String(e && e.message || e) }; }
  };

  window.__cutWalls = async ({ b64, frontH, name }) => {
    try {
      const { cut, found } = await cutAll(b64, 2, name);
      const [frontBox, topBox] = [...found.boxes].sort((a, b) => a.y - b.y);
      /* one scale for both, from the front's height */
      const front0 = P.cropObject(cut, found, frontBox), top0 = P.cropObject(cut, found, topBox);
      const k = (frontH * ART) / front0.height;
      if (k > 1.0001) throw new Error(`${name}: the front is drawn ${front0.height} px tall, smaller than the ${frontH * ART} it is shown at`);
      const strip = (c0) => {
        const d = pixels(c0);
        const r = P.seamlessAlongX(d, c0.width, c0.height);
        const s = P.mk(r.w, r.h);
        s.getContext('2d').putImageData(new ImageData(r.data, r.w, r.h), 0, 0);
        return { c: P.resize(s, Math.max(1, Math.round(r.w * k)), Math.max(1, Math.round(r.h * k)), true), overlap: r.overlap };
      };
      const front = strip(front0), top = strip(top0);
      const colours = harden([front.c, top.c]);
      return {
        colours,
        front: { w: front.c.width, h: front.c.height, overlap: front.overlap, png: await encode(front.c, name + ' front') },
        top: { w: top.c.width, h: top.c.height, overlap: top.overlap, png: await encode(top.c, name + ' top') },
      };
    } catch (e) { return { err: String(e && e.message || e) }; }
  };

  window.__cutSheet = async ({ b64, kinds, rows, atlasW, pad, name }) => {
    try {
      const want = rows.reduce((s, r) => s + r.length, 0);
      const { cut, found } = await cutAll(b64, want, name);
      const got = readingOrder(found.boxes);
      if (got.length !== rows.length || got.some((r, i) => r.length !== rows[i].length)) {
        throw new Error(`${name}: read rows of ${got.map((r) => r.length).join(', ')}, the prompt asked for ${rows.map((r) => r.length).join(', ')}`);
      }
      const ids = rows.flat();
      const raw = got.flat().map((b) => P.cropObject(cut, found, b));
      /* each kind at one scale: its biggest at the kind's size */
      const scale = {};
      for (const kind of Object.keys(kinds)) {
        const K = kinds[kind];
        const mine = raw.filter((_, i) => ids[i] === kind);
        if (!mine.length) continue;
        const big = Math.max(...mine.map((c) => (K.fit === 'w' ? c.width : c.height)));
        scale[kind] = (K.size * ART) / big;
        if (scale[kind] > 1.0001) throw new Error(`${name}: the ${kind} is drawn ${big} px, smaller than the ${K.size * ART} it is shown at`);
      }
      const n = Object.create(null);
      const pieces = raw.map((c0, i) => {
        const kind = ids[i], k = scale[kind];
        n[kind] = (n[kind] || 0) + 1;
        return { id: kind + '-' + n[kind], c: P.resize(c0, Math.max(1, Math.round(c0.width * k)), Math.max(1, Math.round(c0.height * k)), true) };
      });
      const colours = harden(pieces.map((p) => p.c));
      for (const p of pieces) p.c = P.trim(p.c) || p.c;
      const { atlas, at } = pack(pieces, atlasW, pad);
      const frames = pieces.map((p, i) => ({ id: p.id, x: at[i].x, y: at[i].y, w: p.c.width, h: p.c.height, foot: footOf(p.c) }));
      return { w: atlas.width, h: atlas.height, colours, frames, png: await encode(atlas, name) };
    } catch (e) { return { err: String(e && e.message || e) }; }
  };

  window.__cutChest = async ({ b64, gameW, atlasW, pad, name }) => {
    try {
      const { cut, found } = await cutAll(b64, 2, name);
      const [shutBox, openBox] = [...found.boxes].sort((a, b) => a.x - b.x);
      const shut0 = P.cropObject(cut, found, shutBox), open0 = P.cropObject(cut, found, openBox);
      const k = (gameW * ART) / shut0.width;
      if (k > 1.0001) throw new Error(`${name}: the shut chest is drawn ${shut0.width} px wide, smaller than the ${gameW * ART} it is shown at`);
      const pieces = [
        { id: 'shut-1', c: P.resize(shut0, Math.round(shut0.width * k), Math.round(shut0.height * k), true) },
        { id: 'open-1', c: P.resize(open0, Math.round(open0.width * k), Math.round(open0.height * k), true) },
      ];
      const colours = harden(pieces.map((p) => p.c));
      for (const p of pieces) p.c = P.trim(p.c) || p.c;
      const { atlas, at } = pack(pieces, atlasW, pad);
      const frames = pieces.map((p, i) => ({ id: p.id, x: at[i].x, y: at[i].y, w: p.c.width, h: p.c.height, foot: footOf(p.c) }));
      return { w: atlas.width, h: atlas.height, colours, frames, png: await encode(atlas, name) };
    } catch (e) { return { err: String(e && e.message || e) }; }
  };
  return true;
};

/* run last: PAGE_LIB above must be defined first */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
