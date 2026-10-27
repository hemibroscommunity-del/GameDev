# Back from a sleeping tab, after four lengths of sleep (v2.3.3670)

The owner, 2026-10-27: "check rebuilding the game at different intervals when
returning to the game from putting the tab to sleep (iPhone)".

`mp-tabsleep` puts an upright touch phone to sleep in the world's BroTown, four
times, each sleep longer than the one before, and times the way back.

## How a phone's sleep is made here

An iPhone can't be driven from here, so the test makes each part of its sleep:

- **The tab goes to the background.** The page is told it is hidden
  (`visibilitychange`, `pagehide`, `blur`), as `mp-tabwipe` does.
- **The page stops.** A loop holds the page's one thread for the whole sleep, as
  `mp-comeback` does, so no timer, frame or socket event runs until it wakes.
  - Chrome's own "frozen" state was tried first and does not work here. This
    Chromium accepts `Page.setWebLifecycleState('frozen')` and goes on running the
    page's timers (30 beats of a 100 ms timer in a 3 s "freeze"). A page behind
    another tab still reads as visible.
  - The test checks the sleep each time: a 100 ms timer may beat at most twice
    while the page sleeps (it beats 0 or 1 times).
- **The network meets one of a phone's three fates.** The page reaches the worker
  through a small relay inside the test. Chrome's "offline" switch can't do this
  job: a minute "offline", and the open socket still worked.
  - **alive**: the socket lives through the sleep (a short lock, or Wi-Fi).
  - **closed**: the phone closes it while the page sleeps (iOS does this for a
    suspended page). The page finds it closed when it wakes.
  - **dead**: the radio sleeps. Nothing comes back on the old socket, not even a
    close (a "dead pipe"), but a new socket works.
  - New connections are refused while the radio is down. It comes back up just
    before the page wakes.

| Sleep | The socket |
|---|---|
| 10 s | alive |
| 1 minute | alive |
| 3 minutes | closed (and past the 2-minute idle logout) |
| 8 minutes | dead |

`BT_SLEEP_QUICK=1` runs 3 s, 15 s (alive), 30 s (closed) and 40 s (dead) in about
two minutes.

## What it reads at each wake

- how long until the world is live again (connected, in the world, not loading,
  not held), and whether a banner asked for a touch first;
- the new sockets the page made on the way back, and the game's crash log (a
  rejoin, a dead pipe, a reload);
- the screen lit (the black-screen watchdog's own sample);
- a step taken after the wake reaching the worker;
- the sound running after a touch;
- where the bro is, against where he slept.

## The results

The full run (`node tools/qa/mp/run.mjs tabsleep`, 13 minutes), 18 of 18:

| Sleep | The socket | Back in | The "I'm back" banner | New sockets | Reloads | Lit | A step reaches the worker | Sound | Moved |
|---|---|---|---|---|---|---|---|---|---|
| 10 s | alive | 0.4 s | no | 1 | 0 | 99% | 30 px | running | 0 px |
| 1 minute | alive | 0.4 s | no | 1 | 0 | 100% | 30 px | running | 0 px |
| 3 minutes | closed | 2.3 s | yes: 1.5 s after its touch | 1 | 0 | 99% | 23 px | running | 0 px |
| 8 minutes | dead | 1.9 s | yes: 1.3 s after its touch | 1 | 0 | 99% | 45 px | running | 0 px |

The short run (`BT_SLEEP_QUICK=1`) adds the cases between: a socket closed 30 s
into a sleep (back in 2 s, no banner, a fresh socket, the log `wsState=3`), and a
dead pipe at 40 s (back in 0.4 s: the dead socket still reads open, and the
rejoin replaces it).

What it means:

- **Up to two minutes the game is back at once.** A sleep past 5 s always rejoins
  on a fresh socket (`RESYNC_AWAY_MS`, v2.3.778), so a socket that died quietly
  while the phone slept is never trusted; a closed one is simply made again.
- **Past two minutes the character has been logged out for being away** (the
  idle logout, close 4006), whatever the socket met. The banner says "You were
  away, so your character logged out. I'm back", and one touch anywhere brings
  the world back in 1.3-1.5 s (`_armComeBack`, v2.3.3034).
- **At every length:** no reload, the screen lit, the bro where he slept, the
  sound running after the first touch, a step heard by the worker.

Left for the owner: whether the banner and its touch after a sleep past two
minutes is right, or the game should come back on its own there too. The idle
logout frees the room's place and stops the room's work for a player who has
gone.

## Fixed on the way

**The crash log said the wrong socket state after every long sleep.** Coming back,
`_resumeRecover` writes "resume visible wsState=N" to the crash log, and the
owner's reports from the field are read from it. It read the socket's state when
the log's code had loaded, a moment later. By then a sleep past 5 s had already
started its rejoin, so every entry said `wsState=0` (a new socket connecting),
whatever the sleeping socket had met. It is read as the page comes back now
(`_wsAtWake`), so the log says 1 (it still reads open: it survived, or it is a
dead pipe the rejoin replaces), 3 (it was closed while the page slept), or `none`
(the two-minute idle logout had already let go of it).

## The test: `mp-tabsleep`

Its checks, for each sleep:

- the page really slept (guard);
- the world back and live within 45 s of the wake, and lit (75% or more);
- a step after the wake reaches the worker, the sound running, no reload;
- the bro back where he slept (40 px at most).

And no page errors.

`node tools/qa/mp/run.mjs tabsleep` (about 13 minutes), or `BT_SLEEP_QUICK=1`
for the short one.
