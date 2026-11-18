card: CAP
branch: claude/plan-cap-1-census (one PR a branch, claude/plan-cap-*)
prs: PR 1 (6100) census: opening
state: working

## Done
- PR 1 (6100): the census, docs/plan/census/caps.md, written by
  tools/dev/caps-census.mjs (`--check` byte for byte). 173 caps: 9 settle
  value, 3 `?` (questTrack, meals, prog3), 62 with no switch row, 10 count,
  160 old page ways, 315 reads.

## Next
- PR 2 (6101): the guard, tools/guards/caps-census.test.mjs, once PR 1 is in.

## Found
- `?`: questTrack (the page counts quest kills, claims them at join), meals
  (the old instant cook heals R.hp, the echo overwrites), prog3 (the old
  recalc sets level and pools from page-trained stats): which side of
  "settles value" is the owner's / planning session's reading.

## Needs
- (none)
