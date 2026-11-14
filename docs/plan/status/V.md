card: V
branch: claude/plan-v-6-look-tables (PR 6; PRs 1-5: claude/plan-v-1 to -5)
prs: #1724-#1729 (merged), #1731, #1735 (ready), #1737 tag 5325 (ready)
state: ready

## Done
- #1724 (5320): §2, §1, §3 (`party.test` §13, deploys); the form; the counter.
- #1726 (5321): §216, §109; `lib/loadSrc.mjs`.
- #1729 (5322): §43 (`mirror-audit` §8f, deploys), §79, §222, §262.
- #1731 (5323): §29, §69, §136, §181, §169, §199, §230.
- #1735 (5324): §52, §64, §77, §85, §134.
- PR 6 (5325): §93, §94, §95, §106, §119 (`traps-look-tables`). The row: 26.

## Next
- PR 7 (tag 5326): §27, §55, §56, §58, §255; then `state: ready`, and stop.

## Found
- §2: `ps.capeOff` (`server/src/eventcapes.js`) is not in `_saveRpg`'s list
  (`persistence.js`, card A's): a cape taken off is worn again after a rejoin.
- Card N's walker and wire table landed (sitting 5) after PRs 1-2 merged: §2
  walks `server/src/` itself, §1 reads `RELAY.TYPES` (see Needs).
- Need the page or the art: §109's coach (`QuestCoach.jsx`); §222's landing;
  §64's other boxes; §134's other overlays (`src/ui/LevelUpBurstStack.jsx` is
  no body portal: unsure it is under a scrim); §93/§94 beyond the eye styles.
  §43's DPS ratio (`calcDisplayDps`): a node test could hold it.
- §262: the card's line read as the trap's break, as TRAPS §262's rule says.
- §29: 120 label selectors in 66 files of `tools/qa/mp/` (card Y's).
- §136: `tools/qa/mp/mp-rollhit.mjs`, `mp-blockcost.mjs` (card Y).
- §181: `tools/lab/run.mjs`, `tools/qa/load/dobench/drive.mjs` (harmless).
- §199: `/world/arena/` (`src/data/arenaArt.js`) has no `_headers` rule.
- §230: `tools/audio/cut_monster_noises.py` decodes with `-ac 1`. No card.
- §52: the leaderboards' trophies (`src/ui/mobile/dash/BoardRow.jsx`) mask
  their shine with their own picture (`--rank-art`): each downloads twice.
- §77: the dash's Feedback Send (`src/ui/mobile/dash/FeedbackPanel.jsx`)
  waits on a fetch with no timeout, its button disabled; 21 window and dash
  fetches have none (a census).

## Needs
- The owner: move §2 onto `server/test/src-walk.mjs` and §1 onto N's wire
  table in a PR of card V's (tag 5327) or leave it to the next card?
