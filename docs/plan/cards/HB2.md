# Card HB2: what holds the page, continued (card HB's next list)

**Tags:** 6280 to 6299 (block registered by the next gatekeeper's PR; do NOT edit tools/dev/tag-blocks.json). One a PR, in order.
**Start from:** card HB's card and status on main (`docs/plan/cards/HB.md`, `docs/plan/status/HB.md` "Next" and "Found"), and `docs/plan/census/HB-holds.md`. HB's #2188, #2199, #2201, #2202, #2209 are merged; `?afterpaint` (ON, row already in the switch table) exists from #2209.
**You hold:** `src/ui/BroTown.jsx`, `src/rendering/pixiRenderer.js`, `src/ui/**/QuestCoach.jsx`, `NavRail`/`OneBandColumns` files, `GearTab`, `p256.js` and the pack-page path, the panels/components and `src/game/*`/`src/networking/*` files a fix needs (NOT `src/networking/wsClient.js`: card RR holds it), `tools/qa/mp/held-budget.mjs` (LOWERING lines only, or listing with why). **Never edit:** `src/rendering/systems/entityRenderer.js`, `src/rendering/leaves/entity-*.js` and `src/rendering/systems/effectsRenderer.js` (card EN), `package.json`, `tools/guards/lib/switches.mjs`, `docs/SWITCHES.md`, `docs/TRAPS.md`, `server/*`, `.github/`, any `tools/qa/mp/mp-*.mjs` (card RR). Card WD2 moves player words in `src/ui/**/*.jsx`: it skips your files; before touching any other file, check no open `claude/*` branch changes it (`git diff --name-only origin/main...<branch>`); if one does, skip that item and list it.
**Browser:** heavy: `mp-heldsweep` (its own unminified build, docs/specs/held-sweep.md) under O2's slow profiles (hotel-laptop, budget-android), `mp-desksmooth`, `mp-phoneframe`, `playable`. ONE browser job at a time; reap after; helper sessions for repeat runs are allowed (orchestrator.md "More hands at once"). Sample first; tell me before any run over ~30 minutes.

## PRs, in order (one family a PR)
1. **(6280) The quest coach after the paint**, under the existing `?afterpaint` (no new row): QuestCoach.jsx's [view] layout effect (coachFollow > worldRect > mayorScreenRect; step > measure's reads; render's fixedBox): nothing measures the page inside a frame.
2. **(6281) The band's tap**: BroTown `resize()`'s visualViewport read; NavRail/OneBandColumns mount measures. Same switch.
3. **(6282) The taps**: rE > tapResourceAtClient > clientToCanvas. Same switch.
4. **(6283) ui:GearTab** (FX's find: 19.6 ms at lands/fight over its 12 ms line).
5. **(6284) pack-page**, the debt list's last row `ours` (GRAND-PLAN step 3.1): p256.js's reading path off the page's thread (a worker reading the file's own numbers, as stripRead.js does), now that FX's #2200 is on main.
Then any HB family left over its line in `HB-holds.md`, one a PR, worst first; stop after 10 PRs or when every HB family is under its line, and report.
Each PR: the family's before/after ms on the slow profile in the body; `held-budget.mjs` lines only fall; `playable` and `mp-membudget` green; precheck green.

## Readings chosen for you
- Nothing a player sees changes, except a bit drawn one frame (~16 ms) later under `?afterpaint` (decided for the owner, ON; `?afterpaint=0` the old place). Anything else a player would see is a question for me.
- A fix that brings a debt-list row under its own line also lowers that line. When pack-page is no longer `ours`, say so in the PR body (it closes step 3.1 for the gatekeeper to tick).
- `?lookidle` stays parked; the damage font is the owner's call: neither is this card's.
