# The inner pages: a tidy-up review (2026-11-26)

The owner, 20:35 UTC 2026-11-26: *"Maybe look at ways to clean up the menus once inside too I'm not super happy with them"*.
"Once inside" is read as the pages you reach AFTER tapping a tile: Gear and the item page, Bro and its doors, Character, Combat and its weapon pages, Quests, Ranks, Codex, Social, Settings and its pages, Homestead. Not the Menu grid itself.

Written by a review lane of the orchestrator (part 28). Nothing was built, committed or changed in the game.

**The pictures** (in `inside-review/`): 30 inner pages were photographed FRESH on main 7ec316e9 at an iPhone's size (375 x 667, upright, at 2x). The pictures were taken of a new character in BroTown, on the world, not the retired old map. They are cropped to the dashboard. The fresh sideways run did not finish within the time allowed. The sideways pictures (667 x 375), the item page and the Gear quick look are the repository's own pictures from earlier today (`docs/shots/ui2-*`), and the file names say so.

---

## For the owner

### A. What you will already get (do not judge these yet)

The jobs being built now change these things inside the menus:

- **One look for every surface**: your six colours (navy base, darker wells, a thin blue-grey edge, off-white text, gold). Lighter bevels and shadows. One text size for every navigation button. A thing that looks pressable will be something you can press. Big numbers sit in a sunken well. Plain facts sit as flat rows inside one shared box.
- **One font**: every word of the new menus in the game's own Source Sans letters (the "Log out" font). Today the new pages' titles and words are a serif, and the older pages are already Source Sans, so the two mix on one screen (picture 01: "Quests" serif above sans tabs).
- **Bro becomes one page**: six tiles (Combat, Equipment, Life Skills, Feats, Pets, Journey) and one flat strip (AP, Quests, Clan, Guilds, your title). The big portrait, the level banner and the three weapon buttons go, because the new top-left HUD shows who you are.
- **Combat**: the weapon pictures are made larger (32 px now, about 48 px after) with a big level number, and "points" shows only when you have points to spend. Each weapon's page gets one template: the level, then one strip (DPS plus the four stats), then the six attributes full width. The left "Attributes" column goes, and so do the six "0 placed" boxes as they look today.
- **The Menu and Gear**: pictures about 25% larger on the tiles and hubs. Bag cells and worn cells get one cell style. Gear's two headers get shorter, and the gold becomes a small pill.
- **Later steps already planned**: Quests, Ranks (medals kept, your own row marked), Codex, Life Skills (larger cards, the level inside the card), Feats and Pets are each rebuilt on the new kit (step 6). Then Social, Settings, Notifications and Homestead are rebuilt (step 7). The proposals below say where they would fold into those steps.

### B. Ways to clean up, in order of how much they would help

The proposals that cover several pages come first.

**1. Dress the older pages in the new kit now, before each one's rebuild**
- *Pages*: Quests, Life Skills, Codex, Ranks, Achievements, Pets, Journey, Friends, Settings, Account, Notifications, About, Feedback.
- *Untidy now*: inside the new header these pages still wear the old dashboard's hand-set sizes and corners. The Codex alone uses 16 different text sizes. Pets uses 9 sizes and 4 corner roundings. The kit has 7 sizes. The pages look like a different game from Bro, Combat and Gear (pictures 03, 12, 13, 20 next to 07, 08).
- *Change*: a "dress-only" pass that changes no layout. Each page's text sizes snap to the kit's scale (11 / 12 / 13 / 15 / 17 / 24), its corners to the kit's four radii, and its colours to the six. Pages then feel like one family while steps 6 and 7 rebuild them one at a time.
- *Status*: partly coming. The font is coming. Each page's full rebuild comes later, one by one, and nothing aligns them in the meantime.
- *Size*: large, but mechanical.

