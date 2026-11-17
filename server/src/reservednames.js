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
 * HOW A NAME IS READ.  Look-alikes are folded first -- compatibility forms
 * and accents (NFKD, its combining marks taken off: "Ádmin", "Ownér"), case,
 * the letters no form folds (a dotless i, an o with a stroke, the small
 * capitals: "Admın", "Mød", "ᴀᴅᴍɪɴ"), the Cyrillic and Greek letters that
 * look Latin, and the digits and signs that stand for letters (0 o, 1 l,
 * 3 e, 4 a, 5 s, 7 t, 8 b, @ a, $ s, ! i, | l; a 1 is read both as i and as
 * l) -- and a word in CamelCase is two words ("AdminTeam", "RealOwner").
 * Then the name is read:
 *   - its WORDS (split on anything but a letter or a digit): any word on the
 *     list refuses it ("Team Rocket", "the Admin", "M0d");
 *   - its words with the digits taken off them ("Admin2", "Owner1", "Mod7");
 *   - two words side by side ("Game Master", "Bro Town");
 *   - the whole of it with nothing between the letters ("A d m i n",
 *     "B.r.o.T.o.w.n").
 * v2.3.5625 (card MOD PR 5; the sitting 21 list): a word is also read with
 * letters that look like one when put together (vv a w, rn an m, cl a d) and
 * an l as an i ("BroTovvn", "Adrnin", "Admln"), and the Cherokee letters
 * that look Latin are folded ("\u13aadmin").
 * A word that only CONTAINS a short one ("Modest", "Devin", "Teammate",
 * "Systema", "Bro Townsend") is not refused: the list is of words, not of
 * letters.
 *
 * The sitting 19 review (2026-11-15, the planning session's calls): "Dev" is
 * a common real name, so it is off the list ("Dev", "Dev Patel" pass; "Devs"
 * and "Developer" do not); "GM" is refused only as the whole name, or with
 * digits or a plural ("GM", "GM7", "GMs"), so a name with GM in it passes;
 * "brotown" only as a word of its own ("BroTown", "Bro Town", "BroTownTeam",
 * "BroTown Staff"), so "Bro Townsend" passes.
 *
 * The list is the planning session's (2026-11-15), with each one's plural and
 * long form.  The owner's own character names are the owner's to add.
 * No imports: the page's name box mirrors it (src/game/charName.js;
 * mirror-audit holds the two equal).
 */

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
/* v2.3.5625 (card MOD PR 5; the sitting 21 list: "a Cherokee A"): the
   Cherokee letters that look Latin, each in both its cases (the fold lowers
   the name first, and a capital Cherokee letter lowers to U+AB70-ABBF) */
const CHEROKEE = Object.freeze({
  'Ꭰ': 'd', 'Ꭱ': 'r', 'Ꭲ': 't', 'Ꭵ': 'i', 'Ꭹ': 'y', 'Ꭺ': 'a', 'Ꭻ': 'j', 'Ꭼ': 'e',
  'Ꮃ': 'w', 'Ꮇ': 'm', 'Ꮋ': 'h', 'Ꮐ': 'g', 'Ꮒ': 'h', 'Ꮓ': 'z', 'Ꮟ': 'b', 'Ꮢ': 'r',
  'Ꮤ': 'w', 'Ꮥ': 's', 'Ꮩ': 'v', 'Ꮪ': 's', 'Ꮮ': 'l', 'Ꮯ': 'c', 'Ꮲ': 'p', 'Ꮶ': 'k',
  'Ᏼ': 'b',
});
const LOOKS = (() => {
  const m = Object.create(null);
  for (const k of Object.keys(LOOK)) m[k] = LOOK[k];
  for (const k of Object.keys(CHEROKEE)) { m[k] = CHEROKEE[k]; m[k.toLowerCase()] = CHEROKEE[k]; }
  return Object.freeze(m);
})();
/* v2.3.5625 (the sitting 21 list: "BroTovvn", "Admln"): the letters that
   read as another when put together (vv a w, rn an m, cl a d) and an l read
   as an i, on both sides: a word is on the list when it reads as a listed
   word this way too ("Ovvner", "Adrnin", "Mocl", "Admln", "Offlcial") */
const together = (w) => w.replace(/vv/g, 'w').replace(/rn/g, 'm').replace(/cl/g, 'd').replace(/i/g, 'l');
const READS = new Set(RESERVED_NAME_WORDS.map(together));
const listed = (w) => WORDS.has(w) || READS.has(together(w));
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
    let m = ch in LOOKS ? LOOKS[ch] : ch;   /* v2.3.5625: + the Cherokee (a null-prototype map) */
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
    if (words.some(listed)) return true;   /* v2.3.5625: read together too (listed) */
    for (let i = 0; i + 1 < words.length; i++) if (listed(words[i] + words[i + 1])) return true;
    if (words.length && listed(words.join(''))) return true;
    /* GM: the whole name, or with digits or a plural ("GM", "GM7", "GMs") */
    if (!way[1]) {
      const raw = folded.split(' ');
      if (raw.join('') === 'gm' || raw.some((w) => /^gm(s|[0-9]+)$/.test(w) || /^[0-9]+gms?$/.test(w))) return true;
    }
  }
  return false;
}
