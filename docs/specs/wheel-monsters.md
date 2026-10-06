# The Wheel's monsters — each land's at its inner end (v2.3.2978), and past level 5 (v2.3.3013)

Owner, 2026-10-02: "can you place the monsters where they belong in their
zones (on the ends closest to the central map)?"

The Wheel (`?trial=wheel`, docs/WORLD-MAP-PIPELINE.md) had no monsters: a
trial player stood in `worldview`, the safe hub, on a 43,008 px map the worker
knew nothing about. Now the Wheel is a zone of its own on the worker, `wheel`,
and each of today's eight element zones brings **its own six monsters,
unchanged**, to the **inner end of its own spoke**: the land's first stage
(levels 1–5), just past the safe commons round Brotown.

## What the player sees

- Town's World View stairs lead into the Wheel as before. Against a worker
  that runs the Wheel's monsters, the zone is `wheel` and the monsters are
  there; against an older worker, nothing changes (below).
- Walk out of the commons down any spoke and, about 350 px past where the
  land begins, that land's monsters stand: snowmen on Frost Ridge, fire
  goblins on the Flame Fields, mummies (and the skeletons they turn into),
  rock monsters, fishmen, wisps and lurkers, blue slimes, slimes — each
  skinned as at home, level 1 or 2 as at home (nearer the commons level 1).
- They fight, chase, die, drop their remnants and shards, pay XP and count
  for "kill N in Frost Ridge" quests exactly as at home.
- **The commons and Brotown are safe ground.** No monster goes after anyone
  standing there, however near, steps onto it, or lands a hit there — not even
  a swing it had started, or a ball already thrown. A chase also gives up
  720 px from the monster's own spot. **Since v2.3.3056 there is one
  exception: a monster you hurt follows you onto it while you keep fighting**
  (see "Provoked from the safe ground" below).
- Dying in the Wheel brings you back in town, as dying anywhere does.
  **Since v2.3.2990** that town is the Wheel's Brotown: the Wheel is
  everyone's World View, a new session and a respawn both take you straight
  down town's stairs into its town square, and until you have spoken to Mayor
  Bro you stay inside the safe ground below (`src/game/wheelHome.js`;
  docs/WORLD-MAP-PIPELINE.md "The Wheel is the world").
