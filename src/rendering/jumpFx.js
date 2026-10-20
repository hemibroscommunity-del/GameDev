/* ═══ v2.3.3017: A JUMPER IS DRAWN IN THE AIR ═══
 *
 * Owner, 2026-10-03: "start working on real jumping.  Might be able to just
 * use the jog directions instead of a custom jump animation".
 *
 * Run once a frame AFTER the depth pass and the swimmers, BEFORE the lights
 * (pixiRenderer), the swim's order (swimFx.js) for the same reasons:
 *   - the figure is sorted where it STANDS -- its feet, on the ground -- and
 *     only then lifted, so a jump never changes what it is in front of;
 *   - the lights then project its pieces where they are drawn about where it
 *     stands (entityRenderer figureFeetY adds the lift back), so its sun
 *     shadow stays on the ground and slides away from the body as it rises:
 *     the gap is the height.
 * The lift is the jump's (game/jump.js jumpHeight: the peak times 4t(1-t)),
 * in world px: every bro in the Wheel is drawn at one scale.  The frame held
 * is entityRenderer's (JUMP_FRAME); the container's children -- the weapon,
 * the shield on the back, the cape, the name plate -- ride along.
 *
 * Yours is S._jump; another player's is other._jump, from the `player_jump`
 * relay (game events).  A figure left lifted by a frame the entity pass did
 * not touch is put back first (its y is still the one this left: the
 * swim's rule).  Nothing else is drawn, and nothing at all while no one
 * jumps.
 *
 * ═══ v2.3.3499: AND IT MOVES IN THE AIR ═══
 * The owner: "is there any 'jump effect' you can add just using code that
 * would make it look more realistic than just the static frame?"  The frames
 * now run through four of the jog's own (entityRenderer, game/jump.js
 * JUMP_FRAMES), and here the whole figure is SQUASHED, STRETCHED and LEANED
 * about its feet after the lift (game/jump.js jumpLook): crouched at the
 * press, long on the way up, round over the top, leaning into a run, and
 * squashed on the touch-down, springing back.  The emotes' way
 * (game/emoteMoves.js placeEmote, holdMatrix): about the feet, so the boots
 * stay over the ground they stand on, and the HUD inside the figure -- the
 * name plate and HP bar, the two spend bars -- is given the inverse of the
 * squash and lean, so it rides up with the jump but never squashes or tilts.
 * figureFeetY / figureFeetX read the ground again through `_jumpLift` and
 * `_jumpXFix`, so the shadows and anything standing on the feet are where
 * they were.  Everything this writes is put back at the start of the next
 * frame wherever nothing has written since (the entity pass writes the
 * position and scale fresh each frame, and the rotation never).  A figure
 * the entity pass is drawing another way -- hidden behind a stand-in, tipped
 * over in its death, in the water -- is only lifted, as before. */
import { Matrix } from 'pixi.js';
import { figureFeetY, figureFeetX, figureFeetUnits } from './systems/entityRenderer.js';
import { jumpActive, jumpLook } from '../game/jump.js';
import { placeEmote, holdMatrix } from '../game/emoteMoves.js';

/* v2.3.3499: how fast a figure goes across, from its WALK -- yours
   (S.player.vx) or a peer's off the wire (`_vx`), both px a 60 Hz frame --
   never from where two frames drew it: a phone drawing a few frames a second
   (or the QA box) saw no two frames close enough together and leant nothing.
   Eased by the clock (ACROSS_TAU_MS), so a slow frame lands where quick ones
   would, and a change of stick does not snap the figure over. */
const FRAME_MS = 1000 / 60;
const ACROSS_TAU_MS = 60;

export class JumpFx {
  constructor() {
    this._m = new Matrix();
    this._probe = { self: null, peers: 0, ms: 0, land: null };
    if (typeof window !== 'undefined') {
      const self = this;
      window.__btJumpFx = () => self._probe;
    }
  }

