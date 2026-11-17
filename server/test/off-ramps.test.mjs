/* ═══ v2.3.5232: THE OFF-RAMPS BECOME OVERRIDES OF THE LADDER (card O PR 12, grand plan 2.4) ═══
 * Each knob's off-ramp is read through the page's one reader
 * (src/game/switches.js), and one that fixes its knob pins it: the governor
 * never moves a pinned knob (drawLanes.js ADDRESS_PINS, liveKnobs).
 *   1. this page's address pins its knobs: `?onebatch=0` the three programs,
 *      `?lookpalette=0` every look baked, `?nowaves` the sea still; `?pace=0`
 *      and `?crowd=K` take the rate and the crowd off the ladder (their row);
 *      none of them live for the governor; with none, every knob live;
 *   2. a choice asking as another device (askingAs: the QA probes, the
 *      tests) reads no pin from this page's address;
 *   3. the moved reads answer as they did on a few addresses (the guard,
 *      switch-reader.test, holds the switches' to their old tests; these are
 *      the values': ?lane, ?govern, ?crowd, ?onebatch, ?lookpalette);
 *   4. the files ask the reader: no location.search left in them.
 * BREAK PROOF (rule 8), tried by hand once, 2026-11-17:
 *   - `&& !addressPinOf(k)` taken out of liveKnobs  -> FAIL 1 (rate, crowd, water live)
 *   - `if (_askNow) return null;` taken out          -> FAIL 2 (program 'three' asking as a phone)
 *   - governOn's `!r.swValue('lane')` made `!r.swValue('govern')` -> FAIL 3
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let passed = 0, failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
};

globalThis.location = { search: '' };
const D = await import('../../src/game/drawLanes.js');
const FP = await import('../../src/game/framePacer.js');
const CC = await import('../../src/game/crowdCap.js');
const LC = await import('../../src/game/lookPaletteChoice.js');

/* 1. the page's address pins */
{
  const at = (s) => { globalThis.location.search = s; D._liveKnobs(null); return { live: D.liveKnobs().slice(), program: D.laneKnob('program'), look: D.laneKnob('look'), water: D.laneKnob('water') }; };
  const none = at('');
  const all = at('?onebatch=0&lookpalette=0&nowaves&pace=0&crowd=20');
  check('1. with no off-ramp, every ladder knob is live (rate, pixels, crowd, shine, shadows, water, caches)', JSON.stringify(none.live) === JSON.stringify(['rate', 'pixels', 'crowd', 'shine', 'shadows', 'water', 'caches']), none);
  check('1. `?onebatch=0`, `?lookpalette=0`, `?nowaves` pin the three programs, every look baked, the sea still; `?pace=0`, `?crowd=20` take the rate and the crowd off the ladder (with the water)',
    all.program === 'three' && all.look === 'baked' && all.water === 'still' && JSON.stringify(all.live) === JSON.stringify(['pixels', 'shine', 'shadows', 'caches']), all);
  const one = at('?onebatch=1&lookpalette=1');
  check('1. `?onebatch=1`, `?lookpalette=1` pin the one program and the palette', one.program === 'one' && one.look === 'palette', one);
  const pin = (s, k) => { globalThis.location.search = s; return D.addressPinOf(k); };
  check('1. a word an off-ramp does not take pins nothing (`?pace=1`, `?onebatch=2`, `?crowd=`, `?crowd=abc`)', !pin('?pace=1', 'rate') && !pin('?onebatch=2', 'program') && !pin('?crowd=', 'crowd') && !pin('?crowd=abc', 'crowd'));
  /* the crowd's pin takes exactly the words crowdFromSearch takes (the sitting 25 gatekeeper's low) */
  const words = ['all', '0', 'off', '1', '12', '999', '-3', 'abc', '', ' 7 ', 'ALL'];
  const odd = words.filter((w) => !!pin('?crowd=' + encodeURIComponent(w), 'crowd') !== (CC.crowdFromSearch('?crowd=' + encodeURIComponent(w)) !== null));
  check('1. the crowd\'s pin and crowdFromSearch take the same words (' + words.length + ')', odd.length === 0, odd);
}

/* 2. asking as another device: no pin from this page's address */
{
  globalThis.location.search = '?onebatch=0';
  const as = D.askingAs(() => false, () => D.pinOf('program'));
  check('2. a choice asking as another device reads no pin from this page\'s address', as === null, as);
  globalThis.location.search = '';
}

