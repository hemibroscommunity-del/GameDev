# The arena's own area: the plan (v2.3.3741)

> The owner, 2026-10-28: *"Also interested in bringing the arena to Brotown
> (the wheel map only). Let me know how to start that."* And then: *"There
> won't be enough room for the arena with several dozens of players all in
> town so it needs its own special area that can scale."*

**Status: step 1 is built; step 2 is a PLAN, with the owner's answers
(2026-10-28) in it.** The first step, below: the arena the worker already
runs (docs/specs/arena.md) now plays end to end in the world, on phones, and
its test proves it (`tools/qa/mp/mp-arena.mjs`, v2.3.3713). The area is the
second step; the order to build it is at the end.

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

### The owner's answers (2026-10-28)

> *"I think an armored bro in a chariot who takes you to the arena would be a
> good choice instead of the sheriff. Go the way your recommended for
> arena"*

- **The way in is a new townsperson: the charioteer**, an armoured bro
  standing in a chariot, instead of the Sheriff's Office's window.
- **A fighter who is away when their match starts gets a button** ("Your
  match is starting: go to the arena"), never a pull.
- **Two rings side by side: the Ring (melee) and the Field (about twice its
  size, for bows and magic).** That is the owner's size choice (Step 3.1).
- **The arena stays open between tournaments**, to hang out and to spar.
- **Same-device accounts are blocked** from staked fights and bets against
  each other, never shown (Step 3.3).

### What the player sees

- **The charioteer.** An armoured bro standing in a two-wheeled war chariot
  with one armoured horse, in the town (where: below). **Tap him**, as every
  townsperson (never a walk-up opener):
  - **Sign up** (the 100G entry: today's `/api/arena/join`, the window's
    "Enter Arena", "In Queue" and the fight card move into his dialogue);
  - **Ride to the arena** (the loading screen, then the arena's own area);
  - **The board** (the fights on now, their stakes, rules and bets, Watch:
    Step 3.2).
  Once he is in, the Sheriff's Office's arena row says *"The charioteer
  takes arena sign-ups now"*; until then it works as today.
- **A loading screen** ("The Arena", showing the chariot) while the area's
  pictures load, exactly as a dungeon's (`preloadZoneAssets`, freed on the
  way out: the memory law). A real ride animation can come later.
- **Inside: two of the owner's rodeo rings side by side**, the Ring and the
  larger Field, on open packed earth, with room all round them for a crowd:
  the two stands, the war horn, the weapon rack, the brazier and the pennant
  round the edges, the gate (its sign reading ARENA) at the way out, and the
  board by it.
- **Open between tournaments**: anyone may come in to watch, chat, emote
  and spar (a duel in a ring, wager or none, as today's duels anywhere).
- **Spectators walk anywhere except inside a ring.** The fence stops them
  (a footprint, as a dungeon's walls are). They can back a fighter from the
  board.
- **When your match starts, you are moved into its ring**, to your side,
  facing your opponent, with a short "Round 1: Gladius vs Murmillo" banner.
  **When it ends you are moved out**, back by the stands (the loser where
  they would respawn, by the gate, health back).
- **A fighter not in the arena** when their match starts gets **"Your match
  is starting: go to the arena"** with a button; a tap rides them into their
  ring. Not there by the match's clock: the tiebreak decides, as today.
- **The way out** is the gate, back to the charioteer.

### How it is built

It is built **the way the world's dungeons are**, because they already solve
"a place of its own, entered from the world, loaded behind its own screen":

| Part | The dungeons today | The arena area |
|---|---|---|
| The zone | `dungeon:<id>`, a zone the ZONES table does not know (dungeon.js "FOLDED INSTANCES"): the server ticks it, sends it on its own, and PvP fails closed there | `arena:<n>`, the same trick. No monsters. PvP still fails closed, and an arena match's duel opens it for the two fighters only (the consent pair is checked first in `_pvpAllowed`, whatever the zone: nothing to change there) |
| Going in | `dungeon_start` at a mouth, the worker's checks, `dungeon_started` with `back` (the way out) | `arena_enter` from the charioteer (or the "go to the arena" button), checked on the worker (near him or in a match, alive, not in a dungeon), `arena_entered` with `back` (beside the charioteer) and the instance |
| Its map | `src/data/wheelDungeons.js` WHEEL_ARENA (36 x 52 tiles, mirrored on the worker), `src/rendering/arenaWorld.js`, `arenaWalls.js`, `src/data/dungeonArena.js` (things and footprints) | the same files grow an arena map: a bigger floor (below), each ring's fence (`ARENA_ART.ring.geo`'s oval, and the Field's twice as big) as a footprint, the stands as footprints with gaps for steps |
| Its art | the land's ground, walls and things, behind the dungeon's own loading screen, freed on exit | the owner's pictures (`src/data/arenaArt.js`, below), the same way |
| Coming out | the gate in the bottom wall | the same |

New on the worker (`server/src/gladiator.js` and a small new
`server/src/arenaarea.js`):

- `arena_enter` / `arena_leave` (handled on purpose: deny by default), a cap
  `arenaarea` and a lower-case kill switch `arenaarea` (off: the charioteer
  offers no ride and nothing moves; the tournament plays in town as in step 1).
- **The instances**: a list of `arena:<n>` zones, each with its count of
  players, filled lowest number first up to a per-instance cap (below).
- **Moving the fighters**: at `_arenaTryActivate` (a match starts), if both
  fighters stand in an arena instance, the worker places them at two sides
  of the match's ring (the Ring or the Field) (a server-placed move, the way a dungeon's arrival is) and
  says so (`arena_ring {matchId, corner}`); at `_arenaOnMatchResolved`, both
  are placed back outside the fence. The ring's oval is held on the
  worker too: a spectator's move into it is refused (an ellipse test, cheap).
- **Fetching a fighter who is not there**: `arena_match_start` carries
  `area: true`, and the phone shows the "go to the arena" button, which sends
  `arena_enter` with the match's id: that one lands in the ring.
- Every new message the worker sends goes in `PRIVILEGED_EVENTS` and the
  phone's direct switch; the instance list is a new storage key only if it
  needs to outlive a restart (it does not: like dungeons, an arena instance
  is in memory, and a deploy just sends everyone back beside the
  charioteer).

### Its size on the ground

The dungeons' arena is 36 x 52 tiles (1,152 x 1,664 game px), sized so an
upright phone draws it at the world's own character size. The arena area
wants room for a crowd round a ring:

- **The floor**: 96 x 64 tiles (3,072 x 2,048 game px): the two rings side
  by side with room round both. An upright phone sees one ring and its rails
  at a time; a sideways phone (and a computer) a ring and the stands by it.
- **The ring**: the owner's rodeo ring (`src/data/arenaArt.js`),
  640 x 357.5 game px, its posts on an oval 624 x 297 across, on the left:
  room for two fighters with swords to circle, small enough that a spectator
  at the rails sees both fighters on one screen. (The owner's FIELD size for
  bows and magic, about twice that, on the right: Step 3.1.)
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
- **One tournament, one instance, two rings**: the bracket's matches are
  fought in the main instance's Ring and Field, two at a time. The overflow
  instances show the board and the live result (the
  `arena_stake_board` broadcast already sends what is happening) but not the
  fight itself. Sending one zone's fight to another is not something the
  worker does today.
- **With 120 players in the room, the arena's second instance is the most it
  will ever need.** Past 120 the game needs more rooms: that is
  `docs/SERVER-SPLIT-PLAN.md`, and an arena is a natural first thing to move
  to a room of its own (it needs only the players' gear and gold, which the
  split plan already moves). Not part of this plan.

### Its look: the owner's pictures

The owner has made the arena's pictures (lane E,
`docs/specs/arena-art.md`): cut into `public/world/arena/` with their sizes
and feet in `src/data/arenaArt.js` (`ARENA_ART`). Nothing draws them yet; the
area does:

- **The ring is two sprites**: `ring.back` (the far rails) under the fighters
  and `ring.front` (the near rails) over them, each at its `at` in the whole
  ring, so a fighter stands between the rails. Its fence is a footprint: the
  oval in `ring.geo` (`cx`, `cy`, `rx`, `ry`) stops your boots, except across
  the entrance (`geo.gap`) where the ring is open; the worker holds the same
  oval (below).
- **The floor** is a ground the world already has (the town yard's packed
  earth), not a new picture: no new art, no new memory.
- **The gate** (`gate`, its sign reading ARENA) stands at the way in and the
  way out; its two posts are footprints and `gate.walk` is the walk-through.
- **The stands** (`stands.long`, `stands.short`) round the ring, their front
  `line` a footprint, and the four **props** (the war horn, the weapon rack,
  the brazier, the pennant) round its edges, clear of the walk-ways.
- **Loading and freeing**: the area's art loads behind its own loading
  screen (`preloadZoneAssets`, as a dungeon's) and every texture is destroyed
  on the way out (the memory law). All of it is 6.0 MB decoded at once; a
  phone in town holds none of it.
- **The world's Arena plot.** The world's plan already has an empty plot,
  east of the town (`public/tools/world/plan.js` places `arena`, "a round
  rodeo ring and duelling ground", r 200, with `arena-path` ending in it).
  With the charioteer as the way in, the plot is a candidate for where he
  stands (below); the rings themselves are in the area, not on the plot.

### The charioteer

- **A townsperson** (`src/data/wheelBuildingDoors.js` `WHEEL_TOWNSFOLK`), a
  tap to talk (tests reach him with `H.approachNpc`), behind the cap
  `arenaarea` (an older worker: he does not stand there).
- **His look** (the owner: *"put armor on the bro (iron) and spartan
  helm"*): the full **IRON** armour set and the **Spartan Helmet** (headwear
  id `spartan-helmet`, `src/rendering/traits/headwearCatalog.js`), over the
  character creator's ids, baked by `tools/qa/npc-looks.mjs` and
  `tools/qa/npc_looks_bake.py`, never by hand.
  - **Townsfolk looks cannot carry armour today**: the bake takes each one's
    photograph with the gear slots set to none (`npc-looks.mjs` sets `chest`,
    `legs` and `shoulders` to `'none'` through `__btGearSet`). So part 1
    adds an armour field to a townsperson's look (each slot's piece, and its
    tier), sets it through the same `__btGearSet` before the photograph, and
    keeps every other townsperson's photograph the same (a re-bake of all of
    them that changes none is the check). The helmet is a creator headwear
    id, which the bake already sets.
  - **Standing in the car**: lane E's chariot art gives where his feet go
    and the line of the front rail (`ARENA_ART.chariot.stand` / `rail`,
    `src/data/arenaArt.js`, PR #1222): his photograph is drawn with its feet
    at `stand`, between the chariot's back half and its rail.
- **The chariot** is NEW art: the owner is making it in ChatGPT (from the
  orchestrator's prompt: a two-wheeled war chariot with one armoured horse,
  the car empty, side-on facing left, on magenta, 320 px wide, group
  `arena`, id `arena-chariot`). It is cut with lane E's steps
  (`tools/world/add-arena-art.mjs`) into a BACK (the horse, the wheels, the
  car's far side) and a FRONT RAIL, so he stands IN the car with the rail
  drawn over his legs, the way the ring was split; its numbers join
  `ARENA_ART`. Until it is uploaded: him alone, the chariot a stand-in drawn
  in code (a box and two wheels).
- **Its memory**: one 320-px picture, about 0.3 MB decoded, loaded behind
  the loading screen with the town's townsfolk (`preloadWorldAnimations`:
  PRELOADING IS LAW) and kept, as theirs are.
- **Where he stands** (the builder's call, the orchestrator says): **by the
  Sheriff's Office**, on open ground beside its steps. That is a placement in
  the town's townsfolk table, no change to the world's plan, the object
  catalog or the placing, so **no re-bake**. Standing him on the plan's
  Arena plot instead would mean the plan, a re-bake of both Wheels and a
  worker deploy in the same PR (CLAUDE.md §7): later, if the owner wants the
  plot used.

### Sound

No new sounds are needed for the fights: the arena has its war horn
(`arenaStart`), its sign-up ring (`arenaJoin`) and the Gladiator fanfare. Two
things for a crowd:

- **The crowd's cheer** (the owner's, Freesound 651646, kept unwired in
  `assets/sfx-source/2026-10-28/` by lane E): the stands cheer when a match
  ends, heard only in the area. It is cut and levelled with `tools/audio/`,
  gets its Sound Studio label (`src/data/soundStudio.js`) and its
  `CREDITS.md` row in the same PR.
- **A cap on copies of one sound.** Thirty fighters' hits on one screen would
  be thirty copies of one recording at once. The voice cap
  (`src/data/voiceCap.js`, `mp-voicecap`) holds one recording to a few copies
  within a few milliseconds, and the owner turned every memory saver ON by
  default everywhere (2026-10-28), so the area needs nothing of its own.

### A crowd on a phone: memory, and a test for it

- **Each other player drawn costs a phone about 2.5 MB** (`mp-peermem`,
  `docs/MEMORY-PLAN.md`). Thirty fighters on one screen is about 75 MB of
  players alone, enough to push an iPhone over its ~250 MB in a fight. Today's
  crowd cap draws the nearest 50 in full and always your duel, your party and
  whoever is fighting you (`src/game/crowdCap.js`, `docs/specs/peer-cull.md`);
  the rest are not drawn (the minimap still shows them).
- **In the area the cap is lower: 16 drawn in full** (about 40 MB), always
  the two fighters in the ring first, then your party, then the nearest. The
  rest of the crowd is not drawn, as past today's cap. It is one number in
  `crowdCap.js`'s pick, by zone, and `?crowd=K` still tries another.
- **What lifts it**: the character lane's phase 2 (looks as palette rows,
  `docs/MEMORY-MAP.md` "Characters"), which makes a drawn player cost a
  fraction of today's. With it, the area's cap rises toward the town's.
- **A crowded-fight phone test**, which nothing has today (`mp-crowdbots`
  measures crowds WALKING): the load test's bots (`tools/qa/load/`) fighting
  in pairs round one QA phone in the area, 10, 20 and 30 of them, reading the
  phone's frame work, its memory (`memprobe`) and the sound voices playing.
  It sets the area's cap and the per-instance size.

## Step 3: the owner's asks (2026-10-28), after the area

The owner, on the arena, in their words; planned here, built after the area.

### 1. Choose the size: a RING for melee, a FIELD for bows and magic

> *"can you allow the player to choose the size? Right now it's appropriate
> for a close melee battle but they might want a larger arena for ranged
> battles like magic or bow (or maybe vs melee depending on what the
> fighters want)."*

- **Two rings side by side in the area** (the owner: "Go the way your
  recommended"): the **RING**, the owner's 640-px ring, and the **FIELD**,
  about twice its size. A match is set in one of them (a duel's challenger
  proposes it and the other accepts, as the stakes are; a tournament's
  bracket says it, and two first-round matches can run at once, one in
  each). It is also what the board lets you pick to watch.
- **The FIELD is made of the ring's own posts**, cut one at a time from the
  ring picture (one more piece in `add-arena-art.mjs`, lane E's tool), set
  round an oval twice as big, with **ropes drawn in code** between them. No
  new picture, and no blowing up the pixel art (it is only ever shrunk).
- **The worker holds both fighters inside the chosen oval** for the match (a
  move outside it is pulled back to its edge, as the ring's fence stops
  boots on the phone).
- Size: **medium**, one lane (the posts, the ropes, the choice on the wire
  with a cap, the worker's boundary, a test).

### 2. Watching: a board of the matches

> *"Will people be able to pick what arena fights they want to watch and see
> what's staked and what the rules are?"*

- **The arena board**, a window anyone can open: from the charioteer's
  dialogue, and at the area's gate: every match on now and next, each with
  - the two fighters: name, level, weapon;
  - **the stakes**: each side's wager, the entry fee and the prize, and the
    gold onlookers have backed each side with (the worker's
    `arena_stake_board` already sums it);
  - **the rules**: the size, the weapons, the 3-minute clock and its
    tiebreak, no healing.
- **Watch** takes you to that match's stands (or a watcher's camera on it).
  **Back a fighter** from the board too (the same `arena_sponsor`).
- Size: **medium**, one lane (mostly the window; the worker sends what it
  already knows); a new window goes in the UI review's `states.mjs` and
  `UI-DESIGN-NOTES.md`.

### 3. Relationships between the fighters

> *"it would also be nice to know if the two fighters have any relationship
> (like friends, another player on the same account, in the same clan,
> etc)"*

- **Badges** on the board and over the fighters: **friends**, **same clan**,
  **same party**. All three the worker knows; size **small**.
- **Accounts on the same device: blocked, never shown** (the owner,
  2026-10-28: *"Block them, your recommendation is good."*). The worker knows
  them (`_deviceIndex`, the bot fingerprint's fleet). Two such accounts can
  still spar for nothing, but may NOT:
  - fight each other in a staked match or a tournament match with a prize;
  - be bet on in a match against each other.
  The rules of the check:
  - it is the **worker's**, at match setup (a duel's stakes, the bracket's
    pairing) and at bet placement (`_handleArenaSponsor`);
  - its refusal names no account and no device: *"These two can't fight for
    stakes."*;
  - **no public "linked" badge**: it blocks a staked fight between two
    honest players who share a device and never flags them;
  - it protects OTHER players' bets, so it does **not** ask `_testMode`
    (CLAUDE.md §5);
  - **the bracket pairs a same-device pair apart** where it can (swap with
    the next pair's fighter); where it cannot (two left), the match is a
    walkover with both entries refunded, and neither is crowned on it;
  - a lower-case kill switch in the live flags (`arenadevice`), a server test
    for every refusal, and its line in `docs/specs/arena.md`.
  Size: **small to medium**, one lane with the badges.

### Later still

- **Stands that fill**: the crowd drawn sitting on the benches (a sit pose
  exists: `emotes.js` moves).
- **Brackets by level band** (1-10, 11-25, 26-40), each its own queue and
  ring; the worker's one `this._arena` becomes a small list.
- **Repeat tournaments on a timer** ("the next bracket starts at :30"), so a
  crowd knows when to come.

## An honest size for each part, and the order to build them

Each part is its own PR with its own test (a sampled phone check where the
part sits behind its switch, the owner's preference), in this order:

| # | Part | What it is | Size |
|---|---|---|---|
| 1 | The charioteer | the townsperson by the Sheriff's Office (his baked look in iron armour and the Spartan Helmet, with the bake taught to carry armour; the chariot in its two halves, a stand-in until the owner's picture); his dialogue: sign up (the window's arena flow moved into it), and the Sheriff's row pointing to him | **Medium**: 1 lane |
| 2 | The zone, in and out | `arena:<n>`, `arena_enter` / `arena_leave`, the cap and kill switch `arenaarea`, "Ride to the arena" and its loading screen, the gate out, open between tournaments; a phone test riding in and walking out | **Medium**: 1 lane, mostly the dungeons' path |
| 3 | The owner's art in it | the Ring and the Field side by side (the Field's single posts cut by lane E's tool, ropes in code), each fence a footprint on the phone and an oval on the worker, the gate, the stands and the props, the floor; loading and freeing; the UI review's state; `mp-membudget` | **Medium**: 1 lane (the art exists) |
| 4 | Fighters into a ring and out | the worker places them at a match's start and end, in its ring; a ring refuses spectators; "Your match is starting: go to the arena"; mp-arena moved into the area | **Medium to large**: 1-2 lanes |
| 5 | The crowd on a phone | the area's crowd cap (16 drawn in full), the crowd's cheer at a match's end, the crowded-fight test (the voice cap is already on everywhere) | **Medium**: 1 lane |
| 6 | The board | Step 3.2: fights on now, fighters, stakes, backing, rules, Watch, Back; with the friend, clan and party badges (3.3) | **Medium**: 1 lane |
| 7 | The same-device block | Step 3.3: at match setup, the bracket's pairing and bets; kill switch `arenadevice`; server tests | **Small to medium**: 1 lane |
| 8 | The ring choice for duels | a duel's challenger proposes the Ring or the Field, on the wire with a cap | **Small**: with 4 or 6 |
| 9 | More instances | `arena:1`, then `arena:2`; the overflow's board; a load test with 60+ bots | **Medium**: 1 lane, only past ~60 watchers |
| 10 | Later still | stands that fill, level bands, the timer, a real chariot ride | one lane each |

**Why this order.** The charioteer (1) is visible on his own and replaces the
Sheriff's window, so he can ship first even before the area exists (his
"Ride" waits on 2). 2 to 4 are the area a judge would see. 5 must land before
a crowd is invited in (memory). 7 is small but protects other players' gold,
so it lands before stakes or bets move into the area. 1 to 5 is about five
lanes; 6 to 8 two or three more.

## Decided

Decided by the owner, 2026-10-28: the charioteer is the way in; an away
fighter gets a button; two rings side by side (the Ring and the Field); the
arena stays open between tournaments; same-device accounts are blocked from
staked fights and bets against each other, never shown.

The voice cap is on everywhere (the owner: every memory saver on by
default). Where the charioteer stands is the builder's call: **by the
Sheriff's Office** (above); the world plan's empty Arena plot east of town is
as good **if it is a placement only**, with no change to the plan (a change
would mean re-baking both Wheels and a worker deploy in the same PR).

Nothing is open for the owner. Step 2's PRs come after the judges' showing,
starting with part 1.
