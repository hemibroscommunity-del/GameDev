/* ═══ v2.3.4460: THE WHOLE-GAME SWEEP OF WHAT HOLDS THE PAGE ═══
 *
 * The owner, 2026-11-10: "You do a sweep of everything because I keep
 * catching performance issues piecemeal and I want to make sure the
 * optimizations are everywhere in the game."
 *
 * The sweep is a tool, not a reading of the code: tools/qa/mp/mp-heldsweep.mjs
 * plays a tour of the game on a phone with a profiler on it and names every
 * job that holds the page's one thread, ranked; tools/qa/mp/held-budget.mjs
 * holds its lines (docs/specs/held-sweep.md has the list).  This suite holds
 * the parts of it node can run, and the fixes the first tour led to:
 *   1. an object page's ground lines from its own colour numbers
 *      (artBottoms.js): what a column reads, on made-up frames;
 *   2. the same on a real page (the town's noticeboard, the Bank);
 *   3. the lines come with the page: the reader's worker works them out, the
 *      page reads none (`?pagebases=0` the old way);
 *   4. beforeDraw / runBeforeDraw (framePacer.js): a job run at the top of
 *      the next frame, once, or by itself when no frame comes;
 *   5. the black-screen check collects its reading there, never in an
 *      animation frame of its own;
 *   6. the World map does not redraw every frame you move;
 *   7. the budget: its lines can only come down, every listed family says
 *      why it is listed, and the tour is registered;
 *   8. a monster in another colour is its PALETTE in another colour
 *      (retintPalette.js): the canvas's rule, entry for entry, and the
 *      recolour comes through the strip door;
 *   9. a sword or bow body under greaves is drawn from numbers kept for it
 *      (lookSets/standinlegs.js), for you and for another player: no bake;
 *  10. the band's five-a-second redraw is a transition (React draws it in
 *      pieces and lets a frame in), and not at all in a hidden tab;
 *  11. "is a loading screen up?" asks the browser's live lists, never a
 *      search of the whole page.
 * The phone halves: mp-pagebases (3), mp-heldsweep (the tour and its budget).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { decodePng8 } from '../../src/rendering/png8Decode.js';
import { bottomsOfNumbers, BOTTOM_COLS, BOTTOM_SOLID } from '../../src/rendering/artBottoms.js';
import { beforeDraw, runBeforeDraw } from '../../src/game/framePacer.js';
import { retintPalette, RETINT_ALPHA, RETINT_REF_K } from '../../src/rendering/retintPalette.js';
import { packStripNumbers } from '../../src/rendering/stripPack.js';
import { HOLD_MAX_MS, FRAME_JS_MAX_MS, WINDOW_MAX_MS, NOISE_K, AT_A_WINDOW, KNOWN, judgeHeld } from '../../tools/qa/mp/held-budget.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');
const inflate = async (z) => new Uint8Array(inflateSync(z));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* a page of numbers: colour 0 see-through, 1 solid, 2 half (127), 3 just solid (128) */
const ALPHA = new Uint8Array(256); ALPHA[1] = 255; ALPHA[2] = 127; ALPHA[3] = 128;
function page(w, h, paint) {
  const idx = new Uint8Array(w * h);
  paint((x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) idx[y * w + x] = c; });
  return idx;
}
const rect = (set, x0, y0, x1, y1, c = 1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };

