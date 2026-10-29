/* ═══ v2.3.3776: A RIDER IS DRAWN ON THE BOARD ═══
 *
 * The owner, 2026-10-28: "I just added a skateboard to the root.  I want to be
 * able to ride around on this just in the safe Brotown area."
 *
 * Run once a frame AFTER jumpFx (pixiRenderer), for you (S._ride, the
 * worker's word: game/ride.js) and every other player the tick says rides
 * (`brd`, other._brd: wsClient.js).  No new body animation: the figure keeps
 * the pose the entity pass gave it; the BOARD is a Sprite added to the
 * figure's own container BEHIND the body (child 0), its deck at the boots
 * (entityRenderer figureFeetUnits), so:
 *   - it is sorted with its rider and drawn over the ground and the shadows
 *     (which are on the ground layers), under the body;
 *   - a jump lifts it with the feet -- an ollie for free -- and it is turned
 *     back level against any lean or flip of the figure, so the board stays
 *     flat under the boots;
 *   - riding ends: the Sprite is taken off and destroyed (the texture stays:
 *     it is the loading screen's, three ~1 KB pictures, MEMORY-MAP "Ride").
 * Structural changes (the add, the remove, a change of view) happen only on
 * those edges, never every frame (TRAPS §218).
 *
 * WHICH VIEW: from the way the rider moves, the owner's three views -- north
 * or south, the board from above; east or west, from the side; a diagonal,
 * the angled one (south-east / north-west as drawn, mirrored for the other
 * two).  Standing still keeps the last.
 *
 * PRELOADING IS LAW: preloadRideArt is awaited by preloadWorldAnimations;
 * this file only LOOKS UP what it holds (never a first-use load). */
import { Assets, Sprite, Texture } from 'pixi.js';
import { figureFeetUnits } from './systems/entityRenderer.js';
import { SKATEBOARD_ART } from '../data/skateboardArt.js';

const V = '?v=2.3.3776';
const URL_OF = {
  top: '/sprites/ride/' + SKATEBOARD_ART.views.top.file + V,
  angled: '/sprites/ride/' + SKATEBOARD_ART.views.angled.file + V,
  side: '/sprites/ride/' + SKATEBOARD_ART.views.side.file + V,
};
/** the button's face (RideButton.jsx): the board from above */
export const RIDE_ICON_URL = URL_OF.top;

/* where the boots stand on each picture, as a share of it: the deck's middle
   (the side's deck line from the cut, a few picture px down) */
const ANCHOR = {
  top: { x: 0.5, y: 0.3 },   /* going north or south the board runs toward you: most of it below the boots, where the legs do not hide it */
  angled: { x: 0.5, y: 0.5 },
  side: { x: 0.5, y: Math.min(0.6, (SKATEBOARD_ART.views.side.deckTop + 5) / SKATEBOARD_ART.views.side.h) },
};
/* world px a picture px (the art law's 2 picture px a game px) */
const WORLD_PER_ART = 1 / (SKATEBOARD_ART.artPerGame || 2);

const _tex = Object.create(null);
export function preloadRideArt() {
  return Promise.all(Object.keys(URL_OF).map((k) => Assets.load(URL_OF[k])
    .then((t) => { if (t) _tex[k] = t; return t; }, () => null)));
}
function texOf(k) {
  const t = _tex[k];
  return t && !t.destroyed ? t : null;
}

/* the view and its mirror from a walk (vx, vy: + east, + south) */
function viewOf(vx, vy, last) {
  const ax = Math.abs(vx), ay = Math.abs(vy);
  if (ax < 0.05 && ay < 0.05) return last || { k: 'side', m: false };
  if (ax > ay * 2.2) return { k: 'side', m: vx < 0 };
  if (ay > ax * 2.2) return { k: 'top', m: false };
  /* south-east and north-west lie along the picture's own diagonal */
  return { k: 'angled', m: (vx > 0) !== (vy > 0) };
}

/* ═══ v2.3.3857: THE WHEELS ROLL ═══
   The owner, 2026-10-29: "use code to make the skateboard wheels appear
   moving using lighting or wobble just a bit whatever you think looks good".
   No new picture: each wheel wears small light spots (Texture.WHITE, tinted)
   that turn with the ground covered -- two on opposite sides of the hub from
   the side and at an angle, a glint sliding along the tread from above -- and
   the deck dips half a game px now and then, as over the cobbles.  Still when
   the board is still.  The spots are made when the board is, and destroyed
   with it: a change of view only moves and sizes them, so no frame changes a
   layer's draw list (TRAPS §218).
   WHEELS: each wheel's hub in picture px and the spot's orbit (`r`), or for
   the view from above the tread's run along y (`y0`..`y1`), measured off the
   three pictures (tools/art/cut-skateboard.mjs's cut).  `?boardroll=0`: off
   for one tab (BOARD_ROLL). */
