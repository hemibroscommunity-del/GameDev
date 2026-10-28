# The arena's own area: the plan (v2.3.3713)

> The owner, 2026-10-28: *"Also interested in bringing the arena to Brotown
> (the wheel map only). Let me know how to start that."* And then: *"There
> won't be enough room for the arena with several dozens of players all in
> town so it needs its own special area that can scale."*

**Status: a PLAN, waiting on the owner.** Nothing in this file is built. The
first step, below, is: the arena the worker already runs (docs/specs/arena.md)
now plays end to end in the world, on phones, and its test proves it
(`tools/qa/mp/mp-arena.mjs`, v2.3.3713). The area is the second step, and it
waits on the owner reading this.

## Step 1 (done in v2.3.3713): the arena works in the world as it is

What a player does today, in the world's BroTown:

1. Walks to the **Sheriff's Office**, taps **Enter Sheriff's Office**, then
   **The arena**. The arena's window says **Enter Arena · 100G**.
2. Pays 100 gold. The window says **In Queue**, their place, and when the
   bracket starts (a minute after the first entry, with 2 to 8 players).
3. When the bracket starts, each fighter's phone hears **ARENA R1: fight
   ...!** and is put in a duel with their opponent (locked on to them). They
   fight **wherever they stand**, through the game's normal fight: swings,
   the worker's damage, no healing until the match ends, 3 minutes on the
   clock (then the one with more health left wins).
4. Anyone not fighting (someone who never entered, or a fighter already
   knocked out) can **back a fighter** in the window's Spectator Betting. The
   stakes are a pool: backers of the winner get their stake back and a share
   of the losing stakes, less the winning fighter's 10%.
5. The final crowns the **champion**: 250 gold a gladiator (1,000 for a
   bracket of four) and, the first time, the Gladiator achievement's 500
   points.

What was broken and is fixed in v2.3.3713 (each with a test):

- **A match in BroTown could never end by a fight.** The worker started each
  match as a duel, but the phone was never told it was in one, and BroTown is
  safe ground, so the phone sent no attack at a player at all. Every match
  ran out its 3 minutes and was decided by the health tiebreak. Now the
  match's start puts the phone in the duel, locked onto the opponent
  (`src/networking/gameEvents.js`, `arena_match_start`).
