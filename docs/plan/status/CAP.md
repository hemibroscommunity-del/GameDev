card: CAP
branch: claude/plan-cap-1-census (one PR a branch, claude/plan-cap-*)
prs: #2172 (6100) census, #2174 (6101) guard: working (drafts, waiting on CI)
state: working

## Done
- PR 1 (6100): the census, docs/plan/census/caps.md, written by
  tools/dev/caps-census.mjs (`--check` byte for byte). 173 caps: 12 settle
  value (3 of them `?` read as value by the planning session), 62 with no switch row, 10 count,
  160 old page ways, 315 reads.
- PR 2 (6101): the guard, tools/guards/caps-census.test.mjs (stacked on
  #2172): the 160 old ways may only fall; break proof run every time.

## Next
- Both PRs ready when CI is green; then done.

## Found
- (none outside the card)

## Needs
- (none)
