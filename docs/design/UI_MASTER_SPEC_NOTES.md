# The master specification: the builder's notes (v2.3.6405)

The page a builder reads BESIDE `UI_MASTER_SPEC.md` (the owner's document of 2026-11-25, word for word, with its three pictures in `references/`). Not the owner's words: the repository's, made from the four audits (`UI_ARCHITECTURE_V2_AUDIT.md`) and the code. Four parts: where the game stands over the specification; what is flagged to the owner; the room; the kit. The order of the building is `UI_ARCHITECTURE_V2_PLAN.md`. "MS 4.2" is the master specification's part 4.2.

**The three rules a builder holds, in this order.**

1. **The game's own content stands over a document's or a mockup's.** The owner, 2026-11-25: *"Yeah my game content over the mockup stuff"*, then *"Keep\*"* (read as: keep my game content over the mockup stuff; the reading is the repository's). A name, a grade, a number, a rule of play, a picture: where the game has one, the screen shows the game's. The first table below is where that bites.
2. **The code is the truth about what the game does today.** The master specification says of itself: *"The live repository has not been audited as part of this handoff."* The audits did that; a card's facts carry their file and line, and a builder reads the line before building on it.
3. **Ordinary visual and implementation choices are ours; gameplay and architecture are the owner's.** *"Flag significant architectural or gameplay conflicts for my review, but independently resolve ordinary visual and implementation decisions."* The second table below is the owner's list: nothing on it is settled by a card, a pick or a switch.

## 1. Where the game stands over the specification

