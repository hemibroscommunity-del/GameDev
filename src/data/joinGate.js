/* ═══ v2.3.2388: WHY YOU CANNOT ENTER BRO TOWN YET ═══
 *
 * Owner: "if someone tries to press the shared 'join brotown button' make it
 * give the reason it can't join (need name first) etc."
 *
 * WHAT PRESSING IT USED TO DO: nothing at all, silently.  The button carried
 * the native `disabled` attribute, and a disabled button does not fire a click
 * event -- so there was no moment at which anything could have been said.  It
 * dimmed to 0.55 opacity and that was the entire explanation.
 *
 * Worse in the state the screen OPENS in.  The validation line below the name
 * field prints '' while the field is empty (only once you have typed one
 * character does it say "At least 2 characters"), so a player who opens the
 * creator, admires the bro and presses the big gold button gets no feedback
 * from any element on the screen.  That is the report.
 *
 * TWO REASONS, NOT ONE, and the second is why this is a shared module rather
 * than an inline check in the button:
 *
 *   1. NO NAME YET / TOO SHORT -- the local rule, and the only one the button
 *      knew about.  Names are not unique server-side, so trimmed length is the
 *      honest contract (v2.3.1307); there is no availability call to make.
 *   2. THE PAGE IS PINCH-ZOOMED -- joinTown has refused to start at
 *      visualViewport.scale > 1.05 since the canvas would otherwise size off
 *      the zoomed viewport and the in-game layout breaks.  iOS Safari ignores
 *      maximum-scale, so a player really can get into that state.  It said so
 *      through a raw window.alert(), which is both jarring and unreachable
 *      until the name is already valid.
 *
 * ONE DEFINITION, TWO READERS.  NameModal shows the reason; joinTown enforces
 * it.  The 1.05 threshold in particular must not exist twice -- a button that
 * explains a rule the enforcer does not share is worse than no explanation,
 * because it teaches the player a rule that is not the real one.
 *
 * The strings are written as the NEXT ACTION rather than as a complaint
 * ("Name your bro first" over "Invalid name"), because the player pressing
 * this button has already decided what they want to do and needs the step,
 * not the diagnosis.
 *
 * ═══ v2.3.3430: AND EACH ONE FITS ON ONE LINE ═══
 * They are shown in the one-line slot between the name field and Randomize
 * (.bt-cc-namemsg, as tall as the stack's gap: 19.4px at 390, 15px on a short
 * upright screen), and all three were longer than the column -- "Name your
 * bro first — tap the field above." is 189.5px of 11px type in a slot 123.5px
 * wide at 320 and 160.5px at 390.  They wrapped to two lines, 30px of text,
 * and ran over the name field's frame and Randomize's at every phone size
 * since v2.3.2416 narrowed the slot (.14 -> .10) for the one-line hint.
 * Shortened to the action alone, each under the 320 column with room to
 * spare: 88.2px, 96.4px and 117.3px (mp-ccfeet presses for each and measures
 * it in its slot; "tap the field above" went because the field IS above).
 */

/* The pinch-zoom threshold.  1.05 rather than 1.0: Safari reports scale as a
   float that rounds a hair off 1 at rest on some devices, and refusing to
   start a game the player did nothing wrong in is worse than the layout risk
   this guards. */
export const JOIN_ZOOM_MAX = 1.05;

export function pageIsPinchZoomed() {
  try {
    const s = (typeof window !== 'undefined' && window.visualViewport
      && window.visualViewport.scale) || 1;
    return s > JOIN_ZOOM_MAX;
  } catch (e) { return false; }
}

/* Returns the reason the player cannot enter yet, or null when they can.
   Order matters: the name is the step they control from this screen, so it is
   reported first even if they are also zoomed -- fixing the zoom would leave
   them pressing a still-dead button and learning nothing. */
export function joinBlockReason(name) {
  const trimmed = (name || '').trim();
  /* v2.3.3430: one line each (see the header) */
  if (trimmed.length === 0) return 'Name your bro first';
  if (trimmed.length < 2) return 'Type at least 2 letters';
  if (pageIsPinchZoomed()) return 'Pinch back to 100% zoom';
  return null;
}
