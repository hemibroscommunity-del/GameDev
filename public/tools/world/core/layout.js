/* ═══ v2.3.2931: THE BLUEPRINT — the whole world as a colour-coded plan ═══
 *
 * One cell per `plan.blueprintScale` art px (8), each holding a terrain CLASS
 * (ground, path, water, cliff, ...) and a REGION (frost, ember, ...).  Built
 * deterministically from the plan: same seed, same world, on every device.
 *
 * It has two jobs, and the second is why it exists at all:
 *
 *  1. It is the layout sketch every square's template shows ChatGPT, so a
 *     trail or a river crossing a square border is already continuous before
 *     a single pixel is painted -- the biggest source of seams in tiled AI art
 *     is two squares disagreeing about WHERE things are, not how they look.
 *  2. It becomes the game's collision map.  Walls drawn first and painted to
 *     are the reverse of what failed twice (walls traced off finished art by
 *     hue, tiledMaps.js v2.3.1693 / v2.3.1794).
 *
 * Built in ~0.2 s on a desktop: the low-frequency fields (coast wobble,
 * region-border warp, meadow wobble) are evaluated on a coarse lattice and
 * interpolated, because they vary over hundreds of cells, not one.
 */
import { mulberry32, fbm, valueNoise, fnv1a } from './rng.js';
import { gridInfo } from './grid.js';

export const CLASS_IDS = ['ground', 'path', 'obstacle', 'water', 'ocean', 'cliff', 'lava', 'landmark', 'anchor'];
export const C = Object.freeze(Object.fromEntries(CLASS_IDS.map((k, i) => [k, i])));

export function hexToRgb(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* Evaluate f(bx, by) on a lattice every `step` cells; return a bilinear
   sampler.  The fields it is used for are smooth at that scale. */
function coarseField(bw, bh, step, f) {
  const cw = Math.ceil(bw / step) + 2, ch = Math.ceil(bh / step) + 2;
  const data = new Float32Array(cw * ch);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) data[j * cw + i] = f(i * step, j * step);
  return function sample(bx, by) {
    const x = bx / step, y = by / step;
    const i = Math.floor(x), j = Math.floor(y);
    const fx = x - i, fy = y - j;
    const i1 = Math.min(i + 1, cw - 1), j1 = Math.min(j + 1, ch - 1);
    const a = data[j * cw + i], b = data[j * cw + i1], c = data[j1 * cw + i], d = data[j1 * cw + i1];
    const top = a + (b - a) * fx, bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  };
}

/* Where each anchor painting sits, in art px.  `keep` is the part that stays
   (the painting minus its inset), `core` is keep minus the feather: fully
   opaque painting.  Between core and the painting's outer edge the squares
   paint forest that the painting fades into. */
export function placeAnchors(plan) {
  const g = gridInfo(plan);
  return (plan.anchors || []).map((a) => {
    const w = a.size[0], h = a.size[1];
    const x0 = Math.round(a.at[0] * g.W - w / 2), y0 = Math.round(a.at[1] * g.H - h / 2);
    const keep = { x0: x0 + a.inset.left, y0: y0 + a.inset.top, x1: x0 + w - a.inset.right, y1: y0 + h - a.inset.bottom };
    const core = { x0: keep.x0 + a.feather, y0: keep.y0 + a.feather, x1: keep.x1 - a.feather, y1: keep.y1 - a.feather };
    const gate = a.gate ? { x: x0 + a.gate[0] * w, y: y0 + a.gate[1] * h } : null;
    return { id: a.id, name: a.name, src: a.src, x0, y0, w, h, keep, core, gate, feather: a.feather };
  });
}

/* Distance from point p to segment ab (all [x, y]). */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const qx = ax + t * dx - px, qy = ay + t * dy - py;
  return Math.sqrt(qx * qx + qy * qy);
}

