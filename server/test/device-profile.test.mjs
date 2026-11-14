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
 *      its software list is the one program's fallback too (v2.3.5228:
 *      paletteTex.js keeps no copy, it asks softRenderer); no other file in
 *      src/ asks the chip its middle precision (the class's one new question).
 *
 * v2.3.5227 (card O PR 7; card A's Found for O; 2.1's "facts only"): §3
 * also fails a CHIP OR BROWSER question outside the profile -- the largest
 * picture side through `getParameter`, the processor's threads, the user
 * agent, the chip's name (RENDERER, the unmasked one) -- but for the files
 * on STILL_ASKS (a census: the count only falls, each with its reason);
 *   3b. every answer the four movers get from the profile is the one they
 *       got by asking themselves (the chip's name three ways, the largest
 *       side and a lost context's, the threads, the user agent).
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   3. each of the four as it was (paletteTex.js's own rendererName; peerImpostor.js's
 *      gl.getParameter(gl.MAX_TEXTURE_SIZE); bodyBake.js's navigator.hardwareConcurrency;
 *      crashTrap.js's navigator.userAgent)                     -> FAIL 3, naming the file each time
 *   5. classOf: `prec: _num(f.precBits) >= 10 ? 32 : 16`          -> FAIL 5
 *   6. chipFacts: `soft: name,` in place of `soft: SOFT_GL.test(name),` -> FAIL 6
 *   7. devClass: `cores: nav ? nav.userAgent.length : 0,`           -> FAIL 7
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { FINE_QUERY, COMPUTER_FRAME_QUERY, fineInput, computerFrame, onIOS, deviceProfile,
  DEV_CLASS, DEV_CLASS_FIELDS, classOf, classKey, devClass, SOFT_GL, softRenderer, rendererName, maxTextureSize, cores, userAgent } from '../../src/game/deviceProfile.js';
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

/* v2.3.5140: the phone question (the pixel budget's class) */
{
  const { phoneScreen, PHONE_SHORT_MAX } = await import('../../src/game/deviceProfile.js');
  check('1. phoneScreen: an iPhone (390 x 844, touch) is a phone, sideways too', phoneScreen(390, 844, false) && phoneScreen(844, 390, false) && phoneScreen(440, 956, false));
  check('1. phoneScreen: an iPad (744 / 820 / 1024 short side) is not', !phoneScreen(744, 1133, false) && !phoneScreen(820, 1180, false) && !phoneScreen(1024, 1366, false));
  check('1. phoneScreen: a mouse is never a phone, whatever the screen', !phoneScreen(390, 844, true) && !phoneScreen(1920, 1080, true));
  check('1. phoneScreen: no screen read is not a phone', !phoneScreen(0, 0, false) && PHONE_SHORT_MAX === 600);
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
  /* v2.3.5227: a chip or browser question, and the files that still ask one (a census: only falls) */
  const CHIP_OR_BROWSER = [
    [/getParameter\([^)]*MAX_TEXTURE_SIZE/, 'asks the chip its largest picture side'],
    [/\.hardwareConcurrency\b/, 'asks the processor\'s threads'],
    [/\.userAgent\b/, 'reads the user agent'],
    [/UNMASKED_RENDERER_WEBGL|WEBGL_debug_renderer_info|getParameter\([^)]*\bRENDERER\b/, 'asks the chip its name'],
  ];
  const STILL_ASKS = Object.freeze({
    'networking/index.js': 'the identity\'s fingerprint parts (the user agent): who, not what it can draw',
    'debug/perfHud.js': 'the strip\'s chip name (the owner\'s eyes, `?perf=1`)',
    'debug/DebugOverlay.jsx': 'the debug overlay\'s "UA" cell',
  });
  /* v2.3.5228: rendering/lookPalette.js left the census (card O PR 8: the
     look's choice asks the profile for this page's device) */
  const STILL_LINE = 3;   /* v2.3.5227: only falls */
  const bad = [];
  const still = new Set();
  for (const u of files) {
    const rel = u.pathname.slice(root.pathname.length);
    if (rel === 'game/deviceProfile.js') continue;
    const code = strip(readFileSync(u, 'utf8'));
    code.split('\n').forEach((line, i) => {
      if (/matchMedia\(\s*['"`]\(pointer:\s*(fine|coarse)\)/.test(line)) bad.push(rel + ':' + (i + 1) + ' asks matchMedia about the pointer');
      if (line.includes("'(pointer:fine) and (min-width:1000px)'")) bad.push(rel + ':' + (i + 1) + ' writes the computer-window query');
      if (/iPad\|iPhone|iPhone\|iPad/.test(line) && /navigator|userAgent|\bua\b/.test(line)) bad.push(rel + ':' + (i + 1) + ' tests the user agent for an iPhone by hand');
      for (const [re, what] of CHIP_OR_BROWSER) {
        if (!re.test(line)) continue;
        if (STILL_ASKS[rel]) still.add(rel);
        else bad.push(rel + ':' + (i + 1) + ' ' + what);
      }
    });
  }
  check('3. every device question in src/ is the profile\'s (game/deviceProfile.js): the pointer, the computer window, an iPhone, and (v2.3.5227) the chip\'s largest side, the threads, the user agent, the chip\'s name', bad.length === 0, bad);
  const gone = Object.keys(STILL_ASKS).filter((f) => !still.has(f));
  check(`3. ...but for the census of files that still ask (${Object.keys(STILL_ASKS).length}, the line ${STILL_LINE}: only falls), each still asking (one that no longer does leaves the list)`,
    Object.keys(STILL_ASKS).length <= STILL_LINE && gone.length === 0, { gone, still: [...still] });
}

/* ── 3b. THE SAME ANSWERS (v2.3.5227): the four movers' questions, asked of the profile ── */
{
  /* a renderer whose chip answers as each browser's does */
  const fakeR = ({ renderer, unmasked, ext = true, maxTex = 8192, lost = false }) => ({ gl: {
    RENDERER: 0x1F01, MAX_TEXTURE_SIZE: 0x0D33,
    getParameter(p) { if (lost) return null; if (p === 0x1F01) return renderer; if (p === 0x0D33) return maxTex; if (p === 0x9246) return unmasked; return null; },
    getExtension(n) { return ext && n === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 0x9246 } : null; },
  } });
  /* the copy paletteTex.js kept, as it was (its answer is the one to keep) */
  const asWas = (r) => {
    try {
      const gl = r && r.gl;
      if (!gl) return '';
      const plain = String(gl.getParameter(gl.RENDERER) || '');
      if (plain && !/^webkit webgl$/i.test(plain)) return plain;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : plain;
    } catch (e) { return ''; }
  };
  const chips = [
    fakeR({ renderer: 'Mali-G78 MC24' }),                                    /* Firefox: the name as RENDERER */
    fakeR({ renderer: 'WebKit WebGL', unmasked: 'Apple GPU' }),              /* Safari, Chrome: through the extension */
    fakeR({ renderer: 'WebKit WebGL', unmasked: 'x', ext: false }),          /* no extension: the plain answer */
    fakeR({ renderer: '', unmasked: 'ANGLE (SwiftShader)' }),                /* none plain */
    fakeR({ renderer: 'WebKit WebGL', unmasked: '' }),                       /* the extension, empty */
    null, {},
  ];
  check('3b. the chip\'s name: the profile\'s answer is paletteTex.js\'s old one, every way a browser gives it', chips.every((r) => rendererName(r) === asWas(r)), chips.map((r) => [rendererName(r), asWas(r)]));
  const peerWas = (R) => { let m = 4096; try { const gl = R && R.gl; if (gl) m = Math.min(m, gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096); } catch (e) { /* 4096 */ } return m; };
  const peerNow = (R) => { let m = 4096; try { if (R && R.gl) m = Math.min(m, maxTextureSize(R) || 4096); } catch (e) { /* 4096 */ } return m; };
  const sides = [fakeR({ maxTex: 16384 }), fakeR({ maxTex: 2048 }), fakeR({ maxTex: 0 }), fakeR({ lost: true }), null];
  check('3b. the largest side: peerImpostor.js\'s and crashTrap.js\'s answers as before (a lost context\'s too)',
    sides.every((R) => peerNow(R) === peerWas(R)) && sides.filter((R) => R && R.gl).every((R) => String(maxTextureSize(R)) === String(R.gl.getParameter(R.gl.MAX_TEXTURE_SIZE))),
    sides.map((R) => [peerNow(R), peerWas(R), R && R.gl ? maxTextureSize(R) : null]));
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const poolOf = (n) => Math.max(1, Math.min(2, (n || 2) - 2));
  check('3b. the threads: bodyBake.js\'s pool as before', poolOf(cores()) === poolOf(nav && nav.hardwareConcurrency) && cores() === (nav ? nav.hardwareConcurrency : undefined), { cores: cores() });
  check('3b. the user agent: crashTrap.js\'s as before', userAgent() === ((nav && nav.userAgent) || ''), userAgent());
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
  const strip7 = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
  /* v2.3.5228 (card O PR 8): the one program's fallback asks softRenderer,
     this list; paletteTex.js keeps no copy (the copy was held equal here) */
  const pal = strip7(readFileSync(new URL('../../src/rendering/paletteTex.js', import.meta.url), 'utf8'));
  check('7. its software list is the one program\'s fallback too: paletteTex.js keeps no list of its own, and softRenderer is SOFT_GL',
    !/SOFTWARE_GL|swiftshader|llvmpipe/i.test(pal) && /\bdevAsk\(/.test(pal)
      && softRenderer('Google SwiftShader') && softRenderer('llvmpipe (LLVM 15.0.7, 256 bits)') && softRenderer('Microsoft Basic Render Driver')
      && !softRenderer('Apple GPU') && !softRenderer('ANGLE (NVIDIA GeForce RTX 3060 Direct3D11)') && !softRenderer(undefined)
      && String(SOFT_GL) === '/swiftshader|llvmpipe|softpipe|software|basic render|\\bwarp\\b/i',
    { list: String(SOFT_GL) });
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
