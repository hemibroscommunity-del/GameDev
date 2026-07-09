# Mayor Bro sprite sheet

The renderer (`src/rendering/mayorSprites.js`) loads **`mayor-s.png`**: a transparent
horizontal strip of **128×128** front-idle frames. `mayorSprites.js` auto-detects the
frame count from the sheet width, so a re-bake with a different count just works — bump
`SPRITE_VERSION` there to bust the edge cache. Absent, Mayor Bro falls back to the 🎩
emoji in-game (no error).

The shipped sheet (11 frames, 1408×128) was baked from the owner's **4×3 grid**
`assets/npc animations/mayor/mayor-idle-grid.png`: white background edge-flood-filled to
transparent (interior whites preserved), source cells downscaled to 128, laid out row-major.
Note: the source grid's 12th frame is a "return to start" duplicate of frame 0, so the bake
**drops it** — otherwise the loop shows frame 0's pose twice in a row (a held-frame hitch). The grid path avoids
H.264 entirely — any environment can re-bake it since a browser decodes PNG natively.

To re-bake from the **video** clip instead (needs `ffmpeg`, which this repo's locked-down
sandbox can't provide — run on a machine that has it):

```
tools/build_npc_idle_sheet.sh \
  "assets/npc animations/mayor/mayor-idle-s.mp4" \
  public/sprites/npcs/mayor/mayor-s.png
```
