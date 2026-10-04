import React from 'react';
import { getActiveWeapon } from '@/data/index.js';
import { nextWeaponSlot, ownedWeaponSlots } from '@/game/weaponSlots.js';
import { wpnIconSrc, GHOST_SRC, weaponDisplayName } from '@/ui/mobile/sheet/equipModel.js';
import { EDGE_GUARD_PX } from './ShieldButton.jsx';
import { Skin } from './controlSkin.jsx'; /* v2.3.3018: the owner's mockup */

/* ═══ v2.3.3005: THE WEAPON IN YOUR HAND, UNDER THE MOVEMENT STICK ═══
 *
 * Owner: "Add a little icon of current equipped weapon in bottom left above
 * dashboard but beneath left joystick.  If you tap on it it switches to the
 * next equipped weapon."
 *
 * Until now the only way to change weapon on a phone was a DOUBLE TAP on the
 * movement side (BroTown's lE, v2.3.97), with a word flashed in the disc
 * between the two taps.  Nothing on screen said the gesture existed or what you
 * were holding.  This button is both: it shows the weapon in your hand, and a
 * tap moves to the next one.  The double tap stays -- nobody asked for it to
 * go, and it is what ControlsTutorial teaches.
 *
 * ONE SWAP, NOT TWO.  A tap here calls BroTown's _desktopCycleWeapon, the same
 * function the double tap and the desktop key call: the rotation comes from
 * weaponSlots.js (so a slot you cannot fill is never offered, v2.3.1845), the
 * worker hears set_active_slot, and the name floats over your head.  This file
 * only draws and decides "is there anywhere to go"; it never moves a slot
 * itself.
 *
 * WHAT IT SHOWS.  The picture of the weapon actually in your hand
 * (getActiveWeapon), drawn by the Weapon cell's own rule (equipModel's
 * wpnIconSrc), so the two can never show different art for one weapon.  Empty
 * hands -- a new bro before the Mayor arms him -- show the Weapon cell's own
 * empty-slot silhouette, faint.  With two or more weapons, a dot per weapon
 * along the bottom, the one in hand lit: that is what says "tap to cycle"
 * without a word, and how many stops the cycle has.  With one weapon a tap
 * shakes the button: a control that silently does nothing reads as broken.
 *
 * ═══ WHERE ═══
 * The band between the dashboard and the movement disc is 70px tall
 * (LBTN.bottom), and the notification bell (WorldChatFeed, v2.3.2155) already
 * stood in its corner.  The button takes the corner and the bell moves one
 * place right, by --bt-wpn-slot (game.css):
 *
 *   - the button is a control and the bell is a readout, and the corner is
 *     right under the disc, where the left thumb already is;
 *   - the bell is the chat feed's fold: opened, it grows into a 226px-wide
 *     header and list.  Had the button gone right of the bell, the open feed
 *     would lie over it -- and the feed sits OUTSIDE .brotown-wrap, so it paints
 *     over everything in the wrap whatever the z-index.  Beside the button, the
 *     feed opens next to it, never on it;
 *   - and the iOS edge guard (EDGE_GUARD_PX, a full-height 18px strip at z40)
 *     ate the leftmost 10px of the bell at left:8.  The button starts at the
 *     guard's edge, so all of it answers a tap -- and so does the bell, now.
 *
 * 44px of touch (Apple's minimum, CTL_MIN_SIZE) round a 40px face, so it reads
 * as small beside the 36px bell while taking a thumb.  The face is centred on
 * the bell's centre line, so the two read as one row.
 *
 * Inside .brotown-wrap, like every other touch control: in landscape the wrap
 * is the containing block (contain:paint, margin-left:--world-x), so the
 * button rides with the world when a side sheet opens.  --land-fold-w is the
 * resting fold chip's footprint sideways (BroTown resize()), the same number
 * the bell steps round.
 *
 * IT MUST SWALLOW ITS OWN TOUCHES.  It sits on [data-joyzone="L"] (z6), where a
 * touchstart begins a walk and a fast release dodges (SpecialButton's header
 * has the full list).  Every touch event is stopped here, and the swap waits
 * for a real TAP -- a release close to where it began -- so a thumb that
 * lands on the button while starting to walk does not change your weapon.
 */
export const WPN_BTN = {
  hit: 44,                /* the touch box */
  face: 40,               /* the drawn chip */
  left: EDGE_GUARD_PX,    /* clear of the iOS edge guard */
  /* The touch box's bottom, above the band: the face (2px inside it) then sits
     at band+6..+46, centred on the bell's band+8..+44. */
  bottom: 4,
  /* The bell's left edge is 8px + --bt-wpn-slot.  game.css carries the number
     (58px = 18 + 44 + 4 - 8) so a pointer:fine media query can zero it where
     this button is hidden; mp-weaponswap measures the real gap. */
  bellGap: 4,
};

