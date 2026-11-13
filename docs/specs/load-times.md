# The Test panel's loading times (v2.3.5019)

> Offered a timer in the Test panel to find out where a phone's loading time
> goes, the owner, 2026-11-13: *"Looks good. Continue Going recommended"*.

## Why

The loading time measured on the QA box (`mp-coldload`, 2026-11-13): 32 MB in
1,808 requests, 27 to 44 s to playable, and only about 5 s of it the page's
own work. The rest is waiting: the downloads, the workers, one step behind
another. How long each wait is depends on the machine and its line, so the box
cannot say what the owner's iPhone waits on. The page now notes it itself.

## What it notes

`src/game/loadTimes.js` (no imports) keeps, once a page, the moment each step
of the load ended (`performance.now()`, seconds since the page began):

| step | where it is noted |
|---|---|
| The game started (downloaded and running) | `src/main.jsx`, after the perf HUD |
| The loading screen came up | `BroTown.jsx`, just before `preloadPlayerAssets()` |
| The pictures were ready | `preloadAnimations.js`, when the second wave settles |
| The world began loading / was loaded | `zoneTransitions.js`, the Wheel's zone gate |
| The loading screen was gone | `onboardingPace.js` `markWorldIn` |

and each picture group's own time behind the loading screen
(`timeLoadGroups`, from when its wave began).

The world's own loading runs beside the pictures, so "The world began loading"
can come before "The pictures were ready". The steps are listed in the same
order every time, so two screenshots compare line by line.

## Where to read it

Test panel (a 1.2 s press on the top bar's centre) -> **Loading times**: each
step's second, how long the loading screen was up, and the six slowest picture
groups, with a button that copies it all as text. For a fresh load: close the
game's tab, open it again, play in, then open the panel. Nothing is sent or
kept past the page. QA reads `window.__btLoadTimes()`.

## On the QA box (2026-11-13, `mp-loadtimes`)

    0.4 s  The game started (downloaded and running)
    1.5 s  The loading screen came up
   19.5 s  The pictures were ready
   17.8 s  The world began loading
   31.1 s  The world was loaded
   34.3 s  The loading screen was gone
  Slowest pictures: monsterShots 17.9 s, statDemo 15.7, levelUpBurst 15.4,
  loginSpin 11.1, traits 11.1, dailyChest 10.1

Here the world's own load (13 s, most of it after the pictures were ready) is
what the loading screen waits on last. Whether a phone waits on the same thing
is what the owner's screenshot answers.

## Tests

`node tools/qa/mp/run.mjs loadtimes`: every step noted in a load's order, each
picture group timed and none longer than the loading screen, the panel showing
the steps (its numbers the page's own), no page errors.
