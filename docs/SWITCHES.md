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
- **born**: the change that made it (v2.3.N). **thrown**: what throws it (on the worker the value; on the page its form).
- **risk**: what the old way guards against: `logic`, `memory`, `chip` (`none` for a lever). **needs**: the switches it
  turns off with. **fallback**: the trigger that still uses its old way, or no.

**Out of reach** (no row, said here): the QA pages (`src/*-harness.html`, `public/tools/`), the phone scenarios' own
addresses (`tools/qa/`), `localStorage` toggles, and the worker's `env` settings. A cap is a row only where the worker
reads it as a flag or a comment promises it as a kill switch; any other cap's override is the emergency lever of
`docs/specs/liveops.md` ("Caps override").

251 rows: 244 switches, 6 values, 1 levers, in 23 systems.

## audio

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `sfxcache` | both | switch | v2.3.3714 | off_sfxcache: true; ?sfxcache=0, off | memory |  | no | Sounds are held whole again, not only while needed. |
| `voicecap` | both | switch | v2.3.3727 | off_voicecap: true; ?voicecap=0, off | memory |  | no | A crowd of one sound plays every voice again, not a few. |
| `?foldgentle` | page | switch | v2.3.5045 | =0, off, false | logic |  | no | A sound is folded to mono in one go again, not in turns between frames. |

## bots

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `blockarc` | worker | switch | v2.3.4605 | false | logic |  | no | A raised shield blocks all round again, not only in its arc. |
| `botrecordkeep` | worker | switch | v2.3.4379 | false | logic |  | no | The bot fingerprint records go back to the old eviction of anyone, online or not. |
| `botsig_reverify` | worker | switch | v2.3.3724 | true | logic |  | no | Thrown, a join from an account the bot signals flagged must pass the account check again. |
| `cookshield` | worker | switch | v2.3.4605 | false | logic |  | no | The cook and fire shield holds on the move's edge alone, without the worker's own fire. |
| `disable_botsig` | worker | switch | v2.3.3724 | true | logic |  | no | Thrown, the bot signals are not judged at all. |
| `hitproof` | worker | switch | v2.3.3334 | false | logic |  | no | A hit claim is taken as before, without the weapon, reach and pace checks. |
| `parryrearm` | worker | switch | v2.3.4605 | false | logic |  | no | Every raise parries again, however soon after the last. |
| `swingguard` | worker | switch | v2.3.4605 | false | logic |  | no | A sword's claim leaves the guard as it was. |

