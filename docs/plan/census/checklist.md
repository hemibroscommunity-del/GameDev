# CLAUDE.md §8, each row and its test (card U2, tag 5783; grand plan step 6.1)

Each row of CLAUDE.md's same-change checklist, the test GitHub runs that
fails the row's mistake, and that test's break proof: the one-line change
that turned it red, tried once by hand and undone.

- **Covered rows (an older suite):** each break was tried on 2026-11-17 in a
  scratch copy of `main` (`b023c4f7`) and never committed. It is written
  here, not in the suite's header, because a header edit under
  `server/test/` deploys the worker (TRAPS §277).
- **Rows held by U2's guards (PRs 2 and 3: #2074, #2082):** each guard
  carries its break proof in its own header (`tools/guards/<name>.test.mjs`),
  and this file names it.

A check that runs only in precheck is not counted as a test (the plan's
rule 1): a guard is.

## The rows

| # | Row | Test(s) | Break proof (the change -> what failed) | Its break proof is run |
|---|---|---|---|---|
| 1 | an animation or sprite | `preload-census` (U2); the pose, `mp-ghostaudit` (a phone scenario, by hand) | `preloadAnimations.js`: `traits: preloadTraits(),` as `traits: null,` -> FAIL 1 (34 > 31). In its header. | by hand, last on 2026-11-17 |
| 2 | a message the server sends | `wire-audit`, `wire-table` | a function in `chatmod.js` doing `this._send(ws, { type: 'zz_probe_out' })` -> `wire-audit` FAIL ("every server-emitted type is in PRIVILEGED_EVENTS"). `wire-table` alone did not see this one; its own header's breaks hold the table's form. | by hand, last on 2026-11-17 |
| 3 | a relay a phone sends | `action-door`, `wire-table` | `actions.js`: a row `zz_relay: A('priority'),` with no row in the wire table -> `action-door` FAIL 1 (`zz_relay`). `wire-table` did not see it; it fails a relay row renamed (`trade_accept` as `trade_acceptx` in `wire/relays.js` -> FAIL 9). | by hand, last on 2026-11-17 |
| 4 | a request the page makes | `action-door` | `chat.js`: `S.channel.send({ type: 'zz_probe' })` -> FAIL 2 (`zz_probe`). | by hand, last on 2026-11-17 |
| 5 | a server behaviour | `cap-gates` (U2), `caps-audit`, `liveops` §8e | `DevPanel.jsx`: `'charLock', ` taken out of `CAP_GATES` -> `cap-gates` FAIL 1. In its header. | by hand, last on 2026-11-17 |
| 6 | a `?name=` or a live flag | `switches` | `chat.js`: `new URLSearchParams(location.search).get('zzprobe')` -> FAIL 1 (`?zzprobe` unlisted). | **by a guard**: `switches` check 9 plays the same shape (fixture P2, `new URLSearchParams(location.search).get(...)`) every run |
| 7 | a storage key | `storage-keys` (U2), `storage-marks`, `restore` | `farm.js`: `storage.put('farm:'` as `storage.put('zzfarm:'` -> `storage-keys` FAIL 1. In its header. | by hand, last on 2026-11-17 |
| 8 | a monster hit on players | `hit-door` | a function in `chatmod.js` calling `this._applyDamage(ps, 1, false)` -> FAIL 10d (`chatmod.js` a new caller). | by hand, last on 2026-11-17 |
| 9 | gold | `gold-door` | `chatmod.js`: `ps.coins = 5;` -> FAIL 2. | by hand, last on 2026-11-17 |
| 10 | a bag count, a stash, hp, leaving | `bag-door`, `stash-door`, `life-door`, `session-door` | in `chatmod.js`, one at a time: `ps.inventory[x] = 1;` -> `bag-door` FAIL 2; `ps.weaponStash.push(x);` -> `stash-door` FAIL 2; `ps.hp = 1;` -> `life-door` FAIL 2; `this.sessions.delete(ws);` -> `session-door` FAIL 3. | **by a guard** for the stash (`stash-door` check 2 plays `ps.weaponStash.push(w)` every run); the bag, hp and leaving by hand, last on 2026-11-17 |
| 11 | build points | `skillpoints-door` | `chatmod.js`: `p3.pool = 1;` -> FAIL 2. | by hand, last on 2026-11-17 |
| 12 | a quest's state | `quest-door` | `chatmod.js`: `ps._quests[q] = 'active';` -> FAIL 2. | **by a guard**: `quest-door` check 2 plays `ps._quests[id] = 'active';` every run |
| 13 | experience or a level | `xp-door` | `chatmod.js`: `s.xp = (s.xp \|\| 0) + 1;` -> FAIL 2. | **by a guard**: `xp-door` check 2 plays `s.xp = (s.xp || 0) + n;` every run |
| 14 | an honesty check | `test-mode` §8 | `chatmod.js`: `if (this._testMode(ps)) return;` -> FAIL 8 (an unlisted file asks). | by hand, last on 2026-11-17 |
| 15 | a refusal in the hit test | **none: by hand** | Cannot (below). | none (no test) |
| 16 | a field on the tick | `tick-share` | `tick.js` buildFor: `const d = { type: 'tick', seq, ts };` with `zz: 1` added (one builder only) -> FAIL 1a (not byte for byte). | by hand, last on 2026-11-17 |
| 17 | a sound | `sound-cues` §12 (the label), `sound-credits` (U2, the row) | `CREDITS.md`: the music row's `village` taken out (both places) -> `sound-credits` FAIL 1. In its header. | by hand, last on 2026-11-17 |
| 18 | a screen or window | `screens-listed` (U2), `desk-keys` | the login door's `Screens:` line without `login-door` -> FAIL 1; `ShopkeeperPanel.jsx`'s ✕ without `data-esc` -> FAIL 2. In its header. | by hand, last on 2026-11-17 |
| 19 | a phone test | `old-map` (precheck and the harness), `scenario-lanes`, `phone-test-wide` (U2) | `mp-deskwide.mjs`: its `wide: true` taken out -> `phone-test-wide` FAIL 1. In its header. | by hand, last on 2026-11-17 |
| 20 | a picture made on a canvas | `canvas-pictures` (U2) | `hairColorCatalog.js`: its `keepAsImage(t.source, Cache)` taken out -> FAIL 1 (51 > 50). In its header. | by hand, last on 2026-11-17 |
| 21 | art that loads as you walk | `strip-door` | `wheelGround.js`: `export const zzNums = (d) => numbersOf(d);` (a new caller of a page packer) -> FAIL 5. | by hand, last on 2026-11-17 |
| 22 | a stored look key | `look-keys` (U2) | `characterRecord.js`: `LOOK_BLANK`'s `hw: 'none', ` taken out -> FAIL 2. In its header. | by hand, last on 2026-11-17 |
| 23 | a domain players use | **none: by hand** | Cannot (below). `origin` holds the list itself. | none (no test) |
| 24 | the Wheel's plan or objects | `wheel-bakes` (U2) | `plan.js`: the Blacksmith's `name` one letter changed -> FAIL 1 and 2. In its header. | by hand, last on 2026-11-17 |
| 25 | more for the memory check | `mp-membudget` (a phone scenario GitHub runs on every PR) | **Not tried here**: it needs a browser and a built page, and this card has none. Its lines are `tools/qa/mp/memory-budget.mjs`; the rule "never raise one silently" is the PR's words, read by the gatekeeper. | by hand, **never tried** (a browser and a built page) |
| 26 | a bake, a load in play, a timer's redraw | **none: by hand** (`hold-names` and `budgets` hold the tables) | Cannot (below). | none (no test) |
| 27 | a server-only number a copier would value | **none: by hand** (`hidden-settings` holds the table) | Cannot (below). | none (no test) |

