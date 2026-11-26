card: TD
branch: claude/codebase-inventory-gaps-pz4bpa (PR 1; PRs 2 to 4 stack on it: claude/plan-td-2-lint, -3-unused, -4-archive)
prs: PR 1 (tag 6700, draft: this branch, base main). It changes `.github/`: it waits for the owner's Approve.
state: ready

## Done
- PR 1 (6700): the deploy's filter leaves out `server/test/**` and `server/README.md` (`.github/workflows/deploy-worker.yml`, the push's one `paths` list); CLAUDE.md §4 and TRAPS §277 say the new rule; this card; the block 6700 to 6719 in `tools/dev/tag-blocks.json`. The owner's words, in the session, 2026-11-26: "Ok fix in your recommended order". Deploys nothing (no file under `server/`).
- Checked on this box at this head: `cd server && npm test` whole, `node tools/dev/precheck.mjs`.

## Next
- PRs 2 to 4 (the linter's reach, unused variables, the stale papers): a fresh session on the strong model, from this card, stacked on this branch.

## Found
- `docs/plan/finish.md` part 3 and `docs/design/UI_ARCHITECTURE_V2_PLAN.md` rule 5 still say a new file in `server/test/` deploys the worker: true until this PR is on `main`, harmless after (a session that follows them is only more careful). Their own cards' files.
- `docs/plan/debts.md` "Found": its first line (a merge that changes `server/test/` deploys) is mended by this PR: the gatekeeper's to strike.
- `server/src` has 39 unused variables and is not under the unused-variable rule (card TD PR 3 says why): for the next card that changes the worker.
- Of 736 names the unused-variable rule finds under `src/`, 104 are `React`, imported for JSX the build no longer needs: harmless, left.
- The Cloudflare plan the account is on is not in the repository (GDD-AS-BUILT 12.1 says the free plan, 2026-10-21): the owner's to say.

## Needs
- The owner's Approve on PR 1 (`.github/`).
- The owner's word on `README.md` and `gdd.md` (1.6 MB each, the old design document): stay at the root, or a short true README with the old one archived (card TD PR 4 leaves them).
