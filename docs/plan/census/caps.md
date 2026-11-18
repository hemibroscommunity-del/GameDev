# The caps census (grand plan 7.5, step 1; card CAP, tag 6100)

Written by `node tools/dev/caps-census.mjs`; never by hand. `--check` fails when this file is
not what it would write. What each column means, and how it is read: the generator's header.
Nothing is removed by this census: no cap, no old way, no read.

## Totals

- caps in `CAP_GATES`: **173**
- whose old page way settles value (they go first, as 4.2's): **0**
- unclear whether they settle value (`?`, never guessed): **163**
- with no row in the switch table (no `on` day, no end): **62**
- that count (a number or a list: they stay): **10**
- **whose old page way is still there (old way `yes`): 160** -- the count that only falls (`tools/guards/caps-census.test.mjs`)
- not read on the page at all: **3**
- reads on the page, all caps: **315**
- births git could not find: **0**

## The caps

Sorted: settles value first, then unclear, then the rest; in each, no switch row first; then by name.

| cap | settles | why | switch row | born | reads | read in | old way |
|---|---|---|---|---|---|---|---|
| `abil` | ? | not judged yet | -- | 1733 (2a0f140e8) | 2 | networking/wsClient.js, state/data.js | yes |
| `aceFlip` | ? | not judged yet | -- | 2618 (420e00047) | 1 | ui/panels/AceFlipPanel.jsx | yes |
| `aceItems` | ? | not judged yet | -- | 2619 (142c3d109) | 2 | ui/mobile/dash/LeaderboardPanel.jsx, ui/panels/AceFlipPanel.jsx | yes |
| `amuletForge` | ? | not judged yet | -- | 1192 (aa9df044e) | 3 | game/monsterCombat.js, ui/panels/buildings/EnchantPanel.jsx, ui/panels/buildings/SmithyPanel.jsx | yes |
| `areaChat` | ? | not judged yet | -- | 2130 (67d1f6abc) | 2 | game/chat.js, game/chatChannel.js | yes |
| `arena` | ? | not judged yet | -- | 1126 (bed98f682) | 0 | -- | no |
| `arenaapfirst` | ? | not judged yet | -- | 3488 (ff387e5f2) | 1 | ui/panels/buildings/PartyPanel.jsx | yes |
| `beastmaster` | ? | not judged yet | -- | 3120 (d74ef9fa0) | 4 | data/gameDisplay.js, data/townBoard.js, data/wheelBuildingDoors.js, game/trapping.js | yes |
| `blockScale` | ? | not judged yet | -- | 2289 (f8093281a) | 2 | networking/wsClient.js, state/data.js | yes |
| `botfp` | ? | not judged yet | -- | 1146 (a747763c0) | 1 | game/lifeSkillRewards.js | yes |
| `broVerify` | ? | not judged yet | -- | 1576 (138148035) | 1 | networking/broWallet.js | yes |
| `charLock` | ? | not judged yet | -- | 1788 (d26d72238) | 1 | networking/wsClient.js | yes |
| `chatMute` | ? | not judged yet | -- | 1981 (b2365913e) | 1 | game/chatMute.js | yes |
| `clans` | ? | not judged yet | -- | 1125 (c1596865a) | 4 | networking/gameEvents.js, ui/panels/ClanPanel.jsx ×3 | yes |
| `dungeon` | ? | not judged yet | -- | 1127 (25534ed42) | 1 | ui/panels/DungeonCreatorPanel.jsx | yes |
| `elemBurst` | ? | not judged yet | -- | 1734 (c5cc6bbc3) | 2 | networking/wsClient.js, state/data.js | yes |
| `eventCapes` | ? | not judged yet | -- | 2026 (6e20c662c) | 4 | ui/mobile/dash/ItemDetailPopup.jsx ×3, ui/panels/InventoryPanel.jsx | yes |
| `friends` | ? | not judged yet | -- | 1323 (8a38250b3) | 4 | networking/gameEvents.js, ui/mobile/dash/SocialPanel.jsx, ui/mobile/sheet/friendsModel.js, ui/panels/InspectPlayerPanel.jsx | yes |
| `gamble` | ? | not judged yet | -- | 1124 (20664539e) | 1 | ui/panels/buildings/GamblePanel.jsx | yes |
| `gearq` | ? | not judged yet | -- | 2664 (82402a8a8) | 2 | networking/wsClient.js, state/data.js | yes |
| `gearRef` | ? | not judged yet | -- | 2532 (32cebaa3d) | 1 | ui/mobile/dash/equipActions.js | yes |
| `gemExtract` | ? | not judged yet | -- | 1209 (66f166ad6) | 4 | game/weaponGem.js, ui/panels/buildings/EnchantPanel.jsx, ui/panels/buildings/SmithyPanel.jsx ×2 | yes |
| `gems` | ? | not judged yet | -- | 1198 (5fbec53ee) | 3 | game/monsterCombat.js, networking/wsClient.js, ui/panels/buildings/GemcutPanel.jsx | yes |
| `guilds` | ? | not judged yet | -- | 1128 (201a9b8d6) | 1 | ui/panels/GuildPanel.jsx | yes |
| `harden` | ? | not judged yet | -- | 1131 (0710db9c6) | 3 | ui/panels/buildings/SmithyPanel.jsx ×2, ui/panels/buildings/WoodworkPanel.jsx | yes |
| `hpEndGrids` | ? | not judged yet | -- | 1154 (191b3d542) | 2 | state/data.js, ui/mobile/dash/T2Panel.jsx | yes |
| `jackpot` | ? | not judged yet | -- | 1149 (68f5c0649) | 1 | ui/panels/buildings/GamblePanel.jsx | yes |
| `laststand` | ? | not judged yet | -- | 1312 (da84475f6) | 1 | ui/mobile/dash/T2Panel.jsx | yes |
| `milestonesRetired` | ? | not judged yet | -- | 2646 (b10a6d522) | 2 | networking/wsClient.js, state/data.js | yes |
| `party` | ? | not judged yet | -- | 1185 (517aca885) | 4 | game/nmlAsk.js, ui/mobile/NmlAskCard.jsx, ui/mobile/dash/SocialPanel.jsx, ui/panels/InspectPlayerPanel.jsx | yes |
| `partyChat` | ? | not judged yet | -- | 1212 (ec4b8ef4f) | 2 | game/chat.js, game/chatChannel.js | yes |
| `perfectStrike` | ? | not judged yet | -- | 4550 (f252db8d8) | 1 | game/manualCombat.js | yes |
| `petLoot` | ? | not judged yet | -- | 1200 (6458cf5c1) | 3 | ui/BroTown.jsx ×3 | yes |
| `potionBag` | ? | not judged yet | -- | 2127 (91c806a6c) | 1 | ui/mobile/dash/ItemDetailPopup.jsx | yes |
| `prog3` | ? | not judged yet | -- | 1659 (5a6072bd8) | 3 | networking/wsClient.js, state/data.js, ui/panels/InfoPanel.jsx | yes |
| `prog3Chan` | ? | not judged yet | -- | 2174 (eb7670d4f) | 1 | ui/mobile/sheet/HeroExpanded.jsx | yes |
| `prog3elem` | ? | not judged yet | -- | 2483 (24ff8443a) | 2 | networking/wsClient.js, state/data.js | yes |
| `prog3rel` | ? | not judged yet | -- | 2659 (8145529ea) | 2 | networking/wsClient.js, state/data.js | yes |
| `prog3shared` | ? | not judged yet | -- | 2592 (2d67a948d) | 2 | networking/wsClient.js, state/data.js | yes |
| `prog3x` | ? | not judged yet | -- | 2199 (15248bb4c) | 2 | networking/wsClient.js, state/data.js | yes |
| `questTrack` | ? | not judged yet | -- | 1120 (8086ee332) | 3 | game/monsterCombat.js ×2, game/projectiles.js | yes |
| `reqid` | ? | not judged yet | -- | 5546 (ae98e17e8) | 1 | networking/wsClient.js | yes |
| `sponsor` | ? | not judged yet | -- | 1128 (201a9b8d6) | 2 | ui/panels/buildings/PartyPanel.jsx ×2 | yes |
| `store` | ? | not judged yet | -- | 2475 (efc442e59) | 2 | ui/storeApi.js ×2 | yes |
| `storeChat` | ? | not judged yet | -- | 2621 (d9efa1f8c) | 1 | ui/storeApi.js | yes |
| `storeGearRef` | ? | not judged yet | -- | 2551 (72f5dd912) | 1 | ui/storeApi.js | yes |
| `storeOffer` | ? | not judged yet | -- | 2623 (effa8aa2b) | 1 | ui/storeApi.js | yes |
| `t2bench` | ? | not judged yet | -- | 1451 (0e9c8d0b8) | 2 | networking/wsClient.js, state/data.js | yes |
| `t2simple` | ? | not judged yet | -- | 1342 (6cdac2b47) | 2 | networking/wsClient.js, state/data.js | yes |
| `t2uniform` | ? | not judged yet | -- | 1156 (f653fdce0) | 1 | ui/mobile/dash/T2Panel.jsx | yes |
| `tourgear` | ? | not judged yet | -- | 3525 (fd5d8ee19) | 1 | ui/panels/buildings/WoodworkPanel.jsx | yes |
| `trade` | ? | not judged yet | -- | 1119 (178422d44) | 0 | -- | no |
| `trade2Review` | ? | not judged yet | -- | 1754 (2547c3185) | 2 | ui/panels/TradeWindowPanel.jsx ×2 | yes |
| `trade2Weapons` | ? | not judged yet | -- | 1213 (75899cda6) | 1 | ui/panels/TradeWindowPanel.jsx | yes |
| `weaponDrops` | ? | not judged yet | -- | 1141 (2df5babf9) | 2 | game/monsterCombat.js, game/projectiles.js | yes |
| `whisper` | ? | not judged yet | -- | 2130 (67d1f6abc) | 2 | game/chat.js, game/chatChannel.js | yes |
| `accuracy` | ? | not judged yet | `accuracy` | 4480 (17f522a88) | 1 | game/accuracy.js | yes |
| `achievements` | ? | not judged yet | `achievements` | 3527 (060a11b54) | 5 | game/achievements.js, ui/mobile/dash/LeaderboardPanel.jsx, ui/panels/DevPanel.jsx, ui/panels/SkillsPanel.jsx, ui/panels/buildings/PartyPanel.jsx | yes |
| `alliance` | ? | not judged yet | `alliance` | 3313 (1f56893e3) | 1 | game/alliance.js | yes |
| `arenaap` | ? | not judged yet | `arenaap` | 3481 (b7fbaa7b3) | 1 | ui/panels/buildings/PartyPanel.jsx | yes |
| `armorforge` | ? | not judged yet | `armorforge` | 3092 (cb3e13f52) | 2 | ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/SmithyPanel.jsx | yes |
| `bank` | ? | not judged yet | `bank` | 3785 (ea6bcecd1) | 2 | data/townBoard.js, game/bank.js | yes |
| `bigorb` | ? | not judged yet | `bigorb` | 2849 (7d16cafbc) | 1 | game/playerActions.js | yes |
| `boards2` | ? | not judged yet | `boards2` | 4355 (b08e5a89d) | 1 | game/spinBoard.js | yes |
| `bodyTake` | ? | not judged yet | `bodytake` | 4455 (cc4a4793c) | 1 | networking/wsClient.js | yes |
| `bowDraw` | ? | not judged yet | `bowdraw` | 4801 (c96969dc7) | 3 | game/bowFeel.js ×2, networking/wsClient.js | yes |
| `bowvolley` | ? | not judged yet | `bowvolley` | 2808 (c1bf4f5d2) | 2 | game/playerActions.js, rendering/systems/effectsRenderer.js | yes |
| `broCount` | ? | not judged yet | `broCount` | 3255 (01be99046) | 1 | networking/broWallet.js | yes |
| `bundle` | ? | not judged yet | `bundle` | 3254 (97473a180) | 1 | game/quietPhone.js | yes |
| `clanparty` | ? | not judged yet | `clanparty` | 3321 (0a056e42d) | 1 | game/alliance.js | yes |
| `codex` | ? | not judged yet | `codex` | 3209 (3a73c13cf) | 1 | game/monsterCodex.js | yes |
| `cropeat` | ? | not judged yet | `cropeat` | 3537 (79f341dcb) | 1 | ui/mobile/dash/ItemDetailPopup.jsx | yes |
| `dailyChest` | ? | not judged yet | `dailyChest` | 2820 (f6ad0306f) | 1 | ui/mobile/dash/ItemDetailPopup.jsx | yes |
| `dailyquests` | ? | not judged yet | `dailyquests` | 3140 (c4bd08e93) | 1 | game/dailyRewards.js | yes |
| `dailyspin` | ? | not judged yet | `dailyspin` | 3140 (c4bd08e93) | 1 | game/dailyRewards.js | yes |
| `dice` | ? | not judged yet | `dice` | 3393 (981984493) | 1 | game/chat.js | yes |
| `elemup` | ? | not judged yet | `elemup` | 3518 (6866149bc) | 5 | data/weaponGems.js, game/monsterCombat.js, networking/gameEvents.js, ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/EnchantPanel.jsx | yes |
| `emotemoves` | ? | not judged yet | `emotemoves` | 3392 (8d52aa828) | 1 | game/interactions.js | yes |
| `emotes` | ? | not judged yet | `emotes` | 3391 (40e542d87) | 1 | game/emotes.js | yes |
| `farm` | ? | not judged yet | `farm` | 3127 (66b46e064) | 4 | game/farmWalk.js, rendering/farmWorld.js, ui/panels/buildings/FarmPanel.jsx ×2 | yes |
| `farmorders` | ? | not judged yet | `farmorders` | 3134 (caf15834f) | 1 | ui/panels/buildings/FeedSeedPanel.jsx | yes |
| `fishheal` | ? | not judged yet | `fishheal` | 3260 (ef2da392c) | 2 | networking/wsClient.js, state/data.js | yes |
| `fishvariants` | ? | not judged yet | `fishvariants` | 3948 (9f18ad606) | 2 | networking/wsClient.js, ui/panels/DevPanel.jsx | yes |
| `fishweigh` | ? | not judged yet | `fishweigh` | 3948 (9f18ad606) | 1 | game/fishWeigh.js | yes |
| `forgeladder` | ? | not judged yet | `forgeladder` | 3524 (fcbfee79a) | 3 | ui/panels/buildings/SmithyPanel.jsx ×2, ui/panels/buildings/WoodworkPanel.jsx | yes |
| `freeSwing` | ? | not judged yet | `freeswing` | 4520 (8812ce2bd) | 3 | game/manualCombat.js ×2, networking/wsClient.js | yes |
| `gatherhits` | ? | not judged yet | `gatherhits` | 2956 (ecfd69ce3) | 2 | game/lifeSkillRewards.js, ui/mobile/dash/SkillsPanel.jsx | yes |
| `gatherreq` | ? | not judged yet | `gatherreq` | 3038 (f67230101) | 1 | data/lifeSkills.js | yes |
| `gearlevel` | ? | not judged yet | `gearlevel` | 3544 (d562b5f84) | 2 | networking/wsClient.js, state/data.js | yes |
| `gidnames` | ? | not judged yet | `gidnames` | 5196 (ffaadd31f) | 1 | networking/wsClient.js | yes |
| `hardenedwood` | ? | not judged yet | `hardenedwood` | 3139 (d1e2bcec5) | 4 | ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/SmithyPanel.jsx, ui/panels/buildings/WoodworkPanel.jsx ×2 | yes |
| `hardenkeep` | ? | not judged yet | `hardenkeep` | 3529 (ea16a759f) | 3 | networking/gameEvents.js, ui/panels/buildings/SmithyPanel.jsx, ui/panels/buildings/WoodworkPanel.jsx | yes |
| `hardenmats` | ? | not judged yet | `hardenmats` | 3139 (d1e2bcec5) | 3 | ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/SmithyPanel.jsx, ui/panels/buildings/WoodworkPanel.jsx | yes |
| `hardenwoodskill` | ? | not judged yet | `hardenwoodskill` | 3481 (b7fbaa7b3) | 1 | ui/panels/buildings/WoodworkPanel.jsx | yes |
| `harvestGrade` | ? | not judged yet | `harvestgrade` | 5900 (c5a84f73a) | 0 | -- | no |
| `heapburn` | ? | not judged yet | `heapburn` | 3748 (9774ec34c) | 1 | ui/BroTown.jsx | yes |
| `hitladder` | ? | not judged yet | `hitladder` | 3229 (e379bb380) | 1 | ui/mobile/dash/SkillsPanel.jsx | yes |
| `itemdrop` | ? | not judged yet | `itemdrop` | 3473 (44ebd02bf) | 1 | game/itemDrop.js | yes |
| `killroll` | ? | not judged yet | `killroll` | 3209 (3a73c13cf) | 1 | game/killRoll.js | yes |
| `loginspin` | ? | not judged yet | `loginspin` | 4285 (30bd1cff6) | 2 | ui/mobile/LoginSpinWindow.jsx, ui/mobile/ZoneHeader.jsx | yes |
| `meals` | ? | not judged yet | `meals` | 3130 (60a2a342b) | 3 | ui/BroTown.jsx, ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/CookPanel.jsx | yes |
| `monsterhold` | ? | not judged yet | `monsterhold` | 3513 (80fa915e1) | 2 | game/weaponGem.js, ui/mobile/dash/ItemDetailPopup.jsx | yes |
| `monstermoves` | ? | not judged yet | `monstermoves` | 3946 (9bacd319d) | 2 | game/monsterMoves.js, networking/monsterMoveEvents.js | yes |
| `movediet` | ? | not judged yet | `movediet` | 3204 (7ba271a16) | 1 | networking/wsClient.js | yes |
| `movepath` | ? | not judged yet | `movepath` | 3726 (a9217317c) | 3 | networking/wsClient.js ×2, ui/panels/DevPanel.jsx | yes |
| `nearjoin` | ? | not judged yet | `nearjoin` | 3276 (165ea60b3) | 1 | game/nearJoin.js | yes |
| `nmlchoice` | ? | not judged yet | `nmlchoice` | 3530 (a13918243) | 1 | game/nmlAsk.js | yes |
| `nmlgroup` | ? | not judged yet | `nmlgroup` | 3530 (a13918243) | 1 | game/nmlAsk.js | yes |
| `nmllock` | ? | not judged yet | `nmllock` | 3770 (683f96054) | 1 | game/noMansLand.js | yes |
| `nmlnear` | ? | not judged yet | `nmlnear` | 3690 (f15e90433) | 1 | game/noMansLand.js | yes |
| `nmlsteps` | ? | not judged yet | `nmlsteps` | 3767 (2e892c9db) | 1 | game/noMansLand.js | yes |
| `nodehp` | ? | not judged yet | `nodehp` | 3251 (697a7a6a6) | 1 | data/gameSystems.js | yes |
| `nomansland` | ? | not judged yet | `nomansland` | 3058 (3cfc50877) | 1 | game/noMansLand.js | yes |
| `nostatcap` | ? | not judged yet | `nostatcap` | 3578 (fd8deb928) | 2 | networking/wsClient.js, state/data.js | yes |
| `oneformula` | ? | not judged yet | `oneformula` | 3260 (ef2da392c) | 5 | game/fightFood.js, game/pvpSwing.js, networking/wsClient.js, state/data.js, ui/panels/DevPanel.jsx | yes |
| `onelevel` | ? | not judged yet | `onelevel` | 3538 (6d63d8dee) | 2 | networking/wsClient.js, state/data.js | yes |
| `onetoone` | ? | not judged yet | `onetoone` | 3912 (a478e5d87) | 6 | ui/mobile/dash/ItemDetailPopup.jsx ×4, ui/panels/buildings/HardenedWoodTab.jsx, ui/panels/buildings/SmithyPanel.jsx | yes |
| `partydungeon` | ? | not judged yet | `partydungeon` | 3573 (e97326bf8) | 3 | game/wheelDungeons.js, networking/wsClient.js, state/data.js | yes |
| `partykeep` | ? | not judged yet | `partykeep` | 3276 (165ea60b3) | 3 | game/alliance.js ×2, ui/panels/buildings/WheelHallPanel.jsx | yes |
| `pathall` | ? | not judged yet | `pathall` | 3726 (100e46dc9) | 3 | networking/wsClient.js ×2, ui/panels/DevPanel.jsx | yes |
| `petbook` | ? | not judged yet | `petbook` | 3120 (d74ef9fa0) | 5 | game/desktopControls.js, game/petBook.js, ui/BroTown.jsx ×3 | yes |
| `petfetch` | ? | not judged yet | `petfetch` | 3806 (861161a53) | 2 | ui/BroTown.jsx ×2 | yes |
| `pethouse` | ? | not judged yet | `pethouse` | 3120 (d74ef9fa0) | 1 | game/petBook.js | yes |
| `petlevels` | ? | not judged yet | `petlevels` | 3120 (d74ef9fa0) | 1 | game/trapping.js | yes |
| `petshow` | ? | not judged yet | `petshow` | 3120 (d74ef9fa0) | 1 | rendering/systems/entityRenderer.js | yes |
| `pettrade` | ? | not judged yet | `pettrade` | 3120 (d74ef9fa0) | 2 | ui/panels/TradeWindowPanel.jsx, ui/storeApi.js | yes |
| `petwards` | ? | not judged yet | `petwards` | 3120 (d74ef9fa0) | 1 | game/trapping.js | yes |
| `pointsreset` | ? | not judged yet | `pointsreset` | 3541 (fd2dd05b6) | 1 | game/pointsReset.js | yes |
| `presence2` | ? | not judged yet | `presence2` | 3250 (fe8b7f8d6) | 1 | game/presence2.js | yes |
| `pvpbalance` | ? | not judged yet | `pvpbalance` | 3260 (ef2da392c) | 1 | game/pvpSwing.js | yes |
| `pvpbrew` | ? | not judged yet | `pvpbrew` | 3133 (bc767740c) | 1 | game/fightFood.js | yes |
| `pvpextras` | ? | not judged yet | `pvpextras` | 3264 (668a46358) | 1 | game/abilities.js | yes |
| `pvpheal` | ? | not judged yet | `pvpheal` | 3133 (bc767740c) | 1 | game/fightFood.js | yes |
| `pvplunge` | ? | not judged yet | `pvplunge` | 3262 (38da75ed8) | 1 | game/abilities.js | yes |
| `quiet` | ? | not judged yet | `quiet` | 3254 (97473a180) | 1 | game/quietPhone.js | yes |
| `race` | ? | not judged yet | `race` | 3525 (fd5d8ee19) | 2 | data/townBoard.js, game/race.js | yes |
| `rest` | ? | not judged yet | `rest` | 3539 (09f1c23f3) | 2 | data/townBoard.js, game/rest.js | yes |
| `revealbag` | ? | not judged yet | `revealbag` | 3951 (10555566c) | 1 | game/revealBag.js | yes |
| `ride` | ? | not judged yet | `ride` | 3776 (a1f1be266) | 2 | data/townBoard.js, game/ride.js | yes |
| `risechest` | ? | not judged yet | `risechest` | 4438 (fe7a68f00) | 1 | game/climbActions.js | yes |
| `salvage` | ? | not judged yet | `salvage` | 3141 (eabd425cc) | 2 | ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/SmithyPanel.jsx | yes |
| `season` | ? | not judged yet | `season` | 3400 (2d5d6f341) | 1 | game/dailyRewards.js | yes |
| `shardcrack` | ? | not judged yet | `shardcrack` | 3516 (51afecca7) | 3 | game/shardCrack.js, ui/mobile/dash/ItemDetailPopup.jsx, ui/mobile/dash/MonsterCodex.jsx | yes |
| `shieldgem` | ? | not judged yet | `shieldgem` | 3187 (096a82379) | 2 | game/shieldGem.js, networking/wsClient.js | yes |
| `shieldwear` | ? | not judged yet | `shieldwear` | 3091 (697711f52) | 1 | game/shieldWear.js | yes |
| `shockspark` | ? | not judged yet | `shockspark` | 3518 (6866149bc) | 2 | ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/EnchantPanel.jsx | yes |
| `smelting` | ? | not judged yet | `smelting` | 2820 (f6ad0306f) | 2 | ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/SmithyPanel.jsx | yes |
| `soakhit` | ? | not judged yet | `soakhit` | 3518 (6866149bc) | 2 | ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/EnchantPanel.jsx | yes |
| `spar` | ? | not judged yet | `spar` | 3265 (85335835f) | 1 | ui/panels/DevPanel.jsx | yes |
| `sprint` | ? | not judged yet | `sprint` | 3003 (e8155369e) | 1 | game/sprint.js | yes |
| `staffGather` | ? | not judged yet | `staffgather` | 4801 (c96969dc7) | 3 | game/staffFeel.js ×2, networking/wsClient.js | yes |
| `storeGear` | ? | not judged yet | `storeGear` | 2528 (98a0d0d04) | 1 | ui/storeApi.js | yes |
| `tierxp` | ? | not judged yet | `tierxp` | 3251 (697a7a6a6) | 1 | data/gameSystems.js | yes |
| `tour` | ? | not judged yet | `tour` | 3525 (fd5d8ee19) | 5 | data/gameDisplay.js ×2, data/wheelBuildingDoors.js ×2, game/tour.js | yes |
| `trade2` | ? | not judged yet | `trade2` | 1132 (a51740d85) | 3 | game/nmlAsk.js, ui/mobile/NmlAskCard.jsx, ui/panels/InspectPlayerPanel.jsx | yes |
| `trapcraft` | ? | not judged yet | `trapcraft` | 3120 (d74ef9fa0) | 2 | game/trapping.js, ui/panels/buildings/WoodworkPanel.jsx | yes |
| `trapping` | ? | not judged yet | `trapping` | 3120 (d74ef9fa0) | 1 | game/trapping.js | yes |
| `weapongem` | ? | not judged yet | `weapongem` | 3513 (80fa915e1) | 1 | game/weaponGem.js | yes |
| `wheeldungeons` | ? | not judged yet | `wheeldungeons` | 3013 (0a67585ec) | 1 | game/wheelDungeons.js | yes |
| `wheelmonsters` | ? | not judged yet | `wheelmonsters` | 2990 (fa4f31993) | 1 | game/worldTrial.js | yes |
| `wheelnodes` | ? | not judged yet | `wheelnodes` | 3012 (6a4b796cf) | 1 | networking/nodeSync.js | yes |
| `whirlWindup` | ? | not judged yet | `whirlWindup` | 2820 (f6ad0306f) | 1 | game/abilities.js | yes |
| `xpdecay` | ? | not judged yet | `xpdecay` | 3251 (697a7a6a6) | 1 | data/xpDecay.js | yes |
| `bagWeapons` | no | counts: the weapon bag's size | -- | 4224 (a8ffe30f1) | 2 | networking/wsClient.js, state/data.js | count |
| `clientoff` | no | counts: the list of memory savers the worker turned off | -- | 3755 (9e9822c4f) | 5 | networking/wsClient.js ×3, state/wire.js, ui/panels/DevPanel.jsx | count |
| `cookRows` | no | counts: how many recipes the worker cooks | -- | 3130 (60a2a342b) | 5 | ui/BroTown.jsx ×2, ui/mobile/dash/ItemDetailPopup.jsx ×2, ui/panels/buildings/CookPanel.jsx | count |
| `dungeonLands` | no | counts: how many lands have a dungeon | -- | 3540 (58548a887) | 1 | game/wheelDungeons.js | count |
| `farmCrops` | no | counts: how many crops the farm grows | -- | 3131 (5b91ac1ce) | 4 | game/farmWalk.js ×2, ui/panels/buildings/FeedSeedPanel.jsx ×2 | count |
| `wheelsize` | no | counts: which Wheel the worker plays (its length) | -- | 3299 (bfe3f7f58) | 1 | networking/wsClient.js | count |
| `power` | no | counts: the power index's version | `power` | 5481 (446a76141) | 1 | ui/mobile/dash/LeaderboardPanel.jsx | count |
| `rejoinResend` | no | counts: how many slots the worker says again after state_sync | `rejoinresend` | 4382 (3ecdccf15) | 2 | game/rejoinSlots.js, networking/wsClient.js | count |
| `report` | no | counts: the field report's version | `report` | 5123 (7bef9c771) | 3 | debug/report.js ×3 | count |
| `statboards` | no | counts: how many stat boards | `statboards` | 5484 (eb2b1e8e9) | 1 | ui/mobile/dash/LeaderboardPanel.jsx | count |
