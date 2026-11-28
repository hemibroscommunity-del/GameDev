card: UI4-ranks
branch: claude/ui4-ranks-headers
prs: (draft, 6846)
state: working

## Done
The owner, 01:40 UTC 2026-11-28, on a phone: "Leaderboards menu cuts off headers."

- **Found on `main`** (not only under `?v17look`): `mp-ranksheads` on main 45a16787 failed at every size.
  - The board's heads (Rank, Player, the unit) sat low in their 18 px strip, their foot cut
    ("Player" read "Plaver"): the face column's empty head kept a row's 30 px face box and the Rank
    head a row's 15 px number, so the grid's row stood 30 px tall inside the clipping strip.
  - A door's word wider than its tile spilled past it or lost its end: "Points placed" at 390 and
    under, "Combat level" at 375 and under, "Woodcutting" at 375 and under, "Biggest fish" at 320.
  - Back's "Leaderboards" ends in an ellipsis at 320 wide (2 px): the kit's own rule (v2.3.6681),
    kept; flagged.
- **The mend** (`src/ui/mobile/dash/ranksUi2.css` only): the heads keep their own size; a door's word
  wraps to a second line inside its tile (never smaller, still five across).
- **The test**: `tools/qa/mp/mp-ranksheads.mjs` (lane full), every page of Ranks at 390 x 844,
  375 x 667, 320 x 568, 430 x 932, 844 x 390.

## Next
- the draft PR, its preview, the owner tries it.

## Found
- the kit's Back word ends in an ellipsis at 320 wide ("Leaderboard..."): src/ui/kit/ui2.css v2.3.6681, kept.

## Needs
- nothing.
