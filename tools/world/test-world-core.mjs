/* ═══ v2.3.2931: WORLD BUILDER CORE — zero-dependency Node suite ═══
 *
 * The pure modules under public/tools/world/core, without a browser:
 *
 *   grid      names, rectangles, the overlap arithmetic, the frame and the
 *             active area, which square a tap means
 *   growth    widening the active area changes NOTHING under a square that
 *             is already in it -- the owner's "how would I expand later?"
 *   layout    the blueprint is DETERMINISTIC (the owner paints on a phone and
 *             a desktop; both must build the same world) and has the shape
 *             the plan promises: sea round the island, Brotown's square and
 *             plots in the middle, every region on land, a road into every
 *             landmark, the river from the glacier to the sea with a bridge
 *             where the West Road crosses it, the railway into the Great
 *             Cave and the Foundry Dome
 *   prompt    each square's prompt says what the template shows: its
 *             region's band, the border between regions, the streets, which
 *             edges roads and the river cross, the style key
 *   ground    (v2.3.2937) the swatch catalog, which swatch covers each cell,
 *             and the compositor: deterministic, tile-true, and seamless
 *             between chunks composed apart
 *   maxflow   the min cut is optimal -- checked against brute force
 *   fuse      squares damaged the way a regenerated picture is (zoom, shift,
 *             colour cast, re-invented texture) are put back where they
 *             belong and join cleanly; a picture that ignores its template
 *             grades "bad"
 *   seamless  (v2.3.2953) a ground picture made to repeat by a cut where its
 *             ends look alike: every pixel its own, as contrasty as it was
 *   zip       backups round-trip
 *
 * The fuse cases run on a procedurally painted test image rather than a real
 * zone painting so the suite needs no image decoder; tools/qa/world-page.mjs
 * repeats them on real paintings in Chromium.
 *
 *   node tools/world/test-world-core.mjs
 */
