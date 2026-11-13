card: I
branch: claude/plan-i-traps
prs: none yet (PR 1, tag 5031, opens when its line of the card is done)
state: working

## Done

- Nothing merged or ready yet.

## Next

- PR 1 (tag 5031): `docs/plan/census/traps.md`, one row for each of the
  339 headings of `docs/TRAPS.md`. Eight readers are on it, about 42 traps
  each; they only read.

## Found

- `docs/plan/cards/*.md` write each day-one tag in full, so every one of
  them is already "used" on `main` and precheck's `version-tag` check
  fails a session that writes its own card's tag in a file
  (`tools/dev/tagRule.mjs`: used = anywhere in main's tree). This card's
  files write the tag as a bare number, as card W's blocks file does; the
  commit's title carries it in full.

## Needs

- Nothing.
