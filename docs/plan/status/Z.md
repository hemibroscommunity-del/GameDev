card: Z
branch: claude/plan-z-sitting-26
prs: (this PR), tag 5664, the last line of sitting 26's list (ready)
state: ready

## Done
- Sitting 25 merged (`main` 3ac8691f, 7 PRs). Sitting 26 (this list),
  reviewed and rehearsed on 3ac8691f: `census/review-z26.md`. Plan noted
  for sitting 25's merges: 4.3 (R's #1873), 10.5 (R's #1969), 11.3
  (K's #1972, begun). MOD's #1971 has no plan step.

## The list: merge in this order, each "Create a merge commit"
1 O #1970 (5232) · 2 O #1974 (5233, stacked on #1970) · 3 O #1977 (5680,
stacked on #1974) · 4 this PR. All based on `main`, one merge base at
every step. No `server/src` change: no worker deploy (Pages only). No new
live flag.

## Held
- T #1978 (5311): READY with lows, but conflicts with #1970 on
  `switch-reader.test.mjs`'s `OUTSIDE_LINE`; T merges `main` after #1970
  lands, for sitting 27.

## Stalled
- None. For sitting 27: T #1978; R #1980 (5296, arrived late).
  Z's next tag: 5665.

## Found
- precheck's `server-tests` 5-minute limit vs the suite (277 s alone; a
  timeout when the box is shared). No card.
- `DevPanel.jsx:1638` shows a report's last 3 lines and never `said`
  (OPS's file; OPS is done: no card holds it now).
- `bt-palette-hairclip` and the stencil have no self-test (1.7). No card.
- O's #1974 lows (a peer's arrow copy unclamped, visualSystems.js:306;
  frame-clock §9g reads source only): O's PR 11, as O says.