## combat

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `accuracy` | worker | switch | v2.3.4480 | false | logic |  | no | Counts no hits for the accuracy record, answers its asks with off and un-advertises the cap (what is stored stays). |
| `areachoice` | worker | switch | v2.3.3528 | false | logic |  | no | The PvP area rule counts a blow either way, not only one you landed. |
| `bigorb` | worker | switch | v2.3.2849 | false | logic |  | no | Un-advertises the staff's big orb: a phone that joins after fires the old three orbs, with no blast. |
| `bowvolley` | worker | switch | v2.3.2808 | false | logic |  | no | Un-advertises the bow's volley: a phone that joins after fires the old single arrow and blast. |
| `disable_threats` | worker | switch | v2.3.1150 | true | logic |  | no | Thrown, every relayed threat handshake is dropped. |
| `elemup` | worker | switch | v2.3.3518 | false | logic |  | no | Un-advertises the element bonus and takes it away. |
| `fightlockarmor` | worker | switch | v2.3.4582 | false | logic |  | no | Armour put on or taken off in a fight is no longer refused. |
| `fightlockdoor` | worker | switch | v2.3.4510 | false | logic |  | no | A dungeon's mouth and the party pull are no longer locked in a fight. |
| `fightlockequip` | worker | switch | v2.3.4510 | false | logic |  | no | A spare weapon or shield put on in a fight is no longer refused. |
| `fightlockreset` | worker | switch | v2.3.4581 | false | logic |  | no | A character's restart is no longer refused while the fight lock holds. |
| `fightlocktable` | worker | switch | v2.3.4510 | false | logic |  | no | Forging, duels and the other ways to turn goods into what the loss does not take are no longer refused in a fight. |
| `freeswing` | worker | switch | v2.3.4520 | false | logic |  | no | No phone gets the free swing; every phone is told. |
| `freeswingbonus` | worker | switch | v2.3.4520 | false | logic |  | no | The free swing never pays its timing bonus. |
| `killroll` | worker | switch | v2.3.3209 | false | logic |  | no | Every drop on its own roll again, nothing sent over the monster. |
| `monsterguardbreak` | worker | switch | v2.3.4393 | false | logic |  | no | A monster's hit on no stamina no longer breaks the guard. |
| `monsterhold` | worker | switch | v2.3.3513 | false | logic |  | no | The element hold rule off: monsters move as before real gems. |
| `mummyroar` | worker | switch | v2.3.3621 | false | logic |  | no | Mummies swing as before, without the roar. |
| `nostatcap` | worker | switch | v2.3.3578 | false | logic |  | no | Un-advertises the lifted stat bound and brings the old per-level bound back. |
| `oneformula` | worker | switch | v2.3.3260 | false | logic |  | no | The combat from before the one formula: old health, hits, specials and PvP. |
| `perfectbow` | worker | switch | v2.3.4550 | false | logic |  | no | The bow as before its perfect strike (the sword's unchanged). |
| `pvpbalance` | worker | switch | v2.3.3260 | false | logic | `oneformula` | no | The PvP resolver exactly as before: the phone's claim x 0.5, the 300 ms lane. |
| `pvpbrew` | worker | switch | v2.3.3133 | false | logic |  | no | Un-advertises the brew in PvP: a new page folds it into its claims as before. |
| `pvpextras` | worker | switch | v2.3.3264 | false | logic | `oneformula`, `pvpbalance` | no | Takes every PvP extra off players at once. |
| `pvplunge` | worker | switch | v2.3.3262 | false | logic |  | no | No lunge at a player: caps.pvplunge false and the dazed gates off. |
| `shieldgem` | worker | switch | v2.3.3187 | false | logic |  | no | Un-advertises the shield gem and refuses every ask. |
| `shieldwear` | worker | switch | v2.3.3091 | false | logic |  | no | Un-advertises shield wear, ignores every report, and No man's land takes no shield on a loss. |
| `shockspark` | worker | switch | v2.3.3518 | false | logic |  | no | Un-advertises the storm gem's spark and sparks nothing. |
| `slimeshove` | worker | switch | v2.3.3747 | false | logic |  | no | No slime shove. |
| `soakhit` | worker | switch | v2.3.3518 | false | logic |  | no | A soaked monster hits as hard as a dry one, and the cap is off. |
| `swordconvert` | worker | switch | v2.3.3895 | false | logic |  | no | Stops the sword conversion's boundary heals and the Forge's mapping. |
| `weapongem` | worker | switch | v2.3.3513 | false | logic |  | no | Un-advertises the weapon gem, refuses every ask, and the fight goes back on the claimed element. |
| `whirlWindup` | worker | switch | v2.3.2820 | false | logic |  | no | The whirlwind is instant again, with no wind-up. |
| `xp_mult` | worker | value | v2.3.1150 | a number, 1 to 4 | logic |  | no | Multiplies kill XP (the 2x weekend lever), 1 to 4. |

## data

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `soundgate` | both | switch | v2.3.3800 | off_soundgate: true; ?soundgate=0, off, false, no | logic |  | no | The world's sound plays under the loading screen again. |

## device

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `lookpalette` | both | switch | v2.3.3716 | off_lookpalette: true; ?lookpalette=0 (=1 builds it anyway) | chip |  | onWindows, onMac in src/game/lookPaletteChoice.js | Each look's copy is baked on first sight again, not coloured on the chip. |
| `viewcap` | both | switch | v2.3.4054 | off_viewcap: true; ?viewcap=0 (=1 forces it) | logic |  | no | A wide screen sees its old wider view of the world. |
| `?pixbudget` | page | switch | v2.3.5140 | =0 (off), or a number: the budget to try | chip |  | no | The drawing resolution is no longer held to the pixel budget. |

## economy

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `ahonewrite` | worker | switch | v2.3.4500 | false | logic |  | no | An auction-house listing goes back to its old two writes, restart hole and all. |
| `armorstashlive` | worker | switch | v2.3.4840 | false | logic |  | no | The armour stash list goes back to being sent only at the join. |
| `bank` | worker | switch | v2.3.3785 | false | logic |  | no | Un-advertises the bank and refuses every deposit and withdrawal; what is in a vault stays and still shows. |
| `dailyChest` | worker | switch | v2.3.2820 | false | logic |  | no | Un-advertises the daily chest and pays the day's reward as plain gold again (a chest in a bag waits). |
| `dailyquests` | worker | switch | v2.3.3140 | true | logic |  | no | Thrown (true), the put-away daily quests come back: counting, rerolls and claims. |
| `dailyspin` | worker | switch | v2.3.3140 | false | logic |  | no | Un-advertises the daily spin and refuses every spin (nothing taken away). |
| `deathpilesave` | worker | switch | v2.3.4384 | false | logic |  | no | A death pile gets no stored row (piles in memory only, as before); rows already written are still cleaned up. |
| `dice` | worker | switch | v2.3.3393 | false | logic |  | no | No dice roll, and caps.dice false at a phone's next join (/roll is a plain line again). |
| `disable_event_capes` | worker | switch | v2.3.2028 | true | logic |  | no | Thrown, the event's capes stop dropping. |
| `disable_offer_sweep_all` | worker | switch | v2.3.4412 | true | logic |  | no | Thrown, the store's offer sweep goes back to the old first-20 pass. |
| `econ` | worker | switch | v2.3.5085 | false | logic |  | no | Nothing is counted into a character's minted and burned (`_econ`) or the day's book's economy part; gold and items move as before. |
| `event_cape_rate` | worker | value | v2.3.2027 | a number | logic |  | no | The event cape's drop rate, a number in place of the shipped one. |
| `gearlevel` | worker | switch | v2.3.3544 | false | logic | `onelevel` | no | Armour, shields and amulets ask Defense points and Magic again, not your level. |
| `gearresend` | worker | switch | v2.3.4386 | false | logic |  | no | The level gate's refusal is silent again (no gear sent back). |
| `giftclosed` | worker | switch | v2.3.4375 | false | logic | `trade2` | no | The old one-way gift opens again beside the trade window. |
| `goldlog` | worker | switch | v2.3.4903 | false | logic |  | no | The gold log notes nothing. |
| `goldonesum` | worker | switch | v2.3.4803 | false | logic |  | no | Every gold road goes back on its step-1 sum. |
| `itemdrop` | worker | switch | v2.3.3473 | false | logic |  | no | Dropping an item on the ground is refused (off). |
| `loginspin` | worker | switch | v2.3.4285 | false | logic |  | no | Un-advertises the login wheel and refuses every ask. |
| `mktsettle` | worker | switch | v2.3.4505 | false | logic |  | no | A market leftover with a settle note is healed the old way. |
| `revealbag` | worker | switch | v2.3.3951 | false | logic |  | no | Un-advertises the bag's reveal and brings back the at-once reveal. |
| `risechest` | worker | switch | v2.3.4438 | false | logic |  | no | The rise chest's cap goes and an ask is answered off. |
| `salvage` | worker | switch | v2.3.3141 | false | logic |  | no | Un-advertises salvage and refuses both acts. |
| `season` | worker | switch | v2.3.3400 | true | logic |  | no | Thrown (true), the dropped season comes back on the free spin. |
| `storeGear` | worker | switch | v2.3.2528 | false | logic |  | no | Un-advertises gear in the store and stops it taking a listing. |
| `storehealnow` | worker | switch | v2.3.4920 | false | logic |  | no | A stuck store row is healed at the next restart, as before. |
| `storehealwait` | worker | switch | v2.3.4842 | false | logic |  | no | The store's prune runs as before, without waiting for a leftover. |
| `toolshop` | worker | switch | v2.3.3316 | false | logic |  | no | Takes the tools off the shelf and refuses every buy. |
| `trade2` | worker | switch | v2.3.4375 | false | logic |  | no | The trade window is off, so the old gift is open again. |
| `tradeonewrite` | worker | switch | v2.3.4795 | false | logic |  | no | The trade's swap goes back to its old order of writes. |
| `?equipredraw` | page | switch | v2.3.5046 | =0 | logic |  | no | A change of worn gear is set all at once again, not in pieces a frame apart. |

## identity

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `broCount` | worker | switch | v2.3.3255 | false | logic |  | no | The phone falls back to the worn-Bro check instead of counting a wallet's Bros (links and counts stored keep showing). |
| `devicelock` | worker | switch | v2.3.3344 | false | logic |  | no | The join, the login check and the restart as they were: no device lock read or written. |
| `keys2` | worker | switch | v2.3.3355 | false | logic |  | no | No new login key is handed out (keys already made still work). |

## life

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `lifenoheal` | worker | switch | v2.3.4901 | false | logic |  | no | A dying player can be healed again (the life door's step 2a off). |
| `lifesave` | worker | switch | v2.3.4902 | false | logic |  | no | No life note written or read: the join stands up as v2.3.4374 did. |
| `xpdecay` | worker | switch | v2.3.3251 | false | logic |  | no | Full XP everywhere again, harvests and fights, cap un-advertised. |

## liveops

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `bagonesum` | worker | switch | v2.3.4900 | false | logic |  | no | The bag door's one sum is off: every bag road back on its own sum. |
| `daybook` | worker | switch | v2.3.5080 | false | logic |  | no | The day's book adds, writes and prunes nothing; what is stored stays and its reader says it is off. |
| `disable_bigbags` | worker | switch | v2.3.4224 | true | logic |  | no | Thrown, the weapon and gear stashes go back to 8 and 32. |
| `report` | worker | switch | v2.3.5122 | false | logic |  | no | Un-advertises the field report, so no phone sends its smoothness, and drops any that still comes. |
| `reportspeed` | worker | switch | v2.3.5127 | false | logic | `report` | no | The Speed test's card is no longer taken (caps.report back to 1); the smoothness reports carry on. |
| `roomrow` | worker | switch | v2.3.5124 | false | logic | `daybook` | no | Nothing of the room's own row is added into the day's book. |
| `testmode` | worker | lever | v2.3.3430 | false | none |  | no | Turns every character's test mode off at once, every check back on. |

## look

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `lookshirt` | both | switch | v2.3.3751 | off_lookshirt: true; ?lookshirt=0 | chip | `lookpalette` | no | Printed shirts are baked again, not coloured on the chip. |
| `lookarmour` | both | switch | v2.3.3752 | off_lookarmour: true; ?lookarmour=0 | chip | `lookpalette` | no | Bodies under armour are baked again, not coloured on the chip. |
| `lookfolk` | both | switch | v2.3.3809 | off_lookfolk: true; ?lookfolk=0 | memory | `lookpalette` | no | The townsfolk are drawn from their photographs again, loaded then. |
| `lookdelta` | worker | switch | v2.3.3240 | false | logic |  | no | Every look track is relayed whole again. |

## memory

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `picnumbers` | both | switch | v2.3.3715 | off_picnumbers: true; ?picnumbers=0 | memory |  | no | Monster strips are held as pictures again, not as colour numbers. |
| `gfxlean` | both | switch | v2.3.4033 | off_gfxlean: true; ?gfxlean=0, off, false | memory |  | no | A big drawing's building lists are kept after it is drawn. |
| `?treenumbers` | page | switch | v2.3.5247 | =0 | memory |  | no | The trees are held as pictures again, not as colour numbers. |

## monsters

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `aggrogrid` | worker | switch | v2.3.3201 | false | logic |  | no | Monsters look for targets with the full loop everywhere instead of the grid. |
| `elemhits` | worker | switch | v2.3.2996 | false | logic |  | no | Stops every new elemental status at once; a burn already burning finishes. |
| `freezehit` | worker | switch | v2.3.3620 | false | logic |  | no | A chill is the plain chill, not frozen a moment first. |
| `goohold` | worker | switch | v2.3.3620 | false | logic |  | no | The goo holds as the plain stuck hold, without its longer hold and sting. |
| `monstercharge` | worker | switch | v2.3.3946 | false | logic | `monstermoves` | no | No monster charges. |
| `monstercombo` | worker | switch | v2.3.3946 | false | logic | `monstermoves` | no | No monster swings its combo. |
| `monsterenrage` | worker | switch | v2.3.3946 | false | logic | `monstermoves` | no | No monster enrages. |
| `monsterlife` | worker | switch | v2.3.4843 | false | logic |  | no | A monster's reset is the old hand list, with no `m.life`. |
| `monstermoves` | worker | switch | v2.3.3946 | false | logic |  | no | Every monster move off: tier 1's behaviour everywhere. |
| `monsterslam` | worker | switch | v2.3.3946 | false | logic | `monstermoves` | no | No monster slams (the two-step slam and the area slam). |
| `monstervolley` | worker | switch | v2.3.3946 | false | logic | `monstermoves` | no | No monster throws its volley. |
| `slimeboss` | worker | switch | v2.3.3558 | false | logic |  | no | A boss made after it is the one big boss of v2.3.3556. |
| `wobble` | worker | switch | v2.3.3620 | false | logic |  | no | A daze ends without its second of wobbling. |

## movement

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `amuletregen` | worker | switch | v2.3.3536 | false | logic |  | no | The regeneration tick goes back to the phone's claim and Endurance for everyone (the amulet's multipliers off). |
| `entrygrace` | worker | switch | v2.3.4453 | false | logic |  | no | The zone-entry grace is given on every entry again. |
| `monsterroll` | worker | switch | v2.3.3300 | false | logic |  | no | A monster gets no roll i-frames (the way before v2.3.3300). |
| `movebudget` | worker | switch | v2.3.3325 | false | logic |  | no | The move budget off: the per-message 80, the refusals and the three bypasses as before. |
| `movepath` | worker | switch | v2.3.3726 | false | logic |  | no | No glide from the next tick; every phone is told to send every move again. |
| `pathall` | worker | switch | v2.3.3726 | false | logic | `movepath` | no | Only a phone that asks with ?diet=1 gets the move glide. |
| `rest` | worker | switch | v2.3.3539 | false | logic |  | no | Un-advertises the Hotel's rest: it rests nobody and pays no Well Rested XP. |
| `ride` | worker | switch | v2.3.3776 | false | logic |  | no | Un-advertises riding and ends every ride on the rider's next move. |
| `rollwindow` | worker | switch | v2.3.3292 | false | logic |  | no | A roll claim is trusted as before, paid or not. |
| `safeheal` | worker | switch | v2.3.3569 | false | logic |  | no | The safe ground's heal is the wilds' trickle again. |
| `serverdead` | worker | switch | v2.3.4373 | false | logic |  | no | A phone's move may write `dead` again (the move's write back). |
| `sprint` | worker | switch | v2.3.3003 | false | logic |  | no | No sprint step is allowed. |
| `steadymovers` | worker | switch | v2.3.3203 | false | logic |  | no | Every move goes out again, from the next tick. |

