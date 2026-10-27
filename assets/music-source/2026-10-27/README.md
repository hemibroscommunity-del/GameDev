# The owner's music of 2026-10-27, kept as supplied

Uploaded to the top of the project on 2026-10-27 and moved here unchanged,
byte for byte. The server suite (`sound-cues` §11zd and §13f) refuses sound
files at the top of the project, so every pull request's `test` check failed
until it moved.

| file | made with | length | the name says |
|---|---|---|---|
| `Homestead Morning.mp3` | Suno, 2026-10-27 | 1:51 | a farm in the morning |

**It is not in the game yet.** The owner's ten tracks of 2026-10-26 sit beside
it, in `assets/music-source/2026-10-26/`. Wiring a track in means:

- encoding the game's copy with `tools/audio/encode_music.mjs` (128 kbps,
  44.1 kHz) into `public/audio/music/`;
- naming it in `ZONE_MUSIC` (`src/data/gameDisplay.js`);
- giving it a line in the Sound Studio's music list (`src/data/soundStudio.js`).

Its title suggests the farm, which today plays the game's theme.