Each line: what the specification (or a picture) says; what the game has; what the screens show; where it is in the code. A builder does not "fix" the game toward the document, and does not ask the owner again: these are settled FOR THE SCREENS by rule 1. (A change of the game's rule itself would be the owner's own decision, never a screen's.)

| # | The specification says | The game has | The screens show | Where |
|---|---|---|---|---|
| 1 | **Points** (MS 4.2): every weapon level-up gives 3 points for that weapon AND 3 shared points, so a 3 / 3 / 3 player has more shared points than a 3 / 1 / 1 player; weapon points never cross channels | A weapon's level-up gives its 3 points. SHARED points come with the CHARACTER level, which is the best weapon's: they are earned only when the BEST weapon levels (both players above have the same). A weapon's points may also be spent on body stats, so the pools are not sealed | The GAME's pools, as the worker holds them: each lane's count and the shared count. No screen says or implies "3 shared points a weapon level"; the words for a pool come from one rule (`src/game/combatHub.js`, card UI2-combat) | `src/data/prog3.js`:29-35 (the banner's numbers), :667 (one level), :690-790 (the pools), :735 (points remember their skill); `server/src/prog3.js`:16, :663 (dealt by the character level); the owner's agreement of 2026-10-21 (v2.3.3538) and rule of v2.3.2176 |
| 2 | **Combat level** (MS 4.2): the best of the three weapon levels | The same, while the live flag `onelevel` is on (off: the sum, to 300) | The level the game shows today, by the same reader | `src/data/prog3.js`:556, :1127 |
| 3 | **Rarity** (MS 2): "common neutral, rare blue, epic orange ... Godly prismatic" | The grades are **Normal, Rare, Elite, Godly**: no colour, blue `#5B99DE`, orange `#E8893A`, a rainbow; one to four stars beside the colour | Normal, Rare, Elite, Godly, with the stars as the cue beyond colour. Never "common", "epic" or "legendary" | `src/ui/mobile/dash/common.js`:67-93; stars `dash/GearTab.jsx`:287-295; the ring `src/styles/game.css`:5926-5967 |
| 4 | **Medals** (MS 4.5): tiers of difficulty, "Gold, Silver, Bronze were illustrative"; a medal has progress | Every achievement already has one of four tiers: **Common (10 AP), Rare (100), Arena (500), Super-rare (1,000)**. An achievement is earned or not: no "7 of 10" | The four tiers ARE the medal tiers; no achievement or point value changes; a medal's page shows earned or not and the game's own hint, never an invented count | `src/data/achievements.js`:26-31, :67-97; `server/src/achievements.js`:104-135 |
| 5 | **Titles** (MS 4.5): a list of titles, families of them | A title is the NAME of an achievement you have earned; one real family (Blooded, Veteran, Centurion) | A title's row is its achievement's name and requirement; one family, the rest single rows | `server/src/achievements.js`:241, :576-590; `dash/AchievementsPanel.jsx`:137-160 |
| 6 | **Clan and guild** (MS 4.1, 9): a clan and a guild, each with a profile; a Clan circle and a Party circle | A party IS the clan ("Clans are parties now"): one lasting group, to 50, an "alliance" with a tag at 20 active. The guilds are the ten SKILL guilds every player is in. No clan or guild profile exists | The party under the game's own words; the skill guilds as the guilds; where the passport has a Clan or Guild line and the game has nothing to say, an honest empty line, never an invented value. What a clan or guild PROFILE should be is flagged (table 2) | `clanparty.js`:10; `server/src/party.js`:63; `alliance.js`; `dash/GuildPanel.jsx` |
| 7 | **Merchants** (MS 12): larger shops with categories | ONE merchant, Diego: one shelf, no categories | No category page is built; the shop opens on its goods (the specification's own rule for a small merchant) | `gameDisplay.js`:6512, :7280; `src/ui/panels/ShopkeeperPanel.jsx` |
| 8 | **The nine slots' names** (MS 5): Sword, Bow, Staff, Torso, Greaves, Cape, Shield, Amulet, Jewel | Nine cells named Sword, Bow, Staff, **Chest, Legs**, Cape, Shield, Amulet, **Gem** | The game's names | `dash/itemCategory.js`:126 (`GEAR_CELLS`) |
| 9 | **The weapons' names** | Sword, Bow, Staff on the card; Melee, Bow, Magic on the points screen (two vocabularies today) | ONE vocabulary on the new screens: Sword, Bow, Staff (the owner's own words in every document and picture) | `src/data/prog3.js`:25 |
| 10 | **The attributes** (MS 4.2): six a weapon; shared "HP, defense, MP, stamina/energy, dodge, movement, resistance" | Six a weapon: Range, Power, Speed, Luck, Special, Element. Seven shared: Max HP, Defense, Max Mana, Stamina, Dodge, Speed (movement), Resist | The game's names. Two stats are called Speed today: the new screens say "Attack speed" and "Move speed" where both could be read | `src/data/prog3.js`:690-790 |
| 11 | **DPS and its breakdown** (MS 3.2, 4.2) | One total, `calcDisplayDps`: (average hit + critical chance x what a critical hit adds) / seconds a swing / 5. Element is not in it. No breakdown is shown today | The tree is read OUT OF `calcDisplayDps` itself (it hands back its parts with its total), never a second sum | `src/data/gameSystems.js`:5839-5882, :5804-5823; `sheet/broStats.js`:58, :99 |
| 12 | **Today's comparison** (MS 3.1, 5.1): percentages; armour by effective health | Signed amounts, never a percentage; armour compared piece against piece ("Damage cut") | The transformation form, with a percentage only where it means something; armour by "Damage cut" until effective health is decided (table 2) | `dash/gearStats.js`:56-68, :82, :107-142 |
| 13 | **Life skills** (MS 4.4) | Ten: woodcutting, fishing, mining, farming, cooking, blacksmithing, woodworking, gem cutting, enchanting, trapping; no top level | The ten, by the game's names | `src/data/lifeSkills.js`:10 |
| 14 | **Lifetime records, quests completed** (MS 4.1, 4.5) | Counted by each player's own PHONE (kills, deaths, gold, time, ores, fish, quests done); the worker keeps kills, kills by kind and the biggest fish | Your own page shows your phone's counts; another player's page shows only what the worker keeps | `src/ui/BroTown.jsx`:1528-1620 (`_compStats`); `server/src/index.js`:760 |
| 15 | **The Codex** (MS 8): a complete encyclopedia of six kinds, never hidden | Nine monsters and nothing else, each hidden until your first kill | The kinds the game has entries for; an empty kind keeps its place with an honest line. Opening every monster at once is a rule of play: flagged | `MonsterCodex.jsx`; `src/data/codexDrops.js` |
| 16 | **A drop's chance** (MS 8, question 75) | One roll of 1 to 10,000 a kill, at most one of the rolled drops; some things always drop; a grade's second roll (rare 0.9%, elite 0.09%, godly 1 in 2,000,000) | The exact chance as one number, with the roll's true words | `src/data/codexDrops.js` |
| 17 | **Quests** (MS 6): Story, Locate | No Story text; "Show on map" | Story is left out; "Show on map" is the locate button | `dash/QuestPages.jsx` |
| 18 | **Quick settings** (MS 13): music, sound effects, graphics quality "if supported" | Sound on or off, music volume, effects volume; no graphics quality setting | The three the game has | `dash/SettingsPanel.jsx` |
| 19 | **The farm** (MS 10) | A private place you walk to: six beds, sixteen crops, a fixed house, a Pet House. Nothing of MS 10.1's planned list exists | The real beds; every planned thing has its place and "not in the game yet" | `farmLayout.js`; the farm's record |
| 20 | **A player's picture** (MS 4.1, 9): a large portrait; living sprites | No single picture of a player: the bro is drawn from layers; outside the world a still face, for yourself and for players the room or a board has sent | The still face; no moving figure in a window without its memory and frame budget said first | `src/rendering/characterPortrait.js`:500, :1282 |
| 21 | **The pictures' numbers and names** (the three references): "Sunburn", level 21, 415 AP, 12 quests, "3 points available" | The player's own | The player's real data; a mockup's value is never copied | MS "Reference pack": "Every screenshot number and illustrative icon is a placeholder" |
| 22 | **The palette** (MS 2): eight working values | They are exactly the game's eight; the richer blue-slate of reference 01 is a TUNING of them, the kit's to judge (card UI2-kit) | The kit's tokens, one source | `src/styles/game.css`:98-230; `src/game/ui2Tokens.js` (the kit) |

