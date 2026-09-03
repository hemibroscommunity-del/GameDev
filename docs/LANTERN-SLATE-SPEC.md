# Lantern Slate — UI Design System (v2.3.1240)

The owner-approved UI direction, authored via ChatGPT from the full UI
spec + screenshots of both prior themes (dark navy "legacy" and the
light-beige experiment). This REPLACES the "light & airy" palette in
`docs/UI-BIBLE.md` Part 2; the Bible's Part 1 design law, icon
checklist, and prompt system remain in force. Where this doc and the
Bible disagree on visuals, THIS doc wins.

North star: **the world is the illustration; the interface is the
field kit** — dark mineral structure, precise spacing, warm storybook
cues, almost no decoration. ~85% neutral / ~10% content color / ~5%
brass accent.

## Hard locks

- The painterly world stays the brightest, most saturated thing on
  screen. The band is a neutral slate tray with deep, quiet wells.
- Band stays exactly 33dvh (v2.3.1258, owner directive — was 28dvh;
  one-third of the viewport is the hard ceiling); toolbar stays inside it.
- The 90-icon set is retained unchanged (no repaint/recolor).
- All chrome is CSS. No baked panel art, carved wood, leather,
  parchment, filigree, decorative corners.
- No backdrop-filter/blur (iOS Safari). World overlays use
  opaque-enough translucent fills.
- Brass = focus/selection/premium ONLY — never a default border color.
- The red-leather bag texture (`bag-bg.webp` backgrounds) is removed
  everywhere.

## Core surface tokens

| Token | Value | Role |
|---|---|---|
| band-top | `#253239` | top of band gradient |
| band-mid / panel | `#202C32` | primary structural surface |
| band-bottom | `#172126` | bottom of band gradient |
| panel-strong | `#182227` | header strips, nested structure |
| raised | `#2B3940` | actionable card, selected module, buttons |
| raised-high | `#34444B` | elevated emphasis |
| well | `#121B20` | bag tray, input trough, bar track |
| well-soft | `#19252A` | empty slot, quiet stat cell |
| slot (occupied) | `#243137` | filled item/equipment slot base |
| toolbar | `#10181D` | separate darkest lower shelf |
| icon plate | `#A2AAA5` → `#7F8A89` | legacy token; not used by the approved ribbon |
| icon plate active | `#D8C69F` → `#BDA16E` | legacy token; replaced by a brass edge |
| dashboard tray | `#2E4754` | lighter shared field behind the three modules |
| dashboard panel | `#10222A` | Bag / Loadout / Build functional wells |
| dashboard ribbon | `#10232A` | inset navigation ribbon |
| dashboard button | `#1A2D36` | quiet beveled toolbar target |
| dashboard button active | `#162A33` | pressed/selected toolbar target |
| dashboard text | `#F2F3EF` | crisp dashboard titles and navigation labels |
| dashboard text secondary | `#DDE3E1` | slot and metric labels |

## Text / edges / interaction

| Token | Value | Role |
|---|---|---|
| text-1 | `#F7F2E7` | names, values, active labels |
| text-2 | `#B9C1BF` | body, inactive labels |
| text-3 | `#96A2A0` | captions/metadata only |
| disabled | `#687575` | disabled marks, never body copy |
| border | `rgba(238,242,235,.14)` | normal 1px boundary |
| border-strong | `rgba(238,242,235,.24)` | floating world cards |
| divider | `rgba(238,242,235,.10)` | module separation |
| edge-warm | `rgba(229,202,157,.28)` | warm top edge on the band |
| accent (lantern brass) | `#D8A85F` | selection, premium, primary action |
| accent-pressed | `#B88643` | pressed primary |
| accent-fill | `#3B3427` | subtle active bg on dark |
| focus ring | `#F0C878` | 2px focus / selected inner ring |
| text-on-accent | `#20170D` | text/icon on brass buttons |

## Semantic + rarity

HP `#D95C54` · Mana `#4D86D5` · Stamina `#D8A94D` · XP `#61B06B` ·
Positive `#59BF91` · Info `#5D93D2` · Magic `#9A76D3`

