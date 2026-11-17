/* ═══ v2.3.5228: ONE PROGRAM OR THREE, AND HOW A LOOK IS MADE: KNOBS OF THE LANES ═══
 * TRAPS §225 (one case): a software renderer (this box's SwiftShader, Windows' WARP) keeps the three programs, so this box's frame rate never judges the one program; one case because judging a program by frames a second is a habit. Break: src/game/drawLanes.js: the program's `software` override taken out of OVERRIDES -> FAIL (tried 2026-11-17).
 * TRAPS §260 (one case): the program's choice for each kind of chip is today's (a phone the one, a computer and a software renderer the three), over a grid of 728 chips, computers and addresses; one case because a chip's own fault no check sees (the owner's phone judges a new program). Break: src/game/drawLanes.js: the program's `computer` override taken out of OVERRIDES -> FAIL (tried 2026-11-17).
 * (v2.3.5764: the two form lines, card V2.)
 *
 * (card O PR 8; grand plan 2.1 and 2.4; src/game/drawLanes.js, docs/LANES.md)
 *
 * Two choices made once behind the loading screen were each decided by a
 * device's NAME in their own file: paletteTex.js `oneBatchChoice` (one
 * drawing program for the world's sprites, or the three: a software
 * renderer's name, a Windows or Mac computer) and lookPaletteChoice.js (a
 * look coloured on the chip, or each baked: Windows, a Mac).  Now each is a
 * knob of the lanes (`program`: one | three; `look`: palette | baked), read
 * through laneKnob, and its fallbacks are OVERRIDES in drawLanes.js whose
 * questions (`when`) deviceProfile.js alone answers.  NOTHING A PLAYER SEES
 * CHANGES: every device gets the answer, and the `why`, it got before.
 * This suite holds that (oneBatchChoice had no node test before):
 *
 *   1. TODAY'S ANSWER, EVERY DEVICE: the card's five -- a software renderer,
 *      Windows, a Mac, an iPad asking for the desktop site, a phone -- get
 *      their old answers to both choices, with the facts the page hands each
 *      (the chip's name; the profile's windows and mac); and over a grid of
 *      chips, computers and addresses, each choice answers as a copy of it
 *      as it was (asWas: the code before this PR, kept here) does.
 *   2. THE QUESTIONS ARE THE PROFILE'S: every override's `when` is one of
 *      DEV_ASKS; devAsk answers each, for its device and not a phone's; the
 *      page's own answers are handed to the lanes by the profile (useDevAsk),
 *      and a page with none pins nothing.
 *   3. NO NAME DECIDES OUTSIDE THE PROFILE: paletteTex.js reads
 *      laneKnob('program') and lookPaletteChoice.js laneKnob('look'), and
 *      neither (nor drawLanes.js) names a device (no software list, no
 *      Windows, no Mac); the address still comes first in each.
 *   4. NOT RUNGS: neither knob is on an axis of the ladder; at the deepest
 *      rung both are their row; a pinned knob stays pinned at any rung.
 *   5. THE SWITCH ROWS: `?onebatch` and `lookpalette` name, as their
 *      fallback, functions deviceProfile.js exports (T's `fallback` column).
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   - the program's `computer` override taken out of OVERRIDES       -> FAIL 1 (Windows, Mac: 'default')
 *   - the two `program` rows swapped (computer before software)       -> FAIL 1 (WARP on Windows: 'computer')
 *   - devAsk: `if (when === 'mac') return false;`                    -> FAIL 1, 2
 *   - paletteTex.js oneBatchChoice keeps a `/swiftshader/i.test(renderer)` -> FAIL 3
 *   - `program` put on the chip axis's end as a rung                 -> FAIL 4
 *   - the `?onebatch` row's fallback 'SOFTWARE_GL in src/game/deviceProfile.js' -> FAIL 5
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { register } from 'node:module';

/* Server CI installs only server/'s packages: 'pixi.js' is not there to import
   (this suite's first push failed on it; glint-peer-slots.test has the same
   note).  paletteTex.js reaches it for its batcher; the choice read here draws
   nothing.  So every name src/ imports from it is a do-nothing stand-in, the
   same here as in CI, served before paletteTex.js is loaded. */
{
  const names = new Set();
  (function walk(d) {
    for (const f of readdirSync(d)) {
      const u = new URL(f, d);
      if (statSync(u).isDirectory()) walk(new URL(f + '/', d));
      else if (/\.(js|jsx|mjs)$/.test(f)) {
        for (const m of readFileSync(u, 'utf8').matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]pixi\.js['"]/g)) {
          for (const x of m[1].split(',')) { const k = x.trim().split(/\s+as\s+/)[0].trim(); if (/^[A-Za-z_$][\w$]*$/.test(k)) names.add(k); }
        }
      }
    }
  })(new URL('../../src/', import.meta.url));
  const STUB = 'const P = new Proxy(function () {}, { get: (t, k) => (k === "prototype" ? t.prototype : k === Symbol.toPrimitive ? () => 0 : (typeof k === "symbol" ? undefined : P)), apply: () => P, construct: () => ({}) });\n'
    + [...names].map((n) => `export const ${n} = P;`).join('\n');
  register('data:text/javascript,' + encodeURIComponent(
    `export async function resolve(s, c, next) {
       if (s === 'pixi.js') return { url: 'data:text/javascript,' + encodeURIComponent(${JSON.stringify(STUB)}), shortCircuit: true };
       return next(s, c);
     }`));
}

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');
const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');

