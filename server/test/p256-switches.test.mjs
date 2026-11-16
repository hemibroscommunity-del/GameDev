/* ═══ v2.3.5565: EACH 256-COLOUR TWIN'S SWITCH, THROWN (card P's backlog) ═══
 *
 * src/rendering/p256.js reads a family's pictures from their 256-colour twins
 * by default, each family with its own `?name=0` that keeps its pictures (the
 * game as it was).  This plays each such switch thrown, without a browser:
 * p256.js's switch section (from `const ALL_TWINS` to `const WANTED`, the
 * patterns, their `_ON` flags and `wantedPath`) is read from its source and
 * run against an address's query, and for each row below:
 *   - unthrown, the family's picture is read from its twin;
 *   - with its `?name=0`, it is not, and another family's still is;
 *   - with `?p256=0`, no twin is read at all.
 * A row is added with each family's PR (tools/guards/switches-thrown.test.mjs
 * counts a page switch with no suite or scenario that plays it thrown).
 *
 * Run: node server/test/p256-switches.test.mjs (npm test runs it).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail))); }
}

const src = readFileSync(join(ROOT, 'src/rendering/p256.js'), 'utf8');
const a = src.indexOf('const ALL_TWINS');
const bLine = src.indexOf('const WANTED', a);
const b = src.indexOf('\n', bLine);
check('p256.js\'s switch section is found (ALL_TWINS .. WANTED)', a > 0 && bLine > a && b > bLine);
const section = src.slice(a, b);
/* the section reads only `_q` (location.search) */
const at = (q) => new Function('_q', section + '\nreturn { wantedPath, WANTED };')(q);

/* [the switch thrown, as an address carries it; a picture of its family
   (no host, no query)].  Written whole (`?name=0`): switches-thrown finds a
   suite that plays a switch by that text. */
const ROWS = [
  ['?fishspot=0', '/sprites/world/fish-spot-627.webp'],   /* v2.3.5565 */
  ['?hudbars=0', '/ui/bars/hp-frame.png'],                /* v2.3.5566 (and the pills, /icons/ui/bar-*.webp) */
  ['?deathstrip=0', '/sprites/players/death-v1.png'],     /* v2.3.5567 */
];
const OTHER = '/sprites/pets/pet-sheet.png';   /* another family's, read from its twin by default */

const plain = at('');
check('unthrown, another family\'s picture is read from its twin (the control)', plain.wantedPath(OTHER) === true);
for (const [q, pic] of ROWS) {
  const name = q.slice(1, -2);
  check(`?${name}: unthrown, ${pic} is read from its twin`, plain.wantedPath(pic) === true);
  const thrown = at(q);
  check(`${q}: ${pic} is its picture, as before`, thrown.wantedPath(pic) === false);
  check(`${q}: another family's picture is still read from its twin`, thrown.wantedPath(OTHER) === true && thrown.WANTED === true);
  check(`${q} after another switch (&${name}=0): the same`, at('?sharp=1&' + q.slice(1)).wantedPath(pic) === false);
  check(`?p256=0: ${pic} is its picture`, at('?p256=0').wantedPath(pic) === false);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
