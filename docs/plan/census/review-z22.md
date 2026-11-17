# The gatekeeper's review, sitting 22 (card Z; tag 5660)

Taken 2026-11-17 on `main` f692b93 (sitting 21 merged). The owner asked
for speed: the PRs in hand reviewed and listed now, one reviewer a PR that
changes the game (the seven angles of `/repo-review` in one pass, each
candidate tried before it is reported). Later arrivals go to sitting 23.
Tags here are written bare.

## The switch table: why three PRs wait

Each PR below is clean against `main` alone, but new switch rows meet on
one line (TRAPS §333). Step by step from `main`:
T #1935 conflicts with MOD #1909, MOD #1914 and RT-1 #1940
(`docs/SWITCHES.md`, `tools/guards/lib/switches.mjs`: T re-dates the rows
beside theirs); MOD #1914 also conflicts with MOD #1941 (`invitepace`
beside `freezedevice`) and with RT-1 #1940 (`invitepace` beside `ip56`).
The set listed (T, T, L, MOD 5, O) merges clean in order, one merge base
at every step, tree c999c4b (O's later test-only fix aside): precheck 0 FAIL, build
PASS, questline 187/187. MOD #1909 >
#1914 and RT-1 #1940 merge `main` in after it lands (each session told)
and come to sitting 23.

## T #1935 (tag 5308): the switch rows' merge days

Head fd5c94503ac00e1915241e49a80b2e9b52f56f05, base `main`. 18 rows of
sittings 19 and 19b `on` 2026-11-15 -> 2026-11-16, `arenadoor` ->
2026-11-17: each checked against the first commit on `main` holding the
row (UTC). The five that merged on the 15th kept. The table and the page
agree on all 521 rows; `switches.test` green. Nothing found.

## T #1939 (tag 5309): nine reads moved into the page's one reader

Head 8fa97d086fe18e98d6360af49d3890e6e3c56c46, on #1935, base `main`.
Each of the nine read the same as before: name, default when absent
(`treefade` true, `questpath` false), sense, and when it is read
(`nobeds`, `noforge`, `townchat` at first call, kept; the other six at
load). `src/game/switches.js` imports nothing (no cycle). The outside
line 221 -> 212. Nothing found (`?droplines=0.5` and a name written twice
now read differently: addresses nobody uses).

## L #1936 (tag 5523): the ride door

Head d64987c44cfffe02563fd47801fa65051db7fac4, base `main` (it was on
#1930: one merge base, 607baa2, once #1930 landed); marked ready in the
sitting, no push. `_rideTo` is the one writer of `ps._ride` and
`ps._ridePid` in `server/src` (grep: ride.js 113-119 only; no spread
copies them). A refusal writes neither field. `ridedoor` off: main's writes
byte for byte. `ride-door.test` 24/0. The `ride` row `todo` -> `door`
(15 -> 14 `todo` once merged).

- Found, low: with `ridedoor` on, a ride from a session whose id is not a
  string (`id: 4242` at the join) is refused `dead`; main allows it. No
  phone or bot sends one; the comment "never refused today" is not quite
  true. For L's next PR (`pid != null`), not a hold.

## MOD #1941 (tag 5625): the freeze's devices, words outside the lanes, the name fold

Head 9d91841f0ca7f6deb4637d4393122b8accc3c21e, base `main`, one merge
base. Nothing stored changes shape (`_frozenL` is memory only). The
server's name fold and the page's are the same code and agree on every
probe. A device with no `device:` record falls back to `auth.devs`.
`silence`, `charname`, `mirror-audit` green. **Not held:** the two
freeze findings bite only with the owner's lever `freezedevice` thrown,
and it is OFF (unset). Sent to MOD, to fix before the lever is ever asked:

- `silence.js` ~256 with `botfp.js` ~258: the `device:` record keeps the
  last 8 characters and drops any not seen in 30 days, so the owner's
  test-mode character can fall off a phone's record, and that phone is
  then held (probe: 8 test alts on one computer, one frozen, the owner's
  other alt refused `frozen`).
- The row says "refuses any NEW character"; `_frozenDeviceIs` never asks
  whether the character is new. A friend's existing character on a phone
  the frozen player once used with a new key is refused (it was not
  before #1941).
- `together` (reservednames.js ~88, charName.js ~56): cl->d runs before
  l->i, so "Officlal" passes while "Offlcial" is refused (a miss, both
  sides agree).
- MOD's status dropped the name rule's lows from Next without a word.

## O #1937 (tag 5238, 14d): the clip

Head a8cc3847faa8f928cd8b93965d2a4ad0726df9bb, base `main`. The clip is
tested once installed, each program through its own sprite's batcher, read
once behind a fence; textures destroyed; `back: null` (named in `self`,
drawn as today, the owner's open question from 14c). `selfClipWant` is
held to the shader's two discard lines by the suite; the four test colours
sit a tenth from each line.

- **Held, then fixed in the sitting:** on 360d8bb the suite's section 9
  came after its `process.exit`, so a drifted clip line printed FAIL and
  exited 0 (tried: `outColor.a < 0.4`). O moved the exit below it
  (a8cc384, that file only): 47 passed; the same break exits 1.

## Arrived during the sitting: sitting 23

K #1942 (5544, `heapforget` ON), R #1873 (5282, the save shape 21 -> 22:
its own line), P #1943 (5565, three more stacked on it), OPS #1944
(5610, `guestlazy`), L #1946 (5524), MOD #1947 (5626, `mktwords`), and MOD #1909 > #1914 and RT-1 #1940 as above.