const D = await import('../../src/game/drawLanes.js');
const P = await import('../../src/game/deviceProfile.js');
const L = await import('../../src/game/lookPaletteChoice.js');
const T = await import('../../src/rendering/paletteTex.js');
const { SWITCHES } = await import('../../tools/guards/lib/switches.mjs');

/* ── the two choices AS THEY WERE (v2.3.5016, v2.3.3842: the code before this PR) ── */
const asWas = {
  SOFTWARE_GL: /swiftshader|llvmpipe|softpipe|software|basic render|\bwarp\b/i,
  program(search, renderer, os) {
    const m = /(^|[?&])onebatch=([01])(&|$)/.exec(search || '');
    if (m) return { on: m[2] === '1', why: 'address' };
    if (asWas.SOFTWARE_GL.test(renderer || '')) return { on: false, why: 'software' };
    if (os && (os.windows || os.mac)) return { on: false, why: 'computer' };
    return { on: true, why: 'default' };
  },
  onWindows(ua, platform) {
    if (typeof platform === 'string' && /^windows$/i.test(platform.trim())) return true;
    return /\bWindows\b|\bWin64\b|\bWin32\b/.test(typeof ua === 'string' ? ua : '');
  },
  onMac(ua, platform, touchPoints) {
    const s = typeof ua === 'string' ? ua : '';
    if (/\b(iPhone|iPad|iPod)\b/.test(s) || Number(touchPoints) > 1) return false;
    if (typeof platform === 'string' && /^macos$/i.test(platform.trim())) return true;
    return /\bMacintosh\b/.test(s);
  },
  look(search, ua, platform, touchPoints) {
    const m = /(^|[?&])lookpalette=([01])(&|$)/.exec(typeof search === 'string' ? search : '');
    if (m) return { on: m[2] === '1', why: 'address' };
    if (asWas.onWindows(ua, platform)) return { on: false, why: 'windows' };
    if (asWas.onMac(ua, platform, touchPoints)) return { on: false, why: 'mac' };
    return { on: true, why: 'default' };
  },
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const UA = {
  winChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  winFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  ipadDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};
const CHIP = {
  swiftshader: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
  llvmpipe: 'llvmpipe (LLVM 15.0.7, 256 bits)',
  warp: 'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)',
  nvidiaWin: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)',
  appleM2: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)',
  appleGpu: 'Apple GPU',
  adreno: 'Adreno (TM) 740',
  mali: 'Mali-G78',
  none: '',
};

/* a device as the page hands it to each choice: the program gets the chip's
   name and deviceProfile()'s { windows, mac } (setOneBatchRenderer); the look
   gets the user agent, Chromium's platform and the touch points */
