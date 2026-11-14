# One door for every change to a player's build points (v2.3.5283)

`server/src/skillpoints.js`; held by `server/test/skillpoints-door.test.mjs`.
Grand plan step 4.3, card R PR 4.

## Why

A player earns points at each level-up and places them on a build: the
weapon stats of each combat style and the shared (body) stats. On the server
they are `ps.prog3`'s counts:

| Field | What it holds |
|---|---|
| `pool` | the lane points not yet placed (all three styles, and the old unchannelled remainder) |
| `poolBy[cat]` | the lane points by the style that earned them (sword, bow, staff) |
| `shared` | the shared points not yet placed |
| `alloc[stat]` | the shared stats' placed points |
| `atk[cat][stat]` | each style's weapon stats' placed points |
| `ppl`, `spl` | the lane and shared points a level the build was dealt at |

and the old grid's two, on the player state itself: `unspentT2` (points not
yet placed) and `buildPointsThisLvl` (points toward its next level).

Before this version they were written by hand in **22 places across three
files** (`prog3.js`, `grids.js`, `join.js`), plus the deal's seven fields
behind four callers. Each place read the count its own way: five different
ways (the table below). That is the shape the gold door (`gold-door.md`) and
the bag door (`bag-door.md`) found and fixed: a rule meant for every point
has to be copied into each place by hand, and a copy that misses it is a bug.

## The door

Four plain functions:

| Function | What it does |
|---|---|
| `pointsGive(rec, n, road, k1, k2)` | points INTO a count |
| `pointsTake(rec, n, road, k1, k2)` | points OUT of a count (the caller has already checked there is one) |
| `pointsSet(rec, v, road, k1, k2)` | a count, or its container, MADE `v` (a load, a heal of a missing shape) |
| `pointsDeal(p3, deal, road)` | the whole build dealt at once: every placed point back, the pools what the levels give |

`rec` is the build (`ps.prog3`) or, for the old grid's two, the player
state. Every call names its **road**, a row in `POINT_ROADS`. The row says
the verb, the count (`field`, and how many keys name it: a style, a stat),
how a give or take reads the count first (`read`) and the most a give may
leave (`cap`). Nothing else in `server/src` writes those fields.

The deal is worked out by `prog3.js` `prog3RespecPoints(p3, sumRule, road)`
from the levels, and written by the door; its four callers each name their
road: `points_reset` (the free points reset), `one_level_redeal` (the one-level
re-deal, once a build), `dev_deal` (the owner's Test panel), `power_control`
(the power index's control, a build made up in memory).

## Step 1 (this version): nothing a player sees changes

Each road keeps the exact read and cap its place had before the door:

| Read | What it does with the count `x` | Roads |
|---|---|---|
| `plain` | `x` as it is (`p3.pool += 3`) | `level_lane`, the old grid's three |
| `orZero` | `Number(x) \|\| 0` | `level_lane_by` |
| `whole` | `Math.max(0, Math.floor(Number(x) \|\| 0))` | `level_shared` (cap 999), `place_lane_pool`, `place_shared`, `place_body_pool` |
| `pos` | `Math.max(0, Number(x) \|\| 0)`, not floored | `place_lane_by` |
| `num` | `x` if a number, else 0 | `place_atk`, `place_body` |

The test replays each place's old line against the door for every count a
build can hold (whole, fractional, below 0, missing, NaN, a string) and they
agree to the bit. Making them one read is a later step, as the gold door's
step 2 was.

## What is not here, and why

The test lists each with its reason; anything else that writes a points field
fails it.

- **The build's shaping** (`SHAPERS`): `prog3.js`'s pure functions that build
  or heal a STORED build before the join adopts it: `_sanitizeProg3` (the
  join's clean, into a fresh block), and the folds and back-pays it shares
  with the migrations (`prog3SplitAtk` v11, `prog3GrantRetroPoints` v14,
  `prog3MoveElemToAtk` v15, `prog3FoldLuck` and `prog3GrantSharedPoints`
  v17). They write a build that is not yet a live player's: a copy in the
  sanitizer, `blob.prog3` in a migration. The one-level re-deal they run is
  the door's own deal.
- **The whole-build assigns** (`POINTS_WHOLE`): the join adopting the stored
  build (`join_adopt`), and migration v10 building one from the legacy tracks
  (`migrate_legacy`).
- **Not build points** (`NOT_POINTS`): the jackpot's gold pool (`draw.pool`,
  `cadence.js`) and the power index's control (`power.js` `controlBuild`).

## What the test holds

1. **The sums**: every give and take road against its old line (`EXPECT`); a
   set leaves what it is given; a deal writes its seven fields in their old
   order, and one missing a field throws.
2. **One door**: no points field written in `server/src` but `skillpoints.js`
   and the three lists above; a stale entry fails.
3. **One row, one place**: every call names a road the table has, with its
   verb, from its row's file; every road one caller; none uncalled. One call
   alone hands on its caller's road: the deal's front, `prog3RespecPoints`.
4. **A wrong road changes nothing**: an unknown road, a wrong verb, an
   `Object.prototype` name, the wrong number of keys: each throws, the build
   untouched.
5. **The room**: on a GameRoom, a level-up mints, a placed point spends, the
   points reset deals.

Break proofs, tried by hand (its header): `p3.pool = poolN - 1;` put back in
the spend fails §2; `level_shared`'s cap changed fails §1; a second call of
`level_lane` fails §3.

## Found on the way

- `grids.js` `_tryLevelUpFromBuildPoints` has no caller in `server/src`: the
  old grid's level-up from build points is dead. Its writes go through the
  door like the rest; deleting it is not this PR's.

## Kill switch

None: the door changes no sum (step 1). A later step that changes one adds
its switch, as the gold door's `goldonesum` did.
