import React from 'react';
import { getActiveWeapon } from '@/data/index.js';
import { nextWeaponSlot, prevWeaponSlot, ownedWeaponSlots } from '@/game/weaponSlots.js';
import { wpnIconSrc, weaponDisplayName, GHOST_SRC } from '@/ui/mobile/sheet/equipModel.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { weaponTriAnchor, WTRI, ctlBottom, LBTN, leftCluster, LCTL_SLOT } from './ShieldButton.jsx';
import { Skin } from './controlSkin.jsx';

/* ═══ v2.3.3919: THE WEAPON TRIANGLE, OVER THE MOVEMENT STICK ═══
 *
 * The owner, playtesting: "I need a button on screen for switching between
 * weapons.  Maybe a triangle or wheel where the active weapon is highlighted
 * on top and the others are greyed out", and "I don't think it's clear enough
 * that tapping the tiny circular staff button (right next to the notification
 * bell) allows you to switch between weapons."  From the design review they
 * adopted: "relocate it near the right-hand combat controls, enlarge it ...
 * The icon should always depict the currently active sword, bow, or staff."
 *
 * It replaces v2.3.3005's WeaponSwapButton (a 44 px chip in the bottom-left
 * corner, a tap = the next weapon).  Three round buttons, one per weapon slot,
 * always in the order sword -> bow -> staff round the triangle:
 *   TOP           the weapon in your hand: full colour, the gold ring, bigger
 *                 (WTRI.top, 46 px).  It carries data-weapon-chip, the hook
 *                 SwapHint and the tests point at.  A tap does nothing.
 *   LOWER RIGHT   the next weapon round the cycle, LOWER LEFT the one before:
 *                 smaller (WTRI.side, 40 px of touch), the quiet slate ring,
 *                 the picture dimmed.  A tap takes it in hand, and the triangle
 *                 turns (each button slides to its new corner, 150 ms) so it
 *                 is on top.
 *   EMPTY         a weapon you do not have yet (no bow before Mayor Bro's
 *                 first hand-in): a dashed empty circle; a tap says "No bow
 *                 yet" over your head, as Sprint's "Not enough energy!" does,
 *                 and does nothing else.
 * Dimmed, not desaturated: a CSS filter on a DOM overlay over the WebGL
 * canvas is the iOS grain (v2.3.948, v2.3.1236), so the side buttons are the
 * PaintedIcon's own greyed recipe (opacity on the slate face).
 *
 * ONE SWAP PATH.  A tap calls BroTown's _desktopCycleWeapon, the function the
 * double tap, the Tab key and the old chip call: one step on, or (dir -1) one
 * step back, which with three slots reaches either of the other two, and with
 * two the other one.  The worker hears set_active_slot, the name floats over
 * your head, the swap's own sound plays.  This file never moves a slot itself.
 *
 * WHERE: weaponTriAnchor (ShieldButton.jsx): the left thumb's side, over the
 * movement stick, by the owner's choice ("the right joystick is already
 * crowded with buttons and weapon swapping won't need to occur as often").
 * A phone only: a computer swaps with 1/2/3 (bt-desktop-
 * hide).  The movement side's double tap stays.
 *
 * IT SWALLOWS ITS OWN TOUCHES, as Quick eat does.  It sits on
 * [data-joyzone="L"] (z6), where a touch starts a walk and a quick release
 * dodges.  Every touch event is stopped here, and a swap waits for a real TAP
 * (a release near where it began), so a thumb that lands on it while starting
 * to walk changes nothing.  touch-action: none, like the
 * other controls on the zones (TRAPS §229 names them). */

export const WTRI_ORDER = ['melee', 'ranged', 'staff'];
const SLOT_WORD = { melee: 'sword', ranged: 'bow', staff: 'staff' };
const TURN_MS = 150;
const NOTE_COLOR = '#F2C14E';   /* Sprint's refusal colour (SprintButton) */

/* A tap is a release within this far of the press, inside this long (the old
   chip's numbers; the joystick's own are 10 px / 200 ms). */
