import React from 'react';
import { metalIconPath, weaponMaterial } from '../../rendering/traits/materialTints.js';

/* ═══ v2.3.3018: ONE SKIN FOR EVERY TOUCH CONTROL ═══
 *
 * Owner, 2026-10-04, with a mockup of the play screen in two halves --
 * CURRENT and IMPROVED -- and a sheet of every button in five states: "Make
 * the on screen buttons look more like the improved mockup".
 *
 * What the IMPROVED half changes, read off the picture:
 *   - every control is a ROUND button with a thick, bevelled GOLD ring and a
 *     dark face (the attack disc's face is warm brown);
 *   - each one is a PICTURE, not a word: a sword on Attack, a whirlwind on
 *     Whirl, a starburst on Spec, the winged boot on Sprint -- no labels;
 *   - five states, drawn on the sheet: Normal, Pressed (darker, pushed in),
 *     Cooldown (dark, the picture greyed, a blue arc running round the ring),
 *     Ready / Charged (the ring lit and glowing), Disabled (all grey).
 *
 * So the look lives HERE, once, and every button wears it: SprintButton,
 * SpecialButton, AbilityButtons, ShieldButton, ElementBurstButton,
 * WeaponSwapButton, JumpButton (v2.3.3017's, JumpIcon below) and the attack
 * disc in TouchControls.  Seven files each drawing their own ring is how they
 * came to look like seven different kits (four slate radial gradients, one
 * sprite, one rounded square, one emoji glyph) -- the same reason
 * ShieldButton.jsx keeps every control's LAYOUT in one place.  Nothing here moves a button or changes what a press does.
 *
 * ═══ HOW IT IS DRAWN, AND WHAT IT MUST NEVER USE ═══
 * Stacked spans with CSS gradients for the face, the sheen and the glow
 * (game.css, ".bt-skin"), and one small SVG for the ring and the arcs on it.
 * NO CSS `filter`, backdrop-filter or mask, at any state: a
 * filter on a DOM overlay compositing over the WebGL canvas is the documented
 * iOS grain (v2.3.948's charge pie, v2.3.1236's joystick bases, TRAPS §42) --
 * which is why the greyed picture of the mockup's Cooldown and Disabled states
 * is NOT a grayscale() filter: the pictures drawn here in SVG (whirlwind,
 * starburst, burst) switch to a grey palette instead, and the painted ones
 * (sword, boot, shield) dim with opacity on the grey face.  The glow of the
 * Ready state is a radial GRADIENT, not a blurred shadow, for the same reason.
 *
 * Brass round every button is, by the letter of Lantern Slate, the one thing
 * that system forbids ("brass is never a default border").  It is licensed the
 * way the player card's brackets are -- the owner drew it -- and recorded as
 * that document's sixth exception, bounded to these controls. */

/* The ring's thickness, as a share of the button: 4px on a 48px button, 8px on
   the 96px attack disc -- the mockup's proportions. */
export function skinRing(size) {
  return Math.max(3, Math.round(size * 0.085));
}

/* The cooldown arc, the sheet's blue.  It is NOT the mana blue (#4D86D5): a
   special's cooldown is a clock, not a mana bar, and the two sit side by side
   in a fight. */
export const SKIN_CD = '#5CC0F5';

/* Fixed-point, never exponent notation: a dasharray like "9.4e-7 120" is
   invalid and an invalid dasharray falls back to a SOLID stroke (the v2.3.10
   charge-pie incident, SprintButton's rim, ElementBurstButton's sweep). */
function fx(n) { return (Math.round(n * 100) / 100).toFixed(2); }