Rarity is a thin EDGE language, never a tile fill: Common 1px
`#8B9695` @55% · Rare 2px `#5B99DE` (+8% static glow) · Legendary 2px
`#A477DF` (+10% static glow) · Godly 2px animated conic edge
`#F0C45F → #FFF1A8 → #B580E8 → #74D9D2` (3.2s linear sheen, 18% glow;
the only allowed perpetual animation; disable under
prefers-reduced-motion). Selection = separate 2px inner `#F0C878`
ring so a selected Rare still reads Rare.

## Depth & shape

Radii: band top 14 · panel 14 · card/module 10 · slot/stat cell 8 · icon
plate 10 · button 11 · pill 999. Shadows:

```css
--shadow-band:   0 -10px 24px rgba(6,10,12,.22);
--shadow-panel:  0 14px 30px rgba(4,7,9,.38);
--shadow-raised: inset 0 1px 0 rgba(255,255,255,.08), 0 6px 14px rgba(5,8,10,.18);
--shadow-well:   inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035);
--shadow-pressed:inset 0 3px 7px rgba(0,0,0,.46);
--shadow-icon:   drop-shadow(0 1px 0 rgba(255,255,255,.18)) drop-shadow(0 2px 3px rgba(0,0,0,.22));
```

Optional 64×64 neutral noise tile at 3.5% soft-light on the band (2%
raised/toolbar, none in wells); ±6/255 max variation. Never on text,
icons, slots, world cards, or bars.

## Typography (Source Sans 3; load 400/600/700 only)

Panel title 13/700 uppercase .10em · module header 11/600 uppercase
.12em · zone 12/600 · toolbar label 10.5/600 (title case) · body
13.5/400 · compact 12/400 · primary value 14/700 tabular · large value
18/700 · caption 10/600 · badge 10/700 · button 13/700. Tabular
numerals on every changing value. Uppercase only for titles/headers/
short category labels.

## Dashboard (§8 — v2.3.1240 approved structure)

The 33dvh band (v2.3.1258) is a lighter `#2E4754` slate tray with a 14px rounded
top edge and a tight, crisp contact shadow against the world. Its idle
body contains three equal `#10222A` functional wells, separated by 6px
gutters. The wells—not rules, title underlines, textures, or accent
colors—make Bag, Loadout, and Build legible as three different
functions. Each well has a 10px radius and a quiet 1px blue-slate
bridge boundary that blends into the tray instead of forming a dark
double rim. There are no vertical dividers.

- **Bag (equal third, deepest/quietest):** one dark well with a quiet
  inset edge and 4px content padding; 3×3 cells — empty `#19252A` + 1px
  `rgba(238,242,235,.08)`, NO bright centers; filled cells get a
  radial "mist" (`rgba(238,240,225,.16)` center → transparent 76%)
  over `#243137`. The whole module is one tap target → opens
  Inventory. Stack counts 10/700 bottom-right, dark 2px text shadow.
- **Loadout (equal third):** the common well and slot states supply
  hierarchy; there is no extra lift, accent fill, or thick frame.
  Metric strip DMG/DPS/DEF: 14/700 values, 9/600 labels. SIX slots in
  2×3 (chest, weapon, shield, legs, amulet, cape); empty = 24px ghost
  glyph at 28% opacity, NOT text placeholders; equipped edge shows
  rarity; inspected slot adds the inner focus ring.
- **Build (equal third, flat readout):** six cells `#19252A`, icon 28–30px
  over 14/700 tabular value; zeros visible in `#B9C1BF`; no outer
  card, no blue frame.

## Toolbar (§9)

The toolbar is visually separate from the dashboard modules: a single
inset `#10232A` ribbon on the lighter slate tray, with a 10px radius and
a tight one-pixel contact shadow. Inside are six equal `#1A2D36`
targets. Each target gets a restrained vertical one-pixel micro-bevel and 8px
radius so it reads immediately as a button without competing with the
world. Pressed: reverse the bevel and scale .97 for 90ms. Selected:
`#162A33` fill plus one-pixel brass edge and reversed bevel—never a
solid accent fill. Labels are 10.5/600 near-white at rest.