  update(S, er) {
    const t0 = performance.now();
    const now = Date.now();
    const p = this._probe;
    p.self = null;
    p.peers = 0;
    if (S && er) {
      const pd = er.playerDisplay;
      if (pd && !pd.destroyed) {
        this._restore(pd);
        const j = S._jump && jumpActive(S._jump, now) ? S._jump : null;
        const across = this._across(pd, now, S.player ? S.player.vx : 0);
        const dead = !!(S._dying || (S.rpg && S.rpg.hp <= 0));
        const look = dead ? null : jumpLook(j, now, S._jumpLandFx || null, across);
        const shaped = look ? this._apply(pd, look) : false;
        if (j || (look && shaped)) {
          p.self = {
            lift: look ? +look.lift.toFixed(2) : 0, y: +pd.y.toFixed(1), feet: +figureFeetY(pd).toFixed(2), feetX: +figureFeetX(pd).toFixed(2),
            pose: pd._lastPoseKey || null, dir: pd._lastFacingKey || null, frame: pd._jumpFrameIdx != null ? pd._jumpFrameIdx : null,
            air: !!j, t: look ? +look.t.toFixed(3) : null, u: look && !look.air ? +look.u.toFixed(3) : null,
            ky: shaped ? +look.ky.toFixed(3) : 1, kx: shaped ? +look.kx.toFixed(3) : 1, rot: shaped ? +look.rot.toFixed(4) : 0,
            shaped, across: +across.toFixed(3), hud: this._hudProbe(pd),
          };
          if (look && !look.air) p.land = { at: now, ky: p.self.ky, u: +look.u.toFixed(3) };
        }
      }
      if (er.otherPlayerDisplays) {
        const others = S.others || null;
        for (const [id, d] of er.otherPlayerDisplays) {
          if (!d || d.destroyed) continue;
          this._restore(d);
          const o = others && others[id];
          let j = o && o._jump ? o._jump : null;
          if (j && !jumpActive(j, now)) {
            /* touched down: its squash plays from the jump's own end, unless
               it came down in the water (swimFx sinks it) or dead */
            if (o && !o._isDead && !(d._swimK > 0)) d._jfxLand = { at: j.t0 + j.dur, dur: j.dur };
            o._jump = null;
            j = null;
          }
          const across = this._across(d, now, o ? o._vx : 0);
          if (!d.visible || (o && o._isDead)) { d._jfxLand = null; continue; }
          const look = jumpLook(j, now, d._jfxLand || null, across);
          if (!look) { d._jfxLand = null; continue; }
          this._apply(d, look);
          if (look.lift > 0) p.peers++;
        }
      }
    }
    p.ms = +(performance.now() - t0).toFixed(3);
  }

  /* how fast the figure goes across the screen, world px a ms (+ east), from
     its walk (`vxFrame`, px a 60 Hz frame), eased by the clock */
  _across(d, now, vxFrame) {
    const target = Number.isFinite(vxFrame) ? vxFrame / FRAME_MS : 0;
    const last = d._jfxAt;
    let v = target;
    if (last && now > last.t && now - last.t < 1000) {
      const k = 1 - Math.exp(-(now - last.t) / ACROSS_TAU_MS);
      v = last.v + (target - last.v) * k;
    }
    d._jfxAt = { t: now, v: Number.isFinite(v) ? v : 0 };
    return d._jfxAt.v;
  }

  /* the HUD as drawn, for QA: its tilt, and its width and height over what
     they are with no jump on (the name plate must never squash or lean) */
  _hudProbe(d) {
    const ui = d._uiLayer;
    if (!ui || ui.destroyed || ui.parent !== d) return null;
    d.updateLocalTransform();
    ui.updateLocalTransform();
    const m = new Matrix().appendFrom(ui.localTransform, d.localTransform);
    const rec = d._jfx;
    const h = rec ? rec.held.find((x) => x.n === ui) : null;
    const usx = h ? h.sx0 : ui.scale.x, usy = h ? h.sy0 : ui.scale.y;
    const sx0 = rec ? rec.sx0 : d.scale.x, sy0 = rec ? rec.sy0 : d.scale.y;
    const r = (v) => +v.toFixed(4);
    return { tilt: r(Math.abs(m.b) + Math.abs(m.c)), kx: r(m.a / (sx0 * usx)), ky: r(m.d / (sy0 * usy)) };
  }

