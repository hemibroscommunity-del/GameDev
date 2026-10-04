/* ═══ v2.3.2937: THE GROUND — swatches laid on the plan ═══
 *
 * Owner, 2026-09-29: "Yes definitely do the swatches."  Since v2.3.2935 the
 * ground is not painted square by square: it is made from about fifty
 * seamless GROUND SWATCHES in HD pixel art -- four stages for each of the
 * eight elements, the commons, the town, the roads and the border lands --
 * and laid onto the blueprint by code (docs/WORLD-BIBLE.md §13).
 *
 * This module does that laying, and nothing that needs a browser:
 *
 *   groundCatalog(plan)   every swatch the world needs, derived from the
 *                         plan (its stages, borders and classes), with a
 *                         brief for its prompt and where it is used;
 *   materialMap(plan, bp) which swatch covers each blueprint cell, or the
 *                         sea -- water is drawn by the game, not a swatch;
 *   composeGround(...)    the ground of any rectangle from the swatch
 *                         pictures, at one output pixel per art px (1.5 game
 *                         px) or, since v2.3.2942, finer (opts.scale);
 *   groundOverview(...)   the whole map at one pixel a cell, each swatch in
 *                         its own colour -- the Ground Studio's progress map.
 *
 * It is what the Ground Studio (public/tools/ground/) previews with, and --
 * since v2.3.2943 -- what the game itself lays its ground with, on the phone,
 * in a worker (ground-worker.js, the `?trial=wheel` switch): the download
 * stays the swatches, however big the map grows.  For that it also gives
 *
 *   swatchesUnder(...)    which swatches a rectangle's ground can use;
 *   blendsUnder(...)      ...and which blend pictures (v2.3.2951);
 *   walkBits(...)         where you cannot walk (the sea, rivers, lakes);
 *   swimBits(...)         ...and of those, where you can swim (v2.3.3003);
 *   overviewPixels(...)   the whole map, small, in the plan's colours.
 *
 * ── HOW TWO SWATCHES MEET ──
 * Never with a soft blend: pixel art has no half-colours.  NATURAL ground --
 * grass, dirt, sand, snow, the roads, the water -- first meets on a ragged
 * line: each swatch's share of the ground is a smooth field over the cells
 * (the same blurred membership the World Builder's sketch uses), and every
 * pixel takes the swatch whose share, plus a little noise of its own, is
 * highest.  Two versions of a swatch (A and B) share the ground in large
 * noisy patches, so the repeat is harder to spot.
 *
 * v2.3.2947 (see WHERE TWO GROUNDS MEET below, and docs/WORLD-MAP-PIPELINE.md)
 * builds on that line, at three sizes:
 *   - a land's stages, and the commons and each first stage, give way over a
 *     wide band in patches (materialMap, landStage);
 *   - every edge between two grounds is a band whose width is the pair's,
 *     where the upper ground (a layer order of materials) reaches over the
 *     lower and the two pictures interlock along their own tufts and lumps,
 *     with no crumbs left (composeFine, edgeRecipe);
 *   - a ground's optional EDGE PIECES -- its loose tufts on magenta, its
 *     third picture -- are scattered whole along its edges (pieceMap).
 *     v2.3.2948: put away, since the owner saw no difference: kept and
 *     tested, but no tool shows or loads them (EDGE_PIECES below).
 * v2.3.2950: two grounds that are much alike (of one kind, or both loose
 * dry ground) change over a wide zone, in big patches (MIX), not at an
 * edge -- the town square into the yards, one meadow into the next.
 * v2.3.2951: such a pair may be given a BLEND picture, a third one made
 * from the two, laid through the middle of their zone (BLEND PICTURES).
 * The water keeps its shore, and the boardwalks their straight edges
 * (below).
 *
 * BUILT surfaces -- the town's street, boardwalks and square (BUILT below)
 * -- are laid exactly on their cells over the natural ground; since
 * v2.3.2950 only the boardwalks keep that straight edge (CRISP), the street
 * and the square mixing into the yards.  v2.3.2945, owner, on Main Street in the Ground Studio: "I think
 * wooden plank bits are on the edges."  They were the boardwalks: one cell
 * wide, and a blurred field cannot hold a strip that thin -- between the
 * street and a yard all three shares come out near a third, the noise
 * decides every pixel, and the planks crumbled into specks along both
 * edges of the street.  A surveyed town has straight edges anyway.
 *
 * PLANK DECKS (v2.3.2949) -- the boardwalks and the bridges -- are the one
 * ground laid by the way you walk.  Owner, on the Mill Bridge: "The bridge
 * needs to take shrink the tiles and maybe make them line up using your
 * coding I had to change the checker pattern wood the original prompt made
 * it didn't look right."  The boardwalk swatch is now boards running one
 * way (the basket weave's "checker" looked wrong), and the game lays them
 * itself (planksOf): it finds which way the picture's boards run and where
 * their seams are, makes the picture smaller so a board is half a cell
 * (12 game px) wide, and lays the boards ACROSS every deck -- the blueprint
 * records each one and the way along it (layout.js, `decks`) -- one board
 * per half cell of the whole world, so every seam lines up with the deck's
 * ends and with the next deck along the street.  Each board is one of the
 * picture's boards, picked and slid along its length by its place, so a
 * long boardwalk does not repeat.
 *
 * ── DETERMINISM ──
 * Everything is a function of absolute position (the frame's art px): the
 * tiles are anchored to the frame's origin, so two neighbouring rectangles
 * composed separately meet with no seam -- the property that lets the game
 * build its ground in chunks.  No Math.sin/cos/pow (core/rng.js).
 */
import { valueNoise, fbm, hash2 } from './rng.js';
import { gridInfo } from './grid.js';
import { C, hexToRgb } from './layout.js';
import { axisDist } from './wheel.js';

/* the id of the sea and every other water: one material, all of it (the walk
   grid, the shore, the edges), drawn from the WATER SWATCHES below where they
   are made and in the plan's own blues where they are not */
export const WATER = 'water';
/* ═══ v2.3.2980: THE WATER'S OWN PICTURES ═══
   Owner: "I don't see anywhere to add water in the ground studio and also
   give me the prompts."  Three pictures, made in the Ground Studio like any
   swatch: the open SEA, its SHALLOWS along every shore (where the water's
   share of the ground is low -- the same share the plan's blues were drawn
   by), and FRESH water for the rivers, ponds, lakes and oases.  The water is
   still one material: these only say how a water pixel looks (waterLook).
   The foam at the shore stays the game's own. */
export const WATER_SWATCHES = ['sea', 'shallows', 'fresh'];
/* v2.3.2984: a look whose picture is not made yet borrows one that is, in
   this order.  The owner made the sea and the shallows first ("Is this what
   you need for water?"), and two real pictures beside the plan's flat blue
   read as a mistake: the rivers and ponds take the shallows' clear water
   until fresh water is made. */
const WATER_STANDIN = { sea: ['sea', 'shallows', 'fresh'], shallows: ['shallows', 'sea', 'fresh'], fresh: ['fresh', 'shallows', 'sea'] };
/* v2.3.2984: how far the shallows reach out from the shore, in plan cells
   (24 game px each): SHALLOW_CELLS on average, their outer line wandering
   SHALLOW_WANDER either way.  The shore's distance is worked out only to
   SHORE_CAP; past it is open sea.  (Until now the shallows were wherever
   the water's blurred share was under 0.8, about 2 cells: 54 game px, one
   bro tall, a thin line round every coast.) */
export const SHALLOW_CELLS = 5, SHALLOW_WANDER = 2.6, SHORE_CAP = 8;
/* how far either side of the line between two spokes their border land
   reaches, in squares (about 700 art px across, a zone) */
const BORDER_BAND = 0.45;
/* how much each swatch's own noise pushes its edge about */
const JIT = 0.32;
/* v2.3.2945: the surfaces laid exactly on their cells (see the header) */
const BUILT = ['street', 'boardwalk', 'plaza'];
/* v2.3.2950: which of them keep a CRISP edge -- only the boardwalks now (and
   so the bridges, boardwalk decks).  Owner, on the town square with their
   own pictures in: "The problem surfacing is still the harsh transitions
   between different surfaces even if they're similar in theory."  The
   square and the street kept crisp edges too (v2.3.2945, "a surveyed town
   has straight edges"), so where the square's stony dirt met the yards'
   dirt it did so along a ruler line.  They still lie on their cells (it
   keeps the town's plan cheap to lay), but now meet the yards through a
   wide MIX (below), which hides the line under big patches. */
const CRISP = ['boardwalk'];

/* ═══ v2.3.2947: WHERE TWO GROUNDS MEET ═══
   Owner, 2026-09-30: "the change between two swatches is still too jarring
   and obvious.  Also layers need to be correct (grass slightly overlapping
   dirt areas).  I'm thinking of an irregular border area … that border
   area will need to vary in size depending on what two swatches are coming
   together."

   Every ground is one KIND of material, and the kinds lie in one order,
   bottom to top: what is liquid, then the worn roads, bare rock, metal
   plates, earth, sand and ash, moss, grass, ice, and snow on everything.
   Where two grounds meet, the one higher in the order is the UPPER: it
   reaches over the lower by a little, and its edge is ragged over a band
   whose width is the pair's (EDGE_SPREAD) -- a road's edge is narrow, sand
   drifting onto rock wide.  Two grounds of the same kind (one grass giving
   way to another) interlock evenly, with no upper (v2.3.2950: most of them
   now MIX over a wide zone instead, below).  The boardwalks and the water
   keep their crisp edges.

   The ragged edge is drawn from the two pictures themselves, not from
   noise: within the band each pixel goes to whichever ground stands higher
   there -- its HEIGHT, the pixel's brightness ranked within its own picture
   (a grass blade's lit tip, a pebble, a snow lump stand high; the shadow
   between blades lies low).  So grass reaches over dirt in its own tufts,
   the dirt shows through the gaps between them, and every colour is still
   a pixel of one of the two pictures: nothing is blended, and the palette
   holds.  */
export const KINDS = ['liquid', 'road', 'rock', 'metal', 'earth', 'sand', 'ash', 'moss', 'grass', 'ice', 'snow', 'built'];
const LAYER = { liquid: 0, road: 1, rock: 2, metal: 3, earth: 4, sand: 5, ash: 5, moss: 6, grass: 7, ice: 8, snow: 9, built: 10 };
/* The kind of every swatch, from its brief (plan.js).  A swatch not listed
   is taken as earth. */
const KIND_OF = {
  commons: 'grass', 'town-yard': 'earth', street: 'earth', boardwalk: 'built', plaza: 'earth', road: 'road', gravel: 'road', lava: 'liquid',
  'frost-1': 'snow', 'frost-2': 'snow', 'frost-3': 'ice', 'frost-4': 'snow',
  'ember-1': 'grass', 'ember-2': 'ash', 'ember-3': 'rock', 'ember-4': 'rock',
  'sky-1': 'earth', 'sky-2': 'sand', 'sky-3': 'rock', 'sky-4': 'rock',
  'hollows-1': 'earth', 'hollows-2': 'rock', 'hollows-3': 'rock', 'hollows-4': 'rock',
  'thunder-1': 'earth', 'thunder-2': 'metal', 'thunder-3': 'metal', 'thunder-4': 'metal',
  'tidal-1': 'sand', 'tidal-2': 'sand', 'tidal-3': 'rock', 'tidal-4': 'sand',
  'mist-1': 'grass', 'mist-2': 'moss', 'mist-3': 'earth', 'mist-4': 'moss',
  'verdant-1': 'grass', 'verdant-2': 'moss', 'verdant-3': 'moss', 'verdant-4': 'moss',
  'border-ember-frost': 'earth', 'border-ember-sky': 'ash', 'border-hollows-sky': 'sand', 'border-hollows-thunder': 'earth',
  'border-thunder-tidal': 'sand', 'border-mist-tidal': 'earth', 'border-mist-verdant': 'grass', 'border-frost-verdant': 'grass',
  sea: 'liquid', shallows: 'liquid', fresh: 'liquid',   /* v2.3.2980: never a cell's ground; only how water looks */
};
export function kindOf(id) { return KIND_OF[id] || 'earth'; }
/* How an upper ground lies over a lower one, in game px: [reach, ragged].
   REACH is how far its edge comes over the lower ground (then varies along
   the edge, by half again either way); RAGGED is the half-width of the band
   either side of that line where the two pictures interlock. */
const EDGE_SPREAD = {
  road: [1, 6], rock: [2, 7], metal: [0, 2], earth: [3, 9], sand: [5, 14], ash: [5, 14],
  moss: [4, 10], grass: [5, 12], ice: [2, 6], snow: [5, 13],
};
/* Two grounds of one kind: no reach, just the band. */
const EDGE_SAME = { road: 8, rock: 10, metal: 2, earth: 12, sand: 15, ash: 15, moss: 14, grass: 15, ice: 6, snow: 15, liquid: 0 };
/* ═══ v2.3.2950: SIMILAR GROUNDS MIX ═══
   Two grounds that are much alike -- of one kind (the square's stony dirt
   and the yards' dirt; one meadow and the next), or both of the loose, dry
   family (earth, sand, ash) -- do not meet along an edge at all, however
   ragged: the change between them is spread over a wide zone, MIX game px
   either side of the line (then wandering by a third either way), where
   the two lie in patches from about 30 to 75 game px across, down to the
   pictures' own stones and tufts at the rim of each patch.  Tried on the
   owner's own square and yard pictures against a plain soft edge (still
   read as a line) and against the same zone with a third, blended picture
   in its middle (the owner's idea: close to this, without the picture).
   The road is not in the family: a road stays a road.  Rock and ice keep
   their narrow even band -- their boulders and plates would be cut. */
const MIX = { earth: 36, sand: 36, ash: 36, grass: 36, moss: 30, snow: 36 };
/* ...where the big patches do most of the deciding: the pictures' own
   stones and tufts count this much (0.7 at an edge), shaping only the
   patches' rims -- which also lets most of the zone be settled an art px
   at a time, not pixel by pixel */
const MIX_HEIGHTS = 0.7;
/* ...and how strong the big patches are against the zone's own ramp (-1 at
   one side, +1 at the other): strong enough that islands of each ground
   reach most of the way across, so the change is spread over the whole
   zone -- at 0.8 it bunched up near the middle and still read as a line */
const MIX_PATCH = 1.2;
const MIX_FAMILY = { earth: 1, sand: 1, ash: 1 };
/* v2.3.2954: how far a MIX zone reaches, in its own widths (1 until now).
   Its big patches and the pictures' heights together can carry the change
   past 1, and there the zone's end stopped it dead: a patch of the square
   reaching into the yards was cut off by a straight line running beside the
   plan's cell edge, 20-35 game px long ("a noticeable straight line", the
   owner, zoomed in).  The zone now reaches this much further, so the change
   ends where its own patches end it; everything inside the old zone is laid
   as before.  Measured over the town (stand-in pictures), the pixels the
   zone's end still cuts off, against a zone reaching 1.4: 4,700 at 1,
   1,700 at 1.15, 1,150 at 1.2 -- 1.15 for about a fifteenth longer to lay
   a town piece, the wider margins it needs being most of that. */
const MIX_LIM = 1.15;
/* ═══ v2.3.2951: BLEND PICTURES ═══
   Owner, 2026-09-30, shown the town square's mixing zone on their own
   pictures, alone and with their own blended third picture in its middle:
   "Bottom right looks the best by a moderate margin", and, told the cost:
   "Yes build it".  Two alike grounds (MIX) may be given a third picture,
   made in ChatGPT from the two (the Ground Studio's blend prompt):
   `opts.blends[blendKey(a, b)]`.  The zone then runs from one ground,
   through the blend, to the other -- the blend most at the line, thinning
   out to nothing at the zone's two sides -- in the same big patches, their
   rims shaped by all three pictures; every pixel is still one of the
   three.  Optional per pair: a pair without one mixes as before, to the
   byte.  A blend unpacked is 1 MB, only while you are near its pair; a
   piece of ground its zone reaches takes about a fifth longer to lay
   (v2.3.2952, below).  The cost that counts is the pictures: 42 pairs of
   alike grounds touch on the Wheel. */
/* v2.3.2952: the owner, on the first preview: "Why does the top part of
   that patch look correctly blended but not the bottom? I can see its edge
   … Bottom looks like it has a noticeable straight edge where it
   transitions."  The blend's two changes (upper -> blend, blend -> lower)
   each had HALF the zone, on a ramp twice as steep as a plain mix's: the
   patches and the pictures' heights moved each change half as far, and
   where they would have moved it further the zone's end stopped it -- so
   along a stretch where the big patches were flat, the yards turned into
   the blend along a line running beside the plan's straight cell edge.
   (And the two changes swapped over at the line itself, a jump wherever
   the patches were strong.)  Now each change is a whole plain mix -- the
   same ramp, patches and room as any MIX edge -- set BLEND_OFF of a zone
   either side of the line, with the blend between them: the zone of a pair
   with a blend is that much wider (1 + BLEND_OFF), and the two changes
   wander about as far as a plain mix's.  Measured at the owner's spot, on
   stand-ins (tools/world/test-world-core.mjs): where the yards end wanders
   11 game px against a plain mix's 12.6 (it was 6.8), and its straightest
   stretch is 17 game px against a plain mix's 33 (it was 30).
   The pictures' heights count a little less than at a plain mix's edge
   (BLEND_HEIGHTS, not MIX_HEIGHTS' 0.7): at 0.7 hardly a pixel of the
   wider zone could be settled an art px at a time and a town piece took
   half as long again to lay; at 0.45 it takes about a fifth longer than
   before, and the changes are as ragged. */
