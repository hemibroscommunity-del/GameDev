# The stat boards (v2.3.5484, card PW)

> The owner, 2026-11-14: *"You can add more stats to leaderboard if you think
> it's worth it. Like highest skills in stat allocation?"*

The planning session's call, which the owner left to it: **one board for each
shared stat a player allocates points into, plus one board for damage summed
over the three weapons.** No other per-weapon boards: three of each would
bury the list.

Code: `server/src/statboards.js`. Suite: `server/test/statboards.test.mjs`.

## The boards

`GET /api/leaderboard/top?category=<id>`, in this order (`STAT_BOARD_IDS`):

| Id | Ranks the points allocated to | The game's own name (Bro tab, `src/data/prog3.js`) |
| --- | --- | --- |
| `pts_def` | Defense | Defense |
| `pts_hp` | Max HP | Max HP |
| `pts_dodge` | Dodge | Dodge |
| `pts_stam` | Stamina | Stamina |
| `pts_eres` | Elemental resist | Resist |
| `pts_mana` | Max mana | Max Mana |
| `pts_move` | Move speed | Speed |
| `pts_dmg` | Damage, the three weapons' points summed | Power (`PROG3_ATK_META`) |

The ids follow `PROG3.BODY` (the shared stats as the worker lists them), so
a new shared stat gets its board and the count grows. The names are the ones
players already read: never the retired Might, Fortitude, Vitality, Agility
or Mind, and nothing invented. **One clash for the panel**: the game calls
the damage points "Power", and the Power board (the power index,
`docs/specs/power-index.md`) is also "Power"; card LB shows them apart.

Each result is the usual board row plus `value` (the points). A row with
none in that stat is off its board, as on the skill boards (a list of fifty
players at 0 is worse than a short honest one). A deleted character's
stand-in keeps the points it was retired with.

## The server's word

The points are the worker's prog3 record (`ps.prog3.alloc` and
`ps.prog3.atk.*.dmg`, server-owned end to end), never the phone's. A board row
carries them as `statPoints` (whole numbers), made by the room
(`index.js reportToLeaderboard`) and cleaned by the Leaderboard object
(`cleanStatPoints`).

## No new write occasion

They ride the board report the room already sends, **inside its change
signature** (the planning session's ruling): a spend goes with the next
report the throttle lets through, at most five minutes after the last
(`LEADERBOARD_MIN_MS`), as a level does; the same points again write nothing.
Points move only when a player spends them, and most spends follow a level,
which sends a report anyway. `cost-guard` holds.

## The wire

- `caps.statboards` is HOW MANY boards this worker ranks (8 today), its own
  line in `join.js` (TRAPS §9: a cap that grows gates by its count). The
  phone shows that many of the order above.
- Kill switch `statboards: false` in the live flags: no cap, and no report
  carries the points, so the stat boards empty as players report; every
  other board is as it was (`docs/SWITCHES.md`).
- The wire table's leaderboard rows note the categories and the field;
  `docs/SHAPES.md` has the shape's row.
