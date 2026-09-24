/* ═══ v2.3.2855: WHERE THE DRAWINGS GO ON A PRE-DRAWN STAND-IN ═══
 *
 * Owner: "yes make tattoos stay on while harvesting resources" -- then "Yea do
 * woodcutting".  Woodcutting does not draw your body at all: it swaps in a
 * pre-drawn lumberjack (sprites/skills/chop-strip.webp, the twelve played
 * frames 12..23), so the body's own region split has nothing to work on, and
 * tried on this figure it put the face tattoo on the raised hands and the chest
 * tattoo on the arm crossing the chest (docs/specs/harvest-ink.md).
 *
 * This file is that figure's regions, fitted by eye against the art, one entry
 * per PLAYED frame, in the strip's own pixels (240x220 frames):
 *
 *   seeds  where the head, the torso and the arms are -- a few points or short
 *          lines on each.  playerDecal's splitSkinBySeeds floods out from them
 *          over the skin, and the painted outlines stop the flood, so these only
 *          have to land INSIDE the right part, not trace it.
 *   face   the head's whole box, [left, right, top, bottom].  The face drawing
 *          is fitted to it, exactly as the body fits it to the head.
 *   torso  the torso's whole box, INCLUDING what the arms hide on that frame.
 *          Measuring it from the visible skin would move the chest drawing up
 *          and down as the arm sweeps across it; fixed, the drawing holds still
 *          and the arm passes in front of it, which is what an arm does.
 *
 * The arms have no box: each arm piece is measured as the body measures its
 * arms (eachPiece).
 *
 * The legless strip (chop-strip-legless.webp) is the same figure with the legs
 * erased -- measured identical above row 118, and below that only the trousers
 * differ -- so it uses this table unchanged.
 *
 * IF THE ART IS RE-CUT, THIS TABLE IS WRONG.  `fw`/`fh` are checked by the bake
 * and a strip of any other size gets no drawings rather than misplaced ones;
 * a re-drawn strip of the same size needs this refitted (the workbench that
 * fitted it is described in the spec).  mp-harvestink reads where the ink lands
 * on every frame, so a stale table shows up there, not on a player. */
export const CHOP_INK_REGIONS = Object.freeze({
  fw: 240,
  fh: 220,
  seeds: [
    /* 0-2: the axe raised over the left shoulder, both fists up by the head */
    { head: [[110, 70], [100, 62, 122, 62], [103, 86, 128, 84]], torso: [[120, 125, 125, 135], [110, 138, 132, 120], [138, 112]], arms: [[70, 75, 85, 88, 110, 98, 130, 100]] },
    { head: [[108, 76], [98, 66, 120, 66], [100, 94, 126, 93]], torso: [[122, 130, 110, 140], [135, 125, 122, 130], [140, 115]], arms: [[75, 88, 95, 105, 120, 108, 133, 106]] },
    { head: [[98, 76], [90, 66, 110, 66], [88, 94, 118, 92]], torso: [[118, 132, 108, 142], [132, 125, 118, 132], [138, 112]], arms: [[55, 95, 80, 106, 110, 108, 125, 106]] },
    /* 3-4: the swing comes down across the body to the lower left */
    { head: [[107, 78], [97, 68, 118, 68], [98, 100, 118, 99]], torso: [[130, 130, 135, 110], [115, 103, 135, 110]], arms: [[125, 112, 100, 125, 78, 137]] },
    { head: [[106, 80], [96, 70, 116, 70], [97, 97, 116, 97]], torso: [[130, 125, 135, 112], [110, 112, 118, 118]], arms: [[140, 103, 115, 125, 92, 140]] },
    /* 5-11: the body has turned; the axe is drawn back to the right, the near
       arm straight across the chest to the fists on the haft */
    { head: [[113, 72], [103, 62, 124, 62], [104, 88, 126, 86]], torso: [[100, 110, 105, 130], [120, 100, 130, 100], [118, 136, 132, 138]], arms: [[120, 120, 150, 125, 175, 125]] },
    { head: [[114, 73], [104, 63, 125, 63], [104, 89, 126, 87]], torso: [[100, 105, 100, 135], [120, 100, 130, 100], [118, 136, 135, 138]], arms: [[115, 122, 150, 125, 170, 125]] },
    { head: [[114, 73], [104, 63, 125, 63], [104, 89, 126, 87]], torso: [[100, 105, 100, 135], [120, 100, 130, 100], [118, 136, 135, 138]], arms: [[115, 122, 150, 125, 170, 125]] },
    { head: [[111, 72], [101, 62, 122, 62], [102, 88, 126, 87]], torso: [[100, 105, 100, 138], [115, 100, 130, 100], [112, 136, 128, 138]], arms: [[115, 118, 150, 122, 178, 122]] },
    { head: [[111, 72], [101, 62, 122, 62], [102, 88, 126, 87]], torso: [[100, 105, 100, 138], [115, 100, 130, 100], [112, 136, 128, 138]], arms: [[115, 118, 150, 122, 178, 122]] },
    { head: [[111, 72], [101, 62, 122, 62], [102, 88, 126, 87]], torso: [[100, 105, 100, 138], [115, 100, 130, 100], [112, 136, 128, 138]], arms: [[115, 118, 150, 122, 178, 122]] },
    { head: [[111, 72], [101, 62, 122, 62], [102, 88, 126, 87]], torso: [[100, 105, 100, 138], [115, 100, 130, 100], [112, 136, 128, 138]], arms: [[115, 118, 150, 122, 178, 122]] },
  ],
  face: [
    [84, 125, 53, 92], [83, 130, 57, 99], [81, 122, 57, 99],
    [84, 126, 59, 101], [84, 128, 60, 102],
    [92, 134, 52, 95], [93, 134, 52, 94], [93, 134, 52, 94], [95, 136, 52, 94],
    [96, 138, 52, 94], [98, 140, 52, 94], [99, 141, 52, 94],
  ],
  torso: [
    [100, 142, 95, 146], [101, 142, 97, 147], [100, 141, 97, 148],
    [97, 143, 99, 148], [95, 143, 101, 147],
    [89, 138, 94, 143], [89, 135, 92, 142], [88, 134, 92, 142], [88, 134, 92, 142],
    [87, 134, 91, 142], [88, 135, 91, 142], [88, 137, 91, 142],
  ],
});

/* The chop strip's skin floor for recolorStandInSkin.  The shared default
   (1500 px) was chosen for the COOK, whose body is one blob of 9.5-10.8k px and
   whose fish is a skin-coloured prop of up to 523 -- and the lumberjack was
   given it without measuring its own art (v2.3.2500).  Measured on the twelve
   played frames of both strips: on frames 6..11 the head is its OWN blob,
   1230-1246 px, cut off from the body by the chin's outline, and every finger,
   the far hand and the far arm are islands of 1-284 px.  At 1500 none of them
   was recoloured, so half of every swing showed your body in your skin and
   your head in the artist's.  Every skin-coloured pixel in these frames is the
   lumberjack -- the axe is the magenta tool key, which the skin test refuses --
   so the floor is 1: all of him. */
export const CHOP_MIN_BLOB = 1;
