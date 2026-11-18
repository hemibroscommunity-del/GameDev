card: CS
branch: claude/plan-cs-1-switches-on
prs: PR 1 (6000) working
state: working

## Done

- (nothing merged yet)

## Next

- PR 1 (6000): the six cost switches ON by default, each off by its live
  flag set to false; their rows, tests and cost-guard lines.

## Found

- docs/specs/req-once.md, seat-hold.md and the other switches' specs still
  say "off by default" (outside the card's files: left for their owners).
- Comments in duel.js, gladiator.js, market.js, store.js, storeoffer.js and
  playerroads.js say `xferescrow` is "OFF by default" (not this card's
  files; RV holds market/store/storeoffer): stale since 6000.

## Needs

- (none yet)
