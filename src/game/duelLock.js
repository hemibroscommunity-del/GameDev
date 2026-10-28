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
 * WHAT IS MISSING IS THE BUTTON. The on-screen block control lived in
 * LockOnActions, whose first line was `if (!S || !S.lockedTarget) return null;`.
 * Starting a duel has never set a lock. So through a whole duel there was no
 * block button anywhere on screen, and the only way to raise a shield was the
 * BlockRing gesture -- a double-tap-and-hold on the right joystick -- which
 * nothing in the duel told you about. "Unable to block" is exactly what that
 * felt like.
 * (v2.3.2242: the shield is a toggle button under the Attack button now,
 * ShieldButton.jsx, and it shows whenever a lock is held -- so this lock is
 * still what puts the block control on screen in a duel.)
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

/* ═══ v2.3.3713: THE DUEL LOCK FOLLOWS ITS OPPONENT, AND AN ARENA MATCH'S
   LOCK TAKES WHEN THE OPPONENT COMES INTO VIEW ═══
 * Found by mp-arena, the first tournament played on phones in the world: a
 * gladiator who walked off (to the Sheriff's Office's window, to read the
 * bracket) and came back swung for ninety seconds and landed nothing, while
 * the opponent's blows landed.  The lock kept `ref`, the peer object of the
 * moment it was taken; walking out of view dropped that peer and coming back
 * made a NEW one, so every swing measured its reach to where the opponent
 * stood a minute ago (monsterCombat's pvpLockInReach) and sent no attack.  A
 * monster lock is re-pointed every frame (targeting.js lockRefPresent); a
 * player lock never was.  Now it is, by id, from S.others.
 * And arena_match_start's lock could only take if the opponent was drawn
 * then (lockOntoDuelOpponent's `foe` check); a fighter across town had to
 * find the opponent and tap them.  In an arena match the opponent is the only
 * player you may hit, so the lock takes the moment they are drawn (a tap
 * still lets go for the moment; it comes back next frame, which is the point
 * of a match).  Called each frame from targeting.js updateTargeting. */
export function keepDuelLock(S) {
  if (!S) return;
  const others = S.others || null;
  const lt = S.lockedTarget;
  if (lt && lt.type === 'player' && others && lt.id != null) {
    const cur = others[lt.id];
    if (cur && cur !== lt.ref) lt.ref = cur;
    return;
  }
  const d = S._inDuel;
  if (!lt && d && d.arena && d.opponent != null && others && others[d.opponent]) lockOntoDuelOpponent(S, d.opponent);
}