/* ── 1. what a column reads ── */
{
  const idx = page(64, 64, (set) => rect(set, 0, 10, 63, 49));
  const b = bottomsOfNumbers(idx, 64, ALPHA, 0, 0, 64, 64);
  check('1a. a block across the frame: every column reads the row under its lowest solid pixel, as a share of the height',
    b && b.length === 64 && b.every((v) => Math.abs(v - 50 / 64) < 1e-6), b && [b.length, b[0], b[63]]);

  const gap = page(64, 64, (set) => { rect(set, 0, 10, 19, 49); rect(set, 40, 10, 63, 30); });
  const g = bottomsOfNumbers(gap, 64, ALPHA, 0, 0, 64, 64);
  check('1b. a column with nothing solid reads -1; its neighbours read their own',
    g[25] === -1 && g[30] === -1 && Math.abs(g[5] - 50 / 64) < 1e-6 && Math.abs(g[50] - 31 / 64) < 1e-6, [g[5], g[25], g[50]]);

  const soft = page(8, 8, (set) => { rect(set, 0, 0, 7, 3, 1); rect(set, 0, 4, 3, 5, 2); rect(set, 4, 4, 7, 5, 3); });
  const s = bottomsOfNumbers(soft, 8, ALPHA, 0, 0, 8, 8);
  check(`1c. solid is an alpha of ${BOTTOM_SOLID} or more: a 127 under the block is not ground, a 128 is`,
    Math.abs(s[1] - 4 / 8) < 1e-6 && Math.abs(s[6] - 6 / 8) < 1e-6, [s[1], s[6]]);

  /* a wide frame is read on COLS columns, its height to scale */
  const wide = page(512, 256, (set) => rect(set, 0, 40, 511, 199));
  const w = bottomsOfNumbers(wide, 512, ALPHA, 0, 0, 512, 256);
  check(`1d. a frame wider than ${BOTTOM_COLS} px is read on ${BOTTOM_COLS} columns, to within a row of its scaled height`,
    w.length === BOTTOM_COLS && w.every((v) => Math.abs(v - 200 / 256) <= 1 / 64 + 1e-6), [w.length, w[0], w[64]]);
  const tall = page(16, 1024, (set) => rect(set, 0, 0, 15, 1023));
  const tl = bottomsOfNumbers(tall, 16, ALPHA, 0, 0, 16, 1024);
  check('1e. a very tall frame is read on at most twice as many rows as columns can be', tl.length === 16 && tl.every((v) => v === 1), [tl.length, tl[0]]);

  /* the frame is read where it lies on its page, and nothing beside it is */
  const two = page(40, 40, (set) => { rect(set, 10, 10, 19, 14); rect(set, 20, 0, 39, 39); rect(set, 0, 20, 39, 39); });
  const t = bottomsOfNumbers(two, 40, ALPHA, 10, 10, 10, 10);
  check('1f. a frame is read at its own place on the page: the frames beside and below it do not reach into it',
    t.length === 10 && t.every((v) => Math.abs(v - 5 / 10) < 1e-6), Array.from(t));

  /* the thin foot the first rule tried missed: a 4 px post under a board, the frame halved */
  const post = page(258, 300, (set) => { rect(set, 10, 55, 250, 81); rect(set, 13, 82, 16, 244); });
  const p = bottomsOfNumbers(post, 258, ALPHA, 0, 0, 258, 300);
  check('1g. a thin post under a board is found (the column over it reads the foot, the columns beside it the board)',
    p.length === 128 && p[7] > 0.8 && Math.abs(p[40] - 82 / 300) < 0.01 && p[2] === -1, [p[2], p[6], p[7], p[8], p[40]]);

  check('1h. nothing to read is null, not a line', bottomsOfNumbers(new Uint8Array(4), 2, ALPHA, 0, 0, 0, 2) === null && bottomsOfNumbers(new Uint8Array(4), 2, ALPHA, 0, 0, 2, 0) === null);
}

