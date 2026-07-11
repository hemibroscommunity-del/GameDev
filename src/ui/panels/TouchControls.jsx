import React from 'react';

/* === TouchControls — the floating dual-joystick touch overlay === */
/* v2.3.890: extracted verbatim from the floating-joystick sibling run
   in BroTown.jsx (left movement zone, right aim/combat zone, the two
   joystick base+knob+preview stacks, and the legacy hidden shield
   button). Render-only and behavior-frozen: the JSX (and its embedded
   auto-attack-indicator / shield IIFEs) is unchanged; the DOM refs are
   the SAME ref objects BroTown's dual-joystick touch effects bind to,
   passed through as props (refs are stable, so the effects keep
   working). The five elements were a contiguous tail of children of
   their parent container; they are now wrapped in a Fragment and the
   parent's closing tag + the rest of the tree stay in BroTown. 15
   props: stateRef, the 11 joystick/zone/knob/preview/shield refs, and
   the autoAttack / isLandscape / shieldUp render flags. 3 hoisted
   stateRef.current optional-chaining temps declared locally. */
export function TouchControls(props) {
  var stateRef = props.stateRef,
    lZoneRef = props.lZoneRef,
    rZoneRef = props.rZoneRef,
    joystickRef = props.joystickRef,
    lStickRef = props.lStickRef,
    knobRef = props.knobRef,
    lJoyPreviewRef = props.lJoyPreviewRef,
    rJoyRef = props.rJoyRef,
    rStickRef = props.rStickRef,
    rKnobRef = props.rKnobRef,
    rJoyPreviewRef = props.rJoyPreviewRef,
    shieldJoyRef = props.shieldJoyRef,
    autoAttack = props.autoAttack,
    isLandscape = props.isLandscape,
    shieldUp = props.shieldUp;
  var _stateRef$current65, _stateRef$current69, _stateRef$current70;
  return /*#__PURE__*/React.createElement(React.Fragment, null, React.createElement("div", {
    ref: lZoneRef,
    className: "bt-desktop-hide",
    'data-joyzone': 'L',
    style: { position: 'fixed', left: 0, top: 0, width: '50%', height: 'calc(100% - var(--dash-h))', zIndex: 6, touchAction: 'none', background: 'transparent', WebkitUserSelect: 'none', userSelect: 'none' }
  }), /*#__PURE__*/React.createElement("div", {
    ref: rZoneRef,
    className: "bt-desktop-hide",
    'data-joyzone': 'R',
    style: { position: 'fixed', right: 0, top: 0, width: '50%', height: 'calc(100% - var(--dash-h))', zIndex: 6, touchAction: 'none', background: 'transparent', WebkitUserSelect: 'none', userSelect: 'none' }
  }), /* duplicate kb-hints removed — kept the one near joystick zone below */ /*#__PURE__*/React.createElement("div", {
    className: "bt-joystick-zone",
    style: {
      position: 'fixed',
      bottom: 'calc(var(--dash-h) + 70px)',
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
      filter: 'drop-shadow(0 0 1.2px #000) drop-shadow(0 0 1.2px #000)',
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
      filter: 'drop-shadow(0 0 1.2px #000) drop-shadow(0 0 1.2px #000)',
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
      filter: 'drop-shadow(0 0 1.2px #000) drop-shadow(0 0 1.2px #000)',
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
    className: "bt-desktop-hide",
    style: {
      position: 'fixed',
      bottom: 'calc(var(--dash-h) + 70px)',
      right: isLandscape ? 50 : 50,
      zIndex: 30,
      /* v2.3.816: visuals only -- touches handled by rZoneRef beneath. */
      pointerEvents: 'none',
                  width: isLandscape ? 98 : 83,
      height: isLandscape ? 98 : 83
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: rJoyRef,
    className: "bt-rjoy-base",
    style: {
      width: isLandscape ? 90 : 75,
      height: isLandscape ? 90 : 75,
      /* v2.3.949: DOCKED -- position:absolute centres the base in its right-corner
         zone container, always visible at 50% opacity; relative-drag from the
         touch origin (see handleRJoyMove). */
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      opacity: 0.5,
      transition: 'opacity 0.12s ease',
      /* v2.3.99: sprite-backed base.  The previous rgba bg + dynamic
         autoAttack border/shadow are gone; auto-attack signal is now a
         separate red-ring overlay rendered below.  borderRadius kept
         so the hit-test shape stays circular. */
      borderRadius: '50%',
      backgroundImage: 'url(/sprites/joystick/base.webp?v=2.3.102)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      touchAction: 'none',
      filter: 'drop-shadow(0 0 1.2px #000) drop-shadow(0 0 1.2px #000)',
    }
  }, autoAttack && /*#__PURE__*/React.createElement("div", {
    /* v2.3.99: auto-attack indicator.  Replaces the dynamic
       border/box-shadow recoloring we used to do on .bt-rjoy-base
       (which we can't do anymore now that the base is a fixed sprite).
       Thin red ring sits flush on top of the base sprite. */
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      /* v2.3.1233: ring chrome onto the spec's HP red (#D95C54). */
      border: '2px solid rgba(217,92,84,0.85)',
      boxShadow: '0 0 12px rgba(217,92,84,0.55)',
      pointerEvents: 'none',
      zIndex: 2,
    }
  }), /*#__PURE__*/React.createElement("svg", {
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
  }()), /* Mana text removed — shown contextually above the player. */
  null, /*#__PURE__*/React.createElement("div", {
    /* Analog "stick" for the right joystick — mirrors lStickRef.  Width
       and rotation are driven by handleRJoyMove.  v2.3.100: height
       bumped 14 -> 22 to match the left joystick (user request:
       "knob + rod much larger relative to the outer ring"). */
    ref: rStickRef,
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
      filter: 'drop-shadow(0 0 1.2px #000) drop-shadow(0 0 1.2px #000)',
    }
  }), /*#__PURE__*/React.createElement("div", {
    ref: rKnobRef,
    style: {
      /* v2.3.100: sprite-backed knob, bumped 24 -> 44 px so it reads
         much larger relative to the outer ring (user request).  Same
         drag math (translate from joystick center to clamped finger
         pos) so no handleRJoyMove changes needed. */
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      width: isLandscape ? 48 : 42,
      height: isLandscape ? 48 : 42,
      backgroundImage: 'url(/sprites/joystick/knob.webp?v=2.3.102)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      pointerEvents: 'none',
      filter: 'drop-shadow(0 0 1.2px #000) drop-shadow(0 0 1.2px #000)',
    }
  }, /* Knob left blank — active weapon is shown in WeaponSwapBar instead. */ null), /*#__PURE__*/React.createElement("div", {
    /* Right-joystick shield preview overlay (v2.3.97).  Hidden by
       default; shown for PREVIEW_HOLD_MS ms after a single tap as a
       visual cue that "another tap-and-hold here activates shield."
       The orbiting BlockRing glyph stays hidden until shield is
       actually engaged (per user request: it serves as the active
       arc indicator, not a static button). */
    ref: rJoyPreviewRef,
    style: {
      position: 'absolute',
      inset: 0,
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 2,
      fontSize: isLandscape ? 16 : 14,
      fontWeight: 800,
      color: 'rgba(150,200,255,0.95)',
      textShadow: '0 1px 3px rgba(0,0,0,0.7), 0 0 6px rgba(80,140,255,0.5)',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }
  }, 'shield'))), /*#__PURE__*/React.createElement("div", {
    ref: shieldJoyRef,
    className: "bt-desktop-hide bt-legacy-shield-removed",
    style: {
      // Legacy standalone shield button — removed v14.x in favor of BlockRing.
      // Element kept in tree (display:none) because BroTown still references
      // shieldJoyRef from non-render code paths; visible UI is now BlockRing.jsx.
      display: 'none',
      position: 'fixed',
      bottom: isLandscape ? 102 : 96,
      right: isLandscape ? 20 : 10,
      zIndex: 30,
      width: isLandscape ? 70 : 60,
      height: isLandscape ? 70 : 60,
      touchAction: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      position: 'relative',
      overflow: 'hidden',
      border: '3px solid ' + (shieldUp ? 'rgba(96,165,250,.8)' : 'rgba(96,165,250,.2)'),
      background: shieldUp ? 'radial-gradient(circle,rgba(96,165,250,.5) 0%,rgba(40,80,180,.3) 100%)' : 'radial-gradient(circle,rgba(50,60,100,.3) 0%,rgba(30,40,70,.2) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: shieldUp ? '0 0 15px rgba(96,165,250,.4)' : 'none',
      cursor: 'pointer',
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'none',
      userSelect: 'none'
    }
  }, function (_stateRef$current69) {
    var R = (_stateRef$current69 = stateRef.current) === null || _stateRef$current69 === void 0 ? void 0 : _stateRef$current69.rpg;
    if (!R) return null;
    var stam = R.stamina || 0,
      maxStam = R.maxStamina || 100;
    var pct = Math.max(0, stam / maxStam);
    var isLow = pct < 0.2;
    var onCd = stateRef.current._shieldCdUntil && Date.now() < stateRef.current._shieldCdUntil;
    var filledColor = onCd ? 'rgba(220,50,50,.4)' : isLow ? 'rgba(255,150,30,.4)' : pct > 0.5 ? 'rgba(50,180,100,.4)' : 'rgba(200,160,40,.4)';
    var emptyColor = 'rgba(0,0,0,.3)';
    var deg = Math.round(pct * 360);
    return React.createElement('div', {
      style: {
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: "conic-gradient(from 0deg at 50% 50%, ".concat(filledColor, " 0deg, ").concat(filledColor, " ").concat(deg, "deg, ").concat(emptyColor, " ").concat(deg, "deg, ").concat(emptyColor, " 360deg)"),
        mask: 'radial-gradient(circle,transparent 48%,black 49%)',
        WebkitMask: 'radial-gradient(circle,transparent 48%,black 49%)',
        pointerEvents: 'none',
        zIndex: 0,
        transform: 'rotate(-90deg)'
      }
    });
  }(), shieldUp && function () {
    var ang = stateRef.current._shieldAngle || 0;
    var sz = isLandscape ? 70 : 60;
    var r = sz * 0.35;
    var ccx = sz / 2,
      ccy = sz / 2;
    return React.createElement('svg', {
      style: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2
      }
    }, React.createElement('line', {
      x1: ccx,
      y1: ccy,
      x2: ccx + Math.cos(ang) * r,
      y2: ccy + Math.sin(ang) * r,
      stroke: 'rgba(96,165,250,.9)',
      strokeWidth: 3,
      strokeLinecap: 'round'
    }));
  }(), function (_stateRef$current70) {
    var R = (_stateRef$current70 = stateRef.current) === null || _stateRef$current70 === void 0 ? void 0 : _stateRef$current70.rpg;
    if (!R) return null;
    var stam = Math.floor(R.stamina || 0),
      maxStam = R.maxStamina || 100,
      deficit = maxStam - stam;
    var pct = stam / maxStam;
    return React.createElement('div', {
      style: {
        position: 'absolute',
        top: 2,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        textAlign: 'center',
        lineHeight: 1,
        zIndex: 2
      }
    }, React.createElement('div', {
      style: {
        fontSize: 5,
        fontWeight: 700,
        color: 'rgba(255,255,255,.5)',
        letterSpacing: '.3px'
      }
    }, 'ENERGY'), React.createElement('div', {
      style: {
        fontSize: 8,
        fontWeight: 900,
        color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,.8)'
      }
    }, stam));
  }(), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: isLandscape ? 22 : 18,
      pointerEvents: 'none',
      zIndex: 1
    }
  }, "\uD83D\uDEE1\uFE0F"))));
}
