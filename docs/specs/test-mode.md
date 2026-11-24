# Test mode: the owner's own characters without the honesty checks (v2.3.3430)

> Offered three ways to test without the anti-cheat in the way, the owner
> chose option 2: a switch in the Test panel, for their own characters only,
> stored per character so it keeps working after launch, with a small "test
> mode" tag on screen while it is on. Anything earned with the checks off
> stays with the character (players start fresh at launch), and the automated
> checks keep running with the anti-cheat ON.

## Why

Since the anti-bot review (docs/specs/antibot-review.md) the worker judges
what an honest phone could not do. An honest phone never meets those checks,
but testing does:

- a warp from the Test panel moves the character far in one step, and the
  move budget follows it at 500 px/s instead (move-budget.md);
- a page reloaded in the middle of a harvest sends a strike with no start of
  its own, refused after the first in ten minutes (harvest-proof.md);
- a reconnect is judged from where the worker last had the character
  (last-place.md);
- a quest finished out of order to see the next one is refused (v2.3.3179).

To the worker each of those looks exactly like a script.

## What it does

`server/src/testmode.js`. One question, asked at each check it skips:
`_testMode(ps)` -- the character's `ps._testMode` is `true` and the kill
switch allows it.

### What it turns off, for a test-mode character only

| Check | Where | With test mode |
|---|---|---|
| The move budget and the per-message bound | movement.js `_handleMove` | the phone's place is taken as it says |
| The follow after a far move | movement.js `_tickMoveFollow` | dropped |
| The way back into the Wheel judged from where you left it | movement.js `_handleMove` (`_wheelEntryFrom`) | not judged |
| A reconnect judged from your last place; a join naming no place stood where the worker had you or at the Wheel's arrival (v2.3.5722, `joinplace`) | lastplace.js `_placeOnJoin`, `_placeUnnamed` | joins where it says |
| A strike before its window (too early) | gathering.js `_handleNodeStrike` | paid |
| A strike with no start of its own | gathering.js `_handleNodeStrike` (`HARVEST_PROOF`) | paid |
| 45 perfect harvests a minute | gathering.js `_ratedHarvestAccuracy` | no limit |
| A harvest's perfect held to an honest gesture's time and to 15 in any 20 strikes (v2.3.5900, `harvestgrade`, ON since v2.3.5906) | gathering.js `_harvestGraded` (harvestgrade.js) | paid as sent |
| Bot scoring and its 2,400-an-hour caps | botfp.js `_botfpOnStrike`, `_botfpOnCook` | not scored, flagged or capped |
| The server's own bot signals (v2.3.3731) | botsig.js `_sigSkip`, `_sigOnWindup`, `_sigReverifyOk` | nothing measured, flagged or re-checked (the network signal and the Turnstile re-check included) |
| 45 cooks a minute, 900 ms between cooks | cooking.js `_cookRateOk`, `_handleCookRequest` | no limit |
| A cook's result held to the cook it started (v2.3.5553, `cookstart`, ON since v2.3.5727) | cooking.js `_handleCookRequest`, `_cookStartOk` | lands as sent |
| A hit on a monster: weapon slot, reach, rate, paid special | combat.js `_handleMonsterDamage` (hitproof.js) | lands as sent |
| The 400 px melee reach and the Wheel's 3,600 px | combat.js `_handleMonsterDamage` | none |
| The per-monster lanes (210 ms, three specials in 1.2 s) | combat.js `_handleMonsterDamage` | none |
| The sword's swing (one a cycle), its 150 px reach and its shove (v2.3.5548, `swordswing`) | combat.js `_handleMonsterDamage`, swordswing.js | none |
| A bow's claim held to an arrow seen (v2.3.5550, `bowshot`) | combat.js `_handleMonsterDamage`, bowshot.js | none |
| The order of the first quests ('first', 'order') | quests.js `_questBarred` | any order |
| The dodge-roll window against a player's blow | movement.js `_rollOn` | the phone's `dodging` is believed |

### What stays on, for everyone

- The flood and message budgets, the join window, the per-address limits
  (flood.js); the relay's allowlist and its rebuild in the sender's name
  (relay.js); `PRIVILEGED_EVENTS`; the origin lock; a web request's body
  cap (v2.3.5720, `wire/door.js` `BODY_CAP`, `bodycap`); the look relay's
  pace, bytes and fields (v2.3.5721, `lookrelay.js` `LOOK_PACE`, `lookpace`);
  a Workshop run's safe ground (v2.3.5725, `dungeon.js`, `dungeonground`);
  a move's fields held to their form (v2.3.5723, `movement.js` `MOVE_FIELDS`,
  `movefields`); a relay's fields typed and the room's send to joined
  sockets only (v2.3.5724, `relay.js` `RELAY_FORMS`, `relaytyped`); the room
  ceiling's honest floor (v2.3.5728, `flood.js` `HONEST_PER_S`, `ceilfair`);
  a guest's share of the places, a played character's seat and an IPv6 /48
  counted (v2.3.5729, `seathold.js` `GUEST_SHARE`, `flood.js` `ip48Key`,
  `guestshare`); a join taking only what is its own (v2.3.5730, `join.js`,
  `seathold.js`, `joinguard`); a duel's frames to its two players alone
  (v2.3.5731, `eventplace.js` `duelPlaceOf`, `duelquiet`); a join's colour
  and avatar held to their forms (v2.3.5733, `join.js`, `lookform.js`,
  `lookjoin`);
  the owner's routes with no key and the public reads at the edge (v2.3.5726,
  `wire/door.js`; the worker settings `EDGE_GUARD`, `EDGE_CACHE`).
