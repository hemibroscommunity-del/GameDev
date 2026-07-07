# ART-QA — gear contact sheets (v2.3.1195)

`tools/qa/qa-gear-sheet.mjs` turns a round of hand-authored paper-doll
armor art into **one labeled image board per gear piece** so you can
review everything at a glance instead of clicking through the game.

For each equippable item in `src/rendering/gearCatalog.js` (plus a bare
body and a full-set config) it boots the real game headless, equips the
piece, drives the player through every pose × facing the renderer
supports, crops the player out of each frame, and composites the crops
into a PNG grid with text labels.

| Pose | Facings captured |
| --- | --- |
| Idle (stand) | all 8 |
| Walk / jog | all 8 |
| Sword swing | 4 (sheets are picked by dominant axis, so 4 = full coverage) |
| Bow shot | all 8 |
| Fishing | south (pose locks facing south) |
| Mining | south (pose locks facing south) |

**A cell showing the bare body is signal, not a bug** — it means that
(pose, facing) has no gear sheet on disk yet. The boards double as a
coverage map for what art is still missing.

## Running it

Same prerequisites as the other QA harnesses (see `tools/qa/run-all.mjs`):

```sh
npm run build && npm run preview        # client at :4173
cd server && npx wrangler dev --port 8787   # optional local worker

QA_WS_URL=ws://127.0.0.1:8787 npm run qa:gear-sheet
```

Without `QA_WS_URL` the client joins the production worker (a `GearQA`
player will briefly appear in town). Output lands in
`tools/qa/out/gear-sheets/*.png` (gitignored) — one PNG per gear config.

## Useful flags

```
node tools/qa/qa-gear-sheet.mjs --dry-run          # list planned combos, no browser
  --include-variants     also capture color variants (items with
                         `variant`/`variantOf` in the catalog; skipped by
                         default to keep runtime bounded)
  --slots=chest,legs     only these slots' pieces
  --poses=idle,jog       subset of idle,jog,sword,bow,fish,mine
  --max-configs=12       hard cap on gear configs
  --keep-crops           also write the raw per-shot crops
  --crop=200x240         crop size around the player
```

## Notes

- Adding a new catalog entry requires **no changes here** — the tool
  imports `GEAR_CATALOG` directly and iterates it.
- New color recolors should carry `variant: true` (or `variantOf: '<base>'`)
  in their catalog entry so the default run stays fast.
- Deliberately **not** in CI or `npm run qa` (run-all.mjs skips it): the
  output needs human eyes, there is nothing to pass or fail.
  `node tools/qa/run-all.mjs gear-sheet` still runs it explicitly.
- Browser resolution matches qa-smoke: `QA_CHROME` env >
  `/tmp/chrome-headless-shell-linux64/` > `/opt/pw-browsers/chromium` >
  playwright-managed.
