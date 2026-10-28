/* ═══ v2.3.3751: A SHIRT FRAME FROM THE NUMBERS (the look palette's shirt part) ═══
 * The game side of lookShirt.js: the tee's stand and jog sheets kept once as
 * colour numbers (public/sprites/look/shirt/, tools/art/shirt-bake.mjs), and a
 * frame of them in a look -- its tint, pattern and print in the look's row.
 * gearSheets.getShirtLookFrame's copy per player is what this replaces; the
 * caller (entityRenderer _placeGear) falls back to it, and to the plain sheet,
 * whenever this answers null.  docs/specs/look-palette.md, "Shirts". */
import { registerLookSheets, getLookPartFrame, lookHas, lookPaletteWanted } from './lookPalette.js';
import { shirtRowEntries } from './lookShirt.js';
import { artHash, sideForDir } from './traits/playerArt.js';
import { getGearFrame, getShirtLookFrame, gearSheetLoad } from './gearSheets.js';
import { parsePattern } from './traits/patternCatalog.js';
import { installShirtProbe } from './lookShirtProbe.js';

/* behind the loading screen with the body's sheets (preloadLookSheets) */
registerLookSheets('shirt', '/sprites/look/shirt/roles.json');

/* a dressing's entries of the row, kept by its own short key: a printed tee is
   ~55 entries, and the look's key is made from them every frame otherwise */
const _dress = new Map();
const DRESS_CAP = 64;
function dressOf(tint, pattern, art) {
  const key = 's' + (tint ? tint.join(',') : '-') + '/' + (pattern ? pattern.id + ':' + pattern.colorIdx : '-') + '/' + (art ? artHash(art) : '-');
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
  if (!lookPaletteWanted() || item !== 'tshirt' || !look) return null;
  const dressed = !!(look.art || look.pattern);
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
