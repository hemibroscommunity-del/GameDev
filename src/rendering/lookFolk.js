/* ═══ v2.3.3809: THE TOWNSFOLK DRAWN LIVE FROM THEIR LOOKS ═══
 *
 * Every townsperson is a bro from the character creator (src/data/
 * npcLooks.js), and was drawn from PHOTOGRAPHS of one (tools/qa/
 * npc-looks.mjs): a picture of each, cropped, about 2.9 MB in the Wheel's
 * BroTown (npcSprites.js loadWheelNpcArt).  With the look palette on
 * (lookPalette.js), the game already holds every piece he wears ONCE, shared
 * with every player: the body, the printed tee, the hair, hats, beards and
 * glasses.  So he is drawn as another player is (entityRenderer _updateNPCs:
 * the same calls dress him), and his photographs are not loaded.
 *
 * ON by default (the owner's rule for the memory work).  `?lookfolk=0` for
 * one phone, or the Test panel's "Townsfolk drawn live" off for every phone
 * (game/clientOff.js `lookfolk`), live: he is drawn from his photographs
 * again, loaded then (npcSprites.js) -- the switch's own load, not one of
 * play.  With the look palette itself off or unable (no WebGL2), the
 * photographs, as before.
 *
 * Probe: window.__btLookFolk(). */
import { clientOff, clientOffAtLoad } from '../game/clientOff.js';
import { lookPaletteWanted, lookPaletteOn } from './lookPalette.js';
import { paletteRendererOf } from './paletteTex.js';

const _wanted = (() => { try { return !/(^|[?&])lookfolk=0(&|$)/.test(window.location.search || ''); } catch (e) { return true; } })();

const _stats = { photosSkipped: false, photosLate: 0 };
/* QA only (mp-lookfolk's facings): every townsperson drawn live turned this way */
let _face = null;
/** The facing QA turned the townsfolk to, or null (their own). */
export function folkFaceOverride() { return _face; }

/** Drawn live this frame: wanted, the look palette drawing, not switched off. */
export function lookFolkOn() {
  return _wanted && !clientOff('lookfolk') && lookPaletteOn();
}

/** As the world loads: will the townsfolk be drawn live, so their
 *  photographs need not be loaded?  The last word this phone heard of both
 *  switches (clientOffAtLoad), the address, and a WebGL2 renderer. */
export function lookFolkAtLoad() {
  if (!_wanted || !lookPaletteWanted() || clientOffAtLoad('lookfolk') || clientOffAtLoad('lookpalette')) return false;
  const r = paletteRendererOf();
  return !!(r && r.context && r.context.webGLVersion === 2);
}

/** npcSprites.js: the photographs were left out at load (true), or loaded. */
export function noteFolkPhotos(skipped) { _stats.photosSkipped = !!skipped; }
/** npcSprites.js: the photographs loaded after the world did (the switch). */
export function noteFolkPhotosLate() { _stats.photosLate++; }

if (typeof window !== 'undefined') {
  window.__btLookFolk = () => ({ wanted: _wanted, on: lookFolkOn(), atLoad: lookFolkAtLoad(), face: _face, ..._stats });
  /* on a QA page only: turn them (a facing's name, or null for their own) */
  if (window.__btProbe) window.__btLookFolkFace = (dir) => { _face = typeof dir === 'string' ? dir : null; return _face; };
}
