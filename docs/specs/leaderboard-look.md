# The leaderboards' new look (card LB; v2.3.5500 on)

> The owner, 2026-11-14: *"I'd also like something more like this for
> leaderboards (mockup and art assets attached)."* And of a second mockup the
> same day: *"This pic is better mock representation."*

Card LB (`docs/plan/cards/LB.md`) remakes the Leaderboards window
(`src/ui/mobile/dash/LeaderboardPanel.jsx`, `BoardRow.jsx`) after the owner's
mockups, with the owner's art. What the boards are, and why each is there, is
`docs/specs/leaderboards.md`; this spec is the look.

## 1. The sources (tag 5500)

Under `assets/ui/leaderboard/`, the owner's files, kept byte for byte and
never shipped as they are (`tools/assets/sources.json` holds their hashes):

| file | what |
|---|---|
| `art-sheet-2026-11-14.png` | the art sheet, 1536 x 1024: the title frame, laurels, a crown, three shields with ribbons, medals 1-3, rosettes 4-5, three trophies, the bars, four category tiles, two dividers. It carries a signed record naming ChatGPT (gpt-image) |
| `mockup-2026-11-14.jpg` | the first mockup, cropped to the game: "LEADERBOARDS", the categories Overall to Vitality down the left, the podium, the table's first row |
| `mockup-2-2026-11-14.jpg` | the second mockup, the "better mock representation": the window in the dashboard's band on a phone, titled RANKS, the categories Overall, Melee, Bow, Magic, the podium, a table of four rows (#, Player, Lv, Power, and the sword, bow and staff columns) |

Their papers: `CREDITS.md` (the owner's upload, made with ChatGPT, as the
owner said of their other art on 2026-11-14), `tools/assets/sources.json`.

## 2. The pieces (tag 5500)

`node tools/ui/cut-leaderboard.mjs` cuts the sheet into 27 pieces at
`public/ui/leaderboard/<name>.webp` (the family `ui-leaderboard`,
`tools/assets/families.mjs`). `--dry` says what it would write; `--contact
<out.png>` also draws every piece on the window's slate and on white;
`--sheet <png>` cuts a new sheet laid out the same way (a piece moved: its box
in `PIECES`).

**The sheet is already see-through.** What looks like a gold-and-slate
gradient behind the pieces is colour left under pixels whose alpha is 0
(565,671 of the sheet's 1,572,864); each piece's glow is the soft alpha round
it. So the cut is by shape, the sheet's own alpha, and no colour is keyed
out:

1. **the cores**: 4-connected runs of alpha 96 or more, one a picture (at 32
   the four category tiles' glows still join in pairs; at 96 every picture is
   its own). A core belongs to the piece whose box holds its middle; a core of
   more than 200 pixels no box holds stops the run.
2. **the glows**: every pixel with any alpha goes to its nearest core (one
   walk out from all cores at once), so two glows that touch are split down
   the middle, never by a box's straight edge.
3. **a piece** is its cores' pixels inside its box, trimmed to what shows.
   The sheet's solid is 253, lifted to 255 (`a * 255 / 253`).
4. **scaled** to the window's size at **2 picture px a CSS px** (an area
   average of premultiplied colour, so the hidden gradient never bleeds in).
   The sizes come from the mockups; each piece's is in `PIECES` (`css`).
