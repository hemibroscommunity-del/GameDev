# The stashes' door (v2.3.5281)

Grand plan step 4.3, card R PR 2. The code: `server/src/stash.js`; its
suite: `server/test/stash-door.test.mjs`; the rule every session follows:
CLAUDE.md §5 ("The same for a bag count, a stash, ..."), §8, and
`docs/ARCHITECTURE-HANDOFF.md` rules 3 and 29b.

## Why

A player's stashes are the weapon bag (`weaponStash`) and the five gear
lists (`armorStash`, `legsStash`, `shieldStash`, `gearStash`,
`amuletStash`). Before this door they were written by hand in about forty
places across sixteen files: pushed, spliced, set in place, made new, and
cut to their cap in two places (the save and the equip). A weapon pushed
past the cap stayed on the screen until the next save cut it away. The gold
door (rule 29) and the bag door did this for the purse and the bag; this is
the same for the stashes.

## The door

Three functions, each call naming its road, its row in `STASH_ROADS`:

| Call | Does | Answers |
|---|---|---|
| `stashGive(rec, field, piece, road, room)` | a piece into the stash, at its end | `true`, or `false` at the cap (nothing added) |
| `stashTake(rec, field, at, road)` | the piece at `at` out of it | the piece, or `null` (nothing there: nothing taken) |
| `stashSet(rec, field, v, road, at)` | the stash made `v` (a load, a loss, a merge); with `at`, that one place | `true`, or `false` when `at` is not a place |

`rec` is a live player's state or a stored record. A give or a take makes
the list when it is missing, so no caller writes `= []`. A wrong road, a
road of another verb, or a road that does not touch that stash throws, the
list untouched.

## The cap (handoff rule 3)

The weapon bag's cap is the room's (`WEAPON_STASH_CAP`, its live-flag size);
a gear list's is gearstash.js `gearStashCap()`. A give past it is refused at
the door; every caller already answered a full bag (the mail keeps the
weapon, a refusal goes back to the phone, a pile's blade is sold), so
nothing a player sees changes there.

What is true of the cuts, and only this (the gatekeeper's medium, sitting
17, verified by a probe through a real join; the planning session's choice:
the words now, the cuts later):

- **no longer cut**: `_saveRpg` writes every weapon the bag holds, and the
  equip no longer cuts the bag (a swap never grows it). So a bag over its
  cap (a cap lowered under `disable_bigbags`) keeps every weapon while the
  player is in the room;
- **still cut**: the join (`_sanitizeWeaponList`, gear.js, cuts a stored bag
  to the cap at the next join); the phone's copy (persistence.js sends the
  capped list); the gear lists at the save (`capStash`, persistence.js) and
  at the join (gearstash.js `_gearStashAdoptOnJoin`).

No new loss against before this door. Removing the remaining cuts is a
bigger change in behaviour, for later. There is no kill switch: one would
only bring back a cut that destroys weapons.

## The roads and their classes

Every row has its class, as the gold door's do (gold.js `CLASSES`,
`classFaults`):

- **mint**: a piece made (a quest's, a pile's, a forge's, the daily chest's,
  a new character's first bag, the phone's gear claim merged at a join);
- **burn**: a piece gone from the world (a weapon sold to the shop,
  salvaged);
- **move**: within the same player, `other: 'self'` (the hand or the body
  and the stash, an upgrade in place, a load from the stored record);
- **escrow**: into or out of a place that holds it (`other`, one of
  gold.js `ESCROW_PLACES`): the mail (`inbox:`), the market (`mkt_order:`),
  the auction house (`store_listing:`), a trade window (`trade2wpn:`, added
  to `ESCROW_PLACES` here).

The escrows between players are on PR 1's table (`playerroads.js`): the
trade window, No man's land, the market and the auction house each name
their stash roads, and `player-roads.test` holds them (weapons and gear
left `DOORLESS`). A move within one player is never on that table.

The world's sum (step 4.4) reads every place a stash road holds a piece in,
and counts the gear lists by each piece's id (`world-sum.test`, its stash
section). The weapon bag is counted once weapons carry an id (card R PR 3).

## The helpers

Three helpers hand the door their caller's road as their last argument:
`gearstash.js` `_gearStashLiveAdd(ps, slot, piece, road)` and
`_gearStashLiveTake(ps, slot, piece, road)`, and `shieldwear.js`
`bagIt(ps, field, piece, road)`. The suite reads their callers as it reads
the door's.

## What the suite holds

1. The door's give, take and set, the cap refused, a wrong road thrown.
2. One door: no stash written in `server/src` but `stash.js`, by its name,
   by a field held in a name inside a function that touches a stash, or
   through a name that holds one; each shape planted and found.
3. One row, one place: every call names a road with its verb from its row's
   file; every road has exactly one caller.
4. The classes, as above.
5. The cap: the save keeps a bag over its cap whole, and a weapon by the
   mail to a full bag is refused at the door.

## The gatekeeper's low (review-z13), taken here

PR 1's table let a row claim `ledger: 'xfer'` with nothing that writes it.
Now `player-roads.test` §8 holds that every `xfer` row's key is a `move`
road it names, or it names its `writer` (`'file fn'`) and that file calls
it.

## A weapon's own id (v2.3.5282, card R PR 3)

Every weapon carries `gid` (SHAPES part 2), made by the one minter gear
has (`gearprov.js` `gearMintId`; `_gearProvMintId` is it). The field is
`gid` either way, and no second name is made.

- **The door gives it.** A weapon the door gives into the bag, or sets in
  its place, without a well-formed id is given one (`weaponIdGive`); one
  with its own keeps it, whatever road it came by (traded, sold, mailed,
  listed, dropped). The forge gives the weapon it makes one.
- **Hands and bag together** (`weaponIdsAll`), at the join's load and in
  the save's migration (`migrations.js` v22, `weapon-gid`): a weapon without
  one gets one, and the second of two that share one gets a new one (the
  first keeps it), so two never share, and a weapon never gets a second.
- **A phone never names one.** The strict sanitizer (a new character's
  claim) drops it, and the worker's copy keeps only a well-formed one.
- **No ledger row** (the card's reading: `gear_prov:` holds 256 rows a
  player, and a weapon's would be more rows, a cost question). The door
  keeps its own counter for the minter.
- **Gear or weapon.** A gid alone no longer says gear: a piece the worker
  minted as gear carries `prov` beside its gid, and a weapon never does
  (`gear.js` `_isGearNotWeapon`).
- **The world's sum** counts a weapon by its id, as gear: in the hands and
  the bag, a listing, a sell order, a trade window and the mail.
- **The record's shape changed** (a weapon on `rpg:` gains `gid`): the
  schema is 22, so a worker rolled back past this one refuses the record at
  the join (handoff rule 1) instead of saving its weapons without ids.

`server/test/weapon-id.test.mjs` holds it.
