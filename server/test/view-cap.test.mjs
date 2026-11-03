/* ═══ v2.3.4084: ONE VISIBLE AREA OF WORLD, WHATEVER THE SCREEN ═══
 *
 * src/game/viewCap.js (the cap) and src/game/worldViewport.js (the one rule
 * the camera and the renderer read, with the cap folded in).  The owner:
 * "Cap it for everyone now".  Checked:
 *   1. the cap alone: only ever zooms in; an upright phone's area untouched;
 *      a wide canvas brought to the reference area; the 680 short-side stop;
 *      the reference following ?zoom (VIEW_OUT);
 *   2. the switch: on by default, `?viewcap=0` off for a tab, the Test panel's
 *      row off for every phone (`?viewcap=1` back on for one), and its row is
 *      on the panel, live;
 *   3. the real worldViewport() on the canvases mp-landscape-view measured
 *      (the dashboard open and folded, sideways, three computers), with the
 *      cap and without: the numbers in docs/specs/view-cap.md.
 * worldViewport.js imports through Vite's '@/' alias, which node cannot
 * resolve, so it is copied with its imports pointed at the real files.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { VIEW_CAP, capViewScale, viewCapChoice } from '../../src/game/viewCap.js';
import { CLIENT_SAVERS, setClientOff, _resetClientOff } from '../../src/game/clientOff.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const near = (a, b, d) => Math.abs(a - b) <= d;
const REF_AREA = VIEW_CAP.REF_W * VIEW_CAP.REF_H;

/* ── 1. the cap alone ─────────────────────────────────────────────────── */
{
  check('1a. the reference is an upright phone with its dashboard open: 850 x 1330, short stop 680',
    VIEW_CAP.REF_W === 850 && VIEW_CAP.REF_H === 1330 && VIEW_CAP.SHORT_MIN === 680);
  /* the upright 390x844 canvases, at today's scale (H = 1330) */
  const up = [[390, 615], [390, 806], [375, 587], [430, 689]];
  check('1b. an upright phone keeps its scale, dashboard open or folded',
    up.every(([w, h]) => capViewScale(h / 1330, w, h, 0.77) === h / 1330), up);
  /* a sideways phone at today's 960-tall view */
  const s0 = 390 / 960, s1 = capViewScale(s0, 844, 390, 0.77);
  check('1c. a sideways phone is zoomed in to the reference area', s1 > s0 && near((844 / s1) * (390 / s1), REF_AREA, 2), { s0, s1 });
  /* a long strip: the area rule would leave it < 680 short, so it stops there */
  const t1 = capViewScale(0.3, 2000, 300, 0.77);
  check('1d. a strip stops at a 680 short side and keeps a little more area', near(300 / t1, 680, 1e-6) && (2000 / t1) * (300 / t1) > REF_AREA, { t1 });
  check('1e. never zooms out: a scale already past the cap is kept', capViewScale(2, 844, 390, 0.77) === 2);
  check('1f. a canvas with less area than the reference is untouched', capViewScale(0.5, 300, 300, 0.77) === 0.5);
  check('1g. a degenerate canvas passes the scale through', capViewScale(0.5, 0, 390, 0.77) === 0.5 && capViewScale(0.5, NaN, 390, 0.77) === 0.5);
  /* ?zoom=0.64: the reference grows by 0.77/0.64 each way */
  const z = capViewScale(0.1, 844, 390, 0.64), k = 0.77 / 0.64;
  check('1h. at ?zoom=0.64 the reference grows with the view', near((844 / z) * (390 / z), REF_AREA * k * k, 5), { z });
}