/* ═══ THE RING IS A RING, NOT A DISC ═══
 * The first cut drew the gold ring as a filled circle with the face laid over
 * its middle -- and the attack disc's face is the layer that goes see-through
 * over a monster (v2.3.2263: 0.45 in a fight, 0.08 with a monster under it).
 * Faded, it showed the gold disc behind it instead of the monster: caught by
 * mp-btnskin's ghost picture.  So the ring is an SVG STROKE, hollow, and its
 * bevel is a gradient the stroke paints with.  The gradients are defined ONCE
 * for the page, in a 0x0 SVG on <body> (not display:none, which stops some
 * engines painting what is defined inside it), and game.css picks one per
 * state: `stroke: url(#btSkinGold)`.  No mask, no filter. */
const RING_GRADIENTS = {
  btSkinGold: [['0', '#FFF1C2'], ['.18', '#F7D27A'], ['.44', '#E6AE52'], ['.72', '#BC812F'], ['1', '#7C4F19']],
  btSkinLit: [['0', '#FFFBE3'], ['.2', '#FFE494'], ['.46', '#F8BF55'], ['.74', '#D78B2F'], ['1', '#985B1A']],
  btSkinPress: [['0', '#DDAA5E'], ['.44', '#B67C35'], ['1', '#784B17']],
  btSkinDim: [['0', '#646A70'], ['.48', '#464B50'], ['1', '#26292D']],
  btSkinGrey: [['0', '#B9BEC2'], ['.42', '#8A9095'], ['1', '#585D62']],
  btSkinQuiet: [['0', '#78808A'], ['.48', '#545B63'], ['1', '#30353A']],
};
const SVG_NS = 'http://www.w3.org/2000/svg';
export function ensureSkinDefs() {
  if (typeof document === 'undefined' || !document.body) return;
  /* Looked up every time (a hash lookup, a few dozen a second at most) rather
     than remembered in a flag: if anything ever takes the node off the page,
     the next render puts it back instead of every ring falling to its flat
     fallback colour for the rest of the session. */
  if (document.getElementById('btSkinDefs')) return;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('id', 'btSkinDefs');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  const defs = document.createElementNS(SVG_NS, 'defs');
  Object.keys(RING_GRADIENTS).forEach(function (id) {
    const g = document.createElementNS(SVG_NS, 'linearGradient');
    g.setAttribute('id', id);
    g.setAttribute('x1', '0'); g.setAttribute('y1', '0'); g.setAttribute('x2', '0'); g.setAttribute('y2', '1');
    RING_GRADIENTS[id].forEach(function (st) {
      const s = document.createElementNS(SVG_NS, 'stop');
      s.setAttribute('offset', st[0]);
      s.setAttribute('stop-color', st[1]);
      g.appendChild(s);
    });
    defs.appendChild(g);
  });
  svg.appendChild(defs);
  document.body.appendChild(svg);
}

/* A four-point sparkle, centred on (x, y), arm length s. */
function sparklePath(x, y, s) {
  var k = s * 0.26;
  return 'M' + fx(x) + ' ' + fx(y - s) + 'L' + fx(x + k) + ' ' + fx(y - k) + 'L' + fx(x + s) + ' ' + fx(y)
    + 'L' + fx(x + k) + ' ' + fx(y + k) + 'L' + fx(x) + ' ' + fx(y + s) + 'L' + fx(x - k) + ' ' + fx(y + k)
    + 'L' + fx(x - s) + ' ' + fx(y) + 'L' + fx(x - k) + ' ' + fx(y - k) + 'Z';
}

/**
 * The button's face: glow, ring, face, sheen, arcs, picture.
 *
 *   size      the button's width in px (it is round)
 *   tone      'slate' (the dark face of the small buttons), 'ember' (the
 *             attack disc's brown), 'warm' (a toggle that is ON)
 *   state     'normal' | 'cooldown' | 'disabled' | 'ready' | 'on' | 'quiet'
 *             ('ready' and 'on' both glow; 'ready' is the sheet's
 *             Ready / Charged, 'on' a latched toggle -- the shield up, the
 *             sprint on; 'quiet' a slate ring: something shown, nowhere for a
 *             tap to go -- the weapon button with one weapon)
 *   progress  0..1, how far a cooldown has run: the blue arc grows round the
 *             ring from twelve o'clock and the button is ready when it closes
 *   meter     0..1 or null: the ring IS a meter (the sprint's stamina) -- the
 *             spent share goes dark, anticlockwise from twelve
 *   flash     true for a moment when a cooldown ends: the glow swells once
 *             (a finite alert, which is what Lantern Slate's motion rule
 *             allows -- never a pulse that keeps going)
 *   faceRef / faceProps   a ref and attributes for the face layer (the attack
 *             disc's rBodyRef)
 *   children  the picture, centred
 */