export function buildBlueprint(plan) {
  const g = gridInfo(plan);
  const S = plan.blueprintScale;
  const bw = Math.ceil(g.W / S), bh = Math.ceil(g.H / S);
  const n = bw * bh;
  const cls = new Uint8Array(n), reg = new Uint8Array(n);
  const regionIds = Object.keys(plan.regions);
  const R = Object.create(null);
  regionIds.forEach((k, i) => { R[k] = i; });
  const seed = plan.seed | 0;
  const toU = (bx) => ((bx + 0.5) * S) / g.W;
  const toV = (by) => ((by + 0.5) * S) / g.H;

  const anchors = placeAnchors(plan);

  const STEP = 8;
  const coastN = coarseField(bw, bh, STEP, (bx, by) => fbm(toU(bx) * 3.1, toV(by) * 3.1, seed + 11, 4));
  const warpX = coarseField(bw, bh, STEP, (bx, by) => fbm(toU(bx) * 4.3, toV(by) * 4.3, seed + 23, 3));
  const warpY = coarseField(bw, bh, STEP, (bx, by) => fbm(toU(bx) * 4.3 + 17.3, toV(by) * 4.3 + 5.1, seed + 37, 3));
  const ringN = coarseField(bw, bh, STEP, (bx, by) => fbm(toU(bx) * 5.7, toV(by) * 5.7, seed + 41, 3));

  const hearts = regionIds.filter((k) => plan.regions[k].heart)
    .map((k) => ({ id: R[k], x: plan.regions[k].heart[0], y: plan.regions[k].heart[1] }));
  const coast = plan.coast, meadow = plan.meadow;
  const forestW = (plan.townForest && plan.townForest.width) || 0;
  const meadowId = R.meadow, townId = R.town;

  /* ── pass 1: sea, anchors + their forest, meadow ring, regions ── */
  for (let by = 0; by < bh; by++) {
    const v = toV(by);
    for (let bx = 0; bx < bw; bx++) {
      const u = toU(bx);
      const i = by * bw + bx;
      const ax = (bx + 0.5) * S, ay = (by + 0.5) * S;
      const wu = u + plan.regionWarp * warpX(bx, by), wv = v + plan.regionWarp * warpY(bx, by);
      let best = hearts.length ? hearts[0].id : 0, bd = Infinity;
      for (let h = 0; h < hearts.length; h++) {
        const dx = wu - hearts[h].x, dy = wv - hearts[h].y;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = hearts[h].id; }
      }
      const dx = u - 0.5, dy = v - 0.5;
      const e = Math.sqrt(dx * dx + dy * dy), chb = Math.max(Math.abs(dx), Math.abs(dy));
      const dist = e + (chb - e) * (coast.square || 0);
      if (dist > coast.radius + coast.wobble * coastN(bx, by)) { cls[i] = C.ocean; reg[i] = best; continue; }

      let placed = false;
      for (const a of anchors) {
        if (ax >= a.core.x0 && ax < a.core.x1 && ay >= a.core.y0 && ay < a.core.y1) {
          cls[i] = C.anchor; reg[i] = townId != null ? townId : best; placed = true; break;
        }
        const ddx = Math.max(a.x0 - ax, 0, ax - (a.x0 + a.w)), ddy = Math.max(a.y0 - ay, 0, ay - (a.y0 + a.h));
        const out = Math.sqrt(ddx * ddx + ddy * ddy);
        if (out < forestW * (0.8 + 0.35 * ringN(bx, by))) {
          cls[i] = C.obstacle; reg[i] = meadowId != null ? meadowId : best; placed = true; break;
        }
      }
      if (placed) continue;
      if (meadowId != null && e < meadow.radius + meadow.wobble * ringN(bx, by)) { cls[i] = C.ground; reg[i] = meadowId; continue; }
      cls[i] = C.ground; reg[i] = best;
    }
  }

  /* ── pass 2: scatter each region's features ── */
  const rng = mulberry32(seed ^ 0x5bd1e995);
  const area = new Float64Array(regionIds.length);
  for (let i = 0; i < n; i++) if (cls[i] === C.ground) area[reg[i]]++;

  const canTake = (k) => k === C.ground || k === C.obstacle;
  function stampBlob(cx, cy, r, k, rid, nseed) {
    const x0 = Math.max(0, Math.floor(cx - r * 1.45)), x1 = Math.min(bw - 1, Math.ceil(cx + r * 1.45));
    const y0 = Math.max(0, Math.floor(cy - r * 1.45)), y1 = Math.min(bh - 1, Math.ceil(cy + r * 1.45));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * bw + x;
      if (reg[i] !== rid || !canTake(cls[i])) continue;
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) / r;
      if (d + 0.32 * valueNoise(x * 0.12, y * 0.12, nseed) < 1) cls[i] = k;
    }
  }
  function stampRidge(pts, r, k, rid, nseed) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    x0 = Math.max(0, Math.floor(x0 - r * 1.5)); y0 = Math.max(0, Math.floor(y0 - r * 1.5));
    x1 = Math.min(bw - 1, Math.ceil(x1 + r * 1.5)); y1 = Math.min(bh - 1, Math.ceil(y1 + r * 1.5));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * bw + x;
      if (reg[i] !== rid || !canTake(cls[i])) continue;
      let d = Infinity;
      for (let s = 0; s < pts.length - 1; s++) d = Math.min(d, segDist(x, y, pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1]));
      if (d / r + 0.3 * valueNoise(x * 0.14, y * 0.14, nseed) < 1) cls[i] = k;
    }
  }

  let blobSeed = seed + 1000;
  for (const rk of regionIds) {
    const rd = plan.regions[rk];
    if (!rd.features) continue;
    const rid = R[rk];
    const areaM = (area[rid] * S * S) / 1e6;
    for (const f of rd.features) {
      const k = C[f.class];
      const count = Math.round(f.density * areaM);
      for (let q = 0; q < count; q++) {
        let px = -1, py = -1;
        for (let t = 0; t < 40; t++) {
          const qx = Math.floor(rng() * bw), qy = Math.floor(rng() * bh);
          const qi = qy * bw + qx;
          if (reg[qi] === rid && cls[qi] === C.ground) { px = qx; py = qy; break; }
        }
        const r = (f.r[0] + rng() * (f.r[1] - f.r[0])) / S;
        blobSeed++;
        if (f.shape === 'ridge') {
          let ux = rng() * 2 - 1, uy = rng() * 2 - 1;
          const ul = Math.sqrt(ux * ux + uy * uy) || 1; ux /= ul; uy /= ul;
          const L = (f.len[0] + rng() * (f.len[1] - f.len[0])) / S;
          const b1 = (rng() - 0.5) * L * 0.35, b2 = (rng() - 0.5) * L * 0.35;
          if (px < 0) continue;
          const pts = [
            [px - ux * L / 2, py - uy * L / 2],
            [px - ux * L / 6 - uy * b1, py - uy * L / 6 + ux * b1],
            [px + ux * L / 6 - uy * b2, py + uy * L / 6 + ux * b2],
            [px + ux * L / 2, py + uy * L / 2],
          ];
          stampRidge(pts, r, k, rid, blobSeed);
        } else {
          if (px < 0) continue;
          stampBlob(px, py, r, k, rid, blobSeed);
        }
      }
    }
  }

  /* ── pass 3: trails from the town's stairs to every region ──
     Routes share their first stretches (every trail leaves by the one
     stairway, and the northern ones share a flank), so the routes are merged
     into a NETWORK of unique edges and each edge is drawn once.  Drawn per
     route instead, two routes over the same stretch wobble independently and
     come out as a doubled trail.  Wobble fades to zero at both ends of every
     edge, so edges meet exactly at their fork points. */
  const town = anchors.find((a) => a.id === 'town') || anchors[0];
  const trails = [];
  if (town && town.gate) {
    const half = 36 / S;
    const stamp = (cx, cy) => {
      const x0 = Math.max(0, Math.floor(cx - half - 1)), x1 = Math.min(bw - 1, Math.ceil(cx + half + 1));
      const y0 = Math.max(0, Math.floor(cy - half - 1)), y1 = Math.min(bh - 1, Math.ceil(cy + half + 1));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * bw + x;
        if (cls[i] === C.ocean || cls[i] === C.anchor) continue;
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= half * half) cls[i] = C.path;
      }
    };
    const start = [town.gate.x, town.gate.y - 90];
    const stairs = [town.gate.x, town.gate.y + 60];
    const fork = [town.gate.x, Math.max(town.gate.y + forestW + 220, 0.645 * g.H)];
    const edges = new Map();
    for (const rk of regionIds) {
      const rd = plan.regions[rk];
      const target = rd.heart || (rd.landmark && rd.landmark.at);
      if (!target || !rd.trail) continue;
      const pts = [start, stairs, fork]
        .concat(rd.trail.map((p) => [p[0] * g.W, p[1] * g.H]))
        .concat([[target[0] * g.W, target[1] * g.H]]);
      for (let s = 0; s < pts.length - 1; s++) {
        const a = pts[s], b = pts[s + 1];
        const key = [a[0], a[1], b[0], b[1]].map((v) => Math.round(v)).join(',');
        if (!edges.has(key)) edges.set(key, { a, b, straight: s < 2 });
      }
      trails.push({ region: rk, points: pts });
    }
    let edgeSeed = seed + 77;
    for (const e of edges.values()) {
      edgeSeed++;
      const ax = e.a[0] / S, ay = e.a[1] / S, bx = e.b[0] / S, by = e.b[1] / S;
      const dx = bx - ax, dy = by - ay;
      const L = Math.sqrt(dx * dx + dy * dy) || 1;
      const tx = dx / L, ty = dy / L;
      const steps = Math.max(1, Math.ceil(L / 0.5));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const bump = Math.min(1, 6 * t * (1 - t));
        const wob = e.straight ? 0 : bump * (80 / S) * fbm(t * L * 0.03, 0.5, edgeSeed, 3);
        stamp(ax + dx * t - ty * wob, ay + dy * t + tx * wob);
      }
    }
  }

  /* ── pass 4: one landmark per region, where its trail ends ── */
  const landmarks = [];
  for (const rk of regionIds) {
    const rd = plan.regions[rk];
    const lm = rd.landmark;
    const at = rd.heart || (lm && lm.at);
    if (!lm || !at) continue;
    const cx = (at[0] * g.W) / S, cy = (at[1] * g.H) / S, r = lm.r / S;
    const x0 = Math.max(0, Math.floor(cx - r * 1.45)), x1 = Math.min(bw - 1, Math.ceil(cx + r * 1.45));
    const y0 = Math.max(0, Math.floor(cy - r * 1.45)), y1 = Math.min(bh - 1, Math.ceil(cy + r * 1.45));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * bw + x;
      if (cls[i] === C.ocean || cls[i] === C.anchor) continue;
      const dx = x - cx, dy = y - cy;
      if (Math.sqrt(dx * dx + dy * dy) / r + 0.22 * valueNoise(x * 0.09, y * 0.09, seed + 500 + R[rk]) < 1) { cls[i] = C.landmark; reg[i] = R[rk]; }
    }
    landmarks.push({ region: rk, name: lm.name, x: at[0] * g.W, y: at[1] * g.H, r: lm.r });
  }

  const counts = { classes: new Array(CLASS_IDS.length).fill(0), regions: new Array(regionIds.length).fill(0) };
  for (let i = 0; i < n; i++) { counts.classes[cls[i]]++; counts.regions[reg[i]]++; }

  return {
    w: bw, h: bh, scale: S, W: g.W, H: g.H,
    cls, reg, regionIds, classIds: CLASS_IDS,
    anchors, landmarks, trails, counts,
    hash: fnv1a(cls, reg),
  };
}