The default always-on dashboard is home, not a toolbar destination, so
all six targets are unselected in that state. The first destination is
named **Inventory**; **Bag** names only the dashboard's quick preview.
Opening Inventory, Friends, Codex, Journey, Chat, or More selects that
button; tapping an already-selected sheet destination returns home.

Panels open inside the ribbon (toolbar stays visible): header 44px
(back 44pt / centered 13/700 uppercase title / close 44pt), panel bg
`#202C32`, groups separated by spacing not cards. Segmented tabs 36px
on `#121B20` track, active segment `#2B3940` + 2px brass bottom edge.
Chips 32px/999px, selected = brass-fill `#3B3427` + brass label.

## World HUD (§10)

Same neutral language, higher opacity. No blur anywhere.

- **Player card:** compact 132×58 horizontal; radius 12; gradient
  `rgba(35,48,57,.94) → rgba(17,25,29,.94)`; 1px strong border; 40×40
  portrait (8px radius, 6px inset) with a 7px `#59BF91` presence dot
  (2px `#202C32` keyline); name 13/700 `#F7F2E7`; "Lv 1" 10/600
  `#B9C1BF`; gold = 18px icon + 14/700 tabular; XP = 3px `#61B06B`
  strip flush to the card's inner bottom. **Delete the hanging
  "1 online" pill** — presence dot on the portrait; friend count moves
  to a Friends badge later.
- Back/zone button 44×44 circle `rgba(17,25,29,.88)` + strong border.
- Toasts: max 286px, 12px radius, `rgba(17,25,29,.94)`, left-aligned,
  16px above the band.
- Joysticks: outer 104px `rgba(17,25,29,.28)` + 1px
  `rgba(247,242,231,.18)`; thumb 46px `rgba(17,25,29,.48)`; whole
  control .62 opacity at rest, .92 engaged. No texture.
  - **v2.3.2246 — CONTEXTUAL, ABOVE THE LADDER.** Owner: "Hide the
    joystick overlays. Just show the left joystick when you're moving
    the character. Just show the right contextual button when there's
    input that can be interacted with."  Neither control is on the
    world at rest any more. Each corner box (`.bt-joystick-zone`,
    `.bt-rjoy-zone`) carries a BINARY 0/1 opacity gate that
    BroTown's per-frame resolver drives; the rest/engaged ladder above
    is unchanged and lives, as before, on the sprite inside. Binary on
    purpose — v2.3.1233b is on record for a fractional container
    opacity multiplying with the sprite's own and producing a rest
    value nobody chose.
    - LEFT visible while a thumb drives movement, while the
      weapon-swap preview window is open, or while onboarding holds it.
    - RIGHT visible when a press would do something: a monster inside
      the targeting perimeter, a lock held, a resource in reach, a
      harvest running — plus a 400ms linger, because candidacy is a
      hard 220px test and a monster pacing that boundary would
      otherwise strobe the button.
    - Hidden means **not pressable**: the right disc is the touch
      target, and an opacity-0 element still takes taps, so the
      resolver switches its `pointer-events` with the box's opacity.
    - Onboarding takes an explicit HOLD (`game/controlVisibility.js`)
      for the side it is ringing. A hidden box still answers
      `getBoundingClientRect`, so without the hold a coach mark would
      ring empty air and report success (TRAPS §41).
- Modal scrim `rgba(8,16,20,.56)`.

## Bars

Track `#0B1216`, radius 999, inner shadow `0 1px 2px rgba(0,0,0,.55)`.
Fill = flat semantic color + vertical light overlay
`linear-gradient(180deg, rgba(255,255,255,.20), transparent 55%)`.
Player-card XP 3px · compact HUD 8px · panel meter 10px · boss 12px.
Value transitions 180ms; HP may show a 320ms delayed loss trail.

## Buttons & components