/* A tap is a release within this far of the press, inside this long.  The
   joystick's own tap test is 10px / 200ms (BroTown TAP_MAX_*); a button can
   afford a looser one, because nothing else is listening to this patch. */
const TAP_SLOP_PX = 14;
const TAP_MAX_MS = 600;

/** What the button draws, as plain data (and the key it re-renders on). */
export function weaponChipView(R) {
  if (!R) return null;
  var owned = ownedWeaponSlots(R);
  var slot = R.activeSlot || 'melee';
  var wpn = getActiveWeapon(R) || null;
  var src = wpn ? wpnIconSrc(R, wpn) : GHOST_SRC.weapon;
  /* An unowned active slot (a stale save, a dropped weapon) rotates as melee in
     nextWeaponSlot, so its dot is melee's too. */
  var at = owned.indexOf(slot);
  if (at < 0) at = 0;
  return {
    slot: slot,
    owned: owned,
    at: at,
    src: src,
    ghost: !wpn,
    name: wpn ? weaponDisplayName(wpn) : 'Fists',
    canSwap: nextWeaponSlot(R) !== slot,
    key: slot + '|' + src + '|' + owned.join(',') + '|' + at,
  };
}

/* Every weapon you could swap to, so the first tap never waits on a download:
   the next picture is already in the cache when the slot changes. */
function preloadIcons(R) {
  if (!R || typeof Image === 'undefined') return;
  [R.weapon, R.rangedWeapon, R.staffWeapon].forEach(function (w) {
    if (!w) return;
    try { var im = new Image(); im.src = wpnIconSrc(R, w); } catch (e) { /* no DOM */ }
  });
}

