card: V
branch: claude/plan-v-7-art-on-disk (PR 7; PRs 1-6: claude/plan-v-1 to -6)
prs: #1724-#1729 (merged), #1731, #1735, #1737 (ready), PR 7 tag 5326 (ready)
state: ready

## Done
- #1724 (5320) §2 §1 §3 (`party.test` §13, deploys); the form; the counter.
- #1726 (5321) §216 §109. #1729 (5322) §43 (`mirror-audit` §8f, deploys)
  §79 §222 §262. #1731 (5323) §29 §69 §136 §181 §169 §199 §230.
- #1735 (5324) §52 §64 §77 §85 §134. #1737 (5325) §93 §94 §95 §106 §119.
- PR 7 (5326) §27 §55 §56 §58 §255 (`traps-art-on-disk`). All 31 held:
  the scoreboard's row reads 31 (25 the rule, 6 one case), every break tried.

## Next
- Nothing: the card is done once the gatekeeper has merged its seven PRs.

## Left for the next card (the census's counts, as card V leaves them)
- 108 rows held for one case a node test could hold for the rule; 16 held by a
  phone scenario alone a node test could; 18 by precheck or a hand-run script
  alone. Card V's 6 one case: §27 §64 §93 §94 §109 §134 (the rest: Found).

## Found
- §2: `ps.capeOff` (`server/src/eventcapes.js`) is not in `_saveRpg`'s list
  (`persistence.js`, card A's): a cape taken off is worn again after a rejoin.
- Card N's walker and wire table landed (sitting 5) after PRs 1-2 merged: §2
  walks `server/src/` itself, §1 reads `RELAY.TYPES` (see Needs).
- Need the page or the art: §109's coach (`QuestCoach.jsx`); §222's landing;
  §64's other boxes; §134's other overlays (`src/ui/LevelUpBurstStack.jsx` is
  no body portal: unsure it is under a scrim); §93/§94 beyond the eye styles;
  §43's DPS ratio (`calcDisplayDps`): a node test could hold it.
- Stepped in, listed as known: §29 120 label selectors in 66 files of
  `tools/qa/mp/` (card Y); §136 `mp-rollhit.mjs`, `mp-blockcost.mjs` (card Y);
  §181 `tools/lab/run.mjs`, `tools/qa/load/dobench/drive.mjs` (harmless);
  §199 `/world/arena/`; §230 `tools/audio/cut_monster_noises.py`; §52 the
  trophies (`src/ui/mobile/dash/BoardRow.jsx`); §77 the dash's Feedback Send.
- §262: the card's line read as the trap's break, as TRAPS §262's rule says.

## Needs
- The owner: move §2 onto `server/test/src-walk.mjs` and §1 onto N's wire
  table in a PR of card V's (tag 5327) or leave it to the next card?