Primary `#D8A85F` bg + `#20170D` text, 44px min, 11px radius (pressed
`#B88643`, scale .98). Secondary = raised gradient + hairline + text-1.
Quiet = transparent + text-2, pressed 5% white overlay. Destructive
`#7C3431` bg / `#FFF1EE` text / 1px `#C7655F`. Inputs `#121B20`, 44px,
focus 2px `#F0C878` ring, caret `#F0C878`.

## Motion

90ms press · 140ms fast · 180ms standard · 220ms panel · 320ms reward
(`cubic-bezier(.2,.8,.2,1)`; reward `.16,1,.3,1`). No ambient pulsing
except finite alerts and the Godly sheen. Press feedback starts on
pointerdown. prefers-reduced-motion removes shimmer/overshoot/nudge.

## Canonical token blocks (paste-ready)

```css
:root {
  color-scheme: dark;
  --ui-band-top: #253239;  --ui-band-mid: #202C32;  --ui-band-bottom: #172126;
  --ui-panel: #202C32;  --ui-panel-strong: #182227;
  --ui-raised: #2B3940;  --ui-raised-high: #34444B;
  --ui-well: #121B20;  --ui-well-soft: #19252A;  --ui-slot: #243137;
  --ui-toolbar: #10181D;
  --ui-dashboard-tray: #2E4754;  --ui-dashboard-panel: #10222A;
  --ui-dashboard-ribbon: #10232A;  --ui-dashboard-button: #1A2D36;
  --ui-dashboard-button-active: #162A33;
  --ui-dashboard-text: #F2F3EF;  --ui-dashboard-text-secondary: #DDE3E1;
  --ui-world-overlay: rgba(17,25,29,.94);
  --ui-modal-scrim: rgba(8,16,20,.56);
  --ui-band: linear-gradient(180deg, #253239 0%, #202C32 46%, #172126 100%);
  --ui-raised-gradient: linear-gradient(180deg, #304047 0%, #2B3940 100%);
  --ui-toolbar-gradient: linear-gradient(180deg, #131D22 0%, #10181D 100%);
  --ui-world-card: linear-gradient(180deg, rgba(35,48,57,.94), rgba(17,25,29,.94));
  --ui-text-1: #F7F2E7;  --ui-text-2: #B9C1BF;  --ui-text-3: #96A2A0;
  --ui-disabled: #687575;  --ui-text-on-accent: #20170D;
  --ui-border: rgba(238,242,235,.14);  --ui-border-strong: rgba(238,242,235,.24);
  --ui-divider: rgba(238,242,235,.10);  --ui-edge-warm: rgba(229,202,157,.28);
  --ui-accent: #D8A85F;  --ui-accent-pressed: #B88643;  --ui-accent-fill: #3B3427;
  --ui-focus: #F0C878;
  --ui-hp: #D95C54;  --ui-mana: #4D86D5;  --ui-stamina: #D8A94D;  --ui-xp: #61B06B;
  --ui-positive: #59BF91;  --ui-info: #5D93D2;  --ui-magic: #9A76D3;
  --radius-panel: 14px;  --radius-card: 10px;  --radius-slot: 8px;  --radius-button: 11px;
  --toolbar-h: 68px;  --module-pad: 8px;  --grid-gap: 4px;
  --ease-ui: cubic-bezier(.2,.8,.2,1);  --ease-reward: cubic-bezier(.16,1,.3,1);
  --t-instant: 90ms;  --t-fast: 140ms;  --t-standard: 180ms;  --t-panel: 220ms;
}
```

```css
/* inventory */
--slot-empty: #19252A;  --slot-occupied: #243137;
--slot-border-empty: rgba(238,242,235,.08);
--slot-border-filled: rgba(238,242,235,.18);
--slot-mist-center: rgba(238,240,225,.16);  --slot-mist-mid: rgba(238,240,225,.05);
--rarity-common: #8B9695;  --rarity-rare: #5B99DE;  --rarity-legendary: #A477DF;
--rarity-godly: #F0C45F;  --rarity-godly-hot: #FFF1A8;
--rarity-godly-violet: #B580E8;  --rarity-godly-cyan: #74D9D2;
--slot-selected: #F0C878;  --slot-equipped: #D8A85F;
--slot-invalid: #D95C54;  --slot-new: #D8A85F;
--slot-cooldown-mask: rgba(5,9,11,.58);
```

