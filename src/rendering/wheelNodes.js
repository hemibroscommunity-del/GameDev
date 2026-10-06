/* ═══ v2.3.3012: THE WHEEL'S RESOURCES, AS THE RENDERER SEES THEM ═══
 *
 * Owner, 2026-10-03: "Add harvestable resources back to the wheel" -- and,
 * earlier: "fishing could be bodies of water close to town with active fishing
 * areas showing fish swimming around in the water".
 *
 * The worker grows ~130 nodes over the Wheel's 43,008 px (server/src/
 * wheelzone.js, baked by tools/world/bake-wheel-spawns.mjs): copper, pine and
 * minnows on the safe ground round town, iron, softwood and clownfish at
 * levels 1-10, black steel, hardwood and trout at 11-20.  An ordinary zone has
 * nine, all on screen or nearly, and effectsRenderer's _updateGatherNodes
 * builds a sprite and up to five Texts for every one it is handed.  Two things
 * are the Wheel's own, and live here:
 *
 *   wheelNodeView  which nodes are near enough the view to draw.  The rest hold
 *                  no display at all -- disposed going out, rebuilt coming
 *                  back, as the far monsters are left undrawn (entityRenderer
 *                  FAR_MARGIN).  Their game state is untouched: the walk test,
 *                  the HARVEST button and the reach test read S.gatherNodes
 *                  whole, and a node far from you is far from them too.
 *
 *   WheelFish      a fishing spot is FISH IN THE WATER, not the old painted
 *                  pond: the Wheel's spots stand in its real ponds, river and
 *                  sea (the bake puts water all round each spot's own side and
 *                  dry ground under the angler's seat), so a pond picture
 *                  would be a puddle drawn on a lake.  A few fish circle under
 *                  the surface where your line will fall, rings open where
 *                  they rise, and the kind tells the tier: a school of silver
 *                  minnows, orange clownfish, big olive trout.  Drawn in code
 *                  (nothing to load), on the ground-loot layer like the pond
 *                  was, so a monster wading past covers them.  Fished out, the
 *                  fish are gone until the spot comes back.
 */
import { Container, Graphics } from 'pixi.js';
import { zoneHomes } from '@/data/zones.js';
import { wheelWaterAt } from '@/game/wheelTrial.js';   /* the ground as drawn: a fish over the bank dives */

/* Past the view's half-diagonal, how far a node's ANCHOR may be and still be
   drawn.  A tree's art stands up to ~195 world px above its anchor and ~60
   either side of it, so 320 keeps every node whose picture reaches the screen;
   HYST more before one is let go, so a step back and forth across the line
   does not rebuild it. */
export const WHEEL_NODE_MARGIN = 320;
export const WHEEL_NODE_HYST = 400;

/** null outside a zone of other zones' monsters (every node drawn, as ever);
 *  in the Wheel a predicate `near(node)`, true for the nodes to draw.  It
 *  keeps `_wheelNear` on each node for the hysteresis, and marks a node that
 *  comes into view already worked as having had its break: the ore-break
 *  animation is for the moment a vein is mined, not for walking up to one
 *  that was mined while you were away. */
export function wheelNodeView(S) {
  if (!S || !zoneHomes(S.currentZone)) return null;
  /* the view's middle and half-diagonal; before the first frame has a view,
     the player and a phone's (a predicate in the Wheel, ALWAYS: a null here
     would draw all ~130, and a fishing spot as the old pond picture) */
  const view = !!(S.camera && S._viewW > 0 && S._viewH > 0);
  const P = S.player || { x: 0, y: 0 };
  const cx = view ? S.camera.x + S._viewW / 2 : P.x, cy = view ? S.camera.y + S._viewH / 2 : P.y;
  const rIn = (view ? Math.hypot(S._viewW, S._viewH) / 2 : 900) + WHEEL_NODE_MARGIN;
  const rOut = rIn + WHEEL_NODE_HYST;
  const in2 = rIn * rIn, out2 = rOut * rOut;
  return (n) => {
    const dx = n.x - cx, dy = n.y - cy, d2 = dx * dx + dy * dy;
    const was = n._wheelNear === true;
    const near = d2 <= (was ? out2 : in2);
    if (near && !was && !n.alive) n._breakPlayed = true;
    n._wheelNear = near;
    return near;
  };
}

/* Each tier's fish.  len is nose to tail in world px (a bro is ~64 tall);
   n how many swim at a spot; school: they follow one another round rather
   than each keeping its own circle; speed scales the swim.  The Wheel's water
   pictures are bright, so the fish are drawn strong -- a silver minnow with
   a dark back, an orange clownfish, an olive trout -- each over its own dark
   shadow a few px down, which is what makes a fish read as IN the water from
   above (the first cut, 10-18 px and pale, was all but invisible on a phone:
   mp-wheelnodes' picture). */
