/* ═══ v2.3.5594: A NAME THAT READS AS THE GAME OR ITS STAFF ═══
 *
 * The red team (2026-11-14, RT-3 S2 and S3, docs/security/rt3-findings.md):
 * the Feedback board took 20 of 20 posts as "BroTown Team (official) ...
 * whisper your Login Key to claim", and a character could call itself
 * "Owner (admin) SYSTEM".  A name that reads as the game, its team or its
 * staff is a scam's first tool.  So such a name is REFUSED (never rewritten:
 * a rewritten name still reads as the post's own word), wherever a name is
 * taken: the Feedback board now (feedback.js), a character's name next (card
 * MOD's name rules, PR 2: the same function).
 *
 * HOW A NAME IS READ.  Look-alikes are folded first -- case (NFKC, then lower
 * case), the digits and signs that stand for letters (0 o, 1 l, 3 e, 4 a,
 * 5 s, 7 t, 8 b, @ a, $ s, ! i, | l; a 1 is read both as i and as l), and the
 * Cyrillic and Greek letters that look Latin -- and then the name is read two
 * ways:
 *   - its WORDS (split on anything but a letter or a digit): any word on the
 *     list refuses it ("Team Rocket", "the Admin", "M0d");
 *   - the whole of it with nothing between the letters ("A d m i n",
 *     "B.r.o.T.o.w.n"): one of the words, or `brotown` anywhere in it
 *     ("BroTownFan", "xX_Bro_Town_Xx": the game's name is the game's).
 * A word that only CONTAINS a short one ("Modest", "Devin", "Teammate",
 * "Systema") is not refused: the list is of words, not of letters.
 *
 * The list is the planning session's (2026-11-15), with each one's plural and
 * long form.  The owner's own character names are the owner's to add.
 * No imports: card MOD's page side may mirror it (mirror-audit) one day.
 */

export const RESERVED_NAME_WORDS = Object.freeze([
  'brotown', 'brotownteam', 'team', 'admin', 'admins', 'administrator', 'mod', 'mods', 'moderator', 'moderators',
  'staff', 'owner', 'dev', 'devs', 'developer', 'developers', 'official', 'system', 'support', 'gm',
]);
const WORDS = new Set(RESERVED_NAME_WORDS);

/* a look-alike for a Latin letter: digits and signs, then Cyrillic and Greek */
const LOOK = Object.freeze({
  0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'l',
  '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p', '\u0441': 'c', '\u0443': 'y', '\u0445': 'x',
  '\u0456': 'i', '\u0458': 'j', '\u0455': 's', '\u0501': 'd', '\u0432': 'b', '\u043d': 'h', '\u043c': 'm',
  '\u0442': 't', '\u043a': 'k', '\u03b1': 'a', '\u03bf': 'o', '\u03b5': 'e', '\u03b9': 'i', '\u03ba': 'k',
  '\u03bd': 'v', '\u03c1': 'p', '\u03c4': 't', '\u03c5': 'u', '\u03c7': 'x', '\u0261': 'g',
});

/** The name with its look-alikes folded, as a string of letters, digits and
 *  spaces; `one` is what a 1 reads as ('i' by default: "Adm1n"). */
export function foldName(name, one) {
  if (typeof name !== 'string') return '';
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
