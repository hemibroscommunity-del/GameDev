import React from 'react';
import { nextWeaponSlot, prevWeaponSlot, ownedWeaponSlots } from '@/game/weaponSlots.js';
import { weaponDisplayName } from '@/ui/mobile/sheet/equipModel.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { weaponPillAnchor, WPILL, ctlBottom, RBTN, LBTN, discRight, discBottom, sprintAnchor, jumpAnchor, blockAnchor,
  ctlColumn, CTL_SLOT, rightCluster, RCTL_SLOT, leftCluster, LCTL_SLOT } from './ShieldButton.jsx';
import { WPN_PILL_ICONS } from './controlSkin.jsx';

/* ═══ v2.3.4130: THE WEAPON PILL, CENTRED AT THE FOOT OF THE WORLD ═══
 *
 * The owner, 2026-11-03, sending a picture of it: "I uploaded ... different
 * pill shape weapon swap type bar.  Put it centered bottom of screen area."
 * The reference: one dark pill with a gold rim, three round wells in it --
 * sword, bow, staff -- the weapon in hand's well ringed in glowing gold with
 * its picture in colour, the other two grey.
 *
 * It replaces v2.3.3921's weapon triangle (WeaponTriangle.jsx, beside the
 * movement stick), which replaced v2.3.3005's corner chip.  The wells keep
 * their places (sword | bow | staff, left to right, whatever is in hand), so
 * a thumb learns where each weapon is:
 *   IN HAND   the well ringed in gold, glowing (box-shadows, never a CSS
 *             filter: the iOS grain), the Character sheet's own coloured
 *             picture of that weapon (hero/melee, bow, magic), baked small
 *             (ui/controls/wpn-*.webp: one is on screen always).  It carries
 *             data-weapon-chip, the hook the tests point at (the guide arrow's swap
 *             lesson points at the whole pill, [data-weapon-pill]).
 *   HELD      the same picture baked grey (ui/controls/wpn-*-grey.webp,
 *             tools/ui/draw-control-icons.py: the game never filters a
 *             picture on screen, TRAPS §42).  A tap takes it in hand.
 *   NOT YET   an empty well, dimmer; a tap says "No bow yet" over your head
 *             (Sprint's "Not enough energy!" manner) and does nothing else.
 *
 * ONE SWAP PATH.  A tap or click calls BroTown's _desktopCycleWeapon, the
 * function the double tap, the Tab key and the triangle call: one step on, or
 * (dir -1) one step back, which with three slots reaches either of the others
 * and with two the other one.  The worker hears set_active_slot, the name
 * floats over your head, the weapon's sound plays.  On a computer the wells
 * wear their keys (1, 2, 3: deskKeys.js, desktopControls.js), which stay.
 *
 * WHERE: weaponPillAnchor (ShieldButton.jsx): centred in the world view, just
 * over the dashboard band -- a phone upright and sideways and a computer
 * alike; on an upright phone Jump turned west on its ring to stand clear of
 * it (jumpAnchor).  While it is drawn html carries data-wpill-shown, which
 * lifts the doors' Enter prompt over it (game.css).
 *
 * ON THE MOVEMENT OR AIMING ZONE, IT SWALLOWS ITS OWN TOUCHES: every touch
 * event is stopped here and a swap waits for a real TAP (a release near where
 * it began), so a thumb sliding over it changes nothing (touch-action: none,
 * as the other controls on the zones, TRAPS §229). */

export const WPILL_ORDER = ['melee', 'ranged', 'staff'];
const SLOT_WORD = { melee: 'sword', ranged: 'bow', staff: 'staff' };
const SLOT_KEY = { melee: '1', ranged: '2', staff: '3' };
const NOTE_COLOR = '#F2C14E';   /* Sprint's refusal colour (SprintButton) */

/* A tap is a release within this far of the press, inside this long (the
   triangle's and the chip's numbers). */