const FISH_LOOK = {
  1:  { n: 6, len: 16, body: 0xb7c7d4, back: 0x3a5163, alpha: 0.92, school: true, speed: 1.1 },   /* minnows */
  6:  { n: 3, len: 19, body: 0xff7d1f, back: 0xb84a10, alpha: 0.95, bands: 0xfffaf2, speed: 0.85 }, /* clownfish */
  11: { n: 3, len: 25, body: 0x8f8a52, back: 0x4f4a2c, alpha: 0.95, spots: 0x2e2a18, speed: 0.6 },  /* trout */
  /* v2.3.3085: the second stage's (levels 21-40): a pink salmon, a long olive pike */
  16: { n: 3, len: 27, body: 0xf08a78, back: 0x8a3c34, alpha: 0.95, spots: 0x5a2420, speed: 0.6 },   /* salmon */
  21: { n: 2, len: 31, body: 0x7a9a4a, back: 0x34461e, alpha: 0.95, spots: 0xd8e0a0, speed: 0.5 },   /* pike */
};
const lookFor = (lvl) => FISH_LOOK[lvl >= 21 ? 21 : lvl >= 16 ? 16 : lvl >= 11 ? 11 : lvl >= 6 ? 6 : 1];   /* v2.3.3085: + 16, 21 */

/* Where the fish swim, from the spot's anchor (where the line lands).  The
   bake guarantees water in a block west of the spot -- three cells west of it
   to its own, one up and down (bake-wheel-spawns.mjs SPOT_SIDE): x-84..x+12 by
   y-36..y+36 -- and the shore east of it, under the angler.  So the school's
   circle, centred just west of the line, stays inside the block nose and
   tail: x-30 +/- 26 and a fish's half-length (a trout's 12.5) is
   x-69..x+9, y +/- 18 and it is y-31..y+31.
   v2.3.3012: was x-18 +/- 32 by +/- 20, inside the first bake's bigger 5 x 5
   block, which only a perfectly straight shore had (the owner: "Make all 8
   have fishing spots"). */
const SWIM_DX = -30;
const SWIM_RX = 26, SWIM_RY = 18;

/* v2.3.3035: the top of a spot's school, where the harvest's bar hangs over
   it (effectsRenderer _nodeHpBarAt; owner: "appear above the resource") --
   in the Wheel a spot is its fish, with no pond picture to measure: the
   school's centre, and the top of its circle less a fish's half length. */
export function wheelFishTop(node) {
  const look = lookFor((node && node.gatherLvl) || 1);
  return { x: node.x + SWIM_DX, top: node.y - SWIM_RY - look.len / 2 };
}

