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
 * they were drawn here in SVG, flat colour bands under a dark outline like the
 * painted icons, with a grey palette for the greyed states.  v2.3.3279: the
 * owner drew all five ability pictures (abilityArt, below). */
/* v2.3.3494: `shield` (the world's 64 px wood-shield sprite) is gone from this
   list -- the Block button wears the owner's own painted shield now
   (blockArtUrl, below), and nothing else drew the sprite as a control. */
export const ICON_URL = {
  melee: '/icons/ui/hero/melee.webp?v=2.3.1311',
  ranged: '/icons/ui/hero/bow.webp?v=2.3.1311',
  staff: '/icons/ui/hero/magic.webp?v=2.3.1311',
  boot: '/icons/ui/hero/move-speed.webp?v=2.3.3006',
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
  ['talk', '/ui/controls/talk.webp?v=2.3.3279'],
  ['door', '/ui/controls/door.webp?v=2.3.3279'],
  ['sleep', '/ui/controls/sleep.webp?v=2.3.3279'],
  /* v2.3.3136: and at a bed on your farm, its next step (game/farmWalk.js;
     desktopControls interactKind 'farm-<step>') -- the owner: "You dig, you
     water, you fertilize, etc." -- a spade, a sprout, a watering can, a sack
     of compost and a basket, in the same white-and-outline style.
     v2.3.3279: talk, door, sleep and the five farm steps are the owner's own
     painted pictures now (tools/ui/cut-small-icons.py), drawn whole over the
     disc like the weapon's, not see-through (game.css) */
  ['farm-dig', '/ui/controls/farm-dig.webp?v=2.3.3279'],
  ['farm-plant', '/ui/controls/farm-plant.webp?v=2.3.3279'],
  ['farm-water', '/ui/controls/farm-water.webp?v=2.3.3279'],
  ['farm-feed', '/ui/controls/farm-feed.webp?v=2.3.3279'],
  ['farm-harvest', '/ui/controls/farm-harvest.webp?v=2.3.3279'],
  /* v2.3.3105: while the tap ATTACKS, the weapon in your hand -- the owner:
     "when attacking it should show the weapon type depending on what weapon
     is used".  The bag's own pictures (InventoryPanel's thumb: a sword or a
     greatsword in its metal, the bow, the staff, the same files and ?v=), all
     ten in the DOM and warmed with the rest; melee / ranged / staff above stay
     for an empty slot. */
  ...WEAPON_ART.map(function (f) { return ['w-' + f, '/icons/items/' + f + '.webp?v=2.3.1774']; }),
];

/* ═══ v2.3.3279: THE OWNER'S OWN ABILITY PICTURES ═══
 * The owner, 2026-10-16, handed over a sheet of the five ability icons
 * (assets/icons-source/sheet-small-2-abilities.png, cut by
 * tools/ui/cut-small-icons.py): a whirlwind, a winged star, a shield striking,
 * a jumping bro and a burst of fire and ice.  They replace the five drawn here
 * in SVG since v2.3.3018 (a coil of ellipses, a sixteen-point star, the wood
 * shield over a starburst, an arrow, a ringed dot).
 *
 * The greyed states keep their rule -- NO CSS filter on a control (the header
 * above): the cutter bakes a `-grey` copy of each, its luminance squeezed into
 * the SVG grey sets' range, and `grey` swaps the file.  Both are warmed on the
 * loading screen with the other control pictures (controlsPreload.js).
 *
 * The art sits in the icon set's 256 frame with a 12% margin; ABILITY_ART_K
 * draws it that much larger so it fills the button as the SVGs did. */
const ABILITY_ART_V = '2.3.3279';
export const ABILITY_ART_K = 1.18;
export function abilityArtUrl(name, grey) {
  return '/ui/controls/abil-' + name + (grey ? '-grey' : '') + '.webp?v=' + ABILITY_ART_V;
}
/* ═══ v2.3.3336: THE OWNER'S SPECIAL ATTACKS, ONE FOR EACH WEAPON ═══
 * The owner: "Also use these icons instead for the special attacks (bow,
 * staff, sword)" -- a volley of golden arrows, a crystal staff in a blue
 * swirl, a sword in a golden whirl (assets/icons-source/sheet-small-5-
 * specials.png, cut by tools/ui/cut-small-icons.py).  They replace the winged
 * star on the Special button, by the weapon whose special it fires
 * (specialArtKind: playerActions.specialAttack's own test of the type).
 * Each was drawn as a WHOLE button -- its own gold ring and slate face -- and
 * the button's ring is the game's (Skin), as it carries the cooldown arc, the
 * grey and the lit states: so the cutter keeps the disc INSIDE the owner's
 * ring, and SpecialFace draws it filling the face inside the game's ring.  A
 * -grey copy for the cooldown and no-mana states, as the others. */
const SPECIAL_ART_V = '2.3.3331';
export function specialArtUrl(kind, grey) {
  return '/ui/controls/abil-special-' + kind + (grey ? '-grey' : '') + '.webp?v=' + SPECIAL_ART_V;
}
/** The special a weapon fires: 'bow', 'staff' or 'sword' (any other weapon
    swings the melee special); null with no weapon. */
