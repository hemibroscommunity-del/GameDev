card: UI2-ranks
branch: claude/plan-ui2-13-ranks
prs: Ranks' draft PR (tag 6692; base claude/plan-ui2-11-quests)
state: working

## Done
- tag 6692 (the build's step 6, Ranks): the landing (Combat, Life Skills, Feats), a group's boards, Points placed, a board's standings (Rank | Player | the unit; medals only on 1-3, the same surface; your row marked wherever it stands and pinned only while out of view; "Not ranked on this board"; the kit's placeholder while loading), another player's Character from the board's row only ("Not shared" lines, nothing to press), your own row to Bro, Back to the same board and scroll. Rules `ranksGroups`, `ranksBoardHeads`, `youPinned`, `passportFromRow`, `ranksOpens`, `rankSel`, `ranksEntry` (src/game/ranksPage.js); `tools/guards/ranks-ui2.test.mjs` (27 dodges planted, each red; 89 mutants, 2 equivalent survivors), `tools/guards/ranks-mount.test.mjs` (P1-P5 red); `mp-ui2ranks`; the older tests moved (mp-crowdsweep g, mp-ranksstyle, mp-boards, mp-boardslook to `?ui2=0`, mp-fishvariants 5); states `ui2-ranks-*`; UI-DESIGN-NOTES "Ranks under the new dashboard".

## Next
- The phone runs on the final code, precheck, the one push.

## Found
- (merge) claude/plan-ui3-3-bro into claude/plan-ui2-11-quests turned ui3-weights check 3 red on `questsUi2.css`: mended on claude/plan-ui2-11-quests (79b820ea), merged here.
- Turning a phone folds the dashboard (the frame's own rule): mp-ui2ranks opens the board again after each turn.
- The UI review's states cannot open a page under `?ui2=0`, so `leaderboard-picker` (today's picker) has no state now: mp-ranksstyle plays it.

## Needs
- Nothing.
