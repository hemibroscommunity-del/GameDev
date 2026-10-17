#!/usr/bin/env node
/* ═══ v2.3.3298: THE WHEEL'S OBJECTS AND ITS MAP PICTURES, BAKED ═══
 *
 *   node tools/world/bake-wheel-world.mjs            (writes public/world/placed/ and core/placed.js)
 *   node tools/world/bake-wheel-world.mjs --check    (exit 1 if they are stale)
 *
 * The owner, 2026-10-17: "the game map needs to be larger ... Maybe 5x larger
 * map is needed" -- "Rebuild for 5x".  The game's ground worker no longer
 * builds the whole Wheel on the way in: it builds the blocks round you
 * (public/tools/world/core/worldblocks.js).  Two things it took from the
 * whole map cannot be worked out a block at a time, so they are worked out
 * here, once, from the standard plan, and the worker reads them:
 *
 *   objects.bin   where every building, tree, rock and prop stands
 *                 (core/placing.js placeObjects: each keeps clear of the ones
 *                 placed before it, in one order over the whole map), in the
 *                 format of core/placedfile.js;
 *   overview.png  the whole Wheel small, one pixel per OVERVIEW_CELLS x
 *                 OVERVIEW_CELLS cells, in the plan's colours (ground.js
 *                 overviewPixels): the minimap's and the world map's
 *                 underlay, and the ground's while its pieces are laid;
 *   lands.png     which land each of those pixels lies in (overviewLands: its
 *                 region's index in red, 255 on water) -- the flat colours.
 *   detail/i-j.png  v2.3.3319, the long Wheel only: its lands in their flat
 *                 colours at the blocks' own detail (a pixel every
 *                 OVERVIEW_CELLS cells, where its whole picture has one every
 *                 four times that), in DETAIL_TILE-pixel tiles, for the world
 *                 map zoomed in far from you (src/ui/worldMapDetail.js).  A
 *                 tile of one colour (open sea) is no file: placed.js names
 *                 its colour.
 *
 * and public/tools/world/core/placed.js says which, with a fingerprint of all
 * three as the address the worker asks for them at (`?v=`), so a new bake is
 * a new address (public/_headers keeps them a year).
 *
 * Only the standard plan is baked.  The previews (`?bigtown=`, `?plaintown`,
 * `?placing=2`) still build the whole Wheel in the worker, as before.
 *
 * DRIFT: a change to the plan, the placing or the ground's colours -- or,
 * since v2.3.3319, a land's flat colour (src/data/wheelLands.js) -- must
 * re-bake these in the same PR.  tools/world/test-world-core.mjs runs this
 * with --check, and the worker checks the plan's own fingerprint against the
 * file's before it trusts it (planFingerprint).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PLAN, PLAN5 } from '../../public/tools/world/plan.js';
import { buildBlueprint } from '../../public/tools/world/core/layout.js';
import { materialMap, overviewPixels, overviewLands } from '../../public/tools/world/core/ground.js';
import { placeObjects } from '../../public/tools/world/core/placing.js';
import { encodePlaced } from '../../public/tools/world/core/placedfile.js';
import { planFingerprint, overviewCells, OVERVIEW_CELLS, DETAIL_TILE, detailOn } from '../../public/tools/world/core/worldblocks.js';
import { fnv1a } from '../../public/tools/world/core/rng.js';
import { encodePNG } from './png.mjs';
import { landLook, hexRgb } from '../../src/data/wheelLands.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MODULE = path.join(ROOT, 'public/tools/world/core/placed.js');
/* v2.3.3315: both Wheels -- the live one five times longer (plan.js PLAN5)
   in placed5/, the short one in placed/ -- each its own files */
export const WORLD_BAKES = Object.freeze([
  Object.freeze({ name: 'PLACED5', dir: 'placed5', plan: PLAN5 }),
  Object.freeze({ name: 'PLACED', dir: 'placed', plan: PLAN }),
]);

