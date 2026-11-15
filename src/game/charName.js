/* ═══ v2.3.5622: THE NAME RULES, ON THE PAGE (card MOD PR 2) ═══
 *
 * The worker's rule (server/src/charname.js checkCharName, with
 * server/src/reservednames.js nameReadsAsStaff), run by the name box before
 * it joins, so an honest player is told why in the box and never meets the
 * worker's refusal (`join_rejected {reason: 'name'}`).  A copy, held to the
 * worker's by mirror-audit (the same names allowed and refused, the same
 * words on the list).  NO IMPORTS (node tests it; data/joinGate.js reads it).
 */

export const CHAR_NAME = Object.freeze({ MIN: 1, MAX: 20 });

export const RESERVED_NAME_WORDS = Object.freeze([
  'brotown', 'brotownteam', 'team', 'admin', 'admins', 'administrator', 'mod', 'mods', 'moderator', 'moderators',
  'staff', 'owner', 'dev', 'devs', 'developer', 'developers', 'official', 'system', 'support', 'gm',
]);
const WORDS = new Set(RESERVED_NAME_WORDS);
const LOOK = Object.freeze({
  0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'l',
  '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p', '\u0441': 'c', '\u0443': 'y', '\u0445': 'x',
  '\u0456': 'i', '\u0458': 'j', '\u0455': 's', '\u0501': 'd', '\u0432': 'b', '\u043d': 'h', '\u043c': 'm',
  '\u0442': 't', '\u043a': 'k', '\u03b1': 'a', '\u03bf': 'o', '\u03b5': 'e', '\u03b9': 'i', '\u03ba': 'k',
  '\u03bd': 'v', '\u03c1': 'p', '\u03c4': 't', '\u03c5': 'u', '\u03c7': 'x', '\u0261': 'g',
});
function foldName(name, one) {
  let s;
  try { s = name.normalize('NFKC'); } catch (e) { s = name; }
  s = s.toLowerCase();
  let out = '';
  for (const ch of s) {
    const m = ch === '1' && one ? one : Object.prototype.hasOwnProperty.call(LOOK, ch) ? LOOK[ch] : ch;
    out += /[a-z0-9]/.test(m) ? m : ' ';
  }
  return out.replace(/\s+/g, ' ').trim();
}
/** True when the name reads as the game, its team or its staff. */
export function nameReadsAsStaff(name) {
  if (typeof name !== 'string') return false;
  for (const one of ['i', 'l']) {
    const folded = foldName(name, one);
    if (!folded) continue;
    const words = folded.split(' ');
    if (words.some((w) => WORDS.has(w))) return true;
    const joined = words.join('');
    if (WORDS.has(joined) || joined.includes('brotown')) return true;
  }
  return false;
}

/** `{ name }` when the name may be taken, else `{ why }` (the worker's codes). */
export function checkCharName(raw) {
  if (typeof raw !== 'string' || raw.length > 64) return { why: 'chars' };
  const s = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (s.length < CHAR_NAME.MIN) return { why: 'short' };
  if (s.length > CHAR_NAME.MAX) return { why: 'long' };
  if (!/^[\p{L}\p{N} '_-]+$/u.test(s) || !/[\p{L}\p{N}]/u.test(s)) return { why: 'chars' };
  if (nameReadsAsStaff(s)) return { why: 'staff' };
  return { name: s };
}

/* What the name box says for each, one short line (data/joinGate.js's slot:
   each under the 320 column, as its other reasons are) */
export const CHAR_NAME_WORDS = Object.freeze({
  short: 'Type at least 2 letters',
  long: '20 letters at most',
  chars: 'No emoji or symbols',
  staff: 'Pick a name of your own',
});
