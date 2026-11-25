# BroTown — UI Architecture Handoff: Final Architecture Addendum

**Date:** November 25, 2026  
**Previous baselines:** `BroTown_UI_Architecture_Handoff.md` (Q1–35); `BroTown_UI_Architecture_Handoff_Update_Q36-Q72.md` (Q36–72)  
**Scope:** Q73–85 inclusive; closes the foundational architecture phase  
**Audience:** Claude Code / BroTown repository implementation agent

## 1. Merge instructions and guardrails

Merge this incremental addendum into the existing repository UI architecture specification, preserving all previous decisions unless explicitly superseded. If no canonical specification exists, suggested location: `docs/design/UI_ARCHITECTURE_V2.md`. This is not an instruction to start implementation. The owner has completed foundational architecture choices; visual language, production layouts, assets and implementation validation come next.

Preserve the fixed mobile dashboard height, gameplay viewport, established Gear/Menu workspace behavior, contextual Back/Menu/Close, expansion/contraction drill-down, global-to-granular disclosure, predictable spatial zones, explicit labels, and separate actions vs destinations. Primary navigation, important facts and primary actions must not require scrolling to discover. Bounded collection scrolling is allowed. Test clarity against the owner's benchmark: give a child a task and see whether they can find the correct destination/action without additional instructions.

All names, artwork, quantities, prices, rarities, probabilities, merchant services and other example data from the wireframes are illustrative unless verified against existing game data. This addendum records UI choices, not new game mechanics. Do not invent unsupported functionality, change combat formulas, move bank storage, or implement future Homestead features prematurely. The live repository and exact production dashboard dimensions have not been audited for this addendum.

## 2. Codex (Q73–75)

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

## 3. Commerce and crafting (Q76–79)

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

## 4. NPCs and settings (Q80–81)

### Q80 — Living NPC profile with contextual services (C + D)

Use an actual animated NPC sprite/identity showcase, name, role and a concise contextual dialogue line where available. Clearly labeled service destinations are adapted to the NPC's supported services. An NPC with only one or two services should have larger, understandable destination controls rather than empty filler slots. Examples include Shop, Crafting, Bank, Quests and Dialogue where actually provided.

The layout shares the Codex identity/showcase component; remote Codex inspection is informational, while physical NPC interaction enables actual services. Use the existing contextual NPC interaction trigger and keep in-world gameplay controls unobstructed. The example NPC names and quotes were placeholders.

### Q81 — Quick settings first (B)

Settings is an intentional exception to destination-first navigation: players commonly open it to change a known preference quickly. Expose frequently used adjustable controls directly on the landing screen (examples: music volume, sound effects volume and graphics quality, if supported). Other settings remain clearly labeled categories below, with deeper dedicated screens. Apply safe reversible settings immediately; destructive or consequential account actions follow the earlier confirmation rules. Actual available settings and defaults must be audited; do not invent controls or hardware capabilities.

## 5. Cross-cutting interaction states (Q82–84)

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

## 6. Final architectural principle (Q85 — B)

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

## 7. Status and next phase

Foundational architecture questions Q1–85 are complete by owner decision. This does not mean production design or implementation is complete. Merge all three handoffs into one canonical, versioned specification. Keep a traceable decision log and mark any example or unresolved technical detail as such.

Next: establish the actual visual language (materials, palette, typography, borders/bevels, interaction states, iconography, animation and feedback), then validate pixel-accurate representative mockups within the existing mobile dashboard dimensions. The owner has previously favored a polished arcade aesthetic, clearly raised interactive elements, restrained ornamentation, recessed information surfaces and modular alignment. Do not finalize art assets until the visual direction is explicitly approved.

Before implementation: audit the current repo, existing components, actual dimensions, available data, existing gameplay features and server integrity requirements; map every approved destination to supported functionality; surface conflicts and gaps rather than silently inventing mechanics. Build reusable components in phases after owner approval; test navigation, permissions, transaction outcomes, responsiveness, mobile performance and accessibility. The exact EHP formula, specialization classification rules, some entity/category inventories and future Homestead mechanics remain open as described in prior handoffs.
