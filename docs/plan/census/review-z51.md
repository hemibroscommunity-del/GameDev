# The gatekeeper's review, sitting 51 (card Z; tag 6265)

Taken 2026-11-18 on `main` 7569a0c0 (sitting 50 fully merged; its deploy
green). The cards running came from the planning session
(session_01LccHaivkofvyigGL4fgBWZ); the heads from each card's own message
to this sitting (session_01LccHakf5J8KwtUDPncuTxD), checked against GitHub.
The list was kept open while PRs turned ready (17:53 to about 19:50 UTC).
Tags bare.

## What was open

| card | PR | tag | head | state on GitHub |
|---|---|---|---|---|
| SB | #2228 the ride measured | 6380 | 19b7fb25 | ready, every check green |
| WD3 | #2227 the words guard's mends | 6340 | 1cffc12a | ready, every check green; DEPLOYS (server/test) |
| HB2 | #2224 the quest coach after the paint | 6280 | 0d0faa25 | every check green; DRAFT_NOTE |
| LR | #2226 the layout-reads guard | 6360 | 81121cd1 | ready; TEST_NOTE |
| WD3 | #2229 to #2233 (6341 to 6345) | | | drafts, CI running: next sitting |
| EN | #2234 (canvas pictures) | | 57c8d0fb | draft: next sitting |

## Step 3: each against its card

- **SB #2228**: files the card's (mp-heldsweep's `ride` station and the
  asked-only `ridewalk`, held-budget `STATION_LINES.ride` = 12 with its
  why, `census/SB-ride.md`, card, status); no game file; done when met
  (the holds over the line on budget-android and hotel-laptop resolved to
  file:function, owners named, the walk compared). Mend sent (no hold):
  `RING_R = 2200` is a Wheel distance written into a test (CLAUDE.md §1:
  QA reads `H.wheelGeom()`); take it from the geometry.
- **WD3 #2227**: files the card's (say.js's header, say.test, desk-words
  5b, LoginScreen's comment, card, status); sitting 50's five mends each
  done with a break proof: §7 now cuts every say()/sayPieces() call into
  its arguments (a key not single-quoted or a ternary of them fails; `SAY
  as X` and several tables read), §6's dead "key in two files" gone and a
  key written twice in one table read from the source, a new §8 (each
  `{name}` a row asks for passed, no part unused), the stale U+2022
  comment, desk-words 5b reading the Pets row itself. `src/` changes are
  comments only. `server/test/desk-words` re-pointed as WD2's standing
  answer allows: **DEPLOYS**.
- **HB2 #2224**: files the card's (QuestCoach.jsx, mayorScreen.js,
  doorPrompt.js, a new afterPaint.js: the switch's one reader); tag 6280;
  under the existing `?afterpaint`, no new row.
- **LR #2226**: files the card's (the guard, its two lib files, card,
  status); precheck needs no line (a tools/guards file runs by itself);
  about a second; break proofs in its body and replayed every run.

## Step 4: the review (`/repo-review`), #2224 (the one PR changing `src/` code)

No `server/src`, wire, storage or economy: angles A, B, C, D, E and G are
clean by inspection. F (removed behaviour) and the page's thread:

- The render's page reads (fixedBox, the computed `--sheet-h`/`--dash-h`/
  `--world-x`/`--play-w`, the keys strip, the combat band's reach, the
  card's height, the quest card's and the map button's rects) are now one
  `readCoachPage()`; each old use reads its field, the fallbacks kept
  (`|| 72`, the `err` path returning 0 as the old `catch` did). Under
  `?afterpaint=0` the render reads it in place, as before.
- The walk (`step > measure`, `live > canvasBox`) runs at the top of the
  game's next frame (`beforeDraw`, its 500 ms fallback when no frame
  comes); the gesture watchers still run every frame; a `walkAsked` flag
  keeps one walk waiting. The deferred `walk` closes over nothing of
  `step`'s (eslint `no-undef` clean on the branch's file).
- `canvasBox` hands back an old box and measures again at the frame's top;
  the very first box, or a replaced canvas, is still measured where asked.
  The window's size is kept with the box (`vw`, `vh`).
- `doneRef` no longer reads localStorage and the shared cookie on every
  render (`loadDone` never returns null, so the guard reads once).
- The re-read after every draw (`askPage`) draws again only when the
  reading changed (`samePage`, half a pixel), once a frame however many
  draws; the step right of the quest card lands a frame later, as the
  card's reading allows.
- One difference, harmless: under `?afterpaint` the coach's world lessons
  take the canvas `mayorScreen.js` finds (`canvas.brotown-canvas` first),
  where the old code took the page's first `<canvas>`.

**No finding.**

## The guard meets the coach (#2224 with #2226)

As first pushed (a38f55b4), #2226 merged with #2224 failed its own check
1: #2224 moves the coach's reads into new functions (`readCoachPage`,
`deskStepRight`, `_measureBox`: about 20 reads "new"). The planning
session decided: the guard counts a read at the top of the game's frame
(a function handed to framePacer `beforeDraw`, a function of its file one
calls by name, and what is inside them) as an approved way, and HB2 adds
no rows. LR's 81121cd1 does it: main alone 365 / 365; main + #2224 +
#2226: 337 listed, 16 at the frame's top, green; its break proof red when
`readCoachPage` is taken out of the callback. Left for LR's PR 2 (after
#2224 lands): `--write` (the 6 QuestCoach rows that fell, the line 365 ->
337), and printing each frame-top function its file also calls elsewhere
(`readCoachPage`'s first draw and `=0` path run in the render): LR chose
to report it every run rather than fail it.

## Step 5b: what GitHub will merge

Every PR's base is `main`. From `main` 7569a0c0, merging each with a merge
commit in the list's order, every branch had ONE merge base with the
`main` above it, and none conflicted (the tree b4500ac7).

## Step 5: the rehearsal

REHEARSAL

## The deploys

Only #2227 changes `server/**` (`server/test/desk-words`): one deploy, of
the same worker code.

## The old drafts

#1870, #1869, #1867, #1415 and #1211, listed at sitting 50 for the owner,
are closed on GitHub (closed 2026-11-18 about 17:00 UTC): nothing to list.
