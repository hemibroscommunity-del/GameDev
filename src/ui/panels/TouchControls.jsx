import React from 'react';
import { RBTN } from './ShieldButton.jsx';

/* ═══ v2.3.2264: THE DISC SAYS "HOT", IT DOES NOT SAY "OFF" ═══
 * Owner, on v2.3.2263's see-through button: "the disc that holds the attack
 * button isn't [reading as active].  The problem is implying the button is
 * inactive when it's partially transparent.  Maybe only during combat it
 * changes color (like to orange) keeping its transparency."
 *
 * Exactly right, and it is the oldest convention in UI: a faded control means
 * DISABLED.  v2.3.2263 borrowed that appearance to stop the button covering
 * monsters, and so made it say the opposite of what it meant -- the button is
 * never more live than in the frames it had just started looking dead in.
 *
 * The transparency stays and the COLOUR carries the state instead.  A warm wash
 * over the grey metal, so the see-through disc reads as lit rather than greyed
 * out: the same pixels, warm instead of drained.
 *
 * ONE ELEMENT, TWO BACKGROUND LAYERS, rather than a tint node of its own.  CSS
 * paints the first background-image in the list ON TOP, which is the only way
 * to get colour over the sprite: a background-COLOUR paints underneath the
 * image, and base.webp is opaque edge to edge -- the v2.3.2251 note on this
 * very disc is about exactly that.  The resolver swaps between these two
 * strings and touches nothing else.
 *
 * #D68A3C is the amber the renderer already uses for a warm world mark, so this
 * is the palette's orange rather than a new one -- and it stays clear of both
 * marks in the combat language, where brass #D8A85F means "in reach" and red
 * #FF3C3C means "attacking".  The disc is neither: it is the button those two
 * are about. */
const RBTN_WASH = 'linear-gradient(rgba(214,138,60,0.62), rgba(214,138,60,0.62)), ';
const RBTN_SPRITE = 'url(/sprites/joystick/base.webp?v=2.3.102)';
export const RBTN_BODY_BG = RBTN_SPRITE;
export const RBTN_BODY_BG_HOT = RBTN_WASH + RBTN_SPRITE;
/* ...AND THE KNOB IS PART OF THE SAME FACE.  Rendered from base.webp's dark
   well, the knob is a SEPARATE 42px sprite at zIndex 1, so v2.3.2263's fade
   reached the metal ring and stopped at the dome in the middle of it -- which
   is the half of the button actually sitting over the play area.  Measured off
   the first render of the wash: the outer metal came back (185,127,75), warm
   and see-through, and the knob (93,91,89), neutral and solid, in the same
   frame.  It takes the same two treatments, or "the button is transparent now"
   is only true of its rim. */
const RKNOB_SPRITE = 'url(/sprites/joystick/knob.webp?v=2.3.102)';
export const RKNOB_BG = RKNOB_SPRITE;
export const RKNOB_BG_HOT = RBTN_WASH + RKNOB_SPRITE;

/* === TouchControls — the left joystick + the contextual right BUTTON === */
/* v2.3.890: extracted verbatim from the floating-joystick sibling run
   in BroTown.jsx.  Render-only: the DOM refs are the SAME ref objects
   BroTown's touch effects bind to, passed through as props. */
