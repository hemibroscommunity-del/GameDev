/* ═══ v2.3.3838: THE LOOK PALETTE IS NOT BUILT ON WINDOWS ═══
 * (src/game/lookPaletteChoice.js)
 *
 * The owner's Windows laptop froze at 75% of the loading screen for 5-10
 * minutes in Chrome and Firefox: ANGLE's Direct3D compiler took that long
 * over the look palette's fragment program.  So a Windows browser draws the
 * old way; phones keep the palette.
 *
 *   1. Windows browsers (Chrome, Edge, Firefox, Chromium's own platform) are
 *      off ('windows'); an iPhone, an iPad, Android, a Mac and Linux are on;
 *   2. the address wins either way: `lookpalette=0` off anywhere,
 *      `lookpalette=1` on even on Windows (QA);
 *   3. the wiring, read from the source: lookPalette.js's switch is this
 *      choice (with the userAgent and Chromium's platform), and the QA probe
 *      reports why.
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

const UA = {
  winChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  winEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  winFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};

/* ── 1. Windows off, everything else on ── */
for (const k of ['winChrome', 'winEdge', 'winFirefox']) {
  const c = C.lookPaletteChoice('', UA[k], undefined);
  check(`${k}: not built (windows)`, c.on === false && c.why === 'windows', c);
}
check('Chromium says its platform is Windows: not built', C.lookPaletteChoice('', 'Mozilla/5.0', 'Windows').on === false);
for (const k of ['iphone', 'ipad', 'android', 'macChrome', 'linux']) {
  const c = C.lookPaletteChoice('', UA[k], k === 'android' ? 'Android' : k === 'macChrome' ? 'macOS' : undefined);
  check(`${k}: built (default)`, c.on === true && c.why === 'default', c);
}
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
check('its switch is the choice, with the userAgent and Chromium\'s platform', /lookPaletteChoice\(window\.location\.search \|\| '', nav && nav\.userAgent, nav && nav\.userAgentData && nav\.userAgentData\.platform\)/.test(lp)
  && /const _wanted = wantedByAddress\(\);/.test(lp));
check('the program is built only when wanted (the prewarm asks _wanted first)', /function prewarmProgram\(\) \{\s*const r = paletteRendererOf\(\);\s*if \(!_wanted \|\|/.test(lp));
check('the QA probe says why', /why: _why/.test(lp));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
