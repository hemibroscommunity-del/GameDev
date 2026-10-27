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

## v2.3.3610: the owner's own score, and the Sound Studio's Music tab

The owner, 2026-10-26: *"Is there a sound studio? A huge part of the game is
emotional resonance from music. I don't know what music plays for the town vs
the other zones (etc)"*, then ten tracks of their own made with Suno, uploaded
to the top of the repository and named for where they go.

| The owner's track | File | Plays |
|---|---|---|
| Town Square Loop | `village.mp3` (replaced) | BroTown and the safe ground round it |
| Frozen Cave Loop | `frost.mp3` (replaced) | Frost Ridge |
| Fire level | `fire.mp3` (replaced) | the Flame Fields |
| Wind level | `desert.mp3` (replaced) | the Wind Dunes, the wind loop on top |
| Forest Loop | `forest.mp3` (replaced) | the Verdant Wilds |
| Rock level | `rock.mp3` (new) | the Stone Hollows |
| Water lvl | `water.mp3` (new) | the Water Caves |
| Murky Loop | `murky.mp3` (new) | the Poison Forest |
| Swift Skirmish Clash | `skirmish.mp3` (new) | inside any dungeon |
| Minigame | `minigame.mp3` (new) | Lil Bro's race, from the countdown to the finish |

- The Electric Foundry has no track of its own yet and plays the game's theme
  (`login-theme.mp3`, "Select Your Hero"). The studio said the farm did too; it
  went on playing BroTown's track (v2.3.3672, below).
- The masters are kept as the owner sent them in
  `assets/music-source/2026-10-26/`. The game's copies are the house setting,
  128 kbps at 44.1 kHz, made by `tools/audio/encode_music.mjs` from those masters
  (as the owner's last score was, v2.3.2614: "Yes make the files smaller
  size"). Never encode from `public/audio/music/`.
- Every replaced file is asked for at a new address (`?v=2.3.3610`), so a phone
  holding the old track in its cache fetches the new one.
- **Dungeons.** `startZoneAmbient` files every `dungeon:<id>` zone under the one
  key `dungeon` (`ZONE_MUSIC.dungeon`), where every zone's music is asked for, so
  the rest of the music code only ever sees the key. Entering one asks for it
  itself (gameEvents.js `dungeon_started`): the arena's map is set straight in,
  so the zone change's own music call (BroTown's `if (!S.map)`) never runs, and
  the first phone run found the Verdant Wilds' track playing on inside the Goo
  Grotto. Out of a world dungeon, BroTown's music, then the land watch.
- **The race.** While Lil Bro's race counts down or runs (`S._race.phase`
  `count` or `run`), the land watch asks for `RACE_MUSIC` (`minigame`) at once;
  once it is done the place's own music comes back `MUSIC_INTO_LAND_MS` later,
  not the 8 s a walk home waits (`wheelMusic.js` `raceMusicOn`, `_m.was`).
- **The Sound Studio's Music tab** (the Test panel's "Sound studio", or `?sounds`):
  every track under where it plays, by the owner's own name for it
  (`data/soundStudio.js` `MUSIC_PLACES`), the one playing where you stand named
  at the top, and ▶ to hear one. A track plays from its file on an `<audio>` of
  its own while the game's music bus is turned down and the land watch held off
  (`BT_AUDIO._musicPreview`); ■, the track's end and closing the studio put both
  back.

Tests: `sound-cues` §13 (every track a player can hear has its line, every file
is there, the ten tracks where they were made for, the masters kept and none
left at the top of the repository, the dungeon key, the race music, the studio's
preview), `test-world-core` "the lands' music" (the race and the preview),
`mp-landmusic` (the Stone Hollows, the Electric Foundry, the Water Caves, the
Poison Forest), `mp-googrotto` (a dungeon's music), `mp-race` (the race's) and
`mp-soundstudio` §10 (the Music tab).

## v2.3.3672: your farm's own track

The owner, 2026-10-27: *"Now just a mental note to add farming sound effects and
music track for that later"*. The farm's sounds came first (#1151). Then the
owner made **"Homestead Morning"** with Suno and uploaded it the same afternoon
(1:51; its master moved into `assets/music-source/2026-10-27/` by #1156).

| The owner's track | File | Plays |
|---|---|---|
| Homestead Morning | `farm.mp3` (new) | your farm (`farm_home`) |

- `ZONE_MUSIC.farm_home`, the zone's own id.
- **Every way onto the farm asks for it** (`game/farmTrip.js`
  `holdFarmUntilReady`, the one call they all make). Each sets the farm's map
  straight in, so the zone change's own music call (BroTown's `if (!S.map)`)
  never ran there. The farm went on playing whatever played before it: BroTown's
  track, the trip passing through today's town. The Sound Studio said the theme.
  `mp-farmmusic` found it, as `mp-googrotto` found a dungeon's in v2.3.3610.
- The game's copy is the house setting (128 kbps at 44.1 kHz, 1.70 MB), made by
  `tools/audio/encode_music.mjs` from the master and verified against it
  (duration, rate, channels, loudness, brightness). It plays about 1.5 dB louder
  on average than the town's track. It is left as the owner made it, as the
  other ten were.
- It is streamed by the music deck, as every track is since v2.3.3073, so nothing
  of it is decoded into memory.
- The Sound Studio's Music tab has a "Your farm" row, and the theme's row no
  longer says the farm. Only the Electric Foundry plays the theme now.
- Out through the farm's gate, the way back passes today's town and the Wheel's
  land watch, so BroTown's track comes back.

Tests: `sound-cues` 13f2 (the entry, its address, the master kept, the studio's
row, and the farm trip asking for it), `mp-farmmusic` (in BroTown the town's
track; onto the farm through "Visit Your Farm", farm.mp3 streamed and playing,
1:51, the theme ducked, the studio naming it; out through the gate, the town's
track again; on the build before the fix, step 2 read village.mp3),
`mp-soundstudio` §10 (the row).
