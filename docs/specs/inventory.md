# Brotown UI Spec Reference — Inventory + Equipped Surface

Complete implementation spec for the inventory and equipped tabs, including the tooltip detail surface and the two-slot customizable shortcut system. All dimensions assume portrait mobile per §15 (~380×760 viewport; 340px content width after margins). This spec is the canonical implementation reference for §1.7e and slots alongside `brotown_wheel_and_card_ui_specs.md` (utility wheel + inspect card) and `brotown_directional_block_spec.md` (combat defense ring).

**Unified-state model.** Brotown has no combat/non-combat mode separation. The utility wheel is always openable, the inventory surface is always reachable, and the world never pauses while menus are open — this is an MMO and server simulation continues regardless of menu state. Opening the inventory mid-fight is a valid choice with real cost, not a mode the game denies. This spec treats the inventory as perpetually accessible and designs the ambient damage feedback in Part 11 to communicate the cost of menuing under fire.

---

## Part 1: Design Philosophy

### Purpose

The inventory and equipped surfaces are where players manage their accumulated gear, configure combat loadout, and rediscover what they own. The design optimizes for two jobs with distinct rhythms:

1. **Collection browsing** — scanning, searching, finding, salvaging. The Inventory tab.
2. **Loadout configuration** — understanding what's equipped, changing weapon/armor/pet, configuring shortcuts. The Equipped tab.

### Design discipline

The inventory design follows four principles, in priority order:

1. **Child-intuitive baseline.** The default surface can be navigated by a player with zero game vocabulary. Labels use kid words (Wear, Keep safe, Salvage). Tap targets are large. The grid is chronological top-left-to-bottom-right using reading conventions every player already has.
2. **Progressive depth.** Additional vocabulary and visual information reveals itself as the player crosses behavioral thresholds (item counts, stat thresholds, marketplace participation). Same surface, different richness at different layers.
3. **Picture-first, word-as-label.** Per §1.7a, the tile shows the object in its canonical state (material, gems, wear). The text banner at the bottom of each tile is supplementary naming, not primary communication.
4. **Search at bottom.** Explicit de-emphasis — search is used uncommonly. Primary navigation is visual scanning of the chronological grid. Search is the escape valve when scanning fails.

### Always accessible, never free

The inventory surface is full-screen and accessed via the utility wheel (§1.7d) at any time. There is no "in combat" restriction. If the player wants to open inventory while a monster is swinging at them, the game permits this — but the monster keeps swinging. The world is always live. Opening inventory during a fight is a genuine tactical choice with real cost: time spent menuing is time not spent dodging or attacking, and HP keeps dropping.

The ambient damage feedback (Part 11) is the signal that the world is still hostile while the inventory is open. The ring around the right joystick, the shortcut edge-strips, the HP/stamina bars — all of these remain active and readable while the inventory surface is presented, passing combat information through to the player even while their eyes are on items.

### Reactive item use through shortcuts

For items needed reactively during combat — a heal under pressure, a buff before a boss wind-up — the two-slot shortcut system (Part 6) is the tool. Shortcuts fire on double-tap edge gestures per §15, regardless of menu state. A player with a health potion shortcut can double-tap the left edge to drink it without ever opening inventory. This is the path that doesn't cost time.

Inventory-opening is for *considered* actions — swapping weapons between boss phases, socketing a new gem, salvaging drops, reading a quest item. These are all reasonable to do under fire, with real cost. The design accepts that players will do this; it doesn't pretend otherwise.

---

## Part 2: The Two-Tab Structure

### Overall layout

The inventory surface is full-screen when opened from the wheel. Two tabs at the top:

- **Inventory** (default) — 3×N chronological grid of unequipped items
- **Equipped** — body-silhouette loadout view plus shortcut configuration

The tab bar sits at the top of the surface with a white text underline indicating the active tab. Tapping a tab switches the content area; the rest of the chrome (none in current design) stays constant.

### Tab bar

- **Height:** 44px
- **Background:** `#1A1A1A` (dark inventory surface)
- **Border bottom:** 0.5px `rgba(255, 255, 255, 0.1)`
- **Active tab:** white text (`#FFFFFF`), 14px, weight 500, 2px white underline at bottom edge
- **Inactive tab:** muted text (`rgba(255, 255, 255, 0.55)`), 14px, weight 400, no underline
- **Count suffix on Inventory tab:** monospace (SF Mono / JetBrains Mono), 12px, `rgba(255, 255, 255, 0.5)`. Shows total unequipped item count. E.g., "Inventory 845"
- **No count on Equipped tab** — the slots are fixed

---

## Part 3: The Inventory Tab

### Purpose

Full-screen grid showing all non-equipped items the player owns. Chronologically sorted, newest top-left. Used for browsing, comparing, salvaging, and configuring shortcuts.

### Layout structure (top to bottom)

1. Tab bar (44px)
2. Category chips strip (40px)
3. Sort label + control (24px)
4. Tile grid (variable, scrollable)
5. Search bar (56px, pinned at bottom of scrollable area)

### Category chips strip

Horizontal scrolling row of filter chips immediately below the tab bar.

- **Chip height:** 28px
- **Chip padding:** 6px vertical, 12px horizontal
- **Chip border radius:** 16px (pill)
- **Gap between chips:** 6px
- **Active chip:** `rgba(255, 255, 255, 0.18)` background, white text (12px, weight 500), no border
- **Inactive chip:** `rgba(255, 255, 255, 0.06)` background, white text (12px, weight 400), no border
- **Count suffix inside each chip:** monospace 10px, `rgba(255, 255, 255, 0.4)` for inactive, `rgba(255, 255, 255, 0.55)` for active. Shows subset count. E.g., "Weapons 14"

Default chip set: **All · Weapons · Armor · Gems · Potions · Other**

At Layer 0 (new player), the chips may start as just All / Weapons / Armor / Potions. Gems and Other reveal as the player acquires those item types.

### Sort label and control

Row below the category chips showing current sort order and a tap-target to change it.

- **Left:** "Newest first" (or current sort mode) in 10px, `rgba(255, 255, 255, 0.45)`
- **Right:** "Sort ▾" in 11px, `rgba(255, 255, 255, 0.6)` — tap opens a bottom-sheet with sort options
- **Height:** 24px total with 4px bottom padding before grid

Sort options in the bottom sheet:
- Newest first (default)
- Oldest first
- Tier (high to low)
- Tier (low to high)
- Alphabetical

When a filter category is active, sort operates within the filtered subset.

### Tile grid