const WHEELS = {
  side: [{ x: 33, y: 39, r: 4.5 }, { x: 142, y: 39, r: 4.5 }],
  angled: [{ x: 12, y: 42, r: 4.5 }, { x: 75, y: 83, r: 4.5 }],
  top: [{ x: 5.5, y0: 20, y1: 29 }, { x: 56, y0: 21, y1: 29 }, { x: 4, y0: 84, y1: 95 }, { x: 57, y0: 84, y1: 94 }],
};
const SPOTS = 4;                 /* sprites a board: side and angled 2 wheels x 2 spots, from above 4 wheels x 1 */
const SPOT_TINT = 0xffe8de, SPOT_ALPHA = 0.75;
const TURNS_PER_PX = 1 / 120;    /* how far the spots turn a game px rolled: ~2.5 turns a second at the board's 300 px -- read as a roll, not a strobe */
const BOB_EVERY_PX = 90;         /* the deck dips this often... */
const BOB_PX = 0.5;              /* ...by this much (one picture px) */
const ROLL_MIN_PX = 0.3;         /* a frame's step that counts as rolling (the board covers ~5 px a frame) */
/* `?boardroll=0` in the address: the board as it was, no spots and no dip
   (one tab, to compare) */
const BOARD_ROLL = (() => {
  try { return !/(^|[?&])boardroll=(0|off|false)(&|$)/.test(window.location.search || ''); } catch (e) { return true; }
})();

export class RideFx {
  constructor() {
    this._probe = { self: null, peers: 0, held: 0 };
    if (typeof window !== 'undefined') {
      const self = this;
      /* v2.3.3857: (box: true) and where your board is on the screen, for a
         test's picture of it -- worked out only when asked */
      window.__btRideFx = (o) => {
        if (!(o && o.box)) return self._probe;
        const b = self._selfBoard;
        if (!b || b.destroyed || !b.parent) return null;
        const r = b.getBounds();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      };
    }
  }

  update(S, er) {
    const p = this._probe;
    p.self = null;
    p.peers = 0;
    if (!S || !er) return;
    const pd = er.playerDisplay;
    if (pd && !pd.destroyed) {
      const on = !!(S._ride && S._ride.on) && !(S.rpg && S.rpg.hp <= 0);
      const v = S.player ? viewOf(S.player.vx || 0, S.player.vy || 0, pd._rideView) : null;
      if (v && S.player) v.vy = S.player.vy || 0;   /* v2.3.3857: which way the wheels turn */
      const b = this._board(pd, on, v);
      this._selfBoard = b;
      p.held = (pd._rideBoard ? 1 : 0) + (pd._rideSpots ? pd._rideSpots.length : 0);   /* v2.3.3857: the board and its spots, on or off */
      if (b) p.self = { view: pd._rideView.k, mirror: pd._rideView.m, y: +b.y.toFixed(1), feet: +figureFeetUnits(pd).toFixed(1),
        /* v2.3.3857: the wheels' turn so far, and their spots */
        turn: +(pd._rideTurn || 0).toFixed(3), spots: pd._rideSpots ? pd._rideSpots.length : 0,
        spot0: pd._rideSpots && pd._rideSpots[0] ? [+pd._rideSpots[0].x.toFixed(2), +pd._rideSpots[0].y.toFixed(2)] : null };
    }
    if (er.otherPlayerDisplays) {
      const others = S.others || null;
      for (const [id, d] of er.otherPlayerDisplays) {
        if (!d || d.destroyed) continue;
        const o = others && others[id];
        const on = !!(o && o._brd && !o._isDead && d.visible);
        const v = o ? viewOf(o._vx || 0, o._vy || 0, d._rideView) : null;
        if (v && o) v.vy = o._vy || 0;   /* v2.3.3857 */
        if (this._board(d, on, v)) p.peers++;
      }
    }
  }