import { PLAN, SPOKES } from '../../public/tools/world/plan.js';
import { PIXEL, NO_DIRECTION, PLANK_BOARDS } from '../../public/tools/style/bible.js';
import { promptFor } from '../../public/tools/ground/prompts.js';
import { gridInfo, cellName, parseCell, cellRect, cellAt, allCells, neighbours } from '../../public/tools/world/core/grid.js';
import { buildBlueprint, renderSketch, colorTable, planKey, C, CLASS_IDS } from '../../public/tools/world/core/layout.js';
import { spokePoint, arcPoint } from '../../public/tools/world/core/wheel.js';
import { groundCatalog, materialMap, composeGround, swatchesUnder, walkBits, overviewPixels, edgeRecipe, groundContacts, EDGE_CLEAR, EDGE_PIECES, edgePiecesOn, BLENDS, blendsOn, planksOf, blendKey, blendPair, blendsUnder } from '../../public/tools/world/core/ground.js';
import { buildPrompt } from '../../public/tools/world/core/prompt.js';
import { gridMinCut, INF } from '../../public/tools/world/core/maxflow.js';
import { fuseSquare } from '../../public/tools/world/core/fuse.js';
import { makeImg, crop, warpAffine, blurField, resample } from '../../public/tools/world/core/image.js';
import { mulberry32, fbm, valueNoise, hash2 } from '../../public/tools/world/core/rng.js';
import { zipStore, unzip } from '../../public/tools/world/core/zip.js';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => {
  if (c) { pass++; console.log('  PASS ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d !== '' ? '  ' + JSON.stringify(d) : '')); }
};
const sq = (id) => parseCell(id);

/* ── grid ── */
console.log('grid');
const g = gridInfo(PLAN);
const C0 = parseCell(PLAN.centre);
/* the square `dc` columns and `dr` rows from the centre square, by name */
const rel = (dc, dr) => cellName(C0.c + dc, C0.r + dr);
{
  ok('step = square - overlap', g.P === g.N - g.O && g.P === 768, g.P);
  ok('frame = cols x step + overlap', g.W === g.cols * g.P + g.O && g.W === 37888, g.W);
  ok('A1 is the north-west corner of the frame', cellName(0, 0) === 'A1' && cellName(48, 48) === 'AW49');
  ok('the active area is G7..AQ43, 37 x 37 round the centre', cellName(g.c0, g.r0) === 'G7' && cellName(g.c1, g.r1) === 'AQ43' && allCells(g).length === 1369, [g.c0, g.r0, g.c1, g.r1]);
  const m = cellRect(g, C0.c, C0.r);
  ok('Y25 sits exactly on the world centre', PLAN.centre === 'Y25' && m.x + m.w / 2 === g.cx && m.y + m.h / 2 === g.cy, [m.x, g.cx]);
  ok('names round-trip', allCells(g).every((c) => { const p = parseCell(c.id); return p.c === c.c && p.r === c.r; }));
  ok('AA is column 27', cellName(26, 0) === 'AA1' && parseCell('AA1').c === 26);
  const a = cellAt(g, g.cx, g.cy), b = cellAt(g, C0.c * g.P + g.O / 2 - 1, g.cy), c = cellAt(g, C0.c * g.P + g.O / 2, g.cy);
  ok('a tap means the square whose middle is nearest (bands split evenly)', cellName(a.c, a.r) === 'Y25' && b.c === C0.c - 1 && c.c === C0.c, [a, b, c]);
  const nb = neighbours(g, g.c0, g.r0);
  ok('a corner square of the active area has two side neighbours', Object.keys(nb.sides).sort().join() === 'bottom,right', nb.sides);
  /* v2.3.2942: pictures are kept at 2 px per game px, finer than the plan's
     art px (1.5 game px) -- three picture px to an art px, a whole number so
     the fine ground lays on a clean grid */
  ok('the plan\'s art px is 1.5 game px, three picture px (style/bible.js)', PLAN.worldPxPerArtPx === 1.5 && PIXEL.gamePxPerArtPx === 0.5 && PLAN.worldPxPerArtPx / PIXEL.gamePxPerArtPx === 3);
}

/* ── layout: the Wheel ── */
console.log('layout');
const t0 = Date.now();
const bp = buildBlueprint(PLAN);
const buildMs = Date.now() - t0;
/* v2.3.2960: the town's boardwalks are put away (plan.js `boardwalks`) --
   kept and tested on a copy of the plan that lays them */
const PLANW = { ...PLAN, town: { ...PLAN.town, boardwalks: true } };
const bpW = buildBlueprint(PLANW);
const W = bp.wheel;
const cell = (x, y) => Math.floor((y - bp.y0) / bp.scale) * bp.w + Math.floor((x - bp.x0) / bp.scale);
const at = (x, y) => bp.cls[cell(x, y)];
const regAt = (x, y) => bp.regionIds[bp.reg[cell(x, y)]];
const tierOf = (x, y) => bp.tier[cell(x, y)];
const art = (p) => [g.cx + p[0] * g.P, g.cy + p[1] * g.P];
const near = (x, y, r, cls) => {
  const S = bp.scale, cx = Math.floor((x - bp.x0) / S), cy = Math.floor((y - bp.y0) / S), R = Math.ceil(r / S) + 4;
  for (let yy = cy - R; yy <= cy + R; yy++) for (let xx = cx - R; xx <= cx + R; xx++) {
    if (xx < 0 || yy < 0 || xx >= bp.w || yy >= bp.h) continue;
    if (bp.cls[yy * bp.w + xx] === cls) return true;
  }
  return false;
};
const sqAt = (p) => { const [x, y] = art(p); const c = cellAt(g, x, y); return cellName(c.c, c.r); };
{
  ok(`the blueprint covers only the active area (${bp.w} x ${bp.h} cells, built in ${buildMs} ms)`, bp.w === 1792 && bp.h === 1792 && bp.x0 === g.ax && bp.y0 === g.ay, [bp.w, bp.x0]);
  const again = buildBlueprint(PLAN);
  ok('the blueprint is deterministic', bp.hash === again.hash, [bp.hash, again.hash]);
  const X0 = bp.x0, Y0 = bp.y0, X1 = bp.x0 + bp.w * bp.scale, Y1 = bp.y0 + bp.h * bp.scale;
  ok('the four corners of the active area are open sea', [[X0 + 10, Y0 + 10], [X1 - 10, Y0 + 10], [X0 + 10, Y1 - 10], [X1 - 10, Y1 - 10]].every(([x, y]) => at(x, y) === C.ocean));

  /* Brotown */
  ok('the Town Hall plot is in the middle of the town square', at(g.cx, g.cy) === C.lot && at(g.cx + 170, g.cy + 170) === C.plaza && regAt(g.cx, g.cy) === 'town');
  ok('Main Street runs north-south through town to its gates', [-780, -430, 430, 780].every((dy) => at(g.cx, g.cy + dy) === C.street));
  ok('Market Row runs east-west through town to its gates', [-780, -430, 430, 780].every((dx) => at(g.cx + dx, g.cy) === C.street));
  /* (v2.3.2975: the gates moved out with the bigger plots, 867 -> 1050 art px) */
  const PAST = PLAN.town.gate + 150;
  ok('past the gates the streets become roads', [[0, -PAST], [PAST, 0], [0, PAST], [-PAST, 0]].every(([dx, dy]) => at(g.cx + dx, g.cy + dy) === C.path));
  const townLots = bp.lots.filter((l) => l.town), places = bp.lots.filter((l) => !l.town);
  ok('Brotown has the Town Hall plus 16 plots along its streets', townLots.length === 17 && townLots.every((l) => at((l.x0 + l.x1) / 2, (l.y0 + l.y1) / 2) === C.lot), townLots.length);
  /* v2.3.2960, owner: "The one thing I want to change are the boards. They
     do not look good and I don't know what those are supposed to be." */
  let townBoards = 0;
  for (let i = 0; i < bp.cls.length; i++) if (bp.cls[i] === C.boardwalk && bp.regionIds[bp.reg[i]] === 'town') townBoards++;
  const fronts = (b, l, cls) => {
    const atB = (x, y) => b.cls[Math.floor((y - b.y0) / b.scale) * b.w + Math.floor((x - b.x0) / b.scale)];
    const mx = (l.x0 + l.x1) / 2, my = (l.y0 + l.y1) / 2;
    return [[l.x0 - 12, my], [l.x1 + 12, my], [mx, l.y0 - 12], [mx, l.y1 + 12]].some(([x, y]) => atB(x, y) === cls);
  };
  const T0 = PLAN.town;
  ok('the boardwalks are put away until the buildings (v2.3.2960): none in town, the streets as wide as before, the plots where they were',
    T0.boardwalks === false && townBoards === 0 && at(g.cx + T0.main - 3, g.cy - 430) === C.street && at(g.cx + T0.main + 3, g.cy - 430) !== C.street &&
    townLots.filter((l) => l.id !== 'townhall').every((l) => !fronts(bp, l, C.boardwalk)), { townBoards });
  ok('...and a plan that lays them still has every plot fronting one, the rest of the plan the same',
    bpW.lots.filter((l) => l.town && l.id !== 'townhall').every((l) => fronts(bpW, l, C.boardwalk)) && bpW.lots.length === bp.lots.length);
  ok('the depot, the mill and the arena have plots', ['depot', 'mill', 'arena'].every((id) => { const l = places.find((q) => q.id === id); return l && at((l.x0 + l.x1) / 2, (l.y0 + l.y1) / 2) === C.lot; }));

  /* the Wheel */
  const landBy = new Map();
  for (let i = 0; i < bp.cls.length; i++) if (bp.cls[i] !== C.ocean) landBy.set(bp.regionIds[bp.reg[i]], (landBy.get(bp.regionIds[bp.reg[i]]) || 0) + 1);
  ok('every region has land', ['commons', 'town', ...SPOKES].every((k) => (landBy.get(k) || 0) > 1000), Object.fromEntries(landBy));
  ok('eight spokes, one per element, each pointing its own way', SPOKES.length === 8 && new Set(SPOKES.map((k) => PLAN.regions[k].element)).size === 8 && new Set(SPOKES.map((k) => PLAN.regions[k].dir)).size === 8);
  ok('a tier is one zone of walking (1,024 game px) and there are 16: levels 1-80',
    Math.abs(W.tierLen * g.P * PLAN.worldPxPerArtPx - 1024) < 1 && W.tiers === 16 && W.levels(1).join() === '1,5' && W.levels(16).join() === '76,80');
  const ladder = [];
  for (const s of W.spokes) for (let t = 1; t <= 16; t++) {
    const [x, y] = art(spokePoint(s, W.tierMid(t)));
    if (tierOf(x, y) !== t || regAt(x, y) !== s.id || bp.band[cell(x, y)] !== Math.floor((t - 1) / 4)) ladder.push(`${s.id}:${t}=${tierOf(x, y)}/${regAt(x, y)}`);
  }
  ok('down every spoke the tier climbs 1 to 16, one per zone, in four stages of four', ladder.length === 0, ladder.slice(0, 12));
  const commonsTier = [[1.9, 0.9], [-0.9, 1.9], [-1.9, -0.9], [0.9, -1.9]].map((p) => { const [x, y] = art(p); return [regAt(x, y), tierOf(x, y)]; });
  ok('the commons round the town is safe: no tier, no monsters', commonsTier.every(([r, t]) => r === 'commons' && t === 0), commonsTier);
  const between = [];
  for (const [a, b] of W.pairs) for (const r of [8.5, 15]) {
    const [dx, dy] = arcPoint(a, b, r, 0.5), [x, y] = art([dx, dy]);
    if (at(x, y) !== C.ocean) between.push(`${a.id}|${b.id}@${r}`);
  }
  ok('between the spokes is sea', between.length === 0, between);
  const passBad = [];
  for (const [a, b] of W.pairs) for (const t of PLAN.wheel.passes) {
    const [x, y] = art(arcPoint(a, b, W.tierMid(t), 0.5));
    if (at(x, y) === C.ocean || tierOf(x, y) !== t || !near(x, y, 60, C.path)) passBad.push(`${a.id}|${b.id}@${t}:${CLASS_IDS[at(x, y)]}/${tierOf(x, y)}`);
  }
  ok('neighbours are joined across the sea by 16 passes, at levels 20 and 60 on both sides', passBad.length === 0 && bp.pois.filter((p) => p.kind === 'pass').length === 16, passBad);
  const camps = places.filter((l) => /^camp-/.test(l.id));
  const campBad = camps.filter((l) => {
    const pl = PLAN.places.find((q) => q.id === l.id), [x, y] = [(l.x0 + l.x1) / 2, (l.y0 + l.y1) / 2];
    return at(x, y) !== C.lot || tierOf(x, y + (l.y1 - l.y0) / 2 + 20) === 0 && false || !near(x, y, 260, C.path) || ![20, 40, 60, 80].includes(pl.camp.level);
  }).map((l) => l.id);
  ok('a camp by the road at levels 20, 40, 60 and 80 on every spoke (32)', camps.length === 32 && campBad.length === 0, campBad);
  ok('a keystone gate at every tip: four to the Dark Sanctum, four to the Light Summit',
    bp.gates.length === 8 && bp.gates.filter((q) => q.realm === 'shadow').length === 4 && bp.gates.filter((q) => q.realm === 'radiant').length === 4 &&
    bp.gates.every((q) => at(q.x, q.y) === C.gate && tierOf(q.x, q.y) === 16), bp.gates.map((q) => q.name));
  const unreached = [...bp.gates, ...bp.landmarks].filter((l) => !near(l.x, l.y, l.r, C.path)).map((l) => l.name);
  ok('a road reaches every gate and landmark', unreached.length === 0, unreached);
  ok('the town to a gate is about 19 zones: two minutes at a run', Math.abs(W.gateR / W.Z - 19.1) < 0.3, W.gateR / W.Z);
  const trunks = new Set(PLAN.roads.flatMap((r) => r.pts.map((p) => p.join(','))));
  const gateSq = PLAN.town.gate / (PLAN.square.px - PLAN.square.overlap);
  ok('every road starts at a town gate or ON another road (so forks join cleanly)', PLAN.roads.every((r) => Math.hypot(r.pts[0][0], r.pts[0][1]) < gateSq + 0.01 ||
    PLAN.roads.some((o) => o !== r && o.pts.some((p) => p[0] === r.pts[0][0] && p[1] === r.pts[0][1]))) && trunks.size > 0);

  /* the river */
  let riverFrost = 0, mouth = false;
  for (let y = 1; y < bp.h - 1; y++) for (let x = 1; x < bp.w - 1; x++) {
    const i = y * bp.w + x;
    if (bp.cls[i] !== C.river) continue;
    if (bp.regionIds[bp.reg[i]] === 'frost') riverFrost++;
    if ([i - 1, i + 1, i - bp.w, i + bp.w].some((j) => bp.cls[j] === C.ocean)) mouth = true;
  }
  ok('the Sweetwater River rises on Frost Ridge and reaches the sea', riverFrost > 200 && mouth, { riverFrost, mouth });
  const bridges = bp.pois.filter((p) => p.kind === 'bridge');
  const mill = bridges.find((b) => b.name === 'the Mill Bridge'), snake = bridges.find((b) => b.name === 'the Snake Bridge');
  ok('the West Road crosses it on the Mill Bridge, the Bog Trail on the Snake Bridge', !!mill && mill.road === 'the West Road' && at(mill.x, mill.y) === C.bridge && !!snake && snake.road === 'the Bog Trail', bridges.map((b) => [b.name, b.road]));
  const falls = bp.pois.find((p) => p.kind === 'falls');
  ok('the falls cut a cliff across the river where the glacier ends', !!falls && near(falls.x, falls.y, 40, C.cliff) && regAt(falls.x, falls.y) === 'frost');

  /* the railway */
  const lmOf = (k) => bp.landmarks.find((l) => l.region === k);
  ok('the railway runs into the Great Cave and the Foundry Dome', ['hollows', 'thunder'].every((k) => near(lmOf(k).x, lmOf(k).y, lmOf(k).r, C.rail)));
  const spur = PLAN.rails.find((r) => r.abandoned), [sx, sy] = art(spur.pts[spur.pts.length - 1]), city = lmOf('sky');
  ok('the abandoned spur heads for the Buried City and stops short of it', Math.hypot(sx - city.x, sy - city.y) > 1.2 * g.P && regAt(sx, sy) === 'sky');

  /* size */
  let landCells = 0;
  for (let i = 0; i < bp.cls.length; i++) if (bp.cls[i] !== C.ocean) landCells++;
  const zoneCells = (1024 / PLAN.worldPxPerArtPx / bp.scale) ** 2;
  const zones = Math.round(landCells / zoneCells);
  ok(`about 490 zones' worth of land (${zones}; plan.js quotes it)`, zones > 450 && zones < 530, zones);
  const sk = renderSketch(PLAN, bp, cellRect(g, C0.c - 5, C0.r - 4), 256, 256, colorTable(PLAN, bp));
  let opaque = true;
  for (let i = 3; i < sk.length; i += 4) if (sk[i] !== 255) { opaque = false; break; }
  ok('a sketch is opaque and the requested size', sk.length === 256 * 256 * 4 && opaque);
}

/* ── growth ── */
console.log('growth');
{
  /* the owner's question: "how would I expand the game later?"  Widen the
     active area and rebuild: every square that was already in it must keep
     exactly the same plan */
  const grown = { ...PLAN, active: { from: 'E5', to: 'AS45' } };
  const g2 = gridInfo(grown), bp2 = buildBlueprint(grown);
  ok('the grown world keeps every square\'s name and place', g2.cx === g.cx && cellRect(g2, C0.c, C0.r).x === cellRect(g, C0.c, C0.r).x && allCells(g2).length === 41 * 41);
  const moved = allCells(g).filter((c) => planKey(bp, cellRect(g, c.c, c.r)) !== planKey(bp2, cellRect(g2, c.c, c.r))).map((c) => c.id);
  ok('widening the active area changes the plan under NO square', moved.length === 0, moved.slice(0, 12));
  const bigFrame = { ...PLAN, grid: { cols: 53, rows: 53 }, active: { from: 'G7', to: 'BA53' } };
  const g4 = gridInfo(bigFrame), bp4 = buildBlueprint(bigFrame);
  const moved4 = allCells(g).filter((c) => planKey(bp, cellRect(g, c.c, c.r)) !== planKey(bp4, cellRect(g4, c.c, c.r))).map((c) => c.id);
  ok('even the frame can grow (south and east) without moving anything', g4.cx === g.cx && g4.cy === g.cy && moved4.length === 0, moved4.slice(0, 12));
  const nudged = { ...PLAN, roads: PLAN.roads.map((r) => (r.id === 'arena-path' ? { ...r, pts: r.pts.map((p, k) => (k ? [p[0] + 0.15, p[1]] : p)) } : r)) };
  const bp3 = buildBlueprint(nudged);
  const changed = allCells(g).filter((c) => planKey(bp, cellRect(g, c.c, c.r)) !== planKey(bp3, cellRect(g, c.c, c.r))).map((c) => c.id);
  const arenaSq = sqAt(PLAN.places.find((p) => p.id === 'arena').at);
  ok(`moving one path changes only the squares it crosses (${changed.join(' ')})`, changed.length > 0 && changed.length <= 6 && changed.includes(arenaSq), { changed, arenaSq });
}

/* ── prompt ── */
console.log('prompt');
{
  const P = (id, fin = {}, opts = {}) => buildPrompt(PLAN, bp, sq(id).c, sq(id).r, fin, [], opts);
  const centre = P('Y25', {}, { first: true, styleKey: true });
  ok('names the square', centre.text.startsWith('Paint square Y25 of a large pixel-art game map'));
  ok('the first square sets the look', /this square sets the look for the whole map/.test(centre.text));
  ok('the style key is attached and must be matched, not copied', /STYLE KEY/.test(centre.text) && /do not copy its tiles/.test(centre.text) && /and the map's style key/.test(centre.text));
  ok('no style key line without a style key', !/STYLE KEY/.test(P('Y25').text));
  ok('the town square and the Town Hall plot', /The town square \(pale grey\) is in the middle, with the empty plot for the Town Hall/.test(centre.text), centre.summary);
  ok('both streets and their edges', /Main Street \(chestnut brown\) runs straight through it from the top edge to the bottom edge/.test(centre.text) && /Market Row/.test(centre.text));
  ok('plots stay empty', /Every plot stays EMPTY/.test(centre.text) && /buildings or houses \(building plots stay empty\)/.test(centre.text));
  ok('carries the HD pixel style bible and the never-list', /BroTown HD pixel art/.test(centre.text) && /No horizon, no sky/.test(centre.text) && /Never add: text/.test(centre.text) && /blur or soft gradients/.test(centre.text));
  ok('scale sentence filled in (a person 80 pixels tall at 1.5 game px a pixel)', /about 80 pixels tall/.test(centre.text) && !/\{person\}/.test(centre.text));
  /* v2.3.2939, owner: the bro is simple pixel art and the world HD, so he is
     never the reference picture; every material is drawn as itself. */
  ok('every material is drawn as itself (the owner\'s material-aware texturing)', /Every material is drawn as itself/.test(centre.text) && /wood with grain lines/.test(centre.text));
  const keyText = PLAN.styleKey.prompt.join('\n');
  ok('the style key is made from words alone: no bro, no hero, no attached screenshot, and a plain figure for size',
    !/hero|screenshot|attached/i.test(keyText) && /plain dark-grey silhouette of a standing man/.test(keyText) && /iron hoops/.test(keyText) && /Every material is drawn as itself/.test(keyText), keyText.slice(0, 160));
  ok('the style key asks for bright lava, crystals and ooze, never glow', !/glowing/i.test(keyText) && /no glow round it/.test(keyText));
  const north = P(rel(0, -1));
  ok('Main Street ends at the north gate and becomes the North Road', /ends at the town's north gate, where it becomes the North Road/.test(north.text) && /The North Road begins at the town gate here/.test(north.text), north.summary);
  const millSq = sqAt([-2.02, 0]), mill = P(millSq, { right: true });
  ok('says which edges are finished', /along the right edge is finished neighbouring squares/.test(mill.text));
  ok('the river flows in by one edge and out by another', /The Sweetwater River flows in from the top edge and out by the bottom edge/.test(mill.text), mill.summary);
  ok('the bridge, the mill plot and the fork', /The Mill Bridge \(bright yellow\) carries the West Road over the river/.test(mill.text) && /kept for the Old Mill/.test(mill.text) && /The Bog Trail branches off the West Road here/.test(mill.text));
  ok('the commons meets a spoke through its designed edge', /Where Brotown Commons meets Verdant Wilds, the commons grass grows lush/.test(mill.text), mill.summary);
  const src = P(sqAt(PLAN.rivers[0].pts[0]));
  ok('the river rises under the glacier', /rises here, pouring as meltwater from under the glacier/.test(src.text) && /Frost Ridge — the glacier/.test(src.text), src.summary);
  const fl = P(sqAt(PLAN.rivers[0].falls[0].at));
  ok('the falls, where one stage of a spoke turns into the next', /Sweetwater Falls is/.test(fl.text) && /the glacier/.test(fl.text) && /the snowbound taiga/.test(fl.text), fl.summary);
  const gate = P(sqAt([0, -W.gateR]));
  ok('the North Road ends at its gate, the Heart of the Volcano, past the last camp', /The North Road comes in from the bottom edge and ends at the Heart of the Volcano/.test(gate.text) && /sealed round stone gate carved with an eight-spoked wheel/.test(gate.text) && /kept for the Obsidian Stair/.test(gate.text), gate.summary);
  const stair = PLAN.roads.find((r) => r.name === 'the Steam Stair');
  const mid = P(sqAt(stair.pts[4]));
  ok('a pass between two spokes carries their border landscape', /Between Frost Ridge and Flame Fields the land blends through steam fields/.test(mid.text) && /the pass joining Frost Ridge and Flame Fields/.test(mid.text) && /a long, narrow ridge of land across the open sea/.test(mid.text), mid.summary);
  const end = P(sqAt(stair.pts[stair.pts.length - 1]));
  ok('a pass joins the next spoke\'s road', /The Steam Stair comes in from the \w+ edge and joins the North Road here/.test(end.text), end.summary);
  const spur = PLAN.rails.find((r) => r.abandoned), spurEnd = P(sqAt(spur.pts[spur.pts.length - 1]));
  ok('the abandoned spur ends unfinished, and says what it looks like', /ends here, unfinished/.test(spurEnd.text) && /rails rusted and half-buried/.test(spurEnd.text), spurEnd.summary);
  const sea = P('G7');
  ok('a corner square is sea', /almost all open sea/.test(sea.text), sea.summary);
}

/* ── ground: the swatches laid on the plan (v2.3.2937) ── */
console.log('ground');
{
  const cat = groundCatalog(PLAN);
  const ids = new Set(cat.map((e) => e.id));
  ok(`the catalog lists every swatch the world needs (${cat.length})`, cat.length === 48 && ids.size === 48 &&
    SPOKES.every((k) => [1, 2, 3, 4].every((n) => ids.has(`${k}-${n}`))) &&
    ['commons', 'town-yard', 'street', 'boardwalk', 'plaza', 'road', 'gravel', 'lava'].every((id) => ids.has(id)) &&
    cat.filter((e) => e.group === 'borders').length === 8 && cat.every((e) => e.brief && e.brief.length > 10 && e.color.length === 3), cat.length);
  /* v2.3.2944, the owner's rule: a swatch is laid the same way up everywhere,
     so nothing in it may run one way (the Main Street ruts tiled sideways) */
  const DIRECTIONAL = /\b(ruts?|wheel|tracks?|footprints?|prints|hoof|rows?|furrows?|planks?|stripes?|striped|streak(s|ed)?|ripples?|running|lines?|wind-carved|wind-scoured)\b/i;
  /* (v2.3.2949: all but the boardwalk, whose boards the game lays itself) */
  const pointing = cat.filter((e) => !e.laid && DIRECTIONAL.test(e.brief)).map((e) => `${e.id}: ${e.brief}`);
  ok('no swatch brief asks for anything that runs one way (ruts, tracks, rows, planks, ripples, streaks)', pointing.length === 0, pointing);
  const noDir = cat.filter((e) => !e.laid && !promptFor(e).includes(NO_DIRECTION)).map((e) => e.id);
  ok('...every swatch prompt says so, and the rewritten ones are marked for the Ground Studio',
    noDir.length === 0 && ['street', 'road', 'frost-2', 'sky-2', 'mist-1', 'border-thunder-tidal'].every((id) => cat.find((e) => e.id === id).revised === 'v2.3.2944'),
    { noDir, revised: cat.filter((e) => e.revised).map((e) => e.id) });
  const bw0 = cat.find((e) => e.id === 'boardwalk'), laid = cat.filter((e) => e.laid).map((e) => e.id);
  ok('...but the boardwalk: plain boards running one way, which the game turns (v2.3.2949), and its old basket-weave picture is not marked to redo',
    laid.join() === 'boardwalk' && bw0.laid === 'planks' && bw0.revised === 'v2.3.2949' && promptFor(bw0).includes(PLANK_BOARDS) && !promptFor(bw0).includes(NO_DIRECTION) &&
    /straight boards/.test(bw0.brief) && !/basket weave/.test(bw0.brief) && bw0.accepts.some((b) => /basket weave/.test(b)), { laid });
  const t0 = Date.now();
  const mm = materialMap(PLAN, bp);
  const mmMs = Date.now() - t0;
  const matAt = (x, y) => mm.ids[mm.mat[cell(x, y)]];
  /* the commonest swatch round a spot, leaving out what runs over the
     ground (roads, the railway, ponds): a spot can land on any of them */
  const groundAt = (x, y) => {
    const n = new Map(), S = bp.scale;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const m = matAt(x + dx * S, y + dy * S);
      if (m === 'water' || m === 'road' || m === 'gravel' || m === 'town-yard') continue;
      n.set(m, (n.get(m) || 0) + 1);
    }
    return [...n.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };
  const wrong = [];
  for (const s of W.spokes) for (const t of [2, 7, 10, 15]) {
    const [x, y] = art(spokePoint(s, W.tierMid(t), 0.6));
    const want = `${s.id}-${Math.floor((t - 1) / 4) + 1}`;
    if (groundAt(x, y) !== want) wrong.push(`${s.id}@${t}:${groundAt(x, y)}`);
  }
  ok(`each spoke's ground follows its stages (the map sorted in ${mmMs} ms)`, wrong.length === 0, wrong.slice(0, 8));
  const passMid = W.pairs.map(([a, b]) => { const [x, y] = art(arcPoint(a, b, W.tierMid(12), 0.5)); return [groundAt(x, y), `border-${[a.id, b.id].sort().join('-')}`]; });
  ok('a pass is its two elements\' border land', passMid.every(([m, want]) => m === want), passMid.filter(([m, w]) => m !== w));
  const [cx1, cy1] = art([1.9, 0.9]);
  ok('the sea is water, the commons is the commons, the Town Hall stands on the town yard, roads are road',
    matAt(bp.x0 + 10, bp.y0 + 10) === 'water' && matAt(cx1, cy1) === 'commons' && matAt(g.cx, g.cy) === 'town-yard' && matAt(g.cx, g.cy - (PLAN.town.gate + 150)) === 'road');
  const rect = (sx, sy, w, h) => { const [x, y] = art([sx, sy]); return { x: Math.round(x - w / 2), y: Math.round(y - h / 2), w, h }; };
  const R0 = rect(-2.02, 0, 512, 512);
  const one = composeGround(PLAN, bp, mm, R0, {}), two = composeGround(PLAN, bp, mm, R0, {});
  const same = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
  ok('the ground comes out the same every time', same(one.data, two.data));
  const L = composeGround(PLAN, bp, mm, { ...R0, w: 256 }, {}), Rr = composeGround(PLAN, bp, mm, { ...R0, x: R0.x + 256, w: 256 }, {});
  let seam = 0;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) for (let c = 0; c < 4; c++) {
    const v = x < 256 ? L.data[(y * 256 + x) * 4 + c] : Rr.data[(y * 256 + x - 256) * 4 + c];
    if (v !== one.data[(y * 512 + x) * 4 + c]) seam++;
  }
  ok('two halves composed apart match the whole, so the ground can be built in chunks', seam === 0, seam);
  const at1 = new Set(); for (let i = 0; i < one.mat.length; i++) at1.add(mm.ids[one.mat[i]]);
  ok('at the Mill Bridge: the river, the bridge planks, the road and the commons', ['water', 'boardwalk', 'road', 'commons'].every((k) => at1.has(k)), [...at1]);
  /* a swatch that exists is laid tile-true, anchored to the frame; one that
     does not is drawn in its plan colour, chequered */
  const T = 64, tile = { w: T, h: T, data: new Uint8ClampedArray(T * T * 4) };
  for (let i = 0; i < T * T; i++) { tile.data[i * 4] = i % 251; tile.data[i * 4 + 1] = (i * 7) % 253; tile.data[i * 4 + 2] = 90; tile.data[i * 4 + 3] = 255; }
  const [ex, ey] = art(spokePoint(W.byId.ember, W.tierMid(6), 0.7));
  const Re = { x: Math.round(ex), y: Math.round(ey), w: 8, h: 8 };
  const withT = composeGround(PLAN, bp, mm, Re, { 'ember-2': { A: tile } });
  let tileTrue = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    if (mm.ids[withT.mat[y * 8 + x]] !== 'ember-2') continue;
    const u = (((Re.x + x) % T) + T) % T, v = (((Re.y + y) % T) + T) % T, q = (v * T + u) * 4, o = (y * 8 + x) * 4;
    if (withT.data[o] === tile.data[q] && withT.data[o + 1] === tile.data[q + 1]) tileTrue++;
  }
  const bare = composeGround(PLAN, bp, mm, Re, {});
  const want = mm.catalog.find((e) => e.id === 'ember-2').color;
  let planColour = 0;
  for (let i = 0; i < 64; i++) if (mm.ids[bare.mat[i]] === 'ember-2' && Math.abs(bare.data[i * 4] - want[0]) <= 40) planColour++;
  ok('a made swatch is laid tile-true; one not made yet shows in its plan colour', tileTrue > 40 && planColour > 40, { tileTrue, planColour });

  /* v2.3.2942: the finer ground -- 3 output px per art px, a swatch kept at
     2 px per game px so ChatGPT's picture is never blown up (owner: "soft
     and gritty at the same time").  The same guarantees as the coarse one. */
  const R3 = rect(-2.02, 0, 128, 128);
  const t3 = Date.now();
  const f1 = composeGround(PLAN, bp, mm, R3, {}, { scale: 3 });
  const fMs = Date.now() - t3;
  const f2 = composeGround(PLAN, bp, mm, R3, {}, { scale: 3 });
  ok(`the finer ground is 3 pixels to the art px, the same every time (${fMs} ms for 384 x 384)`, f1.w === 384 && f1.h === 384 && f1.scale === 3 && same(f1.data, f2.data), [f1.w, f1.h, f1.scale]);
  const fL = composeGround(PLAN, bp, mm, { ...R3, w: 64 }, {}, { scale: 3 }), fR = composeGround(PLAN, bp, mm, { ...R3, x: R3.x + 64, w: 64 }, {}, { scale: 3 });
  let fseam = 0;
  for (let y = 0; y < 384; y++) for (let x = 0; x < 384; x++) for (let c = 0; c < 4; c++) {
    const v = x < 192 ? fL.data[(y * 192 + x) * 4 + c] : fR.data[(y * 192 + x - 192) * 4 + c];
    if (v !== f1.data[(y * 384 + x) * 4 + c]) fseam++;
  }
  ok('...two halves composed apart still match the whole', fseam === 0, fseam);
  const c1 = composeGround(PLAN, bp, mm, R3, {});
  let agree = 0;
  for (let y = 0; y < 384; y++) for (let x = 0; x < 384; x++) if (f1.mat[y * 384 + x] === c1.mat[Math.floor(y / 3) * 128 + Math.floor(x / 3)]) agree++;
  const setOf = (m) => [...new Set(Array.from(m, (q) => mm.ids[q]))].sort().join();
  ok(`...it lays the same swatches in the same places, with finer edges (${(100 * agree / (384 * 384)).toFixed(1)}% the same as the coarse ground)`,
    agree / (384 * 384) > 0.95 && setOf(f1.mat) === setOf(c1.mat) && /water/.test(setOf(f1.mat)) && /boardwalk/.test(setOf(f1.mat)), { agree, fine: setOf(f1.mat), coarse: setOf(c1.mat) });
  const withT3 = composeGround(PLAN, bp, mm, Re, { 'ember-2': { A: tile } }, { scale: 3 });
  let tileTrue3 = 0, n3 = 0;
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    if (mm.ids[withT3.mat[y * 24 + x]] !== 'ember-2') continue;
    n3++;
    const u = (((Re.x * 3 + x) % T) + T) % T, v = (((Re.y * 3 + y) % T) + T) % T, q = (v * T + u) * 4, o = (y * 24 + x) * 4;
    if (withT3.data[o] === tile.data[q] && withT3.data[o + 1] === tile.data[q + 1]) tileTrue3++;
  }
  ok('...and a made swatch is laid tile-true at its own resolution', n3 > 300 && tileTrue3 === n3, { tileTrue3, n3 });

  /* v2.3.2943: what the game's ground worker (ground-worker.js) needs */
  const pal = [[10, 20, 30], [200, 100, 50], [0, 0, 0], [255, 255, 255]];
  const itile = { w: T, h: T, idx: new Uint8Array(T * T), pal: new Uint8Array(pal.flat()) };
  const rgba = { w: T, h: T, data: new Uint8ClampedArray(T * T * 4) };
  for (let i = 0; i < T * T; i++) {
    const k = (i * 13 + (i >> 6)) % 4;
    itile.idx[i] = k;
    rgba.data.set([...pal[k], 255], i * 4);
  }
  const byIdx = composeGround(PLAN, bp, mm, Re, { 'ember-2': { A: itile } }, { scale: 3 });
  const byRgba = composeGround(PLAN, bp, mm, Re, { 'ember-2': { A: rgba } }, { scale: 3 });
  ok('a swatch kept as palette indices (a quarter of the memory) lays exactly as the same colours do', same(byIdx.data, byRgba.data));
  const lean = composeGround(PLAN, bp, mm, Re, { 'ember-2': { A: itile } }, { scale: 3, withMaterials: false });
  ok('...and without the per-pixel swatch map when the game does not want it', same(lean.data, byIdx.data) && !lean.mat);
  const under = swatchesUnder(bp, mm, R0);
  ok('swatchesUnder lists every swatch the composer lays there', [...at1].every((id) => under.has(id)), { under: [...under], laid: [...at1] });
  const tw = Date.now();
  const bits = walkBits(bp, mm);
  const wMs = Date.now() - tw;
  const blocked = (bx, by) => !!(bits[(by * bp.w + bx) >> 3] & (1 << ((by * bp.w + bx) & 7)));
  const cellOf = (x, y) => [Math.floor((x - bp.x0) / bp.scale), Math.floor((y - bp.y0) / bp.scale)];
  let nBlocked = 0, nWater = 0;
  for (let i = 0; i < bp.w * bp.h; i++) { if (bits[i >> 3] & (1 << (i & 7))) nBlocked++; if (mm.mat[i] === mm.water) nWater++; }
  const [sx0, sy0] = cellOf(bp.x0 + 10, bp.y0 + 10), [tx0, ty0] = cellOf(g.cx, g.cy), [kx0, ky0] = cellOf(cx1, cy1);
  ok(`the walk grid: the sea stops you, the town and the commons do not (${wMs} ms, ${bits.length} bytes)`,
    blocked(sx0, sy0) && !blocked(tx0, ty0) && !blocked(kx0, ky0) && bits.length === Math.ceil(bp.w * bp.h / 8), [blocked(sx0, sy0), blocked(tx0, ty0), blocked(kx0, ky0)]);
  ok('...and blocks within a hair of where the water is drawn', Math.abs(nBlocked - nWater) / nWater < 0.01, { nBlocked, nWater });
  /* the drawn ground and the walk grid agree away from the shore's noise */
  const fb = composeGround(PLAN, bp, mm, R3, {}, { scale: 3 });
  let agreeW = 0, nW = 0;
  for (let by = 0; by < 128 / bp.scale; by++) for (let bx = 0; bx < 128 / bp.scale; bx++) {
    const [gx, gy] = cellOf(R3.x + bx * bp.scale + 8, R3.y + by * bp.scale + 8);
    const px = (bx * bp.scale + 8) * 3, py = (by * bp.scale + 8) * 3;
    const drawnWater = fb.mat[py * 384 + px] === mm.water;
    nW++; if (drawnWater === blocked(gx, gy)) agreeW++;
  }
  ok(`...at the Mill Bridge the walk grid matches the water drawn (${agreeW}/${nW} cells)`, agreeW / nW > 0.85, { agreeW, nW });
  /* v2.3.2945, owner, on Main Street in the Ground Studio: "I think wooden
     plank bits are on the edges."  The one-cell boardwalks crumbled into
     specks along the street; built surfaces are now laid on their cells. */
  /* along the doors of the first two plots up Main Street, where a plan that
     lays boardwalks lays them (v2.3.2975: along each plot's door, its south
     side, since the buildings came -- every one faces south) */
  const RT = { x: Math.round(g.cx - 360), y: Math.round(g.cy - 300), w: 720, h: 120 };
  /* (v2.3.2960: on the plan that lays the boardwalks -- they are put away) */
  const mmW = materialMap(PLANW, bpW);
  const town = composeGround(PLANW, bpW, mmW, RT, {}, { scale: 3 });
  const TW = town.w;
  let offCell = 0, bwPx = 0;
  /* (v2.3.2950: the boardwalks' edges only -- the street and the square
     still lie on their cells, but mix into the yards) */
  const BW = mmW.index.boardwalk;
  for (let y = 0; y < town.h; y++) for (let x = 0; x < TW; x++) {
    const ax = RT.x + (x + 0.5) / 3, ay = RT.y + (y + 0.5) / 3;
    const cq = mmW.mat[Math.floor((ay - bpW.y0) / bpW.scale) * bpW.w + Math.floor((ax - bpW.x0) / bpW.scale)];
    const q = town.mat[y * TW + x];
    if (cq === BW ? q !== BW : q === BW) offCell++;
    if (q === BW) bwPx++;
  }
  ok('the boardwalks (when laid) are laid exactly on their cells, with straight edges', offCell === 0 && bwPx > 1000 && ['street', 'boardwalk', 'plaza'].every((id) => mmW.built[mmW.index[id]]), { offCell, bwPx });
  const seenPx = new Uint8Array(town.mat.length);
  let pieces = 0, specks = 0;
  for (let i = 0; i < town.mat.length; i++) {
    if (seenPx[i] || mmW.ids[town.mat[i]] !== 'boardwalk') continue;
    let n = 0; const st = [i]; seenPx[i] = 1;
    while (st.length) {
      const j = st.pop(); n++;
      const x = j % TW, y = (j / TW) | 0;
      for (const k of [x > 0 ? j - 1 : -1, x < TW - 1 ? j + 1 : -1, y > 0 ? j - TW : -1, y < town.h - 1 ? j + TW : -1]) {
        if (k >= 0 && !seenPx[k] && mmW.ids[town.mat[k]] === 'boardwalk') { seenPx[k] = 1; st.push(k); }
      }
    }
    pieces++; if (n < 400) specks++;
  }
  ok(`...so the one-cell boardwalks along the streets stay whole: ${pieces} strips, no specks`, pieces > 0 && specks === 0, { pieces, specks });
  /* v2.3.2960: and with them put away, that stretch of street has no
     plank on it at all -- the town's ground runs up to the street */
  const townNow = composeGround(PLAN, bp, mm, RT, {}, { scale: 3 });
  let nowBoards = 0;
  for (let i = 0; i < townNow.mat.length; i++) if (townNow.mat[i] === mm.index.boardwalk) nowBoards++;
  ok('...but they are put away: no plank laid along the street, the town\'s ground up to it', nowBoards === 0, { nowBoards });
  const bridgeCells = [];
  for (let i = 0; i < bp.w * bp.h; i++) if (mm.ids[mm.mat[i]] === 'boardwalk' && bp.regionIds[bp.reg[i]] !== 'town') bridgeCells.push(i);
  const shut = bridgeCells.filter((i) => bits[i >> 3] & (1 << (i & 7))).length;
  ok(`...and a bridge is always walkable, however wide the river under it (${bridgeCells.length} bridge cells)`, bridgeCells.length > 0 && shut === 0, { shut });

  /* ── v2.3.2949: plank decks -- every bridge a straight deck, every
     boardwalk and bridge laid with boards across it, lined up ── */
  const decks = bp.decks || [], bDecks = decks.filter((d) => d.kind === 'bridge'), wDecks = (bpW.decks || []).filter((d) => d.kind === 'boardwalk');
  let holes = 0, nBridge = 0, area = 0;
  for (const d of bDecks) { area += (d.x1 - d.x0) * (d.y1 - d.y0); for (let y = d.y0; y < d.y1; y++) for (let x = d.x0; x < d.x1; x++) if (bp.cls[y * bp.w + x] !== C.bridge) holes++; }
  for (let i = 0; i < bp.w * bp.h; i++) if (bp.cls[i] === C.bridge) nBridge++;
  ok(`every bridge is a straight deck, square at both ends (${bDecks.map((d) => `${d.x1 - d.x0} x ${d.y1 - d.y0}`).join(', ')} cells)`,
    bDecks.length === 3 && holes === 0 && nBridge === area && bDecks.every((d) => (d.along === 'x' ? d.x1 - d.x0 : d.y1 - d.y0) >= 6), { holes, nBridge, area });
  const meets = (d) => {
    const road = (x, y) => bp.cls[y * bp.w + x] === C.path;
    let a = false, b = false;
    if (d.along === 'x') for (let y = d.y0 - 1; y <= d.y1; y++) { a = a || road(d.x0 - 1, y); b = b || road(d.x1, y); }
    else for (let x = d.x0 - 1; x <= d.x1; x++) { a = a || road(x, d.y0 - 1); b = b || road(x, d.y1); }
    return a && b;
  };
  ok('...with the road meeting both ends, the diagonal crossings too', bDecks.every(meets), bDecks.filter((d) => !meets(d)).map((d) => d.road));
  let loose = 0, nPlank = 0;
  for (let i = 0; i < bpW.w * bpW.h; i++) { const e = mmW.catalog[mmW.mat[i]]; if (e && e.laid === 'planks') { nPlank++; if (!mmW.deckAt.has(i)) loose++; } }
  ok(`every boardwalk and bridge cell is on a deck that knows the way along it (${wDecks.length} boardwalks, ${nPlank} cells)`,
    nPlank > 0 && loose === 0 && wDecks.length >= 8 && wDecks.every((d) => (d.along === 'y') === (d.y1 - d.y0 > d.x1 - d.x0)) &&
    !(bp.decks || []).some((d) => d.kind === 'boardwalk'), { loose });
  /* not made yet: the plan's colours, a board each -- which shows the
     boards' way and width exactly: 24 output px (12 game px, half a cell)
     along the deck, the same all the way across it, starting at its ends */
  const deckRect = (d) => ({ x: bp.x0 + d.x0 * bp.scale, y: bp.y0 + d.y0 * bp.scale, w: (d.x1 - d.x0) * bp.scale, h: (d.y1 - d.y0) * bp.scale });
  const bwe = mm.catalog.find((e) => e.id === 'boardwalk');
  const stripes = (d, P = PLAN, B = bp, M = mm) => {
    const r = deckRect(d), o = composeGround(P, B, M, r, {}, { scale: 3 });
    let bad = 0;
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
      const s2 = d.along === 'x' ? r.x * 3 + x : r.y * 3 + y, want = Math.floor(s2 / 24) & 1 ? bwe.color : null;
      const i = (y * o.w + x) * 4, isC1 = o.data[i] === bwe.color[0] && o.data[i + 1] === bwe.color[1] && o.data[i + 2] === bwe.color[2];
      if (!!want !== isC1) bad++;
    }
    return { bad, boards: (d.along === 'x' ? o.w : o.h) / 24, startsOnSeam: ((d.along === 'x' ? r.x : r.y) * 3) % 24 === 0 };
  };
  const mill = bDecks.find((d) => d.road === 'west'), mainSt = wDecks.find((d) => d.lot === 'blacksmith') || wDecks[0];
  const sm = stripes(mill), sw = stripes(mainSt, PLANW, bpW, mmW);
  ok(`boards lie across the deck, 12 game px each, lined up with its ends: the Mill Bridge ${sm.boards} boards, the Blacksmith's boardwalk ${sw.boards}`,
    mill.along === 'x' && sm.bad === 0 && sw.bad === 0 && sm.startsOnSeam && sw.startsOnSeam && Number.isInteger(sm.boards) && Number.isInteger(sw.boards), { sm, sw });
  /* a plank picture: boards of uneven widths (80-110 px, as ChatGPT draws
     them), each one flat colour, dark seams between -- so every board laid
     must be one colour right across the deck, 24 px wide */
  const PKT = 1024, pk = { w: PKT, h: PKT, data: new Uint8ClampedArray(PKT * PKT * 4) };
  const bcols = [], edges0 = [];
  { let y = 0, k = 0; while (y < PKT) { const hgt = Math.min(PKT - y, 80 + ((k * 37) % 31)); edges0.push([y, hgt]); bcols.push([90 + k * 9, 60 + (k * 5) % 40, 40 + (k * 13) % 30]); y += hgt; k++; } }
  edges0.forEach(([y0, hgt], k) => { for (let y = y0; y < y0 + hgt; y++) for (let x = 0; x < PKT; x++) { const o = (y * PKT + x) * 4, dark = y - y0 < 2 || y0 + hgt - y <= 2; const c = dark ? [30, 20, 14] : bcols[k]; pk.data[o] = c[0]; pk.data[o + 1] = c[1]; pk.data[o + 2] = c[2]; pk.data[o + 3] = 255; } });
  const turnPic = (t) => { const u = { w: t.h, h: t.w, data: new Uint8ClampedArray(t.data.length) }; for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) for (let c = 0; c < 4; c++) u.data[(x * t.h + y) * 4 + c] = t.data[(y * t.w + x) * 4 + c]; return u; };
  const P1 = planksOf(pk, 24), P2 = planksOf(turnPic(pk), 24);
  ok(`the game finds a plank picture's boards (${P1.n} of ${edges0.length}) and makes it ${P1.scale.toFixed(1)} times smaller, boards run either way in the picture`,
    P1.n === edges0.length && !P1.turned && P2.turned && P1.scale > 3 && P1.scale < 5 && P2.n === P1.n && same(P1.tile.data, P2.tile.data), { n1: P1.n, n2: P2.n, s: P1.scale });
  const oneBoard = (d, tiles, P = PLAN, B = bp, M = mm) => {
    const r = deckRect(d), o = composeGround(P, B, M, r, tiles, { scale: 3 });
    const cols = new Set(bcols.map((c) => c.join())).add('30,20,14');
    let off = 0, mixed = 0;
    const per = new Map();
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
      const i = (y * o.w + x) * 4, key = `${o.data[i]},${o.data[i + 1]},${o.data[i + 2]}`;
      if (!cols.has(key)) { off++; continue; }
      const s2 = d.along === 'x' ? r.x * 3 + x : r.y * 3 + y, rr = s2 % 24;
      if (rr < 3 || rr > 20 || key === '30,20,14') continue;   /* the seam's half either side */
      const j = Math.floor(s2 / 24);
      if (!per.has(j)) per.set(j, key); else if (per.get(j) !== key) mixed++;
    }
    return { off, mixed, boards: per.size, data: o.data };
  };
  const pm = oneBoard(mill, { boardwalk: { A: pk } }), pw = oneBoard(mainSt, { boardwalk: { A: pk } }, PLANW, bpW, mmW);
  const pmT = oneBoard(mill, { boardwalk: { A: turnPic(pk) } });
  ok(`...and lays each board whole, one of the picture's, across the Mill Bridge (${pm.boards}) and along Main Street (${pw.boards}), every pixel the picture's own colour`,
    pm.off === 0 && pm.mixed === 0 && pw.off === 0 && pw.mixed === 0 && pm.boards === sm.boards && pw.boards === sw.boards && same(pm.data, pmT.data), { pm: [pm.off, pm.mixed], pw: [pw.off, pw.mixed] });
  const mr = deckRect(mill), dHalf = Math.round(mr.w / 2);
  const dWhole = composeGround(PLAN, bp, mm, mr, { boardwalk: { A: pk } }, { scale: 3 });
  const dLh = composeGround(PLAN, bp, mm, { ...mr, w: dHalf }, { boardwalk: { A: pk } }, { scale: 3 });
  const dRh = composeGround(PLAN, bp, mm, { ...mr, x: mr.x + dHalf, w: mr.w - dHalf }, { boardwalk: { A: pk } }, { scale: 3 });
  let pseam = 0;
  for (let y = 0; y < dWhole.h; y++) for (let x = 0; x < dWhole.w; x++) {
    const v = x < dHalf * 3 ? dLh.data[(y * dLh.w + x) * 4] : dRh.data[(y * dRh.w + x - dHalf * 3) * 4];
    if (v !== dWhole.data[(y * dWhole.w + x) * 4]) pseam++;
  }
  ok('...and a deck laid in two halves matches it laid whole', pseam === 0, pseam);
  const ov = overviewPixels(bp, mm, 4);
  const ovAt = (x, y) => { const [bx, by] = cellOf(x, y), o = (Math.floor(by / 4) * ov.w + Math.floor(bx / 4)) * 4; return [ov.data[o], ov.data[o + 1], ov.data[o + 2]]; };
  const commonsCol = mm.catalog.find((e) => e.id === 'commons').color;
  ok('the overview is the whole Wheel at a pixel per 4 x 4 cells, in the plan\'s colours',
    ov.w === Math.ceil(bp.w / 4) && ov.h === Math.ceil(bp.h / 4) && ovAt(cx1, cy1).join() === commonsCol.join() && ovAt(bp.x0 + 10, bp.y0 + 10).join() !== commonsCol.join(),
    { w: ov.w, h: ov.h, commons: ovAt(cx1, cy1), want: commonsCol });

  /* v2.3.2947, owner: "the change between two swatches is still too jarring
     and obvious.  Also layers need to be correct (grass slightly overlapping
     dirt areas) … that border area will need to vary in size depending on
     what two swatches are coming together." */
  const byId = Object.fromEntries(mm.catalog.map((e) => [e.id, e]));
  const rc = (a, b) => edgeRecipe(byId[a], byId[b]);
  const over = (a, b) => { const r = rc(a, b); return !!r && !r.even && r.up === a && r.lo === b; };
  ok('grounds lie in one order: grass over the road, snow over grass, sand over rock, rock over lava; the boardwalks keep their edges',
    over('commons', 'road') && over('frost-2', 'commons') && over('sky-2', 'sky-3') && over('ember-3', 'lava') && over('commons', 'town-yard') &&
    rc('boardwalk', 'commons') === null && rc('boardwalk', 'street') === null && rc('commons', 'commons') === null);
  /* v2.3.2950: alike grounds MIX over a wide zone -- the town square, the
     street and the yards; one meadow and the next; sand and dry earth --
     but a road stays a road, and rock and ice keep their narrow band */
  const mixW = (a, b) => { const r = rc(a, b); return r && r.mix && r.even && r.reach === 0 ? r.ragged : 0; };
  ok('grounds that are much alike mix over a wide zone: the town square, the street and the yards, two meadows, sand and dry earth; not a road, rock or ice',
    mixW('plaza', 'town-yard') >= 30 && mixW('street', 'town-yard') >= 30 && mixW('plaza', 'street') >= 30 && mixW('verdant-1', 'commons') >= 30 &&
    mixW('sky-1', 'sky-2') >= 30 && !mixW('hollows-1', 'road') && !mixW('hollows-2', 'hollows-3') && !mixW('frost-3', 'frost-2') &&
    rc('hollows-2', 'hollows-3').even && rc('hollows-2', 'hollows-3').ragged <= 12,
    { plaza: mixW('plaza', 'town-yard'), road: rc('hollows-1', 'road') });
  /* ...laid, at the owner's own spot: the town square's south edge, just
     below where the bro arrives, where it met the yards along a ruler line.
     Two stand-in pictures (each its own colours, textured so their pixels
     rank): the change must be spread over a wide zone -- the square found
     well below the line and the yard well above it, only one of them far
     off -- and wander along it, every pixel one of the two pictures', and a
     chunk laid in halves the same as whole. */
  const texTile = (T, cols, sd) => {
    const t = { w: T, h: T, data: new Uint8ClampedArray(T * T * 4) };
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const v = (valueNoise(x / 7, y / 7, sd) + valueNoise(x / 23, y / 23, sd + 1)) * 0.5 + 0.5, c = cols[Math.max(0, Math.min(cols.length - 1, Math.floor(v * cols.length)))], o = (y * T + x) * 4;
      t.data[o] = c[0]; t.data[o + 1] = c[1]; t.data[o + 2] = c[2]; t.data[o + 3] = 255;
    }
    return t;
  };
  const sqCols = [[150, 140, 120], [178, 168, 146], [204, 196, 176], [230, 224, 206]], ydCols = [[120, 70, 30], [150, 92, 40], [180, 116, 52], [206, 140, 70]];
  const mixTiles = { plaza: { A: texTile(256, sqCols, 5) }, 'town-yard': { A: texTile(256, ydCols, 9) } };
  /* (v2.3.2975: the square's edge from the plan -- it grew, 217 -> 240) */
  const mixLineY = bp.y0 + (Math.floor((g.cy - bp.y0) / bp.scale) + Math.round(PLAN.town.square / bp.scale)) * bp.scale;
  const mixRM = { x: Math.round(g.cx - 216), y: mixLineY - 64, w: 120, h: 128 };
  const mixed2 = composeGround(PLAN, bp, mm, mixRM, mixTiles, { scale: 3 });
  const mixIsSq = (i) => mm.ids[mixed2.mat[i]] === 'plaza';
  const mixFrac = (dGame) => { const oy = Math.round((64 + dGame / 1.5) * 3); let n = 0; for (let x = 0; x < mixed2.w; x++) if (mixIsSq(oy * mixed2.w + x)) n++; return n / mixed2.w; };
  const mixF = [-60, -30, -12, 0, 12, 30, 60].map((d) => +mixFrac(d).toFixed(2));
  /* where each column last shows the square, going down: it wanders */
  let mixLo = Infinity, mixHi = -Infinity;
  for (let x = 0; x < mixed2.w; x++) { let last = 0; for (let y = 0; y < mixed2.h; y++) if (mixIsSq(y * mixed2.w + x)) last = y; mixLo = Math.min(mixLo, last); mixHi = Math.max(mixHi, last); }
  const mixAllowed = new Set([...sqCols, ...ydCols].map((c) => c.join()));
  let mixForeign = 0;
  for (let i = 0; i < mixed2.data.length; i += 4) if (!mixAllowed.has(`${mixed2.data[i]},${mixed2.data[i + 1]},${mixed2.data[i + 2]}`)) mixForeign++;
  ok(`the town square now mixes into the yards below the bro over a wide zone, not a ruler line (square's share 60, 30, 12 game px above the line to 12, 30, 60 below: ${mixF.join(', ')}; its last pixel wanders ${Math.round((mixHi - mixLo) / 2)} game px)`,
    mixF[0] >= 0.97 && mixF[6] <= 0.03 && mixF[2] > 0.15 && mixF[3] > 0.1 && mixF[3] < 0.9 && mixF[4] < 0.85 && mixF[1] > mixF[3] && mixF[3] > mixF[5] && (mixHi - mixLo) / 2 >= 24 && mixForeign === 0, { mixF, wander: mixHi - mixLo, mixForeign });
  const mixL = composeGround(PLAN, bp, mm, { ...mixRM, w: 60 }, mixTiles, { scale: 3 }), mixR = composeGround(PLAN, bp, mm, { ...mixRM, x: mixRM.x + 60, w: 60 }, mixTiles, { scale: 3 });
  let mseam = 0;
  for (let y = 0; y < mixed2.h; y++) for (let x = 0; x < mixed2.w; x++) {
    const v = x < 180 ? mixL.data[(y * mixL.w + x) * 4] : mixR.data[(y * mixR.w + x - 180) * 4];
    if (v !== mixed2.data[(y * mixed2.w + x) * 4]) mseam++;
  }
  ok('...and it is laid the same in two halves as whole, so chunks still meet with no seam', mseam === 0, mseam);
  /* v2.3.2951: BLEND PICTURES.  Owner, shown the zone alone and with their
     own blended third picture in its middle: "Bottom right looks the best
     by a moderate margin" -- then "Yes build it".  At the same spot, with a
     third stand-in picture (its own bluish colours) for the square and the
     yards: the zone runs square -> blend -> yards, the blend most at the
     line and gone at the zone's sides; every pixel one of the three
     pictures'; `mat` still names only real swatches; chunks still agree;
     and a pair without one -- or a blend handed for a pair that does not
     mix -- changes nothing, to the byte. */
  ok('a blend has one key for its pair, whichever way round, and gives the pair back; blendsUnder lists the pairs under a rectangle that have one',
    blendKey('town-yard', 'plaza') === blendKey('plaza', 'town-yard') && blendKey('plaza', 'town-yard') === 'plaza__town-yard' &&
    JSON.stringify(blendPair('plaza__town-yard')) === '["plaza","town-yard"]' && blendPair('plaza') === null &&
    JSON.stringify(blendsUnder(['town-yard', 'plaza', 'street'], (k) => k !== 'street__town-yard')) === '["plaza__town-yard","plaza__street"]',
    blendsUnder(['town-yard', 'plaza', 'street'], (k) => k !== 'street__town-yard'));
  const blCols = [[70, 110, 150], [92, 132, 172], [114, 154, 194], [136, 176, 216]];
  const blTile = texTile(256, blCols, 13);
  const withBl = composeGround(PLAN, bp, mm, mixRM, mixTiles, { scale: 3, blends: { [blendKey('plaza', 'town-yard')]: blTile } });
  const blSet = new Set(blCols.map((c) => c.join()));
  const isBl = (i) => blSet.has(`${withBl.data[i * 4]},${withBl.data[i * 4 + 1]},${withBl.data[i * 4 + 2]}`);
  const sqSet = new Set(sqCols.map((c) => c.join()));
  const isSqPx = (i) => sqSet.has(`${withBl.data[i * 4]},${withBl.data[i * 4 + 1]},${withBl.data[i * 4 + 2]}`);
  const rowFrac = (dGame, f) => { const oy = Math.round((64 + dGame / 1.5) * 3); let n = 0; for (let x = 0; x < withBl.w; x++) if (f(oy * withBl.w + x)) n++; return +(n / withBl.w).toFixed(2); };
  const blF = [-60, -30, -12, 0, 12, 30, 60].map((d) => rowFrac(d, isBl)), sqF = [-60, 0, 60].map((d) => rowFrac(d, isSqPx));
  const allowed3 = new Set([...sqCols, ...ydCols, ...blCols].map((c) => c.join()));
  let foreign3 = 0, badMat = 0;
  for (let i = 0; i < withBl.data.length; i += 4) if (!allowed3.has(`${withBl.data[i]},${withBl.data[i + 1]},${withBl.data[i + 2]}`)) foreign3++;
  for (let i = 0; i < withBl.mat.length; i++) if (mm.ids[withBl.mat[i]] === undefined) badMat++;
  const blLaid = withBl.blendsLaid.find((b) => b.key === 'plaza__town-yard');
  ok(`with a blend picture, the zone runs square -> blend -> yards: the blend most at the line, none at the zone's sides (its share 60, 30, 12 game px above the line to 12, 30, 60 below: ${blF.join(', ')}); the square still all above and gone below (${sqF.join(', ')})`,
    blF[0] <= 0.02 && blF[6] <= 0.02 && Math.max(blF[2], blF[3], blF[4]) >= 0.3 && Math.max(blF[2], blF[3], blF[4]) > blF[1] && Math.max(blF[2], blF[3], blF[4]) > blF[5] &&
    sqF[0] >= 0.97 && sqF[2] <= 0.03, { blF, sqF });
  ok('...every pixel one of the three pictures\', `mat` still names only real swatches, and the blend is reported laid',
    foreign3 === 0 && badMat === 0 && !!blLaid && blLaid.px > 1000, { foreign3, badMat, laid: withBl.blendsLaid });
  const blOpts = { scale: 3, blends: { [blendKey('plaza', 'town-yard')]: blTile } };
  const blL = composeGround(PLAN, bp, mm, { ...mixRM, w: 60 }, mixTiles, blOpts), blR = composeGround(PLAN, bp, mm, { ...mixRM, x: mixRM.x + 60, w: 60 }, mixTiles, blOpts);
  let blSeam = 0;
  for (let y = 0; y < withBl.h; y++) for (let x = 0; x < withBl.w; x++) {
    const v = x < 180 ? blL.data[(y * blL.w + x) * 4 + 2] : blR.data[(y * blR.w + x - 180) * 4 + 2];
    if (v !== withBl.data[(y * withBl.w + x) * 4 + 2]) blSeam++;
  }
  ok('...laid in two halves the same as whole, so chunks with a blend still meet with no seam', blSeam === 0, blSeam);
  const noBl = composeGround(PLAN, bp, mm, mixRM, mixTiles, { scale: 3, blends: { [blendKey('commons', 'road')]: blTile, [blendKey('plaza', 'street')]: null } });
  let noBlDiff = 0;
  for (let i = 0; i < noBl.data.length; i++) if (noBl.data[i] !== mixed2.data[i]) noBlDiff++;
  ok('...and a blend for a pair that does not mix here (grass over the road), or none at all, changes nothing, to the byte', noBlDiff === 0 && noBl.blendsLaid.length === 0, noBlDiff);
  /* v2.3.2952, the owner on the first preview: "Top of that patch looks
     blended. Bottom looks like it has a noticeable straight edge where it
     transitions" -- the yards turning into the blend along the bottom of
     the Town Hall's plot, just below-left of where the bro arrives.  The
     blend's two changes had half a plain mix's room each and ran into the
     zone's end, beside the plan's straight cell edge; each is now a whole
     plain mix, either side of the blend.  Along that edge, where the yards
     end must wander nearly as much as a plain mix's, with no long straight
     stretch. */
  const plotCol = Math.floor((g.cx - 44 - bp.x0) / bp.scale), cyMid = Math.floor((g.cy - bp.y0) / bp.scale);
  let plotLineY = null;
  for (let cy = cyMid; cy < cyMid + 12 && plotLineY === null; cy++) {
    if (mm.ids[mm.mat[cy * bp.w + plotCol]] === 'town-yard' && mm.ids[mm.mat[(cy + 1) * bp.w + plotCol]] === 'plaza') plotLineY = bp.y0 + (cy + 1) * bp.scale;
  }
  const plotR = { x: Math.round(g.cx - 61), y: (plotLineY || 0) - 50, w: 140, h: 100 };
  const ydSet = new Set(ydCols.map((c) => c.join()));
  const yardsEnd = (o) => {
    const isYd = (x, y) => ydSet.has(`${o.data[(y * o.w + x) * 4]},${o.data[(y * o.w + x) * 4 + 1]},${o.data[(y * o.w + x) * 4 + 2]}`);
    const ys = [];
    for (let x = 0; x < o.w; x++) { let y = 0; while (y < o.h - 4 && (isYd(x, y) || isYd(x, y + 1) || isYd(x, y + 2) || isYd(x, y + 3))) y++; ys.push(y); }
    const m = ys.reduce((q, v) => q + v, 0) / ys.length, sd = Math.sqrt(ys.reduce((q, v) => q + (v - m) ** 2, 0) / ys.length);
    let run = 0;
    for (let i = 0; i < ys.length; i++) {
      let lo = ys[i], hi = ys[i], j = i;
      while (j + 1 < ys.length && Math.max(hi, ys[j + 1]) - Math.min(lo, ys[j + 1]) <= 3) { j++; lo = Math.min(lo, ys[j]); hi = Math.max(hi, ys[j]); }
      run = Math.max(run, j - i + 1);
    }
    return { spread: +(sd / 2).toFixed(1), straight: Math.round(run / 2) };
  };
  const plainE = yardsEnd(composeGround(PLAN, bp, mm, plotR, mixTiles, { scale: 3 }));
  const blendE = yardsEnd(composeGround(PLAN, bp, mm, plotR, mixTiles, { scale: 3, blends: { [blendKey('plaza', 'town-yard')]: blTile } }));
  /* (v2.3.2953, "Looks better but could use further improvement": the
     blend's big patches BLEND_BIG as strong in a zone as much wider -- it
     now wanders as far as a plain mix's, 12.4 game px to 12.6 (11 before),
     its straightest stretch 13 game px (17 before).  v2.3.2954: the plain
     mix's own straightest stretch there, 33 game px, was itself a straight
     line -- a patch cut off at its zone's end, or where the square's corner
     meets the street (below) -- and is 13 now too; so the bound is 16) */
  ok(`...and the yards turn into the blend along a ragged line, not a straight one (the bottom of the Town Hall's plot: it wanders ${blendE.spread} game px against a plain mix's ${plainE.spread}, its straightest stretch ${blendE.straight} game px against ${plainE.straight})`,
    plotLineY !== null && blendE.spread >= 0.85 * plainE.spread && blendE.straight <= 16, { plotLineY, plainE, blendE });
  /* v2.3.2954, the owner zoomed into the town square: "In each of your
     pictures there's a noticeable straight line. I want to avoid that." --
     at a street's corners, where three grounds meet, a patch was cut off
     along the straight line halfway between two of them (only the nearest
     other ground had its say).  Across the whole town, a flat colour a
     swatch, no edge between two grounds may run straight -- along a row, a
     column or either diagonal -- for more than 18 game px (it ran 26 along
     a diagonal; open country's ragged edges run up to 16) */
  {
    const cat2 = groundCatalog(PLAN), flat = {};
    cat2.forEach((e, k) => {
      const T2 = 64, t = { w: T2, h: T2, data: new Uint8ClampedArray(T2 * T2 * 4) };
      for (let y = 0; y < T2; y++) for (let x = 0; x < T2; x++) { const o = (y * T2 + x) * 4, v = valueNoise(x / 5, y / 5, k * 13 + 1) * 0.5 + 0.5; t.data[o] = k; t.data[o + 1] = 200; t.data[o + 2] = Math.floor(v * 255); t.data[o + 3] = 255; }
      flat[e.id] = { A: t };
    });
    const TR = { x: Math.round(g.cx - 384), y: Math.round(g.cy - 384), w: 768, h: 768 };
    const o = composeGround(PLAN, bp, mm, TR, flat, { scale: 3 });
    const W = o.w, H = o.h, lab = new Int16Array(W * H), skip = new Set(['boardwalk', 'water']);
    for (let i = 0; i < W * H; i++) lab[i] = o.data[i * 4 + 1] === 200 && !skip.has(cat2[o.data[i * 4]] && cat2[o.data[i * 4]].id) ? o.data[i * 4] : -1;
    const edgePx = new Uint8Array(W * H);
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
      const i = y * W + x;
      if (lab[i] < 0 || lab[i + 1] < 0 || lab[i + W] < 0) continue;
      if (lab[i] !== lab[i + 1] || lab[i] !== lab[i + W]) edgePx[i] = 1;
    }
    const longest = {};
    for (const [dx, dy, nm, k] of [[1, 0, 'rows', 1], [0, 1, 'columns', 1], [1, 1, 'diagonals \\', Math.SQRT2], [-1, 1, 'diagonals /', Math.SQRT2]]) {
      const starts = [];
      if (dy === 0) for (let y = 0; y < H; y++) starts.push([0, y]);
      else if (dx === 0) for (let x = 0; x < W; x++) starts.push([x, 0]);
      else if (dx === 1) { for (let y = 0; y < H; y++) starts.push([0, y]); for (let x = 1; x < W; x++) starts.push([x, 0]); }
      else { for (let x = 0; x < W; x++) starts.push([x, 0]); for (let y = 1; y < H; y++) starts.push([W - 1, y]); }
      let best = 0;
      for (const [x0, y0] of starts) {
        let run = 0, gap = 0;
        for (let x = x0, y = y0; x >= 0 && y >= 0 && x < W && y < H; x += dx, y += dy) {
          /* (a staircase steps, so the pixel beside counts too) */
          const i = y * W + x, j = dx !== 0 && dy !== 0 ? i + 1 : dx === 0 ? i + 1 : i + W;
          if (edgePx[i] || (j < W * H && edgePx[j])) { run++; gap = 0; if (run > best) best = run; } else if (++gap > 1) run = 0;
        }
      }
      longest[nm] = Math.round((best * k) / 2);
    }
    ok(`...and nowhere in the town does an edge run straight for long, where three grounds meet included (the longest straight stretch: ${Object.entries(longest).map(([n, v]) => `${n} ${v}`).join(', ')} game px)`,
      Object.values(longest).every((v) => v <= 18), longest);
  }
  /* v2.3.2977, the owner, of the town's yards on the grass: "the lines
     between dirt and grass are razor straight".  The test above looks round
     the square, a pixel at a time, and a line that wiggles a few px but runs
     on for 500 game px passes it.  So, on the plan, round the WHOLE town:
     how much of its edge on the grass runs straight along a row or a column
     for 8 cells (192 game px) or more, and the longest (before: 82% of it,
     the longest 552 game px; the town's rectangles grown by a slow wobble). */
  {
    const ri = Object.create(null);
    bp.regionIds.forEach((k, i) => { ri[k] = i; });
    const BW = bp.w, BH = bp.h, cellG = bp.scale * PLAN.worldPxPerArtPx;
    const town = (i) => bp.reg[i] === ri.town;
    const grass = (i) => bp.reg[i] === ri.commons && bp.cls[i] !== C.ocean && bp.cls[i] !== C.river;
    let longest = 0, edgeN = 0, inLong = 0;
    for (const [dx, ox, oy] of [[1, 0, -1], [1, 0, 1], [0, -1, 0], [0, 1, 0]]) {
      const lines = dx ? BH : BW, len = dx ? BW : BH;
      for (let a = 1; a < lines - 1; a++) {
        let run = 0;
        for (let b = 1; b < len; b++) {
          const x = dx ? b : a, y = dx ? a : b, i = y * BW + x;
          if (b < len - 1 && town(i) && grass((y + oy) * BW + x + ox)) { run++; edgeN++; } else { if (run >= 8) inLong += run; longest = Math.max(longest, run); run = 0; }
        }
      }
    }
    /* ...and still one town: no yard cut off out in the grass */
    const seen = new Uint8Array(BW * BH);
    let parts = 0;
    for (let s0 = 0; s0 < BW * BH; s0++) {
      if (seen[s0] || !town(s0)) continue;
      parts++;
      const st = [s0];
      seen[s0] = 1;
      while (st.length) {
        const i = st.pop(), x = i % BW;
        for (const j of [x > 0 ? i - 1 : -1, x < BW - 1 ? i + 1 : -1, i - BW, i + BW]) if (j >= 0 && j < BW * BH && !seen[j] && town(j)) { seen[j] = 1; st.push(j); }
      }
    }
    ok(`the town's edge on the grass wanders: ${Math.round((100 * inLong) / edgeN)}% of it runs straight for 192 game px or more, the longest ${longest * cellG} game px, and the town is one piece (was 82%, 552)`,
      edgeN > 300 && inLong / edgeN <= 0.3 && longest * cellG <= 400 && parts === 1, { edgeN, inLong, longest, parts });
    /* the plots out in the country too: none a rectangle any more */
    const notRect = [];
    for (const l of bp.lots.filter((q) => !q.town && !q.round)) {
      const widths = new Set();
      const x0 = Math.floor((l.x0 - 80 - bp.x0) / bp.scale), x1 = Math.ceil((l.x1 + 80 - bp.x0) / bp.scale);
      const y0 = Math.floor((l.y0 - 80 - bp.y0) / bp.scale), y1 = Math.ceil((l.y1 + 80 - bp.y0) / bp.scale);
      for (let y = y0; y <= y1; y++) {
        let w = 0;
        for (let x = x0; x <= x1; x++) if (bp.cls[y * BW + x] === C.lot) w++;
        if (w) widths.add(w);
      }
      notRect.push([l.id, widths.size]);
    }
    ok(`...and so do the plots out in the country, never a rectangle: ${notRect.map(([id, n]) => `${id} ${n} widths`).join(', ')} across its rows`,
      notRect.length >= 2 && notRect.every(([, n]) => n >= 3), notRect);
  }
  ok("...each pair with its own edge: a road's narrow, sand drifting wider than grass; two of a kind interlock evenly",
    rc('ember-3', 'road').ragged < rc('commons', 'road').ragged && rc('commons', 'road').ragged < rc('sky-2', 'road').ragged &&
    rc('commons', 'road').reach > 0 && rc('verdant-1', 'commons').even && rc('verdant-1', 'commons').reach === 0);
  const contacts = groundContacts(PLAN, bp, mm);
  const landC = contacts.filter((c) => c.a !== 'water' && c.b !== 'water');
  const roadMeets = landC.filter((c) => c.a === 'road' || c.b === 'road').length;
  ok(`${landC.length} pairs of grounds touch on the Wheel, the road alone meeting ${roadMeets}: so the extra prompts are one a ground, not one a pair`,
    landC.length > 150 && roadMeets > 30 && landC.every((c) => c.at && c.n > 0) && contacts[0].n >= contacts[contacts.length - 1].n);
  /* a spoke's stages give way over a wide band, in patches: near the line
     between stages 1 and 2 both are found either side of it, far from it
     only its own */
  const mixed = { near: 0, nearWrong: 0, far: 0, farWrong: 0 };
  const feature = new Set(['road', 'gravel', 'town-yard', 'lava', 'water', 'boardwalk']);
  for (const s of W.spokes) for (let k = -16; k <= 16; k++) for (const side of [-0.6, -0.3, 0, 0.3, 0.6]) {
    const d = k / 10, r = W.tierMid(4.5) + d * W.tierLen;
    const [x, y] = art(spokePoint(s, r, side));
    const m = matAt(x, y);
    if (feature.has(m) || m.startsWith('border')) continue;
    const want = `${s.id}-${d < 0 ? 1 : 2}`, wrong = m !== want;
    if (Math.abs(d) <= 0.35) { mixed.near++; if (wrong) mixed.nearWrong++; }
    if (Math.abs(d) >= 1.2) { mixed.far++; if (wrong) mixed.farWrong++; }
  }
  ok(`a land's stages give way in patches over a wide band (${mixed.nearWrong} of ${mixed.near} samples near the line are the other stage), and not at all far from it`,
    mixed.nearWrong > mixed.near * 0.08 && mixed.farWrong === 0 && mixed.far > 50, mixed);
  const mm2 = materialMap(PLAN, bp);
  ok('...the same every time', same(mm.mat, mm2.mat));
  /* the edge itself, where the commons meets a road away from the town and
     the water: two made swatches, indexed, and the commons' edge pieces */
  const cr = contacts.find((c) => c.a === 'commons' && c.b === 'road');
  /* a square with plenty of both in it, and nothing else near */
  let RC = null;
  for (let tries = 0; tries < 2000 && !RC; tries++) {
    const ang = tries * 0.37, rad = 700 + (tries % 40) * 30;
    const cx = g.cx + Math.cos(ang) * rad, cy = g.cy + Math.sin(ang) * rad;
    const R = { x: Math.round(cx - 48), y: Math.round(cy - 48), w: 96, h: 96 };
    const ids = new Set();
    let nRoad = 0, nAll = 0;
    for (let yy = R.y - 40; yy < R.y + R.h + 40; yy += 8) for (let xx = R.x - 40; xx < R.x + R.w + 40; xx += 8) {
      const m = matAt(xx, yy);
      ids.add(m);
      if (xx >= R.x && xx < R.x + R.w && yy >= R.y && yy < R.y + R.h) { nAll++; if (m === 'road') nRoad++; }
    }
    if (ids.size === 2 && ids.has('commons') && ids.has('road') && nRoad > nAll * 0.3 && nRoad < nAll * 0.7) RC = R;
  }
  const mkIdx = (seed, P) => {
    const T2 = 256, t = { w: T2, h: T2, idx: new Uint8Array(T2 * T2), pal: new Uint8Array(P * 3) };
    const rr = mulberry32(seed);
    for (let i = 0; i < P * 3; i++) t.pal[i] = Math.floor(rr() * 256);
    for (let y = 0; y < T2; y++) for (let x = 0; x < T2; x++) t.idx[y * T2 + x] = (Math.floor(x / 5) * 3 + Math.floor(y / 7) * 5 + Math.floor(rr() * 2)) % P;
    return t;
  };
  const grassT = mkIdx(11, 12), roadT = mkIdx(12, 9);
  /* the pieces: 30 round blobs in one colour no swatch has */
  const PT = 256, piecesT = { w: PT, h: PT, idx: new Uint8Array(PT * PT).fill(EDGE_CLEAR), pal: new Uint8Array([7, 251, 99]) };
  const blob = [];
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y <= 36) blob.push([x, y]);
  for (let k = 0; k < 30; k++) { const bx = 20 + (k % 6) * 40, by = 20 + Math.floor(k / 6) * 48; for (const [x, y] of blob) piecesT.idx[(by + y) * PT + bx + x] = 0; }
  const eTiles = { commons: { A: grassT, E: piecesT }, road: { A: roadT } };
  const E1 = RC && composeGround(PLAN, bp, mm, RC, eTiles, { scale: 3 });
  const EL = RC && composeGround(PLAN, bp, mm, { ...RC, w: 48 }, eTiles, { scale: 3 }), ER = RC && composeGround(PLAN, bp, mm, { ...RC, x: RC.x + 48, w: 48 }, eTiles, { scale: 3 });
  let eseam = 0;
  if (RC) for (let y = 0; y < 288; y++) for (let x = 0; x < 288; x++) for (let c = 0; c < 4; c++) {
    const v = x < 144 ? EL.data[(y * 144 + x) * 4 + c] : ER.data[(y * 144 + x - 144) * 4 + c];
    if (v !== E1.data[(y * 288 + x) * 4 + c]) eseam++;
  }
  ok('with edges and edge pieces, two halves composed apart still match the whole', !!RC && eseam === 0, { RC, eseam });
  const palOf = (t) => { const out = new Set(); for (let i = 0; i < t.pal.length; i += 3) out.add((t.pal[i] << 16) | (t.pal[i + 1] << 8) | t.pal[i + 2]); return out; };
  const allowed = new Set([...palOf(grassT), ...palOf(roadT), ...palOf(piecesT)]);
  let offPal = 0, grassOnRoad = 0, roadOnGrass = 0, pieceColour = 0;
  const OWp = RC ? E1.w : 0;
  if (RC) for (let y = 0; y < E1.h; y++) for (let x = 0; x < OWp; x++) {
    const i = y * OWp + x, o = i * 4, col = (E1.data[o] << 16) | (E1.data[o + 1] << 8) | E1.data[o + 2];
    if (!allowed.has(col)) offPal++;
    if (col === ((7 << 16) | (251 << 8) | 99)) pieceColour++;
    const cellId = matAt(RC.x + (x + 0.5) / 3, RC.y + (y + 0.5) / 3), laid = mm.ids[E1.mat[i]];
    if (cellId === 'road' && laid === 'commons') grassOnRoad++;
    if (cellId === 'commons' && laid === 'road') roadOnGrass++;
  }
  ok('every pixel of the edge is a pixel of one of the pictures: nothing blended, so the palette holds', !!RC && offPal === 0, { offPal });
  ok(`the grass lies over the road: it reaches onto the road (${grassOnRoad} px) far more than the road shows through it (${roadOnGrass} px), and both happen`,
    grassOnRoad > 2 * roadOnGrass && roadOnGrass > 0, { grassOnRoad, roadOnGrass });
  /* no crumbs: every bit of one ground wholly inside the rectangle is at
     least a tuft (EDGE_BIT, 20 px), and every edge piece is laid whole */
  const seenC = new Uint8Array(OWp * (RC ? E1.h : 0));
  let crumbs = 0, cut = 0, whole = 0, merged = 0;
  const col0 = (i) => (E1.data[i * 4] << 16) | (E1.data[i * 4 + 1] << 8) | E1.data[i * 4 + 2];
  const PIECE = (7 << 16) | (251 << 8) | 99;
  const comps = (key) => {
    seenC.fill(0);
    const out = [];
    for (let i0 = 0; i0 < seenC.length; i0++) {
      if (seenC[i0]) continue;
      const k0 = key(i0);
      let n = 0, edge = false;
      const st = [i0]; seenC[i0] = 1;
      while (st.length) {
        const j = st.pop(); n++;
        const x = j % OWp, y = (j / OWp) | 0;
        if (x === 0 || y === 0 || x === OWp - 1 || y === E1.h - 1) edge = true;
        for (const k of [x > 0 ? j - 1 : -1, x < OWp - 1 ? j + 1 : -1, y > 0 ? j - OWp : -1, y < E1.h - 1 ? j + OWp : -1]) if (k >= 0 && !seenC[k] && key(k) === k0) { seenC[k] = 1; st.push(k); }
      }
      out.push({ k: k0, n, edge });
    }
    return out;
  };
  if (RC) {
    for (const c of comps((i) => E1.mat[i])) if (!c.edge && c.n < 20) { crumbs++; console.log('      ground crumb', mm.ids[c.k], c.n); }
    /* (pieces from the picture's three layers may overlap: a merged pair is
       two whole pieces, bigger than one) */
    for (const c of comps((i) => (col0(i) === PIECE ? 1 : 0))) if (c.k === 1) { if (c.edge) cut++; else if (c.n === blob.length) whole++; else if (c.n > blob.length) merged++; else crumbs++; }
  }
  ok(`no crumbs: every bit of ground an edge leaves is at least a tuft, and the edge pieces are laid whole (${whole} here, each ${blob.length} px)`,
    !!RC && crumbs === 0 && whole >= 1 && pieceColour > 0, { crumbs, whole, merged, cut, pieceColour });
  /* v2.3.2948: put away -- the owner saw no difference -- but kept, and the
     tests above still lay them: off unless the address asks for them */
  ok("edge pieces are put away: off unless the address says ?edgepieces (the studio's, or the game's with ?trial=wheel)",
    EDGE_PIECES === false && !edgePiecesOn('') && !edgePiecesOn(undefined) && !edgePiecesOn('?trial=wheel') && !edgePiecesOn('?noedgepieces=1') &&
    edgePiecesOn('?edgepieces') && edgePiecesOn('?trial=wheel&edgepieces'), { EDGE_PIECES });
  /* v2.3.2955: the blends too -- the owner chose two pictures a pair ("Yeah
     hide it") -- kept, and the tests below still lay them */
  ok("blends are put away: off unless the address says ?blends (the studio's, or the game's with ?trial=wheel)",
    BLENDS === false && !blendsOn('') && !blendsOn(undefined) && !blendsOn('?trial=wheel') && !blendsOn('?edgepieces') && !blendsOn('?noblends=1') &&
    blendsOn('?blends') && blendsOn('?trial=wheel&blends') && blendsOn('?trial=wheel&edgepieces&blends'), { BLENDS });
}

