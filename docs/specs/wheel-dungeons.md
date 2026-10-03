# Dungeons in the Wheel (v2.3.3016)

> Offered: *"Dungeons in the Wheel. This is the other big missing piece, and a
> larger job."* The owner, 2026-10-03: *"Yes continue working on those items"*.

The World Bible's plan for dungeons in the one-map world (docs/WORLD-BIBLE.md
§8): *"On the tapestry, dungeon entrances become places: the Great Cave's
mouth, the sealed gate in the volcano, the Buried City, the sea caves. Walking
in is the loading screen into an instance."* The instances already existed
(v2.3.1127, `server/src/dungeon.js`): a private copy of a dungeon, with its own
monsters, for whoever walks in. Until now the only way into one was the Dungeon
Workshop on the farm, and with the Wheel as the world the farm is behind a
building door the Wheel's town does not have yet.

This is the first step: **three dungeons, behind three of the Wheel's
landmarks.**

## What the player sees

- **Three mouths.** Each land with a landmark placed on its spoke has a
  dungeon behind it:

  | Mouth | Land | Its levels |
  |---|---|---|
  | **the Great Cave** | the Stone Hollows | 26–30 |
  | **the Foundry Dome** | the Electric Foundry | 26–30 |
  | **the Buried City** | the Wind Dunes | 41–45 |

  The world map and the minimap already named these places. Now each is drawn
  on the ground: a dark opening with its rim lit in its land's light (crystal
  blue, electric violet, sun-baked orange), breathing, with sparks rising out
  of it and its name above. It is drawn in code until there is a picture of
  each (below, "Pictures").
- **Walk up to one** and **"⚔️ Enter the Great Cave"** comes up, where the
  Workshop's button does (or press **E** on a keyboard). It comes up within
  200 px of the mouth and nowhere else.
- **A tap goes in.** The loading screen shows the place's name while the
  land's monsters' pictures and the arena's floor load. Then you are in its
  arena, a walled hall floored with the land's own ground (the Great Cave's
  dark cave stone, the Foundry Dome's iron floor plates, the Buried City's red
  sandstone), drawn at the Wheel's own character size:
  - **its land's own monsters**: rock monsters and thorn shamblers in the
    Great Cave, the Electric Foundry's slimes in the Foundry Dome, mummies in
    the Buried City; each with its own picture, its element's hit (a rock
    monster's daze, a storm slime's arc) and its land's shard when it dies;
  - **three waves** of the land's whole spawn list, then **a boss**: the land's
    strongest kind, five levels up, four times the health (more with friends
    inside), half again the damage, with its kind's boss moves;
  - **the level**: the place's top (30 for the Cave and the Dome, 45 for the
    City), **but never above your own**. A level-8 player meets a level-8
    Great Cave; a level-40 player meets its level 30. This is the rule every
    dungeon has followed since v2.3.1127. It means anyone can try one now,
    while the Wheel's own monsters stop at level 20.
- **Clear it** and you are paid as any dungeon pays (with the boss: 30 gold a
  wave plus twice the level, and 80 XP a wave plus five times the level), on
  top of what each kill paid. Three seconds later you are **back outside the
  mouth**, in the Wheel.
- **Walk out of its door** (the glowing way out at the bottom of the hall)
  to leave early: back outside the mouth, no reward.
- **Die in it** and you come back in Brotown, as from any death.
- **A party leader** who goes in brings in the members standing beside the
  mouth (within 600 px). A member elsewhere in the Wheel is not pulled in.

## How it works

**The mouths are baked from the plan** with the monsters' places
(`tools/world/bake-wheel-spawns.mjs` → `server/src/wheelspawns.js`,
`WHEEL_DOORS`). Each land's landmark is laid by the plan (layout.js pass 8) at
the middle of its `tier`. The bake records where it stands, that tier's levels,
and the way back out: the first of a few steps round the mouth, south first,
that is open ground by the game's own walk grid and clear of every placed
object. The commons' Prospector's Circle is placed by `at`, not a tier, and is
no dungeon.

