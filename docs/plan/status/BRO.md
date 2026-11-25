card: BRO
branch: claude/plan-bro-1-pages
prs: part 1 (6600, ready)
state: ready

## Done
- Part 1 (6600): the Bro tab is three pages, each whole with no scroll: Overview (you, the held weapon's four numbers, the three masteries, one progress row), Combat (all thirteen stats at once, in Offense / Survivability / Mobility), Progress (the counters and bar, the eight doors two across). Marks at the top, taps only; side by side from 600 px (a phone on its side: the dense cut). Rules: src/game/broPages.js (one state, one transition; server/test/bro-pages.test.mjs, mutation pass 59 mutants, 2 equivalent survivors). Pages: sheet/BroPages.jsx; BroCard.jsx reads as before and draws them. `?bropages=0` the old card.
- Phone test mp-bropages (55 checks); mp-brocard, mp-achievements, mp-bandshots play the card behind `?bropages=0`; mp-deskkeys, mp-lazyfail, mp-apchip go to Progress for its doors.

## Next
- waits for the gatekeeper.

## Found
- Measured on the test box: the upright Bro page is 184 px tall at 390 wide, 180 at 375 (both Safari-bar heights the same: the band is fixed); 78 px on a phone on its side; a computer's band 480 px wide (one page at a time there).
- Sideways, `dashboardPanelBus.open('hero')` called straight (not the Bro button) leaves the band folded with the button row over the page's lower half (src/ui/mobile/BottomDashboard.jsx's fold; not this card's).

## Needs
- nothing.
