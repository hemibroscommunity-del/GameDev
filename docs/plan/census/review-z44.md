# The gatekeeper's review, sitting 44 (card Z; tag 5033)

Taken 2026-11-18 on `main` 3750ba4a (sitting 43's whole list merged). The
running cards were told this sitting's session at 00:14 UTC; V6 and U3 at
00:33. Tags bare.

Z took no new block: this PR is on Z's free tag 5033 (5032 was sitting 43's). It
registers, for the planning session, RV's second block (6020 to 6039), V6
(6040 to 6059) and U3 (6060 to 6079); `nextBlock` 6080. No card PR touches
`tag-blocks.json` (RV's #2123 adds then removes it: its diff is empty).

Reviews in full (`server/` or `src/`): one reader a PR, the angles of
`/repo-review`, each finding put to its own disproof against the code and
the suites: K2 #2103, V5 #2102 and #2107, V3 #2100, K4 #2105, SEC2 #2096,
RV #2109 to #2123 (five readers, three PRs each; RV ran the full suite on
its top). K3 #2104 read here. Documents and tools (step 3): P2 #2101, O2
#2108, V4 #2106, #2124, #2125, #2126.

## Findings

### V3 #2100 (5920, `deadtake`): held, then mended at 362303a6

- V3's 362303a6: the shield gate dropped (`shieldwear.js` is main's);
  `_handleShieldWear` back on §150's LIFE_KNOWN with the reason (13 -> 5);
  life-take §6 holds that a dying swap still moves; the switch's off text
  says the farm and salvage answer `dead` either way; state ready.

- **Medium.** `shieldwear.js:135-138`: a dying player's Equip of a spare
  shield is refused by the worker, but the phone keeps showing and saving
  the new one (`equipStashShield` has no dying guard; the refusal echo
  sends the worn shield, which the phone already holds), until the next
  join. It closes no hole: the death's loss already ran in
  `_handlePlayerDeath` (index.js ~3157). The function's own comment
  (:151-154) warns of this. Mend: drop the shield gate, keep
  `_handleShieldWear` on LIFE_KNOWN with that reason.
