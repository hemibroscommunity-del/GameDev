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
  /* ═══ v2.3.2631: THE EAST LAMP GOES, IT WAS ON THE WAY OUT ═══
     Owner: "Just remove the lamp post to the right of the fountain. It just
     gets in the way of the exit path."

     lamp-plaza-e stood at 55%,70% -- between the fountain (44%,66%) and the
     staircase off the south edge (TOWN_EXITS, 48%,87%), so the walk from the
     plaza to the way out ran straight into its 40x20 footprint.  It is the
     only prop on that line.  lamp-plaza-w stays: it is west of the fountain,
     nowhere near the path, and the pair's symmetry was never the point -- the
     v2.3.2069 note that placed them says the east one mirrors the west "about
     the fountain's axis", which is a reason to put it there, not a reason to
     keep it when it blocks the exit.

  ═══ v2.3.2630: THE ENCHANTER IS GONE, AND THE BANK TAKES ITS SHELF ═══
     Owner: "Remove the enchanter building and put the bank in its place."

     Only a PROP makes a door -- the proximity scan reads propsForZone and
     p.action (BroTown.jsx), and BUILDINGS supplies only the label, icon and
     action for whatever the scan finds.  Most of that table already has no
     prop (marketplace, kitchen, tavern, woodworker, gambling den, gem cutter),
     so the 'enchanting' row is LEFT ALONE: deleting it would be churn against
     a catalogue that is already mostly doorless, and it is what brings the
     building back if the owner wants it somewhere else.

     TWO THINGS THIS COSTS, both worth knowing before it is undone:

     1. Gear enchanting has NO other way in.  `buildingPanel === 'enchant'`
        (BroTown.jsx) is reached only from this door; the Pet House's "Enchant"
        tab is pet enchanting, a different system.  So "Slot gems into gear" is
        off the map until a door for it exists again.
     2. The town is down to THREE doors -- forge, bank, auction house.  mayor_1
        ("Visit 3 buildings in town") declares `needsDoor: 3` and unlocks
        'zone_exits', so the whole world hangs off it, and its own check wants
        three DISTINCT visits.  Three doors is exactly the minimum: it still
        passes, with no slack at all.  A fourth door going away takes the world
        with it, which is the wall v2.3.2087 wrote that guard to prevent.

  ═══ v2.3.2628: SPREAD ACROSS THE BIGGER PLATEAU ═══
     Owner, with the map: "These buildings need to be more spread out there."

     zones.js took town from 52x55 to 68x72 tiles the same day (the size the
     owner said had gone missing), and every position below moved with it.
     They did NOT simply scale: scaling preserves crowding exactly, and the
     layout was crowded -- rendered at v2.3.2626 the bank's art overlapped
     the auction house's, the enchanter nearly touched it, and the whole
     southern half of the plaza was empty cobble.

     So the doors were re-placed around the plaza's edge, each in its own
     quarter, with the open middle left open:

       mayor-house  46%, 27%   the north terrace, up the painted stairs
       forge        24%, 52%   west, clear of the cliff by ~60px of cobble
       auction-house 75%, 56%  east, facing the plaza across it
       bank         78%, 71%   east, against the rocks, off the exit path
       fountain     44%, 66%   the middle, which is now a middle
     (lamp-plaza-e was here too, until v2.3.2631 took it off the exit path.)

     Percentages of the map, because that is what the layout renderer prints
     and what the next move should be quoted in.  PROP SIZES ARE UNCHANGED:
     a building is the same number of world px it was, so it draws the same
     size on screen and the 1.71x of extra ground shows up as distance
     between buildings rather than bigger buildings.

     VERIFIED BY LOOKING, not by arithmetic: tools/maps/render-town-layout.mjs
     draws this table onto the live art at world scale (a node port of the
     python one, which cannot run in this sandbox -- Pillow is not installed,
     and a layout picture that only renders on someone else's machine is one
     nobody checks).  Both nudges after the first pass came from that picture:
     the forge at 22% had its left wall in the cliff and the auction house at
     78% hung its sign over the east fence.

  ═══ v2.3.2065: THE TOWN, LAID OUT TO THE OWNER'S BLUEPRINT ═══
     The owner supplied a mockup of where things go: mayor's house up the
     stairs, blacksmith west, auction house east, fountain dead centre, a
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
    /* v2.3.2811: the -still art -- its two flags cut out to wave on their
       own (tools/cut_prop_parts.py; rendering/worldLife.js draws them back
       on).  Same canvas, same size, so worldH and the anchor are unchanged. */
    sprite: '/sprites/props/mayor-house-still.png',
    x: 1001, y: 622, worldH: 550, blockW: 454, blockD: 206,
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
    /* v2.3.2811: -still: the hanging sign cut out to swing, the painted
       smoke cut out for live smoke (tools/cut_prop_parts.py) */
    id: 'forge', zone: 'town', mapV: 17, sprite: '/sprites/props/forge-still.png',
    x: 522, y: 1198, worldH: 500, blockW: 470, blockD: 200,
    action: 'forge', label: 'BLACKSMITH',
  },
  {
    /* AUCTION HOUSE, east side, mirroring the forge. Its shelf is where the
       potions are bought from -- Shopkeeper Bro sells them too (v2.3.2063),
       and having both is the blueprint's own arrangement: a shop you walk
       into and a merchant who walks up to you. */
    /* v2.3.2624 (owner: "change everything to auction house"): id, sprite and
       action all renamed with the label.  The id is NOT persisted -- the only
       thing that records a visit is `stats.visitedBuildings`, which holds the
       BUILDINGS *index* (a number), not this string -- so there is nothing to
       migrate.  Checked before renaming, per the rule that a rename must not
       lose anyone's data. */
    /* ═══ v2.3.2626: THE OWNER'S AUCTION HOUSE ART, AND IN OFF THE EDGE ═══
       Owner sent building art and asked for it "closer to town".  Both halves
       are measured rather than eyeballed, the way every other position here
       was.

       THE ART.  1254x1254 raw, 1179x1172 once the transparent margin is
       trimmed -- so very nearly square (aspect 1.006).  Downscaled to 515x512
       to match the family (bank 511x512, mayor-house 494x512) through a
       PREMULTIPLIED resize: RGBA resized straight lets transparent black bleed
       into every antialiased edge and leaves a dark halo round the roofline.
       469KB, which is bank-sized (463KB), so no download regression.

       THE SIZE.  200 -> 360.  At 200 it was drawn 206 across and read as a
       market stall next to a 500px forge and a 320px bank; it was also the one
       building in town SHORTER than the 216 floor mp-townbuildings uses for
       "clearly bigger than a person" (120 x 1.8).  360 makes it a peer of the
       bank and the enchanter without becoming the forge.

       THE FOOTPRINT.  blockW/blockD are 0.58 and 0.40 of the drawn sprite,
       which covers 86% opaque pixels -- squarely in family (bank 86%,
       enchanter 94%, forge 82%, mayor-house 80%).  Narrower and deeper than
       its neighbours because this art stands on a diamond cobble APRON: a
       wide, shallow rectangle would block two big empty triangles either side
       of the apron's front point, which is bumping into thin air.

       WHY (1150,1020) AND NOT CLOSER.  Distance to the fountain goes 513 ->
       296, and it comes 220px south out of the north-east corner onto the
       plaza proper, facing the fountain.  Closer than that is not available:
       every position further north or west draws the roof over the
       ENCHANTER's facade (measured as real sprite-pixel overlap, not bounding
       boxes -- at y=1020 it touches 0.9% of the enchanter, at y=990 5.5%, at
       y=970 10.2%), and the middle of the plaza is not where the blueprint
       puts this building.  lamp-plaza-e ends up standing in front of the
       steps; that was rendered and looked at rather than argued about, and it
       reads as a street lamp lighting the entrance.

       WHAT THE MOVE FIXES.  The old corner position walled off the eastern
       plateau: walking east along y=800 used to stop dead at x=1182.  It now
       runs to x=1476.  Reachability is otherwise unchanged -- the town mask
       with every footprint stamped on flood-fills to 94.26% from the exit,
       against 94.35% before (the missing cells are the off-plateau trees, and
       are pre-existing); all four doors keep a standable cell within the 95px
       prompt radius, this one at 7px. */
    /* v2.3.2628: the owner sent new art for this building, the mayor's
       house and the bank.  Imported through tools/import-building-art.mjs
       -- trimmed to the alpha bbox, downscaled PREMULTIPLIED (a straight
       RGBA average leaves a dark halo round the roofline) and re-encoded
       with adaptive row filters.  514x512, 462KB, which is the same
       shelf the rest of the family sits on. */
    id: 'auction-house', zone: 'town', mapV: 17,
    /* v2.3.2811: -still: the sign, the banner, the scales and the flag cut
       out to move (tools/cut_prop_parts.py) */
    sprite: '/sprites/props/auction-house-still.png',
    x: 1632, y: 1290, worldH: 550, blockW: 321, blockD: 220,
    action: 'auctionhouse', label: 'AUCTION HOUSE',
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
    x: 957, y: 1521, worldH: 260, blockW: 252, blockD: 95,
  },
  {
    /* The market stall, south-west, where the blueprint's produce awning is.
       Scenery: the counter is a painted front, there is nobody behind it, and
       blocking a thing you cannot use only makes the plaza smaller. */
    id: 'market-stall', zone: 'town', mapV: 17,
    mapIcon: null,
    sprite: '/sprites/props/market-stall.png',
    x: 522, y: 1705, worldH: 185, blockW: 228, blockD: 74,
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
    x: 740, y: 1613, worldH: 250, blockW: 57, blockD: 33,
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
    /* ═══ v2.3.2088: ONE BENCH, AND IT FINALLY FACES THE WATER ═══
       Owner: "Remove the banners and bench-e. Rotate bench-w clockwise (so
       the seat portion faces the fountain)."

       THE ART WAS READ BACKWARDS IN v2.3.2071.  That note says "the backrest
       is on the NORTH-WEST side and the seat faces SOUTH-EAST", and the sprite
       says the opposite: the backrest runs along the upper-right and the seat
       opens toward the LOWER-LEFT.  So a bench placed north-west of the
       fountain -- which is what both of them were, on that reasoning -- had
       its back to the water, which is the fault the owner reported in the
       first place.  Two benches were arranged symmetrically around a mistake.

       AND THE FIX IS A MIRROR, NOT A ROTATION.  Rotating this sprite 90
       degrees does not turn the bench, it tips it over: the art is a single
       three-quarter view drawn against the ground plane, so a 2D rotation
       rotates the perspective too and the bench ends up lying on its side.
       Rendered all four options and looked at them.  `flipX` swings the seat
       from lower-left to lower-RIGHT, and from (730, 975) the fountain at
       (860, 1080) is exactly lower-right -- so the mirror is what the owner's
       parenthetical actually asks for, and the rotation is what it cannot
       have without new art. */
    id: 'bench-w', zone: 'town', mapV: 17, mapIcon: null,
    sprite: '/sprites/props/bench.webp',
    x: 653, y: 1428, worldH: 75, blockW: 72, blockD: 34, flipX: true,
  },
  /* ═══ v2.3.2088: THE GATE BANNERS ARE GONE ═══
     Owner: "Remove the banners and bench-e."

     v2.3.2078 had already taken their FOOTPRINTS off, because banner-gate-e
     stood at x 810 with a 78px block and the World View trail-head is on the
     stairs at world x 800..832 -- it had walled the town's only way out, and
     five lanes walked south all stopped dead at y 1412.  The art stayed
     because the owner had placed it.  Now the art goes too, so the south
     approach is open ground and there is nothing left at the gate to walk
     into or around.

     The pair were standing in for a banner ARCH the blueprint wants and the
     game does not have art for.  If that arch is ever drawn, it belongs here,
     and it must clear x 800..832 or it repeats v2.3.2078 exactly. */
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
    x: 566, y: 1336, worldH: 52, blockW: 52, blockD: 27,
  },

  /* ═══ STILL UNPLACED: measured against town_v16 (96x30 tiles) ═══
     The map that ships is 52x55, so these x values run off the right-hand
     edge of the world. They are a to-do, not a deletion: re-measure against
     the current art, mark them mapV 17, and they come back. */
  /* ═══ v2.3.2086: THE BANK AND THE ENCHANTER COME BACK ═══
     The note above says exactly what to do -- "re-measure against the current
     art, mark them mapV 17, and they come back" -- and this is that, done.
     They had sat at x 1810 and x 2130, off the right edge of a 52x55 map,
     since the v17 art landed.

     WHY THEY WERE WORTH FINDING.  Twelve building panels are written and
     working; only TWO had a door on the current map (forge and auction-house,
     the two with `action` above).  These two are the cheapest of the ten
     missing: the art ships, the panels ship, and only the coordinates were
     stale.  The other eight need either new art or a decision to reach them
     another way, which is the owner's call and not a placement problem.

     PLACED THE SAME WAY EVERY OTHER PROP HERE WAS: candidate anchors filtered
     to those whose whole footprint AND a 70px standing apron in front of the
     door are clear of every other footprint, then rendered and looked at
     (tools/maps/render_town_layout.py).  Both sit on the east plaza, which is
     the only quarter with room for a 220-wide building that is not already
     spoken for -- the west half holds the forge (470 across) and the market
     stall, and the north is the mayor's terrace. */
  {
    /* v2.3.2811: -still: the coin crate and both flags cut out to move
       (tools/cut_prop_parts.py) */
    id: 'bank', zone: 'town', mapV: 17, sprite: '/sprites/props/bank-still.png',
    x: 1495, y: 760, worldH: 520, blockW: 357, blockD: 154,
    action: 'bank', label: 'BANK',
  },

  /* ═══════════════════════════════════════════════════════════════════════
     v2.3.2651: FROST RIDGE DECOR — the first props outside town
     ═══════════════════════════════════════════════════════════════════════
     Six free-standing masses, commissioned and measured under
     docs/ART-ASSET-PHASES.md.  They exist to be WALKED BEHIND: dynamic
     occlusion shipped at v2.3.2633 (depthSort.js) and until now the only
     things in the world that could occlude anybody were nine town buildings,
     so nine-tenths of the game got nothing out of it.

     ── WHY THESE SIZES LOOK SMALL ──
     A pine here is 160 world px against a 120 world px person, and that is
     not a mistake.  frost_v5.webp's OWN near-field pines measure 95-115 world
     px with a world-pixel ruler on the art, so in this game's paintings a
     tree is about as tall as a person.  The first pass sized these 280-320 --
     physically right for a pine -- and rendered at ~3x the scale of every
     baked tree in the same frame.  Verified by LOOKING (the props drawn onto
     the live art at world scale beside a player figure), which is the method
     the town respread used at v2.3.2628 and the only one that catches this.

     ── POSITIONS ──
     Chosen off the walk mask and the painting together, in world px, with
     three fixed points kept clear: the nw-entry arrival at (864, 768), the
     return portal on the bottom-edge row below it, and the painted dirt path
     that runs roughly x 540-660 through the y 500-800 band.  Each prop sits
     BESIDE that path rather than on it -- the point is to walk past and
     behind them, and a prop in the road is just a wall.

     EVERY ONE OF THESE BLOCKS, because blockW/blockD is what makes a prop
     solid (v2.3.2073, and stampPropFootprints stamps them onto frost's real
     mask exactly as it does town's).  Footprints were checked against each
     other and against the two portal points; none overlaps. */
  {
    id: 'frost-pine-pair', zone: 'frost', sprite: '/sprites/props/frost-pine-pair.png',
    x: 360, y: 700, worldH: 160, blockW: 119, blockD: 56,
  },
  {
    /* The west snow/grass edge, mirroring the pine pair across the field. */
    id: 'frost-pine-ridge', zone: 'frost', sprite: '/sprites/props/frost-pine-ridge.png',
    x: 270, y: 380, worldH: 150, blockW: 118, blockD: 53,
  },
  {
    /* Wide and low, laid across the snow/grass transition. 253 across, so it
       is the one piece here big enough to hide a walking figure outright --
       which is why it sits mid-map where the player crosses rather than in a
       corner. Its east edge stops at x 531, just short of the path. */
    id: 'frost-rock-ridge', zone: 'frost', sprite: '/sprites/props/frost-rock-ridge.png',
    x: 430, y: 570, worldH: 120, blockW: 202, blockD: 42,
  },
  {
    id: 'frost-rock-mound', zone: 'frost', sprite: '/sprites/props/frost-rock-mound.png',
    x: 800, y: 470, worldH: 130, blockW: 119, blockD: 46,
  },
  {
    /* Up on the ice flat, where the ice crystals in the art belong. */
    id: 'frost-ice-mound', zone: 'frost', sprite: '/sprites/props/frost-ice-mound.png',
    x: 600, y: 260, worldH: 100, blockW: 114, blockD: 35,
  },
  {
    /* Small, on the south grass the player crosses on arrival -- near enough
       to read on the first screen, far enough (170px) not to crowd the
       arrival point. */
    id: 'frost-snow-shrubs', zone: 'frost', sprite: '/sprites/props/frost-snow-shrubs.png',
    x: 700, y: 830, worldH: 80, blockW: 75, blockD: 28,
  },

];

