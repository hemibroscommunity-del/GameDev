/* v2.3.6680: the kit's one shine switch (card UI2).  `?ui2shine=0` sets the
   gloss token to 0 on every kit root (`.ui2-noshine`, written from
   src/game/ui2Tokens.js); raised still reads apart from recessed without it.
   Its row: tools/guards/lib/switches.mjs.

   v2.3.6780 (card UI3-kit): `?ui2look=0` gives YESTERDAY'S look (the colours,
   bevels and shadows before the owner's palette of 2026-11-26), so the owner
   can compare on their own phone: `.ui2-was`, whose values ui2Tokens.js's
   UI2_WAS writes into the generated block.  Remembered on that phone
   (localStorage bt_ui2look, the pattern of src/ui/mobile/ui2Frame.js);
   `?ui2look=1` clears it; the new look by default.  Every kit root takes
   its classes here, so one place turns the whole kit. */
import { sw, swValue } from '@/game/switches.js';

const LOOK_KEY = 'bt_ui2look';
let _was = null;

/** Yesterday's look wanted on this phone: `?ui2look=0` stores it, `?ui2look=1` clears it. */
export function ui2LookWas() {
  if (_was !== null) return _was;
  let v = null;
  try { v = swValue('ui2look'); } catch (e) { v = null; }
  if (v === '1') {
    try { localStorage.removeItem(LOOK_KEY); } catch (e) { /* no storage: the new look anyway */ }
    _was = false;
  } else if ((() => { try { return sw('ui2look'); } catch (e) { return false; } })()) {
    try { localStorage.setItem(LOOK_KEY, '0'); } catch (e) { /* no storage: this load only */ }
    _was = true;
  } else {
    try { _was = localStorage.getItem(LOOK_KEY) === '0'; } catch (e) { _was = false; }
  }
  return _was;
}

/* v2.3.6841 (card UI4 PR 2): the owner's V17 look, ON by default (`.ui2-v17`: the roles wear V17:37-49,
   src/game/ui2Tokens.js UI2_V17).  `?v17look=0` gives the game exactly as it was the day before (no
   class: every rule of the look is under it), remembered on that phone (localStorage bt_v17look, the
   pattern above); `?v17look=1` clears it.  Yesterday's palette (`?ui2look=0`) is older than V17, so it
   never wears V17 on top. */
const V17_KEY = 'bt_v17look';
let _v17 = null;

/** The V17 look on this phone: on unless `?v17look=0` stored it off. */
export function v17LookOn() {
  if (_v17 !== null) return _v17;
  let v = null;
  try { v = swValue('v17look'); } catch (e) { v = null; }
  if (v === '1') {
    try { localStorage.removeItem(V17_KEY); } catch (e) { /* no storage: on anyway */ }
    _v17 = true;
  } else if ((() => { try { return sw('v17look'); } catch (e) { return false; } })()) {
    try { localStorage.setItem(V17_KEY, '0'); } catch (e) { /* no storage: this load only */ }
    _v17 = false;
  } else {
    try { _v17 = localStorage.getItem(V17_KEY) !== '0'; } catch (e) { _v17 = true; }
  }
  return _v17;
}

/** The kit root's classes: the scope, the shine switch when thrown, yesterday's look when wanted,
    V17's when on (v2.3.6841). */
export function ui2RootClass(extra) {
  let off = false;
  try { off = sw('ui2shine'); } catch (e) { off = false; }
  const was = ui2LookWas();
  return 'ui2' + (off ? ' ui2-noshine' : '') + (was ? ' ui2-was' : '') + (!was && v17LookOn() ? ' ui2-v17' : '') + (extra ? ' ' + extra : '');
}

/** A piece's still state for the fixture (pressed, selected, focused, off,
    pending), as its class; a live screen passes none and the browser's own
    :active and :focus-visible draw them. */
export function stateClass(state) {
  return state ? ' is-' + ({ pressed: 'press', selected: 'sel', focused: 'focus', disabled: 'off', pending: 'pending' }[state] || state) : '';
}
