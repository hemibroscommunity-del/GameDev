/* ═══ v2.3.3522: WHERE EACH QUEST LEADS IN THE WHEEL ═══
 *
 * The owner, playtesting: "I tapped track quest in quest menu but no golden
 * stars were in minimap (I had two active quests - one from beast master and
 * the other from mayor bro)."
 *
 * Three things were wrong, and this module answers all three:
 *
 *   1. TRACKING CHANGED NOTHING ON THE MAPS.  The road (questRoute.js) took
 *      the active quests in the order the worker stored them; "Track this
 *      quest" only sorted the quest list.  Now the tracked quest goes first
 *      (routeOrder); untracked, the order is what it was -- a quest ready to
 *      hand in or one naming a land first, as the old questTargetZone had it,
 *      then the rest, each group in the worker's order.
 *
 *   2. MOST OF THE BEASTMASTER'S AND THE MAYOR'S LATER QUESTS LED NOWHERE.
 *      Only a land ("Bring 4 Snowman Remnants from Frost Ridge"), a resource
 *      (the fishing, the ore) or a hand-in had a place; "Make 3 box traps at
 *      the Woodworker", "Spring 5 traps", "Reach Trapping 6", "Catch a pet",
 *      "Visit 3 buildings", "Kill 5 monsters" and "Clear any dungeon" had
 *      none, so with any two of those the star simply never came.  Each now
 *      has a WAY (the quest's `way`, or its current step's, in
 *      data/gameSystems.js QUEST_CHAINS -- beside `zone` and `node`):
 *        'door:<plot>'  a building's door (wheelTownDoors): the Woodworker
 *                       for the traps, the Land Office for the dungeon (the
 *                       farm's Dungeon Workshop is behind it);
 *        'visit'        the nearest building door you have not been through
 *                       yet (S.stats.visitedBuildings, BUILDINGS indexes --
 *                       mayor_1's own count; the halls do not count);
 *        'monsters'     where the nearest land's monsters begin, its level
 *                       1s -- the very spot a quest naming a land leads to;
 *        'giver'        (v2.3.3519, the tour) the quest's own giver while it
 *                       runs: Lil Bro's race starts at him, his Race!.
 *
 *   3. A QUEST WITH NOWHERE TO GO HID THE ONE BEHIND IT.  The old _wantNode
 *      stopped at the first any-zone quest and returned "nothing" when it
 *      named no resource -- so "Spring 5 traps" taken before "Bring 5 Ore"
 *      blanked the ore's road.  Now a quest with no way passes to the next
 *      (wheelWay); only "you are there" (HERE) stops the road, as it always
 *      did among a land's monsters -- the next quest's star would read as
 *      this one's.
 *
 * NO IMPORTS: server/test/quest-route.test.mjs runs it in node, driving
 * wheelWay with the real quest table and a made-up Wheel; questRoute.js wires
 * the live game in (the doors, the npc list, the nodes, the Wheel's size). */

/* game px -- the numbers questRoute.js has used since v2.3.2990/v2.3.3012/v2.3.3320 */
export const LAND_HERE_R = 600;   /* short Wheel: each land's monsters all stand within ~550 of its middle */
export const LAND_IN_PX = 300;    /* long Wheel: the star this far past where a land's monsters begin */
export const GATHER_HERE_R = 160; /* at a resource: the road stops */
/* at a door: the road stops.  The Enter button comes at 140 px from the
   BOOTS (data/wheelBuildingDoors.js WHEEL_DOOR_REACH); this is measured from
   the body's middle, ~45 px above them */
export const DOOR_HERE_R = 200;

/** "You are there": no star, and no other quest's either. */
export const HERE = Object.freeze({ here: true });

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/** The order the road takes the active quests in.  `entries`: [{ qid, q,
    done, zone }] in the worker's order; the tracked quest first, then the
    ones ready to hand in or naming a land, then the rest -- each group in its
    own order. */
