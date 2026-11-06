/* THE GEAR TAB GOES BACK TO ITS DEFAULT WHEN THE BAND CLOSES -- v2.3.4353
 * The owner (2026-11-05 playtest): "got stuck with the detail menu open on one
 * item, so it was filtered every time he opened and closed the dashboard.
 * Reset the detail menu back to default (viewing character in middle)
 * whenever dashboard is closed."  Run here in node: a pick (a cell, which also
 * filters the bag to its kind) and then the band folding -> no pick, the bag's
 * filter "All Items", no menu open; opening the band again changes nothing. */
import { readFileSync } from 'fs';
import { gearTabBus } from '../../src/ui/mobile/dash/gearTabBus.js';
import { dashMinBus } from '../../src/ui/mobile/dashMinBus.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const st = gearTabBus.state;
dashMinBus.set(false);   /* the band open */
gearTabBus.tapCell('sword');
check('1a a cell tapped: picked, the bag filtered to its kind', !!st.sel && st.filter.auto === true && st.filter.id !== 'all', { sel: st.sel, filter: st.filter });
gearTabBus.setMore(true);
dashMinBus.set(true);   /* CLOSE */
check('1b the band closed: no pick, All Items, no menus', st.sel === null && st.filter.id === 'all' && st.filter.auto === false && st.menu === false && st.more === false, { sel: st.sel, filter: st.filter });
gearTabBus.pickFilter('armor');
dashMinBus.set(false);
check('1c opening the band again resets nothing (a filter chosen now stays while it is open)', st.filter.id === 'armor');
dashMinBus.set(true);
check('1d a filter picked from the menu goes with the close too', st.filter.id === 'all' && st.filter.auto === false);

const src = readFileSync(new URL('../../src/ui/mobile/dash/GearTab.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../src/styles/game.css', import.meta.url), 'utf8');
check('2a while a pick is open the tab is veiled (data-gear-veil) and a tap on the veiled space puts it down', /data-gear-veil=\{view === 'item' \? '1' : undefined\}/.test(src) && /gearTabBus\.deselect\(\)/.test(src.slice(src.indexOf('data-gear-veil=')), 0));
check('2b the veil dims the other cells (no CSS blur filter) and the picked one stays bright', /\[data-gear-veil="1"\] \[data-eqslot\]:not\(\[data-gear-sel="1"\]\)/.test(css) && !/data-gear-veil[^{]*\{[^}]*filter\s*:\s*blur/.test(css));
check('2c the card\'s X pulses three times, then keeps a soft glow, still under reduced motion', /btCardXPulse \.5s ease-in-out 3/.test(css) && /\.bt-card-x\[data-gear-card-close\]\{box-shadow/.test(css) && /prefers-reduced-motion:no-preference/.test(css));

if (failures) { console.log(failures + ' FAILED'); process.exit(1); }
console.log('all passed');