  /* the board under one figure, or none; returns it while drawn */
  _board(d, on, v) {
    let b = d._rideBoard;
    if (!on) {
      if (b) {
        d._rideBoard = null;
        d._rideView = null;
        if (!b.destroyed) { if (b.parent) b.parent.removeChild(b); b.destroy(); }
      }
      dropSpots(d);   /* v2.3.3857 */
      return null;
    }
    const view = v || d._rideView || { k: 'side', m: false };
    const tex = texOf(view.k);
    if (!tex) return null;   /* not loaded: nothing drawn (never a first-use load) */
    if (!b || b.destroyed) {
      b = new Sprite(tex);
      b.label = 'rideBoard';
      d.addChildAt(b, 0);
      d._rideBoard = b;
    }
    const last = d._rideView;
    if (!last || last.k !== view.k || last.m !== view.m) {
      if (b.texture !== tex) b.texture = tex;
      const a = ANCHOR[view.k];
      b.anchor.set(a.x, a.y);
      d._rideView = { k: view.k, m: view.m };
    }
    /* world size whatever the figure's own scale, mirrored by the view */
    const sx = Math.abs(d.scale.x) > 1e-3 ? Math.abs(d.scale.x) : 1;
    const sy = Math.abs(d.scale.y) > 1e-3 ? Math.abs(d.scale.y) : 1;
    const k = WORLD_PER_ART;
    const wantX = (view.m ? -1 : 1) * k / sx * Math.sign(d.scale.x || 1);
    const wantY = k / sy;
    if (b.scale.x !== wantX || b.scale.y !== wantY) b.scale.set(wantX, wantY);
    const fy = figureFeetUnits(d);
    /* v2.3.3857: the ground covered since the last frame, in game px (the
       figure's own place: yours and a peer's alike) -- the wheels' turn and
       the deck's dip */
    const roll = d._rideRoll || (d._rideRoll = { x: d.x, y: d.y, dist: 0 });
    const step = Math.hypot(d.x - roll.x, d.y - roll.y);
    roll.x = d.x; roll.y = d.y;
    /* a step under ROLL_MIN_PX is the settle after a stop (a few tenths of a
       px), not a roll; one over 60 a place set, not rolled to */
    const rolling = step > ROLL_MIN_PX && step < 60;
    if (rolling) roll.dist += step;
    const bob = BOARD_ROLL && rolling && Math.sin(roll.dist / BOB_EVERY_PX * Math.PI * 2) > 0.6 ? BOB_PX / sy : 0;
    if (b.x !== 0) b.x = 0;
    if (b.y !== fy + bob) b.y = fy + bob;
    /* level against a lean or a flip of the figure (jumpFx) */
    const r = -(d.rotation || 0);
    if (b.rotation !== r) b.rotation = r;
    if (BOARD_ROLL) spots(d, b, view, roll.dist, v);
    return b;
  }
}

/* v2.3.3857: the wheels' spots, placed on the board as it is drawn this
   frame (its anchor, scale, mirror and level turn), made the first frame of
   a ride, next to the board (child 1: over it, under the body) */
function spots(d, b, view, dist, v) {
  let list = d._rideSpots;
  if (!list) {
    list = [];
    for (let n = 0; n < SPOTS; n++) {
      const q = new Sprite(Texture.WHITE);
      q.label = 'rideSpot';
      q.tint = SPOT_TINT;
      q.alpha = SPOT_ALPHA;
      q.anchor.set(0.5);
      d.addChildAt(q, Math.min(d.children.length, 1 + n));
      list.push(q);
    }
    d._rideSpots = list;
  }
  const W = WHEELS[view.k], tex = b.texture;
  const tw = tex.orig ? tex.orig.width : tex.width, th = tex.orig ? tex.orig.height : tex.height;
  const ax = b.anchor.x * tw, ay = b.anchor.y * th;
  const cr = Math.cos(b.rotation), sr = Math.sin(b.rotation);
  /* which way the wheels turn in the picture: forward is the picture's own
     way along (east from the side, drawn mirrored going west); at an angle
     forward is south-east (south-west mirrored), so a rider going north
     turns them back; from above, a rider going south runs down the picture */
  const vy = v ? v.vy : 0;
  const dir = view.k === 'side' ? 1 : (vy < 0 ? -1 : 1);
  const turn = dist * TURNS_PER_PX * dir;
  const put = (q, px, py, w, h) => {
    const lx = (px - ax) * b.scale.x, ly = (py - ay) * b.scale.y;
    const x = b.x + lx * cr - ly * sr, y = b.y + lx * sr + ly * cr;
    if (q.x !== x) q.x = x;
    if (q.y !== y) q.y = y;
    const sx = Math.abs(b.scale.x) * w, sy2 = Math.abs(b.scale.y) * h;
    if (q.scale.x !== sx || q.scale.y !== sy2) q.scale.set(sx, sy2);
    if (q.rotation !== b.rotation) q.rotation = b.rotation;
  };
  if (view.k === 'top') {
    /* a glint along each tread, top to bottom and round again */
    const f = ((turn % 1) + 1) % 1;
    for (let n = 0; n < SPOTS; n++) {
      const w = W[n];
      put(list[n], w.x, w.y0 + (w.y1 - w.y0) * f, 2, 2);
    }
  } else {
    /* two spots on opposite sides of each hub, turning */
    const a = turn * Math.PI * 2;
    for (let n = 0; n < SPOTS; n++) {
      const w = W[n >> 1], ang = a + (n & 1) * Math.PI;
      put(list[n], w.x + Math.cos(ang) * w.r, w.y + Math.sin(ang) * w.r, 2, 2);
    }
  }
  d._rideTurn = turn;
}
function dropSpots(d) {
  const list = d._rideSpots;
  d._rideSpots = null;
  d._rideRoll = null;
  if (!list) return;
  for (const q of list) if (q && !q.destroyed) { if (q.parent) q.parent.removeChild(q); q.destroy(); }
}
