# Mayor Bro sprite sheet — bake target

The renderer (`src/rendering/mayorSprites.js`) loads **`mayor-s.png`** here: a
transparent horizontal strip of 256×256 front-idle frames (feet at the frame
bottom). Until it exists, Mayor Bro falls back to the 🎩 emoji in-game — no error.

Bake it from the committed source clip with the reusable pipeline script (needs
`ffmpeg`; this repo's sandbox can't install it, so run on your media machine):

```
tools/build_npc_idle_sheet.sh \
  "assets/monster animations/mayor/mayor-idle-s.mp4" \
  public/sprites/npcs/mayor/mayor-s.png
```

Tune the background key color / frame rate if needed (see the script header) and
eyeball the result — it should sit at the same scale as the other sprites and its
feet should meet the ground. `mayorSprites.js` auto-detects the frame count from
the sheet width, so any frame count works; bump `SPRITE_VERSION` there on a re-bake
to bust the edge cache.
