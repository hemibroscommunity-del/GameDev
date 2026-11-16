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

/* v2.3.5622 (the sitting 19 review): the worker's reservednames.js below
   this line, as it is (mirror-audit holds the two equal) */
export const RESERVED_NAME_WORDS = Object.freeze([
  'brotown', 'brotownteam', 'team', 'teams', 'admin', 'admins', 'administrator', 'administrators', 'mod', 'mods',
  'moderator', 'moderators', 'staff', 'owner', 'owners', 'devs', 'developer', 'developers', 'official', 'officials',
  'system', 'support', 'gamemaster', 'gamemasters',
]);
const WORDS = new Set(RESERVED_NAME_WORDS);

/* a look-alike for a Latin letter: the letters no normal form folds (a
   dotless i, the stroked letters, the small capitals), the Cyrillic and Greek
   that look Latin, then the digits and signs */
const LOOK = Object.freeze({
  '\u0131': 'i', '\u00f8': 'o', '\u0111': 'd', '\u0142': 'l', '\u0127': 'h', '\u0167': 't', '\u0180': 'b',
  '\u1d00': 'a', '\u0299': 'b', '\u1d04': 'c', '\u1d05': 'd', '\u1d07': 'e', '\ua730': 'f', '\u0262': 'g', '\u029c': 'h',
  '\u026a': 'i', '\u1d0a': 'j', '\u1d0b': 'k', '\u029f': 'l', '\u1d0d': 'm', '\u0274': 'n', '\u1d0f': 'o', '\u1d18': 'p',
  '\u0280': 'r', '\ua731': 's', '\u1d1b': 't', '\u1d1c': 'u', '\u1d20': 'v', '\u1d21': 'w', '\u028f': 'y', '\u1d22': 'z',
  '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p', '\u0441': 'c', '\u0443': 'y', '\u0445': 'x',
  '\u0456': 'i', '\u0458': 'j', '\u0455': 's', '\u0501': 'd', '\u0432': 'b', '\u043d': 'h', '\u043c': 'm',
  '\u0442': 't', '\u043a': 'k', '\u03b1': 'a', '\u03bf': 'o', '\u03b5': 'e', '\u03b9': 'i', '\u03ba': 'k',
  '\u03bd': 'v', '\u03c1': 'p', '\u03c4': 't', '\u03c5': 'u', '\u03c7': 'x', '\u0261': 'g',
});
const DIGIT_LOOK = Object.freeze({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'l' });
const COMBINING = /\p{M}/gu;
const CAMEL = /(\p{Ll})(\p{Lu})/gu;

/** The name with its look-alikes folded, as a string of letters, digits and
 *  spaces.  `one` is what a 1 reads as ('i' by default: "Adm1n"); `digits`
 *  false keeps the digits as digits (to read "Admin2" as "admin 2"). */
export function foldName(name, one, digits) {
  if (typeof name !== 'string') return '';
  let s;
  try { s = name.normalize('NFKD').replace(COMBINING, ''); } catch (e) { s = name; }
  s = s.replace(CAMEL, '$1 $2').toLowerCase();
  const signs = digits !== false;
  let out = '';
  for (const ch of s) {
    let m = Object.prototype.hasOwnProperty.call(LOOK, ch) ? LOOK[ch] : ch;
    if (Object.prototype.hasOwnProperty.call(DIGIT_LOOK, ch)) m = !signs ? (/[0-9]/.test(ch) ? ch : ' ') : ch === '1' && one ? one : DIGIT_LOOK[ch];
    out += /[a-z0-9]/.test(m) ? m : ' ';
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** True when the name reads as the game, its team or its staff. */
export function nameReadsAsStaff(name) {
  /* the digits read as letters (both ways for a 1), and the digits kept */
  for (const way of [['i', true], ['l', true], [null, false]]) {
    const folded = foldName(name, way[0], way[1]);
    if (!folded) continue;
    const words = way[1] ? folded.split(' ') : folded.split(' ').flatMap((w) => w.replace(/[0-9]+/g, ' ').trim().split(' ')).filter(Boolean);
    if (words.some((w) => WORDS.has(w))) return true;
    for (let i = 0; i + 1 < words.length; i++) if (WORDS.has(words[i] + words[i + 1])) return true;
    if (words.length && WORDS.has(words.join(''))) return true;
    /* GM: the whole name, or with digits or a plural ("GM", "GM7", "GMs") */
    if (!way[1]) {
      const raw = folded.split(' ');
      if (raw.join('') === 'gm' || raw.some((w) => /^gm(s|[0-9]+)$/.test(w) || /^[0-9]+gms?$/.test(w))) return true;
    }
  }
  return false;
}

/** `{ name }` when the name may be taken, else `{ why }` (the worker's codes). */
export function checkCharName(raw) {
  if (typeof raw !== 'string' || raw.length > 64) return { why: 'chars' };
  const s = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (s.length < CHAR_NAME.MIN) return { why: 'short' };
  if (s.length > CHAR_NAME.MAX) return { why: 'long' };
  /* v2.3.5622: a mark after a letter is the letter's; a character that draws nothing is refused (the worker's charname.js) */
  if (!/^(?:\p{L}\p{M}*|\p{N}|[ '_-])+$/u.test(s) || !/[\p{L}\p{N}]/u.test(s) || /\p{Default_Ignorable_Code_Point}/u.test(s)) return { why: 'chars' };
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
