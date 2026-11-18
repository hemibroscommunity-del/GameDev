# Card WD: every word a player reads, in one table (GRAND-PLAN 8.8, part 2)

**Tags:** 6140 to 6159 (block registered by the next gatekeeper's PR; do NOT edit tools/dev/tag-blocks.json). One a PR, in order.
**Browser:** none. **Read only, never edit:** everything under `src/` (src/ui/BroTown.jsx, the renderers and many panels are being changed by other cards now), `server/src/*`, `package.json`, `docs/TRAPS.md`, `tools/guards/lib/switches.mjs`, `docs/SWITCHES.md`, `.github/`. This card moves NO words yet: it counts them, so a later card (after the big files are free) can move them into the table.

## PRs, in order
1. **(tag 6140) The census of player-facing words.**
   - Files: new `tools/dev/words-census.mjs` (node, no deps; parse with a simple tokenizer or the JSX/JS strings, no new packages), new `docs/plan/census/words.md`.
   - Every string a player can read: JSX text, `title`/`aria-label`/`placeholder`, toasts and popups, chat/system lines, Pixi `Text`s, server refusal reasons and messages the page shows (server/src: read only). Per string: file:line, the screen/system, and whether it already comes from a table (`src/data/*`, `deskWords()`, etc.) or is written in place. Group by screen. Header totals: in a table vs in place. Flag CLAUDE.md's word rules: a player-facing "Wheel" or "remnants" (must be "BroTown"/"the world"/"Remains"), and "tap" words a computer player reads that skip `deskWords()` — list those as Found lines in your status file (not fixed here).
   - Done when the generator reproduces the file byte for byte (`--check` mode) and the totals are in the PR body.
2. **(tag 6141) The count only falls.**
   - Files: new `tools/guards/player-words.test.mjs`, `tools/dev/words-census.mjs`.
   - The guard fails when the number of in-place player strings GROWS past the census's count, and ALWAYS fails on a new player-facing "Wheel"/"remnants" (allowlist the ones the census found, so main stays green). Its message gives the one command to re-run. Include a break proof.
   - Done when the guard passes on main and the break proof fails as it should.
3. **(tag 6142) The table's shape (doc only).**
   - Files: new `docs/specs/player-words.md`.
   - Propose the one table (file, key naming, how a screen reads it, how desk/phone variants and the server's refusal words fit, how the guard tracks the move), and the order of moves screen by screen with which file each touches, so a later card can do it once BroTown.jsx is free. No code moves.
   - Done when the plan names every screen in the census.

## Readings chosen for you
- Developer-only text (the Test/Dev panel, console logs, QA probes) is NOT player-facing: list its total only.
- Where a string's visibility is unclear, mark `?` and count it as player-facing.
