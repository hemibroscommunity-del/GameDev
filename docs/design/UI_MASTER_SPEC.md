# BroTown — UI Redesign: Master Implementation Specification

**Version:** 1.0 · November 25, 2026  
**Audience:** Claude Code / BroTown repository implementation agent  
**Status:** Owner approved proceeding to implementation; architecture and general visual direction established. Exact screens are intentionally not locked.

## Start here — owner mandate

Implement the new UI incrementally in the actual game. This document consolidates the Q1–108 design decisions and subsequent refinements into a single implementation baseline. It supersedes the prior incremental handoffs where they conflict. **Do not wait for pixel-perfect approval of every menu or restart the questionnaire.** Use the three accompanying images as visual references, not assets or rigid placement specifications. Make sensible decisions about exact layout, dimensions, responsive behavior and component composition within the requirements below. Review real in-game screenshots rather than iterating hypothetical mockups.

### Non-negotiable requirements

- Keep the existing mobile dashboard height, gameplay viewport, safe areas and existing gameplay controls. Mobile-first; desktop adapts. Never hide primary actions behind scrolling or enlarge the dashboard to fit a mockup.
- Completely retire the old CLOSE / Gear / Bro / Quests / Codex / More persistent tab strip. Use independently remembered Gear and Menu workspaces, a universal directory, one contextual header and actual-history navigation. Deep screens have labeled Back, title, Menu and Close; no duplicate secondary global nav.
- Use the premium metallic blue-slate (Lantern Slate) direction: smooth rounded geometry, controlled depth, restrained gold on the outer frame, consistent readable ivory text on dark navigation surfaces. Use dark labels consistently on light semantic action buttons. Contrast matters more than ornamentation.
- **All UI chrome is code-rendered:** gradients, bevels, reflections/shine, shadows, border trim, text, progress bars, action and selection states. Do not slice the reference mockups into button backgrounds or bake lighting into artwork. Use existing transparent pixel-art icons, portraits, sprites and illustrations. Create only genuinely missing unique artwork after an asset audit.
- Clear information hierarchy, modular implicit alignment, no arbitrary floating text, no heavy grid lines. Recessed information and raised interactive destinations must look and behave differently. Support progressive disclosure and contextual actions.
- Preserve server-authoritative gameplay, existing mechanics, game data, calculations and allocation preview. Do not implement future features or invent mechanics based on examples. Identify conflicts and request decisions only for material gameplay/architecture gaps; ordinary visual details are delegated.

### Latest decisions overriding older handoffs

| Topic | Current ruling |
|---|---|
| Bro landing | Six buttons only under contextual header. Character, Combat, Equipment / Life Skills, **Feats**, Pets. Remove the redundant player/tap banner. |
| Character | RPG passport; large portrait and adjacent combat level, name/title, supporting summaries. Not a combat-stat dump. |
| Visual target | Newer Character reference sets the premium blue-metal feel; Bro should match. Moderate excessive gold, glare, dark bevels and heavy text shadows. |
| Implementation | Proceed now; no per-menu image approval gate. Mockups are flexible inspiration and not exact element specifications. |
| Art vs chrome | Unique game artwork only as image assets; all physical UI styling and interactive states generated in code. |
| Combat | Three independent weapon channels plus shared attributes. Dedicated weapon screen with level/XP, DPS, supporting stats and six attributes. Shared points/EHP belong to shared screen. Existing allocation preview opens on selection, not a permanent panel. |

### Reference pack (use with this document)

- `references/01-character-visual-benchmark.png`: preferred material feel, readable serif, identity hierarchy and close portrait/level grouping. Do not copy thick gold rim, oversized text shadows, all information panels as raised buttons, or exact numbers/art.
- `references/02-bro-destinations.png`: correct six-button structure, **Feats** label, no banner, one contextual header. Treat highlights and icons as illustrative; render surfaces in code.
- `references/03-combat-hub.png`: correct four-channel conceptual structure, independent weapon levels/XP and point pools. Finish is less polished than reference 01; use the shared material system rather than copying it.

These are dashboard-only crops, not proof of real mobile fit. Every screenshot number and illustrative icon is a placeholder. The rejected brown menus, obsolete tab-strip renders, and Sword renders with permanent allocation previews are intentionally excluded.



## 1. Core experience and navigation

Clarity is the highest priority. The usability benchmark is to hand a phone to a child, give them a specific task, and see whether they can find the correct screen and complete the task without any additional instruction. Do not optimize aesthetics at the expense of discoverability.

