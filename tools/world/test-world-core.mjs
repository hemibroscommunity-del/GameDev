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
import { spokePoint, arcPoint, wheelInfo } from '../../public/tools/world/core/wheel.js';
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
  /* (v2.3.2994: the standard town is the 1.5x one -- each street its own
     gate, Main Street's at gateNS, Market Row's at gateEW) */
  const gNS = PLAN.town.gateNS || PLAN.town.gate, gEW = PLAN.town.gateEW || PLAN.town.gate;
  /* (...and past the west gate the road is straight onto the Mill Bridge,
     the bigger town reaching nearly to the Sweetwater River) */
  ok('past the gates the streets become roads', [[0, -(gNS + 150)], [gEW + 150, 0], [0, gNS + 150], [-(gEW + 150), 0]].every(([dx, dy]) => at(g.cx + dx, g.cy + dy) === C.path || at(g.cx + dx, g.cy + dy) === C.bridge));
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
  /* (v2.3.2994: just past the town's edge each way round, wherever that is --
     the 1.5x town reaches where these were read before) */
  const commonsTier = [[1, 0.47], [-0.47, 1], [-1, -0.47], [0.47, -1]].map(([ux, uy]) => {
    let t = 0.5;
    while (t < 3 && regAt(...art([ux * t, uy * t])) === 'town') t += 0.05;
    const [x, y] = art([ux * (t + 0.2), uy * (t + 0.2)]);
    return [regAt(x, y), tierOf(x, y)];
  });
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
  const gateSq = Math.max(PLAN.town.gate, PLAN.town.gateNS || 0, PLAN.town.gateEW || 0) / (PLAN.square.px - PLAN.square.overlap);   /* v2.3.2994: each street's own */
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
  /* (v2.3.2994: the square the north gate is in -- further out in the 1.5x town) */
  const north = P(sqAt([0, -((PLAN.town.gateNS || PLAN.town.gate) + 40) / (PLAN.square.px - PLAN.square.overlap)]));
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
  /* (v2.3.2980: 48 grounds and the water's three pictures) */
  ok(`the catalog lists every swatch the world needs (${cat.length})`, cat.length === 51 && ids.size === 51 &&
    cat.filter((e) => e.water).map((e) => e.id).join() === 'sea,shallows,fresh' &&
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
  /* (v2.3.2994: a commons point clear of the bigger town, and the road past
     Main Street's own gate) */
  const [cx1, cy1] = art([1.3, 1.3]);
  /* (v2.3.3031: the square is paved under the Town Hall too -- the designed town; the old town's hall stood on the yard) */
  ok('the sea is water, the commons is the commons, the Town Hall stands on the square\'s paving, roads are road',
    matAt(bp.x0 + 10, bp.y0 + 10) === 'water' && matAt(cx1, cy1) === 'commons' && matAt(g.cx, g.cy) === 'plaza' && matAt(g.cx, g.cy - ((PLAN.town.gateNS || PLAN.town.gate) + 150)) === 'road');
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
  /* (v2.3.2994: read off the plots themselves -- the 1.5x town's are bigger
     and further out) */
  const firstUp = bpW.lots.filter((l) => l.town && l.arm === 'north').sort((a, b) => b.y1 - a.y1).slice(0, 2);
  const doorY = firstUp[0].y1, upX0 = Math.min(...firstUp.map((l) => l.x0)), upX1 = Math.max(...firstUp.map((l) => l.x1));
  const RT = { x: Math.round(upX0), y: Math.round(doorY - 60), w: Math.round(upX1 - upX0), h: 120 };
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
  /* (v2.3.3031: the square is paved under the Town Hall now, so the yards turn into the square
     along the square's NORTH edge, in front of the Guild Hall's porch, where they did along the
     bottom of the Town Hall's plot) */
  const plotCol = Math.floor((g.cx - 170 - bp.x0) / bp.scale), cyMid = Math.floor((g.cy - 440 - bp.y0) / bp.scale);
  let plotLineY = null;
  for (let cy = cyMid; cy < cyMid + 12 && plotLineY === null; cy++) {
    if (mm.ids[mm.mat[cy * bp.w + plotCol]] === 'town-yard' && mm.ids[mm.mat[(cy + 1) * bp.w + plotCol]] === 'plaza') plotLineY = bp.y0 + (cy + 1) * bp.scale;
  }
  const plotR = { x: Math.round(g.cx - 240), y: (plotLineY || 0) - 50, w: 140, h: 100 };
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
  ok(`...and the yards turn into the blend along a ragged line, not a straight one (the square's north edge, before the Guild Hall: it wanders ${blendE.spread} game px against a plain mix's ${plainE.spread}, its straightest stretch ${blendE.straight} game px against ${plainE.straight})`,
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
  /* v2.3.3057: the world map's level bands and Bro Pond */
  ok(`...each land's level bands: a tick where every tier of five levels begins, from the commons' edge outward (${m.lands[0].ticks.length / 2} a land), the spoke ${m.spokeHalf * 2} px wide; and Bro Pond named`,
    m.spokeHalf > 1000 && m.lands.every((l) => l.ticks.length === (m.tiers + 1) * 2 && l.ticks.every((v) => v >= 0 && v <= m.worldW)
      && l.ticks.every((v, i) => i < 2 || i % 2 || Math.hypot(l.ticks[i] - c, l.ticks[i + 1] - c) > Math.hypot(l.ticks[i - 2] - c, l.ticks[i - 1] - c)))
      && m.places.some((p) => p.kind === 'pond' && /Bro Pond/.test(p.name)),
    { spokeHalf: m.spokeHalf, ticks: m.lands[0].ticks.slice(0, 6) });
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
  const { placeObjects, footprintOf, objectFootprints, mayorSpot, PLACING, TOWN_GARDEN } = await import('../../public/tools/world/core/placing.js');
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
  /* (v2.3.3031: and its gardens -- trees, bushes, flowers, stones, a haystack, the ore yard's cart and coal -- but no
     other wild thing: placing.js townGrounds, TOWN_GARDEN) */
  ok(`the town has its furniture -- lamps, benches, the well, the bragging board, barrels, crates, hay, troughs, hitching rails, the cart, signposts -- and its gardens, nothing else wild (${inTownIds.length} things)`,
    ['lamp', 'bench', 'well', 'noticeboard', 'barrel', 'crate', 'haybale', 'trough', 'hitch', 'cart', 'signpost'].every((k) => inTownIds.includes(k)) &&
    inTownIds.every((k) => townKinds.has(k) || byId[k].kind === 'building' || TOWN_GARDEN.includes(k)), [...new Set(inTownIds)]);
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
    if (r !== byId[id].group && !(r === 'town' && TOWN_GARDEN.includes(id))) wrongLand.push([id, r]);
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

/* ── v2.3.2980: the water's own pictures ──
   Owner: "I don't see anywhere to add water in the ground studio and also
   give me the prompts."  Three swatches -- the open sea, its shallows along
   the shore, fresh water -- each a look of the one water material. */
console.log("the water's pictures (v2.3.2980)");
{
  const { WATER_SWATCHES, swatchesUnder: under } = await import('../../public/tools/world/core/ground.js');
  const { promptFor } = await import('../../public/tools/ground/prompts.js');
  const { NO_DIRECTION } = await import('../../public/tools/style/bible.js');
  const { stepOf } = await import('../../public/tools/world/core/footsteps.js');
  const mmW = materialMap(PLAN, bp);
  const cat = groundCatalog(PLAN);
  const solid = (r, gg, b) => { const T = 16, t = { w: T, h: T, data: new Uint8ClampedArray(T * T * 4) }; for (let i = 0; i < T * T; i++) t.data.set([r, gg, b, 255], i * 4); return t; };
  const SEA = [200, 0, 0], SHALLOWS = [0, 200, 0], FRESH = [0, 0, 200];
  const wtiles = { sea: { A: solid(...SEA) }, shallows: { A: solid(...SHALLOWS) }, fresh: { A: solid(...FRESH) } };
  const tally = (out) => {
    const n = { sea: 0, shallows: 0, fresh: 0, foam: 0, other: 0, water: 0 };
    for (let i = 0; i < out.w * out.h; i++) {
      if (mmW.ids[out.mat[i]] !== 'water') continue;
      n.water++;
      const r = out.data[i * 4], gg = out.data[i * 4 + 1], b = out.data[i * 4 + 2];
      if (r === 200 && gg === 0 && b === 0) n.sea++;
      else if (r === 0 && gg === 200 && b === 0) n.shallows++;
      else if (r === 0 && gg === 0 && b === 200) n.fresh++;
      else if (r === 226 && gg === 238 && b === 240) n.foam++;
      else n.other++;
    }
    return n;
  };
  ok('the Ground Studio has the water\'s three pictures, in a Water group, not walked on',
    WATER_SWATCHES.join() === 'sea,shallows,fresh' && WATER_SWATCHES.every((id) => { const e = cat.find((q) => q.id === id); return e && e.group === 'water' && e.water && e.kind === 'liquid'; })
    && WATER_SWATCHES.every((id) => !stepOf(id)), WATER_SWATCHES);
  const pr = promptFor(cat.find((q) => q.id === 'sea'));
  ok('...each with a prompt for a seamless square of WATER, running no one way, its foam left to the game',
    /^A seamless, tileable square texture of water/.test(pr) && pr.includes(NO_DIRECTION) && /no shore, no foam/.test(pr) && WATER_SWATCHES.every((id) => promptFor(cat.find((q) => q.id === id)).includes(cat.find((q) => q.id === id).brief)));
  /* the Mill Bridge's river (fresh) and the sea in the Wheel's corner */
  const [mx, my] = art([-2.02, 0]);
  const Rm = { x: Math.round(mx - 64), y: Math.round(my - 64), w: 128, h: 128 };
  /* out from the centre between two spokes: the shore, and open sea well past it */
  const [ccx, ccy] = art([0, 0]);
  const ang = Math.atan2(W.spokes[0].uy + W.spokes[1].uy, W.spokes[0].ux + W.spokes[1].ux);
  const clsAt = (x, y) => bp.cls[Math.floor((y - bp.y0) / bp.scale) * bp.w + Math.floor((x - bp.x0) / bp.scale)];
  const along = (r) => [ccx + Math.cos(ang) * r, ccy + Math.sin(ang) * r];
  let shoreR = null;
  for (let r = 300; r < 9000 && shoreR == null; r += 4) if (clsAt(...along(r)) === C.ocean) shoreR = r;
  let deepR = null;
  for (let r = shoreR + 300; r < 12000 && deepR == null; r += 16) {
    const [x, y] = along(r);
    let all = true;
    /* (the shallows reach about 100 art px out from any land, rocks and all) */
    for (let dy = -208; dy <= 256 && all; dy += 8) for (let dx = -208; dx <= 256 && all; dx += 8) all = clsAt(x + dx, y + dy) === C.ocean;
    if (all) deepR = r;
  }
  const [dx0, dy0] = along(deepR);
  const Rs = { x: Math.round(dx0), y: Math.round(dy0), w: 48, h: 48 };
  ok('a piece over water asks for the water\'s pictures', WATER_SWATCHES.every((id) => under(bp, mmW, Rs).has(id) && under(bp, mmW, Rm).has(id)));
  const plainS = tally(composeGround(PLAN, bp, mmW, Rs, {}, { scale: 3 }));
  ok('until one is made, the water is drawn in the plan\'s blues exactly as before', plainS.water > 0 && plainS.sea + plainS.shallows + plainS.fresh === 0, plainS);
  const seaT = tally(composeGround(PLAN, bp, mmW, Rs, wtiles, { scale: 3 }));
  ok(`the open sea is drawn from the sea's picture (${seaT.sea} of ${seaT.water} px)`, seaT.water > 0 && seaT.sea === seaT.water, seaT);
  const rivT = tally(composeGround(PLAN, bp, mmW, Rm, wtiles, { scale: 3 }));
  ok(`a river is drawn from the fresh water's alone (${rivT.fresh} px, ${rivT.foam} of foam at its banks)`, rivT.fresh > 200 && rivT.sea === 0 && rivT.shallows === 0 && rivT.foam > 0 && rivT.other === 0, rivT);
  /* a shore, from the land out past the shallows (about 60 art px of them) */
  const [shx, shy] = along(shoreR + 64);
  const Rc = { x: Math.round(shx - 96), y: Math.round(shy - 96), w: 192, h: 192 };
  const shT = tally(composeGround(PLAN, bp, mmW, Rc, wtiles, { scale: 3 }));
  ok(`along a shore: foam at the edge, the shallows' picture, then the sea's (${shT.foam} / ${shT.shallows} / ${shT.sea} px)`,
    shT.foam > 0 && shT.shallows > 0 && shT.sea > 0 && shT.other === 0, shT);
  /* pieces laid apart still meet: the look is a function of where it is */
  const whole = composeGround(PLAN, bp, mmW, Rc, wtiles, { scale: 3 });
  const lh = composeGround(PLAN, bp, mmW, { ...Rc, w: 96 }, wtiles, { scale: 3 }), rh = composeGround(PLAN, bp, mmW, { ...Rc, x: Rc.x + 96, w: 96 }, wtiles, { scale: 3 });
  let wseam = 0;
  for (let y = 0; y < whole.h; y++) for (let x = 0; x < whole.w; x++) for (let c2 = 0; c2 < 4; c2++) {
    const v = x < 288 ? lh.data[(y * 288 + x) * 4 + c2] : rh.data[(y * 288 + x - 288) * 4 + c2];
    if (v !== whole.data[(y * whole.w + x) * 4 + c2]) wseam++;
  }
  ok('...and two halves of a shore laid apart match the whole, water and all', wseam === 0, wseam);

  /* v2.3.2984: the owner made the sea and its shallows ("Is this what you
     need for water?") and not fresh water yet -- a look not made yet
     borrows one that is, never the plan's flat blue beside real pictures */
  const { SHALLOW_CELLS, SHALLOW_WANDER } = await import('../../public/tools/world/core/ground.js');
  const twoT = { sea: wtiles.sea, shallows: wtiles.shallows };
  const riv2 = tally(composeGround(PLAN, bp, mmW, Rm, twoT, { scale: 3 }));
  ok(`with fresh water not made yet, a river takes the shallows' picture (${riv2.shallows} of ${riv2.water} px)`,
    riv2.shallows > 200 && riv2.sea === 0 && riv2.fresh === 0 && riv2.other === 0, riv2);
  const seaOnly = tally(composeGround(PLAN, bp, mmW, Rc, { sea: wtiles.sea }, { scale: 3 }));
  ok('...and with only the sea made, every water px but the foam is the sea\'s', seaOnly.sea > 0 && seaOnly.sea + seaOnly.foam === seaOnly.water, seaOnly);
  /* the shallows reach about SHALLOW_CELLS (24 game px each) out from the
     shore -- until v2.3.2984 about 2, a line one bro wide round every coast:
     across each spoke's coast, square on, at its outer stages */
  const looks = (out, x, y) => {
    const i = y * out.w + x, r = out.data[i * 4], gg = out.data[i * 4 + 1], b = out.data[i * 4 + 2];
    if (mmW.ids[out.mat[i]] !== 'water') return '.';
    return r === 200 && gg === 0 && b === 0 ? 'S' : r === 0 && gg === 200 && b === 0 ? 'h' : r === 0 && gg === 0 && b === 200 ? 'f' : '~';
  };
  const runs = [];
  for (const s of W.spokes) for (const t of [2, 3]) for (const side of [-1, 1]) {
    let q0 = null;
    for (let q = 0; q < 3 && q0 == null; q += 1 / 96) { const [x, y] = art(spokePoint(s, W.tierMid(t), side * q)); if (clsAt(x, y) === C.ocean) q0 = q; }
    if (q0 == null) continue;
    const [ax0, ay0] = art(spokePoint(s, W.tierMid(t), side * (q0 - 2 / 96)));
    const [ax1, ay1] = art(spokePoint(s, W.tierMid(t), side * (q0 + 26 / 96)));
    const R = { x: Math.floor(Math.min(ax0, ax1)) - 2, y: Math.floor(Math.min(ay0, ay1)) - 2 };
    R.w = Math.ceil(Math.max(ax0, ax1)) + 2 - R.x; R.h = Math.ceil(Math.max(ay0, ay1)) + 2 - R.y;
    const out = composeGround(PLAN, bp, mmW, R, twoT, { scale: 1 });
    let line = '';
    for (let k = 0; k <= 112; k++) {
      const u = k / 112, x = Math.floor(ax0 + (ax1 - ax0) * u) - R.x, y = Math.floor(ay0 + (ay1 - ay0) * u) - R.y;
      line += looks(out, x, y);
    }
    /* from the first water to the first open sea, art px (2 a step) */
    const w0 = line.search(/[Sh~]/), s0 = line.indexOf('S', w0);
    if (w0 < 0 || s0 < 0 || /\./.test(line.slice(w0, s0))) continue;
    runs.push((s0 - w0) * 2);
  }
  runs.sort((a, b) => a - b);
  const med = runs[runs.length >> 1];
  ok(`the shallows reach about ${SHALLOW_CELLS} cells out from a coast (median ${med} art px over ${runs.length} coasts, ${runs[0]}-${runs[runs.length - 1]})`,
    runs.length >= 20 && med >= (SHALLOW_CELLS - 1.5) * 16 && med <= (SHALLOW_CELLS + 1) * 16
    && runs[0] >= (SHALLOW_CELLS - SHALLOW_WANDER - 1) * 16 && runs[runs.length - 1] <= (SHALLOW_CELLS + SHALLOW_WANDER + 1) * 16, runs);
  /* a river's mouth, or a pond that meets the sea, opens into the shallows:
     fresh water never touches the deep sea's blue */
  const mouths = [];
  for (let i = 0; i < bp.w * bp.h && mouths.length < 400; i += 7) {
    const c = bp.cls[i];
    if (c !== C.river && c !== C.water) continue;
    const x = i % bp.w, y = (i / bp.w) | 0;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => bp.cls[(y + dy) * bp.w + x + dx] === C.ocean)) mouths.push([x, y]);
  }
  let touch = 0, mouthsSeen = 0, freshPx = 0;
  for (let k = 0; k < mouths.length; k += Math.max(1, Math.floor(mouths.length / 8))) {
    const [x, y] = mouths[k], ax = bp.x0 + (x + 0.5) * bp.scale, ay = bp.y0 + (y + 0.5) * bp.scale;
    const out = composeGround(PLAN, bp, mmW, { x: Math.round(ax - 80), y: Math.round(ay - 80), w: 160, h: 160 }, wtiles, { scale: 1 });
    mouthsSeen++;
    for (let py = 0; py < out.h; py++) for (let px = 0; px < out.w; px++) {
      if (looks(out, px, py) !== 'f') continue;
      freshPx++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const qx = px + dx, qy = py + dy;
        if (qx >= 0 && qy >= 0 && qx < out.w && qy < out.h && looks(out, qx, qy) === 'S') touch++;
      }
    }
  }
  ok(`where fresh water meets the sea it opens into the shallows: no fresh px beside the deep sea's (${mouthsSeen} mouths, ${freshPx} fresh px)`,
    mouthsSeen >= 4 && freshPx > 1000 && touch === 0, { mouths: mouths.length, touch });
  /* the game's ground worker keeps a SLIM blueprint -- ground-worker.js
     init: { w, h, scale, x0, y0 }, no classes -- and the water's look must
     come from what it keeps (the materials and their fresh bits): the day
     the first water pictures came, reading the classes there broke every
     piece with water in it ("Cannot read properties of undefined") */
  const slim = { w: bp.w, h: bp.h, scale: bp.scale, x0: bp.x0, y0: bp.y0 };
  const slimRuns = [[Rc, twoT], [Rm, twoT], [Rc, wtiles], [Rm, wtiles]].map(([R, T]) => {
    const want = composeGround(PLAN, bp, mmW, R, T, { scale: 3 });
    try {
      const got = composeGround(PLAN, slim, mmW, R, T, { scale: 3 });
      let d = 0;
      for (let i = 0; i < want.data.length; i++) if (want.data[i] !== got.data[i]) d++;
      return d;
    } catch (e) { return String(e); }
  });
  ok('the game worker\'s slim blueprint (no classes) lays water exactly as the whole one does', slimRuns.every((d) => d === 0), slimRuns);

  /* ═══ v2.3.3003: WHERE YOU CAN SWIM (ground.js swimBits) ═══
     Owner: "add swimming ... and change the movement behavior".  The walk
     grid's water opens where you may swim -- every river, pond and lake and
     the sea's shallows -- and the open sea past them stays shut: worked out
     at each cell's middle exactly as the shallows are drawn, so you swim out
     to the line you see. */
  const { swimBits: swimBitsOf, walkBits: walkBitsOf } = await import('../../public/tools/world/core/ground.js');
  const wbits = walkBitsOf(slim, mmW);
  const tsw = Date.now();
  const sw = swimBitsOf(slim, mmW, (PLAN.seed | 0) + 900, wbits);
  const swMs = Date.now() - tsw;
  const bitAt = (bits, i) => !!(bits[i >> 3] & (1 << (i & 7)));
  let nSwim = 0, outside = 0, nFresh = 0, freshShut = 0, decked = 0;
  for (let i = 0; i < bp.w * bp.h; i++) {
    const s2 = bitAt(sw, i);
    if (s2) nSwim++;
    if (s2 && !bitAt(wbits, i)) outside++;
    if (mmW.mat[i] === mmW.water && (mmW.fresh[i >> 3] >> (i & 7)) & 1) {
      /* (a bridge's deck is walked on, over its river: nothing to open) */
      if (!bitAt(wbits, i)) { decked++; continue; }
      nFresh++;
      if (!s2) freshShut++;
    }
  }
  ok(`swimming opens only water the walk grid shuts (${nSwim} cells, ${swMs} ms)`, nSwim > 0 && outside === 0 && sw.length === wbits.length && swMs < 3000, { nSwim, outside, swMs });
  ok(`...every river, pond, lake and oasis (${nFresh} cells; ${decked} more under bridges' decks, walked on)`, nFresh > 0 && freshShut === 0, { nFresh, freshShut, decked });
  const cellIdx = (x, y) => Math.floor((y - bp.y0) / bp.scale) * bp.w + Math.floor((x - bp.x0) / bp.scale);
  let deepOpen = 0;
  for (let y = Rs.y; y < Rs.y + Rs.h; y += 8) for (let x = Rs.x; x < Rs.x + Rs.w; x += 8) if (bitAt(sw, cellIdx(x, y))) deepOpen++;
  ok('...and never the open sea, far from any shore', deepOpen === 0, deepOpen);
  ok('...the same answer every time', (() => { const again = swimBitsOf(slim, mmW, (PLAN.seed | 0) + 900); for (let i = 0; i < sw.length; i++) if (again[i] !== sw[i]) return false; return true; })());
  /* the line is the one drawn: at each cell's middle, the shallows' and the
     fresh water's pictures are open to swim, the open sea's is not -- along
     a coast of every spoke, at its outer stages */
  let agree = 0, cells = 0;
  const bad = [];
  for (const s3 of W.spokes) for (const t of [2, 3]) {
    let q0 = null;
    for (let q = 0; q < 3 && q0 == null; q += 1 / 96) { const [x, y] = art(spokePoint(s3, W.tierMid(t), q)); if (clsAt(x, y) === C.ocean) q0 = q; }
    if (q0 == null) continue;
    const [cx0, cy0] = art(spokePoint(s3, W.tierMid(t), q0 + 6 / 96));
    const R = { x: Math.round(cx0 - 96), y: Math.round(cy0 - 96), w: 192, h: 192 };
    const out = composeGround(PLAN, slim, mmW, R, wtiles, { scale: 1 });
    for (let by = Math.ceil((R.y - bp.y0) / bp.scale); (by + 1) * bp.scale + bp.y0 <= R.y + R.h; by++) {
      for (let bx = Math.ceil((R.x - bp.x0) / bp.scale); (bx + 1) * bp.scale + bp.x0 <= R.x + R.w; bx++) {
        const px = Math.floor(bp.x0 + (bx + 0.5) * bp.scale) - R.x, py = Math.floor(bp.y0 + (by + 0.5) * bp.scale) - R.y;
        const lk = looks(out, px, py);
        if (lk !== 'S' && lk !== 'h' && lk !== 'f') continue;
        cells++;
        const open = bitAt(sw, by * bp.w + bx);
        if (open === (lk !== 'S')) agree++;
        else if (bad.length < 6) bad.push({ bx, by, lk, open });
      }
    }
  }
  ok(`...swimming stops where the shallows' picture gives way to the sea's (${agree} of ${cells} water cells agree)`, cells > 300 && agree / cells > 0.95, { cells, agree, bad });
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
  /* v2.3.2990: the game holds a player who has not yet spoken to Mayor Bro
     inside that same circle (src/game/wheelHome.js), from its own copy */
  const { ZONES } = await import('../../src/data/zones.js');
  const zw = ZONES.wheel;
  ok(`the game's copy of the safe ground is the worker's (src/data/zones.js wheel.safeR ${zw.safeR}, round the same middle)`,
    zw.safeR === b.safeR && (zw.w * 32) / 2 === b.centre[0] && (zw.h * 32) / 2 === b.centre[1],
    { safeR: zw.safeR, want: b.safeR, centre: b.centre, size: [zw.w, zw.h] });
  /* ...and the gold road leads a quest to each land's monsters from its own
     copy of where they stand (src/game/questRoute.js) */
  const offLand = HOMES.filter((h) => !zw.lands || !zw.lands[h] || !b.spawns[h]
    || zw.lands[h][0] !== b.spawns[h].anchor[0] || zw.lands[h][1] !== b.spawns[h].anchor[1]);
  ok('the game\'s copy of where each land\'s monsters stand is the worker\'s (src/data/zones.js wheel.lands)',
    offLand.length === 0 && Object.keys(zw.lands || {}).length === HOMES.length,
    offLand.map((h) => ({ h, game: zw.lands && zw.lands[h], worker: b.spawns[h] && b.spawns[h].anchor })));
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

  /* v2.3.3013: the stretches past the first -- levels 6-10, 11-15 and 16-20,
     the rest of each land's first stage -- each with places of its own */
  const D = SPAWN_RULES.deep;
  const W = wheelInfo(PLAN);
  ok(`each land has places for its six in each of its next ${D.tiers.length} stretches (levels ${D.tiers.map((t) => W.levels(t).join('-')).join(', ')})`,
    HOMES.every((h) => b.spawns[h] && D.tiers.every((t) => { const d = (b.spawns[h].deeper || []).find((q) => q.tier === t); return d && d.points.length >= 6 && d.levels.join() === W.levels(t).join(); })),
    HOMES.map((h) => [h, (b.spawns[h].deeper || []).map((d) => `${d.tier}:${d.points.length}`).join(' ')]));
  const nearOther = (i, t, r) => {
    const R = Math.ceil(r / cellG), bx = i % bp.w, by = (i / bp.w) | 0;
    for (let y = by - R; y <= by + R; y++) for (let x = bx - R; x <= bx + R; x++) {
      if (x < 0 || y < 0 || x >= bp.w || y >= bp.h || Math.abs(x - bx) + Math.abs(y - by) >= r / cellG) continue;
      const tt = bp.tier[y * bp.w + x];
      if (tt > 0 && tt !== t) return true;
    }
    return false;
  };
  const offD = [], seamD = [], closeD = [], insideD = [];
  let lotCells = 0;
  const lotXY = [];
  for (let i = 0; i < bp.w * bp.h; i++) if (bp.cls[i] === C.lot) { lotCells++; lotXY.push([((i % bp.w) + 0.5) * cellG, (((i / bp.w) | 0) + 0.5) * cellG]); }
  let nearCamp = Infinity;
  for (const h of HOMES) for (const d of b.spawns[h].deeper || []) {
    for (const [x, y] of d.points) {
      const i = cellOf(x, y);
      if (bp.reg[i] !== ri[h] || bp.cls[i] !== C.ground || bp.tier[i] !== d.tier) offD.push({ h, t: d.tier, x, y, tier: bp.tier[i] });
      if (nearOther(i, d.tier, D.clearTier - cellG)) seamD.push({ h, t: d.tier, x, y });
      for (const [lx, ly] of lotXY) nearCamp = Math.min(nearCamp, Math.hypot(lx - x, ly - y));
      for (let q = 0; q < F.boxes.length; q += 4) {
        if (x >= F.boxes[q] && x <= F.boxes[q + 2] && y >= F.boxes[q + 1] && y <= F.boxes[q + 3]) { insideD.push({ h, t: d.tier, x, y }); break; }
      }
    }
    for (let a = 0; a < d.points.length; a++) for (let c = a + 1; c < d.points.length; c++) {
      if (Math.hypot(d.points[a][0] - d.points[c][0], d.points[a][1] - d.points[c][1]) < SPAWN_RULES.apart) closeD.push({ h, t: d.tier });
    }
  }
  ok('every deeper place on open ground of its own land, on the very stretch it is for', offD.length === 0, offD.slice(0, 4));
  ok(`...${D.clearTier} px inside its stretch, from land of any other (its levels are the ones the top bar says there)`, seamD.length === 0, seamD.slice(0, 4));
  ok(`...${SPAWN_RULES.apart} px apart within a stretch, and none inside anything that stands there`, closeD.length === 0 && insideD.length === 0, { closeD: closeD.slice(0, 3), insideD: insideD.slice(0, 3) });
  ok(`...and none within ${D.clearPlace} px of a camp's plot (the nearest ${Math.round(nearCamp)} px off)`, lotCells > 0 && nearCamp >= D.clearPlace - cellG, nearCamp);
  /* the first stretch's places are exactly where they stood before the
     deeper ones came: its rules, its pick, its output (the server's first 48) */
  ok('the first stretch\'s places are untouched by the deeper ones (the first 48 stand where they stood)',
    b.spawns.frost.points[0].join() === '18996,18996,0.48' && b.spawns.verdant.points[11].join() === '18084,21708,0.32' && b.spawns.mist.points.length === 10);
}

