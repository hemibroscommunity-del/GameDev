# The gatekeeper's review, sitting 15 (card Z; tag 5372)

Taken 2026-11-14 on `main` at d6b8acd (tree 9bff337a, sitting 14's list
merged, exactly its rehearsed tree). Tags in this file are written bare.
Each new PR that changes `server/` or `src/` had a finder read the code
around its diff (the angles of `/repo-review` that apply), re-try its break
proofs and try to disprove what it found; the gatekeeper re-read every mend
pushed since sitting 14 itself. Documents and tools got step 3.

VERIFIED: the story runs, on the code path named (a finder's probe in a
throwaway copy, or a reading). PLAUSIBLE: the code does it, what sets it
off is unproven (it says what would settle it). The probes are not in the
repository.

(A DRAFT: the reviews and the rehearsal are running.)

## Card L: #1824 (PR 5's second, tag 5211): re-read

Reviewed clean at sitting 14 (80a7237). Since then: `main` d6b8acd merged
in (both `DOOR_SUITES` rows kept, card O's ladder and the duel), and
sitting 14's low mended: the gladiator.js exception is now ` t.status = `
(a space first) in both duel-door.test and the phase guard, so
`mt.status = ` no longer passes. The two writes it names are
gladiator.js 373 and 852. Nothing else in L's files changed (diffed file
by file against 80a7237's own diff).

## Card K: #1829 (PR 5, tag 5185): re-read

Reviewed clean at sitting 14 (c096522). Since then (c0042a9): `main`
0da805c merged in, and sitting 14's two lows mended:

- `item_drop` and `report` are `body: 'top'` rows; the guard's new 2b
  fails a direct send written with its fields at the top whose row is not
  `body: 'top'` (its break proof 5: `item_drop`'s taken off).
- The teardown calls `setActionTransport(null)`; `act()` with no
  transport returns false (nothing leaves).
- Nit, PLAUSIBLE, not live: the teardown clears the transport whoever set
  it; if a second set-up ever ran before the first's teardown, the new
  one's would go. Nothing calls `act()` until K's PR 7, where comparing
  before clearing settles it.