function both(d, search = '') {
  const os = { windows: P.onWindows(d.ua, d.platform), mac: P.onMac(d.ua, d.platform, d.touch) };
  return {
    program: T.oneBatchChoice(search, d.chip, os),
    look: L.lookPaletteChoice(search, d.ua, d.platform, d.touch),
  };
}
function bothAsWas(d, search = '') {
  const os = { windows: asWas.onWindows(d.ua, d.platform), mac: asWas.onMac(d.ua, d.platform, d.touch) };
  return { program: asWas.program(search, d.chip, os), look: asWas.look(search, d.ua, d.platform, d.touch) };
}

/* ── 1. today's answer, every device ── */
const FIVE = [
  ['a software renderer (the QA box: Linux, SwiftShader)', { ua: UA.linux, platform: 'Linux', touch: 0, chip: CHIP.swiftshader },
    { program: { on: false, why: 'software' }, look: { on: true, why: 'default' } }],
  ['Windows (Chrome, an NVIDIA chip through ANGLE)', { ua: UA.winChrome, platform: 'Windows', touch: 0, chip: CHIP.nvidiaWin },
    { program: { on: false, why: 'computer' }, look: { on: false, why: 'windows' } }],
  ['a Mac (Safari, Apple M2)', { ua: UA.macSafari, platform: undefined, touch: 0, chip: CHIP.appleM2 },
    { program: { on: false, why: 'computer' }, look: { on: false, why: 'mac' } }],
  ['an iPad asking for the desktop site (says Macintosh, has touch points)', { ua: UA.ipadDesktop, platform: undefined, touch: 5, chip: CHIP.appleGpu },
    { program: { on: true, why: 'default' }, look: { on: true, why: 'default' } }],
  ['a phone (an iPhone)', { ua: UA.iphone, platform: undefined, touch: 5, chip: CHIP.appleGpu },
    { program: { on: true, why: 'default' }, look: { on: true, why: 'default' } }],
];
for (const [name, d, want] of FIVE) {
  const got = both(d);
  check(`1. ${name}: the program ${want.program.on ? 'one' : 'three'} (${want.program.why}), the look ${want.look.on ? 'palette' : 'baked'} (${want.look.why}), as before`,
    same(got, want) && same(bothAsWas(d), want), { got, asWas: bothAsWas(d) });
}
check('1. an Android phone: one program, the palette', same(both({ ua: UA.android, platform: 'Android', touch: 5, chip: CHIP.adreno }),
  { program: { on: true, why: 'default' }, look: { on: true, why: 'default' } }));
check('1. Windows drawing in software (WARP): the three for the software, before the computer (the override\'s order is the old order)',
  same(both({ ua: UA.winFirefox, platform: undefined, touch: 0, chip: CHIP.warp }).program, { on: false, why: 'software' }));
check('1. the address first, on every device: ?onebatch=1 on Windows one, ?lookpalette=1 on a Mac the palette, ?onebatch=0 on a phone three',
  same(both(FIVE[1][1], '?onebatch=1').program, { on: true, why: 'address' })
  && same(both(FIVE[2][1], '?world=wheel&lookpalette=1').look, { on: true, why: 'address' })
  && same(both(FIVE[4][1], '?onebatch=0').program, { on: false, why: 'address' }));
{
  /* the grid: every chip, computer and address against the copy as it was */
  const searches = ['', '?onebatch=0', '?onebatch=1', '?world=wheel&onebatch=1', '?onebatch=2', '?xonebatch=1', '?lookpalette=0', '?lookpalette=1&onebatch=0'];
  const oses = [null, undefined, {}, { windows: true }, { mac: true }, { windows: true, mac: true }, { windows: false, mac: false }];
  const off = [];
  let n = 0;
  for (const s of searches) for (const c of [...Object.values(CHIP), undefined, 'Software Rasterizer', 'WARP', 'Microsoft Basic Render Driver']) for (const os of oses) {
    n++;
    const a = T.oneBatchChoice(s, c, os), b = asWas.program(s, c, os);
    if (!same(a, b)) off.push([s, c, os, a, b]);
  }
  check(`1. the program, a grid of ${n}: every answer and why as it was`, off.length === 0, off.slice(0, 4));
  const off2 = [];
  let m = 0;
  for (const s of searches) for (const ua of [...Object.values(UA), undefined, '', 'Mozilla/5.0 (X11; Linux) Winamp-ish']) {
    for (const plat of [undefined, 'Windows', 'macOS', 'Linux', 'Android', ' windows ']) for (const touch of [undefined, 0, 1, 5]) {
      m++;
      const a = L.lookPaletteChoice(s, ua, plat, touch), b = asWas.look(s, ua, plat, touch);
      if (!same(a, b)) off2.push([s, ua, plat, touch, a, b]);
    }
  }
  check(`1. the look, a grid of ${m}: every answer and why as it was`, off2.length === 0, off2.slice(0, 4));
  const off3 = [];
  for (const ua of [...Object.values(UA), undefined, '']) for (const plat of [undefined, 'Windows', 'macOS', 'Linux']) for (const touch of [undefined, 0, 5]) {
    if (P.onWindows(ua, plat) !== asWas.onWindows(ua, plat) || P.onMac(ua, plat, touch) !== asWas.onMac(ua, plat, touch)) off3.push([ua, plat, touch]);
  }
  check('1. the profile\'s onWindows and onMac answer as lookPaletteChoice.js\'s did', off3.length === 0, off3.slice(0, 4));
}

