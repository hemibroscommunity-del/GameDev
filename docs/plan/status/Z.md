card: Z
branch: claude/plan-z-sitting-46
prs: this PR (tag 6260), the last line of sitting 46's list (ready)
state: ready

## Done
- `census/review-z46.md`. 5.4 ticked (M), 5.8 ticked (K3); 5.5's note.
  Blocks CAP, LG, WD, TL, RD, EN, FX, HB; Z 6260-6279; `nextBlock` 6280.
  K3, V7, M, V6, V3 done. Lines: frame-steps 1531, switch-reader 17,
  render-tables 0. Part 9: "Decided for the owner while away".
## The list: merge in this order, each "Create a merge commit"
1 P2 #2185 · 2 M2 #2186 · 3 HB #2188 · 4 TL #2175 · 5 LG #2170 · 6 RD
#2191 (once its test is green) · 7-8 TL #2181, #2183 · 9-10 LG #2178,
#2184 · 11-15 K4 #2168, #2176, #2177, #2182, #2187 · 16-17 K2 #2169,
#2173 · 18-21 RV #2164, #2165, #2193, #2192 · 22-23 CS #2139, #2152
(CS merges `main` once 21 lands) · 24-25 EN #2189, #2195 · 26 FX #2190
(merges `main` once 25 lands, re-generates M-tables.md) · 27-28 CAP
#2172, #2174 · 29-31 WD #2171, #2179, #2180 (WD re-lands 4995/385 once
23 lands) · 32 Z. On `main` b5669a5b, one base at every step. 7-26
deploy the worker: merge them one after another. Drafts (K4, CS, EN,
FX, RD) are marked ready first. Heads and trees: the census.
## Held / To 47
- None held. EN #2195 is listed only if retargeted to `main` and its
  review is clean (else to 47).
## Found
- 45's (a)-(ad) carried. New: (ae) a precheck that times out leaves
  `switches-thrown` running as an orphan (TL's Found, seen here). (af)
  elemental2 "restore clamps at maxMana" red once under `duelpace` thrown
  (#2151's CI): watch. (ag) canvas-witness 8b reads only a comment (M).
  (ah) mp-membudget heap/buffers over their lines on a session box, CI
  fine (FX, P2). (ai) WD: 96 "tap" words outside deskWords().
## Needs
- Decided for the owner while away (the planning session): K4 #2168
  `harvestgrade`, `bowpath` ON; #2187 `botscoresave` ON (writes only for
  a script's record); CAP's settles-value reading; LG's rung 5 later.
- Owner's own: `.github/`, Cloudflare; wind-dunes.mp3's source; SEC2's
  report form needing a public repository.
