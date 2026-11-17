# The fight door (card L PR 5, grand plan step 5.3b; v2.3.5538)

`server/src/cooking.js` (`_fightTo`, `FIGHT_WAYS`, `_fightDoorOff`); held by
`server/test/fight-door.test.mjs` and the phase table's guard (the `fight`
row on the worker). The page's half is the fight's page door
(`docs/specs/fight-page-door.md`, your skull).

## What it is

A fight between players is a clock, not a field: the fight lock
(`fightlock.js _fightLockHolds`) and the bite rule (`_pvpInFight`,
`_anyFightAt`) derive it at each ask from the duel, this clock (a hit within
`PVP_HEAL.WINDOW_MS`), the red skull and the place. The clock's one store is
the room's `this._pvpHealClocks` (a player's id to `{ pvpAt, healAt }`; it
survives a rejoin on purpose, and is sent to nobody). Five functions in two
files wrote it; now only `_fightTo` does, by a way of `FIGHT_WAYS`:

| way | caller | writes |
|---|---|---|
| `open` | `_pvpHealClock` (a reader that wants a clock) | a clock at zero, if none |
| `exchange` | `_notePvpExchange` (`combat.js _resolvePvPAttack`, `pvpextras.js _strikePlayer`) | both sides' `pvpAt` |
| `heal` | `_noteInstantHeal` (the four roads of a heal eaten at once) | the eater's `healAt` |
| `prune` | `_pvpHealPrune`, and the door itself when the map is full (512) | drops the clocks past the window and the gap |
| `forget` | `spar.js _sparRemove` (a sparring clone gone) | drops its clock |

- The old names stay, each one line through the door, so their callers and
  the suites that call them are unchanged.
- **Not this machine's field**: `ps.lastDamageAt` is every blow's stamp
  (`combat.js _applyDamage`); the fight lock and the red skull read it.

## Step 1: nothing a player sees changes

The door's one rule is an id that is a string: every caller passes a
session's id.

## The switch

`fightdoor: false` in the live flags lifts the rule, as the lines before the
door. Its row is in card T's switch table. The bite rule's own switch,
`pvpheal: false`, is unchanged.

## What the test fails

- §1: each way, the prune's keep, the cap, a hostile way or id, the switch;
  the old names through the door.
- §2: a write of `this._pvpHealClocks` (its birth, a set, a delete) or of a
  clock's `.pvpAt` or `.healAt` anywhere in `server/src` outside `_fightTo`.
- §3: a hit between players puts both in the fight; a heal makes the next
  bite wait; a clone's removal forgets its clock.
