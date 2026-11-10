/* ═══ v2.3.4364: MAY THIS PHONE ASK FOR THIS PILE? ONE RULE ═══
   "May I ask for this pile?" was written twice: once for the hand
   (groundLoot.js) and once for the pet's vacuum (BroTown.jsx), and the two
   drifted.  The hand stands still while its player dies (v2.3.3476, the
   corpse gate); the pet did not, and asked for the player's own death pile
   at their feet, was refused 'dead' (a transient no that re-arms it), and
   asked again after every round trip for the five seconds of dying (sweep
   2026-11-03, V22 G4-15; review R2 W1.8).  Both now ask this.

   It is only "may I ask": the worker still decides (recipients, zone, death,
   claims, its range).  No imports, so node tests it
   (server/test/loot-clock.test.mjs). */

export const LOOT_ASK = {
  /* the one retry after an early 'not-recipient' goes this long after the
     death pile's minute ends on this phone's reading of the worker's clock */
  NR_RETRY_PAD_MS: 1000,
};

/* Is this pile mine to take at `now`?  A death pile is its owner's (in No
   man's land its killer's) until ownerOnlyUntil, then anyone's. */
export function amLootRecipient(loot, me, now) {
  if (!loot) return false;
  if (loot.isDeathDrop && loot.ownerOnlyUntil && now > loot.ownerOnlyUntil) return true;
  return !loot.recipients || loot.recipients.includes(me);
}

/* o: { dying } -- a dying player asks for nothing (the worker would say
   'dead', item-drop.md: "the phone asks for nothing while it is dead"). */
export function mayAsk(loot, me, now, o) {
  if (!loot || (o && o.dying)) return false;
  if (!loot._serverLoot || !loot.lootId || loot._collected || loot._expired) return false;
  if (now < (loot._askAgainAt || 0)) return false;
  return amLootRecipient(loot, me, now);
}

/* A 'not-recipient' for a death pile only ever means "too early": the pile is
   its owner's for a minute and anyone's after, so the phone read the minute's
   end ahead of the worker.  It gets ONE more ask, just after the minute ends,
   and the pile stays on screen until then (review R1 W1.8: one retry, never a
   loop -- messages cost money and flood.js has a budget).  Returns true when
   it re-armed; false when the refusal stands (the caller drops the pile, as
   for any other 'not-recipient'). */
export function notRecipientRetry(pile, now) {
  if (!pile || !pile.isDeathDrop || !pile.ownerOnlyUntil || pile._nrRetried) return false;
  pile._nrRetried = true;
  pile._askAgainAt = Math.max(pile.ownerOnlyUntil, now) + LOOT_ASK.NR_RETRY_PAD_MS;
  pile._pickupPending = false;
  pile._petPickupPending = false;
  return true;
}