export function Skin(props) {
  var size = props.size;
  var tone = props.tone || 'slate';
  var state = props.state || 'normal';
  var ring = props.ring || skinRing(size);
  var progress = typeof props.progress === 'number' ? Math.max(0, Math.min(1, props.progress)) : null;
  var meter = typeof props.meter === 'number' ? Math.max(0, Math.min(1, props.meter)) : null;
  var c = size / 2;
  /* The arcs ride the middle of the ring band, a hair inside its outline. */
  var r = c - ring / 2;
  var circ = 2 * Math.PI * r;
  ensureSkinDefs();   /* the ring's gradients, once per page (see above) */
  var arcs = [
    /* the ring itself, hollow, painted by the state's gradient (game.css) */
    React.createElement('circle', { key: 'ring', className: 'bt-skin-ringc', cx: c, cy: c, r: r, fill: 'none', strokeWidth: ring }),
    /* its dark outer edge, and the thin line where it meets the face */
    React.createElement('circle', { key: 'edge', className: 'bt-skin-edge', cx: c, cy: c, r: c - 0.75, fill: 'none', strokeWidth: 1.5 }),
    React.createElement('circle', { key: 'in', className: 'bt-skin-edge', cx: c, cy: c, r: c - ring, fill: 'none', strokeWidth: 1 }),
    /* the bevel's light on top and its shade underneath, inside the band */
    React.createElement('path', {
      key: 'hi', className: 'bt-skin-bevel-hi',
      d: 'M' + fx(c - (c - 1.8) * 0.82) + ' ' + fx(c - (c - 1.8) * 0.57) + ' A' + fx(c - 1.8) + ' ' + fx(c - 1.8) + ' 0 0 1 ' + fx(c + (c - 1.8) * 0.82) + ' ' + fx(c - (c - 1.8) * 0.57),
      fill: 'none', strokeWidth: 1, strokeLinecap: 'round',
    }),
  ];
  if (state === 'cooldown' && progress != null && progress > 0.001) {
    arcs.push(React.createElement('circle', {
      key: 'cd', 'data-skin-arc': fx(progress),
      cx: c, cy: c, r: r, fill: 'none', stroke: SKIN_CD, strokeWidth: Math.max(2, ring - 1),
      strokeLinecap: 'butt',
      strokeDasharray: fx(progress * circ) + ' ' + fx(circ),
      transform: 'rotate(-90 ' + c + ' ' + c + ')',
    }));
  }
  if (meter != null && meter < 0.999) {
    /* The SPENT share, dark over the gold, so the lit part is the gold ring
       itself running down -- a separate lit arc over a dark ring would leave
       the ring looking spent whenever the meter is full. */
    arcs.push(React.createElement('circle', {
      key: 'spent', 'data-skin-spent': fx(1 - meter),
      cx: c, cy: c, r: r, fill: 'none', stroke: 'rgba(16,20,24,.86)', strokeWidth: Math.max(2, ring - 1),
      strokeLinecap: 'butt',
      strokeDasharray: fx((1 - meter) * circ) + ' ' + fx(circ),
      transform: 'rotate(' + fx(meter * 360 - 90) + ' ' + c + ' ' + c + ')',
    }));
  }
  if (state === 'ready' || state === 'on') {
    /* The sheet's Ready / Charged sparkles: two, still, on the ring's top
       right.  Static on purpose -- the glow already says "lit". */
    arcs.push(React.createElement('path', {
      key: 'sp1', d: sparklePath(size * 0.84, size * 0.13, Math.max(2.5, size * 0.09)), fill: '#FFF6D6',
    }));
    arcs.push(React.createElement('path', {
      key: 'sp2', d: sparklePath(size * 0.97, size * 0.36, Math.max(1.6, size * 0.05)), fill: '#FFE7A8',
    }));
  }
  return React.createElement('span', {
    className: 'bt-skin',
    'data-tone': tone,
    'data-state': state,
    'data-flash': props.flash ? '1' : undefined,
    style: { '--ring': ring + 'px' },
  },
  React.createElement('span', { className: 'bt-skin-glow' }),
  /* faceRef: the attack disc hands its rBodyRef in here, because the face is
     the layer BroTown's resolver fades over a monster (v2.3.2263) */
  React.createElement('span', Object.assign({ className: 'bt-skin-face', ref: props.faceRef || undefined }, props.faceProps || null)),
  React.createElement('span', { className: 'bt-skin-sheen' }),
  React.createElement('svg', {
    className: 'bt-skin-arcs', 'aria-hidden': 'true',
    viewBox: '0 0 ' + size + ' ' + size, width: size, height: size,
    /* overflow visible: the sparkles sit on the ring's outer edge */
    style: { overflow: 'visible' },
  }, arcs),
  props.children != null ? React.createElement('span', { className: 'bt-skin-icon' }, props.children) : null);
}

