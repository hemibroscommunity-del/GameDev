/* ═══ v2.3.6681: THE NEW DASHBOARD'S FRAME IS ON; `?ui2=0` THE ONE WAY BACK ═══
 * (card UI2-frame, the build's step 2; docs/design/UI_ARCHITECTURE_V2_PLAN.md
 * "How it arrives": "Each step lands ON, for everyone"; "ONE way back for the
 * whole new dashboard while it is built: `?ui2=0`, remembered on that phone
 * (`?ui2=1` returns)".)  Off gives back today's row of CLOSE and six buttons
 * and today's screens (dash/NavRail.jsx, dash/MorePanel.jsx).  Its row:
 * tools/guards/lib/switches.mjs.
 *
 * The frame draws where the one band does (src/ui/oneBand.js: every screen
 * plays the upright layout, the band at the bottom); under `?oneband=0` the
 * old side column keeps its own ways. */
import { sw, swValue } from '../../game/switches.js';   /* relative: node's suites import this file */
import { oneBandActive } from '../oneBand.js';

const KEY = 'bt_ui2';
let _wanted = null;

/** The phone's choice: `?ui2=0` stores the off, `?ui2=1` clears it; on by default. */
export function ui2Wanted() {
  if (_wanted !== null) return _wanted;
  let v = null;
  try { v = swValue('ui2'); } catch (e) { v = null; }
  if (v === '1') {
    try { localStorage.removeItem(KEY); } catch (e) { /* no storage: on anyway */ }
    _wanted = true;
  } else if (sw('ui2')) {
    try { localStorage.setItem(KEY, '0'); } catch (e) { /* no storage: this load only */ }
    _wanted = false;
  } else {
    try { _wanted = localStorage.getItem(KEY) !== '0'; } catch (e) { _wanted = true; }
  }
  return _wanted;
}

/** Is the new frame drawn now: wanted, and the one band on. */
export function ui2FrameOn() {
  return ui2Wanted() && oneBandActive();
}
