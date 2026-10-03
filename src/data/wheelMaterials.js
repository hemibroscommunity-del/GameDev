/* ═══ v2.3.2995: WHAT EACH OF THE WHEEL'S OBJECTS IS MADE OF ═══
 *
 * Owner, 2026-10-03: "change the sound if projectiles hit props to be more
 * appropriate for the type of material it is ... Also destructive props
 * would be cool.  Maybe after too many shots it shatters into pieces using
 * code ... I also think it would be cool if on the client side you could
 * destroy buildings before having them repaired in a few minutes."
 *
 * Until now every one of the Wheel's ~13,000 objects answered a hit as grey
 * stone: data/worldProps.js PROP_MATERIALS is keyed by the OLD town's prop
 * ids, a Wheel footprint carries its catalog id ('oak', 'barrel',
 * 'saloon'), and an id it does not know falls back to plain stone -- so an
 * arrow in a barrel threw grey chips and sparks and rang like a sword on a
 * rock.  This is the Wheel's own answer, one entry per object in the Object
 * Studio's catalog (public/tools/objects/catalog.js; test-world-core fails
 * when an object there has no entry here), read off each picture and its
 * prompt:
 *
 *   mat     what it is made of, where a shot meets it -- its FOOTPRINT, the
 *           ground floor of a building and the trunk of a tree.  It decides
 *           the sound (BT_AUDIO.propHit / propBreak, gameDisplay.js) and the
 *           pieces that fly (rendering/hitMaterialFx.js).  A building is
 *           what its ground floor is built of: the Town Hall's cut stone, the
 *           saloon's painted boards, the store's red brick.
 *   hp      how many hits it takes before it breaks (src/game/wheelBreak.js):
 *           an arrow, a bolt or a sword blow is one, a special three.
 *   canopy  a tree's crown, which a hit on its trunk shakes things out of:
 *           leaves, the snow on a pine, the char of a burnt tree, slime --
 *           and, since v2.3.3001, is heard doing it (BT_AUDIO.CROWN_SOUNDS:
 *           a rustle, a crunch of snow, a puff of ash, a squelch).
 *   big     a heavy thing: the deeper of the material's sounds, and its
 *           break is a collapse, not a snap.
 *
 * Everything here is cosmetic and on your screen only -- the worker knows
 * nothing of the Wheel's objects, so breaking one changes no fight.
 */

/* The materials: `fx` is hitMaterialFx's recipe, `sound` the BT_AUDIO
   material (gameDisplay.js PROP_SOUNDS).  `tint` colours the pixel pieces
   used when the object's own art is not to hand (a peer's shot at an object
   not yet drawn); the pieces are otherwise cut from the picture itself. */
export const MATERIALS = {
  wood:    { fx: 'wood',    sound: 'wood',    tint: 0x8b5e3c },
  stone:   { fx: 'stone',   sound: 'stone',   tint: 0x9a968e },
  brick:   { fx: 'stone',   sound: 'stone',   tint: 0x9c4a36 },
  metal:   { fx: 'metal',   sound: 'metal',   tint: 0x4a4f57 },
  leaf:    { fx: 'leaf',    sound: 'leaf',    tint: 0x4f8a3a },
  straw:   { fx: 'straw',   sound: 'straw',   tint: 0xd8b45a },
  snow:    { fx: 'snow',    sound: 'snow',    tint: 0xffffff },
  ice:     { fx: 'ice',     sound: 'ice',     tint: 0xbfe3f5 },
  crystal: { fx: 'crystal', sound: 'crystal', tint: 0x9a7fe0 },
  coal:    { fx: 'coal',    sound: 'coal',    tint: 0x2b2b2e },
  /* ═══ v2.3.3001: PLANTS ARE NOT WOOD, AND NOT SLIME ═══
     Owner: "modify hit sound effects based on material type so hitting wood
     vs plants etc".  The cactus, the toadstool and the giant flower were all
     'soft', whose sound was the fleshy monster thud -- a slime's.  They keep
     the soft pulpy pieces (`fx`) and get sounds of their own: `plant` is the
     rustle and a pulpy squish (the cactus, the giant flower), `mushroom` a
     squelch (the toadstool).  The bush ('leaf') is a rustle alone.  The look
     is soft's exactly, its tint included: this is a change of sound only. */
  plant:    { fx: 'soft',   sound: 'plant',    tint: 0x8fbf5a },
  mushroom: { fx: 'soft',   sound: 'mushroom', tint: 0x8fbf5a },
};

const W = (mat, hp, o) => Object.assign({ mat, hp }, o || {});
const BUILDING_HP = 24;

