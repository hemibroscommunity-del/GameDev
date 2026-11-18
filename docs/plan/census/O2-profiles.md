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
