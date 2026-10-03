import React from 'react';
import { sprintAnchor, ctlBottom } from './ShieldButton.jsx';
import { sprintSupported, sprintArmed, isSprinting, toggleSprint, SPRINT_MIN_START } from '@/game/sprint.js';
import { isWheelSwimming } from '@/game/wheelSwim.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';

/* ═══ v2.3.3006: THE SPRINT BUTTON, RIGHT OF THE MOVEMENT STICK ═══
 *
 * Owner, 2026-10-03: "Also adding a sprint button by the left joystick that
 * drains down stamina but makes you run about 33% faster until it drains out.
 * Maybe just to the right of the left joystick".
 *
 * A TAP turns it on; you then run at SPRINT_MULT of your walk while you move,
 * spending stamina, until the bar is empty, you tap it again, you stand still,
 * or you raise the shield, attack or go into the water (game/sprint.js has the
 * rules, server/src/sprint.js the bill).  This file only draws and turns it
 * on and off.
 *
 * WHERE: sprintAnchor (ShieldButton.jsx), level with the disc's centre and
 * LCTL_GAP right of it -- in the one patch beside the disc nothing else uses.
 *
 * WHAT IT SHOWS:
 *   - the winged boot (the game's own "move speed" picture, unused until now)
 *     and the word SPRINT under it, small, inside the rim;
 *   - a RIM that is the stamina you have: lit round the edge for what is
 *     left, dark for what is spent, running down as you sprint -- the
 *     owner's "until it drains out", on the button your thumb just left;
 *   - lit (warm fill, light brass rim) while it is on, the Lantern Slate rest
 *     look (slate, brass rim) while it is off -- the shield button's two
 *     looks, so the left side reads like the right;
 *   - faded under SPRINT_MIN_START stamina, when a tap would be refused.  A
 *     refused tap shakes the button and says "Not enough energy!" over your
 *     head, the abilities' own words: a control that silently does nothing
 *     reads as broken.
 * It is not drawn at all against a worker without caps.sprint (an old worker
 * would snap every sprint back), while you swim (no sprinting in the water,
 * like the special and shield buttons), or dead.
 *
 * IT MUST SWALLOW ITS OWN TOUCHES.  It sits on [data-joyzone="L"] (z6), where
 * a touchstart begins a walk and a quick release dodges.  Every touch event
 * is stopped here, and it toggles on a real TAP -- a release near where it
 * began, soon enough -- so a thumb that lands on it while starting to walk
 * does not switch the sprint.  The weapon button under the stick works the
 * same way (WeaponSwapButton.jsx).
 *
 * On a keyboard, Shift is the sprint (held, not tapped: BroTown passes it to
 * updateSprint), and this button is hidden with the other touch controls
 * (bt-desktop-hide). */
const ICON = '/icons/ui/hero/move-speed.webp?v=2.3.3006';

/* A tap is a release within this far of the press, inside this long -- the
   weapon button's numbers; nothing else listens to this patch. */
const TAP_SLOP_PX = 14;
const TAP_MAX_MS = 600;
/* How often the view is read.  It re-renders only when what is drawn changes
   (the ring in whole stamina points), so a sprint costs ~11 renders a second
   and standing still costs none. */
const POLL_MS = 100;
/* A touch's mouse echo arrives within this of its touchend; it is not a
   second tap. */
const GHOST_MS = 700;

export const SPRINT_TIRED_NOTE = 'Not enough energy!';   /* abilities.js's own words */
const SPRINT_TIRED_COLOR = '#F2C14E';

/** What the button draws, as plain data (and the key it re-renders on), or
    null when it is not drawn. */
export function sprintButtonView(S) {
  if (!S || !S.rpg) return null;
  if (!sprintSupported(S)) return null;
  var R = S.rpg;
  if (typeof R.hp === 'number' && R.hp <= 0) return null;
  if (isWheelSwimming(S)) return null;
  var max = R.maxStamina > 0 ? R.maxStamina : 100;
  var st = typeof R.stamina === 'number' ? Math.max(0, Math.min(max, R.stamina)) : 0;
  var on = sprintArmed(S);
  var running = isSprinting(S);
  var tired = !on && st < SPRINT_MIN_START;
  var pts = Math.round(st);
  return {
    on: on,
    running: running,
    tired: tired,
    frac: st / max,
    key: (on ? 1 : 0) + '|' + (running ? 1 : 0) + '|' + (tired ? 1 : 0) + '|' + pts + '|' + max,
  };
}

