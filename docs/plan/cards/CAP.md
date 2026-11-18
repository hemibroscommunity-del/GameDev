# Card CAP: the caps leave too, step 1 (GRAND-PLAN 7.5)

**Tags:** 6100 to 6119 (block registered by the next gatekeeper's PR; do NOT edit tools/dev/tag-blocks.json). One a PR, in order.
**Browser:** none. **Read only, never edit:** `src/ui/panels/DevPanel.jsx`, `tools/guards/lib/capGates.mjs` (or wherever `CAP_GATES` lives), `server/src/join.js`, `server/src/wire/*`, `server/src/liveops.js`, `tools/guards/lib/switches.mjs`, `docs/SWITCHES.md`, `server/test/caps-audit.test.mjs`, `tools/guards/traps-*.test.mjs`, `docs/TRAPS.md`, `package.json`, `.github/`. Many cards are changing those files now.

## PRs, in order
1. **(tag 6100) The census.**
   - Files: new `docs/plan/census/caps.md`, new `tools/dev/caps-census.mjs` (the generator; node, no deps).
   - Read GRAND-PLAN 7.5 and `docs/specs/liveops.md` ("Caps override"). For EVERY cap in `CAP_GATES` (about 173): its birth (the v2.3.N tag/commit that added it: `git log -S` on join.js's caps), its switch row if any (switches table), the number of reads on the page (`src/**`) with file list, whether it COUNTS (rows, crops: a number, stays), and whether its old page-side way settles anything on the page (value: coins, loot, xp, hp, a bag: write "settles value" — those go first later, as 4.2's). One row a cap, sorted: settles-value first, then no switch row, then the rest. A header with the totals. The generator writes the file; `node tools/dev/caps-census.mjs --check` fails when the file is out of date.
   - Done when the generator reproduces the file byte for byte and the totals are in the PR body.
2. **(tag 6101) The count only falls.**
   - Files: new `tools/guards/caps-census.test.mjs` (a guard; `server/test/run.mjs` already runs `tools/guards/*.test.mjs`), `tools/dev/caps-census.mjs`.
   - The guard fails when the number of caps whose old page way is still there GROWS past the census's count (a new cap is still born as today: either side ships first — so the guard counts old page-side ways, and a new cap's own old way must be listed in the census by re-running the generator in the same PR; the failure message says exactly that command). Include a break proof (a test that the guard fails on a fabricated extra read).
   - Note: this file is under tools/guards so its merge does not deploy; if run.mjs pulls it into the server suite that is fine.
   - Done when the guard passes on main and the break proof fails as it should.

## Readings chosen for you
- Nothing is removed in this card: no cap, no old way, no read. The removals are 7.2/7.3's later batches.
- If a cap's "settles value" is unclear, mark it `?` and list it in the PR body; do not guess.