export function routeOrder(entries, tracked) {
  if (!Array.isArray(entries)) return [];
  const t = typeof tracked === 'string' && tracked ? tracked : null;
  const rank = (e) => (t && e.qid === t) ? 0 : (e.done || e.zone) ? 1 : 2;
  return entries.map((e, i) => ({ e, i, r: rank(e) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.e);
}

/** A way written on a quest or a step, as data: 'monsters', 'visit',
    'door:<plot>', 'giver' (v2.3.3519) -- or null. */
export function parseWay(w) {
  if (typeof w !== 'string' || !w) return null;
  if (w === 'monsters') return { kind: 'monsters' };
  if (w === 'visit') return { kind: 'visit' };
  if (w === 'giver') return { kind: 'giver' };
  if (w.indexOf('door:') === 0 && w.length > 5) return { kind: 'door', plot: w.slice(5) };
  return null;
}

/** What a quest's road leads to now: its giver once its objective is met; the
    land it names; its current step's resource or way (a quest with steps), or
    its own resource or way -- or null (a step done anywhere: light a fire). */
export function wayOf(q, steps, done) {
  if (!q) return null;
  if (done) return q.npc ? { kind: 'giver', npc: q.npc } : null;
  if (q.zone) return { kind: 'land', land: q.zone };
  let w;
  if (Array.isArray(steps) && steps.length) {
    const cur = steps.find((s) => s && s.current);
    if (cur && cur.node) return { kind: 'node', node: cur.node };
    w = parseWay((cur && cur.way) || q.way);
  } else {
    if (q.node) return { kind: 'node', node: q.node };
    w = parseWay(q.way);
  }
  /* v2.3.3519: 'giver' is the quest's own, named here -- a way written as
     data says no name (and one with no giver leads nowhere) */
  if (w && w.kind === 'giver') return q.npc ? { kind: 'giver', npc: q.npc } : null;
  return w;
}

/** The buildings you have been through: a Set of BUILDINGS indexes however
    the stats hold it (a Set; an array or an object after a save) */
export function visitedSet(v) {
  if (v instanceof Set) return v;
  const out = new Set();
  if (Array.isArray(v)) { for (const x of v) out.add(Number(x)); }
  else if (v && typeof v === 'object') { for (const k of Object.keys(v)) out.add(Number(v[k])); }
  return out;
}

/* ── the lands ──
   `geom`: { c (the Wheel's middle, game px), lands {land: [x, y]} (the middle
   of each land's monsters), firstR {land: r} (the long Wheel's: where each
   land's monsters begin) or null, homes [lands], safeR, landAt(x, y) }. */

/** Where a land's road ends: on the long Wheel LAND_IN_PX past where its
    monsters begin (v2.3.3320), on the short one their middle. */
export function landStart(geom, land) {
  if (!geom || !own(geom.lands, land)) return null;
  if (Array.isArray(geom.homes) && geom.homes.indexOf(land) < 0) return null;
  const spot = geom.lands[land];
  if (!Array.isArray(spot)) return null;
  const r0 = own(geom.firstR, land) ? Number(geom.firstR[land]) : 0;
  if (r0 > 0) {
    const dx = spot[0] - geom.c, dy = spot[1] - geom.c, d = Math.hypot(dx, dy) || 1;
    return { x: Math.round(geom.c + (dx / d) * (r0 + LAND_IN_PX)), y: Math.round(geom.c + (dy / d) * (r0 + LAND_IN_PX)), land, r0 };
  }
  return { x: spot[0], y: spot[1], land, r0: 0 };
}

/** Among that land's monsters already (the v2.3.2990 / v2.3.3320 rule). */
export function landHere(geom, land, P) {
  const s = landStart(geom, land);
  if (!s || !P) return false;
  if (s.r0 > 0) return Math.hypot(P.x - geom.c, P.y - geom.c) >= s.r0 && geom.landAt(P.x, P.y) === land;
  const spot = geom.lands[land];
  return Math.hypot(P.x - spot[0], P.y - spot[1]) < LAND_HERE_R;
}

/** Out on any land's spoke, past where its monsters begin (and off the safe
    ground): a quest that any monster will do is done right here. */
export function amongMonsters(geom, P) {
  if (!geom || !P || typeof geom.landAt !== 'function') return false;
  const land = geom.landAt(P.x, P.y);
  const s = land ? landStart(geom, land) : null;
  if (!s) return false;
  const spot = geom.lands[land];
  const begin = s.r0 > 0 ? s.r0 : Math.hypot(spot[0] - geom.c, spot[1] - geom.c) - LAND_HERE_R;
  return Math.hypot(P.x - geom.c, P.y - geom.c) >= Math.max(begin, Number(geom.safeR) || 0);
}

/** The nearest land's road's end (its level 1s), or null. */
export function nearestLandStart(geom, P) {
  if (!geom || !P || !geom.lands) return null;
  const lands = Array.isArray(geom.homes) ? geom.homes : Object.keys(geom.lands);
  let best = null, bd = Infinity;
  for (const land of lands) {
    const s = landStart(geom, land);
    if (!s) continue;
    const d = Math.hypot(s.x - P.x, s.y - P.y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

function _near(P, d, r) {
  return !!P && !!d && Math.hypot(P.x - d.x, P.y - d.y) < r;
}

/** The place one way leads to, HERE, or null (nothing to point at here). */
export function pointFor(w, ctx) {
  const P = (ctx && ctx.P) || null;
  switch (w && w.kind) {
    case 'giver': {
      const n = ctx.npcAt ? ctx.npcAt(w.npc) : null;
      return n ? { x: n.x, y: n.y, npc: w.npc } : null;
    }
    case 'land': {
      const s = landStart(ctx.geom, w.land);
      if (!s) return null;
      if (landHere(ctx.geom, w.land, P)) return HERE;
      return { x: s.x, y: s.y, zoneId: w.land, land: true };
    }
    case 'monsters': {
      if (!ctx.geom) return null;
      if (amongMonsters(ctx.geom, P)) return HERE;
      const s = nearestLandStart(ctx.geom, P);
      return s ? { x: s.x, y: s.y, zoneId: s.land, land: true } : null;
    }
    case 'node': {
      const n = ctx.nodeNear ? ctx.nodeNear(w.node) : null;
      if (!n) return null;
      if (n.d < GATHER_HERE_R) return HERE;
      return { x: n.x, y: n.y, node: w.node };
    }
    case 'door': {
      const d = (ctx.doors || []).find((o) => o && o.id === w.plot);
      if (!d || d.closed) return null;
      if (_near(P, d, DOOR_HERE_R)) return HERE;
      return { x: d.x, y: d.y, door: d.id };
    }
    case 'visit': {
      const seen = visitedSet(ctx.visited);
      const left = (ctx.doors || []).filter((o) => o && o.index >= 0 && !o.closed && !seen.has(o.index));
      if (!left.length) return null;
      if (left.some((o) => _near(P, o, DOOR_HERE_R))) return HERE;
      let best = left[0], bd = Infinity;
      if (P) for (const o of left) { const dd = Math.hypot(o.x - P.x, o.y - P.y); if (dd < bd) { bd = dd; best = o; } }
      return { x: best.x, y: best.y, door: best.id };
    }
    default: return null;
  }
}

/** The road's end for the active quests, in routeOrder: the first quest whose
    way has a place here; null when one says you are there, or none has one.
    `ctx`: { order (routeOrder's), steps(q), P, npcAt(name), doors, visited,
    nodeNear(kind) -> {x, y, d}, geom }.  The answer carries `qid` (whose road
    it is) and `way` (its kind). */
export function wheelWay(ctx) {
  const order = (ctx && ctx.order) || [];
  for (const e of order) {
    if (!e || !e.q) continue;
    const w = wayOf(e.q, ctx.steps ? ctx.steps(e.q) : null, !!e.done);
    if (!w) continue;
    const pt = pointFor(w, ctx);
    if (pt === HERE) return null;
    if (pt) { pt.qid = e.qid; pt.way = w.kind; return pt; }
  }
  return null;
}
