import React from 'react';
import { jumpAnchor, ctlBottom } from './ShieldButton.jsx';
import { triggerJump } from '@/game/jumpActions.js';
import { jumpAirborne } from '@/game/jump.js';
import { isWheelSwimming } from '@/game/wheelSwim.js';

/* ═══ v2.3.3017: THE JUMP BUTTON, BENEATH THE ATTACK DISC ═══
 *
 * Owner, 2026-10-03: "start working on real jumping", the button "beneath
 * the right joystick" (jumpAnchor in ShieldButton.jsx says where and why).
 * game/jump.js has the rules, game/jumpActions.js takes off; this file only
 * draws the button and presses it.
 *
 * IT JUMPS ON THE PRESS, not the release: a jump is a reflex, and the sprint
 * button's tap test (a release near the press, in time) would put a tenth of
 * a second and a lifted thumb between wanting it and getting it.  Holding it
 * does nothing more; another press jumps again once you have landed.
 *
 * IT MUST SWALLOW ITS OWN TOUCHES.  It lies on [data-joyzone="R"], where a
 * touch begins an attack, an aim or a flick: every touch event is stopped
 * here, so a jump never swings.
 *
 * WHAT IT SHOWS: an arrow up and the word JUMP, the Lantern Slate rest look
 * (slate, brass rim) of the sprint and shield buttons, lit warm while you are
 * in the air.  Not drawn while you swim (you cannot jump out of the water --
 * climb out first) or dead.  A keyboard jumps with X (desktopControls.js),
 * and this button hides with the other touch controls (bt-desktop-hide). */

/* How often the view is read (re-rendered only when it changes). */
const POLL_MS = 80;
/* A touch's mouse echo arrives within this of its touchend; not a press. */
const GHOST_MS = 700;

/** What the button draws, as plain data (and its re-render key), or null
    when it is not drawn. */
export function jumpButtonView(S) {
  if (!S || !S.rpg || !S.player) return null;
  var R = S.rpg;
  if (typeof R.hp === 'number' && R.hp <= 0) return null;
  if (isWheelSwimming(S)) return null;
  var air = jumpAirborne(S, Date.now());
  return { air: air, key: air ? 'air' : 'ground' };
}

export function JumpButton(props) {
  var stateRef = props.stateRef;
  var isLandscape = props.isLandscape;
  var _t = React.useState(0);
  var setTick = _t[1];
  var keyRef = React.useRef('');
  var lastTouchEndRef = React.useRef(0);

  React.useEffect(function () {
    var id = setInterval(function () {
      var v = jumpButtonView(stateRef && stateRef.current);
      var k = v ? v.key : '';
      if (k !== keyRef.current) {
        keyRef.current = k;
        setTick(function (x) { return (x + 1) % 1000000; });
      }
    }, POLL_MS);
    return function () { clearInterval(id); };
  }, [stateRef]);

  /* QA probe (house style: __btSprintBtn): what the button and the jump
     think, which a screenshot cannot say. */
  if (typeof window !== 'undefined') {
    window.__btJumpBtn = function () {
      var s2 = stateRef && stateRef.current;
      var v = jumpButtonView(s2);
      var j = s2 && s2._jump;
      return { shown: !!v, air: !!(v && v.air), count: (s2 && s2._jumpCount) || 0, why: s2 ? s2._jumpWhy || null : null,
        jump: j ? { t0: j.t0, dur: j.dur, peak: j.peak, dx: j.dx, dy: j.dy } : null, landAt: (s2 && s2._jumpLandAt) || 0 };
    };
  }
  var S = stateRef && stateRef.current;
  var view = jumpButtonView(S);
  if (!view) return null;

  var anchor = jumpAnchor(isLandscape);
  var size = anchor.size;

  var press = function () {
    var s = stateRef && stateRef.current;
    if (!s) return;
    triggerJump(s);
    keyRef.current = '';
    setTick(function (x) { return (x + 1) % 1000000; });
  };
  var onTouchStart = function (e) {
    e.preventDefault(); e.stopPropagation();
    press();
  };
  var stop = function (e) { e.stopPropagation(); };
  var onTouchEnd = function (e) {
    e.preventDefault(); e.stopPropagation();
    lastTouchEndRef.current = Date.now();
  };
  /* A mouse (a touch laptop, a desktop browser in a phone-sized window): a
     press is a press, but not the echo of a touch that already was one. */
  var onMouseDown = function (e) {
    e.preventDefault(); e.stopPropagation();
    if (Date.now() - lastTouchEndRef.current < GHOST_MS) return;
    press();
  };

  var air = view.air;
  var arrow = Math.round(size * 0.36);
  var font = size >= 52 ? 9.5 : 8.5;   /* the sprint button's measured sizes */
  return React.createElement('div', {
    className: 'bt-desktop-hide bt-jump-btn',
    'data-jump': air ? 'air' : 'ground',
    'data-uisfx': 'off',   /* the menu click is not this control's sound */
    role: 'button',
    'aria-label': 'Jump',
    onTouchStart: onTouchStart,
    onTouchMove: stop,
    onTouchEnd: onTouchEnd,
    onTouchCancel: stop,
    onMouseDown: onMouseDown,
    onMouseUp: function (e) { e.preventDefault(); e.stopPropagation(); },
    onContextMenu: function (e) { e.preventDefault(); },
    style: {
      position: 'fixed',
      right: anchor.right,
      bottom: ctlBottom(anchor.bottomPx),
      width: size, height: size,
      zIndex: 31,
      touchAction: 'none',
      WebkitTapHighlightColor: 'transparent',
      WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
    },
  },
  React.createElement('div', {
    style: {
      position: 'absolute', inset: 0, borderRadius: '50%',
      /* Lantern Slate: raised slate at rest, the warm fill in the air; the
         brass rim either way.  No filter (the iOS grain over the canvas,
         CLAUDE.md). */
      background: air
        ? 'radial-gradient(circle, #6B5326 0%, #3A2C13 100%)'
        : 'radial-gradient(circle, #34444B 0%, #202C32 100%)',
      border: '2px solid ' + (air ? '#F0C878' : '#D8A85F'),
      boxSizing: 'border-box',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)',
      pointerEvents: 'none',
    },
  }),
  /* an arrow up, drawn (nothing to load) */
  React.createElement('svg', {
    viewBox: '0 0 24 24', width: arrow, height: arrow,
    style: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -88%)', pointerEvents: 'none' },
  },
  React.createElement('path', {
    d: 'M12 3 L21 13 L15.5 13 L15.5 21 L8.5 21 L8.5 13 L3 13 Z',
    fill: air ? '#F7F2E7' : '#E9DFC8', stroke: '#0b161b', strokeWidth: 1.4, strokeLinejoin: 'round',
  })),
  React.createElement('span', {
    'data-jump-label': '1',
    style: {
      position: 'absolute', left: '50%', top: '50%',
      transform: 'translate(-50%, ' + Math.round(size * 0.08) + 'px)',
      fontSize: font, fontWeight: 800, letterSpacing: '0.02em', lineHeight: 1,
      whiteSpace: 'nowrap',
      color: air ? '#F7F2E7' : '#B9C1BF', pointerEvents: 'none',
    },
  }, 'JUMP'));
}
