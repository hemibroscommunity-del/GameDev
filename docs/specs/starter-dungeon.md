# The starter dungeon: the Goo Grotto (v2.3.3540)

The owner, 2026-10-21: *"I value SIMPLICITY and INTELLIGIBILITY"*. This is the
fourth item of the after-review list agreed with the outside evaluation: a
dungeon near town, with every boss at its dungeon's level.

> **Since v2.3.3570 the Goo Grotto is no longer a starter: it is a dungeon
> built for a party** (the owner: "very difficult without a party of 2-3
> people"). It is level 16 whoever comes in, and its boss is sized for three.
> The world map says "Lv 16 · 2–3 players". Where it stands, its mouth, its
> road and everything else below are unchanged:
> [grotto-party.md](grotto-party.md).

## What it was

- **Three dungeons**, all far out: the Great Cave and the Foundry Dome at
  levels 26–30, the Buried City at 41–45 (docs/specs/wheel-dungeons.md).
  - A new player walked past none of them, and could not have used one.
- **Every boss five levels up.** The boss was its land's strongest kind,
  built five levels above the dungeon (`wheeldungeon.js`, `dungeon.js` for
  the Workshop, and the phone's own copy in `game/dungeonWaves.js`).
  - So a level-5 player's level-5 dungeon ended on a level-10 boss with four
    times the health: a wall where a fight was meant.
- **Five lands had no dungeon.** Their spokes had no landmark, and a Wheel
  dungeon is a landmark (`docs/specs/wheel-dungeons.md`, "Not in this
  step").

## What it is now

### The Goo Grotto

- **Where.** The Verdant Wilds' landmark, in the middle of their first
  stretch (levels 1–5), north of the West Road.
  - That is where the Mayor's first quest sends a new player, for slimes.
  - It is about **36 seconds' walk** from where you arrive in town on the
    live Wheel, and 23 on the short one.
- **How it is placed.** It is a landmark of the plan like the other three
  (`public/tools/world/plan.js`, the `verdant` region's `landmark`: tier 1,
  side 0.6, r 200), so it has what they have:
  - its own clearing, where nothing grows;
  - a footpath off the West Road, leaving it where the Verdant Wilds begin
    (the road's point at the commons' edge). Tier 1 has no road point of its
    own, and a path must leave from one of the road's points: the road
    wanders between them, so a path from the middle of a stretch can miss it;
  - its name on the world map and a dot on the minimap.
- **What is inside.** The Verdant Wilds' own monsters, its blue slimes:
  - three waves, then a boss slime;
  - at your level, never above 5 (the rule every dungeon follows: a level-1
    player meets level 1, a level-40 one level 5);
  - on the Verdant Wilds' mossy stone (`WHEEL_DUNGEON_FLOOR.verdant`,
    `verdant-3`), its mouth lit slime green.
- **What it pays.** The same as any dungeon: each kill's own pay and the
  land's shard, then the clear.

### Every boss at its dungeon's level

- The boss is built at the dungeon's level (`data.js` `DUNGEON_BOSS_UP` 0).
  - It is still the land's strongest kind, with four times the health (more
    with friends inside), half again the damage, and its kind's boss moves.
  - This holds in the Wheel's dungeons, the Workshop's, and the phone's own
    copy for an older worker.

### Nothing is drawn over a dungeon's mouth

- **The problem.** The Grotto stands in a jungle of trees 400 game px tall.
  - A mouth is drawn on the ground, under everything that stands, so a tree
    south of it hid the opening, its name and the ground in front.
  - The first try, a spot found among the trees, could not get round this:
    no spot in the whole first stretch had nothing drawn over it.
- **The rule.** No picture may reach into a box round any dungeon's mouth
  (`placing.js` `MOUTH_CLEAR`):
  - 200 px either side, 260 above (its name), 170 below (where you stand to
    go in);
  - for every object, in both placings;
  - for every resource too: a tree or rock as its tier draws it
    (`bake-wheel-spawns.mjs`, seeded into `nodeDrawn`).
- This holds for all four dungeons.

### The Mayor's "Clear any dungeon"

- **What it was.** Mayor Bro's "Dungeon Delver" (`mayor_3`) asks you to clear
  any dungeon, and its gold road led to the Land Office, where the farm's
  Dungeon Workshop is.
  - **It could never be finished.** Its check reads your list of dungeon
    clears (`lifeSkills.dungeonClears`), and only the old phone-run dungeons
    (`game/dungeonWaves.js`) ever wrote it. Since the worker runs every
    dungeon, no clear was recorded.
- **What it is now.**
  - **The worker records every clear** (`dungeon.js` `_dungeonComplete`): the
    land's key for a Wheel dungeon (`wheel_verdant`), `workshop` for the
    farm's. It is saved and sent back with your life skills, and the quest is
    ready at once.
  - **Its gold road leads to the Goo Grotto**: a new kind of way,
    `dungeon:<land>` (`game/questWays.js`), to a mouth this worker opens. At
    the mouth the road stops. The quest's card says "The nearest is the Goo
    Grotto, off the West Road", and the Mayor says it too.
  - Any dungeon still counts, the farm's Workshop included.

### The world map

- A dungeon's name now says what it is and its levels, as a camp's and a
  pass's do: **"the Goo Grotto / dungeon · Lv 1–5"**.
- The map facts carry the levels (`wheelmap.js`, a landmark with a tier).
- All four dungeons are labelled this way.

## What moved in the re-bake

The plan and the placing changed, so both Wheels' objects, map pictures and
tables were baked again (`bake-wheel-world.mjs`, `bake-wheel-spawns.mjs`).

| | Long Wheel (live) | Short Wheel |
|---|---|---|
| Objects | 63,486 → 63,468 | 12,635 → 12,621 |
| Monster places moved | 3 of 3,840 (the Verdant Wilds) | none |
| Resources moved | 13 of 131 in the Verdant Wilds, 10 of 130 in the Stone Hollows | 5 of 27 in the Verdant Wilds |
| The other three mouths | where they were | where they were |

## Switch and deploy order

- **Kill switch.** `wheeldungeons: false` in the live flags closes every
  mouth, the Grotto's too, as before.
- **The boss's level** has no switch of its own: one number, `DUNGEON_BOSS_UP`.
- **How many mouths the worker opens: `caps.dungeonLands`** (4). It is a
  number, never a switch, the Cookhouse's `cookRows` rule (TRAPS §9).
  - The lands are a list in order on both sides (`WHEEL_DUNGEON.LANDS`, the
    phone's `WHEEL_DUNGEON_HOMES`; mirror-audit holds the order), and the
    Grotto is last.
  - The phone draws a mouth, offers its Enter, names it a dungeon on the
    world map and leads a quest to it only for the first that many
    (`game/wheelDungeons.js` `wheelDungeonOpen`, `wheelDungeonDoorsOpen`).
- **Deploy order.**
  - A new page against an older worker: that worker counts no Grotto (no
    `dungeonLands`: the first three), so the page shows the Grotto's
    clearing and name but no mouth, no Enter and no dungeon label, and the
    Mayor's quest has no road (as it could not be finished there anyway).
  - An older page against a new worker: the old page's world has no Grotto
    to walk to, and its own table names only three mouths.

## Tests

- **`wheeldungeon` suite**:
  - §1: `caps.dungeonLands` is 4, the Grotto last;
  - §6: a clear is recorded (`wheel_hollows`), and the game's own
    "Clear any dungeon" check reads it as done.
- **`wheeldungeon` suite** §10:
  - the Grotto on both Wheels at tier 1, levels 1–5, opened by the worker;
  - on the Verdant Wilds' first stretch, west of town, 36 s and 23 s walks;
  - no monster's place at its mouth;
  - a level-3 run: the Verdant Wilds' six slimes at 3–5, then the boss at 3;
  - levels 1 → 1 and 40 → 5, and refused from too far off.
- **`wheeldungeon` §6 and `dungeon`**: the boss at the dungeon's level; and a
  Workshop clear recorded for each player inside, not for one outside.
- **`quest-route`**: "Clear any dungeon" leads to the Grotto's mouth, stops
  there, and leads nowhere against a worker that does not open it.
- **`mirror-audit`**: the lands in the same order on both sides; the Blue
  Slime's codex page names the Goo Grotto, levels 1–5.
- Broken on purpose, the suites catch it: no clear recorded (`dungeon`,
  `wheeldungeon`), the boss back at five up (`wheeldungeon`, two checks).
- **`test-world-core`**:
  - five landmarks in the map facts, four of them dungeons with their levels;
  - the Grotto and its footpath on both Wheels;
  - every mouth on both Wheels with no object's or resource's picture over
    its box.
- **`mp-googrotto`** (new, an upright phone, real worker):
  - the client finds the Grotto in the Wheel's map;
  - the world map names it "dungeon · Lv 1–5";
  - its mouth is drawn and "Enter the Goo Grotto" comes up;
  - inside: the slimes at your level, their looks, the mossy floor;
  - the waves, the boss at the dungeon's level, the clear, and back out at
    the mouth.
- **`mp-wheeldungeon`** knows four mouths.

## Not done

- **A picture of the mouth.** It is drawn in code, as the other three are.
- **The other four lands** still have no landmark, so no dungeon.
