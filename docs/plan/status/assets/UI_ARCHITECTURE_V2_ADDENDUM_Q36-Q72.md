# BroTown — UI Architecture Handoff Addendum

**Date:** November 25, 2026  
**Previous baseline:** `BroTown_UI_Architecture_Handoff.md` (through Question 35)  
**This update:** Decisions after Q35 through Q72 inclusive  
**Audience:** Claude Code / BroTown repository implementation agent  
**Phase:** Architecture and interaction design; not final visual assets or authorization to implement new gameplay mechanics.

## 1. How to use this update

This is an incremental addendum, not a replacement specification. Preserve all non-conflicting decisions in the original handoff. Where this addendum resolves an earlier open question or revises a prior proposal, use the newer decision. Merge the requirements into the repository's existing UI architecture specification (suggested location if none exists: `docs/design/UI_ARCHITECTURE_V2.md`). Retain the original decision history and clearly distinguish confirmed architecture, planned gameplay, and implementation details still open.

The original baseline was inspected before producing this addendum. The repository itself has not been audited for this update. All numerical examples, names, colors, icon shapes, layouts and map geometry in discussion wireframes were illustrative unless specifically identified as game rules. Do not copy them as production data. The owner's unassisted child task-completion benchmark and fixed mobile dashboard height remain governing constraints.

## 2. Shared navigation and interaction refinements (after Q35)

### 2.1 Navigation and context

- **Universal Menu shortcut:** Deep screens must provide a reliable persistent route to the universal directory in addition to their labeled Back control and Close. Menu shortcut jumps to the directory root; ordinary entry to the Menu workspace from gameplay resumes its last state. Gear remains independently remembered. Back follows the actual navigation history and restores context, including originating list position or selected item. Close returns to gameplay without resetting the workspace.
- **Ownership context (Q46):** Explicitly identify another player's character or possessions when inspecting them, including deep screens. Self is the implicit default; do not clutter self-inspection with repetitive ownership labels. Public inspection uses the same components and factual information as owner inspection; ownership affects available management actions and private data access.
- **Spatial consistency (Q48):** Use predictable screen zones: contextual header; identity/context; primary summary; secondary information and deeper destinations; contextual actions at bottom. Flexible proportions within an invisible modular grid. Empty/unneeded zones collapse and useful content reclaims the space. Specialized workspaces such as Gear may depart from the generic layout where necessary.
- **Scrolling:** Avoid scrolling as a means of discovering primary actions, essential facts or primary destinations. Categorize large collections first, then allow intentional bounded scrolling within the collection where appropriate (inventory explicitly scrolls). Do not expand the dashboard into gameplay. Pagination is not the default and an exact fallback for oversized collections is not finalized.
- **Empty and locked states:** Keep meaningful destinations accessible even when there is no owned content or the feature is locked; stable locations and informative empty states explain what is absent, why, and how to obtain/unlock it if applicable. Respect actual availability and permissions; never present unsupported future features as already playable.

### 2.2 Drill-down animation (Q47)

The owner prefers a selected window/container visually **expanding into the next menu**, not a horizontal slide. Returning contracts the detail view toward its originating container. This expresses the parent/child relationship and applies to destinations, metric breakdowns, entities, items and social clusters where feasible. Only dashboard content transitions; the world and dashboard height stay fixed. Suggested duration ~200–250 ms, not a locked requirement. Non-hierarchical workspace/root changes need not imply expansion from an unrelated object. Provide a safe fallback for contextual deep links with no visible origin and honor reduced-motion preferences (implementation proposals). Avoid delayed input, interrupted gameplay, layout thrash or heavy animation work.

### 2.3 Contextual actions and notifications

- Distinguish static information surfaces, interactive destination containers and action controls. Put relevant actions in a separate bottom zone; reclaim the zone if no actions apply. Preserve predictable positions for common actions. The owner liked the distinction of light action buttons in neutral mockups, but exact colors remain visual-phase decisions.
- Confirm consequential, costly or irreversible actions; routine reversible operations can execute immediately with feedback. Preserve the existing attribute allocation preview/confirmation flow.
- Centralize notifications: temporary interactive toasts plus a persistent notification center. Tap a notification to reach the actual relevant destination, not a duplicated screen. Do not forcibly interrupt gameplay. Keep actionable notifications pending until resolved, while informational notifications can be dismissed. Exact notification placement and event rules depend on existing capabilities.

## 3. Reusable comparison, statistics and progression components

### 3.1 Transformation comparison (Q49 — B)

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

### 3.2 Branching statistical hierarchy (Q50 — C)