## preload

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `onecopy` | both | switch | v2.3.3715 | off_onecopy: true; ?onecopy=0 | memory |  | no | Pictures are held in more than one copy again. |
| `codelazy` | both | switch | v2.3.3717 | off_codelazy: true; ?codelazy=0, off, false | memory |  | no | Every window's code loads with the game again, not when opened. |

## quests

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `achievements` | worker | switch | v2.3.3527 | false | logic |  | no | Grants, counts and sweeps no achievement and un-advertises the cap (what was earned stays). |
| `codex` | worker | switch | v2.3.3209 | false | logic |  | no | The monster codex counts no kills (what was learned stays readable) and its cap is off. |
| `disable_mayor3_check` | worker | switch | v2.3.4441 | true | logic |  | no | Thrown, the mayor's third quest is met on the phone's word again. |
| `disable_quest_echo` | worker | switch | v2.3.4389 | true | logic |  | no | Thrown, a refused quest claim is silent again instead of echoing the worker's values. |
| `onelevel` | worker | switch | v2.3.3538 | false | logic |  | no | A character's level is the sum of its skills again. |
| `petbook` | worker | switch | v2.3.3120 | false | logic |  | no | Un-advertises the pet book and refuses naming, setting active and releasing (catches still land). |
| `petfetch` | worker | switch | v2.3.3806 | false | logic |  | no | Every pile back on the 240 px pet reach. |
| `pethouse` | worker | switch | v2.3.3120 | false | logic |  | no | The pet house is shut (off). |
| `petlevels` | worker | switch | v2.3.3120 | false | logic |  | no | No pet earns XP (levels earned stay). |
| `petshow` | worker | switch | v2.3.3120 | false | logic |  | no | Takes `pw` off every record (pets not shown to others). |
| `pettrade` | worker | switch | v2.3.3120 | false | logic |  | no | Stops new pet trades and listings (one on its way still arrives). |
| `petwards` | worker | switch | v2.3.3120 | false | logic |  | no | Every pet ward off. |
| `pointsreset` | worker | switch | v2.3.3541 | false | logic |  | no | Every points reset refused, and its cap off at the next join. |
| `pointsresetroom` | worker | switch | v2.3.4372 | false | logic |  | no | The points reset's minute is the socket's alone, not kept by the room. |

