# Red on `main`, round 4: the census (card RR, step 8.1; tag 6300)

Taken 2026-11-18 in one cloud session (4 vCPUs, the pre-installed Chromium,
`npm run build` fresh) on `main` at 736f954c. **A SAMPLE, not every phone
test**: this session could not start helper sessions (it is at the session
tree's depth limit), and the full sweep (388 scenarios, about 20 hours on one
box, CLAUDE.md §6) stays the owner's choice for later (the planning session,
2026-11-18). Judged by TRAPS §177: a red on `main` is a question about the
TEST first.

## How it was run

- 48 scenarios in 8 batches of 6 (`node tools/qa/mp/run.mjs a b c d e f`, one
  worker and one browser a batch, the box reaped after each batch), then every
  scenario red in its batch run again ALONE. A red that passes alone is a
  flake of a loaded run (one browser, six scenarios one after another, each
  leaving the box warmer), listed but not a red.
- `mp-jumpbtn` and `mp-mayordoor` (the card's known reds) ran first, as a pair.
- The planning session's reds from cards HB and HB2 (`mp-geartab`,
  `mp-brocard`, `mp-firststeps`) ran alone; the three node scripts
  (`mp-hitsound`, `mp-coldload`, `mp-cuelevels`) with `node`.
- The sample: the two every PR runs (`questline`, `membudget`); every
  scenario changed on `main` since J3's census (afterpaint, bowprops,
  comeback, desklunge, framesteps, itemdrop, manualcombat, ownersounds, race,
  tierore; crowdfight left out: RD's five green runs of it merged at sitting
  48); J3's and L's past reds (deathzones, fishvariants, moresounds,
  deskharvest, alliance, blockface, farmmusic, soundcues, linger); the
  reconnects (tabsleep, recoverpay, shoprejoin, partykeep, clientoff,
  quietphone); and a spread (onboarding, firstrun, wheelmap, spar, arena,
  bank, hotel, npchit, testmode, tradebag, landmusic, wheelhome, nomansland,
  deskkeys, oneband, folkwalk, folkpass, npclooks, lookfolk, headframes,
  desksmooth).

## The verdicts

1272 checks in the batches, 1236 passed. Green in the batch: 38 of 48.

| Scenario | In its batch | Alone | Verdict | Owner (PR) |
|---|---|---|---|---|
| `jumpbtn` | 29/29 | (first) | GREEN: RD's #2205 mended "sideways 844: 2b" | none |
| `mayordoor` | 7/12: 2, 3 (5) | (first) | the TEST's: the phone idles out | RR 6301 |
| `recoverpay` | 28/29: the lane | 28/29 | the TEST's: its reload drops `lane=` | RR |
| `deskkeys` | 53/60 (7) | 53/60 | suspected the TEST's (below) | RR, to trace |
| `headframes` | 25/28 (3) | 25/28 | to trace (test or game) | RR, to trace |
| `quietphone` | 7/8 (1) | 7/8 | to trace (test or game) | RR, to trace |
| `desklunge` | 12/13: 3 | 10/13: 2, 2b | flaky: a different step each run | RR, to trace |
| `deathzones` | 90/101 (11) | 101/101 | a flake of the loaded run | none |
| `arena` | 23/28 | 28/28 | a flake of the loaded run | none |
| `alliance` | 15/16: the board | 16/16 | a flake of the loaded run (an 8 s wait) | none |
| `testmode` | 21/25: 4 | 25/25 | a flake of the loaded run | none |
| `folkpass` | 18/20: 2 | 20/20 | a flake of the loaded run | none |
| GEARTAB | | | | |
| BROCARD | | | | |
| FIRSTSTEPS | | | | |
| NODES | | | | |

Green in their batch: questline, membudget, afterpaint, bowprops, comeback,
framesteps, itemdrop, manualcombat, ownersounds, race, tierore, fishvariants,
moresounds, deskharvest, blockface, farmmusic, soundcues, linger, tabsleep,
shoprejoin, partykeep, clientoff, onboarding, firstrun, wheelmap, spar, bank,
hotel, npchit, tradebag, landmusic, wheelhome, nomansland, oneband, folkwalk,
npclooks, lookfolk, desksmooth.

## The causes

### `mayordoor` parts 2 and 3: the phone is logged out for idling (the TEST)

The phone (C) joins at the start and then waits while the computer (A) plays
part 1 (about 3 minutes here). The page logs itself out after two minutes
with no real input (wsClient's idle logout; `H.keepAlive` is the harness's
answer, used by 138 scenarios, not this one). Its picture at part 2
(`out/mayordoor-2-forest-phone.png`) shows "You were away, so your character
logged out. I'm back": from there its `quest_accept` and its hops never
reached the worker, so it was drawn in the Earth Forest by its own hops with
the board's button up (it never left the safe ground for the worker), and in
part 3 the computer never heard it beside it (`_nmlLevel` 0, `seen` null).
Fix: `H.keepAlive` on both bros (and the third, D).

### `recoverpay`: "every page of the game it loaded named its lane" (the TEST)

Step B copies BroTown's recovery reload (`location.replace(pathname +
?guest=1)`), which drops the `lane=` the harness put on the page, so
run.mjs's lane check fails on the reloaded address. Fix: build the reload's
address in node through `H.withLane`.

### `deskkeys`: the keys strip and its ⌨, 8 and 8e (suspected the TEST)

The first page is a computer with no `wide: true`, so the harness plays it
`narrow` (the old upright column), under the one band. The floating strip
(`.bt-kb-hints`) and its chip are not drawn under the one band on a computer
since v2.3.4263 (KeyboardHintsPanel's `bandKeysActive`: the band's own
short list stands there), so `keys: []`, `chip: null`. Not yet traced: why
a check written after that change expects the strip, the minimap's size (8),
and the double tap's roll (8e: 0 rolls). Its own PR.

### `headframes`, `quietphone`, `desklunge`: to trace

- `headframes`: "rolls and flips", "a peer jogging, rolling and turning",
  "a fight": 7 to 15 of 200 to 500 head pieces read back under a quarter of
  their usual pixels (hair, headwear, facial hair, the stand-in's headwear),
  in the batch and alone. A missing piece on screen would be a GAME bug (a
  ghost); a frame read mid-bake on this box would be the test's.
- `quietphone` 4: turning with nobody near, 20.5 frames a second alone
  (21.5 in the batch) against "at most 15" and 80% of the near rate (21.2):
  the far peer may not be parked within the test's 3 s on this box, or the
  quiet send no longer thins a lone turn.
- `desklunge`: in the batch step 3 (a click inside the lunge's cooldown
  dashed); alone step 2 (a click on another snowman neither dashed nor moved
  the lock) and 2b. A different step each run: J3's 5846 timed it by the
  wall clock once already.

### The card's two others

- `guards/switches-thrown` and elemental2's "restore clamps at maxMana"
  under `duelpace`: not phone scenarios; with the slow checks (PR 3). The
  default run (every worker switch born from 5301, three suites at a time,
  each `--import`ed alone) has grown with every new switch; `login-keys`
  12h waits on 5 ms ticks (`tick`) between a join and a pass's check, a
  race on a loaded box.
