/* ═══ v2.3.3751: A SHIRT FRAME FROM THE NUMBERS (the look palette's shirt part) ═══
 * The game side of lookShirt.js: the tee's stand and jog sheets kept once as
 * colour numbers (public/sprites/look/shirt/, tools/art/shirt-bake.mjs), and a
 * frame of them in a look -- its tint, pattern and print in the look's row.
 * gearSheets.getShirtLookFrame's copy per player is what this replaces; the
 * caller (entityRenderer _placeGear) falls back to it, and to the plain sheet,
 * whenever this answers null.  docs/specs/look-shirts.md. */
import { registerLookSheets, registerLookKind, getLookPartFrame, lookHas, lookPaletteWanted } from './lookPalette.js';
import { shirtRowEntries, SHIRT_GLSL, SHIRT_TILE_MAX } from './lookShirt.js';
import { artHash, sideForDir } from './traits/playerArt.js';
import { getGearFrame, getShirtLookFrame, gearSheetLoad } from './gearSheets.js';
import { parsePattern } from './traits/patternCatalog.js';
import { installShirtProbe } from './lookShirtProbe.js';

/* `?lookshirt=0`: the tee the old way, the rest of the look palette as it is
   (for comparing the shirt part alone) */
const _wanted = (() => { try { return !/(^|[?&])lookshirt=0(&|$)/.test(window.location.search || ''); } catch (e) { return true; } })();

/* behind the loading screen with the body's sheets (preloadLookSheets) */
registerLookSheets('shirt', '/sprites/look/shirt/roles.json');
registerLookKind('shirt', SHIRT_GLSL);   /* the print, the tile and the tint, per texel */

/* a dressing's entries of the row, kept by its own short key: a printed tee is
   ~55 entries, and the look's key is made from them every frame otherwise */
const _dress = new Map();
const DRESS_CAP = 64;
/* a drawing's hash by the drawing (the same string every frame: a Map hit,
   not a 256-character hash a player a frame) */
const _hashes = new Map();
function hashOf(art) {
  let h = _hashes.get(art);
  if (h === undefined) {
    if (_hashes.size >= DRESS_CAP) _hashes.delete(_hashes.keys().next().value);
    h = artHash(art);
    _hashes.set(art, h);
  }
  return h;
}
function dressOf(tint, pattern, art) {
  const key = 's' + (tint ? tint[0] + ',' + tint[1] + ',' + tint[2] : '-') + '/' + (pattern ? pattern.id + ':' + pattern.colorIdx : '-') + '/' + (art ? hashOf(art) : '-');
  let d = _dress.get(key);
  if (d) return d;
  const row = shirtRowEntries(tint, pattern, art);
  const entries = [];
  for (let e = 8; e < 256; e++) {
    const o = e * 4;
    if (row[o] | row[o + 1] | row[o + 2] | row[o + 3]) entries.push([e, [row[o], row[o + 1], row[o + 2], row[o + 3]]]);
  }
  d = { key, entries };
  if (_dress.size >= DRESS_CAP) _dress.delete(_dress.keys().next().value);
  _dress.set(key, d);
  return d;
}

/**
 * The tee's frame from the numbers, dressed, or null (the old path draws it).
 * `look` is _placeGear's: { art (this side's drawing or null), pattern
 * (parsePattern's), tint ([r, g, b] or null), mirror }.  `plain` asks for an
 * undressed tee too (only worth it when the body beside it is drawn from the
 * numbers: one batch; a plain tee is a shared sheet and a sprite tint either
 * way).  Drawn UNTINTED: the tint is in the row.
 */
export function getLookShirtFrame(item, pose, dir, frameIdx, look, plain) {
  if (!_wanted || !lookPaletteWanted() || item !== 'tshirt' || !look) return null;
  const dressed = !!(look.art || look.pattern);
  if (look.pattern && look.pattern.tile && look.pattern.tile.w * look.pattern.tile.h > SHIRT_TILE_MAX) return null;   /* its ink does not fit the row */
  if (!dressed && !(plain && look.tint)) return null;   /* white and plain: the shipped sheet as it is */
  const sheet = pose + '-' + dir;
  if (!lookHas('shirt', sheet)) return null;
  const d = dressOf(look.tint || null, look.pattern || null, look.art || null);
  return getLookPartFrame('shirt', sheet, frameIdx, d.entries, { key: d.key, mirror: dressed && !!look.mirror });
}

/* the shirt oracle's probe (mp-lookshirts), on a page that asks for it only */
try {
  if (typeof window !== 'undefined' && /(^|[?&])(lookpalette=1|lookprobe(=1)?)(&|$)/.test(window.location.search || '')) {
    installShirtProbe({ getGearFrame, getShirtLookFrame, getLookShirtFrame, parsePattern, sideForDir, preloadGearSheet: gearSheetLoad });
  }
} catch (e) { /* QA only */ }
/* QA probe, house style: the tee's sheets of numbers loaded, and the dressings kept */
if (typeof window !== 'undefined') {
  window.__btLookShirt = () => {
    let sheets = 0;
    for (const pose of ['stand', 'jog']) for (const dir of ['east', 'north', 'northeast', 'south', 'southwest']) if (lookHas('shirt', pose + '-' + dir)) sheets++;
    return { sheets, dressings: _dress.size };
  };
}
