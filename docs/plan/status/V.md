card: V
branch: claude/plan-v-3-fight (PR 3; PR 1 claude/plan-v-1-server-word, PR 2 claude/plan-v-2-join-identity)
prs: #1724 (ready), #1726 (ready), PR 3 tag 5322 (ready)
state: ready

## Done
- #1724 (tag 5320): §2, §1 (`traps-server-word`), §3 (`party.test` §13,
  deploys); the line's form; the scoreboard's counter.
- #1726 (tag 5321): §216, §109 (`traps-join-identity`); `lib/loadSrc.mjs`.
- PR 3 (tag 5322): §43 (`mirror-audit.test` §8f, deploys), §79, §222, §262
  (`traps-fight`). The row counts 9.

## Next
- PR 4 (tag 5323): §29, §69, §136, §181, §169, §199, §230.

## Found
- §2 stepped in: `ps.capeOff` (`server/src/eventcapes.js` `_handleCapeEquip`)
  is "on the player's own blob" and saved by `_saveRpgPaced`, but not in
  `_saveRpg`'s list (`persistence.js`, card A's) nor read back at the join:
  a cape taken off is worn again after a rejoin. Known in the guard. No card.
- Card N's walker and wire table are not on `main`: §2 walks `server/src/`
  with `lib/codeOnly.mjs`, §1 reads `RELAY.TYPES`. Move onto N's.
- §109: the coach (`src/ui/mobile/QuestCoach.jsx`) needs the page: a browser
  test, or its gate moved into a `src/game/` module.
- §43: only the mirror is held; the starting kit's DPS ratio (`calcDisplayDps`,
  mp-orbline went with the old map) is not: a node test could hold it.
- §262: the card's line ("`_wheelDungeonOpening` is in the hold") read as the
  trap's break: the guard fails when it is in a hold (TRAPS §262's rule).
- §222: which arrow a sight lets go hits first needs the page.

## Needs
- Nothing.