  /* draw one figure in `look`: lifted, then squashed and leaned about its
     feet.  False when only the lift could be drawn. */
  _apply(d, look) {
    const x0 = d.x, y0 = d.y, sx0 = d.scale.x, sy0 = d.scale.y;
    const F = figureFeetUnits(d);
    const rec = { x0, y0, sx0, sy0, held: [] };
    d._jfx = rec;
    if (look.lift > 0.05) d.y = y0 - look.lift;
    /* only a figure drawn the plain way: upright, unskewed, from its origin,
       on dry ground and shown */
    let shaped = false;
    const plain = d.visible && d.rotation === 0 && d.skew.x === 0 && d.skew.y === 0 && d.pivot.x === 0 && d.pivot.y === 0
      && !(d._swimK > 0) && Math.abs(sx0) > 1e-3 && Math.abs(sy0) > 1e-3;
    const still = Math.abs(look.ky - 1) < 1e-4 && Math.abs(look.kx - 1) < 1e-4 && Math.abs(look.rot) < 1e-5;
    if (plain && !still) {
      /* H = 0: the HUD is never let down -- it keeps the lifted figure's place */
      const pl = placeEmote({ x: d.x, y: d.y, sx: sx0, sy: sy0 }, { hop: 0, dx: 0, rot: look.rot, kx: look.kx, ky: look.ky }, F, 0);
      if ([pl.x, pl.y, pl.sx, pl.sy, pl.q.a, pl.q.d, pl.q.tx, pl.q.ty].every(Number.isFinite)) {
        for (const n of [d._uiLayer, d._resMpBlocks, d._resEnBlocks]) {
          if (!n || n.destroyed || n.parent !== d) continue;
          if (n.rotation !== 0 || n.skew.x !== 0 || n.skew.y !== 0 || n.pivot.x !== 0 || n.pivot.y !== 0) continue;
          const u = { x: n.position.x, y: n.position.y, sx: n.scale.x, sy: n.scale.y };
          const m = holdMatrix(pl.q, u);
          this._m.set(m.a, m.b, m.c, m.d, m.tx, m.ty);
          n.setFromMatrix(this._m);
          rec.held.push({ n, x0: u.x, y0: u.y, sx0: u.sx, sy0: u.sy,
            xw: n.position.x, yw: n.position.y, sxw: n.scale.x, syw: n.scale.y, rw: n.rotation, kxw: n.skew.x, kyw: n.skew.y });
        }
        d.x = pl.x;
        d.y = pl.y;
        d.rotation = pl.rot;
        d.scale.x = pl.sx;
        d.scale.y = pl.sy;
        shaped = true;
      }
    }
    rec.xw = d.x; rec.yw = d.y; rec.rw = d.rotation; rec.sxw = d.scale.x; rec.syw = d.scale.y;
    /* the ground again, for figureFeetY / figureFeetX: what the lift, the
       squash and the lean moved the feet by, taken back off */
    d._jumpY = d.y;
    d._jumpLift = (y0 + F * sy0) - (d.y + F * d.scale.y);
    d._jumpXw = d.x;
    d._jumpXFix = d.x - x0;
    return shaped;
  }

  /* put back what this wrote last frame, wherever nothing has written since */
  _restore(d) {
    const r = d._jfx;
    if (!r) return;
    d._jfx = null;
    d._jumpY = null;
    d._jumpLift = 0;
    d._jumpXw = null;
    d._jumpXFix = 0;
    if (d.x === r.xw) d.x = r.x0;
    if (d.y === r.yw) d.y = r.y0;
    if (d.rotation === r.rw) d.rotation = 0;
    if (d.scale.x === r.sxw) d.scale.x = r.sx0;
    if (d.scale.y === r.syw) d.scale.y = r.sy0;
    for (const h of r.held) {
      const n = h.n;
      if (!n || n.destroyed) continue;
      if (n.position.x === h.xw) n.position.x = h.x0;
      if (n.position.y === h.yw) n.position.y = h.y0;
      if (n.scale.x === h.sxw) n.scale.x = h.sx0;
      if (n.scale.y === h.syw) n.scale.y = h.sy0;
      if (n.rotation === h.rw) n.rotation = 0;
      if (n.skew.x === h.kxw) n.skew.x = 0;
      if (n.skew.y === h.kyw) n.skew.y = 0;
    }
  }
}