/* ═══ PRESSED: THE SHEET'S SECOND STATE ═══
 * Most of these buttons act on touchstart and re-render on a 200ms poll, so a
 * React state for "a finger is down" would arrive after the press it is
 * showing.  The attribute is written straight onto the element the finger is
 * on, and game.css darkens and pushes in the face under it.  React never
 * renders `data-pressed`, so a re-render cannot clear it mid-press. */
export function pressOn(e) {
  var el = e && e.currentTarget;
  if (el && el.setAttribute) el.setAttribute('data-pressed', '1');
}
export function pressOff(e) {
  var el = e && e.currentTarget;
  if (el && el.removeAttribute) el.removeAttribute('data-pressed');
}

/* ═══ A COOLDOWN THAT ENDS SAYS SO ONCE ═══
 * The flash is kept for FLASH_MS after the moment a cooldown is seen to end,
 * read on the buttons' own poll.  A button that mounts already ready does not
 * flash: nothing ended. */
export const FLASH_MS = 700;
/* The bookkeeping, for a component that draws several buttons from one
   render (AbilityButtons): `store` is its own Object.create(null) map, keyed
   by button. */
export function readyFlash(store, key, coolingNow, now) {
  var e = store[key];
  if (!e) e = store[key] = { was: !!coolingNow, at: 0 };
  if (e.was && !coolingNow) e.at = now;
  e.was = !!coolingNow;
  return e.at > 0 && now - e.at < FLASH_MS;
}
/* ...and the hook for a component that draws one.  Call it ABOVE any early
   return, like every hook. */
export function useReadyFlash(coolingNow) {
  var ref = React.useRef(null);
  if (!ref.current) ref.current = Object.create(null);
  return readyFlash(ref.current, 'one', coolingNow, Date.now());
}

/* A small word on a button, for the two states where a word is an
   INSTRUCTION rather than a name (the bow's held special says AIM).  Every
   other state is the picture alone, as the mockup draws them. */
export function SkinTag(props) {
  return React.createElement('span', {
    className: 'bt-skin-tag', 'data-skin-tag': '1',
  }, props.children);
}

