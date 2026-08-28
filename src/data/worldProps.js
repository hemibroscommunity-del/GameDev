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
    id: 'anvil', zone: 'town', mapV: 16,
    sprite: '/sprites/props/anvil.png',
    x: 1310, y: 660, worldH: 46,
  },
  {
    /* The storekeeper's stall, on the fountain's east shoulder — the mirror of
       the blacksmith's corner, so the plaza has a trade on each side.
       170 world px puts the canopy about a head and a half above a person,
       which is what a market awning is.  It is drawn from its bottom edge, so
       the counter meets the cobbles at y and the canopy rises from there. */
    id: 'market-stall', zone: 'town', mapV: 16,
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
    /* ═══ v2.3.2061: BACK ON THE HILL, MEASURED AGAINST THE MAP THAT SHIPS ═══
       Owner: "put mayor bros house on the top of the hill (you won't be able
       to go inside just the building)."

       It has been off the map since v2.3.1813, when the town was re-fused from
       96x30 tiles to 52x55 and every prop coordinate in this file became a
       number for a map that no longer exists. Its old (930, 300) was measured
       against the v16 courtyard; on town_v17 that is a different place
       entirely. So this is a fresh measurement, not a conversion — converting
       arithmetically is how you land a house in the trees and call it done.

       WHERE THE HILL IS, read off the art rather than by eye: the plateau's
       high ground is the fenced terrace at the head of the north ramp, and its
       clear cobble runs x 660..830 by y 320..470. Sampled on a 40px disc, the
       middle of that box is 99% cobble and every edge of it falls off into
       fence, cliff or pine — so the house sits at (750, 455), which puts its
       front step just inside the terrace's southern lip, looking down over the
       plaza. A prop's (x,y) is its BOTTOM-CENTRE, so the building draws upward
       from that step and the roof rises against the rock behind it.

       worldH 165 rather than the old 235: the v16 courtyard was wider than
       this terrace. At 235 the art is 227 world px across and would hang over
       the fence on both sides; at 165 it is 159, inside the 170 the terrace
       actually has.

       NO `action`, which is the "you won't be able to go inside" half of the
       ask -- buildingPropNear only ever returns props that carry one, so there
       is no Enter prompt and no panel behind it. It blocks, because you should
       not be able to walk through a house. */
    id: 'mayor-house', zone: 'town', mapV: 17,
    sprite: '/sprites/props/mayor-house.png',
    x: 750, y: 455, worldH: 165, blockW: 120, blockD: 52,
  },
  {
    /* ═══ v2.3.2061: THE PLAZA FOUNTAIN ═══
       Owner supplied an 8-frame magenta sheet: "See if you can wire in this
       sprite sheet of a fountain."

       THE FIRST ANIMATED PROP. Everything in this table until now has been one
       still texture, so `anim` is new: it names a horizontal strip and the
       rate to play it at, and the renderer swaps the frame on a clock (see
       _updateProps in entityRenderer.js). The strip is sliced by the same
       _sliceStrip the shopkeeper's walk rows use and rides the same preload
       gate every prop sprite already rides, so nothing here loads on first
       sighting -- CLAUDE.md's preloading law.

       12 fps over 8 frames is a 0.67s loop. Measured against the art rather
       than picked: the water rises and falls once across the eight, and much
       faster reads as a flicker while much slower reads as a stutter.

       PLACED IN THE MIDDLE OF THE PLAZA, 200px south of TOWN_SPAWN (815,1010),
       so it is the first thing in front of you when you land -- which is what
       a town's centrepiece is for. Sampled on an 80px disc, (830,1215) is 99%
       open cobble; the nearest thing to it is the spawn point itself, and the
       footprint below stops well short of it.

       It blocks, on the same reasoning as the house: a stone basin you can
       walk through reads as a bug. The footprint is the basin's ground
       ellipse and is deliberately narrower than the drawn art -- the spray
       overhangs the stonework, and blocking the spray would stop the player a
       body-width from the rim. */
    id: 'fountain', zone: 'town', mapV: 17,
    /* Not a building, so no roof glyph on the minimap -- the marker there is
       keyed off "does it block", and this is the first blocking prop that is
       not somewhere you go. */
    mapIcon: null,
    sprite: '/sprites/props/fountain.webp',
    anim: { frames: 8, fps: 12 },
    x: 830, y: 1215, worldH: 170, blockW: 140, blockD: 48,
  },
  {
    id: 'forge', zone: 'town', mapV: 16, sprite: '/sprites/props/forge.png',
    x: 1480, y: 545, worldH: 300, blockW: 220, blockD: 95,
    action: 'forge', label: 'BLACKSMITH',
  },
  {
    id: 'bank', zone: 'town', mapV: 16, sprite: '/sprites/props/bank.png',
    x: 1810, y: 505, worldH: 320, blockW: 220, blockD: 95,
    action: 'bank', label: 'BANK',
  },
  {
    id: 'enchanter', zone: 'town', mapV: 16, sprite: '/sprites/props/enchanter.png',
    x: 2130, y: 525, worldH: 300, blockW: 220, blockD: 95,
    action: 'enchant', label: 'ENCHANTER',
  },
  {
    id: 'general-store', zone: 'town', mapV: 16, sprite: '/sprites/props/general-store.png',
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
/** ═══ v2.3.1813: TOWN'S BUILDINGS ARE OFF WHILE THE MAP IS RE-FUSED ═══
 *  Owner, sending the new BroTown art: "You can just keep the buildings and
 *  NPCS removed for now."
 *
 *  They are switched off rather than deleted, and the positions are left
 *  untouched on purpose — every one of them was measured against the v16
 *  plateau, which was 96x30 tiles.  The new map is 52x55, so those x values
 *  (up to 2560) now sit off the right-hand edge of the zone entirely; they
 *  are not wrong-but-close, they are unplaceable until someone re-measures
 *  them against the new art.  Converting them arithmetically would land
 *  seven buildings in the trees and look like a bug rather than a to-do.
 *
 *  NOTE what this also switches off: town collision.  Since v2.3.1794 the
 *  town blocks on PROPS, not on a walk mask (the owner rejected hue-derived
 *  collision — see tiledMaps.js), so with the props gone the plateau has no
 *  edges and you can walk off the clifftop into the painted valley.  That is
 *  a known consequence of "removed for now", not an oversight; the builder
 *  still emits town_v17.walk.json if a mask is ever wanted back.
 *
 *  Flip to true to get them back exactly as they were. */
export const TOWN_PROPS_ENABLED = false;

/** ═══ v2.3.2061: THE TOWN MAP A PROP'S POSITION WAS MEASURED AGAINST ═══
 *  Bump this when the town art is re-fused again, and every prop still
 *  carrying the old number drops out of the world instead of standing in the
 *  wrong place. That is the whole mechanism: TOWN_PROPS_ENABLED above is a
 *  blanket "the v16 set is off", which was right while ALL of them were stale,
 *  but it cannot express what is true now -- the mayor's house and the
 *  fountain have been measured against town_v17 and the other six have not.
 *  Flipping the blanket flag to ship two props would have dragged four
 *  buildings back to coordinates up to 2560 on a map 1664 wide. */
export const TOWN_MAP_V = 17;

/** Is this prop's position good for the map that is actually loaded?
 *  Town props declare `mapV`; anything measured against the CURRENT map draws
 *  regardless of the blanket switch, and anything older is held behind it. */
function propIsPlaced(p) {
  if (!p || p.zone !== 'town') return true;
  return p.mapV === TOWN_MAP_V ? true : TOWN_PROPS_ENABLED;
}

export function propsForZone(zoneId) {
  return WORLD_PROPS.filter((p) => p.zone === zoneId && propIsPlaced(p));
}

/** Every distinct prop sprite — the preload manifest's source list. */
export function propSpriteSources() {
  /* v2.3.2061: only the props that can actually be DRAWN. The four v16
     buildings are held back until someone re-measures them (propIsPlaced), and
     preloading ~1MB of art for objects no zone will ask for is a cost paid on
     the startup gate -- the one place in this game where bytes are most
     expensive. They come back with their positions, in the same change. */
  return [...new Set(WORLD_PROPS.filter(propIsPlaced).map((p) => p.sprite).filter(Boolean))];
}

/** Props that are ANIMATED — `{id, sprite, frames}` — for the strip slicer.
 *  Separate from propSpriteSources because the loader needs the frame count
 *  to cut the strip, and the manifest only needs the url. */
export function propAnimStrips() {
  return WORLD_PROPS.filter((p) => propIsPlaced(p) && p.anim && p.anim.frames > 1)
    .map((p) => ({ id: p.id, sprite: p.sprite, frames: p.anim.frames }));
}

/* v2.3.1813 dev probe, house style (__btWorldProps): the props switch itself.
   mp-townprops / mp-townbuildings need to tell "switched off by directive"
   apart from "drawing is broken" — an empty prop list looks identical from the
   outside, and a scenario that treated the two the same would either fail
   every run while they are off or pass silently once they come back. */
if (typeof window !== 'undefined') window.__btTownPropsEnabled = () => TOWN_PROPS_ENABLED;
