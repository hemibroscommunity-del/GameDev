#!/usr/bin/env node
/* ═══ v2.3.3730: THE ARENA'S ART, CUT FROM THE OWNER'S CHATGPT PICTURES ═══
 *
 *   node tools/world/add-arena-art.mjs [--dry]
 *
 * The owner made the arena's four pictures in ChatGPT, from prompts the
 * Object Studio's own builder made (docs/art/ARENA-ART-PROMPTS.md,
 * tools/world/arena-art-prompts.mjs), and uploaded them with a crowd's cheer.
 * The originals are kept in assets/prop-source/arena/ (ring.png, gate.png,
 * stands.png, props.png), so this can be run again.
 *
 * Each becomes game art by the Object Studio's own steps alone
 * (public/tools/style/process.js), in a headless Chromium as
 * add-dungeon-art.mjs does: the flat magenta cut away (keyOut, with its
 * despill and its holes); the objects found BY COUNT (objectsIn) and read like
 * a page (the studio's readingOrder, objects/app.js); at 2 picture px a game
 * px (bible.js PIXEL.gamePxPerArtPx), ONE scale a sheet, only ever shrunk,
 * never blown up; 64 colours a sheet (ownPalette, hardenAndMap); trimmed;
 * written as see-through palette PNGs (world/core/png8.js).  A sheet whose
 * count does not come out is refused whole, never guessed at.
 *
 *   RING    one object, 640 game px wide.  Players fight INSIDE it, so it is
 *           cut in two: the BACK half (the far rails, drawn behind fighters)
 *           and the FRONT half (the near rails, drawn in front), split along
 *           the oval's far foot line -- every px at or above where the far
 *           fence meets the ground is the back's, every px below it the
 *           front's -- except the two end posts, where the far and near
 *           lines meet: each goes whole to the half its foot is in.  Measured
 *           off it, for collision and placing (`geo`):
 *             cx, cy, rx, ry  the oval the posts stand on (fitted to the
 *                             posts' feet: an axis-aligned ellipse, least
 *                             squares, its far side's and near side's feet);
 *             posts           each post's foot [x, y] (where it meets the
 *                             ground) and its width;
 *             gap             the entrance: `x` the open span between the
 *                             two posts either side of it, `deg` the same as
 *                             angles round the oval (0 east, 90 the front,
 *                             y down), `y` the foot line there.
 *   GATE    one object, 230 game px wide; `posts` its two posts' feet and
 *           widths, `walk` the open span between them [x0, x1].
 *   STANDS  two, the long one 260 game px wide and the short one at its
 *           scale; each with its `line`, its foot line [x0, x1, y].
 *   PROPS   four (horn, rack, brazier, pennant), the tallest 120 game px tall
 *           and the rest at its scale; each with its `foot`.
 *   CHARIOT (v2.3.3743) one object, 320 game px wide, in two layers as the
 *           ring is: `back` (the horse, the pole, the car's floor and far
 *           side) behind its charioteer, `front` (the car's front rail, near
 *           side and near wheel) over his legs; `stand` where his feet go and
 *           `rail` the near side rail's top line (ARENA_PICTURES.chariot).
 *
 * Writes public/world/arena/*.png and src/data/arenaArt.js (GENERATED), and
 * the owner's previews, docs/specs/arena-art/preview.png and (v2.3.3743)
 * chariot.png.  --dry writes all of it to a scratch folder instead.
 */
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(REPO, 'assets/prop-source/arena');
const VER = '2.3.3730';
/* v2.3.3743: the chariot came later; its files carry their own cache key, so
   the first four's URLs (and anything cached under them) stay as they were */
const CHARIOT_VER = '2.3.3743';

/* ── what each picture holds, and the size it is drawn ──
   The sizes are the ones the prompts asked for (arena-art-prompts.mjs), a
   person being 106 game px (bible.js PIXEL.personGamePx).  `names` is the
   sheet's objects in reading order; `by` the one whose `fit` side is `size`
   game px (the rest at its scale), or the biggest when it is not given. */
export const ARENA_PICTURES = {
  ring: { file: 'ring.png', names: ['ring'], fit: 'w', size: 640 },
  /* v2.3.3730: ChatGPT filled the two small pockets between the gate's
     braces and its posts with a bright pinkish red (about 246, 58, 77), not
     the magenta, so keyOut keeps them; they are background, and are cleared
     (every px that bright and that red: 2,326 of them, all in the two
     pockets -- the shield's reds are darker, about 138, 59, 48) */
  gate: { file: 'gate.png', names: ['gate'], fit: 'w', size: 230, pockets: true },
  stands: { file: 'stands.png', names: ['long', 'short'], fit: 'w', size: 260, by: 'long' },
  props: { file: 'props.png', names: ['horn', 'rack', 'brazier', 'pennant'], fit: 'h', size: 120 },
  /* v2.3.3743: the charioteer's chariot (the arena's way in: "an armored bro
     in a chariot who takes you to the arena ... instead of the sheriff").
     One object, 320 game px wide, cut in two as the ring is: the FRONT (the
     car's front rail, its near side and the near wheel, drawn over the
     charioteer's legs) and the BACK (the horse, the pole, the car's floor,
     its far side and far wheel, behind him).  Where the one becomes the
     other is read off the picture by eye, in the ORIGINAL's px
     (assets/prop-source/arena/chariot.png, 1536 x 1024):
       carX    the car's left end: everything left of it (the horse, the
               pole, the reins) is the back's;
       cut     the line from there along the front rail's inner edge, then
               along the top of the near side's gold rail, to the picture's
               right edge: the car's px below it are the front's;
       rail    the near side rail's top, the part of \`cut\` a charioteer's
               legs go behind;
       stand   where a standing charioteer's feet go: the middle of the car,
               between the front rail and the back post, on the floor below
               the near side's top, so the near side hides his boots and
               shins as a car's side would (on the rail's top line itself he
               stood ON the rail, his boots in the open). */
  chariot: {
    file: 'chariot.png', names: ['chariot'], fit: 'w', size: 320,
    carX: 955,
    cut: [[955, 0], [1000, 0], [1000, 300], [1060, 380], [1110, 440], [1150, 522], [1190, 528], [1240, 540], [1340, 546], [1445, 548], [1536, 548]],
    rail: [[1150, 522], [1190, 528], [1240, 540], [1340, 546], [1445, 548]],
    stand: [1255, 610],
  },
};

