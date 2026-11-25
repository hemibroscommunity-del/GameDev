/* ═══ v2.3.6641: THE CONTROLLER, ONE HOUSING ON THE DASHBOARD (card PAD part 3; `?padskin=0` today's look) ═══
 * The owner, 2026-11-25, after trying part 1's two grips (v2.3.6640) on their
 * iPhone: "The controller is too large and doesn't connect in a seamless way
 * to the dashboard. The shape also doesn't make much sense. Here's a
 * redesign showing how it should attach to the dashboard. Make the jump
 * button turn into the shield button while in combat. Tapping attack button
 * or shield button again lowers it".
 *
 * ONE SHELL (public/ui/pad/housing.png): the stick's lobe at the left, a low
 * rail in the middle, the taller lobe at the right, its gold outline
 * unbroken; it spans the play column, its bottom edge ON the band's top edge.
 * Drawn as three cuts of the one picture (CSS border-image: the lobes at
 * their own shape, the rail stretched), so any width keeps the outline whole.
 *
 * THE WELLS are the owner's layout.json (each control's centre and size in a
 * 920 x 280 reference: REF_SLOTS below), all scaled together by the column's
 * width (`s`, capped at the owner's 430 px phone: never scaled up past it):
 * at 430 px the shell is 131 px tall, Attack and the big left button 65,
 * the three small wells 37, the weapon wells 41, the stick's base 83.
 *   left lobe    the stick (its base always drawn, the thumb at its middle
 *                at rest: TouchControls moves it as today)
 *   the rail     three WEAPON WELLS, today's order (melee, ranged, staff:
 *                WeaponPill's), in place of the pill
 *   right lobe   top row: the shared MOBILITY well (Skate or Charge, never
 *                both: ctxFor), the MIDDLE well, SPECIAL; bottom row: the
 *                BIG left button, ATTACK
 * Jump becomes the shield in a fight (the owner's words): out of a fight the
 * big button is Jump and the middle well is empty; in one (exactly when the
 * Block button shows today: ShieldButton blockLive) the big button is Block,
 * wearing the shield, and Jump is in the middle well, small (wellOf).
 *
 * TOUCH BOXES are not the art: every control's box is at least 44 x 44 CSS
 * px, holds its art, and overlaps no other (pad-skin.test 3).  Below 430 px
 * the art shrinks with the column but a box does not: where two would touch,
 * their wells are spread apart (GAP_PX between box centres at least) and a
 * top-row box rises off the big buttons' (padLayout).
 *
 * No imports but the measured art (a data module): node tests it
 * (server/test/pad-skin.test.mjs).
 */
import { PAD_ART } from '../data/padArt.js';

/* the owner's layout.json (assets/icons-source/owner-2026-11-25-pad3):
   [centre x, centre y, size] in the 920 x 280 reference.  The top row is
   moved down 4 (62 -> 66): at 62 its wells reach 1.5 over the outline's
   inside (padArt.js housing.inside: 23.5); the weapon wells down 4 (207 ->
   211) and the first one 88 -> 86, the three alike: at 207 they sat 4 on
   the rail's gold (its inside from 167.8).  The card's "clear of the outline" */
export const REF = Object.freeze({ W: 920, H: 280 });
export const REF_SLOTS = Object.freeze({
  stick: [118, 159, 178],
  thumb: [118, 159, 86],
  w1: [295, 211, 86],
  w2: [396, 211, 86],
  w3: [491, 211, 86],
  mobility: [634, 66, 80],
  mid: [735, 66, 80],
  special: [835, 66, 80],
  big: [638, 183, 140],
  attack: [809, 183, 140],
});

export const PAD = Object.freeze({
  /* the play column this was drawn for (the owner's phone, upright): the
     scale stops growing here, a wider column stretches the rail */
  REF_VW: 430,
  /* the three cuts, reference px: the left lobe ends and the right lobe
     starts where the rail is flat (housing.inside.top: 167.8 from 260 to 520) */
  CUT_L: 260,
  CUT_R: 400,
  /* a touch box's least size, CSS px (Apple's 44) */
  BOX: 44,
  /* the least distance between two neighbours' box centres in a row (px):
     a box and a pixel of air */
  GAP_PX: 45,
});

