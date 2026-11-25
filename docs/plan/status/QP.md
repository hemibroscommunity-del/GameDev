card: QP
branch: claude/plan-qp-1-pages
prs: (part 1, the one PR: opened as a draft on this push)
state: ready

## Done
- Part 1 (tag 6620): the Quests tab in three pages (quest, journey, rewards and what is next), each whole at 390 x 844 and 375 x 667; rules `src/game/questPages.js` (one field `view`, one transition) with `server/test/quest-pages.test.mjs` (258 mutants, all killed); pages `src/ui/mobile/dash/QuestPages.jsx`; shared parts `questParts.jsx`; `?questpages=0` the old page; `mp-questpages`; mp-questjournal plays the old page behind the switch, mp-trackquest opens the picker; UI-DESIGN-NOTES "The quest log" rewritten; states.mjs; tag block QP 6620-6639 (nextBlock 6640).

## Next
- Nothing: the card's one PR is up. Waits for the gatekeeper.

## Found
- Sideways the band is about 82 px tall (today's height), so no page is whole there: the head and tabs share a row and the whole scrolls, as the old page did (the PR's pictures).
- `tools/dev/tag-blocks.json`: card BRO's block 6600-6619 is not on main yet; this PR adds QP's after it and sets nextBlock 6640. When BRO lands, the merge keeps both rows.

## Needs
- Nothing.
