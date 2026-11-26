/* v2.3.6680: the kit's one shine switch (card UI2).  `?ui2shine=0` sets the
   gloss token to 0 on every kit root (`.ui2-noshine`, written from
   src/game/ui2Tokens.js); raised still reads apart from recessed without it.
   Its row: tools/guards/lib/switches.mjs. */
import { sw } from '@/game/switches.js';

/** The kit root's classes: the scope, and the shine switch when thrown. */
export function ui2RootClass(extra) {
  let off = false;
  try { off = sw('ui2shine'); } catch (e) { off = false; }
  return 'ui2' + (off ? ' ui2-noshine' : '') + (extra ? ' ' + extra : '');
}

/** A piece's still state for the fixture (pressed, selected, focused, off,
    pending), as its class; a live screen passes none and the browser's own
    :active and :focus-visible draw them. */
export function stateClass(state) {
  return state ? ' is-' + ({ pressed: 'press', selected: 'sel', focused: 'focus', disabled: 'off', pending: 'pending' }[state] || state) : '';
}
