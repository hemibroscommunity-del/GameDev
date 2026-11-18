# The gatekeeper's review, sitting 49 (card Z; tag 6263)

Taken 2026-11-18 on `main` 736f954c (sitting 48 fully merged; its worker
deploy green). The cards running came from the planning session
(session_01LccHaivkofvyigGL4fgBWZ); the branches and PRs from GitHub at
about 15:10 UTC. Tags bare.

## What was open

| card | branch(es) | PR | state on GitHub | status file |
|---|---|---|---|---|
| WD2 | `claude/plan-wd2-1-say` (42a24eaf) | #2211 (6320) | draft; `test`, `playable`, `memory-budget`, `lint-build` green | `working` |
| WD2 | `claude/plan-wd2-2-itemcard` to `-11-pets` (9eb44576 .. df998530) | none yet | pushed, stacked on #2211 | `working`, "opened one at a time" |
| HB2 | `claude/plan-hb2-1-coach` (c854a13b) | none yet | pushed | `working` |
| RR | none pushed | none | | |
| EN | none pushed since #2207 | none | | |

Ready by the card's step 2 (a status file saying `ready`, open, not a
draft, `test` green): **none**. #2211 is green but a draft whose status
file says `working`; it goes to sitting 50 when its session marks it.

## A first read of #2211 (W0 pilot; not a full review: not yet ready)

Read by hand so sitting 50 starts warm. Files: `src/game/say.js`,
`src/data/say/clanInvite.js`, `src/ui/panels/ClanInviteCard.jsx`,
`tools/guards/say.test.mjs`, `player-words.test` 4995 -> 4990,
`systems.mjs` + `SYSTEMS.md` (`say` in desktop, the planning session's
Q1), the card and status file. All the card's.

- The words are the same: the five strings and the popup's template come
  out identical on a phone; none holds "tap", so a computer reads them the
  same too. `sayPieces` keeps the two bold parts as keyed elements and the
  text as strings: React draws the nodes the JSX did.
- A missing key shows the key; a key on the prototype reads as missing
  (own-property checks): right for a table keyed by strings.
- **Mend (comment only):** `say.js`'s header ("server/test/say.test also
  fails a key...", "node tests it (server/test/say.test.mjs)") and
  `clanInvite.js`'s ("server/test/say.test fails a key two files define")
  name a file that does not exist: the guard is
  `tools/guards/say.test.mjs`, whose own header says why it is not in
  `server/test/` (TRAPS §277). Comments are the project's memory; sent to
  WD2 as a mend.

## The stack (PRs 2 to 11), for sitting 50

- Three are marked "DEPLOYS: server/test" (6321 desk-keys 7k, 6323
  owner-icons 3b, 6330 desk-words 5): list them back to back so the
  worker deploys once.
- Each branch is stacked on the last. Each must be retargeted to `main`
  before it is listed (step 5b), and its merge bases counted step by step:
  once #2211 lands as a merge commit, a branch that carries 42a24eaf as
  its own history keeps one base only if it never merged `main` in.
- The status file's Found lists the "tap" rows that now read "click" on a
  computer (PlayerPaint 8, HeroExpanded 1, TradeWindowPanel 3, ClanPanel
  3): allowed by the card's reading (the computer word from `deskWords()`,
  no change on a phone). Sitting 50 checks each on a phone is unchanged.

## The rehearsal

None: nothing ready. Z's own PR is documents only (card Z: not
rehearsed; its `test` check is its gate).