**The client finds the mouths** in the Wheel's own map, which the ground worker
already builds from the same plan and which names every landmark
(`wheelTrial.wheelMapInfo`). So there is no second copy of the plan. The only
client table is which lands' landmarks are dungeons
(`src/data/wheelDungeons.js` `WHEEL_DUNGEON_HOMES`, mirrored against the
server's by mirror-audit).

**A start** is `dungeon_start` with `{ entrance: 'hollows' }`, the mouth's
land and nothing else. `dungeon.js _handleDungeonStart` runs its own checks
first (the dungeons' kill switch, alive, one run each, at most 8 instances).
Then `server/src/wheeldungeon.js _wheelDungeonConfig` checks:

- the Wheel's switch (`wheeldungeons: false` in liveflags: "This way is closed
  for now");
- that the mouth is one it knows (own-property, so `'__proto__'` is no mouth);
- that the player stands in the Wheel within 260 px of it;

and builds the config itself: 3 waves, boss multiplier 4, a 36 × 52 arena, the
land's element, the level as above. A wave stands across the arena's upper
half, from row 5 down (`TOP_ROW`): the rows above are under the top bar, where
a player's middle never goes (BroTown.jsx `_HEAD_MARGIN`). Nothing the client sends but the mouth's
name reaches it; a `config` sent alongside is never read. The instance
remembers `back`, `{ z: 'wheel', x, y }`, and sends it on `dungeon_started`.

**Its monsters** are built by `_makeZoneMonster`, the one copy of the monster
math, exactly as the land builds them at that level, with `home` set to the
land. So:

- the client draws them from the land's own pictures;
- a kill pays the land's shard and counts for its quests
  (`wheelzone.js _rewardZone`);
- they stay dead once killed (`noRespawn`).

The boss is the land's last spawn kind, built the same way five levels up, then
scaled and armed by `_dungeonSpawnBoss` as any dungeon boss is. Both of the
dungeon's monster lists on the wire (the zone change's snapshot and the wave
re-push) now carry `home` and `variant` for these, as the Wheel's own snapshot
does; a Workshop run's wire is unchanged.

**The client's way in** (`gameEvents.js dungeon_started`). When the config
names a land and `back` came with it, the dungeon's loading screen goes up and
every look the land's monsters wear loads first (`wheelMonsterArt.js
loadLandLooks`), as the preloading law asks of any zone but the Wheel itself.
Then the arena is built as for any dungeon. Its synthetic zone has the land as
its `homes`, so the Wheel's art rules keep the looks there (a monster whose look
is not ready is not drawn). The Wheel's own looks that the arena does not use
are let go (`releaseLeftZoneArt`). The worker holds the first wave until
someone stands in it.

**The way back out** (`game/wheelDungeons.js leaveWheelDungeon`), on the clear
or at the door, goes through today's town and down its stairs. That is the
trip a death takes (`wheelHome.js`): the stairs are the Wheel's one way in,
with its loading screen. The Wheel's arrival is set to the mouth for that one
trip (`worldTrial.setWheelArrival`). The way in warms the ground and objects
round it, and the arrival places you there (`zoneTransitions.js
takeWheelArrival`). An arrival nobody takes within a minute is forgotten. The
dungeon's synthetic zone is dropped a beat after its looks are released
(`dropDungeonZone`), and a death in a dungeon does the same (respawn.js).

## Deploy order and the switch

- `caps.wheeldungeons` gates the client: no mouth is drawn, no button shows,
  nothing is sent against a worker that does not advertise it. An older worker
  would read `entrance` as an empty Workshop config and open level-1 fodder.
- `back` and `cfg.home` are new fields on `dungeon_started`. A client that
  never asks never gets them.
- **Kill switch:** `wheeldungeons: false` in liveflags un-advertises the cap
  and closes every mouth. A run already open finishes.

## The arena

The Workshop's arena (the farm's Dungeon Workshop, v2.3.1127) was not fit for
this, three ways, all found by `mp-wheeldungeon`'s first run on a phone:

- **It was 28 × 22 tiles**, smaller than an upright phone's view. A zone
  smaller than the screen is zoomed in until it fills it (worldViewport.js,
  the zone's "no-void" floor), so the bro was drawn two and a half times his
  size. A Wheel dungeon's arena is **36 × 52** (`WHEEL_DUNGEON.WIDTH/HEIGHT`
  on the worker, `WHEEL_ARENA` on the client, mirror-audited): on an upright
  phone that is at least the Wheel's own view, so the camera keeps the Wheel's
  character size. (Held sideways, every zone smaller than the screen's width
  zooms in, the nine old combat zones included; that is by design,
  v2.3.2497.)
- **Its door was in the bottom wall**, a row the player's middle never
  reaches: the clamp holds it 80 px from a map's bottom edge (BroTown.jsx
  `_FOOT_MARGIN`), so the Workshop's door could not be walked out of. A Wheel
  dungeon's bottom wall is three rows thick and its way out is two tiles in
  the last row of floor (`wheelArenaMap`, game/wheelDungeons.js); you arrive
  seven rows above it, and for 2.5 s after you arrive the door ignores you,
  as a hub's trail-head does (`HUB_EXIT_DEAF_MS`), so a stick still held
  from before the loading screen cannot walk you straight back out.
- **Its floor never drew.** The arena's zone has no colour palette, and the
  tile renderer's `zone.palette.ground` threw on every rebuild of one. Fixed
  for the Workshop's too (tileRenderer.js `getTileHexColor`).

A Wheel dungeon's floor is one of its land's own ground pictures, the one that
reads as the place (`WHEEL_DUNGEON_FLOOR`): the Stone Hollows' "deep roots"
(`hollows-4`), the Electric Foundry's "foundry works" iron plates
(`thunder-2`), the Wind Dunes' "red mesas" sandstone (`sky-3`). It is tiled
across the hall at the Wheel's own size (tileRenderer.js `_rebuildFloorPic`),
mipmapped so it does not sparkle on a phone, and the walls are drawn over it in
code: the floor's darkest shade, a lit lip where floor meets wall, and the
wall's shadow on the floor. It loads behind the loading screen with the
monsters' looks (`loadDungeonFloor`, at the Wheel's own `?v=` address so the
picture cache never serves an old one) and is let go a beat after you leave
(`dropDungeonZone`).

The old Deep Hollows' torch and echo buttons came up in the Great Cave (its
arena carries the land's element, stone) over the controls, for a darkness the
arena does not have. A zone of other zones' monsters (the Wheel and its
dungeons) shows none of the old zones' own tools.

## A bug the way in found

Leaving the Wheel for the Great Cave freed every Wheel look the arena does not
use. Two looks share one picture module (the Verdant Wilds' thorn shambler is
the rock monster recoloured; the Poison Forest's bog lurker is the fishman's), and
freeing the thorn shambler tore out the rock monster's pictures from under
the arena's rock monsters: none was drawn, and the renderer threw on their
destroyed textures every frame. No zone change had ever kept SOME of the zone
it left before. `unloadVariantSprites` now keeps any module a kept look draws
from (`freeZoneAssets` passes the destination's looks).

## Pictures

There is no picture of any mouth yet: the landmark's ground is the land's own,
so the Great Cave was a name on the map over plain rock. Until the Object
Studio has one, `src/rendering/wheelDoors.js` draws each mouth in code (the
way the buildings' life is drawn). The arena's floor is the land's own ground
picture (above); its walls are drawn in code.

## Tests

- **`server/test/wheeldungeon.test.mjs`** (new suite, 36 checks):
  - the switch, the cap and the closed mouths;
  - the three mouths baked, with their names, their levels (26–30, 26–30,
    41–45) and a way out 100–260 px from each;
  - who may start: an unknown mouth, `'__proto__'`, 300 px away, another zone:
    refused; a `config` sent with the mouth is never read;
  - the level (8 → 8, 45 → 30 at the Cave, 50 → 45 at the City, 1 → 1);
  - `dungeon_started` with `back` and the config's `home`; wave 1 the land's
    whole spawn list, each built by the land's own math, its own look, staying
    dead; one run each;
  - the wire: the re-push and the zone snapshot carry `home` and `variant`;
  - the run: waves 2 and 3, the boss (the land's last kind, five levels up,
    scaled and armed), a kill counting for the land, and the clear's pay;
  - the party: a member beside the mouth comes in with the same way out, one
    3,000 px away does not;
  - the Workshop's dungeons unchanged;
  - the QA dev op `clearwave`.
- **`mirror-audit`**: the same lands on both sides, the button's reach under
  the worker's, a light for every mouth, a floor for every mouth that is one
  of its land's ground pictures and is in the game, and the arena's size the
  same on both sides.
- **`mp-wheeldungeon`** (new, an upright phone, real worker), 7 checks:
  - the client finds the three mouths in the Wheel's own map, where the worker
    baked them;
  - walked to the Great Cave (as a god: it crosses levels 6-20), its mouth is
    drawn and "Enter the Great Cave" comes up at it, and not 300 px off;
  - a tap opens it: the arena, the Stone Hollows' own monsters at the
    player's level, all six drawn in their own looks, the way out remembered;
  - the arena floored with `hollows-4`, at the Wheel's own scale (0.504 and
    0.504), with no old zone tools over the controls;
  - three waves and the boss (each ended by the QA dev op `clearwave`), the
    clear pays (96 gold at level 3), and you are back outside the mouth, 0 px
    from its way out;
  - in again, and out by walking onto its door: back at the mouth, 0 px off;
  - no page errors (and none thrown in the render loop).
  - Pictures: `wheeldungeon-{mouth,arena,back}.png`.
- Its first runs found what "The arena" and "A bug the way in found" above
  describe: the rock monsters undrawn, a floor that never drew, the bro
  zoomed to 2.5x, a door no one could step on.

## Not in this step (could come next)

- **The volcano's sealed gate and the sea caves.** The Bible names them too,
  but they are their spokes' keystone gates, the way to the Dark and Light
  realms (levels 80–100). They wait on those realms.
- **The other five lands** have no landmark on their spokes yet. A dungeon for
  each is a landmark added to the plan, then one word in `WHEEL_DUNGEON.LANDS`.
- **Pictures** of each mouth, and things standing in the arena (rocks,
  crystals, pillars). The worker's monsters know nothing of the floor, so
  anything that blocks a player would have to block them too.
- **A dungeon's own rewards** (a chest, a rare drop). Today it pays what a
  Workshop dungeon pays.
- **Coming out at the mouth directly**, without the trip through today's town.
