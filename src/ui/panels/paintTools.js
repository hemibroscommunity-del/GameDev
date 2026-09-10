/* ═══ v2.3.2414: THE DRAWING TOOLS, HELD OUTSIDE THE EDITOR ═══
 *
 * Owner, on the creator's ink card: "Instead of using space for 'tattoo your
 * body or face' I'd rather you just have the tools for tattooing right there
 * beneath the character."
 *
 * So the palette and the brush widths are rendered TWICE -- once under the
 * preview in the creator (NameModal's .bt-cc-ink-tools) and once inside the
 * editor (PlayerPaint) -- and the two have to be the same tools, not two
 * pickers that happen to look alike.  Picking a colour under the character and
 * finding the editor still armed with the previous one would be worse than
 * having no inline palette at all.
 *
 * WHY A MODULE STORE AND NOT PROPS.  The editor is a sibling of the card, not
 * a child: both are rendered by NameModal, but PlayerPaint mounts and unmounts
 * as it opens and closes and its tool state would be lost with it.  Lifting the
 * state into NameModal would work and would put two more props through a
 * component that already takes thirty; a store keeps the wiring at the two
 * places that care and matches how the drawings themselves already work
 * (playerArt.js's `onArtChange`, patternCatalog.js's `onPatternChange`).
 *
 * WHY THERE IS NO PERSISTENCE HERE.  These are a session's tool settings, not
 * the player's character: a colour you were last using is not worth a
 * localStorage key or a wire field, and restoring it across a reload would be
 * surprising rather than helpful.  Deliberately in-memory only -- if that ever
 * changes, it needs a key in the rule-2 registry like anything else.
 *
 * PATTERNS ARE NOT IN HERE, on purpose.  A pattern is not a tool setting, it is
 * part of the garment -- it already lives in patternCatalog's own store, is
 * already persisted, and the shoes card writes to it directly.  One idea, one
 * home.
 */

/* Index into playerArt's ART_PALETTE.  0 is the eraser, which is why the
   default is 1 and not 0 -- opening the editor armed to rub out is a strange
   first frame. */
let _ink = 1;
/* One of playerArt's BRUSH_SIZES.  1 = fine, the width every stroke in this
   game was drawn at before widths existed (v2.3.1948). */
let _brush = 1;

const _listeners = new Set();
function _emit() { _listeners.forEach((fn) => { try { fn(); } catch (e) { /* a bad listener must not take the picker down */ } }); }

export function getInk() { return _ink; }
export function getBrush() { return _brush; }

/** Both setters bail when nothing changed: the editor writes these from an
 *  effect on every render of its own state, and an unconditional emit would
 *  re-render the creator behind it for no reason. */
export function setInk(i) {
  const n = Number(i);
  if (!Number.isInteger(n) || n < 0 || n === _ink) return;
  _ink = n; _emit();
}
export function setBrush(b) {
  const n = Number(b);
  if (!Number.isInteger(n) || n < 1 || n === _brush) return;
  _brush = n; _emit();
}

/** Subscribe; returns the unsubscriber, same shape as onArtChange. */
export function onToolsChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
