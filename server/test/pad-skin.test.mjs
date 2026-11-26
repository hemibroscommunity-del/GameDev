/* ═══ v2.3.6641: THE CONTROLLER, ONE SHELL ON THE BAND (card PAD part 3; src/game/padSkin.js) ═══
 *
 * The owner, 2026-11-25, after trying part 1's two grips: "The controller is
 * too large and doesn't connect in a seamless way to the dashboard. The
 * shape also doesn't make much sense. ... Make the jump button turn into the
 * shield button while in combat."  What the controller's rules DO, over the
 * phones a player holds (upright 360 to 430 wide, sideways 667 to 932),
 * played on the module with the art's own measured numbers (padArt.js):
 *
 *   1. THE SHELL: as wide as the column, 280/920 of the scale tall, the
 *      scale stopping at the owner's 430 px phone (131 px: never larger);
 *      the cuts leave the rail a width of its own; at 430 the card's sizes.
 *   2. CLEAR OF THE OUTLINE: every well's art inside the housing's measured
 *      dark inside (insideShell), at every screen; the top row's art never
 *      under 0.8 of its scale.
 *   3. TOUCH BOXES: each at least 44 px, holding its art, inside the screen
 *      and over the band, and no two over each other.
 *   4. THE WELLS AND THE FIGHT: Jump the big well out of a fight and the
 *      middle one in it, Block the other way round; Skate and Charge the one
 *      mobility well, never two; a control's spot is the screen's and the
 *      fight's alone; a control with no well keeps today's place.
 *   5. FACES: Block wears the shield; unavailable dims; the cooldown's dark
 *      sector is what is left of it; ready glows, active rings; Attack wears
 *      the weapon in hand (and its CSS says the same); a weapon well lit on
 *      the weapon in hand, its icon when the slot holds one.
 *   6. THE SWITCH: on unless `?padskin=0` is thrown; every picture named.
 *   7. THE ART: exactly the pieces drawn on disk (part 1's gone), 256
 *      colours or fewer, 2 px a CSS px at their biggest, under 200 kB.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PAD, REF, REF_SLOTS, WELLS, PAD_ACCENT, padLayout, wellOf, padSpot, ctxFor, padFace, attackFace, attackWeapon,
  PAD_ATTACK_ICONS, weaponWell, insideShell, padOn, padPictures, padWidthOf,
} from '../../src/game/padSkin.js';
import { PAD_ART, PAD_ART_BYTES } from '../../src/data/padArt.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const SCREENS = [
  [false, 430], [false, 414], [false, 393], [false, 390], [false, 375], [false, 360],
  [true, 932], [true, 896], [true, 852], [true, 844], [true, 775], [true, 667],
];
const near = (a, b, e) => Math.abs(a - b) <= e;

/* ── 1. the shell ── */
{
  const bad = [];
  for (const [land, vw] of SCREENS) {
    const L = padLayout(land, vw);
    const s = Math.min(vw, 430) / 920;
    if (L.shell.w !== vw) bad.push([vw, 'w', L.shell.w]);
    if (L.shell.h !== Math.round(280 * s)) bad.push([vw, 'h', L.shell.h]);
    if (!(L.shell.cutL + L.shell.cutR < vw)) bad.push([vw, 'cuts', L.shell.cutL, L.shell.cutR]);
    if (!near(L.s, s, 1e-9)) bad.push([vw, 's', L.s]);
  }
  check('1a. the shell spans the column, 280/920 of the scale tall, the scale stopping at 430 px', bad.length === 0, bad);
  const U = padLayout(false, 430), W = U.wells;
  const want = [['shell', U.shell.h, 131], ['attack', W.attack.d, 65], ['big', W.big.d, 65], ['mobility', W.mobility.d, 37],
    ['mid', W.mid.d, 37], ['special', W.special.d, 37], ['w1', W.w1.d, 40], ['w2', W.w2.d, 40], ['w3', W.w3.d, 40], ['stick', W.stick.d, 83]];
  const off = want.filter((x) => !near(x[1], x[2], 1.5));
  check('1b. at the owner\'s 430 px: the shell 131, Attack and the big button 65, the small wells 37, the weapon wells 40, the stick 83', off.length === 0, off);
  check('1c. a wider column (932 sideways) is no taller than 430 upright: the rail stretches', padLayout(true, 932).shell.h === U.shell.h && padLayout(true, 932).wells.attack.d === W.attack.d);
  check('1d. a narrower column draws smaller (375: under 430\'s)', padLayout(false, 375).shell.h < U.shell.h && padLayout(false, 375).wells.attack.d < W.attack.d);
  /* the right lobe hangs off the right edge, the stick off the left: the same
     px from their edges at 430 upright and 932 sideways */
  const S = padLayout(true, 932).wells;
  check('1e. the right lobe keeps to the right edge and the stick to the left as the column widens',
    near(430 - W.attack.x, 932 - S.attack.x, 0.01) && near(W.stick.x, S.stick.x, 0.01) && near(430 - W.big.x, 932 - S.big.x, 0.01));
  check('1f. the weapon wells sit on the rail, between the stick and the big button, at every screen',
    SCREENS.every(([l, vw]) => { const w = padLayout(l, vw).wells; return w.w1.x > w.stick.x && w.w3.x < w.big.x && w.w1.x < w.w2.x && w.w2.x < w.w3.x; }));
}