**2. One header that does not jump**
- *Pages*: every inner page.
- *Untidy now*: the title is centred between unequal buttons, so it moves from page to page. "Bro" sits about 15 px right of centre and "Combat" about 28 px left (07, 08). The Back word gets cut: "‹ Comb…" on Shared Attributes (11). The Menu button is there on some pages and missing on others: Bro, Social, Settings, Pets, Journey and Account have none (05, 07, 14). The header is three heavy raised pills, about 52 px of a band that has about 180 px for the page.
- *Change*: give the two sides of the header equal fixed widths so the title is always at the screen's centre. Back's word is never cut: if it does not fit, it drops the word before the title shrinks. Menu keeps one place on every page and is shown greyed where it would only repeat Back, or Back takes that place (the owner's choice). The pills become 36 px to look at, with 44 px to touch, and are visually lighter than the page's own doors.
- *Status*: partly coming. Lighter bevels and one type size are coming. The centring, the fixed sides and the cut word are new.
- *Size*: small (a style rule on the header and one rule for Back).

**3. One Back, in the header only**
- *Pages*: Life Skills (a skill), Codex (a monster), Quests (Completed), Friends (Blocked).
- *Untidy now*: two Backs on one screen that go to different places. The header says "‹ World" while the page has its own "‹ All skills" (02) or "‹ All" (03).
- *Change*: a page opened inside a page joins the header's history. The header's Back then reads "‹ Life Skills" or "‹ Codex", and the small in-page back goes. This is the master specification's own rule: *"labeled Back … no duplicate secondary global nav"*.
- *Status*: new. It is best added to the step-6 cards for Life Skills, Codex and Quests.
- *Size*: medium.

**4. One switcher style (tabs and filters)**
- *Pages*: Quests, Ranks, Achievements, Friends, Feedback, a Codex monster, Gear's filter.
- *Untidy now*: seven different looks for "pick one of these" (19). Quests uses dark pills with a gold ring plus a dot pager. Ranks uses glossy capsules with pictures. Achievements uses round outline chips. Friends uses square boxes. Feedback uses a segmented bar with an underline. The Codex uses raised square buttons. Gear uses a raised "All" pill.
- *Change*: one kit piece, a flat row inside one well, 36 px to look at and 44 px to touch. The chosen option has a gold edge and gold text, and the others are flat and muted. A small picture (16 px) is allowed. No bevel, because a tab is a choice and not a destination.
- *Status*: new (a kit piece, then each page uses it).
- *Size*: medium.

**5. One empty state, and no lone dashes**
- *Pages*: Titles, the DPS tree, Ranks, Pets, Friends, Homestead (18), plus the Sword page and Journey.
- *Untidy now*: six empty pages, six looks. They range from a kit well with a medal, to a dark bar with one sentence, to a big barn beside a paragraph floating mid-page, to a centred trophy. Numbers with no value show a bare "—": DPS "—", Damage "—", "Rank #—", "Lv —", Journey "—" (10, 12, 14).
- *Change*: one empty state everywhere, the kit's own: a 32 px picture, a bold line saying what is missing, one line saying how to get it, and an action button if there is one. It sits at the top of the page. A missing number says why in words ("No sword in hand", "Not ranked yet") or is left out, never a lone dash.
- *Status*: partly coming. The kit has the piece and the rebuilt pages use it. The older pages and the "—" values are new.
- *Size*: small to medium.

**6. One section label**
- *Pages*: Quests, Codex, Journey, Account, Friends, Gear, Ranks, About.
- *Untidy now*: section headings appear in six styles. There are gold spaced capitals with a gold rule ("QUEST JOURNEY"), grey spaced capitals ("MONSTERS OF THE WORLD", "ACCURACY", "YOUR LOGIN KEY", "0 ONLINE") and gold sentence case ("What we keep, and why"). There are serif capitals that get cut ("INVENTO…", 04), gold capitals between laurels ("RANKS", 12) and bold white sentence case ("Attributes").
- *Change*: one label: 11 px capitals, slightly spaced, muted off-white, with a count at its right if there is one. No rules, no laurels, no gold. Gold is kept for progress and important numbers, as the owner said.
- *Status*: new (one kit piece).
- *Size*: small.

**7. Facts in one box, not a box each**
- *Pages*: the item page, Journey, a Codex monster, Character (until the Bro merge lands).
- *Untidy now*: the item page puts Damage, DPS, Attack speed, Range and Hardness in five separate dark boxes, with an empty sixth space (16). Journey gives every record its own card and cuts the labels (14). The Codex's level, element and kind look like buttons but cannot be pressed (03).
- *Change*: the kit's new flat "facts" box. One container with label-left and value-right rows, in two columns on the item page. DPS becomes the one large number. Tags that cannot be pressed become plain text with a dot between them.
- *Status*: partly coming. The kit form is coming, but no current job applies it to the item page, Journey or the Codex.
- *Size*: medium.

**8. One name and one unit for each thing**
- *Pages*: Gear's quick look, the item page, the weapon page, Achievements, the Settings hub, Friends.
- *Untidy now*:
  - The same stat is shown two ways. The Gear quick look says "Attack time 0.6s" while the item page and weapon page say "Attack speed 1.7/s". The quick look says "Damage 2.5" while the item page says "Damage 2–3" for the same sword (15, 16).
  - Achievements still says "Melee, Bow or Magic" where every other page says Sword, Bow, Staff (13).
  - The Bro tile says "Feats" but its page is titled "Achievements" (13).
  - The tile "About" opens "About & privacy".
  - The tile "Settings" opens a hub titled Settings, which holds another "Settings" (06).
  - The tile "Friends" opens a page titled "Social" (05, 20).
  - The unread count, 11, is shown on both the Settings tile and the Notifications tile (06).
- *Change*: one word and one unit per stat, as the weapon page names it. Each page is titled exactly as the tile that opens it. A count is shown once, on the thing it counts.
- *Status*: new (words only). The Feats title is part of step 6's Feats rebuild.
- *Size*: small.

**9. Hubs that fit their room**
- *Pages*: the Social hub, the Settings hub, Homestead.
- *Untidy now*: Social is three tall tiles with 32 px pictures and about 60% empty face (05). On the Settings hub, Notifications and About have no picture beside three that do, and the sixth cell is empty (06). Homestead is one small barn and a paragraph on an empty page (18).
- *Change*: the hubs use the Menu's own tile rule (picture as large as fits). The two missing pictures use art already in the game, such as the bell and a scroll; no new art. Homestead uses the empty-state piece, with its one useful line ("Nothing ready to harvest") as the bold line.
- *Status*: partly coming. The tile rule reaches the hubs. The missing pictures and Homestead are new until step 7.
- *Size*: small.

**10. Gear's quick look and the item page**
- *Pages*: Gear (a tapped item) and the item page.
- *Untidy now*: the item name and place are cut ("In your bag · N…", "Copper Greats…" sideways) beside a 44 px box holding a ✕, which is a third style of close button (15, 17). "Details" and "Pin" are near-white buttons, outside the six colours, and as loud as the gold "Equip" (15, 16).
- *Change*: the name gets two lines and the ✕ becomes a small corner glyph (still 44 px to touch). Details and Pin use the quiet navy action style, and Equip or Unequip stays the only gold one.
- *Status*: partly coming. The header, pill and cells are coming, but the quick look and these buttons are not.
- *Size*: medium.

**11. Ranks: less above the list**
- *Pages*: Leaderboards.
- *Untidy now*: three rows of controls and labels before the first name, about 95 of the page's roughly 180 px (12). They are the category pills; a drop-down, the word "RANKS" between laurels and an "All-time leaderboard" chip that looks like a button but is not; and the column heads. The page is titled "Leaderboards" while its tile says "Ranks".
- *Change*: drop the "RANKS" laurels (the header already names the page). Put "All-time" as small text in the column-head row. The category and the drop-down share one row. Title the page "Ranks".
- *Status*: partly coming. Step 6's Ranks rebuild covers the medals and your row, but not this chrome.
- *Size*: medium.

**12. Journey's cut labels**
- *Pages*: Journey.
- *Untidy now*: at 375 px wide "LIFETIME GO…" and "DEEPEST ZO…" are cut again (14). The owner complained about this before, and it was fixed for the 390 px phone only.
- *Change*: labels in normal case at 11 px, allowed two lines, value above. Or Journey's records become one facts box (proposal 7).
- *Status*: new, though step 6's Feats rebuild will absorb Journey later.
- *Size*: small.

### C. Per page

| Page | Picture | Two worst faults | Covered by |
|---|---|---|---|
| Gear | 04-gear.png | "INVENTO…" header cut; bag cells and worn cells styled differently | coming (Gear headers and cells), 6 |
| Gear, item tapped | 15-gear-look-bag-390.png (repo) | name cut beside a boxed ✕; white "Details" off-palette | 10, 8 |
| Item page | 16-item-page-390.png (repo) | five stat boxes and an empty sixth; white "Pin" | 7, 10 |
| Bro | 07-bro.png | title off-centre; no Menu button (shape changes from page to page) | 2; coming (one Bro page) |
| Character | 09-character.png, 17 (sideways, repo) | every fact is a raised button; sideways nine picture-only doors with no words | coming (Bro merge) |
| Titles | in 18-six-empty-states.png | empty state's own look; dead lower half | 5 |
| Combat | 08-combat.png | 32 px weapon pictures in big empty cards; "0 points" four times | coming (Combat hub) |
| Sword page | 10-sword.png, 17 (sideways, repo) | left Attributes column; "—" for DPS, Damage, Range, and "0 placed" six times | coming (template), 5 |
| DPS tree | in 18 | empty state as a dark bar; the deeper state looks the same | 5 |
| Shared Attributes | 11-shared.png | "‹ Comb…" cut; Defense box styled unlike Max HP | 2; coming (template) |
| Quests | 01-quests.png | serif title over sans page; "Active (0)" above a quest that shows | coming (font), 4; step 6 |
| Quest journey | in 20-settings-pages-and-journey.png | gold section rule style; dot pager beside the tabs | 6, 4 |
| Life Skills, a skill | 02-life-skill.png | two Backs ("‹ World" and "‹ All skills"); faded capital labels | 3, 6 |
| Codex | not kept (seen) | grey capitals heading; nine "Not met yet" cards with 4 text styles | 1, 6 |
| Codex, a monster | 03-codex-monster.png | two Backs; level/element/kind look pressable | 3, 7, 4 |
| Leaderboards | 12-ranks.png | three rows of chrome; "Rank #—", "Lv —" | 11, 5 |
| Achievements | 13-achievements.png | titled "Achievements" under "Feats"; "Melee, Bow or Magic" | 8; step 6 |
| Pets | in 18 | paragraph empty state in a dark box; serif header over sans | 5, 1 |
| Journey | 14-journey.png | labels cut at 375; "—" for deepest zone | 12, 7, 5 |
| Social hub | 05-social-hub.png | 32 px pictures in tall empty tiles | 9 |
| Friends ("Social") | in 18 and 19 | titled "Social" again; square tab boxes | 8, 4 |
| Settings hub | 06-settings-hub.png | two tiles with no picture, empty sixth cell; count 11 shown twice | 9, 8 |
| Settings | in 20 | "Settings" inside "Settings"; rows a different family from the kit | 8, 1 |
| Account | in 20 | a third font (fixed-width) for the login words; "Copy Login Key" faded at the fold | 1 |
| Notifications | in 20 | free-floating intro line and a lone button | 1, 6 |
| About & privacy | in 20 | title differs from its tile; long text in mixed gold and grey | 8, 1 |
| Feedback | in 20 and 19 | its own segmented tabs; chips cut at the fold | 4 |
| Homestead | in 18 | empty page, small barn and a paragraph | 9, 5 |

### D. Not sure

- **Not seen fresh**: the Life Skills list (the capture skipped it); the item page and Gear's quick look (the capture skipped them, so the repository's 390 px pictures were used); the Ranks list with players in it (only an empty board, plus an older picture with the old tab row); quest rewards.
- **Not seen with a real character**: a character with points to spend, a sword in hand, pets, titles, a party or friends. The faults about "—" and empty pages are partly the test character's emptiness. The layout faults are not.
- **Sideways**: no fresh 667 x 375 run finished. Sideways is judged only from today's earlier pictures of the Sword page, Character and Gear, which the Bro and Combat jobs will change anyway.
- **Not looked at**: the computer layout. The Menu grid itself was out of scope.
- **"Landscape menu side"** is still a choice in Settings (20). Since the band became one layout sideways it may do little; the owner can say whether it should stay.
- **The owner's to decide**:
  - the header's Menu button on pages where Back already says "Menu" (proposal 2);
  - whether the page names follow the tiles: "Ranks" or "Leaderboards", "Feats" or "Achievements", "Friends" or "Social" (proposal 8);
  - whether a dress-only pass (proposal 1) is worth doing before the step-6 and step-7 rebuilds, or whether to wait for them.

