card: Y
branch: claude/plan-y-farm-gate
prs: PR 1 (tag 5400, testing)
state: working

## Done

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

- A, from the planning session: `hopTo` stops when its zone changes
  (`tools/qa/mp/harness.mjs`). `farmmusic` 3 of 3 alone, `questline`.

## Found

- `docs/plan/census/red.md` row 3: the TEST's, not the GAME's.

## Needs

- The owner: the planning session also asked for a second PR,
  `mp-topaudit` (`pixiRenderer.js` ~869, no `topInset` to
  `wheelMinimap.js`). Outside card Y and in a renderer: yes or no?
