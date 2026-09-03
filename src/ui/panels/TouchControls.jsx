import React from 'react';
import { RBTN } from './ShieldButton.jsx';

/* === TouchControls — the left joystick + the contextual right BUTTON === */
/* v2.3.890: extracted verbatim from the floating-joystick sibling run
   in BroTown.jsx.  Render-only: the DOM refs are the SAME ref objects
   BroTown's touch effects bind to, passed through as props. */
/* ═══ v2.3.2229: THE RIGHT STICK IS A BUTTON ═══
   Owner: "The right thumbstick no longer acts as independent rotation
   angle. It becomes a slightly larger contextual button. ... The contextual
   button will say 'attack' on it."

   What went: the rod + knob sprites and the deflection math that fed them
   (handleRJoyMove), the shield-preview overlay the first tap of the old
   double-tap showed, and the legacy hidden shield joystick element
   (shieldJoyRef) that BroTown's dead sS/sM/sE handlers were bound to.

   What stayed, on purpose:
   - the class names (.bt-rjoy-zone / .bt-rjoy-base): the coach marks, the
     controls tutorial, the expanded-sheet dim rule in game.css and the QA
     rect probes all anchor on them, and nothing about "where the attack
     control is" changed;
   - the position (right:50, bottom: sheet-h + 70): SpecialChargePie and
     ElementBurstButton measure themselves off it -- they read the width
     from RBTN now instead of a hardcoded 83/98;
   - the base sprite (metal ring + centre well), which reads as a button
     just as well as it read as a stick socket;
   - the special-charge cooldown ring drawn inside the disc.

   THE DISC IS THE TOUCH TARGET NOW.  Since v2.3.816 the disc was visuals
   only (pointerEvents:none) and the whole right half of the screen
   (rZoneRef) was the input.  A button that fires from anywhere on half the
   screen is not a button, so the disc takes pointer events itself and
   BroTown binds the press/hold/flick handlers to rJoyRef.  rZoneRef keeps
   one job -- forwarding a plain tap to the canvas (lock a monster by
   tapping it, tap yourself to chat, tap a resource) -- and no longer aims
   or attacks.

   The label is the "contextual" half: BroTown stamps rLabelRef's text
   (ATTACK today; HARVEST arrives with the life-skill PR). */