---

## E. For the builder

Facts (main 7ec316e9):

- **Two systems.** None of the old pages use the kit: `grep -c "u2-\|Ui2"` is 0 in `dash/QuestPages.jsx`, `SkillsPanel.jsx`, `MonsterCodex.jsx`, `LeaderboardPanel.jsx`, `RanksPage.jsx`, `SettingsPanel.jsx`, `SocialPanel.jsx`, `PetsPanel.jsx`, `AchievementsPanel.jsx`, `JourneyPanel.jsx`, `AccountPanel.jsx`, `FeedbackPanel.jsx`, `NotificationsPanel.jsx`, `AboutPanel.jsx`.
  - Distinct inline `fontSize` values: MonsterCodex 16 (8 to 28), PetsPanel 9, SocialPanel 8, SkillsPanel 8, SettingsPanel 7, QuestPages 6.
  - Distinct `borderRadius` values: RanksPage 7, QuestPages 7, MonsterCodex 6.
  - The kit: 7 sizes (`src/ui/kit/ui2.css`:126-132), 6 radii (:114-119), spacing 2/4/6/8/12 (:120-124).
  - The old base: `dash/common.js`:110-141 (`panelStyle`: Source Sans 3, 15 px, 4/6 padding, a bottom fade mask).
- **The header.** `src/ui/kit/Header.jsx`:31-45 and `ui2.css`:190-235. The title is `flex: 1 1 auto; text-align: center` between sides of unequal width, so it centres in the leftover space, not on the screen. The start side is capped at `max-width: 42%` with an ellipsis (:213-215), which produces "‹ Comb…". Controls are 44 px (`--ui2-size-header`, :107). The header's kind and controls come from `dash/DashHeader.jsx` (UI2-frame's file: no UI3 card holds it).
- **The in-page backs.** `src/data/say/skills.js`:4 (`'‹ All skills'`); `monsterCodex.backShort` 'All' (`say/monsterCodex.js`:29), drawn at `MonsterCodex.jsx`:304; `QuestsPanel.jsx`:178; `QuestPages.jsx`:508; `SocialPanel.jsx`:220. The history is `src/game/dashNav.js` (UI2-quests already adds a `HANDS_OVER` row there).
- **The words.**
  - `src/data/say/compare.js`:13 `'compare.swing': 'Attack time'` against `itemInspect.attackSpeed`, `combatHub.aspd`, `broPages.statAspd` and `statTree.speed`, all 'Attack speed'.
  - `src/data/achievements.js`:69 and :79 say "Melee, Bow or Magic". Check `server/test/mirror-audit.test.mjs` before changing it: it may be mirrored, and a server file deploys.
  - `leaderboard.ranksTitle` 'RANKS' and `leaderboard.spanAllTime` (`say/leaderboard.js`:79, :90).
  - `settingsPanel.menuSide` (:22).
  - The double count: `src/game/dashDests.js`:137-138, where `settings` and `notifications` both carry `{ count: bell }`.
