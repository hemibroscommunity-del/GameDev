import React from 'react';
import { jumpAnchor, ctlBottom, discRight, RBTN } from './ShieldButton.jsx';
import { triggerJump } from '@/game/jumpActions.js';
import { jumpAirborne } from '@/game/jump.js';
import { isWheelSwimming } from '@/game/wheelSwim.js';
import { jumpButtonWanted } from '@/game/tapJump.js'; /* v2.3.3105 */
import { Skin, JumpGlyph, jumpGlyphKind, pressOn, pressOff } from './controlSkin.jsx'; /* v2.3.3018: the owner's mockup; v2.3.3721: a plain jump mark */

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

/* ═══ v2.3.3681: BACK, FOR EVERYONE ═══
 * The owner, 2026-10-27: "Also while I'm thinking of it: I want a dedicated
 * button for jumping".  Drawn where v2.3.3017 put it, centred under the attack
 * disc (jumpAnchor; combatBandTopPx has counted its slot all along), unless
 * the address says `?jumpbtn=0`.  A tap on the stick still jumps as well, when
 * it has no other job.
 * v2.3.3712: no longer -- this button (and X) is the only jump; a free tap on
 * the stick attacks once (game/tapJump.js requestTapAttack). */

/* How often the view is read (re-rendered only when it changes). */
const POLL_MS = 80;
/* A touch's mouse echo arrives within this of its touchend; not a press. */
const GHOST_MS = 700;
/* v2.3.3799: the doors' button over Jump's top, upright: 8 px of air and
   the 3 px its pulse swells by (promptPulse, scale 1.04) */
const JUMP_PROMPT_AIR = 12;
/* ...and its right edge this far left of the disc's */
const DISC_PROMPT_AIR = 8;

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

  /* ═══ v2.3.3799: THE DOORS' BUTTON STANDS ABOVE JUMP ═══
     Jump went south-west of the disc on its ring (jumpAnchor), into the strip
     just over the band where the doors' "Enter" button (.bt-interact-prompt,
     +24) stands.  While Jump is drawn upright on a touch screen, the page
     says how high its top is (--bt-jump-clear: its top and the air) and where
     the disc begins (--bt-disc-clear, from the screen's right), and game.css
     stands the prompts with no place of their own over Jump, left of the
     disc.  On a 320 or 360 px phone that is over the resting picture of the
     left stick (a stick that starts under the thumb anywhere in its half:
     v2.3.816's floating model).  Sideways, and on a computer (no Jump
     button), nothing changes. */
  React.useEffect(function () {
    var root = typeof document !== 'undefined' && document.documentElement;
    if (!root) return undefined;
    var fine = typeof matchMedia === 'function' && matchMedia('(pointer:fine)').matches;
    var on = !isLandscape && !fine && !!jumpButtonView(stateRef && stateRef.current) && jumpButtonWanted();
    if (!on) { root.removeAttribute('data-jump-clear'); return undefined; }
    var a = jumpAnchor(false);
    root.style.setProperty('--bt-jump-clear', (a.bottomPx + a.size + JUMP_PROMPT_AIR) + 'px');
    root.style.setProperty('--bt-disc-clear', (discRight(false) + RBTN.w + DISC_PROMPT_AIR) + 'px');
    root.setAttribute('data-jump-clear', '1');
    return function () { root.removeAttribute('data-jump-clear'); };
  });

  /* QA probe (house style: __btSprintBtn): what the button and the jump
     think, which a screenshot cannot say. */
  if (typeof window !== 'undefined') {
    window.__btJumpBtn = function () {
      var s2 = stateRef && stateRef.current;
      var v = jumpButtonView(s2);
      var j = s2 && s2._jump;
      return { shown: !!v && jumpButtonWanted(), button: jumpButtonWanted(), air: !!(v && v.air), count: (s2 && s2._jumpCount) || 0, tapAttacks: (s2 && s2._tapAttacks) || 0 /* v2.3.3712: was tapJumps (v2.3.3105), the stick's taps that jumped */, why: s2 ? s2._jumpWhy || null : null,
        jump: j ? { t0: j.t0, dur: j.dur, peak: j.peak, dx: j.dx, dy: j.dy } : null, landAt: (s2 && s2._jumpLandAt) || 0 };
    };
  }
  var S = stateRef && stateRef.current;
  var view = jumpButtonView(S);
  if (!view || !jumpButtonWanted()) return null;   /* v2.3.3105: ?jumpbtn only; v2.3.3681: unless ?jumpbtn=0 */

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
  /* v2.3.3721: no longer the mockup's blue arrow: the Lantern Slate rest look
     of Sprint and Block (slate face, gold ring) with a plain jump mark, lit
     warm in the air as before */
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
      /* v2.3.3799: touched by its circle, not its box: on the ring south-west
         of the disc, the box's corner reached into the disc's circle, and a
         touch there jumped (a browser takes a touch by the rounded shape) */
      borderRadius: '50%',
      zIndex: 31,
      touchAction: 'none',
      WebkitTapHighlightColor: 'transparent',
      WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
    },
  },
  React.createElement(Skin, { size: size, tone: air ? 'warm' : 'slate', state: air ? 'on' : 'normal' },
    /* v2.3.3526: the owner's round jump (card 11), the button's face.
       v2.3.3721: a plain arrow over the ground instead (the owner's pick of
       four: "I like option B for jump better") -- the owner: "the
       icon now for jump looks like a special ability" (controlSkin JumpGlyph) */
    React.createElement(JumpGlyph, { size: Math.round(size * 0.68), kind: jumpGlyphKind() })));
}
