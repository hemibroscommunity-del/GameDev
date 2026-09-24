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

/* ═══ v2.3.2856: THE COOK ═══
 *
 * Owner: "Yea do woodcutting and missing ones."  Cooking is one of the missing
 * ones: the campfire swaps your body for a pre-drawn cook
 * (sprites/skills/cook-strip.webp, 24 frames of 213x220, all played), baked
 * with your skin and nothing else, so every drawing vanished while you cooked.
 *
 * This figure is kinder than the lumberjack.  He squats facing the camera and
 * only his arms and the pan move: the head and the torso sit on the same pixels
 * in all 24 frames (measured -- the head's box moves by one pixel at the crown,
 * and v2.3.1710 found the same of the torso when it pinned the cook's shirt to
 * one frame).  So the face and torso boxes and most of the seeds are one entry for
 * every frame, and only the forearm moves: it lies across the lap from the
 * elbow to the hand, and its top edge is outlined with gaps, so without a seed
 * of its own the torso's flood ran down through them and claimed the hand.
 *
 *   face   the head's whole box, ears included, as the lumberjack's is.
 *   torso  neck to belly between the two arms' inner outlines.  The belly is
 *          behind the forearm on every frame; the box includes it, so the
 *          drawing holds still and the forearm crosses in front of it.
 *
 * `pieceKeep`: the arm drawing is fitted to each arm piece that is at least
 * this share of the frame's biggest one (playerDecal PIECE_KEEP, 0.35 for the
 * walking body).  Measured here: the far arm -- the one on the pan's handle --
 * is 23-58% of the near arm, and every other arm-labelled piece (knuckles,
 * specks of skin between outlines) is at most 11%.  At 0.35 that arm lost its
 * drawing on 10 of the 24 frames, so it blinked at 17 fps; 0.17 sits between.
 *
 * The legless strip (cook-strip-legless.webp) was exported separately and
 * differs from this one by a few hundred edge pixels per frame, so each strip
 * is split on its OWN skin -- the seeds and boxes are measured to land inside
 * the same parts of both.
 *
 * IF THE ART IS RE-CUT, THIS TABLE IS WRONG -- see the lumberjack's note. */
const COOK_FOREARM = [
  [30, 135, 75, 147], [28, 137, 62, 152], [25, 133, 62, 150], [20, 137, 60, 152],
  [30, 133, 78, 145], [28, 132, 95, 145], [28, 135, 78, 150], [28, 136, 70, 152],
  [28, 135, 68, 150], [22, 133, 68, 148], [12, 132, 58, 152], [14, 133, 62, 152],
  [28, 132, 72, 148], [28, 133, 82, 145], [28, 133, 82, 146], [28, 135, 72, 152],
  [18, 133, 62, 153], [18, 133, 66, 150], [28, 133, 74, 145], [28, 133, 80, 144],
  [28, 133, 82, 145], [28, 137, 72, 152], [18, 133, 62, 155], [18, 133, 66, 152],
];
export const COOK_INK_REGIONS = Object.freeze({
  fw: 213,
  fh: 220,
  pieceKeep: 0.17,
  seeds: COOK_FOREARM.map((fore) => ({
    /* the crown, a line through the eyes, a line above the mouth */
    head: [[80, 18], [55, 40, 110, 40], [62, 65, 105, 65]],
    /* chest, belly above the forearm, and both sides of the neck -- without the
       last two the head's flood took a sliver of the right shoulder */
    torso: [[55, 92, 85, 92], [70, 105], [50, 115, 85, 115], [60, 84], [100, 86]],
    /* both upper arms from the shoulder down, and this frame's forearm */
    arms: [[28, 85, 30, 118], [117, 88, 118, 125], fore],
  })),
  face: COOK_FOREARM.map(() => [44, 120, 4, 80]),
  torso: COOK_FOREARM.map(() => [43, 100, 78, 140]),
});

/* The cook's fingers.  The hand on the pan's handle is drawn as small islands
   of skin cut apart by the handle's outline, and recolorStandInSkin's size
   floor (1500 px) -- set for the fish frying in the pan, which is painted in
   the same orange -- dropped them with the fish.  So a player of any skin but
   the painted one cooked with orange fingers: the lumberjack's head bug
   (CHOP_MIN_BLOB), on the cook's hand.  Size cannot tell the two apart (both
   run from a few pixels to a few hundred); position can.  Measured on every
   frame of both strips, every finger or knuckle island starts left of x = 117
   and every fish piece at x = 125 or further right, inside the pan.  An island
   that starts left of this column is the cook's own skin, however small. */
export const COOK_KEEP_X = 120;

