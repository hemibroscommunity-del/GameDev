import React from 'react';
import { jumpAnchor, ctlBottom } from './ShieldButton.jsx';
import { triggerJump } from '@/game/jumpActions.js';
import { jumpAirborne } from '@/game/jump.js';
import { isWheelSwimming } from '@/game/wheelSwim.js';
import { jumpButtonWanted } from '@/game/tapJump.js'; /* v2.3.3105 */
import { Skin, JumpIcon, pressOn, pressOff } from './controlSkin.jsx'; /* v2.3.3018: the owner's mockup */

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
 * in the air.  (v2.3.3018: the owner's mockup's blue arrow on the gold ring,
 * and no word -- see the render below.)  Not drawn while you swim (you cannot
 * jump out of the water -- climb out first) or dead.  A keyboard jumps with X
 * (desktopControls.js), and this button hides with the other touch controls
 * (bt-desktop-hide). */

/* ═══ v2.3.3105: PUT AWAY -- A TAP ON THE RIGHT STICK JUMPS NOW ═══
 * Owner: "Do you think the right virtual joystick tap can be the jump button?
 * I think this would work well instead of the smaller dedicated jump button",
 * then "Try moving jump as tap on right joystick but prioritize other
 * contextual uses for the tap instead of jump first if any apply"
 * (game/tapJump.js, BroTown's rE).  The button is drawn only with `?jumpbtn`
 * in the address; its probe (__btJumpBtn) stays, and says `button`. */

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
      return { shown: !!v && jumpButtonWanted(), button: jumpButtonWanted(), air: !!(v && v.air), count: (s2 && s2._jumpCount) || 0, tapJumps: (s2 && s2._tapJumps) || 0 /* v2.3.3105 */, why: s2 ? s2._jumpWhy || null : null,
        jump: j ? { t0: j.t0, dur: j.dur, peak: j.peak, dx: j.dx, dy: j.dy } : null, landAt: (s2 && s2._jumpLandAt) || 0 };
    };
  }
  var S = stateRef && stateRef.current;
  var view = jumpButtonView(S);
  if (!view || !jumpButtonWanted()) return null;   /* v2.3.3105: ?jumpbtn only */

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
    pressOn(e);   /* v2.3.3018: the sheet's Pressed */
    press();
  };
  var stop = function (e) { e.stopPropagation(); };
  var onTouchEnd = function (e) {
    e.preventDefault(); e.stopPropagation();
    pressOff(e);
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
  /* ═══ v2.3.3018: THE MOCKUP'S JUMP ═══
     The owner's mockup draws this button as a bold blue arrow on a gold-ringed
     button, and no word (controlSkin, as every control): Normal on the ground,
     the sheet's Ready / Charged on the warm face while you are in the air. */
  return React.createElement('div', {
    className: 'bt-desktop-hide bt-jump-btn',
    'data-jump': air ? 'air' : 'ground',
    'data-uisfx': 'off',   /* the menu click is not this control's sound */
    role: 'button',
    'aria-label': 'Jump',
    onTouchStart: onTouchStart,
    onTouchMove: stop,
    onTouchEnd: onTouchEnd,
    onTouchCancel: function (e) { e.stopPropagation(); pressOff(e); },
    onMouseDown: function (e) { pressOn(e); onMouseDown(e); },
    onMouseUp: function (e) { e.preventDefault(); e.stopPropagation(); pressOff(e); },
    onMouseLeave: pressOff,
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
  React.createElement(Skin, { size: size, tone: air ? 'warm' : 'slate', state: air ? 'on' : 'normal' },
    React.createElement(JumpIcon, { size: Math.round(size * 0.62) })));
}
