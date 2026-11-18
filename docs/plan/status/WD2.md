card: WD2
branch: claude/plan-wd2-7-codex (one PR a branch, claude/plan-wd2-*, each stacked on the last)
prs: #2211 (6320), PR 2 (6321), PR 3 (6322), PR 4 (6323), PR 5 (6324), PR 6 (6325), PR 7 (6326) -- open as drafts, stacked
state: working

## Done
- PR 1 (6320) #2211: say.js (say, sayPieces), guard say.test, ClanInviteCard; 4995 -> 4990
- PR 2 (6321) : ItemDetailPopup; 4990 -> 4862; DEPLOYS (desk-keys 7k)
- PR 3 (6322) : PlayerPaint; -> 4763
- PR 4 (6323) : TradeWindowPanel; DEPLOYS (owner-icons 3b)
- PR 5 (6324) : SkillsPanel (both files)
- PR 6 (6325) : HeroExpanded
- PR 7 (6326) : MonsterCodex

## Next
- the PRs above opened one at a time as each passes precheck; then DailySpin + GameApp (6331), and the report of what is left per wave

## Found
- Census counts that are not words (left in place): ItemDetailPopup "y mandatory" (CSS); PlayerPaint 'tattoo' x2 (canvas ids) and "A" (icon glyph); MonsterCodex 10 SVG path strings; TradeWindowPanel a CSS class.
- Left in place for a test that reads the code by text: SmithyPanel 'Forge' tab (owner-icons 7d); LeaderboardPanel 'Power'/'Total' heads (HeadCell compares them); ClanPanel's deskWords('Make a party...') (desk-words 5).
- "tap" rows that now read "click" on a computer (CLAUDE.md §7): PlayerPaint 8 tool tips; HeroExpanded 'Tap a weapon to see its points'; TradeWindowPanel 3 (big gold, presets x2); ClanPanel 3 (join, disband, leave). Phone unchanged.
- Words that may read oddly (not changed): PlayerPaint puts the code word front/back into sentences; 'Back of Head' title case; HeroExpanded 'Level'/'level' capitals differ, '1 points' in two aria-labels.

## Needs
- Nothing. Planning session, 2026-11-18: Q1 yes (`say` in systems.mjs's desktop list); Q2 yes (sayPieces); Q3 yes (a server/test check reading a screen's words by text re-pointed to its src/data/say file, PR marked DEPLOYS: server/test).
