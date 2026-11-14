/* ═══ v2.3.5323: A SCENARIO'S LABEL SELECTORS, COUNTED (card V PR 4; TRAPS §29) ═══
 *
 * TRAPS §29: a scenario that selects UI by its LABEL (the button's words, a
 * `title`, an `aria-label`) is a test with an expiry date: the owner may
 * change the words, and the test then stops reaching its own setup and
 * starts describing a world that does not exist.  Select by a stable hook
 * (a class, a `data-` attribute) instead, and add one where none exists.
 *
 * THE RULES, PINNED: a label selector is, in a file's CODE (comments
 * dropped: ./codeOnly.mjs) under tools/qa/mp/, one of
 *   clickText(            the harness's tap-by-words (its own definition not counted)
 *   :has-text(  "text=    Playwright's text selectors
 *   getByText(  getByLabel(  getByRole(... name:   ...and its locators by words
 *   hasText:              a locator's filter by words
 *   [title=  [aria-label=  (and *= ^= $= |= ~=)   an attribute that is display copy
 *
 * The census is ./labelSelectorsKnown.mjs (rule 3: a file's count only
 * falls; a file not on it holds none; the gatekeeper alone makes it strict).
 * `node tools/guards/traps-test-tools.test.mjs --write` lowers it to what is
 * there and never raises or adds a line.
 */
import { codeOf } from './codeOnly.mjs';

const PATTERNS = [
  /(?<![\w$.])(?:H\.)?clickText\(/g, /:has-text\(/g, /["'`]text=/g, /getByText\(/g, /getByLabel\(/g,
  /\[(?:title|aria-label)[*^$|~]?=/g, /(?<![\w$])hasText:/g, /getByRole\([^)]*name:/g,
];

/** { 'tools/qa/mp/<file>': n } for every file holding at least one.  `code`:
    a codeOf() map already made that holds tools/qa/mp/ (one compile). */
export function labelSelectors(code = null) {
  const out = Object.create(null);
  for (const [f, c] of code || codeOf(['tools/qa/mp'])) {
    if (!f.startsWith('tools/qa/mp/') || f.slice('tools/qa/mp/'.length).includes('/')) continue;
    let n = 0;
    for (const p of PATTERNS) n += (c.match(p) || []).length;
    n -= (c.match(/function clickText\(/g) || []).length;
    if (n > 0) out[f] = n;
  }
  return out;
}

export function renderKnown(map) {
  const L = ['/* v2.3.5323: THE CENSUS of label selectors in tools/qa/mp/ (TRAPS §29;',
    '   ./labelSelectors.mjs says the rules).  A census: each count only falls.',
    '   `node tools/guards/traps-test-tools.test.mjs --write` lowers it; never add',
    '   a line or raise one by hand: a new scenario selects by a stable hook. */',
    'export const KNOWN = Object.freeze({'];
  for (const f of Object.keys(map).sort()) L.push(`  '${f}': ${map[f]},`);
  L.push('});', '');
  return L.join('\n');
}