export function TouchControls(props) {
  var stateRef = props.stateRef,
    lZoneRef = props.lZoneRef,
    rZoneRef = props.rZoneRef,
    joystickRef = props.joystickRef,
    lStickRef = props.lStickRef,
    knobRef = props.knobRef,
    lJoyPreviewRef = props.lJoyPreviewRef,
    rJoyRef = props.rJoyRef,
    rLabelRef = props.rLabelRef,
    isLandscape = props.isLandscape;
  var _stateRef$current65;
  var discW = isLandscape ? RBTN.wLand : RBTN.w;
  return /*#__PURE__*/React.createElement(React.Fragment, null, React.createElement("div", {
    ref: lZoneRef,
    className: "bt-desktop-hide",
    'data-joyzone': 'L',
    style: { position: 'fixed', left: 0, top: 0, width: '50%', height: 'calc(100% - var(--sheet-h, var(--dash-h)))' /* v2.3.1307: zones end above the OPEN sheet so movement works with menus open */, zIndex: 6, touchAction: 'none', background: 'transparent', WebkitUserSelect: 'none', userSelect: 'none' }
  }), /*#__PURE__*/React.createElement("div", {
    ref: rZoneRef,
    className: "bt-desktop-hide",
    'data-joyzone': 'R',
    style: { position: 'fixed', right: 0, top: 0, width: '50%', height: 'calc(100% - var(--sheet-h, var(--dash-h)))' /* v2.3.1307: zones end above the OPEN sheet so movement works with menus open */, zIndex: 6, touchAction: 'none', background: 'transparent', WebkitUserSelect: 'none', userSelect: 'none' }
  }), /* duplicate kb-hints removed — kept the one near joystick zone below */ /*#__PURE__*/React.createElement("div", {
    className: "bt-joystick-zone",
    style: {
      position: 'fixed',
      bottom: 'calc(var(--sheet-h, var(--dash-h)) + 70px)', /* v2.3.1307: disc rides above the open sheet */
      left: isLandscape ? 16 : 12,
      zIndex: 30,
      /* v2.3.816: visuals only -- touches are handled by lZoneRef beneath,
         so this corner box must not intercept them. */
      pointerEvents: 'none',
      /* v2.3.1233b: audit fix — the §10 ladder was stacked here as
         container opacity 0.62, which MULTIPLIED with the sprites' own
         0.5 base (and BroTown's 0.85 drag re-stamp) for a 31% effective
         rest opacity. Removed; the ladder lives in BroTown's handlers
         (rest .5, ENGAGED .92 stamped by the move handlers). */
            width: isLandscape ? 98 : 83,
      height: isLandscape ? 98 : 83
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bt-joystick-base",
    ref: joystickRef,
    style: {
      width: isLandscape ? 90 : 75,
      height: isLandscape ? 90 : 75,
      /* v2.3.949: DOCKED -- position:absolute centres the base inside its
         left-corner zone container (always visible at 50% opacity).  It no
         longer follows the finger; the knob deflects as a relative drag from
         the touch origin (see handleJoystickMove). */
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      opacity: 0.5,
      pointerEvents: 'none',
      transition: 'opacity 0.12s ease',
      /* v2.3.99: sprite-backed base.  Overrides the rgba bg + border in
         game.css with the metal-ring + center-hole art the user uploaded.
         No overflow:hidden -- the stick + knob layer on top and don't
         need clipping, the sprite art handles its own rim. */
      backgroundImage: 'url(/sprites/joystick/base.webp?v=2.3.102)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      /* v2.3.1236: drop-shadow filter REMOVED (here + the siblings
         below).  A CSS drop-shadow/filter on a DOM overlay compositing over
         the WebGL canvas produces grainy "static" on iOS -- the documented
         next suspect in CLAUDE.md's charge-pie history, and the same fix
         SpecialChargePie itself got in v2.3.948. */
    }
  }, /*#__PURE__*/React.createElement("div", {
    /* Analog "stick" — anchored at joystick centre, grows toward the
       knob when dragged.  transform-origin at left-centre so rotation
       pivots at the disc centre; width set dynamically by
       handleJoystickMove.  v2.3.100: sprite height bumped 14 -> 22
       so the rod reads thicker relative to the outer ring (user
       request: "knob + rod much larger relative to the outer ring"). */
    ref: lStickRef,
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: 0,
      height: 33,
      marginTop: -16,
      transformOrigin: '0% 50%',
      transform: 'rotate(0rad)',
      backgroundImage: 'url(/sprites/joystick/stick.webp?v=2.3.102)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      opacity: 0,
      pointerEvents: 'none',
      zIndex: 0,
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "bt-joystick-knob",
    ref: knobRef,
    style: {
      zIndex: 1,
      /* v2.3.100: sprite-backed knob.  Size override below + the
         CSS .bt-joystick-knob 24->44 px bump in game.css makes the
         knob much larger relative to the outer ring (user request). */
      width: isLandscape ? 48 : 42,
      height: isLandscape ? 48 : 42,
      backgroundImage: 'url(/sprites/joystick/knob.webp?v=2.3.102)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    }
  }), /*#__PURE__*/React.createElement("div", {
    /* Left-joystick weapon-swap preview overlay (v2.3.97).  Hidden by
       default; shown for PREVIEW_HOLD_MS ms after a single tap so the
       player can confirm the NEXT slot before committing to the
       second tap.  The lE handler stamps a slot label via
       innerText. */
    ref: lJoyPreviewRef,
    style: {
      position: 'absolute',
      inset: 0,
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 2,
      fontSize: isLandscape ? 18 : 16,
      fontWeight: 800,
      color: 'rgba(255,235,160,0.95)',
      textShadow: '0 1px 3px rgba(0,0,0,0.7), 0 0 6px rgba(255,200,80,0.5)',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }
  }))), /*#__PURE__*/React.createElement("div", {
    /* v2.3.1288: bt-rjoy-zone names the right disc's corner container so
       the expanded-sheet dim (game.css, nav-system PR B) can reach it —
       the left disc already had .bt-joystick-zone. */
    className: "bt-desktop-hide bt-rjoy-zone",
    style: {
      position: 'fixed',
      bottom: 'calc(var(--sheet-h, var(--dash-h)) + ' + RBTN.bottom + 'px)', /* v2.3.1307: disc rides above the open sheet */
      right: RBTN.right,
      zIndex: 30,
      /* v2.3.2229: the container is still pass-through; the DISC inside it
         is the touch target (see rJoyRef below). */
      pointerEvents: 'none',
      width: discW,
      height: discW
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: rJoyRef,
    className: "bt-rjoy-base",
    'data-rbutton': '1',
    style: {
      /* v2.3.2229: "slightly larger" -- 75/90 -> 96/108, and it now fills
         its container rather than sitting inside a slightly bigger zone
         box, because the zone box is no longer where touches land. */
      width: discW,
      height: discW,
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      opacity: 0.5,
      /* v2.3.1236: mirrors the LEFT base's idle treatment (faint 0.5 rest,
         0.92 while a finger is down, same 0.12s opacity transition — the
         ladder is stamped by BroTown's press/release handlers). */
      pointerEvents: 'auto',
      touchAction: 'none',
      transition: 'opacity 0.12s ease',
      backgroundImage: 'url(/sprites/joystick/base.webp?v=2.3.102)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      WebkitUserSelect: 'none',
      userSelect: 'none',
      WebkitTouchCallout: 'none',
    }
  }, /*#__PURE__*/React.createElement("svg", {
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      transform: 'rotate(-90deg)',
      pointerEvents: 'none',
      zIndex: 1
    }
  }, function (_stateRef$current65) {
    var lastSwipe = ((_stateRef$current65 = stateRef.current) === null || _stateRef$current65 === void 0 ? void 0 : _stateRef$current65._lastSwipe) || 0;
    var cd = 1500;
    var elapsed = Date.now() - lastSwipe;
    var pct = Math.min(1, elapsed / cd);
    if (pct < 1) return React.createElement('circle', {
      cx: '50%',
      cy: '50%',
      r: '28%',
      fill: 'none',
      stroke: pct > 0.8 ? 'rgba(180,255,180,.3)' : 'rgba(255,255,255,.15)',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeDasharray: "".concat(Math.PI * 2 * 28 / 100 * pct * 100, " 999")
    });
    return null;
  }()), /*#__PURE__*/React.createElement("div", {
    /* v2.3.2229: THE LABEL.  Centred in the well; BroTown's loop stamps
       the text so it can change with context without a React render.
       Lantern Slate caption type: 10/700 uppercase, warm-white on the
       dark well, one text-shadow so it holds up over the metal ring. */
    ref: rLabelRef,
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 2,
      fontSize: isLandscape ? 12 : 11,
      fontWeight: 700,
      color: '#F7F2E7',
      textShadow: '0 1px 2px rgba(0,0,0,.85)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }
  }, 'Attack'))));
}