const BLEND_OFF = 0.4;
const BLEND_HEIGHTS = 0.45;
/* v2.3.2953: the owner, on the fixed preview: "Looks better but could use
   further improvement".  Measured along every straight stretch of the town
   where the square meets the yards (100 game px windows, the regions
   blurred as the eye sees them), the blend's two changes still wandered
   less than a plain mix's edge at their straightest -- the straightest
   tenth of the windows swayed 17 and 19 game px against 25 -- since each
   change had only a plain mix's room either side of it.  Now a blend pair's
   big patches are BLEND_BIG as strong, and its zone as much wider (its
   end at BLEND_BIG + BLEND_OFF, so the end cuts off no more than before):
   27 and 23 game px at their straightest, the middle window 43 and 47
   against 36 and 37, for a town piece about a twelfth longer to lay.
   (1.5 made bigger bays still, but at twice that cost, for a look the
   owner's own pictures barely showed.)  Laid on stand-ins, the plain
   blend-less mix and every other edge are unchanged, to the byte. */
const BLEND_BIG = 1.3;
/* v2.3.2954: the owner, zoomed into the town square's pictures: "In each
   of your pictures there's a noticeable straight line. I want to avoid
   that."  Where three grounds meet -- a street's corner, the square, the
   yards -- a pixel answered to its NEAREST other ground only, and which one
   was nearest changes along the straight line halfway between them (45
   degrees off a corner): a patch of the square reaching into the yards was
   cut off along it, a ruler line, and the owner's "V" at the street's
   corners was two of them.  Now every other ground in reach has its say
   (edgeAt): a pixel goes to whichever of them its own edge rule gives it
   to, so each patch keeps the shape its own edge draws.  Only where two
   would both take it does it go to the one further past its own line,
   each nudged by its own slow noise (this much, in zone widths) so the
   line between those two wanders too.  (First tried: picking the nearest
   by a noisy distance.  It bent the lines but cut patches into thin
   slivers where it ran beside their own edge.)  Where one other ground is
   in reach -- most edges -- nothing changes, to the byte. */
const PARTNER_TIE = 0.3;
/* the most a blend's zone reaches, in game px, for the margins below */
const EDGE_MAX_BLEND_GAME = 2 + 1.35 * (BLEND_BIG * MIX_LIM + BLEND_OFF) * Math.max(...Object.values(MIX));
export const BLEND_SEP = '__';
/* one key for a pair of swatches, whichever way round they are named */
export function blendKey(a, b) { return a < b ? `${a}${BLEND_SEP}${b}` : `${b}${BLEND_SEP}${a}`; }
/* ...and back: [a, b], or null for a key that is not a pair */
export function blendPair(key) {
  const s = String(key), k = s.indexOf(BLEND_SEP);
  return k > 0 && k + BLEND_SEP.length < s.length ? [s.slice(0, k), s.slice(k + BLEND_SEP.length)] : null;
}
/* The blend pictures a rectangle's ground can use: every pair among the
   swatches its ground can use (swatchesUnder's set, or any list) that has
   one (`has(key)`).
   A caller that unpacks exactly these gives the composer every blend it
   will ask for -- and every chunk over a place the same ones, so chunks
   laid apart still meet with no seam. */
export function blendsUnder(ids, has) {
  const list = [...ids], out = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const k = blendKey(list[i], list[j]);
    if (has(k)) out.push(k);
  }
  return out;
}
/* the smallest bit of ground an edge may leave, in picture px (a tuft) */
const EDGE_BIT = 20;
/* how far beyond an upper ground's ragged edge its edge pieces lie, game px */
const EDGE_PIECE_REACH = 14;
/* the biggest edge piece laid, in picture px across (a person's head is ~40) */
const EDGE_PIECE_MAX = 96;
/* the palette index an indexed edge-pieces picture uses for see-through */
export const EDGE_CLEAR = 255;
/* ═══ v2.3.2948: EDGE PIECES, PUT AWAY ═══
   Owner, 2026-09-30, shown three edges before, with the new edges alone, and
   with stand-in pieces added: "I don't see any difference I'll put away the
   edge piece stuff.  You can hide it or whatever in case we want to bring
   back later."  The edges themselves did the work; the loose pieces past
   them went unseen.  So no tool shows or loads a ground's pieces unless this
   is true -- not the Ground Studio's slot under each swatch, not the game's
   worker -- or the address says `edgepieces` (the studio's `?edgepieces`,
   the game's `?trial=wheel&edgepieces`), which is also how the tests keep
   every part of them working.  Nothing is deleted: composeFine still lays
   pieces whenever a caller passes a tile's E, and pictures already made stay
   saved, in the zip and restorable.  Bringing them back is this one line. */
export const EDGE_PIECES = false;
export function edgePiecesOn(search) {
  if (EDGE_PIECES) return true;
  try { return new URLSearchParams(search || '').has('edgepieces'); } catch (e) { return false; }
}
/* ═══ v2.3.2955: BLENDS, PUT AWAY ═══
   Owner, 2026-09-30, once the plain mixes had lost their straight lines
   (v2.3.2954): "If I can get good results faster with just the 2 pictures
   instead of a 'blend' custom picture I'd rather do that", and, offered the
   Blends card hidden: "Yeah hide it".  So, as the edge pieces: no tool shows
   or uses a pair's blend unless this is true -- not the Ground Studio's
   Blends card, its preview or its counts, not the game's worker -- or the
   address says `blends` (the studio's `?blends`, the game's
   `?trial=wheel&blends`).  Nothing is deleted: composeGround still lays any
   blend a caller passes (opts.blends), and pictures already made stay
   saved, in the zip and restorable.  Bringing them back is this one line. */
export const BLENDS = false;
export function blendsOn(search) {
  if (BLENDS) return true;
  try { return new URLSearchParams(search || '').has('blends'); } catch (e) { return false; }
}
/* the most any edge reaches, in game px, for the margins below */
const EDGE_MAX_GAME = 2 + Math.max(
  ...Object.values(EDGE_SPREAD).map(([r, w]) => 1.5 * r + 1.35 * w),
  ...Object.values(EDGE_SAME).map((w) => 1.35 * w),
  ...Object.values(MIX).map((w) => 1.35 * w * MIX_LIM));

/* The edge where swatches `a` and `b` (catalog entries) meet: null where it
   stays crisp (the water, the boardwalks); otherwise { up, lo } -- which is
   the upper (the same when neither is) -- and `reach`, `ragged` in game px;
   `mix` where the two are alike and change over a wide zone (MIX). */
export function edgeRecipe(a, b) {
  if (!a || !b || a.id === b.id) return null;
  /* the boardwalks keep their straight, surveyed edges (v2.3.2945) */
  if (CRISP.includes(a.id) || CRISP.includes(b.id)) return null;
  const ka = kindOf(a.id), kb = kindOf(b.id);
  if (ka === 'built' || kb === 'built') return null;
  if (MIX[ka] && MIX[kb] && (ka === kb || (MIX_FAMILY[ka] && MIX_FAMILY[kb]))) {
    return { up: a.id < b.id ? a.id : b.id, lo: a.id < b.id ? b.id : a.id, even: true, reach: 0, ragged: Math.min(MIX[ka], MIX[kb]), mix: true };
  }
  if (ka === kb) {
    const w = EDGE_SAME[ka] || 0;
    return w ? { up: a.id < b.id ? a.id : b.id, lo: a.id < b.id ? b.id : a.id, even: true, reach: 0, ragged: w } : null;
  }
  const [U, L, ku] = LAYER[ka] > LAYER[kb] ? [a, b, ka] : [b, a, kb];
  const sp = EDGE_SPREAD[ku];
  if (!sp) return null;
  return { up: U.id, lo: L.id, even: false, reach: sp[0], ragged: sp[1] };
}
/* the water the preview draws: deep, mid, shallow and foam -- the game's own
   reserved effect colours (public/tools/style/scene.js, EFFECT_PALETTE) */
const WATER_RGB = { deep: [28, 70, 126], mid: [53, 113, 161], shallow: [78, 156, 196], foam: [226, 238, 240] };

const shade = (rgb, k) => rgb.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
const mix = (a, b) => a.map((v, i) => Math.round((v + b[i]) / 2));

/* ── the catalog ── */

/* Every swatch the world needs.  `group` is how the Ground Studio lists
   them; `color` is the plan's own colour for it, drawn wherever a swatch
   has not been made yet.
   v2.3.2944: no brief asks for a detail with a direction (style/bible.js,
   NO_DIRECTION -- the owner's rule, after wagon ruts tiled sideways down a
   north-south street).  `revised` names the version a brief last changed
   in, so the Ground Studio can tell the owner which swatches to redo. */
export function groundCatalog(plan) {
  const R = plan.regions, K = plan.classes;
  const out = [];
  /* v2.3.2947: `kind`, the material it is (KIND_OF), for where it meets others */
  const add = (e) => out.push({ levels: null, revised: null, ...e, kind: kindOf(e.id) });
  add({ id: 'commons', group: 'hub', name: R.commons.name, brief: R.commons.stages[0].ground,
    where: 'the safe common land round the town', color: hexToRgb(R.commons.ground) });
  add({ id: 'town-yard', group: 'hub', name: 'Brotown yards', brief: 'packed earth with patchy short grass and a few pebbles',
    where: "the town's yards, and the ground under every building plot and camp", color: hexToRgb(R.town.ground) });
  add({ id: 'street', group: 'hub', name: 'Main Street', brief: 'hard-packed dirt street, trodden smooth and a little darker in soft patches, with a few scattered pebbles and wisps of straw lying every which way',
    where: "Brotown's streets", color: hexToRgb(K.street.color), revised: 'v2.3.2944' });
  /* v2.3.2949: boards that run one way -- the one swatch that may, because
     the game lays it (`laid`, PLANK DECKS above).  The owner found the
     v2.3.2944 basket weave looked wrong ("the checker pattern wood") and
     made planks; a picture made while the prompt still asked for the weave
     is theirs, so it is not marked to make again (`accepts`). */
  add({ id: 'boardwalk', group: 'hub', name: 'Boardwalk', brief: 'weathered wooden decking: straight boards of about equal width laid side by side, with thin dark gaps between them, a few knots and nail heads, and here and there two boards butted end to end',
    /* v2.3.2960: the bridges only, the town's boardwalks put away
       until its buildings (plan.js `boardwalks`) */
    where: 'the bridges', color: hexToRgb(K.boardwalk.color), revised: 'v2.3.2949', laid: 'planks',
    accepts: ['weathered wooden decking of short boards in a basket weave: small square blocks of three or four boards, each block turned a quarter turn from its neighbours'] });
  add({ id: 'plaza', group: 'hub', name: 'Town square', brief: 'packed pale gravel with a few flat flagstones',
    where: 'the town square round the Town Hall', color: hexToRgb(K.plaza.color) });
  add({ id: 'road', group: 'routes', name: 'Road', brief: 'the surface of a worn dirt road: packed earth worn evenly all over, with scattered pebbles and a few tiny tufts of grass',
    where: 'every road and footpath', color: hexToRgb(K.path.color), revised: 'v2.3.2944' });
  add({ id: 'gravel', group: 'routes', name: 'Railway bed', brief: 'coarse grey ballast gravel',
    where: 'under the mine railway (its rails and sleepers are objects)', color: [138, 138, 134] });
  for (const id of Object.keys(R)) {
    const rd = R[id];
    if (!rd.dir) continue;
    const base = hexToRgb(rd.ground);
    rd.stages.forEach((st, k) => add({ id: `${id}-${k + 1}`, group: id, name: `${rd.name}: ${st.name}`, brief: st.ground,
      levels: [k * 20 + 1, (k + 1) * 20], where: `levels ${k * 20 + 1}–${(k + 1) * 20} of ${rd.name}`, color: shade(base, 1.06 - 0.07 * k),
      revised: st.groundRevised || null }));
  }
  add({ id: 'lava', group: 'routes', name: 'Lava', brief: 'molten lava in bright orange and yellow under a cracked black crust (its own bright colours, with no glow spilling onto anything)',
    where: 'the lava pools and channels of the Flame Fields', color: hexToRgb(K.lava.color) });
  /* v2.3.2980: the water's pictures (WATER_SWATCHES above): `water` marks a
     look of the one water material, never a ground of its own */
  add({ id: 'sea', group: 'water', water: true, name: 'Open sea', brief: 'deep, calm open sea in rich blues: soft, broad patches of darker and lighter blue, with small, short glints of light scattered all over',
    where: 'the sea between the spokes, away from the shore', color: WATER_RGB.deep });
  add({ id: 'shallows', group: 'water', water: true, name: 'Shallows', brief: 'clear, shallow sea water over pale sand: light turquoise water through which the sandy bottom and a few small pebbles show, with small, soft glints of light scattered all over',
    where: 'the sea along every shore, before it deepens (the foam line at the very edge is the game\'s own)', color: WATER_RGB.shallow });
  add({ id: 'fresh', group: 'water', water: true, name: 'Fresh water', brief: 'clear, calm fresh water in blue-green, with a hint of the dark bed showing through, a few small rings and glints of light scattered all over',
    where: 'the rivers, ponds, lakes and oasis pools', color: WATER_RGB.mid });
  for (const key of Object.keys(plan.borders || {})) {
    const br = plan.borders[key];
    const [a, b] = key.split('|');
    add({ id: `border-${a}-${b}`, group: 'borders', name: `${R[a].name} and ${R[b].name}`, brief: br.ground || br.land,
      where: `where they meet, at their bases and on ${br.passes ? br.passes.join(' and ') : 'their passes'}`,
      color: mix(hexToRgb(R[a].ground), hexToRgb(R[b].ground)), revised: br.groundRevised || null });
  }
  return out;
}

/* ── which swatch covers each cell ── */

export function materialMap(plan, bp) {
  const g = gridInfo(plan);
  const cat = groundCatalog(plan);
  const ids = [...cat.map((e) => e.id), WATER];
  const index = Object.create(null);
  ids.forEach((id, i) => { index[id] = i; });
  const W = bp.wheel, S = bp.scale, P = g.P;
  const spokes = W.spokes;
  const water = index[WATER];
  const isWater = new Uint8Array(bp.classIds.length);
  for (const k of ['ocean', 'river', 'water']) isWater[C[k]] = 1;
  const n = bp.w * bp.h;
  const mat = new Uint8Array(n);
  const reg = bp.regionIds;
  const stageId = Object.create(null), borderId = Object.create(null);
  for (const id of reg) if (plan.regions[id].dir) stageId[id] = [1, 2, 3, 4].map((k) => index[`${id}-${k}`]);
  for (const key of Object.keys(plan.borders || {})) borderId[key] = index[`border-${key.replace('|', '-')}`];
  const seed = (plan.seed | 0) + 700;
  /* the border land between any two spokes, by their order */
  const NS = spokes.length, borderOf = new Int16Array(NS * NS).fill(-1);
  for (let k = 0; k < NS; k++) for (let l = 0; l < NS; l++) {
    const b = borderId[[spokes[k].id, spokes[l].id].sort().join('|')];
    if (b != null) borderOf[k * NS + l] = b;
  }
  /* v2.3.2947: a spoke's stages give way to each other -- and the commons
     to each first stage -- over a wide band, in patches, not along a line
     (the owner: "that border area will need to vary in size depending on
     what two swatches are coming together").  Each land cell's stage (the
     commons -1, then 0..3), averaged over a wide neighbourhood, is the
     smooth coordinate the patches are cut from (landStage below). */
  const stageAt = landStage(bp, isWater, reg);
  for (let by = 0; by < bp.h; by++) {
    const y = (bp.y0 + (by + 0.5) * S - g.cy) / P;
    for (let bx = 0; bx < bp.w; bx++) {
      const i = by * bp.w + bx, c = bp.cls[i], rid = reg[bp.reg[i]];
      let m;
      if (isWater[c]) m = water;
      else if (c === C.lava) m = index.lava;
      else if (rid === 'town') m = c === C.street ? index.street : c === C.boardwalk ? index.boardwalk : c === C.plaza ? index.plaza : index['town-yard'];
      else if (c === C.path) m = index.road;
      else if (c === C.bridge) m = index.boardwalk;
      else if (c === C.rail) m = index.gravel;
      else if (c === C.lot) m = index['town-yard'];
      else {
        const x = (bp.x0 + (bx + 0.5) * S - g.cx) / P;
        let d1 = Infinity, d2 = Infinity, k1 = 0, k2 = 0;
        for (let k = 0; k < spokes.length; k++) {
          const d = axisDist(W, spokes[k], x, y);
          if (d < d1) { d2 = d1; k2 = k1; d1 = d; k1 = k; } else if (d < d2) { d2 = d; k2 = k; }
        }
        /* the stage, patched: the averaged stage plus noise that is strong
           halfway between two stages and nothing where only one is near */
        const v = stageAt(bx, by);
        let st = Math.floor(v);
        const f = v - st;
        if (f > 0.001) {
          const nz = fbm(bx / 10, by / 10, seed, 2);
          if (f + 2.2 * (1 - Math.abs(2 * f - 1)) * nz > 0.5) st++;
        }
        const own = stageId[rid] ? rid : spokes[k1] && stageId[spokes[k1].id] ? spokes[k1].id : null;
        if (st < 0 || !own) m = index.commons;
        else {
          m = stageId[own][Math.min(3, st)];
          /* border land: on a pass (outside every spoke), or near the line
             halfway between two spokes at their bases -- that line's band
             wobbles, so the border land comes and goes in patches too */
          const dd = d2 - d1;
          if (d1 > W.half || dd < BORDER_BAND - 0.2 || (dd < BORDER_BAND + 0.2 && dd < BORDER_BAND + 0.2 * fbm(bx / 5 + 31.7, by / 5 - 17.3, seed + 5, 3))) {
            const b = borderOf[k1 * NS + k2];
            if (b >= 0) m = b;
          }
        }
      }
      mat[i] = m;
    }
  }
  /* v2.3.2945: which swatches are built (laid on their cells, straight-edged) */
  const built = new Uint8Array(ids.length);
  for (const id of BUILT) if (index[id] != null) built[index[id]] = 1;
  /* v2.3.2949: the plank decks (layout.js), and which deck each of their
     cells is -- a few hundred cells, so a Map, not a layer over the Wheel */
  const decks = (bp.decks || []).map((d) => ({ ...d }));
  const deckAt = new Map();
  decks.forEach((d, k) => {
    for (let y = d.y0; y < d.y1; y++) for (let x = d.x0; x < d.x1; x++) {
      const i = y * bp.w + x;
      if (x >= 0 && y >= 0 && x < bp.w && y < bp.h && !deckAt.has(i) && cat[mat[i]] && cat[mat[i]].laid === 'planks') deckAt.set(i, k);
    }
  });
  /* v2.3.2984: which water cells are FRESH -- a river, a pond or a lake --
     one bit a cell: all a water pixel's look needs of the plan's classes
     (waterLook, shoreSampler).  The game's ground worker keeps no classes
     (a slim blueprint: 3 MB it does without), and reading them there broke
     every piece with water in it the day the first water picture came. */
  const fresh = new Uint8Array((bp.w * bp.h + 7) >> 3);
  for (let i = 0; i < bp.w * bp.h; i++) {
    const c = bp.cls[i];
    if (c === C.river || c === C.water) fresh[i >> 3] |= 1 << (i & 7);
  }
  return { mat, ids, index, water, catalog: cat, built, decks, deckAt, fresh };
}