5. **a bar** (the table's rows, the pills down the left) is kept as its two
   round ends and 16 px of its middle: 96 px wide, stretched to any width as
   a CSS border-image (40 px ends).
6. **the door's steps** (`tools/assets/finish.mjs`, card P): each piece on
   its own 256 colours or fewer (`quant256`: a glow's soft pixels get colours
   of their own), a palette PNG read back through the game's own reader, then
   a lossless WebP with its colour index (what the gate reads), and its row in
   `tools/assets/shipped.json` with `door`: the sheet's hash, the piece's box
   on the sheet, its scale and its colours.

The sheet's second and third dark pills are the first again: one is cut
(`pill-plain`), the other two are known to the run and written nowhere.

| piece | box on the sheet (x, y, w, h) | scale | picture | CSS |
|---|---|---|---|---|
| title-frame | 195, 0, 733, 162 | 0.5 | 367 x 81 | 184 x 41 |
| laurel-left | 986, 16, 99, 135 | 0.4 | 40 x 54 | 20 x 27 |
| laurel-right | 1085, 15, 99, 138 | 0.4 | 40 x 55 | 20 x 28 |
| crown | 1233, 15, 209, 129 | 0.2 | 42 x 26 | 21 x 13 |
| shield-silver | 96, 167, 356, 317 | 0.5 | 178 x 159 | 89 x 80 |
| shield-gold | 450, 134, 447, 351 | 0.5 | 224 x 176 | 112 x 88 |
| shield-bronze | 890, 181, 342, 301 | 0.5 | 171 x 151 | 86 x 76 |
| medal-1 | 1263, 158, 148, 116 | 0.45 | 67 x 52 | 34 x 26 |
| medal-2 | 1265, 266, 141, 110 | 0.45 | 63 x 50 | 32 x 25 |
| medal-3 | 1265, 369, 143, 108 | 0.45 | 64 x 49 | 32 x 25 |
| rosette-4 | 1277, 470, 147, 163 | 0.4 | 59 x 65 | 30 x 33 |
| rosette-5 | 1283, 620, 140, 169 | 0.4 | 56 x 68 | 28 x 34 |
| pill-gold | 38, 482, 287, 93 | 0.75, ends | 96 x 70 | any x 35 |
| pill-plain | 39, 573, 283, 84 | 0.75, ends | 96 x 63 | any x 32 |
| bar-gold | 333, 491, 930, 84 | 0.75, ends | 96 x 63 | any x 32 |
| bar-silver | 336, 572, 920, 84 | 0.75, ends | 96 x 63 | any x 32 |
| bar-bronze | 335, 653, 927, 81 | 0.75, ends | 96 x 61 | any x 31 |
| bar-plain | 334, 732, 928, 86 | 0.75, ends | 96 x 65 | any x 33 |
| trophy-gold | 17, 816, 193, 194 | 0.35 | 68 x 68 | 34 x 34 |
| trophy-silver | 223, 830, 164, 179 | 0.35 | 57 x 63 | 29 x 32 |
| trophy-bronze | 393, 845, 152, 161 | 0.35 | 53 x 56 | 27 x 28 |
| tile-crown | 564, 845, 148, 149 | 0.4 | 59 x 60 | 30 x 30 |
| tile-sword | 714, 845, 136, 148 | 0.4 | 54 x 59 | 27 x 30 |
| tile-bow | 849, 846, 138, 148 | 0.4 | 55 x 59 | 28 x 30 |
| tile-staff | 986, 846, 147, 149 | 0.4 | 59 x 60 | 30 x 30 |
| divider-gold | 1150, 855, 348, 56 | 0.5 | 174 x 28 | 87 x 14 |
| divider-silver | 1153, 927, 341, 50 | 0.5 | 171 x 25 | 86 x 13 |

(The CSS sizes include each piece's glow.) Every piece came out at 256
colours; the most any moved is 0.0096 (rosette-4; `quant256`'s mean error, in
OKLab). 109 KB of files; 847 KB decoded if all 27 were on screen at once
(`docs/MEMORY-MAP.md`, "a window's own art, bigger than an icon").

**Banding at 256 colours** (the card's worry): looked for on the contact
sheet (all 27 at their size, on the slate and on white) and at 3x on the
slate on the gold pill's glow, the gold shield, the gold bar and the gold
divider: none seen. The pictures are in the PR's words (tag 5500), from `docs/specs/leaderboard-look/pieces-5500.png` (every piece on the slate and on white, with its name and size) for
the owner before the window uses them.

At tag 5500 nothing draws the pieces (the family's draw path is `none`):
card LB's PR 2 (tag 5501) is the window.

## 3. The window (tag 5501)

`src/ui/mobile/dash/LeaderboardPanel.jsx` and `BoardRow.jsx`, after the
second mockup (the planning session's reading, 2026-11-14: the layout is the
second mockup's, the art the sheet's). What it looks like and why is
`docs/UI-DESIGN-NOTES.md`, "The Leaderboards"; this part is how.

- **The list** (`boardList`): `{title}`, the weapons' boards (`BATTLE`:
  Overall with `caps.power`, Melee, Bow, Magic, Level), `{divider}`, Kills, AP (`caps.achievements`),
  the Records (each its own switch, as before), the Skills. 108 px wide
  (`RAIL_W`); side by side from 328 px wide and 140 tall, else one row of
  pills over the board (`data-lb-page` `list` / `chips`).
- **A pill** (`Pill`): the sheet's `pill-plain` (`pill-gold` lit) as a
  border-image behind it (`BoardRow.jsx` `BarBack`: 40 px ends, the middle
  stretched), its picture (`CatIcon`: the sheet's tile where the board has
  `art`, else the game's icon by its opaque box) and its word.
- **The podium** (`Podium`): the three shields at their CSS sizes (89, 112
  and 86 wide), scaled by `podiumScale`: the board's width over 295, and its
  height less the table's head and three rows over 100, at most 1.15; under
  0.6 it is not drawn. The face sits in the field (29% down, a third of the
  shield's height), the name on the ribbon (64-79% down, 19% in from each
  side), the BOARD's value at 79% (`podiumValue`: the level on Level, the
  weapon's level on its board, the Power on Overall, "1,234 kills",
  "1,234 AP", the skill's level), so the shields read in the board's order:
  the boxes measured on the pieces.
- **The table** (`TableHead`, `BoardRow.jsx` `TableRow`): one CSS grid, the
  rank 28 px, the player the rest, then the board's columns (`tableOf`). On a
  board narrower than `WIDE_TABLE` (330 px: an upright phone's, ~250-265 px)
  the weapons' boards and Level show Lv and EITHER the Total (36) OR the three
  weapons (24 each), never both: the head's columns after Lv are one button
  (`data-lb-swap`) that swaps them, its target 44 px tall; Melee, Bow and Magic
  open on the weapons, Level on the Total. A wider board (a computer, a phone
  on its side) shows all four. The name then has about 105 px and takes two
  lines before it is cut (the gatekeeper's sitting 10: at 375 px it had
  ~16 px). Other boards: Lv (32) and the record (54; a skill's 66, headed by
  the skill's name, its level a plain number, so a row never shows two "Lv":
  v2.3.4393's rule). The head sticks to the top as the board scrolls. A row
  is 30 px on its bar (`rowBar`: gold, silver and bronze for 1-3, plain for
  your own below them; your own in 1-3 wears a light ring, `mineRing`).
- **The power index** (card PW; the worker's half #1776). HELD IN PR 2:
  `powerVersion` returns 0, because `caps-audit` refuses a cap the phone
  reads before `join.js` sends it, and #1776 is what sends it. Card LB's
  PR 3 (tag 5502) reads the cap there once #1776 is on main, with its
  `CAP_GATES` row and `mp-boardslook`'s checks of Overall and the rating
  (written and run in PR 2's first cut against rows in PW's shape). Then:
  `caps.power` is
  the index's version (1 today). With it Overall is in the list
  (`?category=power`, sorted by Power, `value` the Power) and the column is
  Power; `powerCells` reads each row's `powerIndex {power, melee, bow, magic,
  v}`, and only where `v` is the worker's version: any other row is "not yet
  ranked", a dash, never a 0. The Power is a rating (the owner, through the
  planning session: the control 3,000, about 200 to 4,700), in full in a
  38 px column ("4,712"; `compact` only past 9,999, should the scale change);
  each style short in 24 px (`short`: "2.7k"). The head's "Power?" is a
  button: a tap shows "400 points ahead = 10× likelier to win" under the head
  (`POWER_HINT`, the owner's own reading; the head's tooltip too). Without
  the cap the column is Total: the row's `series` melee, bow and magic
  levels added up. `CAP_GATES` gets the cap's row in PR 3, not here (no
  cap is read here). The first mockup's five stat boards are held (the
  planning session: retired stat names); PW's stat boards (`caps.statboards`)
  come in PR 3 as a "Stats" group. On a narrow table the "Power?" hint button
  is not drawn (the swap button holds the column): PR 3 decides where the
  hint goes there.
- **The rank** (`RankMark`): the medal for 1-3 (32 x 25 in a records row, 28
  x 22 in the table), with v2.3.4393's shine and stars (game.css `.bt-rank-*`,
  unchanged, the sizes inline); from 4 the number.
- **The art**: `LB_ART(name)` (`?v=2.3.5500`, the pieces' tag); the twenty
  pieces the window draws (`LB_PIECES`) are asked for as `LeaderboardPanel.jsx`
  loads (not `BoardRow.jsx`, which the Test panel imports for its faces), the
  Leaderboards' own script (`lazyPanels.js` `DashLeaderboardPanel`): the
  window's own art loads with its window. The trophies, rosettes, title frame
  and silver divider are cut but not drawn.

**Tested** by `tools/qa/mp/mp-boardslook.mjs` (upright, every board, with
`caps.power` set in the page, sideways, a computer with `wide: true`) and
`mp-boards` (the boards' content, moved onto the medals and the first
board's new place).

## 4. Overall, the Power rating and the Stats group (tag 5502)

Card PW's worker halves are on main: #1776 (the power index, `caps.power`
its version, 2 since the rating) and #1781 (the stat boards,
`caps.statboards` a count). PR 3 reads both.

- **`powerVersion`** reads `caps.power`. Overall leads the list (the
  sheet's crown tile) and opens first; `?category=power` ranks by Power.
- **The Power is OVERALL's.** Its table is Lv, Power (in full), and each
  style's score (short); a row whose `powerIndex.v` is not the worker's
  reads "-". The weapons' boards rank by the weapon's level and Level by
  the level (`leaderboard.js` `SERIES_CATEGORIES`), so they keep the
  levels: every board shows the numbers it is ranked by.
- **The hint on a narrow table**: the swap button holds the Power column,
  so the rating's reading is a small "?" at the end of the Player head (a
  44 px target), shown with the Power view.
- **The Stats group** (`STAT_BOARDS`), under a "Stats" heading after Level:
  `pts_def`, `pts_hp`, `pts_dodge`, `pts_stam`, `pts_eres`, `pts_mana`,
  `pts_move`, `pts_dmg` (card PW's order, `statboards.js`
  `STAT_BOARD_IDS`), the first `caps.statboards` of them. Each wears the Bro
  tab's label and icon (`src/data/prog3.js` `PROG3_BODY_META`, and
  `PROG3_ATK_META`'s `dmg` row); the damage points' board says "Damage",
  never "Power" (the planning session: "Power" is Overall's). Its table is
  Lv and the points under the stat's name; its podium says "N pts".
- **The caps**: `power` and `statboards` in `CAP_GATES`, each on its own
  line; their rows in `server/test/caps-audit.test.mjs`'s allowlist are
  gone (the worker shipped first; card PW's reminder).
