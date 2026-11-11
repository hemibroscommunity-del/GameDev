# One door for every change to a count in a player's bag (v2.3.4810)

`server/src/bag.js`; held by `server/test/bag-door.test.mjs`. The gold door
(`docs/specs/gold-door.md`, v2.3.4670) did this for gold; this is the same, for
the bag.

## Why

A player's bag is `ps.inventory` on the server (and `inventory` in the stored
`rpg:` record). Before this version a count in it was changed by hand in **69
places across 28 files**: every cook, craft, shop, harvest, trade, the mail,
the bank. Each place read the count its own way (eight ways, below) and emptied
a stack its own way (two rules). A rule meant for the WHOLE bag (one way to
read a count, a log of where an item came from, the fight lock) had to be
copied into every place by hand.

## The door

Three plain functions (plain, because `gems.js` and a few helpers are not on
the GameRoom):

| Function | What it does |
|---|---|
| `bagGive(bag, key, n, road, cap?)` | `n` INTO the bag (the quest grant passes a most-it-fills-to) |
| `bagTake(bag, key, n, road)` | `n` OUT of it (the caller has already checked it is there) |
| `bagSet(bag, key, v, road)` | the count MADE `v` |

`bag` is the `inventory` object itself; the caller makes sure it exists, as
before. Every call names its **road**, a row in `BAG_ROADS`, which says the
verb, how the count is read, and how an emptied stack goes. Nothing else in
`server/src` writes a bag count.

## Step 1 (this version): nothing a player sees changes

Each road keeps the exact read and empty rule its place had:

| Read | The count as... |
|---|---|
| `plain` | it is (`inv[k] -= n`) |
| `orZero` | `inv[k] \|\| 0` |
| `whole` | `Math.floor(Number(inv[k]) \|\| 0)` |
| `wholeFloor` | whole, not below 0 |
| `ownWhole` | own key only, whole |
| `ownWholeFloor` | own key only, whole, not below 0 (`trapsIn`) |
| `ownNumber` | own key only, `Number(v) \|\| 0` (inbox.js `_invCount`) |
| `gem` | own key only, whole, finite and above 0 (gems.js `num`) |

| Empty rule | |
|---|---|
| `none` | the answer is written as it is |
| `leZero` | written, then deleted if `<= 0` (a NaN stays) |
| `gtZero` | written if `> 0`, else deleted (a NaN goes) |

The test replays every road against its old line, for every count a bag can
hold (missing, 0, fractions, below 0, NaN, null, a string, Infinity), under a
plain key and under `constructor`, and they agree to the bit.

Two roads are a **set** on purpose, to keep step 1 exact:
- `shop_sell`: `_shopSell` reads the count BEFORE `await this._shopStock()` and
  writes `have - sold` after it. A take would re-read the count after the
  await. Step 2 should decide whether the stale read is right (it is safe
  only while nothing else can change the bag across that await).
- `trap_legacy_out`: the old trap key deleted (set to 0, `gtZero`).

`gems.js` is the gems' own small door: `gemTake` / `gemGive` call the roads
`gem_take` / `gem_give`, and every gem change goes through those two.

## What is not here (listed in the test, with why)

- Whole-bag assigns: a new empty bag, the join's load (two lines), the death
  wipe (two lines). They make the bag, not a count in it.
- Other records: the old gem pouch, the bank vault, market orders, listings,
  the shop's stock.

## Next

- **Step 2 (one sum)**: every road reads the count one safe way (own key, a
  whole number, not below 0) and empties a stack one way (`gtZero`), so the
  `read` and `empty` columns go. Its own version and live switch; the test's
  EXPECT lines become "the old line, for every honest count".
- Step 3: what the door can then do once for every road (a log of where items
  came from, the fight lock, test mode), as the gold door's step 3.
