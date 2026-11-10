# Accuracy: how many of your shots hit, a weapon (v2.3.4490)

The owner, 2026-11-10: *"I want somewhere that stats keep track of 'accuracy'
(maybe for all 3 weapon types) like the amount of times the projectile hit on
target. Now that it's a swipe I expect the accuracy of bow to go down but
that's why I increased speed by 25%."*

## What was there

Nothing. The worker only ever heard about hits (`monster_damage`,
`player_attack`); a shot that missed was never sent.

## What counts

- **A shot** is a basic attack as it starts: a sword swing, an arrow, a staff
  bolt. Specials are not shots (the whirl, the volley, the big bolt), nor is a
  retreat's shot, nor the chips of a volley's stuck arrows.
- **A hit** is a shot that damaged at least one enemy, a monster or a player.
  An arrow through three monsters is one hit; a swing that catches two is one.
- A swing at empty air is a miss. "Every basic attack" was the default put to
  the owner on 2026-11-10 (the other choices: only with an enemy nearby; bow
  and staff only), and the owner went ahead without changing it.

## Who counts what, and what that means

| | counted by | how |
|---|---|---|
| shots | the PHONE | `src/game/accuracy.js accShot` numbers each basic shot of a weapon as it starts (the swing in `playerActions.js swingAttack` and in `monsterCombat.js`'s attack loop; the arrow or bolt as it is pushed, `_sn`). The counts ride the `track` the phone already sends: `ac: [sword, bow, staff]`, since this join. |
| hits | the WORKER | a hit claim carries its shot's number (`sn`). Where combat.js takes the health (`_handleMonsterDamage` after every gate; `_resolvePvPAttack` where the hit is settled) it calls `_accHit`, which counts a shot once (the last 24 shot numbers a weapon are remembered: arrows land out of order). |

So the hit count is honest and the shot count is the phone's word: a modified
phone can report fewer shots and read a better number. **Accuracy is a stat
to look at. It pays nothing and ranks nothing, and must not** (no leaderboard:
the owner was told why).

Bounds on the phone's word: a report must be three whole numbers; it may claim
8 shots a second since the last report plus a backlog of 40 (the quickest
honest shot is every 200 ms); a count that went DOWN is a page that began
again. The phone starts its counts from nothing at every `state_sync`
(`accReset`) and the worker's copy does too (`_accJoin`), so a reconnect
counts nothing twice.

The counts are not NEWS to the quiet phone (`quietPhone.js` SKIP): a shot
does not send a `track` of its own, so a fight sends no more messages than
before. They arrive with the next track, 30 s at most; a hit whose shot has
not been reported yet waits (in memory) for it.

## What is kept

| key | shape | written |
|---|---|---|
| `acc:<pid>` | `{v, w: {melee, ranged, staff: {s, h, r}}, at}`: shots and hits for good, and `r`, the last four buckets of fifty shots `[shots, hits]` ("your last 200") | at most every 5 minutes while you fight, and as you leave. Standing and walking write nothing. Deleted when the character is restarted for good. |
| `accday:<yyyymmdd>` | `{v, melee, ranged, staff: [shots, hits]}`: every player's, a UTC day | with a player's write (one more row at most). 60 days kept. A character in test mode is left out. |

Never the rpg blob (handoff rule 1).

## Where it is shown

- **Your own**: More, Journey: three cells under the record cards (Sword, Bow,
  Staff: the percentage and the shots), and "Your last 200" once there is
  more behind you than those. Asked for as the page opens and every 15 s
  (`acc_request` -> `acc_state`, PRIVILEGED, private).
  (The "Stats" page in `BottomDashboard`'s table is not reachable from any
  menu: TRAPS §319.)
- **The owner's**: the Test panel's "Accuracy (all players)" box: a table a
  day, each weapon "62% of 1,240" (`GET /api/admin/dev/accuracy?days=14`).
  This is the view that answers "did the bow's swipe lower it".

## Switches

`caps.accuracy` (on its own line: TRAPS §316); the phone counts and asks only
against a worker that says so. Kill switch `accuracy: false` in the live
flags: the cap is not advertised, nothing is counted, the ask answers
`{off: true}`. What is stored stays.

## Proved

- `server/test/accuracy.test.mjs` (64 checks): the record, the bounds, once a
  shot, the writes' pace, a rejoin, the days, the switch, the phone's half and
  every hook's place in the source.
- `mp-ownerwatch`: a phone swings five times at empty air (5 shots, 0 hits on
  the worker's day), then fights at the Flame Fields (9 hits of 17 swings);
  the Journey page reads "Sword 53%, 17 shots".

## Not proved here

- The bow and the staff on a phone (the scenario fights with the sword; their
  numbering is the same line of the attack loop and is held by the suite).
- What the numbers will BE: that is the owner's to read after a few days.