## 2. Flagged to the owner (theirs, not ours)

A choice of gameplay or of architecture. No card settles one; the work goes on round it (MS 15: *"Continue implementing unaffected menus while any such decisions are pending"*). Each has what the screens do UNTIL the owner has said, which changes no rule and promises nothing.

| # | The question | Why it is the owner's | Until they say |
|---|---|---|---|
| F1 | **Effective health's formula.** The specification makes it the defensive headline and says *"Do not ship an invented EHP formula"* | It is a new number about the game's combat: what a "reference hit" is, and whether dodge, block and resist are in it, is a rule of play. Proposed (not decided): how much damage a plain hit from a monster of your own level must deal before you fall, from Max HP, Defense and armour, with Dodge, Block and Resist beside it as chances | NO effective-health number ships. The Shared page leads with Max HP, Defense beside it; armour is compared by "Damage cut". The place for the headline is built to take it |
| F2 | **Another player's full page.** The specification wants any player's levels, gear, stats and placed points shown | It needs the WORKER: a new message, a cap, a kill switch, a deploy; and a choice about cost (an offline player's page reads their saved record each look) and about what is public (records the phone counts are not the worker's) | Another player's page shows what the game sends today (their level, title, AP from the worker; weapon levels and item names from their own phone), named as theirs, read-only. The server step is its own card (the plan's step 9) and starts on the owner's yes |
| F3 | **Where the shop, the bank, the benches, a trade and a townsperson's profile live.** Windows over the world today; the specification makes them two-panel workspaces but does not say they move INTO the dashboard, whose two panels are about 189 x 172 px each at 390 x 844. And whether a townsperson's profile comes first (a second tap to reach the bank) | It changes how a player trades and banks while the world is in view: architecture, and how the meeting with a townsperson plays | They keep their windows. The plan's step 8 starts only when the owner has said where they live; the kit's pieces and the two-panel workspace are built so either answer is the same work |
| F4 | **Anything that would change a rule of play.** Known today: the points rule itself (table 1, line 1: the screens show the game's; changing the GAME to the document's rule is a balance change); opening the whole Codex before a first kill; managing the farm from the dashboard; a level-up's full-screen burst waiting until a fight ends; a revision number in a trade's confirm; a board for the combined life-skill level (the worker must sum its own levels) | Each is the game, not its screens | The game's rule as it is. A card that meets a new one stops at it, names it in its PR under "Flagged to the owner", and builds the rest |
| F5 | **What the two labels and the radar measure** (MS 4.1, 4.4: thresholds, ties, a beginner's label, the radar's top), and **what a clan or guild profile should be** | The specification itself lists them as open with the owner (*"remain to be defined with the owner"*) | No label is shown; the radar is not drawn; the Clan and Guild lines of the passport say what the game has |