## Delivery order (from the spec, tracked here)

1. ✅ v2.3.1227: token flip (shared + inventory), band skeleton
   (gradient, warm top edge, dividers), Bag tray / Loadout lift /
   Build cells, toolbar shelf + icon plates, compact player card,
   red-leather removal.
2. ✅ v2.3.1228: rarity edge system (1px common / 2px rare+ / conic
   Godly ring `.ls-slot--godly` in game.css, @property-animated with
   static fallback + reduced-motion off), occupied radial mist fill,
   icon drop-shadow, NEW brass dot, equipped brass corner notch.
   Cooldown / drag / invalid-drop states deferred — no runtime
   surface exists for them yet.
3. ✅ v2.3.1229–1233: panel header 44px; persistent lit toolbar
   (tapping the lit icon toggles home); red leather fully removed.
   v2.3.1232 (the ~55-file craftsmanship sweep): EVERY panel rebuilt
   on the §9/§12 kit — 44px rows, segmented tabs, chips, wells, brass
   primaries, destructive treatments, empty states, icon identities.
   v2.3.1233: floating widgets (chat bubble/launcher, inspect card,
   mastery toasts, controls tutorial, More sheet) on the world-card
   language + joystick rest-opacity ladder. The joystick .92 ENGAGED
   opacity step shipped in the v2.3.1233 follow-up: the move handlers
   in BroTown.jsx stamp base opacity .92 on touch, and the existing
   end handlers restore the .5 rest value.
4. ✅ v2.3.1230 (legacy sweep): the legacy CSS variable set
   (--ink/--line/--pop/--txt/--gold/...) in game.css now carries
   Lantern Slate values, flipping every legacy panel
   (src/ui/panels/* + buildings) off navy/indigo in one move; ~760
   hardcoded accent literals (indigo→brass, old green/gold/red→the
   semantic set, old light text→warm-white) mechanically remapped
   across the legacy panels and BroTown.jsx; page/wrap base
   #0d0b18→#10181D. v2.3.1233 (blur + dead-CSS sweep): every remaining
   backdrop-filter removed tree-wide — game.css world chrome
   (.bt-interact-prompt/.bt-plist/.bt-exit-fab/.bt-exit-dim/
   .bt-rejoin-loading/.bt-kb-key/.bt-emote-bar), 16 BroTown.jsx inline
   world toasts/badges, ItemTooltip scrim — with translucent fills
   bumped to the world-overlay ink to compensate; nine zero-consumer
   legacy class families deleted (.back-to-site, .bt-player-count,
   .bt-players-btn, .bt-chatlog*, .bt-combat-bar/btn,
   .bt-chat-fab/bar/input, .bt-fab-group). Remaining for a later
   pass: device/contrast/perf QA.
5. ✅ v2.3.1240: approved dashboard mockup parity — lighter slate tray,
   three equal dark functional wells with gutters (no divider rules or
   title underlines), rounded crisp world edge, inset navigation ribbon,
   and six quiet micro-beveled buttons. Default dashboard has no active
   navigation state; Bag remains the quick view and Inventory names the
   deeper destination.
6. ✅ v2.3.1240: screenshot-parity polish — brighter near-white dashboard
   type, blue-slate bridge borders without a dark double rim, stronger
   crisp world seam, and darker toolbar buttons with a single contour
   plus vertical-only micro-bevel.

## Do-not-drift list

No new accent colors; no ornamental or nested cards around groupable
content; no generated panel art; no always-on animation; no text label
as primary identity where an icon exists. The three dashboard wells and
toolbar micro-bevels are deliberate structural exceptions documented in
§8–9; do not replace them with dividers, textures, or accent-colored
modules.