export function WeaponSwapButton(props) {
  var stateRef = props.stateRef;
  var onCycle = props.onCycle;
  var _v = React.useState(null);
  var view = _v[0], setView = _v[1];
  /* { kind: 'in' | 'nope', n } -- n re-keys the face so the animation restarts
     on every tap, including two in a row. */
  var _a = React.useState(null);
  var anim = _a[0], setAnim = _a[1];
  var touchRef = React.useRef(null);
  var lastTouchEndRef = React.useRef(0);

  /* The same 200ms poll as ShieldButton / SpecialButton / AbilityButtons: the
     active slot also changes without a React render (the double tap, the
     worker's persisted slot on a reconnect, a weapon equipped from the bag).
     It only re-renders when what is drawn changes. */
  React.useEffect(function () {
    var last = null;
    var lastOwned = '';
    var read = function () {
      var S = stateRef && stateRef.current;
      var v = weaponChipView(S && S.rpg);
      var key = v ? v.key : '';
      if (key !== last) { last = key; setView(v); }
      var ownedKey = S && S.rpg ? [S.rpg.weapon, S.rpg.rangedWeapon, S.rpg.staffWeapon]
        .map(function (w) { return w ? wpnIconSrc(S.rpg, w) : ''; }).join('|') : '';
      if (ownedKey !== lastOwned) { lastOwned = ownedKey; preloadIcons(S && S.rpg); }
    };
    read();
    var id = setInterval(read, 200);
    return function () { clearInterval(id); };
  }, [stateRef]);

  if (typeof window !== 'undefined') {
    /* QA probe, house style (__btShieldBtn, __btSpecialBtn). */
    window.__btWeaponChip = function () {
      var S = stateRef && stateRef.current;
      var v = weaponChipView(S && S.rpg);
      return v ? { slot: v.slot, owned: v.owned, at: v.at, src: v.src, ghost: v.ghost,
        name: v.name, canSwap: v.canSwap } : null;
    };
  }

  if (!view) return null;

  var act = function () {
    var S = stateRef && stateRef.current;
    if (!S || !S.rpg) return;
    var cur = S.rpg.activeSlot || 'melee';
    if (nextWeaponSlot(S.rpg) === cur) {
      setAnim({ kind: 'nope', n: Date.now() });
      return;
    }
    try { if (onCycle) onCycle(); } catch (err) { /* the swap floats its own feedback */ }
    setAnim({ kind: 'in', n: Date.now() });
    setView(weaponChipView(S.rpg));
  };

  var stop = function (e) { e.stopPropagation(); };
  var onTouchStart = function (e) {
    /* preventDefault: no synthesised click, no iOS callout or text selection;
       stopPropagation: the movement zone and the canvas never hear it. */
    e.preventDefault();
    e.stopPropagation();
    var t = e.changedTouches && e.changedTouches[0];
    touchRef.current = t ? { id: t.identifier, x: t.clientX, y: t.clientY, at: Date.now() } : null;
  };
  var onTouchEnd = function (e) {
    e.preventDefault();
    e.stopPropagation();
    var s = touchRef.current;
    touchRef.current = null;
    lastTouchEndRef.current = Date.now();
    if (!s) return;
    var t = null;
    var list = e.changedTouches || [];
    for (var i = 0; i < list.length; i++) if (list[i].identifier === s.id) t = list[i];
    if (!t) return;
    var dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (dx * dx + dy * dy > TAP_SLOP_PX * TAP_SLOP_PX) return;
    if (Date.now() - s.at > TAP_MAX_MS) return;
    act();
  };
  /* A click that is NOT the tail of a touch: assistive tech activating the
     button, or a mouse on a device that still reports a coarse pointer. */
  var onClick = function (e) {
    e.stopPropagation();
    if (Date.now() - lastTouchEndRef.current < 800) return;
    act();
  };

  var owned = view.owned;
  var many = owned.length >= 2;
  var face = WPN_BTN.face;
  var icon = many ? 26 : 30;
  var label = 'Weapon: ' + view.name + (view.canSwap ? '. Tap to switch weapon.' : '');

  return React.createElement('button', {
    type: 'button',
    className: 'bt-desktop-hide bt-wpn-btn',
    'data-weapon-chip': view.slot,
    'data-weapon-owned': owned.length,
    'aria-label': label,
    onTouchStart: onTouchStart,
    onTouchMove: stop,
    onTouchEnd: onTouchEnd,
    onTouchCancel: function (e) { e.stopPropagation(); touchRef.current = null; },
    onClick: onClick,
    onContextMenu: function (e) { e.preventDefault(); },
    style: {
      position: 'fixed',
      left: 'calc(var(--land-fold-w, 0px) + ' + WPN_BTN.left + 'px)',
      bottom: 'calc(var(--sheet-h, var(--dash-h)) + ' + WPN_BTN.bottom + 'px)',
      width: WPN_BTN.hit,
      height: WPN_BTN.hit,
      padding: 0,
      margin: 0,
      border: 0,
      background: 'transparent',
      /* Above [data-joyzone="L"] (z6) and the movement disc's box (z30): the
         rung ShieldButton, SpecialButton and AbilityButtons sit on. */
      zIndex: 31,
      touchAction: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      WebkitTapHighlightColor: 'transparent',
      WebkitUserSelect: 'none',
      userSelect: 'none',
      WebkitTouchCallout: 'none',
      cursor: 'pointer',
    },
  },
  React.createElement('span', {
    key: 'face-' + (anim && anim.kind === 'nope' ? anim.n : 0),
    className: 'bt-wpn-face' + (anim && anim.kind === 'nope' ? ' bt-wpn-face--nope' : ''),
    style: {
      position: 'relative',
      boxSizing: 'border-box',
      width: face,
      height: face,
      /* The bell's own surface (WorldChatFeed's shut recipe) until v2.3.3018,
         when the owner's mockup made every control a round gold-ringed
         button: the ring is GOLD when a tap will do something and a quiet
         slate when it will not (one weapon), which is the same "this is live"
         rule the brass edge carried. */
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
    },
  },
  React.createElement(Skin, { size: face, tone: 'slate', state: view.canSwap ? 'normal' : 'quiet' }),
  React.createElement('img', {
    key: 'icon-' + view.src + '-' + (anim && anim.kind === 'in' ? anim.n : 0),
    className: 'bt-wpn-icon' + (anim && anim.kind === 'in' ? ' bt-wpn-icon--in' : ''),
    src: view.src,
    alt: '',
    draggable: false,
    style: {
      position: 'relative',   /* v2.3.3018: over the skin */
      width: icon,
      height: icon,
      marginTop: many ? -5 : 0,
      objectFit: 'contain',
      pointerEvents: 'none',
      /* No CSS filter, ever: a filter on a DOM overlay over the WebGL canvas is
         the documented iOS grain (v2.3.948, v2.3.1236).  Empty hands are the
         silhouette at the Weapon cell's own ghost strength. */
      opacity: view.ghost ? 0.35 : 1,
    },
  }),
  many && React.createElement('span', {
    'data-weapon-dots': view.at,
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 6,   /* v2.3.3018: inside the round face's ring (it was 4 in the square chip) */
      display: 'flex',
      justifyContent: 'center',
      gap: 3,
      pointerEvents: 'none',
    },
  }, owned.map(function (s, i) {
    return React.createElement('span', {
      key: s,
      style: {
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: i === view.at ? '#F0C878' : 'rgba(229,237,233,.34)',
      },
    });
  }))));
}
