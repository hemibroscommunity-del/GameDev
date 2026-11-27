card: UI2-feats
branch: claude/plan-ui2-16-feats
prs: Feats' draft PR (tag 6695; base claude/plan-ui2-13-ranks)
state: ready

## Done
- tag 6695 (the build's step 6, Feats): the landing (the page id `achievements`: AP the stat, the worker's total, a door to its two honest sources; Achievements "n of 33", Titles, Quest History, Lifetime Records); the four tiers as the medals (each its own, points by each row's own); a tier's gallery (earned full, the rest muted with a lock); a medal's page (facts; progress only where the game has a hint; "Title: <name>" when yours); AP's tree on the stat tree's page (featsAp0-2; no tree when the parts do not add up); Quest History (DonePane and questJournalList, called); Lifetime Records = the one Journey page, its cards from careerRows under the frame; Titles = Character's one TitlesPage (+ the worn title's how, + the one family as a row of three); the Bro strip's title entry removed (BRO_PROGRESS_ROADS.titles = bro:feats/titles).
- Rules src/game/feats.js; tools/guards/feats.test.mjs (F1-F17 and S1-S12; 26 plants red; mutation run 72 mutants, 70 killed, 2 equivalent); tools/guards/feats-mount.test.mjs (M1-M4, P1-P6 red); bro-hub.test B5 reads the Feats door; mp-ui2feats; moved: mp-ui2bro (strip four, Titles through Feats), mp-achievements (?ui2=0), mp-lazyfail (Feats' mark); states dash-bro-achievements (Feats now), ui2-feats-*; UI-DESIGN-NOTES "Feats".

## Next
- THE MEND OF SITTING 72's line (Feats not held; nothing of its own changed): the mended Life head 70410b40 merged in (it carries the mended Ranks d2502a3d and main 5ab943fe). Conflicts, both sides kept: broHub.js BRO_HUB_PAGES, dashDests.js FRAME_PAGES, BroCard.jsx's door calls, harness.mjs FEATS_OF and LIFE_OF, systems.mjs (both entries; SYSTEMS.md made again), UI-DESIGN-NOTES and the decision log; the ui2-bro pictures this branch's (drawn before Life came in). On the final code (the test box): precheck 0 FAIL; ui2feats 25/25 (two pictures redrawn).
- Nothing: the PR waits for the gatekeeper.  On its final code 779e30b8 (main 8f00c3c4 and Ranks' mended head e08554a2 merged; the test box): precheck OK; ui2feats 25/25, membudget 12/12 (no line raised), questline 187/187, lazyfail 7/7, ui2bro 25/26 (9, another player's face: not this card's).  Before the last merges: ui2combat 51/51, apchip 4/4, achievements 32/33 (9b, below).

## Found
- Duels Won and Deepest Zone (today's Journey page) have no writer anywhere: flagged for the owner, not drawn under the frame.
- server/test/achievements-client.test.mjs 7e pins PANELS.achievements' line: kept; Feats' landing is a FRAME_PAGES row instead (no head row under the frame).
- FRAME_PAGES' header words go through MenuGrid.jsx doorWord's literal switch (UI3-menus'): Feats' deeper pages are PANELS rows (as Ranks'), so no MenuGrid line.

- mp-achievements 9b (a super-rare's banner on a computer) stays red under ?ui2=0: B's page now opens there (9a green), and the banner did not come even with the page put away; left as found.
- mp-ui2bro 9 (another player's face), mp-achvtitle 4, mp-bropages, mp-brocard: red on this stack, outside this card.

## Needs
- Nothing.  (The orchestrator, part 31, said yes to Feats in the lazy Achievements script: two lines at the END of src/ui/lazyPanels.js and the re-exports in dash/AchievementsPanel.jsx.)