/* ═══ v2.3.2651: WHICH PROPS RIDE THE STARTUP GATE, AND WHICH DO NOT ═══
 *
 * Until frost got decor, every prop was a town prop and `propSpriteSources()`
 * could hand the whole table to the intro gate without anybody noticing. That
 * stops being true the moment a second zone has art: twelve zones' worth of
 * decor on the pre-game gate is ~2.4MB of fetch and, far worse, tens of MB of
 * decoded RGBA resident for the life of the page for art you can only see in
 * one zone. That is precisely the iPhone RAM regression the ZONE-ASSET
 * EXCEPTION in CLAUDE.md was written for (v2.3.1405), and the leak half of it
 * that v2.3.2272 had to go back and fix.
 *
 * So the split is DERIVED rather than flagged per prop. A flag is a thing to
 * forget; residency is a property of the ZONE, and these two are the same
 * hubs `freeZoneMap` already refuses to unload (tiledMaps.js) -- town because
 * you are always one step from it, worldview because it is the junction every
 * spoke hangs off. Anything else is somewhere you visit.
 */
const RESIDENT_ZONES = new Set(['town', 'worldview']);

/** Is this prop's art global (rides the intro gate) or per-zone? */
function propIsResident(p) {
  return !!p && RESIDENT_ZONES.has(p.zone);
}

