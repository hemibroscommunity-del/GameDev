# The caps census (grand plan 7.5, step 1; card CAP, tag 6100)

Written by `node tools/dev/caps-census.mjs`; never by hand. `--check` fails when this file is
not what it would write. What each column means, and how it is read: the generator's header.
Nothing is removed by this census: no cap, no old way, no read.

## Totals

- caps in `CAP_GATES`: **176**
- whose old page way settles value (they go first, as 4.2's): **12**
- unclear whether they settle value (`?`, never guessed): **2**
- with no row in the switch table (no `on` day, no end): **62**
- that count (a number or a list: they stay): **10**
- **whose old page way is still there (old way `yes`): 163** -- the count that only falls (`tools/guards/caps-census.test.mjs`)
- not read on the page at all: **3**
- reads on the page, all caps: **326**
- births git could not find: **0**

## The caps

Sorted: settles value first, then unclear, then the rest; in each, no switch row first; then by name.

| cap | settles | why | switch row | born | reads | read in | old way |
|---|---|---|---|---|---|---|---|
| `amuletForge` | value | false: the page rolls and mints its own gold nugget drops on kills | -- | 1192 (aa9df044e) | 3 | game/monsterCombat.js, ui/panels/buildings/EnchantPanel.jsx, ui/panels/buildings/SmithyPanel.jsx | yes |
| `dungeon` | value | false: the page spawns the dungeon locally and pays its own gold and XP | -- | 1127 (25534ed42) | 1 | ui/panels/DungeonCreatorPanel.jsx | yes |
| `gems` | value | false: the page rolls its own raw gem drops and gem cuts | -- | 1198 (5fbec53ee) | 3 | game/monsterCombat.js, networking/wsClient.js, ui/panels/buildings/GemcutPanel.jsx | yes |
| `petLoot` | value | false: the pet self-credits ground loot coins and weapons into local state | -- | 1200 (6458cf5c1) | 3 | ui/BroTown.jsx ×3 | yes |
| `prog3` | value | was ?, read as value by the planning session: the old recalc sets level and pools on the page | -- | 1659 (5a6072bd8) | 3 | networking/wsClient.js, state/data.js, ui/panels/InfoPanel.jsx | yes |
| `questTrack` | value | was ?, read as value by the planning session: the page counts quest kills and claims them at join | -- | 1120 (8086ee332) | 3 | game/monsterCombat.js ×2, game/projectiles.js | yes |
| `weaponDrops` | value | false: the page rolls and mints its own weapon drops | -- | 1141 (2df5babf9) | 2 | game/monsterCombat.js, game/projectiles.js | yes |
| `farm` | value | false: legacy farm panel harvests crops into the bag and grants farming XP | `farm` | 3127 (66b46e064) | 4 | game/farmWalk.js, rendering/farmWorld.js, ui/panels/buildings/FarmPanel.jsx ×2 | yes |
| `meals` | value | was ?, read as value by the planning session: the old instant cook heals R.hp on the page | `meals` | 3130 (60a2a342b) | 3 | ui/BroTown.jsx, ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/CookPanel.jsx | yes |
| `rest` | value | false: the bed restores HP, stamina, mana and Well Rested on the page | `rest` | 3539 (09f1c23f3) | 2 | data/townBoard.js, game/rest.js | yes |
| `shieldgem` | value | false: the page takes the gem, sets the shield gem, adds XP | `shieldgem` | 3187 (096a82379) | 2 | game/shieldGem.js, networking/wsClient.js | yes |
| `weapongem` | value | false: the Enchanter slots the gem locally, taking it and granting XP | `weapongem` | 3513 (80fa915e1) | 1 | game/weaponGem.js | yes |
| `shieldshop` | ? | not judged yet | `shieldshop` | 6800 (29cce7cb1) | 2 | networking/gameEvents.js, ui/panels/ShopkeeperPanel.jsx | yes |
| `wireForm` | ? | not judged yet | `wireform` | 6443 (86785bf2d) | 0 | -- | no |
| `abil` | no | false: no ability buttons appear and nothing is sent | -- | 1733 (2a0f140e8) | 2 | networking/wsClient.js, state/data.js | yes |
| `aceFlip` | no | false: Ace refuses the flip with a note, nothing sent | -- | 2618 (420e00047) | 1 | ui/panels/AceFlipPanel.jsx | yes |
| `aceItems` | no | false: hides the item wager and its records board | -- | 2619 (142c3d109) | 2 | ui/mobile/dash/LeaderboardPanel.jsx, ui/panels/AceFlipPanel.jsx | yes |
| `areaChat` | no | false: says area chat needs an update, sends nothing | -- | 2130 (67d1f6abc) | 2 | game/chat.js, game/chatChannel.js | yes |
| `arena` | no | page-side arena payout and fee debit already deleted; no false-branch reads remain | -- | 1126 (bed98f682) | 0 | -- | no |
| `arenaapfirst` | no | false: the arena window omits the first-win-only wording | -- | 3488 (ff387e5f2) | 1 | ui/panels/buildings/PartyPanel.jsx | yes |
| `bagWeapons` | no | counts: the weapon bag's size | -- | 4224 (a8ffe30f1) | 2 | networking/wsClient.js, state/data.js | count |
| `beastmaster` | no | false: Beastmaster Bro and his quests are not shown | -- | 3120 (d74ef9fa0) | 4 | data/gameDisplay.js, data/townBoard.js, data/wheelBuildingDoors.js, game/trapping.js | yes |
| `blockScale` | no | false: predicts the old fifths mana cost and draws five blocks | -- | 2289 (f8093281a) | 2 | networking/wsClient.js, state/data.js | yes |
| `botfp` | no | false: the cook request omits the swipe fingerprint field | -- | 1146 (a747763c0) | 1 | game/lifeSkillRewards.js | yes |
| `broVerify` | no | false: hides the wallet verify control | -- | 1576 (138148035) | 1 | networking/broWallet.js | yes |
| `charLock` | no | false: picks a look each session instead of trusting the stored character | -- | 1788 (d26d72238) | 1 | networking/wsClient.js | yes |
| `chatMute` | no | false: sends no mute, filters muted lines with the local list | -- | 1981 (b2365913e) | 1 | game/chatMute.js | yes |
| `clans` | no | false: page keeps local war scores and wipes clan locally; no gold minted | -- | 1125 (c1596865a) | 4 | networking/gameEvents.js, ui/panels/ClanPanel.jsx ×3 | yes |
| `clientoff` | no | counts: the list of memory savers the worker turned off | -- | 3755 (9e9822c4f) | 5 | networking/wsClient.js ×3, state/wire.js, ui/panels/DevPanel.jsx | count |
| `cookRows` | no | counts: how many recipes the worker cooks | -- | 3130 (60a2a342b) | 5 | ui/BroTown.jsx ×2, ui/mobile/dash/ItemDetailPopup.jsx ×2, ui/panels/buildings/CookPanel.jsx | count |
| `dungeonLands` | no | counts: how many lands have a dungeon | -- | 3540 (58548a887) | 1 | game/wheelDungeons.js | count |
| `elemBurst` | no | false: hides the burst button, predicts the old mana cost | -- | 1734 (c5cc6bbc3) | 2 | networking/wsClient.js, state/data.js | yes |
| `eventCapes` | no | false: hides the ticket Open and cape buttons | -- | 2026 (6e20c662c) | 4 | ui/mobile/dash/ItemDetailPopup.jsx ×3, ui/panels/InventoryPanel.jsx | yes |
| `farmCrops` | no | counts: how many crops the farm grows | -- | 3131 (5b91ac1ce) | 4 | game/farmWalk.js ×2, ui/panels/buildings/FeedSeedPanel.jsx ×2 | count |
| `friends` | no | false: shows the old local-storage friend list, sends nothing | -- | 1323 (8a38250b3) | 4 | networking/gameEvents.js, ui/mobile/dash/SocialPanel.jsx, ui/mobile/sheet/friendsModel.js, ui/panels/InspectPlayerPanel.jsx | yes |
| `gamble` | no | false: says the table is closed; the local roll is gone | -- | 1124 (20664539e) | 1 | ui/panels/buildings/GamblePanel.jsx | yes |
| `gearq` | no | false: damage and armour readouts use the old formulas (display) | -- | 2664 (82402a8a8) | 2 | networking/wsClient.js, state/data.js | yes |
| `gearRef` | no | false: sends the whole armour object instead of its id | -- | 2532 (32cebaa3d) | 1 | ui/mobile/dash/equipActions.js | yes |
| `gemExtract` | no | false: hides the gem extract rows and Upgrade tab, nothing sent | -- | 1209 (66f166ad6) | 4 | game/weaponGem.js, ui/panels/buildings/EnchantPanel.jsx, ui/panels/buildings/SmithyPanel.jsx ×2 | yes |
| `guilds` | no | false: says Not open yet, the old local mint is gone | -- | 1128 (201a9b8d6) | 1 | ui/panels/GuildPanel.jsx | yes |
| `harden` | no | false: hides the Upgrade tab and hardening rows | -- | 1131 (0710db9c6) | 3 | ui/panels/buildings/SmithyPanel.jsx ×2, ui/panels/buildings/WoodworkPanel.jsx | yes |
| `hpEndGrids` | no | false: grid spending is shown disabled online | -- | 1154 (191b3d542) | 2 | state/data.js, ui/mobile/dash/T2Panel.jsx | yes |
| `jackpot` | no | false: says the jackpot is closed; the local stub is gone | -- | 1149 (68f5c0649) | 1 | ui/panels/buildings/GamblePanel.jsx | yes |
| `laststand` | no | false: the Last Stand row shows inactive (SOON) | -- | 1312 (da84475f6) | 1 | ui/mobile/dash/T2Panel.jsx | yes |
| `milestonesRetired` | no | false: predicts the old stamina bar and Burst gate for display | -- | 2646 (b10a6d522) | 2 | networking/wsClient.js, state/data.js | yes |
| `party` | no | false: hides party invite tiles and buttons | -- | 1185 (517aca885) | 4 | game/nmlAsk.js, ui/mobile/NmlAskCard.jsx, ui/mobile/dash/SocialPanel.jsx, ui/panels/InspectPlayerPanel.jsx | yes |
| `partyChat` | no | false: says party chat needs an update, sends nothing | -- | 1212 (ec4b8ef4f) | 2 | game/chat.js, game/chatChannel.js | yes |
| `perfectStrike` | no | false: arrow claims name no shot (feel and claim shape only) | -- | 4550 (f252db8d8) | 1 | game/manualCombat.js | yes |
| `potionBag` | no | false: hides the Drink button and sends nothing | -- | 2127 (91c806a6c) | 1 | ui/mobile/dash/ItemDetailPopup.jsx | yes |
| `prog3Chan` | no | false: shows one shared points total; the worker judges spends | -- | 2174 (eb7670d4f) | 5 | ui/mobile/sheet/CharacterPage.jsx, ui/mobile/sheet/CombatHub.jsx, ui/mobile/sheet/HeroExpanded.jsx, ui/mobile/sheet/SharedPage.jsx, ui/mobile/sheet/WeaponPage.jsx | yes |
| `prog3elem` | no | false: hides new stat rows and shows the global elemental stat | -- | 2483 (24ff8443a) | 2 | networking/wsClient.js, state/data.js | yes |
| `prog3rel` | no | false: stat readouts predict the old linear math | -- | 2659 (8145529ea) | 2 | networking/wsClient.js, state/data.js | yes |
| `prog3shared` | no | false: draws the old points grid and pools (display only) | -- | 2592 (2d67a948d) | 2 | networking/wsClient.js, state/data.js | yes |
| `prog3x` | no | false: hides the new stat rows and banner says +1 (display) | -- | 2199 (15248bb4c) | 2 | networking/wsClient.js, state/data.js | yes |
| `reqid` | no | false: requests go without the once-only request id | -- | 5546 (ae98e17e8) | 1 | networking/wsClient.js | yes |
| `sponsor` | no | false: says betting is closed; the old self-mint is gone | -- | 1128 (201a9b8d6) | 2 | ui/panels/buildings/PartyPanel.jsx ×2 | yes |
| `store` | no | false: hides the auction house Sell button and store panel | -- | 2475 (efc442e59) | 2 | ui/storeApi.js ×2 | yes |
| `storeChat` | no | false: hides the store chat icon | -- | 2621 (d9efa1f8c) | 1 | ui/storeApi.js | yes |
| `storeGearRef` | no | false: a gear listing names its piece by selector, not id | -- | 2551 (72f5dd912) | 1 | ui/storeApi.js | yes |
| `storeOffer` | no | false: hides the offer box | -- | 2623 (effa8aa2b) | 1 | ui/storeApi.js | yes |
| `t2bench` | no | false: readouts keep the legacy t2Accel display math | -- | 1451 (0e9c8d0b8) | 2 | networking/wsClient.js, state/data.js | yes |
| `t2simple` | no | false: the page does not derive level and takes the worker's echo | -- | 1342 (6cdac2b47) | 2 | networking/wsClient.js, state/data.js | yes |
| `t2uniform` | no | false: the panel refuses spends past the legacy caps | -- | 1156 (f653fdce0) | 1 | ui/mobile/dash/T2Panel.jsx | yes |
| `tourgear` | no | false: craft windows show the old costs and level asks | -- | 3525 (fd5d8ee19) | 1 | ui/panels/buildings/WoodworkPanel.jsx | yes |
| `trade` | no | no page read left, the old local trade mint is gone | -- | 1119 (178422d44) | 0 | -- | no |
| `trade2Review` | no | false: single-stage Confirm instead of ready and review | -- | 1754 (2547c3185) | 2 | ui/panels/TradeWindowPanel.jsx ×2 | yes |
| `trade2Weapons` | no | false: hides the weapon picker in the trade window | -- | 1213 (75899cda6) | 1 | ui/panels/TradeWindowPanel.jsx | yes |
| `wheelsize` | no | counts: which Wheel the worker plays (its length) | -- | 3299 (bfe3f7f58) | 1 | networking/wsClient.js | count |
| `whisper` | no | false: refuses to send a whisper with a hint | -- | 2130 (67d1f6abc) | 2 | game/chat.js, game/chatChannel.js | yes |
| `accuracy` | no | false: counts no shots and hides the accuracy page | `accuracy` | 4480 (17f522a88) | 1 | game/accuracy.js | yes |
| `achievements` | no | false: hides the Achievements page, AP tile and banners | `achievements` | 3527 (060a11b54) | 6 | game/achievements.js, game/broHub.js, ui/mobile/dash/LeaderboardPanel.jsx, ui/panels/DevPanel.jsx, ui/panels/SkillsPanel.jsx, ui/panels/buildings/PartyPanel.jsx | yes |
| `alliance` | no | false: hides the alliance windows and tags | `alliance` | 3313 (1f56893e3) | 1 | game/alliance.js | yes |
| `arenaap` | no | false: the arena window does not promise achievement points | `arenaap` | 3481 (b7fbaa7b3) | 1 | ui/panels/buildings/PartyPanel.jsx | yes |
| `armorforge` | no | false: hides the Armor tab and its forge hint | `armorforge` | 3092 (cb3e13f52) | 2 | ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/SmithyPanel.jsx | yes |
| `bank` | no | false: the Bank window offers no vault deposits or withdrawals | `bank` | 3785 (ea6bcecd1) | 2 | data/townBoard.js, game/bank.js | yes |
| `bigorb` | no | false: fires the old three-orb volley, the worker still rolls damage | `bigorb` | 2849 (7d16cafbc) | 1 | game/playerActions.js | yes |
| `boards2` | no | false: hides the daily spin records board | `boards2` | 4355 (b08e5a89d) | 1 | game/spinBoard.js | yes |
| `bodyTake` | no | false: ignores body_place, no landing at the taken-over body | `bodytake` | 4455 (cc4a4793c) | 1 | networking/wsClient.js | yes |
| `bowDraw` | no | false: the bow is flicked, not drawn (feel only) | `bowdraw` | 4801 (c96969dc7) | 3 | game/bowFeel.js ×2, networking/wsClient.js | yes |
| `bowPath` | no | false: a bow relays its shot at fire, not at release; a request, not value | `bowpath` | 5905 (e747dd0e6) | 1 | game/projectiles.js | yes |
| `bowvolley` | no | false: fires one arrow instead of three; the worker rolls damage | `bowvolley` | 2808 (c1bf4f5d2) | 2 | game/playerActions.js, rendering/systems/effectsRenderer.js | yes |
| `broCount` | no | false: runs the worn-Bro verify request instead of the wallet count | `broCount` | 3255 (01be99046) | 1 | networking/broWallet.js | yes |
| `bundle` | no | false: sends messages one at a time | `bundle` | 3254 (97473a180) | 1 | game/quietPhone.js | yes |
| `clanparty` | no | false: clan windows stay clan windows instead of pointing to the Saloon | `clanparty` | 3321 (0a056e42d) | 1 | game/alliance.js | yes |
| `codex` | no | false: the Codex Monsters tab says it opens after the update | `codex` | 3209 (3a73c13cf) | 1 | game/monsterCodex.js | yes |
| `cropeat` | no | false: the bag offers no Eat on a crop | `cropeat` | 3537 (79f341dcb) | 1 | ui/mobile/dash/ItemDetailPopup.jsx | yes |
| `dailyChest` | no | false: hides the chest's Open button, nothing sent | `dailyChest` | 2820 (f6ad0306f) | 1 | ui/mobile/dash/ItemDetailPopup.jsx | yes |
| `dailyquests` | no | false: hides the daily quests window and its sends | `dailyquests` | 3140 (c4bd08e93) | 1 | game/dailyRewards.js | yes |
| `dailyspin` | no | false: hides the free spin and sends nothing | `dailyspin` | 3140 (c4bd08e93) | 1 | game/dailyRewards.js | yes |
| `dice` | no | false: /roll is sent as a plain chat line | `dice` | 3393 (981984493) | 1 | game/chat.js | yes |
| `elemup` | no | false: the page guesses its own UP popup (display only) | `elemup` | 3518 (6866149bc) | 5 | data/weaponGems.js, game/monsterCombat.js, networking/gameEvents.js, ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/EnchantPanel.jsx | yes |
| `emotemoves` | no | false: hides the Moves tab | `emotemoves` | 3392 (8d52aa828) | 1 | game/interactions.js | yes |
| `emotes` | no | only an explicit false hides the emote picker | `emotes` | 3391 (40e542d87) | 1 | game/emotes.js | yes |
| `farmorders` | no | false: hides the Orders tab and sends no farm_order | `farmorders` | 3134 (caf15834f) | 1 | ui/panels/buildings/FeedSeedPanel.jsx | yes |
| `fishheal` | no | false: heal predictions and labels use the old formula | `fishheal` | 3260 (ef2da392c) | 2 | networking/wsClient.js, state/data.js | yes |
| `fishvariants` | no | false: no rare-fish popup or dev tools shown | `fishvariants` | 3948 (9f18ad606) | 2 | networking/wsClient.js, ui/panels/DevPanel.jsx | yes |
| `fishweigh` | no | false: hides Inspect and the biggest-fish board | `fishweigh` | 3948 (9f18ad606) | 1 | game/fishWeigh.js | yes |
| `forgeladder` | no | false: shows the old forge list and level requirements | `forgeladder` | 3524 (fcbfee79a) | 3 | ui/panels/buildings/SmithyPanel.jsx ×2, ui/panels/buildings/WoodworkPanel.jsx | yes |
| `freeSwing` | no | false: the sword keeps its normal swing interval | `freeswing` | 4520 (8812ce2bd) | 3 | game/manualCombat.js ×2, networking/wsClient.js | yes |
| `gatherhits` | no | false: the wind-up is a local timer, the server still pays | `gatherhits` | 2956 (ecfd69ce3) | 2 | game/lifeSkillRewards.js, ui/mobile/dash/SkillsPanel.jsx | yes |
| `gatherreq` | no | false: no level refusal or level label drawn over nodes | `gatherreq` | 3038 (f67230101) | 1 | data/lifeSkills.js | yes |
| `gearlevel` | no | false: labels and gates gear by Defense points and Magic | `gearlevel` | 3544 (d562b5f84) | 2 | networking/wsClient.js, state/data.js | yes |
| `gidnames` | no | false: the action door names a weapon by its place, not its id | `gidnames` | 5196 (ffaadd31f) | 1 | networking/wsClient.js | yes |
| `hardenedwood` | no | false: hides the Hardened tab, shows the old harden cost | `hardenedwood` | 3139 (d1e2bcec5) | 4 | ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/SmithyPanel.jsx, ui/panels/buildings/WoodworkPanel.jsx ×2 | yes |
| `hardenkeep` | no | false: failure text and chip say the level drops back | `hardenkeep` | 3529 (ea16a759f) | 3 | networking/gameEvents.js, ui/panels/buildings/SmithyPanel.jsx, ui/panels/buildings/WoodworkPanel.jsx | yes |
| `hardenmats` | no | false: shows the old hardening costs without materials | `hardenmats` | 3139 (d1e2bcec5) | 3 | ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/SmithyPanel.jsx, ui/panels/buildings/WoodworkPanel.jsx | yes |
| `hardenwoodskill` | no | false: the hardening line names Blacksmithing, not Woodworking | `hardenwoodskill` | 3481 (b7fbaa7b3) | 1 | ui/panels/buildings/WoodworkPanel.jsx | yes |
| `harvestGrade` | no | false: no "Paid as" popup when the paid grade differs (v2.3.5902); a display | `harvestgrade` | 5900 (c5a84f73a) | 1 | game/lifeSkillRewards.js | yes |
| `heapburn` | no | false: no burn shown or heap_burn sent | `heapburn` | 3748 (9774ec34c) | 1 | ui/BroTown.jsx | yes |
| `hitladder` | no | false: the skills page shows the even 1..level odds | `hitladder` | 3229 (e379bb380) | 1 | ui/mobile/dash/SkillsPanel.jsx | yes |
| `itemdrop` | no | false: hides the Drop button | `itemdrop` | 3473 (44ebd02bf) | 1 | game/itemDrop.js | yes |
| `killroll` | no | false: the codex shows each drop rolled on its own | `killroll` | 3209 (3a73c13cf) | 1 | game/killRoll.js | yes |
| `loginspin` | no | false: hides the daily spin button and never asks | `loginspin` | 4285 (30bd1cff6) | 2 | ui/mobile/LoginSpinWindow.jsx, ui/mobile/ZoneHeader.jsx | yes |
| `monsterhold` | no | false: the Enchanter and item words describe the old lock | `monsterhold` | 3513 (80fa915e1) | 2 | game/weaponGem.js, ui/mobile/dash/ItemDetailPopup.jsx | yes |
| `monstermoves` | no | false: draws no monster move warnings | `monstermoves` | 3946 (9bacd319d) | 2 | game/monsterMoves.js, networking/monsterMoveEvents.js | yes |
| `movediet` | no | false: sends every move at the full rate | `movediet` | 3204 (7ba271a16) | 1 | networking/wsClient.js | yes |
| `movepath` | no | false: sends ordinary moves without the path mark | `movepath` | 3726 (a9217317c) | 3 | networking/wsClient.js ×2, ui/panels/DevPanel.jsx | yes |
| `nearjoin` | no | false: the page does not expect near snapshots, presence only | `nearjoin` | 3276 (165ea60b3) | 1 | game/nearJoin.js | yes |
| `nmlchoice` | no | false: the window sends no nml_attack | `nmlchoice` | 3530 (a13918243) | 1 | game/nmlAsk.js | yes |
| `nmlgroup` | no | false: attackers are not marked as foes as a group | `nmlgroup` | 3530 (a13918243) | 1 | game/nmlAsk.js | yes |
| `nmllock` | no | false: hides the lock words and buttons | `nmllock` | 3770 (683f96054) | 1 | game/noMansLand.js | yes |
| `nmlnear` | no | false: No man's land rings counted from the old first tier for display | `nmlnear` | 3690 (f15e90433) | 1 | game/noMansLand.js | yes |
| `nmlsteps` | no | false: counts the No man's land level the old way for display | `nmlsteps` | 3767 (2e892c9db) | 1 | game/noMansLand.js | yes |
| `nodehp` | no | false: node HP bar uses the old 5 x (tier+1) formula | `nodehp` | 3251 (697a7a6a6) | 1 | data/gameSystems.js | yes |
| `nomansland` | no | false: hides the PvP banner, skulls and tap-to-attack | `nomansland` | 3058 (3cfc50877) | 1 | game/noMansLand.js | yes |
| `nostatcap` | no | false: the [+] button greys at the old per-level bound | `nostatcap` | 3578 (fd8deb928) | 2 | networking/wsClient.js, state/data.js | yes |
| `oneformula` | no | false: predicts old HP bar and damage numbers; worker settles | `oneformula` | 3260 (ef2da392c) | 5 | game/fightFood.js, game/pvpSwing.js, networking/wsClient.js, state/data.js, ui/panels/DevPanel.jsx | yes |
| `onelevel` | no | false: predicts the level as the sum of skills (display) | `onelevel` | 3538 (6d63d8dee) | 2 | networking/wsClient.js, state/data.js | yes |
| `onetoone` | no | false: shows the five-to-one smelt and hardened-wood recipes | `onetoone` | 3912 (a478e5d87) | 6 | ui/mobile/dash/ItemDetailPopup.jsx ×4, ui/panels/buildings/HardenedWoodTab.jsx, ui/panels/buildings/SmithyPanel.jsx | yes |
| `partydungeon` | no | false: shows the dungeon's own levels instead of the party line | `partydungeon` | 3573 (e97326bf8) | 3 | game/wheelDungeons.js, networking/wsClient.js, state/data.js | yes |
| `partykeep` | no | false: shows the small in-memory party layout | `partykeep` | 3276 (165ea60b3) | 3 | game/alliance.js ×2, ui/panels/buildings/WheelHallPanel.jsx | yes |
| `pathall` | no | false: the message diet only for ?diet=1 phones | `pathall` | 3726 (100e46dc9) | 3 | networking/wsClient.js ×2, ui/panels/DevPanel.jsx | yes |
| `petbook` | no | false: opens the old Pet House, which only picks the active pet | `petbook` | 3120 (d74ef9fa0) | 6 | game/broHub.js, game/desktopControls.js, game/petBook.js, ui/BroTown.jsx ×3 | yes |
| `petfetch` | no | false: the pet does not run to far loot piles | `petfetch` | 3806 (861161a53) | 2 | ui/BroTown.jsx ×2 | yes |
| `pethouse` | no | false: hides the More room button, nothing sent | `pethouse` | 3120 (d74ef9fa0) | 1 | game/petBook.js | yes |
| `petlevels` | no | false: hides pet XP bars; nothing predicted | `petlevels` | 3120 (d74ef9fa0) | 1 | game/trapping.js | yes |
| `petshow` | no | false: other players' pets are not drawn | `petshow` | 3120 (d74ef9fa0) | 1 | rendering/systems/entityRenderer.js | yes |
| `pettrade` | no | false: hides the pet trade lane and pet listings | `pettrade` | 3120 (d74ef9fa0) | 2 | ui/panels/TradeWindowPanel.jsx, ui/storeApi.js | yes |
| `petwards` | no | false: hides the ward line on the Pets page | `petwards` | 3120 (d74ef9fa0) | 1 | game/trapping.js | yes |
| `pointsreset` | no | false: hides the Reset button | `pointsreset` | 3541 (fd2dd05b6) | 1 | game/pointsReset.js | yes |
| `power` | no | counts: the power index's version | `power` | 5481 (446a76141) | 1 | ui/mobile/dash/LeaderboardPanel.jsx | count |
| `presence2` | no | false: keeps the old ghost sweep presence roster | `presence2` | 3250 (fe8b7f8d6) | 1 | game/presence2.js | yes |
| `pvpbalance` | no | false: sends the PvP claim every frame, the worker still settles | `pvpbalance` | 3260 (ef2da392c) | 1 | game/pvpSwing.js | yes |
| `pvpbrew` | no | false: the PvP claim folds the brew in, the worker still settles | `pvpbrew` | 3133 (bc767740c) | 1 | game/fightFood.js | yes |
| `pvpextras` | no | false: area moves target no player | `pvpextras` | 3264 (668a46358) | 1 | game/abilities.js | yes |
| `pvpheal` | no | false: the page holds no bite back; the worker decides | `pvpheal` | 3133 (bc767740c) | 1 | game/fightFood.js | yes |
| `pvplunge` | no | false: the lunge does not target a player | `pvplunge` | 3262 (38da75ed8) | 1 | game/abilities.js | yes |
| `quiet` | no | false: phone sends moves and keepalives as before | `quiet` | 3254 (97473a180) | 1 | game/quietPhone.js | yes |
| `race` | no | false: hides Lil Bro's Race button and course | `race` | 3525 (fd5d8ee19) | 2 | data/townBoard.js, game/race.js | yes |
| `rejoinResend` | no | counts: how many slots the worker says again after state_sync | `rejoinresend` | 4382 (3ecdccf15) | 2 | game/rejoinSlots.js, networking/wsClient.js | count |
| `report` | no | counts: the field report's version | `report` | 5123 (7bef9c771) | 4 | debug/report.js ×4 | count |
| `revealbag` | no | false: no Reveal button or reveal ask | `revealbag` | 3951 (10555566c) | 1 | game/revealBag.js | yes |
| `ride` | no | false: hides the skateboard button | `ride` | 3776 (a1f1be266) | 2 | data/townBoard.js, game/ride.js | yes |
| `risechest` | no | false: the chest just says Empty for now | `risechest` | 4438 (fe7a68f00) | 1 | game/climbActions.js | yes |
| `salvage` | no | false: hides the Salvage tab and essence info | `salvage` | 3141 (eabd425cc) | 2 | ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/SmithyPanel.jsx | yes |
| `season` | no | false: hides the season stars, tiers and claims | `season` | 3400 (2d5d6f341) | 1 | game/dailyRewards.js | yes |
| `shardcrack` | no | false: old gem cut panel, worker-settled under caps.gems | `shardcrack` | 3516 (51afecca7) | 3 | game/shardCrack.js, ui/mobile/dash/ItemDetailPopup.jsx, ui/mobile/dash/MonsterCodex.jsx | yes |
| `shieldwear` | no | false: the worn shield is not reported to the worker | `shieldwear` | 3091 (697711f52) | 1 | game/shieldWear.js | yes |
| `shockspark` | no | false: the gem's text omits the spark | `shockspark` | 3518 (6866149bc) | 2 | ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/EnchantPanel.jsx | yes |
| `smelting` | no | false: hides the Smelt tab and its sends | `smelting` | 2820 (f6ad0306f) | 2 | ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/SmithyPanel.jsx | yes |
| `soakhit` | no | false: the gem card does not mention softer blows | `soakhit` | 3518 (6866149bc) | 2 | ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/EnchantPanel.jsx | yes |
| `spar` | no | false: the Test panel hides the sparring buttons | `spar` | 3265 (85335835f) | 1 | ui/panels/DevPanel.jsx | yes |
| `sprint` | no | false: hides the Sprint button and unmarked moves | `sprint` | 3003 (e8155369e) | 1 | game/sprint.js | yes |
| `staffGather` | no | false: the staff's gather feel is off | `staffgather` | 4801 (c96969dc7) | 3 | game/staffFeel.js ×2, networking/wsClient.js | yes |
| `statboards` | no | counts: how many stat boards | `statboards` | 5484 (eb2b1e8e9) | 1 | ui/mobile/dash/LeaderboardPanel.jsx | count |
| `storeGear` | no | false: hides the gear Sell buttons in the auction house | `storeGear` | 2528 (98a0d0d04) | 1 | ui/storeApi.js | yes |
| `tierxp` | no | false: the harvest XP popup predicts the old base XP | `tierxp` | 3251 (697a7a6a6) | 1 | data/gameSystems.js | yes |
| `tour` | no | false: the tour's two townsfolk are not spawned | `tour` | 3525 (fd5d8ee19) | 5 | data/gameDisplay.js ×2, data/wheelBuildingDoors.js ×2, game/tour.js | yes |
| `trade2` | no | false: opens the old one-way gift panel, which only sends requests | `trade2` | 1132 (a51740d85) | 3 | game/nmlAsk.js, ui/mobile/NmlAskCard.jsx, ui/panels/InspectPlayerPanel.jsx | yes |
| `trapcraft` | no | false: hides the Traps tab | `trapcraft` | 3120 (d74ef9fa0) | 2 | game/trapping.js, ui/panels/buildings/WoodworkPanel.jsx | yes |
| `trapping` | no | false: hides the trap pop-up and marks | `trapping` | 3120 (d74ef9fa0) | 1 | game/trapping.js | yes |
| `wheeldungeons` | no | false: hides dungeon mouths and sends no dungeon start | `wheeldungeons` | 3013 (0a67585ec) | 1 | game/wheelDungeons.js | yes |
| `wheelmonsters` | no | false: the trial rides the worldview zone instead of wheel | `wheelmonsters` | 2990 (fa4f31993) | 1 | game/worldTrial.js | yes |
| `wheelnodes` | no | false: skips the node resync request | `wheelnodes` | 3012 (6a4b796cf) | 1 | networking/nodeSync.js | yes |
| `whirlWindup` | no | false: whirlwind strikes on the press; the worker resolves the hit | `whirlWindup` | 2820 (f6ad0306f) | 1 | game/abilities.js | yes |
| `xpdecay` | no | false: XP predictions and skill readouts show no fade | `xpdecay` | 3251 (697a7a6a6) | 1 | data/xpDecay.js | yes |