/* ═══ THE PICTURES ═══
 * The painted ones are the game's own icons, already drawn in the mockup's
 * style (pixel art, a dark outline): the hero sheet's sword, bow and staff
 * (the Character sheet's Melee / Bow / Magic tiles), the winged boot (Move
 * Speed), the wood shield.  Same URLs and ?v= as their other users, so the
 * browser holds one copy of each.
 *
 * The whirlwind and the starburst had no picture in the game -- Whirl wore the
 * 🌀 emoji, which every phone draws differently, and Spec a ✶ character -- so
 * they are drawn here in SVG, flat colour bands under a dark outline like the
 * painted icons, with a grey palette for the greyed states. */
export const ICON_URL = {
  melee: '/icons/ui/hero/melee.webp?v=2.3.1311',
  ranged: '/icons/ui/hero/bow.webp?v=2.3.1311',
  staff: '/icons/ui/hero/magic.webp?v=2.3.1311',
  boot: '/icons/ui/hero/move-speed.webp?v=2.3.3006',
  shield: '/sprites/shields/wood-shield-front.png?v=2.3.1875',
};
/* The pictures the attack disc can wear (TouchControls), all in the DOM from
   the start and warmed on the loading screen (controlsPreload.js), so a
   change of context never waits on a download -- BroTown's stamp only says
   which one shows.  Here rather than in TouchControls so the preload can read
   it without importing the controls themselves. */
var WEAPON_ART = ['sword', 'sword-copper', 'sword-iron', 'sword-blacksteel',
  'great-sword', 'great-sword-copper', 'great-sword-iron', 'great-sword-blacksteel', 'bow', 'staff'];
var WEAPON_KEYS = Object.create(null);
WEAPON_ART.forEach(function (f) { WEAPON_KEYS['w-' + f] = 1; });

/**
 * v2.3.3105: the disc's picture for an attack with this slot's weapon
 * ({ type, gearBase } as the bag holds it): the weapon's own bag picture,
 * by the same rule as InventoryPanel's thumb (metalIconPath) -- or the
 * slot's plain picture when the slot is empty or its art is not one of ours.
 */
export function weaponDiscIcon(slot, weapon) {
  var plain = (slot === 'ranged' || slot === 'staff') ? slot : 'melee';
  if (!weapon) return plain;
  var t = String(weapon.type || '');
  var base = t === 'bow' ? 'bow' : t === 'staff' ? 'staff'
    : t === 'greatsword' ? 'great-sword' : t === 'sword' ? 'sword' : null;
  if (!base) return plain;
  var file = metalIconPath('/icons/items/' + base + '.webp', weaponMaterial(t, weapon.gearBase));
  var name = String(file);
  name = name.slice(name.lastIndexOf('/') + 1);
  var key = 'w-' + (name.slice(-5) === '.webp' ? name.slice(0, -5) : name);
  return WEAPON_KEYS[key] ? key : (WEAPON_KEYS['w-' + base] ? 'w-' + base : plain);
}

