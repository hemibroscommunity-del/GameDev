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
    x: 1310, y: 660, worldH: 46,
  },
  {
    /* The storekeeper's stall, on the fountain's east shoulder — the mirror of
       the blacksmith's corner, so the plaza has a trade on each side.
       170 world px puts the canopy about a head and a half above a person,
       which is what a market awning is.  It is drawn from its bottom edge, so
       the counter meets the cobbles at y and the canopy rises from there. */
    id: 'market-stall', zone: 'town',
    sprite: '/sprites/props/market-stall.png',
    x: 2560, y: 700, worldH: 170,
  },

  /* ═══ v2.3.1778: THE BUILDINGS ═══
     Owner supplied the art and asked for them placed and "Not walkable".

     `blockW` / `blockD` are the FOOTPRINT the building occupies on the
     ground, in world px, measured from its bottom-centre — deliberately
     smaller than the drawn sprite, because an isometric building's roof
     overhangs its base and blocking the roof's shadow would leave the player
     bumping into thin air a body-length from the wall.

     `action` opens the building's panel.  Those panels have been UNREACHABLE
     since v2.3.823, which forced `S.nearBuilding = null` every frame because
     "the town buildings have no in-game art yet, so their Enter prompts were
     floating over empty painted ground" — and left the note "Restore the
     BUILDINGS proximity scan here when building art ships."  It has shipped.

     Laid along the plateau's northern arc with their backs toward the cliff,
     which is where a town puts its shopfronts and leaves the whole southern
     half open to walk.  Every footprint was checked against the walk grid
     before placement, and the grid re-checked for connectivity afterwards:
     five solid blocks in a bowl is an easy way to wall the town in half. */
  {
    /* ═══ v2.3.1794: UP ON THE HILL ═══
       Owner: "put mayor bros house up on the hill (above the stairs) and mayor
       bro right outside the house."  It stood on the lower plaza at (1180,585),
       in the row with the forge and the bank, which made the town's one
       landmark just another shopfront.

       Placed by reading the art rather than by eye: the walled courtyard at the
       top of the stairs is sand from about x 750..1150 and y 120..300, with the
       stair head at (960,300).  A prop's (x,y) is its BOTTOM-CENTRE
       (anchor 0.5,1), so the base sits on the courtyard floor at y=300 and the
       house draws upward from there.

       worldH 300 -> 235 for the same reason: at 300 the roof reached y=0 and
       stood over the cliffs and pines that ring the terrace.  235 fits between
       the cliff line (~60) and the stair head, and a slightly smaller building
       on a raised terrace reads as further away, which is what it is. */
    id: 'mayor-house', zone: 'town', sprite: '/sprites/props/mayor-house.png',
    x: 930, y: 300, worldH: 235, blockW: 165, blockD: 75,
    /* No action: it is Mayor Bro's house, and he is standing outside it
       handing out the tutorial.  A door that opens a panel he already covers
       would be a second, worse way to talk to him. */
  },
  {
    id: 'forge', zone: 'town', sprite: '/sprites/props/forge.png',
    x: 1480, y: 545, worldH: 300, blockW: 220, blockD: 95,
    action: 'forge', label: 'BLACKSMITH',
  },
  {
    id: 'bank', zone: 'town', sprite: '/sprites/props/bank.png',
    x: 1810, y: 505, worldH: 320, blockW: 220, blockD: 95,
    action: 'bank', label: 'BANK',
  },
  {
    id: 'enchanter', zone: 'town', sprite: '/sprites/props/enchanter.png',
    x: 2130, y: 525, worldH: 300, blockW: 220, blockD: 95,
    action: 'enchant', label: 'ENCHANTER',
  },
  {
    id: 'general-store', zone: 'town', sprite: '/sprites/props/general-store.png',
    x: 2440, y: 600, worldH: 300, blockW: 210, blockD: 95,
    action: 'shop', label: 'GENERAL STORE',
  },
];

/** The footprint a prop blocks, or null when it is scenery you walk past.
 *  Returned as world-pixel bounds from the prop's bottom-centre anchor. */
export function propFootprint(p) {
  if (!p || !p.blockW || !p.blockD) return null;
  return { x0: p.x - p.blockW / 2, x1: p.x + p.blockW / 2, y0: p.y - p.blockD, y1: p.y };
}

/** The building prop whose door the player is standing at, or null.
 *  Measured from the prop's bottom-centre — the front step — so the prompt
 *  appears where the door is rather than anywhere along a wide facade. */
export function buildingPropNear(zoneId, x, y, range) {
  let best = null, bestD = (range || 90) ** 2;
  for (const p of propsForZone(zoneId)) {
    if (!p.action) continue;
    const dx = x - p.x, dy = y - p.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

/** Props for a zone, in draw order (later entries draw on top). */
export function propsForZone(zoneId) {
  return WORLD_PROPS.filter((p) => p.zone === zoneId);
}

/** Every distinct prop sprite — the preload manifest's source list. */
export function propSpriteSources() {
  return [...new Set(WORLD_PROPS.map((p) => p.sprite).filter(Boolean))];
}
