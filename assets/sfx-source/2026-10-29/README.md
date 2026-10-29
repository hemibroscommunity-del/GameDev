# The owner's recording of 2026-10-29, kept as supplied

Uploaded to the top of the project on 2026-10-29 (00:31 UTC), the evening the
skateboard landed (v2.3.3776, docs/specs/skateboard.md), and moved here
unchanged, byte for byte (v2.3.3789). The server suite (`sound-cues` §11zd and
§13f) refuses sound files at the top of the project: main's Server CI went red
on the upload, and every pull request with it.

`freesound_community-drive-over-border-82185.mp3` (133 KB, 6.8 s, stereo,
24 kHz): "Drive Over Border" by **freesound_community**, **Pixabay** 82185
(Pixabay's name: maker, title, number), recorded as the **Pixabay Content
License** (no attribution required, commercial use allowed) to match how the
file was supplied, as the other freesound_community rows in `CREDITS.md`
(**CONFIRM** there: the same clip on Freesound itself may be CC0 or CC BY;
NonCommercial is out, the v2.3.2970 note in CLAUDE.md).

**It is not in the game yet.** By its name and the evening it came, the
skateboard's rolling sound: whoever wires it cuts and levels it with the tools
in `tools/audio/` (measured by its own channels, never ffmpeg's `-ac`, TRAPS
§230), gives it its Sound Studio label (`src/data/soundStudio.js`) and its
`CREDITS.md` row in the same change.
