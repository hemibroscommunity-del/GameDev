card: WD2
branch: claude/plan-wd2-12-door (one PR a branch, claude/plan-wd2-1..12, each stacked on the last, base main)
prs: #2211, #2213 to #2223 (tags 6320 to 6331): all merged (sitting 50)
state: done

## Done (in place on the page 4995 -> 4120; worker 385 unchanged)
- PR 1 (6320) #2211: say.js (say, sayPieces), guard say.test, ClanInviteCard; -> 4990.
- PR 2 (6321) #2213: ItemDetailPopup; -> 4862. DEPLOYS: server/test (desk-keys 7k).
- PR 3 (6322) #2214: PlayerPaint; -> 4763.
- PR 4 (6323) #2215: TradeWindowPanel; -> 4677. DEPLOYS: server/test (owner-icons 3b).
- PR 5 (6324) #2216: SkillsPanel x2; -> 4599.   PR 6 (6325) #2217: HeroExpanded; -> 4523.
- PR 7 (6326) #2218: MonsterCodex; -> 4463.    PR 8 (6327) #2219: LeaderboardPanel x2; -> 4396.
- PR 9 (6328) #2220: SmithyPanel; -> 4334.     PR 10 (6329) #2221: ClanPanel x2; -> 4278.
- PR 11 (6330) #2222: PetsPanel; -> 4222. DEPLOYS: server/test (desk-words 5).
- PR 12 (6331): CharacterPicker, NameModal, LoginScreen; -> 4120.
- Browser on the stack's top (PR 11): questline 187/187; UI capture sample
  (16 screens, portrait + desktop) shows the same words, no raw keys.

## Next
- Card's 12 PRs done. Left per wave (in place): W1 2041 in 136 screens
  (DailySpin 51, GameApp 51, DailyRewardsWindow 50, InventoryPanel 48, ...;
  QuestCoach 48 and GearTab 42 held by other cards); W2 375; W3 1212;
  W4 328; W5 164 (BroTown + the two renderers); W6 385 (the worker).

## Found
- Not words, counted by the census: ItemDetailPopup "y mandatory" (CSS); PlayerPaint 'tattoo' x2 (ids), "A" (icon); MonsterCodex 10 SVG paths; TradeWindowPanel a CSS class.
- Left for a test that reads the code by text: SmithyPanel 'Forge' (owner-icons 7d); LeaderboardPanel 'Power'/'Total' (HeadCell compares them); ClanPanel deskWords('Make a party...') (desk-words 5).
- "tap" now "click" on a computer (CLAUDE.md §7; phone unchanged): PlayerPaint 8 tips; HeroExpanded 'Tap a weapon...'; TradeWindowPanel 3; ClanPanel 3; LoginScreen 'fullHow' (a bro's •••).
- May read oddly (unchanged): PlayerPaint puts code words front/back in sentences, 'Back of Head' title case; HeroExpanded 'Level'/'level', '1 points' aria-labels; NameModal 'Colour' beside 'colors'.
- No player-facing "Wheel" or "remnant" met.

## Needs
- Nothing. Planning session 2026-11-18: Q1 `say` in systems.mjs desktop list; Q2 sayPieces; Q3 server/test word checks re-pointed, PRs marked DEPLOYS.