- Keep the existing mobile dashboard height. Do not enlarge it into the gameplay viewport. Respect existing safe areas and gameplay controls.
- Mobile-first: design for a small portrait phone, with desktop adapting to the same conceptual architecture.
- The long-term visual style is polished arcade RPG: sharp, tactile, beveled, selectively shiny, legible, high contrast. Avoid a washed-out matte-gray look, but also avoid ornate frames, excessive shine, clashing colored outlines, and visual noise.
- Use destinations first for exploration screens. A destination has a short subject label and a distinctive recognizable icon. Action labels belong inside destinations. Do not use unlabeled dots, tiny carats, hidden swipes, or sequential cycling as primary navigation.
- Apply global-to-granular disclosure: show the essential summary first; allow a tap to reveal contributing factors, then further detail or calculation mechanics. Do not flatten the entire game model onto one page.
- Use dedicated destination views and an explicit back control instead of persistent secondary tab bars.
- Information must not float arbitrarily. Use pills, grouped surfaces, aligned cells and an invisible modular grid. Containers can span multiple units, with larger units for more important information. Avoid heavy grid lines or an individually outlined box around every number. Recessed/quiet surfaces communicate static information; raised/tactile controls communicate actions. Drill-down statistics should clearly indicate their interactivity.
- All illustrative numbers, item names, icons, colors and dimensions from conversational wireframes are placeholders, not production data or styling specifications.