export function bakeWheelWorld(plan = PLAN) {
  const t0 = Date.now();
  const bp = buildBlueprint(plan);
  const mm = materialMap(plan, bp);
  const objects = placeObjects(plan, bp);
  /* v2.3.3315: the overview a pixel per overviewCells(plan) cells: 4 on the
     short Wheel, 16 on the long one (the same ~450 px picture) */
  const k = overviewCells(plan);
  const ov = overviewPixels(bp, mm, k);
  const lands = overviewLands(bp, mm, bp.reg, k);
  const landsRgba = new Uint8ClampedArray(lands.w * lands.h * 4);
  for (let i = 0; i < lands.w * lands.h; i++) { landsRgba[i * 4] = lands.data[i]; landsRgba[i * 4 + 3] = 255; }
  const bin = Buffer.from(encodePlaced(objects));
  const ovPng = encodePNG(ov.w, ov.h, ov.data);
  const landsPng = encodePNG(lands.w, lands.h, landsRgba);
  const plan_ = planFingerprint(plan);
  /* v2.3.3319: the long Wheel's lands up close (detailTiles) -- and they are
     in the address too, so a tile re-baked is fetched again (the short
     Wheel's address is the same as before: its `detail` is null) */
  const detail = detailOn(plan) ? detailTiles(bp, mm) : null;
  const v = detail ? fnv1a(bin, ovPng, landsPng, plan_, ...detail.files.map((f) => f.png), JSON.stringify(detail.fill)) : fnv1a(bin, ovPng, landsPng, plan_);
  return { bin, ovPng, landsPng, v, plan: plan_, n: objects.n, ov: { w: ov.w, h: ov.h }, cells: k, detail, ms: Date.now() - t0 };
}

/* v2.3.3319: the lands in their flat colours a pixel every OVERVIEW_CELLS
   cells -- as wheelTrial.js landsCanvas paints the whole picture: a land's
   pixel its land's colour (src/data/wheelLands.js), water and ground in no
   land (a realm past a gate) the ground's own -- cut into DETAIL_TILE tiles.
   A tile of one colour is no file, its colour in `fill`; the others' `fill`
   is null. */
export function detailTiles(bp, mm) {
  const k = OVERVIEW_CELLS, T = DETAIL_TILE;
  const ov = overviewPixels(bp, mm, k), lands = overviewLands(bp, mm, bp.reg, k);
  const rgbOf = bp.regionIds.map((id) => { const l = landLook(id); return l ? hexRgb(l.color) : null; });
  const cols = Math.ceil(ov.w / T), rows = Math.ceil(ov.h / T);
  const fill = [], files = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x0 = i * T, y0 = j * T, w = Math.min(T, ov.w - x0), h = Math.min(T, ov.h - y0);
      const px = new Uint8ClampedArray(w * h * 4);
      let first = -1, same = true;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const s = (y0 + y) * ov.w + x0 + x, o = (y * w + x) * 4;
          const land = lands.data[s] === 255 ? null : rgbOf[lands.data[s]];
          const r = land ? land[0] : ov.data[s * 4], g = land ? land[1] : ov.data[s * 4 + 1], b = land ? land[2] : ov.data[s * 4 + 2];
          px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255;
          const rgb = (r << 16) | (g << 8) | b;
          if (first < 0) first = rgb; else if (rgb !== first) same = false;
        }
      }
      if (same) fill.push('#' + first.toString(16).padStart(6, '0'));
      else { fill.push(null); files.push({ name: `${i}-${j}.png`, png: encodePNG(w, h, px) }); }
    }
  }
  return { cols, rows, w: ov.w, h: ov.h, fill, files };
}