/* ═══ v2.3.2980: HOW A WATER PIXEL LOOKS ═══
   FRESH where its cell is a river, a pond, a lake or an oasis (the plan's
   own classes); else the sea's SHALLOWS within about SHALLOW_CELLS of the
   shore -- `shore`, the distance out in cells, from shoreSampler (v2.3.2984;
   before, where the water's blurred share was under 0.8, a thin line) --
   and the open SEA past them.  Both lines wander with noise: a ruler line
   where a river meets the sea, or round every shore, is the thing every
   other edge here avoids.
   Called only when a water picture has been made (composeGround). */
function waterLook(bp, mm, ax, ay, shore, seed) {
  const S = bp.scale;
  /* (valueNoise is -1..1) */
  const jx = valueNoise(ax * 0.021, ay * 0.021, seed + 41) * S * 0.8;
  const jy = valueNoise(ax * 0.021 + 17.3, ay * 0.021 - 9.1, seed + 43) * S * 0.8;
  /* which water this is: the nudged cell's, or -- where the nudge lands on
     the bank, or the drawn shore lies a little past its cells -- the
     pixel's own cell's, or the nearest water beside it (13% of a river's
     pixels took the sea's shallows before this looked past the bank) */
  /* (from the materials and the fresh bits alone, v2.3.2984: the game's
     worker has no classes; a water cell is the sea's unless it is fresh) */
  const kindAt = (x, y) => {
    if (x < 0 || y < 0 || x >= bp.w || y >= bp.h) return -1;
    const i = y * bp.w + x;
    return mm.mat[i] !== mm.water ? -1 : (mm.fresh[i >> 3] >> (i & 7)) & 1 ? 1 : 0;
  };
  const ox = Math.floor((ax - bp.x0) / S), oy = Math.floor((ay - bp.y0) / S);
  let k = kindAt(Math.floor((ax + jx - bp.x0) / S), Math.floor((ay + jy - bp.y0) / S));
  if (k < 0) k = kindAt(ox, oy);
  for (let r = 1; r <= 2 && k < 0; r++) {
    for (let dy = -r; dy <= r && k < 0; dy++) for (let dx = -r; dx <= r && k < 0; dx++) k = kindAt(ox + dx, oy + dy);
  }
  if (k === 1) return 'fresh';
  /* the shallows' outer line: a broad sweep (~140 art px) and a finer fray,
     so it reads as a sandbank's edge, not a line drawn round the coast */
  const n = valueNoise(ax * 0.0045, ay * 0.0045, seed + 47) * 0.7 + valueNoise(ax * 0.03, ay * 0.03, seed + 53) * 0.3;
  return shore + SHALLOW_WANDER * n < SHALLOW_CELLS ? 'shallows' : 'sea';
}
/* the water's pictures by look, a look not made yet taking its stand-in
   (WATER_STANDIN); or null when none is made (the plan's blues then,
   exactly as before any was) */
function waterTiles(tiles) {
  if (!tiles) return null;
  const out = Object.create(null);
  let any = false;
  for (const id of WATER_SWATCHES) {
    const pick = WATER_STANDIN[id].find((q) => tiles[q] && tiles[q].A);
    if (pick) { out[id] = tiles[pick]; any = true; }
  }
  return any ? out : null;
}
/* ═══ v2.3.2984: HOW FAR OUT FROM THE SHORE ═══
   Each cell of open sea's distance to the nearest cell that is not -- land,
   or a river, pond or lake, so a river's mouth and a pond that meets the sea
   open into the sea's shallows, not straight onto its deep blue -- in cells
   (a cell's middle to a cell's middle, diagonals counted as 1.41),
   worked out for the cells round the rectangle (art px) and sampled between
   cell middles, so the shallows' line is smooth and not the cells' steps.
   Only distances up to SHORE_CAP are needed, and every land cell that close
   to a pixel lies within SHORE_CAP + 2 cells of the rectangle, as does the
   shortest way to it -- so a pixel's distance is the same whichever
   rectangle it is worked out in, and chunks laid apart still meet. */
function shoreSampler(bp, mm, X0, Y0, RW, RH) {
  const S = bp.scale, water = mm.water, mat = mm.mat, fresh = mm.fresh;
  const M = SHORE_CAP + 2;
  const gx0 = Math.floor((X0 - bp.x0) / S) - M, gy0 = Math.floor((Y0 - bp.y0) / S) - M;
  const gw = Math.ceil(RW / S) + 2 * M + 2, gh = Math.ceil(RH / S) + 2 * M + 2;
  const D = new Float32Array(gw * gh);
  const FAR = 1e6, DG = Math.SQRT2;
  for (let y = 0; y < gh; y++) {
    const by = gy0 + y;
    for (let x = 0; x < gw; x++) {
      const bx = gx0 + x;
      /* (off the plan is open sea) */
      const k = by * bp.w + bx;
      D[y * gw + x] = bx >= 0 && by >= 0 && bx < bp.w && by < bp.h && (mat[k] !== water || (fresh[k >> 3] >> (k & 7)) & 1) ? 0 : FAR;
    }
  }
  /* two sweeps, down then up (an exact chamfer distance) */
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const i = y * gw + x;
    let v = D[i];
    if (v === 0) continue;
    if (x > 0) v = Math.min(v, D[i - 1] + 1);
    if (y > 0) {
      v = Math.min(v, D[i - gw] + 1);
      if (x > 0) v = Math.min(v, D[i - gw - 1] + DG);
      if (x < gw - 1) v = Math.min(v, D[i - gw + 1] + DG);
    }
    D[i] = v;
  }
  for (let y = gh - 1; y >= 0; y--) for (let x = gw - 1; x >= 0; x--) {
    const i = y * gw + x;
    let v = D[i];
    if (v === 0) continue;
    if (x < gw - 1) v = Math.min(v, D[i + 1] + 1);
    if (y < gh - 1) {
      v = Math.min(v, D[i + gw] + 1);
      if (x < gw - 1) v = Math.min(v, D[i + gw + 1] + DG);
      if (x > 0) v = Math.min(v, D[i + gw - 1] + DG);
    }
    D[i] = v;
  }
  for (let i = 0; i < D.length; i++) if (D[i] > SHORE_CAP) D[i] = SHORE_CAP;
  return (ax, ay) => {
    const gxf = (ax + 0.5 - bp.x0) / S - 0.5 - gx0, gyf = (ay + 0.5 - bp.y0) / S - 0.5 - gy0;
    const i = Math.min(gw - 2, Math.max(0, Math.floor(gxf))), j = Math.min(gh - 2, Math.max(0, Math.floor(gyf)));
    const ux = Math.min(1, Math.max(0, gxf - i)), uy = Math.min(1, Math.max(0, gyf - j));
    const p = j * gw + i;
    return (D[p] * (1 - ux) + D[p + 1] * ux) * (1 - uy) + (D[p + gw] * (1 - ux) + D[p + gw + 1] * ux) * uy;
  };
}

/* v2.3.2947: every land cell's stage, averaged over about a dozen cells
   (~300 game px) each way -- the commons and the town count as -1, a
   spoke's stages 0 to 3, the water not at all -- as a sampler (bx, by) ->
   a number whose whole part is the nearest stage and whose fraction says
   how far toward the next one the cell sits.  Worked out on cells four at
   a time, so the whole Wheel costs a few MB for a moment, not 26. */
const STAGE_COARSE = 4, STAGE_BLUR = 3;
function landStage(bp, isWater, reg) {
  const F = STAGE_COARSE, cw = Math.ceil(bp.w / F), ch = Math.ceil(bp.h / F);
  const sv = new Float32Array(cw * ch), sw = new Float32Array(cw * ch);
  const spoke = reg.map((id) => id !== 'commons' && id !== 'town');
  for (let by = 0; by < bp.h; by++) for (let bx = 0; bx < bp.w; bx++) {
    const i = by * bp.w + bx;
    if (isWater[bp.cls[i]]) continue;
    const c = ((by / F) | 0) * cw + ((bx / F) | 0);
    sv[c] += spoke[bp.reg[i]] ? bp.band[i] : -1;
    sw[c] += 1;
  }
  for (let k = 0; k < 2; k++) { blur1(sv, cw, ch, STAGE_BLUR); blur1(sw, cw, ch, STAGE_BLUR); }
  const v = new Float32Array(cw * ch);
  for (let c = 0; c < cw * ch; c++) v[c] = sw[c] > 1e-6 ? sv[c] / sw[c] : 0;
  return (bx, by) => {
    const fx = Math.min(cw - 1.001, Math.max(0, (bx + 0.5) / F - 0.5)), fy = Math.min(ch - 1.001, Math.max(0, (by + 0.5) / F - 0.5));
    const i0 = Math.floor(fx), j0 = Math.floor(fy), ux = fx - i0, uy = fy - j0, q = j0 * cw + i0;
    const a = v[q] * (1 - ux) + v[q + 1] * ux, b = v[q + cw] * (1 - ux) + v[q + cw + 1] * ux;
    /* a cell whose own stage the average has not moved keeps it exactly */
    const val = a * (1 - uy) + b * uy;
    return Math.abs(val - Math.round(val)) < 0.02 ? Math.round(val) : val;
  };
}

/* ── laying the swatches ── */

/* In-place box blur of a 1-channel field. */
function blur1(f, w, h, r) {
  const tmp = new Float32Array(Math.max(w, h));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let d = -r; d <= r; d++) s += f[y * w + Math.min(w - 1, Math.max(0, x + d))];
      tmp[x] = s / (2 * r + 1);
    }
    f.set(tmp.subarray(0, w), y * w);
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let s = 0;
      for (let d = -r; d <= r; d++) s += f[Math.min(h - 1, Math.max(0, y + d)) * w + x];
      tmp[y] = s / (2 * r + 1);
    }
    for (let y = 0; y < h; y++) f[y * w + x] = tmp[y];
  }
}

/* v2.3.2945: the NATURAL swatches' shares of the ground round a rectangle
   (`cw` x `ch` cells from `cellAt`): each one's cells blurred twice.  Built
   surfaces take no part -- they are laid on their cells (builtLookup) -- so
   the natural ground runs on under them, and a one-cell boardwalk can no
   longer split a street from a yard three ways. */
function naturalFields(mm, cellAt, cw, ch) {
  const seen = new Uint8Array(mm.ids.length);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) seen[cellAt(x, y)] = 1;
  const present = [], memb = [];
  for (let q = 0; q < mm.ids.length; q++) {
    if (!seen[q] || (mm.built && mm.built[q])) continue;
    const f = new Float32Array(cw * ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) f[y * cw + x] = cellAt(x, y) === q ? 1 : 0;
    blur1(f, cw, ch, 1);
    blur1(f, cw, ch, 1);
    present.push(q); memb.push(f);
  }
  /* nothing natural in reach (deep inside the square): the commons, which
     is never drawn there because every pixel is built */
  if (!present.length) { present.push(mm.index.commons != null ? mm.index.commons : 0); memb.push(new Float32Array(cw * ch).fill(1)); }
  return { present, memb };
}

/* v2.3.2945: the built swatch under a point (art px, continuous), or -1. */
function builtLookup(bp, mm) {
  const built = mm.built;
  if (!built) return () => -1;
  const S = bp.scale;
  return (ax, ay) => {
    const bx = Math.floor((ax - bp.x0) / S), by = Math.floor((ay - bp.y0) / S);
    if (bx < 0 || by < 0 || bx >= bp.w || by >= bp.h) return -1;
    const q = mm.mat[by * bp.w + bx];
    return built[q] ? q : -1;
  };
}

/* The ground of `rect` (art px, frame coordinates).
   `tiles[id]` = { A: tile, B?: tile }: the swatch pictures, square, seamless
   and already on the palette; a swatch not made yet is drawn in its plan
   colour, chequered, so the gap shows.  A tile is {w, h, data} (RGBA) or,
   since v2.3.2943, {w, h, idx, pal}: one palette index a pixel and the
   palette as r,g,b triples -- a quarter of the memory, which is what lets
   the phone keep a dozen swatches unpacked (ground-worker.js).  Returns
   { w, h, data (RGBA), mat (the swatch index of every pixel), scale }.

   `opts.scale` (v2.3.2942): output pixels per art px, a whole number.  1 (the
   default) is one pixel per art px (1.5 game px).  The Ground Studio uses 3:
   since v2.3.2942 a swatch is kept at 2 px per game px (style/bible.js,
   PIXEL) so ChatGPT's picture is never blown up, and the ground is laid at
   that sharpness.  Tiles are then in output px, anchored to the frame the
   same way, so chunks still meet with no seam.  Where one swatch fills a
   pixel's whole neighbourhood the answer is the plain one; only where two
   meet is each output pixel worked out on its own, which keeps the finer
   ground about as quick to lay as the coarse one. */
export function composeGround(plan, bp, mm, rect, tiles, opts = {}) {
  const K = Math.max(1, Math.round(opts.scale || 1));
  if (K > 1) return composeFine(plan, bp, mm, rect, tiles, opts, K);
  const S = bp.scale, seed = (plan.seed | 0) + 900;
  const RW = Math.round(rect.w), RH = Math.round(rect.h), X0 = Math.round(rect.x), Y0 = Math.round(rect.y);
  /* the cells under the rectangle, and a margin for the blur */
  const M = 4;
  const cx0 = Math.floor((X0 - bp.x0) / S) - M, cy0 = Math.floor((Y0 - bp.y0) / S) - M;
  const cw = Math.ceil(RW / S) + 2 * M + 2, ch = Math.ceil(RH / S) + 2 * M + 2;
  const cellAt = (x, y) => {
    const bx = Math.min(bp.w - 1, Math.max(0, cx0 + x)), by = Math.min(bp.h - 1, Math.max(0, cy0 + y));
    return mm.mat[by * bp.w + bx];
  };
  const { present, memb } = naturalFields(mm, cellAt, cw, ch);
  const water = mm.water;
  const wIdx = present.indexOf(water);
  const builtAt = builtLookup(bp, mm);
  /* the swatch of every pixel, with one pixel more all round, so a shore on
     the rectangle's edge is found the same way whichever rectangle it is in */
  const EW = RW + 2, EH = RH + 2;
  const emat = new Uint8Array(EW * EH);
  const wdepth = new Float32Array(EW * EH);
  for (let ey = 0; ey < EH; ey++) {
    const ay = Y0 - 1 + ey;
    const gyf = (ay + 0.5 - bp.y0) / S - 0.5 - cy0;
    const gj = Math.min(ch - 2, Math.max(0, Math.floor(gyf))), uy = Math.min(1, Math.max(0, gyf - gj));
    for (let ex = 0; ex < EW; ex++) {
      const ax = X0 - 1 + ex;
      /* a built surface is its cells, exactly (v2.3.2945) */
      const bq = builtAt(ax + 0.5, ay + 0.5);
      if (bq >= 0) { emat[ey * EW + ex] = bq; wdepth[ey * EW + ex] = 0; continue; }
      const gxf = (ax + 0.5 - bp.x0) / S - 0.5 - cx0;
      const gi = Math.min(cw - 2, Math.max(0, Math.floor(gxf))), ux = Math.min(1, Math.max(0, gxf - gi));
      const p00 = gj * cw + gi, p10 = p00 + 1, p01 = p00 + cw, p11 = p01 + 1;
      const w00 = (1 - ux) * (1 - uy), w10 = ux * (1 - uy), w01 = (1 - ux) * uy, w11 = ux * uy;
      let best = present[0], bv = -Infinity, wv = 0;
      for (let q = 0; q < present.length; q++) {
        const f = memb[q];
        const v = f[p00] * w00 + f[p10] * w10 + f[p01] * w01 + f[p11] * w11;
        if (q === wIdx) wv = v;
        if (v <= 0) continue;
        const id = present[q];
        const n = valueNoise(ax * 0.09 + id * 7.31, ay * 0.09 - id * 3.17, seed) * 0.62 + valueNoise(ax * 0.31 + id * 1.9, ay * 0.31, seed + 7) * 0.38;
        const s = v + JIT * n;
        if (s > bv) { bv = s; best = id; }
      }
      emat[ey * EW + ex] = best;
      wdepth[ey * EW + ex] = wv;
    }
  }
  /* colour */
  const data = new Uint8ClampedArray(RW * RH * 4);
  const mat = new Uint8Array(RW * RH);
  const cat = mm.catalog;
  const wt = waterTiles(tiles);   /* v2.3.2980 */
  const shoreAt = wt ? shoreSampler(bp, mm, X0, Y0, RW, RH) : null;   /* v2.3.2984 */
  for (let py = 0; py < RH; py++) {
    const ay = Y0 + py;
    for (let px = 0; px < RW; px++) {
      const ax = X0 + px, i = py * RW + px, o = i * 4;
      const e0 = (py + 1) * EW + px + 1, m = emat[e0];
      mat[i] = m;
      let c;
      if (m === water) {
        const land = emat[e0 - 1] !== water || emat[e0 + 1] !== water || emat[e0 - EW] !== water || emat[e0 + EW] !== water;
        const d = wdepth[e0];
        const t = !land && wt ? wt[waterLook(bp, mm, ax, ay, shoreAt(ax, ay), seed)] : null;
        if (t && t.A) {
          const useB = t.B && fbm(ax / 1100, ay / 1100, seed + 17, 2) > 0;
          const tile = useB ? t.B : t.A, T = tile.w;
          putTexel(data, o, tile, (((ay % T) + T) % T) * T + (((ax % T) + T) % T));
          continue;
        }
        c = land ? WATER_RGB.foam : d < 0.72 ? WATER_RGB.shallow : d < 0.93 ? WATER_RGB.mid : WATER_RGB.deep;
      } else {
        const e = cat[m], t = tiles && tiles[e.id];
        if (t && t.A) {
          const useB = t.B && fbm(ax / 1100, ay / 1100, seed + 11, 2) + 0.18 * (hash2(ax >> 2, ay >> 2, seed + 13) - 0.5) > 0;
          const tile = useB ? t.B : t.A, T = tile.w;
          const u = ((ax % T) + T) % T, v = ((ay % T) + T) % T;
          putTexel(data, o, tile, v * T + u);
          continue;
        }
        /* not made yet: the plan's colour, chequered every 16 art px */
        c = ((ax >> 4) + (ay >> 4)) & 1 ? e.color : shade(e.color, 0.86);
      }
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    }
  }
  if (opts.withMaterials === false) return { w: RW, h: RH, data, scale: 1 };
  return { w: RW, h: RH, data, mat, scale: 1 };
}

