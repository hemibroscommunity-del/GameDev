# Coming back to the game: the controls, the sound and the connection (v2.3.3496)

The owner, after a playtest on their iPhone:

> input dead after returning (needs tab switch)
>
> Sound only returns via OPEN/weapon-swap buttons

An iPhone cannot be driven from the test machine, so each way the code could
be caught out by a return was found by reading it, then made to happen on a
test phone (`mp-comeback`). The game now gets out of each one by itself.

## 1. A finger the page never saw lift

Every press of the stick, the right side and the attack button is ended only
by its own `touchend` or `touchcancel`. A page iOS freezes mid-press may never
get either. That happens when the app switches, the notification shade is
pulled, a call comes in, or the lock button is pressed.

- **The stick kept walking.** S.stickX/Y stayed where the finger left them.
- **The attack stayed held.** S.autoAttack and the pending press stayed on.
- **The attack button refused every later press.** Its one-finger rule
  (BroTown `bS`: "one finger owns the button") kept the old finger's id. The
  press was prevented and stopped before that check, so the stick under the
  button never saw it either. Only a tab switch fixed it, because WebKit then
  cancelled the touch it still tracked.

The keyboard has had the cure since v2.3.3006 (a window blur lets every key
go). Now the touch side has it too:

- `releaseAllTouches(why)` ends every held press exactly as a lift would. It
  runs when the page hides, comes back (visibilitychange, pagehide, pageshow,
  a bfcache restore) or loses focus.
- The attack button lets go of a finger that is no longer on the screen:
  `e.touches` lists every finger down now, and the new press takes the button.
  A finger really still down keeps it.
- Each release is a quiet `touch-stale` entry in the crash log. It rides
  along with the next report and is never sent on its own, so if this ever
  happens again the report says so.

## 2. The sound, on a tap that iOS lets start sound

The game's gesture handler (GameApp.jsx) did its recovery on `pointerdown` and
`touchstart` too. On an iPhone neither is a moment a page may start sound: a
touch can still become a scroll, and iOS 9 moved the permission to
`touchend`.

- The one-shot session reclaim (v2.3.1604: a silent HTML audio play and a new
  context, after time in another app) was spent on the first touch back, and
  iOS refused it there.
- The world's own controls (the sticks, the attack button) make no sound on
  their `touchend`.
- Nothing ever asked a context that READS 'running' to resume. That is the
  state iOS leaves it in when it has no route to the speaker.

The OPEN pill (pointerup, then the menu click) and the weapon swap (touchend,
then its sound) were the only taps that started a sound in the moment iOS
allows. That is why only they brought the sound back.

Now:

- The recovery runs on `touchend`, `click`, `keydown` and `mousedown`. The
  press events keep only the music deck's own retry, which costs nothing.
- `BT_AUDIO.gestureKick()` is the recovery's last step. It asks the context to
  resume whatever state it reports, and starts a one-sample silent sound
  straight into the speaker. So a tap that plays nothing of its own still
  gives iOS the sound start it waits for.
- The kick is armed for 20 s after a return (`armKick`: visible, pageshow,
  focus, a freeze) and whenever the context is not running. Otherwise a tap
  costs nothing.
- A reclaim that iOS refuses (`NotAllowedError`) is tried once more on the
  next tap, never more. Each try rebuilds the context, so a page refused every
  time must not rebuild on every tap.
- **A freeze counts as a return**, even with no event to say so. iOS does not
  always fire visibilitychange or pageshow for a page it froze and thawed. A
  1 s beat that comes round more than 4 s late arms the kick. More than 15 s
  late, it also arms the session reclaim. That is a length no page that stayed
  on screen reaches, so a long load's busy seconds never cost a context
  rebuild.
- The first kick after each return is a quiet `audio-kick` crash-log entry
  that says what the context reported.

## 3. The connection

- **A connect that never finishes is tried again.** A socket opened as the
  page comes back can sit in CONNECTING with nothing answering, for example
  when the phone's network is not awake yet. Every road back stepped round
  it:
  - _resumeRecover: "a connect is already in flight";
  - _comeBack: one socket at a time;
  - the alive timer: watches an OPEN socket only.

  Meanwhile the world stays held for the server (`_netHold`: the bro cannot
  walk), until something kills that socket, which a tab switch did. Now a
  connect older than `CONNECT_STALL_MS` (10 s) is closed and made again
  (`connect-stall` in the crash log; `window.__btConnectStalls`).
- **A thaw is a return.** The alive timer already noticed the page had been
  frozen (a beat more than 3 s late) but only reset its clocks. A freeze longer
  than RESYNC_AWAY_MS (5 s) on a visible page now runs the same recovery as a
  return (`_resumeRecover('thaw', gap)`): a socket that survived it is
  rejoined for a whole world, and a dead one reconnects at once.
- **"I'm back" also listens for `touchend` and `click`**, the events that do
  arrive after a return when the press events are not.

## Tests

`mp-comeback` (new), on an upright touch phone in the Wheel's BroTown:

1. A stick held by a finger whose lift never comes is let go of when the page
   goes away: no stick, no walking.
2. The button held by such a finger goes to the next press once that finger is
   off the screen. A finger still down keeps it.
3. A return's sound reclaim waits through the press and is done on the
   `touchend` (a new context).
4. After a return, the first tap that may start sound kicks the context. A
   press does not, and with nothing to mend a tap costs nothing. The kick is
   in the crash log.
5. A page frozen 6.5 s with no visibility event arms the sound's kick, and
   the socket that survived the freeze is rejoined.
6. A connect that never finishes is retried about 12 s after it stalled, the
   world is back, and the stick walks again.
7. No page errors.

The only stand-in is the network for step 6: an init script whose WebSocket
stays CONNECTING when asked, a browser API, as harness.mjs allows.

Client only, so it is safe to deploy in either order.
