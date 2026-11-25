card: BRO
branch: claude/plan-bro-1-pages
prs: #2349 part 1 (6600, ready)
state: ready

## Done
- Part 1 (6600): the Bro tab is three pages, each whole with no scroll: Overview (you, the held weapon's four numbers, the three masteries, one progress row), Combat (all thirteen stats at once, in Offense / Survivability / Mobility), Progress (the counters and bar, the eight doors two across). Marks at the top, taps only; side by side from 600 px (a phone on its side: the dense cut). Rules: src/game/broPages.js (one state, one transition; server/test/bro-pages.test.mjs, mutation pass 59 mutants, 2 equivalent survivors). Pages: sheet/BroPages.jsx; BroCard.jsx reads as before and draws them. `?bropages=0` the old card.
- Phone test mp-bropages 55/55 (twice; after the merge of main too); achievements 33/33, lazyfail 7/7, apchip 4/4, bandshots 60/60, switchbro 12/12, panelguard 7/7; server 605 suites, precheck OK; mp-brocard, mp-achievements, mp-bandshots play the card behind `?bropages=0`; mp-deskkeys, mp-lazyfail, mp-apchip go to Progress for its doors.

## Next
- part 2: merged main 0c648ebb, the word moved to say/broPages.js (the counters' aria "{earned} of {total}"); precheck OK, bro-pages suite green, mp-bropages 55/55. Waits for the gatekeeper.
- part 2: stacked on #2346's head 2825d8e0, lands it.

## Found
- Measured on the test box: the upright Bro page is 184 px tall at 390 wide, 180 at 375 (both Safari-bar heights the same: the band is fixed); 78 px on a phone on its side; a computer's band 480 px wide (one page at a time there).
- Sideways, `dashboardPanelBus.open('hero')` called straight (not the Bro button) leaves the band folded with the button row over the page's lower half (src/ui/mobile/BottomDashboard.jsx's fold; not this card's).
- mp-brocard 55/59 behind `?bropages=0` (main's own path): the 4 are the button row and band (sideways "OPEN", the lit border rgb(255,226,58), the tablet's stacked words and its 480 px box), seen on the unchanged code too; mp-deskkeys 59/60, 8f a snowman's double-click lunge (combat, not the Bro tab).

## Needs
- nothing.
