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
 * jumps. */
import { figureFeetY } from './systems/entityRenderer.js';
import { jumpActive, jumpHeight } from '../game/jump.js';

export class JumpFx {
  constructor() {
    this._probe = { self: null, peers: 0, ms: 0 };
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
        const j = S._jump && jumpActive(S._jump, now) ? S._jump : null;
        const h = this._lift(pd, j, now);
        if (j) p.self = { lift: +h.toFixed(2), y: +pd.y.toFixed(1), feet: +figureFeetY(pd).toFixed(1),
          pose: pd._lastPoseKey || null, dir: pd._lastFacingKey || null, frame: pd._jumpFrameIdx != null ? pd._jumpFrameIdx : null };
      }
      if (er.otherPlayerDisplays) {
        const others = S.others || null;
        for (const [id, d] of er.otherPlayerDisplays) {
          if (!d || d.destroyed) continue;
          const o = others && others[id];
          let j = o && o._jump ? o._jump : null;
          if (j && !jumpActive(j, now)) { o._jump = null; j = null; }
          if (!d.visible) j = null;
          if (this._lift(d, j, now) > 0) p.peers++;
        }
      }
    }
    p.ms = +(performance.now() - t0).toFixed(3);
  }

  /* put the figure back where it stands, then lift it by this frame's
     height (none on the ground); returns the lift in world px */
  _lift(d, j, now) {
    if (d._jumpY != null && d.y === d._jumpY) d.y += d._jumpLift || 0;
    d._jumpY = null;
    d._jumpLift = 0;
    if (!j) return 0;
    const h = jumpHeight(j, now);
    if (!(h > 0.05)) return 0;
    d.y -= h;
    d._jumpY = d.y;
    d._jumpLift = h;
    return h;
  }
}
