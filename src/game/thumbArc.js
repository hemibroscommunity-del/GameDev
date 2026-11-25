/* ═══ v2.3.6549: THE RIGHT THUMB'S ARC (card CT part 16) ═══
 * The owner, 2026-11-24, of Block in a fixed spot and the layout: "Yes and
 * help position the size and arrangement of the buttons to cater to users
 * using their thumb on that side to do the work".
 *
 * In the two buttons (`?manual=5`) the right side is laid out for a RIGHT
 * THUMB, whose tip sweeps an arc about a pivot below the screen's lower right
 * corner:
 *   - ATTACK the biggest, where the thumb rests (low, near the right edge);
 *   - an INNER RING round Attack, on the thumb's arc: JUMP to its left (the
 *     thumb rolls left without lifting), BLOCK up and left, SPECIAL above;
 *   - an OUTER RING one button further out: CHARGE, WHIRLWIND, SHIELD BASH;
 * each button in a spot of its OWN that never moves when another comes or
 * goes (a thumb learns a place; a button that slid when Block appeared would
 * be pressed by mistake).  Spots are (ring, angle about Attack's centre;
 * 180 left, 90 straight up).  The rings' radii are worked out from the
 * sizes so that the air between ANY two buttons is at least `gap`: the inner
 * ring clears Attack and its neighbours along the arc, the outer ring is one
 * button and a gap beyond the inner (so it clears every inner spot whatever
 * the angles).  Nothing is under 44 points (Apple's touch target), and no
 * spot reaches the movement half (the left stick's 50%).
 *
 * SIZES come from the play column (playViewport.js playVw / playVh, kept
 * sizes: no layout read; TRAPS 214): upright the width decides (430, the
 * owner's phone, is 1), sideways the height (430 again).  Sideways the fan
 * turns flatter (the screen is short: the top bar and the minimap sit above
 * it), spreading left where there is room.
 *
 * The caller adds the band (ctlBottom: the dashboard's height) to `bottom`;
 * `right` is from the play column's edge, as every control's (sideways 50 px
 * in, the old disc's, clears the notch: the page draws under it).
 * No imports: node tests it (server/test/thumb-arc.test.mjs).
 */

export const ARC = Object.freeze({
  MIN_PX: 44,
  /* v2.3.6549: fitted on the owner's phone, measured in the game (430 x 775 upright: the band 257 px, the
     weapon pill 136 x 48 at its foot left of Attack, the skateboard's button and the minimap above; 775 x 430
     sideways: the band 48, the minimap's 132 px plate top right, the notch's strip at the right edge's middle,
     the old buttons' 50 px in from the edge kept for it).  Upright the pill takes the level spot left of Attack,
     so Jump stands up and left of it (160); sideways Jump is level (180). */
  up: Object.freeze({ ref: 430, attack: 84, btn: 52, gap: 12, edge: 30, foot: 22,
    spots: Object.freeze({ jump: [1, 160], block: [1, 115], special: [1, 70], charge: [2, 130], whirl: [2, 105], bash: [2, 80] }) }),
  side: Object.freeze({ ref: 430, attack: 94, btn: 52, gap: 12, edge: 50, foot: 10,
    spots: Object.freeze({ jump: [1, 180], block: [1, 125], special: [1, 80], charge: [2, 120], whirl: [2, 145], bash: [2, 170] }) }),
});

export const ARC_NAMES = Object.freeze(['attack', 'jump', 'block', 'special', 'charge', 'whirl', 'bash']);

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/** The arc's numbers for this screen: `land` sideways, `vw` / `vh` the play
 *  column's (CSS px).  { size, btn, gap, cx, cy, r1, r2 }: Attack's size,
 *  every other button's, the air, Attack's centre (px from the right edge,
 *  px over the band) and the two rings' radii. */
export function arcFrame(land, vw, vh) {
  const T = land ? ARC.side : ARC.up;
  const short = land ? vh : vw;
  const k = clamp((typeof short === 'number' && short > 0 ? short : T.ref) / T.ref, 0.8, 1.15);
  const size = Math.max(ARC.MIN_PX, Math.round(T.attack * k));
  const btn = Math.max(ARC.MIN_PX, Math.round(T.btn * k));
  const gap = Math.max(10, Math.round(T.gap * k));
  const cx = Math.round(T.edge * k) + size / 2;
  const cy = Math.round(T.foot * k) + size / 2;
  /* the inner ring: clears Attack, and two neighbours `step` degrees apart
     on it clear each other (a chord of btn + gap) */
  let step = 180;
  const angs = [];
  for (const n in T.spots) if (T.spots[n][0] === 1) angs.push(T.spots[n][1]);
  angs.sort((a, b) => a - b);
  for (let i = 1; i < angs.length; i++) step = Math.min(step, angs[i] - angs[i - 1]);
  const chord = (btn + gap) / (2 * Math.sin((step * Math.PI) / 360));
  const r1 = Math.ceil(Math.max(size / 2 + gap + btn / 2, chord));
  const r2 = r1 + btn + gap;
  return { size, btn, gap, cx, cy, r1, r2 };
}

/** A button's spot: { right, bottom, size } (CSS px from the right edge and
 *  over the band, of the box), or null for a name not of the arc. */
export function arcSpot(name, land, vw, vh) {
  const F = arcFrame(land, vw, vh);
  if (name === 'attack') return { right: Math.round(F.cx - F.size / 2), bottom: Math.round(F.cy - F.size / 2), size: F.size };
  const T = land ? ARC.side : ARC.up;
  const s = Object.prototype.hasOwnProperty.call(T.spots, name) ? T.spots[name] : null;
  if (!s || (s[0] !== 1 && s[0] !== 2)) return null;   /* the inner ring or the outer, nothing else */
  const r = s[0] === 1 ? F.r1 : F.r2;
  const a = (s[1] * Math.PI) / 180;
  /* x grows to the LEFT of Attack (cos 180 = -1), y upward */
  const x = F.cx - r * Math.cos(a);
  const y = F.cy + r * Math.sin(a);
  return { right: Math.round(x - F.btn / 2), bottom: Math.round(y - F.btn / 2), size: F.btn };
}

/** `?thumbarc=0`: the old arrangement.  `thrown` the switch's (switches.js
 *  sw('thumbarc')), handed by the caller (this file imports nothing). */
export function arcOn(twoOn, thrown) {
  return twoOn === true && thrown !== true;
}
