# The switch table

MADE by `node tools/guards/switches.test.mjs --write` from `tools/guards/lib/switches.mjs`. Never edit it by hand:
`tools/guards/switches.test.mjs` fails a page that is not what the table makes. The rules are
`docs/specs/switch-table.md` (grand plan step 7.1, card T).

Every switch of the game, one row a name: every live flag the worker reads (set from the Test panel, `liveops.js`)
and every `?name=` the page reads. **Where** each is read is the scanner's (`tools/guards/lib/switchScan.mjs`), not
this page's: `node tools/guards/switches.test.mjs --where <name>` prints it.

- **name**: as it is thrown. A live flag by its name (`farm`); a page switch with its `?`; a memory saver by its id
  (`sfxcache`: `off_sfxcache` on the worker and `?sfxcache=0` on the page are one row).
- **kind**: `switch` (a way of the game turned off or on), `value` (a number to try) or `lever` (a test's or the owner's tool).
- **born**: the change that made it (v2.3.N). **on**: the day its way went on for everyone (a switch's; `off`: an opt-in,
  not on for everyone yet; the change that turned it on, where it is not its birth). **thrown**: what throws it (on the
  worker the value; on the page its form).
- **risk**: what the old way guards against: `logic`, `memory`, `chip` (`none` for a lever). **needs**: the switches it
  turns off with. **fallback**: the trigger that still uses its old way, or no.

**Out of reach** (no row, said here): the QA pages (`src/*-harness.html`, `public/tools/`), the phone scenarios' own
addresses (`tools/qa/`), `localStorage` toggles, and the worker's `env` settings. A cap is a row only where the worker
reads it as a flag or a comment promises it as a kill switch; any other cap's override is the emergency lever of
`docs/specs/liveops.md` ("Caps override").

How many there are: `node tools/guards/switches.test.mjs` prints the count, and `node tools/dev/scoreboard.mjs` its row.