## render

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `?bakeurl` | page | switch | v2.3.5043 | =0 | logic |  | no | Every armour bake input is cut on the page again, not sent to the worker as its sheet's address. |
| `?coinflip` | page | switch | v2.3.5247 | =0 | memory |  | no | Ace's coin strips keep their decoded copies, as before. |
| `?npcheads` | page | switch | v2.3.5246 | =0 | memory |  | no | The townsfolk's head pictures keep their decoded copies, as before. |

## server-core

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `disable_jackpot` | worker | switch | v2.3.1150 | true | logic |  | no | Thrown, jackpot deposits stop cold (the pool and the draw are untouched). |
| `far_ms` | worker | value | v2.3.3243 | a number, 100 to 5000 | logic |  | no | How often far players go out on their own, in ms (100 to 5000). |
| `farplayers` | worker | switch | v2.3.3197 | false | logic |  | no | Sends everyone every far player every tick again. |
| `heapburn` | worker | switch | v2.3.3748 | false | logic |  | no | Un-advertises the burning heap: the phone sends nothing and nobody burns. |
| `newersave` | worker | switch | v2.3.3303 | false | logic |  | no | A save from a newer worker is let through the join, the newer `_v` kept. |
| `roundpos` | worker | switch | v2.3.3197 | false | logic |  | no | Positions go out as the phones sent them, not rounded. |
| `skillfreeze` | worker | switch | v2.3.4380 | false | logic |  | no | A prog3 character's reported skill tracks are stored and restored again. |
| `slimroster` | worker | switch | v2.3.3246 | false | logic |  | no | Sends everyone the whole roster again. |
| `tickpace` | worker | switch | v2.3.3202 | false | logic |  | no | The tick's plain interval again, from the next tick. |
| `tickshare` | worker | switch | v2.3.3195 | false | logic |  | no | Builds every tick message whole again. |

