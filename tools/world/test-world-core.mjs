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
import { PIXEL } from '../../public/tools/style/bible.js';
import { gridInfo, cellName, parseCell, cellRect, cellAt, allCells, neighbours } from '../../public/tools/world/core/grid.js';
import { buildBlueprint, renderSketch, colorTable, planKey, C, CLASS_IDS } from '../../public/tools/world/core/layout.js';
import { spokePoint, arcPoint } from '../../public/tools/world/core/wheel.js';
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
  ok('one art px is one pixel of the HD pixel art (1.5 game px, style/bible.js)', PLAN.worldPxPerArtPx === PIXEL.gamePxPerArtPx && PIXEL.gamePxPerArtPx === 1.5);
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