/* One swatch pixel into the output: from an RGBA tile, or an indexed one. */
function putTexel(data, o, tile, k) {
  if (tile.idx) {
    const q = tile.idx[k] * 3, p = tile.pal;
    data[o] = p[q]; data[o + 1] = p[q + 1]; data[o + 2] = p[q + 2];
  } else {
    const q = k * 4, d = tile.data;
    data[o] = d[q]; data[o + 1] = d[q + 1]; data[o + 2] = d[q + 2];
  }
  data[o + 3] = 255;
}

/* ═══ v2.3.2949: a plank swatch, made ready to lay (PLANK DECKS above) ═══
   `planksOf(tile, BW)` -> { tile, boards: [{ y0, h }], n, turned, scale }:
   the picture turned (if need be) so its boards run left to right, made
   smaller so its middle board is BW px wide, and snapped back onto the
   picture's own colours; and where each of its boards lies (y0 .. y0 + h,
   seam to seam, round the wrap).  Worked out once a picture and kept with
   it (a WeakMap), so the game's worker and the studio pay it once. */
const BOARDS_PER_CELL = 2;
const PLANKS = new WeakMap();
export function planksOf(tile, BW) {
  let byW = PLANKS.get(tile);
  if (!byW) PLANKS.set(tile, (byW = new Map()));
  let p = byW.get(BW);
  if (!p) byW.set(BW, (p = makePlanks(tile, BW)));
  return p;
}
function makePlanks(tile, BW) {
  const T = tile.w, H = tile.h, N = T * H, idx = tile.idx, pal = tile.pal, d = tile.data;
  /* each pixel's colour, as whole numbers, so the sums below come out the
     same whichever way round the picture is */
  const R8 = new Uint8Array(N), G8 = new Uint8Array(N), B8 = new Uint8Array(N);
  for (let k = 0; k < N; k++) {
    if (idx) { const q = idx[k] * 3; R8[k] = pal[q]; G8[k] = pal[q + 1]; B8[k] = pal[q + 2]; }
    else { R8[k] = d[k * 4]; G8[k] = d[k * 4 + 1]; B8[k] = d[k * 4 + 2]; }
  }
  /* which way the boards run: a line along a board stays on one board, so
     lines that way differ board to board; lines across all look alike */
  const rows = new Float64Array(H), cols = new Float64Array(T);
  for (let y = 0, k = 0; y < H; y++) {
    let rs = 0;
    for (let x = 0; x < T; x++, k++) { const v = 30 * R8[k] + 59 * G8[k] + 11 * B8[k]; rs += v; cols[x] += v; }
    rows[y] = rs;
  }
  for (let y = 0; y < H; y++) rows[y] /= 100 * T;
  for (let x = 0; x < T; x++) cols[x] /= 100 * H;
  const spread = (a) => { let m = 0; for (const v of a) m += v; m /= a.length; let s = 0; for (const v of a) s += (v - m) * (v - m); return s / a.length; };
  const turned = spread(cols) > spread(rows);
  const prof = turned ? cols : rows, L = prof.length, along = turned ? H : T;
  const seams = findSeams(prof);
  const boards = seams.map((a, k) => ({ y0: a, h: (k + 1 < seams.length ? seams[k + 1] : seams[0] + L) - a }));
  const hs = boards.map((b) => b.h).sort((a, b) => a - b);
  const scale = Math.max(1, hs[hs.length >> 1] / BW);
  /* smaller: each new pixel the average of the old ones in its square */
  const w2 = Math.max(1, Math.round(along / scale)), h2 = Math.max(1, Math.round(L / scale));
  const fx = along / w2, fy = L / h2;
  const toX = new Int32Array(along), toY = new Int32Array(L);
  for (let u = 0; u < along; u++) toX[u] = Math.min(w2 - 1, Math.floor(u / fx));
  for (let v = 0; v < L; v++) toY[v] = Math.min(h2 - 1, Math.floor(v / fy)) * w2;
  const n2 = w2 * h2, ar = new Uint32Array(n2), ag = new Uint32Array(n2), ab = new Uint32Array(n2), cnt = new Uint32Array(n2);
  for (let y = 0, k = 0; y < H; y++) for (let x = 0; x < T; x++, k++) {
    const o = turned ? toY[x] + toX[y] : toY[y] + toX[x];
    ar[o] += R8[k]; ag[o] += G8[k]; ab[o] += B8[k]; cnt[o]++;
  }
  /* ...back onto the picture's own colours (on the palette already) */
  const own = [];
  if (idx) {
    const used = new Uint8Array(256);
    for (let k = 0; k < N; k++) used[idx[k]] = 1;
    for (let q = 0; q < 256; q++) if (used[q]) own.push([pal[q * 3], pal[q * 3 + 1], pal[q * 3 + 2], q]);
  } else {
    const seen = new Set();
    for (let k = 0; k < N && own.length <= 256; k++) {
      const key = (R8[k] << 16) | (G8[k] << 8) | B8[k];
      if (!seen.has(key)) { seen.add(key); own.push([R8[k], G8[k], B8[k], -1]); }
    }
  }
  own.sort((a, b) => a[3] - b[3] || ((a[0] << 16) | (a[1] << 8) | a[2]) - ((b[0] << 16) | (b[1] << 8) | b[2]));
  const snap = own.length <= 256;
  const memo = new Map();
  const nearest = (r, g, b) => {
    const key = (r << 16) | (g << 8) | b;
    let c = memo.get(key);
    if (c) return c;
    let bd = Infinity;
    for (const e of own) { const dd = (e[0] - r) * (e[0] - r) + (e[1] - g) * (e[1] - g) + (e[2] - b) * (e[2] - b); if (dd < bd) { bd = dd; c = e; } }
    memo.set(key, c);
    return c;
  };
  const out = idx ? { w: w2, h: h2, idx: new Uint8Array(n2), pal } : { w: w2, h: h2, data: new Uint8ClampedArray(n2 * 4) };
  for (let o = 0; o < n2; o++) {
    const c = cnt[o] || 1, h = c >> 1;
    const r = Math.floor((ar[o] + h) / c), g = Math.floor((ag[o] + h) / c), b = Math.floor((ab[o] + h) / c);
    const e = snap ? nearest(r, g, b) : [r, g, b, -1];
    if (idx) out.idx[o] = e[3];
    else { out.data[o * 4] = e[0]; out.data[o * 4 + 1] = e[1]; out.data[o * 4 + 2] = e[2]; out.data[o * 4 + 3] = 255; }
  }
  return { tile: out, boards: boards.map((b) => ({ y0: b.y0 / fy, h: b.h / fy })), n: boards.length, turned, scale };
}
/* The seams in a profile across the boards (each line's average
   brightness).  The boards' spacing first: where the profile, blurred past
   the wood's grain, best repeats (16 px or more: grain lines repeat too).
   Then the seams: the lines darkest within about a third of a board, the
   most clearly dark first (how far each dips below the board on either
   side), no two closer than half a board -- so a dark board's grain, or a
   light board's knot, is not a seam.  With no clear boards, even ones. */
function findSeams(prof) {
  const L = prof.length, p = new Float64Array(L), q = new Float64Array(L);
  for (let i = 0; i < L; i++) p[i] = (prof[(i - 1 + L) % L] + 2 * prof[i] + prof[(i + 1) % L]) / 4;
  for (let i = 0; i < L; i++) { let s = 0; for (let k = -4; k <= 4; k++) s += prof[(i + k + L) % L]; q[i] = s / 9; }
  let m = 0;
  for (const v of q) m += v;
  m /= L;
  let v0 = 0;
  for (const v of q) v0 += (v - m) * (v - m);
  v0 = v0 || 1;
  let per = 0, best = 0.1;
  for (let lag = 16; lag <= L / 3; lag++) {
    let s = 0;
    for (let i = 0; i < L; i++) s += (q[i] - m) * (q[(i + lag) % L] - m);
    if (s / v0 > best) { best = s / v0; per = lag; }
  }
  const even = (n) => {
    let i0 = 0;
    for (let i = 1; i < L; i++) if (p[i] < p[i0]) i0 = i;
    return Array.from({ length: n }, (_, k) => (i0 + Math.round((k * L) / n)) % L).sort((a, b) => a - b);
  };
  if (!per) return even(12);
  const R = Math.max(3, Math.round(per * 0.3)), cand = [];
  for (let i = 0; i < L; i++) {
    let lo = true, left = -Infinity, right = -Infinity;
    for (let k = 1; k <= R && lo; k++) {
      const a = p[(i - k + L) % L], b = p[(i + k) % L];
      if (a <= p[i] || b < p[i]) lo = false;
      if (a > left) left = a;
      if (b > right) right = b;
    }
    if (lo) cand.push({ i, prom: Math.min(left, right) - p[i] });
  }
  cand.sort((a, b) => b.prom - a.prom || a.i - b.i);
  const seams = [], most = Math.round((1.4 * L) / per), sep = 0.55 * per;
  const top = cand.length ? cand[0].prom : 0;
  for (const c of cand) {
    if (seams.length >= most || c.prom < 0.25 * top) break;
    if (seams.every((s) => { const d = Math.abs(s - c.i); return Math.min(d, L - d) >= sep; })) seams.push(c.i);
  }
  return seams.length >= 3 ? seams.sort((a, b) => a - b) : even(Math.max(3, Math.round(L / per)));
}