Headline statistics expand into a tree of contributing factors. Show **one layer at a time**: root value prominently, immediate contributing factors as selectable branches, then deeper factors and finally actual calculations or source information. Do not expose an enormous entire tree by default.

```text
                  DPS
         /         |         \
 Average damage  Attack rate  Critical effects
       ↓              ↓             ↓
 Weapon / power   Base / speed  Chance / multiplier
```

This is a conceptual tree, not the real combat formula. Actual branches, operators, and displayed intermediate values must match the game's calculation pipeline. A contribution is not necessarily additive. Where useful, link to equipment or invested attributes. Reuse the pattern for EHP, movement speed, critical chance, AP and other derived stats. Preserve contextual Back and owner/read-only distinctions.

### 3.3 Skill progression (Q51 hybrid A+C; Q52 A)

A dedicated skill screen presents current level, XP progress (current/required and next-level proximity), and a compact milestone roadmap **on the same screen**. Meaningful unlocks, not arbitrary intervals, occupy milestone nodes. Selecting a milestone reveals the actual requirement and benefit. Current benefits and the full roadmap remain accessible.

Reveal all skill unlocks in the complete roadmap, including future rewards. Players should be able to deliberately plan their long-term skill progression. Categorize or drill down for large roadmaps while maintaining the dashboard height. Quests intentionally differ: their future steps remain hidden and open-ended as in the original handoff.

Apply reusable progression components to combat and noncombat skills where supported; integrate them with the already-approved combat performance and attribute preview screens rather than removing existing functionality.

## 4. Character inspection refinements

### 4.1 Life Skills (Q58 hybrid A+B+C+D)

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

### 4.2 Dynamic character identity (Q59 C; Q60 A)

Automatically describe a player's specialization for **both combat and life skills**, based on actual development. Examples: Sword Specialist, Mining Specialist, Jack of All Trades. These are descriptive, dynamic labels, not earned titles, fixed classes, bonuses, or restrictions.

Place two compact identity labels directly beneath the player identity (portrait/name/equipped title/combat level/AP). Keep earned titles visually distinct. Full radar profiles live within Combat and Life Skills rather than cluttering the main character screen. Same identity for self and other-player inspection. Classification thresholds, ties, beginner handling and radar axis normalization remain to be defined with the owner; do not invent balance changes or misleading labels.

### 4.3 Accomplishments (Q53 B)

AP (Achievement Points) is the dominant headline of Accomplishments, with a drill-down into its actual sources. Below, provide destinations for Achievements, Titles, Quest History, Lifetime Records and Discoveries (subject to actual supported data). Do not assume all these categories award AP; use the actual achievement model. Maintain the original consolidation and reuse existing records/quest data.

#### Achievements (Q54 E; Q55 A)

- Organize achievements by **medal difficulty/prestige tiers** (Gold, Silver, Bronze were illustrative). Tier overview shows recognizable medals and counts, with AP as context. Selecting a tier expands into its collectible medal gallery.
- Individual medal gallery emphasizes distinctive medal art and title, not progress bars. Earned medals have their full appearance; unearned medals are muted but inspectable. Use non-color state cues. Selecting an individual medal opens its actual requirements, progress, AP value and relevant details.
- Exact medal tier definitions and mapping to existing achievements remain open. If not currently supported, this is a UI direction requiring an explicit data/mechanics decision before adding a new grading system. Do not silently alter achievement requirements or AP values.

#### Titles (Q56 hybrid D+G)

- Make both title name and concise **earning requirement visible at a glance**, with clear earned/locked/equipped status.
- Group titles with real sequential prerequisites into progression families (e.g. monster-kill milestones), using a connected roadmap. Standalone titles appear as concise rows with their own requirements; never fabricate a progression relation.
- Current equipped title and how it was earned are prominent on Titles home. Larger title families/collections are categorized to fit fixed height.
- Selecting a title reveals exact requirements and progress, with an Equip action for unlocked titles on self only. Inspecting other players preserves the public information and removes edit authority.

#### Lifetime Records (Q57 A)

Landing page is a **career highlights** overview: a few meaningful lifetime statistics (e.g. kills, gold earned, resources gathered, time played if tracked). An All Lifetime Records destination provides detailed statistics, categorized as needed. Exact headline records and units depend on actual tracked data. Do not invent retroactive tracking.

### 4.4 Pets (Q61 A)

Active companion dominates the overview, with actual appearance, identity and relevant supported stats. Secondary destinations: Owned Pets and All Pets. All Pets should reuse the Codex pet collection when available, not duplicate encyclopedia data. No active companion produces an informative empty state. Owner management and other-player inspection use the same underlying components with permissions. Pet leveling/XP, sample species and stats shown in prior wireframes were examples, not confirmed mechanics. Unequipped pets living on the farm are a planned Homestead mechanic (see section 6).

