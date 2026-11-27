# Card SHOP-gearbag: the phone's gear bag reads the worker's copy (card SHOP, part 2; one PR)

Model and effort: the card's session as the orchestrator started it (part 37, session_01LccHajW9zn1bth8aMvQ7zb). Tag: 6801, from SHOP's block (6800 to 6819). Branch `claude/plan-shop-2-gearbag` from `main` (5ab943fec1b7a7b2c743fd507872b3707a8f017d). ONE draft PR, base main. It goes through the gatekeeper's full check (it touches `src/networking/`): never the fast lane. A question that blocks the session, and its ONE ready message, go to the orchestrator by `send_message`; never to any other session. You commit this card as `docs/plan/cards/SHOP-gearbag.md` and `docs/plan/status/SHOP-gearbag.md` rides the work's commit.

Read first (they bind): `CLAUDE.md`, the ten rules at the top of part 5 of `docs/GRAND-PLAN.md`, the session prompt at `docs/GRAND-PLAN.md` line 1696, `docs/plan/README.md`, `docs/plan/finish.md` parts 5 and 6, `docs/ARCHITECTURE-HANDOFF.md` (rules 19 and 20 above all) and `docs/specs/gear-stash.md` (line 328 lists this gap as open).

## The bug

A bug in how the game behaves, on main, no card owned it (`docs/plan/debts.md` "Found (no card's debt)", first bullet): the phone's gear bag never reads the worker's copy. The phone adds a piece of armour, legs, cosmetic gear or an amulet only from the one reply that brought it (chest, forge, quest, loot, mail). If the line drops before that reply, the player has paid and the worker holds the piece, but the phone never shows it, even after a reload; the player cannot wear it, yet a No man's land death can still take it. The shop's SHIELD had this gap and #2400 (tag 6800, on main) mended it for the shield only.

## Purpose

A piece the worker holds is in the phone's bag after the next `player_state`, whichever reply was lost, and never twice.

## The map (a reading lane's, of main at the branch point; check each line before leaning on it)

- The worker ALREADY sends all five lists in every `player_state`, the full one after a join included: `server/src/persistence.js` about 831 to 835 (`armorStash`, `legsStash`, `shieldStash`, `gearStash` the COSMETIC list, `amuletStash`; armour and legs through `revealPublicList`, so an unrevealed piece is a "?"). `state_sync` carries none, and a join is followed by a full `player_state` (`join.js` about 2187). The phone reads only `weaponStash` (`src/networking/wsClient.js` about 3185) and, since #2400, the shields.
- The shield's mend is the model: `src/game/shieldAdopt.js` (pure, no imports: `adoptHeldShields` adds by gid and never takes; an old copy with no gid and the same signature counts once; `adoptStateShields(S, payload)` gated on the cap, in a try), called in wsClient.js's `player_state` case about 3137 and from `gameEvents.js`. Its suite: `server/test/shop.test.mjs`, "A LOST ANSWER LOSES NOTHING".
- The lists' names and shapes: `server/src/gearstash.js` about 104 (`GEAR_STASH_FIELDS`), `sanitizeGearPiece` about 207 (`name, gearBase, tier, tierMult, quality, gid, slot`), a cosmetic entry `{slot, gearId, name}`; caps 48 and 32.
- The phone's adds, each only from its own reply: chest wsClient.js about 2173 and forge about 2429 (both `_applyLootCredit`, body about 4313, its key about 4412); quest about 3796 to 3860 (it has a by-gid replay guard); loot about 2044; mail `gameEvents.js` about 2122 (pushes with NO gid check). The phone also SENDS its lists as the join's seeds (wsClient.js about 679, `_stashSeed`), and the worker merges them (`gearstash.js mergeStashLists`): read that before deciding what "the worker's copy" means for a piece the phone has and the echo lacks.
- `forge_armor_result` has no reqId (`armorforge.js` about 115) and a re-sent chest open is answered only while `_reqRecall` holds it: those are WHY a reply is lost; adopting from `player_state` cures every road at once.

## What to build (the readings are chosen; do not widen them)

