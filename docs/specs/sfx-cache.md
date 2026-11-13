# Decoded sound held only while it is needed (v2.3.3714, `?sfxcache`)

The owner: *"The game needs to be extremely memory efficient."*

## What a sound holds today

Every sound effect (`BT_AUDIO.SFX_MANIFEST` in `src/data/gameDisplay.js`, 90
names, about 2 MB of MP3 files) is downloaded and **decoded** behind the
loading screen into raw 32-bit samples, and kept that way for the whole
session: 26.8 MB of decoded sound (the memory check's `sound` line), held
whether you are fighting at the Flame Fields or standing in BroTown. The
fanfares, Ace's coin, the farm, the forge, the Woodworker's knife, the
townsfolk's hums and the snore are all held while you fight.

## What the switch does

**On by default since v2.3.3735.** The owner: *"I think including the new memory change work by default would be better. I can always revert the change if I don't like it or it doesn't work well."*

`?sfxcache=0` turns it off for one phone: every sound decoded on the loading
screen and held, as before.

- **Pinned** (`PINNED` in `src/data/sfxCache.js`): every sound a fight, a
  walk or a tap can play quickly and often is decoded up front, as today, and
  never let go. No sound in combat or movement ever waits. The sound suite
  (`server/test/sound-cues.test.mjs` §18) fails if any layer of a cue the
  Sound Studio files under *Fighting*, *Your hits*, *Getting hurt*, *Moving*
  or *Monsters*, or of `HIT_VOICES`, `SHOT_SOUNDS`, `ELEM_SOUNDS`,
  `PROP_SOUNDS`, `CROWN_SOUNDS`, the swings or swimming, is not pinned. Also
  pinned, from what mp-questline, mp-battlemem and mp-longplay played with the
  switch on: a townsperson's hum (every tap on one), a fight's loot falling
  and going in the bag (coin-flip, bag-close), your own death's sting
  (flip-lose), the Blacksmith's anvil in the town (forge-strike); and the four
  whose decode took longer than 30 ms on a run (below).
- **Everything else** keeps only its MP3 file's bytes (0.6 MB in all, held as
  Blobs, outside the page's heap) and is decoded the first time it plays,
  into a cache of **4 MB**; when the cache is full, the sound played longest
  ago is let go. A sound that is playing keeps its own copy, so letting go
  never cuts one off.
- **A cold sound waits for its decode and then plays.** It is never dropped
  silently: one more than 1.5 s late is counted and logged
  (`window.__btSfxCache().late`) instead of playing out of time.
- **Decoded ahead** where play is predictable (`PREFETCH`): entering the farm
  decodes its sounds; a building's door the Woodworker's knife; the river
  under a fishing cast the reel's clicks; the farm's first stroke the rest of
  its work; the Sound Studio decodes what it lists while the cache has room.
- No sample rate is lowered.

`?sfxcache=8` tries another budget (in MB, 1-32); `?sfxcache=0` is off.

## How long a cold sound waits

Each sound not pinned, decoded from its held bytes the way the cache does it,
in a Chromium on the QA box with the game running beside it (mp-sfxcache,
median of five): the slowest quest-complete 16-19 ms, fishing-fish-on-hook
12 ms, the rest under 10 ms. Four took longer than the 30 ms aim on some run
and are pinned for that reason: the river's loop (51 ms), the reel's loop
(45 ms), the level-up's sting (24-38 ms) and the win's marimba (16-32 ms).
In the game's own page on this box a cold sound starts 1.7-2.4 s after it is
asked for: the box draws a few frames a second on a software renderer and
the decode's answer waits behind them (TRAPS §200); on a phone at its frame
rate that wait is one frame.

## What it saves

The memory check (mp-membudget), a phone in BroTown, at a Flame Fields fight
and home again, three times; the highest reading of each line:

| line | main | this branch, switch off | switch on |
|---|---|---|---|
| sound (decoded sound) | 27.0 | 27.0 | **24.0** (-3.0) |
| artCache | 102.2 | 102.2 | 102.2 |
| gpu | 83.5 | 88.4 | 86.7 |
| canvases | 39.4 | 39.2 | 40.7 |
| heap | 33.0 | 32.4 | 33.3 |
| buffers | 20.8 | 20.4 | 20.5 |
| workers | 28.6 | 28.6 | 28.5 |

(The gpu, canvases and heap lines move by a few MB from run to run on main's
own code; sound is the only line the switch moves. The files' bytes the cache
keeps, 0.3 MB of Blobs, are in no line.)

The saving is the sounds nothing has played yet: BroTown and a fight hold
20.3 MB of pinned sound -- most of the 27 is combat and movement, which never
waits. Every sound not pinned decoded at once is 3.3 MB, so the 4 MB cache
holds them all today; the budget is the cap for what is added later.

A larger saving is there for a later change: many pinned recordings are
played in a fight only as a short slice of a longer file (the axe's 2 s file
as a 0.12 s layer of the bow's swap, the tree's fall as part of a slam, the
fishing bite as a wet hit's layer), and a slice could be held without the
rest of its file.

## Where it is

- `src/data/sfxCache.js`: the pinned list, the prefetch lists, the budget,
  and the cache (a small least-recently-played list), plain data node tests.
- `src/data/gameDisplay.js`: `loadSfxManifest` (only the pinned decoded),
  `loadSample` (decodes from the held bytes; a decode already on its way hands
  back its promise), `play` / `_startOn` / `_playCold` (a cold play: its gain
  made at once so a caller's fade or stop works, the source started when the
  decode is in), `_has` (a cold sound counts as in), `sfxPrefetch`,
  `window.__btSfxCache()` (what it holds and did).
- `src/ui/panels/SoundStudio.jsx`: decodes what it lists. (The river's
  loop, `game/waterAmbience.js`, reads the decoded sound itself; since
  v2.3.5006 it asks for it, below.)
- Tests: `sound-cues` §18; `mp-sfxcache`.

## v2.3.5006: the four slow decodes decoded ahead, not pinned

The owner said yes to the memory list (2026-11-12). The `sound` line read
about 23 MB, and about 90% of it was the pinned set. Four of the pinned
sounds were pinned only because their first decode took longer than the
30 ms aim, and none of them is a fight's sound (`sound-cues` §18a): the
river's loop (1.46 MB decoded), the level-up's sting (1.18), the marimba of a
win (0.93) and the reel's loop (0.91), 4.5 MB in all.

They are now **decoded ahead** (`AHEAD` in `src/data/sfxCache.js`), each at a
moment that sees its play coming (`AHEAD_WHEN`, through
`BT_AUDIO.sfxAhead(name)`):

| moment | where | decodes |
|---|---|---|
| `water` | `game/waterAmbience.js`: within `RIVER_AHEAD_PX` (400 px) of the river's reach, four times a second while you stay | the river |
| `fishSpot` | `BroTown.jsx`: a fishing spot comes in reach (the harvest button offers it) | the river, the reel |
| `cast` | `game/lifeSkillRewards.js` `startExtraction`: the cast (the reel turns only after the wind-up) | the reel, the river |
| `levelNear` | `networking/wsClient.js` `player_state`: a combat or life skill past 80% of its level (`levelNear`, `LEVEL_AHEAD_FRAC`) | the level-up |
| `flip` | `AceFlipPanel.jsx`: Ace's toss, before the request goes; `ChestReveal.jsx`: the chest shaking | the win |

and three calls that know exactly which sound comes name it: the daily
wheel's landing (the win or, on a jackpot, the level-up, 1.5 s before it
plays), a salvage's essence and a daily reward's spin (each 140-160 ms before
it plays).

Once decoded, each is a sound of the cache like any other: let go when the
cache is full and it was played (or asked ahead) longest ago. `sfxAhead`
also marks one already decoded as played, so it stays while its moment is
near (the river while you stand by the water). The cache's 4 MB is now a
real cap: every sound not pinned decoded at once is about 7.8 MB.

**A missed ahead is late, never dropped.** A play that comes before its
decode (a walk that outran the river's band, the cache that let one go just
before) waits for the decode as any cold sound does: up to about 50 ms. A
loop waits by asking and starting the frame after the decode lands (the
fishing loops through `startSfxLoop`; the river's own loop through
`loadSample` and its next tick); nothing ever waits on the page's thread.
Each such wait is counted: `window.__btSfxCache().aheadWaits` and
`aheadLate` (the key and how long).

`?sfxahead=0` pins the four again for one phone: the game as it was.

The same change cut the inaudible tails of seven pinned files losslessly, at
mp3 frame boundaries (`tools/trim_mp3_tail.mjs`, every kept byte the
file's own): armor-hit-1 (1.392 -> 0.864 s), armor-hit-2 (1.776 -> 1.272),
quest-complete-v2 (1.829 -> 1.437), flip-win (2.544 -> 2.208), catch-splash
(1.584 -> 1.344), coin-flip (1.224 -> 0.792) and flip-lose (1.488 -> 1.008).
Each cut is one frame past the last sample within 60 dB of the sound's own
peak or above -60 dBFS, whichever is later (coin-flip, recorded at -20 dBFS
and played louder in some cues, was cut at -80 dBFS). Each file's decode was
compared with its original's (ffmpeg): identical to the last sample kept, and
nothing after the cut louder than its threshold. Every slice a cue or a call
plays ends inside the new lengths (`sound-cues` §3b). About 0.9 MB decoded:
0.78 of it pinned, the win's 0.12 in the cache when it is held. The other
pinned files' tails are too short to cut at a frame with that margin (under
0.05 MB each).

What it saves, expected (the memory check, `mp-membudget`, to measure): the
pinned set 20.9 -> about 15.3 MB (4.5 unpinned, 0.78 of tails, 0.36 of the
monster growls at 24 kHz, `docs/specs/owner-recordings.md`), so the `sound`
line's 23.0 at home and 23.2 at the fight -> about 17.4 and 17.6 MB, unless
the trip plays or nears one of the four (each then held in the cache, which
holds at most its 4 MB).
