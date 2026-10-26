# Your hair and hat stay on (v2.3.3606)

The owner, 2026-10-26, with two screenshots a minute apart:

> Some traits will disappear. It seems after combat or interacting in the
> world a while. Screenshots of hair missing.

The first screenshot showed their new bro standing south in wavy hair, the Red
Bandana and the Golden Glasses. In the second he was jogging southwest, bald:
no hair and no bandana, with the glasses still on and the body whole.

## What was found

On the test machine, the owner's look stayed whole through a 90-second fight
with the Verdant Wilds' slimes, the Character page, iPhone's single drawing
program (`?onebatch=1`) and a forced reconnect. So it is not a rule in the
game's code. It is something the phone does to the pictures. There are two
ways for the head pieces to go missing, and the old code was open to both:

1. **The pictures are made on canvases.** Since v2.3.2776 every head piece is
   cut out of its file onto a canvas of its own, to save memory. The colour
   picks are recoloured onto one too. A canvas reaches the graphics chip the
   first time it is drawn. It is read again whenever the graphics are made
   again: the black-screen recovery, or a lost context coming back.
   - iPhone Safari can empty a canvas without saying so (TRAPS §250, the
     owner's report of 2026-10-22).
   - The v2.3.778 note in `pixiRenderer.js` records what its memory purge does
     to anything that is not a picture from a file: it comes back invisible.
   - So a facing the bro had not turned to before such a moment came up blank,
     and after a graphics rebuild every facing would.
2. **A piece that failed to load was given up for the session.** The loading
   screen asks for every piece in the catalog at once, about 290 small files.
   A facing that failed three times in 8 seconds (v2.3.1305's retry) stayed
   bald on that facing until a reload.

## What the game does now

**Every head piece is kept as an image of itself** (`src/rendering/
keepAsImage.js`).
- The moment a piece is made, its canvas is copied into a PNG. `toBlob` takes
  the copy at the call, before anything can empty the canvas.
- The PNG is loaded as an `<img>`, and the texture's source is swapped to it.
  It is the same size, so every crop, anchor and placement is unchanged.
- An `<img>` keeps its compressed bytes and is decoded again for each upload,
  so it survives what the canvas did not. That is the v2.3.778 rule, now kept
  for the pieces the game cuts itself.
- The canvas is then let go of. The PNG is smaller than the canvas it
  replaces, so this saves memory.
- This covers the base pieces (`_loadTraitDir`), the six colour catalogs
  (hair, hat, beard, glasses, eye style, shirt) and the species builds.
- If anything fails (no `toBlob`, a failed encode or load), the piece keeps
  its canvas, as before.

**A piece that failed to load is tried again while it is worn**
(`_ensureTraitLoaded`'s `retryAt`).
- A facing, or a piece's `meta.json`, that gives up after its three tries is
  tried again later, a round of three tries each time.
- The rounds come 5 s, 10 s, 20 s and 40 s after the last give-up, then every
  minute.
- A retry happens only while something on screen wears the piece. A piece
  nobody wears asks for nothing.
- A later round adds `&g=<round>` to the address, so it is never answered from
  a cache.

`?keepimage=0` and `?traitretry=0` are the game as it was.
`window.__btKeptImages()` shows how many pictures are kept as images.

## Tests

`mp-headkeep` (9 checks, a phone in the world, the owner's look chosen in the
creator):
1. (guard) the worker's record holds the look, and every piece is drawn
   standing south;
2. every head piece is kept as an image, nothing waiting;
3. (guard) every canvas behind a texture is emptied as Safari empties them,
   while the bro has faced south only;
4. in all eight facings, jogging and standing, the hair, the hat and the
   glasses are drawn (read back off the graphics chip);
5. (guard) the graphics are rebuilt;
6. after the rebuild, still drawn in all eight facings;
7. (guard) the top hat's southwest file is refused on every try, and the hat
   is not drawn there;
8. once the file can be had, the top hat comes back on the southwest while it
   is worn;
9. no page errors.

`QA_HK_EXPECT=blank` runs the build before: after the wipe 40 of the 46 pieces
read drew nothing, after the rebuild all 46, and the hat never came back.

TRAPS §253.

## Not done

- The other pictures the game makes on canvases (the body sheets, the armour
  and gear sheets, the baked masked bodies, the gathering figures) are still
  canvases. Turning a big sheet into a PNG on the loading screen costs real
  time on a phone. The v2.3.3574 check still reloads the page when it finds
  them emptied on a return to the tab.
- Whether Safari empties canvases during play, or only while the tab is
  parked, is still not measured on a phone. This fix does not depend on the
  answer.
