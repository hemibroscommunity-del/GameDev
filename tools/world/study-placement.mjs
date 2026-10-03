#!/usr/bin/env node
/* ═══ v2.3.2999: HOW THE WHEEL'S OBJECTS ARE SPREAD -- MEASURED ═══
 *
 *   node tools/world/study-placement.mjs [--placing 2] [--out dir] [--no-maps]
 *
 * Owner, 2026-10-03: "work throughout the night on studying object
 * placement in the game's maps and what a good distribution is".  This is
 * the measuring half of that study (docs/OBJECT-PLACEMENT-STUDY.md is the
 * other): every object public/tools/world/core/placing.js puts on the
 * Wheel, read the way a player meets them --
 *
 *   SIZE       tall (170+ game px: trees, pylons, hoodoos, spires), medium
 *              (70-170: rocks, cacti, toadstools), low (under 70: flowers,
 *              shells, small stones) -- what the eye sorts them by, not
 *              which of placing.js's layers made them
 *   DENSITY    per phone screen at today's view (VIEW_OUT 0.8: 619 x 1280
 *              game px on the QA phone), per land and stage
 *   SPACING    each tall thing's nearest tall neighbour; the Clark-Evans
 *              ratio R (mean nearest distance over what a random scatter
 *              of that density would give: under 1 clumped, 1 random, over
 *              1 even); trunks closer than 48 px
 *   GROVES     tall things within 300 px of a tall thing, against a random
 *              scatter's count -- how much the woods are woods
 *   COVER      the share of a land's open ground under a picture, and under
 *              two or more (the canopy, and where pictures pile up)
 *   SCREENS    400 phone screens dropped on each land's open ground: things
 *              in view, kinds in view, the share that are bare (under 3
 *              things) or busy (60 or more)
 *   ROADS      things per area by distance from a road: framing, or crowding
 *   CAMPS      things within 400 px of where the land's monsters stand,
 *              against the land as a whole: is the fight cluttered?
 *   SAMENESS   tall things whose nearest twin (same kind) is within 250 px
 *              AND the same picture, the same way round
 *   WALKING    the ground the player's feet (20 x 20, BroTown hs 10) can
 *              reach from the arrival, with and without the objects: any
 *              ground the objects alone shut off is a POCKET (a trap, or a
 *              place you can see and never stand); gaps between two
 *              footprints under 20 px (a slit that looks open and is not)
 *              and 20-36 px (open, but the feet catch)
 *
 * Writes a summary to stdout, the numbers to <out>/placement-study.json and,
 * unless --no-maps, two pictures: <out>/placement-density.png (the Wheel,
 * one pixel per 64 game px: each land's colour, darker where its things are
 * thicker, pockets red, monster camps yellow) and
 * <out>/placement-pockets.png (the worst pockets close up).
 * Node only, no dependencies.  Deterministic: the same plan gives the same
 * numbers, so a change to the placing rules can be measured against this.
 */
import fs from 'fs';
import path from 'path';
import { PLAN } from '../../public/tools/world/plan.js';
import { buildBlueprint, C } from '../../public/tools/world/core/layout.js';
import { materialMap, walkBits } from '../../public/tools/world/core/ground.js';
import { placeObjects, footprintOf, PLACING, campBands } from '../../public/tools/world/core/placing.js';
import { objectCatalog } from '../../public/tools/objects/catalog.js';
import { encodePNG } from './png.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', path.join(ROOT, 'tools/qa/out'));
const MAPS = !process.argv.includes('--no-maps');
/* `--placing 2`: placing v2, the `?placing=2` preview (placing.js PLACING v2) */
const PV = Number(arg('--placing', '1')) === 2 ? 2 : 1;
const TAG = PV === 2 ? '-v2' : '';
fs.mkdirSync(OUT, { recursive: true });

/* the phone's view since v2.3.2997 (mp-zoomout: 619 x 1280 on the QA phone) */
const SCREEN = { w: 619, h: 1280 };
const TALL = 170, MEDIUM = 70;
const FEET = 10;                       /* BroTown's hs: the feet box is 2 x 10 px */

