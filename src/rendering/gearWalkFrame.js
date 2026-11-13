/* ═══ v2.3.4999: THE WALKING ARMOUR FROM THE COLOUR NUMBERS ═══
 *
 * The owner, 2026-11-12: "Do armor and weapons as 256 color pictures."  Slice
 * 2 (slice 1, the combat poses: gearLookFrame.js).  The chest plate and the
 * greaves standing, jogging, hit, rolling, mining, fishing and picking up,
 * and the full steel set's jog figure, were RGBA sheets the loading screen
 * sent to the graphics chip with a full mip chain (gearSheets.js,
 * uploadGearTextures); here they are drawn from the `gearwalk` look set
 * (lookSets/gearwalk.js, baked by tools/art/role-bake.mjs --set gearwalk): a
 * byte a texel, its first mip level read by the look program, the metal's
 * shine by its shine form (lookPalette.js LOOK_SHEEN_BATCHER).  The frames
 * keep _buildSheet's packed cells, so every placement that reads a frame's
 * orig, trim or anchor is unchanged.
 *
 * What keeps its RGBA: the masked bakes and the fishing grip read the chest's
 * and the greaves' pixels on the CPU (entityRenderer.js _frameInput,
 * _fishTopFrame), so gearSheets.js still loads those sheets behind the
 * loading screen; it no longer sends them to the chip (setGearDrawnElsewhere),
 * since nothing draws them there.
 *
 * gearDrawFrame is what a draw site asks: the numbers' frame; null while the
 * look sets load behind the loading screen (so nothing sends the RGBA sheet
 * to the chip by drawing it); the RGBA frame where the numbers are not drawn
 * (`?gearwalk=0`, a Windows or Mac computer, no WebGL2, the look program's
 * shine not built, a sheet not in the set).
 */
import { getLookPartFrames, lookHas, lookSheenOn, lookSheenState, lookPaletteWanted, lookSetsSettled, registerLookSheets, preloadLookSheets, whenLookKnown } from './lookPalette.js';
import { getGearFrame, getGearFramePhased, setGearDrawnElsewhere, setGearPreloadSkip } from './gearSheets.js';
import { gearArtSafe } from './gearVariants.js';

const _wanted = (() => { try { return !/(^|[?&])gearwalk=0(&|$)/.test(window.location.search || ''); } catch (e) { return true; } })();
/* v2.3.5000: its own load, when this module came after the loading screen
   began (registerLookSheets then loads it apart: gearWalkDecided waits) */
const _reg = _wanted ? registerLookSheets('gearwalk', '/sprites/look/gearwalk/roles.json') : Promise.resolve(false);

const SLOTS = new Set(['chest', 'legs', 'fullset']);
const _stats = { looked: 0, old: 0, waited: 0 };
const WAIT_MS = 60000;
let _waitFrom = 0;
const ENTRIES = [];   /* no roles: the art as drawn */
const OPTS = { key: 'gear', asDrawn: true };   /* one shared row of nothing with the combat armour */

/** The walking armour's numbers are drawn on this device. */
export function gearWalkOn() {
  return _wanted && lookSheenOn();
}

/* the sheet's frames, 'wait', or null (the RGBA sheet) */
function framesOf(slot, item, pose, dir) {
  if (!_wanted || !SLOTS.has(slot) || !lookPaletteWanted()) return null;
  const art = gearArtSafe(slot, item);
  if (!art) return null;
  /* behind the loading screen: wait for the sets, and for the look
     program's shine to be built (its answer is null until a renderer and a
     sheet exist), rather than draw -- and so send to the chip, for good --
     the RGBA sheet; a page where either never comes draws the RGBA after a
     minute, never no armour */
  const sheen = lookSetsSettled() ? lookSheenState() : null;
  if (sheen === null) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!_waitFrom) _waitFrom = now;
    if (now - _waitFrom < WAIT_MS) { _stats.waited++; return 'wait'; }
    return null;
  }
  const sheet = slot + '-' + pose + '-' + dir;
  if (sheen !== true || !lookHas('gearwalk', sheet)) return null;
  const list = getLookPartFrames('gearwalk', sheet, ENTRIES, OPTS);
  return list && list.length ? list : null;
}

/** A walking armour piece's frame to draw: the numbers', null (wait), or
 *  the RGBA sheet's (getGearFrame). */
export function gearDrawFrame(slot, item, pose, dir, frameIdx) {
  const L = framesOf(slot, item, pose, dir);
  if (L === 'wait') return null;
  if (L) { _stats.looked++; return L[((frameIdx % L.length) + L.length) % L.length]; }
  _stats.old++;
  return getGearFrame(slot, item, pose, dir, frameIdx);
}
/** ...by the jog's phase (the full set's figure: getGearFramePhased). */
export function gearDrawFramePhased(slot, item, pose, dir, phase) {
  const L = framesOf(slot, item, pose, dir);
  if (L === 'wait') return null;
  if (L) {
    _stats.looked++;
    const p = ((phase % 1) + 1) % 1;
    return L[Math.min(L.length - 1, Math.floor(p * L.length))];
  }
  _stats.old++;
  return getGearFramePhased(slot, item, pose, dir, phase);
}

/* gearSheets.js key 'slot/item/pose/dir': drawn from the numbers, so not
   sent to the chip (the RGBA stays for the CPU's readers) */
setGearDrawnElsewhere((key) => {
  /* not yet known counts as drawn from the numbers: a device where the
     shine is then not built sends the sheet at its first draw instead */
  if (!_wanted || !lookPaletteWanted() || lookSheenState() === false) return false;
  const p = key.split('/');
  return p.length === 4 && SLOTS.has(p[0]) && lookHas('gearwalk', p[0] + '-' + p[2] + '-' + p[3]);
});

/* ═══ v2.3.5000: AND THEIR RGBA IS NOT LOADED ═══
   The masked bakes and the fishing grip read these pieces' pixels from the
   numbers now (gearNumbers.js), so where the numbers are drawn nothing reads
   the RGBA sheets: gearSheets.js preloadGear / preloadFullsetFigures skip
   them, and load them after all, behind the loading screen, where it turns
   out the numbers are not drawn (gearWalkDecided false: the shine not built,
   the set failed). */
const SKIP = /^(?:(?:chest|legs)\/[^/]+\/(?:stand|jog|hit|dodge|mine|fish|pickup)|fullset\/steel\/jog)\//;
/** True once it is known the walking armour IS drawn from the numbers; false
 *  where it is not (or never asked for). */
export function gearWalkDecided() {
  if (!_wanted || !lookPaletteWanted()) return Promise.resolve(false);
  return Promise.all([preloadLookSheets(), _reg]).then(() => whenLookKnown())
    .then(() => gearWalkOn() && lookHas('gearwalk', 'chest-jog-east'), () => false);
}
setGearPreloadSkip((key) => _wanted && lookPaletteWanted() && SKIP.test(key), gearWalkDecided);

if (typeof window !== 'undefined') {
  window.__btGearWalk = () => ({ wanted: _wanted, on: gearWalkOn(), settled: lookSetsSettled(), ..._stats });
}