/* ── v2.3.2981: the oases ──
   Owner, 2026-10-02: "The palm trees don't belong in the desert unless they
   surround water to emulate an oasis." */
console.log('the oases (v2.3.2981)');
{
  const { placeObjects } = await import('../../public/tools/world/core/placing.js');
  const { leanOf, standPiece, mirrorRGBA } = await import('../../public/tools/objects/atlas.js');
  const { objectCatalog } = await import('../../public/tools/objects/catalog.js');
  const { decodePNG } = await import('./png.mjs');
  const fs = await import('node:fs');
  const P = placeObjects(PLAN, bp);
  const cellG = bp.scale * PLAN.worldPxPerArtPx;
  const sky = bp.regionIds.indexOf('sky'), N = bp.w * bp.h;
  const clsAt = (x, y) => { const bx = Math.floor(x / cellG), by = Math.floor(y / cellG); return bx < 0 || by < 0 || bx >= bp.w || by >= bp.h ? -1 : bp.cls[by * bp.w + bx]; };
  /* the dunes' pools */
  const seen = new Uint8Array(N), pools = [];
  let crossed = 0;
  for (let i0 = 0; i0 < N; i0++) {
    if (seen[i0] || bp.cls[i0] !== C.water || bp.reg[i0] !== sky) continue;
    const st = [i0]; seen[i0] = 1;
    let n = 0, sx = 0, sy = 0, band = 0;
    while (st.length) {
      const c = st.pop(), cx = c % bp.w, cy = (c / bp.w) | 0;
      n++; sx += cx; sy += cy; band = Math.max(band, bp.band[c] + 1);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const q = (cy + dy) * bp.w + cx + dx, k = bp.cls[q];
        if (k === C.path || k === C.rail || k === C.lot || k === C.bridge || k === C.landmark) { crossed++; dy = dx = 3; }
      }
      for (const q of [c - 1, c + 1, c - bp.w, c + bp.w]) if (!seen[q] && bp.cls[q] === C.water) { seen[q] = 1; st.push(q); }
    }
    pools.push({ x: (sx / n + 0.5) * cellG, y: (sy / n + 0.5) * cellG, r: Math.sqrt(n / Math.PI) * cellG, band, palms: [] });
  }
  const perStage = [1, 2, 3, 4].map((b) => pools.filter((p) => p.band === b).length);
  ok(`the dunes have their pools: ${pools.length}, on the sage flats, the dunes and the red mesas (${perStage.slice(0, 3).join('/')}), none up on the storm heights`,
    pools.length >= 6 && perStage[0] >= 1 && perStage[1] >= 1 && perStage[2] >= 1 && perStage[3] === 0, perStage);
  const small = pools.filter((p) => p.r * 2 < 280);
  ok(`each big enough to show between palms 300 game px tall: ${Math.round(Math.min(...pools.map((p) => p.r * 2)))}-${Math.round(Math.max(...pools.map((p) => p.r * 2)))} game px across`,
    small.length === 0, small.map((p) => Math.round(p.r * 2)));
  ok('no road, railway, camp or landmark runs into one (they are laid after the pools: layout.js `clear`)', crossed === 0, crossed);
  /* the palms */
  const palm = P.kinds.indexOf('palm');
  const stray = [], openSide = [], leanOut = [];
  let palms = 0;
  for (let i = 0; i < P.n; i++) {
    if (P.kind[i] !== palm) continue;
    palms++;
    const x = P.x[i], y = P.y[i];
    let wetNear = false;
    for (let dy = -7; dy <= 7 && !wetNear; dy++) for (let dx = -7; dx <= 7; dx++) if (clsAt(x + dx * cellG, y + dy * cellG) === C.water) { wetNear = true; break; }
    let best = null, bd = Infinity;
    for (const p of pools) { const d = Math.hypot(x - p.x, y - p.y) - p.r; if (d < bd) { bd = d; best = p; } }
    if (!wetNear || !best || bd > 200) { stray.push([Math.round(x), Math.round(y)]); continue; }
    best.palms.push(i);
    const d = Math.hypot(x - best.x, y - best.y), ux = (x - best.x) / d, uy = (y - best.y) / d;
    if (uy > 0.8 + 1e-6) openSide.push([Math.round(x), Math.round(y)]);
    if (Math.abs(ux) >= 0.25 && !!P.flip[i] !== ux < 0) leanOut.push([Math.round(x), Math.round(y)]);
  }
  ok(`no palm out on the open sand: all ${palms} stand by a pool's water`, palms > 0 && stray.length === 0, stray.slice(0, 4));
  const bare = pools.filter((p) => p.palms.length < 4);
  ok(`every pool has its ring of palms (${Math.min(...pools.map((p) => p.palms.length))}-${Math.max(...pools.map((p) => p.palms.length))} a pool)`, bare.length === 0, bare.map((p) => p.palms.length));
  ok('...none on the side facing you, where a crown would hide the water', openSide.length === 0, openSide.slice(0, 4));
  ok('...each leaning in over the water: east of it drawn as it is (leaning left), west of it mirrored', leanOut.length === 0, leanOut.slice(0, 4));
  /* the hoodoos keep back from an oasis's shore */
  const hoodoo = P.kinds.indexOf('hoodoo'), crowd = [];
  for (let i = 0; i < P.n; i++) {
    if (P.kind[i] !== hoodoo) continue;
    for (let dy = -7; dy <= 7; dy++) for (let dx = -7 + Math.abs(dy); dx <= 7 - Math.abs(dy); dx++) {
      if (clsAt(P.x[i] + dx * cellG, P.y[i] + dy * cellG) === C.water) { crowd.push([Math.round(P.x[i]), Math.round(P.y[i])]); dy = 8; break; }
    }
  }
  ok('no hoodoo crowds an oasis: 8 cells (192 game px) from its water at the least', crowd.length === 0, crowd.slice(0, 4));

  /* standing a leaning picture on its trunk (objects/atlas.js) */
  const W = 40, H = 60, pic = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    const cx = y < 20 ? 28 : 8 + Math.round((y - 20) * 0.1);     /* a crown up and to the right, a trunk low on the left */
    for (let x = cx - 3; x <= cx + 3; x++) pic[(y * W + x) * 4 + 3] = 255;
  }
  const L0 = leanOf(pic, W, H), S1 = standPiece('left', pic, W, H), S2 = standPiece('right', pic, W, H), S3 = standPiece(undefined, pic, W, H);
  ok('a picture leaning right is found leaning right, its foot on its trunk, not its middle', L0.dir === 1 && Math.abs(L0.foot[0] - 12) <= 1 && L0.foot[1] === H, L0);
  ok('...stood for a catalog that wants it leaning left, it is mirrored, its foot mirrored with it', S1.mirrored && leanOf(S1.rgba, W, H).dir === -1 && S1.foot[0] === W - 1 - L0.foot[0], S1.foot);
  ok('...for one that wants it leaning right it is left as it is, and anything else keeps its foot in the middle of its bottom row',
    !S2.mirrored && S2.rgba === pic && S2.foot[0] === L0.foot[0] && !S3.mirrored && S3.foot[0] === W / 2, [S2.foot, S3.foot]);
  ok('mirroring twice gives the picture back', mirrorRGBA(mirrorRGBA(pic, W, H), W, H).every((v, k) => v === pic[k]));
  /* ...and the game's own palms: all leaning left, each standing on its trunk */
  const lean = Object.create(null);
  for (const e of objectCatalog()) if (e.lean) lean[e.id] = e.lean;
  const man = JSON.parse(fs.readFileSync(new URL('../../public/world/objects/manifest.json', import.meta.url)));
  const sheetOf = Object.create(null), bad = [];
  let checked = 0;
  for (const o of man.objects) {
    if (!lean[o.id]) continue;
    for (const pc of o.pieces) {
      const a = man.atlases.find((q) => q.name === pc.atlas);
      if (!sheetOf[a.name]) sheetOf[a.name] = { img: decodePNG(fs.readFileSync(new URL(`../../public/world/objects/${a.image}`, import.meta.url))), json: JSON.parse(fs.readFileSync(new URL(`../../public/world/objects/${a.sheet}`, import.meta.url))) };
      const { img, json } = sheetOf[a.name], f = json.frames[pc.frame].frame;
      const rgba = new Uint8ClampedArray(f.w * f.h * 4);
      for (let y = 0; y < f.h; y++) rgba.set(img.data.subarray(((f.y + y) * img.w + f.x) * 4, ((f.y + y) * img.w + f.x + f.w) * 4), y * f.w * 4);
      const got = leanOf(rgba, f.w, f.h);
      checked++;
      if (got.dir !== (lean[o.id] === 'left' ? -1 : 1) || got.foot[0] !== pc.foot[0] || Math.abs(pc.foot[0] - f.w / 2) < f.w * 0.15) bad.push({ frame: pc.frame, dir: got.dir, foot: pc.foot, found: got.foot, w: f.w });
    }
  }
  ok(`the game's palms all lean the catalog's way and stand on their trunks, far off their pictures' middles (${checked} pictures)`, checked >= 2 && bad.length === 0, bad);
}

/* ── v2.3.2982: the big-town preview ──
   Owner, 2026-10-02: "I actually think all the buildings need to be twice as
   large let me see preview".  `?trial=wheel&bigtown` -- the town laid for
   buildings twice the size, drawn so; without it nothing changes. */
