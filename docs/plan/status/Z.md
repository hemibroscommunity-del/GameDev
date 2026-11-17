card: Z
branch: claude/plan-z-sitting-25
prs: (this PR), tag 5663, the last line of sitting 25's list (ready)
state: ready

## Done
- Sitting 24 merged (`main` 4751cb7, 18 PRs). Sitting 25 (this list),
  reviewed and rehearsed on 4751cb7: `census/review-z25.md`. Plan noted
  for sitting 24's merges: 1.7 ticked (O's #1952); 4.3 (R's #1960); 5.3b
  (L's #1956; the phase line 14 -> 13); 7.1 (T's #1958); 8.1 (J2's
  #1953, #1964); 9.5 (P's #1955, #1959, #1963).

## The list: merge in this order, each "Create a merge commit"
1 R #1969 (5295) · 2 MOD #1971 (5630) · 3 K #1972 (5194; `reqonce` ON,
`reqstamp` OFF) · 4 OPS #1975 (status) · 5 P #1976 (status) · then WAIT
for the Deploy worker run of step 3 to finish green · 6 R #1873 (5282,
save shape 21 -> 22, its own line and deploy) · 7 this PR. All based on
`main`, one merge base at every step. Deploys: the worker after 1-3, and
again after 6. New live flags: `reqonce` (ON), `reqstamp` (lever, OFF).

## Held
- O #1970 (5232): the card's "done when" not met (`?sheen`, `?lightfx`,
  `?waves`, `?stripslice` still read `location.search`; drawLanes.js says
  `moved: true`).
- O #1974 (5233): `_dtScale` up to 6 on the thirty lane outruns
  projectiles' 200 px sweep cap (arrows pass through monsters);
  `?dtsmooth=0` no longer the old way.

## Stalled
- None. For sitting 26: O #1970, #1974, #1977 (5680); T #1978 (5311).
  Z's next tag: 5664.

## Found
- precheck's `server-tests` 5-minute limit vs the suite (292 s here). No
  card.
- `DevPanel.jsx:1638` shows a report's last 3 lines and never `said`
  (OPS's file; OPS is done: no card holds it now).
- `bt-palette-hairclip` and the stencil have no self-test (1.7). No card.
- worldsum.js's weapon double counts (store listing, `trade2wpn:`) and a
  matched buy's miss: R's, after #1873 (review-z25).
