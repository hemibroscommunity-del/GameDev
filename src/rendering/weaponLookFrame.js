/* ═══ v2.3.5002: THE SWING'S BLADE AND THE BOW'S DRAW FROM THE COLOUR NUMBERS ═══
 *
 * The owner, 2026-11-12: "Do armor and weapons as 256 color pictures."  The
 * armour is done (gearLookFrame.js, gearWalkFrame.js); this is the weapons'
 * first slice.  The blade the sword's swing lays over its stand-in body and
 * the bow its draw lays over its own were eight RGBA strips, 6.2 MB in the
 * page and on the graphics chip once drawn (docs/specs/pictures-256.md §11);
 * here they are the `weapons` look set (lookSets/weapons.js, baked by
 * tools/art/role-bake.mjs --set weapons): a byte a pixel, each sheet within
 * the 16-level bar of 256 colours (the bow's exact: its art is on 61 colours
 * at most).  The metals are the same art under the sprite tint (weaponTint),
 * which the look program applies as it applies every tint; the steel's shine
 * is the look program's shine form (lookPalette.js LOOK_SHEEN_BATCHER), which
 * glint.js asks for as before (swordWeaponSprite, a peer's sw.weapon).
 *
 * effectsRenderer.js _weaponStrip asks here first (weaponStripFrames): the
 * sheet's frames from the numbers where the look program and its shine are
 * built on this device; `'wait'` while the look sets still load behind the
 * loading screen (the RGBA strips are then never fetched: that is the memory
 * saved); null where the numbers are not drawn (`?weaponlook=0`, a Windows or
 * Mac computer, no WebGL2, a program that did not build, a sheet not baked):
 * the old strips, as before.  TRAPS §340: "not yet known" is never read as
 * "off" -- the answer is lookSheenState(), and null is waited on.
 *
 * Frames are asked for every time a strip is drawn, never kept: a look nobody
 * draws for 30 s lets its frames go (lookPalette.js sweep).
 */
import { registerLookSheets, getLookPartFrames, lookHas, lookSheenOn, lookSheenState, lookPaletteWanted, lookSetsSettled, preloadLookSheets } from './lookPalette.js';

const _wanted = (() => { try { return !/(^|[?&])weaponlook=0(&|$)/.test(window.location.search || ''); } catch (e) { return true; } })();
/* its own load, when this module came after the loading screen began
   (registerLookSheets then loads it apart: weaponLookDecided waits) */
const _reg = _wanted ? registerLookSheets('weapons', '/sprites/look/weapons/roles.json') : Promise.resolve(false);

const _stats = { looked: 0, old: 0, waited: 0 };
const WAIT_MS = 60000;
let _waitFrom = 0;
const ENTRIES = [];   /* no roles: the art as drawn (`asDrawn`) */
/* the one shared row of nothing the armour draws with (gearLookFrame.js,
   gearWalkFrame.js): a look is a row, and a row of no colours is the same
   row whatever set's sheet is drawn in it */
const OPTS = { key: 'gear', asDrawn: true };

/** The weapons' numbers are asked for on this device (the switches): where
 *  not, the old strips load as they always did, at once. */
export function weaponLookWanted() {
  return _wanted && lookPaletteWanted();
}

/** The weapons' numbers are drawn on this device (the switch, the program
 *  with the shine, the set in). */
export function weaponLookOn() {
  return _wanted && lookSheenOn();
}

/**
 * Whether the weapons ARE drawn from the numbers, once the look sets the
 * loading screen loads are in: true, false (the old strips: the look
 * program's shine did not build here, or the set is not in), or null at once
 * where the numbers were never asked for (the old strips were loaded as they
 * always were).  effectsRenderer.js loads the old strips on false, still
 * behind the loading screen (the preloading law).
 */
export function weaponLookDecided() {
  if (!weaponLookWanted()) return Promise.resolve(null);
  /* and the shine form's answer, which is null until the look program is
     built (a renderer and a sheet): read as off, it would load the RGBA
     strips for nothing (TRAPS §340) */
  const known = async () => {
    for (let i = 0; i < 240; i++) {
      if (lookSheenState() !== null) return;
      await new Promise((r) => setTimeout(r, 250));
    }
  };
  return Promise.all([preloadLookSheets(), _reg]).then(known).then(() => weaponLookOn() && lookHas('weapons', 'swing-south') && lookHas('weapons', 'bowshot-south'), () => false);
}

/**
 * A weapon strip's frames from the numbers, 'wait', or null (the old strip).
 * `pose` swing | bowshot; `dir` the strip's facing (the cfg's key: the swing
 * south, east, north; the bow east, southwest, south, northwest, north).
 */
export function weaponStripFrames(pose, dir) {
  if (!weaponLookWanted()) return null;
  const sheet = pose + '-' + dir;
  /* behind the loading screen, the sets load: wait for them rather than
     fetch the RGBA strip the numbers replace -- and for the look program's
     shine to be built, whose answer is null until then.  A page where either
     never comes gives up waiting after a minute and draws the old strip,
     never no blade */
  const sheen = lookSetsSettled() ? lookSheenState() : null;
  if (sheen === null) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!_waitFrom) _waitFrom = now;
    if (now - _waitFrom < WAIT_MS) { _stats.waited++; return 'wait'; }
    _stats.old++;
    return null;
  }
  if (sheen !== true || !lookHas('weapons', sheet)) { _stats.old++; return null; }
  const list = getLookPartFrames('weapons', sheet, ENTRIES, OPTS);
  if (!list || !list.length) { _stats.old++; return null; }
  _stats.looked++;
  return list;
}

if (typeof window !== 'undefined') {
  window.__btWeaponLook = () => ({ wanted: _wanted, on: weaponLookOn(), settled: lookSetsSettled(), ..._stats });
}
