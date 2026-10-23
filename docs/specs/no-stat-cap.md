# No cap on a stat (v2.3.3578)

The owner asked why one stat could only take a certain number of points ("why
are you capped at only adding a certain amount of points in any one stat
allocation category? I don't like that very much"). Then: "Remove stat cap."

## Before

The server refused a point past a bound, and the Points window greyed its [+]
at the same number:

| Stats | Most points |
|---|---|
| Defense, Dodge, Resist, Move Speed, Range, Speed | your character level |
| Power, Luck, Special, Elemental | twice your character level |
| Max HP, Stamina, Max Mana | your character level, and never past 100 |

The bound came with the points system ("§6-C": you could go defence-first,
but not past your level). When the stats moved onto a curve (v2.3.2680) the
owner kept it on Defense, Dodge and Resist and doubled it on the damage stats.

## Now

A stat takes every point you have to spend on it. The only limit left is the
999 storage bound on every stat, which nobody can reach: a character at level
100 has about 300 shared points.

What keeps one stat from breaking the game is what each point buys, not how
many points it holds:

- **The curve stats** (Defense, Dodge, Resist, Move Speed, Range, Speed,
  Power, Luck, Special, Elemental) read `max × q / (q + k)`. Each point buys a
  little less than the one before, and none ever reaches its `max`. Dodge
  heads for 90% and never gets there; Move Speed for +35%.
- **Dodge and Defense together** never let less than 10% of a base hit
  through (combat.js, the combined floor).
- **The block ladders** stop at ten blocks (abilities.js `BLOCKS`).

Max HP, Stamina and Max Mana are pools and stay linear: every point buys the
same. Their old hard 100 is lifted too, or a character past level 33 would
meet a cap there.

What it opens up, at level 10 with all 27 shared points in one stat:

| Stat | At the old bound (10 points) | All 27 points |
|---|---|---|
| Dodge (against a monster at your level) | 53% | 71% |
| Max HP (40 a point) | +400 | +1,080 |
| Move Speed | +17.5% | +25.5% |

A point placed is never taken back. The free reset (pointsreset.js) gives
them all back if a build goes wrong.

## Where

- `server/src/statcap.js`: `_statCapFree()` (the live flag) and
  `_prog3StatBound(ps, stat, def)`, which `_handleProg3Allocate`
  (server/src/prog3.js) asks.
- `PROG3.BODY` on both sides: `hp`, `stam` and `mana` have `cap: 999` (was
  100), like every other row.
- `state_sync.caps.nostatcap`; the phone (`src/data/prog3.js`
  `setStatCapFree`, `prog3StatCap`) stops greying [+] at the old bound only
  against a worker that says this. An older worker still refuses there, so the
  phone keeps the bound with it.
- The Points labels (HeroExpanded.jsx `ptsOf`): "Dodge, 4 points." with no
  cap, "Dodge, 4 of 10." with one.

## Also fixed: what a Max HP point says it is worth

The Max HP row (its label and the stat window's "Each point" line) said "+8
max HP" a point. Under the one formula (v2.3.3260) a point is worth 40: the bar
and the window's own before and after both grew by 40. The row now says what
the connected worker pays (`healthPerPoint()`: 40, or 8 on an older worker).
With the cap gone, Max HP is the stat most likely to take a pile of points,
so the number had to be right.

## The switch

`nostatcap: false` in the live flags brings back the bound exactly as it
was: character level, twice it on the damage stats, and the pools' 100
(`STAT_CAP.WAS`). Points already placed past it stay; the next one is refused.

A rollback to a worker before v2.3.3578 reads a pool placed past 100 as 100
(its old storage bound). That is reachable only past level 33.

## Tests

- `stat-cap` server suite: the table on both sides, no cap (past your level on
  Max HP, Dodge and Power, past 100 on a pool, never past 999), the switch with
  one level and with the sum, a placed point kept, the caps flag, the phone's
  [+] bound matching the worker's for every stat at levels 2, 10 and 100, and
  the wiring.
- `prog3` keeps its old bound checks, run under `nostatcap: false`.
- `mp-statpeek` finds the Luck button by its [+] handle, as the label no
  longer says " of ".
- `mp-statnocap` (a phone in the world, 13 checks): a level-22 character puts
  25 points in Max HP, the worker places all 25 and the bar grows 40 a point,
  the cell reads "Max HP, 25 points. +40 max HP per point.", the window offers
  the next point; then `nostatcap: false` at a rejoin: "25 of 22", [+] adds
  nothing past the bound, and the 25 points stay.