console.log('the big-town preview (v2.3.2982)');
{
  const { bigTownPlan, bigTownScale, planFor, BIG_TOWN_MAX, BUILDINGS, TOWN } = await import('../../public/tools/world/plan.js');
  const { townPlan, townGates } = await import('../../public/tools/world/core/layout.js');
  const { placeObjects, objectFootprints, mayorSpot } = await import('../../public/tools/world/core/placing.js');
  const { objectCatalog } = await import('../../public/tools/objects/catalog.js');
  const fs = await import('node:fs');
  /* v2.3.2994, owner: "yes make 1.5x live and the standard size" -- without
     the switch, the plan itself IS the standard town; `bigtown=1` the old one.
     v2.3.2997, owner: "Change buildings from 1.5x to 1.15x" -- the standard
     is 1.15x, and `bigtown=1.5` shows the 1.5x town to compare */
  /* v2.3.3022, owner: "The town center's buildings feel too squished
     together" -- the standard town LAID at TOWN, 1.5, its pictures DRAWN at
     BUILDINGS, 1.15; `bigtown=1.15` the town before, laid and drawn 1.15 */
  ok('the switch: `bigtown` is twice the size, `bigtown=1.5` one and a half, at most BIG_TOWN_MAX, `bigtown=1` the town as it was, `bigtown=1.15` the town before v2.3.3022, and without it the standard -- the plan itself, laid 1.5x round 1.15x buildings',
    bigTownScale('?trial=wheel&bigtown') === 2 && bigTownScale('?trial=wheel&bigtown=1.5') === 1.5 && bigTownScale('?bigtown=9') === BIG_TOWN_MAX &&
    bigTownScale('?trial=wheel') === null && bigTownScale('?trial=wheel&bigtownish') === null && bigTownScale('?bigtown=1') === 1 &&
    planFor('?trial=wheel') === PLAN && planFor('') === PLAN && planFor('?bigtown=1') === bigTownPlan(1) &&
    BUILDINGS === 1.15 && TOWN === 1.5 && bigTownPlan(TOWN, BUILDINGS) === PLAN && PLAN.town.buildingScale === 1.15 && PLAN.bigTown === 1.5 &&
    planFor('?bigtown=1.15').town.buildingScale === 1.15 && planFor('?bigtown=1.15').bigTown === 1.15 &&
    bigTownPlan(1.5) !== PLAN && bigTownPlan(1.5).town.buildingScale === 1.5 &&
    bigTownPlan(1) !== PLAN && bigTownPlan(1).town.gateNS === undefined && bigTownPlan(1).town.lot.perSideRow === undefined && !bigTownPlan(1).town.buildingScale);
  const BP = bigTownPlan(2), bbp = buildBlueprint(BP), BO = placeObjects(BP, bbp), T2 = BP.town, tp2 = townPlan(T2);
  const WPA = BP.worldPxPerArtPx, cellG = bbp.scale * WPA;
  const gOf = (ax, ay) => [(ax - bbp.x0) * WPA, (ay - bbp.y0) * WPA];
  const clsAtG = (x, y) => bbp.cls[Math.floor(y / cellG) * bbp.w + Math.floor(x / cellG)];
  const cat = objectCatalog(), byId = Object.fromEntries(cat.map((e) => [e.id, e]));
  const lots2 = bbp.lots.filter((l) => l.town), bAt = Object.create(null);
  for (let i = 0; i < BO.n; i++) { const id = BO.kinds[BO.kind[i]]; if (byId[id] && byId[id].kind === 'building') bAt[id] = [BO.x[i], BO.y[i]]; }
  ok(`${BO.buildings} of its ${BO.buildingsOf} buildings stand, Market Row keeping one plot a side, each on its plot's door, drawn twice the size (everything else as made)`,
    BO.buildings === 13 && BO.buildingsOf === 17 && lots2.length === 13 &&
    lots2.every((l) => { const b = bAt[l.id], [fx, fy] = gOf(l.foot.x, l.foot.y); return b && Math.abs(b[0] - fx) < 1 && Math.abs(b[1] - fy) < 1; }) &&
    BO.kinds.every((id, k) => BO.kindScale[k] === (byId[id] && byId[id].kind === 'building' ? 2 : 1)), Object.keys(bAt));
  const shut = lots2.filter((l) => { const [fx, fy] = gOf(l.foot.x, l.foot.y + T2.lot.porch + 6); const c = clsAtG(fx, fy); return c !== C.street && c !== C.plaza; });
  ok('every door still opens onto a street, the square, the Back Lane or a front walk', shut.length === 0, shut.map((l) => l.id));
  /* as drawn: the game's pictures, twice the size */
  const man = JSON.parse(fs.readFileSync(new URL('../../public/world/objects/manifest.json', import.meta.url)));
  const picOf = Object.create(null);
  for (const o of man.objects) if (o.kind === 'building' && o.pieces.length) picOf[o.id] = o.pieces[0];
  const covered = [];
  for (const a of tp2.lots) for (const b of tp2.lots) {
    const p = picOf[a.id];
    if (a === b || !p) continue;
    const hw = (p.gameW * 2) / WPA / 2, h = (p.gameH * 2) / WPA;
    if (b.foot.x > a.foot.x - hw && b.foot.x < a.foot.x + hw && b.foot.y > a.foot.y - h && b.foot.y < a.foot.y) covered.push([a.id, b.id]);
  }
  const tooWide = tp2.lots.filter((l) => picOf[l.id] && (picOf[l.id].gameW * 2) / WPA > l.x1 - l.x0 + 1);
  ok('...no picture, twice the size, covers another\'s door, and every one fits its plot\'s width', covered.length === 0 && tooWide.length === 0, { covered, tooWide: tooWide.map((l) => l.id) });
  const F = objectFootprints(BO, man), bBox = [];
  for (let i = 0; i < BO.n; i++) {
    const id = BO.kinds[BO.kind[i]];
    if (!byId[id] || byId[id].kind !== 'building') continue;
    for (let q = F.boxOf[i]; q < F.boxOf[i + 1]; q++) bBox.push({ id, w: F.boxes[q * 4 + 2] - F.boxes[q * 4], y1: F.boxes[q * 4 + 3] });
  }
  ok('...and each stops you on ground twice as wide as today\'s building does',
    bBox.length === 13 && bBox.every((q) => Math.abs(q.w - 0.94 * picOf[q.id].gameW * 2) < 1), bBox.slice(0, 3));
  /* the arrival (192 art px south of the centre, the worker's) and Mayor Bro, clear */
  const g2 = gridInfo(BP), [arX, arY] = gOf(g2.cx, g2.cy + 0.25 * g2.P), ms = mayorSpot(BP, bbp);
  const hit = (x, y, m) => { for (let q = 0; q < F.boxes.length; q += 4) if (x > F.boxes[q] - m && x < F.boxes[q + 2] + m && y > F.boxes[q + 1] - m && y < F.boxes[q + 3] + m) return true; return false; };
  ok('where you arrive and where Mayor Bro stands are clear of every footprint, and he stands in the square', !hit(arX, arY, 40) && !!ms && !hit(ms.x, ms.y, 24) && clsAtG(ms.x, ms.y) === C.plaza, { ms });
  /* the town in the commons: off the river, inside the hub, the roads from its own gates */
  const townR = bbp.regionIds.indexOf('town'), hubR = BP.wheel.hub * (BP.square.px - BP.square.overlap);
  let beyond = 0, wet = 0;
  for (let i = 0; i < bbp.w * bbp.h; i++) {
    if (bbp.reg[i] !== townR) continue;
    const c = bbp.cls[i];
    if (c === C.river || c === C.rail || c === C.water) wet++;
    const x = ((i % bbp.w) + 0.5) * bbp.scale + bbp.x0 - g2.cx, y = (((i / bbp.w) | 0) + 0.5) * bbp.scale + bbp.y0 - g2.cy;
    if (Math.hypot(x, y) > hubR) beyond++;
  }
  const G2 = townGates(T2), step = BP.square.px - BP.square.overlap;
  const firsts = BP.roads.filter((r) => ['north', 'east', 'south', 'west'].includes(r.id)).map((r) => Math.hypot(r.pts[0][0], r.pts[0][1]) * step);
  ok(`the town stays in the commons -- no river, railway or pond in it, none of it past the commons' edge -- and the four Old Roads leave from its own gates (${G2.ns} and ${G2.ew} art px)`,
    beyond === 0 && wet === 0 && firsts.length === 4 && firsts.every((d) => Math.abs(d - G2.ns) < 30 || Math.abs(d - G2.ew) < 30) && G2.ns > PLAN.town.gate && G2.ew > PLAN.town.gate,
    { beyond, wet, firsts: firsts.map(Math.round) });
  ok('...the river keeps its three bridges, and the Rail Depot and the Old Mill stand out past the gates', (bbp.decks || []).filter((d) => d.kind === 'bridge').length === 3 &&
    ['depot', 'mill'].every((id) => { const l = bbp.lots.find((q) => q.id === id); return l && Math.abs((l.x0 + l.x1) / 2 - g2.cx) > G2.ew; }));

  /* v2.3.2985, owner: "Let me try 1.5 size for buildings. Does that fit?"
     -- yes: all 17, Market Row keeping two plots a side (TWO_A_SIDE_MAX).
     The first try ran the mine railway's first stretch through the town
     (it started where the depot used to be) and forked the Bog Trail past
     the river, back over it beside the Mill Bridge. */
  const { TWO_A_SIDE_MAX } = await import('../../public/tools/world/plan.js');
  const P15 = bigTownPlan(1.5), b15 = buildBlueprint(P15), O15 = placeObjects(P15, b15), T15 = P15.town, g15 = gridInfo(P15);
  const g15Of = (ax, ay) => [(ax - b15.x0) * WPA, (ay - b15.y0) * WPA];
  const cls15 = (x, y) => b15.cls[Math.floor(y / cellG) * b15.w + Math.floor(x / cellG)];
  const lots15 = b15.lots.filter((l) => l.town);
  const shut15 = lots15.filter((l) => { const [fx, fy] = g15Of(l.foot.x, l.foot.y + T15.lot.porch + 6); const c = cls15(fx, fy); return c !== C.street && c !== C.plaza; });
  const tp15 = townPlan(T15), cov15 = [];
  for (const a of tp15.lots) for (const b of tp15.lots) {
    const p = picOf[a.id];
    if (a === b || !p) continue;
    const hw = (p.gameW * 1.5) / WPA / 2, h = (p.gameH * 1.5) / WPA;
    if (b.foot.x > a.foot.x - hw && b.foot.x < a.foot.x + hw && b.foot.y > a.foot.y - h && b.foot.y < a.foot.y) cov15.push([a.id, b.id]);
  }
  ok(`at 1.5x all ${O15.buildings} of the ${O15.buildingsOf} buildings stand (Market Row two a side, up to ${TWO_A_SIDE_MAX}x), every door open, none covering another's`,
    TWO_A_SIDE_MAX === 1.5 && O15.buildings === 17 && O15.buildingsOf === 17 && lots15.length === 17 && shut15.length === 0 && cov15.length === 0
    && bigTownPlan(1.6).town.lot.perSideRow === 1, { buildings: O15.buildings, shut: shut15.map((l) => l.id), cov15 });
  const t15 = b15.regionIds.indexOf('town'), hub15 = P15.wheel.hub * (P15.square.px - P15.square.overlap);
  let beyond15 = 0, wet15 = 0;
  for (let i = 0; i < b15.w * b15.h; i++) {
    if (b15.reg[i] !== t15) continue;
    const c = b15.cls[i];
    if (c === C.river || c === C.rail || c === C.water) wet15++;
    const x = ((i % b15.w) + 0.5) * b15.scale + b15.x0 - g15.cx, y = (((i / b15.w) | 0) + 0.5) * b15.scale + b15.y0 - g15.cy;
    if (Math.hypot(x, y) > hub15) beyond15++;
  }
  const G15 = townGates(T15), step15 = P15.square.px - P15.square.overlap;
  const rail0 = P15.rails.find((r) => r.id === 'mine-line').pts[0], dep15 = b15.lots.find((q) => q.id === 'depot');
  ok('...the town in the commons, no river, railway or pond in it; the railway leaving from the moved depot; the river with its three bridges',
    beyond15 === 0 && wet15 === 0 && rail0[0] * step15 > G15.ew && !!dep15 && (dep15.x0 + dep15.x1) / 2 - g15.cx > G15.ew
    && (b15.decks || []).filter((d) => d.kind === 'bridge').length === 3, { beyond15, wet15, rail0, gate: G15.ew, bridges: (b15.decks || []).filter((d) => d.kind === 'bridge').map((d) => d.road) });
}

/* ── v2.3.3022: the town laid roomier ──
   Owner, 2026-10-04: "The town center's buildings feel too squished
   together. I think brotown itself might need to be bigger to accommodate."
   The standard town is laid as the 1.5x town (plan.js TOWN) and its
   buildings drawn 1.15x (BUILDINGS), as before: room between them. */
console.log('the town laid roomier (v2.3.3022)');
{
  const { bigTownPlan, TOWN, BUILDINGS, MILL_FAR_X } = await import('../../public/tools/world/plan.js');
  const { townGates } = await import('../../public/tools/world/core/layout.js');
  const { placeObjects, objectFootprints } = await import('../../public/tools/world/core/placing.js');
  const fs = await import('node:fs');
  const man = JSON.parse(fs.readFileSync(new URL('../../public/world/objects/manifest.json', import.meta.url), 'utf8'));
  const pieceOf = Object.fromEntries(man.objects.map((o) => [o.id, o.pieces]));
  const isBuilding = new Set(man.objects.filter((o) => o.kind === 'building').map((o) => o.id));
  /* each building's PICTURE, a rectangle in game px (its foot at x, y) */
  const pictures = (O) => {
    const out = [];
    for (let i = 0; i < O.n; i++) {
      const id = O.kinds[O.kind[i]], ks = O.kindScale[O.kind[i]];
      const pcs = pieceOf[id];
      if (!pcs || !isBuilding.has(id)) continue;
      const pc = pcs[O.piece[i]] || pcs[0];
      const x0 = O.x[i] - (pc.foot[0] / 2) * ks, y0 = O.y[i] - (pc.foot[1] / 2) * ks;
      out.push({ id, x0, y0, x1: x0 + pc.gameW * ks, y1: y0 + pc.gameH * ks });
    }
    return out;
  };
  const gap = (a, b) => Math.max(a.x0 - b.x1, b.x0 - a.x1, a.y0 - b.y1, b.y0 - a.y1);
  const tightest = (pics) => {
    let best = { d: Infinity };
    for (let i = 0; i < pics.length; i++) for (let j = i + 1; j < pics.length; j++) {
      const d = gap(pics[i], pics[j]);
      if (d < best.d) best = { d, a: pics[i].id, b: pics[j].id };
    }
    return best;
  };
  const bp15 = buildBlueprint(PLAN), O = placeObjects(PLAN, bp15);
  const before = bigTownPlan(BUILDINGS), bpB = buildBlueprint(before), OB = placeObjects(before, bpB);
  const now = pictures(O), was = pictures(OB);
  const tN = tightest(now), tB = tightest(was);
  const pair = (pics, a, b) => gap(pics.find((p) => p.id === a), pics.find((p) => p.id === b));
  const hallHotel = [pair(was, 'townhall', 'hotel'), pair(now, 'townhall', 'hotel')];
  ok(`the standard town is laid ${TOWN}x round ${BUILDINGS}x buildings, all ${O.buildings} of ${O.buildingsOf} standing, the gates at ${townGates(PLAN.town).ns} and ${townGates(PLAN.town).ew} art px`,
    PLAN.bigTown === 1.5 && PLAN.town.buildingScale === 1.15 && O.buildings === 17 && O.buildingsOf === 17 && now.length === 17
    && townGates(PLAN.town).ns === 1326 && townGates(PLAN.town).ew === 1447, { gates: townGates(PLAN.town) });
  ok(`room between the buildings: the closest two pictures ${Math.round(tN.d)} game px apart (${tN.a} and ${tN.b}; laid 1.15x it was ${Math.round(tB.d)}, ${tB.a} and ${tB.b}), the Town Hall and the Hotel ${Math.round(hallHotel[0])} -> ${Math.round(hallHotel[1])}`,
    tN.d >= 60 && tB.d < 20 && hallHotel[1] >= 90, { tN, tB, hallHotel });
  /* the gates and signposts at each street's own gate (they stood at the
     plan's old 1,050: at 1.15 the east signpost in the Assay Office), none
     inside a building's footprint */
  const fp = objectFootprints(O, man), boxes = [];
  for (let i = 0; i < O.n; i++) {
    const id = O.kinds[O.kind[i]];
    if (!isBuilding.has(id)) continue;
    for (let b = fp.boxOf[i]; b < fp.boxOf[i + 1]; b++) boxes.push([fp.boxes[4 * b], fp.boxes[4 * b + 1], fp.boxes[4 * b + 2], fp.boxes[4 * b + 3]]);
  }
  const signs = [], arches = [];
  for (let i = 0; i < O.n; i++) {
    const id = O.kinds[O.kind[i]];
    if (id === 'signpost') signs.push([O.x[i], O.y[i]]);
    if (id === 'gate') arches.push([O.x[i], O.y[i]]);
  }
  const inside = signs.filter(([x, y]) => boxes.some((b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]));
  const WPAt = PLAN.worldPxPerArtPx, cx = 21504, gNS = townGates(PLAN.town).ns * WPAt;
  ok(`the town's arches and signposts at its own gates: ${arches.length} arches ${arches.map(([x, y]) => Math.round(Math.abs(y - cx))).join(' / ')} game px out (the gate ${gNS}), ${signs.length} signposts, none inside a building`,
    arches.length === 2 && arches.every(([, y]) => Math.abs(Math.abs(y - cx) - gNS) < 60) && signs.length === 4 && inside.length === 0, { arches, inside });
  /* the Old Mill: on the river's near bank when the town leaves room, else
     whole on the far bank -- never in the river */
  const mill = bp15.lots.find((l) => l.id === 'mill');
  const cnt = { lot: 0, river: 0, all: 0 };
  for (let y = mill.y0; y < mill.y1; y += bp15.scale) for (let x = mill.x0; x < mill.x1; x += bp15.scale) {
    const c = Math.floor((y - bp15.y0) / bp15.scale) * bp15.w + Math.floor((x - bp15.x0) / bp15.scale);
    cnt.all++; if (bp15.cls[c] === C.lot) cnt.lot++; if (bp15.cls[c] === C.river) cnt.river++;
  }
  ok(`the Old Mill stands whole on the far bank by the Mill Bridge (${cnt.lot} of its ${cnt.all} cells its plot, ${cnt.river} in the river)`,
    PLAN.places.find((p) => p.id === 'mill').at[0] === MILL_FAR_X && cnt.river === 0 && cnt.lot >= cnt.all * 0.6, cnt);
}

/* ── v2.3.3031: the designed town ──
   Owner, 2026-10-04, passing on a reviewer's look at the 1.5x town zoomed
   out: "the center reads as one huge tan clearing with buildings placed on
   it, rather than a designed town with streets, districts, and landmarks".
   The standard town's ground by blocks (grass between them, a worn verge on
   every street), its bigger square and Town Hall, its districts and
   staggered plots, its pond, its gardens, yards and edge, and the clean halo
   round it -- and that the town is still open to walk: every door, every
   gate. */
