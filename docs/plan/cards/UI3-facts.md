# Card UI3: the facts a lane read on main 7ec316e9 (2026-11-26; the line numbers are that lane's: check a line before building on it)

UI2 research, main @ 7ec316e9. All paths under /home/user/GameDev. Line numbers verified. Items I did not run are marked NOT RUN.

1. TOP-LEFT HUD
- There is NO player frame today. Owner removed it 2026-11-03 (v2.3.4163): "level badge and the HP and energy bars are gone from the top-left on every layout; nothing replaces them there" (docs/UI-DESIGN-NOTES.md:379; the old frame's text is :380; src/styles/game.css:2543-2551). The face was removed earlier (v2.3.4093). Name, level, HP, energy, XP and portrait are not drawn in the top-left on any layout. HP shows over the bro's head. Combat level, name and portrait are on the dashboard's Bro pages.
- Top bar: src/ui/mobile/ZoneHeader.jsx (383 lines), identical upright, sideways and on a computer. Door chip, left (logout, or "Switch Bro" with 2+ bros). Title (:228-244). Logo (:255-257, only on the 'wheel' zone). TEST MODE tag (:268-272). The XP bar slot (:290-297: skill icon, "Lv N", XpTrack.jsx 150 lines, xpBar.js) shows only while earning XP, centred, over the title. Right column (:316-327): the free-daily-spin button. The purse and AP left the bar in v2.3.4183 (:303-310); only a "+12 gold" or "+5 AP" popup rises under its right end.
- Quest card: src/ui/QuestCard.jsx (187 lines), its own file. Mounted in BroTown.jsx:14526 (`React.createElement(QuestCard, { rpgState, live })`). Style at :39-50: absolute, `top: var(--bt-hud-top, 56px)`, left 8, z 17, maxWidth 248, bg rgba(17,25,29,.85). --bt-hud-top is set at game.css:2551 = 56px + --bt-bar-grow + safe-area. The card is the same on all three layouts (no layout branch in the file). Tap or arrow opens the quest via openQuestPage (QuestCard.jsx:75-80). Fold key bt_quest_hud_collapsed (:62).
- Also top-left, drawn INSIDE BroTown.jsx: ElemStatusChips wrapper div at BroTown.jsx:14346-14355 (top = hud-top - 12, left 8, z 18; component src/ui/ElemStatusChips.jsx). Also the "Skip tutorial" button just above, ending at :14344. PartyHUD chip/list is its own file src/ui/panels/PartyHUD.jsx (top: 92, left: 8, z 16 at :252, :283), imported BroTown.jsx:41.
- ONLINE PLAYER COUNT: not drawn on the HUD. BroTown.jsx:12998-13000 says the "N online" pill was removed in v2.3.1227. State: playerCount, BroTown.jsx:2341-2359 (published as S._playerCount). Shown only in the InfoPanel popup (src/ui/panels/InfoPanel.jsx:121; rendered BroTown.jsx:15844). No button opens InfoPanel; only window._uiPanels.info (BroTown.jsx:3415) does. ChatBubble.jsx:96-100 reads it. Friends page header shows friends online (SocialPanel.jsx:137, :191), which is a different number.
- Minimap: top-RIGHT, not top-left. Drawn by the renderer, src/rendering/systems/wheelMinimap.js (WHEEL_BOX = 132 px, :130). Size in src/ui/wheelMiniSize.js:31, wheelMiniBox :61: 132 px on a phone; doubled only in the old wide layout (?oneband=0). Name plate under it (plateSafety). NmlBadge.jsx draws only the red line along the band (BroTown.jsx:15142). Opens WorldMapOverlay.jsx.
- Inside BroTown.jsx itself: the QuestCard mount, the ElemStatusChips wrapper and the Skip-tutorial button (:14326-14355). Everything else is its own file.
- Portrait component to reuse: no standalone component. The bust is baked once in BottomDashboard.jsx:966-1015. It is an async canvas bake: portraitDataUrl(opts, true) in src/rendering/characterPortrait.js:1282 (drawCharacterPortrait :500) gives a data-URL, regenerated on each cosmetic change with a sequence guard. It is written to src/ui/mobile/sheet/portraitStore.js (get/set/subscribe) and read by portraitSrc(S) (portraitStore.js, fallback S.myAvatar, then /icons/ui/hero/tab-overview.webp). Users today: CharacterPage.jsx:226,234,295; BroCard.jsx:313,339. Another player's face: src/ui/PlayerIcon.jsx (162 lines, portraitDataUrl + portraitOptsFromPeer, bounded cache of 48 keyed by look). A HUD must mount where BottomDashboard (always mounted) has already filled the store.

2. COMBAT LEVEL AND WEAPON XP (client)
- Combat level: src/data/prog3.js:671 prog3CharLevel(rpg). When isOneLevelEnabled() (src/data/oneFormula.js:44; caps.onelevel) it is the MAX of the three weapon levels (prog3SkillLevel, :662, clamped 1..PROG3.LEVEL_CAP). Otherwise it is the SUM capped at CHAR_LEVEL_CAP (a legacy rule). Wrappers: src/game/combatHub.js:107 combatLevel(rpg); sheet/CharacterPage.jsx:75 broCombatLevel(R) (prog3Live, else R.level); achievements.js:313 bestCombatLevel.
- Weapon level, XP and need:
  - rpg.prog3.sk[cat].level / .xp, cat sword|bow|staff.
  - prog3SkillLevel (prog3.js:662).
  - prog3XpRequired(level) (prog3.js:390) = ceil(280 x 1.16^(level-1)).
  - src/game/progression.js:47 weaponProgress(rpg, cat) returns { level, cap, max, xpNow, xpNeed, frac } (progressOf :37). This is what the new Combat hub and Weapon page use.
  - sheet/heroModel.js:~168 weaponSkillProgress(R, cat) returns { prog, thresh, level } or null at cap (legacy-blob fallback).
  - dash/combatSkill.js:34 combatSkillState(rpg, skill) returns { lvl, xp:{prog,thresh}, unspent, ... }.
  - XP bar: src/game/xpBar.js (xpToNextWords, onXpBar).
- "Weapon closest to its next level": YES. heroModel.js bestWeaponProgress(R) (comment block "v2.3.1848: WHICH WEAPON IS CLOSEST TO ITS NEXT LEVEL"). It returns { prog, thresh, level, key, label, iconSrc }, skips capped weapons, returns null if all are capped, and handles both the prog3 and legacy blobs. combatLevelProgress(R) is a different question (next CHARACTER level: under onelevel only a weapon at the top level counts). Neither is wrapped in a src/game rules module.

3. BRO AND CHARACTER (UI2)
- Rules: src/game/broHub.js (293 lines): BRO_HUB_DOORS :42, BRO_HUB_PAGES :53, broHubDoors :85, broHubMarks :99, broHubWhose :115, BRO_PROGRESS_ROADS :129, PASSPORT_WEAPONS :179, PASSPORT_DOORS :187, passportClan :200, broPassport :225, titleActions :283. Also broPages.js (177 lines, today's pages, shared with ?ui2=0).
- Drawing: sheet/BroLanding.jsx (66 lines; BRO_HUB_DOORS tiles, no image/portrait, enforced by the guard), CharacterPage.jsx (411 lines; CharacterPage :215, TitlesPage after it), BroPages.jsx (308), BroCard.jsx (492; door switch).
- dashDests.js rows: MENU_DESTS :30-39 has `hero` (word dashFrame.bro, page 'hero', key P). FRAME_PAGES :60-78 has broCharacter :67, broCombat :68, broTitles :69, broSword/Bow/Staff, broShared, broTree0-6. MORE_ROADS :89-105: journey -> 'bro:character'. BRO_HUB_PAGES (broHub.js:53) maps them.
- Bro landing today: six equal Ui2Tiles, 3x2 upright, one row of 6 sideways (broHub.js header; menuGridShape dashDests.js:110). Order Character, Combat, Equipment, Life Skills, Feats, Pets. No portrait or banner. Equipment opens Gear. Marks via broHubMarks (points glow on Combat).
- Character page today (upright; CharacterPage.jsx:215-330):
  - Identity row: large portrait (u2-pass-face), name, title ("No title equipped" otherwise), a recessed "Combat Lv N" group (u2-pass-combat, data-char-combat), plus Titles and Journey doors in the same row.
  - Row of three weapon door buttons: Sword, Bow, Staff, each art + "Lv N" + glowing points (PassDoor, open Combat).
  - Row of four summary tiles: Clan (or Party), Guilds ("Skill guilds"), AP, Quests done. Clan, Guilds, AP and Quests are doors where the game has a page (PASSPORT_DOORS: party, guild, achievements, quests).
  - The two labels ("Sword Specialist") are not drawn (flag F5).
  - Sideways: one row; Clan, Guilds, Quests, Titles and Journey become picture-only 44 px doors.
- Master spec on Bro versus Character:
  - MS "Latest decisions overriding older handoffs" (UI_MASTER_SPEC.md:22-24): "Bro landing | Six buttons only under contextual header. Character, Combat, Equipment / Life Skills, Feats, Pets. Remove the redundant player/tap banner." and "Character | RPG passport; large portrait and adjacent combat level, name/title, supporting summaries. Not a combat-stat dump."
  - MS part 4 (:183-199): "No player portrait or tap banner above the Bro landing grid... Place full identity on Character."
  - MS 4.1 (:201): "Prominent portrait, name, equipped title and combat level... Link to the detailed destinations rather than duplicating all their content."
  - Notes: docs/design/UI_MASTER_SPEC_NOTES.md row 20 (:36, still face only), row 21, row 22 (:38, the palette).
  - Owner decision log: UI_ARCHITECTURE_V2.md:454-470 (Bro landing; Character).
  - A merged page needs an owner line in the decision log (see item 8).
- Guards and tests that pin them:
  - tools/guards/bro-hub.test.mjs.
    - Suite D1-D8: no 7th door (so a "Journey" door fails), 5 doors fails, "Feats" not "Accomplishments", locked doors keep place and reason, roads.
    - 1b: BRO_HUB_DOORS ids/art/opens; Character=broCharacter, Combat=broCombat; the grid is 3x2 / 1x6; BroLanding has no <img> and no "portrait".
    - 3b/3c: passport suite; the page reads prog3CharLevel; Titles is a frame page; the passport door roads (Journey in MORE_ROADS); plants.
  - tools/guards/dash-nav.test.mjs: MENU_DESTS = 8, order bro,quests,social,ranks,codex,homestead,map,settings (:199-202); MORE_ROADS must exist for each More tile, journey -> 'bro:character' (:214-218).
  - tools/qa/mp/mp-ui2bro.mjs: 1a/1b (six tiles, 3x2, exact words, no portrait), 1c (band 390 x 243), 1d/1e (sizes), 2a-2c (doors, Character = passport, Equipment = Gear), 3a (Combat glow), 3b, 4 (eight Progress roads), 6 ("Find your combat level, then your Bow level" on the passport unscrolled), 7a-7d (name, "No title equipped", three levels, clan "No clan", guilds "Skill guilds"; sizes; 44 px; no text under 11 px), 8a/8b (Titles + Equip pending), 5 (?ui2=0).
  - tools/qa/mp/mp-ui2frame.mjs and states.mjs rows ui2-bro-landing / ui2-bro-character / ui2-bro-titles; screenshots docs/shots/ui2-bro-*.
- Would go red if Bro and Character became ONE page with tiles Combat, Equipment, Life Skills, Feats, Pets, Journey and a strip AP / Quests / Clan / Guilds:
  - bro-hub D1/D2 and the 1b door lists (six doors with Character first; Journey would be a 7th/other id).
  - 1b "no portrait/image in BroLanding".
  - broCharacter/BRO_HUB_PAGES checks, the passport suite (3b), the Titles-door check.
  - dash-nav's Journey road check.
  - mp-ui2bro 1a/1b/1d/1e (six tiles, words), 2a-2b, 6, 7a-7d, 8a/8b (Titles door), 4 (roads 'bro:character/...' and 'bro:feats').
  - mp-ui2combat steps that go through the Character weapon door (6b in mp-ui2bro).
  - The MS text itself (the "no portrait above the grid" rule) is the owner's, so a later owner line is needed.

4. KIT
- src/ui/kit/ pieces:
  - Action.jsx: the five-colour action button, plus a disabled-with-reason helper.
  - ActionRow.jsx: bottom action zone with stable slots and a reason beside each off action.
  - Badge.jsx: count and dot.
  - Confirm.jsx: the one confirmation.
  - EmptyState.jsx: absent/locked states.
  - Frame.jsx: gold-rimmed frame.
  - Group.jsx: recessed info group (Ui2Group) and stat headline (Ui2Stat, raised, with a chevron).
  - Header.jsx: Back / title / Menu / Close.
  - ItemGrid.jsx: grid of item cells.
  - Loading.jsx: skeleton rows.
  - Progress.jsx: bar.
  - Slot.jsx: rarity socket.
  - Tile.jsx: destination tile (primary or compact).
  - TwoPanel.jsx.
  - Zones.jsx: four screen zones.
  - UiKitPage.jsx (?uikit=1), sampleData.js, shine.js, mountKit.js, index.js, ui2.css (677 lines).
- Tokens: src/game/ui2Tokens.js (248 lines, no imports). ui2.css lines 25+ hold a generated block under `.ui2` (`--ui2-*`). Regenerate with `node tools/guards/ui2-tokens.test.mjs --write`; never hand-edit.
- Values today (UI2_SURFACE etc.):
  - Dashboard base: page #193145 (--ui2-page); frame gradient frameTop #223D53, frameMid #1C3549, frameBottom #172C3E.
  - Navigation / raised surface: raisedTop #294765, raisedMid #27425D, raisedBottom #1F374E; selected: sunkTop #122334, sunkBottom #1B3349.
  - Recessed: well #102336, wellSoft #152B3F, wellDeep #0A1724.
  - Border: no single border token; edge size 1 px (UI2_SIZE.edge), rim 2 px. The gold rim is brass #D8AA58 (deep #8C6530). The raised edge is a hardcoded rgba(150,195,230,.24) in ui2.css:237.
  - Primary text: ivory #F4F0E7; muted #BCC8CC; disabled #6F8087; onAction #141D22.
  - Gold: brass #D8AA58, highlight #EAC675; text gold #EAC675.
  - Also: five action faces (gold/green/blue/red/silver), UI2_RARITY, UI2_FILL (#F1D58E / #D9AE5C / #B98B3E), UI2_LIGHT (shine .5, gloss .12, edgeLight .16, shadow .42, sinkShadow .55, brush .035).
  - Sizes: touch 44, bevel 2, sink 3. Radii: frame 14, tile 12, button 11, group 10, slot 8. Font Merriweather. Type: 10/11/12/13/15/17/24.
- Three weights, distinguished?
  - (a) Raised navigation button: yes. `.u2-raised` (ui2.css:234), with `.u2-tile` (:301), `.u2-ctl` (header) and `.u2-stat` (:362) built on it. Gradient + bevel + drop shadow + gloss. Selected = `.is-sel` / aria-pressed.
  - (b) Recessed statistic: yes. `.u2-group` (:341), with `.u2-group-k`, `.u2-group-v` (:351-359); also `.u2-track` and `.u2-slot`. Inset shadow, not pressable.
  - (c) Flat supporting info: NO dedicated class. Closest is plain `.u2-group-k` / `.is-none` text, or per-screen classes (e.g. combatPage.css `.u2-wp-sup`, gearPanels.css `.u2-gp-head` background rgba(0,0,0,.22)). There is no third tier in the kit.
  - Also `.u2-act` for actions.
- Token guard: tools/guards/ui2-tokens.test.mjs. It asserts:
  - 1: the one dark label on every stop of the five faces (pressed and glossed) >= 4.5:1.
  - 2: ivory/muted/gold on all dark surfaces >= 4.5:1.
  - 3: badge figure contrast.
  - 4a/4b: touch 44, text floor 11 (badge 10).
  - 5/5b: five actions with 3+3 stops, pressed darker.
  - 6: the grades are the game's.
  - 7: the style sheet's generated block equals the module.
  - 8a-8h: no hex outside the block, font sizes are tokens, no url() or image-set, no filter/backdrop-filter, every token read exists, reduced motion, the shine switch, every rule under `.ui2`.
  - 9: contrast arithmetic. 10: Google Fonts weights.
  - So a palette change must stay >= 4.5:1 and be regenerated with --write.
  - Hardcoded rgba literals (edges) pass 8a.
- Master spec on palette/bevel:
  - MS part 2 (UI_MASTER_SPEC.md:118-121): "Use the existing Lantern Slate identity, not a new brown/wood... The newer Character reference shifts toward a richer metallic blue-slate. Earlier illustrative palette references (not mandatory final colors) include slate #26383E, panel #1E2E34, raised #293B41, recessed #111E23, deep #0B161B, brass #D8AA58, highlight #EAC675, light text #F4F0E7. These are working references..."
  - :121: "Rounded metallic buttons have broad continuous gradient surfaces and graduated bevels."
  - Latest-decisions row (:26): "Moderate excessive gold, glare, dark bevels and heavy text shadows."
  - :136: "Exact token values and typography are delegated, not hardcoded from screenshots."
  - Notes row 22 (:38): the kit's blue-slate is a tuning, "the kit's to judge".
  - The palette is NOT fixed.

5. COMBAT HUB AND WEAPON PAGE
- Files: sheet/CombatHub.jsx (113), WeaponPage.jsx (195), SharedPage.jsx (160), StatTree.jsx (227), statWindow.jsx (the preview), combatPage.css; rules src/game/combatHub.js (combatPools, combatHubDoors, spendPool, weaponAttributes, TREE_PAGES), src/game/progression.js, src/game/metricTree.js; sheet/broStats.js broWeaponStats; sheet/HeroExpanded.jsx (3,539, the old Points/Build lanes).
- Hub (CombatHub.jsx:57-110): upright, a row of three raised weapon cards (.u2-cb-door, each art + name + "Lv N" + XP bar + "n points") and under them one wide Shared Attributes card (:30 px art). Icon art 32x32 (combatPage.css:19; Shared 30; sideways 26). Sideways: one row of four. Points glow while > 0. The tile sizes are flex, not fixed (min 44).
- Weapon page (WeaponPage.jsx):
  - Row 1: level plus continuous XP bar (28 px).
  - Row 2: DPS headline (Ui2Stat, min 104 px, opens the stat tree) plus a 2-column support grid (Damage, Attack speed, Crit, Range; WEAPON_SUPPORT :52).
  - Row 3: "Attributes" header column (.u2-wp-attrhead, 76 px, flex 0 0 76px at combatPage.css:52; it shows the pool count "n Sword points to spend") on the LEFT, then the six attributes as 3x2 tiles (.u2-wp-tiles :56; 6x1 sideways :76; 26 px art :62).
  - So a left-side "Attributes" column exists (the header, not the six).
  - DPS, damage, crit, speed and range are in row 2 (summary zone), subordinate. No Element row.
  - The six are spent via the tile -> statWindow.jsx -> infoPopupBus preview (stepper, before/after, Spend); the pool is chosen by combatHub.js spendPool. The Shared page is the same pattern with seven.
- Pinned by tools/guards/combat-hub.test.mjs (CHECKS, words, doors with weapon level+XP, attributes read from that weapon only, plants; uses the Babel parser), tools/guards/metric-tree.test.mjs, tools/guards/traps-combat-rules.test.mjs, and tools/qa/mp/mp-ui2combat.mjs:
  - 1a-1d: four doors, counts, 390x844 fit, no EHP.
  - 2a-2d: Sword page = level 12 + XP, DPS headline, Damage/Attack speed/Crit chance/Range (no Element), six attributes; "Attributes" names the Sword pool and its text "N Sword points to spend" (:196); level+DPS+six in view at 390x844 (roomOk(Wp,7)); no EHP; no /999.
  - 3a-3i: preview and Spend.
  - 4a-4e: three sizes.
  - 5a-5d: computer.
  - 6: ?ui2=0.
  - 7a-7h: tree.
  - So moving or renaming the Attributes header/column, or the 3x2 tiles, would redden 2a, 2b, 2c.
  - states.mjs ui2-combat-* (:862-877); shots ui2-combat-*.

6. MENU GRID AND GEAR
- dash/MenuGrid.jsx (165 lines). Shape from dashDests.js:110 menuGridShape(n, sideways): 8 doors upright = 4 cols x 2 rows; sideways one row of 8. Six doors = 3x2. Gap 6 px (MenuGrid.jsx:103). Tile art `short ? 28 : 46` px (:99). Tile kit class `.u2-tile.is-primary` art 46x46 (ui2.css:314). Bevel comes from `.u2-raised`: bevel 2 px, sink 3 px. Tiles are equal and 44 px minimum. Pinned by mp-ui2frame 3a/3c (eight tiles, four by two, order, none larger than another), 9, 10b; dash-nav.test 199-202.
- Gear: dash/GearPanels.jsx (407 lines), rendered through kit TwoPanel.jsx. Panel header: Ui2TwoPanel `.u2-pane-head` / `.u2-pane-title` (ui2.css:609-622), the label from GearPanels.jsx:387 ("Inventory") and :397 ("Equipped"), height HEAD = 30 (:65). Gold: GearPanels.jsx:130-133 `<span class="u2-gp-coins" data-gear-gold>`, coin image 18 px (gearPanels.css:14) + barNumber, in InventoryHead (:118), mounted :388 and :391 (sideways, in a 52 px column). Under ?ui2=0 the old header is dash/GearTab.jsx:581-630 (coins as a bag-slot button, data-gear-gold-badge). Pinned by mp-ui2gear 1, 8, 9a. Rules: workspace.js; summaries.

7. LIFE SKILLS AND RANKS
- Not rebuilt under UI2 on main. Life Skills = dash/SkillsPanel.jsx (old, 3-col card grid, 293 lines). Ranks = dash/RanksPage.jsx (401) through LeaderboardPanel.jsx and rules src/game/ranksPage.js (the older rankstyle redesign of 2025-11-25: four tabs, medalOf, youRow). The Bro tile for skills hangs today's panel (BRO_HUB_DOORS skills -> page:skills). No lifeProfile.js, ranks-ui2, or UI2 code exists for either on main. The old Ranks draws a gold/silver/bronze medal and a crown (BoardRow's RankMark, Crown), Lv pills, bars, and your row always pinned (RanksPage.jsx:260-280, mineRing).
- UI2-life.md (origin/claude/plan-orc, 62 lines) decides:
  - Reading 2: headline "Total level" with the sum, large; "the ten as equal kit tiles in display order (upright five across, two down; sideways one row of eleven...), each its picture, name, 'Lv N' and a thin continuous XP bar"; a level-up not yet looked at wears the brass dot; "No radar, no labels, no 'highest' badge".
  - Reading 8: room 172 px, no scroll for a primary fact, never smaller text.
  - Skill page: level + XP bar, next unlock, door to all unlocks.
  - Overruled by a request for bigger cards/icons or level badges: the five x two tile shape; the "thin XP bar", "Lv N" text and no "highest" badge.
- UI2-ranks.md (60 lines) decides:
  - Reading 3: a row is "the place (the game's gold, silver, bronze medal for 1-3, the number below), the face and name, the one value. NO Lv chip except on Combat level, where the level IS the value. No bars, no gradients, no laurels: subdued rows, at least 44 px each".
  - Reading 4: "Your standing: pinned at the foot ONLY while your real row is out of view... never a second copy when it shows."
  - Reading 5: a tap opens that player's Character.
  - MS 7 (UI_MASTER_SPEC.md:371-374) says: "subdued rows... avoid competing gradients and outlines. Prestige accents should not obscure legibility. Use the shared design system for award styling."
  - Lines a request for medals/gradients on the top three rows, level badges on rows, or an always-highlighted own row would overrule: "No Lv chip except on Combat level"; "No bars, no gradients, no laurels"; "pinned ONLY while your real row is out of view". Medals for 1-3 are allowed by the card (gold/silver/bronze), but not gradients.

8. BUILD PLAN (docs/design/UI_ARCHITECTURE_V2_PLAN.md)
- Steps (built = merged on main):
  - 1 UI2-kit: BUILT (ui2Tokens.js, kit, ?uikit=1).
  - 2 UI2-frame: Gear and Menu, one header, history. BUILT (PR a ON; PR b the growing motion, #2371 merged).
  - 3 UI2-bro: Bro's six doors, Character. BUILT (PRs a and b).
  - 4 UI2-combat: hub, weapon page, Shared page, stat tree. BUILT (v2.3.6685, 6686).
  - 5 UI2-gear: two panels (PR 2 merged, #2375 / 6688); PR 3 (Bro's Equipment page) and the item page: status NOT VERIFIED beyond that. Check docs/plan/status/UI2.md.
  - 6 Quests / Ranks / Codex, then Life Skills / Feats / Pets: NOT built (cards on plan-orc).
  - 7 Social / Map / Notifications / Homestead / Settings: not built.
  - 8 shop / bank / craft / trade / folk: waits for owner F3.
  - 9 UI2-who: peer pages, waits for owner F2 (deploys the worker).
  - 10 UI2-rest: clean-up: not built.
- Rules for each step (Plan :18-28): the band height never changes; no game rule changes; nothing lost; built from the kit, never restyled (a missing piece is added to the kit and to ?uikit=1); rules as modules with suites in tools/guards/ (never server/test/); one of each piece; same-change rows (states.mjs state + docs/UI-DESIGN-NOTES.md section with the owner's words, data-esc, deskKeys, phone test); no memory rise; pictures at DPR 2 in docs/shots/ui2-*.png. Plan :51: "no step touches src/ui/BroTown.jsx or a renderer without asking the orchestrator which card holds it". Plan :50: every step adds a row to dashDests.js, states.mjs and UI-DESIGN-NOTES.md.
- Rule for changing the owner's baseline: UI_ARCHITECTURE_V2.md part 13, "Decision log" (:357-363). "a line goes here only when the OWNER approved it, in their own words, after 2026-11-25. Each line is dated, quotes or names the owner's words, and says which part above it settles or changes (REPLACES / SHARPENS / CHANGES / NEW)... A session's recommendation, a plan's reading... is never written here: those live in UI_ARCHITECTURE_V2_PLAN.md until the owner says yes. Nothing above this part is edited". The current UI2 block is :454-470. A new owner document is a new part at the end with its lines in part 13. The master spec (UI_MASTER_SPEC.md) is kept word for word and not edited; the PLAN's "readings chosen" (:143-152) and the NOTES hold the repo's choices. The owner's words also go in the screen's section of docs/UI-DESIGN-NOTES.md (e.g. :703 "Bro under the new dashboard"; :2316 "The new dashboard kit"). Status file: docs/plan/status/UI2.md.
- Picture-diff guard that reddens on kit colours: NONE found. No pixelmatch or golden-image guard under tools/guards. The only guard that goes red on kit colours is ui2-tokens.test.mjs (contrast, and the generated block must equal ui2Tokens.js). mp-uikit.mjs (tools/qa/mp) only takes screenshots (:98, :107). The phone tests (mp-ui2*) assert layout, sizes, text and states, not colours. Shots are written for review, not compared.
- docs/shots/ui2-*.png: 55 files.

FILES IN COMMON (E = edits; marks: [BT]=src/ui/BroTown.jsx, [BD]=src/ui/mobile/BottomDashboard.jsx, [DD]=src/game/dashDests.js, [BH]=src/game/broHub.js, [ST]=tools/qa/ui-review/states.mjs)
- HUD: src/ui/QuestCard.jsx; src/ui/mobile/ZoneHeader.jsx; src/styles/game.css (--bt-hud-top :2551); a new HUD component; portraitStore.js (read only) / characterPortrait.js; [BT] for the mount near :14346-14355 and :14526 (and the online-count state :2341-2359 / InfoPanel :15844); src/game/heroModel / progression.js (bestWeaponProgress, prog3CharLevel read only); src/ui/panels/PartyHUD.jsx (collides at top:92, left:8); mp tests mp-topbarplace, mp-trackquest, mp-questline, mp-firststeps, mp-weaponswap, mp-coachdesk, mp-race, mp-questguide (read #bt-hud-top / QuestCard); server/test/quest-card.test.mjs; [ST] (hud states); docs/UI-DESIGN-NOTES.md "The world screen (HUD)" :298 and :367-382. [BD] only for the portrait bake (:966-1015) if moved.
- Bro + Character merged: [BH] (BRO_HUB_DOORS, BRO_HUB_PAGES, broPassport, PASSPORT_DOORS, BRO_PROGRESS_ROADS); [DD] (FRAME_PAGES broCharacter, MORE_ROADS journey); sheet/BroLanding.jsx, CharacterPage.jsx, BroPages.jsx, BroCard.jsx; src/data/say/dashFrame.js, charPage; [BD] (door switch/PANELS hooks, if BroCard calls changed); kit Zones/Group/Tile use; tools/guards/bro-hub.test.mjs, dash-nav.test.mjs; mp-ui2bro.mjs, mp-ui2frame.mjs (4d, 3a), mp-ui2combat (if Combat entry changes); [ST] (ui2-bro-*); shots; UI_ARCHITECTURE_V2.md decision log + UI-DESIGN-NOTES.md :703.
- Kit weights and palette: src/game/ui2Tokens.js; src/ui/kit/ui2.css (regenerate block with --write; rules like :234-262, :341-377); kit pieces Tile/Group/Header/Action; src/ui/kit/UiKitPage.jsx, sampleData.js; tools/guards/ui2-tokens.test.mjs; mp-uikit.mjs; per-screen CSS using hardcoded rgba (combatPage.css, gearPanels.css, itemPage.css); no [BT]/[BD]/[DD]/[BH]; [ST] only if a new state or ui2-kit shot (:2030); docs/shots/ui2-kit-*.png; docs/UI-DESIGN-NOTES.md :2316; and the decision log if the palette is the owner's call (MS 2 leaves it delegated).
- Combat + weapon page: sheet/CombatHub.jsx, WeaponPage.jsx, SharedPage.jsx, StatTree.jsx, statWindow.jsx, combatPage.css, broStats.js; src/game/combatHub.js, progression.js, metricTree.js; [DD] only for FRAME_PAGES rows; [BH] only for BRO_HUB_PAGES; tools/guards/combat-hub.test.mjs, metric-tree.test.mjs; mp-ui2combat.mjs (steps 1c, 2a-2d, 4b, 5b); [ST] (ui2-combat-*, :862-877); shots ui2-combat-*. If merged with Character: also the Bro+Character list above.
- Menu grid + Gear: dash/MenuGrid.jsx (art :99, gap :103); kit Tile.jsx and ui2.css :301-327 (.u2-tile.is-primary art 46); [DD] (menuGridShape :110, MENU_DESTS); dash/GearPanels.jsx (InventoryHead :118-135, side :383-399) + gearPanels.css (:13-18, :45-47); kit TwoPanel.jsx + ui2.css :609-622; GearTab.jsx only for ?ui2=0 (header :581-630); mp-ui2frame (3a, 3c, 9, 10b), mp-ui2gear (1, 8, 9a); dash-nav.test.mjs (:199-202); [ST] (ui2-frame-*, ui2-gear-*; 'more' :847); [BD] only if the frame's calls change; docs/shots ui2-frame-*, ui2-gear-*.
- Shared across several: [DD], [ST], [BD] (frame wiring), docs/UI-DESIGN-NOTES.md, tools/guards/dash-nav.test.mjs, mp-ui2bro/frame, ui2.css. [BT] is touched only by the HUD change.