- **The end of a match said two things at once** ("DUEL WON!" over "Arena
  win!"). Now the arena's own words alone.
- **A fighter who walked away and came back could not land a blow** (the
  lock aimed at where the opponent had been). The lock now follows the
  opponent, and an arena match locks on as soon as the opponent is in view.
- **A finalist's phone left the final as it began**: the semifinal's end
  message arrived after the final's start and cleared it. Now an arena
  match is ended only by its own end.
- **A phone whose connection dropped as its match began never knew it was
  in one** (an iPhone tab put away does this too). The server now tells it
  again when it reconnects.
- **The window forgot you had paid.** Three seconds after joining it showed
  "Enter Arena · 100G" again, for the whole minute the queue gathered, and
  the fight card and the "Eliminated" box were never drawn: the worker's
  `/status` never said where the asking player stood. Now it does
  (`server/src/gladiator.js` `_arenaStatusFor`; `server/test/arena.test.mjs`
  §16).

The test (`BT_NO_TRACE=1 node tools/qa/mp/run.mjs arena`) plays it all on
five phones in about eight minutes: 28 checks.

The limit of step 1 is the owner's point: **the fight happens in the town
square**, among everyone else, with no ring, no stands and nowhere for a
crowd to watch from.

## Step 2: the arena's own area

### What the player sees

- **The way in is the Sheriff's Office.** Its arena window gets a second
  button, **Go to the arena** (the window's "Enter Arena · 100G" stays the
  sign-up). Later, if the owner wants, a door of its own on the Sheriff's
  Office's side wall does the same thing; a window button is the cheap first
  version and needs no change to the world's plan or its bakes.
- **A loading screen** ("The Arena") while its pictures load, exactly as a
  dungeon's (`preloadZoneAssets`, freed on the way out: the memory law).
- **Inside: an oval of sand with a roped ring in the middle**, and room all
  round it for a crowd: wooden stands on three sides, standing room on the
  fourth by the way in. Banners in the elements' colours, torches, a board by
  the way in showing the bracket.
- **Spectators walk anywhere except the ring.** The ring's rope stops them
  (a footprint, as a dungeon's walls are). They can chat, emote, and place
  bets from the board (the same Spectator Betting).
- **When your match starts, you are moved into the ring**, to your corner,
  facing your opponent, with a short "Round 1: Gladius vs Murmillo" banner.
  **When it ends you are moved out**, back to the stands (the loser where
  they would respawn, beside the way in, with their health back).
- **Fighters not in the arena are fetched.** A fighter in town (or anywhere
  in BroTown's commons) when their match starts gets **"Your match is
  starting: go to the arena"** with a button; tapping it takes them into the
  ring. If they do not come before the match's clock runs out, the tiebreak
  decides as today. (Pulling a player out of the wild in the middle of a
  fight with no warning is a bad surprise, so it is a tap, not a teleport.)
- **The way out** is the gate at the bottom, as a dungeon's, back to the
  Sheriff's Office's steps.

### How it is built

It is built **the way the world's dungeons are**, because they already solve
"a place of its own, entered from the world, loaded behind its own screen":

| Part | The dungeons today | The arena area |
|---|---|---|
| The zone | `dungeon:<id>`, a zone the ZONES table does not know (dungeon.js "FOLDED INSTANCES"): the server ticks it, sends it on its own, and PvP fails closed there | `arena:<n>`, the same trick. No monsters. PvP still fails closed, and an arena match's duel opens it for the two fighters only (the consent pair is checked first in `_pvpAllowed`, whatever the zone: nothing to change there) |
| Going in | `dungeon_start` at a mouth, the worker's checks, `dungeon_started` with `back` (the way out) | `arena_enter` from the window, checked on the worker (in BroTown's commons, alive, not in a duel or a dungeon), `arena_entered` with `back` (the Sheriff's Office's steps) and the instance |
| Its map | `src/data/wheelDungeons.js` WHEEL_ARENA (36 x 52 tiles, mirrored on the worker), `src/rendering/arenaWorld.js`, `arenaWalls.js`, `src/data/dungeonArena.js` (things and footprints) | the same files grow an arena map: a bigger floor (below), the ring's rope as footprints, the stands as footprints with gaps for steps |
| Its art | the land's ground, walls and things, behind the dungeon's own loading screen, freed on exit | drawn in code first (below), its pictures later, the same way |
| Coming out | the gate in the bottom wall | the same |

New on the worker (`server/src/gladiator.js` and a small new
`server/src/arenaarea.js`):

- `arena_enter` / `arena_leave` (handled on purpose: deny by default), a cap
  `arenaarea` and a lower-case kill switch `arenaarea` (off: the button is
  not shown and nothing moves; the tournament plays in town as in step 1).
- **The instances**: a list of `arena:<n>` zones, each with its count of
  players, filled lowest number first up to a per-instance cap (below).
- **Moving the fighters**: at `_arenaTryActivate` (a match starts), if both
  fighters stand in an arena instance, the worker places them at the ring's
  two corners (a server-placed move, the way a dungeon's arrival is) and
  says so (`arena_ring {matchId, corner}`); at `_arenaOnMatchResolved`, both
  are placed back outside the rope. The ring's rectangle is held on the
  worker too: a spectator's move into it is refused (a rectangle test, cheap).
- **Fetching a fighter who is not there**: `arena_match_start` carries
  `area: true`, and the phone shows the "go to the arena" button, which sends
  `arena_enter` with the match's id: that one lands in the ring.
- Every new message the worker sends goes in `PRIVILEGED_EVENTS` and the
  phone's direct switch; the instance list is a new storage key only if it
  needs to outlive a restart (it does not: like dungeons, an arena instance
  is in memory, and a deploy just sends everyone back to the Sheriff's
  Office's steps).

### Its size on the ground

The dungeons' arena is 36 x 52 tiles (1,152 x 1,664 game px), sized so an
upright phone draws it at the world's own character size. The arena area
wants room for a crowd round a ring:

- **The floor**: 48 x 64 tiles (1,536 x 2,048 game px), the same shape
  as a dungeon's turned a little wider, so an upright phone sees about a
  third of it and a sideways phone (and a computer) about half.
- **The ring**: 12 x 12 tiles (384 x 384 game px) in the middle: room for
  two fighters with swords and a bow's reach to circle, small enough that a
  spectator at the rope sees both fighters on one screen.
- **Round it**: three to six tiles of sand, then the stands: three rows of
  benches on the left, right and top, about 40 places to stand or sit, and
  the open ground by the gate for as many again. **About 60 to 80 people fit
  without standing on each other**, which is the per-instance cap's number
  (below).

### How it scales, and the 120-player cap

**The whole game is one room today**: one Durable Object, `brotown-1`, holds
every player, and its cap is **120 players** (`server/src/index.js`
MAX_PLAYERS, the owner's call, v2.3.3205). The arena area does not get round
that cap: every player in it is one of the 120. What it does do is keep the
crowd out of the town, and keep the town's ticks small: the worker sends each
zone its own state, so 60 people in `arena:1` cost the town nothing and the
town's people cost the arena nothing.

- **One instance holds up to 60 people** (a number to tune with
  `tools/qa/load/load.mjs` once built: the bigger the crowd, the more each
  phone has to draw).
- **When one fills, the next opens** (`arena:2`), and so on. A fighter whose
  match starts always goes to the instance with the ring their match is in.
- **One tournament, one ring, one instance**, at first: the bracket's matches
  are fought one after another or side by side in the main instance's ring
  (two rings side by side if the first round has four matches; to be decided
  when built). The overflow instances show the board and the live result (the
  `arena_stake_board` broadcast already sends what is happening) but not the
  fight itself. Sending one zone's fight to another is not something the
  worker does today.
- **With 120 players in the room, the arena's second instance is the most it
  will ever need.** Past 120 the game needs more rooms: that is
  `docs/SERVER-SPLIT-PLAN.md`, and an arena is a natural first thing to move
  to a room of its own (it needs only the players' gear and gold, which the
  split plan already moves). Not part of this plan.

### Its look, drawn in code first

As the dungeons were before their pictures, the arena is drawn by the game
itself until the owner makes its pictures:

- **The floor**: warm packed sand, the Wind Dunes' sand ground (it already
  exists in the world's ground set) with a darker, raked ring of it inside the
  rope.
- **The rope ring**: four thick wooden posts with brass caps at the corners,
  a red rope between them, drawn as a footprint (it stops your boots).
- **The stands**: stepped wooden benches, drawn as boxes in three shades of
  the wood colour, with gaps for the steps.
- **Banners**: one in each element's colour along the top stand.
- **Torches**: either side of the gate and at the corners of the stands
  (the game's own light effect at night).
- **The board**: a wooden sign by the gate; tapping it opens the arena
  window (the bracket and the betting).

All of it is a handful of Graphics drawn once when the zone is entered and
destroyed when it is left (the memory law: anything made per zone is
destroyed when it goes). It costs a few hundred kilobytes, not megabytes.

### Its picture: the ChatGPT prompt

Following docs/WORLD-BIBLE.md §6 and `public/tools/style/bible.js`: attach
**only the style key** (never the bro), say sizes in words, and let the
pipeline (`public/tools/style/process.js`) snap the result to the grid and
the palette. Two pictures, each its own chat, the way the dungeons' are
(docs/art/DUNGEON-ART-PROMPTS.md).

**1. The arena's floor and ring** (attach: your style key):

> A square picture for BroTown, a top-down 2D action RPG: the floor of the
> town's gladiator arena, seen from a steep three-quarter top-down angle,
> with no perspective. Warm, packed sand fills the whole picture, with a few
> small stones and the faint marks of a rake. In the middle, about a quarter
> of the picture wide, a square fighting ring: four thick wooden posts with
> brass caps at its corners and a red rope between them, sagging a little.
> Inside the ring the sand is a little darker and smoother. Nothing else: no
> people, no stands, no walls, no shadows on the ground.
>
> BroTown HD pixel art: crisp, modern high-definition pixel art on one clean
> square pixel grid, like Eastward or Sea of Stars. Every pixel is a
> hard-edged square: no blur, no anti-aliasing, no soft brushes and no smooth
> gradients. Each colour is shaded with 3 to 5 flat tones, in clusters of
> pixels rather than single stray ones, with shadows shifted toward cool
> blue-purple and highlights toward warm yellow. Every material is drawn as
> itself: sand in soft, fine drifts, wood with grain lines and knots, metal
> with small, sharp, bright highlights. Texture comes from a few clear shapes
> and soft shading, never from noise, speckle or grain. Soft, even daylight
> from the upper left, no glow, fog or lighting effects: the game adds those.
> The ground has no outlines; the posts and rope have a one-pixel outline in
> a darker shade of their own colour, never black. Moderate saturation, the
> sand calm and mid-toned so characters stand out.
>
> Attached is the game's style key. Match its pixel size, colours, shading
> and the way it draws each material exactly, but do not copy its tiles.

**2. The stands** (attach: your style key and the floor from picture 1):

> A wide picture (3:2, landscape) for BroTown, a top-down 2D action RPG: one
> long section of wooden arena stands, seen from a steep three-quarter
> top-down angle, with no perspective: three rows of plain wooden benches
> stepping up away from the viewer, each row a little higher, with a wooden
> rail along the front and two sets of steps cut through them. Built by Bros:
> solid, handsome frontier carpentry underneath, with proud repairs and
> adventure dents; one big joke, big enough to read on a phone (a bench mended
> with a giant sword). Along the back, three cloth banners on poles, red,
> blue and green. No people. The background is ONE flat magenta colour
> (#FF00FF) everywhere, with no shading, gradient, texture, shadow or glow,
> so it can be cut away cleanly. Nothing in the stands is magenta.
>
> (the same style paragraph as picture 1)
>
> Attached are the game's style key and the arena's floor. Match them
> exactly: their colours, pixel size, shading and the way each draws its
> material, using only what is in them. Do not copy their layout.

## Step 3: later, once the area is in

- **Stands that fill**: the crowd drawn sitting on the benches when a
  spectator stands on one (a sit pose already exists: `emotes.js` moves).
- **Matchmaking by level**: today's bracket puts a level-2 against a
  level-40. Brackets by level band (1-10, 11-25, 26-40), each its own queue
  and, with the instances above, its own ring. The worker's arena is one
  `this._arena` today; it becomes a small list of them.
- **Stakes**: the fighters' own wager (the duel's wager machine already
  escrows one), a bigger prize pool from the stakes, and a "crowd favourite"
  (the fighter with the most backers) shown on the board.
- **Repeat tournaments on a timer** ("the next bracket starts at :30"),
  so a crowd knows when to come.

## An honest size for each part

These are sizes for one session's lane, each part its own PR with its own
test, in the order they should be built:

| Part | What it is | Size |
|---|---|---|
| A. The zone and the way in and out | `arena:<n>`, `arena_enter` / `arena_leave`, the cap and kill switch, the window's button, the loading screen, the gate out, a phone test going in and out | **Medium**: 1 lane (about a day). Most of it copies the dungeons' path |
| B. The map drawn in code | the floor, the ring's rope and the stands as footprints, the banners and torches; the UI review's new state and the design note; memory checked (`mp-membudget`) | **Medium**: 1 lane |
| C. Fighters into the ring and out | the worker places them at match start and end, the ring refuses spectators, the "go to the arena" button for a fighter away; mp-arena moved into the area | **Medium to large**: 1-2 lanes; the server-placed move and its phone test are the hard part |
| D. More instances | filling `arena:1`, then `arena:2`; the overflow's board; a load test (`load.mjs`) with 60+ bots | **Medium**: 1 lane |
| E. Its pictures | the owner's two ChatGPT pictures, cut and put in (as the Goo Grotto's were) | **Small** for the code once the pictures exist; the pictures are the owner's time |
| F. Step 3 | stands that fill; brackets by level; stakes; the timer | **Large** together: one lane each, any order |

**A to C is the arena area a judge would see**: about three to four lanes.
D matters only when more than about 60 people want to watch at once. None of
it changes the world's plan or needs a re-bake (the way in is a window
button), unless the owner wants a door of its own on the Sheriff's Office.

## Questions for the owner

1. **The way in: a button in the Sheriff's Office's arena window (cheap, no
   change to the world) or a door of its own** (a change to the world's plan
   and a re-bake of both Wheels)?
2. **Fighters away from the arena when their match starts: a "go to the
   arena" button (the plan above) or pulled in automatically?**
3. **One ring with matches one after another, or two rings side by side**
   so a first round of four matches is over sooner?
4. **Does the arena stay open between tournaments** as a place to hang out
   (and to duel in the ring), or only while a tournament runs?
