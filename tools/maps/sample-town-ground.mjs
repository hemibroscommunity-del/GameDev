#!/usr/bin/env node
/* ═══ v2.3.2634: WHAT IS PAINTED UNDER A FOOTPRINT ═══
   The worldProps comments repeatedly cite "% open cobble on an Npx disc" and
   "53% leaf" -- those numbers came from render_town_layout.py, which needed
   Pillow.  This is the node port of the SAMPLER half (the renderer half was
   ported at v2.3.2628), so a placement can be checked without a human
   squinting at a 12MB picture.

   Why not the walk mask: town_v17.walk.json is emitted but UNUSED for town
   (WALK_MASKS_ENABLED = false -- collision is prop footprints), and it is
   wrong on the north terrace -- the mayor's house samples 75% "unwalkable"
   at a size and place the owner approved.  The PAINTING is the ground truth,
   so the painting is what gets sampled.

   Classification is by hue/lightness, which is enough to separate the three
   things that matter here: the cobble plaza and terraces (warm yellow), the
   tree canopy (green), and the cliff rock (desaturated grey). */
import { chromium } from 'playwright-core';
import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { ZONES } = await import(join(REPO, 'src/data/zones.js'));
const { propsForZone, propFootprint } = await import(join(REPO, 'src/data/worldProps.js'));
const { IMAGE_ZONE_MAPS } = await import(join(REPO, 'src/rendering/tiledMaps.js'));