const t0 = Date.now();
const bp = buildBlueprint(PLAN);
const mm = materialMap(PLAN, bp);
const O = placeObjects(PLAN, bp, PV === 2 ? { v: 2 } : {});
const WPA = PLAN.worldPxPerArtPx, CELL = bp.scale * WPA;
const BW = bp.w, BH = bp.h, WW = BW * CELL, WH = BH * CELL;
const cat = objectCatalog();
const byId = Object.create(null);
for (const e of cat) byId[e.id] = e;
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/world/objects/manifest.json'), 'utf8'));
const pieces = Object.create(null);
for (const o of man.objects) pieces[o.id] = o.pieces;
const bk = (PLAN.town && PLAN.town.buildingScale) || 1;
const { WHEEL_SPAWNS } = await import(path.join(ROOT, 'server/src/wheelspawns.js'));

/* ── every object: what, where, how big, its footprint ── */
const cellOf = (x, y) => {
  const i = Math.floor(x / CELL), j = Math.floor(y / CELL);
  return i >= 0 && j >= 0 && i < BW && j < BH ? j * BW + i : -1;
};
const objs = [];
for (let i = 0; i < O.n; i++) {
  const id = O.kinds[O.kind[i]], e = byId[id];
  const p = pieces[id] && pieces[id][O.piece[i]];
  let w = p ? p.gameW : e ? (e.fit === 'w' ? e.size : e.size * (e.ar || 1)) : 60;
  let h = p ? p.gameH : e ? (e.fit === 'w' ? e.size / (e.ar || 1) : e.size) : 60;
  const kind = e ? e.kind : 'prop';
  if (kind === 'building') { w *= bk; h *= bk; }
  const c = cellOf(O.x[i], O.y[i]);
  objs.push({
    id, kind, x: O.x[i], y: O.y[i], w, h, piece: O.piece[i], flip: O.flip[i],
    size: kind === 'building' ? 'building' : h >= TALL ? 'tall' : h >= MEDIUM ? 'medium' : 'low',
    reg: c >= 0 ? bp.regionIds[bp.reg[c]] : null, band: c >= 0 ? bp.band[c] : -1,
    feet: footprintOf(id, kind, O.x[i], O.y[i], w, h),
  });
}

/* ── the lands: their open ground (where nature may stand) ── */
const lands = Object.create(null);
const landOf = (id) => (lands[id] || (lands[id] = { id, openCells: 0, cells: [], stages: [0, 0, 0, 0, 0] }));
for (let c = 0; c < BW * BH; c++) {
  const cls = bp.cls[c];
  if (cls !== C.ground && cls !== C.obstacle) continue;
  const r = bp.regionIds[bp.reg[c]];
  if (!r || r === 'sea' || r === 'ocean') continue;
  const L = landOf(r);
  L.openCells++;
  L.cells.push(c);
  const b = bp.band[c];
  if (b >= 0 && b < 5) L.stages[b]++;
}
const landIds = Object.keys(lands).filter((k) => lands[k].openCells > 2000).sort();

/* ── a spatial hash of the objects, 256 px buckets ── */
const B = 256, GB = Math.ceil(WW / B);
const buckets = new Map();
objs.forEach((o, k) => {
  const key = Math.floor(o.y / B) * GB + Math.floor(o.x / B);
  let a = buckets.get(key);
  if (!a) buckets.set(key, (a = []));
  a.push(k);
});
const near = (x, y, r, fn) => {
  const i0 = Math.floor((x - r) / B), i1 = Math.floor((x + r) / B), j0 = Math.floor((y - r) / B), j1 = Math.floor((y + r) / B);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const a = buckets.get(j * GB + i);
    if (a) for (const k of a) fn(k);
  }
};
const nearest = (o, k0, pred, r = 2400) => {
  let best = Infinity, bk2 = -1;
  near(o.x, o.y, r, (k) => {
    if (k === k0) return;
    const q = objs[k];
    if (!pred(q)) return;
    const d = Math.hypot(q.x - o.x, q.y - o.y);
    if (d < best) { best = d; bk2 = k; }
  });
  return { d: best, k: bk2 };
};
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : null);
const r1 = (v) => (v == null || !isFinite(v) ? null : Math.round(v * 10) / 10);
const r2 = (v) => (v == null || !isFinite(v) ? null : Math.round(v * 100) / 100);

