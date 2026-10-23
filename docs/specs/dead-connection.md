# A lost connection is noticed, and nothing the worker settles is lost to it (v2.3.3034)

> *"Logs aren't going to the inventory after getting chopped, and points in point
> stat allocation menu weren't getting allocated. It was a game where screen had
> gone black then came back from low memory if that matters."* -- the owner,
> 2026-10-05. And of the harvest bar: *"right now the bar has no numbers."*

## What was happening

A chop and a point spend are both things the client sends and the **worker**
settles: `node_strike` pays the log, `prog3_allocate` spends the point. Both go
through the channel shim (`wsClient.js` `channelShim.send`), which drops anything
sent while the socket is not open, and both are silent when they do not arrive.

`tools/qa/mp/mp-recoverpay.mjs` plays each way a session comes back from a black
screen, on a phone in the Wheel, and asks the worker what it settled. Against
main's build:

| What happened to the session | Chop paid | Point spent |
|---|---|---|
| none (the baseline) | yes | yes |
| the renderer rebuilt in place (the watchdog's first answer) | yes | yes |
| the recovery reload (its second) | yes | yes |
| the graphics context lost and restored (an iOS reset) | yes | yes |
| **the idle logout** (two minutes with no touch) | **no** | **no** |
| **a dead pipe** (the network under the socket gone) | **no** | **no** |

So the black-screen recovery itself was fine. What loses both is a connection
that is gone while the game plays on:

- **The idle logout** (v2.3.1913) hangs up after two minutes without a touch,
  for a tab nobody is at. It shows a banner and nothing else: no veil, the world
  still drawn, the game still running. A black screen waited out for two minutes
  is exactly that, and so was **two minutes of walking with a thumb held on the
  stick**: the idle clock was stamped by a touch going down, and a held stick
  fires none.
- **A dead pipe**: under memory pressure or a frozen page, a phone can lose the
  network under an open socket without telling the page. The socket still reads
  OPEN, every send vanishes, nothing comes in. Twenty seconds into one, main's
  page still read "connected", and nothing ever looked.

Either way the harvest's `extraction_start` never reached the worker, so no hits
came back. After `GATHER_HIT_PLAN_WAIT_MS` the harvest fell back to the old timer,
whose bar has **no numbers** (the owner's other report). Its log still flew into
the bag, because the client predicts that. The strike went nowhere, and every
point "spent" went nowhere too.

## What changed

**1. A dead pipe is noticed** (`wsClient.js` `_aliveTimer`). The worker pings
every ~3 s (`tick.js` `_tickPingAndAfk`), so silence is evidence. The socket
counts as dead after either of these, while the page is visible and running:

- `DEAD_PIPE_MS`: 15 s with no frame at all;
- `SETTLE_SILENT_MS`: 7 s after an action the worker settles and answers (a
  strike, a start, a spend, a cook) with no frame since.

A dead socket is rejoined the way a long freeze already was (v2.3.778): the
handlers come off, it is closed, and a fresh socket joins. That surgery is now
one function, `_forceRejoin`. The page's own freeze is not the socket's silence:
a gap in the 1 s timer restarts both windows from now. It never erases them,
because a strike sent just before a freeze is exactly the one that can be lost.

**2. A strike that went down the dead pipe is sent again after the rejoin**,
when nothing at all came in after it (`_lastStrike.answered`). A strike that had
no socket to carry it is held the same way (`_holdForRejoin`, flushed on the next
`state_sync`). Replaying is safe for strikes only:

- the worker pays a strike it holds no extraction record for (`gathering.js`:
  "permissive on missing extraction state"), from where the rejoin put you;
- a node is paid once, so a strike that also got through is refused as
  `node-already-dead`, never paid twice.

A point spend is **not** replayed: each one spends a point, so one that did get
through would spend two.

**3. The idle logout comes back on the first touch** (`_armComeBack`). The banner
and its "I'm back" button stay, but any touch or key now means "I'm back": a
connect starts on the spot, and the banner goes on the next `state_sync`. The
abandoned tab the logout exists for never touches anything, so it stays out
(`mp-afk`: "it does NOT quietly reconnect behind the banner"). And **a thumb held
on the stick counts as being there** (`BroTown.jsx`: `S.stickX || S.stickY`
stamps `_lastInputAt` every frame).

**4. Nothing the worker settles is started while it cannot hear you.**

- `combatHelpers.js` `offlineRefused(S)`, beside `swimRefused`: a harvest on a
  node the worker owns, or a cook, is refused when the socket is not live.
  "Reconnecting…" shows over your head ("Playing in another window" when another
  window has the character), and `channelShim.reconnectNow()` brings the session
  back if that is ours to do. The touch that tapped the tree is usually the one
  that already started the reconnect.
- The Points window (`HeroExpanded.jsx` `spendFor`) shows the same reason on its
  greyed button ("Reconnecting to the server. Try again in a moment."), and its
  `run` sends nothing into a dead socket.

## Not changed

- The worker: no wire change, no new message.
- The `superseded` banner ("This account connected from another window") still
  waits for its button. A tap on a tree there says so instead of taking the
  character back from the other window.
- The recovery paths themselves (rebuild, reload, context restore): measured
  correct, untouched.

## Checked by

`mp-recoverpay` (phone, the Wheel, a TCP relay in front of the worker that can
black-hole the connection under an open socket):

- A-C: the rebuild, the reload and a context loss each still settle a chop and a
  spend, on the worker's hits;
- F: a stick held through a backdated idle clock is no logout;
- D: the idle logout logs out and says so; a tree tapped while out is refused
  with "Reconnecting…"; that touch brings the session back; then a chop and a
  spend settle;
- E: the pipe frozen with a chop's window open: the page notices, rejoins on a
  live socket, and the worker pays that very strike; then a spend settles.

Also `mp-afk` (an abandoned tab stays out; the button brings it back) and
`mp-chopyield`.

## v2.3.3582: Diego's shop asks again after a rejoin

> *"Yes fix the bug in separate pr"* -- the owner, 2026-10-23, of the gap
> found moving `mp-shopkeeper` to the world (v2.3.3580).

### What was happening

The idle logout's banner says any touch brings you back (`_armComeBack`), so
with Diego's shop open, the tap that ends the logout is usually a tap ON the
shop. That one tap does two things at once: it reconnects, and it chooses an
item or presses SELL / BUY. The shop's message goes out while the new socket is
still opening or joining, and is lost twice over:

- the phone drops a send on a socket that is not open (`channelShim.send`);
- the worker takes nothing but `join` from a socket that has not joined
  (`index.js`, `!session.id`).

Every number in the shop is an answer to an ask (it holds no price table, by
design), and nothing asked again:

| The tap that ended the logout | Main's build |
|---|---|
| on an item | its price stayed "…" until another tap |
| on SELL or BUY | the button stayed **dead** until the shop was closed: `shopBus.busy` waited for an answer to a trade that was never sent |

### What changed

When a join lands (`state_sync`, which only a join sends), wsClient calls
`shopBus.rejoined()`. With the shop open, it:

- asks again for the list (the per-slot prices on your bag) and for the price of
  the item you chose. The drawer's two asks depend on `shopBus.joins`, as they
  already did on `settled`;
- lets go of the price it held, as the pile may have moved while you were out;
- lets go of the trade's wait.

**A trade is never sent again by itself.** A tap on SELL that only brought you
back sells nothing, and the next tap sells. A trade the worker settled before the
socket died is already in the bag the join echoes. This follows
`_holdForRejoin`'s rule: strikes only, never a spend.

The worker is unchanged. No new message.

### Checked by

`mp-shoprejoin` (a phone in the world's BroTown; the page's own `idleLogout()`,
the path two idle minutes take):

1. a real tap on SELL ends the logout: nothing sold, SELL live again with a
   fresh price, the next tap sells for exactly that price;
2. an item chosen while logged out (the bag tile's own pointerup, which is no
   "I'm back"), then a key brings you back: its price arrives;
3. a real tap on the item ends the logout: its price arrives.

16 of 16 with the fix. Against main's build 12 of 16: step 1's live SELL and its
next sale, step 2's price and step 3's price all fail. On this box the join
always took longer than the price's 140 ms wait, so even the plain tap lost its
price. On a fast connection step 3 can pass on main by luck; steps 1 and 2
cannot.