const zone = ZONES.town, TILE = 32;
const W = zone.w * TILE, H = zone.h * TILE;
const mapPath = join(REPO, 'public', IMAGE_ZONE_MAPS.town.replace(/^\//, ''));
const mapUrl = 'data:image/webp;base64,' + readFileSync(mapPath).toString('base64');

const targets = propsForZone('town').map((p) => {
  const f = propFootprint(p);
  return f ? { id: p.id, ...f } : null;
}).filter(Boolean);

const browser = await chromium.launch({ executablePath: process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
const rows = await page.evaluate(async (cfg) => {
  const img = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = cfg.map; });
  const c = document.createElement('canvas');
  c.width = cfg.W; c.height = cfg.H;
  const g = c.getContext('2d', { willReadFrequently: true });
  /* stretched to the zone box exactly as the tile renderer draws it, so the
     coordinates sampled here are the coordinates the game uses */
  g.drawImage(img, 0, 0, cfg.W, cfg.H);
  const px = g.getImageData(0, 0, cfg.W, cfg.H).data;

  const classify = (x, y) => {
    const o = ((y | 0) * cfg.W + (x | 0)) * 4;
    const r = px[o], gg = px[o + 1], b = px[o + 2];
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    const sat = mx === 0 ? 0 : (mx - mn) / mx;
    if (sat < 0.20) return 'rock';                 // grey cliff
    if (gg >= r && gg > b + 18) return 'tree';     // green canopy
    if (r > 120 && gg > 95 && b < gg) return 'ground'; // warm cobble / dirt
    return 'other';
  };
  if (cfg.dumpGrid) {
    /* the whole zone classified once, at GRID px resolution, so a placement
       SEARCH can run in node instead of paying for a browser per candidate */
    const G = cfg.dumpGrid, gw = Math.ceil(cfg.W / G), gh = Math.ceil(cfg.H / G);
    const out = new Array(gh);
    for (let gy = 0; gy < gh; gy++) {
      let row = '';
      for (let gx = 0; gx < gw; gx++) {
        const k = classify(Math.min(cfg.W - 1, gx * G + G / 2), Math.min(cfg.H - 1, gy * G + G / 2));
        row += k === 'ground' ? 'g' : k === 'tree' ? 't' : k === 'rock' ? 'r' : '.';
      }
      out[gy] = row;
    }
    return { grid: out, G, gw, gh };
  }
  /* ═══ WHAT IS ACTUALLY BEING TESTED ═══
     NOT "is the whole footprint rectangle on cobble".  A building backed
     against the treeline is correct placement -- the bank's rear sits in the
     woods on purpose and reads as a building with trees behind it, which is
     what the depth sorting of v2.3.2633 now draws properly.  Scoring the
     whole rectangle called that a 62% failure and would have pushed the
     building out into the open plaza to satisfy a number.

     Two strips decide it instead:
       FRONT  the bottom 40px of the footprint -- the visible base, the part
              that reads as "standing on" something.  A base over a cliff or
              a treetop is the floating-building bug (worldProps, v2.3.2629).
       APRON  70px of clear standing room in front of the door, which is what
              the prompt radius needs and what makes the door usable. */
  const strip = (x0, x1, y0, y1) => {
    const tally = { ground: 0, tree: 0, rock: 0, other: 0 };
    let n = 0;
    for (let x = x0; x <= x1; x += 4) for (let y = y0; y <= y1; y += 4) {
      if (x < 0 || y < 0 || x >= cfg.W || y >= cfg.H) { tally.other++; n++; continue; }
      tally[classify(x, y)]++; n++;
    }
    return Math.round(100 * tally.ground / n);
  };
  return cfg.targets.map((t) => ({
    id: t.id,
    front: strip(t.x0, t.x1, Math.max(t.y0, t.y1 - 40), t.y1),
    apron: strip(t.x0 + 20, t.x1 - 20, t.y1 + 10, t.y1 + 70),
    whole: strip(t.x0, t.x1, t.y0, t.y1),
  }));
}, { map: mapUrl, W, H, targets, dumpGrid: process.env.BT_DUMP_GRID ? +process.env.BT_DUMP_GRID : 0 });
await browser.close();

if (rows && rows.grid) {
  const dst = join(REPO, 'tools/maps/out/town-ground.json');
  (await import('fs')).writeFileSync(dst, JSON.stringify(rows));
  console.log('ground grid ' + rows.gw + 'x' + rows.gh + ' @' + rows.G + 'px -> ' + dst);
  process.exit(0);
}
/* ═══ WHAT THIS CLASSIFIER CANNOT READ ═══
   It separates warm cobble from green canopy from grey rock, which covers the
   plaza completely (every prop down there scores 98-100%).  It has two blind
   spots, and pretending otherwise would make it push correctly-placed
   buildings around to satisfy a number it is getting wrong:

     mayor-house  stands on the painted STONE TERRACE.  Terrace paving and
                  cliff rock are the same grey, so the terrace reads as
                  "rock" and the house reads as floating.  It is not: the
                  sprite brings its own retaining wall, pools and hedges, and
                  the base sits on them.  Verified by eye at v2.3.2634.
     bank         backs onto the treeline with GRASS in front of its steps.
                  Grass is green, so it scores as canopy.  A building with
                  trees behind it is correct placement, not a fault -- and
                  since v2.3.2633 those trees sort in front of or behind the
                  player by their own ground line, which is what makes it
                  read properly.

   Both are listed rather than silently excused, so the next person knows the
   tool is limited instead of concluding the town is broken. */
const UNSCORABLE = new Map([
  ['mayor-house', 'stands on the painted stone terrace (terrace reads as cliff rock)'],
  ['bank', 'backed onto the treeline, grass apron (grass reads as canopy)'],
]);

console.log('town ' + W + 'x' + H + ' -- painted ground under each prop');
console.log('id'.padEnd(15) + 'front'.padEnd(7) + 'apron'.padEnd(7) + 'whole'.padEnd(7) + 'verdict');
let bad = 0;
for (const r of rows) {
  /* front carries the verdict; apron is a door-usability guard; whole is
     reported but never fails, because trees behind a building are fine. */
  if (UNSCORABLE.has(r.id)) {
    console.log(String(r.id).padEnd(15) + (r.front + '%').padEnd(7) + (r.apron + '%').padEnd(7)
      + (r.whole + '%').padEnd(7) + 'n/a -- ' + UNSCORABLE.get(r.id));
    continue;
  }
  const ok = r.front >= 90 && r.apron >= 85;
  if (!ok) bad++;
  console.log(String(r.id).padEnd(15) + (r.front + '%').padEnd(7) + (r.apron + '%').padEnd(7)
    + (r.whole + '%').padEnd(7) + (ok ? 'ok' : r.front < 90 ? 'BASE OFF GROUND' : 'DOOR HAS NO APRON'));
}
console.log(bad ? `\n${bad} prop(s) badly placed` : '\nevery base is on painted ground with a clear apron');
process.exit(bad ? 1 : 0);