/* composeGround at K output pixels per art px (see there). */
function composeFine(plan, bp, mm, rect, tiles, opts, K) {
  const S = bp.scale, seed = (plan.seed | 0) + 900;
  const RW = Math.round(rect.w), RH = Math.round(rect.h), X0 = Math.round(rect.x), Y0 = Math.round(rect.y);
  const GPA = plan.worldPxPerArtPx || 1.5;
  /* v2.3.2947: the ground is worked out EA art px beyond the rectangle as
     well, so an edge just outside it is found the same way whichever
     rectangle it is in -- chunks laid apart still meet with no seam */
  const M = 4, E2 = 2;
  /* (wider still when there are edge pieces: the middle of any piece that
     can reach the worked-out area must lie in it) */
  const anyPieces = !!tiles && Object.values(tiles).some((t) => t && t.E);
  let EA = Math.max(Math.ceil(EDGE_MAX_GAME / GPA), anyPieces ? Math.ceil((EDGE_BIT + 1 + EDGE_PIECE_MAX / 2) / K) : 0) + 2;
  /* (v2.3.2952: and a blend's wider zone, when one is given -- every piece
     it can reach is, blendsUnder's margin being wider still) */
  const blends = opts.blends || null;
  const tileOfKey = (k) => { const t = blends ? (typeof blends.get === 'function' ? blends.get(k) : blends[k]) : null; return t && t.w ? t : null; };
  if (blends && (typeof blends.keys === 'function' ? [...blends.keys()] : Object.keys(blends)).some(tileOfKey)) EA = Math.max(EA, Math.ceil(EDGE_MAX_BLEND_GAME / GPA) + 2);
  /* ...but only where an edge can be: most rectangles lie inside one ground
     or along crisp edges only, and need no more than the old margin */
  if (!edgesNear(bp, mm, X0 - E2 - EA, Y0 - E2 - EA, RW + 2 * (E2 + EA), RH + 2 * (E2 + EA), M)) EA = 0;
  const PM = E2 + EA;
  const cx0 = Math.floor((X0 - PM - bp.x0) / S) - M, cy0 = Math.floor((Y0 - PM - bp.y0) / S) - M;
  const cw = Math.ceil((RW + 2 * PM) / S) + 2 * M + 2, ch = Math.ceil((RH + 2 * PM) / S) + 2 * M + 2;
  const cellAt = (x, y) => {
    const bx = Math.min(bp.w - 1, Math.max(0, cx0 + x)), by = Math.min(bp.h - 1, Math.max(0, cy0 + y));
    return mm.mat[by * bp.w + bx];
  };
  const { present, memb } = naturalFields(mm, cellAt, cw, ch);
  const water = mm.water, wIdx = present.indexOf(water);
  const builtAt = builtLookup(bp, mm);
  const cat = mm.catalog;
  /* the swatch at a point (art px, continuous), as composeGround decides it
     for a whole art px; `nx, ny` place its noise.  Leaves the water's share
     in `lastWater` for the sea's shading. */
  let lastWater = 0;
  const vs = new Float32Array(present.length);
  /* v2.3.2947: a cell whose field is one swatch's alone, all round, needs
     no working out -- most of any rectangle, and all of its wide margin */
  const solo = new Int16Array(cw * ch).fill(-1);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    let only = -1;
    for (let q = 0; q < present.length && only !== -2; q++) {
      const v = memb[q][y * cw + x];
      if (v >= 0.999) only = only === -1 ? present[q] : -2;
      else if (v > 0) only = -2;
    }
    if (only >= 0) solo[y * cw + x] = only;
  }
  const pickAt = (axc, ayc, nx, ny) => {
    /* a built surface is its cells, exactly (v2.3.2945) */
    const bq = builtAt(axc, ayc);
    if (bq >= 0) return bq;
    const gyf = (ayc - bp.y0) / S - 0.5 - cy0, gxf = (axc - bp.x0) / S - 0.5 - cx0;
    const gj = Math.min(ch - 2, Math.max(0, Math.floor(gyf))), uy = Math.min(1, Math.max(0, gyf - gj));
    const gi = Math.min(cw - 2, Math.max(0, Math.floor(gxf))), ux = Math.min(1, Math.max(0, gxf - gi));
    const p00 = gj * cw + gi, p10 = p00 + 1, p01 = p00 + cw, p11 = p01 + 1;
    const s0 = solo[p00];
    if (s0 >= 0 && s0 === solo[p10] && s0 === solo[p01] && s0 === solo[p11]) { if (s0 === water) lastWater = 1; return s0; }
    const w00 = (1 - ux) * (1 - uy), w10 = ux * (1 - uy), w01 = (1 - ux) * uy, w11 = ux * uy;
    let best = present[0], bv = -Infinity, alive = 0, only = best;
    for (let q = 0; q < present.length; q++) {
      const f = memb[q];
      const v = f[p00] * w00 + f[p10] * w10 + f[p01] * w01 + f[p11] * w11;
      vs[q] = v;
      if (q === wIdx) lastWater = v;
      if (v > 0) { alive++; only = present[q]; }
    }
    if (alive === 1) return only;
    for (let q = 0; q < present.length; q++) {
      const v = vs[q];
      if (v <= 0) continue;
      const id = present[q];
      const n = valueNoise(nx * 0.09 + id * 7.31, ny * 0.09 - id * 3.17, seed) * 0.62 + valueNoise(nx * 0.31 + id * 1.9, ny * 0.31, seed + 7) * 0.38;
      const sc = v + JIT * n;
      if (sc > bv) { bv = sc; best = id; }
    }
    return best;
  };
  /* 1. whole art px, PM more all round */
  const PW = RW + 2 * PM, PH = RH + 2 * PM, PX0 = X0 - PM, PY0 = Y0 - PM;
  const pmat = new Uint8Array(PW * PH), pdep = new Float32Array(PW * PH);
  for (let py = 0; py < PH; py++) {
    const ay = PY0 + py;
    for (let px = 0; px < PW; px++) {
      const ax = PX0 + px, p = py * PW + px;
      lastWater = 0;
      pmat[p] = pickAt(ax + 0.5, ay + 0.5, ax, ay);
      pdep[p] = lastWater;
    }
  }
  /* which art px have one swatch all round them (their eight neighbours too) */
  const puni = new Uint8Array(PW * PH);
  for (let py = 1; py < PH - 1; py++) for (let px = 1; px < PW - 1; px++) {
    const p = py * PW + px, m0 = pmat[p];
    puni[p] = pmat[p - PW - 1] === m0 && pmat[p - PW] === m0 && pmat[p - PW + 1] === m0 && pmat[p - 1] === m0 &&
      pmat[p + 1] === m0 && pmat[p + PW - 1] === m0 && pmat[p + PW] === m0 && pmat[p + PW + 1] === m0 ? 1 : 0;
  }
  /* 2. v2.3.2947: the edges.  Which swatches here meet with an edge
     (edgeRecipe), and for each one that is another's edge partner, how far
     every art px is from it (a chamfer distance, in thirds of an art px) */
  const hereSeen = new Uint8Array(256);
  for (let p = 0; p < pmat.length; p++) hereSeen[pmat[p]] = 1;
  const here = [];
  for (let q = 0; q < 256; q++) if (hereSeen[q]) here.push(q);
  /* (flat arrays, not maps: these are read for every pixel near an edge) */
  const recipes = new Map(), partners = new Map(), dts = new Map();
  /* (v2.3.2950: indexed a x NQ + b, NQ the swatches there are -- not 256 x 256,
     which was a 64K list made for every piece) */
  const NQ = mm.ids.length, recOf = new Array(NQ * NQ), partOf = new Array(256), dtOf = new Array(256);
  for (const a of here) {
    const list = [];
    for (const b of here) {
      if (a === b || a === water || b === water) continue;
      const r = edgeRecipe(cat[a], cat[b]);
      if (!r) continue;
      /* how far from `b` (thirds of an art px) this edge can still reach
         (v2.3.2954: a MIX zone to MIX_LIM of its width) */
      const lim = r.mix ? MIX_LIM : 1;
      const reachT = Math.ceil(((1.5 * r.reach + 1.35 * r.ragged * lim) / GPA + 1.5) * 3);
      const rr = { ...r, upQ: cat[a].id === r.up ? a : b, loQ: cat[a].id === r.up ? b : a, reachT, bl: -1, lim };
      recipes.set(a * 256 + b, rr);
      recOf[a * NQ + b] = rr;
      list.push(b);
    }
    if (list.length) { partners.set(a, list); partOf[a] = list; }
  }
  /* v2.3.2951: the pairs given a BLEND picture.  Each is laid as a ground
     of its own -- a label above the catalog's, so the tidy-up leaves no
     crumbs of it either -- numbered in the order of the pairs' keys, so two
     blends compare the same way in every chunk whatever else it holds. */
  const BL0 = NQ, blendTiles = [], blendLo = [], blendKeys = [];
  if (blends) {
    const want = new Set();
    for (const rr of recipes.values()) if (rr.mix && tileOfKey(blendKey(cat[rr.upQ].id, cat[rr.loQ].id))) want.add(blendKey(cat[rr.upQ].id, cat[rr.loQ].id));
    for (const k of [...want].sort()) {
      if (BL0 + blendKeys.length > 254) break;
      blendKeys.push(k);
      blendTiles.push(tileOfKey(k));
    }
    for (const rr of recipes.values()) {
      if (!rr.mix) continue;
      const n = blendKeys.indexOf(blendKey(cat[rr.upQ].id, cat[rr.loQ].id));
      if (n >= 0) {
        rr.bl = BL0 + n; blendLo[n] = rr.loQ;
        /* (v2.3.2952: its zone reaches BLEND_OFF past a plain mix's;
           v2.3.2953: and its big patches are BLEND_BIG as strong, the zone
           that much wider again; v2.3.2954: and as far past them as a plain
           mix's, MIX_LIM) */
        rr.lim = BLEND_BIG * MIX_LIM + BLEND_OFF;
        rr.reachT = Math.ceil(((1.5 * rr.reach + 1.35 * rr.ragged * rr.lim) / GPA + 1.5) * 3);
      }
    }
  }
  for (const list of partners.values()) for (const b of list) if (!dts.has(b)) { const D = chamfer34(pmat, PW, PH, b); dts.set(b, D); dtOf[b] = D; }
  /* v2.3.2954: each partner's own slow noise (bends about 36 game px
     across), -1..1, for when two partners would both take a pixel (edgeAt).
     Worked out every LAT art px on the world-anchored lattice below and read
     between, at the art px centres (NaN until wanted) */
  const nzOf = new Array(256).fill(null), latNz = new Array(256).fill(null), pd = new Float64Array(256), pe = new Int16Array(256);
  const nzLat = (l, i, j) => {
    let z = latNz[l];
    if (!z) z = latNz[l] = new Float32Array(LW * LH).fill(NaN);
    const k = j * LW + i;
    let v = z[k];
    if (v !== v) {
      const ax = (LX0 + i) * LAT, ay = (LY0 + j) * LAT;
      v = z[k] = valueNoise(ax / 24 + l * 7.31, ay / 24 - l * 3.17, seed + 97);
    }
    return v;
  };
  const nzAt = (l, q) => {
    let z = nzOf[l];
    if (!z) z = nzOf[l] = new Float32Array(PW * PH).fill(NaN);
    let v = z[q];
    if (v !== v) {
      const fx = (PX0 + (q % PW) + 0.5) / LAT - LX0 - 0.5, fy = (PY0 + ((q / PW) | 0) + 0.5) / LAT - LY0 - 0.5;
      const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, w = fy - j;
      v = z[q] = (nzLat(l, i, j) * (1 - u) + nzLat(l, i + 1, j) * u) * (1 - w) + (nzLat(l, i, j + 1) * (1 - u) + nzLat(l, i + 1, j + 1) * u) * w;
    }
    return v;
  };
  /* an art px is in reach of an edge when a partner is within the widest
     edge it could have (in thirds of an art px) */
  const inReach = new Uint8Array(PW * PH);
  if (partners.size) {
    for (let p = 0; p < PW * PH; p++) {
      const a = pmat[p], list = partOf[a];
      if (!list) continue;
      for (let k = 0; k < list.length; k++) if (dtOf[list[k]][p] <= recOf[a * NQ + list[k]].reachT) { inReach[p] = 1; break; }
    }
  }
  const bSel = (ax, ay) => fbm(ax / 1100, ay / 1100, seed + 11, 2) + 0.18 * (hash2(ax >> 2, ay >> 2, seed + 13) - 0.5) > 0;
  const tA = new Array(256).fill(null), tB = new Array(256).fill(null);
  for (const q of here) {
    const t = q !== water && cat[q] && tiles && tiles[cat[q].id];
    if (t && t.A) { tA[q] = t.A; tB[q] = t.B || t.A; }
  }
  const tileFor = (q, useB) => (useB ? tB[q] : tA[q]);
  /* per art px, worked out once for its K x K pixels: how far the edge
     reaches and how wide its band is there (both wander along it), and
     which version of the swatches (A or B) it shows */
  const pVar = new Float32Array(PW * PH * 2), pB = new Int8Array(PW * PH).fill(-1);
  /* the patches' noise at art px middles (NaN until wanted), read between them */
  const pPatch = new Float32Array(PW * PH).fill(NaN);
  const patchAt = (q) => {
    let v = pPatch[q];
    if (v !== v) { const ax = PX0 + (q % PW), ay = PY0 + ((q / PW) | 0); v = pPatch[q] = valueNoise((ax * K + K / 2) / 16, (ay * K + K / 2) / 16, seed + 43); }
    return v;
  };
  /* v2.3.2950: the SLOW fields -- how far an edge reaches and how wide its
     band is (they wander over ~40 art px), the MIX zone's big patches (~20
     and 50 art px), and A or B (~1100 art px) -- worked out every LAT art px,
     on a lattice anchored to the world (so every chunk agrees), and read
     between.  A field that slow comes out the same to about a hundredth, and
     working it out at every art px was most of the town's time once the
     square and the street mixed into the yards. */
  const LAT = 4, LX0 = Math.floor(PX0 / LAT), LY0 = Math.floor(PY0 / LAT);
  const LW = Math.floor((PX0 + PW) / LAT) - LX0 + 2, LH = Math.floor((PY0 + PH) / LAT) - LY0 + 2;
  const lat = new Float32Array(LW * LH * 4).fill(NaN);
  const latK = (i, j) => {
    const k = (j * LW + i) * 4;
    if (lat[k] !== lat[k]) {
      const ax = (LX0 + i) * LAT, ay = (LY0 + j) * LAT, ox = ax * K + K / 2, oy = ay * K + K / 2;
      lat[k] = valueNoise(ax / 40, ay / 40, seed + 31);
      lat[k + 1] = valueNoise(ax / 40 + 17.3, ay / 40 - 9.1, seed + 37);
      lat[k + 2] = MIX_PATCH * (0.69 * valueNoise(ox / 60, oy / 60, seed + 71) + 0.31 * valueNoise(ox / 150, oy / 150, seed + 73));
      lat[k + 3] = bSel(ax, ay) ? 1 : 0;
    }
    return k;
  };
  /* the slow fields at art px `p` into pVar and pB (once) */
  const slow = (p) => {
    const fx = (PX0 + (p % PW) + 0.5) / LAT - LX0 - 0.5, fy = (PY0 + ((p / PW) | 0) + 0.5) / LAT - LY0 - 0.5;
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const k00 = latK(i, j), k10 = latK(i + 1, j), k01 = latK(i, j + 1), k11 = latK(i + 1, j + 1);
    const w00 = (1 - u) * (1 - v), w10 = u * (1 - v), w01 = (1 - u) * v, w11 = u * v;
    pVar[2 * p] = 1 + 0.5 * (lat[k00] * w00 + lat[k10] * w10 + lat[k01] * w01 + lat[k11] * w11);
    pVar[2 * p + 1] = 1 + 0.35 * (lat[k00 + 1] * w00 + lat[k10 + 1] * w10 + lat[k01 + 1] * w01 + lat[k11 + 1] * w11);
    pB[p] = lat[(u < 0.5 ? (v < 0.5 ? k00 : k01) : v < 0.5 ? k10 : k11) + 3];
  };
  /* the MIX zone's big patches (about 30 and 75 game px across) at an art
     px's middle, from the lattice; pixels read between art px */
  const pMixN = new Float32Array(PW * PH).fill(NaN);
  const mixAt = (q) => {
    let r = pMixN[q];
    if (r !== r) {
      const fx = (PX0 + (q % PW) + 0.5) / LAT - LX0 - 0.5, fy = (PY0 + ((q / PW) | 0) + 0.5) / LAT - LY0 - 0.5;
      const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
      r = pMixN[q] = (lat[latK(i, j) + 2] * (1 - u) + lat[latK(i + 1, j) + 2] * u) * (1 - v) + (lat[latK(i, j + 1) + 2] * (1 - u) + lat[latK(i + 1, j + 1) + 2] * u) * v;
    }
    return r;
  };
  /* A whole art px settled at once, where one edge is near and its band
     coordinate, at the art px's middle, is plainly past either side of the
     ragged band (by more than the art px's half-diagonal can change it):
     the upper's or the lower's label, or -1 to work each pixel out. */
  const pSet = new Int16Array(PW * PH).fill(-2);
  /* (v2.3.2950: near several partners too -- the town's square, street and
     yards all meet -- when every one of them plainly gives the same answer,
     since the pixel's nearest partner, whichever it is, then gives it too) */
  const settle = (a, p) => {
    const list = partOf[a];
    if (!list) return -1;
    /* v2.3.2954: every partner in reach has its say, as in edgeAt: the art
       px is settled when each one's answer is sure across it and at most
       one of them takes it from `a` (until now only the nearest partner's
       answer counted, wherever one was plainly nearest) */
    let ans = a, takers = 0;
    /* (the patches' lowest and highest round the art px, worked out once
       for each of the three ways an edge weighs them) */
    const range = [NaN, NaN, NaN, NaN, NaN, NaN];
    for (let k = 0; k < list.length; k++) {
      const b = list[k], r = recOf[a * NQ + b], d0 = dtOf[b][p];
      let e;
      if (d0 > r.reachT) e = a;
      else {
        if (pB[p] < 0) slow(p);
        const dist = Math.max(0, d0 / 3 - 0.5) * GPA, s = a === r.loQ ? dist : -dist;
        const E = r.ragged * pVar[2 * p + 1], t = (s - r.reach * pVar[2 * p]) / E;
        const slack = (0.75 * GPA + 0.1) / E;
        e = t - slack >= r.lim ? r.loQ : t + slack <= -r.lim ? r.upQ : -1;
        /* in the band, the patches may decide it for the whole art px: the
           pictures' part (0.7 x their heights' difference) is never more
           than 0.7 either way, and every pixel's patch lies between the
           lowest and highest of the art px centres round it */
        if (e < 0) {
          const way = r.mix ? (r.bl >= 0 ? 2 : 1) : 0;
          if (range[2 * way] !== range[2 * way]) {
            let mn = Infinity, mx = -Infinity;
            const px = p % PW, py = (p / PW) | 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const qx = Math.min(PW - 1, Math.max(0, px + dx)), qy = Math.min(PH - 1, Math.max(0, py + dy)), q = qy * PW + qx;
              const v = r.mix ? 0.18 * patchAt(q) + (r.bl >= 0 ? BLEND_BIG : 1) * mixAt(q) : 0.6 * patchAt(q);
              if (v < mn) mn = v;
              if (v > mx) mx = v;
            }
            range[2 * way] = mn; range[2 * way + 1] = mx;
          }
          const lo = range[2 * way], hi = range[2 * way + 1];
          const hw = r.bl >= 0 ? BLEND_HEIGHTS : r.mix ? MIX_HEIGHTS : 0.7;
          /* v2.3.2952: with a blend (edgeAt), the upper ground where even
             the lowest patch and heights clear its change (at t + BLEND_OFF);
             the lower where even the highest fall short of its change (at
             t - BLEND_OFF); the blend where neither change can be reached */
          if (r.bl >= 0) {
            const C = BLEND_OFF;
            if (lo - (t + slack + C) > hw) e = r.upQ;
            else if (hi - (t - slack - C) <= -hw) e = r.loQ;
            else if (hi - (t - slack + C) <= -hw && lo - (t + slack - C) > hw) e = r.bl;
          } else if (lo - (t + slack) > hw) e = r.upQ;
          else if (hi - (t - slack) <= -hw) e = r.loQ;
        }
      }
      if (e < 0) return -1;
      if (e !== a) { if (++takers > 1) return -1; ans = e; }
    }
    return ans;
  };
  /* the edge's answer for one output pixel, or -1 where there is no edge */
  const edgeAt = (a, p, aox, aoy) => {
    const list = partOf[a];
    if (!list) return -1;
    const axc = (aox + 0.5) / K, ayc = (aoy + 0.5) / K;
    /* the art px centres round the point, and where it sits between them */
    const fx = Math.min(PW - 1.001, Math.max(0, axc - PX0 - 0.5)), fy = Math.min(PH - 1.001, Math.max(0, ayc - PY0 - 0.5));
    const i0 = Math.floor(fx), j0 = Math.floor(fy), ux = fx - i0, uy = fy - j0;
    const q00 = j0 * PW + i0;
    let b = -1, bd = Infinity;
    for (let k = 0; k < list.length; k++) {
      const l = list[k], D = dtOf[l];
      const d = (D[q00] * (1 - ux) + D[q00 + 1] * ux) * (1 - uy) + (D[q00 + PW] * (1 - ux) + D[q00 + PW + 1] * ux) * uy;
      pd[k] = d;
      if (d < bd) { bd = d; b = l; }
    }
    if (b < 0) return -1;
    /* the reach and the band vary along the edge, so it wanders */
    if (pB[p] < 0) slow(p);
    pxFine = NaN; pxMix = NaN;
    if (list.length === 1) return ruleAt(a, b, bd, p, q00, ux, uy, aox, aoy);
    /* v2.3.2954: every partner in reach has its say (PARTNER_TIE) */
    let take = a, n = 0;
    for (let k = 0; k < list.length; k++) {
      const l = list[k];
      if (pd[k] > recOf[a * NQ + l].reachT) { pe[k] = a; continue; }
      const e = pe[k] = ruleAt(a, l, pd[k], p, q00, ux, uy, aox, aoy);
      if (e !== a) { n++; take = e; }
    }
    if (n <= 1) return take;
    let bestM = -Infinity;
    for (let k = 0; k < list.length; k++) {
      if (pe[k] === a) continue;
      const l = list[k];
      const m = marginAt(a, l, pd[k], p, q00, ux, uy, aox, aoy) +
        PARTNER_TIE * ((nzAt(l, q00) * (1 - ux) + nzAt(l, q00 + 1) * ux) * (1 - uy) + (nzAt(l, q00 + PW) * (1 - ux) + nzAt(l, q00 + PW + 1) * ux) * uy);
      if (m > bestM) { bestM = m; take = pe[k]; }
    }
    return take;
  };
  /* (the two patch fields at the pixel, read between the art px centres --
     once a pixel, however many partners ask: edgeAt clears them) */
  let pxFine = NaN, pxMix = NaN;
  const fineHere = (q00, ux, uy) => (pxFine === pxFine ? pxFine : (pxFine = (patchAt(q00) * (1 - ux) + patchAt(q00 + 1) * ux) * (1 - uy) + (patchAt(q00 + PW) * (1 - ux) + patchAt(q00 + PW + 1) * ux) * uy));
  const mixHere = (q00, ux, uy) => (pxMix === pxMix ? pxMix : (pxMix = (mixAt(q00) * (1 - ux) + mixAt(q00 + 1) * ux) * (1 - uy) + (mixAt(q00 + PW) * (1 - ux) + mixAt(q00 + PW + 1) * ux) * uy));
  /* v2.3.2954: how far past its own line partner `b` is at the pixel -- in
     widths of its band, the pictures' heights counted in full -- for two
     partners that would both take it (edgeAt) */
  const marginAt = (a, b, bd, p, q00, ux, uy, aox, aoy) => {
    const r = recOf[a * NQ + b], up = r.upQ, lo = r.loQ;
    const dist = Math.max(0, bd / 3 - 0.5) * GPA, s = a === lo ? dist : -dist;
    const t = (s - r.reach * pVar[2 * p]) / (r.ragged * pVar[2 * p + 1]);
    let patch = 0.6 * fineHere(q00, ux, uy);
    if (r.mix) patch = 0.3 * patch + (r.bl >= 0 ? BLEND_BIG : 1) * mixHere(q00, ux, uy);
    const hw = r.bl >= 0 ? BLEND_HEIGHTS : r.mix ? MIX_HEIGHTS : 0.7, useB = pB[p] === 1;
    const hu = heightAt(tileFor(up, useB), up, aox, aoy, seed), hl = heightAt(tileFor(lo, useB), lo, aox, aoy, seed);
    if (r.bl >= 0) {
      const hb = heightAt(blendTiles[r.bl - BL0], r.bl, aox, aoy, seed);
      return a === lo ? hw * (hb - hl) + patch - (t - BLEND_OFF) : t + BLEND_OFF - (hw * (hu - hb) + patch);
    }
    const v = hw * (hu - hl) + patch - t;
    return a === lo ? v : -v;
  };
  /* the answer of the edge between `a` and its partner `b`, at the pixel */
  const ruleAt = (a, b, bd, p, q00, ux, uy, aox, aoy) => {
    const r = recOf[a * NQ + b];
    /* game px from the line between the two, + into the lower ground */
    const dist = Math.max(0, bd / 3 - 0.5) * GPA;
    const up = r.upQ, lo = r.loQ;
    const s = a === lo ? dist : -dist;
    const t = (s - r.reach * pVar[2 * p]) / (r.ragged * pVar[2 * p + 1]);
    if (t <= -r.lim) return up;
    if (t >= r.lim) return lo;
    /* patches a few game px across, so the upper ground comes in islands
       and the lower shows through in bays, thinning out across the band */
    let patch = 0.6 * fineHere(q00, ux, uy);
    /* v2.3.2950: where two alike grounds MIX, the patches are big -- about
       30 and 75 game px across -- with the small ones only at their rims */
    if (r.mix) patch = 0.3 * patch + (r.bl >= 0 ? BLEND_BIG : 1) * mixHere(q00, ux, uy);
    /* (the pictures' part is hw x a difference of two heights in 0..1:
       where the patch alone clears it, it cannot change the answer) */
    const hw = r.bl >= 0 ? BLEND_HEIGHTS : r.mix ? MIX_HEIGHTS : 0.7;
    /* v2.3.2951: a pair with a BLEND picture: the zone goes from the upper
       ground, through the blend, to the lower one.  v2.3.2952: as two whole
       plain mixes, BLEND_OFF either side of the line, each with a plain
       mix's ramp and patches (and the heights at BLEND_HEIGHTS): the upper
       ground where the patch and the heights (upper against blend) clear
       t + BLEND_OFF; else the lower where they (blend against lower) fall
       to t - BLEND_OFF; else the blend.  Both changes are judged
       everywhere, so nothing jumps at the line, and each wanders about as
       far as a plain mix's. */
    if (r.bl >= 0) {
      const bt = blendTiles[r.bl - BL0], useB = pB[p] === 1, tu = t + BLEND_OFF, tl = t - BLEND_OFF;
      let hb = -1;
      if (patch - tu > hw) return up;
      if (patch - tu > -hw) {
        hb = heightAt(bt, r.bl, aox, aoy, seed);
        if (hw * (heightAt(tileFor(up, useB), up, aox, aoy, seed) - hb) + patch > tu) return up;
      }
      if (patch - tl <= -hw) return lo;
      if (patch - tl > hw) return r.bl;
      if (hb < 0) hb = heightAt(bt, r.bl, aox, aoy, seed);
      return hw * (hb - heightAt(tileFor(lo, useB), lo, aox, aoy, seed)) + patch > tl ? r.bl : lo;
    }
    if (patch - t > hw) return up;
    if (patch - t <= -hw) return lo;
    const useB = pB[p] === 1;
    const hu = heightAt(tileFor(up, useB), up, aox, aoy, seed), hl = heightAt(tileFor(lo, useB), lo, aox, aoy, seed);
    return hw * (hu - hl) + patch > t ? up : lo;
  };
  /* 3. output pixels: an edge's answer where one is in reach; else the art
     px's answer where its neighbourhood is one swatch, each pixel's own
     where two meet.  FW more all round, for the foam and the tidy-up (which
     must see the whole of any bit it takes away, whichever rectangle). */
  const FOAM = Math.max(1, Math.round(K / 1.5)), FW = Math.max(FOAM, EDGE_BIT + 1);
  const OW = RW * K, OH = RH * K, OX0 = X0 * K, OY0 = Y0 * K, OEW = OW + 2 * FW, OEH = OH + 2 * FW;
  const omat = new Uint8Array(OEW * OEH), odep = new Float32Array(OEW * OEH), oedge = new Uint8Array(OEW * OEH);
  for (let oy = 0; oy < OEH; oy++) {
    const aoy = OY0 - FW + oy, pyi = Math.floor(aoy / K) - PY0;
    const ox0 = OX0 - FW;
    let pxi = Math.floor(ox0 / K), sub = ox0 - pxi * K;
    pxi -= PX0;
    for (let ox = 0; ox < OEW; ox++, sub++) {
      if (sub === K) { sub = 0; pxi++; }
      const aox = ox0 + ox;
      const p = pyi * PW + pxi, o = oy * OEW + ox;
      if (inReach[p]) {
        let e = pSet[p];
        if (e === -2) e = pSet[p] = settle(pmat[p], p);
        if (e < 0) e = edgeAt(pmat[p], p, aox, aoy);
        if (e >= 0) { omat[o] = e; odep[o] = pdep[p]; oedge[o] = 1; continue; }
      }
      if (puni[p]) { omat[o] = pmat[p]; odep[o] = pdep[p]; continue; }
      lastWater = 0;
      const axc = (aox + 0.5) / K, ayc = (aoy + 0.5) / K;
      omat[o] = pickAt(axc, ayc, axc - 0.5, ayc - 0.5);
      odep[o] = lastWater;
    }
  }
  /* v2.3.2947: EDGE PIECES -- a ground's own loose tufts, lumps and drifts
     (its optional third picture, tiles[id].E), scattered WHOLE on the
     ground below it near their edge, thicker close in.  Each piece has a
     fixed place in the world (the picture repeats like a swatch, three
     times over at offsets, for enough of them along an edge -- never turned:
     they are lit from the upper left, like all art); it is laid or not by
     what lies under its middle, so a piece is never cut in half.  Laid into
     the label map before the tidy-up (a pocket of road left between a tuft
     and the grass is a crumb too), and over the worked-out margin, whose
     width (PM) is what makes every chunk lay the same pieces. */
  const opk = new Int32Array(OEW * OEH).fill(-1);
  const uppers = new Set();
  for (const r of recipes.values()) if (!r.even) { const t = tiles && tiles[cat[r.upQ].id]; if (t && t.E) uppers.add(r.upQ); }
  const EX0 = OX0 - FW, EY0 = OY0 - FW;
  for (const U of uppers) {
    const E = tiles[cat[U].id].E, pm = pieceMap(E), T = E.w, DU = dtOf[U];
    if (!DU || !pm.pieces.length) continue;
    for (let L = 0; L < 3; L++) {
      const offx = Math.round(T * [0, 0.37, 0.71][L]), offy = Math.round(T * [0, 0.61, 0.29][L]);
      for (let ry = Math.floor((EY0 - offy - pm.max) / T); ry * T + offy < EY0 + OEH + pm.max; ry++) {
        for (let rx = Math.floor((EX0 - offx - pm.max) / T); rx * T + offx < EX0 + OEW + pm.max; rx++) {
          const bx = rx * T + offx, by = ry * T + offy;
          for (const pc of pm.pieces) {
            /* does the piece touch the worked-out area? */
            if (bx + pc.x1 < EX0 || bx + pc.x0 >= EX0 + OEW || by + pc.y1 < EY0 || by + pc.y0 >= EY0 + OEH) continue;
            const cxo = bx + pc.cx, cyo = by + pc.cy;
            const fx = cxo / K - PX0 - 0.5, fy = cyo / K - PY0 - 0.5;
            if (fx < 0 || fy < 0 || fx >= PW - 1 || fy >= PH - 1) continue;
            const i0 = Math.floor(fx), j0 = Math.floor(fy), ux = fx - i0, uy = fy - j0, q00 = j0 * PW + i0;
            const lc = pmat[Math.round(fy) * PW + Math.round(fx)];
            if (lc === U) continue;
            const r = recOf[lc * NQ + U];
            if (!r || r.even || r.upQ !== U) continue;
            const d = Math.max(0, ((DU[q00] * (1 - ux) + DU[q00 + 1] * ux) * (1 - uy) + (DU[q00 + PW] * (1 - ux) + DU[q00 + PW + 1] * ux) * uy) / 3 - 0.5) * GPA;
            /* from a little inside the upper ground's ragged edge (nearer, it
               covers them) to EDGE_PIECE_REACH beyond it, thinning out */
            const d0 = r.reach + 0.3 * r.ragged, Z = r.reach + r.ragged + EDGE_PIECE_REACH;
            if (d < d0 || d > Z) continue;
            if (hash2(Math.floor(cxo), Math.floor(cyo), seed + 61 + L) >= 0.9 * (1 - (d - d0) / (Z - d0)) ** 0.7) continue;
            for (let v = pc.y0; v <= pc.y1; v++) {
              const oy = by + v - EY0;
              if (oy < 0 || oy >= OEH) continue;
              for (let u = pc.x0; u <= pc.x1; u++) {
                if (pm.id[v * T + u] !== pc.n) continue;
                const ox = bx + u - EX0;
                if (ox < 0 || ox >= OEW) continue;
                const o = oy * OEW + ox, m = omat[o];
                if (m === water || (mm.built && mm.built[m])) continue;
                omat[o] = U; opk[o] = v * T + u; oedge[o] = 1;
              }
            }
          }
        }
      }
    }
  }
  /* the tidy-up: pixel art has no crumbs.  Where an edge left a bit of one
     ground smaller than EDGE_BIT pixels -- an island of grass out on the
     dirt, a hole in it -- it goes to the ground round it.  A bit touching
     the worked-out area's border is kept: it may run on outside, and the
     margin (FW) is wide enough that any bit this small that reaches into
     the rectangle is seen whole, so chunks still agree. */
  const seen = new Int32Array(OEW * OEH), keep = new Uint8Array(OEW * OEH);
  const bit = [];
  let stamp = 0;
  for (let o0 = OEW; o0 < OEW * (OEH - 1); o0++) {
    if (!oedge[o0] || keep[o0]) continue;
    const lab = omat[o0];
    /* a bit's every pixel is reached from its rim, so start only there */
    if (omat[o0 - 1] === lab && omat[o0 + 1] === lab && omat[o0 - OEW] === lab && omat[o0 + OEW] === lab) continue;
    stamp++;
    bit.length = 0;
    bit.push(o0); seen[o0] = stamp;
    let big = false;
    for (let k = 0; k < bit.length && !big; k++) {
      const o = bit[k], ox = o % OEW;
      for (let d = 0; d < 4; d++) {
        let n;
        if (d === 0) { if (ox === OEW - 1) { big = true; break; } n = o + 1; }
        else if (d === 1) { if (ox === 0) { big = true; break; } n = o - 1; }
        else if (d === 2) { n = o + OEW; if (n >= OEW * OEH) { big = true; break; } }
        else { n = o - OEW; if (n < 0) { big = true; break; } }
        if (omat[n] !== lab) continue;
        if (keep[n]) { big = true; break; }
        if (seen[n] === stamp) continue;
        seen[n] = stamp;
        bit.push(n);
        if (bit.length >= EDGE_BIT) { big = true; break; }
      }
    }
    if (big) { for (const o of bit) keep[o] = 1; continue; }
    /* a crumb: it goes to the commonest ground round it */
    let to = -1, tn = 0;
    const cnt = new Map();
    for (const o of bit) for (const n of [o - 1, o + 1, o - OEW, o + OEW]) {
      const m = omat[n];
      if (m === lab) continue;
      const c = (cnt.get(m) || 0) + 1;
      cnt.set(m, c);
      if (c > tn || (c === tn && m < to)) { tn = c; to = m; }
    }
    if (to < 0) continue;
    for (const o of bit) { omat[o] = to; opk[o] = -1; keep[o] = 1; }
  }
  /* 4. colour -- each swatch's pictures and plan colours looked up once,
     not for every pixel */
  const data = new Uint8ClampedArray(OW * OH * 4);
  const mat = opts.withMaterials === false ? null : new Uint8Array(OW * OH);
  const look = new Array(256);
  const lookOf = (q) => {
    const e = cat[q], t = tiles && e && tiles[e.id];
    return (look[q] = { A: t && t.A ? t.A : null, B: t && t.A && t.B ? t.B : null, E: t && t.E ? t.E : null, c1: e ? e.color : [0, 0, 0], c2: e ? shade(e.color, 0.86) : [0, 0, 0],
      planks: !!(e && e.laid === 'planks') });
  };
  /* v2.3.2951: each BLEND's picture, laid like a swatch's -- anchored to the
     world, never turned -- and how many of the rectangle's pixels it gave */
  for (let n = 0; n < blendTiles.length; n++) look[BL0 + n] = { A: blendTiles[n], B: null, E: null, c1: [0, 0, 0], c2: [0, 0, 0], planks: false };
  const blendPx = new Array(blendTiles.length).fill(0);
  /* v2.3.2949: a plank deck's boards (PLANK DECKS above): BW output px a
     board, one board per half cell of the whole world, counted along the
     deck; `board` is worked out once a board, not once a pixel */
  const BW = (S * K) / BOARDS_PER_CELL;
  let pkCell = -2, pkDeck = null, pkJ = null, pk = null, pkR = 0, pkT = 0;
  const board = (L, ax, ay, aox, aoy) => {
    const bx = Math.floor((ax - bp.x0) / S), by = Math.floor((ay - bp.y0) / S), ci = by * bp.w + bx;
    if (ci !== pkCell) {
      pkCell = ci;
      const k = mm.deckAt ? mm.deckAt.get(ci) : undefined;
      pkDeck = k != null ? mm.decks[k] : null;
      pkJ = null;
    }
    const alongX = !pkDeck || pkDeck.along === 'x';
    const key = pkDeck ? (alongX ? pkDeck.y0 : pkDeck.x0) : 0;
    const s = alongX ? aox : aoy, t = alongX ? aoy : aox;
    const j = Math.floor(s / BW);
    if (j !== pkJ) {
      pkJ = j;
      const tile = L.B && hash2(j, key, seed + 43) < 0.5 ? L.B : L.A;
      const P = L.A ? planksOf(tile, BW) : null;
      pk = { P, b: P ? P.boards[Math.floor(hash2(j, key, seed + 41) * P.n) % P.n] : null, shift: P ? Math.floor(hash2(j, key, seed + 47) * P.tile.w) : 0, odd: j & 1 };
    }
    /* where in the board: pkR along the deck (0 .. BW), pkT across it */
    pkR = s - j * BW;
    pkT = t;
  };
  const wt = waterTiles(tiles);   /* v2.3.2980: the water's pictures, if any */
  const shoreAt = wt ? shoreSampler(bp, mm, X0, Y0, RW, RH) : null;   /* v2.3.2984 */
  let wlx = null, wly = null, wlt = null;
  for (let oy = 0; oy < OH; oy++) {
    const aoy = OY0 + oy, ay = Math.floor(aoy / K);
    let lastAx = null, bsel = 0;
    let ax = Math.floor(OX0 / K), sub = OX0 - ax * K;
    for (let ox = 0; ox < OW; ox++, sub++) {
      if (sub === K) { sub = 0; ax++; }
      const aox = OX0 + ox, i = oy * OW + ox, o = i * 4;
      const e0 = (oy + FW) * OEW + ox + FW, m = omat[e0];
      /* (a blend's pixels count, in `mat`, as the pair's lower ground: the
         catalog's labels are all a caller sees) */
      if (m >= BL0) { blendPx[m - BL0]++; if (mat) mat[i] = blendLo[m - BL0]; } else if (mat) mat[i] = m;
      let c;
      if (m === water) {
        let land = false;
        for (let d = 1; d <= FOAM && !land; d++) land = omat[e0 - d] !== water || omat[e0 + d] !== water || omat[e0 - d * OEW] !== water || omat[e0 + d * OEW] !== water;
        const dd = odep[e0];
        /* v2.3.2980: the water's own pictures where made (waterLook), one
           look an art px, laid in output px like any swatch */
        if (!land && wt) {
          if (ax !== wlx || ay !== wly) { wlx = ax; wly = ay; wlt = wt[waterLook(bp, mm, ax, ay, shoreAt(ax, ay), seed)] || null; }
          if (wlt && wlt.A) {
            const tile = wlt.B && fbm(ax / 1100, ay / 1100, seed + 17, 2) > 0 ? wlt.B : wlt.A, T = tile.w;
            let u = aox % T, v = aoy % T;
            if (u < 0) u += T;
            if (v < 0) v += T;
            putTexel(data, o, tile, v * T + u);
            continue;
          }
        }
        c = land ? WATER_RGB.foam : dd < 0.72 ? WATER_RGB.shallow : dd < 0.93 ? WATER_RGB.mid : WATER_RGB.deep;
      } else {
        const L = look[m] || lookOf(m);
        if (opk[e0] >= 0) { putTexel(data, o, L.E, opk[e0]); continue; }
        if (L.planks) {
          board(L, ax, ay, aox, aoy);
          if (pk.P) {
            const pt = pk.P.tile, W2 = pt.w, H2 = pt.h;
            const ty = (Math.floor(pk.b.y0 + ((pkR + 0.5) * pk.b.h) / BW) % H2 + H2) % H2;
            const tx = ((pkT + pk.shift) % W2 + W2) % W2;
            putTexel(data, o, pt, ty * W2 + tx);
            continue;
          }
          /* not made yet: the plan's colours, a board each */
          c = pk.odd ? L.c1 : L.c2;
          data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
          continue;
        }
        if (L.A) {
          if (L.B && ax !== lastAx) { lastAx = ax; bsel = fbm(ax / 1100, ay / 1100, seed + 11, 2) + 0.18 * (hash2(ax >> 2, ay >> 2, seed + 13) - 0.5); }
          const tile = L.B && bsel > 0 ? L.B : L.A, T = tile.w;
          let u = aox % T, v = aoy % T;
          if (u < 0) u += T;
          if (v < 0) v += T;
          putTexel(data, o, tile, v * T + u);
          continue;
        }
        /* not made yet: the plan's colour, chequered every 16 art px */
        c = ((ax >> 4) + (ay >> 4)) & 1 ? L.c1 : L.c2;
      }
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    }
  }
  /* v2.3.2951: the blends laid here, with their pixel counts (the Ground
     Studio says which are in view) */
  const blendsLaid = blendKeys.map((key, n) => ({ key, px: blendPx[n] })).filter((b) => b.px > 0);
  /* v2.3.3019: the water's MOTION, when asked for -- the game's worker asks,
     the studios do not (WATER THAT MOVES, below) */
  const waterField = opts.waterField ? waterFieldOf(bp, mm, seed, omat, OEW, OEH, FW, K, X0, Y0, RW, RH, shoreAt, opts.waterField) : null;
  if (opts.withMaterials === false) return { w: OW, h: OH, data, scale: K, blendsLaid, waterField };
  return { w: OW, h: OH, data, mat, scale: K, blendsLaid, waterField };
}

