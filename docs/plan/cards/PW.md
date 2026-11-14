# Card PW: the power index (content)

**The owner's words (2026-11-14):** *"I think "total power" shouldn't just be a summary of the 3 combat skills but more of a "power index" score based on equipment, stat allocations, and primary combat skills that best predict generalized PVP success against a control character."* (With a leaderboard mockup whose "Total Power" column sums the melee, bow and magic numbers: card LB builds the look and reads your numbers.)

**Starts:** now. **Tags:** 5480 (PR 1), 5481 (PR 2), 5482 (PR 3); 5483 to 5499 spare. **Browser:** light (a phone test of the boards at the end). **Effort:** extra (combat's numbers, the server).
**Read first:** `server/src/leaderboard.js` (`SERIES_CATEGORIES`, `seriesValue`, `getTop`, `updatePlayer`), `server/src/boards.js`, `server/src/index.js` ~6560-6580 (what sends a board update, and when), `server/src/combat.js` and `server/src/hits.js` (the damage a player deals and takes: weapon, stats, skill level, armour, crit, speed), the stat allocations (Might, Fortitude, Vitality, Agility, Mind: find where the server stores and applies them), the gear's stats, `server/src/duel.js` and the arena (`gladiator.js`) for what a PvP fight is, `server/src/wire/http.js` (card N's wire table), `docs/GDD-AS-BUILT.md`'s combat part, and `grep -n -i "leaderboard\|power" docs/TRAPS.md docs/CLAUDE-HISTORY.md`.

## The readings chosen

- **The control character is ONE fixed reference build**, written once in a table (`POWER.CONTROL`: its level, its five stats, its gear by tier, its three skill levels), chosen as an honest mid-game character of today's game. It never changes quietly: the table has a version (`POWER.V`); a change bumps it and every score is recomputed.
- **The index is a duel's odds, not a sum.** For each of the player's three styles (melee, bow, magic), from the SERVER'S OWN combat functions (imported, never copied: rule 2): the player's expected damage a second against the control (after its armour, hit chance, crit, attack speed), the control's against the player, and each side's effective health (health, armour, regen). That gives the time each needs to beat the other. The style's score is 1,000 × (the control's time to beat you ÷ your time to beat it), raised to a power you fit (below), so the control scores exactly 1,000 and twice as strong reads clearly higher. The player's Power is his best style's score. The three per style are kept too: card LB shows them in the three columns.
- **"Best predicts":** a node duel simulator built from the same combat functions (positions simplified: say what it leaves out, ranged kiting first) plays many pairs of random honest builds across levels 1-40. Report how often the index names the winner, against how often today's "Total Power" (the sum of the three) does. Fit the exponent and any weights on one half of the pairs and report on the other. Done when the index beats the sum by a clear margin, with the numbers in the PR's words. Never fit to the owner's own character.
- **Server only.** The phone never computes it (a phone could lie); the board's row carries it. No hidden settings needed: the formula and the control are public, like a game's stats.

## PRs, in order

1. **(tag 5480) The model and its proof**, changing nothing a player sees. New `server/src/power.js` (`POWER`, `powerOf(rpg)` returning `{power, melee, bow, magic, v}`), the simulator under `server/test/` (`power.test.mjs`: the control scores 1,000; more of any stat, a better weapon or a higher skill never lowers a score; the prediction report against the sum; the break proofs: a score computed from a copied formula fails, rule 8), `docs/specs/power-index.md` (the owner's words, the control, the formula in plain words, the accuracy). Deploys the worker (`server/test/`).
2. **(tag 5481) The boards carry it.** `updatePlayer` stores `power` (and the three) on the row, and `getTop` gains `power` (the "Overall" board, sorted by it) and the five stat boards (`might`, `fortitude`, `vitality`, `agility`, `mind`, from the stored allocations: the server's word, never the phone's).
   - **No new write occasion:** the index rides on the board updates the room already sends. If a gear or stat change does not send one today, it marks the row stale and goes with the next update that does. Say in the PR how often that is. A new write pace is the owner's call: ask before adding one.
   - `cost-guard` holds the line.
   - A lower-case live flag `power` (the kill switch: the boards fall back to today's), and a cap (`caps.power`, its own line in join.js and `CAP_GATES`, TRAPS §316), so card LB's panel shows Power only against a worker that has it.
   - The HTTP rows in card N's wire table (`server/src/wire/http.js`); the storage-key registry if a key is new (`docs/ARCHITECTURE-HANDOFF.md` rule 2); the old rows filled at the next update (a row with no power reads as not yet ranked, never as 0 on top).
3. **(tag 5482) Its row in the switch table** (card T's `tools/guards/lib/switches.mjs`), if PR 2 did not already add it, and anything the gatekeeper asks.

## Not yours

The panel and its art (card LB: tell it your field names as soon as PR 1 is up, by a message to me); combat's numbers themselves (the index measures them, it never changes them: a balance change is the owner's); `GOLD_ROADS` and the doors.
