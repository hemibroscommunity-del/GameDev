# A guest's join writes only what is worth keeping (v2.3.5610, card OPS PR 11)

Red team RT-1, N6 (`docs/security/rt1-findings.md` on `claude/red-team-rt1`).

## Why

A join with no key, for an id with no `auth:` record, is let in as a
throwaway (`join.js` `_verifyJoinAuthNow`: old clients and `?guest=1` tabs,
whose id is new at every page load; every phone of the game sends its key).
Its join wrote five rows for an id the caller made up, four of them kept for
good: `rpg:` (twice), `pets:`, `cadence:login:`, `daily_rewards:`. With
addresses changed, about 17,000 such joins spend the Free plan's writes for
a day, and the rows are never swept.

## What

`server/src/guestlazy.js`. A FRESH guest's join writes none of them. Fresh:
no key, no `auth:`, no `rpg:` (the join's own read), and none of `pets:`,
`cadence:login:`, `daily_rewards:` on file (one read of the three). So the
join's turn-overs have nothing to pay or mail (a day's open pot, a season's
tiers need a record) and skipping their saves can never pay twice.

For the length of the join only (`index.js` clears the mark when the join
returns or throws):

- the join's two saves of the new record (`join.js`) are skipped;
- the pet book's first save (`petbook.js`), the login streak's
  (`cadence.js`) and the day's rewards' (`dailyrewards.js`) are skipped;
  the pet book and the day's rewards stay in the room's memory, as for every
  player.

After the join everything writes as before: the first thing worth keeping
(gold, an item, XP, a pet, a spin) saves the whole record through its own
door, in its own run, and a guest who comes back (still no key) has it; that
join is not a fresh guest's and writes as before. A guest who leaves having
done nothing leaves nothing of its own but the bot signals' `botstat:`
(`botfp.js`, the anti-cheat's). The login streak is written at a join only,
so a guest's starts the day after its first record (its readers take a
missing streak as day 1, what the first day writes). A join with a key is
untouched.

Nothing a player sees changes: the guest plays its character from memory.

## Measured (the suites)

| | a guest's join | leaving having done nothing | a keyed join |
|---|---|---|---|
| main | 5 rows | 5 kept | 6 |
| this | 0 | 0 (`botstat:` only) | 6 (unchanged) |

## Decided (sitting 23's review; the planning session, 2026-11-17)

- `server/src/index.js` (the mark cleared when the join returns, 3 lines)
  and the new `server/src/guestlazy.js` were outside PR 11's file list:
  the planning session's yes, given afterwards (v2.3.5614).
- A guest that earned but never spun comes back the next day at streak 1,
  not 2 (its first join writes no `cadence:login:`): left so, a guest's
  streak starts with its first record.
- A guest that chatted and left without earning reads `not-found` to a chat
  report or a friend request (no `rpg:` on file): a report should still
  land; card MOD mends it (`chatmod.js`, `friends.js`).
- The switch's `on` is its merge day, 2026-11-17 (v2.3.5614).

## The switch

`guestlazy: false` in the live flags: a guest's join writes its rows as
before.

## Tests

`server/test/guest-lazy.test.mjs` (a fresh guest's join, leaving, earning
gold and coming back, an id with a row on file, a keyed join, the mark's
life through a return and a throw, the switch); `cost-guard.test` 7 (a keyed
new character, at most 6) and 7c (a guest's join and arrival, 0).

The phone test `mp-itemdrop` (its finder is a guest tab): 5b ("two minutes
on, it flashes") is red on `main` too (16/18 on main, 5b and 6a; sitting 21),
a question about the test (TRAPS §177), not this change.