### 1.1 Two workspaces

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
[< Combat]     Sword     [Menu] [X]
+-------------------------------+
| Relevant content only         |
+-------------------------------+
```

Confirmed rules:
- Contextual single header, not an always-visible global bar plus a second row. Header communicates current location and provides an obvious labeled Back control and close affordance.
- Gear and Menu have independent remembered states. Gear opens the Gear workspace; Menu resumes the previous exploration destination. Closing temporarily hides the dashboard without resetting either workspace.
- Back follows the actual navigation history (the player's journey), not necessarily the canonical category tree. Close returns to gameplay. Preserve scroll, selections and relevant context on returning from drill-downs.
- Contextual entrances open the same reusable destination as the menu route: tapping another player → inspection; quest HUD → current quest; minimap → map; item → item inspection; level-up → relevant skill; clan name → clan profile; leaderboard player → player inspection. These are examples of the approved pattern, not confirmation that every shortcut is already implemented.
- Keep a reliable, obvious route to Gear and the universal directory even from a resumed deep view. The Menu shortcut on a deep view opens the directory root; ordinary Menu workspace entry resumes its prior state. Preserve an obvious Gear return. Exact reopen controls are delegated to implementation; never restore persistent global tabs.

### 1.2 Navigation, interactions, notifications

#### 1.2.1 Navigation and context

- **Universal Menu shortcut:** Deep screens must provide a reliable persistent route to the universal directory in addition to their labeled Back control and Close. Menu shortcut jumps to the directory root; ordinary entry to the Menu workspace from gameplay resumes its last state. Gear remains independently remembered. Back follows the actual navigation history and restores context, including originating list position or selected item. Close returns to gameplay without resetting the workspace.
- **Ownership context (Q46):** Explicitly identify another player's character or possessions when inspecting them, including deep screens. Self is the implicit default; do not clutter self-inspection with repetitive ownership labels. Public inspection uses the same components and factual information as owner inspection; ownership affects available management actions and private data access.
- **Spatial consistency (Q48):** Use predictable screen zones: contextual header; identity/context; primary summary; secondary information and deeper destinations; contextual actions at bottom. Flexible proportions within an invisible modular grid. Empty/unneeded zones collapse and useful content reclaims the space. Specialized workspaces such as Gear may depart from the generic layout where necessary.
- **Scrolling:** Avoid scrolling as a means of discovering primary actions, essential facts or primary destinations. Categorize large collections first, then allow intentional bounded scrolling within the collection where appropriate (inventory explicitly scrolls). Do not expand the dashboard into gameplay. Pagination is not the default and an exact fallback for oversized collections is not finalized.
- **Empty and locked states:** Keep meaningful destinations accessible even when there is no owned content or the feature is locked; stable locations and informative empty states explain what is absent, why, and how to obtain/unlock it if applicable. Respect actual availability and permissions; never present unsupported future features as already playable.

#### 1.2.2 Drill-down animation (Q47)

The owner prefers a selected window/container visually **expanding into the next menu**, not a horizontal slide. Returning contracts the detail view toward its originating container. This expresses the parent/child relationship and applies to destinations, metric breakdowns, entities, items and social clusters where feasible. Only dashboard content transitions; the world and dashboard height stay fixed. Suggested duration ~200–250 ms, not a locked requirement. Non-hierarchical workspace/root changes need not imply expansion from an unrelated object. Provide a safe fallback for contextual deep links with no visible origin and honor reduced-motion preferences (implementation proposals). Avoid delayed input, interrupted gameplay, layout thrash or heavy animation work.

#### 1.2.3 Contextual actions and notifications

- Distinguish static information surfaces, interactive destination containers and action controls. Put relevant actions in a separate bottom zone; reclaim the zone if no actions apply. Preserve predictable positions for common actions. The owner liked the distinction of light action buttons in neutral mockups, but use the semantic action palette in this specification.
- Confirm consequential, costly or irreversible actions; routine reversible operations can execute immediately with feedback. Preserve the existing attribute allocation preview/confirmation flow.
- Centralize notifications: temporary interactive toasts plus a persistent notification center. Tap a notification to reach the actual relevant destination, not a duplicated screen. Do not forcibly interrupt gameplay. Keep actionable notifications pending until resolved, while informational notifications can be dismissed. Exact notification placement and event rules depend on existing capabilities.

## 2. Visual system and runtime implementation

- Use the existing Lantern Slate identity, not a new brown/wood, generic fantasy, or black-and-gold theme. The newer Character reference shifts toward a richer metallic blue-slate. Earlier illustrative palette references (not mandatory final colors) include slate #26383E, panel #1E2E34, raised #293B41, recessed #111E23, deep #0B161B, brass #D8AA58, highlight #EAC675, light text #F4F0E7. These are working references, not a verified audit of repository tokens.
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

### 2.1 Code-first component contract

Implement a centralized token layer for surface colors, semantic action colors, typography, spacing, radii, bevel depth, shadow, reflection intensity, border thickness, focus and motion. Derive all states from these tokens rather than repeating local styles. Prefer CSS gradients, borders, inset/drop shadows and restrained pseudo-element highlights for DOM UI; if existing UI uses PixiJS, implement equivalent shared rendering primitives appropriate to the actual renderer. Avoid per-frame expensive filters, excessive animated glints or oversized textures. Keep shine adjustable or disableable. Static/interactive distinction must hold even with motion/shine off. Use existing font assets where appropriate and test licensing and readability before selecting another. Exact token values and typography are delegated, not hardcoded from screenshots.

Recommended reusable primitives: dashboard frame, contextual header, destination tile, recessed info group, stat headline/drill-down, action button, rarity slot, progress indicator, badge, entity card, comparison, collection, inspector and transaction state. Provide a simple component preview/test fixture for default, pressed, selected, focused, disabled, loading and rarity states. Verify text contrast across the full gradient and every state.

## 3. Shared comparison, statistics and progression

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

## 4. Bro — player inspection

Use the same structure for oneself and another player. Bro opens the self version; inspecting a player in the world or on a leaderboard opens the other-player version. The layout and public character information remain consistent. Only ownership-specific actions differ.

**Complete transparency is confirmed:** other players may inspect weapon levels, equipment, actual combat stats and invested attributes. This does not grant authority to modify other players' data, nor access to their private inventory, account details or unspent-point allocation controls.

```text
[< Back]           Bro       [Menu] [X]
+------------+------------+------------+
| CHARACTER  |   COMBAT   | EQUIPMENT  |
|            |            |            |
+------------+------------+------------+
| LIFE SKILLS|    FEATS   |    PETS    |
+------------+------------+------------+
```

Six destination buttons in a 3-column × 2-row grid: Character, Combat, Equipment / Life Skills, Feats, Pets. The current approved reference uses equal-sized tiles; exact dimensions and proportions are delegated to implementation. Use recognizable icons and these short destination names; Feats is the approved replacement for Accomplishments. No player portrait or tap banner above the Bro landing grid. For another player, identify the inspected owner in the header or a compact contextual label without adding a large banner. Place full identity on Character.

### 4.1 Character — identity first

A personal identity card / RPG passport, not a stats dashboard. Prominent portrait, name, equipped title and combat level. Supporting content: Sword, Bow, Staff levels; clan and guild affiliations; achievement points; quest completion count; titles and other relevant lifetime summary information. Link to the detailed destinations rather than duplicating all their content. Clan and guild names should lead to their respective profiles where available. Owner can change title via the appropriate title component; other viewers cannot. Use a prominent portrait with combat level immediately adjacent; exact placement and dimensions are delegated to implementation.

Automatically describe a player's specialization for **both combat and life skills**, based on actual development. Examples: Sword Specialist, Mining Specialist, Jack of All Trades. These are descriptive, dynamic labels, not earned titles, fixed classes, bonuses, or restrictions.

Place two compact identity labels directly beneath the player identity (portrait/name/equipped title/combat level/AP). Keep earned titles visually distinct. Full radar profiles live within Combat and Life Skills rather than cluttering the main character screen. Same identity for self and other-player inspection. Classification thresholds, ties, beginner handling and radar axis normalization remain to be defined with the owner; do not invent balance changes or misleading labels.

### 4.2 Combat — four progression channels

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
[< Combat]     Sword     [Menu] [X]
[Level + XP progression]
[ DPS headline ] [ supporting performance summary ]
[ All combat stats / drill-down ]
[ Attributes                   Available points ]
[ Range ] [ Power ] [ Speed ]
[ Luck  ] [Special] [Element]
```

