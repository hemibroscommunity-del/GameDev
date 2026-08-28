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
  /* ═══ v2.3.2065: THE TOWN, LAID OUT TO THE OWNER'S BLUEPRINT ═══
     The owner supplied a mockup of where things go: mayor's house up the
     stairs, blacksmith west, general store east, fountain dead centre, a
     market stall and banners toward the south gate.

     EVERY POSITION IS DERIVED, not eyeballed. The blueprint is a REDRAW of
     town_v17, not a pixel overlay -- a different size and a slightly
     different plateau -- so the two were registered by the one feature they
     share: the cobble plateau's bounding box, found by colour in both
     (a warm-sand test tight enough to exclude the yellow-green canopy, which
     a looser one swallowed and which made the first registration span the
     whole image). Blueprint pixels map through that box onto world pixels,
     and every result was then SAMPLED on the live art -- a disc of ground
     around each point, classified cobble / rock / foliage -- because the
     blueprint's plateau is drawn a little wider than the real one and two
     of these landed in the trees at the position it implied. The forge moved
     50px east and the market stall 40px, on that evidence.

     WHAT IS NOT HERE. The blueprint also shows a second (potion) stall and a
     stone gate arch. There is no art for either -- the sheet the owner sent
     carries lamps, benches and fence rails -- so inventing them from the
     pieces to hand would have meant shipping something that is not what the
     mockup shows. The banner rails below stand in for the gate's banners;
     the arch and the potion stall are the two things still to draw.

     ═══ WHAT BLOCKS: EVERYTHING, SINCE v2.3.2073 ═══
     Owner: "It should be obvious but make sure the objects are unwalkable."

     It used to be buildings and the fountain only. Lamps, benches, banner
     rails, the anvil and the market stall were deliberately left walk-through
     on the reasoning that they are thin dressing and "a plaza with a
     walk-through bench is a smaller annoyance than one where you can wedge
     yourself between a bench and a fountain". The owner's answer to that is
     the line above, and they are right: a lamp post you stroll through is not
     a lamp post.

     The four that DID block were also blocking far less than they looked. The
     footprint is a box `blockW` wide and `blockD` deep at the sprite's base,
     and the forge's was 330 of its 551 px width and 110 of its 500 px height
     -- so two thirds of the building was solid and the rest was air. Every
     footprint is now measured off the art: `blockW` is the GROUND-FLOOR wall
     width (the widest run of the sprite's bottom quarter, which excludes the
     roof overhang), and `blockD` the depth of that base. An isometric roof
     hangs over its walls, and blocking the roof's shadow leaves the player
     bumping into thin air a body-length from the door.

     UNWALKABLE MUST NOT MEAN IMPRISONING. Twelve footprints in one small
     plaza can seal a corner without anyone noticing, so the whole grid is
     flood-filled from the town exit -- the same 16 px cells the client builds
     (installPropOnlyGrids), sampled at the player's own half-width -- and
     every door, every townsperson and every walkable cell has to come back
     reachable. It does: 100% of usable cells connect to the exit, and no
     pocket is cut off. mp-plazaplate holds the in-game half of that.

     `mapV` gates placement (see propIsPlaced): 17 is the map that ships. */
  {
    /* ═══ UP THE STAIRS, as the blueprint has it -- BUT NOT AS FAR EAST ═══
       The blueprint agrees with the v2.3.2061 placement in intent (top of the
       ramp, above the stairs) and nudges it ~40px east. That nudge does NOT
       survive contact with the real map: its terrace is drawn wider than the
       one that exists, and at (790,450) the house's east edge lands on
       x=874, where the ground samples 60% PINE. The centre point still reads
       98% cobble, which is exactly why a centre-only check is not enough --
       what matters is where the EDGES fall.

       So this keeps the measured position: the terrace's clear cobble runs
       x 660..830, and at worldH 165 the art is 159 wide and sits inside it.
       The blueprint's own house is bigger; that is one of the details the
       owner said to ignore. */
    /* ═══ v2.3.2069: BIGGER, AND WHY NOT THE FULL 3x ═══
       Owner: "Make the mayors house larger by about 3x."

       165 -> 400 is 2.4x, and it is the most the map has room for. At a true
       3x (495) the roof reaches y=-45 -- off the TOP of the world, because
       this house stands on the northern terrace at y=470 and there is only
       470px of map above it. There is no version of 3x here that is not
       partly drawn outside the map.

       The width is the other half. At 400 the art is 386 across, spanning
       x 567..953, and the terrace's clear cobble is only x 660..830 -- so it
       DOES overhang, onto the pines either side. That was rendered and
       looked at rather than reasoned about: the house reads as nestled into
       the trees, which is what a house on a wooded terrace should look like.
       It is covering foliage, not a cliff face, which is the overhang that
       reads as floating.

       Nudged 10px east of the measured centre so the left edge sits on
       greenery rather than the rocky shoulder at x 545 (10% cliff on a 30px
       disc). The BLOCK stays much narrower than the art -- an isometric
       roof overhangs its walls, and blocking the roof's shadow leaves the
       player bumping into thin air a body-length from the door. */
    id: 'mayor-house', zone: 'town', mapV: 17,
    sprite: '/sprites/props/mayor-house.png',
    x: 760, y: 470, worldH: 400, blockW: 330, blockD: 150,
    /* No action: Mayor Bro stands outside handing out the tutorial, and a
       door that opens a panel he already covers is a second, worse way to
       talk to him. */
  },
  {
    /* BLACKSMITH, west side. The blueprint's own position (300,810) samples
       83% cobble -- the rest is the western tree line -- so it sits 50px east
       at 98%. `action` makes the door work: ForgePanel has been unreachable
       since the props were switched off. */
    /* ═══ v2.3.2069: BIGGER, AND WHY NOT THE FULL 3x ═══
       Owner: "Same with blacksmith house."

       200 -> 500 is 2.5x, and again it is what fits. This art is WIDER than
       it is tall (1.10), so height is not the binding constraint here --
       width is: at a true 3x it would be 661 across, and there is only
       x 200..760 of clear cobble at this latitude before the west tree line
       on one side and the fountain's own footprint on the other. Sampled at
       3x, its left edge lands on ground that is 53% leaf and its right edge
       reaches x=760, a hair from the fountain basin. 500 spans x 205..755
       and both edges sample 98% open cobble.

       Moved from (350,850) to (480,900): the extra width has to come from
       somewhere, and taking it eastward keeps the building off the trees
       while leaving the plaza's middle clear. */
    id: 'forge', zone: 'town', mapV: 17, sprite: '/sprites/props/forge.png',
    x: 480, y: 900, worldH: 500, blockW: 470, blockD: 200,
    action: 'forge', label: 'BLACKSMITH',
  },
  {
    /* GENERAL STORE, east side, mirroring the forge. Its shelf is where the
       potions are bought from -- Shopkeeper Bro sells them too (v2.3.2063),
       and having both is the blueprint's own arrangement: a shop you walk
       into and a merchant who walks up to you. */
    id: 'general-store', zone: 'town', mapV: 17,
    sprite: '/sprites/props/general-store.png',
    x: 1290, y: 800, worldH: 200, blockW: 190, blockD: 85,
    action: 'shop', label: 'GENERAL STORE',
  },
  {
    /* ═══ THE FOUNTAIN, MOVED TO THE MIDDLE ═══
       v2.3.2061 put it at (830,1215), which was measured against open ground
       rather than against a plan. The blueprint makes it the plaza's centre
       piece with the buildings arranged around it, so it comes 135px north to
       (860,1080) -- 99.5% open cobble on an 80px disc, and now equidistant
       from the forge and the store. */
    id: 'fountain', zone: 'town', mapV: 17,
    mapIcon: null,   /* not a building: no roof glyph on the minimap */
    sprite: '/sprites/props/fountain.webp',
    anim: { frames: 8, fps: 12 },
    x: 860, y: 1080, worldH: 170, blockW: 165, blockD: 62,
  },
  {
    /* The market stall, south-west, where the blueprint's produce awning is.
       Scenery: the counter is a painted front, there is nobody behind it, and
       blocking a thing you cannot use only makes the plaza smaller. */
    id: 'market-stall', zone: 'town', mapV: 17,
    mapIcon: null,
    sprite: '/sprites/props/market-stall.png',
    x: 430, y: 1310, worldH: 150, blockW: 185, blockD: 60,
  },
  /* ═══ DRESSING ═══
     From the owner's props sheet (tools/import_town_props.py). Sized against
     a person, who is 120 world px tall here: a lamp stands head and shoulders
     over one, a bench comes to the hip, a banner rail to the chest. None of
     them block -- see the header note. */
  {
    /* v2.3.2073: moved off the anvil.  At (660,1000) its pole was drawn
       straight through the anvil and the west bench -- three objects inside
       forty pixels, which the layout render made obvious the moment they all
       had footprints.  (590,1080) mirrors lamp-plaza-e about the fountain's
       axis, so the plaza has a lamp at each shoulder instead of a pile on one
       side. */
    id: 'lamp-plaza-w', zone: 'town', mapV: 17, mapIcon: null,
    sprite: '/sprites/props/lamp-post.webp',
    x: 590, y: 1080, worldH: 150, blockW: 34, blockD: 20,
  },
  {
    id: 'lamp-plaza-e', zone: 'town', mapV: 17, mapIcon: null,
    sprite: '/sprites/props/lamp-post.webp',
    x: 1130, y: 1080, worldH: 150, blockW: 34, blockD: 20,
  },
  /* ═══ v2.3.2071: BOTH BENCHES LOOK AT THE FOUNTAIN ═══
     Owner: "Position the benches so that lengthwise they face the fountain.
     Tallest back part should be furthest back from the fountains."

     WHAT THE ART CAN DO decides where they go. The bench is one
     three-quarter view: its length runs lower-left to upper-right, the
     backrest is on the NORTH-WEST side and the seat faces SOUTH-EAST. There
     is no rear view and no north-facing pose, so a bench can only ever sit
     north-west of what it looks at -- or north-EAST of it, mirrored, which is
     what `flipX` is for. That is why they are a pair on the fountain's north
     side rather than ringing it: two benches at the head of the square
     looking in at the water is the arrangement this art actually supports.

     The old bench-e was the case that made the ask: at (1050, 1230) the
     fountain was up and to its LEFT, so it had its back to the water and a
     sitter faced away across the plaza.

     Both are now 130 px either side of the fountain's axis at the same y, so
     they mirror each other exactly. Measured, not eyeballed: the line to the
     fountain leaves each one at 39 degrees below horizontal (the diagonal the
     art's seat is drawn along), the ground under each base band samples 93%
     and 97% cobble, and neither drawn rect touches another prop's.

     THE WEST ONE SITS INSIDE SHOPKEEPER BRO'S PATROL, by about 20 px, and
     that is the best the north-west quadrant allows -- a sweep of every
     position in the plaza found seventeen spots that satisfy the owner's
     geometry on that side and all seventeen are inside his 110 px wander
     disc, because the forge, its anvil, the west lamp and the blacksmith
     already own the rest of it. Benches are non-blocking dressing by design
     (see the header), so he ambles past rather than getting stuck; worth an
     owner's eye if he ever reads as standing IN it. */
  {
    id: 'bench-w', zone: 'town', mapV: 17, mapIcon: null,
    sprite: '/sprites/props/bench.webp',
    x: 730, y: 975, worldH: 75, blockW: 72, blockD: 34,
  },
  {
    /* Mirrored, so its back is on the north-EAST side and its seat looks
       south-west at the fountain. A sign on the x scale, not a second copy of
       the art -- see the flip note in entityRenderer's _updateProps. */
    id: 'bench-e', zone: 'town', mapV: 17, mapIcon: null,
    sprite: '/sprites/props/bench.webp',
    x: 990, y: 975, worldH: 75, blockW: 72, blockD: 34, flipX: true,
  },
  /* ═══ v2.3.2078: THE GATE BANNERS ARE SCENERY — THEY WERE WALLING THE TOWN IN
     The town's only way out is the stone staircase down the south cliff, and
     TOWN_EXITS puts the World View trail-head on it at tile (25, 48) — world
     x 800..832.  banner-gate-e stood at x 810 with a 78px footprint, so
     v2.3.2073's "make sure the objects are unwalkable" stamped a wall across
     x 771..849 at y 1424..1450: straight over the top of the steps.

     Measured, walking south from the plaza at five lanes: x 660, 770, 816 and
     860 all stop dead at y 1412, and only x 715 gets through — a 110px gap
     WEST of the stairs that leads nowhere.  The exit tile itself is clear and
     unreachable, so a player could not leave town on foot at all.  (A player
     placed south of the banners was pushed back north through them, which is
     the same wall seen from the other side.)

     Blocking them buys nothing — you cannot use a banner, and worldProps
     already leaves the market stall walkable for exactly that reason ("the
     counter is a painted front... blocking a thing you cannot use only makes
     the plaza smaller").  Losing them costs the town its gate.  So the art
     stays exactly where the owner put it and the footprint comes off.

     If they should be solid, the fix is to move banner-gate-e EAST of the
     stairs (centre ~880 puts its footprint at 841..919, clear of the exit
     tile) rather than to give this one back its blockW/blockD. */
  {
    /* The town's colours on the way in from the south gate, standing in for
       the blueprint's banner arch until that art exists. */
    id: 'banner-gate-w', zone: 'town', mapV: 17, mapIcon: null,
    sprite: '/sprites/props/fence-banner.webp',
    x: 620, y: 1450, worldH: 95,
  },
  {
    id: 'banner-gate-e', zone: 'town', mapV: 17, mapIcon: null,
    sprite: '/sprites/props/fence-banner.webp',
    x: 810, y: 1450, worldH: 95,
  },
  {
    /* Owner: "This anvil belongs near the blacksmith." It follows the forge
       west -- it was measured against the v16 town and has been off the map
       since. A step from his door and clear of the wall, at (470,930) rather
       than the (500,880) this was first placed at: sampling the EDGES rather
       than the centre put its right-hand side 39% in a shrub. Centre-only
       checks pass things that hang over scenery -- the mayor's house did the
       same thing in this pass. */
    id: 'anvil', zone: 'town', mapV: 17, mapIcon: null,
    sprite: '/sprites/props/anvil.png',
    x: 640, y: 960, worldH: 46, blockW: 46, blockD: 24,
  },

  /* ═══ STILL UNPLACED: measured against town_v16 (96x30 tiles) ═══
     The map that ships is 52x55, so these x values run off the right-hand
     edge of the world. They are a to-do, not a deletion: re-measure against
     the current art, mark them mapV 17, and they come back. */
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
