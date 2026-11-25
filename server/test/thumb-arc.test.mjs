/* ═══ v2.3.6549: THE RIGHT THUMB'S ARC (card CT part 16; src/game/thumbArc.js) ═══
 *
 * The owner, 2026-11-24, of the two buttons' layout: "help position the size
 * and arrangement of the buttons to cater to users using their thumb on that
 * side to do the work".  What it does, over the phones a player holds
 * (upright 360 to 430 wide, sideways 375 to 430 tall), played on the module:
 *
 *   1. SIZES: Attack the biggest; nothing under 44 points; the owner's
 *      phone (430x775, sideways 775x430) at the table's own numbers.
 *   2. AIR: between ANY two buttons at least the gap (10 px or more), every
 *      pair, whichever are on screen.
 *   3. THE THUMB'S SIDE: every button inside the right half (the left
 *      stick's), off the screen's edge and the band; on the owner's phone
 *      10 px or more from what the game draws there, measured.
 *   4. ON THE ARC: Jump left of Attack (level sideways; upright a little up,
 *      over the weapon pill); Block up and left;
 *      Special above; the outer ring further out than the inner.
 *   5. FIXED SPOTS: a button's spot depends on the screen alone (never on
 *      which others are shown), and the same screen gives the same spot.
 *   6. THE SWITCH: on in the two buttons only; `?thumbarc=0` the old.
 *   7. NAMES: a name not of the arc has no spot.
 */
import { ARC, ARC_NAMES, arcFrame, arcSpot, arcOn } from '../../src/game/thumbArc.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const SCREENS = [
  [false, 430, 775], [false, 430, 932], [false, 414, 896], [false, 393, 852], [false, 390, 844], [false, 375, 667], [false, 360, 640],
  [true, 775, 430], [true, 932, 430], [true, 896, 414], [true, 852, 393], [true, 844, 390], [true, 667, 375],
];
const spots = (l, w, h) => { const o = {}; for (const n of ARC_NAMES) o[n] = arcSpot(n, l, w, h); return o; };
const ctr = (s) => ({ x: s.right + s.size / 2, y: s.bottom + s.size / 2 });

/* ── 1. sizes ── */
{
  const up = spots(false, 430, 775), side = spots(true, 775, 430);
  check('1. the owner\'s phone upright: Attack 84, the others 52', up.attack.size === 84 && ARC_NAMES.filter((n) => n !== 'attack').every((n) => up[n].size === 52), up);
  check('1. ...sideways: Attack 94 (the owner\'s sideways disc), the others 52', side.attack.size === 94 && ARC_NAMES.filter((n) => n !== 'attack').every((n) => side[n].size === 52), side);
  const bad = [];
  for (const [l, w, h] of SCREENS) {
    const s = spots(l, w, h);
    for (const n of ARC_NAMES) if (s[n].size < ARC.MIN_PX) bad.push([w, h, n, s[n].size]);
    for (const n of ARC_NAMES) if (n !== 'attack' && s[n].size >= s.attack.size) bad.push([w, h, n, 'not smaller than Attack']);
  }
  check('1. every screen: nothing under 44, Attack the biggest', bad.length === 0, bad);
  check('1. a screen with no size: the table\'s own', arcSpot('attack', false, 0, 0).size === 84 && arcSpot('attack', true, undefined, NaN).size === 94);
  check('1. a huge screen: capped at 1.15 x', arcSpot('attack', false, 2000, 3000).size === Math.round(84 * 1.15) && arcSpot('jump', true, 3000, 2000).size === Math.round(52 * 1.15));
  check('1. a tiny one: never under 44 (0.8 x would be 42 for the buttons)', arcSpot('jump', false, 200, 300).size === 44 && arcSpot('attack', false, 200, 300).size === Math.round(84 * 0.8));
}

