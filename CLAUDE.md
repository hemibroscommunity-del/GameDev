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
  `docs/MEMORY-PLAN.md` (what the phone holds -- sound, canvases, heaps, not
  only textures -- what leaked, and the order of the memory work with each
  item's status, v2.3.3075; `mp-memledger` measures it),
  `docs/FUN-SOCIAL-PLAN.md` (the owner's fun & social plan checked against
  the code, v2.3.3391 -- "Go recommended": emotes and dances that move the bro
  in code, two-player moves, farm-made toys, a playground town; its rules: a
  pose that lasts is STATE on the player (TRAPS §176), social messages get an
  allowance of their own, anything earned is stored and checked on the server,
  no new always-on button; Phase 0's emotes you can see -- the chat box's
  smiley or B, an emoji over the head, a quick line as the bubble, only the
  listed ones relayed and placed near the sender: docs/specs/emotes.md,
  `emotes` suite, `mp-emotes`; and since v2.3.3392 Phase 1's twelve MOVES --
  wave, laugh, flex, shrug, facepalm, cheer for a moment (the `emote` relay's
  `{move}`), sit, sleep, flop and three dances held until you move (`pose
  {id}`, kept by the worker as `ps.po` and sent as the tick's `po`, ended by a
  real step: server/src/poses.js) -- the whole bro tilted, squashed or hopped
  in code ABOUT HIS FEET after the depth pass (src/rendering/emoteFx.js, the
  curves and the math src/game/emoteMoves.js), his HUD given the inverse so
  the name plate never tilts and only comes down with a sitter or sleeper;
  the picker's Moves tab and `/wave`, `/sit`, `/dance` in the chat;
  `caps.emotemoves`, kill switch `emotemoves: false`; `emotes` §5-7,
  `mp-emotemoves`: docs/specs/emote-moves.md; and since v2.3.3393 `/roll`
  (1-100, `/roll 20`) and `/flip` ROLLED BY THE WORKER (server/src/dice.js:
  crypto, no modulo bias, one every 5 s, `dice_roll` PRIVILEGED, placed near
  the roller and muted with chat), a chat line in the roller's name and the
  number as their bubble; `caps.dice`, kill switch `dice: false`; `dice`
  suite, `mp-dice`: docs/specs/dice.md; and since v2.3.3394 YOUR PET AND THE
  TOWNSFOLK JOIN IN -- a pet copies its player's held pose, Lil Bro copies the
  nearest player, Blacksmith Bro flexes back, Diego, Ace and Mayor Bro have a
  word (src/game/townsfolkReact.js, this phone's own; emoteFx.js
  `_updateFollowers` moves each one picture about its feet);
  `townsfolk-react` suite, `mp-joinin`; and since v2.3.3395 HALLOWEEN WEEK,
  24 October to 1 November by each phone's calendar (src/game/season.js,
  `?halloween=1|0`; a look, never a rule): the Zombie Shuffle, a thirteenth
  move the worker keeps any day, pumpkin-coloured speech bubbles drawn in
  code, Diego's "No zombies in my store!"; `season` suite, `mp-halloween`:
  docs/specs/halloween.md),
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
    stopping within 600 px of them (since v2.3.3320 on the long Wheel: where
    they begin, `firstR`, below). Nowhere for any-zone gathering. Every
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
    - since v2.3.3206 THE BOW SHOOTS THEM, buildings included -- the owner:
      "Make the bow able to shoot at any props including buildings":
      - the bow's sight gate (v2.3.2473) asked about monsters alone, so held on
        a prop the bow never loosed. `firstSightHit`'s `ground` (your boots)
        now finds the prop on the arrow's own ground track: the gate opens,
        the line stops at its face (`id` `prop:<oi>`), a monster in front of
        it or standing in its box still wins, the farm's edge never counts,
        nor a prop past the screen's edge, where a plain arrow comes down
        (`ground.len`, monsterCombat `_viewEdgeDist`);
      - EVERY SHOT IS JUDGED AT THE SHOOTER'S BOOTS: the game's shots carry
        `_gdy` (combatHelpers `shotGroundDy`) and projectiles.js asks the
        ground at the drawn point minus (`_ox`, `_goy`). At the chest, point
        blank started inside the Town Hall's footprint and flew through, and a
        level shot ran 52 px behind a trunk. A hand-made arrow without `_gdy`
        keeps the old meaning, so the prop scenarios still mean what they say.
        Peers' shots are judged at THEIR boots (visualSystems), and a duel
        target's rock test at theirs;
      - a hit is SHOWN on the picture, lifted the height it flew but never above
        0.7 of it (`propHitHeight`; footprints carry `h`, the farm's none);
      - a new arrow takes the grip as its offset from you (`_bowGripDX/DY`):
        the absolute was where you last shot, and on a slow frame the first
        arrow after a walk left from there;
      - SHOTS FLY OVER LOW THINGS -- asked whether a bench right in front of
        you should catch your arrow, the owner: "I want arrows to fly over low
        things": low is what you can jump (jump.js `JUMP_OVER`, by footprint
        id, the jump's own test), and every game shot -- arrows, bolts, both
        specials, the retreat shot, a peer's -- flies over one unless it is
        what the shot is AIMED at: nothing else (monster, duel target,
        anything tall) on the line within reach, the sight's `low` answer.
        The shot carries it as `_lp` (a ground point in that footprint; the
        relay's `lp`, so other screens agree), `shotSkip(lp)` is the skip
        handed to `sweepBlockPoint` / `attackBlocked`, and the staff, with no
        sight, asks `lowAimAlong`;
      - `mp-bowprops`: docs/specs/bow-at-props.md.
    - since v2.3.3230 A BUILDING YOU KEEP HITTING CATCHES FIRE -- the owner:
      "add flame effects on the building after getting hit a while in the
      location where the building is getting struck and make the flames grow
      higher the closer it gets to falling apart. Keep the flames going as the
      building in pieces": `src/rendering/buildingFire.js`, owned by
      WheelObjects, fed each building's `hit`/`break`/`repair` and the new
      `heal` (wheelBreak.js: a count forgotten after `HEAL_MS`, `?healms=`,
      used to say nothing); hits within 40 px are one spot (5 at most), it
      smoulders from 12% of its hits and catches at 25% there, a cluster of up
      to ten of the CAMPFIRE'S OWN pixel flames a spot (campfireFx
      `campfireAtlas()`: nothing loaded or made) climbing the wall as the
      damage grows, sparks, smoke, coals, glow and soot; it sinks from 12 s
      and is out at the heal; at the break nine shards fall burning, lie
      charred (wheelShatter `burnt`) and burn on until the mending; each fire
      rides what it burns on (depthSort `_ridesOn`), hidden off the screen;
      `?nobuildingfire`; `mp-buildingfire`: docs/specs/building-fire.md.
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
    - since v2.3.3149 the shadows GLIDE WITH THE WORLD -- the owner: "the
      shadows look a bit flickery when you move on some of the props": the
      layer's filter draws at CSS resolution (three device px a texel on an
      iPhone) and each frame redrew every shadow at a new fraction of that grid
      as the camera slid, so a shadow crawled against its prop; it is now drawn
      on a grid locked to the world and slid back by the camera's fraction in
      the filter (shadows.js `lockToWorldGrid`, `uShift`), same texture and
      cost, ~5x steadier; a full-resolution pass would be ~32 MB of graphics
      memory (TRAPS §141); `?shadowlock=0` is the layer as it was;
      `mp-shadowlock`.
    - since v2.3.3338 THE SHADOWS ARE DRAWN UNSNAPPED, AT HIGHP -- the owner,
      again: "prop shadows right now still flicker as you run around": inside
      the shadow filter Pixi's roundPixels snapped every corner to a grid 0.77
      x 0.83 of a texel (it rounds by the pooled power-of-two texture's size,
      not the frame drawn into), so every whole-pixel crossing of the camera
      re-snapped each shadow differently; and on an iPhone the filter read its
      picture at mediump, a half float, so the lock's slide moved in quarter-
      to half-texel steps. The pieces are drawn unsnapped (`installNoSnap`,
      `_btNoSnap`; the batcher hook clears roundPixels after sharpPixels' and
      the palette's) and the filter is `highp`; `?shadowsnap=1` /
      `?shadowhp=0` put each back, `window.__btShadowSnap()`; mp-shadowlock
      now steps a whole CSS px across and down: 110x and 6x steadier (TRAPS
      §205).
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
    - since v2.3.3248 A FAR DEATH, SLAM OR BLAST IS NOT HEARD OR FELT -- the
      owner, on the logged loose ends 21/22: "Go recommended": the Wheel is
      one zone, so every monster's death sound, every landed slam's shake,
      camera kick and beep, every wind-up's and miss's beep, every bow
      special's blast and every slime's burst reached every phone in it; each
      now goes by distance on the hits' curve (`earVol`), a death in full when
      you helped kill it (`deathVol`, the worker's recipients stamped as
      `_killMine`), a wind-up by the nearer of its caster and its aim, your
      own blast in full; `BT_AUDIO.monsterDeath(arch, opts, k)`; kills still
      go to every phone; `mp-farfeel`: material-hit-sounds.md "A far death,
      slam or blast".
    - since v2.3.3340 FOUR MONSTERS HAVE A NOISE OF THEIR OWN -- the owner's
      recordings: the fire goblin's rawr, the skeleton's (the mummy's second
      form's) rattling bones, every slime's jelly bounce, the snowman's snarl
      (`tools/audio/cut_monster_noises.py`, about a second each, levelled to
      0.75 of a melee hit, SFX_MANIFEST); heard as one notices you (the "!"'s
      own `tg` edge, wsClient), now and then while it chases you, and as a
      mummy sheds; never twice in 6 s for one monster nor 0.9 s apart for any
      two, by distance on `earVol`; `NOISE_OF` (game/monsterNoises.js) spells
      every name out -- the mummy and the wisp are `fodder` underneath, and a
      fallback gave them the slime's bounce; `mp-monsternoise`:
      docs/specs/monster-noises.md.
    - since v2.3.3343 THE MISSING SOUNDS FROM RECORDINGS ALREADY HERE -- the
      owner, on the list of missing sounds: "Start adding the have ones then
      give me the list of ones that are still needed afterwards":
      - 112 cues, each slices of SFX_MANIFEST files (nothing new to load or
        decode): `src/data/eventSounds.js` says WHAT (`[key, offset, duration,
        vol, rate, delay, fade]`, `_playLayer`'s layer), `src/game/
        eventSounds.js` WHEN and HOW LOUD -- `cue(name, k)`, `cueAt` (by
        distance, earVol), `cuePeer` / `peerShare` (another player's at
        `PEER_K` 0.5 of yours, at most `PEER_BURST` 4 in 200 ms; footsteps
        their own budget, `peerStepShare`), `peerOwn` (what sounds as YOURS
        does -- the sprint's push-off, a swimmer's splash and strokes --
        played from BT_AUDIO's own tables, never copied into the cue table),
        `CUE_GAP_MS` for the ones a pack fires at once; `window.__btCues`;
      - a rush of air is the ARROW'S FLIGHT, never the special swipe (half a
        body's thump under 400 Hz: the owner's "fleshy" sprint, v2.3.3336);
      - the beep()s that played nothing (shield, door, weapon swap, quest
        taken, parry, wind-ups, campfire...) are sounds; a dodged blow is a
        rush of air, no clang, shake or red sparks; monsters' throws, deaths of
        their own (`DEATH_CUES`; the slime-sheet looks no longer die twice,
        `SLIME_SHEET_DEATHS`), crits, the bow's draw, crafting, the reveal,
        dungeons, No man's land, the market, and other players' steps, swings,
        shots, rolls, jumps, shield, swimming and gathering;
      - the river, Bro Pond and the falls heard on their banks
        (`src/game/waterAmbience.js`, its own loop on the music bus, never
        startSfxLoop -- the fishing loop of that sample is stopped every frame);
      - still needed (new recordings): docs/SOUND-GAPS.md; `sound-cues` suite,
        `mp-soundcues`, `mp-cuelevels` (renders every cue: no clipping, the
        levels the comments promise), `mp-farfeel` reads the cues now.
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
    - since v2.3.3106 the button is JUST NORTH OF THE ATTACK DISC (the owner:
      "near the right joystick instead of the left maybe just north of it",
      then "Above, fights move up"): `sprintAnchor` centres it over the disc,
      or sideways steps it left of the Wheel's minimap (`SPRINT_MAP_CLEAR`);
      `rightCluster` puts Special and Whirlwind a row above it upright and
      beside it sideways, half a button clear; mp-sprint, mp-abilslot.
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
    Since v2.3.3108 the words are back UNDER THE MINIMAP, on a NAME PLATE --
    the owner: "move the zone name and level band beneath the minimap but I
    want to reduce the size of the minimap to make room for it", choosing the
    shorter rectangle: the box stays 132 x 132, the map's window ends at
    `MAP_BOT` 92 and the frame's slate runs on below as the plate (Pixi, so
    it layers with the box): the land's element icon (the signposts'
    textures, `landIconTexture`) and name in its colour, fitted down to the
    11 px floor, over the level band in gold or "safe" at home (No man's land
    is its own badge, v2.3.3107); the stage's name did not fit and stays on
    the world map;
    the top bar says "BroTown"; a land's banner docks into the plate
    (`window.__btWheelPlate`, zoneBannerOverlay.js titleRect); the probe's
    `plate`: WORLD-MAP-PIPELINE "The name plate under the minimap".
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
    - since v2.3.3092 SMELTED BARS MAKE ARMOR -- asked "Should smelted bars
      make armour?", the owner: "Yes": iron and black steel bars smelt too
      (Smithing 5 and 10, `SMELT.RECIPES`, icons by `tools/make_bar_icons.py
      iron blacksteel`), and the Blacksmith's ARMOR tab forges a torso or
      greaves (4 bars each since v2.3.3141) in each metal -- copper Smithing 1, iron 5, black
      steel 10 (`server/src/armorforge.js` `ARMOR_FORGE.RECIPES`, mirrored by
      items.js `ARMOR_FORGE_RECIPES`): the drop's own piece `{name, mat, slot,
      tierMult, quality}` on the armour ladder (1/2/3, no gearBase or type),
      minted into the ledger (src 'forge'), into the bag by
      `forge_armor_result` (wsClient `_applyLootCredit`); black steel's art
      rows at last (gearVariants.js); `caps.armorforge`, kill switch
      `armorforge: false`; `armorforge` suite, `mp-armorforge`:
      docs/specs/armor-forge.md.
    - since v2.3.3141 FOUR BARS A PIECE, AND SALVAGE -- the owner: "all items
      like iron armor, bronze armor, etc should be salvageable at the
      blacksmith for 50% of the bars it took to make them ... chest, legs, and
      sword each take 4 bars ... If you salvage them you get 2 bars back", and
      a Rare/Elite/Godly piece's "essence ... use it on whatever same tier
      armor or weapon you want":
      - copper, iron and black steel torsos, greaves AND swords/greatswords
        take four of their metal's bars (armorforge.js; data.js
        BLACKSMITH_TIERS `bar`/`bars`/`xp` on copper, iron and `steel`, which
        replace their `oreCost`; the gold stays); a sword pays the armour's
        XP for the same bars (800 / 1,200 / 1,600); wood and the metals past
        black steel are unchanged;
      - the Blacksmith's SALVAGE tab (`server/src/salvage.js`): a CARRIED piece
        of those metals -- armour by its ledger id through `_gearSellable`
        and `_gearProvTake` (the auction house's own gate and escrow step:
        minted, held, not worn, not in the mail), a weapon from the weapon bag
        by index AND signature (`weaponSig`) -- gives back 2 bars; two taps
        ("Sure?"); legacy pieces (no id) cannot be salvaged, as they cannot
        be sold;
      - a Rare, Elite or Godly piece also leaves `essence_<grade>_<metal>`
        (nine bag items, icons by `tools/make_essence_icons.py`, priced by the
        shopkeeper at 1,500 / 8,000 / 250,000); an essence raises a carried
        piece of ITS metal whose grade is lower to its grade -- for armour the
        ledger row's `p.quality` (`_gearProvSetQuality`), so the next join
        rebuilds it so;
      - `smith_salvage` / `essence_apply`, answered by `smith_salvage_result` /
        `essence_result` (PRIVILEGED; src/game/salvage.js splices or regrades
        the browser's own armour lists); `caps.salvage`, kill switch
        `salvage: false`; `src/data/salvage.js` mirrors the rules
        (mirror-audit); `salvage` suite, `mp-salvage`:
        docs/specs/salvage.md.
    - since v2.3.3038 a resource's LEVEL IS A REAL REQUIREMENT (owner: "black
      steel now requires a mining level of at least 5 ... Fishing clownfish
      required fishing level 5", "in levels of 5"): `GATHER_REQ_LVL`
      (server/src/gathering.js, mirrored in src/data/lifeSkills.js, pinned by
      mirror-audit) -- copper/iron 1, black steel 5; minnow 1, clownfish 5,
      trout 10; pine 1, softwood 5, hardwood 10 -- keyed by type and TIER, not
      the tier itself; the worker refuses extraction_start and node_strike
      below it ('skill-too-low'), the client never asks for one (`gatherNeed`;
      since v2.3.3059 a TRY, below), the quest's road skips locked nodes;
      `caps.gatherreq`, kill switch `gatherreq: false`;
    - since v2.3.3040 every resource you hold the tool for wears a LABEL
      (src/rendering/nodeLabels.js): the bag's hatchet/pickaxe/rod picture
      (preloaded), its bag name and the level it asks, red while yours is
      below, 20 CSS px at any zoom, over the crown/rock/school, hidden while
      its harvest bar is up; the old emoji, tier dot and 7 px tips are gone;
      and a vein CRACKS on its split frame (`ore-crack`, cut from the unused
      extract-success.mp4); `mp-nodelabels`;
    - since v2.3.3094 PAST LEVEL 20 TOO (the owner: "levels 21-40 in each
      land with their own monsters and resources"): tier 16 at levels 21-30
      (titanium ore, cedar, salmon) and tier 21 at 31-40 (obsidian ore,
      maple, pike) -- the bake's `deep`/`deeper` bands, 259 nodes;
      `GATHER_REQ_LVL` 16/21 (Mining 10/15, Woodcutting and Fishing 15/20);
      titanium and obsidian ARE the forge's next metals' ores, cedar and maple
      the bow bench's woods; client `MINING_TIERS` 16/21 renamed to match (36
      is Diamond Ore now); art from `tools/make_tier_art.py past20`; every
      three-tier table five: wheel-resources.md "Past level 20";
    - since v2.3.3059 the labels are QUIETER and a locked node can be TRIED --
      the owner: "show zeroes popping as they try to harvest ... a grayed out
      icon ... I just don't want the screen to be too busy with text": every
      node shows its tool alone on a dark disc, GREY when your level is short
      (`NODE_LABEL_ICONS_GRAY`, greyed at load, no filter), and only the
      nearest within 260 px (`nodeNameNode`) says its name and level; a tap,
      the button or E on a locked node seats you and swings three times, a 0
      off it on each blow and "Requires Fishing Lv 5" over it, then ends by
      itself (lifeSkillRewards.js `_startLockedTry`, `ex.locked`) -- NOTHING
      is sent to the worker; `__btLockedTries`; docs/specs/wheel-resources.md
      "Quieter labels, a grey tool, and a try you can watch fail".
    - since v2.3.3145 a resource you hold no tool for STOPS NOBODY -- the
      owner: "there are invisible areas that block movement near the town":
      it is not drawn (v2.3.1680) nor on the minimap, but its rock or trunk was
      still solid (BroTown.jsx `nodeBlockEllipse`), and "Learn a Trade" hands
      you the hatchet and the rod, not the pickaxe, so the commons' six copper
      veins round BroTown were rock-sized walls of empty grass; solid again
      the frame the tool reaches the bag (TRAPS §140); `mp-unseenwall`.
    - since v2.3.3146 NO ROD OVER THE FISH -- the owner: "Remove the fishing
      icon above fish but leave the proximity based nameplate in place": a
      fishing spot shows no tool's disc, only its name plate while it is the
      one near you (nodeLabels.js `NAME_PLATE_ONLY`); trees and veins as
      before; `mp-nodelabels` samples every drawn spot: wheel-resources.md
      "No rod over the fish".
    - since v2.3.3229 THE HIT LADDER -- the owner: "after the first level you
      get a 10% chance of hitting 1 number higher ... the number 1 will
      eventually get replaced by the 2 as more 10% chances get added with each
      level": every hit of a harvest or a cook is a ten-sided die read down
      from the skill level, `max(1, level - 9 + face)` (gathering.js
      `gatherHitRoll`, `GATHER_HITS.LADDER` 10; it was an even 1..level) --
      level 3 hits 1 eight times in ten, level 10 is as before, from 11 there
      are no 1s; slower than before below 10, faster above; Skills -> Mining,
      Woodcutting, Fishing and Cooking print "Each hit" and "At Lv N+1"
      (lifeSkills.js `gatherHitOddsText`; the old timer's Benefit line only
      when the worker rolls no hits); `caps.hitladder`, kill switch
      `hitladder: false` (1..level again); test lever `/dev/lifeskill`
      {skill | 'hits', level} and the test panel's level buttons; gather-hits
      §11, mirror-audit "hit ladder", `mp-hitladder`: docs/specs/hit-ladder.md.
    - since v2.3.3251 EACH TIER TAKES TWICE AS LONG AS THE ONE BEFORE -- the
      owner: "each tiers unlocks (lvl 5 required, lvl 10 required, etc) to take
      about 2x longer on average than the previous tier's lowest level
      extraction time ... determine all of those hp lvls per resource": a
      resource's HP by its type and tier (gathering.js `GATHER_NODE_HP`,
      `gatherNodeHp`; the game's copy in lifeSkills.js, mirror-audit), solved
      over the ladder's dice so that at the level it opens it takes 10, 20, 40,
      80, 160 hits -- copper 10, iron 20 (Mining 1 beside copper), black steel
      80, titanium 440, obsidian 1,680; pine/minnow 10, then 40, 220, 840,
      2,480 (was 5 x (tier + 1) for all); top tiers ~104 s of swings at their
      own level; `MAX_HITS` 40 -> 200 (= the game's `GATHER_PLAN_MAX`), a cook
      unchanged (its own HP and `COOK_MAX_HITS` 40); a planned harvest's
      monster shield runs from its window's opening; a harvest's running hits
      count as play for the 2-minute idle logout; `caps.nodehp`, kill switch
      `nodehp: false`; gather-hits §12, mirror-audit "tier hp", `mp-tierhp`:
      docs/specs/resource-hp.md.
    - since v2.3.3251 EACH TIER PAYS TWICE THE XP, AND XP FADES 5 LEVELS BELOW
      YOU -- the owner: "Yes adjust the xp.  Also make xp decay if you're
      trying to harvest lower level things.  This also applies to combat.  Xp
      should begin decaying starting at 5 levels below your current level.  It
      should always be most efficient to harvest or fight things within your
      current level":
      - a harvest's base XP by tier, doubling as its time does: 163, 326, 652,
        1,304, 2,608 (gathering.js `GATHER_TIER_XP`, `harvestBaseXp`; was 163
        to 913), so every tier pays ~22-30 XP a second at the level it opens;
      - the FADE (`server/src/xpdecay.js` `xpDecayMult`): full XP up to 4
        levels below you, a third at 5 below, 15% less each level past it --
        a harvest by your skill against the resource's `GATHER_REQ_LVL`
        (`_harvestXpPaid`), a fight by the trained skill the XP goes INTO
        (Melee/Bow/Magic) against the monster's level, never the character
        level (a sum), each damage source per monster (`_combatXpDecay`:
        swing, lunge/dash/bash/whirlwind, staff splash, burst, arrow blast);
        quest XP, cooking and the rest unchanged;
      - the two numbers are the gentlest that keep the rule: at every level
        1-100 of all three skills what is within your level pays the most XP a
        second, by 20% at least, and the newest resource most of all
        (gather-hits §13 checks it over the dice); past the top resources
        (Mining 20, the others 25) and the monsters (Lv 40) everything fades;
      - Skills -> the gather trio's "Full XP" / "Less XP" lines
        (skillsModel.js `skillXpFade`); the game's "+N Mining XP" is
        gameSystems.js `harvestXpFor`, held to the worker by mirror-audit;
      - a monster that pays reduced XP wears a GREY NAME PLATE -- the owner:
        "I like the idea of gray nameplate for reduced xp add that": a fifth
        band before green Low (entityRenderer `PLATE_BAND.faded` #A7B0B5,
        `plateBandFor`'s `fadeLevel`: the fade's own `xpDecayMult` < 1 against
        the held weapon's skill, against a worker with `caps.xpdecay`); and
        past the top resources and monsters everything pays less, the owner's
        call ("I'll add more content");
      - `caps.tierxp` (off with `tierxp: false` or `nodehp: false`) and
        `caps.xpdecay` (kill switch `xpdecay: false`); `xp-decay` suite,
        gather-hits §13, mirror-audit "tier xp"/"xp fade", `mp-xpfade`,
        `mp-monsterplate` (whose band sweep now raises the weapon's skill):
        docs/specs/xp-decay.md.
  - Since v2.3.3013 MONSTERS PAST LEVEL 5 -- asked "monsters past level 5 ...
    levels 6-20 in all eight lands (up to the first pass)", the owner: "Yes
    continue working on those items":
    - each land's next three stretches (tiers 2-4, levels 6-10, 11-15, 16-20,
      the rest of its first stage) have its own spawn list again, 6 a
      stretch: 144 more, 192 in all, ids `wm-<home>-t<tier>-<k>`, the first
      stretch's 48 unchanged and first in the list (wheelzone.js);
    - a monster's level is its stretch's by where it stands in it; its stats
      from the one copy of the math, `_makeZoneMonster(..., atLevel)`;
      rewards its home's; the first stretch keeps levels 1-2 (on the long
      Wheel it climbs 1 to 5 since v2.3.3320, below);
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
    - since v2.3.3093 PAST LEVEL 20 TOO -- the owner: "build the world past
      level 20 (levels 21-40 in each land with their own monsters and
      resources) You can just recolor existing monsters for now":
      `SPAWN_RULES.deep.tiers` 2..8, so every land's second stage (tiers 5-8,
      levels 21-40, past the first pass) has its spawn list per tier -- 384
      monsters, ~103 KB of `zone_state` on the way in; the game draws them in
      the stage's colour and name (`src/data/wheelStageLooks.js`: Glacier
      Snowman, Cinder Goblin, Gilded Mummy, Amethyst Golem, Storm Slime, Coral
      Fishman, Spectral Wisp, Shade Lurker, Jade Slime), a SPRITE TINT that
      REPLACES the look's own (no memory: a baked recolour would sit beside
      the first stage's look, ~50 MB at the Flame Fields), through
      entityRenderer's `wheelStageTint` / `wheelStageName`; a dungeon's
      monsters past 20 wear it too; kill switch `wheelpast20: false`; the
      signposts read "Lv 1–40"; `wheelzone` §1b/§4c, `mp-wheelpast20`:
      wheel-monsters.md "Past level 20".
    - since v2.3.3055 a monster's level MEANS SOMETHING -- the owner: "lvl 7
      killing lvl 17 slimes easily": the +100 flat HP was the same at every
      level (a Lv17 slime 118 HP, a Lv3 109); it now GROWS 10% a level from
      Lv3 (`MONSTER_HP_CURVE.flatRamp`, `monsterHpFlat`: Lv7 147, Lv17 380,
      Lv30 1,311) and damage 6.5% a level (`MONSTER_DMG_CURVE`, was three
      inline 1.045s); Lv1-2 unchanged; mirrored in gameSystems.js
      (`createMonster`, the Points scene's monster); the retired T2
      yardstick frozen (`t2BenchFlat`); a Lv7 now loses to a Lv17 slime;
      and since v2.3.3054 COMBAT LEVELS COME HALF AS FAST -- the owner: "slow
      it by about 50%": `PROG3.XP_PER_DMG` 0.4 -> 0.2 and every quest's xp
      halved on both sides (ceil); life skills untouched (the owner's 25x):
      docs/specs/pace-and-difficulty.md, `zones` / `mirror-audit` /
      `dungeon` suites; and since v2.3.3090 LIFE SKILLS COME HALF AS FAST TOO
      -- asked "Should life-skill XP slow down like combat XP?", the owner:
      "Yes": every level costs twice the XP (`LIFE_SKILL_XP_BASE` 500 -> 1000,
      gathering.js `_lifeSkillXpThreshold` and items.js, read by
      `skillXpRequired` and `LIFE_SKILL_XP`), every action's pay and "+n XP"
      unchanged, no level lost (the bar reads half as far along);
      mirror-audit "life-skill curve": pace-and-difficulty.md "Life skills".
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
  - Since v2.3.3056 A MONSTER YOU HURT FOLLOWS YOU ONTO SAFE GROUND -- the
    owner: "make it so monsters can still chase you out of their zones.  I was
    sitting in a safe zone just sniping mummies with magic and they couldn't
    attack": the safe ground shelters everyone except from a monster they
    PROVOKED (wheelzone.js `_wheelProvokedBy`: hurt it this life,
    `m.dmgByPlayer`, and dealt damage within `WHEEL.PROVOKE_MS` 10 s,
    `ps._lastDealtAt`, cleared on respawn); `_wheelSheltered` replaces the bare
    `_wheelSafeAt` at every gate -- the sticky target, the aggro scan, the hit
    choke point, telegraph.js's lunge/slam/burst and basic swing (now ABOVE
    the block branch), the storm arcs, burns/poisons, and burning ground (not
    gated before); a pursuit reaches `WHEEL.PURSUE_LEASH` 1,800 from home;
    bystanders who never hurt it take nothing; kill switch `wheelpursue:
    false`; server only: docs/specs/wheel-monsters.md "Provoked from the safe
    ground", `wheelzone` §5d.
  - Since v2.3.3299 A MONSTER NOBODY IS NEAR RESTS -- for the owner's "Maybe 5x
    larger map is needed" ("Rebuild for 5x"): five times the land is five times
    the monsters. A live Wheel monster outside the squares of `WHEEL.REST_CELL`
    1,600 px within `REST_REACH` 2 of every live player's (at least 3,200 px),
    with no target, wind-up, telegraph, snowball, burrow or fuse in flight,
    does nothing in a tick (wheelzone.js `_wheelRestTest`, index.js
    `_tickMonsters`); it still comes back to life on time and its statuses
    tick; only awake ones are swept apart. 384 with one player in town 335 ->
    116 µs a tick, 1,920 2.9 -> 0.5 ms; kill switch `wheelrest: false`;
    `wheelzone` §10: docs/specs/wheel-monsters.md "A monster nobody is near
    rests".
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
  - Since v2.3.3058 NO MAN'S LAND -- the owner: "Add a new 'No man's land'
    notification when you cross into zones with lvl 6+ monsters. It'll start
    at 1. This means any other player 1 level above or below you can attack
    you ..." (docs/specs/no-mans-land.md):
    - each land's Lv 6-10 ring is No man's land 1, the next 2, out to 15
      (`server/src/nomansland.js`, `src/data/noMansLandRings.js`,
      mirror-audit); the banner, a chat line, and (since v2.3.3107, the
      owner: "above the center of the dashboard ... instead of the top bar")
      a red skull and the number centred just over the band, riding
      `--sheet-h`, whose tap opens the rules in InfoPopup with your own
      skull's minutes (`src/ui/mobile/NmlBadge.jsx`; `--nml-lift` steps the
      interact prompts over it); the top bar names the stage again;
    - two players may fight when both stand in it, their `ps.level`s at most
      the LOWER of their two numbers apart, not one party -- `_nmlAllowed`,
      asked by `_pvpAllowed` before `OPEN_PVP`, which stays off elsewhere;
      a tap AIMS (`nmlCanAttack`, the lock's `nml`; tapping them again keeps
      it, empty ground lets go, and it lets go when the rule stops allowing);
    - a hit gives the attacker a RED skull, the one hit a WHITE one, 20
      minutes each of time ONLINE, reset per hit; hitting back the one who
      whitened you is no red; `nml_state:<pid>`, `nml_skull`, the tick's
      `sk`; every threat skull now drawn above the name plate, 18 px;
    - a death under the rule: the bag's items in a pile that is the KILLER's,
      spare weapons and spare armour/legs credited to them (`nmlloot:`, with
      the provenance row), the ids forfeited; worn gear, tools, quest items,
      shields, outfits and gold kept -- a stash copy of WORN armour, shields and
      outfits cannot be told from spares by the worker (storegear.js §2);
      a RED skull's death takes everything worn too, every shield, and the
      gold; `nml_loss` tells the game exactly what went (since v2.3.3316
      everything CARRIED goes, tools, ores and gold too -- below);
    - `caps.nomansland`, kill switch `nomansland: false`; dev vitals take
      `hp`; `nomansland` suite (51), `mp-nomansland` (15, two screens);
    - since v2.3.3091 SPARE SHIELDS GO TOO -- asked "Shields and outfits in no
      man's land?", the owner: "Yes": the game reports the shield on its arm
      (`shield_wear` {gid | sig | none}, src/game/shieldWear.js, on every
      change, every join and a new shield into the bag), and the worker keeps
      `ps.shield` as the shield WORN and `ps.shieldStash` the carried
      (server/src/shieldwear.js: only a piece it holds for you, nothing
      described, a copy never added twice); an ordinary loss takes the spare
      shields by the armour's rule once `ps._shieldKnown` (runtime only);
      outfits stay -- the wardrobe is the T-shirt and the plate's look, nothing
      to take; `caps.shieldwear`, kill switch `shieldwear: false`; the three
      no-man's-land mirror-audit checks run again (a merge had put them after
      the suite's process.exit): no-mans-land.md "The shield on your arm".
    - since v2.3.3253 ATTACKING A PLAYER IS A CHOICE -- the owner: "I want
      attacking other players to be intentional ... if a stray projectile hits
      a player a one time window pops up ... attack, party, or ignore ...
      Tapping on the player ... can still have the party and attack (with red
      skull) options":
      - a stray shot already hurt nobody (only your aim or duel is ever sent,
        v2.3.1302/1306); the TAP aimed at once, so a tap meant for the monster
        beside a player started a fight;
      - now a small window asks, "Attack <name>?", with the red skull and a
        tiny (i) (the badge's explainer): Attack aims (the old `nml` lock and
        "TARGET"), Party sends the party invite, Ignore (or 10 s) lets it go;
        it closes when they can no longer be fought (src/game/nmlAsk.js,
        src/ui/mobile/NmlAskCard.jsx);
      - raised by a tap on a player you could fight and are not aiming at
        (every time), and by one of YOUR shots passing through one -- once a
        player, never over an open window (projectiles.js `_nmlStrayShot`, the
        real hit test's capsule; the shot does them nothing);
      - HITTING BACK stays one tap: the worker's `nml_skull` now carries `by`
        (whiteBy), and a tap on the one who attacked you, with no red skull of
        your own, aims at once;
      - AT THE TOP, out of the thumbs' way: under the minimap (beside it when
        there is room), under a party invite card (`data-party-invite`),
        portalled to the body -- over the badge, its Attack sat where a left
        thumb steers;
      - in No man's land a fightable player under the finger beats the
        self-chat circle (BroTown `nmlPlayerAtClient`): at a sword's reach a tap
        on them opened your chat;
      - `?nmlask=0` is the game as it was; `nomansland` §3-4, `mp-nmlask`,
        `mp-nomansland` step 2: no-mans-land.md "Attacking is a choice".
    - since v2.3.3268 THE CHOICE LASTS, AND THE SHIELD IS THERE -- the owner:
      "I want attacks against real players to hit them even when not locked on
      target but only if you select the attack option that pops up on the
      window. I also want to be able to use shield for when battles happen
      against real players in no mans land":
      - the window's Attack, or a tap on the one who attacked you, records a
        FOE (`src/game/sparTargets.js` `chooseFoe`, from nmlAsk.js `nmlAim`),
        and to your weapons a foe is what a sparring clone is: the sword's
        auto target takes the nearest (an `nml` lock with `src: 'auto'`), the
        bow looses at one on its line, arrows and bolts that reach one hit
        them, a swing lands on each in its arc, locked or not, every claim
        naming them as `target` (a lock with `nml` no longer sends the swing's
        open cone claim); no worker change;
      - the choice LAPSES (forgotten; a tap asks again) when No man's land's
        rule no longer allows the fight (`setFoeRule(nmlCanAttack)`, handed in
        by noMansLand.js), when they leave, or after `FIGHT_QUIET_MS` 60 s with
        no blow between you either way (every pvp_hit to or from them,
        gameEvents.js `notePvpBlow`); your own lock on them keeps it, the
        sword's automatic one does not; a tap on a live foe aims with no
        second window, and a stray shot never asks about one;
      - the shield and Special buttons are up for every weapon while a foe, or
        a player you traded a blow with in the last minute (`fightingNow`), is
        within `FIGHT_R` 900 and the rule allows -- the defender's button
        stayed only 5 s past each blow; an unlocked guard faces the nearest;
      - THE BADGE SAT ON THE SHIELD BUTTON (z 34 over 31, centred where the
        shield's left edge is): a tap on the shield's middle opened the rules;
        it now ends left of the middle and of the shield, 8 px clear where the
        bell leaves room, 2 at the least (NmlBadge.jsx: CSS in the game
        frame's own numbers -- `blockAnchor`, the bell's `left` -- as on a
        computer the frame is narrower than the window), and is narrower --
        your own skull a mark on its corner,
        not a third thing in the row -- so it fits between the bell (66-110 px)
        and the shield at 360 px and up; at 320 it lies over the bell's right
        half, never the shield;
      - spar §16 (24 checks), `mp-nmlfoe` (three phones): no-mans-land.md "The
        choice lasts, and the shield is there".
    - since v2.3.3316 A SWING ASKS, AND A DEATH TAKES EVERYTHING CARRIED -- the
      owner: "Attacks without locking on target did not pop up the window for
      attack ignore etc.", "Opponents do not drop all of their items except
      what they have equipped", "make sure red skulls ... lose all their stuff
      if killed by another player. If they're killed by a monster ...
      everything except their equipped items"; then, asked, "Drop them, sell
      replacements" (the tools) and "Lose their gold too":
      - a SWORD swing whose arc reaches a player you could fight and have not
        chosen asks "Attack <name>?" as a stray shot did (nmlAsk.js
        `nmlSwingAsk`, called from monsterCombat.js with the swing's own reach
        and arc); reproduced on main: 5 s of swings, no window. A window that
        goes UNANSWERED (its time up, or they cannot be fought) is not
        "asked": a shot or swing may ask again `NML_ASK_AGAIN_MS` 15 s after
        (`nmlAskClose(S)`); Ignore still means never again;
      - a death under the rule takes EVERYTHING CARRIED: the whole bag with
        none of the death's carve-outs (`_keptThroughDeath`: the three tools
        and every quest objective's family, which is EVERY `ore_` and
        `cooked_fish_` and four remains -- a gatherer dropped nothing) into
        the killer's pile (`pile.all`, `_wipeInventoryOnDeath(ps, all)`), the
        gold and the spare amulets to the killer too; a red skull a PLAYER
        killed loses what it wears as well, a red skull anything else killed
        keeps what it wears (`keepWorn`) and loses the rest to nobody; a
        status's tick keeps the kill its setter's (`_nmlTouch`); `nml_loss`
        gains `named`/`keepWorn`, and the killer is told (`nml_take`,
        PRIVILEGED); ordinary deaths unchanged;
      - Diego sells the axe, rod and pickaxe back, 100 gold each
        (server/src/shop.js `TOOL_SHELF`), one at a time, only to a player a
        quest gave that tool (`toolEarned`: life_1's accept for the axe and
        rod, its turn-in for the pickaxe) who holds none, never bought back;
        shelf rows `tool: true` (an older game hides them), the quote's `why`
        ('have' / 'quest'); kill switch `toolshop: false`;
      - `nomansland` §5-6 and §11 (100 checks), `shop` suite "a lost tool",
        `mp-nmlask` step 0, `mp-nomansland` 4b, `mp-toolshelf`:
        no-mans-land.md "Everything but what you wear".
    - since v2.3.3260 FIGHTS BETWEEN PLAYERS LAST, FISH MATTER IN THEM, AND
      LEAVING IS NO ESCAPE -- the owner, after the time-to-kill study: "I want
      you to plan and implement fixes for all of these including how much HP
      each fish should heal. You're the expert on this not me"
      (docs/specs/pvp-fights.md, measured on `tools/pvp-sim/`, a fight
      simulator running the worker's own combat code); then, of the first
      cut's numbers for player fights only: "I just want one formula that
      works the same across everything" (docs/specs/one-formula.md):
      - equal Lv 12 players with no points died in 1.5-4.5 s (a staff in one
        hit, 191% of a bar), specials 70-94% of the damage, a sword hit twice
        a swing (~24 claims a swing), crits never happened (a fraction read as
        a percentage), and every hit was the PHONE'S number;
      - THE WORKER ROLLS EVERY PvP HIT (server/src/pvpbalance.js, called by
        combat.js `_resolvePvPAttack`): the monster path's own roll, WHOLE --
        no PvP number of any kind; a special counts only inside the 3.5 s
        window a swipe the worker charged opened, worth ONE special
        (`_pvpSpecialCost`); a sword lands ONE hit a swing (`sw`,
        src/game/pvpSwing.js: at most three claims a swing, in reach; an older
        page one per 450 ms); `orbs`/`part` on the shot (a retreat shot is a
        whole hit, as on a monster); `caps.pvpbalance` (read beside
        `caps.oneformula`), kill switch `pvpbalance: false` (the old claim
        path exactly);
      - ONE FORMULA FOR EVERY FIGHT (server/src/oneformula.js, the page's copy
        src/data/oneFormula.js on `caps.oneformula`, mirror-audit): max HP
        100 + 50 a level + 40 a Max HP point (was 6 and 8; prog3.js
        `_prog3Recompute` via `healthAt`; PROG3.HP_PER_LEVEL / BODY.hp.per stay
        the old worker's); every monster's `dmg` x `monsterHitK(level)` (its
        matching player's new bar over the old, character level = monster
        level + 2) at creation (`_monsterHitStamp`, `_hk`; index.js and
        dungeon.js), the slime burst's and fire trail's flat amounts too -- a
        monster takes the same share of a matching bar as before; no blow over
        30% of a player's max HP (gone since v2.3.3263, below); the sword's
        special 4.5x (was 3; the ceiling with it), the staff's big bolt x0.6
        (`STAFF_BOLT_K`); a bar that changed size keeps its fullness at the
        join (`_keepBarFullness`); Lv 12 copper set: sword 9.9 s, bow 12.2,
        staff 13.3 (12.4 since v2.3.3263); kill switch `oneformula: false`
        (re-sizes every bar and live monster at once, liveops.js);
      - since v2.3.3263 ONE VERSION -- the owner, after #916 merged: "the numbers for damage
        between PVP and PVE can be exactly the same for each combat skill type
        ... A fish heals the same fixed amount always ... Everything is 1
        version" (docs/specs/one-formula.md "One version"):
        - ONE ROLL, whoever takes it: combat.js `_rollHit` (the edge, the
          bolt, the volley, the ceiling), called by `_handleMonsterDamage` and
          pvpbalance.js `_pvpRollFor` alike; pvp-balance §11 lands the same
          swing, arrow, bolt, special and crit on a monster and a player and
          reads one number;
        - THE LEVEL EDGE BOTH WAYS: a player's level as an opponent is their
          highest trained skill (prog3.js `_prog3OpponentLevel`), the target's
          for the attacker's Power/Luck/Special, the attacker's for the
          target's Dodge/Defense/Resist (`_applyDamage` attackerLevel) -- PvP
          was edge 1 ("a PvP design call of its own", v2.3.2680);
        - NO CAP OF A PLAYER'S OWN: the first cut's 30%-of-the-bar cap (a
          monster had none, so one hit read two numbers) is gone; armoured
          fights unchanged, an unarmoured player can lose most of a bar to one
          big staff bolt (up to 92% in the sim); the monsters' half-bar rails
          stay;
        - A FISH HEALS ITS FIXED NUMBER: no HP-grid Recovery on top (0 for
          prog3 anyway; back with `fishheal: false`), the stew too;
        - DRAWN ONE WAY (gameEvents.js `pvp_hit`): your hit on a player in
          amber with the weapon's mark, a player's hit on you red with the
          heart, a block "Blocked!" and its ⚡ (counted for the block quest),
          onlookers in its zone the taken red within 2,800 px
          (`PVP_ONLOOK_R`; pvp_hit goes to every zone); ONE FIGURE
          on every screen for every hit on a player, a monster's too -- the
          change in their bar (`takenFigure` -> `toDisplayHitDamage`, the
          monster_hit rule), from the worker's `hp` (monster_attack carries it
          now, as pvp_hit did); `pvp_hit` carries `slot` and `staminaDrain`;
          `mp-pvpnumbers` (three phones: one blow read "-2" and "-3" before);
      - THE FISH LADDER (data.js `FISH_HEAL`, mirror gameSystems.js on
        `caps.fishheal`): 100/150/225/325/475 (20/30/45/65/95 on screen), a
        fifth to two fifths of the one formula's bar where each is caught,
        the same heal in any fight; ONE BITE EVERY 15 s IN ANY FIGHT (cooking.js
        `_anyFightAt`: a duel, a hit between players, or a blow dealt or taken
        by anything within 10 s; the page's fightFood.js `fightSeen`,
        `noteDealt`); kill switch `fishheal: false`;
      - QUICK EAT (src/game/quickEat.js, ui/panels/QuickEatButton.jsx, the left
        cluster's `LCTL_SLOT.eat`, V on a keyboard): the smallest heal that
        fills what you miss, else the biggest, through eatBus; shown while you
        carry one and miss HP, the bite rule's wait as its ring; its pictures
        warmed on the loading screen (data/foodIcons.js);
      - LEAVING MID-FIGHT (server/src/linger.js): within 10 s of a hit between
        players, in the Wheel, the body STAYS 20 s, hittable, no player_leave;
        a reconnect from where it stands takes it back, any other join gets
        `linger_wait {ms}` + close 4010 (src/ui/LingerScreen.js counts down);
        not duels, not the last one in the room; kill switch `linger: false`;
      - THE SHIELD AGAINST A PLAYER: the button already shows for every weapon
        (a lock, a blow in the last 5 s, a monster in reach); a guard raised
        with no lock now faces the player who hit you in the last 3 s
        (shieldToggle.js `noteShieldThreat`, `shieldThreatPoint`), not the
        nearest monster -- `mp-pvpshield` (two phones);
      - not done, the owner's call: a sword loses to a bow or staff that kites
        it (a mechanic, not a number: the sword's lunge on players) -- done
        since v2.3.3262, below;
      - `pvp-balance`, `one-formula`, `linger`, `fightfood` §4-4c/§7,
        mirror-audit "fish heal"/"ONE_FORMULA", `grids` §6, `mp-quickeat`,
        `mp-linger`, `mp-pvpshield`, `mp-pvpnumbers`.
      - since v2.3.3264 THE MONSTER-ONLY EXTRAS WORK ON PLAYERS -- asked about
        "gem burn and root, the staff's splash, whirlwind, lunge and shield
        bash, and the sword's heal on a kill", the owner: "Yes the monster only
        extras should work on players too" (server/src/pvpextras.js,
        docs/specs/one-formula.md "The extras"):
        - a gem's status (burn, freeze, root, slow, soak, crackle, fracture,
          thorns), a second element's collision, the staff's splash and the
          big bolt's blast (a bolt on a player splashes too), the Element
          Burst, the shield bash (its 90 px shove), the whirlwind (its pull)
          and the dodge's lunge, a kill's Lifeblood and melee lifesteal
          (`lifesteal_credit` `victimId`), and a parry's STAGGER (1.5 s, every
          blow refused; `parry` `attackerId`) -- the same code and numbers as
          on a monster, every one through ONE door (`_strikePlayer`:
          `_pvpAllowed`, the shield, a roll, the kill);
        - NOT ON PLAYERS YET, the owner's call: an ordinary hit's KNOCKBACK and
          the bow volley's BURN. On the fight simulator (tools/pvp-sim
          `whatIfs`: `shove`, `burnTicks`) both turn fights toward whoever
          keeps their distance -- a monster walks a shove back
          (KB_RECOVER_PX_PER_TICK) and a kiting player keeps it; a kiting
          archer gets the burn's four ticks free, which against a monster the
          210 ms lane mostly swallows -- a skilled sword against a skilled bow
          91% won -> 27% with both, while the shipped set moves win rates 3
          points on average (one-formula.md "Not on players yet");
        - an AREA move (whirlwind, burst, splash, blast) hits only players
          you are already fighting (a duel/arena pair, or a hit either way
          in the last 10 s: `_pvpEngaged`); a NAMED move (bash, lunge, a
          locked swing; a player named as `pid`, the dash's way below) only
          needs the fight to be allowed;
        - a player CANNOT BE LOCKED DOWN: a freeze or an ability's stun holds
          as a rock's daze (0.5 s, then 2.5 s immune), a root as a slime's
          hold (0.7 s, then 2 s); the status itself runs its full length;
        - the gem is the CLAIM'S `element`, read where a monster hit reads it
          (`_pvpClaimElement`): gem setting is the page's alone (EnchantPanel),
          so the worker's copy of a weapon has none once a record exists --
          the same trust a monster hit has (a server-owned gem setting would
          close it for both; not built);
        - the page: pvp_hit's `st`/`stMs`/`kb`/`mult`/`stacks`/`ability`/
          `collision` carried out and drawn as a monster's (applyElemHit,
          applyHitShove, tickKind -- a tick is no blow and sends no
          pvp_confirmed), three new statuses `slow`/`fracture`/`thorn` (their
          chips, looks and sounds), "Staggered!" (staggerRefused; a staggered
          swipe is a plain roll), a player lock named by the bash and the
          dodge's lunge and counted as a fight for the whirlwind
          (`pvpExtrasTarget`, the dash's own rule) only against
          `caps.pvpextras`; kill switch `pvpextras: false` (also off with
          `oneformula`/`pvpbalance` false);
        - merged with v2.3.3262 (the sword's dash at a player, below): the dash
          keeps its own rules -- its daze, no shove -- and its daze rules hold
          for the extras too (a dazed player's bash, whirlwind or lunge lands
          nothing on a player, a dazed roll dodges nothing);
        - `pvp-extras` suite, `blockcost` §5, `event-place` 1h2, mirror-audit
          (statuses, SLOW_MULT, SHOVE_MAX), `mp-pvpextras` (three phones).
    - since v2.3.3262 THE SWORD'S OPENING LUNGE WORKS ON PLAYERS -- the owner:
      "Yes make opening lunge work on players too" (docs/specs/pvp-lunge.md):
      - the same move: a press with a player you may fight locked (a duel, No
        man's land's aim; `pvpLungeTarget` in src/game/abilities.js, the
        swing's own PvP gate, on `caps.pvplunge`) dashes to them and strikes
        on arrival, the `ability` naming them as `pid` (never `targetId`);
        BroTown's dash follows them by id in S.others;
      - the worker (`server/src/pvplunge.js`, from abilities.js
        `_abilityResolve` before the monster scan): `_pvpAllowed`, same zone,
        alive, within the 900 px reach; puts you at contact (46 px); then the
        ONE DOOR, `_resolvePvPAttack` (a swing of its own `sw`, the worker's
        roll, shield, roll, skulls; no cap since v2.3.3263); no knockback on a player;
      - a landed lunge DAZES with the rock monsters' DAZE by reference (0.5 s,
        then 2.5 s before another, shared): `st: 'daze'`, `stMs` on the
        pvp_hit, carried out by elemHits.js `applyElemHit` on you or the peer;
      - against players the worker now refuses a dazed player's SWING (not a
        shot: its claim comes when it lands) and lunge, and a roll in a daze
        gives no dodge (`_pvpDazed`); a rock monster's daze counts the same;
      - the simulator (`tools/pvp-sim/lunge.mjs`), Lv 12 copper set: the sword
        wins v bow 8/19/0% -> 32/39/89% (low/average/top skill), v staff
        3/24/0% -> 12/21/66% (re-measured with v2.3.3263's one version); the daze
        adds little, the lunge is what catches;
        top-skill sword v bow at ~90% is the open question (the lever: a
        longer cooldown against players);
      - kill switch `pvplunge: false`; `pvp-lunge` suite (38), `mp-pvplunge`
        (18, two phones).
    - since v2.3.3265 SPARRING CLONES IN THE TEST PANEL -- the owner: "I wish
      I could test PvP somehow. Can you make a special environment where I can
      go to attack clones of myself using different weapons and you just have
      them attack me using AI? ... Maybe this is better to add to the admin
      window" (docs/specs/sparring.md):
      - the panel's Sparring section (`/dev/spar` {add | skill | clear},
        admin key) brings up to three clones beside you in the Wheel -- a
        sword, a bow, a staff -- each a playerState entry the tick draws on
        every phone, with your look, level, points, armour, shield and amulet
        and the weapon you carry for its slot (a copy, gems and all) or the
        tutorial's; none of your bag, gold, buffs or pet;
      - an AI on the worker (`server/src/spar.js`, the fight simulator's
        player: Dummy / Easy / Normal / Hard = sim SKILL low / moderate / high;
        Easy a beginner below low since v2.3.3267, below)
        moves it and fights you through the room's own doors -- every blow
        either way is `_resolvePvPAttack`, specials and rolls are paid through
        `_handleAbilityUse`, the sword's lunge is `_handleAbility` naming you;
        its swings, shots, rolls, dashes and guard reach every phone as the
        relays a player's page sends (wire-audit's allowlist says why), its
        shots naming you (`tg`: a bolt chases you, and an arrow or bolt ends
        where it reaches you on screen -- visualSystems.js);
      - a clone fights its owner and nobody else (`_sparPair`, first in
        `_pvpAllowed`; `_pvpEngaged`), never under No man's land
        (`_nmlAllowed`), never chased or hit by a monster (`_tickMonsters`,
        `_telegraphHitPlayer`, fire trail, storm arcs, the slime burst), never
        saved (`_saveRpg`), never sent to town (`_tickPlayerRespawn`);
      - a KNOCKOUT IS NOT A DEATH (`_sparDeath`, asked first by
        `_handlePlayerDeath`): a clone is down 3 s and stands up beside you;
        you, knocked out by your own clone, are healed where you stand and
        saved healed -- no death screen, no pile, no loss -- the clones heal
        and stand off 2.5 s, the panel and chat keep the score;
      - `spar_state` (PRIVILEGED, the owner's only, wsClient's direct switch)
        names the clones so a tap aims at one (src/game/spar.js `sparAim`,
        BroTown's tap; its circle beats the self-chat circle); leaving the
        Wheel or the game, Clear, or `spar: false` (caps.spar) takes them
        away; no linger for a spar;
      - found: a real archer's arrows were drawn at 8 px a frame on everyone
        else's screen, a third of their speed; a real mage's bolt flew
        straight there though it chases on the mage's own; and another
        player's shot never stopped at you on your screen -- all fixed in
        v2.3.3266, below;
      - `spar` suite (115: a live monster chases a real player and ignores a
        clone, break-the-guard checks), `mp-spar` (the real panel on a phone).
    - since v2.3.3266 ANOTHER PLAYER'S SHOT FLIES AS IT DOES ON THEIR SCREEN --
      the owner, on what #920 found: "Yes do the follow up fixes"
      (src/game/peerShots.js, docs/specs/peer-shots.md):
      - SPEED AND REACH: a relay's `life` is 90 frames x the arrow's
        `_rangeMult` (since v2.3.2592), so the watcher reads the multiplier
        back off it and flies the copy at ARROW_SPEED_PX (24) x it, to
        BOW_RANGE_PX (675) x it, solid all the way as the shooter's own
        (visualSystems.js `reach`; was 8 px a frame to 720; the life/20 fade
        never bites in 28 frames, mp-projlook) -- for an older page's shots
        too, nothing new on the wire; the volley at
        BOW_VOLLEY.SPEED_K, its waits (sized for PEER_PX_PER_FRAME 8 by the
        shooter, unchanged) counted in that speed's frames, still 200 px apart;
        bolts and any shot naming its own `speedPx` exactly as before;
      - THE LINE: an arrow's copy stamps its origin and angle as it leaves (it
        was drawn from where the shooter IS, sliding as they walked), a
        volley's later arrows taking the first one's (gameEvents.js `_sib`:
        same shooter, same `ts`); a bolt still sweeps round its caster;
      - THE TARGET: a shot at the player you have locked, where your PvP hit
        test tries them (`shotTargetId`: the duel opponent, or a player locked
        outside a safe zone), names them as `tg` -- every road: monsterCombat's
        shot, the retreat shot, the volley, the big bolt, the three orbs; on
        every other screen the arrow leaves aimed at them as THAT screen draws
        them and ends where it reaches them (the PvP test's room, 28.6), a
        bolt chases them; a shot that PIERCES flies on through
        (every bow special, and `pc: 1`, the Piercing stat); the worker reads
        neither;
      - the clones' shots are a page's relays now (spar.js: life 90, no
        speedPx, the volley's `ts` and waits);
      - `window.__btPeerShotEnds` says why each copy ended (life, reach,
        target, prop); `peer-shots` suite, spar §5k/§6b, `mp-peershots` (two
        phones).
    - since v2.3.3267 YOUR CLONES ARE MONSTERS TO YOUR WEAPONS, AND EASY IS A
      BEGINNER -- the owner, after the first spar: "attacks need to hit the
      clone even when you aren't locked on target ... the block shield button
      needs to appear while in combat for any of the 3 combat types ... the
      enemy Hp bar was too small ... should be the same size as mine ... The
      bot was tough to be beat even on easy" (docs/specs/sparring.md "After
      the first playtest"):
      - the page asked about a player only when one was locked, so with
        nothing locked the bow never loosed at a clone (firstSightHit), arrows,
        bolts and swings went through it, and the shield button came only with
        a blow; `src/game/sparTargets.js` (no imports) is the list of your live
        clones every weapon now reads;
      - the sword's auto target takes the nearest clone like the nearest
        monster, 220 px, held to 275 (targeting.js: a player lock with `spar`
        and `src: 'auto'`, which the rule owns and drops on a knockout, a bow
        or staff drawn, or a nearer rival); a bow or staff still locks by a tap;
      - firstSightHit and the projectile hit test try the lock, then every
        live clone (`shotPlayerTargets`), each claim naming its clone as
        `target`; a swing claims each clone in its arc and reach
        (`fightersInSwing` since v2.3.3268, its own count per clone: pvpSwing.js
        `key`), and a lock on a clone never sends the open cone claim;
      - the shield button and the Special button are up while a clone is within
        `FIGHT_R` 900 (`fightOn`; both renamed in v2.3.3268, which adds the
        players you fight in No man's land), every weapon; an unlocked guard
        faces the nearest clone;
      - ANOTHER PLAYER'S HP BAR IS YOURS: 76 x 22 and an 18 px number
        (PEER_BAR_W/H, PLAYER_HP_NUM_STYLE; was the monster's 44 x 13 and 9 px),
        grown upward from the old bar's bottom (PEER_BAR_Y), for every player;
      - EASY (spar.js SPAR_SKILLS.easy): no special, no lunge, focus 0.5,
        `gapMs` 600 more between attacks -- on the simulator
        (tools/pvp-sim/easy.mjs) a careless player throwing no specials lost
        every fight to the old Easy and wins every one now (Lv 7/12/22, all
        nine pairings, ~30 s fights); the sim takes `special: null`, `gapMs`,
        `aimSigma`, `boltsStraight`; Normal and Hard unchanged;
      - spar §14-15, `mp-sparfight` (nothing tapped; fails 1a-4b on the game
        before it).
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
    - since v2.3.3105 a TAP ON THE RIGHT STICK JUMPS, the button put away (the
      owner: "prioritize other contextual uses for the tap instead of jump
      first if any apply"): only a tap the world's "empty space" line got
      (`S._tapEmptySeq`) with no job on the right side (`rightTapBusy` in
      src/game/tapJump.js: a harvest, the disc pressable, a lock) jumps;
      `?jumpbtn` brings the button back; `mp-tapjump`; and beside a PROP a tap
      jumps too (the owner: "a tap should jump" there, a hold attacks): with no
      job the tap window and the first swing's wait are `TAP_JUMP_MAX_MS` 320
      (`S._atkHoldUntil`, `?tapms=`), a swing meets a prop at the BOOTS
      (propSwingHit + `playerGroundDy`; it never landed north of you), and the
      stick shows the owner's JUMP arrow, see-through over the disc as it is,
      whenever a tap would jump (`data-ricon="jump"`,
      `public/ui/controls/jump-glyph.webp` cut off their button -- the whole
      button was "way too intense"; painted at rest, never pressable);
      `mp-tapprop`; and the stick's picture is the TAP'S ACT (the owner: "chat
      bubble for speaking [to NPCs], door for entering door"): a bubble beside
      a character, a door at steps/halls/dungeon mouths, the moon at the
      farm's bed, the WEAPON IN YOUR HAND when it attacks (its bag picture
      in its metal, controlSkin `weaponDiscIcon`; and WHILE you attack --
      a hold, a drag, a swing or shot and 1.2 s after, tapJump.js
      `attackingNow`; on the lit disc in a fight the picture follows the
      thumb, `rKnobFollow`, the look only), else JUMP -- the tap runs
      the E key's own chain
      (desktopControls `runInteract` via `S._interactNow`, `interactKind`,
      the character first for the stick: `npcFirst`), SVGs in
      `public/ui/controls/`; `mp-tapact`.
    - since v2.3.3145 a TAP THAT JUMPS SHOWS NOTHING OF THE ATTACK (the owner:
      "When you tap jump with bow equipped it shows you and your line of sight
      facing southward for a brief instant"): with no job on the right side a
      press is PENDING (`S._atkPending`), not `S.autoAttack`, until it turns
      out to be a hold (its window closes, the thumb still down) or a drag --
      tapJump.js `settleTapPress`, once a frame at the top of the game loop;
      the shield and the water let go of it as they do of the attack. Before,
      every tap turned the body to the leftover `S._aimAngle` (a monster killed
      a while ago, an old drag), drew the bow's sight line and the sword's
      preview, halved the walk and ended a sprint. And a pending tap's thumb
      roll inside the tap's 10 px no longer aims (the aim's dead zone was 8);
      a tap on the right stick over a resource out of reach, or one you hold
      no tool for, is a tap on the ground -- it jumps, and "Too far away!" (and
      "You need a tool for that") is gone, a farm bed out of reach the same
      (`_tapHarvestAtCss`, `_tapFarmBedAtCss`); `mp-tapstance`:
      docs/specs/jumping.md "v2.3.3145".
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
    - since v2.3.3151 THE WHEEL WITH ITS GROUND GONE IS DARK TOO -- the owner:
      "the screen went black up until the point I began fighting the fire
      goblins": the same reset caught part way, the ground blank (GPU only
      since v2.3.3076) and the buildings, trees and townsfolk (files) still
      standing on the navy -- 30-39% lit in town, never under the 1% line. In
      the Wheel a sample under `WD_WHEEL_LIT_MIN` 75% is a strike
      (BroTown.jsx): two rebuild, four reload, never the first join's one.
      Measured at 51 places, town and all eight spokes: 95-100% lit with the
      ground, 9-56% without. A part of the Wheel drawn dark on purpose (a
      night, the Dark realm) lowers it first. TRAPS §142, `mp-bareground`
      (the `wheelGround` container hidden through `window._pixiRenderer`).
    - since v2.3.3152 A FRAME THAT THROWS DOES NOT LEAVE THE SCREEN BLACK --
      found by a leak hunt, which made the owner's black screen on main: after
      a Great Cave trip one frame threw (Pixi's pooled mask filter; TRAPS
      §143, `bindGroupFix.js`) inside a polygon mask, and Pixi KEPT that
      mask's stencil test on for every frame after -- 0% lit for 22 s, until
      the watchdog's rebuild. Pixi carries its stencil-mask depth, each render
      target's stencil mode, the colour mask and the filter stack from frame
      to frame, so whenever app.render throws, pixiRenderer now puts them
      back to "nothing open" (`src/rendering/renderHeal.js`; `?noheal` to
      compare) and the next frame draws. TRAPS §144, `mp-renderheal` (the
      throw made as it happened, with `bindfix=0`; `noheal` shows the black).
    - since v2.3.3313 THE MINIMAP NEVER COVERS THE SCREEN -- the owner:
      "often loading from a saved character will show the game as an enlarged
      minimap. You're forced to log back out and back in to fix it": a canvas's
      WebGL context is made by whoever asks FIRST, and the crash report's GPU
      line (crashTrap.js) and the black-screen watchdog asked the game's canvas
      bare, with WebGL's defaults -- no stencil buffer, so every mask drew
      unclipped and the Wheel's minimap covered the screen. The report goes
      1.5 s after any boot with something in the crash log (or any error), and
      the canvas is up a moment before Pixi takes it as a character is played
      from the list (and on a rebuild's fresh canvas): a race. Both now read the renderer's own
      context (`_wdGl(cv)`, `window._pixiRenderer.app.renderer.gl`), never a
      canvas's getContext; a context that ever comes up without a stencil
      buffer is said in the crash log (`gl-no-stencil`) and the canvas swapped
      for a fresh one, once a page, its context asked for as Pixi asks by
      default (depth buffer too: pixiApp.js `withoutDepthBuffer` stands aside).
      TRAPS §194, `mp-savedload` (the race made
      certain: Pixi's file held back while a page error sends a report; and the
      context taken bare by the test).
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
  - Since v2.3.3057 the WORLD MAP SHOWS MORE AS YOU ZOOM -- the owner: "Make
    it so if you tap the minimap and zoom in you can see more details":
    ZOOM_MAX 28 (was 12), and by zoom (`AT` in WorldMapOverlay.jsx) the
    quest's gold road and star (always, `questRoutePoint`), the other bros,
    each land's level bands (wheelmap.js `ticks`, `spokeHalf`), the resources
    tinted by tier and the monsters near you, the bridges and Bro Pond, and
    in town every building named at its door (`wheelTownDoors`, a shut one
    dim); `__btWorldMap.more` counts them: WORLD-MAP-PIPELINE "Zoom in, and
    there is more to see", `mp-wheelmap`.
    - since v2.3.3319 UP CLOSE FAR FROM YOU AS SHARP AS ROUND YOU -- the five-
      times Wheel's "not in this step", the owner: "Push all these to main
      then keep going": the long Wheel's whole picture is a pixel every 16
      cells (a coast far off was big soft squares zoomed in), so its lands are
      baked a pixel every 4 cells too, in 256-px tiles in their flat colours
      (bake-wheel-world.mjs `detailTiles`, public/world/placed5/detail/; a
      one-colour tile is no file, placed.js `fill`), and the map
      (src/ui/worldMapDetail.js) loads the ones it shows once a coarse pixel
      would be 6 CSS px (`COARSE_PX`), at most 16 held, all let go on close;
      not on the loading screen (a map's detail coming in over the picture it
      sharpens); `?nomapdetail`; `/world/placed5/*` now kept a year in
      public/_headers like `placed/` (TRAPS §199); `mp-mapdetail`:
      WORLD-MAP-PIPELINE "Up close far from you, as sharp as round you".
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
    - Since v2.3.3047-v2.3.3049 THE FIRST QUEST GUIDES YOU
      (docs/specs/quest-guidance.md): a giver's badge is '❗' offer (gold "!"),
      '❔' accepted and waiting (a GREY "?", still) or '❓' ready (a GREEN disc
      with a DRAWN check, no glyph) -- all done wears nothing; the pinned quest
      card leads with the quest picture, then the painted check
      (`QUEST_ART.check`) when `questObjectiveDone`; and gearFlash.js lights
      OPEN on a folded band, then the sword AND shield tiles (`data-gear`),
      then the bow AND staff after the hand-in, each until its slot is filled,
      tut_1 accepted to tut_2 handed in (`data-flash`, game.css
      `bt-gear-flash`) -- `mp-questguide`.
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
      the biggest thing over the monster and its XP and gold read under it
      (no longer since v2.3.3192, below);
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
    - since v2.3.3192 EVERY MESSAGE IS THE PLAIN HIT'S SIZE -- the owner: "Make
      the messages in the game like "no mana" and other things like "quest
      complete!" the same font size as the combat damage numbers": every popup
      `isDamagePopup` calls no number (words, reward lines, heals, a
      crit-flagged note) is `MSG_FONT_PX` = 21 x `DMG_SCALE`, its outline,
      lift, stacking and climb with it (`_k` is DMG_SCALE for all; a crit
      stays bigger); a long one WRAPS into even lines no wider than
      `MSG_WRAP_W` 520 world px (`msgLines`, `wrapMessage`), never smaller
      type, and grows upward; a message is held `MSG_EDGE_PX` 12 inside the
      view (a number never moves); and ONE SIZE ON THE SCREEN for numbers and
      messages alike (the owner had read the numbers as fixed -- they grew
      1.31x with the dashboard folded -- and chose "Yes do fixed size
      instead"): every popup size and every offset from its spot (lift,
      stack, climb, mark, gap, wrap, edge) is popup px drawn x `Z` =
      `POPUP_ZOOM` 0.606 / `S._worldScaleX` (`popupZoomK`; the QA phone's
      folded scale, where they were tuned: a plain hit 22.3 CSS px), like the
      name plates; the spot stays the world's; a line no wider than 0.82 of
      the screen (`msgWrapW`); `?popupworld` the world-px way; the stacking
      runs after the Text is made now (a wrapped one's height); `mp-dmgsize`
      reads sizes AT REST (this box's slow frames catch the spawn pop; `_z`
      kept in): damage-number-size.md "Messages as big as the numbers".
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
    - the bigger wins and what each costs: docs/specs/memory-in-the-wheel.md.
  - Since v2.3.3039-v2.3.3046 SEVEN FIXES FROM THE OWNER'S NOTES
    (docs/specs/notes-2026-10-05-fixes.md):
    - the Wheel's player-facing name is BROTOWN (`ZONES.wheel.name`; every
      loading veil says "Entering BroTown"; `wheel` stays the id);
    - a LIFE SKILL IS NEVER LEVEL 0: the client levels with the worker's
      arithmetic (`awardSkillXp` `level || 1`), new skills start at 1 and a
      stored 0 heals to 1 on both sides (`healLifeSkillLevels`) -- the banner
      said "Level 1" for a level the worker made 2;
    - a DEATH is heard and felt: `playerDeath()` from recordings (it was beeps,
      silent since v2.3.1103), a shake of 18, the dark flash and a kick away
      from the killer; the killing blow's number and clang are no longer
      dropped;
    - the staff special is 50% bigger, drawn and hit-tested
      (`STAFF_BIG_BOLT_SCALE` 2.55);
    - a floral hit shows the LEAF (`elem-flora`), not the slime's splat;
    - the daily chest plays its own sounds on its own frames (the lid on
      frame 4, the coins as they rise), the coin credit `quiet`;
    - a crash's reload never opens the CREATOR: entering the world strips
      `?create=1` / `login` / `noresume`, and a `?create=1` on a key already in
      the roster is stale (`__btBootRoute` 'create-stale'); and the monster
      hit-chip cache no longer destroys textures a live burst draws (LRU,
      `BURST_MS` + 1 s), scratch canvases are released at once and the
      arrow-pin cache is held to 6 MB -- `mp-createflag`.
  - Since v2.3.3062 BROTOWN'S SIGNPOSTS SAY WHERE THEIR ROADS GO -- the
    owner, on the recommendations for finding your way round: "Continue
    building recommended": the four gate signposts (placing.js, boards blank
    by the catalog's word) each show two plates when you are within 640 px
    (300 since v2.3.3146, popping up out of the post -- the owner: "only pops
    up when you get close"; 640 was a phone's whole view) --
    the land straight on and the land whose trail forks off that road
    (`WHEEL_GATE_ROADS`, src/data/wheelSignposts.js, checked against the
    plan's roads), an arrow the way it lies, its element icon and its name in
    its colour; world-sized, on monsterUi (src/rendering/wheelSignposts.js,
    drawn by effectsRenderer); since v2.3.3089 each plate ends in the levels
    its land holds, "Lv 1–20" (`WHEEL_LAND_LEVELS`; the owner's "Yes" to
    levels though every land reads the same; mirror-audit holds it to the
    deepest stretch baked in wheelspawns.js); the eight
    icons drawn down to 64 px behind the Wheel's loading screen and let go on
    leaving; `mp-signposts`, test-world-core "the gate signposts":
    docs/specs/gate-signposts.md.
  - Since v2.3.3064 EACH LAND HAS ITS OWN MUSIC -- the owner, on the
    recommendations for finding your way round: "Continue building
    recommended":
    - the Wheel is one zone, so one track played everywhere in it: the town's
      after a login (the loading screen's hand-over asks for it once you are
      in), the game's theme after a death, a dungeon or the farm;
    - now `src/game/wheelMusic.js` picks it by the land under you
      (`wheelHere(...).region`, asked by the minimap's frame beside the land
      banner): Brotown and the commons the town's, frost/ember/sky their own,
      the Verdant Wilds forest.mp3 (`ZONE_MUSIC.verdant`, the meadow's url),
      the other four the theme until a track is put under their id;
    - into a land after 1.2 s, home only after 8 s on the safe ground (a fight
      on the line steps back and forth), a visit's first choice at once on a
      `fresh` answer; `startZoneAmbient('wheel')` keeps what plays;
    - the dunes' wind is let go on leaving (it was kept for the session);
      `_zoneAsks` keeps the last 16 asks for `window.__btLandMusic`;
      `?nolandmusic` is the Wheel as it was; world.mp3 NOT used for the four
      (~25 MB more; asked, the owner said "No", 2026-10-06);
    - window.BT_AUDIO IS set -- BroTown's `Object.assign(globalThis, ...)` of
      the data index -- despite the effectsRenderer comment saying it never is;
    - test-world-core "the lands' music", `mp-landmusic`:
      docs/specs/wheel-land-music.md.
  - Since v2.3.3065 NORTH IS MARKED ON BOTH MAPS -- the owner, on the
    recommendations for finding your way round: "Continue building
    recommended": neither map ever turns, and nothing said up is north;
    the minimap's frame wears a brass N on a slate bead in the middle of its
    top band (wheelMinimap.js NORTH, `__btMinimap.north`), and the world map a
    44 px compass at its top left (`[data-world-map-north]`, no taps);
    `mp-north`: docs/specs/wheel-north.md.
  - Since v2.3.3066 THE GUILD HALL, THE POST OFFICE AND THE SHERIFF'S OFFICE
    OPEN -- the owner: "keep going with pragmatic enhancements":
    - three of the four "(new: ...)" plots open onto systems the game already
      has (`WHEEL_HALL_DOORS`/`WHEEL_HALLS` in wheelBuildingDoors.js, a door's
      `hall` in wheelTownDoors.js, `src/ui/panels/buildings/WheelHallPanel.jsx`,
      the same Enter button and E): the Guild Hall your clan (ClanPanel) and the
      skill guilds (GuildPanel), the Post Office your mail and friends'
      messages (the Social panel), the Sheriff's Office the player list (a duel
      starts from a player's card) and the arena's sign-up; the Hotel stays
      shut -- its rest is the farm bed's, client-only, so it opens when the
      worker can pay for a rest;
    - NO CLAN COULD BE MADE, RUN OR JOINED before: ClanPanel and GuildPanel
      were opened only by the hidden MenuBar and the replaced wheel menu, and a
      clan invite's only Accept was in ClanPanel; now an invite raises its own
      card wherever you are (`src/ui/panels/ClanInviteCard.jsx`, like a duel
      challenge), as the worker keeps one only 120 s (`CLANS.INVITE_TTL`);
    - the DASHBOARD'S Clan page showed a player with no clan developer code
      (`window.__broLegacyUI?.clan?.()`), and its Guild page and the More
      line read `rpg.guild` / `S._guild`, set by nothing ("not joined" to
      everyone): now Make a clan / Open the clan window, every skill guild's
      rank by its life skill (`guildRanks`, `bestGuildRank` in
      dash/GuildPanel.jsx), each opening the real window (`openGameWindow`,
      `__broLegacyUI.clanOpen` / `guildOpen`);
    - the mail: every `inbox_delivered` entry, the daily reward's included, is
      kept for the visit in `S._mail` (`src/game/postOffice.js` `recordMail`,
      `MAIL_KEEP` 30) -- what drained at your join is "what came while you were
      away"; nothing new on the wire, nothing stored;
    - halls are not building visits (mayor_1 counts the twelve);
    - docs/ART-WISHLIST.md: what art and sound the game could use next, each
      with a prompt to paste (the buildings' insides, land banners, dungeon
      mouths, the four lands' music);
    - test-world-core "the buildings' doors", `mp-wheelhalls`, `mp-wheeldoors`:
      docs/specs/wheel-halls.md.
  - Since v2.3.3067 THE REST OF TOWN'S CAST STANDS IN THE WHEEL'S BROTOWN --
    the owner: "keep going with pragmatic enhancements":
    - Ace west of the Gambling Den's steps, Blacksmith Bro east of the forge's,
      Lil Bro on the square 260 px west of where you arrive (Mayor Bro east),
      beside Diego (`WHEEL_TOWNSFOLK` in wheelBuildingDoors.js, spawned by
      `_spawnWheelNpcs`, standing still, facing the street);
    - ACE'S COIN FLIP (v2.3.2618) opens only on a tap on Ace, so while he stood
      in today's town it could not be played at all; the worker's flip never
      asks where you are, so no server change; E beside him opens it too, and
      Diego's shop (desktopControls.js; a door in reach still comes first);
    - the art follows the table (npcSprites.js `_wheelCast`): walkers' south
      strips cropped, single pictures for the rest, behind the Wheel's loading
      screen; the five hold 1.83 MB (`window.__btWheelNpcArt()`);
    - test-world-core "the buildings' doors", `mp-wheelfolk`, `mp-wheeldoors`:
      docs/specs/wheel-doors.md.
  - Since v2.3.3127 THE FEED & SEED IS A REAL FARM -- the owner: "mechanics
    similar to the old FarmVille game ... Need to dig, plant seeds, fertilize,
    water", then, on the research (docs/FARMING-PLAN.md, its Phase 1): "Good.
    Go ahead and build it":
    - the WORKER owns it (`server/src/farm.js`, storage `farm:<pid>`): a free
      deed of six beds; dig, plant, then optional water (ready 25% sooner) and
      compost (harvest x1.5), then harvest; ripe when the worker's clock
      passes `readyAt`, never ticked, so crops grow offline and nothing
      withers; carrot, Firebloom, Rock Vine, Cloudpetal (`FARM.CROPS`, mirrored
      in src/data/farmCrops.js, pinned by mirror-audit); Farming XP only at
      harvest; seeds and compost sold in the window; Diego values every farm
      key so reselling a seed is a loss (`FARM_SHOP_BASE`);
    - the window is `FeedSeedPanel.jsx`: pick a tool (it follows the farm until
      you do), tap a bed or drag across several -- one message -- gated on
      `caps.farm` (kill switch `farm: false`); without it FarmPanel keeps the
      old browser-only plots (`LegacyFarmPanel`), which never kept anything;
    - Herb Bread finally HEALS (2% max HP a second; its `regen` timer was never
      read) and Firebloom Tea's card says its real +20%; the recipes' Cooking
      levels (Stew 3, Tea 6) are the WORKER's gate now (`cookLvl`, cooking.js);
    - a harvest turns its bed to grass BEFORE it pays, and a life skill that
      is not an object heals at the join (`healLifeSkillLevels`) -- found by
      the review: a bare-number skill made the XP throw and one bed paid on
      every message; a restart deletes `farm:<pid>`; `farm_state` is handled
      in wsClient's DIRECT switch, never processGameEvent (relayed events
      reach that, and a pre-farm worker relays a forged one); a record
      carries its shape (`FARM.V`) and a worker refuses a NEWER one whole
      (err 'newer') -- a phase that changes the record bumps it, or a
      rollback rewrites beds of crops it never heard of as grass;
    - the dev op `farmripe` ("Ripen my farm now" in the dev panel); `farm`
      suite, `mp-farm`: docs/specs/farm.md.
  - Since v2.3.3130 MEALS AND BREWS YOU CARRY -- the plan's Phase 2a:
    - a cook with `carry` (caps.meals) puts the recipe's `makes` in the bag
      (cooking.js); `eat_request` takes `meal_*`, `potion_drink` `brew_*`
      (data.js `DISHES`, mirrored in src/data/dishes.js); an old client's
      cook is the dish made and used at once;
    - ONE MEAL AND ONE BREW: `_clearBuffSlot` clears a slot whole, its
      magnitudes with its timers; damage is only ever a brew (combat.js's
      ceiling was sized at one x2 brew); meals last 30 min;
    - Diego's tonics are BREWED (recipes 3-5), off his shelf (`DIEGO_SHELF`)
      and still never bought back; he buys NO dish either (`isCookhouseDish`:
      a dish's own pile paid more than its herbs' fuller ones);
    - the Herb Bread doubles the out-of-combat healing (`HERB_REGEN_MULT`),
      never mid-fight, on its own `_buffs.rest` timer -- NEVER `regen`, which
      v2.3.3127 reads as 2% a second mid-fight (a rollback's trap); meals and
      cooked fish file under the bag's Consumable chip (no sixth chip: one per
      slot column);
    - every refused cook, meal or drink is RESENT (`_resendPlayerState`: a v2
      delta of nothing sends nothing), a row or dish the worker never heard of
      included; `caps.cookRows` (how many recipes it cooks) gates every recipe
      row and the Eat/Drink on its dish -- `meals` alone let a newer page offer
      an older worker rows it had not got (TRAPS §9);
    - kill switch `meals: false` (caps.meals false, not absent: the bag keeps
      Eat and Drink); `meals` suite, `mp-meals`: docs/specs/meals.md;
    - since v2.3.3131 (2b) the POTATO (Farming 5, yields 3 -- fertilized 4 or
      5) and the PUMPKIN (Farming 10, 22 h watered), `FARM.V` 2; the GARDEN
      STEW heals 150 at once (`slot: 'now'`, no slot, refused in an arena),
      the PUMPKIN PIE is a meal of +10% combat XP (`_buffs.xpMul`, read
      bounded in prog3.js `_prog3AwardXp`, never on flat XP;
      `BUFF_MAGNITUDES` keeps it); a farm record is stamped with what its beds
      HOLD (`_farmShape`: a potato or pumpkin makes it a 2), and
      `caps.farmCrops` (how many crops the worker grows, `FARM_CROP_IDS`
      append-only) gates the Feed & Seed's crops, as `cookRows` the recipes;
    - since v2.3.3132 DIEGO SELLS NO FOOD OR DRINK -- the owner: "Remove all
      of Diego's potions. I want food and drink to come exclusively from
      farming and recipes": `DIEGO_SHELF` is EMPTY (mirror-audit holds it),
      the Stamina Salts' key is brewed from two carrots (recipe row 8, the
      bag's "Stamina Tonic"), he neither buys nor sells cooked food
      (`isCookedFood`; raw fish and crops he still buys), a new world's pile
      starts empty, and the daily chest's 10 fish are RAW minnows; the farm's
      art prompts are `docs/art/FARM-ART-PROMPTS.md`;
    - since v2.3.3133 FOOD COUNTS IN A FIGHT -- the owner: "Farming needs a
      purpose ... temporary buffs (boss fights, PvP, dueling, etc)": the
      damage brew is read in ONE place (combat.js `_brewMul`); in a fight
      with a player a claim marked `nb: 1` is the hit WITHOUT the brew and
      the worker multiplies the clamped claim by its own (`caps.pvpbrew`,
      kill switch `pvpbrew: false`; src/game/fightFood.js `pvpClaim`, every
      shot carrying the brew it was fired with as `brew`) -- the bow volley
      and the staff special never had it; a melee special swing is NOT
      marked `special` (its claim goes out every frame of the sweep and the
      lanes count the hits: the special lane gave it three at the special's
      ceiling); the Element Burst's ceiling is x the brew (a Fury Tonic was
      clipped up to a quarter); the Root Stew cuts 5% of a small hit too
      (chance rounding, not a ceil); and ONE BITE AT A TIME -- a Garden Stew,
      cooked fish or minnow bottle once per `PVP_HEAL.GAP_MS` 15 s in a duel
      or within `WINDOW_MS` 10 s of a hit between players (cooking.js
      `_pvpHealWait`, every road to one incl. the old-style cook; the clock
      on the ROOM, `_pvpHealClocks`, so a rejoin keeps it and no joiner is
      sent it; a held bite answered `eat_refused {wait}`; the page holds its
      own bite back, "Eat again in Ns", on `caps.pvpheal` from the hits it
      saw, never the duel flag, which outlives duels; kill switch `pvpheal:
      false`); `fightfood` suite, `mp-fightfood`: docs/specs/fight-food.md;
    - since v2.3.3134 the FEED & SEED'S ORDER BOARD -- the income half of the
      owner's purpose: an Orders tab, three orders a day per player
      (`server/src/farmorders.js` `FARM_ORDERS.POOL`, append-only), drawn once
      a UTC day from what their Farming and Cooking levels can make, seeded by
      (pid, day) and stored as `farmorders:<pid>` {v, day, ids, done}; a
      delivery (`farm_order {slot, day, id}`, the day and id only a check -- a
      board that turned over under an open window is 'order-stale', never
      another order) takes the goods and pays gold and Farming XP on the live
      player, the board's put and `_saveRpg` in one synchronous run, the board
      first; the record is read FAIL-CLOSED (its done flags are the only replay
      guard: a newer `v` closes the board and is never overwritten, a done flag
      that is not 0 reads as done, a later day is never replaced by an earlier
      one) and a restart KEEPS it; no delivery in a fight with a player
      ('order-fight', the fight-food clock); `farm_open` carries the board
      (null when off, and the window then says the board is closed); at
      midnight an open window asks for the new board itself; every order pays
      more than Diego's opening price for its goods; ~150 gold a day new, 450
      at most; `caps.farmorders`, kill switch `farmorders: false`;
      `farmorders` suite, `mp-farmorders`: docs/specs/farm-orders.md;
    - since v2.3.3135 SIXTEEN CROPS -- the owner: "The main focus is just
      getting a good variety of crops to grow. Then the next step is deciding
      what each one does": ten appended to `FARM.CROPS` (both copies,
      `FARM_CROP_IDS` order, caps.farmCrops 16), each `v: 3` and `FARM.V` 3 --
      five everyday crops (`crop_`: wheat, strawberry, tomato, corn, cabbage)
      and five magic ones (`herb_`, one per land without one: frostberry,
      dewmelon, thunder pepper, gloomcap, heartroot), levels 1-20 in fives;
      NOTHING COOKS THEM YET (the owner decides what each does next: the
      suggestion is everyday meals and one land's-status guard per magic crop);
      glyphs until the 16-crop sheet (docs/art/FARM-ART-PROMPTS.md "Start
      here"); the Seeds tab folds locked crops into one line a level and the
      Plant tool offers only seeds in the bag; the trade window names farm
      goods; farm.test §17 grows every crop: docs/specs/farm.md "The sixteen
      crops";
    - since v2.3.3136 THE FARM YOU WALK -- the owner: "I want your character
      to be able to walk around on the farm. I want the planting process to
      happen by your character taking action on the plot of ground ... use
      the firemaking animation ... Make the timer appear above the crop", and
      of the cave map, "This map isn't suited for a farm":
      - `farm_home` is a 32 x 44-tile farm laid out in `src/data/farmLayout.js`
        (six beds; the barn is the Pet House, a haystack the bed and a notice
        board the Dungeon Workshop until the owner's Farmhouse and Workshop
        pictures; 41 things from the owner's farm art and the Wheel's sheets,
        drawn by `src/rendering/farmWorld.js` at their feet, stopping your
        BOOTS); its ground baked from the owner's Ground Studio swatches by
        `tools/world/bake_farm_ground.py` (`public/maps/farm_v2.webp`, 2 px a
        game px, drawn smooth; the cave's `farm_v1` retired);
      - a bed's NEXT STEP (dig, plant, water, fertilize, harvest: the worker's
        order, `src/game/farmWork.js` `bedNext`) floats over it as the step's
        picture and its timer, in words over the nearest ("4m 12s · Needs
        Watering"); E, a tap on the right stick (wearing the step), the button
        over the dashboard (`FarmBedPrompt.jsx`, a seed picker with 2+ kinds)
        or a tap on the bed KNEELS you at its back for 1.1-1.5 s, then sends
        ONE `farm_act` for that bed
        (`src/game/farmWalk.js`); walking away sends nothing; the bed changes
        only on the worker's answer, a harvest flying to the bag; NO worker
        change, and a farm never described is asked for on arrival
        (`farm_open`, the free deed);
      - the kneel is the COOK'S crouch -- the owner: "Cooking animation might
        be better. You can use something to occlude the part where the pan
        or log is": the cook strip's frames 4-6 (the pan held out, clear of
        the hands) to and fro, worn as the cook wears it (your skin and
        drawings baked in, shirt, armour, hair and hat on their own layers:
        effectsRenderer `_placeCookFigure`, shared with cooking), and ONE
        picture over every layer where the pan is (`_updateFarmKneel`) -- a
        crate of the dug bed's earth (dig), of seeds (plant) or of water, the
        compost bin (fertilize), the crate's straw (harvest), all the owner's
        own art, so it never has to know your look;
        `tools/world/make_farm_covers.py` makes them and the GENERATED
        `src/data/farmCovers.js`, and FAILS if one pixel of the pan shows;
        the firemaking kneel and its mound are gone;
      - the Feed & Seed's window lost its Beds tab: Visit Your Farm on top,
        "Your farm: 3 ready to harvest · 3 beds to plant" under it, then Seeds
        and Orders;
      - every way onto the farm waits under its loading screen for all of it
        (`holdFarmUntilReady`, `src/game/farmTrip.js`), let go on leaving
        (`freeFarmArt`); the map decodes to 22 MB (the cave's 6), held on the
        farm only;
      - `farmwalk` suite, `mp-farmwalk`, `mp-farm`: docs/specs/farm-walk.md.
  - Since v2.3.3120 PET TRAPPING -- the owner: "your trapping level governs
    what level monster you can capture ... The best success rate for the
    lowest tier monster should be about 1%. And each trap should cost at least
    1 wood", "leave the odds exactly the same for everyone", "let people name
    their pets" (docs/PET-TRAPPING-PLAN.md, Phase 1):
    - box traps (`trap_box`) at the Woodworker's Traps tab, one log of any kind
      each (`make_traps`); a TRAP pop-up over a targeted Wheel monster with the
      TRUE odds (`src/data/trapping.js`, held to `server/src/trapping.js` by
      mirror-audit): 1% x 0.8 a stretch, half on reaching the monster's level,
      the best 20 above; grey above your Trapping level ("Requires Trapping N"),
      sending nothing; nothing else moves the odds, no bad-luck rule;
    - `trap_arm` marks it 15 s; at the kill (`_trapRollOnKill`, combat.js, before
      dmgByPlayer is cleared; a slime judged at the blow) each armer with 5% of
      the damage rolls four checks at the fourth root (0-3 shakes drawn in code,
      `src/rendering/trapFx.js`), one trap a roll, Trapping XP every roll; the
      kill's payouts untouched; never in a dungeon or on safe ground;
    - pets live in `pets:<pid>` (`server/src/petbook.js`): worker-made ids,
      `pets_state`, the Pets page (More -> Pets, and the farm's Pet House:
      take out, rename, release), old `lifeSkills.pets` moved in once as
      `legacy`; the join no longer adopts a browser's pets, and a first
      connect's Trapping level and pets are dropped (`trapBootstrapGuard`);
    - a pet is drawn from the pet sheet (`tools/make_pet_sheet.py`, 1.31 MB,
      on the loading screen), out of the trap to you; no more fake pet bites,
      Evolve, Enchant, or sample "Frost Fox"; `pet_capture` answers 'retired';
    - caps `trapping` / `trapcraft` / `petbook` (lower case, kill switches;
      `caps.pets` gone); admin lever `/dev/trapping`; `trapping` suite,
      `mp-trapping`: docs/specs/trapping.md;
    - since v2.3.3121 (Phase 2) PETS LEVEL UP: the pet out with you earns a
      tenth of each kill's combat XP (`_petbookAddXp`, combat.js's XP loop;
      ⌈25 x 1.08^(lv-1)⌉ a level), never past your Trapping level, in memory
      and written once a minute, on disconnect or at a level-up, told on the
      kill's `combat_credit` (`pet`); the Pets page's XP bars and JOURNAL (all
      18 kinds, the uncaught their shapes); BEASTMASTER BRO east of the
      Woodworker's steps (`WHEEL_TOWNSFOLK`, NOT "Beastmaster Kai": a dormant
      chain keys on that name; art by `tools/make_beastmaster.py` until the
      owner's, prompt in docs/ART-WISHLIST.md) with beast_1..4 -- make 3 traps,
      spring 5, reach Trapping 6, catch a pet -- checked by the worker's new
      objective types (`traps_made`, `trap_roll`, `skill`, `catch`; quests.js
      `_questObjectiveMet`), gold and box traps, no XP to place; his line waits
      on tut_1 (`after`), walking past him never stops you for his progress
      (`quietProgress`), and a tap once it is done opens the Pets page; caps
      `petlevels` / `beastmaster`; `trapping` §16-17, `mp-beastmaster`;
    - since v2.3.3122 (Phase 3) PETS CHANGE HANDS: the trade window's pet lane
      (`trade2_pets`, validate-at-commit: a staged pet stays in its record and
      moves at the commit with the other debits, all out then all in), the
      auction house's `kind: 'pet'` (escrowed in the listing, listed from the
      Pets page) and the `pet` mail kind (STAYS QUEUED when the collection is
      full; the join loads `pets:` BEFORE the mail drains); the gate is
      `_petSellable` -- not out with you, not `legacy`, a day past its catch;
      a new owner is one more `owners`; cap `pettrade`; `pettrade` suite,
      `mp-pettrade`;
    - since v2.3.3123 (Phase 4) PETS MATTER: the pet out with you WARDS its
      land's element (`_petWard`, applied in monsterstatus.js `_elemOnHit`):
      15% at Lv 1, +1 a level, at most 50% at the level it works at -- a
      chill / hold / daze / soak shorter, a burn's or poison's ticks and a
      storm arc on you lighter, a gust's shove (and its allowance) shorter,
      never the hit itself; the hit says `wd`, the pet rings and says "Ward
      n%"; GOLDEN and BIG catches are revealed (trapFx rays and ring, "Golden!"
      / "Big one!", the card's glow, sweep and swelling badge, game.css
      `bt-pet-*`); the OTHERS SEE YOUR PET: `pw` on your tick record (not `pt`, the pants)
      ('kind.stage.gold.size.lv', `petWireOf` / `parsePetWire`, `_petWire` in
      memory), drawn beside you with no name (`_updatePeerPets`, `_posePet`
      shared with yours); MORE ROOM: `pet_house_buy {cap, confirm}` 10 places
      for 1,000 gold, each step 1,000 more, to 120, a stale `cap` refused;
      caps `petwards` / `petshow` / `pethouse`; dev `look: {gold, size}`;
      `petsmatter` suite, `mp-petsmatter`. Phase 5 waits on the owner.
  - Since v2.3.3139 HARDENING TAKES BARS OR HARDENED WOOD AND ITS GOLD
    DOUBLES -- the owner: "hardening should cost 1 bar per level (hardening
    lvl 1 cost 1 bar, hardening lvl 2 costs 2 bars, and a doubling gold cost
    per level)", "I meant 1000 for lvl 2, 2000 for lvl 3, etc", and for bows
    and staffs "Maybe 5 logs of the raw material can make one 'hardened
    (name) wood' raw material so it mirrors the same structure. Also for the
    number required and gold too":
    - the attempt at H(n) takes n of the weapon's MATERIAL and 500 x 2^(n-1)
      gold -- 500, 1,000, 2,000, 4,000, 8,000 (was 500 x 4^H, to 128,000),
      won or lost; the odds unchanged (80/20/5/1/0.5%);
    - a sword its metal's BARS by its material tier, the Smithing gate's own
      index: tiers 1-2 copper, 3 iron, 4 and up black steel
      (`HARDEN_BAR_BY_TIER`); a bow or a staff its own wood's HARDENED WOOD,
      pine to maple, then maple (`HARDEN_WOOD_BY_TIER`, `hardenIsWood`: a
      `ww_` gearBase or the bow's/staff's slot) -- `hardenMaterialFor` in
      server/src/hardening.js, the game's copy src/data/hardenCosts.js,
      mirror-audit;
    - HARDENED WOOD at the Woodworker's new Harden tab (Bow/Staff/Traps/Harden
      two by two): five logs of a tree make one `hardened_<wood>` (never a
      `wood_` key, which the game takes for a log), smelting's shape --
      Woodworking 1/5/10/15/20, 400 to 1,200 XP, `make_hardened_wood`
      {key, count} -> `hardened_wood_result` (server/src/hardenedwood.js,
      src/data/hardenedWood.js, HardenedWoodTab.jsx); icons made from each
      log's picture by `tools/make_hardened_wood_icons.py`; the shop's
      `hardened_` family at 144;
    - checked after the gold (`no-materials`, "Need 3 Iron Bars", "Need 1
      Hardened Pine Wood"), taken with it before the roll; `harden_result` and
      the ledger carry `material`/`amount`;
    - `caps.hardenmats` (kill switch `hardenmats: false`: the old ladder, no
      material) and `caps.hardenedwood` (`hardenedwood: false`: no making, and
      bows and staffs back on gold alone); `hardening` §8b/§8c, `hardenedwood`
      suite, `mp-hardenbars`: docs/specs/hardening.md, hardened-wood.md.
  - Since v2.3.3140 DAILY REWARDS, NOTHING AT LOGIN -- the owner's layered
    brief ("a small reward just for logging in, daily quests ... feeding a
    longer progression track"), then: "I find the login page with the chest
    intrusive ... a free daily spin from the gambling building", and its twist:
    "Your first spin is for a lump sum award ... Then you have the option of
    spinning it for double or nothing at 50% odds and that continues on"
    (server/src/dailyrewards.js):
    - the login pays NOTHING (no daily chest, no window; a chest still held
      opens from the bag) and settles a FORGIVING streak (cadence.js: a freeze
      every 7 days, 2 held, spent on a missed day);
    - the FREE DAILY SPIN tops the Gambling Den's window (DailySpin.jsx): a
      prize wheel lands a LUMP SUM (`SPIN.PRIZES`: 25 at 40% ... 10,000 at
      0.1%, +10% a streak day to +60%) as a POT, then TAKE IT or DOUBLE OR
      NOTHING at 50% (the wheel turns x2 / ✕), again and again up to the
      house limit `POT_MAX` 100,000 (paid by itself); the pot is money at
      rest in the record, paid once a run (`spinpot:<pid>:<run>`), and one
      left open is paid at the day's end; bonus spins start more;
    - THREE DAILY QUESTS once tut_1 is in (fight, gather with a tool, one
      more; one free reroll from ANY group; paid on completion; all three =
      +1 star and a bonus spin), counted by `_drSignal` at the kill / gather /
      cook / smelt choke points;
    - a 28-day SEASON of 25 tiers (stars from quests, all-three, the spin;
      claim or "Claim all"; unclaimed tiers mailed at the season's end);
    - the Daily Rewards window (DailyRewardsWindow.jsx) opens only from the
      Quests tab's card and the Gambling Den; the Quests dot lights for a
      tier to claim; `daily_rewards:<pid>`, caps/kill switches `dailyspin`
      and `dailyquests`; `dailyrewards` suite, `mp-dailyrewards`:
      docs/specs/daily-rewards.md.
  - Since v2.3.3142 WORN ARMOUR SHOWS ITS GRADE -- the owner: "change the
    outline hue or something on the armor so it retains the color but has
    highlights. So rare is blue, elite is orange, godly is prismatic":
    - the metal sheen's own filter (lightfx/glint.js `GRADE_LOOK`, the shader's
      `uGrade` block; no new pass, no textures) draws the worn torso's and
      greaves' edge, ~1.4 CSS px inside the silhouette (`GRADE_RIM`), in the
      grade's colour and lights their highlights in it; godly a drifting
      rainbow; a standing set's waist seam is not outlined (`uRimSkip`), a
      jogging full set all round; drawn with the light effects off too;
      weapons unchanged -- a godly WEAPON keeps its gold gleam, godly ARMOUR
      shines in its metal;
    - everyone else's from the worker: `eqg` on the tick's player entry, two
      letters n/r/e/g, absent in plain armour (gearprov.js
      `armourGradeWire`), counted by combat's rule (godly only when minted, a
      legacy piece's described rare/elite as worn); yours by `seenGrade`; a
      grade-only swap marks you dirty (`_gridsApplyArmor`);
    - the bag and cards match: elite ORANGE `#E8893A` (was purple), godly's
      ring a rainbow and its name rainbow text (`qualityInk`, dash/common.js),
      gold kept as godly's one solid colour (the drop reveal's frame);
    - the admin panel's Rare / Elite / Godly armor (`/dev/kit` `quality`);
      `quest_reward_stashed` dedupes by the worker's id when it has one (a
      second minted Iron Torso was dropped as a "replay");
    - `armorgrade` suite, `mp-armorgrade` (15): docs/specs/armor-grade-look.md.
  - Since v2.3.3146 THE BRO LOOKS LIKE HIMSELF WHILE HE GATHERS -- the owner:
    "The character's appearance changes during resource gathering activities.
    It needs to stay consistent" (docs/specs/gathering-look.md):
    - mining and fishing size hair, hats and beards to the HEAD: `poseTraitMul`
      1.21/0.88 -> `MINE_TRAIT_MUL` 1.116 / `FISH_TRAIT_MUL` 1.07 (the skull's
      top, tune_headwear.py `sheet_head`: 48/46 against stand's 43; the
      numbers every poseFit item already had), mirrored in the four tools;
    - FISHING WEARS YOUR SKIN, TROUSERS AND BOOTS (`getFishFrame(art, f, skin,
      pants, shoes)`, `prewarmFish` for everyone, `POSE_SKIN_FLOOR` + fish):
      the rod never needed the raw sheet (its key is b > g); the boot-grey LINE
      did, and `recolorBodyToCanvas(..., bootsUnderLegs)` paints boots only
      under the trousers; ~1.2 MB of canvas per player;
    - the LUMBERJACK, COOK and FIRE-LIGHTER WEAR YOUR TROUSERS AND BOOTS
      (playerSkins `_standInClothes`: the trousers' big pieces, boot pieces
      mostly below their hem -- the pan held at the waist goes whole;
      `pantsWide` for the fire's glow); a peer's cook/fire-lighter is your
      bake (the v2.3.1713 trade), a drawn peer's lumberjack theirs (every
      peer's is theirs since v2.3.3314, below);
    - the cook's head traits 1.16 -> 1.65 (`_skillTraitMul`: his head 85 px
      against stand's 51);
    - then, offered what was left, the owner: "Yes fix all":
      - the three are YOUR SIZE -- the walking figure is drawn
        `PLAYER_SIZE_MULT` 1.25 on its container, which no stand-in carries,
        so every earlier tune was by eye against a figure 25% bigger:
        `CHOP_STANDIN_H` 104.5 -> 136.8 and a shared `FIRE_STANDIN_H` 154 ->
        142 (upright: crown to boots 105.7 world px, yours), `COOK_STANDIN_H`
        65.1 -> 73.9 (crouched: his head, 28.5 px, yours); `CHOP_OFFSET` 30 ->
        44 keeps the axe biting the trunk; hats, armour, the pan and the farm
        kneel follow;
      - YOUR SHIRT'S PRINT AND PATTERN on the three AND the sword swing and
        bow shot (`_dressedShirtFrame`: `composeShirt` on the strip with its
        `frameW` -- stampShirtArt sliced square frames -- the pattern's cell x
        `SHIRT_PATTERN_K`, the strip's figure over the 128 sheet's 94.5 px);
        only for a printed or patterned shirt; your three gatherers baked
        behind the loading screen and 0.4 s after a shirt change, the rest on
        first draw; `DRESSED_MAX` 10, GPU only;
      - the ORE'S CRACK AND POP never skipped by a late frame: the split is
        played before the 950 ms break is let go of, up to `ORE_POP_LATE_MS`
        3 s (`_oreSplit`);
    - QA `display._bodyScale`, `window.__btStandInClothes`,
      `window.__btDressedShirt`; `mp-gatherlook`.
    - since v2.3.3314 ANOTHER PLAYER GATHERS IN THEIR OWN COLOURS -- the
      owner: "Other players cooking showed wrong skin color and maybe other
      stuff too. Needs fixed":
      - a peer's cook and fire-lighter were YOUR figure (the v2.3.1713 trade:
        your skin, and since v2.3.3146 your trousers and boots), an undrawn
        peer's lumberjack the unpainted art;
      - now effectsRenderer `_peerFigure` picks the figure: yours only when it
        is made and they wear your colours (`_cookLook`/`_fireLook`/
        `_chopLook`, the last only with no drawings on either of you), else one
        baked for THEIR colours by the same recipe (`_peerFigFrames`,
        `_peerChopFrames` now for every peer), keyed by the colours, not the
        player (`_standInColourKey`);
      - until it is made their walking body stays drawn: entityRenderer asks
        `peerStandInReady` (standIns.js, the effects renderer's answer, a look)
        before it hides the body, in the same frame -- never neither, never
        both; in greaves the strip with legs stands in while the legless one
        bakes, never a legless one without greaves;
      - ONE ALLOWANCE for all of them, `PEER_FIG_BUDGET` 16 MB (`_peerFigRoom`:
        a cook 4.5 MB, a fire-lighter 6.3, a lumberjack 2.0 -- about eight
        lumberjacks, three cooks or two fire-lighters), GPU only, released 15 s
        after nobody drew one; past it, a figure nobody drew in the last second
        gives way, else the next peer stays in their walking body; a failed
        bake waits 15 s, a strip that never answers gives up after 15 s, and a
        peer's greaves are waited for at most 3 s;
      - a peer's cook or fire-lighter no longer makes YOURS (`_standInTriggers`;
        it was 9 MB for the cook, kept for the visit); a peer's lumberjack
        still does (every peer's is cut from its crops);
      - QA `remoteSkillProbe(id).shared`/`.legless`, `peerFigBakes()` (with
        `bytes`), `peerFigTry`, `window.__btSetSkin/Pants/Shoes`;
        `mp-peercolours` (fails on the old
        code: every recoloured pixel of a peer's cook and fire-lighter the
        watcher's): docs/specs/peer-gather-colours.md.
  - Since v2.3.3146 THE TOWN'S BUILDINGS ARE ON THE MINIMAP -- the owner:
    "Also all the buildings in town should show on the minimap": each
    standing building's footprint where it stands (wheelMinimap.js
    `_buildTown`, from `wheelTownDoors()` and the placed objects' boxes,
    ~17 x 9 px), terracotta, a shut one grey, a light notch at its door; the
    town's white square only without them; `__btMinimap.buildings`,
    `mp-wheelmap`: WORLD-MAP-PIPELINE "The town's buildings on the minimap".
  - Since v2.3.3277 YOUR PARTY IS ON THE MAPS -- the owner's "Yes do
    suggested", the party's map-markers follow-up (ARCHITECTURE-HANDOFF D):
    each member in the party's blue (the UI's Info blue `#5D93D2`, ringed
    light then dark), never also a green bro: on the Wheel's minimap 15 px,
    and OFF the box riding its edge toward them at 11 px (the quest star's
    clamp, `clampToBox`); on the world map at every zoom, named, the key
    saying "party"; on the dungeons' and farm's 52 px box blue and ringed (its
    townsfolk are a blue of their own); `src/game/partyMarks.js`; nothing new
    sent -- presence v2's roster already carries the party whole wherever they
    are; `__btMinimap.party`, `__btWorldMap.more.party`; `party-marks` suite,
    `mp-partymap`: docs/specs/party-on-maps.md.
  - Since v2.3.3284 A PARTY LASTS -- the owner: "skip clans altogether and just
    go from party to alliances ... 'party' that stays persistent until you
    remove yourself from the party and it becomes 'alliance' at 20+ people",
    then "Go recommended" to the plan's five recommendations; this is step 1 of
    3 (2: the alliance at 20+ ACTIVE members, back below 15; 3: clans retire
    into it) -- docs/specs/party.md "A party that lasts":
    - STORED (`party:<id>`, `party_by_player:<pid>`, the index the truth): it
      outlives a logout, a reconnect and a deploy; offline members stay
      (`off`, `seen`), up to `PARTY.KEEP_MAX` 50; written only on roster
      changes (and a member's `seen` at a join, every 6 h at most), read at a
      member's join (awaited in join.js, after state_sync); a failed read
      fails closed (`not-loaded`), a newer `v` untouched; a leader not seen for
      7 days hands it on at a member's join; a character restart leaves it;
      the roster echo skips a party with nobody online;
    - dungeons stay FOUR: the leader pulls the three members nearest them
      (`_dungeonPullPartyMembers`; the boss table is sized for four);
    - the strip shows SIX rows (src/game/partyRows.js: you, the online members
      nearest you, the rest online, the offline most recently seen first),
      "+N more · M online", "n/50", offline rows without a bar, leaving in two
      taps; the Saloon lists everyone;
    - `caps.partykeep`, kill switch `partykeep: false` (the party of four in
      memory, nothing read or written -- party.test.mjs runs under it);
      `party-keep` suite, `mp-partykeep`.
    - since v2.3.3313 STEP 2, THE ALLIANCE -- the owner: "Push to main, then
      keep going on recommended", to the four decisions it waited on
      (docs/specs/alliance.md, server/src/alliance.js):
      - a party whose ACTIVE members (online, or `seen` in the last 7 days,
        AND level 5+: ps.level, a new character is 3) reach `ALLIANCE.AT` 20
        is an alliance until they fall below `DROP` 15; counted at a member's
        join, accept, leave, a rename, a war and the 2 s vitals echo, never an
        alarm; a flip is the only write; `became` on party_state;
      - the leader's NAME and TAG (`alliance_name`, once a day, 3-16 chars and
        1-4 letters/numbers, unique across every alliance -- kept while its
        party lasts -- and every clan, both ways: clans.js checks the
        alliances); the tag on every member's plate as `[TAG] Name`
        (`allyTag`, worker-set only, on no track/join list: PEER_PUBLIC_KEYS,
        nearjoin LIST_KEYS, a `player_update` with hg/fr on a change, forced
        at a member's join), the strip's head `[TAG] 22/50`;
      - WARS (`alliance_war {tag}`, the leader of a named alliance): 30 min,
        rosters frozen at the declaration, a kill scores only under No man's
        land's rule (the victim's last blow the killer's, within
        `NML.KILL_BLOW_MS`; `_allyWarOnDeath` beside the clans' hook, never a
        duel's), pays roster members who fought and are still in the party
        500 / 50 (0-0 nobody; opIds `allywar:`), an hour's rest after, read
        back from the ended wars after a deploy;
      - the BOARD (`alliance_board`, any player, one answer a 5 s): by active
        members, then levels added up; an alliance nobody is on counted from
        its `ally:<partyId>` row, written WITH the party record (one batch:
        `_partyStore` -> `_allyRowPut`) and deleted with it, its `act` each
        member's [seen + 7 days, level];
      - a record that has been an alliance is shape `v: 2` (PARTY.V), one that
        never was stays 1 (a rollback reads it); `ally_war:<id>` kept 48 h;
      - the phone: the Saloon's Alliance part (AlliancePart.jsx: n/20, the name
        form, the war and Declare war, the board), the answers in wsClient's
        direct switch (`alliance_rows` / `alliance_error` /
        `alliance_war_end`, PRIVILEGED), moments over you and in the chat;
      - test lever `/dev/combat {skill | 'all', level}`; `caps.alliance`, kill
        switch `alliance: false` (off with `partykeep: false` too; tags off at
        the next echo); `alliance` suite (96), `mp-alliance` (a phone, 39
        bots, a second phone watching the plate).
    - since v2.3.3321 STEP 3, CLANS BECOME PARTIES (server/src/clanparty.js,
      docs/specs/alliance.md "Step 3"):
      - no new clans: `clan_create`, `clan_join_accept` and `clan_war_declare`
        answered "Clans are parties now: make a party in the Saloon", and a
        `clan_invite` is no longer relayed;
      - every clan becomes a stored party once, at `_clansEnsure` (every
        join): its members in no party yet, its leader leading (else its
        oldest), its name and tag as `ally` with `clan: 1`, names from the room
        or `char:`; the clan's `clan:`/`clan_by_player:` rows deleted in the
        same run as the party's writes; fewer than two free members, no party
        and the name freed; a clan at war converts after its war's own writes
        (`_clanRestPending`, `_clanPartyAfterWar`); whoever is online told at
        once (`_clanUntag`, `_allySetTag`, party_state `fromClan`);
      - a former clan WEARS ITS TAG BELOW 20 (`_allyTagOf`: `on || clan`, the
        strip's head `data-party-head="clan"`); renamed only at 20, like any;
      - the phone, on `caps.clanparty` (beside partykeep): the clan window, the
        dashboard's Clan page and the Guild Hall's row point to the Saloon,
        their Find a party opening the player list
        (`__broLegacyUI.playersOpen`); no Invite to Clan; the Saloon names a
        former clan; inspect card, profile and leaderboard show `allyTag`
        first;
      - kill switch `clanparty: false` (and `partykeep: false`): clans as they
        were -- `clans`, `duel` §16, `alliance` §5/§10, `mp-clan` and
        `mp-wheelhalls` run under it (`H.liveFlag`); `clan-party` suite (54,
        13 broken rules caught), `mp-clanparty`.
  - Since v2.3.3279 THE OWNER'S SMALL ICONS -- asked what ChatGPT could draw to
    replace the emoji and code-drawn pictures, the owner sent four sheets
    ("Here's the art assets for the 'small icons'"), cut by
    `tools/ui/cut-small-icons.py` from `assets/icons-source/sheet-small-*.png`
    (found by their own alpha, rows and icon counts asserted, each at the size
    it is DRAWN -- 64 px marks, 160 px buttons, 128 px popup -- as a shown or
    warmed picture is held decoded at its own size):
    - a party member's plate wears the party badge (was 🎉 in the name;
      `_drawPlateCapsule`'s `party`), the party window its pictures (🎟️ 👑 💀
      📍), the threat skull is the owner's (a Sprite still called
      `_skullText`, tinted red as before), each townsperson the talk bubble in
      the quest badge's place while he has no quest (was an 8 px ★), the chat's
      party/area/whisper lines their bubbles (`chatLaneOf` reads the 🛡/📍/✉
      the names still carry), the eight buff badges, and "Defense Lv N" the
      shield (popup key `defense`, `iconLead`);
    - the five ability buttons and the right stick's talk, door, sleep and farm
      steps are the owner's pictures (controlSkin `abilityArt`; a baked `-grey`
      copy for the greyed states, never a CSS filter; the burst keeps a faint
      element ring);
    - `src/data/smallIcons.js`; DOM ones warmed in controlsPreload.js, the
      canvas's three loaded by `preloadSmallIconTextures`; `__btNpcMarks`, the
      peer badge probe's `party`/`skull`; `small-icons` suite, `mp-smallicons`:
      docs/specs/small-icons.md.
  - Since v2.3.3281 THE OWNER'S BAG ICONS -- the five sheets of the bag-item
    prompts ("Here are the art assets from the 5 other prompts"), cut by
    `tools/ui/cut-bag-icons.py` from `assets/icons-source/sheet-bag-*.png`
    (the Object Studio's magenta key, plus see-through steam; every piece in
    its grid cell; the item set's 256 px frame), 53 in all:
    - the sixteen seed packets and crops and the compost sack (`farmIconFor`,
      data/farmCrops.js), the five dishes (data/dishes.js `icon`), the box trap
      (`TRAP_ICON_URL`: the TRAP pop-up, the Traps tab, the bag), and the
      hardened woods and essences under their old file names (the generators
      that drew those refuse without `--standins`);
    - the bag's `thumbFor` draws them wherever it is read; the Feed & Seed
      Seeds tab sells packets and the sack; the Cookhouse's rows lead with what
      they make; the quick-eat Garden Stew is warmed on the loading screen;
    - `bag-icons` suite, `mp-bagicons`, `mp-farm`: docs/specs/bag-icons.md.
  - Since v2.3.3209 THE MONSTER CODEX -- the owner: "After you kill a monster
    you learn more about it, what it does, where it's from, elemental type,
    special attack, (make up a backstory) etc.", "Also include drop tables
    for all items that monster can drop", and with a mockup: "I want all the
    facts revealed after just 1 kill ... change the structure of each monster
    entry to look like this" (docs/specs/monster-codex.md):
    - More -> Codex -> Monsters (was the always-empty Bestiary): a card per
      kind, the pets' nine; its WHOLE page opens at the first kill the WORKER
      counts (`server/src/codex.js`, `codex:<pid>`; `codex_state` at join,
      `cx` on the kill's combat_credit; `CODEX_OPEN_AT`, `CODEX.TIERS` [1]);
    - the page is the owner's mockup: a header (portrait, name, Lv / element
      / creature-type badges), Drops (ITEM / TYPE / CHANCE with bars; a tap
      opens the item's card: FOUND FROM, BASE DROP CHANCE, the four grades it
      rolls), Info (the stage and every fact) and Locations (land, stages, the
      road from BroTown, its dungeon); on the sheet's ONE height, scrolling
      (the owner: "Stay short and scroll"), a tap's result put in view
      (MonsterCodex.jsx `reveal`: a page or card from its top, a tab's content
      at the sheet's top, the row or card you came from); the type badge is
      the creature's BODY, the owner's "humanoid, beast, ..." (`CODEX_TYPES`:
      Humanoid, Beast, Winged, Insectoid, Aquatic, Ooze);
    - its STAGE plays it beside your character, the Points preview's make
      (`CodexStage.jsx`, `data/codexStage.js`): its own strips, loaded when
      the Info tab opens and freed when it closes (the owner's call, against
      ~20 MB for all nine up front: "I think loading only when you open the
      info tab"), the world's wind-ups and
      warning circles; a near-black scene in a frame, everyone standing ON
      its land-coloured ground strip and nothing ever past the frame (the
      owner saw them "in a layer above the container", feet "visible on the
      dashboard container"; `GROUND`, `onDrawn` feet, strips cut at their
      feet, isolated, no `will-change`); the Drops table on near-black too,
      readable on it (the owner: "more readable with the background"):
      striped rows, a heading band, names that wrap, bars by how common
      over powers of ten (`barWidth`); and the bar gets the room (the owner:
      "Wrap text for the item name and increase the usable area for the bar
      size. Looks like the chance column reserves too much space"): the
      chance column one number wide (`PCT_W` 40), the bar 1.2x the name's
      share, 117 px on the QA phone where it was 44; and then (the owner:
      "All drop chances should be a single value. Also make the percentage
      bars out of 100%") every chance one number and the bar its share of
      100% (`barWidth`, a 2 px nub for the rarest), with the owner's DICE
      ("a 'roll-based system' where you see dice and number", their pick
      "Each drop's own roll"), shown as the owner then asked ("'roll' column
      with a number range and drop chance percentage in parentheses"): a ROLL
      column (the dice in its heading), each row the numbers of a kill's roll
      of 1 to 10,000 that drop it over its chance, "Always (100%)" for gold
      and remnants;
    - ONE ROLL A KILL, EACH DROP ITS OWN NUMBERS (the owner: "Shouldn't these
      numbers not overlap each other? Getting a roll of 1 implies you'd get
      all the loot with 1 ... That way a player hunting for something can
      also be looking for a roll number within that range"):
      `server/src/killroll.js` rolls once, 1 to 10,000, and each drop that is
      not on every kill owns its chance x 10,000 numbers from 1 up, the
      rarest first (`KILL_ROLL.ORDER`, `killRollLayout`): a snowman's nugget
      1, Iron Great Sword 2–21, Greaves 22–41, Torso 42–61, Rare Gem 62–111,
      raw gem 112–611, shard 612–1,611, nothing more past it (the blue slime,
      no raw gem: its shard 112–1,111); each chance unchanged, a kill drops
      ONE of them at most (each had its own roll: ~1 kill in 170 dropped two);
      who gets each is as before; a Workshop run's share is one more draw on
      its numbers; `disable_weapon_drops` leaves the blade's numbers dropping
      nothing; the roll functions called with no roll roll on their own (the
      kill switch's path, and the old suites');
    - THE ROLL IS SHOWN: combat_credit `roll` to everyone credited and `rh`
      (the drop's codex row id) to whom it is theirs (`_killRollTheirs`); the
      game shows it over the monster (`src/game/killRoll.js`), the Gambling
      Den's dice in FRONT (`/icons/popups/dice.webp`, the popup's `dice` mark,
      `iconLead`), "7,431" grey (gone in 2.4 s) or "640 Frost Shard" gold
      (3.2 s), a message not a damage number (`roll: true`), over you when
      the monster is off your screen; the codex's ROLL column the same numbers
      (`codexRollLayout`, `ROLL_W` 64; an older worker's 1 to each drop's own
      number, `shared: false`), mirror-audit holding it to `killRollLayout`
      for every kind; `caps.killroll`, kill switch `killroll: false`, dev
      lever `/dev/killroll {next, kill}`; `killroll` suite, `mp-killroll`;
    - NO RANDOM WEAPON OFF A KILL (the owner: "Remove 'a random weapon'
      drop", then "Remove it from the game"): `_rollWeaponDropForKill` and
      its level curve are gone, a kill's one weapon the Iron Great Sword's 1
      in 500 (`_rollIronWeaponForKill`); `caps.weaponDrops` stays true for it,
      `disable_weapon_drops` still stops it; `drops` suite §6b;
    - the drop table (`data/codexDrops.js`) prints the worker's own rolls --
      `SHARD_MONSTER_DROP` (data.js), `WEAPON_QUALITY_ODDS` (hardening.js) --
      and mirror-audit holds it to them and to the Wheel's real monsters
      (gold, remnants), every chance a whole number of the die's faces:
      change a drop rate and the page changes with it, or the audit fails;
    - `caps.codex`, kill switch `codex: false`, dev lever `/dev/codex`;
      `codex` suite, mirror-audit, `mp-codex`.
    - since v2.3.3215 THE CODEX HAS ITS OWN BUTTON, AND MORE OF IT FITS -- the
      owner: "Are you able to fit the codex as another dashboard button? Also
      is there a way to display more data without needing to scroll down so
      much?":
      - SIX buttons on the dashboard's row (Dashboard, Character, Quests, Life
        Skills, Codex, More), the Codex's counting its NEW pages
        (`codexFreshCount`); More's Codex tile opens the same destination.
        Asked whether to narrow all six or move the drill's back arrow, the
        owner: "Move back arrow": a drilled panel's header is one button,
        "◂ SETTINGS" (BottomDashboard `data-dash-back`), the row the CLOSE
        pill and the buttons in every mode -- 44 px at 390 (five were 46), 39
        at 360 (sheetGeometry `IDENTITY_MIN_LINE` 84, `RAIL_COUNT` 6), and the
        buttons no longer step right when a drill opens; sideways
        `LAND_NAV_BTN_W` 26, the side column 238 px;
      - the codex on the 191 px sheet: all nine cards at once (compact, two
        across sideways), the Codex's three always-empty tabs aside, a 48 px
        header, the tabs PINNED to the sheet's top with "‹ All monsters" their
        first button, Info's stage scaled to fit under them (`StageFit`), and
        tighter rows -- a page's first look shows its table (was all header),
        Drops/Info/Locations scroll 301/730/131 px (were 482/907/266);
      - `mp-codexfit`: docs/specs/monster-codex.md "Its own button".
  - Since v2.3.3241 A CROWD COSTS THE PHONE LESS -- found by the owner's
    "stress test to see what can be optimized" (`mp-crowdbots` with the bots
    spread out: 12 of 150 on screen cost a phone's frame as much as all 150):
    - in the Wheel, a player past the view's half-diagonal plus
      `PEER_FAR_MARGIN` 400 from its middle is not drawn, the monsters' rule
      (entityRenderer `_updateOtherPlayers`): hidden, nothing else done that
      frame, no figure MADE until near (a join into a full Wheel built every
      player's figure in one frame), kept once made; nothing of theirs
      either -- pet, glint, gathering/swing/shot stand-ins, trails, status
      looks, bubbles (`S._peersNotDrawn`, effectsRenderer `_peerNotDrawn`);
      `S._peersFarHidden`;
    - the peer loop no longer fights the depth pass: it moved every player
      south of you back into the entity layer each frame and the pass moved
      them out again -- two re-parentings a frame each, and Pixi rebuilt the
      world's draw list for them; the front layer is now an accepted place;
    - THE CROWD CAP, Phase 0a of docs/SERVER-SPLIT-PLAN.md as the owner chose
      it: of the players near enough to draw, the nearest `CROWD_K` 50 in
      full and always your party, target, duel and whoever is fighting you;
      the rest not drawn (the minimap still shows them), the edge held
      `CROWD_HOLD` 8 places so it does not flicker (src/game/crowdCap.js,
      `crowd-cap` suite); `S._peersCrowdHidden`; `?crowd=K`, `?crowd=all`;
    - measured on the QA box (`mp-crowdbots`): 150 players spread out, the
      frame's work 36 -> 20 ms; 150 on screen, 31 -> 21 with the cap;
    - `?nopeercull` is all three off; `mp-peercull` (two phones),
      `mp-crowdbots` `BT_CROWD_QUERY`: docs/specs/peer-cull.md.
  - Since v2.3.3258 EACH BUILDING'S ROOM IS THE BACKGROUND OF ITS MENU, AND A
    KEEPER OPENS HIS BUILDING -- the owner sent seventeen pictures of the
    buildings' insides ("Ok wire these up"), then, asked whether to walk inside,
    see a still picture or meet the shopkeeper outside: "Yes I like your idea
    of interacting with the building's NPC instead of having the building
    interiors. Have it open up as backgrounds behind the different buildings
    menus instead of literally going into a building":
    - nobody walks in: the window opens over the street, and its room
      (`src/ui/panels/buildings/BuildingRoom.jsx`, once, first in the card;
      `BUILDING_ROOMS` in src/data/buildingRooms.js, the `buildingPanel` -> its
      plot's `public/world/interiors/<plot id>.webp`, 1152 x 768 lossy WebP from
      `tools/ui/make-room-pictures.py`) is the card's BACK LAYER (z-index -1,
      the card isolated): 3:2 at the card's width, the menu a STAGE down it
      (`--room-stage`, 62% of the room's height = min(148.8px, 41.33vw -
      9.92px, 22vh), written out from the card's inline width -- change one,
      change both), the panel's own surface and its title strip's (its first
      child, in all sixteen) taken away so the title is written on the room, a
      shade fading the room into the slate 80 px under the stage; it scrolls
      with the menu; the forge's stage a quarter-width band (its card sits
      low); sideways (under 460 px tall) none of it applies (a min-height
      query) and the room steps aside; no panel touched; sixteen windows, the
      Hotel's (shut) waits in `SPARE_ROOMS`;
    - THE KEEPERS (`WHEEL_KEEPERS` in wheelBuildingDoors.js, `keeperOf` set by
      `_spawnWheelNpcs` where the building stands): talking to him -- a tap,
      E, the right stick's tap, each AFTER his quest -- opens his building
      through the door's own path (interactions.js `enterWheelDoor`: the same
      window, the same visit counted): Blacksmith Bro the forge, Mayor Bro the
      Town Hall once he has no quest; Diego and Ace keep their own windows; the
      other twelve buildings keep their doors until the owner's keepers are
      made (docs/ART-WISHLIST.md "The keepers"); every door still opens;
    - THE SALOON IS THE SALOON -- the owner: "the gladiator arena is showing
      'saloon' behind it": the Saloon's door (`party`) had opened the arena
      (PartyPanel) since v2.3.881; the arena is its own window, `arena`, no
      room behind it, from the Sheriff's Office's "The arena", and the
      Saloon's window is `SaloonPanel` (WheelHallPanel.jsx): your party and
      Find a party;
    - the Land Office's window was a separate z-30 dialog UNDER an empty card
      and is a panel in the card now (`LandOfficePanel.jsx`); a tall window's
      ✕ lay under the world map's invisible z-45 "open" button -- any
      `.bt-inspect` up now lets taps through it (game.css);
    - NONE ON THE LOADING GATE: the door you stand at decodes its room, a cap
      of one (game/buildingRooms.js `warmRoom`), and the first shop's or
      hall's door (not the Town Hall's: `HUB_ROOMS`) starts the others' bytes
      coming at low priority, never decoded or held; cached a year, asked for
      at `?v=` `ROOMS_V`;
    - the Auction House's clerk is drawn into its room (`ROOM_KEEPERS`); THE
      TOWN HALL IS THE FOURTH HALL (`WHEEL_HALL_DOORS.townhall`: the
      Leaderboard and the World map, the owner's "a Town Hall window");
    - QA probe `window.__btBuildingWindow.open(panel)`; test-world-core "the
      buildings' insides" and "the keepers", `mp-buildingrooms`,
      `mp-wheelhalls` §7: docs/specs/building-rooms.md, wheel-halls.md.
  - Since v2.3.3259 ONE GEM BUILDING -- the owner, after the Assay Office's name
    came up ("what does that even mean"): "I think one gem building is enough
    and can do both the gem cutting and gem setting maybe with two different
    NPCs in the same building"; asked what to do with the Assay Office's plot:
    "Remove it"; the name they chose: "Gem Works" (docs/specs/gem-works.md):
    - the Assay Office is GONE: its plot (plan.js, both lot lists), catalog
      entry, manifest row and `buildings-14` sprite page, yard crate, life
      spots, material row, door and room picture (`assay.webp`); the Bank stands
      alone on the east street's north side and nothing else in the town moved
      (the gates stay 1,326 / 1,447);
    - the Gem Cutter's building is the GEM WORKS (plan, catalog, manifest; its id
      stays `gemcutter`, its sign GEMS covers both jobs, so nothing was
      repainted): one door ("Enter GEM WORKS"), one window with two tabs on its
      one room, Cut gems (GemcutPanel) and Set gems (EnchantPanel), both panels
      UNTOUCHED, each in a body padded 20 px to take back its own -20 px margin
      (`GemWorksPanel.jsx`; game.css `.bt-gw-body`, `.bt-gw-tabs`); the tab
      strip is the window's first row, so it is written on the room where the
      other windows' titles are (v2.3.3258's background); a tab IS the
      `buildingPanel` name (`gemcut` / `enchant`) and `BuildingRoom` is keyed by
      its ROOM, so a tab change never loads the room again; eleven building
      doors, sixteen windows over fifteen rooms (src/data/buildingRooms.js),
      mayor_1's "visit 3" counts the eleven;
    - the re-bake changed ONLY the plan's fingerprint in
      `server/src/wheelspawns.js` (every monster place, node and door identical):
      one worker deploy at merge with nothing new in it;
    - not done: the owner's two NPCs -- with v2.3.3258's keepers, a cutter and a
      setter outside, each opening his own tab when you talk to him (prompts in
      docs/ART-WISHLIST.md "The keepers") -- and an optional two-station inside
      picture;
    - test-world-core "the Gem Works", `mp-buildingrooms` (the tabs),
      `mp-wheeldoors`, `mp-shieldgem` (a shield's gem is set on the Set gems
      tab): docs/specs/gem-works.md.
  - Since v2.3.3298 THE WHEEL IS BUILT IN BLOCKS ROUND YOU -- the owner: "the
    game map needs to be larger. It goes from lvl 1 monsters to lvl 20+ way too
    quickly. Maybe 5x larger map is needed", choosing "Rebuild for 5x". Step 1,
    nothing on screen changes (docs/specs/wheel-in-blocks.md):
    - the ground worker no longer builds the whole Wheel on the way in (~50 MB
      at its peak today; ~600 MB five times longer, past the ~250 MB a tab dies
      at): BLOCKS of 128 x 128 cells (`core/worldblocks.js`), built round the
      pieces asked for and next to yours when idle, the 48 nearest kept;
    - `layout.js buildBlueprint(plan, rect)` builds any rectangle exactly as the
      whole map: `planFeatures` (roads, rivers, bridges, routes, plots, once a
      plan), pass 2's order-dependent features through `stands` (a feature is
      left out where an EARLIER one covers its middle -- worked out at its
      middle, remembered), everything measured from the whole map's corner;
      ground.js `materialMap` takes `ox`/`oy` (its noise and stage grid on the
      whole map's cells, `LAND_STAGE_MARGIN` 28), `PIECE_MARGIN` 24 round a piece;
    - walls go to the game a block at a time (the worker's `block`); a cell of a
      block not built yet reads OPEN; `wheelBlocksAround` / `__btWheelBlocks`
      asks for blocks far from any ground laid;
    - the OBJECTS and the OVERVIEW are BAKED (`tools/world/bake-wheel-world.mjs`
      -> `public/world/placed/`, `core/placed.js`, `core/placedfile.js`):
      placing is order-dependent over the whole map; the worker uses the bake
      only when `planFingerprint` matches, and the previews (`?bigtown=`,
      `?plaintown`, `?placing=2`) build the whole map for them as before. A plan,
      catalog or placing change must re-bake in the same PR (test-world-core
      checks);
    - the ground worker at the memory trip's peak 24.8 MB (main 28.7);
    - test-world-core "the Wheel in blocks" (every block and piece against the
      whole map, cell for cell); step 2 is the 5x lands.
  - Since v2.3.3315 EVERY LAND IS FIVE TIMES LONGER -- step 2 of the owner's
    "Rebuild for 5x" (docs/specs/wheel-5x.md):
    - a five-level stretch is 5,120 game px, not 1,024 (`plan.js PLAN5`,
      `wheelSized`; the active area grown past the frame, `grid.js
      active.grow`); 1,920 monsters (30 a stretch), 1,222 resources, 63,486
      objects; BroTown and the commons the same ground -- the noise counted
      from the plan's own corner (`nox`, ground.js, placing.js `NC`);
    - TWO WHEELS: the worker plays the long one unless `wheel5x: false`
      (server/src/wheeltables.js, picked once when the room starts), says
      which in `caps.wheelsize`; tables `server/src/wheelspawns.js` (long,
      live) and `wheelspawns1.js` (short), bakes `public/world/placed5/` and
      `placed/` -- re-bake BOTH (`bake-wheel-spawns.mjs`,
      `bake-wheel-world.mjs`); the previews (`?bigtown`, `?plaintown`,
      `?placing=2`) are always the short one;
    - the join says which Wheels the phone draws (`ws`,
      src/game/wheelSize.js); a phone that says nothing is OUT OF STEP: no
      monster targets it, no No man's land -- a test or bot must send `ws:
      [1, 5]` (TRAPS §196); the phone's per-size copies (`WHEEL_GEOM`,
      `WHEELS`, `NML_CENTRES`) follow `setWheelLong`, held to the tables by
      test-world-core;
    - never a Wheel coordinate in code or a test: QA reads `H.wheelGeom()`;
    - the minimap and world map draw the blocks round you at the short
      Wheel's detail (`wheelLocalLands`); the world map zooms ~4x further,
      what lies along the lands (stages, camps, passes, bands, roads) at the
      map's own zoom and what is one size on either Wheel (buildings,
      resources, monsters, bridges) at the short Wheel's (`spanK`, `zr`);
    - a fishing or mining seat stays the bank while you sit on it
      (wheelSwim.js `seatedOnBank`): the drawn shore wanders past the plan's
      cells, and one long-Wheel seat of 250 was four looks wet; the bake
      places by the plan and never by the pictures;
    - since v2.3.3318 the way in carries only the monsters around you
      (below), not all 1,920 (~580 KB).
  - Since v2.3.3318 INTO THE WHEEL WITH ONLY THE MONSTERS AROUND YOU -- the
    owner: "Push all these to main then keep going", the 5x work's first
    "not in this PR" (docs/specs/wheel-arrival.md, server/src/wheelnear.js):
    - a phone that joins with `wn: 1` is sent, on the way in, only the
      monsters within 2,400 px (`WHEEL_NEAR.R`, the tick's `INTEREST_R`): the
      zone_state marked `mnear: 1`, a join's state_sync `monstersNear: 1` --
      an EMPTY list so marked still means the worker runs them (unmarked, it
      means "make your own"); BroTown's square 580 -> 140 KB, the rest the
      nodes and the loot (a node has no interest yet);
    - a monster first coming into its reach arrives WHOLE in that phone's
      tick (`mw: {zone: [...]}` in the snapshot's one wire, spawnscale.js
      `monsterSnapWire`), made by wsClient `_monsterFromWire` before the
      tick's monsters update it; once a visit (`session._wheelWhole`); the
      arrival seeds the tick's `_wheelSeen`, so it is not sent twice;
    - a phone holds only what it came near: a far kill, roll or death names
      an id it does not hold, which every handler already guarded; and the
      world map, zoomed in, shows no monster dots in a land you have not been
      to this visit (the whole list had put one at each far monster's
      starting place);
    - `?wheelwhole` asks for every monster as before (six QA scenarios that
      read the whole list off the arrival use it); kill switch `wheelnear:
      false`; `wheelnear` suite, `mp-wheelnear`.
  - Since v2.3.3320 THE FIRST STRETCH CLIMBS 1 TO 5 -- the owner: "Yes do
    smooth 1 to 5" (docs/specs/wheel-monsters.md "The first stretch climbs 1
    to 5"):
    - on the long Wheel a land's first-stretch monsters were its home zone's
      levels 1-2 for all 5,120 px, then 6; now each one's level is where it
      stands, as a deeper stretch's: `round(1 + 4 x depth)`
      (`WHEEL.FIRST_STRETCH_LEVELS`), 1 at the town end to 5 at the far end;
    - the same 240 monsters, ids, places and kinds; the town end is still
      level 1 (the 2026-07-04 directive, data.js v2.3.1160); the short Wheel
      keeps 1-2; a level-3 snowman is the first with the full flat health
      (119 HP to a level 2's 69);
    - a quest's ROAD to a land now ends where its monsters begin, its level
      1s, not at their middle (level 3 now): `WHEEL_GEOM[5].firstR` (each
      first stretch's inner edge, held to the table by test-world-core),
      questRoute.js `LAND_IN_PX`, the road gone once you stand on that land
      past their edge -- on the long Wheel `LAND_HERE_R`'s 600 px no longer
      meant "among them" (a land's monsters reach ~2,400 px either side of
      its middle); the short Wheel's road as it was;
    - the levels are the worker's (the phone shows a Wheel monster's own level
      since v2.3.3013); kill switch `wheelslope: false`; `wheelzone` §12,
      `mp-wheeldeep`, `mp-wheelhome`, `mp-wheelmonsters` and `mp-wheelnear`
      (their fights at the level-1 end: in the middle a fresh character died
      first).)
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
  every room message would cost more than the game; since v2.3.3256 the pass
  is on the backlog as $2 for 30 days in USDC on Hemi, no contract, and NO
  PLAY CAPS for now -- the owner: "Dont ship any caps yet" --
  `docs/SUPPORTER-PASS-PLAN.md`, waiting on the owner's pass address),
  `docs/SERVER-SPLIT-PLAN.md` (v2.3.3208, the owner's "Hopefully 1000 while
  just as smooth is possible ... begin planning what the best server split
  would look like": MEASURED, about four fifths of the room's thread at 150
  players is each phone's own messages, growing with the square of a crowd,
  and the world itself little -- a copy doing only the world's part ran 1,000
  players in 6 ms of a 22 ms tick -- so the split is by CONNECTION first,
  front doors doing each phone's work with one world behind them over
  batched sockets, and WORLD-ARCHITECTURE §11's area servers only behind the
  doors once that world fills (TRAPS §172); a phone drawing ~100 players on
  one screen does ~4x an empty town's frame work, so a crowd cap per phone
  (`mp-crowdbots`); phases 0-4, ~$245 a month at 1,000 around the clock;
  the owner: "Go recommended but I want you to stress test to see what can be
  optimized" -- a crowd cap of 50 drawn in full, the Cloudflare lab after
  Phase 0, stress tests first; nothing of the split built yet),
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
worker on localhost (add `--local-upstream 127.0.0.1:8787` for a `?room=`
of your own: the route in wrangler.toml otherwise renames the host, TRAPS
§181). That means a client change CAN be smoke-tested here
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
- **The `provenance` branch (v2.3.3308) is the owner's proof of
  ownership against copies.** `.github/workflows/provenance.yml`
  fingerprints every commit of main (each file's SHA-256, then one of the
  list: `tools/provenance/listing.mjs`), timestamps it in Bitcoin
  (OpenTimestamps) and has GitHub sign it as this repository's (an artifact
  attestation), three files a commit on that branch. NEVER delete, rewrite
  or force-push it, or put anything else on it: a proof is only worth its
  date. Its commits start with `[CF-Pages-Skip]` (TRAPS §193); how anyone
  checks one, and what to do about a copy: docs/specs/provenance.md.

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
- THE RELAY IS AN ALLOWLIST, IN THE SENDER'S NAME (v2.3.3304,
  docs/specs/relay.md). A phone's broadcast that the router has no case
  for is relayed to the others only if its type is in `RELAY.TYPES`
  (`server/src/relay.js`): a new relay goes on that list or it reaches no
  one (`relay.test` scans every broadcast in src/). Each relay is rebuilt
  `{type, from, payload}`, the payload's `id`, `from`, `playerId`,
  `fromName`, `playerName`, `name` the worker's -- a script could relay
  "Bob died" in Bob's name, as the phone read the payload's `id` before
  `from` (it reads `from` first now). Kill switch `relaylist: false`.
- Deploy-order safety: servers advertise capabilities in
  `state_sync.caps` (WS) / `settled: true` (HTTP); clients gate their
  legacy paths on them. Preserve this on both sides.
- Identity: stable per-browser `bp_` ids from a silent passphrase
  (`bt_passphrase`); two tabs share one identity by design — test
  multiplayer with `?guest=1` on the second tab.
- A NEW CHARACTER STARTS FROM THE SERVER'S DEFAULTS (v2.3.3138): a join with
  no `rpg:<pid>` record reads NO `rpg*` field of its payload
  (`_withoutRpgClaims` in join.js, a null-prototype copy: TRAPS §6), so a
  test that seeds a character through a first join seeds nothing -- put a
  record on file first. A failed read of the record ends the join (1011)
  instead of passing for a new character. The defaults that are not zero
  are `NEW_CHARACTER_COINS` and `freshLifeSkills()`, pinned to the client's
  by mirror-audit: docs/specs/fresh-start.md.
- A SAVE-FORMAT UPGRADE THAT FAILS STAYS UNFINISHED, AND A NEWER SAVE IS NOT
  REWRITTEN (v2.3.3303, docs/specs/migrations.md):
  - a migration that throws on a load is no longer stamped done by the
    join's own save: `_saveRpg` stamps the version the load reached
    (persistence.js `_rpgSaveVFor`) until a load gets further, so it runs
    again once mended, and the log says `[migrations] rpg:<pid> stopped at`;
  - a character saved by a NEWER worker (`_v` above `RPG_SCHEMA_VERSION`, a
    rollback) is refused at the join as a failed read is (close 1011, the
    phone retries until the newer worker is back), never rewritten with the
    older field list; kill switch `newersave: false`.
- THE HEMI BRO CHECKMARK IS "OWNS ONE OR MORE", AND THE PROFILE SAYS HOW MANY
  (v2.3.3255) -- the owner: "a 'verified' checkmark for people who own 1 hemi
  bro or more ... list the number of hemi bros owned somewhere on their
  profile ... small surface area":
  - NO CONTRACT, NO TRANSACTION, NO KEY: the v2.3.1576 free signature proves
    the wallet, and the worker READS the collection's `balanceOf` (onchain.js);
    `bro_verify {count: 1}` against `caps.broCount`, the worn Bro optional;
  - `ps.broN` server-owned like `ps.bro`, on the tick's player as `brn` (absent
    at 0) and state_sync's `broN`; the checkmark is `bro` OR a count of 1+
    (broWallet.js `broBadgeOf`), on the name plate, the profile ("3 Hemi Bros"
    beside the AP) and the player list;
  - the phone NEVER READ the tick's `bro` before: nobody saw anyone else's
    badge. It reads both now, a far player's slim entry leaving them as they
    were (`peerEntrySlim`);
  - sign once: a link older than a day is READ again in the background when
    its player joins (`_broRefresh`), never re-signed; one chain read per 5 s a
    socket; everything fails closed; kill switch `broCount: false`;
  - `broverify` suite (96), `onchain` (balanceOf), `mp-brobadge`:
    docs/specs/hemi-bro-count.md.  The $2 supporter pass the owner asked about
    in the same message is NOT built: on the backlog as 2 USDC on Hemi, waiting
    on the owner's own pass address, with no play caps ("Dont ship any caps
    yet").
- FAR PLAYERS LESS OFTEN, POSITIONS IN WHOLE PIXELS (v2.3.3197, the owner:
  "Send far away players less often and using shorter position numbers"):
  in the Wheel a v2 session gets the movers within `FAR_PLAYERS.NEAR_R` 2,400
  px of it on every tick and the rest at most every `EVERY_MS` 250 ms, at
  where they are now (tick.js `_farPending`, `playersPlanFor`); every player
  entry's x/y/vx/vy go out whole (`rp`; the phones already send a tenth of a
  pixel, so that part is ~2.4%). Kill switches `farplayers: false`,
  `roundpos: false`. Both tick builders carry it (tick-share.test.mjs compares
  them); `far-players` suite, `mp-farpeer`: docs/specs/far-players.md.

## Testing

- Server: `cd server && npm test` — 133 zero-dependency suites against a
  mocked DO storage. Every new system adds a suite; extend the nearest one
  when touching its wire format.
  - Since v2.3.3302 `npm test` is `test/run.mjs`. It runs every
    `test/*.test.mjs`, four at a time, in ~30 s (the one-by-one `&&` chain
    took ~69 s). It reports EVERY failing suite with its FAIL lines; the
    chain stopped at the first and hid the rest.
  - A new suite needs no line anywhere. `eventcapes.test.mjs` was never in
    the chain, and so ran nowhere.
  - `npm test -- relay hit-door` runs only those; `--jobs=1` runs one at a
    time; `--verbose` shows every line.
  - Server CI runs on EVERY PR (its path list missed 61 files the suites
    read), and the worker's deploy waits for the suite on the same commit: a
    red suite deploys nothing. The deploy job itself is unchanged
    (wrangler-action's own wrangler, 3.90.0).
- Client: no unit suite; CI runs lint + build on every PR, and the
  Pages bot posts a preview URL. The Playwright smoke harnesses
  (`tools/qa/qa-smoke.mjs`, `qa-facing.mjs`, …) are OFF the PR path
  (owner directive, 2026-07-16 — no live players, CI speed wins) and
  run only via workflow_dispatch on demand. Primary platform is
  **iPhone Safari** — test touch controls, not just desktop.
  And SIDEWAYS too (v2.3.3216): a touch screen cannot scroll the creator
  (`overflow:clip`), and sideways a phone is 300-430px tall -- ENTER BRO
  TOWN sat at y 783 of 390 until the creator became three columns there
  (game.css, the v2.3.3216 block); `mp-cclandscape`, TRAPS §175.
  Two phone scenarios DO run on every PR, each an owner call: `playable`
  (mp-questline, v2.3.1729, client-ci.yml) and `memory-budget`
  (mp-membudget, v2.3.3101, memory.yml -- Conventions, "Memory is
  budgeted").
- A phone scenario red on `main` is a question about the TEST first (TRAPS
  §177, v2.3.3249): mp-deathstrip, mp-firetrail, mp-petsmatter, mp-hitvoices
  and mp-slimeburst were all the test, never the game. `run.mjs` closes every
  page a scenario leaves open, since one browser serves the whole run and an
  open world page slows every scenario after it.
  Since v2.3.3321 (TRAPS §200): this box often draws a few frames a second, so
  a check times what is drawn by the renderer's own clock and waits a shot out,
  never a window sized for 60 fps (mp-hitreal, mp-staffcast, mp-solospecial,
  mp-ccink were the test); `BT_QA_CPU_THROTTLE=<rate>` runs every page that
  much slower, to try a check as a slow phone sees it.
- Capacity (v2.3.3194, docs/specs/load-test.md): `node tools/qa/load/load.mjs`
  fills a private copy of the server (local only) with fake players in the
  Wheel, step by step, and `node tools/qa/load/load-wheel.mjs` times the room's
  own code. Measured: smooth to about 70 busy players (the cap was 60), a
  slower world past that (fewer ticks a second), half speed from about 125, no
  freeze up to 150; since #885 (docs/specs/room-capacity.md) smooth to about
  110. Wrangler's own local tracing (on by default) made every
  message ~5x dearer and froze the room at ~95: the tool turns it off (TRAPS
  §168). Re-run it after any change to the tick, the move path or the Wheel's
  monsters.
  - v2.3.3199: THE ROOM COMPRESSES EVERY MESSAGE (permessage-deflate: the
    worker's compatibility date turns it on, every browser asks for it), and
    the compressing is about 40% of its thread (79.6% at 100 players, 44.6%
    with `--no-deflate`), so every message sent, and what changes in it,
    costs the server CPU -- repeated text is nearly free (leaving the unchanged
    gear keys out saved 29% of the bytes and no CPU; TRAPS §169). A phone's
    download on the wire is about a thirteenth of what it unzips (~17 KB/s at
    100 players): the load test's `wire` column, the bots' own byte counts
    being unzipped (TRAPS §169). In BroTown 98% of the bytes are other
    players' entries. `--move-ms`, `--seen-r` and `--no-deflate` are the
    tool's levers: docs/specs/load-test.md "What a phone really downloads".
  - v2.3.3201: WHO IS NEAR WHOM, BY SQUARES -- each Wheel monster looks for a
    player to chase only in the 256 px squares its aggro range reaches
    (server/src/aggrogrid.js; it measured every player, a quarter of the
    room's work at 150), and the monsters a phone hears about are found by
    number-keyed squares (wheelzone.js `GRID_KEY`). The same picks and the
    same bytes: aggro-grid.test.mjs runs two rooms side by side, the old
    search and the new, and compares every monster and message every tick.
    A sticky aggro that has run out is now cleared up front (nothing read
    one). 3-4 more ticks a second at every size; kill switch `aggrogrid:
    false`: docs/specs/near-searches.md.
  - v2.3.3202: THE TICK IS PACED -- the runtime's setInterval waits the whole
    22 ms AFTER each tick (measured: period = 23.1 ms + the tick, TRAPS §170),
    so a busy room was a slower world with its thread partly idle.
    server/src/tickpace.js shortens the interval when ticks start more than
    24 ms apart (a quiet room's period) and puts it back when they come
    sooner; never under 6 ms, never over TICK_RATE, never faster than a quiet
    room; the Workers runtime only (`WebSocketPair`), so the Node harnesses
    that call the tick by hand are untouched. 100 players 37 -> 40.4 ticks a
    second, 150: 29.2 -> ~30-32; 41-42 ticks to ~100 players, then a drop as
    the thread fills: smooth to ~130 (main ~105). Kill switch `tickpace: false`;
    /dev/overview's `tickPace` reads the real tick rate: docs/specs/tick-pace.md.
  - v2.3.3203: A PLAYER WALKING STEADILY IS SENT LESS OFTEN -- a Wheel player's
    tick entry is held (server/src/steadymovers.js) while every other field is
    unchanged, they keep moving (or standing) at the speed last sent (4%),
    within 2 px of the line it drew them on and about as far along it (50 ms
    of a busy room's lateness allowed), for at most 66 ms; a turn, stop,
    start, new gear or shove goes out at once; the far send and the roster
    count as sent. Phones draw peers from the speed, so the drawn place is
    unchanged (steady-movers.test.mjs runs the phone's dead reckoning both
    ways: identical). 50-100 players: the room 13-18% less busy, phones
    download 30-39% less; 150: -6 points, no more ticks; on the night's ramp
    68% of the thread at 100 against 78%, the smooth line where it was
    (~120-130); a shaky thumb (2 degrees a move) still 100 -> 58 updates,
    drawn the same. Positions arrive 2-5 ms later on average. Kill switch
    `steadymovers: false`; /dev/overview's `steadyMovers` shows the real
    saving: docs/specs/steady-movers.md.
  - v2.3.3204: A STEADY WALK ON THE SAFE GROUND IS SENT HALF AS OFTEN -- on
    the Wheel's safe ground and not in a fight (no lock, attack, duel or arena:
    wsClient.js `moveDietOn`), the PHONE keeps a move back while it is on the
    line its last one drew, until 66 ms after it (src/game/moveDiet.js
    `dietMayWait`: the worker's own steady rule, its numbers pinned to STEADY by
    move-diet.test.mjs); a turn, stop, start, gear or any other change goes on
    the next 33 ms batch. The worker never re-holds such a spaced move
    (STEADY.SPACED_MS 44: held by its ticks' times, half came a tick late).
    Incoming moves about halved (Cloudflare bills incoming messages); smooth
    (33+ ticks) to ~145 with all five (125: 32.0 -> 37.7-38.8, 150: 30.5 ->
    32.2-33.8);
    others' moves 4-6 ms sooner at 50-100, 4-15 ms later at 125-150. Kill
    switch `movediet: false` (caps.movediet: each phone at its next join);
    `mp-movediet` (slows the page's drawing while it walks: this box's software
    GL starves page timers): docs/specs/move-diet.md.
  - v2.3.3254: THE QUIET PHONE -- the owner: "I want you to cut as much as you
    possibly can IF the loss in quality is negligible or unnoticeable" (every
    message a phone SENDS may count against the free plan's 100,000 a day;
    what the server sends is free):
    - ONE FRAME A MOMENT: against `caps.bundle` everything a phone sends in one
      turn of its loop goes as ONE frame, a JSON array the worker takes message
      by message as if each came alone (server/src/bundle.js; index.js
      `webSocketMessage` -> `_onMessage`; never a join, plain objects only, at
      most 24, the 16 KB gate the frame's) -- wsClient.js `wsOut` (a
      microtask: nothing later than before) is every game message's way out;
    - RIDERS (src/game/quietPhone.js): the ping's answer rides on the next
      frame saying how long it waited (`hd`; the worker subtracts it and takes
      only the latest ping's), one in four alone with nothing else going; the
      look (`track`) at once when its NEWS changes (the worker's own
      LOOK_RELAY rule; 3,000 random looks: never holds back a relay), else
      riding or alone every 30 s (the 2-minute away clock reads its `aw: 0`);
      the tree's `gather_node` repeat riding;
    - STANDING STILL: the keepalive move once 1 s after the last move, then
      every 10 s (the worker's 1 Hz roster heals the others); a death, a gear
      change, or a place or zone changed with no thumb on the stick (a harvest's
      snap, a shove, a door) at once; no 500 ms harvest heartbeat (the worker
      stamps only a harvest's start);
    - MOVES: 33 ms only with a player within 2,400 px (the worker sends your
      moves to no one further) or in an arena match, else 66 ms -- the solo
      rate the owner set in v2.3.1767; a steady walk held to 66 ms anywhere in
      the Wheel out of a fight, unless a player near you may fight you there
      (nmlCanAttack);
    - measured on a real page (mp-quietphone, main -> this): standing 1.79 ->
      0.25 frames a second, turning with nobody near 18.2 -> 11.7 (a phone: 30
      -> 15), a claim and its move 2 -> 1 frame, the look and ping never alone
      while walking; fights beside others unchanged (33 ms);
    - kill switches `bundle: false` / `quiet: false` (each phone as before from
      its next join; the worker always takes a bundle); nothing bundled or
      riding until THAT socket's state_sync (`_capsHere`: the last worker's
      caps outlive a reconnect, and a rolled-back worker would relay an array
      to the room); `quiet-phone` suite (56: two rooms in lockstep, bundled and
      not, identical), docs/specs/quiet-phone.md.
    - since v2.3.3291 EACH PART FINISHES BEFORE THE NEXT -- found by the
      architecture review: a bundle is ONE event, so the input gate keeps its
      parts apart only if the router waits for each handler, and twenty cases
      did not (farm, shop, daily chest and rewards, capes, the auction house's
      offers and threads); 24 harvests of one bed in one bundle paid 48
      carrots, one stack sold 24 times paid 24 times. Every case in
      `_onMessage` awaits its handler where it calls it; `quiet-phone` §8
      (late, copying storage) and §9 (a scan of the router) hold it; handoff
      rule 9's third edge, TRAPS #182.
  - v2.3.3205: THE CAP IS 120 -- the owner: "I think 120 is a good cap limit
    for now" (index.js `MAX_PLAYERS`; `max_players` can still only lower it;
    chatmod `SEEN_MAX` 240, twice the cap). With #887-#891 the room is smooth
    to ~145; at 120 players 39 ticks a second, and its memory about 9 MB kept
    after a full GC, 44 MB at the most in use, against Cloudflare's 128 MB
    (`tools/qa/load/heapprobe.mjs`, the inspector's heap during a load test):
    docs/specs/cap-120.md.
  - v2.3.3240: A LOOK IS RELAYED WHEN IT CHANGES -- found by the owner's
    "stress test to see what can be optimized":
    - every phone sends `track` (its whole look and stats, ~940 B) every 2 s,
      and the worker relayed each to every other player as its own message:
      N(N-1)/2 sends a second, more than all the ticks;
    - the load test's bots never sent it (TRAPS §173), so "smooth to ~145"
      was really ~105, and 120 was past it (25.8 ticks a second);
    - server/src/lookrelay.js now relays only the keys that changed, and only
      when one did:
      - x/y/dir, HP (LAZY: rpgHp, rpgMaxHp) and the inspect card's counters
        (LAZY_IN: rpgData's kills, svKills, goldEarned, playtime) ride along
        only; any other change to rpgData relays it at once -- the phone draws
        a peer's slung shield from rpgData.shield (the first cut held all of
        rpgData back, and a shield could take a minute to show);
      - hg/fr go in every relay that has them (wsClient sets a peer's build
        from each one);
      - a whole copy every minute;
      - kill switch `lookdelta: false`; /dev/overview `lookRelay`;
    - the clan clear carries hg/fr too and resets the relay (`_lookForget`);
      it had been resetting a leaver's build on every screen;
    - with real looks (`load.mjs --track`): 38.0 ticks at 120, 31.1 at 150 --
      smooth to ~145 again;
    - look-relay.test.mjs (29, a 24,000-track property test against the
      phone's merge), clans.test 9.3c/d, mp-trackcapture (the sample),
      mp-crowdbots (BT_MAX_PLAYERS, the bots' looks): docs/specs/look-relay.md.
  - v2.3.3242: THE STRESS TESTS' SERVER FIXES -- the owner's "stress test to
    see what can be optimized" (docs/specs/stress-tests.md, the round's whole
    report, server and phone):
    - `reportToLeaderboard` reads its clock first: every `track` built the
      Leaderboard stub, the whole chain-score series and a signature, to throw
      them away inside the 5 minute floor (~100 us a track); the same reports
      go at the same times (`anticheat` §7b);
    - `_wheelInterest`, the room's biggest single function at 120 players
      (145 ms a second): the distance first, the session's two sets used in
      turn, `entered` only when something enters, the grid's answer for a
      block of squares kept for the tick (`wheelGridNearKept`): 95 ms a
      second, the same answer exactly (`tick-share` §5f against a copy of the
      old code, four mutations caught);
    - `load.mjs --keep-bundle <dir>` (a profile's lines, mapped to source) and
      `--tick-parts` (a tick at 120 players is 95% the players' positions);
    - then measured: the crowd cap on the wire (each phone sent only the
      movers among its nearest 65 every tick) gave nothing at 120-150 --
      steady movers keep a tick's movers near a phone at ~25-35 -- while far
      players with the once-a-second roster gave ~5 points at 120 (#898).
  - v2.3.3243: FAR PLAYERS ONCE A SECOND, WITH THE ROSTER -- found by the
    owner's "stress test to see what can be optimized": the far send
    (v2.3.3197) went to every phone in the Wheel four times a second with
    EVERY player who had moved, the near ones it already got each tick
    included -- about a third of what a phone in town was sent at 120. A
    player past 2,400 px is on neither your screen nor your minimap, so they
    now reach you only in the presence roster, about once a second, where
    they are now (tick.js `FAR_PLAYERS.EVERY_MS` 0); the world map and the
    minimap carry a dot along its last speed between updates
    (src/game/peerDot.js). 120 players: the room 78-80% -> 73-76% busy, each
    phone 175-182 -> 145-150 KB/s unzipped; 150: 35 -> 37 ticks a second;
    near players' moves arrive sooner. `far_ms` in the live flags (100-5000)
    brings a far send of their own back (250: v2.3.3197's); far-players §10,
    steady-movers 2k/2m, `mp-farpeer` (`BT_FARPEER_FAR_MS`). Tried first and
    dropped: the crowd cap on the wire (each phone sent only the movers among
    its nearest 65) -- no gain at 120-150, as steady movers keep a tick's
    movers near a phone at ~25-35: docs/specs/far-players.md "Once a second".
  - v2.3.3244: THE OTHERS ARE TOLD WHAT THEY SEE, NOT YOUR BAG -- found by the
    owner's "stress test to see what can be optimized" (`load.mjs --storm`:
    every socket dropped at once, the way back measured): a joiner's
    `state_sync` gave every other player as `{...playerState, name,
    ...session.data}` -- coins, bag, every stash, quests, life skills, buffs,
    the anti-cheat's histories -- and `player_join` told everyone the join's
    `rpg*` claims; no phone read them, and in No man's land the bag is the
    killer's prize. Both now carry the PUBLIC keys only (index.js
    `PEER_PUBLIC_KEYS` / `_peerPublic`: the look relay's keys, the join's look,
    a tick's fields), an allowlist (TRAPS §174); precedence as before. A played
    character with a real look: 4,595 -> 948 bytes; the storm at 120: a join's
    snapshot 142 -> 8 KB, a join's p95 611 -> 240 ms. No caps flag (a phone
    reads a subset). `peer-view` suite (every key a phone reads on the
    snapshot road held to the list), gearprov §8: docs/specs/peer-view.md.
  - v2.3.3245: A FIGHT'S EVENTS GO TO THE PHONES NEAR IT -- the split plan's
    Phase 0d, found by the owner's "stress test to see what can be optimized"
    once the bots sent the swings and arrows a phone relays (`load.mjs
    --relays --events`): every event a tick carries went to every phone, so at
    120 players each phone got 50-66 a second, nearly all from fights it could
    not see, growing with the square of the crowd. Now an ALLOWLIST of the ones
    that happen at a place (server/src/eventplace.js `placeOf`: monsters' hits,
    attacks, special moves, balls, fire patches, parries, bow blasts, bursts, a
    bash's wind-up, and the relays player_swing/projectile/dodge/jump,
    gather_node and two legacy ones) goes to the players it is about (attacker,
    target, sender) anywhere, to v2 phones within 2,800 px of it in the Wheel
    (`EVENT_PLACE.R` = INTEREST_OUT), and to the zone elsewhere (tick.js
    `eventsFor`, the selection in the cache key, each event's JSON made once).
    Everything else stays room-wide: chat, emotes, trades, duels, clans, the
    arena, hits between players, and what a phone KEEPS until the next one --
    kills (a far monster's only news of its death; missed, its return in reach
    reads as a fresh kill, a phantom remnant pile: TRAPS §176), loot, a raised
    shield, a mummy's change, a lit campfire -- found by an audit of every
    client handler. 120 players: 17 events a second a phone (3.4 KB/s), the
    download ~4% less, the room no busier; a phone near every event gets the
    same bytes. Also fixed by it: a monster's slam shook every screen in the
    Wheel (gameEvents.js monster_ability, a zone check only), now within
    2,800 px. No caps flag; `eventplace: false` the kill switch. `event-place`
    suite (35, ten mutations), `tools/qa/load/events-bench.mjs`:
    docs/specs/events-by-place.md.
  - v2.3.3246: THE ROSTER'S FAR PLAYERS, SLIM -- the split plan's Phase 0b,
    its first step (the worker alone), from the owner's "stress test to see
    what can be optimized": once a second every phone was sent EVERY player's
    whole entry (the presence roster, ~150 bytes each: 150 KB a second at
    1,000). Now, on a presence tick, a v2 phone in the Wheel gets its own
    roster (tick.js `rosterPlanFor`): the players within FAR_PLAYERS.NEAR_R in
    its zone whole, as before; the far ones slim, `{x, y, d, z, vx, vy}` (the
    fields wsClient.js's tick merge writes whether or not they are there --
    slim-roster §8 reads them from the client itself); and a far player who has
    not changed since the last roster only every `ROSTER.FAR_STILL_MS` 4 s,
    inside the client's 10 s ghost sweep (§2: at most 4 s and one roster apart,
    at 45 ticks a second and at 10). Sprint, skull, pet and the armour's grade
    read as none for a far player the phone does not draw; the first whole
    entry puts them back long before they are on screen. v1 phones, the other
    zones and a socket that has not joined still get everyone whole. A phone at
    120 ~9% less; in-process 12% / 17% / 23% less at 120 / 500 / 1,000 with
    the room's time unchanged. No caps flag; kill switch `slimroster: false`.
    `slim-roster` suite (21), far-players §8c, `tools/qa/load/
    roster-bench.mjs`: docs/specs/slim-roster.md. The rest of 0b (far
    positions only while the world map asks) needs a phone change.
  - v2.3.3247: THE CLOUDFLARE LAB -- the split plan's lab, which the owner
    said yes to ("Go recommended": the lab after Phase 0). Started BY HAND:
    Actions tab -> "Cloudflare lab" -> Run workflow (`.github/workflows/
    lab.yml`). It deploys a tiny worker of its own, `brotown-lab`
    (tools/lab/: Burner, World and Door objects; NEVER the game, nothing
    stored, every request but "/" needs the run's own key), times it from the
    runner (tools/lab/run.mjs): do K objects of one script run side by side
    (and in how many isolates), the delay between two objects (a call, a
    plain socket, a hibernated one), floods of known size, and the account's
    own figures for them (GraphQL, the fields asked of the schema; best
    effort) -- and deletes it whatever happened. About a cent a run; results
    on the run's summary and its `lab-results` download. It lives under
    tools/, so a merge never sets off deploy-worker.yml. `node tools/lab/
    run.mjs --local` is the same run on wrangler dev (one thread: side by side
    1 at every K, which is what the test tells apart). The game's room on
    Cloudflare with the bots is the next lab: docs/specs/cloudflare-lab.md.
  - v2.3.3250: FAR PLAYERS ONLY WHILE YOUR WORLD MAP IS OPEN (presence v2) --
    the rest of Phase 0b, from the owner's "Go recommended" (open decision
    24): a phone that joins with `pres: 2` (wsClient.js; `caps.presence2`) is
    sent, in the Wheel, the players near it whole, its party whole wherever
    they are (server/src/presence2.js `_presence2Party`), and far players only
    while its WORLD MAP is open -- WorldMapOverlay.jsx sends `map_watch` on
    opening, every 4 s and on closing (src/game/presence2.js `sendMapWatch`;
    the channel's allowlist names it, TRAPS #18), one `true` lasting 8 s, the
    first roster of a watch carrying every far player; every 30 s `on`
    (everyone's id -> zone), which forgets whoever left in place of the 10 s
    ghost sweep (stood down while it is fresh, 75 s). A FAR PLAYER'S COPY IS
    PARKED: the roster is marked `nr` while the map is shut (every near player
    is in it), a player missing from it is `_away` and stopped, and every frame
    (visualSystems.js) an `_away` copy is kept PARK_R 2,400 px from you -- their
    frozen copy was a ghost for anyone who walked to where they were last seen
    (TRAPS §178); the world map and minimap skip parked copies. In-process
    72-74 KB a second a phone at 120 (slim 90-98) and 144-149 at 500 (218-250),
    the room's time the same; merged with #898's roster-only far players the
    extra cut is small (120: 74 against 75-82; 1,000: 235-242 against
    261-311) -- groundwork: a phone's download stops growing with far players. Old phones keep the v2.3.3246 roster; kill switch
    `presence2: false`; `presence2` suite (55, twenty bugs caught), `mp-presence2`
    (15), mp-farpeer opens the map for its far step: docs/specs/presence-v2.md.
  - v2.3.3257: THE ACCOUNT IS ON CLOUDFLARE'S FREE PLAN -- found by the
    lab's first run (the owner's "Push to main. Then resume your
    recommendations autonomously"): Cloudflare refused its deploy, "In order
    to use Durable Objects with a free plan, you must create a namespace
    using a `new_sqlite_classes` migration" (code 10097). The game's
    brotown-server is on the same free plan, where Durable Objects have DAILY
    limits for the whole account, reset at 00:00 UTC -- 100,000 requests (a
    web request, call or alarm, or 20 incoming socket messages) and 13,000
    GB-s awake -- and past one Cloudflare refuses that work until midnight,
    the game's too. A playing phone's 10-30 messages a second make that about
    20-55 player-hours of play a day in all (*estimate*), and Phase 1's
    always-on doors could not run at all: SERVER-SPLIT-PLAN risk 8 -- the
    paid plan ($5 a month) comes first, the owner's call. The lab: SQLite
    objects (tools/lab/wrangler.toml); a run sized for the free plan, ~2,700
    billed requests (was ~25,000: a 20,000-call flood, and the Door polling a
    flood's end every 5 ms -- now 50 ms, at most 30 s), `--big` (the
    workflow's "big" box) the old sizes, paid plan only; "0. the day so far"
    stops a run that could take the account past 90% of the day; "4. the
    game's own days" reads brotown-server's last 7 days against the free
    limits (read only, best effort); the data centre lookup gives up after
    3 s and is skipped locally (LAB_LOCAL); a local dry run stops at 4
    objects at once (8 hung on wrangler 4.96.0's local runtime). On Cloudflare
    (third and fourth runs): objects of one script DO run side by side (8 at
    once 5.9-6.6x, 16 6.2-8.6x, in their own isolates); two in one city 3-4 ms
    apart, in two cities (Newark, Chicago) 22 ms -- placement is the whole
    story; a hibernation socket's message about a plain one's (81 against 75
    us in one city; the third run's 4x was the two cities), a call 10x a
    socket message; the game's busiest recent day 76,277 invocations
    (2026-10-11; every hibernation socket message is one -- "socket messages
    in" reads 0 -- and whether the free plan's daily limit counts them 20:1 is
    not documented: 4-5% of it, or 76%). One request
    may make at most 1,000 calls out (the call flood is 900); only Cloudflare's
    404 page is tried again (a 5xx means the lab ran); `node
    tools/lab/selftest.mjs` runs run.mjs whole against fakes, before every
    deploy: docs/specs/cloudflare-lab.md.
    - THE LIMIT TEST (`--limit`, the workflow's "limit" box) -- asked how to
      find out which, the owner: "Your account, 23:55 UTC". It floods one lab
      World in 5,000-message steps ONLY between 23:55:00 and 23:58:30 UTC (a
      refusal lasts until the 00:00 UTC reset), checks a fresh request after
      each step -- a lab object and the game's auction listing, read only, the
      one game page it may read (`GAME_PROBE_OK`) -- stops at the first
      refusal (tried twice more), never sends past 25,000 over the
      every-message line (150,000 at most: ~7,500 by 20 to 1), watches until
      23:59:40 for a late count, and if refused waits past midnight to say
      when the game answered again. Started outside 23:30-23:54 it sends
      nothing (exit 4). A Community report (2026-10-12) was refused ~36,000
      short by the 20 to 1 reading. The lab worker answers a refusal in
      Cloudflare's own words (503 `refused`), not its crash page;
      selftest.mjs runs it on a fake clock against a fake limit (every
      message, 20 to 1, counted late, four refusals to run).
      RAN 2026-10-14 23:55 UTC (run 5): NOT EVERY MESSAGE COUNTS -- 124,999
      socket messages took Cloudflare's every-message count of the day to
      125,271, past 100,000, and nothing was refused (52 checks, watched to
      23:59:45); the daily limit counts socket messages 20 to 1 like the bill,
      so Oct 11's playtest was ~4-5% of a day, not 76%. The game's listing
      answered throughout (docs/specs/cloudflare-lab.md "The answer").
  - v2.3.3276: A JOIN IS TOLD THE PLAYERS AROUND IT, AND THE ROOM'S MEMORY
    WITH REAL CHARACTERS -- the split plan's Phase 0e and 0f, the owner's "Yes
    do suggested" (docs/specs/near-join.md):
    - a phone that joins with `nj: 1` (beside `pres: 2`; `caps.nearjoin`) gets
      the players AROUND it whole (its zone, in the Wheel within 2,400 px, its
      party anywhere, its clones) and everyone else as a LIST ENTRY, `fa: 1`:
      what the lists show (name, colour, level, clan, the inspect card's
      counters, the Bro picture and count), ~200 B, parked at once
      (src/game/nearJoin.js `parkFar`); `player_join` the same;
    - a player's whole look comes in the tick that first sends them whole to
      that phone, as `pl`, applied BEFORE the tick's players (wsClient.js,
      `peerFromSnapshot` shared with state_sync), and on the tick after a zone
      change for everyone around (movement.js `_nearArrive`);
    - held = sent whole to this session (`_looks`) or a whole relay newer than
      its snapshot (`_lookWholeSeq` > `_snapSeq`, lookrelay.js stamps it); a
      delta never; `_looks` pruned once a roster to the last minute's (unpruned
      19.5 MB at 1,000); the look relay itself unchanged (room-wide);
    - at 1,000: a login 1,754 -> 1,032 KB, the reconnect storm 1,926 -> 1,485 MB
      and its joins' room time 13.5 -> 7.0 s; what is left (72%) is the look
      relay to everyone, the next step ("looks by interest", needs lists on
      demand, not built); a reconnect joins where it stands, only a login in
      today's town (TRAPS §180, `tools/qa/load/join-bench.mjs`);
    - memory (`tools/qa/load/memprobe.mjs`): 1,000 bots 34 MB, played 80 MB,
      every cap 231 MB -- over the 128 MB limit; the gear ledger up to 88 KB a
      player, pets 32 KB; fixes not built;
    - kill switch `nearjoin: false`; `near-join` suite (56, eleven bugs
      caught), `mp-nearjoin` (8).
- Bots (v2.3.3271, docs/specs/antibot-review.md): `node tools/qa/load/bot-lab.mjs
  [minutes] [--only=a,b]` runs scripted players against the real room code (in
  memory, simulated clock) and reports what each took home and what botfp made
  of it, plus one-socket probes (rows written a message, the room filled by
  sockets that never join, a second join on one socket, the speed bound).
  The review's findings, measured 2026-10-16:
  - a harvest with no `extraction_start` is paid untimed (obsidian 48x) --
    fixed since v2.3.3322, below;
  - fingerprints are the phone's word: a strike with none is never scored;
  - flags change nothing, and no screen shows them -- shown since v2.3.3323,
    below;
  - the speed slack is per message: 2,909 px/s, and 58,661 with bundles --
    a budget since v2.3.3325, below;
  - combat lanes are per monster, and a "ranged" hit reaches 3,600 px with no
    bow (7x the kills);
  - one socket can spend the free plan's rows (`chat_mute`, `stats_update` and
    `friend_dm` write a row a message) or keep rooms awake (`?room=<any>`).

  - since v2.3.3322 A HARVEST IS PAID AGAINST ITS OWN START (fix 6, the
    owner's "Yes" to the farming holes; docs/specs/harvest-proof.md):
    - a strike is paid only against its own `extraction_start`, after its
      hits; one with no start of its own (none, or another node's) is a
      RECOVERY strike, untimed, once every 10 minutes a player
      (gathering.js `HARVEST_PROOF`, `_harvestRecoverOk`) -- a deploy loses
      every record, and a room restart forgets the clocks too; any other is
      refused `no-start` / `other-node`, the node left standing and sent
      again (`DIRTY_MS`), counted in botfp (`startless`, flagged at 20);
    - the record OUTLIVES ITS SOCKET (index.js webSocketClose, linger.js no
      longer delete it), so the strike a dead pipe ate and the phone replays
      (wsClient.js `_holdForRejoin`) is timed against it;
    - a strike with no fingerprint is never `perfect` (botfp.js: `good`,
      `noFpPerfect`);
    - the lab's obsidian script 2,400 harvests an hour -> 6, honest play
      unchanged; kill switch `harvestproof: false`; `harvest-proof` suite (43),
      `mp-recoverpay`; TRAPS §202.
  - since v2.3.3323 THE BOT FLAGS ARE ON THE OWNER'S PHONE (fix 9;
    docs/specs/bot-flags.md): the Test panel's Bot flags section ("Show
    flagged players", DevPanel.jsx) lists every flagged player newest first --
    name and online when here, the flag in words, the counts, the `bp_` id --
    from GET `/api/admin/dev/botflags` (devtools.js -> botfp.js
    `_botfpFlaggedList`: stored and in memory, the live record winning, 50 at
    most, read-only); `/api/botstat` takes `Authorization: Bearer` too; POST
    `/dev/botflag` plants a `test` flag on a player who is here (never moving
    a real flag's hour gap); OPERATIONS.md "Bot flags"; a flag still changes
    nothing; `bot-flags` suite (29), `mp-botflags` (14).
  - since v2.3.3325 A SCRIPT MOVES NO FASTER THAN THE FASTEST HONEST PLAYER
    (fix 7, two of its three parts; docs/specs/move-budget.md):
    - the speed check's 80 px was given again with every message; it is a
      BUDGET now (movement.js `MOVE_BUDGET`): it refills at the check's own
      500 px/s (x the potion, the move stat, a billed sprint), holds 3 s of it
      + 80, and each move spends what it covers -- the lab's script 2,909 ->
      656 px/s, a bundle buys nothing, an honest walk unchanged;
    - a move past it is FOLLOWED as far as it reaches, never refused, and the
      tick follows on until the server's copy is there (`_tickMoveFollow`,
      before the monsters): the old refusal pinned a gap until a pause, and
      under a capped budget it would never close (TRAPS §203);
    - the three ways to skip the check are closed: a refused zone no longer
      frees the next move, a server-placed move (`_moveServerPlaced`: the
      sword's dash, the lunge at a player) is judged from where the server put
      you, and back INTO THE WHEEL you are judged from where you left it
      (`ps._wheelBack`; every honest way out comes back there; a death forgets
      it, `_moveRespawned`); a zone change never refills the budget;
    - a join landed where it said (every join is a fresh state), so a
      reconnect was a teleport -- closed in v2.3.3327, below;
    - the overview's `moveBudget`; kill switch `movebudget: false`;
      `move-budget` suite (62, fourteen bugs caught); seven suites adapted;
      the lab's `allow()` reads the budget, and `--flags=` sets live flags.
  - since v2.3.3327 A RECONNECT STARTS WHERE THE SERVER LAST HAD YOU (fix 7's
    third part; docs/specs/last-place.md, `server/src/lastplace.js`):
    - when a player's state goes (a socket's close, a lingering body's end, a
      second join taking over a live session) the worker remembers the zone,
      the place, when it last judged a move there, the budget left, the walk's
      bound (potion, move stat) and the Wheel's way back -- in memory, a Map,
      an hour, 480 at most (`LAST_PLACE`);
    - the next join of that player is judged from it (`_placeOnJoin`): in the
      same zone at the fastest an honest phone goes unheard, the walk's bound
      x SPRINT.MULT (an unsent sprint is never billed), for all the time since,
      NO cap (a dead pipe walks on 15 s before it is noticed: TRAPS §204);
      past it put as far as it reaches and FOLLOWED, the budget carried on, not
      refilled; a join outside the Wheel (a reload starts in today's town) is
      taken, and its way into the Wheel judged from where it left OR the
      ARRIVAL (centre + 288, `ARRIVAL_DY`, held to worldTrial.js `WHEELS`),
      whichever is nearer (`_wheelEntryFrom`); the first move after ANY join
      is judged (`lastMoveAt`), a first join's too;
    - a death comes back in at the arrival (`_moveRespawned` sets
      `_wheelArrive`): v2.3.3325's one free way in;
    - NOT judged: a join with no remembered place (the first, after a deploy
      or an empty room, past the hour) and its first way in -- a deploy's
      dungeon-goer comes out at its mouth, and every test's new character
      walks in where it is put; a phone in another Wheel's numbers
      (`_wheelInStep`);
    - the lab's new `rejoin` line: a script reconnecting every 3 s 33,333 ->
      694 px/s; the overview's `lastPlace` and `moveBudget.arrival`; kill
      switch `lastplace: false` (and `movebudget: false`); `last-place` suite
      (57, nineteen bugs caught), move-budget §6/§9 updated.
  - since v2.3.3334 A HIT ON A MONSTER NEEDS ITS WEAPON, ITS REACH AND A PAID
    SPECIAL, AND A BOW LANDS NO MORE A SECOND THAN ITS SHOTS (fix 8;
    docs/specs/hit-proof.md, `server/src/hitproof.js`, called by combat.js
    `_handleMonsterDamage`):
    - a `ranged` claim needs the worker's own bow slot (`ps.rangedWeapon`), a
      `staff` claim its staff slot -- never the phone's activeSlot; a bare fist
      still swings (an unarmed player is held in the commons until armed);
    - the reach, from the worker's copy, in EVERY zone: a bow 675 x its Range
      (prog3 Bow lane; an older character's x2.0) + 150 + a second of the
      fastest honest run (`_moveSpeedK` x SPRINT.MULT) -- 1,490 px with no
      points; a staff 675 x its Range + 250 + 0.3 s (a bolt is held to its
      caster: projectiles.js, no range of its own but its life); inside a paid
      bow special's window the Wheel's old 3,600 for the stuck arrows' chips;
    - a special only inside a window a paid swipe opened (`_pveSpecialPaid`,
      index.js `_handleAbilityUse`): 4.5 s, ONE special's shape -- the sword's
      on each monster once (24 at most), the volley's three arrows, the big
      bolt's orbs -- four at once, the oldest with room first; outside one a
      special rolls ORDINARY, never dropped (the phone fires it whatever the
      worker charged; the tutorial's free swipe sends none: TRAPS §206);
    - per player, across every monster (`_hitRateTake`): a bow 5 x (1 +
      Piercing) a second (the phone's 200 ms floor; Piercing from the worker's
      weaponSpecs copy), a staff 2, three seconds waiting; a paid swipe adds
      48 for its chips and its burning patch (eight monsters packed in it,
      the archer at the quickest real pace, are ~50 claims; a script in a
      fight pays a swipe about every 19 s), a paid retreat its shot;
      specials and melee are the lanes';
    - the per-monster lanes trimmed by LAST use (a 40-monster fight wiped the
      lanes of the ones being hit);
    - the lab (`aimbot-bow`, `honest-archer` new; the aimbots held under the
      message budget, 100 a second): a script with no bow 6,009 -> 0 kills an
      hour, with a bow 6,111 -> 2,109 (a perfect archer at the 200 ms floor),
      an honest sword (471) and archer (378) unchanged; the overview's `hitProof`;
      kill switch `hitproof: false`; `hit-proof` suite (66, twenty-six bugs
      caught); anticheat, combat-lifecycle, prog3, pvp-balance and statsim pay
      for their specials as a phone does; a phone test whose bow or staff
      hits must land arms the WORKER as a player is armed (harness.mjs
      `armWorker`: the kit, then the game's own equip_request), never only
      the page -- mp-orbrange and mp-bowmark do (TRAPS §207).
  - since v2.3.3292 (the architecture review): a phone's `dodging` stops a
    player's blow only within 1 s of a roll the worker CHARGED for
    (movement.js `ROLL`, `_rollOn`; it was unbounded, one move made a player
    immune to every player) -- docs/specs/roll-window.md, anticheat §10,
    TRAPS #183; kill switch `rollwindow: false`.

  The fix order is in the review. Re-run the lab after any change to a
  harvest, cook, move or hit path.
- Frame rate on a phone (v2.3.3339, docs/specs/speed-test.md): the QA box
  draws in software (under 3 frames a second), so a phone's frame rate is
  measured ON the phone. The test panel's **Speed test** (no key,
  `src/game/speedTest.js`) times the frames with everything on, then with the
  shadows, the metal shine, the moving water and the full resolution each off,
  and puts them back (page-only switches: `setLightFx(on, false)`,
  `setSheen(on, false)`); its card is what to fix next. `?res=2` draws the
  canvas at 2x (`src/game/renderRes.js` `renderDpr`, read by the four places
  that size the canvas: BroTown `resize()`, pixiApp, pixiRenderer.update,
  worldViewport). `mp-frameprofile` profiles the CPU by source file (build with
  `--sourcemap`) and names what rebuilds each render group's draw list --
  `Graphics.clear()` on an empty graphic rebuilds it (TRAPS §208);
  `mp-speedtest`.

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
- **MEMORY IS BUDGETED (owner directive 2026-10-06, v2.3.3101).** The black
  screens are iPhone Safari running out of memory. The memory work of
  v2.3.3068-v2.3.3088 (docs/MEMORY-PLAN.md) halved what the page holds, and
  the owner asked how a new feature would be kept from giving it back -- "Yes
  all 3": this rule, a budget checked on every PR, and the land tour on a
  button. In any change that adds art, sound or anything it makes:
  - ART is freed when you leave where it is used (the zone-asset exception
    above; its display drops the texture on the way out). A destroyed texture
    really lets go of its picture since v2.3.3069 (pixiApp.js).
  - A picture the game DRAWS ITSELF (a recolour, a cut-out, a bake on a
    canvas) is held twice: the canvas, and its copy on the graphics chip. When
    nothing reads the canvas back and a rebuilt renderer makes it again for
    itself, empty it once uploaded with `keepOnGpuOnly`
    (src/rendering/gpuOnly.js; its header says when that is safe -- the
    walking gear sheets are not: drawGearFrame reads them). Kept that way:
    the combat gear strips and the damage font (v2.3.3088), and since
    v2.3.3150 the gathering figures -- the lumberjack, cook and fire-lighter,
    ~30 MB of canvases a player who gathers held for the rest of the visit
    (effectsRenderer `_gpuOnly`, called after each bake's last read; not the
    lumberjack's source crops, which every re-bake reads; `mp-gatherposes`,
    `mp-gpuonly`). A test that reads such a picture's pixels off its canvas
    sets `window.__btTrimVerify` in its init script (mp-chopink, mp-cookink,
    mp-fireink) -- not `?gpucopies`, which a guest's page loses when it
    reloads into `?guest=1` on the way in.
  - MUSIC, and any sound longer than a few seconds, plays through the music
    deck (BT_AUDIO's zone and global music, streamed from its file since
    v2.3.3073) -- never SFX_MANIFEST, which decodes the whole file into memory
    and keeps it there.
  - Anything made per zone change, per land, per fight, per dungeon or per
    renderer rebuild is DESTROYED when it goes; a cache has a cap (an LRU),
    never "until the page closes".
  - A POOL GIVES BACK WHAT A SPIKE MADE (v2.3.3152, found by a leak hunt): the
    hit effects' pools kept every sprite a big fight drew (1,436 hidden after
    one Great Cave wave) -- a pool trims to what it drew in its last few
    seconds (hitMaterialFx.js `TRIM_MS`) and empties on a zone change. And a
    picture freed is not only your sprites' business: Pixi's pooled mask
    filter and shared shaders keep the last picture they drew, and pixi 8.17
    destroyed their bind group with it, so the next sprite mask broke the
    frame (TRAPS §143, `src/rendering/bindGroupFix.js`). Pixi's own
    TexturePool (every filter pass's scratch, every canvas Text's texture)
    kept on the GPU the most of each size ever used at once; one unused for
    30 s is destroyed now, and a zone change empties it
    (`src/rendering/texturePoolTrim.js`, only with the bind-group fix on;
    `?poolkeep` to compare; `window.__btTexPool()`). The census is
    `window.__btSceneCensus(depth)` (the scene counted by path); `mp-sceneleak`
    checks all four, a rebuild's shadow system included.
  - A HIDDEN TEXT STILL HOLDS ITS PICTURE (v2.3.3310, found when the memory
    check went red at random on main): a speech bubble that went away was
    hidden and kept, so every townsperson's and player's last line -- 1 MB of
    the graphics chip for two lines on a 3x phone -- stayed there for the
    visit, and the townsfolk drew a new one every 8-23 s wherever you were. A
    bubble is destroyed when it goes now, and a townsperson more than 2,400 px
    away draws none (effectsRenderer `_updateChatBubbles`); anything else made
    of words that is gone for good is destroyed, never only hidden (TRAPS
    §192). And the check's third trip leaves out pictures made before the
    second ended and drawn for the first time since (each texture's `uid`,
    `window.__btGpuTex()`'s `uidNow`): a body strip loaded behind the loading
    screen reaches the graphics chip the first time it is drawn, and which
    trip first draws it is luck.
  - A PICTURE ON 256 COLOURS OR FEWER IS KEPT AS COLOUR NUMBERS (v2.3.3190 --
    the owner asked whether the art could be "recreated byte for byte using
    pure code"; not that, a drawn picture costs the GPU what a loaded one does,
    but "Yes" to this): the Wheel's ground pieces and object sheets are R8
    textures, one byte a pixel, and their colours a row each of one 256 x 256
    atlas, drawn by a second Pixi batcher whose shader does the smooth lookup
    itself (`src/rendering/paletteTex.js`; the worker sends a piece as numbers,
    `public/tools/world/core/piecePalette.js`; a sheet is read as its numbers
    in `src/rendering/png8Worker.js`). The rules that come with it:
    - which batcher draws a sprite or mesh is decided by its TEXTURE where Pixi
      hands it to its batcher (BatcherPipe.addToBatch, inside sharpPixels' own
      wrapper) -- anything drawing an object's picture (its shadow pool too)
      needs nothing;
    - NEVER read such a picture's `source.resource` on the CPU (it is numbers):
      `drawSourceRect` (paletteDraw.js) for a read at its own size, and a read
      that SCALES it reads the sheet's own `<img>` (TRAPS §166);
    - a buffer at resolution 2 must be uploaded at its pixels (TRAPS §165);
    - `?nopalette` is the old way, all of it; `mp-palette` compares the two
      frame for frame (0.03-0.05% of pixels one level of 255 apart) and times
      the frame both ways, `server/test/palette.test.mjs` the decoders,
      `__btPalette()` the probe;
    - measured, BroTown's arrival on the QA phone: GPU 104 -> 72 MB, art from
      files 156 -> 125, buffers +8 (the sheets' numbers, kept to upload again
      and for the CPU readers; mp-membudget's `buffers` line raised to 24 for
      it); the cost, eight reads a pixel where the chip did one, on the QA
      box's software chip a frame 20-27% longer in BroTown and 14-21% among
      trees and water -- not measured on a phone:
      docs/specs/palette-textures.md.
  - THE CHECK: `mp-membudget` runs on every PR (`.github/workflows/memory.yml`,
    the `memory-budget` check): a phone in BroTown, at a Flame Fields fight and
    home again, three times. Each kind of memory's highest reading must stay
    within its line in `tools/qa/mp/memory-budget.mjs`, and the third trip must
    end where the second did. Over a line? First find what the change holds
    (the failure names the line; `tools/qa/mp/out/membudget.json` has every
    stop and the biggest canvases; `mp-gpuaudit` names the textures). If the
    feature really needs the memory, raise THAT line in the same PR and say in
    the PR body, in plain words, how many MB and why -- the owner reads it
    there. NEVER raise a line silently, or to turn a red check green without
    saying so. Lowering a line after a saving locks the saving in.
  - THE TOUR: `mp-memledger` (all eight lands twice, ~6 min) runs from a button
    -- GitHub, Actions, "Memory", Run workflow -- after any big feature, or
    locally with `node tools/qa/mp/run.mjs memledger`.
  - The preloading law above still stands. Moving a load off the loading
    screen to save memory is the owner's call, as #822's gathering poses were,
    never a quiet "fix".
- **A PAYMENT, ITS STAMP AND A SWAP'S BOTH SIDES ARE ONE WRITE (v2.3.3294,
  docs/specs/inbox-escrow.md).** "Atomic" means one synchronous run of writes
  with no await between them; the input gate keeps other events out of the
  middle but does not make writes one, and every merge restarts the room
  between two awaits. Found by the architecture review: `_creditPlayer`
  stamped, awaited, then paid; both trade lanes saved the debits and awaited
  each credit; staging a weapon wrote escrow before the stash; two credits to
  one player rewrote the mailbox over each other. Now the stamp goes out with
  the payment, a running opId answers 'dup', the mailbox is taken one at a
  time (`_inboxSerial`), and a swap with both sides online credits in the
  debit's run (`_creditLiveTogether`). `inbox.test` §8c crashes at every write
  (all seven failed on main); handoff rules 5 and 7, TRAPS #184.
- **WHAT PLAY WRITES IS GUARDED (v2.3.3270, the cost diet).** The owner:
  "Build my game so that it's the most cost effective that it can be without
  losing quality." Measured, the game already writes and sends about the least
  it can without a player seeing a difference (docs/specs/cost-diet.md: what a
  player-hour costs, what was tried and why it was not shipped, and what is
  left, each with what it would cost in quality -- the owner's call):
  - every storage put or delete is a ROW WRITTEN ($1 a million on the paid
    plan); standing and walking write nothing, a kill or a harvest one row, your
    health at most every `REGEN_SAVE_MS`, the gatherer's bot statistics every 5
    minutes (`BOTFP.PUT_MIN_MS`, was 30 s);
  - since v2.3.3305 a melee kill that heals you is one row too: its lifesteal
    ran after the kill's save and saved the record again, a fighter's 1,030
    rows an hour 760 now (cost-guard §5c, cost-diet.md);
  - `server/test/cost-guard.test.mjs` holds those lines (a feature that saves on
    a timer, a move or twice an event fails there); moving a line is said in the
    PR body in plain words, as with the memory budget;
  - `node tools/qa/load/cost-audit.mjs [minutes] [players] --seed=N` measures
    the rows a player-hour of idling, walking, fighting and gathering writes, by
    key and by the code that wrote it, the same every run on the same code;
  - a value a player SEES (loot, XP, gold) is still saved before its message
    goes (ARCHITECTURE-HANDOFF rule 10): batching it is the owner's call, never
    a quiet saving.
- **ONE SOCKET CANNOT STOP THE GAME (v2.3.3274, docs/specs/one-socket.md).**
  The anti-bot review's urgent five, closed in `server/src/flood.js`: a row
  written per message (mute no-ops, a stat flood, offline DMs) -- nothing
  written when nothing changed, a player's own saves PACED (`_saveRpgPaced`,
  handoff rule 27; v2.3.3293: `shield_wear` too, and the trade window's
  weapon lane by its messages, `PACE.T2WPN` -- the architecture review found
  both writing a row a message, `cost-guard` §9); `?room=<anything>` made a room awake and billed -- only
  the main room and `ROOMS` in wrangler.toml, anything on a local host; no
  limit on messages a socket -- a budget (300 then 120/s, drops, close 4012);
  the room's places held by sockets that never joined, a second join adding
  a player, one address holding every place -- nothing but join/pong before
  the join, a 15 s join window and one join a socket (close 4011), 16 places
  and 20 opens a minute an address (live flags `ip_sockets`, `ip_joins_min`,
  0 = off; CF-Connecting-IP, so local tests are never counted); a `null`
  frame threw -- dropped. `flood` suite (46); the bot lab's `writes` and
  `roomfill` probes show the before and after. Still open: the farming holes
  (the review's 6-9; 6, the harvest, closed in v2.3.3322: harvest-proof.md;
  9, the flags shown, v2.3.3323: bot-flags.md; 7, movement, v2.3.3325 and the
  reconnect v2.3.3327: move-budget.md, last-place.md; 8, fighting, v2.3.3334:
  hit-proof.md).
- **THE ACCOUNT CHECK (v2.3.3275, docs/specs/account-check.md).** A character
  that does not exist yet (an id with no `auth:` record: a first join, every
  guest) is asked for a Cloudflare Turnstile token before the identity is
  made (`server/src/verify.js`, inside join.js `_verifyJoinAuth`'s no-record
  branch, BEFORE the record is stamped: a refused join writes nothing); the
  phone shows the gate (wsClient.js `showVerifyGate`) on `join_rejected
  {reason:'verify', sitekey}` / close 4014 and joins again with the token as
  `verify`. OFF until both `TURNSTILE_SITEKEY` (wrangler.toml) and
  `TURNSTILE_SECRET` (a dashboard secret, set LAST: an old page reads the
  refusal as fatal) exist; `disable_verify` live flag; fail closed;
  `TURNSTILE_VERIFY_URL` is the test seam. `verify` suite (24), `mp-verify`
  (its own worker, `BT_WRANGLER_VARS`, a stand-in verifier and widget).
- **ONLY THE GAME'S OWN SITES OPEN A GAME SOCKET (v2.3.3312,
  docs/specs/origin-lock.md).** The owner: "I only use Brotown.net for this
  game and that's the only domain I plan to keep using." The worker's `/ws`
  route reads the browser's `Origin` before any room (`server/src/origin.js`):
  brotown.net and gamedev-aix.pages.dev with every address under them,
  `ORIGINS` (wrangler.toml) more, a machine's own pages (localhost, 127/8, the
  private ranges) and NO Origin (a program -- our tools; TRAPS §195) are let
  in; any other site, `null` or a look-alike gets `join_rejected
  {reason:'origin', home}` and close 4015, the page `ui/OriginScreen.js`
  ("This isn't the official BroTown", a button to brotown.net, no retry; an
  old page reads it as fatal), a plain request a 403; each refused site
  logged once. A NEW DOMAIN GOES IN `ORIGINS` BEFORE PLAYERS USE IT.
  `ORIGIN_LOCK = "off"` is the lever (an env var: the check runs before the
  room's live flags). The HTTP routes are not locked. `origin` suite (33),
  `mp-originlock` (a second browser with `--host-resolver-rules`, so the
  copy's Origin is the browser's own; `H.newPlayer`'s `host`,
  `H.launch(args)`).
- **A CHARACTER'S KEY WORKS ON THE DEVICES IT IS PLAYED ON (v2.3.3344,
  docs/specs/device-lock.md).** The owner: on at once, their own tool the way onto
  a new device, a short note to players.
  - `auth:<id>` keeps the devices its key is used from (`devs`, 12 at most):
    the browser's own `bt_device` token, which the join already sends.
  - The right key from any other device is `join_rejected {reason: 'device'}`
    and close 4016 -- never `auth`, which makes the phone throw its key away.
    The phone's `src/ui/DeviceScreen.js` shows the player's code (their id) to
    give the owner.
  - The owner lets one new device in for 30 minutes from the Test panel's
    Player logins (`/api/admin/device-pass`), or forgets a character's devices
    and seals it for one someone else got into (`device-forget`).
  - A character with no known device takes its next one. The devices the bot
    checks already knew are filled in once (`devlock:filled`).
  - The login check still answers `exists: true` for older phones, with
    `device: 'unknown'`; the picker's restart refuses from an unknown device.
  - A phone test that brings a character back in a second browser gets its
    device (harness `newPlayer`'s `device`; `'fresh'` is a new one).
  - Kill switch `devicelock: false`; `device-lock` suite (67), `mp-devicelock`.
- **NEW LOGIN KEYS, MADE BY THE SERVER (v2.3.3355, docs/specs/login-keys.md).**
  Step 2 of the owner's login plan ("8 short words"):
  - a key is eight of 1,422 short words (`server/src/keywords.js`, the EFF
    list's, CREDITS.md), made in `server/src/loginkeys.js`, kept only as a
    fingerprint (`auth.keys`, `keyidx:<h>` for the door), good from ANY device;
  - a phone that joins with `kv: 2` and the OLD key, on one of its devices, is
    handed one after its join (`key_new {key, id}`, PRIVILEGED, the direct
    switch) -- its own key a device, the old key kept beside it on the phone
    (`bt_passphrase_old`) until a join with the new one gets in; a NEW
    character is handed one at its first join and its first key is RETIRED at
    the new one's first use (`fresh`, `oldGone`);
  - a new key's id is KEPT, never worked out from it: `idForKey`
    (networking/index.js: `bt_key_ids`, the roster's rows, the mirror's `i`),
    everywhere the phone used to call passphraseToId on its key; the join
    takes the kept one, and a `key` refusal of a new key asks the door once
    whose it is (a key put on a phone by hand);
  - refusals `key` (4017: a new key not the character's, an old key retired)
    and `locked` (4018: five wrong keys in a minute, which used to answer
    `auth` -- a phone threw its key away over someone else's guesses; a
    matching new key goes through a lockout) -- never `auth`;
  - the owner's Forget takes every key back, and "Give it a new key"
    (`/api/admin/key-new`) is the full reset, its key shown once in the panel;
  - a phone test's new character is handed a new key at once, so a test of
    the OLD key's device lock makes its character on an older phone: an init
    script that takes the join's `kv` off (mp-devicelock, mp-newkey);
  - kill switch `keys2: false` (no key handed out; made keys still work);
    `login-keys` suite (73), `mp-newkey`;
  - since v2.3.3372 ONE CHANGE AT A TIME TO A LOGIN RECORD: every
    read-and-write of `auth:<id>` -- the join's check, the handout, the
    owner's three tools -- runs in that character's queue (devicelock.js
    `_authSerial`), and the handout re-reads the record: a join whose key or
    device a Forget or Give a new key took away since its check is put out
    (`_authPutOut`) and handed nothing. In the suite's room a Forget was
    written back over, and a join past its check was handed a new key after
    it (TRAPS §219); login-keys §12 (21).
- **EVERY KILL SWITCH CAN BE THROWN (v2.3.3295, TRAPS §117).** A live flag's
  name is lower case (liveops.js `FLAG_NAME_RE`), so the five camelCase caps
  whose comments promised a `false` switch -- `storeGear`, `dailyChest`,
  `zoneDepth`, `whirlWindup`, `broCount` -- answered POST /flags with a 400.
  They are taken by name now (`CAMEL_SWITCHES`, `flagNameOk`) and no other
  camelCase name is (`weaponDrops` stays refused). A new switch takes a
  lower-case name: `liveops.test` §8 scans `server/src` for every flag read
  and every `` `<name>: false` `` promised beside "live flags" or "kill
  switch", and fails for one the route would refuse.
- Code comments carry version tags (e.g. `v2.3.694:`) explaining WHY a
  change exists, often with incident history. Match this style; the
  comments are the project's institutional memory.
- **EVERY MONSTER HIT ON A PLAYER GOES THROUGH ONE DOOR (v2.3.3296,
  docs/specs/hit-door.md, handoff rule 28).** The GDD's "interceptor chain",
  built for real: `hits.js` `_monsterHit` runs the harvest shield, the safe
  ground, a roll, a rock, the shield (cost, parry, a hit of 0), the one-hit
  rail, the dice, the monster's after-effects and the event/save/death in one
  order, and `MONSTER_HITS` says what each way of being hit does at each step
  (`swing`, `snowball`, `pile`, `kit`, `burst`, `boss`, `fire`, `shock`,
  `burn`, `poison`). The seven old copies are wrappers. The table was the old
  behaviour cell for cell; `hit-door.test` pinned it before the door existed,
  and §10d fails a new caller of `_applyDamage`. Since v2.3.3300 the owner's
  nine decisions on it ("keep going on recommended", hit-door.md "Decided"):
  every block costs the one 10 (the snowball's free), a snowball from behind
  lands, every blow leaves a harvester alone, a paid dodge or lunge slips the
  swing, ball, casts, burst and a boss (not the pile, fire, arcs or ticks, nor
  the retreat shot's roll: movement.js `_rollIFrames`, kill switch
  `monsterroll: false`; a rolled or covered slam is a MISS, and the phone
  shows a hit that lands mid-roll), the pile and a boss parry, a rock is asked
  first of every blow that travels, a boss's block saves the pools, and no
  block counts as a hit; `hit-door.test` (218).
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
