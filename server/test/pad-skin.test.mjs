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
 *      and over the band, and no two over each other.  v2.3.6642: Whirlwind and
 *      Shield Bash too, in the right lobe's tier while either shows (3c,
 *      3f-3p: inside its outline, clear of every socketed box, 44 px, only
 *      when shown, nothing moved by their coming).
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
  PAD_ATTACK_ICONS, weaponWell, insideShell, padOn, padPictures, padWidthOf, pressGate, PRESS_GHOST_MS,
  SPECIAL_KINDS, SPECIAL_COLS, TIER_BAND, specialLayout, specialSpot, clearOfTier, TIER_AIR,
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

/* ── 3. touch boxes ── v2.3.6642 (card PAD part 6): EVERY control the old
   layout draws in the controller, not only the socketed ones: Whirlwind and
   Shield Bash in the right lobe's tier (specialLayout) with both shown */
const ALL = (L) => {
  const T = specialLayout(L, { bash: true, whirl: true });
  const w = Object.assign(Object.create(null), L.wells);
  for (const k of SPECIAL_KINDS) w[k] = T.wells[k];
  return { wells: w, names: WELLS.concat(SPECIAL_KINDS), rise: T.rise };
};
{
  const small = [], over = [], out = [], hold = [];
  for (const [land, vw] of SCREENS) {
    const L = padLayout(land, vw), A = ALL(L);
    for (const n of A.names) {
      const b = A.wells[n].box, w = A.wells[n];
      if (b.size < PAD.BOX || b.size < w.d - 1e-9) small.push([vw, n, b.size]);
      if (b.x - b.size / 2 < 0 || b.x + b.size / 2 > vw || b.y - b.size / 2 < 0) out.push([vw, n]);
      if (Math.abs(b.x - w.x) > (b.size - w.d) / 2 + 1e-9 || Math.abs(b.y - w.y) > (b.size - w.d) / 2 + 1e-9) hold.push([vw, n]);
    }
    for (let i = 0; i < A.names.length; i++) for (let j = i + 1; j < A.names.length; j++) {
      const a = A.wells[A.names[i]].box, c = A.wells[A.names[j]].box;
      if (Math.abs(a.x - c.x) < (a.size + c.size) / 2 && Math.abs(a.y - c.y) < (a.size + c.size) / 2) over.push([vw, A.names[i], A.names[j]]);
    }
  }
  check('3a. every touch box at least 44 px and never smaller than its art', small.length === 0, small);
  check('3b. no two touch boxes over each other, at every screen', over.length === 0, over);
  check('3c. every touch box inside the screen and over the band (Whirlwind and Shield Bash too)', out.length === 0, out);
  check('3d. every touch box holds its own art', hold.length === 0, hold);
  const L = padLayout(false, 375);
  check('3e. on a narrow phone a top-row box rises off the big buttons\' (375: Mobility\'s box over its art\'s centre)',
    L.wells.mobility.box.y > L.wells.mobility.y);
}