/* ── 2. air ── */
{
  const bad = [];
  let least = Infinity;
  for (const [l, w, h] of SCREENS) {
    const s = spots(l, w, h), F = arcFrame(l, w, h);
    for (let i = 0; i < ARC_NAMES.length; i++) for (let j = i + 1; j < ARC_NAMES.length; j++) {
      const a = s[ARC_NAMES[i]], b = s[ARC_NAMES[j]];
      const A = ctr(a), B = ctr(b);
      const air = Math.hypot(A.x - B.x, A.y - B.y) - a.size / 2 - b.size / 2;
      least = Math.min(least, air);
      if (air < F.gap - 1.5) bad.push([l ? 'side' : 'up', w, h, ARC_NAMES[i], ARC_NAMES[j], +air.toFixed(1)]);
    }
  }
  check('2. every pair, every screen: at least the gap between the rings (1.5 px of rounding)', bad.length === 0, bad);
  check('2. ...and never under 9 px anywhere', least >= 9, least);
  check('2. the gap is 10 px or more', SCREENS.every(([l, w, h]) => arcFrame(l, w, h).gap >= 10));
}

/* ── 3. the thumb's side ── */
{
  const bad = [];
  for (const [l, w, h] of SCREENS) {
    const s = spots(l, w, h);
    for (const n of ARC_NAMES) {
      const b = s[n];
      if (b.right + b.size > w / 2) bad.push([w, h, n, 'into the left half', b.right + b.size]);
      if (b.right < (l ? 16 : 12)) bad.push([w, h, n, 'at the edge', b.right]);
      if (b.bottom < 8) bad.push([w, h, n, 'on the band', b.bottom]);
    }
  }
  check('3. every screen: every button on the right half, off the edge and the band', bad.length === 0, bad);
  /* the owner's phone, MEASURED in the game (v2.3.6549, a probe of the page at 430 x 775 and 775 x 430, 3x): each
     thing as { right, bottom, w, h } over the band; the skateboard's button only against Jump (a threat hides it in
     the two buttons: RideButton.jsx), the notch's strip only sideways */
  const MEASURED = {
    up: { vw: 430, vh: 775, things: [['the weapon pill', 147, 8, 136, 48], ['the minimap', 0, 518 - 181, 132, 132], ['the skateboard', 124, 196, 48, 48, ['jump']]] },
    side: { vw: 775, vh: 430, things: [['the weapon pill', 319, 8, 136, 48], ['the minimap', 0, 382 - 181, 132, 132], ['the top bar', 0, 382 - 49, 775, 49], ['the skateboard', 148, 100, 54, 54, ['jump']], ['the notch\'s strip', 0, 105, 40, 135]] },
  };
  const hit = [];
  for (const k of ['up', 'side']) {
    const M = MEASURED[k], s = spots(k === 'side', M.vw, M.vh);
    for (const n of ARC_NAMES) for (const [what, r, bo, w, h, only] of M.things) {
      if (only && !only.includes(n)) continue;
      const b = s[n];
      const ox = Math.min(b.right + b.size, r + w) - Math.max(b.right, r), oy = Math.min(b.bottom + b.size, bo + h) - Math.max(b.bottom, bo);
      if (ox > -10 && oy > -10) hit.push([k, n, what, ox, oy]);
    }
  }
  check('3. the owner\'s phone: 10 px or more from the weapon pill, the minimap, the top bar, the notch and (Jump) the skateboard', hit.length === 0, hit);
}

