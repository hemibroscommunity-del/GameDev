card: WD3
branch: claude/plan-wd3-14-help (one PR a branch, claude/plan-wd3-N-<what>, each stacked on the last, base main)
prs: #2227 (6340), #2229 (6341), #2230 (6342), #2231 (6343), #2232 (6344), #2233 (6345); PR 7-15 (6346-6354, working), PR 14 (6353, working)
state: working

## Done (in place on the page 4120 -> ...; worker 385 unchanged)
- PR 1 (6340): the guard's mends (say.test 6-9, desk-words 5b, LoginScreen's comment).
- PR 2-6 (6341-6345): daily rewards (4 screens) -> 3987; arena/alliance (3) -> 3901; hero sheet (4) -> 3818; dashboard/More (5) -> 3677; social (6) -> 3568.
- PR 7-13 (6346-6352): world map/halls/NML (5) -> 3439; crafting (6) -> 3309; shops (5) -> 3201; bag (5) -> 3113; quests (6) -> 3050; records (5) -> 2987; games (6) -> 2906.
- PR 14 (6353): help: ControlsTutorial, KeyboardHintsPanel, InfoPanel, InfoPopup -> 2842.

## Next
- PR 15: the next screens of W1, biggest first (one system a PR).

## Found
- "tap" now "click" on a computer (CLAUDE.md §7; phone unchanged): DailyRewardsWindow swap hint; InspectCard hint; SocialPanel 'No friends yet...'; InspectPlayerPanel 'Friends — tap to remove'; NmlBadge place line; NmlAskCard 2 aria-labels; InventoryPanel 'No pets...'.
- Left for a test that reads the code by text: PartyPanel 'Entered arena queue!' (sound-cues 9d); PartyHUD 'Leave?' (party-keep 16) and its deskWords (party-chip 4d); BottomDashboard 'Achievements', 'Leaderboards', 'Bro'; DuelRequestPanel 'DUEL!' (duel-pending); SocialPanel deskWords x2 (desk-words 5); WorldMap pin deskWords (map-pin 9b), 'party' key (party-marks 3e); ZoneHeader ' AP' (ap-chip); FeedSeed 'Compost' (bag-icons 4c); QuestCard 'Talk to ' (folk-names 4j); journal aria 'Show on map'.
- ExchangePanel not moved: server/test/store-sell-tap runs its body with fixed stubs (SAY/say would need adding there).
- Not words, but counted: GameApp's dev console (51); CodexStage's animation names (26); RenameRow is the Test panel's (11); Settings 'Debug overlay (D)' (?dev=1).
- May read oddly (unchanged): arena '1 wins'; InspectCard says 'long-press' on a computer; 'Gem Cutting Lv5' vs 'Lv 5'; StoreChat 'Listing expires expired'; chest 'Armour' vs 'Armor'; weigh-in 'albino Trout'; GamblePanel 'G' vs 'g'.
- A missing part now shows '' where a `+` join showed "undefined" (normal data unaffected).
- No player-facing "Wheel" or "remnant" met.
- "tap" now "click": ControlsTutorial 5 step bodies (the tour never chose by device).

## Needs
- GameApp's and RenameRow's words need NOT_SHOWN/DEV_FILES in tools/dev/words-census.mjs (outside my card): asked the planning session.