/* ═══ v2.3.3019: WATER THAT MOVES ═══
   Owner, 2026-10-04: "Does the water move yet" -- it did not: the Wheel's
   water was the owner's still pictures ("Moving water ... is a later
   round") -- then, offered glints and slow lines of light drifting across
   it, the foam lapping in and out at the shore and a gentle drift down the
   rivers: "Yes".
   The water stays the owner's pictures.  The motion is drawn over them by
   the game, on the GPU (src/rendering/wheelWater.js), from a small FIELD
   laid here with each piece: one texel an art px (1.5 game px) of the
   rectangle, its apron included, so the GPU's smoothing reads the true
   neighbour at a join, as the piece's own picture does --
     R    how far the texel's middle lies from the nearest px that is NOT
          water: the shore as DRAWN (land, a bridge's deck, a rock), not the
          plan's cells.  In output px x WF_DIST, to WF_CAP output px (10 game
          px); 0 on land.  Exact -- a Euclidean distance transform over the
          worked-out area, whose margin FW is wider than WF_CAP -- so two
          pieces laid apart agree on every texel they share.
     G    which water, as waterLook picks its PICTURE there (WF_KIND) -- and
          on land beside it the water's, so the smoothing never reads a
          coast as a strip of some other water.
     B,A  which way and how fast a river runs there, 128 still: along the
          plan's river from its source to its mouth (waterRivers).  Ponds,
          lakes and oases lie still.
   No water in the rectangle: no field (null).  Open sea all alike with no
   land within reach: `uniform`, its four numbers, and no texels at all. */