## session

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `bodytake` | worker | switch | v2.3.4455 | false | logic |  | no | A second login taking over mid-fight no longer keeps the body (the v2.3.4432 way), and caps.bodyTake is un-advertised. |
| `joinstandup` | worker | switch | v2.3.4374 | false | logic |  | no | The join restores 0 health and the sweep kills again, as before. |
| `lastplace` | worker | switch | v2.3.3327 | false | logic | `movebudget` | no | Every join takes its place again, and the first move after it is free. |
| `linger` | worker | switch | v2.3.3260 | false | logic |  | no | Every leaver leaves at once again; a lingering body ends on the next sweep. |
| `lingeracc` | worker | switch | v2.3.4921 | false | logic |  | no | A lingering player's account cache is left in memory, as before. |
| `max_players` | worker | value | v2.3.1982 | a number, 1 to the ceiling | logic |  | no | The room's cap on players, never above its bandwidth ceiling. |
| `nearjoin` | worker | switch | v2.3.3276 | false | logic |  | no | New joins get the whole snapshot again, cap off. |
| `presence2` | worker | switch | v2.3.3250 | false | logic |  | no | Un-advertises presence 2: every phone back on the v2.3.3246 roster. |
| `quiet` | worker | switch | v2.3.3254 | false | logic |  | no | Un-advertises the quiet phone: each phone as before from its next join. |
| `refusejoined` | worker | switch | v2.3.4921 | false | logic |  | no | A refused session is dropped only, not taken out of the world. |
| `rejoinresend` | worker | switch | v2.3.4382 | false | logic |  | no | No re-sends after state_sync, the cap un-advertised. |
| `takeoverlinger` | worker | switch | v2.3.4432 | false | logic |  | no | A second login takes over a body in a fight as before, rebuilt where the new phone says. |
| `takeoversave` | worker | switch | v2.3.4377 | false | logic |  | no | A second join of the same character does not save what a close would. |