const TAP_SLOP_PX = 14;
const TAP_MAX_MS = 600;
/* v2.3.3283 (kept from the chip): QA's `?tapms=` stretches the window for a
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

/** What the pill draws, as plain data (and the key it re-renders on). */
export function weaponPillView(R) {
  if (!R) return null;
  var owned = ownedWeaponSlots(R);
  var slot = R.activeSlot || 'melee';
  /* an unowned active slot (a stale save, a dropped weapon) cycles as melee
     (nextWeaponSlot), so it is drawn as melee */
  if (owned.indexOf(slot) < 0) slot = 'melee';
  var wells = WPILL_ORDER.map(function (s) {
    var w = weaponOf(R, s) || null;
    var has = owned.indexOf(s) >= 0;
    return {
      slot: s,
      on: s === slot,
      owned: has,
      /* melee is always owned: empty, it is fists (weaponSlots.js), drawn as
         the sword's picture all the same -- the well is where a sword goes */
      src: has ? WPN_PILL_ICONS[s][s === slot ? 'on' : 'off'] : null,
      name: w ? weaponDisplayName(w) : (s === 'melee' ? 'Fists' : null),
    };
  });
  return {
    slot: slot,
    owned: owned,
    wells: wells,
    canSwap: nextWeaponSlot(R) !== (R.activeSlot || 'melee'),
    key: slot + '|' + owned.join(','),
  };
}

/* QA: every touch control's place, drawn or not (slots are kept whether or
   not their control is up), as { x, r, b, h } in px from the screen's left
   and px over the band -- so mp-weaponswap holds the pill clear of Block,
   TRAP, Shield Bash, Special and the rest without starting a fight. */
function slotBoxes(land, vw) {
  var out = {};
  var R = function (name, right, bottom, w, h) { out[name] = { x: vw - right - w, r: vw - right, b: bottom, h: h }; };
  var L = function (name, left, bottom, w, h) { out[name] = { x: left, r: left + w, b: bottom, h: h }; };
  var dW = land ? RBTN.wLand : RBTN.w, lW = land ? LBTN.wLand : LBTN.w;
  var col = ctlColumn(land), rc = rightCluster(land), sp = sprintAnchor(land), jp = jumpAnchor(land), bl = blockAnchor(land), lc = leftCluster(land);
  R('disc', discRight(land), discBottom(land), dW, dW);
  R('sprint', sp.right, sp.bottomPx, sp.size, sp.size);
  R('jump', jp.right, jp.bottomPx, jp.size, jp.size);
  R('block', bl.right, bl.bottomPx, bl.size, bl.size);
  R('bash', col.right, col.bottomPx(CTL_SLOT.bash), col.size, col.size);
  R('trap', col.right, col.bottomPx(CTL_SLOT.trap), col.size, col.size);
  R('special', rc.rightPx(RCTL_SLOT.special), rc.bottomPx(RCTL_SLOT.special), rc.size, rc.size);
  R('whirl', rc.rightPx(RCTL_SLOT.whirl), rc.bottomPx(RCTL_SLOT.whirl), rc.size, rc.size);
  L('stick', land ? LBTN.leftLand : LBTN.left, LBTN.bottom, lW, lW);
  L('burst', lc.leftPx(LCTL_SLOT.burst), lc.bottomPx(LCTL_SLOT.burst), lc.size, lc.size);
  L('eat', lc.leftPx(LCTL_SLOT.eat), lc.bottomPx(LCTL_SLOT.eat), lc.size, lc.size);
  return out;
}

const qa = { taps: 0, notes: [], last: null, box: weaponPillAnchor, slots: slotBoxes };

