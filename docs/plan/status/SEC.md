card: SEC
branch: claude/plan-sec-<n>-<topic> (stacked: each PR on the one before until it merges)
prs: #2030-#2054 merged; #2055-#2063 (5712-5719): sitting 40, Z40's holds fixed
state: ready

## Done

- PRs 1-11 (#2030-#2049, merged): items 1 to 10 and the card.
- PRs 12-14 (#2054-#2056): flood tally; chain budget; dev console blanks.
- PRs 15-18 (5714-5717): three guards and words (`verifylocal`); gear worn
  only if held (`gearheld`); an old key held to its devices (`oldkeyheld`);
  the site's headers ship (public/_headers, a guard).
- PRs 19, 20 (5718, 5719): the roster's cookie host-only, the admin key for
  the session (`?rostercookie=0`); a restart refused while the market holds
  the player, daily_rewards: deleted (`resetclean`).
- Z40's holds: #2059 closes the armour/legs claims captured or not; #2063
  reads the room's own market indexes and forgets the daily cache.

## Next

- #2055-#2063: sitting 40. Merge main in as it moves. Then the card is done.

## Found

- A join with NO id is let in as `session.id` undefined: one body and one
  `cadence:login:undefined` row shared by every such join (join.js).
- The Test panel's "Let one new device in (30 min)" no longer lets an old
  key in (PR 17): its words mislead now (DevPanel.jsx).
- src/public/_redirects and favicon.svg ship neither (publicDir is public/).
- Item 16 (planner): shield, cosmetic and amulet claims still come in through
  the join; nothing guards them yet (gearstash.js).
- gearheld: an armour piece only a phone made before v2.3.4840 is lost; and
  the phone adds a 49th chest piece the worker refuses (wsClient.js 4426).
- wire/out.js 227 (card K's): character_reset_refused names only `fight`.
- Sitting 38: received friend requests never expire (friends.js).

## Needs

- None. (Item 16 answered by the planning session: as built.)