export const WF_CAP = 20, WF_DIST = 12;
export const WF_KIND = { sea: 255, shallows: 170, fresh: 85 };
/* `?nowaves` in the address keeps the water still, as it was before (the
   worker then lays no fields, and the game draws no motion) */
export function wavesOn(search) {
  return !/(^|[?&])nowaves(=|&|$)/.test(typeof search === 'string' ? search : '');
}
/* the rivers, from the blueprint's routes (art px, source to mouth), with
   how wide each runs from its source to its end (plan.rivers' `width`) */
export function waterRivers(plan, full) {
  const out = [];
  for (const r of (full && full.routes) || []) {
    if (r.kind !== 'river' || !r.pts || r.pts.length < 2) continue;
    const rv = (plan.rivers || []).find((q) => q.id === r.id) || {};
    const wd = rv.width || [40, 40];
    const pts = new Float32Array(r.pts.length * 2);
    r.pts.forEach((p, k) => { pts[2 * k] = p[0]; pts[2 * k + 1] = p[1]; });
    out.push({ id: r.id, pts, half0: wd[0] / 2, half1: wd[1] / 2 });
  }
  return out;
}
/* how far past its drawn half-width (art px) a river's flow still reaches:
   its banks wander with noise, and the field's smoothing needs a texel more */
const WF_BANK = 18;
/* the last art px before its mouth, over which a river's flow dies away
   into the sea it joins */
const WF_MOUTH = 160;
/* how many texels onto the land the water's kind is carried (the GPU's
   smoothing reads one); the worked-out area's margin, FW output px, must
   hold WF_SPREAD + 1 texels more round the rectangle (21 >= 4 x 3) */
const WF_SPREAD = 3;

function waterFieldOf(bp, mm, seed, omat, OEW, OEH, FW, K, X0, Y0, RW, RH, shoreAt, wf) {
  const water = mm.water, h = K >> 1, n = RW * RH;
  /* the texels' middles: water or not, as drawn */
  const isW = new Uint8Array(n);
  let nW = 0;
  for (let fy = 0; fy < RH; fy++) {
    const row = (FW + fy * K + h) * OEW + FW + h;
    for (let fx = 0; fx < RW; fx++) if (omat[row + fx * K] === water) { isW[fy * RW + fx] = 1; nW++; }
  }
  if (!nW) return null;
  let land = false;
  for (let o = 0; o < omat.length && !land; o++) land = omat[o] !== water;
  const cap = Math.min(WF_CAP, FW - 1);
  const dist = land ? shoreDistances(omat, OEW, OEH, water, FW, K, RW, RH) : null;
  /* which water each texel shows (the picture waterLook picks there) --
     worked out WF_SPREAD texels past the rectangle too, so the land's share
     below is the same whichever piece it is worked out in */
  const sh = shoreAt || shoreSampler(bp, mm, X0, Y0, RW, RH);
  const XE = WF_SPREAD + 1, EWd = RW + 2 * XE, EHd = RH + 2 * XE, nE = EWd * EHd;
  const kindE = new Uint8Array(nE);
  const counts = { sea: 0, shallows: 0, fresh: 0 };
  for (let ey = 0; ey < EHd; ey++) {
    const fy = ey - XE, row = (FW + fy * K + h) * OEW + FW + h;
    for (let ex = 0; ex < EWd; ex++) {
      const fx = ex - XE;
      if (omat[row + fx * K] !== water) continue;
      const ax = X0 + fx, ay = Y0 + fy;
      const k = waterLook(bp, mm, ax, ay, sh(ax, ay), seed);
      kindE[ey * EWd + ex] = WF_KIND[k];
      if (fx >= 0 && fy >= 0 && fx < RW && fy < RH) counts[k]++;
    }
  }
  /* on land, the kind of the water beside it -- WF_SPREAD texels in, a pass
     a texel, each pass from a copy so it spreads evenly every way */
  if (nW < n || land) {
    const tmp = new Uint8Array(nE);
    for (let pass = 0; pass < WF_SPREAD; pass++) {
      tmp.set(kindE);
      for (let i = 0; i < nE; i++) {
        if (tmp[i]) continue;
        const x = i % EWd;
        const k = (x > 0 && tmp[i - 1]) || (x < EWd - 1 && tmp[i + 1]) || (i >= EWd && tmp[i - EWd]) || (i + EWd < nE && tmp[i + EWd]) || 0;
        if (k) kindE[i] = k;
      }
    }
  }
  const kind = new Uint8Array(n);
  for (let fy = 0; fy < RH; fy++) kind.set(kindE.subarray((fy + XE) * EWd + XE, (fy + XE) * EWd + XE + RW), fy * RW);
  /* the rivers' flow, on fresh water only */
  const flowX = new Float32Array(n), flowY = new Float32Array(n);
  let flowing = 0;
  if (counts.fresh && wf.rivers && wf.rivers.length) {
    for (const rv of wf.rivers) flowing += riverFlow(rv, X0, Y0, RW, RH, isW, kind, flowX, flowY);
  }
  if (!land && !flowing) {
    const k0 = kind[0];
    let same = true;
    for (let i = 1; i < n && same; i++) same = kind[i] === k0;
    if (same) return { w: RW, h: RH, data: null, uniform: [cap * WF_DIST, k0, 128, 128], counts, flowing: 0 };
  }
  const data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    data[o] = isW[i] ? Math.max(1, Math.round(Math.min(dist ? dist[i] : cap, cap) * WF_DIST)) : 0;
    data[o + 1] = kind[i];
    data[o + 2] = Math.max(1, Math.min(255, Math.round(128 + 127 * flowX[i])));
    data[o + 3] = Math.max(1, Math.min(255, Math.round(128 + 127 * flowY[i])));
  }
  return { w: RW, h: RH, data, uniform: null, counts, flowing };
}

/* One river's flow over the field's fresh texels: the way its line runs
   at the nearest point (smoothed between the line's corners, so the flow
   bends with the river and never turns at a corner), fastest mid-channel
   and upstream, dying away over its last WF_MOUTH art px into the sea.
   Returns how many texels it moves. */
function riverFlow(rv, X0, Y0, RW, RH, isW, kind, flowX, flowY) {
  const P = rv.pts, m = P.length >> 1;
  if (m < 2) return 0;
  const reach = Math.max(rv.half0, rv.half1) + WF_BANK;
  /* only the stretches whose box comes within reach of the rectangle */
  const segs = [];
  for (let k = 0; k < m - 1; k++) {
    const ax = P[2 * k], ay = P[2 * k + 1], bx = P[2 * k + 2], by = P[2 * k + 3];
    if (Math.max(ax, bx) < X0 - reach || Math.min(ax, bx) > X0 + RW + reach || Math.max(ay, by) < Y0 - reach || Math.min(ay, by) > Y0 + RH + reach) continue;
    segs.push(k);
  }
  if (!segs.length) return 0;
  /* the length along the line to each corner, and the line's way at each */
  const L = new Float64Array(m);
  for (let k = 1; k < m; k++) L[k] = L[k - 1] + Math.hypot(P[2 * k] - P[2 * k - 2], P[2 * k + 1] - P[2 * k - 1]);
  const T = L[m - 1] || 1;
  const tan = (k) => {
    const a = Math.max(0, k - 1), b = Math.min(m - 1, k + 1);
    const dx = P[2 * b] - P[2 * a], dy = P[2 * b + 1] - P[2 * a + 1], l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  };
  let moved = 0;
  for (let fy = 0; fy < RH; fy++) for (let fx = 0; fx < RW; fx++) {
    const i = fy * RW + fx;
    if (!isW[i] || kind[i] !== WF_KIND.fresh) continue;
    const x = X0 + fx + 0.5, y = Y0 + fy + 0.5;
    let best = Infinity, bk = -1, bu = 0;
    for (const k of segs) {
      const ax = P[2 * k], ay = P[2 * k + 1], dx = P[2 * k + 2] - ax, dy = P[2 * k + 3] - ay;
      const ll = dx * dx + dy * dy || 1;
      const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / ll));
      const ex = ax + dx * u - x, ey = ay + dy * u - y, d2 = ex * ex + ey * ey;
      if (d2 < best) { best = d2; bk = k; bu = u; }
    }
    if (bk < 0) continue;
    const d = Math.sqrt(best);
    const along = L[bk] + (L[bk + 1] - L[bk]) * bu, t = along / T;
    const half = rv.half0 + (rv.half1 - rv.half0) * t;
    if (d > half + WF_BANK) continue;
    /* (a texel already moved by a nearer river keeps its own) */
    if (flowX[i] || flowY[i]) continue;
    const t0 = tan(bk), t1 = tan(bk + 1);
    let tx = t0[0] + (t1[0] - t0[0]) * bu, ty = t0[1] + (t1[1] - t0[1]) * bu;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    /* mid-channel 1, the banks half; meltwater upstream a little quicker;
       nothing left of it at the mouth */
    const bank = 1 - 0.5 * Math.min(1, Math.max(0, (d - 0.45 * half) / (0.55 * half + WF_BANK)));
    const s = bank * (1 - 0.3 * t) * Math.min(1, (T - along) / WF_MOUTH);
    if (s <= 0.02) continue;
    flowX[i] = tx * s; flowY[i] = ty * s;
    moved++;
  }
  return moved;
}

/* The distance (output px) from each texel's middle to the nearest px that
   is not water: an exact Euclidean distance transform (Felzenszwalb and
   Huttenlocher, "Distance Transforms of Sampled Functions").  Down each
   column of the worked-out area it is only how far the nearest land is up
   or down that column -- two plain scans, no parabolas -- kept for the rows
   the texels' middles lie on; then the true transform along those rows
   alone.  The area runs FW px past the rectangle, more than WF_CAP, so any
   distance under the cap is the same whichever rectangle it is worked out
   in. */
const EDT_FAR = 1e20;
function edt1(f, n, d, v, z) {
  let k = 0;
  v[0] = 0; z[0] = -EDT_FAR; z[1] = EDT_FAR;
  for (let q = 1; q < n; q++) {
    const fq = f[q] + q * q;
    let s = (fq - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = (fq - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = EDT_FAR;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const r = q - v[k];
    d[q] = r * r + f[v[k]];
  }
}
function shoreDistances(omat, OEW, OEH, water, FW, K, RW, RH) {
  const h = K >> 1, FAR_ROW = 1 << 20;
  /* squared distance to the nearest land up or down its own column, at the
     texels' rows only */
  const col = new Float64Array(RH * OEW), up = new Int32Array(OEH);
  for (let x = 0; x < OEW; x++) {
    let last = -FAR_ROW;
    for (let y = 0; y < OEH; y++) { if (omat[y * OEW + x] !== water) last = y; up[y] = y - last; }
    let next = 2 * FAR_ROW;
    for (let y = OEH - 1; y >= 0; y--) {
      if (omat[y * OEW + x] !== water) next = y;
      const r = y - FW - h;
      if (r < 0 || r % K || r >= RH * K) continue;
      const dy = Math.min(up[y], next - y);
      col[(r / K) * OEW + x] = dy >= FAR_ROW ? EDT_FAR : dy * dy;
    }
  }
  const f = new Float64Array(OEW), dd = new Float64Array(OEW), v = new Int32Array(OEW), z = new Float64Array(OEW + 1);
  const out = new Float32Array(RW * RH);
  for (let fy = 0; fy < RH; fy++) {
    f.set(col.subarray(fy * OEW, fy * OEW + OEW));
    edt1(f, OEW, dd, v, z);
    for (let fx = 0; fx < RW; fx++) out[fy * RW + fx] = Math.sqrt(dd[FW + fx * K + h]);
  }
  return out;
}

/* v2.3.2947: can any two swatches that meet with an edge (edgeRecipe) lie
   within this art px rectangle, `M` cells more all round (the blur's reach)?
   A pure function of the cells, so every rectangle over a place answers the
   same, and the answer is cached a pair at a time. */
function edgesNear(bp, mm, x, y, w, h, M) {
  const S = bp.scale;
  const bx0 = Math.max(0, Math.floor((x - bp.x0) / S) - M), by0 = Math.max(0, Math.floor((y - bp.y0) / S) - M);
  const bx1 = Math.min(bp.w - 1, Math.floor((x + w - bp.x0) / S) + M), by1 = Math.min(bp.h - 1, Math.floor((y + h - bp.y0) / S) + M);
  const seen = [];
  for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) {
    const q = mm.mat[by * bp.w + bx];
    if (seen.includes(q)) continue;
    for (const o of seen) if (edgeBetween(mm, q, o)) return true;
    seen.push(q);
  }
  return false;
}
function edgeBetween(mm, a, b) {
  const memo = mm.__edge || (mm.__edge = new Int8Array(65536).fill(-1));
  const k = a * 256 + b;
  if (memo[k] < 0) memo[k] = memo[b * 256 + a] = a !== mm.water && b !== mm.water && edgeRecipe(mm.catalog[a], mm.catalog[b]) ? 1 : 0;
  return memo[k] === 1;
}

/* v2.3.2947: an edge-pieces picture's pieces: every clump of solid pixels
   (4-connected) wholly inside the picture and not a crumb, with its box,
   its centre and its number in `id` (one byte a pixel, 0 = none).  Worked
   out once a picture. */
export function pieceMap(tile) {
  if (tile.__pieces) return tile.__pieces;
  const T = tile.w, H = tile.h, N = T * H;
  const solid = (k) => (tile.idx ? tile.idx[k] !== EDGE_CLEAR : tile.data[k * 4 + 3] >= 128);
  const id = new Uint8Array(N), seen = new Uint8Array(N), stack = new Int32Array(N);
  const pieces = [];
  let max = 0;
  for (let k0 = 0; k0 < N; k0++) {
    if (seen[k0] || !solid(k0)) continue;
    let sp = 0, cnt = 0, sx = 0, sy = 0, x0 = T, y0 = H, x1 = -1, y1 = -1, edge = false;
    stack[sp++] = k0; seen[k0] = 1;
    const members = [];
    while (sp) {
      const k = stack[--sp], x = k % T, y = (k - x) / T;
      members.push(k); cnt++; sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x === 0 || y === 0 || x === T - 1 || y === H - 1) edge = true;
      if (x > 0 && !seen[k - 1] && solid(k - 1)) { seen[k - 1] = 1; stack[sp++] = k - 1; }
      if (x < T - 1 && !seen[k + 1] && solid(k + 1)) { seen[k + 1] = 1; stack[sp++] = k + 1; }
      if (y > 0 && !seen[k - T] && solid(k - T)) { seen[k - T] = 1; stack[sp++] = k - T; }
      if (y < H - 1 && !seen[k + T] && solid(k + T)) { seen[k + T] = 1; stack[sp++] = k + T; }
    }
    /* cut by the picture's edge, a crumb, or not a piece at all (a sheet) */
    if (edge || cnt < EDGE_BIT || x1 - x0 >= EDGE_PIECE_MAX || y1 - y0 >= EDGE_PIECE_MAX || pieces.length >= 254) continue;
    const n = pieces.length + 1;
    for (const k of members) id[k] = n;
    pieces.push({ n, x0, y0, x1, y1, cx: sx / cnt, cy: sy / cnt, size: cnt });
    max = Math.max(max, x1 - x0 + 1, y1 - y0 + 1);
  }
  tile.__pieces = { id, pieces, max };
  return tile.__pieces;
}

