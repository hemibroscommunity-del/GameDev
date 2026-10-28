/* PICTURES THE GAME DRAWS ITSELF, KEPT ON THE GRAPHICS CHIP ONLY -- v2.3.3088,
 * and in a battle, v2.3.3698 (docs/specs/battle-memory.md).
 *
 * The owner, 2026-10-28: "The game definitely crashed because it ran out of
 * memory for me during intense battles (lots of weapon switching, props
 * destroyed, etc.)".  src/rendering/gpuOnly.js (no imports) runs here in node
 * against stand-in sources and a stand-in renderer:
 *   1. keepOnGpuOnly uploads a canvas picture and empties its canvas, takes it
 *      out of Pixi's collection, and leaves anything it cannot be sure of;
 *   2. emptyOnceDrawn leaves a picture the renderer has not drawn, lets go of
 *      the canvas of one it has, drops one destroyed or already let go of, and
 *      waits on a lost context;
 *   3. the wiring: a broken prop's pieces go to the chip as they are made, the
 *      heaps' cap is 4e6 pixels; the sword's and the bow's bodies, yours and
 *      another player's, wait to be drawn, the effects renderer looks every
 *      GPU_WAIT_MS and lets go of the waiting with the rest of its bakes. */
import { readFileSync } from 'fs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* a canvas: a size and a 2D context, as keepOnGpuOnly asks of one */
function fakeCanvas(w, h) {
  return { width: w, height: h, getContext: (t) => (t === '2d' ? { getImageData: () => ({ data: [] }) } : null) };
}
/* a source as Pixi's: its picture, and its copies on the chip by renderer uid */
function fakeSource(res) {
  return { resource: res, destroyed: false, autoGarbageCollect: true, _gpuData: Object.create(null), label: '' };
}
/* a renderer whose initSource uploads (makes its copy), as Pixi's does when it
   first binds a source; `lost` puts its context out */
function fakeRenderer(uid) {
  const R = {
    uid, uploads: 0, lost: false,
    gl: { isContextLost: () => R.lost },
    texture: {
      initSource(src) {
        if (!src._gpuData[uid]) { src._gpuData[uid] = { texture: {} }; R.uploads++; }
      },
    },
  };
  return R;
}

const G = await import('../../src/rendering/gpuOnly.js');

/* ── 1 ── */
{
  const R = fakeRenderer(7);
  const s = fakeSource(fakeCanvas(64, 32));
  const ok = G.keepOnGpuOnly(R, s);
  check('1: a canvas picture is uploaded and its canvas emptied',
    ok === true && R.uploads === 1 && !!s._gpuData[7] && s.resource.width === 0 && s.resource.height === 0, { ok, uploads: R.uploads });
  check('1: and taken out of Pixi\'s collection (an emptied canvas would be uploaded blank)', s.autoGarbageCollect === false);
  const img = fakeSource({ width: 64, height: 32 });   /* no getContext: a file's picture */
  check('1: a picture that is not a canvas is left as it is', G.keepOnGpuOnly(R, img) === false && img.resource.width === 64);
  const nope = fakeSource(fakeCanvas(8, 8));
  const R2 = { uid: 9, texture: { initSource() { /* no copy made */ } } };
  check('1: a canvas whose copy did not land on THIS renderer keeps its canvas', G.keepOnGpuOnly(R2, nope) === false && nope.resource.width === 8);
  const dead = fakeSource(fakeCanvas(8, 8)); dead.destroyed = true;
  check('1: a destroyed source is left alone', G.keepOnGpuOnly(R, dead) === false && dead.resource.width === 8);
}

