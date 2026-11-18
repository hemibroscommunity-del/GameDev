card: Z
branch: claude/plan-z-sitting-45
prs: this PR (tag 5034), the last line of sitting 45's list (ready)
state: ready

## Done
- `census/review-z45.md`. 1.5 ticked (O2's #2098, #2108 merged); 8.2's
  note (V4's four merged). Block V7 6080-6099; `nextBlock` 6100.
## The list: merge in this order, each "Create a merge commit"
1 O2 #2148 · 2-8 J3 #2154 to #2160 · 9 U3 #2138 · 10 V7 #2153 · 11 K3
#2130 · 12-14 P2 #2142, #2150, #2161 · 15-16 M #2127, #2131 · 17-19 M2
#2144, #2145, #2146 · 20-24 K4 #2129, #2140, #2147, #2151, #2162 · 25 K2
#2136 · 26-39 RV #2115 to #2123, #2132, #2133, #2141, #2164, #2165 · 40-43
V6 #2135, #2137, #2143, #2149 · 44 V3 #2128 · 45 Z (this PR). On `main`
79f8c4ab, one base at every step but 43 and 44 (heads and trees in
`census/review-z45.md`). 14-43 deploy the worker but 19 and 41: merge them
one after another. 43: V6 merges `main` once 42 lands; 44: V3 merges
`main` once 43 lands (its `pacekeep` row meets RV's `paidmark`). A line
whose `test` is not green merges only once it is; a red one stops its
stack there.
## Held / To 46
- CS #2139, #2152: no head with `main` (and RV's #2110) merged by the cut.
- V7 #2163, #2166: two bases over #2153 (V7 merges `main` into #2153 first).
- K4 PR 7 (5906, `harvestgrade` and `bowpath` ON, the owner's "Go
  recommended"): before `bowpath` is on, #2162's medium (a nocked arrow's
  hit before release sends no relay: projectiles.js:1810).
- To lower once merged: frame-steps LEGACY_LINE 1555 -> 1531,
  switch-reader OUTSIDE_LINE 33 -> 17 (M); render-tables TABLES_LINE 54 ->
  0 (M2).
## Found
- 41's (a)-(q) to 44's (aa) carried. New: (ab) `crowdfight` "knew every
  bot" red on main (card M's report; TRAPS §177). (ac) RV moved sitting
  44's lines 12-17 after the cut (traps-worker §184 went red with V4's
  #2124): the planning session merged the new heads. (ad) Every card trips
  precheck's 5-minute `server-tests` cap here (the suite 13-14 min).
## Needs
- Decided for the owner while away (the planning session): P2 #2161
  `townparts` ON (`?townparts=0`); V6 #2149 lowers V4's §24 list.
- Owner's own: `.github/`, Cloudflare; wind-dunes.mp3's source; SEC2's
  report form needing a public repository.
