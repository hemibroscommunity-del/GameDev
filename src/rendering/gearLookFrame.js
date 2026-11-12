/* ═══ v2.3.4998: THE COMBAT POSES' ARMOUR FROM THE COLOUR NUMBERS ═══
 *
 * The owner, 2026-11-12: "Do armor and weapons as 256 color pictures."  The
 * armour a figure wears in a swing, a bow's draw, a chop, the cook's stir, the
 * fire's lighting and the farmer's three poses was 42 RGBA strips on the
 * graphics chip, 13.9 MB at the memory check's fight (docs/specs/pictures-256.md
 * §1); here it is the `gear` look set (lookSets/gear.js, baked by
 * tools/art/role-bake.mjs --set gear): a byte a pixel, 4.26 MB with its tables,
 * each sheet within the 16-level bar of 256 colours.  Copper, iron and black
 * steel are the same art under a sprite tint, which the look program applies
 * as it applies every tint; the metal's shine is drawn by the look program
 * with the shine's own lines (lookPalette.js LOOK_SHEEN_BATCHER).
 *
 * effectsRenderer.js _gearStripFrame asks here first (gearStripFrames): the
 * sheet's frames from the numbers when the look program and its shine are
 * built on this device; `'wait'` while the look sets still load behind the
 * loading screen (the old RGBA strip is then never fetched: that is the
 * memory saved); null where the numbers are not drawn (`?gearlook=0`, a
 * Windows or Mac computer, no WebGL2, a program that did not build): the old
 * strip, as before.
 *
 * Frames are asked for every time a strip is drawn, never kept: a look nobody
 * draws for 30 s lets its frames go (lookPalette.js sweep).
 */
import { registerLookSheets, getLookPartFrames, lookHas, lookSheenOn, lookPaletteWanted, lookSetsSettled, preloadLookSheets } from './lookPalette.js';

const _wanted = (() => { try { return !/(^|[?&])gearlook=0(&|$)/.test(window.location.search || ''); } catch (e) { return true; } })();
if (_wanted) registerLookSheets('gear', '/sprites/look/gear/roles.json');

const _stats = { looked: 0, old: 0, waited: 0 };
const WAIT_MS = 60000;
let _waitFrom = 0;
const ENTRIES = [];   /* no roles: the art as drawn (`asDrawn`) */
const OPTS = { key: 'gear', asDrawn: true };

/** The armour's numbers are drawn on this device (the switch, the program
 *  with the shine, the set in). */
export function gearLookOn() {
  return _wanted && lookSheenOn();
}

/**
 * Whether the armour IS drawn from the numbers, once the look sets the loading
 * screen loads are in: true, false (the old strips: the look program's shine
 * did not build here, or the set failed), or null at once where the numbers
 * were never asked for (the old strips were warmed as they always were).
 * effectsRenderer.js warms the old strips again on false, still behind the
 * loading screen (the preloading law).
 */
export function gearLookDecided() {
  if (!_wanted || !lookPaletteWanted()) return Promise.resolve(null);
  return preloadLookSheets().then(() => gearLookOn() && lookHas('gear', 'chest-swing-east'), () => false);
}

/**
 * A combat strip's frames from the numbers, 'wait', or null (the old strip).
 * `slot` chest | legs | shirt; the art item already resolved (gearArtSafe:
 * copper's art is steel's).
 */
export function gearStripFrames(slot, item, pose, dir) {
  if (!_wanted || !lookPaletteWanted()) return null;
  const sheet = slot + '-' + pose + '-' + dir;
  if (!lookSetsSettled()) {
    /* behind the loading screen, the sets load: wait for them rather than
       fetch the RGBA strip the numbers replace.  A page whose look sets
       never load (none asked for them) gives up waiting after a minute, and
       draws the old strip, never no armour */
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!_waitFrom) _waitFrom = now;
    if (now - _waitFrom < WAIT_MS) { _stats.waited++; return 'wait'; }
    _stats.old++;
    return null;
  }
  if (!lookSheenOn() || !lookHas('gear', sheet)) { _stats.old++; return null; }
  const list = getLookPartFrames('gear', sheet, ENTRIES, OPTS);
  if (!list || !list.length) { _stats.old++; return null; }
  _stats.looked++;
  return list;
}

if (typeof window !== 'undefined') {
  window.__btGearLook = () => ({ wanted: _wanted, on: gearLookOn(), settled: lookSetsSettled(), ..._stats });
  /* the armour's oracle (mp-lookgear), on a page that asks for it only: its
     own chunk, never in the game's */
  try {
    if (/(^|[?&])lookprobe(=1)?(&|$)/.test(window.location.search || '')) {
      import('./gearLookProbe.js').then((m) => m.installGearProbe({ framesOf: (sheet) => getLookPartFrames('gear', sheet, ENTRIES, OPTS) }));
    }
  } catch (e) { /* QA only */ }
}
