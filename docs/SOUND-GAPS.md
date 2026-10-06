# Missing sound effects (audit, v2.3.3023)

> Owner, 2026-10-04: *"Give me a list of missing sound effects. Some I thought
> of is jumping, landing (from jumping). Monster noises, monster projectiles
> thrown and destructing, etc."*

What every game event sounds like today, and what plays nothing, read from the
code at v2.3.3023. **Nothing here has been built yet.** It is a list to choose
from. Each row names where a sound would go, and what could make it.

## Two things to know first

- **Only recordings.** The owner removed every sound the code made up
  (v2.3.1103: synthesised audio was "worse than nothing"). `BT_AUDIO.beep()` is
  an empty function since then, so every event that only called it is silent:
  `collect`, `deathBoom`, `npcChat`, `enterBuilding`, `chatSend`/`chatReceive`,
  `emote`, the old `levelUp`, `playerDeath`, `join`, about 300 calls in all.
  New sounds are slices of the recordings the game ships (`public/sfx/`,
  `public/audio/`) or new recordings (Freesound CC0 or CC BY, or Pixabay). A
  CC BY-NC recording is never used (CREDITS.md).
- **The sound system is reachable both ways.** `BT_AUDIO` is imported where
  it is used and also put on the window (`Object.assign(globalThis, DATA)`,
  BroTown.jsx). The Wheel's ground footsteps load behind its loading screen
  (worldTrial.js). So the footsteps, mining and chopping strikes, the cooking,
  reeling and river loops and the slime splat all play. (An automated reading
  claimed they were dead. The built game, checked in Chromium, has
  `window.BT_AUDIO`: TRAPS §133.)

"Silent" below means the event calls an empty synth helper. "None" means it
calls nothing.

## 1. In a fight: the ones you'd notice first

