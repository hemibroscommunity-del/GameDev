# The gatekeeper's review, sitting 48 (card Z; tag 6262)

Taken 2026-11-18 on `main` 586b0a7b (sitting 47's list fully merged; the
deploy of 0965fe0 green). The PRs and heads came from the planning session
(session_01LccHaivkofvyigGL4fgBWZ) and the cards' own messages. Tags bare.

Reviews in full (`server/` or `src/`), by the angles of `/repo-review`:
EN #2207, HB #2209. Tests only (step 3, and run on the merged tree): RD
#2208.

## Heads and trees

| # | card, tag | head | base | merge base at its step |
|---|---|---|---|---|
| 2208 | RD, 6181 | 67b70d74 | `main` | 586b0a7b (one) |
| 2207 | EN, 6202 | a5bcb744 | `main` | 586b0a7b (one) |
| 2209 | HB, 6244 | 456c10f7 | `main` | e765c3ba (one, at every step) |

Merged in that order on 586b0a7b: clean (EN's and HB's switch rows in
`switches.js`, `switches.mjs` and `SWITCHES.md` meet, auto-merged).

## The rehearsal

- `tools/dev/gatekeeper.mjs` RD EN: build PASS, `questline` PASS;
  precheck FAIL as "900 s, timed out or killed": the tool's own cap
  (Z47's Found), not a branch's red.
- By hand, RD + EN + HB on 586b0a7b (merge 135c74f9): RESULT_PRECHECK;
  `npm run build` RESULT_BUILD; `questline` RESULT_QUEST.

## Findings

### RD #2208 (6181, `mp-crowdfight`): none blocking

- Test and status only. A step is a skip only when the page measurably
  could not play it (a one-line read of 3 s or more, or a rejoin or a
  new socket about every 20 s through the 240 s wait), or when a step
  ran past 15 minutes; every other step must know 90% of its bots, and
  the check needs one played step or a named stall. Not a skip to get
  green: the card's "a check that tests what the game no longer
  promises" does not apply, the promise is unchanged, the box's pace is
  named (TRAPS §200). Five runs green (RD and four helpers).
- Its cause is the page's: `wsClient.js` `_aliveTimer` rejoins on each
  frame gap over 5 s (`RESYNC_AWAY_MS`), so a device drawing under one
  frame per 5 s rejoins forever. A game question (TRAPS §305): Found.

### EN #2207 (6202, `?folksheets`, ON): none blocking

- Only the chip copies go (`TextureSource.unload`, Pixi re-uploads at
  the next draw); the baked pictures stay, so nothing loads in play
  (PRELOADING IS LAW). `bodyKeysAsked` runs `prewarmFolkBodies` with
  `getBodyFrame` answering the key before any bake (same key, one
  spelling); its `.then(folkSkillPrepare)` is a memoised promise, so a
  let-go starts no load. Nobody measured (a dungeon) holds. A folk key
  equal to the player's own look would be sent up again at its next
  draw: a one-off upload, no wrong picture.
- `gpu` LOWERED 114.3 -> 109.3 in `memory-budget.mjs` and `framePacer.js`
  `MEM_LINES` together (frame-pacer 23a). `heap` at its edge on main, as
  with the switch thrown (Found, carried).
- DEPLOYS: `server/test/folk-sheets.test.mjs` (no server code).
- Low: the comments in `entity-townsfolk.js` and `entityRenderer.js` name
  `tools/guards/folk-sheets.test.mjs`; the suite is in `server/test/`.

### HB #2209 (6244, `?afterpaint`, ON): none blocking

- `placeOverHead` moved verbatim to `src/ui/doorPrompt.js` (BroTown.jsx
  only falls) and now places the prompt at the top of the next frame,
  once a frame however many commits (`el.__btPlaceRaf`); hidden on its
  first frame only, so never a frame at the wrong place. No head point,
  or a throw: shown at the CSS place, as before. A removed node is let
  go. `?afterpaint=0` places it in the commit. `mp-afterpaint` plays
  both (world `wheel`, lane `full`).
- A player sees the prompt one frame later than before (decided for the
  owner while away, ON).

## Status files

RD's, EN's and HB's status files on their heads still say `working` /
`draft` (written before CI went green); each session marked its PR
ready and said so by message. Not a hold: each corrects the line in its
next push.