/* ── colours ── */

/* RGB for every (class, region) pair, as the sketch shows it. */
export function colorTable(plan, bp) {
  const nr = bp.regionIds.length;
  const table = new Array(CLASS_IDS.length * nr);
  const K = plan.classes;
  for (let k = 0; k < CLASS_IDS.length; k++) for (let r = 0; r < nr; r++) {
    const rd = plan.regions[bp.regionIds[r]] || {};
    const cid = CLASS_IDS[k];
    let hex;
    if (cid === 'ground') hex = rd.ground;
    else if (cid === 'obstacle') hex = rd.obstacle || '#3c6b2c';
    else if (cid === 'water') hex = rd.water || K.water.color;
    else if (cid === 'landmark') hex = (rd.landmark && rd.landmark.color) || '#999999';
    /* The anchor's CORE is fully opaque painting, so no template ever shows
       this colour -- only the overview does, where "the town is here" is the
       point.  (The painting's feathered rim is forest-belt obstacle, not
       anchor, so the sketch under the fade is the canopy it fades into.) */
    else if (cid === 'anchor') hex = (plan.regions.town && plan.regions.town.ground) || '#b98f55';
    else hex = (K[cid] && K[cid].color) || '#ff00ff';
    table[k * nr + r] = hexToRgb(hex || '#808080');
  }
  return table;
}