/* ── 2. the switch ────────────────────────────────────────────────────── */
check('2a. on by default', viewCapChoice('', false) === true && viewCapChoice('?a=1', false) === true);
check('2b. ?viewcap=0 turns it off for the tab', viewCapChoice('?viewcap=0', false) === false && viewCapChoice('?a=1&viewcap=0', false) === false);
check('2c. the Test panel\'s row turns it off for every phone; ?viewcap=1 back on for one', viewCapChoice('', true) === false && viewCapChoice('?viewcap=1', true) === true);
check('2d. the row is on the Test panel, and follows live', CLIENT_SAVERS.some((c) => c.id === 'viewcap' && c.live === true));

/* ── 3. the real rule ─────────────────────────────────────────────────── */
{
  const here = dirname(fileURLToPath(import.meta.url));
  const src = join(here, '../../src');
  const url = (p) => pathToFileURL(join(src, p)).href;
  let code = readFileSync(join(src, 'game/worldViewport.js'), 'utf8');
  code = code.replace(/from '@\/([^']+)'/g, (_m, p) => `from '${url(p)}'`)
    .replace(/from '\.\/([^']+)'/g, (_m, p) => `from '${url('game/' + p)}'`);
  const dir = mkdtempSync(join(tmpdir(), 'viewcap-'));
  const file = join(dir, 'worldViewport.mjs');
  writeFileSync(file, code);
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  _resetClientOff();
  const { worldViewport } = await import(pathToFileURL(file).href);
  const cv = (w, h) => ({ width: w, height: h });   /* dpr 1 in node */
  /* the canvases mp-landscape-view measured in the Wheel, and what it read */
  const ROWS = [
    { tag: 'upright 390x844 folded', c: [390, 806], before: [643, 1330], after: [643, 1330] },
    { tag: 'upright 390x844 open', c: [390, 615], before: [843, 1330], after: [843, 1330] },
    { tag: 'sideways 844x390', c: [844, 390], before: [2078, 960], after: [1564, 723] },
    { tag: 'computer 1366x768', c: [820, 768], before: [1025, 960], after: [1025, 960] },
    { tag: 'computer 1920x1080', c: [1374, 1080], before: [1221, 960], after: [1199, 943] },
    { tag: 'ultrawide 2560x1080', c: [1830, 1080], before: [1627, 960], after: [1384, 817] },
  ];
  for (const r of ROWS) {
    const off = worldViewport(cv(...r.c), 'wheel', { cap: false });
    const on = worldViewport(cv(...r.c), 'wheel');
    check(`3. ${r.tag}: ${r.before.join('x')} -> ${r.after.join('x')}`,
      near(off.W, r.before[0], 1.5) && near(off.H, r.before[1], 1.5) && near(on.W, r.after[0], 1.5) && near(on.H, r.after[1], 1.5)
        && on.W * on.H <= Math.max(REF_AREA, off.W * off.H) + 2,
      { off: [Math.round(off.W), Math.round(off.H)], on: [Math.round(on.W), Math.round(on.H)] });
  }
  /* the Test panel's row, live: the worker says off, the wide view comes back */
  setClientOff('viewcap');
  const live = worldViewport(cv(844, 390), 'wheel');
  check('3g. the Test panel\'s row turned off: the sideways phone\'s old view, at once', near(live.W, 2078, 1.5) && near(live.H, 960, 1.5), live);
  setClientOff('');
  const back = worldViewport(cv(844, 390), 'wheel');
  check('3h. ...and turned back on: capped again', near(back.W, 1564, 1.5), back);
  /* D10 still holds sideways: the old town sees wider than a combat zone */
  const town = worldViewport(cv(844, 390), 'town'), ember = worldViewport(cv(844, 390), 'ember');
  check('3i. D10 sideways: town still zoomed out past a combat zone (no void: zoom only goes in)', town.scale < ember.scale - 0.05 && town.W > 1024 && near(ember.W, 1024, 1), { town, ember });
  console.log('    D10 sideways 844x390: town', town.scale.toFixed(3), Math.round(town.W) + 'x' + Math.round(town.H), '| ember', ember.scale.toFixed(3), Math.round(ember.W) + 'x' + Math.round(ember.H));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all view-cap checks passed');
