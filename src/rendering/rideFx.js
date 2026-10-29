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
import { Assets, Sprite } from 'pixi.js';
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

export class RideFx {
  constructor() {
    this._probe = { self: null, peers: 0 };
    if (typeof window !== 'undefined') {
      const self = this;
      window.__btRideFx = () => self._probe;
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
      const b = this._board(pd, on, v);
      if (b) p.self = { view: pd._rideView.k, mirror: pd._rideView.m, y: +b.y.toFixed(1), feet: +figureFeetUnits(pd).toFixed(1) };
    }
    if (er.otherPlayerDisplays) {
      const others = S.others || null;
      for (const [id, d] of er.otherPlayerDisplays) {
        if (!d || d.destroyed) continue;
        const o = others && others[id];
        const on = !!(o && o._brd && !o._isDead && d.visible);
        const v = o ? viewOf(o._vx || 0, o._vy || 0, d._rideView) : null;
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
    if (b.x !== 0) b.x = 0;
    if (b.y !== fy) b.y = fy;
    /* level against a lean or a flip of the figure (jumpFx) */
    const r = -(d.rotation || 0);
    if (b.rotation !== r) b.rotation = r;
    return b;
  }
}
