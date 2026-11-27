card: UI2-ranks
branch: claude/plan-ui2-13-ranks
prs: Ranks' draft PR (tag 6692; base claude/plan-ui2-11-quests)
state: ready

## Done
- tag 6692 (the build's step 6, Ranks): the landing (Combat, Life Skills, Feats), a group's boards, Points placed, a board's standings (Rank | Player | the unit; medals only on 1-3, the same surface; your row marked wherever it stands and pinned only while out of view; "Not ranked on this board"; the kit's placeholder while loading), another player's Character from the board's row only ("Not shared" lines, nothing to press), your own row to Bro, Back to the same board and scroll. Rules `ranksGroups`, `ranksBoardHeads`, `youPinned`, `passportFromRow`, `ranksOpens`, `rankSel`, `ranksEntry` (src/game/ranksPage.js); `tools/guards/ranks-ui2.test.mjs` (27 dodges planted, each red; 89 mutants, 2 equivalent survivors), `tools/guards/ranks-mount.test.mjs` (P1-P5 red); `mp-ui2ranks`; the older tests moved (mp-crowdsweep g, mp-ranksstyle, mp-boards, mp-boardslook to `?ui2=0`, mp-fishvariants 5); states `ui2-ranks-*`; UI-DESIGN-NOTES "Ranks under the new dashboard".

## Next
- Nothing: the PR waits for the gatekeeper's sitting 73.  THE MEND OF SITTING 72 (held: the Coin flip board said "Nobody has won a flip against Ace yet." before the answer came; RankStandings useFlip claimed `loading: false`, aceFlipBus.js starts as an empty board): every board's source hands the worker's answer, or null, to the rule `rankAnswer` (src/game/ranksPage.js), and the board waits on its `waiting`; the flip's starting board is no answer (`FLIP_UNANSWERED`). Looked at, the same way: the ranked boards (a failed fetch said "nobody": mended, `useRankRows` gives `answer`), the spin and the fish (already right, now through the rule), "Not ranked on this board" (only once answered), a board or group the list lacks (said "nobody" before the worker's caps: mended, `rankListWaiting`), another player's page (no wait: the row's own values). ranks-ui2: R8a-e, W6-W10, plants D7b-D7g2 each red (the held head's `loading={false}` and `loading: false` among them); 18 new mutants, 17 killed, 1 equivalent (listed). Then main 5ab943fe merged in.
- Before the mend: questline 187/187, membudget 12/12, ranksstyle 21/21, boards 37/37, boardslook 24/24, fishvariants 19/19, ui2ranks 28/28.

## Found
- (merge) claude/plan-ui3-3-bro into claude/plan-ui2-11-quests turned ui3-weights check 3 red on `questsUi2.css`: mended on claude/plan-ui2-11-quests (79b820ea), merged here.
- Turning a phone folds the dashboard (the frame's own rule): mp-ui2ranks opens the board again after each turn.
- mp-wheelhalls: its stack check wants the old `more,leaderboard` (the frame's) and the More page's Guild line; mp-townboard 11 (Codex, Journey under the frame); mp-crowdsweep's profile wants `QA_DIST=dist-prof` and a hold at station c: none Ranks'.
- The UI review's states cannot open a page under `?ui2=0`, so `leaderboard-picker` (today's picker) has no state now: mp-ranksstyle plays it.

## Needs
- Nothing.
