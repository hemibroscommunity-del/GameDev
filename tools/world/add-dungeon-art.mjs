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
 *
 * ═══ v2.3.3567: ...AND WHERE EACH PICTURE MOVES ═══
 * The owner, of the four pictures in the game: "You can use code to make
 * those a bit more animated for the water effects and such. Maybe a little
 * Breeze for the ferns?"  What the game animates is read off the pictures
 * here, so it lines up with the art and moves with any new cut
 * (rendering/grottoFx.js draws it):
 *   slime   each picture's own goo colours, darkest to lightest -- the drops
 *           and bubbles are drawn in them;
 *   drips   the tips of the slime hanging in the cave's mouth and running
 *           down the wall's front, where a drop forms and falls (the mouth's
 *           with the row it lands on: the first lit pixel under its dark);
 *   wet     points spread over a pool of slime (the mouth's floor and the
 *           slime spilling out, each puddle, the junk heap's), where it
 *           bubbles and glints;
 *   fire    a torch post's iron basket: the middle of its lowest open row,
 *           where the flame stands, and how wide the basket is;
 *   caps    points on a mushroom cluster's caps, where its spores rise;
 *   gold    the junk heap's coins, where they glint;
 *   ferns   the entrance's ferns, CUT OUT of it to sway on their own: each
 *           found by a flood fill of its leaves' greens from a seed, inside
 *           boxes (both shares of the picture: `ferns` below), packed under
 *           the picture in the same file; where a fern was, the picture keeps
 *           the fern's darkest green (the shade under its leaves) -- or
 *           nothing, where the leaves hung over the grass -- so a leaf that
 *           sways shows what was under it.
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
    entrance: {
      gameW: 440, footAt: 0.78,
      /* v2.3.3567: the four ferns that sway -- the big ones in front of the
         mound's two corners and the small ones up on its shoulders -- each a
         seed on its leaves and the boxes its flood fill stays in (shares of
         the picture's width and height, read off it by eye) */
      /* v2.3.3567: the drips hanging in its mouth, by eye (shares of the
         picture); each is snapped to the lowest pixel of its drop */
      drips: [[0.357, 0.580], [0.386, 0.617], [0.417, 0.469], [0.505, 0.444], [0.555, 0.544], [0.595, 0.562], [0.653, 0.628]],
      ferns: [
        { id: 'left', seed: [0.184, 0.832], boxes: [[0.089, 0.617, 0.298, 0.989]] },
        { id: 'right', seed: [0.830, 0.832], boxes: [[0.734, 0.739, 0.909, 0.989], [0.809, 0.676, 0.861, 0.739]] },
        { id: 'left-high', seed: [0.114, 0.585], boxes: [[0.032, 0.517, 0.161, 0.671]] },
        { id: 'right-high', seed: [0.894, 0.551], boxes: [[0.843, 0.449, 0.941, 0.649]] },
      ],
    },
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
      const mouth = await run(async (j) => window.__cutMouth(j), { b64: b64(`${id}-entrance.png`), gameW: spec.entrance.gameW, footAt: spec.entrance.footAt, drips: spec.entrance.drips || [], ferns: spec.entrance.ferns || [], pad: PAD, name: `${id} entrance` });
      const walls = await run(async (j) => window.__cutWalls(j), { b64: b64(`${id}-walls.png`), frontH: spec.walls.frontH, name: `${id} walls` });
      const inside = await run(async (j) => window.__cutSheet(j), { b64: b64(`${id}-inside.png`), kinds: spec.inside.kinds, rows: spec.inside.rows, atlasW: ATLAS_W, pad: PAD, name: `${id} inside` });
      out.lands[id] = { mouth, walls, inside, footAt: spec.entrance.footAt };
      console.log(`  ${id}: entrance ${mouth.w} x ${mouth.h} (${mouth.drips.length} drips, ${mouth.wet.length} wet, ${mouth.ferns.map((f) => `${f.id} ${f.w}x${f.h} ${f.px} px`).join(', ')}; file ${mouth.file[0]} x ${mouth.file[1]}), wall front ${walls.front.w} x ${walls.front.h} (cut at ${walls.front.overlap}, ${walls.front.drips.length} drips), top ${walls.top.w} x ${walls.top.h} (cut at ${walls.top.overlap}), ${inside.frames.length} things on ${inside.w} x ${inside.h}`);
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
    const footY = L.mouth.footY;
    /* the mouth's file is the picture with its cut-out ferns packed under it
       (v2.3.3567): `w` x `h` is the picture, `file` the whole */
    const mouthPic = { png: L.mouth.png, w: L.mouth.file[0], h: L.mouth.file[1] };
    ART[id] = {
      mouth: {
        url: write(`${id}-mouth.png`, mouthPic), w: L.mouth.w, h: L.mouth.h, foot: [Math.round(L.mouth.w / 2), footY], file: L.mouth.file,
        slime: L.mouth.slime, drips: L.mouth.drips, wet: L.mouth.wet, ferns: L.mouth.ferns,
      },
      walls: {
        front: { url: write(`${id}-wall-front.png`, L.walls.front), w: L.walls.front.w, h: L.walls.front.h, slime: L.walls.front.slime, drips: L.walls.front.drips },
        top: { url: write(`${id}-wall-top.png`, L.walls.top), w: L.walls.top.w, h: L.walls.top.h },
      },
      inside: { url: write(`${id}-inside.png`, L.inside), w: L.inside.w, h: L.inside.h, slime: L.inside.slime, frames: L.inside.frames },
    };
  }
  let CHEST = null;
  if (out.chest) CHEST = { url: write('chest.png', out.chest), w: out.chest.w, h: out.chest.h, frames: out.chest.frames };

  const stamp = new Date().toISOString();
  /* v2.3.3567: the points and colours a picture moves by */
  const pts = (a) => '[' + a.map((p) => '[' + p.join(', ') + ']').join(', ') + ']';
  const hexes = (a) => '[' + a.map((c) => '0x' + c.toString(16).padStart(6, '0')).join(', ') + ']';
  const extras = (f) => ['fire', 'wet', 'caps', 'gold'].filter((k) => f[k] && f[k].length)
    .map((k) => `, ${k}: ${k === 'fire' ? '[' + f[k].join(', ') + ']' : pts(f[k])}`).join('');
  const frameRow = (f) => `{ id: ${JSON.stringify(f.id)}, x: ${f.x}, y: ${f.y}, w: ${f.w}, h: ${f.h}, foot: [${f.foot[0]}, ${f.foot[1]}]${extras(f)} }`;
  const fernRow = (f) => `{ id: ${JSON.stringify(f.id)}, x: ${f.x}, y: ${f.y}, w: ${f.w}, h: ${f.h}, at: [${f.at[0]}, ${f.at[1]}], base: [${f.base[0]}, ${f.base[1]}] }`;
  const landJs = Object.entries(ART).map(([id, a]) => `  ${id}: {
    mouth: {
      url: '${a.mouth.url}', w: ${a.mouth.w}, h: ${a.mouth.h}, foot: [${a.mouth.foot[0]}, ${a.mouth.foot[1]}], file: [${a.mouth.file[0]}, ${a.mouth.file[1]}],
      slime: ${hexes(a.mouth.slime)},
      drips: ${pts(a.mouth.drips)},
      wet: ${pts(a.mouth.wet)},
      ferns: [
${a.mouth.ferns.map((f) => '        ' + fernRow(f) + ',').join('\n')}
      ],
    },
    walls: {
      front: {
        url: '${a.walls.front.url}', w: ${a.walls.front.w}, h: ${a.walls.front.h},
        slime: ${hexes(a.walls.front.slime)},
        drips: ${pts(a.walls.front.drips)},
      },
      top: { url: '${a.walls.top.url}', w: ${a.walls.top.w}, h: ${a.walls.top.h} },
    },
    inside: {
      url: '${a.inside.url}', w: ${a.inside.w}, h: ${a.inside.h},
      slime: ${hexes(a.inside.slime)},
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
   v2.3.3567, where each moves (rendering/grottoFx.js): \`slime\` a picture's
   goo colours, darkest first; \`drips\` [x, y] the tips a drop falls from (the
   mouth's [x, y, the row it lands on]); \`wet\` points on its slime, where it
   bubbles; a torch's \`fire\` [x, y, width] its basket; a mushroom's \`caps\`;
   the heap's \`gold\`; the mouth's \`ferns\`, each a frame of the file (\`file\`
   its whole size) cut out to sway, \`at\` its corner in the picture and
   \`base\` the point it sways about.
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

  /* ── v2.3.3567: where a picture moves (rendering/grottoFx.js) ── */
  const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  /* the slime: blue, and bright enough to be goo rather than the cave's dark
     blue rock (minB, and how much bluer than red) */
  const slimeTest = (minB, minBR) => (d, i) => d[i + 3] > 24 && d[i + 2] >= minB && d[i + 2] - d[i] >= minBR && d[i + 2] > d[i + 1];
  /* a picture's goo colours: of its eight commonest slime colours, four from
     darkest to lightest (its rim, its body, its sheen, its highlight) */
  const slimeColours = (c, test) => {
    const d = pixels(c), n = Object.create(null);
    for (let i = 0; i < d.length; i += 4) if (test(d, i)) { const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; n[k] = (n[k] || 0) + 1; }
    const L = (k) => lum(k >> 16, (k >> 8) & 255, k & 255);
    const top = Object.keys(n).map(Number).sort((a, b) => n[b] - n[a]).slice(0, 8).sort((a, b) => L(a) - L(b));
    if (top.length < 4) throw new Error('found too few slime colours');
    const m = top.length - 1;
    return [top[0], top[Math.round(m * 0.35)], top[Math.round(m * 0.7)], top[m]];
  };
  /* the pixels of a picture that pass `test` and whose neighbours `inset` px
     away on all four sides pass it too: inside a pool, not on its rim */
  const insidePx = (c, test, inset, y0 = 0, y1 = Infinity) => {
    const d = pixels(c), w = c.width, h = c.height, out = [];
    const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && test(d, (y * w + x) * 4);
    for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) for (let x = 0; x < w; x++) {
      if (at(x, y) && at(x - inset, y) && at(x + inset, y) && at(x, y - inset) && at(x, y + inset)) out.push([x, y]);
    }
    return out;
  };
  /* n points spread over a set: the one nearest its middle first, then each
     the farthest from those taken (whole px, in reading order) */
  const spread = (P, n) => {
    if (!P.length || n <= 0) return [];
    let cx = 0, cy = 0;
    for (const p of P) { cx += p[0]; cy += p[1]; }
    cx /= P.length; cy /= P.length;
    let k = 0, kd = Infinity;
    P.forEach((p, i) => { const dd = (p[0] - cx) ** 2 + (p[1] - cy) ** 2; if (dd < kd) { kd = dd; k = i; } });
    const out = [P[k]];
    const md = P.map((p) => (p[0] - P[k][0]) ** 2 + (p[1] - P[k][1]) ** 2);
    while (out.length < Math.min(n, P.length)) {
      let j = -1, jd = 0;
      for (let i = 0; i < P.length; i++) if (md[i] > jd) { jd = md[i]; j = i; }
      if (j < 0) break;
      out.push(P[j]);
      for (let i = 0; i < P.length; i++) { const dd = (P[i][0] - P[j][0]) ** 2 + (P[i][1] - P[j][1]) ** 2; if (dd < md[i]) md[i] = dd; }
    }
    return out.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  };
  /* the tips a drop falls from: the lowest pixel of a run of slime at least
     `run` long, with no slime under it (`under` says what must be there);
     tips in neighbouring columns are one drip, its lowest kept */
  const dripTips = (c, test, { run, x0 = 0, x1 = Infinity, y0 = 0, y1 = Infinity, under = () => true, join = 5, narrow = 10 }) => {
    const d = pixels(c), w = c.width, h = c.height;
    const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && test(d, (y * w + x) * 4);
    const raw = [];
    for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) {
      for (let y = Math.max(0, y0); y < Math.min(h - 2, y1); y++) {
        if (!at(x, y) || at(x, y + 1) || at(x, y + 2)) continue;
        let len = 0;
        while (len < run && at(x, y - len)) len++;
        if (len < run || !under(d, w, x, y)) continue;
        /* a drip hangs: the slime just above its tip is a narrow stalk, not
           the edge of a sheet of it */
        let l = x, r = x;
        while (l > 0 && at(l - 1, y - 2)) l--;
        while (r < w - 1 && at(r + 1, y - 2)) r++;
        if (r - l + 1 <= narrow) raw.push([x, y]);
      }
    }
    raw.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const out = [];
    let group = [];
    const flush = () => {
      if (!group.length) return;
      const low = group.reduce((m, p) => (p[1] > m[1] ? p : m), group[0]);
      const xs = group.filter((p) => p[1] >= low[1] - 1).map((p) => p[0]);
      out.push([Math.round((Math.min(...xs) + Math.max(...xs)) / 2), low[1]]);
      group = [];
    };
    for (const p of raw) {
      if (group.length && p[0] - group[group.length - 1][0] > join) flush();
      group.push(p);
    }
    flush();
    return out;
  };
  /* the leaves of a fern: green (yellow-green to green), bright ones well
     saturated -- the moss on the rocks round it is paler -- and its dark
     shading inside */
  const leafAt = (d, i) => {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (d[i + 3] <= 24) return false;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx === mn || mx !== g || g < r * 0.9) return false;
    const hue = 60 * ((b - r) / (mx - mn) + 2);
    if (hue < 58 || hue > 135) return false;
    const s = (mx - mn) / mx;
    return mx / 255 > 0.45 ? s >= 0.62 : s >= 0.30;
  };
  /* a torch post's iron basket, where its flame stands: in its top fifth,
     the lowest row with daylight between its bars (3 see-through px inside
     the row's span at least) -- the band under it is the basket's floor --
     as [the row's middle, the row under it, the row's width] */
  const fireOf = (c, id) => {
    const d = pixels(c), w = c.width, h = c.height;
    let best = null;
    for (let y = 0; y < Math.round(h * 0.2); y++) {
      let l = -1, r = -1;
      for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { if (l < 0) l = x; r = x; }
      if (l < 0) continue;
      let holes = 0;
      for (let x = l; x <= r; x++) if (d[(y * w + x) * 4 + 3] <= 24) holes++;
      if (holes >= 3) best = [Math.round((l + r) / 2), y + 1, r - l + 1];
    }
    if (!best) throw new Error(`${id}: found no open basket at its top`);
    return best;
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

  window.__cutMouth = async ({ b64, gameW, footAt, drips: dripAt, ferns, pad, name }) => {
    try {
      const { cut, found } = await cutAll(b64, 1, name);
      const piece = P.cropObject(cut, found, found.boxes[0]);
      const c = shrinkTo(piece, gameW * ART, Infinity, name);
      const colours = harden([c]);
      const t = P.trim(c) || c;
      const W = t.width, H = t.height, footY = Math.round(H * footAt);
      /* v2.3.3567: where it moves.  Its goo; the drips hanging in the cave's
         mouth (over its dark, in the middle of the picture, above the floor),
         each with the row a drop lands on -- the first lit pixel under it;
         and its pools of slime, the cave's floor and what spills out */
      const goo = slimeTest(140, 80);
      const slime = slimeColours(t, goo);
      /* dark: the cave's inside, and the slime's own dark rim (lum under 70) */
      const darkPx = (d, i) => d[i + 3] > 24 && lum(d[i], d[i + 1], d[i + 2]) < 70;
      const d0 = pixels(t);
      /* each drip given by eye, snapped to the lowest slime pixel near it
         with no slime under it -- the bottom of its drop */
      const gooAt = (x, y) => x >= 0 && y >= 0 && x < W && y < H && goo(d0, (y * W + x) * 4);
      const tips = dripAt.map(([fx, fy]) => {
        const gx = Math.round(fx * W), gy = Math.round(fy * H);
        let best = null;
        for (let y = gy - 8; y <= gy + 8; y++) for (let x = gx - 5; x <= gx + 5; x++) {
          if (!gooAt(x, y) || gooAt(x, y + 1) || gooAt(x, y + 2)) continue;
          if (!best || y > best[1] || (y === best[1] && Math.abs(x - gx) < Math.abs(best[0] - gx))) best = [x, y];
        }
        if (!best) throw new Error(`${name}: no drop near the drip at ${gx}, ${gy}`);
        return best;
      });
      /* a drop needs room to fall: 8 px of dark at least */
      const drips = tips.map(([x, y]) => {
        let ly = y + 3;
        while (ly < footY && darkPx(d0, (ly * W + x) * 4) && !goo(d0, (ly * W + x) * 4)) ly++;
        return [x, y, Math.min(footY, ly)];
      }).filter(([, y, ly]) => ly - y >= 8);
      const wet = spread(insidePx(t, goo, 2, footY - 40), 12);
      /* the ferns: each flood-filled from its seed through its leaves,
         inside its boxes, then lifted out */
      const d = pixels(t);
      const taken = new Uint8Array(W * H);
      const cutFerns = [];
      for (const F of ferns) {
        const boxes = F.boxes.map((b) => [Math.round(b[0] * W), Math.round(b[1] * H), Math.round(b[2] * W), Math.round(b[3] * H)]);
        const inside = (x, y) => boxes.some((b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]);
        /* the seed: the leaf pixel nearest the share given */
        const sx = Math.round(F.seed[0] * W), sy = Math.round(F.seed[1] * H);
        let seed = null, sd = Infinity;
        for (let y = sy - 14; y <= sy + 14; y++) for (let x = sx - 14; x <= sx + 14; x++) {
          if (x < 0 || y < 0 || x >= W || y >= H || !inside(x, y) || !leafAt(d, (y * W + x) * 4)) continue;
          const dd = (x - sx) ** 2 + (y - sy) ** 2;
          if (dd < sd) { sd = dd; seed = [x, y]; }
        }
        if (!seed) throw new Error(`${name}: fern ${F.id} has no leaf near its seed`);
        const mask = new Uint8Array(W * H);
        const q = [seed[1] * W + seed[0]];
        mask[q[0]] = 1;
        let n = 0, bx0 = W, by0 = H, bx1 = -1, by1 = -1;
        while (q.length) {
          const p = q.pop(), x = p % W, y = (p - x) / W;
          n++;
          if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
          for (const [X, Y] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
            if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
            const j = Y * W + X;
            if (mask[j] || taken[j] || !inside(X, Y) || !leafAt(d, j * 4)) continue;
            mask[j] = 1;
            q.push(j);
          }
        }
        if (n < 400) throw new Error(`${name}: fern ${F.id} is only ${n} px -- its seed or boxes are off`);
        const pw = bx1 - bx0 + 1, ph = by1 - by0 + 1;
        const pc = P.mk(pw, ph);
        const pg = pc.getContext('2d');
        const img = pg.createImageData(pw, ph);
        let darkest = null, dl = Infinity;
        for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
          const j = y * W + x;
          if (!mask[j]) continue;
          taken[j] = 1;
          const i = j * 4, o = ((y - by0) * pw + (x - bx0)) * 4;
          img.data[o] = d[i]; img.data[o + 1] = d[i + 1]; img.data[o + 2] = d[i + 2]; img.data[o + 3] = 255;
          const L = lum(d[i], d[i + 1], d[i + 2]);
          if (L < dl) { dl = L; darkest = [d[i], d[i + 1], d[i + 2]]; }
        }
        pg.putImageData(img, 0, 0);
        cutFerns.push({ id: F.id, c: pc, at: [bx0, by0], base: (() => { const f = footOf(pc); return [bx0 + f[0], by0 + f[1]]; })(), mask, darkest, px: n });
      }
      /* where each fern was: its darkest green, the shade under its leaves --
         or nothing, where its leaves hung over the grass (a see-through pixel
         of the picture within 3 px) */
      const clearNear = (x, y) => {
        for (let k = -3; k <= 3; k++) for (let m = -3; m <= 3; m++) {
          const X = x + m, Y = y + k;
          if (X < 0 || Y < 0 || X >= W || Y >= H) return true;
          if (d[(Y * W + X) * 4 + 3] <= 24 && !taken[Y * W + X]) return true;
        }
        return false;
      };
      const out = new Uint8ClampedArray(d);
      for (const F of cutFerns) {
        for (let j = 0; j < W * H; j++) {
          if (!F.mask[j]) continue;
          const x = j % W, y = (j - x) / W, i = j * 4;
          if (clearNear(x, y)) { out[i + 3] = 0; continue; }
          out[i] = F.darkest[0]; out[i + 1] = F.darkest[1]; out[i + 2] = F.darkest[2]; out[i + 3] = 255;
        }
      }
      /* the file: the picture, then the ferns in a row under it */
      let x = pad, rowH = 0;
      const y0 = H + pad;
      const place = cutFerns.map((F) => { const at = [x, y0]; x += F.c.width + pad; rowH = Math.max(rowH, F.c.height); return at; });
      if (x > Math.max(W, 4096)) throw new Error(`${name}: the ferns do not fit under the picture`);
      const fileW = Math.max(W, x), fileH = cutFerns.length ? y0 + rowH + pad : H;
      const file = P.mk(fileW, fileH);
      const fg = file.getContext('2d');
      fg.putImageData(new ImageData(out, W, H), 0, 0);
      cutFerns.forEach((F, i) => fg.drawImage(F.c, place[i][0], place[i][1]));
      return {
        w: W, h: H, footY, colours, file: [fileW, fileH], slime, drips, wet,
        ferns: cutFerns.map((F, i) => ({ id: F.id, x: place[i][0], y: place[i][1], w: F.c.width, h: F.c.height, at: F.at, base: F.base, px: F.px })),
        png: await encode(file, name),
      };
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
      /* v2.3.3567: the front's goo, and the tips of the slime running down
         it, each with room to fall to the wall's foot */
      const goo = slimeTest(130, 60);
      const slime = slimeColours(front.c, goo);
      const drips = dripTips(front.c, goo, { run: 8, y0: Math.round(front.c.height * 0.25), y1: front.c.height - 10, join: 6 });
      return {
        colours,
        front: { w: front.c.width, h: front.c.height, overlap: front.overlap, slime, drips, png: await encode(front.c, name + ' front') },
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
      /* v2.3.3567: where each moves -- a puddle's slime and the heap's, the
         heap's coins, a mushroom's caps, a torch's basket */
      const goo = slimeTest(150, 80);
      const slime = slimeColours(atlas, goo);
      const cap = (d, i) => d[i + 3] > 24 && d[i + 1] >= 140 && d[i + 2] >= 150 && d[i] <= 170 && d[i + 2] > d[i] + 30 && d[i + 1] > d[i] + 20;
      const coin = (d, i) => d[i + 3] > 24 && d[i] >= 170 && d[i + 1] >= 120 && d[i + 2] <= 100 && d[i] > d[i + 2] + 80;
      const moves = (p) => {
        const kind = p.id.replace(/-\d+$/, '');
        if (kind === 'puddle') return { wet: spread(insidePx(p.c, goo, 2), 7) };
        if (kind === 'heap') return { wet: spread(insidePx(p.c, goo, 2), 4), gold: spread(insidePx(p.c, coin, 1), 3) };
        if (kind === 'mushroom') return { caps: spread(insidePx(p.c, cap, 1), 4) };
        if (kind === 'torch') return { fire: fireOf(p.c, p.id) };
        return {};
      };
      const frames = pieces.map((p, i) => Object.assign({ id: p.id, x: at[i].x, y: at[i].y, w: p.c.width, h: p.c.height, foot: footOf(p.c) }, moves(p)));
      return { w: atlas.width, h: atlas.height, colours, slime, frames, png: await encode(atlas, name) };
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
