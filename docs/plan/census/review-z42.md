# The gatekeeper's review, sitting 42 (card Z; tag 5820)

Taken 2026-11-17 on `main` bdfa8734 (sitting 41 merged: U2 #2070, L
#2058, #2065, #2067, K2 #2068, Z #2086; cards L and SEC done). K2, M, M2,
T2, U2, V2 and RV were told this sitting's session at its start (22:24
UTC). Gathered 22:24 to about 23:05 UTC (the owner's pace: about 45
minutes). Tags bare. Card Z's third block (5660 to 5679) is used up: this
PR takes Z's fourth, 5820 to 5839, from `nextBlock` (after RV's 5800 to
5819), and moves `nextBlock` to 5840.

Reviews in full (`server/` or `src/`): four readers, the angles of
`/repo-review` in one pass each, each finding put to its own disproof
against the code and the suites: RV #2083; K2 #2073 and #2081; T2 #2075,
#2087 and M2 #2084; M #2089. T2 #2071 was READY at sitting 41 (its merges
of `main` since, and its row's move, read here). Documents and tools (step
3): V2 #2076 to #2080, U2 #2074 and #2082, M2 #2085, RV #2072.

## How the shared lists meet

- `tools/dev/tag-blocks.json`: T2's, V2's and RV's rows each sit on a
  line of their own (after "T", "V" and "R"); only RV moves `nextBlock`
  (5800 -> 5820), and this PR (5820 -> 5840) is stacked on RV's #2072
  head for that line. Rehearsed: clean in the list's order.
- `server/src/testmode.js` and `docs/specs/test-mode.md`: RV's #2083
  moved its clause to a sentence of its own, off the `movefields` line
  K2's #2081 changes.
- `docs/plan/status/U2.md`: #2082 merges #2074's head. `status/M2.md`:
  #2084 merges #2085's head and T2's #2087 head (its
  `switch-reader.test.mjs`: one import, both `MOVED` blocks, the line at
  the merged count 34).