const TAP_SLOP_PX = 14;
const TAP_MAX_MS = 600;
/* v2.3.3283 (kept from the chip): QA's `?tapms=` stretches the window, for a
   test page drawing a frame every ~400 ms.  Only a test sets it.  Read once. */
let _qaTapMs;
function tapMaxMs() {
  if (_qaTapMs !== undefined) return _qaTapMs;
  _qaTapMs = TAP_MAX_MS;
  try {
    const m = /(?:^|[?&])tapms=(\d+)/.exec((typeof window !== 'undefined' && window.location && window.location.search) || '');
    if (m) _qaTapMs = Math.max(200, Math.min(10000, +m[1]));
  } catch (e) { /* no window */ }
  return _qaTapMs;
}

function weaponOf(R, slot) {
  return slot === 'ranged' ? R.rangedWeapon : slot === 'staff' ? R.staffWeapon : R.weapon;
}

/** What the triangle draws, as plain data (and the key it re-renders on). */
export function weaponTriView(R) {
  if (!R) return null;
  var owned = ownedWeaponSlots(R);
  var slot = R.activeSlot || 'melee';
  /* an unowned active slot (a stale save, a dropped weapon) cycles as melee
     (nextWeaponSlot), so it is drawn as melee */
  if (owned.indexOf(slot) < 0) slot = 'melee';
  var at = WTRI_ORDER.indexOf(slot);
  var roles = { top: slot, right: WTRI_ORDER[(at + 1) % 3], left: WTRI_ORDER[(at + 2) % 3] };
  var wpn = getActiveWeapon(R) || null;
  var slots = WTRI_ORDER.map(function (s) {
    var w = weaponOf(R, s) || null;
    var has = owned.indexOf(s) >= 0;
    return {
      slot: s,
      role: s === roles.top ? 'top' : s === roles.right ? 'right' : 'left',
      owned: has,
      /* melee is always owned: empty, it is fists (weaponSlots.js), drawn as
         the Weapon cell's own empty-slot picture, faint, as the chip drew it */
      src: w ? wpnIconSrc(R, w) : (s === 'melee' ? GHOST_SRC.weapon : null),
      bare: !w,
      name: w ? weaponDisplayName(w) : (s === 'melee' ? 'Fists' : null),
    };
  });
  return {
    slot: slot,
    owned: owned,
    roles: roles,
    slots: slots,
    name: wpn ? weaponDisplayName(wpn) : 'Fists',
    canSwap: nextWeaponSlot(R) !== (R.activeSlot || 'melee'),
    key: slot + '|' + owned.join(',') + '|' + slots.map(function (x) { return x.src; }).join(','),
  };
}

/* Every weapon you could swap to, so a swap never waits on a download. */
function preloadIcons(R) {
  if (!R || typeof Image === 'undefined') return;
  [R.weapon, R.rangedWeapon, R.staffWeapon].forEach(function (w) {
    if (!w) return;
    try { var im = new Image(); im.src = wpnIconSrc(R, w); } catch (e) { /* no DOM */ }
  });
}

/* QA: the triangle's and every left-thumb control's box, drawn or not (slots
   are kept whether or not their control is up), in px in from the LEFT edge /
   over the band -- so mp-weaponswap can hold the triangle clear of Element
   Burst and Quick eat without arming either. */
function clusterBoxes(land) {
  var dW = land ? LBTN.wLand : LBTN.w;
  var lc = leftCluster(land);
  var t = weaponTriAnchor(land);
  return {
    tri: { left: t.left, bottom: t.bottomPx, w: t.w, h: t.h },
    stick: { left: land ? LBTN.leftLand : LBTN.left, bottom: LBTN.bottom, w: dW, h: dW },
    burst: { left: lc.leftPx(LCTL_SLOT.burst), bottom: lc.bottomPx(LCTL_SLOT.burst), w: lc.size, h: lc.size },
    eat: { left: lc.leftPx(LCTL_SLOT.eat), bottom: lc.bottomPx(LCTL_SLOT.eat), w: lc.size, h: lc.size },
  };
}