/* ── 2. the questions are the profile's ── */
{
  const whens = D.OVERRIDES.map((o) => o.when);
  check('2. every override asks a question of DEV_ASKS', D.OVERRIDES.length === 4 && whens.every((w) => D.DEV_ASKS.includes(w)), whens);
  const comp = P.devAsk({ renderer: CHIP.nvidiaWin, ua: UA.winChrome, platform: 'Windows', touch: 0 });
  const mac = P.devAsk({ renderer: CHIP.appleM2, ua: UA.macSafari, touch: 0 });
  const soft = P.devAsk({ renderer: CHIP.swiftshader, ua: UA.linux, platform: 'Linux', touch: 0 });
  const phone = P.devAsk({ renderer: CHIP.appleGpu, ua: UA.iphone, touch: 5 });
  check('2. devAsk answers each for its device: Windows (windows, computer), a Mac (mac, computer), software (software)',
    comp('windows') && comp('computer') && !comp('mac') && !comp('software')
    && mac('mac') && mac('computer') && !mac('windows')
    && soft('software') && !soft('computer'));
  check('2. ...and none for a phone, nor a question off the list', D.DEV_ASKS.every((w) => phone(w) === false) && comp('tablet') === false && comp(undefined) === false);
  check('2. a caller holding the profile\'s answers ({ windows, mac }) is taken at its word', P.devAsk({ windows: true })('computer') && !P.devAsk({ windows: false, mac: false, ua: UA.winChrome })('computer'));
  check('2. pinFor: a pin for the device whose answers are given, none with no answers', D.pinFor('look', mac).when === 'mac' && D.pinFor('look', phone) === null && D.pinFor('look', undefined) === null
    && D.pinFor('program', comp).when === 'computer' && D.pinFor('rate', comp) === null);
  check('2. the page\'s own answers are the profile\'s (handed in: node, Linux, no chip: nothing pinned, today\'s row)',
    D.pinOf('program') === null && D.pinOf('look') === null && D.laneKnob('program') === 'one' && D.laneKnob('look') === 'palette');
  check('2. askingAs is a scope: the page\'s answers again after it, even when it throws',
    (() => { try { D.askingAs(comp, () => { throw new Error('x'); }); } catch (e) { /* thrown */ } return D.pinOf('program') === null; })()
    && D.askingAs(comp, () => D.laneKnob('program')) === 'three' && D.laneKnob('program') === 'one');
  const prof = code(src('src/game/deviceProfile.js'));
  check('2. the profile hands its answers to the lanes (useDevAsk), once', (prof.match(/\buseDevAsk\(/g) || []).length === 1);
}

/* ── 3. no name decides outside the profile ── */
{
  /* a name, as code reads it: a system's or a browser's name (as a word,
     its case: `windows` / `mac` are the profile's answers, held as keys), a
     software chip's (any case), the user agent; words in a quoted string
     (a knob's `say`, an override's `why`) decide nothing and are left out */
  const OS = /\b(Windows|Win64|Win32|Macintosh|macOS|iPhone|iPad|iPod)\b|userAgent|navigator|SOFTWARE_GL|SOFT_GL/;
  const CHIPS = /swiftshader|llvmpipe|softpipe|basic render|\bwarp\b/i;
  const NAMES = { test: (t) => OS.test(t) || CHIPS.test(t), source: OS.source + '|' + CHIPS.source };
  const unquote = (t) => t.replace(/'(?:[^'\\\n]|\\.)*'/g, "''").replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
  const pal = code(src('src/rendering/paletteTex.js'));
  const at = pal.indexOf('export function oneBatchChoice(');
  const body = at < 0 ? '' : pal.slice(at, pal.indexOf('\n}\n', at) + 2);
  check("3. oneBatchChoice reads laneKnob('program'), the address first", /\blaneKnob\('program'\)/.test(body) && body.indexOf('onebatch=') < body.indexOf("laneKnob('program')"), body.slice(0, 300));
  check('3. ...and paletteTex.js names no device (no software list, no Windows, no Mac)', !NAMES.test(unquote(pal)), unquote(pal).match(new RegExp(NAMES.source, 'gi')));
  const lc = code(src('src/game/lookPaletteChoice.js'));
  check("3. lookPaletteChoice.js reads laneKnob('look'), the address first, and names no device", /\blaneKnob\('look'\)/.test(lc)
    && lc.indexOf('lookpalette=') < lc.indexOf("laneKnob('look')") && !NAMES.test(unquote(lc)), unquote(lc).match(new RegExp(NAMES.source, 'gi')));
  const dl = unquote(code(src('src/game/drawLanes.js')));
  check('3. drawLanes.js names no device either (its overrides ask DEV_ASKS)', !NAMES.test(dl), dl.match(new RegExp(NAMES.source, 'gi')));
}

