# A join at 0 health stands you up (v2.3.4374)

**The owner (2026-11-10):** "A player who closes the game in the 5 seconds
after dying comes back standing in BroTown at full health, and nothing is
taken twice."

## What a player met

A death (`index.js _handlePlayerDeath`) keeps you "dying" for 5 seconds, then
the respawn (`_tickPlayerRespawn`) stands you up in town. The dying window,
and a dungeon death's or a lost duel's promise to keep the bag
(`_deathKeepsBag`), live in memory only. The death saves `hp: 0`.

Close the game in those 5 seconds (or lose signal, or a deploy lands): the
dying state goes with the socket, and the next join restored `hp: 0` with
nothing dying. The stuck-at-zero sweep then killed you again (cause
`stuck-at-zero`): a second death card, and the second death's wipe took the
bag the first had kept, with a pile in the Wheel or none in town. A
red-skulled player killed in a duel (whose skull a duel kill leaves) lost
everything to nobody.

## What happens now

`join.js`, just before the join's record save: a STORED record at
`hp <= 0` is the respawn the close cut short, done at the join:

- hp, stamina and mana full (to the maxes the join just worked out);
- `z: 'town'`, the place the respawn puts you (the phone comes down today's
  town's stairs to the Wheel's BroTown), whatever place the phone's join
  named; `session.data.z` follows, so peers are told the same;
- `_moveRespawned`, as the respawn: the next way into the Wheel is judged from
  its arrival (`lastplace.js`), never the spot where they died;
- NO wipe, NO pile, NO death, NO skull rule: the first death already did all
  of that.

A living record, and a new character (no record: no `rpg*` claim is read, so
never 0), come back exactly as before. The stuck-at-zero sweep stays for every
other road to 0.

## Rules it keeps

- **No new write** (cost-guard §7): the healed pools ride the join's one
  record save that was already there (`this._saveRpg(msg.id, _ps)` at the end
  of the stats block). `join-stands-up.test` §5 holds the join at 0 to the
  same rows as a living one.
- **Saved before it is said** (handoff rule 10): that save is put before the
  join's `player_state`, and the output gate holds the message until the put
  lands.
- **Both protocols**: the join's `player_state` is a full one on v1 and v2
  (`lastPlayerStateSent` is cleared at the join), so both carry the full bar.
- **Rule 9**: between the hp restore and the heal the join awaits only
  storage, so no tick (and no sweep) runs on the half-built state.
- **No stored shape**, no migration, no replay. A record from a newer worker is
  still refused before this runs.

## Kill switch

`joinstandup: false` in the live flags: the join restores 0 and the sweep
kills again, as before. Read inline beside the code it switches.

## The respawn replay, removed

v2.3.1822's `_respawnOwed` (set when a respawn had no socket; replayed by the
next join) never ran: it was set on the old state object, and every join
builds a new one through an allowlist that cannot carry it (state-machine
sweep S2-2). The flag and the replay are gone; the respawn still runs and
still sends `player_respawned` to a live socket. A rejoining phone that missed
it is stood up by its stuck-dead watchdog from the join's full `player_state`
(`src/game/respawn.js`).

## Left for later

- Telling a phone that reconnects inside the window (same page, still on the
  death screen) at once: its watchdog stands it up 20 s after the death.
- Saving the dying phase or the keep-the-bag promise: not needed now.
- A death pile surviving a deploy: needs a storage row.
- The phone's comments that still call the replay "the real fix"
  (`src/game/respawn.js`, `BroTown.jsx`).

## Tests

`server/test/join-stands-up.test.mjs` (30 checks; 16 fail on the code before
this). `combat-lifecycle.test.mjs`'s stuck-at-zero block notes the join is no
longer one of its roads, and its 1822 block now holds that no debt is left.

## For TRAPS (not appended here: parallel lanes)

A record at 0 health with nothing dying is not "a stuck state to sweep": it is
a death the close cut short. Sweeping it is a second death that takes what the
first one kept. Stand it up at the join (`joinstandup`); never "restore" the
second death.

## v2.3.4902: inside the five seconds, the same death

A join whose record is at 0 health first reads the death's saved note
(`life:<pid>`, life.js). If the death's five seconds have not run out, the
join comes back as that death for the seconds left (its card again, then the
ordinary respawn) instead of standing up at once. After the five seconds, or
with `lifesave: false`, it stands up exactly as above
(`docs/specs/life-door.md` "Step 2b").
