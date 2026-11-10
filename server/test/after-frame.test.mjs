/* ═══ v2.3.4360: A MARK ON SOMETHING IN THE WORLD IS MOVED AFTER EVERY FRAME ═══
 *
 * The owner, 2026-11-10: "the reticle around mayor bro is pretty obnoxious
 * with movement (the frames are gritty)".
 *
 * The first steps' gold box and card on Mayor Bro (src/ui/mobile/QuestCoach.jsx)
 * and the big arrow at him (src/ui/guideArrow.js) are page elements over the
 * canvas.  They found him 12 and 4 times a second; the world is drawn every
 * frame.  src/ui/afterFrame.js is the hook they now follow him by: the game's
 * loop calls it after the renderer, and a follower moves its mark from the
 * camera that frame was drawn with.
 *
 * Here: the hook itself (pure, node runs it), and that the three callers are
 * wired the way the fix depends on.  The frames themselves are a phone's:
 * tools/qa/mp/mp-mayormark.mjs.
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* ── 1. the hook ── */
{
  const AF = await import('../../src/ui/afterFrame.js');
  check('1a nobody listening: a frame runs nothing and throws nothing; the game is now "drawing frames"',
    (() => { try { AF.runAfterFrame({}); return AF.framesRunning(); } catch (e) { return false; } })());
  const seen = [];
  const offA = AF.onAfterFrame((S) => seen.push(['a', S.n]));
  const offB = AF.onAfterFrame((S) => seen.push(['b', S.n]));
  AF.runAfterFrame({ n: 1 });
  check('1b every listener is called once a frame, with the frame\'s state', JSON.stringify(seen) === '[["a",1],["b",1]]', seen);
  offA();
  AF.runAfterFrame({ n: 2 });
  check('1c a listener that stopped is not called again; the other still is', JSON.stringify(seen.slice(2)) === '[["b",2]]', seen);
  offA(); offB(); offB();
  /* a mark must never stop the frame */
  let after = 0;
  const offBad = AF.onAfterFrame(() => { throw new Error('a mark went wrong'); });
  const offGood = AF.onAfterFrame(() => { after++; });
  let threw = false;
  try { AF.runAfterFrame({}); } catch (e) { threw = true; }
  check('1d a listener that throws stops neither the frame nor the listeners after it', !threw && after === 1);
  offBad(); offGood();
  check('1e what is not a function is not listened to, and its "stop" is harmless',
    (() => { try { AF.onAfterFrame(null)(); AF.onAfterFrame('x')(); AF.runAfterFrame({}); return true; } catch (e) { return false; } })());
  /* whole device pixels: with no window a pixel is a pixel; on a 3x phone a third */
  check('1f a length goes on a whole device pixel (no window: a CSS pixel)', AF.onDevicePx(10.4) === 10 && AF.onDevicePx(-3.6) === -4 && AF.onDevicePx(0) === 0);
  globalThis.window = { devicePixelRatio: 3 };
  const third = AF.onDevicePx(10.4);
  delete globalThis.window;
  check('1g ...on a 3x phone, the nearest third of a CSS pixel', Math.abs(third - 31 / 3) < 1e-9, third);
  /* frames stop: a follower falls back to its own clock */
  const realNow = Date.now;
  AF.runAfterFrame({});
  const t = realNow();
  Date.now = () => t + 1900;
  const still = AF.framesRunning();
  Date.now = () => t + 2100;
  const gone = AF.framesRunning();
  Date.now = realNow;
  check('1h frames are "running" for 2 s after the last (a slow machine\'s frame can be most of a second), not after', still && !gone);
}

