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
4 J2 #2009 eeb8a425a9963347d3aeda9b75b9ef275b37ac3a -> b01b004f944b94ecf73ff25db4f4f6eab1f619b1
  (base 567b27ff: stacked on #2008)
5 K #2006 6caec45dd63246936012afb1ba10d623e768fcce -> 9d2afdff9c034611f528f2bf9ee7aea074be425a
  (base c55c8b59)
6 K #2003 e161919e0cbb63480168841fbf3d79a8d6ee0a5a -> ee7e0d184458cf1efc20717ba02563eff199a126
  (base 6caec45d: stacked on #2006, K.md and SYSTEMS.md resolved)
7 L #2010 c4124a1619519cc67b97f94fba6c3294b749bd49 -> f69ca16b3b678d4390b2ea27ef9225dfecc7710c
  (base c55c8b59)

Rehearsed (`tools/dev/gatekeeper.mjs` on c55c8b59), all seven at the
heads above: tree f69ca16b (the same as the step-by-step
merges): precheck OK (0 FAIL, 4 WARN, the server suites inside its
limit), build PASS, questline 187/187. Earlier, #2007, #2005, #2008 and #2006 at
these heads: tree 5e5d9c03, build PASS, questline 187/187; precheck's
`server-tests` hit its 5-minute limit under load (settled), and
`cd server && npm test` on that tree alone: 474 suites, all green
(293.7 s). #2005 alone at 8afa483a: precheck, build, questline green.
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

## J2 #2009 (5651): mp-farmorders' Try again, the test's

READY. The finger scrolls "Try again" into view first (under the band it
landed on the band) and taps up to three times until a second
`farm_open` leaves the page (the test's counter). 21/21 four runs (J2).
Test and status only. Stacked on #2008 in the sitting (J2.md resolved).
This was among the settled reds ("mp-farmorders' remaining reds are the
tests'"): it is the test's mend.

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

## K #2003 (5197): the words rule (card K PR 12), its own line

READY at e161919e (held at 30; mended at e52ea0c0, stacked on #2006 in the
sitting). Sitting 30's findings, each mended:
- The guard (`words-rule.test` §5) reads the wire table's `words` fields
  (by their last name), names ending `Name`/`Tag`, `who`, `buyer`,
  `seller`; strings and comments as the parser reads them, so `+` on
  either side and over lines, a template literal and a spaced `.join` are
  found. Its line 4 (the clan refusals saying back the asked-for tag);
  `KNOWN` by file and words, no whole file exempt. The trade window's five
  notes (`trade2.js`) it found are converted (`trade_with`).
- The chat line and the market toast (`gameEvents.js`) fill from the
  template (`fillWords`), the worker's sentence when the page's table
  lacks it: word for word the same.
- A merged pile (`inbox.js`) drops `noteT` ("merged payouts" is the
  game's own words).
- A stored shape, its own line: inbox entries gain `noteT` (no shape
  number). A worker rolled back past it that merges a pile of 200+ keeps
  the `noteT` it does not know; rolled forward, the page reads that pile's
  first sentence instead of "merged payouts": words only, the gold right.
  Named in the spec and the PR's words.
- The stack: #2006's head merged in; `docs/SYSTEMS.md` and `systems.mjs`
  keep both (`send`, `words`); `inbox_delivered` goes out through `_send`
  with `noteT` (every delivery, live or at the join, goes through
  `_sendInboxDelivered` with the entry itself). No live flag, no cap (a
  phone with no table reads `note`).

## L #2010 (5527): the net joins the loading door

READY. `S._netHold`'s three writes (`wsClient.js` state_sync and the
close; `serverReady.js`) go through `veilTo(S, 'net', ...)`; a lift writes
`false`, as the old lines did (`LIFT`); nothing in `src/` reads
`veilPhase` or `S._veils`, so nothing a player sees changes. Switch
`?veildoor` (existing). `wsClient.js` is free: K's status says done for
good. `origin.test` and `socket-one.test` read the moved lines (their
anchor and stub). A change in `server/test/`: it DEPLOYS the worker.
- Low: `_netHold`'s ledger row (`src/state/wire.js`) says `writers: []`,
  `born: 'never'` (written through `S[VEIL_WHYS[why]]`), as sitting 30's
  window rows.

## Not in (sitting 32)

- K 13 (5198, 5199: the send door's other 93), after #2006; R 5293 (after
  K's 5197); L's next door: not opened in the sitting.