## skills

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `armorforge` | worker | switch | v2.3.3092 | false | logic |  | no | Refuses every armour forge and un-advertises the cap; bars and armour already made are untouched. |
| `bowdraw` | worker | switch | v2.3.4801 | false | logic |  | no | No bow draw is counted and caps.bowDraw is un-advertised. |
| `cropeat` | worker | switch | v2.3.3537 | false | logic |  | no | No crop is eaten, and caps.cropeat reads false so the bag offers no Eat. |
| `dropgrades` | worker | switch | v2.3.3952 | false | logic |  | no | A monster drop's grade is rolled on the forge's odds again. |
| `farm` | worker | switch | v2.3.3127 | false | logic |  | no | Un-advertises the farm and answers every farm message off; beds, seeds and crops keep their times. |
| `farmorders` | worker | switch | v2.3.3134 | false | logic |  | no | The farm's order board is off: the cap reads false and an order is answered off. |
| `firerefuse` | worker | switch | v2.3.4886 | false | logic |  | no | A fire refused for its log sends only the bag back, not `firemaking_refused`. |
| `fishheal` | worker | switch | v2.3.3260 | false | logic |  | no | Un-advertises the fish ladder and puts the old 92 + 8 x level heal back. |
| `fishvariants` | worker | switch | v2.3.3948 | false | logic |  | no | No fish variant is rolled: every fish plain. |
| `fishweigh` | worker | switch | v2.3.3948 | false | logic |  | no | Counts no catch, weighs nothing and shows no board (what was weighed stays). |
| `forgeladder` | worker | switch | v2.3.3524 | false | logic |  | no | The forge's four ladders as they were, and the cap un-advertised. |
| `gatherhits` | worker | switch | v2.3.2956 | false | logic |  | no | Un-advertises gather hits and answers a phone that joined before with off. |
| `gatherreq` | worker | switch | v2.3.3038 | false | logic |  | no | Lifts the level a resource asks: every resource harvestable at level 1, cap un-advertised. |
| `gscopper` | worker | switch | v2.3.3947 | false | logic |  | no | Stops the boundary heals and the Marketplace's mapping of a new order (the migration stays). |
| `hardenedwood` | worker | switch | v2.3.3139 | false | logic |  | no | Refuses every hardened-wood make, un-advertises it, and bows and staffs harden for gold alone. |
| `hardenkeep` | worker | switch | v2.3.3529 | false | logic |  | no | A failed hardening loses its level again (the old band). |
| `hardenmats` | worker | switch | v2.3.3139 | false | logic |  | no | Hardening asks no material and charges the old x4 gold. |
| `hardenwoodskill` | worker | switch | v2.3.3481 | false | logic |  | no | Bows and staffs are gated on Blacksmithing again for hardening. |
| `harvestproof` | worker | switch | v2.3.3322 | false | logic |  | no | The old permissive strike and the old perfect, at once. |
| `hitladder` | worker | switch | v2.3.3229 | false | logic |  | no | The harvest's hit dice go back to 1..level, cap un-advertised. |
| `meals` | worker | switch | v2.3.3130 | false | logic |  | no | Only the old instant recipes cook; dishes in bags still eat. |
| `nodehp` | worker | switch | v2.3.3251 | false | logic |  | no | Every node back on 5 x (tier + 1), cap un-advertised. |
| `onetoone` | worker | switch | v2.3.3912 | false | logic |  | no | The old five-to-one smelting rows, and caps.onetoone taken back. |
| `pvpheal` | worker | switch | v2.3.3133 | false | logic |  | no | The PvP bite rule (food held back in a fight between players) is off, and caps.pvpheal reads false. |
| `shardcrack` | worker | switch | v2.3.3516 | false | logic |  | no | Un-advertises shard cracking, refuses every crack and combine, and puts the raw gem back on the kill roll. |
| `smelting` | worker | switch | v2.3.2820 | false | logic |  | no | Refuses every smelt and un-advertises the cap; ore and bars untouched. |
| `staffgather` | worker | switch | v2.3.4801 | false | logic |  | no | No staff gather is counted and caps.staffGather is un-advertised. |
| `strikesnap` | worker | switch | v2.3.4642 | false | logic |  | no | A refused harvest strike is silent again. |
| `tierxp` | worker | switch | v2.3.3251 | false | logic | `nodehp` | no | Every harvest back on the old XP, cap un-advertised. |
| `trapcraft` | worker | switch | v2.3.3120 | false | logic |  | no | Making traps is refused. |
| `trapping` | worker | switch | v2.3.3120 | false | logic |  | no | Un-advertises trapping, refuses every arm and stops every roll. |
| `volleychip` | worker | switch | v2.3.4385 | false | logic |  | no | A harvest ends on every chip, as before. |

