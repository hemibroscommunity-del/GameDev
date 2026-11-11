/* ═══ v2.3.4652: A LOADING SCREEN'S WARM-UP, ONCE A PAGE ═══
 *
 * Five of the loading screen's warm-ups (controls, gesture cues, level-up
 * burst, quest art, XP bar) made and held a fresh <img> for every URL on
 * every rejoin (state-machine sweep VC-2, R5-9; #1505).  They share
 * warmOnce.js now:
 *   1. a URL warmed twice (a rejoin) makes and holds ONE <img>;
 *   2. two loading screens at once share the one still warming;
 *   3. a warm that FAILED is tried again by the next loading screen;
 *   4. `?warmonce=0` is the game as it was (a fresh <img> a pass);
 *   5. the five use it (and keep their own held list, which the rigs count).
 * The stat scene's slime (v2.3.4452) and the chest (`_p`) already warmed once.
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}

/* a stand-in <img>: loads on the next turn, or fails for a URL in `bad` */
const made = [];
const bad = new Set();
globalThis.Image = class {
  constructor() { made.push(this); this.decoding = ''; }
  set src(u) {
    this._src = u;
    setTimeout(() => { if (bad.has(u)) this.onerror && this.onerror(); else this.onload && this.onload(); }, 0);
  }
  get src() { return this._src; }
  decode() { return Promise.resolve(); }
};

const url = new URL('../../src/rendering/warmOnce.js', import.meta.url).href;
{
  const { warmOnce } = await import(url);
  const held = [];
  const warm = warmOnce(held);
  await Promise.all([warm('/a.webp'), warm('/b.webp')]);
  const n = made.length;
  await Promise.all([warm('/a.webp'), warm('/b.webp')]);   /* the rejoin's loading screen */
  check('1a a rejoin makes no new <img> for a URL already warm', made.length === n, { before: n, after: made.length });
  check('1b ...and holds one a URL', held.length === 2, held.length);

  const before = made.length;
  const [x, y] = await Promise.all([warm('/c.webp'), warm('/c.webp')]);
  check('2 two loading screens at once share the one still warming', made.length === before + 1 && x === y, { made: made.length - before });

  bad.add('/d.webp');
  const r1 = await warm('/d.webp');
  check('3a a failed warm gives null (it never fails the gate)', r1 === null);
  bad.delete('/d.webp');
  const was = made.length;
  const r2 = await warm('/d.webp');
  check('3b ...and the next loading screen tries it again', made.length === was + 1 && r2 && r2.src === '/d.webp');
  check('3c ...and holds it then', held.length === 4, held.length);
}
{
  globalThis.location = { search: '?warmonce=0' };
  const { warmOnce } = await import(url + '?off');
  delete globalThis.location;
  const held = [];
  const warm = warmOnce(held);
  await warm('/e.webp');
  await warm('/e.webp');
  check('4 `?warmonce=0` warms again every pass (the game as it was)', held.length === 2, held.length);
}
{
  for (const f of ['controls', 'gestureCue', 'levelUpBurst', 'questArt', 'xpBar']) {
    const t = readFileSync(new URL('../../src/rendering/' + f + 'Preload.js', import.meta.url), 'utf8');
    check('5 ' + f + 'Preload warms through warmOnce', /const warm = warmOnce\(_held\);/.test(t) && !/\nfunction warm\(url\)/.test(t));
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
