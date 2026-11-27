# BroTown — UI Architecture & Redesign Handoff

> **THE BASELINE IS NOW `UI_MASTER_SPEC.md`; this file is the history (added in the repository, v2.3.6405; not the owner's words).** The owner's master specification of 2026-11-25 (about 23:50 UTC) gathers questions 1 to 108 and the feedback after them into ONE implementation baseline; by its own words it "supersedes the prior incremental handoffs where they conflict", and with it the owner AUTHORIZED the building. A builder reads `UI_MASTER_SPEC.md` (the owner's document, word for word), `UI_MASTER_SPEC_NOTES.md` beside it (where the game stands over the specification, and what is flagged to the owner) and `UI_ARCHITECTURE_V2_PLAN.md` (the build plan), and does not need this file. THIS file keeps the four hand-offs word for word (parts 1 to 12, 14, 15 and 16) and the decision log (part 13), which still takes every new dated line of the owner's. Where a part of this file and the master specification differ, the master specification holds; where either differs from the game's own content (a name, a grade, a number, a rule of play, a picture), the game's holds, by the owner's rule of the same evening (part 13's last block). The three notes under this one say how the four hand-offs rank among themselves: they are history too.

> **How the parts of this document rank (added in the repository, v2.3.6402; brought up to the third document, v2.3.6403; not the owner's words).** This is ONE document made of the owner's three of 2026-11-25. Parts 1 to 12 are the baseline (through question 35), word for word. Part 14 is the addendum of the same day (questions 36 to 72), word for word. Part 15 is the FINAL architecture addendum (questions 73 to 85), word for word. Where they differ, **the later document wins**: part 15 over part 14, part 14 over the baseline. Part 13, the decision log, says in one dated line each which line of an earlier part a later one settles or changes; **a later line of the log wins over all three**. Three kinds of thing are kept apart everywhere: what the owner CONFIRMED (a requirement), what the addendum calls PLANNED gameplay (not in the game; never built for a screen), and what is still OPEN (a question, never a guess). What the game does today is in `UI_ARCHITECTURE_V2_AUDIT.md`; the phases and the open questions are in `UI_ARCHITECTURE_V2_PLAN.md`.

> **This document keeps growing, and nothing in it is lost.** The owner, 2026-11-25, with the addendum: *"Maintain a comprehensive, persistent specification that we can continue updating without losing any prior decisions"*; *"Do not begin implementation or final visual redesign yet. We are still completing the architectural design process."* The third document came the same evening (*"Here's more to the plan (this completed architecture)"*) and is part 15: it closes the foundational architecture at question 85. What the owner sends NEXT (the visual language, then mockups at the real dashboard's size: part 15 §7) is added the same way: its own new part at the end, word for word, its headings one level down; one dated line in part 13 for each line of an earlier part it settles or changes; and the table below brought up to date. No earlier part is ever edited.

> **The fourth document: the look (added in the repository, v2.3.6404; not the owner's words).** The owner's next document did come, the same night (*"Hers more"*), and is part 16: the VISUAL design hand-off, questions 86 to 108, word for word. So this is now ONE document made of the owner's four. Part 16 is about the look and keeps the architecture (its own words: "retaining architecture decisions"; "an incremental design record, not authorization to implement or replace existing art"): where it speaks of the look it is the latest word and wins; it changes no architecture decision of parts 1 to 15. Inside it a FOURTH kind of thing is kept apart from confirmed, planned and open: what it calls WORKING (its eight palette values, its five action colours' exact hues, its prototype's geometry and crops): a reference, not a decision. What the owner sends after it (their own mockups, the Bro landing screen first) is added the same way.

## 0. The status of every decision (the repository's index, v2.3.6402; brought up to question 85, v2.3.6403; to question 108 and the look, v2.3.6404; to the master specification and the authorization to build, v2.3.6405; not the owner's words)

**ARCHITECTURE APPROVED (questions 1 to 85). LOOK APPROVED (questions 86 to 108, and the three reference pictures of the master specification). BUILDING AUTHORIZED by the owner, 2026-11-25, about 23:50 UTC: *"You are authorized to begin implementation."* There is no approval gate a menu (*"Do not wait for approval of every individual menu design"*): each step of `UI_ARCHITECTURE_V2_PLAN.md` is built in the real game and judged by the owner on real screenshots. The owner keeps the choices of gameplay and architecture (*"Flag significant architectural or gameplay conflicts for my review, but independently resolve ordinary visual and implementation decisions"*): those are listed in `UI_MASTER_SPEC_NOTES.md`, "Flagged to the owner".**

**What the master specification changed in the two tables below** (v2.3.6405; each is a dated line of part 13's last block). The tables are true to the four hand-offs; these six lines hold over them:

- **The old tab strip is retired completely**, not kept beside the new frame (the Navigation row).
- **Bro's landing is six buttons only**, under the one header, with NO player banner; the fifth door is **Feats**, the approved name for Accomplishments (the rows Bro and Accomplishments).
- **Character** is an RPG passport: a large portrait with the combat level beside it, the name and title, and supporting summaries; not a page of combat stats.
- **Combat**: three weapon channels and the shared attributes; a weapon's own screen (level and XP, DPS, supporting stats, six attributes); shared points and effective health belong to the shared screen; the existing allocation preview opens when an attribute is picked, never as a permanent panel.
- **All chrome is drawn by code**; only the game's own pictures are image files (the row "The visual system", and every row of "The look").
- **What comes next** is no longer the owner's mockups and their approval: it is the build, step by step (the last rows of both tables).

**What the owner's suggestions of 2026-11-26 changed** (v2.3.6780; kept whole as `UI_FEEDBACK_2026-11-26.md`, named by part 17; each a dated line of part 13's last block, added by the PR that builds it): **three weights**, used throughout: raised only for destinations and actions, an important number recessed and large, supporting information flat in one shared container; **the palette** is the owner's six (base #14232F, navigation #223D53, recessed #0E1D29, borders #4B6275, text #F1F0E9, gold #EAC474), over the master specification's illustrative values; **softer bevels and shadows, one type** on every navigation button. The later PRs of card UI3 add their lines (the persistent character HUD, Bro and Character as one page, the Combat template, the Menu's grid and Gear's headers).

A finder, true to parts 1 to 12, part 14 and part 15 and no more: where the three documents and this table differ, the documents hold. **Approved architecture** is the owner's decision. **Planned gameplay** is what the owner says is NOT in the game yet: no screen's work builds it. **Open** is the owner's still to decide. The design's checkpoint: question 85 answered; the architecture's questions are closed, and the details each row lists as OPEN stay open (15 §7). "15 §3" is the final addendum's own section 3. What the game does today is not in this table: it is the audit's.

| Area | APPROVED ARCHITECTURE (where) | PLANNED GAMEPLAY | OPEN |
|---|---|---|---|
| The mandate | Clarity first, by the child's unassisted task; the band's height fixed; phone first; destinations with a word and a picture; summary first, detail by a tap; a labelled Back, no second tab bar; an invisible modular grid (part 1; question 35); restated by 15 §1 (nothing primary found only by scrolling); and the closing principle, **consistency in interaction, creativity in presentation**: one shared framework of pieces, with a distinctive interior where the subject earns one, never separately themed applications (15 §6; question 85) | none | every view's exact measures (part 11; 14 §8; 15 §7: "actual dimensions") |
| Navigation | Two workspaces, Gear and Menu, each remembered; one contextual header; Back is the real journey and restores the place left; Close hides and resets nothing; a shortcut on the world opens the same destination; a Menu shortcut on deep screens, to the directory's root (part 2; 14 §2.1) | none | the directory's labels, order, Map's and Settings' places; a quick Gear affordance; the closed band's controls (part 11; 14 §8) |
| Whose it is, zones, scrolling, empty and locked | Another player's things are named as theirs, yours are not; fixed zones in order, an empty one gives its room back; nothing primary behind a scroll, collections sorted then scrolled, the inventory scrolls; a destination keeps its place when empty or locked and says why (14 §2.1; questions 46, 48) | none | the fallback for a collection too large |
| The drill-down's motion | A container expands into the next screen and contracts on the way back; never a slide; only the band's content moves (14 §2.2; question 47) | none | the duration; the no-origin fallback and reduced motion are proposals |
| Actions and notifications | Information, destinations and actions told apart; actions in a bottom zone; the costly or irreversible is confirmed; one route for notifications, toasts and a centre, a tap to the real destination, those needing an answer stay (14 §2.3) | none | where notifications sit, which events make one; the actions' colours |
| Bro, the universal inspection | One structure for yourself and another player; complete transparency, no authority over another's data; three primary doors (Character, Combat, Equipment) and three secondary (Life Skills, Accomplishments, Pets) (part 3) | none | where the Homestead link sits (14 §6.4); the portrait's size |
| Character | An identity card, not a stats page; two worked-out labels, combat and life skills, under the identity, apart from earned titles (part 3.1; 14 §4.2; questions 59, 60) | none | the labels' thresholds, ties, a beginner's label |
| Combat | Four channels (Sword, Bow, Staff, Shared), a screen each; DPS the offensive headline, effective health the defensive one as a concept; the existing attribute preview kept; the pools told apart (part 3.2) | none | the effective-health formula |
| The comparison | One piece everywhere, the transformation form: now, compared, the signed change; automatic for a change you could make, optional between two things; the resulting character's performance, never "universally better" (part 4.1; 14 §3.1; question 49) | none | effective health's model; mixed and multi-weapon comparison; other item types' headline |
| The stat tree | A headline opens into its factors one layer at a time, down to the real calculation (part 3.2; 14 §3.2; question 50) | none | the real branches, from the game's calculation |
| A skill's progression | Level, XP and a roadmap of real unlocks on one screen; every unlock shown, future ones too (14 §3.3; questions 51, 52) | none | how a very large roadmap is sorted |
| Life Skills | One overview: the sum of levels as headline, a radar, each skill a door with its level and small XP bar (part 3.4; 14 §4.1; question 58) | none | the radar's scale; a board for the combined level (suggested, not confirmed); the skills' list and caps |
| Accomplishments | AP the headline, opening into its sources; achievements by medal tier, then a gallery, then a medal; titles with their requirement at a glance, families only where real; lifetime records as career highlights (part 3.5; 14 §4.3; questions 53 to 57) | none | the tiers and their mapping; AP's sources; which records lead |
| Pets | The active companion first; Owned Pets; All Pets from the Codex's collection (part 3.6; 14 §4.4; question 61) | unequipped pets living on the farm | which pet facts are real (the wireframes' were examples) |
| Equipment (on Bro) | A showcase of the character and what it wears, no private inventory; one item inspector (part 3.3) | none | the figure's size and background |
| Gear | Two panels, bag and worn; the quick look replaces the opposite panel; one full item inspector; nine slots; the automatic comparison (part 4) | none | the silhouette's geometry, the grid's size, where the bars live |
| Quests | Active quests first as rows; the journey first; the future hidden; Story and Rewards apart (part 5; kept as the deliberate exception by 14 §3.3) | none | none named |
| Highscores | Categories that mirror Bro's; a plain standings list, one metric; your row pinned only when out of view; a tap opens the player (part 6) | none | the categories; a combined life-skill board |
| Codex | A complete encyclopedia by type of thing, not gated by discovery; one inspector a type, whatever the way in (part 7); a collection is illustrated cards, the picture leading, with a little essential information that depends on the type, never a dense database list (15 §2; question 73); a thing's page is a large showcase of the real animated picture with subject doors that say what they hold and open into their own views, the same page from the Codex and from the world (question 74); a monster's loot is plain rows: the item's picture, its name, its rarity and its exact chance together, a row opening the one item page, and the way back from an item to its sources where the data allows (question 75) | furnishings as a kind of entry ("when the feature exists") | the supported categories and each one's list; where search sits and what it searches; the showcase's proportions; the loot engine's real meaning of a chance (15 §2: single item, tier, conditional rolls, modifiers) |
| Shops | A larger shop opens on categories of goods, a small merchant goes straight to the goods; a two-panel workspace that reuses Gear's grid and quick look: the goods stay in their place, the other panel shows the picked item, its price, the comparison where it means something, and Buy; selling uses the real carried bag; the currency and the balance always shown (15 §3; question 76) | none ("No new merchant inventory or services are mandated") | categories, quantities, stock, the exact buy and sell steps: by what the game does |
| The bank | Stays the storage. The carried bag and the bank shown together, each labelled, each scrolling inside its own panel, with the real room and how full where there is a limit; filters by category, stack counts, the picked item's look, clear Deposit and Withdraw (question 77) | storage at the farm ("if farm storage is introduced later ... not approved gameplay work here") | bulk deposit and moving part of a stack ("illustrative possibilities": verify, and never sweep up something protected or worn) |
| Trading with a player | Two screens. FIRST the offer is built: your bag beside both players' offers, whose is whose always clear. THEN the review: You Give against You Receive, counts and gold, gold in the transformation form (now, after, the signed change), the other player's acceptance shown and a distinct last confirm. Both confirm the SAME final offer; any change resets both; held by the server, not the screen; never "complete" before the server says so (question 78) | none ("no unsupported trade system") | where today's trade differs from the safeguards: a gap named for review, never a quiet weakening |
| Crafting | Recipes as illustrated collections with their requirements; a two-panel workspace (recipes on one side; on the other the product, the materials, have against need, how many, Craft); an expanded view that shows materials becoming the product; a change of quantity works the materials out again; no extra confirmation for a routine craft; one framework for every craft the game supports; the server decides costs, results and whether you may (question 79) | farmhouse furnishings ("planned content, not an implementation instruction") | none named |
| A townsperson | A living profile: the real animated figure, the name, the role, a short line of talk where there is one; clearly labelled doors for the services THAT townsperson gives, larger when there are only one or two, never empty filler; it shares the Codex's showcase piece; the Codex's entry only informs, the services need the meeting in the world, by the trigger the game already has (15 §4; question 80) | none | none named (the wireframes' names and lines were placeholders) |
| Social | Its own destination; a living network: you in the middle, Friends, Clan, Party, Nearby in fixed places, no Guild circle; a circle opens its gallery, a player opens the inspection; a bottom bar of social actions on another player (part 8; 14 §5; questions 62 to 65) | no new party, messaging, moderation or clan mechanic is authorised | presence and sampling; the supported actions; privacy; the performance budget |
| Homestead | Its own destination, apart from Life Skills; a miniature of the REAL property; the farmhouse in three views; another player's property read-only through their profile (part 8; 14 §6; questions 66 to 70) | buying more farmland; building a customised farmhouse; furnishing it; visiting another's property (and pets on the farm, above). Storage stays at the bank | the land's grid, rules and prices; construction; access and permissions |
| World Map | Two views of one world, Geography and Connections, with a labelled switch; world, then region, then the region's own map with what it holds (14 §7; questions 71, 72) | none (no fast travel, route finding or tracking is to be added) | the real topology and what may be seen; how each category opens; zoom controls; the Map's place in the directory |
| Settings | A destination (part 2), and the named exception to destinations-first: the controls a player changes most sit on its first page, ready to use (the examples: music volume, sound-effects volume, graphics quality, "if supported"); the rest are labelled categories under them with their own screens; a safe, reversible setting applies at once; an account action that cannot be undone is confirmed (15 §4; question 81) | none ("do not invent controls or hardware capabilities") | which controls are the quick ones: by what the game has |
| Feedback | Four strengths, matched to what happened: routine (the piece updates, a brief local sign), noteworthy (a passing notice in context), milestone (stronger animation and sound), exceptional (a memorable arcade reveal). Everyday actions never feel like a celebration; nothing gets in the way of a fight; a big reveal waits for a safe moment or for the player to open it; sound and motion preferences respected; no success shown before the server confirms (15 §5; question 82) | none | which of the game's events is which strength ("during implementation") |
| An action you cannot take | It stays in its usual place, visibly disabled, with a short reason beside it; no separate checklist, no hunt through progression for why; several reasons are given briefly; never colour alone; the server still checks (question 83) | none | none named |
| Loading, pending, connection | A loading collection shows what it has and placeholders, never a false "empty" or "all here"; a change being made marks the control that was pressed and holds back only repeats and conflicts; a failure says why and offers a safe retry, never claiming nothing was spent unless the server's state says so; a lost connection says so, keeps the place and allows no change it cannot make; an unknown outcome is shown as unresolved, and checked before a retry; only what is affected is locked (question 84) | none | the exact protocol ("depends on the repository audit") |
| The visual system | No longer deferred: the foundational direction is APPROVED (part 16; questions 86 to 108): a polished Lantern Slate with the game's own art kept. Its decisions are the table "The look" under this one. (Before it: deferred by parts 1, 11 and 14 §8; made the next phase by 15 §7) | none | the exact font; the exact hues; the production mockups; the approval to build (the table under this one) |
| How to carry it out | Not decided: part 9's sequence is the assistant's proposal, and the acceptance tests of part 10 and 14 §9 are proposed, not run. The owner, 2026-11-25: no implementation begins yet. By 15 §7, before any building: the repository audited (the audit file beside this one, its three halves), every approved destination mapped to what the game supports, conflicts and gaps surfaced rather than mechanics invented; then reusable pieces in phases AFTER the owner's approval | none | the owner's approval of the visual direction and of the phases |

**The look (v2.3.6404).** The same finder for part 16, true to it and no more. **Approved** is the owner's decision. **Working** is part 16's own word for a reference it does NOT fix. **Open** is the owner's still to decide. "16 r5" is the fifth bullet of its "Material and component rules". What the game looks like today (its real colours, fonts, rarity names, buttons and pictures) is not in this table: it is the audit's fourth half, "The look", and the plan's "The kit for your mockups".

| The look's part | APPROVED DIRECTION (where) | WORKING (a reference, not fixed) | OPEN |
|---|---|---|---|
| The identity | A polished Lantern Slate; the game's own artwork and aesthetic kept; never a new brown or wood, generic fantasy or black-and-gold theme (question 86; 16 r1) | the eight palette values of 16 r1 | the exact hues |
| Surfaces and depth | Recessed information, raised navigation, clearly different action buttons (87); smooth rounded metal, no chamfered corners (88); gold restrained to the outer frame's thin rim and intentional accents (89); fine brushed slate, a low-contrast directional texture (90); polished metallic gradients with broad reflected light, no thin shine lines, no flat outlines, no screws (102); a shallow frame for the dashboard, pronounced depth kept for controls (103) (16 r2, r3) | none | how the texture and the metal are made; every measure |
| Type | A classic RPG serif, as a direction (91; 16 r8) | none | the font itself (licensed, tested on a phone for legibility, numerals that line up, and performance); the type scale |
| Destinations and their art | Artwork directly on raised navigation tiles, items and equipment in recessed sockets (92); large illustrated tiles for primary destinations, compact ones for secondary, the universal directory still equal-weight (104); art leads on a primary tile and balances the label on a secondary one, full colour, never monochrome line icons, always a readable label (105); the game's existing art is authoritative, no generated replacement, new matching art only for a genuine missing asset after the existing ones are audited (16 r9, r10) | the placeholder vector icons of the design conversation | which pictures are genuinely missing (the audit lists them); the new art for those |
| Rarity | Told mainly by the outline, with graduated prestige; dark recessed interiors; a cue beyond colour; reduced motion respected; the game's actual rarity definitions, colours and artwork preserved, no invented tier or probability (93; 16 r6) | the tier names in 16 r6 (common, rare, epic, Godly) | the names a player reads where the game's differ (the audit: the game says Normal, Rare, Elite, Godly) |
| The states of a control | Selected looks deeply pushed in, by inverted depth, shadow and lighting, its footprint, layout, label and rarity outline unchanged; a momentary press told apart from a lasting selection (94; 16 r5). Locked or unearned art desaturated, its colour back when unlocked, still inspectable, its status and requirements clear (106; 16 r13). Count badges for countable things, dots for a general update, a rare warm illumination for the exceptional, no perpetual competing glows (107; 16 r13) | none | which controls are a press and which a selection |
| Numbers and density | Continuous metallic progress fills in recessed tracks, the game's own health and mana conventions kept (95); ordinary numbers ivory or white with muted labels, colour only for what means something (96); a balanced headline and supporting hierarchy, no scoreboard (97); adaptive, strongly minimalist density, one meaningful question a screen, denser only where comparing or managing needs it (98) (16 r7, r12) | none | the type scale |
| The header and the actions | The title integrated on the slate with raised Back, Menu and Close, no title plate (99; 16 r11); a full-width button for one simple action, or a bottom row with the price or requirements beside it, never an added confirmation for the routine (100; 16 r11); an action's colour by what it is (101; 16 r4); light metallic action faces with ONE dark text colour, at least 4.5 to 1 over the whole gradient, pressed states included (108; 16 r3) | the five-colour palette: gold routine, green accept, blue guidance, red destructive only, silver neutral (16 r4) | the exact hues and the edge cases ("subject to screen review") |
| What comes next | The owner's own real-screen mockups: the Bro (character) landing screen first, then the Universal Menu, then representative deeper screens and workspaces, at the real proportions with real data and real art; the play view and the controls unchanged (16, the next phase) | the prototype's geometry, typography, exact colours and crop quality | the production mockups; the audit of component structure and asset paths before building (the audit's "The look" begins it); the owner's approval of the production look and of the mockups, before any implementation |

**Decision baseline:** November 25, 2026 · Architecture / wireframe phase

**Audience:** Claude Code or another implementation agent working in the BroTown repository.

**Purpose:** Preserve the owner's decisions from the UI design conversation so work can continue without losing the design direction. This is a structural specification, not a final visual design or a request to invent new game mechanics.

## 1. Design mandate

Clarity is the highest priority. The usability benchmark is to hand a phone to a child, give them a specific task, and see whether they can find the correct screen and complete the task without any additional instruction. Do not optimize aesthetics at the expense of discoverability.

- Keep the existing mobile dashboard height. Do not enlarge it into the gameplay viewport. Respect existing safe areas and gameplay controls.
- Mobile-first: design for a small portrait phone, with desktop adapting to the same conceptual architecture.
- The long-term visual style is polished arcade RPG: sharp, tactile, beveled, selectively shiny, legible, high contrast. Avoid a washed-out matte-gray look, but also avoid ornate frames, excessive shine, clashing colored outlines, and visual noise.
- Use destinations first for exploration screens. A destination has a short subject label and a distinctive recognizable icon. Action labels belong inside destinations. Do not use unlabeled dots, tiny carats, hidden swipes, or sequential cycling as primary navigation.
- Apply global-to-granular disclosure: show the essential summary first; allow a tap to reveal contributing factors, then further detail or calculation mechanics. Do not flatten the entire game model onto one page.
- Use dedicated destination views and an explicit back control instead of persistent secondary tab bars.
- Information must not float arbitrarily. Use pills, grouped surfaces, aligned cells and an invisible modular grid. Containers can span multiple units, with larger units for more important information. Avoid heavy grid lines or an individually outlined box around every number. Recessed/quiet surfaces communicate static information; raised/tactile controls communicate actions. Drill-down statistics should clearly indicate their interactivity.
- All illustrative numbers, item names, icons, colors and dimensions from conversational wireframes are placeholders, not production data or styling specifications.

## 2. Global navigation and state

Replace the crowded persistent tab strip with two workspaces:

```text
GAMEPLAY
  └─ Dashboard
       ├─ Gear: default gameplay workspace
       └─ Menu: universal exploration workspace
            ├─ Bro / Character inspection
            ├─ Quests
            ├─ Social
            ├─ Highscores / Ranks
            ├─ Codex
            ├─ Homestead
            ├─ Map (candidate)
            └─ Settings (candidate)
```

The Universal Menu is an equal-weight directory, not a prioritized list. A 4-column × 2-row grid is the agreed structural direction if the eight candidate destinations are retained. Exact names and ordering are not finalized; Map and Settings were included as candidates and may have existing access points. Do not create unsupported functionality just to fill the grid.

```text
GEAR ROOT                   MENU ROOT
[Close]  Gear  [Menu >]     [< Gear]  Menu  [Close]
+-----------+-----------+   +-----+------+-----+------+
| Inventory | Equipped  |   | Bro |Quests|Social|Ranks|
|           |           |   +-----+------+-----+------+
|           |           |   |Codex| Home | Map |Settings|
+-----------+-----------+   +-----+------+-----+------+

DEEP DESTINATION (example)
[< Combat]     Sword     [Close]
+-------------------------------+
| Relevant content only         |
+-------------------------------+
```

Confirmed rules:
- Contextual single header, not an always-visible global bar plus a second row. Header communicates current location and provides an obvious labeled Back control and close affordance.
- Gear and Menu have independent remembered states. Gear opens the Gear workspace; Menu resumes the previous exploration destination. Closing temporarily hides the dashboard without resetting either workspace.
- Back follows the actual navigation history (the player's journey), not necessarily the canonical category tree. Close returns to gameplay. Preserve scroll, selections and relevant context on returning from drill-downs.
- Contextual entrances open the same reusable destination as the menu route: tapping another player → inspection; quest HUD → current quest; minimap → map; item → item inspection; level-up → relevant skill; clan name → clan profile; leaderboard player → player inspection. These are examples of the approved pattern, not confirmation that every shortcut is already implemented.
- Keep a reliable, obvious route to Gear and the universal directory even from a resumed deep view. Exact quick-return affordance and closed-dashboard reopen controls still need design validation; do not reintroduce a crowded persistent bar as a default solution.

## 3. Universal character inspection (Bro)

Use the same structure for oneself and another player. Bro opens the self version; inspecting a player in the world or on a leaderboard opens the other-player version. The layout and public character information remain consistent. Only ownership-specific actions differ.

**Complete transparency is confirmed:** other players may inspect weapon levels, equipment, actual combat stats and invested attributes. This does not grant authority to modify other players' data, nor access to their private inventory, account details or unspent-point allocation controls.

```text
[< Back]      Player name     [Close]
[Portrait]    Equipped title   Combat Lv
+------------+------------+------------+
| CHARACTER  |   COMBAT   | EQUIPMENT  |  Primary
|            |            |            |
+------------+------------+------------+
| LIFE SKILLS|ACCOMPLISH. |    PETS    |  Secondary
+------------+------------+------------+
```

Three large equal primary destinations (Character, Combat, Equipment) and three smaller secondary destinations (Life Skills, Accomplishments, Pets). Use icons in the eventual UI; the labels here define subjects, not exact display copy. Identity context should make it immediately clear whose profile is being inspected.

### 3.1 Character — identity first

A personal identity card / RPG passport, not a stats dashboard. Prominent portrait, name, equipped title and combat level. Supporting content: Sword, Bow, Staff levels; clan and guild affiliations; achievement points; quest completion count; titles and other relevant lifetime summary information. Link to the detailed destinations rather than duplicating all their content. Clan and guild names should lead to their respective profiles where available. Owner can change title via the appropriate title component; other viewers cannot. Exact portrait size and placement of secondary summaries are still open.

### 3.2 Combat — four progression channels

**Critical game rules supplied by the owner (supersede older design assumptions):**
- Sword/melee, Bow and Staff each level independently.
- A level-up in a weapon grants **3 points for that weapon only** and **3 shared character points**. Weapon points are not transferable across channels.
- Shared character attributes affect survivability, resources and mobility across all weapons.
- Displayed combat level = maximum of Sword, Bow, Staff levels, not their sum or average.
- A player at Bow 3 / Sword 1 / Staff 1 and a player at 3 / 3 / 3 both have combat level 3. Assuming all start at 1, their shared points earned from level-ups are 6 and 18 respectively, excluding initial allocations. Generalists can therefore have more shared progression at the same combat level.
- Equipped items materially influence calculated combat performance. Do not equate raw item stats or attribute investment with final character stats.

```text
Combat hub
+----------+----------+----------+
| Sword    | Bow      | Staff    |
| Lv / pts | Lv / pts | Lv / pts |
+----------+----------+----------+
| Shared character stats / points|
+--------------------------------+

Weapon screen
[< Combat]      Sword       [Close]
[Level + XP progression]
[ DPS headline ] [ supporting performance summary ]
[ All combat stats / drill-down ]
[ Attributes                   Available points ]
[ Range ] [ Power ] [ Speed ]
[ Luck  ] [Special] [Element]
```

Each weapon opens a dedicated screen (not a persistent weapon selector). Return to the Combat hub to switch. Include weapon level and XP, fixed performance summary, access to all stats, and integrated weapon attributes. Attribute values should reflect actual state. Shared character screen follows the same structural pattern, using effective health as headline and shared attributes (HP, defense, MP, stamina/energy, dodge, movement, resistance; use actual names and formulas from the codebase).

- DPS is the principal offensive summary statistic. Supporting fixed statistics such as damage and attack speed must be subordinate. Tap a headline metric to see its breakdown: contributing base stats, attribute effects, gear effects, other applicable modifiers and calculation details. Link to relevant item inspection. Use authoritative existing combat calculations, not hardcoded illustrative numbers.
- Effective health (EHP) is the principal defensive summary statistic. It is an approved summary concept, **not a finalized formula**. Define and validate a reference damage model with the owner before shipping; distinguish deterministic mitigation from probabilistic dodge and element-specific resistance as appropriate. Label assumptions in the drill-down. Do not imply that a single value predicts every encounter.
- Preserve the existing attribute allocation preview system. Selecting an attribute opens the existing preview rather than replacing it with a new simple increment control. Preserve tentative allocation, before/after impact, animated combat demonstrations, detailed breakdown and confirmation behavior where implemented. Allow attribute inspection even with zero spendable points; read-only viewing when inspecting another player. Verify actual existing preview behavior in the repo rather than recreating it from wireframes.
- Point availability must clearly distinguish weapon-specific and global pools. Allocation must not accidentally spend from another channel or another player's account.

### 3.3 Equipment — character showcase

A primary inspection destination, separate from active inventory management. Show the character's appearance and equipped items without a private inventory grid. Use the same character-shaped loadout concept as Gear, and the same item inspector for all equipped items. Self-view can offer Manage Gear; other-player view is read-only. Keep the portrait/sprite legible against its background, and use actual existing character art. Final sprite scale/background are visual-phase decisions.

### 3.4 Life Skills

Noncombat skill levels, XP and progression; use actual supported skills (e.g. fishing, mining, farming, woodcutting). Dedicated skill detail layouts are not finalized. Farming skill belongs here, farm/property management belongs in Homestead.

### 3.5 Accomplishments

Consolidate achievements and achievement points, unlocked titles, quest history, lifetime records/kills, discoveries and other supported lifetime milestones. These are logical subcategories; no need to create tracking for unsupported data. Equipped title remains visible on Character. Quest history should reuse the existing quest data and inspection components, not duplicate data.

### 3.6 Pets

Dedicated secondary destination for companions; management for self, inspection for others. Detailed layout not designed yet.

## 4. Gear — default management workspace

The old workspace uses inventory / character preview / equipped items, with the narrow middle column repurposed for item details. The new direction removes the permanent middle column, gives slots more space, and distinguishes stored items from worn equipment by layout shape, not color alone.

```text
STATE 1: Gear management
+----------------+----------------+
| INVENTORY      | EQUIPPED       |
| storage grid   | character-     |
|                | shaped slots   |
| gold/capacity  |                |
+----------------+----------------+

STATE 2A: Inspect inventory item
+----------------+----------------+
| INVENTORY      | ITEM SUMMARY   |
| selected slot  | In inventory   |
| other slots    | Projected DPS  |
|                | Details / Equip|
+----------------+----------------+

STATE 2B: Inspect equipped item
+----------------+----------------+
| ITEM SUMMARY   | EQUIPPED       |
| Equipped       | selected slot  |
| Current stats  | other slots    |
| Details/actions|                |
+----------------+----------------+

STATE 3: Full item inspection
+---------------------------------+
| Identity + ownership/context     |
| Key information + drill-downs    |
| Relevant actions                 |
+---------------------------------+
```

- Keep the source panel in its original location during quick inspection; the opposite panel is replaced with the summary. No shifting the inventory to the other side. Make selected slot and inspection mode unmistakable. Provide a clear way back to management and preserve selection/scroll context.
- Inventory uses a regular storage grid. Equipment uses a recognizable character silhouette or character-shaped arrangement. Preserve the game's actual nine equipment slots: Sword, Bow, Staff, Torso, Greaves, Cape, Shield, Amulet, Jewel. Exact silhouette geometry, grid capacity, slot sizes and resource-bar placement are not finalized. Validate slot touch targets at real phone size. Do not remove resource bars from gameplay without deciding where essential information remains accessible.
- Quick inspection must provide immediately useful item-type-specific summary stats and a meaningful action, not just item name and a Details button. For consumables, materials, tools, etc., use relevant properties/actions from the existing game.
- Full Details opens the shared item inspector (also used from Codex, equipment, loot, stat breakdowns). Context and permissions govern available actions; read-only inspection for others. Do not duplicate the data model.

### 4.1 Automatic, character-first equipment comparison

When inspecting an equippable inventory item, automatically compare the projected **resulting character performance** against current equipped gear for the relevant slot/channel. Compare final outcome, not merely raw item modifiers. Use the same calculation pipeline as real equipping and the existing attribute preview wherever possible.

```text
[Item identity + In inventory]
[ DAMAGE PER SECOND           ]
[ Current   ->  If equipped   ]
[ 17.9          22.4          ]
[ 25% more damage per second  ]
[ Stronger hits | Slower attacks ]
[ Full comparison ] [ Equip ]
```

Numbers are illustrative, not balance targets. DPS dominates offensive equipment comparisons; EHP dominates defensive comparisons. Other relevant effects remain accessible, and meaningful tradeoffs should be summarized in plain language. Mixed-purpose equipment may affect multiple channels or metrics; exact handling requires design validation. Do not label items universally better/worse based on one metric alone. Handle no existing item, zero baseline, unchanged and negative changes, restricted items, and non-equippable items without misleading percentages. Use text and directional cues as well as color.

## 5. Quests

Landing page shows **active quests first**, as direct selectable rows/destinations. No tiny dropdown or three-dot pagination. Daily quests and Completed quests are secondary destinations. Keep long lists scrollable within the dashboard.

Individual quest shows **journey first**, with completed steps and the current objective visually dominant. Current task includes relevant progress and contextual actions such as Track or Locate when supported. Future journey is open-ended: do not reveal future steps, total step count, or whole-quest completion percentage. A neutral indication that the adventure continues is sufficient for an ongoing quest. Completed quests show actual completed history. Story and Rewards are separate accessible destinations. Preserve existing quest logic and data; do not rewrite quest narratives based on wireframe examples.

```text
[< Quests]      Quest name    [Close]
[✓ Completed step]
[  CURRENT OBJECTIVE          ]
[  Clear task + task progress ]
[  Locate / Track if relevant ]
[  Adventure continues ...    ]
[ Story ]           [ Rewards ]
```

## 6. Highscores / Ranks

Mirror character inspection categories for competitive comparison: Combat, Life Skills, Accomplishments, Equipment where valid metrics exist. Actual leaderboard categories must come from implemented rankings, not hypothetical metrics.

- Specific leaderboard is a simple aligned standings list: Rank | Player (portrait/name) | metric for this leaderboard. No unrelated combat level when ranking a different skill. Clearly label metric units/category.
- Conditional pinned personal standing only when the player's actual row is outside the visible list; no duplicate row when visible.
- Tapping a player opens universal character inspection. Back returns to the same ranking category and scroll position.
- Consistent layout across leaderboards; subdued rows, consistent spacing, avoid competing gradients and outlines. Prestige accents should not obscure legibility. Final awards styling deferred.

## 7. Codex and universal inspection

Codex is a **complete encyclopedia**, not a knowledge-unlock or discovery-gated system. Organize by entity type (candidate categories: Monsters, Items, Resources, NPCs, Locations, Mechanics). Region may be a filter where useful, not the primary hierarchy. Exact supported categories depend on existing content.

Use consistent inspection architecture with specialized content:
1. Contextual header and identity (what am I looking at?).
2. Essential summary (what do I need to know first?).
3. Clearly labeled deeper destinations and applicable actions.

One reusable entity inspection implementation per type, regardless of entry source: item, monster, NPC, resource, player, pet, clan/guild etc. Shared primitives and navigation conventions; not a forced identical layout. For example, a monster can emphasize stats, loot and habitat, an item performance and sources, and an NPC services and location. These sections are candidates, not new mechanics. A loot item can link to item details, a player affiliation to an organization, a statistic to its contributing entities. Back follows actual journey.

## 8. Social and Homestead

Both are independent management systems, not secondary branches of Bro. Social handles supported Friends, Party, Clan and Guild features. Character displays affiliations and can link to organization profiles. Homestead manages property and production; Life Skills represents skill progression. Detailed destinations and layouts are not designed yet. Preserve current functionality; do not invent social or property mechanics.

## 9. Implementation guardrails and recommended sequence

This is an architecture baseline, not a mandate for a blind one-shot rewrite. Recommended implementation sequence (assistant proposal, not an owner-approved sprint plan):

1. Audit actual repository routes, dashboard dimensions, touch/scroll behavior, panels, data types, existing item/attribute preview, stat calculations, supported categories and actions. Map existing functionality to this spec. Flag conflicts or missing features before changing game logic.
2. Implement common navigation model: two remembered workspaces, contextual header, actual-history stack, deep links, restoration and close behavior. Preserve gameplay and existing data.
3. Implement neutral modular layout primitives, identity containers, summary metric containers, destination hubs, detail views, and ownership-aware controls. Validate on real phone viewport sizes before visual art polish.
4. Build Bro and the universal player inspector, then Combat and Equipment, reusing authoritative stat and item systems. Preserve allocation behavior. Agree on EHP model before enabling EHP comparisons.
5. Refactor Gear into management / quick inspect / full inspect. Verify existing item actions, comparison projections, selection state and all equipment slots. Keep source panel stable.
6. Migrate Quests, Highscores, Codex; connect contextual entry points. Then address remaining Social, Homestead, Map and Settings requirements as supported.
7. Run interaction, regression and usability tests. Review final low-fidelity screens with owner before detailed icon, color, bevel, glow, texture or animation decisions.

Do not change combat balance, progression rules, inventory capacity, networking, permissions, quest data or underlying game mechanics merely to match a wireframe. Prefer small reversible commits and incremental migration. Keep a decision log. If the repo conflicts with the spec, identify the difference and seek a decision rather than guessing. The owner explicitly wants the basic architecture settled before detailed visual design.

## 10. Acceptance tests (task-based usability)

Run on a small portrait phone at the existing dashboard height, with no instructions beyond each task. These are proposed validation cases for the agreed clarity goal, not results of a completed usability study.

- Find your combat level, then your Bow level. Know the difference between them.
- Find the Sword DPS and explain where its damage comes from by navigating to details.
- Find and tentatively spend a weapon point; see the impact; cancel without changing data; confirm through the existing flow. Repeat for shared points and check pool isolation.
- Inspect another player's build and equipped item. Find their stats and invested attributes; verify no edit or allocation authority.
- Find a stored sword and distinguish it from the equipped sword. Read what happens to DPS if equipped; find full comparison and return to the same selected item. Repeat from equipped-item side.
- Identify the next objective in an active quest, see previous steps, track it or locate it where available, without seeing future steps.
- Find Woodcutting rankings; identify the ranked value, find personal position, inspect another player, and return to the same list position.
- Open the same item via Gear, another player's equipment and Codex; verify consistent facts and contextual actions.
- Interrupt a deep inspection to return to gameplay or Gear and resume the exploration workspace. Verify Back follows actual origin, not a hardcoded hierarchy.
- Check no clipped text, overlapping touch targets, horizontal overflow, hidden required controls, or increased dashboard height. Verify color is not the sole signal. Use reasonable large touch targets where possible; precise layout dimensions await validation.

## 11. Remaining decisions / continuation point

The structural direction is well established but not finished. Do not treat the following as finalized:
- Exact universal directory labels, order, Map/Settings placement; direct Gear/root access from a resumed deep view and close/reopen affordances.
- Detailed layout of secondary destinations (Life Skills, Accomplishments, Pets), Social, Homestead, Map and Settings; final Codex and leaderboard category lists.
- Exact item-type headline metrics beyond offensive DPS and defensive EHP; EHP formula/reference assumptions and multi-weapon/mixed equipment comparison behavior.
- Gear silhouette/slot geometry, inventory visibility and scroll constraints, where existing HP/MP/energy bars live; small-phone validation.
- Exact metric breakdowns, XP/progression display, empty states, filters, search, long list behavior, and action labels.
- Visual system: iconography, bevels, shine, palette, fonts, precise spacing, textures, animations. Do not design these before the architecture review.

**Resume here:** Question 35 has been answered: use modular hierarchy on an invisible grid (option B). The next design conversation should focus on locking the exact dashboard layout budget / navigation and information components or resolving the highest-risk open decisions, not revisiting the confirmed choices. Continue one architectural question at a time with simple neutral wireframes. Keep the child's unassisted task-completion benchmark central.

## 12. Suggested prompt to Claude Code

> Read this specification as the decision baseline for BroTown's UI overhaul. First audit the actual codebase and existing game behavior against it. Produce a concise architecture map, identify conflicts or gaps and propose a phased implementation plan. Treat confirmed owner decisions as requirements, illustrative wireframes as structure only, and the unresolved section as questions rather than permission to invent features. Do not change game mechanics or begin final visual polish. Preserve the dashboard height, existing art, existing stat allocation preview and authoritative gameplay calculations. Start with the shared navigation/layout foundations once the plan is approved; implement incrementally and test on the mobile viewport. Keep this specification updated as additional owner-approved decisions are made.

## 13. Decision log

Parts 1 to 12 above are the owner's document of 2026-11-25, word for word. This part was added when the document came into the repository (v2.3.6401), as its part 9 asks ("Keep a decision log") and its part 12 ("Keep this specification updated as additional owner-approved decisions are made").

**The rule:** a line goes here only when the OWNER approved it, in their own words, after 2026-11-25. Each line is dated, quotes or names the owner's words, and says which part above it settles or changes. A session's recommendation, a plan's reading or an answer given for the owner while they were away is never written here: those live in `UI_ARCHITECTURE_V2_PLAN.md` until the owner says yes. Nothing above this part is edited: a decision that changes it is a line here. A new addendum from the owner is a new part at the end, word for word, with its lines here and part 0's table brought up to date (the note at the top).

The audit of the game against this document is `UI_ARCHITECTURE_V2_AUDIT.md`; the phases and the open questions are `UI_ARCHITECTURE_V2_PLAN.md`.

### The addendum of 2026-11-25 (questions 36 to 72; part 14 below)

The owner, 2026-11-25, about 22:00 UTC, with the addendum: *"Here's an update for the architecture handoff"*. It is the owner's own document, later than parts 1 to 12, so each line below is a decision by the rule above (the rule's "after 2026-11-25" reads: after the baseline). "14 §2.1" means the addendum's own section 2.1, inside part 14. The baseline's words stay above as they were written: these lines say what now holds.

- **2026-11-25, 14 §2.1 (the Menu shortcut). SETTLES** part 2's last confirmed rule ("Keep a reliable, obvious route to Gear and the universal directory even from a resumed deep view. Exact quick-return affordance ... still need design validation") and part 11's open "direct Gear/root access from a resumed deep view", for the directory: a deep screen carries a persistent Menu shortcut beside its labelled Back and its Close; the shortcut jumps to the directory's ROOT, while the ordinary way into the Menu from gameplay resumes its last state. Still open, by 14 §8: the shortcut's exact form, a quick Gear affordance, and the closed dashboard's reopen controls.
- **2026-11-25, 14 §2.1 (Back and Close). CONFIRMS and sharpens** part 2's "Back follows the actual navigation history" and "Preserve scroll, selections and relevant context": Back restores the originating list position or selected item; Close returns to gameplay without resetting the workspace; Gear stays independently remembered.
- **2026-11-25, Q46, 14 §2.1 (whose it is). SHARPENS** part 3's "Identity context should make it immediately clear whose profile is being inspected": another player's character or possessions are named as theirs on every screen, deep ones included; yourself is the unlabelled default; a public view uses the same components and facts as the owner's, and ownership changes only the actions and the private data.
- **2026-11-25, Q48, 14 §2.1 (screen zones). EXTENDS** part 1's "invisible modular grid" (question 35): a screen has predictable zones in a fixed order (contextual header; identity or context; primary summary; secondary information and deeper destinations; contextual actions at the bottom); an empty zone collapses and the content takes its room; Gear and other specialised workspaces may depart from it.
- **2026-11-25, 14 §2.1 (scrolling). SHARPENS** part 5's "Keep long lists scrollable within the dashboard" and settles part 11's "long list behavior" in principle: nothing primary (an action, an essential fact, a main destination) is found only by scrolling; a large collection is sorted into categories first and then scrolls inside its bounds (the inventory explicitly scrolls); pagination is not the default. Still open: the fallback for a collection too large for that.
- **2026-11-25, 14 §2.1 (empty and locked). SETTLES** part 11's "empty states" in principle, beside part 2's "Do not create unsupported functionality just to fill the grid", which stands: a meaningful destination keeps its place when there is nothing in it or it is locked, and says what is absent, why, and how to get it; a feature the game does not have is never shown as playable.
- **2026-11-25, Q47, 14 §2.2 (the drill-down's motion). CHANGES** part 11's "Visual system: ... animations. Do not design these before the architecture review" for this one motion: going deeper, the selected container EXPANDS into the next screen; going back, the screen CONTRACTS toward the container it came from; never a sideways slide. Only the dashboard's content moves; the world and the band's height stay still. Not locked: the duration (about 200 to 250 ms was suggested). The assistant's proposals, not the owner's decisions: a fallback when there is no visible origin, and honouring reduced motion.
- **2026-11-25, 14 §2.3 (surfaces and actions). EXTENDS** part 1's "Recessed/quiet surfaces communicate static information; raised/tactile controls communicate actions": three kinds are told apart (static information, a destination you can open, an action); actions sit in their own zone at the bottom, which is given back when no action applies; common actions keep their positions. An action that is costly, consequential or cannot be undone is confirmed; a routine one that can be undone happens at once with feedback. The attribute preview's own confirmation (part 3.2) stays.
- **2026-11-25, 14 §2.3 (notifications). NEW** (no line of parts 1 to 12 covers it; it follows part 2's "Contextual entrances open the same reusable destination"): one route for notifications, as temporary toasts you can tap and a notification centre that stays; a tap goes to the real destination, never a copy of it; play is never interrupted; a notification that needs an answer stays until it is answered, one that only informs can be dismissed. Open: where they sit and which events make one.
- **2026-11-25, Q49 (B), 14 §3.1 (the comparison). CHANGES** the layout of part 4.1's wireframe ("Current -> If equipped", "25% more damage per second", "Stronger hits | Slower attacks"): ONE comparison piece for every system, in the TRANSFORMATION form: the current value, the compared value, then the signed change (a percentage where it means something), the main metric large and the supporting metrics as short aligned rows. It also covers comparing two things without changing anything (you and another player, a pet, a Codex item), optional there and labelled by its two subjects, never "If equipped" for a person. Part 4.1's rules stand (the resulting character's performance, DPS for offence and effective health for defence, no "universally better", the honest edges). Still open: the effective-health formula, and mixed or multi-weapon comparison.
- **2026-11-25, Q50 (C), 14 §3.2 (the stat tree). SETTLES** the shape of part 3.2's "Tap a headline metric to see its breakdown" and part 11's "Exact metric breakdowns": a branching tree shown ONE LAYER AT A TIME (the root's value, its immediate factors as branches you can open, then deeper factors, at last the real calculation or source), reused for effective health, movement speed, critical chance, AP and other worked-out numbers. The branches and operators are the game's real calculation, which is not always a sum.
- **2026-11-25, Q51 (A+C) and Q52 (A), 14 §3.3 (a skill's screen). SETTLES** part 3.4's "Dedicated skill detail layouts are not finalized" and part 11's "XP/progression display": one screen holds the level, the XP (current, required, how near the next level) and a short roadmap of milestones, each a real unlock; a milestone opens its requirement and benefit; ALL of a skill's unlocks are shown, the future ones too, so a player can plan. Part 5's rule for quests stands and is named as the deliberate exception: a quest's future steps stay hidden.
- **2026-11-25, Q58 (A+B+C+D), 14 §4.1 (Life Skills). SETTLES** part 3.4's layout and part 11's "Detailed layout of secondary destinations (Life Skills ...)": one overview with the sum of life-skill levels as its headline (a measure apart from combat level, which stays the best weapon's), a radar of the profile, and each skill as an equal door with its level and a small XP bar. Not confirmed: a board for the combined level (suggested only); the radar's scale.
- **2026-11-25, Q59 (C) and Q60 (A), 14 §4.2 (who you are, in two labels). ADDS** to part 3's header ("[Portrait] Equipped title Combat Lv") and part 3.1: two short labels worked out from the player's real development, one for combat and one for life skills, directly under the identity (portrait, name, equipped title, combat level, AP), the same for yourself and for another player, and visibly different from an earned title. They describe; they are not titles, classes, bonuses or limits. Open: the thresholds, ties and a beginner's label.
- **2026-11-25, Q53 (B), 14 §4.3 (Accomplishments). SETTLES** part 3.5's layout: AP is the headline and opens into its real sources; under it, doors to Achievements, Titles, Quest History, Lifetime Records and Discoveries, each only as far as the game has the data.
- **2026-11-25, Q54 (E) and Q55 (A), 14 §4.3 (Achievements). NEW within** part 3.5: achievements are grouped by medal tiers of difficulty or prestige; the overview shows each tier's medal and count with AP as context; a tier opens into its gallery of medals (art and name first, no progress bars; earned ones whole, unearned ones muted but openable, told apart by more than colour); a medal opens its real requirement, progress and AP. The tiers' names and their mapping to the game's achievements are open; no requirement or AP value changes.
- **2026-11-25, Q56 (D+G), 14 §4.3 (Titles). SHARPENS** part 3.1's "Owner can change title via the appropriate title component": a title's name and its short earning requirement are both visible at a glance, with earned, locked and equipped told apart; titles with a REAL sequence of requirements form a connected family, the others are single rows, and no sequence is invented; the equipped title and how it was earned lead the Titles page; Equip is offered for an unlocked title, to its owner only.
- **2026-11-25, Q57 (A), 14 §4.3 (Lifetime Records). SETTLES** part 3.5's "lifetime records/kills": the first page is a few career highlights, with a door to all the records sorted into categories; only what the game really tracks, nothing counted backwards.
- **2026-11-25, Q61 (A), 14 §4.4 (Pets). SETTLES** part 3.6's "Detailed layout not designed yet": the active companion leads; under it Owned Pets and All Pets (the Codex's pet collection when there is one, never a second copy); no companion is an informative empty state; the same pieces for the owner and for another player, by permission.
- **2026-11-25, Q62 to Q65, 14 §5 (Social). CHANGES** part 8's "Social handles supported Friends, Party, Clan and Guild features" and settles part 11's "Detailed layout of ... Social": Social's home is a living network, your own character in the middle and four circles in fixed places, **Friends, Clan, Party, Nearby**, each with its label at the top, a true count, and a few real players' pictures inside; Guild is NOT a circle (it and messages or requests are secondary destinations in context). A circle expands into its screen (an online gallery first, then everyone online, the offline directory where that means something, and the group's management); a player opens the universal inspection; another player's inspection ends in a bottom bar of the common social actions in fixed places. No new party, messaging, moderation or clan mechanic is authorised.
- **2026-11-25, Q66 to Q70, 14 §6 (Homestead). SETTLES the direction of** part 8's "Homestead manages property and production ... Detailed destinations and layouts are not designed yet", and **ADDS** a Homestead link to part 3's hub of six (its place is open): an interactive miniature of the REAL property (plots and buildings are the destinations; expanding detail with optional pan and zoom); the farmhouse in three views (outside in the miniature, a roofless inside, an overhead plan for building, behind a separate owner's edit action); another player's property read-only through their profile. **PLANNED gameplay, the owner's own word, not in the game and not to be built by the dashboard's work:** buying more farmland, building a customised farmhouse, furnishing it, unequipped pets living on the farm, visiting another player's property. Storage stays at the bank. No Homestead level or percentage was approved.
- **2026-11-25, Q71 (C+B) and Q72 (C), 14 §7 (the World Map). SETTLES** part 11's "Detailed layout of ... Map" (the Map's design, not yet its place in the directory, which 14 §8 still lists as open with the labels and order): two views of the same world with a labelled switch, **Geography** (the real terrain) and **Connections** (a simple graph of the real ways between regions); the world, then a region, then that region's own map with a summary of what it holds by category. Everything from the game's own world data; no fast travel, route finding or tracking is added, no hidden player is shown and no future quest step.
- **2026-11-25, 14 §8 (where the design stands). REPLACES** part 11's "Resume here: Question 35 has been answered": question 72 is answered; the design resumes at question 73. 14 §8's list of open items stands beside part 11's; where part 11 lists something a line above settles, the line above holds.

**Named by the addendum as NOT decided** (so not lines of this log): the combined life-skill board; the radar's scale and the labels' thresholds; the medal tiers' names and mapping; the effective-health formula; every colour, duration and exact measure; and all of 14 §6.1's planned gameplay.

The repository's reading of the addendum against the code (the audit's second half) and what it does to the phases and to the owner's questions (the plan) are not decisions: they stay in those two files until the owner says yes.

### The final addendum of 2026-11-25 (questions 73 to 85; part 15 below)

The owner, 2026-11-25, about 23:00 UTC, with the third document: *"Here's more to the plan (this completed architecture)"*; and their standing words for these updates: *"Merge these newly confirmed decisions into the existing architecture specification in the repository. Preserve all earlier decisions unless explicitly superseded by this update. Distinguish approved UI architecture from planned gameplay mechanics and unresolved implementation details. Do not begin implementation or final visual redesign yet."* It is the owner's own document, later than parts 1 to 12 and part 14, so each line below is a decision by the rule above. "15 §3" means the final addendum's own section 3, inside part 15. The earlier parts' words stay above as they were written: these lines say what now holds. (v2.3.6403)

- **2026-11-25, 15 §7 (where the design stands). REPLACES** the line above for 14 §8 ("question 72 is answered; the design resumes at question 73"): *"Foundational architecture questions Q1–85 are complete by owner decision. This does not mean production design or implementation is complete."* It **CHANGES** part 11's "Visual system: ... Do not design these before the architecture review" and 14 §8's last open item: the visual language is now the NEXT step (materials, palette, typography, borders and bevels, interaction states, icons, animation and feedback), then pixel-true mockups of representative screens inside the existing dashboard's size; no art is final until the direction is explicitly approved; reusable pieces are built in phases only AFTER the owner's approval. Still open by its own last sentence: the effective-health formula, the rules that classify a specialisation (14 §4.2's two labels), some lists of entities and categories, and the Homestead's future mechanics.
- **2026-11-25, 15 §1 (the guardrails). CONFIRMS** part 1 (the band's fixed height, the play view, the child's unassisted task as the test of clarity), part 2 and 14 §2 (Gear and Menu, the contextual Back, Menu and Close, the expanding drill-down, global to granular, predictable zones, explicit labels, actions apart from destinations), and **restates** 14 §2.1's scrolling rule as a guardrail: primary navigation, important facts and primary actions are never found only by scrolling; a collection may scroll inside its bounds. Every name, picture, quantity, price, rarity, probability and merchant service in a wireframe is an example unless the game's own data says so; the addendum records choices about screens, not new mechanics; no combat formula changes, the bank's storage does not move, no Homestead feature is built early.
- **2026-11-25, Q73 (C), 15 §2 (the Codex's collections). SETTLES** the FORM of part 7's collections and, as to form, part 11's "final Codex ... category lists": illustrated cards, the picture leading, with a little essential information that depends on the kind of thing (a monster's level and element or habitat; a weapon's rarity and requirement; a resource's gathering requirement; a townsperson's occupation and place; a pet's species and rarity), each only "where supported"; never a dense database list. It **CONFIRMS** part 7's "complete encyclopedia, not ... discovery-gated" ("as previously approved"). Not a fixed requirement: where search sits and what it searches.
- **2026-11-25, Q74 (A+C), 15 §2 (an entity's page). SHARPENS** part 7's three steps ("Contextual header and identity ... Essential summary ... Clearly labeled deeper destinations") and its "One reusable entity inspection implementation per type": the page is a large showcase (the real animated picture, name, short description, the essentials) with subject doors that each say what they hold and open into their own view (a monster's: Combat, Loot, Abilities, Habitat; the table in part 15 gives each kind's, "use only supported data"); the same page from the Codex and from the world, Back by the real journey. A townsperson's Codex entry informs; the services need the meeting in the world. Not fixed: the proportions (the example's left, right and below must fit the band, and no number is shown twice without need).
- **2026-11-25, Q75 (A), 15 §2 (a monster's loot). SETTLES** how part 7's "a monster can emphasize stats, loot and habitat" shows loot: plain rows, each with the item's picture, its explicit name, its rarity and its exact drop chance together; a row opens the one item page (part 4's shared inspector); no dice-roll numbers, no probability bars, no extra step by rarity, no gallery or featured rare page; the way back from an item to its real sources and their places where the data allows (part 7's "A loot item can link to item details", turned round). The numbers follow the loot engine's own meaning (an item's chance apart from a tier's, conditional rolls, modifiers); no example percentage is given to a real item, a very small chance is never rounded to zero, and drops are not shown as excluding each other unless the engine works so.
- **2026-11-25, Q76 (D+C), 15 §3 (shops). NEW** (no line of parts 1 to 12 or 14 designs a shop); it reuses part 4's Gear (the source panel stays where it is, the opposite panel becomes the picked item's summary) and 14 §3.1's comparison: a larger shop opens on categories, a smaller merchant skips them; the goods' grid stays, the other panel shows the picked item, its price, the comparison where it means something, and Buy; selling uses the real carried bag; the currency and the balance are always shown. No new merchant stock or service is mandated; categories, quantities, stock and the exact steps are the game's.
- **2026-11-25, Q77 (C), 15 §3 (the bank). NEW**, and **CONFIRMS** 14 §6.1's "Current storage is at the bank": the bag and the bank are shown together, each labelled, each scrolling in its own panel, with the real room and how full where there is a limit; the bank's contents filter by category, show stack counts, and a picked item shows its look with clear Deposit and Withdraw. Bulk deposit and moving part of a stack were examples: to be checked against the game, and never to sweep up something protected or worn. The same pieces may serve farm storage if that ever exists; that is not approved work.
- **2026-11-25, Q78 (B first, C second), 15 §3 (trading with a player). NEW**: the FIRST screen builds the offer (your bag beside both players' offers, whose is whose always clear), the SECOND reviews the exchange (You Give against You Receive, counts, gold in 14 §3.1's transformation form, the other player's acceptance, a distinct last confirm). Both players confirm the same final offer; any change resets both acceptances; this is held by the server, not only drawn. To be checked in the audit, as the owner's own list: a revision of the offer, ownership, quantities and balances validated, stale confirmations refused, doubled submissions prevented, both sides settled in one safe transaction, and no "complete" before the server's word. Where today's trade differs, the gap is named for review, never weakened quietly, and no new trade system is built.
- **2026-11-25, Q79 (B+C+D), 15 §3 (crafting). NEW**; it applies 14 §2.3's rule (the routine happens at once, the consequential is confirmed): recipes as illustrated collections with their requirements and whether you can make them; a two-panel workspace (recipes on one side; the product, the materials, have against need, how many, and Craft on the other); an expanded view showing materials becoming the product; a change of quantity works the materials out again from the real recipe; what is missing is said plainly; no extra confirmation for a routine craft. One framework for the crafts the game supports; farmhouse furnishings are planned content; the server stays the authority.
- **2026-11-25, Q80 (C+D), 15 §4 (a townsperson). SHARPENS** part 7's "an NPC services and location" and **adds** the meeting itself: the real animated figure, the name, the role, a short line of talk where there is one, and clearly labelled doors for the services that townsperson really gives, larger when there are one or two, never empty filler. It shares the Codex's showcase piece; the game's existing way of meeting a townsperson is kept, and the world's controls stay clear.
- **2026-11-25, Q81 (B), 15 §4 (Settings). SETTLES** part 11's "Detailed layout of ... Settings" and 14 §8's "Settings layout", as a **named EXCEPTION** to part 1's "Use destinations first": the controls a player changes most are on Settings' first page, ready to use; the others are labelled categories below with their own screens; a safe, reversible setting applies at once; a destructive or consequential account action follows 14 §2.3's confirmation rule. Which controls exist is the game's: none is invented.
- **2026-11-25, Q82 (D), 15 §5 (feedback). EXTENDS** 14 §2.3 ("routine reversible operations can execute immediately with feedback"; the notifications' one route, which stands: "Maintain previously agreed notification-center behavior"): four strengths of feedback, matched to what happened, routine, noteworthy, milestone and exceptional. Everyday actions are never celebrations; a fight is never obstructed; an intrusive reveal waits for a safe moment or for the player to open it; sound and motion preferences are respected; success is not shown before the server confirms a change. Which event is which strength is decided when it is built.
- **2026-11-25, Q83 (A), 15 §5 (an action you cannot take). SHARPENS** 14 §2.1's empty and locked states (which stand) for an ACTION: it stays in its usual place, visibly disabled, with a short reason beside it; no separate list of requirements, no hunt through progression; several reasons are given briefly; never by colour alone. A recipe's own list of materials is a different thing and stays. The screen's check never replaces the server's.
- **2026-11-25, Q84 (D), 15 §5 (loading, pending, connection). NEW** (14 §9's last task only said "Test empty/loading/error states"): a loading collection shows what it has and placeholders; a change being made marks the control pressed and holds back repeats and conflicts; a failure says why and offers a safe retry, never claiming that nothing was spent unless the server's state says so; a lost connection says so, keeps the place and allows no change it cannot make; a critical transaction locks only what it touches; success shows after the server confirms; an unknown outcome is shown as unresolved and is checked before any retry; no full overlay unless it is truly needed.
- **2026-11-25, Q85 (B), 15 §6 (the closing principle). NAMES** what part 7 ("Shared primitives and navigation conventions; not a forced identical layout") and 14 §2.1 ("Specialized workspaces such as Gear may depart from the generic layout") already did: **consistency in interaction, creativity in presentation.** Shared by the whole game: the navigation frame, Back, Menu and Close, the zones, labels, touch targets, materials and type (their look still to come), the expanding drill-down, the item and entity pages, the comparison, the progression pieces, the handling of states and permissions, accessibility, performance, the fixed height. Distinctive interiors where the subject earns one: Combat, Social, Homestead (its future gameplay gated), the Codex, the Map, and the two-panel workspaces of Gear, Bank, Shops, Crafting and Trading. One design system, never separately themed applications; pieces and data are reused, never a second copy of an inspection or a calculation.

**Named by the final addendum as NOT decided** (so not lines of this log): where search sits and what it searches; the showcase's proportions; a shop's categories, quantities and stock; bulk deposit and part-stack transfer; which event gets which strength of feedback; the exact protocol of the pending and reconnecting states; every material, colour, font and measure ("visual definitions still pending"); the effective-health formula, the specialisation rules, some lists of entities and categories, and the Homestead's mechanics; and every sample name, price, rarity and probability in a wireframe.

The repository's reading of the final addendum against the code (the audit's third half) and what it does to the phases (the plan) are not decisions: they stay in those two files until the owner says yes.

### The visual design hand-off of 2026-11-25 (questions 86 to 108; part 16 below)

The owner, 2026-11-25, about 23:30 UTC, with the fourth document: *"Hers more"*; under the same standing words as the two addenda (merge the newly confirmed decisions, preserve the earlier ones unless explicitly superseded, tell approved from planned and unresolved, *"Do not begin implementation or final visual redesign yet"*, keep one persistent specification). It is the owner's own document, later than parts 1 to 12, 14 and 15, so each line below is a decision by the rule above. "16, the table" is its table of questions, "16, rule 5" the fifth bullet of its "Material and component rules", "16, the next phase" its last section. The earlier parts' words stay above as they were written: these lines say what now holds. No architecture decision is changed by any of them (the hand-off: "retaining architecture decisions"). (v2.3.6404)

- **2026-11-25, 16's own status line and "the next phase" (where the design stands). REPLACES** the line above for 15 §7 ("the visual language is now the NEXT step"): *"Foundational visual direction approved; production screen mockups, asset audit and implementation approval still pending."* NEXT is the owner's own real-screen mockups, the Bro (character) landing screen first, then the Universal Menu, then representative deeper screens and workspaces, at the real screenshot's proportions, with the game's real data and real art. Prototype geometry, typography, exact colours and crop quality are NOT approved production assets; the gameplay controls and the play view do not change to make room for a menu. *"No implementation until the owner approves production visual direction and screen mockups."* It **CHANGES** part 9 step 7 ("Review final low-fidelity screens with owner before detailed icon, color, bevel, glow, texture or animation decisions") and part 11's and 14 §8's last open items only so far as the lines below decide them.
- **2026-11-25, Q86 (B), 16 rule 1 (the identity). SETTLES** part 11's "Visual system: ... palette" and 15 §7's "establish the actual visual language" as to WHICH look: a polished Lantern Slate, the game's own artwork and aesthetic kept; never a new brown or wood, generic fantasy, or black-and-gold theme. It **SHARPENS** part 1's "polished arcade RPG ... Avoid a washed-out matte-gray look". The eight palette values in rule 1 are, by its own words, "working references, not a verified audit of repository tokens": not decisions (the game's real ones are the audit's "The look").
- **2026-11-25, Q87 (C), 16 rule 3 (three kinds, told apart by depth). CONFIRMS** part 1's "Recessed/quiet surfaces communicate static information; raised/tactile controls communicate actions" and 14 §2.3's three kinds, and gives them their look: recessed information, raised navigation, clearly differentiated action buttons. Its own table says the action colours of questions 101 and 108 supersede a gold-only treatment.
- **2026-11-25, Q88 (A), 16 rule 2 (the shape). SHARPENS** part 1's "sharp, tactile, beveled": smooth rounded metallic geometry with graduated bevels; no chamfered corners. Where "sharp" was read as a corner's shape, this later line holds.
- **2026-11-25, Q89 (A), 16 rule 2 (gold). SHARPENS** part 1's "avoid ornate frames, excessive shine, clashing colored outlines": gold is restrained, the outer frame's thin rim and intentional accents, never a gold outline round every destination.
- **2026-11-25, Q90 (B), 16 rule 2 (the texture). SETTLES** part 11's "textures" in direction: fine brushed slate, a low-contrast directional texture; no screws, no heavy ornamental framing.
- **2026-11-25, Q91 (C), 16 rule 8 (type). SETTLES** part 11's "fonts" in DIRECTION only: a classic RPG serif. *"Exact font not yet approved"*: an actual licensed font is to be chosen and tested for legibility on a phone, the alignment of its numerals and its performance before it is locked; the type scale stays a production decision.
- **2026-11-25, Q92 (A+B), 16 rules 3 and 9 (where art sits). EXTENDS** part 1's "A destination has a short subject label and a distinctive recognizable icon": the artwork sits directly on the raised navigation surface; items and equipment sit in recessed sockets.
- **2026-11-25, Q93 (D+A), 16 rule 6 (rarity). NEW** as a look (15 §2's cards and loot rows only say rarity is shown "where supported"): rarity is told mainly by the OUTLINE, with graduated prestige; interiors stay dark and recessed; a cue beyond colour where it matters; reduced motion respected. Its own words bind it to the game: *"Preserve existing actual rarity definitions, colors and artwork; no invented tiers or probabilities."* The tiers the rule names (common, rare blue, epic orange, Godly prismatic) are therefore an illustration until set against the game's own (the audit's "The look": the game's names and colours differ).
- **2026-11-25, Q94 (B, stronger), 16 rule 5 (selected). NEW** (part 4 only asks that a selection be kept): a selected control looks deeply pushed into the dashboard, by inverted depth, shadow and changed lighting, not a subtle tint; its touch footprint, the layout round it, its label and its rarity outline do not change; a momentary press and a lasting selection are told apart by what the control really does.
- **2026-11-25, Q95 (A), 16 rule 7 (progress). SETTLES** the look of 14 §3.3's XP bars and of progress generally: a continuous metallic fill in a recessed track. Kept by its own words: *"retain existing gameplay-specific health/mana conventions"* (so part 11's open "where existing HP/MP/energy bars live" is untouched, and the bars' own form is the game's).
- **2026-11-25, Q96 (A), 16 rule 7 (colour that means something). NEW**: ordinary stats are ivory or white values with muted readable labels; colour is kept for a meaningful change, a warning, rarity, a reward and an action; ordinary metrics are never rainbow-coloured.
- **2026-11-25, Q97 (A), 16 the table (numbers). SHARPENS** 14 §3.1's "the main metric large and the supporting metrics as short aligned rows": a balanced headline and supporting hierarchy, no oversized scoreboard treatment.
- **2026-11-25, Q98 (recommended C), 16 rule 12 (density). SHARPENS** part 1's "show the essential summary first ... Do not flatten the entire game model onto one page": adaptive density, strongly minimalist; one meaningful question a screen, headline numbers and essential context, the deeper calculation in its own destination. A denser screen only where comparing or managing side by side is the point (the inventory, comparisons, specialised analysis).
- **2026-11-25, Q99 (A), 16 rule 11 (the header). CONFIRMS** part 2's "Contextual single header" and gives it its look: the title is integrated on the slate surface, with raised Back, Menu and Close; no raised decorative title plate.
- **2026-11-25, Q100 (A+C), 16 rule 11 (the action bar). SHARPENS** 14 §2.3's bottom zone of actions (which stands: there only when an action applies): a full-width button for a single simple action, or a contextual bottom row with the price or requirements beside it where they bear on the decision. *"Do not add a separate confirmation to routine actions contrary to earlier architecture rules."*
- **2026-11-25, Q101 (C), 16 rule 4 (the actions' colours). SETTLES in principle** part 0's open "the actions' colours": the colour depends on what the action is. The five-colour palette is, by its own word, WORKING: gold for the routine (Equip, Purchase, Craft), green for acceptance, confirmation and claim, blue for guidance and movement (Track, Locate, Travel), red for the destructive only (Discard, Abandon, Delete), never for an ordinary cancel, silver for the neutral or dismissive (Cancel, Decline). Back, Menu and Close keep their navigation meaning: a silver navigation control is not a gameplay commitment. Exact hues and the edge cases wait for the screens' review.
- **2026-11-25, Q102 (revised B), 16 rule 2 (the metal). SETTLES** part 11's "bevels, shine" in direction: polished metallic gradient fills with broad reflected light across the face and the bevel; not thin solid-colour highlight lines, not flat outlines.
- **2026-11-25, Q103 (A), 16 rule 2 (depth). NEW**: the dashboard's own framing is shallow; pronounced physical depth is kept for controls.
- **2026-11-25, Q104 (C), 16 rule 10 (a tile's size). EXTENDS** part 3's three primary and three secondary doors: adaptive proportions, large illustrated tiles for primary destinations, compact ones for deeper or secondary navigation. It **CONFIRMS** part 2: *"Universal directory remains equal-weight as previously decided."*
- **2026-11-25, Q105 (recommended C+B), 16 rules 9 and 10 (art and word). SHARPENS** part 1's "short subject label and a distinctive recognizable icon": the artwork leads on a primary destination, art and label are balanced on a secondary one; full-colour art, never monochrome line icons; an explicit readable label always, never the picture alone. By rule 9 the game's existing sprites, items, characters, townsfolk, monsters, buildings and world art are authoritative: no generated replacement art; existing colourful icons are reused; new matching artwork only for a GENUINE missing asset, after the existing ones are audited; a placeholder vector icon from the design conversation is not production art.
- **2026-11-25, Q106 (A), 16 rule 13 (locked). SHARPENS** 14 §2.1's locked destinations and 14 §4.3's "unearned ones muted but openable, told apart by more than colour" (both stand): locked or unearned artwork is desaturated, its colour restored when unlocked; its status and requirements are understandable and it can still be inspected. 15 §5's reason beside a disabled action stands ("as previously specified").
- **2026-11-25, Q107 (D), 16 rule 13 (badges). EXTENDS** 14 §2.3's notifications (their one route stands): a count badge for real countable outstanding things, a dot for a general update, a rare warm illumination for an exceptional opportunity; no perpetual competing glows.
- **2026-11-25, Q108 (B), 16 rule 3 (text on an action). NEW**: light metallic action gradients with ONE consistent dark text colour across the whole action palette, never black on one colour and white on another; reflections kept away from the lettering; a target of at least 4.5 to 1 contrast for normal-sized text over the whole gradient it sits on, checked in the real states, the pressed one included. Raised navigation keeps slate-metal faces with LIGHT labels (rule 3): the dark text is the actions'.

**Named by the hand-off as NOT decided** (so not lines of this log): the exact font and the type scale; the exact hues of the five action colours and their edge cases; the eight palette values of rule 1 ("working references"); the prototype's geometry, typography, colours and crops; which navigation pictures are genuinely missing (it asks for an audit of the existing ones first: the audit's "The look" has it); the production mockups themselves; and the approval to build.

The repository's reading of the hand-off against the code (the audit's fourth half, "The look") and what it does to the order and to the owner's kit for the mockups (the plan) are not decisions: they stay in those two files until the owner says yes.

### The master specification and the authorization to build, 2026-11-25 (`UI_MASTER_SPEC.md`)

The owner, 2026-11-25, about 23:50 UTC, with `BroTown_UI_Master_Spec.md` (version 1.0, 643 lines) and three reference pictures. It is NOT a new part of this file: it is kept whole, word for word, as `docs/design/UI_MASTER_SPEC.md`, with its pictures as given under `docs/design/references/`, because by its own words it replaces the hand-offs as the baseline (*"It supersedes the prior incremental handoffs where they conflict"*; *"Earlier sources are historical records, not competing implementation instructions"*). Each line below is the owner's decision by the rule above and holds over every earlier line of this log. "MS" is the master specification; "MS, Start here" its first section. (v2.3.6405)

- **2026-11-25, the authorization to build. REPLACES** the first line of the block above (*"No implementation until the owner approves production visual direction and screen mockups"*) and every "Do not begin implementation" before it. The owner's words, whole: *"You are authorized to begin implementation. The mockups establish the general aesthetic and organizational direction, not pixel-perfect requirements. Exercise your own judgment regarding component placement, sizing, spacing, responsiveness and implementation details. Begin by auditing the existing codebase and identifying opportunities to reuse components, artwork and existing functionality. Establish a centralized UI design system before migrating individual menus. Render all gradients, bevels, shine, shadows, borders and interactive states programmatically. Do not generate or extract static button backgrounds from the mockups. Preserve the existing gameplay viewport, dashboard height, game mechanics and server-authoritative behavior. Implement incrementally, test against actual mobile dimensions, and document your progress. Do not wait for approval of every individual menu design. Flag significant architectural or gameplay conflicts for my review, but independently resolve ordinary visual and implementation decisions. The objective is a cohesive, premium, intuitive and maintainable UI overhaul—not an exact reproduction of the mockups."*
- **2026-11-25, the game's content over a document's or a mockup's. NEW, and over every part of this file and of the master specification.** The owner's words, the same evening: *"Yeah my game content over the mockup stuff"*, and then *"Keep\*"*. **The reading (the repository's, marked as a reading, not the owner's words):** the second message corrects the first word of the first, so the rule reads "Keep my game content over the mockup stuff"; and it is taken to mean that where the game's own content (a name, a grade, a number, a rule of play, a picture) differs from a document or a mockup, the game's stands and the screens show the game's. The places it bites are listed, each with its file, in `UI_MASTER_SPEC_NOTES.md`. It agrees with the master specification's own words (*"Preserve server-authoritative gameplay, existing mechanics, game data, calculations and allocation preview"*; *"Every screenshot number and illustrative icon is a placeholder"*).
- **2026-11-25, MS "Start here" (no approval gate a menu). REPLACES** 15 §7's and part 16's order (the look, then mockups, then approval, then building): *"Do not wait for pixel-perfect approval of every menu or restart the questionnaire."*; *"Review real in-game screenshots rather than iterating hypothetical mockups."*; and the table of latest decisions: *"Proceed now; no per-menu image approval gate. Mockups are flexible inspiration and not exact element specifications."*
- **2026-11-25, MS "Non-negotiable requirements" (the old tab strip). SHARPENS** part 2's "Replace the crowded persistent tab strip with two workspaces": *"Completely retire the old CLOSE / Gear / Bro / Quests / Codex / More persistent tab strip. Use independently remembered Gear and Menu workspaces, a universal directory, one contextual header and actual-history navigation. Deep screens have labeled Back, title, Menu and Close; no duplicate secondary global nav."*; and MS 1.1: *"never restore persistent global tabs."*
- **2026-11-25, MS "Non-negotiable requirements" (chrome by code). SHARPENS** part 16's rules 2, 3 and 9: *"All UI chrome is code-rendered: gradients, bevels, reflections/shine, shadows, border trim, text, progress bars, action and selection states. Do not slice the reference mockups into button backgrounds or bake lighting into artwork. Use existing transparent pixel-art icons, portraits, sprites and illustrations. Create only genuinely missing unique artwork after an asset audit."* MS 2.1 adds the contract: one token layer, every state derived from it, a preview fixture, shine that can be turned off.
- **2026-11-25, MS "Latest decisions" and 4 (the Bro landing; Feats). CHANGES** part 3's hub (three primary and three secondary doors under a header that carries the portrait) and 16 rule 10's larger primary tiles for this screen: *"Six buttons only under contextual header. Character, Combat, Equipment / Life Skills, **Feats**, Pets. Remove the redundant player/tap banner."*; MS 4: *"Feats is the approved replacement for Accomplishments. No player portrait or tap banner above the Bro landing grid."* The reference uses equal-sized tiles; their exact size is delegated. For another player the owner is named in the header or a compact label, never a large banner; the full identity is Character's.
- **2026-11-25, MS "Latest decisions" and 4.1 (Character). SHARPENS** part 3.1 and 14 §4.2: *"RPG passport; large portrait and adjacent combat level, name/title, supporting summaries. Not a combat-stat dump."*
- **2026-11-25, MS "Latest decisions" and 4.2 (Combat). RESTATES** part 3.2: *"Three independent weapon channels plus shared attributes. Dedicated weapon screen with level/XP, DPS, supporting stats and six attributes. Shared points/EHP belong to shared screen. Existing allocation preview opens on selection, not a permanent panel."* MS 4.2's points rule (3 shared points on every weapon's level-up) is NOT the game's rule: by the owner's rule two lines above, the game's stands (`UI_MASTER_SPEC_NOTES.md`, the first line of its first table).
- **2026-11-25, MS "Latest decisions" and "Reference pack" (the visual target). SHARPENS** part 16's direction: *"Newer Character reference sets the premium blue-metal feel; Bro should match. Moderate excessive gold, glare, dark bevels and heavy text shadows."* The three pictures are *"visual references, not assets or rigid placement specifications"*; *"Every screenshot number and illustrative icon is a placeholder."*

**Named by the master specification as NOT decided** (MS 15; so not lines of this log): the exact effective-health damage model; multi-channel comparisons; the specialisation thresholds and the radar's scale; the medal tiers' mapping and AP's sources; the final supported directory and ranking categories; a townsperson's service capabilities; presence sampling and privacy; the real map topology and what may be seen; the Homestead's future construction, visits and pets. *"Do not introduce new gameplay to resolve these. Continue implementing unaffected menus while any such decisions are pending."* Its own word for the rest: *"Exact menu sizes, spacing, colors, font selection, icon placement and motion timing are implementation discretion."*

The repository's reading of the master specification against the game (`UI_MASTER_SPEC_NOTES.md`) and the order of the building (`UI_ARCHITECTURE_V2_PLAN.md`) are not decisions of the owner's: where one of them would settle a rule of play or the architecture, it is flagged in the notes and waits for the owner's words here.

### The owner's suggestions of 2026-11-26 (`UI_FEEDBACK_2026-11-26.md`; part 17 below)

The owner, about 18:30 UTC 2026-11-26, after playing the new dashboard: *"Also here are further suggestions to improve the menus"*, and six parts with their priorities. It is the owner's word after the master specification: where the two differ, this is the later. Their standing rule still holds (*"keep my game content over the mockup stuff"*): the mock-ups' names and numbers are examples. Each PR of card UI3 adds its own line here.

- **2026-11-26, part 3 (three weights). NEW, over every screen of the dashboard.** *"I would establish three distinct component styles and use them throughout the entire game. Navigation buttons: Raised, beveled, prominent. Reserved for destinations and actions. Important statistics: Recessed surfaces with large numbers. No heavy beveling. Supporting information: Flat, aligned within shared containers. No individual heavy borders."* Built in the kit (v2.3.6780): `Ui2Tile` and the header's controls are the raised form; `Ui2Stat` is recessed, its number large, a chevron only when it opens; `Ui2Facts` / `Ui2Fact` are the flat rows (new); `tools/guards/ui3-weights.test.mjs` fails a raised face on a thing that cannot be pressed.
- **2026-11-26, part 6 (the palette). CHANGES** MS part 2's illustrative values (`UI_MASTER_SPEC.md` :118-121: *"working references"*) and notes row 22 (the kit's blue-slate, *"the kit's to judge"*): *"I would keep the navy and gold aesthetic ... The dashboard's muted blue-gray background is what makes it feel somewhat disconnected"*, with their six values: dashboard base #14232F, navigation #223D53, recessed panels #0E1D29, subtle borders #4B6275, primary text #F1F0E9, gold accents #EAC474; and *"Use consistent off-white text throughout, gold for progression and important numbers, and other colors only when they communicate something meaningful. I'd also retain your existing illustrated game icons instead of replacing them."* All six are the kit's to the digit (v2.3.6780); the stops around each are the repository's; `?ui2look=0` gives the look before, to compare.
- **2026-11-26, part 4 (the Main menu's buttons, for every navigation button). SHARPENS** MS "Latest decisions" (:26, *"Moderate excessive gold, glare, dark bevels and heavy text shadows"*): *"reduce the button bevels and shadows, and use the same typography across all navigation buttons."* The bevel 2 to 1 px, the drop shadow and the soft drop lowered, one size (`--ui2-fs-nav`) on every tile's word and header control (v2.3.6780).
- **2026-11-26, part 2 (Bro and Character, one page). CHANGES** MS "Latest decisions" (:22-24, the Bro landing row, *"Six buttons only under contextual header. Character, Combat, Equipment / Life Skills, Feats, Pets"*, and the Character row) and MS 4.1 for yourself (*"Prominent portrait, name, equipped title and combat level"*): *"I don't think you need separate Bro and Character landing menus anymore. Moving the identity information into the persistent HUD eliminates much of the reason for having two screens. I'd turn the Bro menu into a unified character management dashboard."*; *"Titles could live within Feats. Weapon levels would live within Combat. Clan and guild management could link directly into Social."*; *"This eliminates the large redundant portrait, combat level banner, three weapon level buttons and separate oversized informational boxes."* Built (tag 6782, card UI3-bro): Bro is six tiles, Combat, Equipment, Life Skills / Feats, Pets, Journey, and one flat strip under them (AP, Quests done, Clan, Guilds, the title: interim until UI2-feats takes Titles); no portrait, name, combat level or weapon doors for yourself; Character (MS 4.1) stays ANOTHER player's page. The page's word stays the game's, "Bro" (the mock-up's "Character": flagged).
- **2026-11-26, part 2 (Titles within Feats). CHANGES** MS 4.5 (Titles a page of Character's) and card UI3-bro's interim strip entry: *"Titles could live within Feats."* Built (v2.3.6695, card UI2-feats): Feats' Titles door opens Character's ONE Titles page and is its only home for yourself; the Bro strip's title entry is removed; the worn title is shown on the door's line, the Titles page's head and its medal's page. Feats itself: AP the stat with its two honest sources, the four tiers as the medals, Quest History and Lifetime Records as doors to the pages the game already has.
- **2026-11-26, the letters (tag 6785, card UI3-type). CHANGES** Q91 and 16 rule 8 (*"a classic RPG serif"*) and the kit's choice of Merriweather (v2.3.6680): *"Also swap out the typography (font style) on all menus to be same as the 'logout' font"* (the owner, about 19:45 UTC, in the orchestrator's session). The kit's one token (`UI2_FONT`, `--ui2-font`) is the Log Out button's `'Source Sans 3', sans-serif`, weights 400 and 700 (both loaded); sizes unchanged (the orchestrator's choice, the owner's to change); Merriweather no longer asked of Google Fonts; `?ui2look=0` keeps yesterday's colours in today's letters (the serif is not loaded). Guard `menu-font.test`.
- **2026-11-26, parts 4 and 5 (Combat's hub and a weapon's page). SHARPENS** MS 4.2 (:209, Combat's hub and the dedicated weapon screen): *"Combat. The three weapon cards have too much empty space and surprisingly small weapon icons. Make the weapons visually dominant, enlarge the level numbers and only show available points prominently when there are points to spend."* *"Weapon attributes. Currently the messiest menu. Eliminate the left-side Attributes column, consolidate the combat statistics into one summary strip, and give the six attributes a full-width three-by-two grid."* *"This is how I'd consolidate the Sword menu specifically, with Bow and Staff following the identical template ... When points become available, the attributes can receive a small gold plus indicator and the available points counter can become gold."* The hub's pictures sized from its room (48 px upright, 32 before), the level 24 px, a 3 px bar, a count drawn only while > 0; ONE template for Sword, Bow, Staff and Shared (`sheet/attrTemplate.jsx`): level, then DPS the sunk stat and the four facts in one container, then the full-width line and the six, a gold "+" on each while points wait; the game's words kept over the mock-up's ("Crit chance", "Attack speed", "n Sword points to spend") (tag 6783).

## 14. Addendum of 2026-11-25: decisions Q36 to Q72

Everything under this heading is the owner's second document of 2026-11-25, word for word (v2.3.6402). Only its headings were moved down so that it sits inside this part: its own title and its sections 1 to 10 are the third-level headings below, and "14 §5.2" in the log, the audit and the plan means its section 5.2. Where it says "see section 6" it means its own section 6. Its section 10 is the writing tool's suggested prompt to a reader, kept as written; the owner's words and each phase's card are what a session works from.

### BroTown — UI Architecture Handoff Addendum

**Date:** November 25, 2026  
**Previous baseline:** `BroTown_UI_Architecture_Handoff.md` (through Question 35)  
**This update:** Decisions after Q35 through Q72 inclusive  
**Audience:** Claude Code / BroTown repository implementation agent  
**Phase:** Architecture and interaction design; not final visual assets or authorization to implement new gameplay mechanics.

### 1. How to use this update

This is an incremental addendum, not a replacement specification. Preserve all non-conflicting decisions in the original handoff. Where this addendum resolves an earlier open question or revises a prior proposal, use the newer decision. Merge the requirements into the repository's existing UI architecture specification (suggested location if none exists: `docs/design/UI_ARCHITECTURE_V2.md`). Retain the original decision history and clearly distinguish confirmed architecture, planned gameplay, and implementation details still open.

The original baseline was inspected before producing this addendum. The repository itself has not been audited for this update. All numerical examples, names, colors, icon shapes, layouts and map geometry in discussion wireframes were illustrative unless specifically identified as game rules. Do not copy them as production data. The owner's unassisted child task-completion benchmark and fixed mobile dashboard height remain governing constraints.

### 2. Shared navigation and interaction refinements (after Q35)

#### 2.1 Navigation and context

- **Universal Menu shortcut:** Deep screens must provide a reliable persistent route to the universal directory in addition to their labeled Back control and Close. Menu shortcut jumps to the directory root; ordinary entry to the Menu workspace from gameplay resumes its last state. Gear remains independently remembered. Back follows the actual navigation history and restores context, including originating list position or selected item. Close returns to gameplay without resetting the workspace.
- **Ownership context (Q46):** Explicitly identify another player's character or possessions when inspecting them, including deep screens. Self is the implicit default; do not clutter self-inspection with repetitive ownership labels. Public inspection uses the same components and factual information as owner inspection; ownership affects available management actions and private data access.
- **Spatial consistency (Q48):** Use predictable screen zones: contextual header; identity/context; primary summary; secondary information and deeper destinations; contextual actions at bottom. Flexible proportions within an invisible modular grid. Empty/unneeded zones collapse and useful content reclaims the space. Specialized workspaces such as Gear may depart from the generic layout where necessary.
- **Scrolling:** Avoid scrolling as a means of discovering primary actions, essential facts or primary destinations. Categorize large collections first, then allow intentional bounded scrolling within the collection where appropriate (inventory explicitly scrolls). Do not expand the dashboard into gameplay. Pagination is not the default and an exact fallback for oversized collections is not finalized.
- **Empty and locked states:** Keep meaningful destinations accessible even when there is no owned content or the feature is locked; stable locations and informative empty states explain what is absent, why, and how to obtain/unlock it if applicable. Respect actual availability and permissions; never present unsupported future features as already playable.

#### 2.2 Drill-down animation (Q47)

The owner prefers a selected window/container visually **expanding into the next menu**, not a horizontal slide. Returning contracts the detail view toward its originating container. This expresses the parent/child relationship and applies to destinations, metric breakdowns, entities, items and social clusters where feasible. Only dashboard content transitions; the world and dashboard height stay fixed. Suggested duration ~200–250 ms, not a locked requirement. Non-hierarchical workspace/root changes need not imply expansion from an unrelated object. Provide a safe fallback for contextual deep links with no visible origin and honor reduced-motion preferences (implementation proposals). Avoid delayed input, interrupted gameplay, layout thrash or heavy animation work.

#### 2.3 Contextual actions and notifications

- Distinguish static information surfaces, interactive destination containers and action controls. Put relevant actions in a separate bottom zone; reclaim the zone if no actions apply. Preserve predictable positions for common actions. The owner liked the distinction of light action buttons in neutral mockups, but exact colors remain visual-phase decisions.
- Confirm consequential, costly or irreversible actions; routine reversible operations can execute immediately with feedback. Preserve the existing attribute allocation preview/confirmation flow.
- Centralize notifications: temporary interactive toasts plus a persistent notification center. Tap a notification to reach the actual relevant destination, not a duplicated screen. Do not forcibly interrupt gameplay. Keep actionable notifications pending until resolved, while informational notifications can be dismissed. Exact notification placement and event rules depend on existing capabilities.

### 3. Reusable comparison, statistics and progression components

#### 3.1 Transformation comparison (Q49 — B)

Use a single reusable comparison architecture across applicable systems, with the selected **transformation** format rather than head-to-head cards or impact-only displays.

```text
[ Comparison subject / context ]
[ DAMAGE PER SECOND                     ]
[ Current     → If equipped    Change   ]
[ 100            125            +25%    ]
[ Effective health  1000 → 900  −10%    ]
[ Attack speed      2.0 → 1.8   −10%    ]
[ Breakdown ]                     [ Equip ]
```

- Current and comparison values, then signed change (percentage where meaningful). Use larger containers for the primary metric and compact aligned supporting rows; retain explicit labels and meaningful tradeoffs. The above values are only examples.
- For prospective changes (equipment, attribute allocation), comparison is automatic and reflects actual resulting character performance. For exploratory comparisons (another player, pet or Codex item), comparison is optional where meaningful. Label both subjects correctly, e.g. You vs Other Player, not 'If equipped' for a person. Do not imply a state change when simply comparing two entities.
- Offensive equipment emphasizes DPS; defensive equipment emphasizes EHP. Support secondary effects and deeper comparison; do not declare an item universally better based on a single metric. Handle zero baselines, no existing equipment, unchanged values, incomparable metrics, units and lower-is-better statistics without misleading percentages/colors.
- Reuse existing authoritative combat/preview calculations. EHP formula/reference damage model and mixed or multi-weapon comparison policy remain unresolved. The component should serve quick Gear inspection and full detail without changing the approved format or adding scrolling for primary facts.

#### 3.2 Branching statistical hierarchy (Q50 — C)

Headline statistics expand into a tree of contributing factors. Show **one layer at a time**: root value prominently, immediate contributing factors as selectable branches, then deeper factors and finally actual calculations or source information. Do not expose an enormous entire tree by default.

```text
                  DPS
         /         |         \
 Average damage  Attack rate  Critical effects
       ↓              ↓             ↓
 Weapon / power   Base / speed  Chance / multiplier
```

This is a conceptual tree, not the real combat formula. Actual branches, operators, and displayed intermediate values must match the game's calculation pipeline. A contribution is not necessarily additive. Where useful, link to equipment or invested attributes. Reuse the pattern for EHP, movement speed, critical chance, AP and other derived stats. Preserve contextual Back and owner/read-only distinctions.

#### 3.3 Skill progression (Q51 hybrid A+C; Q52 A)

A dedicated skill screen presents current level, XP progress (current/required and next-level proximity), and a compact milestone roadmap **on the same screen**. Meaningful unlocks, not arbitrary intervals, occupy milestone nodes. Selecting a milestone reveals the actual requirement and benefit. Current benefits and the full roadmap remain accessible.

Reveal all skill unlocks in the complete roadmap, including future rewards. Players should be able to deliberately plan their long-term skill progression. Categorize or drill down for large roadmaps while maintaining the dashboard height. Quests intentionally differ: their future steps remain hidden and open-ended as in the original handoff.

Apply reusable progression components to combat and noncombat skills where supported; integrate them with the already-approved combat performance and attribute preview screens rather than removing existing functionality.

### 4. Character inspection refinements

#### 4.1 Life Skills (Q58 hybrid A+B+C+D)

Combine all four approved qualities into a single overview:

```text
[ Life Skills                             ]
[ Combined skill levels | Radar profile  ]
[ Skill icon/name + Lv + small XP bar    ]
[ Skill icon/name + Lv + small XP bar ...]
```

- Equal-weight, recognizable individual skill destinations; use actual supported skills.
- Sum of life skill levels as headline statistic, encouraging growth across skills. This is a separate measure from combat level (which remains the MAX of weapon levels, per original baseline).
- Each skill destination includes a compact XP progress bar so players can see proximity to the next level without opening every skill.
- Radar chart shows specialization versus versatility. Use consistent axes and scale across players for meaningful comparison; exact normalization and presentation await validation. Each skill opens the approved level/XP/milestone screen.
- Combined life skill level as an additional Highscores category was suggested, not separately confirmed; audit existing ranking support and confirm before adding gameplay tracking or competition.

#### 4.2 Dynamic character identity (Q59 C; Q60 A)

Automatically describe a player's specialization for **both combat and life skills**, based on actual development. Examples: Sword Specialist, Mining Specialist, Jack of All Trades. These are descriptive, dynamic labels, not earned titles, fixed classes, bonuses, or restrictions.

Place two compact identity labels directly beneath the player identity (portrait/name/equipped title/combat level/AP). Keep earned titles visually distinct. Full radar profiles live within Combat and Life Skills rather than cluttering the main character screen. Same identity for self and other-player inspection. Classification thresholds, ties, beginner handling and radar axis normalization remain to be defined with the owner; do not invent balance changes or misleading labels.

#### 4.3 Accomplishments (Q53 B)

AP (Achievement Points) is the dominant headline of Accomplishments, with a drill-down into its actual sources. Below, provide destinations for Achievements, Titles, Quest History, Lifetime Records and Discoveries (subject to actual supported data). Do not assume all these categories award AP; use the actual achievement model. Maintain the original consolidation and reuse existing records/quest data.

##### Achievements (Q54 E; Q55 A)

- Organize achievements by **medal difficulty/prestige tiers** (Gold, Silver, Bronze were illustrative). Tier overview shows recognizable medals and counts, with AP as context. Selecting a tier expands into its collectible medal gallery.
- Individual medal gallery emphasizes distinctive medal art and title, not progress bars. Earned medals have their full appearance; unearned medals are muted but inspectable. Use non-color state cues. Selecting an individual medal opens its actual requirements, progress, AP value and relevant details.
- Exact medal tier definitions and mapping to existing achievements remain open. If not currently supported, this is a UI direction requiring an explicit data/mechanics decision before adding a new grading system. Do not silently alter achievement requirements or AP values.

##### Titles (Q56 hybrid D+G)

- Make both title name and concise **earning requirement visible at a glance**, with clear earned/locked/equipped status.
- Group titles with real sequential prerequisites into progression families (e.g. monster-kill milestones), using a connected roadmap. Standalone titles appear as concise rows with their own requirements; never fabricate a progression relation.
- Current equipped title and how it was earned are prominent on Titles home. Larger title families/collections are categorized to fit fixed height.
- Selecting a title reveals exact requirements and progress, with an Equip action for unlocked titles on self only. Inspecting other players preserves the public information and removes edit authority.

##### Lifetime Records (Q57 A)

Landing page is a **career highlights** overview: a few meaningful lifetime statistics (e.g. kills, gold earned, resources gathered, time played if tracked). An All Lifetime Records destination provides detailed statistics, categorized as needed. Exact headline records and units depend on actual tracked data. Do not invent retroactive tracking.

#### 4.4 Pets (Q61 A)

Active companion dominates the overview, with actual appearance, identity and relevant supported stats. Secondary destinations: Owned Pets and All Pets. All Pets should reuse the Codex pet collection when available, not duplicate encyclopedia data. No active companion produces an informative empty state. Owner management and other-player inspection use the same underlying components with permissions. Pet leveling/XP, sample species and stats shown in prior wireframes were examples, not confirmed mechanics. Unequipped pets living on the farm are a planned Homestead mechanic (see section 6).

### 5. Social — living relationship network (Q62–65)

#### 5.1 Approved home design: modified F3 + Hybrid 3 navigation (Q62–63)

Social is an independent Universal Menu destination. It uses a living network rather than a conventional button grid.

```text
     ( FRIENDS )           ( CLAN )
     ( sprites )           ( sprites )
       count     \       /    count
                    YOU
       count     /       \    count
     ( sprites )           ( sprites )
     (  PARTY  )           ( NEARBY )
```

The diagram is symbolic; in the real layout **all four category labels sit at the TOP of their circles**, including Party and Nearby.

- Your actual character sprite is the central node. Four fixed-position relationship circles surround it: **Friends, Clan, Party, Nearby**. Do not add Guild or Messages/Requests as a fifth primary circle. Additional supported relationship/communication functions are contextual secondary destinations.
- Use actual representative player sprites **inside** each circle, not floating outside. Category title at the top, glanceable accurate count/status in a dedicated zone, sprites contained between. The circle is the large touch target for group navigation.
- Show limited representative online players for large groups plus an accurate count; empty circles retain label and location. Do not imply that visible sprites are all members. A player may legitimately be in multiple groups. Exact sampling and presence update rules await audit.
- Subtle existing idle animation and login/logout appearance changes were suggested to strengthen the living feel. Avoid moving navigation targets, clutter or excessive live sprite rendering on mobile. Reuse cached appearance/state where practical; actual performance budget is not yet specified.
- Tap circle → expanding transition into relationship screen → select player → universal character inspection. Back restores the same relationship and prior Social network state. Overview sprites are representative; do not require users to hit tiny individual sprites to navigate.

#### 5.2 Inside a circle (Q64 C)

Prioritize an online character gallery of actual player appearances. Provide access to the entire online collection, offline directory where applicable, and contextual group management/requests. Do not force a single layout on groups where offline membership is meaningless (e.g. Nearby); use the same structural principles with actual supported semantics. Lists/collections remain bounded and categorized. Selecting a player opens the universal inspector.

#### 5.3 Social actions (Q65 A)

Dedicated action bar at bottom of other-player inspection, with common social actions directly available in predictable positions (examples Message, Add Friend, Invite). Do not hide all social functions behind an additional destination or dynamically shuffle the action bar as a default. Adapt availability/labels to actual relationship state and permissions while preserving spatial predictability. Exact actions, restrictions, secondary placement, clan management and communication flows still require audit. No new party, messaging, moderation or clan mechanics are authorized by sample wireframes.

### 6. Homestead — actual estate visualization (Q66–70)

#### 6.1 Owner-provided gameplay direction (important distinction)

Farming is still early in development. The following are the owner's **planned** gameplay capabilities, not assertions that they already exist:

- Purchase additional farmland to expand the estate.
- Build a customized farmhouse within modular design constraints.
- Furnish the farmhouse using woodworking-crafted furniture or furnishings purchased from other players.
- Unequipped pets live on the farm.
- **Current storage is at the bank.** Moving storage to the farm is only a possible future change. Do not create a farm storage building or assume livestock, production systems or other features from exploratory mockups.

#### 6.2 Estate overview and navigation (Q66 B; Q67 B; Q68 C+B)

Use an interactive miniature of the actual property, reflecting the real arrangement, land ownership, buildings, crops and pets as supported. It is not a fixed generic representation of unrelated management functions.

- Estate-wide overview presents owned plots and meaningful property areas. Actual buildings and plots are destinations. Selecting one expands into the appropriate detail or management view.
- Combine expandable plot-level detail with optional pan and zoom so large properties stay explorable without permanently shrinking all touch targets or forcing every player to pan before finding core destinations.
- Land expansions reflect actual purchasable neighboring land, if supported. The land grid, expansion rules and prices are not defined by the UI design. Do not hardcode sample plots.
- Reuse actual world art and property state where feasible. Pets can appear on the miniature when unequipped once this mechanic exists; animation is a proposed presentation detail. Maintain visual and textual identification of meaningful destinations. No arbitrary Homestead level or progress percentage was approved.
- Keep Homestead independent of Life Skills; farming/woodworking skill screens remain progression views. Cross-link meaningful related subjects without duplication.

#### 6.3 Farmhouse (Q69 accepted B+C, A for construction)

Three complementary views:
1. **Exterior:** actual customized farmhouse in the estate miniature.
2. **Interior:** selecting the house expands/reveals a roofless cutaway using the game's three-quarter perspective; show actual rooms and furniture.
3. **Construction:** an overhead floor-plan view for modular building and furniture placement, accessible through a clearly separated owner editing action.

Construction constraints, room modules, placement rules, inventory/crafting/economy and editing workflow remain future gameplay design. Do not implement invented room types or building systems in the UI refactor. When these mechanics exist, the miniature and editor should read the same authoritative property state.

#### 6.4 Other-player homesteads (Q70 A+B)

Make a player's property inspectable through their character profile using the same estate/house representation, read-only for other viewers. The owner also approved the **planned capability** to physically visit other players' properties, subject to actual access permissions. A Visit Homestead action should appear when supported and permitted. Do not invent teleportation, instancing, visitor permissions or a public estate directory. The universal character inspector will need a Homestead cross-link; exact placement alongside existing destinations remains to be validated within the fixed height.

### 7. World Map (Q71 hybrid C+B; Q72 C)

#### 7.1 Two complementary world views

- **Geography:** miniature of the actual terrain and geographic relationship of regions; supports contextual markers, overlays and selecting regions.
- **Connections:** simplified graph of actual traversable region connections. This is intended to make route topology easy to follow, not a fictional hub-and-spoke arrangement. Geography shows where places are; Connections shows how regions connect.
- Both views share world data and contextual destinations. Provide an obvious labeled way to switch views (the prototype used a segmented control; exact affordance is not a final styling decision). Reuse world location/route data, not hand-authored illustrative links. A clear current-player position or current region and meaningful navigation targets should be legible.
- World overview → select region → expanded local map. Pan and zoom are recommended where needed, following the same broad global-to-granular navigation used for estates. Do not introduce new fast-travel, route-finding, tracking or visibility mechanics merely because a mockup included markers.

#### 7.2 Local region map: interactive map with region intelligence (Q72 C)

```text
[ < World Map       Region Name        ]
[ Actual terrain + selected map marks  ]
[ Monsters ] [ Resources ] [ NPCs      ]
[ Dungeons ] [ Quests    ] [ Locations ]
```

Combine actual local geography with a glanceable summary of what the region contains. Use recognizable category destinations with meaningful counts when supported. Selecting a category should highlight its relevant map locations or open its corresponding region-filtered directory; exact behavior for each category is not finalized. A marker can lead to the same reusable entity inspector or relevant quest/location screen. Preserve region and map state when returning.

Quests, Players, Resources and Places were example world overlay categories; Monsters, Resources, NPCs, Dungeons, Quests and Locations were example local categories. Use actual available data and access rules. Do not disclose hidden player locations, spoil future quest steps, or show non-existent landmarks. Real map topology, region labels, coordinates and route connectivity must come from the repo. All conversational map graphics were illustrative only.

### 8. Remaining questions and implementation boundaries

The owner has answered Q72 with option C (local interactive terrain map + region intelligence). Resume at Q73, one architecture question at a time, or consolidate remaining architecture questions before final visual work. Do not reopen approved choices unless the code audit reveals a conflict.

Open items include:
- Exact fixed-height screen measurements and mobile fit for every proposed view (wireframes were conceptual, not pixel-perfect viewport tests), final universal directory labels/order and quick Gear/root affordances, Settings layout, precise Codex/ranking/filter/search categories.
- Gear geometry, item-type comparison metrics, EHP assumptions, formula trees and authoritative calculation wiring; existing attribute preview integration.
- Actual life skill list/caps, radar scaling and identity thresholds, AP sources, medal prestige tiers and title progression families; proposed combined-level rankings.
- Presence sampling/online updates, supported relationship functions and actions, privacy/access rules and Social performance budget.
- Homestead future mechanics and access; distinguish implemented farming from planned expansion/building/furnishing/pets/visits. Keep bank storage unchanged.
- Real world map topology and marker visibility; how each region category opens filtered details versus highlights map markers; exact zoom controls.
- Final icon/art/font/palette/bevel/shine/spacing and detailed animation specifications. Do not treat wireframe colors or example shapes as final assets.

### 9. Additional acceptance tests (proposed, not yet run)

At the existing portrait mobile dashboard height, without explanatory instructions:
- Open a nested DPS factor and follow the branching relationship to its actual calculation. Go Back to the original context; compare an item against current equipment and correctly describe a benefit and a tradeoff.
- Compare another player with yourself without confusing the comparison for an equip action. Inspect the same item from Gear/Codex/another player's equipment and verify facts match.
- Find combined life skill level, the highest skill, the next level's XP progress, and a distant future unlock. Distinguish the dynamic specialization label from an earned equipped title.
- Find an earned gold-tier achievement, inspect an unearned medal's requirement, discover how a title was earned, and equip an unlocked title as the owner only. Find a lifetime record and the active pet.
- From the living Social network, identify Friends, open online gallery, inspect a player and access a supported social action. Return to the same context. Confirm empty groups stay discoverable and large groups do not overcrowd the dashboard.
- When Homestead features become available, inspect actual estate/plot/house, reveal the interior, distinguish view from edit, and test pan/zoom plus access-controlled visits. Existing farm and bank functionality must continue working before those features ship.
- Switch between geographic and connection maps, identify an actual route/region, open a local category and a relevant entity, then return without losing map state. Verify map topology and visibility rules against real game data.
- Verify touch targets, text readability, no overlaps, no primary controls hidden behind scrolling, no dashboard height increase, and responsive animations on actual supported devices. Test empty/loading/error states and contextual permissions.

### 10. Copy-ready prompt to Claude Code

> Read this addendum together with the previously supplied BroTown UI Architecture Handoff (through Q35). Merge only the new or superseding decisions into the existing repository architecture specification; do not replace the earlier baseline or restart the redesign. Update resolved open items and preserve remaining questions. Distinguish confirmed owner decisions, illustrative examples, implementation proposals and planned gameplay mechanics. Audit the actual repo before mapping these requirements to components, data, routes and existing permissions. Preserve the fixed mobile dashboard height, existing gameplay behavior, authoritative combat calculations and allocation preview. In particular, do not implement future Homestead mechanics or move bank storage as part of the UI redesign. Report any conflicts and unresolved technical decisions. Save the updated architecture spec and decision log; do not begin final art polish or large-scale implementation solely because this addendum was provided. The current decision checkpoint is Q72 completed.

## 15. Final architecture addendum of 2026-11-25: decisions Q73 to Q85

Everything under this heading is the owner's third document of 2026-11-25, word for word (v2.3.6403), sent with the words *"Here's more to the plan (this completed architecture)"*. Only its headings were moved down so that it sits inside this part: its own title and its sections 1 to 7 are the third-level headings below, each question a fourth-level one, and "15 §3" in the log, the audit and the plan means its section 3. Where it says "previous baselines" it means parts 1 to 12 and part 14 above. Its section 7 closes the foundational architecture; it starts no building.

### BroTown — UI Architecture Handoff: Final Architecture Addendum

**Date:** November 25, 2026  
**Previous baselines:** `BroTown_UI_Architecture_Handoff.md` (Q1–35); `BroTown_UI_Architecture_Handoff_Update_Q36-Q72.md` (Q36–72)  
**Scope:** Q73–85 inclusive; closes the foundational architecture phase  
**Audience:** Claude Code / BroTown repository implementation agent

### 1. Merge instructions and guardrails

Merge this incremental addendum into the existing repository UI architecture specification, preserving all previous decisions unless explicitly superseded. If no canonical specification exists, suggested location: `docs/design/UI_ARCHITECTURE_V2.md`. This is not an instruction to start implementation. The owner has completed foundational architecture choices; visual language, production layouts, assets and implementation validation come next.

Preserve the fixed mobile dashboard height, gameplay viewport, established Gear/Menu workspace behavior, contextual Back/Menu/Close, expansion/contraction drill-down, global-to-granular disclosure, predictable spatial zones, explicit labels, and separate actions vs destinations. Primary navigation, important facts and primary actions must not require scrolling to discover. Bounded collection scrolling is allowed. Test clarity against the owner's benchmark: give a child a task and see whether they can find the correct destination/action without additional instructions.

All names, artwork, quantities, prices, rarities, probabilities, merchant services and other example data from the wireframes are illustrative unless verified against existing game data. This addendum records UI choices, not new game mechanics. Do not invent unsupported functionality, change combat formulas, move bank storage, or implement future Homestead features prematurely. The live repository and exact production dashboard dimensions have not been audited for this addendum.

### 2. Codex (Q73–75)

#### Q73 — Illustrated collections with essential information (C)

Use illustrated entity cards, with artwork as the dominant visual and a small amount of essential information that depends on the entity type. Keep the Codex complete rather than discovery-locked, as previously approved. Region filtering and subject categorization remain part of the prior architecture. Avoid a dense database-style directory as the general collection layout.

Examples of glanceable information, where supported:
- Monsters: level and element or habitat.
- Weapons/equipment: rarity and equipment requirement.
- Resources: gathering requirement.
- NPCs: occupation and location.
- Furnishings: crafting requirement (when the feature exists).
- Pets: species and rarity.

Use real entity sprites, explicit names, and accessible tap targets. Large collections use the agreed categorization and bounded collection scrolling policy. Search was shown in wireframes; exact search placement and supported search fields are implementation details, not a new fixed requirement.

#### Q74 — Illustrated entity showcase plus subject destinations (A + C)

Use a reusable entity inspection framework that combines an illustrated encyclopedia with a large visual showcase and informative subject destinations. In the monster example, the actual animated monster sprite, name, short description, level/element and essential combat stats are visible on the first screen. Subject destinations summarize their own contents and expand into dedicated detail views. The example layout places the showcase on the left, destinations on the right, and essential statistics below; the exact proportions must fit the fixed dashboard and should not duplicate a metric unnecessarily.

Possible subject destinations (use only supported data):

| Entity | Subjects |
|---|---|
| Monster | Combat, Loot, Abilities, Habitat |
| Equipment | Attributes, Requirements, Acquisition |
| Resource | Gathering, Uses, Locations |
| NPC | Services, Quests, Location |
| Furniture | Materials, Crafting, Acquisition |
| Pet | Attributes, Abilities, Acquisition |

The same entity should use the same canonical inspection screen across the Codex and contextual entry points. Preserve ownership/permission differences and contextual Back. A Codex NPC entry provides information; actual merchant services require the appropriate interaction context.

#### Q75 — Traditional loot directory (A)

Use a straightforward row-based loot table rather than a gallery, rarity-tier submenu or featured rare-drop landing page. Show item artwork, explicit item name, rarity and exact drop probability together. Selecting an item opens universal item inspection. No dice-roll numbers, probability progress bars or unnecessary drill-down by rarity. Allow reverse acquisition navigation (item → actual sources → location) where the game data supports it, consistent with earlier crosslink architecture.

Use the actual loot engine's semantics: distinguish individual-item probability from rarity-tier probability, conditional rolls and modifiers if present. Do not assign illustrative percentages to actual items, round very small positive probabilities to zero, or imply mutually exclusive drops unless the engine works that way.

### 3. Commerce and crafting (Q76–79)

#### Q76 — Categorized storefront and dual-panel shop (D + C)

Larger shops begin with clear merchandise categories; smaller merchants may bypass the category directory when unnecessary. The shop workspace reuses the inventory-grid and quick-inspection architecture established for Gear.

Conceptual states:
```
[ Merchant / Shop                         Gold balance ]
[ Merchandise category grid ]       [ Carried inventory ]
                ↓ select merchandise
[ Merchandise grid remains ]        [ Item quick inspection ]
                                     [ Price / comparison ]
                                     [ Purchase ]
```

Use actual merchant offerings. Keep source-panel position stable and show the selected item, price, and relevant comparison where meaningful. Reuse universal item inspection for deeper detail. Buying/selling actions should be explicit, and selling uses the actual carried inventory. Display applicable currency and balance clearly. Categories, quantities, stock policies, transaction mechanics and exact buy/sell transitions depend on the existing implementation. No new merchant inventory or services are mandated.

#### Q77 — Bank: dual inventory with intelligent organization (C)

The bank remains the current storage system. Show carried inventory and bank storage simultaneously, with clear separate labels and actual capacity/occupancy if applicable. Both item grids may scroll independently inside their allocated panels. Bank contents support category filtering, stack quantities, selected-item inspection and clear Deposit/Withdraw directions. Reuse universal item inspection and the inventory-grid framework.

Bulk deposit and stack quantity transfer were illustrative possibilities; verify existing support and avoid accidentally including protected or equipped items. Never infer new storage capacities or move storage into Homestead. The same component architecture may be reused if farm storage is introduced later, but that is not approved gameplay work here.

#### Q78 — Player trading: build offer, then review exchange (B first, C second)

The first screen is the offer-building workspace, NOT the final review. Show the player's inventory alongside both players' offers. Clearly distinguish whose items and currency are in each offer. Allow meaningful item inspection through the shared components.

The second screen explicitly presents **You Give** versus **You Receive**, item quantities and actual currency transfers. Where gold is exchanged, use the existing transformation comparison style: current balance → resulting balance, signed change. Clearly show the counterparty's acceptance state and a distinct final confirmation action.

Both players must confirm the same final offer. Any offer modification invalidates/reset both acceptances. These requirements must be enforced server-side, not merely represented visually. Implementation safeguards to validate during audit: use offer revision/version checks, validate ownership, quantities and available balances, reject stale confirmations, prevent duplicate submissions, reconcile both inventories and currency atomically or via the existing safe transaction mechanism. Do not claim a trade is complete before authoritative confirmation. If existing trading mechanics differ, identify the gap for review rather than silently weakening safeguards or introducing an unsupported trade system.

#### Q79 — Illustrated recipes, crafting workspace and material transformation (B + C + D)

Recipe browsing uses illustrated item collections with explicit requirements and availability where known. Selecting a recipe opens a reusable dual-panel workspace: browse recipes on one side, see selected output, required materials, available quantities, crafting quantity and action on the other.

The expanded recipe view explains a visual transformation:
```
[ Materials and quantities ]  →  [ Crafted product and quantity ]
[ Quantity adjustment ]         [ Craft ]
```

Quantity changes recalculate required materials based on actual recipes. Distinguish available from required quantities and show missing requirements plainly. Do not force an additional confirmation for every routine crafting action; D is an expanded inspection view when useful. Follow earlier rules for consequential or irreversible actions and actual mechanics. Reuse across supported woodworking, blacksmithing, cooking and other crafting systems; future farmhouse furnishings are planned content, not an implementation instruction. Server remains authoritative for costs, outputs, capacity and eligibility.

### 4. NPCs and settings (Q80–81)

#### Q80 — Living NPC profile with contextual services (C + D)

Use an actual animated NPC sprite/identity showcase, name, role and a concise contextual dialogue line where available. Clearly labeled service destinations are adapted to the NPC's supported services. An NPC with only one or two services should have larger, understandable destination controls rather than empty filler slots. Examples include Shop, Crafting, Bank, Quests and Dialogue where actually provided.

The layout shares the Codex identity/showcase component; remote Codex inspection is informational, while physical NPC interaction enables actual services. Use the existing contextual NPC interaction trigger and keep in-world gameplay controls unobstructed. The example NPC names and quotes were placeholders.

#### Q81 — Quick settings first (B)

Settings is an intentional exception to destination-first navigation: players commonly open it to change a known preference quickly. Expose frequently used adjustable controls directly on the landing screen (examples: music volume, sound effects volume and graphics quality, if supported). Other settings remain clearly labeled categories below, with deeper dedicated screens. Apply safe reversible settings immediately; destructive or consequential account actions follow the earlier confirmation rules. Actual available settings and defaults must be audited; do not invent controls or hardware capabilities.

### 5. Cross-cutting interaction states (Q82–84)

#### Q82 — Graduated feedback (D)

Match feedback intensity to event significance:

| Level | Example | Presentation |
|---|---|---|
| Routine | Equip item | Immediate component update and brief local acknowledgement |
| Noteworthy | Quest objective completed | Temporary contextual notification |
| Milestone | Skill level increased | Enhanced animation and sound |
| Exceptional | Godly item obtained | Memorable arcade-style reward reveal |

Examples are illustrative; map actual game events to appropriate feedback classes during implementation. Avoid making everyday actions feel like major celebrations. Do not obstruct active combat. Defer intrusive reward reveals until a safe context or player-initiated notification inspection. Maintain previously agreed notification-center behavior. Respect user sound/motion preferences, avoid excessive effects, and do not signal success until confirmed when a server mutation is involved.

#### Q83 — Disabled action with immediately visible reason (A)

When requirements are not met, retain the relevant action in its predictable location in a visibly disabled state, with a short adjacent explanation. Example: `Equip Sword` disabled; `Sword level 18 — requires level 25.` Do not introduce a separate requirements checklist or force a player to drill into progression to find out why an action is unavailable. This is distinct from a complex recipe's already-required material list. If multiple reasons apply, give concise actionable reasons without obscuring the normal layout. Never rely on color alone. Preserve prior accessible empty/locked destination behavior and actual permissions. UI eligibility is not a substitute for authoritative server checks.

#### Q84 — Contextual loading, transaction and connection states (D)

- Loading collections: show available information and progressive placeholders without falsely depicting an empty or fully loaded collection.
- Purchasing/crafting/other mutation: local pending indicator on the affected control, with relevant repeated/conflicting actions temporarily unavailable.
- Failure: concise explanation and safe retry when appropriate. Do not assert no currency was deducted unless authoritative state establishes this.
- Connection interrupted: clear reconnecting/offline notice; retain safe context and prevent unsupported mutations.
- Critical transaction pending: lock only affected actions wherever safe; prevent duplicate submission.
- Success: update affected components after authoritative server confirmation.

If the response is lost or transaction outcome is uncertain, show an unresolved/reconciling state rather than falsely reporting success or failure. Verify transaction status before retrying a potentially completed action. Preserve navigation where safe; do not block unrelated dashboard areas with a full overlay unless actually necessary. These are UI and integrity requirements; exact protocol/implementation depends on the repository audit.

### 6. Final architectural principle (Q85 — B)

**Consistency in interaction; creativity in presentation.**

The owner approved a shared component framework with distinctive personalities for individual gameplay systems. Do not make every menu an identical grid, nor create incompatible subsystem-specific visual languages.

Shared across the entire game:
- Navigation framing, contextual Back/Menu/Close, predictable zones, labels, touch-target conventions.
- Materials, typography, proportions, bevel/interaction treatment, reusable panel and action components (visual definitions still pending).
- Expansion/contraction drill-down, item and entity inspection, transformation comparison, progression components, state handling and permissions.
- Accessibility, performance, fixed dashboard height and clarity benchmark.

Distinctive interiors are explicitly encouraged where the subject warrants them:
- Combat: prominent performance statistics and branching calculations.
- Social: living relationship circles containing real player sprites.
- Homestead: actual estate miniature and farmhouse views (future gameplay gated).
- Codex: illustrated collections and large entity showcases.
- Map: geographic and simplified connectivity views with region intelligence.
- Gear, Bank, Shops, Crafting and Trading: purpose-built dual-panel workspaces.

These are variations within one design system, not separately themed applications. Reuse components and data sources instead of maintaining duplicated inspection or calculation screens.

### 7. Status and next phase

Foundational architecture questions Q1–85 are complete by owner decision. This does not mean production design or implementation is complete. Merge all three handoffs into one canonical, versioned specification. Keep a traceable decision log and mark any example or unresolved technical detail as such.

Next: establish the actual visual language (materials, palette, typography, borders/bevels, interaction states, iconography, animation and feedback), then validate pixel-accurate representative mockups within the existing mobile dashboard dimensions. The owner has previously favored a polished arcade aesthetic, clearly raised interactive elements, restrained ornamentation, recessed information surfaces and modular alignment. Do not finalize art assets until the visual direction is explicitly approved.

Before implementation: audit the current repo, existing components, actual dimensions, available data, existing gameplay features and server integrity requirements; map every approved destination to supported functionality; surface conflicts and gaps rather than silently inventing mechanics. Build reusable components in phases after owner approval; test navigation, permissions, transaction outcomes, responsiveness, mobile performance and accessibility. The exact EHP formula, specialization classification rules, some entity/category inventories and future Homestead mechanics remain open as described in prior handoffs.

## 16. Visual design hand-off of 2026-11-25: decisions Q86 to Q108

Everything under this heading is the owner's fourth document of 2026-11-25, word for word (v2.3.6404), sent with the words *"Hers more"*. Only its headings were moved down so that it sits inside this part: its own title and its three sections (the table of approved decisions, the material and component rules, the next phase) are the third-level headings below. "16, the table" in the log, the audit and the plan means its table of questions 86 to 108; "16, rule 5" means the fifth bullet of its "Material and component rules", counted from the top (thirteen bullets); "16, the next phase" its last section. Where it says "prior specifications" it means parts 1 to 12, part 14 and part 15 above. It approves the foundational VISUAL direction; it starts no building, and it says of itself that the repository was not audited when it was written: the look of the game as it is today is the audit's fourth half, "The look".

### BroTown — Visual Design Handoff (Q86–108)

**Date:** November 25, 2026  
**Status:** Foundational visual direction approved; production screen mockups, asset audit and implementation approval still pending.  
**Prior specifications:** Q1–35, Q36–72 and Q73–85 architecture handoffs.

Merge into the canonical UI specification (`docs/design/UI_ARCHITECTURE_V2.md` if that is the established location), retaining architecture decisions. This is an incremental design record, not authorization to implement or replace existing art. The actual repository has not been audited. Preserve the existing mobile dashboard height, gameplay viewport and art. Do not add game mechanics, change formulas, or implement future features on the basis of illustrative mockups.

### Approved decisions

| Question | Owner decision | Design rule |
|---|---|---|
| 86 | B | Polished Lantern Slate, retain existing game artwork and aesthetic. |
| 87 | C | Strong visual distinction: recessed information, raised navigation, clearly differentiated action buttons. Action color refinements below supersede gold-only treatment. |
| 88 | A | Smooth rounded metallic geometry, no chamfered corners. |
| 89 | A | Restrained gold: outer frame and intentional accents, not gold outlines around every destination. |
| 90 | B | Fine brushed slate, low-contrast directional texture. |
| 91 | C | Classic RPG serif typography; exact font not yet approved. |
| 92 | A+B | Artwork directly on raised navigation surfaces; recessed item/equipment sockets. |
| 93 | D+A | Rarity expressed primarily through outlines, with graduated prestige. |
| 94 | B, stronger | Pronounced physical depression for active selection; stable component footprint. |
| 95 | A | Continuous metallic progress fills in recessed tracks. |
| 96 | A | Neutral ordinary information, selective semantic colors for meaningful states. |
| 97 | A | Balanced headline/supporting numerical hierarchy, no oversized scoreboard treatment. |
| 98 | Recommended C | Adaptive information density, strongly minimalist; deeper supporting details belong in their own destinations. |
| 99 | A | Integrated header on slate surface, raised navigation controls. |
| 100 | A+C | Full-width single action or contextual bottom row with relevant decision information. |
| 101 | C | Context-specific action colors. |
| 102 | Revised B | Polished metallic gradient fills and broad reflected light across face and bevel, not thin solid-color highlight lines. |
| 103 | A | Shallow dashboard framing; reserve pronounced physical depth for controls. |
| 104 | C | Adaptive button proportions; illustrated large primary tiles, compact deeper/secondary navigation. |
| 105 | Recommended C+B | Artwork dominant on primary destinations; balanced art/label on secondary destinations. Full-color art, not monochrome line icons. |
| 106 | A | Desaturated locked/unearned artwork; restore original color when unlocked; remain inspectable. |
| 107 | D | Count badges for countable events, dots for general updates, rare warm illumination for exceptional opportunities. |
| 108 | B | Light metallic action gradients with one consistent dark text color; prioritize legibility. |

### Material and component rules

- Use the existing Lantern Slate identity, not a new brown/wood, generic fantasy, or black-and-gold theme. Earlier illustrative palette references include slate #26383E, panel #1E2E34, raised #293B41, recessed #111E23, deep #0B161B, brass #D8AA58, highlight #EAC675, light text #F4F0E7. These are working references, not a verified audit of repository tokens.
- Shallow frame, thin restrained gold rim, fine low-contrast brushed texture. Rounded metallic buttons have broad continuous gradient surfaces and graduated bevels. Avoid flat outlines, thin decorative shine lines, screws and heavy ornamental framing.
- Raised navigation destinations use slate-metal surfaces and light readable labels. Recessed information and item sockets remain visibly distinct. Light action faces use dark labels consistently across the entire semantic action palette. Do not switch action text from black to white between colors. Use smooth, light-enough gradients behind lettering, with reflections concentrated away from text as necessary. Target at least 4.5:1 contrast for normal-sized text throughout its occupied gradient area; verify actual implementation states, including pressed states.
- Working action palette: gold = routine actions (Equip, Purchase, Craft); green = acceptance/confirmation/claim; blue = guidance/movement (Track, Locate, Travel); red = destructive actions (Discard, Abandon, Delete); silver = neutral/dismissive (Cancel, Decline). The owner selected the light/dark-letter treatment from this proposed five-color palette. Exact hues and context-specific edge cases remain subject to screen review. Back/Menu/Close retain the approved navigation semantics; do not mistake a silver navigation control for a gameplay commitment. Red is reserved for genuinely destructive consequences, not ordinary cancel.
- A selected control looks deeply pushed into the dashboard, using inverted depth, shadow and changed surface lighting, not just a subtle tint. Preserve touch footprint, surrounding layout, labels and rarity outline. Differentiate momentary press from persistent selected state according to actual control semantics.
- Inventory rarity uses clean border treatment: common neutral, rare blue, epic orange with more pronounced metallic finish, Godly prismatic with restrained glints/animation. Preserve existing actual rarity definitions, colors and artwork; no invented tiers or probabilities. Keep dark recessed interiors. Provide non-color cues where relevant. Respect reduced-motion settings.
- Continuous progress fills with recessed track; retain existing gameplay-specific health/mana conventions. Ordinary stats use ivory/white values and muted readable labels; meaningful changes, warnings, rarity, rewards and actions can use semantic color. Do not make ordinary metrics rainbow-colored.
- Classic RPG serif direction approved, but choose and test an actual licensed font for mobile legibility, numeral alignment, and performance before locking it. Keep headings and body readable; exact type scale remains a production decision.
- Existing sprites, items, characters, NPCs, monsters, buildings and world artwork are authoritative. No generated replacement art. Reuse colorful existing icons where appropriate. Only create new full-color matching navigation artwork for genuine missing assets after auditing existing assets. Placeholder vector icons shown in the design discussion are not production art.
- Use adaptive proportions and artwork prominence according to established subject hierarchy. Primary tiles may be larger, secondary tiles more compact. Keep explicit readable text labels; never rely solely on icon interpretation. Universal directory remains equal-weight as previously decided.
- Use integrated titles with Back/Menu/Close where applicable, no raised decorative title plates. Contextual action bar only when needed; full-width for a single simple action, price/requirements alongside where decision-relevant. Do not add a separate confirmation to routine actions contrary to earlier architecture rules.
- Maintain one meaningful information question per screen. Show headline metrics and essential context; branch to deeper calculations, factors and attributes rather than displaying all at once. Denser screens are allowed only where simultaneous comparison or management has clear utility (inventory, comparisons, specialized analysis).
- Locked artwork desaturated, with understandable status and requirements; inspection remains available. Disabled action reason visible as previously specified. Count indicators for real countable outstanding items, dots for general updates, rare warm gradient illumination for exceptional events. No perpetual competing glows.

### Next phase: real screen mockups

Prototype the Bro/character landing screen first, then Universal Menu and representative deeper screens and workspaces. Use actual screenshot proportions, actual game data where known, and actual art assets. The first static screenshot composition uses the existing gameplay screenshot as its background and cropped existing icons; small screenshot crops are low-resolution placeholders until original transparent source sprites are retrieved. Do not treat prototype geometry, typography, exact colors or crop quality as approved production assets. Do not change the gameplay controls or viewport merely to accommodate menu design.

Validate against actual mobile layout constraints and safe areas, navigation history, full-size touch targets, keyboard/accessibility where relevant, long names/labels, rarity/selection states, readable text contrast, and the child-discoverability benchmark. Audit repository component structure and actual asset paths before implementation. No implementation until the owner approves production visual direction and screen mockups.

## 17. The owner's suggestions of 2026-11-26 (kept whole as `UI_FEEDBACK_2026-11-26.md`)

The owner's six parts and priorities of 2026-11-26 are NOT copied here: like the master specification, they are kept whole, word for word, as their own file, `docs/design/UI_FEEDBACK_2026-11-26.md` (added v2.3.6780). Their lines are part 13's last block; the build's order is card UI3 (`docs/plan/cards/UI3.md`). Their closing words, the rule for the whole pass: *"the upper HUD tells you who you are and how you're progressing, while the bottom dashboard lets you manage your character. Those two areas shouldn't unnecessarily repeat each other's information."*
