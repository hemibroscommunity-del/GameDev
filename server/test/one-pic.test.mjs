/* ═══ v2.3.4885: ONE PICTURE PER PLAYER, STAGE 1 -- WHO, AND WHERE ═══
 *
 * src/game/onePic.js (no imports): the switch, who becomes a picture, and the
 * whole-device-pixel arithmetic that keeps a picture exact.  The painter
 * itself (src/rendering/peerImpostor.js) is Pixi's and is held by the phone
 * scenario mp-onepic (to the pixel, in the game).
 */
import { ONE_PIC, onePicFromQuery, onePicNearFromQuery, calmFigure, gradedWire, pickPictures, deviceSplit, slotGrid, sheetBytes } from '../../src/game/onePic.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}

/* ── 1. the switch ── */
check('1a. off by default', onePicFromQuery('') === false && onePicFromQuery('?x=1') === false);
check('1b. ?onepic=1 on, ?onepic=0 off', onePicFromQuery('?onepic=1') === true && onePicFromQuery('?a=2&onepic=1') === true && onePicFromQuery('?onepic=0') === false);
check('1c. not fooled by a longer name', onePicFromQuery('?onepicnear=1') === false);
check('1d. ?onepicnear=N, else the nearest ten', onePicNearFromQuery('?onepicnear=0') === 0 && onePicNearFromQuery('?onepic=1&onepicnear=3') === 3 && onePicNearFromQuery('') === ONE_PIC.NEAR_FULL && ONE_PIC.NEAR_FULL === 10);

/* ── 2. calm ── */
const stand = { pose: 'stand', moving: false, settling: false, held: false, gathering: false, riding: false, swimming: false, masked: false, graded: false, standIn: false, faded: false, layerOk: true };
check('2a. a player standing still, on foot, plain armour: calm', calmFigure(stand));
for (const k of ['moving', 'settling', 'held', 'gathering', 'riding', 'swimming', 'masked', 'graded', 'standIn', 'faded']) {
  check(`2b. ${k}: not calm`, !calmFigure({ ...stand, [k]: true }));
}
check('2c. jogging, hit, mining poses: not calm', ['jog', 'hit', 'mine', 'fish', 'dodge', null].every((pose) => !calmFigure({ ...stand, pose })));
check('2d. in the gesture layer (mining, fishing): not calm', !calmFigure({ ...stand, layerOk: false }));
check('2e. grades: n plain; r, e, g glow', !gradedWire('') && !gradedWire('nn') && !gradedWire(undefined) && gradedWire('rn') && gradedWire('ne') && gradedWire('gg'));

/* ── 3. who becomes a picture ── */
const C = (id, d, calm = true, always = false) => ({ id, d2: d * d, calm, always });
{
  const out = pickPictures([C('a', 50), C('b', 300), C('c', 120), C('d', 400), C('e', 20)], 2, 24, new Set());
  check('3a. the nearest 2 stay layered, the rest are pictures', [...out].sort().join() === 'b,c,d', [...out]);
}
{
  const out = pickPictures([C('a', 50), C('b', 300, false), C('c', 120, true, true), C('d', 400)], 1, 24, new Set());
  check('3b. not calm, or always drawn (party, target, duel, fighting you): layered', [...out].sort().join() === 'd', [...out]);
}
{
  const cands = [];
  for (let i = 0; i < 60; i++) cands.push(C('p' + String(i).padStart(2, '0'), 100 + i * 10));
  const out = pickPictures(cands, 10, 24, new Set());
  const ids = [...out].sort();
  check('3c. 60 standing: the nearest 10 layered, the next 24 pictures (the slots), the farthest 26 layered',
    out.size === 24 && ids[0] === 'p10' && ids[23] === 'p33', ids);
}
{
  const out = pickPictures([C('b', 100), C('a', 100), C('c', 100)], 1, 24, new Set());
  check('3d. equal distances in id order, so the pick does not depend on the listing order', [...out].sort().join() === 'b,c', [...out]);
}
{
  const s = new Set(['old']);
  const out = pickPictures([C('a', 10)], 0, 24, s);
  check('3e. fills the set it is given (no new Set a frame)', out === s && out.size === 1 && out.has('a'));
}

/* ── 4. whole device pixels ── */
{
  const k = 0.8 * 3;
  const a = deviceSplit(100.3, k);
  check('4a. the whole pixel and the fraction', a.i === 240 && Math.abs(a.f - 0.72) < 1e-9, a);
  const b = deviceSplit(-10.1, k);
  check('4b. left of the origin: floor, fraction still 0..1', b.i === -25 && b.f >= 0 && b.f < 1 && Math.abs(b.i + b.f - (-10.1 * k)) < 1e-9, b);
  /* the sprite on (i - pad) device px; the figure painted at pad + f: the
     figure's own origin lands at i + f = x*k, where it is drawn layered */
  let worst = 0;
  for (let n = 0; n < 2000; n++) {
    const x = (n * 7.123) % 900 - 300;
    const s = deviceSplit(x, k), pad = 17;
    const spriteDev = (s.i - pad);
    const originInSlot = pad + s.f;
    worst = Math.max(worst, Math.abs(spriteDev + originInSlot - x * k));
  }
  check('4c. the figure\'s origin lands where it is drawn layered (2,000 places)', worst < 1e-6, worst);
}

/* ── 5. the shared picture ── */
{
  const dpr = 3, sw = Math.ceil(ONE_PIC.SLOT_CSS_W * dpr), sh = Math.ceil(ONE_PIC.SLOT_CSS_H * dpr);
  const g = slotGrid(ONE_PIC.SLOTS, sw, sh, 2048, 4096);
  check('5a. 24 slots at an iPhone\'s 3x fit a 2048-wide picture', !!g && g.W <= 2048 && g.H <= 4096 && g.cols * g.rows >= ONE_PIC.SLOTS, g);
  const mb = sheetBytes(g) / 1048576;
  check('5b. its memory at 3x: under 16 MB', mb > 0 && mb < 16, mb);
  check('5c. at 2x: under 8 MB', sheetBytes(slotGrid(ONE_PIC.SLOTS, ONE_PIC.SLOT_CSS_W * 2, ONE_PIC.SLOT_CSS_H * 2, 2048, 4096)) / 1048576 < 8);
  check('5d. a grid that cannot fit is null (the switch stays off)', slotGrid(24, 3000, 3000, 2048, 2048) === null && slotGrid(0, 10, 10, 2048, 2048) === null);
}

console.log(`\none-pic: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
