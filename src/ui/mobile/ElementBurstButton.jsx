import React, { useEffect, useRef, useState } from 'react';
import { ctlBottom, leftCluster, LCTL_SLOT } from '@/ui/panels/ShieldButton.jsx'; /* v2.3.2574: the shared cluster over the MOVEMENT disc -- this button no longer writes its own anchor */
import { ctlLandscape } from './bandSideways.js';   /* v2.3.4152: a phone on its side over the one band too */
import { PROG3, burstRefusal, burstWeapon } from '@/data/prog3.js';
import { ELEMENTS } from '@/data/elements.js';
import { elementBurst } from '@/game/playerActions.js';
import { Skin, NovaIcon, pressOn, pressOff, readyFlash } from '@/ui/panels/controlSkin.jsx'; /* v2.3.3018: the owner's mockup; v2.3.6700: readyFlash, its store shared with the look */
import { uiBusyBus } from './uiBusyBus.js'; /* v2.3.3513: stand aside while a window is open */
import { drawStore, drawNow } from '@/game/drawOnChange.js';   /* v2.3.6700: drawn again only on a change (card PRT) */
import { sw } from '@/game/switches.js';   /* v2.3.6700: `?burstidle=0` */

/* ═══ v2.3.1734: ELEMENT BURST BUTTON (COMBAT-OVERHAUL-PLAN PR 6) ═══
 *
 * iPhone Safari is the primary platform, so the ability's real input is
 * this button and the desktop G key is the second door — not the other
 * way round.
 *
 * IT APPEARS ONLY WHEN ELIGIBLE, and that is the design, not laziness
 * about disabled states.  The bottom band is the most contested space in
 * the game and a permanently-parked button for an ability most characters
 * cannot use yet would cost every player screen real estate to advertise
 * something to a few.  The moment you equip an enchanted weapon at level
 * 6+ it fades in, tinted with THAT weapon's element, which is also how a
 * player learns the two are connected without a tutorial line.
 *
 * (Eligibility here is a DISPLAY gate.  burstRefusal is the same function
 * the action itself calls, and the server re-decides all four conditions
 * from its own state — burst.js _burstRefusal.  Deleting this component in
 * devtools buys nothing.)
 *
 * ═══ v2.3.2574: IT MOVED, AND IT STOPPED PLACING ITSELF ═══
 *
 * It used to sit "on the LEFT of the right-joystick assembly, mirroring the
 * charge pie's placement above it, so the thumb that already lives there
 * reaches it without crossing the screen" -- `right: 50 + discW + 10`, level
 * with the disc's centre, worked out here.
 *
 * TWO THINGS WERE WRONG WITH THAT, and only the second one is why it moved.
 *
 * 1. THOSE NUMBERS WERE ctlColumn SLOT 0 TO WITHIN TWO PIXELS, arrived at
 *    independently in this file.  That is the duplication ctlColumn exists to
 *    end, and it had already gone wrong unnoticed: this button's box sat 8px
 *    from Shield Bash at 390, 7px at 360 and 12px sideways -- the tightest pair
 *    of combat buttons in the shipped game, and well inside the "enough space
 *    ... for not accidentally pressing the other one" the owner has been asking
 *    for.  Nothing caught it because no test ever compared these two boxes.
 *
 * 2. The owner moved Special and Whirlwind above the attack disc (v2.3.2574),
 *    which pushed Shield Bash down into slot 0 -- here.  The right half has
 *    four safe places and five controls wanted them.
 *
 * So this button takes the cluster over the MOVEMENT disc that Special and
 * Whirlwind vacated, and reads its anchor from leftCluster instead of writing
 * one.  It is the control that was chosen to cross the screen because it is the
 * one least often on it: every other button here turns on moment-to-moment
 * combat state, while this one needs an enchanted weapon AND level 6+.
 *
 * WHAT THAT COSTS, plainly: the "without crossing the screen" above is no
 * longer true, and it was a real design intent rather than an accident.  It
 * buys 131px of clear air to Shield Bash where there were 8.  If the owner
 * finds the reach worse than the crowding was, the remedy is to shrink the
 * right-hand controls and bring this one back to slot 0 -- not to put two
 * buttons within 8px of each other again.
 *
 * Same fixed-position idiom, same --sheet-h keying (through ctlBottom now), so
 * it still rides above an open sheet like the pie does.
 *
 * NO drop-shadow filter — v2.3.948's iOS incident (a CSS drop-shadow on a
 * DOM overlay compositing over the WebGL canvas produced grainy static on
 * the charge pie).  Definition comes from the fill and the border.
 */

const SIZE = 46;
/* (v2.3.3018: FADE_MS, the 180ms opacity fade between ready and not, went
   with the fade -- the skin's states change colour, not opacity.) */

/* ═══ v2.3.6700: WHAT THE BUTTON WOULD DRAW, READ ONCE (card PRT) ═══
   The look on every animation frame (below) and the render read the game's
   state the same way, here: whether the button shows at all, the weapon's
   element, the refusal that dims it (`mana`), the cooldown.  `key` is all of
   it that does not move by the clock; the cooldown's arc does, so while it
   runs every look draws (game/drawOnChange.js). */