/* v2.3.2947: how far every cell of a `w` x `h` label map is from the
   nearest cell labelled `l` -- 3 a step across, 4 a step corner to corner
   (a chamfer distance: within 8% of the true one, in whole numbers, so it
   comes out the same to the last bit whichever rectangle it is worked out
   in).  Two passes, as Borgefors (1986). */
function chamfer34(lab, w, h, l) {
  const n = w * h, BIG = 60000;
  const D = new Uint16Array(n);
  for (let i = 0; i < n; i++) D[i] = lab[i] === l ? 0 : BIG;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    let v = D[i];
    if (!v) continue;
    if (x > 0 && D[i - 1] + 3 < v) v = D[i - 1] + 3;
    if (y > 0) {
      if (D[i - w] + 3 < v) v = D[i - w] + 3;
      if (x > 0 && D[i - w - 1] + 4 < v) v = D[i - w - 1] + 4;
      if (x < w - 1 && D[i - w + 1] + 4 < v) v = D[i - w + 1] + 4;
    }
    D[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    let v = D[i];
    if (!v) continue;
    if (x < w - 1 && D[i + 1] + 3 < v) v = D[i + 1] + 3;
    if (y < h - 1) {
      if (D[i + w] + 3 < v) v = D[i + w] + 3;
      if (x < w - 1 && D[i + w + 1] + 4 < v) v = D[i + w + 1] + 4;
      if (x > 0 && D[i + w - 1] + 4 < v) v = D[i + w - 1] + 4;
    }
    D[i] = v;
  }
  return D;
}

/* v2.3.2947: how high a swatch's pixel stands, 0 (lowest) to 1: its
   brightness, ranked within its own picture, so every picture's highest
   pixels are 1 whatever its colours -- the lit tips of grass blades, a
   pebble's top, a snow lump -- and averaged a little with the pixels two
   either side, so whole tufts stand rather than single pixels.  A swatch
   not made yet stands on noise, so its edge is ragged all the same. */
function heightLut(tile) {
  if (tile.__heights) return tile.__heights;
  const n = tile.w * tile.h, step = n > 65536 ? 7 : 1;
  let lut;
  if (tile.idx) {
    const P = tile.pal.length / 3, cnt = new Float64Array(P);
    for (let k = 0; k < n; k += step) cnt[tile.idx[k]]++;
    const lum = (q) => tile.pal[q * 3] * 2 + tile.pal[q * 3 + 1] * 5 + tile.pal[q * 3 + 2];
    const order = [...Array(P).keys()].sort((a, b) => lum(a) - lum(b) || a - b);
    let tot = 0;
    for (let q = 0; q < P; q++) tot += cnt[q];
    lut = new Float32Array(P);
    let run = 0;
    for (const q of order) { lut[q] = (run + cnt[q] / 2) / Math.max(1, tot); run += cnt[q]; }
  } else {
    const d = tile.data, cnt = new Float64Array(256);
    let tot = 0;
    for (let k = 0; k < n; k += step) { const o = k * 4; cnt[(d[o] * 2 + d[o + 1] * 5 + d[o + 2]) >> 3]++; tot++; }
    lut = new Float32Array(256);
    let run = 0;
    for (let v = 0; v < 256; v++) { lut[v] = (run + cnt[v] / 2) / Math.max(1, tot); run += cnt[v]; }
  }
  tile.__heights = lut;
  return lut;
}
/* (v2.3.2952: the five reads written out, not a small function made on
   every call -- a blend's wider zone reads twice as many heights, and the
   one made per call was most of their cost; the same sums in the same
   order, so the same answers to the bit) */
function heightAt(tile, q, aox, aoy, seed) {
  if (!tile) return 0.5 + 0.5 * valueNoise(aox / 5 + q * 3.7, aoy / 5 - q * 1.3, seed + 53);
  const lut = tile.__heights || heightLut(tile), T = tile.w;
  /* (a picture a power of two across -- every swatch -- wraps with a mask:
     the same numbers as the remainder, whole px, either side of zero) */
  const m = (T & (T - 1)) === 0 ? T - 1 : -1;
  const u = m >= 0 ? aox & m : ((aox % T) + T) % T, v = m >= 0 ? aoy & m : ((aoy % T) + T) % T;
  const u1 = m >= 0 ? (u + 2) & m : u + 2 < T ? u + 2 : u + 2 - T, u0 = m >= 0 ? (u - 2) & m : u >= 2 ? u - 2 : u - 2 + T;
  const v1 = m >= 0 ? (v + 2) & m : v + 2 < T ? v + 2 : v + 2 - T, v0 = m >= 0 ? (v - 2) & m : v >= 2 ? v - 2 : v - 2 + T;
  const r = v * T, idx = tile.idx;
  let h;
  if (idx) h = (2 * lut[idx[r + u]] + lut[idx[r + u1]] + lut[idx[r + u0]] + lut[idx[v1 * T + u]] + lut[idx[v0 * T + u]]) / 6;
  else {
    const d = tile.data;
    let o = (r + u) * 4;
    const a0 = lut[(d[o] * 2 + d[o + 1] * 5 + d[o + 2]) >> 3];
    o = (r + u1) * 4;
    const a1 = lut[(d[o] * 2 + d[o + 1] * 5 + d[o + 2]) >> 3];
    o = (r + u0) * 4;
    const a2 = lut[(d[o] * 2 + d[o + 1] * 5 + d[o + 2]) >> 3];
    o = (v1 * T + u) * 4;
    const a3 = lut[(d[o] * 2 + d[o + 1] * 5 + d[o + 2]) >> 3];
    o = (v0 * T + u) * 4;
    const a4 = lut[(d[o] * 2 + d[o + 1] * 5 + d[o + 2]) >> 3];
    h = (2 * a0 + a1 + a2 + a3 + a4) / 6;
  }
  return Math.min(1, Math.max(0, 0.5 + (h - 0.5) * 1.5));
}

/* The whole map, one pixel per cell: each swatch in `means[id]` (its
   picture's average colour) once made, else in its plan colour dimmed --
   so the map fills in as the swatches come in. */
export function groundOverview(plan, bp, mm, means = {}) {
  const out = new Uint8ClampedArray(bp.w * bp.h * 4);
  const cols = mm.ids.map((id, q) => {
    if (q === mm.water) return [22, 44, 70];
    if (means[id]) return means[id];
    return shade(mm.catalog[q].color, 0.55);
  });
  for (let i = 0; i < bp.w * bp.h; i++) {
    const c = cols[mm.mat[i]], o = i * 4;
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
  }
  return out;
}

/* ── where grounds meet (v2.3.2947) ── */

/* Every pair of swatches that touch on the map, with how much edge they
   share (in cell sides, a cell being 24 game px), which lies over which
   (edgeRecipe, null where the edge is crisp) and the place along it nearest
   the middle of the Wheel -- for the Ground Studio to say which edges
   matter most and to show one. */
export function groundContacts(plan, bp, mm) {
  const g = gridInfo(plan);
  const W = bp.w, H = bp.h, pairs = new Map();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, a = mm.mat[i];
    for (let d = 0; d < 2; d++) {
      const j = d ? i + W : i + 1;
      if (d ? y + 1 >= H : x + 1 >= W) continue;
      const b = mm.mat[j];
      if (a === b) continue;
      const lo = Math.min(a, b), hi = Math.max(a, b), key = lo * 256 + hi;
      let e = pairs.get(key);
      if (!e) { e = { a: mm.ids[lo], b: mm.ids[hi], n: 0, at: null, best: Infinity }; pairs.set(key, e); }
      e.n++;
      const ax = bp.x0 + (x + (d ? 0.5 : 1)) * bp.scale, ay = bp.y0 + (y + (d ? 1 : 0.5)) * bp.scale;
      const r = (ax - g.cx) * (ax - g.cx) + (ay - g.cy) * (ay - g.cy);
      if (r < e.best) { e.best = r; e.at = { x: ax, y: ay }; }
    }
  }
  const byId = Object.create(null);
  for (const e of mm.catalog) byId[e.id] = e;
  return [...pairs.values()].map((e) => ({ a: e.a, b: e.b, n: e.n, at: e.at, recipe: edgeRecipe(byId[e.a], byId[e.b]) }))
    .sort((p, q) => q.n - p.n || (p.a + p.b < q.a + q.b ? -1 : 1));
}

/* ── for the game (v2.3.2943) ── */

/* Every swatch the ground of `rect` (art px) can use: the cells under it and
   six more all round, more than composeGround's blur and noise reach, so a
   caller that unpacks exactly these has every picture the composer asks for. */
export function swatchesUnder(bp, mm, rect) {
  const sc = bp.scale, M = 6;
  const x0 = Math.max(0, Math.floor((rect.x - bp.x0) / sc) - M), y0 = Math.max(0, Math.floor((rect.y - bp.y0) / sc) - M);
  const x1 = Math.min(bp.w - 1, Math.ceil((rect.x + rect.w - bp.x0) / sc) + M), y1 = Math.min(bp.h - 1, Math.ceil((rect.y + rect.h - bp.y0) / sc) + M);
  const ids = new Set();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ids.add(mm.ids[mm.mat[y * bp.w + x]]);
  /* v2.3.2980: water under it needs the water's pictures (waterLook) */
  if (ids.has(WATER)) for (const id of WATER_SWATCHES) ids.add(id);
  return ids;
}

/* Where you cannot walk: one bit a blueprint cell (row by row, bit k of byte
   k >> 3), set where the water's share of the ground is at least half -- the
   same blurred share composeGround draws the shore from, so the line you are
   stopped at is the line you see, give or take its noise (about half a cell,
   12 game px).  A river one cell wide is never drawn (the land's share wins
   everywhere along it), and so is not a wall either. */
export function walkBits(bp, mm) {
  const w = bp.w, h = bp.h, n = w * h;
  const f = new Float32Array(n);
  for (let i = 0; i < n; i++) f[i] = mm.mat[i] === mm.water ? 1 : 0;
  blur1(f, w, h, 1);
  blur1(f, w, h, 1);
  const bits = new Uint8Array((n + 7) >> 3);
  /* v2.3.2945: a built cell -- a bridge, a boardwalk -- is always open: it is
     laid over the water, and a one-cell bridge across a wide river sat in a
     share of water well over half */
  for (let i = 0; i < n; i++) if (f[i] >= 0.5 && !(mm.built && mm.built[mm.mat[i]])) bits[i >> 3] |= 1 << (i & 7);
  return bits;
}

/* ═══ v2.3.3003: WHERE YOU CAN SWIM ═══
   Owner: "add swimming and just use the characters head poking out of the
   water plus code effects to make it look like swimming and change the
   movement behavior".  One bit a blueprint cell, set on the cells walkBits
   stops you at that you may swim in instead:
     - every river, pond, lake and oasis -- the FRESH water;
     - the sea's SHALLOWS, the shelf waterLook draws in the lighter blue,
       worked out the same way at each cell's middle: the shore's distance
       (cells, capped at SHORE_CAP; land and fresh water count as shore)
       plus SHALLOW_WANDER of the same noise, against SHALLOW_CELLS, with
       composeGround's seed -- so you swim out to the line you see;
     - and a land cell walkBits counts as water (the shore's blur): the
       foam at the water's edge.
   The OPEN SEA past the shelf stays a wall.  It is what keeps the spokes
   apart, and swimming across it would pass every pass and gate the plan
   lays.  `walk` is walkBits' answer when the caller has it already; `seed`
   is (plan.seed | 0) + 900, composeGround's. */
export function swimBits(bp, mm, seed, walk) {
  const w = bp.w, h = bp.h, n = w * h, S = bp.scale, water = mm.water, mat = mm.mat, fresh = mm.fresh;
  const blocked = walk || walkBits(bp, mm);
  /* every cell's distance to the nearest that is not open sea, as
     shoreSampler works it out round a rectangle -- here for the whole map,
     once (two sweeps, ~13 MB for a moment) */
  const D = new Float32Array(n);
  const FAR = 1e6, DG = Math.SQRT2;
  for (let i = 0; i < n; i++) D[i] = mat[i] !== water || (fresh[i >> 3] >> (i & 7)) & 1 ? 0 : FAR;
  /* (only distances under SHORE_CAP matter, so a sweep stops carrying one
     past it -- most of the map is open sea and is left at FAR) */
  const CAP = SHORE_CAP + 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    let v = D[i];
    if (v === 0) continue;
    let u;
    if (x > 0 && (u = D[i - 1] + 1) < v) v = u;
    if (y > 0) {
      if ((u = D[i - w] + 1) < v) v = u;
      if (x > 0 && (u = D[i - w - 1] + DG) < v) v = u;
      if (x < w - 1 && (u = D[i - w + 1] + DG) < v) v = u;
    }
    D[i] = v < CAP ? v : FAR;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    let v = D[i];
    if (v === 0) continue;
    let u;
    if (x < w - 1 && (u = D[i + 1] + 1) < v) v = u;
    if (y < h - 1) {
      if ((u = D[i + w] + 1) < v) v = u;
      if (x < w - 1 && (u = D[i + w + 1] + DG) < v) v = u;
      if (x > 0 && (u = D[i + w - 1] + DG) < v) v = u;
    }
    D[i] = v < CAP ? v : FAR;
  }
  const bits = new Uint8Array((n + 7) >> 3);
  /* the noise can move the line SHALLOW_WANDER either way, so nearer than
     SHALLOW_CELLS - SHALLOW_WANDER is always shallows and SHALLOW_CELLS +
     SHALLOW_WANDER or more never: only the band between asks the noise */
  const SURE = SHALLOW_CELLS - SHALLOW_WANDER, NEVER = SHALLOW_CELLS + SHALLOW_WANDER;
  for (let i = 0; i < n; i++) {
    if (!(blocked[i >> 3] & (1 << (i & 7)))) continue;
    const d = Math.min(SHORE_CAP, D[i]);
    let ok = d < SURE;
    if (!ok && d < NEVER) {
      const ax = bp.x0 + ((i % w) + 0.5) * S, ay = bp.y0 + (((i / w) | 0) + 0.5) * S;
      const nz = valueNoise(ax * 0.0045, ay * 0.0045, seed + 47) * 0.7 + valueNoise(ax * 0.03, ay * 0.03, seed + 53) * 0.3;
      ok = d + SHALLOW_WANDER * nz < SHALLOW_CELLS;
    }
    if (ok) bits[i >> 3] |= 1 << (i & 7);
  }
  return bits;
}

/* The whole map, one pixel per `k` x `k` cells, in the plan's own colours
   and the deep sea: the game's blurry underlay for ground still being laid,
   and its Map panel.  RGBA. */
export function overviewPixels(bp, mm, k = 4) {
  const w = Math.ceil(bp.w / k), h = Math.ceil(bp.h / k);
  const cols = mm.ids.map((id, q) => (q === mm.water ? WATER_RGB.deep : mm.catalog[q].color));
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const by = Math.min(bp.h - 1, y * k + (k >> 1));
    for (let x = 0; x < w; x++) {
      const bx = Math.min(bp.w - 1, x * k + (k >> 1));
      const c = cols[mm.mat[by * bp.w + bx]], o = (y * w + x) * 4;
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    }
  }
  return { w, h, data };
}