const qa = { taps: 0, notes: [], last: null, boxes: clusterBoxes };

export function WeaponTriangle(props) {
  var stateRef = props.stateRef;
  var onCycle = props.onCycle;
  var isLandscape = !!props.isLandscape;
  var _v = React.useState(null);
  var view = _v[0], setView = _v[1];
  /* { slot, n }: n re-keys the empty circle so its shake restarts */
  var _n = React.useState(null);
  var nope = _n[0], setNope = _n[1];
  var touchRef = React.useRef(null);
  var lastTouchEndRef = React.useRef(0);

  /* The 200 ms poll every control here keeps: the slot also changes with no
     React render (the double tap, the worker's slot on a reconnect, a weapon
     equipped from the bag).  It re-renders only when what is drawn changes. */
  React.useEffect(function () {
    var last = null;
    var lastOwned = '';
    var read = function () {
      var S = stateRef && stateRef.current;
      var v = weaponTriView(S && S.rpg);
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
    /* QA probes, house style: __btWeaponChip (the chip's, kept: what the
       triangle holds) and __btWeaponTri (its taps and its notes). */
    window.__btWeaponChip = function () {
      var S = stateRef && stateRef.current;
      var v = weaponTriView(S && S.rpg);
      return v ? { slot: v.slot, owned: v.owned, roles: v.roles, name: v.name, canSwap: v.canSwap,
        src: (v.slots.filter(function (x) { return x.slot === v.slot; })[0] || {}).src || null } : null;
    };
    window.__btWeaponTri = qa;
  }

  if (!view) return null;

  var act = function (slot) {
    var S = stateRef && stateRef.current;
    if (!S || !S.rpg) return;
    qa.taps++;
    qa.last = slot;
    var R = S.rpg;
    var cur = R.activeSlot || 'melee';
    if (ownedWeaponSlots(R).indexOf(slot) < 0) {
      var note = 'No ' + SLOT_WORD[slot] + ' yet';
      qa.notes.push(note);
      if (qa.notes.length > 10) qa.notes.shift();
      try { if (S.player) pushDmgPopup(S, S.player.x, S.player.y - 30, note, NOTE_COLOR, { ts: Date.now() }); } catch (e) { /* words only */ }
      setNope({ slot: slot, n: Date.now() });
      return;
    }
    if (slot === cur) return;   /* already in hand */
    try {
      if (onCycle) {
        if (nextWeaponSlot(R) === slot) onCycle();
        else if (prevWeaponSlot(R) === slot) onCycle(-1);
        else { onCycle(); if ((R.activeSlot || 'melee') !== slot) onCycle(); }
      }
    } catch (err) { /* the swap floats its own feedback */ }
    setView(weaponTriView(R));
  };

  var onTouchStart = function (e) {
    /* preventDefault: no synthesised click, no iOS callout; stopPropagation:
       the aiming zone and the canvas never hear it */
    e.preventDefault();
    e.stopPropagation();
    var t = e.changedTouches && e.changedTouches[0];
    var slot = e.currentTarget.getAttribute('data-wtri-slot');
    touchRef.current = t ? { id: t.identifier, x: t.clientX, y: t.clientY, at: Date.now(), slot: slot } : null;
    if (e.currentTarget.setAttribute) e.currentTarget.setAttribute('data-pressed', '1');
  };
  var onTouchEnd = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.removeAttribute) e.currentTarget.removeAttribute('data-pressed');
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
    if (Date.now() - s.at > tapMaxMs()) return;
    act(s.slot);
  };
  var onTouchCancel = function (e) {
    e.stopPropagation();
    if (e.currentTarget.removeAttribute) e.currentTarget.removeAttribute('data-pressed');
    touchRef.current = null;
  };
  /* a click that is not the tail of a touch: assistive tech, or a mouse on a
     device that still reports a coarse pointer */
  var onClick = function (e) {
    e.stopPropagation();
    if (Date.now() - lastTouchEndRef.current < 800) return;
    act(e.currentTarget.getAttribute('data-wtri-slot'));
  };
  var stop = function (e) { e.stopPropagation(); };

  var anchor = weaponTriAnchor(isLandscape);
  var box = anchor.box;
  var BIG = WTRI.top;

  return React.createElement('div', {
    className: 'bt-desktop-hide bt-wtri',
    'data-weapon-tri': view.slot,
    style: {
      position: 'fixed',
      left: anchor.left,
      bottom: ctlBottom(anchor.bottomPx),
      width: anchor.w,
      height: anchor.h,
      /* the box takes no touches: only its three round buttons do */
      pointerEvents: 'none',
      /* the rung Quick eat, Element Burst and the others sit on: over the
         movement zone (z6) and the discs' boxes (z30) */
      zIndex: 31,
    },
  }, view.slots.map(function (x) {
    var c = box[x.role];
    var top = x.role === 'top';
    var k = top ? 1 : WTRI.side / BIG;
    var label = x.owned
      ? (top ? 'Weapon in hand: ' + x.name : 'Switch to ' + x.name)
      : 'No ' + SLOT_WORD[x.slot] + ' yet';
    var face;
    if (!x.owned) {
      /* the weapon you do not have yet: a dashed empty circle */
      face = React.createElement('span', {
        key: 'empty' + (nope && nope.slot === x.slot ? nope.n : 0),
        className: nope && nope.slot === x.slot ? 'bt-wtri-nope' : undefined,
        style: {
          position: 'absolute', inset: 3, borderRadius: '50%', boxSizing: 'border-box',
          border: '2.5px dashed rgba(229,237,233,.55)', background: 'rgba(12,16,20,.42)',
          pointerEvents: 'none',
        },
      });
    } else {
      var icon = Math.round(BIG * 0.62);
      face = React.createElement(Skin, { key: 'skin', size: BIG, tone: 'slate', state: top ? 'normal' : 'quiet' },
        x.src ? React.createElement('img', {
          src: x.src, alt: '', draggable: false, width: icon, height: icon,
          style: {
            display: 'block', width: icon, height: icon, objectFit: 'contain', pointerEvents: 'none',
            /* never a filter (above): the side weapons dimmed on the slate */
            opacity: x.bare ? 0.35 : top ? 1 : 0.42,
          },
        }) : null);
    }
    var attrs = {
      key: x.slot,
      type: 'button',
      className: 'bt-wtri-btn',
      'data-wtri-slot': x.slot,
      'data-wtri-role': x.role,
      'data-wtri-owned': x.owned ? '1' : '0',
      'data-uisfx': 'off',   /* the swap plays its own sound (_desktopCycleWeapon) */
      'aria-label': label,
      'aria-pressed': top ? 'true' : 'false',
      onTouchStart: onTouchStart,
      onTouchMove: stop,
      onTouchEnd: onTouchEnd,
      onTouchCancel: onTouchCancel,
      onClick: onClick,
      onContextMenu: function (e) { e.preventDefault(); },
      style: {
        position: 'absolute', left: 0, top: 0,
        width: BIG, height: BIG, padding: 0, margin: 0, border: 0, borderRadius: '50%',
        background: 'transparent',
        /* one size, scaled: the hit area follows the transform, so a side
           button answers inside its 40 px circle and the turn is one
           transition of one property */
        transform: 'translate(' + (c.x - BIG / 2) + 'px,' + (c.y - BIG / 2) + 'px) scale(' + k.toFixed(4) + ')',
        transformOrigin: '50% 50%',
        transition: 'transform ' + TURN_MS + 'ms cubic-bezier(.2,.8,.2,1)',
        pointerEvents: 'auto',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
        WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
        cursor: 'pointer',
        zIndex: top ? 2 : 1,
      },
    };
    if (top) {
      /* the hook SwapHint, mp-weaponswap and the button audits point at */
      attrs['data-weapon-chip'] = x.slot;
      attrs['data-weapon-owned'] = view.owned.length;
    }
    return React.createElement('button', attrs, face);
  }));
}