export function WeaponPill(props) {
  var stateRef = props.stateRef;
  var onCycle = props.onCycle;
  var isLandscape = !!props.isLandscape;
  var _v = React.useState(null);
  var view = _v[0], setView = _v[1];
  /* { slot, n }: n re-keys the empty well so its shake restarts */
  var _n = React.useState(null);
  var nope = _n[0], setNope = _n[1];
  /* v2.3.4303, the owner: pressing a slot whose weapon you do not have says "No bow equipped"
     in a line you can read over the pill (2 s), not only a greyed icon and a small float */
  var _t = React.useState('');
  var noteText = _t[0], setNoteText = _t[1];
  var noteTimer = React.useRef(0);
  var touchRef = React.useRef(null);
  var lastTouchEndRef = React.useRef(0);

  /* The 200 ms poll every control here keeps: the slot also changes with no
     React render (the double tap, a key, the worker's slot on a reconnect, a
     weapon equipped from the bag).  It re-renders only when what is drawn
     changes. */
  React.useEffect(function () {
    var last = null;
    var read = function () {
      var S = stateRef && stateRef.current;
      var v = weaponPillView(S && S.rpg);
      var key = v ? v.key : '';
      if (key !== last) { last = key; setView(v); }
    };
    read();
    var id = setInterval(read, 200);
    return function () { clearInterval(id); };
  }, [stateRef]);

  /* html[data-wpill-shown] while it is drawn: the doors' Enter prompt rises
     over it (game.css) */
  var shown = !!view;
  React.useEffect(function () {
    if (!shown || typeof document === 'undefined') return undefined;
    var root = document.documentElement;
    root.setAttribute('data-wpill-shown', '1');
    return function () { root.removeAttribute('data-wpill-shown'); };
  }, [shown]);

  if (typeof window !== 'undefined') {
    /* QA probes, house style: __btWeaponChip (what the pill holds, the name
       the chip and the triangle used) and __btWeaponPill (its taps, its
       notes, its place) */
    window.__btWeaponChip = function () {
      var S = stateRef && stateRef.current;
      var v = weaponPillView(S && S.rpg);
      return v ? { slot: v.slot, owned: v.owned, canSwap: v.canSwap,
        src: (v.wells.filter(function (x) { return x.on; })[0] || {}).src || null } : null;
    };
    window.__btWeaponPill = qa;
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
      var note = 'No ' + SLOT_WORD[slot] + ' equipped';   /* v2.3.4303: said in full (was "yet"), and in a readable line over the pill (below) */
      qa.notes.push(note);
      if (qa.notes.length > 10) qa.notes.shift();
      try { if (S.player) pushDmgPopup(S, S.player.x, S.player.y - 30, note, NOTE_COLOR, { ts: Date.now() }); } catch (e) { /* words only */ }
      setNope({ slot: slot, n: Date.now(), text: note });
      try { clearTimeout(noteTimer.current); noteTimer.current = setTimeout(function () { setNoteText(''); }, 2000); } catch (e) { /* stays a moment longer */ }
      setNoteText(note);
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
    setView(weaponPillView(R));
  };

  var onTouchStart = function (e) {
    /* preventDefault: no synthesised click, no iOS callout; stopPropagation:
       the zones and the canvas never hear it */
    e.preventDefault();
    e.stopPropagation();
    var t = e.changedTouches && e.changedTouches[0];
    var slot = e.currentTarget.getAttribute('data-wpill-slot');
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
  /* a click that is not the tail of a touch: a computer's mouse (a click on
     something you use is not a swing: _deskPressTarget reads the button),
     assistive tech */
  var onClick = function (e) {
    e.stopPropagation();
    if (Date.now() - lastTouchEndRef.current < 800) return;
    act(e.currentTarget.getAttribute('data-wpill-slot'));
  };
  var stop = function (e) { e.stopPropagation(); };

  var a = weaponPillAnchor(isLandscape);
  var W = a.well;   /* 40 px; less only on a phone narrower than 360 px (ShieldButton) */

  var pill = React.createElement('div', {
    className: 'bt-wpill',
    'data-weapon-pill': view.slot,
    role: 'group',
    'aria-label': 'Weapons',
    onMouseDown: stop,
    onPointerDown: stop,
    style: {
      position: 'fixed',
      left: a.left != null ? a.left : 'calc(50% - ' + (a.w / 2) + 'px)',
      bottom: ctlBottom(a.bottomPx),
      width: a.w,
      height: a.h,
      boxSizing: 'border-box',
      padding: WPILL.pad,
      display: 'flex',
      gap: WPILL.gap,
      borderRadius: a.h / 2,
      /* the reference's pill: the controls' dark slate, a gold rim inside a
         near-black edge */
      background: 'linear-gradient(180deg,#1F313B 0%,#15232B 100%)',
      boxShadow: '0 0 0 1.5px rgba(14,10,4,.9), inset 0 0 0 2.5px #C99A45, inset 0 0 0 4px rgba(14,10,4,.55)',
      /* the rung the controls sit on: over the zones (z6) and the discs (z30) */
      zIndex: 31,
      touchAction: 'none',
      WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
    },
  }, view.wells.map(function (x) {
    var label = !x.owned ? 'No ' + SLOT_WORD[x.slot] + ' yet'
      : x.on ? 'Weapon in hand: ' + x.name : 'Switch to ' + x.name;
    var shaking = nope && nope.slot === x.slot;
    var attrs = {
      key: x.slot + (shaking ? nope.n : ''),
      type: 'button',
      className: 'bt-wpill-well' + (shaking ? ' bt-wpill-nope' : ''),
      'data-wpill-slot': x.slot,
      'data-wpill-on': x.on ? '1' : '0',
      'data-wpill-owned': x.owned ? '1' : '0',
      'data-key': SLOT_KEY[x.slot],   /* a computer's key cap (deskKeys: 1 Melee, 2 Bow, 3 Staff) */
      'data-uisfx': 'off',   /* the swap plays its own sound (_desktopCycleWeapon) */
      'aria-label': label,
      'aria-pressed': x.on ? 'true' : 'false',
      onTouchStart: onTouchStart,
      onTouchMove: stop,
      onTouchEnd: onTouchEnd,
      onTouchCancel: onTouchCancel,
      onClick: onClick,
      onContextMenu: function (e) { e.preventDefault(); },
      style: {
        position: 'relative',
        flex: 'none',
        width: W, height: W, padding: 0, margin: 0, border: 0, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: x.on
          ? 'radial-gradient(circle at 50% 40%,#2A3F49 0%,#18262E 70%)'
          : 'radial-gradient(circle at 50% 40%,#1E2E37 0%,#121D24 75%)',
        /* in hand: a glowing gold ring; held: the well's quiet rim; not yet:
           dimmer still */
        boxShadow: x.on
          ? 'inset 0 0 0 2.5px #F5C54E, 0 0 9px 2px rgba(255,196,72,.75), inset 0 0 8px rgba(255,196,72,.35)'
          : x.owned ? 'inset 0 0 0 1.5px #3A4E5A, inset 0 2px 4px rgba(0,0,0,.45)'
            : 'inset 0 0 0 1.5px rgba(58,78,90,.55), inset 0 2px 4px rgba(0,0,0,.45)',
        cursor: 'pointer',
        pointerEvents: 'auto',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
      },
    };
    if (x.on) {
      /* the hook mp-weaponswap and the button audits point at */
      attrs['data-weapon-chip'] = x.slot;
      attrs['data-weapon-owned'] = view.owned.length;
    }
    return React.createElement('button', attrs, x.src ? React.createElement('img', {
      src: x.src, alt: '', draggable: false, width: a.icon, height: a.icon,
      style: { display: 'block', width: a.icon, height: a.icon, objectFit: 'contain', pointerEvents: 'none' },
    }) : null);
  }));
  var noteEl = noteText ? React.createElement('div', {
    key: 'wpill-note', className: 'bt-wpill-note', role: 'status', 'data-wpill-note': noteText,
    style: {
      position: 'fixed', zIndex: 32, pointerEvents: 'none',
      left: a.left != null ? a.left : 'calc(50% - ' + (a.w / 2) + 'px)', width: a.w, display: 'flex', justifyContent: 'center',
      bottom: 'calc(' + ctlBottom(a.bottomPx) + ' + ' + a.h + 'px + 8px)',
    },
  }, React.createElement('span', { style: {
    padding: '5px 12px', borderRadius: 999, background: 'rgba(13,22,27,.94)', border: '1px solid ' + NOTE_COLOR, color: NOTE_COLOR,
    font: "800 14px/1.1 'Source Sans 3',sans-serif", whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,.45)',
  } }, noteText)) : null;
  return React.createElement(React.Fragment, null, pill, noteEl);
}
