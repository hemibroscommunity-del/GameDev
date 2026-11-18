# The gatekeeper's review, sitting 45 (card Z; tag 5034)

Taken 2026-11-18 on `main` 79f8c4ab (tree 0602e0f7: sitting 44's whole
list, lines 12-17 at RV's moved heads). The running cards were told this
sitting's session at 01:18 UTC; V7 at 01:41. Tags bare.

Z took no new block: this PR is on Z's free tag 5034. It registers V7
(6080 to 6099) for the planning session; `nextBlock` 6100. J3's block
(5840-5859) was already registered.

Reviews in full (`server/` or `src/`): one reader a PR group, the angles of
`/repo-review`, each finding put to its own disproof against the code and
the suites: M #2127, #2131; M2 #2144-#2146 (a deep-equal of every moved
table); V3 #2128; K4 #2129, #2140, #2147, #2151, #2162; K3 #2130; K2
#2136; U3 #2138; CS #2139, #2152; RV #2115-#2123 (the mends), #2132,
#2133, #2141, #2164, #2165; V6 #2135, #2137, #2143; P2 #2142. Read here:
V6 #2149, P2 #2150, #2161, V7 #2153, #2163, K3's claimSell mend, CS's
size fallback. Documents and tools (step 3): O2 #2148, J3 #2154-#2160.

## Findings

### M #2127 (5341) and #2131 (5342): none blocking

- Lows: `server/test/canvas-witness.test.mjs` 8b (`/owedrebuild=0/`) now
  passes only on the comment at BroTown.jsx:174, so it no longer checks the
  code; status M.md at #2127 was stale (refreshed). Nits: frame-steps'
  `legacyLines` leaves out each grouped step's whole span (BroTown.jsx
  6004-6021 holds `updateZoneMechanics`); switch-reader check 3 reads
  33 -> 17 on the merged head (the status said 34 -> 18).
- Sound: with the marks stripped BroTown.jsx equals its base (order,
  arguments, guards, try/catch); all 20 marks are top-level statements of
  the loop's `try`; the 18 `sw`/`swHas`/`pageAddress` reads point at the
  module import; `pageAddress()` equals `window.location.search || ''`.
- To lower once merged (sitting 46): frame-steps LEGACY_LINE 1555 -> 1531;
  switch-reader OUTSIDE_LINE 33 -> 17.
- `crowdfight` ("knew every bot") and `manualcombat` 10a fail on main the
  same way (TRAPS §177): not M's.

### M2 #2144 (5345), #2145 (5346), #2146 (5347): none blocking

- 133 of 133 moved names deep-equal to main (77 entityRenderer, 56
  effectsRenderer), by source text and by value (key order, property
  settings, getters, frozen, Map/Set, NaN). The table files import nothing
  and read no switch at import time: no evaluation-order change, no cycle.
  No runtime write to a moved name. Use counts per name unchanged.
- Low: render-tables `TABLES_LINE` stays 54 while the count is 0: lower to
  0 once merged (sitting 46). Nits: five dead imports in entityRenderer.js
  :173 and one in effectsRenderer.js:660 (dead on main too); the part-5
  marker text is written twice (render-tables.test.mjs:47,
  render-code-census.mjs:25).

### V3 #2128 (5921, `pacekeep`): none blocking

