# Guards (v2.3.5022)

A **guard** is a test that reads the source or counts things: "nothing but
`gold.js` writes `.coins`", "every switch has a row", "this list only
shrinks". It tests no server behaviour, so it does not belong under
`server/test/`, where every merged file deploys the worker (TRAPS §277).

The grand plan's rule 1: a gate is a test GitHub runs. A new wall is a suite
under `server/test/` when it tests the server, and a file here when it reads
source or counts things.

## How one runs

- `server/test/run.mjs` (`cd server && npm test`, and so Server CI's `test`
  on every PR) runs every `tools/guards/*.test.mjs`, beside the server's
  suites. **A new guard is a new file here and no line anywhere.**
- A guard runs as `node tools/guards/<name>.test.mjs` **from the
  repository's root**. Its exit code is its verdict: 0 passes, anything else
  fails.
- It is shown as `guards/<name>`. `cd server && npm test -- <name>` runs
  only the guards and suites that name matches.
- Precheck runs `npm test` when a file here changes.

## How to write one

- Name it `<what-it-holds>.test.mjs`. A file here that does not end in
  `.test.mjs` never runs (`rails.test.mjs` fails it).
- Find the repository by the file's own place
  (`new URL('../../', import.meta.url)`), never by the directory it was
  started in.
- Print one line a check, `ok` or `FAIL` first, and end with
  `process.exit(failed ? 1 : 0)`. On a failure `run.mjs` shows the lines
  that hold `FAIL`.
- **Record the break proof** (the plan's rule 8): in the guard's header,
  the one-line change that turns it red, tried once by hand. A number met
  by renaming is not met.
- A table that lands as a census (rule 3) fails only when its count of
  unlisted things RISES; the gatekeeper alone makes it strict.
- Keep it under a second or two: it runs on every PR.
- **Helpers two guards (or a guard and a script) share** go in
  `tools/guards/lib/*.mjs` (v2.3.5101): plain modules, never run as guards.
  The only parser GitHub's `test` job has is esbuild (wrangler brings it to
  `server/node_modules`); the root's packages (`@babel`) are not installed
  there. `lib/fourLines.mjs` shows how to reach esbuild.

`rails.test.mjs` is the example: it holds these rails themselves.

## A trap held, and its break proof (v2.3.5320)

A guard or a suite that holds a trap of `docs/TRAPS.md` (the plan's step
8.2) says so in its **header**, one line a trap, in one form:

```
TRAPS §N (the rule | one case): what it holds. Break: <file>: <the change> -> FAIL (tried <date>).
```

- `the rule`: the check fails wherever the trap could come back (a
  system's files, a folder, a table); `one case`: it pins only the place
  the trap found, and the line says why.
- `Break`: the one-line change, in a scratch copy, that turned the check
  red; then undone.  A name a scan reads is tried renamed too.
- The scoreboard's row "Traps held by a test that has a break proof"
  counts these lines (`tools/dev/scoreboard/traps-with-break-proof.mjs`,
  here and in `server/test/`), and the trap gets `Held by: <file> (tag N).`
  at the end of its section in `docs/TRAPS.md`.