/* ── a coarse raster over the Wheel (16 px): pictures and footprints ── */
const R = 16, RW = Math.ceil(WW / R), RH = Math.ceil(WH / R);
const cover = new Uint8Array(RW * RH);
for (const o of objs) {
  if (o.kind === 'building') continue;
  const x0 = Math.max(0, Math.floor((o.x - o.w / 2) / R)), x1 = Math.min(RW - 1, Math.floor((o.x + o.w / 2) / R));
  const y0 = Math.max(0, Math.floor((o.y - o.h) / R)), y1 = Math.min(RH - 1, Math.floor(o.y / R));
  /* a picture is not its box: about 60% of a tree's box is crown and trunk,
     the rest see-through; 0.6 of the box's rows, from the top, is a fair
     stand-in for a crown, and the whole width of the trunk's rows below */
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (cover[y * RW + x] < 255) cover[y * RW + x]++;
}

/* ── per land ── */
const report = { placing: O.version || PLACING, plan: PLAN.id || null, buildingScale: bk, screen: SCREEN, objects: objs.length, lands: {} };
for (const lid of landIds) {
  const L = lands[lid];
  const area = L.openCells * CELL * CELL;
  const screens = area / (SCREEN.w * SCREEN.h);
  const mine = objs.map((o, k) => k).filter((k) => objs[k].reg === lid);
  const by = { tall: [], medium: [], low: [], building: [] };
  for (const k of mine) (by[objs[k].size] || (by[objs[k].size] = [])).push(k);
  const kinds = Object.create(null);
  for (const k of mine) kinds[objs[k].id] = (kinds[objs[k].id] || 0) + 1;

  /* spacing of the tall things */
  const tall = by.tall;
  const nn = tall.map((k) => nearest(objs[k], k, (q) => q.size === 'tall' && q.reg === lid).d).filter(isFinite).sort((a, b) => a - b);
  const meanNN = nn.length ? nn.reduce((a, b) => a + b, 0) / nn.length : null;
  const dens = tall.length / area;
  const ce = meanNN && dens > 0 ? meanNN / (0.5 / Math.sqrt(dens)) : null;
  const allNature = mine.filter((k) => objs[k].kind === 'nature');
  const nnAll = allNature.map((k) => nearest(objs[k], k, (q) => q.kind === 'nature' && q.reg === lid, 1200).d).filter(isFinite);
  const meanAll = nnAll.length ? nnAll.reduce((a, b) => a + b, 0) / nnAll.length : null;
  const densAll = allNature.length / area;
  const ceAll = meanAll && densAll > 0 ? meanAll / (0.5 / Math.sqrt(densAll)) : null;
  /* groves: tall things within 300 px of each, against a random scatter */
  let grove = 0;
  for (const k of tall) near(objs[k].x, objs[k].y, 300, (q) => { if (q !== k && objs[q].size === 'tall' && Math.hypot(objs[q].x - objs[k].x, objs[q].y - objs[k].y) < 300) grove++; });
  const groveMean = tall.length ? grove / tall.length : 0;
  const groveRandom = dens * Math.PI * 300 * 300;

  /* cover: the land's open cells, on the 16 px raster */
  let under = 0, under2 = 0, n16 = 0;
  for (const c of L.cells) {
    const cx = (c % BW) * CELL, cy = Math.floor(c / BW) * CELL;
    for (let v = 0; v < CELL; v += R) for (let u = 0; u < CELL; u += R) {
      const q = cover[Math.floor((cy + v) / R) * RW + Math.floor((cx + u) / R)];
      n16++;
      if (q >= 1) under++;
      if (q >= 2) under2++;
    }
  }

  /* screens: 400 dropped on the land's open ground (deterministic) */
  const samples = [];
  let seed = 12345 + lid.length * 7919;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let s = 0; s < 400 && L.cells.length; s++) {
    const c = L.cells[Math.floor(rnd() * L.cells.length)];
    const cx = (c % BW + 0.5) * CELL, cy = (Math.floor(c / BW) + 0.5) * CELL;
    const x0 = cx - SCREEN.w / 2, x1 = cx + SCREEN.w / 2, y0 = cy - SCREEN.h / 2, y1 = cy + SCREEN.h / 2;
    let n = 0, nt = 0;
    const ks = new Set();
    near(cx, cy + 200, Math.max(SCREEN.w, SCREEN.h) / 2 + 400, (k) => {
      const o = objs[k];
      if (o.x + o.w / 2 < x0 || o.x - o.w / 2 > x1 || o.y < y0 || o.y - o.h > y1) return;
      n++; ks.add(o.id); if (o.size === 'tall') nt++;
    });
    samples.push({ n, nt, kinds: ks.size });
  }
  const sn = samples.map((s) => s.n).sort((a, b) => a - b), sk = samples.map((s) => s.kinds).sort((a, b) => a - b), st = samples.map((s) => s.nt).sort((a, b) => a - b);

  /* roads: things per screen-area by distance (cells) from a road */
  report.lands[lid] = {
    openScreens: r1(screens), stages: L.stages,
    count: { all: mine.length, tall: by.tall.length, medium: by.medium.length, low: by.low.length, building: (by.building || []).length },
    perScreen: { all: r1(mine.length / screens), tall: r1(by.tall.length / screens), medium: r1(by.medium.length / screens), low: r1(by.low.length / screens) },
    kinds: Object.fromEntries(Object.entries(kinds).sort((a, b) => b[1] - a[1])),
    tallSpacing: { p10: r1(pct(nn, 0.1)), median: r1(pct(nn, 0.5)), p90: r1(pct(nn, 0.9)), under48: nn.filter((d) => d < 48).length, clarkEvans: r2(ce) },
    natureClarkEvans: r2(ceAll),
    groves: { tallWithin300: r1(groveMean), randomWouldBe: r1(groveRandom), ratio: r2(groveRandom ? groveMean / groveRandom : null) },
    cover: { underAPicture: r2(n16 ? under / n16 : 0), underTwoOrMore: r2(n16 ? under2 / n16 : 0) },
    screens: {
      things: { p10: pct(sn, 0.1), median: pct(sn, 0.5), p90: pct(sn, 0.9), max: sn[sn.length - 1] },
      tall: { p10: pct(st, 0.1), median: pct(st, 0.5), p90: pct(st, 0.9) },
      kinds: { p10: pct(sk, 0.1), median: pct(sk, 0.5), p90: pct(sk, 0.9) },
      bare: r2(samples.filter((s) => s.n < 3).length / samples.length),
      busy: r2(samples.filter((s) => s.n >= 60).length / samples.length),
    },
  };
}

