card: WD3
branch: claude/plan-wd3-6-social (one PR a branch, claude/plan-wd3-N-<what>, each stacked on the last, base main)
prs: PR 1 (6340, working), PR 2 (6341, working), PR 3 (6342, working), PR 4 (6343, working), PR 5 (6344, working), PR 6 (6345, working)
state: working

## Done (in place on the page 4120 -> ...; worker 385 unchanged)
- PR 1 (6340): the guard's mends (say.test 6-9, desk-words 5b, LoginScreen's comment).
- PR 2 (6341): the daily rewards: DailySpin, DailyRewardsWindow, DailyRewardsCard, LoginSpinWindow; -> 3987.
- PR 3 (6342): the arena and alliances: PartyPanel (the Gladiator Arena), AlliancePart, PartyHUD; -> 3901.
- PR 4 (6343): the hero sheet: BroCard, InspectCard, EquippedTab, CharacterView; -> 3818.
- PR 5 (6344): the dashboard and More: BottomDashboard, MorePanel, SettingsPanel, AboutPanel, BandGrip; -> 3677.
- PR 6 (6345): social: PlayerProfilePanel, SocialPanel x2, InspectPlayerPanel, IncomingTradePanel, DuelRequestPanel; -> 3568.

## Next
- PR 7: the next screens of W1, biggest first (one system a PR).

## Found
- "tap" now "click" on a computer (CLAUDE.md §7; phone unchanged): DailyRewardsWindow 'Not your thing? Tap ↻ to swap...'.
- Left for a test that reads the code by text: PartyPanel 'Entered arena queue!' (sound-cues 9d); PartyHUD 'Leave?' (party-keep 16), deskWords('Tap to see your party') (party-chip 4d).
- May read oddly (unchanged): the arena's '{wins} wins' reads '1 wins'.
- "tap" now "click": InspectCard's hint '... tap to dismiss' (it also says 'long-press' to a computer: unchanged).
- Left for a test: BottomDashboard 'Achievements' (achievements-client 7e), 'Leaderboards' (test-world-core), 'Bro' (points-tips 6). Dev-only, left: Settings 'Debug overlay (D)' and its line.
- "tap" now "click": SocialPanel 'No friends yet. Tap a player...'; InspectPlayerPanel 'Friends — tap to remove'. Left for a test: DuelRequestPanel 'DUEL!' (duel-pending), SocialPanel deskWords('Tap another player...') x2 (desk-words 5).

## Needs
- Nothing.
