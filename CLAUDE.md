# CLAUDE.md — Hemi Bros ARPG (BroTown)

Read this first. It encodes context that is expensive to rediscover.

## What this repo is

A real-time **100% server-based multiplayer** ARPG, fully contained in
this one repository. There is no single-player mode and never will be
(owner directive, 2026-07-02) — any client-local game logic is a legacy
remnant to migrate server-side, not a mode to preserve.

- **Client** — Vite + React + PixiJS (WebGL). Entry `src/main.jsx`, game
  UI/loop in `src/ui/BroTown.jsx`, rendering in `src/rendering/`,
  networking in `src/networking/` (`wsClient.js` connection + message
  switch, `gameEvents.js` event dispatcher, `index.js` identity/API
  base), data tables in `src/data/`.
- **Server** — `server/` is a Cloudflare Worker. Live Durable Objects:
  **GameRoom** (one shared room `brotown-1` — world, combat, economy
  settlement, clans/arena/market order book all live HERE), Leaderboard,
  Feedback. The Marketplace and Arena DO classes still exist for their
  wrangler bindings but are **retired from routing** — their logic was
  folded into the GameRoom (see `docs/ARCHITECTURE-HANDOFF.md`).
- **The world (owner, 2026-10-02, v2.3.2990):** the WHEEL is the world.
  Players start in its Brotown, on login and after a death. The old lands
  (today's element zones as places to walk, their World View and its trails)
  are CLOSED for now, though their code still runs the Wheel's monsters and
  `?trial=off` reopens them for a tab. Details in the WORLD-MAP-PIPELINE
  clause below ("The Wheel is the world").
- **Heavy-systems architecture (v2.3.1116+):** persistent identity,
  offline mail/escrow, server-settled marketplace/trades/quests/duels.
  Before touching the server, read **`docs/ARCHITECTURE-HANDOFF.md`** —
  it is the charter of load-bearing conventions (storage-key registry,
  opId idempotency, caps/settled deploy-order flags, DO concurrency
  rules) plus the prioritized successor backlog.
- **Docs** — the root `README.md` is the Master Game Design Document
  (GDD), NOT a setup guide; don't put tooling docs in it.
  `docs/specs/*.md` holds implementation specs for shipped features.
- **Doc trust (owner directive, 2026-06-13):** the GDD (`README.md` /
  `gdd.md`) and `docs/ARCHITECTURE.md` are STALE — early design
  thinking only, describing many systems that were never built and
  missing many that were. NEVER use them as a blueprint to change,
  "fix", or "restore" game behavior. Code is the source of truth.
  Current, trustworthy docs: `docs/ARCHITECTURE-HANDOFF.md`,
  `docs/UI-BIBLE.md` (UI design law + icon-generation prompts, v2.3.1222),
  `docs/LANTERN-SLATE-SPEC.md` (the UI visual system — colors, depth,
  components; supersedes UI-BIBLE Part 2, v2.3.1227),
  `docs/DEPTH-ROADMAP.md` (the costed depth work, code-aware),
  `docs/ART-ASSET-PHASES.md` (what environment art to commission, at what
  size, in what order — the decoded-RGBA budget and the free-standing
  vs edge-cropped test live here, v2.3.2650),
  `docs/WORLD-MAP-PIPELINE.md` (the ONE-SEAMLESS-WORLD plan: the World
  Builder at `public/tools/world/` — grid, blueprint, per-square ChatGPT
  prompts, fuser — and the engine phases after it, v2.3.2931; its
  "world trial" section is the `?trial=world` switch that streams the
  old round island, baked from today's zone art, in place of the World
  View, v2.3.2932; `?trial=wheel` (v2.3.2943) puts the World View on the
  Wheel itself at full size, its ground laid on the phone from the Ground
  Studio's own swatches (read from its IndexedDB on the same site, then
  `public/world/ground/`) by a worker, `public/tools/world/core/ground-worker.js`
  via `src/game/wheelTrial.js` and `src/rendering/wheelGround.js`; since v2.3.2936 the plan is **the Wheel**: the safe
  commons round Brotown, one spoke of land per element with its own levels
  1–80 at one zone per five levels, sea between, passes at 20 and 60, and a
  keystone gate to the Dark or Light realm (80–100) at every tip — geometry
  in `public/tools/world/core/wheel.js`, and the blueprint stores every
  cell's tier, the level map; since v2.3.2937 the ground is 48 swatches made
  in the **Ground Studio** at `public/tools/ground/` and laid onto the plan
  by `public/tools/world/core/ground.js`, deterministic and seamless between
  chunks — the phone's future ground builder; since v2.3.2947 two grounds
  meet in a layered, pair-sized edge drawn from the two pictures, a land's
  stages change in patches, and each ground has an optional EDGE PIECES
  prompt, its loose tufts on magenta: `edgeRecipe`, `pieceMap`,
  `edgePromptFor`, WORLD-MAP-PIPELINE "Where two grounds meet"; since
  v2.3.2948 the edge pieces are PUT AWAY, the owner seeing no difference:
  kept and tested, but shown and loaded only with `?edgepieces` in the
  address, and `EDGE_PIECES` in ground.js brings them back; since v2.3.2949
  every boardwalk and bridge is a PLANK DECK -- `bp.decks` from layout.js,
  bridges straight and square-ended -- whose boards the game lays itself,
  12 game px each, across the deck and lined up with its ends: `planksOf`,
  the boardwalk's `laid: 'planks'`, the one swatch that may run one way,
  WORLD-MAP-PIPELINE "Bridges and boardwalks"; since v2.3.2950 ALIKE
  grounds -- one kind, or earth/sand/ash -- MIX over a wide zone in big
  patches shaped by both pictures (`MIX`, `MIX_PATCH`, `MIX_HEIGHTS`), the
  town square and street included, only the boardwalks keeping straight
  edges (`CRISP`): WORLD-MAP-PIPELINE "Alike grounds mix"; since v2.3.2951
  such a pair may have a BLEND picture, the owner's idea, laid through the
  middle of the zone (`opts.blends[blendKey(a, b)]`, the studio's version
  `M` under the pair's key, `ground/<key>-M.png` + the manifest's `blends`,
  `blendPromptFor` attaching the two swatches and not the key): optional
  per pair, a pair without one mixing exactly as before; since v2.3.2952
  laid as TWO WHOLE PLAIN MIXES either side of the blend (`BLEND_OFF`, the
  zone 1.4x wider, heights at `BLEND_HEIGHTS` 0.45 to keep it cheap) --
  v2.3.2951's halved changes ran into the zone's end and drew a straight
  line beside the plan's cell edge, which the owner spotted; since
  v2.3.2953 their big patches are `BLEND_BIG` 1.3x as strong in a zone as
  much wider (1.7x), so the blend's edges wander as far as a plain mix's;
  WORLD-MAP-PIPELINE "Blend pictures"; and since v2.3.2953 a picture is
  made SEAMLESS BY A CUT where its two ends look alike, never a cross-fade
  -- the old one left three quarters of every tile see-through, two
  pictures at once (docs/TRAPS.md, averaging two textures is mush) -- the
  studio remaking saved tiles from the uploads once (`PREP_MADE`):
  `seamless`/`seamlessPixels` in `public/tools/style/process.js`,
  WORLD-MAP-PIPELINE "Seamless by a cut"; and since v2.3.2954 where
  three grounds meet EVERY partner in reach has its say (`edgeAt` ->
  `ruleAt`, ties by `marginAt` + `PARTNER_TIE` noise, `settle` the same) --
  "answer to the nearest partner" cut patches off along the straight line
  halfway between two, the owner's "V" at the street corners (TRAPS §122)
  -- and a MIX zone reaches `MIX_LIM` 1.15; blends stay optional, the owner
  choosing two pictures a pair: WORLD-MAP-PIPELINE "Where three grounds
  meet"; and since v2.3.2955 the blends are PUT AWAY like the edge pieces
  (owner: "Yeah hide it"): `BLENDS`/`blendsOn` in ground.js, the studio's
  card and the game's worker only with `?blends` in the address, kept and
  tested; still open when the owner stopped that round: a short
  checkmark-shaped edge beside the street corner, and rocky ground lying ON
  TOP of plain dirt where they mix -- WORLD-MAP-PIPELINE "Still open"; and
  since v2.3.2957 the studio's "Download for the game" packs only the manifest
  and finished tiles, as palette PNGs (`world/core/png8.js`, half the bytes,
  the same pixels), in zips under 24 MB for GitHub's website, while
  "Download all" (279 MB with every original) stays the owner's backup and
  never goes on GitHub -- WORLD-MAP-PIPELINE "Download for the game"; since
  v2.3.2958 the owner's own 96 tiles (48 swatches, A and B) ARE the game's
  ground, in `public/world/ground/` with its manifest; since v2.3.2959 a slow
  or failing download can no longer stop the ground: downloads run apart
  from the laying, four at a time with a 15 s limit and retries, a piece
  waits at most 4 s and is laid without a missing picture, then filled in
  when the worker says it came (`got`), pictures come two pieces ahead, and
  `?v=<manifest date>` + `public/_headers` let the phone keep them -- tested
  by the `wheelnet` scenario, WORLD-MAP-PIPELINE "On a slow connection"; and
  since v2.3.2960 the town's BOARDWALKS are put away until the buildings,
  whose porches they become -- the owner: "I don't know what those are
  supposed to be" -- `town.boardwalks: false` in plan.js, the bridges keeping
  their plank decks and the boardwalk swatch, a plan copy with `true`
  still tested in test-world-core; and since v2.3.2961 each GROUND SWATCH
  KEEPS ITS OWN 64 COLOURS (`PIXEL.ownColours`, `ownPalette`/`coloursOf` in
  style/process.js) instead of the one 128-colour palette -- the owner's
  grass came out 3 flat greens, "clumpy" (TRAPS §124); the studio chooses
  them again from its 'prep' tiles on load, nothing to freeze, and the
  worker keeps each tile as numbers into its own colours:
  WORLD-MAP-PIPELINE "Each ground keeps its own colours"; since v2.3.2962
  the owner's re-exported 96 tiles on their own colours are the game's; since
  v2.3.2963 the Wheel is ALWAYS DAYLIGHT for now (`setAlwaysDay` in
  timeOfDay.js, set by worldTrial.js syncWheel, winning over ?tod=) -- the
  owner saw one unexplained very dark visit: "make it daylight only for now");
  and since v2.3.2964 the OBJECT STUDIO at `public/tools/objects/` makes
  everything that stands up -- 76 objects in `objects/catalog.js`, each of
  the 17 buildings under its plot's id with its own prompt (job, end of
  town, look, big jokes, one sign, porch, square-on, Built by Bros: the
  owner's "redo all the buildings again using more specific prompts"), cut
  out of one flat magenta (green for pink or purple things) background,
  sized exactly at 2 px a game px, on 64 colours of its own, shown next to
  the bro at phone size, and zipped for the game as see-through palette
  PNGs (`png8.js` `clear`): WORLD-MAP-PIPELINE "The Object Studio"; and
  since v2.3.2965 SPRITE SHEETS, the owner's "fit as many things as I can on
  one sprite sheet ... as long as it stays organized": `objects/sheets.js`
  packs each land's objects as many to a wide ChatGPT picture as fit at true
  size, in rows read like a page (15 sheets + 5 alone instead of 59
  pictures, never a building), the studio names each cut-out object by its
  place (`readingOrder`, `autoAssign`, a select per piece; an object's own
  picture wins), and "Download for the game" packs each land's finished
  objects into one sprite sheet (`atlasFiles`, 2048 px max, a PixiJS sheet
  file with anchors at the feet and `meta.scale` 2): WORLD-MAP-PIPELINE
  "Sprite sheets"; the footstep-sound list per ground is WORLD-MAP-PIPELINE
  "Footstep sounds"; placing objects on the Wheel is the next round; and
  since v2.3.2966 the Wheel has its OWN MINIMAP and a WORLD MAP, the owner's
  "larger and the most informative and intuitive it can be": the worker
  posts the map's facts (`world/core/wheelmap.js`: lands, stages and levels,
  camps, passes, gates, landmarks, the roads/river/railway simplified) and
  says where you are in words (`whereWords`), `wheelMinimap.js` takes over
  MinimapRenderer's box in the Wheel only (132 px, the land and its lines,
  "Frost Ridge / the thaw line · Lv 6-10" under it; today's zones keep their
  52 px slab), and a tap opens `src/ui/WorldMapOverlay.jsx` -- portalled to
  the body, as the dashboard covers anything inside the game's wrapper --
  with labels that grow with the zoom: WORLD-MAP-PIPELINE "The minimap and
  the world map"; `mp-wheelmap` tests it; and since v2.3.2967 EACH GROUND
  ITS OWN FOOTSTEP in the Wheel, from the owner's Freesound recordings:
  `tools/audio/cut_footsteps.py` (pip numpy scipy soundfile lameenc
  pyloudnorm noisereduce; the WAVs are not kept) cuts them into single
  steps at footstep-v3's loudness, one small mp3 a sound plus
  `src/data/footstepClips.js`, GENERATED, step windows measured in the
  encoded file; `world/core/footsteps.js` names each swatch's sound; the
  worker sends each piece's `under`, the swatch DRAWN every 3 game px, so
  the sound changes where the picture does (`wheelGroundAt`,
  `footstepSurface`); the clips load behind the Wheel's overlay, never in
  SFX_MANIFEST, and go with its worker; dirt is still footstep-v3, the
  forest floor plays grass until it has its own, the zones keep dirt;
  CREDITS.md has the licenses -- two CC BY (snow, ice) credited in the
  About panel, six to CONFIRM: WORLD-MAP-PIPELINE "Footstep sounds";
  `mp-wheelsteps` tests it; and since v2.3.2968 each Ground Studio card has
  a FOOTSTEPS row, the owner's "sound with play button idea": the menu
  says and changes the ground's sound, ▶ plays four steps of its recording
  (`public/sfx/footstep/clips.json`, written by the tool beside
  footstepClips.js, test-world-core checking they match), a change is kept
  in the studio's 'misc' 'steps' and in both downloads as the manifest's
  `steps`, and the worker plays the studio's choice, else the game copy's,
  else the table (`cleanSteps`) -- FOOTSTEPS ARE THE NEW MAP'S ONLY: the
  owner said no to today's zones; and since v2.3.2969 the table goes by
  what each PICTURE shows, not the plan's words -- the owner: "What is
  'ash' used for? I don't recall seeing any ground type of primarily ash"
  -- the ash plains and the steam fields stone, flame-meets-dunes sand, the
  slime woods forest floor, NO ground ash (still in the menu), and sand,
  mud and ash cut again (`pick`: single squelches); since v2.3.2970 sand
  is the owner's clean BlondPanda step and their second mud (arnaud
  coutancier) is HELD BACK, its maker's sounds being CC BY-NC -- check a
  recording's license before using it, NC is out (CREDITS.md):
  WORLD-MAP-PIPELINE "Tweaks after listening"; and since v2.3.2971 the
  Object Studio FINDS A SHEET'S OBJECTS BY COUNT (`objectsIn`/`gapsOf`/
  `groupParts` in style/process.js: touching parts, gaps by growth, joined
  closest first to the count's break, cut out by their own parts) -- the
  owner: "Your object detector isn't doing a good job ... even though
  there's space between the objects" -- partsOf's 30 px reach glued them;
  old sheets are read again once (`FINDER`); a building is planned 1.4x
  bigger (PLOT_W 386, `sizeWas` 276, `SIZES_BASE` moving old choices), the
  owner having chosen the menu's top, 140%, for all sixteen; and those
  sixteen are in `public/world/objects/` (manifest + four PixiJS sheets),
  the Town Hall still to make, nothing loading them until the placing
  round, when the plots must grow to fit -- on the owner's own five sheets
  it found all 59 objects (the old finder 18); and since v2.3.2972 keyOut
  DESPILLS within 6 px of a magenta background, the owner's frost bushes
  having come out with pink twigs; and since v2.3.2973 magenta's own hue
  with next to no green is background ANYWHERE (`HOLE_G`/`HOLE_LEAN`/
  `HOLE_HUE`), the gaps in the owner's tumbleweeds having stayed magenta --
  purple glints keep their green, so they stay; and since v2.3.2974 the
  gap rule and despill work on GREEN too, by each px's lean (`leanOf`); all
  15 of the owner's sheets found complete (154 objects; the old finder 64):
  WORLD-MAP-PIPELINE "Objects found by count"; and since v2.3.2975 the
  objects are IN THE GAME, the owner's "Wire this stuff into the game. Put
  mayor bro in town too": `world/core/placing.js` places ~13,000 from the
  CATALOG in the ground worker (buildings on their plots, the town's
  furniture, fences along the Old Roads, each land's trees thick in the
  plan's obstacle clumps; never on a road, water or plot; positions never
  depend on which pictures exist), `src/rendering/wheelObjects.js` draws the
  ones near you from sprite sheets that load near you and free behind you,
  depth-sorted by their feet, their footprints handed to the walk test
  (`worldProps.setZoneBlockerHook`); the town is RE-LAID round its
  south-facing buildings (`townPlan` in layout.js: every door on the square,
  a street, the Back Lane or a front walk, no roof hiding a door, gates at
  1,050); the game's sheets are a few objects a page as palette PNGs, a
  building a page (`objects/atlas.js`, `tools/world/repack-objects.mjs`,
  15.7 -> 5.2 MB); Mayor Bro stands beside the Town Hall's steps with his
  OWN copy of his picture (town's NPC art is freed a beat after leaving
  town: `loadWheelNpcArt`; an NPC texture freed under him now falls back
  instead of crashing the frame); `?trial=wheel&noobjects` leaves it bare;
  `node tools/world/render-wheel-objects.mjs` draws any spot;
  `mp-wheelobjects` tests it: WORLD-MAP-PIPELINE "The objects in the game";
  and since v2.3.2976 the TOWN HALL stands in the square too -- the owner:
  "Town hall should be there but here it is again", neither of their zips
  having had it (the studio packs only finished objects) -- their picture put
  through the studio's own steps in a browser and merged by
  repack-objects.mjs as `buildings-17`: all 17 buildings, 76 objects, 41
  pages, 5.3 MB; and since v2.3.2977 the TOWN'S EDGE on the grass wanders
  in bays and coves -- the owner: "the lines between dirt and grass are
  razor straight" -- `edgeWobble`/`inWobblyRect` in layout.js, plan.js
  `town.edge`, the noise read per cell at the NEAREST POINT OF THE EDGE (a
  slow wobble off the coarse lattice, read where the cell is, kept every
  side a ruler line: TRAPS §125), the country plots the same
  (`PLACE_EDGE`), test-world-core measuring the whole outline: WORLD-MAP-PIPELINE
  "The town's edge wanders"; and since v2.3.2978 the Wheel has MONSTERS --
  the owner: "place the monsters where they belong in their zones (on the
  ends closest to the central map)" -- the worker's own zone `wheel`
  (`server/src/wheelzone.js`; in VALID_ZONE_IDS, NOT in ZONES, no zone
  config, so clamps/scaler/nodes/PvP all skip), each element zone's six
  built by `_makeZoneMonster` exactly as at home and moved to the inner end
  of its spoke, its first stage (levels 1-5), every one carrying `home`
  (skin, element, and `_rewardZone`: shards, drops, quest credit), the
  commons and town SAFE GROUND (`_wheelSafeAt`, one baked circle: nobody on
  it targeted or hit, no monster on it chasing -- a 720 px chase leash alone
  let a goblin ~400 px into the commons), and a 3,600 px ranged cap; where they stand is BAKED from the
  plan by `tools/world/bake-wheel-spawns.mjs` into
  `server/src/wheelspawns.js` (generated; test-world-core fails until a plan
  or placing change re-bakes it); the client enters `wheel` only against
  `caps.wheelmonsters` (`trialZoneFor`, deploy-order safe; `wheelmonsters:
  false` the kill switch), `isWorldViewZone` makes `wheel` a hub everywhere
  `worldview` was, and all eight lands' art (60 MB decoded) loads behind the
  Wheel's overlay and goes on leaving, the renderer leaving a monster far off
  screen UNDRAWN in a zone with `homes` (`FAR_MARGIN`; 48 far ones cost the
  frame what none do) and the worker telling each v2 player in `wheel` only
  of the monsters within 2,400 px, one coming into reach sent whole (tick.js,
  `_wheelInterest`: ~85 KB a second of far monsters' moves otherwise) -- the
  hub exit now CLEARS a server
  monster list at the flip, the Wheel's 48 having been redrawn in town on
  freed sheets; the Wheel at 241 MB of textures on arrival is at iPhone
  Safari's edge, and loading each land's monsters on approach needs the
  owner's yes (given, and done since v2.3.2989: the looks-as-you-walk clause
  under Conventions, ~176 MB on arrival): docs/specs/wheel-monsters.md,
  `wheelzone` suite, `mp-wheelmonsters`; and since v2.3.2980 the WATER HAS PICTURES of its own
  -- the owner: "I don't see anywhere to add water in the ground studio" --
  the Ground Studio's Water group, `sea`, `shallows` and `fresh`
  (`WATER_SWATCHES` in ground.js, `waterPromptFor` in ground/prompts.js, no
  footstep), still ONE material: `waterLook` only says how a water pixel
  looks (fresh on a river or pond cell, shallows where the water's share is
  low, the open sea past them, both lines wandering), the foam the game's
  own, the flat blues where a picture is not made: WORLD-MAP-PIPELINE "The
  water's own pictures"; and since v2.3.2981 the dunes' palms ring OASES --
  the owner: "The palm trees don't belong in the desert unless they
  surround water" -- ten pools in plan.js (`clear` of roads, rail, camps and
  landmarks: layout.js, as they are laid after the features), a ring each
  in placing.js (`oasis`; none on the near side, each leaning in, hoodoos
  8 cells off), and a LEANING PICTURE STANDS ON ITS TRUNK: the catalog's
  `lean` mirrors any piece leaning the other way and puts its manifest
  `foot` on the trunk on the way into the game (`standPiece`, objects/
  atlas.js, in the studio's download and repack-objects.mjs), and the game
  anchors every Wheel sprite at its foot (the palms' trunks were drawn 65-96
  px from where they stood): WORLD-MAP-PIPELINE "Oases in the Wind Dunes";
  the monsters' places re-baked; and since v2.3.2982 a BIG-TOWN PREVIEW,
  `?trial=wheel&bigtown` (or `bigtown=1.5`) -- the owner: "all the buildings
  need to be twice as large let me see preview" -- `bigTownPlan` in plan.js
  (plots, hall, square, walks and gaps scaled, streets not; Market Row ONE
  plot a side, `perSideRow`, so 13 of 17 stand, as the hub cannot grow: the
  Wheel nearly fills its frame; per-street gates `gateNS`/`gateEW`,
  `townGates` in layout.js; `layWheel` re-run from them; depot and mill
  moved out), placing.js `kindScale` (buildings k, the rest 1) and
  `wheelObjects.js` drawing at it; the default plan untouched -- a phone
  shows a 2x building two screens wide: WORLD-MAP-PIPELINE "The big-town
  preview", `mp-bigtown`; and since v2.3.2983 every building has a little
  LIFE drawn in code -- the owner: "add effects just using code to each
  building to make subtle liveliness effects" -- chimney smoke, lamps
  breathing, the forge's sparks, glints on gold and glass, chaff from the
  loft, at 68 spots measured off the pictures (`src/data/buildingLife.js`,
  shares of each picture; test-world-core checks them against the game's
  copy), drawn by `src/rendering/wheelLife.js` in one Container with the
  building's picture so the depth pass moves both; its five textures made
  in `wheelObjectsWarm` and freed with the pages; `?nolife` turns it off:
  WORLD-MAP-PIPELINE "The buildings' life", `mp-wheellife`; and since
  v2.3.2984 the owner's own SEA and SHALLOWS pictures are the game's -- sent
  in chat: "Is this what you need for water? Again I don't see anywhere to
  add water in the ground studio" -- put through the studio's own steps by
  `tools/world/add-ground-pictures.mjs` (the Ground Studio run headless, its
  download MERGED into public/world/ground/, `made` changing only when a
  tile is replaced), a look with no picture borrowing one (`WATER_STANDIN`:
  rivers and ponds the shallows' until fresh water is made -- made since
  v2.3.2993, the owner's two Fresh pictures sent in chat), the shallows a
  ~5-cell shelf (`shoreSampler`: each cell of open sea's distance to the
  nearest that is not, rivers and ponds counting as shore, exact to
  `SHORE_CAP` so pieces meet), and the water's look reading only the
  materials and `mm.fresh` -- the game's worker keeps a SLIM blueprint, no
  classes, and v2.3.2980's look read them: harmless until a water picture
  existed, then every piece with water failed; test-world-core composes with
  the slim one -- and the studio a "Jump to" row, `#water` links and "in the
  game" chips from the game's manifest (the Water cards were ten phone
  screens down): WORLD-MAP-PIPELINE "The owner's water, in the game",
  `mp-wheelwater`; and since v2.3.2985 the `bigtown=1.5` preview holds ALL
  17 buildings -- the owner: "Let me try 1.5 size for buildings. Does that
  fit?" -- Market Row two a side up to `TWO_A_SIDE_MAX` 1.5 (at 1.6 the town
  is in the river), the mine railway leaving from the depot where it stands
  and the diagonal roads forking just past each gate (`layWheel`; the plan's
  own town unchanged): WORLD-MAP-PIPELINE "At 1.5x, all 17 fit"; and
  since v2.3.2994 1.5x IS THE STANDARD TOWN -- the owner: "yes make 1.5x
  live and the standard size":
  - plan.js exports `PLAN = bigTownPlan(BUILDINGS)` (1.5) of `BASE_PLAN`, the
    plan as written. So the worker, the server's bake, the studios and the
    tests all get the 1.5x town.
  - `?bigtown=1` is the old town, and `?bigtown` is 2x.
  - The town's edge has its own noise (`BIG_TOWN_EDGE_SEED` 16, read as
    `town.edge.seed`). The usual noise lay flat along Market Row's south side,
    672 game px straight, and put yard on the Mill Bridge.
  - The prompt's town-gate test reads the real gates (`gateReach`).
  - Re-baked, no monster place moved.
  - WORLD-MAP-PIPELINE "1.5x is the standard".
  - Since v2.3.2997 the standard is 1.15x (`BUILDINGS`), `?bigtown=1.5` the
    1.5x town: see the v2.3.2997 bullet under the Wheel below. And
  since v2.3.2990 THE WHEEL IS THE WORLD -- the owner: "I'm ready to have
  this replace the old game map. Just have players spawn in town. Then push
  to main", then "The Wheel's new Brotown" and, of the old lands, "Close
  them for now":
  - `readFlag` in worldTrial.js gives everyone 'wheel'. `?trial=off` (kept
    for the tab) is the old World View and lands, a hidden way back.
    `?trial=world` still works.
  - You START IN ITS BROTOWN. The client still begins every session in
    today's town, and the worker's respawn names it. So
    `src/game/wheelHome.js` puts you on town's stairs once the worker's caps
    are in, and the hub exit takes you down: the same trip as walking them,
    with the same overlay.
    - `wheelSpawnPass` lets that one trip past the Mayor gate.
    - `applyLocalRespawn` asks for it again after a death.
    - `?nospawn` stays in today's town.
  - The Mayor gate MOVES WITH YOU (`wheelCommonsGate`). Until tut_1, a player
    is held inside the safe commons, `ZONES.wheel.safeR`. It mirrors
    `WHEEL_SAFE_R`, and test-world-core checks it. The Wheel's own Mayor Bro
    arms them.
  - The zone is named "The Wheel", and its test readout shows only with
    `?trial=`/`?trialhud`.
  - THE QUEST'S WAY in the Wheel points at a PLACE (questRoute.js
    `_wheelPoint`): the road and wheelMinimap's star go to the Wheel's
    Mayor Bro for the welcome or a hand-in, and to a quest's land's monsters,
    `ZONES.wheel.lands` (it mirrors the anchors; test-world-core checks it),
    stopping within 600 px of them. Nowhere for any-zone gathering. Every
    old rule went through portals the Wheel does not have.
  - Since v2.3.2992 the way is drawn ON THE MINIMAP ONLY. The owner: "I
    think I want to remove the footsteps and just rely on the gold road on
    the minimap of where to go".
    - Both minimaps draw a gold road from your chevron to the
      questRoutePoint spot. wheelMinimap ends it at its star, held at the
      box's edge; the zones' box runs it to the edge with no star, since its
      star marks portals only (v2.3.1817).
    - The road ON THE GROUND (every look) is PUT AWAY:
      `GROUND_PATH`/`getTrailStyle()` 'off' in questTrailStyle.js. The
      Settings row and the Quests switch are hidden. `?questpath` brings all
      of it back, and mp-pathstyle and mp-questroad test it that way.
    - The welcome says "Follow the gold road on your map".
    - See docs/specs/quest-path-guide.md §0.
  - A respawn now nulls `S.npcs` like every zone change. It used to carry the
    Wheel's Mayor into today's town, where the townsfolk never spawned.
  - Not there yet, so not in the game: monsters past levels 1-5, dungeons.
    (Gathering came in v2.3.3012, a bullet below.)
  - The QA harness gives every scenario `trial=off&nospawn` unless it passes
    `world: 'wheel'` (`nospawn` alone when its query names a trial).
  - `mp-questline`, CI's "playable", plays in the Wheel. `mp-wheelhome`
    tests the way in on a phone.
  - See WORLD-MAP-PIPELINE "The Wheel is the world".
  - Since v2.3.2995 the Wheel's OBJECTS TAKE HITS, on your screen only (the
    owner's "on the client side"; the worker knows nothing of them):
    - each its MATERIAL, `src/data/wheelMaterials.js` -- its sound
      (`BT_AUDIO.PROP_SOUNDS`, recordings already in the game, level-matched)
      and its pieces cut from its own picture (hitMaterialFx `propChips`);
      test-world-core fails for a catalog object without one;
    - an arrow STAYS in it 90 s, a bolt leaves a burn mark of its own pixels
      (`wheelScorch`), both prop marks in effectsRenderer, keyed by `oi`;
    - enough hits (`hp`: a barrel 3, a tree 8-16, a building 24) and it
      SHATTERS into Voronoi shards of its picture (`src/rendering/
      wheelShatter.js`), its footprint gone at once; mended after
      `REPAIR_MS` 3 min (`src/game/wheelBreak.js`, `?repairms=`), never over
      you. A footprint's `oi` says which object.
    - `mp-wheelbreak` tests it: WORLD-MAP-PIPELINE "The objects take hits".
  - Since v2.3.2996 a MONSTER'S HIT CARRIES ITS ELEMENT (the owner's snowflake,
    fire and air icons, and "slime for floral damage ... a brief held in place"):
    - a landed hit by a frost/flame/wind/flora monster chills (walk x0.55 for
      1 s), burns (3 ticks of 20% of its hit), gusts (shoved 48 px away) or
      holds you (0.7 s, no roll; 2 s immunity after), its element's icon in
      the heart's place on the number; the other four elements do nothing yet;
    - the worker decides it all (`server/src/monsterstatus.js`: `elem`, `st`,
      `stMs`, `kb` on monster_attack; burn ticks are `ability: 'burn'`; the
      speed bound widens only for a gust it granted, `_gustAllowance`), and the
      client acts only on those fields (`src/game/elemHits.js`); kill switch
      `elemhits: false`;
    - the looks drawn round you (effectsRenderer `_updateElemStatusFx`), HUD
      chips on their own clock (`src/ui/ElemStatusChips.jsx`), sounds from
      recordings already in the game (`BT_AUDIO.elemHit`);
    - a gust counts as moving for the move broadcast, so the worker hears where
      you landed at once;
    - `monsterstatus` suite, `mp-elemhits`: docs/specs/monster-statuses.md.
  - Since v2.3.2997 the TOWN IS 1.15x AND THE VIEW 25% FURTHER OUT -- the
    owner: "Change buildings from 1.5x to 1.15x and let me see what making the
    default scale looks like about 25% more zoomed out for everything by
    default (make both changes)":
    - `BUILDINGS` 1.15 in plan.js (all 17, the gates at 1,050/1,161, re-baked,
      no monster moved); the yard's cart, hay, barrel and crate find town
      ground where the wandering edge put them on the grass (placing.js
      `yard`);
    - `VIEW_OUT` 0.8 in `src/game/worldViewport.js` multiplies the three
      CHARACTER-SIZE floors (the 32x32 reference, the vista's width rule,
      `FIGURE_SCALE_FLOOR`) and never the zone's no-void floor -- so the
      Wheel and town are drawn at 0.8 the scale (1.25x the world each way,
      the bro ~83 -> 67 CSS px on the QA phone), and the closed old lands'
      1024 px maps keep theirs; mp-figscale now pins town = 0.8 x a combat
      zone;
    - `?zoom=k` (0.4-1.5) for the tab, `?zoom=1&bigtown=1.5` the game as it
      was; the wider view holds up to ~2x the ground pieces standing (how
      the view sits on the 192 px grid), +15 MB at worst;
    - `mp-zoomout`: WORLD-MAP-PIPELINE "1.15x, and the whole view 25%
      further out".
  - Since v2.3.2999 the OBJECT PLACEMENT STUDY -- the owner: "work
    throughout the night on studying object placement in the game's maps and
    what a good distribution is" -- docs/OBJECT-PLACEMENT-STUDY.md (and
    docs/research/OBJECT-PLACEMENT-RESEARCH.md):
    - `tools/world/study-placement.mjs [--placing 2]` measures the Wheel's
      spread (per screen, Clark-Evans, groves, cover, roads, camps, twins,
      pockets and the gaps the feet catch in) and draws a density map;
    - today's placing has no woods (tall things about random, the plan's
      clumps one tree each), polka-dot rocks, cluttered camps, 467 gaps that
      catch the feet;
    - PLACING v2 behind `?placing=2` (placing.js `natureV2`): a woods field
      (glades, open, woods), a Matern-II hard core by hashed priority
      (`hardCore`), nothing tall covering a road or a camp, camps as framed
      clearings (`campBands`, held to the bake), groups (piles, scatters,
      fairy rings, wall lines), undergrowth, drifts, no gap under 40 px, no
      twins -- the town, fences and oases exactly v1's; and see-through trees
      (wheelObjects.js `_seeThrough`, with `?placing=2` or `?fade`); costs
      ~0.5 s more placing on the way in; making it default means re-baking
      the monsters' places; `mp-placing2`, test-world-core "placing v2";
    - and the ELEVATION PLAN, docs/ELEVATION-PLAN.md (research in
      docs/research/ELEVATION-RESEARCH.md): terraces drawn on the flat map,
      the first step a raised knoll behind `?elev`, the owner's choices;
    - and the WATER STOPS YOUR BOOTS, found by that study: the Wheel's walk
      grid answers `atFeet` (wheelTrial.js lazyGrid), so isSolid and
      nudgeSpawnToWalkable read it playerGroundDy below the body's centre --
      read at the centre, a walk south put the boots ~45 px into a river and
      a walk north stopped them 52 px short: TRAPS §127, `mp-wheelshore`.
  - Since v2.3.3000 the OLD MAP'S SHADOWS AND AIR are on the Wheel -- the
    owner: "I liked the old shadows (and any other visual effect
    enhancements?) of the old map put that on this wheel world too":
    - one sun for the whole Wheel (zoneLight.js `WHEEL_SUN`), its shade's
      colour by the land you stand in (`WHEEL_LAND_LIGHT`, eased in
      lightFx `_wheelLight`); every drawn object casts
      (wheelObjects.js `wheelObjectCasters`: billboards, buildings column by
      column), objects drawn for a shadow that reaches the screen, and a
      freed sheet clears every shadow pool first (shadows.js
      `releaseShadowTextures`);
    - objects shaded toward their foot (formShade), trees and bushes swaying
      with their foot held (worldLife `_updateWheelSway`; since v2.3.3001 a
      strong gust shakes a leaf, a fleck of snow or a flake of char off a
      tree by its `canopy`, `CROWN_BITS`, as the old map's pines shed
      needles; QA's `__btGustAll`), the air and dust
      by land (worldFx `airHere`, the worker's catalog carrying each ground's
      `color`), snow prints on the Wheel's snow (footprintSprites `printsAt`)
      and every print drawn at the boots (`fdy`);
    - WORLD-MAP-PIPELINE "The old map's shadows and air", `mp-wheelshadows`.
  - Since v2.3.3001 HITS SOUND LIKE THEIR MATERIAL -- the owner: "modify hit
    sound effects based on material type so hitting wood vs plants etc for
    props and also against monsters (arrow, melee, magic hit sound for
    snowmen vs slime etc should all sound like their material type). Same
    with when monster projectiles break on you":
    - a monster's hit is a VOICE of its material (`BT_AUDIO.HIT_VOICES`, a
      body and a texture from recordings already in the game): snow (his
      thud + a crunch), goo (the thud + a mud squelch), ember (+ a sizzle),
      stone (the pickaxe + a stone knock, not the clang), wet (+ a splash),
      mud; bone (mummy, skeleton) is sword-hit3 UNCHANGED; picked by
      monsterVariants `hitSoundOf()` (`HIT_MATERIALS` `sound`, else `kind`,
      which still picks the look); melee 0.55, lunge 0.5, arrow 0.6, bolt
      0.22 under its magic, all through `src/game/hitSounds.js`; an arrow or
      bolt into a snowman no longer plays the slime's thud too;
    - the props: `plant` (cactus, giant flower) and `mushroom` (toadstool)
      in wheelMaterials.js, the bush a rustle alone, `soft` gone; a tree's
      crown is heard after its trunk (`CROWN_SOUNDS`);
    - a monster's ball breaks in its material (`SHOT_SOUNDS`: a snowball's
      crunch, a fireball's sizzle, a glob's squelch) on you, on your shield
      (half) or on the ground (quieter by distance); the worker's blow for it
      (`heroHitSfx`: a ball of that monster ended at you within 400 ms, or is
      still flying) plays the armour clang at 0.3 and nothing bare;
    - hits nobody here played (a teammate's, your abilities' and splash) are
      heard at 0.35, softer with distance, never twice, 3 per 150 ms at most;
    - a voice whose samples are not all in (the Wheel's footstep clips,
      outside the Wheel) plays `fb`, its sound before v2.3.3001, never
      silence; levels measured against sword-hit3 (0.92-1.10, peaks <= 0.66;
      there is no limiter on the bus);
    - test-world-core "hits sound like what they hit", `mp-hitsound`,
      `mp-hitvoices`, `mp-wheelbreak`: docs/specs/material-hit-sounds.md.
  - Since v2.3.3003 you can SWIM in the Wheel -- the owner: "add swimming and
    just use the characters head poking out of the water plus code effects
    to make it look like swimming and change the movement behavior":
    - every river, pond, lake and oasis and the sea's SHALLOWS; the OPEN SEA
      past them stays a wall (it keeps the spokes apart) -- ground.js
      `swimBits`, from the shallows' own distance and noise, sent by the
      worker as `walk.swim` and opened by wheelTrial.js lazyGrid; a bridge's
      deck is walked on, so a swimmer can climb onto one from its side;
    - swimming is the ground DRAWN under your boots being water
      (`src/game/wheelSwim.js`: five looks, in at 4 wet, out at 1; a teleport
      flips it silently, `JUMP_PX`); 0.55 of your walk in strokes
      (`SWIM_MULT`, `STROKE_MS`, `SWIM_SURGE`) and a GLIDE that replaces the
      step, never adds to it (`swimGlide`); no swing, special, burst,
      ability, roll or shield (`combatHelpers.swimRefused`, "Swimming!"),
      a held attack lets go, the special and shield buttons hide;
    - the LOOK: `src/rendering/swimFx.js`, after the depth pass, sinks the
      figure to its neck (`figureSwimLine`, measured off the body sheets) and
      cuts it there with a mask; foam ring, the head's shade, the body dark
      under the surface, ripples (crest and trough), wake, stroke splashes;
      peers by the same test at their boots; `_swimK` keeps a swimmer out of
      lightfx's shadows and glints;
    - SOUNDS from the fishing recordings in SFX_MANIFEST (`SWIM_STROKES`,
      `SWIM_SPLASH`), footsteps silent ('swim'); footstepSurface now reads
      the ground at the BOOTS;
    - the worker knows nothing of it (monsters follow you in); `?noswim`
      puts the water back as walls; mp-wheelshore runs with it;
    - test-world-core "swimming", `mp-wheelswim`: docs/specs/wheel-swimming.md.
  - Since v2.3.3006 you can SPRINT, everywhere -- the owner: "a sprint button
    by the left joystick that drains down stamina but makes you run about
    33% faster until it drains out. Maybe just to the right of the left
    joystick":
    - a TAP on the winged-boot button (`src/ui/panels/SprintButton.jsx`,
      placed by `sprintAnchor` in ShieldButton.jsx, drawn by TouchControls)
      or SHIFT held; 1.33x the walk while moving (`SPRINT_MULT`), the jog
      loop as much quicker, 11 stamina a second, none while standing;
    - it ends at zero, on a tap, standing still 0.7 s (2 s before the first
      step), the shield, an attack, the water, death or a zone change; 5
      stamina to start one (`src/game/sprint.js`, no imports, node-tested);
    - the WORKER bills it (`server/src/sprint.js`): a sprinting move carries
      `sp: 1` -- no new message type -- and is judged at 1.33x the bound
      (movement.js `_sprintK`) and paid for (`_sprintPay`: the time since the
      move before, when THAT was a paid step too -- the client's rest packet
      and keepalives end a run, so standing is never billed; never "a long gap
      is a pause", which let a few-frames-a-second phone sprint free), the
      regen held 1 s after; 1.5 s of wide bound after the last paid step; the client's
      drain is a prediction the echo overwrites; `caps.sprint` gates the
      client, `sprint: false` is the kill switch;
    - Shift is the sprint now: a letter's keyup clears both cases and a
      window blur lets every key go (desktopControls.js), and the QA
      keep-alive key is Control;
    - `sprint` suite (47 checks, the client's rules too), mirror-audit,
      `mp-sprint`: docs/specs/sprint.md.
  - Since v2.3.3008 the Points window's MAX MP has its before/after scene,
    "the only one missing one": both lanes cast specials at one block of
    mana each (`statSim.js` `manaPass`) until "Out of mana", the "+n" bar
    longer, with "Max MP" and "Specials on a full bar" lines
    (`specialsOnABar`); `statsim` suite §7, `mp-statdemo`.
  - Since v2.3.3050-v2.3.3053 THE HERO SHEET, from the owner's notes of
    2026-10-05 (docs/specs/hero-sheet-pills.md):
    - the spend window's MAX HP / Stamina / Max Mana row reads the POOL'S new
      total as its bar shows it, not the points' raw bonus ("48hp for 6
      points" when the bar became 37): `statPreview.js` `POOL_STAT`,
      `pooled`, `poolShown`, shared with the scene; `statsim` §9;
    - the points grid FOLLOWS THE HELD WEAPON: a change of weapon brings it
      back (`heldCatRef`), the window's tabs aim only the window;
    - the per-weapon and character point bubbles BREATHE while points wait
      (game.css `bt-pts-bubble`, transform and opacity only);
    - the Equipment tab's stats are PILLS, the owner's mockup: picture, name,
      value; OFFENSE gold with DPS beside its heading, PLAYER blue, the
      vitals as filled pills -- fourteen stats where there were seven, each
      read by the Points tab's own reader (`heroStatPills.js`); upright, the
      left column is the figure, the gear and PLAYER, the right the vitals and
      OFFENSE; the tab SCROLLS again with the bottom fade on (fourteen
      readable pills cannot fit the ~150 px window); the eighth LANTERN-SLATE
      exception; `mp-charfit` (three phone sizes), `mp-prog3`.
  - Since v2.3.3009 the Wheel's TOP BAR says where you are -- the owner:
    "Put the 'brotown safe' and other location indicators in place of the
    'the wheel lvl 1-2' on the top bar" -- the land over its stage and
    levels or "safe" in gold (ZoneHeader.jsx `wheelWhere`, the last answer
    kept), nothing printed under the minimap any more (its probe keeps
    `words`), and the minimap wears a 7 px slate-and-brass FRAME, opaque
    (`FRAME` in wheelMinimap.js): WORLD-MAP-PIPELINE "Where you are, on the
    top bar"; `mp-wheelmap`, `mp-wheelhome`.
  - Since v2.3.3010 GREAVES ALONE HIDE THE PLAIN LEGS -- the owner: "the
    legs underneath near the shoes poke out during east jog. You can just
    remove the plain clothes legs beneath": maskedBake.js `_legsOnlyClamp`
    (jog and stand, legs worn without the chest) keeps, from the greaves' top
    row down, only the plates' silhouette, the waistband V between the thigh
    plates and the arms (skin by hue AND plain colour distance, nothing
    darker than a third of the skin -- TRAPS §129); enclosed windows turn
    under-armour shadow; the full set is untouched; `mp-greaveslegs`
    (`window.__btLegsPeek`), src/belt-harness.html `?wear=legs&pose=&tint=&clamp=off`.
  - Since v2.3.3011 the view is ANOTHER 25% further out -- the owner: "If it
    is already zoom it out another 25%" -- `VIEW_OUT` 0.64 (0.8 x 0.8) in
    worldViewport.js, the bro ~54 CSS px on the QA phone with the dashboard
    folded, ~40 with it up (37 was "too small", v2.3.2249); `?zoom=0.8` is
    the view before; WORLD-MAP-PIPELINE "And another 25%", `mp-zoomout`.
  - Since v2.3.3012 the WHEEL GROWS RESOURCES -- the owner: "Add harvestable
    resources back to the wheel", "Copper can be in the safe areas around
    town. Iron can be in lvl 1 monster areas ... 'black steel' in like level
    10+ areas":
    - 140 nodes baked with the monsters' places (`WHEEL_NODES`,
      bake-wheel-spawns.mjs `bakeWheelNodes`; the worker's
      wheelzone.js `_wheelSpawnNodes`): copper/pine/minnow on the commons
      (tier 1), iron/softwood/clownfish at levels 1-10 (tier 6), black
      steel/hardwood/trout at 11-20 (tier 11); a node carries `home`, its
      land, whose shard it drops (none on the commons);
    - fishing spots in the real water (a 4 x 3 patch WEST of the spot, as
      the baked rod's line falls; every land has some -- "Make all 8 have
      fishing spots"), the angler on dry ground, nothing tall in front of any
      node or its worker; with v2.3.3003's swimming, a swimmer who taps a
      spot or a vein climbs out onto its baked-dry seat, and a chop or a cook
      from the water is refused, "Swimming!" (lifeSkillRewards.js
      `startExtraction`); the spot's FISH drawn in code
      (`src/rendering/wheelNodes.js` `WheelFish`), only the nodes near the
      view drawn (`wheelNodeView`) and marked on the Wheel's minimap, a glyph
      a kind tinted by tier ("Show nodes on minimap"); veins and trees by
      tier (`tools/make_tier_art.py`, effectsRenderer `NODE_TIER_*`);
    - the tier after iron is BLACK STEEL (`BLACKSMITH_TIERS.steel`, key
      unchanged, `ore_black_steel_ore`), its blades black ("Make the black
      steel black": materialTints.js `blacksteel` via `BASE_MATERIAL`); the
      quest's road leads to the nearest
      node its next step needs (questRoute.js `_wheelGatherPoint`, a step's
      `node`); the Wheel's nodes drop at the flip to town;
    - `caps.wheelnodes`, kill switch `wheelnodes: false`; `wheelzone` §8,
      `mp-wheelnodes`: docs/specs/wheel-resources.md.
  - Since v2.3.3013 MONSTERS PAST LEVEL 5 -- asked "monsters past level 5 ...
    levels 6-20 in all eight lands (up to the first pass)", the owner: "Yes
    continue working on those items":
    - each land's next three stretches (tiers 2-4, levels 6-10, 11-15, 16-20,
      the rest of its first stage) have its own spawn list again, 6 a
      stretch: 144 more, 192 in all, ids `wm-<home>-t<tier>-<k>`, the first
      stretch's 48 unchanged and first in the list (wheelzone.js);
    - a monster's level is its stretch's by where it stands in it; its stats
      from the one copy of the math, `_makeZoneMonster(..., atLevel)`;
      rewards its home's; the first stretch keeps levels 1-2;
    - places baked like the first stretch's (`SPAWN_RULES.deep`,
      `WHEEL_SPAWNS[home].deeper`): on that very tier, 120 px inside it,
      360 px from a camp's plot; test-world-core checks them;
    - the client no longer clamps a Wheel monster's level to its home's 1-2
      (monsterVariants.js applyZoneVariant: "Lv 2" on a level-18 snowman);
    - the Wheel's monster separation is a sweep along x (`_wheelSeparate`):
      every pair of 192 was 1.0 of the tick's 1.27 ms, now 0.26 ms in all;
      every other zone keeps the old loop; `wheeldeep: false` the kill switch;
    - the resources (#780's, v2.3.3012) keep their 300 px from these places
      too (the bake's `monsterPts` takes `deeper`): re-baked, 142 nodes, 84
      moved; `mp-wheelseats` walks to all 34 fishing seats on a phone and
      checks them against the ground as drawn (docs/specs/wheel-resources.md);
    - docs/specs/wheel-monsters.md "Past level 5", `wheelzone` §1b/§4b/§9,
      `mp-wheeldeep`.
  - Since v2.3.3014 THE OTHER FOUR ELEMENTS DO SOMETHING TOO -- offered "stone
    stuns briefly; storm shocks nearby players; water slows stamina refill;
    venom poisons over time", the owner: "Yes continue working on those
    items" (server/src/monsterstatus.js, client src/game/elemHits.js):
    - stone (rock monsters) DAZE 0.5 s: no walk, swing, roll or shield
      (`combatHelpers.dazeRefused` beside `swimRefused`, and the auto-attack
      loop), 2.5 s before another; stars round the head;
    - storm (Storm Peaks slimes) SHOCK: the hit arcs to every other player
      within 150 px (nearest 4), half its damage each, elemental, under a
      15% max-HP rail, never onto the safe ground or a harvester -- each arc
      that player's own monster_attack `ability: 'shock'` (`_shockArcs`);
    - water (fishmen) SOAK 4 s: the regen tick refills stamina at 0.4
      (`_soakRegenMult`; exactly 1 when dry);
    - venom (wisps, lurkers) POISON: the burn's machinery in its own Map
      (`_poisons`, `_igniteDot`/`_tickDots`/`_dotTick`), five ticks of 12%;
    - looks, chips (Dazed/Soaked/Poisoned), icons `elem-stone/storm/water/
      venom`, sounds sliced from recordings already here (ELEM_SOUNDS);
      `elemhits: false` still stops them all; `monsterstatus` §10-13,
      `mp-elemhits`: docs/specs/monster-statuses.md "The other four".
  - Since v2.3.3015 A SPRINT IS SEEN AND HEARD -- offered "sprint polish:
    other players' legs at sprint pace, a dust puff, a sprint sound", the
    owner: "Yes continue working on those items":
    - the tick's player carries `spr: 1` while the worker paid it a sprint
      step in the last `SPRINT.WIRE_MS` 600 (`_sprintWire`), absent when
      walking -- NOT `sp`, which in a player's data is the shirt pattern;
      wsClient keeps it as `other._sp`, and a peer's jog loop plays
      SPRINT_MULT quicker, its phase kept across the change (`_jogOff`);
    - dust at each foot plant of a sprint (`sprintDust`, game/sprint.js):
      yours the ground's colour (`SPRINT_DUST` by footstep surface), a
      peer's the dirt's; a sprint's first stride pushes off (updateSprint
      'run'): `BT_AUDIO.sprintPush`, the special swipe, and a bigger puff;
    - a foot plant STEPPED OVER between two draws counts now
      (`_jogPlantCrossed`): a page drawing a few frames a second rarely
      landed on one, and lost its footsteps and dust;
    - `sprint` §10, `mp-sprintpeer`: docs/specs/sprint.md "Seen and heard".
  - Since v2.3.3016 DUNGEONS IN THE WHEEL -- offered "Dungeons in the Wheel
    ... the other big missing piece", the owner: "Yes continue working on
    those items":
    - a land's LANDMARK is its dungeon's mouth: the Great Cave (hollows,
      levels 26-30), the Foundry Dome (thunder, 26-30), the Buried City (sky,
      41-45) -- `WHEEL_DUNGEON.LANDS` in `server/src/wheeldungeon.js`; the
      other five lands have no landmark on their spokes yet;
    - where each stands and the way back out are BAKED with the monsters'
      places (`WHEEL_DOORS`, bake-wheel-spawns.mjs); the client finds the
      mouths in the worker's own map (`wheelMapInfo().places`), only WHICH
      lands in `src/data/wheelDungeons.js` (mirror-audit);
    - each mouth drawn in code until it has a picture
      (`src/rendering/wheelDoors.js`), "⚔️ Enter the Great Cave" within 200
      px (or E); `dungeon_start` sends `{ entrance }` and nothing else, the
      worker judging the rest within 260 px (`_wheelDungeonConfig`);
    - inside: dungeon.js's instance, its waves the land's own spawn list
      built by `_makeZoneMonster` with `home` (their looks, shards, quests),
      the boss its last kind five levels up; the level the place's top but
      never above yours; its looks loaded behind the loading screen
      (`loadLandLooks`) and the arena's zone given the land as `homes`;
    - the ARENA is its own, not the Workshop's (`wheelArenaMap`): 36 x 52
      (`WHEEL_ARENA` = `WHEEL_DUNGEON.WIDTH/HEIGHT`, mirror-audited) so an
      upright phone keeps the Wheel's character size -- the Workshop's 28 x 22
      was zoomed in to fill the screen, the bro 2.5x -- its way out in the
      last floor row on a 3-row bottom wall (a door IN the bottom row is never
      stepped on: `_FOOT_MARGIN` 80), deaf 2.5 s after you arrive; floored
      with the land's own ground picture (`WHEEL_DUNGEON_FLOOR`: hollows-4,
      thunder-2, sky-3; tileRenderer.js `_rebuildFloorPic`, mipmapped, walls
      in code), loaded behind the screen at the Wheel's `?v=` address and
      freed a beat after you leave; no old zone tools (the Deep Hollows'
      torch) in a zone with `homes`;
    - found by its phone test: leaving the Wheel for an arena freed the
      thorn shambler's look, which IS the rock monster's module -- the Great
      Cave's monsters undrawn and the renderer throwing on destroyed
      textures; `unloadVariantSprites(keys, keep)` keeps any module a kept
      look draws from; and a zone with no `palette` (every dungeon arena,
      the Workshop's too) threw in `getTileHexColor`, so no floor drew;
    - out (cleared, or its door) through today's town and down the stairs,
      arriving at the mouth (`leaveWheelDungeon`, `setWheelArrival`); a
      party member comes in only from within 600 px of the mouth;
    - `caps.wheeldungeons`, kill switch `wheeldungeons: false`; the QA op
      `clearwave`; `wheeldungeon` suite, `mp-wheeldungeon`:
      docs/specs/wheel-dungeons.md.
    - Found on the way: the Wheel's buildings have NO DOORS yet -- the
      forge, the bank, the shop and the farm (the Dungeon Workshop) are
      unreachable from the Wheel. (They have doors since v2.3.3032, below.)
  - Since v2.3.3017 you can JUMP -- the owner: "start working on real
    jumping. Might be able to just use the jog directions instead of a custom
    jump animation", its button "beneath the right joystick":
    - your POSITION never leaves the ground (the worker sees a walk); the
      body is drawn up to `JUMP_PEAK` 68 px (a bro's height; the owner's "about
      2x as high" of the first 34) for `JUMP_MS` 560 holding one
      leaping frame of the jog (`JUMP_FRAME`), lifted by
      `src/rendering/jumpFx.js` after the depth pass, and `figureFeetY` adds
      the lift back -- sorted, shadowed and standing on the ground;
    - REAL: low Wheel objects (`JUMP_OVER` in `src/game/jump.js`: fences,
      walls, barrels, crates, benches, rocks, bushes...) don't stop the feet
      while high enough, only if the way you go carries you out before you
      come down (`overLow`, judged on what the frame really moves,
      `S._frameMs`); everything else blocks in the air; momentum when you let
      go of the stick;
    - JUMP button under the attack disc (`jumpAnchor`, JumpButton.jsx, fires
      on the press), X on a keyboard; no jump swimming, rolling, held, stunned
      or harvesting; in the air a swing, roll, shield, ability or second jump
      is refused quietly (`airRefused` beside `swimRefused`); no water check,
      steps, dust or prints mid-air, a step and a dust ring on landing;
    - other players: a `player_jump` relay (no worker change), `other._jump`;
    - test-world-core "jumping", `mp-jump` (`?jumpms=` for a slow machine):
      docs/specs/jumping.md.  Not yet: jumping over attacks (the worker's).
  - Since v2.3.3017 a BLACK SCREEN LEAVES EVIDENCE -- the owner, on #782's
    preview: "I was fighting fire goblins and my screen went black", and the
    crash feed had nothing:
    - then their SCREENSHOT: the world the canvas's own clear colour
      (`CANVAS_BG` 0x0d0b18, pixiApp.js) with only the bro's sword drawn --
      an iOS graphics reset keeps what was loaded from a file and blanks what
      the game drew on the GPU (body, ground, minimap). The black-screen
      watchdog counted that navy as LIT (its channels sum to 48, its line was
      30): no strike, rebuild or reload, ever. Now lit = clear of black AND
      of `CANVAS_BG` (BroTown.jsx `_wdLitPx`), nothing judged before the
      loading screen lifts or behind a veil; two strikes (10 s) rebuild, four
      reload. TRAPS §130, `mp-glrestore` (`__btBlankStage`: the stage's
      CONTENTS hidden -- a hidden stage skips its clear and goes see-through;
      Chromium's WEBGL_lose_context restores everything, so it cannot make
      the reset itself);
    - an `app.render` throw (pixiRenderer.js) goes into the crash log at once,
      and 90 in a row rebuild the renderer, as an update() throw's always did
      (renderFrame.js) -- it was caught and only printed, so a world that
      stopped drawing there stayed dark with no report and no rebuild;
    - a page iPhone Safari kills outright is reported by the next one
      (crashTrap.js `markAlive`: `bt-alive` every 5 s from the watchdog's
      timer, taken away on pagehide; 'killed' on screen, 'evicted' in the
      background, with zone, place, hp and the asset cache's MB);
    - a death is a quiet breadcrumb ('died', sent only with a real event);
    - the Wheel's monster looks load by land (the looks clause, Conventions):
      ~37 MB less at the Flame Fields' inner end, whose walk out had peaked
      at 239 MB of the cache against the ~250 MB a tab dies at;
    - the preview it happened on ran the old client against #781's worker,
      which drew level 6-20 fire goblins "Lv 2" (#781's monsterVariants.js
      fixes it): a sudden death and the respawn's two dark veils ("Entering
      Town", "Entering The Wheel", 92% black) are the other likely story;
    - `mp-firefight` fights a land's monsters on a phone watching the screen
      (the watchdog's lit sample taken in an animation frame -- from a timer
      a WebGL canvas reads black -- and screenshots measured), `mp-wheelmem`
      measures the walk out (the cache, and every texture WebGL allocates, by
      a shim on its calls).
  - Since v2.3.3019 THE WATER MOVES -- the owner: "Does the water move yet",
    then "Yes" to glints and lines of light, the foam lapping at the shore and
    a drift down the rivers:
    - the owner's pictures stay; `src/rendering/wheelWater.js` (`WheelWater`,
      owned by WheelGround, whose pieces are now in `pieceRoot` so the water
      stays on top) draws one quad a piece with water: the picture SWELLS
      (each water px drawn from up to 3 game px away along three crossing
      waves, never as far as the shore, riding downstream on the river), surf
      riding in with a wash and the shore's foam flaring, sparkles, crests of
      light, streaks and flecks down the Sweetwater the way it flows, rings on
      still fresh water, whitecaps -- all but the swell a PICTURE px at a
      time; lines of light of its own read as scribbles beside the owner's;
    - SIZED FOR A PHONE: the first cut (a 1 game px sway and 1 game px lines,
      under two device px) the owner could not see: "I don't see the water
      moving"; lines are 2-4 picture px thick now, and the ground pieces'
      apron is 3 art px (`APRON` in ground-worker.js, was 1) so the swell
      never reads past a piece's picture -- test-world-core checks the two;
    - from a FIELD the ground worker lays with each piece (ground.js WATER
      THAT MOVES, `composeGround`'s `waterField`, the game's worker only): R the
      distance to the shore AS DRAWN, exact (an EDT over the worked-out
      margin, `WF_CAP` 10 game px), G the water's kind as `waterLook` picks
      its picture (`WF_KIND`, carried `WF_SPREAD` texels onto the land), B/A
      the river's way (`waterRivers`); a texel an art px, sharing the piece
      picture's texture coordinates; open sea with no shore in reach is
      `uniform`, one shared 1x1 texture; ~6 ms more a coast piece;
    - WebGL2 only, `highp`; built behind the Wheel's overlay
      (`prewarmWheelWater` in preloadWheel: a program compiles the first time
      it is drawn); `?nowaves` keeps it still (no fields laid), `?waves=k`
      sets its strength (0.25-3); the trial readout's "water" line says
      moving, or still and why; `window.__btWaves` (probe, off/on, strength,
      hold);
    - test-world-core "the water moves", `mp-wheelwaves`:
      docs/specs/moving-water.md.
  - Since v2.3.3020 the view is BACK IN A LITTLE, the bro 64 px tall -- the
    owner: "the framerate looks a bit gritty I think from the scale change
    ... I think char 64 pixels tall was probably best": `VIEW_OUT` 0.77 in
    worldViewport.js (scale 0.606 on the QA phone, dashboard folded). The
    grit was the HD pictures drawn smaller than their own pixels: 0.76
    device px a picture px on a 3x phone at 0.64, so they crawled as the
    view slid; 0.91 now. `?zoom=0.64` is the view before; `mp-zoomout`:
    WORLD-MAP-PIPELINE "Back in a little".
  - Since v2.3.3021 the water's HONEYCOMB IS GONE and its light MOVES -- the
    owner: "The water has a honeycomb pattern that needs to change to mimic
    water movement. Is that something I should get from chatGPT or you do it
    using code?":
    - the honeycomb was ChatGPT's web of light (caustics) in all three water
      pictures; still, it read as a pool's tiled floor;
    - the ground worker takes it out of each water picture once (`calmWater`,
      ground.js CALM WATER): a grey opening at half size finds it, it is
      filled from the colours round it on the picture's own colours, wrapping
      so the tile stays seamless; only when the game says it draws the water
      moving (`moving` on init, `setWheelWaterMoves`), so `?nowaves` and no
      WebGL2 keep the pictures as made;
    - the shader draws its own web, moving (wheelWater.js CAUSTICS): round
      cells (nearest over next-nearest distance, not F2 - F1) that swell and
      re-form, curving and breaking, one 42 game px cell size, faint and broken
      on the open sea, none on a running river; `?caustics=k` (0-2);
    - test-world-core "the water's frozen web of light taken out", `mp-wheelwaves`:
      docs/specs/moving-water.md.
  - Since v2.3.3022 the TOWN IS LAID ROOMIER -- the owner: "The town center's
    buildings feel too squished together. I think brotown itself might need
    to be bigger to accommodate":
    - `bigTownPlan(k, pictures)`; `PLAN = bigTownPlan(TOWN, BUILDINGS)`, laid
      1.5 round pictures drawn 1.15: the Town Hall and Hotel 4 -> 103 game px
      apart, Market Row 78 -> 228, the gates at 1,226 / 1,455; 1.5 is the most
      east-west before the Sweetwater; `planFor(search)` in the worker,
      `?bigtown=1.15` the town before; the readout "· town x1.5";
    - the arches, signposts, yard scatter and fences at each street's own gate
      (`townGates`; at 1.15 a signpost stood inside the Assay Office); the Old
      Mill whole on the far bank (`MILL_NEAR_GATE`, `MILL_FAR_X`);
    - re-baked: only the commons' ore, trees and fishing spots moved;
    - test-world-core "the town laid roomier": WORLD-MAP-PIPELINE "The town
      laid roomier".
  - Since v2.3.3023 the WAY HOME is on the minimap -- the owner: "the world
    feels hard to navigate without losing your sense of position relative to
    the town center": when town is off the box, a home badge (the house on a
    dark disc, a brass point at town) rides the box's edge toward it, as the
    quest star does, clear of the expand mark, aside while the star leads to
    Mayor Bro; `__btMinimap.home`; `mp-wheelmap`: WORLD-MAP-PIPELINE "The way
    home".
  - Since v2.3.3024 EACH LAND IS OBVIOUS -- the owner: "flat colors on the
    minimap to help orient you to what elemental zone you're in", "elemental
    zones need something more obvious": `src/data/wheelLands.js` (a flat
    colour and the element's icon a land); the minimap and world map paint
    each land its colour (`overviewLands`, `landsCanvas`); the top bar puts the
    icon before the land's name, in its colour; crossing into a land plays its
    banner (`noteWheelLand`: the owner's art for frost, ember, sky, verdant,
    the plaque alone for the other four, nothing borrowed); and the river's
    streaks are softer ("too harsh in the river over the bridge"):
    WORLD-MAP-PIPELINE "Which land you are in", `mp-wheelmap`.
  - Since v2.3.3025 ONE LOADING SCREEN AND NO WAY BACK -- the owner: "players
    are starting in the old town and getting routed to the wheel on the
    loading screen. Also there still a portal to the old town. Disable that.
    Also sometimes the loading screen of the ocean is too small":
    - the ocean clip waits for the arrival in the Wheel (IntroVideo's world
      gate, `waitForWheelArrival`), and no zone veil is painted over it
      (`body.bt-intro-up`);
    - while the trip is wanted the veil says "The Wheel" and is never lifted on
      today's town (`wheelTripVeiled`, syncTownScenery), raised the moment a
      death or a dungeon's way out puts you there (`veilWheelTrip`);
    - no marker back to today's town (`setExits(null)`; `?wayback` or
      `?nospawn` for tests) -- its shops, forge, bank and auction house are
      unreachable until the Wheel's buildings get doors (v2.3.3032: they do);
    - the clip fills its screen on explicit edges, says its shape (400 x 736)
      and shows its first frame as a poster (`loading-ashore-poster.webp`);
      the creator's warm-up warms it (it warmed a clip gone since v2.3.822);
    - `mp-wheelhome`: WORLD-MAP-PIPELINE "One loading screen, and no way back".
    - Since v2.3.3029 those doors no longer count for quests: worldTrial.js
      closes today's town (`setClosedDoorZones`) and gameSystems.js
      `anyBuildingDoor` skips its doors, so mayor_1 ("Visit 3 buildings in
      town") hides itself and the Mayor offers mayor_2 -- counted, it was an
      errand nothing could finish, and it stopped his chain (tutorial §9).
  - Since v2.3.3026 A HIT ON YOU READS LIKE ONE YOU DEAL -- the owner: "damage
    numbers as large as they usually are and with the elemental icon after
    the damage number similar to how the sword has sword icon": spawned over
    your band (`heroPopupY`/`peerPopupY`, was your face), the element badges
    and the heart cut to their own opaque box as they load (`_tightPopupIcon`)
    so they draw as tall as the number; a rolled dodge says "Dodged", no "-0";
    docs/specs/monster-statuses.md, `mp-elemhits`.
  - Since v2.3.3027 THE HARVEST'S BAR IS OVER YOUR HEAD, AS BIG AS YOUR HP BAR
    -- the owner: "Ticks for the resource extraction is too hard to see ...
    hide the player name plate and health bar during extraction":
    `selfGathering` puts the plate and the HP bar away, `drawNodeHpBar` `big`
    (76 x 22, your HP number's type) at `S._selfBand` or over a stand-in's
    boots (`bandOverBoots`); docs/specs/gathering-hits.md, `mp-wheelnodes`,
    `mp-gatherhits`.
  - Since v2.3.3028 A LOW THING'S SHADOW STARTS AT ITS BASE -- the owner: "Sea
    level props have shadows that appear to be floating off the ground":
    everything but a tree casts column by column (shadows.js `placeDepth`,
    its new `floor`), each column from its picture's lowest pixel
    (`readArtBottoms`), never further back than the footprint's middle; QA
    `__btWheelCastBoard`, `__btWheelObjects.caster(i)`; WORLD-MAP-PIPELINE "A
    low thing's shadow starts at its own base", `mp-wheelshadows`.
  - Since v2.3.3031 BROTOWN IS A DESIGNED PLACE -- the owner passing on a
    reviewer's look at the 1.5x town zoomed out: "the center reads as one huge
    tan clearing ... think of it as individual streets, plazas and lots. Once
    the green is allowed back between those pieces ..." (plan.js `design`, the
    standard plan's only; `?plaintown` is the standard size without it):
    - the town's open ground is the commons' GRASS except an earth apron round
      each plot and a worn verge along every street (layout.js `townSurfaces`,
      ground.js materialMap): only the picture changed, the region, classes,
      walk grid and baked places did not; a street is laid exactly on its cells,
      so grass at its edge was a ruler line -- hence the verge; 30% of the
      town's earth is grass again;
    - the square 28% bigger (300 -> 384 art px a half) and paved under the Town
      Hall, the Hall drawn 18% bigger (`hallScale`), the gates at 1,326 / 1,447;
    - districts (north civic and trades, east the mine side, south the strip,
      west the farm road) and plots off their rows (`design.lots`, `dx`/`dy`);
    - the town's grounds (placing.js `townGrounds`): gardens on the lawns, the
      old grove and the mine side's ore yard and the farm side's hay, runs of
      fence and hedge on the town's edge, a wagon yard inside every gate; the
      commons' scatter thinned 25% within 336 px of the town (`HALO`, v1 only);
    - ONE pond, Bro Pond (plan.js `ponds`), where four stray puddles were;
    - re-baked: only the commons' ore, trees and fishing spots moved;
    - test-world-core "the designed town" (it flood-fills the town from the
      arrival: every door, gate and Mayor Bro reachable), QA `mp-wheelobjects`
      (the oasis check fails on main too); WORLD-MAP-PIPELINE "The town as a
      designed place" says what was not done (roofs, new landmarks' pictures,
      a creek) and why.
  - Since v2.3.3032 THE WHEEL'S BUILDINGS HAVE DOORS -- the owner: "Push to
    main. Then after that add doors.":
    - twelve of the seventeen open today's own building (the same panels, the
      server settling everything as before): stand at the foot of a
      building's steps, your BOOTS within 140 px, and a small button says
      "Enter" over the NAME ON ITS SIGN (SALOON, not the old TAVERN); a tap or
      E opens the forge, woodworker, gem cutter, saloon's party panel, gambling
      den, cookhouse, Feed & Seed's farm panel, the Land Office's trip to your
      farm, the bank, the Assay Office's enchanter, the General Store's market
      or the auction house;
    - where: the ground worker's `objects.doors` (placing.js `doorSpots`: a
      building is placed with its foot on its plot's door, so a door is where
      the building stands; none for a building with no picture); what opens:
      `src/data/wheelBuildingDoors.js` (plot -> TOWN_BUILDINGS id, mirrored to
      the plan's `today` words by test-world-core); when:
      `src/game/wheelTownDoors.js` `wheelTownDoorAt`, which BroTown's scan
      turns into the old town's own `S.nearBuilding`, so the E key,
      `enterBuilding`, the visit count and the saved visits are untouched;
    - the Enter button is "Enter" over the name, small, in the stretch between
      the bell and the JUMP button (a one-line pill with the signs' long names
      ran under the jump button); the Sheriff's Office, Hotel, Post Office and
      Guild Hall (the plan's "(new: ...)" plots) show their name and "Shut for
      now" in a caption that is not a button, the Town Hall shows nothing
      (Mayor Bro);
    - quests: `setWheelDoorsOpen` (gameSystems.js, set by worldTrial.js) counts
      the twelve actions, so mayor_1 "Visit 3 buildings" and mayor_3 (the Farm)
      are offered again -- v2.3.3029 hid them while the Wheel had no doors;
    - Diego keeps the General Store (BroTown.jsx `_spawnWheelNpcs`,
      `WHEEL_TOWNSFOLK`): west of its steps, still, facing the street, his
      window opening within 90 px of HIM and not at the store's door; only his
      south strip is loaded, cropped (npcSprites.js `wheelWalkSources`), as the
      Wheel's own copy behind the loading overlay. The blacksmith, Ace and
      Lil Bro stay in today's town;
    - the farm: the Land Office and Feed & Seed both send you there
      (`rememberFarmTrip`), and its gate leads back out to the Wheel at the
      door you left by -- the dungeon's way back (`setWheelArrival`,
      `wantWheelSpawn`, `veilWheelTrip`), today's town only a stop;
    - `mp-wheeldoors`, test-world-core "the buildings' doors",
      `tutorial.test.mjs` §9: docs/specs/wheel-doors.md, WORLD-MAP-PIPELINE
      "The buildings have doors".
  - Since v2.3.3033 DAMAGE NUMBERS ARE 1.75x BIGGER -- the owner: "Damage
    numbers for players and monsters needs to be about anywhere from 1.5-2x
    bigger":
    - effectsRenderer `DMG_SCALE` 1.75, the middle of the ask (`?dmgscale=1.5`
      .. `2`, 1 to 3, for a tab): every DAMAGE number -- a hit you deal, a crit,
      a hit on you or on a teammate, a tick, a gathering hit -- is drawn at that
      times its old 21 / 38 world px (`isDamagePopup`: it has a digit, does not
      start with "+", and is a hit taken, carries a weapon / crit / heart /
      element mark, or is a plain number); "Blocked!", "Dodged", "+30 XP",
      "+25 G", a heal's "+12" and every word keep 21 px, so a kill's number is
      the biggest thing over the monster and its XP and gold read under it;
    - what depends on the size follows it: the crit still 1.8x the plain one,
      the 22 px mark cap and the gap after the digits x the scale, the stroke
      and halo of classic Text, the stacking (26 px at two 21 px numbers is
      26/21 of their average font, its window with it), the climb (40 -> 70 px
      a second, so hits 0.7 s apart do not touch), and the spawn height -- the
      centre lifted 0.9 of the extra size (`DMG_LIFT`) so the bigger glyph keeps
      the air over the bar the old one had;
    - the glyph atlas is baked at 128 px, not 100 (`DMG_BMP_BAKE_PX`): the
      biggest crit was enlarged 1.33x from its bake, now 1.04x, for +0.7 MB of
      6 -- a bake is a DENSITY knob, never a size one (TRAPS §137);
    - `mp-dmgsize` (20 checks on a phone: sizes, marks, gaps, a hit on you,
      stacks, a kill's XP and gold, the words), mp-elemhits and mp-critpreview
      read the scaled cap; TRAPS §136 (emptying `S.dmgNumbers` leaves its Texts
      drawn): docs/specs/damage-number-size.md.
  - Since v2.3.3034 A LOST CONNECTION IS NOTICED, AND NOTHING THE WORKER
    SETTLES IS LOST TO IT -- the owner: "Logs aren't going to the inventory
    after getting chopped, and points in point stat allocation menu weren't
    getting allocated ... screen had gone black then came back from low
    memory":
    - measured (`mp-recoverpay`): every way back from a black screen (the
      rebuild, the reload, a context restore) settled fine; an IDLE LOGOUT (the
      world plays on behind its banner) and a DEAD PIPE (the socket reads OPEN
      and carries nothing) lost every chop and spend -- the harvest fell to the
      timer bar with no numbers, its log still flown to the bag;
    - wsClient `_aliveTimer`: 15 s with no frame (`DEAD_PIPE_MS`), or 7 s after
      a settled send with none (`SETTLE_SILENT_MS`), and the socket is rejoined
      (`_forceRejoin`, v2.3.778's resume-resync surgery); a strike nothing
      answered, or with no socket to carry it, goes again after the rejoin
      (`_holdForRejoin`: strikes only, a node pays once; never a spend);
    - an idle logout comes back on the first touch or key (`_armComeBack`),
      and a thumb held on the stick is input (`S.stickX || S.stickY` stamps
      `_lastInputAt`: two minutes of walking used to log you out);
    - `combatHelpers.offlineRefused`: no harvest or cook while the socket is
      not live ("Reconnecting…"), the Points window's Spend greyed with the
      reason, and `channelShim.reconnectNow()` bringing the session back;
    - TRAPS §138: docs/specs/dead-connection.md.
  - Since v2.3.3035 THE HARVEST'S BAR IS GREEN, OVER THE RESOURCE, AND READS
    "7/10" -- the owner: "I want resource harvesting bar to be green and to
    appear above the resource, not the player head. It should also list the
    numbers on the bar right now the bar has no numbers":
    - over the top of each resource's art (effectsRenderer `NODE_HPBAR_AT`,
      `_nodeHpBarAt`): the crown, a pond's water, a Wheel fishing spot's school
      (`wheelFishTop`) -- and UNDER the rock (`under`, the owner: "For mining
      you can put the bar beneath the ore"; the miner stands right behind it,
      his head and shoulders were under a bar above it) and still under the
      campfire (the cook leans over it: above it is his head);
    - still your HP bar's size (v2.3.3027, `bandScale`), your name plate and HP
      bar still put away while you gather; v2.3.3027's `_gatherBand` is gone;
    - on a world layer of its own, the last (`worldUi`, pixiApp.js): the rock
      you mine is promoted to `overlayWorld`, and in that layer it still came
      out over the bar now and then, re-appended or not;
    - green: the HP fill's art with its red turned green
      (`public/ui/bars/node-full-green.png`, `tools/ui/green-node-bar.sh`);
    - "hp/max", fitted inside; the timer's bar (a harvest whose hits never
      came: the owner's "no numbers") reads the node's HP worn down with it;
    - `mp-gatherhits` (its gesture's moves no longer yield to this box's slow
      frames: every harvest there failed on main) and `mp-wheelnodes`:
      docs/specs/gathering-hits.md.
  - Since v2.3.3036 THE HARVEST'S GESTURE IS A QUARTER AS LONG -- the owner:
    "reduce resource extraction time during gesture by 75%":
    - gesturePose.js `GESTURE_TARGET_MS` 6000 -> 1500, `GESTURE_FLOOR_MS`
      4800 -> 1200 (3.6 pumps or chops, 3.1 turns, 3 flips at a quick pace);
      the grade moves with it; the wind-up's hits are unchanged;
    - the WORKER'S SPEED LIMITS MOVED WITH IT, each derived from the fastest an
      honest harvest or cook comes round, 1,510 ms (gathering.js
      `HONEST_CYCLE`: hit lead + settle + the gesture's floor, pinned to the
      client's by mirror-audit): perfect claims 10 -> 45 a minute
      (`HARVEST_PERFECT_PER_MIN`), cooks 20 -> 45 (`COOK_PER_MIN`), the gap
      between cooks 1.2 -> 0.9 s, botfp's hour caps 810 / 700 -> 2,400 --
      in the Wheel supply no longer bounds a player, and a quick angler would
      have lost fish to 810; the worker still never times the gesture, so a
      modified client skipping it is no longer clipped by the hour cap there;
    - `node-respawn` §3c, `anticheat` §4/§7: docs/specs/gesture-cue.md
      "v2.3.3036".
  - Since v2.3.3037 TODAY'S TOWN'S ART IS NOT LOADED FOR THE STOP ON THE WAY TO
    THE WHEEL -- the owner: "are there any quick wins when it comes to freeing
    up memory? It happens too often that the screen goes black":
    - `mp-gpuaudit` (and `window.__btGpuTex()`, pixiApp.js) names what the GPU
      holds and what the asset cache keeps undrawn, with the peaks on the way in
      and on a death's trip; `QA_GA_THUMBS=N` pictures the unnamed canvases;
    - the way in, a death, a dungeon's way out and the farm's all stop in
      today's town under one veil, and each loaded its NPCs and buildings (35 MB
      decoded) and its map (11.3 MB) for nobody: now `townSkippedOnTheWay()`
      (wheelHome.js) keeps them off the loading screen, the login splash's
      warm-up, syncTownScenery and the tileRenderer's map fetch; a trip that
      lets go loads town as before; the way in's GPU peak 114 -> 88 MB (no
      spike over where it settles), the cache's 184 -> 172; mp-gpuaudit fails
      if either trip holds the map;
    - the bigger wins and what each costs: docs/specs/memory-in-the-wheel.md.)
  `docs/WORLD-BIBLE.md` (that world's story and look — through-lines,
  region/border briefs, the Main Street Brotown plot table, the style key,
  the character-refresh order; a DRAFT the owner is reacting to, and
  `public/tools/world/plan.js` wins where they differ, v2.3.2931; its §6
  is the ART LAW since v2.3.2935: the owner chose **HD pixel art**, kept
  since v2.3.2942 at **2 px per game px** (the phone's own sharpness; the
  old 1.5 game px grid shrank ChatGPT's pictures and stretched them back —
  "soft and gritty" — and ground swatches now cover 512 game px, laid by
  `composeGround` at `opts.scale` 3 while the plan's unit stays 1.5 game px),
  one frozen 128-colour palette (64 until v2.3.2940), no gradients or baked
  shadows/glow, quiet ground, ground baked from swatches — the numbers and
  prompt words live in `public/tools/style/bible.js`, and every picture
  goes through `public/tools/style/process.js`; since v2.3.2939 every
  material is drawn as itself (`MATERIALS`, the owner's "material-aware
  texturing"), since v2.3.2944 nothing in a ground swatch runs one way
  (`NO_DIRECTION`: the owner's Main Street ruts tiled sideways, because a
  swatch is laid the same way up whichever way a road runs), and the STYLE KEY is the only picture any chat is matched to —
  NEVER attach the bro: he is simpler pixel art than the world and ChatGPT
  copies what it sees, so sizes are given in words (`personScale`) and he is
  only the size check in previews),
  `docs/STYLE-TEST.md` (the art-style test the owner ran in the Style Lab
  at `public/tools/style/` — six looks round the real bro, scored, v2.3.2934;
  decided v2.3.2935, and the lab's "HD pixel art (chosen)" look is now the
  place to check a picture at game size),
  `docs/WORLD-ARCHITECTURE.md` (the long-run TARGET for the seamless,
  many-room world: one home per piece of state, maps not zones, cells and
  interest, a character vault per player, one market settling by mail, the
  art pipeline, build order; ARCHITECTURE-HANDOFF still governs today's
  code, v2.3.2934; §11 is the cost and capacity plan, v2.3.2936: about
  0.1¢ per player-hour, a room is limited by INCOMING MESSAGES (~500–1,000
  a second per Durable Object, today's phones send 15–30 each), so the fix
  is a ~5 Hz message diet plus each world split into 11 area servers along
  the Wheel's spokes, not more small rooms; v2.3.2938 adds the bill at 100
  to 100,000 monthly players, about $5 to $1,100–2,800 a month, and the
  owner's business model: free play capped at 2 h a day, a $2-a-month
  supporter pass for unlimited — the server counts the hours, and logging
  every room message would cost more than the game),
  `docs/specs/*.md`, `docs/WIRE-PROTOCOL.md`, `docs/BALANCE-PLAN.md`,
  `docs/OPTIMIZATION-ROADMAP.md`, `docs/REBUILD-PLAN.md` (client
  decomposition), `docs/STATE-SCHEMA.md` (client S object; pre-dates
  v2.3.1116 — trust for shape, not for the new systems).
  Content-facing systems found in code may also be dormant
  (collectibles) — confirm with the owner before building on one.
  `docs/WORLD-DEPTH-PLAN.md` is the owner's world ART CONSTITUTION and is
  INTENT, not description: it asks for things the renderer cannot do yet.
  Never read it as evidence a feature exists; work from
  `docs/DEPTH-ROADMAP.md`, which costs it against the actual renderer.
  (Dynamic occlusion WAS the headline example here and no longer is —
  it shipped v2.3.2633–2635, `src/rendering/depthSort.js`. So did the
  near-camera FOREGROUND layer this note used to call missing (roadmap
  item 5): `'foreground'` in `WORLD_LAYER_NAMES`, v2.3.2655 -- corrected
  v2.3.2999, found by the elevation study, docs/ELEVATION-PLAN.md.)

The server previously lived in a separate `brotown-server` repo, now
archived. Do not push there or build patches against it.

## AI session protocol (v2.3.1201)

Parallel AI sessions build this repo and used to collide — on
2026-07-07 five sessions claimed one version tag and two built the same
feature. A SessionStart hook now runs `tools/dev/session-brief.mjs`
(version high-water, next free `v2.3.N` tag, in-flight `claude/*`
branches): claim ONE tag above high-water, check the branch list for
your topic first. Run `node tools/dev/precheck.mjs` before EVERY push —
it is the fast local gate (syntax, dup switch cases, tag collisions,
storage-key registry, server suite).

**AGENTS AND WORKFLOWS DIE SILENTLY. CHECKPOINT OR LOSE IT (owner
directive, 2026-09-10).** On 2026-09-09 four investigation workflows stopped
at ~22:47 and were reported as "still running" for three more hours. Two of
them had produced NOTHING and their work was lost entirely — the owner paid
for it twice. Rules, because this is money and time:

- **Never infer liveness from output.** A journal with no new results looks
  identical whether the agent is thinking or dead. Check the **mtime** of
  `subagents/workflows/<run>/agent-*.jsonl`; if nothing has been written in
  ~15 minutes, it is dead, not busy. Say so.
- **Make agents checkpoint.** Long investigations must write findings to a
  scratch file **as they go**, not only in a final structured return. A dead
  agent's return value is lost; a file on disk is not.
- **Run ONE heavy workflow at a time.** This box has 4 vCPUs and every UI
  scenario spawns a wrangler worker plus a Chromium. Four concurrent hunts
  plus local test runs is what killed them, and they left **48 orphaned
  chromium/workerd processes** behind.
- **Reap stragglers** (`pkill -f workerd; pkill -f chromium`) after any
  workflow that drove browsers, and check `ps` before starting another.
- **Resume, don't restart.** `Workflow({scriptPath, resumeFromRunId})`
  replays completed agents from cache. Read `journal.jsonl` first to see what
  actually returned before re-running anything.

**`npm install` WORKS in this sandbox (verified 2026-08-03).** This file
said for a long time that it was blocked, and that claim was load-bearing
in the wrong direction: it is why client changes were treated as
unbuildable and unverifiable, and shipped on reasoning alone. They are
not. `npm install && npm run build && npx vite preview --port 4173` all
run, `playwright-core` drives the Chromium at `/opt/pw-browsers`, and
`cd server && npx wrangler dev --port 8787 --local` gives you a real
worker on localhost. That means a client change CAN be smoke-tested here
before it ships — see `tools/qa/qa-ui-shots.mjs` (captures every menu)
and `tools/qa/qa-move-rate.mjs` (drives two real clients against a real
worker). Do not re-add the "blocked" claim without re-testing it.
What is NOT reachable is the open internet: the agent proxy denies
`*.pages.dev` and the production worker, so test against localhost.
Maps keyed by client-supplied ids must be `Object.create(null)` or
`Map` — plain `{}` silently no-ops on `'__proto__'` (fixed 3× in one
day: duel.away v2.3.1175, party meta v2.3.1185, amulet tiers
v2.3.1192). Details: `docs/DEV-TOOLS.md`. Before review or any "fix"
of old behavior: run `/repo-review` (adversarial multi-angle protocol,
`.claude/commands/repo-review.md`) and check `docs/TRAPS.md` — the
registry of plausible-but-wrong moves (v2.3.1204).

## Deployment (important)

- **Client:** Cloudflare Pages builds `main` automatically →
  production site. Every PR gets a preview URL posted by the Pages bot.
- **Server:** `.github/workflows/deploy-worker.yml` runs
  `wrangler deploy` from `server/` on any merge to `main` touching
  `server/**`. Requires the `CLOUDFLARE_API_TOKEN` repo secret.
- **NEVER deploy the worker from a local machine.** A laptop deploy of
  a stale clone on 2026-06-10 rolled back three weeks of server work
  and broke combat in production (the reason this repo is a monorepo).
- Rollback: Cloudflare dashboard → Workers & Pages → brotown-server →
  Deployments → rollback. Player data lives in Durable Object storage
  and survives deploys/rollbacks.
- A worker deploy briefly disconnects live players (clients
  auto-reconnect) and cold-starts the room: the first join after a
  deploy may retry its loading screen a few times. One-time per
  deploy; not a bug. Prefer merging server changes at quiet hours.

## Wire protocol

Two protocol versions coexist; both must keep working:

- The client sends `protocolVersion: 2` in the `join` message.
- v2 sessions get: delta `player_state` (changed fields only,
  no-change emits skipped), per-entity monster/node tick deltas,
  merged `zone_state` on zone change.
- v1 (anything that doesn't opt in) gets: full `player_state`
  snapshots, full dirty-zone entity lists, and the legacy
  `zone_monsters`/`zone_nodes`/`zone_loot` trio.
- The client keeps v1 handlers as fallback so it works against any
  worker version. Preserve this on both sides — it is the safety
  property that makes client and server deployable in either order.
- Server is authoritative for damage, HP, loot, XP, inventory, coins,
  quest progress, and ALL economy settlement (market/trade/duel — see
  `docs/ARCHITECTURE-HANDOFF.md`). Client damage popups are local
  prediction; `monster_hit` from the server is the truth. New
  client→server events must be denied by default unless added
  deliberately, and every server-EMITTED event type must be added to
  `PRIVILEGED_EVENTS` in `server/src/index.js` or clients can forge it.
- Deploy-order safety: servers advertise capabilities in
  `state_sync.caps` (WS) / `settled: true` (HTTP); clients gate their
  legacy paths on them. Preserve this on both sides.
- Identity: stable per-browser `bp_` ids from a silent passphrase
  (`bt_passphrase`); two tabs share one identity by design — test
  multiplayer with `?guest=1` on the second tab.

## Testing

- Server: `cd server && npm test` — twenty zero-dependency suites
  (protocol-v2, anticheat, combat-lifecycle, identity, inbox, market,
  trade, quests, duel, gamble, clans, arena, dungeon, sponsorship,
  guilds, threat, pets, hardening, trade2, elemental2; 450+
  assertions) against a mocked DO storage. Every new system adds a
  suite; extend the nearest one when touching its wire format.
- Client: no unit suite; CI runs lint + build on every PR, and the
  Pages bot posts a preview URL. The Playwright smoke harnesses
  (`tools/qa/qa-smoke.mjs`, `qa-facing.mjs`, …) are OFF the PR path
  (owner directive, 2026-07-16 — no live players, CI speed wins) and
  run only via workflow_dispatch on demand. Primary platform is
  **iPhone Safari** — test touch controls, not just desktop.

## Conventions

- **Animation preloading is LAW (owner directive 2026-07-19, after
  repeated first-use-hitch reports).** EVERY animation/sprite asset
  must be fully loaded during the loading screen, before the intro
  overlay lifts — the loading screen is explicitly allowed to take
  longer instead. The intro gate is `preloadPlayerAssets()`
  (`src/rendering/pixiRenderer.js`), which awaits the central manifest
  `preloadWorldAnimations()` (`src/rendering/preloadAnimations.js`).
  Any NEW animation system MUST register its loader in that manifest
  in the same PR. Lazy "load on first sighting/use" patterns
  (`ensure*Loaded` guards, ctor-kicked unawaited `Assets.load`) are
  BUGS unless the asset genuinely cannot be known at load time (e.g.
  a remote player's arbitrary recolor). The owner has flagged this
  multiple times — treat any first-use texture load as a regression.
  - **ZONE-ASSET EXCEPTION (owner directive 2026-07-20, "per zone
    loading instead of one long pregame loading screen", v2.3.1405).**
    The game was "wonky with RAM" on iPhone because the gate above force-
    loaded ALL zone-specific art up front (12 zone maps ~48MB + every
    monster variant + the frost snowman), stacking ~60MB onto the
    startup peak for assets you don't use in the zone you're standing in.
    Those THREE categories (FIVE since v2.3.2596's zone banner and
    v2.3.2651's decor props) now load PER-ZONE via `preloadZoneAssets(zoneId)`
    (`preloadAnimations.js`) behind a brief per-zone loading overlay on
    zone entry (`src/game/zoneTransitions.js`, the `S._zoneLoading` gate),
    and the previous zone's ~4MB map is freed on exit (`freeZoneMap`,
    `tiledMaps.js`; worldview stays resident — town's map, NPCs and
    buildings free too since v2.3.2859, veiled back in by
    `zoneTransitions.syncTownScenery` however you arrive). This does NOT
    weaken the law's real intent — the per-zone loads are AWAITED behind
    an overlay (a deliberate loading SCREEN, not an unawaited lazy
    `Assets.load` that hitches mid-play). Everything else — player, town
    map, slime, all fx/skill/attack strips, head traits, fullset figures
    — still preloads up front on the gate. If you add a new PER-ZONE
    system, register it in `preloadZoneAssets` (not the global manifest)
    and free it on exit; anything global still registers in
    `preloadWorldAnimations`. **And whatever DISPLAYS it must drop its
    texture reference on the way out, not merely hide it** — v2.3.2651:
    the prop sprites hid but kept `spr.texture`, harmless while all prop
    art was global, and once decor was actually freed the second visit to
    a zone rendered a destroyed source ("Cannot read properties of null
    (reading 'alphaMode')", caught by mp-zonechurn).
  - **THE WHEEL'S LOOKS-AS-YOU-WALK CLAUSE (owner yes, 2026-10-02: "Yes
    only load as you walk towards it", v2.3.2989).** In a zone with `homes`
    (the Wheel) the monsters' looks are NOT loaded behind the overlay: each
    monster type's look loads when one wearing it is within 2,600 px and
    goes once none has been within 3,600 px for 10 s
    (`src/rendering/wheelMonsterArt.js`) -- since v2.3.3017 only for the
    land you are on (`wheelLandAt`, your direction from the middle); another
    land's inside the screen's box grown 700 px a side (`foreignBox`, 1,000 at
    least): the spokes' inner ends are ~1,630 px apart across the water, and
    at the Flame Fields four looks (~57 MB) were held, near iPhone Safari's
    ~250 MB, where the owner's screen went black. The law's intent is kept by a
    harder rule in its place: there a monster whose look is not ready is
    NOT DRAWN AT ALL -- never in a stand-in body -- and holds no display,
    and the lazy first-sighting kick is off (`setVariantKicks`). The Wheel
    arrives with no monster looks (~176 MB of textures, was 241). This
    clause is the Wheel's only: every other zone still awaits its monsters'
    art behind its overlay.
- Code comments carry version tags (e.g. `v2.3.694:`) explaining WHY a
  change exists, often with incident history. Match this style; the
  comments are the project's institutional memory.
- `package.json` version tracks the client version loosely; comment
  tags in code are the finer-grained record.
- The repo owner is new to coding: PRs should be self-contained,
  explained in plain language, and mergeable with one button press.
  Avoid asking them to run terminal commands; prefer doing work in
  sessions and shipping reviewable PRs.

## Known history (June 2026)

- PR #10: client protocol v2 + fixes (beard z-order, remote-player
  facing flip, masked-body-frame prewarm, charge-pie dasharray).
- PR #12: server moved into `server/`, protocol v2 server side,
  auto-deploy workflow.
- The charge-pie "blue static" fix addressed exponent-notation
  `strokeDasharray`; if grainy noise on the pie is ever reported
  again on iOS, the next suspect is the CSS `drop-shadow` filter
  compositing over WebGL.