/** The decor sprites for ONE zone — loaded by `preloadZoneAssets` behind the
 *  per-zone overlay and released by `freeZoneAssets` on the way out.
 *  Empty for the resident hubs, whose props are on the global manifest. */
export function zoneDecorSources(zoneId) {
  if (!zoneId || RESIDENT_ZONES.has(zoneId)) return [];
  return [...new Set([
    ...WORLD_PROPS.filter((p) => p.zone === zoneId && propIsPlaced(p) && !propIsResident(p))
      .map((p) => p.sprite),
    /* v2.3.2655: the foreground pieces ride the SAME per-zone list.  They are
       the same kind of thing -- a transparent PNG that means nothing outside
       one zone -- so giving them a second loader and a second free path would
       be two things to keep in step for no gain, and the day one of them is
       forgotten is the day a zone leaks a texture. */
    ...foregroundForZone(zoneId).map((f) => f.sprite),
  ].filter(Boolean))];
}

/* ═══════════════════════════════════════════════════════════════════════════
   v2.3.2655: THE NEAR-CAMERA FOREGROUND
   ═══════════════════════════════════════════════════════════════════════════
   DEPTH-ROADMAP item 5.  Until now an EDGE-CROPPED asset -- a canopy whose
   branches run off its own canvas, a mountain shoulder cut at the bottom --
   could not be drawn by anything in this game.  `depthSort.js` places every
   world object by its ground-contact line, and a cropped piece has none;
   three of the first four assets ever commissioned for BroTown were held for
   want of this table (docs/ART-ASSET-PHASES.md §3).

   ── WHY THESE ARE NOT PROPS ──
   A prop is a thing standing IN the world: it sorts by where it touches the
   ground, it blocks your feet, and since v2.3.2652 it stops a shot.  A
   foreground piece is none of those.  It is between the camera and the world,
   it touches nothing, and it must never block or occlude for gameplay
   purposes -- you cannot take cover behind a branch that is hanging in front
   of the lens.  Sharing the WORLD_PROPS table would mean a `foreground: true`
   flag that half the prop code then has to remember to skip, which is how a
   canopy ends up with a collision box.  A separate table cannot make that
   mistake.

   ── ANCHORED AT THE CENTRE, ON PURPOSE ──
   Props anchor bottom-centre because their bottom edge IS their ground line.
   These have no ground line, so the centre is the only honest anchor: the
   piece is placed where its mass should sit and the crop falls where it
   falls.

   ── THE PLACEMENT RULE, LEARNED THE HARD WAY ──
   EVERY PRE-CUT EDGE OF THE ART MUST LIE OUTSIDE THE MAP.  These assets are
   already cropped in the source, so a cut that lands inside the playfield
   draws as a hard straight seam -- the pasted-rectangle look this table
   exists to avoid.  It is not enough to be "near an edge": a piece cut across
   its bottom needs its bottom edge past y = mapH, not merely low down.

   In a 32x32 zone the camera NEVER SCROLLS VERTICALLY -- the view is 1024
   world px tall against a 1024px map (worldViewport's per-zone floor,
   v2.3.2247) -- so the top and bottom of the view are always the top and
   bottom of the map.  A bottom-cut piece therefore has exactly one home: a
   bottom corner.  Horizontally the camera does scroll, so a side cut only
   has to clear the map edge.

   `flipX` earns its keep here more than anywhere: a piece cropped on its LEFT
   becomes a piece cropped on its RIGHT for free, so one canopy frames both
   sides of a map.  ART-ASSET-PHASES §4 says to ask for one good asset rather
   than a handed pair; this is where that pays.
*/
export const ZONE_FOREGROUND = {
  frost: [
    {
      /* Cropped on its LEFT only (22% of that edge is ink); the other three
         edges are the art's own foliage, so only that one has to hide.
         MIRRORED, which turns the left cut into a right cut and lets the east
         edge carry it -- the flip earning its keep exactly as advertised. */
      id: 'fg-canopy-e', sprite: '/sprites/props/frost-pine-canopy-a.png',
      x: 990, y: 620, worldH: 260, flipX: true,
    },
    {
      /* Cropped bottom AND left (67% / 43%).  The south-west corner is the
         only placement that puts both cuts off the map at once. */
      id: 'fg-canopy-sw', sprite: '/sprites/props/frost-pine-canopy-b.png',
      x: 90, y: 980, worldH: 260,
    },
    {
      /* Cut clean across its whole bottom edge (100%) and up its left (73%),
         so it needs a BOTTOM corner -- mirrored, the south-east one: a crag
         mass rising into frame from the lower right.
         The first placement put it in the NORTH-east, where the content
         matched frost's own ice cliffs beautifully and the bottom cut landed
         at y 370 -- a hard horizontal seam straight across the map, which is
         precisely the pasted-rectangle look this table exists to prevent.
         A screenshot caught it. All four assertions covering this piece
         passed while it was broken, because "is it drawn, on the right layer,
         at the right size" cannot see a seam. */
      id: 'fg-peak-se', sprite: '/sprites/props/frost-peak-corner.png',
      x: 950, y: 960, worldH: 260, flipX: true,
    },
  ],
};

