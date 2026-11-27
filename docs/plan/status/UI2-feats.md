card: UI2-feats
branch: claude/plan-ui2-16-feats
prs: Feats' draft PR (tag 6695; base claude/plan-ui2-13-ranks)
state: working

## Done
- tag 6695 (the build's step 6, Feats): the landing (the page id `achievements`: AP the stat, the worker's total, a door to its two honest sources; Achievements "n of 33", Titles, Quest History, Lifetime Records); the four tiers as the medals (each its own, points by each row's own); a tier's gallery (earned full, the rest muted with a lock); a medal's page (facts; progress only where the game has a hint; "Title: <name>" when yours); AP's tree on the stat tree's page (featsAp0-2; no tree when the parts do not add up); Quest History (DonePane and questJournalList, called); Lifetime Records = the one Journey page, its cards from careerRows under the frame; Titles = Character's one TitlesPage (+ the worn title's how, + the one family as a row of three); the Bro strip's title entry removed (BRO_PROGRESS_ROADS.titles = bro:feats/titles).
- Rules src/game/feats.js; tools/guards/feats.test.mjs (F1-F17 and S1-S12; 26 plants red; mutation run 72 mutants, 70 killed, 2 equivalent); tools/guards/feats-mount.test.mjs (M1-M4, P1-P6 red); bro-hub.test B5 reads the Feats door; mp-ui2feats; moved: mp-ui2bro (strip four, Titles through Feats), mp-achievements (?ui2=0), mp-lazyfail (Feats' mark); states dash-bro-achievements (Feats now), ui2-feats-*; UI-DESIGN-NOTES "Feats".

## Next
- The final phone runs on the final code (a helper), the merge of the base and main, one push, the draft PR, the message to the orchestrator.

## Found
- Duels Won and Deepest Zone (today's Journey page) have no writer anywhere: flagged for the owner, not drawn under the frame.
- server/test/achievements-client.test.mjs 7e pins PANELS.achievements' line: kept; Feats' landing is a FRAME_PAGES row instead (no head row under the frame).
- FRAME_PAGES' header words go through MenuGrid.jsx doorWord's literal switch (UI3-menus'): Feats' deeper pages are PANELS rows (as Ranks'), so no MenuGrid line.

## Needs
- The orchestrator's yes on two lines in src/ui/lazyPanels.js and the lines in dash/AchievementsPanel.jsx (Feats in the lazy Achievements script): asked, built meanwhile.
