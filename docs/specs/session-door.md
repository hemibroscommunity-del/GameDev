# The session door (v2.3.4830)

Code: `server/src/leave.js`. Test: `server/test/session-door.test.mjs`.
Same shape as the gold door (`gold.js`) and the monster-hit door (`hits.js`).

## Why

"The player leaves" was written by hand in many places: the runtime's close
(`index.js webSocketClose`), the AFK sweep (`tick.js`), the flood close
(`flood.js`), the owner's kick (`admin.js`), the device / key refusal
(`devicelock.js`), the character reset (`persistence.js`), a join that threw
and the second login (`join.js`), a body take that timed out (`bodytake.js`),
and the join's refusals (`join.js`, `verify.js`). A duty added to one was
missed in another (state-machine sweep V3, S1-4).

## The door

- `_playerLeaves(ws, why)`: the only way a session leaves. `why` is a row of
  `LEAVE_WAYS`; the row says which duties run (the linger's decision, the
  save, the daily quests' flush, the body and its caches, the duel's away
  clock, the trade's cancel, the party's "away", the bot summary, PvP
  consent, the chat-mute list, `player_leave`, `player_count`, the last one
  out, the pets / codex / catches / accuracy writes).
- `session.phase`: `'open'` (socket accepted), `'joined'` (the join named the
  character), `'gone'` (the door ran). A second leave of the same socket
  runs no duty again; it only takes the session out of the map and stops the
  tick in an empty room.
- `webSocketClose` is now one line calling the door. Nothing else may call it.
- The END of a lingering body (`linger.js _lingerEnd`) is not a socket leaving
  and stays where it is.

## Step 1: nothing a player sees changes

Each row runs exactly the duties its place ran before, in the same order (the
close's body was moved line for line). The test plays every way of leaving
through its real entry point. The same plays were run against main's code
before the change, and the lists matched.

One change only shows up in a race: two leaves of the same socket at once (a
kick while the runtime's close lands) used to run the duel's clock, the
trade's cancel, `player_leave` and the rest twice. Now they run once.

The scan in the test fails:
- a call to `webSocketClose` (name your row instead);
- `sessions.delete` outside `leave.js`;
- a call to a leave duty (`_duelOnDisconnect`, `_trade2OnDisconnect`,
  `_partyOnDisconnect`, `_chatModOnClose`, `_drOnClose`, `_lingerOnClose`,
  `_sparOnLeave`) outside the door;
- `player_leave` sent from anywhere but the door, the linger's end and a
  sparring clone;
- a way a caller names that the table has not got, or a row with no caller.

## Known leftovers (not changed in step 1)

- `_lingerEnd` takes no accuracy copy (`_accDirtyCopy`), which the close
  does. The counts stay in memory (`_accBook` keeps a dirty entry) rather
  than being written when the body goes.

## The takeover's skipped duties (step 3: checked, none changed)

A second login outside a fight runs only the bot summary and the save. Each
skipped duty, checked in today's code (v2.3.4830):

| Skipped duty | Verdict |
|---|---|
| the duel's away clock | right to skip: the player is back at once, and the duel carries on (a rejoin re-sends it) |
| the trade's cancel | on purpose: a reconnect must not cancel a trade (TRAPS §162) |
| the party's "away" | right to skip: back at once |
| the daily quests' flush | not needed: the live copy is kept across the join (dailyrewards.js) |
| the chat-mute list | not needed: the join reloads it (`_chatModOnJoin`) |
| `player_leave` | not needed: the join's `player_join` for the same id follows |
| the pets / codex / catches / accuracy | not needed: each keeps its live copy across the join |
| **PvP consent** | **the owner's question**: a real disconnect clears it ("consent doesn't survive a disconnect", v2.3.1116), a second tab keeps it. Not clearly a bug: the player is back at once. |

- A join refusal (`refused`) only drops the session. `verify.js`'s refusal
  can also be reached by an already-joined session (`botsig_reverify`, off by
  default); that would leave its body in the world (sweep V3, PLAUSIBLE).
