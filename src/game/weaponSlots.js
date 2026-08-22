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
