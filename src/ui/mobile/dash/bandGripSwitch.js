/* ═══ v2.3.6697: THE BAND'S PULL HANDLE IS GONE; `?bandgrip=1` BRINGS IT BACK (card UI2-grip) ═══
   The owner, 2026-11-26, after trying the new controller on their iPhone:
   "New controller looks good but remove the pull handle on the dashboard.  It
   has an open button making pull handle redundant.  Also pull handle implies
   stretching when dashboard is really just minimized or expanded".
   So upright the band's top edge carries nothing: no tab, no bar, no tap area
   over the world (dash/BandGrip.jsx BandGrip is drawn only with this switch
   thrown).  The fold is the row's own buttons: under the new frame the
   header's Gear (folded) and Close (shown), which are exactly dashNav's 'fold'
   (Gear as it was left / Close); under `?ui2=0` the OPEN / CLOSE chip
   (BandClose).

   THE HOOK MOVES WITH IT.  `[data-dash-fold]` is how the harness
   (H.unfoldBand, H.foldBand, H.closeDest), the coach's "open the dashboard"
   lessons, the guide arrow, the gear flash and the rewards' flight find the
   fold, and server/test pins it (points-fly, guide-arrow).  So the control
   that folds now wears it ('min' folded, 'open' shown), and with the switch
   thrown only the handle does, as before (one wearer at a time: a finder
   that takes the first match finds the one control).

   On by default (CLAUDE.md §7: the change lands as the default, with its way
   back); `?bandgrip=1` (its row in tools/guards/lib/switches.mjs) is today's
   handle for one phone.  Held by tools/guards/band-grip.test.mjs. */
import { sw } from '../../../game/switches.js';     /* relative: node's suites import it */

/** The old pull handle drawn on the band's top edge (`?bandgrip=1`). */
export function bandGripOn() {
  try { return !!sw('bandgrip'); } catch (e) { return false; }   /* no switches: the handle stays gone */
}

/** The value a fold control wears as `data-dash-fold`, or undefined when the
    handle wears it (`?bandgrip=1`) or the band is sideways (`land`: the
    landscape band never drew the fold here, and game.css hides the hook
    there). */
export function foldHook(min, land) {
  if (land || bandGripOn()) return undefined;
  return min ? 'min' : 'open';
}
