# Card TD: three mends from a peer review (the deploy's filter, the linter's reach, the stale papers put away)

Model and effort: PR 1 is the orchestrator's own session (it changes `.github/`, and the owner's words were said there). PRs 2 to 4 run in one fresh session on the strong model at standard effort (PR 3 deletes lines in combat's files). Tags: 6700 to 6719 (a new block, claimed by PR 1), one a PR, written bare here.

The owner, 2026-11-26, in the orchestrator's session. Shown a peer review of the code and the orchestrator's reading of it, which ended "What I would take from it: the deploy filter; lint; archive", the owner said: *"Ok fix in your recommended order"*.

PURPOSE: three cheap things that make every later session cheaper or safer, and nothing a player sees.
1. A merge that changes only test files stops deploying the worker (a disconnect for every player, the room's memory wiped, and a paid run, for nothing).
2. The linter reads the worker and refuses new dead code where the code is clean, so a session does not wire into something nobody calls.
3. Papers that no longer describe the game leave every session's search, so no session builds from them.

These PRs form ONE STACK: PR 2's branch starts from PR 1's branch (`claude/codebase-inventory-gaps-pz4bpa`, which holds this card and the status file), PR 3's from PR 2's, PR 4's from PR 3's. Each is a draft PR whose base is the branch under it. Branches: `claude/plan-td-2-lint`, `claude/plan-td-3-unused`, `claude/plan-td-4-archive`. `docs/plan/status/TD.md` rides every commit. `docs/plan/finish.md` parts 5 and 6 bind: one push a PR, output to a file, hand over at 250,000 tokens.

Never touched by this card: `src/ui/BroTown.jsx`, `src/rendering/systems/*`, `src/ui/mobile/**`, `src/ui/panels/**`, `src/ui/kit/**`, any file under `server/src/`, `.github/` (PR 1 alone, done), `server/wrangler.toml`, `docs/GRAND-PLAN.md`, `docs/plan/debts.md`, `docs/plan/log.md`.

1. **(6700) The deploy does not run for a test file alone.** DONE in the orchestrator's session.
   `.github/workflows/deploy-worker.yml`: the push's `paths` is `['server/**', '!server/test/**', '!server/README.md']` (a `!` pattern in the ONE list: GitHub refuses `paths` and `paths-ignore` together on one event). CLAUDE.md §4 and TRAPS §277 say the new rule. Measured on main d42e48ac: of the 35 merges between 2026-11-18 and 11-25 that changed a file under `server/`, 29 changed only `server/test/`. No guard was added: the owner's Approve on every `.github/` change (CODEOWNERS) is the wall.
   Done when the PR is on `main` with the owner's Approve, and the next merge that changes only `server/test/` starts no "Deploy worker" run.

2. **(6701) The linter reads the worker.** No file under `server/` changes, so nothing deploys.
   Files: `eslint.config.js` (a second block), `package.json` (`"lint": "eslint src server/src"`), `tools/dev/precheck.mjs` (its eslint step, about lines 837 to 861, lints both and its words say so), and any document that says the linter reads `src` only (grep `eslint src` under `docs/` and `CLAUDE.md`; `.github/workflows/client-ci.yml` runs `npm run lint` and is NOT edited: its comment may stay).
   Readings chosen:
   - The worker's block has the SAME eight rules as the page's, none more, none off.
   - Its globals: the fewest that give a clean run. Measured on main d42e48ac with `globals.serviceworker`, `globals.browser`, `WebSocketPair`, `process`, `Buffer`: 211 files, 0 findings. Start from `globals.serviceworker` plus `WebSocketPair` and add only what a real finding names; say the final list in the PR.
   - ESLint prints two "unused eslint-disable directive" notes for `server/src/storeoffer.js` (388, 417). They are warnings and fail nothing. Leave the file: write them under Found.
   Done when `npm run lint` lints both trees and is clean; precheck's eslint step does the same; and, tried by hand and not committed, an undefined name written into a file under `server/src/` turns `npm run lint` and precheck red.

3. **(6702) Unused variables are refused where the code is clean.**
   The rule: `'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^React$' }]`, for `src/game/**`, `src/state/**` and `src/ui/kit/**` only. (`React` is left out because 104 files still import it for JSX, which the build no longer needs: harmless, and removing it would touch every screen.)
   Measured on main d42e48ac with that rule: `src/state` 0; `src/ui/kit` 0; `src/game` 32, in 16 files:
   achievements.js:54 ACHV_TIERS; characterCreatorEffects.js:152 RETIRED_FOCUS; desktopControls.js:110 _desktopSpecialAttack, :185 _document$activeEleme; dodge.js:15 LUNGE_STAMINA_FRACTION, RETREAT_SHOT_STAMINA_FRACTION, :210 tlen; groundLoot.js:12 recalcDerived; monsterCombat.js:27 SPECIAL_ATK_MULT, :34 getWeaponCritDmgStat, recalcDerived, :37 monsterProceduralRadius, :41 isRemnantSkull, :54 getBtPlayerId, :124 _pDmgBase, :238 expired, :250 sid, :634 _abilities, :1712 _lockPt; playerActions.js:19 SPECIAL_ATK_MULT, PROG3; projectiles.js:1005 recalcDerived, :1014 isRemnantSkull, :1867 _archProj; questComplete.js:27 BT_AUDIO; shieldGem.js:34 BT_AUDIO; stateCleanup.js:9 SWING_COOLDOWN; stormSparks.js:59 k; targeting.js:222 lockHolds; visualSystems.js:10 BT_AUDIO; zoneMechanics.js:33 zoneElem2; zoneTransitions.js:1141 czMX.
   Make the list again first (the lines move); it is the same rule run over the three folders.
   Readings chosen:
   - An unused import is deleted. An unused local is deleted with the expression that fed it ONLY when that expression has no effect of its own (a read, a pure helper); where the right-hand side calls something that acts, keep the call and drop the name. Never renamed with an underscore, never moved.
   - A binding with a comment saying it is kept on purpose (or a function nobody calls that a comment calls a reference) stays, under one `// eslint-disable-next-line no-unused-vars -- <its reason, in the comment's words>`; each is named in the PR. The page has one such line today: add as few as the code truly asks.
   - An import that is there for its side effect becomes `import './x.js'` and the PR says so.
   - No behaviour changes: nothing dormant is turned on or off (TRAPS §305). If deleting a name would change what runs, it is not unused: stop and write it under Needs.
   - The open stacks were checked on 2026-11-26 (UI2's `claude/plan-ui2-10b-tree`, `-9b-panels`, `-7b-grow`; PAD's `claude/plan-pad-6-specials`; GR's `claude/plan-gr-2-camfollow`): none changes one of the 16 files, and none adds a finding under this rule. Check again before the push (`git fetch` each, `git diff --name-only` against the merge base); a file an open PR now changes is left as it is, exempted by name in the config's block with the PR's number, and written under Needs.
   - Where a guard holds a count that falls with these deletions (`tools/guards/lib/fourLines.mjs`, a census), lower it as that guard asks; where a suite matched a deleted line as text, mend the suite's reading and say which. A suite under `server/test/` changed here deploys the worker until PR 1 is on `main`: say so in the PR.
   - NOT in this PR: `server/src` (39 findings). Clearing them deploys the worker and draws the gate's purpose review for no change in behaviour. Written under Found, for the next card that changes the worker anyway.
   Done when `npm run lint` is clean with the rule on; `npm run build` passes; `cd server && npm test` (the whole suite, once) and `node tools/dev/precheck.mjs` pass; and, tried by hand and not committed, an unused import added to a file under `src/game/` turns `npm run lint` red while one added to `src/ui/mobile/` does not. The PR runs GitHub's `playable` and `memory-budget` (it changes `src/`): both green before it is called ready.

4. **(6703) The stale papers leave the search.**
   Moves (`git mv`, so history follows): the root's `server-computed-damage-spec.md`, `damage-normalization-spec.md`, `gear-layer-spec.md`, `gear-armor-separation-recipe.md`, `ARMOR_SCALING_NOTES.md` and `creative-reference.md` to `docs/archive/root/`; `docs/triage-2026-09-14`, `-15`, `-16`, `-17` and `-18` to `docs/archive/`.
   New: `/.ignore` with the one line `docs/archive/` (the sessions' search tool reads it: tried on 2026-11-26, a folder named there is skipped; a plain `grep -r` in a shell still reads it); `docs/archive/README.md`, a few lines: what is here, that it is history and never a blueprint, and how to search it on purpose (`rg --no-ignore`, or name the folder).
   CLAUDE.md §2: the STALE sentence gains "and everything under `docs/archive/`", in as few words as it takes. Nothing else in CLAUDE.md.
   Readings chosen:
   - Read `docs/specs/provenance.md` first. If moving a file changes anything the provenance workflow records or checks, stop and write it under Needs.
   - Every mention of a moved path is made true: grep each old path and each moved file's name across the whole repository (`src/` comments such as `src/rendering/playerSprites.js`'s on the recipe, `tools/`, `server/test/`, `docs/`, `CREDITS.md`, `tools/assets/uploads.json`). A tool or a test that READS a moved file gets the new path and no other change. If anything under `src/` or `public/` LOADS a moved file at run time, that file is not moved: say which.
   - NOT moved, each for its reason, written in the PR: `README.md` and `gdd.md` (the repository's face: the owner's call, asked under Needs); the root's pictures and the video (the asset door's papers, `tools/assets/uploads.json`); `docs/plan/census/review-z*.md` (the gatekeeper's record: card Z's); anything under `docs/specs/`, `docs/shots/` or `docs/plan/`.
   Done when, from the repository's root, the search tool finds no line of a moved file by a phrase only that file holds, and finds it with ignoring off; no file outside `docs/archive/` names an old path; `cd server && npm test` (whole, once), `node tools/dev/precheck.mjs` and `npm run build` pass. The PR says whether any file under `server/` changed (a test that named a moved path) and so whether it deploys.

Each PR's words say, in plain language, what changed and that a player sees nothing. Open each as a draft, one push, then tell the orchestrator its number and head.