/* ── maxflow ── */
console.log('maxflow');
{
  const rng = mulberry32(7);
  const cost = (w, h, node, term, capR, capD, side) => {
    let c = 0;
    for (let i = 0; i < w * h; i++) {
      if (!node[i]) continue;
      if (term[i] > 0 && !side[i]) c += term[i];
      if (term[i] < 0 && side[i]) c -= term[i];
      if (i % w + 1 < w && node[i + 1] && side[i] !== side[i + 1]) c += capR[i];
      if (i + w < w * h && node[i + w] && side[i] !== side[i + w]) c += capD[i];
    }
    return c;
  };
  let bad = 0;
  for (let t = 0; t < 600; t++) {
    const w = 2 + Math.floor(rng() * 3), h = 2 + Math.floor(rng() * 3), n = w * h;
    const node = new Uint8Array(n), term = new Float64Array(n), capR = new Int32Array(n), capD = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      node[i] = rng() < 0.9 ? 1 : 0;
      const r = rng();
      term[i] = r < 0.15 ? INF : r < 0.3 ? -INF : r < 0.45 ? Math.floor(rng() * 20) : r < 0.6 ? -Math.floor(rng() * 20) : 0;
      capR[i] = Math.floor(rng() * 20); capD[i] = Math.floor(rng() * 20);
    }
    const got = cost(w, h, node, term, capR, capD, gridMinCut(w, h, node, term, capR, capD));
    let best = Infinity;
    for (let m = 0; m < (1 << n); m++) {
      const s = new Uint8Array(n);
      for (let i = 0; i < n; i++) s[i] = (m >> i) & 1;
      best = Math.min(best, cost(w, h, node, term, capR, capD, s));
    }
    if (got !== best) bad++;
  }
  ok('min cut is optimal on 600 random grids (vs brute force)', bad === 0, bad);
}