/* ── 2 ── */
{
  const R = fakeRenderer(3);
  const drawn = fakeSource(fakeCanvas(100, 50));
  const waiting = fakeSource(fakeCanvas(100, 50));
  const gone = fakeSource(fakeCanvas(100, 50)); gone.destroyed = true;
  const empty = fakeSource(fakeCanvas(0, 0));
  const pending = new Set([drawn, waiting, gone, empty]);
  R.texture.initSource(drawn);   /* the renderer drew it: its copy is made */
  const before = R.uploads;
  let n = G.emptyOnceDrawn(R, pending);
  check(`2: the picture the renderer drew lets go of its canvas (${n} emptied)`,
    n === 1 && drawn.resource.width === 0 && drawn.autoGarbageCollect === false && !pending.has(drawn), { n });
  check('2: one never drawn keeps its canvas and goes on waiting -- nothing is uploaded for it',
    waiting.resource.width === 100 && pending.has(waiting) && R.uploads === before && !waiting._gpuData[3]);
  check('2: one destroyed, or with nothing left in its canvas, stops waiting', !pending.has(gone) && !pending.has(empty));
  R.lost = true;
  R.texture.initSource(waiting);
  n = G.emptyOnceDrawn(R, pending);
  check('2: on a lost context nothing is let go of (the rebuild makes them all again)', n === 0 && waiting.resource.width === 100 && pending.has(waiting));
  R.lost = false;
  n = G.emptyOnceDrawn(R, pending);
  check('2: once drawn on a live context, it goes too', n === 1 && waiting.resource.width === 0 && pending.size === 0);
  check('2: nothing waiting, no renderer: no work', G.emptyOnceDrawn(R, pending) === 0 && G.emptyOnceDrawn(null, new Set([fakeSource(fakeCanvas(4, 4))])) === 0);
  const other = fakeRenderer(4);
  const s = fakeSource(fakeCanvas(10, 10));
  R.texture.initSource(s);   /* drawn by ANOTHER renderer (an old one, before a rebuild) */
  const p2 = new Set([s]);
  check('2: a copy on another renderer is not this one\'s: the canvas stays', G.emptyOnceDrawn(other, p2) === 0 && s.resource.width === 10 && p2.has(s));
}

/* ── 3 ── */
const shatter = readFileSync(new URL('../../src/rendering/wheelShatter.js', import.meta.url), 'utf8');
check('3: a broken prop\'s pieces go to the chip as they are made, and the heaps hold at most 4e6 pixels',
  /import \{ keepOnGpuOnly \} from '\.\/gpuOnly\.js'/.test(shatter)
  && /new CanvasSource\(\{[^}]*\}\);\s*\n\s*this\._toGpu\(source\);/.test(shatter)
  && /const HEAP_PX = 4e6;/.test(shatter)
  && /isContextLost\(\)\) return;/.test(shatter));
const objs = readFileSync(new URL('../../src/rendering/wheelObjects.js', import.meta.url), 'utf8');
check('3: the Wheel\'s objects hand the shatter their renderer', /new WheelShatter\(layer, this\.renderer\)/.test(objs));
const fx = readFileSync(new URL('../../src/rendering/systems/effectsRenderer.js', import.meta.url), 'utf8');
const bake = fx.slice(fx.indexOf('if (rec.target === this._bowBodyFrames) registerBowBodyFrames(rec.dir, arr);'));
check('3: your sword\'s and bow\'s bodies wait to be drawn, after the bake\'s last read (the shield\'s arm handed its frames first)',
  /^if \(rec\.target === this\._bowBodyFrames\) registerBowBodyFrames\(rec\.dir, arr\);[\s\S]{0,700}this\._gpuOnceDrawn\(arr\);\s*\n\s*this\._gpuOnceDrawn\(rec\.target\[rec\.dir \+ '\|m'\]\);\s*\n\s*return _was;/.test(bake));
check('3: another player\'s bodies and sheets wait too', (fx.match(/arr = this\._gpuOnceDrawn\(this\._own\(_sliceStandIn\(cv, /g) || []).length === 2);
check('3: the effects renderer looks every GPU_WAIT_MS, and lets go of the waiting with its bakes',
  /const GPU_WAIT_MS = 500;/.test(fx)
  /* v2.3.3699: one look for the weapon bodies and the monsters' held strips */
  && /if \(this\._gpuWaiting\.size\) emptyOnceDrawn\(this\._captureRenderer, this\._gpuWaiting\);/.test(fx)
  && /this\._gpuWaiting\.delete\(src\);/.test(fx) && /this\._gpuWaiting\.clear\(\);/.test(fx));

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\nall gpu-only checks passed');
