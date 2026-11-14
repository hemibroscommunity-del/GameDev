card: Y
branch: claude/plan-y-topaudit (PR 2, begun from PR 1's branch: merge in order)
prs: #1705 (ready), PR 2 (tag 5401, testing)
state: working

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
- #1534's one green: a race (a slow trip spends the hops in town).

## Next

- PR 2 (tag 5401): the minimap's inset is measured again when the top
  bar grows. `topaudit` 6/6 twice, `north` 9/9; `wheelmap` 1 red (the
  plate's words, checking it on main); `questline` running.

## Found

- `docs/plan/census/red.md` row 3: the TEST's, not the GAME's.

## Needs

- None. PR 2 is the owner's yes (relayed by the planning session, 06:30
  UTC): the fault is `minimapRenderer.js` `_measureTopInset` (cached by
  canvas height alone), not `pixiRenderer.js` 869. `topaudit` 6/6 x2.