/* ── fuse ── */
console.log('fuse');
{
  /* a procedural "painting": soft colour fields, tree-like blobs with a lit
     side, winding paths, fine grain -- enough structure to align on */
  const TW = 1200;
  const truth = makeImg(TW, TW);
  const rng = mulberry32(99);
  for (let y = 0; y < TW; y++) for (let x = 0; x < TW; x++) {
    const o = (y * TW + x) * 4, a = fbm(x / 260, y / 260, 5, 4), b = fbm(x / 90, y / 90, 6, 3);
    truth.data[o] = 70 + 40 * a + 20 * b; truth.data[o + 1] = 120 + 35 * a - 15 * b; truth.data[o + 2] = 55 + 25 * b; truth.data[o + 3] = 255;
  }
  for (let k = 0; k < 420; k++) {
    const cx = rng() * TW, cy = rng() * TW, r = 10 + rng() * 26;
    for (let y = Math.max(0, cy - r | 0); y < Math.min(TW, cy + r); y++) for (let x = Math.max(0, cx - r | 0); x < Math.min(TW, cx + r); x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d > 1) continue;
      const lit = ((x - cx) + (y - cy)) / r < -0.3 ? 30 : 0, o = (y * TW + x) * 4;
      truth.data[o] = 30 + lit; truth.data[o + 1] = 70 + lit; truth.data[o + 2] = 35 + lit;
    }
  }
  for (let y = 0; y < TW; y++) for (let x = 0; x < TW; x++) {
    const n = valueNoise(x / 3, y / 3, 17) * 10, o = (y * TW + x) * 4;
    truth.data[o] += n; truth.data[o + 1] += n; truth.data[o + 2] += n;
  }

  const N = 448, O = 112, P = N - O, G = 3, W = G * P + O;
  const sq = makeImg(W, W);
  const damage = (tc, s1, dx1, dy1) => {
    const g = warpAffine(tc, s1, dx1, dy1);
    const n = N * N;
    for (let ch = 0; ch < 3; ch++) {
      const f = new Float32Array(n);
      for (let i = 0; i < n; i++) f[i] = g.data[i * 4 + ch];
      const lo = blurField(new Float32Array(f), N, N, 2);
      for (let i = 0; i < n; i++) g.data[i * 4 + ch] = (lo[i] + (f[i] - lo[i]) * 0.5 + (rng() - 0.5) * 24) * [1.05, 0.97, 1.02][ch] + 4;
    }
    return g;
  };
  const order = [[1, 1], [1, 0], [2, 1], [1, 2], [0, 1], [0, 0], [2, 0], [2, 2], [0, 2]];
  let worstShift = 0, worstZoom = 0, grades = [];
  for (const [c, r] of order) {
    const x0 = c * P, y0 = r * P, first = c === 1 && r === 1;
    const s1 = first ? 1 : 0.99 + rng() * 0.02, dx1 = first ? 0 : Math.round(rng() * 12 - 6), dy1 = first ? 0 : Math.round(rng() * 12 - 6);
    const gen = damage(crop(truth, x0, y0, N, N), s1, dx1, dy1);
    const world = crop(sq, x0, y0, N, N);
    const painted = (x, y) => x >= 0 && y >= 0 && x < W && y < W && sq.data[(y * W + x) * 4 + 3] > 127 ? 1 : 0;
    const ring = { top: new Uint8Array(N), bottom: new Uint8Array(N), left: new Uint8Array(N), right: new Uint8Array(N) };
    for (let u = 0; u < N; u++) { ring.top[u] = painted(x0 + u, y0 - 1); ring.bottom[u] = painted(x0 + u, y0 + N); ring.left[u] = painted(x0 - 1, y0 + u); ring.right[u] = painted(x0 + N, y0 + u); }
    const res = fuseSquare({ world, squares: world, gen, ring, feather: 12 });
    for (let y = 0; y < N; y++) sq.data.set(res.out.data.subarray(y * N * 4, (y + 1) * N * 4), ((y0 + y) * W + x0) * 4);
    if (!first) {
      const T = res.transform;
      worstShift = Math.max(worstShift, Math.abs(T.dx + dx1 / s1), Math.abs(T.dy + dy1 / s1));
      worstZoom = Math.max(worstZoom, Math.abs(T.s - 1 / s1));
      grades.push(res.rating.grade);
    }
  }
  ok(`alignment undoes the shift (worst error ${worstShift.toFixed(2)} px)`, worstShift < 1, worstShift);
  /* a zoom error matters by how far it moves the square's EDGE (N/2 from the
     centre it scales about); judged against the composite, which carries the
     earlier squares' own sub-pixel errors */
  const edgePx = worstZoom * N / 2;
  ok(`alignment undoes the zoom (worst ${edgePx.toFixed(2)} px at the square's edge)`, edgePx < 1.5, worstZoom);
  ok('every join grades great or ok', grades.every((g) => g === 'great' || g === 'ok'), grades);
  let se = 0, cnt = 0;
  for (let y = 24; y < W - 24; y += 2) for (let x = 24; x < W - 24; x += 2) for (let ch = 0; ch < 3; ch++) {
    const d = sq.data[(y * W + x) * 4 + ch] - truth.data[(y * TW + x) * 4 + ch]; se += d * d; cnt++;
  }
  const psnr = 10 * Math.log10(65025 / (se / cnt));
  ok(`the fused world matches the truth (PSNR ${psnr.toFixed(1)} dB)`, psnr > 24, psnr);

  /* a picture that ignores its template */
  const world = crop(sq, P, P, N, N);
  const ring = { top: new Uint8Array(N).fill(1), bottom: new Uint8Array(N).fill(1), left: new Uint8Array(N).fill(1), right: new Uint8Array(N).fill(1) };
  const other = resample(crop(truth, 0, 0, TW, TW), N, N);
  const res = fuseSquare({ world, squares: world, gen: other, ring, feather: 12 });
  ok('a picture that ignores its template grades bad', res.rating.grade === 'bad', res.rating);
  /* the ring constraint: with every side finished, the square's outer border keeps the old pixels */
  const good = fuseSquare({ world, squares: world, gen: crop(truth, P, P, N, N), ring, feather: 12 });
  let borderSame = true;
  for (let u = 0; u < N && borderSame; u++) for (const [x, y] of [[u, 0], [u, N - 1], [0, u], [N - 1, u]]) {
    const o = (y * N + x) * 4;
    if (Math.abs(good.out.data[o] - world.data[o]) > 2) { borderSame = false; break; }
  }
  ok('with every side finished the border keeps the finished pixels', borderSame);
}