/* A human name for a (class, region) colour, for the prompt's legend. */
export function colorNameOf(plan, cid, rid) {
  const rd = plan.regions[rid] || {};
  const K = plan.classes;
  if (cid === 'ground') return rd.groundName;
  if (cid === 'obstacle') return rd.obstacleName;
  if (cid === 'water') return rd.waterName || K.water.colorName;
  if (cid === 'landmark') return rd.landmark && rd.landmark.colorName;
  return K[cid] && K[cid].colorName;
}

/* ── the sketch ──
   Renders the blueprint over `rect` (art px) into an outW x outH RGBA buffer.

   Taking the nearest cell would draw every outline as 8 px stairs, and the
   model copies what it is shown -- a stair-stepped lake comes back as a
   stair-stepped lake.  So each class present gets a membership field
   (1 where the cell is that class), blurred over a couple of cells, and
   every output pixel takes the class whose blurred membership is highest
   there: the outlines come out as smooth curves through the cell corners.
   Ground colour is blended across region borders over ~80 art px so the
   sketch itself asks for a gradual change of landscape. */
export function renderSketch(plan, bp, rect, outW, outH, table) {
  table = table || colorTable(plan, bp);
  const S = bp.scale, nr = bp.regionIds.length;
  const out = new Uint8ClampedArray(outW * outH * 4);

  /* the rect plus a margin, in cells */
  const M = 8;
  const gx0 = Math.floor(rect.x / S) - M, gy0 = Math.floor(rect.y / S) - M;
  const gw = Math.ceil(rect.w / S) + 2 * M + 2, gh = Math.ceil(rect.h / S) + 2 * M + 2;
  const cellAt = (x, y) => {
    const bx = Math.min(bp.w - 1, Math.max(0, gx0 + x)), by = Math.min(bp.h - 1, Math.max(0, gy0 + y));
    return by * bp.w + bx;
  };

  /* blurred ground-colour field */
  const field = new Float32Array(gw * gh * 3);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const c = table[C.ground * nr + bp.reg[cellAt(x, y)]];
    const o = (y * gw + x) * 3;
    field[o] = c[0]; field[o + 1] = c[1]; field[o + 2] = c[2];
  }
  boxBlur3(field, gw, gh, 4);
  boxBlur3(field, gw, gh, 4);

  /* blurred membership per class present */
  const present = [];
  const memb = [];
  {
    const seen = new Uint8Array(CLASS_IDS.length);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) seen[bp.cls[cellAt(x, y)]] = 1;
    for (let k = 0; k < CLASS_IDS.length; k++) if (seen[k]) present.push(k);
    for (const k of present) {
      const f = new Float32Array(gw * gh);
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) f[y * gw + x] = bp.cls[cellAt(x, y)] === k ? 1 : 0;
      boxBlur1(f, gw, gh, 1);
      boxBlur1(f, gw, gh, 1);
      memb.push(f);
    }
  }

  const sx = rect.w / outW, sy = rect.h / outH;
  for (let oy = 0; oy < outH; oy++) {
    const gyf = (rect.y + (oy + 0.5) * sy) / S - 0.5 - gy0;
    const gj = Math.min(gh - 2, Math.max(0, Math.floor(gyf)));
    const uy = Math.min(1, Math.max(0, gyf - gj));
    for (let ox = 0; ox < outW; ox++) {
      const gxf = (rect.x + (ox + 0.5) * sx) / S - 0.5 - gx0;
      const gi = Math.min(gw - 2, Math.max(0, Math.floor(gxf)));
      const ux = Math.min(1, Math.max(0, gxf - gi));
      const p00 = gj * gw + gi, p10 = p00 + 1, p01 = p00 + gw, p11 = p01 + 1;
      const w00 = (1 - ux) * (1 - uy), w10 = ux * (1 - uy), w01 = (1 - ux) * uy, w11 = ux * uy;
      let k = present[0], kv = -1;
      for (let q = 0; q < present.length; q++) {
        const f = memb[q];
        const v = f[p00] * w00 + f[p10] * w10 + f[p01] * w01 + f[p11] * w11;
        if (v > kv) { kv = v; k = present[q]; }
      }
      let r, gcol, b;
      if (k === C.ground) {
        const o00 = p00 * 3, o10 = p10 * 3, o01 = p01 * 3, o11 = p11 * 3;
        r = field[o00] * w00 + field[o10] * w10 + field[o01] * w01 + field[o11] * w11;
        gcol = field[o00 + 1] * w00 + field[o10 + 1] * w10 + field[o01 + 1] * w01 + field[o11 + 1] * w11;
        b = field[o00 + 2] * w00 + field[o10 + 2] * w10 + field[o01 + 2] * w01 + field[o11 + 2] * w11;
      } else {
        /* the region of the nearest cell that really carries class k */
        const nx = Math.round(gxf), ny = Math.round(gyf);
        let rr = bp.reg[cellAt(nx, ny)], bestD = Infinity;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const ci = cellAt(nx + dx, ny + dy);
          if (bp.cls[ci] !== k) continue;
          const d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; rr = bp.reg[ci]; }
        }
        const c = table[k * nr + rr];
        r = c[0]; gcol = c[1]; b = c[2];
      }
      const o = (oy * outW + ox) * 4;
      out[o] = r; out[o + 1] = gcol; out[o + 2] = b; out[o + 3] = 255;
    }
  }
  return out;
}

