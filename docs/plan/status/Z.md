card: Z
branch: claude/plan-z-sitting-23
prs: (this PR), tag 5661, the last line of sitting 23's list (ready)
state: ready

## Done
- Sitting 22 merged (`main` 8149d61). Sitting 23 (this list), reviewed and
  rehearsed on 8149d61: `census/review-z23.md`. Plan noted for sitting
  22's merges (1.7: O's 14d; 5.3b: L's ride door, the line 15 -> 14;
  7.1: T's #1935, #1939).

## The list: merge in this order, each "Create a merge commit"
1 MOD #1947 (5626) · 2 L #1946 (5524) · 3 J2 #1948 (5641) · 4 P #1943 (5565)
· 5 K #1942 (5544) · 6 K #1949 (5545, on #1942) · 7 MOD #1909 (5623)
· 8 MOD #1914 (5624, on #1909) · 9 OPS #1944 (5610) · 10 R #1961 (5292,
replaces #1950: never merge #1950) · 11 this PR. All based on `main`, one
merge base at every step. Deploys: the worker at 1, 5-10 (`server/**`).
New live flags, all ON: `mktwords`, `?allydrafts`, `?fishspot`,
`heapforget`, `roomceiling` (a cap), `reportring`, `invitepace`,
`guestlazy`. Rehearsed (tree a49f278): build PASS, questline 187/187,
server tests 464 green (precheck's limit timed out under load).

## Held (expires at sitting 24)
- R #1873 (save shape 21 -> 22): a rolled-back worker destroys weapons
  with `gid` outside `rpg:`. R's #1960 (the tolerant reader) deploys first.
- O #1952: a failed clip leaves the hair masks as colour numbers under
  the alpha mask (`p256.js` HAIRMASKS_ON/CAPE_HOOD_ON fixed at load).

## Stalled
- None. For sitting 24: RT-1 #1940 (07f549b5, merges main after this
  list), P #1955 > #1959, J2 #1953, T #1958, L #1956, R #1960 > #1873,
  MOD #1954 (`ownerdev:`, a new key) and #1962, O #1952 fixed, OPS #1951.
  Z's next tag: 5662.

## Found
- precheck's `server-tests` limit (5 min) vs the suite's 256 s: load times it out. No card.
- `switches-thrown` finds a system's suites by file name, so `ip56`/`ip64`
  cannot list account.test (`tools/guards/lib/systems.mjs`; T's).
- `on` dates of 11-15 on rows merging 11-17: `?fishspot`, `guestlazy`,
  `reportring`, `invitepace` (for T's date sweep).
