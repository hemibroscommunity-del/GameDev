card: Z
branch: claude/plan-z-sitting-28
prs: (this PR), tag 5666, the last line of sitting 28's list (ready)
state: ready

## Done
- Sitting 27 merged (`main` 7b629a91: J2 #1984, #1986, #1987; R #1980;
  K #1989; T #1978; O #1985, #1991; P #1988; Z #1990). Sitting 28 (this
  list), reviewed and rehearsed on 7b629a91: `census/review-z28.md`.
  Plan noted for sitting 27's merges: 2.3 (#1985, #1991), 4.3 (#1980),
  7.1 (#1978), 8.1 (J2's three), 11.3 (#1989).

## The list: merge in this order, each "Create a merge commit"
1 K #1981 (5546; sitting 27's hold, mended) · 2 T #1992 (5312) ·
3 T #1993 (5313, stacked on #1992) · 4 this PR. All based on `main`, one
merge base at every step. One worker deploy, after 1 (K's server side).
New live: the cap `reqid` (`reqonce: false` takes it away) and the page's
one re-send of the store's list, buy, bid and accept; a first try that
threw is answered `interrupted`, never run again. No new address flag,
no stored shape.

## Held
- None.

## Stalled
- None. Not yet in: K 5196, 5197 (and `_reqSeen` slots); L's window door;
  J2's shopkeeper; R 5293 (after K's 5196/5197): sitting 29.
  Z's next tag: 5667.

## Found
- precheck's `server-tests` 5-minute limit: the suite took 282 s alone,
  over 300 s inside precheck (again). No card.
- `DevPanel.jsx:1638` shows a report's last 3 lines, never `said`. No card.
- `bt-palette-hairclip` and the stencil have no self-test (1.7). No card.
- K's unopened `claude/plan-k-10-reqrest` also carries v2.3.5546
  (precheck's version-tag warning): K's, before it opens a PR.