/* Keyed by catalog id -- a fixed table, never a client-supplied key */
export const WHEEL_MATERIALS = {
  /* ── Brotown's buildings: their ground floors ── */
  townhall:   W('stone', 30, { big: true }),   /* pale cut stone below, clapboard above */
  blacksmith: W('stone', BUILDING_HP, { big: true }),   /* fieldstone ground floor */
  woodworker: W('wood', BUILDING_HP, { big: true }),
  gemcutter:  W('stone', BUILDING_HP, { big: true }),
  sheriff:    W('stone', BUILDING_HP, { big: true }),   /* a fieldstone jailhouse */
  saloon:     W('wood', BUILDING_HP, { big: true }),
  gambling:   W('wood', BUILDING_HP, { big: true }),
  hotel:      W('wood', BUILDING_HP, { big: true }),
  post:       W('wood', BUILDING_HP, { big: true }),
  cookhouse:  W('wood', BUILDING_HP, { big: true }),
  feedseed:   W('wood', BUILDING_HP, { big: true }),
  landoffice: W('wood', BUILDING_HP, { big: true }),
  guildhall:  W('wood', BUILDING_HP, { big: true }),    /* a log hall */
  bank:       W('stone', BUILDING_HP, { big: true }),   /* cut sandstone */
  assay:      W('brick', BUILDING_HP, { big: true }),   /* sandstone below, brick above */
  store:      W('brick', BUILDING_HP, { big: true }),
  auction:    W('brick', BUILDING_HP, { big: true }),
  /* ── the town's props ── */
  lamp:        W('metal', 4),
  barrel:      W('wood', 3),
  crate:       W('wood', 3),
  haybale:     W('straw', 3),
  trough:      W('wood', 4),
  hitch:       W('wood', 3),
  bench:       W('wood', 3),
  well:        W('stone', 10),
  signpost:    W('wood', 4),
  cart:        W('wood', 6),
  noticeboard: W('wood', 5),
  gate:        W('wood', 14, { big: true }),   /* two log posts and a beam overhead */
  fence:       W('wood', 4),
  'fence-down': W('wood', 4),
  /* ── Brotown Commons ── */
  oak:      W('wood', 10, { big: true, canopy: 'leaf' }),
  orchard:  W('wood', 8, { canopy: 'leaf' }),
  bush:     W('leaf', 3),
  haystack: W('straw', 5),
  stone:    W('stone', 6),
  flowers:  W('leaf', 1),     /* no footprint: nothing ever hits it */
  stump:    W('wood', 4),
  /* ── Frost Ridge ── */
  pine:      W('wood', 10, { big: true, canopy: 'snow' }),   /* heavy with snow */
  birch:     W('wood', 8, { canopy: 'snow' }),               /* dusted with it */
  snowrock:  W('stone', 6),
  icespire:  W('ice', 8),
  frostbush: W('leaf', 1),    /* no footprint */
  /* ── Flame Fields ── */
  deadtree:  W('wood', 8, { canopy: 'char' }),
  charstump: W('wood', 4),
  basalt:    W('stone', 8),
  obsidian:  W('crystal', 8),   /* volcanic glass */
  /* ── Wind Dunes ── */
  cactus:     W('plant', 4),      /* v2.3.3001: was 'soft' (a slime's thud) */
  palm:       W('wood', 10, { big: true, canopy: 'leaf' }),
  tumbleweed: W('straw', 1),    /* no footprint */
  skull:      W('stone', 1),    /* no footprint */
  hoodoo:     W('stone', 14, { big: true }),
  sage:       W('leaf', 1),     /* no footprint */
  /* ── Stone Hollows ── */
  boulder:  W('stone', 10, { big: true }),
  crystal:  W('crystal', 6),
  minecart: W('metal', 8),
  rubble:   W('stone', 1),      /* no footprint */
  /* ── Electric Foundry ── */
  pylon: W('metal', 16, { big: true }),
  scrap: W('metal', 6),
  coal:  W('coal', 6),
  coil:  W('metal', 10, { big: true }),
  /* ── Water Caves ── */
  driftwood: W('wood', 4),
  netpole:   W('wood', 5),
  rowboat:   W('wood', 8),
  searock:   W('stone', 8),
  shell:     W('stone', 1),     /* no footprint */
  coral:     W('stone', 1),     /* no footprint */
  /* ── Poison Forest ── */
  slimetree: W('wood', 10, { big: true, canopy: 'slime' }),
  toadstool: W('mushroom', 4),   /* v2.3.3001: was 'soft' */
  mangrove:  W('wood', 10, { big: true, canopy: 'leaf' }),
  scarecrow: W('straw', 4),
  /* ── Verdant Wilds ── */
  jungletree:  W('wood', 16, { big: true, canopy: 'leaf' }),
  wildfruit:   W('wood', 8, { canopy: 'leaf' }),
  giantflower: W('plant', 3),     /* v2.3.3001: was 'soft' */
  fern:        W('leaf', 1),    /* no footprint */
  stonewall:   W('stone', 10),
};

const FALLBACK = W('stone', 8);

/** What the Wheel object of catalog id `id` is: { mat, hp, canopy?, big? }. */
export function wheelMaterialOf(id) {
  return (id && Object.prototype.hasOwnProperty.call(WHEEL_MATERIALS, id) && WHEEL_MATERIALS[id]) || FALLBACK;
}

/** ...and its material's entry in MATERIALS: { fx, sound, tint }. */
export function materialInfo(mat) {
  return (mat && Object.prototype.hasOwnProperty.call(MATERIALS, mat) && MATERIALS[mat]) || MATERIALS.stone;
}
