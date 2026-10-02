#!/usr/bin/env node
/* ═══ v2.3.2975: THE OBJECTS FOR THE GAME, REPACKED A FEW TO A PAGE ═══
 *
 *   node tools/world/repack-objects.mjs <game zip(s) or folder> [--out public/world/objects] [--fresh]
 *
 * Takes the Object Studio's "Download for the game" (one zip, its parts, or
 * a folder they were unpacked into) and writes the game's copy: the
 * manifest and the sprite sheets, packed a few objects a page so every page
 * is a palette PNG (public/tools/objects/atlas.js pagesByColour -- the same
 * packing the studio's own export uses since v2.3.2975).  The owner's zip
 * of 2026-10-02 had one full-colour sheet a land, 15.7 MB; packed this way
 * it is about 5 MB, the same pixels.
 *
 * MERGED, NOT REPLACED: an object already in the game's copy and missing
 * from the zip is kept (the owner's buildings came in a zip of their own
 * the day before the rest).  An object in both takes the zip's.  `--fresh`
 * keeps only the zip's.
 *
 * Every frame is checked against the picture it came from, pixel for pixel,
 * before anything is written.
 */
import fs from 'fs';
import path from 'path';
import { unzip } from '../../public/tools/world/core/zip.js';
import { encodePalettePng } from '../../public/tools/world/core/png8.js';
import { pagesByColour, coloursIn, PAGE_KINDS, standPiece } from '../../public/tools/objects/atlas.js';
import { GROUPS, objectCatalog } from '../../public/tools/objects/catalog.js';
import { decodePNG, encodePNG } from './png.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const OUT = path.resolve(outArg >= 0 ? args[outArg + 1] : path.join(ROOT, 'public/world/objects'));
const FRESH = args.includes('--fresh');
const inputs = args.filter((a, i) => !a.startsWith('--') && (outArg < 0 || i !== outArg + 1));
if (!inputs.length) {
  console.error('usage: node tools/world/repack-objects.mjs <game zip(s) or folder> [--out dir] [--fresh]');
  process.exit(2);
}

/* name -> bytes, from zips and folders alike ('objects/x.png' and 'x.png'
   both answer to 'x.png') */
async function readInput(p) {
  const files = new Map();
  const put = (name, data) => { files.set(name, data); files.set(path.basename(name), data); };
  if (fs.statSync(p).isDirectory()) {
    const walk = (d) => {
      for (const f of fs.readdirSync(d)) {
        const full = path.join(d, f);
        if (fs.statSync(full).isDirectory()) walk(full);
        else put(path.relative(p, full), new Uint8Array(fs.readFileSync(full)));
      }
    };
    walk(p);
  } else {
    for (const e of await unzip(new Uint8Array(fs.readFileSync(p)))) put(e.name, e.data);
  }
  return files;
}

/* Every object's pieces as pictures of their own: { id -> { info, pieces: [{ name, w, h, rgba }] } } */
function piecesOf(files) {
  const mf = files.get('manifest.json');
  if (!mf) throw new Error('no manifest.json');
  const man = JSON.parse(Buffer.from(mf).toString('utf8'));
  if (man.tool !== 'brotown-object-studio' || !man.forGame) throw new Error('not the Object Studio\'s "Download for the game"');
  const pics = new Map();
  const picOf = (atlas) => {
    if (pics.has(atlas)) return pics.get(atlas);
    const a = (man.atlases || []).find((q) => q.name === atlas);
    const png = a && files.get(a.image), sheet = a && files.get(a.sheet);
    const got = png && sheet ? { img: decodePNG(Buffer.from(png)), sheet: JSON.parse(Buffer.from(sheet).toString('utf8')) } : null;
    pics.set(atlas, got);
    return got;
  };
  const out = new Map();
  for (const o of man.objects || []) {
    const pieces = [];
    for (const p of o.pieces || []) {
      const pic = picOf(p.atlas);
      const fr = pic && pic.sheet.frames[p.frame];
      if (!fr) { pieces.length = 0; break; }
      const { x, y, w, h } = fr.frame;
      const rgba = new Uint8ClampedArray(w * h * 4);
      for (let yy = 0; yy < h; yy++) {
        const s = ((y + yy) * pic.img.w + x) * 4;
        rgba.set(pic.img.data.subarray(s, s + w * 4), yy * w * 4);
      }
      pieces.push({ name: p.frame, w, h, rgba });
    }
    if (pieces.length) out.set(o.id, { info: o, pieces });
    else console.warn(`  ${o.id}: a piece is missing from its sprite sheet -- left out`);
  }
  return { man, objects: out };
}

const zips = [];
for (const p of inputs) zips.push(await readInput(path.resolve(p)));
/* a zip in parts: every part carries the manifest; the objects are the sum */
const incoming = new Map();
let made = null;
for (const files of zips) {
  const { man, objects } = piecesOf(files);
  made = made && made > man.made ? made : man.made;
  for (const [id, o] of objects) incoming.set(id, o);
}
const objects = new Map();
let kept = 0;
if (!FRESH && fs.existsSync(path.join(OUT, 'manifest.json'))) {
  const { objects: old } = piecesOf(await readInput(OUT));
  for (const [id, o] of old) if (!incoming.has(id)) { objects.set(id, o); kept++; }
}
for (const [id, o] of incoming) objects.set(id, o);

