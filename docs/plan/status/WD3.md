card: WD3
branch: claude/plan-wd3-17-exchange (one PR a branch, claude/plan-wd3-N-<what>, each stacked on the last, base main)
prs: #2227 (6340), #2229-#2233 (6341-6345), #2235-#2243 (6346-6354) in order; PR 16 (6355), PR 17 (6356, working)
state: working

## Done (in place on the page 4120 -> ...; worker 385 unchanged)
- PR 1 (6340): the guard's mends (say.test 6-9, desk-words 5b, LoginScreen's comment).
- PR 2-6 (6341-6345): daily rewards (4 screens) -> 3987; arena/alliance (3) -> 3901; hero sheet (4) -> 3818; dashboard/More (5) -> 3677; social (6) -> 3568.
- PR 7-13 (6346-6352): world map/halls/NML (5) -> 3439; crafting (6) -> 3309; shops (5) -> 3201; bag (5) -> 3113; quests (6) -> 3050; records (5) -> 2987; games (6) -> 2906.
- PR 14 (6353): help: ControlsTutorial, KeyboardHintsPanel, InfoPanel, InfoPopup -> 2842.
- PR 15 (6354): account: AccountLoginForm, AccountKeyCard, AccountPanel (RenameRow: the Test panel's); -> 2800.
- PR 16 (6355, the planning session's answer): census NOT_SHOWN (the dev console, by its call) and RenameRow in DEV_FILES; -> 2740.
- PR 17 (6356): the market exchange: ExchangePanel (store-sell-tap gives the run SAY and say; DEPLOYS); -> 2710.

## Next
- Card's 15 PRs done (stop line), and the planning session's 6355-6356. Left per
  wave, in place: W1 631 in 91 screens (QuestCoach 48 and GearTab 42 held by HB2,
  EconCard 31, DungeonCreatorPanel 30, CodexStage 26 animation names, ...);
  W2 375; W3 1212; W4 328; W5 164 (BroTown + the two renderers); W6 385.

## Found
- "tap" now "click" on a computer (CLAUDE.md §7; phone unchanged): DailyRewardsWindow swap hint; InspectCard hint; SocialPanel 'No friends yet...'; InspectPlayerPanel 'Friends — tap to remove'; NmlBadge place line; NmlAskCard 2 aria-labels; InventoryPanel 'No pets...'.
- Left for a test that reads the code by text: PartyPanel 'Entered arena queue!' (sound-cues 9d); PartyHUD 'Leave?' (party-keep 16) and its deskWords (party-chip 4d); BottomDashboard 'Achievements', 'Leaderboards', 'Bro'; DuelRequestPanel 'DUEL!' (duel-pending); SocialPanel deskWords x2 (desk-words 5); WorldMap pin deskWords (map-pin 9b), 'party' key (party-marks 3e); ZoneHeader ' AP' (ap-chip); FeedSeed 'Compost' (bag-icons 4c); QuestCard 'Talk to ' (folk-names 4j); journal aria 'Show on map'.
- ExchangePanel moved in PR 17 (store-sell-tap given SAY and say, the planning session's answer).
- Not words, but counted: GameApp's dev console (51); CodexStage's animation names (26); RenameRow is the Test panel's (11); Settings 'Debug overlay (D)' (?dev=1).
- May read oddly (unchanged): arena '1 wins'; InspectCard says 'long-press' on a computer; 'Gem Cutting Lv5' vs 'Lv 5'; StoreChat 'Listing expires expired'; chest 'Armour' vs 'Armor'; weigh-in 'albino Trout'; GamblePanel 'G' vs 'g'.
- A missing part now shows '' where a `+` join showed "undefined" (normal data unaffected).
- No player-facing "Wheel" or "remnant" met.
- "tap" now "click": ControlsTutorial 5 step bodies (the tour never chose by device).
- Left for a test: AccountLoginForm's 'device' refusal (device-words). ControlsTutorial's two bodyManual lines (manual-combat 10q); InfoPopup 'Add points with +' (owner-notes 4).

## Needs
- Nothing. Planning session 2026-11-18: 6355 census lines; 6356 ExchangePanel with store-sell-tap's stubs (DEPLOYS).
