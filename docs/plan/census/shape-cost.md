# review-cost (started)
## Facts so far
- clone is SHALLOW (git rev-parse --is-shallow-repository = true): history only 2026-11-17 16:03 .. 2026-11-19 09:49 (1259 commits, 623 merges). "since 2026-11-13" git numbers are NOT measurable; the 612 "added tests" count is the shallow root listing every file. Use in-repo status/census docs for history.
- suites: server/test/*.test.mjs = 518, tools/guards/*.test.mjs = 64 => 582 (run.mjs runs both, 4 at a time)
- run.mjs prints per-suite ms; SLOW_FIRST comment: 2026-10-17 chain of 132 suites took ~69 s
## Precheck (tools/dev/precheck.mjs, 1359 lines, ~27 steps)
- server-tests step runs if ANY of server/, src/, tools/guards/ changed (skipped only for docs/tools-other/public-only): runs run.mjs over 581 suites (REST_CAP_S=20 min; comment: 191 s alone, 600-1100 s beside the slow guard), THEN guards/switches-thrown alone (THROWN_CAP_S=40 min; comment: 756-770 s alone, 89 rows, 2418 suite runs; 1139 s on GitHub runner; whole npm test 1258 s on GitHub). Total cap 60 min of suites.
- eslint over all src on any client change (4 min cap); bakes --hashes 60 s caps when art changes.
## GitHub Actions
- server-ci.yml: on EVERY pull_request event (no path filter) + push main; job `test` = npm ci + npm test (whole suite incl switches-thrown, ~1258 s on runner per precheck comment). No concurrency/cancel-in-progress -> every push to a PR = a full run.
- deploy-worker.yml: push main on server/** -> npm test AGAIN then deploy.
- client-ci.yml: PR on src/**, server/**, tools/qa/mp/**...: lint-build + playable (questline, 15 min cap, npm ci x2 + build + playwright install + scenario, retry once).
- memory.yml: PR on src/public/server/...: membudget (20 min cap) similar install+build+playwright.
- provenance.yml: push main (+cron every 6h).
## Docs (wc -c; du -sb)
- CLAUDE.md 31,157 B/452 l (29,598 at 11-17); GRAND-PLAN 102,608/1686 (88,520 at 11-17); TRAPS 589,701/10418 (582,744 at 11-17; 580 KB at 11-13 per plan l.106); CLAUDE-HISTORY 465,548/6561 (unchanged); UI-DESIGN-NOTES 476,569/2134; ARCH-HANDOFF 81,913/832
- docs/specs 672 files 57.8 MB (mostly images); docs/plan 205 files 3.26 MB (cards 65/424 KB, status 67/110 KB, census 70/2.71 MB)
- du -sb docs = 233,367,028 B (png 126 MB, webp 54 MB, jpg 18 MB). Markdown only: 820 files 13,501,923 B (plan said 3.4 MB on 11-13). At 11-17 16:03 (shallow root 37bb4911): 710 md, 12,050,464 B -> +1.45 MB (+12%) in 42 h.
- biggest growth since 11-17: census/words.md +9508 lines (0 -> 534,539 B), player-words spec +675, RV-review +542, M-tables +521; 169 docs files changed, +21,664 lines.
## Gatekeeper (docs/plan/census/review-z4..z53, 50 files, 637,849 B)
- precheck rehearsal times reported per sitting (grep '(N s)'): z14 421 s; z15-20 341-609; z33-36 323-368; z44-47 430-840; z51-53 829-893 s (cap 900 s noted at z51 "834-889 s against the tool's 900 s cap"). Doubled in ~40 sittings.
- rehearsal rows: 0 with a FAIL count in 50 sittings (grep 'PASS, [1-9] FAIL' none). 16 of 50 files have HELD headings; holds are mostly "a conflict" (merge order), few are a red check (#1792 red together with #1767).
- TRAPS: 340 numbered headings (highest §342) vs 339 on 11-13; 580 KB -> 589.7 KB. Traps got LONGER not shorter as guards landed. census/traps.md (11-13): 77 held as rule, 144 one case, 118 prose. Card V: 31 held by proof; V4: 62 more -> ~93-115 with proofs. Each trap is now prose + census row (traps.md 175 KB) + V4 row + guard.
- GRAND-PLAN grows by a per-sitting italic note ("the gatekeeper, sitting N") on each step: 88.5 KB -> 102.6 KB in 42 h.
## Brief + commits (shallow window 11-17 16:03 .. 11-19 09:49, ~42 h)
- session-brief: 95 lines, 5,710 B; tag-block table lines 5-83 = 4,590 B (80%), many rows "none (all merged)".
- non-merge commits 636: 141 titled "X's status", 236 match status/census/M-tables/regenerated/main-merged; merges 623 of which 231 "Merge pull request", 59 main-into-branch.
- PR numbers in window #2028..#2274 (~247 in 42 h => ~140/day => ~600 in 10 days consistent with plan start ~#1666).
- first-parent PR merges on main: 143; touching src/ or server/src: 97 (68%); docs/ or tools/ only: 40 (28%); docs/plan only: 5.
- asset-door guard 16.5 s, asset-sources 13.2 s (in run, 4-wide). They hold shipped.json (631,933 B, every public/ file's bytes+sha256: 3488 tracked under public) and sources.json (57,256 B, 360 under assets/): rehash every file on every run.
- 114 suites (server/test + guards) read BroTown.jsx/entityRenderer.js/wsClient.js (38,880 lines); 3 parse with babel/acorn (phase-table, state-ledger, lib/renderTables).
- switches-thrown header: designed "share under about 30 s" (rows born from tag 5301); now 89 rows, 2418 suite runs, 756-770 s alone (precheck comment), grows with every new kill switch (CLAUDE.md requires one per server behaviour).
## SERVER SUITE RESULT (cd server && time node test/run.mjs), 2026-11-23 on shared 4-core box
- 582 suites, 4 at a time, 978.7 s: all green; real 16m18.8s, user 27m59.6s, sys 4m40s
- guards/switches-thrown 894.1 s (91% of wall). Other 581 suites done by ~785 s of wall while sharing cores with switches-thrown's 3 jobs.
- top: claims-gain 234.6 s (header says "About 25 s"; not in SLOW_FIRST so starts late), heap-forget 43.3, aggro-grid 34.7, power 26.7, league 25.4, login-keys 21.0, ladder-passes 20.8, picture-door 19.8, guards/phase-table 19.7, cost-guard 16.9, relay-bytes 16.5, asset-door 16.5, ground-waits 15.2, asset-sources 13.2, storm 12.1, presence2 10.8, wire-hostile 10.5, last-place 7.6, roomrow 7.4, inflate-raw 6.7, near-join 6.5, frame-pacer 5.7, tick-share 5.6, market-settle 5.5, guards/four-lines 5.5
- sum of per-suite ms excl switches-thrown = 988 s cpu-ish; 26 suites > 5 s.
- eslint src: 11.8 s (time npx --no-install eslint src). switch table: 619 rows, 556 worker `switch` rows.
- Only `test` (Server CI) is a required check (docs/REPO-SAFETY.md l.127,195).
- Trap prose not retired: TRAPS 339 -> 340 headings, 580 -> 589.7 KB; plus census/traps.md 175,562 B + V4-traps.md 52,098 B describing the same traps.
## Actions estimate
- Server CI per run ~22 min (1258 s npm test on runner per precheck comment + npm ci). Client CI lint-build ~4, playable ~8, memory ~9 (estimates from steps; caps 15/20). src-touching push ~43 min, docs-only push ~22 min. Main: server-ci per merge 22, deploy-worker +22 when server/**.
- ~2.6 non-merge commits per PR in window; at ~2.5 pushes/PR: ~120 min per merged PR -> ~600 PRs ~ 50k-75k minutes in 10 days (unverified: no GitHub calls).
