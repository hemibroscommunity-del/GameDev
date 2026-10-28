/* ═══ v2.3.3709: THE WHEEL'S GROUND WORKER WAITS FOR THE RENDERER'S WORD ═══
 *
 * The worker is told once, as it starts, whether the game draws the water
 * moving and pictures as colour numbers (src/game/wheelTrial.js wheelStart),
 * and both are the renderer's answers, said as it is made
 * (pixiRenderer.js initPixiRenderer).  mp-palette found a page whose worker
 * started first: told "colours, still water", it laid the whole visit so.
 * wheelStart now waits for wheelRendererSaid, at most 15 s.
 *
 * Here, with a stand-in Worker that records what it is sent:
 *   1. a start before the renderer has said posts nothing yet;
 *   2. a start stopped while it waits posts nothing to the stopped worker;
 *   3. the renderer's word sends the init at once, with the answers it gave
 *      (moving, colour numbers), and only once;
 *   4. a start after the word posts at once;
 *   5. a renderer that never says: the init goes after the 15 s cap, with
 *      what was set (the worker as before);
 *   6. in Node (no window: a tool) nothing waits;
 *   7. the wiring: the renderer says after both setters, and the init still
 *      carries search, moving, palette and size (test-world-core reads it).
 */
import fs from 'node:fs';

let passed = 0, failed = 0;
function check(name, ok, info) {
  if (ok) { passed++; console.log('  PASS ' + name); }
  else { failed++; console.log('  FAIL ' + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); }
}
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const src = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

class FakeWorker {
  constructor(url) { this.url = url; this.posts = []; this.dead = false; FakeWorker.made.push(this); }
  postMessage(m) { if (this.dead) FakeWorker.afterDeath++; this.posts.push(m); }
  terminate() { this.dead = true; }
}
FakeWorker.made = [];
FakeWorker.afterDeath = 0;
globalThis.Worker = FakeWorker;
const inits = (w) => w.posts.filter((m) => m && m.type === 'init');

/* a page: the module as a browser loads it */
globalThis.window = { location: { search: '' } };
const T = await import('../../src/game/wheelTrial.js?page');

/* ── 1-2 ── */
{
  const p = T.wheelStart();
  p.catch(() => {});
  await tick(20);
  const w = FakeWorker.made[FakeWorker.made.length - 1];
  check('1. a start before the renderer has said posts nothing yet', !!w && inits(w).length === 0, w && w.posts);
  T.wheelStop();
  T.setWheelWaterMoves(true);
  T.setWheelPalette(true);
  T.wheelRendererSaid();
  await tick(20);
  check('2. a start stopped while it waits posts nothing to the stopped worker', inits(w).length === 0 && FakeWorker.afterDeath === 0, { posts: w.posts, afterDeath: FakeWorker.afterDeath });
}

/* ── 3-4: a fresh page instance, the word said while a start waits ── */
{
  const P = await import('../../src/game/wheelTrial.js?page2');
  const p = P.wheelStart();
  p.catch(() => {});
  await tick(20);
  const w = FakeWorker.made[FakeWorker.made.length - 1];
  const before = inits(w).length;
  P.setWheelWaterMoves(true);
  P.setWheelPalette(true);
  P.wheelRendererSaid();
  await tick(0);
  const got = inits(w);
  P.wheelRendererSaid();   /* said again (a rebuilt renderer): no second init */
  await tick(0);
  check('3. the renderer\'s word sends the init at once, with its answers (moving water, colour numbers), once',
    before === 0 && got.length === 1 && got[0].moving === true && got[0].palette === true && inits(w).length === 1
      && typeof P.wheelSayStats.waited === 'number', { before, got, waited: P.wheelSayStats.waited });
  P.wheelStop();
  const p2 = P.wheelStart();
  p2.catch(() => {});
  await tick(0);
  const w2 = FakeWorker.made[FakeWorker.made.length - 1];
  check('4. a start after the word posts at once', w2 !== w && inits(w2).length === 1 && inits(w2)[0].palette === true, w2.posts);
  P.wheelStop();
}

/* ── 5: a renderer that never says ── */
{
  const P = await import('../../src/game/wheelTrial.js?page3');
  const realSet = globalThis.setTimeout;
  const caps = [];
  globalThis.setTimeout = (fn, ms, ...a) => { if (ms >= 10000) { caps.push(ms); return realSet(fn, 0, ...a); } return realSet(fn, ms, ...a); };
  try {
    const p = P.wheelStart();
    p.catch(() => {});
    await tick(20);
  } finally { globalThis.setTimeout = realSet; }
  const w = FakeWorker.made[FakeWorker.made.length - 1];
  check('5. a renderer that never says: the init goes after the 15 s cap, with what was set (colours, still water: the worker as before)',
    caps.includes(15000) && inits(w).length === 1 && inits(w)[0].palette === false && inits(w)[0].moving === false, { caps, posts: w.posts });
  P.wheelStop();
}

/* ── 6: Node, no window ── */
{
  delete globalThis.window;
  const N = await import('../../src/game/wheelTrial.js?node');
  const p = N.wheelStart();
  p.catch(() => {});
  await tick(0);
  const w = FakeWorker.made[FakeWorker.made.length - 1];
  check('6. in Node (a tool, no window) nothing waits: the init goes at once', inits(w).length === 1, w.posts);
  N.wheelStop();
}

/* ── 7: the wiring ── */
{
  const R = src('src/rendering/pixiRenderer.js');
  const pal = R.indexOf('setPaletteRenderer(app.renderer)'), water = R.indexOf('setWheelWaterRenderer(app.renderer)');
  const said = R.indexOf('wheelRendererSaid();');
  const W = src('src/game/wheelTrial.js');
  check('7. the renderer says after both of its setters, and the init carries search, moving, palette and size as before',
    pal > 0 && water > 0 && said > pal && said > water && /import \{ wheelObjectsOn, wheelRendererSaid \} from '\.\.\/game\/wheelTrial\.js'/.test(R)
      && /postMessage\(\{ type: 'init', search, moving: _waterMoves, palette: _palette, size \}\)/.test(W)
      && /rendererSaid\(RENDERER_WAIT_MS\)\.then/.test(W) && /if \(_w !== w\) return;/.test(W), { pal, water, said });
}

console.log(`\nground-waits: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
