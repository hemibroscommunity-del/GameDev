/* ═══ HUB-AND-SPOKE WORLD — §14 ═══ */
export const ZONES = {
  town: {
    /* ═══ v2.3.1777: THE CLIFFTOP TOWN ═══
       Owner supplied two painted halves and asked for them as ONE town map,
       with the cliffs not walkable.  The art (tools/maps/build-town-v16.mjs)
       stitches to 3303x1024 — a wide semicircular plateau — so the zone is
       96x30 tiles = 3072x960 world px, an aspect of 3.20 against the art's
       3.226.  That 0.8% is a smaller stretch than the square town lived with
       (1254 art into 1536 world, 1.22x) and means the map is drawn very near
       1:1 instead of being blown up.

       This zone now HAS a walkability grid, which is new for town: the old
       square map was walk-anywhere because every edge was painted ground.
       Here the plateau ends in a cliff with a painted valley beyond it, so
       without collision you walk off the edge and stand in the sky. */
    /* ═══ v2.3.1813: A NEW PAIR OF HALVES, AND A DIFFERENT SHAPE ═══
       Owner: "I have a better map of Brotown that I want you to use.  The
       fusion should be better."  The v16 plateau was WIDE (3303x1024, 96x30
       tiles); this one is nearly square (1674x1774), so the zone has to
       change shape with it or the art gets stretched to 3x its aspect.
       52x55 tiles = 1664x1760 world px against the art's 1674x1774 — an
       aspect of 0.945 vs 0.944, so the map draws at 0.994:1, even closer to
       native than v16's 0.8% stretch.  TOWN_SPAWN (constants.js) and the
       World View trail-head (TOWN_EXITS, effects.js) both moved with it;
       they are the only two coordinates anchored to this zone's shape, and
       both were re-checked against the new art rather than converted. */
    /* ═══ v2.3.2628: THE TOWN IS BACK TO ITS OLD EXTENT ═══
       Owner: "Something happened with the town map and half of it got lost.
       It's supposed to be a fused map between two different maps to make it
       larger like it was before."

       The FUSION is intact and always was -- town_v17.webp is both painted
       halves, and tools/maps/build-town-v17.mjs still reproduces it.  What
       was lost is the SIZE, and it went at v2.3.1813 above: v16's plateau
       was 96x30 tiles = 3072x960 world px, and the near-square v17 art
       brought the zone to 52x55 = 1664x1760.  That is 46% narrower than the
       town the owner had been walking around, which is what "half of it"
       describes.

       68x72 = 2176x2304 world px, an aspect of 0.9444 against the art's
       1674x1774 = 0.9437 -- a 0.07% stretch, TIGHTER than the 52x55 box it
       replaces (0.10%) and far tighter than v16's 0.8%.  The art is drawn
       1.30x, uniformly.  That is not the v16 fusion's mistake: what made
       that one look bad was one half upscaled 1.4x RELATIVE to the other,
       so the seam joined sharp art to soft art.  Scaling the whole finished
       map by the same factor has no seam to mismatch, and this painting has
       no pixel grid to break.

       Area goes 2.93M -> 5.01M world px, 1.71x, and past v16's 2.95M in
       both axes.  PROP SIZES ARE DELIBERATELY UNCHANGED: a building is worth
       the same number of world px as before, so it draws the same size on
       screen and the extra room shows up as space BETWEEN buildings, which
       is the second half of what the owner asked for.  Everything anchored
       to this zone moved with it -- TOWN_SPAWN (constants.js), TOWN_EXITS
       (effects.js), every town prop (worldProps.js) and every town NPC
       (gameDisplay.js).  The walk mask is not one of them: town's collision
       is prop footprints only (WALK_MASKS_ENABLED is false, tiledMaps.js
       v2.3.1794), so there is no grid to re-derive. */
    id: 'town', name: 'Town', w: 68, h: 72,
    element: null, level: [0, 0], music: 'town', safe: true,
    palette: { ground: '#4a6741', path: '#8b7355', accent: '#5a7a50' }
  },
  worldview: {
    /* v2.3.859: zoomed-out hub map. The town is the small circle at its
       centre; trails branch to every region (WORLDVIEW_EXITS). The avatar
       renders as a speck toward the distant trails (playerScale) and moves
       slower there (BroTown movement), to sell the vista's depth. */
    id: 'worldview', name: 'World View', w: 48, h: 48,
    element: null, level: [0, 0], music: 'town', safe: true,
    palette: { ground: '#b89a5a', path: '#cdb27a', accent: '#7aa050' },
    spawns: [],
    atmosphere: { tint: 'rgba(180,200,230,0.03)', vignette: 'rgba(80,110,150,0.05)' },
    playerScale: { near: 0.55, far: 0.03, curve: 0.6 },
    /* ═══ v2.3.2257: THE VISTA KEEPS THE PRE-v2.3.2247 WIDTH RULE ═══
       Owner: "For character size in worldview revert to how big the character
       was previously.  He's too small in worldview now."
       He is: playerScale above already shrinks him on purpose, and v2.3.2247's
       per-zone floors then shrank the WORLD too -- 48x48 is 1536 world px, so
       this zone never reaches its own floor and drops to the flat
       FIGURE_SCALE_FLOOR.  0.50 against the 0.735 the old rule gave on a 430pt
       phone: 29.1 CSS px of character where there used to be 42.7.
       585 is `Math.round(390 * 1.5)` -- REF_VIEW_W at the WORLD_ZOOM of the
       day, read off worldViewport.js at 2deb56a, the commit before v2.3.2247.
       It is a floor like every other term, so it can only zoom IN and can
       never draw void: 1536 world px against a 585-wide view has room to
       spare.  worldViewport reads these; nothing else does.

       BOTH AXES, because the old rule had both.  The first cut carried only
       the width and applied it in either orientation, which is not the rule it
       claims to restore: sideways, pre-v2.3.2247 used REF_VIEW_H = 480 on the
       HEIGHT (the two-widths law, v2.3.2156).  Spending the width there gave
       844/585 = 1.443 -- the vista zoomed to nearly triple, the figure from
       31.9 to 83.9 CSS px.  Caught by putting a landscape row in the table. */
    refViewW: Math.round(390 * 1.5),   /* 585 -- portrait */
    refViewH: 480,                     /* sideways, the same commit's REF_VIEW_H */
    /* ═══ v2.3.2124: THE MAGNIFYING GLASS ═══
       Owner: "there was a fair point about the character being too small in
       worldview.  Maybe it can show character full size but through a
       'magnifying glass'."  Tee raised it first, on accessibility grounds:
       "The charter is too small ... someone with visual impairment might
       struggle with it."

       ═══ v2.3.2141: THE GLASS STAYS, THE MAGNIFICATION GOES ═══
       Owner, after living with it: "Change the character back to tiny on
       worldview and center them inside the magnifying glass (that'll be
       enough)."

       v2.3.2124 answered "too small" by making the figure BIG -- `scale: 0.9`
       took the local player off the perspective curve entirely, so he stood
       at nearly his town size on a map whose whole job is to look far away.
       That reads as a character who forgot to shrink, and it flattens the
       vista at the one spot your eye is always on.

       The finding underneath was still right, and so is the fix that is left:
       what you actually need on the World View is to KNOW WHERE YOU ARE, and
       a ring does that without touching the depth.  So `scale` is gone (the
       curve governs your figure again, exactly as it does every peer) and the
       ring stays at its full size around a speck -- which is what a magnifier
       held over a map looks like, and what keeps you findable at the rim
       where the curve takes the figure to 3%.

       `cyUnits` replaces the old fixed `cy`.  A constant pixel lift was only
       ever correct at ONE figure size: it was -26 for the 0.9 figure, and the
       same -26 over a 4px speck at the rim would hang the glass a whole body
       above him.  It is now multiplied by the figure's LIVE render scale
       (tileRenderer._drawPlayerLens), so the glass centres on him at every
       distance -- which is the half of the owner's sentence that is easy to
       skip and is the entire point of the change.

       WHERE -45 COMES FROM, since the old -26 was eyeballed and landed a
       quarter of the way up the figure rather than halfway.  The body cell is
       256px tall and the figure stands in rows 23..223 of it (the same frame
       geometry NPC_FRAME_TOP_Y / NPC_FRAME_FEET_Y name in entityRenderer), so
       its visual middle is (223-23)/2 = 100 cell-px above the feet, which is
       0.39 of the cell.  The drawn body measures 114.6 container units, and
       0.39 x 114.6 = 44.8.  Measured on a real client rather than trusted:
       mp-wvglass reads the figure the renderer actually drew and checks the
       glass is centred on it, at three distances across the vista.
       Peers are untouched and always were: the curve is the map's depth. */
    playerLens: { r: 58, cyUnits: -45 }
  },
  meadow: {
    id: 'meadow', name: 'Starting Meadow', w: 32, h: 32,
    element: null, level: [1, 2] /* band: [1,10] */, music: 'meadow', safe: false,
    palette: { ground: '#3d6b2e', path: '#7a6a45', accent: '#5a9a40' },
    spawns: [{ arch: 'fodder', count: 6 }] /* v2.3.2244: six per zone (mirror of server/src/data.js) */
  },
  ember: {
    id: 'ember', name: 'Flame Fields' /* v2.3.1438: element-first names (owner) */, w: 32, h: 32,
    /* v2.3.1140: bands UNPINNED (were flattened to [1,1] behind BF-1 --
       monster HP outran player damage mid-band; fixed by the flattened
       MONSTER_HP_CURVE in gameSystems.js, sim-verified).  Bands per
       docs/MAP-REDESIGN.md: each spoke owns a slice of 1-100 so players
       converge by level (50-player density); the depthPct lerp ramps
       monsters from the low end (entry) to the high end (deep).  Keep
       in lockstep with server/src/data.js ZONES -- applyZoneVariant
       clamps server-sent monster levels to THIS table, so a stale band
       here visibly downgrades monsters. Bands:
       meadow 1-10 | frost+tidal 8-25 | verdant+mist 22-40 |
       desert(sky)+hollows 38-58 | thunder+ember 55-80 | shadow/radiant 81-100.
       NOTE: every spoke is reachable from town, so high bands still want entry
       gating (follow-up) or a newbie can walk into a high-level entrance.
       v2.3.1160: bands RE-FLATTENED to [1,2] — OWNER DIRECTIVE
       (2026-07-04 playtest): "All zones at initial depth should be
       level 1 or 2. I have not made more depth zones yet since the
       game is still a demo."  The 1140 unpinning put ~L20 snowmen at
       the frost entrance (the world-view exit spawns at the DEEP end
       of the lerp).  Each zone keeps its MAP-REDESIGN band in a
       comment; restore them when depth content ships. */
    element: 'flame', secondary: 'stone', level: [1, 2] /* band: [55,80] */, music: 'ember', safe: false,
    palette: { ground: '#5a3a2a', path: '#8b6545', accent: '#a04020' },
    /* Variant: ember fodder renders as fireGoblin (see monsterVariants.js
       ZONE_VARIANT_MAP).  zones.js stays in base-archetype terms; the
       variant layer rewires the skin without touching this file. */
    /* v2.3.214: emoji-only archetypes (brute, volatile) removed from
       ember spawns -- user clearing placeholders before authoring
       sprite-backed monsters one at a time. Only fodder remains
       because it variants to fireGoblin (sprite-backed) here. */
    spawns: [{ arch: 'fodder', count: 6 }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
    atmosphere: { tint: 'rgba(180,60,20,0.06)', vignette: 'rgba(120,30,0,0.12)' },
    enemyEmoji: { fodder: '🔥', brute: '🌋', swarm: '🦎', volatile: '💣', hexer: '🧙', sentinel: '⚔️' }
  },
  mist: {
    id: 'mist', name: 'Poison Forest' /* v2.3.1438; v2.3.1439: owner wording */, w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'venom', secondary: 'wind', level: [1, 2] /* band: [22,40] */, music: 'mist', safe: false,
    palette: { ground: '#2a4a2a', path: '#5a6a45', accent: '#3a5a30' },
    /* v2.3.214: all 3 spawn archetypes (swarm/stalker/hexer) were
       emoji-only; zone spawned nothing until sprite-backed monsters
       existed.  v2.3.1147: populated with tinted reskins of existing
       sheets (fodder->mireWisp violet slime, brute->bogLurker murky
       fishman -- see ZONE_VARIANT_MAP).  Closes the L25-38 dead band. */
    spawns: [{ arch: 'fodder', count: 4 }, { arch: 'brute', count: 2 }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
    atmosphere: { tint: 'rgba(30,90,30,0.05)', vignette: 'rgba(10,50,10,0.15)' },
    enemyEmoji: { fodder: '🍄', brute: '🌿', swarm: '🪲', hexer: '🧪', sentinel: '🪵' }
  },
  verdant: {
    id: 'verdant', name: 'Verdant Wilds', w: 32, h: 32,
    /* v2.3.856: new Flora spoke (band 2). element:null for now -- a real
       Flora element + sprite-backed monsters are a follow-up; reachable and
       walkable as a zone today.
       v2.3.1571 (owner: "add it to verdant wilds"): the follow-up landed.
       Flora exists as of v2.3.1569, so the Flora spoke finally carries its
       own element -- which is what makes Flora weapons droppable and the
       nine Flora collisions reachable in play.  Secondary is venom: the
       zone's own monsters are moss slimes and thorn shamblers, and venom
       is the element Flora beats on the wheel. */
    element: 'flora', secondary: 'venom', level: [1, 2] /* band: [22,40] */, music: 'meadow', safe: false,
    palette: { ground: '#3d7a2e', path: '#7a6a45', accent: '#6abf4f' },
    /* v2.3.1147: populated (was empty) -- tinted reskins: fodder->
       mossSlime green slime, brute->thornShambler mossy rockmonster.
       v2.3.1534 (owner: "remove the rock monster from this level"): the
       brute spawn is gone, so Verdant Wilds is slimes only.  Mirror of
       server/src/data.js ZONES.verdant -- the SERVER decides what
       spawns; this table only clamps levels and picks the skin, so both
       have to drop the entry or the zone keeps its rockmonsters.
       thornShambler stays defined in monsterVariants.js: nothing spawns
       it today, and deleting it would just have to be rewritten if a
       brute comes back here. */
    /* v2.3.1535 (owner: "one fast squishier blue slime and the rest the
       regular green"): the second entry's `variant` pins ONE spawn to
       blueSlime; the other 7 take the ZONE_VARIANT_MAP default (mossSlime,
       green).  A per-entry override is the only way to get a mixed
       population -- ZONE_VARIANT_MAP maps a whole ARCHETYPE, so putting
       blueSlime there would turn every slime in the zone blue. */
    /* v2.3.1675 (owner: "make the slimes in verdant wilds blue ... this is to
       make them stand out against the background").  Every spawn is blueSlime
       now — the mossy green reskin was the problem: a green slime on a green
       forest floor is camouflage, which is fine for a slime and terrible for
       a player trying to find one.  Blue is the only recolour in the set that
       is not somewhere in this zone's palette.
       mossSlime stays defined in monsterVariants.js: nothing spawns it today
       and deleting it would only have to be rewritten if a second Flora zone
       ever wants it.  MIRROR of server/src/data.js ZONES.verdant — the SERVER
       decides what spawns; this table only clamps levels and picks the skin,
       so both have to change or the zone keeps its green slimes. */
    spawns: [{ arch: 'fodder', count: 6, variant: 'blueSlime' }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
    atmosphere: { tint: 'rgba(60,160,60,0.05)', vignette: 'rgba(20,80,20,0.12)' },
    enemyEmoji: {}
  },
  frost: {
    id: 'frost', name: 'Frost Ridge' /* v2.3.1438; v2.3.1439: owner — it's a mountain, no shore */, w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'frost', secondary: 'storm', level: [1, 2] /* band: [8,25] */, music: 'frost', safe: false,
    palette: { ground: '#5a6a7a', path: '#8a9aaa', accent: '#3a5a8a' },
    spawns: [{ arch: 'snowman', count: 6 }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
    atmosphere: { tint: 'rgba(140,180,220,0.06)', vignette: 'rgba(60,100,160,0.10)' },
    enemyEmoji: { fodder: '❄️', brute: '🐻‍❄️', swarm: '🦅', volatile: '🧊', stalker: '🐺', hexer: '🌀', sentinel: '🏔️', snowman: '⛄' }
  },
  thunder: {
    id: 'thunder', name: 'Electric Foundry' /* v2.3.1438; v2.3.1439: owner — metal/futuristic place word */, w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'storm', secondary: 'flame', level: [1, 2] /* band: [55,80] */, music: 'thunder', safe: false,
    palette: { ground: '#4a4a5a', path: '#6a6a7a', accent: '#7a5aaa' },
    /* v2.3.214: dropped volatile + stalker (emoji-only). Slime
       (fodder) still spawns in Thunder Peaks. */
    spawns: [{ arch: 'fodder', count: 6 }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
    atmosphere: { tint: 'rgba(100,70,170,0.05)', vignette: 'rgba(50,30,100,0.12)' },
    enemyEmoji: { fodder: '⚡', brute: '🗿', swarm: '🦇', hexer: '🌩️', sentinel: '⛰️' }
  },
  hollows: {
    id: 'hollows', name: 'Stone Hollows' /* v2.3.1438 */, w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'stone', secondary: 'venom', level: [1, 2] /* band: [38,58] */, music: 'hollows', safe: false,
    palette: { ground: '#3a3a3a', path: '#5a5a5a', accent: '#6a5a4a' },
    /* v2.3.214: dropped sentinel + swarm (emoji-only). brute is
       sprite-backed here via rockmonster variant. */
    spawns: [{ arch: 'brute', count: 6 }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
    atmosphere: { tint: 'rgba(80,70,50,0.06)', vignette: 'rgba(30,25,15,0.18)' },
    enemyEmoji: { fodder: 'rubble', brute: 'rock', swarm: 'scorp', volatile: 'gem', hexer: 'urn' }
  },
  sky: {
    id: 'sky', name: 'Wind Dunes' /* v2.3.1438 */, w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'wind', secondary: 'frost', level: [1, 2] /* band: [38,58] */, music: 'sky', safe: false,
    /* v2.3.855: warm desert palette (replaces the old cool "Sky Reaches" blue-grey). */
    palette: { ground: '#c2a060', path: '#b08a4a', accent: '#9c6a38' },
    /* ZONE_VARIANT_MAP.sky remaps every archetype here to a mummy that
       transforms to a skeleton at 50% HP (see monsterVariants.js).
       v2.3.1144: dropped the extra fodder×6 that only existed client-side —
       the server table (authoritative for spawns since server monsters
       shipped) never had it, so MP players already saw the 10-monster mix;
       zones.test.mjs now asserts the two tables stay in lockstep. */
    spawns: [{ arch: 'stalker', count: 2 }, { arch: 'hexer', count: 2 }, { arch: 'volatile', count: 2 }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
    atmosphere: { tint: 'rgba(210,165,90,0.05)', vignette: 'rgba(150,100,40,0.08)' },
    enemyEmoji: { fodder: '🌬️', brute: '🦅', swarm: '🕊️', volatile: '🌪️', stalker: '🦉', hexer: '☁️', sentinel: '🗼' },
    /* ═══ v2.3.2745: THE DUNES RUN AWAY FROM YOU ═══
       Owner: "some maps show distance. So the north part of the image shows
       the background getting smaller. I'm wondering if the objects in the
       game, player, monsters, etc can follow a similar perspective changing
       pattern the more north on the map they get and also slow the movement
       speed the further north they get to emulate travel distance."
       The sky_v5 art is painted that way: the rock stacks on the horizon are
       drawn at roughly two fifths the size of the ones at your feet.  So
       everything standing on it follows the same ramp -- full size on the
       south edge, `far` at the north -- and walking north slows by the same
       ratio (BroTown's vistaSpeedMult), so the horizon is a JOURNEY.
       STEP 1 OF 3, and a PREVIEW: `preview: 'depth'` keeps the curve off
       unless the page asks for it (?depth=1), because step 2 -- the server
       scaling monster speed and reach by the same curve -- is not built, and
       until it is a far-off monster moves and hits at full size.
       v2.3.2775, STEP 2: the worker now measures the monster AI with this
       same curve (server/src/depth.js -- its ZONES.sky.depth is a MIRROR of
       this row minus `preview`, held in lockstep by zonedepth.test) and
       says so in caps.zoneDepth.  `preview` now means "on when the worker
       claims it": the curve draws for everyone against a worker that
       advertises zoneDepth, and stays behind ?depth=1 against one that
       does not (see _previewOn).
       Its own key (`depth`), not `playerScale`: that one is the world map's
       radial vista, and mp-wvscale holds it to exactly one zone. */
    depth: { axis: 'y', near: 1, far: 0.42, curve: 1, preview: 'depth' },
  },
  tidal: {
    id: 'tidal', name: 'Water Caves' /* v2.3.1438 */, w: 32, h: 32,
    /* Elemental zone 1 — see ember note. */
    element: 'water', secondary: 'venom', level: [1, 2] /* band: [8,25] */, music: 'tidal', safe: false,
    palette: { ground: '#2a4a5a', path: '#4a6a7a', accent: '#2a6a9a' },
    /* v2.3.214: dropped swarm + hexer (emoji-only). brute is
       sprite-backed here via fishman variant. */
    spawns: [{ arch: 'brute', count: 6 }],   /* v2.3.2244: six per zone (mirror of server/src/data.js) */
    atmosphere: { tint: 'rgba(30,80,120,0.05)', vignette: 'rgba(10,40,80,0.12)' },
    enemyEmoji: { fodder: 'fish', brute: 'fishman', swarm: 'octo', volatile: 'bubble', stalker: 'shark', hexer: 'wave', sentinel: 'shell' }
  },
  shadow: {
    id: 'shadow', name: 'Dark Sanctum' /* v2.3.1438 */, w: 40, h: 40,
    element: 'dark', secondary: null, level: [1, 2] /* band: [81,90] */, music: 'shadow', safe: false, endgame: true,
    palette: { ground: '#1a1a2a', path: '#2a2a3a', accent: '#3a2a4a' },
    /* v2.3.214: all 3 spawn archetypes were emoji-only. */
    spawns: [],
    atmosphere: { tint: 'rgba(20,10,40,0.10)', vignette: 'rgba(0,0,20,0.25)' },
    enemyEmoji: { fodder: '👤', brute: '👹', swarm: '🦇', volatile: '💀', hexer: '🔮', sentinel: '⚰️' }
  },
  radiant: {
    id: 'radiant', name: 'Light Summit' /* v2.3.1438 */, w: 40, h: 40,
    element: 'light', secondary: null, level: [1, 2] /* band: [81,100] */, music: 'radiant', safe: false, endgame: true,
    palette: { ground: '#6a6a4a', path: '#aaa870', accent: '#ccc060' },
    /* v2.3.214: all 3 spawn archetypes were emoji-only here (raw
       brute has no sprite variant in radiant; swarm + volatile are
       always emoji). */
    spawns: [],
    atmosphere: { tint: 'rgba(240,200,60,0.04)', vignette: 'rgba(200,180,40,0.06)' },
    enemyEmoji: { fodder: '✨', brute: '🦁', swarm: '🐝', volatile: '☀️', stalker: '🦅', hexer: '🌟', sentinel: '🏛️' }
  },
  /* v2.3.788: wasteland ('The Lawless Land') removed — the Ferryman NPC
     was despawned long before (NPC_DATA emptied), leaving the zone
     unreachable; owner confirmed removal 2026-06-12. */
  farm_home: {
    id: 'farm_home', name: 'Your Farm', w: 30, h: 25,
    element: null, secondary: null, level: [0, 0], music: 'town', safe: true, personal: true,
    palette: { ground: '#4a7a3a', path: '#9a8a60', accent: '#5a9a40' },
    spawns: [],
    atmosphere: { tint: 'rgba(80,160,60,.03)', vignette: 'rgba(40,80,20,.06)' },
    enemyEmoji: {}
  },
};

/* v2.3.1574: the ONE copy of the vista perspective curve.
 *
 * A zone may carry `playerScale` to sell depth on a zoomed-out map: a flat
 * number, or { near, far, curve } scaling by distance from the zone centre so
 * a figure on a distant trail renders as a speck (worldview: 0.55 at the
 * plateau down to 0.03 at the rim).
 *
 * This math had drifted into THREE hand-copied sites -- entityRenderer's
 * _zonePscale (local + remote bodies), BroTown's vistaSpeedMult (movement),
 * and a fourth that was simply MISSING: the remote harvest stand-ins in
 * effectsRenderer, which is why another player cooking or lighting a fire on
 * the worldview drew at full size next to their own thumbnail-sized body.
 * A shrink curve that only some of a character's parts obey is not a curve,
 * so it lives here now and every site calls it.
 */
/* v2.3.2745: is a preview curve switched on for this page?  `?depth=1` in the
   URL, or window.__btDepth = true from the console.  Read from the URL once.
   v2.3.2775: ...or the WORKER claims it (caps.zoneDepth, set by wsClient on
   every state_sync through setZoneDepthLive).  Order of precedence, most
   explicit first: the console override, then the URL (`?depth=1` forces it
   on against an old worker, `?depth=0` forces it off for a before/after
   look), then the worker.  Drawing the curve is gated on the worker because
   the two halves only make sense together -- a small far monster that still
   hits from flat distances strikes from outside its own body. */
let _depthLive = false;
export function setZoneDepthLive(on) { _depthLive = !!on; }
function _previewOn(name) {
  if (name !== 'depth') return false;
  if (typeof window !== 'undefined') {
    if (typeof window.__btDepth === 'boolean') return window.__btDepth;
    if (_previewOn._url === undefined) {
      _previewOn._url = null;
      try {
        const m = /[?&]depth=([01])\b/.exec(window.location.search);
        if (m) _previewOn._url = m[1] === '1';
      } catch (e) { /* no URL: fall through to the worker */ }
    }
    if (_previewOn._url != null) return _previewOn._url;
  }
  return _depthLive;
}

/* v2.3.2745: the dunes' NORTH-SOUTH depth ramp -- 1 on the south edge down
   to `far` on the north, eased by `curve`.  Null when the zone has none or
   its preview is off, so the caller falls through to the old answer. */
export function zoneDepthScale(zoneId, y, TILE) {
  const z = ZONES[zoneId];
  const d = z && z.depth;
  if (!d || d.axis !== 'y') return null;
  if (d.preview && !_previewOn(d.preview)) return null;
  const H = (z.h || 32) * (TILE || 32);
  const t = Math.max(0, Math.min(1, 1 - (Number(y) || 0) / H));   /* 0 south .. 1 north */
  const near = d.near != null ? d.near : 1, far = d.far != null ? d.far : 0.5;
  return near + (far - near) * Math.pow(t, d.curve != null ? d.curve : 1);
}

/* ═══ v2.3.2775: YOUR REACH SHRINKS WITH YOU ═══
   Owner: "Yes fix my reach."  Step 2 made a far monster measure its reach in
   the curve (server depth.js), and left yours flat -- on Wind Dunes' north
   edge you swung a 72px sword with a body drawn at 0.42, so you hit from well
   outside the blade on screen and out-ranged every monster there.  This is
   the ONE factor every one of your reaches multiplies by: the swing and the
   engage test, the bow's range and sight line, the staff orb's life, the dash's
   stop and step, the reach rings drawn under you (monsterCombat, projectiles'
   callers, effectsRenderer, abilities, BroTown).  1 wherever the curve is off,
   exactly -- a multiply by 1, so every other zone is untouched. */
export function depthK(zoneId, y) {
  const k = zoneDepthScale(zoneId, y, 32);
  return k == null ? 1 : k;
}

export function zonePlayerScale(zoneId, x, y, TILE) {
  const z = ZONES[zoneId];
  const dz = zoneDepthScale(zoneId, y, TILE);
  if (dz != null) return dz;
  const ps = z && z.playerScale;
  if (typeof ps === 'number') return ps;
  if (ps && typeof ps === 'object') {
    const cx = (z.w * TILE) / 2, cy = (z.h * TILE) / 2;
    const d = Math.min(1, Math.hypot(x - cx, y - cy) / (Math.hypot(cx, cy) || 1));
    const near = ps.near != null ? ps.near : 0.6;
    const far = ps.far != null ? ps.far : 0.3;
    const curve = ps.curve != null ? ps.curve : 1;   /* <1 shrinks faster off-centre */
    return near + (far - near) * Math.pow(d, curve);
  }
  return 1;
}

/* v2.3.1813 dev probe, house style (__btWorldProps, __btCoach).  mp-townmap
   already read `window.__btZones` — behind a `.catch(() => null)` that made a
   missing probe look like a skipped check rather than a failure, so the zone's
   dimensions went untested through two shape changes.  Defining it for real is
   the fix; the scenario no longer swallows the miss. */
if (typeof window !== 'undefined') window.__btZones = ZONES;
/* v2.3.2775 dev probe (mp-dunedepth): the depth answer the game is using
   right now, so a scenario can tell "the curve is off" from "the walk was
   blocked" instead of guessing from a distance. */
if (typeof window !== 'undefined') window.__btZoneDepth = (zoneId, y) => zoneDepthScale(zoneId, y, 32);