The shared character screen owns EHP and the global point pool; keep weapon-specific screens focused on weapon performance and points. No permanent allocation preview, direct-spend plus controls, separate progression-only screen or nested tab strip. Each weapon opens a dedicated screen (not a persistent weapon selector). Return to the Combat hub to switch. Include weapon level and XP, fixed performance summary, access to all stats, and integrated weapon attributes. Attribute values should reflect actual state. Shared character screen follows the same structural pattern, using effective health as headline and shared attributes (HP, defense, MP, stamina/energy, dodge, movement, resistance; use actual names and formulas from the codebase).

- DPS is the principal offensive summary statistic. Supporting fixed statistics such as damage and attack speed must be subordinate. Tap a headline metric to see its breakdown: contributing base stats, attribute effects, gear effects, other applicable modifiers and calculation details. Link to relevant item inspection. Use authoritative existing combat calculations, not hardcoded illustrative numbers.
- Effective health (EHP) is the principal defensive summary statistic. It is an approved summary concept, **not a finalized formula**. Define and validate a reference damage model with the owner before shipping; distinguish deterministic mitigation from probabilistic dodge and element-specific resistance as appropriate. Label assumptions in the drill-down. Do not imply that a single value predicts every encounter.
- Preserve the existing attribute allocation preview system. Selecting an attribute opens the existing preview rather than replacing it with a new simple increment control. Preserve tentative allocation, before/after impact, animated combat demonstrations, detailed breakdown and confirmation behavior where implemented. Allow attribute inspection even with zero spendable points; read-only viewing when inspecting another player. Verify actual existing preview behavior in the repo rather than recreating it from wireframes.
- Point availability must clearly distinguish weapon-specific and global pools. Allocation must not accidentally spend from another channel or another player's account.

### 4.3 Equipment — character showcase

A primary inspection destination, separate from active inventory management. Show the character's appearance and equipped items without a private inventory grid. Use the same character-shaped loadout concept as Gear, and the same item inspector for all equipped items. Self-view can offer Manage Gear; other-player view is read-only. Keep the portrait/sprite legible against its background, and use actual existing character art. Sprite scale/background are implementation decisions subject to mobile readability.



### 4.4 Life Skills (Q58 hybrid A+B+C+D)

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

### 4.5 Feats (Q53 B)

AP (Achievement Points) is the dominant headline of Feats, with a drill-down into its actual sources. Below, provide destinations for Achievements, Titles, Quest History, Lifetime Records and Discoveries (subject to actual supported data). Do not assume all these categories award AP; use the actual achievement model. Maintain the original consolidation and reuse existing records/quest data.

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

### 4.6 Pets (Q61 A)

Active companion dominates the overview, with actual appearance, identity and relevant supported stats. Secondary destinations: Owned Pets and All Pets. All Pets should reuse the Codex pet collection when available, not duplicate encyclopedia data. No active companion produces an informative empty state. Owner management and other-player inspection use the same underlying components with permissions. Pet leveling/XP, sample species and stats shown in prior wireframes were examples, not confirmed mechanics. Unequipped pets living on the farm are a planned Homestead mechanic (see Homestead section).

## 5. Gear — default management workspace

The prior workspace uses inventory / character preview / equipped items, with the narrow middle column repurposed for item details. The new direction removes the permanent middle column, gives slots more space, and distinguishes stored items from worn equipment by layout shape, not color alone.

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

### 5.1 Automatic, character-first equipment comparison

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

## 6. Quests

Landing page shows **active quests first**, as direct selectable rows/destinations. No tiny dropdown or three-dot pagination. Daily quests and Completed quests are secondary destinations. Keep long lists scrollable within the dashboard.

Individual quest shows **journey first**, with completed steps and the current objective visually dominant. Current task includes relevant progress and contextual actions such as Track or Locate when supported. Future journey is open-ended: do not reveal future steps, total step count, or whole-quest completion percentage. A neutral indication that the adventure continues is sufficient for an ongoing quest. Completed quests show actual completed history. Story and Rewards are separate accessible destinations. Preserve existing quest logic and data; do not rewrite quest narratives based on wireframe examples.

```text
[< Quests]      Quest name   [Menu] [X]
[✓ Completed step]
[  CURRENT OBJECTIVE          ]
[  Clear task + task progress ]
[  Locate / Track if relevant ]
[  Adventure continues ...    ]
[ Story ]           [ Rewards ]
```

## 7. Highscores / Ranks

Mirror character inspection categories for competitive comparison: Combat, Life Skills, Feats, Equipment where valid metrics exist. Actual leaderboard categories must come from implemented rankings, not hypothetical metrics.

- Specific leaderboard is a simple aligned standings list: Rank | Player (portrait/name) | metric for this leaderboard. No unrelated combat level when ranking a different skill. Clearly label metric units/category.
- Conditional pinned personal standing only when the player's actual row is outside the visible list; no duplicate row when visible.
- Tapping a player opens universal character inspection. Back returns to the same ranking category and scroll position.
- Consistent layout across leaderboards; subdued rows, consistent spacing, avoid competing gradients and outlines. Prestige accents should not obscure legibility. Use the shared design system for award styling.

