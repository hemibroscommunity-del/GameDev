# No sound of the world under the loading screen (v2.3.3800)

The owner: *"when first loading the game don't play any music or sound
effects until the world is fully loaded. It's a bit creepy hearing the crowd
murmur when you're not seeing anything on screen yet."*

## What played under the loading screen

A fresh load (mp-loadhush), a 22-second loading screen. The world is already
running behind it (the way in walks you through it, `wheelHome.js`), so it
was already making its sounds:

| when (after the loading screen came up) | what |
|---|---|
| +13.6 s | the session music coming back |
| +14.2 s and +20.5 s | townsfolk's emote pops |
| +21.1 s | the town's crowd murmur (the ambient bed) |

The PLAY tap's own click and sound came at +0.2 and +0.7 s.

## What it does now

The sound player (`BT_AUDIO` in `src/data/gameDisplay.js`) has a **gate**. It
is closed while the world is hidden:

- the loading screen is up (the page body's `bt-intro-up` class);
- the reconnect veil is up (`.bt-connect-veil`, `serverReady.js`);
- the straight-in road's or a recovery reload's veil is up
  (`.bt-avatar-hold`, `avatarHold.js`).

One watcher of the page body's class and its children sees all three.

While it is closed:

- **No sound of the world is played.** A one-shot (a hit, an emote, the
  forge's anvil) is dropped, never queued, so there is no burst when it
  lifts. The player's own taps still sound: a menu sound (`ui-*`), or
  anything asked for within 1.5 s of a tap or key.
- **No music.** The music deck has nothing to play, so the session music
  fades out at PLAY.
- **The loops wait.** One asked for (the zone's air) starts when the world
  is drawn.
- **No beds.** The ambient beds (crowd, sea, fire) and the river hear no
  share (`ambientBeds.js`, `waterAmbience.js`).
- **The audio watchdog leaves the silence be.**

It opens two frames after the last veil goes, when the first world frame is
painted. Then the town's music starts with its own fade, the waiting loops
start, and the beds come up on their next look. Measured: the town's music at
+0.0 s, the crowd at +1.4 s.

**The same after a reconnect:** the veil closes the gate (3 s after a real
drop) and the reveal opens it.

**The off-ramps:**

- `?soundgate=0` turns it off for one phone (the game as it was).
- The Test panel's Memory savers row, **"Sound waits for the world"**
  (`off_soundgate`, `game/clientOff.js`), turns it off for every phone, live,
  with no deploy or reload. A closed gate opens at once.

**The failsafe:** a gate shut for the loading screen's reasons (the class or
the bro's veil) for more than 60 s opens anyway and is counted
(`__btSoundGate().failsafe`). A loading screen stuck by a fault must not mean
a silent game. A reconnect's veil is never cut short: silence while the
server is away is right.

`window.__btSoundGate()` is the QA's view: open or not, why, when, how many
sounds it dropped, and how often the failsafe fired.

## Not covered

- A zone's own loading veil (a dungeon's, the farm's) is not a gate. Those
  are short and the world behind them is the zone you are entering.
- With streaming off (`?musicdecode`), the decoded session music is not held
  by the deck rule.

## Tests

- `mp-loadhush`, a fresh load with every sound start recorded from the
  page's first instant:
  - none under the loading screen but the player's own tap;
  - the town's sound within 2 s of the reveal;
  - a real reconnect (the socket refused for six seconds): none under the
    veil, and the town's music back after.
  - the Test panel's switch opens a closed gate live;
  - the failsafe fires on a stuck loading class.
- `sound-cues` §21 (the gate's wiring, the switch, the failsafe);
  `client-off` 3a-3b (the row).