/** The near-camera pieces for a zone, or an empty list. */
export function foregroundForZone(zoneId) {
  if (!zoneId) return [];
  return (Object.prototype.hasOwnProperty.call(ZONE_FOREGROUND, zoneId) && ZONE_FOREGROUND[zoneId]) || [];
}

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

/** Every distinct GLOBAL prop sprite — the preload manifest's source list. */
export function propSpriteSources() {
  /* v2.3.2061: only the props that can actually be DRAWN. The four v16
     buildings are held back until someone re-measures them (propIsPlaced), and
     preloading ~1MB of art for objects no zone will ask for is a cost paid on
     the startup gate -- the one place in this game where bytes are most
     expensive. They come back with their positions, in the same change. */
  /* v2.3.2651: ...and for the same reason, only the RESIDENT zones' props.
     Zone decor loads per-zone through zoneDecorSources() -- see the note above
     RESIDENT_ZONES. Filtering here rather than at the call site because this
     function IS the gate's definition of "prop art", and a second caller that
     forgot the filter would put the whole world back on the startup peak. */
  return [...new Set(
    WORLD_PROPS.filter((p) => propIsPlaced(p) && propIsResident(p))
      .map((p) => p.sprite).filter(Boolean),
  )];
}

/** Props that are ANIMATED — `{id, sprite, frames}` — for the strip slicer.
 *  Separate from propSpriteSources because the loader needs the frame count
 *  to cut the strip, and the manifest only needs the url. */
