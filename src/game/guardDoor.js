/* ═══ v2.3.5521: THE GUARD'S PAGE DOOR -- ONE WRITER OF YOUR RAISED SHIELD (card L PR 5) ═══
 * (docs/specs/guard-door.md; held by server/test/guard-page-door.test.mjs and
 * the phase table's guard, tools/guards/phase-table.test.mjs)
 *
 * Your shield on the phone is down or up: ONE field, `S._shieldUp`, which
 * every reader already reads (the move's `blocking`, the button, the
 * renderer, the coach).  Two files wrote it in three places; now only
 * guardTo does, by a way of GUARD_PAGE_WAYS:
 *   raise  shieldToggle.js raiseShieldToggle   up: the button, a key, the
 *                                              mouse (all through it)
 *   raise  playerActions.js raiseShield        up: the old raise, unused
 *                                              since v2.3.2242 (nothing
 *                                              imports it), kept behind the
 *                                              same door
 *   drop   shieldToggle.js dropShield          down: a tap, a block landed,
 *                                              a dodge, the stamina's
 *                                              release, a death (its `why`)
 * The door's rules are the callers' own checks, so nothing a player sees
 * changes: up only from down, with a shield in hand and out of the cooldown
 * a broken guard leaves (`_shieldCdUntil`); down only from up (dropShield:
 * one drop, one word to the worker).  `?guarddoor=0` lifts them, as the
 * lines before the door.  The refusals that need the world (swimming, dazed,
 * mid-jump) stay with raiseShieldToggle, which asks them first.
 *
 * Not folded here, notes beside the door: which input holds it
 * (`_shieldKb`, `_shieldMouse`), the cooldown and its auto-release
 * (`_shieldCdUntil`, `_shieldAutoReleased`, `shieldEnd`), the stamp of the
 * raise (`shieldActive`), the renderer's pose (`_blockPose`) and the block
 * ring's own state (ui/mobile/blockRingBus.js).  A peer's copy (`other.
 * _shieldUp`, game/shieldCopies.js) is theirs, not yours.
 *
 * One import, the page's switch reader (game/switches.js, itself of no
 * imports; card T's), by a relative path: the guard's rules are read by a
 * node test without the game.
 */
import { sw } from './switches.js';

export const GUARD_PAGE_WAYS = Object.freeze({ raise: 'up', drop: 'down' });
const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* `?guarddoor=0` -- through the page's one reader (switches.js reads the
   address at each ask), so a test can set it */
export function guardDoorOff() {
  return sw('guarddoor');
}

/* the guard's phase on this phone (the phase table's words): up, or down */
export function guardPhase(S) {
  return S && S._shieldUp ? 'up' : 'down';
}

/** THE ONE WRITER of `S._shieldUp`, by a way of GUARD_PAGE_WAYS.  `now` is
 *  the caller's clock (the cooldown's).  True when it wrote. */
export function guardTo(S, way, now) {
  if (!S || typeof S !== 'object' || !has(GUARD_PAGE_WAYS, way)) return false;
  const to = GUARD_PAGE_WAYS[way];
  if (!guardDoorOff()) {
    if (guardPhase(S) === to) return false;
    if (to === 'up') {
      if (!S.rpg || !S.rpg.shield) return false;
      if (S._shieldCdUntil && !(now >= S._shieldCdUntil)) return false;
    }
  }
  /* the two values written as such, so the state census still reads a flag */
  if (to === 'up') S._shieldUp = true;
  else S._shieldUp = false;
  return true;
}