/* every bake's entry in placed.js: [{ name, dir, ...bakeWheelWorld }] */
export function placedSource(list) {
  const one = (e) => `export const ${e.name} = Object.freeze({
  dir: '${e.dir}',
  v: '${e.v}',
  plan: '${e.plan}',
  objects: 'objects.bin',
  n: ${e.n},
  overview: 'overview.png',
  lands: 'lands.png',
  w: ${e.ov.w},
  h: ${e.ov.h},
  cells: ${e.cells},
  detail: ${e.detail ? `Object.freeze({
    dir: 'detail',
    cells: ${OVERVIEW_CELLS},
    tile: ${DETAIL_TILE},
    w: ${e.detail.w},
    h: ${e.detail.h},
    cols: ${e.detail.cols},
    rows: ${e.detail.rows},
    fill: Object.freeze(${JSON.stringify(e.detail.fill)}),
  })` : 'null'},
});`;
  return `/* GENERATED by tools/world/bake-wheel-world.mjs -- do not edit by hand.
 * v2.3.3298: which baked objects and map pictures the ground worker reads
 * (public/world/<dir>/), and the plan they were baked from: the worker uses
 * them only when its plan's fingerprint is one of these (core/worldblocks.js
 * planFingerprint).  v2.3.3315: one set a Wheel -- PLACED5 the long one
 * (plan.js PLAN5), PLACED the short one (PLAN); \`cells\` blueprint cells an
 * overview pixel.  v2.3.3319: \`detail\` the long one's lands up close, in
 * tiles (<dir>/detail/i-j.png; \`fill\` a one-colour tile's colour, null
 * where there is a file). */
${list.map(one).join('\n')}
export const PLACED_SETS = Object.freeze([${list.map((e) => e.name).join(', ')}]);
`;
}

/* every bake, its files, and placed.js */
export function bakeAllWorlds() {
  const list = WORLD_BAKES.map((w) => ({ name: w.name, dir: w.dir, ...bakeWheelWorld(w.plan) }));
  const files = [];
  /* v2.3.3319: and each set's detail directory, every file it should hold
     (a tile a new bake makes one colour is a file no more) */
  const detailDirs = [];
  for (const e of list) {
    const DIR = path.join(ROOT, 'public/world', e.dir);
    files.push([path.join(DIR, 'objects.bin'), e.bin], [path.join(DIR, 'overview.png'), e.ovPng], [path.join(DIR, 'lands.png'), e.landsPng]);
    const DD = path.join(DIR, 'detail');
    if (e.detail) for (const f of e.detail.files) files.push([path.join(DD, f.name), f.png]);
    detailDirs.push({ dir: DD, names: new Set(e.detail ? e.detail.files.map((f) => f.name) : []) });
  }
  files.push([MODULE, Buffer.from(placedSource(list))]);
  return { list, files, detailDirs };
}

/* v2.3.3319: the files in a detail directory no bake asks for */
function strayDetail(detailDirs) {
  const out = [];
  for (const d of detailDirs) {
    if (!fs.existsSync(d.dir)) continue;
    for (const n of fs.readdirSync(d.dir)) if (!d.names.has(n)) out.push(path.join(d.dir, n));
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { list, files, detailDirs } = bakeAllWorlds();
  const detailNote = (e) => (e.detail ? `, ${e.detail.files.length} of ${e.detail.cols * e.detail.rows} detail tiles (${(e.detail.files.reduce((a, f) => a + f.png.length, 0) / 1024).toFixed(0)} KB)` : '');
  if (process.argv.includes('--check')) {
    const stale = files.filter(([f, data]) => !fs.existsSync(f) || !fs.readFileSync(f).equals(data)).map(([f]) => path.relative(ROOT, f));
    /* v2.3.3319: and no detail tile the bake no longer makes */
    for (const f of strayDetail(detailDirs)) stale.push(path.relative(ROOT, f) + ' (no longer baked)');
    if (stale.length) { console.error(`stale: ${stale.join(', ')} -- run node tools/world/bake-wheel-world.mjs`); process.exit(1); }
    for (const e of list) console.log(`baked world ${e.dir} up to date (${e.n} objects, ${e.ov.w}x${e.ov.h} overview${detailNote(e)}, v ${e.v}, ${e.ms} ms)`);
  } else {
    for (const f of strayDetail(detailDirs)) fs.unlinkSync(f);
    for (const [f, data] of files) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); }
    const listed = files.filter(([f]) => !/[\\/]detail[\\/]/.test(f));
    console.log(`wrote ${listed.map(([f, d]) => `${path.relative(ROOT, f)} (${(d.length / 1024).toFixed(0)} KB)`).join(', ')}`);
    for (const e of list) console.log(`${e.dir}: ${e.n} objects, ${e.ov.w}x${e.ov.h} overview${detailNote(e)}, ${e.ms} ms, v ${e.v}`);
  }
}