/* v2.3.2651: resident-only, matching propSpriteSources. This slicer runs once,
   behind the intro gate, off textures the gate loaded -- so an ANIMATED prop in
   a per-zone table would find nothing in the registry and silently render as a
   still. No such prop exists today (frost's six are all stills). Adding one
   means slicing it in the per-zone loader, not relaxing this filter. */
export function propAnimStrips() {
  return WORLD_PROPS.filter((p) => propIsPlaced(p) && propIsResident(p) && p.anim && p.anim.frames > 1)
    .map((p) => ({ id: p.id, sprite: p.sprite, frames: p.anim.frames }));
}

/* v2.3.1813 dev probe, house style (__btWorldProps): the props switch itself.
   mp-townprops / mp-townbuildings need to tell "switched off by directive"
   apart from "drawing is broken" — an empty prop list looks identical from the
   outside, and a scenario that treated the two the same would either fail
   every run while they are off or pass silently once they come back. */
if (typeof window !== 'undefined') window.__btTownPropsEnabled = () => TOWN_PROPS_ENABLED;

/* ═══════════════════════════════════════════════════════════════════════════
   v2.3.2652: A PROP STOPS AN ATTACK, NOT JUST A FOOT
   ═══════════════════════════════════════════════════════════════════════════
   Owner: "I would like it if these props could block my and enemy attacks."

   Props have blocked MOVEMENT since v2.3.2073 and blocked SIGHT since
   v2.3.2633 (you pass behind them).  The one thing they did not do is stop a
   shot, so a rock you were visibly hiding behind was cover in every sense
   except the one that matters in a fight.

   ── THE BLOCKER IS THE FOOTPRINT, NOT THE PAINTING ──
   `propFootprint` is the same box that stops you walking, and reusing it is
   the whole design rather than a shortcut.  A second, taller "attack box"
   would mean the rock you cannot walk through and the rock arrows cannot
   cross are different rocks, and no player would be able to tell where either
   one ends.  One box, one rule: **if you could not walk that line, a shot
   cannot fly it.**

   It also means a prop with no footprint -- the anvil, the market stall,
   scenery you stroll past -- blocks nothing, which is correct: you can
   already walk through it.

   ── WHY AN ENDPOINT INSIDE A BLOCKER DOES NOT BLOCK ──
   Monsters do not collide with props (the worker has no walkability of any
   kind), so a snowman can and does stand inside the rock ridge.  If "inside"
   counted as blocked he would be permanently unable to attack and the player
   permanently unable to answer -- a monster in a rock would be an invincible
   turret.  Standing in it is treated as standing next to it.

   ── BOTH SIDES RUN THIS, AND THAT IS DELIBERATE ──
   The client gates the shots it CLAIMS (projectiles.js: a ranged hit is
   decided entirely client-side and the worker only clamps range/arc) and the
   worker gates the damage it APPLIES (monster->player, and the player's claim
   against a monster).  Either half alone is safe to deploy: an old worker
   with a new client just takes the client's word as before, and a new worker
   with an old client simply refuses a hit the client predicted -- which is
   the ordinary prediction miss `monster_hit` already exists to correct.  No
   caps gate needed, and that is worth saying out loud because the reflex in
   this repo is to add one.

   The worker's copy is server/src/props.js; server/test/mirror-audit.test.mjs
   asserts the two tables agree, so this cannot drift silently. */

