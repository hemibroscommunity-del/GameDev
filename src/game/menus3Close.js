/* ═══ v2.3.6860: THE NEW MENUS' CLOSE RULES (card MN step 1) ═══
 *
 * The card's "Decided" 1 (docs/design/menus3/DECISIONS.md): a menu closes on
 * its X, a tap on the world, a swipe down on its header, Esc, and a hit taken
 * outside a safe place.  The numbers are the owner's wireframe's (v4.4:
 * a world tap moves less than 10 px; a header swipe down past 36 px; on the
 * drawer a swipe right past 42 px closes too).  Under `?menus3` these close
 * whichever menu is open: the new panel, or today's band a dock button or a
 * shortcut opened (step 1: every section still opens today's screen).
 *
 * The hit is read off the one stamp the game writes when you are hurt
 * (S.lastDamageTaken, every monster's and a duel's hit; src/game/thumbSide.js
 * hurtLately reads the same), so no wire is touched: a NEW stamp while a menu
 * is open and you stand outside a safe place closes it.  No imports: node's
 * suite reads this. */

export const MENUS3_CLOSE = Object.freeze({
  TAP_MOVE: 10,      /* px: a world press that moved less is a tap */
  SWIPE_DOWN: 36,    /* px: a header swipe down past this closes */
  SWIPE_RIGHT: 42,   /* px: the drawer's header swiped right past this closes */
});

export const MENUS3_CLOSE_WAYS = Object.freeze(['x', 'world', 'swipe', 'esc', 'hit']);

/** Why this event closes the menu ('x', 'world', 'swipe', 'esc', 'hit'), or
 *  null when it does not.  `ev`: {kind:'x'} | {kind:'world', dx, dy} |
 *  {kind:'swipe', dx, dy, shape} | {kind:'key', key} | {kind:'hit', safe}. */
export function menus3CloseWhy(ev) {
  if (!ev || typeof ev !== 'object') return null;
  const dx = Number(ev.dx) || 0, dy = Number(ev.dy) || 0;
  switch (ev.kind) {
    case 'x': return 'x';
    case 'world': return (dx * dx + dy * dy) < MENUS3_CLOSE.TAP_MOVE * MENUS3_CLOSE.TAP_MOVE ? 'world' : null;
    case 'swipe':
      if (dy > MENUS3_CLOSE.SWIPE_DOWN && dy > Math.abs(dx)) return 'swipe';
      if (ev.shape === 'drawer' && dx > MENUS3_CLOSE.SWIPE_RIGHT && dx > Math.abs(dy)) return 'swipe';
      return null;
    case 'key': return ev.key === 'Escape' || ev.key === 'Esc' ? 'esc' : null;
    case 'hit': return ev.safe ? null : 'hit';
    default: return null;
  }
}

/** A frame's look at the hurt stamp.  `seen` the stamp read last time,
 *  `stamp` S.lastDamageTaken now, `open` a menu is open, `safe` you stand in
 *  a safe place.  { seen, close }: close true once for a new hit while open
 *  outside a safe place; a hit while nothing is open only moves `seen`. */
export function menus3HitStep(seen, stamp, open, safe) {
  const t = Number(stamp) || 0;
  const was = Number(seen) || 0;
  if (!(t > was)) return { seen: was, close: false };
  return { seen: t, close: !!open && menus3CloseWhy({ kind: 'hit', safe: !!safe }) === 'hit' };
}