- A General Store sell filed under its weapon's own tier, and a refund and
  its order's delete in one write (v2.3.5801, card RV, `market.js`,
  `mkttier`, `mktheal`); the rise chest's stamp kept for good by the oplog
  prune (v2.3.5802, `inbox.js` `OP_PRUNE.KEEP`, `risekeep`); goods credited
  in the dying seconds kept through the respawn (v2.3.5803, `inbox.js`
  `_applyCreditToPs`, `dyingkeep`); No man's land's killer paid in the
  victim's own write (v2.3.5804, `nomansland.js` `_nmlOnDeath`, `nmlonewrite`);
  a duel challenge's cards paced and a muted challenger unheard, a decline
  only of a real challenge, the pot and its escrow's delete one write
  (v2.3.5805, `duel.js`, `duelpace`, `duelonewrite`); a muted sender's
  shop-thread line not shown on open, and a player who mutes you away
  to you (v2.3.5806, `storechat.js`, `chatlanes.js`, `party.js`, `storemute`,
  `mutehides`); a player's avatar and colour in the game's own forms on the
  board and on the page (v2.3.5807, `lookform.js`, `src/game/lookForm.js`,
  `?lookform=0`); an old key's after-join check held while `oldkeyheld` is
  (v2.3.5808, `loginkeys.js`); an offer's Yes waits for a bid half made, and
  a payment and its escrow's delete one write (v2.3.5809, `storeoffer.js`,
  `trade2.js`, `gladiator.js`, `offerpend`, `leftoverheal`); a friendship both
  sides or neither, and a request nobody answers let go after 30 days
  (v2.3.5811, `friends.js`, `friendfix`); the cleaner's blank and hidden
  characters, and a new pet or alliance name held to the name rule
  (v2.3.5814, `chatguard.js`, `petbook.js`, `alliance.js`, `cleanmore`,
  `namestaff`); the rewind's plan names the owner's login acts since its time
  (v2.3.5815, `restore.js`, `rewindsays`); the jackpot's deposit asks the
  purse again after its awaits (v2.3.5813, `cadence.js`, `jackcheck`); the
  Auction House's `/mine` shows a player's bids only to that player's own
  session (v2.3.5817, `store.js`, `minebids`); a join's shield and cosmetic
  claims merged only when the ledger backs them (v2.3.5812, `gearstash.js`,
  `shieldclaim`); a daily spin's and the login spin's paid
  mark in the credit's own run (v2.3.5810, `dailyrewards.js`,
  `loginspin.js`, `paidmark`); a `track`'s avatar, colour and look words in
  the game's own forms (v2.3.5819, `lookform.js`, `lookform`); the daily
  chest's stamp and save in one write (v2.3.6021, `dailychest.js`, under
  `paidmark`); a body in its dying seconds stakes, offers and trades nothing
  (v2.3.6022, `gladiator.js`, `storeoffer.js`, `trade.js`, `trade2.js`, under
  V3's `deadtake`); the General Store's book read a page an await and the
  room's only once whole (v2.3.6023, `market.js`, the page under V5's
  `listcap`); a re-listed noted order's first taker paid back before its
  delete under `mktsettle: false` (v2.3.6025, `market.js`, `mktback`); the
  daily spin's pace kept by the room across a rejoin (v2.3.6024,
  `dailyrewards.js`, under V3's `pacekeep`).
- Every save and payment rule; the login key, the device lock, the lockouts;
  a frozen account.
- PvP consent and **every check on a hit between players** (pvpbalance.js,
  pvplunge.js): test mode never makes a fight with another player easier.
- Loot ownership; the zone locks; the tool and level gates and a harvest's
  reach; a hit naming a zone the attacker is not in; a quest nobody can give
  ('gone') and every quest's objective at the hand-in.
- Damage is still the worker's own roll: a claim never sets a number.

A test-mode character can only do what its phone does; the worker simply does
not doubt it.

A test-mode character's device is also kept as the owner's (v2.3.5627,
`silence.js _ownerDeviceNote`, `ownerdev:<device>`): a freeze's device rule
(`freezedevice`) never holds the owner's own phone. Not a check: it turns
nothing off.