/** Where the segment (x0,y0)->(x1,y1) ENTERS the axis-aligned box `b`, as the
 *  parameter t in [0,1], or -1 if it never does.  Slab method.
 *  The entry parameter rather than a bare boolean because a projectile has to
 *  stop AT the rock: planting it at the frame's end point would bury it inside
 *  (an arrow steps up to 48px a frame), and planting at the frame's start
 *  would leave it hanging short. */
function segEnterT(x0, y0, x1, y1, b) {
  const dx = x1 - x0, dy = y1 - y0;
  let t0 = 0, t1 = 1;
  /* Each axis narrows the surviving span of t. A zero component means the
     segment is parallel to that pair of edges: it can only cross if it
     already lies between them. */
  const axes = [[dx, x0, b.x0, b.x1], [dy, y0, b.y0, b.y1]];
  for (let i = 0; i < 2; i++) {
    const d = axes[i][0], p = axes[i][1], lo = axes[i][2], hi = axes[i][3];
    if (d === 0) { if (p < lo || p > hi) return -1; continue; }
    let a = (lo - p) / d, c = (hi - p) / d;
    if (a > c) { const s = a; a = c; c = s; }
    if (a > t0) t0 = a;
    if (c < t1) t1 = c;
    if (t0 > t1) return -1;
  }
  return t0;
}

/** Is a point inside a blocker box? */
function pointInBox(x, y, b) {
  return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
}

/* ═══ v2.3.2652: THE BLOCKER SET IS BUILT ONCE PER ZONE, NOT PER CALL ═══
   attackBlockPoint runs PER ARROW PER FRAME (projectiles.js), and the first
   cut of this rebuilt the list on every one of those calls -- a fresh array
   plus one object per prop, ten arrows in flight, sixty times a second.  That
   is precisely the per-frame garbage projectiles.js's own header warns about
   ("an allocation here is the kind of per-frame garbage v2.3.2331 spent a
   version removing"), and it showed up exactly where you would expect: in
   mp-hitsweep, whose losses are a FRAME-CLOCK race at the 48px step, the
   registered count fell from ~149/150 to 142-148 with no shot anywhere near a
   prop.  Longer frames -> bigger steps -> more shots sampled either side of
   the hitbox.

   WORLD_PROPS is a static table, so one build per zone is all that is ever
   needed.  Object.create(null) because the key is a zone id (CLAUDE.md
   rule 4). */
const _blockerCache = Object.create(null);

/** Every blocking footprint in a zone — the LOS obstacle set.
 *  The returned array is SHARED and must not be mutated by callers. */
export function zoneBlockers(zoneId) {
  if (!zoneId) return [];
  const hit = Object.prototype.hasOwnProperty.call(_blockerCache, zoneId) ? _blockerCache[zoneId] : null;
  if (hit) return hit;
  const out = [];
  for (const p of propsForZone(zoneId)) {
    const f = propFootprint(p);
    /* v2.3.2730: the footprint says whose it is, so a hit on it can ask what
       the prop is made of (propMaterial) and where to draw on it. */
    if (f) { f.id = p.id; out.push(f); }
  }
  _blockerCache[zoneId] = out;
  return out;
}