## 8. Codex and universal inspection

Codex is a **complete encyclopedia**, not a knowledge-unlock or discovery-gated system. Organize by entity type (candidate categories: Monsters, Items, Resources, NPCs, Locations, Mechanics). Region may be a filter where useful, not the primary hierarchy. Exact supported categories depend on existing content.

Use consistent inspection architecture with specialized content:
1. Contextual header and identity (what am I looking at?).
2. Essential summary (what do I need to know first?).
3. Clearly labeled deeper destinations and applicable actions.

One reusable entity inspection implementation per type, regardless of entry source: item, monster, NPC, resource, player, pet, clan/guild etc. Shared primitives and navigation conventions; not a forced identical layout. For example, a monster can emphasize stats, loot and habitat, an item performance and sources, and an NPC services and location. These sections are candidates, not new mechanics. A loot item can link to item details, a player affiliation to an organization, a statistic to its contributing entities. Back follows actual journey.

### Q73 — Illustrated collections with essential information (C)

Use illustrated entity cards, with artwork as the dominant visual and a small amount of essential information that depends on the entity type. Keep the Codex complete rather than discovery-locked, as previously approved. Region filtering and subject categorization remain part of the prior architecture. Avoid a dense database-style directory as the general collection layout.

Examples of glanceable information, where supported:
- Monsters: level and element or habitat.
- Weapons/equipment: rarity and equipment requirement.
- Resources: gathering requirement.
- NPCs: occupation and location.
- Furnishings: crafting requirement (when the feature exists).
- Pets: species and rarity.

Use real entity sprites, explicit names, and accessible tap targets. Large collections use the agreed categorization and bounded collection scrolling policy. Search was shown in wireframes; exact search placement and supported search fields are implementation details, not a new fixed requirement.

### Q74 — Illustrated entity showcase plus subject destinations (A + C)

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

### Q75 — Traditional loot directory (A)

Use a straightforward row-based loot table rather than a gallery, rarity-tier submenu or featured rare-drop landing page. Show item artwork, explicit item name, rarity and exact drop probability together. Selecting an item opens universal item inspection. No dice-roll numbers, probability progress bars or unnecessary drill-down by rarity. Allow reverse acquisition navigation (item → actual sources → location) where the game data supports it, consistent with earlier crosslink architecture.

Use the actual loot engine's semantics: distinguish individual-item probability from rarity-tier probability, conditional rolls and modifiers if present. Do not assign illustrative percentages to actual items, round very small positive probabilities to zero, or imply mutually exclusive drops unless the engine works that way.

## 9. Social — living relationship network

### 9.1 Approved home design: modified F3 + Hybrid 3 navigation (Q62–63)

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

### 9.2 Inside a circle (Q64 C)

Prioritize an online character gallery of actual player appearances. Provide access to the entire online collection, offline directory where applicable, and contextual group management/requests. Do not force a single layout on groups where offline membership is meaningless (e.g. Nearby); use the same structural principles with actual supported semantics. Lists/collections remain bounded and categorized. Selecting a player opens the universal inspector.

### 9.3 Social actions (Q65 A)

Dedicated action bar at bottom of other-player inspection, with common social actions directly available in predictable positions (examples Message, Add Friend, Invite). Do not hide all social functions behind an additional destination or dynamically shuffle the action bar as a default. Adapt availability/labels to actual relationship state and permissions while preserving spatial predictability. Exact actions, restrictions, secondary placement, clan management and communication flows still require audit. No new party, messaging, moderation or clan mechanics are authorized by sample wireframes.

## 10. Homestead — actual estate visualization

### 10.1 Owner-provided gameplay direction (important distinction)

Farming is still early in development. The following are the owner's **planned** gameplay capabilities, not assertions that they already exist:

- Purchase additional farmland to expand the estate.
- Build a customized farmhouse within modular design constraints.
- Furnish the farmhouse using woodworking-crafted furniture or furnishings purchased from other players.
- Unequipped pets live on the farm.
- **Current storage is at the bank.** Moving storage to the farm is only a possible future change. Do not create a farm storage building or assume livestock, production systems or other features from exploratory mockups.

### 10.2 Estate overview and navigation (Q66 B; Q67 B; Q68 C+B)

Use an interactive miniature of the actual property, reflecting the real arrangement, land ownership, buildings, crops and pets as supported. It is not a fixed generic representation of unrelated management functions.

