card: Z
branch: claude/plan-z-sitting-41
prs: Z_PR (this PR), tag 5679, the last line of sitting 41's list (ready)
state: ready

## Done
- `census/review-z41.md`. Tick: the phase line 4 -> 3 (L's #2052,
  merged at 40). SEC's status written `done` (its tags all used).
## The list: merge in this order, each "Create a merge commit"
1 U2 #2070 (5780, the card and its tag block) · 2 L #2058 (5536,
`guarddoor`) · 3 L #2065 (5537, `zonedoor`) · 4 L #2067 (5538,
`fightdoor`) · 5 K2 #2068 (5724, `relaytyped`) · 6 Z (this PR). All on
`main`, one base at every step (heads and trees in
`census/review-z41.md`); the worker deploys once. With L's three, card
L is done and card M chain A's PR 1 (5340) may open.
## Held / Stalled
- None held at review; none stalled. To 42: U2 #2074 (adds
  `status/U2.md`, as #2070 does: merges `main` after it), RV #2072 (its
  tag-blocks row meets #2070's and #2071's: merges `main` after them),
  K2 #2073 (`bowshot` ON, and `cookstart` ON coming; on #2068; at the
  close, not reviewed); T2 #2071 (READY; meets #2070 in tag-blocks:
  merges `main` after it) and #2075 (on #2071); V2 #2076-#2080 (came at
  22:01; #2076's tag-blocks row meets #2070's).
## Found
- (a) `mp-alliance` 3 13-15/16 since #2022; no card. (b) `movetop` ON:
  ride, sprint, potion suites hold only the flat bound. (c) #2033: a
  damage of `Infinity` draws "-Infinity". (d) #2028, for `cookstart`
  ON: a dropped result has spent its plan (K2's #2073 turns it ON). (f)
  A join with NO id is let in as `session.id` undefined (join.js). (g)
  #2038: a known field a save leaves out comes from a newer record. (h)
  Received friend requests never expire (friends.js). (i)
  `mp-movepath`'s two "no worse" checks fail on main's worker. (k) A
  joiner's state_sync carries `rpgData`. (l) #2060: the Test panel's
  "Let one new device in" promises what `oldkeyheld` stops
  (DevPanel.jsx). (m) #2059: the phone adds a 49th chest piece the
  worker never holds (wsClient.js 4426). (n) #2062: `www.` and the bare
  domain no longer share the character list. (o) #2068: `relay-bytes`
  runs only with `relaytyped: false` (the wall with it ON, the default,
  untested); relay.md's "exactly as sent" overstates. (p) #2065: the
  stand-up to town asks no duel (L's Found; `duel-zone` 226 exempts any
  `_ps` caller). (q) precheck's 5-minute server-tests limit against a
  ~6 to 10 minute suite on this box (every sitting).
## Needs
- The owner: the cost switches (`reqstamp`, `fullsnap`, `xferescrow`,
  `resetbook`, `seathold`, `freezedevice`), `.github/`, Cloudflare
  (`EDGE_GUARD`, `EDGE_CACHE`, `BODY_CAP`, a www redirect, a rate-limit
  rule). `cookstart` ON: the planning session says the owner answered
  "Go recommended on all"; K2's #2073 carries it to 42. Card L done once
  #2058, #2065, #2067 land: card M chain A's PR 1 (5340) may open.