1. A rule under `src/game/` (pure, node-testable; generalise `shieldAdopt.js` or sit beside it, the shield's behaviour and its suite unchanged): the phone's bag ADOPTS the worker's armour, legs, cosmetic and amulet lists from `player_state`: add what the worker holds and the phone lacks; NEVER take (a piece leaves the phone's bag only by today's roads); never past a list's cap; an unrevealed piece stays unrevealed and is not doubled when it is later revealed.
2. ONE WAY IN: every reply-driven add (chest, forge, quest, loot, mail) and the adopt put a piece in through that one rule, which refuses a second copy of a gid, so the reply and the echo may arrive in either order and the piece is there once. Mail's unguarded push goes through it too.
3. wsClient.js and gameEvents.js gain calls, not logic (finish.md part 5, rule 5).
4. If the mend needs NO worker change, it is phone-only: it lands ON by default with a `?gearadopt=0` off-ramp (its row in the switch table). If it truly needs one (a field, a reqId), that is a new cap on its OWN new line in `join.js`'s `caps` and in `CAP_GATES`, a lower-case live flag as its kill switch, and the orchestrator is told BEFORE it is written: it restarts the game server when it lands.
5. Its suite (finish.md part 5, rules 1 and 2: it runs the rule and the real handlers, never a pattern of text). THE DODGES, each planted and seen RED, each named in the ready message: (a) the adopt left out for ONE list (four plants: armour, legs, cosmetic, amulet); (b) a piece that comes by its reply AND by the echo counted twice, the reply first, and the echo first; (c) the adopt takes a piece the phone holds and the echo lacks; (d) an old copy with no gid doubled by its echo with a gid; (e) the cap passed by the adopt; (f) an unrevealed "?" piece revealed, or doubled at its reveal; (g) a worn piece also put in the bag; (h) mail's piece pushed past the rule; (i) the lost reply itself, for chest and for forge: the reply never arrives, the next `player_state` does, the piece is in the bag, and it survives a rejoin with the phone's own seed. A mutation run over the rule's added lines: every mutant killed, or the survivor listed with why.
6. A phone test `tools/qa/mp/mp-gearadopt.mjs` (`world: 'wheel'`, its `lane` named; a record put on file first holds a piece the phone lacks; after the join the bag shows it, once; a second join shows it once).

## The laws that apply

The server is the authority (CLAUDE.md section 5); `STASH_ROADS` and its door are the worker's and no second writer is added; maps keyed by a gid are a `Map` or `Object.create(null)`; a new `?name=` gets its switch row; the same-change checklist's rows for a switch and a phone test.

## Files

`src/game/` (the rule), `src/networking/wsClient.js` and `gameEvents.js` (calls only; read by range, never whole), the suite, the phone test, the switch table, `docs/specs/gear-stash.md` (line 328 closed, in the spec's own words), `docs/plan/debts.md` (the Found bullet marked mended, one line). A file outside these that the job truly needs: ask first, one message, the recommendation in it. Never `.github/` or `server/wrangler.toml`.

## Rules of this phase

Every phone test passes `world: 'wheel'`. THE LAST PHONE RUN IS ON THE FINAL CODE. More than three scenario runs, or any repeat run, go to helper sessions on `claude-haiku-5-5`, effort low (a helper changes no file, has leave to fetch, sends back only PASS and FAIL lines). Precheck before every push; push when the PR's line is done, not before; merge `origin/main` once, before the last push. ONE wait for the checks (`test`, `playable`, `memory-budget`, `lint-build`), never a poll. Hand over at 250,000 tokens of memory (`get_session`, `context_usage.used_tokens`). Read by range, at most 60 lines of a big file at a time. Output to a file; print only FAIL lines and totals. No reply to a message that asks none.

## Done when

ONE message to the orchestrator: the PR's number, FULL head, base, the four checks; whether any file under `server/` changed (and so whether its merge restarts the game server); each dodge now red, named; what the OWNER SEES, in plain words; anything chosen that a player sees (theirs to change); the runs on the final code; anything found outside the card (reported, not mended). Then stop.
