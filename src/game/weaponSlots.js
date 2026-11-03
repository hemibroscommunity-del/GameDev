/* ═══ WHICH WEAPON SLOTS YOU CAN ACTUALLY SWITCH TO (v2.3.1845) ═══
 *
 * Owner: "when you only have sword (no bow or staff) it still shows bow icon
 * when you double tap to switch weapons on the character's weapon slot in the
 * equip menu."
 *
 * The double tap is the left joystick's, and it ran through TWO copies of the
 * same rotation living in two scopes of BroTown.jsx — `_desktopCycleWeapon`
 * (which performs the switch) and `getNextWeaponSlot` (which draws the "next
 * weapon" preview on the joystick).  Both wrote `['melee', 'ranged']` with
 * 'ranged' unconditional while gating 'staff' on owning a staff, so a
 * sword-only character was offered — and moved into — a ranged slot with
 * nothing in it.  The preview drew a bow, and after the tap the equipped cell
 * drew one too (equipModel's icon read the active SLOT rather than the weapon
 * in hand; fixed the same version).
 *
 * One function now, imported by both, because a rotation and a preview of
 * that rotation disagreeing is precisely how the bow appeared: the preview
 * was honest about what the cycle was about to do.  The fix is that neither
 * offers a slot you cannot fill.
 *
 * 'melee' is always present and never gated.  An empty melee slot is not a
 * phantom — it is FISTS, a real thing the game lets you fight with, and it is
 * the slot everything else falls back to.
 *
 * v2.3.4154: the same rule for the DIRECT pick (pickSlot): the 1, 2 and 3 keys
 * and the computer's weapon bar, all through BroTown's _desktopSelectSlot.
 * The 3 key asked for a staff at the key and the 2 key asked nothing, so a
 * character with no bow pressed 2 into an empty bow slot (the state-machine
 * sweep, 2026-11-03, VB-1 G2-17): every attack refused for want of a weapon,
 * "undefined" over the head -- and since v2.3.4151 the pick is told to the
 * worker, which saves any slot (server/src/gear.js _handleSetActiveSlot), so
 * it came back on every join.  healedSlot is the way out for such a save:
 * the phone takes melee as it adopts the worker's slot (wsClient.js
 * player_state) and tells the worker.  server/test/weapon-pick.test.mjs.
 */

/** The weapon slots this character can be in, in cycle order. */
export function ownedWeaponSlots(rpg) {
  const slots = ['melee'];
  if (rpg && rpg.rangedWeapon) slots.push('ranged');
  if (rpg && rpg.staffWeapon) slots.push('staff');
  return slots;
}

/** The slot one step round the cycle.  Returns the CURRENT slot when there is
 *  nowhere else to go, so a caller can compare and skip the swap entirely. */
export function nextWeaponSlot(rpg) {
  const slots = ownedWeaponSlots(rpg);
  const cur = (rpg && rpg.activeSlot) || 'melee';
  const i = slots.indexOf(cur);
  /* An unowned current slot (a save persisted from before this version, or a
     weapon dropped while it was active) is not in the list — indexOf gives
     -1 and the rotation would land on slots[0] by accident.  Say melee on
     purpose instead: it is the slot that always exists. */
  if (i < 0) return 'melee';
  return slots[(i + 1) % slots.length];
}

/** v2.3.4154: a direct pick (the 1, 2 and 3 keys; the computer's weapon bar):
 *  the slot to take up, or null for no swap -- the one already in hand, or one
 *  you cannot fill (no bow, no staff).  The cycle's own list, so a key never
 *  takes up a slot the cycle would skip. */
export function pickSlot(rpg, slot) {
  if (!rpg || rpg.activeSlot === slot) return null;
  return ownedWeaponSlots(rpg).includes(slot) ? slot : null;
}

/** v2.3.4154: the slot to stand in: the one in hand while you can fill it,
 *  melee (the slot that always exists) when not. */
export function healedSlot(rpg) {
  const cur = (rpg && rpg.activeSlot) || 'melee';
  return ownedWeaponSlots(rpg).includes(cur) ? cur : 'melee';
}

/** v2.3.3711: the slot one step BACK round the cycle -- the mouse wheel turned
 *  up (BroTown's canvas, game/deskCombos.js wheelStep).  Same rules as
 *  nextWeaponSlot: only slots you can fill, the current one when there is
 *  nowhere else to go, melee for a current slot you no longer own. */
export function prevWeaponSlot(rpg) {
  const slots = ownedWeaponSlots(rpg);
  const cur = (rpg && rpg.activeSlot) || 'melee';
  const i = slots.indexOf(cur);
  if (i < 0) return 'melee';
  return slots[(i + slots.length - 1) % slots.length];
}
