# Room full — telling the 61st player why (v2.3.1982)

Spec for the admission refusal at the player cap. Companion code:
`server/src/join.js` (`_roomCap`, `_roomFullRefusal`), `server/src/index.js`
(the `fetch()` gate), `src/networking/wsClient.js` (the retry loop),
`src/ui/RoomFullScreen.js` (the screen). Tests:
`server/test/roomfull.test.mjs`, `tools/qa/mp/mp-roomfull.mjs`.

## The failure this replaces

`GameRoom.fetch()` has always refused a joiner past `MAX_PLAYERS` (60) with

```js
return new Response('Room full', { status: 503 });
```

— returned **before** the WebSocket upgrade. A browser surfaces a failed
handshake as nothing at all: no body, no close code, no distinguishing
signal. `wsClient`'s `onclose` therefore could not tell a full world from a
dropped cell connection, so it fell into the ordinary reconnect backoff and
retried every ~10 seconds forever, behind a loading screen that never said
a word. Measured by the headless capacity campaign and left unfixed. To the
player the game is simply broken, with no idea whether waiting helps.

## The cap is not the bug

Do **not** raise it. The same campaign measured the worker at **0.16 ms of
its 22 ms tick** with 60 players (`server/test/load-crowd.mjs`) — CPU is
nowhere near the wall. What binds is per-client **download bandwidth**:
roughly **4 KB/s per co-located moving peer**, so about 20 people in one
zone before an iPhone on cellular suffers (`tools/qa/mp/mp-crowd.mjs`).
Sixty is a receiver-side number. The fix is a message.

## Wire surface

| Direction | Shape | Notes |
|---|---|---|
| c→s | `GET /ws?room=<id>&rf=1` | `rf=1` opts this client in to the wire refusal |
| s→c | `{type:'room_full', reason:'full', count, cap, retryMs}` | then `close(4009, 'room full')` |

- `count` is **sockets**, not `getPlayerCount()`. The cap counts sockets, and
  a connection that has not sent `join` yet is a player walking through the
  door. Telling someone we just turned away that the world holds "59 of 60"
  reads as a broken refusal.
- `retryMs` (5000) is the cadence the worker asks for; the client clamps it
  to [2s, 30s] and jitters it. It exists so a future worker can slow a herd
  down without a client deploy.
- `room_full` is in `PRIVILEGED_EVENTS` (handoff rule 13). A forged one would
  put "the world is full" in front of everyone in the room — a one-message
  denial of service on demo day.
- Close code **4009** joins 4003 auth / 4004 frozen / 4005 reset / 4006 idle /
  4008 admin-kick.

## Deploy-order safety (handoff rule 19)

The capability is advertised on the **URL**, not in `state_sync.caps`, and
that is forced: caps ride in `state_sync`, which a refused joiner by
definition never receives — there is no session to advertise into.

- **New client + old worker** — the `rf` param is ignored, the handshake
  fails as it always did, and the client falls back to today's silent retry.
  It paints the screen only on an explicit signal (the message or 4009).
- **Old client + new worker** — no `rf=1`, so it gets the byte-identical
  `503 Room full`. This half is load-bearing, not cosmetic: an old client
  that received a `join_rejected` with an unknown reason sets
  `_joinRejectedFatal` and **stops retrying altogether** (v2.3.1181), which
  is strictly worse than the silent loop. That is why the refusal is a NEW
  message type on an opt-in channel rather than a new `join_rejected` reason.

## The client half

`wsClient.js` records the refusal (`_rfPending`) from the message, and the
`onclose` that follows accepts **either** signal — the pending record or code
4009 — because either alone is enough to know, and a lost message must not
drop the player back into the anonymous loop this exists to replace. Unlike
the frozen / character-reset branches it does not stop: it schedules the next
attempt and paints `RoomFullScreen`.

`state_sync` — the first message only an admitted session receives — is what
takes the screen down. Entry is automatic: no tap, no reload.

### Why a fixed cadence and not backoff

Exponential backoff protects a server that is struggling. A full room is not
struggling (0.16 ms/22 ms), and a refusal costs it a handshake, not a tick —
the limit is the *player's* download, and a waiting player is downloading
nothing. What backoff would buy is a worse product: at a 10 s+ delay a freed
slot sits empty while the person who has waited longest happens to be
mid-sleep, so who gets in becomes arbitrary. So: a **fixed ~5 s cadence with
±20 % jitter**. The jitter is the part that matters at scale — after a worker
deploy every waiter is released at the same instant, and a lockstep herd
would re-collide on every retry with the same losers losing each time.

### The screen

Plain DOM on `document.body` at z-index 100002, not React — the same
reasoning `showResumeBanner` records: the refusal arrives from an `onclose`
that can fire at any phase, including while the intro overlay covers the
viewport and while the React tree is still mounting. It says the world is
full, names the numbers, counts down to the next attempt, shows how many
times it has checked, and offers a "Try now" button. The turning ring is a
CSS transform animation on purpose: the screen goes up while the boot is
still baking every global animation, and a main thread inside that work
cannot run a 1 s interval — the compositor keeps the ring moving anyway, so
it never reads as frozen. Sized for iPhone Safari at 390×844.

## Operating it

`max_players` (live-ops flag, liveops.md) lowers the cap without a deploy,
clamped [1, MAX_PLAYERS] at read so it can never raise it. That is also how
the case is tested without 61 browsers: one player in the room plus a cap of
1 **is** the 61st-player condition, on the same code path.
