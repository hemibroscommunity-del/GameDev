# Each land of the Wheel, its own music (v2.3.3064)

> Owner, 2026-10-06, on the recommendations for finding your way round the
> Wheel: *"Continue building recommended."* Music by land was one of them.

The Wheel is **one zone**, and the game chose its music by zone. So nothing
changed as you walked from Brotown into Frost Ridge or the Flame Fields: one
track played across the whole world. Which track depended on how you got there:

- **After logging in:** the town's track. The way in asked for the Wheel's own
  music and found none. Then, once you had arrived, the loading screen's
  hand-over (`IntroVideo.jsx`) asked for the town's. `mp-landmusic` records this
  with `?nolandmusic`.
- **After a death, a dungeon or the farm:** the game's own theme (the login
  screen's). The way back asked for the Wheel's music, found none, and brought
  the theme up. Nothing asked for anything after that.

## What plays where

| Where you stand | Music |
|---|---|
| Brotown and the commons round it (the safe ground) | the town's track, `village.mp3` |
| Frost Ridge | `frost.mp3` |
| the Flame Fields | `fire.mp3` |
| the Wind Dunes | `desert.mp3`, with the dunes' wind under it |
| the Verdant Wilds | `forest.mp3` (the old meadow's *Floral*) |
| the Stone Hollows, the Electric Foundry, the Water Caves, the Poison Forest | the game's own theme (they have no track yet) |
| the sea, or anywhere unknown | whatever was playing |

The four lands with music are the four you made tracks for, the same four you
drew banners for. To give one of the other four its own track, add a line to
`BT_AUDIO.ZONE_MUSIC` (`src/data/gameDisplay.js`) under the land's id
(`hollows`, `thunder`, `tidal`, `mist`). Nothing else has to change.

The obvious stand-in for those four is your **Worldview** track (`world.mp3`),
which nothing in the Wheel plays now. It was left out on purpose. At 3 minutes
it is the longest track you have, and it takes about 25 MB more of the phone's
memory than the theme does. Memory is what turns the screen black. Say the word
and it is a four-line change.

**Decided, 2026-10-06:** asked *"Use world.mp3 for the four lands without
music?"*, the owner said *"No"*. The four keep the theme until each has a track
of its own (the music list in `docs/ART-WISHLIST.md`).

## When it changes

- **Into a land:** its music starts **1.2 s** after you cross in. The land's
  banner comes at 0.6 s, so the music follows the banner.
- **Back home:** the town's track comes back only after **8 s** on the safe
  ground. Each land's first monsters stand right at the line, so a fight there
  steps back and forth across it. The land's music stays for the fight.
- **Across to another land:** if you pass over the commons in less than 8 s,
  the music goes straight from one land's track to the next. You don't get a
  burst of the town's in between.
- **Arriving** (logging in, after a death, back from a dungeon or the farm):
  the music is chosen at once, from where you actually stand.
- Anything else that changes the music while you are in a land is put right on
  the next frame.

The crossfade is the zones' own 600 ms.

## How it works

- `src/game/wheelMusic.js` is the land watch. The Wheel's minimap asks it every
  frame, beside the land banner (`wheelMinimap.js`), with the same answer for
  where you are (`wheelHere(...).region`). It turns the land into a music key and
  calls `BT_AUDIO.startZoneAmbient(key)` when the timing above says so.
  - The key is the land's own id, and `town` for the commons.
  - The rules are pure and tested in node.
- `startZoneAmbient('wheel')` now does nothing: the Wheel itself never asks for
  music. Every way in comes through today's town under the loading veil, which
  has already started the town's track. That is Brotown's track too, so it plays
  on unbroken.
  - Before, it found no track for `wheel` and brought the game's theme up over
    the whole Wheel after a death, a dungeon or the farm.
- `wheelHere()` now says whether its answer is for the cell you stand in
  (`fresh`). The map's worker lingers for a while after you leave the Wheel, and
  its last answer can be the spot where you died. A visit's first choice waits
  for a fresh answer.
- The dunes' wind (`ZONE_AMBIENT.sky`, about 11 MB once decoded) is let go when
  you leave the dunes. It used to be kept for the rest of the session.
- `startZoneAmbient` keeps its last 16 asks (`BT_AUDIO._zoneAsks`). The
  probe below shows them: which music was asked for, what was playing, and on a
  test page who asked.

## Memory

- **The tracked lands** use less memory than the Wheel did before. Only one land
  track is decoded at a time (26–32 MB). The town's track (40 MB) is dropped
  when a land's comes in, because the cache keeps under 56 MB.
- **The four lands without a track** cost the same as before: the theme is
  always held.
- **The dunes' wind** is now let go.

## Switches and tests

- `?nolandmusic` in the address: the Wheel as it was (`BT_AUDIO.wheelLandMusic`
  false).
- Client only: the worker knows nothing of it, so there is no caps flag.
- `tools/world/test-world-core.mjs`, section "the lands' music" (16 checks):
  - the keys;
  - arriving on a stale answer, then a fresh one;
  - 8 s home and 1.2 s into a land, with the count starting again after a step
    back;
  - the sea;
  - putting right something else's change;
  - leaving and coming back;
  - `?nolandmusic`;
  - the tracks in `ZONE_MUSIC`, and the wiring.
- `mp-landmusic` (17 checks) does the same on a phone, against a real worker
  (`window.__btLandMusic`):
  - before and after;
  - Brotown, Frost Ridge, a step back, the Flame Fields, the Wind Dunes and
    their wind, the Stone Hollows, the Verdant Wilds;
  - a death and the way back.

  On the last run, a step back across Frost Ridge's line kept its music
  through the 7.3 s sampled after the crossing. The town's track was asked
  for 8.4 s after the line. The death trip went the Wheel, then today's town,
  then the Wheel. It came back to the town's track without the theme once
  coming up over the Wheel.