/* ── roads: distance from a road, in cells, for every cell (two sweeps) ── */
const ROADISH = new Uint8Array(64);
for (const k of ['path', 'street', 'rail', 'bridge', 'boardwalk', 'plaza']) if (C[k] != null) ROADISH[C[k]] = 1;
const roadD = new Uint16Array(BW * BH);
for (let c = 0; c < BW * BH; c++) roadD[c] = ROADISH[bp.cls[c]] ? 0 : 999;
for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
  const c = y * BW + x; let v = roadD[c];
  if (x > 0 && roadD[c - 1] + 1 < v) v = roadD[c - 1] + 1;
  if (y > 0 && roadD[c - BW] + 1 < v) v = roadD[c - BW] + 1;
  roadD[c] = v;
}
for (let y = BH - 1; y >= 0; y--) for (let x = BW - 1; x >= 0; x--) {
  const c = y * BW + x; let v = roadD[c];
  if (x < BW - 1 && roadD[c + 1] + 1 < v) v = roadD[c + 1] + 1;
  if (y < BH - 1 && roadD[c + BW] + 1 < v) v = roadD[c + BW] + 1;
  roadD[c] = v;
}
const BANDS = [[0, 2], [2, 4], [4, 8], [8, 16], [16, 999]];
for (const lid of landIds) {
  const area = BANDS.map(() => 0), n = BANDS.map(() => 0), nt = BANDS.map(() => 0);
  for (const c of lands[lid].cells) { const d = roadD[c]; const b = BANDS.findIndex(([a, z]) => d >= a && d < z); if (b >= 0) area[b]++; }
  for (const o of objs) {
    if (o.reg !== lid || o.kind !== 'nature') continue;
    const c = cellOf(o.x, o.y); if (c < 0) continue;
    const d = roadD[c]; const b = BANDS.findIndex(([a, z]) => d >= a && d < z);
    if (b >= 0) { n[b]++; if (o.size === 'tall') nt[b]++; }
  }
  const per = (k, arr) => (area[k] ? r1(arr[k] / (area[k] * CELL * CELL / (SCREEN.w * SCREEN.h))) : null);
  report.lands[lid].byRoad = BANDS.map(([a, z], k) => ({ cells: `${a}-${z === 999 ? '' : z}`, px: `${a * CELL}-${z === 999 ? '' : z * CELL}`, perScreen: per(k, n), tallPerScreen: per(k, nt), share: r2(area[k] / Math.max(1, lands[lid].openCells)) }));
}