- **Journey.** `dash/JourneyPanel.jsx`:110-125. The v2.3.2176b fix (22 px icon, gap 5) bought the label's room at 390 px. At 375 px it is short again.
- **Gear.** `dash/gearPanels.css`:5 (controls 30 px tall), :6 and :38 (hand-written edge `rgba(126,143,151,.45)`, which the kit's `--ui2-line` replaces), :36-39 (the quick look's `.u2-gp-x`, a 44 px boxed ✕).
- **Combat.** `sheet/combatPage.css`:19 (`.u2-cb-art` 32 px) and :33 (26 px short).
- **The empty state.** `src/ui/kit/EmptyState.jsx` exists (`ui2.css`:576-581). StatTree's "No Sword in hand" is its own well. Titles uses the kit piece. Pets, Social, Ranks and Homestead each draw their own.

A split whose files do not meet UI3's:

1. **Header centring and Back's word** (proposal 2). `ui2.css` `.u2-head*` is held by UI3-kit (and UI3-type for the font lines), so STACK it on `claude/plan-ui3-1-kit` or wait for its merge. `DashHeader.jsx` is held by no UI3 card. Small.
2. **Kit pieces: the switcher and the section label** (4, 6). They are kit files (`src/ui/kit/*`, `?uikit=1`), held by UI3-kit, so stack them on it. Each page then adopts them in its own step-6 or step-7 card.
3. **One Back** (3). Add it as an amendment to UI2-life (`SkillsPanel.jsx`), UI2-codex (`MonsterCodex.jsx`, `EncyclopediaPanel.jsx`) and UI2-quests (`QuestsPanel.jsx`, `QuestPages.jsx`, `dashNav.js`), so no new PR meets their files. UI3 touches none of these.
4. **Words and units** (8): `say/compare.js`, `say/leaderboard.js`, the page titles in `dashDests.js` (rows only; UI3-bro, UI3-combat and UI3-menus each add their own rows there, so it goes beside them), the double count at `dashDests.js`:137-138, and `achievements.js` (the mirror check first). Small, no UI3 file but `dashDests.js` rows.
5. **The item page and the quick look** (7, 10). `itemPage.css` and `ItemPage.jsx`: UI3-kit holds only `ItemPage.jsx`:101, so stack on UI3-kit. `GearPanels.jsx` and `gearPanels.css` are UI3-menus', so the quick look's ✕ and name WAIT for UI3-menus or go into its card.
6. **Empty states and dashes** (5). `StatTree.jsx` is held by no UI3 card (UI3-combat lists it as NOT its own). The Sword page's "—" is in `WeaponPage.jsx` (UI3-combat's), so it goes into that card. Homestead, Pets, Social and Ranks fold into their step-6 and step-7 cards.
7. **The dress-only pass** (1). It touches every old panel, which is exactly the step-6 and step-7 cards' files. Do it only if the owner wants it before those rebuilds, and then one page per PR, beside its card, never in parallel with it.
8. **Hubs** (9). The tile size is UI3-menus' `menuTile.js`. The two missing pictures are `dashDests.js` rows (art already in `/icons/ui/`), small. Homestead is UI2-home's (step 7).
9. **Ranks chrome** (11): `LeaderboardPanel.jsx` and `RanksPage.jsx`, both UI2-ranks'. Add it to that card's amendment.
10. **Journey labels** (12): `JourneyPanel.jsx`, which no UI3 card holds. It is small and safe now, and UI2-feats absorbs Journey later.

How the pictures were made: `tools/qa/ui-review/capture.mjs` copied to an untracked folder with its views set to 375 x 667 and 667 x 375, run with `--only=` on the inner states, `--png --no-zip --no-sheets --no-kit`. The copy was deleted afterwards, and no tracked file changed. The capture skipped `dash-skills`, `dash-item-page`, `dash-gear-look-bag` and `dash-gear-look-worn`. The tutorial skip did not take, but no coach card appears in the cropped band.
