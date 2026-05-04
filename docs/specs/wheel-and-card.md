# Brotown UI Spec Reference — Utility Wheel + Inspect Card

Complete implementation spec for the utility wheel and the inspect card (player card). All dimensions assume portrait mobile per §15 (~380×760 viewport; 340px content width after margins).

---

## Part 1: The Utility Wheel

### Purpose
Non-combat access to utilities (Inventory, Journey, Map, Social, Self-inspect, overflow via More). The wheel is visible in all non-combat world states; hidden during combat.

### Collapsed trigger (default state)

**Position.** Bottom-center of the screen, between the twin joysticks. Horizontally centered at `x = screen_width / 2`. Vertically at roughly `y = screen_height - 75px` (just above the thumb-reach zone).

**Size.** ~56-60px diameter circle.

**Visual.** The trigger IS a miniaturized version of the open wheel, not an abstract menu glyph. It renders six tiny icons in their actual angular positions at roughly 1:4 scale of the open wheel's icons.
- Subtle ring around the outside, 1-1.5px stroke, color `#888780` at ~50% opacity
- Six small icons positioned at 12, 2, 4, 6, 8, 10 o'clock
- Icon size: ~10px each
- Center of the trigger: empty (the icons ring the edge)
- Background: soft translucent warm tone, `rgba(241, 239, 232, 0.85)` with subtle drop shadow

**Rationale per §1.7a (show the object).** A new player seeing the trigger immediately understands *"there's a menu with six things here."* A returning player recognizes their own customized tool configuration at a glance.

### Trigger summary badge

**Purpose.** Summarize numbered badges across all wheel slots including More overflow.

**Visual.** Small red pill at top-right of the trigger, ~16×12px.
- Background: `#E24B4A`
- Text: white, 9px monospace, centered
- Shows sum of all numbered badges from all wheel slots
- Does NOT include dot-only badges in the count
- If total count is 0, the pill does not render at all

**Static, never animated.** No pulse, no breathe, no flash. Pulsing badges perform at the player; static badges acknowledge the content.

### Open wheel (expanded state)

**Activation.** Tap the collapsed trigger. Dismiss by tapping the center X, or tapping outside the wheel area.

**Transition.** The six tiny icons on the trigger scale up (~4x) and translate outward to their full positions. Transition is continuous (not a state-change); ~0.25s with ease-out.

**Structure.** 360° ring of six slots at clock positions:
- **12 o'clock** — default: Inventory
- **2 o'clock** — default: Journey
- **4 o'clock** — default: Map
- **6 o'clock** — **More** (FIXED, cannot be customized)
- **8 o'clock** — default: Social
- **10 o'clock** — default: Self-inspect

Only the five non-6-o'clock slots are customizable. The player learns once: *"bottom of the wheel is everything else."*

**Customization.** Long-press any non-More slot to open a swap picker. Swap-in-place, not drag-to-reorder — the player doesn't re-learn angular positions per session.

**Slot dimensions.**
- Wheel outer radius: ~110-120px from center
- Each slot's tappable area: ~56-64px diameter circle
- Slot icon: ~32px centered in the slot
- Slot labels below each icon in 10px sans-serif

**Center dismiss.** Small X icon at the wheel's center, ~24×24px tap area, color `#888780`. Tapping dismisses the wheel.

**Slot backgrounds.** Neutral warm tone, `#F1EFE8`, with a 1.5px border in `#E2DCC8`. On tap/press, slot inverts to dark `#2C2C2A` with white icon.

**Position of open wheel.** Centered horizontally on the screen; vertically positioned so the bottom of the wheel touches roughly `y = screen_height - 40px`. The wheel's center sits at approximately `y = screen_height - 140px`, leaving the top ~2/3 of the screen dimmed but visible.

**Background when open.** Slight dim overlay behind the wheel, `rgba(30, 51, 40, 0.4)` — lets the world remain faintly visible without competing for attention.

### Per-slot notification badges (on the open wheel)

Each slot can independently carry one of three states:

**Numbered badge** — red pill at top-right of slot, same visual grammar as trigger summary badge but positioned on individual slots. Shows a specific action-required count. E.g., "3" unread messages, "2" quest steps awaiting acknowledgment.

**Dot-only badge** — small red dot (no number) at top-right of slot, ~8px diameter, `#E24B4A`. Ambient signal: something new but no deadline. E.g., a new Codex entry, a friend came online, a cosmetic became available.

**No badge** — default. Most activity does not warrant any badge. Every drop, every zone entered, every passively-accumulated Codex entry must not produce a signal.

### Color and typography canon