/* ── camps: things inside the band where the land's monsters stand
   (placing.js campBands: the bake's own band, test-world-core holds them
   together), against the land as a whole ── */
{
  const { mask } = campBands(PLAN, bp);
  const area = Object.create(null), n = Object.create(null), nt = Object.create(null);
  for (let c = 0; c < BW * BH; c++) if (mask[c]) { const r = bp.regionIds[bp.reg[c]]; area[r] = (area[r] || 0) + 1; }
  for (const o of objs) {
    const c = cellOf(o.x, o.y);
    if (c < 0 || !mask[c] || o.kind !== 'nature') continue;
    n[o.reg] = (n[o.reg] || 0) + 1;
    if (o.size === 'tall') nt[o.reg] = (nt[o.reg] || 0) + 1;
  }
  for (const lid of landIds) {
    if (!area[lid]) continue;
    const screens = (area[lid] * CELL * CELL) / (SCREEN.w * SCREEN.h);
    const per = (n[lid] || 0) / screens, tper = (nt[lid] || 0) / screens;
    report.lands[lid].camp = { screens: r1(screens), perScreen: r1(per), tallPerScreen: r1(tper),
      vsLand: r2(per / Math.max(0.01, report.lands[lid].perScreen.all)), tallVsLand: r2(tper / Math.max(0.01, report.lands[lid].perScreen.tall)) };
  }
}

/* ── sameness: tall things beside a twin drawn the same ── */
for (const lid of landIds) {
  let same = 0, tall = 0;
  for (let k = 0; k < objs.length; k++) {
    const o = objs[k];
    if (o.reg !== lid || o.size !== 'tall') continue;
    tall++;
    const t = nearest(o, k, (q) => q.id === o.id, 250);
    if (t.k >= 0 && t.d < 250 && objs[t.k].piece === o.piece && objs[t.k].flip === o.flip) same++;
  }
  report.lands[lid].sameness = { tall, twinWithin250SamePicture: same, share: r2(tall ? same / tall : 0) };
}

/* ── walking: the ground the feet can reach, with and without objects ──
   8 px raster; blocked = the game's own walk bits (water) or a footprint
   grown by the feet's half size (where the feet's middle cannot be) */