/* ── 4. on the arc ── */
{
  const ok = [];
  for (const [l, w, h] of SCREENS) {
    const s = spots(l, w, h), A = ctr(s.attack), J = ctr(s.jump), B = ctr(s.block), P = ctr(s.special), F = arcFrame(l, w, h);
    const r = (n) => { const c = ctr(s[n]); return Math.hypot(c.x - A.x, c.y - A.y); };
    ok.push(J.x > A.x && J.y >= A.y - 1 && J.y - A.y < (l ? 2 : 0.4 * F.r1) && B.x > A.x && B.y > A.y && P.y > A.y
      && ['jump', 'block', 'special'].every((n) => Math.abs(r(n) - F.r1) < 1.5) && ['charge', 'whirl', 'bash'].every((n) => Math.abs(r(n) - F.r2) < 1.5) && F.r2 > F.r1);
  }
  check('4. Jump left of Attack (sideways level, upright a little up, over the pill), Block up and left, Special above, the rings in and out', ok.every(Boolean), ok);
  const F = arcFrame(false, 430, 775), G = arcFrame(true, 775, 430);
  check('4. the owner\'s phone upright: the rings 84 and 148 px about Attack\'s centre (72, 64)', F.r1 === 84 && F.r2 === 148 && F.cx === 72 && F.cy === 64, F);
  check('4. ...sideways: 85 and 149 about (97, 57): Attack 50 px in from the edge, the old disc\'s', G.r1 === 85 && G.r2 === 149 && G.cx === 97 && G.cy === 57, G);
}

/* ── 5. fixed spots ── */
{
  const a = JSON.stringify(spots(false, 430, 775)), b = JSON.stringify(spots(false, 430, 775));
  check('5. the same screen, the same spots (no state: nothing else moves a spot)', a === b);
  check('5. a spot is the screen\'s alone (arcSpot takes no list of what is shown)', arcSpot.length === 4);
}

/* ── 5b. the owner's phone, spot by spot (the layout decided: a change is the owner's to see) ── */
{
  const UP = { attack: [30, 22, 84], jump: [125, 67, 52], block: [81, 114, 52], special: [17, 117, 52], charge: [141, 151, 52], whirl: [84, 181, 52], bash: [20, 184, 52] };
  const SIDE = { attack: [50, 10, 94], jump: [156, 31, 52], block: [120, 101, 52], special: [56, 115, 52], charge: [145, 160, 52], whirl: [193, 116, 52], bash: [218, 57, 52] };
  const got = (l, w, h) => { const o = {}; for (const n of ARC_NAMES) { const v = arcSpot(n, l, w, h); o[n] = [v.right, v.bottom, v.size]; } return o; };
  check('5b. upright 430 x 775: each spot (right, bottom over the band, size)', JSON.stringify(got(false, 430, 775)) === JSON.stringify(UP), got(false, 430, 775));
  check('5b. sideways 775 x 430: each spot', JSON.stringify(got(true, 775, 430)) === JSON.stringify(SIDE), got(true, 775, 430));
  check('5b. both tables are the owner\'s phone (430) at 1', ARC.up.ref === 430 && ARC.side.ref === 430);
  const N = arcFrame(false, 360, 640);
  check('5b. a 360 phone: everything x 0.837 (the edge, the foot and the gap too), never under 44', N.size === 70 && N.btn === 44 && N.gap === 10 && N.cx === 60 && N.cy === 53, N);
  check('5b. a screen of no size at all (0.5 px) is the floor, 0.8', arcSpot('attack', false, 0.5, 0).size === Math.round(84 * 0.8));
}

/* ── 6. the switch ── */
{
  check('6. on in the two buttons, the switch not thrown', arcOn(true, false) === true && arcOn(true, undefined) === true);
  check('6. off with `?thumbarc=0`, and in any other mode', arcOn(true, true) === false && arcOn(false, false) === false && arcOn(1, false) === false);
}

/* ── 7. names ── */
{
  check('7. a name not of the arc: null', arcSpot('sprint', false, 430, 775) === null && arcSpot('__proto__', false, 430, 775) === null && arcSpot('toString', true, 775, 430) === null);
  check('7. the arc\'s names', ARC_NAMES.join() === 'attack,jump,block,special,charge,whirl,bash' && Object.isFrozen(ARC_NAMES) && Object.isFrozen(ARC.up.spots));
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
