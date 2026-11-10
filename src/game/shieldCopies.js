/* ═══ v2.3.4393: THE PHONE'S TWO SHIELD RULES THAT DRIFTED FROM THE WORKER'S ═══
 * (the state-machine sweep, V10: the guard is kept three times -- your
 * phone's copy, the worker's, and every watcher's copy of yours -- and the
 * copies drifted)  No imports, so node tests them (server/test/shield-guard).
 *
 * 1. THE FALLBACK BLOCK IS FOR LOCAL MONSTERS ONLY.  In a zone the worker
 *    runs, a blow it stopped arrives `blocked` and never reaches the fallback;
 *    one that reaches it LANDED, its HP already off the bar.  The phone still
 *    re-judged it against its own arc and drew it as a block: no number, no
 *    red flash, 15 stamina taken locally, while the bar dropped.  v2.3.2238
 *    fixed that for a blow carrying `ability` only; a basic swing, a snowball,
 *    a pile or a boss's blow carries none.  It bit hardest when the worker
 *    had broken the guard at 0 stamina (the phone does not know) and in the
 *    ~50 ms after a raise or a turn -- exactly where a parry is tried.
 *    v2.3.3300 made the same cut for the roll (gameEvents.js).
 *
 * 2. A WATCHER APPLIES ANOTHER PLAYER'S SHIELD EDGE WHEREVER THEY ARE.  The
 *    worker sends `player_shield` room-wide on purpose (eventplace.js, TRAPS
 *    §176): a guard "stays up, or down, until the next toggle", so an edge
 *    missed is wrong until the next.  The phone dropped an edge whose sender
 *    was in another zone (a Wheel dungeon), so a guard lowered there stayed
 *    drawn raised when they met again.  Only the SOUND is for those here. */

/* May the phone's own arc test turn this landed blow into a block?
   `srvResolved` is gameEvents' v2.3.2238 test (the worker said "resolved"). */
export function localBlockApplies(S, srvResolved) {
  return !srvResolved && !(S && S._serverMonsters);
}

/* Apply one `player_shield` edge to the watcher's copy of its sender.
   Returns true when its going-up should be heard (a peer here whose shield
   was down); the state is written whatever their zone.  An unknown sender is
   still dropped: there is no copy to write. */
export function applyPeerShieldEdge(other, up, inZone, now) {
  if (!other) return false;
  const heard = !!(inZone && up && !other._shieldUp);
  other._shieldUp = up;
  other._shieldTs = now;
  return heard;
}