const S = 8, SW = Math.ceil(WW / S), SH = Math.ceil(WH / S);
const wb = walkBits(bp, mm);
const water = new Uint8Array(SW * SH);
for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
  const c = cellOf(x * S + S / 2, y * S + S / 2);
  if (c < 0 || (wb[c >> 3] >> (c & 7)) & 1) water[y * SW + x] = 1;
}
const fp = new Uint8Array(SW * SH);
for (const o of objs) for (const b of o.feet) {
  const x0 = Math.max(0, Math.floor((b.x0 - FEET) / S)), x1 = Math.min(SW - 1, Math.floor((b.x1 + FEET - 0.01) / S));
  const y0 = Math.max(0, Math.floor((b.y0 - FEET) / S)), y1 = Math.min(SH - 1, Math.floor((b.y1 + FEET - 0.01) / S));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fp[y * SW + x] = 1;
}
const flood = (blockedFn, sx, sy) => {
  const seen = new Uint8Array(SW * SH);
  const q = new Int32Array(SW * SH);
  let h = 0, t = 0;
  const s = Math.floor(sy / S) * SW + Math.floor(sx / S);
  if (blockedFn(s)) return seen;
  seen[s] = 1; q[t++] = s;
  while (h < t) {
    const c = q[h++], x = c % SW;
    if (x > 0 && !seen[c - 1] && !blockedFn(c - 1)) { seen[c - 1] = 1; q[t++] = c - 1; }
    if (x < SW - 1 && !seen[c + 1] && !blockedFn(c + 1)) { seen[c + 1] = 1; q[t++] = c + 1; }
    if (c >= SW && !seen[c - SW] && !blockedFn(c - SW)) { seen[c - SW] = 1; q[t++] = c - SW; }
    if (c < SW * SH - SW && !seen[c + SW] && !blockedFn(c + SW)) { seen[c + SW] = 1; q[t++] = c + SW; }
  }
  return seen;
};
const arrival = [21504, 21792];
const openReach = flood((c) => water[c], arrival[0], arrival[1]);
const withObjects = flood((c) => water[c] || fp[c], arrival[0], arrival[1]);
/* pockets: reachable without the objects, not with them, and not under a
   footprint itself */
const pocket = new Uint8Array(SW * SH);
let pocketPx = 0;
for (let c = 0; c < SW * SH; c++) if (openReach[c] && !withObjects[c] && !fp[c]) { pocket[c] = 1; pocketPx++; }
/* ...grouped, each with its land and size */
const pockets = [];
{
  const seen = new Uint8Array(SW * SH);
  for (let c0 = 0; c0 < SW * SH; c0++) {
    if (!pocket[c0] || seen[c0]) continue;
    const st = [c0]; seen[c0] = 1;
    let n = 0, sx = 0, sy = 0;
    while (st.length) {
      const c = st.pop(), x = c % SW, y = (c / SW) | 0;
      n++; sx += x; sy += y;
      for (const d of [c - 1, c + 1, c - SW, c + SW]) {
        if (d < 0 || d >= SW * SH || seen[d] || !pocket[d]) continue;
        if ((d === c - 1 && x === 0) || (d === c + 1 && x === SW - 1)) continue;
        seen[d] = 1; st.push(d);
      }
    }
    const px = (sx / n + 0.5) * S, py = (sy / n + 0.5) * S, cc = cellOf(px, py);
    pockets.push({ x: Math.round(px), y: Math.round(py), areaPx: n * S * S, land: cc >= 0 ? bp.regionIds[bp.reg[cc]] : null });
  }
}
pockets.sort((a, b) => b.areaPx - a.areaPx);
/* slits: two footprints side by side with a gap the feet cannot (under 20
   px) or can only just (20-36 px) pass, overlapping the other way */