/* 3. the values' reads answer as they did */
{
  const rows = [
    ['laneFromSearch ?lane=light', D.laneFromSearch('?lane=light'), 'light'],
    ['laneFromSearch ?lane=xyz', D.laneFromSearch('?lane=xyz'), null],
    ['laneFromSearch (none)', D.laneFromSearch(''), null],
    ['governOn ?govern=0&lane=full', FP.governOn('?govern=0&lane=full'), false],
    ['governOn ?govern=1&lane=full', FP.governOn('?govern=1&lane=full'), true],
    ['governOn ?lane=full', FP.governOn('?lane=full'), false],
    ['governOn ?lane= (empty: held, as before)', FP.governOn('?lane='), false],
    ['governOn (none)', FP.governOn(''), true],
    ['framePaceOn ?pace=off', FP.framePaceOn('?pace=off'), false],
    ['crowdFromSearch ?crowd=all', CC.crowdFromSearch('?crowd=all'), Infinity],
    ['crowdFromSearch ?crowd=12', CC.crowdFromSearch('?crowd=12'), 12],
    ['crowdFromSearch ?crowd=999', CC.crowdFromSearch('?crowd=999'), 500],
    ['crowdFromSearch ?crowd=x', CC.crowdFromSearch('?crowd=x'), null],
    ['crowdFromSearch (none)', CC.crowdFromSearch(''), null],
    ['lookPaletteChoice ?lookpalette=0', LC.lookPaletteChoice('?lookpalette=0').why, 'address'],
  ];
  const bad = rows.filter(([, got, want]) => got !== want).map(([n, got, want]) => `${n}: ${got} (want ${want})`);
  check(`3. the values\' reads answer as they did (${rows.length} addresses)`, bad.length === 0, bad);
}

/* 4. no location.search left in the knobs' files */
{
  const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
  const files = ['src/game/drawLanes.js', 'src/game/framePacer.js', 'src/game/crowdCap.js', 'src/game/renderRes.js', 'src/game/lookPaletteChoice.js'];
  const left = files.filter((f) => /location\.search/.test(code(readFileSync(join(ROOT, f), 'utf8'))));
  check('4. the knobs\' files read no location.search (the page\'s one reader answers): ' + files.join(', '), left.length === 0, left);
  /* the sitting 25 gatekeeper: the off-ramps of the knobs read in the drawing's files too, each through the reader */
  const ramps = [['src/rendering/lightfx/glint.js', 'sheen', 'swValue'], ['src/rendering/lightfx/lightFx.js', 'lightfx', 'swValue'], ['src/rendering/wheelWater.js', 'waves', 'swValue'],
    ['src/rendering/zoneTextures.js', 'stripslice', 'swValue'], ['src/rendering/wheelWater.js', 'nowaves', 'sw'], ['src/rendering/lightfx/sheenBatch.js', 'sheenpass', 'sw'], ['src/rendering/lightfx/shadows.js', 'shadowpass', 'sw']];
  const old = ramps.filter(([f, n, call]) => { const c = code(readFileSync(join(ROOT, f), 'utf8')); return new RegExp('\\[\\?&\\]\\)?' + n + '\\b').test(c) ||   /* an old read's pattern ([?&]name, (^|[?&])name), not a word in a message */ !c.includes(call + "('" + n + "')"); }).map(([f, n]) => f + ': ' + n);
  /* the gatekeeper's sitting 26: `?sheen` and `?lightfx` take the old pattern's words on the value (`=0.5` is `0`) */
  const tails = ['src/rendering/lightfx/glint.js', 'src/rendering/lightfx/lightFx.js'].filter((f) => !/const m = \/\^\(1\|0\|on\|off\)\\b\/\.exec\(w \|\| ''\);/.test(readFileSync(join(ROOT, f), 'utf8')));
  check('4. `?sheen` and `?lightfx` read their value by the old pattern (a tail after the word, as `=0.5`, still its word)', tails.length === 0, tails);
  check('4. every knob\'s off-ramp in the drawing\'s files asks the reader (' + ramps.length + ': ?sheen, ?lightfx, ?waves, ?stripslice, the passes\')', old.length === 0, old);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