console.log('the designed town (v2.3.3031)');
{
  const { bigTownPlan, TOWN, BUILDINGS } = await import('../../public/tools/world/plan.js');
  const { townPlan, townGates, townSurfaces, TOWN_SURF } = await import('../../public/tools/world/core/layout.js');
  const { placeObjects, objectFootprints, mayorSpot, TOWN_GARDEN } = await import('../../public/tools/world/core/placing.js');
  const { objectCatalog } = await import('../../public/tools/objects/catalog.js');
  const { WHEEL_NODES } = await import('../../server/src/wheelspawns.js');
  const fs = await import('node:fs');
  const T = PLAN.town, tp = townPlan(T), G = townGates(T), WPA = PLAN.worldPxPerArtPx, g0 = gridInfo(PLAN), S = bp.scale;
  const townR = bp.regionIds.indexOf('town'), commonsR = bp.regionIds.indexOf('commons');
  const cat = objectCatalog(), byId = Object.fromEntries(cat.map((e) => [e.id, e]));
  const O = placeObjects(PLAN, bp), idOf = (i) => O.kinds[O.kind[i]];
  const cellOfG = (x, y) => Math.floor(y / WPA / S) * bp.w + Math.floor(x / WPA / S);
  const gOf = (ax, ay) => [(g0.cx + ax - bp.x0) * WPA, (g0.cy + ay - bp.y0) * WPA];
  const matId = (m) => (c) => m.ids[m.mat[c]];

  /* the design is the standard plan's own; the previews keep the town they show */
  const { planFor, PLAIN } = await import('../../public/tools/world/plan.js');
  const previews = [bigTownPlan(1.5), bigTownPlan(1.15), bigTownPlan(2)];
  ok('the designed town is the standard plan\'s own -- its lawn, bigger square and Town Hall, districts and plots off their rows -- and not the previews\' (`?bigtown=k`), which keep the town they show',
    !!T.lawn && T.hallScale === 1.18 && T.lots.north.west[0].id === 'guildhall' && T.lots.north.west[0].dx !== undefined &&
    previews.every((P) => !P.town.lawn && P.town.hallScale === 1 && P.town.lots.north.west[0].id === 'blacksmith' && P.town.lots.north.west[0].dx === undefined) &&
    townSurfaces(previews[0], buildBlueprint(previews[0])) === null);
  /* ...and `?plaintown` is the standard size without it, to look at the two side by side */
  ok('`?plaintown` is the standard size without the designed town (the one tan clearing, a plain square, plots in their rows: the gates at 1226 and 1455 as before v2.3.3031); nothing else in the address changes the plan',
    planFor('?trial=wheel&plaintown') === PLAIN && planFor('?plaintown') === PLAIN && planFor('') === PLAN && planFor('?trial=wheel') === PLAN && planFor('?plaintownish') === PLAN &&
    PLAIN !== PLAN && !PLAIN.town.lawn && PLAIN.town.square === 300 && PLAIN.town.hallScale === 1 && PLAIN.town.gateNS === 1226 && PLAIN.town.gateEW === 1455 && PLAIN.bigTown === 1.5 && PLAIN.town.buildingScale === 1.15 &&
    bigTownPlan(TOWN, BUILDINGS) === PLAN);
  ok(`the square is ${Math.round((T.square / previews[0].town.square - 1) * 100)}% bigger than the plots' scale gives it (${previews[0].town.square} -> ${T.square} art px a half) and the Town Hall is drawn ${Math.round((T.hallScale - 1) * 100)}% bigger than the other buildings`,
    T.square === 384 && previews[0].town.square === 300 && Math.abs(T.square / previews[0].town.square - 1.28) < 0.01 &&
    O.kinds.every((id, k) => Math.abs(O.kindScale[k] - (byId[id] && byId[id].kind === 'building' ? BUILDINGS * (id === 'townhall' ? T.hallScale : 1) : 1)) < 1e-6));

  /* the ground by blocks */
  const mmNow = materialMap(PLAN, bp), mmOld = materialMap({ ...PLAN, town: { ...T, lawn: null } }, bp), idNow = matId(mmNow), idOld = matId(mmOld);
  const count = (id) => { const n = { grass: 0, paving: 0, brown: 0, all: 0 }; for (let i = 0; i < bp.w * bp.h; i++) { if (bp.reg[i] !== townR || bp.cls[i] === C.river || bp.cls[i] === C.water || bp.cls[i] === C.ocean) continue; const m = id(i); n.all++; if (m === 'commons') n.grass++; else if (m === 'plaza') n.paving++; else n.brown++; } return n; };
  const nowN = count(idNow), oldN = count(idOld), reclaimed = (oldN.brown - nowN.brown) / oldN.brown;
  ok(`the brown is broken into blocks: ${Math.round(reclaimed * 100)}% of the town's earth is grass again (${Math.round(100 * nowN.grass / nowN.all)}% of the town is lawn, ${Math.round(100 * nowN.paving / nowN.all)}% paving; before, no lawn at all), the reviewer's 25-35%`,
    reclaimed >= 0.25 && reclaimed <= 0.4 && oldN.grass === 0 && nowN.paving > oldN.paving, { reclaimed, nowN, oldN });
  let grassOnStreet = 0, streets = 0;
  for (let i = 0; i < bp.w * bp.h; i++) {
    if (bp.reg[i] !== townR || bp.cls[i] !== C.street) continue;
    streets++;
    for (const d of [-1, 1, -bp.w, bp.w]) if (idNow(i + d) === 'commons') { grassOnStreet++; break; }
  }
  ok(`every street, walk and lane keeps its worn verge of earth: grass touches none of its ${streets} cells (a street is laid on its cells, so grass at its edge would be a ruler line)`, streets > 1000 && grassOnStreet === 0, grassOnStreet);
  const wNow = walkBits(bp, mmNow), wOld = walkBits(bp, mmOld), b2 = buildBlueprint({ ...PLAN, town: { ...T, lawn: null } });
  let sameWalk = wNow.length === wOld.length;
  for (let i = 0; sameWalk && i < wNow.length; i++) if (wNow[i] !== wOld[i]) sameWalk = false;
  const hallLot = bp.lots.find((l) => l.id === 'townhall');
  let hallCells = 0, hallPaved = 0;
  for (let y = hallLot.y0; y < hallLot.y1; y += S) for (let x = hallLot.x0; x < hallLot.x1; x += S) { const c = Math.floor((y - bp.y0) / S) * bp.w + Math.floor((x - bp.x0) / S); hallCells++; if (idNow(c) === 'plaza') hallPaved++; }
  ok(`the square is paved under the Town Hall (${hallPaved} of its ${hallCells} cells), and the classes, regions and walk grid are what they were: only the picture changed`,
    hallPaved === hallCells && sameWalk && b2.hash === bp.hash);

  /* the districts, and plots off their rows */
  const ids = (arm) => tp.lots.filter((l) => l.arm === arm).map((l) => l.id).sort().join();
  ok('each arm is a district: the civic front and trades in the north, the mine side east (Bank, Assay, Gem Cutter, Auction), the strip south (Saloon, Hotel, Gambling Den, the Sheriff at its end), the farm road west',
    ids('north') === 'blacksmith,guildhall,post,woodworker' && ids('east') === 'assay,auction,bank,gemcutter' && ids('south') === 'gambling,hotel,saloon,sheriff' && ids('west') === 'cookhouse,feedseed,landoffice,store' &&
    tp.lots.length === 17);
  /* the same lots with their offsets taken off: where each stands in its row */
  const rowLots = Object.fromEntries(Object.entries(T.lots).map(([arm, sides]) => [arm, Object.fromEntries(Object.entries(sides).map(([side, list]) => [side, list.map(({ dx, dy, ...r }) => r)]))]));
  const plain = townPlan({ ...T, lots: rowLots });
  const moved = tp.lots.filter((l) => { const p = plain.lots.find((q) => q.id === l.id); return Math.abs(l.x0 - p.x0) >= 8 || Math.abs(l.y0 - p.y0) >= 8; });
  const overlap = [];
  for (const a of tp.lots) for (const b of tp.lots) if (a.id < b.id && a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) overlap.push([a.id, b.id]);
  const rowDy = new Set(tp.lots.filter((l) => l.arm === 'east' && l.side === 'north').map((l) => Math.round(l.y1)));
  ok(`no row is a ruler line: ${moved.length} of the 16 plots stand off their row, none on another, Market Row's north side at ${rowDy.size} different depths, and the gates are where the farthest plot puts them (${G.ns}, ${G.ew})`,
    moved.length >= 14 && overlap.length === 0 && rowDy.size >= 2 && G.ew <= 1455, { moved: moved.length, overlap });
  const shut = tp.lots.filter((l) => { const [fx, fy] = gOf(l.foot.x, l.foot.y + T.lot.porch + 6), c = bp.cls[cellOfG(fx, fy)]; return c !== C.street && c !== C.plaza; });
  ok('...every door still opens onto the square, a street, the Back Lane or a walk -- a plot set back from Market Row has its own', shut.length === 0 && tp.fronts.some((f) => f.door), shut.map((l) => l.id));
  let riverInTown = 0;
  for (let i = 0; i < bp.w * bp.h; i++) if (bp.reg[i] === townR && (bp.cls[i] === C.river || bp.cls[i] === C.water || bp.cls[i] === C.rail)) riverInTown++;
  ok('the town is still off the river, the pond and the railway', riverInTown === 0, riverInTown);

  /* one pond, not four puddles */
  const seen = new Uint8Array(bp.w * bp.h), ponds = [];
  for (let i0 = 0; i0 < bp.w * bp.h; i0++) {
    if (seen[i0] || bp.cls[i0] !== C.water || bp.reg[i0] !== commonsR) continue;
    const st = [i0]; seen[i0] = 1; let n = 0, sx = 0, sy = 0;
    while (st.length) {
      const c = st.pop(), cx = c % bp.w; n++; sx += cx; sy += (c / bp.w) | 0;
      for (const [d, ok2] of [[-1, cx > 0], [1, cx < bp.w - 1], [-bp.w, true], [bp.w, true]]) { const q = c + d; if (ok2 && q >= 0 && q < bp.w * bp.h && !seen[q] && bp.cls[q] === C.water) { seen[q] = 1; st.push(q); } }
    }
    ponds.push({ n, x: (sx / n + 0.5) * S * WPA, y: (sy / n + 0.5) * S * WPA });
  }
  const bro = ponds.find((p) => p.n > 400);
  let broRoad = Infinity;
  if (bro) for (let i = 0; i < bp.w * bp.h; i++) { if (bp.cls[i] !== C.path && bp.cls[i] !== C.street && bp.cls[i] !== C.bridge) continue; const d = Math.hypot(((i % bp.w) + 0.5) * S * WPA - bro.x, (((i / bp.w) | 0) + 0.5) * S * WPA - bro.y); if (d < broRoad) broRoad = d; }
  ok(`the commons has one pond, Bro Pond (${bro ? bro.n : 0} cells, ${bro ? Math.round(Math.sqrt(bro.n / Math.PI) * S * WPA * 2) : 0} game px across), and no stray puddles (${ponds.length} body of water in the commons besides the river), well clear of every road (${Math.round(broRoad)} game px from its middle)`,
    ponds.length === 1 && !!bro && bro.n >= 400 && bro.n <= 700 && broRoad > 450 && bp.pois.some((p) => p.kind === 'pond' && p.id === 'bro-pond'), { ponds, broRoad });
  const fishAtPond = WHEEL_NODES.commons.filter((n) => n[0] === 'f' && bro && Math.hypot(n[1] - bro.x, n[2] - bro.y) < 420).length;
  ok(`...and people fish in it: ${fishAtPond} of the commons' baked fishing spots are on its shore`, fishAtPond >= 2, fishAtPond);

  /* the gardens, yards and edge */
  const garden = [], fences = [], wagon = { hitch: [], trough: [] };
  for (let i = 0; i < O.n; i++) {
    const id = idOf(i), c = cellOfG(O.x[i], O.y[i]);
    if (bp.reg[c] !== townR) continue;
    if (TOWN_GARDEN.includes(id) || id === 'fence' || id === 'fence-down') garden.push([id, c, O.x[i], O.y[i]]);
    if (id === 'fence' || id === 'fence-down') fences.push([O.x[i], O.y[i]]);
    if (id === 'hitch' || id === 'trough') wagon[id].push([O.x[i], O.y[i]]);
  }
  const offLawn = garden.filter(([id, c, x, y]) => idNow(c) !== 'commons' || bp.cls[c] !== C.ground);
  const trees = garden.filter(([id]) => id === 'oak' || id === 'orchard');
  const treeBad = trees.filter(([id, c, x, y]) => [[-24, 0], [24, 0], [0, -24], [0, 24]].some(([u, v]) => idNow(cellOfG(x + u, y + v)) !== 'commons'));
  ok(`the gardens stand on the lawns: ${garden.length} trees, bushes, flowers, stones, fences and haystacks in the town, every one on grass, and each of the ${trees.length} trees a cell inside it (never at a street's edge)`,
    garden.length > 40 && trees.length >= 10 && offLawn.length === 0 && treeBad.length === 0, { off: offLawn.slice(0, 4).map((q) => [q[0], idNow(q[1])]), treeBad: treeBad.length });
  const gatePts = [[0, -G.ns], [0, G.ns], [G.ew, 0], [-G.ew, 0]].map(([ax, ay]) => gOf(ax, ay));
  const yardsAt = gatePts.map(([gx2, gy2]) => ['hitch', 'trough'].map((k) => wagon[k].filter(([x, y]) => Math.hypot(x - gx2, y - gy2) < 520).length));
  ok(`a wagon yard inside every gate: hitching rails and a trough at all four (${yardsAt.map((a) => a.join('+')).join(', ')})`, yardsAt.every(([h, tr]) => h >= 1 && tr >= 1), yardsAt);
  const grove = []; for (let i = 0; i < O.n; i++) if (idOf(i) === 'oak') { const [ax, ay] = [O.x[i] / WPA + bp.x0 - g0.cx, O.y[i] / WPA + bp.y0 - g0.cy]; if (ax > 500 && ax < 960 && ay > 190 && ay < 350) grove.push(ax); }
  const cartAt = []; for (let i = 0; i < O.n; i++) if (idOf(i) === 'minecart') { const ax = O.x[i] / WPA + bp.x0 - g0.cx; cartAt.push(ax); }
  const hay = []; for (let i = 0; i < O.n; i++) if (idOf(i) === 'haystack' && bp.reg[cellOfG(O.x[i], O.y[i])] === townR && O.x[i] / WPA + bp.x0 - g0.cx < -900) hay.push(i);
  ok(`three things you know the town by from afar: the old grove (${grove.length} oaks on the east back lawn), the mine side's ore yard (a mine cart at the end of the east lawn) and the farm side's hay (${hay.length} haystacks at the west end)`,
    grove.length >= 3 && cartAt.length >= 1 && cartAt.some((ax) => ax > tp.rowEnd - 400) && hay.length >= 2, { grove: grove.length, cartAt, hay: hay.length });
  const fenceNear = fences.filter(([x, y]) => [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([u, v]) => bp.reg[cellOfG(x + u * 96, y + v * 96)] !== townR));
  ok(`the town's edge is made of runs: ${fences.length} fence sections (${fenceNear.length} of them on the edge, the rest the old roads' own) and hedges and stones between, gaps where the roads leave`,
    fenceNear.length >= 10 && garden.filter(([id]) => id === 'bush').length >= 6, { fences: fences.length, fenceNear: fenceNear.length });

  /* the clean halo: the commons' things thin just outside the town and as they were beyond it */
  const haloPlan = { ...PLAN, town: { ...T, lawn: null } }, O0 = placeObjects(haloPlan, bp);
  const dT = new Float32Array(bp.w * bp.h).fill(1e9), q = [];
  for (let i = 0; i < bp.w * bp.h; i++) if (bp.reg[i] === townR) { dT[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % bp.w, y = (i / bp.w) | 0, nd = dT[i] + 1; if (nd > 40) continue; for (const [d, okk] of [[-1, x > 0], [1, x < bp.w - 1], [-bp.w, y > 0], [bp.w, y < bp.h - 1]]) { const j = i + d; if (okk && dT[j] > nd) { dT[j] = nd; q.push(j); } } }
  const commonsIn = (P, lo, hi) => { let n = 0; for (let i = 0; i < P.n; i++) { const id = P.kinds[P.kind[i]], e = byId[id]; if (!e || e.group !== 'commons' || e.kind !== 'nature') continue; const c = cellOfG(P.x[i], P.y[i]); if (bp.reg[c] === commonsR && dT[c] > lo && dT[c] <= hi) n++; } return n; };
  const near = [commonsIn(O0, 0, 8), commonsIn(O, 0, 8)], mid = [commonsIn(O0, 8, 14), commonsIn(O, 8, 14)], far = [commonsIn(O0, 16, 40), commonsIn(O, 16, 40)];
  const band = (near[1] + mid[1]) / (near[0] + mid[0]);
  ok(`a clean halo round the town: the commons' trees, bushes and stones within 14 cells (336 game px) of its edge are ${Math.round(100 * (1 - band))}% fewer (the reviewer's 20-30%) -- the nearest 8 cells ${near[0]} -> ${near[1]}, 8-14 cells ${mid[0]} -> ${mid[1]} -- and beyond it as they were (${far[0]} -> ${far[1]})`,
    band >= 0.68 && band <= 0.82 && near[1] / near[0] <= 0.7 && mid[1] <= mid[0] && far[1] >= 0.97 * far[0] && far[1] <= 1.03 * far[0], { near, mid, far, band });

  /* still open to walk: the arrival, every door, every gate and Mayor Bro are all reachable, on the walk grid with every footprint */
  const man = JSON.parse(fs.readFileSync(new URL('../../public/world/objects/manifest.json', import.meta.url), 'utf8'));
  const F = objectFootprints(O, man), walk = walkBits(bp, mmNow);
  const R = 12, ext = Math.max(G.ns, G.ew) + 140;
  const X0 = (g0.cx - ext - bp.x0) * WPA, Y0 = (g0.cy - ext - bp.y0) * WPA, RW = Math.ceil((2 * ext * WPA) / R);
  const blocked = new Uint8Array(RW * RW);
  for (let j = 0; j < RW; j++) for (let i = 0; i < RW; i++) {
    const c = cellOfG(X0 + (i + 0.5) * R, Y0 + (j + 0.5) * R);
    if (walk[c >> 3] & (1 << (c & 7))) blocked[j * RW + i] = 1;
  }
  const toR = (x, y) => [Math.floor((x - X0) / R), Math.floor((y - Y0) / R)];
  for (let b = 0; b < F.boxes.length; b += 4) {
    const [a0, b0] = toR(F.boxes[b] - 10, F.boxes[b + 1] - 10), [a1, b1] = toR(F.boxes[b + 2] + 10, F.boxes[b + 3] + 10);
    for (let j = Math.max(0, b0); j <= Math.min(RW - 1, b1); j++) for (let i = Math.max(0, a0); i <= Math.min(RW - 1, a1); i++) blocked[j * RW + i] = 1;
  }
  const [sI, sJ] = toR(...gOf(0, 192)), reach = new Uint8Array(RW * RW), qq = [sJ * RW + sI];
  reach[qq[0]] = 1;
  for (let h = 0; h < qq.length; h++) { const k = qq[h], i = k % RW, j = (k / RW) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= RW || jj >= RW) continue; const n = jj * RW + ii; if (!reach[n] && !blocked[n]) { reach[n] = 1; qq.push(n); } } }
  const can = (x, y) => { const [i, j] = toR(x, y); return i >= 0 && j >= 0 && i < RW && j < RW && !!reach[j * RW + i]; };
  const cut = [];
  for (const l of tp.lots) if (!can(...gOf(l.foot.x, l.foot.y + 26))) cut.push(l.id);
  for (const [n, ax, ay] of [['north', 0, -(G.ns - 30)], ['south', 0, G.ns - 30], ['east', G.ew - 30, 0], ['west', -(G.ew - 30), 0]]) if (!can(...gOf(ax, ay))) cut.push(n + ' gate');
  const ms = mayorSpot(PLAN, bp);
  if (!can(ms.x, ms.y)) cut.push('Mayor Bro');
  let openN = 0, cutN = 0;
  for (let j = 0; j < RW; j++) for (let i = 0; i < RW; i++) { if (bp.reg[cellOfG(X0 + (i + 0.5) * R, Y0 + (j + 0.5) * R)] !== townR || blocked[j * RW + i]) continue; openN++; if (!reach[j * RW + i]) cutN++; }
  ok(`and the town is open to walk: from where you arrive every door, all four gates and Mayor Bro are reachable round every fence and tree, none of the town's open ground cut off (${cutN} of ${openN})`,
    cut.length === 0 && cutN === 0 && openN > 40000, { cut, cutN, openN });
}

/* ── v2.3.2983: the buildings' life ──
   Owner, 2026-10-02: "Also add effects just using code to each building to
   make subtle liveliness effects".  Where each building's smoke, lamps,
   sparks and glints are (src/data/buildingLife.js), against the game's own
   pictures: a building drawn again moves them, and this says which. */
console.log("the buildings' life (v2.3.2983)");
{
  const { BUILDING_LIFE } = await import('../../src/data/buildingLife.js');
  const { objectCatalog } = await import('../../public/tools/objects/catalog.js');
  const { decodePNG } = await import('./png.mjs');
  const fs = await import('node:fs');
  const buildings = objectCatalog().filter((e) => e.kind === 'building').map((e) => e.id);
  const FX = new Set(['smoke', 'glow', 'sparks', 'glint', 'chaff']);
  const ids = Object.keys(BUILDING_LIFE);
  ok(`every one of the ${buildings.length} buildings has some life, and nothing else does; each spot a known kind, on its picture (0-1)`,
    buildings.every((b) => BUILDING_LIFE[b] && BUILDING_LIFE[b].length) && ids.every((b) => buildings.includes(b)) &&
    ids.every((b) => BUILDING_LIFE[b].every((e) => FX.has(e.fx) && e.u >= 0 && e.u <= 1 && e.v >= 0 && e.v <= 1)),
    ids.filter((b) => !buildings.includes(b)));
  const man = JSON.parse(fs.readFileSync(new URL('../../public/world/objects/manifest.json', import.meta.url)));
  const pages = Object.create(null), off = [];
  let checked = 0;
  for (const id of ids) {
    const o = man.objects.find((q) => q.id === id);
    if (!o) continue;
    const pc = o.pieces[0], a = man.atlases.find((q) => q.name === pc.atlas);
    if (!pages[a.name]) pages[a.name] = { img: decodePNG(fs.readFileSync(new URL(`../../public/world/objects/${a.image}`, import.meta.url))), js: JSON.parse(fs.readFileSync(new URL(`../../public/world/objects/${a.sheet}`, import.meta.url))) };
    const { img, js } = pages[a.name], f = js.frames[pc.frame].frame;
    const solid = (x, y) => x >= 0 && y >= 0 && x < f.w && y < f.h && img.data[((f.y + y) * img.w + f.x + x) * 4 + 3] > 128;
    for (const e of BUILDING_LIFE[id]) {
      const x = Math.round(e.u * f.w), y = Math.round(e.v * f.h), r = Math.round(0.02 * f.w);
      let hit = false;
      if (e.fx === 'smoke') {
        /* a chimney's top: solid just below it (a stovepipe stands in front
           of its roof, so what is above it may be roof) */
        for (let dy = 0; dy <= r && !hit; dy++) for (let dx = -r; dx <= r && !hit; dx++) hit = solid(x + dx, y + dy);
      } else {
        for (let dy = -r; dy <= r && !hit; dy++) for (let dx = -r; dx <= r && !hit; dx++) hit = solid(x + dx, y + dy);
      }
      checked++;
      if (!hit) off.push(`${id} ${e.fx} ${e.u},${e.v}`);
    }
  }
  ok(`...and every one of the ${checked} spots is on its picture as the game has it: each smoke on a chimney's top, each lamp, spark and glint on the building`, checked > 60 && off.length === 0, off);
}

/* ── v2.3.2995: what every object is made of ──
   Owner, 2026-10-03: "change the sound if projectiles hit props to be more
   appropriate for the type of material it is ... destructive props would be
   cool".  src/data/wheelMaterials.js names each catalog object's material
   and how many hits it takes; an object added to the catalog without one
   would ring and break as stone (its fallback), so this fails until it has
   its own. */