/* ── 2. clear of the outline ── */
{
  const bad = [], small = [];
  for (const [land, vw] of SCREENS) {
    const L = padLayout(land, vw);
    for (const n of WELLS) {
      const w = L.wells[n];
      if (!insideShell(L, w.x, w.y, w.d / 2, 0)) bad.push([vw, n]);
    }
    for (const n of ['mobility', 'mid', 'special']) if (L.wells[n].d < 0.8 * 80 * L.s - 1e-6) small.push([vw, n, L.wells[n].d]);
  }
  check('2a. every well\'s art inside the shell\'s gold outline, at every screen', bad.length === 0, bad);
  check('2b. the top row\'s art never under 0.8 of its scale (what gives on a narrow phone)', small.length === 0, small);
  const L = padLayout(false, 430);
  check('2c. insideShell refuses a well over the outline (the stick 20 px left, Special 20 px up, a well under the band)',
    !insideShell(L, L.wells.stick.x - 20, L.wells.stick.y, L.wells.stick.d / 2, 0)
    && !insideShell(L, L.wells.special.x, L.wells.special.y + 20, L.wells.special.d / 2, 0)
    && !insideShell(L, L.wells.w2.x, 0, L.wells.w2.d / 2, 0)
    && !insideShell(L, L.wells.attack.x + 30, L.wells.attack.y, L.wells.attack.d / 2, 0));
  check('2d. at 430 the top row is the owner\'s, unspread (101 and 100 of the reference between centres)',
    near(L.wells.mid.x - L.wells.mobility.x, 101 * L.s, 0.01) && near(L.wells.special.x - L.wells.mid.x, 100 * L.s, 0.01)
    && near(L.wells.mobility.x, 430 - (920 - REF_SLOTS.mobility[0]) * L.s, 0.01));
  check('2e. no shell inside, no answer', insideShell(L, 10, 10, 1, 0, {}) === false && insideShell(null, 10, 10, 1, 0) === false);
}

