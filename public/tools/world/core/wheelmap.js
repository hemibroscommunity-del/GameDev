/* ═══ v2.3.2966: THE WHEEL'S MAP — what the minimap and the world map draw ═══
 *
 * Owner, 2026-10-01: "I'm thinking the minimap will need to be larger and the
 * most informative and intuitive it can be for navigation purposes.  Maybe
 * tapping it brings up an overlay of a labelled world map.  It would probably
 * help to have areas labelled so players can start memorizing the territory."
 *
 * Everything a map of the Wheel says, from the plan and its blueprint, in
 * GAME px (the Wheel trial's world, 0..worldW): the lands and their stages
 * with their levels, the town and the commons, the camps, passes, gates and
 * landmarks, and the roads, the river and the railway as lines.  Built once
 * by the game's ground worker (ground-worker.js, which has the blueprint) and
 * posted to the game with its first answer; the ground under each spot comes
 * from the worker's overview picture, which the game already holds.
 *
 * Pure: no page, no canvas.  tools/world/test-world-core.mjs checks it.
 */
import { gridInfo } from './grid.js';
import { spokePoint } from './wheel.js';

/* how far a drawn line may stray from the plan's own (art px): enough to
   drop the roads' thousand points to a few dozen, never enough to see */
const SIMPLIFY = 24;

/* Douglas-Peucker on [x, y] points */
function simplify(pts, tol) {
  if (pts.length <= 2) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    let far = -1, fd = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > fd) { fd = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/* The map, from the plan and its blueprint (layout.js buildBlueprint). */
export function wheelMap(plan, bp) {
  const g = gridInfo(plan), W = bp.wheel, WPA = plan.worldPxPerArtPx;
  const r1 = (v) => Math.round(v);
  /* art px -> game px; squares from the centre -> game px */
  const game = (ax, ay) => [r1((ax - bp.x0) * WPA), r1((ay - bp.y0) * WPA)];
  const fromSq = ([sx, sy]) => game(g.cx + sx * g.P, g.cy + sy * g.P);
  const realms = plan.realms || {};
  const lands = [], stages = [];
  for (const s of W.spokes) {
    const rd = plan.regions[s.id];
    const [x, y] = fromSq(spokePoint(s, W.hub + (W.tiers / 2) * W.tierLen));
    const realm = rd.realm && realms[rd.realm];
    lands.push({
      id: s.id, name: rd.name, element: rd.element || null, dir: rd.dir, x, y,
      ux: s.ux, uy: s.uy,
      levels: [1, W.tiers * W.levelsPerTier],
      realm: realm ? { name: realm.name, levels: realm.level || null } : null,
    });
    (rd.stages || []).forEach((st, k) => {
      const t0 = k * W.stageTiers + 1, t1 = Math.min(W.tiers, (k + 1) * W.stageTiers);
      const [sx, sy] = fromSq(spokePoint(s, W.hub + (k * W.stageTiers + W.stageTiers / 2) * W.tierLen));
      stages.push({ region: s.id, k, name: st.name, levels: [(t0 - 1) * W.levelsPerTier + 1, t1 * W.levelsPerTier], x: sx, y: sy });
    });
  }
  const [tx, ty] = game(g.cx, g.cy);
  const [cx, cy] = fromSq([0, W.hub * 0.72]);
  const hub = {
    town: { id: 'town', name: (plan.regions.town && plan.regions.town.name) || 'Brotown', x: tx, y: ty },
    commons: { id: 'commons', name: (plan.regions.commons && plan.regions.commons.name) || 'the commons', x: cx, y: cy },
  };
  /* the places, by kind: camps (a waystation at the end of every stage),
     passes, gates, landmarks and the commons' own (the depot, the mill, the
     arena), the falls and the bridges */
  const places = [];
  for (const p of bp.pois || []) {
    const [x, y] = game(p.x, p.y);
    const m = /^camp-([a-z]+)-(\d+)$/.exec(p.id || '');
    if (p.kind === 'place' && m) {
      places.push({ kind: 'camp', id: p.id, name: p.name, region: m[1], level: Number(m[2]) * W.levelsPerTier, x, y });
    } else if (p.kind === 'pass') {
      places.push({ kind: 'pass', id: p.id, name: p.name, a: p.a, b: p.b, level: p.level, x, y });
    } else if (p.kind === 'gate') {
      const rd = plan.regions[p.region], realm = rd && rd.realm && realms[rd.realm];
      places.push({ kind: 'gate', id: p.id, name: p.name, region: p.region, to: realm ? realm.name : null, x, y });
    } else if (p.kind === 'landmark' || p.kind === 'place' || p.kind === 'falls' || p.kind === 'bridge') {
      places.push({ kind: p.kind === 'place' ? 'site' : p.kind, id: p.id, name: p.name, region: p.region || null, x, y });
    }
  }
  /* the lines: the roads (the trunks down the spokes, the passes, the paths
     to places), the river, the railway -- simplified, in game px, flat */
  const routes = (bp.routes || []).map((rt) => {
    const pts = simplify(rt.pts, SIMPLIFY);
    const flat = [];
    for (const [ax, ay] of pts) { const [x, y] = game(ax, ay); flat.push(x, y); }
    const kind = rt.kind;
    const trunk = kind === 'road' && !/^pass-|-path$/.test(rt.id);
    return { kind, id: rt.id, name: rt.name, trunk, pts: flat };
  });
  return {
    worldW: r1(bp.w * bp.scale * WPA), worldH: r1(bp.h * bp.scale * WPA),
    levelsPerTier: W.levelsPerTier, stageTiers: W.stageTiers, tiers: W.tiers,
    regionIds: bp.regionIds.slice(),
    names: Object.fromEntries(Object.keys(plan.regions).map((id) => [id, plan.regions[id].name])),
    lands, stages, hub, places, routes,
  };
}

/* "Where am I", in words, from the region and tier the worker reads under a
   spot (bp.reg, bp.tier): the land, its stage and the levels there. */
export function whereWords(map, region, tier) {
  if (!map || !region) return null;
  const name = map.names[region] || region;
  if (region === 'town') return { title: name, sub: 'safe' };
  if (region === 'commons') return { title: name, sub: 'safe, no monsters' };
  if (!(tier >= 1)) return { title: name, sub: '' };
  const k = Math.min(Math.floor((tier - 1) / map.stageTiers), 3);
  const st = map.stages.find((s) => s.region === region && s.k === k);
  const lo = (tier - 1) * map.levelsPerTier + 1, hi = tier * map.levelsPerTier;
  return { title: name, sub: `${st ? `${st.name} · ` : ''}Lv ${lo}–${hi}` };
}
