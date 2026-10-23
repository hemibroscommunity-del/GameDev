/* A PICTURE SAFARI THREW AWAY IS NOTICED -- v2.3.3574 (docs/specs/parked-tab.md).
 *
 * The owner, 2026-10-22: "I returned to the game after I went into a
 * different tab on my phone and my character was missing features at certain
 * angles."  iPhone Safari may empty the canvases the game makes its pictures
 * on while the tab is parked; what had not been drawn yet came back blank.
 * The page's rules (src/rendering/canvasWitness.js, no imports) run here in
 * node on stand-in canvases, and the files that use them are read for what
 * they promise:
 *   1. a witness is kept only for a pixel inside a canvas that has one;
 *   2. intact: the sample (the 24 biggest and a spread of 24 of the rest) is
 *      read and nothing is found;
 *   3. thrown away: two or more empty is the answer, from the sample alone;
 *   4. one empty in the sample: every witness is read before deciding, so a
 *      canvas cleared on purpose never reloads the game, and a few emptied
 *      are not missed;
 *   5. a canvas freed with width 0 is skipped;
 *   6. `?canvascheck=0`: nothing witnessed, nothing checked;
 *   7. the wiring: packTrimmed witnesses its picture; wsClient's return checks
 *      before the socket and reloads through BroTown's door with `spot`;
 *      BroTown keeps the spot and the straight-in road lands there; the door
 *      opens only in the world. */
import { readFileSync } from 'fs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* a stand-in canvas: its pixels' alpha in a Map, read as getImageData reads */
function fakeCanvas(w, h) {
  const alpha = new Map();
  const cv = {
    width: w, height: h, reads: 0,
    paint(x, y, a) { alpha.set(x + ',' + y, a); },
    wipe() { alpha.clear(); },
    getContext(t) {
      if (t !== '2d') return null;
      return { getImageData(x, y) { cv.reads++; return { data: [0, 0, 0, alpha.get(x + ',' + y) || 0] }; } };
    },
  };
  return cv;
}

const W = await import('../../src/rendering/canvasWitness.js?on');

/* ── 1 ── */
const lone = fakeCanvas(10, 10);
W.witnessCanvas(lone, 20, 2);          /* outside */
W.witnessCanvas(fakeCanvas(0, 0), 0, 0);
W.witnessCanvas(null, 1, 1);
check('1: no witness for a pixel outside its canvas, a canvas with no size, or none', W.checkWitnesses().live === 0, W.checkWitnesses());

/* 100 pictures of different sizes, each witnessed at a solid pixel */
const pics = [];
for (let i = 0; i < 100; i++) {
  const cv = fakeCanvas(16 + i * 8, 16 + (i % 7) * 8);
  cv.paint(3, 4, 255);
  W.witnessCanvas(cv, 3, 4);
  pics.push(cv);
}

/* ── 2 ── */
let r = W.checkWitnesses();
check(`2: intact -- the sample is read and nothing is empty (${r.checked} of ${r.live})`, r.live === 100 && r.checked === 48 && r.emptied === 0, r);
const biggest = pics.slice().sort((a, b) => b.width * b.height - a.width * a.height).slice(0, 24);
check('2: the 24 biggest canvases are always in the sample (the ones a browser puts on the graphics side)', biggest.every((cv) => cv.reads === 1), biggest.map((c) => c.reads));
check('2: an answer of "nothing" is no action', r.emptied < W.EMPTIED_NEED);

/* ── 3 ── */
for (const cv of pics) cv.wipe();
r = W.checkWitnesses();
check(`3: thrown away -- the sample alone answers (${r.emptied} empty of ${r.checked})`, r.checked === 48 && r.emptied >= W.EMPTIED_NEED, r);
for (const cv of pics) cv.paint(3, 4, 255);

/* ── 4 ── */
const one = biggest[0];
one.wipe();
r = W.checkWitnesses();
check(`4: one empty in the sample -- every witness is read before deciding (${r.checked} read), and one is not enough`, r.checked === 100 && r.emptied === 1 && r.emptied < W.EMPTIED_NEED, r);
const two = pics.find((cv) => !biggest.includes(cv) && cv !== one);
two.wipe();
r = W.checkWitnesses();
check(`4: ...a second one outside the sample is found that way, and two are the answer (${r.emptied})`, r.emptied >= W.EMPTIED_NEED, r);
one.paint(3, 4, 255); two.paint(3, 4, 255);

/* ── 5 ── */
one.width = 0; two.width = 0;
r = W.checkWitnesses();
check(`5: a canvas freed with width 0 is skipped (${r.live} live)`, r.live === 98 && r.emptied === 0, r);

/* ── 6 ── */
globalThis.location = { search: '?canvascheck=0' };
const Off = await import('../../src/rendering/canvasWitness.js?off');
delete globalThis.location;
const offPic = fakeCanvas(32, 32);
offPic.paint(1, 1, 255);
Off.witnessCanvas(offPic, 1, 1);
check('6: ?canvascheck=0 -- the switch reads as off, and nothing is witnessed', Off.CANVAS_CHECK_OFF === true && Off.checkWitnesses().live === 0);

/* ── 7: the wiring ── */
const gear = readFileSync(new URL('../../src/rendering/gearSheets.js', import.meta.url), 'utf8');
const pack = gear.slice(gear.indexOf('export function packTrimmed('), gear.indexOf('export function drawGearFrame('));
check('7: packTrimmed witnesses the picture it packs, at a pixel its own scan found solid (alpha 128 and up)',
  /import \{ witnessCanvas \} from '\.\/canvasWitness\.js'/.test(gear) && /a >= 128/.test(pack) && /witnessCanvas\(cv, c\.ax \+ wx - c\.tx, c\.ay \+ wy - c\.ty\)/.test(pack));
const ws = readFileSync(new URL('../../src/networking/wsClient.js', import.meta.url), 'utf8');
const rr = ws.slice(ws.indexOf('function _resumeRecover('), ws.indexOf('function _resumeRecover(') + 6000);
const iCheck = rr.indexOf('checkWitnesses()'), iSock = rr.indexOf('_hiddenAt ? (Date.now() - _hiddenAt)');
check('7: the return checks the pictures FIRST, before the socket, and stops there when it reloads',
  iCheck > 0 && iSock > iCheck && /EMPTIED_NEED/.test(rr) && /__btRecoveryReload\([^)]*\{ spot: true \}\)/.test(rr) && /if \(_cwGo\) return;/.test(rr) && /recordCrash\('canvas-purge'/.test(rr));
const bt = readFileSync(new URL('../../src/ui/BroTown.jsx', import.meta.url), 'utf8');
check('7: the recovery reload keeps the Wheel spot when asked (bt_resume_spot), and the straight-in road lands there',
  /function _recoveryReload\(why, opts\)/.test(bt) && /opts && opts\.spot && S2\.currentZone === 'wheel'/.test(bt) && /sessionStorage\.setItem\('bt_resume_spot'/.test(bt)
  && /sessionStorage\.removeItem\('bt_resume_spot'\)/.test(bt) && /setWheelArrival\(\{ x: _spot\.x, y: _spot\.y \}\)/.test(bt));
check('7: the door opens only in the world, and is put away with its effect',
  /if \(worldInMs\(\) < 0\) return false;/.test(bt) && /window\.__btRecoveryReload = _rrOpen;/.test(bt) && /if \(window\.__btRecoveryReload === _rrOpen\) window\.__btRecoveryReload = null;/.test(bt));

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\nall canvas-witness checks passed');