export const RDISC_ICONS = [
  ['melee', ICON_URL.melee],
  ['ranged', ICON_URL.ranged],
  ['staff', ICON_URL.staff],
  ['mining', '/icons/ui/skill-mining.webp?v=2.3.1224'],
  ['woodcutting', '/icons/ui/skill-woodcutting.webp?v=2.3.1224'],
  ['fishing', '/icons/ui/skill-fishing.webp?v=2.3.1224'],
  ['cooking', '/icons/ui/skill-cooking.webp?v=2.3.1224'],
  /* v2.3.3105: while a tap would jump, the arrow and the word from the
     owner's JUMP button, cut off its red face and gold ring
     (public/ui/controls/jump-glyph.webp) and laid over the disc as it is --
     the owner: the whole button on the stick was "way too intense ... it
     should just be a semi transparent overlay on the existing disc" */
  ['jump', '/ui/controls/jump-glyph.webp?v=2.3.3105'],
  /* v2.3.3105: and what a tap does instead beside a character, at a door or
     at the farm's bed (desktopControls interactKind) -- the owner: "chat
     bubble for speaking [to NPCs], door for entering door"; drawn in the
     JUMP arrow's white-and-outline style */
  ['talk', '/ui/controls/talk.svg?v=2.3.3105'],
  ['door', '/ui/controls/door.svg?v=2.3.3105'],
  ['sleep', '/ui/controls/sleep.svg?v=2.3.3105'],
  /* v2.3.3136: and at a bed on your farm, its next step (game/farmWalk.js;
     desktopControls interactKind 'farm-<step>') -- the owner: "You dig, you
     water, you fertilize, etc." -- a spade, a sprout, a watering can, a sack
     of compost and a basket, in the same white-and-outline style */
  ['farm-dig', '/ui/controls/farm-dig.svg?v=2.3.3124'],
  ['farm-plant', '/ui/controls/farm-plant.svg?v=2.3.3124'],
  ['farm-water', '/ui/controls/farm-water.svg?v=2.3.3124'],
  ['farm-feed', '/ui/controls/farm-feed.svg?v=2.3.3124'],
  ['farm-harvest', '/ui/controls/farm-harvest.svg?v=2.3.3124'],
  /* v2.3.3105: while the tap ATTACKS, the weapon in your hand -- the owner:
     "when attacking it should show the weapon type depending on what weapon
     is used".  The bag's own pictures (InventoryPanel's thumb: a sword or a
     greatsword in its metal, the bow, the staff, the same files and ?v=), all
     ten in the DOM and warmed with the rest; melee / ranged / staff above stay
     for an empty slot. */
  ...WEAPON_ART.map(function (f) { return ['w-' + f, '/icons/items/' + f + '.webp?v=2.3.1774']; }),
];

var TORNADO = {
  lit: { line: '#0A2142', mouth: '#164C9E', band: '#3C9CF0', shade: '#2369CC', hi: '#C4EEFF' },
  grey: { line: '#15181B', mouth: '#3A3F44', band: '#7A8085', shade: '#5B6166', hi: '#C0C4C8' },
};
/* The funnel: five bands, each a filled ellipse, drawn from the TIP UP so each
   wider band laps over the top of the one under it and only its lower rim
   shows -- which is what makes a stack of ellipses read as one spinning coil.
   It leans a little left as it falls, as the mockup's does. */
var COIL = [
  { x: 52, y: 18, rx: 38, ry: 11 },
  { x: 49.5, y: 34, rx: 31, ry: 10 },
  { x: 47, y: 49, rx: 24, ry: 9 },
  { x: 44.5, y: 63, rx: 17, ry: 7.6 },
  { x: 42, y: 75, rx: 10.5, ry: 6 },
];
/* A point on ellipse q at angle a (degrees, 0 = right, 90 = down). */
function onEllipse(q, a) {
  var t = a * Math.PI / 180;
  return fx(q.x + Math.cos(t) * q.rx) + ' ' + fx(q.y + Math.sin(t) * q.ry);
}
function rimArc(q, a0, a1) {
  return 'M' + onEllipse(q, a0) + ' A' + q.rx + ' ' + q.ry + ' 0 0 1 ' + onEllipse(q, a1);
}