/* ── 3. touch boxes ── */
{
  const small = [], over = [], out = [], hold = [];
  for (const [land, vw] of SCREENS) {
    const L = padLayout(land, vw);
    for (const n of WELLS) {
      const b = L.wells[n].box, w = L.wells[n];
      if (b.size < PAD.BOX || b.size < w.d - 1e-9) small.push([vw, n, b.size]);
      if (b.x - b.size / 2 < 0 || b.x + b.size / 2 > vw || b.y - b.size / 2 < 0) out.push([vw, n]);
      if (Math.abs(b.x - w.x) > (b.size - w.d) / 2 + 1e-9 || Math.abs(b.y - w.y) > (b.size - w.d) / 2 + 1e-9) hold.push([vw, n]);
    }
    for (let i = 0; i < WELLS.length; i++) for (let j = i + 1; j < WELLS.length; j++) {
      const a = L.wells[WELLS[i]].box, c = L.wells[WELLS[j]].box;
      if (Math.abs(a.x - c.x) < (a.size + c.size) / 2 && Math.abs(a.y - c.y) < (a.size + c.size) / 2) over.push([vw, WELLS[i], WELLS[j]]);
    }
  }
  check('3a. every touch box at least 44 px and never smaller than its art', small.length === 0, small);
  check('3b. no two touch boxes over each other, at every screen', over.length === 0, over);
  check('3c. every touch box inside the screen and over the band', out.length === 0, out);
  check('3d. every touch box holds its own art', hold.length === 0, hold);
  const L = padLayout(false, 375);
  check('3e. on a narrow phone a top-row box rises off the big buttons\' (375: Mobility\'s box over its art\'s centre)',
    L.wells.mobility.box.y > L.wells.mobility.y);
}

/* ── 4. the wells and the fight ── */
{
  check('4a. out of a fight: Jump the big well, Block the middle one', wellOf('jump', false) === 'big' && wellOf('block', false) === 'mid');
  check('4b. in a fight: Block the big well, Jump the middle one (small: nothing lost)', wellOf('jump', true) === 'mid' && wellOf('block', true) === 'big');
  check('4c. a fight is only `true` (a truthy stand-in is no fight)', wellOf('jump', 1) === 'big' && wellOf('block', 'yes') === 'mid');
  check('4d. Skate and Charge share the mobility well; Attack and Special their own; the rest none',
    wellOf('skate') === 'mobility' && wellOf('charge') === 'mobility' && wellOf('attack') === 'attack' && wellOf('special') === 'special'
    && ['sprint', 'whirlwind', 'bash', 'quickeat', 'trap', 'burst', 'talk', '', null].every((n) => wellOf(n, true) === null && wellOf(n, false) === null));
  check('4e. the mobility well wears one control, Charge first, never both', ctxFor(true, true) === 'charge' && ctxFor(true, false) === 'skate'
    && ctxFor(false, true) === 'charge' && ctxFor(false, false) === null && ctxFor(1, 1) === null);
  const bad = [];
  for (const [land, vw] of SCREENS) {
    const L = padLayout(land, vw);
    const jb = padSpot('jump', L, 64, false), bb = padSpot('block', L, 56, true);
    const jm = padSpot('jump', L, 64, true), bm = padSpot('block', L, 56, false);
    if (jb.edge !== bb.edge || jb.bottom !== bb.bottom || jb.size !== bb.size) bad.push([vw, 'big']);
    if (jm.edge !== bm.edge || jm.bottom !== bm.bottom || jm.face !== bm.face) bad.push([vw, 'mid']);
    const b = L.wells.big.box;
    if (jb.edge !== Math.round(vw - b.x - Math.round(b.size) / 2) || jb.bottom !== Math.round(b.y - Math.round(b.size) / 2) || jb.face !== Math.round(L.wells.big.d)) bad.push([vw, 'place', jb]);
    if (padSpot('skate', L, 48).edge !== padSpot('charge', L, 52).edge) bad.push([vw, 'mobility']);
    if (jb.well !== 'big' || jm.well !== 'mid' || jb.side !== 'right') bad.push([vw, 'named']);
  }
  check('4f. the big well is the same box for Jump and for Block (so the swap moves nothing), and the middle well too', bad.length === 0, bad);
  const L = padLayout(false, 430);
  check('4g. a box is 44 at least, never today\'s bigger one (the owner\'s "too large")', padSpot('special', L, 90).size === 44 && padSpot('attack', L, 200).size === Math.round(L.wells.attack.d));
  check('4h. no well, no spot (it keeps today\'s place); no layout, no spot', padSpot('sprint', L, 50) === null && padSpot('attack', null, 50) === null);
}