/* a stable 0..1 from a few numbers, so a spot's fish are the same every visit */
function hash01(a, b, c) {
  const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

function drawFish(g, look, shadow) {
  const L = look.len, rx = L * 0.5, ry = L * (look.bands ? 0.22 : 0.17);
  if (shadow) {
    g.ellipse(0, 0, rx * 1.05, ry * 1.2).fill({ color: 0x06202c, alpha: 0.38 });
    g.poly([-rx + 1, 0, -rx - L * 0.28, -ry * 1.1, -rx - L * 0.28, ry * 1.1]).fill({ color: 0x06202c, alpha: 0.38 });
    return;
  }
  /* tail first, so the body's edge covers its root */
  g.poly([-rx + 1, 0, -rx - L * 0.3, -ry * 1.15, -rx - L * 0.24, 0, -rx - L * 0.3, ry * 1.15]).fill({ color: look.back });
  g.ellipse(0, 0, rx, ry).fill({ color: look.body });
  /* the back's darker line, a fin's worth */
  g.ellipse(-L * 0.05, -ry * 0.45, rx * 0.62, ry * 0.32).fill({ color: look.back, alpha: 0.9 });
  if (look.bands) {
    g.ellipse(L * 0.16, 0, L * 0.06, ry * 0.95).fill({ color: look.bands });
    g.ellipse(-L * 0.14, 0, L * 0.06, ry * 0.85).fill({ color: look.bands });
  }
  if (look.spots) {
    const sr = Math.max(0.9, L * 0.045);
    g.circle(L * 0.08, -ry * 0.2, sr).fill({ color: look.spots });
    g.circle(-L * 0.1, ry * 0.15, sr).fill({ color: look.spots });
    g.circle(-L * 0.24, -ry * 0.1, sr * 0.9).fill({ color: look.spots });
  }
  /* the eye */
  g.circle(rx * 0.62, -ry * 0.18, Math.max(0.7, L * 0.045)).fill({ color: 0x10161c, alpha: 0.85 });
}

export class WheelFish {
  constructor(layer) {
    this.layer = layer;
    this.spots = new Map();   /* node -> { c, ring, fish: [{ g, sh, ... }] } */
  }

  _make(node) {
    const look = lookFor(node.gatherLvl || 1);
    const c = new Container();
    c.label = 'wheelFish';
    const ring = new Graphics();
    c.addChild(ring);
    const fish = [];
    const h0 = hash01(node.x, node.y, 1);
    const dir = h0 < 0.5 ? -1 : 1;
    for (let i = 0; i < look.n; i++) {
      const sh = new Graphics();
      drawFish(sh, look, true);
      const g = new Graphics();
      drawFish(g, look, false);
      g.alpha = look.alpha;
      c.addChild(sh);
      c.addChild(g);
      const h1 = hash01(node.x, node.y, 10 + i), h2 = hash01(node.x, node.y, 20 + i);
      fish.push({
        g, sh,
        /* a school shares one circle, each a little behind the one before; the
           others each keep their own, some one way and some the other */
        /* (the loners each a ring of their own, inner to outer, so two do
           not swim as one blob) */
        r: look.school ? 0.78 + 0.12 * Math.sin(i * 2.1) : 0.42 + 0.58 * ((i + h1) / look.n),
        ph: look.school ? h0 * 6.283 - i * 0.62 : h1 * 6.283,
        w: (look.school ? 1 : (0.75 + 0.5 * h2)) * look.speed * (look.school || i % 2 === 0 ? dir : -dir),
        wob: 0.5 + h2,
        vis: 1,
      });
    }
    this.layer.addChildAt(c, 0);
    return { c, ring, fish, look, seed: h0 };
  }

  /** `spots`: the live fishing spots to draw this frame (the Wheel's, near the
   *  view, worked with a pole in the bag).  Spots not in it are let go. */
  update(spots, now) {
    const t = now / 1000;
    const keep = new Set();
    for (let k = 0; k < spots.length; k++) {
      const node = spots[k];
      keep.add(node);
      let s = this.spots.get(node);
      if (!s || s.c.destroyed) { s = this._make(node); this.spots.set(node, s); }
      s.c.x = node.x + SWIM_DX;
      s.c.y = node.y;
      for (let i = 0; i < s.fish.length; i++) {
        const f = s.fish[i];
        /* a slow wander on the circle; small enough that its pull never
           outruns the swim (|w| >= 0.45, the wander's rate <= 0.32), so a
           fish never stalls and spins on the spot */
        const wob = 0.3 * Math.sin(t * 0.7 * f.wob + i * 1.7);
        const th = f.ph + f.w * t + wob;
        const dth = f.w + 0.3 * 0.7 * f.wob * Math.cos(t * 0.7 * f.wob + i * 1.7);
        const rx = SWIM_RX * f.r, ry = SWIM_RY * f.r;
        const x = rx * Math.cos(th), y = ry * Math.sin(th);
        const vx = -rx * Math.sin(th) * dth, vy = ry * Math.cos(th) * dth;
        const rot = Math.atan2(vy, vx);
        f.g.x = x; f.g.y = y; f.g.rotation = rot;
        /* the tail's beat, as a squeeze across the body */
        f.g.scale.set(1, 1 + 0.14 * Math.sin(t * 13 * s.look.speed + i * 2.3));
        f.sh.x = x + 2; f.sh.y = y + 5; f.sh.rotation = rot;
        /* over ground DRAWN as land, the fish dives out of sight and comes
           up again past it: the bake keeps a spot's water four cells by
           three (bake-wheel-spawns.mjs SPOT_SIDE), but the drawn shore
           wanders a few px off the plan's cells, and a school's edge can
           cross it (a survey of all 32 spots as drawn: one school's edge).
           Not yet laid (null): as it was. */
        const wet = wheelWaterAt(s.c.x + x, s.c.y + y);
        f.vis += ((wet === false ? 0 : 1) - f.vis) * 0.18;
        f.g.alpha = s.look.alpha * f.vis;
        f.sh.alpha = f.vis;
        f.g.visible = f.sh.visible = f.vis > 0.02;
      }
      /* rings where a fish rises: two, half a beat apart, each at its own
         place in the circle, opening and fading */
      const ring = s.ring;
      ring.clear();
      for (let j = 0; j < 2; j++) {
        const P = 2.6 + s.seed;
        const u = t / P + j * 0.5 + s.seed;
        const cyc = Math.floor(u), q = u - cyc;
        if (q > 0.62) continue;
        const k2 = q / 0.62;
        const ang = hash01(node.x, cyc, j) * 6.283, rr = 0.6 * hash01(node.y, cyc, j + 7);
        const rx = 3 + 12 * k2;
        ring.ellipse(SWIM_RX * rr * Math.cos(ang), SWIM_RY * rr * Math.sin(ang), rx, rx * 0.5)
          .stroke({ color: 0xeaf8ff, width: 1.5, alpha: 0.7 * (1 - k2) });
      }
    }
    for (const [node, s] of this.spots) {
      if (keep.has(node)) continue;
      if (!s.c.destroyed) s.c.destroy({ children: true });
      this.spots.delete(node);
    }
    if (typeof window !== 'undefined' && window.__btProbe) {
      const out = [];
      for (const [node, s] of this.spots) out.push({ id: node.id, x: node.x, y: node.y, tier: node.gatherLvl || 1, fish: s.fish.length,
        dived: s.fish.filter((f) => f.vis < 0.5).length });
      window.__btWheelFish = out;
    }
  }

  clear() {
    for (const [, s] of this.spots) if (!s.c.destroyed) s.c.destroy({ children: true });
    this.spots.clear();
  }
}
