# Missing sound effects (audit v2.3.3023, refreshed v2.3.3343, v2.3.3434 and v2.3.3457)

> Owner, 2026-10-04: *"Give me a list of missing sound effects. Some I thought
> of is jumping, landing (from jumping). Monster noises, monster projectiles
> thrown and destructing, etc."*
>
> Owner, 2026-10-18, on the refreshed list: *"Start adding the have ones then
> give me the list of ones that are still needed afterwards"*, and after it:
> *"Look for more too"*, then *"Good look for more. I'll get other sounds in
> morning"*, and with 21 recordings: *"I have the rest of the sounds"*

v2.3.3343 added every missing sound that could be made from recordings the game
already ships, and v2.3.3434 a second and a third round found by looking again
(every place that still called the silent `beep()` or `collect()`, every
message from the server that shows something and plays nothing, the emotes and
moves added since, and the menus a tap on the world opens). What is left needs
**new recordings**, or work that is more than a sound. Both lists are below.

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
  a phone (`mp-moresounds.mjs` the second round's); `tools/qa/mp/mp-cuelevels.mjs`
  renders each one and measures it.

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

## Added in v2.3.3434 (the second look)

- **The farm**: a crop pulled from its bed (the soil giving and a pop: the
  farm's payoff was silent while the spade and the watering can were heard);
  a night in the farm's bed.
- **Wagers**: the Gambling Den's dice won and lost, coins into its weekly pot,
  the pot drawn for you (a fanfare and coins; only the winner hears it), a
  stake on a gladiator put down, paid and lost.
- **Results**: a guild's rank quest turned in (the same chime as every quest),
  an alliance war won or lost, signing up for the arena.
- **The General Store's market**: bought, sold, listed and called off, with the
  auction house's own sounds.
- **Invites that fit what they are**: a duel challenge rings like a drawn
  blade, a trade invite clinks two coins.
- **Pets**: taken out (a pop and a sparkle), put away, released to the wild.
  The Snowling, Gobling, Sparklet and Dewdrop answer in their wild kind's own
  voice, smaller (the snowman's snarl, the goblin's rawr, the slimes' bounce).
- **The forge at work**: near the Blacksmith's in BroTown its anvil rings now
  and then, softly, the sound of the sparks it throws.

## Added in v2.3.3434 (the third look)

- **Emotes and moves** (they shipped silent: their plan asked for "reused
  sounds"): an emote's emoji pops as it appears; a facepalm slaps, sitting down
  bumps, a flop thumps, a flex sparkles and a cheer pops like a party popper.
  Yours, other players' beside you (about half as loud) and the townsfolk's:
  Lil Bro copying you, Blacksmith Bro flexing back, Mayor Bro's cheer.
  Which move makes which sound is `MOVE_SOUNDS` (`src/data/eventSounds.js`).
- **A harvest's prize landing in the bag** after it flies there: the bag's
  leather, softly.
- **The menu click on a tap on the world**: your bro's chat box, a player's
  card, and a townsperson's window (his quest, Ace's coin flip, Diego's shop,
  the Pets page) open with the click every menu has -- a tap on the world
  reaches no on-screen button, so they opened silently.

Found on the way and fixed: the bag's **Drink** button called the browser's
own window-close instead of the card's, so the card stayed open after a drink
(and a tab the browser lets a script close could have closed the game).

## Added in v2.3.3457 (the owner's recordings)

The owner sent 21 recordings for the list below ("I have the rest of the
sounds"). `tools/audio/cut_owner_sounds.py` cuts each to the moment the game
wants (CREDITS.md has where each came from; the sources are kept in
`assets/sfx-source/`), and `docs/specs/owner-recordings.md` says how each is
played.

- **Your hurt grunt**: a blow that lands on you, by a monster or a player, is
  grunted -- one of two grunts, never the same twice running, never for a
  scratch, a block, a dodge or a burn's tick. (The third grunt is the sprint's
  push-off, the owner's own ask, in its own change.)
- **The low-HP heartbeat**: under a quarter of your health, about once a
  second; quicker under a tenth. Its recording is nearly all deep thump, which
  a phone's speaker hardly plays, so a little of its own overtone is laid over
  it.
- **Munch and gulp**: Quick Eat, the bag's Eat and Drink, the Cookhouse's Eat.
- **The chat's pop**: a line coming in, softer for your own going out.
- **The notification chime**: mail, a party or clan invite, a friend's request
  or message, an announcement, the weekly jackpot won by someone else.
- **The "denied" tick**: no mana, no energy (abilities and the sprint), no
  shield, not in combat, "Swimming!", "Dazed!", "Staggered!", reconnecting, HP
  full, a bite held back in a fight, not enough gold, the guards' gear lock,
  the farm's refusals, a stake, turn-in or harden refused, a trade declined,
  the Mayor's gates, a loot pile that is not yours.
- **A laugh and a snore**: the Laugh laughs; Sleep snores as you lie down and
  again every few seconds while you lie there -- yours, a player's near you, a
  townsperson's copy.
- **The dance's beat**: while you hold a dance, the club beat (120 a minute,
  the dances' own tempo) takes the music player; the land's music comes back
  where it would have been when you stop. Streamed, never decoded; your own
  dance only.
- **The war horn**: each dungeon wave, the arena's start, a war declared on
  you.
- **A boss's roar**: a dungeon boss arriving, and enraging.
- **An explosion**: the Blue Slime's burst, over its wet splash.
- **The townsfolk's voices**: each hums in a voice of his own as you open a talk
  with him (his quest, Ace's flip, Diego's shop, the Pets page, "nothing for
  you"), and softer, one at a time, as a line of his pops up over him.
- **Each land's air**: the Verdant Wilds' birdsong and the Flame Fields'
  bubbling lava, beside the Wind Dunes' wind.
- **The sea, the town and fire**: surf from the shore of the open sea and its
  shallows, BroTown's crowd in its streets, a crackle by a burning building or
  a lit campfire (yours or another player's).
- **Into and out of the water** (sent after the rest, "a missing sound effect
  for the player gets in and out of the water"): the owner's splash going in,
  its slosh coming out -- yours, another swimmer's, and climbing out onto a
  fishing or mining seat. The old splash (slices of the fishing recordings)
  played at a tenth of a hit, too quiet to be heard as anything.
- **Points spent** (sent with it, "for after applying skill stat points"):
  the owner's level-up chime once the worker confirms points spent in the
  Points window, one for a whole batch.

The long loops are never decoded with the effects: each is loaded where it
plays, at 24 kHz, and let go when you leave (game/ambientBeds.js). Two files
named twice in the effects list (fish-on-hook, lure-drop) are now decoded
once, about 1 MB back.

## Still needed: new recordings

Get them from Pixabay, or Freesound as CC0 or CC BY. Never CC BY-NC.

| Sound | For | Notes |
|---|---|---|
| **A tired breath** | a sprint running out of stamina, turn about with the grunt -- the owner, 2026-10-18: "Maybe alternate between grunt and tired breath" | until then running dry plays the owner's grunt alone, worn out (v2.3.3455); a breath made in code is out (v2.3.1103) |
| **Creature voices** | each kind's idle, an "it noticed you" call and a hurt grunt | the fire goblin, the mummy's skeleton, the slimes and the snowman have one (v2.3.3340); the rock monster, thorn shambler, fishman, bog lurker, mire wisp and mummy still have none -- and so the Pebbling, Finling, Wisplet, Lurkling and Mumling pets come out without a voice |
| **The other lands' air** | Frost Ridge, the Stone Hollows (cave drips), the Electric Foundry, the Water Caves, the Poison Forest | the Wind Dunes, the Verdant Wilds and the Flame Fields have theirs (v2.3.3457); one loop each, 10-20 s, goes under ZONE_AMBIENT |
| **The town's buildings** | the Saloon's piano and chatter, the Old Mill's water wheel | the forge's anvil is done (v2.3.3434) |
| **Leaf-litter footsteps** | the forest floor | plays grass today |
| **Music for four lands** | Stone Hollows, Electric Foundry, Water Caves, Poison Forest | they play the login theme. `world.mp3` was offered as a stopgap and the owner said no (2026-10-06) |

## Quiet on purpose, the owner's call

- The chat's **/roll and /flip** (v2.3.3393) play Ace's coin clip at his own
  toss's level (`AceFlipPanel.jsx` TOSS_OPTS, since v2.3.2621): about a
  twentieth of a hit, which a phone may not carry over the music. Bringing all
  three up is one number each; `mp-cuelevels` lists them every run.

## Still needed: more than a sound

- **Big monsters' footsteps** (rock monster, thorn shambler, fishman, bog
  lurker). The stone step slowed down would do, but it has to land on each
  creature's own foot plant, and their walk strips do not say which frame
  that is. A step out of time with the feet sounds worse than none.
- **Your blow on a player who blocks it** plays the flesh hit at contact, then
  their shield's clang when the worker answers (v2.3.3343). Waiting for the
  answer before any sound would make every hit on a player sound late.
- **Mining miss** is no longer a gap: a harvest's grade is always perfect, ok
  or good now (lifeSkillRewards.js), so the "Miss!" it would have sounded for
  never happens (found v2.3.3434).