/* each action's accent: its ready glow and active ring */
export const PAD_ACCENT = Object.freeze({
  attack: '#FFB347', jump: '#8CFF5A', block: '#46CFFF', special: '#FFD84A',
  skate: '#E58CFF', charge: '#E58CFF',
});

export const WELLS = Object.freeze(['stick', 'w1', 'w2', 'w3', 'mobility', 'mid', 'special', 'big', 'attack']);

/** The controller on this screen: `land` sideways, `vw` the play column's
 *  width (CSS px).  { s, shell: { w, h, cutL, cutR }, wells }: each well's
 *  { x, y, d, box: { x, y, size } } -- x px from the column's left to its
 *  centre, y px over the band's top edge, d the art's size; the box the touch
 *  box's centre and side.  `land` changes nothing today (the card's reading
 *  9: the same one shell along the band, the rail stretched); it is kept so a
 *  sideways tune has its place. */
export function padLayout(land, vw) {
  const width = typeof vw === 'number' && vw > 0 ? vw : PAD.REF_VW;
  const s = Math.min(width, PAD.REF_VW) / REF.W;
  const shell = { w: width, h: Math.round(REF.H * s), cutL: PAD.CUT_L * s, cutR: PAD.CUT_R * s };
  const up = (y) => (REF.H - y) * s;
  const fromL = (x) => x * s;
  const fromR = (x) => width - (REF.W - x) * s;
  const wells = Object.create(null);
  const put = (name, x, y, d) => { wells[name] = { x, y, d, box: { x, y, size: Math.max(PAD.BOX, d) } }; };
  const R = REF_SLOTS;
  put('stick', fromL(R.stick[0]), up(R.stick[1]), R.stick[2] * s);
  /* the right lobe: anchored to the column's right edge */
  put('big', fromR(R.big[0]), up(R.big[1]), R.big[2] * s);
  put('attack', fromR(R.attack[0]), up(R.attack[1]), R.attack[2] * s);
  /* the top row: where boxes would touch it spreads RIGHTWARD from
     Mobility, into the air Special has before the outline (the lobe's left
     flank is steep at Mobility's shoulder), then moves left as little as
     keeps both ends inside (insideShell, below) */
  const gapL = Math.max((R.mid[0] - R.mobility[0]) * s, PAD.GAP_PX);
  const gapR = Math.max((R.special[0] - R.mid[0]) * s, PAD.GAP_PX);
  const spread = gapL + gapR - (R.special[0] - R.mobility[0]) * s;
  const topY = up(R.mid[1]);
  const row = (mobX, k) => {
    put('mobility', mobX, topY, R.mobility[2] * s * k);
    put('mid', mobX + gapL, topY, R.mid[2] * s * k);
    put('special', mobX + gapL + gapR, topY, R.special[2] * s * k);
  };
  const out = { s, land: !!land, shell, wells, thumb: R.thumb[2] * s };
  const fits = (n) => insideShell(out, wells[n].x, wells[n].y, wells[n].d / 2, 0);
  /* the least leftward move that keeps both ends inside; under about 390
     px no move does (three 44 px boxes need 90 px of centres, the lobe's
     top holds about 200 s), so the row's ART shrinks a step at a time, to
     0.8 of its size at the least (its boxes stay 44): what gives on a
     narrow phone, said in the PR */
  let placed = false;
  for (let k = 1; k >= 0.8 - 1e-9 && !placed; k -= 0.05) {
    for (let left = 0; left <= Math.max(0, spread) + 1e-9; left += 0.5) {
      row(fromR(R.mobility[0]) - left, k);
      if (fits('mobility') && fits('special')) { placed = true; break; }
    }
  }
  if (!placed) row(fromR(R.mobility[0]) - Math.max(0, spread) / 2, 0.8);
  /* a top-row box rises off the big buttons' boxes (it still holds its art) */
  const bigTop = Math.max(wells.big.y + wells.big.box.size / 2, wells.attack.y + wells.attack.box.size / 2);
  for (const n of ['mobility', 'mid', 'special']) {
    const w = wells[n];
    const low = w.y - w.box.size / 2;
    if (low < bigTop + 1) w.box.y = Math.min(w.y + (bigTop + 1 - low), w.y - w.d / 2 + w.box.size / 2);
  }
  /* the rail: the weapon wells centred on the rail as the owner drew them
     (w2 6 of the reference right of the rail's middle), spread apart where
     boxes would touch */
  const railMid = (shell.cutL + (width - shell.cutR)) / 2 + (R.w2[0] - (PAD.CUT_L + (REF.W - PAD.CUT_R)) / 2) * s;
  const wy = up(R.w2[1]);
  put('w2', railMid, wy, R.w2[2] * s);
  put('w1', railMid - Math.max((R.w2[0] - R.w1[0]) * s, PAD.GAP_PX), wy, R.w1[2] * s);
  put('w3', railMid + Math.max((R.w3[0] - R.w2[0]) * s, PAD.GAP_PX), wy, R.w3[2] * s);
  return out;
}