function fmt(n) { return (Math.round(n * 100) / 100).toFixed(2); }

export function SprintButton(props) {
  var stateRef = props.stateRef;
  var isLandscape = props.isLandscape;
  var _t = React.useState(0);
  var setTick = _t[1];
  /* re-keys the face so the shake restarts on every refused tap */
  var _n = React.useState(0);
  var nope = _n[0], setNope = _n[1];
  var keyRef = React.useRef('');
  var touchRef = React.useRef(null);
  var lastTouchEndRef = React.useRef(0);
  var mouseDownRef = React.useRef(false);

  React.useEffect(function () {
    /* the picture is in the cache before the button first shows */
    try { var im = new Image(); im.src = ICON; } catch (e) { /* no DOM */ }
    var id = setInterval(function () {
      var v = sprintButtonView(stateRef && stateRef.current);
      var k = v ? v.key : '';
      if (k !== keyRef.current) {
        keyRef.current = k;
        setTick(function (x) { return (x + 1) % 1000000; });
      }
    }, POLL_MS);
    return function () { clearInterval(id); };
  }, [stateRef]);

  var S = stateRef && stateRef.current;
  /* QA probe (house style: __btShieldBtn): what the button thinks, which a
     screenshot cannot say. */
  if (typeof window !== 'undefined') {
    window.__btSprintBtn = function () {
      var s2 = stateRef && stateRef.current;
      var v = sprintButtonView(s2);
      var sp = s2 && s2._sprint;
      return { shown: !!v, view: v, supported: sprintSupported(s2), armed: sprintArmed(s2), running: isSprinting(s2),
        how: sp ? sp.how : null, why: sp ? sp.why : null, n: sp ? sp.n : 0,
        stamina: s2 && s2.rpg ? s2.rpg.stamina : null };
    };
  }
  var view = sprintButtonView(S);
  if (!view) return null;

  var anchor = sprintAnchor(isLandscape);
  var size = anchor.size;

  var tap = function () {
    var s = stateRef && stateRef.current;
    if (!s) return;
    var now = Date.now();
    var ok = toggleSprint(s, now);
    if (!ok && s._sprint && s._sprint.why === 'tired' && s._sprint.refusedAt === now) {
      if (s.player) pushDmgPopup(s, s.player.x, s.player.y - 30, SPRINT_TIRED_NOTE, SPRINT_TIRED_COLOR, { ts: now });
      setNope(function (x) { return x + 1; });
    }
    keyRef.current = '';
    setTick(function (x) { return (x + 1) % 1000000; });
  };
  var onTouchStart = function (e) {
    e.preventDefault(); e.stopPropagation();
    var t = e.changedTouches && e.changedTouches[0];
    touchRef.current = t ? { x: t.clientX, y: t.clientY, at: Date.now(), id: t.identifier } : null;
  };
  var onTouchMove = function (e) { e.stopPropagation(); };
  var onTouchEnd = function (e) {
    e.preventDefault(); e.stopPropagation();
    lastTouchEndRef.current = Date.now();
    var st = touchRef.current;
    touchRef.current = null;
    if (!st) return;
    var t = null;
    var list = e.changedTouches || [];
    for (var i = 0; i < list.length; i++) if (list[i].identifier === st.id) t = list[i];
    if (!t) return;
    var dx = t.clientX - st.x, dy = t.clientY - st.y;
    if (dx * dx + dy * dy <= TAP_SLOP_PX * TAP_SLOP_PX && Date.now() - st.at <= TAP_MAX_MS) tap();
  };
  var onTouchCancel = function (e) { e.stopPropagation(); touchRef.current = null; };
  /* A mouse (a touch laptop, a desktop browser in a phone-sized window): a
     click is a tap, but not the echo of a touch that was already one. */
  var onMouseDown = function (e) { e.preventDefault(); e.stopPropagation(); mouseDownRef.current = true; };
  var onMouseUp = function (e) {
    e.preventDefault(); e.stopPropagation();
    var pressed = mouseDownRef.current;
    mouseDownRef.current = false;
    /* pressed here, and not a touch's echo */
    if (!pressed || Date.now() - lastTouchEndRef.current < GHOST_MS) return;
    tap();
  };

  var on = view.on;
  /* THE RIM IS THE STAMINA.  A 3px ring round the edge, lit for the stamina
     you have and dark for what is spent, takes the place of the brass border
     the shield button has: the owner's "until it drains out", drawn as the
     button's own edge running down.  (A ring INSIDE a border, the first cut,
     ate the ends of the word: measured at 390, "SPRINT" lost its S and T.) */
  var RIM = 3;
  var r = (size - RIM) / 2;
  var circ = 2 * Math.PI * r;
  var lit = Math.max(0, Math.min(1, view.frac));
  /* the icon above the middle and the word just below it, both inside the
     rim at the height they sit (mp-sprint measures the word's corners) */
  var icon = Math.round(size * 0.46);
  var font = size >= 52 ? 9.5 : 8.5;   /* measured: 9 px bold was 37 px wide, half a px past the rim at 48 */

  return React.createElement('div', {
    className: 'bt-desktop-hide bt-sprint-btn',
    'data-sprint': on ? (view.running ? 'running' : 'on') : (view.tired ? 'tired' : 'off'),
    'data-uisfx': 'off',   /* the menu click is not this control's sound */
    role: 'button',
    'aria-label': on ? 'Sprint on' : 'Sprint',
    'aria-pressed': on ? 'true' : 'false',
    onTouchStart: onTouchStart,
    onTouchMove: onTouchMove,
    onTouchEnd: onTouchEnd,
    onTouchCancel: onTouchCancel,
    onMouseDown: onMouseDown,
    onMouseUp: onMouseUp,
    onContextMenu: function (e) { e.preventDefault(); },
    style: {
      position: 'fixed',
      left: anchor.leftPx,
      bottom: ctlBottom(anchor.bottomPx),
      width: size, height: size,
      zIndex: 31,
      touchAction: 'none',
      WebkitTapHighlightColor: 'transparent',
      WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
    },
  },
  React.createElement('div', {
    key: 'face' + nope,
    className: nope ? 'bt-sprint-nope' : undefined,
    style: {
      position: 'absolute', inset: 0, borderRadius: '50%',
      /* Lantern Slate, the shield button's two looks: raised slate at rest;
         the warm fill when ON.  No filter at any time (the iOS grain over
         the canvas, CLAUDE.md). */
      background: on
        ? 'radial-gradient(circle, #6B5326 0%, #3A2C13 100%)'
        : 'radial-gradient(circle, #34444B 0%, #202C32 100%)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)',
      opacity: view.tired ? 0.45 : 1,
      transition: 'opacity 120ms linear',
      pointerEvents: 'none',
    },
  },
  /* The rim.  The charge pie's dasharray idiom, fixed-point formatted -- a
     tiny fraction in exponent notation (9.4e-7) is an invalid dasharray,
     which falls back to a SOLID stroke (the v2.3.10 incident). */
  React.createElement('svg', {
    viewBox: '0 0 ' + size + ' ' + size, width: size, height: size,
    style: { position: 'absolute', left: 0, top: 0, pointerEvents: 'none' },
  },
  React.createElement('circle', {
    cx: size / 2, cy: size / 2, r: r, fill: 'none',
    stroke: on ? 'rgba(58,44,19,.95)' : 'rgba(238,242,235,.14)', strokeWidth: RIM,
  }),
  lit > 0.001 ? React.createElement('circle', {
    'data-rim': fmt(lit),
    cx: size / 2, cy: size / 2, r: r, fill: 'none',
    stroke: on ? '#F0C878' : '#D8A85F', strokeWidth: RIM,
    strokeLinecap: 'butt',
    strokeDasharray: fmt(lit * circ) + ' ' + fmt(circ),
    transform: 'rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')',
  }) : null),
  React.createElement('img', {
    src: ICON, alt: '', draggable: false,
    style: {
      position: 'absolute', left: '50%', top: '50%',
      width: icon, height: icon,
      transform: 'translate(-50%, -80%)',
      imageRendering: 'pixelated', pointerEvents: 'none',
      opacity: on ? 1 : 0.85,
    },
  }),
  React.createElement('span', {
    'data-sprint-label': '1',
    style: {
      position: 'absolute', left: '50%', top: '50%',
      transform: 'translate(-50%, ' + Math.round(size * 0.04) + 'px)',
      fontSize: font, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1,
      whiteSpace: 'nowrap',
      color: on ? '#F7F2E7' : '#B9C1BF', pointerEvents: 'none',
    },
  }, 'SPRINT')));
}
