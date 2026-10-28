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
| A reconnect judged from your last place | lastplace.js `_placeOnJoin` | joins where it says |
| A strike before its window (too early) | gathering.js `_handleNodeStrike` | paid |
| A strike with no start of its own | gathering.js `_handleNodeStrike` (`HARVEST_PROOF`) | paid |
| 45 perfect harvests a minute | gathering.js `_ratedHarvestAccuracy` | no limit |
| Bot scoring and its 2,400-an-hour caps | botfp.js `_botfpOnStrike`, `_botfpOnCook` | not scored, flagged or capped |
| The server's own bot signals (v2.3.3724) | botsig.js `_sigSkip`, `_sigOnWindup` | nothing measured or flagged |
| 45 cooks a minute, 900 ms between cooks | cooking.js `_cookRateOk`, `_handleCookRequest` | no limit |
| A hit on a monster: weapon slot, reach, rate, paid special | combat.js `_handleMonsterDamage` (hitproof.js) | lands as sent |
| The 400 px melee reach and the Wheel's 3,600 px | combat.js `_handleMonsterDamage` | none |
| The per-monster lanes (210 ms, three specials in 1.2 s) | combat.js `_handleMonsterDamage` | none |
| The order of the first quests ('first', 'order') | quests.js `_questBarred` | any order |
| The dodge-roll window against a player's blow | movement.js `_rollOn` | the phone's `dodging` is believed |

### What stays on, for everyone

- The flood and message budgets, the join window, the per-address limits
  (flood.js); the relay's allowlist and its rebuild in the sender's name
  (relay.js); `PRIVILEGED_EVENTS`; the origin lock.
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