/** The well a control sits in: `fight` is whether the Block button shows
 *  today (ShieldButton blockLive: the one rule, not a second).  Out of a
 *  fight the big button is Jump and Block has no well; in one the big button
 *  is Block and Jump is in the middle well.  Skate and Charge share the
 *  mobility well.  Null: no well (it keeps today's place). */
export function wellOf(name, fight) {
  if (name === 'attack' || name === 'special') return name;
  if (name === 'skate' || name === 'charge') return 'mobility';
  if (name === 'jump') return fight === true ? 'mid' : 'big';
  if (name === 'block') return fight === true ? 'big' : 'mid';
  return null;
}

/** A control's box in the controller: { side: 'right', edge, bottom, size,
 *  face } (`edge` px from the column's right edge to the box, `bottom` px
 *  over the band), the box padLayout's, the face its art's size.  `today`
 *  is the control's size with `?padskin=0`, kept for the record (a box is
 *  44 at least, never today's bigger one: the owner's "too large"). */
export function padSpot(name, layout, today, fight) {
  const k = wellOf(name, fight);
  if (!k || !layout || !layout.wells[k]) return null;
  const w = layout.wells[k];
  const size = Math.round(w.box.size);
  return {
    side: 'right', well: k,
    edge: Math.round(layout.shell.w - w.box.x - size / 2),
    bottom: Math.round(w.box.y - size / 2),
    size, face: Math.round(w.d),
  };
}

/** The mobility well's one control: Charge when the game shows it (a
 *  fight's, thumbSide.js chargeShown), else Skate when the skateboard is
 *  offered (ride.js), else nothing (the empty well).  Never both. */
export function ctxFor(skateShown, chargeShown) {
  if (chargeShown === true) return 'charge';
  if (skateShown === true) return 'skate';
  return null;
}

/* ═══ WHAT A FACE WEARS ═══
 * One picture an action (public/ui/pad/<name>.png).  Unavailable is the same
 * picture dimmed by CSS (opacity and a dark wash: never a filter, which an
 * iPhone pays a layer for on a control always on screen); Attack's sword
 * has the owner's own dimmed face (attack-off).  Pressed (the face 0.96, 100
 * ms), the cooldown (a dark sector over the face, never the rim) and the
 * active ring are drawn over it (game.css .bt-pad).
 * `state` is the skin's own (controlSkin Skin: normal, cooldown, disabled,
 * ready, on, quiet).  { pic, dim, sweep, glow, ring }: sweep the dark
 * sector's share of the face. */
export function padFace(name, state, progress) {
  const cool = state === 'cooldown';
  /* the dark sector is what is LEFT of the cooldown (`progress` the share
     run, 0..1): all of the face at its start, none at its end */
  const sweep = !cool ? 0 : typeof progress === 'number' ? Math.max(0, Math.min(1, 1 - progress)) : 1;
  return {
    pic: name === 'block' ? 'shield' : name,
    dim: state === 'disabled' ? 0.45 : state === 'quiet' ? 0.75 : 1,
    sweep,
    glow: state === 'ready',
    ring: state === 'on',
  };
}