- Primary background: `#F1EFE8` (warm beige)
- Border/divider: `#E2DCC8`, `#D3D1C7`
- Text primary: `#2C2C2A`
- Text muted: `#888780`, `#B4B2A9`
- Badge red: `#E24B4A`
- Sans-serif: system sans (SF Pro / Inter / Roboto)
- Monospace: ui-monospace

### Applicability

The wheel handles non-combat utility access. NOT used for:
- In-session combat actions (joysticks, shield button, weapon swap per §15)
- Context-specific interactions at crafting stations, NPCs, gather nodes (contextual surfaces)
- Full-screen menus reached through the wheel itself (own layout grammars)

### Default tool set

On first run, five customizable slots hold:
- Inventory (12 o'clock)
- Journey (2 o'clock) — opens Journey Log
- Map (4 o'clock) — zone/world map
- More (6 o'clock) — full tool library (fixed)
- Social (8 o'clock) — friends, clan, recent interactions
- Self-inspect (10 o'clock) — opens own inspect card

---

## Part 2: The Inspect Card (Player Card)

### Purpose
Canonical social surface showing "who is this Bro." Same structure for every player; content varies. Self-view (Self-inspect from wheel) and other-view (tap another player) use the same layout.

### Overall dimensions

**Total width.** 340px (mobile portrait content width).

**Compressed state total height.** ~540-580px. Fits on screen without scroll.

**Expansion.** Tap any section to expand inline. Expanded section shows full detail without collapsing neighbors. The whole card becomes scrollable when sections are expanded.

### Section order (canonical, v14.0.7)

Six sections, general-identity-to-specific-accumulation, grouped by identity type (combat → crafting → history):

1. **Identity band** — top
2. **Combat** (with Vows nested inside expanded view)
3. **Carrying**
4. **Skills** (life skills)
5. **History**
6. **Journey**

Sections never disappear; if a player has none of section X's content, render a placeholder. *"(no vows yet)"*, *"(no titles yet)"*. Absence is itself identity information.

### Section 1: Identity Band

**Height (compressed).** ~130-140px.

**Layout.**
- Left: character silhouette, ~80×100px, rendered with pole halo (colored glow matching player's alignment)
- Right of silhouette: stacked info
  - Line 1: **Name** in canonical serif, 16px, `#2C2C2A`, bold
  - Line 2: **Level · Archetype · Pole** in sans-serif, 11px, `#5F5E5A`
  - Line 3: **Clan tag** in sans-serif, 10px, `#888780` (if in clan)
  - Line 4: **Current quest line** — sans-serif with forward-indicator glyph (arrow or compass, 10px), text in 11px
  - Line 5: **Recent Journey line** — italic serif, 11px, with NPC quote formatting if applicable (italicized, sometimes with quote marks)

**Top-right of band:** optional purchased logo (player's cosmetic mark), ~36×36px. Canonical position — structure stable, only content varies.

**Pole halo colors.**
- Light: pale gold
- Dark: deep violet-black
- Flame: warm orange-red
- Flora: saturated green
- (others per §3.1 element colors)

**Visual differentiation of the two state lines.**
- Quest line (forward-intent): sans-serif + arrow/compass glyph, action register
- Recent Journey line (backward narrative): italic serif + quote formatting, narrative register
- Different fonts + glyphs + color weights so readers parse distinction automatically

### Section 2: Combat

**Height (compressed).** ~90-100px.

**Compressed display.** Five Tier 1 stats as colored tiles in a horizontal row:
- Power `#378ADD` (blue)
- Vitality `#E24B4A` (red)
- Endurance `#639922` (green)
- Agility `#EF9F27` (amber)
- Mind `#7F77DD` (violet)

Each tile:
- Width: ~60px
- Height: ~44px
- Icon at top (stat glyph): ~16px
- Number (stat value): 16px monospace, centered
- Background: stat's canonical color at 20% opacity
- Border: 1px of the stat's full color

Below the five tiles, a horizontal **stacked distribution bar** (8px tall) showing proportional build shape — the sum of all five stats split proportionally across the bar, each colored its stat color. Communicates "build shape" at-a-glance.

**Archetype label** sits above the stats strip: sans-serif small caps, 10px, letter-spacing 0.12em, `#888780`. E.g., "BERSERKER", "SCHOLAR", "BALANCED."

**Expanded state.** Each tile enlarges; Tier 2 specs appear:
- Power → Ferocity (crit chance % and mult)
- Vitality → Fortification (HP bonus)
- etc.

**Vows nested inside expanded Combat.** Vow sigils appear adjacent to the stat they modify. E.g., a Power vow sigil appears next to Power's expanded tile with the vow duration (*"vowed 46 days · with Mason"*). If no vows: *"(no vows yet)"* inline.

### Section 3: Carrying

**Height (compressed).** ~100-120px.

**Layout.** Row of three tiles plus pet tile:
- Weapon (currently active) — ~80×80px tile rendering the weapon as an object per §1.7a
- Armor — ~80×80px tile
- Pet — ~60×60px tile

Each tile shows the actual object, not an icon:
- Weapon: rendered blade/bow/staff with visible gems in corners of the guard (Flame gem = orange dot, Frost = blue dot, etc.), craftsman's mark visible if zoomed
- Armor: rendered silhouette of the armor
- Pet: small rendered creature

**Background of tiles.** `#F1EFE8` with subtle border.

**Gem indicators on weapon.** Small colored dots (~5px) in the top-right corner of the weapon tile, one dot per equipped element.

**Tooltip on long-press** reveals: full name, tier, hardness count, Temper level, craftsman, any special status (Godly, Volatile, etc.).

### Section 4: Skills (Life Skills)

**Height (compressed).** ~80px.

**Layout.** 5×2 grid of ten skill tiles:
- Cooking · Fishing · Farming · Blacksmithing · Gem Cutting
- Alchemy · Woodworking · Tailoring · Taming · Scribing

Each tile:
- ~60×32px
- Icon top-left (16px skill glyph)
- Rank number top-right (14px monospace; e.g., "42", "99")
- Uniform white fill `#FFF`; no color gradient (rank encoded as number)
- No label on tile (label in tooltip)

**No stacked bar below** (unlike Combat) because skills are not an allocation shape — each skill grows independently to 99; players don't divide a shared pool.

**Expanded view** shows labeled list with guild emblems where applicable (e.g., Blacksmithing rank 80+ shows the Guild emblem).

### Section 5: History

**Height (compressed).** ~50-60px.

**Compressed display.**
- Displayed title (player's choice of current title) — serif, 14px, `#2C2C2A`
- Small row of recent capstone branch indicators (colored pills, max 3-4)
- Zone clear count · Apex kill count — monospace, 10px, muted
- Ascendant star (if earned) — small gold star at right edge

**Expanded.** Full list of earned titles, all completed capstone branches with register coloring, zone clear map (which zones), Apex kill log.

### Section 6: Journey

**Height (compressed).** ~40-50px.

**Compressed display.**
- Entry count — "142 entries" in monospace
- Folklore line (if accreted) — single italic serif line, quietly presented
- Tap-target chevron to open full log

**Recent-entries teaser has been removed (v14.0.7).** The recent Journey line now appears in the Identity band. This section is purely historical.

**Expanded.** Full Journey Log browser. Chronological entries in the player's italic serif voice. NPC quotes in quote formatting. Dates as day-numbers on this server.

### Compression and expansion grammar

**Compressed default.** Every section renders in compressed form by default. Each section occupies one row or a small compact element showing the section's *shape* rather than its full detail.

**Expansion on tap.** Tapping any section expands it to full detail. Expansion does NOT collapse neighboring sections. The card becomes scrollable when sections are expanded.

**The test.** *Can the reader see the subject's entire six-dimensional identity at a glance, without scrolling?* If yes, compression works. If expanding one section fills the screen with one dimension, rebalance.

**Comparison works at compressed level.** A player scanning fifty cards reads the compressed form of each. The card's shape — compressed-form silhouette of all six sections stacked — is the comparable unit. Mason (heavy Skills, thin Combat) reads visibly different from Alice (heavy Combat, moderate Skills) without either expansion.

### Canonical layout discipline

**One layout per surface type.** Every inspect card uses the same section order across every player. Player cannot change *where sections appear* — they can only change *what is in their sections* (which vows, which weapons, which title).

**Exception: the three customizable Identity band elements.**
- Purchased cosmetic logo (top-right of Identity band, canonical position; content varies)
- Displayed title choice (player picks from earned titles which appears current)
- Pinned vow, weapon, or clan (structural expressions in canonical section, foregrounded by choice)

In all three: *position* is canonical; *content at that position* is the player's choice. Preserves comparison while allowing expression.

### Tooltips

**Discoverability.** Mobile: long-press any named term, number, or object. Desktop: hover.

**First-time teaching.** On first inspect-card open, small one-time hint: *"long-press any name or number to learn more."* Dismissed on first successful long-press.

**Tooltip content rules.**
- 1-3 sentences maximum. Not paragraphs.
- Permitted: mechanical explanation of named term, precise numerical values hidden from surface, rarity context, historical context.
- Not permitted: identity information, primary state, load-bearing context (anything that changes the meaning of what you're looking at).
- If removing a tooltip destroys comprehension, the surface is underdesigned and the tooltip is covering for it.

**Visual aids in tooltips** permitted when they place a term in a bounded meaningful set (e.g., "Light is one of five poles" shown as five dots with Light highlighted). Small, quiet, secondary to text.

### Stat colors (canonical)

- Power: `#378ADD` (blue — cold metal; measured force)
- Vitality: `#E24B4A` (red — lifeblood)
- Endurance: `#639922` (green — hardy constitution)
- Agility: `#EF9F27` (amber — quickness)
- Mind: `#7F77DD` (violet — mental acuity)

These colors appear on the stat tiles, in the Combat stacked distribution bar, and anywhere stat-identity needs visual encoding.

### Fonts

- **Serif** (for Identity band name, Journey entries, folklore lines, Naming sentences): EB Garamond / Cormorant / canonical game serif
- **Sans-serif** (for structural labels, quest lines, UI chrome): system sans (SF Pro / Inter / Roboto)
- **Monospace** (for numbers, counts, day-numbers): ui-monospace / SF Mono / JetBrains Mono

### Sizing summary

| Element | Width | Height |
|---|---|---|
| Card total | 340px | 540-580px (compressed) |
| Identity band | 340px | 130-140px |
| Combat section (compressed) | 340px | 90-100px |
| Combat stat tile | ~60px | ~44px |
| Carrying section | 340px | 100-120px |
| Weapon/armor tile | ~80px | ~80px |
| Pet tile | ~60px | ~60px |
| Skills section | 340px | ~80px |
| Skill tile | ~60px | ~32px |
| History section (compressed) | 340px | 50-60px |
| Journey section (compressed) | 340px | 40-50px |

### Color palette summary (both surfaces)

- Primary background: `#F1EFE8`
- Card background: `#FFF`
- Dividers: `#E2DCC8`, `#D3D1C7`
- Text primary: `#2C2C2A`
- Text muted: `#5F5E5A`, `#888780`
- Text very muted: `#B4B2A9`
- Stat colors: Power `#378ADD` / Vitality `#E24B4A` / Endurance `#639922` / Agility `#EF9F27` / Mind `#7F77DD`
- Badge red: `#E24B4A`
- Dark nav bar background: `#1E3328`
- Dark nav text: `#FFF` with `#9DA89B` muted

---

## Part 3: Implementation checklist

### Wheel
- [ ] Collapsed trigger renders at bottom-center between joysticks, ~58px circle
- [ ] Trigger shows six tiny icons in their actual angular positions (miniature of open wheel)
- [ ] Trigger carries single summary badge (numbered only, no dot inflation)
- [ ] Badges are static (no pulse, breathe, flash)
- [ ] Tapping trigger expands wheel with continuous 0.25s scale-translate transition
- [ ] Open wheel has six slots at 12/2/4/6/8/10 o'clock
- [ ] 6 o'clock is permanently "More" — not customizable
- [ ] Other five slots customizable via long-press → swap picker
- [ ] Center X dismisses wheel; tap outside dismisses
- [ ] Three badge tiers working (numbered/dot/none)
- [ ] Wheel hidden during combat; visible in all non-combat states
- [ ] Background dim when wheel open

### Inspect card
- [ ] Six sections in canonical order (Identity/Combat/Carrying/Skills/History/Journey)
- [ ] Sections never disappear; empty states use placeholder text
- [ ] Compressed form fits on screen without scroll (~540-580px)
- [ ] Any section expands in place on tap without collapsing neighbors
- [ ] Identity band carries quest line (sans-serif + glyph) and recent Journey line (italic serif + quote formatting)
- [ ] Five stats rendered as colored tiles with stacked distribution bar below
- [ ] Vows nested inside expanded Combat view, not separate top-level section
- [ ] Carrying renders weapon/armor/pet as objects per §1.7a, not icon abstractions
- [ ] Weapon tiles show gem dots in corners matching equipped elements
- [ ] Skills render as 5×2 grid, uniform white, rank number only
- [ ] History and Journey are purely retrospective
- [ ] Tooltips long-press activate, 1-3 sentences max
- [ ] First-time tooltip discoverability hint on first card open
- [ ] Stat colors used consistently (Power blue, Vitality red, Endurance green, Agility amber, Mind violet)
- [ ] Pole halo on silhouette matches player's alignment
- [ ] Top-right of Identity band holds optional purchased cosmetic logo (canonical position)

---

## Cross-references in the full doc

- **§1.7a** — Show the object, not its description
- **§1.7b** — Proximity, density, discipline of enough
- **§1.7c** — Canonical layout and tooltip layer
- **§1.7d** — The utility wheel (this spec's source)
- **§1.7e** — The inventory surface
- **§1.8** — The fracture (cosmological ground)
- **§15** — Portrait orientation + combat HUD
- **§22** — Home Bank and Death-Loss Model
- **§385-387** — Restraint as design, acknowledgment not celebration
