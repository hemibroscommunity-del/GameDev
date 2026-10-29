/* ═══ v2.3.3755: EACH MEMORY SAVER, OFF FROM THE TEST PANEL ═══
 *
 * The owner turned every memory saver on by default on 2026-10-28 ("I can
 * always revert the change if I don't like it"), the night before showing the
 * game to judges.  Reverting one is a pull request and a deploy, and a judge
 * cannot add `?x=0` to an address.  So each saver can be turned off for every
 * phone from the Test panel (DevPanel.jsx, "Memory savers"), live, with no
 * deploy: the worker keeps one live flag a saver, `off_<name>: true`
 * (server/src/clientoff.js), tells every phone at join (caps.clientoff, the
 * names as a comma list) and at once whenever one changes (`client_off`).
 *
 * clientOff(name) is the saver's question.  A saver that only takes effect as
 * the game loads (its pictures are made then) asks clientOffAtLoad(name): the
 * last word this phone heard, kept in localStorage, so "off" holds from the
 * next load; one that can change while you play asks clientOff(name), which
 * follows the worker live.  A saver's own `?x=0` stays its own off-ramp.
 *
 * No imports: node tests it (server/test/client-off.test.mjs). */

/* every saver the panel can switch, in its order: `id` is the flag's name
   after `off_` and the saver's own `?id=0`; `live` says whether turning it
   off takes effect at once (else from the next load); `optIn` that the saver
   is on only when a phone's address asks for it (`?id`), so "not turned off"
   is not "on" */
export const CLIENT_SAVERS = Object.freeze([
  Object.freeze({ id: 'sfxcache', words: 'Sound held only while needed', live: false }),
  Object.freeze({ id: 'voicecap', words: 'A crowd of one sound plays as a few', live: true }),
  Object.freeze({ id: 'onecopy', words: 'Pictures held once', live: false }),
  Object.freeze({ id: 'picnumbers', words: 'Monster strips as colour numbers', live: false }),
  Object.freeze({ id: 'codelazy', words: 'Windows load when opened', live: false }),
  Object.freeze({ id: 'groundlean', words: 'Lean ground builder', live: false }),
  Object.freeze({ id: 'heaplean', words: 'Map leftover let go', live: false }),
  Object.freeze({ id: 'lookpalette', words: 'Characters coloured on the chip', live: true }),
  /* v2.3.3790: the patterned and printed tees, on the look palette (lookShirtFrame.js) */
  Object.freeze({ id: 'lookshirt', words: 'Printed shirts coloured on the chip', live: true }),
  /* v2.3.3800: no sound of the world under the loading screen (BT_AUDIO's
     sound gate, gameDisplay.js): off, a closed gate opens at once */
  Object.freeze({ id: 'soundgate', words: 'Sound waits for the world', live: true }),
  /* v2.3.3752: the body under armour, from the colour numbers (lookArmour.js) */
  Object.freeze({ id: 'lookarmour', words: 'Bodies under armour coloured on the chip', live: true }),
  /* v2.3.3809: the townsfolk drawn live from their looks, not their
     photographs (rendering/lookFolk.js); off brings the photographs back */
  Object.freeze({ id: 'lookfolk', words: 'Townsfolk drawn live', live: true }),
]);

const KEY = 'bt_clientoff';
const NAME_RE = /^[a-z0-9_]{1,24}$/;

/** A comma list ('a,b') to a Set of the names in it that look like names. */
export function parseClientOff(list) {
  const out = new Set();
  if (typeof list !== 'string') return out;
  for (const n of list.split(',')) { const t = n.trim(); if (NAME_RE.test(t)) out.add(t); }
  return out;
}

let _live = null;        /* Set: the worker's word on this socket, or null */
let _atLoad = null;      /* Set: what this phone last heard, read once */
const _subs = [];

function store() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
}

/** What this phone last heard, as the game loaded (localStorage). */
export function clientOffAtLoad(name) {
  if (!_atLoad) {
    const s = store();
    let v = '';
    try { v = (s && s.getItem(KEY)) || ''; } catch (e) { v = ''; }
    _atLoad = parseClientOff(v);
  }
  return _atLoad.has(name);
}

/** Is this saver turned off for every phone?  The worker's word once it has
 *  spoken on this socket, else what this phone last heard. */
export function clientOff(name) {
  return _live ? _live.has(name) : clientOffAtLoad(name);
}

/** wsClient.js: the worker's word (caps.clientoff at join, `client_off` live).
 *  Kept for the next load; the savers that follow live are told. */
export function setClientOff(list) {
  const next = parseClientOff(list);
  const was = _live;
  _live = next;
  const s = store();
  try { if (s) { if (next.size) s.setItem(KEY, [...next].join(',')); else s.removeItem(KEY); } } catch (e) { /* private mode: from the worker each join */ }
  const changed = !was || was.size !== next.size || [...next].some((n) => !was.has(n));
  if (changed) for (const fn of _subs.slice()) { try { fn(next); } catch (e) { /* a saver's own trouble */ } }
  return next;
}

/** A saver that follows live: `fn(set)` on every change (and not before). */
export function onClientOff(fn) {
  if (typeof fn === 'function') _subs.push(fn);
}

/** QA and the Test panel: the worker's word, as a list (null before it spoke). */
export function clientOffNow() {
  return _live ? [..._live] : null;
}

/* tests only: forget everything */
export function _resetClientOff() { _live = null; _atLoad = null; _subs.length = 0; }
