card: SEC
branch: claude/plan-sec-<n>-<topic> (stacked: each PR on the one before until it merges)
prs: #2030-#2063 merged
state: done

## Done

- PRs 1-11 (#2030-#2049, merged): items 1 to 10 and the card.
- PRs 12-14 (#2054-#2056): flood tally; chain budget; dev console blanks.
- PRs 15-18 (5714-5717): three guards and words (`verifylocal`); gear worn
  only if held (`gearheld`); an old key held to its devices (`oldkeyheld`);
  the site's headers ship (public/_headers, a guard).
- PRs 19, 20 (5718, 5719): the roster's cookie host-only, the admin key for
  the session (`?rostercookie=0`); a restart refused while the market holds
  the player, daily_rewards: deleted (`resetclean`).
- Z40's holds fixed: #2055 (each queued chain job asks the switch), #2059
  (claims closed uncaptured too), #2063 (the room's market indexes).

## Next

- None: #2055-#2063 merged at sitting 40 (main cc4815a8); the card is
  done (written by the gatekeeper, sitting 41, tag 5679: SEC's tags are
  all used).

## Found

- A join with NO id is let in as `session.id` undefined: one body and one
  `cadence:login:undefined` row shared by every such join (join.js).
- The Test panel's "Let one new device in (30 min)" no longer lets an old
  key in (PR 17): its words mislead now (DevPanel.jsx).
- src/public/_redirects and favicon.svg ship neither (publicDir is public/).
- Item 16 (planner): shield, cosmetic and amulet join claims are unguarded.
- gearheld: an armour piece only a phone made before v2.3.4840 is lost; and
  the phone adds a 49th chest piece the worker refuses (wsClient.js 4426).
- wire/out.js 227 (card K's): character_reset_refused names only `fight`.
- Item 19 (planner): the host-only roster splits www.brotown.net from
  brotown.net; a www -> brotown.net redirect in Cloudflare (the owner's).
- Sitting 38: received friend requests never expire (friends.js).

## Needs

- None. (Items 16 and 19 answered by the planning session: as built.)
