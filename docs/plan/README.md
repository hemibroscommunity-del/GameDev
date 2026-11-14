# The plan's working files (v2.3.5020; tags written bare, v2.3.5055)

`docs/GRAND-PLAN.md` is the plan. This folder holds what its sessions read
and write while they carry it out.

- **`cards/<letter>.md`**: one card a session. A card names its PRs in
  order, each with its files, its tag and its "done when", and the readings
  already chosen, so no session has to guess. A session with no card does
  not start.
- **`status/<letter>.md`**: a session's status file. It lives on the
  session's own branch and is committed with the work.
- **`orchestrator.md`**: how the owner's requests, in plain words, become
  cards and sessions.
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

## Who answers a session's questions (tag 5057)

A session asks its questions under Needs, once. Two kinds are answered by
**the planning session** (the one that starts the gatekeeper's sittings and
merges their lists), for the owner, by the owner's standing answers of
2026-11-14:

1. **A file outside the card.** Asked *"May the planning session approve,
   on your behalf, a session working in a file outside its card when the
   card's own job needs it? Everything still goes through the gatekeeper
   first"*, the owner said *"Go recommended"* (yes).
2. **A technical question.** Asked *"May the planning session answer the
   sessions' technical questions for you? That means how to build what is
   already on their card or in the plan. It never covers anything you'd
   see on screen, anything about money or costs, or the deploy settings"*,
   the owner said *"Yes"*.

The limits, for both:

- The answer comes by message, naming what it allows (the file and its
  lines, or the reading chosen); the session names it in its PR's words,
  and the gatekeeper reads it there.
- It never covers a file another running session holds (part 11's "never
  side by side"), nor anything CLAUDE.md keeps for the owner's own words:
  `.github/`, `server/wrangler.toml`, a deploy, the `provenance` branch.
- The owner still answers, in their own words: what a player sees or hears
  (TRAPS §305: nothing dormant turned on), money and the game's costs (a
  fee, a price, a pace that writes more), and a new card's scope.
- A fault found outside the card is still Found, not fixed: the answer is
  for what the card's job needs, not for tidying.

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
