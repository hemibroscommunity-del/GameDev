card: V
branch: claude/plan-v-2-join-identity (PR 2; PR 1's is claude/plan-v-1-server-word)
prs: #1724 (ready), PR 2 tag 5321 (ready)
state: ready

## Done
- #1724 (tag 5320): §2 and §1 held by `tools/guards/traps-server-word.test.mjs`,
  §3 by `server/test/party.test.mjs` §13 (it deploys the worker); the line's
  form; the scoreboard's row counts 3, each with its break tried.
- PR 2 (tag 5321): §216 and §109 held by
  `tools/guards/traps-join-identity.test.mjs`; `lib/loadSrc.mjs` loads a page
  module in node. The row counts 5.

## Next
- PR 3 (tag 5322): §43, §79, §222, §262.

## Found
- §2 stepped in: `ps.capeOff` (`server/src/eventcapes.js` `_handleCapeEquip`)
  says it lives "on the player's own blob" and is saved by `_saveRpgPaced`,
  but `_saveRpg`'s list (`persistence.js`, card A's) has no `capeOff` and the
  join reads none back: a cape taken off is worn again after a rejoin.
  Listed as known in the guard. No card holds `eventcapes.js`.
- §2: card N's walker (`server/test/src-walk.mjs`) is not on `main`; the
  guard walks `server/src/` with `lib/codeOnly.mjs`. Move it onto N's.
- §1: card N's wire table is not on `main`; the guard reads `RELAY.TYPES`.
- §109: the coach (`src/ui/mobile/QuestCoach.jsx`, three reads of
  `_rpgFromServer`) needs the page: only a browser test holds it, or its
  gate moved into a `src/game/` module a node test can load.

## Needs
- Nothing.
