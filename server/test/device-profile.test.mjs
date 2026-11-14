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
 *
 * v2.3.5121: the device class (docs/SHAPES.md part 6), the field report's
 * cell:
 *
 *   5. THE BINS: raw facts land in the closed lists (an iPhone, a computer,
 *      this QA box, the edges), every value of the class is on its list, the
 *      class has the twelve fields and its key, and `fill` is 'none';
 *   6. ASKED OF THE DEVICE: devClass() reads a renderer's context and size,
 *      asks the chip once a context, is null with no context or a lost one,
 *      and keeps nothing of the chip's name but `soft`;
 *   7. FACTS ONLY: the class's code reads no user agent, platform or clock;
 *      its software list is paletteTex.js's own; no other file in src/ asks
 *      the chip its middle precision (the class's one new question).
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   5. classOf: `prec: _num(f.precBits) >= 10 ? 32 : 16`          -> FAIL 5
 *   6. chipFacts: `soft: name,` in place of `soft: SOFT_GL.test(name),` -> FAIL 6
 *   7. devClass: `cores: nav ? nav.userAgent.length : 0,`           -> FAIL 7
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { FINE_QUERY, COMPUTER_FRAME_QUERY, fineInput, computerFrame, onIOS, deviceProfile,
  DEV_CLASS, DEV_CLASS_FIELDS, classOf, classKey, devClass, SOFT_GL } from '../../src/game/deviceProfile.js';
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

/* ── 5. THE BINS (v2.3.5121) ── */
const onList = (c) => DEV_CLASS_FIELDS.every((k) => DEV_CLASS[k].includes(c[k]));
const shapeOk = (c) => c && Object.keys(c).sort().join() === [...DEV_CLASS_FIELDS, 'key'].sort().join();
check('5. twelve fields, in SHAPES part 6\'s order', DEV_CLASS_FIELDS.join() === 'gl,soft,maxTex,prec,units,mp,dpr,hz,fill,input,frame,cores', DEV_CLASS_FIELDS);
{
  /* an iPhone: WebGL 2, a 16-bit middle precision, 430 x 932 CSS px at 3 (3.6 megapixels), 120 a second, six threads */
  const c = classOf({ gl2: true, soft: false, maxTex: 16384, precBits: 10, units: 16, w: 430, h: 932, dpr: 3, hz: 119.6, fine: false, frame: false, cores: 6 });
  check('5. an iPhone\'s facts: 2-0-16384-16-16-4-3-120-none-touch-0-4', c.key === '2-0-16384-16-16-4-3-120-none-touch-0-4' && shapeOk(c) && onList(c), c);
  /* a computer: 1920 x 1080 at 1 (2.07 megapixels), 59.94 a second, twelve threads, 32 units */
  const d = classOf({ gl2: true, soft: false, maxTex: 16384, precBits: 23, units: 32, w: 1920, h: 1080, dpr: 1, hz: 59.94, fine: true, frame: true, cores: 12 });
  check('5. a computer\'s facts: 2-0-16384-32-32-3-1-60-none-mouse-1-8', d.key === '2-0-16384-32-32-3-1-60-none-mouse-1-8', d);
  /* this QA box: software, WebGL 1, the pacer not settled yet */
  const q = classOf({ gl2: false, soft: true, maxTex: 8192, precBits: 23, units: 16, w: 390, h: 844, dpr: 1, hz: null, fine: false, frame: false, cores: 4 });
  check('5. the QA box: software, WebGL 1, a rate not yet known reads \'other\'', q.gl === 1 && q.soft === 1 && q.hz === 'other' && q.mp === 1, q);
  const edges = classOf({ maxTex: 1024, units: 4, precBits: 0, w: 5000, h: 4000, dpr: 2.625, hz: 75, cores: undefined });
  check('5. the edges: under a list its first, over the megapixels 12, a ratio its nearest, 75 a second \'other\', no threads told 2',
    edges.maxTex === 2048 && edges.units === 8 && edges.prec === 16 && edges.mp === 12 && edges.dpr === 3 && edges.hz === 'other' && edges.cores === 2 && onList(edges), edges);
  check('5. 144 a second is 144; 100 is none of the rates', classOf({ hz: 143.9 }).hz === 144 && classOf({ hz: 100 }).hz === 'other');
  let all = true, bad = null;
  for (let i = 0; i < 400; i++) {
    const r = (n) => Math.random() * n;
    const f = { gl2: r(1) < 0.5, soft: r(1) < 0.5, maxTex: r(40000), precBits: r(30), units: r(64), w: r(4000), h: r(3000),
      dpr: r(5), hz: r(1) < 0.1 ? undefined : r(200), fine: r(1) < 0.5, frame: r(1) < 0.5, cores: r(40) };
    const c = classOf(f);
    if (!shapeOk(c) || !onList(c) || c.fill !== 'none' || c.key !== classKey(c)) { all = false; bad = { f, c }; break; }
  }
  check('5. four hundred random devices: every value on its list, `fill` always \'none\' (nothing is timed)', all, bad);
}

/* ── 6. ASKED OF THE DEVICE ── */
{
  const G = globalThis;
  const hadGl2 = 'WebGL2RenderingContext' in G;
  class FakeGl2 {}
  if (!hadGl2) G.WebGL2RenderingContext = FakeGl2;
  let asks = 0;
  const makeGl = (name, lost) => Object.assign(Object.create(G.WebGL2RenderingContext.prototype), {
    RENDERER: 0x1f01, MAX_TEXTURE_SIZE: 0x0d33, MAX_TEXTURE_IMAGE_UNITS: 0x8872, FRAGMENT_SHADER: 0x8b30, MEDIUM_FLOAT: 0x8df1,
    isContextLost: () => !!lost,
    getExtension: () => null,
    getParameter(p) { asks++; return p === 0x1f01 ? name : p === 0x0d33 ? 16384 : p === 0x8872 ? 16 : null; },
    getShaderPrecisionFormat() { asks++; return { precision: 10, rangeMin: 15, rangeMax: 15 }; },
  });
  const gl = makeGl('Apple GPU');
  const c = devClass({ renderer: { gl, screen: { width: 430, height: 932 } }, hz: 120 });
  check('6. a renderer\'s context and size: the class (no page here: touch, ratio 1)', c && c.gl === 2 && c.soft === 0 && c.maxTex === 16384 && c.prec === 16
    && c.units === 16 && c.mp === 1 && c.hz === 120 && c.input === 'touch' && c.frame === 0 && shapeOk(c) && onList(c), c);
  const before = asks;
  devClass({ renderer: { gl, screen: { width: 430, height: 932 } }, hz: 120 });
  check('6. the chip is asked once a context (its constants kept)', asks === before, { before, after: asks });
  const sw = devClass({ renderer: { gl: makeGl('Google SwiftShader'), screen: { width: 390, height: 844 } }, hz: null });
  check('6. a software chip is `soft`, and nothing of its name is kept', sw && sw.soft === 1 && sw.hz === 'other' && !/swift|google|apple/i.test(JSON.stringify(sw)), sw);
  check('6. a lost context: null (the report waits)', devClass({ renderer: { gl: makeGl('x', true), screen: { width: 1, height: 1 } } }) === null);
  check('6. no drawing context at all: null', devClass({ renderer: {} }) === null && devClass() === null);
  if (!hadGl2) delete G.WebGL2RenderingContext;
}

/* ── 7. FACTS ONLY ── */
{
  const src = readFileSync(new URL('../../src/game/deviceProfile.js', import.meta.url), 'utf8');
  const at = src.indexOf('THE DEVICE CLASS (docs/SHAPES.md part 6');
  const code = src.slice(at).replace(/\/\*[\s\S]*?\*\//g, '');
  check('7. the class\'s code reads no user agent, platform, vendor or clock', at > 0 && !/userAgent|platform|vendor|performance\.now|Date\.now|requestAnimationFrame/.test(code),
    (code.match(/userAgent|platform|vendor|performance\.now|Date\.now|requestAnimationFrame/g) || []));
  const pal = readFileSync(new URL('../../src/rendering/paletteTex.js', import.meta.url), 'utf8');
  const m = /const SOFTWARE_GL = (\/.*\/[a-z]*);/.exec(pal);
  check('7. its software list is paletteTex.js SOFTWARE_GL, written the same', m && m[1] === String(SOFT_GL), { paletteTex: m && m[1], here: String(SOFT_GL) });
  const root = new URL('../../src/', import.meta.url);
  const askers = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const u = new URL(name, dir);
      if (statSync(u).isDirectory()) walk(new URL(name + '/', dir));
      else if (/\.(js|jsx|mjs)$/.test(name) && /getShaderPrecisionFormat\s*\(/.test(readFileSync(u, 'utf8'))) askers.push(u.pathname.slice(root.pathname.length));
    }
  })(root);
  check('7. only the profile asks the chip its middle precision', askers.join() === 'game/deviceProfile.js', askers);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