**Covered by a test:** 23 rows. Row 25's break was not tried here.
**Its break proof run** (v2.3.6525, card WL PR 6: paper marked as paper):
a guard plays the row's break every run for rows 6, 12, 13 and the stash of
row 10 (the shape is a fixture inside the guard: a scanner that stopped
seeing it fails there). Every other break was tried once, by hand, last on
2026-11-17, and undone: a guard that has since stopped catching it would
stay green until someone tries it again. Row 25's was never tried.
**Cannot:** 4 rows.

## The four that cannot, and why

- **15. A refusal in the hit test, the same in the bow's sight gate.** The
  sight gate (`src/rendering/projectiles.js`) does not load in node. Its
  refusals are geometry. Its two phone tests went with the old map. A
  phone scenario on the Wheel could hold it: a Found for a card with a
  browser (`docs/plan/status/U2.md`).
- **23. A domain players use, in `ORIGINS`.** The domains players use live
  outside the repository (Cloudflare and the owner's DNS). `origin` holds
  that the list refuses every other site. No test can know which new
  domain a player will use.
- **26. A bake, a load in play, or a timer's redraw, off the page's thread.**
  What holds the page is measured by `mp-heldsweep`, a browser sweep of
  hours, run by hand and sampled (CLAUDE.md §6). `hold-names` and `budgets`
  hold the names and the lines, not the holds.
- **27. A server-only number a copier would value.** Which number a copier
  would value is a judgment. `hidden-settings` holds the table and its
  placeholders, not what belongs in it.

## What the breaks found

- **Row 2 and row 3: `wire-table` alone does not fail them.** It holds the
  table's own form. The row's mistake (a sent type with no `out` row, a
  page relay with no table row) is failed by `wire-audit` and
  `action-door`, so §8 names those first.
- **The census guards (rows 1, 17, 18, 19, 20) fail a NEW mistake.** What
  is already out of line on `main` is listed in their `*Known.mjs` files:
  - 31 loads not reached from the loading screen;
  - `wind-dunes.mp3` with no CREDITS row;
  - 18 ✕ buttons Esc does not press;
  - 81 phone-test calls naming no screen;
  - 50 canvas pictures with no memory helper near them.

  Each count only falls (the plan's rule 3).