- Every land's monster art loads behind the Wheel's loading overlay (the
  zone-asset exception of the preloading law), and all of it is let go when
  you leave. **Since v2.3.2989** (the owner: *"Yes only load as you walk
  towards it"*) a land's monster looks load as you walk toward it instead,
  and go once you are well away — see "Looks loaded as you walk" below.

## Where they stand

The worker has no copy of the map and must never build one (the plan is about
a second and 13 MB). So the places are worked out from the plan by
`tools/world/bake-wheel-spawns.mjs` and written into the worker as plain
numbers, `server/src/wheelspawns.js` (generated, never edited by hand).

For each spoke, a place is a blueprint cell that is:

- open ground (`C.ground`) of that land, on its **first stage** (tier 1:
  levels 1–5 — the first bake let its band run ~300 px into levels 6–10,
  caught by the test below before it shipped);
- between 350 px past where the land begins on the spoke's axis and where the
  first stage ends there (at most 1,350 px), and within 420 px of the axis;
- 168 px from water, a cliff or lava; 72 px from a road, the railway or a
  bridge; 300 px from the commons; 24 px from the footprint of anything
  placed there (placing.js's trees, rocks and props, catalog-sized).

Twelve are kept a land (mist has ten), spread as far apart as the land allows,
at least 150 px; six are used today, one per monster, in order. Each carries
its depth in the band (0 at the inner end, 1 at the outer), which sets the
level the way a zone's depth does at home.

The worker redeploys only when `server/**` changes, so a change to the plan or
to placing.js that moves the land must re-bake in the same PR:

```
node tools/world/bake-wheel-spawns.mjs           # writes server/src/wheelspawns.js
node tools/world/bake-wheel-spawns.mjs --check   # exit 1 if stale
```

`tools/world/test-world-core.mjs` fails with that command in its message when
the two disagree.

## Server (`server/src/wheelzone.js`)

- `wheel` is in `VALID_ZONE_IDS` but **not in `ZONES`**, and
  `_getZoneConfig('wheel')` is null, like the hubs'. Every consumer already
  guards on that: knockback/pull/burrow clamps skip (a 43,008 px zone has no
  edge to clamp to), the population scaler skips, resource nodes skip (no
  nodes over the sea; fishing has its own round), and every `ZONES`-wide rule
  (PvP needs `ZONES[z].lawless`) fails closed.
- `_spawnZoneMonsters('wheel')` → `_wheelSpawnMonsters()`: for each of the
  eight homes, that zone's spawn list through the same `_makeZoneMonster`
  (built at a stand-in point of its home zone's own frame at the place's
  depth), then moved to its place. Each monster carries **`home`**,
  server-authored, ids `wm-<home>-<k>`.
- `_rewardZone(zone, m)`: a Wheel monster pays out for its home — shards,
  weapon drops, gem raws and quest kill credit — because a shard named after
  `wheel` is not an item.
- **Safe ground** (`_wheelSafeAt`): the commons and the town, as one circle,
  `WHEEL_SAFE_R` (2,937 px) round `WHEEL_CENTRE`, baked with the places. Every
  land cell of the commons and the town lies inside it (out to 2,871 px), and
  the nearest place stands 184 px outside it. Nobody on it is a target (the
  aggro scan and the sticky override, index.js), a monster standing on it
  drops its chase, and `_monsterStrikePlayer` — the one choke point every
  monster→player hit goes through — lands nothing there. The chase leash alone
  did not do this: the places stand only ~180–320 px from the commons, and the
  first test's fight picture showed a goblin that had chased ~400 px into it.
- Chase leash (index.js, the chase branch): past `WHEEL.CHASE_LEASH` (720 px)
  from its spawn a monster drops its target; past `WHEEL.PURSUE_LEASH`
  (1,800 px) when it is pursuing the one who provoked it (v2.3.3056).
- **What a player hears** (tick.js, `_wheelInterest`): a v2 session in the
  Wheel gets the deltas of only the monsters within `WHEEL.INTEREST_R`
  (2,400 px) of the player, keeps them until `INTEREST_OUT` (2,800), and gets
  a monster whole on the tick it comes into reach, moving or not, so it is
  never drawn where it stood when last heard; leaving the Wheel forgets the
  set, so a return re-sends every one in reach. Such a session's tick is
  serialised for it alone (every other zone still shares one per zone).
  Measured standing in Brotown's square for 10 s: 439 messages and 846 KB
  before (~44 a second, ~85 KB a second, every one about monsters 3,000 px
  away), 25 messages and 4 KB after -- what the World View sent before the
  Wheel had monsters (22 and 3.6 KB).
- Ranged cap (combat.js): a hit lands only within `WHEEL.RANGED_MAX`
  (3,600 px) of its monster. Ordinary zones need no ranged gate (a whole zone
  is in range); the Wheel is forty zones across.

### Wire

- `state_sync.caps.wheelmonsters: true` (join.js).
- In `wheel` only, a monster in the join snapshot and in `zone_state` carries
  `home` (and `variant`, in `zone_state`). Every other zone's snapshot is
  byte-for-byte unchanged (the suite checks `tidal`). No new message type.
- In `wheel` only, a v2 session's `tick` carries only the monsters in its
  reach (above).

### Kill switch

Lower case on purpose (TRAPS §117): `wheelmonsters: false` in liveflags
un-advertises the cap (join.js spreads the flags over the caps), so a client
that joins after it keeps the Wheel on `worldview` as before; and a Wheel
spawned after it is empty. A Wheel already spawned keeps its monsters until
the room restarts (no tick polls the flag).

## Client

- `src/data/zones.js`: a `wheel` entry (hidden from the Encyclopedia, no
  spawns of its own, `homes: [the eight]`, levels 1–2), and
  `isWorldViewZone(z)` — `worldview` or `wheel` — at every hub check
  (zoneTransitions, tileRenderer, gameDisplay, questRoute).
- `src/game/worldTrial.js` `trialZoneFor`: town's World View exit leads to
  `wheel` only in the Wheel trial **and** against a worker that advertises
  `caps.wheelmonsters`; otherwise `worldview`, as before.
- Art: `variantsForZone('wheel')` is the union of the homes' variants, so
  `preloadZoneAssets('wheel')` loaded all eight lands' monsters behind the
  overlay (until v2.3.2989: now it loads none of them, below) and
  `freeZoneAssets` lets them go; the snowman's sheets follow any zone he
  stands in. `wsClient` skins each monster by `local.home`.
- `lifeSkills.spawnGatherNodes` places no nodes in a zone with `homes`.
- **Far off screen is not drawn** (entityRenderer `_updateMonsters`,
  `FAR_MARGIN`): in a zone with `homes`, a live monster farther than the view's
  half-diagonal plus 400 px from the view's middle has its display hidden and
  is skipped; it keeps its display, and is shown again the frame it is in
  range. Measured from Brotown's square (all 48 far away), the renderer's own
  stage timings went from 1.4–2.0 ms (entities) + 2.3–2.5 ms (drawing) a
  frame to 0.33–0.36 + 0.82–0.94 — the same as with no monsters at all
  (0.32–0.34 + 0.79–0.89). Pixi's texture GC may then drop a far land's GPU
  copies after a minute unused, like any unused animation's (and since
  v2.3.2989 a land's looks are let go once you are well away, below).
  `S._viewW/_viewH` (pixiRenderer) give the view; `S._monstersFarHidden` is
  the QA readout.
- **Leaving clears the list** (zoneTransitions, the hub-exit flip): until the
  Wheel no hub held server monsters, so the hub exit never cleared them; the
  Wheel's 48 stayed in the list until town's `zone_state` came in, the
  renderer re-made them in town, and the deferred art free pulled their
  sheets out from under them ("Cannot read properties of null (reading
  'addressModeU')", caught by mp-wheelmonsters).

## Deploy order (rule 19)

- New client, old worker: no `caps.wheelmonsters`, so the client asks for
  `worldview` as before — never for a zone the old worker would refuse.
  Since v2.3.2990 that player still starts in the Wheel's Brotown, on
  `worldview` with the Wheel's ground and no monsters: the spawn trip waits
  for the worker's caps before taking the stairs, so it never picks the zone
  before the worker has said which one it runs.
- Old client, new worker: an old client never asks for `wheel`; the cap is
  ignored.

## Measured (headless Chromium, phone viewport, local worker)

- Decoded monster art: 0 MB in town, **60.3 MB in the Wheel**, 0 MB back
  home. All textures: 170.5 → 241.3 → 170.8 MB.
- The way in, from the stairs to the overlay lifting: 7.7–9.8 s on this
  4-vCPU box, against 6.2 s without monsters -- the eight lands' monster art
  loading behind the overlay. Approach-loading (below) would take this back.
- Walking, nothing measurable: the same brisk walk profiled with and without
  the monsters spent ~93% of the main thread in the box's software graphics
  either way, the game's own JavaScript the same, and the ground's "pop-ins"
  on it were 58 with monsters and 66 without. That count swings from 11 to 72
  run to run on a box with no graphics card (mp-wheeltrial's check fails
  before and after this change), so it says nothing about a phone.
- If the 60 MB ever matters on a phone, the next step is loading each land's
  monsters as you approach it — which bends the preloading law and needs the
  owner's yes first. (Given, and done: v2.3.2989, below.)

## Looks loaded as you walk (v2.3.2989)

Owner, 2026-10-02: *"Yes only load as you walk towards it."*

- **What loads when** (`src/rendering/wheelMonsterArt.js`): a monster type's
  LOOK — a variant's sheets with any recolour it asks for, the mummy's with
  the skeleton it turns into, or the snowman's sheets and his snowball's
  burst — loads when a monster wearing it is within `LOAD_R` 2,600 px of you.
  The worker tells a phone of the monsters within 2,400 px (and of all 48 in
  the zone's first list), and a monster comes on screen within about 500 px,
  so there are some 1,900 px of walking to load it in. A look none of whose
  monsters has been within `FREE_R` 3,600 px for `FREE_AFTER` 10 s is let go;
  a sprite module two looks share (rockmonster and thornShambler, fishman and
  bogLurker) is kept while either is.
- **Only your own land's (v2.3.3017).** The owner, 2026-10-04: *"I was
  fighting fire goblins and my screen went black."* The spokes' inner ends
  are ~1,630 px from their neighbours' across the water, so at the Flame
  Fields `LOAD_R` reached Frost Ridge and the Wind Dunes, and four looks were
  held: the fire goblin's, the mummy's, the skeleton's and the snowman's,
  ~57 MB of the asset cache's 239 (mp-wheelmem), within a few MB of the
  ~250 MB at which iPhone Safari kills a tab. Now `LOAD_R` and `FREE_R` are
  for the monsters of the land you are on (`wheelLandAt` in
  `src/data/zones.js`: the land whose anchor is nearest in direction from the
  Wheel's middle). Another land's look loads only when one of its monsters is
  inside `foreignBox`: the screen's own box round you, each half grown by
  `NEAR_LEAD` 700 px (`NEAR_MIN` 1,000 at least). A phone held upright sees far
  up and down and little sideways, and the neighbouring lands lie to the
  sides; the first cut used the half-diagonal, 1,589 px on the test phone
  against their ~1,630. That's as near as you get without walking into that
  land, where its monsters are yours. It's kept to 600 px further.
  test-world-core "which land a Wheel point is on".
- **From Brotown's square none is near** (the nearest is ~2,800 px): the
  Wheel arrives with no monster looks at all. `preloadZoneAssets('wheel')`
  loads none of them (nor the snowman's); leaving lets everything go, as
  before.
- **Never drawn without its look**: in the Wheel a monster whose look is not
  ready — a slow phone, or one met before its look, say on a reconnect inside
  the Wheel — is not drawn at all (never in a stand-in body) and holds no
  display, so nothing points at a look that was let go (entityRenderer
  `_updateMonsters`, `wheelArtReady`). The lazy first-sighting kick in
  `monsterVariantSprites.variantSpritesFor` is off there (`setVariantKicks`),
  so nothing else starts a load behind its back. The ones in view that wait
  are counted (`S._monstersArtWait`), and the longest wait is in the
  readout's `monsters` line and `window.__btWheelArt()`.
- **Measured** (mp-wheelmonsters, headless Chromium, phone viewport, local
  worker): monster looks **0 MB on arriving in the Wheel** (was 60.3), all
  textures 170.5 → **175.9 MB** on arrival (was 241.3); walking out to Frost
  Ridge and the Flame Fields loaded 5 looks, the slowest in 1,069 ms, and no
  monster in view ever waited (0 ms): 58.3 MB of looks, 222.9 MB of textures;
  back home 0 MB (171). mp-wheeltrial's walk-past-the-ground pop-in check
  still swings with this box's load (42 before this change at v2.3.2983, 59
  at v2.3.2985, 43 after), as noted above.

## Past level 5 (v2.3.3013)

Asked *"monsters past level 5 ... levels 6–20 in all eight lands (up to the
first pass)"*, the owner, 2026-10-03: *"Yes continue working on those items."*

Each land's first stage, "the thaw line" on Frost Ridge and so on, runs levels
1–20, one **stretch** (a tier: one zone of walking, five levels) at a time,
and the top bar names the stretch you stand in ("Frost Ridge / the thaw line ·
Lv 11–15"). Only the first stretch had monsters. Now the next three do too.

- **Who:** each land's own spawn list again, per stretch: the same
  archetypes, counts, skins and element (six snowmen a stretch on Frost Ridge,
  four wisps and two lurkers in the Mire, ...). 8 lands × 3 stretches × 6 =
  **144 more, 192 in all**. Ids `wm-<home>-t<tier>-<k>`. The first stretch's
  48 are exactly as they were (places, levels, ids) and first in the list.
- **Their levels:** the stretch's own: 6–10, 11–15, 16–20, by how far out a
  monster stands in its stretch's band (inner end lowest), as the first
  stretch's go by depth. The first stretch keeps levels 1–2, the owner's
  directive for starting zones (server/src/data.js, v2.3.1160).
- **Their stats** come from the one copy of the math: `_makeZoneMonster` is
  given the level (`atLevel`, its new last argument; omitted everywhere else,
  so every other monster is built exactly as before). A level-20 snowman: 143
  HP (67 at level 1), hits for 31 (14), pays 24 XP (10) and more gold, and the
  weapon-drop roll's own cubic level curve (0.074% against 0.05%). The level
  also sets the **edge** (v2.3.2680): your Dodge, Defense and Resist fade to
  nothing against a monster five levels above you, and your Power against it.
- **Rewards:** the home's, as for the first stretch (`_rewardZone`): its
  shard, its weapon roll, quest kill credit.
- **Where they stand:** baked like the first stretch's
  (`tools/world/bake-wheel-spawns.mjs`, `SPAWN_RULES.deep`), into
  `WHEEL_SPAWNS[home].deeper`: `{ tier, levels, band, points }` per stretch,
  12 places each, 6 used. A place is open ground of its land **on that very
  tier**, within 420 px of the axis, `clearTier` 120 px from land of any other
  tier (the tiers' edges wander, tierWarp), so a monster and its 180 px wander
  stay among the levels the top bar says there; `clearPlace` 360 px in a
  straight line from a camp's plot (the waystation at level 20); and the first
  stretch's clearances from water, cliffs, lava, roads and objects.
- **Kill switch:** `wheeldeep: false` in liveflags leaves a Wheel spawned after
  it with the first stretch's 48 alone. `wheelmonsters: false` still empties
  it.
- **The client** shows such a monster's own level. `applyZoneVariant`
  (monsterVariants.js) clamped every monster's level to its zone's range, and
  for a Wheel monster that is its home's 1–2, so a level-18 snowman read
  "Lv 2" on a calm plate. A monster carrying `home` is no longer clamped. The
  renderer's probe (`__btMonsterSprite(id).plate`) reports the plate's level
  and band.
- **Deploy order:** no new cap. A new client against an old worker sees the 48
  as before. An old client against a new worker sees all 192, the deeper ones
  wearing "Lv 2" (the clamp) until it reloads: cosmetic, since the worker
  decides every hit.

### What it costs

- **The worker's tick.** The monster-to-monster separation pass checked every
  pair: with 192 that is 18,336 pairs a tick, and it was 1.0 of the 1.27 ms the
  whole monster tick took with them (measured, 45 ticks a second). In the
  Wheel it is now a sweep along x (`_wheelSeparate`, wheelzone.js): the same
  push for every pair within 22 px, found by sorting, never more than the few
  neighbours within 22 px in x. The whole tick with 192: 0.26 ms (0.19 ms with
  the old 48 and the old pass). Every other zone runs the old loop unchanged.
  Without the pass the rest of the tick is about 1 µs a monster, so the 768 a
  full spoke would hold (levels 1–80) would cost about 1.1 ms a tick; a
  "sleep when no player is near" rule is the next step if that ever matters.
- **The way in.** The Wheel's `zone_state` carries every monster, now 192:
  43 KB once, on the way in or after a respawn (about 11 KB before). The ticks
  after it still carry only the monsters within 2,400 px.
- **The phone.** Nothing new to load: a stretch's monsters wear their land's
  looks, which load as you walk toward them (below). From Brotown's square all
  192 are far off screen and none is drawn.
- **The resources keep clear of them.** The Wheel's resources (v2.3.3012,
  docs/specs/wheel-resources.md) stand at least 300 px from every monster
  place. Their bake took only the first stretch's places until the two came
  together; it takes each land's `deeper` ones too now, which moved 84 of the
  nodes and added two fishing spots (142 in all).

## Provoked from the safe ground (v2.3.3056)

Owner, 2026-10-05:

> make it so monsters can still chase you out of their zones. I was sitting in
> a safe zone just sniping mummies with magic and they couldn't attack.

They couldn't. The safe ground dropped a shooter from every monster's mind
each tick, so a mage at its edge could empty a land's first stretch with no
risk at all. Now the safe ground shelters everyone **except from a monster
they provoked**.

A player has provoked monster `m` (wheelzone.js `_wheelProvokedBy`) when:

- they have hurt it this life (`m.dmgByPlayer[pid] > 0`); and
- they are still fighting: they dealt damage to anything within
  `WHEEL.PROVOKE_MS` (10 s, the sticky aggro's own window). `ps._lastDealtAt`
  is stamped by every player→monster damage path (combat, abilities, the
  arrow blast, the burst), and a respawn clears it.

`_wheelSheltered(m, pid, x, y, now)`: off the safe ground, never sheltered. On
it, sheltered unless provoked. With no monster in hand (a burn or poison
ticking, burning ground), sheltered unless still fighting at all.

Where it is asked, which is every place the safe ground was:

| Where | What changes for a provoker |
|---|---|
| index.js, the sticky target and the aggro scan | they stay the monster's target on the safe ground |
| index.js, the chase leash | `PURSUE_LEASH` 1,800 px from home (the first stretch's places stand 184–915 px outside the safe edge, so 720 could not even reach it), and the monster may step onto the safe ground |
| `_monsterStrikePlayer` (the swing, a thrown ball, a burrow surfacing) | the hit lands |
| telegraph.js `_telegraphHitPlayer` (lunge, slam, a blue slime's burst) and `_resolveBasicSwingHit` | gated **above** the block branch now, which was a hole: a lunge wound up before you stepped in landed, and a turtle was charged stamina for a sheltered swing |
| monsterstatus.js, storm arcs and burns/poisons | an arc reaches only bystanders who provoked that monster; a DoT keeps ticking only while you fight |
| firetrail.js burning ground | burns on the safe ground only while you fight (it was not gated at all: a goblin's last step over the edge could burn someone in the commons) |

**How a pursuit ends:** ten seconds without dealing damage (the shelter comes
back, the monster drops you and its wander leash walks it home), past
`PURSUE_LEASH` from home, your death, or a zone change. **Who is never
chased:** anyone who did not hurt that monster. A bystander in the commons
beside a provoker takes nothing from it.

**Kill switch** (lower case, TRAPS §117): `wheelpursue: false` in liveflags,
the old rule exactly. Server only. No wire field, no caps flag, and no client
change: the AI and the hits are the worker's, and a client draws what it is
told.

**Not done:**
- The top bar still says "safe" on the safe ground while you are being chased.
  A client follow-up could show a fight state there.
- A monster dragged deep into the commons walks straight through buildings
  and water: the Wheel has no server colliders (props.js has none for
  `wheel`).

Tests: `wheelzone` §5d. A shot from the commons makes the monster:

- come for you, keep you as its target on the safe ground, and land its hit
  there;
- spare a bystander who never hurt it;
- land a slam only while you fight;
- keep on past 720 px and give up past 1,800;
- let you go after ten quiet seconds.

`wheelpursue: false` restores the shelter. §5b's "nobody in the commons is a
target" checks are unchanged.

## Past level 20: the second stage (v2.3.3084)

> The owner: *"build the world past level 20 (levels 21–40 in each land with
> their own monsters and resources) You can just recolor existing monsters for
> now for placeholder monsters. No preference on colors"*.

Every land's **second stage** has monsters now: tiers 5–8, levels 21–40, past
the first pass and its camp at 20, out to the camp at 40.

- **The server needed only the bake.** `SPAWN_RULES.deep.tiers` is `2..8`
  (`tools/world/bake-wheel-spawns.mjs`), and the deeper loop in
  `_wheelSpawnMonsters` was always one pass per baked tier. Each tier gets the
  land's own spawn list again, at its levels, by depth in its band, with ids
  `wm-<home>-t<tier>-<k>`.
- **Counts:** 8 lands × 4 tiers × 6 = 192 more, **384** in all.
  - Every new tier found 9–12 places (the fewest: the Stone Hollows' tier 8,
    9 places).
  - Nothing before tier 5 moved.
- **Placeholders, recoloured.** The game draws them with the land's own look
  in a colour of the stage's and a name to match (`src/data/wheelStageLooks.js`):

  | Land | Look | Stage 2 | Colour |
  |---|---|---|---|
  | Frost Ridge | snowman | Glacier Snowman | icy blue `#8fc8ff` |
  | the Flame Fields | fire goblin | Cinder Goblin | charred `#8c8c9c` |
  | the Wind Dunes | mummy (and its skeleton) | Gilded Mummy / Skeleton | gold `#ffd27a` |
  | the Stone Hollows | rock monster | Amethyst Golem | amethyst `#c8a0ff` |
  | the Electric Foundry | slime | Storm Slime | teal `#60c0ff` |
  | the Water Caves | fishman | Coral Fishman | coral `#ffb070` |
  | the Poison Forest | mire wisp, bog lurker | Spectral Wisp, Shade Lurker | cyan `#70e8ff`, violet `#c090ff` |
  | the Verdant Wilds | blue slime | Jade Slime | jade `#9cffb0` |

  - **A sprite tint, so no memory.** It is the look's own sheets multiplied.
    A tint can only darken a channel, so each colour was chosen on the real art
    (a preview of all eight, on the art, picked them).
  - **It replaces the look's own tint.** A mire wisp is a slime tinted violet;
    its second-stage self is the same slime tinted cyan. Violet times cyan
    would be black.
  - **Why not a baked recolour:** it would sit in memory beside the first
    stage's look. Looks load 2,600 px out, and a stage's edge is nearer than
    that, so at the Flame Fields it would add about 50 MB, past iPhone Safari's
    line (the looks-as-you-walk clause).
  - **Why not a filter:** a filter per sprite is a render target per monster.
  - **Where it is drawn:** every body tint in entityRenderer goes through
    `wheelStageTint` (alive and dying, slime, sheet and snowman, and the hit
    chips' `_btBaseTint`); the hit flash stays red. The plate reads
    `wheelStageName`.
  - **Dungeons too.** A dungeon's monsters carry `home` and their level, so
    the Great Cave's level 26–30 rock monsters are Amethyst Golems as well.
- **The wire.** `zone_state` on the way into the Wheel carries all 384, about
  103 KB once (it was about half that). The ticks after it carry only the
  monsters in reach, as before.
- **The tick.** The monster tick with 384 measured about 0.43 ms here (about
  0.26 ms with 192), on the separation sweep.
- **Kill switch:** `wheelpast20: false` in liveflags leaves a Wheel spawned
  after it with the first stage alone (192, levels 1–20).
- **Signposts.** Brotown's plates read "Lv 1–40" now (`WHEEL_LAND_LEVELS`,
  held to the bake by mirror-audit).

## Not in this round

- Monsters past level 40 (levels 41–80): the same bake and spawn, more
  entries in `SPAWN_RULES.deep.tiers`. The owner's word is still wanted on
  new kinds of monster, rather than more recolours. Before that, the way-in
  `zone_state` should send only the monsters in reach (it would be over
  200 KB).
- Fishing from the Wheel's water (planned: its own round, after this).
- PvP, resource nodes, dungeons in the Wheel.

## Tests

- `server/test/wheelzone.test.mjs` (41): the spawn (48, six a land, built as
  at home, levels 1–2, on the baked places), the rewards (home's shard, home's
  remnants, quest credit), the wire (caps, `zone_state` with home and variant,
  other zones unchanged, the client's eight lands the server's), the kill
  switch, the leash, the safe ground (no target, not even one who shot it from
  there; a monster on it gives up; no hit lands — each against a control a
  step outside, and four of them fail with `_wheelSafeAt` switched off), the
  ranged cap, and what `wheel` is not (a hub, a lawless zone, a node zone).
- `tools/world/test-world-core.mjs` "monsters on the Wheel": the worker's
  copy is the plan's; every place on open ground of its own land's first
  stage, 150 px apart, inside nothing that stands there (the game's own
  footprints); the safe circle holds all of the commons and the town and stops
  at least 100 px short of every place.
- `tools/qa/mp/mp-wheelmonsters.mjs` (13, phone viewport, real worker): the
  way in, all 48 with their homes and skins, at the inner ends, drawn from
  live art at Frost Ridge and the Flame Fields, a kill that pays, the way
  home with the list cleared and the art let go, no page or render errors.
  Since v2.3.3013 its "48" is the first stretch's, of 192.
- **v2.3.3013:** the `wheelzone` suite's §1b (the deeper stretches: 144, per
  land and stretch the home's spawn list, at the stretch's levels by depth,
  both ends of every stretch, the stretches outward in order, every stat what
  the home zone builds at that level, the home's shard, the weapon roll's
  level curve), §4b (`wheeldeep: false`), §3 (192 in the `zone_state`, under
  64 KB) and §9 (the sweep: the push, what it leaves alone, a knot of 12 opened
  as the loop opens it, the tick using it); test-world-core's deeper places
  (on the very tier, `clearTier` inside it, 150 px apart, inside nothing,
  360 px from a camp, the first stretch untouched); and
  `tools/qa/mp/mp-wheeldeep.mjs` (7): 192 on the client, the deeper ones at
  their own levels, the top bar on Frost Ridge's third stretch, its snowmen
  drawn with plates reading their levels on the danger border, a level-13
  snowman killed for its 17 XP (a first-stretch one pays 11).
- **v2.3.3084, the second stage:**
  - the `wheelzone` suite:
    - §1b over all seven stretches (336 and 384, levels to 40, the outward
      chain);
    - every second-stage monster a named stage look as the game resolves it
      (skin, else the home's map, else the archetype), none in the first
      stage;
    - §4c `wheelpast20: false`;
    - §3's `zone_state` under 128 KB;
    - §9's tick with 384.
  - test-world-core's deeper places, driven by the bake's tiers.
  - `mp-wheeldeep` counts 384.
  - `tools/qa/mp/mp-wheelpast20.mjs` (6, phone viewport, real worker):
    - all 192 of the second stage on the client at levels 21–40;
    - out past the first pass, the top bar on Frost Ridge's 21–25;
    - its six snowmen drawn from live art tinted `#8fc8ff`, named "Glacier
      Snowman" with their own levels;
    - a first-stage snowman still white and a "Snowman";
    - no errors.
    - Pictures: `wheelpast20-*.png`.