/* In-place separable box blur of a 1-channel float field. */
function boxBlur1(f, w, h, r) {
  const tmp = new Float32Array(Math.max(w, h));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let d = -r; d <= r; d++) { s += f[y * w + Math.min(w - 1, Math.max(0, x + d))]; n++; }
      tmp[x] = s / n;
    }
    f.set(tmp.subarray(0, w), y * w);
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let s = 0, n = 0;
      for (let d = -r; d <= r; d++) { s += f[Math.min(h - 1, Math.max(0, y + d)) * w + x]; n++; }
      tmp[y] = s / n;
    }
    for (let y = 0; y < h; y++) f[y * w + x] = tmp[y];
  }
}

/* In-place separable box blur of a 3-channel float field. */
function boxBlur3(f, w, h, r) {
  const tmp = new Float32Array(Math.max(w, h) * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s0 = 0, s1 = 0, s2 = 0, n = 0;
      for (let d = -r; d <= r; d++) {
        const xx = Math.min(w - 1, Math.max(0, x + d));
        const o = (y * w + xx) * 3;
        s0 += f[o]; s1 += f[o + 1]; s2 += f[o + 2]; n++;
      }
      tmp[x * 3] = s0 / n; tmp[x * 3 + 1] = s1 / n; tmp[x * 3 + 2] = s2 / n;
    }
    f.set(tmp.subarray(0, w * 3), y * w * 3);
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let s0 = 0, s1 = 0, s2 = 0, n = 0;
      for (let d = -r; d <= r; d++) {
        const yy = Math.min(h - 1, Math.max(0, y + d));
        const o = (yy * w + x) * 3;
        s0 += f[o]; s1 += f[o + 1]; s2 += f[o + 2]; n++;
      }
      tmp[y * 3] = s0 / n; tmp[y * 3 + 1] = s1 / n; tmp[y * 3 + 2] = s2 / n;
    }
    for (let y = 0; y < h; y++) {
      const o = (y * w + x) * 3;
      f[o] = tmp[y * 3]; f[o + 1] = tmp[y * 3 + 1]; f[o + 2] = tmp[y * 3 + 2];
    }
  }
}