console.log('what the objects are made of (v2.3.2995)');
{
  const { WHEEL_MATERIALS, MATERIALS, wheelMaterialOf } = await import('../../src/data/wheelMaterials.js');
  const { objectCatalog } = await import('../../public/tools/objects/catalog.js');
  const cat = objectCatalog();
  const missing = cat.filter((e) => !Object.prototype.hasOwnProperty.call(WHEEL_MATERIALS, e.id)).map((e) => e.id);
  const extra = Object.keys(WHEEL_MATERIALS).filter((id) => !cat.some((e) => e.id === id));
  ok(`every one of the ${cat.length} catalog objects has a material, and nothing else does`, !missing.length && !extra.length, { missing, extra });
  const bad = Object.entries(WHEEL_MATERIALS).filter(([, m]) => !MATERIALS[m.mat] || !(m.hp >= 1) || (m.canopy && !['leaf', 'snow', 'char', 'slime'].includes(m.canopy))).map(([id]) => id);
  ok('...each a known material, at least one hit deep, any crown a known kind', !bad.length, bad);
  const bld = cat.filter((e) => e.kind === 'building');
  ok(`...the ${bld.length} buildings each 20+ hits and heavy; the trees each a crown`,
    bld.every((e) => wheelMaterialOf(e.id).hp >= 20 && wheelMaterialOf(e.id).big)
    && ['oak', 'orchard', 'pine', 'birch', 'deadtree', 'palm', 'slimetree', 'mangrove', 'jungletree', 'wildfruit'].every((id) => wheelMaterialOf(id).canopy),
    bld.filter((e) => !(wheelMaterialOf(e.id).hp >= 20)).map((e) => e.id));
  const fx = new Set(Object.values(MATERIALS).map((m) => m.fx)), snd = new Set(Object.values(MATERIALS).map((m) => m.sound));
  /* the recipes and the sounds they name exist (hitMaterialFx's switch, BT_AUDIO.PROP_SOUNDS) */
  const fs = await import('node:fs');
  const hfx = fs.readFileSync(new URL('../../src/rendering/hitMaterialFx.js', import.meta.url), 'utf8');
  const gd = fs.readFileSync(new URL('../../src/data/gameDisplay.js', import.meta.url), 'utf8');
  const noFx = [...fx].filter((f) => !hfx.includes(`case '${f}':`));
  const soundsAt = gd.indexOf('BT_AUDIO.PROP_SOUNDS = {');
  const soundsBlock = soundsAt >= 0 ? gd.slice(soundsAt, gd.indexOf('\n};', soundsAt)) : '';
  const noSnd = [...snd].filter((m) => !new RegExp(`\\n  ${m}: \\{`).test(soundsBlock));
  ok('...every material has its pieces (hitMaterialFx) and its sounds (BT_AUDIO.PROP_SOUNDS)', !noFx.length && !noSnd.length, { noFx, noSnd });
  /* every sample a prop sound names is one the game loads: the manifest, or
     the Wheel's own footstep clips */
  const { FOOTSTEP_CLIPS } = await import('../../src/data/footstepClips.js');
  const clipKeys = new Set(Object.values(FOOTSTEP_CLIPS).map((c) => c.key));
  const manAt = gd.indexOf('BT_AUDIO.SFX_MANIFEST = {');
  const manBlock = gd.slice(manAt, gd.indexOf('\n};', manAt));
  const named = [...new Set([...soundsBlock.matchAll(/\['([a-z0-9-]+)', [0-9.]+, [0-9.]+, [0-9.]+/g)].map((m) => m[1]))];
  const unknown = named.filter((k) => !clipKeys.has(k) && !manBlock.includes(`'${k}':`));
  ok(`...and every one of the ${named.length} samples they play is one the game loads`, named.length > 10 && !unknown.length, unknown);
}

/* ── v2.3.3001: hits sound like what they hit ──
   Owner, 2026-10-03: "modify hit sound effects based on material type so
   hitting wood vs plants etc for props and also against monsters (arrow,
   melee, magic hit sound for snowmen vs slime etc should all sound like their
   material type).  Same with when monster projectiles break on you".  The
   tables are text in gameDisplay.js (BT_AUDIO.PROP_SOUNDS, CROWN_SOUNDS,
   HIT_VOICES, SHOT_SOUNDS); this reads them the way the block above does. */
console.log('hits sound like what they hit (v2.3.3001)');
{
  const fs = await import('node:fs');
  const gd = fs.readFileSync(new URL('../../src/data/gameDisplay.js', import.meta.url), 'utf8');
  const blockOf = (name) => { const at = gd.indexOf(`BT_AUDIO.${name} = {`); return at >= 0 ? gd.slice(at, gd.indexOf('\n};', at)) : ''; };
  /* one entry of a table: from `\n  key: ` to the next entry at the same depth */
  const entryOf = (block, key) => {
    const at = block.search(new RegExp(`\\n  ${key}: [{\\[]`));
    if (at < 0) return null;
    const rest = block.slice(at + 1);
    const next = rest.slice(1).search(/\n {2}[a-z]+: [{[]/);
    return next < 0 ? rest : rest.slice(0, next + 1);
  };
  const samplesIn = (txt) => [...(txt || '').matchAll(/\['([a-z0-9-]+)', [0-9.]+, [0-9.]+, [0-9.]+/g)].map((m) => m[1]);
  const props = blockOf('PROP_SOUNDS'), crowns = blockOf('CROWN_SOUNDS'), voices = blockOf('HIT_VOICES'), shots = blockOf('SHOT_SOUNDS');
  ok('the four tables are there (PROP_SOUNDS, CROWN_SOUNDS, HIT_VOICES, SHOT_SOUNDS)', !!(props && crowns && voices && shots));
  const { WHEEL_MATERIALS, MATERIALS } = await import('../../src/data/wheelMaterials.js');
  const { FOOTSTEP_CLIPS } = await import('../../src/data/footstepClips.js');
  const clipKeys = new Set(Object.values(FOOTSTEP_CLIPS).map((c) => c.key));
  const manAt = gd.indexOf('BT_AUDIO.SFX_MANIFEST = {');
  const manBlock = gd.slice(manAt, gd.indexOf('\n};', manAt));
  const inManifest = (k) => manBlock.includes(`'${k}':`);

  /* PROPS: the plants are plants -- neither the slime's thud nor wood */
  const plants = ['cactus', 'giantflower', 'toadstool', 'bush'];
  const plantSounds = plants.map((id) => {
    const mat = WHEEL_MATERIALS[id] && WHEEL_MATERIALS[id].mat;
    const e = entryOf(props, MATERIALS[mat] && MATERIALS[mat].sound) || '';
    const hit = e.slice(0, e.indexOf('brk:') >= 0 ? e.indexOf('brk:') : e.length);   /* its hit and layer, not its break or `fb` */
    return { id, mat, hit: samplesIn(hit) };
  });
  const unplanty = plantSounds.filter((p) => !p.hit.length || p.hit.some((k) => ['monster-hit', 'axe-chop', 'wood-chop', 'step-wood', 'slime-death'].includes(k)));
  ok(`the plants sound like plants: ${plantSounds.map((p) => `${p.id} ${p.mat} (${[...new Set(p.hit)].join('+')})`).join(', ')} -- no slime thud, no wood knock`, !unplanty.length, unplanty);
  ok('...the cactus and giant flower a rustle and a squish (plant), the toadstool a squelch (mushroom), the bush a rustle alone (leaf)',
    WHEEL_MATERIALS.cactus.mat === 'plant' && WHEEL_MATERIALS.giantflower.mat === 'plant' && WHEEL_MATERIALS.toadstool.mat === 'mushroom' && WHEEL_MATERIALS.bush.mat === 'leaf'
      && plantSounds.find((p) => p.id === 'cactus').hit.includes('step-grass') && plantSounds.find((p) => p.id === 'toadstool').hit.includes('step-mud')
      && plantSounds.find((p) => p.id === 'bush').hit.every((k) => k === 'step-grass'), plantSounds);
  ok('...and no object is the slime-thud material any more', !Object.values(WHEEL_MATERIALS).some((m) => m.mat === 'soft') && !MATERIALS.soft, null);
  /* TREES: every crown kind is heard */
  const canopies = [...new Set(Object.values(WHEEL_MATERIALS).map((m) => m.canopy).filter(Boolean))];
  const crownSamples = Object.fromEntries(canopies.map((c) => [c, samplesIn(entryOf(crowns, c))]));
  const noCrown = canopies.filter((c) => crownSamples[c].length !== 1);
  ok(`every tree's crown answers its trunk: ${canopies.map((c) => `${c} ${crownSamples[c][0] || '?'}`).join(', ')}`,
    canopies.length === 4 && !noCrown.length && crownSamples.leaf[0] === 'step-grass' && crownSamples.snow[0] === 'step-snow'
      && crownSamples.char[0] === 'step-ash' && crownSamples.slime[0] === 'step-mud', { noCrown, crownSamples });

  /* MONSTERS: each of the Wheel's monsters its own voice */
  const { hitSoundOf, hitMaterialOf } = await import('../../src/data/monsterVariants.js');
  const expectVoice = { snowman: 'snow', fireGoblin: 'ember', mummy: 'bone', skeleton: 'bone', hexer: 'bone', rockmonster: 'stone',
    fodder: 'goo', blueSlime: 'goo', mireWisp: 'goo', mossSlime: 'goo', fishman: 'wet', bogLurker: 'mud' };
  const wrongVoice = Object.entries(expectVoice).filter(([a, v]) => hitSoundOf(a) !== v).map(([a, v]) => `${a}: ${hitSoundOf(a)} (want ${v})`);
  ok(`every Wheel monster sounds like its material: ${Object.entries(expectVoice).map(([a, v]) => `${a} ${v}`).join(', ')}`, !wrongVoice.length, wrongVoice);
  ok('...the fishman and bog lurker still LOOK like goo (`kind`, the pieces)', hitMaterialOf('fishman').kind === 'goo' && hitMaterialOf('bogLurker').kind === 'goo');
  const voiceNames = [...new Set([...Object.values(expectVoice), 'flesh'])];
  const noVoice = voiceNames.filter((v) => !entryOf(voices, v));
  ok(`...and each has its voice in HIT_VOICES (${voiceNames.join(', ')})`, !noVoice.length, noVoice);
  const vs = Object.fromEntries(voiceNames.map((v) => [v, entryOf(voices, v) || '']));
  ok('the mummy stays BONY: the bone voice is sword-hit3 alone, as the owner chose ("Bony is mummy", v2.3.2452)',
    JSON.stringify([...new Set(samplesIn(vs.bone))]) === '["sword-hit3"]' && !/fb:/.test(vs.bone), vs.bone);
  ok('a slime squelches (mud over its thud), a snowman crunches (snow over his thud), a rock takes the pickaxe -- not the sword clang',
    samplesIn(vs.goo).includes('step-mud') && samplesIn(vs.goo)[0] === 'monster-hit'
      && samplesIn(vs.snow)[0] === 'snowman-hit' && samplesIn(vs.snow).includes('step-snow') && !/'monster-hit'/.test(vs.snow)
      && samplesIn(vs.stone)[0] === 'mine-strike' && !samplesIn(vs.stone.split('fb:')[0]).includes('sword-hit2'),
    { goo: vs.goo, snow: vs.snow, stone: vs.stone });
  ok('...a fire goblin sizzles, a fishman splashes, a bog lurker squelches',
    samplesIn(vs.ember).includes('cook-success') && samplesIn(vs.wet).includes('fish-on-hook') && samplesIn(vs.mud)[0] === 'step-mud', { ember: vs.ember, wet: vs.wet, mud: vs.mud });
  /* never silent: a voice that needs a Wheel clip has today's sound to fall
     back on, from the manifest (loaded everywhere) */
  const fbOf = (txt) => { const m = (txt || '').match(/fb: \['([a-z0-9-]+)'/); return m ? m[1] : null; };
  const needsFb = voiceNames.filter((v) => samplesIn(vs[v]).some((k) => !inManifest(k) || k === 'cook-success' || k === 'fish-on-hook' || k === 'mine-strike'));
  const badFb = needsFb.filter((v) => !fbOf(vs[v]) || !inManifest(fbOf(vs[v])));
  ok(`every voice with a texture has today's sound as its fallback (${needsFb.map((v) => `${v} -> ${fbOf(vs[v])}`).join(', ')})`,
    needsFb.length >= 5 && !badFb.length && fbOf(vs.stone) === 'sword-hit2' && fbOf(vs.goo) === 'monster-hit' && fbOf(vs.snow) === 'snowman-hit', badFb);

  /* BALLS: each style a ball can be drawn in has its break */
  const styles = ['snowball', 'fire', 'goo'];
  const shotSamples = Object.fromEntries(styles.map((s) => [s, samplesIn(entryOf(shots, s))]));
  ok(`every monster ball breaks in its material: ${styles.map((s) => `${s} ${[...new Set(shotSamples[s])].join('+')}`).join(', ')}`,
    shotSamples.snowball.includes('step-snow') && shotSamples.fire.includes('cook-success') && shotSamples.goo.includes('slime-projectile-hit')
      && fbOf(entryOf(shots, 'snowball')) === 'snowman-hit' && fbOf(entryOf(shots, 'goo')) === 'slime-projectile-hit', shotSamples);

  /* every sample the four tables name is one the game loads */
  const all = [...new Set([props, crowns, voices, shots].flatMap(samplesIn))];
  const unloaded = all.filter((k) => !clipKeys.has(k) && !inManifest(k));
  ok(`...and every one of the ${all.length} samples the four tables play is one the game loads (the manifest, or the Wheel's footstep clips)`, all.length > 15 && !unloaded.length, unloaded);
  /* a slice of a Wheel footstep clip is ONE step of it: cut_footsteps.py
     re-cutting the clips moves the steps, and a slice measured on the old
     file would land in silence or across two steps */
  const stepByKey = Object.fromEntries(Object.values(FOOTSTEP_CLIPS).map((c) => [c.key, c.steps]));
  const slices = [props, crowns, voices, shots].flatMap((b) => [...b.matchAll(/\['(step-[a-z]+)', ([0-9.]+), ([0-9.]+), [0-9.]+/g)].map((m) => ({ k: m[1], off: +m[2], dur: +m[3] })));
  const outside = slices.filter((s) => !(stepByKey[s.k] || []).some(([o, d]) => s.off >= o - 0.005 && s.off + s.dur <= o + d + 0.005));
  ok(`...each of the ${slices.length} slices of a footstep clip lies inside one of its steps (footstepClips.js)`, slices.length > 20 && !outside.length, outside);
}

/* ═══ v2.3.2999: PLACING v2, THE `?placing=2` PREVIEW ═══
   Owner, 2026-10-03: "work throughout the night on studying object placement
   in the game's maps and what a good distribution is" (docs/OBJECT-
   PLACEMENT-STUDY.md, tools/world/study-placement.mjs).  The land's own
   scatter in woods and clearings, groups, undergrowth, clear roads and camps
   -- and every rule v1 keeps, kept. */
console.log('placing v2, the ?placing=2 preview (v2.3.2999)');
{
  const { placeObjects, footprintOf, campBands, placingOpts, PLACING, PLACING_V2 } = await import('../../public/tools/world/core/placing.js');
  const { objectCatalog } = await import('../../public/tools/objects/catalog.js');
  const { WHEEL_SPAWNS } = await import('../../server/src/wheelspawns.js');
  const WPA = PLAN.worldPxPerArtPx, cellG = bp.scale * WPA;
  ok('the switch: `placing=2` is v2, anything else the placing as it is',
    placingOpts('?trial=wheel&placing=2').v === 2 && placingOpts('?placing=2').v === 2 && !placingOpts('?placing=3').v && !placingOpts('?placing=20').v
      && !placingOpts('?trial=wheel').v && !placingOpts('').v && !placingOpts(null).v);
  const t0 = Date.now();
  const V = placeObjects(PLAN, bp, { v: 2 });
  const ms = Date.now() - t0;
  const V1 = placeObjects(PLAN, bp);
  const Vb = placeObjects(PLAN, buildBlueprint(PLAN), { v: 2 });
  const sameArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  ok(`v2 places the Wheel (${V.n} things, ${ms} ms; v1 ${V1.n}), the same every time, and says so`,
    V.version === PLACING_V2 && V1.version === PLACING && V.n > 8000 && V.n < 1.3 * V1.n && ms < 6000 && ['kind', 'piece', 'flip', 'x', 'y'].every((k) => sameArr(V[k], Vb[k])), { n: V.n, v1: V1.n, ms });
  const cat = objectCatalog(), byId = Object.fromEntries(cat.map((e) => [e.id, e]));
  const idOf = (i) => V.kinds[V.kind[i]];
  const cellOfG = (x, y) => Math.floor(y / cellG) * bp.w + Math.floor(x / cellG);
  const clsAtG = (x, y) => bp.cls[cellOfG(x, y)];
  const regAtG = (x, y) => bp.regionIds[bp.reg[cellOfG(x, y)]];
  const free = (c) => c === C.ground || c === C.obstacle;
  const wild = new Set(cat.filter((e) => e.kind === 'nature').map((e) => e.id));
  /* the town, the fences and the oases are v1's own: the same in both */
  const notWild = (P) => { const o = []; for (let i = 0; i < P.n; i++) if (!wild.has(P.kinds[P.kind[i]]) || P.kinds[P.kind[i]] === 'palm' || regAtG(P.x[i], P.y[i]) === 'town') o.push(P.kinds[P.kind[i]] + '@' + P.x[i] + ',' + P.y[i]); return o.sort().join('|'); };
  ok('...the town, its furniture, the fences and the oases\' palms exactly as v1 places them', notWild(V) === notWild(V1));
  const sizeOf = (e) => (e.fit === 'w' ? { w: e.size, h: e.size / (e.ar || 1) } : { w: e.size * (e.ar || 1), h: e.size });
  const bad = [], wrong = [], cover = [];
  const NOCOVER = new Set(['path', 'street', 'rail', 'bridge', 'boardwalk', 'plaza', 'lot', 'landmark', 'gate'].map((k) => C[k]).filter((v) => v != null));
  const { mask: core } = campBands(PLAN, bp);
  for (let i = 0; i < V.n; i++) {
    const id = idOf(i);
    if (!wild.has(id)) continue;
    const x = V.x[i], y = V.y[i], c = clsAtG(x, y);
    if (!free(c)) bad.push([id, CLASS_IDS[c]]);
    if (regAtG(x, y) === 'town') continue;   /* v2.3.3031: the town's gardens are placing.js townGrounds', the same in both (below) */
    if (regAtG(x, y) !== byId[id].group) wrong.push([id, regAtG(x, y)]);
    const { w, h } = sizeOf(byId[id]);
    if (h >= 160 && id !== 'palm') {
      let hit = 0;
      for (const u of [-0.4, 0, 0.4]) for (const v of [-0.85, -0.6, -0.35]) { const q = cellOfG(x + u * w, y + v * h); if (NOCOVER.has(bp.cls[q]) || core[q] || bp.regionIds[bp.reg[q]] === 'town') hit++; }
      if (hit > 1) cover.push(id + '@' + x + ',' + y);
    }
  }
  ok('...nothing wild on a road, water, a plot, a camp, a landmark or a gate, and each land only its own', !bad.length && !wrong.length, { bad: bad.slice(0, 5), wrong: wrong.slice(0, 5) });
  ok('...and no tall picture covers a road, a plot, a landmark or a camp\'s middle (seen from the south, a tree below a road stood in it)', !cover.length, cover.slice(0, 6));
  /* the camps: the bake's own bands (placing.js derives them from the plan,
     before anything is placed -- the bake places first, so reading it back
     would go round in a circle) */
  const cb = campBands(PLAN, bp);
  const bandsOk = Object.entries(WHEEL_SPAWNS).every(([id, sp]) => cb.bands[id] && cb.bands[id].anchor[0] === sp.anchor[0] && cb.bands[id].anchor[1] === sp.anchor[1]
    && Math.round(cb.bands[id].r0) === sp.band[0] && Math.round(cb.bands[id].r1) === sp.band[1] && sp.points.every(([x, y]) => cb.mask[cellOfG(x, y)]));
  ok('the camps v2 keeps clear are exactly where the worker\'s monsters stand (bake-wheel-spawns.mjs: every anchor, band and place)', bandsOk);
  /* clearer: tall things in the camps against the land round them */
  const tallIn = (P) => {
    let inCamp = 0, all = 0, cells = 0;
    const camps = new Set(Object.keys(WHEEL_SPAWNS));
    for (let c = 0; c < bp.w * bp.h; c++) if (cb.mask[c]) cells++;
    let land = 0;
    for (let c = 0; c < bp.w * bp.h; c++) if (camps.has(bp.regionIds[bp.reg[c]]) && free(bp.cls[c])) land++;
    for (let i = 0; i < P.n; i++) {
      const id = P.kinds[P.kind[i]], e = byId[id];
      if (!e || e.kind !== 'nature' || sizeOf(e).h < 170 || id === 'palm' || !camps.has(regAtG(P.x[i], P.y[i]))) continue;
      all++;
      if (cb.mask[cellOfG(P.x[i], P.y[i])]) inCamp++;
    }
    return (inCamp / cells) / (all / land);
  };
  const c1 = tallIn(V1), c2 = tallIn(V);
  ok(`the camps are clearings: tall things there ${c2.toFixed(2)} of the lands' own (v1 ${c1.toFixed(2)})`, c2 < 0.4 && c2 < c1 / 2, { v1: c1, v2: c2 });
  /* spacing: no two tall trunks closer than their crowns allow */
  const talls = [];
  for (let i = 0; i < V.n; i++) { const e = byId[idOf(i)]; if (e && e.kind === 'nature' && sizeOf(e).h >= 170 && idOf(i) !== 'palm' && !['icespire'].includes(idOf(i)) && regAtG(V.x[i], V.y[i]) !== 'town') talls.push([V.x[i], V.y[i], sizeOf(e).w]); }
  const TB = 256, th = new Map();
  talls.forEach((t, k) => { const key = Math.floor(t[1] / TB) * 1000 + Math.floor(t[0] / TB); (th.get(key) || th.set(key, []).get(key)).push(k); });
  let close = 0;
  talls.forEach((t, k) => {
    for (let j = Math.floor((t[1] - 160) / TB); j <= Math.floor((t[1] + 160) / TB); j++) for (let i = Math.floor((t[0] - 160) / TB); i <= Math.floor((t[0] + 160) / TB); i++) for (const m of th.get(j * 1000 + i) || []) {
      if (m <= k) continue;
      const o = talls[m];
      if (Math.hypot(o[0] - t[0], o[1] - t[1]) < 0.41 * Math.max(t[2], o[2])) close++;
    }
  });
  ok(`no two tall things closer than their crowns allow (Matern II, 0.42 x the wider's width): ${close} pairs of ${talls.length}`, close === 0 && talls.length > 1500, { close, talls: talls.length });
  /* tight gaps between footprints (catalog sizes): 20-36 game px, where the
     feet (BroTown hs 10) catch -- v2 leaves almost none */
  const gaps = (P) => {
    const boxes = [];
    for (let i = 0; i < P.n; i++) { const id = P.kinds[P.kind[i]], e = byId[id]; if (!e || e.kind === 'building') continue; const { w, h } = sizeOf(e); for (const b of footprintOf(id, e.kind, P.x[i], P.y[i], w, h)) boxes.push(b); }
    const FB = 128, fh = new Map();
    boxes.forEach((b, k) => { for (let j = Math.floor(b.y0 / FB); j <= Math.floor(b.y1 / FB); j++) for (let i = Math.floor(b.x0 / FB); i <= Math.floor(b.x1 / FB); i++) { const key = j * 1000 + i; (fh.get(key) || fh.set(key, []).get(key)).push(k); } });
    let tight = 0;
    const seen = new Set();
    boxes.forEach((a, ka) => {
      for (let j = Math.floor((a.y0 - 40) / FB); j <= Math.floor((a.y1 + 40) / FB); j++) for (let i = Math.floor((a.x0 - 40) / FB); i <= Math.floor((a.x1 + 40) / FB); i++) for (const kb of fh.get(j * 1000 + i) || []) {
        if (kb <= ka || seen.has(ka * 1e6 + kb)) continue;
        seen.add(ka * 1e6 + kb);
        const b = boxes[kb], gx = Math.max(b.x0 - a.x1, a.x0 - b.x1), gy = Math.max(b.y0 - a.y1, a.y0 - b.y1);
        const gap = gy < 0 && gx > 0 ? gx : gx < 0 && gy > 0 ? gy : null;
        if (gap != null && gap >= 20 && gap < 36) tight++;
      }
    });
    return tight;
  };
  const g1 = gaps(V1), g2 = gaps(V);
  ok(`gaps the feet catch in (20-36 px between two footprints): ${g2}, v1 ${g1}`, g2 < g1 / 3, { v1: g1, v2: g2 });
}

/* ── v2.3.3003: swimming's rules (src/game/wheelSwim.js) ──
   Owner: "add swimming ... and change the movement behavior".  When you are
   swimming, how fast, the glide, and that a teleport (a respawn, a way in)
   goes in or out of the water without a splash. */
console.log('swimming (v2.3.3003)');
{
  const W8 = await import('../../src/game/wheelSwim.js');
  /* water south of y = 1000, land north of it */
  const waterAt = (x, y) => y >= 1000;
  ok('five looks round the boots: all wet in the water, none on the bank', W8.wetProbes(waterAt, 0, 1100) === 5 && W8.wetProbes(waterAt, 0, 900) === 0
    && W8.wetProbes(() => null, 0, 0) === -1);
  ok('in when four are wet, out only at one -- a walk along a shore does not flicker',
    W8.swimNext(false, 4) && !W8.swimNext(false, 3) && W8.swimNext(true, 2) && !W8.swimNext(true, 1) && W8.swimNext(true, -1) && !W8.swimNext(false, -1));
  const S = { player: { x: 0, y: 900, vx: 0, vy: 0 } };
  let t = 1000;
  const step = (dy, dtMs = 16) => {
    t += dtMs;
    S.player.y += dy;
    const ev = W8.updateWheelSwim(S, t, true, 52, waterAt);
    S.player.vy = dy;
    return ev;
  };
  const evs = [];
  for (let i = 0; i < 40; i++) evs.push(step(3));
  ok(`walking into the water: 'in' once, as the boots go in (${evs.filter(Boolean).join(',')})`, evs.filter((e) => e === 'in').length === 1 && W8.isWheelSwimming(S), evs.filter(Boolean));
  ok('...the walk carried in as the glide\'s way, so you do not stall at the edge', S._wheelSwim.vy > 0.9);
  /* the stroke's clock, at a full stick */
  const out = [0, 0];
  let strokes = 0, sumM = 0, n = 0;
  for (let i = 0; i < 400; i++) {
    W8.swimGlide(S, 0, 1, 1, out);
    const ev = step(0.5);
    if (ev === 'stroke') strokes++;
    sumM += W8.wheelSwimMult(S); n++;
  }
  const avgM = sumM / n;
  ok(`a stroke every ${W8.STROKE_MS} ms (${strokes} in 6.4 s), its push averaging out to ${avgM.toFixed(3)} of a walk (SWIM_MULT ${W8.SWIM_MULT})`,
    strokes >= 8 && strokes <= 11 && Math.abs(avgM - W8.SWIM_MULT) < 0.02, { strokes, avgM });
  /* the glide: never faster than the stick, and it eases off when let go */
  let longest = 0;
  for (let i = 0; i < 60; i++) { W8.swimGlide(S, i % 2 ? 1 : 0, i % 3 ? 0 : -1, 2, out); longest = Math.max(longest, Math.hypot(out[0], out[1])); }
  ok(`the glide never goes faster than the stick (longest ${longest.toFixed(3)})`, longest <= 1.0001, longest);
  W8.swimGlide(S, 0, 1, 1, out); for (let i = 0; i < 60; i++) W8.swimGlide(S, 0, 1, 1, out);
  const v0 = out[1];
  let drift = 0, frames = 0;
  while (frames < 200) { W8.swimGlide(S, 0, 0, 1, out); if (!out[1]) break; drift += out[1]; frames++; }
  ok(`let go and you drift ${drift.toFixed(1)} strides' worth, then stop (${frames} frames)`, v0 > 0.99 && drift > 3 && drift < 15 && frames < 100, { v0, drift, frames });
  ok('out of the water the walk is the walk: 1, and the glide hands the stick back untouched',
    (() => { const L = { player: { x: 0, y: 0 } }; const o = W8.swimGlide(L, 0.3, -0.7, 1, [0, 0]); return W8.wheelSwimMult(L) === 1 && o[0] === 0.3 && o[1] === -0.7; })());
  /* refusals say so, but not every frame */
  const n1 = W8.swimNote(S, t), n2 = W8.swimNote(S, t + 100), n3 = W8.swimNote(S, t + W8.NOTE_MS + 1);
  ok('"Swimming!" over your head when refused, not more often than NOTE_MS', !!n1 && !n2 && !!n3 && n1.y < S._wheelSwim.fy);
  /* walking out: 'out', and the walk back */
  const ev2 = [];
  for (let i = 0; i < 130; i++) ev2.push(step(-3));
  ok(`walking out: 'out' once (${ev2.filter((e) => e && e !== 'stroke').join(',')})`, ev2.filter((e) => e === 'out').length === 1 && !W8.isWheelSwimming(S));
  /* a teleport: in the water and out again without a splash */
  S.player.y = 1400; const tIn = W8.updateWheelSwim(S, t += 16, true, 52, waterAt);
  ok(`a teleport into the water (a way in) swims at once, with no splash: '${tIn}'`, tIn === 'landed' && W8.isWheelSwimming(S));
  S.player.y = 300; const tOut = W8.updateWheelSwim(S, t += 16, true, 52, waterAt);
  ok('...and out of it (a respawn after drowning in a pond) stands at once, with no drip', tOut === null && !W8.isWheelSwimming(S));
  /* v2.3.3012: seated on the bank (fishing, mining) is out of the water, even
     where the drawn shore lies a few px into the seat */
  S.player.y = 1400; W8.updateWheelSwim(S, t += 16, true, 52, waterAt);
  /* the boots at y 1003 on a shore wet west of x -4 and south of y 1008:
     two of the five looks wet, so a swimmer stays one there */
  const shore = (x, y) => (x < -4 && y >= 1000) || y >= 1008;
  for (const y of [1220, 1040, 951]) { S.player.y = y; W8.updateWheelSwim(S, t += 16, true, 52, shore); }
  const stillIn = W8.isWheelSwimming(S) && W8.wetProbes(shore, 0, 1003) === 2;
  const was = W8.climbOut(S, t);
  const evs3 = [];
  for (let i = 0; i < 30; i++) evs3.push(W8.updateWheelSwim(S, t += 16, true, 52, shore));
  ok('seated on a bank whose drawn shore reaches the boots: climbOut ends the swim, and it stays ended (back in only at four wet)',
    stillIn && was === true && !W8.isWheelSwimming(S) && evs3.every((e) => e === null) && W8.climbOut(S, t) === false, { stillIn, was, evs3: evs3.filter(Boolean) });
  /* leaving the Wheel lets it all go */
  W8.updateWheelSwim(S, t += 16, false, 52, waterAt);
  ok('outside the Wheel there is no swimming at all', S._wheelSwim === null && !W8.isWheelSwimming(S));
  /* the game's own copies agree: the sounds the strokes and splashes play are
     the manifest's, so every player has them */
  const { readFileSync } = await import('node:fs');
  const gd = readFileSync(new URL('../../src/data/gameDisplay.js', import.meta.url), 'utf8');
  const keys = ['fish-on-hook', 'lure-drop', 'catch-splash'];
  ok('swimming\'s sounds are recordings already in the game (the fishing ones in SFX_MANIFEST)', keys.every((k) => new RegExp(`'${k}':\\s*'/sfx/`).test(gd)) && /BT_AUDIO\.SWIM_SAMPLES = \['fish-on-hook', 'lure-drop', 'catch-splash'\]/.test(gd));
}

/* ── v2.3.3017: jumping's rules (src/game/jump.js) ──
   Owner: "start working on real jumping.  Might be able to just use the jog
   directions instead of a custom jump animation".  The arc, the window in
   which low things are cleared, when a jump may start, that the feet only
   pass over a low thing they will be out of before coming down, and that the
   list of what is cleared is the catalog's low things. */
console.log('jumping (v2.3.3017)');
{
  const J = await import('../../src/game/jump.js');
  ok('the arc: on the ground at take-off and touch-down, the whole peak half way',
    J.jumpLiftAt(0) === 0 && J.jumpLiftAt(1) === 0 && J.jumpLiftAt(0.5) === 1 && J.jumpLiftAt(0.25) === 0.75 && J.jumpLiftAt(-1) === 0 && J.jumpLiftAt(2) === 0);
  const t0 = 10000;
  const j = { t0, dur: J.JUMP_MS, peak: J.JUMP_PEAK };
  ok(`in the air for ${J.JUMP_MS} ms, ${J.JUMP_PEAK} px up at the top`,
    !J.jumpActive(j, t0 - 1) && J.jumpActive(j, t0) && J.jumpActive(j, t0 + J.JUMP_MS - 1) && !J.jumpActive(j, t0 + J.JUMP_MS)
    && Math.abs(J.jumpHeight(j, t0 + J.JUMP_MS / 2) - J.JUMP_PEAK) < 1e-9 && J.jumpHeight(j, t0) === 0);
  const from = t0 + J.CLEAR_FROM * J.JUMP_MS, to = t0 + J.CLEAR_TO * J.JUMP_MS;
  ok(`low things are cleared from ${Math.round(J.CLEAR_FROM * J.JUMP_MS)} to ${Math.round(J.CLEAR_TO * J.JUMP_MS)} ms, while the lift is ${J.JUMP_CLEAR} of the peak or more`,
    J.clearMsLeft(j, from - 2) === 0 && J.clearMsLeft(j, from + 1) > 0 && J.clearMsLeft(j, to + 1) === 0
    && Math.abs(J.jumpLiftAt(J.CLEAR_FROM) - J.JUMP_CLEAR) < 1e-9 && Math.abs(J.clearMsLeft(j, t0 + J.JUMP_MS / 2) - (to - (t0 + J.JUMP_MS / 2))) < 1e-6);
  /* when a jump may start */
  const S0 = () => ({ player: { x: 0, y: 0 }, rpg: { hp: 50 } });
  const now = 50000;
  const why = (mut, extra) => { const S = S0(); mut(S); return J.jumpRefusal(S, now, extra || {}); };
  ok('a jump starts from standing; not dead, not in the air, not a beat after landing',
    why(() => {}) === null && why((S) => { S.rpg.hp = 0; }) === 'dead' && why((S) => { S._dying = true; }) === 'dead'
    && why((S) => { S._jump = { t0: now - 100, dur: J.JUMP_MS }; }) === 'airborne'
    && why((S) => { S._jumpLandAt = now - 50; }) === 'landing' && why((S) => { S._jumpLandAt = now - J.JUMP_REST_MS - 1; }) === null);
  ok('...nor rolling, dashing, swimming, harvesting, held by goo, stunned, frozen on a pickup or on the sled',
    why((S) => { S._dodgeRoll = {}; }) === 'rolling' && why((S) => { S._bashDash = {}; }) === 'dashing'
    && why((S) => { S._wheelSwim = { on: true }; }) === 'swimming' && why((S) => { S._wheelSwim = { on: false }; }) === null
    && why((S) => { S._extraction = {}; }) === 'harvesting' && why(() => {}, { stuck: true }) === 'stuck' && why(() => {}, { stunned: true }) === 'stunned' && why(() => {}, { dazed: true }) === 'dazed'
    && why((S) => { S._lootFreezeUntil = now + 100; }) === 'busy' && why((S) => { S._sled = {}; }) === 'busy');
  const SJ = S0();
  const jj = J.startJump(SJ, now, 3, 4);
  ok('take-off keeps the stick as the way you go on in the air, never longer than a full push',
    SJ._jump === jj && Math.abs(Math.hypot(jj.dx, jj.dy) - 1) < 1e-9 && Math.abs(jj.dx - 0.6) < 1e-9 && J.jumpAirborne(SJ, now + 10)
    && (J.startJump(SJ, now, 0.3, 0), SJ._jump.dx === 0.3));
  J.endJump(SJ, now + 600);
  ok('...and touching down clears it and starts the rest', SJ._jump === null && SJ._jumpLandAt === now + 600 && J.jumpRefusal(SJ, now + 650, {}) === 'landing');
  /* the crossing rule: a fence across your way, 160 wide and 12 deep, feet half 10 */
  const fence = { x0: -80, y0: -6, x1: 80, y1: 6, id: 'fence' };
  const mid = { t0, dur: J.JUMP_MS, peak: J.JUMP_PEAK };
  const tm = t0 + J.JUMP_MS / 2;   /* the top: ~(CLEAR_TO - 0.5) x 560 = ~206 ms of clearing left */
  /* going south at a walk (2.5 px a frame = 0.15 px a ms), the feet's top edge just into it */
  ok('a fence is cleared going straight over it: out before you come down',
    J.crossMs(fence, 10, 0, -15, 0, 0.15) < J.clearMsLeft(mid, tm) && J.overLow(fence, mid, tm, 10, 0, -15, 0, 0.15));
  ok('...but not running along it (out of its 160 px too late), nor late in the jump, nor on the ground',
    !J.overLow(fence, mid, tm, 10, -70, 0, 0.15, 0)
    && !J.overLow(fence, mid, to - 5, 10, 0, -15, 0, 0.15)
    && !J.overLow(fence, mid, t0 + 10, 10, 0, -15, 0, 0.15) && !J.overLow(fence, null, tm, 10, 0, -15, 0, 0.15));
  ok('...and standing still in the air over it is never out: refused',
    J.crossMs(fence, 10, 0, 0, 0, 0) === Infinity && !J.overLow(fence, mid, tm, 10, 0, 0, 0, 0));
  ok('a tree, a boulder or a building is never cleared, whatever the jump',
    ['oak', 'pine', 'boulder', 'cart', 'saloon', 'haystack'].every((id) => !J.overLow({ ...fence, id }, mid, tm, 10, 0, -15, 0, 0.15)));
  /* what is cleared is the catalog's low things */
  const { objectCatalog } = await import('../../public/tools/objects/catalog.js');
  const { footprintOf } = await import('../../public/tools/world/core/placing.js');
  const cat = objectCatalog(), byId = Object.fromEntries(cat.map((e) => [e.id, e]));
  const drawnH = (o) => (o.fit === 'w' ? o.size / (o.ar || 1) : o.size);
  const footed = (o) => footprintOf(o.id, o.kind, 0, 0, o.fit === 'w' ? o.size : o.size * (o.ar || 1), drawnH(o)).length > 0;
  const missing = [...J.JUMP_OVER, ...J.JUMP_NOT].filter((id) => !byId[id]);
  ok(`every id a jump clears (${J.JUMP_OVER.size}) or leaves (${J.JUMP_NOT.size}) is in the catalog`, missing.length === 0, missing);
  const lowUnlisted = cat.filter((o) => footed(o) && drawnH(o) <= 81 && !J.JUMP_OVER.has(o.id) && !J.JUMP_NOT.has(o.id)).map((o) => o.id);
  ok('every low thing with a footprint (81 px or less as drawn) is cleared or named as not', lowUnlisted.length === 0, lowUnlisted);
  const tallListed = [...J.JUMP_OVER].filter((id) => byId[id] && drawnH(byId[id]) > 70 && id !== 'fence-down');
  ok('nothing taller than 70 px is cleared but the north-south fence (a fence drawn up the picture)', tallListed.length === 0
    && byId['fence-down'] && byId['fence'] && drawnH(byId['fence']) <= 70, tallListed);
  const { WHEEL_MATERIALS } = await import('../../src/data/wheelMaterials.js');
  const bigListed = [...J.JUMP_OVER].filter((id) => WHEEL_MATERIALS[id] && (WHEEL_MATERIALS[id].big || WHEEL_MATERIALS[id].canopy));
  ok('...and nothing big or with a crown', bigListed.length === 0, bigListed);
  /* the frames held, and another player's jump clamped */
  ok('the held leaping frame is inside each jog sheet (east 28, north 23, northeast 24, south 26, southwest 20)',
    J.jumpFrame('east', 28) === 1 && J.jumpFrame('north', 23) === 8 && J.jumpFrame('northeast', 24) === 4 && J.jumpFrame('south', 26) === 7
    && J.jumpFrame('southwest', 20) === 6 && J.jumpFrame('west', 28) === 0 && J.jumpFrame('east', 1) === 0);
  const pj = J.peerJump({ dur: 99999, peak: -5 }, 7), pk = J.peerJump({ dur: 'x', peak: 1e9 }, 7), pg = J.peerJump({ dur: 400, peak: 30 }, 7);
  ok('another player\'s jump: their numbers clamped, a garbled one the usual jump',
    pj.dur === 900 && pj.peak === J.JUMP_PEAK && pk.dur === J.JUMP_MS && pk.peak === 120 && pg.dur === 400 && pg.peak === 30 && pg.t0 === 7);
}

/* ── v2.3.3073: a tap on the right stick jumps, last (src/game/tapJump.js) ──
   Owner: "Try moving jump as tap on right joystick but prioritize other
   contextual uses for the tap instead of jump first if any apply." */
console.log('the tap that jumps (v2.3.3073)');
{
  const fs = await import('node:fs');
  const TJ = await import('../../src/game/tapJump.js');
  const now = 100000;
  ok('a tap with nothing to do on the right side may jump', TJ.rightTapBusy({}, now) === false);
  ok('...not while a harvest owns the side, the disc has a job, or a lock waits for an empty tap to let it go',
    TJ.rightTapBusy({ _extraction: {} }, now) && TJ.rightTapBusy({ _rBtnPressUntil: now + 1 }, now)
      && TJ.rightTapBusy({ lockedTarget: { type: 'monster' } }, now) && !TJ.rightTapBusy({ _rBtnPressUntil: now }, now)
      && TJ.rightTapBusy(null, now));
  ok('the old button only with ?jumpbtn', TJ.jumpButtonWanted('?jumpbtn') && TJ.jumpButtonWanted('?a=1&jumpbtn=1')
    && !TJ.jumpButtonWanted('') && !TJ.jumpButtonWanted('?jumpbtnx'));
  const bt = fs.readFileSync(new URL('../../src/ui/BroTown.jsx', import.meta.url), 'utf8');
  const rE = bt.slice(bt.indexOf('var rE = function rE(e)'), bt.indexOf('THE BUTTON.  Press = engage'));
  const at = (re) => { const m = re.exec(rE); return m ? m.index : -1; };
  const flick = at(/doSpecialAttack\(\); return;/), res = at(/tapResourceAtClient\(t\.clientX/), npc = at(/tapNpcAtClient\(t\.clientX/),
    self = at(/openSelfChat\(\)/), fwd = at(/dispatchEvent\(new MouseEvent\('click'/), jump = at(/triggerJump\(_tjS\)/);
  ok(`the right stick's release tries the flick, a resource, a character, yourself and the forwarded tap BEFORE the jump (${[flick, res, npc, self, fwd, jump].join(' < ')})`,
    [flick, res, npc, self, fwd, jump].every((v, k, a) => v > 0 && (k === 0 || v > a[k - 1])));
  ok('...the jump only when the forwarded tap reached "empty space", read before it could drop the lock',
    /rightTapBusy\(_tjS, endT\)[\s\S]*_tjSeq = [\s\S]*dispatchEvent[\s\S]*_tapEmptySeq \|\| 0\) > _tjSeq/.test(rE)
      && /S\._tapEmptySeq = \(S\._tapEmptySeq \|\| 0\) \+ 1;\s*\/\* Tap on empty space = unlock \*\/\s*S\.lockedTarget = null;/.test(bt)
      && /rts\.busy = rightTapBusy\(/.test(bt));
}

/* ── v2.3.3017: which land a Wheel point is on (src/data/zones.js wheelLandAt) ──
   Owner, 2026-10-04: "I was fighting fire goblins and my screen went black."
   The monsters' looks load for your own land as you walk toward them, and
   for another land's only near (rendering/wheelMonsterArt.js): at the Flame
   Fields LOAD_R had reached across the water for three more. */
{
  console.log('which land a Wheel point is on (v2.3.3017)');
  const { ZONES, wheelLandAt } = await import('../../src/data/zones.js');
  const L = ZONES.wheel.lands, C = 21504;
  const own = Object.keys(L).every((k) => wheelLandAt('wheel', L[k][0], L[k][1]) === k);
  ok('every land\'s anchor is on its own land', own, Object.keys(L).map((k) => [k, wheelLandAt('wheel', L[k][0], L[k][1])]));
  /* out along a spoke, past its anchor, and a little toward a neighbour */
  const out = (k, f, tilt) => { const a = Math.atan2(L[k][1] - C, L[k][0] - C) + tilt; const r = Math.hypot(L[k][0] - C, L[k][1] - C) * f; return wheelLandAt('wheel', C + Math.cos(a) * r, C + Math.sin(a) * r); };
  ok('...out along its spoke, and up to 22 degrees toward a neighbour, still its own; past that, the neighbour\'s',
    out('ember', 2.5, 0) === 'ember' && out('ember', 1, 0.38) === 'ember' && out('ember', 1, -0.38) === 'ember'
    && out('ember', 1, 0.41) === 'sky' && out('ember', 1, -0.41) === 'frost', [out('ember', 1, 0.41), out('ember', 1, -0.41)]);
  /* the fire goblins and their nearest neighbours across the water */
  const { WHEEL_SPAWNS } = await import('../../server/src/wheelspawns.js');
  const lands = (h) => WHEEL_SPAWNS[h].points.map((p) => wheelLandAt('wheel', p[0], p[1]));
  ok('...and every land\'s first monsters stand on it', Object.keys(WHEEL_SPAWNS).every((h) => lands(h).every((l) => l === h)),
    Object.keys(WHEEL_SPAWNS).map((h) => [h, [...new Set(lands(h))]]));
  ok('...outside the Wheel there are no lands', wheelLandAt('town', 100, 100) === null && wheelLandAt('wheel', NaN, 1) === null);
}

/* ── v2.3.3019: the water moves ──
   Owner, 2026-10-04: "Does the water move yet" -- then "Yes" to glints and
   lines of light drifting across it, the foam lapping in and out at the
   shore and a gentle drift down the rivers.  The ground worker lays a FIELD
   with each piece (ground.js, WATER THAT MOVES) that the game's shader reads
   (src/rendering/wheelWater.js): how far from the shore as drawn, which
   water, which way a river runs. */
console.log('the water moves (v2.3.3019)');
{
  const { waterRivers, wavesOn, WF_CAP, WF_DIST, WF_KIND } = await import('../../public/tools/world/core/ground.js');
  const { readFileSync } = await import('node:fs');
  const mmF = materialMap(PLAN, bp);
  const WPA = PLAN.worldPxPerArtPx, K = 3, CH = 128, AP = 3;   /* v2.3.3019: the apron 3 art px, for the swell */
  const rivers = waterRivers(PLAN, bp);
  /* the game's piece over a game px (ground-worker.js: CHUNK, APRON) */
  const pieceAt = (i, j) => ({ i, j, x: bp.x0 + i * CH - AP, y: bp.y0 + j * CH - AP, w: CH + 2 * AP, h: CH + 2 * AP });
  const pieceOf = (gx, gy) => pieceAt(Math.floor(gx / (CH * WPA)), Math.floor(gy / (CH * WPA)));
  const solid = (r, gg, b) => { const T = 16, t = { w: T, h: T, data: new Uint8ClampedArray(T * T * 4) }; for (let i = 0; i < T * T; i++) t.data.set([r, gg, b, 255], i * 4); return t; };
  const wtiles = { sea: { A: solid(200, 0, 0) }, shallows: { A: solid(0, 200, 0) }, fresh: { A: solid(0, 0, 200) } };
  const lay = (r, opts = {}) => composeGround(PLAN, bp, mmF, r, wtiles, { scale: K, waterField: { rivers }, ...opts });
  const isWaterQ = (q) => mmF.ids[q] === 'water';

  const sw = rivers.find((r) => r.id === 'sweetwater');
  ok(`the rivers' lines come from the blueprint, source to mouth: the Sweetwater, ${sw ? sw.pts.length / 2 : 0} points, ${sw && sw.half0} to ${sw && sw.half1} art px either side`,
    rivers.length === 1 && !!sw && sw.pts.length / 2 > 50 && sw.half0 === 17 && sw.half1 === 52, rivers.map((r) => r.id));
  ok('`?nowaves` keeps the water still (the worker lays no fields); anything else moves it',
    !wavesOn('?nowaves') && !wavesOn('?trial=wheel&nowaves') && !wavesOn('?nowaves=1') && wavesOn('') && wavesOn('?trial=wheel') && wavesOn('?nowavesx') && wavesOn(undefined));

  /* a coast: of the pieces round mp-wheelwaves' spot, the one most evenly
     land and water */
  let coast = null, best = -1;
  const block = new Map();
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const r0 = pieceOf(25199, 15874);
    const r = pieceAt(r0.i + di, r0.j + dj);
    const out = lay(r);
    const f = out.waterField;
    block.set(`${di},${dj}`, f);
    if (!f || !f.data) continue;
    let w = 0;
    for (let k = 0; k < f.w * f.h; k++) if (f.data[k * 4]) w++;
    const even = Math.min(w, f.w * f.h - w);
    if (even > best) { best = even; coast = { r, out }; }
  }
  const plain = composeGround(PLAN, bp, mmF, coast.r, wtiles, { scale: K });
  let same = plain.data.length === coast.out.data.length;
  for (let k = 0; k < plain.data.length && same; k++) same = plain.data[k] === coast.out.data[k];
  ok('only when asked (the studios never ask): without it no field, and with it the picture is the same to the last px',
    plain.waterField === null && same && !!coast.out.waterField);
  const F = coast.out.waterField, n = F.w * F.h;
  let landR = 0, wetLow = 0, top = 0;
  for (let k = 0; k < n; k++) {
    const R = F.data[k * 4];
    const fx = k % F.w, fy = (k / F.w) | 0, q = coast.out.mat[(fy * K + 1) * coast.out.w + fx * K + 1];
    if (!isWaterQ(q) && R !== 0) landR++;
    if (isWaterQ(q) && R < WF_DIST) wetLow++;
    top = Math.max(top, R);
  }
  ok(`a coast's field: a texel an art px, the apron too (${F.w} x ${F.h}); 0 on land, at least one output px out on the water, ${WF_CAP} output px at most`,
    F.w === CH + 2 * AP && F.h === CH + 2 * AP && landR === 0 && wetLow === 0 && top === WF_CAP * WF_DIST, { landR, wetLow, top, best });
  /* the distance is the drawn shore's, exactly: against a brute-force search
     of the piece's own px, for every water texel whose search stays inside it */
  let checked = 0, wrong = 0;
  const OW = coast.out.w;
  for (let fy = 8; fy < F.h - 8; fy++) for (let fx = 8; fx < F.w - 8; fx++) {
    const k = fy * F.w + fx, cx = fx * K + 1, cy = fy * K + 1;
    if (!isWaterQ(coast.out.mat[cy * OW + cx])) continue;
    let d2 = Infinity;
    for (let y = cy - 21; y <= cy + 21; y++) for (let x = cx - 21; x <= cx + 21; x++) {
      if (isWaterQ(coast.out.mat[y * OW + x])) continue;
      const e = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (e < d2) d2 = e;
    }
    const want = Math.max(1, Math.round(Math.min(Math.sqrt(d2), WF_CAP) * WF_DIST));
    checked++;
    if (F.data[k * 4] !== want) wrong++;
  }
  ok(`...how far from the shore AS DRAWN, exactly: ${checked} water texels against a search of the piece's own px, ${wrong} wrong`,
    checked > 2000 && wrong === 0, { checked, wrong });
  /* which water: the picture laid at the texel's middle */
  const kindOfPx = (o) => { const d = coast.out.data; return d[o] === 200 && !d[o + 1] && !d[o + 2] ? WF_KIND.sea : !d[o] && d[o + 1] === 200 && !d[o + 2] ? WF_KIND.shallows : !d[o] && !d[o + 1] && d[o + 2] === 200 ? WF_KIND.fresh : 0; };
  let kc = 0, kw = 0, shoreKind = 0, shoreLand = 0;
  const kinds = new Set();
  for (let k = 0; k < n; k++) {
    const fx = k % F.w, fy = (k / F.w) | 0, o = ((fy * K + 1) * OW + fx * K + 1) * 4;
    const want = kindOfPx(o);
    if (F.data[k * 4] && want) { kc++; kinds.add(want); if (F.data[k * 4 + 1] !== want) kw++; }
    if (!F.data[k * 4] && fx > 0 && fx < F.w - 1 && (F.data[(k - 1) * 4] || F.data[(k + 1) * 4])) { shoreLand++; if (F.data[k * 4 + 1]) shoreKind++; }
  }
  ok(`...which water each texel shows, the picture's own (${kc} checked, ${kw} wrong; ${[...kinds].length} kinds on this coast), and the land beside it the water's (${shoreKind} of ${shoreLand})`,
    kc > 2000 && kw === 0 && kinds.size >= 2 && shoreLand > 0 && shoreKind === shoreLand, { kc, kw, kinds: [...kinds], shoreKind, shoreLand });
  /* two pieces laid apart agree on the texels they share (each piece's apron
     is its neighbour's edge): every pair side by side in the block round the
     coast that both have texels */
  let seamE = 0, seamS = 0, cmpE = 0, cmpS = 0;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const A = block.get(`${di},${dj}`), E = block.get(`${di + 1},${dj}`), S2 = block.get(`${di},${dj + 1}`);
    if (!A || !A.data) continue;
    if (E && E.data) for (let y = 0; y < A.h; y++) for (let c = 0; c < 2 * AP; c++) for (let ch = 0; ch < 4; ch++) { cmpE++; if (A.data[(y * A.w + CH + c) * 4 + ch] !== E.data[(y * E.w + c) * 4 + ch]) seamE++; }
    if (S2 && S2.data) for (let x = 0; x < A.w; x++) for (let c = 0; c < 2 * AP; c++) for (let ch = 0; ch < 4; ch++) { cmpS++; if (A.data[((CH + c) * A.w + x) * 4 + ch] !== S2.data[(c * S2.w + x) * 4 + ch]) seamS++; }
  }
  ok(`pieces laid apart meet with no seam: the shared texels east (${cmpE}) and south (${cmpS}) agree`, cmpE > 0 && cmpS > 0 && seamE === 0 && seamS === 0, { seamE, seamS, cmpE, cmpS });

  /* the river by the Mill Bridge runs, the way the river goes */
  const river = lay(pieceOf(19177, 21504)).waterField;
  const P = sw.pts, m = P.length >> 1;
  let flowing = 0, notFresh = 0, down = 0;
  for (let k = 0; k < river.w * river.h; k++) {
    const B = river.data[k * 4 + 2], A = river.data[k * 4 + 3];
    if (B === 128 && A === 128) continue;
    flowing++;
    if (river.data[k * 4 + 1] !== WF_KIND.fresh || !river.data[k * 4]) notFresh++;
    const r = pieceOf(19177, 21504), ax = r.x + (k % river.w) + 0.5, ay = r.y + ((k / river.w) | 0) + 0.5;
    let bd = Infinity, bt = null;
    for (let s = 0; s < m - 1; s++) {
      const x0 = P[2 * s], y0 = P[2 * s + 1], dx = P[2 * s + 2] - x0, dy = P[2 * s + 3] - y0, ll = dx * dx + dy * dy || 1;
      const u = Math.max(0, Math.min(1, ((ax - x0) * dx + (ay - y0) * dy) / ll));
      const e = (x0 + dx * u - ax) ** 2 + (y0 + dy * u - ay) ** 2;
      if (e < bd) { bd = e; bt = [dx / Math.sqrt(ll), dy / Math.sqrt(ll)]; }
    }
    const fxv = (B - 128) / 127, fyv = (A - 128) / 127, fl = Math.hypot(fxv, fyv) || 1;
    if ((fxv * bt[0] + fyv * bt[1]) / fl > 0.6) down++;
  }
  ok(`the Sweetwater runs by the Mill Bridge: ${flowing} texels of it flowing, all fresh water, ${down} of them down the river's own line (to its mouth)`,
    river.flowing === flowing && flowing > 1000 && notFresh === 0 && down >= flowing * 0.99, { flowing, notFresh, down });
  /* still water lies still: a fresh pool far from the river */
  const cellG = bp.scale * WPA, far2 = 1200 * 1200;
  let pool = null;
  for (let c = 0; c < bp.w * bp.h && !pool; c += 7) {
    if (bp.cls[c] !== C.water || !((mmF.fresh[c >> 3] >> (c & 7)) & 1)) continue;
    const gx = ((c % bp.w) + 0.5) * cellG, gy = (((c / bp.w) | 0) + 0.5) * cellG;
    let near = false;
    for (let s = 0; s < m && !near; s += 4) near = ((P[2 * s] - bp.x0) * WPA - gx) ** 2 + ((P[2 * s + 1] - bp.y0) * WPA - gy) ** 2 < far2;
    if (!near) pool = { gx, gy };
  }
  const still = pool ? lay(pieceOf(pool.gx, pool.gy)).waterField : null;
  ok(`a pool far from the river lies still: fresh water (${still ? still.counts.fresh : 0} texels) and none of it flowing`,
    !!still && still.counts.fresh > 20 && still.flowing === 0, pool);
  /* no water, no field; open sea with no shore in reach, four numbers */
  const town = lay(pieceOf(21504, 21504)).waterField;
  const [ccx, ccy] = art([0, 0]);
  const ang = Math.atan2(W.spokes[0].uy + W.spokes[1].uy, W.spokes[0].ux + W.spokes[1].ux);
  let open = null;
  for (let r = 4000; r < 14000 && !open; r += 64) {
    const ax = ccx + Math.cos(ang) * r, ay = ccy + Math.sin(ang) * r;
    const f = lay(pieceOf((ax - bp.x0) * WPA, (ay - bp.y0) * WPA)).waterField;
    if (f && f.uniform) open = f;
  }
  ok(`a piece with no water has no field; one of open sea, no shore in reach, is four numbers and no texels (${open ? open.uniform.join(', ') : 'none found'})`,
    town === null && !!open && open.data === null && open.uniform.join() === [WF_CAP * WF_DIST, WF_KIND.sea, 128, 128].join(), { town: !!town });
  /* what it costs the worker a piece (the quickest of five each way: the
     machine's other work only ever adds) */
  const time = (opts) => { let b = Infinity; for (let k = 0; k < 5; k++) { const t0 = performance.now(); composeGround(PLAN, bp, mmF, coast.r, wtiles, { scale: K, ...opts }); b = Math.min(b, performance.now() - t0); } return b; };
  time({}); const tPlain = time({}), tField = time({ waterField: { rivers } });
  ok(`the field costs the worker little: a coast piece ${tPlain.toFixed(1)} ms without, ${tField.toFixed(1)} ms with`, tField < tPlain * 1.35 + 4, { tPlain, tField });
  /* the shader reads the field as it is written */
  const fragSrc = readFileSync(new URL('../../src/rendering/wheelWater.js', import.meta.url), 'utf8');
  const dScale = 255 / (2 * WF_DIST);
  ok(`the game's shader decodes the field as ground.js writes it: distance x ${dScale} game px, fresh / shallows / sea by ${WF_KIND.fresh} / ${WF_KIND.shallows} / ${WF_KIND.sea}, the flow about 128`,
    fragSrc.includes(`f.r * ${dScale}`) && /1\.0 - smoothstep\(0\.42, 0\.58, f\.g\)/.test(fragSrc) && /smoothstep\(0\.76, 0\.92, f\.g\)/.test(fragSrc)
    && WF_KIND.fresh / 255 < 0.42 && WF_KIND.shallows / 255 > 0.58 && WF_KIND.shallows / 255 < 0.76 && WF_KIND.sea / 255 > 0.92
    && fragSrc.includes('(f.ba * 255.0 - 128.0) / 127.0'), { dScale });
  /* the swell reads the picture up to its cap away, which at a piece's edge
     is the apron: the worker's apron must hold it (with 1 art px, the first
     cut's, a bigger swell read past the picture's edge) */
  const workerSrc = readFileSync(new URL('../../public/tools/world/core/ground-worker.js', import.meta.url), 'utf8');
  const apron = +((/const APRON = (\d+);/.exec(workerSrc) || [])[1]);
  const cap = +((/amp = min\(min\(amp, .*\), ([0-9.]+)\);/.exec(fragSrc) || [])[1]);
  ok(`the water's swell never reads past a piece's picture: at most ${cap} game px away, and the worker lays ${apron} art px (${apron * WPA} game px) past each edge, as this test does`,
    apron === AP && cap > 0 && cap + 0.25 <= apron * WPA, { apron, cap });
}

/* v2.3.3021: the owner, "The water has a honeycomb pattern that needs to
   change to mimic water movement": the light's web ChatGPT drew into the
   water pictures comes out (ground.js CALM WATER), and the game draws its
   own, moving (wheelWater.js CAUSTICS) */
console.log("the water's frozen web of light taken out (v2.3.3021)");
{
  const { calmWater } = await import('../../public/tools/world/core/ground.js');
  const { decodePNG } = await import('./png.mjs');
  const { readFileSync } = await import('node:fs');
  /* the game's own water pictures, as the worker keeps them: a number a px
     into the picture's own colours */
  const tileOf = (name) => {
    const { width: w, height: h, data } = decodePNG(readFileSync(new URL(`../../public/world/ground/${name}.png`, import.meta.url)));
    const at = new Map(), pal = [], idx = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      const key = (data[4 * p] << 16) | (data[4 * p + 1] << 8) | data[4 * p + 2];
      let v = at.get(key);
      if (v === undefined) { v = pal.length / 3; at.set(key, v); pal.push(data[4 * p], data[4 * p + 1], data[4 * p + 2]); }
      idx[p] = v;
    }
    return { w, h, idx, pal: Uint8Array.from(pal) };
  };
  const lum = (t, p) => { const q = t.idx[p]; return 0.299 * t.pal[3 * q] + 0.587 * t.pal[3 * q + 1] + 0.114 * t.pal[3 * q + 2]; };
  const at = (t, f) => { const a = []; for (let p = 0; p < t.w * t.h; p += 3) a.push(lum(t, p)); a.sort((x, y) => x - y); return a[Math.floor(f * (a.length - 1))]; };
  const roll = (t, dx, dy) => { const o = new Uint8Array(t.idx.length); for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) o[((y + dy) % t.h) * t.w + ((x + dx) % t.w)] = t.idx[y * t.w + x]; return { ...t, idx: o }; };
  const rows = [];
  let slowest = 0;
  for (const name of ['sea-A', 'shallows-A', 'fresh-A', 'fresh-B']) {
    const t = tileOf(name);
    const t0 = performance.now();
    const c = calmWater(t);
    slowest = Math.max(slowest, performance.now() - t0);
    let changed = 0, newColours = 0;
    const kept = new Set();
    for (let p = 0; p < t.idx.length; p++) if (c.idx[p] === t.idx[p]) kept.add(t.idx[p]);
    for (let p = 0; p < t.idx.length; p++) if (c.idx[p] !== t.idx[p]) { changed++; if (!kept.has(c.idx[p])) newColours++; }
    const r1 = calmWater(roll(t, 300, 214)), r2 = roll(c, 300, 214);
    let shifted = 0;
    for (let p = 0; p < r1.idx.length; p++) if (r1.idx[p] !== r2.idx[p]) shifted++;
    rows.push({ name, web: c.calm ? c.calm.web : 0, changed: changed / t.idx.length, newColours, p50: [at(t, 0.5), at(c, 0.5)], p97: [at(t, 0.97), at(c, 0.97)], shifted, pal: c.pal === t.pal });
  }
  const pc = (v) => Math.round(v * 100) + '%';
  ok(`the web is found in each of the game's four water pictures: ${rows.map((r) => `${r.name} ${pc(r.web)}`).join(', ')} of it, with its glow`,
    rows.every((r) => r.web > 0.2 && r.web < 0.85), rows);
  ok(`and taken out: the lightest 3% of each picture ${rows.map((r) => `${Math.round(r.p97[0])} -> ${Math.round(r.p97[1])}`).join(', ')}, the middle unmoved (${rows.map((r) => `${Math.round(r.p50[0])} -> ${Math.round(r.p50[1])}`).join(', ')})`,
    rows.every((r) => r.p97[0] - r.p97[1] >= 25 && Math.abs(r.p50[0] - r.p50[1]) <= 8), rows);
  ok(`filled from the water round it in the picture's OWN colours: every px changed (${rows.map((r) => pc(r.changed)).join(', ')}) takes a colour the picture uses outside its web, and the colour list is the picture's`,
    rows.every((r) => r.newColours === 0 && r.pal && r.changed > 0.1), rows);
  ok(`a picture seamless before is seamless after: the calm of a picture shifted (300, 214) px is the calm shifted, to the last px (${rows.map((r) => r.shifted).join(', ')} px differ)`,
    rows.every((r) => r.shifted === 0), rows);
  ok(`once a picture, and quick: ${Math.round(slowest)} ms at the slowest in Node`, slowest < 600, { slowest });
  /* the worker calms only the water's pictures, only where the game draws
     its web, told so by the game */
  const workerSrc = readFileSync(new URL('../../public/tools/world/core/ground-worker.js', import.meta.url), 'utf8');
  const trialSrc = readFileSync(new URL('../../src/game/wheelTrial.js', import.meta.url), 'utf8');
  const waterSrc = readFileSync(new URL('../../src/rendering/wheelWater.js', import.meta.url), 'utf8');
  ok("only where the game draws the water moving: the worker calms a water picture when told `moving` (and not `?nowaves`), the game tells it so from WebGL2 and the address",
    /calm: wavesOn\(m && m\.search\) && !!\(m && m\.moving\)/.test(workerSrc) && /W && W\.calm && WATER_SWATCHES\.includes\(id\)/.test(workerSrc)
    && /postMessage\(\{ type: 'init', search, moving: _waterMoves \}\)/.test(trialSrc) && /setWheelWaterMoves\(wavesOn\(\) && webgl2\(\)\)/.test(waterSrc), {});
  ok("and the game draws its own web of light, moving: round cells (the nearest point's distance over the next's), on every water but a running river, `?caustics=k` its brightness",
    /float cellEdge\(vec2 p, float t\)/.test(waterSrc) && /return f1 \/ max\(f2, 1e-4\);/.test(waterSrc) && /uniform float uCaustics;/.test(waterSrc)
    && /\(1\.0 - smoothstep\(0\.02, 0\.10, sp\)\)/.test(waterSrc) && /caustics=\(\[0-9\.\]\+\)/.test(waterSrc), {});
}

/* ── v2.3.3032: the Wheel's buildings have doors ──
   Owner, 2026-10-04: "Push to main. Then after that add doors." */
console.log("the buildings' doors (v2.3.3032)");
{
  const { placeObjects, doorSpots, objectFootprints } = await import('../../public/tools/world/core/placing.js');
  const { WHEEL_BUILDING_DOORS, WHEEL_SHUT_DOORS, WHEEL_DOOR_REACH, WHEEL_TOWNSFOLK, WHEEL_HALL_DOORS, WHEEL_HALLS } = await import('../../src/data/wheelBuildingDoors.js');
  const { TOWN_BUILDINGS } = await import('../../src/data/buildings.js');
  const fs = await import('node:fs');
  const WPA = PLAN.worldPxPerArtPx;
  const dbp = buildBlueprint(PLAN);
  const placed = placeObjects(PLAN, dbp);
  const man = JSON.parse(fs.readFileSync(new URL('../../public/world/objects/manifest.json', import.meta.url), 'utf8'));
  const foot = objectFootprints(placed, man);
  placed.present = foot.present;
  const doors = doorSpots(PLAN, dbp, placed);
  const lots = dbp.lots.filter((l) => l.town && l.foot);
  const byDoor = Object.fromEntries(doors.map((d) => [d.id, d]));
  ok(`every standing building has a door, ${doors.length} of ${lots.length}, at the foot of its steps exactly as the building is placed`,
    lots.length === 17 && doors.length === 17 && lots.every((l) => {
      const d = byDoor[l.id];
      return d && d.name === l.name
        && Math.abs(d.x - Math.round((l.foot.x - dbp.x0) * WPA * 2) / 2) < 1e-6 && Math.abs(d.y - Math.round((l.foot.y - dbp.y0) * WPA * 2) / 2) < 1e-6;
    }), doors.map((d) => d.id));
  const noBank = objectFootprints(placed, { ...man, objects: man.objects.filter((o) => o.id !== 'bank') });
  const doorsNoBank = doorSpots(PLAN, dbp, { ...placed, present: noBank.present });
  ok('...and a building with no picture has no door (nothing is drawn to walk up to)',
    doorsNoBank.length === 16 && !doorsNoBank.some((d) => d.id === 'bank'), doorsNoBank.length);
  const lotIds = new Set(lots.map((l) => l.id));
  const todayOf = Object.fromEntries(lots.map((l) => [l.id, l.today]));
  const tbIds = TOWN_BUILDINGS.map((b) => b.id);
  const openIds = Object.keys(WHEEL_BUILDING_DOORS), closedIds = WHEEL_SHUT_DOORS.slice(), hallIds = Object.keys(WHEEL_HALL_DOORS);
  ok('what opens at each door is the plan\'s own: every plot of the table is a plot of the town, and its value is what the plan says the plot is `today`, a building of today\'s town',
    openIds.length === 12 && openIds.every((k) => lotIds.has(k) && WHEEL_BUILDING_DOORS[k] === todayOf[k] && tbIds.includes(WHEEL_BUILDING_DOORS[k])),
    openIds.filter((k) => !(lotIds.has(k) && WHEEL_BUILDING_DOORS[k] === todayOf[k] && tbIds.includes(WHEEL_BUILDING_DOORS[k]))));
  /* v2.3.3066: three of the four "(new: ...)" plots open halls of the
     Wheel's own (the Guild Hall, the Post Office, the Sheriff's Office), the
     Hotel stays shut */
  const actions = TOWN_BUILDINGS.map((b) => b.action || b.id).concat(['farmhome']);
  ok('...all twelve of today\'s buildings have a door (none twice), and the other five plots are accounted for: the Town Hall (Mayor Bro), three halls of the Wheel\'s own and one shut that says so',
    new Set(Object.values(WHEEL_BUILDING_DOORS)).size === 12 && tbIds.every((id) => Object.values(WHEEL_BUILDING_DOORS).includes(id))
    && hallIds.length === 3 && closedIds.length === 1
    && hallIds.concat(closedIds).every((k) => lotIds.has(k) && !openIds.includes(k) && /^\(new:/.test(todayOf[k]))
    && !hallIds.some((k) => closedIds.includes(k))
    && lots.filter((l) => !openIds.includes(l.id) && !closedIds.includes(l.id) && !hallIds.includes(l.id)).map((l) => l.id).join() === 'townhall',
    { halls: hallIds, closed: closedIds, rest: lots.filter((l) => !openIds.includes(l.id) && !closedIds.includes(l.id) && !hallIds.includes(l.id)).map((l) => l.id) });
  ok('...each hall has its window\'s name and picture, and opens a panel of its own, never one of today\'s buildings\' (no `buildingPanel` value twice)',
    hallIds.every((k) => { const h = WHEEL_HALLS[WHEEL_HALL_DOORS[k]]; return h && h.title && h.sub && /^\/icons\/ui\/.+\.webp$/.test(h.icon); })
    && new Set(Object.values(WHEEL_HALL_DOORS)).size === 3 && Object.values(WHEEL_HALL_DOORS).every((v) => !actions.includes(v)), { halls: WHEEL_HALL_DOORS, actions });
  {
    const PO = await import('../../src/game/postOffice.js');
    const S = {};
    for (let i = 0; i < PO.MAIL_KEEP + 5; i++) PO.recordMail(S, { kind: 'gold', source: 'market', note: `sale ${i}`, payload: { amount: i } }, 1000 + i);
    const daily = PO.mailLine({ kind: 'item', source: 'daily', payload: { invKey: 'chest_daily' } });
    ok('the Post Office keeps a visit\'s mail: each delivery a line (gold, an item by its words, the daily chest), the newest first, MAIL_KEEP at most',
      S._mail.length === PO.MAIL_KEEP && PO.mailList(S)[0].note === `sale ${PO.MAIL_KEEP + 4}` && PO.mailList(S)[0].what === `+${PO.MAIL_KEEP + 4} gold`
        && PO.mailLine({ kind: 'item', payload: { invKey: 'ore_black_steel_ore', count: 3 } }).what === '3× Black steel ore'
        && PO.itemWords('log_pine') === 'Pine log' && PO.itemWords('fish_minnow') === 'Minnow'
        && daily.what === 'A daily chest' && daily.note === 'Daily reward'
        && PO.mailLine({ kind: 'weapon', payload: { weapon: { name: 'Greatsword' } } }).what === 'Greatsword'
        && PO.mailAge(0, 30000) === 'just now' && PO.mailAge(0, 5 * 60000) === '5 min ago' && PO.mailAge(0, 2 * 3600000) === '2 h ago', S._mail.slice(-2));
    const evSrc = fs.readFileSync(new URL('../../src/networking/gameEvents.js', import.meta.url), 'utf8');
    ok('...from every inbox_delivered entry, before the daily reward\'s quiet branch', evSrc.indexOf('recordMail(S, _e)') > 0
      && evSrc.indexOf('recordMail(S, _e)') < evSrc.indexOf("if (_e.source === 'daily')"), {});
  }
  /* the doors are far enough apart that the nearest simply wins */
  let minGap = Infinity;
  for (const a of doors) for (const b of doors) if (a !== b) minGap = Math.min(minGap, Math.hypot(a.x - b.x, a.y - b.y));
  ok(`the doors are ${Math.round(minGap)} px apart at the closest, more than two reaches (${WHEEL_DOOR_REACH} px), so the nearest never has a rival`, minGap > 2 * WHEEL_DOOR_REACH, minGap);
  /* you can stand at every door: the ground below its steps, where the boots
     go, is on the town's ground and in no footprint */
  const boxes = [];
  for (let i = 0; i < placed.n; i++) for (let b = foot.boxOf[i]; b < foot.boxOf[i + 1]; b++) boxes.push([foot.boxes[b * 4], foot.boxes[b * 4 + 1], foot.boxes[b * 4 + 2], foot.boxes[b * 4 + 3], placed.kinds[placed.kind[i]]]);
  const hit = (x, y, m = 0) => boxes.filter((q) => x > q[0] - m && x < q[2] + m && y > q[1] - m && y < q[3] + m).map((q) => q[4]);
  const cellG = (x, y) => Math.floor(y / WPA / dbp.scale) * dbp.w + Math.floor(x / WPA / dbp.scale);
  const blocked = doors.filter((d) => hit(d.x, d.y + 30, 10).length > 0 || dbp.regionIds[dbp.reg[cellG(d.x, d.y + 30)]] !== 'town');
  ok('every door can be stood at: the boots 30 px below the steps (and a body\'s half width round them) are in no footprint, on the town\'s ground',
    blocked.length === 0, blocked.map((d) => [d.id, hit(d.x, d.y + 30, 10)]));
  /* Diego keeps the General Store (v2.3.3067: and the rest of town's cast) */
  const sp = WHEEL_TOWNSFOLK.map((f) => ({ f, d: byDoor[f.door] })).map(({ f, d }) => ({ name: f.name, x: d.x + f.dx, y: d.y + f.dy, d }));
  ok('each of the townsfolk has a door to stand by, in no footprint with room round them, on the town\'s ground: Diego, Ace, Blacksmith Bro and Lil Bro',
    sp.map((q) => q.name).join() === 'Diego,Ace,Blacksmith Bro,Lil Bro' && sp.every((q) => q.d && hit(q.x, q.y, 24).length === 0 && dbp.regionIds[dbp.reg[cellG(q.x, q.y)]] === 'town'),
    sp.map((q) => [q.name, hit(q.x, q.y, 24)]));
  /* ...and standing at the General Store's door does not open his window by
     itself: it opens within 90 px of him from your middle, ~52 px above your boots */
  const dg = sp.find((q) => q.name === 'Diego');
  const atDoor = Math.hypot(dg.d.x - dg.x, (dg.d.y - 52) - dg.y);
  ok(`...far enough off that standing at the door is ${Math.round(atDoor)} px from him, past the 90 px his window opens at, and near enough that he stays the store's (${Math.round(Math.hypot(dg.d.x - dg.x, dg.d.y - dg.y))} px)`,
    atDoor > 100 && Math.hypot(dg.d.x - dg.x, dg.d.y - dg.y) < 160, atDoor);
  /* ═══ v2.3.3067: THE REST OF TOWN'S CAST ═══
     Ace's coin flip opens only on a tap on him, so while he stood in today's
     town it could not be played.  Each is a real NPC_DATA row (the spawn
     copies it by name), stands by the building that is his, and is far
     enough from the others that a tap finds the one meant. */
  {
    const { NPC_DATA } = await import('../../src/data/gameDisplay.js');
    const { mayorSpot } = await import('../../public/tools/world/core/placing.js');
    const row = (n) => NPC_DATA.find((r) => r.name === n);
    const at = Object.fromEntries(sp.map((q) => [q.name, q]));
    const ownDoor = (q, id) => q && q.d && q.d.id === id && Math.hypot(q.d.x - q.x, q.d.y - q.y) < 160 && Math.hypot(q.d.x - q.x, (q.d.y - 52) - q.y) > 100;
    ok('Ace stands by the Gambling Den and his row opens the coin flip; Blacksmith Bro by the forge; every name is an NPC_DATA row',
      sp.every((q) => row(q.name)) && !!row('Ace').flip && ownDoor(at.Ace, 'gambling') && ownDoor(at['Blacksmith Bro'], 'blacksmith'),
      sp.map((q) => [q.name, q.d && q.d.id, !!row(q.name)]));
    const ms2 = mayorSpot(PLAN, dbp), lb = at['Lil Bro'], hallDoor = byDoor.townhall;
    const arrive = { x: hallDoor.x, y: hallDoor.y + 108 };
    const toArrive = Math.hypot(lb.x - arrive.x, lb.y - arrive.y), toMayor = Math.hypot(lb.x - ms2.x, lb.y - ms2.y);
    const toDoors = Math.min.apply(null, doors.map((d) => Math.hypot(d.x - lb.x, d.y - lb.y)));
    ok(`Lil Bro is on the square, met on arrival (${Math.round(toArrive)} px from where you land), on the side away from Mayor Bro (${Math.round(toMayor)} px), beyond every door's reach (${Math.round(toDoors)} px from the nearest)`,
      toArrive > 200 && toArrive < 320 && lb.x < arrive.x && ms2.x > arrive.x && toMayor > 300 && toDoors > 2 * WHEEL_DOOR_REACH, { toArrive, toMayor, toDoors });
    let closest = Infinity;
    for (const a of sp) for (const b of sp) if (a !== b) closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y));
    ok(`no two of them within reach of one tap (${Math.round(closest)} px apart at the closest)`, closest > 300, closest);
    const spriteSrc = fs.readFileSync(new URL('../../src/rendering/npcSprites.js', import.meta.url), 'utf8');
    ok('...and the Wheel loads each one\'s picture behind its loading screen, read off the same table (npcSprites.js _wheelCast)',
      /WHEEL_TOWNSFOLK\.map\(\(f\) => f\.name\)/.test(spriteSrc) && /export function wheelNpcSources\(\) \{\s*return _wheelCast\(\)/.test(spriteSrc)
        && /export function wheelWalkSources\(\) \{\s*return _wheelCast\(\)/.test(spriteSrc), {});
  }
  /* the worker ships them, the game reads them, the scan uses them */
  const readSrc = (u) => fs.readFileSync(new URL(u, import.meta.url), 'utf8');
  const workerSrc2 = readSrc('../../public/tools/world/core/ground-worker.js');
  const doorsSrc = readSrc('../../src/game/wheelTownDoors.js');
  const townSrc = readSrc('../../src/ui/BroTown.jsx');
  const sysSrc = readSrc('../../src/data/gameSystems.js');
  const trialSrc2 = readSrc('../../src/game/worldTrial.js');
  const zoneSrc = readSrc('../../src/game/zoneTransitions.js');
  ok('the worker ships `objects.doors` after the pictures are known, the game reads them from the worker\'s answer, and BroTown\'s scan sets S.nearBuilding from the nearest',
    /objects\.doors = doorSpots\(PLAN, full, objects\)/.test(workerSrc2) && workerSrc2.indexOf('objects.present = foot.present') < workerSrc2.indexOf('objects.doors = doorSpots')
    && /info && info\.doors/.test(doorsSrc) && /wheelTownDoorAt\(S\)/.test(townSrc) && /S\.nearBuilding = _wtd\.index/.test(townSrc), {});
  ok('...the quests that need a door count the Wheel\'s while it is the world (worldTrial.js sets them with the zones it closes), and the farm\'s gate leads back out to the Wheel',
    /setWheelDoorsOpen\(mode === 'wheel' && wheelObjectsOn\(\)\)/.test(trialSrc2) && /_wheelDoorActions/.test(sysSrc)
    && /_farmOut = \(_leftZone === 'farm_home' && S\._farmBack && wheelIsHome\(\)\)/.test(zoneSrc) && /rememberFarmTrip\(S2\)/.test(townSrc), {});
}

/* ── v2.3.3062: the gate signposts (src/data/wheelSignposts.js) ──
   The owner's "Continue building recommended": Brotown's four signposts (their
   boards blank) say the lands their roads lead to.  The table against the
   plan's own roads, and the signposts it reads against what placing puts in
   the town. */
console.log('the gate signposts (v2.3.3062)');
{
  const { placeObjects } = await import('../../public/tools/world/core/placing.js');
  const { wheelMap } = await import('../../public/tools/world/core/wheelmap.js');
  const SG = await import('../../src/data/wheelSignposts.js');
  const sbp = buildBlueprint(PLAN);
  const placed = placeObjects(PLAN, sbp);
  const map = wheelMap(PLAN, sbp);
  const T = map.hub.town;
  const k = placed.kinds.indexOf('signpost');
  const posts = [];
  for (let i = 0; i < placed.n; i++) {
    if (placed.kind[i] !== k) continue;
    const dx = placed.x[i] - T.x, dy = placed.y[i] - T.y;
    posts.push({ d: Math.round(Math.hypot(dx, dy)), gate: SG.gateOf(dx, dy) });
  }
  const town = posts.filter((p) => p.d <= SG.SIGNPOST_TOWN_R);
  ok(`the town has four signposts, one at each gate (${town.map((p) => `${p.gate} ${p.d} px`).join(', ')}), and no other stands near SIGNPOST_TOWN_R`,
    town.length === 4 && new Set(town.map((p) => p.gate)).size === 4 && posts.every((p) => p.d <= SG.SIGNPOST_TOWN_R - 300 || p.d > SG.SIGNPOST_TOWN_R + 300), posts);
  const byLand = Object.fromEntries(map.lands.map((l) => [l.id, l]));
  const cardinal = (l) => !!l && (l.ux === 0 || l.uy === 0);
  const all = Object.values(SG.WHEEL_GATE_ROADS).flat();
  ok('every land is named once, its own compass road\'s land first on that gate\'s signpost',
    all.length === 8 && new Set(all).size === 8 && all.every((l) => !!byLand[l])
      && Object.entries(SG.WHEEL_GATE_ROADS).every(([g, [c, d]]) => cardinal(byLand[c]) && SG.gateOf(byLand[c].ux, byLand[c].uy) === g && !cardinal(byLand[d])), SG.WHEEL_GATE_ROADS);
  /* the second: the land whose road begins ON that compass road (plan.js: the
     diagonal roads fork off the next compass road clockwise) */
  const roads = (PLAN.roads || []).filter((r) => r.to);
  const forkOn = (d) => {
    const r = roads.find((x) => x.to === d);
    if (!r) return null;
    const [fx, fy] = r.pts[0];
    return map.lands.filter(cardinal).find((c) => Math.abs(fx * c.uy - fy * c.ux) < 1e-6 && fx * c.ux + fy * c.uy > 0) || null;
  };
  const forks = Object.values(SG.WHEEL_GATE_ROADS).map(([c, d]) => `${d} off ${(forkOn(d) || {}).id}`);
  ok(`...and the second, the land whose road forks off it (${forks.join(', ')})`,
    Object.values(SG.WHEEL_GATE_ROADS).every(([c, d]) => { const f = forkOn(d); return !!f && f.id === c; }), forks);
  ok('the gates are told apart by the larger offset from the town\'s middle',
    SG.gateOf(0, -10) === 'north' && SG.gateOf(10, 2) === 'east' && SG.gateOf(-3, 9) === 'south' && SG.gateOf(-9, 3) === 'west');
}

/* ── v2.3.3064: the lands' music (src/game/wheelMusic.js) ──
   The owner's "Continue building recommended": each land of the Wheel its own
   music as you cross into it, the town's on the safe ground, with a lean toward
   the land so a fight on the line does not flip it. */
console.log('the lands\' music (v2.3.3064)');
{
  const fs = await import('node:fs');
  const M = await import('../../src/game/wheelMusic.js');
  const { WHEEL_LANDS, WHEEL_LAND_LOOK } = await import('../../src/data/wheelLands.js');
  ok('the safe ground plays the town\'s, a land is its own id, the sea and anything unknown nothing',
    M.wheelMusicKey('town') === 'town' && M.wheelMusicKey('commons') === 'town' && WHEEL_LANDS.every((l) => M.wheelMusicKey(l) === l)
      && Object.keys(WHEEL_LAND_LOOK).every((k) => !!M.wheelMusicKey(k))
      && M.wheelMusicKey('sea') === null && M.wheelMusicKey(null) === null && M.wheelMusicKey('__proto__') === null && M.wheelMusicKey('toString') === null);
  const fakeAudio = (cur) => ({ wheelLandMusic: true, _currentZoneAmbient: cur, calls: [],
    startZoneAmbient(k) { this.calls.push(k); this._currentZoneAmbient = k; } });
  const S = { currentZone: 'wheel' };
  const at = (region, fresh = true) => ({ region, fresh });
  const step = (A, region, t, fresh) => M.noteWheelMusic(at(region, fresh), S, A, t);
  M.resetWheelMusic();
  const A = fakeAudio('town');
  ok('arriving, an answer for another cell decides nothing (the worker lingers after you leave: its last answer can be where you died)',
    step(A, 'frost', 1000, false) === null && A.calls.length === 0);
  ok('...the first answer for where you stand decides at once', step(A, 'frost', 1010) === 'frost' && A.calls.join() === 'frost');
  step(A, 'commons', 2000);
  ok('a step back onto the commons keeps the land\'s music for MUSIC_HOME_MS', step(A, 'commons', 2000 + M.MUSIC_HOME_MS - 1) === null && A._currentZoneAmbient === 'frost');
  step(A, 'frost', 7000);
  step(A, 'commons', 8000);
  ok('...a step back into the land starts that count again', step(A, 'commons', 8000 + M.MUSIC_HOME_MS - 1) === null);
  ok('...and MUSIC_HOME_MS on the safe ground brings the town\'s back', step(A, 'commons', 8000 + M.MUSIC_HOME_MS) === 'town');
  const t1 = 50000;
  step(A, 'ember', t1);
  ok('into a land: its music after MUSIC_INTO_LAND_MS, not before', step(A, 'ember', t1 + M.MUSIC_INTO_LAND_MS - 1) === null
    && step(A, 'ember', t1 + M.MUSIC_INTO_LAND_MS) === 'ember' && M.MUSIC_INTO_LAND_MS < M.MUSIC_HOME_MS);
  ok('...a visit once settled goes on an answer a cell behind (as you walk)', step(A, 'sky', t1 + 5000, false) === null
    && step(A, 'sky', t1 + 5000 + M.MUSIC_INTO_LAND_MS, false) === 'sky');
  ok('the sea keeps what plays', step(A, 'sea', t1 + 90000) === null && A._currentZoneAmbient === 'sky');
  A._currentZoneAmbient = 'town';
  ok('anything else changing the music while you stand in a land is put right on the next frame', step(A, 'sky', t1 + 100000) === 'sky');
  ok('outside the Wheel nothing, and the next arrival decides at once',
    M.noteWheelMusic(at('frost'), { currentZone: 'town' }, A, t1 + 100001) === null && step(A, 'frost', t1 + 100002) === 'frost');
  M.resetWheelMusic();
  const off = fakeAudio('wheel');
  off.wheelLandMusic = false;
  ok('`?nolandmusic` (BT_AUDIO.wheelLandMusic false): it does nothing', step(off, 'frost', 1) === null && off.calls.length === 0);
  M.resetWheelMusic();
  const gd = fs.readFileSync(new URL('../../src/data/gameDisplay.js', import.meta.url), 'utf8');
  const music = (k) => (new RegExp(`\\n    ${k}: '/audio/music/([a-z-]+\\.mp3)`).exec(gd) || [])[1] || null;
  ok(`the four lands the owner made music for play it -- frost ${music('frost')}, ember ${music('ember')}, sky ${music('sky')}, verdant ${music('verdant')} (the meadow's ${music('meadow')}) -- and Brotown ${music('town')}`,
    music('frost') === 'frost.mp3' && music('ember') === 'fire.mp3' && music('sky') === 'desert.mp3' && music('verdant') === 'forest.mp3'
      && music('verdant') === music('meadow') && music('town') === 'village.mp3');
  ok('...the other four have no track of their own yet, so the game\'s theme plays there',
    ['hollows', 'thunder', 'tidal', 'mist'].every((k) => music(k) === null));
  ok('the Wheel itself asks for nothing while the lands choose, the address can turn it off, and a zone\'s ambience is let go when you leave it',
    /if \(zoneId === 'wheel' && this\.wheelLandMusic\) return;/.test(gd) && /wheelLandMusic: !\(typeof location/.test(gd) && /nolandmusic/.test(gd)
      && /delete this\._samples\[_prevAmb\]/.test(gd));
  const mini = fs.readFileSync(new URL('../../src/rendering/systems/wheelMinimap.js', import.meta.url), 'utf8');
  const trial = fs.readFileSync(new URL('../../src/game/wheelTrial.js', import.meta.url), 'utf8');
  ok('the minimap\'s frame asks, with where you are, beside the banner; wheelHere says whether its answer is for the cell you are in',
    /noteWheelMusic\(here, S, BT_AUDIO\)/.test(mini) && /fresh: _here\.x === cx && _here\.y === cy/.test(trial));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
