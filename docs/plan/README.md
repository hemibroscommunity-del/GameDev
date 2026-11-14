# The plan's working files (v2.3.5020; tags written bare, v2.3.5055)

`docs/GRAND-PLAN.md` is the plan. This folder holds what its sessions read
and write while they carry it out.

- **`cards/<letter>.md`**: one card a session. A card names its PRs in
  order, each with its files, its tag and its "done when", and the readings
  already chosen, so no session has to guess. A session with no card does
  not start.
- **`status/<letter>.md`**: a session's status file. It lives on the
  session's own branch and is committed with the work.
- **`census/<name>.md`**: a session's long output (a table of hundreds of
  rows). Never in the status file: the gatekeeper reads every status file at
  each sitting, and must be able to.

## The status file

At most 40 lines. It opens with these four lines, then four short lists.

```
card: H
branch: claude/<the branch this session was given>
prs: #1671 (ready), #1675 (working)
state: working
```

- `state` is one of `working`, `ready` (a PR waits for the gatekeeper),
  `done` (the card is finished) or `stalled` (it cannot go on; say why).
- **Done**: each PR, one line.
- **Next**: the one thing it is doing now.
- **Found**: faults and facts outside its card, one line each, with the
  file. A session does not fix what is outside its card.
- **Needs**: what it waits for, from the owner or from another card.

## How the gatekeeper finds a session

The start-up brief lists the `claude/*` branches pushed in the last 72
hours. The gatekeeper reads `docs/plan/status/*.md` on each. A status file
that says `working` on a branch with no commit for three hours is named as
stalled.

## Tags

A session takes its tags from its card (day one) or from
`tools/dev/tag-blocks.json` (once wave 0 has made it), one a PR. A card writes
its numbers bare (`tag 5029`, never with the `v2.3.` in front): the tag check
counts any tag written in full on `main` as taken, so a card that wrote its
own session's tag in full made that session's claim fail (v2.3.5055). **Not the
number the start-up brief suggests**: the brief offers every new session
the same one.
