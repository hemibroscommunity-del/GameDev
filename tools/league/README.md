# The league (GRAND-PLAN 10.7; card LG, tags 6121-6122)

The house's own bots, each rung harder, played against every detector the
worker has. **Tools only**: nothing the game ships imports this folder, and
it never changes a detector. Card K4 owns the detectors; a detector is
scored as it is on `main` when the bots are written ("frozen").

```
npm run league                         # every rung and the honest players, 10 minutes each
node tools/league/score.mjs --minutes 20 --seed b
node tools/league/score.mjs --json     # the rows, for a script
cd server && npm test -- league        # the suite (server/test/league.test.mjs)
```

## The rungs

| Rung | File | What it is | Built |
|---|---|---|---|
| 1 | `bots/wire-script.mjs` | a script on the wire, machine-perfect timing: straight walks to a vein's centre, the plan waited exactly, one gesture replayed, a swing every 600 ms from one spot, the guard up the instant a monster winds up, a fixed cooking beat | PR 2 (6121) |
| 2 | `bots/wire-noise.mjs` | the same script with a person's noise: waits stretched about 15%, a breath now and then, a wobbling walk aimed anywhere on the vein, a new fingerprint each strike, 60% perfect, the guard 180-420 ms late, the feet shuffled | PR 2 (6121) |
| 3 | `bots/page-script.mjs` | the real page driven by a script (the phone harness) | PR 3 (6122) |
| 4 | `replay.mjs`, `traces/` | a person's recorded play replayed, at 60, 30, 20 and 4 frames a second and through a deploy | PR 3 (6122) |
| 5 | (later) | a model driving the browser | **not built**: later, when a detector is meant to face it |

## How a session runs

`score.mjs` gives each bot one room: the worker's own GameRoom (`server/src`
at this commit) on the shared test room (`server/test/testroom.mjs`), through
the claims' bench (`server/test/claimbots.mjs`, read only). Its seeded clock
and tick, a character record put on file before the join (CLAUDE.md §5), and
the join the world's way with `ws: [1, 5]`. It is the same code
`wrangler dev --local` serves, run in seconds and the same every time, so
`npm test` can run it.

A bot sees only **the wire** (`makeWire` in `score.mjs`): `join`, `send`,
`wait`, and what a phone reads off the worker's messages (its own place, the
veins, the monsters, a wind-up aimed at it, the hits a harvest was planned).

## What is read

| Detector | Kind | What counts as caught |
|---|---|---|
| `botfp` (`server/src/botfp.js`) | flags | a flag written (`suspicion-threshold`, `variance-collapse`, `device-fleet`, `strikes-without-start`) |
| `botsig` (`server/src/botsig.js`) | flags | a `server-signals` flag; reasons under the line are printed, not counted |
| `hitproof` | judge | claims refused: no weapon, too far, past the rate, an unpaid special |
| `swordswing` | judge | swings refused |
| `bowshot` | judge | arrows with no shot |
| `harvestgrade` | judge | perfects paid as good (`harvestgrade` is OFF on main, so it reads nothing until the owner turns it on) |
| `harvestproof` | judge | strikes with no start |

The honest players beside the bots are the claims' bench's own (an honest
harvester, sword and cook) until PR 3's recorded trace. `league.test` fails
when rung 1 is missed by every detector, when an honest player is flagged or
held, or when a session did nothing.

What honest trouble does to each signal: `docs/specs/honest-trouble.md`.

## The scores (PR 2, `main` at 8dc5bf6, 10 minutes a session)

| | botfp | botsig | the judges |
|---|---|---|---|
| rung 1, harvest | FLAGGED (suspicion: the replayed gesture) | FLAGGED (aimed) | - |
| rung 1, fight | - | FLAGGED (reflex) | - |
| rung 1, cook | - | - | - |
| rung 2 (all three) | - | - | - |
| honest (all three) | - | - | - |

Findings, for card K4 (none is this card's to fix):

- Rung 2 is missed by every detector: a few lines of noise pass them all.
- Rung 1's cook is missed: `cook` (`botsig.js:418`) measures the gap between
  cooks without taking off the hits the worker planned, so a script that
  waits exactly the plan spreads over six bins. (`gesture` does take them
  off: `botsig.js:408`.)
- The judges hold nothing from rungs 1-2: both claim only what an honest
  phone could. They are the detectors' bound, not a bot's tell.