Chronological 3-column grid of inventory items.

- **Grid columns:** 3 (340px ÷ 3 = ~110px per column with 6px gaps)
- **Tile size:** approximately 104px × 104px square (aspect-ratio: 1)
- **Gap between tiles:** 6px
- **Horizontal padding:** 14px each side
- **Grid order:** newest top-left, flowing right then down — standard reading order used as chronology

### Tile anatomy

Each tile is a rendered scene per §1.7a, not an abstract icon.

- **Background:** the tile's default state is `rgba(255, 255, 255, 0.04)` fill with 0.5px border `rgba(255, 255, 255, 0.15)`, 8px border-radius
- **Object rendering:** the item renders as itself at approximately 46-52px, vertically centered with ~10px offset upward to leave room for the bottom banner
- **Corner markers:** tiles can carry additional state markers in the top-left and top-right corners (see State Markers below)
- **Bottom banner:** linear-gradient overlay from transparent to `rgba(0, 0, 0, 0.78)`, sitting in the bottom ~30% of the tile, carrying the item name and tier/count label

### Tile bottom banner

The banner is the one text element on each tile. It sits flush at the bottom, rendered on a transparent-to-dark gradient so the item rendering above remains primary.

- **Gradient:** `linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.78) 55%)`
- **Banner vertical span:** ~30% of tile height (the gradient) with content in the bottom ~4-10px
- **Padding:** 10px top (gradient), 6px sides, 4px bottom
- **Content layout:** flex row, space-between, align-items baseline, 4px gap

**Banner content — left side:**
- **Font:** sans-serif (SF Pro / Inter / Roboto), 11px, weight 500
- **Color:** `#F0F0F0`
- **Overflow:** white-space: nowrap, overflow: hidden, text-overflow: ellipsis
- **Content:** item display name. For items with formal names, use the name as authored ("Oathkeeper", "Twin Stone"). For generic items, use a short type label ("Blue Sword", "Iron Vest", "Ore").

**Banner content — right side:**
- **Font:** monospace (SF Mono / JetBrains Mono), 9px
- **Color:** `rgba(255, 255, 255, 0.6)`
- **Flex-shrink:** 0 (does not compress)
- **Content:** tier for unique items ("T6", "T8"), count for stackables ("×12", "×48")

### Tile state markers

Tiles can carry additional corner markers indicating state:

**Top-left corner:**
- **NEW pill:** `#D4594A` background, white text (9px, weight 500), 1px × 6px padding, 9px border-radius. Shown on items acquired since last inventory opening.

**Top-right corner:**
- **Shortcut badge:** 14px circle, `rgba(0, 0, 0, 0.6)` background, 0.5px `rgba(255, 255, 255, 0.3)` border. Inside: small 7px gold diamond (`#E8D4A0`). Indicates this item is currently in one of the two shortcut slots.

### Tile border treatments

Base tiles have the default `rgba(255, 255, 255, 0.15)` 0.5px border. Tiles with heightened state use accent treatment:

- **NEW items:** 2px border `rgba(212, 162, 74, 0.6)` with slight gold-tinted background fill `rgba(212, 162, 74, 0.12)`
- **Consumable potions:** 0.5px border matching the potion color at ~30% opacity (red for HP, blue for mana, green for other), with a matching tinted fill at ~8% opacity
- **Elite/Godly items:** Elite gets a subtle colored border per rarity; Godly gets a distinctive dark tile (`#0F0715`) with gold-tinted border. These treatments do not conflict with the NEW border because the NEW pill signals recency independent of rarity styling.

### Search bar

Pinned at the bottom of the scrollable area. Deliberately quiet — player attention is trained to the top-left per reading order, and search is used uncommonly.

- **Background:** `rgba(255, 255, 255, 0.05)` fill, 0.5px `rgba(255, 255, 255, 0.08)` border, 8px border-radius
- **Padding:** 9px vertical, 12px horizontal
- **Height:** 36px (content) + margins
- **Icon:** small magnifying glass, 13×13px, `rgba(255, 255, 255, 0.4)` stroke
- **Placeholder text:** "Search" in 12px sans-serif, `rgba(255, 255, 255, 0.4)`
- **Active state (tapped):** opens keyboard; placeholder disappears; input text is `#F0F0F0`, 13px
- **Search scope:** searches item names and tier labels within the current category filter. Results replace the grid with a scrollable list of matches in chronological order. Clearing the search returns to the full filtered grid.

### Equipped items not shown in inventory grid

Per design discipline, items currently equipped (weapon, armor, pet, tool) do **not** appear in the inventory grid. The grid shows only unequipped items available to use. To see or change equipped items, the player switches to the Equipped tab. This keeps the grid as "stuff I have that I'm not using" — a clean mental model.

### Shortcut items remain visible in inventory grid