## 5. Social — living relationship network (Q62–65)

### 5.1 Approved home design: modified F3 + Hybrid 3 navigation (Q62–63)

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

### 5.2 Inside a circle (Q64 C)

Prioritize an online character gallery of actual player appearances. Provide access to the entire online collection, offline directory where applicable, and contextual group management/requests. Do not force a single layout on groups where offline membership is meaningless (e.g. Nearby); use the same structural principles with actual supported semantics. Lists/collections remain bounded and categorized. Selecting a player opens the universal inspector.

### 5.3 Social actions (Q65 A)

Dedicated action bar at bottom of other-player inspection, with common social actions directly available in predictable positions (examples Message, Add Friend, Invite). Do not hide all social functions behind an additional destination or dynamically shuffle the action bar as a default. Adapt availability/labels to actual relationship state and permissions while preserving spatial predictability. Exact actions, restrictions, secondary placement, clan management and communication flows still require audit. No new party, messaging, moderation or clan mechanics are authorized by sample wireframes.

## 6. Homestead — actual estate visualization (Q66–70)

### 6.1 Owner-provided gameplay direction (important distinction)

Farming is still early in development. The following are the owner's **planned** gameplay capabilities, not assertions that they already exist:

- Purchase additional farmland to expand the estate.
- Build a customized farmhouse within modular design constraints.
- Furnish the farmhouse using woodworking-crafted furniture or furnishings purchased from other players.
- Unequipped pets live on the farm.
- **Current storage is at the bank.** Moving storage to the farm is only a possible future change. Do not create a farm storage building or assume livestock, production systems or other features from exploratory mockups.

### 6.2 Estate overview and navigation (Q66 B; Q67 B; Q68 C+B)

Use an interactive miniature of the actual property, reflecting the real arrangement, land ownership, buildings, crops and pets as supported. It is not a fixed generic representation of unrelated management functions.

- Estate-wide overview presents owned plots and meaningful property areas. Actual buildings and plots are destinations. Selecting one expands into the appropriate detail or management view.
- Combine expandable plot-level detail with optional pan and zoom so large properties stay explorable without permanently shrinking all touch targets or forcing every player to pan before finding core destinations.
- Land expansions reflect actual purchasable neighboring land, if supported. The land grid, expansion rules and prices are not defined by the UI design. Do not hardcode sample plots.
- Reuse actual world art and property state where feasible. Pets can appear on the miniature when unequipped once this mechanic exists; animation is a proposed presentation detail. Maintain visual and textual identification of meaningful destinations. No arbitrary Homestead level or progress percentage was approved.
- Keep Homestead independent of Life Skills; farming/woodworking skill screens remain progression views. Cross-link meaningful related subjects without duplication.

### 6.3 Farmhouse (Q69 accepted B+C, A for construction)

Three complementary views:
1. **Exterior:** actual customized farmhouse in the estate miniature.
2. **Interior:** selecting the house expands/reveals a roofless cutaway using the game's three-quarter perspective; show actual rooms and furniture.
3. **Construction:** an overhead floor-plan view for modular building and furniture placement, accessible through a clearly separated owner editing action.

Construction constraints, room modules, placement rules, inventory/crafting/economy and editing workflow remain future gameplay design. Do not implement invented room types or building systems in the UI refactor. When these mechanics exist, the miniature and editor should read the same authoritative property state.

### 6.4 Other-player homesteads (Q70 A+B)

Make a player's property inspectable through their character profile using the same estate/house representation, read-only for other viewers. The owner also approved the **planned capability** to physically visit other players' properties, subject to actual access permissions. A Visit Homestead action should appear when supported and permitted. Do not invent teleportation, instancing, visitor permissions or a public estate directory. The universal character inspector will need a Homestead cross-link; exact placement alongside existing destinations remains to be validated within the fixed height.

## 7. World Map (Q71 hybrid C+B; Q72 C)

### 7.1 Two complementary world views

- **Geography:** miniature of the actual terrain and geographic relationship of regions; supports contextual markers, overlays and selecting regions.
- **Connections:** simplified graph of actual traversable region connections. This is intended to make route topology easy to follow, not a fictional hub-and-spoke arrangement. Geography shows where places are; Connections shows how regions connect.
- Both views share world data and contextual destinations. Provide an obvious labeled way to switch views (the prototype used a segmented control; exact affordance is not a final styling decision). Reuse world location/route data, not hand-authored illustrative links. A clear current-player position or current region and meaningful navigation targets should be legible.
- World overview → select region → expanded local map. Pan and zoom are recommended where needed, following the same broad global-to-granular navigation used for estates. Do not introduce new fast-travel, route-finding, tracking or visibility mechanics merely because a mockup included markers.

