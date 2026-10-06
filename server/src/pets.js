/* ═══ v2.3.1130: SERVER-VALIDATED PET CAPTURE (handoff backlog item G;
 * spec in docs/specs/pets.md) -- RETIRED v2.3.3120 ═══
 *
 * What is left here is the loot vacuum's range and the retired message's
 * answer.  Pets are caught by arming a trap and killing the monster
 * (trapping.js) and kept in their own record (petbook.js).
 *
 * WHY THE OLD CAPTURE WENT (docs/PET-TRAPPING-PLAN.md, "Why the 20% capture
 * has to go").  It asked you to wear a monster down to 20% of its health and
 * throw a trap, and a strong player one-hits what they would want to catch --
 * the owner: "It also becomes infeasible if you're powerful enough to 1 hit
 * monsters so I need something else."  It also let anyone within 200 px trap
 * a monster someone else had worn down and cancelled everyone's XP and gold
 * for it, worked from the safe ground, finished a dungeon by trapping its
 * boss, stopped at six pets with no way to release one, and rolled against
 * your COMBAT level.  Its only button was on the toolbar hidden since v14.x,
 * so nobody has used it in hundreds of versions.
 *
 * `pet_capture` now refuses with 'retired' and touches nothing: no trap, no
 * monster, no XP.  `pet_capture_result` stays in PRIVILEGED_EVENTS, so a
 * forged one is still never relayed.  And the join's adoption of a browser's
 * pet list (`_petsAdoptOnJoin`: up to six of any kind at level 100, on every
 * join, for anyone the server had none for) is gone with it -- the record is
 * the only list (petbook.js). */

export const PETS = {
  /* v2.3.1200: pet loot vacuum range (px), measured from the OWNER's
   * server-known position -- the server does NOT track pet position
   * (the client's S._petX/_petY follow-orbit is pure cosmetics), so
   * the owner's spot + a modestly larger radius stands in for the pet.
   * Geometry: LOOT_PICKUP_RANGE (160) already absorbs the pile-spawn
   * offset + render magnetism + move-throttle lag stack measured from
   * the client's 20 px manual trigger; the pet's trigger point sits up
   * to ~130 px from the player instead (<=50 px follow orbit +
   * PET_LOOT_RADIUS 80 in src/data/gameSystems.js), so +80 keeps the
   * same slack without opening cross-screen theft.
   * v2.3.3120: "an active pet" is the record's (petbook.js _petbookActive). */
  VACUUM_RANGE: 240,
};

export const petMethods = {
  _petSend(playerId, type, payload) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type, payload })); } catch (e) {}
  },

  /* v2.3.3120: retired.  An old client's capture is answered, never acted on
     -- the monster lives, the trap stays in the bag, nothing is paid. */
  _handlePetCapture(session, payload) {
    if (!session || !session.id) return;
    this._petSend(session.id, 'pet_capture_result', { captured: false, error: 'retired' });
  },
};
