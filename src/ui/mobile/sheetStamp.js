/* ═══ v2.3.2197: --sheet-h, ONE DEFINITION, UNDER THE WATCHDOG ═══
 *
 * Owner: "Upon first joining the game and first rotating to landscape
 * sometimes the joysticks are indeed missing."
 *
 * --sheet-h is the anchor every floating combat control hangs from: both
 * joystick discs, the charge pie, the ability buttons and the lock-on ring
 * all sit at `bottom: calc(var(--sheet-h) + Npx)`.  Get it wrong by the
 * height of a portrait band (243px) on a landscape viewport (390px) and the
 * discs are pushed clean off the top edge -- present in the DOM, invisible
 * to the player, "missing".
 *
 * WHY THIS FILE EXISTS.  It was stamped inside BottomDashboard, subscribed
 * only to dashboardPanelBus, which made it EDGE-TRIGGERED on an event the
 * browser is merely promising to send.  v2.3.2196 added resize listeners --
 * necessary, not sufficient, and the reason why is already written down in
 * this repo.  BroTown's own canvas watchdog (v2.3.1975) exists because that
 * exact bet lost three times on this exact geometry, and its note says the
 * quiet part out loud: "the failure mode is the browser not making that
 * call ... there is no list of those to complete; the list is everything we
 * have not seen yet."  The owner's screenshot in that note is this same
 * symptom -- "the world squashed into a band at the top, JOYSTICKS FLOATING
 * in the page background below it."
 *
 * The answer there was to stop trusting events and assert the invariant on a
 * timer.  --sheet-h is the one viewport-derived stamp that never came under
 * that heartbeat, and BroTown's resize() already says why it should:
 * "Stamped HERE and not in the dashboard because this function owns the
 * canvas."  So the formula moves here, where resize(), the watchdog and the
 * dashboard can all reach ONE copy of it.  Three callers, one arithmetic --
 * the same rule the watchdog's own comment gives for bandFootprint, and for
 * the same reason: the day two of them read different formulas, they fight.
 *
 * Every input is read LIVE at call time.  There is no cached viewport and no
 * cached mode, so calling this is always safe and always correct; the only
 * question a caller has to answer is "how often", never "with what".
 */
import { dashboardPanelBus } from './dashboardPanelBus.js';
import { dashMinBus } from './dashMinBus.js';
import { playVw, playVh } from './playViewport.js';
import { barHeight, expandedSheetHeight, drillSheetHeight, bandFootprint } from './sheet/sheetGeometry.js';

/* Why the "has it changed?" test reads the DOM rather than a remembered
   value: a module-local memo would be asserting that this function is the
   only thing that ever writes --sheet-h, and a heartbeat whose whole job is
   to repair a wrong value must not assume it caused the wrong value.  The
   read is off the element's own inline style, not getComputedStyle, so it
   costs no layout flush -- which is what makes it cheap enough to run twice
   a second from the watchdog while still skipping the style invalidation
   when nothing moved. */

/** Write --sheet-h and data-bt-sheet from the CURRENT viewport and sheet
 *  state.  Idempotent: repeated calls with nothing changed do nothing. */
export function stampSheetH() {
  if (typeof document === 'undefined') return;
  const mode = dashboardPanelBus.state.mode;
  const vw = playVw(), vh = playVh();
  /* v2.3.2157: sideways there is no taller sheet -- the destination opens
     BESIDE the world, so everything docked above the band keys off the
     identity row's own height in every mode.  bandFootprint, not a literal,
     so this and the canvas can never disagree about what the band costs.
     v2.3.1311e: in portrait a drill panel (stack depth > 1) is taller. */
  const px = (vw > vh)
    ? bandFootprint(vw, vh, dashMinBus.min, false).dashH
    : (mode === 'expanded'
      ? (dashboardPanelBus.state.stack.length > 1 ? drillSheetHeight(vw, vh) : expandedSheetHeight(vw, vh))
      : barHeight(vw, vh));
  const root = document.documentElement;
  if (root.dataset.btSheet !== mode) root.dataset.btSheet = mode;
  const want = px + 'px';
  if (root.style.getPropertyValue('--sheet-h') !== want) {
    root.style.setProperty('--sheet-h', want);
  }
}

/** Remove the stamp — for BottomDashboard's unmount, which owns it. */
export function unstampSheetH() {
  if (typeof document === 'undefined') return;
  delete document.documentElement.dataset.btSheet;
  document.documentElement.style.removeProperty('--sheet-h');
}
