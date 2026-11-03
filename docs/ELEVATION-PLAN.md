# Elevation on the Wheel: how it could work (v2.3.2999)

> Owner, 2026-10-03: *"I'm also thinking how you might make elevation
> changes"*.

This plan comes from an overnight study of the code and of how other 2D games
do height. The full notes, with sources, are in
`docs/research/ELEVATION-RESEARCH.md`.

**Since v2.3.3994 the first slice is built**, behind `?climb=1`: the Lagoon
Islet off the Water Caves, swum to, its terrace climbed by vines and its ledge
reached by the flip. See "v2.3.3994" at the end, with the next PRs (the
worker's face table, the chest's reward, diving, BroTown on a hill).

## The short answer

Do it the way **A Link to the Past, Stardew Valley and Eastward** do:
**terraces drawn on the flat map**.

- A raised area is ordinary ground.
- Its **south side** is a band of rock or earth, the *face*: you can't walk
  through it, and it's drawn from a face picture.
- Its other edges are a thin rim.
- **Steps** cut through the face let you up and down.
- Nobody has a height number. "Being on top" just means standing on the
  ground above the face.

Why this fits the game:

- **Almost nothing else has to change.** The depth sort (who's drawn in
  front), movement, dashes, gusts, arrows, the server's speed check and the
  messages between phone and server all keep working. They already work in
  screen space, which is where the terraces live.
- **The art pipeline already does the hard part.** The bridges' plank decks
  are drawn by the game itself, board by board (v2.3.2949). A cliff face
  and a flight of steps are drawn the same way.

The other ways, and why not now:

- **One-way ledges** you can hop down, as in Pokémon, are a small add-on
  once terraces exist. They're good for shortcuts back toward town.
