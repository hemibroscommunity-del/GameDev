# Missing sound effects (audit v2.3.3023, refreshed v2.3.3343)

> Owner, 2026-10-04: *"Give me a list of missing sound effects. Some I thought
> of is jumping, landing (from jumping). Monster noises, monster projectiles
> thrown and destructing, etc."*
>
> Owner, 2026-10-18, on the refreshed list: *"Start adding the have ones then
> give me the list of ones that are still needed afterwards"*

v2.3.3343 added every missing sound that could be made from recordings the game
already ships. What is left needs **new recordings**, or work that is more than
a sound. Both lists are below.

## Two things to know first

- **Only recordings.** The owner removed every sound the code made up
  (v2.3.1103: synthesised audio was "worse than nothing"). `BT_AUDIO.beep()` is
  an empty function since then, so an event that only calls it is silent. New
  sounds are slices of the recordings the game ships (`public/sfx/`,
  `public/audio/`) or new recordings: Pixabay, or Freesound as CC0 or CC BY.
  **A CC BY-NC recording is never used** (CREDITS.md).
- **How v2.3.3343's sounds are made.** Each is a list of slices of files
  already in `SFX_MANIFEST` (decoded on the loading screen, so memory does not
  move): `src/data/eventSounds.js` says WHAT (the slice, its level, its pitch),
  `src/game/eventSounds.js` says WHEN and HOW LOUD (a monster's or another
  player's sound quieter the further it is, `hitSounds.earVol`; another
  player's about half your own, `PEER_K`, at most `PEER_BURST` in a moment).
  `server/test/sound-cues.test.mjs` holds every slice to its file and every
  call site's name to the table; `tools/qa/mp/mp-soundcues.mjs` plays them on
  a phone; `tools/qa/mp/mp-cuelevels.mjs` renders each one and measures it.

## Added in v2.3.3343

**In a fight**
- Your shield: a monster's blow on it (the clang), a ball breaking on it, and
  raising and lowering it.
- A blow the worker rolled as dodged: a rush of air, never the "you got hit"
  clang, and no shake or red sparks.
- Your dodge roll, the lunge, the sword's dash.
- Critical hits ring (the grand slam's own sample). A parry clangs.
- The bow is drawn before it looses (`bow-pullback.mp3`, never played before).
  The bow special draws, then each arrow flies.
- The staff's special and its three orbs have their own cast; the Element
  Burst its cast and its blast; two elements colliding a crack and a gust, and
  a new combo a discovery chime.
- A weapon change draws a blade.
- A jump pushes off and lands with a thump; a sprint running dry deflates.
- A status wearing off (chill, burn, poison...) shimmers.
- Standing up after a death.
- PvP: a hit you block or dodge, and your blow blocked or dodged, sound as what
  happened; a crit rings; a kill has its sting; duels and the arena start,
  win and lose with Ace's coin-flip stings; the champion's fanfare.

**Monsters**
- Their throws: a snowball's whoosh, a fireball's cast and hiss, a glob's plop.
- The wind-up before a slam or lunge, the slam hitting the ground, a lunge
  that finds nobody.
- The Blue Slime swelling and bursting; a snowman digging in and bursting out;
  a mummy's wrappings tearing away.
- Each creature dies as what it is: the fire goblin a thud and a fizzle, the
  rock monster and the thorn shambler stone cracking, the fishman a splash, the
  bog lurker a squelch. The Blue Slime and Mire Wisp no longer play two deaths
  at once.
- Coming back to life: a slime's plop, anything else a shimmer.
- Dungeon bosses: arriving, the warning, slam, charge, enrage, summons, drain.

**The world**
- Rivers, Bro Pond and the falls are heard on their banks (`river-water.mp3`,
  `src/game/waterAmbience.js`).
- Doors (every way through one: E, the stick, a keeper, the Enter button),
  dungeons (in, each wave, cleared, out), crossing into a land, No man's land
  (crossing in, a skull, what a death took, what your kill took), signposts
  popping up, an object mended, a building catching fire, loot landing.
- Lighting a fire (two flint strikes) and the campfire catching; a harvest's
  gesture opening; a crop ripening; your pet's ward.

**Crafting, loot, quests, menus**
- Smelting, forging (and a forge that refuses), armour, hardening (success and
  fail), woodwork, hardened wood, traps, gem cutting and shattering, gem
  setting, salvage, the Cookhouse (a dish, its fish game, a burnt fish).
- Picking up armour, weapons, remnants, shards and gems.
- The Rare / Elite / Godly reveal ticks, glints and lands on its grade's own
  finish. The Daily Spin ticks past each slice. A kill roll that wins a drop.
- A quest taken, its tasks done, a new Codex page, a shop buy, the auction
  house (listed, bought, bid, sold), a trade done or called off, an alliance
  formed, a war declared. Gem Cutting levels up with the fanfare.

**Other players** (about half your own level, by distance)
- Their footsteps (on the ground they walk on), jumps, rolls, sprints, shield,
  swimming (in, out, strokes).
- Their swings, shots and spells, whirlwind, shield bash, burst, parry.
- Monsters hitting them (the clang or thud, their shield, a miss), and them
  dying.
- Them chopping, mining, fishing and cooking beside you; their hits on trees,
  fences and buildings now by distance (they were at full volume anywhere).

## Still needed: new recordings

Get them from Pixabay, or Freesound as CC0 or CC BY. Never CC BY-NC.

| Sound | For | Notes |
|---|---|---|
| **Creature voices** | each kind's idle, an "it noticed you" call and a hurt grunt | only the green slime has an idle gurgle; nothing growls before a slam |
| **Your hurt grunt** | being hit | today the armour clang or a thud |
| **Low-HP heartbeat** | under a fifth of your health | |
| **Munch and gulp** | eating and drinking, Quick Eat | both silent |
| **A soft UI pop** | chat lines and emotes | |
| **A notification chime** | mail arriving, party / duel / trade invites, friends' messages, announcements | |
| **A "denied" tick** | "No mana!", "Not enough energy", bag full, not enough gold, "Swimming!", "Dazed!", a greyed-out button | one sound for every refusal |
| **A horn or a drum** | dungeon waves, the arena | today a slowed shield bash and wind |
| **A boss roar** | a dungeon boss arriving and enraging | today a felled tree's thud and wind |
| **An explosion** | the Blue Slime's burst | today a crack and a splash |
| **Fire crackling** | a building on fire, campfires | today the frying pan's sizzle, briefly |
| **Sea surf** | the open sea and the shallows | rivers and ponds are done |
| **Birds, forest, lava, cave drips** | each land's air | only the Wind Dunes has wind |
| **A town crowd** | BroTown | |
| **Leaf-litter footsteps** | the forest floor | plays grass today |
| **NPC voice blips** | speech bubbles, opening a conversation | the Mayor's recorded welcome is in the game but not reachable in play |
| **Music for four lands** | Stone Hollows, Electric Foundry, Water Caves, Poison Forest | they play the login theme. `world.mp3` was offered as a stopgap and the owner said no (2026-10-06) |

## Still needed: more than a sound

- **Big monsters' footsteps** (rock monster, thorn shambler, fishman, bog
  lurker). The stone step slowed down would do, but it has to land on each
  creature's own foot plant, and their walk strips do not say which frame
  that is. A step out of time with the feet sounds worse than none.
- **Your blow on a player who blocks it** plays the flesh hit at contact, then
  their shield's clang when the worker answers (v2.3.3343). Waiting for the
  answer before any sound would make every hit on a player sound late.
- **Mining miss**: `extract-fail.mp4` has a sound to cut, but cutting it is a
  new file in the manifest.

## Not a sound, found on the way

- The bag's **Drink** button calls a close function that does not exist, so
  the item window may stay open after drinking. Not tested, not fixed here.