/* ── 3f-3n. v2.3.6642 (card PAD part 6): WHIRLWIND AND SHIELD BASH, the
   tier over the right lobe.  The gatekeeper (debts.md 66): "pad-skin.test 3c
   checks only socketed controls".  Each dodge planted and seen red:
   outside the housing (3f), over a socketed control (3b above, 3g), under
   44 (3a above, 3h), drawn though not shown (3i), the layout moving when
   one comes (3j, 3k). ── */
{
  const outside = [], bare = [], clash = [], tiny = [];
  for (const [land, vw] of SCREENS) {
    const L = padLayout(land, vw), T = specialLayout(L, { bash: true, whirl: true });
    for (const k of SPECIAL_KINDS) {
      const w = T.wells[k];
      /* its art inside the TIER's housing (the shell drawn `rise` taller) */
      if (!insideShell(Object.assign({}, L, { rise: T.rise }), w.x, w.y, w.d / 2, 0)) outside.push([vw, k, T.rise]);
      /* ...and the shell as drawn without the tier has no room for it (why the tier) */
      if (insideShell(L, w.x, w.y, w.d / 2, 0)) bare.push([vw, k]);
      for (const n of WELLS) {
        const a = w.box, c = L.wells[n].box;
        if (Math.abs(a.x - c.x) < (a.size + c.size) / 2 && Math.abs(a.y - c.y) < (a.size + c.size) / 2) clash.push([vw, k, n]);
      }
      if (w.box.size < PAD.BOX || w.d < 0.8 * 80 * L.s - 1e-6) tiny.push([vw, k, w.box.size, w.d]);
    }
  }
  check('3f. Whirlwind\'s and Shield Bash\'s art inside the tier\'s gold outline, at every screen', outside.length === 0, outside);
  check('3f2. the housing without the tier holds neither (no free place: the tier is the room)', bare.length === 0, bare);
  check('3g. neither box over a socketed control\'s (Attack, the big well, the top row, the weapon wells, the stick)', clash.length === 0, clash);
  check('3h. each box 44 px at least, its art the top row\'s size (0.8 of the scale at the least)', tiny.length === 0, tiny);
  const L = padLayout(false, 430);
  const none = specialLayout(L, {}), onlyBash = specialLayout(L, { bash: true }), onlyWhirl = specialLayout(L, { whirl: true, bash: 1 });
  check('3i. drawn only when shown (`true`): none shown is no tier; one shown is that one alone; a truthy stand-in is not shown',
    none === null && specialLayout(L, null) === null && specialLayout(null, { bash: true }) === null
    && !!onlyBash && Object.keys(onlyBash.wells).join() === 'bash' && !!onlyWhirl && Object.keys(onlyWhirl.wells).join() === 'whirl'
    && specialSpot('whirl', L, { bash: true }) === null && specialSpot('bash', L, { whirl: true }) === null && !!specialSpot('bash', L, { bash: true }));
  const both = specialLayout(L, { bash: true, whirl: true });
  check('3j. nothing shifts as one comes or goes: each one\'s place and the tier\'s height the same whichever shows',
    JSON.stringify(onlyBash.wells.bash) === JSON.stringify(both.wells.bash) && JSON.stringify(onlyWhirl.wells.whirl) === JSON.stringify(both.wells.whirl)
    && onlyBash.rise === both.rise && onlyWhirl.rise === both.rise);
  const before = JSON.stringify(padLayout(false, 390));
  const L2 = padLayout(false, 390); specialLayout(L2, { bash: true, whirl: true }); specialSpot('whirl', L2, { whirl: true });
  check('3k. the socketed controls never move for them (the layout untouched by the tier)', JSON.stringify(L2) === before);
  check('3l. Whirlwind over Special and Shield Bash over the mobility well (the shield, the big well, under it), above the top row',
    SPECIAL_COLS.whirl === 'special' && SPECIAL_COLS.bash === 'mobility'
    && near(both.wells.whirl.x, L.wells.special.x, 1e-9) && near(both.wells.bash.x, L.wells.mobility.x, 1e-9)
    && both.wells.whirl.box.y - both.wells.whirl.box.size / 2 > L.wells.special.box.y + L.wells.special.box.size / 2);
  /* the tier is modest: one row of the top row's size (the owner: "too large") */
  const rises = SCREENS.map(([l, vw]) => { const P = padLayout(l, vw); return [vw, specialLayout(P, { whirl: true }).rise, P.shell.h]; });
  check('3m. the tier is one row: the right lobe at most 45 px taller (a third of the shell), never shorter than needed',
    rises.every(([vw, r, h]) => r > 0 && r <= 45 && r <= h / 2.5), rises);
  const S0 = specialSpot('whirl', L, { whirl: true }), w0 = both.wells.whirl;
  check('3n. a spot is its well: the box\'s edge from the right, its bottom over the band, the face the well\'s size, drawn `dy` lower',
    !!S0 && S0.size === Math.round(w0.box.size) && S0.edge === Math.round(430 - w0.box.x - S0.size / 2) && S0.bottom === Math.round(w0.box.y - S0.size / 2)
    && S0.face === Math.round(w0.d) && near(S0.dy, S0.bottom + S0.size / 2 - w0.y, 0.06) && S0.dy > 0, { S0, w0 });
  /* the tier's height as PadHousings draws it: rows over TIER_BAND lifted by
     the rise, the band stretched, the rows under it where they were */
  const R = Object.assign({}, L, { rise: 40 }), x = 430 - 60;
  const flat = (t) => insideShell(R, x, (280 - t) * L.s + 40 - 3, 2, 0);
  check('3o. the tier\'s inside: the lobe\'s top lifted by the rise, no further; the left lobe and the rail unmoved',
    flat(24) === true && insideShell(R, x, (280 - 24) * L.s + 40 + 3, 2, 0) === false
    && insideShell(R, L.wells.stick.x, (280 - 52) * L.s + 3, 1, 0) === false
    && insideShell(R, 200, (280 - 168) * L.s + 3, 2, 0) === false && TIER_BAND.top < TIER_BAND.bottom);
  /* inside the band the shoulder is stretched, not lifted: at its column
     (ref x 575, its top about row 97) the inside reaches the stretched
     height, under the lifted one */
  const xs = 430 - (920 - 575) * L.s;
  check('3o2. in the stretched band the shoulder is stretched (under the lifted height), over it the rows lifted whole',
    insideShell(R, xs, 90, 0.5, 0) === true && insideShell(L, xs, 90, 0.5, 0) === false && insideShell(R, xs, 110, 0.5, 0) === false);
  /* the band is where the right lobe's left wall is steep, so stretched it
     stays a wall: over it the outline's corner, under it the shoulder bends
     into the rail (the wall's column, housing.png's measure, moves under 15
     of the reference over the band) */
  const ins = PAD_ART.housing.inside;
  const wallAt = (row) => { for (let x = 520; x <= 700; x += ins.step) { const t = ins.top[x / ins.step]; if (t != null && t <= row) return x; } return null; };
  const walls = []; for (let r = TIER_BAND.top; r <= TIER_BAND.bottom; r += 5) walls.push(wallAt(r));
  check('3o3. the stretched band is the steep wall (its column moves under 15 reference px; the right wall straight there)',
    walls.every((w) => w != null) && Math.max(...walls) - Math.min(...walls) < 15 && TIER_BAND.top >= 60
    && ins.top.slice(-4).filter((t) => t != null).every((t) => t <= TIER_BAND.top), walls);
  /* who is shown is the old buttons' own rule, never a second one: the
     tier is told from AbilityButtons' list (abilityStatus: Whirlwind the
     sword's, Bash the raised shield's), and each button anchors from it */
  const AB = fs.readFileSync(path.join(REPO, 'src/ui/panels/AbilityButtons.jsx'), 'utf8');
  const AS = fs.readFileSync(path.join(REPO, 'src/game/abilities.js'), 'utf8');
  check('3p. the tier shows what the old buttons show: told from their one list (abilityStatus, visible and engaged), the sword\'s Whirlwind, the raised shield\'s Bash',
    /var live = liveSpecials\(S\) \|\| \[\];/.test(AB) && /var tierKey = live\.map\(/.test(AB) && /padTierBus\.set\(tierKey \?/.test(AB)
    && /if \(st\.visible && st\.engaged !== false\) live\.push/.test(AB) && /padSpecialAnchor\(kind, isLandscape, shownPair\)/.test(AB)
    && /needsMelee \|\| \(prog3ActiveCat\(R\) === 'sword'/.test(AS) && /needsHeld \|\| \(!!R\.shield && !!\(S && S\._shieldUp\)\)/.test(AS));
}

/* ── 3q. v2.3.6642: a control with no well (Sprint) clear of the tier,
   always (never a jump as a fight starts); mp-padskin 8b found Sprint's old
   place 10 px into it upright ── */
{
  const bad = [];
  for (const [land, vw] of SCREENS) {
    const L = padLayout(land, vw), T = specialLayout(L, { bash: true, whirl: true }), top = L.shell.h + T.rise;
    const into = { right: 30, bottomPx: Math.round(top - 10), size: 48 };
    const up = clearOfTier(L, into);
    if (!(up.bottomPx >= top + TIER_AIR && up.bottomPx < top + TIER_AIR + 1 && up.right === 30 && up.size === 48)) bad.push([vw, 'lift', up]);
    const high = { right: 30, bottomPx: Math.ceil(top + 20), size: 48 };
    if (clearOfTier(L, high) !== high) bad.push([vw, 'high moved']);
    const beside = { right: Math.ceil(L.shell.cutR) + 1, bottomPx: 20, size: 48 };
    if (clearOfTier(L, beside) !== beside) bad.push([vw, 'beside moved']);
    const edge = { right: Math.floor(L.shell.cutR) - 1, bottomPx: 20, size: 48 };
    if (clearOfTier(L, edge).bottomPx < top + TIER_AIR) bad.push([vw, 'edge kept']);
    if (clearOfTier(L, up).bottomPx !== up.bottomPx) bad.push([vw, 'twice']);
  }
  check('3q. a control with no well over the right lobe stands TIER_AIR over the tier\'s top, the tier drawn or not; one beside the lobe or above it unmoved',
    bad.length === 0 && clearOfTier(null, { right: 1 }).right === 1, bad);
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

/* ── 11 (v2.3.6641, the gatekeeper's sitting 67): Block's one press.  The
   browser's mouse press follows touchend; a press held past the wait was
   stamped at touchstart only and toggled twice (Chrome) ── */
{
  const run = (evs) => { let at = 0, n = 0; for (const [type, t] of evs) { const g = pressGate(type, t, at); at = g.at; if (g.go) n++; } return n; };
  check('11a. a quick tap (touchstart, touchend, the mouse press after): ONE toggle',
    run([['touchstart', 10000], ['touchend', 10070], ['mousedown', 10080]]) === 1);
  check('11b. a press held 1.5 s (past 800 ms from touchstart): still ONE toggle, the lift stamped',
    run([['touchstart', 10000], ['touchend', 11500], ['mousedown', 11510]]) === 1);
  check('11c. a real mouse press later (past ' + PRESS_GHOST_MS + ' ms from the lift): it toggles',
    run([['touchstart', 10000], ['touchend', 10070], ['mousedown', 10070 + PRESS_GHOST_MS]]) === 2);
  check('11d. a mouse alone toggles every press; the lift alone never does',
    run([['mousedown', 10000], ['mousedown', 10100]]) === 2 && run([['touchend', 10000]]) === 0);
  check('11e. a second touch inside the wait toggles (a touch is never a ghost)',
    run([['touchstart', 10000], ['touchend', 10070], ['touchstart', 10200]]) === 2);
  check('11f. a mouse press while the finger is still down (inside the wait from touchstart): the same press',
    run([['touchstart', 10000], ['mousedown', 10100], ['touchend', 10300]]) === 1);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