/** The attack button's face from the resolver's `data-rstate` and the
 *  picture its knob shows (`data-ricon`, controlSkin RDISC_WEAPON_KEYS): the
 *  bow's face for the bow, the staff's for the staff, the sword's for every
 *  other attack; any other picture (a harvest's tool, a door, a bed) on the
 *  EMPTY well.  idle is unavailable: the sword's own dimmed face, the bow and
 *  staff dimmed by CSS.  game.css .bt-rjoy-base[data-pad] draws this table
 *  (pad-skin.test 6 reads it there). */
export const PAD_ATTACK_ICONS = Object.freeze({
  '': 'sword', none: 'sword', melee: 'sword', ranged: 'bow', staff: 'staff', 'w-bow': 'bow', 'w-staff': 'staff',
});
export function attackWeapon(ricon) {
  if (ricon == null) return 'sword';
  const k = String(ricon);
  if (Object.prototype.hasOwnProperty.call(PAD_ATTACK_ICONS, k)) return PAD_ATTACK_ICONS[k];
  if (k.indexOf('w-') === 0) return 'sword';   /* the swords and great swords, every metal */
  return null;
}
export function attackFace(rstate, ricon) {
  const w = attackWeapon(ricon);
  if (!w) return { pic: 'socket', dim: 1, glow: rstate === 'hot' };
  if (rstate === 'idle') return { pic: w === 'sword' ? 'attack-off' : 'attack-' + w, dim: w === 'sword' ? 1 : 0.45, glow: false };
  return { pic: 'attack-' + w, dim: 1, glow: rstate === 'hot' };
}

/** A weapon well's look: `slot` its slot (melee, ranged, staff), `active`
 *  the slot in hand, `has` whether the slot holds a weapon.  { ring, icon }:
 *  the lit ring on the one in hand, the weapon's icon inside; an empty slot
 *  the plain well. */
export const WEAPON_SLOTS = Object.freeze(['melee', 'ranged', 'staff']);
const SLOT_ICON = Object.freeze({ melee: 'icon-sword', ranged: 'icon-bow', staff: 'icon-staff' });
export function weaponWell(slot, active, has) {
  return { ring: slot === active && has === true ? 'slot-on' : 'slot', icon: has === true ? SLOT_ICON[slot] || null : null };
}

/** Whether a point (px, y over the band) at radius r sits inside the
 *  shell's dark inside, `clear` px off the gold at least: the housing's
 *  measured inside (padArt.js housing.inside, reference units) mapped
 *  through the three cuts.  The test's (pad-skin.test 4) and QA's. */
export function insideShell(layout, x, y, r, clear, art) {
  const A = art || PAD_ART;
  const ins = A && A.housing && A.housing.inside;
  if (!ins || !layout) return false;
  const { s, shell } = layout;
  const c = typeof clear === 'number' ? clear : 0;
  const toRef = (px) => {
    if (px <= shell.cutL) return px / s;
    if (px >= shell.w - shell.cutR) return REF.W - (shell.w - px) / s;
    return PAD.CUT_L + 1;   /* the rail: flat */
  };
  /* between two measured columns, the line between them; past the last
     measured column at either end (the inside's own edge), that column's */
  const topAt = (rx) => {
    const i = rx / ins.step, i0 = Math.floor(i), i1 = Math.ceil(i);
    const a = ins.top[i0], b = ins.top[i1];
    if (a == null && b == null) return null;
    if (a == null || b == null) return a == null ? b : a;
    return a + (b - a) * (i - i0);
  };
  if (x - r < ins.left * s + c || x + r > shell.w - ins.right * s - c) return false;
  if (y - r < ins.bottom * s + c) return false;
  for (let dx = -r; dx <= r; dx += 0.5) {
    const t = topAt(toRef(x + dx));
    if (t == null) return false;
    const ceil = (REF.H - t) * s - c;
    if (y + Math.sqrt(Math.max(0, r * r - dx * dx)) > ceil) return false;
  }
  return true;
}

/** `?padskin=0`: today's look.  `thrown` the switch's (switches.js
 *  sw('padskin')), handed by the caller; on a computer the controls are
 *  hidden either way (bt-desktop-hide), so nothing there changes. */
export function padOn(thrown) {
  return thrown !== true;
}

/** Every picture the controller draws, for the loading screen to warm. */
export function padPictures() {
  return Object.keys(PAD_ART);
}