/* ── 2. a real page ── */
{
  const read = async (name) => {
    const j = JSON.parse(src(`public/world/objects/${name}.json`));
    const dec = await decodePng8(new Uint8Array(readFileSync(join(ROOT, `public/world/objects/${name}.png`))), inflate, 4);
    return { j, dec };
  };
  const { j, dec } = await read('town-4');
  let ok = !!dec, n = 0, bad = null;
  for (const name of Object.keys(j.frames)) {
    const f = j.frames[name].frame;
    const b = bottomsOfNumbers(dec.idx, dec.stride, dec.alpha, f.x, f.y, f.w, f.h);
    n++;
    if (!b || b.length !== Math.min(BOTTOM_COLS, f.w) || !b.every((v) => v === -1 || (v > 0 && v <= 1))) { ok = false; bad = name; }
    if (!Array.from(b).some((v) => v > 0.5)) { ok = false; bad = name + ' (no ground at all)'; }
  }
  check(`2a. every frame of a town page reads a line: one a column, each -1 or a share of the height, some of it near the ground (${n} frames)`, ok && n >= 3, bad);
  const nb = j.frames['noticeboard-1'];
  if (nb) {
    const f = nb.frame;
    const b = bottomsOfNumbers(dec.idx, dec.stride, dec.alpha, f.x, f.y, f.w, f.h);
    /* its board overhangs its frame: the outermost columns read the board's lower edge, high on the picture; the
       legs reach the ground; nothing in between reads empty */
    const edge = Math.max(b[0], b[b.length - 1]), feet = Math.max(...b);
    check('2b. the noticeboard: its legs reach the ground, the overhanging ends of its board do not, and no column of it is empty',
      feet > 0.95 && edge > 0.2 && edge < 0.35 && b.every((v) => v > 0), [feet, b[0], b[b.length - 1]]);
  } else check('2b. the noticeboard is on its page (the check has moved with the art?)', false);
}