- **Real height** (jumping, falling, arrows that know who's higher) touches
  every system and the server's messages. That's a project of its own, only
  worth it if jumping becomes something you do.
- **Shading only:** a cliff's shadow drawn in code would be polish on top of
  terraces.

## What exists today

- **The plan already has 6,981 `cliff` cells:** ridges in stages 2–4 of seven
  lands, plus the ledges at the river's falls. They're dead data. They're
  drawn as plain ground and you can walk straight through them. `plan.js`
  says "cliffs are where climbing will go", but that's an intention only.
- **Each land already has a `cliffPaint` description:**
  - frost: grey granite capped with snow and icicles;
  - ember: black basalt columns;
  - sky: layered red sandstone;
  - and so on.

  These become the prompts for each land's face picture.

## The first step you could see: "Prospector's Knoll", behind `?elev`

The plan already describes a commons landmark north-west of town as *"eight
weathered standing stones on a grassy knoll"*. Raise it for real:

- **Where:** about a minute's walk north-west of the town square, well
  inside the safe ground. No monster goes there, so **the server doesn't
  change**.
- **What you'd see:**
  - The knoll's ground raised by one step, 72 game px, about two-thirds of
    the bro's height.
  - Its south side is a bank of earth and stones under a grass lip.
  - A flight of stone steps up the middle of the bank.
  - Walking into the bank stops your boots at its foot. Walking off the
    other edges stops you at the rim.
  - The footpath comes in at the back, up a gentle slope.
  - Trees at the foot draw in front of it. You draw behind them when you're
    on top.
- **The rest of the world stays exactly as it is.** Like the big-town
  preview, it's a version of the plan you only get with the switch, so the
  monsters' places don't move.
- **Work:** about 3–5 sessions, each step testable on its own:
  1. the height layer in the plan;
  2. the face and steps drawn in the ground;
  3. the walk test;
  4. the Ground Studio cards;
  5. a phone test with pictures.

**Art you'd make, two Ground Studio pictures:**

| picture | size | what it shows |
|---|---|---|
| `face-commons` | 1024 × about 180 px (512 × 90 game px), seamless left to right | the front of a low grassy bank as seen from the game's angle: a grass lip on top, packed earth and set-in stones below, in soft shade; no shadow on the ground in front |
| `steps` | 1024 × 1024, like any swatch | rough grey stone steps seen from the same angle, running left to right; the game cuts them into 12 game px treads |

Optionally, standing stones from the Object Studio, about 130 game px tall.

## After that, your choices

1. **Should the lands climb toward their gates?** The plan's ridges could
   become real escarpments, "up" meaning "toward the keystone gate", with
   steps where the roads cross them. It needs one face picture per land,
   from the `cliffPaint` texts, and it changes how each land is walked:
   faces become choke points. This is a design call.
2. **Monsters on raised ground** need the server to know where the faces
   are. That means a baked table, the same pattern as the monsters' places,
   with a test and an off switch. It must come before any rise goes where
   monsters fight. Until then, rises stay where monsters don't go:
   stages 2–4 today, and the commons.
3. **One-way ledges with a little hop**, for shortcuts home. This is small
   once terraces exist.

## Things found in the code along the way

- **Water stops you at your middle, not your feet** (a bug today). In the
  Wheel the walk test reads the bro's middle, 52 px above his boots:
  - walking south into water, your boots go about 45 px in before you stop;
  - walking north, you stop 52 px short of the shore.

  Terraces need this fixed first, and so does water. *Fixed in the same PR
  (v2.3.2999): your boots stop at the water now, tested by walking into a
  river from the north and a pond from the south (`mp-wheelshore`).*
- **Collision must come from the plan, never from the pictures.** You turned
  picture-traced collision down twice (`tiledMaps.js`, v2.3.1777 and
  v2.3.1794).
- **Cliffs can't be Wheel objects.** Every object can be smashed and comes
  back after 3 minutes (v2.3.2995), so a cliff made of objects could be shot
  open. Cliffs belong in the ground and the walk grid.
- **Flat things can't be objects either.** Objects are drawn by their feet,
  so a staircase sprite would draw over a bro climbing it. Steps belong in
  the ground.
- **The art law still holds:**
  - no shadows baked into a picture;
  - no direction in a ground swatch;
  - no ruler-straight edges.

  So a face's lip is drawn per pixel from a smooth line, while the walk test
  stays per 24 px cell.
- **The word "stairs" is taken** by the old town's exit, so the new ones are
  `steps` in code.
- **CLAUDE.md said the near-camera "foreground" layer is missing.** It
  exists (`pixiApp.js`, since v2.3.2655). Corrected.

## v2.3.3994: the first slice — a lagoon islet you swim to, climb and flip up to (`?climb=1`)

> The owner, 2026-11-02: *"Make a portion of the game that you need to swim
> in (maybe add a dive feature) and also a portion of the game that you need
> to climb (explore animations for this) and double jump to get to the next
> part. Maybe this is part of the 'elevation' addition of the game where you
> add hills and dips."* And from the Oct 26 list (docs/OWNER-LIST-2026-10-26.md):
> #25 diving, #27 elevation ("BroTown on a hill ... steps at its gates"), #28
> "a ledge ... a chest on top opened once per player".

Built the way this plan recommends: terraces drawn on the flat map, nobody
with a height number. Behind `?climb=1` while it is new (phone and computer).

### Where

- **The Lagoon Islet**, off the **Water Caves**' east coast (plan.js `islets`),
  in tier 2 (levels 6-10), on the long Wheel (the live one). Its place is worked
  out by `layout.js planFeatures`: the coast measured on every row it spans,
  and the islet `gap` (4) cells of water out from the outermost one. So you
  reach it only by **swimming the shallows** (the 5-cell shelf every coast has),
  it touches no pass and no other spoke, and the open sea past it is still the
  wall that keeps the spokes apart.
- **East, not west**: the Sweetwater's fresh delta lies between the Poison
  Forest and the Water Caves, on the spoke's west.
- **Not on the short Wheel** (`long: true`): at tiers 2-3 the sea between two
  spokes there is ~600 game px with coasts wandering ~320 either way, and the
  pass at tier 4 is half a zone away. The short Wheel (previews, the
  `wheel5x: false` kill switch) is exactly as it was.
- **Its ground is the spoke's own** (`tidal-1`, pale sand), never the border
  land of a pass, though it lies past the spoke's half-width (ground.js
  materialMap). **Nothing stands on it but its rises**: no scattered feature
  (layout.js pass 2), no object (placing.js `islBoxes`), and no monster, vein,
  tree or fishing spot (bake-wheel-spawns.mjs treats it and `keepOut` cells
  round it as a hazard).
- **The islet's sand is in the baked plan, for everyone** (the map lane draws
  it from the plan). Only its rises come with `?climb=1`.

### What is on it (plan.js `rises`, cells from the islet's corner)

| rise | box | face | on it |
|---|---|---|---|
| the Lagoon Terrace | 12 x 20 cells | 3 rows, **72 px**, no steps | a strip of vines 2 cells (48 px) wide down the middle of its face |
| the Lagoon Ledge | 8 x 11 cells, on the terrace's top | 6 rows, **144 px** | the chest, against its back rim |

A rise is ground with a **face** (its last `face` rows), a one-cell **rim** on
its other three edges, and its **top**. A rise inside another stands on its
top. `public/tools/world/core/rises.js`:

