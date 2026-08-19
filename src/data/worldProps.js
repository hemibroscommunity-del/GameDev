/* ═══ v2.3.1775: WORLD PROPS ═══
 *
 * Scenery: a sprite standing at a world position, drawn and nothing else.  No
 * name, no health, no interaction, no AI — which is exactly why it is NOT an
 * NPC record.  Adding the anvil as a quest-giver with `noHp` and empty phrases
 * would have put a ★, a name label and a talk target on a lump of iron.
 *
 * It is also not a TOWN_BUILDINGS entry: those are collision rectangles with a
 * menu action behind them, and the owner is removing the buildings anyway.
 *
 * SIZE IS DECLARED IN WORLD PIXELS, not as a scale factor.  The renderer draws
 * an NPC's 200px figure at 120 world px (NPC_SPRITE_SCALE), so a person is 120
 * world px tall and every prop can be sized against that in the units the
 * placement is reasoned in.  A scale factor instead would silently change
 * meaning the moment a source image is re-exported at a different resolution.
 *
 * `x, y` is where the prop MEETS THE GROUND — its bottom-centre — matching the
 * convention NPCs use for their feet, so props and characters standing at the
 * same y sit on the same line.
 */
export const WORLD_PROPS = [
  {
    /* Owner: "This anvil belongs near the blacksmith."  He stands at
       (648, 812); this is a step to his west, past his sprite's left edge
       (~590) and clear of the lamp post at (633, 890).
       46 world px tall reads as an anvil at a smith's knee — a real one is
       roughly a third of a person, and a person here is 120. */
    id: 'anvil', zone: 'town',
    sprite: '/sprites/props/anvil.png',
    x: 775, y: 748, worldH: 46,
  },
  {
    /* The storekeeper's stall, on the fountain's east shoulder — the mirror of
       the blacksmith's corner, so the plaza has a trade on each side.
       170 world px puts the canopy about a head and a half above a person,
       which is what a market awning is.  It is drawn from its bottom edge, so
       the counter meets the cobbles at y and the canopy rises from there. */
    id: 'market-stall', zone: 'town',
    sprite: '/sprites/props/market-stall.png',
    x: 2050, y: 590, worldH: 170,
  },
];

/** Props for a zone, in draw order (later entries draw on top). */
export function propsForZone(zoneId) {
  return WORLD_PROPS.filter((p) => p.zone === zoneId);
}

/** Every distinct prop sprite — the preload manifest's source list. */
export function propSpriteSources() {
  return [...new Set(WORLD_PROPS.map((p) => p.sprite).filter(Boolean))];
}