## social

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `alliance` | worker | switch | v2.3.3313 | false | logic | `partykeep` | no | No alliance status, names, wars or board; tags come off at the next vitals echo. |
| `arenaap` | worker | switch | v2.3.3481 | false | logic |  | no | The arena champion is paid gold alone, no AP, and the cap is un-advertised. |
| `arenaeatgate` | worker | switch | v2.3.4413 | false | logic |  | no | Eating in an arena match is gated by the match flag alone, as before. |
| `arenastakeonewrite` | worker | switch | v2.3.4796 | false | logic |  | no | An arena sponsor's stake goes back to its old two writes. |
| `boards2` | worker | switch | v2.3.4355 | false | logic |  | no | Un-advertises the boards with faces: records no spin, stamps no face or level, retires no row. |
| `chatguard` | worker | switch | v2.3.3396 | false | logic |  | no | All three chat guards off: chat and emotes spend the relay bucket again, nothing filtered or cleaned. |
| `clanparty` | worker | switch | v2.3.3321 | false | logic | `partykeep` | no | No clan is turned into a party; clans work as they did. |
| `duelzone` | worker | switch | v2.3.4371 | false | logic |  | no | No zone starts a duel's clock (one running is cleared at the next zone write). |
| `emotemoves` | worker | switch | v2.3.3392 | false | logic | `emotes` | no | No emote move is relayed and no pose kept; the plain emotes go on. |
| `emotes` | worker | switch | v2.3.3391 | false | logic |  | no | No emote is relayed, and caps.emotes false shuts the picker at the next join. |
| `leaderidleat` | worker | switch | v2.3.4378 | false | logic |  | no | The party leader's idle clock counts only a `seen` above 0, as before. |
| `partykeep` | worker | switch | v2.3.3276 | false | logic |  | no | Parties are not kept: the old cap and the away window remove a dropped member. |
| `spar` | worker | switch | v2.3.3265 | false | logic |  | no | No sparring clones: every live clone goes on the next tick and the cap is withdrawn. |

## townsfolk

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `race` | worker | switch | v2.3.3525 | false | logic |  | no | Lil Bro's race un-advertised and none started. |
| `tour` | worker | switch | v2.3.3525 | false | logic |  | no | Un-advertises the tour's two givers. |

## wire

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `bundle` | worker | switch | v2.3.3254 | false | logic |  | no | Stops advertising message bundles: each phone sends its messages one by one from its next join. |
| `disable_weapon_drops` | worker | switch | v2.3.1150 | true | logic |  | no | Thrown, weapon drops stop rolling (caps.weaponDrops stays true, so no phone mints its own). |
| `ip_joins_min` | worker | value | v2.3.3274 | a number, 0 to 10000 | logic |  | no | Joins an address may make a minute (0 to 10000; 0 is no limit). |
| `ip_sockets` | worker | value | v2.3.3274 | a number, 0 to 1000 | logic |  | no | Sockets an address may hold at once (0 to 1000; 0 is no limit). |
| `movediet` | worker | switch | v2.3.3204 | false | logic |  | no | Un-advertises the move diet: each phone sends every move again from its next join. |
| `pileleft` | worker | switch | v2.3.4383 | false | logic |  | no | Stops the death pile's time-left fields on the wire. |
| `relaylist` | worker | switch | v2.3.3304 | false | logic |  | no | Relays every type that is not privileged again (the old deny-list). |