- `riseLayout(plan)`: every rise in cells, and one grid of cell kinds (top,
  face, rim, climb, chest; the rise's index above them);
- `riseMessage(plan)`: what the ground worker sends the game with its `ready`
  when the address says `climb=1` (game px, ~400 bytes of cells);
- `risePaint(...)`: the faces, rims, vines and chest painted into each laid
  piece of ground, in code, from the Water Caves' `cliffPaint` ("a dark mossy
  sea cliff with glowing teal caves at its foot"): dark mossy rock in strata
  with cracks, a mossy lip whose line wanders (and rubble at the foot, so
  neither is a ruler line), teal-glowing cave mouths at the foot of the tall
  face, vines with leaves down the climb strip, a small iron-bound sea chest.
  29 colours in all (`RISE_PALETTE`), so a piece stays far under 256 and is
  still sent as colour numbers. Nothing loaded, nothing new held.

The walk grid (`wheelTrial.js lazyGrid`) shuts every face, rim, vine and chest
cell over the islet's sand. Collision comes from the plan, never the picture.

### How you get up (src/game/climb.js, the rules; climbActions.js, the game)

- **Climbing.** At the vines' foot, push north (or at their top, push south):
  you climb, at **0.4 of your walk** (a sprint does not hurry it), **straight
  up and down only**, put on the strip's middle (you get on from up to
  `CLIMB_REACH`, 16 px, away: a walk stops your feet short of a wall by up to
  a step). No swing, special, ability, roll, shield or harvest:
  each says "Climbing!" (combatHelpers `swimRefused` asks `climbRefused`). No
  jump. Out at the top you are on the terrace; step off the bottom and you are
  off. The body is the **jog's own back-facing frames** (`CLIMB_FRAMES`, eight
  of the north sheet's 23), one every `CLIMB_PX` (5) px climbed: its own
  cadence, by the distance, not the jog's clock (which follows the ground's
  speed). Nothing new is loaded: the jog sheets are on the loading screen
  already (PRELOADING IS LAW holds by construction). A drawn climb sheet is a
  later PR.
- **Jumping up a face** (the props' crossing, extended to faces). A jump going
  north (within ~63 degrees of straight up the screen) may enter a face's band
  once it is high enough (`JUMP_CLEAR` of the peak, ~31 px, the low props'
  own threshold); the face is then open for the rest of that jump **and its
  flip**. It is judged where you come down (`faceLanding`):
  - your feet clear of the band, on the top, and the face no taller than a
    plain jump's peak (85 px) **or** the jump a flip: you are up;
  - short of the top, or a 144 px face without a flip: **you drop back where
    you jumped from** (a quick fall to the take-off point, `startDrop`).

  The numbers (base walk 0.15 px/ms, sprint 1.33x; feet box 20 px):

  | | band + feet | ground covered once high enough |
  |---|---|---|
  | the 72 px terrace, walking jump | 92 px | 84: short |
  | the 72 px terrace, sprinting jump | 92 px | 112: up |
  | the 144 px ledge, any plain jump | 164 px | refused: needs the flip |
  | the 144 px ledge, flip at the sweet spot, walking | 164 px | ~175: up (just) |
  | the 144 px ledge, flip at the sweet spot, sprinting | 164 px | ~273: up |
  | the 144 px ledge, early flip | 164 px | ~94 walking, ~148 sprinting: back |

  Agility and speed food widen the walk, so a nimble character may walk-jump
  the terrace; nothing but the flip ever takes the ledge.
- **Down.** A jump going south off a top drops you to the face's foot (a
  Pokemon ledge). Walking into a face from above stops you, so nobody falls
  off by accident. Or climb down the vines.
- **Safety.** Feet found inside a face with no climb, jump or drop to explain
  it (a login there, a teleport) are put at its foot. A rim or the chest never
  traps someone already standing in it.
- **The chest.** On the ledge's top. Walking into it, E, or a tap on the right
  stick (which shows the door picture there) opens it: "Empty for now: the
  reward comes next", with the discovery chime. The real reward needs the
  worker's check (next PR, below).
- **Other players** see you move up the face (your moves stream as ever),
  drawn climbing by the same test at your feet that draws a swimmer
  (`climbActions.riseClimbingAt`); nothing new goes over the wire.
- **Off the Wheel** (a door, a dungeon) nothing of a climb comes along.

### Smaller choices made while building it

- The rises are laid by the ground worker (`riseLayout`) and sent ONCE with
  its `ready` as one small grid of kinds for the islet (~400 bytes), not as a
  byte a cell with every block: the walk grid stamps them over the block's
  bits as it makes each row.