Ordinary choices already made by the plan, NOT flagged (the owner can turn any of them over by a word, and each lands behind the one switch): the Menu's eight tiles and what sits inside each; the closed band's two buttons; the four achievement tiers as the medals; the Map's tile opening the full-screen map; Homestead as a page that shows and does not manage; Party and Clan read from the one group the game has.

## 3. The room (the dashboard's real sizes; carried from the plan of v2.3.6403)

The dashboard's real sizes, in CSS px (an iPhone's screen has three device pixels to each). **Got by running the game's own layout functions for each shape** (`src/ui/mobile/sheet/sheetGeometry.js`: `barHeight` :930, `identityRowHeight` :409, `columnsRowHeight` :284, `bandFootprint` :857, `oneBandLayout` :1009), on the session's box, **not measured on a phone**: a step's first screenshots are checked against one from the owner's own phone (`finish.md` part 5, rule 4). The band never grows: these are the sizes every screen of the master specification must fit.

| The screen | Dashboard, open | Its top row (the header's place) | The page under it | Folded | The world above, open |
|---|---|---|---|---|---|
| 390 x 844, upright | 390 x 243 | 52 | **390 x 191** | 52 | 390 x 601 |
| 375 x 667, upright | 375 x 235 | 48 | **375 x 187** | 48 | 375 x 432 |
| 430 x 932, upright | 430 x 257 | 52 | **430 x 205** | 52 | 430 x 675 |
| 844 x 390, sideways | 844 x 130 | 48 | **844 x 82** | 48 | 572 x 260, centred |
| 667 x 375, sideways | 667 x 125 | 48 | **667 x 77** | 48 | 551 x 250, centred |
| 932 x 430, sideways | 932 x 143 | 48 | **932 x 95** | 48 | 632 x 287, centred |

What the table does not show:

- **Inside the page.** 19 px of the page's height is its own pads, borders and hairline: content has 172 px at 390 x 844 (168 at 375 x 667, 186 at 430 x 932; sideways 63, 58 and 76). At the sides, 4 px of pad each.
- **The top row is 52 px on a tall screen and 48 px when the visible page is 720 px tall or less**: every sideways phone, a 375 x 667 phone, and an iPhone in Safari with its bars showing (about 390 x 664: the dashboard is then 239 px, and its page still 191). The game's own slate gives a header 44 px with a 44 px Back and a 44 px Close (`docs/LANTERN-SLATE-SPEC.md`:239), which fits both.
- **The rule for the height.** Upright: the top row plus a page as tall as two rows of bag squares with their header (a square is 16.4% of the screen's width: 63 px at 390, 61 at 375, 70 at 430). Sideways and on a computer: never more than 243 px, and never more than a third of the screen's height. A phone on its side RESTS FOLDED, since a third of 390 px leaves the world only 260 px (`docs/UI-DESIGN-NOTES.md`:121); a button opens its page.
- **The world sideways** is never wider than 2.2 times its height, so it sits centred with dark bars at its sides, while the dashboard keeps the screen's whole width. On a computer or a tablet the dashboard's row and page are one centred block at most 480 px wide and at most 243 px tall.
- **The home indicator.** On an iPhone the dashboard grows DOWNWARD by the safe area at the bottom (34 px upright, about 21 px sideways, when the game is installed to the home screen or full screen), and the world gives up those pixels. Nothing to tap goes in that strip: the sizes in the table are the room above it.
- **The smallest thing to tap: 44 x 44 px** (`docs/UI-BIBLE.md`:196; the band's own floor for a square, `ONE_BAND_TILE_MIN`). A bag square is 63 px at 390 wide. Sideways a square shrinks to fit the page's one row (51 px on 844 x 390, 46 on 667 x 375, 64 on 932 x 430).
- **The smallest text: 11 px**, the size the dashboard uses most for small words; 12 and 13 px for ordinary words; 10 px only for a caption or a count badge (`docs/LANTERN-SLATE-SPEC.md`:191). A handful of places in today's panels go under that (8 to 9.5 px, five places): not a size to design to.
- **What two panels side by side come to** (Gear, a shop, the bank, crafting, a trade): at 390 x 844 each panel is about 189 px wide (179 inside its pads) and 172 px tall inside: under a 26 px label row, two bag-sized 63 px squares across and two down, or three across and three down at the 44 px floor.
- **Not read:** the top bar over the world and the top safe area. They are outside the dashboard and no screen of the specification is drawn there.

## 4. The kit (the game's real colours, fonts, grades and pictures; carried from the plan of v2.3.6404)

What ships today, read from the code (the audit's fourth half, "The look", has where each comes from). The dashboard's own kit (`src/game/ui2Tokens.js`, `src/ui/kit/`, card UI2-kit) is BUILT FROM these; a screen takes its colours, type and pieces from that kit and never from this table directly. Paths are inside `public/`.

**1. Colours** (`src/styles/game.css`). The first eight are the hand-off's own eight: they are exact.

| Use it for | Colour | The game's name |
|---|---|---|
| The dashboard's slate (the top of its gradient) | `#26383E` | band-top |
| The middle and bottom of that gradient | `#20333A`, `#1A292F` | band-mid, band-bottom |
| A panel's face | `#1E2E34` | sheet |
| A raised button or card | `#293B41` (brighter: `#32454C`) | raised, raised-high |
| A recessed tray, track or socket | `#111E23` (softer: `#16262C`) | well, well-soft |
| The deepest recess | `#0B161B` | well-deep |
| An item's occupied socket | `#24363C` | card / slot |
| The darkest shelf | `#0E191E` | toolbar |
| Brass (gold) | `#D8AA58`; pressed `#C2924A` | brass |
| Brass highlight, the gold button's edge, the focus ring | `#EAC675` | brass-highlight |
| Text | `#F4F0E7` | text |
| Second text, muted labels, disabled | `#B6C1BE`, `#8D9B98`, `#667875` | text-secondary, -muted, -disabled |
| Hairlines | white-green at 11% and 20% | line, line-strong |
| The one dark lettering on gold | `#172126` | text-on-accent |
| Good, bad, guidance | `#55B98A`, `#D8635D`, `#599FE5` | positive, danger, info |
| Health, mana, energy, experience, magic | `#E35D5B`, `#4F8FDE`, `#DFAE4E`, `#58B97B`, `#9A78D0` | hp, mana, stamina, xp, magic |
| The light card (something another player wrote) | `#C8D2CF` with `#111E23` text | invert |

The gold button as it is today: a gradient from `#E2B765` (top) to `#D2A14D` (bottom), a 1 px edge `#EAC675`, corners 10 px, lettering `#172126` at 13 px bold. Corner sizes in use: 14 px for a panel, 10 for a card, 8 for a slot, 10 or 11 for a button.

**2. Fonts.** Source Sans 3 (regular, semi-bold, bold) for nearly everything; Baloo 2 for a few headings; Press Start 2P for the HEMI BROS wordmark only. All free (SIL Open Font License) and on Google Fonts. No serif is in the game yet: card UI2-kit chooses ONE free-licence serif, used only inside the new dashboard (its PR says which, and which two it turned down). **Overruled 2026-11-26 (tag 6785)**: the owner, *"swap out the typography (font style) on all menus to be same as the 'logout' font"*: every menu wears Source Sans 3 again, the serif (Merriweather) is gone from the page. Sizes the game uses: 13 to 13.5 px for ordinary words, 12 for compact, 11 for small labels (the floor to design to), 10 only for a caption or a count badge, 14 bold for a value, 18 bold for a large one, a panel's title 13 bold in capitals. Numbers that change are set in figures of equal width.

**3. Rarity** (a piece's grade, the hand-off's item border):

| The game's name | Colour | Stars | How it is drawn today |
|---|---|---|---|
| Normal | none (the plain slot) | 1 | no edge colour |
| Rare | blue `#5B99DE` | 2 | a blue edge and a faint blue glow |
| Elite | orange `#E8893A` | 3 | an orange edge and a faint orange glow |
| Godly | a rainbow: `#FF6B6B`, `#FFD166`, `#6BFF95`, `#5CB8FF`, `#C77DFF` (gold `#F0C45F` where one colour is needed) | 4 | a slowly turning rainbow ring; its name in rainbow letters |

Other things the game also colours by rarity, each with its own names: an achievement (Common, Rare, Arena, Super-rare), a weapon's element tier (Common, Elemental, Fusion, Shift), and how often a drop comes (Normal, Uncommon, Rare, Very rare). The audit's table has their colours.

**4. Pictures, by door** (all under `public/`; 256 x 256 px and full colour unless said):

| Door | The picture |
|---|---|
| **The Menu:** Bro | `icons/ui/panel-self.webp` |
| Quests | `icons/ui/panel-quests.webp` |
| Social | `icons/ui/nav-friends.webp` |
| Ranks | `icons/ui/panel-leaderboard.webp` |
| Codex | `icons/ui/panel-encyclopedia.webp` |
| Homestead | `icons/ui/bldg-farm.webp` (a wide view: `icons/ui/homestead-preview.webp`, 480 x 300) |
| Map | `icons/ui/nav-map.webp` |
| Settings | `icons/ui/panel-settings.webp` (a nearly grey cog) |
| Gear (the other workspace) | `icons/ui/nav-dashboard.png`; the bag: `icons/ui/nav-inventory.webp` |
| **Bro:** Character | `icons/ui/panel-self.webp` (or `icons/ui/hero/tab-overview.webp`, muted) |
| Combat | none of its own; Sword `icons/ui/combat-melee.webp`, Bow `icons/ui/combat-bow.webp`, Staff `icons/ui/combat-magic.webp`; Shared: none |
| Equipment | `icons/ui/panel-loadout.webp` |
| Life Skills | `icons/ui/nav-lifeskills.webp` |
| Feats (the door was "Accomplishments") | `icons/achievements/achievements.webp` (150 x 150; 23 medals beside it) |
| Pets | `icons/ui/pets-paw.webp` (90 x 90); the pets themselves: `sprites/pets/pet-sheet.png` |
| **Life skills:** each of the ten | `icons/ui/skill-<name>.webp`: woodcutting, fishing, mining, farming, cooking, blacksmithing, woodworking, gemcutting, enchanting, trapping |
| **Stats** | `icons/ui/hero/`: dps, damage, crit, defense, dodge, hp, mana, stamina, move-speed, xp, and more (26) |
| **Items** | `icons/items/` (126 pictures, 128 x 128, one a thing); gold: `icons/ui/cur-gold.webp` |
| **Townsfolk** | `sprites/npc/<name>-head.webp` (22 heads, 192 x 192) |
| **Lands** | `ui/banners/land-<element>.webp` (eight, about 190 x 96) |
| **Monsters** | `sprites/monsters/<kind>/` (each kind's animation strips) |
| **The touch controls** | `ui/controls/` (35 pictures, 96 to 160 px: the abilities, the three weapons, jump, sprint, talk, each with a grey twin) |
| Clan, guild, chat, the journey, account, feedback | `icons/ui/panel-clan.webp`, `panel-guild.webp`, `panel-chat.webp`, `journey.webp`, `panel-account.webp`, `panel-feedback.webp` |

The bro has no single picture (it is drawn from layers as it plays): a screen shows the still face the game already draws (`src/rendering/characterPortrait.js`:500, :1282).

**5. What is missing** (no picture exists; the only places new art may be made, by the art law, `public/tools/style/process.js`, and only when the step that needs it comes: MS "Create only genuinely missing unique artwork after an asset audit"):

- a door picture for each of the Codex's kinds: Monsters, Items, Resources, NPCs, Locations, Mechanics (six, if all six stay);
- Combat as one door, and Combat's Shared channel;
- Notifications and About (small line drawings today).

Not missing, but look before they go on a large tile: Settings (nearly grey, and the owner asked for full colour), Pets (90 px), Feats (150 px), and the muted ones (the sword, three of the skills: mining, cooking, blacksmithing).
