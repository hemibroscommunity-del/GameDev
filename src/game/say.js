/* ═══ v2.3.6320: THE ONE READER OF THE WORDS TABLE (GRAND-PLAN 8.8; card WD2, wave W0) ═══
 *
 * Every word a player reads moves, screen by screen, into one table
 * (docs/specs/player-words.md): `src/data/say/<screen>.js`, one leaf file a
 * screen, each exporting `SAY`, a frozen map of `<screen>.<what>` to its
 * words.  This is the one function that reads it.  A screen imports its own
 * file and this:
 *
 *   import { SAY } from '@/data/say/clanInvite.js';
 *   import { say, sayPieces } from '@/game/say.js';
 *   <span>{say(SAY, 'clanInvite.title')}</span>
 *
 * A ROW is one of:
 *   - words: 'Clan invite', or a template 'Joining [{tag}]...'.  A plain row
 *     goes through deskWords() (CLAUDE.md §7 Desktop), so its "tap" reads
 *     "click" under a mouse: the census's 96 "tap" rows are put right as
 *     they move, with no word written twice;
 *   - { phone, desk }: wording that differs by more than tap/click (a key to
 *     press, "swipe").  The device is asked through deskWords.js's
 *     onComputer() (the device profile's fineInput), never written again;
 *   - { one, other }: chosen by `parts.n` (1 is `one`).
 *   The two forms nest ({ phone: { one, other }, desk: ... }).
 *
 * A `{name}` in a row is filled from `parts`, each part PUT IN AS TEXT (the
 * words rule's fillWords form, src/data/words.js: a missing or null part is
 * ''), in one pass, so a part that itself holds "{x}" or "tap" stays as the
 * player wrote it (deskWords runs on the row BEFORE the parts go in).
 *
 * A MISSING KEY returns the key itself ('clanInvite.title'), so a fault is
 * seen on screen and never shown as an empty button (server/test/say.test
 * also fails a key a screen reads that its table lacks).
 *
 * sayPieces() is for a sentence with a styled part inside it (a name in
 * bold): it returns the row cut into an array, the text pieces as strings
 * and each part as given (a React element, with its own `key`), so the
 * whole sentence stays ONE row and React draws exactly the nodes the JSX
 * did.  (v2.3.6320: the spec's say() returns text; this is its pieces form,
 * asked of the planning session with the pilot.)
 *
 * No imports but deskWords.js, so node tests it (server/test/say.test.mjs).
 */
import { deskWords, onComputer } from './deskWords.js';

const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);

/* the row for `key`, its device and count forms chosen; `plain` says whether
   it was a plain row (deskWords applies) */
function pick(table, key, parts) {
  let row = own(table, key) ? table[key] : undefined;
  if (row === undefined) return { text: key, plain: false };
  let plain = true;
  for (let depth = 0; row && typeof row === 'object' && depth < 4; depth++) {
    if (own(row, 'phone') || own(row, 'desk')) {
      plain = false;
      row = onComputer() ? (own(row, 'desk') ? row.desk : row.phone) : (own(row, 'phone') ? row.phone : row.desk);
    } else if (own(row, 'one') || own(row, 'other')) {
      const n = parts && parts.n;
      row = n === 1 || n === '1' ? (own(row, 'one') ? row.one : row.other) : (own(row, 'other') ? row.other : row.one);
    } else break;
  }
  if (typeof row !== 'string') return { text: key, plain: false };
  return { text: row, plain };
}

const asText = (parts, k) => (own(parts, k) && parts[k] != null ? String(parts[k]) : '');

/** The words for `key` in `table`, its `{name}`s filled from `parts` as text. */
export function say(table, key, parts) {
  const { text, plain } = pick(table, key, parts);
  const t = plain ? deskWords(text) : text;
  if (t.indexOf('{') < 0) return t;
  return t.replace(/\{(\w+)\}/g, (m, k) => asText(parts, k));
}

/** The words for `key` cut into pieces: strings, and each `{name}` part as
 *  given (a string or number as text; anything else, a React element, kept
 *  whole).  Empty text pieces are dropped. */
export function sayPieces(table, key, parts) {
  const { text, plain } = pick(table, key, parts);
  const t = plain ? deskWords(text) : text;
  const out = [];
  const re = /\{(\w+)\}/g;
  let at = 0;
  for (let m = re.exec(t); m; m = re.exec(t)) {
    if (m.index > at) out.push(t.slice(at, m.index));
    const v = own(parts, m[1]) ? parts[m[1]] : null;
    if (v != null && v !== '') out.push(typeof v === 'object' ? v : String(v));
    at = m.index + m[0].length;
  }
  if (at < t.length) out.push(t.slice(at));
  return out;
}
