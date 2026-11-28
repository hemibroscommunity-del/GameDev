/* ═══ v2.3.6860: `?menus3` -- THE OWNER'S NEW MENUS, ON; `?menus3=0` YESTERDAY'S GAME (card MN step 1) ═══
 *
 * The card's "The switch": ON by default from step 1, remembered; `?menus3=0`
 * gives the game exactly as it was the day before (the old Gear and Menu
 * buttons on the band's resting row, the old band, the old screens),
 * remembered until `?menus3=1`.  Its row: tools/guards/lib/switches.mjs.
 *
 * The new menus draw where the one band and its frame do (src/ui/oneBand.js,
 * src/ui/mobile/ui2Frame.js): under `?oneband=0` or `?ui2=0` the old layouts
 * keep their own ways and nothing here runs.  The phone tests written for the
 * old menus are pinned to `menus3=0` in ONE place (tools/qa/mp/harness.mjs). */
import { sw, swValue } from '../../game/switches.js';   /* relative: node's suites import this file */
import { ui2FrameOn } from '../mobile/ui2Frame.js';

const KEY = 'bt_menus3';
let _wanted = null;

/** The phone's choice: `?menus3=0` stores the off, `?menus3=1` clears it; on by default. */
export function menus3Wanted() {
  if (_wanted !== null) return _wanted;
  let v = null;
  try { v = swValue('menus3'); } catch (e) { v = null; }
  if (v === '1') {
    try { localStorage.removeItem(KEY); } catch (e) { /* no storage: on anyway */ }
    _wanted = true;
  } else if (sw('menus3')) {
    try { localStorage.setItem(KEY, '0'); } catch (e) { /* no storage: this load only */ }
    _wanted = false;
  } else {
    try { _wanted = localStorage.getItem(KEY) !== '0'; } catch (e) { _wanted = true; }
  }
  return _wanted;
}

/** Are the new menus drawn now: wanted, and the band's frame on. */
export function menus3On() {
  return menus3Wanted() && ui2FrameOn();
}
