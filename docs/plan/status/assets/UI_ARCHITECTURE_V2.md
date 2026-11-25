# BroTown — UI Architecture & Redesign Handoff

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