## art

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `?bodyworker` | page | switch | v2.3.4930 | 2026-11-12 | =0 | logic |  | no | Bodies are baked on the page, not on the bake worker. |
| `?figround` | page | switch | v2.3.2922 | 2026-09-24 | =1 | chip |  | no | The old per-sprite pixel snap comes back. |
| `?garmentspecks` | page | switch | v2.3.3658 | 2026-10-27 | =0 | logic |  | no | A garment's specks are drawn the old way (and the body bake goes back to the page). |
| `?sharp` | page | switch | v2.3.2741 | 2026-09-24 | =0 | chip |  | no | Pictures are not routed to sharp pixels. |
| `?stripgentle` | page | switch | v2.3.4400 | 2026-11-10 | =0, off, false | logic |  | no | Strips are packed in one go, not a slice at a time. |
| `?stripslice` | page | lever | v2.3.4400 |  | a number of ms | none |  | no | QA: a fixed slice for strip packing (a phone's, on a slow box), in place of the lane's `queue` ms (v2.3.5230). |
| `?stripworker` | page | switch | v2.3.4450 | 2026-11-10 | =0, off, false | logic |  | no | Every strip is unpacked on the page, not the worker. |

## audio

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `?audioreset` | page | switch | v2.3.5203 | 2026-11-14 | =0 | logic |  | no | The balls' ends are kept across a change of place again (hitSounds.js forgetShotEnds no longer runs at the zone door). |
| `?foldgentle` | page | switch | v2.3.5045 | 2026-11-14 | =0, off, false | logic |  | no | A sound is folded to mono in one go again, not in turns between frames. |
| `?nobeds` | page | switch | v2.3.3462 | 2026-10-18 | present | logic |  | no | No ambient sound beds (sea, crowd, fire). |
| `?noforge` | page | switch | v2.3.3434 | 2026-10-18 | present | logic |  | no | No forge sounds in the town. |
| `?sfxahead` | page | switch | v2.3.5006 | 2026-11-13 | =0, off | memory |  | no | The four level sounds are pinned again, not loaded a level ahead. |
| `sfxcache` | both | switch | v2.3.3714 | 2026-10-28 | off_sfxcache: true; ?sfxcache=0, off | memory |  | no | Sounds are held whole again, not only while needed. |
| `?sounds` | page | lever | v2.3.3523 |  | present | none |  | no | Opens the Sound Studio once the world is up. |
| `voicecap` | both | switch | v2.3.3727 | 2026-10-28 | off_voicecap: true; ?voicecap=0, off | memory |  | no | A crowd of one sound plays every voice again, not a few. |

## bots

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `blockarc` | worker | switch | v2.3.4605 | 2026-11-10 | false | logic |  | no | A raised shield blocks all round again, not only in its arc. |
| `botrecordkeep` | worker | switch | v2.3.4379 | 2026-11-10 | false | logic |  | no | The bot fingerprint records go back to the old eviction of anyone, online or not. |
| `botscoresave` | worker | switch | v2.3.5910 | 2026-11-18 | false | logic |  | no | Thrown, a rise of the bot fingerprint score is written only at the five-minute pace again, so a deploy between writes forgets it (card LG's league: the page at machine pace passed through one). |
| `botsig_reverify` | worker | switch | v2.3.3724 | off | true | logic |  | no | Thrown, a join from an account the bot signals flagged must pass the account check again. |
| `cookshield` | worker | switch | v2.3.4605 | 2026-11-10 | false | logic |  | no | The cook and fire shield holds on the move's edge alone, without the worker's own fire. |
| `disable_botsig` | worker | switch | v2.3.3724 | 2026-10-29 | true | logic |  | no | Thrown, the bot signals are not judged at all. |
| `hitproof` | worker | switch | v2.3.3334 | 2026-10-18 | false | logic |  | no | A hit claim is taken as before, without the weapon, reach and pace checks. |
| `parryrearm` | worker | switch | v2.3.4605 | 2026-11-10 | false | logic |  | no | Every raise parries again, however soon after the last. |
| `swingguard` | worker | switch | v2.3.4605 | 2026-11-10 | false | logic |  | no | A sword's claim leaves the guard as it was. |

## combat

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `accuracy` | worker | switch | v2.3.4480 | 2026-11-10 | false | logic |  | no | Counts no hits for the accuracy record, answers its asks with off and un-advertises the cap (what is stored stays). |
| `areachoice` | worker | switch | v2.3.3528 | 2026-10-20 | false | logic |  | no | The PvP area rule counts a blow either way, not only one you landed. |
| `arrowlane` | worker | switch | v2.3.5540 | 2026-11-14 | false | logic |  | no | Arrows and bolts are back on the plain 210 ms floor: an archer who steps in between shots loses an arrow that lands too soon after the last. |
| `bigorb` | worker | switch | v2.3.2849 | 2026-09-24 | false | logic |  | no | Un-advertises the staff's big orb: a phone that joins after fires the old three orbs, with no blast. |
| `?bowfeel` | page | switch | v2.3.4802 | 2026-11-11 | =0 (remembered; =1 forgets) | logic |  | no | The bow's old flick, not its draw, on this device. |
| `bowpath` | worker | switch | v2.3.5904 | 2026-11-18 (v2.3.5906) | false | logic | `bowshot` | no | ON since v2.3.5906 (the owner, 2026-11-18: "Go recommended for anything waiting on me"; card K4 PR 7); thrown (`bowpath: false`), a bow claim is no longer held to its arrow's line and flight time, caps.bowPath is withdrawn so a phone relays its arrow at fire again, and a claim with no arrow seen keeps only what `bowreach` gives it. |
| `bowreach` | worker | switch | v2.3.5901 | 2026-11-18 | false | logic | `bowshot` | no | ON (decided for the owner while away, 2026-11-18: card K4 PR 2); thrown (`bowreach: false`), a bow's claim on an arrow seen lands from wherever the archer stands now (the hit test's reach, a second of the run on top), and a claim with no arrow seen takes only bowshot's allowance, as before. |
| `bowshot` | worker | switch | v2.3.5550 | 2026-11-17 | false | logic |  | no | ON since v2.3.5727 (decided for the owner while away, 2026-11-17: "For all decisions waiting on me just go recommended."); thrown (`bowshot: false`), an ordinary bow claim lands without an arrow seen, as before: five claims a second on anything in the bow's reach. |
| `bowvolley` | worker | switch | v2.3.2808 | 2026-09-24 | false | logic |  | no | Un-advertises the bow's volley: a phone that joins after fires the old single arrow and blast. |
| `?combatreset` | page | switch | v2.3.5206 | 2026-11-14 | =0 | logic |  | no | A fight you picked, a roll or a lunge, the hit marks on the ground, a kill's XP still waiting and another player's damage numbers still queued carry over a change of place again, each ending on its own clock or its own check, not at the zone door. |
| `disable_threats` | worker | switch | v2.3.1150 | 2026-07-03 | true | logic |  | no | Thrown, every relayed threat handshake is dropped. |
| `duelpace` | worker | switch | v2.3.5805 | 2026-11-17 | false | logic |  | no | Every duel challenge is relayed (the relay bucket its only bound), to anyone, muted or not, and a decline of nothing with its reason, as before (S1, S4). |
| `elemup` | worker | switch | v2.3.3518 | 2026-10-20 | false | logic |  | no | Un-advertises the element bonus and takes it away. |
| `fightdoor` | worker | switch | v2.3.5538 | 2026-11-17 | false | logic |  | no | A fight clock can be written under an id that is no string, as the lines before the fight door could have; every caller passes a session's id. |
| `fightlockarmor` | worker | switch | v2.3.4582 | 2026-11-11 | false | logic |  | no | Armour put on or taken off in a fight is no longer refused. |
| `fightlockdoor` | worker | switch | v2.3.4510 | 2026-11-10 | false | logic |  | no | A dungeon's mouth and the party pull are no longer locked in a fight. |
| `fightlockequip` | worker | switch | v2.3.4510 | 2026-11-10 | false | logic |  | no | A spare weapon or shield put on in a fight is no longer refused. |
| `fightlockreset` | worker | switch | v2.3.4581 | 2026-11-11 | false | logic |  | no | A character's restart is no longer refused while the fight lock holds. |
| `fightlocktable` | worker | switch | v2.3.4510 | 2026-11-10 | false | logic |  | no | Forging, duels and the other ways to turn goods into what the loss does not take are no longer refused in a fight. |
| `freeswing` | worker | switch | v2.3.4520 | 2026-11-10 | false | logic |  | no | No phone gets the free swing; every phone is told. |
| `freeswingbonus` | worker | switch | v2.3.4520 | 2026-11-10 | false | logic |  | no | The free swing never pays its timing bonus. |
| `gearheld` | worker | switch | v2.3.5715 | 2026-11-17 | false | logic |  | no | A described armour or legs piece is worn whether or not the worker holds it, and a captured record's join merges the phone's armour and legs claims, as before. |
| `guarddoor` | worker | switch | v2.3.5536 | 2026-11-17 | false | logic |  | no | A raise is written while the guard break's latch is live, as the lines before the guard door could have; movement.js and the sparring clone still check the latch first. |
| `?guarddoor` | page | switch | v2.3.5521 | 2026-11-16 | =0 | logic |  | no | Your shield on the phone takes any raise or drop its own code asks again (a raise over a raised one, with no shield or in the cooldown, a drop of none), as the lines before the page door could have; raiseShieldToggle and dropShield still check each first. |
| `killroll` | worker | switch | v2.3.3209 | 2026-10-13 | false | logic |  | no | Every drop on its own roll again, nothing sent over the monster. |
| `?manual` | page | value | v2.3.4357 |  | =0 to =5 (remembered on the device) | logic |  | no | Picks the combat mode on this device: 0 the old, 1 to 4 the manual trials, 5 the two buttons (v2.3.6540, card CT). |
| `monsterguardbreak` | worker | switch | v2.3.4393 | 2026-11-10 | false | logic |  | no | A monster's hit on no stamina no longer breaks the guard. |
| `monsterhold` | worker | switch | v2.3.3513 | 2026-10-20 | false | logic |  | no | The element hold rule off: monsters move as before real gems. |
| `mummyroar` | worker | switch | v2.3.3621 | 2026-10-27 | false | logic |  | no | Mummies swing as before, without the roar. |
| `nostatcap` | worker | switch | v2.3.3578 | 2026-10-23 | false | logic |  | no | Un-advertises the lifted stat bound and brings the old per-level bound back. |
| `oneformula` | worker | switch | v2.3.3260 | 2026-10-15 | false | logic |  | no | The combat from before the one formula: old health, hits, specials and PvP. |
| `perfectbow` | worker | switch | v2.3.4550 | 2026-11-11 | false | logic |  | no | The bow as before its perfect strike (the sword's unchanged). |
| `pvpbalance` | worker | switch | v2.3.3260 | 2026-10-15 | false | logic | `oneformula` | no | The PvP resolver exactly as before: the phone's claim x 0.5, the 300 ms lane. |
| `pvpbrew` | worker | switch | v2.3.3133 | 2026-10-07 | false | logic |  | no | Un-advertises the brew in PvP: a new page folds it into its claims as before. |
| `pvpextras` | worker | switch | v2.3.3264 | 2026-10-15 | false | logic | `oneformula`, `pvpbalance` | no | Takes every PvP extra off players at once. |
| `pvplunge` | worker | switch | v2.3.3262 | 2026-10-15 | false | logic |  | no | No lunge at a player: caps.pvplunge false and the dazed gates off. |
| `?shieldaim` | page | value | v2.3.3845 |  | =mouse | logic |  | no | On a computer, the shield's guard always follows the pointer. |
| `shieldclaim` | worker | switch | v2.3.5812 | 2026-11-18 | false | logic |  | no | A join merges the phone's shield and cosmetic claims whatever they are (shape-checked only), as before (SEC-F2: a modified phone can give a character a shield the worker never handed out). |
| `shieldgem` | worker | switch | v2.3.3187 | 2026-10-12 | false | logic |  | no | Un-advertises the shield gem and refuses every ask. |
| `shieldwear` | worker | switch | v2.3.3091 | 2026-10-06 | false | logic |  | no | Un-advertises shield wear, ignores every report, and No man's land takes no shield on a loss. |
| `shockspark` | worker | switch | v2.3.3518 | 2026-10-20 | false | logic |  | no | Un-advertises the storm gem's spark and sparks nothing. |
| `slimeshove` | worker | switch | v2.3.3747 | 2026-10-28 | false | logic |  | no | No slime shove. |
| `soakhit` | worker | switch | v2.3.3518 | 2026-10-20 | false | logic |  | no | A soaked monster hits as hard as a dry one, and the cap is off. |
| `?stafffeel` | page | switch | v2.3.4803 | 2026-11-11 | =0 (remembered; =1 forgets) | logic |  | no | The staff's old cast, not its gather, on this device. |
| `?swingbonus` | page | switch | v2.3.4520 | 2026-11-10 | =0 (remembered; =1 forgets) | logic |  | no | The free swing without its perfect-strike bonus on this device. |
| `swordconvert` | worker | switch | v2.3.3895 | 2026-10-30 | false | logic |  | no | Stops the sword conversion's boundary heals and the Forge's mapping. |
| `?swordfeel` | page | switch | v2.3.4800 | 2026-11-11 | =0 (remembered; =1 forgets) | logic |  | no | The sword's look before its feel (no dimming, glint, arc or weight), on this device. |
| `swordswing` | worker | switch | v2.3.5548 | 2026-11-17 | false | logic |  | no | ON since v2.3.5551 (the owner, 2026-11-17: "Go recommended"); thrown (`swordswing: false`), a sword is judged as before: a claim from 400 px, on each monster every 210 ms, its `noKb` believed. |
| `weapongem` | worker | switch | v2.3.3513 | 2026-10-20 | false | logic |  | no | Un-advertises the weapon gem, refuses every ask, and the fight goes back on the claimed element. |
| `whirlWindup` | worker | switch | v2.3.2820 | 2026-09-24 | false | logic |  | no | The whirlwind is instant again, with no wind-up. |
| `xp_mult` | worker | value | v2.3.1150 |  | a number, 1 to 4 | logic |  | no | Multiplies kill XP (the 2x weekend lever), 1 to 4. |
| `?xpfly` | page | switch | v2.3.3893 | 2026-10-30 | =0 | logic |  | no | A kill's XP does not fly to the bar. |

## data

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `?burstnumbers` | page | switch | v2.3.5004 | 2026-11-13 | =0 | memory |  | DecompressionStream in src/rendering/levelUpBurstNumbers.js | The level-up burst plays from its picture strip, not its colour numbers. |
| `?musicdecode` | page | switch | v2.3.3073 | 2026-10-06 | present | memory |  | _deckFailed in src/data/gameDisplay.js | Music is decoded whole again, not streamed through the music deck. |
| `?nolandmusic` | page | switch | v2.3.3064 | 2026-10-06 | present | logic |  | no | One track everywhere in the world (the game's theme), not each land's own music. |
| `soundgate` | both | switch | v2.3.3800 | 2026-10-29 | off_soundgate: true; ?soundgate=0, off, false, no | logic |  | no | The world's sound plays under the loading screen again. |
| `?stepvol` | page | value | v2.3.3470 |  | a number: the footsteps' loudness on a computer | logic |  | no | Sets how loud a computer's footsteps play (in place of 2.5). |
| `?stereosfx` | page | switch | v2.3.3706 | 2026-10-28 | present | memory |  | no | Sound effects are kept stereo, not folded to one channel. |

## debug

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `?debug` | page | lever | unknown |  | =1 | none |  | no | Opens the debug console on load. |
| `?dev` | page | lever | v2.3.222 |  | =1 | none |  | no | The owner's developer view: crash banners, the dev panels and their buttons. |
| `?nodebug` | page | lever | unknown |  | =1 | none |  | no | Turns the debug overlay off for this browser (forgets it). |
| `?perf` | page | lever | v2.3.324 |  | =1 | none |  | no | Shows the performance HUD. |
| `?report` | page | switch | v2.3.5122 | 2026-11-14 | =0 | logic |  | no | This phone sends no field report. |

## desktop

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `?dbltap` | page | switch | v2.3.3711 | 2026-10-28 | =0 | logic |  | no | A double tap of a key no longer rolls. |
| `?deskwide` | page | switch | v2.3.3687 | 2026-10-28 | =0, off, false | logic |  | no | On a computer, the narrow column, not the whole window. |
| `?guidearrow` | page | switch | v2.3.3925 | 2026-11-03 | =0 | logic |  | no | On a computer, no guiding arrow for a new player. |
| `?narrow` | page | switch | v2.3.3687 | 2026-10-28 | present | logic |  | no | On a computer, the narrow column (the same as ?deskwide=0). |

## device

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `?ladderpix` | page | switch | v2.3.5225 | 2026-11-14 | =0, off, false | chip | `govern` | no | The pixel rungs are off: every pixel the screen and the budget allow, whatever the rung. |
| `?lane` | page | lever | v2.3.5221 |  | =full, =light or =thirty | none |  | no | This page draws in the named lane, whatever its device's facts pick. |
| `lookpalette` | both | switch | v2.3.3716 | 2026-10-28 | off_lookpalette: true; ?lookpalette=0 (=1 builds it anyway) | chip |  | onWindows, onMac (v2.3.5228: the look's overrides, drawLanes.js) in src/game/deviceProfile.js | Each look's copy is baked on first sight again, not coloured on the chip. |
| `?phoneres` | page | switch | v2.3.6503 | 2026-11-24 | =0 | chip |  | no | A phone draws at its screen's own ratio again (3 canvas pixels a CSS pixel on an iPhone), not the owner's 1.5; the pixel rungs take it lower as before. |
| `?pixbudget` | page | switch | v2.3.5140 | 2026-11-14 | =0 (off), or a number: the budget to try | chip |  | no | The drawing resolution is no longer held to the pixel budget. |
| `?res` | page | value | v2.3.3339 |  | a number: the drawing resolution | chip |  | no | Sets the drawing resolution by hand. |
| `?speedms` | page | lever | v2.3.3339 |  | a number of ms | none |  | no | The Speed test measures for this long, not 4 s. |
| `viewcap` | both | switch | v2.3.4054 | 2026-11-03 | off_viewcap: true; ?viewcap=0 (=1 forces it) | logic |  | no | A wide screen sees its old wider view of the world. |
| `?zoom` | page | value | v2.3.2997 |  | a number | chip |  | no | Sets how far out the camera sees (in place of the view cap's). |

## economy

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `ahonewrite` | worker | switch | v2.3.4500 | 2026-11-10 | false | logic |  | no | An auction-house listing goes back to its old two writes, restart hole and all. |
| `armorstashlive` | worker | switch | v2.3.4840 | 2026-11-11 | false | logic |  | no | The armour stash list goes back to being sent only at the join. |
| `bank` | worker | switch | v2.3.3785 | 2026-10-29 | false | logic |  | no | Un-advertises the bank and refuses every deposit and withdrawal; what is in a vault stays and still shows. |
| `bankretry` | worker | switch | v2.3.5702 | 2026-11-17 | false | logic |  | no | A vault whose put the storage refused is no longer written with the character's next save, nor kept to the leave's save, and the bank no longer answers `paused` for it (a withdrawal then may stand twice, a deposit in neither). |
| `capeoffkept` | worker | switch | v2.3.5422 | 2026-11-14 | false | logic |  | no | A cape taken off is kept in memory only again, so it is worn again after a rejoin or a deploy. |
| `dailyChest` | worker | switch | v2.3.2820 | 2026-09-24 | false | logic |  | no | Un-advertises the daily chest and pays the day's reward as plain gold again (a chest in a bag waits). |
| `dailyquests` | worker | switch | v2.3.3140 | 2026-10-07 | true | logic |  | no | Thrown (true), the put-away daily quests come back: counting, rerolls and claims. |
| `dailyspin` | worker | switch | v2.3.3140 | 2026-10-07 | false | logic |  | no | Un-advertises the daily spin and refuses every spin (nothing taken away). |
| `deathpilesave` | worker | switch | v2.3.4384 | 2026-11-10 | false | logic |  | no | A death pile gets no stored row (piles in memory only, as before); rows already written are still cleaned up. |
| `dice` | worker | switch | v2.3.3393 | 2026-10-18 | false | logic |  | no | No dice roll, and caps.dice false at a phone's next join (/roll is a plain line again). |
| `disable_event_capes` | worker | switch | v2.3.2028 | 2026-08-27 | true | logic |  | no | Thrown, the event's capes stop dropping. |
| `disable_offer_sweep_all` | worker | switch | v2.3.4412 | 2026-11-10 | true | logic |  | no | Thrown, the store's offer sweep goes back to the old first-20 pass. |
| `?droplines` | page | switch | v2.3.3627 | 2026-10-27 | =0 | logic |  | no | No drop lines in the chat for what a kill drops. |
| `duelonewrite` | worker | switch | v2.3.5805 | 2026-11-17 | false | logic |  | no | A duel's pot is paid in one write and its escrow record deleted in the next, as before (MS-6: a restart between leaves a record only the pot's stamp explains). |
| `dyingkeep` | worker | switch | v2.3.5803 | 2026-11-17 | false | logic |  | no | Goods credited to a player in the dying seconds are wiped by the respawn, as before (MS-3: a trade confirmed after a death pays and keeps nothing). |
| `econ` | worker | switch | v2.3.5085 | 2026-11-14 | false | logic |  | no | Nothing is counted into a character's minted and burned (`_econ`) or the day's book's economy part; gold and items move as before. |
| `econresetput` | worker | switch | v2.3.5094 | 2026-11-14 (v2.3.5095) | false | logic |  | no | A character's restart with nobody in the room no longer writes today's book at once: the owner's card may read it as a loss until a later count. On since v2.3.5095 (the owner's yes; one put a restart in an empty room). |
| `?equipredraw` | page | switch | v2.3.5046 | 2026-11-14 | =0 | logic |  | no | A change of worn gear is set all at once again, not in pieces a frame apart. |
| `event_cape_rate` | worker | value | v2.3.2027 |  | a number | logic |  | no | The event cape's drop rate, a number in place of the shipped one. |
| `gearlevel` | worker | switch | v2.3.3544 | 2026-10-21 | false | logic | `onelevel` | no | Armour, shields and amulets ask Defense points and Magic again, not your level. |
| `gearresend` | worker | switch | v2.3.4386 | 2026-11-10 | false | logic |  | no | The level gate's refusal is silent again (no gear sent back). |
| `giftclosed` | worker | switch | v2.3.4375 | 2026-11-10 | false | logic | `trade2` | no | The old one-way gift opens again beside the trade window. |
| `goldlog` | worker | switch | v2.3.4903 | 2026-11-12 | false | logic |  | no | The gold log notes nothing. |
| `goldonesum` | worker | switch | v2.3.4803 | 2026-11-11 | false | logic |  | no | Every gold road goes back on its step-1 sum. |
| `itemdrop` | worker | switch | v2.3.3473 | 2026-10-18 | false | logic |  | no | Dropping an item on the ground is refused (off). |
| `jackcheck` | worker | switch | v2.3.5813 | 2026-11-17 | false | logic |  | no | The jackpot's deposit takes after its awaits without asking the purse again, as before (MD-3). |
| `leftoverheal` | worker | switch | v2.3.5809 | 2026-11-17 | false | logic |  | no | The trade window's weapons and the arena's champion pay, then delete their escrow record in a later write, as before (MS-6). |
| `loginspin` | worker | switch | v2.3.4285 | 2026-11-05 | false | logic |  | no | Un-advertises the login wheel and refuses every ask. |
| `minebids` | worker | switch | v2.3.5817 | 2026-11-17 | false | logic |  | no | The Auction House's `/mine` answers anyone asking with a player's bids (what, how much, when), as before (RT-3 P1). |
| `mktback` | worker | switch | v2.3.6025 | 2026-11-18 | false | logic |  | no | Under `mktsettle: false`, a re-listed noted order's cancel, expiry or new match deletes the record alone again: the first taker's escrow, named only by the note, is lost, as before card RV's 6025. |
| `mktheal` | worker | switch | v2.3.5801 | 2026-11-17 | false | logic |  | no | A General Store cancel or expiry pays the escrow back, then deletes the order in a later write, as before (MS-4: a restart between, then 48 quiet hours, can pay it twice). |
| `mktsettle` | worker | switch | v2.3.4505 | 2026-11-10 | false | logic |  | no | A market leftover with a settle note is healed the old way. |
| `mkttier` | worker | switch | v2.3.5801 | 2026-11-17 | false | logic |  | no | A General Store sell is filed under the category, kind and tier its request names, as before (MS-2: a cheap blade can fill a better tier's buy order). |
| `mktwords` | worker | switch | v2.3.5626 | 2026-11-17 | false | logic |  | no | A market order's tier label and seller name are the page's free text again, as before (the worker's own tier label and the character's name while on). |
| `nmlonewrite` | worker | switch | v2.3.5804 | 2026-11-17 | false | logic |  | no | No man's land pays the killer a credit a piece, in writes after the victim's save, as before (MS-1: a restart between loses the loot). |
| `offerpend` | worker | switch | v2.3.5809 | 2026-11-17 | false | logic |  | no | An Auction House offer's Yes does not wait for a bid half made, as before (MS-5). |
| `paidmark` | worker | switch | v2.3.5810 | 2026-11-18 | false | logic |  | no | A daily spin's pot and the login spin save their paid mark in a write after the credit, as before (MD-2: a restart between, then 48 quiet hours, pays the pot again); one row less a daily spin payout. |
| `revealbag` | worker | switch | v2.3.3951 | 2026-11-03 | false | logic |  | no | Un-advertises the bag's reveal and brings back the at-once reveal. |
| `risechest` | worker | switch | v2.3.4438 | 2026-11-10 | false | logic |  | no | The rise chest's cap goes and an ask is answered off. |
| `risekeep` | worker | switch | v2.3.5802 | 2026-11-17 | false | logic |  | no | The oplog prune deletes the rise chest's stamps at 48 h, as before (MD-1: the same character opens the chest again every two days). |
| `salvage` | worker | switch | v2.3.3141 | 2026-10-07 | false | logic |  | no | Un-advertises salvage and refuses both acts. |
| `season` | worker | switch | v2.3.3400 | 2026-10-18 | true | logic |  | no | Thrown (true), the dropped season comes back on the free spin. |
| `storeGear` | worker | switch | v2.3.2528 | 2026-09-15 | false | logic |  | no | Un-advertises gear in the store and stops it taking a listing. |
| `storehealnow` | worker | switch | v2.3.4920 | 2026-11-12 | false | logic |  | no | A stuck store row is healed at the next restart, as before. |
| `storehealwait` | worker | switch | v2.3.4842 | 2026-11-11 | false | logic |  | no | The store's prune runs as before, without waiting for a leftover. |
| `toolshop` | worker | switch | v2.3.3316 | 2026-10-17 | false | logic |  | no | Takes the tools off the shelf and refuses every buy. |
| `trade2` | worker | switch | v2.3.4375 | 2026-11-10 | false | logic |  | no | The trade window is off, so the old gift is open again. |
| `tradedoor` | worker | switch | v2.3.5210 | 2026-11-14 | false | logic |  | no | A finished trade's end can be written again, as the two lines before the trade door would have (nothing does today). |
| `?tradedoor` | page | switch | v2.3.5530 | 2026-11-17 | =0 | logic |  | no | The phone's trade takes any write its own code asks again (an open with no id, a close that carries one), as the lines before the trade's page door; every caller writes what the door allows today. |
| `tradeonewrite` | worker | switch | v2.3.4795 | 2026-11-11 | false | logic |  | no | The trade's swap goes back to its old order of writes. |
| `valuepause` | worker | switch | v2.3.5090 | 2026-11-14 | false | logic |  | no | An action that hands gold or goods on runs even in the minute after the storage refused a save (nothing pauses). |
| `xfer` | worker | switch | v2.3.5092 | 2026-11-14 | false | logic |  | no | No transfer ledger row (`xfer:`) is written; trades run exactly as before. |
| `xferescrow` | worker | switch | v2.3.5290 | 2026-11-17 (v2.3.6000) | false | logic | `xfer` | no | Thrown (false), a wagered duel's pot, a match's stakes, a market cross and an Auction House sale pay as before and write no ledger row.  Unset, the default, ON since v2.3.6000 (the owner, 2026-11-17: "I think turn all of them on then we monitor usage cost"): a wagered duel's pot writes its transfer-ledger row (`xfer:`) in the pot's own run (one row a wagered duel); a match's sponsorship stakes one row a losing stake, in the stakes plan's run; a market cross and an Auction House sale one row each. |

## identity

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `broCount` | worker | switch | v2.3.3255 | 2026-10-15 | false | logic |  | no | The phone falls back to the worn-Bro check instead of counting a wallet's Bros (links and counts stored keep showing). |
| `devicelock` | worker | switch | v2.3.3344 | 2026-10-18 | false | logic |  | no | The join, the login check and the restart as they were: nothing refused (a matching old key's device is still written down unless offdevs is false too). |
| `disable_verify` | worker | switch | v2.3.3275 | 2026-10-16 | true | logic |  | no | Thrown, the account check (Turnstile) is not asked at the join. |
| `joinidform` | worker | switch | v2.3.5701 | 2026-11-17 | false | logic |  | no | A join whose id is a list, a number, a boolean, an object, empty, over 64 characters or holds a character outside A-Z a-z 0-9 _ is let in again, as before (only the magic names refused). |
| `keys2` | worker | switch | v2.3.3355 | 2026-10-18 | false | logic |  | no | No new login key is handed out (keys already made still work). |
| `namerules` | worker | switch | v2.3.5622 | 2026-11-16 | false | logic |  | no | A new character's name is taken as before (any characters, 64 at most), `track` may rename and the arena's bracket takes the page's name; the owner's rename stays, and the name box keeps its rule. |
| `offdevs` | worker | switch | v2.3.5584 | 2026-11-17 | false | logic |  | no | While the device lock is off, nothing is written down for it again, as before (a matching old key's device recorded while on, so the lock can come back without shutting a player out or handing the character to whichever device comes first; a key holder can still push the player's devices off its list of 12 while it is off). |
| `oldkeyheld` | worker | switch | v2.3.5716 | 2026-11-17 | false | logic |  | no | An old Login Key is let in from a device not on its character's list while the device lock is off or the owner's pass is open, as before. |
| `oldkeylock` | worker | switch | v2.3.5582 | 2026-11-16 | false | logic |  | no | An old login key may take the first device of a character with no device list again, and the five-wrong-keys lock shuts out even its rightful holder on its own device, as before. |
| `?rostercookie` | page | switch | v2.3.5718 | 2026-11-17 | =0, off, false | logic |  | no | The roster's cookie (every Login Key the phone holds) is written on the whole registrable domain again, as before: a preview build on another host of it reads the keys, and a first visit to a new build's address finds its characters without a key typed. |
| `?tabid` | page | switch | v2.3.4521 | 2026-11-11 | =0 | logic |  | no | This phone takes the old road: the shared slot at every join, not its tab's own id. |
| `verifylocal` | worker | switch | v2.3.5714 | 2026-11-17 | false | logic |  | no | The account check's address override (TURNSTILE_VERIFY_URL) is honoured whatever its host, as before (it is a test seam: nothing sets it for the real worker). |

## input

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `?autohold` | page | value | v2.3.6548 |  | a number of ms, 200 to 3000 | logic |  | no | In the two buttons (?manual=5) a hold of Attack on a locked monster fills its ring and turns auto-attack on after this many ms, in place of 600 (game/latch.js autoHoldMs; card CT part 15: the owner, 2026-11-24, "Maybe 2 seconds": ?autohold=2000). |
| `?chargebtn` | page | switch | v2.3.6549 | 2026-11-24 | =0 | logic |  | no | In the two buttons (?manual=5) there is no Charge button (ui/panels/ChargeButton.jsx; card CT part 16). Without it Charge shows while a sword is in hand and a monster is in sight but too far to hit, and a press dashes at it (the owner, 2026-11-24: "you must press an attack charge button to get that behavior"). |
| `?ctxbuttons` | page | switch | v2.3.6550 | 2026-11-24 | =0 | logic |  | no | In the two buttons (?manual=5) no button stands under a tree, an ore vein, a fishing spot, a campfire or a townsperson, and Attack is the harvest button again beside a node (its word, its picture, its press, the beat on it), as before (game/contextButton.js ctxButtonsOn; card CT part 17). Without it Attack always attacks (the owner, 2026-11-24: "Attack button always stays attack") and the one nearest thing has its own button under it: CHOP, MINE, FISH, COOK (and the beat's word during the work), or TALK beside a townsperson. |
| `?freefire` | page | switch | v2.3.6547 | 2026-11-24 | =0 | logic |  | no | In the two buttons (?manual=5) a press of Attack with a bow and nothing in sight looses no arrow: the bow waits for its line to be on something, as before (game/freeAttack.js freeArrow; card CT item 8). Without it the arrow flies the way the body faces (the owner, 2026-11-24: "I want arrows to be able to shoot whenever the line of site is aimed at"). |
| `?holdauto` | page | switch | v2.3.6548 | 2026-11-24 | =0 | logic |  | no | In the two buttons (?manual=5) Attack is the press of parts 13-14 again: a press near a monster locks it AND turns auto-attack on, the next press lets go, and a kill moves the lock to the next monster (game/latch.js holdAutoOn; card CT part 15). Without it a tap is one attack (and a lock that stays), a hold past the ring's fill is auto-attack, and a kill lets everything go (the owner, 2026-11-24: "Otherwise each tap is its own attack cycle"). |
| `?reachspecials` | page | switch | v2.3.6549 | 2026-11-24 | =0 | logic |  | no | In the two buttons (?manual=5) Special, Whirlwind and Shield Bash come when a monster is in sight, as before (game/controlVisibility.js specialsShown; card CT part 16). Without it they come only while a monster is in your weapon's reach, where an attack would connect (the owner, 2026-11-24: "The special attacks buttons should only appear when a monster is within attack range"). |
| `?rimsprint` | page | switch | v2.3.6545 | 2026-11-24 | =0 | logic |  | no | In the two buttons (?manual=5) the left stick pushed past its rim walks at full speed and sprints nothing, and the sprint button is back beside the stick, as before (game/stickZones.js rimSprint; card CT item 6). |
| `?sightline` | page | switch | v2.3.6546 | 2026-11-24 | =1 | logic |  | no | In the two buttons (?manual=5) the sight line is drawn to the monster in sight before Attack is pressed, as before (game/latch.js latchLine; card CT item 7). Without it the line is drawn only while combat is on, on the locked monster (the owner, 2026-11-24: "It's only the line drawn that snaps"). |
| `?tapthrough` | page | switch | v2.3.3560 | 2026-10-22 | present | logic |  | no | A tap that closes a window lets its click through, as before. |
| `?threatblock` | page | switch | v2.3.6549 | 2026-11-24 | =0 | logic |  | no | In the two buttons (?manual=5) Block comes when a monster is in sight, as before, and a hit from a monster you cannot see does not bring it (game/controlVisibility.js blockShown; card CT part 16). Without it Block comes at a threat: a monster in sight or in reach, or a monster's hit in the last 3 seconds, seen or not. |
| `?thumbarc` | page | switch | v2.3.6549 | 2026-11-24 | =0 | logic |  | no | In the two buttons (?manual=5) the right side's buttons stand where they stood before (ShieldButton.jsx's anchors; card CT part 16). Without it they stand on the right thumb's arc: Attack where the thumb rests, Jump beside it, Block, Special and Charge each in a spot of its own (game/thumbArc.js). |
| `?turnzone` | page | value | v2.3.6540 |  | =<percent> (15 to 70) | logic |  | no | Moves the left stick's turn border in the two buttons (?manual=5): a thumb inside it turns the body, past it walks (game/stickZones.js; 30 when not given). |

## life

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `deadtake` | worker | switch | v2.3.5920 | 2026-11-17 | false | logic |  | no | A body in its dying seconds may cook, swap armour and buy at the pet house again, as before card V3 (TRAPS §150).  Not switched: the farm and salvage refuse it whatever the switch says (they did before, in silence) and now answer `dead`. |
| `?dyingdoor` | page | switch | v2.3.5534 | 2026-11-17 | =0 | logic |  | no | Your dying seconds on the phone take any start a caller writes (one that is no number), as the lines before the life's page door; every caller writes a number today. |
| `lifenoheal` | worker | switch | v2.3.4901 | 2026-11-12 | false | logic |  | no | A dying player can be healed again (the life door's step 2a off). |
| `lifesave` | worker | switch | v2.3.4902 | 2026-11-12 | false | logic |  | no | No life note written or read: the join stands up as v2.3.4374 did. |
| `xpdecay` | worker | switch | v2.3.3251 | 2026-10-14 | false | logic |  | no | Full XP everywhere again, harvests and fights, cap un-advertised. |

## liveops

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `adminlock` | worker | switch | v2.3.5583 | 2026-11-16 | false | logic |  | no | No address is timed out for wrong admin keys: every guess answered, as before. |
| `bagonesum` | worker | switch | v2.3.4900 | 2026-11-12 | false | logic |  | no | The bag door's one sum is off: every bag road back on its own sum. |
| `daybook` | worker | switch | v2.3.5080 | 2026-11-14 | false | logic |  | no | The day's book adds, writes and prunes nothing; what is stored stays and its reader says it is off. |
| `disable_bigbags` | worker | switch | v2.3.4224 | 2026-11-04 | true | logic |  | no | Thrown, the weapon and gear stashes go back to 8 and 32. |
| `feedback` | worker | switch | v2.3.5593 | 2026-11-16 | false | logic |  | no | The feedback board takes no posts, votes or crash reports (reading stays): the owner's lever in a flood (read by the Feedback object from the room's flags, once a minute). |
| `feedbackshare` | worker | switch | v2.3.5706 | 2026-11-17 | false | logic |  | no | The feedback board as before card SEC PR 7: one shared hour for posts, votes and crash reports; the paces by address in memory only; a vote counted before its ticket is looked for; the crash feed a ring of 200 with no byte cut; the list read whole on every ask; the text kept as typed. |
| `fullsnap` | worker | switch | v2.3.5285 | 2026-11-17 (v2.3.6000) | false | logic |  | no | Thrown (false), a player's daily copy is the character alone, as before.  Unset, the default, ON since v2.3.6000 (the owner, 2026-11-17: "I think turn all of them on then we monitor usage cost"): the copy carries their vault and pets too (two keys more read a player a day, no row more written), so the owner's restore puts them back with the character. |
| `listcap` | worker | switch | v2.3.5960 | 2026-11-17 | false | logic |  | no | Every storage list of the room reads its whole prefix in one read again (the sweeps, the registries, a player's copies, the aim and metric days, the arena's stakes and plans, the owner's pages, and since v2.3.6023 the General Store's book), as before card V5; a sweep is then one page. The Leaderboard and the old Marketplace page always (no flag reaches them). |
| `report` | worker | switch | v2.3.5122 | 2026-11-14 | false | logic |  | no | Un-advertises the field report, so no phone sends its smoothness, and drops any that still comes. |
| `reportheat` | worker | switch | v2.3.6500 | 2026-11-23 | false | logic | `report`, `reportspeed`, `reportlanes` | no | The field report no longer takes the minutes seen, the board's frames or the address bar's switches (caps.report back to 3). |
| `reportlanes` | worker | switch | v2.3.5221 | 2026-11-14 | false | logic | `report`, `reportspeed` | no | The field report no longer takes a lane but full, the governor's rung or the self-test (caps.report back to 2). |
| `reportspeed` | worker | switch | v2.3.5127 | 2026-11-14 | false | logic | `report` | no | The Speed test's card is no longer taken (caps.report back to 1); the smoothness reports carry on. |
| `resetbook` | worker | switch | v2.3.5285 | 2026-11-17 (v2.3.6000) | false | logic |  | no | Thrown (false), a restart books nothing, as before.  Unset, the default, ON since v2.3.6000 (the owner, 2026-11-17: "I think turn all of them on then we monitor usage cost"): a restart books the deleted character and its vault into `econ_gone` (one row for the room, one write and a read a restart), read by the world's sum as the tests take it (restore.test); nothing live reads it yet (the day's walk reads the records that hold value only, and the owner's economy card already counts restarts, econResetBook). |
| `resetclean` | worker | switch | v2.3.5719 | 2026-11-17 | false | logic |  | no | A character restart goes through while a market order or a store listing names the player, and the login streak's row is kept, as before. |
| `roomexport` | worker | switch | v2.3.5286 | 2026-11-15 | false | logic |  | no | The owner's paged export of the room's records answers "off" and reads nothing. |
| `roomrewind` | worker | lever | v2.3.5288 |  | true | none |  | no | Thrown (true), the owner's lever that puts the whole room back to an earlier time works (its dry run, then its do); unset or false, the default, both its steps answer "off". |
| `roomrow` | worker | switch | v2.3.5124 | 2026-11-14 | false | logic | `daybook` | no | Nothing of the room's own row is added into the day's book. |
| `storesize` | worker | switch | v2.3.5287 | 2026-11-14 | false | logic | `daybook` | no | The storage's size is not read into the day's book (its owner's card says "not read that day"); nothing else changes. |
| `testmode` | worker | lever | v2.3.3430 |  | false | none |  | no | Turns every character's test mode off at once, every check back on. |
| `usagemeter` | worker | switch | v2.3.6001 | 2026-11-18 | false | logic |  | no | The usage meter counts nothing (the rows written and read and the messages sent, held in memory for the Test panel's Usage box); the storage and the sends go on as before. |

## look

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `?alphaclip` | page | switch | v2.3.3459 | 2026-10-18 | present | chip |  | no | Hair is clipped by the alpha mask, as it was, not the stencil. |
| `?bakeread` | page | switch | v2.3.4355 | 2026-11-10 | =0 | logic |  | no | The body bake reads its canvas the old way, to compare. |
| `?bodyretry` | page | switch | v2.3.3882 | 2026-10-29 | =0 | logic | `?retrylooks` | no | Body sheets that failed are not asked for again. |
| `?caperetry` | page | switch | v2.3.4431 | 2026-11-10 | =0 | logic | `?retrylooks` | no | Cape sheets that failed are not asked for again. |
| `?gearlook` | page | switch | v2.3.4998 | 2026-11-12 | =0 | chip | `lookpalette` | no | Armour is baked, not coloured on the chip from its numbers. |
| `?gearpackgentle` | page | switch | v2.3.4873 | 2026-11-11 | =0, off, false | logic |  | no | Gear sheets are packed flat out, not a few ms at a time. |
| `?gearretry` | page | switch | v2.3.3870 | 2026-10-29 | =0 | logic | `?retrylooks` | no | Gear sheets that failed are not asked for again. |
| `?gearwalk` | page | switch | v2.3.4999 | 2026-11-12 | =0 | chip | `lookpalette` | no | Armour's walk frames are baked, not coloured on the chip. |
| `?headframes` | page | lever | v2.3.3852 |  | present | none |  | no | QA: counts the head frames drawn (mp-headframes). |
| `?headlook` | page | switch | v2.3.4961 | 2026-11-12 | =0, off, false | chip | `lookpalette` | no | Heads are baked the old way, not from the look's numbers. |
| `?hemiface` | page | switch | v2.3.3957 | 2026-11-03 (v2.3.4049) | =1 | logic |  | no | The Hemi Bro portrait comes back for this tab. |
| `lookarmour` | both | switch | v2.3.3752 | 2026-10-29 | off_lookarmour: true; ?lookarmour=0 | chip | `lookpalette` | no | Bodies under armour are baked again, not coloured on the chip. |
| `?lookatlas` | page | switch | v2.3.4993 | 2026-11-12 | =0 | memory | `lookpalette` | no | The look palette's sheets are not packed into an atlas. |
| `lookdelta` | worker | switch | v2.3.3240 | 2026-10-14 | false | logic |  | no | Every look track is relayed whole again. |
| `lookfolk` | both | switch | v2.3.3809 | 2026-10-29 | off_lookfolk: true; ?lookfolk=0 | memory | `lookpalette` | no | The townsfolk are drawn from their photographs again, loaded then. |
| `lookpace` | worker | switch | v2.3.5721 | 2026-11-17 | false | logic |  | no | A look relay goes the moment a track comes, outside the relay byte budget, its rpgData whole (every key the page put in it), as before. |
| `?lookprobe` | page | lever | v2.3.3716 |  | present or =1 | none |  | no | QA: loads the look palette's probe (an oracle a test reads). |
| `lookshirt` | both | switch | v2.3.3751 | 2026-10-29 | off_lookshirt: true; ?lookshirt=0 | chip | `lookpalette` | no | Printed shirts are baked again, not coloured on the chip. |
| `?pickwood` | page | switch | v2.3.3671 | 2026-10-27 | =0 | logic |  | no | The pickaxe's wood is painted with the skin, as before. |
| `?plaintee` | page | switch | v2.3.4992 | 2026-11-12 | =0 | chip | `lookshirt` | no | A plain tee is baked, not coloured from its numbers. |
| `?portraitgentle` | page | switch | v2.3.5042 | 2026-11-14 | =0, off, false | logic |  | no | The portrait is made in one go, not a few ms at a time. |
| `?retrylooks` | page | switch | v2.3.3865 | 2026-10-29 | =0 | logic |  | no | No art loader asks again for a picture that failed (every loader's retries). |
| `?sheetfetch` | page | switch | v2.3.5015 | 2026-11-13 | =0 | logic |  | no | Armour sheets are fetched on the page, not the worker. |
| `?shirtworker` | page | switch | v2.3.5014 | 2026-11-13 | =0, off, false | logic |  | no | Printed shirts are baked on the page, not the worker. |
| `?toolsolid` | page | switch | v2.3.3873 | 2026-10-29 | =0, off, false | logic |  | no | The pickaxe is drawn as the sheet draws it, thin and pale. |
| `?traittimeoutms` | page | lever | v2.3.3689 |  | a number of ms (1 to 60 s) | none |  | no | QA: a trait picture's load gives up after this long. |
| `?weaponlook` | page | switch | v2.3.5002 | 2026-11-13 | =0 | chip | `lookpalette` | no | Weapons are baked, not coloured on the chip. |

## memory

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `?canvascheck` | page | switch | v2.3.3574 | 2026-10-23 | =0 | chip |  | no | A black screen's rebuild does not first ask whether Safari emptied the pictures. |
| `gfxlean` | both | switch | v2.3.4033 | 2026-11-03 | off_gfxlean: true; ?gfxlean=0, off, false | memory |  | no | A big drawing's building lists are kept after it is drawn. |
| `?gpucopies` | page | switch | v2.3.3088 | 2026-10-06 | present | memory |  | no | Every canvas keeps its page copy, not only the chip's. |
| `?heaptrim` | page | switch | v2.3.5007 | 2026-11-13 | =0, off, false | memory |  | no | The heap is not trimmed. |
| `?held` | page | switch | v2.3.3699 | 2026-10-28 | =0 | memory |  | no | Pictures are not held as colour numbers. |
| `?keepimage` | page | switch | v2.3.3606 | 2026-10-26 | =0 | memory |  | no | A canvas read back is kept as a canvas, not an image. |
| `?loudclear` | page | switch | v2.3.3449 | 2026-10-18 | present | chip |  | no | Every clear is made, not skipped when nothing changed. |
| `?nopalette` | page | switch | v2.3.3190 | 2026-10-12 | present | memory |  | no | No colour-number pictures: every picture held whole. |
| `?onebatch` | page | switch | v2.3.3447 | 2026-11-13 (v2.3.5016) | =0 or =1 | chip |  | softRenderer, onWindows, onMac (v2.3.5228: the program's overrides, drawLanes.js) in src/game/deviceProfile.js | The three sprite programs (=0), or the one program (=1), whatever the device. |
| `picnumbers` | both | switch | v2.3.3715 | 2026-10-28 | off_picnumbers: true; ?picnumbers=0 | memory |  | no | Monster strips are held as pictures again, not as colour numbers. |
| `?poolkeep` | page | switch | v2.3.3152 | 2026-10-12 | present | memory |  | no | The texture pool is not trimmed when idle. |
| `?textkeep` | page | switch | v2.3.3633 | 2026-10-27 | present | memory |  | no | A Text that is gone keeps its texture. |
| `?treenumbers` | page | switch | v2.3.5248 | 2026-11-14 | =0 | memory |  | no | The trees are held as pictures again, not as colour numbers. |

## monsters

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `aggrogrid` | worker | switch | v2.3.3201 | 2026-10-13 | false | logic |  | no | Monsters look for targets with the full loop everywhere instead of the grid. |
| `?crowd` | page | value | v2.3.3241 |  | a number (1 to 500), or 0, all or off for no cap | logic |  | no | Caps how many OTHER PLAYERS are drawn in full on this phone (the nearest 50 by default; your party, your target, whoever fights you and your duel always): another number, or none. Monsters are not counted (v2.3.5305: the row said monsters; the gatekeeper's low, sitting 15). |
| `elemhits` | worker | switch | v2.3.2996 | 2026-10-03 | false | logic |  | no | Stops every new elemental status at once; a burn already burning finishes. |
| `freezehit` | worker | switch | v2.3.3620 | 2026-10-27 | false | logic |  | no | A chill is the plain chill, not frozen a moment first. |
| `goohold` | worker | switch | v2.3.3620 | 2026-10-27 | false | logic |  | no | The goo holds as the plain stuck hold, without its longer hold and sting. |
| `?laddercrowd` | page | switch | v2.3.5226 | 2026-11-14 | =0, off, false | logic | `govern` | no | The crowd rungs are off: the owner's 50 other players drawn, whatever the rung (`?crowd=K` as before). |
| `monstercharge` | worker | switch | v2.3.3946 | 2026-11-03 | false | logic | `monstermoves` | no | No monster charges. |
| `monstercombo` | worker | switch | v2.3.3946 | 2026-11-03 | false | logic | `monstermoves` | no | No monster swings its combo. |
| `monsterenrage` | worker | switch | v2.3.3946 | 2026-11-03 | false | logic | `monstermoves` | no | No monster enrages. |
| `monsterlife` | worker | switch | v2.3.4843 | 2026-11-11 | false | logic |  | no | A monster's reset is the old hand list, with no `m.life`. |
| `monstermoves` | worker | switch | v2.3.3946 | 2026-11-03 | false | logic |  | no | Every monster move off: tier 1's behaviour everywhere. |
| `monsterslam` | worker | switch | v2.3.3946 | 2026-11-03 | false | logic | `monstermoves` | no | No monster slams (the two-step slam and the area slam). |
| `monstervolley` | worker | switch | v2.3.3946 | 2026-11-03 | false | logic | `monstermoves` | no | No monster throws its volley. |
| `slimeboss` | worker | switch | v2.3.3558 | 2026-10-22 | false | logic |  | no | A boss made after it is the one big boss of v2.3.3556. |
| `wobble` | worker | switch | v2.3.3620 | 2026-10-27 | false | logic |  | no | A daze ends without its second of wobbling. |

## movement

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `amuletregen` | worker | switch | v2.3.3536 | 2026-10-21 | false | logic |  | no | The regeneration tick goes back to the phone's claim and Endurance for everyone (the amulet's multipliers off). |
| `?avatarholdms` | page | lever | v2.3.3520 |  | a number of ms (1 to 180 s) | none |  | no | A slow test machine's longer wait for the avatar's pictures. |
| `entrygrace` | worker | switch | v2.3.4453 | 2026-11-10 | false | logic |  | no | The zone-entry grace is given on every entry again. |
| `?jumpbtn` | page | switch | v2.3.3681 | 2026-10-28 | =0 | logic |  | no | No jump button. |
| `?jumpms` | page | lever | v2.3.3017 |  | a number of ms | none |  | no | A test's own jump length. |
| `?legsync` | page | switch | v2.3.4077 | 2026-11-03 | =0 | logic |  | no | The legs keep their old fixed cadences, not synced to the speed. |
| `monsterroll` | worker | switch | v2.3.3300 | 2026-10-17 | false | logic |  | no | A monster gets no roll i-frames (the way before v2.3.3300). |
| `movebudget` | worker | switch | v2.3.3325 | 2026-10-17 | false | logic |  | no | The move budget off: the per-message 80, the refusals and the three bypasses as before. |
| `movefields` | worker | switch | v2.3.5723 | 2026-11-17 | false | logic |  | no | A move's facing, worn pieces and velocity are stored as sent and ticked to everyone near, any size or shape, and an object with no toString makes the move's signature throw, as before. |
| `?movementreset` | page | switch | v2.3.5204 | 2026-11-14 | =0 | logic |  | no | A climb and a swim end a frame after a change of place again, on their own off-the-Wheel checks, not at the zone door. |
| `movepath` | worker | switch | v2.3.3726 | 2026-10-28 (v2.3.3744) | false | logic |  | no | No glide from the next tick; every phone is told to send every move again. |
| `movetop` | worker | switch | v2.3.5549 | 2026-11-17 | false | logic |  | no | ON since v2.3.5551 (the owner, 2026-11-17: "Go recommended"); thrown (`movetop: false`), every player is held to the flat 500 px a second again, as before. |
| `pathall` | worker | switch | v2.3.3726 | 2026-10-28 (v2.3.3744) | false | logic | `movepath` | no | Only a phone that asks with ?diet=1 gets the move glide. |
| `rest` | worker | switch | v2.3.3539 | 2026-10-21 | false | logic |  | no | Un-advertises the Hotel's rest: it rests nobody and pays no Well Rested XP. |
| `ride` | worker | switch | v2.3.3776 | 2026-10-29 | false | logic |  | no | Un-advertises riding and ends every ride on the rider's next move. |
| `?ridecoast` | page | switch | v2.3.5440 | 2026-11-14 | =0, off, false | logic |  | no | The board starts at top speed and stops the moment you let go, as before: no pushes to speed up, no roll-off. |
| `ridedoor` | worker | switch | v2.3.5523 | 2026-11-17 | false | logic |  | no | A board can be taken by the dead or with no session to tell, and an end written over no ride, as the lines before the ride door could have; _handleRide's refusals and _rideEnd still check first. |
| `?ridedoor` | page | switch | v2.3.5530 | 2026-11-17 | =0 | logic |  | no | Your board on the phone takes any write its own code asks again (a fresh record over a live one), as the lines before the ride's page door; every caller writes what the door allows today. |
| `rollwindow` | worker | switch | v2.3.3292 | 2026-10-17 | false | logic |  | no | A roll claim is trusted as before, paid or not. |
| `safeheal` | worker | switch | v2.3.3569 | 2026-10-22 | false | logic |  | no | The safe ground's heal is the wilds' trickle again. |
| `serverdead` | worker | switch | v2.3.4373 | 2026-11-10 | false | logic |  | no | A phone's move may write `dead` again (the move's write back). |
| `sprint` | worker | switch | v2.3.3003 | 2026-10-03 | false | logic |  | no | No sprint step is allowed. |
| `sprintmark` | worker | switch | v2.3.5541 | off | true | logic |  | no | An opt-in, off (the owner: off for now): thrown (`sprintmark: true`), a move between two sprint-marked ones keeps the run, so a sprint marked on every other move pays its stamina, and only a move the sprint bills is judged at its bound (the rest at the walk). |
| `steadymovers` | worker | switch | v2.3.3203 | 2026-10-13 | false | logic |  | no | Every move goes out again, from the next tick. |
| `?tapms` | page | lever | v2.3.3105 |  | a number of ms | none |  | no | A test's own longest tap that still counts as free. |

## ops

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `boardcache` | worker | switch | v2.3.5608 | 2026-11-16 | false | logic |  | no | Every board is read from storage at every request, as before (said on the room's own post to the board object as `bc: 0`); the sweep of week-old rows, `playtime` only on its own board and last-seen by the hour stay. |
| `boardsweep` | worker | switch | v2.3.5608 | 2026-11-16 | false | logic |  | no | No week-old board row is deleted (said on the room's post to the board object as `bs: 0`): the stale rows stay off every board as before, and stay on file. |
| `chainscore` | worker | switch | v2.3.5712 | 2026-11-17 | false | logic |  | no | Nothing is sent to the chain: a level-up's score checkpoint answers switched-off and stores nothing, so it is sent at the next level-up once the switch is back (the day's ceiling and the fee's ceiling stand while it is on). |
| `exactseen` | worker | lever | v2.3.5608 |  | true | none |  | no | Thrown (true), the public boards say each player's last-seen time exactly again, with no `seen: 'hour'` word, so the prize draw page reads its window to the millisecond (to run an old draw again exactly). Unset or false, the default: last seen to the hour. |
| `floodtally` | worker | switch | v2.3.5711 | 2026-11-17 | false | logic |  | no | The overview's `floodTally` reads null and nothing is counted: a flood is counted on its session only and reaches no owner page, as before. |
| `guestlazy` | worker | switch | v2.3.5610 | 2026-11-17 | false | logic |  | no | A guest's join (no key, no record) writes its rows again: its record twice, its pet book, its login streak and its day's rewards. |
| `guestquiet` | worker | switch | v2.3.5708 | 2026-11-17 | false | logic |  | no | A fresh guest is reported to the board at its join and on its tracks, and its bot signals (botstat:) are written, before it does anything worth keeping, as before. |
| `publicreads` | worker | switch | v2.3.5609 | 2026-11-16 | false | logic |  | no | The market's orders, the store's browse and the arena's status walk their book at every read, as before: nothing kept, no address paced. |
| `rewindsays` | worker | switch | v2.3.5815 | 2026-11-17 | false | logic |  | no | The room rewind's plan does not name the owner's login acts since its time (a key taken back, a device forgotten, a silence), as before (ACC-4). |
| `rf_spread` | worker | switch | v2.3.5604 | 2026-11-16 | false | logic |  | no | A full room asks every waiting phone to try again in 5 s, however many are knocking (the cadence before); the count is still kept. |
| `roomhealth` | worker | switch | v2.3.5601 | 2026-11-16 | false | logic |  | no | GET /health/room answers 404 (the room answers its own 404 and the route passes it on); /health is unchanged and nothing in the game changes. |
| `seathold` | worker | switch | v2.3.5606 | 2026-11-17 (v2.3.6000) | false | logic |  | no | Thrown (false): the gate counts sockets as before, nothing held, nothing written.  Unset, the default, ON since v2.3.6000 (the owner, 2026-11-17: "I think turn all of them on then we monitor usage cost"; docs/specs/seat-hold.md): a joined player whose socket drops holds their seat a minute and a deploy's players theirs for 30 s, so a waiting crowd cannot take them; at most one small write every 15 s while who is in changes, and one as the room empties. |

## page-thread

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `?beathold` | page | switch | v2.3.6503 | 2026-11-24 | =0 | logic | `?pace` | no | The pacer reads the screen's rate afresh every time again: a hot phone's missed frames can be read as a slower screen (a 120 as a 60, a 60 as a 30 and its lane `thirty`). |
| `?dtsmooth` | page | switch | v2.3.4355 | 2026-11-10 | =0, off, false | logic |  | no | The frame's step is the raw time, not the steady step. |
| `?framesteps` | page | switch | v2.3.5340 | 2026-11-17 | =0 | logic |  | no | The frame is not marked as named steps: no step times, no step's throw in the crash ring, and window.__btSteps() says off; the loop runs as before. |
| `?govcool` | page | switch | v2.3.6503 | 2026-11-24 | =0 | logic | `govern` | no | The governor and the pacer try a faster rate again on the wait alone, as before: not only once the game's own work a frame has fallen 8% below the last step down's (a hot phone see-saws between 60 and 30). |
| `govern` | both | switch | v2.3.5222 | 2026-11-14 | off_govern: true (v2.3.5235: every phone, live, the Test panel's list); ?govern=0 (off), =1 (on where `?lane=` holds it) | logic |  | no | The governor no longer moves the ladder: the lane's row, however late the frames. |
| `?ladderrate` | page | switch | v2.3.5224 | 2026-11-14 | =0, off, false | logic | `govern` | no | The rate as before the ladder: a 60 screen is never paced, whatever the rung. |
| `?memalarm` | page | switch | v2.3.6501 | 2026-11-23 | =0 | memory | `govern` | no | The governor's memory alarm goes back to the memory check's two old lines (art 79.3, the chip 109.3 MB), not the game's own total. |
| `?pace` | page | switch | v2.3.4355 | 2026-11-10 | =0, off, false | logic |  | no | No frame pacer: the frames are drawn as the browser calls, as before. |

## preload

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `?banners` | page | switch | v2.3.5003 | 2026-11-13 | =all | memory |  | no | All four zone banners held while in the world, as before. |
| `codelazy` | both | switch | v2.3.3717 | 2026-10-28 | off_codelazy: true; ?codelazy=0, off, false | memory |  | no | Every window's code loads with the game again, not when opened. |
| `onecopy` | both | switch | v2.3.3715 | 2026-10-28 | off_onecopy: true; ?onecopy=0 | memory |  | no | Pictures are held in more than one copy again. |
| `?picsretry` | page | switch | v2.3.4431 | 2026-11-10 | =0 | logic | `?retrylooks` | no | Pictures that failed are not asked for again. |
| `?warmonce` | page | switch | v2.3.4652 | 2026-11-11 | =0 | logic |  | no | A fresh warm every pass, as before. |

## quests

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `achievements` | worker | switch | v2.3.3527 | 2026-10-21 | false | logic |  | no | Grants, counts and sweeps no achievement and un-advertises the cap (what was earned stays). |
| `codex` | worker | switch | v2.3.3209 | 2026-10-13 | false | logic |  | no | The monster codex counts no kills (what was learned stays readable) and its cap is off. |
| `disable_mayor3_check` | worker | switch | v2.3.4441 | 2026-11-10 | true | logic |  | no | Thrown, the mayor's third quest is met on the phone's word again. |
| `disable_quest_echo` | worker | switch | v2.3.4389 | 2026-11-10 | true | logic |  | no | Thrown, a refused quest claim is silent again instead of echoing the worker's values. |
| `onelevel` | worker | switch | v2.3.3538 | 2026-10-21 | false | logic |  | no | A character's level is the sum of its skills again. |
| `petbook` | worker | switch | v2.3.3120 | 2026-10-06 | false | logic |  | no | Un-advertises the pet book and refuses naming, setting active and releasing (catches still land). |
| `petfetch` | worker | switch | v2.3.3806 | 2026-10-29 | false | logic |  | no | Every pile back on the 240 px pet reach. |
| `pethouse` | worker | switch | v2.3.3120 | 2026-10-06 | false | logic |  | no | The pet house is shut (off). |
| `petlevels` | worker | switch | v2.3.3120 | 2026-10-06 | false | logic |  | no | No pet earns XP (levels earned stay). |
| `petshow` | worker | switch | v2.3.3120 | 2026-10-06 | false | logic |  | no | Takes `pw` off every record (pets not shown to others). |
| `pettrade` | worker | switch | v2.3.3120 | 2026-10-06 | false | logic |  | no | Stops new pet trades and listings (one on its way still arrives). |
| `petwards` | worker | switch | v2.3.3120 | 2026-10-06 | false | logic |  | no | Every pet ward off. |
| `?pointsfly` | page | switch | v2.3.3971 | 2026-11-03 | =0 | logic |  | no | Points earned do not fly to their bar. |
| `pointsreset` | worker | switch | v2.3.3541 | 2026-10-21 | false | logic |  | no | Every points reset refused, and its cap off at the next join. |
| `pointsresetroom` | worker | switch | v2.3.4372 | 2026-11-10 | false | logic |  | no | The points reset's minute is the socket's alone, not kept by the room. |
| `?questpages` | page | switch | v2.3.6620 | 2026-11-25 | =0 | logic |  | no | The old Quests page comes back: the list of your quests beside the open one (v2.3.4394), and a quest opened from the pinned card on its own page. |
| `?questpath` | page | switch | v2.3.2992 | 2026-10-03 | present | logic |  | no | The quest's road on the ground comes back, with its Settings row. |
| `racedoor` | worker | switch | v2.3.5217 | 2026-11-15 | false | logic |  | no | A race can be put on without its gun or its deadline, as the line before the race door could have (no start builds one today); the next move could then never end it. |
| `?racedoor` | page | switch | v2.3.5218 | 2026-11-16 | =0 | logic |  | no | The phone's race takes any write its own code asks again (an ask over a live race, the gun from an ask, a dismiss of a run), as the lines before the page door could have; race.js still checks each first. |

## render

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `?bakeurl` | page | switch | v2.3.5043 | 2026-11-14 | =0 | logic |  | no | Every armour bake input is cut on the page again, not sent to the worker as its sheet's address. |
| `?barretry` | page | switch | v2.3.4415 | 2026-11-10 | =0 | logic | `?retrylooks` | no | HUD bar pictures that failed are not asked for again. |
| `?beltstandin` | page | switch | v2.3.5560 | 2026-11-15 | =0, off, false | logic |  | no | A figure in both armour pieces jogs, as before, while its chain belt's jog sheet is on its way: the plain body under the armour on the facings its bake draws, not its idle frame. |
| `?bindfix` | page | switch | v2.3.3152 | 2026-10-12 | =0 | chip |  | no | The graphics bind-group fix is not installed. |
| `?bladesoft` | page | value | v2.3.2927 |  | a number, off or on | logic |  | no | Sets how soft a blade's edge is drawn. |
| `?boardroll` | page | switch | v2.3.3855 | 2026-10-29 | =0, off, false | logic |  | no | The board rolls as it was: no spots, dip or bumps. |
| `?burnfire` | page | switch | v2.3.3878 | 2026-10-29 | =0 | logic |  | no | A burn draws its old flames, not the building's fire. |
| `?camsnap` | page | switch | v2.3.3469 | 2026-10-18 | =0 | chip |  | no | The camera is not snapped to whole device pixels. |
| `?capehood` | page | switch | v2.3.5564 | 2026-11-16 | =0 | memory |  | no | A cape hood's hair masks are drawn from their pictures, as before, not from their 256-colour twins. |
| `?caustics` | page | value | v2.3.3021 |  | a number, 0 to 2 | logic |  | no | The water's light web this many times as bright. |
| `?coinflip` | page | switch | v2.3.5247 | 2026-11-14 | =0 | memory |  | no | Ace's coin strips keep their decoded copies, as before. |
| `?deathbig` | page | lever | v2.3.3954 |  | =1 or =0 | none |  | no | QA: every kill's death is the big one (=1) or the ordinary one (=0). |
| `?deathkind` | page | lever | v2.3.3954 |  | own, normal, slice, decap, leg or topple | none |  | no | QA: every monster dies this way on this phone. |
| `?deathstrip` | page | switch | v2.3.5567 | 2026-11-17 | =0 | memory |  | no | The death strip (drawn when the bones' explosion has no corpse) is drawn from its full-colour picture, as before, not from its 256-colour twin. |
| `?deathzones` | page | switch | v2.3.3954 | 2026-11-03 | =0 | logic |  | no | No death zones' effects. |
| `?depthbuf` | page | switch | v2.3.3072 | 2026-10-06 | present | chip |  | no | The depth buffer is kept, to compare. |
| `?dmgscale` | page | value | v2.3.3033 |  | a number | logic |  | no | Scales the damage numbers. |
| `?dmgwords` | page | switch | v2.3.5008 | 2026-11-13 | =0 | logic |  | no | Damage numbers are not shortened to words (K, M). |
| `?elemicons` | page | switch | v2.3.5258 | 2026-11-15 | =0 | memory |  | no | The eight element marks drawn after a hit's number are drawn from their full-colour pictures, as before, not from their 256-colour twins. |
| `?fill` | page | switch | v2.3.3577 | 2026-10-23 | =0 | chip |  | no | The fill batch is off: fills drawn as Pixi does. |
| `?firelegless` | page | switch | v2.3.3684 | 2026-10-28 | =0 | logic |  | no | The fire armour keeps the legs under its greaves, as before. |
| `?firelit` | page | switch | v2.3.3684 | 2026-10-28 | =0 | logic |  | no | The fire log's lit key pixels stay pink, as before. |
| `?firelog` | page | switch | v2.3.3660 | 2026-10-27 | =0 | logic |  | no | The fire's log is drawn the old way. |
| `?fishgrip` | page | switch | v2.3.3623 | 2026-10-27 | =1 | logic |  | no | The fishing grip is drawn over the plate. |
| `?fishgriptrousers` | page | switch | v2.3.3657 | 2026-10-27 | =1 | logic |  | no | The fishing grip lifts the trousers too. |
| `?fishspot` | page | switch | v2.3.5565 | 2026-11-17 | =0 | memory |  | no | The pond under a fishing spot is drawn from its full-colour picture, as before, not from its 256-colour twin. |
| `?flipbake` | page | switch | v2.3.3577 | 2026-10-23 | =0 | logic |  | no | Flipped facings are not baked from their source, as before. |
| `?folksheets` | page | switch | v2.3.6202 | 2026-11-18 | =0 | memory | `lookfolk` | no | The townsfolk's baked body sheets (the few looks the shared numbers refuse) stay on the graphics chip for the whole visit once drawn, as before; on, their chip copies are let go of far from town and sent up again as each is drawn (card EN PR 3). |
| `?folkskills` | page | switch | v2.3.5462 | 2026-11-14 | =0 | memory | `lookfolk` | folkSkillReady in src/rendering/folkSkill.js | The townsfolk work in card TF PR 1's poses again (Chef Blaze and Woodworker Bro the pickup, Farmer Bro standing), and the trades' figures (the `skills` look set) are not loaded. |
| `?folkwork` | page | switch | v2.3.3949 | 2026-11-03 | =0 | logic |  | no | The townsfolk walk but stand at their stops, not work. |
| `?framepack` | page | switch | v2.3.5257 | 2026-11-14 | =0, off, false | memory |  | no | A monster strip's colour numbers are kept whole in the page once on the chip, as before, not deflated a frame at a time. |
| `?fxmade` | page | switch | v2.3.5249 | 2026-11-14 | =0 | memory |  | no | The effects the game's tools made are drawn from their full-colour pictures, as before, not their 256-colour twins. |
| `?fxsheets` | page | switch | v2.3.5252 | 2026-11-14 | =0 | memory |  | no | The effects cut from the owner's sheets (the stun stars, the whirlwind, the grease, woodchips, rocks and splash bursts) are drawn from their full-colour pictures, as before. |
| `?gripguess` | page | switch | v2.3.3399 | 2026-10-18 | =0 | logic |  | no | The bow's grip between shots as it was, not guessed. |
| `?groundbg` | page | switch | v2.3.3452 | 2026-10-18 | =1 | chip |  | no | The black under the world's ground is drawn every frame, as it was. |
| `groundkeep` | both | switch | v2.3.3775 | 2026-10-29 | off_groundkeep: true; ?groundkeep=0, off, false | chip |  | no | The world's ground is rebuilt on a return, not kept, as before. |
| `?hairmasks` | page | switch | v2.3.5562 | 2026-11-16 | =0 | memory |  | no | The hats' hair masks are drawn from their full-colour pictures, as before, not from their 256-colour twins. |
| `?hudbars` | page | switch | v2.3.5566 | 2026-11-17 | =0 | memory |  | no | The bars over heads (the HP, mana and stamina pills, the health bar and the harvest bar) are drawn from their full-colour pictures, as before, not from their 256-colour twins. |
| `?iconretry` | page | switch | v2.3.4431 | 2026-11-10 | =0 | logic | `?retrylooks` | no | Icons that failed are not asked for again. |
| `?ladderpass` | page | switch | v2.3.5229 | 2026-11-14 | =0, off, false | chip | `govern` | no | The passes' rungs are off: the metal shines, the shadows are drawn and the sea moves, whatever the rung. |
| `?layerpush` | page | switch | v2.3.3449 | 2026-10-18 | present | chip |  | no | Every layer's uniforms are pushed as Pixi does, to compare. |
| `?legslook` | page | switch | v2.3.4450 | 2026-11-10 | =0, off, false | chip | `lookpalette` | no | Legs under greaves are baked the old way. |
| `?lightfx` | page | switch | v2.3.2710 | 2026-09-23 (v2.3.2711) | =1, =0, on or off | chip |  | no | Turns the light effects on or off. |
| `?lookinline` | page | lever | v2.3.3752 |  | present or =1 | none |  | no | QA: looks are baked on the page, inline (the QA box's software chip). |
| `?lootbeam` | page | switch | v2.3.3805 | 2026-10-29 | =0 | logic |  | no | No beam over a loot pile. |
| `?lootpop` | page | switch | v2.3.4124 | 2026-11-03 | =0 | logic |  | no | Loot falls the v2.3.2771 way, no hop and bounce. |
| `?magicburst` | page | switch | v2.3.3892 | 2026-10-30 | =0 | logic |  | no | The staff's crash is the old small burst. |
| `?noauras` | page | switch | v2.3.3402 | 2026-10-18 | present | logic |  | no | No land auras. |
| `?nobuildingfire` | page | switch | v2.3.3230 | 2026-10-14 | present | logic |  | no | No building burns. |
| `?nofade` | page | switch | v2.3.2999 | 2026-10-03 | present | logic |  | no | Tree canopies do not fade over you. |
| `?noheal` | page | switch | v2.3.3152 | 2026-10-12 | present | chip |  | no | The renderer's heal after a lost context is off. |
| `?nolayergroups` | page | switch | v2.3.3449 | 2026-10-18 | present | chip |  | no | World layers are not each their own render group, to compare. |
| `?nopeercull` | page | switch | v2.3.3241 | 2026-10-14 | present | logic |  | no | Every other player in the world is drawn wherever they stand. |
| `?norendergroups` | page | switch | v2.3.3079 | 2026-10-06 | present | chip |  | no | No render groups: the world and screen share one draw list. |
| `?nosilhouette` | page | switch | v2.3.3707 | 2026-10-28 | present | logic |  | no | Monsters under a canopy are not shown as silhouettes. |
| `?nostormfx` | page | switch | v2.3.4356 | 2026-11-10 | present | logic |  | no | No storm sparks. |
| `?nowaterfx` | page | switch | v2.3.4355 | 2026-11-10 | present | logic |  | no | No water attack effects. |
| `?nowaves` | page | switch | v2.3.3019 | 2026-10-04 | present | logic |  | no | The water stays still. |
| `?nowindupfx` | page | switch | v2.3.3619 | 2026-10-27 | present | logic |  | no | No elemental wind-up effects. |
| `?npcheads` | page | switch | v2.3.5246 | 2026-11-14 | =0 | memory |  | no | The townsfolk's head pictures keep their decoded copies, as before. |
| `?orebreakms` | page | lever | v2.3.3345 |  | a number of ms | none |  | no | QA: an ore's pieces lie this long (a slow machine's screenshot). |
| `?p256` | page | switch | v2.3.3728 | 2026-11-14 (v2.3.5249) | =1 every twin on; =0 every twin off (v2.3.5249) | memory |  | no | With =0 every effect and icon is drawn from its full-colour picture; =1 turns on the twins not yet on by default. |
| `?packworker` | page | switch | v2.3.5253 | 2026-11-14 | =0 | logic |  | no | A gear sheet first drawn in play is packed on the page a few ms at a time, as before, not on the body bake's worker. |
| `?pagebases` | page | switch | v2.3.4450 | 2026-11-10 | =0, off, false | logic |  | no | A page's ground lines are read on the page, not the worker. |
| `?petsheet` | page | switch | v2.3.5563 | 2026-11-16 | =0 | memory |  | no | The pet sheet is drawn from its full-colour picture, as before, not from its 256-colour twin. |
| `?pixidelay` | page | lever | v2.3.3709 |  | a number of ms | none |  | no | QA: the renderer arrives this much later, as a slow phone's. |
| `?platelayer` | page | switch | v2.3.4886 | 2026-11-12 (v2.3.4990) | =0 | memory |  | no | Armour plates are not drawn as their own layer. |
| `?popupworld` | page | switch | v2.3.3192 | 2026-10-13 | present | logic |  | no | Popups drawn in the world, not on the screen. |
| `?seacover` | page | switch | v2.3.3452 | 2026-10-18 | =0 | chip |  | no | The ground is drawn under every sea quad, as it was. |
| `?selftest` | page | lever | v2.3.5234 |  | =fail:<name>[,<name>...] (one, palette, look, sharp, sheen, shadow, water, fill, glint, clip); =0, off, false | none |  | no | QA: the named programs fail their self-test at the door, each falling back alone (mp-selftest); =0 runs none. |
| `?shade` | page | switch | v2.3.2740 | 2026-09-23 | =0 | logic |  | no | No form shading on objects. |
| `?shadowhp` | page | switch | v2.3.3338 | 2026-10-18 | =0 | chip |  | no | The shadow filter at the half precision it had. |
| `?shadowlock` | page | switch | v2.3.3149 | 2026-10-11 | =0 | logic |  | no | Shadows are not locked to their casters. |
| `?shadowpass` | page | switch | v2.3.3458 | 2026-10-18 | present | chip |  | no | The shadow filter runs in the middle of the frame, as it was. |
| `?shadowsnap` | page | switch | v2.3.3338 | 2026-10-18 | =1 | logic |  | no | Shadow pieces snap to pixels again, as before. |
| `?sheen` | page | switch | v2.3.2736 | 2026-09-24 (v2.3.2887) | =1, =0, on or off | logic |  | no | Turns the sheen on gear on or off. |
| `?sheenpass` | page | switch | v2.3.3453 | 2026-10-18 | present | chip |  | no | The sheen is drawn without its batch. |
| `?shieldretry` | page | switch | v2.3.4431 | 2026-11-10 | =0 | logic | `?retrylooks` | no | Shield sheets that failed are not asked for again. |
| `?shine` | page | switch | v2.3.6503 | 2026-11-24 | =0 or =1 | chip |  | no | The metal never shines (=0), or always shines (=1), on this phone: the governor's ladder no longer takes it (its second chip rung, after the rate). |
| `?shotimage` | page | switch | v2.3.5982 | 2026-11-18 | =0 | memory |  | no | The monsters' thrown goo and fire are drawn from their two canvases, kept in the page as before, not from images of them. |
| `?slimesplat` | page | switch | v2.3.4127 | off | =0 or =1 | logic |  | no | The slime's splat turned off (=0) or on (=1) for this phone. |
| `?slimewalk` | page | switch | v2.3.5256 | 2026-11-14 | =0, off, false | memory |  | no | The slimes' sheets load behind the first loading screen and are kept, as before, not as a slime comes near. |
| `?sootms` | page | lever | v2.3.3679 |  | a number of ms | none |  | no | QA: soot marks lie this long. |
| `?standinlegs` | page | switch | v2.3.3640 | 2026-10-27 | =0 | logic |  | no | The sword and bow bodies keep their legs under greaves, as before. |
| `?teechip` | page | switch | v2.3.5981 | 2026-11-18 | =0 | memory | `?plaintee` | no | The tee's standing and jogging sheets are sent to the graphics chip at the loading screen, as before, though a phone draws them from the colour numbers. |
| `?townparts` | page | switch | v2.3.5983 | 2026-11-18 | =0 | memory |  | no | The retired town's hanging signs, crates and flags load behind the world's loading screen every session, as before, not only with that town. |
| `?traitretry` | page | switch | v2.3.3606 | 2026-10-26 | =0 | logic | `?retrylooks` | no | A trait picture that failed is not asked for again. |
| `?uploadicons` | page | switch | v2.3.5569 | 2026-11-17 | =0 | memory |  | no | The five-block stamina and mana strips and the verified Bro badge over a name are drawn from their full-colour pictures, as before, not from their 256-colour twins. |
| `?waves` | page | value | v2.3.3019 |  | a number, 0.25 to 3 | logic |  | no | The water's motion this many times as strong. |
| `?weaponretry` | page | switch | v2.3.4431 | 2026-11-10 | =0 | logic | `?retrylooks` | no | Weapon sheets that failed are not asked for again. |
| `?webskip` | page | switch | v2.3.3448 | 2026-10-18 | =0 | chip |  | no | The water's light web is drawn on every quad, not skipped. |
| `?worldicons` | page | switch | v2.3.5250 | 2026-11-14 | =0 | memory |  | no | The icons drawn in the world (the ore, the shards, the heart and sword popups; the trap's box has no twin) are drawn from their full-colour pictures, as before. |
| `?zindexall` | page | switch | v2.3.3449 | 2026-10-18 | present | logic |  | no | Every depth key goes through Pixi's setter every sort, to compare. |

## server-core

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `disable_jackpot` | worker | switch | v2.3.1150 | 2026-07-03 | true | logic |  | no | Thrown, jackpot deposits stop cold (the pool and the draw are untouched). |
| `far_ms` | worker | value | v2.3.3243 |  | a number, 100 to 5000 | logic |  | no | How often far players go out on their own, in ms (100 to 5000). |
| `farplayers` | worker | switch | v2.3.3197 | 2026-10-13 | false | logic |  | no | Sends everyone every far player every tick again. |
| `heapburn` | worker | switch | v2.3.3748 | 2026-10-28 | false | logic |  | no | Un-advertises the burning heap: the phone sends nothing and nobody burns. |
| `hidden_off` | worker | switch | v2.3.3723 | 2026-10-28 | true | logic |  | no | Thrown, the hidden settings are not read: the public placeholders are used. |
| `newerkeep` | worker | switch | v2.3.5704 | 2026-11-17 | false | logic |  | no | A newer worker's character let in by `newersave: false` is saved from this worker's field list alone again: the fields the newer version added are dropped. |
| `newersave` | worker | switch | v2.3.3303 | 2026-10-17 | false | logic |  | no | A save from a newer worker is let through the join, the newer `_v` kept. |
| `roundpos` | worker | switch | v2.3.3197 | 2026-10-13 | false | logic |  | no | Positions go out as the phones sent them, not rounded. |
| `skillfreeze` | worker | switch | v2.3.4380 | 2026-11-10 | false | logic |  | no | A prog3 character's reported skill tracks are stored and restored again. |
| `slimroster` | worker | switch | v2.3.3246 | 2026-10-14 | false | logic |  | no | Sends everyone the whole roster again. |
| `tickpace` | worker | switch | v2.3.3202 | 2026-10-13 | false | logic |  | no | The tick's plain interval again, from the next tick. |
| `tickshare` | worker | switch | v2.3.3195 | 2026-10-13 | false | logic |  | no | Builds every tick message whole again. |

## session

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `actor` | worker | switch | v2.3.6480 | 2026-11-23 | false | logic |  | no | The ledger's rows (`xfer:`) carry no `actor` (who started it) and the day's book adds a test-mode character's play with everyone's, every row exactly as before; the cap `actor` is not advertised (the session still makes its actor, in memory, read by nothing else). |
| `bodytake` | worker | switch | v2.3.4455 | 2026-11-10 | false | logic |  | no | A second login taking over mid-fight no longer keeps the body (the v2.3.4432 way), and caps.bodyTake is un-advertised. |
| `joinguard` | worker | switch | v2.3.5730 | 2026-11-17 | false | logic |  | no | ON since v2.3.5730 (card RV's review: ACC-1, ACC-2, SEC-F1, ACC-3; decided for the owner while away, 2026-11-17: "Go recommended on all"); thrown (`joinguard: false`), a key registers a guest's id and takes its record, a guest on a made-up bp_ id writes a char: row, a join with no id is let in as undefined, and a socket that named a held seat and never joined keeps its claim, as before. |
| `joinplace` | worker | switch | v2.3.5722 | 2026-11-17 | false | logic | `lastplace` | no | A join that names no place is left where the fresh state puts it, with no move clock, so its first move is judged from nothing, as before. |
| `joinstandup` | worker | switch | v2.3.4374 | 2026-11-10 | false | logic |  | no | The join restores 0 health and the sweep kills again, as before. |
| `lastplace` | worker | switch | v2.3.3327 | 2026-10-18 | false | logic | `movebudget` | no | Every join takes its place again, and the first move after it is free. |
| `linger` | worker | switch | v2.3.3260 | 2026-10-15 | false | logic |  | no | Every leaver leaves at once again; a lingering body ends on the next sweep. |
| `lingeracc` | worker | switch | v2.3.4921 | 2026-11-12 | false | logic |  | no | A lingering player's unwritten shot and hit counts (the accuracy record) are left in memory, as before. |
| `lookjoin` | worker | switch | v2.3.5733 | 2026-11-17 | false | logic |  | no | ON since v2.3.5733 (card RV's S2, the join's half; decided for the owner while away, 2026-11-17: "Go recommended on all"); thrown (`lookjoin: false`), a join's colour and avatar are any text cut to length, as before, and a stored look is laid over the join whatever it holds. |
| `max_players` | worker | value | v2.3.1982 |  | a number, 1 to the ceiling | logic |  | no | The room's cap on players, never above its bandwidth ceiling. |
| `nearjoin` | worker | switch | v2.3.3276 | 2026-10-17 | false | logic |  | no | New joins get the whole snapshot again, cap off. |
| `pacekeep` | worker | switch | v2.3.5921 | 2026-11-18 | false | logic |  | no | Nine request paces (the dice, a drop, the gamble, the ace flips, the rewards' read, salvage, the race's start, a rest, and since v2.3.6024 the daily spin) are the socket's alone again: a rejoin forgets them (TRAPS §276), as before card V3. |
| `playtrace` | worker | switch | v2.3.6482 | 2026-11-24 | false | logic | `sitting` | no | No test-mode sitting is recorded and no `play_trace:` row written (rows written stay), no check runs in shadow, and the cap `playtrace` is not advertised. |
| `presence2` | worker | switch | v2.3.3250 | 2026-10-14 | false | logic |  | no | Un-advertises presence 2: every phone back on the v2.3.3246 roster. |
| `quiet` | worker | switch | v2.3.3254 | 2026-10-15 | false | logic |  | no | Un-advertises the quiet phone: each phone as before from its next join. |
| `refusejoined` | worker | switch | v2.3.4921 | 2026-11-12 | false | logic |  | no | A refused session is dropped only, not taken out of the world. |
| `rejoinresend` | worker | switch | v2.3.4382 | 2026-11-10 | false | logic |  | no | No re-sends after state_sync, the cap un-advertised. |
| `sitting` | worker | switch | v2.3.6481 | 2026-11-23 | false | logic |  | no | No sitting's card is opened, closed or counted (what a record holds is kept as it is), the actor's `stint` is one a socket again, and the cap `sitting` is not advertised. |
| `takeoverlinger` | worker | switch | v2.3.4432 | 2026-11-10 | false | logic |  | no | A second login takes over a body in a fight as before, rebuilt where the new phone says. |
| `takeoversave` | worker | switch | v2.3.4377 | 2026-11-10 | false | logic |  | no | A second join of the same character does not save what a close would. |

## skills

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `armorforge` | worker | switch | v2.3.3092 | 2026-10-06 | false | logic |  | no | Refuses every armour forge and un-advertises the cap; bars and armour already made are untouched. |
| `bowdraw` | worker | switch | v2.3.4801 | 2026-11-11 | false | logic |  | no | No bow draw is counted and caps.bowDraw is un-advertised. |
| `cookstart` | worker | switch | v2.3.5553 | 2026-11-17 | false | logic |  | no | ON since v2.3.5727 (decided for the owner while away, 2026-11-17: "Go recommended on all"); thrown (`cookstart: false`), a cook's result lands as sent, as before: no start, no fire and no gesture asked of it, only the rate and the 900 ms floor. |
| `cropeat` | worker | switch | v2.3.3537 | 2026-10-21 | false | logic |  | no | No crop is eaten, and caps.cropeat reads false so the bag offers no Eat. |
| `dropgrades` | worker | switch | v2.3.3952 | 2026-11-03 | false | logic |  | no | A monster drop's grade is rolled on the forge's odds again. |
| `exdoor` | worker | switch | v2.3.5213 | 2026-11-14 | false | logic |  | no | The claim on a move (cook, fire, mine, chop, fish, a farm step) takes any value a phone sends again, as the line before the cook door did; the game's own claims pass either way. |
| `farm` | worker | switch | v2.3.3127 | 2026-10-07 | false | logic |  | no | Un-advertises the farm and answers every farm message off; beds, seeds and crops keep their times. |
| `farmorders` | worker | switch | v2.3.3134 | 2026-10-07 | false | logic |  | no | The farm's order board is off: the cap reads false and an order is answered off. |
| `firerefuse` | worker | switch | v2.3.4886 | 2026-11-12 | false | logic |  | no | A fire refused for its log sends only the bag back, not `firemaking_refused`. |
| `fishheal` | worker | switch | v2.3.3260 | 2026-10-15 | false | logic |  | no | Un-advertises the fish ladder and puts the old 92 + 8 x level heal back. |
| `fishvariants` | worker | switch | v2.3.3948 | 2026-11-03 | false | logic |  | no | No fish variant is rolled: every fish plain. |
| `fishweigh` | worker | switch | v2.3.3948 | 2026-11-03 | false | logic |  | no | Counts no catch, weighs nothing and shows no board (what was weighed stays). |
| `forgeladder` | worker | switch | v2.3.3524 | 2026-10-20 | false | logic |  | no | The forge's four ladders as they were, and the cap un-advertised. |
| `gatherhits` | worker | switch | v2.3.2956 | 2026-10-01 | false | logic |  | no | Un-advertises gather hits and answers a phone that joined before with off. |
| `gatherreq` | worker | switch | v2.3.3038 | 2026-10-06 | false | logic |  | no | Lifts the level a resource asks: every resource harvestable at level 1, cap un-advertised. |
| `gscopper` | worker | switch | v2.3.3947 | 2026-11-03 | false | logic |  | no | Stops the boundary heals and the Marketplace's mapping of a new order (the migration stays). |
| `hardenedwood` | worker | switch | v2.3.3139 | 2026-10-07 | false | logic |  | no | Refuses every hardened-wood make, un-advertises it, and bows and staffs harden for gold alone. |
| `hardenkeep` | worker | switch | v2.3.3529 | 2026-10-20 | false | logic |  | no | A failed hardening loses its level again (the old band). |
| `hardenmats` | worker | switch | v2.3.3139 | 2026-10-07 | false | logic |  | no | Hardening asks no material and charges the old x4 gold. |
| `hardenwoodskill` | worker | switch | v2.3.3481 | 2026-10-19 | false | logic |  | no | Bows and staffs are gated on Blacksmithing again for hardening. |
| `harvestdoor` | worker | switch | v2.3.5214 | 2026-11-14 | false | logic |  | no | A gather record without its start time is written again, as the line before the harvest door did (no start builds one today); the sweep could never end such a record. |
| `?harvestdoor` | page | switch | v2.3.5219 | 2026-11-16 | =0 | logic |  | no | The phone's harvest takes any write its own code asks again (a start over one in flight, the window opened early, a strike before it opens), as the lines before the page door could have; the callers still check each first. |
| `harvestgrade` | worker | switch | v2.3.5900 | 2026-11-18 (v2.3.5906) | false | logic |  | no | ON since v2.3.5906 (the owner, 2026-11-18: "Go recommended for anything waiting on me"; card K4 PR 7); thrown (`harvestgrade: false`), every perfect is believed as before, and a phone shows only the grade it graded (harvestgrade.js). |
| `harvestproof` | worker | switch | v2.3.3322 | 2026-10-17 | false | logic |  | no | The old permissive strike and the old perfect, at once. |
| `harvestshard` | worker | switch | v2.3.5903 | 2026-11-18 | false | logic |  | no | ON (card K4 PR 4; TRAPS §154); thrown (`harvestshard: false`), a harvest's shard key is built from whatever zone its node names, as before (a runtime zone mints a key that is no item). |
| `hitladder` | worker | switch | v2.3.3229 | 2026-10-14 | false | logic |  | no | The harvest's hit dice go back to 1..level, cap un-advertised. |
| `meals` | worker | switch | v2.3.3130 | 2026-10-07 | false | logic |  | no | Only the old instant recipes cook; dishes in bags still eat. |
| `nodehp` | worker | switch | v2.3.3251 | 2026-10-14 | false | logic |  | no | Every node back on 5 x (tier + 1), cap un-advertised. |
| `onetoone` | worker | switch | v2.3.3912 | 2026-11-03 | false | logic |  | no | The old five-to-one smelting rows, and caps.onetoone taken back. |
| `pvpheal` | worker | switch | v2.3.3133 | 2026-10-07 | false | logic |  | no | The PvP bite rule (food held back in a fight between players) is off, and caps.pvpheal reads false. |
| `shardcrack` | worker | switch | v2.3.3516 | 2026-10-20 | false | logic |  | no | Un-advertises shard cracking, refuses every crack and combine, and puts the raw gem back on the kill roll. |
| `?skillsreset` | page | switch | v2.3.5205 | 2026-11-14 | =0 | logic |  | no | A smelt's or a forge's pose runs out its seconds after a change of place again, not ended at the zone door. |
| `smelting` | worker | switch | v2.3.2820 | 2026-09-24 | false | logic |  | no | Refuses every smelt and un-advertises the cap; ore and bars untouched. |
| `staffgather` | worker | switch | v2.3.4801 | 2026-11-11 | false | logic |  | no | No staff gather is counted and caps.staffGather is un-advertised. |
| `strikesnap` | worker | switch | v2.3.4642 | 2026-11-11 | false | logic |  | no | A refused harvest strike is silent again. |
| `tierxp` | worker | switch | v2.3.3251 | 2026-10-14 | false | logic | `nodehp` | no | Every harvest back on the old XP, cap un-advertised. |
| `trapcraft` | worker | switch | v2.3.3120 | 2026-10-06 | false | logic |  | no | Making traps is refused. |
| `trapping` | worker | switch | v2.3.3120 | 2026-10-06 | false | logic |  | no | Un-advertises trapping, refuses every arm and stops every roll. |
| `?treefade` | page | switch | v2.3.3345 | 2026-10-18 | =0 | logic |  | no | Trees stay solid when you walk behind them. |
| `volleychip` | worker | switch | v2.3.4385 | 2026-11-10 | false | logic |  | no | A harvest ends on every chip, as before. |

## social

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `alliance` | worker | switch | v2.3.3313 | 2026-10-17 | false | logic | `partykeep` | no | No alliance status, names, wars or board; tags come off at the next vitals echo. |
| `?allydrafts` | page | switch | v2.3.5524 | 2026-11-17 | =0 | logic |  | no | The Saloon's alliance forms keep nothing: a rejoin makes them again empty, what the leader typed lost, as before. |
| `arenaap` | worker | switch | v2.3.3481 | 2026-10-19 | false | logic |  | no | The arena champion is paid gold alone, no AP, and the cap is un-advertised. |
| `arenadoor` | worker | switch | v2.3.5522 | 2026-11-17 | false | logic |  | no | The tournament takes any write its own code asks again (an open over one, a start or crown from any phase, a crown with no champion, a clear while it runs), as the lines before the arena door could have; the callers still check each first. |
| `?arenadoor` | page | switch | v2.3.5531 | 2026-11-17 | =0 | logic |  | no | The phone's arena takes any match its poll asks again (one that is no record), as the line before the arena's page door; the poll writes what the door allows today. |
| `arenaeatgate` | worker | switch | v2.3.4413 | 2026-11-10 | false | logic |  | no | Eating in an arena match is gated by the match flag alone, as before. |
| `arenasettleplan` | worker | switch | v2.3.5089 | 2026-11-14 (v2.3.5095) | false | logic |  | no | An arena match's stakes settle in the old order again (the losers stamped first, then each payout in a write of its own): a restart mid-settlement can lose the stakes. On since v2.3.5095 (the owner's yes; two rows a match). |
| `arenastakeonewrite` | worker | switch | v2.3.4796 | 2026-11-11 | false | logic |  | no | An arena sponsor's stake goes back to its old two writes. |
| `boards2` | worker | switch | v2.3.4355 | 2026-11-10 | false | logic |  | no | Un-advertises the boards with faces: records no spin, stamps no face or level, retires no row. |
| `chatguard` | worker | switch | v2.3.3396 | 2026-10-18 | false | logic |  | no | All three chat guards off: chat and emotes spend the relay bucket again, nothing filtered or cleaned. |
| `clanparty` | worker | switch | v2.3.3321 | 2026-10-17 | false | logic | `partykeep` | no | No clan is turned into a party; clans work as they did. |
| `cleanmore` | worker | switch | v2.3.5814 | 2026-11-17 | false | logic |  | no | The chat cleaner passes braille blanks, the annotation marks and loose tag characters, as before (S6). |
| `dueldoor` | worker | switch | v2.3.5211 | 2026-11-14 | false | logic |  | no | A resolved duel's end can be written again, as the line before the duel door would have (nothing does today). |
| `?dueldoor` | page | switch | v2.3.5529 | 2026-11-17 | =0 | logic |  | no | The phone's duel takes any write its own code asks again (a duel with no opponent, an end that leaves one), as the lines before the duel's page door; every caller writes what the door allows today. |
| `duelzone` | worker | switch | v2.3.4371 | 2026-11-10 | false | logic |  | no | No zone starts a duel's clock (one running is cleared at the next zone write). |
| `emotemoves` | worker | switch | v2.3.3392 | 2026-10-18 | false | logic | `emotes` | no | No emote move is relayed and no pose kept; the plain emotes go on. |
| `emotes` | worker | switch | v2.3.3391 | 2026-10-18 | false | logic |  | no | No emote is relayed, and caps.emotes false shuts the picker at the next join. |
| `freezedevice` | worker | switch | v2.3.5621 | 2026-11-17 (v2.3.6000) | false | logic |  | no | Thrown (false), a freeze holds the frozen character only, as before.  Unset, the default, ON since v2.3.6000 (the owner, 2026-11-17: "I think turn all of them on then we monitor usage cost"): a freeze also refuses a NEW character (no login, no record yet) made on a phone the frozen character has played on, by the game's own device record; never an existing character's join, never a phone one of the owner's own characters has joined from (kept for good), nor a join naming one. |
| `friendfix` | worker | switch | v2.3.5811 | 2026-11-17 | false | logic |  | no | An accept adds each side only while its own list has room (a one-sided friendship possible), a remove asks only the remover's list, and received requests never run out, as before (ACC-5, SEC-F4). |
| `invitepace` | worker | switch | v2.3.5624 | 2026-11-15 | false | logic |  | no | A trade invite card and a friend request card go every time again (no 5-second pace a target). |
| `leaderidleat` | worker | switch | v2.3.4378 | 2026-11-10 | false | logic |  | no | The party leader's idle clock counts only a `seen` above 0, as before. |
| `lookform` | worker | switch | v2.3.5819 | 2026-11-18 | false | logic |  | no | A `track` sets `avatar` and `color` to any text again, and the look's `rpgData` keeps the phone's own clan tag, clan name and pet name, as before (S2's track half, S3). |
| `?lookform` | page | switch | v2.3.5807 | 2026-11-17 | =0 | logic |  | no | Another player's avatar and colour are drawn whatever they hold, as before (S2: a picture of their choosing, or an address of theirs every phone that looked fetched from). |
| `mutehides` | worker | switch | v2.3.5806 | 2026-11-17 | false | logic |  | no | A whisper to a player who muted you is answered with silence (a name nobody holds: no-such-player), and a party invite reaches them, as before (S8). |
| `namestaff` | worker | switch | v2.3.5814 | 2026-11-17 | false | logic |  | no | A new pet name, alliance name or tag is held only to its own form, as before: blank names and staff words pass (S7). |
| `partydoor` | worker | switch | v2.3.5212 | 2026-11-14 | false | logic |  | no | A player can be put in a party that does not list them, as the lines before the party door could have (nothing does today). |
| `?partydoor` | page | switch | v2.3.5529 | 2026-11-17 | =0 | logic |  | no | The phone's party takes any write its own code asks again (a roster that is no record, a clear that writes one), as the lines before the party's page door; every caller writes what the door allows today. |
| `partykeep` | worker | switch | v2.3.3276 | 2026-10-17 | false | logic |  | no | Parties are not kept: the old cap and the away window remove a dropped member. |
| `posedoor` | worker | switch | v2.3.5216 | 2026-11-15 | false | logic |  | no | A held pose takes any id a caller asks, and the dead can be written posing, as the line before the pose door could have (the phone's pose handler still checks both first). |
| `power` | worker | switch | v2.3.5481 | 2026-11-14 | false | logic |  | no | Un-advertises the power index: no board report carries one, so the Power board empties as players report and the other boards are as they were. |
| `race` | worker | switch | v2.3.3525 | 2026-10-20 | false | logic |  | no | Lil Bro's race un-advertised and none started. |
| `reportring` | worker | switch | v2.3.5623 | 2026-11-15 | false | logic |  | no | A chat report quotes the speaker's last 3 lines in any lane again, not the lines the reporter could have received. |
| `reqincap` | worker | switch | v2.3.5709 | 2026-11-17 | false | logic |  | no | No ceiling on the friend requests a player receives, as before (the 51st and every one after kept). |
| `silence` | worker | switch | v2.3.5621 | 2026-11-16 | false | logic |  | no | No silence is checked: every character speaks (the owner's silences are kept, and hold again when it is put back). |
| `?skulldoor` | page | switch | v2.3.5533 | 2026-11-17 | =0 | logic |  | no | Your skull on the phone takes any write its own code asks again (a kind that is no skull, a time that is no number), as the lines before the fight's page door; only a relayed threat with a malformed countdown is refused today. |
| `?socialreset` | page | switch | v2.3.5204 | 2026-11-14 | =0 | logic |  | no | A race the worker forgot at a reconnect stays on the phone until its own clock lets it go, as before. |
| `spar` | worker | switch | v2.3.3265 | 2026-10-16 | false | logic |  | no | No sparring clones: every live clone goes on the next tick and the cap is withdrawn. |
| `statboards` | worker | switch | v2.3.5484 | 2026-11-14 | false | logic |  | no | Un-advertises the stat boards: no board report carries the points allocated, so those boards empty as players report; every other board is as it was. |
| `storemute` | worker | switch | v2.3.5806 | 2026-11-17 | false | logic |  | no | A muted sender's shop-thread line is stored and shown when the thread is opened, as before (S5: the mute held the live send only). |

## townsfolk

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `?folkwalk` | page | switch | v2.3.3949 | 2026-11-03 | =0 | logic |  | no | The townsfolk stand at their spots, not walk their day. |
| `?posedoor` | page | switch | v2.3.5520 | 2026-11-16 | =0 | logic |  | no | The phone's held pose takes any write its own code asks again (a pose by the dead, one with no place, a stand-up of none), as the lines before the page door could have; sendMove and endOwnPose still check each first. |
| `tour` | worker | switch | v2.3.3525 | 2026-10-20 | false | logic |  | no | Un-advertises the tour's two givers. |
| `?townchat` | page | switch | v2.3.3901 | 2026-11-03 | =0 | logic |  | no | The townsfolk do not chat to each other. |
| `?townsfolkreset` | page | switch | v2.3.5203 | 2026-11-14 | =0 | logic |  | no | A held pose ends a frame after a change of place again, on its own check, not at the zone door. |

## ui

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `?afterpaint` | page | switch | v2.3.6244 | 2026-11-18 | =0 | logic |  | no | The door prompt is placed inside React's commit, as before (card HB: the coach's and the band's measures too, as their PRs land). |
| `?bandbeat` | page | switch | v2.3.4450 | 2026-11-10 | =0, off, false | logic |  | no | The band's 200 ms redraw runs in one piece, as before. |
| `?create` | page | lever | v2.3.1861 |  | =1 | none |  | no | Goes straight to the character creator. |
| `?guest` | page | lever | v2.3.1116 |  | =1 | none |  | no | This tab plays as a fresh guest with its own id. |
| `?jumpicon` | page | value | v2.3.3721 |  | a glyph's name | logic |  | no | Picks the jump button's glyph. |
| `?login` | page | lever | v2.3.1839 |  | =1 | none |  | no | Shows the login door. |
| `?loginspin` | page | switch | v2.3.4295 | 2026-11-24 (v2.3.6560) | =1 (the offer at login comes back), =0 (never by itself: the default; the harness passes it) | logic |  | no | v2.3.6560: the login wheel offers itself once after login again, as before (closed without a spin it waits for its button; the default, and `=0`: it never opens by itself, its button at the right of the top bar is the way in). |
| `?nomapdetail` | page | switch | v2.3.3319 | 2026-10-17 | present | memory |  | no | No detail tiles on the world map. |
| `?noresume` | page | lever | v2.3.781 |  | =1 | none |  | no | Does not walk back into the world on load. |
| `?npcprox` | page | switch | v2.3.3583 | 2026-10-23 | present | logic |  | no | Walking up to a townsperson opens them again (the old opener), to compare. |
| `?oneband` | page | switch | v2.3.4012 | 2026-11-03 (v2.3.4092) | =0 | logic |  | no | The old side column, not the one band at the bottom. |
| `?owedrebuild` | page | switch | v2.3.3886 | 2026-10-29 | =0 | logic |  | no | A second graphics loss inside a rebuild is not owed a rebuild. |
| `?p3colour` | page | switch | v2.3.2597 | 2026-09-17 | =0 | logic |  | no | The hero sheet's stats lose their colours. |
| `?p3cols` | page | lever | v2.3.2597 |  | =1 | none |  | no | The hero sheet in one column, for the comparison. |
| `?playvwlive` | page | switch | v2.3.4875 | 2026-11-11 | =1 | logic |  | no | The play view is measured on every read, as before. |
| `?rankstyle` | page | switch | v2.3.5503 | 2026-11-25 | =0 | logic |  | no | The Ranks page before the owner's 2026-11-25 mockup: the boards in a list down the left, the podium over the table (card LB part 2; src/ui/mobile/dash/LeaderboardPanel.jsx). |
| `?starcue` | page | switch | v2.3.3872 | 2026-10-29 | =0 | logic |  | no | No star cue over what to do next. |
| `?tradeside` | page | value | v2.3.3856 |  | =0 or =1 | logic |  | no | Picks which side the trade window's lanes are on. |
| `?wdgeterror` | page | switch | v2.3.3450 | 2026-10-18 | present | logic |  | no | The world map's thumbnail asks the chip for errors every time, as before. |
| `?windowdoor` | page | switch | v2.3.5526 | 2026-11-17 | =0 | logic |  | no | What is open over the world is written to its old fields alone (S._uiBusy, S._npcProxLatch), as the lines before the window door; S._windows is not kept (nothing reads it to draw). |

## wire

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `bodycap` | worker | switch | v2.3.5720 | 2026-11-17 | false | logic |  | no | The room's web routes read a body whole again, of any size, before any route asks who sends (the outer router's own check is the worker setting `BODY_CAP`, not this flag). |
| `bundle` | worker | switch | v2.3.3254 | 2026-10-15 | false | logic |  | no | Stops advertising message bundles: each phone sends its messages one by one from its next join. |
| `ceilfair` | worker | switch | v2.3.5728 | 2026-11-17 | false | logic |  | no | A socket's share of the room's ceiling is the plain share again (4,000 over the room's sockets: 33 a second at 120), so a crowd fight's honest phones lose messages while a flood holds the room past it, as before. |
| `?conndoor` | page | switch | v2.3.5528 | 2026-11-17 | =0 | logic |  | no | The phone's socket phase takes any word a caller writes, as the lines before the connection door (every caller writes a word of the list today). |
| `?diet` | page | switch | v2.3.3726 | 2026-10-28 (v2.3.3744) | =1 or =0 (kept for the tab) | logic |  | no | Puts this phone on the move diet (=1) or keeps it off (=0), whatever the worker says for everyone. |
| `disable_weapon_drops` | worker | switch | v2.3.1150 | 2026-07-03 | true | logic |  | no | Thrown, weapon drops stop rolling (caps.weaponDrops stays true, so no phone mints its own). |
| `duelquiet` | worker | switch | v2.3.5731 | 2026-11-17 | false | logic |  | no | ON since v2.3.5731 (card RV's review; decided for the owner while away, 2026-11-17: "Go recommended on all"); thrown (`duelquiet: false`), a duel's challenge, wager, accept and decline go to every phone in the room again, as before (each phone acts only on its own). |
| `gidnames` | worker | switch | v2.3.5196 | 2026-11-17 | false | logic |  | no | A weapon in the stash is read by its place alone, as before: a request sent as the stash moved acts on the weapon now at that place (the next one). |
| `guestshare` | worker | switch | v2.3.5729 | 2026-11-17 | false | logic |  | no | ON since v2.3.5729 (decided for the owner while away, 2026-11-17: "For all decisions waiting on me just go recommended."); thrown (`guestshare: false`), guests may hold every place, a played character waits outside a full room as before, and an IPv6 address is counted by its /56 at the widest. |
| `heapforget` | worker | switch | v2.3.5544 | 2026-11-17 | false | logic |  | no | A guest who left stays in the room's maps (a refused strike with its raw zone, the arrow's refusals, the fire's clock, the chat buckets and reports), as before: the red team's RT-1 N11 open again. |
| `ip56` | worker | switch | v2.3.5584 | 2026-11-17 | false | logic |  | no | The address limits count an IPv6 address by its /64 alone again (a whole /56 is one customer, at three times the /64's line, while on). |
| `ip64` | worker | switch | v2.3.5581 | 2026-11-16 | false | logic |  | no | The address limits count each IPv6 address apart again, as before (an IPv6 line is one address by its /64 while on). |
| `ip_joins_min` | worker | value | v2.3.3274 |  | a number, 0 to 10000 | logic |  | no | Joins an address may make a minute (0 to 10000; 0 is no limit). |
| `ip_sockets` | worker | value | v2.3.3274 |  | a number, 0 to 1000 | logic |  | no | Sockets an address may hold at once (0 to 1000; 0 is no limit). |
| `movediet` | worker | switch | v2.3.3204 | 2026-10-13 | false | logic |  | no | Un-advertises the move diet: each phone sends every move again from its next join. |
| `pileleft` | worker | switch | v2.3.4383 | 2026-11-10 | false | logic |  | no | Stops the death pile's time-left fields on the wire. |
| `relaybytes` | worker | switch | v2.3.5543 | 2026-11-16 | false | logic |  | no | Every relay goes into the room's queue whatever its size, as before: no bound on one relay's bytes, on a socket's relay bytes a second, or on the queue's (the red team's RT-1 N10 open again). |
| `relaylist` | worker | switch | v2.3.3304 | 2026-10-17 | false | logic |  | no | Relays every type that is not privileged again (the old deny-list). |
| `relaytyped` | worker | switch | v2.3.5724 | 2026-11-17 | false | logic |  | no | A relay keeps every field the phone put in it, each as sent, and the room's send reaches a socket that never joined, as before. |
| `reqonce` | worker | switch | v2.3.5194 | 2026-11-17 | false | logic |  | no | No request id is read: a repeat of a market order, a store listing, buy, bid, accept or cancel, an auction offer, a bank move, a chest, a cape or a spin acts again as before (the bank, chest, cape and spin still read an older phone's opId), and no answer echoes an id. |
| `reqstamp` | worker | switch | v2.3.5194 | 2026-11-17 (v2.3.6000) | false | logic | `reqonce` | no | Thrown (false), a request with no record of its own keeps its first answer for the sitting only, as before.  Unset, the default, ON since v2.3.6000 (the owner, 2026-11-17: "I think turn all of them on then we monitor usage cost"): such a request (a store buy, bid, accept or cancel, a market cancel, an auction offer) writes a lasting stamp row (oplog:rq:<pid>:<reqId>, pruned at 48 h): one row a request. |
| `?room` | page | lever | v2.3.217 |  | a room's name | none |  | no | Joins the named room, not the lobby's. |
| `roomceiling` | worker | switch | v2.3.5545 | 2026-11-17 | false | logic |  | no | No ceiling on the room's messages in: a full room of sockets each inside its own budget is ~14,400 a second, all taken, as before (the red team's RT-1 N5 open again). |
| `sendcount` | worker | switch | v2.3.5193 | 2026-11-17 | false | logic |  | no | The send door writes every frame as before but counts none: the day's book carries no `send` part (the frames a type and their length). |
| `?thawjudge` | page | switch | v2.3.6309 | 2026-11-19 | =0 | logic |  | no | Every gap of over 5 s in the page's own beats rejoins an open socket, as before, even when the worker's pings show the socket carried the gap (a slow device rejoins on every gap). |
| `?wheelwhole` | page | switch | v2.3.3318 | 2026-10-17 | present | logic |  | no | Asks for every world monster on the way in, not only those near. |
| `wiredoor` | worker | switch | v2.3.5184 | 2026-11-14 | false | logic |  | no | Every message and the room's web routes reach their handlers unchecked again, as before the wire door; a mute of `__proto__` is taken again. |
| `wireform` | worker | switch | v2.3.6443 | 2026-11-24 | false or 'count' | logic | `wiredoor` | no | A named field is held only to the old door's checks again (no number that is not finite, a words field a string of 2,000): `n: "5"`, `-5` or a 15,000-character id reaches its handler; `'count'` counts each one and lets it in. |
| `?wirereset` | page | switch | v2.3.5207 | 2026-11-14 | =0 | logic |  | no | The monsters' balls in flight, their warnings on the ground and the impact rings carry over a change of place again, emptied only where a way out did it by hand or by their own clock. |

## world

| name | side | kind | born | on | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|---|
| `?bigtown` | page | lever | v2.3.3299 |  | present (or =a number) | none |  | no | A preview: the short world drawn in the long room. |
| `?bodyhere` | page | switch | v2.3.4831 | 2026-11-11 | =0 | logic |  | no | The body is placed the old way after a reconnect, for one phone. |
| `bosschest` | worker | switch | v2.3.3565 | 2026-10-22 | false | logic |  | no | A dungeon boss drops no chest. |
| `clearxp` | worker | switch | v2.3.3565 | 2026-10-22 | false | logic |  | no | A dungeon clear's XP goes to the old counter only. |
| `disable_dungeons` | worker | switch | v2.3.1150 | 2026-07-03 | true | logic |  | no | Thrown, every dungeon start is refused with a message. |
| `dungeonbag` | worker | switch | v2.3.3556 | 2026-10-22 | false | logic |  | no | A dungeon death drops its pile and empties the bag, as before. |
| `dungeondoor` | worker | switch | v2.3.5215 | 2026-11-14 | false | logic |  | no | A dungeon run's end and its boss can be written again, as the lines before the dungeon door could have (the tick asks neither twice today). |
| `?dungeondoor` | page | switch | v2.3.5535 | 2026-11-17 | =0 | logic |  | no | Your run on the phone takes any write its own code asks again (an enter that is not in, a leave that is), as the lines before the dungeon's page door; every caller writes what the door allows today. |
| `dungeonground` | worker | switch | v2.3.5725 | 2026-11-17 | false | logic |  | no | A Workshop dungeon start (one naming no mouth) is taken wherever the player stands, out in a land mid-fight too, as before. |
| `dungeonlive` | worker | switch | v2.3.4423 | 2026-11-10 | false | logic |  | no | Any `dungeon:` id on its shape is taken again, live run or not. |
| `eventplace` | worker | switch | v2.3.3245 | 2026-10-14 | false | logic |  | no | Every event goes to everyone again, from the next tick. |
| `fightlock` | worker | switch | v2.3.3183 | 2026-10-12 | false | logic |  | no | The bag is no longer locked in a fight on the roads the fight lock's table names `fightlock`. |
| `fightlockmonster` | worker | switch | v2.3.4841 | 2026-11-11 | false | logic |  | no | A fight with a monster no longer locks the bag in No man's land. |
| `?folkbake` | page | switch | v2.3.4355 | 2026-11-10 | =0 | logic |  | no | The townsfolk are baked when first met, not behind the loading screen. |
| `groundlean` | both | switch | v2.3.3717 | 2026-10-28 | off_groundlean: true; ?groundlean=0 (read by the ground worker in public/tools/ground/: out of reach) | memory |  | no | The ground is built by the old builder, not the lean one. |
| `?groundsend` | page | switch | v2.3.6382 | 2026-11-18 | =0 | logic |  | no | On the board the ground asks its worker for at most 3 pieces at a time, as on foot, not 6 (wheelGround.js RIDE_IN_FLIGHT). |
| `?groundwait` | page | switch | v2.3.3709 | 2026-10-28 | =0 | logic |  | no | The ground starts building at once, not after the renderer is ready. |
| `?halloween` | page | lever | v2.3.3395 |  | =1, =0, on or off | none |  | no | Forces the Halloween season on or off. |
| `?healms` | page | lever | v2.3.3230 |  | a number of ms | none |  | no | A test's own time for a building's hits to be forgotten. |
| `heaplean` | both | switch | v2.3.3717 | 2026-10-28 | off_heaplean: true; ?heaplean=0, off, false | memory |  | no | The map's leftovers are kept, not let go. |
| `?mappin` | page | switch | v2.3.3879 | 2026-10-29 | =0 | logic |  | no | No pins on the world map. |
| `?nmlask` | page | switch | v2.3.3253 | 2026-10-14 | =0 | logic |  | no | No man's land never asks before a fight. |
| `?nmlaskms` | page | lever | v2.3.3253 |  | a number of ms (1 to 60 s) | none |  | no | A test's own length for No man's land's question. |
| `nmlchoice` | worker | switch | v2.3.3530 | 2026-10-20 | false | logic |  | no | The No man's land choice is ignored: the first blow starts the skulls; cap off. |
| `nmlgroup` | worker | switch | v2.3.3530 | 2026-10-20 | false | logic |  | no | The last giver alone, as before, no `bys`; cap off. |
| `nmllock` | worker | switch | v2.3.3770 | 2026-10-29 | false | logic |  | no | No No man's land lock set or enforced; the red skull stays at a death; cap off. |
| `nmlnear` | worker | switch | v2.3.3690 | 2026-10-28 | false | logic |  | no | No man's land's rule as it was (FIRST_TIER 2). |
| `nmlsteps` | worker | switch | v2.3.3767 | 2026-10-29 | false | logic |  | no | No man's land climbs by the tier's number, not a step a monster level. |
| `?nolife` | page | lever | v2.3.2990 |  | present | none |  | no | Leaves the buildings still (no smoke, lamps, sparks), to tell their cost. |
| `nomansland` | worker | switch | v2.3.3058 | 2026-10-06 | false | logic |  | no | No man's land off: no hit, no skull, nothing taken on a death; the safe Wheel of v2.3.3057. |
| `?noobjects` | page | lever | v2.3.2990 |  | present | none |  | no | Leaves the world bare, the ground alone, to tell the objects' cost. |
| `?nospawn` | page | lever | v2.3.2990 |  | present | none |  | no | The world trial: no monsters spawned. |
| `?noswim` | page | switch | v2.3.3003 | 2026-10-03 | present | logic |  | no | All the water is a wall again: no swimming. |
| `?onepic` | page | switch | v2.3.4885 | 2026-11-12 (v2.3.4990) | =0 | memory |  | no | Every calm player is drawn in layers, not as one picture. |
| `?onepicnear` | page | lever | v2.3.4885 |  | a number (0 to 999) | none |  | no | QA: keeps only the nearest N players layered, the rest a picture. |
| `partydungeon` | worker | switch | v2.3.3573 | 2026-10-23 | false | logic |  | no | The Grotto of v2.3.3540 again, cap off. |
| `?placing` | page | lever | v2.3.2999 |  | =2 | none |  | no | A preview: the second placing of the world's objects, on the short world. |
| `?plaintown` | page | lever | v2.3.3299 |  | present | none |  | no | A preview: the town with no objects, on the short world. |
| `?repairms` | page | lever | v2.3.2995 |  | a number of ms | none |  | no | A test's own time for a broken object to mend. |
| `retiredlands` | worker | switch | v2.3.4675 | 2026-11-11 | false | logic |  | no | Opens the retired lands again at once. |
| `?tod` | page | lever | v2.3.2703 |  | a phase name or a number (0 to 1) | none |  | no | Sets the time of day. |
| `?trial` | page | lever | v2.3.2990 |  | present | none |  | no | The world trial's on-screen readout. |
| `?trialhud` | page | lever | v2.3.2990 |  | present | none |  | no | The world trial's on-screen readout (the same as ?trial). |
| `?veildoor` | page | switch | v2.3.5525 | 2026-11-17 | =0 | logic |  | no | The world's veils are written to their old fields alone, as the lines before the loading door; S._veils is not kept (nothing reads it to draw). |
| `?wayback` | page | lever | v2.3.3021 |  | present | none |  | no | The world trial: the way back shown. |
| `wheel5x` | worker | switch | v2.3.3299 | 2026-10-17 | false | logic |  | no | A room that has not yet chosen plays the short Wheel for its whole life. |
| `wheeldeep` | worker | switch | v2.3.3013 | 2026-10-03 | false | logic |  | no | A Wheel spawned after it has the first tier's 48 monsters alone. |
| `wheeldungeons` | worker | switch | v2.3.3013 | 2026-10-03 | false | logic |  | no | Closes every Wheel dungeon mouth and un-advertises them. |
| `wheelmonsters` | worker | switch | v2.3.2990 | 2026-10-02 | false | logic |  | no | Un-advertises the Wheel's monsters; a Wheel spawned after it is empty. |
| `wheelnear` | worker | switch | v2.3.3318 | 2026-10-17 | false | logic |  | no | Every arrival gets the whole monster list again, cap off. |
| `wheelnodes` | worker | switch | v2.3.3012 | 2026-10-03 | false | logic |  | no | Un-advertises the Wheel's nodes; a Wheel spawned after has none. |
| `wheelpast20` | worker | switch | v2.3.3093 | 2026-10-06 | false | logic |  | no | A Wheel spawned after it stops at the first stage (no levels past 20). |
| `wheelpursue` | worker | switch | v2.3.3056 | 2026-10-06 | false | logic |  | no | The old pursuit rule for monsters and the commons. |
| `wheelrest` | worker | switch | v2.3.3299 | 2026-10-17 | false | logic |  | no | Every monster runs every tick again (far monsters do not rest). |
| `wheelslope` | worker | switch | v2.3.3320 | 2026-10-17 | false | logic |  | no | A Wheel spawned after it is levels 1-2 again. |
| `wheelstep` | worker | switch | v2.3.4540 | 2026-11-10 | false | logic |  | no | A page that joins the Wheel off its step (a preview) is no longer kept out of harm and dealing nothing. |
| `?worldreset` | page | switch | v2.3.5208 | 2026-11-14 | =0 | logic |  | no | Your arrows, the hit and death particles and the place's air are emptied only by each way's own clear block again (the respawn's 0.4 s after its flip, under its veil), not at the zone door. |
| `zonedoor` | worker | switch | v2.3.5537 | 2026-11-17 | false | logic |  | no | A place that is no zone can be written on a player, as the lines before the zone door could have; the move's judge still refuses one first. |
| `zonejudge` | worker | switch | v2.3.4565 | 2026-11-11 | false | logic |  | no | The zone judge off (but its rule R3, the retired lands, stays: `retiredlands`). |