/* ── 2. the wiring ── */
{
  const bt = src('src/ui/BroTown.jsx'), ga = src('src/ui/guideArrow.js'), qc = src('src/ui/mobile/QuestCoach.jsx');
  check('2a the game\'s loop calls the hook once a frame, AFTER the renderer (the camera that frame was drawn with)',
    /renderFrame\(S, \{ pixiRef: pixiRef, canvas: canvas, nfts: nfts, perfNow: _perfNow, perfDelta: _perfDelta \}\);\s*(\/\*[\s\S]*?\*\/\s*)?runAfterFrame\(S\);/.test(bt)
    && (bt.match(/runAfterFrame\(/g) || []).length === 1);
  /* the arrow */
  check('2b the arrow listens while it is started and stops with it',
    /_stopFollow = onAfterFrame\(followFrame\);/.test(ga) && /if \(_stopFollow\) \{ _stopFollow\(\); _stopFollow = null; \}/.test(ga));
  check('2c ...follows only the Mayor\'s lesson, by the same sums the tick uses, and writes nothing on a frame he did not move in',
    /if \(!_followS \|\| !_el \|\| !_side \|\| qa\.lesson !== 'mayor'\) return;/.test(ga) && /const mr = S \? mayorScreenRect\(S\) : null;/.test(ga)
    && /if \(left === _followAt\.left && top === _followAt\.top\) return;/.test(ga));
  check('2d ...on whole device pixels with no glide while the game draws frames; any other lesson glides to its control as before',
    /follow = !!follow && framesRunning\(\);/.test(ga) && /const glide = follow \? 'none' : 'left \.2s ease-out, top \.2s ease-out';/.test(ga)
    && /const left = follow \? onDevicePx\(sp\.left\) : Math\.round\(sp\.left\);/.test(ga)
    && /place\(\{ left: mr\.left[^)]*\}, '', true, true\);/.test(ga) && /place\(hit\.r, guideWords\(id, hit\.sel\)\);/.test(ga));
  /* the coach */
  check('2e the coach\'s ring is in a holder, and the holder is what moves (the ring\'s own transform is its pulse)',
    /'data-coach-follow': view\.id,/.test(qc) && /el\.style\.transform = \(dx \|\| dy\) \? 'translate3d\(' \+ dx \+ 'px,' \+ dy \+ 'px,0\)' : '';/.test(qc)
    && /@keyframes bt-coach-pulse \{[^}]*transform: scale/.test(src('src/styles/game.css').replace(/\n/g, ' ')));
  check('2f ...moved after every frame, and set right before the paint whenever React draws it again',
    /return onAfterFrame\(function \(S\) \{ coachFollow\(followRef\.current, followElRef\.current, cardRef\.current, S \|\| \(stateRef && stateRef\.current\)\); \}\);/.test(qc)
    && /React\.useLayoutEffect\(function \(\) \{\s*const f = followRef\.current, el = followElRef\.current, card = cardRef\.current;[\s\S]{0,700}coachFollow\(f, el, card, stateRef && stateRef\.current\);\s*\}, \[view\]\);/.test(qc));
  check('2g ...only for a lesson on something in the world, and nothing written on a frame it did not move in',
    /if \(!view \|\| !L \|\| typeof L\.worldRect !== 'function' \|\| !\(view\.rect\.width > 0\)\) \{ f\.L = null; f\.base = null; return; \}/.test(qc)
    && /if \(dx === f\.dx && dy === f\.dy\) return;/.test(qc) && /if \(cx === f\.cx && cy === f\.cy\) return;/.test(qc));
  /* the card's sums are the render's own */
  check('2h the card is moved by the render\'s own sums for its left (inside the world\'s span) and its bottom (the clearances, the cap)',
    /ideal: r\.left \+ r\.width \/ 2 - 110, lo: _wx \+ 8, hi: Math\.max\(_wx \+ 8, _wx \+ _pw - 228\),/.test(qc)
    && /clear: Math\.max\(bandClear, broClear\), cap: Math\.max\(6, boxH - 120\),/.test(qc)
    && /Math\.max\(_wx \+ 8, r\.left \+ r\.width \/ 2 - 110\),\s*Math\.max\(_wx \+ 8, _wx \+ _pw - 228\)\);/.test(qc)
    && /Math\.max\(6, boxH - \(r\.top - pad - 10\)\),\s*bandClear, broClear\),\s*Math\.max\(6, boxH - 120\)\)/.test(qc)
    && /const bot = function \(top\) \{ return Math\.min\(Math\.max\(Math\.max\(6, k\.boxH - \(top - k\.pad - 10\)\), k\.clear\), k\.cap\); \};/.test(qc));
  check('2i the walk that picks the lesson is as it was: a mark is drawn again when it has moved 2 px',
    /const same = \(!next && !cur\) \|\| \(next && cur && next\.id === cur\.id\s*&& next\.body === cur\.body\s*&& Math\.abs\(next\.rect\.left - cur\.rect\.left\) < 2/.test(qc));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