/* ── 4. not rungs ── */
{
  const onAxis = Object.values(D.AXES).flat().filter((r) => r.knob === 'program' || r.knob === 'look');
  check('4. neither knob is on an axis of the ladder (chosen once behind the loading screen)', onAxis.length === 0, onAxis);
  const deep = { work: 99, chip: 99, pixels: 99 };
  check('4. at the deepest rung of every lane, both are their row', D.LANE_NAMES.every((l) => D.knobAt(l, 'program', deep) === 'one' && D.knobAt(l, 'look', deep) === 'palette'));
  check('4. every lane\'s row is today\'s: one program, the palette', D.LANE_NAMES.every((l) => D.LANES[l].row.program === 'one' && D.LANES[l].row.look === 'palette'));
  check('4. both are moved (read through laneKnob), and the governor walks neither: no rung changes them',
    D.KNOBS.program.reader.moved && D.KNOBS.look.reader.moved && D.ladderDepth('full') === Object.values(D.AXES).flat().length);
  check('4. ...nor are they among its live knobs (the key a kept rung is stored under stays what it was)',
    !D.liveKnobs().includes('program') && !D.liveKnobs().includes('look') && D.MOVED_KNOBS.includes('program') && D.MOVED_KNOBS.includes('look'), D.liveKnobs());
}

/* ── 5. the switch rows ── */
{
  const row = (n) => SWITCHES.find((r) => r.name === n);
  const off = [];
  for (const n of ['?onebatch', 'lookpalette']) {
    const r = row(n);
    const m = r && /^(.*) in (\S+)$/.exec(r.fallback);
    if (!m || m[2] !== 'src/game/deviceProfile.js') { off.push([n, r && r.fallback]); continue; }
    const names = m[1].replace(/\([^)]*\)/g, '').split(',').map((s) => s.trim()).filter(Boolean);
    for (const f of names) if (typeof P[f] !== 'function') off.push([n, f + ' is not a function deviceProfile.js exports']);
  }
  check('5. ?onebatch\'s and lookpalette\'s fallbacks name functions deviceProfile.js exports', off.length === 0, off);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