async function main() {
  const DRY = process.argv.includes('--dry');
  const require_ = createRequire(path.join(REPO, 'noop.cjs'));
  const { chromium } = require_('playwright-core');
  for (const p of Object.values(ARENA_PICTURES)) {
    if (!fs.existsSync(path.join(SRC, p.file))) { console.error(`no ${path.relative(REPO, path.join(SRC, p.file))}`); process.exit(2); }
  }

  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
  const PUB = path.join(REPO, 'public');
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/__arena-art.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><meta charset="utf-8"><body>arena art</body>'); }
    const f = path.join(PUB, p);
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const got = {};
  let preview = null, chariotPreview = null;
  try {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(`http://127.0.0.1:${server.address().port}/__arena-art.html`);
    await page.evaluate(PAGE_LIB);
    const run = async (fn, job) => {
      const r = await page.evaluate(fn, job);
      if (errs.length) throw new Error('the page threw: ' + errs[0]);
      if (r && r.err) throw new Error(r.err);
      return r;
    };
    const b64 = (f) => fs.readFileSync(path.join(SRC, f)).toString('base64');
    for (const [id, spec] of Object.entries(ARENA_PICTURES)) {
      got[id] = await run(async (j) => window.__cutSheet(j), { ...spec, b64: b64(spec.file), name: id });
      console.log(`  ${id}: ${got[id].pieces.map((p) => `${p.id} ${p.w} x ${p.h}`).join(', ')}; ${got[id].colours} colours`);
    }
    /* the ring's sheet keeps its four originals; the chariot has its own */
    preview = await run(async (j) => window.__preview(j), { originals: ['ring', 'gate', 'stands', 'props'].map((id) => b64(ARENA_PICTURES[id].file)) });
    chariotPreview = await run(async (j) => window.__chariotPreview(j), { body: '/sprites/player/stand-east.png' });
  } finally {
    await browser.close();
    server.close();
  }

  const OUT = DRY ? fs.mkdtempSync(path.join(os.tmpdir(), 'arena-art-')) : path.join(REPO, 'public/world/arena');
  fs.mkdirSync(OUT, { recursive: true });
  let bytes = 0, decoded = 0;
  /* every number below in game px (half a picture px), from the picture's
     top-left; `px` the file's own size in picture px */
  const g = (v) => Math.round(v) / 2;
  const gp = (p) => `[${g(p[0])}, ${g(p[1])}]`;
  const sprite = (file, p, extra = '', ver = VER) => {
    const data = Buffer.from(p.png, 'base64');
    bytes += data.length;
    decoded += p.w * p.h * 4;
    fs.writeFileSync(path.join(OUT, file), data);
    return `{ url: '/world/arena/${file}?v=${ver}', px: [${p.w}, ${p.h}], w: ${g(p.w)}, h: ${g(p.h)}, foot: ${gp(p.foot)}${extra} }`;
  };
  const ring = got.ring.pieces[0];
  const R = ring.geo;
  const ringJs = `{
    /* the whole ring, ${g(ring.w)} x ${g(ring.h)}; each half's \`at\` its top-left in it */
    w: ${g(ring.w)}, h: ${g(ring.h)},
    back: ${sprite('ring-back.png', ring.back, `, at: ${gp(ring.back.at)}`)},
    front: ${sprite('ring-front.png', ring.front, `, at: ${gp(ring.front.at)}`)},
    geo: {
      cx: ${g(R.cx)}, cy: ${g(R.cy)}, rx: ${g(R.rx)}, ry: ${g(R.ry)},
      posts: [
${R.posts.map((p) => `        { foot: ${gp(p.foot)}, w: ${g(p.w)} },`).join('\n')}
      ],
      gap: { x: [${g(R.gap.x[0])}, ${g(R.gap.x[1])}], deg: [${R.gap.deg[0]}, ${R.gap.deg[1]}], y: ${g(R.gap.y)} },
    },
  }`;
  const gate = got.gate.pieces[0];
  const gateJs = sprite('gate.png', gate, `, posts: [${gate.posts.map((p) => `{ foot: ${gp(p.foot)}, w: ${g(p.w)} }`).join(', ')}], walk: [${g(gate.walk[0])}, ${g(gate.walk[1])}]`);
  const standsJs = got.stands.pieces.map((p) => `    ${p.id}: ${sprite(`stand-${p.id}.png`, p, `, line: [${g(p.line[0])}, ${g(p.line[1])}, ${g(p.line[2])}]`)},`).join('\n');
  const propsJs = got.props.pieces.map((p) => `    ${p.id}: ${sprite(`prop-${p.id}.png`, p)},`).join('\n');
  const ch = got.chariot.pieces[0];
  const chariotJs = `{
    /* v2.3.3743: the whole chariot, ${g(ch.w)} x ${g(ch.h)}, \`foot\` its middle on the ground */
    w: ${g(ch.w)}, h: ${g(ch.h)}, foot: ${gp(ch.foot)},
    back: ${sprite('chariot-back.png', ch.back, `, at: ${gp(ch.back.at)}`, CHARIOT_VER)},
    front: ${sprite('chariot-front.png', ch.front, `, at: ${gp(ch.front.at)}`, CHARIOT_VER)},
    stand: ${gp(ch.stand)},
    rail: [${ch.rail.map(gp).join(', ')}],
  }`;

  const js = `/* v2.3.3730: GENERATED by tools/world/add-arena-art.mjs -- do not edit by
   hand; run the tool again from assets/prop-source/arena/.  The owner's
   ChatGPT pictures of the arena (docs/art/ARENA-ART-PROMPTS.md), cut by the
   Object Studio's own steps (docs/specs/arena-art.md).
   EVERY NUMBER IS IN GAME PX (a picture px is half of one: draw a sprite at
   scale 0.5), from its picture's top-left; \`px\` is the file's own size in
   picture px.  \`foot\` is where a thing meets the ground (the middle of its
   lowest rows, at its lowest row).
     ring    the rodeo ring in two halves, \`back\` (the far rails, drawn
             behind fighters) and \`front\` (the near rails, drawn in front),
             each placed at \`at\` in the whole ring.  \`geo\`, in the whole
             ring: the oval the posts stand on (\`cx\`, \`cy\`, \`rx\`, \`ry\`),
             each post's foot and width, and the \`gap\` (the entrance): its
             open span \`x\`, the same as angles round the oval \`deg\` (0 east,
             90 the front, y down) and the foot line's \`y\` there.
     gate    the entrance arch; \`posts\` its two posts' feet and widths,
             \`walk\` the open span between them [x0, x1].
     stands  \`long\` and \`short\`, at one scale; \`line\` the foot line
             [x0, x1, y].
     props   \`horn\`, \`rack\`, \`brazier\`, \`pennant\`, at one scale.
   v2.3.3743:
     chariot the charioteer's chariot in two layers, \`back\` (the horse, the
             pole, the car's floor, far side and far wheel) and \`front\` (the
             front rail, the near side and the near wheel, drawn over the
             charioteer's legs), each placed at \`at\` in the whole; \`stand\`
             where a standing charioteer's feet go, \`rail\` the near side
             rail's top line, left to right. */
export const ARENA_ART_V = ${JSON.stringify(VER)};
export const ARENA_ART = {
  ring: ${ringJs},
  gate: ${gateJs},
  stands: {
${standsJs}
  },
  props: {
${propsJs}
  },
  chariot: ${chariotJs},
};
`;
  const jsPath = DRY ? path.join(OUT, 'arenaArt.js') : path.join(REPO, 'src/data/arenaArt.js');
  fs.writeFileSync(jsPath, js);
  const pvDir = DRY ? OUT : path.join(REPO, 'docs/specs/arena-art');
  fs.mkdirSync(pvDir, { recursive: true });
  fs.writeFileSync(path.join(pvDir, 'preview.png'), Buffer.from(preview.png, 'base64'));
  fs.writeFileSync(path.join(pvDir, 'chariot.png'), Buffer.from(chariotPreview.png, 'base64'));
  const colours = Object.entries(got).map(([id, s]) => `${id} ${s.colours}`).join(', ');
  console.log(`  ring: oval at ${g(R.cx)}, ${g(R.cy)}, radii ${g(R.rx)} x ${g(R.ry)} (feet off it by ${g(R.err)} on average), ${R.posts.length} posts, gap ${g(R.gap.x[0])}..${g(R.gap.x[1])} (${R.gap.deg[0]}..${R.gap.deg[1]} deg)`);
  console.log(`  gate: walk ${g(gate.walk[0])}..${g(gate.walk[1])}`);
  console.log(`  chariot: ${g(ch.w)} x ${g(ch.h)}, back ${ch.back.w} x ${ch.back.h} px, front ${ch.front.w} x ${ch.front.h} px, feet at ${gp(ch.stand)}`);
  console.log(`wrote ${(bytes / 1024).toFixed(0)} KB of pictures (${(decoded / 1048576).toFixed(1)} MB decoded; colours ${colours}) to ${path.relative(REPO, OUT) || OUT}, ${path.relative(REPO, jsPath) || jsPath} and the preview (${preview.w} x ${preview.h})`);
}

