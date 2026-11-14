card: V
branch: claude/plan-v-4-test-tools (PR 4; PRs 1-3: claude/plan-v-1-server-word, -2-join-identity, -3-fight)
prs: #1724 (ready), #1726 (ready), #1729 (ready), PR 4 tag 5323 (ready)
state: ready

## Done
- #1724 (5320): §2, §1, §3 (`party.test` §13, deploys); the form; the counter.
- #1726 (5321): §216, §109; `lib/loadSrc.mjs`.
- #1729 (5322): §43 (`mirror-audit` §8f, deploys), §79, §222, §262.
- PR 4 (5323): §29, §69, §136, §181, §169, §199, §230
  (`traps-test-tools`). The row counts 16.

## Next
- PR 5 (tag 5324): §52, §64, §77, §85, §134.

## Found
- §2 stepped in: `ps.capeOff` (`server/src/eventcapes.js`) is saved by
  `_saveRpgPaced` but not in `_saveRpg`'s list (`persistence.js`, card A's)
  nor read back at the join: a cape taken off is worn again after a rejoin.
- Card N's walker and wire table landed (sitting 5) after PRs 1-2 merged: §2
  walks `server/src/` itself, §1 reads `RELAY.TYPES` (see Needs).
- §109: the coach (`QuestCoach.jsx`) needs the page. §222: which arrow a
  sight lets go hits first needs the page. §43: the starting kit's DPS ratio
  (`calcDisplayDps`) is not held; a node test could.
- §262: the card's line read as the trap's break (the guard fails when
  `_wheelDungeonOpening` is in a hold), as TRAPS §262's rule says.
- §29: 120 label selectors in 66 files of `tools/qa/mp/` (card Y's), not 9:
  the trap's rule names `aria-label`, `title`, `text=` and `hasText` too.
- §136 stepped in: `tools/qa/mp/mp-rollhit.mjs`, `mp-blockcost.mjs` (card Y).
- §181 by the rule's letter: `tools/lab/run.mjs`, `tools/qa/load/dobench/
  drive.mjs` start their own workers without `--local-upstream` (no route in
  their wrangler.toml: harmless today). No card.
- §199 stepped in: `/world/arena/` (`src/data/arenaArt.js`, `?v=`) has no rule
  in `public/_headers`. No card. `/world/objects/` has none and no `?v=`.
- §230 stepped in: `tools/audio/cut_monster_noises.py` decodes with `-ac 1`.

## Needs
- The owner: move §2 onto `server/test/src-walk.mjs` and §1 onto N's wire
  table in a PR of card V's (tag 5327) or leave it to the next card?
