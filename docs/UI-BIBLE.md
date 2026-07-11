# BroTown UI Bible (v2.3.1222)

The design law for BroTown's interface, plus the master ChatGPT
image-generation prompt system for producing a consistent icon set.
This document is CURRENT and trusted. (The GDD is early design
thinking — largely stale but a good base for design intent; code and
the owner's word remain authoritative for shipped behavior.) If a UI
decision isn't covered here, follow the priority stack in Part 1 and
add the ruling here in the same PR.

Scope: this Bible governs the **UI layer** — panels, HUD, icons,
chrome. It does not govern world art, sprites, or tilesets (see
`docs/grok-tileset-prompts.md` and `docs/ART-QA.md` for those).

---

## Part 1 — Design law

### The priority stack

Every UI decision resolves in this order. When two goals conflict, the
higher one wins. No exceptions for "but it looks cool."

1. **Instant comprehension** — a player understands any element in
   under 0.2 seconds, without reading.
2. **Minimal screen usage** — the primary platform is iPhone Safari.
   Every pixel of chrome is a pixel of the painterly world we covered up.
3. **Visual hierarchy** — the most important thing on screen is the
   most visually dominant thing on screen.
4. **Consistency** — the same concept always looks the same, everywhere.
5. **Beauty** — emerges from restraint, spacing, and craft. Never from
   added ornament.

### The blur test

Squint at (or blur) a screenshot. You should still identify every
surface — inventory, chat, map, combat controls, shop — purely from
icon silhouettes and layout. If a surface fails the blur test, its icon
or placement is wrong, not the player.

### Apple, not Blizzard

The reference set, in order of relevance:

- **Apple Human Interface Guidelines** — spacing, hierarchy, touch
  targets, restraint.
- **Supercell** (Clash Royale, Brawl Stars) — icon readability at
  tiny sizes.
- **Monument Valley / Alto's Odyssey** — clean visual language,
  elegance through omission.
- **Old School RuneScape mobile** — information density done honestly.
- **LoL: Wild Rift** — mobile action controls.

BroTown's painterly fantasy aesthetic is layered ON TOP of these
principles, never underneath them. The world art does the fantasy; the
UI does the communicating.

### The standing rules

- **The UI almost disappears until you need it.** Thin, quiet frames.
  The world art is the star.
- **Icons, not words.** A label may accompany an icon (small, quiet,
  beneath or beside it) but must never be the primary signal.
- **The item is the hero.** Containers (slots, cards, tiles) never
  visually compete with their contents.
- **~70% less chrome** than a traditional MMO panel. No carved wood,
  no giant gold borders, no decorative corners, no double frames.
- **One job per component.** If a panel does two things, it's two
  panels or one panel with two clearly separated regions.
- **Color is never decorative.** Every color on screen carries the
  meaning assigned in Part 2, or it's a neutral.

---

## Part 2 — Design tokens

These are the values CSS should use. Name them as CSS custom properties
when the client adopts them (e.g. `--ui-parchment`).

### Core neutrals (light & airy)

This palette is a deliberate departure from the current dark-navy
in-game panels. Light surfaces, dark ink, warm undertone.

| Token | Hex | Use |
|---|---|---|
| Chalk | `#FDFBF5` | Raised surfaces: cards, popovers, active tabs |
| Parchment | `#F7F2E8` | Default panel background |
| Bone | `#EFE7D6` | Recessed wells: slot interiors, input fields, track of bars |
| Ink | `#22303C` | Primary text, icon line work — a near-black warm navy |
| Slate | `#68737F` | Secondary text, inactive icons, captions |
| Hairline | `rgba(34,48,60,0.16)` | ALL borders and dividers (1px, never thicker) |
| Brass | `#B08D57` | The accent: active states, selection edges, progression highlights |
| Brass-light | `#D8BE8E` | Brass hover/glint, subtle top-edge highlights |
| Scrim | `rgba(34,48,60,0.35)` | Dimming layer behind modals/sheets |

Rules:
- Panels are Parchment; anything sitting ON a panel is Chalk; anything
  sunk INTO a panel is Bone. Three levels, no more.
- Depth comes from a **soft inner shadow** on Bone wells
  (`inset 0 1px 3px rgba(34,48,60,0.10)`) and a whisper of drop on
  Chalk cards (`0 1px 2px rgba(34,48,60,0.08)`). Never bevels-as-borders.
- Brass is precious. One brass element per component, maximum. If
  everything is brass, nothing is.

### Semantic colors

Color communicates. These are the only meanings color may carry:

| Meaning | Token | Hex | Examples |
|---|---|---|---|
| Information | Info Blue | `#2B6CB0` | Links, tips, neutral system messages |
| Positive | Leaf Green | `#2F855A` | Success, heals, buffs, "online", gains |
| Progression | Gold | `#B7791F` | XP, level-ups, coins, unlocks |
| Danger | Blood Red | `#C0392B` | Damage, HP-low, destructive confirms, PvP threat |
| Magical | Arcane Purple | `#6B46C1` | Enchanting, special charge, magic-school anything |

These are calibrated for legibility on the light neutrals (≥4.5:1 on
Parchment). Never introduce a sixth meaning without adding it here.

### Rarity colors (owner-canonical, 2026-07-10)

The rarity ladder is **Common → Rare → Legendary → Godly**. In code
this is the weapon-quality system (`QUALITY_MULTS`,
`src/data/gameSystems.js:4042`, mirrored in `server/src/gear.js`) whose
identifiers are `normal / rare / elite / godly` — map display names to
code ids exactly as below; do not rename the code fields:

| Display name | Code id | On-light UI color | Note |
|---|---|---|---|
| Common | `normal` | Slate `#68737F` (no special treatment) | the default |
| Rare | `rare` | `#2B6CB0` | same blue family as the shipped tints |
| Legendary | `elite` | `#7C3AED` | same violet family as the shipped tints |
| Godly | `godly` | prismatic — gold base `#B7791F`, highlight `#E8D4A0` | GDD §4.6b "prismatic shimmer"; 1-in-400,000 sacred tier |

Rarity shows as a **2px left edge or thin underline on the slot**,
never as a full glowing border. Godly is the one sanctioned exception:
it keeps a prismatic tile treatment (the existing `godlyBg` +
`#E8D4A0` register in `src/ui/mobile/inventoryStyles.js`) — at
1-in-400k, the loud moment is earned.

NOT rarity: the `RARITY_TIERS` labels Common/Elemental/Fusion/Shift in
`gameSystems.js` are element-count vocabulary (how many elements a
weapon carries), kept as descriptive terms with no ladder meaning —
don't color-code them as rarity.

Resource tiers (the 20-tier gathering ladder,
`src/data/lifeSkills.js` `RESOURCE_TIERS`) keep their existing color
cycle (grey → blue → green → purple → gold → red → violet → gold);
apply the same darken-for-light-surfaces treatment when they appear in
DOM UI. Pet tiers (Base/Evolved/Ascended/Mythic) and amulet tiers
(Simple/Ornate/Regal/Mythic) map positionally onto the rarity ramp
(1st→Common … 4th→Godly prismatic).

### Element colors & shapes (dual-coded)

There are **ten elements** (owner-canonical; GDD §10.1). Each is
identified by **shape + color together** — the shape is the PRIMARY
channel (colorblind-safe, blur-test-safe); color reinforces it. The
icon set must honor both:

| Element | Shape | Color | Status it inflicts |
|---|---|---|---|
| Flame | diamond | `#C0392B` | burn |
| Frost | hexagon | `#2980B9` | freeze |
| Water | circle | `#3498DB` | soak |
| Venom | teardrop | `#27AE60` | root |
| Storm | star | `#8E44AD` | shock |
| Stone | square | `#795548` | fracture |
| Wind | triangle | `#7F8C8D` | slow |
| Flora | leaf | `#2ECC71` | grow (not yet in `STATUS_DEFS`) |
| Dark | trefoil | `#2C3E50` | curse |
| Light | starburst | `#F1C40F` | reveal |

Code note: `src/data/elements.js` currently defines nine of these —
Flora is design-canon but not yet in the data table (the mobile mock
data already references `'flora'`). Design all ten now; adding Flora
to `elements.js` is a future gameplay PR.

### Spacing, radius, and touch

- **4pt grid.** All padding/margins/gaps are multiples of 4px.
  Standard rhythm: 4 (tight), 8 (default gap), 12 (section gap),
  16 (panel padding), 24 (between unrelated groups).
- **Corner radius:** 8px small elements (slots, buttons, pills),
  10px cards, 12px panels/sheets. Nothing else. Perfect circles only
  for the joystick, portraits, and status dots.
- **Borders:** 1px Hairline, always. Rarity edges are the sole 2px
  exception.
- **Touch targets:** 44×44pt minimum for anything tappable (Apple HIG).
  Visuals may be smaller; the hit area may not.
- **Breathing room:** every icon gets padding ≥25% of its own size on
  all sides. Crowding is a hierarchy failure.

### Typography

- **Font:** system stack —
  `-apple-system, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif`.
  Free, crisp, renders natively on iPhone. No fantasy display font in
  the UI layer; the fantasy lives in the art.
- **Scale (px):** 11 caption / 13 body / 15 emphasized / 17 panel
  title. That's the whole scale.
- **Panel titles are small.** The icon is dominant; the word beneath it
  is 13px Slate. `🛡 Equipment`, not `LOADOUT`.
- **Numbers:** `font-variant-numeric: tabular-nums` on anything that
  counts (gold, XP, damage, timers) so digits don't jitter.
- **No ALL-CAPS headers** except 11px letter-spaced captions
  ("micro-labels"), used sparingly.

---

## Part 3 — Component rules

### The inventory slot (the archetype for all containers)

```
┌─────────┐   1px Hairline border, 8px radius,
│         │   Bone fill with soft inner shadow.
│  (item) │   Item art fills ~80% of the slot.
│         │   Rarity = 2px bottom edge in tier color.
└─────────┘   Quantity = 11px Ink, bottom-right, no badge blob.
```

No thick frame, no corner ornaments, no per-slot glow. Selected slot:
Hairline becomes Brass and the fill lifts to Chalk. That's the entire
selected state.

### Panel header

```
──────────────────────────────
 [icon]  Inventory
──────────────────────────────
```

24px icon, 17px Ink title, 1px Hairline rule beneath. Optional single
right-aligned action (e.g. sort). No banner art, no wood beam, no
title plaque.

### Buttons

- **Primary:** Ink fill, Chalk text, 8px radius. One per surface, max.
- **Secondary:** Chalk fill, Ink text, Hairline border.
- **Destructive:** Blood Red fill, only on confirm steps.
- **Quiet:** bare icon, 44pt hit area — the default for toolbars.
No gradients, no bevels, no embossed text.

### Meters (HP / MP / Stamina / XP)

Track: Bone capsule, 1px Hairline, 6–8px tall. Fill: flat semantic
color (HP Blood Red, MP Info Blue, Stamina Gold, XP Leaf Green) with a
1px Brass-light top highlight. No animated shine, no segmented notches
unless the segments MEAN something (e.g. build points).

### The bottom dashboard

The dashboard band stays as architected (`BottomDashboard.jsx`): three
idle columns (Bag / Loadout / Build) + 6-icon toolbar. Restyle rules:
Parchment band, Hairline top edge, active toolbar icon gets a Brass
underline dot — not a glowing box. Panels slide over the band as
Parchment sheets with 12px top radius and a drag handle.

### World-overlap surfaces (chat bubbles, damage popups, wheel, block ring)

Anything drawn OVER the painterly world uses translucent Ink
(`rgba(34,48,60,0.78)`) with Chalk text — the one place dark-on-light
inverts, so overlays read against bright grass and dark caves alike.
Blur/backdrop-filter is banned over the WebGL canvas (iOS Safari
compositing risk — see the charge-pie incident in CLAUDE.md).

---

## Part 4 — Icon asset checklist

Every icon the game needs, from the code as it exists today. Each entry
is written as the **subject line** to drop into the master prompt
(Part 5). Naming: export as `public/icons/ui/<kebab-name>.webp`.

### Sheet A — Toolbar (6) — replaces `BottomDashboard.jsx` toolbar icons

| File | Subject line |
|---|---|
| `nav-inventory` | a drawstring leather satchel, slightly open |
| `nav-friends` | two overlapping round friendly faces in profile |
| `nav-codex` | a thick closed tome with a brass clasp |
| `nav-journey` | a winding path leading to a distant flag |
| `nav-map` | a folded map with a route line and location pin |
| `nav-more` | three horizontal dots in a rounded square |

### Sheet B — Panels & systems (16)

| File | Subject line |
|---|---|
| `panel-stats` | a rising three-bar chart |
| `panel-skills` | a hand gripping three upward arrows fanned like sprouts |
| `panel-encyclopedia` | an open book with a magnifying glass over it |
| `panel-guild` | a heraldic banner hanging from a crossbar |
| `panel-leaderboard` | a laurel wreath around the numeral-free top step of a podium |
| `panel-clan` | a round shield with two crossed banners behind it |
| `panel-chat` | a rounded speech bubble with three dots |
| `panel-settings` | a single clean gear |
| `panel-account` | a key with a round head |
| `panel-feedback` | a quill writing on a small scroll |
| `panel-controls` | a game thumbstick seen at a slight angle |
| `panel-self` | a hand mirror reflecting a sparkle |
| `panel-loadout` | a kite shield with a sword crossing behind it |
| `panel-weapons` | an anvil with three points of light above it |
| `panel-quests` | a rolled scroll sealed with wax |
| `panel-shop` | a market stall awning over a coin |

### Sheet C — Life skills (10) — replaces emoji in `LIFE_SKILLS`

| File | Subject line |
|---|---|
| `skill-woodcutting` | a single-bit felling axe sunk into a small log |
| `skill-fishing` | a fishing rod with its line arcing down into a water ripple |
| `skill-mining` | a pickaxe striking a rock with one gem glint |
| `skill-farming` | a young sprout rising from a mound of tilled soil |
| `skill-cooking` | a steaming pan over a small flame |
| `skill-blacksmithing` | a cross-peen hammer over an anvil with one spark |
| `skill-woodworking` | a hand plane on a wooden board with a curl of shaving |
| `skill-gemcutting` | a faceted gem with a small chisel at its edge |
| `skill-enchanting` | an open palm with a glowing rune floating above it |
| `skill-trapping` | a simple box trap with its door propped on a stick |

### Sheet D — Combat & stats (10)

| File | Subject line |
|---|---|
| `combat-melee` | a straight double-edged sword, point up |
| `combat-bow` | a drawn bow with a nocked arrow |
| `combat-magic` | a gnarled staff topped with a glowing orb |
| `combat-defense` | a round shield face-on with a single boss |
| `stat-power` | a flexed arm |
| `stat-agility` | a feather angled in motion |
| `stat-mind` | a head silhouette with a spark inside |
| `stat-vitality` | a bold heart |
| `stat-endurance` | a lightning bolt inside an outlined circle |
| `stat-defense` | a layered double shield |

### Sheet E — Currencies & meters (6)

| File | Subject line |
|---|---|
| `cur-gold` | a single thick coin with a plain embossed rim, three-quarter view |
| `cur-nugget` | a rough gold nugget with two bright facets |
| `cur-goldbar` | a trapezoid gold ingot |
| `cur-gem` | a cut gemstone, brilliant view from above |
| `cur-xp` | a four-pointed spark |
| `cur-buildpoint` | a plus sign inside a hexagon |

### Sheet F — Elements (10) — MUST use the shape column from Part 2

| File | Subject line |
|---|---|
| `elem-flame` | a diamond shape filled with a flame motif, deep red |
| `elem-frost` | a hexagon filled with a snowflake motif, cold blue |
| `elem-water` | a circle filled with a wave motif, bright blue |
| `elem-venom` | a teardrop filled with a dripping motif, toxic green |
| `elem-storm` | a five-pointed star filled with a lightning motif, violet |
| `elem-stone` | a square filled with a cracked-rock motif, earth brown |
| `elem-wind` | a triangle filled with a swirl motif, grey |
| `elem-flora` | a leaf shape filled with a sprouting-vine motif, fresh green |
| `elem-dark` | a trefoil filled with a void motif, near-black navy |
| `elem-light` | a starburst filled with a radiant motif, warm yellow |

### Sheet G — Status effects (9) — small HUD glyphs

burn (flame wisp), freeze (ice crystal), soak (three droplets), root
(vines gripping a boot), shock (jagged bolt), fracture (cracked
hexagon), slow (hourglass), curse (skull outline), reveal (open eye).
Files: `status-<name>`.

### Sheet H — Buildings (12) — replaces emoji in `buildings.js`

bank (vault door), cook (chef's pot), enchant (rune-carved archway),
exchange (balance scale), farm (barn face), forge (anvil with chimney),
gamble (pair of dice), gemcut (gem on a cutting wheel), tavern
(foaming mug), vendor (awning cart), woodwork (saw on plank), town hall
(bell tower face). Files: `bldg-<name>`.

### Sheet I — Social & events (9)

duel (two crossed rapiers), trade (two hands exchanging a pouch), party
(three raised banners), war (torn war banner), threat (an eye over a
jagged alert triangle), mail (sealed envelope), dungeon (portcullis
gate), pets (a paw print with a heart pad), sponsorship (a coin over
crossed swords). Files: `evt-<name>`.

**Total: ~88 icons across 9 sheets.** Zone shards already exist
(`public/icons/shards/`) — regenerate only if they clash with the new
set.

---

## Part 5 — The ChatGPT master prompt system

The consistency problem: every ChatGPT image generation starts from
scratch, so 88 separate "draw me an icon" requests produce 88 styles.
The fix is a three-layer prompt where **only one line ever changes**,
plus a reference-image anchor.

### The rules that keep generations consistent

1. **Never restyle mid-set.** The STYLE BLOCK and CONSTRAINTS BLOCK
   below are pasted **verbatim, character-for-character** into every
   generation. Only the SUBJECT list changes. If an icon comes out
   wrong, rewrite its *subject line* to be more literal — do not touch
   the style block, do not argue with ChatGPT about style in follow-up
   messages (that drifts the set).
2. **Generate the anchor sheet first.** Sheet A below doubles as the
   style anchor. Once you have a version you love, **attach that image
   to every subsequent generation** with the words "match the exact
   rendering style, line weight, palette, and lighting of the attached
   reference sheet." A picture pins style better than any words.
3. **Batch by family.** Icons that share one generation share one
   style for free. Always generate a whole sheet (grid), never single
   icons. If one cell is bad, regenerate the whole sheet with only that
   cell's subject line edited — with the anchor attached, the rest
   will come back nearly identical.
4. **One chat per sheet, fresh chat each time,** anchor image attached.
   Long conversations accumulate drift.
5. **Accept or reject with the checklist** (below). Don't keep a
   "pretty but off-style" icon — one outlier breaks the whole set's
   credibility.

### THE MASTER PROMPT — copy everything in the box, edit only the SUBJECT GRID

```
Create a single 1024x1024 image: a 3x3 grid of nine separate game UI
icons on a seamless pure white background (#FFFFFF). Each icon is
centered in its own invisible 300px cell with generous even margins.
No grid lines, no cell borders, no labels.

STYLE (apply identically to all nine):
Modern flat game icons with a hand-crafted fantasy warmth — the look
of a premium mobile game, Apple-clean rather than MMO-ornate. Each
icon is ONE clearly readable object, drawn with a uniform dark
warm-navy outline (#22303C, consistent medium weight on every icon),
filled with flat colors in a warm, slightly muted storybook palette,
shaded with exactly one step of soft shadow and one step of soft
highlight, light source upper-left. Small brass-gold accents (#B08D57)
may appear where the object naturally has metal. Shapes are simple,
chunky, and rounded — bold silhouettes that stay readable at 32
pixels. Flat graphic style with gentle painterly fill texture; NOT 3D,
NOT glossy, NOT pixel art, NOT line-art only, NOT photorealistic.

SUBJECT GRID (left to right, top to bottom):
1. <subject line>
2. <subject line>
3. <subject line>
4. <subject line>
5. <subject line>
6. <subject line>
7. <subject line>
8. <subject line>
9. <subject line>

HARD CONSTRAINTS: no text, no letters, no numbers anywhere; no frames
or borders around icons; no drop shadows on the background; no
background tints, gradients, or vignettes — pure flat white between
icons; identical outline weight, palette temperature, and lighting on
all nine icons; every icon roughly the same visual size and weight;
each silhouette must be identifiable when shrunk to 32x32 pixels.
```

For sheets with fewer or more subjects, change "3x3 grid of nine" to
"3x2 grid of six" (Sheet A/E), "5x2 grid of ten" (Sheet F), or "4x3
grid of twelve" (Sheet C/H), adjust the numbered list, and leave
everything else untouched.

### Ready-to-paste subject grids

**Sheet A — Toolbar + anchor (3x2 grid of six).** Generate this FIRST;
it becomes the reference image for every other sheet.

```
1. a drawstring leather satchel, slightly open
2. two overlapping round friendly faces in profile
3. a thick closed tome with a brass clasp
4. a winding path leading to a distant flag
5. a folded map with a route line and location pin
6. three horizontal dots in a rounded square
```

**Sheet C — Life skills (extend the grid line to "4x3 grid of twelve",
use ten subjects + leave the last two cells as: a coiled rope; a
lantern — spares that stay on-style):**

```
1. a single-bit felling axe sunk into a small log
2. a fishing rod with its line arcing down into a water ripple
3. a pickaxe striking a rock with one gem glint
4. a young sprout rising from a mound of tilled soil
5. a steaming pan over a small flame
6. a cross-peen hammer over an anvil with one spark
7. a hand plane on a wooden board with a curl of shaving
8. a faceted gem with a small chisel at its edge
9. an open palm with a glowing rune floating above it
10. a simple box trap with its door propped on a stick
11. a coiled rope
12. a lantern
```

**Sheet F — Elements (change the grid line to "5x2 grid of ten").**
Add this line to the STYLE block for this sheet only, after the brass
sentence: *"Each icon's container shape and dominant color are
specified and mandatory."* Then:

```
1. a diamond shape filled with a flame motif, deep red #C0392B
2. a hexagon filled with a snowflake motif, cold blue #2980B9
3. a circle filled with a wave motif, bright blue #3498DB
4. a teardrop filled with a dripping motif, toxic green #27AE60
5. a five-pointed star filled with a lightning motif, violet #8E44AD
6. a square filled with a cracked-rock motif, earth brown #795548
7. a triangle filled with a swirl motif, grey #7F8C8D
8. a leaf shape filled with a sprouting-vine motif, fresh green #2ECC71
9. a trefoil filled with a void motif, near-black navy #2C3E50
10. a starburst filled with a radiant motif, warm yellow #F1C40F
```

Remaining sheets (B, D, E, G, H, I): take the subject lines straight
from the Part 4 tables into the same template, anchor image attached.

### Acceptance checklist (run per sheet before keeping it)

- [ ] Shrink the sheet to 25% — is every silhouette still identifiable?
- [ ] Same outline weight on all cells? (Reject if one icon is "line-art
      thin" or "marker thick".)
- [ ] Background pure white edge-to-edge, no vignette?
- [ ] Zero text/letters/numbers snuck in?
- [ ] Palette temperature matches the anchor sheet side-by-side?
- [ ] Elements sheet only: shape + color per the Part 2 table?

### From sheet to game files

1. Save the raw sheet PNG to `assets/icons-source/sheet-<letter>.png`
   (same convention as the tileset pipeline).
2. Ask a Claude session to slice it: cells are on a fixed grid, so
   slicing + white-knockout + webp export to `public/icons/ui/` with
   the Part 4 file names is a small scripted job (the repo already has
   `tools/process_grok_tileset.py` as a pattern to copy).
3. Export size: 256×256 webp per icon (displayed at 24–44px, so 256
   covers 3x retina with room to spare).

---

## Part 6 — Adoption notes

**v2.3.1223: the icon set EXISTS.** All 9 sheets were generated
(ChatGPT, per Part 5) and sliced into 90 transparent 256×256 webp icons
in `public/icons/ui/` (prefixes: `nav- panel- skill- spare- combat-
stat- cur- elem- status- bldg- evt-`). Raw sheets:
`assets/icons-source/sheet-<a-i>.png`. Slicer:
`tools/process_icon_sheets.py` (re-run only for regenerated sheets; it
refuses to overwrite existing icons).

Migrating the client to this document is future PRs.
The replacement targets, in rough priority order:

1. **Emoji → icon files** — DONE v2.3.1224: toolbar + CHAR_STATS +
   LIFE_SKILLS (`BottomDashboard.jsx`), `MoreOverlay.jsx`,
   `dash/MorePanel.jsx`, `dash/SkillsPanel.jsx`,
   `dash/InventoryPanel.jsx` empty state, and the building enter-prompt
   (`buildings.js` iconSrc + `BroTown.jsx`). Emoji remain only as
   image-failure fallbacks. The SkillsPanel roster was also corrected
   to the canonical 10 LIFE_SKILLS (it had listed alchemy/tailoring/
   taming, which don't exist).
2. **Token adoption** — STARTED v2.3.1226: Part 2 palette added as
   `--ui-*` custom properties in `src/styles/game.css`; the dashboard
   band, ALL dash panels (via `dash/common.js` COL), and the whole
   inventory family (`inventoryStyles.js` INV, tiles, tooltips, detail
   popup, equipped tab) flipped to Parchment/Ink/Brass. World-floating
   chrome (top-right player card, tooltips over the world) deliberately
   stays translucent Ink per Part 3. Legacy `src/ui/panels/*` still run
   the old dark `--ink/--line` vars — that sweep is step 3.
3. **Component sweep:** slots, headers, buttons, meters per Part 3.

One system per PR, per repo protocol. Keep both UI generations
(`src/ui/mobile/` and legacy `src/ui/panels/`) working during the sweep;
legacy panels get tokens only, not redesigns.