/* ═══ v2.3.2242: THE RIGHT STICK IS A BUTTON ═══
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
    rBodyRef = props.rBodyRef,   /* v2.3.2263: the disc's painted metal, faded on its own */
    rLabelRef = props.rLabelRef,
    rCueRef = props.rCueRef,     /* v2.3.2245: the harvest tool frame on the button face */
    rRingRef = props.rRingRef,   /* v2.3.2245: the wind-up / reps ring around the rim */
    /* v2.3.2258: the rod and knob are BACK -- the right control is a joystick
       again (see the aim block in BroTown's bM). */
    rStickRef = props.rStickRef,
    rKnobRef = props.rKnobRef,
    lWrapRef = props.lWrapRef,   /* v2.3.2246: the left disc's corner box — the visibility gate */
    rWrapRef = props.rWrapRef,   /* v2.3.2246: the right button's corner box — ditto */
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
    ref: lWrapRef,
    'data-disc': 'L',
    style: {
      /* ═══ v2.3.2246: HIDDEN UNTIL A THUMB IS ON IT ═══
         Owner: "Hide the joystick overlays. Just show the left joystick when
         you're moving the character."  So the corner box starts at opacity 0
         and BroTown's per-frame resolver raises it while a finger drives
         movement (or while the weapon-swap preview is open, or while a coach
         mark points at it -- game/controlVisibility.js).
         THE GATE IS ON THE BOX, NOT THE SPRITES.  The base/stick/knob each
         carry their own opacity (the §10 engagement ladder: .5 at rest, .92
         while dragged, stamped by handleJoystickMove/End), and v2.3.1233b is
         on record for what happens when a container opacity MULTIPLIES with
         those -- a 0.62 box under a 0.5 sprite gave a 31% rest opacity
         nobody intended.  A BINARY 0/1 box cannot do that: at 1 every sprite
         is exactly as bright as it was.
         Opacity and not visibility/display, deliberately: the box keeps its
         real bounding rect either way, which is what ControlsTutorial and
         QuestCoach measure and what four QA scenarios probe, and opacity is
         the property game.css already transitions (.22s, and none under
         prefers-reduced-motion).  The disc is pointerEvents:'none' anyway --
         movement input is the full-height [data-joyzone="L"] layer beneath --
         so hiding it costs no input at all. */
      opacity: 0,
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
    ref: rWrapRef,
    'data-disc': 'R',
    style: {
      /* ═══ v2.3.2246: SHOWN ONLY WHEN A PRESS WOULD DO SOMETHING ═══
         Owner: "Just show the right contextual button when there's input that
         can be interacted with."  BroTown's resolver raises this box when a
         monster is inside the targeting perimeter, a lock is held, a resource
         is in reach, or a harvest is running -- the same four facts that
         decide what the LABEL says, read in the same place, so "the button is
         on screen" and "the press does something" cannot drift apart.
         Same binary-box reasoning as the left disc above.  The one difference
         that matters: this disc IS the touch target (pointerEvents:'auto'
         since v2.3.2242), and an opacity-0 element still takes taps -- so the
         resolver switches the DISC's pointerEvents with the box's opacity.
         Hidden, the tap falls through to [data-joyzone="R"] beneath, which
         forwards it to the canvas as a lock-on click, which is exactly what
         a tap on empty screen should do. */
      opacity: 0,
      position: 'fixed',
      bottom: 'calc(var(--sheet-h, var(--dash-h)) + ' + RBTN.bottom + 'px)', /* v2.3.1307: disc rides above the open sheet */
      right: RBTN.right,
      zIndex: 30,
      /* v2.3.2242: the container is still pass-through; the DISC inside it
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
      /* v2.3.2242: "slightly larger" -- 75/90 -> 96/108, and it now fills
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
      /* v2.3.2246: 'none' is the RESTING value and BroTown's resolver turns
         it on, not the other way round.  The box above starts hidden, so an
         'auto' default would leave the button pressable-while-invisible for
         the frames between this render and the resolver's first pass -- and a
         phantom tap on a control the player cannot see is a worse failure
         than a control that arrives a frame late.  The resolver compares
         against this inline value every frame, so a re-render that re-stamps
         it (an orientation change) is corrected on the next one. */
      pointerEvents: 'none',
      touchAction: 'none',
      transition: 'opacity 0.12s ease, border-color 0.18s ease, box-shadow 0.18s ease',
      /* ═══ v2.3.2251: SOMETHING TO LIGHT ═══
         Owner: "The attack button isn't lit up when it becomes available
         (font hard to see)."  Availability changed exactly two things -- the
         wrap's opacity 0->1 and this disc's pointerEvents -- so the button
         faded in still wearing its joystick-era 0.5 resting opacity, and
         nothing about it said "press me".
         The lit ladder is stamped INLINE by BroTown's resolver rather than
         from game.css, and these three lines are why it has to be: an inline
         border-color beats any stylesheet rule without !important, so the two
         would fight and the stylesheet would lose.  Declared here with a
         transparent colour but a real WIDTH, because growing a border from 0
         to 2px would nudge the layout every time the button woke up.
         And the lit state is carried on the BORDER and a shadow, never on
         background-color: base.webp is opaque edge to edge, so a background
         fill paints underneath the sprite and is never seen. */
      boxSizing: 'border-box',
      borderRadius: '50%',
      border: '2px solid transparent',
      /* v2.3.2263: the painted metal moved to its own child (rBodyRef, just
         below) so it can go see-through on its own.  Nothing else about the
         disc did: the lit border and its shadow are still declared here and
         still stamped inline by BroTown's resolver. */
      WebkitUserSelect: 'none',
      userSelect: 'none',
      WebkitTouchCallout: 'none',
    }
  }, /*#__PURE__*/React.createElement("div", {
    /* ═══ v2.3.2263: THE BUTTON STOPS HIDING WHAT YOU ARE FIGHTING ═══
       Owner: "Attack button sometimes covers monster (not sure best way to
       deal with it maybe 50% transparency during active combat?)"

       Measured off his screenshot: the disc is ~88 CSS px across on a 430 px
       viewport, sitting over the lower-right play area -- in that frame it
       covers a Blue Slime, most of another monster's name plate, and part of
       the bro himself.

       50% of the WHOLE BUTTON is what he suggested and it is the one thing
       this must not do: v2.3.2251 is the owner asking for the opposite -- "the
       attack button isn't lit up when it becomes available (font hard to
       see)" -- and it was fixed by taking the disc OFF its faint 0.5 rest and
       lighting its edge.  Dimming the element would dim the label, the brass
       border and the ring with it, because CSS opacity applies to the whole
       subtree, and would hand back the exact complaint.

       So the painted metal is a separate layer now and only IT fades.  The
       label, the lit edge and the progress ring are siblings above it at full
       strength: you can see the monster through the button and still read
       ATTACK on it.  zIndex 0 keeps it under the label (3) and the tool cue
       (2), and pointerEvents none keeps the touch target on the parent, so
       nothing about WHERE the button can be pressed changes. */
    ref: rBodyRef,
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      zIndex: 0,
      pointerEvents: 'none',
      opacity: 1,
      transition: 'opacity 0.18s ease, background-image 0.18s ease',
      backgroundImage: RBTN_BODY_BG,
      /* Two values each, so the wash layer is sized and placed like the sprite
         when the resolver swaps in the two-layer stack. */
      backgroundSize: '100% 100%, 100% 100%',
      backgroundRepeat: 'no-repeat, no-repeat',
      backgroundPosition: 'center, center',
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
  }()),
  /* ═══ v2.3.2258: THE ROD AND THE KNOB COME BACK ═══
     Owner: "I want both joysticks back and restore the previous behavior right
     joystick for auto attack and rotation.  BUT I also want the right joystick
     to keep its contextual button properties that exist now."

     v2.3.2242 deleted these two elements when the right control became a plain
     button.  They are the whole visual difference between a button and a
     stick: without them a drag steers the aim with nothing on screen moving,
     which reads as a dead control rather than a joystick.  Same sprites, same
     geometry and same z-order as the LEFT stick above, so the two halves of
     the control scheme look like one scheme.

     They sit UNDER the label / cue / ring (zIndex 0 and 1 against their 1 and
     2) because the contextual half is still the face of this control -- a
     HARVEST press must never look like a stick mid-throw. */
  /*#__PURE__*/React.createElement("div", {
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
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "bt-joystick-knob",
    ref: rKnobRef,
    style: {
      zIndex: 1,
      width: isLandscape ? 48 : 42,
      height: isLandscape ? 48 : 42,
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      /* v2.3.2264: fades and warms with the disc it sits in -- see RKNOB_BG. */
      opacity: 1,
      transition: 'opacity 0.18s ease, background-image 0.18s ease',
      backgroundImage: RKNOB_BG,
      backgroundSize: '100% 100%, 100% 100%',
      backgroundRepeat: 'no-repeat, no-repeat',
      backgroundPosition: 'center, center',
      pointerEvents: 'none',
      /* No filter: a drop-shadow over the WebGL canvas is the documented iOS
         "static" (v2.3.1236, CLAUDE.md). */
    }
  }), /*#__PURE__*/React.createElement("svg", {
    /* ═══ v2.3.2245: THE HARVEST RING ═══
       Owner: "The gesture cues will be on the right button."  A second ring
       inside the rim (the special-charge ring above is at r=28%): during
       the wind-up it counts down to the window opening (dim); once the
       gesture window is open it fills with reps (bright).  BroTown's loop
       stamps strokeDasharray + stroke per frame; hidden when no harvest. */
    ref: rRingRef,
    style: {
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      transform: 'rotate(-90deg)', pointerEvents: 'none', zIndex: 1, display: 'none',
    },
  }, React.createElement('circle', {
    cx: '50%', cy: '50%', r: '40%', fill: 'none',
    stroke: 'rgba(216,168,95,.85)', strokeWidth: 4, strokeLinecap: 'round',
    strokeDasharray: '0 999',
  })), /*#__PURE__*/React.createElement("div", {
    /* ═══ v2.3.2245: THE TOOL ON THE BUTTON ═══
       The owner's painted gesture strips (GESTURE_TOOLS in effectsRenderer:
       pickaxe / axe / reel / pan, 8 cells across) used to float over the
       node in the world; they now play on the button face, one cell at a
       time via background-position, at the frame the thumb's gesture is on
       (ex.cueFrame01).  BroTown's loop stamps backgroundImage / position /
       display; hidden when no harvest is live. */
    ref: rCueRef,
    style: {
      position: 'absolute', left: '50%', top: '50%',
      width: isLandscape ? 64 : 58, height: isLandscape ? 64 : 58,
      transform: 'translate(-50%,-56%)',
      backgroundRepeat: 'no-repeat', backgroundSize: '800% 100%', backgroundPosition: '0% 0%',
      pointerEvents: 'none', zIndex: 2, display: 'none',
      imageRendering: 'auto',
    },
  }), /*#__PURE__*/React.createElement("div", {
    /* v2.3.2242: THE LABEL.  Centred in the well; BroTown's loop stamps
       the text so it can change with context without a React render.
       Lantern Slate caption type: 10/700 uppercase, warm-white on the
       dark well, one text-shadow so it holds up over the metal ring. */
    ref: rLabelRef,
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'flex-end',      /* v2.3.2245: sits low so the tool frame above it stays clear */
      justifyContent: 'center',
      paddingBottom: isLandscape ? 14 : 12,
      boxSizing: 'border-box',
      pointerEvents: 'none',
      zIndex: 3,
      /* v2.3.2251: the other half of "font hard to see".  11px is the caption
         step -- the smallest type anywhere in the game -- sitting on a busy
         painted sprite at 0.5 opacity, which is how a 700-weight label in the
         lightest ink still read as faint.  Up one step, and the shadow becomes
         a real dark halo rather than a 1px drop, so the glyphs keep their edge
         over the bright plate of base.webp as well as over its dark socket. */
      fontSize: isLandscape ? 14 : 13,
      fontWeight: 700,
      color: '#F7F2E7',
      textShadow: '0 1px 2px rgba(0,0,0,.9), 0 0 4px rgba(0,0,0,.75)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }
  }, 'Attack'))));
}
