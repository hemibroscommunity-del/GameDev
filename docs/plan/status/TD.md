card: TD
branch: claude/codebase-inventory-gaps-pz4bpa (PR 1; PRs 2 to 4 stack on it: claude/plan-td-2-lint, -3-unused, -4-archive)
prs: PR 1 (6700, draft #2380, base main; waits for the owner's Approve: `.github/`); PR 2 (6701, draft #2381, base PR 1's branch); PR 3 (6702, draft, `claude/plan-td-3-unused`, base PR 2's branch)
state: working (PR 4: the orchestrator answered its two questions, 2026-11-26)

## Done
- PR 1 (6700): the deploy's filter leaves out `server/test/**` and `server/README.md` (`.github/workflows/deploy-worker.yml`, the push's one `paths` list); CLAUDE.md §4 and TRAPS §277 say the new rule; this card; the block 6700 to 6719 in `tools/dev/tag-blocks.json`. The owner's words, in the session, 2026-11-26: "Ok fix in your recommended order". Deploys nothing (no file under `server/`).
- Checked on this box at this head: `cd server && npm test` whole, `node tools/dev/precheck.mjs`.
- PR 2 (6701): `npm run lint` is `eslint src server/src`; eslint.config.js's second block gives the worker the same eight rules, globals `serviceworker` + `WebSocketPair` only (211 files, 0 errors); precheck's eslint step lints both and runs when either tree or the config changes. Break proof, by hand, not committed: an undefined name added to `server/src/accuracy.js` turned `npm run lint` and precheck red. No file under `server/`: deploys nothing.
- PR 3 (6702): `no-unused-vars` (args and caught errors left, `React` left) in `src/game`, `src/state`, `src/ui/kit`; the 32 names in 16 files of `src/game` re-measured (the card's list) and cleared: unused imports deleted (`monsterCombat.js`'s whole `getBtPlayerId` import of `@/networking/index.js` and the single-name `@/data/index.js` imports of `questComplete`, `stateCleanup`, `visualSystems` went, none for a side effect); pure locals deleted; `expired`'s `tickStatuses(...)` call kept, its name dropped. Kept under a disable line: `RETIRED_FOCUS` (kept on purpose), `lockHolds` (the note calls its test the one `autoLockHolds` runs), `czMX` (see Needs). Break proof by hand: an unused import in `src/game/` turns `npm run lint` red, one in `src/ui/mobile/` does not. The card's five open stacks change none of the 16 files.

## Next
- PR 4 (6703, the stale papers to `docs/archive/`).

## Found
- `server/src/storeoffer.js` 388 and 417: ESLint's two "unused eslint-disable directive" warnings (no-await-in-loop). Warnings fail nothing; the file is left (card TD PR 2).
- `docs/plan/finish.md` part 3 and `docs/design/UI_ARCHITECTURE_V2_PLAN.md` rule 5 still say a new file in `server/test/` deploys the worker: true until this PR is on `main`, harmless after (a session that follows them is only more careful). Their own cards' files.
- `docs/plan/debts.md` "Found": its first line (a merge that changes `server/test/` deploys) is mended by this PR: the gatekeeper's to strike.
- `server/src` has 39 unused variables and is not under the unused-variable rule (card TD PR 3 says why): for the next card that changes the worker.
- Of 736 names the unused-variable rule finds under `src/`, 104 are `React`, imported for JSX the build no longer needs: harmless, left.
- The Cloudflare plan the account is on is not in the repository (GDD-AS-BUILT 12.1 says the free plan, 2026-10-21): the owner's to say.

## Needs
- `src/game/zoneTransitions.js` `czMX = Math.floor(czZone.w / 2)`: read by nothing, but it throws when `S.currentZone` is not in `ZONES` (a combat zone outside town, the Wheel and dungeons). Deleting it would stop that throw, so it stays under a disable line: may it go? (card TD PR 3).
- The owner's Approve on PR 1 (`.github/`).
- The owner's word on `README.md` and `gdd.md` (1.6 MB each, the old design document): stay at the root, or a short true README with the old one archived (card TD PR 4 leaves them).
