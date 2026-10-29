# The owner's bag icons (v2.3.3281)

The owner, 2026-10-17, after the bag-item prompts (`docs/art/FARM-ART-PROMPTS.md`
and `docs/ART-WISHLIST.md`): *"Here are the art assets from the 5 other
prompts"*. Five sheets, 53 icons.

## What changed, place by place

| Item | Was | Now |
|---|---|---|
| The sixteen seeds | one 🌱 for all in the bag; the grown crop on the Feed & Seed window | a seed packet each: brown paper for the everyday crops, navy and gold for the magic ones |
| The sixteen crops | a glyph each (🥕 🌾 🌺 ...) | each crop as harvested |
| Compost | 🪱 in the bag; the compost bin on the Feed & Seed window | a burlap sack of compost with a worm |
| Herb Bread, Root Stew, Pumpkin Pie, Garden Stew, Firebloom Tea | 🍞 🍲 🥧 🥘 🍵 | the five dishes |
| The box trap | the Trapping skill's icon | the trap, its door propped on a stick over a carrot |
| The five hardened woods | each log darkened with two bands drawn in code | the owner's banded logs, each in its tree's colours |
| The nine essences | glowing orbs drawn in code, the bar tucked in the corner | the owner's orbs, the bar at the heart |

Where they show:

- **The bag** and everything that draws an item as the bag does (`thumbFor` in
  `InventoryPanel.jsx`): the item card, the trade window, the auction house,
  the Feed & Seed window's order board, the daily rewards.
- **The Feed & Seed window's Seeds tab:** each row shows what it sells, the seed
  packet or the compost sack (it showed the grown crop, the best picture there
  was in v2.3.3136); the crops still to open show as the crop; the "with
  compost" chip wears the sack.
- **The Cookhouse:** each recipe row leads with what it makes: the dish, or the
  tonic's bottle (they were glyphs).
- **The quick-eat button:** the Garden Stew's picture (it was a glyph), warmed on
  the loading screen with the button's other pictures.
- **The box trap** on the TRAP pop-up, the Woodworker's Traps tab and in the bag.
- **The hardened woods and essences** keep their file names, so the
  Woodworker's Harden tab and the Blacksmith's Salvage tab show the new ones
  with no code change.

Not changed: the seed picker on the farm itself and the crop that flies to the
bag at a harvest keep the owner's grown-crop farm pictures, which the farm loads
behind its loading screen (16 more pictures there would cost memory for a 40 px
button).

## How

- **Cut once, by a tool.** `tools/ui/cut-bag-icons.py` reads the five sheets in
  `assets/icons-source/sheet-bag-*.png` (kept, so a redraw is re-cut with one
  command) and writes `public/icons/items/<name>.webp`.
- **The magenta key is the Object Studio's** (`public/tools/style/process.js`
  `keyOut`): the background and the holes between stalks and leaves, the 2 px
  edge un-mixed toward the solid colour inside, the despill near the edge. Plus
  one rule of its own for the dishes' steam, a see-through wisp over magenta:
  a magenta-leaning pixel joined to the background through more of them is made
  as see-through as its colour allows, so the steam comes out faint white
  rather than solid lilac. A purple shade inside an outline (the firebloom
  packet's glow) is walled off by the outline and stays.
- **Each icon is every piece in its grid cell** (the essences' sparkles, the
  steam, the stew's crumbs), and nothing is written unless every cell has one.
- **The item set's frame:** 256 x 256, the longest side 195 px, centred, like
  `sword.webp` and `amulet.webp`. 53 files, about 950 KB in all.
- **The two old generators** (`tools/make_hardened_wood_icons.py`,
  `tools/make_essence_icons.py`) refuse to run unless told `--standins`, so they
  cannot draw over the owner's pictures.
- **Where the game finds them:** `src/data/farmCrops.js` `farmIconFor` (seeds,
  crops, compost), `src/data/dishes.js` each dish's `icon`,
  `src/rendering/controlsPreload.js` `TRAP_ICON_URL`. The glyphs stay as the
  fallback for an item with no picture (`thumbFor` returns nothing). A picture
  that fails to load is NOT caught (no tile has an `onError`), so `thumbFor`
  must only name files that exist (v2.3.3861: an old `shard_dungeon:<run id>`
  named a missing file and drew the browser's broken-picture box).

## Tests

- `server/test/bag-icons.test.mjs` (18): every item has its file at 256 x 256,
  `farmIconFor` reads every key right and nothing else, the quick-eat warm list
  holds the dishes eaten at once, each place uses the pictures, and the old
  generators refuse.
- `node tools/qa/mp/run.mjs bagicons`: a real page with a bag the worker filled:
  all 53 in the bag, decoded and from their own files; the Feed & Seed Seeds tab;
  the Cookhouse rows; the Traps tab; the quick-eat stew, warmed on the loading
  screen. Screenshots in `tools/qa/mp/out/bagicons-*.png`.
- `mp-farm` reads the Seeds tab's new pictures (it read the grown crops).