/* ── 5. faces ── */
{
  const f = padFace('block', 'normal');
  check('5a. Block wears the shield; every other action its own picture', f.pic === 'shield' && padFace('jump', 'normal').pic === 'jump' && padFace('special', 'normal').pic === 'special');
  check('5b. unavailable dims (0.45), quiet less (0.75), normal not at all',
    padFace('jump', 'disabled').dim === 0.45 && padFace('jump', 'quiet').dim === 0.75 && padFace('jump', 'normal').dim === 1);
  check('5c. the cooldown\'s dark sector is what is left: all at its start, none at its end, a third at two thirds',
    padFace('block', 'cooldown', 0).sweep === 1 && padFace('block', 'cooldown', 1).sweep === 0 && near(padFace('block', 'cooldown', 2 / 3).sweep, 1 / 3, 1e-9)
    && padFace('block', 'cooldown').sweep === 1 && padFace('block', 'cooldown', 1.5).sweep === 0 && padFace('block', 'cooldown', -1).sweep === 1
    && padFace('block', 'normal', 0.5).sweep === 0);
  check('5d. ready glows; active (a raised guard) rings; neither otherwise',
    padFace('special', 'ready').glow === true && padFace('special', 'ready').ring === false
    && padFace('block', 'on').ring === true && padFace('block', 'on').glow === false && padFace('block', 'normal').ring === false);
  check('5e. Attack wears the weapon in hand: the bow, the staff, else the sword (every metal)',
    attackFace('', 'ranged').pic === 'attack-bow' && attackFace('', 'w-bow').pic === 'attack-bow'
    && attackFace('', 'staff').pic === 'attack-staff' && attackFace('', 'w-staff').pic === 'attack-staff'
    && attackFace('', 'melee').pic === 'attack-sword' && attackFace('', 'w-great-sword-iron').pic === 'attack-sword'
    && attackFace('', null).pic === 'attack-sword' && attackFace('', 'none').pic === 'attack-sword');
  check('5f. idle: the sword\'s own dim face, the bow and the staff dimmed; hot glows',
    attackFace('idle', 'melee').pic === 'attack-off' && attackFace('idle', 'melee').dim === 1
    && attackFace('idle', 'ranged').pic === 'attack-bow' && attackFace('idle', 'ranged').dim === 0.45
    && attackFace('hot', 'melee').glow === true && attackFace('', 'melee').glow === false && attackFace('idle', 'melee').glow === false);
  check('5g. a picture that is not an attack\'s (a tool, a door) sits on the empty well',
    attackFace('', 'axe').pic === 'socket' && attackFace('hot', 'door').glow === true && attackWeapon('__proto__') === null && attackWeapon('toString') === null);
  check('5h. a weapon well: lit on the weapon in hand, the icon when the slot holds one, the plain well when empty',
    weaponWell('melee', 'melee', true).ring === 'slot-on' && weaponWell('melee', 'melee', true).icon === 'icon-sword'
    && weaponWell('ranged', 'melee', true).ring === 'slot' && weaponWell('ranged', 'melee', true).icon === 'icon-bow'
    && weaponWell('staff', 'melee', false).ring === 'slot' && weaponWell('staff', 'melee', false).icon === null
    && weaponWell('staff', 'staff', false).ring === 'slot' && weaponWell('bogus', 'bogus', true).icon === null);
  /* the CSS draws attackFace's table (the attack's knob is stamped by the
     game loop, not rendered): every bow and staff key shows that face */
  const css = fs.readFileSync(path.join(REPO, 'src/styles/game.css'), 'utf8');
  const miss = Object.keys(PAD_ATTACK_ICONS).filter((k) => PAD_ATTACK_ICONS[k] !== 'sword').filter((k) => {
    const w = PAD_ATTACK_ICONS[k];
    const re = new RegExp('\\[data-ricon="' + k + '"\\][^{]*\\{?[^{]*img\\[data-pic="' + w + '"\\]');
    return !re.test(css);
  });
  check('5i. game.css shows the bow\'s and the staff\'s faces for every key attackFace gives them', miss.length === 0, miss);
  check('5j. each action has its accent', ['attack', 'jump', 'block', 'special', 'skate', 'charge'].every((k) => /^#[0-9A-F]{6}$/.test(PAD_ACCENT[k])));
}

/* ── 6. the switch ── */
check('6a. on unless ?padskin=0 is thrown', padOn(undefined) === true && padOn(false) === true && padOn(true) === false);
check('6a. never on a computer (a mouse the main pointer): today\'s places for the pill and Skate, which a computer shows (v2.3.6641)',
  padOn(false, true) === false && padOn(undefined, true) === false && padOn(false, false) === true && padOn(true, false) === false);
check('6b. every picture is named for the loading screen', padPictures().length === Object.keys(PAD_ART).length && padPictures().includes('housing'));

/* ── 7. the art ── */
{
  const dir = path.join(REPO, 'public/ui/pad');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)).sort();
  check('7a. exactly the pieces drawn are on disk (part 1\'s are gone)', JSON.stringify(files) === JSON.stringify(Object.keys(PAD_ART).sort()), files);
  const many = [];
  let total = 0;
  for (const n of Object.keys(PAD_ART)) {
    const b = fs.readFileSync(path.join(dir, n + '.png'));
    total += b.length;
    const type = b[25];
    const plte = b.indexOf('PLTE');
    const pal = plte > 0 ? b.readUInt32BE(plte - 4) / 3 : Infinity;
    if (type !== 3 || pal > 256 || b.readUInt32BE(16) !== PAD_ART[n].w) many.push([n, type, pal]);
  }
  check('7b. every piece a palette picture of 256 colours or fewer, the size padArt.js says', many.length === 0, many);
  check('7c. under 200 kB in all, as padArt.js says', total < 200 * 1024 && total === PAD_ART_BYTES, total);
  const L = padLayout(false, 430), W = L.wells;
  const biggest = {
    housing: [L.shell.w, 'w'], 'stick-base': [W.stick.d], 'stick-thumb': [L.thumb], slot: [W.w1.d], 'slot-on': [W.w1.d],
    skate: [W.mobility.d], charge: [W.mobility.d], special: [W.special.d],
    shield: [W.big.d], jump: [W.big.d], 'attack-sword': [W.attack.d], 'attack-bow': [W.attack.d], 'attack-staff': [W.attack.d],
    'attack-off': [W.attack.d], socket: [W.attack.d],
  };
  const off = Object.keys(biggest).filter((k) => Math.abs(PAD_ART[k].w - 2 * biggest[k][0]) > 6).map((k) => [k, PAD_ART[k].w, 2 * biggest[k][0]]);
  check('7d. each piece 2 px a CSS px at its biggest (within 3 CSS px)', off.length === 0, off);
  const ins = PAD_ART.housing.inside;
  check('7e. the housing\'s inside is measured: a top every 10 of the reference, the rail flat', ins && ins.step === 10 && ins.top.length === REF.W / 10 + 1
    && ins.top[30] === ins.top[40] && ins.left > 0 && ins.right > 0 && ins.bottom > 0);
}

