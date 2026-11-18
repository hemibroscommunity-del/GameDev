# Card RV: money, accounts and players' safety, reviewed (defensive)

**Starts:** now. The second red team (2026-11-17) could not cover these
three areas: the model's safeguards stopped its attack-style lanes. The
owner, 2026-11-17, asked for a review-only session instead: *"Yes do it"*.
**What it is:** a defensive code review. Read the code, find the holes,
fix them with tests. **Not** an attack: no scripts against the live game
or any deployed copy, and no proof tools kept in the repo beyond the
suite that shows each fault on `main` and its fix.
**Read:** `CLAUDE.md` (§4 safety, §5 the wire's rules: deny by default,
the doors for gold, bag and health, one write, writes and messages cost
money); the ten rules at the top of part 5 of `docs/GRAND-PLAN.md`;
`docs/plan/README.md`; `docs/SHAPES.md` (the roads and the stored
shapes); card E's census of the money's roads and `GOLD_ROADS`; cards
SEC and K2 (`docs/plan/cards/SEC.md`, `docs/plan/cards/K2.md`), so you
don't redo their work; `docs/specs/grand-plan-review.md`; TRAPS (§ rows on
money, saves, devices and chat).
**Tags:** 5800 to 5819. PR 1 adds `"RV": [[5800, 5819]]` to
`tools/dev/tag-blocks.json` and sets `nextBlock` to the larger of 5820 and
what main already says. If T2's, V2's or U2's block PR is open, merge main
in after it lands. One tag a PR.
**Effort:** high (money, logins, players' safety). **Browser:** light
(`questline` before a PR that changes what a phone receives).
**Questions and heads:** heads go to the current gatekeeper (the planning
session tells you its id), with one line to the planning session,
`session_01LccHamDdNzEDtNWFCYhLn9`. Ask a question once, under Needs and
in one message.

## The three areas

1. **Money:** gold, the bag, the stash and the vault; trades, the market,
   shops, fees, the escrow, rewards (quests, loot, drops, the arena, races),
   refunds and restores. Ways to copy, keep twice, take without paying, pay
   without receiving, or end up with a negative balance. Races between two
   sockets of one player, two players, a leave mid-act, and a worker
   restart mid-act. Rounding and overflow.
2. **Accounts:** joining, login keys, devices and `devicelock`, passes,
   character create, restart, delete and restore, the roster, the admin
   routes, and what one player's id can make the worker do to another's
   record.
3. **Players' safety:** chat and names (the cleaner), friend requests,
   parties, duels, trades and invites (unwanted, repeated, forced), what a
   player's location or presence tells others, blocking and muting, reports,
   and words or pictures one player can make another's screen show.

## The PRs, in order

1. **Tag 5800. The review, written down. Changes no code.** New
   `docs/plan/census/RV-review.md`, one row per finding, with: area; what
   goes wrong, in plain words; the file and function (by name, not line);
   how bad (high, medium, low); and whether it's already held (name the
   test or guard), RV's to fix, another card's file (name it), or the
   owner's call (a cost, what a player sees, or a rule of play). Then the
   fix PRs it plans, grouped by file. Also commits this card and the block.
   *Done when:* every road in card E's census and every account and
   social route in the wire table has been read, and the census says so.
2. **Tags 5801 onward. The fixes, a group of files a PR**, ranked by how
   bad. For each:
   - **A suite that fails on `main` first.** Show it red on `main` and
     green with the fix, and name both runs in the PR.
   - **A kill switch** for any change an honest player could ever meet: a
     lower-case live flag, default ON, in the form `swordswing` uses. Name
     it in `server/src/testmode.js`'s header and `docs/test-mode.md`.
   - **No new writes, messages or stored shapes** (costs are the owner's).
     If a fix needs one, stop and ask.
   - **Nothing a player sees changes** unless the finding is itself
     something a player wrongly sees. If a fix changes words or what a
     screen shows, ask first.
   - `npm test` all green. Precheck may trip only its own 5-minute
     server-tests limit; say so with `npm test`'s time.

## Files held by other cards (never touch; write the finding for them)

- **K2** (session_01LccHajSFqa1x3mSaFo1v5y): `relay.js`, `send.js`,
  `flood.js`, `seathold.js`, `join.js` until its PR 10 is merged.
- **M and M2:** `src/ui/BroTown.jsx` and the two renderers in
  `src/rendering/systems/`.
- **T2:** its read sites (see `docs/plan/cards/T2.md`).
- **SEC** is done once its last PRs (#2059 to #2063) are on main; its files
  are then free.
- `.github/`, `server/wrangler.toml`, any deploy: the owner's own.

A finding in a held file goes in the census under that card's name, and
in one message to the planning session. It's not fixed by RV.

## The owner's calls (list them; never decide)

A fee or price, a new write or message pace, what a rule of play allows
(trading limits, who may duel whom), blocking or reporting features a
player sees, and anything that deletes a player's record or items.
