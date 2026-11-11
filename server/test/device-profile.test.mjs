/* The device profile -- v2.3.4804 (src/game/deviceProfile.js; spec
 * docs/specs/device-profile.md).
 *
 * The game asked what kind of device it was on in many places, each its own
 * way: "is there a mouse?" sixteen times, "a computer's window?" three, "an
 * iPhone?" twice by hand and once differently.  Now one file answers, and
 * this suite holds it:
 *
 *   1. THE ANSWERS: the profile loads in node (no page: no mouse, no computer
 *      window); the iPhone test reads an iPhone, an iPad, an iPad asking for
 *      the desktop site, and not a Mac, an Android or nothing.
 *   2. THE QUERIES are game.css's own: the page's computer rule and the mouse
 *      rule are the same strings the profile asks.
 *   3. ONE PLACE: no other file in src/ asks matchMedia about the pointer,
 *      writes the computer-window query, or tests the user agent for an
 *      iPhone by hand.  A new device question goes in the profile.
 *   4. The "click" words (deskWords.js) read the profile.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { FINE_QUERY, COMPUTER_FRAME_QUERY, fineInput, computerFrame, onIOS, deviceProfile } from '../../src/game/deviceProfile.js';
import { onComputer } from '../../src/game/deskWords.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

/* ── 1. THE ANSWERS ── */
check('1. with no page there is no mouse and no computer window', fineInput() === false && computerFrame() === false);
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
check('1. an iPhone is iOS', onIOS(IPHONE, 'iPhone', 5));
check('1. an iPad is iOS', onIOS(IPAD, 'iPad', 5));
check('1. an iPad asking for the desktop site (MacIntel with touch) is iOS', onIOS(MAC, 'MacIntel', 5));
check('1. a Mac (MacIntel, no touch) is not', !onIOS(MAC, 'MacIntel', 0));
check('1. an Android phone is not', !onIOS(ANDROID, 'Linux armv8l', 5));
check('1. nothing at all is not', !onIOS('', '', 0));
{
  const p = deviceProfile();
  check('1. the profile names every lane', p && p.input === 'touch' && p.computerFrame === false && typeof p.ios === 'boolean'
    && typeof p.windows === 'boolean' && typeof p.mac === 'boolean' && typeof p.palette === 'string' && p.dpr === 1, p);
}

/* ── 2. THE QUERIES ── */
{
  const css = readFileSync(new URL('../../src/styles/game.css', import.meta.url), 'utf8');
  check('2. the mouse query is game.css\'s', FINE_QUERY === '(pointer:fine)' && css.includes('@media ' + FINE_QUERY));
  check('2. the computer-window query is game.css\'s computer rule', COMPUTER_FRAME_QUERY === '(pointer:fine) and (min-width:1000px)' && css.includes('@media ' + COMPUTER_FRAME_QUERY));
}

/* ── 3. ONE PLACE ── */
{
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
  const root = new URL('../../src/', import.meta.url);
  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const u = new URL(name, dir);
      if (statSync(u).isDirectory()) walk(new URL(name + '/', dir));
      else if (/\.(js|jsx|mjs)$/.test(name)) files.push(u);
    }
  })(root);
  const bad = [];
  for (const u of files) {
    const rel = u.pathname.slice(root.pathname.length);
    if (rel === 'game/deviceProfile.js') continue;
    const code = strip(readFileSync(u, 'utf8'));
    code.split('\n').forEach((line, i) => {
      if (/matchMedia\(\s*['"`]\(pointer:\s*(fine|coarse)\)/.test(line)) bad.push(rel + ':' + (i + 1) + ' asks matchMedia about the pointer');
      if (line.includes("'(pointer:fine) and (min-width:1000px)'")) bad.push(rel + ':' + (i + 1) + ' writes the computer-window query');
      if (/iPad\|iPhone|iPhone\|iPad/.test(line) && /navigator|userAgent|\bua\b/.test(line)) bad.push(rel + ':' + (i + 1) + ' tests the user agent for an iPhone by hand');
    });
  }
  check('3. every device question in src/ is the profile\'s (game/deviceProfile.js)', bad.length === 0, bad);
}

/* ── 4. THE WORDS ── */
check('4. deskWords.onComputer reads the profile (no page: a phone)', onComputer() === fineInput() && onComputer() === false);
{
  const src = readFileSync(new URL('../../src/game/deskWords.js', import.meta.url), 'utf8');
  check('4. ...and keeps no query of its own', /fineInput\(\)/.test(src) && !/matchMedia/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