const slits = { closed: 0, tight: 0, byLand: Object.create(null) };
{
  const boxes = [];
  for (const o of objs) for (const b of o.feet) boxes.push({ ...b, reg: o.reg });
  const FB = 128, FG = Math.ceil(WW / FB), fb = new Map();
  boxes.forEach((b, k) => {
    for (let j = Math.floor(b.y0 / FB); j <= Math.floor(b.y1 / FB); j++) for (let i = Math.floor(b.x0 / FB); i <= Math.floor(b.x1 / FB); i++) {
      const key = j * FG + i; let a = fb.get(key); if (!a) fb.set(key, (a = [])); a.push(k);
    }
  });
  const done = new Set();
  boxes.forEach((a, ka) => {
    for (let j = Math.floor((a.y0 - 40) / FB); j <= Math.floor((a.y1 + 40) / FB); j++) for (let i = Math.floor((a.x0 - 40) / FB); i <= Math.floor((a.x1 + 40) / FB); i++) {
      for (const kb of fb.get(j * FG + i) || []) {
        if (kb <= ka) continue;
        const key = ka * 1e6 + kb; if (done.has(key)) continue; done.add(key);
        const b = boxes[kb];
        const gx = Math.max(b.x0 - a.x1, a.x0 - b.x1), gy = Math.max(b.y0 - a.y1, a.y0 - b.y1);
        let gap = null;
        if (gy < 0 && gx > 0) gap = gx; else if (gx < 0 && gy > 0) gap = gy;
        if (gap == null) continue;
        const L = (slits.byLand[a.reg] || (slits.byLand[a.reg] = { closed: 0, tight: 0 }));
        if (gap < 2 * FEET) { slits.closed++; L.closed++; } else if (gap < 36) { slits.tight++; L.tight++; }
      }
    }
  });
}
let reachPx = 0, blockedPx = 0;
for (let c = 0; c < SW * SH; c++) { if (openReach[c]) { reachPx++; if (fp[c]) blockedPx++; } }
report.walking = {
  reachableGroundPx: reachPx * S * S, underFeetOfObjects: r2(blockedPx / Math.max(1, reachPx)),
  pocketsPx: pocketPx * S * S, pockets: pockets.length, biggest: pockets.slice(0, 12),
  pocketsByLand: pockets.reduce((m, p) => { m[p.land] = (m[p.land] || 0) + p.areaPx; return m; }, {}),
  slits,
};
report.ms = Date.now() - t0;

/* ── the summary ── */
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
console.log(`objects ${objs.length} (placing ${O.version || PLACING}, town x${bk}); a screen is ${SCREEN.w} x ${SCREEN.h} game px; ${report.ms} ms\n`);
console.log(pad('land', 9) + padL('screens', 8) + padL('/screen', 8) + padL('tall', 6) + padL('med', 6) + padL('low', 6) + padL('R tall', 8) + padL('R all', 7) + padL('grove', 7) + padL('nn10', 6) + padL('<48', 5) + padL('cover', 7) + padL('cov2+', 7) + padL('bare', 6) + padL('busy', 6) + padL('kinds', 6) + padL('camp', 6) + padL('campT', 6) + padL('same', 6));
for (const lid of landIds) {
  const r = report.lands[lid];
  console.log(pad(lid, 9) + padL(r.openScreens, 8) + padL(r.perScreen.all, 8) + padL(r.perScreen.tall, 6) + padL(r.perScreen.medium, 6) + padL(r.perScreen.low, 6)
    + padL(r.tallSpacing.clarkEvans ?? '-', 8) + padL(r.natureClarkEvans ?? '-', 7) + padL(r.groves.ratio ?? '-', 7) + padL(r.tallSpacing.p10 ?? '-', 6) + padL(r.tallSpacing.under48, 5)
    + padL(r.cover.underAPicture, 7) + padL(r.cover.underTwoOrMore, 7) + padL(r.screens.bare, 6) + padL(r.screens.busy, 6) + padL(r.screens.kinds.median, 6)
    + padL(r.camp ? r.camp.vsLand : '-', 6) + padL(r.camp ? (r.camp.tallVsLand ?? '-') : '-', 6) + padL(r.sameness.share, 6));
}
console.log('\nby distance from a road (things per screen-area of that band; nature only):');
for (const lid of landIds) console.log('  ' + pad(lid, 9) + report.lands[lid].byRoad.map((b) => `${b.px}px: ${b.perScreen}`).join('  '));
console.log(`\nwalking: ${report.walking.underFeetOfObjects * 100}% of reachable ground is under an object's footprint (grown by the feet);`
  + ` pockets the objects shut off: ${report.walking.pockets}, ${Math.round(report.walking.pocketsPx / 1000)}k px² in all;`
  + ` slits under 20 px: ${slits.closed}, 20-36 px: ${slits.tight}`);
for (const p of report.walking.biggest.slice(0, 8)) console.log(`  pocket ${p.areaPx} px² in ${p.land} at ${p.x},${p.y}`);
fs.writeFileSync(path.join(OUT, `placement-study${TAG}.json`), JSON.stringify(report, null, 1));
console.log(`\n-> ${path.join(OUT, `placement-study${TAG}.json`)}`);