/* ── the page's half: the studio's steps, in the browser ── */
const PAGE_LIB = async () => {
  const P = await import('/tools/style/process.js');
  const { PIXEL } = await import('/tools/style/bible.js');
  const { encodePalettePng } = await import('/tools/world/core/png8.js');
  const ART = 1 / PIXEL.gamePxPerArtPx;          /* picture px a game px (2) */
  const OWN = PIXEL.ownColours || 64;
  const PERSON = PIXEL.personGamePx || 106;
  const load = async (b64) => P.blobToCanvas(await (await fetch('data:image/png;base64,' + b64)).blob(), 4096);
  const pixels = (c) => c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
  const toB64 = (u8) => { let s = ''; for (let q = 0; q < u8.length; q += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(q, q + 0x8000)); return btoa(s); };
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
  const solidOf = (c) => { const d = pixels(c), w = c.width; return (x, y) => d[(y * w + x) * 4 + 3] > 24; };
  /* the foot: the middle of the solid run over the lowest tenth, row by row,
     the middle value kept (add-ore-art.mjs) */
  const footOf = (c) => {
    const w = c.width, h = c.height, solid = solidOf(c);
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
  /* the runs of columns with anything solid in rows y0..y1 */
  const columnRuns = (c, y0, y1) => {
    const solid = solidOf(c), runs = [];
    let start = -1;
    for (let x = 0; x <= c.width; x++) {
      let on = false;
      if (x < c.width) for (let y = Math.max(0, y0); y <= Math.min(c.height - 1, y1) && !on; y++) on = solid(x, y);
      if (on && start < 0) start = x;
      if (!on && start >= 0) { runs.push([start, x - 1]); start = -1; }
    }
    return runs;
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

  /* ── the ring: its oval, its posts, its gap, and its two halves ── */
  const cutRing = async (c, name) => {
    const W = c.width, H = c.height, solid = solidOf(c);
    /* two outlines, column by column: the bottom of the first solid run from
       the top (the far fence's feet, or an end post's), and the lowest solid
       px (the near fence's feet, or the far fence's through the gap) */
    const far = new Array(W).fill(-1), near = new Array(W).fill(-1);
    for (let x = 0; x < W; x++) {
      let y = 0;
      while (y < H && !solid(x, y)) y++;
      if (y >= H) continue;
      while (y < H && solid(x, y)) y++;
      far[x] = y;
      for (let yy = H - 1; yy >= 0; yy--) if (solid(x, yy)) { near[x] = yy + 1; break; }
    }
    /* a post's foot is where an outline sinks lowest, with a step up either
       side of it: the rails meet a post above its foot, so next to a post the
       outline climbs sharply (a post's own foot is a shallow arc, a rail a
       gentle slope).  A post is about a thirtieth of the ring wide: a lowest
       point within half that either way, grown (a post at most either way)
       while the outline stays within 6 px of it, is a post if the run is a
       third of a post to two posts wide and the outline 4 px past each end
       is 8 px higher at least
       (or nothing).  The end posts' and the far side posts' feet are hidden
       by the rails running down past them, so they are not found: the oval
       is fitted to the rest */
    const POST = Math.round(W / 30);
    const feetOf = (prof) => {
      const out = [];
      for (let x = 0; x < W; x++) {
        if (prof[x] < 0) continue;
        let peak = true;
        for (let u = Math.max(0, x - (POST >> 1)); u <= Math.min(W - 1, x + (POST >> 1)) && peak; u++) peak = prof[u] < prof[x] || (prof[u] === prof[x] && u >= x);
        if (!peak) continue;
        const y = prof[x];
        let x0 = x, x1 = x;
        while (x0 > 0 && x - x0 < POST && prof[x0 - 1] >= y - 6) x0--;
        while (x1 < W - 1 && x1 - x < POST && prof[x1 + 1] >= y - 6) x1++;
        const n = x1 - x0 + 1;
        const up = (u) => u < 0 || u >= W || prof[u] < 0 || prof[u] <= y - 8;
        if (n >= POST / 3 && n <= POST * 2 && up(x0 - 4) && up(x1 + 4)) out.push({ x0, x1, y });
      }
      return out;
    };
    const runs = [...feetOf(far), ...feetOf(near)];
    /* one post seen by both outlines (an end post) is kept once */
    const posts = [];
    for (const r of runs.sort((a, b) => a.x0 - b.x0 || a.y - b.y)) {
      if (posts.some((p) => Math.abs(p.y - r.y) <= 10 && r.x0 <= p.x1 && r.x1 >= p.x0)) continue;
      posts.push(r);
    }
    /* the oval through the posts' feet: A x^2 + B y^2 + C x + D y = 1, least
       squares, each post's columns its own points */
    const pts = [];
    for (const p of posts) for (let x = p.x0; x <= p.x1; x++) pts.push([x, p.y]);
    const M = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], v = [0, 0, 0, 0];
    for (const [x, y] of pts) {
      const r = [x * x, y * y, x, y];
      for (let i = 0; i < 4; i++) { v[i] += r[i]; for (let j = 0; j < 4; j++) M[i][j] += r[i] * r[j]; }
    }
    for (let i = 0; i < 4; i++) {
      let piv = i;
      for (let k = i + 1; k < 4; k++) if (Math.abs(M[k][i]) > Math.abs(M[piv][i])) piv = k;
      [M[i], M[piv]] = [M[piv], M[i]]; [v[i], v[piv]] = [v[piv], v[i]];
      for (let k = 0; k < 4; k++) {
        if (k === i) continue;
        const f = M[k][i] / M[i][i];
        for (let j = i; j < 4; j++) M[k][j] -= f * M[i][j];
        v[k] -= f * v[i];
      }
    }
    const [A, B, Cq, D] = v.map((x, i) => x / M[i][i]);
    const cx = -Cq / (2 * A), cy = -D / (2 * B), F = 1 + A * cx * cx + B * cy * cy;
    const rx = Math.sqrt(F / A), ry = Math.sqrt(F / B);
    if (!(rx > W * 0.3 && ry > H * 0.2 && rx < W && ry < H)) throw new Error(`${name}: the posts' feet make no sensible oval (radii ${rx | 0} x ${ry | 0} on ${W} x ${H})`);
    const off = (x, y) => Math.abs(Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);
    const err = pts.reduce((s, [x, y]) => s + off(x, y), 0) / pts.length;
    if (posts.length < 10) throw new Error(`${name}: found only ${posts.length} posts`);
    const farY = (x) => { const u = (x - cx) / rx; return Math.abs(u) >= 1 ? cy : cy - ry * Math.sqrt(1 - u * u); };
    const nearY = (x) => { const u = (x - cx) / rx; return Math.abs(u) >= 1 ? cy : cy + ry * Math.sqrt(1 - u * u); };
    /* the gap: the run of columns round the middle whose lowest px is the far
       fence's (nothing stands on the near foot line) */
    const open = (x) => near[x] < 0 || near[x] < (farY(x) + nearY(x)) / 2;
    let g0 = Math.round(cx), g1 = g0;
    if (!open(g0)) {
      /* the entrance may not be dead centre: the nearest open column */
      let k = 1;
      while (k < W / 4 && !open(g0 - k) && !open(g0 + k)) k++;
      if (k >= W / 4) throw new Error(`${name}: found no gap in the front`);
      g0 = g1 = open(g0 - k) ? g0 - k : g0 + k;
    }
    while (g0 > 0 && open(g0 - 1)) g0--;
    while (g1 < W - 1 && open(g1 + 1)) g1++;
    if (g1 - g0 < PERSON * ART) throw new Error(`${name}: the gap is ${g1 - g0 + 1} px, narrower than a person is tall`);
    const deg = (x) => Math.round(Math.atan2(Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2)), (x - cx) / rx) * 1800 / Math.PI) / 10;
    /* the two halves: every px at or above the far foot line is the back's
       (2 px of margin under it, so the far posts' feet stay whole), every px
       below it the front's -- except the end posts, whose columns go whole
       to the half their foot is in */
    const split = new Array(W);
    for (let x = 0; x < W; x++) split[x] = Math.round(farY(x)) + 2;
    /* the end posts (their feet are hidden, so not among \`posts\`): from
       each side of the picture to where its top outline jumps (past its cap
       the next thing up is a rail, lower, or a far post, higher), each whole in the half its
       lowest px is in */
    const topY = (x) => { let y = 0; while (y < H && !solid(x, y)) y++; return y; };
    for (const dir of [1, -1]) {
      const edge = dir > 0 ? 0 : W - 1;
      let x = edge + dir;
      while (Math.abs(x - edge) < POST * 2 && Math.abs(topY(x) - topY(x - dir)) <= 8) x += dir;
      if (Math.abs(x - edge) >= POST * 2) throw new Error(`${name}: found no end post at the ${dir > 0 ? 'left' : 'right'}`);
      const [a, b] = dir > 0 ? [0, x - 1] : [x + 1, W - 1];
      let low = -1;
      for (let u = a; u <= b; u++) low = Math.max(low, near[u]);
      for (let u = a; u <= b; u++) split[u] = low > cy ? 0 : H;
    }
    const d = pixels(c);
    const half = (back) => {
      const o = new Uint8ClampedArray(d.length);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if ((y < split[x]) !== back) continue;
        const i = (y * W + x) * 4;
        o[i] = d[i]; o[i + 1] = d[i + 1]; o[i + 2] = d[i + 2]; o[i + 3] = d[i + 3];
      }
      /* trimmed, its corner kept so it lines up with the other */
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (o[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const full = P.mk(W, H);
      full.getContext('2d').putImageData(new ImageData(o, W, H), 0, 0);
      const t = P.mk(x1 - x0 + 1, y1 - y0 + 1);
      t.getContext('2d').drawImage(full, x0, y0, t.width, t.height, 0, 0, t.width, t.height);
      return { c: t, at: [x0, y0] };
    };
    const back = half(true), front = half(false);
    const pieceOf = async (h, nm) => ({ w: h.c.width, h: h.c.height, at: h.at, foot: footOf(h.c), png: await encode(h.c, nm) });
    return {
      back: await pieceOf(back, name + ' back'), front: await pieceOf(front, name + ' front'),
      geo: {
        cx, cy, rx, ry, err,
        posts: posts.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)).map((p) => ({ foot: [(p.x0 + p.x1 + 1) / 2, p.y], w: p.x1 - p.x0 + 1 })),
        gap: { x: [g0, g1 + 1], deg: [deg(g1 + 1), deg(g0)], y: nearY((g0 + g1 + 1) / 2) },
      },
      canvases: { back: back.c, front: front.c },
    };
  };

  /* the gate's two posts: the column runs of its lowest fifth, the outer two */
  const gatePosts = (c, name) => {
    const runs = columnRuns(c, Math.round(c.height * 0.8), c.height - 1);
    if (runs.length !== 2) throw new Error(`${name}: found ${runs.length} posts at its foot, not 2`);
    const solid = solidOf(c);
    const foot = (r) => { let y = c.height - 1; for (; y > 0; y--) { let any = false; for (let x = r[0]; x <= r[1] && !any; x++) any = solid(x, y); if (any) break; } return [(r[0] + r[1] + 1) / 2, y + 1]; };
    return { posts: runs.map((r) => ({ foot: foot(r), w: r[1] - r[0] + 1 })), walk: [runs[0][1] + 1, runs[1][0]] };
  };
  /* a stand's foot line: its legs' span in its lowest tenth, at its lowest row */
  const footLine = (c) => {
    const runs = columnRuns(c, Math.round(c.height * 0.9), c.height - 1);
    return [runs[0][0], runs[runs.length - 1][1] + 1, footOf(c)[1]];
  };

  const kept = {};
  /* v2.3.3743: the chariot's two layers.  The by-eye lines are in the
     original's px; the object's box in the keyed original maps them onto the
     cut (shrunk by k, trimmed to the object) */
  const cutChariot = async (c, cut, raw, spec, name) => {
    const W = c.width, H = c.height;
    /* the object's box in the keyed original: must be the cut's own, or the
       lines would land off it */
    const cd = pixels(cut);
    let x0 = cut.width, y0 = cut.height, x1 = -1, y1 = -1;
    for (let y = 0; y < cut.height; y++) for (let x = 0; x < cut.width; x++) if (cd[(y * cut.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (Math.abs((x1 - x0 + 1) - raw.width) > 2 || Math.abs((y1 - y0 + 1) - raw.height) > 2) throw new Error(`${name}: the object's box (${x1 - x0 + 1} x ${y1 - y0 + 1}) is not the cut's (${raw.width} x ${raw.height}): a speck outside it?`);
    const sx = W / raw.width, sy = H / raw.height;
    const map = ([x, y]) => [(x - x0) * sx, (y - y0) * sy];
    const line = (pts) => {
      const m = pts.map(map);
      return (x) => {
        if (x <= m[0][0]) return m[0][1];
        for (let i = 1; i < m.length; i++) {
          if (x <= m[i][0]) {
            const [ax, ay] = m[i - 1], [bx, by] = m[i];
            return bx === ax ? Math.min(ay, by) : ay + (by - ay) * (x - ax) / (bx - ax);
          }
        }
        return m[m.length - 1][1];
      };
    };
    const carX = map([spec.carX, 0])[0], cutY = line(spec.cut);
    const d = pixels(c);
    const layer = (front) => {
      const o = new Uint8ClampedArray(d.length);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if ((x >= carX && y >= cutY(x + 0.5)) !== front) continue;
        const i = (y * W + x) * 4;
        o[i] = d[i]; o[i + 1] = d[i + 1]; o[i + 2] = d[i + 2]; o[i + 3] = d[i + 3];
      }
      let a0 = W, b0 = H, a1 = -1, b1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (o[(y * W + x) * 4 + 3] > 24) { if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y; }
      if (a1 < 0) throw new Error(`${name}: the ${front ? 'front' : 'back'} layer came out empty`);
      const full = P.mk(W, H);
      full.getContext('2d').putImageData(new ImageData(o, W, H), 0, 0);
      const t = P.mk(a1 - a0 + 1, b1 - b0 + 1);
      t.getContext('2d').drawImage(full, a0, b0, t.width, t.height, 0, 0, t.width, t.height);
      return { c: t, at: [a0, b0] };
    };
    const back = layer(false), front = layer(true);
    const pieceOf = async (h, nm) => ({ w: h.c.width, h: h.c.height, at: h.at, foot: footOf(h.c), png: await encode(h.c, nm) });
    const r = (p) => p.map((v) => Math.round(v));
    return {
      back: await pieceOf(back, name + ' back'), front: await pieceOf(front, name + ' front'),
      stand: r(map(spec.stand)), rail: spec.rail.map((p) => r(map(p))),
      canvases: { back: back.c, front: front.c, backAt: back.at, frontAt: front.at },
    };
  };

  window.__cutSheet = async ({ b64, names, fit, size, by, pockets, name, ...spec }) => {
    try {
      const { canvas: cut } = P.keyOut(await load(b64));
      if (pockets) {
        const g = cut.getContext('2d', { willReadFrequently: true });
        const img = g.getImageData(0, 0, cut.width, cut.height), d = img.data;
        for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 90 && d[i + 2] > 55 && d[i + 2] < 110) d[i + 3] = 0;
        g.putImageData(img, 0, 0);
      }
      const found = P.objectsIn(cut, names.length, { minArea: 0, relMin: 0.002 });
      if (found.boxes.length !== names.length) throw new Error(`${name}: found ${found.boxes.length} objects, the picture has ${names.length}`);
      const rows = readingOrder(found.boxes);
      if (rows.length !== 1) throw new Error(`${name}: read ${rows.length} rows (${rows.map((r) => r.length).join(', ')}), the picture has one`);
      const raw = rows[0].map((b) => P.cropObject(cut, found, b));
      /* one scale for the sheet: `by` (or the biggest) at `size` game px */
      const side = (cv) => (fit === 'w' ? cv.width : cv.height);
      const ref = by ? side(raw[names.indexOf(by)]) : Math.max(...raw.map(side));
      const k = (size * ART) / ref;
      if (k > 1.0001) throw new Error(`${name}: drawn ${ref} px, smaller than the ${size * ART} it is shown at: it would be blown up`);
      const cs = raw.map((c0) => P.resize(c0, Math.max(1, Math.round(c0.width * k)), Math.max(1, Math.round(c0.height * k)), true));
      const colours = harden(cs);
      const pieces = [];
      for (let i = 0; i < cs.length; i++) {
        const c = P.trim(cs[i]) || cs[i];
        const id = names[i];
        if (name === 'chariot') {
          const r = await cutChariot(c, cut, raw[i], spec, name);
          kept.chariot = { whole: c, ...r.canvases, stand: r.stand, rail: r.rail };
          pieces.push({ id, w: c.width, h: c.height, foot: footOf(c), back: r.back, front: r.front, stand: r.stand, rail: r.rail });
          continue;
        }
        if (name === 'ring') {
          const r = await cutRing(c, name);
          kept.ring = { whole: c, ...r.canvases, backAt: r.back.at, frontAt: r.front.at, geo: r.geo };
          pieces.push({ id, w: c.width, h: c.height, back: r.back, front: r.front, geo: r.geo });
          continue;
        }
        const p = { id, w: c.width, h: c.height, foot: footOf(c), png: await encode(c, `${name} ${id}`) };
        if (name === 'gate') Object.assign(p, gatePosts(c, name));
        if (name === 'stands') p.line = footLine(c);
        kept[`${name}-${id}`] = { c, ...p };
        pieces.push(p);
      }
      return { colours, k, pieces };
    } catch (e) { return { err: String(e && e.message || e) }; }
  };

  /* ── the owner's preview: every piece at its game size (at 2 picture px a
     game px, as the files are) on grass, the ring's halves put together with
     a stand-in person inside (a plain 106 game px figure: never the bro's
     art), and the four originals small down the side ── */
  window.__preview = async ({ originals }) => {
    try {
      const PAD = 40, PERSON_PX = PERSON * ART;
      const R = kept.ring;
      const others = Object.entries(kept).filter(([k]) => k !== 'ring' && k !== 'chariot');
      const rowW = others.reduce((s, [, p]) => s + p.c.width + PAD, PAD);
      const rowH = Math.max(...others.map(([, p]) => p.c.height));
      const thumbs = await Promise.all(originals.map(load));
      const TH = 300;
      const thumbW = Math.max(...thumbs.map((t) => Math.round(t.width * TH / t.height)));
      const W = Math.max(R.whole.width + PAD * 2, rowW) + thumbW + PAD;
      const H = PAD + R.whole.height + 150 + rowH + PAD;
      const c = P.mk(W, Math.max(H, PAD + thumbs.length * (TH + PAD)));
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.fillStyle = '#5f8a3e';
      g.fillRect(0, 0, c.width, c.height);
      /* a little grass texture so it reads as ground */
      let seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      g.fillStyle = '#57803a';
      for (let i = 0; i < c.width * c.height / 90; i++) g.fillRect((rnd() * c.width) | 0, (rnd() * c.height) | 0, 2, 4);
      const label = (s, x, y) => { g.font = 'bold 20px sans-serif'; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillText(s, x + 2, y + 2); g.fillStyle = '#fff'; g.fillText(s, x, y); };
      /* a stand-in person: a plain dark figure, feet at (x, y) */
      const person = (x, y, col) => {
        const h = PERSON_PX, w = Math.round(h * 0.36);
        g.fillStyle = col;
        g.beginPath(); g.arc(x, y - h + w * 0.45, w * 0.45, 0, Math.PI * 2); g.fill();
        g.fillRect(x - w / 2, y - h + w * 0.9, w, h * 0.5);
        g.fillRect(x - w / 2, y - h * 0.4, w * 0.42, h * 0.4);
        g.fillRect(x + w * 0.08, y - h * 0.4, w * 0.42, h * 0.4);
      };
      /* the ring: back half, two stand-ins inside, front half over them */
      const ox = PAD, oy = PAD + 30;
      label(`ring: back + front halves, ${R.whole.width / ART} x ${R.whole.height / ART} game px; ${PERSON}-px stand-ins, two inside and one at the entrance`, ox, oy - 8);
      g.drawImage(R.back, ox + R.backAt[0], oy + R.backAt[1]);
      const G = R.geo;
      person(ox + G.cx - G.rx * 0.3, oy + G.cy + G.ry * 0.25, '#2b2f45');
      person(ox + G.cx + G.rx * 0.35, oy + G.cy - G.ry * 0.15, '#4a2b45');
      g.drawImage(R.front, ox + R.frontAt[0], oy + R.frontAt[1]);
      /* outside, in front of the entrance */
      person(ox + (G.gap.x[0] + G.gap.x[1]) / 2, oy + G.gap.y + 40, '#2b2f45');
      /* the measured oval and the gap, faint */
      g.strokeStyle = 'rgba(255,240,120,.55)'; g.lineWidth = 2; g.setLineDash([6, 8]);
      g.beginPath(); g.ellipse(ox + G.cx, oy + G.cy, G.rx, G.ry, 0, 0, Math.PI * 2); g.stroke();
      g.setLineDash([]);
      g.fillStyle = 'rgba(255,240,120,.9)';
      for (const p of G.posts) g.fillRect(ox + p.foot[0] - 3, oy + p.foot[1] - 3, 6, 6);
      g.fillStyle = 'rgba(120,220,255,.9)';
      g.fillRect(ox + G.gap.x[0], oy + G.gap.y - 2, G.gap.x[1] - G.gap.x[0], 4);
      /* the rest in a row under it, feet on one line */
      let x = PAD;
      const base = oy + R.whole.height + 150 + rowH;
      for (const [k, p] of others) {
        label(k.replace(/^[a-z]+-/, ''), x, base - p.foot[1] - 36);
        label(`${p.w / ART} x ${p.h / ART}`, x, base - p.foot[1] - 10);
        g.drawImage(p.c, x, base - p.foot[1]);
        if (p.walk) person(x + (p.walk[0] + p.walk[1]) / 2, base, '#2b2f45');
        x += p.c.width + PAD;
      }
      /* the originals, small, down the side */
      const tx = W - thumbW - PAD / 2;
      label('the originals', tx, PAD - 8);
      let ty = PAD;
      g.imageSmoothingEnabled = true;
      for (const t of thumbs) {
        const w = Math.round(t.width * TH / t.height);
        g.drawImage(t, tx, ty, w, TH);
        ty += TH + PAD / 2;
      }
      /* 256 colours of its own, so the page stays small */
      P.hardenAndMap(c, P.ownPalette(pixels(c), c.width, c.height, 256));
      return { w: c.width, h: c.height, png: await encode(c, 'the preview') };
    } catch (e) { return { err: String(e && e.message || e) }; }
  };

  /* ── v2.3.3743: the chariot's preview: its back, a stand-in charioteer
     (the game's own body, stand-east turned to face the horse, 106 game px
     tall: never ChatGPT's), its front over him; at 1x (a px a game px) and
     2x (a px a picture px, as the files are), with the rail's top line and
     the feet marked on a third copy at 2x ── */
  window.__chariotPreview = async ({ body }) => {
    try {
      const C = kept.chariot;
      const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('no body art at ' + body)); im.src = body; });
      const bc = P.mk(img.width, img.height);
      bc.getContext('2d').drawImage(img, 0, 0);
      /* the body's own px: its box, turned to face west, at a person's height */
      const bt = P.trim(bc);
      const bh = PERSON * ART;
      const bw = Math.round(bt.width * bh / bt.height);
      const bro = P.mk(bw, bh), bg = bro.getContext('2d');
      bg.imageSmoothingEnabled = false;
      bg.translate(bw, 0); bg.scale(-1, 1);
      bg.drawImage(bt, 0, 0, bw, bh);
      const PAD = 40;
      const W2 = C.whole.width, H2 = C.whole.height + bh;   /* room above for his head */
      const c = P.mk(PAD * 3 + W2 / 2 + W2, PAD * 3 + Math.max(H2 / 2, H2) + H2 + 40);
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.fillStyle = '#5f8a3e';
      g.fillRect(0, 0, c.width, c.height);
      let seed = 11;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      g.fillStyle = '#57803a';
      for (let i = 0; i < c.width * c.height / 90; i++) g.fillRect((rnd() * c.width) | 0, (rnd() * c.height) | 0, 2, 4);
      const label = (s, x, y) => { g.font = 'bold 20px sans-serif'; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillText(s, x + 2, y + 2); g.fillStyle = '#fff'; g.fillText(s, x, y); };
      /* the chariot at scale s, its top-left at (x, y + bh*s) */
      const draw = (x, y, s, marks) => {
        const top = y + bh * s;
        g.drawImage(C.back, x + C.backAt[0] * s, top + C.backAt[1] * s, C.back.width * s, C.back.height * s);
        g.drawImage(bro, x + C.stand[0] * s - bw * s / 2, top + C.stand[1] * s - bh * s, bw * s, bh * s);
        g.drawImage(C.front, x + C.frontAt[0] * s, top + C.frontAt[1] * s, C.front.width * s, C.front.height * s);
        if (!marks) return;
        g.strokeStyle = 'rgba(120,220,255,.95)'; g.lineWidth = 2;
        g.beginPath();
        C.rail.forEach(([rx, ry], i) => (i ? g.lineTo : g.moveTo).call(g, x + rx * s, top + ry * s));
        g.stroke();
        g.fillStyle = 'rgba(255,240,120,.95)';
        g.fillRect(x + C.stand[0] * s - 4, top + C.stand[1] * s - 4, 8, 8);
      };
      label(`1x: ${C.whole.width / ART} x ${C.whole.height / ART} game px`, PAD, PAD - 8);
      draw(PAD, PAD, 0.5, false);
      label('2x (picture px, as the files are)', PAD * 2 + W2 / 2, PAD - 8);
      draw(PAD * 2 + W2 / 2, PAD, 1, false);
      const y3 = PAD * 2 + H2 + 30;
      label('2x, the rail\'s top line (blue) and where his feet go (yellow)', PAD * 2 + W2 / 2, y3 - 8);
      draw(PAD * 2 + W2 / 2, y3, 1, true);
      label('the layers apart: back, front', PAD, y3 - 8);
      g.drawImage(C.back, PAD, y3 + 20, C.back.width / 2, C.back.height / 2);
      g.drawImage(C.front, PAD, y3 + 40 + C.back.height / 2, C.front.width / 2, C.front.height / 2);
      P.hardenAndMap(c, P.ownPalette(pixels(c), c.width, c.height, 256));
      return { w: c.width, h: c.height, png: await encode(c, 'the chariot preview') };
    } catch (e) { return { err: String(e && e.message || e) }; }
  };
  return true;
};

/* run last: PAGE_LIB above must be defined first */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
