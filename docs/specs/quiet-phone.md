# The quiet phone: every message counts (v2.3.3254)

> Owner, 2026-10-14: *"I want you to cut as much as you possibly can IF the
> loss in quality is negligible or unnoticeable."*

## Why

The account is on Cloudflare's free plan, which allows 100,000 Durable Object
requests a day for the whole account, the game's included. Every message a
phone sends to the game's server may count as one of those requests. Whether
the daily limit counts each one, or 20 to a request as the bill does, is what
the lab's limit test answers (`docs/specs/cloudflare-lab.md`). The game's
busiest day so far (2026-10-11, a playtest of about an hour) was 76,277
messages and calls.

Messages the server sends OUT are free. Only what phones send IN counts, and
until now a phone sent a lot of it with nothing new in it.

## What a phone sent, and what it sends now

Measured on a real game page (`tools/qa/mp/mp-quietphone.mjs`), against main
(fe8b7f8d6) and this branch, counting every frame on the page's socket.

| What the phone is doing | main | quiet phone | on a real phone (est.) |
|---|---|---|---|
| Standing still, another player beside it, 16 s | 29 frames, 1.79 a second (15 keepalive moves, 7 looks, 7 ping answers) | 4 frames, 0.25 a second | ~1.8 -> ~0.2 a second |
| Walking straight beside another player | 11.2 a second, 4 of them a look or a ping answer alone | 10.5 a second, none alone | ~15.8 -> ~15 |
| Turning all the time beside another player | 20.5 a second (every batch this box manages) | 17.5 (the same: every batch) | ~30.8 -> ~30 |
| Turning all the time, nobody within 2,400 px | 18.2 a second | 11.7 (one every 66 ms) | ~30.8 -> ~15 |
| A damage claim with a move waiting | 2 frames | 1 frame | |
| Harvesting (standing) | a move every 0.5 s, + the above | none of that | ~3.3 -> ~0.2-0.7 |

This box draws the game in software, so its page timers run slower than a
phone's; the last column is the same rules at a phone's 30 batches a second.

## The changes, and why nobody would see them

1. **One frame a moment** (`caps.bundle`, `server/src/bundle.js`). Everything
   the phone sends in one turn of its loop -- a move, the swing beside it, the
   damage it claims -- now goes as ONE frame: a JSON array the server takes
   message by message, exactly as if each had come alone. Nothing is sent later
   than before: the frame goes at the end of the same turn
   (`wsClient.js wsOut`, a microtask). `quiet-phone.test.mjs` runs two rooms
   in lockstep, one sent each message alone and one the same messages bundled,
   and checks every player's state and every message out are identical.

