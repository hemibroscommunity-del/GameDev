card: Z
branch: claude/plan-z-sitting-19
prs: (this PR), tag 5376, the last line of the list (ready)
state: ready

## Done
- Sitting 19, `main` 29b1a0d: the red team's fixes. Review:
  `census/review-z19.md`. Notes on 4.2, 4.7, 5.3b, 7.1, 9.5;
  `TODO_LINE` 24 -> 22; entityRenderer.js 8953 -> 8941.

## The list: merge in this order, in one sitting, each "Create a merge commit"
1 #1889 (T) · 2 #1875 · 3 #1882 · 4 #1885 (RT-1, drafts: ready first) ·
5 #1899 · 6 #1923 (K) · 7 #1883 (MOD's card) · 8 this PR. Five deploy
(#1875, #1882, #1885, #1899, #1923): back to back. New live flags `ip64`,
`oldkeylock`, `adminlock`, `relaybytes` (ON). No stored record changes.

## Held (expires at sitting 20)
- #1878 (RT-3): three MEDIUMs (the player id's big rows; the paces refill
  at each wake; an uncounted admin-key check). #1890, #1897, #1907 carry
  it; #1897's `freezedevice` can lock the owner out (MEDIUM); #1907's
  join name is unchecked (HIGH). Mends asked 2026-11-15, not come.

## Stalled
- RT-3 and MOD: no commit since 2026-11-15 02:31 (the allowance).

## Found
- The four new switch rows say `on` 2026-11-15 and merge 2026-11-16:
  the next switch table PR (card T) sets each to its merge day.
- RT-1: an old key's derivation spelled out in devicelock.js ~160 and the
  device-lock spec: cut before the repo goes public.
- OPS (19b): reviewed here, findings sent; `/health/room` on PR 9's list.
- The owner: `.github/workflows/crash-report.yml` needs a key once #1878
  lands.
