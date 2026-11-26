/* ═══ v2.3.6640: THE CONTROLLER (card PAD; `?padskin=0` today's look) ═══
 * The owner, 2026-11-25, with a mockup and four sheets of art: "Also want a
 * redesign of the controls area to be more like a controller."  The touch
 * controls are one built-in controller: a LEFT HOUSING that holds the stick
 * and a RIGHT HOUSING that holds five round buttons in FIXED places, both
 * docked to the top edge of the dashboard band, the middle left open.
 * A new LOOK and a fixed LAYOUT: what a control does, when it shows and how
 * a touch is read do not change (game/controlVisibility.js, stickZones.js,
 * thumbSide.js, thumbArc.js, contextButton.js keep their rules).
 *
 * THE SOCKETS are the right housing's own gold rings, measured on the art
 * (tools/art/cut-pad.mjs -> src/data/padArt.js): the biggest is ATTACK, the
 * one in the bottom row JUMP, and the top row, left to right, the CONTEXT
 * socket (Skate when the skateboard is offered, Charge when Charge is: the
 * game's own rule decides, never both), BLOCK, SPECIAL (the mockup's
 * "Layout & sizes").  A control the game hides leaves its socket empty --
 * the housing's own ring and well, nothing drawn -- and the others never move.
 *
 * SIZES.  The right housing is drawn so its Attack socket is ATTACK_PX (a
 * little over the attack disc's size today, 84 / 94: ShieldButton RBTN).  Every button's TOUCH BOX is the larger of today's
 * box and its socket, centred on the socket: no box is smaller than with
 * `?padskin=0` (the card's reading 1), and the face is drawn at the socket's
 * size in the middle of it.  The boxes were checked not to overlap at these
 * sizes (server/test/pad-skin.test.mjs 3).  The left housing is drawn so the
 * stick's ring is the stick's box today (LBTN 83 / 98): on a phone narrower than the
 * two housings it gives up width, never the right one (whose sockets are the
 * touch boxes).
 *
 * `x` is px from the housing's own screen side to a centre, `y` px over the
 * band (the caller adds the band: ShieldButton ctlBottom).  `mirror` swaps
 * the sides (a left-handed player); the game has no such setting today, so
 * nothing passes it (the owner's call: TRAPS 305).
 *
 * No imports but the measured art (a data module): node tests it
 * (server/test/pad-skin.test.mjs).
 */
import { PAD_ART } from '../data/padArt.js';

export const PAD = Object.freeze({
  /* the Attack socket's size, CSS px: today's attack disc is 84 / 94; 92 / 96
     is about the least at which Attack's box clears today's Jump box (64 / 68, the
     held combat's) in their sockets (pad-skin.test 3) */
  ATTACK_PX: Object.freeze({ up: 92, side: 96 }),
  /* the stick's gold ring, CSS px across (today's stick box: LBTN 83 / 98) */
  STICK_PX: Object.freeze({ up: 83, side: 98 }),
  /* the stick's four pieces against its ring, read off the owner's eleven
     baked sticks (pad-art-01): the ring 1.18 x the housing's hole, the arrow
     disc 0.91 of the ring, the knob 0.44 (the mockup's) */
  RING_OVER_HOLE: 1.18,
  DISC: 0.91,
  KNOB: 0.44,
  /* the play column this was fitted on (the owner's phone, upright) */
  REF_VW: 430,
  /* the air kept between the two housings, at least (px); under it the
     left housing gives up width */
  MID_MIN: 0,
});

/* each action's accent: the colour of its own ready glow and cooldown arc,
   read off the owner's sheet (pad-art-02's third and fourth columns) */
export const PAD_ACCENT = Object.freeze({
  attack: '#FFB347', jump: '#8CFF5A', block: '#46CFFF', special: '#FFD84A',
  skate: '#E58CFF', charge: '#E58CFF',
});

export const PAD_NAMES = Object.freeze(['attack', 'jump', 'ctx', 'block', 'special']);

/** The right housing's five sockets, named by place (never by the order the
 *  art listed them): the biggest is Attack; of the rest, the one below the
 *  housing's middle is Jump, the top row left to right ctx, block, special.
 *  Null when the art does not hold exactly five. */
export function namedSockets(sockets) {
  if (!Array.isArray(sockets) || sockets.length !== 5) return null;
  const s = sockets.slice().sort((a, b) => b.d - a.d);
  const attack = s[0];
  const rest = s.slice(1);
  const low = rest.filter((o) => o.cy > 0.5);
  const top = rest.filter((o) => o.cy <= 0.5).sort((a, b) => a.cx - b.cx);
  if (low.length !== 1 || top.length !== 3) return null;
  return { attack, jump: low[0], ctx: top[0], block: top[1], special: top[2] };
}

/** The controller on this screen: `land` sideways, `vw` the play column's
 *  width (CSS px), `mirror` the sides swapped.  { right, left, sockets,
 *  stick }: each housing's { side, w, h } (docked to the band, flush to its
 *  side), each socket's { side, x, y, d }, and the stick's { side, x, y, d,
 *  hole, disc, knob } (d its ring's size). */
