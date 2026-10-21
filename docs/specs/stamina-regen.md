# Stamina regen, worked out by the server (v2.3.3536)

The owner, 2026-10-21, a week before reviewers play the game: *"I value
SIMPLICITY and INTELLIGIBILITY"*. This was item 6 of the after-review list
agreed with the outside evaluation.

## What it did

Every regen tick (about every 0.67 s) the server refilled stamina by 7 times
two multipliers that no screen showed:

- **The amulet's**, `1 + amuletStaminaRegen / 100`. The phone sent this number
  at every join and in every `stats_update`, and the server kept it, capped at
  100. So any phone could claim +100% (twice the refill) with no amulet at
  all.
- **Endurance's**, `1 + endurance x 0.002`. Endurance is the old stat from
  before the trained-skill system (prog3). Every character is on prog3 now,
  and there Endurance is frozen: nothing raises it, no screen shows it, and
  max stamina no longer reads it. The regen tick was its last live use. A
  character made before prog3 refilled faster because of a number it could
  never see or change.

## What it does now

`server/src/staminaregen.js`, read by the regen tick (`index.js
_tickPlayerRegen`):

- **The amulet's bonus comes from the amulet the server holds.** The server
  has made and kept amulets itself since v2.3.1192, so it looks at the worn
  amulet's tier and gem. A **light** gem gives (4 + 3 x the tier's power)%,
  the same row the amulet's card prints (`AMULET_GEM_STATS.light` in
  `src/data/items.js`): simple 7%, ornate 8.5%, regal 10.6%, mythic 13%. Any
  other gem, or no amulet, gives nothing. The tick still rounds up as it
  always did, so at the base of 7 any light amulet makes it 8.
- **Endurance no longer counts for a prog3 character** (that is, every
  character). It still counts for a record not on prog3, the legacy path the
  old suites cover.

The phone's claims are still taken in, clamped as before, so the kill switch
can bring the old tick back mid-session. Nothing reads them otherwise.

## What a player notices

A new player: nothing. They have no amulet and an Endurance of 0, so both
multipliers were 1 already. Nothing makes a light gem yet (no land's shards
crack into one, as the Dark and Light realms aren't built), so no honest
player had the amulet's bonus either. What changes is that a modified phone
can no longer double its stamina refill, and an old character's hidden
Endurance stops speeding it up.

## Not changed

- The water gem's "HP Regen" on an amulet's card: the server has never applied
  it (it reads no amulet for health), and this change leaves it so. Amulets
  are rare and shown only to someone holding gold (v2.3.3535). Making it real
  or taking it off the card is a separate decision.
- The phone's own stamina prediction (`BroTown.jsx`) runs only without server
  monsters, which the game always has, so the bar is the server's number.

## Switch and tests

- Kill switch: `amuletregen: false` in the live flags. It brings back the old
  tick: the phone's claim, and Endurance for everyone.
- `stamina-regen` suite (31 checks):
  - the helper against the game's own card at every tier, and junk;
  - the claim through both doors (taken in, not read);
  - frozen Endurance;
  - a light amulet made by the forge's own craft and gem steps;
  - the switch both ways.
  Four broken versions of the fix each fail it.
- `mirror-audit` pins the light gem's row to the game's.
- `anticheat` §8 notes the claims are unread.
