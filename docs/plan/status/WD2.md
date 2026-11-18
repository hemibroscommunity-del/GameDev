card: WD2
branch: claude/plan-wd2-2-itemcard (one PR a branch, claude/plan-wd2-*, each stacked on the last)
prs: #2211 (6320) W0 pilot: CI; PR 2 (6321) ItemDetailPopup: working
state: working

## Done
- PR 1 (6320) #2211: src/game/say.js (say, sayPieces), tools/guards/say.test,
  src/data/say/clanInvite.js, ClanInviteCard through it. In place 4995 -> 4990.
- PR 2 (6321): ItemDetailPopup (src/data/say/itemDetail.js), 4990 -> 4862.
  DEPLOYS: server/test/desk-keys.test.mjs 7k reads the table too.

## Next
- W1 PRs 3 to 10 (6322 to 6329): PlayerPaint, TradeWindowPanel, SkillsPanel,
  HeroExpanded, MonsterCodex, LeaderboardPanel, SmithyPanel, ClanPanel+PetsPanel.

## Found
- Not words, counted by the census (left in place): ItemDetailPopup:1252
  "y mandatory" (CSS scroll-snap).
- "tap" rows that now read "click" on a computer through say(): none in
  PR 1-2 (ItemDetail's block hint is a { phone, desk } row: unchanged).

## Needs
- Nothing. Answered by the planning session, 2026-11-18: Q1 yes (`say` in
  systems.mjs's `desktop` list, docs/SYSTEMS.md re-written); Q2 yes
  (sayPieces); Q3 yes (a server/test check that reads a screen's words by
  text is re-pointed to its src/data/say file, one line each, in a PR marked
  "DEPLOYS: server/test" for the gatekeeper to batch; no server/src edits).