/* ── seamless ── v2.3.2953: the Ground Studio's (and the Style Lab's) tile
   is made to repeat by an overlap cut, not a cross-fade: on the owner's
   pictures the cross-fade left every stone in three quarters of the tile
   see-through.  A ChatGPT-shaped picture -- a coarse pixel grid of four
   colours, stones of three greys with a dark rim, NOT seamless -- must come
   back repeating, every pixel one of its own (a cross-fade makes colours in
   between), as contrasty as it was (averaging two textures is mush:
   docs/TRAPS.md), and a square an overlap of 12-20% smaller. */
console.log('seamless');
{
  const N = 600, d = new Uint8ClampedArray(N * N * 4), rr = mulberry32(2953);
  const ground = [[196, 150, 92], [214, 170, 110], [180, 136, 80], [228, 186, 126]];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const c = ground[(Math.floor(x / 6) * 7 + Math.floor(y / 6) * 13 + (Math.floor(x / 30) + Math.floor(y / 42)) * 3) % 4], o = (y * N + x) * 4;
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  const greys = [[150, 150, 160], [178, 176, 186], [120, 118, 132]], rim = [70, 66, 80];
  for (let k = 0; k < 40; k++) {
    const cx = rr() * N, cy = rr() * N, r = 8 + rr() * 16, c = greys[k % 3];
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(N - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(N - 1, Math.ceil(cx + r)); x++) {
      const e = Math.hypot(x - cx, y - cy);
      if (e > r) continue;
      const cc = e > r - 2 ? rim : c, o = (y * N + x) * 4;
      d[o] = cc[0]; d[o + 1] = cc[1]; d[o + 2] = cc[2];
    }
  }
  const { seamlessPixels } = await import('../../public/tools/style/process.js');
  const t = seamlessPixels(d, N, N);
  const key = (a, i) => (a[i] << 16) | (a[i + 1] << 8) | a[i + 2];
  const own = new Set();
  for (let i = 0; i < d.length; i += 4) own.add(key(d, i));
  let foreign = 0;
  for (let i = 0; i < t.data.length; i += 4) if (!own.has(key(t.data, i))) foreign++;
  const jump = (a, w, i, j) => Math.abs(a[i] - a[j]) + Math.abs(a[i + 1] - a[j + 1]) + Math.abs(a[i + 2] - a[j + 2]);
  const contrast = (a, w, h) => { let s = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w - 1; x++) s += jump(a, w, (y * w + x) * 4, (y * w + x + 1) * 4); return s / (h * (w - 1)); };
  let wrapC = 0, wrapR = 0;
  for (let y = 0; y < t.h; y++) wrapC += jump(t.data, t.w, (y * t.w + t.w - 1) * 4, y * t.w * 4);
  for (let x = 0; x < t.w; x++) wrapR += jump(t.data, t.w, ((t.h - 1) * t.w + x) * 4, x * 4);
  const cPic = contrast(d, N, N), cTile = contrast(t.data, t.w, t.h);
  ok(`a picture comes back a square ${t.overlap} px (${(100 * t.overlap / N).toFixed(0)}%) smaller, the overlap its two ends were cut together in`,
    t.w === t.h && t.w === N - t.overlap && t.overlap >= 0.12 * N - 1 && t.overlap <= 0.2 * N + 1, { w: t.w, h: t.h, overlap: t.overlap });
  ok(`...every pixel one of the picture's own: nothing seen through anything (${foreign} pixels of a colour it does not have)`, foreign === 0, foreign);
  ok(`...as contrasty as the picture itself, not mush (${cTile.toFixed(1)} against ${cPic.toFixed(1)})`, cTile >= 0.95 * cPic && cTile <= 1.05 * cPic, { cTile, cPic });
  ok(`...and it repeats: across its own edges it changes no more than between the picture's neighbouring pixels (${(wrapC / t.h).toFixed(1)} and ${(wrapR / t.w).toFixed(1)} against ${cPic.toFixed(1)})`,
    wrapC / t.h <= 2.5 * cPic && wrapR / t.w <= 2.5 * cPic, { wrapC: wrapC / t.h, wrapR: wrapR / t.w, cPic });
  const t2 = seamlessPixels(d, N, N);
  ok('...the same every time', t2.overlap === t.overlap && t2.data.every((v, i) => v === t.data[i]));
}