## world

| name | side | kind | born | thrown | risk | needs | fallback | off |
|---|---|---|---|---|---|---|---|---|
| `groundlean` | both | switch | v2.3.3717 | off_groundlean: true; ?groundlean=0 (read by the ground worker in public/tools/ground/: out of reach) | memory |  | no | The ground is built by the old builder, not the lean one. |
| `heaplean` | both | switch | v2.3.3717 | off_heaplean: true; ?heaplean=0, off, false | memory |  | no | The map's leftovers are kept, not let go. |
| `bosschest` | worker | switch | v2.3.3565 | false | logic |  | no | A dungeon boss drops no chest. |
| `clearxp` | worker | switch | v2.3.3565 | false | logic |  | no | A dungeon clear's XP goes to the old counter only. |
| `disable_dungeons` | worker | switch | v2.3.1150 | true | logic |  | no | Thrown, every dungeon start is refused with a message. |
| `dungeonbag` | worker | switch | v2.3.3556 | false | logic |  | no | A dungeon death drops its pile and empties the bag, as before. |
| `dungeonlive` | worker | switch | v2.3.4423 | false | logic |  | no | Any `dungeon:` id on its shape is taken again, live run or not. |
| `eventplace` | worker | switch | v2.3.3245 | false | logic |  | no | Every event goes to everyone again, from the next tick. |
| `fightlock` | worker | switch | v2.3.3183 | false | logic |  | no | The bag is no longer locked in a fight on the roads the fight lock's table names `fightlock`. |
| `fightlockmonster` | worker | switch | v2.3.4841 | false | logic |  | no | A fight with a monster no longer locks the bag in No man's land. |
| `nmlchoice` | worker | switch | v2.3.3530 | false | logic |  | no | The No man's land choice is ignored: the first blow starts the skulls; cap off. |
| `nmlgroup` | worker | switch | v2.3.3530 | false | logic |  | no | The last giver alone, as before, no `bys`; cap off. |
| `nmllock` | worker | switch | v2.3.3770 | false | logic |  | no | No No man's land lock set or enforced; the red skull stays at a death; cap off. |
| `nmlnear` | worker | switch | v2.3.3690 | false | logic |  | no | No man's land's rule as it was (FIRST_TIER 2). |
| `nmlsteps` | worker | switch | v2.3.3767 | false | logic |  | no | No man's land climbs by the tier's number, not a step a monster level. |
| `nomansland` | worker | switch | v2.3.3058 | false | logic |  | no | No man's land off: no hit, no skull, nothing taken on a death; the safe Wheel of v2.3.3057. |
| `partydungeon` | worker | switch | v2.3.3573 | false | logic |  | no | The Grotto of v2.3.3540 again, cap off. |
| `retiredlands` | worker | switch | v2.3.4675 | false | logic |  | no | Opens the retired lands again at once. |
| `wheel5x` | worker | switch | v2.3.3299 | false | logic |  | no | A room that has not yet chosen plays the short Wheel for its whole life. |
| `wheeldeep` | worker | switch | v2.3.3013 | false | logic |  | no | A Wheel spawned after it has the first tier's 48 monsters alone. |
| `wheeldungeons` | worker | switch | v2.3.3013 | false | logic |  | no | Closes every Wheel dungeon mouth and un-advertises them. |
| `wheelmonsters` | worker | switch | v2.3.2990 | false | logic |  | no | Un-advertises the Wheel's monsters; a Wheel spawned after it is empty. |
| `wheelnear` | worker | switch | v2.3.3318 | false | logic |  | no | Every arrival gets the whole monster list again, cap off. |
| `wheelnodes` | worker | switch | v2.3.3012 | false | logic |  | no | Un-advertises the Wheel's nodes; a Wheel spawned after has none. |
| `wheelpast20` | worker | switch | v2.3.3093 | false | logic |  | no | A Wheel spawned after it stops at the first stage (no levels past 20). |
| `wheelpursue` | worker | switch | v2.3.3056 | false | logic |  | no | The old pursuit rule for monsters and the commons. |
| `wheelrest` | worker | switch | v2.3.3299 | false | logic |  | no | Every monster runs every tick again (far monsters do not rest). |
| `wheelslope` | worker | switch | v2.3.3320 | false | logic |  | no | A Wheel spawned after it is levels 1-2 again. |
| `wheelstep` | worker | switch | v2.3.4540 | false | logic |  | no | A page that joins the Wheel off its step (a preview) is no longer kept out of harm and dealing nothing. |
| `zonejudge` | worker | switch | v2.3.4565 | false | logic |  | no | The zone judge off (but its rule R3, the retired lands, stays: `retiredlands`). |