2. **Riders.** What is not urgent waits for the next frame going anyway:
   - **The ping's answer** (the server pings every ~3 s to measure the round
     trip, which lag compensation uses in fights between players). It rides,
     saying how long it waited (`hd`), so the measurement is still exact. A
     phone with nothing else to send answers one ping in four: its round trip
     matters only for hits between players, and a phone sending nothing is not
     in one.
   - **The look** (`track`, built every 2 s: hair, clothes, gear, level, HP,
     the inspect card's numbers). What is NEWS to the others -- a hat, a
     shield, the away flag -- goes at once, by the server's own rule for what
     it relays (`lookrelay.js LOOK_RELAY`; the test replays 3,000 random looks
     and checks the phone never holds back one the server would relay). The
     rest (where you stand, your HP, kill counts) rides, or goes alone every
     30 s -- the server logs out a player whose last sign of a thumb is two
     minutes old, and a look with `aw: 0` is that sign.
   - **The tree you chop** (re-sent every 2 s for a watcher who arrives
     mid-chop): rides, never later than before.

3. **Standing still.** A standing phone sent its whole move once a second (the
   v2.3.1107 keepalive), and twice a second while gathering (the v2.3.1092
   harvest heartbeat). Both healed another phone that missed something -- which
   the server's own roster has done every second since v2.3.1112, near players
   whole. Now: one copy 1 s after you stop (it heals a last step the server
   refused, as the keepalive did), then one every 10 s; no harvest heartbeat
   (the server stamps a harvest only on its start, so the repeats did
   nothing there). A death, a gear change, and a place or zone changed with
   no thumb on the stick (a snap onto a harvest's stance, a shove, a door's
   arrival) go at once, faster than the keepalive carried them. The other player in the test still saw the standing
   phone 17 times in 16 s.

4. **Moves with nobody near.** A phone sends every 33 ms while another player
   shares its zone, every 66 ms alone (v2.3.1635, and v2.3.1767: "raise the
   floor everywhere", the owner's call after monsters rubber-banded at 198
   ms). The Wheel is one zone, so one player anywhere in it meant 33 ms -- for
   nobody: the server sends a player's moves only to phones within 2,400 px.
   Now 33 ms only with a player within 2,400 px (and in an arena match), 66
   ms otherwise: the rate a phone alone in its zone has always used, monsters
   included.

5. **A steady walk, anywhere.** v2.3.3204 held a steady walk to 66 ms on the
   safe ground only. Now anywhere in the Wheel, still only out of a fight (no
   lock, no attack held, no duel or match) and not with a player near you who
   may fight you there (No man's land's own rule, `nmlCanAttack`): their hits
   are judged against where the server has you. The other players draw a
   steady walker the same either way (`move-diet.test.mjs`).

## What was NOT cut, and why

- **Moves in a fight beside another player** stay at 33 ms. Monsters chase
  and players hit the server's copy of you; halving its updates there is a
  change someone could feel.
- **The open world map's heartbeat** (every 4 s while open): the server's
  watch lasts 8 s, so it goes as before -- in one frame with anything else
  sent at that moment, never waiting.
- **Longer holds of a steady walk** (past 66 ms): the other phones treat a
  player with no update for 150 ms as standing (entityRenderer
  `STALE_UPDATE_MS`), so a longer hold would make walkers stutter.

## Safety

- **Deploy order.** The phone bundles only against a worker that advertises
  `caps.bundle`, and is quiet only against one that advertises `caps.quiet`,
  and only once THAT socket's `state_sync` has said so: the last worker's caps
  stay on the phone until the new one's arrive, and a reconnect may be to an
  older worker (a rollback), whose catch-all would relay an array to the whole
  room. Between a socket's open and its `state_sync` every message goes alone
  and nothing rides (wsClient.js `_capsHere`).
- **Kill switches.** `bundle: false` and `quiet: false` in the live flags stop
  advertising them; each phone is as before from its next join. The worker
  always TAKES a bundle, so a phone that joined before the switch keeps
  working.
- **A frame stays under the 16 KB gate**: at most 24 messages and 15,000
  characters (`framesOf`); a bigger message goes alone, as it always did.

## Each part finishes before the next (v2.3.3291)

Found by the architecture review (2026-10-17). A bundle was meant to be taken
"as if each message had come alone", and for most messages it was. For twenty
it was not, and a script could use that to be paid many times for one thing.

- **Why frames were safe and bundles were not.** A frame of its own is one
  event. While that event waits on storage, the Durable Object holds the next
  frame back (the input gate, handoff rule 9). So one player's two messages
  never read the same record at the same moment. A bundle's parts are ONE
  event, so the gate keeps nothing apart inside it.
- **What went wrong.** The bundle loop waited for `_onMessage`, but twenty of
  its cases started their handler and did not wait for it: the farm (open,
  act, order, buy), the shop (list, quote, sell, buy), the daily chest and
  daily rewards (5), the capes (2), and the auction house's threads and offers
  (5). Their parts ran side by side, each reading its record before any had
  written it back.
- **Measured on the real room code**, with a storage that answers a little
  late and hands back copies, as Cloudflare's does:

  | One bundle of 24 | Before | After (and as 24 frames) |
  |---|---|---|
  | harvests of one ripe bed | 48 carrots | 2 |
  | sales of the same 10 copper ore | 24 sales, 4,320 gold | 1 sale, 180 gold |
  | buys out of a pile of one | 24 ore | 1 |

  Even with a storage that answers at once, a bundle of 4 harvests paid
  double.
- **The fix.** Every case in `_onMessage` now awaits (or returns) its handler
  in the statement that calls it, so a part has finished before the next
  begins. Errors are caught where they were caught before; the auction house's
  five, which caught nothing, now log their throw. Nothing on the wire changed,
  and no phone needs an update.
- **One call is left running on purpose:** `reportToLeaderboard`, a
  cross-object fetch that moves no value and has its own 5-minute clock.
  Awaited, every bundle carrying a `track` would wait out a network round trip
  before its next part.
- **The rule for new cases:** call an async handler as
  `await this._handleX(...)`, in the case itself. Keeping its promise in a
  variable, or attaching only a `.catch`, starts the race again, and
  `quiet-phone.test` §9 fails on it.

## Tests

- `server/test/quiet-phone.test.mjs` (64): two rooms in lockstep (bundled and
  not: the same states, AFK clocks, round trips and messages out); what a
  bundle may not carry, and one message that throws not stopping the rest; the
  ping's `hd`; the caps and switches; every number
  pinned to the server's (NEAR_R, BUNDLE_MAX, the frame gate, LOOK_RELAY, the
  move gaps, the map heartbeat); the phone's rules; the game's files calling
  them. v2.3.3291: §8, the three bundles in the table above on a late,
  copying storage, plus a bundle keeping its order; §9, a scan of
  `_onMessage` that fails on any async handler not awaited where it is
  called. Put the farm's `await` back to a bare call and both fail (48
  carrots; four calls named).
- `tools/qa/mp/mp-quietphone.mjs` (8): the table above, on a real page.
- Re-run on this build: mp-movediet, mp-farpeer, mp-presence2, mp-afk,
  mp-sprint, mp-sprintpeer, mp-solorate, mp-recoverpay, mp-elemhits,
  mp-dashhit, mp-gatherhits, mp-wheelnodes, mp-nomansland, mp-questline,
  mp-wheelhome.