/* The whole blueprint as one image, one pixel per cell (1/8 scale) -- the
   builder's overview background.  No interpolation needed at 1:1. */
export function renderOverview(plan, bp, table) {
  table = table || colorTable(plan, bp);
  const nr = bp.regionIds.length;
  const out = new Uint8ClampedArray(bp.w * bp.h * 4);
  for (let i = 0; i < bp.w * bp.h; i++) {
    const c = table[bp.cls[i] * nr + bp.reg[i]];
    out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255;
  }
  return out;
}

/* ── what a square contains ──
   Region and class shares (with centroids in 0..1 square coordinates), which
   classes cross each edge, and which landmarks fall inside.  This is what the
   prompt is written from. */
export function coverage(plan, bp, rect) {
  const S = bp.scale;
  const bx0 = Math.max(0, Math.floor(rect.x / S)), by0 = Math.max(0, Math.floor(rect.y / S));
  const bx1 = Math.min(bp.w, Math.ceil((rect.x + rect.w) / S)), by1 = Math.min(bp.h, Math.ceil((rect.y + rect.h) / S));
  const total = Math.max(1, (bx1 - bx0) * (by1 - by0));
  const regs = new Map(), kinds = new Map();
  const edges = { top: new Set(), right: new Set(), bottom: new Set(), left: new Set() };
  const E = 3;
  for (let y = by0; y < by1; y++) for (let x = bx0; x < bx1; x++) {
    const i = y * bp.w + x;
    const rid = bp.regionIds[bp.reg[i]], cid = CLASS_IDS[bp.cls[i]];
    const u = ((x + 0.5) * S - rect.x) / rect.w, v = ((y + 0.5) * S - rect.y) / rect.h;
    let e = regs.get(rid); if (!e) regs.set(rid, (e = { id: rid, n: 0, su: 0, sv: 0 }));
    e.n++; e.su += u; e.sv += v;
    const key = cid + ':' + rid;
    let f = kinds.get(key); if (!f) kinds.set(key, (f = { cls: cid, region: rid, n: 0, su: 0, sv: 0 }));
    f.n++; f.su += u; f.sv += v;
    if (y < by0 + E) edges.top.add(cid);
    if (y >= by1 - E) edges.bottom.add(cid);
    if (x < bx0 + E) edges.left.add(cid);
    if (x >= bx1 - E) edges.right.add(cid);
  }
  const fin = (m) => [...m.values()].map((e) => ({ ...e, frac: e.n / total, cx: e.su / e.n, cy: e.sv / e.n }))
    .sort((a, b) => b.n - a.n);
  const landmarks = bp.landmarks.filter((l) => l.x + l.r > rect.x && l.x - l.r < rect.x + rect.w && l.y + l.r > rect.y && l.y - l.r < rect.y + rect.h)
    .map((l) => ({ ...l, cx: (l.x - rect.x) / rect.w, cy: (l.y - rect.y) / rect.h }));
  const anchors = bp.anchors.filter((a) => a.keep.x1 > rect.x && a.keep.x0 < rect.x + rect.w && a.keep.y1 > rect.y && a.keep.y0 < rect.y + rect.h);
  return { total, regions: fin(regs), classes: fin(kinds), edges, landmarks, anchors };
}
