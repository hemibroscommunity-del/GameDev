card: Y
branch: claude/plan-y-topaudit (PR 2, begun from PR 1's branch: merge in order)
prs: #1705 (merged), #1739 (tag 5401, ready)
state: ready

## Done

- #1705 (tag 5400): `hopTo` stops at a zone change. `farmmusic` 12/12
  x3 alone, `questline` 187/187.

- Found the cause (tag 5400). The GAME keeps its word: out through the
  farm's gate the phone lands on the spot it left, (87168, 87456), by the
  Feed & Seed, and BroTown's track plays. It is `farmmusic`'s walk that
  moves it after: `H.hopTo` (`tools/qa/mp/harness.mjs` ~1756) writes the
  player's place for all its tries, and the gate fires before the walk's
  end point (the gate opens 2 tiles from its marker). The hops left over
  go on in the Wheel, toward the farm's gate point (232, 1324), 80 px a
  hop: about 3,900 px north-west, into Frost Ridge.
- Measured with a throwaway copy of the test (deleted, never committed):
  as written, the place traced 87111,87400 at arrival, then a straight
  march to 84383,84697 over 16 s. With a walk that stops when the zone
  changes: arrival 87168,87456, still; the town's track; 9 of 9.

## Next

- PR 2 (tag 5401): the minimap's inset is measured again when the top
  bar grows. `topaudit` 6/6 x2, `north` 9/9, `questline` 187/187,
  `wheelmap` 40/41 (its one red is red on main too: Found).

## Found

- `mp-wheelmap` Frost Ridge plate: wants "Lv 6–10", the game says
  "No man's land 8" (`ZoneHeader.jsx`); red on main.

- `docs/plan/census/red.md` row 3: the TEST's, not the GAME's.

## Needs

- None. PR 2: the owner's yes (via the planning session). The fault was
  `minimapRenderer.js` `_measureTopInset`, not `pixiRenderer.js` 869.
