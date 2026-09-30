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
 *   zip       backups round-trip
 *
 * The fuse cases run on a procedurally painted test image rather than a real
 * zone painting so the suite needs no image decoder; tools/qa/world-page.mjs
 * repeats them on real paintings in Chromium.
 *
 *   node tools/world/test-world-core.mjs
 */
import { PLAN, SPOKES } from '../../public/tools/world/plan.js';
import { PIXEL, NO_DIRECTION } from '../../public/tools/style/bible.js';
import { promptFor } from '../../public/tools/ground/prompts.js';
import { gridInfo, cellName, parseCell, cellRect, cellAt, allCells, neighbours } from '../../public/tools/world/core/grid.js';
import { buildBlueprint, renderSketch, colorTable, planKey, C, CLASS_IDS } from '../../public/tools/world/core/layout.js';
import { spokePoint, arcPoint } from '../../public/tools/world/core/wheel.js';
import { groundCatalog, materialMap, composeGround, swatchesUnder, walkBits, overviewPixels, edgeRecipe, groundContacts, EDGE_CLEAR, EDGE_PIECES, edgePiecesOn } from '../../public/tools/world/core/ground.js';
import { buildPrompt } from '../../public/tools/world/core/prompt.js';
import { gridMinCut, INF } from '../../public/tools/world/core/maxflow.js';
import { fuseSquare } from '../../public/tools/world/core/fuse.js';
import { makeImg, crop, warpAffine, blurField, resample } from '../../public/tools/world/core/image.js';
import { mulberry32, fbm, valueNoise } from '../../public/tools/world/core/rng.js';
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
  ok('past the gates the streets become roads', [[0, -1000], [1000, 0], [0, 1000], [-1000, 0]].every(([dx, dy]) => at(g.cx + dx, g.cy + dy) === C.path));
  const townLots = bp.lots.filter((l) => l.town), places = bp.lots.filter((l) => !l.town);
  ok('Brotown has the Town Hall plus 16 plots along its streets', townLots.length === 17 && townLots.every((l) => at((l.x0 + l.x1) / 2, (l.y0 + l.y1) / 2) === C.lot), townLots.length);
  ok('every plot fronts a boardwalk', townLots.filter((l) => l.id !== 'townhall').every((l) => {
    const mx = (l.x0 + l.x1) / 2, my = (l.y0 + l.y1) / 2;
    return [[l.x0 - 12, my], [l.x1 + 12, my], [mx, l.y0 - 12], [mx, l.y1 + 12]].some(([x, y]) => at(x, y) === C.boardwalk);
  }));
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
  ok('every road starts at a town gate or ON another road (so forks join cleanly)', PLAN.roads.every((r) => Math.hypot(r.pts[0][0], r.pts[0][1]) < 1.2 ||
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
  const pointing = cat.filter((e) => DIRECTIONAL.test(e.brief)).map((e) => `${e.id}: ${e.brief}`);
  ok('no swatch brief asks for anything that runs one way (ruts, tracks, rows, planks, ripples, streaks)', pointing.length === 0, pointing);
  const noDir = cat.filter((e) => !promptFor(e).includes(NO_DIRECTION)).map((e) => e.id);
  ok('...every swatch prompt says so, and the rewritten ones are marked for the Ground Studio',
    noDir.length === 0 && ['street', 'road', 'boardwalk', 'frost-2', 'sky-2', 'mist-1', 'border-thunder-tidal'].every((id) => cat.find((e) => e.id === id).revised === 'v2.3.2944'),
    { noDir, revised: cat.filter((e) => e.revised).map((e) => e.id) });
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
    matAt(bp.x0 + 10, bp.y0 + 10) === 'water' && matAt(cx1, cy1) === 'commons' && matAt(g.cx, g.cy) === 'town-yard' && matAt(g.cx, g.cy - 1000) === 'road');
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
  /* up the north street from the square, where its boardwalks run */
  const RT = { x: Math.round(g.cx - 200), y: Math.round(g.cy - 600), w: 400, h: 320 };
  const town = composeGround(PLAN, bp, mm, RT, {}, { scale: 3 });
  const TW = town.w;
  let offCell = 0, bwPx = 0;
  for (let y = 0; y < town.h; y++) for (let x = 0; x < TW; x++) {
    const ax = RT.x + (x + 0.5) / 3, ay = RT.y + (y + 0.5) / 3;
    const cq = mm.mat[Math.floor((ay - bp.y0) / bp.scale) * bp.w + Math.floor((ax - bp.x0) / bp.scale)];
    const q = town.mat[y * TW + x];
    if (mm.built[cq] ? q !== cq : mm.built[q]) offCell++;
    if (mm.ids[q] === 'boardwalk') bwPx++;
  }
  ok('the street, the boardwalks and the square are laid exactly on their cells, with straight edges', offCell === 0 && bwPx > 1000 && ['street', 'boardwalk', 'plaza'].every((id) => mm.built[mm.index[id]]), { offCell, bwPx });
  const seenPx = new Uint8Array(town.mat.length);
  let pieces = 0, specks = 0;
  for (let i = 0; i < town.mat.length; i++) {
    if (seenPx[i] || mm.ids[town.mat[i]] !== 'boardwalk') continue;
    let n = 0; const st = [i]; seenPx[i] = 1;
    while (st.length) {
      const j = st.pop(); n++;
      const x = j % TW, y = (j / TW) | 0;
      for (const k of [x > 0 ? j - 1 : -1, x < TW - 1 ? j + 1 : -1, y > 0 ? j - TW : -1, y < town.h - 1 ? j + TW : -1]) {
        if (k >= 0 && !seenPx[k] && mm.ids[town.mat[k]] === 'boardwalk') { seenPx[k] = 1; st.push(k); }
      }
    }
    pieces++; if (n < 400) specks++;
  }
  ok(`...so the one-cell boardwalks along the streets stay whole: ${pieces} strips, no specks`, pieces > 0 && specks === 0, { pieces, specks });
  const bridgeCells = [];
  for (let i = 0; i < bp.w * bp.h; i++) if (mm.ids[mm.mat[i]] === 'boardwalk' && bp.regionIds[bp.reg[i]] !== 'town') bridgeCells.push(i);
  const shut = bridgeCells.filter((i) => bits[i >> 3] & (1 << (i & 7))).length;
  ok(`...and a bridge is always walkable, however wide the river under it (${bridgeCells.length} bridge cells)`, bridgeCells.length > 0 && shut === 0, { shut });
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
  ok('grounds lie in one order: grass over the road, snow over grass, sand over rock, rock over lava; the town and two of a kind stay as they were',
    over('commons', 'road') && over('frost-2', 'commons') && over('sky-2', 'sky-3') && over('ember-3', 'lava') && over('commons', 'town-yard') &&
    rc('street', 'town-yard') === null && rc('boardwalk', 'commons') === null && rc('plaza', 'town-yard') === null && rc('commons', 'commons') === null);
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

/* ── zip ── */
console.log('zip');
{
  const files = [{ name: 'backup.json', data: new TextEncoder().encode('{"a":1}') }, { name: 'squares/F7.png', data: new Uint8Array([137, 80, 78, 71, 1, 2, 3]) }];
  const back = await unzip(zipStore(files));
  ok('a backup zip round-trips', back.length === 2 && back[1].name === 'squares/F7.png' && back[1].data.join() === files[1].data.join() && new TextDecoder().decode(back[0].data) === '{"a":1}');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
