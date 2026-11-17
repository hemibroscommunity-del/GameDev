card: Z
branch: claude/plan-z-sitting-27
prs: (this PR), tag 5665, the last line of sitting 27's list (ready)
state: ready

## Done
- Sitting 26 merged (`main` ee235aaa: O #1970, #1974, #1977). Sitting 27
  (this list), reviewed and rehearsed on ee235aaa: `census/review-z27.md`.
  Plan noted for sitting 26's merges: 1.7 (#1977), 2.4 (#1970, begun),
  2.5 (#1974, begun).

## The list: merge in this order, each "Create a merge commit"
1 J2 #1984 (5645) · 2 J2 #1986 (5646) · 3 J2 #1987 (5647) (a stack) ·
4 R #1980 (5296) · 5 K #1989 (5195; replaces #1983) · 6 T #1978 (5311)
· 7 O #1985 (5231) · 8 O #1991 (5681, stacked on #1985) · 9 P #1988
(5571) · 10 this PR. All based on `main`,
one merge base at every step. One worker deploy, after 5 (R's and K's
server changes together). New live behaviour: O's memory axis and
`caches` knob (governor on; `?govern=0` stops it); K's wire door keeps a
repeat's answer for 31 more value requests (memory only, `reqonce`).
No new address flag, no cap.

## Held
- K #1981 (5546): the page's re-send sold a second weapon after a
  restart. K's mend (2b1eda83, re-send only the store's rows) came late:
  sitting 28. #1983 closed: #1989 is the same change, free of #1981.

## Stalled
- None. For sitting 28: K #1981 after the mend.
  Z's next tag: 5666.

## Found
- precheck's `server-tests` 5-minute limit vs the suite under load
  (again, first try of this sitting). No card.
- `DevPanel.jsx:1638` shows a report's last 3 lines, never `said`. No card.
- `bt-palette-hairclip` and the stencil have no self-test (1.7). No card.
- worldsum.js:128 a store listing's gold counted twice before its delete
  (R's Found, beside the buy order's escrow gold).