### 7.2 Local region map: interactive map with region intelligence (Q72 C)

```text
[ < World Map       Region Name        ]
[ Actual terrain + selected map marks  ]
[ Monsters ] [ Resources ] [ NPCs      ]
[ Dungeons ] [ Quests    ] [ Locations ]
```

Combine actual local geography with a glanceable summary of what the region contains. Use recognizable category destinations with meaningful counts when supported. Selecting a category should highlight its relevant map locations or open its corresponding region-filtered directory; exact behavior for each category is not finalized. A marker can lead to the same reusable entity inspector or relevant quest/location screen. Preserve region and map state when returning.

Quests, Players, Resources and Places were example world overlay categories; Monsters, Resources, NPCs, Dungeons, Quests and Locations were example local categories. Use actual available data and access rules. Do not disclose hidden player locations, spoil future quest steps, or show non-existent landmarks. Real map topology, region labels, coordinates and route connectivity must come from the repo. All conversational map graphics were illustrative only.

## 8. Remaining questions and implementation boundaries

The owner has answered Q72 with option C (local interactive terrain map + region intelligence). Resume at Q73, one architecture question at a time, or consolidate remaining architecture questions before final visual work. Do not reopen approved choices unless the code audit reveals a conflict.

Open items include:
- Exact fixed-height screen measurements and mobile fit for every proposed view (wireframes were conceptual, not pixel-perfect viewport tests), final universal directory labels/order and quick Gear/root affordances, Settings layout, precise Codex/ranking/filter/search categories.
- Gear geometry, item-type comparison metrics, EHP assumptions, formula trees and authoritative calculation wiring; existing attribute preview integration.
- Actual life skill list/caps, radar scaling and identity thresholds, AP sources, medal prestige tiers and title progression families; proposed combined-level rankings.
- Presence sampling/online updates, supported relationship functions and actions, privacy/access rules and Social performance budget.
- Homestead future mechanics and access; distinguish implemented farming from planned expansion/building/furnishing/pets/visits. Keep bank storage unchanged.
- Real world map topology and marker visibility; how each region category opens filtered details versus highlights map markers; exact zoom controls.
- Final icon/art/font/palette/bevel/shine/spacing and detailed animation specifications. Do not treat wireframe colors or example shapes as final assets.

## 9. Additional acceptance tests (proposed, not yet run)

At the existing portrait mobile dashboard height, without explanatory instructions:
- Open a nested DPS factor and follow the branching relationship to its actual calculation. Go Back to the original context; compare an item against current equipment and correctly describe a benefit and a tradeoff.
- Compare another player with yourself without confusing the comparison for an equip action. Inspect the same item from Gear/Codex/another player's equipment and verify facts match.
- Find combined life skill level, the highest skill, the next level's XP progress, and a distant future unlock. Distinguish the dynamic specialization label from an earned equipped title.
- Find an earned gold-tier achievement, inspect an unearned medal's requirement, discover how a title was earned, and equip an unlocked title as the owner only. Find a lifetime record and the active pet.
- From the living Social network, identify Friends, open online gallery, inspect a player and access a supported social action. Return to the same context. Confirm empty groups stay discoverable and large groups do not overcrowd the dashboard.
- When Homestead features become available, inspect actual estate/plot/house, reveal the interior, distinguish view from edit, and test pan/zoom plus access-controlled visits. Existing farm and bank functionality must continue working before those features ship.
- Switch between geographic and connection maps, identify an actual route/region, open a local category and a relevant entity, then return without losing map state. Verify map topology and visibility rules against real game data.
- Verify touch targets, text readability, no overlaps, no primary controls hidden behind scrolling, no dashboard height increase, and responsive animations on actual supported devices. Test empty/loading/error states and contextual permissions.

## 10. Copy-ready prompt to Claude Code

> Read this addendum together with the previously supplied BroTown UI Architecture Handoff (through Q35). Merge only the new or superseding decisions into the existing repository architecture specification; do not replace the earlier baseline or restart the redesign. Update resolved open items and preserve remaining questions. Distinguish confirmed owner decisions, illustrative examples, implementation proposals and planned gameplay mechanics. Audit the actual repo before mapping these requirements to components, data, routes and existing permissions. Preserve the fixed mobile dashboard height, existing gameplay behavior, authoritative combat calculations and allocation preview. In particular, do not implement future Homestead mechanics or move bank storage as part of the UI redesign. Report any conflicts and unresolved technical decisions. Save the updated architecture spec and decision log; do not begin final art polish or large-scale implementation solely because this addendum was provided. The current decision checkpoint is Q72 completed.
