/* ═══ v2.3.5524: WHAT THE SALOON'S LEADER TYPED OUTLIVES A REJOIN (card L) ═══
 *
 * Card J2's find (status J2.md, mp-alliance v2.3.5430): a rejoin (the page
 * held past 5 s: wsClient _aliveTimer, RESYNC_AWAY_MS) clears the party at
 * state_sync until the worker sends it again (REJOIN_SLOTS' `party` row:
 * the clear is right, the roster is the worker's).  The Saloon's alliance
 * forms (AlliancePart.jsx) are under the party, so they were made again,
 * EMPTY: the leader's typed name, tag or foe's tag was lost mid-typing.
 *
 * The draft is not the worker's copy of anything (nothing here is cleared or
 * re-sent at a rejoin: no REJOIN_SLOTS row): it is what the leader typed,
 * kept here, outside the form, while the form is gone.  A draft is kept
 * under its field and its party, against the worker's value it was typed
 * over (`base`): when the worker's value changes (a rename went through) or
 * the party is another, the worker's value shows again, as before.  A send
 * forgets it (the answer redraws the form).
 *
 * `?allydrafts=0` keeps nothing: the forms are made again empty, as before.
 * No imports but the switches' one reader, so node can test it. */
import { sw } from './switches.js';

const _drafts = new Map();   /* key: field + '\u0000' + party id -> { base, value } */
const MAX = 8;               /* three fields today; a cap on what is kept */

function key(field, party) {
  return String(field) + '\u0000' + String(party == null ? '' : party);
}

export function allyDraftsOff() {
  return sw('allydrafts');
}

/* the field's value to show: the draft, when one was typed over this same
   worker value in this same party; else the worker's value */
export function draftGet(field, party, base) {
  const b = base == null ? '' : String(base);
  if (allyDraftsOff()) return b;
  const d = _drafts.get(key(field, party));
  return d && d.base === b ? d.value : b;
}

export function draftSet(field, party, base, value) {
  if (allyDraftsOff()) return;
  const k = key(field, party);
  _drafts.delete(k);
  _drafts.set(k, { base: base == null ? '' : String(base), value: value == null ? '' : String(value) });
  while (_drafts.size > MAX) _drafts.delete(_drafts.keys().next().value);
}

export function draftDrop(field, party) {
  _drafts.delete(key(field, party));
}

/* for the suite */
export function draftCount() {
  return _drafts.size;
}