export function TornadoIcon(props) {
  var p = props.grey ? TORNADO.grey : TORNADO.lit;
  var s = props.size || 28;
  var kids = [];
  /* the tail, a flick to the left under the last band */
  kids.push(React.createElement('path', { key: 'tl', d: 'M43 80 C40 88 34 92 28 92', fill: 'none', stroke: p.line, strokeWidth: 7.5, strokeLinecap: 'round' }));
  kids.push(React.createElement('path', { key: 'tf', d: 'M43 80 C40 88 34 92 28 92', fill: 'none', stroke: p.band, strokeWidth: 3.4, strokeLinecap: 'round' }));
  for (var i = COIL.length - 1; i >= 0; i--) {
    var q = COIL[i];
    kids.push(React.createElement('ellipse', { key: 'e' + i, cx: q.x, cy: q.y, rx: q.rx, ry: q.ry, fill: i === 0 ? p.mouth : p.band, stroke: p.line, strokeWidth: 4.2 }));
    /* the shade on the right of the band's rim and the light on its left,
       where the mockup's light falls */
    kids.push(React.createElement('path', { key: 's' + i, d: rimArc({ x: q.x, y: q.y - 1.6, rx: q.rx - 2.2, ry: q.ry - 1.4 }, 8, 70), fill: 'none', stroke: p.shade, strokeWidth: 3.2, strokeLinecap: 'round' }));
    kids.push(React.createElement('path', { key: 'h' + i, d: rimArc({ x: q.x, y: q.y - 1.6, rx: q.rx - 2.2, ry: q.ry - 1.4 }, 112, 168), fill: 'none', stroke: p.hi, strokeWidth: 2.8, strokeLinecap: 'round' }));
  }
  /* the mouth's own rim, lit along its front edge */
  kids.push(React.createElement('path', { key: 'm', d: rimArc({ x: 52, y: 18, rx: 34, ry: 7.6 }, 20, 160), fill: 'none', stroke: p.band, strokeWidth: 3.4, strokeLinecap: 'round' }));
  return React.createElement('svg', {
    className: 'bt-skin-svg', 'data-icon': 'whirl', viewBox: '0 0 100 100', width: s, height: s, 'aria-hidden': 'true',
  }, kids);
}

var STAR = {
  lit: ['#3A1305', '#E2441B', '#FF8E21', '#FFD54D', '#FFF8DE'],
  grey: ['#15181B', '#62676C', '#80868B', '#A6ABAF', '#D2D5D8'],
};
/* Sixteen corners round (50, 50): long points up/down/left/right, shorter
   ones on the diagonals, valleys between -- the sheet's Spec star. */
function starPoints(k) {
  var pts = [];
  for (var i = 0; i < 16; i++) {
    var a = (-90 + i * 22.5) * Math.PI / 180;
    var rad = (i % 2) ? 19 : (i % 4 === 0 ? 47 : 33);
    pts.push(fx(50 + Math.cos(a) * rad * k) + ',' + fx(50 + Math.sin(a) * rad * k));
  }
  return pts.join(' ');
}
export function StarburstIcon(props) {
  var p = props.grey ? STAR.grey : STAR.lit;
  var s = props.size || 28;
  return React.createElement('svg', {
    className: 'bt-skin-svg', 'data-icon': 'special', viewBox: '0 0 100 100', width: s, height: s, 'aria-hidden': 'true',
  },
  React.createElement('polygon', { points: starPoints(1), fill: p[1], stroke: p[0], strokeWidth: 4.5, strokeLinejoin: 'round' }),
  React.createElement('polygon', { points: starPoints(0.76), fill: p[2] }),
  React.createElement('polygon', { points: starPoints(0.52), fill: p[3] }),
  React.createElement('circle', { cx: 50, cy: 50, r: 11, fill: p[4] }));
}

/* Shield Bash: the shield with the blow's burst behind it -- the wood shield
   alone is the Block button beside it, and the two must not be the same
   picture. */
export function BashIcon(props) {
  var s = props.size || 28;
  var dim = !!props.grey;
  var p = dim ? STAR.grey : STAR.lit;
  return React.createElement('span', {
    'data-icon': 'bash', style: { position: 'relative', display: 'block', width: s, height: s },
  },
  React.createElement('svg', {
    className: 'bt-skin-svg', viewBox: '0 0 100 100', width: s, height: s, 'aria-hidden': 'true',
    style: { position: 'absolute', left: 0, top: 0 },
  },
  React.createElement('polygon', { points: starPoints(1.02), fill: p[1], stroke: p[0], strokeWidth: 5, strokeLinejoin: 'round', transform: 'translate(10 -6)' }),
  React.createElement('polygon', { points: starPoints(0.66), fill: p[3], transform: 'translate(10 -6)' })),
  React.createElement('img', {
    src: ICON_URL.shield, alt: '', draggable: false,
    style: {
      position: 'absolute', left: '2%', top: '14%', width: '74%', height: '74%',
      imageRendering: 'pixelated', pointerEvents: 'none', opacity: dim ? 0.5 : 1,
    },
  }));
}