export function specialArtKind(weapon) {
  if (!weapon) return null;
  return weapon.type === 'bow' ? 'bow' : weapon.type === 'staff' ? 'staff' : 'sword';
}
/* A picture that IS the face, filling the disc inside the Skin's ring
   (v2.3.3336's SpecialFace, shared by the Block button since v2.3.3494):
   `attrs` names it for the probes. */
function faceArt(size, src, attrs) {
  var d = size - 2 * skinRing(size);
  return React.createElement('span', Object.assign({
    className: 'bt-skin-faceart',
    style: { position: 'relative', display: 'block', width: d, height: d, borderRadius: '50%' },
  }, attrs), React.createElement('img', {
    src: src, alt: '', draggable: false, width: d, height: d,
    style: { display: 'block', width: d, height: d, borderRadius: '50%', pointerEvents: 'none' },
  }));
}
/** The owner's special picture as a Skin's face, inside its ring. */
export function SpecialFace(props) {
  return faceArt(props.size, specialArtUrl(props.kind, !!props.grey), { 'data-special-art': props.kind });
}
/* ═══ v2.3.3494: THE BLOCK BUTTON WEARS THE OWNER'S SHIELD ═══
 * The owner, playtesting: "Block button needs a new icon."  It drew the 64 px
 * wood shield the WORLD hangs on your arm (/sprites/shields/wood-shield-front
 * .png), stretched to 30 px and pixelated: the one control on the right
 * cluster not in the owner's painted style.  Its face is now the owner's own
 * round gold shield on a gold burst (brotown-rpg-ui-asset-sheet-1.png, cut by
 * tools/ui/cut-owner-icons.py into public/ui/controls/abil-block.webp), drawn
 * as the specials are: it was painted as a whole round button, so only the disc
 * inside the owner's ring is kept and it fills the face inside the game's ring,
 * which still carries the cooldown arc and the lit "shield up" state.  The
 * -grey copy is the cooldown's (never a CSS filter, TRAPS §42).  Shield Bash
 * keeps its own picture (the shield striking), so the two stay two pictures. */
const BLOCK_ART_V = '2.3.3494';
export function blockArtUrl(grey) {
  return '/ui/controls/abil-block' + (grey ? '-grey' : '') + '.webp?v=' + BLOCK_ART_V;
}
export function BlockFace(props) {
  return faceArt(props.size, blockArtUrl(!!props.grey), { 'data-icon': 'block' });
}
export const ABILITY_ART_URLS = ['whirl', 'special', 'bash', 'jump', 'burst']
  .reduce(function (a, n) { a.push(abilityArtUrl(n, false), abilityArtUrl(n, true)); return a; }, [])
  /* v2.3.3336: and the three special attacks, warmed with them */
  .concat(['sword', 'bow', 'staff'].reduce(function (a, k) { a.push(specialArtUrl(k, false), specialArtUrl(k, true)); return a; }, []))
  /* v2.3.3494: and the Block button's, lit and grey -- it comes up the moment
     a fight starts with a shield on, never while a loading screen is up */
  .concat([blockArtUrl(false), blockArtUrl(true)]);
function abilityArt(name, props, under) {
  var s = props.size || 28;
  var d = Math.round(s * ABILITY_ART_K);
  var img = React.createElement('img', {
    src: abilityArtUrl(name, !!props.grey), alt: '', draggable: false, width: d, height: d,
    style: {
      position: 'absolute', left: '50%', top: '50%', width: d, height: d,
      transform: 'translate(-50%,-50%)', objectFit: 'contain', pointerEvents: 'none',
    },
  });
  return React.createElement('span', {
    className: 'bt-skin-art', 'data-icon': name,
    style: { position: 'relative', display: 'block', width: s, height: s },
  }, under || null, img);
}

export function TornadoIcon(props) { return abilityArt('whirl', props); }
export function StarburstIcon(props) { return abilityArt('special', props); }
/* Shield Bash: the owner's shield striking, burst and all -- the wood shield
   alone stays the Block button beside it, so the two are never one picture. */
export function BashIcon(props) { return abilityArt('bash', props); }
export function JumpIcon(props) { return abilityArt('jump', props); }
/* The burst fires the element of the weapon's gem: the owner's picture is one
   for every element, so a faint ring in the element's colour stays behind it
   (the outer ring of the nova this button drew since v2.3.1734). */
export function NovaIcon(props) {
  var s = props.size || 28;
  var col = props.grey ? '#7D8388' : (props.color || '#8E44AD');
  var ring = React.createElement('svg', {
    className: 'bt-skin-svg', viewBox: '0 0 100 100', width: s, height: s, 'aria-hidden': 'true',
    style: { position: 'absolute', left: 0, top: 0 },
  }, React.createElement('circle', { cx: 50, cy: 50, r: 47, fill: 'none', stroke: col, strokeWidth: 5, opacity: 0.55 }));
  return abilityArt('burst', props, ring);
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