And a record that keeps who acted marks it (v2.3.6480, `actor.js actorTest`,
`actorRow`): an `xfer:` row's `actor` takes `test: true` beside its kind,
and the day's book adds the character's seconds and gold under its part's
`test` key, apart from play. Not a check: it turns nothing off.

And the owner's play is recorded and its checks run IN SHADOW (v2.3.6482,
`playtrace.js`; grand plan step 10.8, the owner's yes, call 13): a test-mode
sitting's first ten active minutes become one `play_trace:` row labelled
`human`, in the league's trace form (rung 4 replays it), and while it
records, the checks test mode turns off are asked anyway, their verdict
counted as "would refuse" (`wr`), play going on as test mode lets it: the
move budget (on a budget of the recording's own, movement.js), the
too-early strike and the strike with no start of its own (gathering.js), the
cook's rate, its floor and its start (cooking.js), and the hit proof's
weapon, reach and rate, the bow's arrow and the sword's swing (combat.js).
NOT shadowed: the bot scoring (botfp.js, botsig.js: their scoring writes),
the quests' order, the reconnect's judge (lastplace.js) and the roll window:
the league's replay of the row (test mode off) is their shadow. Not a check:
it turns nothing off. `playtrace: false` records and shadows nothing.

## The switch

| Surface | Who | What |
|---|---|---|
| `POST /api/admin/dev/testmode {playerId, on}` | the admin key (the Test panel) | `on: true` writes the record and puts the live character in test mode -- only for a character who is online, so the id is a real player; `on: false` deletes it for any id. Written to the admin log like every dev op. |
| `GET /api/admin/dev/testmodes` | the admin key | every character with it on: id, name, when, online; at most 50 |
| `GET /api/admin/dev/state?id=` | the admin key | + `testMode`, `testModeAllowed` |
| `state_sync.testMode` | the joining phone | `true` while on and allowed; absent otherwise |
| `test_mode {on}` | the phone whose character it is | sent when the owner flips it; **PRIVILEGED** (index.js), and the phone takes it only in the direct switch with no `from` |
| `/api/admin/overview` `testMode` | the admin key | `{allowed, online}` |

**No WebSocket message turns it on or off.** Anything a phone can say, a
script can say (devtools.js header); the switch lives where the admin key is.

### Stored

`testmode:<playerId>` -> `{v: 1, on: true, at, name}`; present is on, deleted
is off (handoff storage-key registry). Read once at the join, **before** the
reconnect's place is judged (join.js), and kept as `ps._testMode` -- memory
only, never on the rpg blob (handoff rule 1). A read that fails is **off**:
the checks stay on. A character restart deletes it (persistence.js
`_resetCharacterData`): the restarted character starts as a new player would.

Turning it off puts the character straight back under the checks from where
the worker has them: a full move budget, the next move judged from there.

### The phone

- `src/game/testMode.js`: `applyTestMode(S, on)`, `testModeOn(S)`.
- wsClient.js: `state_sync.testMode` at every join, `test_mode` in the direct
  switch.
- The top bar (ZoneHeader.jsx) shows a small amber **TEST MODE** tag beside
  the zone name while it is on -- never inside the title box (the zone banner
  reads its text exactly), a flat fill (the bar is over the WebGL canvas,
  TRAPS §42).
- The Test panel (DevPanel.jsx) has a Test mode section: one button that
  turns it on or off, and what it turns off and what stays on, in words.

The phone changes nothing about how it plays: every check is the worker's.

## Kill switch

`testmode: false` in the live flags: every character's test mode is off at
once, every check back on. The records stay; clearing the flag brings them
back. A phone keeps its tag until its next join.

## A new honesty check

A check that a test session could trip asks `this._testMode(ps)` at its own
line, goes in the list in testmode.js's header and the table above, and
`server/test/test-mode.test.mjs` §8 -- which lists the files that ask --
gets its name. A check that protects another player or the server does
**not** ask.

## Tests

- `server/test/test-mode.test.mjs` (70): the switch (the key, online only,
  the record, the event, no WebSocket way in, the join's read, a failed read,
  the rpg blob, the restart, the list, the kill switch) and each check once
  each way -- refused without test mode, let through with it, refused again
  with the kill switch -- and what stays on. Six mutations (each skip removed,
  the kill switch ignored, the join's flag dropped) each fail it.
- `tools/qa/mp/mp-testmode.mjs` (25, a phone in the Wheel): the Test panel's
  button (opened by a real press on the zone title), the tag on the top bar at
  390 and 320 px wide, the tag back after a reload from the join alone (the
  stored record), and a 2,600 px jump followed with test mode off (the worker
  ~700 px behind after 0.9 s), taken at once with it on, followed again once
  it is off.