/* ── 8. the narrow phone's give, and the edges of the rules ── */
{
  const U = padLayout(false, 430);
  check('8a. no width (or a bad one) is the owner\'s 430', [undefined, 0, -1, '430', NaN].every((v) => JSON.stringify(padLayout(false, v)) === JSON.stringify(U)));
  const gaps = [], rail = [];
  for (const [land, vw] of SCREENS) {
    const L = padLayout(land, vw), w = L.wells, s = L.s;
    if (!near(w.mid.x - w.mobility.x, Math.max(101 * s, PAD.GAP_PX), 1e-6) || !near(w.special.x - w.mid.x, Math.max(100 * s, PAD.GAP_PX), 1e-6)) gaps.push([vw, 'top']);
    if (!near(w.w2.x - w.w1.x, Math.max(101 * s, PAD.GAP_PX), 1e-6) || !near(w.w3.x - w.w2.x, Math.max(95 * s, PAD.GAP_PX), 1e-6)) gaps.push([vw, 'rail']);
    if (!near(w.w2.x, (L.shell.cutL + vw - L.shell.cutR) / 2 + 6 * s, 1e-6) || !near(w.w2.y, (280 - 211) * s, 1e-6)) rail.push(vw);
    const bigTop = Math.max(w.big.y + w.big.box.size / 2, w.attack.y + w.attack.box.size / 2);
    for (const n of ['mobility', 'mid', 'special']) {
      const b = w[n].box, low = b.y - b.size / 2;
      if (low < bigTop + 1 - 1e-6) gaps.push([vw, n, 'low']);
      if (b.y !== w[n].y && !near(low, bigTop + 1, 1e-6) && !near(b.y - b.size / 2, w[n].y + w[n].d / 2 - b.size, 1e-6)) gaps.push([vw, n, 'rose too far']);
    }
  }
  check('8b. neighbours\' centres are the owner\'s apart, or 45 px where that is closer; a top-row box rises just off the big ones', gaps.length === 0, gaps);
  check('8c. the weapon wells on the rail where the owner drew them (w2 6 right of its middle, 211 down)', rail.length === 0, rail);
  const full = SCREENS.filter(([l, vw]) => vw >= 390).filter(([l, vw]) => { const L = padLayout(l, vw); return !near(L.wells.mid.d, 80 * L.s, 1e-9); });
  check('8d. from 390 px up the top row\'s art is full size', full.length === 0, full);
  const N = padLayout(false, 375), M = padLayout(false, 360);
  check('8e. at 375 and 360 the top row\'s art gives (smaller, the boxes still 44), more at 360',
    N.wells.mid.d < 80 * N.s - 1e-6 && M.wells.mid.d / M.s < N.wells.mid.d / N.s && N.wells.mid.box.size === 44 && M.wells.mid.box.size === 44);
  check('8f. at 375 the row moved left no further than keeps Special inside (0.5 px less and Mobility is over the outline)',
    !insideShell(N, N.wells.mobility.x - 0.5, N.wells.mobility.y, N.wells.mobility.d / 2 * 1.06, 0) || !insideShell(N, N.wells.special.x + 0.5, N.wells.special.y, N.wells.special.d / 2, 0) || N.wells.mobility.x === 375 - (920 - REF_SLOTS.mobility[0]) * N.s);
  /* insideShell's edges: a well just inside the inside's left edge passes,
     a pixel past fails; the clearance is honoured; the rail's ceiling */
  const ins = PAD_ART.housing.inside, s = U.s, r = 10, y = 40;
  check('8g. insideShell: the inside\'s left edge, to the pixel', insideShell(U, ins.left * s + r + 0.01, y, r, 0) && !insideShell(U, ins.left * s + r - 1, y, r, 0));
  check('8h. insideShell: the inside\'s right edge and bottom, to the pixel',
    insideShell(U, 430 - ins.right * s - r - 0.01, y, r, 0) && !insideShell(U, 430 - ins.right * s - r + 1, y, r, 0)
    && insideShell(U, 200, ins.bottom * s + r + 0.01, r, 0) && !insideShell(U, 200, ins.bottom * s + r - 1, r, 0));
  const ceil = (280 - ins.top[30]) * s;
  check('8i. insideShell: the rail\'s ceiling, to the pixel', insideShell(U, 200, ceil - r - 0.05, r, 0) && !insideShell(U, 200, ceil - r + 1, r, 0));
  check('8j. insideShell: the clearance is kept on every side', insideShell(U, 200, 30, r, 2) && !insideShell(U, 200, ceil - r - 1, r, 2)
    && !insideShell(U, ins.left * s + r + 1, y, r, 2) && !insideShell(U, 200, ins.bottom * s + r + 1, r, 2) && !insideShell(U, 430 - ins.right * s - r - 1, y, r, 2));
  const lobe = U.wells.stick;
  check('8k. insideShell: the lobes\' curves are read (the stick at its place passes, 25 px up fails; Special 8 px right fails)',
    insideShell(U, lobe.x, lobe.y, lobe.d / 2, 0) && !insideShell(U, lobe.x, lobe.y + 25, lobe.d / 2, 0)
    && !insideShell(U, U.wells.special.x + 8, U.wells.special.y, U.wells.special.d / 2, 0) && insideShell(U, U.wells.special.x, U.wells.special.y, U.wells.special.d / 2, 0));
  const W2 = padLayout(true, 932);
  check('8l. insideShell reads the cuts on a stretched shell (sideways 932: the right lobe from its edge)',
    insideShell(W2, W2.wells.special.x, W2.wells.special.y, W2.wells.special.d / 2, 0) && !insideShell(W2, W2.wells.special.x, W2.wells.special.y + 12, W2.wells.special.d / 2, 0)
    && insideShell(W2, 466, 30, 10, 0) && !insideShell(W2, 466, 60, 10, 0));
  check('8m. insideShell: a well at the inside\'s left edge reads the lobe\'s first measured column (the corner)',
    !insideShell(U, ins.left * s + 1.01, 100, 1, 0) && insideShell(U, ins.left * s + 1.01, 30, 1, 0));
  const T = padLayout(false, 320), ts = T.s, sp = Math.max(101 * ts, 45) + Math.max(100 * ts, 45) - 201 * ts;
  check('8n. a column too narrow for any fit (320) draws the top row at 0.8, moved left half its spread',
    near(T.wells.mid.d, 0.8 * 80 * ts, 1e-9) && near(T.wells.mobility.x, 320 - (920 - 634) * ts - sp / 2, 1e-6));
}

