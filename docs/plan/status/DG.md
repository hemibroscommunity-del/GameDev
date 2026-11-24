card: DG
branch: claude/dg-scans (PR 2), on claude/dg-door-guards (PR 1); claude/dg-books (PR 3) on it
prs: #2283 (PR 1, 6440, merged a98fff04), #2295 (PR 2, 6441, ready: sitting 58's mend), #2300 (PR 3, 6442, tests only)
state: ready

## Done
- Sitting 58's hold on #2295 (review-z58.md), the CLASS mended: the scans
  DENY BY DEFAULT.  writesOf follows a container or its item through every
  binding (list and nested patterns, a rest, a number key, a parameter's,
  loop's or callback's pattern, a copy, a member it is put into, a function
  that hands it back, an object holding it) and reports a binding it cannot
  follow as a write ('cannot follow'); action-door §7 the same for a
  channel and a fetch (a pattern, a use it cannot follow is counted).  Both
  plants (`const [first] = ps.weaponStash`, `const { channel } = S`) and
  six of mine RED in their suites, planted in real files.
- Sitting 57's hold on #2295 (review-z57.md): its three plants red
  (`.find` / callbacks, `Object.assign(ps, patch)` and `bump(ps, k)`,
  `S['channel'].send` and `const go = fetch`).
- Sitting 57's CI (#2295 red): doorHolders walks each file once (gold-door
  46 s -> 4.6 s); PR 1's heap-forget mends merged in (part 3's, a98fff04).
- PR 2 (6441): one scanner, tools/guards/lib/writesOf.mjs, for every door
  test; door plants of plants1-4 red by the scan alone, but SEND-2 (PR 6's).
- PR 1 (6440, #2283): the running room refuses (part 3 is its caretaker).

## Next
- Sitting 59: #2295, #2300 together.
- PR 4 (6443): card DG part 4's, on claude/dg-books.
- testroom §7 tries four fields (Z's Found): for a later PR of the card.

## Found
- none (no real second writer: the wider reads found nothing new in
  server/src or src/)

## Needs
- none

## Note
- A Map's `.get(k)` is not an element of the container (a session got from
  `sessions` is no write of the map: session-door).