/* ── 3. the lines come with the page ── */
{
  const wk = src('src/rendering/png8Worker.js'), wo = src('src/rendering/wheelObjects.js'), ab = src('src/rendering/artBottoms.js');
  check('3a. the reader\'s worker works the lines out from the page\'s numbers, and keeps the file\'s bytes unless a test compares',
    /import \{ bottomsOfNumbers \} from '\.\/artBottoms\.js'/.test(wk) && /if \(m\.bases\) \{/.test(wk)
    && /bottoms\[name\] = bottomsOfNumbers\(dec\.idx, dec\.stride, alpha, f\.x, f\.y, f\.w, f\.h\)/.test(wk)
    && /bytes: m\.bases === 'both' \? bytes : null/.test(wk));
  check('3b. a frame laid on its side leaves the whole page to the old way (never half a page of lines)', /if \(!f \|\| fr\.rotated\) \{ all = false; continue; \}/.test(wk) && /if \(all\) \{/.test(wk));
  check('3c. the page asks for them, takes them as they come, and reads none itself',
    /w\.postMessage\(\{ id, url, bases: _basesWay\(\) \}\)/.test(wo)
    && /if \(m\.bottoms\) \{[\s\S]{0,400}?_bottoms\.set\(sheet\.textures\[name\], b\)[\s\S]{0,200}?return sheet;\s*\}\s*await readPageBottoms\(sheet, m\.bytes\);/.test(wo));
  check('3d. `?pagebases=0` is the old way for one page', /pagebases=\(0\|off\|false\)/.test(wo) && /if \(_basesOff\) return false;/.test(wo));
  check('3e. the rule has no canvas, no picture and no import (it runs on the worker)', !/document\.|new Image|getContext|^import /m.test(ab));
}

/* ── 4. a job at the top of the next frame ── */
{
  let ran = 0;
  beforeDraw(() => { ran++; }, 40);
  check('4a. a job waits for the frame', ran === 0);
  runBeforeDraw();
  check('4b. the frame runs it, at its top', ran === 1);
  runBeforeDraw();
  await sleep(70);
  check('4c. once: not by the next frame, and not by its own late timer', ran === 1, ran);

  let late = 0;
  beforeDraw(() => { late++; }, 25);
  await sleep(60);
  check('4d. with no frame coming (a hidden tab, a stopped loop) it runs by itself', late === 1, late);
  runBeforeDraw();
  check('4e. ...and a frame after that does not run it again', late === 1, late);

  const order = [];
  beforeDraw(() => { order.push('a'); beforeDraw(() => order.push('c'), 500); }, 500);
  beforeDraw(() => { throw new Error('a job that throws'); }, 500);
  beforeDraw(() => order.push('b'), 500);
  let threw = false;
  try { runBeforeDraw(); } catch (e) { threw = true; }
  check('4f. jobs run in the order asked; one that throws stops neither the rest nor the frame; a job asked from a job waits for the NEXT frame',
    !threw && order.join('') === 'ab', order);
  runBeforeDraw();
  check('4g. ...which runs it', order.join('') === 'abc', order);
}

/* ── 5. the black-screen check ── */
{
  const bt = src('src/ui/BroTown.jsx');
  const loop = bt.slice(bt.indexOf('var _gameLoop = function gameLoop('));
  check('5a. the loop runs the waiting jobs first thing in a frame (right after it asks for the next one)',
    /frameRef\.current = requestAnimationFrame\(_gameLoop\);\s*(\/\*[\s\S]{0,900}?\*\/\s*)?runBeforeDraw\(\);/.test(loop));
  const a = bt.indexOf('function _wdThumbAsk'), b = bt.indexOf('window.__btWdSample');
  const wd = a >= 0 && b > a ? bt.slice(a, b) : '';
  check('5b. the check\'s wait for its reading is a job before the draw, never an animation frame of its own',
    wd.length > 0 && /beforeDraw\(poll\)/.test(wd) && !/requestAnimationFrame\(poll\)/.test(bt), wd.length);
}

/* ── 6. the World map ── */
{
  const wm = src('src/ui/WorldMapOverlay.jsx');
  const m = /const MAP_MOVE_MS = (\d+);/.exec(wm);
  check('6a. while only you move, the open map redraws ten times a second or fewer, not every frame',
    !!m && Number(m[1]) >= 80 && /if \(!dirty\.current && t - last < \(pk === lastP \? 120 : MAP_MOVE_MS\)\) return;/.test(wm), m && m[1]);
}

/* ── 7. the budget ── */
{
  check('7a. the general lines can only come down (12 ms outside the frame, 16 ms of the game\'s own code inside one)', HOLD_MAX_MS <= 12 && FRAME_JS_MAX_MS <= 16, [HOLD_MAX_MS, FRAME_JS_MAX_MS]);
  const rows = Object.entries(KNOWN);
  const bad = rows.filter(([, v]) => !v || !(v.ms > 0) || typeof v.why !== 'string' || v.why.length < 30 || typeof v.next !== 'string' || v.next.length < 10);
  check(`7b. every listed family has its line, why it is over, and what fixes it (${rows.length} listed)`, bad.length === 0, bad.map(([k]) => k));
  const low = rows.filter(([, v]) => v && v.ms <= HOLD_MAX_MS);
  check('7c. a family under the general line is not listed (a fixed one comes off the list)', low.length === 0, low.map(([k]) => k));
  /* the judge, on a made-up tour */
  const hold = (ms, key, what) => ({ ms, key, what: what || key, via: '' });
  const made = (rows) => rows.map(([name, held, long]) => ({ name, held, frames: { long: long || [] } }));
  const j1 = judgeHeld(made([['town', [hold(11, 'new-thing'), hold(13, 'noise-once'), hold(30, 'new-bake'), hold(13, 'twice'), hold(14, 'twice')]]]));
  const o1 = j1.over.map((o) => o.key).sort().join(',');
  check(`7c2. the judge: under the line passes; one hold just past it is noise (less than ${NOISE_K} x); two are not; one far past is not`,
    o1 === 'new-bake,twice' && j1.over.every((o) => !o.listed), j1.over);
  const j2 = judgeHeld(made([[AT_A_WINDOW[0], [hold(40, 'other', 'a window opening'), hold(WINDOW_MAX_MS * 2, 'other', 'too slow even for a window')]], ['town', [hold(40, 'other', 'a window opening')]]]));
  check(`7c3. ...at a window a tap's own redraw may take ${WINDOW_MAX_MS} ms; the same hold in play may not`,
    j2.over.length === 2 && j2.over.some((o) => /too slow/.test(o.key)) && j2.over.some((o) => o.where === 'town'), j2.over);
  const j3 = judgeHeld(made([['peer', [hold(KNOWN['body-bake'].ms - 5, 'body-bake'), hold(15, 'ui:GearTab', 'the GearTab')], [{ ms: 15, key: 'the frame itself', via: '' }, { ms: 30, key: 'new-in-frame', via: '' }]]]));
  check('7c4. ...a listed family is held to its own line (and a kind of them, `ui:*`, to that kind\'s); a frame to the frame\'s line',
    j3.over.length === 1 && j3.over[0].key === 'new-in-frame', j3.over);
  const j4 = judgeHeld(made([['peer', [hold(KNOWN['body-bake'].ms * 2, 'body-bake')]]]));
  check('7c5. ...and a listed family that GROWS past its own line fails, as listed', j4.over.length === 1 && j4.over[0].listed === true, j4.over);
  check('7c6. the families come back ranked by their longest hold', j1.ranked[0].key === 'new-bake' && j1.ranked[0].longest === 30 && j1.ranked.find((r) => r.key === 'twice').n === 2, j1.ranked.map((r) => r.key));
  check(`7c7. the window's line is a tap's, not a licence: no more than ${45} ms`, WINDOW_MAX_MS <= 45 && NOISE_K <= 1.5);
  const run = src('tools/qa/mp/run.mjs');
  check('7d. the tour and the ground-line scenario are registered', /heldsweep/.test(run) && /pagebases/.test(run));
  const tour = src('tools/qa/mp/mp-heldsweep.mjs');
  check('7e. the tour plays the world, on a phone', /world: 'wheel'/.test(tour) && !/world: 'town'/.test(tour));
}

/* ── 8. a monster in another colour ── */
{
  /* the canvas's rule (monsterRecolor.js retintToCanvas), on straight RGBA bytes: the oracle */
  const canvasRule = (d, rgb) => {
    let sum = 0, n = 0, maxL = 1;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 30) { const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; sum += l; n++; if (l > maxL) maxL = l; }
    const ref = Math.max(1, n ? (sum / n) * 1.15 : maxL);
    const o = d.slice();
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 30) {
      const k = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / ref;
      o[i] = Math.min(255, Math.round(rgb[0] * k)); o[i + 1] = Math.min(255, Math.round(rgb[1] * k)); o[i + 2] = Math.min(255, Math.round(rgb[2] * k));
    }
    return o;
  };
  const dec = await decodePng8(new Uint8Array(readFileSync(join(ROOT, 'public/sprites/monsters/slime-idle-v5.png'))), inflate, 1);
  const m = dec ? packStripNumbers(dec, 128, 128) : null;
  check('8a. the slime\'s idle sheet is a 256-colour file the reader packs (the recolour\'s way in)', !!m && m.n >= 2 && m.pal.length >= 8, m && [m.n, m.pal.length]);
  if (m) {
    const BLUE = [58, 122, 208];
    const out = retintPalette(m.pal, m.idx, BLUE);
    /* the same picture as pixels, through the canvas's rule */
    const px = new Uint8Array(m.idx.length * 4);
    for (let i = 0; i < m.idx.length; i++) { const c = m.pal[m.idx[i]]; px[i * 4] = c & 255; px[i * 4 + 1] = (c >>> 8) & 255; px[i * 4 + 2] = (c >>> 16) & 255; px[i * 4 + 3] = c >>> 24; }
    const want = canvasRule(px, BLUE);
    let bad = 0, solid = 0;
    for (let i = 0; i < m.idx.length; i++) {
      const c = out[m.idx[i]];
      if (want[i * 4 + 3] > 30) solid++;
      if ((c & 255) !== want[i * 4] || ((c >>> 8) & 255) !== want[i * 4 + 1] || ((c >>> 16) & 255) !== want[i * 4 + 2] || (c >>> 24) !== want[i * 4 + 3]) bad++;
    }
    check(`8b. the palette retinted gives every pixel exactly the colour the canvas's rule gives it (${solid} solid pixels of the slime, ${bad} differ)`, bad === 0 && solid > 1000, [solid, bad]);
    let blue = 0, n = 0;
    for (let k = 1; k < out.length; k++) { const c = out[k]; if ((c >>> 24) > 200) { n++; if (((c >>> 16) & 255) > (c & 255) && ((c >>> 16) & 255) >= ((c >>> 8) & 255)) blue++; } }
    check('8c. ...and the green slime comes out blue (a tint could only darken it)', n > 4 && blue >= n * 0.9, [n, blue]);
    check('8d. entry 0 stays see-through; alpha is never touched', out[0] === m.pal[0] && Array.from(out).every((c, k) => (c >>> 24) === (m.pal[k] >>> 24)));
  }
  const faint = new Uint32Array([0, (10 | (200 << 8) | (10 << 16) | (30 << 24)) >>> 0, (10 | (200 << 8) | (10 << 16) | (255 << 24)) >>> 0]);
  const f = retintPalette(faint, new Uint8Array([1, 1, 1, 2]), [200, 0, 0]);
  check(`8e. a colour of alpha ${RETINT_ALPHA} or less is left as it is and does not move the mean (the canvas left such a pixel)`,
    f[1] === faint[1] && (f[2] & 255) === Math.min(255, Math.round(200 / RETINT_REF_K)), [f[1], f[2] & 255]);
  const mr = src('src/rendering/monsterRecolor.js'), zt = src('src/rendering/zoneTextures.js');
  check('8f. the recolour asks the strip door first, and recolours on a canvas only what cannot come that way',
    /const byNum = await loadTrackedStripRetinted\(entry\.bundle, urls\[state\], FRAME_W, FRAME_H, rgb\);[\s\S]{0,260}?if \(byNum && byNum\.length\) \{ entry\.frames\[state\] = byNum;[\s\S]{0,80}?return; \}\s*const img = await loadImg/.test(mr));
  check('8g. the door\'s retinted way reads the file\'s numbers off the page and changes only the palette',
    /export function loadTrackedStripRetinted\(bundle, url, fw, fh, rgb\)/.test(zt) && /pal: retintPalette\(m\.pal, m\.idx, rgb\)/.test(zt) && /_stripOfNumbers\(bundle, url, fw, fh, gen, m2, true\)/.test(zt));
  check('8h. letting a colour go frees its numbers with their bundle, always (one may still be on its way)', /try \{ unloadBundle\(e\.bundle\); \} catch/.test(mr) && !/if \(e\.byNumbers\) \{ try \{ unloadBundle/.test(mr));
}

/* ── 9. the sword and bow bodies under greaves ── */
{
  const fx = src('src/rendering/systems/effectsRenderer.js');
  const set = src('src/rendering/lookSets/standinlegs.js');
  let roles = null;
  try { roles = JSON.parse(src('public/sprites/look/standinlegs/roles.json')); } catch (e) { roles = null; }
  const EIGHT = ['sword-south-body', 'sword-east-body', 'sword-north-body', 'bow-east-body', 'bow-southwest-body', 'bow-south-body', 'bow-northwest-body', 'bow-north-body'];
  check('9a. the eight whole-body sheets are kept as numbers as they are under greaves (the bake\'s own files)',
    !!roles && roles.set === 'standinlegs' && EIGHT.every((n) => roles.sheets[n] && roles.sheets[n].ds === 1 && roles.sheets[n].cells.length === roles.sheets[n].frames), roles && Object.keys(roles.sheets));
  check('9b. ...made by the game\'s own bake with the greaves\' own shape, a painted-over pixel kept as the bake leaves it',
    /keepFromDefault: true/.test(set) && /recolorBodyToCanvas\(src\.img, T\[1\] \|\| null, T\[2\] \|\| null, T\[3\] \|\| null, null, src\.fh,\s*null, null, null, src\.fw, undefined, undefined, undefined, src\.legs, false\)/.test(set)
    && /if \(ga\[i\] > 30\) legs\[p\] = 1/.test(set));
  check('9c. the set is registered (behind the loading screen with the rest), `?legslook=0` the old bake',
    /if \(!LEGS_LOOK_OFF\) registerLookSheets\('standinlegs', '\/sprites\/look\/standinlegs\/roles\.json'\);/.test(fx) && /legslook=\(0\|off\|false\)/.test(fx));
  check('9d. your own body under greaves is a marker drawn in your look: no shape made into bytes, no bake',
    /const _legsLook = !_art && !rec\._btNoLook && this\._legsWornFor\(rec\) && _legsLookHas\(rec\.url\);\s*const _legsUnder = _legsLook \? null : this\._legsUnderFor\(rec\);/.test(fx)
    && /mk\._btLookLegs = !!_legsLook;/.test(fx) && /_standInLook\(a\._btLookUrl, getSkin\(\), getPants\(\), getShoes\(\), a\._btLookLegs\)/.test(fx));
  check('9e. another player in greaves, with no drawing: their look\'s strip from the same numbers, before any bake is tried',
    /if \(!_pa\.seg && _legsOn && _standInLegsUse && _legsLookHas\(cfg\.bodyUrl\)\) \{\s*const lkL = _standInLook\(cfg\.bodyUrl, o\.skin, o\.pants, o\.shoes, true\);\s*if \(lkL\) return lkL;\s*\}\s*const _lu = /.test(fx));
  check('9f. a body with a drawing on it, or a look the atlas has no row for, is still baked with the shape (the old way stays whole)',
    /recolorBodyToCanvas\(img, skinTarget\(o\.skin\) \|\| DEFAULT_SKIN_TARGET, pantsTarget\(o\.pants\), shoesTarget\(o\.shoes\),\s*null, cfg\.fh, null, null, _pa\.art, cfg\.fw, undefined, undefined, undefined, _lu\)/.test(fx));
}

/* ── 10. the band's beat ── */
{
  const bd = src('src/ui/mobile/BottomDashboard.jsx');
  check('10a. the band\'s 200 ms redraw is a transition, skipped in a hidden tab; `?bandbeat=0` in one piece',
    /if \(typeof document !== 'undefined' && document\.visibilityState === 'hidden'\) return;\s*if \(BAND_BEAT_WHOLE\) force\(v => v \+ 1\);\s*else startTransition\(\(\) => force\(v => v \+ 1\)\);\s*\}, 200\);/.test(bd)
    && /bandbeat=\(0\|off\|false\)/.test(bd) && /startTransition \} from 'react'/.test(bd));
  check('10b. the game\'s root is a concurrent one (a transition is only drawn in pieces under createRoot)', /createRoot\(document\.getElementById\('root'\)\)\.render\(/.test(src('src/main.jsx')));
}