/* ── the pictures ── */
if (MAPS) {
  const K = 64, MW = Math.ceil(WW / K), MH = Math.ceil(WH / K);
  const px = new Uint8ClampedArray(MW * MH * 4);
  const tint = Object.create(null);
  const PAL = { commons: [134, 185, 79], town: [201, 163, 106], frost: [180, 205, 230], ember: [200, 110, 70], sky: [225, 200, 130], hollows: [150, 140, 130],
    thunder: [130, 130, 170], tidal: [90, 170, 190], mist: [120, 150, 110], verdant: [60, 150, 70] };
  const dens = new Float32Array(MW * MH);
  for (const o of objs) { if (o.kind !== 'nature') continue; const i = Math.floor(o.x / K), j = Math.floor(o.y / K); if (i >= 0 && j >= 0 && i < MW && j < MH) dens[j * MW + i] += o.size === 'tall' ? 3 : o.size === 'medium' ? 1.5 : 1; }
  /* smoothed over ~500 game px (two box blurs of 4 pixels), so a wood or a
     clearing shows rather than each object's speck */
  const blur = (a, r) => {
    const t = new Float32Array(a.length);
    for (let j = 0; j < MH; j++) { let acc = 0; for (let i = -r; i < MW + r; i++) { const add = i + r < MW && i + r >= 0 ? a[j * MW + i + r] : 0, sub = i - r - 1 >= 0 && i - r - 1 < MW ? a[j * MW + i - r - 1] : 0; acc += add - sub; if (i >= 0 && i < MW) t[j * MW + i] = acc / (2 * r + 1); } }
    for (let i = 0; i < MW; i++) { let acc = 0; for (let j = -r; j < MH + r; j++) { const add = j + r < MH && j + r >= 0 ? t[(j + r) * MW + i] : 0, sub = j - r - 1 >= 0 && j - r - 1 < MH ? t[(j - r - 1) * MW + i] : 0; acc += add - sub; if (j >= 0 && j < MH) a[j * MW + i] = acc / (2 * r + 1); } }
  };
  blur(dens, 4); blur(dens, 4);
  let dsum = 0, dn = 0;
  for (const v of dens) if (v > 0) { dsum += v; dn++; }
  const dmean = dn ? dsum / dn : 1;
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    const c = cellOf(i * K + K / 2, j * K + K / 2), o = (j * MW + i) * 4;
    const reg = c >= 0 ? bp.regionIds[bp.reg[c]] : null;
    const isWater = c >= 0 && (wb[c >> 3] >> (c & 7)) & 1;
    let col = isWater ? [28, 70, 126] : PAL[reg] || [110, 110, 110];
    if (c >= 0 && ROADISH[bp.cls[c]]) col = [235, 215, 160];
    const d = Math.min(1, dens[j * MW + i] / (2.2 * dmean));
    px[o] = col[0] * (1 - 0.75 * d); px[o + 1] = col[1] * (1 - 0.75 * d); px[o + 2] = col[2] * (1 - 0.75 * d); px[o + 3] = 255;
  }
  for (const p of pockets) { const i = Math.floor(p.x / K), j = Math.floor(p.y / K); for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const q = ((j + v) * MW + i + u) * 4; if (q >= 0 && q < px.length) { px[q] = 255; px[q + 1] = 30; px[q + 2] = 30; } } }
  /* v2.3.3013: and the deeper stretches' places (levels 6-20) with them */
  for (const sp of Object.values(WHEEL_SPAWNS)) for (const [x, y] of [...sp.points, ...(sp.deeper || []).flatMap((d) => d.points)]) { const q = (Math.floor(y / K) * MW + Math.floor(x / K)) * 4; px[q] = 255; px[q + 1] = 230; px[q + 2] = 0; }
  fs.writeFileSync(path.join(OUT, `placement-density${TAG}.png`), encodePNG(MW, MH, px));
  console.log(`-> ${path.join(OUT, `placement-density${TAG}.png`)} (${MW} x ${MH}, a pixel 64 game px)`);
}