- The crossing is judged where you come down, not predicted on the way up:
  the flip comes mid-crossing, and a jump cannot know it will come.
- The take-off point is kept on the jump itself (`startJump` `x0`, `y0`,
  carried by `startFlip`), so "back where you jumped from" is exact.
- A drop back or down is a short fall (`startDrop`, 0.6 px a ms, at least
  180 ms) with the landing's thump, the walk standing still; never a jump cut.
- The chest uses sounds already in the game (the discovery chime; a refusal's
  "denied"; the landing's thump): no new sound, no Sound Studio label.
- The islet's place is measured off the coast each time the plan is built, so
  a coast that changes keeps its channel `gap` cells wide.

### Decisions made for this PR (the owner's open questions)

- Swimming to an island: fine as a **shallows-only dead end on one spoke**.
- Diving: **marked pools only**, a later PR (below).
- Drowning: an **ordinary death**, later.
- The climb: **made in code now** (the jog's frames), a drawn sheet later.
- Climbing is **up and down only**.
- **No monsters** in the challenge area in v1.
- The chest is **once per character** (next PR).
- **BroTown on a hill comes after** this challenge.

### The next PRs

**(a) The worker learns the faces.** Today the walls are the phone's, like the
water: a modified client could walk up a face. Next:

- a baked face table, `server/src/wheelfaces.js`, written by
  `tools/world/bake-wheel-spawns.mjs` from `rises.js riseLayout` (the boxes and
  heights in game px, a few hundred bytes), held to the plan by
  test-world-core's `--check` like the monsters' places;
- a movement clip in `movement.js`: a move whose feet enter a face band from
  the south is refused unless it is part of a jump the worker was told of
  (`player_jump` is relayed today; the worker would stamp a validated airborne
  window from it) or a climb inside a strip at <= 0.4 of the walk bound plus
  slack; a refused move rubber-bands as a too-fast one does;
- a lower-case kill switch **`wheelfaces`** in `liveops.js` (off: the clip is
  skipped), a cap **`wheelterrain`** in `state_sync.caps` and `CAP_GATES` (the
  client turns `?climb=1`'s faces on for everyone only against a worker with
  it), and a new suite `server/test/wheel-faces.test.mjs` (the table matches
  the plan; a walk into a face is clipped; a climb and a jump that clears it
  are not; the switch off lets everything through).

**(b) The chest's real reward.** Once per character, kept on the player
record (a new field with its shape number bumped, `docs/specs/migrations.md`),
checked against the chest's baked box (the face table's), paid in ONE
synchronous run of writes with its stamp (handoff rules 5 and 7), its reward
a row in the hidden settings (`hidden.js HIDDEN_SPEC`) with a public
placeholder; a new message `rise_chest` in `PRIVILEGED_EVENTS` and the
client's direct switch; a kill switch and a cap.

**(c) Diving** (owner list #25: "about 10 s of air, then 10% of your health a
second"):

- in **marked pools only** (plan.js: a `dive` flag on a pond or lagoon, drawn
  darker, its cells sent like the rises);
- a **Dive** button where Jump sits (Jump is hidden in water already); an
  **air meter**; an **underwater tint** drawn in code (a Graphics over the
  water layer: no Sprite mask, no mid-frame filter, TRAPS §221);
- **10 s of air, then 10% of your health a second**, the worker owning the
  damage through `hits.js`'s one door (a `MONSTER_HITS`-style row for
  drowning) and the death an ordinary one;
- a `dv` field on **both** tick builders (`tick-share.test`), a cap
  **`wheeldive`**, a kill switch;
- **never untargetable while diving**, or diving becomes a dodge.

**(d) BroTown on a hill** (owner list #27): BroTown's ground one rise up, a
face on its south side and `steps` (the word "stairs" is the old town's) at
its gates; then the commons' knoll ("Prospector's Knoll", above). Needs (a)
first if any rise goes where monsters fight.

### Tests (this PR)

- `test-world-core`: "the lagoon islet" (where it is; reached only through
  the shallows from its own spoke; no other spoke, pass or land within reach;
  nothing placed on it; its rises' cells; the face picture's colours) and
  "climbing" (every rule above, the table's numbers worked out from the
  jump's own rules); the bakes `--check` for both Wheels.
- `mp-lagoonclimb` (new): swim out, climb the vines, flip up to the ledge,
  open the chest; a plain jump can't reach it; the open sea still stops you.
- `mp-wheelswim` (extended): the islet's shallows are swum, the sea past them
  stops you.
- A ghost-audit sample of the climb (each facing it has: north), and
  `mp-membudget`.