/* ═══ v2.3.2730: WHAT A PROP IS MADE OF ═══
   Owner: "make it so that subtle debris comes off the props once they're hit
   by a player projectile ... arrow stuck in (with debris), and sword slash
   marks on the props (with debris)."

   Monsters have answered this question since v2.3.2200 with HIT_MATERIALS
   (monsterVariants.js): a `kind` that decides how the debris behaves and a
   `tint` that colours it.  A prop answers it here, in the SAME two fields, so
   the debris queue (S._debrisBursts) takes a rock exactly the way it takes a
   rock monster -- and whatever draws that queue, today's chunks or the crisp
   material pieces of the hit-materials work in flight as #710, draws a rock
   the way it draws a rock.  `sound` is the BT_AUDIO.swordHit material ('bone'
   is its dry crack, which is what wood sounds like), or 'snow' for the
   snowball thud the snowman already owns.

   Read off the art: the frost rocks are grey stone under snow; the pines are
   laden, so a hit knocks SNOW off them; the ice mound is grey rock with
   crystals, hard enough to bounce; the town's buildings are stone at the
   height anything hits them; the stall and the bench are wood; the lamp and
   the anvil are iron.  Wood and iron take stone's physics (hard pieces that
   bounce) and their own colour.  Anything missing falls back to plain stone,
   the commonest thing a blocker is.  Keyed by prop id, which is a table key,
   hence Object.create(null) (CLAUDE.md rule 4). */
const PROP_MATERIALS = Object.assign(Object.create(null), {
  'frost-rock-ridge':  { kind: 'stone', tint: 0x8d97a3, sound: 'stone' },
  'frost-rock-mound':  { kind: 'stone', tint: 0x8d97a3, sound: 'stone' },
  'frost-ice-mound':   { kind: 'stone', tint: 0xa9c6da, sound: 'stone' },
  'frost-pine-pair':   { kind: 'snow',  tint: 0xeef6ff, sound: 'snow' },
  'frost-pine-ridge':  { kind: 'snow',  tint: 0xeef6ff, sound: 'snow' },
  'frost-snow-shrubs': { kind: 'snow',  tint: 0xeef6ff, sound: 'snow' },
  'mayor-house':       { kind: 'stone', tint: 0x948c80, sound: 'stone' },
  'forge':             { kind: 'stone', tint: 0x7a7670, sound: 'stone' },
  'auction-house':     { kind: 'stone', tint: 0x8f8a82, sound: 'stone' },
  'bank':              { kind: 'stone', tint: 0x9d978c, sound: 'stone' },
  'fountain':          { kind: 'stone', tint: 0xb3b0a8, sound: 'stone' },
  'market-stall':      { kind: 'stone', tint: 0x8b5e3c, sound: 'bone' },
  'bench-w':           { kind: 'stone', tint: 0x8b5e3c, sound: 'bone' },
  'lamp-plaza-w':      { kind: 'stone', tint: 0x40464d, sound: 'stone' },
  'anvil':             { kind: 'stone', tint: 0x40464d, sound: 'stone' },
});
const PROP_MATERIAL_DEFAULT = { kind: 'stone', tint: 0x9a9a9a, sound: 'stone' };

/** What the prop with this id is made of: { kind, tint, sound }. */
export function propMaterial(propId) {
  return (propId && PROP_MATERIALS[propId]) || PROP_MATERIAL_DEFAULT;
}

/** v2.3.2730: which face of box `b` the point (x, y) lies on -- 's' (the
 *  south face, the one the camera sees), 'e', 'w', or 'n' (the back). */
export function boxFace(b, x, y) {
  const e = 0.75;
  if (Math.abs(y - b.y1) <= e) return 's';
  if (Math.abs(y - b.y0) <= e) return 'n';
  if (Math.abs(x - b.x0) <= e) return 'w';
  if (Math.abs(x - b.x1) <= e) return 'e';
  return 's';
}

/* ═══ v2.3.2730: WHERE A SWORD SWING MEETS A PROP ═══
   A projectile meets a prop on its flight line (sweepBlockPoint above); a
   swing has no line, it has a fan -- `halfArc` either side of `ang`, out to
   `reach` from the swinger's feet.  So the fan is sampled as rays and each is
   swept against the footprints exactly as a projectile step is, launch-inside
   rule included.  Of every entry point, the one CLOSEST TO THE MIDDLE OF THE
   SWING wins, not the nearest: a rock at the edge of the arc is grazed, a rock
   in front of you is what the blade lands in.
   Ground points in, ground point out: { id, x, y, face, box }, or null. */
export function propSwingContact(zoneId, px, py, ang, reach, halfArc) {
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(ang) || !(reach > 0)) return null;
  const boxes = zoneBlockers(zoneId);
  if (!boxes.length) return null;
  const n = 6;
  let best = null, bestOff = Infinity;
  for (let k = -n; k <= n; k++) {
    const off = (k / n) * (halfArc > 0 ? halfArc : 0);
    const a = ang + off;
    const hit = sweepBlockPoint(zoneId, px, py, px + Math.cos(a) * reach, py + Math.sin(a) * reach);
    if (hit && Math.abs(off) < bestOff) { best = hit; bestOff = Math.abs(off); }
  }
  if (!best || !best.box) return null;
  return { id: best.box.id, x: best.x, y: best.y, face: boxFace(best.box, best.x, best.y), box: best.box };
}