- The live flags: `mkttier`, `mktheal` (RV #2083), `ceilfair` (K2
  #2081), `framesteps` (M #2089): rows apart in `switches.mjs`; merged
  clean in this order.
- `docs/plan/status/U2.md`, `status/M2.md`: see the list's lines 9 and 15.

## Heads, merge bases and trees

Every listed PR is based on `main` (`base.ref`), open, not a draft (M
#2089 was marked ready at the close), with one merge base at every step
(`git merge-base --all`, each against `main` with the PRs above it merged
in as merge commits). K2 first (the planning session: #2081 mends the
flood-ceiling race that failed main's deploy of sitting 41's batch,
8b8b5a87, Found (q)). The tree after each merge:

1 K2 #2073 bb37229db1fb08f39d8f4439b34118f37b154a41 -> fdcffef02ee0625c9544409aa13e555ac89ba8df (base bdfa8734)
2 K2 #2081 bc3bbdae5d2b73395d956c462a5f79498b59c9fb -> 893b4f6bac028265b09542138752336667a3319c (base bb37229d)
3 V2 #2076 01aae45d49764d0deadee934f83275be9b19cfb6 -> 9a05e91d5dcaf6e198e415ba9332fef9bb7ce6de (base bdfa8734)
4 V2 #2077 226899899b16bc4f70cdd414994d1a2dcd270b43 -> a72dfefe0e50403835fc9a044139d16334dadb28 (base 01aae45d)
5 V2 #2078 a358c41403f5bec7cd4a61c9fa8e4ac6cfccb4da -> 105146f5146d9d534c19dfbdc55b2df8c8a67e7d (base 22689989)
6 V2 #2079 cfb1bfebf7364a11c6404a99cb9369d87b17157a -> 8afdd88dbb9778d5d0fb966620ff5739d6c51ea8 (base a358c414)
7 V2 #2080 159ee39645dd041442cd1240569e7ac4afe81530 -> 4579f4f092f0a46cc681ec834cbfa2b464a8e587 (base cfb1bfeb)
8 U2 #2074 0476ecf1ea385df90bdeec91b11c8b09e44319de -> 35ce839317da6ea7861d66db7f0e5e5a85677d32 (base bdfa8734)
9 U2 #2082 1a8d5af1410d9abb74eae5f23295b3f246845f54 -> 66da3734d4381973c97ad86f0eeb75c8f8afeb23 (base 0476ecf1)
10 RV #2072 7ffbf8bbd9fa8003f73371abab86e60158b6f065 -> c14467b00974710758d9b3ef19542ae8f57e3676 (base bdfa8734)
11 RV #2083 9eda755913ed864cf1912d6940fbcd30ab546168 -> c9108e9fac68879f317f9f3ed750a5f671da80e6 (base 7ffbf8bb)
12 T2 #2071 fd0c7b9203a18eba25e7e328e64413b24d2b4ba0 -> 580837b507b95a88f00ad16ef46656879b291bd8 (base bdfa8734)
13 T2 #2075 996f5e7ba8e2c73316910990d4ca9a729bc8dcdc -> 6e3844226f85ab3deb43f1e729098434eab4a319 (base fd0c7b92)
14 T2 #2087 af969303ed52c355444f8a0e3581655ad4d262ad -> 321864d7c27e7bd55a608d2f1ab8de4a61940bf5 (base 996f5e7b)
15 M2 #2084 6ad38d79ec0ebee6f7abbab942858db0ebfa1b15 -> ae1529a79a07dacb29bb0d3180bff5f6e459906a (base af969303)
16 M #2089 27a8886d42b7688c3b7fc70d6996515a3b18edaa -> 9224a787b1812c1b5e86f8ef45f6befdaf96d8d0 (base bdfa8734)
17 Z (this PR): stacked on RV #2072's head; its head and tree are in the list.

M2 #2085 (5344, 55c15c04057fefee1fa36765fb099f7e09ed9e58) is NOT a line
of its own: #2084 carries its head (merged in for `status/M2.md`), and
with #2085 listed apart #2084 had TWO merge bases (55c15c04 and
af969303). #2085 lands inside #2084; GitHub marks it merged. The tree
with it listed apart was the same, 9224a787.

## RV #2083 (5801): the General Store's two high findings

READY (reviewed in full at 14213058; 9eda7559 adds only `main`, #2072's
head and the clause's move, read here). MS-2 (`mkttier`): a sell order is
filed under its weapon's own `gearBase` tier (checked on every weapon
maker: gear.js, quests.js, spar.js, power.js). MS-4 (`mktheal`): an
order's delete goes in the same batch as its refund, save and `refund:`
stamp (`_creditWith`'s synchronous run, or `_inboxAppend`'s put); no
non-storage await before the commit; no new gold or stash writer (the
refund rides `mail_gold`, `_goldGive`). Each flag off: the old two writes
and the request's tier. A scratch probe paid expiry (online, offline), a
cancel into a full stash and two cancels at once exactly once. Suites:
market-own-place 18, market 298, market-settle 37, gold-door 205, inbox
57, stash-door 23, test-mode 70, liveops 111, keep-switches 14; RV's
`npm test` 514 green. Break proof: `_mktCancelOrder` back to two writes:
market-own-place 4a, 4b (`blades:2`), 4c (`coins:1500`) red. Nits:
wire/http.js 75-76's place row omits `mkttier` (its note "nothing checks
them" now stale), the cancel row `mktheal`; `_mktOwnPlace`'s comment
says it knows the book's tiers (it checks characters only: an old
wooden bow rests under `bow:wood`, unmatched, cancellable, no loss);
with `mktwords` off the label is the page's and the tier the weapon's;
the suite covers cancel only.

## K2 #2073 (5727): `bowshot` and `cookstart` ON (decided for the owner while away)

