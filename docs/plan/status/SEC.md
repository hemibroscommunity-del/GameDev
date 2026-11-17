card: SEC
branch: claude/plan-sec-<n>-<topic> (stacked: each PR on the one before until it merges)
prs: #2030-#2049 merged; #2054-#2056: Z39; #2057-#2061: CI; PR 20 (5719): suite
state: ready

## Done

- PRs 1 to 11 (#2030-#2049, merged): items 1 to 10 and the card.
- PRs 12-14 (#2054-#2056): flood tally; chain budget; dev console blanks.
- PRs 15-18 (5714-5717): three guards and words (`verifylocal`); gear
  worn only if held (`gearheld`); an old key held to its devices
  (`oldkeyheld`); the site's headers ship (public/_headers, a guard).
- PRs 19, 20 (5718, 5719): the roster's cookie host-only
  (`?rostercookie=0`), the admin key for the session; a restart refused
  while a listing or order names the player, daily_rewards: deleted
  (`resetclean`).

## Next

- PRs 16-20: suites, PRs, the gatekeeper. Then the card is done.

## Found

- A join with NO id is let in as `session.id` undefined: a body under
  `playerState.undefined` and a `cadence:login:undefined` row, shared by
  every such join (join.js; PR 2's card covers an id present only).
- The Test panel's "Let one new device in (30 min)" no longer lets an old
  key in (PR 17): its words mislead now (DevPanel.jsx, the page).
- src/public/_redirects and favicon.svg ship neither (publicDir is
  public/): the SPA fallback and the icon are not live. Not item 18's.
- Item 16 (planner): shield, cosmetic and amulet claims still come in
  through the join's claim; nothing guards them yet (gearstash.js).
- Sitting 38: received friend requests never expire; 50 throwaways fill a
  player's inbox (friends.js). Later: expire them by `at`.

## Needs

- None. (Item 16 answered by the planning session: as built.)
