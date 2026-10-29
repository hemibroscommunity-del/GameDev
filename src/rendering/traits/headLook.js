/* ═══ v2.3.3753: A HEAD PIECE IN ITS COLOUR, FROM ONE SHARED SHEET OF NUMBERS ═══
 *
 * Phase 2 of the look palette (docs/specs/look-palette.md "Head pieces"), the
 * owner: "The game needs to be extremely memory efficient."  A hair, hat,
 * beard, pair of glasses or eye style in a colour was its own recoloured copy
 * of the piece's facings (recolorHairToCanvas: a whole 128 frame a facing,
 * ~430 KB on the graphics chip, up to twelve kept a category, made on first
 * sight).  Now every recolourable piece is kept ONCE as colour numbers (the
 * set 'heads', tools/art/head-bake.mjs; 0.82 MB for all 59, loaded behind the
 * loading screen), and a colour is one entry of a palette row, coloured by
 * the graphics chip as it draws (lookPalette.js):
 *   64 hair, 65 hat, 66 beard, 67 eyewear, 68 eye style (the manifest's `entry`).
 * A row is one (category, colour), so the rows in use are the colours on
 * screen, never the number of players.
 *
 * WHAT DOES NOT CHANGE: which pieces take a colour, and which pixels (the
 * catalogs still decide: each getColored*Textures asks here only after its
 * own checks); the placement (_placeTrait, the hair's clip, the flip's head
 * table); a piece in its own colours (the native art, as before).  Where the
 * numbers cannot draw it (`?lookpalette=0`, no WebGL2, the set not loaded, no
 * palette row free) the catalog makes its copy, exactly as before -- a piece
 * is never left without a picture.
 *
 * No piece waits on a bake any more: the numbers are in before the loading
 * screen lifts (headLookReady), so a colour shows at once for everyone.
 */
import { registerLookSheets, preloadLookSheets, lookManifest as setManifest, lookHas, getLookPartFrames } from '../lookPalette.js';

const SET = 'heads';
const URL = '/sprites/look/heads/roles.json';
registerLookSheets(SET, URL);
/* v2.3.3753 (M3's review): each sheet's facings and each category's entry from
   lookPalette.js's own copy of the manifest -- one fetch, not a second one
   here with its own cache key */
const lookManifest = () => setManifest(SET);

/* `${sheet}|r,g,b` -> { dir: Texture }, the same object every frame (filled
   again on each ask: getLookPartFrames is what keeps the look's row alive).
   v2.3.3753: CAPPED (CLAUDE.md §7, a cache has a cap).  Its bound is the
   catalogs' -- 59 pieces x their colours (12 hats, 13 hair, ...), ~700 small
   objects at the very most.  A crowd needs what it shows at once: 40 players
   each in five coloured pieces is 200 at worst, so MAPS_CAP is 256 (under it
   nothing is let go in a crowd and asked again every frame), the least
   recently asked going first.  A map holds no texture of its own
   (lookPalette.js owns and frees those), so one let go is made again on its
   next ask, at the cost of one small object. */
const MAPS_CAP = 256;
const _maps = new Map();
const _stats = { asked: 0, served: 0, fellBack: 0 };

let _forceOld = false;   /* the oracle's old-way draws (headLookProbe.js) */
/**
 * The facings of piece `id` of `cat` ('hair', 'headwear', 'facialhair',
 * 'eyewear', 'eyestyle') in `target` ([r, g, b]), drawn from the numbers --
 * or null: the caller makes its copy the old way.
 */
export function headLookTextures(cat, id, target) {
  if (!target || !id || _forceOld) return null;
  const m = lookManifest();
  if (!m) return null;
  const sheet = cat + '-' + id;
  const e = m.sheets[sheet];
  const entry = m.entry && m.entry[cat];
  if (!e || !entry || !lookHas(SET, sheet)) return null;
  _stats.asked++;
  const key = sheet + '|' + target[0] + ',' + target[1] + ',' + target[2];
  let map = _maps.get(key);
  if (map) _maps.delete(key);   /* re-inserted below: the newest */
  else {
    map = Object.create(null);
    if (_maps.size >= MAPS_CAP) _maps.delete(_maps.keys().next().value);
  }
  _maps.set(key, map);
  const list = getLookPartFrames(SET, sheet, [[entry, target]]);
  /* no row free (rowsFull): the old copy, whole -- never a piece drawn half
     one way and half the other */
  if (!list || list.length !== e.dirs.length) { _stats.fellBack++; _maps.delete(key); return null; }
  for (let i = 0; i < e.dirs.length; i++) map[e.dirs[i]] = list[i];
  _stats.served++;
  return map;
}

/** Settles once the head numbers are in (or will not be): the loading
 *  screen's colour waits (coloredHairReady...) ask this first, so the local
 *  player's colours are drawn from the numbers, never baked as copies. */
export function headLookReady() {
  return preloadLookSheets().catch(() => false);
}

/* the oracle (mp-lookheads), only when the address asks for it: `?lookprobe` */
try {
  if (typeof window !== 'undefined' && /[?&]lookprobe(=|&|$)/.test(window.location.search || '')) {
    import('./headLookProbe.js').then((P) => P.installHeadProbe({ forceOld: (v) => { _forceOld = !!v; } })).catch(() => {});
  }
} catch (e) { /* no probe */ }

/* QA probe, house style */
if (typeof window !== 'undefined') {
  window.__btHeadLook = () => {
    const m = lookManifest();
    return { loaded: !!m, pieces: m ? Object.keys(m.sheets).length : 0, maps: _maps.size, ..._stats };
  };
}
