/* ═══ v2.3.5003: WHICH LANDS' BANNERS TO HOLD, FROM WHERE YOU STAND ═══
 *
 * The owner, 2026-11-12, offered docs/specs/pictures-256.md §7 ("hold only
 * the banner of the land you are in or walking toward"): "Yes do it".  The
 * four animated banners (Frost Ridge, the Flame Fields, the Wind Dunes, the
 * Verdant Wilds) were all held decoded for as long as you were in the world,
 * ~15.7 MB of pictures in the page at four bytes a pixel whatever their
 * colours.  Now a land's banner is held only near that land
 * (rendering/zoneBannerPreload.js wheelBannerTick asks this every 250 ms), and
 * `?banners=all` holds all four as before.
 *
 * ── "WALKING TOWARD", DECIDED BY WHERE YOU ARE, NOT WHERE YOU FACE ──
 *
 * The Wheel is BroTown and its commons in the middle and a spoke of land per
 * element (public/tools/world/core/wheel.js): every spoke a capsule three
 * zones wide, 45 degrees from the next, beginning at the commons' edge
 * (plan.js wheel.hub, 2.7 zones = 2,765 game px from the middle).  So:
 *
 *   1. YOUR SPOKE.  The land whose direction from the middle is nearest yours
 *      (zones.js wheelLandAt's rule) is the one you are on, or the one you
 *      reach walking out from where you stand.  Its banner is held -- but only
 *      from BANNER_LEAD inside the safe ground's edge outward: deep in BroTown
 *      every land is thousands of px of walking away, so the town holds NONE
 *      (it is where you arrive, and where you come back after a death).
 *   2. THE NEIGHBOUR ON YOUR SIDE, near the line between the two.  Near the
 *      commons a land's first stretch touches its neighbours' (two spokes 45
 *      degrees apart and 3 zones wide touch out to ~4,000 px from the
 *      middle), and the passes at levels 20 and 60 cross between them, so a
 *      walk SIDEWAYS can cross from one land into the next.  The border there
 *      is the line halfway between the two spokes, where wheelLandAt changes
 *      its answer, wandering up to half a square (576 px, plan.js
 *      regionWarp) either side of it -- so the nearer neighbour is held too
 *      while you are within BANNER_SIDE of that line: at least ~1,400 px
 *      before its land can begin.  Never more than two at once; out along a
 *      spoke past ~5,200 px from the middle, one.
 *   3. THE LAND UNDER YOU (the ground worker's region), if it is one, always:
 *      a belt to the braces of 1 and 2.
 *
 * Facing or heading was the other way to read "toward", and it is the wrong
 * one: a phone's stick turns in an instant, and a banner loaded by a turn
 * would come and go with every glance round.  Position changes only as fast
 * as you walk, which is what the lead is measured against.
 *
 * ── THE LEAD ──
 *
 * A strip is 171-319 KB to fetch and well under a second to decode.  From
 * BANNER_LEAD inside the safe edge (2,937 px) to the commons' edge (2,765
 * px, wandering 288 either way: plan.js commons.wobble) is at least ~1,940
 * px: 13 s at a walk (~150 px/s), 6 s on the skateboard (x2), 4 s at the
 * worker's 500 px/s move bound.  The town square, where you arrive, is 288
 * px from the middle, well inside it.  And the banner never plays before you
 * have been in the land 600 ms (zoneBannerOverlay.js LAND_DWELL_MS), and
 * then waits up to BANNER_WAIT_MS more for a strip still on its way.
 *
 * ── LET GO PAST A MARGIN ──
 *
 * A banner wanted within the lead is kept until you are BANNER_KEEP further
 * (both measures), so walking along the edge of the lead does not load and
 * drop it over and over -- the monster looks' KEEP_EXTRA, the same idea.
 *
 * Pure: no imports, so node tests it (server/test/banner-reach.test.mjs).
 */

/* world px inside the safe ground's edge (ZONES.wheel.safeR) from which your
   spoke's land's banner is held (see THE LEAD) */
export const BANNER_LEAD = 2400;
/* world px from the line between your spoke and its nearer neighbour within
   which the neighbour's banner is held too (see 2) */
export const BANNER_SIDE = 2000;
/* world px further than either before a banner is let go */
export const BANNER_KEEP = 600;

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/**
 * The lands whose banners are wanted at (x, y).
 *   g       { cx, cy, edge, lands }: the Wheel's middle (world px), the safe
 *           ground's edge (its radius), and each land's anchor ({ id: [x, y] },
 *           zones.js WHEEL_GEOM) -- every land, art or none
 *   region  the ground worker's region under you (wheelTrial.js wheelHere), or null
 *   extra   world px added to both measures: 0 for what to load, BANNER_KEEP
 *           for what to keep
 * Returns { lands, land, next, r, side }: `lands` the wanted lands (ids, with
 * or without art: the caller keeps those with a banner), `land` your spoke,
 * `next` its nearer neighbour, `r` your distance from the middle and `side`
 * from the line between the two (null where not measured).
 */
export function bannerLandsNear(g, x, y, region, extra = 0) {
  const out = { lands: [], land: null, next: null, r: null, side: null };
  if (!g || !g.lands || typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) return out;
  if (typeof region === 'string' && own(g.lands, region)) out.lands.push(region);
  const dx = x - g.cx, dy = y - g.cy, r = Math.sqrt(dx * dx + dy * dy);
  out.r = Math.round(r);
  const edge = Number(g.edge) || 0;
  if (!(r > 0) || r < edge - BANNER_LEAD - extra) return out;
  /* the two spokes nearest your direction: the larger the cosine, the nearer */
  let a = null, ac = -2, ua = null, b = null, bc = -2, ub = null;
  for (const k in g.lands) {
    if (!own(g.lands, k)) continue;
    const p = g.lands[k];
    if (!p) continue;
    const vx = p[0] - g.cx, vy = p[1] - g.cy, l = Math.sqrt(vx * vx + vy * vy);
    if (!(l > 0)) continue;
    const u = [vx / l, vy / l], c = (dx * u[0] + dy * u[1]) / r;
    if (c > ac) { b = a; bc = ac; ub = ua; a = k; ac = c; ua = u; } else if (c > bc) { b = k; bc = c; ub = u; }
  }
  if (!a) return out;
  out.land = a;
  if (!out.lands.includes(a)) out.lands.push(a);
  if (!b) return out;
  out.next = b;
  /* how far you are from the line halfway between the two (a ray out from
     the middle): across it if you are beyond the middle along it, else the
     middle itself */
  let mx = ua[0] + ub[0], my = ua[1] + ub[1];
  const ml = Math.sqrt(mx * mx + my * my);
  let side = r;
  if (ml > 1e-9) {
    mx /= ml; my /= ml;
    if (dx * mx + dy * my > 0) side = Math.abs(dx * my - dy * mx);
  }
  out.side = Math.round(side);
  if (side < BANNER_SIDE + extra && !out.lands.includes(b)) out.lands.push(b);
  return out;
}
