# The gatekeeper's review, sitting 31 (card Z; tag 5669)

Taken 2026-11-17 on `main` c55c8b59 (sitting 30 merged: K #1997, #1999,
L #2000, T #2001, #2002, Z #2004). Late arrivals go to sitting 32. Tags
bare.

## Heads, merge bases and trees

Every listed PR is based on `main`, with one merge base at every step
(`git merge-base --all`, each against `main` with the PRs above it merged
in as merge commits). The tree after each merge:

1 T #2007 63937b9cac88fced11a6631fde19218d8a95ef1e -> 9ca4ada13bbe0fc510ab7037dd2c27a945406d63
  (base c55c8b59)
2 J2 #2005 f40eb7fd85ea0aa8e28739c5cff97c1aa2645aa6 -> f37f46567acd4aa11481aa8634bc8847e727d805
  (base c55c8b59)
3 J2 #2008 567b27ff875f81a24c23a5552780a0e683745041 -> 9d634f19d05600a3c16a7cb5b3ce257c90459dd3
  (base f40eb7fd: stacked on #2005)
4 K #2006 6caec45dd63246936012afb1ba10d623e768fcce -> 5e5d9c03d3aa54101032035d51dd49822eafe803
  (base c55c8b59)
K_2003_LINE

Rehearsed (`tools/dev/gatekeeper.mjs` on c55c8b59) with 1 to 4 at the
heads above: tree 5e5d9c03 (the same as the step-by-step merges): build
PASS, questline 187/187; precheck 1 FAIL, 4 WARN: `server-tests` hit its
5-minute limit under load (settled), and `cd server && npm test` on the
same tree alone: 474 suites, all green (293.7 s). #2005 alone at 8afa483a
earlier: precheck, build, questline 187/187 green. REHEARSAL_2003
`test` green on every listed head.

## T #2007 (5318): the reads left

READY. Documents only: `docs/plan/census/T-reads-left.md` (71 reads,
each with what it waits on) and T's status (`stalled`, by the planning
session's word: T stops; a T session moves them as K, L and M end). Step
3 only. Tag in T's block (5300-5319).

## J2 #2005 (5649): mp-shopkeeper, the test's

READY. Test and status only. Waits for the grant (20 s, not a flat
1.2 s), for the bag to draw after the unfold; a guest's band may start
`open`; the shopkeeper's height to mp-npclooks' rule (standing, size over
height, 3% of the middle). 48/49: the height check stays red with a pool
of one standing figure in view (`stood.length >= 3`): inconclusive, not a
game fault; named in the PR's words. Listed by the planning session's
word ("list it if the rest is clean": it is).

## J2 #2008 (5650): the power and login-keys flakes, the tests'

READY. `power.test` 1n reads the room's CPU time (`process.cpuUsage`),
not the wall clock; `login-keys` 12e and 12f wait 20 s and 15 s (a guard
against a hang, not a speed). Tests only, but in `server/test/`: it
DEPLOYS the worker (no behaviour change). Stacked on #2005 (its head
merges #2005's): one base at its step.

## K #2006 (5193): the send door (card K PR 8), its own line

READY (reviewed in full: `server/` and the CLAUDE.md §5 line). One
`_send(ws, msg, type)` and `_sendRoom(msg, except)` (send.js); ~55
helpers, `broadcastAll`/`broadcastExcept`, the tick and the ping through
it; each frame byte for byte as before (the same `JSON.stringify` of the
same object, or the string already made); `_send` throws as `ws.send`
throws, so every caller's own catch is unchanged. Every moved call sits in
a room method (no nested `function` loses `this`; checked call by call).
Counts by type in a Map (rule 4), 256 types at most, the rest `_other`.
- No write added (VERIFIED): the counts ride the day's book (`send` on
  `DAYBOOK.RIDES`; `sendRide` folds only into a put already writing
  today's sums, before its first await); cost-guard §15e: ten minutes of
  sends alone write no book row; an hour writes at most 13.
- A stored part: the day's book gains `send` (`DAYBOOK.V` stays 1, as
  `size` did at 5287; `PART_BYTES_OF.send` 8 KB keeps a full day under a
  stored value's 128 KiB). A rolled-back worker drops the part from the
  day it rewrites (counts only). Its own line, as 5287's was.
- Live flag `sendcount` (lower case; row in the switch table, `on`
  2026-11-17, ON): off counts nothing, the door stays. No cap: nothing the
  phone sees changes.
- Low: card K named `server/src/liveops.js` for the switch's line; the
  flag is read as the other recent ones are (`_liveFlags`, no line in
  liveops.js). Census of raw writes 150 -> 93, only falling.

K_2003_REVIEW

## Not in (sitting 32)

- J2 #2009 (5651, mp-farmorders' Try again): WIP ("confirming run
  pending"), conflicts with #2008 on J2.md.
- K 13 (5198, 5199: the send door's other 93), after #2006; R 5293 (after
  K's 5197); L's next door: not opened in the sitting.
