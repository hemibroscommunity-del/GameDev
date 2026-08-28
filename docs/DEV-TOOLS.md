# DEV-TOOLS — session tooling for parallel AI development

v2.3.1201. Countermeasures for the three failure modes the 2026-07-07
post-mortem found in parallel AI sessions: (1) sessions can't see each
other's in-flight work (five claimed the same version tag, two built
the same feature); (2) client code was pushed half-verified, on the belief
that the sandbox blocked npm installs -- it does NOT (verified
2026-08-03; see CLAUDE.md), so client changes can and should be
smoke-tested locally now; (3) the plain-`{}`-keyed-by-client-id bug
class recurred three times in one day.

Both scripts are ZERO-DEPENDENCY (node + git only) so they run before
any install has happened -- which is still worth keeping, because it
makes them usable as a pre-push gate in a cold checkout.  (Note: the
sandbox does NOT block `npm install`, contrary to what this file said
until 2026-08-03; the zero-dependency property is a convenience now,
not a necessity.)

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

## `tools/qa/mp/` — headless MULTIPLAYER tests (v2.3.1609)

Two real Chromium browsers driving the real React UI against a real
GameRoom Durable Object. Not mocks: `wrangler dev --local` serves the
actual worker over a real WebSocket, and each browser CONTEXT is a
separate browser profile, so the two players get separate `bp_`
passphrases — the headless equivalent of the manual `?guest=1` trick.

```
npm run build                    # the tests serve dist/, so build first
node tools/qa/mp/run.mjs         # every scenario
node tools/qa/mp/run.mjs trade duel
node tools/qa/mp/audio-formats.mjs   # every SFX decodes in Chromium
```

Exits non-zero on any failed assertion. Roughly a minute per scenario;
most of that is the loading screen honouring the animation-preloading
law, which is correct behaviour, not slowness to optimise away.

Notes for anyone extending it:

- **CLAUDE.md says the sandbox blocks `npm install`. That is stale** —
  it succeeds for both the client and `server/`, which is the only
  reason any of this is possible.
- `window._gameState` is a **ref**; the live state is `.current`.
  Reading the ref yields `undefined` for every field and looks exactly
  like "the player never joined".
- Join **sequentially** (`joinPair`): open B's context only once A is
  fully in-world. Opening both first left `S.others` empty every time.
- A player who never moves is never marked dirty, so per-player tick
  deltas never mention them and a peer waits forever — `waitMutualSight`
  nudges both.
- Actions go through the DOM (that is the point), but three shipped
  bridges save the tests from pixel-accurate canvas taps:
  `__broInspectPlayer(id)` opens the real inspect card,
  `__broLegacyUI.chat()/.clan()` toggle those panels, and the operator
  endpoint `POST /api/admin/grant` seeds gold and items through
  `_creditPlayer` — the same path market, mail and duel payouts use.
- Aim from the **camera**, not the window centre: `worldX = screenX +
  camera.x`, and the camera clamps at map edges. A swing aimed at the
  middle of the window can be tens of degrees off, and the server's arc
  check (`±arc/2`, default ±34°) then drops it — which reads exactly
  like a broken duel.
- **Melee reach is 50px, checked against the SERVER's copy of both
  positions.** `waitMutualSight` nudges the two players apart to make
  them dirty, which leaves them ~58px apart — every swing was dropped
  as out of range while the client's stale mirror of the peer still
  read 8px. Anything geometric: walk into range and confirm the
  distance via `serverPlayer()` before asserting.
- **Damage popups expire.** The renderer destroys them a beat after
  they spawn, so a single read after the fact is a coin flip — the same
  build gave `["Hit! -4"]` on one run and `[]` on the next. Sample
  continuously and accumulate.
- Anything the server owns (hp, coins, inventory, position) should be
  read from the server (`serverPlayer` / `adminPlayer`), not from a
  one-shot client read that races the echo. Assert the client too when
  the point is that the PLAYER can see it — but as a separate check, so
  "the server didn't do it" and "the screen didn't show it" stay
  distinguishable.
- Ports are OS-assigned per run, and the worker is spawned detached and
  killed by process group. Both exist because a leaked wrangler used to
  poison the next run before a single assertion ran.

## `public/tools/draw.html` — the prize draw (v2.3.2030)

A standalone page (no build step, same pattern as `anchor.html` and
`deploy-scores.html`) that picks the merch winner from a Bitcoin block hash.
Open it, set the event window, load the entrants, lock, and it draws by itself
when the block is mined.

Two things about it are load-bearing rather than cosmetic, and both are tested:

* **It refuses to draw against a block that already exists.** Locking requires
  a target height strictly above the current chain tip, and the tip at lock
  time is recorded in the commitment. If you can pick the block *after* seeing
  the hash you can fish for a winner, which makes the whole exercise theatre.
  The refusal is the product; the modulo is not.
* **Entrants read `series.kills` and `level`, never the top-level
  `kills`/`playtime`/`goldEarned`/`ap`.** Those ride the client-reported
  `rpgData` blob (see the comment at `leaderboard.js:56`) and are forgeable by
  a modified client. Entrant ordering is by row id, not by the order the
  server returned rows, so two people drawing from the same data number the
  list identically and get the same winner.

**The event window is pinned as absolute UTC** (v2.3.2031: 2026-08-28
16:00–18:00 UTC, i.e. 9–11am PDT) and rendered into whatever timezone the
viewer is in. The page is shared outside the team, and a hardcoded "09:00
local" would read as 9am to everyone regardless of where they are, quietly
selecting the wrong two hours of players. The panel prints the window back in
both UTC and the viewer's own zone, because the two readings of this event's
time were once given two hours apart (9am PDT is 16:00 UTC, not 14:00).

**Entry needs a minimum level** (v2.3.2032, default 5, editable on the page).
This is anti-Sybil, not elitism: identity here is deliberately cheap — a silent
passphrase per browser, no email, `?guest=1` mints another in the same tab — so
with presence alone as the qualification a fake entry costs about ten seconds
in an incognito window. Level cannot be faked (character level is the sum of
the three trained skill levels, all awarded server-side from damage actually
dealt, `prog3.js`). A fresh character is already level **3**, so level 5 is two
level-ups — measured at roughly **37–41 starter slimes** (~38 HP each,
XP = damage × 0.4, 560–605 XP needed), i.e. real minutes per throwaway account.

The threshold is an input rather than a constant because it has a real cost: a
genuine latecomer may not clear it. The page names everyone it excluded and
their level, so a shortened list never looks like a complete one.

`node tools/qa/draw-page.mjs` drives the page in a real browser with both the
leaderboard and the block explorers stubbed — no internet, no live worker
needed. 48 assertions. Every browser context is pinned to `Europe/London` on
purpose: run the suite in `America/Los_Angeles` and a page hardcoding "09:00
local" would pass everything. That pinning immediately caught a bug in the
suite itself, where fixture dates were formatted in node's timezone and parsed
in the browser's — an hour's drift that silently swapped one entrant for
another that should have been excluded. Both properties above were mutation-checked: reading
the forgeable field, or committing to the current tip instead of a future
block, each turns the suite red.

Not on the CI path (same as `deploy-page.mjs`) — run it when the page changes.

## `.claude/settings.json`

Holds the SessionStart hook wiring only. If you add settings, keep the
hook intact — it is how every future session learns the current tag
high-water before claiming one.
