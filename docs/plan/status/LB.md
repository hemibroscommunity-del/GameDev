card: LB
branch: claude/plan-lb-1-pieces (one branch a PR, PR 2's begun from this one)
prs: #1771 (5500, ready; the owner to see its pieces before PR 2 uses them)
state: ready

## Done

- #1771 (5500), the pieces: the owner's sheet and two mockups under
  `assets/ui/leaderboard/`; 27 pieces cut by the sheet's own alpha
  (`tools/ui/cut-leaderboard.mjs`, the door's four steps, family
  `ui-leaderboard`, draw `none`); the papers (`sources.json`, `CREDITS.md`),
  the MEMORY-MAP slot, `docs/specs/leaderboard-look.md`, the card, LB's
  tag block.

## Next

- PR 2 (5501), the window, once PR 1's pictures are shown to the owner.

## Found

- The sheet is already see-through: its "gradient" is colour under alpha 0
  (565,671 pixels), so the cut needs no key at all (the spec, part 2).
- A second mockup came onto `claude/codebase-upgrade-plan-mk31p4` after the
  card (2651b21fc, "This pic is better mock representation"): committed
  with the first.
- Today's rank trophies (`public/icons/ui/rank-<n>.webp`, the owner's
  2026-11-09 sheet, `tools/ui/cut-rank-trophies.py`) are what the card's
  medals 1-3 replace in PR 2.

## Needs

- Asked of @parent (once, 2026-11-14), before PR 2:
  1. The owner's yes to the pieces (#1771's picture), as the card asks.
  2. The second mockup (titled RANKS; Overall, Melee, Bow, Magic; no pages)
     against the card's reading of the first (LEADERBOARDS; ten pills;
     pages): which does the window follow? (On screen: the owner's.)
  3. PW's field names for a row under `caps.power` (power, per style, the
     five stats' boards).