export function padLayout(land, vw, mirror, art) {
  const A = art || PAD_ART;
  const named = namedSockets(A && A['housing-r'] && A['housing-r'].sockets);
  const hl = A && A['housing-l'];
  if (!named || !hl || !hl.hole) return null;
  const key = land ? 'side' : 'up';
  const width = typeof vw === 'number' && vw > 0 ? vw : PAD.REF_VW;
  const RA = A['housing-r'].h / A['housing-r'].w;
  const LA = hl.h / hl.w;
  const rw = Math.round(PAD.ATTACK_PX[key] / named.attack.d);
  let lw = Math.round(PAD.STICK_PX[key] / PAD.RING_OVER_HOLE / hl.hole.d);
  lw = Math.max(0, Math.min(lw, width - rw - PAD.MID_MIN));
  const rh = Math.round(rw * RA), lh = Math.round(lw * LA);
  const rSide = mirror ? 'left' : 'right', lSide = mirror ? 'right' : 'left';
  const sockets = Object.create(null);
  for (const n of PAD_NAMES) {
    const o = named[n];
    /* the art's x runs left to right: from the right edge it is 1 - cx (a
       mirrored housing is drawn flipped, so the same share holds from its side) */
    sockets[n] = { side: rSide, x: Math.round((1 - o.cx) * rw), y: Math.round((1 - o.cy) * rh), d: Math.round(o.d * rw) };
  }
  /* the stick: its ring's centre on the hole's, its size the ring's */
  const ring = Math.round(hl.hole.d * lw * PAD.RING_OVER_HOLE);
  const stick = { side: lSide, x: Math.round(hl.hole.cx * lw), y: Math.round((1 - hl.hole.cy) * lh), d: ring,
    hole: Math.round(hl.hole.d * lw), disc: Math.round(ring * PAD.DISC), knob: Math.round(ring * PAD.KNOB) };
  return { right: { side: rSide, w: rw, h: rh }, left: { side: lSide, w: lw, h: lh }, sockets, stick };
}

/** A control's place: the control's own name (attack, jump, block, special,
 *  skate, charge) to its socket (skate and charge share the context socket). */
export function socketOf(name) {
  if (name === 'skate' || name === 'charge') return 'ctx';
  return PAD_NAMES.indexOf(name) >= 0 && name !== 'ctx' ? name : null;
}

/** A control's box in the controller: { side, edge, bottom, size, face }
 *  (`edge` px from its side to the box, `bottom` px over the band), its box
 *  the larger of `today` (its size with `?padskin=0`) and its socket, centred
 *  on the socket; the face the socket's size.  Null for a control with no
 *  socket (it keeps today's place). */
export function padSpot(name, layout, today) {
  const k = socketOf(name);
  if (!k || !layout) return null;
  const s = layout.sockets[k];
  const size = Math.max(s.d, Math.round(typeof today === 'number' && today > 0 ? today : 0));
  return { side: s.side, edge: Math.round(s.x - size / 2), bottom: Math.round(s.y - size / 2), size, face: s.d };
}

/** The context socket's one control: Charge when the game shows it (a
 *  fight's, thumbSide.js chargeShown), else Skate when the skateboard is
 *  offered (ride.js), else nothing (the socket left empty).  Never both. */
export function ctxFor(skateShown, chargeShown) {
  if (chargeShown === true) return 'charge';
  if (skateShown === true) return 'skate';
  return null;
}

/* ═══ WHAT A FACE WEARS ═══
 * One face picture an action (public/ui/pad/<name>.png), and its grey twin
 * (<name>-off.png) for the sheet's Disabled: CSS cannot grey a picture
 * without a filter, and a filter on a control that is always on screen costs
 * an iPhone a layer (the card's reading 4).  Pressed, the cooldown sweep and
 * the ready glow are drawn over it (game.css .bt-pad).
 * `state` is the skin's own (controlSkin Skin: normal, cooldown, disabled,
 * ready, on, quiet).  { pic, shade, sweep, glow }: the picture, the dark wash
 * over it (0..1), the cooldown's arc (0..1 of the ring, or 0), the glow. */
export function padFace(name, state, progress) {
  const pic = state === 'disabled' ? name + '-off' : name;
  const cool = state === 'cooldown';
  const sweep = cool && typeof progress === 'number' && progress > 0.001 ? Math.min(1, progress) : 0;
  return {
    pic,
    shade: cool ? 0.45 : state === 'quiet' ? 0.25 : 0,
    sweep,
    glow: state === 'ready' || state === 'on',
  };
}

/** The attack disc's face, from the resolver's `data-rstate` and the
 *  picture its knob shows (`data-ricon`, controlSkin RDISC_ICONS): an attack
 *  (none, melee, ranged, staff, a weapon's `w-...`) wears the sword face; any
 *  other picture (a harvest's tool, a door, a bed, the farm's) sits on the
 *  EMPTY face (the sheet's ninth: a dark well in the gold ring), never on the
 *  sword.  idle is the sheet's Disabled.  game.css .bt-rjoy-base[data-pad]
 *  draws this table (pad-skin.test 6j reads it there). */
export const PAD_SWORD_ICONS = Object.freeze(['', 'none', 'melee', 'ranged', 'staff']);
export function swordIcon(ricon) {
  if (ricon == null) return true;
  return PAD_SWORD_ICONS.indexOf(ricon) >= 0 || String(ricon).indexOf('w-') === 0;
}
export function attackFace(rstate, ricon) {
  if (!swordIcon(ricon)) return { pic: 'socket', glow: rstate === 'hot' };
  if (rstate === 'idle') return { pic: 'attack-off', glow: false };
  return { pic: 'attack', glow: rstate === 'hot' };
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
