/* ═══ v2.3.2983: A LITTLE LIFE ON EACH BUILDING ═══
 *
 * Owner, 2026-10-02: "Also add effects just using code to each building to
 * make subtle liveliness effects".
 *
 * Where on each of the owner's building pictures (public/world/objects/, the
 * Object Studio's, 2026-10-02) something lives, as shares of the picture --
 * `u` across from its left, `v` down from its top -- so the spot moves with
 * the picture however big it is drawn (the big-town preview).  What lives
 * there (`fx`), drawn by src/rendering/wheelLife.js in code, no pictures:
 *
 *   smoke   a puff now and then, rising and drifting off a chimney's top
 *           (`s`, its strength: 1 a chimney, less a stovepipe)
 *   glow    a lamp's warm light, breathing and flickering a little (`s` its
 *           size, a share of the picture's width)
 *   sparks  a few sparks jumping off the forge
 *   glint   a star of light that comes and goes on something shiny
 *   chaff   a speck of hay drifting down from the loft
 *
 * Measured off the pictures: a chimney's spot is the top of its solid
 * column, a lamp's the middle of its warm pixels (tools/world/test-world-core
 * checks both against the game's own copy -- a building drawn again moves
 * them, and the test says which).
 */
export const BUILDING_LIFE = {
  townhall: [
    { fx: 'smoke', u: 0.781, v: 0.183, s: 0.7 },     /* the chimney */
    { fx: 'glint', u: 0.5, v: 0.21 },                /* the clock tower's bell */
    { fx: 'glint', u: 0.5, v: 0.47 },                /* the star over the sign */
    { fx: 'glint', u: 0.82, v: 0.75 },               /* the trophies */
    { fx: 'glow', u: 0.41, v: 0.69, s: 0.035 },      /* the lantern left of the door */
    { fx: 'glow', u: 0.59, v: 0.69, s: 0.035 },      /* the lantern right of it */
  ],
  blacksmith: [
    { fx: 'smoke', u: 0.779, v: 0 },                 /* the stone chimney */
    { fx: 'smoke', u: 0.168, v: 0.172, s: 0.6 },     /* the stovepipe */
    { fx: 'sparks', u: 0.25, v: 0.75 },              /* the forge */
    { fx: 'glow', u: 0.273, v: 0.753, s: 0.07 },     /* the forge fire */
    { fx: 'glow', u: 0.42, v: 0.67, s: 0.04 },       /* the lantern by the door */
  ],
  woodworker: [
    { fx: 'smoke', u: 0.762, v: 0 },                 /* the chimney */
    { fx: 'glow', u: 0.404, v: 0.657, s: 0.04 },     /* the lantern left of the door */
    { fx: 'glow', u: 0.619, v: 0.655, s: 0.04 },     /* the lantern right of it */
    { fx: 'glow', u: 0.53, v: 0.3, s: 0.05 },        /* the gable window */
  ],
  gemcutter: [
    { fx: 'smoke', u: 0.182, v: 0.01, s: 0.6 },      /* the chimney */
    { fx: 'glint', u: 0.47, v: 0.13 },               /* the great crystal on the roof */
    { fx: 'glint', u: 0.51, v: 0.46 },               /* the magnifying glass */
    { fx: 'glint', u: 0.79, v: 0.78 },               /* the window of gems */
    { fx: 'glow', u: 0.38, v: 0.71, s: 0.04 },       /* the lantern left of the door */
    { fx: 'glow', u: 0.59, v: 0.71, s: 0.04 },       /* the lantern right of it */
  ],
  sheriff: [
    { fx: 'smoke', u: 0.261, v: 0, s: 0.6 },         /* the stovepipe */
    { fx: 'glint', u: 0.5, v: 0.45 },                /* the star */
    { fx: 'glow', u: 0.361, v: 0.585, s: 0.04 },     /* the lantern left of the door */
    { fx: 'glow', u: 0.628, v: 0.585, s: 0.04 },     /* the lantern right of it */
  ],
  saloon: [
    { fx: 'smoke', u: 0.18, v: 0 },                  /* the chimney */
    { fx: 'glow', u: 0.343, v: 0.437, s: 0.04 },     /* the lantern left of the moose */
    { fx: 'glow', u: 0.658, v: 0.435, s: 0.04 },     /* the lantern right of it */
    { fx: 'glow', u: 0.478, v: 0.697, s: 0.06 },     /* the lamp over the swinging doors */
  ],
  gambling: [
    { fx: 'smoke', u: 0.27, v: 0, s: 0.7 },          /* the chimney */
    { fx: 'glow', u: 0.062, v: 0.676, s: 0.04 },     /* the lantern on the left post */
    { fx: 'glow', u: 0.941, v: 0.67, s: 0.04 },      /* the lantern on the right post */
    { fx: 'glint', u: 0.73, v: 0.73 },               /* the roulette wheel */
  ],
  hotel: [
    { fx: 'smoke', u: 0.164, v: 0 },                 /* the chimney */
    { fx: 'smoke', u: 0.758, v: 0.04, s: 0.6 },      /* the small chimney */
    { fx: 'glow', u: 0.374, v: 0.729, s: 0.035 },    /* the lantern left of the door */
    { fx: 'glow', u: 0.633, v: 0.73, s: 0.035 },     /* the lantern right of it */
    { fx: 'glow', u: 0.366, v: 0.507, s: 0.035 },    /* the balcony lantern left */
    { fx: 'glow', u: 0.639, v: 0.508, s: 0.035 },    /* the balcony lantern right */
  ],
  post: [
    { fx: 'smoke', u: 0.187, v: 0.072 },             /* the chimney */
    { fx: 'glow', u: 0.35, v: 0.61, s: 0.04 },       /* the lantern left of the door */
  ],
  cookhouse: [
    { fx: 'smoke', u: 0.26, v: 0.001 },              /* the stone chimney */
    { fx: 'smoke', u: 0.1, v: 0.54, s: 0.5 },        /* the bread oven's top */
    { fx: 'glow', u: 0.103, v: 0.703, s: 0.06 },     /* the bread oven's fire */
  ],
  feedseed: [
    { fx: 'chaff', u: 0.51, v: 0.42 },               /* the hay in the loft door */
    { fx: 'glow', u: 0.039, v: 0.696, s: 0.035 },    /* the lantern on the left post */
  ],
  landoffice: [
    { fx: 'smoke', u: 0.23, v: 0.032 },              /* the chimney */
    { fx: 'glint', u: 0.7, v: 0.62 },                /* the telescope */
    { fx: 'glow', u: 0.5, v: 0.23, s: 0.04 },        /* the round gable window */
  ],
  guildhall: [
    { fx: 'smoke', u: 0.808, v: 0.145 },             /* the chimney */
    { fx: 'glint', u: 0.5, v: 0.04 },                /* the golden trophy on the roof */
  ],
  bank: [
    { fx: 'smoke', u: 0.216, v: 0 },                 /* the chimney */
    { fx: 'glint', u: 0.5, v: 0.27 },                /* the gold bars over the sign */
    { fx: 'glint', u: 0.09, v: 0.76 },               /* the gold by the steps */
    { fx: 'glint', u: 0.66, v: 0.66 },               /* the vault door */
    { fx: 'glow', u: 0.334, v: 0.598, s: 0.035 },    /* the lantern left of the door */
    { fx: 'glow', u: 0.553, v: 0.598, s: 0.035 },    /* the lantern right of it */
  ],
  assay: [
    { fx: 'smoke', u: 0.215, v: 0.003 },             /* the brick chimney */
    { fx: 'smoke', u: 0.791, v: 0, s: 0.6 },         /* the stovepipe */
    { fx: 'glint', u: 0.39, v: 0.46 },               /* the gold on the scales */
    { fx: 'glint', u: 0.89, v: 0.64 },               /* the sword's gem */
  ],
  store: [
    { fx: 'smoke', u: 0.793, v: 0, s: 0.6 },         /* the chimney */
    { fx: 'glow', u: 0.312, v: 0.304, s: 0.035 },    /* the lamp over the D */
    { fx: 'glow', u: 0.505, v: 0.296, s: 0.035 },    /* the lamp over the A */
    { fx: 'glow', u: 0.709, v: 0.305, s: 0.035 },    /* the lamp over the S */
  ],
  auction: [
    { fx: 'glint', u: 0.5, v: 0.23 },                /* the bell */
    { fx: 'glow', u: 0.411, v: 0.716, s: 0.035 },    /* the lantern left of the door */
    { fx: 'glow', u: 0.59, v: 0.714, s: 0.035 },     /* the lantern right of it */
  ],
};
