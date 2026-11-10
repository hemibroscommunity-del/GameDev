# The state-machine sweep (2026-11-03) and its fixes (v2.3.4381)

## What it was

A "state machine" here is anything in the game that goes through steps: a
duel (asked, accepted, fighting, over), a trade window, a death (dying, dead,
standing up), a socket (connecting, joined, dropped). Many of these were
never written as one list of steps. They were spread over several true/false
fields set in different places, so two places could disagree about which step
you were in. That is where bugs hide: a duel the phone thinks is on and the
server does not, a trade window nobody can close.

On 2026-11-03 a sweep went through the code looking for these, checked each
finding, and had three reviewers read the result. It wrote a fix plan.

## Where its files are

Not on `main`. They live on the storage branch `claude/state-machine-sweep`
(pull request #1415, never to be merged), in the folder
`docs/state-machine-sweep-2026-11-03/`:

- `README.md`: what the sweep is and how its files fit together;
- `PLAN.md`: the fix plan, one item a system;
- `verified/<V>.md`: each system's checked findings (V1, V2, ... VA, VB, VC);
- `reviews/R1.md`, `R2.md`, `R3.md`: the three reviews.

The owner's readable copy is the doc "Implicit State Machines in BroTown"
(https://claude.ai/artifact/PrspeJRdJWG6ciAYtRspen).

## How to use them

Before you fix an item, read its `verified/<V>.md` and the item's bullets in
all three reviews. Then **confirm each claim in today's code first**: about 1
claim in 5 was wrong when the lanes checked, and the code has moved since.
A fix starts with a test that fails on today's code.

## What shipped (2026-11-10, pull requests #1457 to #1476)

| PR | Tag | What | Kill switch |
|----|-----|------|-------------|
| #1458 | v2.3.4361 | phantom duel: an accept waits for the server's word; a duel swing names its foe | |
| #1459 | v2.3.4362 | trade window: Leave never waits forever; a reconnect keeps a live window | |
| #1457 | v2.3.4363 | the phone never plays a death on its own; one stand-up | |
| #1460 | v2.3.4364 | loot piles on the server's clock (`workerClock.js`); one mayAsk for hand and pet | |
| #1462 | v2.3.4365 | block list: one writer, one table (`blockedAsks.js`); Block stops direct messages | |
| #1461 | v2.3.4366 | dungeon opening ignores a second Enter; one farm trip (`farmTrip.js`) | |
| #1463 | v2.3.4367 | one socket at a time (`socketLine.js`); the "Reconnecting" cover re-checks under the loading screen | |
| #1465 | v2.3.4368 | looks: one head-key builder; chained body retry; eyewear and eye-style "ready" | |
| #1464 | v2.3.4369 | General Store sell tap: one at a time, no old pick (a stop-gap) | |
| #1466 | v2.3.4370 | the ground helper: a failed start retries (`startFetch.js`) | |
| #1468 | v2.3.4371 | a dueller who leaves the zone forfeits after 15 s | `duelzone` |
| #1476 | v2.3.4372 | the points reset's minute survives a rejoin | `pointsresetroom` |
| #1470 | v2.3.4373 | "dead" is the server's word | `serverdead` |
| #1469 | v2.3.4374 | a join at 0 health stands up in BroTown | `joinstandup` |
| #1467 | v2.3.4375 | the old gift trade is closed while the trade window is on | `giftclosed` |
| #1471 | v2.3.4376 | the kill switches load before any web request | (none, on purpose) |
| #1472 | v2.3.4377 | a takeover saves what a close would save | `takeoversave` |
| #1474 | v2.3.4378 | a never-seen party leader's idle clock | `leaderidleat` |
| #1475 | v2.3.4379 | the anti-bot record of a live player is never evicted | `botrecordkeep` |
| #1473 | v2.3.4380 | old skill tracks frozen under prog3: no heal on a forged rise | `skillfreeze` |

A kill switch is a live flag: setting it to `false` brings back the old
behaviour without a deploy. The lessons are in `docs/TRAPS.md` §262-278.

## What is left

This is a list, not a promise. The plan is `PLAN.md` on the storage branch.

**In flight on 2026-11-10:** the rejoin re-sending a live duel and trade
(v2.3.4382); a death pile's windows sent as time left (v2.3.4383).

**Not started, no decision needed:** rare armour lost on the phone after a
reconnect (V9b); quest and gear predictions the server refuses without a word
(V9a, V9b); friend requests (V12); a monster's life across deaths (V7); the
shield's kept parts (V10); art loads and the renderer's rebuilds (V17a,
V17b); the small-bugs bundles (VA, VB, VC); the General Store's request
timeout (V8a); the feedback board's typed id (VA); dungeon ids made up on the
phone (V1, V6); the money-in-one-write items (V8a, V8b).

**Waiting on the owner:**
- a second tab in the middle of a fight, and two characters in two tabs (V3, V5);
- whether forging, hardening and equipping count as leaving a fight (V21);
- the farm's two phone-only workshops (V9c);
- a server-side "entering" grace for the dungeon's loading screen (V11; TRAPS §262);
- showing the guard break on the phone (V10);
- a death pile surviving a server restart (V22);
- a monster's pile: 30 or 60 seconds;
- hiding a blocked player's attack warning;
- a grace period for a trade that loses its server.

**Already red on `main`, not the lanes' doing (2026-11-10):**
- `node tools/world/test-world-core.mjs --check` fails 2 of 540 (the Town
  Hall window, the forge room's stage);
- `mp-farmmusic` step 4 (the frost land's music after the farm gate);
- `node tools/art/head-bake.mjs --check` listed 49 stale head sheets on the
  orchestrator's machine, the same on `main` before any lane. Unconfirmed: it
  may be that machine's picture encoder.

## How the lanes were run (for the next orchestrator)

1. **One system a lane, one pull request.** The brief points at
   `verified/<V>.md` and the item's review bullets instead of pasting them,
   and the lane confirms each claim before fixing it.
2. **A test that fails before and passes after.** Node tests in
   `server/test/`, not phone scenarios, wherever node can reach the code.
3. **Lanes never collide.** They never append to `docs/TRAPS.md` or
   `server/test/liveops.test.mjs` (each put its lesson under "For TRAPS" in
   its pull request body), never put a new import in the middle of a block,
   and are told which lines sibling lanes touch. Before anything merges, the
   orchestrator merges every open lane branch together, in both orders, in a
   scratch `git worktree`, and runs precheck and the server suite on the
   result.
4. **Lanes do not message the orchestrator.** It checks each wave once.
5. **The reviewer reads every diff.** It caught a brief of the orchestrator's
   own that would have hidden live trades on a reconnect (TRAPS §278).

And: every merge with a file under `server/` deploys the worker, a test
included (TRAPS §277). Merge a batch together, in a quiet hour.