/* ── 10 (v2.3.6641, card PAD part 4): a box risen off its art draws its art in the WELL ── */
{
  const bad = [], risen = [];
  for (const vw of [320, 375, 390, 430, 752, 844]) {
    const L = padLayout(false, vw);
    for (const [name, fight] of [['skate', false], ['jump', true], ['special', false], ['jump', false], ['block', true], ['attack', false]]) {
      const sp = padSpot(name, L, 50, fight), w = L.wells[sp.well];
      const art = sp.bottom + sp.size / 2 - sp.dy;   /* the face's centre over the band */
      if (Math.abs(art - w.y) > 0.06 || sp.dy < -0.5) bad.push([vw, name, art, w.y, sp.dy]);
      if (sp.dy > 0.5) risen.push(name);
    }
  }
  check('10a. every face\'s centre on its well\'s (0.06 px), the box risen or not (a rounding\'s fraction at most the other way)', bad.length === 0, bad);
  check('10b. the top row\'s boxes do rise at a phone\'s widths (the case the shift is for)', risen.includes('special') && risen.includes('skate'), risen);
}

/* ── 9 (v2.3.6641, card PAD part 4): the width it lays out at is the WORLD's ── */
check('9a. sideways under the one band the world (752, told) is narrower than the column (844): the world\'s',
  padWidthOf(844, 752) === 752);
check('9b. upright the two are one (430, 430): that; not told yet (0) or nonsense (-1): the column',
  padWidthOf(430, 430) === 430 && padWidthOf(844, 0) === 844 && padWidthOf(844, -1) === 844);
check('9c. a told width WIDER than the column (a stale one after a turn) never wins: the column',
  padWidthOf(430, 844) === 430);
{
  const W = padLayout(true, padWidthOf(844, 752));
  check('9d. laid out at the world\'s width the right lobe\'s wells end inside it (Attack\'s centre 752 - (920 - its x) s)',
    near(W.shell.w, 752, 1e-9) && near(W.wells.attack.x, 752 - (REF.W - REF_SLOTS.attack[0]) * W.s, 1e-9) && W.wells.attack.x + W.wells.attack.d / 2 < 752);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