/* the two views of a button not on screen, made once: the look asks every frame, and must make no garbage of its
   own while it draws nothing */
const VIEW_NONE = Object.freeze({ shown: false, key: 'none', cdLeft: 0 });
const VIEW_HIDDEN = Object.freeze({ shown: false, key: 'hidden', cdLeft: 0 });
function burstView(S, now) {
  const R = S && S.rpg;
  if (!R) return VIEW_NONE;
  const wpn = burstWeapon(R);   /* NOT getActiveWeapon — see burstWeapon's note */
  /* Pass no cast time: the cooldown must NOT hide the button, or it would
     blink out of existence for three seconds every time it is used and the
     thumb would have nothing to aim at.  Cooldown is drawn instead. */
  const refusal = burstRefusal(R, wpn, 0);
  /* `mana` is the one refusal that keeps the button on screen — dimmed.
     It is the state a player is in constantly and the one where seeing the
     button (and the mana bar refilling) is the whole feedback loop. */
  if (refusal && refusal !== 'mana') return VIEW_HIDDEN;
  const element = wpn && wpn.element1;
  const cdLeft = Math.max(0, PROG3.BURST_CD_MS - (now - (S._lastBurstAt || 0)));
  return { shown: true, refusal, element, cdLeft, cdFrac: cdLeft / PROG3.BURST_CD_MS, ready: !refusal && cdLeft <= 0,
    key: 'shown|' + (refusal || '') + '|' + (element || '') + '|' + (cdLeft > 0 ? 'cooling' : 'ready') };
}
/* is the cooldown running (the flash's question, asked the same way by the look and the render) */
const burstCooling = (S, now) => !!(S && PROG3.BURST_CD_MS - (now - (S._lastBurstAt || 0)) > 0);

