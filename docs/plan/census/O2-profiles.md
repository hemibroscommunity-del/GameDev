# O2: the two slow profiles, one sampled run each (v2.3.5861, card O2 PR 2)

Run 2026-11-17/18 on the 4-vCPU box, one browser job at a time, from
`claude/plan-o2-profile-runs` (main fcd1ae9 plus #2098 and this PR).
Profiles (`tools/qa/profiles.mjs`): **budget-android** (the processor 4x slowed,
the world's art `/world/` down a 250 KB/s line with 150 ms to the first
byte, the `light` lane); **hotel-laptop** (2x, `/world/` at 120 KB/s with 300 ms,
`light`). No budget line was raised: what is over is listed here.

## The sample, and the full run (CLAUDE.md §6)

| scenario | how sampled | hotel-laptop | budget-android |
|---|---|---|---|
| desksmooth | its `profile` part only (1920 x 1080, the profile's throttle and line) | 108 s, 2 of 5 checks over | 101 s, 1 of 5 checks over |
| phoneframe | the four default scenes at `BT_PF_DPR=1` (not 3) | 158 s, all pass | 178 s, all pass |
| heldsweep | `BT_HS_STATIONS=stand,town,lands,fight` (4 of 8 stations), `QA_DIST=dist-prof` | 267 s, budget: 4 new over | 297 s, budget: 24 new over; 1 note missing |

The six took about 19 minutes. **The full run**: every heldsweep station, phoneframe
at dpr 3, and desksmooth's four standing parts plus the profile part, under both
profiles: about **50-60 minutes** on this box (heldsweep about twice its sample,
phoneframe at dpr 3 two to three times).

A first try put the whole site on the line (`/:120:300`). The page did not open
within the harness's 30 s, because this box serves the 5.6 MB of script uncompressed.
So the line carries `/world/` (#2098's second commit).

## desksmooth (work a frame, ms on this box, middle frame / 19 in 20)

| profile | gate held | at the lift | standing | walking | over |
|---|---|---|---|---|---|
| hotel-laptop | 42.2 s | 0 of 50 pieces missing, **30 short of a picture** | 9.3 / 13.8 (line 18 / 54) | 11 / 24.8 (line 24 / 72) | the lift (30 short); the walk: 1 object late |
| budget-android | 17.7 s | 0 of 50 missing, **38 short** | 16.4 / 21.6 (line 36 / 108) | 20 / 28.5 (line 48 / 144) | the lift (38 short) |

## phoneframe (dpr 1; frames a second, and the game's stages in ms a frame)

| profile | scene | fps | tile | entity | effects | app |
|---|---|---|---|---|---|---|
| hotel-laptop | BroTown, standing | 3.4 | 1.22 | 3.58 | 1.09 | 3.78 |
| hotel-laptop | BroTown, walking | 3.4 | 0.66 | 3.57 | 1.30 | 4.44 |
| hotel-laptop | Flame Fields, fighting | 8.7 | 0.74 | 2.66 | 1.87 | 4.60 |
| hotel-laptop | Flame Fields, walking | 8.7 | 0.51 | 2.23 | 2.30 | 5.01 |
| budget-android | BroTown, standing | 3.0 | 1.25 | 7.66 | 2.63 | 8.23 |
| budget-android | BroTown, walking | 3.1 | 1.40 | 7.02 | 2.75 | 9.69 |
| budget-android | Flame Fields, fighting | 6.6 | 1.00 | 4.82 | 4.61 | 9.59 |
| budget-android | Flame Fields, walking | 6.9 | 0.99 | 4.35 | 4.12 | 11.22 |

(This box draws in software, so fps is the box's own. The stages are the game's code.)

## heldsweep: over the 12 ms line (held-budget.mjs; not on the debt list)

hotel-laptop: 4 jobs over the line:

| family | longest ms | where | times |
|---|---|---|---|
| other: wrapped > _poll | 20.6 | town | 1 |
| other: load > stripAsNumbers | 20.2 | town | 1 |
| server-message | 17.9 | lands | 4 |
| other: wrapped | 14.7 | lands | 5 |

budget-android: 24 jobs over the line. The worst:

| family | longest ms | where | times |
|---|---|---|---|
| pack-page (load > stripAsNumbers > numbersOf) | 35.8 | town | 5 |
| other: playerScreenPoint | 30.2 | town | 1 |
| other: wrapped | 24.1 | lands | 16 |
| other: wrapped > pack (deflate) | 24.1 | town | 4 |
| other: _sprite > _toGpu | 24.1 | lands | 2 |
| other: job > _foldSliced | 24.0 | town | 1 |
| other: wrapped > tick$1 | 23.9 | fight | 1 |
| other: rE2 > tapResourceAtClient | 23.3 | fight | 5 |
| other: wrapped > rememberChar | 21.8 | town | 2 |
| server-message | 21.8 | fight | 44 |
| other: wrapped > _poll | 21.6 | town | 1 |
| other: wrapped > clearOfThumbs | 21.1 | lands | 1 |
| the BottomDashboard redrawn | 20.2 | lands | 4 |

The rest (12 to 20 ms): resolve, _sprite, rE2 > onClick, (anonymous) x15,
sweepPicsOnceTurn, _pack > _cellBytes, job > ask$2, the GearTab redrawn x9,
_runLine > _pack, _sprite > _source, NavRail.
budget-android also had a known hold that left no note: `screen-check` 18.8 ms at
lands (holdNames.js MADE_AS).

On both profiles, nothing on the debt list grew past its own line.

## The full run (v2.3.5862, card O2 PR 3; the owner said yes, 2026-11-18)

Run 2026-11-18 00:31-01:29 UTC on fresh builds from main 3750ba4, one browser
job at a time. It took 58 minutes, builds included:

| scenario | how | hotel-laptop | budget-android |
|---|---|---|---|
| desksmooth | `BT_DS_PARTS=quiet,throttle,both,slowline,profile` | 626 s | 663 s |
| phoneframe | the four scenes at dpr 3 | 385 s | 442 s |
| heldsweep | all 8 stations | 637 s | 732 s |

**Read desksmooth with care.** Under a profile, every part carries the
profile's throttle and its `/world/` line. A part's own line replaces the
profile's while the part runs. So:
- the "quiet" parts are the profile at three window sizes, judged against the
  unslowed work lines (on budget-android they fail those lines at x4: a fault
  of the run, not of the game);
- the part labelled "x4" ran at the profile's own rate (it slows only when the
  harness does not).

### desksmooth: what is over

| | hotel-laptop | budget-android |
|---|---|---|
| the loading screen lifts with ground short of its picture (`/world/` line) | 30 of 50 short, every window, the gate held 40-42 s | 38 of 50 short, the gate held 17-18 s |
| the same, with ground alone on the line (the `slowline` part, `/world/ground/:150:200`) | lifts whole (0 short, gate 22.5 s) | lifts whole |
| a walk across town | 1 object late (every window) | none late |
| work a frame, judged at the page's own slowing (profile and x4 parts) | within the lines (8.3-11 ms) | within the lines (17.8-22.3 ms) |

The ground waits for its pictures well when it has the line to itself.
When the world's other art shares the line, the gate lets go with most of
the town in plain colour.

### phoneframe at dpr 3 (fps is this box's software drawing)

| profile | scene | fps | tile | entity | effects | app |
|---|---|---|---|---|---|---|
| hotel-laptop | BroTown, standing | 1.6 | 1.27 | 2.29 | 1.33 | 3.77 |
| hotel-laptop | BroTown, walking | 1.8 | 0.77 | 2.94 | 1.22 | 5.32 |
| hotel-laptop | Flame Fields, fighting | 2.4 | 0.68 | 1.52 | 1.44 | 4.38 |
| hotel-laptop | Flame Fields, walking | 2.2 | 0.66 | 1.99 | 1.41 | 4.83 |
| budget-android | BroTown, standing | 1.4 | 1.31 | 5.11 | 3.20 | 7.21 |
| budget-android | BroTown, walking | 1.4 | 1.65 | 7.49 | 2.72 | 11.01 |
| budget-android | Flame Fields, fighting | 2.3 | 1.27 | 3.36 | 2.65 | 8.83 |
| budget-android | Flame Fields, walking | 2.0 | 0.83 | 4.20 | 2.72 | 9.54 |

On both profiles at dpr 3 the guard "reached the Flame Fields' first
monsters" failed: the walk to them timed out at 1.4-2.4 fps. 21 monsters
were measured all the same.

### heldsweep, all 8 stations: over the line

The lines are `held-budget.mjs`: 12 ms a job outside the frame, 16 ms of the
game's own code inside one, 45 ms at a window.

**hotel-laptop**: 14 over. Two of them are on the debt list and grew past
their own lines:
- `screen-check` 303.7 ms > 260 (peer, 3 times);
- the frame itself 88.6 ms > 70 (armour, 2 times).

The 12 new ones:

| family | longest ms | where | times |
|---|---|---|---|
| server-message | 29.4 | armour | 4 |
| other: (anonymous) | 27.7 | armour | 4 |
| other: wrapped > rememberChar | 26.0 | armour | 2 |
| portrait | 24.2 | armour | 1 |
| other: wrapped > flushInputBuffer | 23.2 | armour | 1 |
| masked-bake | 21.3 | peer | 1 |
| other: playerScreenPoint | 20.9 | town | 1 |
| other: wrapped > pack | 19.8 | town | 2 |
| other: step2 > measure | 17.0 | peer | 2 |
| other: wrapped > tick$1 | 16.4 | armour | 2 |
| other: wrapped > tick2 | 14.5 | lands | 2 |
| other: wrapped | 14.2 | armour | 3 |

**budget-android**: 39 over. Two are on the debt list and grew past their own
lines:
- the frame itself 153.3 ms > 70 (armour, 13 times);
- `R > J` 36.7 ms > 16 (town, 16 times).

The 37 new ones, the worst first:

| family | longest ms | where | times |
|---|---|---|---|
| other: jg > Ek | 113.5 | windows | 2 |
| other: loop2 > draw$1 | 108.1 | windows | 2 |
| other: measure2 | 72.9 | windows | 1 |
| other: onPointerUp > set | 64.1 | folk | 5 |
| other: wrapped > _poll | 52.0 | armour | 2 |
| portrait | 40.1 | armour | 3 |
| other: QuestCoach | 37.4 | peer | 1 |
| other: coachFollow > worldRect | 35.7 | armour | 1 |
| other: jumpAnchor > weaponPillTopPx | 35.2 | armour | 7 |
| other: dispatchEvent | 34.6 | fight | 3 |
| server-message | 33.0 | lands | 37 |
| pack-page | 28.3 | town | 4 |
| other: wrapped > sweepPicsOnceTurn | 27.6 | armour | 6 |
| other: wrapped > tick$1 | 26.8 | armour | 8 |
| other: wrapped | 25.4 | lands | 22 |
| other: BroTown2 | 25.3 | armour | 3 |
| other: (anonymous) | 24.6 | fight | 13 |
| other: _runLookBake > reply | 24.5 | peer | 1 |
| other: wrapped > tick2 | 24.3 | lands | 4 |
| gear-sheet | 22.8 | peer | 1 |

The rest (13.8-22.5 ms): rS2, step2 > measure, step2, rE2, the GearTab
redrawn x13, strip-made, window.__btTex, _pack > _deflateAll, wrapped > pack,
rE2 > onClick, _sprite > _source x14, _resumeRecover, loadLook, the
BottomDashboard redrawn x7, the GearCellView redrawn, tapResourceAtClient,
tick2.

On both profiles every known hold left a note (no gaps in the full run; the
sample's `screen-check` gap did not come back).
