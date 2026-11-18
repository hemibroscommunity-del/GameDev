# Card LG: what honest trouble looks like, and the league (GRAND-PLAN 10.6, 10.7)

**Tags:** 6120 to 6139 (block registered by the next gatekeeper's PR; do NOT edit tools/dev/tag-blocks.json). One a PR, in order.
**Browser:** light (PR 3 drives the real page once with the harness; `world: 'wheel'`, `ws: [1, 5]`).
**Read first:** all of pillar 10 in GRAND-PLAN; the detectors that exist (`server/src/bowshot.js`, `hitproof.js`, `harvestgrade.js`, `server/test/claimbots.mjs` and whatever else pillar 10's ticked steps name) — READ ONLY: card K4 owns them and `claimbots.mjs`. **Never edit:** any `server/src/*` file, `server/src/testmode.js`, `tools/guards/lib/switches.mjs`, `docs/SWITCHES.md`, `docs/TRAPS.md`, `.github/`. This card is tools and docs only: no game behaviour changes, so no cap and no live flag.

## PRs, in order
1. **(tag 6120) Honest trouble (10.6).**
   - Files: new `docs/specs/honest-trouble.md`.
   - For each signal the detectors read (list them from the code, with file:line), what changes it with no cheating: frame rate (60/30/20/4 fps, Low Power iPhone at 30 sharing one rhythm), the line's delay and jitter, a deploy (every session reconnects in the same second), a hidden tab (timers throttled, then a burst), a slow phone (`BT_QA_CPU_THROTTLE`). Then, per signal, what a detector must do so these do not read as bots (e.g. never cluster on deploy-second reconnects). Plain words, one table a signal.
   - Done when every signal any detector reads is in a table, each with its source line.
2. **(tag 6121) The league's bots, rungs 1-2 (10.7, tools only).**
   - Files: new `tools/league/` (README, `bots/wire-script.mjs`, `bots/wire-noise.mjs`, `score.mjs`), new `server/test/league.test.mjs`. You may add one `scripts` entry to `package.json` (`"league": "node tools/league/score.mjs"`) — this card holds package.json now.
   - Rung 1: a script on the wire (joins with `ws: [1, 5]`, a record seeded first as CLAUDE.md §5 says; moves, hits, harvests at machine-perfect timing). Rung 2: the same with human-like noise. `score.mjs` runs each existing detector over each bot's session against a local worker (`npx wrangler dev --local`, see docs/DEV-TOOLS.md) and prints caught/missed per rung. `league.test.mjs` fails when an easy rung (1) is missed by every detector, or when a recorded honest trace (PR 3; until then the server's own test fixtures of honest play, if any) is flagged. It touches server/test, so it deploys on merge: expected.
   - Done when score.mjs prints a table and the test passes on main.
3. **(tag 6122) Rungs 3-4 and replay speeds.**
   - Files: `tools/league/bots/page-script.mjs` (the real page driven by the phone harness `tools/qa/mp/harness.mjs`, read-only use of H.*), `tools/league/replay.mjs`, `tools/league/traces/` (one recorded honest trace of a scripted-but-human-paced play, small), `server/test/league.test.mjs`.
   - Replays run at 60, 30, 20 and 4 fps and through a simulated deploy (a reconnect mid-trace); the honest trace must pass at every speed.
   - Rung 5 (a model driving the browser) is NOT built here: write it in the README as later.
   - Done when the honest trace passes at all four speeds and through the deploy, and the scores are in the PR body.

## Readings chosen for you
- "Frozen": a detector's code at main's commit when the bots are written; this card writes bots only, never a detector.
- If no detector catches rung 1, that is a FINDING for the owner, not a red test to tune away: make the test's rung-1 line a `todo` naming it, and send me one line.