- Estate-wide overview presents owned plots and meaningful property areas. Actual buildings and plots are destinations. Selecting one expands into the appropriate detail or management view.
- Combine expandable plot-level detail with optional pan and zoom so large properties stay explorable without permanently shrinking all touch targets or forcing every player to pan before finding core destinations.
- Land expansions reflect actual purchasable neighboring land, if supported. The land grid, expansion rules and prices are not defined by the UI design. Do not hardcode sample plots.
- Reuse actual world art and property state where feasible. Pets can appear on the miniature when unequipped once this mechanic exists; animation is a proposed presentation detail. Maintain visual and textual identification of meaningful destinations. No arbitrary Homestead level or progress percentage was approved.
- Keep Homestead independent of Life Skills; farming/woodworking skill screens remain progression views. Cross-link meaningful related subjects without duplication.

### 10.3 Farmhouse (Q69 accepted B+C, A for construction)

Three complementary views:
1. **Exterior:** actual customized farmhouse in the estate miniature.
2. **Interior:** selecting the house expands/reveals a roofless cutaway using the game's three-quarter perspective; show actual rooms and furniture.
3. **Construction:** an overhead floor-plan view for modular building and furniture placement, accessible through a clearly separated owner editing action.

Construction constraints, room modules, placement rules, inventory/crafting/economy and editing workflow remain future gameplay design. Do not implement invented room types or building systems in the UI refactor. When these mechanics exist, the miniature and editor should read the same authoritative property state.

### 10.4 Other-player homesteads (Q70 A+B)

Make a player's property inspectable through their character profile using the same estate/house representation, read-only for other viewers. The owner also approved the **planned capability** to physically visit other players' properties, subject to actual access permissions. A Visit Homestead action should appear when supported and permitted. Do not invent teleportation, instancing, visitor permissions or a public estate directory. The universal character inspector will need a Homestead cross-link; exact placement alongside existing destinations remains to be validated within the fixed height.

## 11. World Map

### 11.1 Two complementary world views

- **Geography:** miniature of the actual terrain and geographic relationship of regions; supports contextual markers, overlays and selecting regions.
- **Connections:** simplified graph of actual traversable region connections. This is intended to make route topology easy to follow, not a fictional hub-and-spoke arrangement. Geography shows where places are; Connections shows how regions connect.
- Both views share world data and contextual destinations. Provide an obvious labeled way to switch views (the prototype used a segmented control; exact affordance is not a final styling decision). Reuse world location/route data, not hand-authored illustrative links. A clear current-player position or current region and meaningful navigation targets should be legible.
- World overview → select region → expanded local map. Pan and zoom are recommended where needed, following the same broad global-to-granular navigation used for estates. Do not introduce new fast-travel, route-finding, tracking or visibility mechanics merely because a mockup included markers.

### 11.2 Local region map: interactive map with region intelligence (Q72 C)

```text
[ < World Map       Region Name        ]
[ Actual terrain + selected map marks  ]
[ Monsters ] [ Resources ] [ NPCs      ]
[ Dungeons ] [ Quests    ] [ Locations ]
```

Combine actual local geography with a glanceable summary of what the region contains. Use recognizable category destinations with meaningful counts when supported. Selecting a category should highlight its relevant map locations or open its corresponding region-filtered directory; exact behavior for each category is not finalized. A marker can lead to the same reusable entity inspector or relevant quest/location screen. Preserve region and map state when returning.

Quests, Players, Resources and Places were example world overlay categories; Monsters, Resources, NPCs, Dungeons, Quests and Locations were example local categories. Use actual available data and access rules. Do not disclose hidden player locations, spoil future quest steps, or show non-existent landmarks. Real map topology, region labels, coordinates and route connectivity must come from the repo. All conversational map graphics were illustrative only.

## 12. Commerce and crafting

### Q76 — Categorized storefront and dual-panel shop (D + C)

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

### Q77 — Bank: dual inventory with intelligent organization (C)

The bank remains the current storage system. Show carried inventory and bank storage simultaneously, with clear separate labels and actual capacity/occupancy if applicable. Both item grids may scroll independently inside their allocated panels. Bank contents support category filtering, stack quantities, selected-item inspection and clear Deposit/Withdraw directions. Reuse universal item inspection and the inventory-grid framework.

Bulk deposit and stack quantity transfer were illustrative possibilities; verify existing support and avoid accidentally including protected or equipped items. Never infer new storage capacities or move storage into Homestead. The same component architecture may be reused if farm storage is introduced later, but that is not approved gameplay work here.

### Q78 — Player trading: build offer, then review exchange (B first, C second)

The first screen is the offer-building workspace, NOT the final review. Show the player's inventory alongside both players' offers. Clearly distinguish whose items and currency are in each offer. Allow meaningful item inspection through the shared components.

The second screen explicitly presents **You Give** versus **You Receive**, item quantities and actual currency transfers. Where gold is exchanged, use the existing transformation comparison style: current balance → resulting balance, signed change. Clearly show the counterparty's acceptance state and a distinct final confirmation action.