/* v2.3.2981: an object the catalog says leans (the palms) stands on its
   trunk, every piece leaning the catalog's way -- mirrored if drawn the
   other way (atlas.js standPiece, as the studio's own "Download for the
   game" does); any other keeps its foot at the middle of its bottom row */
const leanOfId = Object.create(null);
for (const e of objectCatalog()) if (e.lean) leanOfId[e.id] = e.lean;
let mirrored = 0;
for (const [id, o] of objects) {
  o.info = { ...o.info, pieces: (o.info.pieces || []).map((p) => ({ ...p })) };
  for (const p of o.pieces) {
    const st = standPiece(leanOfId[id], p.rgba, p.w, p.h);
    if (st.mirrored) { mirrored++; console.log(`  ${p.name}: leaned the other way -- mirrored`); }
    p.rgba = st.rgba;
    const ip = o.info.pieces.find((q) => q.frame === p.name);
    if (ip) ip.foot = st.foot;
  }
}

/* pages, land by land in the studio's order, each object's pieces together */
const pagesOut = [], where = Object.create(null);
for (const g of GROUPS) {
  const objs = [];
  for (const [id, o] of objects) {
    if (o.info.group !== g.id) continue;
    const colours = new Set();
    for (const p of o.pieces) coloursIn(p.rgba, colours);
    objs.push({ id, colours, items: o.pieces.map((p) => ({ name: p.name, w: p.w, h: p.h, rgba: p.rgba })) });
  }
  const pages = pagesByColour(objs, { kinds: PAGE_KINDS[g.id] || Infinity });
  pages.forEach((pg, k) => pagesOut.push({ ...pg, name: `${g.id}-${k + 1}`, group: g.id }));
}

const files = [], atlases = [];
let total = 0;
for (const pg of pagesOut) {
  const rgba = new Uint8ClampedArray(pg.w * pg.h * 4);
  const frames = {};
  for (const it of pg.items) {
    for (let y = 0; y < it.h; y++) rgba.set(it.rgba.subarray(y * it.w * 4, (y + 1) * it.w * 4), ((it.y + y) * pg.w + it.x) * 4);
    frames[it.name] = { frame: { x: it.x, y: it.y, w: it.w, h: it.h }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: it.w, h: it.h }, sourceSize: { w: it.w, h: it.h }, anchor: { x: 0.5, y: 1 } };
    where[it.name] = pg.name;
  }
  const pal = await encodePalettePng(rgba, pg.w, pg.h, { clear: true });
  const png = pal ? Buffer.from(pal) : encodePNG(pg.w, pg.h, rgba);
  /* the page, read back: every frame the very pixels it was given */
  const back = decodePNG(png);
  for (const it of pg.items) {
    for (let y = 0; y < it.h; y++) {
      const a = it.rgba.subarray(y * it.w * 4, (y + 1) * it.w * 4);
      const s = ((it.y + y) * pg.w + it.x) * 4, b = back.data.subarray(s, s + it.w * 4);
      for (let i = 0; i < a.length; i += 4) {
        const same = a[i + 3] === 0 ? b[i + 3] === 0 : a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2] && a[i + 3] === b[i + 3];
        if (!same) throw new Error(`${pg.name}: ${it.name} came back changed at (${(i >> 2)}, ${y})`);
      }
    }
  }
  const sheet = { frames, meta: { app: 'brotown-object-studio', version: '1', image: `${pg.name}.png`, format: 'RGBA8888', size: { w: pg.w, h: pg.h }, scale: '2' } };
  files.push([`${pg.name}.png`, png], [`${pg.name}.json`, Buffer.from(JSON.stringify(sheet))]);
  atlases.push({ name: pg.name, group: pg.group, w: pg.w, h: pg.h, image: `${pg.name}.png`, sheet: `${pg.name}.json`,
    objects: pg.items.length, kinds: pg.objects, palette: !!pal });
  total += png.length;
}

const manifest = {
  tool: 'brotown-object-studio', version: 2, made, forGame: true, repacked: 'v2.3.2975 a few objects a page',
  plan: { id: 'brotown-world', version: 3 }, gamePxPerArtPx: 0.5, atlases,
  objects: [...objects.values()].map(({ info }) => ({ ...info, pieces: info.pieces.map((p) => ({ ...p, atlas: where[p.frame] })) })),
};

fs.mkdirSync(OUT, { recursive: true });
const keep = new Set(['manifest.json', ...files.map(([n]) => n)]);
for (const f of fs.readdirSync(OUT)) if (!keep.has(f) && /\.(png|json)$/.test(f)) fs.unlinkSync(path.join(OUT, f));
for (const [n, data] of files) fs.writeFileSync(path.join(OUT, n), data);
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`${objects.size} objects (${kept} kept from the game's copy${mirrored ? `, ${mirrored} pieces mirrored to lean the catalog's way` : ''}) on ${atlases.length} pages, ${atlases.filter((a) => a.palette).length} of them palette PNGs: ${(total / 1048576).toFixed(2)} MB -> ${path.relative(ROOT, OUT) || OUT}`);
for (const a of atlases) console.log(`  ${a.name.padEnd(12)} ${String(a.w).padStart(4)} x ${String(a.h).padEnd(4)} ${a.kinds.join(', ')}`);
