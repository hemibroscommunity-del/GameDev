/* ═══ v2.3.6788: YOUR OWN PLATE, BUILT OR DESTROYED ON A CHANGE (card UI3, PR 9) ═══
 *
 * The owner, 2026-11-26: "remove the name plate on your bro (now that it's
 * already on hud it's redundant)".  The rule is game/ownPlate.js's
 * (selfNameDrawn: the HUD showing, `?ownplate=1`); here only what it does to
 * your figure (entityRenderer.js's createPlayerDisplay), and only when its
 * answer differs from the one the figure holds (`_ownPlateOn`): never a
 * structural change a frame (TRAPS §218).  Its own file so the big renderer
 * gains calls, not logic (the plan's rule 5 of this phase; four-lines).
 *
 * Off, the whole capsule goes -- its three Texts, its backing, the badges --
 * DESTROYED, not hidden (TRAPS §192): an alpha-0 or hidden Text still holds
 * its texture.  On, the renderer's own factory (`build`, _attachNamePill)
 * makes it whole again in the same layer, at the place it was built in, and
 * the next _updateNamePill draws it from an empty key.  What is not the
 * plate stays: the HP bar, the skull, the spend bars.
 */
import { nameDrawnAsks } from '../game/ownPlate.js';

/** Build or destroy your plate when `on` differs from what the figure holds.
 *  `build(display)` is the renderer's factory for it. */
export function ownPlateSync(display, on, build) {
  if (!display || display._ownPlateOn === on) return;
  display._ownPlateOn = on;
  display._ownPlateBuilds = (display._ownPlateBuilds || 0) + 1;   /* QA: __btOwnPlate */
  if (on) {
    if (!display._namePill && display._uiLayer) {
      build(display);
      /* back in the place it was built in, so it draws in the same order */
      const ui = display._uiLayer;
      if (display._namePill && display._ownPlateAt != null) ui.setChildIndex(display._namePill, Math.min(display._ownPlateAt, ui.children.length - 1));
      display._pillKey = null;
      display._pillZoom = undefined;   /* the new pill takes its scale and resolution */
    }
    return;
  }
  const pill = display._namePill;
  if (!pill) return;
  if (typeof window !== 'undefined' && window.__btProbe) display._ownPlateLastName = display._pillName;   /* QA: is it destroyed? */
  if (pill.parent) pill.parent.removeChild(pill);
  pill.destroy({ children: true });
  display._namePill = null; display._pillBg = null; display._pillName = null;
  display._pillLevel = null; display._pillLvlNum = null;
  display._broBadge = null; display._partyBadge = null; display._elemBadge = null;
  display._pillKey = null; display._pillZoom = undefined; display._pillW = 0;
}

/* the QA probe's reading of your figure (window.__btOwnPlate, mp-ownplate):
   whether the plate is built, whether the last one destroyed was destroyed,
   how often the rule was asked and the plate rebuilt (both must stand still
   while nothing changes), the HP bar that stays, and the band's half height */
let _of = null;
let _bandHalf = null;
function probe() {
  const d = _of;
  if (!d) return null;
  const pill = d._namePill;
  const last = d._ownPlateLastName;
  const frame = d._hudHpBarFrame;
  return {
    drawn: d._ownPlateOn === true,
    pill: !!pill, inLayer: !!(pill && pill.parent), shown: !!(pill && pill.visible),
    words: d._pillName ? d._pillName.text : null,
    lastDestroyed: last ? last.destroyed === true : null,
    builds: d._ownPlateBuilds || 0, asks: nameDrawnAsks(),
    hpBar: !!(frame && frame.visible && (d._hudHpAlpha || 0) > 0.01),
    bandHalf: _bandHalf ? _bandHalf(d) : null,
  };
}
/** QA pages only (`__btProbe`): the probe reads this figure. */
export function ownPlateProbeArm(display, bandHalf) {
  _of = display;
  _bandHalf = bandHalf;
  if (!window.__btOwnPlate) window.__btOwnPlate = probe;
}