Both players must confirm the same final offer. Any offer modification invalidates/reset both acceptances. These requirements must be enforced server-side, not merely represented visually. Implementation safeguards to validate during audit: use offer revision/version checks, validate ownership, quantities and available balances, reject stale confirmations, prevent duplicate submissions, reconcile both inventories and currency atomically or via the existing safe transaction mechanism. Do not claim a trade is complete before authoritative confirmation. If existing trading mechanics differ, identify the gap for review rather than silently weakening safeguards or introducing an unsupported trade system.

### Q79 — Illustrated recipes, crafting workspace and material transformation (B + C + D)

Recipe browsing uses illustrated item collections with explicit requirements and availability where known. Selecting a recipe opens a reusable dual-panel workspace: browse recipes on one side, see selected output, required materials, available quantities, crafting quantity and action on the other.

The expanded recipe view explains a visual transformation:
```
[ Materials and quantities ]  →  [ Crafted product and quantity ]
[ Quantity adjustment ]         [ Craft ]
```

Quantity changes recalculate required materials based on actual recipes. Distinguish available from required quantities and show missing requirements plainly. Do not force an additional confirmation for every routine crafting action; D is an expanded inspection view when useful. Follow earlier rules for consequential or irreversible actions and actual mechanics. Reuse across supported woodworking, blacksmithing, cooking and other crafting systems; future farmhouse furnishings are planned content, not an implementation instruction. Server remains authoritative for costs, outputs, capacity and eligibility.

## 13. NPCs and settings

### Q80 — Living NPC profile with contextual services (C + D)

Use an actual animated NPC sprite/identity showcase, name, role and a concise contextual dialogue line where available. Clearly labeled service destinations are adapted to the NPC's supported services. An NPC with only one or two services should have larger, understandable destination controls rather than empty filler slots. Examples include Shop, Crafting, Bank, Quests and Dialogue where actually provided.

The layout shares the Codex identity/showcase component; remote Codex inspection is informational, while physical NPC interaction enables actual services. Use the existing contextual NPC interaction trigger and keep in-world gameplay controls unobstructed. The example NPC names and quotes were placeholders.

### Q81 — Quick settings first (B)

Settings is an intentional exception to destination-first navigation: players commonly open it to change a known preference quickly. Expose frequently used adjustable controls directly on the landing screen (examples: music volume, sound effects volume and graphics quality, if supported). Other settings remain clearly labeled categories below, with deeper dedicated screens. Apply safe reversible settings immediately; destructive or consequential account actions follow the earlier confirmation rules. Actual available settings and defaults must be audited; do not invent controls or hardware capabilities.

## 14. Cross-cutting feedback and transaction states

### Q82 — Graduated feedback (D)

Match feedback intensity to event significance:

| Level | Example | Presentation |
|---|---|---|
| Routine | Equip item | Immediate component update and brief local acknowledgement |
| Noteworthy | Quest objective completed | Temporary contextual notification |
| Milestone | Skill level increased | Enhanced animation and sound |
| Exceptional | Godly item obtained | Memorable arcade-style reward reveal |

Examples are illustrative; map actual game events to appropriate feedback classes during implementation. Avoid making everyday actions feel like major celebrations. Do not obstruct active combat. Defer intrusive reward reveals until a safe context or player-initiated notification inspection. Maintain previously agreed notification-center behavior. Respect user sound/motion preferences, avoid excessive effects, and do not signal success until confirmed when a server mutation is involved.

### Q83 — Disabled action with immediately visible reason (A)

When requirements are not met, retain the relevant action in its predictable location in a visibly disabled state, with a short adjacent explanation. Example: `Equip Sword` disabled; `Sword level 18 — requires level 25.` Do not introduce a separate requirements checklist or force a player to drill into progression to find out why an action is unavailable. This is distinct from a complex recipe's already-required material list. If multiple reasons apply, give concise actionable reasons without obscuring the normal layout. Never rely on color alone. Preserve prior accessible empty/locked destination behavior and actual permissions. UI eligibility is not a substitute for authoritative server checks.

### Q84 — Contextual loading, transaction and connection states (D)

- Loading collections: show available information and progressive placeholders without falsely depicting an empty or fully loaded collection.
- Purchasing/crafting/other mutation: local pending indicator on the affected control, with relevant repeated/conflicting actions temporarily unavailable.
- Failure: concise explanation and safe retry when appropriate. Do not assert no currency was deducted unless authoritative state establishes this.
- Connection interrupted: clear reconnecting/offline notice; retain safe context and prevent unsupported mutations.
- Critical transaction pending: lock only affected actions wherever safe; prevent duplicate submission.
- Success: update affected components after authoritative server confirmation.

If the response is lost or transaction outcome is uncertain, show an unresolved/reconciling state rather than falsely reporting success or failure. Verify transaction status before retrying a potentially completed action. Preserve navigation where safe; do not block unrelated dashboard areas with a full overlay unless actually necessary. These are UI and integrity requirements; exact protocol/implementation depends on the repository audit.

