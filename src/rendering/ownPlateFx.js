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
/* the renderer asks the page's answer through this file's one import line */
export { selfNameDrawn } from '../game/ownPlate.js';
import { PLATE_H_RATIO } from './tables/ui.js';

/* your plate's name size: yours one step above your peers' (15 against their
   14 CSS px, since v2.3.1681; entityRenderer.js createPlayerDisplay's note) */
const OWN_PLATE_CSS = 15;

/* v2.3.2513 (entityRenderer.js's setPlateZoom note): a plate's zoom is its
   lift over the figure's chain times the world's scale, clamped.  The clamp
   is a sanity bound, not a design term: nothing should ever ask for a 20x
   plate, and a near-zero world scale from a mid-transition frame must not
   take the screen.  Here (v2.3.6788) so your band is sized by the same
   arithmetic while your plate is not drawn. */
const PLATE_SCALE_MIN = 0.2;
const PLATE_SCALE_MAX = 3;
/** A plate's zoom for this figure at this world scale (pill or no pill). */
export function plateZoomFor(display, worldScale) {
  const chain = (display && display._pillChain) || 1;
  return Math.min(PLATE_SCALE_MAX, Math.max(PLATE_SCALE_MIN,
    ((display && display._plateLift) || 1) / (chain * worldScale)));
}

/** Half your band's height, in the uiLayer's units: the plate's, drawn or
 *  not -- so the HP bar's place, the skull over it, the chat bubble's point
 *  and the damage numbers stand where they stood (nothing jumps when your
 *  plate goes, and nothing moves when a fight brings the HP bar). */
export function ownPlateBandHalf(display, worldScale) {
  return Math.max(8, ((display._pillCss || OWN_PLATE_CSS) * PLATE_H_RATIO * plateZoomFor(display, worldScale)) / 2);
}

/** Your figure's plate, decided once as it is built (`on`: selfNameDrawn's
 *  answer).  The two numbers the band is sized by are kept either way, and
 *  the plate's place among the layer's nodes for a rebuild.  `attach` is the
 *  renderer's factory (_attachNamePill). */
export function ownPlateBuild(container, layer, chain, on, attach) {
  container._pillCss = OWN_PLATE_CSS;
  container._pillChain = chain;
  container._ownPlateOn = on;
  container._ownPlateAt = layer.children.length;
  if (on) attach(container, OWN_PLATE_CSS, undefined, layer);
}

/** Build or destroy your plate when `on` differs from what the figure holds.
 *  `build` is the renderer's factory for it (_attachNamePill), in your
 *  uiLayer at the factory's size. */
export function ownPlateSync(display, on, build) {
  if (!display || display._ownPlateOn === on) return;
  display._ownPlateOn = on;
  display._ownPlateBuilds = (display._ownPlateBuilds || 0) + 1;   /* QA: __btOwnPlate */
  if (on) {
    if (!display._namePill && display._uiLayer) {
      build(display, OWN_PLATE_CSS, undefined, display._uiLayer);
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
let _scale = 1;
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
    bandHalf: ownPlateBandHalf(d, _scale),
  };
}
/** QA pages only (`__btProbe`): the probe reads this figure at this world
 *  scale; and your plate's words as drawn (`__btSelfPlate`, v2.3.3313,
 *  mp-alliance: none while it is not drawn). */
export function ownPlateProbeArm(display, worldScale) {
  _of = display;
  _scale = worldScale;
  window.__btSelfPlate = display._pillName ? display._pillName.text : null;
  if (!window.__btOwnPlate) window.__btOwnPlate = probe;
}