export const ElementBurstButton = () => {
  const [, force] = useState(0);
  const [isLandscape, setIsLandscape] = useState(ctlLandscape());
  /* ═══ v2.3.3513: UNDER A WINDOW, IT STANDS ASIDE ═══
     This button is drawn by GameApp, OUTSIDE .brotown-wrap, so it paints over
     an in-wrap window whatever the z-index ladder says (the lesson at
     .bt-inspect in game.css; the bell's v2.3.3407 fix).  A weapon's gem is
     the worker's now (weapongem.js) and lasts, so the button is up for good
     once one is set -- and it sat over the Gem Works' own window, across its
     "No open gem slot", the very window that set it (mp-weapongem's picture).
     A window open is a window the thumb is using: hidden until it shuts. */
  const [busy, setBusy] = useState(() => uiBusyBus.busy);
  useEffect(() => uiBusyBus.subscribe(setBusy), []);

  /* ═══ v2.3.6700: IT LOOKS EVERY FRAME, AND DRAWS ONLY ON A CHANGE (card PRT) ═══
     This drew the component again on every animation frame for the whole
     session -- a render and a commit 60 times a second (120 on a fast
     screen), and on a character with no enchanted weapon each one drew
     nothing.  Now each frame it reads what it would draw (burstView, a few
     reads) and draws again only when that changed, or while the cooldown's
     arc is closing (every frame, as before).  The flash at the arc's end is
     in the key, so it is drawn when it starts and when its 700 ms are up; its
     store is shared with the render (one moment the cooldown is seen to end).
     `?burstidle=0`: drawn again every frame, as before. */
  const drawRef = useRef(null);
  if (!drawRef.current) drawRef.current = drawStore();
  const flashRef = useRef(null);
  if (!flashRef.current) flashRef.current = Object.create(null);
  /* the game's state as the last look read it: the render and the press read it here, so this file reaches the
     page's open hand on ONE line, the look's (grand plan 5.7; tools/guards/open-hand.test.mjs) */
  const stateRef = useRef(null);
  useEffect(() => {
    let raf;
    const everyFrame = sw('burstidle');
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const S0 = stateRef.current = (typeof window !== 'undefined' && window._gameState) ? window._gameState.current : null;
      if (everyFrame) { force((v) => v + 1); return; }
      const now0 = Date.now();
      const v = burstView(S0, now0);
      const fl = readyFlash(flashRef.current, 'one', burstCooling(S0, now0), now0);
      if (drawNow(drawRef.current, v.key + (fl ? '|flash' : ''), v.shown && v.cdLeft > 0)) force((n) => n + 1);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const onResize = () => setIsLandscape(ctlLandscape());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const S = stateRef.current;   /* v2.3.6700: as the last look read it (a frame old at most; none before the first look) */
  const now = Date.now();
  /* v2.3.3018: the glow swells once when the cooldown's arc closes.
     v2.3.6700: the same bookkeeping as useReadyFlash, in the store the look
     shares (above), so the look sees the flash start and end. */
  const flash = readyFlash(flashRef.current, 'one', burstCooling(S, now), now);
  /* v2.3.6700: what to draw, read the way the look reads it (burstView) */
  const view = burstView(S, now);
  if (!view.shown || busy) return null;

  const refusal = view.refusal;
  const color = (ELEMENTS[view.element] && ELEMENTS[view.element].color) || '#8E44AD';
  const cdLeft = view.cdLeft;
  const cdFrac = view.cdFrac;
  const ready = view.ready;

  /* v2.3.2574: the anchor comes from the shared cluster, not from this file.
     SIZE stays 46 rather than taking the cluster's 48/54: the rings below are
     drawn at r=7/12/17 against it and re-tuning that artwork is a separate
     change from moving the button.  A 46px box in a 48px slot simply leaves 2px
     of slack at the slot's edge, which makes every clearance 2px BETTER than
     the slot map promises, and 46 is still clear of Apple's 44px minimum. */
  const clu = leftCluster(isLandscape);
  const bottomVal = ctlBottom(clu.bottomPx(LCTL_SLOT.burst));
  const leftVal = clu.leftPx(LCTL_SLOT.burst) + 'px';

  /* ═══ v2.3.2574: A POINTER GUARD IS NOT A TOUCH GUARD ═══
   *
   * This was a single `onPointerDown` whose stopPropagation was there because
   * "the canvas under this takes taps as attacks".  That was survivable beside
   * the attack disc.  Over the MOVEMENT half it is not, for two reasons:
   *
   *   1. A finger fires BOTH `pointerdown` and `touchstart`, and they are
   *      separate dispatches -- stopping propagation on one says nothing about
   *      the other.  `[data-joyzone="L"]` listens on touchstart (lS), so the
   *      press would fire the burst AND start the player walking.
   *   2. lM / lE are bound to WINDOW (BroTown ~9345), so the touch does not
   *      even need the zone element in its propagation path; the release and a
   *      few px of slide get classified as a drag and a dodge.
   *
   * So it carries the same three guards SpecialButton has carried since
   * v2.3.2472 for this exact neighbour, and fires from `touchstart` with
   * `onMouseDown` as the desktop door -- NOT from pointerdown as well, or a
   * single finger would cast twice.  mp-abilslot presses it with a real finger
   * and asserts both halves: the burst went off, and the player did not move.
   */
  const press = (e) => {
    e.preventDefault();
    e.stopPropagation();
    pressOn(e);   /* v2.3.3018: the sheet's Pressed */
    /* v2.3.6700: read at the press, not at the last draw (the button is no
       longer drawn again every frame, so the draw's `ready` can be a moment
       old): the state the last look read, a frame old at most */
    const S1 = stateRef.current;
    if (!S1 || !burstView(S1, Date.now()).ready) return;
    elementBurst(S1);
  };
  /* A release and a slide are classified too -- see above. */
  const swallowEnd = (e) => { e.preventDefault(); e.stopPropagation(); pressOff(e); };
  const swallowMove = (e) => { e.stopPropagation(); };

  /* ═══ v2.3.3018: THE NOVA ON THE MOCKUP'S BUTTON ═══
     The owner's mockup gives every control a gold-ringed button.  The nova
     this button fires is still its picture, in the weapon's element colour
     (which is still how a player learns the two are connected); the ring is
     the skin's gold, and the states are the sheet's:
       ready          Normal
       cooling down   Cooldown -- dark, the nova grey, a blue arc closing (the
                      dark sweep it replaces drew the same fraction)
       no mana        Disabled (the one refusal that keeps it on screen) */
  const skinState = cdLeft > 0 ? 'cooldown' : (refusal ? 'disabled' : 'normal');

  return (
    <div
      className="bt-burst-btn"
      onTouchStart={press}
      onMouseDown={press}
      onTouchEnd={swallowEnd}
      onTouchCancel={pressOff}
      onMouseUp={pressOff}
      onMouseLeave={pressOff}
      onTouchMove={swallowMove}
      onContextMenu={(e) => e.preventDefault()}
      role="button"
      /* v2.3.2658: the ONE world control drawn as role="button", so the menu
         click delegate (src/ui/uiSfxDelegate.js) would otherwise tick on it.
         This is a combat ability -- it has the burst's own sound, and a menu
         click over a fight is wrong. */
      data-uisfx="off"
      aria-label="Element Burst"
      /* v2.3.3711: on a computer it wears its key, F (was G: the owner's
         layout, desktopControls.js; drawn by game.css [data-key] only under a
         mouse) */
      data-key="F"
      data-ready={ready ? '1' : '0'}
      style={{
        position: 'fixed',
        bottom: bottomVal,
        left: leftVal,
        width: SIZE,
        height: SIZE,
        zIndex: 31,
        borderRadius: '50%',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      <Skin size={SIZE} tone="slate" state={skinState}
        progress={cdLeft > 0 ? 1 - cdFrac : null}
        flash={flash && skinState === 'normal'}>
        {/* The nova the button fires, drawn as the button: a filled core
            with two rings at the ratio the ability actually uses. */}
        <NovaIcon size={Math.round(SIZE * 0.62)} color={color} grey={skinState !== 'normal'} />
      </Skin>
    </div>
  );
};
/* v2.3.6700: its name kept in a minified build, for the idle census's count of who draws again
   (tools/qa/mp/idle-census.mjs: IDLE_LINES.burstRendersPerFrame) */
ElementBurstButton.displayName = 'ElementBurstButton';