## 15. Implementation plan and open decisions

Consistency in interaction; creativity in presentation. Use one component language with distinctive system interiors. No blind rewrite; preserve functionality and avoid duplicate data/calculations. Suggested sequence (Claude may adapt it after the audit):

1. Audit current repository, routes, UI Bible/GDD, actual dashboard dimensions/safe areas, assets, renderer, state, tests, server contracts and feature inventory. Reconcile with this baseline. Save canonical spec at existing design-doc location (suggested `docs/design/UI_ARCHITECTURE_V2.md`) and keep traceable decision notes. Do not replace unrelated gameplay specifications.
2. Implement shared design tokens, chrome and state components; prototype them at actual portrait phone dimensions. Establish component test fixtures and a migration/rollback strategy.
3. Build contextual navigation and independent Gear/Menu state. Verify Back, resume, close, deep links, state restoration and accessibility; remove legacy persistent tab bar as the replacement becomes usable.
4. Establish the Universal Menu, Bro/Character, Combat and Gear/Equipment using actual game data, permissions and existing art. Implement authoritative comparison and allocation preview integration. Do not ship an invented EHP formula.
5. Migrate Quests, Ranks, Codex, Social, Homestead, Map, settings, NPC services, commerce, crafting and supported secondary screens into the framework. Keep old functionality accessible during migration; gate unimplemented planned features.
6. Test small portrait screens, desktop, long labels, touch input, actual server mutations, performance and accessibility. Deliver screenshots from the real game for owner feedback, not another exhaustive mockup walkthrough. Make small reversible commits and report tests, remaining gaps and performance changes.

**Open technical/gameplay decisions requiring audit or owner input:** exact EHP damage model, multi-channel comparisons, specialization thresholds/radar normalization, actual medal tier mapping and AP sources, final supported directory and ranking categories, NPC service capabilities, presence sampling and privacy, real map topology and visibility, future Homestead construction/visits/pets (bank storage remains unchanged). Do not introduce new gameplay to resolve these. Continue implementing unaffected menus while any such decisions are pending. Exact menu sizes, spacing, colors, font selection, icon placement and motion timing are implementation discretion; validate by screenshots and usability tests. The live repository has not been audited as part of this handoff.

## 16. Acceptance tests

The owner's usability benchmark is unassisted task completion by a child on a small phone. These are proposed checks, not completed test results.
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

Additional coverage:
At the existing portrait mobile dashboard height, without explanatory instructions:
- Open a nested DPS factor and follow the branching relationship to its actual calculation. Go Back to the original context; compare an item against current equipment and correctly describe a benefit and a tradeoff.
- Compare another player with yourself without confusing the comparison for an equip action. Inspect the same item from Gear/Codex/another player's equipment and verify facts match.
- Find combined life skill level, the highest skill, the next level's XP progress, and a distant future unlock. Distinguish the dynamic specialization label from an earned equipped title.
- Find an earned gold-tier achievement, inspect an unearned medal's requirement, discover how a title was earned, and equip an unlocked title as the owner only. Find a lifetime record and the active pet.
- From the living Social network, identify Friends, open online gallery, inspect a player and access a supported social action. Return to the same context. Confirm empty groups stay discoverable and large groups do not overcrowd the dashboard.
- When Homestead features become available, inspect actual estate/plot/house, reveal the interior, distinguish view from edit, and test pan/zoom plus access-controlled visits. Existing farm and bank functionality must continue working before those features ship.
- Switch between geographic and connection maps, identify an actual route/region, open a local category and a relevant entity, then return without losing map state. Verify map topology and visibility rules against real game data.
- Verify touch targets, text readability, no overlaps, no primary controls hidden behind scrolling, no dashboard height increase, and responsive animations on actual supported devices. Test empty/loading/error states and contextual permissions.
- Test all semantic action states for contrast (normal text target ≥4.5:1), stable touch footprint and predictable state feedback. Verify static vs interactive distinction with shine off.
- Verify trade edits invalidate both acceptances, stale confirmations are rejected, duplicate requests are prevented and uncertain outcomes reconcile authoritatively. Test successful, failed and interrupted commerce/crafting transactions.
- Verify all six Bro destinations, no redundant banner, no old tab strip, and no dashboard expansion. Test actual screenshots on the target iPhone Safari and desktop.

## 17. Source traceability

Consolidated from the owner-approved conversation and four historical handoffs: `BroTown_UI_Architecture_Handoff.md` (Q1–35), `BroTown_UI_Architecture_Handoff_Update_Q36-Q72.md`, `BroTown_UI_Architecture_Handoff_Update_Q73-Q85.md`, `BroTown_UI_Visual_Design_Handoff_Q86-Q108.md`; later visual feedback and explicit implementation authorization in the continuation conversation override earlier gates. Section headings retain later Q numbers where helpful. Earlier sources are historical records, not competing implementation instructions.