/* ═══ v2.3.2858: THE FIRE-LIGHTER ═══
   Owner: "Yea do woodcutting and missing ones" -- the last of them.  Lighting a
   fire swaps you for the painted fire-lighter (sprites/skills/firemaking-strip
   .webp, 8 frames of 384x512), baked in your skin by recolorStandInSkin with
   FIRE_SKIN_OPTS and SHARED with every other player's fire-lighter on your
   screen, exactly like the cook -- so the drawings go on a layer over it the
   same way (effectsRenderer, _fetchAndBakeFire).

   He stands (0), kneels to the log (1, 2), strikes the flint (3), cups his
   hands to blow on the flame (4, 5), sits back (6) and stands up (7).  On 3-5
   the near arm crosses his chest, and its outlines cut the torso into the
   chest above it and the belly below: both are seeded as torso, and the torso
   box spans the arm, so the chest drawing holds still and the arm passes in
   front of it -- the rule the lumberjack table above states.  4 and 5 are the
   same pose and share their boxes, so the drawings do not jump between them.
   Wherever both arms show, the smaller is at least 58% of the bigger, so the
   body's own 35% rule (pieceKeep unset) puts the arm drawing on both; the
   fist's islands on 4-5 (FIRE_KEEP_BOXES, at most 10%) do not take it.
   Fitted with the cook's workbench; picture in docs/specs/cook-ink.md. */
export const FIRE_INK_REGIONS = Object.freeze({
  fw: 384,
  fh: 512,
  seeds: [
    /* 0: standing, arms at his sides */
    { head: [[245, 45], [215, 78, 275, 78], [222, 100, 270, 100]], torso: [[243, 140], [243, 200], [215, 180, 275, 180], [243, 235]], arms: [[190, 185, 190, 255], [295, 185, 295, 255]] },
    /* 1-2: kneeling, the near hand down on the log */
    { head: [[222, 190], [190, 230, 250, 230], [195, 252, 245, 252]], torso: [[228, 290], [228, 340], [205, 320, 255, 320]], arms: [[180, 300, 150, 340, 128, 372], [278, 305, 280, 380]] },
    { head: [[205, 212], [180, 262, 235, 262], [185, 282, 230, 282]], torso: [[228, 310], [230, 350], [210, 330, 250, 330]], arms: [[175, 310, 155, 345, 140, 372], [280, 320, 290, 370]] },
    /* 3: the strike -- chest above the crossing arm, belly below it */
    { head: [[278, 195], [250, 237, 305, 237], [252, 262, 302, 262]], torso: [[270, 295], [285, 362], [260, 370, 310, 370]], arms: [[330, 305], [260, 332], [215, 336]] },
    /* 4-5: blowing on the flame, hands cupped at it */
    { head: [[278, 160], [248, 205, 305, 205], [252, 232, 300, 232]], torso: [[270, 265], [285, 330], [255, 345, 315, 345]], arms: [[322, 272], [262, 300], [218, 300]] },
    { head: [[278, 160], [248, 205, 305, 205], [252, 232, 300, 232]], torso: [[270, 265], [285, 330], [255, 345, 315, 345]], arms: [[322, 272], [262, 300], [218, 300]] },
    /* 6: sitting back, one hand on the knee */
    { head: [[258, 140], [228, 180, 285, 180], [232, 205, 282, 205]], torso: [[265, 240], [265, 290], [245, 270, 290, 270]], arms: [[220, 280, 212, 320], [318, 260, 322, 320]] },
    /* 7: standing again */
    { head: [[250, 22], [222, 52, 280, 52], [226, 78, 276, 78]], torso: [[250, 115], [250, 170], [222, 150, 280, 150], [250, 205]], arms: [[199, 160, 199, 232], [301, 160, 301, 232]] },
  ],
  face: [
    [198, 288, 32, 119], [179, 269, 177, 269], [164, 252, 200, 294], [234, 321, 184, 272],
    [234, 320, 153, 243], [234, 320, 153, 243], [214, 302, 128, 222], [206, 295, 11, 101],
  ],
  torso: [
    [199, 287, 125, 242], [194, 260, 269, 371], [190, 267, 291, 377], [221, 326, 279, 382],
    [222, 325, 249, 354], [222, 325, 249, 354], [223, 301, 224, 326], [206, 295, 102, 216],
  ],
});

/* The fire-lighter's fist.  On frames 4 and 5 the hands cupped at the flame
   are drawn as small islands of skin cut apart by their outlines, and
   FIRE_SKIN_OPTS' size floor (1800 px) -- set to keep the flame and its sparks
   out, which pass the skin test in the same orange -- dropped them with the
   sparks: up to 452 px of fist per frame kept the artist's orange whatever
   your skin.  The cook's fingers again (COOK_KEEP_X), but a column cannot
   separate these: the flame burns on BOTH sides of the fist.  So each frame
   gets a box around the hands, [left, right, top, bottom], frame-local, and an
   island lying wholly inside it is the fire-lighter's own skin.  Measured on
   both frames: the boxes take 44 and 19 islands (366 and 452 px), every one of
   them fist, knuckle or its lit edge, and leave out every flame, spark and
   glow piece, the nearest of which start at x 162-180, left of the boxes.
   Frame 3's knuckles are painted glowing red by the flint and are not skin to
   begin with; 6 and 7 have no islands of hand, only trousers the fire lights
   orange, which stay trousers. */
export const FIRE_KEEP_BOXES = Object.freeze([
  null, null, null, null,
  [168, 245, 260, 325],
  [195, 245, 262, 325],
  null, null,
]);
