/* ═══ v2.3.6208: WHAT A BODY'S POSE HIDES (card EN, PR 2) ═══
 *
 * The owner, 2026-11-25: "Last time I saw a character during multilayer
 * fishing and his sword was floating mid air while he fished fix that too".
 *
 * A pose whose picture already holds its tool (the rod in the 'fish' sheet,
 * v2.3.844; the pick in 'mine'; the hammer at the anvil) shows no weapon of
 * the body's own.  My own bro's draw hid the weapon, the held shield, the
 * hand's cap and the arm's clones in those poses (entityRenderer, the
 * `_fishingPose` block); a PEER's harvest pose only picked the body's
 * picture, and the peer's weapon was forced visible for a living peer, so
 * their sword hung in the air beside the rod.  The two paths are parallel
 * implementations (v2.3.2304 counted four fixes that had to land twice), so
 * the answer lives here ONCE and both ask it.
 *
 * No imports: node tests it (server/test/pose-hides.test.mjs).
 */

/* The poses whose picture holds its own tool.  'smith' is my own bro's only
   (a peer's smithing is not on the wire as a pose). */
export const TOOL_POSES = Object.freeze(['fish', 'mine', 'smith']);

/* What such a pose hides: the display's fields, as both builders name them
   (a peer's display has no hand cap or arm clones: a missing field is
   skipped).  The shield slung on the back is NOT here: both paths already
   draw it on stand and jog only (v2.3.1782, v2.3.2304), and nobody carries a
   weapon on the back. */
export const HELD_PIECES = Object.freeze([
  '_weaponContainer', '_shieldSprite', '_handCapSprite',
  '_handArmSprite', '_handArmShirt', '_handArmLegs', '_handArmChest', '_handArmCape',
]);

/* A peer's harvest (`other._ex`, wsClient's player_update merge) to the body
   pose it is drawn in; chop, cook, fire and a farm step are stand-ins that
   hide the whole display, so they are no body pose. */
export function exBodyPose(ex) {
  return ex === 'mine' ? 'mine' : ex === 'fish' ? 'fish' : null;
}

/* My own bro's pose from the local state's harvest and smithing. */
export function ownToolPose(extractionSkill, smithing) {
  if (smithing) return 'smith';
  if (extractionSkill === 'fishing') return 'fish';
  if (extractionSkill === 'mining') return 'mine';
  return null;
}

/* Does this pose hide what the hand holds? */
export function poseHidesHeld(pose) {
  return TOOL_POSES.includes(pose);
}

/* Hide every held piece the display has.  A write only where it changes
   something (TRAPS §218: a change of `visible` rebuilds the layer's draw
   list, so a pose held for a minute writes once, not every frame).  Returns
   how many it hid. */
export function hideHeld(display) {
  if (!display) return 0;
  let n = 0;
  for (const k of HELD_PIECES) {
    const s = display[k];
    if (s && s.visible) { s.visible = false; n++; }
  }
  return n;
}