- Low: the farm's three and salvage's two answer `dead` whatever
  `deadtake` says (the client's fallback words); the switch's off text says
  "as before". Nits: the farm checks run before `_farmRateOk`;
  `salvage.js:172` stamps `_lastSalvageAt` before the refusal; life-take
  §8 tests the off path for the pet house only.
- The status file at the head still read `state: working`.
- Sound: every new refusal comes before its take; `lifeOf(ps)` reads the
  one life phase; no living player refused; `deadtake: false` the old path
  for cooking, armour, shield, pet house.

### V5 #2102 (5960, `listcap`) and #2107 (5961): none blocking

- Low: `clans.js:78-82` a failed load is no longer kept, so a `clan:` row
  that fails every read now fails every join (4013), where before only the
  worker's first join failed. Low: `_listAll` still holds the join for the
  whole clans and silences registries (handoff rule 9); the census counts
  them fixed. #2107 lows: `chatmod.js:488` the owner's chat reports read
  the OLDEST 2048 (the panel never reads `more`); `admin.js:611` one page
  of 64 copies hides the parachutes past 64 (rings hold 14). Nits: §76's
  floor 30 where the scan finds 37; `_bountySweep` deletes one at a time.
- Sound: the five sweeps' cursors only move on; each stamp check is in the
  refund's own event; arena settlement reads the full set; the reset still
  deletes every quest-item stamp; `listcap: false` the old path.

### K2 #2103 (5730, `joinguard`): none blocking

- Lows: `join.js:394-402` a bp_ record with no `auth:` played by a keyless
  stranger refuses the rightful keyed join 'key' while the stranger stays;
  `seathold.js:349` one public held id named N times fills every held slot
  (`seathold` is off in production); ACC-1's keyless join naming an online
  GUEST's id still replaces it (the spec should say open). Nits: ACC-2 also
  stops reading an old `char:` row for a keyless bp_ join.
- Sound: `joinguard: false` the old path on all four lines; no `auth`
  refusal added; no new write per join; test mode not asked (protects
  others).

### K4 #2105 (5900, `harvestgrade`, OFF): none blocking as merged

- **Before it is turned on (medium):** `gathering.js:1632` pays a perfect
  as good, but the phone already showed "PERFECT! x2" and double XP;
  `harvest_credit` carries no grade, so nothing corrects it. The 15-in-20
  share pays a skilled honest player (about 70% perfect) good on about 1 in
  5 perfects: "the same ore" holds at 45% only. Lows: a socket lost between
  `extraction_start` and its plan judges a replayed strike against an
  unplayed plan; a liar leaving out `hitSeq` keeps the old timer window.
  Nits: `SHARE_MAX`, `SHARE_OF`, `SLACK_MS` plain constants (botfp's sit in
  `hidden.js`).
- Sound: OFF is the old path; no new write; the cap on its own line and in
  CAP_GATES; test mode listed in all three places.

### SEC2 #2096 (5821): none blocking

- Lows: the card asked for pictures in the PR (the body has words); the
  private reporting form works only while the repository is public
  (CLAUDE.md §4 says private since 2026-10-28; the owner's). Nits: the
  card's "PR 2 enforces" now PR 3.

### K3 #2104 (5881): none

- `act()` sends the same frame; the `req` row's request id passes the wire
  door's form; the worker's guard (the round's `k`) unchanged.

### RV #2109 to #2123

- #2109, #2110, #2111, #2112, #2113, #2114, #2117 to #2123: nothing blocks.
  Lows: #2109 `nomansland.js` ~852 `_creditLiveTogether` outside a
  try/catch; #2110 `duel.js` ~200 a paced lowered stake against the
  target's card; #2112 `AVATAR_REST_RE` refuses `' ( )`; `leaderboard.js:212`
  no kill switch; #2117 `admin_log` keeps 100, so "you did nothing to
  logins" can be wrong; #2121 the session token in a URL query; #2123
  "tap" without `deskWords()` (`DeviceScreen.js:76`).
- **#2115 (5811, medium):** `friends.js:63-70`/`:166` `dropStale` deletes
  B's `reqIn[A]` but never A's `reqOut[B]`: A can never ask B again and
  the request holds one of A's 25 slots for good (before, it stayed open).
- **#2116 (5814, medium, the owner's):** `alliance.js:329` refuses
  alliance names with "team", "mod", "support", "staff"... as `bad-name`,
  before the unchanged-name shortcut: a stored "Team Bro" cannot change
  only its tag.

### Documents and tools (step 3)

- P2 #2101: the census ranks the families with MB; the card committed.
- O2 #2108: the three scenarios take a profile; one sampled run each in
  `O2-profiles.md`; the /world/ line fix for #2098.
- V4 #2106, #2124, #2125, #2126: 62 of 63 traps held by rule, each with a
  break proof in `V4-traps.md`; guards only, no `server/` file.

## The rehearsal (main 3750ba4a)

Each line merged into `main` with every line above it; one merge base at
every step (`git merge-base --all`); the tree after that merge.

| line | PR | head | tree after |
|---|---|---|---|
| 1 | #2101 | `a1287fd0c2250e1f94fc550d4938b19d89117011` | `31a22ad41b00f9175f61cebfd978534d28b09040` |
| 2 | #2108 | `98c59c181628c2465b650a2eef3860fa0b8bdc67` | `6c0f4f1bac2077edf70cd057ad7f1b07c945ae3a` |
| 3 | #2106 | `deac6d2606ec7a5e800171338adf70a90c90aa86` | `12771ddb629ebaf6091ad7226f738deca0d005fe` |
| 4 | #2124 | `da5ef4af167efa47e9df9ed97d31125ddb61f091` | `40e7380d279cd6c72978cfb8e8ce32703caa3177` |
| 5 | #2125 | `91cc940fdf89545ac541c5bf467f77b396afd5e8` | `e6d935f9d2a44ae1bf5ef59432537e1e747e4f2b` |
| 6 | #2126 | `f4f4cd42e3b51fc1256c9473b4d644686770fe7c` | `b300ae41d995daf604e09c6b99e33c5ce6baf073` |
| 7 | #2100 | `362303a6322379d48016db46cea1648e0371ccf9` | `4b9119e84650cd4fc20a875b859be027617cd9ee` |
| 8 | #2102 | `718c9cb103dce48465b15b06a963161b3623179e` | `17cab72cac71b9bd86a47b0e7410b3a8b224c250` |
| 9 | #2107 | `83b43561631b4109adad59d0d00de5bba683adcc` | `12d21f25ba177e4c6ce9203a3edf63ec15c13ea0` |
| 10 | #2103 | `f7b2e9cdf3c26b6614ffa5a091eff8ebaf10470b` | `a59a77c7d66af7b5d2ba558d672f5e9ed41b5d17` |
| 11 | #2105 | `8ad940edf8224059c03c445ba53b1cb78f046819` | `e8523a526582aa4a731c1070f3c43187593f1a4f` |
| 12 | #2109 | `d610c41174856e051e835f589f32a108ed07e158` | `e53b075229f8260e093fe6e14707832c2139ee97` |
| 13 | #2110 | `cba182b290b630d0fc87ed1c4f602c0e355dbbb3` | `82b06a87a7114bdfa73638134414263797311c97` |
| 14 | #2111 | `b7735b2b1ed9f2babdf734ad13b8ef6738c40cd2` | `53eb2a2824f5a6e34bed6f35a734737afa22692a` |
| 15 | #2112 | `fe717a3901226419d1bc969a13a837df80646968` | `566d5680fd586ca88c2c780c4d6f9b63cd67f69d` |
| 16 | #2113 | `5fcd85575be70f4435ca5f712b4fa8340e9dafd7` | `64ed44ca17aafc659801b74a5e0d144287686f9d` |
| 17 | #2114 | `113a15aad764e78f42aba58f33a7abecb50c0d8e` | `347df7ea70a425d83a982b917f7038cdd0076cdd` |
| 18 | #2096 | `5aaa4cc7c6001f7609a216ff6b5ff7b5b6012bd1` | `a7423a29c1291630a7218b38e1cc400cc9ca60d4` |
| 19 | #2104 | `10e8e1e693791805729409b5a395b89bca5882ab` | `14fb5f8cfd3a9713a1cef61eff6e0677d9172a85` |

## The checks on the whole

- Rehearsal 1 (P2, V3 at 6c8281d4, V5 #2102, K2, SEC2; tree 036bfef6):
  precheck green but `server-tests` (its 5-minute cap); build green;
  questline 155 red from `tut_1`'s Accept on, at a load average of 19
  (five review readers and the suite beside it). Each branch's own
  `playable` was green.
- The server suite on tree 0a78582a (lines 1-6, 8-11, 18-19, without V3's
  mend and RV): 543 suites, all green, 800 s.
- The final tree 14fb5f8c (lines 1-19): build green; questline run alone,
  187 of 187 (545 s). RV ran the full suite on its
  stack's top (549 green); V3 on main + #2100 + its PR 2 (537 green).
