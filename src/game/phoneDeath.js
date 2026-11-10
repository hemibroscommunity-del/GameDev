/* ═══════════════════════════════════════════════════════════════════
   THE PHONE'S OWN DEATH CHECKS -- v2.3.4363
   ═══════════════════════════════════════════════════════════════════
   The 2026-11-03 state-machine sweep (V2, U1-2).  The phone still carried
   "stand up again" routines from the single-player days, and the catch-all in
   BroTown's loop could start a death on the phone's own word:

   - bt_rpg holds hp 0 for the whole dying window (respawn.js saves it before
     the new hp arrives; every player_state echo re-saves it).  A fresh page
     warms S.rpg from that cache, the loop is already running and
     `_serverMonsters` was never set, so the catch-all showed "YOU DIED" on the
     first frame.  The worker's own death then landed while the phone was
     "dying" and was skipped (no death card), and two stand-ups followed.
   - the copies took 10% off the gold SHOWN; the worker never takes it, and a
     v2 delta never re-sends unchanged coins, so the low number stayed.

   The server is the authority for HP and death (CLAUDE.md §5).  These are the
   two rules, with no imports so a node test runs them
   (server/test/phone-death.test.mjs). */

/**
 * A warm start from the cache never begins dead.  A cached hp of 0 (or a
 * missing one) says only that the last page closed while dying; the worker's
 * player_state says what is true a moment later, and its player_died is what
 * plays a death.  Call after recalcDerived, which only clamps hp down.
 *
 * @returns {boolean} whether hp was changed
 */
export function warmStartHp(rpg) {
  if (!rpg || typeof rpg !== 'object') return false;
  if (typeof rpg.hp === 'number' && rpg.hp > 0) return false;
  var max = typeof rpg.maxHp === 'number' && rpg.maxHp > 0 ? rpg.maxHp : 0;
  if (!max) return false;
  rpg.hp = max;
  return true;
}

/**
 * The loop's catch-all: does an hp of 0 here start the phone's own death?
 * Only once the worker has spoken for this character (`S._rpgFromServer`, set
 * by the first player_state), only where the worker is not running the
 * monsters (it sends player_died there itself), and only when no death is
 * already playing.
 */
export function catchAllDies(S) {
  if (!S || S._dying || S._serverMonsters) return false;
  if (!S._rpgFromServer) return false;
  return !!(S.rpg && S.rpg.hp <= 0);
}

/** The stand-up's pools, full again (the worker's player_state confirms). */
export function refillPools(rpg) {
  if (!rpg) return;
  rpg.hp = rpg.maxHp;
  rpg.stamina = rpg.maxStamina;
  rpg.mana = rpg.maxMana;
}
