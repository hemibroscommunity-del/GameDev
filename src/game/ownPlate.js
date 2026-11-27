/* ═══ v2.3.6788: YOUR OWN NAME PLATE, GONE WHILE THE HUD SAYS IT (card UI3, PR 9) ═══
 *
 * The owner, 2026-11-26, after trying the character HUD at the top left
 * (card UI3 PR 2: your face, your name, "Lv N", the weapon bar): "I actually
 * like the hud you built too." and "Also remove the name plate on your bro
 * (now that it's already on hud it's redundant)".
 *
 * So on YOUR OWN screen the plate over YOUR OWN bro (its name, alliance tag,
 * level circle and verified badge: one capsule, entityRenderer.js
 * _attachNamePill) is not drawn while the HUD shows your name.  Everyone
 * else's plate, and yours on THEIR screens, are unchanged: the rule answers
 * true for every figure that is not yours.  What tells a STATE the HUD does
 * not show stays over your bro: the HP bar in a fight (the plate's band, its
 * place unchanged), the threat skull over that band, the spend bars under
 * the feet, chat bubbles and damage numbers.
 *
 * ONE RULE, here, with no Pixi, so node tests it
 * (tools/guards/own-plate.test.mjs); the renderer asks selfNameDrawn() and
 * builds or DESTROYS the plate only when the answer changes (a Text that is
 * gone is destroyed, TRAPS §192; no structural change every frame in the
 * big layers, TRAPS §218).  The HUD's "is it showing" is ITS rule
 * (charHud.js charHudOn), read, never restated.
 *
 * THE SWITCH.  `?ownplate=1` gives your plate back on this device and is
 * remembered (the HUD's own switch's way, `?hud=0`); `?ownplate=0` forgets.
 * Off is the default.  Under `?hud=0` (the old top left, no name there) your
 * plate is drawn as before whatever this switch says.
 */
import { charHudOn } from './charHud.js';
import { pageAddress, readerFor, swValue } from './switches.js';

/* the switch's memory on this device (`?ownplate=1` remembered; `=0` forgets) */
export const OWN_PLATE_KEY = 'bt_ownplate';

/** Is your own plate asked back on this device?  `?ownplate=1` yes, and
 *  remembered under OWN_PLATE_KEY ('1'); `?ownplate=0` forgets; no otherwise.
 *  `search` and `store` are for tests. */
export function ownPlateWanted(search, store) {
  const v = search == null ? swValue('ownplate') : readerFor(search).swValue('ownplate');
  let ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  if (v === '0' || v === '1') {
    try { if (ls) { if (v === '1') ls.setItem(OWN_PLATE_KEY, '1'); else ls.removeItem(OWN_PLATE_KEY); } } catch (e) { /* the address still decides this visit */ }
    return v === '1';
  }
  try { return !!(ls && ls.getItem(OWN_PLATE_KEY) === '1'); } catch (e) { return false; }
}

/* how many times the rule has been asked (the renderer's "never per frame",
   read by the suite and by mp-ownplate through the QA probe) */
let _asks = 0;

/** THE RULE: is this figure's name plate drawn on this screen?
 *  `self` it is the player holding this phone; `hudOn` the character HUD is
 *  showing (charHudOn); `ownPlate` the switch (ownPlateWanted). */
export function nameDrawn({ self, hudOn, ownPlate } = {}) {
  _asks++;
  if (!self) return true;
  if (!hudOn) return true;
  return !!ownPlate;
}

/** How many times nameDrawn has been asked on this page. */
export function nameDrawnAsks() { return _asks; }

/* the page's answer, asked again only when its address changes */
let _for = null;
let _drawn = true;
/** The page's: is YOUR plate drawn?  A string compare an ask; the rule only
 *  when the address changed (a switch flipped by replaceState counts). */
export function selfNameDrawn() {
  const s = pageAddress();
  if (_for !== s) {
    _for = s;
    _drawn = nameDrawn({ self: true, hudOn: charHudOn(), ownPlate: ownPlateWanted(s) });
  }
  return _drawn;
}