READY. `bowshot` (read at 8d4f5365): the ON path keeps memory only
(`ps._bs`), drops quietly (`_hpTally('shot')`), skips test mode; nothing
written or sent. `cookstart` (bb37229d, read here): `_cookStartOn` on
unless `cookstart: false`; Found (c) of sitting 36 mended: the judge is
`_cookStartOk` (looks) and `_cookStartTake` (spends) after the 900 ms
floor and the fish check, in one synchronous handler (no await between);
the session's one no-plan result spent the same way. No write, no send
added. The four suites that cook with no start read the rate with
`cookstart: false` (anticheat 7, fish-variants, gather-hits,
lifeskills-economy 3-3a); `cookstart-on.test` new (11 FAIL on main). The
body lists both under "Decided for the owner while away", each with its
switch. K2's `npm test` 514 green.

## K2 #2081 (5728, `ceilfair`): a socket's share never under 45 a second

READY (reviewed in full at 7ee010b2; bc3bbdae adds `main` with both
switch rows kept). Break proof: the floor's line taken out: flood-ceiling
6 red (honest phones 23,760 of 28,800: the body's 5,040). 14 suites green.
PLAUSIBLE, low, the PR's intended trade: 120 sockets at 45 a second are
now handled (5,400 a second against 4,000); handler work only (the room is
billed for every message received either way), and it takes the room's
whole player cap. Nits: the body's "120 x 45 < 8,000" leaves out the
ceiling's own 4,000 (sustained under 8,000; one burst second about
8,770); the honest 45 a second rests on card K's census (bundle parts
count one each at index.js 4865).

## T2 #2075 (5741), #2087 (5742); M2 #2084 (5343): the page's reads

READY (reviewed in full at a9da3c4f, 01986c72, 063481ff; the heads since
add `main`, the row's move and #2084's stacking). Every moved read
returns the same value as before for absent, `=0`, `=1` and other values
(each name's table form matches the old test); read at the same time as
before (module load stays module load; per render stays per render);
`sw` parses again only when the address changes. `?room` without its
try: `pageAddress()` catches its own errors. No new message type. Guards
on each head green (`switches`, `switch-reader`: 59/59, 56/56; merged 34
with #2084's line set to 34). Nits: `?dev=0&dev=1` was true, now false
(the reader takes the first); encoded or `+` values and the old `\b`
regexes' `=1.x` read differently.

## M #2089 (5340): the frame as named steps (card M PR 1)

READY (reviewed in full at b9832703; 27a8886d changes `status/M.md`
only). The six calls keep their text, order and arguments; marks behind
`if (_steps)`; a throw stops the frame where it did (one `try`); 14
`performance.now()` a frame, nothing allocated; a step's first throw a
page load to the crash ring (`frame-step` quiet: at most 7 entries);
`?framesteps=0` the old loop. `server/test/after-frame.test.mjs` 2a only
widens its pattern (deploys the worker; the planning session's answer).
Guards green; break proofs: a call moved past `end(3)` (check 3), a line
added in legacy (check 5). Nits: the console line's text; the heldsweep
sample's one 21.8 ms frame in `renderFrame` (`wheelGroundAt`), likely the
box (TRAPS §200; the full run offered in the body); 7 `frame-step`
entries could push older evidence from the 16-entry ring; `__btSteps` set
on every page, as 61 other probes.

## Documents and tools (step 3)

- V2 #2076 to #2080 (5760 to 5764): the card's files (PR 5's two form
  lines are the planning session's answer, in the card); the card word
  for word; five guards and `action-door`, `one-program` (29),
  `switches`, `four-lines`, `tests-by-system` green on #2080's head; V2's
  `npm test` 518 green. #2080 touches a `server/test/` header: deploys.
- U2 #2074 (5781), #2082 (5782): the card's files; precheck's four
  checks call the shared rules (the old bodies moved, read here); U2's
  `npm test` 518 green; nine guards green on #2082.
- RV #2072 (5800): the review (`census/RV-review.md`), the card word for
  word, the row.
- M2 #2085 (5344): `render-tables` green; `M-tables.md` (54 tables, 79
  lone constants); the card's line 5. Lands inside #2084.
