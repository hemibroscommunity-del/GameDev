# The phone's game socket: one line at a time (v2.3.4367)

> From the state-machine sweep of 2026-11-03 (V4, the phone's socket; plan
> reviews R1-R3, item 16). Phone side only: the worker is unchanged.

## What a player met

Each phone keeps one socket (a live line) to the game room. Opening,
retrying and closing it happened in a dozen places in
`src/networking/wsClient.js`, and only some of them closed the old line
first. No handler asked whether its line was still the current one.

- Tapping **Try now** on the "BroTown is full" screen while the automatic try
  was still connecting (the screen reads "Looking for a spot..." from the
  moment it starts) left a stray line. Later it knocked the live one off: the
  full-world screen came back over a world the bro was already in, or a false
  "This account connected from another window" banner appeared, with the
  dead-connection watch switched off until the next reconnect.
- A drop just as the loading screen lifted left a frozen world with no
  message: the veil's timer saw the loading screen and quit for good, and the
  loading screen only ever narrates the first wait.

## What changed

1. **`connect()` retires the line it replaces itself** (`retireSocket`,
   `src/game/socketLine.js`: the four handlers off, then closed). Every road
   that connects goes through it: Try now and the room-full timer, the linger
   and lockout waits, the key door-ask, the account check's token, a tab
   return (also one that finds the line CLOSING), the backoff. The effect's
   cleanup retires its socket the same way.
2. **Each handler asks first** `if (sock !== ws) return;` (onopen, onmessage,
   onclose, onerror), so a replaced line can neither send a join, paint a
   banner, nor arm a reconnect.
3. **state_sync writes 'connected'** as well as onopen, so a stray
   'superseded' heals at the next sync.
4. **The veil looks again** every half second while the loading screen is up
   (`serverReady.js` `_veilDue`), instead of quitting. A ready state_sync
   clears that timer, so an ordinary login never shows the veil.

Try now during a connect now cancels that try and starts a fresh one (one line
either way). Making it do nothing while a try connects is a nicety left for
later.

## The lesson

A socket handler is a closure over a variable (`ws`) that someone else can
reassign. A handler that reads `ws` rather than its own socket acts for
whichever line is current, and a handler left on a replaced line acts on the
live world. So: one function makes a line and retires the old one (handlers
off BEFORE the close: a close event can arrive seconds later), and every
handler checks it is still current. Do not add a `new WebSocket` anywhere else.

## How it is checked

`server/test/socket-one.test.mjs` (30 checks): `retireSocket`; wsClient's real
`connect()` and `scheduleReconnect` cut from the file and run with stubs (Try
now during a connect, the replaced line's close, error and open, a CLOSING
line at a tab return, the current line's drop still reconnecting); the
wiring; and the real `serverReady.js` with a clock (an ordinary login never
veils, a drop under the loading screen veils once it lifts, a drop healed
under it shows nothing, no loading screen veils after 3 s as before). On the
code before this change 17 of the 30 fail.

## Left for later

- Try now doing nothing while a try is already connecting (a nicety now).
- The effect's cleanup: remove the visibilitychange/pageshow listeners and
  clear `_readyRejoinTimer`; the lockout's own timer into `reconnectTimer`.
- A tab return retrying the stopped screens (origin, device, key, verify,
  frozen, rejected): which may retry is the owner's call (V4 N1-6).
- 'locked' does not veil the world; the onopen-to-state_sync window where only
  the shop asks again.
- The 'ip' refusal's own words; the room-full screen's design; identity and
  two tabs; the trade window, duel and party at state_sync (other lanes).
