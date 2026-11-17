card: Z
branch: claude/plan-z-sitting-24
prs: (this PR), tag 5662, the last line of sitting 24's list (ready)
state: ready

## Done
- Sitting 23 merged (`main` cfcd70b). Sitting 24 (this list), reviewed and
  rehearsed on cfcd70b: `census/review-z24.md`. Plan noted for sitting
  23's merges (4.1: K's #1942, #1949; 8.1: J2's #1948; 9.5: P's #1943;
  10.5: R's #1961).

## The list: merge in this order, each "Create a merge commit"
1 J2 #1953 (5642) · 2 J2 #1964 (5643, on #1953) · 3 T #1958 (5310)
· 4 P #1955 (5566) · 5 P #1959 (5567) · 6 P #1963 (5569) · 7 L #1956
(5525, on #1963) · 8 O #1952 (5239) · 9 RT-1 #1940 (5584) · 10 R #1960
(5294) · 11 MOD #1962 (5628) · 12 MOD #1967 (5629, on #1962) · 13 MOD
#1954 (5627) · 14 OPS #1951 (5607) · 15 OPS #1957 (5613) · 16 OPS #1966
(5612) · 17 OPS #1968 (5614) · 18 this PR. All based on `main`, one merge
base at every step. Deploys: the worker at 4-16 (`server/**`). New live
flags: `ip56`, `offdevs` (ON); page switches ON: `?hudbars`,
`?deathstrip`, `?uploadicons`, `?veildoor`. REHEARSED

## Held
- R #1873 (save shape 21 -> 22): not before #1960 is deployed (a later
  sitting); it then merges main (keep one `GID_RE`).

## Stalled
- None. For sitting 25: O #1970 (5232), MOD #1971 (5630), K #1972
  (5194), R #1969 (5295), R #1873. Z's next tag: 5663.

## Found
- precheck's `server-tests` 5-minute limit vs the suite's ~220-256 s
  under load (sitting 23's, still; R and O hit it). No card.
- `mp-membudget`'s `buffers` at 24.1-24.2 against its line 24.2 (P's
  reviewer): the next PR may go red on noise.
- `DevPanel.jsx:1638` shows a report's last 3 lines and never `said`
  (since #1909): whoever holds the Test panel (OPS's file).