/* Jump: the mockup's bold blue arrow, pointing up -- the JUMP button of the
   real-jumping work (v2.3.3017, JumpButton.jsx): `Skin` round a `JumpIcon`,
   state 'on' while you are in the air. */
var ARROW = {
  lit: { line: '#0A2142', body: '#3A9DF0', hi: '#C4EEFF', shade: '#1F5FC4' },
  grey: { line: '#15181B', body: '#7A8085', hi: '#C0C4C8', shade: '#5B6166' },
};
export function JumpIcon(props) {
  var p = props.grey ? ARROW.grey : ARROW.lit;
  var s = props.size || 28;
  var arrow = 'M50 8 L88 50 L66 50 L66 90 L34 90 L34 50 L12 50 Z';
  return React.createElement('svg', {
    className: 'bt-skin-svg', 'data-icon': 'jump', viewBox: '0 0 100 100', width: s, height: s, 'aria-hidden': 'true',
  },
  React.createElement('path', { d: arrow, fill: p.body, stroke: p.line, strokeWidth: 6, strokeLinejoin: 'round' }),
  /* the shade down its right side and the light down its left, as the
     whirlwind's bands are lit */
  React.createElement('path', { d: 'M58 52 L58 84 L64 84 L64 47 L80 47 L52 16 Z', fill: p.shade, opacity: 0.7 }),
  React.createElement('path', { d: 'M48 18 L22 46 L30 46 Z M36 52 L36 84 L41 84 L41 52 Z', fill: p.hi, opacity: 0.85 }));
}

/* The burst's nova, in the weapon's element colour: a core and two rings at
   the ratio the ability uses (ElementBurstButton's own drawing since
   v2.3.1734, moved inside the ring). */
export function NovaIcon(props) {
  var s = props.size || 28;
  var col = props.grey ? '#7D8388' : (props.color || '#8E44AD');
  return React.createElement('svg', {
    className: 'bt-skin-svg', 'data-icon': 'burst', viewBox: '0 0 100 100', width: s, height: s, 'aria-hidden': 'true',
  },
  React.createElement('circle', { cx: 50, cy: 50, r: 46, fill: 'none', stroke: col, strokeWidth: 4, opacity: 0.4 }),
  React.createElement('circle', { cx: 50, cy: 50, r: 32, fill: 'none', stroke: col, strokeWidth: 6, opacity: 0.7 }),
  React.createElement('circle', { cx: 50, cy: 50, r: 18, fill: col, stroke: 'rgba(10,8,14,.75)', strokeWidth: 3 }),
  React.createElement('circle', { cx: 44, cy: 44, r: 6, fill: '#FFFFFF', opacity: props.grey ? 0.25 : 0.55 }));
}

/* A painted icon, sized, never filtered.  `dim` is the greyed states' opacity
   on the grey face (see the header for why it is not grayscale()). */
export function PaintedIcon(props) {
  var s = props.size || 28;
  return React.createElement('img', {
    src: props.src, alt: '', draggable: false, 'data-icon': props.name || undefined,
    width: s, height: s,
    style: {
      display: 'block', width: s, height: s, objectFit: 'contain', pointerEvents: 'none',
      /* the 64px shield is upscaled and wants its pixels; the 256px hero
         icons are DOWNscaled, where nearest-neighbour would only alias */
      imageRendering: props.pixelated ? 'pixelated' : 'auto',
      opacity: props.dim ? 0.45 : 1,
    },
  });
}
