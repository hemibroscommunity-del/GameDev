/* ═══ v2.3.3838: THE LOOK PALETTE IS NOT BUILT ON WINDOWS ═══
 * (src/game/lookPaletteChoice.js)
 *
 * The owner's Windows laptop froze at 75% of the loading screen for 5-10
 * minutes in Chrome and Firefox: ANGLE's Direct3D compiler took that long
 * over the look palette's fragment program.  So a Windows browser draws the
 * old way; phones keep the palette.
 *
 *   1. Windows browsers (Chrome, Edge, Firefox, Chromium's own platform) are
 *      off ('windows'); v2.3.3842: so is a Mac ('mac': Safari, Chrome,
 *      Firefox, Chromium's 'macOS') -- but an iPad asking for the desktop
 *      site (a Macintosh with touch points) is on, as an iPhone, Android and
 *      Linux (the QA box) are;
 *   2. the address wins either way: `lookpalette=0` off anywhere,
 *      `lookpalette=1` on even on Windows (QA);
 *   3. the wiring, read from the source: lookPalette.js's switch is this
 *      choice, and the QA probe reports why.
 *
 * v2.3.5228 (card O PR 8): the choice is the lanes' `look` knob, its
 * Windows and Mac an override's, asked of deviceProfile.js:
 *   3. lookPalette.js asks the choice with the search alone (this page's
 *      device, asked of the profile: it reads no navigator);
 *   4. the choice reads laneKnob('look'), and no device's name: onWindows
 *      and onMac are the profile's (re-exported, the same functions); the
 *      search alone answers for the device the lanes are asked about.
 * Each device's answer, with the one program's: one-program.test.
 * BREAK PROOF (rule 8), tried by hand 2026-11-14: the look's Mac override
 * taken out of drawLanes.js OVERRIDES -> FAIL 1 (each Mac 'default').
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');
const C = await import('../../src/game/lookPaletteChoice.js');
const P = await import('../../src/game/deviceProfile.js');
const D = await import('../../src/game/drawLanes.js');

const UA = {
  winChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  winEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  winFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  macFirefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};

/* ── 1. Windows and a Mac off, phones, tablets and Linux on ── */
for (const k of ['winChrome', 'winEdge', 'winFirefox']) {
  const c = C.lookPaletteChoice('', UA[k], undefined, 0);
  check(`${k}: not built (windows)`, c.on === false && c.why === 'windows', c);
}
check('Chromium says its platform is Windows: not built', C.lookPaletteChoice('', 'Mozilla/5.0', 'Windows').on === false);
for (const k of ['macChrome', 'macSafari', 'macFirefox']) {
  const c = C.lookPaletteChoice('', UA[k], k === 'macChrome' ? 'macOS' : undefined, 0);
  check(`${k}: not built (mac)`, c.on === false && c.why === 'mac', c);
}
check('Chromium says its platform is macOS: not built', C.lookPaletteChoice('', 'Mozilla/5.0', 'macOS', 0).why === 'mac');
check('a Mac whose touch points are unknown is still a Mac', C.lookPaletteChoice('', UA.macSafari, undefined, undefined).why === 'mac');
for (const [k, plat, touch] of [['iphone', undefined, 5], ['ipad', undefined, 5], ['android', 'Android', 5], ['linux', 'Linux', 0]]) {
  const c = C.lookPaletteChoice('', UA[k], plat, touch);
  check(`${k}: built (default)`, c.on === true && c.why === 'default', c);
}
check('an iPhone is never a Mac, even with its "like Mac OS X" and no touch points read', C.lookPaletteChoice('', UA.iphone, undefined, 0).on === true);
check('no user agent at all: built', C.lookPaletteChoice('', undefined, undefined).on === true);
check('a word with "win" in it is not Windows', C.lookPaletteChoice('', 'Mozilla/5.0 (X11; Linux) Winamp-ish', undefined).on === true);

/* ── 2. the address wins ── */
check('?lookpalette=0 on a phone: off (address)', JSON.stringify(C.lookPaletteChoice('?lookpalette=0', UA.iphone)) === JSON.stringify({ on: false, why: 'address' }));
check('?lookpalette=1 on Windows: on (address)', JSON.stringify(C.lookPaletteChoice('?world=wheel&lookpalette=1', UA.winChrome)) === JSON.stringify({ on: true, why: 'address' }));
check('?lookpalette=2 means nothing: the device decides', C.lookPaletteChoice('?lookpalette=2', UA.winChrome).why === 'windows');
check('?xlookpalette=1 is not the switch', C.lookPaletteChoice('?xlookpalette=1', UA.winFirefox).on === false);

/* ── 3. the wiring ── */
const lp = src('src/rendering/lookPalette.js');
check("lookPalette.js imports the choice", /import \{ lookPaletteChoice \} from '\.\.\/game\/lookPaletteChoice\.js'/.test(lp));
/* v2.3.5228: the search alone -- this page's device, asked of the profile */
const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
check('its switch is the choice, with the search alone (this page\'s device, asked of the profile), and lookPalette.js reads no navigator',
  /lookPaletteChoice\(window\.location\.search \|\| ''\)/.test(lp) && /const _wanted = wantedByAddress\(\);/.test(lp) && !/navigator/.test(code(lp)));
check('the program is built only when wanted (the prewarm asks _wanted first)', /function prewarmProgram\(\) \{\s*const r = paletteRendererOf\(\);\s*if \(!_wanted \|\|/.test(lp));
check('the QA probe says why', /why: _why/.test(lp));

/* ── 4. v2.3.5228: the lanes' `look` knob; no name here ── */
const lc = code(src('src/game/lookPaletteChoice.js'));
/* a name, as a word (the profile's onWindows / onMac, imported, are not) */
const NAMES = /\b(Windows|Win64|Win32|Macintosh|macOS|iPhone|iPad)\b|userAgent|navigator/i;
check("lookPaletteChoice.js reads laneKnob('look')", /\blaneKnob\('look'\)/.test(lc));
check('...and no device\'s name (Windows, a Mac, an iPhone, a user agent): the profile answers', !NAMES.test(lc), lc.match(new RegExp(NAMES.source, 'gi')));
check('onWindows and onMac are the profile\'s own (re-exported for the old importers)', C.onWindows === P.onWindows && C.onMac === P.onMac);
check('the search alone answers for the device the lanes are asked about: Windows',
  D.askingAs(P.devAsk({ ua: UA.winChrome }), () => JSON.stringify(C.lookPaletteChoice(''))) === JSON.stringify({ on: false, why: 'windows' }));
check('...a Mac', D.askingAs(P.devAsk({ ua: UA.macSafari, touch: 0 }), () => C.lookPaletteChoice('').why) === 'mac');
check('...an iPad asking for the desktop site', D.askingAs(P.devAsk({ ua: UA.ipad, touch: 5 }), () => C.lookPaletteChoice('').why) === 'default');
check('...and the address still first', D.askingAs(P.devAsk({ ua: UA.winChrome }), () => C.lookPaletteChoice('?lookpalette=1').why) === 'address');
check('this process (node, Linux): built, the page\'s own answers handed to the lanes', C.lookPaletteChoice('').on === true);
check('the profile\'s `palette` is this choice (handed in, never imported: one way only)',
  P.deviceProfile().palette === 'on' && !/lookPaletteChoice/.test(code(src('src/game/deviceProfile.js')).replace(/useLookChoice/g, '')));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
