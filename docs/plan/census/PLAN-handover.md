# The planning session's handover, part 7 to part 8 (2026-11-18)

The short form is docs/plan/status/PLAN.md on branch claude/plan-planning-handover.


The owner starts part 8 as a FRESH session from the app (not a child: part 7
was depth 7 of 8). Part 8 is the orchestrator (docs/plan/orchestrator.md) and
the planning session: read CLAUDE.md, docs/plan/README.md,
docs/plan/orchestrator.md, docs/plan/cards/Z.md, docs/GRAND-PLAN.md part 11,
then this file. First: send each running card your session id ("The planning
session is now <id>; send your one-line updates and questions here").

## Standing authority (the owner's words)
"When lanes are done you can do the recommended next steps, including pushing
them to main." "keep going autonomously with your recommendations." "If
there's a way to speed this up I don't care much if it costs more usage as
long as you're using it efficiently." 2026-11-17 "Go recommended on all".
2026-11-18 "Go recommended for anything waiting on me" (decide by
recommendation, behind a switch, list under "Decided for the owner").
"as many concurrent efficient sessions and lanes as possible where work won't
be duplicated." "Start new orchestrator sessions when the context window
becomes too expensive" (~350k tokens, at a clean point after a merge).
2026-11-18 ~14:00: "Resume the new ones lift the hold" (the 7-day usage hold
is LIFTED; the account still shows a 7-day warning).
2026-11-18 ~17:10, on the skateboard's "grainy" freezes: "Yes do that" (card SB).
Part 7 advised the owner: let the running cards finish, then STOP starting new
cleanup cards (words, guards); prefer things the owner feels, the Cloudflare
spend cap, and getting real players. The owner did not object.
NEVER YOURS: .github/, server/wrangler.toml, a deploy from a branch, Cloudflare
settings, permissions, anything irreversible.

## State
- Main 1cd3fced (sitting 51 fully merged: 22 PRs + its docs PR #2250, tag 6265).
  Deploys: runs 44381829545 (10356e5) and 44382339345 (a756a51) were running at handover; check
  gh api repos/hemibroscommunity-del/gamedev/actions/workflows/deploy-worker.yml/runs
  (cancelled = superseded, normal); tell the owner only a failure.
- READY for sitting 52: RR #2251 (6300, reds census, docs only, no `test` runs: path-filtered), head 2a8875d8de0e10ceab0c11ea23aa50b3c3aa1804; LR 6362 re-freeze (coming).
- No gatekeeper running. Start sitting 52 (standard prompt, claude-opus-5-5,
  effort high) when a batch is ready; tell it to KEEP THE LIST OPEN ~2 h
  (sitting 49 closed with only its docs PR).

## Running cards (all report to the planning session)
- HB2 session_01LccHajithwX74McCZq8Qrv (6280-6299): #2224 merged. #2244 (6281
  band tap), #2247 (6282 taps), #2249 (6283 GearTab, still 14.9 over 12) must
  merge main (3 screens clash with WD3's words: keep both) then go to sitting 52.
  Then PR 5 p256 (6284; does NOT close 3.1), then `other: R > J` (closes 3.1),
  then SB's ride rows (deskTeach/questRoute 27.5, loadTeach 22.1, band redraws
  18.3) and LR's busiest files (BroTown 40, QuestCoach 36, WorldMap 29).
  Holds BroTown.jsx, pixiRenderer.js, QuestCoach, NavRail/OneBandColumns,
  GearTab, p256.js; asks before any other src/ui file.
- SB session_01LccHajQLjgmnWGcz5hpucD (6380-6399): the skateboard. #2228 merged
  (ride station, docs/plan/census/SB-ride.md). 6381 atlasrow PARKED (0.3 ms,
  no PR). 6382 `?groundsend` (pop-ins 88%->26% plain, 100%->48% budget-android;
  riding +3.4 MB, under the on-foot peak: APPROVED, with a ride memory line).
  Then stripRead.js worker restart and framePack.js _pack. Holds wheelGround.js,
  paletteTex.js, mp-heldsweep's ride station. Ground worker files
  (public/tools/world/core/ground-worker.js, wheelTrial.js) only if it asks.
- RR session_01LccHamvXzXosfQ1eZn6X4E (6300-6319): reds on main (sample census
  ~48 scenarios; the full 388 sweep is an owner choice), then slow checks
  (precheck 5-min server-tests cap, gatekeeper.mjs 15-min cap, run.mjs orphans),
  6301 mp-mayordoor (H.keepAlive) five runs under way; then wsClient.js _aliveTimer rejoin loop + _flushOutbox 23.6 ms. Known reds:
  mp-mayordoor 2-3, mp-geartab sideways, mp-brocard 4 parts, mp-firststeps 6;
  state-census --check red on main (EN's find). Holds tools/qa/mp/* (not
  mp-heldsweep's ride station), precheck.mjs, gatekeeper.mjs, wsClient.js.
- EN session_01LccHahZgmV4QshEgr7Xoby (6200-6219): #2234 merged. Next PRs 5-8
  (6204-6207: HB's rows 37/23/33/frame; mend _keepQueue cap in 6204). Holds
  entityRenderer.js, leaves/entity-*, playerSkins.js.
- LR session_01LccHamEjrPhJsfz2mmcgoW (6360-6379): #2226, #2245 merged
  (layout-reads guard + spec + CLAUDE.md §7/§8 lines). Last: the --write
  re-freeze 365->337 (6362); then done, archive.
DONE this part (archived): RD, HB, WD2, WD3 (status file on main still says working: the gatekeeper marks it done), Z48-Z51. WD3 left ~3,100 words
in place (W1 631 in 91 screens, W2-W6): no WD4 (cleanup; part 7's advice).

## Answers given (keep consistent)
Switch rows: one per PR, for a memory saver or decided trial, merging main
right before sending the head. LR's guard: reads inside the after-paint path
(afterpaint helper, framePacer beforeDraw callbacks, their same-file callees)
are approved; HB2 adds no rows. WD2/WD3: server/test text checks may be
re-pointed to src/data/say (DEPLOYS); NOT_SHOWN/DEV_FILES in words-census.
EN may regenerate src/state/render.js (state-census --ledger render --write).

## Decided for the owner while away (cumulative; give the list when asked)
This part: botscoresave ON; EN folksheets ON; FX buffers 24.2->24.8 (net
-1.7 MB); HB afterpaint ON (?afterpaint=0); SB groundsend ON (?groundsend=0,
riding +~3.4 MB under the on-foot peak); SB atlasrow parked; computer-only
"Tap"->"Click" in the controls tour (12 rows, CLAUDE.md deskWords law).
Earlier: see docs/plan/README.md / past sittings' census files.

## Owner's open items (theirs; never decide)
Cloudflare spend cap / rate limit (the BIGGEST risk; offered to walk them
through); www redirect; EDGE_GUARD/EDGE_CACHE/BODY_CAP; .github/ (lab token,
CODEOWNERS, pinned actions, crash-report ADMIN_KEY); wind-dunes.mp3 source;
SEC2's report form needs a public repo; scheduled tasks; damage font pages
(9.3 MB); sound at 24 kHz; K2 sprintmark OFF; Q (the watch) held; old draft
PRs #1870 #1869 #1867 #1415 #1211 (list, never close); the full 388-scenario
red sweep; Cloudflare's new `cf` CLI: advised ignore until 1.0 / Wrangler
deprecation (touches .github/ and wrangler.toml).

## What the owner asked about this part (context)
- Plan progress: 41 of 57 pre-players steps done (~72%); 7 wait on real data.
- Scale: one room is smooth to ~110-145 players; thousands needs
  docs/SERVER-SPLIT-PLAN.md (~$245/month est. at 1,000), not in the grand plan.
- Freezes' root cause: measuring the page mid-update (layout reads); LR's
  guard now refuses new ones.