/* ── v2.3.2961: each ground keeps its own colours ── */
console.log('own colours');
{
  /* Owner, on their commons in the Wheel trial: "It looks like a lot of the
     same green color got clumped together making it look clumpy."  The 128
     colours were cut from every ground at once, and the grass -- one narrow
     band of greens -- got 3.  Here: a grass picture with soft shading, and
     eleven other grounds of other hues; the one palette made from all twelve
     (as the Ground Studio made it) against the grass's own 64. */
  const { ownPalette, coloursOf, mapPixels } = await import('../../public/tools/style/process.js');
  const N = 128, hues = [[96, 140, 52], [214, 186, 122], [236, 240, 248], [200, 72, 30], [120, 118, 132], [52, 110, 170],
    [150, 104, 64], [70, 60, 90], [180, 160, 60], [90, 70, 50], [40, 140, 140], [230, 120, 160]];
  const pic = (c0, seed) => {
    const d = new Uint8ClampedArray(N * N * 4);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = (fbm(x / 9, y / 9, seed, 3) - 0.5) * 90, w = (hash2(x, y, seed + 1) - 0.5) * 24, o = (y * N + x) * 4;
      d[o] = c0[0] + v * 0.7 + w; d[o + 1] = c0[1] + v + w; d[o + 2] = c0[2] + v * 0.5 + w; d[o + 3] = 255;
    }
    return d;
  };
  const pics = hues.map((c, k) => pic(c, 11 + k)), grass = pics[0];
  /* the one palette: every picture sampled alike, as one tall atlas */
  const atlas = new Uint8ClampedArray(N * N * 4 * pics.length);
  pics.forEach((d, k) => atlas.set(d, k * d.length));
  const shared = ownPalette(atlas, N, N * pics.length, PIXEL.palette - 8);
  const own = ownPalette(grass, N, N, PIXEL.ownColours);
  const onto = (pal) => { const d = new Uint8ClampedArray(grass); mapPixels(d, N, N, pal); return d; };
  const gS = onto(shared), gO = onto(own);
  const nCol = (d) => coloursOf(d, 100000).length;
  const err = (d) => { let e = 0; for (let i = 0; i < d.length; i += 4) e += Math.abs(d[i] - grass[i]) + Math.abs(d[i + 1] - grass[i + 1]) + Math.abs(d[i + 2] - grass[i + 2]); return e / (N * N); };
  ok(`a ground keeps ${PIXEL.ownColours} colours of its own: the grass ${nCol(gO)} greens where the palette every ground shares leaves it ${nCol(gS)}`,
    PIXEL.ownColours === 64 && nCol(gO) >= 40 && nCol(gO) >= 3 * nCol(gS) && nCol(gO) <= PIXEL.ownColours, { own: nCol(gO), shared: nCol(gS) });
  ok(`...and stays closer to the picture (off by ${err(gO).toFixed(1)} a pixel against ${err(gS).toFixed(1)})`, err(gO) < 0.6 * err(gS), { own: err(gO), shared: err(gS) });
  const again = ownPalette(new Uint8ClampedArray(grass), N, N, PIXEL.ownColours);
  ok('...the same colours every time from the same pixels (the Ground Studio and the game\'s worker agree)', JSON.stringify(again) === JSON.stringify(own));
  /* coloursOf: the colours a picture has, null past the limit; see-through
     pixels are not a colour */
  const two = new Uint8ClampedArray([1, 2, 3, 255, 1, 2, 3, 255, 9, 9, 9, 255, 0, 0, 0, 0]);
  ok('the colours a picture has are read back as its palette, see-through left out; too many gives none',
    JSON.stringify(coloursOf(two)) === '[[1,2,3],[9,9,9]]' && coloursOf(two, 1) === null && coloursOf(gO, 255).length === nCol(gO));
}

/* ── zip ── */
console.log('zip');
{
  const files = [{ name: 'backup.json', data: new TextEncoder().encode('{"a":1}') }, { name: 'squares/F7.png', data: new Uint8Array([137, 80, 78, 71, 1, 2, 3]) }];
  const back = await unzip(zipStore(files));
  ok('a backup zip round-trips', back.length === 2 && back[1].name === 'squares/F7.png' && back[1].data.join() === files[1].data.join() && new TextDecoder().decode(back[0].data) === '{"a":1}');
}

/* ── v2.3.2957: palette PNGs for the game ── */
console.log('palette PNGs');
{
  const { encodePalettePng, paletteOf } = await import('../../public/tools/world/core/png8.js');
  const zlib = await import('node:zlib');
  /* a picture on 100 colours, in clumps (as a swatch is), read back by hand:
     signature, IHDR, PLTE, IDAT inflated, each row's filter byte and numbers */
  const W = 256, H = 192, cols = [];
  for (let k = 0; k < 100; k++) cols.push([(k * 37) & 255, (k * 91 + 17) & 255, (k * 53 + 5) & 255]);
  const px = new Uint8Array(W * H * 4);
  /* (2 x 2 px dots of any of the 100, as busy as a swatch's grit) */
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = cols[Math.floor(hash2(x >> 1, y >> 1, 7) * 100)], o = (y * W + x) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255; }
  const png = Buffer.from(await encodePalettePng(px, W, H));
  const read = (buf) => {
    const out = {}; let o = 8;
    while (o < buf.length) { const len = buf.readUInt32BE(o), type = buf.toString('latin1', o + 4, o + 8); (out[type] = out[type] || []).push(buf.subarray(o + 8, o + 8 + len)); o += 12 + len; }
    return out;
  };
  const ch = read(png), ih = ch.IHDR[0], pal = ch.PLTE[0], raw = zlib.inflateSync(Buffer.concat(ch.IDAT));
  let same = true;
  for (let y = 0; y < H && same; y++) {
    if (raw[y * (W + 1)] !== 0) same = false;
    for (let x = 0; x < W && same; x++) { const n = raw[y * (W + 1) + 1 + x], o = (y * W + x) * 4; same = pal[n * 3] === px[o] && pal[n * 3 + 1] === px[o + 1] && pal[n * 3 + 2] === px[o + 2]; }
  }
  ok('a finished tile saved as palette numbers is read back as the very same pixels (a palette PNG: colour type 3, 8 bits, unfiltered rows)',
    png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && ih.readUInt32BE(0) === W && ih.readUInt32BE(4) === H && ih[8] === 8 && ih[9] === 3 && pal.length === 300 && same && !!ch.IEND,
    { size: png.length, palette: pal.length / 3, same });
  /* the full-colour PNG of the same pixels, unfiltered, for scale */
  const fullRaw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) Buffer.from(px.subarray(y * W * 4, (y + 1) * W * 4)).copy(fullRaw, y * (W * 4 + 1) + 1);
  ok(`...and smaller than the same pixels in full colour (${png.length} bytes against ${zlib.deflateSync(fullRaw).length})`, png.length < zlib.deflateSync(fullRaw).length);
  /* never a wrong picture: past 256 colours, or anything see-through, the
     answer is null and the studio keeps the full-colour PNG */
  const many = new Uint8Array(300 * 4);
  for (let i = 0; i < 300; i++) { many[i * 4] = i & 255; many[i * 4 + 1] = i >> 8; many[i * 4 + 3] = 255; }
  const clear = px.slice(); clear[3] = 0;
  ok('...but a picture of more than 256 colours, or with anything see-through, is not saved that way (the full-colour PNG is kept)',
    paletteOf(many, 300) === null && (await encodePalettePng(many, 300, 1)) === null && (await encodePalettePng(clear, W, H)) === null);
  /* v2.3.2964: the Object Studio's pieces stand on nothing -- every pixel
     solid or wholly see-through -- and are saved the same way, number 0
     see-through (a tRNS chunk) */
  const obj = px.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x - W / 2) ** 2 + (y - H / 2) ** 2 > (H / 2.2) ** 2) obj[(y * W + x) * 4 + 3] = 0;
  const opng = Buffer.from(await encodePalettePng(obj, W, H, { clear: true }));
  const och = read(opng), oraw = zlib.inflateSync(Buffer.concat(och.IDAT)), opal = och.PLTE[0];
  let osame = true, holes = 0;
  for (let y = 0; y < H && osame; y++) for (let x = 0; x < W && osame; x++) {
    const n = oraw[y * (W + 1) + 1 + x], o = (y * W + x) * 4;
    if (obj[o + 3] === 0) { holes++; osame = n === 0; } else osame = n > 0 && opal[n * 3] === obj[o] && opal[n * 3 + 1] === obj[o + 1] && opal[n * 3 + 2] === obj[o + 2];
  }
  ok(`an object's piece, with see-through round it, is saved as palette numbers too: number 0 see-through (tRNS), every other pixel its own colour (${holes} see-through)`,
    osame && holes > 1000 && och.tRNS && och.tRNS[0].length === 1 && och.tRNS[0][0] === 0 && opal.length === 303, { osame, holes, pal: opal.length / 3 });
  const half = obj.slice(); half[(Math.floor(H / 2) * W + Math.floor(W / 2)) * 4 + 3] = 128;
  ok('...but a pixel only partly see-through is never saved that way', (await encodePalettePng(half, W, H, { clear: true })) === null && paletteOf(obj, W * H) === null);
}

