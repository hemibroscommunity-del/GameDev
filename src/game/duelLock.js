/* ═══ A DUEL LOCKS YOU ONTO YOUR OPPONENT (v2.3.2145) ═══
 *
 * Owner: "during duel I think I was unable to block. Make sure blocking
 * behavior is normal during duels."
 *
 * BLOCKING ITSELF IS FINE, and that is worth stating because it is where the
 * search naturally starts. The worker honours a block in PvP through the same
 * directional arc as a monster attack (_blockArcCovers against the
 * lag-compensated history, combat.js), and mp-duelfeel measures it in a real
 * duel: sword-and-block ends the round in ~14s against ~12s open, and holding
 * the shield does not make you unkillable. Nothing on the server is gating a
 * duel differently.
 *
 * WHAT IS MISSING IS THE BUTTON. The on-screen block control lives in
 * LockOnActions, whose first line is `if (!S || !S.lockedTarget) return null;`.
 * Starting a duel has never set a lock. So through a whole duel there is no
 * block button anywhere on screen, and the only way to raise a shield is the
 * BlockRing gesture -- a double-tap-and-hold on the right joystick -- which
 * nothing in the duel tells you about. "Unable to block" is exactly what that
 * feels like.
 *
 * The lock is what a duel already MEANS: you are fighting that person, the
 * game aims at them, and the shield points at them. BroTown's own tap handler
 * agrees -- tapping a player opens their inspect card UNLESS they are your
 * duel opponent, in which case it locks on instead. This just stops making the
 * player discover that mid-fight.
 *
 * Deliberately NOT sticky: it writes the same {type:'player', id, ref} shape
 * that tap-to-lock writes, so tapping the opponent still toggles it off and
 * every other lock path keeps working unchanged. If the opponent is not in
 * S.others yet (the accept can beat the first peer snapshot), it does nothing
 * rather than inventing a target -- a lock whose `ref` is a stub would aim the
 * shield at coordinates that never update.
 */
export function lockOntoDuelOpponent(S, opponentId) {
  if (!S || !opponentId) return false;
  const others = S.others || null;
  const foe = others ? others[opponentId] : null;
  if (!foe) return false;
  /* Never stamp over a lock the player chose themselves this instant on some
     other target -- but a duel is the strongest claim on your attention, so
     an EXISTING lock on anyone else is replaced. The only case left alone is
     already being locked onto this same opponent. */
  if (S.lockedTarget && String(S.lockedTarget.id) === String(opponentId)) return true;
  S.lockedTarget = { type: 'player', id: opponentId, ref: foe };
  return true;
}