Items assigned to shortcut slots **do** appear in the inventory grid (option B per design conversation), marked with the small shortcut badge in the top-right corner. The count on stackable consumables shows the full stock (including what's in the shortcut), not just the reserve. This lets the player see their full collection without tab-switching, and the shortcut badge makes shortcut assignments scannable.

---

## Part 4: The Tooltip Surface

### Purpose

When a player taps any inventory tile, a tooltip surface slides up from the bottom. The tooltip serves two roles:

1. **Detail surface** — full context on the item (name, tier, crafter, stats, comparison to equipped)
2. **Action surface** — the place where Wear, Keep safe, Add shortcut, and Salvage actions live

One tap, one destination. No ambiguity.

### Activation

- **Trigger:** single tap on any inventory tile
- **Transition:** bottom sheet slides up from screen bottom over ~0.2s with ease-out
- **Background behind sheet:** grid dims to ~35% opacity, slight gaussian blur (stdDeviation 2) for focus

### Dismissal

The tooltip dismisses via any of:

- Tap outside the sheet (dimmed grid area)
- Drag the sheet downward past a dismissal threshold (~40% of sheet height)
- Swipe down on the drag handle at the top of the sheet
- Complete a terminal action (Wear, Salvage) — committing an action closes the tooltip automatically

### Tooltip dimensions

- **Width:** full screen width (340px content)
- **Height:** dynamic based on content, approximately 380-420px for typical weapons, less for simple stackables
- **Position:** anchored to bottom of screen, content flows up from there
- **Background:** `#1A1A1A`, 0.5px top border `rgba(255, 255, 255, 0.15)`, 14px top-left and top-right border-radius

### Tooltip structure (top to bottom)

1. Drag handle (4px × 32px, `rgba(255, 255, 255, 0.2)`, centered, 8px from top)
2. Hero rendering (item + name + subtitle + provenance line) — ~90px tall
3. Comparison block (when applicable) — ~100px tall
4. Supplementary blocks (gems, market price if Layer 3) — ~60px each, optional
5. Action buttons — 2×2 grid, ~120px tall total

### Hero rendering

Top section of the tooltip, showing the item at larger size alongside its name and metadata.

- **Layout:** flex row, 14px gap, align-items: center
- **Item rendering:** 68×68px square with `rgba(212, 162, 74, 0.1)` background (or matching the item's rarity tint), 1.5px border matching rarity, 10px border-radius. The object renders at ~48px inside this frame per §1.7a
- **Text column (to the right of rendering):**
  - Line 1 — **Name:** serif (EB Garamond / Cormorant), 17px, weight 500, `#F0F0F0`, 3px bottom margin. E.g., "Blue Sword", "Oathkeeper"
  - Line 2 — **Tier and quality:** monospace, 12px, `rgba(255, 255, 255, 0.55)`. E.g., "Tier 6 Elite · Hardness 2"
  - Line 3 — **Provenance** (Layer 3 only, italic): italic serif, 11px, `rgba(230, 200, 140, 0.7)`, 3px top margin. E.g., "forged by Mason · found today"

### Comparison block

Appears for items that share a slot with currently equipped gear (weapons, armor, pets). Compares the tapped item to the equipped item of the same slot.

- **Background:** `rgba(255, 255, 255, 0.04)` fill, 8px border-radius, 10px padding, 10px bottom margin
- **Label:** "COMPARED TO WHAT YOU'RE WEARING" (Layer 0) or "VS YOUR IRON GREATSWORD" (Layer 2+ — uses actual equipped item name), 10px, `rgba(255, 255, 255, 0.5)`, letter-spacing 0.3px
- **Stat rows:** flex column, 6px gap between rows, 12px font
- **Per row:**
  - Left: stat label in kid-vocabulary (Layer 0: "Hits harder", "A bit slower") or technical (Layer 2+: "Attack", "Speed", "Crit chance")
  - Right: signed delta in monospace, colored green (`#9CCC6B`) for positive, coral (`#DC8060`) for negative
- **Number of stats shown:** 2 at Layer 0, 3 at Layer 2+, 4-5 at Layer 3+

Comparison only appears for slot-matchable items. Gems, materials, and potions skip this block entirely.

### Gems block

Appears for weapons and armor that have gem slots, showing what's socketed and slot availability.

- **Background:** `rgba(255, 255, 255, 0.025)` fill, 8px border-radius, 10px × 12px padding, 16px bottom margin
- **Label:** "GEMS", 10px, `rgba(255, 255, 255, 0.45)`, letter-spacing 0.4px, 4px bottom margin
- **Gem list:** flex row, 8px gap
  - Each gem: 14px colored circle matching the gem's element color + 12px element name label
  - Slot occupancy indicator on the right: monospace 11px, "1 of 2 slots"

### Market block (Layer 3 only)

Appears once the player has participated in the marketplace. Shows recent pricing for similar items.

- **Background:** `rgba(212, 162, 74, 0.06)` fill, 0.5px `rgba(212, 162, 74, 0.2)` border, 8px border-radius, 8px × 10px padding, 16px bottom margin
- **Left column:**
  - Label: "MARKET", 10px, `rgba(230, 200, 140, 0.65)`, letter-spacing 0.3px
  - Value: "200-400g recently" in monospace 12px, `#E8D4A0`
- **Right:** "List ↗" in 11px, `rgba(230, 200, 140, 0.8)` — tap to go to marketplace listing flow

### Action buttons (bottom of tooltip)

Four actions arranged in a 2×2 grid. Primary action (Wear/Use) is top-left with high-contrast fill; secondary actions are more subdued.

**Layout:** 2 columns × 2 rows, 8px gap, 6-8px margin between rows

**Button dimensions:** ~14px vertical padding, full column width (approximately 155px each), 10px border-radius

**Top row:**
- **Primary action (left):** "Wear" for weapons/armor, "Use" for consumables, "Socket" for gems. Background `#4A9ACC` (blue), white text 15px weight 500, no border. Saturated and loud — this is the expected action.
- **Secondary action (right):** "Keep safe". Background `rgba(255, 255, 255, 0.08)`, 0.5px `rgba(255, 255, 255, 0.15)` border, white text 14px. Moderate emphasis.

**Bottom row:**
- **Shortcut action (left):** "Add shortcut" (if not shortcutted) or "Remove shortcut" / "Move shortcut" (if already in a slot). Background `rgba(255, 255, 255, 0.06)`, 0.5px `rgba(255, 255, 255, 0.12)` border, text `rgba(255, 255, 255, 0.85)` 13px.
- **Destructive action (right):** "Salvage" (Layer 3+) or "Trash" (Layer 0). Background `rgba(200, 80, 60, 0.1)`, 0.5px `rgba(200, 80, 60, 0.25)` border, coral text `#E89080` 13px. Quieter than the primary action but clearly distinct.

### Action variations by item type

The four actions adapt to item type:

| Item type | Action 1 | Action 2 | Action 3 | Action 4 |
|---|---|---|---|---|
| Weapon/armor/pet | Wear | Keep safe | Add shortcut | Salvage |
| Consumable | Use | Keep safe | Add shortcut | Salvage |
| Gem (unsocketed) | Socket | Keep safe | Add shortcut | Salvage |
| Material | — | Keep safe | — | Salvage |
| Currently-equipped (via Equipped tab tooltip) | Take off | — | Add shortcut | — |

Missing actions leave their grid cell empty (no button), keeping positions consistent across item types.

### Destructive action undo window

Salvage (or Trash) commits an action that destroys value. To protect against fat-fingers, the action does not execute immediately.

- **Trigger:** tap Salvage/Trash
- **Feedback:** toast slides up from bottom of screen for 30 seconds, replacing the dismissed tooltip
- **Toast content:** "Salvaged Blue Sword · Undo" with an "Undo" tap-target
- **Undo:** tapping Undo restores the item to inventory at its pre-salvage position
- **Auto-commit:** after 30 seconds with no Undo tap, the salvage commits and materials are added to the player's stash
- **Multiple salvages:** consecutive salvages within the 30-second window stack; the toast updates to show "Salvaged 3 items · Undo All"

### Vocabulary progression

Layer 0 uses child vocabulary; later layers use domain terms as the player crosses thresholds.

- "Trash" at Layer 0 becomes "Salvage" at Layer 3 (after first marketplace interaction, the distinction becomes meaningful)
- "Keep safe" remains stable across all layers — no domain term is as clear
- "Wear" remains stable — clearer than "Equip" even for veterans
- "Add shortcut" remains stable — universally understood

---

## Part 5: The Equipped Tab

### Purpose

Body-silhouette loadout view showing the player's current equipped gear, plus the two-slot shortcut configuration below. This is the "what am I carrying right now" surface.

### Layout structure (top to bottom)

1. Tab bar (44px, shared with Inventory tab)
2. Body silhouette area (~320px tall)
3. Shortcuts section label + hint (32px)
4. Shortcut row (two 48px slots, 6px gap)
5. Bottom padding (16px)

### Body silhouette area

A generic Bro silhouette anchored in the center of the area with four equipment slots arranged around it at canonical positions.

- **Silhouette:** rendered in warm neutral tones (`#D4B090` for skin, `#6A7A8A` for clothing base) — generic, not the player's customized character. The actual character rendering per §21 stat-based visuals is shown on the inspect card; this is a functional silhouette showing slot positions, not an identity rendering.
- **Silhouette size:** approximately 58×80px, centered horizontally
- **Background:** subtle radial gradient centered on top of silhouette, `rgba(80, 120, 160, 0.08)` fading to transparent
- **Padding:** 20px top, 12px bottom

### Equipment slot positions

Four slots arranged around the silhouette at canonical positions:

- **Weapon:** left of silhouette at hip/waist height (left middle of the area)
- **Armor:** right of silhouette at upper body height (right upper of the area)
- **Pet:** right of silhouette at lower body height (right lower of the area)
- **Tool:** left of silhouette at lower body height (left lower of the area)

**Each slot:**
- **Size:** 52×52px
- **Border:** 1.5px in a slot-specific color at ~40-55% opacity (blue for weapon, brown-neutral for armor, green for pet, gray for tool)
- **Background:** matching color at ~12% opacity
- **Border-radius:** 10px
- **Object rendering:** the equipped item renders inside the slot at ~36-38px per §1.7a

**Empty slot treatment:**
- Dashed border in `rgba(255, 255, 255, 0.2)`
- No background fill (`rgba(255, 255, 255, 0.02)`)
- Center: small plus icon in `rgba(255, 255, 255, 0.3)` indicating "tap to fill"

**Slot label:**
- Below each slot: 9px sans-serif, `rgba(255, 255, 255, 0.55)` (filled slots) or `rgba(255, 255, 255, 0.35)` (empty slots)
- Labels: WEAPON, ARMOR, PET, TOOL
- Letter-spacing: 0.3px

### Slot interaction

- **Tap a filled slot:** opens the tooltip for the equipped item with actions adapted to the equipped context ("Take off" replaces "Wear", etc.)
- **Tap an empty slot:** opens a picker bottom-sheet showing inventory items compatible with that slot. Tap an item to equip.
- **Long-press a filled slot:** opens the tooltip (consistent with long-press tooltip convention per §1.7c)

### Shortcuts section

Below the body silhouette, a small configurable row of shortcut slots.

- **Section label:** "SHORTCUTS" at 12px, weight 500, letter-spacing 0.4px, `rgba(255, 255, 255, 0.75)`, 16px top padding, 14px horizontal padding
- **Hint text:** "Tap a slot to set" at 10px, `rgba(255, 255, 255, 0.4)`, right-aligned
- **Section total height:** ~32px for label row

### Shortcut row

Two shortcut slots, side by side. (The number is fixed at 2 per design decision — two compact HUD buttons avoid screen clutter and force meaningful priority choices.)

- **Layout:** flex row centered horizontally or justified-start with 6px gap
- **Slot size:** 48×48px each
- **Total row width:** ~102px including gap
- **Horizontal padding:** 14px each side of the inventory surface

**Filled shortcut slot:**
- **Border:** 1.5px in a color matching the slot's item type (red for health potion, blue for mana potion, violet for alternate weapon, etc.)
- **Background:** matching color at ~15-18% opacity
- **Border-radius:** 10px
- **Object rendering:** ~28×28px inside the slot
- **Stack count (consumables only):** bottom-right corner, 10px monospace, high-contrast color derived from the item's color family

**Empty shortcut slot:**
- **Border:** 1.5px dashed `rgba(255, 255, 255, 0.15)`
- **Background:** `rgba(255, 255, 255, 0.03)`
- **Center:** 14px plus icon in `rgba(255, 255, 255, 0.3)`

### Shortcut slot interaction

- **Tap a filled slot:** opens a small action sheet with options: "Remove shortcut", "Replace shortcut" (opens picker), "Cancel"
- **Tap an empty slot:** opens a picker bottom-sheet showing inventory items that can be shortcutted (consumables, weapons, tools, gems). Tap an item to assign. The picker is the same surface as the equipment slot picker, filtered to shortcut-compatible items.
- **Assignment persistence:** shortcuts persist across sessions, death, and zone transitions. They do not reset on character death.

### Configuring shortcuts from the Inventory tab

The Inventory tab's tooltip also provides an "Add shortcut" action (Part 4). Tapping it opens a small picker showing the two shortcut slots with their current contents; the player taps a slot to assign the item there, replacing any existing contents.

Both paths — from Equipped tab and from Inventory tooltip — result in the same end state. The player can use whichever is more convenient in context.

---

## Part 6: Shortcut System (Edge-Gesture Invocation)

### Purpose

The two shortcut slots give the player instant access to one-tap item use without opening inventory. Shortcuts are accessed via double-tap edge gestures per §15, always available regardless of whether the player is in a menu or actively fighting. This is the fast path for reactive item use — heals under pressure, buffs before a wind-up, consumables at the moment they matter.

### Edge gestures (cross-reference to §15)

- **Double-tap left edge of screen (outside left joystick zone):** use contents of Shortcut 1
- **Double-tap right edge of screen (outside right joystick and block ring zones):** use contents of Shortcut 2

The gestures are always available regardless of game state — the edge strips are permanent ambient surfaces. They are discoverable via low-opacity colored gradient strips at the screen edges whose opacity modulates with hostile proximity (matching the ring proximity-modulation per the block spec), and teachable via first-use contextual prompts when the item becomes relevant (e.g., low-HP prompt when a healing shortcut is slotted).

### Slot contents

Each slot can hold any of:

- Consumable stack (health potion, mana potion, food, bomb, etc.)
- Weapon (acts as quick-swap — tapping the shortcut swaps the current equipped weapon with the shortcut weapon; the swapped-out weapon takes the shortcut slot's place to preserve the loadout)
- Gem (opens a quick-socket picker for current weapon/armor)
- Tool (uses the tool's active effect)

### Stack count display

A potion stack in a shortcut slot displays a count that reflects the player's **full stock**, not a slot-local reserve. The slot is a pointer to the inventory stack, not a separate pile. If the player has 12 health potions in inventory and the shortcut points at them, the slot shows "×12"; using one from the shortcut drops it to "×11" and the inventory tile also shows "×11".

(Option discussed: slot-local reserve that limits the shortcut to a pre-set amount. Rejected — adds a second kind of inventory math the player has to track. Full-stock pointer is simpler and matches how players think about "my potions".)

### Ghost-slot behavior

When a consumable shortcut stack hits zero, the slot does not immediately clear.

- **Empty state hold:** slot retains the item type as a "ghost" for 30 seconds — icon renders at reduced opacity (~40%), count shows "×0"
- **Auto-refill:** if the player picks up more of the same item within 30 seconds, the slot auto-refills with the new stack and the icon returns to full opacity
- **Timeout:** after 30 seconds with no replenishment, the slot clears to an unassigned state and the player must re-configure

This prevents the annoyance of a player's potion shortcut evaporating mid-fight when they drink the last one and immediately loot another off a corpse.

### Endgame item design for the two slots

At endgame, multi-purpose items are expected to fill these slots rather than single-purpose ones. A canonical endgame shortcut might be a "Resonance Elixir" that restores HP, restores stamina, and grants a temporary buff — consolidating three effects into one slot. The two-slot constraint is therefore more generous than it appears: endgame players aren't forced to choose between heal and buff, they slot composite items that do both.

Early-game players use single-effect consumables and feel the two-slot pressure more acutely. This creates an organic progression where loadout decisions become more comfortable as item design matures across game levels.

### Shortcut item visibility

Shortcut items are visible:

1. **In the Equipped tab's shortcut row** — always, primary configuration surface
2. **In the Inventory tab grid** — always, with the shortcut badge in the top-right corner of the tile (see Part 3)
3. **As persistent HUD shortcut edge-strips** — the actual invocation surface, small color gradients at the screen edges, always visible with proximity-modulated opacity (see §15)

The triple visibility is intentional: players can configure from Equipped, verify from Inventory, and invoke from the HUD, all with consistent visual treatment.

---

## Part 7: Progressive Depth — The Layering System

### Philosophy

The inventory surface starts at a child-intuitive baseline (Layer 0) and reveals additional vocabulary and controls as the player demonstrates behavioral thresholds. Each layer adds information without moving existing information — a Layer 3 player's grid looks very similar to a Layer 0 player's grid, just with richer content per tile and fuller tooltips.

### Layer 0 — child baseline

**What the player sees:**
- Tabs: Inventory, Equipped
- Category chips: All, Weapons, Armor, Potions (Gems and Other not yet revealed)
- Grid: 3-column chronological
- Tile banner: item name + tier or count
- Tile markers: NEW badge only
- No sort control visible
- Search bar present but quiet
- Tooltip: name + tier + short comparison ("Hits harder +12") + actions with kid vocabulary (Wear, Keep safe, Trash)
- Equipped tab: body silhouette, four slots, shortcut row

**What the player does not see yet:**
- Shortcut badges (player hasn't used shortcuts yet)
- Sort control (grid is chronological, no need for sort)
- Crafter attribution (player hasn't engaged with crafting economy)
- Market pricing (player hasn't used marketplace)
- Detailed stat comparisons (player hasn't crossed stat thresholds)

### Layer 1 — volume management

**Triggered by:** inventory item count crosses 100

**What reveals:**
- Sort control ("Sort ▾") at top of grid
- All category chips (Gems and Other appear based on what the player owns)
- Counts on category chips
- Expanded search functionality if player uses it (searches across tier, quality, etc.)
- Bulk select mode (long-press any tile to enter selection mode; select multiple items; bulk-salvage/star)

The player has too many items to manage one at a time; the tools to manage volume appear.

### Layer 2 — decision depth

**Triggered by:** stat thresholds per §1.5 progressive derivative reveal (e.g., Ferocity crosses 50, Agility crosses 50)

**What reveals:**
- Tier label expanded in tooltip subtitle ("Tier 6 Elite" instead of just "Tier 6")
- Hardness and Temper visible in tooltip subtitle
- Expanded comparison block in tooltip: 3 stats instead of 2, with technical terms alongside kid labels ("Attack +12 / Hits harder")
- Gem slot count visible in tile banner for items with gems

### Layer 3 — social and economic

**Triggered by:** first marketplace interaction OR first clan join OR first life-skill threshold

**What reveals:**
- Crafter mark on tiles (small letter or guild emblem in bottom-left corner, Layer 3 only)
- Full provenance line in tooltip ("forged by Mason · tempered at Hardness 3 · found 14 days ago")
- Market block in tooltip with recent pricing
- "Trash" action renames to "Salvage" (the distinction has become meaningful)
- Shortcut badge in tile top-right (visible only once the player has used shortcuts; reveals on first shortcut assignment)

### Canonical rule for layer reveals

Layer reveals are **silent for volume management** (features appear when the player encounters the need, no announcement) and **light-touch for decision-depth and social-economic layers** (a brief one-time highlight animation on the newly-revealed element, matching §1.5's stat-derivative reveal treatment). No tutorial panels, no popups, no "congratulations" ceremonies. The feature's appearance is the acknowledgment.

### Regression is not possible

Once a layer has been revealed for a character, it stays revealed even if the triggering condition changes (e.g., item count drops below 100 after a salvage pass). Layer reveals are one-way. The surface grows; it does not retract.

---

## Part 8: Color and Typography Canon

### Inventory surface colors

- **Primary background:** `#1A1A1A` (dark inventory surface)
- **Tile default fill:** `rgba(255, 255, 255, 0.04)`
- **Tile default border:** `rgba(255, 255, 255, 0.15)`, 0.5px
- **Tile banner gradient:** `linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.78) 55%)`
- **Active chip background:** `rgba(255, 255, 255, 0.18)`
- **Inactive chip background:** `rgba(255, 255, 255, 0.06)`
- **NEW badge:** `#D4594A` (coral red)
- **Shortcut badge:** `rgba(0, 0, 0, 0.6)` circle with `#E8D4A0` (gold) diamond inside

### Tooltip colors

- **Sheet background:** `#1A1A1A`
- **Sheet top border:** `rgba(255, 255, 255, 0.15)`, 0.5px
- **Drag handle:** `rgba(255, 255, 255, 0.2)`
- **Comparison block background:** `rgba(255, 255, 255, 0.04)`
- **Positive stat delta:** `#9CCC6B` (green)
- **Negative stat delta:** `#DC8060` (coral)
- **Market block accent:** `rgba(212, 162, 74, 0.06)` fill, `#E8D4A0` text
- **Primary action button:** `#4A9ACC` (blue)
- **Destructive action:** `#E89080` text on `rgba(200, 80, 60, 0.1)` fill

### Equipped tab colors

- **Slot borders by type:**
  - Weapon: `rgba(80, 140, 200, 0.55)` (blue)
  - Armor: `rgba(140, 110, 80, 0.4)` (warm neutral)
  - Pet: `rgba(100, 140, 90, 0.4)` (green)
  - Tool: `rgba(255, 255, 255, 0.2)` (neutral)
- **Silhouette background gradient:** `rgba(80, 120, 160, 0.08)` fading to transparent

### Typography

- **Serif** (item names in tooltip, Journey entries): EB Garamond / Cormorant / canonical game serif
- **Sans-serif** (UI chrome, labels, banner text, tab labels): system sans (SF Pro / Inter / Roboto)
- **Monospace** (tier numbers, counts, item subtitle metadata): SF Mono / JetBrains Mono

### Sizing summary

| Element | Width | Height |
|---|---|---|
| Tab bar | 340px | 44px |
| Category chip | variable | 28px |
| Inventory tile | ~104px | ~104px (aspect 1:1) |
| Tile banner | tile width | ~30% of tile |
| Search bar | 340px | 36px content |
| Tooltip sheet | 340px | 380-420px typical |
| Tooltip hero rendering frame | 68px | 68px |
| Tooltip action button | ~155px | ~46px |
| Equipped slot | 52px | 52px |
| Shortcut slot | 48px | 48px |

---

## Part 9: Tuning Constants

Constants for implementation; final values to be set by playtesting and content volume:

| Constant | Suggested value | Purpose |
|---|---|---|
| `INVENTORY_GRID_COLUMNS` | 3 | Number of columns in the tile grid |
| `INVENTORY_TILE_SIZE` | 104px | Tile width/height (aspect-ratio 1:1) |
| `INVENTORY_TILE_GAP` | 6px | Gap between tiles in the grid |
| `TILE_BANNER_GRADIENT_START` | 0% | Gradient start position (transparent) |
| `TILE_BANNER_GRADIENT_END_OPACITY` | 0.78 | Dark opacity at gradient end |
| `TILE_BANNER_NAME_FONT_SIZE` | 11px | Banner item name size |
| `TILE_BANNER_TIER_FONT_SIZE` | 9px | Banner tier/count size |
| `TOOLTIP_OPEN_TRANSITION` | 200ms | Duration of bottom sheet slide-up |
| `TOOLTIP_DISMISS_DRAG_THRESHOLD` | 0.4 | Fraction of sheet height to trigger dismiss |
| `TOOLTIP_BACKDROP_BLUR` | 2px | Gaussian blur stdDeviation on dimmed grid |
| `TOOLTIP_BACKDROP_DIM` | 0.35 | Opacity of grid when tooltip is open |
| `SALVAGE_UNDO_DURATION` | 30000ms | Window to undo a Salvage/Trash action |
| `LAYER_1_ITEM_THRESHOLD` | 100 | Item count triggering volume-management layer |
| `LAYER_2_STAT_THRESHOLD` | 50 | Stat value triggering decision-depth layer |
| `LAYER_3_TRIGGER` | first marketplace OR clan OR life-skill | Social-economic layer trigger |
| `SHORTCUT_SLOT_COUNT` | 2 | Fixed number of shortcut slots |
| `SHORTCUT_GHOST_DURATION` | 30000ms | How long an emptied consumable shortcut stays as ghost |
| `NEW_BADGE_DURATION` | until next inventory open | How long the NEW badge persists on a tile |
| `DAMAGE_VIGNETTE_PEAK_OPACITY` | 0.20 | Peak opacity of red edge pulse on hit |
| `DAMAGE_VIGNETTE_IN_MS` | 250ms | Ramp-up duration of damage vignette |
| `DAMAGE_VIGNETTE_OUT_MS` | 400ms | Fade-out duration of damage vignette |
| `INVENTORY_SHAKE_DISTANCE` | 2px | Translation distance on damage taken while open |
| `INVENTORY_SHAKE_MS` | 80ms | Duration of shake animation |
| `LOW_HP_THRESHOLD` | 0.30 | HP fraction below which grid desaturates and HP bar pulses |
| `LOW_HP_DESATURATION` | 0.70 | Saturation multiplier on tile grid at low HP |
| `AUTO_CLOSE_MS` | 120ms | Slide-down duration on forced close |

---

## Part 10: Implementation Checklist

### Tab structure

- [ ] Two tabs: Inventory (default) and Equipped
- [ ] Active tab underlined with 2px white; inactive tab muted
- [ ] Inventory tab shows total count suffix; Equipped tab does not
- [ ] Tab content switches without full-screen redraw; chrome stays constant

### Inventory grid

- [ ] 3-column tile grid with 6px gap and 14px horizontal padding
- [ ] Tiles render items as objects per §1.7a, ~46-52px object inside 104px tile
- [ ] Chronological order: newest top-left, flowing right and down
- [ ] Equipped items excluded from the grid (only unequipped items appear)
- [ ] Shortcut items included with shortcut badge in top-right

### Tile banner

- [ ] Linear gradient from transparent to dark-78% in bottom ~30% of tile
- [ ] Name left, tier/count right, 4px gap, baseline-aligned
- [ ] Name truncates with ellipsis at overflow
- [ ] Name: 11px sans-serif weight 500, light color
- [ ] Tier/count: 9px monospace, medium-opacity white

### Tile state markers

- [ ] NEW pill: coral red, top-left, shown until next inventory open
- [ ] Shortcut badge: small dark circle with gold diamond, top-right, shown when item is in a shortcut slot
- [ ] Accent border treatments for NEW, Elite, Godly items per color canon

### Category chips and sort

- [ ] Horizontal scrolling chip strip below tab bar
- [ ] Active chip in lighter background with count suffix
- [ ] "Newest first" label and "Sort ▾" control below chip strip
- [ ] Sort control opens bottom sheet with sort options

### Search

- [ ] Search bar pinned at bottom, deliberately quiet visual treatment
- [ ] Tapping opens keyboard; placeholder disappears on focus
- [ ] Searches item names and tier labels within current filter
- [ ] Clearing search returns to filtered grid view

### Tooltip

- [ ] Opens as bottom sheet on tile tap with 200ms slide-up animation
- [ ] Grid behind dims to 35% with 2px gaussian blur
- [ ] Drag handle at top, dismissible via drag-down, tap-outside, or action completion
- [ ] Hero rendering: item + name (serif 17px) + subtitle (mono 12px) + provenance (italic, Layer 3 only)
- [ ] Comparison block appears for slot-matchable items, shows stat deltas
- [ ] Gems block appears for items with gem slots
- [ ] Market block appears for Layer 3 players
- [ ] Four-action 2x2 grid at bottom
- [ ] Primary action (Wear/Use/Socket) in saturated blue
- [ ] Salvage action in coral-tinted destructive style

### Destructive action flow

- [ ] Tap Salvage/Trash does not immediately commit
- [ ] Toast appears at bottom with "Undo" affordance for 30 seconds
- [ ] Undo restores item to inventory at pre-salvage position
- [ ] Consecutive salvages stack in toast ("Salvaged 3 items · Undo All")
- [ ] Auto-commits after 30 seconds; material stash credited at commit time

### Action vocabulary

- [ ] "Trash" at Layer 0, "Salvage" at Layer 3+
- [ ] "Wear", "Keep safe", "Add shortcut" remain constant across layers
- [ ] Action buttons adapt by item type per table (consumable → Use, gem → Socket, etc.)

### Equipped tab

- [ ] Body silhouette centered with four slots at canonical positions (Weapon left-hip, Armor right-upper, Pet right-lower, Tool left-lower)
- [ ] Empty slots render dashed with plus icon
- [ ] Tapping filled slot opens tooltip with "Take off" action
- [ ] Tapping empty slot opens picker with compatible inventory items
- [ ] Two shortcut slots below silhouette, 48px each, 6px gap
- [ ] Shortcut slot tap-to-configure opens picker filtered to shortcuttable items

### Shortcut behavior

- [ ] Two fixed shortcut slots, stored per character, persistent across sessions
- [ ] Consumable stacks show full inventory count in shortcut (pointer, not reserve)
- [ ] Ghost-slot behavior: emptied consumable slots retain 30-second refill window
- [ ] Edge-gesture access via double-tap left-edge (Slot 1) and right-edge (Slot 2) per §15, always available regardless of menu state

### Layer progression

- [ ] Layer 1 reveals at 100 items: sort control, expanded chips, bulk-select mode
- [ ] Layer 2 reveals at stat thresholds: expanded tier labels, fuller comparison, Hardness/Temper in tooltip
- [ ] Layer 3 reveals at first marketplace/clan/skill threshold: crafter marks, provenance lines, market block, "Salvage" terminology, shortcut badges
- [ ] Layer reveals are silent (volume) or light-touch animated (decision/social)
- [ ] Layer reveals persist once triggered (no regression)

### Integration

- [ ] Inventory accessed via utility wheel's Inventory slot per §1.7d
- [ ] Surface remains accessible at all times; world does not pause while open
- [ ] Tooltip tap-to-open is consistent; long-press on Equipped slots also opens tooltip
- [ ] Shortcut items reachable from both Inventory tooltip and Equipped tab

### Ambient damage feedback (Part 11)

- [ ] Red radial vignette pulses from screen edges on each damage instance while inventory is open
- [ ] Vignette peak opacity scales with damage magnitude (15-30% peak)
- [ ] HP and stamina bars remain visible above inventory overlay at 100% opacity
- [ ] HP bar pulses rhythmically when HP drops below 30% with inventory open
- [ ] Combat audio plays at full volume regardless of menu state; ambient environment audio ducks 20%
- [ ] Haptic feedback fires on every hit, low-HP state, and critical events regardless of menu state
- [ ] Inventory surface shakes 2px for 80ms on each hit taken while open
- [ ] Tile grid desaturates to 70% saturation when HP below 30%
- [ ] Inventory auto-closes on: HP zero, left-joystick input, right-joystick input, block activation, party-critical event, forced zone transition
- [ ] Auto-close animation is 120ms slide-down returning full HUD responsiveness
- [ ] Tooltip and inventory close together in single transition when auto-close fires
- [ ] Accessibility settings provide individual toggles for screen shake, edge vignette, and grid desaturation

---

## Part 11: Ambient Damage Feedback While Inventory Is Open

### Purpose

Because the world never pauses, the inventory surface must remain porous to combat information. A player who opens inventory while being attacked needs to *feel* the danger — through sight, sound, and touch — without needing to exit the menu to understand what's happening. This section specifies the cross-cutting feedback layer that passes combat state through the inventory overlay.

### Design principle

The inventory surface is a semi-transparent overlay in combat contexts, not an island. It occupies the player's visual focus but does not claim their peripheral vision, their ears, or their hands. Every channel the game can use to convey danger without requiring a menu exit is used.

### Screen-edge damage vignette

When the player takes damage with the inventory surface open:

- **Trigger:** each instance of HP loss while inventory is open
- **Visual:** red radial gradient pulses from the four screen edges inward, peaking at ~20% opacity near the edges and fading to transparent in the center
- **Duration per pulse:** 250ms in, 400ms out
- **Color:** `rgba(180, 40, 40, 0.6)` at peak, fading to transparent
- **Z-order:** above the inventory overlay, below the tooltip sheet if one is open — meaning even tooltip-focused players see the edge pulse
- **Severity scaling:** pulse intensity scales with damage magnitude. A small hit produces ~15% peak opacity; a boss slam produces ~30%; a crit produces a brief screen desaturation layered with the red pulse

### HP and stamina bar pass-through

The player's HP and stamina bars remain visible while inventory is open, rendered at the canonical HUD position with full opacity:

- **Position:** HP and stamina bars remain at their canonical positions per §15 (typically top-left or above the left joystick)
- **Z-order:** above the inventory surface overlay — the bars punch through the menu dimming
- **Opacity:** 100% regardless of inventory overlay opacity
- **Low-HP emphasis:** when HP drops below 30% while inventory is open, the HP bar pulses rhythmically (250ms period) at the edges to draw attention

The bars are the authoritative source of "how am I doing" information and must never be obscured by menu UI. If the inventory tile grid would spatially collide with the bars at any layout, the bars win and the grid adjusts.

### Audio pass-through

Combat audio plays at full volume regardless of inventory state:

- Incoming hit impacts: full volume, full spatial audio
- Player character grunts/pain vocalizations: full volume
- Enemy telegraph audio (boss wind-up, charge-up, roar): full volume
- Ambient combat music: unchanged; does not duck or dim during menu
- Menu UI audio (tile taps, tab switches) is rendered at standard volume and does not compete with or suppress combat audio

The only audio that should attenuate during menu use is ambient environment audio (wind, water, crowds) — these can drop 20% to let combat audio sit forward. Menu-opened does not shift the mix away from danger.

### Haptic pass-through

Haptic feedback for combat events fires regardless of inventory state:

- **On-hit haptic:** sharp short pulse per §15.2a on every damage instance
- **Low-HP haptic:** rhythmic pulse below 30% HP, synchronized with HP bar edge pulse
- **Critical event haptic:** distinct long pattern for events like incoming unblockable attack telegraph (if that telegraph type exists per §2), boss phase transition, party-wipe imminent
- Haptic is the channel players cannot look away from and the strongest nudge to close the menu if things are going badly

### Inventory surface response to damage

The inventory surface itself reacts subtly to hits taken:

- **On-hit shake:** the entire inventory overlay translates 2px in a randomized direction for 80ms, returning to position with spring-easing. Subtle — readable text remains readable — but present.
- **Tile grid desaturation at low HP:** when HP drops below 30% while inventory is open, the tile grid desaturates to ~70% of normal color saturation. The surface becomes visually "dimmer" to communicate "you should not be in here right now."
- **Border tint at low HP:** the inventory surface's top border shifts from `rgba(255, 255, 255, 0.15)` to `rgba(200, 60, 60, 0.4)` as an additional edge signal

### Auto-close conditions

Some situations force the inventory surface to close regardless of player input. This is the game's safety valve — you can menu under fire, but the game will not let you die or miss critical moments inside a menu.

**Force-close triggers:**

1. **Player HP hits zero** — death animation takes over; inventory closes before the death overlay appears
2. **Left-joystick input (movement)** — any movement input immediately closes the inventory surface with a 120ms slide-down. This is the primary "I'm back" signal; the player doesn't need a separate close button
3. **Right-joystick input (aim/attack)** — any right-joystick input immediately closes inventory, same 120ms slide-down
4. **Block activation (touch shield icon)** — raising the block closes inventory. The player is committing to defense and cannot be split-attention
5. **Party-critical event** — boss phase transition, party member down (in a 4-player party where you are last up), raid-wide mechanic firing. These auto-close with a brief notification toast on the HUD so the player understands why
6. **Zone transition forced by damage** — if an attack pushes the player across a zone boundary or into a new state (knocked back into water, pulled into an environmental hazard), inventory closes

**Auto-close animation:** 120ms slide-down, restoring full HUD visibility. The player is returned to the world immediately responsive to their input.

### The inventory tooltip under fire

When a tooltip bottom-sheet is open inside the inventory and the player takes damage:

- Screen-edge vignette pulses normally
- HP bars remain visible (they overlay the tooltip sheet too)
- Tooltip sheet itself does not shake (only the underlying inventory grid shakes)
- Auto-close from movement/aim/block closes both the tooltip and the inventory surface in a single transition — not two sequential animations

### What this design costs

A player who wheels out of a fight to inventory-manage will take hits. This is the intended cost. A skilled player will:

- Use shortcuts for reactive needs (no menu-open required)
- Only wheel out in moments of safety — after a clear, between boss phases, at a planned pause
- Use the wheel and inventory efficiently — 3-5 seconds of menu time, not 30

An unskilled player will get hit while menuing and will learn from the consequences. The ambient damage feedback makes this learning fast and legible: the player feels themselves getting hit, sees their HP drop, and closes the menu. No tutorial needed.

### Accessibility considerations

Players with reduced motion preferences or photosensitivity can disable:

- Screen shake on hit (reduce to 0px translation, 0ms duration)
- Red edge vignette (reduce peak opacity to 0)
- Tile grid desaturation at low HP

These are individual toggles in accessibility settings, not a single "reduced motion" flag. The audio and haptic channels are harder to dampen without losing combat legibility; accessibility-sensitive players can still rely on the HP bar and shortcut-edge channels.

---

## Cross-references

- **§1.5** — Progressive UI revelation (layer reveal grammar)
- **§1.7a** — Show the object, not its description (tile and tooltip rendering)
- **§1.7b** — Proximity, density, discipline of enough (banner placement, action button grouping)
- **§1.7c** — Canonical layout and the tooltip layer (surface consistency rules)
- **§1.7d** — The utility wheel (entry point to inventory)
- **§1.7e** — The inventory surface (this spec's source section)
- **§4** — Equipment system (tier, quality, Hardness, Temper, material dimensions used in tooltip)
- **§15** — Combat HUD (shortcut gestures and double-tap edges)
- **§21** — Stat-based visuals (character rendering on inspect card, not the generic silhouette here)
- **§22** — Home Bank and Death-Loss Model (safe vs. at-risk items)

---

## Design notes

This inventory design expresses Brotown's thesis at the UI layer through three commitments: chronological order as the primary organizing principle (using reading conventions the player already has), picture-first rendering with text as supplementary labels, and progressive depth that grows around the player without moving or replacing what they've already learned.

The two-tab structure separates browsing from configuring. Inventory is scanning; Equipped is surveying. The tooltip unifies inspection and action, so a single tap on any tile gets the player to everything they need to know and everything they can do. Search is deliberately quiet because navigation in Brotown is visual-first — the chronological grid does most of the work, and search is the escape valve, not the primary tool.

Shortcut integration across three surfaces (Inventory badge, Equipped slot row, combat HUD edge gestures) creates redundant configuration paths without redundant mental models: the player understands "these two items are my quick-access kit" regardless of which surface they're looking at. The two-slot constraint is tight but not punishing, and endgame multi-purpose items (Resonance Elixir and similar) are designed to fill those slots meaningfully rather than making players choose between necessities.

The layer progression system is the key discipline that keeps the surface usable across the full player lifecycle. A new player with 30 items sees a clean minimal grid with kid-friendly vocabulary. A veteran with 800 items, full marketplace participation, and maxed life skills sees a richer version of the same surface with technical terms, crafter attribution, and market pricing — but the structure and navigation haven't changed. Motor memory carries forward. Visual recognition carries forward. The player grows into the depth that was always there, just hidden.