/** Where a shot along (x0,y0)->(x1,y1) MEETS the first prop in its way, or
 *  null if the line is clear.  Both points are GROUND points — a character's
 *  feet, a monster's base — the same coordinates movement and depth sorting
 *  already use, so a projectile drawn at bow-grip height has to be converted
 *  down before it is asked (see projectiles.js).
 *  The NEAREST blocker wins: with two props on one line an arrow must stop at
 *  the first, not the furthest. */
export function attackBlockPoint(zoneId, x0, y0, x1, y1) {
  if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) return null;
  const boxes = zoneBlockers(zoneId);
  let best = -1;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    /* An endpoint inside the box is "at" the prop, not behind it. */
    if (pointInBox(x0, y0, b) || pointInBox(x1, y1, b)) continue;
    const t = segEnterT(x0, y0, x1, y1, b);
    if (t >= 0 && (best < 0 || t < best)) best = t;
  }
  if (best < 0) return null;
  return { x: x0 + (x1 - x0) * best, y: y0 + (y1 - y0) * best, t: best };
}

/** Does a prop stand between these two ground points? */
export function attackBlocked(zoneId, x0, y0, x1, y1) {
  return !!attackBlockPoint(zoneId, x0, y0, x1, y1);
}

/* ═══ v2.3.2699: A MOVING PROJECTILE NEEDS A DIFFERENT QUESTION ═══
   Owner: "The client side isn't showing snowballs bursting upon hitting props
   but is successfully mitigating damage server side."

   attackBlockPoint above answers "is there a prop BETWEEN these two points?",
   and its endpoint rule is right for that: a shooter or target standing inside
   a footprint is AT the prop, not behind it.  v2.3.2652 then asked it a
   different question -- one frame's STEP of a projectile in flight -- and
   there the rule is exactly wrong.  The frame a ball reaches a rock, the
   step's leading end is INSIDE the rock: skipped.  Every frame after, the step
   starts inside: skipped.  So no step is ever "behind" the prop, and a
   projectile moving in steps shorter than the prop's whole depth passes
   through it every time.  Measured against the frost ridge (42px deep) at
   4, 6, 8, 11, 20, 40 and 60 px/frame: through, every one.  The whole-line
   question the WORKER asks (release -> aim) says blocked, which is why the
   damage was stopped and the ball never was.  The player's own arrows took
   the same call per frame, so they flew through rocks too -- and since the
   client alone decides a ranged hit, that half never worked at all.

   So this is the step version.  Two differences, both from what a step IS:
     - the LEADING end inside a box counts.  That is precisely the frame the
       projectile hits it, and returns the entry point on the near face.
     - a step that STARTS inside a box ignores that box.  A ball launched from
       inside a footprint (a monster spawned in one) flies out of it, which is
       the shooter-inside rule, still correct for the launch point.  It cannot
       fire for a box the projectile has already entered, because entering one
       is the end of its flight.
   Returns { x, y, t, box } for the nearest entry along the step, or null.
   v2.3.2701: `box` is the footprint it entered (the shared object from
   zoneBlockers -- read it, never write it), so the arrow sim can ask who is
   standing in it. */
export function sweepBlockPoint(zoneId, x0, y0, x1, y1) {
  if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) return null;
  const boxes = zoneBlockers(zoneId);
  let best = -1, bestBox = null;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (pointInBox(x0, y0, b)) continue;   /* launched from inside it: fly out */
    const t = segEnterT(x0, y0, x1, y1, b);
    if (t >= 0 && (best < 0 || t < best)) { best = t; bestBox = b; }
  }
  if (best < 0) return null;
  return { x: x0 + (x1 - x0) * best, y: y0 + (y1 - y0) * best, t: best, box: bestBox };
}

/** v2.3.2701: where a step that starts INSIDE box `b` comes out of it, as
 *  { x, y, t } along (x0,y0)->(x1,y1), or null if it never leaves.
 *  The step run backwards enters the box exactly where the step leaves it, so
 *  this is segEnterT on the reversed segment rather than a second slab test. */
export function boxExitPoint(b, x0, y0, x1, y1) {
  if (!b || !Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) return null;
  if (pointInBox(x1, y1, b)) return null;
  const u = segEnterT(x1, y1, x0, y0, b);
  if (u < 0) return null;
  /* v2.3.2730: + the box, as sweepBlockPoint returns it -- the far face is
     still a face of THIS prop, and the hit effects need to know whose. */
  return { x: x1 + (x0 - x1) * u, y: y1 + (y0 - y1) * u, t: 1 - u, box: b };
}

/* Dev probe, house style: the blocker set a scenario is reasoning about, and
   a direct answer for one line. A test that recomputed the geometry itself
   would be asserting its own arithmetic rather than the game's. */
if (typeof window !== 'undefined') {
  window.__btBlockers = (z) => zoneBlockers(z);
  window.__btAttackBlocked = (z, x0, y0, x1, y1) => attackBlocked(z, x0, y0, x1, y1);
  window.__btBlockPoint = (z, x0, y0, x1, y1) => attackBlockPoint(z, x0, y0, x1, y1);
  window.__btSweepBlockPoint = (z, x0, y0, x1, y1) => sweepBlockPoint(z, x0, y0, x1, y1); /* v2.3.2699 */
  window.__btPropSwingContact = (z, x, y, ang, reach, half) => propSwingContact(z, x, y, ang, reach, half); /* v2.3.2730 */
}
