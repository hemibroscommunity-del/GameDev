card: DG
branch: claude/dg-scans (PR 2), on claude/dg-door-guards (PR 1)
prs: #2283 (PR 1, 6440, ready), PR 2 (6441, ready)
state: ready

## Done
- PR 1 (6440, #2283): the running room refuses a write of a guarded field
  outside its door (testroom.mjs); plants1 17 of 23 red. Deploys when merged.
- PR 2 (6441): one scanner, tools/guards/lib/writesOf.mjs (the syntax tree:
  any assignment, `delete`, Object.assign, a key in a name, an alias, a
  helper handed the record; a door's call by any receiver, a bind or a name
  made of it odd), its suite tools/guards/writes-of.test.mjs. The gold, bag,
  stash, life, points, quest, xp, hit, session and send doors, the page's
  action door and wire-audit's type census read it; allow-lists keyed by
  file + function + field + count; the '*' rows of bag-door and xp-door name
  their files. Gold's roads one step out (FORWARDERS: GOLD-4).
  Door plants of plants1-4, the scan alone: see the PR's words.

## Next
- PR 3 (6442): each road booked what it moved (gold-door, bag-door).

## Found
- none (no real second writer: every write the tree found beyond the old
  patterns is a listed place: a new, empty map or bag, a monster, a copy)

## Needs
- none

## Note
- PR 6's `sessions.clear()` / rebuilt `sessions` and `ws.send` through
  `bind` landed in PR 2 (they are the session and send doors' scans).