- Nits: `pacekeep.js:41` names `pace-keep.test.mjs` (the suite is
  `rejoin-pace`); `wire/in.js:300` `rest_request`'s trust text still says a
  reconnect lets one more through (K2's file); the item ace flip
  (gamble.js:185) is not tested across a rejoin.
- Sound: keyed by the stable bp_ id in a Map, entries
  `Object.create(null)`, `__proto__` tested; `_sanitizeJoinData` cannot
  zero a stamp; cap 1,000, spent first then oldest; no storage write;
  `pacekeep: false` the old path; the five renamed refusal keys keep `rate`.
- Its `pacekeep` row meets RV's `paidmark` row in switches.mjs: V3 is
  listed after RV and merges `main` once #2132 lands.

### K4 #2129 (5901), #2140 (5902), #2147 (5903), #2151 (5904): none blocking

- #2129 low (not proven): `bowshot.js:126` records the arrow's start when
  its message arrives; the path is fixed at release, 110-250 ms later on a
  slow phone; a 4-fps phone sprinting at full range can pass the 250 px
  slack (covered by the no-arrow allowance, 3 then one each 3 s). Nit:
  testmode.js's header names `bowshot`, not `bowreach`.
- #2140 (sitting 44's medium mended): the phone says the grade only with
  `caps.harvestGrade` and `hc.grade`; XP not doubled (player_state lands
  first). Low (only with `harvestgrade` ON): `lifeSkillRewards.js:839`
  the phone's predicted level-up from doubled XP is not taken back. Nits:
  `S._strikeShown` remembers one strike; out.js:604's `absent` text.
- #2147: the same draw; `harvestshard: false` the old path; no honest
  harvester loses a shard (wheelzone.js ~456).
- #2151 (`bowpath` OFF): OFF equals #2147. Before it is turned on, two
  mediums: `bowshot.js:113-132` the relay's `ang` is taken at fire, the
  line is set at release (a held aim keeps moving; 4 of 8 claims landed at
  35 degrees off); `bowshot.js:77/130` the side slack is from the
  monster's feet (a 5x boss hit 95 px up: 4 of 8). K4's #2162 (5905)
  mends both behind `caps.bowPath` (below), with a new medium of its own.

### K3 #2130 (5882): none blocking

- The pet's listing reaches `http:/api/store/list` with the bytes the other
  kinds send; store.js's request id covers pets. With V4's #2125 the
  §265 guard went red; K3 mended it by holding `claimSell('pet:'+id)` in
  PetsPanel (released in a `finally`; the planning session's yes), V4's
  guard untouched.

### K2 #2136 (5732): none blocking

- Low (bounded): with `seathold` off, an idle guest's spare sockets let
  the room reach the cap plus 3 (refused under #2092); CS's `seathold` ON
  closes it (`_seatJoinRefused`, join.js:700). On card K2 by the planning
  session's word (from CS's report).
- With CS #2139: no text conflict, but `switches-thrown --only seathold`
  went red on both together: K2 first, CS re-listed `seathold`'s
  thrownFails on K2's head (done).

### CS #2139 (6000) and #2152 (6001): none blocking

- #2139: all six safe on: no new stored shape, every key registered, no
  client cap, no write per move. Per switch: `reqstamp` 1 read + 1 put per
  paid request; `fullsnap` 2 reads per player a day; `resetbook` 1+1 per
  restart; `xferescrow` 1 row per wagered settle; `seathold` at most 1 put
  each 15 s while who is in changes; `freezedevice` 1 list per join.
  cost-guard: only §8 (seats, 2) and §17 (one `xfer:` row), named.
  Mended on the review's word: the fuller daily copy past 120,000 bytes
  (UTF-8) is the character alone (a put past 128 KiB threw: no copy);
  req-once §10 checks its buy. Low (old code, now live): `seathold.js:364`
  a hold running out between gate and join is refused room_full once.
- #2152 (the usage meter): O(1), no allocation once a type is seen, never
  writes storage, after `ws.send`, inside try/catch; `/dev/usage` only
  through `_adminFetch`. Mended: the switch asked first; today's bucket
  from 00:00 UTC; the box says Cloudflare bills messages RECEIVED.

### RV #2115-#2123, #2132, #2133, #2141: none blocking (mends verified)

- #2115 (`friendfix`): sitting 44's medium closed: `dropStaleOut(mine)` on
  the sender's next request, before the duplicate check and the 25 cap;
  both copies carry one `at`; no new write. Nits: a rejoin's
  `friend_sync` lists a run-out request as Pending until the next request;
  an accept still honours a request older than 30 days (as before).
- #2116 (`namestaff`): the owner's decision kept: a stored alliance name
  or tag is checked only when it changes. Nit: re-sending a stored
  staff-sounding pet name answers bad-name.
- #2132 (`paidmark`): **medium, mended at c5a4191e**: a season's tiers were
  marked claimed before the first grant and the record put with each
  grant, so a restart after the first lost the rest for good (probe: 21 of
  22 lost). Now the season is out of `paidmark` (`markWith = null`): the
  old order, a claim again converges; paid-mark §5 holds it (break proof:
  1 of 22). Spin pot and login spin: one run; +1 row per spin payout
  (cost-guard §24, the owner's yes).
- #2133 (`lookform`): pure, no writes. Nit: a grandfathered staff-sounding
  pet name is dropped from the inspect card.
- #2141 (6021): the chest's stamp and save in one synchronous run, no row
  more; the rise chest untouched.

### V6 #2135 (6040), #2137 (6042), #2143 (6041), #2149 (6043)

- #2135: eight `{}` to no-prototype maps; no reader relies on the
  prototype; the frames sent are byte-identical; the stored party and
  ticket records keep their shape; break proofs real (sites 1-4, 6-8).
- #2137 (docs): rows match the close() calls and wsClient's onclose. Low:
  one-socket.md's 4004 row (silence.js's close is a frozen device's join;
  admin.js:741's live freeze closes with no words). Nits: ~line 203 "None
  is one the client reads as idle (4006)" under a table holding 4006.
- #2143: two `kept:` comments only (slimeSprites.js:151,171); the node test
  runs the unload.
- #2149: `map_watch` and `acc_request` no longer reset the AFK clock (a
  player who leaves the World map open 2 minutes untouched is let go, as
  anywhere else; no switch). afk.test §9 green. **On the whole tree,
  `traps-combat-rules` §24 goes red** (its census still lists the two):
  held unless V6 takes them off (the planning session's word asked).

### P2 #2142 (5981), #2150 (5982), #2161 (5983): none blocking

- #2142 lows: a local player blocking south with a shield, and a
  townsperson whose look frame is null, draw the plain tee from RGBA, so
  those sheets still go up once (0.1-0.3 MB each, never above main's).
  MEM_LINES gpu 114.3: the fight reads 77.8-82, the rung never sooner.
  `shirt-bake --check`: the numbers on disk are a fresh bake.
- #2150: the goo/fire atlases kept as images (`keepAsImage`), decoded
  behind the gate; `?shotimage=0` the old canvases.
- #2161: the retired town's signs and flags load with its scenery, behind
  its own veil (`?townparts=0`): decided for the owner while away by the
  planning session (the zone-art exception; the town is unreachable).

### V7 #2153 (6080), #2163 (6082); U3 #2138 (6060); J3; O2

- V7 #2153: a held attack now waits as a tap does (harvest pose, vines).
  Nit: `climbStats.refused` counts every frame of a held press on the
  vines. #2163: the wind-ups (`_tgFrom` ... `_telegraphRange`) carried
  across a re-push within one life.
- U3 #2138: `S._dropLines` and `S._trap.mark` cleared at the zone (nothing
  reads them after); `clearRide` at the rejoin, the same case as
  wsClient's own. Nit: the `_trap` row says the whole field resets.
- J3 #2154-#2160 (step 3): one scenario a PR, test files only, each green
  alone twice or more; the hitsound floor 0.6 for stone and snow is the
  planning session's yes.
- O2 #2148 (step 3): the full profile run (the owner's yes), census only.

### Late: reviewed, listed or held to 46

- K4 #2162 (5905): on the list as OFF (the relay as before, the cap on
  its own line, in CAP_GATES and CAP_OPT_IN). **Before `bowpath` is ON (medium):**
  `projectiles.js:1810` a nocked arrow can hit in its 110 ms nock; removed
  (:2671) or landed (:1305) before release, it sends no relay
  (`releaseRelay` :1610), so a point-blank archer's claims run out of the
  no-arrow allowance. Lows (ON): `bundle: false` lets a claim within 33 ms
  of release beat its relay; `_pfBowShot` jitter; peers start the arrow at
  the bow hand. Nit: `bowshot.js:145` reads `m.boss`, never set.
- RV #2164 (6022, `deadtake` in the money's four) and #2165 (6023, the
  store's book a page an await, `listcap`): the review found nothing
  blocking (nits: `storeoffer.js:440` a dying resend gets the wrong
  words; `listcap: false` keeps the build-then-publish, as the spec says),
  but **#2164 is red on its own head**: `traps-economy-social` §269 ("gates
  the trade window shares ... none new": `_deadTakeOn`). Both to 46.
- CS #2139, #2152: reviewed, none blocking, but #2139 counts two bases
  over K2's #2136 and meets RV's #2115 in `switches.mjs` and SWITCHES.md:
  to 46, after K2 and RV are on `main`.
- V7 #2163 (6082, the wind-ups carried) and #2166 (6083, §273's rows carry
  their why, guard text only): on the list at their `main`-merged heads.

## The rehearsal (main 79f8c4ab)

Each line merged into `main` with every line above it (a merge commit, as
GitHub's); the merge bases counted at each step (`git merge-base --all`);
the tree after that merge.

| line | PR | head | tree after | bases |
|---|---|---|---|---|
| 1 | #2148 | `5376cd38134da46d831892a6c3c6db2714e0535d` | `f6343364efca00bfc77658ec8421e30887a92df7` | 1 |
| 2 | #2154 | `96fd95d66459655b2544d7e7d3ba743ca4a1d39c` | `8388bc3d3a825e107f124759b523b0a1c74f9fb3` | 1 |
| 3 | #2155 | `fc93a0921010dec0f41d7fc9e84d1f267b8fa699` | `add5091631270b9e3bcff5d8f7a2f6da4932af08` | 1 |
| 4 | #2156 | `c9d52a3460096e52c9d51be0578cee3f38b416f2` | `ef1cebfea43daf98f4337d1c63cdeeb246429e8d` | 1 |
| 5 | #2157 | `c73872c18c44c9df569355d0f1e364356d8981bd` | `fb24408df04c461679c392d8cda7c1fa3cb5047c` | 1 |
| 6 | #2158 | `5e967aeb58f72d0d876f1200f81629ad02aa9e97` | `a6ba4b60725a46a0bf6b3b886036381e482691ba` | 1 |
| 7 | #2159 | `14edfcc6a5750ce36d6d942c975fe0118c4b45aa` | `8d04899e355beb85a3a67afc27579d5772656de5` | 1 |
| 8 | #2160 | `33154d123d869f5915a02d82d5065b1e07d2e246` | `0e4903b6f4eed105ff10d7bc128e7ce4e816a74b` | 1 |
| 9 | #2138 | `e1b46588454c6e431443bdab321b419da435fcb5` | `a4bac9875c327538a358741f9e43b857ceada99a` | 1 |
| 10 | #2153 | `1a83c60912714e36fda50c6b37225c3c4110f7df` | `42f05f42237c00c189ba4ea6ef0993bacdfcd0f0` | 1 |
| 11 | #2163 | `3861cfc213633cbdb82507bb52cacf5f14225a77` | `5701f2743a45eb7ac2dab1f54cec7ee876a0fde5` | 1 |
| 12 | #2166 | `770a25a54c6be0f0f0a2442e390125a5a5a3db79` | `2a64f7a3e22a697c6d3a5bc167d7031df381f0f4` | 1 |
| 13 | #2130 | `403320ce17242ba23be071b468b998ae0ac8b6f0` | `b0ab7b9d42dfe3b8ba8fd775dd5a265e9b411192` | 1 |
| 14 | #2142 | `83ca17a71669c4176da8be5346040175f65f3304` | `4c6cbea65f7fead5f2e6cfd7b2e28ed9a92f91e9` | 1 |
| 15 | #2150 | `0054b3184c75ea808c5047d8e52dda3de0fe4ddf` | `163e61d4d98eed678bced6cd8b46e6e3b71edf5c` | 1 |
| 16 | #2161 | `fe2f33eaba94d681ae8294a7a879080b89d89837` | `fb29edee792586bab61aa1027f84f499e361e237` | 1 |
| 17 | #2127 | `56bca8db9092eef6c74b759120bca7e9d878e9e4` | `17631a0c591f633de703c943a6196fe99d18078d` | 1 |
| 18 | #2131 | `8cd66542401cbf14e2a50254b8d963fdcf4fdc79` | `0591e15888e3faecaa242e880e37e0c0915e0ffa` | 1 |
| 19 | #2144 | `dd1bd0e33771885b77b65876eabcbfe3b7180214` | `d5dda5afe9c2a10f4f9abce0fd98ec357b961da3` | 1 |
| 20 | #2145 | `472eda104deae2619697c8c8d3b23f0d9e263289` | `82afa5609903de090f6482817e36a73e1deb289d` | 1 |
| 21 | #2146 | `3108f7c3d031defad055a1e865b96c080d828c23` | `61c57c7660df4cc2ad3a75a3099e0739c2e8de25` | 1 |
| 22 | #2129 | `7c38f88c8970971a64a8c04be565a5fcf95d952e` | `d038951ce1984334e4a7da2ca467efbf90342d56` | 1 |
| 23 | #2140 | `b24d31180b1709d67ceb555dc22f483c4048d655` | `1e2f07b82f2fbe62e41d049148fd0ffc0e9fbeb9` | 1 |
| 24 | #2147 | `96ebd5ac5e323647025ce22994013c9251b6b706` | `34845c886e32f0713efca6ab6d7bb62fba4bab65` | 1 |
| 25 | #2151 | `99f9dc67327e9b9577467546f2ea24932c1c833a` | `f540d77c3ae10e62b84e5ebe25ac9e49bdb2f002` | 1 |
| 26 | #2162 | `82767a1605d6b5baa9b7a648919459c100c10d8f` | `87502970fad2fbc62103f67e644f7c7ba8a61443` | 1 |
| 27 | #2136 | `9dfd14bb8d4a53829a8d5681fc4f17d63944d015` | `498fba1c5c26e38f2c3264efd7270218f65f6c77` | 1 |
| 28 | #2115 | `62547b3a3c2cf93363749cec91fbf4bd7e915c9e` | `9cbc61bd6fe85ddb20d9716159fcf427c9d53559` | 1 |
| 29 | #2116 | `98b34262301c2c484854d60ee3bef5579bc65bc5` | `cf730078b6e3ff3e90329853e709fbde6d9a3415` | 1 |
| 30 | #2117 | `ecf677d7738ab15bbeb1e354d6528c48c3daa412` | `e60820d645467613844b47a7ffdcbed592a3923c` | 1 |
| 31 | #2118 | `61ce4ce1ad7556c3bedd4ac9fb04ef4ae51a77c3` | `2bb04d4e5ed2e15d5cb7d451bfee3600b4fde8df` | 1 |
| 32 | #2119 | `7b039d86ea60fcde04396b792190387e62f31883` | `344935554b0871bcb020498071d0a6f6ab88f676` | 1 |
| 33 | #2120 | `aa94fa7bd6a1db8873fa74b6ba0d11298add8675` | `215a2fe27065fac822ab419a379a4ce91af6742d` | 1 |
| 34 | #2121 | `aee1c56067400f37c4f0eeb75508cc6edb1088f3` | `c6cc28a7c250f5afe7b780ba285bb871f8c3f043` | 1 |
| 35 | #2122 | `9c5f09b7911779c31e8876c9b8458f151b0a530c` | `0fad23e802745b31adac6cb68cad7dfd1450b17f` | 1 |
| 36 | #2123 | `26903bc6e811d7df632b9659e4c762e7fe0739a7` | `a259b1dbcf9e8f9b03907b79ffaf815891ccf7cd` | 1 |
| 37 | #2132 | `576a0417fd240ffd471dc591ceddf58b2dbc159e` | `63933396858c3c3d9866b6594b9155d64e1ba43a` | 1 |
| 38 | #2133 | `e047789faed4b75fd4b308080dffa74028d45ae9` | `a5fc9ce3cacf1d750d2ec8846ec7ed65bea8cf58` | 1 |
| 39 | #2141 | `435e11a6838c1e2c791ad8defa671e1b61550c6a` | `1947ca3327bf007dda938f8599316bbfcec438fd` | 1 |
| 40 | #2135 | `e6b85c80b50b4935003477ae9031d63b7a246ad0` | `8db0f722acbf9d74a87fcbadb3949174bb302b96` | 1 |
| 41 | #2137 | `ef7b1591700410a5d358afd8c52eb16c00ccdcb4` | `80e0222eb5fc75c3b8cf635007678358c2233784` | 1 |
| 42 | #2143 | `ee6a25fae0ee3f92b223f1696f105e6ed70fe6a6` | `44697645e9a0107395f50e88fc16208ab456f698` | 1 |
| 43 | #2149 | `7263f8b0bcc959ea11711f115e19bc2fce3a228b` | `52332e6dfb4624a58f3dd1243226e668cb740035` | 2 |
| 44 | #2128 | `aa71938` + `main` (V3 merges once 43 lands) | -- | -- |

## The checks on the whole

- A tree equal to main's (sitting 44 simulated, 0602e0f7) with 30 lines
  (no M2, CS, RV above #2114, M #2131): precheck green but `server-tests`
  (its 5-minute cap); build green; the server suite 556, one red:
  `traps-combat-rules` §24 (V6 #2149; mended at 7263f8b0, the planning
  session's yes).
- Lines 1-18 and 20-42 of an earlier cut (37 lines, before K4's and K3's
  main merges, which change no tree but their own): build green; the
  server suite 566 suites, all green (840 s).
- The questline tree (lines 1-43 as cut at 03:14, with RV #2164 and
  #2165, without V7 #2163 and #2166; 9747f24b): build green; questline run
  alone: 187 of 187 (430 s).
- The final tree (lines 1-43 above, 52332e6d): every merge clean; the
  guards traps-combat-rules, -economy-social, -worker, -money, -saves,
  -wire, -page-rules, -page-holes, switches, systems, four-lines,
  cap-gates green.
- RV's own full run on its stack's top: 561 green (714 s). K4, V3, CS, M,
  M2, U3, K3, P2, V6, V7 report their own suites green.
