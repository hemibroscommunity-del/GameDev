# The gatekeeper's review, sitting 46 (card Z; tag 6260)

Taken 2026-11-18 on `main` b5669a5b (sitting 45's list fully merged,
#2167 included). The PRs and heads came from the planning session at 07:17
UTC; the planning session handed over to its part 6
(session_01LccHam7XmUNAHQrA1CjiNH) at 07:18, which relayed the clashes
below to the cards. Tags bare.

Z's older blocks (5032-5034, 5360-5379, 5660-5679) are used up by bare
tags in the plan's text (5373, 5375, 5660 ...): this PR takes Z's fourth,
6260 to 6279, from `nextBlock` (the planning session's yes), and registers
the eight new cards: CAP 6100, LG 6120, WD 6140, TL 6160, RD 6180, EN
6200, FX 6220, HB 6240 (twenty each). `nextBlock` 6280. RD has no PR yet;
its card comes with its first PR.

Reviews in full (`server/` or `src/`): one reader a PR group, the angles of
`/repo-review`, each finding put to its own disproof against the code and
the suites: K4 #2168, #2176, #2177, #2182, #2187; K2 #2169, #2173; EN
#2189 and FX #2190 (a verbatim proof). Read here: RV #2164's two new
commits (61dc9e1a, 2141b125), #2193, #2192; CS #2139's merge of `main`
(cebec572); TL #2181, #2183; LG's `league.test`. Documents and tools (step
3): CAP #2172, #2174; LG #2170 to #2184's tools; WD #2171 to #2180; HB
#2188; TL #2175; P2 #2185; M2 #2186.

## Findings

### K4 #2168 (5906), #2176 (5907), #2177 (5908), #2182 (5909), #2187 (5910): none blocking

- #2168 (`harvestgrade`, `bowpath` ON): sitting 45's medium is mended on
  the default (bundled) path: `projectiles.js:1981` sends `releaseRelay(a)`
  right before `act('monster_damage')`, and the claim's way flushes the
  33 ms batch first, so relay then claim go in one frame; an arrow removed
  or landed before release relays at the filter's end (:2801). The only
  other bow claims are the paid specials inside the volley window. Each
  flag's `false` is the old path; test-mode §8 green. Lows: with
  `bundle: false` (a kill switch only) every nocked hit's claim beats its
  relay by up to 33 ms (the same family as 45's low, no worse); a stale
  tab from before 5905 or 5906 on the new worker until it reloads; a
  nocked arrow's pierce judged against the nock angle; 45's predicted
  level-up from a perfect paid as good, now live (K4's Found). Nits:
  "an opt-in" in testmode.js:29, gathering.js:1421, :1649,
  projectiles.js:1048.
- #2176: the window counts fewer strikes than the life did: no new flag on
  anyone. Memory only, held to MAP_CAP, a `Map`. Nit: the hidden range of
  STARTLESS_FLAG_AT goes to 100000.
- #2177: `aimed` judges fewer runs; `reflex`'s floor never above the round
  trip: fewer quick. Sound.
- #2182: the cook's own plan off its gap (`_sigOnCook` before the handler;
  `_cookHits` cleared each cook). Low (not proven): COOK_SPREAD_MAX was
  tuned on raw gaps; a very steady human could now fall under it
  (evidence only; `botsig_reverify` off).
- #2187 (`botscoresave` ON): **adds writes, none a move.** A non-forced
  `_botfpMaybePut` also puts `botstat:<id>` when the score rose since its
  last write (decayed), past the 5-minute pace. A person's score never
  rises: no write more (botfp-deploy §3: 12 strikes, 1 put). A script's
  record: at most ceil(FLAG_AT/SCORE_SYNTH), about 5, before its forced
  flag write, then about 7 an hour while it decays under the line. No new
  key, the stored shape unchanged (`putScore` in memory only), a rolled
  back worker reads it. The planning session's ruling (07:28): listed ON,
  the cost recorded in GRAND-PLAN part 9 with `botscoresave: false`. Low:
  cost-guard §6's strikes never raise a score, so only botfp-deploy §3
  holds the new write.
- Suites on #2187's head: botfp-deploy, botfp-startless, botfp,
  botfp-evict, botsig, bow-path, bow-reach, harvestgrade, cost-guard
  (63/63), test-mode, liveops, caps-audit, the switches guard: green.

### K2 #2169 (5731, `duelquiet`) and #2173 (5733, `lookjoin`): none blocking

- #2169: nothing a player sees changes: every page handler of the four
  quiet types acts only when `payload.target` is the player; the arena's
  `arena_match_start` and `duel_end` stay room-wide. The audience is
  `[target, ev.from]` (the room's stamp), so the accepter still gets its
  echo; v1 and v2 both through `eventsFor`. Low: the spec says a worker's
  decline reaches its target alone, but every real decline stamps `from`
  (duel.js 232-233, 250; valuepause.js 189): the other side gets it and
  drops it. Nits: "duels go to everyone" still in eventplace.js ~28 and
  events-by-place.md:76; the wire table's `placed` column not set on the
  duel rows.
- #2173: an honest colour (hex) and avatar (`wsrvUrl`) pass; a bad one is
  dropped quietly, the join goes on; a stored record is not rewritten.
  Not a test-mode check (it protects others). Lows: the join checks an
  avatar before the 512 cut, `track` (RV's 45dde62a) after it (an avatar
  link over ~460 encoded characters blank at join, cut on the first
  track); `encodeURIComponent` leaves `'()` raw, which RV's form refuses
  (a catalogue image link holding one would drop: the CSV was not
  readable offline). Nits: '' kept at join, deleted by `track`; the test
  header names 93cfca9f as its base.
- Restacked at 07:36 (main into #2169, #2169 into #2173; RV's `lookform`
  and K2's `lookjoin` rows both kept): #2173 had conflicted with `main`
  itself, which is why no `test` had run on its old head.

### RV #2164 (6022), #2165 (6023), #2193 (6025), #2192 (6024): none blocking

- #2164's two new commits: dying-keep's trade runs with `deadtake: false`
  and 1b checks the default; traps-economy-social §269 lists
  `_deadTakeOn` (4 -> 5); the offer's dying refusal now inside its
  request-once run (45's nit): a resend gets its first answer, and a
  refusal (`ok: false`) is never stamped (reqonce.js:177).
- #2193 (`mktback`): reachable only with `mktsettle: false` (the default
  heals the note first, both on the match path and in `_mktRefund`). The
  first taker's escrow goes home by `settle:<id>:back`, the heal's own
  opId: a roll forward pays nothing twice. Never over a stamped leg: the
  old rebuild deletes, never re-lists, a record with `settle:<id>:item`
  or `:gold` stamped, and `_mktRefund` returns before it on a stamp.
- #2192: the daily spin's stamp through `pacekeep` (`paceAt`,
  `paceStamp`), the ninth field; traps-saves §276 18 -> 17.
- **Restack needed (07:46):** #2192 (bac21194) merged `main` b5669a5b and
  #2193 apart; #2193 (586f65bf) does not hold b5669a5b, so #2192 counts
  two bases once #2193 lands. RV merges `main` into #2193, then #2193
  into #2192.

### CS #2139 (6000), #2152 (6001): none blocking (sitting 45's review stands)

- cebec572 merges `main` (K2 #2136, RV to #2115): the switch table keeps
  RV's `friendfix` row beside the six; `reqincap`'s thrownFails from RV.
- Clashes with RV's rows in docs/SWITCHES.md (`fullsnap` beside
  `listcap`; `pacekeep`): CS merges `main` once RV's line 20 lands.

### EN #2189 (6200) and FX #2190 (6220): none blocking

- Verbatim proven by syntax tree (babel): EN 89 of 89 statements, FX 52
  of 52; every removed line found in a leaf; no name left declared in a
  renderer; no `let`/`var` moved; leaf order as the base (no TDZ); no
  leaf reaches a renderer (esbuild's metafile); every free name a true
  global; no `this`; the import-time switch reads (`_lookInlineAddr`,
  `DMG_WORDS_ON`, `LOOT_POP`, `POPUP_WORLD`) moved with their constants,
  through the page's reader. eslint (no-undef) clean; esbuild bundles
  both renderers. FX's src/state/wire.js: the ledger's groundLoot
  writers name the leaf file. switch-reader's MOVED rows re-pointed
  (paths only). Nits: EN left 28 section-header comments above moved
  declarations in entityRenderer.js (one now sits over the wrong
  constant, CHAT_BUBBLE_MS's over PEER_HPBAR_HOLD_MS); EN's status says
  93 of 93, the count is 89.
- They clash in docs/plan/census/M-tables.md (both regenerate it): EN
  first; FX merges `main` once EN lands and re-runs
  `render-tables.test --write` and `render-code-census.mjs --write`
  (rehearsed: render-tables green).

### TL #2175 (6160), #2181 (6161), #2183 (6162): none blocking

- #2175: the server-tests cap 5 -> 20 minutes; a timeout says so (still a
  FAIL). #2181: `_listNext` held while one call is counted, released
  after. #2183: Date.now from one minute into the current hour for the
  house-budget block, restored at its end. Restacked at 07:43.

### LG #2170 (6120), #2178 (6121), #2184 (6122); CAP; WD; HB (step 3)

- LG: docs and `tools/league/`, one `scripts` line in package.json (the
  card's); `league.test` reads the detectors, changes none.
- CAP #2174 was red on `main` + itself (bowPath, harvestGrade merged at
  sitting 45 after its base): re-run at abc6057f / a5638638, 162 = 162 on
  `main` and on the whole tree.
- WD: the guard's lines are a snapshot; on the whole tree the counts read
  4995 on the page (CS #2152's UsageMeter.jsx: +42) and 385 on the worker
  (RV #2164: +1). WD re-lands (`--write`, PAGE_LINE 4995, SERVER_LINE 385)
  once CS #2152 is on `main` (rehearsed: green).
- HB #2188: census only.
- RD #2191 (6180, card RD's first PR; its card comes with it):
  tools/qa/mp/mp-itemdrop.mjs only. Check 5b aged the pile past its end
  after a futile 20 s wait for a private pile; now aged to 3 s before its
  flash, read on the frames that flash (TRAPS §177, §200). Draft, its
  `test` running at the cut: listed once green.

## The rehearsal (main b5669a5b)

Each line merged into `main` with every line above it (a merge commit, as
GitHub's); the merge bases counted at each step (`git merge-base --all`);
the tree after that merge. Lines 1-21 are exact at these heads. From line
22 the lines wait on the agreed mends (CS's and FX's merge of `main`,
WD's re-land), so their real heads make their own trees; the whole was
rehearsed with those mends simulated.

| line | PR | head | tree after | bases |
|---|---|---|---|---|
| 1 | #2185 | `4885fd75f31b28cfe11a2559d2b69c3a4f06c049` | `add990d5652647cf663460ebcbcffb601cb057d5` | 1 |
| 2 | #2186 | `eaf4a73b1b196c2ba51085cd5d9e7bc047e0eeb7` | `b395b150f0ef5742d6e5b46d06c958b9d934ce9d` | 1 |
| 3 | #2188 | `bfec2f415b0c7b85d1666c5b0810cc59840237e7` | `7140cd14772feb1f2475f303bff0d70768ed0485` | 1 |
| 4 | #2175 | `5f62357f1dcb68713f7cf050b484aa9d8601bd4f` | `2bb32af34a3128d4b64464d5035e2cbf0add4f92` | 1 |
| 5 | #2170 | `091df85a0b9561233ca9b8c25185aab0a6c564d2` | `73a0ed72c06dbe5de28a4ca28f52907359e7e8ff` | 1 |
| 6 | #2191 | `ee33b3b101b4e389461b250c9461f56efe3e233f` | `d80ba2ab605f818fcd384685ef5f2ef96a53eb18` | 1 |
| 7 | #2181 | `6c9d70feb517bcab024c8a3f90e78524a2c0cb21` | `4255bd5ef6a0f5104aea1548c27e6d9f5cb62b92` | 1 |
| 8 | #2183 | `0de541d7ffa557e277b650007eede75a517d5be7` | `386300dcae32e3ebe74363afeabd56b248c794ac` | 1 |
| 9 | #2178 | `3d11c871be1fbe5365e45222bb7c17ca51626274` | `9c9449330615b2729d8935479345d341a33a9e1f` | 1 |
| 10 | #2184 | `de21aa2db963fde942fa539de0410426ab2dfa21` | `43ba39680215777f82d42da52d4932220a6bab77` | 1 |
| 11 | #2168 | `250582f3821b0e83539f6b8c662e980a6ecb26dd` | `d738cfe3f6fb64ebb7c24863032a641dd607c2bf` | 1 |
| 12 | #2176 | `4635d77c134f754b3b63998bdd2c84012caa15f2` | `e8cd1c3bcf83eb94d3433debfdf9e34c7d18fd53` | 1 |
| 13 | #2177 | `fb5846e53f61543aaef8eef7a8c6a28885c854d3` | `54e736d9823a881609103fa91552ab7c3129044c` | 1 |
| 14 | #2182 | `b37bd4f1c5a839922bd30a0c7aa2c0df4d11aeb7` | `09a055f171b1cf176a54c83bf785a66b63aeb8fb` | 1 |
| 15 | #2187 | `b5777a45e2ff90449f6c9509d5c91fab0b066eb3` | `b893573b1af27907638543fe1105e1b2891b1ae6` | 1 |
| 16 | #2169 | `137b688021905dfab04ed430b7feb71d9180c7fc` | `09a3d99fd8d081fd7a811d23f2944aa6c4f8281a` | 1 |
| 17 | #2173 | `a88aed3edc1e65c274acf366f3609ccf212c1270` | `8819920e310e67d5f37ce1df88c762248be7b01e` | 1 |
| 18 | #2164 | `55e018801db817b6cd8e961469db2ef590212658` | `73970c7c6bf9c707b3594a004303b8668597c0d0` | 1 |
| 19 | #2165 | `1058bc9cfdf88cbcdd9d972e2ae8c6f09af6373e` | `e9669af387d7764bcfaa98c19a56199f07030d24` | 1 |
| 20 | #2193 | `e9104d6371e257151a73004fb9481cc5e687949c` | `e41c1aa213f45865660b22599fc1e383465e6f45` | 1 |
| 21 | #2192 | `d0efb0fe0a0f4b28aa509a35b1f161d9ada3cc38` | `1a48e5f6320c18570f4dcbc9af57441eea180470` | 1 |
| 22 | #2139 | `cebec572` + `main` (CS merges `main` once 21 lands) | its own | 1 (rehearsed) |
| 23 | #2152 | `b4192d4b` + the new #2139 | its own | 1 (rehearsed) |
| 24 | #2189 | `6f81ab2cc02b2c26f2955156466ecc6a6cad0d97` | its own (after 22-23) | 1 |
| 25 | #2195 | `e79bd0d22470ad56887a963e90a2178b4c8c7aed` (base retargeted to `main`) | its own | 1 |
| 26 | #2190 | `2f981b97` + `main` (FX merges `main` once 25 lands; re-generates M-tables.md) | its own | 1 (rehearsed) |
| 27 | #2172 | `abc6057fb94eccefb1a1a21851b122210eb0c246` | its own | 1 |
| 28 | #2174 | `a56386387375d25f55797ac61645e7e25ddd891f` | its own | 1 |
| 29 | #2171 | `dfab1d0e142b93c6b9d86499815d104e11ac219a` | its own | 1 |
| 30 | #2179 | `3aa7adb1` re-landed (WD, PAGE_LINE 4995, SERVER_LINE 385, once 23 lands) | its own | 1 (rehearsed) |
| 31 | #2180 | `bb0cde62` + the new #2179 | its own | 1 (rehearsed) |
| 32 | Z | this PR | its own | 1 |

## The checks on the whole

The tree of lines 1-31 (without RD #2191 and EN #2195, which came later;
#2192 at its earlier head bac21194; the mends of lines 22-26 and 30
simulated; this PR on top): tree `a5adb48cdd16f11fa13d3c3d83a0dc8e22bdb499`.

- precheck: every check green but `server-tests`, which ran past even
  #2175's 20-minute cap on this loaded box (four reviewers running), no
  suite seen failing; so the suite was run alone:
- `cd server && npm test`: 579 suites, 577 green (1,323 s). The two reds
  are one: refusal-door ("_handleDailySpin" listed at its old line), on
  #2192's earlier head; mended at 14099659 (now d0efb0fe), refusal-door
  green on the exact tree of lines 1-21 at those heads.
- caps-census guard 162 = 162; player-words green at 4995 / 385 (WD's
  re-land); render-tables green after the regeneration; frame-steps 1531,
  switch-reader 17, render-tables 0 green.
- `npm run build`: green.
- `node tools/qa/mp/run.mjs questline`: 187 of 187 (442 s).
- The cards' own runs: RV's full suite green on its top tree; K2's 551
  green on each head; CS 555; K4's suites on #2187; TL's on its heads.
