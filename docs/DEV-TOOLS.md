# DEV-TOOLS — session tooling for parallel AI development

v2.3.1201. Countermeasures for the three failure modes the 2026-07-07
post-mortem found in parallel AI sessions: (1) sessions can't see each
other's in-flight work (five claimed the same version tag, two built
the same feature); (2) the sandbox blocks npm installs, so client code
was pushed half-verified; (3) the plain-`{}`-keyed-by-client-id bug
class recurred three times in one day.

Both scripts are ZERO-DEPENDENCY (node + git only) so they run in the
build sandbox where `npm install` is blocked (handoff rule 26).

## `tools/dev/session-brief.mjs`  (`npm run session-brief`)

Session-start briefing, auto-run by the SessionStart hook in
`.claude/settings.json`. Prints:

- version high-water on `origin/main` (max `v2.3.N` across
  package.json + recent log subjects) and the SUGGESTED next free tag;
- remote `claude/*` branches pushed in the last 72h with head-commit
  subjects — the in-flight-work collision surface;
- the 5-line session protocol.

Fetches `origin` first (7s time-box); falls back to local refs when
offline and says so. Completes in well under 10s.

## `tools/dev/precheck.mjs`  (`npm run precheck`)

Pre-push gate: `node tools/dev/precheck.mjs [baseRef=origin/main]`.
Diffs merge-base(baseRef, HEAD) against the working tree — commit your
work first so new files are seen. Exit 0 = OK to push (WARNs don't
block). Checks:

| # | check | what fails |
|---|---|---|
| 1 | syntax | `node --check` per changed .js/.mjs (via temp .mjs); string/comment-aware brace/paren/bracket balance for .jsx |
| 2 | dup-case | duplicate `case` labels in one switch (v2.3.1176 arena_bet shadowing class) |
| 3 | version-tag | the tag CLAIMED by the diff (max added `v2.3.N`) ≤ base high-water; older added tags are treated as rule-25 back-references, not gated. Also WARNs with 48h remote-branch activity |
| 4 | dmg-popup | raw `S.dmgNumbers.push(` in changed client files — use `pushDmgPopup` (v2.3.1188) |
| 5 | storage-keys | literal `storage.put/get('<prefix>:` in changed server/src files not in the ARCHITECTURE-HANDOFF rule-2 registry (GameRoom only; marketplace/arena/leaderboard/feedback DOs exempt) |
| 6 | proto-safety | WARN: `= {}` / `: {}` indexed nearby by an id-shaped bracket key — use `Object.create(null)` or `Map` (duel.away v2.3.1175, party meta v2.3.1185, amulet tiers v2.3.1192). A site triaged SAFE (server-generated key, join-gate-protected player id, or not-a-map) carries an inline `// proto-ok:<reason>` marker and is skipped (v2.3.1214) |
| 7 | server-tests | `cd server && npm test` when server/ changed (zero-dep, sandbox-safe) |

Known limits: check 5 is literal-only (computed keys aren't extracted —
register them by hand); check 6 is a heuristic, review each hit; the
JSX balance check tolerates prose apostrophes but can't catch every
malformation `vite build` would (CI still runs lint + build).

## `.claude/settings.json`

Holds the SessionStart hook wiring only. If you add settings, keep the
hook intact — it is how every future session learns the current tag
high-water before claiming one.