/* ── v2.3.2964: the Object Studio's catalog and prompts ── */
console.log('objects');
{
  const { objectCatalog, BUILDINGS, GROUPS, ENDS } = await import('../../public/tools/objects/catalog.js');
  const { promptFor: objectPrompt, frameOf, sizeWords, fraction, FRAME_GAME_PX } = await import('../../public/tools/objects/prompts.js');
  const cat = objectCatalog();
  const ids = new Set(cat.map((e) => e.id));
  const groundIds = new Set(groundCatalog(PLAN).map((e) => e.id));
  ok(`every object has its own id, a known group and a ground swatch to stand on (${cat.length} objects)`,
    ids.size === cat.length && cat.every((e) => GROUPS.some((g) => g.id === e.group) && groundIds.has(e.ground)),
    cat.filter((e) => !groundIds.has(e.ground)).map((e) => e.id));
  /* every plot in the plan has its building, under the plot's own id */
  const lots = [PLAN.town.hallLot.id];
  for (const sides of Object.values(PLAN.town.lots)) for (const list of Object.values(sides)) for (const l of list) lots.push(l.id);
  ok(`every one of the town's ${lots.length} plots has its building, under the plot's id, and every building is on a plot`,
    lots.length === 17 && BUILDINGS.length === 17 && lots.every((id) => BUILDINGS.some((b) => b.id === id)) && BUILDINGS.every((b) => lots.includes(b.id) && ENDS[b.end]));
  /* the frame: as tall as a ground swatch covers, so ChatGPT draws its
     pixels the ground's size; every object fits inside it with room */
  ok(`every picture is as tall as a ground swatch covers (${FRAME_GAME_PX} game px), and every object fits inside it with room to spare`,
    FRAME_GAME_PX === PIXEL.groundTile * PIXEL.gamePxPerArtPx && cat.every((e) => { const f = frameOf(e); return e.size <= (e.fit === 'w' ? f.w : f.h) * 0.8 && e.size >= 24; }),
    cat.filter((e) => { const f = frameOf(e); return e.size > (e.fit === 'w' ? f.w : f.h) * 0.8; }).map((e) => e.id));
  ok('sizes in words: a barrel waist-high, a lamp post one and a half people, an oak three, a building three and a half people wide (v2.3.2971: 1.4 times the old plan)',
    sizeWords(cat.find((e) => e.id === 'barrel')) === 'about waist-high on a person' && sizeWords(cat.find((e) => e.id === 'lamp')) === 'about one and a half times as tall as a person' &&
    sizeWords(cat.find((e) => e.id === 'oak')) === 'about three times as tall as a person' && sizeWords(cat.find((e) => e.id === 'blacksmith')) === 'about three and a half times as wide as a person is tall' &&
    BUILDINGS.every((b) => b.size === Math.round(b.sizeWas * 1.4) && b.sizeWas >= 276) &&
    fraction(0.5) === 'half' && fraction(0.1) === 'a tenth');
  const prompts = Object.fromEntries(cat.map((e) => [e.id, objectPrompt(e)]));
  ok('every prompt: HD pixel art, the style key only (never the bro), one flat background to cut away, and the size in words',
    cat.every((e) => { const p = prompts[e.id]; return /BroTown HD pixel art/.test(p) && /Attached is the game's style key/.test(p) && /ONE flat (magenta|bright green) colour/.test(p) && /one fifth as tall as this picture/.test(p) && p.includes(sizeWords(e)) && !/attach(ed)? (your|the|a) (bro|character|hero)/i.test(p); }));
  ok('the pink and purple things are on green, everything else on magenta',
    cat.every((e) => (e.key === 'green') === /ONE flat bright green colour \(#00FF00\)/.test(prompts[e.id])) && ['coral', 'shell', 'toadstool', 'crystal', 'giantflower', 'gemcutter'].every((id) => cat.find((e) => e.id === id).key === 'green'));
  ok('every building\'s prompt is its own: its job, its end of town, its one sign, the porch, square-on, Built by Bros, and its door and storeys against a person',
    BUILDINGS.every((b) => { const p = prompts[b.id]; return p.includes(b.job) && p.includes(ENDS[b.end]) && p.includes(`reads "${b.sign}"`) && p.includes(b.bro) && /raised wooden porch/.test(p) && /Drawn square-on/.test(p) && /Built by Bros/.test(p) && /Its door is a little taller than a person/.test(p); }) &&
    new Set(BUILDINGS.map((b) => prompts[b.id])).size === BUILDINGS.length);
  /* ChatGPT's lettering is unreliable past a word or two (WORLD-BIBLE §12) */
  ok('every sign is one or two words, and only a building or the town gate has one; the rest say no text at all',
    cat.every((e) => (e.sign ? e.sign.split(/\s+/).filter((w) => w !== '&').length <= 2 && (e.kind === 'building' || e.id === 'gate') : /No text, letters or numbers anywhere/.test(prompts[e.id]))));
  /* ── v2.3.2965: sprite sheets ── */
  const { sheetsFor, sheetPrompt, runOf, SHEET, SHEET_KINDS } = await import('../../public/tools/objects/sheets.js');
  const packed = sheetsFor(cat);
  const onSheet = Object.create(null);
  for (const sh of packed.sheets) for (const id of sh.rows.flat()) onSheet[id] = (onSheet[id] || 0) + 1;
  const loose = cat.filter((e) => e.kind !== 'building');
  ok(`sprite sheets: the ${loose.length} objects that are not buildings come on ${packed.sheets.length} sheet pictures, each on exactly one or with a picture of its own (${packed.own.length}), never a building`,
    loose.every((e) => (onSheet[e.id] || 0) + (packed.own.includes(e.id) ? 1 : 0) === 1) && BUILDINGS.every((b) => !onSheet[b.id]) && packed.sheets.length + packed.own.length < loose.length / 2,
    { sheets: packed.sheets.length, own: packed.own });
  const W = SHEET.w - 2 * SHEET.margin, H = SHEET.h - 2 * SHEET.margin;
  ok(`...every sheet one flat background, at most ${SHEET_KINDS} kinds, more than one, and by the sizes asked for its rows fit a wide picture with room between them`,
    packed.sheets.every((sh) => {
      const kinds = sh.rows.flat().map((id) => cat.find((e) => e.id === id));
      const rowsW = sh.rows.map((ids) => ids.reduce((t, id, i) => t + runOf(cat.find((e) => e.id === id)).w + (i ? SHEET.gap : 0), 0));
      const rowsH = sh.rows.map((ids) => Math.max(...ids.map((id) => runOf(cat.find((e) => e.id === id)).h)));
      return kinds.every((e) => (e.key || 'magenta') === sh.key) && kinds.length > 1 && kinds.length <= SHEET_KINDS &&
        rowsW.every((w) => w <= W) && rowsH.reduce((t, h) => t + h, 0) + SHEET.gap * (sh.rows.length - 1) <= H;
    }));
  const town2 = packed.sheets.find((sh) => sh.id === 'town-sheet-2'), sp = sheetPrompt(town2, packed.byId);
  ok("...and a sheet's prompt lists its rows top to bottom, each kind's ones left to right with how many and how big, in the order the studio reads them back",
    packed.sheets.every((sh) => { const p = sheetPrompt(sh, packed.byId); return sh.rows.every((ids, i) => p.includes(`Row ${i + 1}, left to right: `)) && /SPRITE SHEET/.test(p) && /each kind's ones stay together, in the order given/.test(p); }) &&
    sp.indexOf('hitching rails') < sp.indexOf('wooden crates') && /four wooden crates/.test(sp) && /each about waist-high on a person/.test(sp),
    sp.slice(0, 400));
  ok('a set asks for that many different ones, side by side and not touching; the big trees come in a wide picture',
    cat.every((e) => e.count === 1 ? /ONE (object|building)/.test(prompts[e.id]) : new RegExp(`a set of ${['', 'one', 'two', 'three', 'four'][e.count]} .*side by side and not touching`, 's').test(prompts[e.id])) &&
    ['oak', 'pine', 'palm', 'pylon', 'jungletree'].every((id) => /A wide picture \(3:2, landscape\)/.test(prompts[id])));
}

/* ── v2.3.2966: the Wheel's map (the minimap and the world map) ── */
console.log('wheel map');
{
  const { wheelMap, whereWords } = await import('../../public/tools/world/core/wheelmap.js');
  const bpM = buildBlueprint(PLAN);
  const m = wheelMap(PLAN, bpM);
  const inside = (x, y) => x >= 0 && y >= 0 && x <= m.worldW && y <= m.worldH;
  const c = m.worldW / 2;
  ok(`the map names the eight lands, each out along its own spoke from the town (${m.lands.map((l) => l.name).join(', ')})`,
    m.lands.length === 8 && m.lands.every((l) => { const dx = l.x - c, dy = l.y - c, d = Math.hypot(dx, dy); return d > 5000 && (dx * l.ux + dy * l.uy) / d > 0.99; }) && m.hub.town.name === 'Brotown' && Math.abs(m.hub.town.x - c) < 2,
    m.lands.map((l) => [l.id, l.x, l.y]));
  ok('...and each land\'s four stages with their levels, in order outward (32)',
    m.stages.length === 32 && m.lands.every((l) => { const st = m.stages.filter((s) => s.region === l.id); return st.length === 4 && st.every((s, k) => s.k === k && s.levels[0] === k * 20 + 1 && s.levels[1] === (k + 1) * 20 && (k === 0 || Math.hypot(s.x - c, s.y - c) > Math.hypot(st[k - 1].x - c, st[k - 1].y - c))); }));
  const kinds = {};
  for (const p of m.places) kinds[p.kind] = (kinds[p.kind] || 0) + 1;
  ok(`...the camps (32, each at the end of its stage), the passes (16, at levels 20 and 60), the gates (8, each to its realm) and the landmarks`,
    kinds.camp === 32 && kinds.pass === 16 && kinds.gate === 8 && kinds.landmark === 4 && m.places.every((p) => inside(p.x, p.y)) &&
    m.places.filter((p) => p.kind === 'camp').every((p) => [20, 40, 60, 80].includes(p.level)) && m.places.filter((p) => p.kind === 'pass').every((p) => p.level === 20 || p.level === 60) &&
    m.places.filter((p) => p.kind === 'gate').every((p) => /the (Dark Sanctum|Light Summit)/.test(p.to)), kinds);
  const before = bpM.routes.reduce((t, r) => t + r.pts.length, 0), after = m.routes.reduce((t, r) => t + r.pts.length / 2, 0);
  ok(`...and the roads, the river and the railway as lines, simplified ${before} points to ${after}, all inside the world, the trunk roads marked`,
    m.routes.length === bpM.routes.length && after < before / 4 && m.routes.every((r) => r.pts.length >= 4 && r.pts.every((v, i) => (i % 2 ? v <= m.worldH : v <= m.worldW) && v >= 0)) && m.routes.filter((r) => r.trunk).length === 8,
    { before, after });
  ok('"where am I" in words: the land, its stage and the levels there; the town and the commons safe',
    JSON.stringify(whereWords(m, 'frost', 2)) === JSON.stringify({ title: 'Frost Ridge', sub: 'the thaw line · Lv 6–10' }) &&
    whereWords(m, 'ember', 16).sub === 'the volcano flanks · Lv 76–80' && whereWords(m, 'town', 0).title === 'Brotown' && /safe/.test(whereWords(m, 'commons', 0).sub),
    [whereWords(m, 'frost', 2), whereWords(m, 'ember', 16)]);
  ok('...small enough to post to the game once (under 40 KB)', JSON.stringify(m).length < 40000, JSON.stringify(m).length);
}

console.log('footsteps');
{
  /* v2.3.2967: each ground its own footstep (footsteps.js, footstepClips.js) */
  const { STEP_SOUNDS, stepOf, steppedIds, NO_STEP } = await import('../../public/tools/world/core/footsteps.js');
  const { FOOTSTEP_CLIPS } = await import('../../src/data/footstepClips.js');
  const { readFileSync, existsSync } = await import('node:fs');
  const cat = groundCatalog(PLAN);
  const ids = (Array.isArray(cat) ? cat : Object.values(cat)).map((e) => e.id);
  const silent = ids.filter((id) => !stepOf(id) && !NO_STEP.includes(id));
  ok(`every one of the plan's ${ids.length} grounds sounds like something underfoot, but the lava (${steppedIds().length} with a sound)`,
    silent.length === 0 && !stepOf('lava') && !stepOf('water') && steppedIds().every((id) => ids.includes(id)) && ids.every((id) => !stepOf(id) || STEP_SOUNDS.includes(stepOf(id))),
    { silent, unknown: steppedIds().filter((id) => !ids.includes(id)) });
  const heard = new Set(ids.map(stepOf).filter(Boolean));
  /* v2.3.2969: by the owner's pictures, and none of them is ash -- it stays
     one of the twelve, a choice in the Ground Studio's menu */
  ok(`...and every sound but ash is used (${[...heard].join(', ')}); ash is only a choice, no picture being ash (v2.3.2969)`,
    STEP_SOUNDS.length === 12 && STEP_SOUNDS.every((s) => heard.has(s) === (s !== 'ash')) &&
    stepOf('ember-2') === 'stone' && stepOf('border-ember-sky') === 'sand' && stepOf('border-ember-frost') === 'stone' && stepOf('mist-2') === 'forest');
  const noClip = STEP_SOUNDS.filter((s) => s !== 'dirt' && !FOOTSTEP_CLIPS[s]);
  ok('every sound but dirt (today\'s footstep-v3) has a clip -- the forest floor grass\'s, until it has its own recording',
    noClip.length === 0 && !FOOTSTEP_CLIPS.dirt && FOOTSTEP_CLIPS.forest === FOOTSTEP_CLIPS.grass, noClip);
  const bad = [];
  let bytes = 0;
  for (const [name, c] of Object.entries(FOOTSTEP_CLIPS)) {
    const f = new URL('../../public' + c.url, import.meta.url);
    if (!existsSync(f)) { bad.push(`${name}: no file`); continue; }
    const b = readFileSync(f);
    if (name !== 'forest') bytes += b.length;
    const mp3 = (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) || b.slice(0, 3).toString() === 'ID3';
    if (!mp3) bad.push(`${name}: not an mp3`);
    if (c.key !== 'step-' + (name === 'forest' ? 'grass' : name)) bad.push(`${name}: key ${c.key}`);
    if (!c.steps.length || c.steps.some(([o, d], i) => !(d >= 0.15 && d <= 0.6) || (i && o < c.steps[i - 1][0] + c.steps[i - 1][1]))) bad.push(`${name}: steps ${JSON.stringify(c.steps)}`);
  }
  ok(`...each a small mp3 of single steps, in order, none overlapping the next (${(bytes / 1024).toFixed(0)} KB in all)`, bad.length === 0 && bytes < 300 * 1024, bad);
  /* v2.3.2968: the Ground Studio's copy of the table, and the owner's choices */
  const { cleanSteps, STEP_LABELS } = await import('../../public/tools/world/core/footsteps.js');
  const studio = JSON.parse(readFileSync(new URL('../../public/sfx/footstep/clips.json', import.meta.url), 'utf8')).clips;
  const same = Object.keys(FOOTSTEP_CLIPS).every((k) => studio[k] && studio[k].url === FOOTSTEP_CLIPS[k].url && JSON.stringify(studio[k].steps) === JSON.stringify(FOOTSTEP_CLIPS[k].steps));
  ok("the Ground Studio's copy of the clips (public/sfx/footstep/clips.json) is the game's, with dirt as footstep-v3 plays it and the forest floor marked as grass's (v2.3.2968)",
    same && studio.dirt && studio.dirt.url === '/sfx/footstep/footstep-v3.mp3' && studio.dirt.steps.length === 2 && studio.forest.standIn === 'grass' &&
    STEP_SOUNDS.every((k) => studio[k] && STEP_LABELS[k]), Object.keys(studio));
  const isSw = (id) => ids.includes(id);
  const c1 = cleanSteps(JSON.parse('{"commons":"snow","road":"dirt","frost-3":"lava","nowhere":"mud","__proto__":"ice","plaza":42}'), isSw);
  ok("the owner's sound choices are kept only for real grounds and real sounds, and only where they change something",
    JSON.stringify(Object.keys(c1)) === '["commons"]' && c1.commons === 'snow' && Object.getPrototypeOf(c1) === null &&
    Object.keys(cleanSteps(null, isSw)).length === 0 && Object.keys(cleanSteps('snow', isSw)).length === 0, c1);
}

/* ── v2.3.2971: objects found by count, not by a fixed reach ──
   Owner, 2026-10-02: "Your object detector isn't doing a good job of
   recognizing the objects from the sprite sheet even though there's space
   between the objects."  Sheets drawn here as ChatGPT draws them: closer
   than the prompt's 56 px, some objects in two pieces, specks about. */
console.log('objects found by count (v2.3.2971)');
{
  const { objectBoxes, FIND_CELLS } = await import('../../public/tools/style/process.js');
  const W = 1536, H = 1024;
  const pic = (w = W, h = H) => ({ w, h, d: new Uint8ClampedArray(w * h * 4) });
  const rect = (p, x, y, w, h) => { for (let v = y; v < y + h; v++) for (let u = x; u < x + w; u++) p.d[(v * p.w + u) * 4 + 3] = 255; };
  const disc = (p, cx, cy, r) => { for (let v = cy - r; v <= cy + r; v++) for (let u = cx - r; u <= cx + r; u++) if ((u - cx) ** 2 + (v - cy) ** 2 <= r * r) p.d[(v * p.w + u) * 4 + 3] = 255; };
  /* the sheet: row 1 four barrels 14 px apart; row 2 two lamp posts whose
     heads float 6 px over their poles, and three crates 18 px apart; row 3
     two trees (a canopy on its trunk) and four rocks 20 px apart; and specks */
  const s = pic(), want = 4 + 2 + 3 + 2 + 4, truth = [];
  let x = 40;
  for (let i = 0; i < 4; i++) { rect(s, x, 60, 80, 100); truth.push([x, 60, 80, 100]); x += 94; }
  x = 40;
  for (let i = 0; i < 2; i++) { rect(s, x + 26, 300, 28, 22); rect(s, x + 34, 328, 12, 190); truth.push([x + 26, 300, 28, 218]); x += 66; }
  for (let i = 0; i < 3; i++) { rect(s, x, 420, 96, 98); truth.push([x, 420, 96, 98]); x += 114; }
  x = 40;
  for (let i = 0; i < 2; i++) { disc(s, x + 90, 680, 90); rect(s, x + 78, 760, 24, 160); truth.push([x, 590, 181, 330]); x += 200; }
  for (let i = 0; i < 4; i++) { rect(s, x, 850, 70, 70); truth.push([x, 850, 70, 70]); x += 90; }
  for (const [u, v] of [[1400, 100], [900, 200], [1300, 980], [700, 560]]) rect(s, u, v, 3, 3);
  const found = objectBoxes(s.d, s.w, s.h, want, { minArea: 0.15 * 70 * 70, relMin: 0 });
  const near = (b, t) => Math.abs(b.x - t[0]) <= 4 && Math.abs(b.y - t[1]) <= 4 && Math.abs(b.x + b.w - t[0] - t[2]) <= 4 && Math.abs(b.y + b.h - t[1] - t[3]) <= 4;
  const matched = truth.filter((t) => found.boxes.some((b) => near(b, t)));
  ok(`a sheet packed tighter than its prompt asks: all ${want} objects found, each whole -- the barrels 14 px apart, the lamps with their floating heads, the trees, the rocks -- and the specks left out (${found.boxes.length} found)`,
    found.boxes.length === want && matched.length === want, { found: found.boxes.length, missed: truth.filter((t) => !matched.includes(t)), cells: FIND_CELLS });
  /* the same row with one barrel more than asked: kept apart, not glued to
     a neighbour to make the count */
  const e = pic();
  for (let i = 0, u = 40; i < 5; i++, u += 94) rect(e, u, 60, 80, 100);
  const extra = objectBoxes(e.d, e.w, e.h, 4, { relMin: 0.03 });
  ok('ChatGPT drew one barrel more than asked: five found, none glued to another to make the count (the fifth is then "not used")',
    extra.boxes.length === 5 && extra.boxes.every((b) => b.w <= 84), extra.boxes.map((b) => b.w));
  /* one fewer: the three it drew */
  const f = pic();
  for (let i = 0, u = 40; i < 3; i++, u += 94) rect(f, u, 60, 80, 100);
  ok('...and one fewer: the three it drew', objectBoxes(f.d, f.w, f.h, 4).boxes.length === 3);
  /* a set on its own square picture: four barrels 10 px apart (partsOf's
     reach took them as one), and a sign 20 px off the first one's side */
  const g = pic(1024, 1024);
  for (let i = 0, u = 100; i < 4; i++, u += 190) rect(g, u, 400, 180, 240);
  rect(g, 60, 450, 20, 14);
  const set4 = objectBoxes(g.d, g.w, g.h, 4);
  const first = set4.boxes.slice().sort((a, b) => a.x - b.x)[0];
  ok('a set of four barrels 10 px apart comes apart into four, and a small sign beside the first stays with it',
    set4.boxes.length === 4 && first.x <= 62 && set4.boxes.every((b) => b.w <= 252), set4.boxes.map((b) => [b.x, b.w]));
  /* a picture drawn on a scene: what its cut-out leaves of the scene runs
     to the picture's edges -- background, never an object (it once came out
     a piece 2839 px wide, too big for any sprite sheet) */
  const sc = pic(1024, 1024);
  rect(sc, 0, 0, 1024, 300); rect(sc, 0, 0, 200, 1024); rect(sc, 0, 900, 1024, 124);
  rect(sc, 500, 450, 160, 160);
  const scene = objectBoxes(sc.d, sc.w, sc.h, 4);
  ok('a scene left round the edges of a picture is background, not an object: only the bush in the middle is found',
    scene.boxes.length === 1 && scene.boxes[0].x === 500 && scene.boxes[0].w === 160, scene.boxes.map((b) => [b.x, b.y, b.w, b.h]));
}

/* ── v2.3.2975: the objects on the Wheel -- placed, and in the game ──
   Owner, 2026-10-02: "Wire this stuff into the game.  Put mayor bro in town
   too." */
console.log('objects on the Wheel (v2.3.2975)');
{
  const { placeObjects, footprintOf, objectFootprints, mayorSpot, PLACING } = await import('../../public/tools/world/core/placing.js');
  const { townPlan } = await import('../../public/tools/world/core/layout.js');
  const { objectCatalog } = await import('../../public/tools/objects/catalog.js');
  const { pagesByColour, PAGE_COLOURS, PAGE_KINDS } = await import('../../public/tools/objects/atlas.js');
  const { decodePNG } = await import('./png.mjs');
  const fs = await import('node:fs');
  const WPA = PLAN.worldPxPerArtPx;
  const t0 = Date.now();
  const P1 = placeObjects(PLAN, bp);
  const placeMs = Date.now() - t0;
  const P2 = placeObjects(PLAN, buildBlueprint(PLAN));
  const sameArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  ok(`every object on the Wheel is placed (${P1.n}, ${placeMs} ms), the same every time`,
    P1.n > 8000 && P1.n < 40000 && placeMs < 3000 && P1.version === PLACING &&
    ['kind', 'piece', 'flip', 'x', 'y'].every((k) => sameArr(P1[k], P2[k])), { n: P1.n, placeMs });
  const cat = objectCatalog(), byId = Object.fromEntries(cat.map((e) => [e.id, e]));
  const idOf = (i) => P1.kinds[P1.kind[i]];
  const cellOfG = (x, y) => Math.floor(y / WPA / bp.scale) * bp.w + Math.floor(x / WPA / bp.scale);
  const clsAtG = (x, y) => bp.cls[cellOfG(x, y)];
  const regAtG = (x, y) => bp.regionIds[bp.reg[cellOfG(x, y)]];
  const gOf = (ax, ay) => [(ax - bp.x0) * WPA, (ay - bp.y0) * WPA];

  /* the buildings */
  const T = PLAN.town, tp = townPlan(T), townLots = bp.lots.filter((l) => l.town);
  const bAt = Object.create(null);
  for (let i = 0; i < P1.n; i++) if (byId[idOf(i)] && byId[idOf(i)].kind === 'building') bAt[idOf(i)] = [P1.x[i], P1.y[i]];
  ok('every building stands on its own plot, the bottom of its steps on the plot\'s door, the Town Hall too',
    townLots.length === 17 && townLots.every((l) => { const b = bAt[l.id], [fx, fy] = gOf(l.foot.x, l.foot.y); return b && Math.abs(b[0] - fx) < 1 && Math.abs(b[1] - fy) < 1; }), Object.keys(bAt).length);
  /* every door opens to the south onto a street, the square or a walk */
  const shut = townLots.filter((l) => { const [fx, fy] = gOf(l.foot.x, l.foot.y + T.lot.porch + 6); const c = clsAtG(fx, fy); return c !== C.street && c !== C.plaza; });
  ok('every building faces south, as drawn, and its door opens onto a street, the square, the Back Lane or a front walk to Main Street',
    shut.length === 0, shut.map((l) => l.id));
  /* no roof hides another's door */
  const hid = [];
  for (const a of tp.lots) for (const b of tp.lots) {
    if (a === b) continue;
    const tall = a.arm === 'square' ? T.hall.d * 2 : T.lot.tall;
    if (b.foot.x > a.x0 && b.foot.x < a.x1 && b.foot.y > a.foot.y - tall && b.foot.y < a.foot.y) hid.push([a.id, b.id]);
  }
  ok('no building stands so close in front of another that its roof hides that one\'s door', hid.length === 0, hid);
  ok('the plots are as big as the buildings drawn for them: 386 game px wide, 465 tall at most (the tallest is 453)',
    T.lot.w * WPA >= 386 + 12 && T.lot.tall * WPA >= 453 && T.hall.w * WPA >= 406, { w: T.lot.w * WPA, tall: T.lot.tall * WPA });
  /* Main Street: two a side up and down from the square; Market Row's
     north side straight onto the street; its south side and the first ones
     south onto the Back Lane */
  const lane = tp.fronts.find((f) => f.lane);
  const onLane = tp.lots.filter((l) => Math.abs(l.foot.y - lane.y0) < 1).map((l) => l.id).sort();
  ok(`the Back Lane runs behind Market Row from end to end, across Main Street, and six doors open onto it (${onLane.join(', ')})`,
    !!lane && lane.x0 <= -tp.rowEnd && lane.x1 >= tp.rowEnd && onLane.length === 6, onLane);

  /* the town's furniture */
  const townKinds = new Set(cat.filter((e) => e.group === 'town').map((e) => e.id));
  const inTownIds = [];
  for (let i = 0; i < P1.n; i++) if (regAtG(P1.x[i], P1.y[i]) === 'town') inTownIds.push(idOf(i));
  const gates = [];
  for (let i = 0; i < P1.n; i++) if (idOf(i) === 'gate') gates.push([P1.x[i], P1.y[i]]);
  ok(`the town has its furniture -- lamps, benches, the well, the bragging board, barrels, crates, hay, troughs, hitching rails, the cart, signposts -- and nothing wild (${inTownIds.length} things)`,
    ['lamp', 'bench', 'well', 'noticeboard', 'barrel', 'crate', 'haybale', 'trough', 'hitch', 'cart', 'signpost'].every((k) => inTownIds.includes(k)) &&
    inTownIds.every((k) => townKinds.has(k) || byId[k].kind === 'building'), [...new Set(inTownIds)]);
  const gb = gates.map(([x, y]) => footprintOf('gate', 'prop', x, y, 270, 170));
  const [mx0, mx1] = [gOf(gridInfo(PLAN).cx - T.main, 0)[0], gOf(gridInfo(PLAN).cx + T.main, 0)[0]];
  ok('the town gate stands over Main Street at both ends, its two posts beside the street and the street open between them',
    gates.length === 2 && gb.every((b) => b.length === 2 && b[0].x1 < mx0 + 30 && b[1].x0 > mx1 - 30), gb.map((b) => b.map((q) => Math.round(q.x0))));

  /* nature: on the land, off everything else */
  const wild = new Set(cat.filter((e) => e.kind === 'nature').map((e) => e.id));
  const TALL = new Set(['oak', 'orchard', 'pine', 'birch', 'deadtree', 'palm', 'hoodoo', 'pylon', 'coil', 'netpole', 'slimetree', 'mangrove', 'jungletree', 'wildfruit']);
  const badSpot = [], wrongLand = [], tooNear = [];
  const free = (c) => c === C.ground || c === C.obstacle;
  let big = 0, bigInClump = 0;
  for (let i = 0; i < P1.n; i++) {
    const id = idOf(i);
    if (!wild.has(id)) continue;
    const x = P1.x[i], y = P1.y[i], c = clsAtG(x, y), r = regAtG(x, y);
    if (!free(c)) badSpot.push([id, CLASS_IDS[c]]);
    if (r !== byId[id].group) wrongLand.push([id, r]);
    /* the trees, pylons and rock stacks (the kinds only the tall layer
       places): a free cell all round the one they stand in */
    if (TALL.has(id)) {
      big++;
      if (c === C.obstacle) bigInClump++;
      for (const [u, v] of [[-24, 0], [24, 0], [0, -24], [0, 24]]) { const cc = clsAtG(x + u, y + v); if (!free(cc)) { tooNear.push([id, CLASS_IDS[cc]]); break; } }
    }
  }
  ok('nothing wild stands on a road, a street, a bridge, the railway, water, lava, a cliff, a plot, a camp, a landmark or a gate', badSpot.length === 0, badSpot.slice(0, 6));
  ok('every land grows only its own things: no pine in the dunes, no cactus in the snow', wrongLand.length === 0, wrongLand.slice(0, 6));
  ok('a tree or anything tall keeps a cell (24 game px) all round from a road, water or a cliff, so no trunk stands in one', tooNear.length === 0, tooNear.slice(0, 6));
  ok(`the plan's obstacle clumps are woods and rock fields at last: most of the tall things stand in them (${bigInClump} of ${big})`,
    big > 2000 && bigInClump / big > 0.5, { big, bigInClump });
  const perLand = Object.create(null);
  for (let i = 0; i < P1.n; i++) { const g = byId[idOf(i)].group; perLand[g] = (perLand[g] || 0) + 1; }
  ok('every land has its things', ['commons', 'frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'].every((g) => perLand[g] > 150), perLand);
  /* the shore things by the water */
  const isWet = (c) => c === C.water || c === C.river || c === C.ocean;
  let shoreN = 0, shoreNear = 0;
  for (let i = 0; i < P1.n; i++) {
    if (!['driftwood', 'rowboat', 'netpole', 'shell'].includes(idOf(i))) continue;
    shoreN++;
    let near = false;
    for (let d = 24; d <= 96 && !near; d += 24) for (const [u, v] of [[-d, 0], [d, 0], [0, -d], [0, d], [-d, -d], [d, -d], [-d, d], [d, d]]) if (isWet(clsAtG(P1.x[i] + u * 0.75, P1.y[i] + v * 0.75)) || isWet(clsAtG(P1.x[i] + u, P1.y[i] + v))) { near = true; break; }
    if (near) shoreNear++;
  }
  ok(`the sea caves' driftwood, boats, nets and shells are mostly by the water (${shoreNear} of ${shoreN} within 96 game px)`, shoreN > 100 && shoreNear / shoreN > 0.5, { shoreN, shoreNear });

  /* the game's pictures and footprints */
  const man = JSON.parse(fs.readFileSync(new URL('../../public/world/objects/manifest.json', import.meta.url)));
  const foot = objectFootprints(P1, man);
  const hall = P1.kinds.indexOf('townhall');
  /* v2.3.2976: the Town Hall came, the owner: "Town hall should be there but
     here it is again" -- every kind placed now has its picture */
  ok(`every object placed has its picture, the Town Hall too, and its footprint (${man.objects.length} kinds)`,
    foot.present[hall] === 1 && foot.present.every((v) => v === 1) && man.objects.length === P1.kinds.length && foot.boxes.length > 4 * 5000, { present: foot.present.reduce((a, b) => a + b, 0), kinds: P1.kinds.length });
  /* ...and one with none is neither drawn nor in anyone's way: the game's
     copy as it was before the Town Hall came */
  const noHall = objectFootprints(P1, { ...man, objects: man.objects.filter((o) => o.id !== 'townhall') });
  let hallAt = -1;
  for (let i = 0; i < P1.n && hallAt < 0; i++) if (P1.kind[i] === hall) hallAt = i;
  ok('...and an object with no picture yet is not drawn and stops nobody (the copy before the Town Hall came)',
    hallAt >= 0 && noHall.present[hall] === 0 && noHall.boxOf[hallAt + 1] === noHall.boxOf[hallAt] && foot.boxOf[hallAt + 1] > foot.boxOf[hallAt], { hallAt });
  const boxes = [];
  for (let i = 0; i < P1.n; i++) for (let b = foot.boxOf[i]; b < foot.boxOf[i + 1]; b++) boxes.push([foot.boxes[b * 4], foot.boxes[b * 4 + 1], foot.boxes[b * 4 + 2], foot.boxes[b * 4 + 3], idOf(i)]);
  const g0 = gridInfo(PLAN);
  const [arX, arY] = gOf(g0.cx, g0.cy + 0.25 * g0.P);
  const ms = mayorSpot(PLAN, bp);
  const inside = (x, y, m = 0) => boxes.filter((q) => x > q[0] - m && x < q[2] + m && y > q[1] - m && y < q[3] + m).map((q) => q[4]);
  ok('where you arrive and where Mayor Bro stands are clear of every footprint, with room round them',
    inside(arX, arY, 40).length === 0 && !!ms && inside(ms.x, ms.y, 24).length === 0 && regAtG(ms.x, ms.y) === 'town' && clsAtG(ms.x, ms.y) === C.plaza,
    { arrival: inside(arX, arY, 40), mayor: ms && inside(ms.x, ms.y, 24) });
  /* a building's footprint: its plot's width, back from its door */
  const bBox = boxes.filter((q) => byId[q[4]].kind === 'building');
  ok('each building stops you on its own plot: its width, and back from its porch half its height (the roof you walk behind)',
    bBox.length === 17 && bBox.every((q) => { const l = townLots.find((t) => t.id === q[4]); const [x0, y0] = gOf(l.x0, l.y0), [x1, y1] = gOf(l.x1, l.y1); return q[0] >= x0 - 2 && q[2] <= x1 + 2 && Math.abs(q[3] - y1) < 1 && q[3] - q[1] > 140; }), bBox.length);
  /* v2.3.2976: the door check above went by the plan's height budgets; with
     all seventeen pictures in, by the pictures themselves -- one drawn in
     front of another's door would hide it */
  const picOf = Object.create(null);
  for (const o of man.objects) if (o.kind === 'building' && o.pieces.length) picOf[o.id] = o.pieces[0];
  const covered = [];
  for (const a of tp.lots) for (const b of tp.lots) {
    const p = picOf[a.id];
    if (a === b || !p) continue;
    const hw = p.gameW / WPA / 2, h = p.gameH / WPA;
    if (b.foot.x > a.foot.x - hw && b.foot.x < a.foot.x + hw && b.foot.y > a.foot.y - h && b.foot.y < a.foot.y) covered.push([a.id, b.id]);
  }
  ok(`...and as drawn: no building's picture covers another's door, all ${Object.keys(picOf).length} of them (the Town Hall ${picOf.townhall ? `${picOf.townhall.gameW} x ${picOf.townhall.gameH}` : 'missing'} game px)`,
    Object.keys(picOf).length === 17 && covered.length === 0, covered);

  /* the sprite sheets: palette PNGs, a few objects a page, a building a page */
  const dir = new URL('../../public/world/objects/', import.meta.url);
  let palette = 0, bytes = 0, framesOk = true, maxCol = 0;
  const buildingPages = man.atlases.filter((a) => a.group === 'buildings');
  for (const a of man.atlases) {
    const buf = fs.readFileSync(new URL(a.image, dir));
    bytes += buf.length;
    if (buf[25] === 3) palette++;
    const sheet = JSON.parse(fs.readFileSync(new URL(a.sheet, dir)));
    const img = decodePNG(buf);
    const cols = new Set();
    for (let o = 0; o < img.data.length; o += 4) if (img.data[o + 3]) cols.add((img.data[o] << 16) | (img.data[o + 1] << 8) | img.data[o + 2]);
    maxCol = Math.max(maxCol, cols.size);
    for (const o of man.objects) for (const pc of o.pieces) if (pc.atlas === a.name) {
      const fr = sheet.frames[pc.frame];
      if (!fr || fr.frame.w !== pc.w || fr.frame.h !== pc.h || fr.anchor.x !== 0.5 || fr.anchor.y !== 1 || Math.abs(pc.gameW - pc.w / 2) > 0.01) framesOk = false;
    }
  }
  ok(`the game's objects are ${man.atlases.length} sprite sheets, every one a palette PNG of ${PAGE_COLOURS} colours or fewer (at most ${maxCol}): ${(bytes / 1048576).toFixed(1)} MB, where one full-colour sheet a land was 15.7`,
    palette === man.atlases.length && maxCol <= PAGE_COLOURS && bytes < 7 * 1048576, { palette, bytes, maxCol });
  ok('...each building a page of its own, so only the ones near you are in memory', buildingPages.length === 17 && buildingPages.every((a) => a.kinds.length === PAGE_KINDS.buildings), buildingPages.length);
  ok('...every object\'s every piece a frame of its page, its size, its anchor at its foot, 2 px a game px', framesOk);
  /* the packer itself: kinds join a page while their colours fit */
  const fake = (id, n, w = 60, h = 60) => ({ id, colours: new Set(Array.from({ length: n }, (_, k) => (id.length << 16) + k * 7 + id.charCodeAt(0) * 1000)), items: [{ name: id + '-1', w, h }] });
  const pg = pagesByColour([fake('a', 64), fake('bb', 64), fake('ccc', 64), fake('dddd', 64), fake('eeeee', 64)]);
  const pg1 = pagesByColour([fake('a', 64), fake('bb', 64)], { kinds: 1 });
  ok('the packer puts kinds on a page while their colours together fit a palette PNG: three of 64 colours a page, then the next',
    pg.length === 2 && pg[0].objects.length === 3 && pg[0].colours <= 255 && pg1.length === 2, pg.map((p) => p.objects));
}

/* ── v2.3.2978: the Wheel's monsters, at the inner end of each spoke ──
   Owner, 2026-10-02: "can you place the monsters where they belong in their
   zones (on the ends closest to the central map)?"  The worker cannot build
   the plan (~1 s, 13 MB), so where they stand is baked into
   server/src/wheelspawns.js -- and the worker redeploys only when server/**
   changes, so a plan (or placing) change must re-bake it in the same PR. */
console.log('monsters on the Wheel (v2.3.2978)');
{
  const { bakeWheelSpawns, wheelSpawnsSource, SPAWN_RULES } = await import('./bake-wheel-spawns.mjs');
  const { placeObjects, objectFootprints } = await import('../../public/tools/world/core/placing.js');
  const fs = await import('node:fs');
  const b = bakeWheelSpawns();
  const onDisk = fs.readFileSync(new URL('../../server/src/wheelspawns.js', import.meta.url), 'utf8');
  ok('the worker\'s copy of where they stand is the plan\'s (if not: node tools/world/bake-wheel-spawns.mjs)', onDisk === wheelSpawnsSource(b));
  const HOMES = ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'];
  const cellG = bp.scale * PLAN.worldPxPerArtPx;
  const ri = Object.create(null);
  bp.regionIds.forEach((k, i) => { ri[k] = i; });
  const cellOf = (x, y) => Math.floor(y / cellG) * bp.w + Math.floor(x / cellG);
  ok('each of the eight lands has places for its six', HOMES.every((h) => b.spawns[h] && b.spawns[h].points.length >= 6),
    HOMES.map((h) => b.spawns[h] && b.spawns[h].points.length));
  const off = [];
  for (const h of HOMES) for (const [x, y] of (b.spawns[h] || { points: [] }).points) {
    const i = cellOf(x, y);
    if (bp.reg[i] !== ri[h] || bp.cls[i] !== C.ground || bp.tier[i] !== 1) off.push({ h, x, y, reg: bp.regionIds[bp.reg[i]], tier: bp.tier[i] });
  }
  ok('every one on open ground of its own land, on its first stage: levels 1-5, the end nearest the centre', off.length === 0, off.slice(0, 4));
  const tooClose = [];
  for (const h of HOMES) {
    const pts = (b.spawns[h] || { points: [] }).points;
    for (let a = 0; a < pts.length; a++) for (let c = a + 1; c < pts.length; c++) {
      if (Math.hypot(pts[a][0] - pts[c][0], pts[a][1] - pts[c][1]) < SPAWN_RULES.apart) tooClose.push(h);
    }
  }
  ok(`...spread out, ${SPAWN_RULES.apart} px apart at the least`, tooClose.length === 0, tooClose);
  /* the safe ground (the worker keeps monsters off it): one circle holding
     every land cell of the commons and the town, short of every place */
  let farCommons = 0;
  for (let i = 0; i < bp.w * bp.h; i++) {
    if ((bp.reg[i] !== ri.commons && bp.reg[i] !== ri.town) || bp.cls[i] === C.ocean || bp.cls[i] === C.water || bp.cls[i] === C.river) continue;
    const x = ((i % bp.w) + 0.5) * cellG - b.centre[0], y = (((i / bp.w) | 0) + 0.5) * cellG - b.centre[1];
    farCommons = Math.max(farCommons, Math.hypot(x, y));
  }
  const nearPlace = Math.min(...HOMES.flatMap((h) => (b.spawns[h] || { points: [] }).points.map(([x, y]) => Math.hypot(x - b.centre[0], y - b.centre[1]))));
  ok(`the safe ground holds all of the commons and the town (out to ${Math.round(farCommons)} px, the circle ${b.safeR}) and stops ${Math.round(nearPlace - b.safeR)} px short of the nearest place`,
    farCommons < b.safeR && nearPlace - b.safeR >= 100, { farCommons, safeR: b.safeR, nearPlace });
  /* and never inside a tree, a rock or a building: the game's own footprints */
  const man = JSON.parse(fs.readFileSync(new URL('../../public/world/objects/manifest.json', import.meta.url)));
  const F = objectFootprints(placeObjects(PLAN, bp), man);
  const inside = [];
  for (const h of HOMES) for (const [x, y] of (b.spawns[h] || { points: [] }).points) {
    for (let q = 0; q < F.boxes.length; q += 4) {
      if (x >= F.boxes[q] && x <= F.boxes[q + 2] && y >= F.boxes[q + 1] && y <= F.boxes[q + 3]) { inside.push({ h, x, y }); break; }
    }
  }
  ok('...and none inside anything that stands there (the game\'s own footprints)', inside.length === 0, inside.slice(0, 4));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
