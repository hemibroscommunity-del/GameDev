# BroTown — UI Architecture & Redesign Handoff

> **How the parts of this document rank (added in the repository, v2.3.6402; not the owner's words).** Parts 1 to 12 are the owner's baseline (through question 35), word for word. Part 14 is the owner's addendum of the same day (questions 36 to 72), word for word. Where the two differ, **the addendum wins**. Part 13, the decision log, says in one dated line each which line of the baseline the addendum settles or changes; **a later line of the log wins over both**. Three kinds of thing are kept apart everywhere: what the owner CONFIRMED (a requirement), what the addendum calls PLANNED gameplay (not in the game; never built for a screen), and what is still OPEN (a question, never a guess). What the game does today is in `UI_ARCHITECTURE_V2_AUDIT.md`; the phases and the open questions are in `UI_ARCHITECTURE_V2_PLAN.md`.

> **This document keeps growing, and nothing in it is lost.** The owner, 2026-11-25, with the addendum: *"Maintain a comprehensive, persistent specification that we can continue updating without losing any prior decisions"*; *"Do not begin implementation or final visual redesign yet. We are still completing the architectural design process."* So the NEXT addendum (question 73 on) is added the same way: its own new part at the end, word for word, its headings one level down; one dated line in part 13 for each line of an earlier part it settles or changes; and the table below brought up to date. No earlier part is ever edited.

## 0. The status of every decision (the repository's index, v2.3.6402; not the owner's words)

A finder, true to parts 1 to 12 and part 14 and no more: where the two documents and this table differ, the documents hold. **Approved architecture** is the owner's decision. **Planned gameplay** is what the owner says is NOT in the game yet: no screen's work builds it. **Open** is the owner's still to decide. The design's checkpoint: question 72 answered; it resumes at question 73. What the game does today is not in this table: it is the audit's.

| Area | APPROVED ARCHITECTURE (where) | PLANNED GAMEPLAY | OPEN |
|---|---|---|---|
| The mandate | Clarity first, by the child's unassisted task; the band's height fixed; phone first; destinations with a word and a picture; summary first, detail by a tap; a labelled Back, no second tab bar; an invisible modular grid (part 1; question 35) | none | every view's exact measures (part 11; 14 §8) |
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
| Codex | A complete encyclopedia by type of thing, not gated by discovery; one inspector a type, whatever the way in (part 7) | none | the supported categories, filters, search |
| Social | Its own destination; a living network: you in the middle, Friends, Clan, Party, Nearby in fixed places, no Guild circle; a circle opens its gallery, a player opens the inspection; a bottom bar of social actions on another player (part 8; 14 §5; questions 62 to 65) | no new party, messaging, moderation or clan mechanic is authorised | presence and sampling; the supported actions; privacy; the performance budget |
| Homestead | Its own destination, apart from Life Skills; a miniature of the REAL property; the farmhouse in three views; another player's property read-only through their profile (part 8; 14 §6; questions 66 to 70) | buying more farmland; building a customised farmhouse; furnishing it; visiting another's property (and pets on the farm, above). Storage stays at the bank | the land's grid, rules and prices; construction; access and permissions |
| World Map | Two views of one world, Geography and Connections, with a labelled switch; world, then region, then the region's own map with what it holds (14 §7; questions 71, 72) | none (no fast travel, route finding or tracking is to be added) | the real topology and what may be seen; how each category opens; zoom controls; the Map's place in the directory |
| Settings | A candidate destination (part 2) | none | its layout |
| The visual system | Deferred by the owner until the architecture is reviewed (parts 1, 11; 14 §8) | none | all of it |
| How to carry it out | Not decided: part 9's sequence is the assistant's proposal, and the acceptance tests of part 10 and 14 §9 are proposed, not run. The owner, 2026-11-25: no implementation begins yet | none | when the design is complete |

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
