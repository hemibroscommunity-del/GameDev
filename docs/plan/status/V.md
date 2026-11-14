card: V
branch: claude/plan-v-5-screens (PR 5; PRs 1-4: claude/plan-v-1 to -4)
prs: #1724, #1726, #1729 (merged), #1731 (ready), #1735 tag 5324 (ready)
state: ready

## Done
- #1724 (5320): §2, §1, §3 (`party.test` §13, deploys); the form; the counter.
- #1726 (5321): §216, §109; `lib/loadSrc.mjs`.
- #1729 (5322): §43 (`mirror-audit` §8f, deploys), §79, §222, §262.
- #1731 (5323): §29, §69, §136, §181, §169, §199, §230.
- PR 5 (5324): §52, §64, §77, §85, §134 (`traps-screens`). The row: 21.

## Next
- PR 6 (tag 5325): §93, §94, §95, §106, §119.

## Found
- §2: `ps.capeOff` (`server/src/eventcapes.js`) is not in `_saveRpg`'s list
  (`persistence.js`, card A's): a cape taken off is worn again after a rejoin.
- Card N's walker and wire table landed (sitting 5) after PRs 1-2 merged: §2
  walks `server/src/` itself, §1 reads `RELAY.TYPES` (see Needs).
- Need the page: §109's coach (`QuestCoach.jsx`); §222's landing; §64's
  other boxes; §134's other overlays (the level-up burst,
  `src/ui/LevelUpBurstStack.jsx`, is no body portal: unsure it is under a
  scrim today). §43's DPS ratio (`calcDisplayDps`): a node test could.
- §262: the card's line read as the trap's break, as TRAPS §262's rule says.
- §29: 120 label selectors in 66 files of `tools/qa/mp/` (card Y's).
- §136: `tools/qa/mp/mp-rollhit.mjs`, `mp-blockcost.mjs` (card Y).
- §181: `tools/lab/run.mjs`, `tools/qa/load/dobench/drive.mjs` (own workers,
  no route: harmless today). No card.
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