| Event | Today | What could make it | Where it goes |
|---|---|---|---|
| **Jump take-off** | one footstep of the ground under you | a push-off: a quiet slice of `special-swipe` (as the sprint's push-off), plus the step | `src/game/jumpActions.js:75` |
| **Jump landing** | one footstep (a splash in water) | a heavier landing: the ground's step louder, plus a low thud (`monster-hit` slowed down); a new "landing on dirt" recording would be best | `jumpActions.js:105` |
| **Shield blocks a monster's hit** | none in real play (only "Blocked!") | `shield-block.mp3`, already in the game, played only by the old single-player path | `src/networking/gameEvents.js`, beside the "Blocked!" popup (about line 2757) |
| **Your death** | silent | new recording preferred; stopgap a slowed `skeleton-death` under `monster-hit` | `src/networking/wsClient.js:2272`, `src/ui/BroTown.jsx:4503` |
| Respawn | none (the music restarts) | a soft swell (`whirlwind` slice) | `src/game/respawn.js` |
| Dodge roll | none | a `special-swipe` slice and a step | `src/game/dodge.js:126` |
| Raise / lower shield | silent / none | `equip.mp3` (leather and buckle) or a quiet `shield-bash` slice | `src/game/shieldToggle.js:103`, `:115` |
| Critical hit | none | `sword-hit.mp3` (kept for the old grand slam) | `gameEvents.js:2283`, `monsterCombat.js:2254` |
| Low-HP heartbeat | silent | new recording preferred; stopgap `monster-hit` slowed, twice | `src/game/monsterCombat.js:1265` |
| Parry | silent | the bright `sword-hit2` clang | `gameEvents.js:943` |
| **Bow draw** | none: `bow-pullback.mp3` is in the game and never played | `bow-pullback.mp3` | `monsterCombat.js:1762`, before the release |
| Bow and staff specials | the sword's whoosh | bow: draw + release; staff: a slowed `magic-cast` + `magic-hit2` | `src/game/playerActions.js:583` |
| Staff's retreat shot | the arrow's whoosh | `magic-cast` | `dodge.js:337` |
| Whirlwind | plays, but peaks about 1.4 s after the swing lands | start `whirlwind.mp3` later in the clip | `src/game/abilities.js:604` |
| Element Burst / nova | silent / none | `magic-cast` + a `whirlwind` slice + `magic-hit` | `playerActions.js:658`, `gameEvents.js:979` |
| A status wearing off | none | a soft tick | `src/game/elemHits.js` |
| "No mana!", "Swimming!", "Dazed!" and other refusals | none (popups only) | one soft "denied" tick (new), or the start of `flip-lose` | `combatHelpers.js:666-698`, `dodge.js:64`, `playerActions.js:221` |

## 2. Monsters (the owner's "monster noises")

| Event | Today | What could make it | Where it goes |
|---|---|---|---|
| **Monster throws a ball** (snowball, fireball, goo) | none for all three | snowball: a low `swing-c` whoosh; fireball: a slowed `magic-cast` + the start of `pan-sizzle`; goo: a low `lure-drop` | `gameEvents.js:2014` (the throw) or `:2061` (the ball), quieter with distance (`hitSounds.earVol`) |
| Monster's ball breaks | plays: fireball sizzle, snowball crunch, goo squelch (v2.3.3001) | (done) | `src/game/projectiles.js:679` |
| Idle sounds | only the plain slime's gurgle | slime family: `slime-idle.mp3` too; everything else needs new recordings (growls, chitter, crackle) | `src/game/slimeAudio.js:50` |
| Notices you (aggro) | none | new recordings (one short call per creature) | the first wind-up aimed at you, `gameEvents.js:1276` |
| Slam / pounce / lunge warning | silent | new growls preferred; stopgap a `whirlwind` swell | `gameEvents.js:1349` |
| Slam landing | silent | a low `tree-fall` or slowed `shield-bash` | `gameEvents.js:1367` |
| Blue slime swelling to burst | silent | a stretched `slime-idle` | `gameEvents.js:1194` |
| Snow-pile burrow | none | the snow footstep, low | `gameEvents.js:1199` |
| Being hit | plays: the monster's material (v2.3.3001); no vocal grunt | grunts need new recordings | `src/game/hitSounds.js` |
| **Death** | snowman and skeleton have their own; **every other creature plays the same bony crunch** | slimes, mire wisp: `slime-death-v2.mp3` (in the game); rock monster, thorn shambler, brute: a slowed `skeleton-death` + `mine-strike`; fishman: `catch-splash` + `monster-hit`; fire goblin: `monster-hit` + a sizzle | `src/data/gameDisplay.js:3786` (`monsterDeath`) |
| Spawn | none | slimes: a `lure-drop` plop | `src/rendering/systems/entityRenderer.js:8240` |
| Mummy turns into a skeleton | none | a `skeleton-death` slice | `gameEvents.js:2096` |
| Boss phases (warning, slam, charge, summon, enrage) | silent | new recordings (a roar, a horn) | `monsterCombat.js:573-716`, `gameEvents.js:1399-1444` |
| Footsteps of big monsters | none | the stone or gravel step, slowed | |

## 3. The world, and gathering

| Event | Today | What could make it | Where it goes |
|---|---|---|---|
| **Water**: sea, surf, river | none | `river-water.mp3` (in the game, used only while fishing) near the river; the sea needs a surf recording | per frame, from `wheelWaterAt` / the water field |
| **Each land's own music and wind** | the login theme plays everywhere in the Wheel | the old lands' tracks (`frost`, `fire`, `forest`, `desert`) and the dunes' wind are in the game, unheard since the Wheel; play them by land | `startZoneAmbient`, `gameDisplay.js:2500`, with `wheelHere` |
| Town ambience | music only | a town-crowd recording (new) | |
| The buildings' life (forge sparks, smoke) | none | an occasional `mine-strike` clink by the forge | `src/rendering/wheelLife.js` |
| An object mended | none | a soft `wood-chop` knock | `src/game/wheelBreak.js:180` |
| Mining success | **done v2.3.3040**: `ore-crack`, the third crack of `extract-success.mp4`, played on the break strip's split frame | `effectsRenderer.js` `_advanceOreBreaks` |
| Mining miss | silent | `extract-fail.mp4` has sound to cut, or a slowed `skeleton-death` (rubble) | `src/game/lifeSkillRewards.js` `applyMiningReward` |
| Burnt cooking | none | a `pan-sizzle` slice + `flip-lose` | `lifeSkillRewards.js:677` |
| Starting a harvest | silent | a single `mine-strike` or `axe-chop` | `lifeSkillRewards.js:208` |
| Node used up / grows back | silent / none | a soft pop | `wsClient.js:2321`, `src/rendering/wheelNodes.js` |
| Crafting results (smithing, woodwork, gems, enchanting) | silent | `mine-strike` (anvil), `axe-chop`, a high `sword-hit2` glint, `magic-cast`; failures `flip-lose` | `SmithyPanel.jsx:160`, `WoodworkPanel.jsx`, `GemcutPanel.jsx`, `EnchantPanel.jsx` |
| Dungeon: enter, wave, boss, cleared, leave | silent | `whirlwind` slices in and out, `quest-complete` when cleared; a horn or drum for waves (new) | `wheelDungeons.js:146`, `gameEvents.js:802-873`, `zoneTransitions.js:1418` |
| Changing zone | none (the music changes) | a short `whirlwind` slice | `zoneTransitions.js:789` |
| Lighting a campfire, resting | silent | the start of `pan-sizzle` | `BroTown.jsx:6050`, `:5092` |
| NPCs talking | silent | voice blips (new); the Mayor's spoken welcome (`public/intro/mayor-welcome.mp4`) is in the game, unreachable | `BroTown.jsx:6644`, `:10726` |

## 4. Loot, quests and menus

| Event | Today | What could make it | Where it goes |
|---|---|---|---|
| Loot drops | none | a short `coin-flip` / `coin-pickup` slice | `gameEvents.js:186` |
| Picking up anything but coins (shards, gems, armour, weapons) | silent | `equip.mp3`; a gem a high glint | `wsClient.js:3035-3185` |
| Quest accepted | silent | the start of `quest-complete.mp3` (now only a fallback) | `src/game/quests.js:59` |
| Quest objectives done ("Return to...") | silent | a `quest-complete` slice | `src/game/questComplete.js:96` |
| Achievement | none | `quest-complete.mp3` | `BroTown.jsx:7942` |
| Buying from a shop | none | `coin-pickup` | `gameEvents.js:370` |
| Eating, drinking a potion | silent / none | new recordings (munch, gulp) | `BroTown.jsx:8542`, `ItemDetailPopup.jsx:1304` |
| Chat, emotes | silent | a soft pop (new) | `src/game/chat.js` |
| Mail, invites, announcements, trades, market | silent | a chime (new); stopgap the first note of `flip-win` | `gameEvents.js:1540`, `:1701`, `:3284-4093` |
| Gambling, arena, duel results | silent | `flip-win` / `flip-lose` (in the game) | `gameEvents.js:587-684`, `:3252-3816` |
| Weapon swap | silent | `equip.mp3` | `BroTown.jsx:8618` |

## 5. Other players

Almost nothing they do is heard. Only their hits on monsters (a quiet echo),
their shots hitting objects, and their hits on you make a sound. **None** for
their footsteps, sprints, jumps, swings, shots, shield, rolls, getting hit or
dying.

They could play your own sounds, quieter with distance (`hitSounds.earVol`):
`entityRenderer.js:10882`, `gameEvents.js:1718-1927`.

## Quick wins: recordings already in the game

1. The shield's block in real play (`shield-block.mp3`).
2. The bow's draw (`bow-pullback.mp3`, never played).
3. Each creature its own death: the slime family `slime-death-v2.mp3`.
4. The monsters' throws (slices of `swing-c`, `magic-cast`, `pan-sizzle`,
   `lure-drop`).
5. Jump push-off and a heavier landing.
6. Critical hits (`sword-hit.mp3`).
7. Each land's music and wind, and `river-water.mp3` by the river.
8. Mining's success and miss (cut from the two unused videos).

## Needs new recordings (CC0 or CC BY; never NC)

- creature voices: an idle, a "notices you" and a hurt grunt for each kind;
- the player's hurt grunt, death and heartbeat;
- eating and drinking;
- a soft UI pop, a notification chime and a "denied" tick;
- an explosion, and a horn or drum for dungeon waves;
- surf, and a town crowd;
- NPC voice blips.