/* ── 11. the loading gate ── */
{
  const lg = src('src/ui/loadingGate.js');
  check('11a. the gate asks two live lists the browser keeps; the whole-page search is only the fallback',
    /_introList = document\.getElementsByClassName\('bt-intro'\);\s*_veilList = document\.getElementsByClassName\('bt-zone-loading'\);/.test(lg)
    && /return _introList\.length > 0 \|\| _veilList\.length > 0;/.test(lg)
    && (lg.match(/querySelector\(/g) || []).length === 1);
  /* the gate itself, on a made-up page: the same answers as before */
  const lists = { 'bt-intro': [], 'bt-zone-loading': [] };
  const had = { document: globalThis.document, setInterval: globalThis.setInterval };
  let searches = 0;
  globalThis.document = { body: { classList: { contains: () => false } }, getElementsByClassName: (c) => lists[c], querySelector: () => { searches++; return null; } };
  globalThis.setInterval = () => 1;
  try {
    const G = await import('../../src/ui/loadingGate.js?held-sweep');
    G.markGateWorldIn();
    const t = 1000000;
    lists['bt-zone-loading'].push({});
    const up = G.worldReady(t);
    lists['bt-zone-loading'].length = 0;
    const justGone = G.worldReady(t + 10), settled = G.worldReady(t + 10 + G.SETTLE_MS);
    lists['bt-intro'].push({});
    const again = G.worldReady(t + 5000);
    check('11b. a veil up: not ready; just gone: not yet; settled: ready; the clip up again: not ready -- and never a search of the page',
      up === false && justGone === false && settled === true && again === false && searches === 0, [up, justGone, settled, again, searches]);
  } finally { globalThis.document = had.document; globalThis.setInterval = had.setInterval; }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
