/* ═══ v2.3.6791: NO TUTORIAL MESSAGE OVER THE CONTROLLER (card UI3, PR 11) ═══
 * The owner, 2026-11-27, after the new controller landed (card PAD): "Needs to
 * fix tutorial messages over new controller area."  Found on the phone page
 * (mp-tutorclear): sideways the coach's TALK TO MAYOR BRO card, hung BELOW its
 * target, lay on the right lobe; the big arrow's "Tap to open" stood on the
 * rail and the stick's lobe (it points at Gear, under the shell); and every
 * message hung from the band (the "Next: ..." toasts, the Add to Home Screen
 * card) sat inside the shell, 12 to 14 px over the band while the shell stands
 * 114 to 131 px over it: the band's height cleared, not the housings.
 *
 * ONE RULE: given the controller's housings (their boxes, from the layout the
 * controls place themselves with: padSkin.js padLayout, and the right lobe's
 * tier) and a message's wanted box, it returns a box that covers no housing:
 *   - straight UP, just over the highest housing it spans (`AIR` px of air);
 *   - or, where the caller lets it slide (`slide`: a message that points at a
 *     control and is narrow enough), sideways into the open middle over the
 *     rail, when that keeps it lower (nearer what it points at);
 *   - never over the ceiling (`ceil`: the top of the play area, or under the
 *     top-left HUD): a message too tall for the room left SHRINKS to it
 *     (`cut` px off its height, the caller scrolls or clips its words).
 * A message that TEACHES a control may point at it: its arrow or ring is not
 * a message (it may touch the control); its WORDS never cover it.
 *
 * UNITS: px UP from the band's top edge (the shell's bottom: --sheet-h over
 * --dash-h), x px from the play column's left.  A message hung by `bottom`
 * from the band speaks these units already; one placed by `top` converts with
 * the band's top in the page (fromTop / toTop).  No imports: node tests it
 * (tools/guards/tutor-clear.test.mjs).
 */

/* The housing's OUTER edge (its gold or steel rim), in the 920 x 280
   reference the layout is drawn in (padSkin.js REF), measured off
   public/ui/pad/housing.png's own alpha: the stick's lobe tops at 27.8 (from
   the reference's top), the rail at 146.4, the right lobe at 0.  The lobes
   are boxes to the cuts (padSkin.js PAD.CUT_L / CUT_R: the left lobe ends
   and the right one starts where the rail is flat), so their sloping
   shoulders are inside them: a box clears a little more than the art. */
export const HOUSING_TOP_REF = Object.freeze({ left: 27.8, rail: 146.4, right: 0 });
export const REF_H = 280;
/* air between a message and a housing, px */
export const AIR = 8;

/** The housings on this screen, from the controller's layout (padSkin.js
 *  padLayout's { s, shell: { w, h, cutL, cutR } }) and `rise`, the right
 *  lobe's tier while Whirlwind or Shield Bash shows (padSkin.js
 *  specialLayout(...).rise; 0 when none).  `x0`: the shell's left in the
 *  caller's x (0: the play column's).  [{ n, l, r, lo, hi }]: lo 0 (on the
 *  band), hi its top, px up from the band.  None when the controller is off. */
export function housingBoxes(layout, rise, x0) {
  if (!layout || !layout.shell || !(layout.shell.w > 0)) return [];
  const sh = layout.shell, k = sh.h / REF_H, x = typeof x0 === 'number' ? x0 : 0;
  const up = (ref) => (REF_H - ref) * k;
  const tier = rise > 0 ? rise : 0;
  return [
    { n: 'left', l: x, r: x + sh.cutL, lo: 0, hi: up(HOUSING_TOP_REF.left) },
    { n: 'rail', l: x + sh.cutL, r: x + sh.w - sh.cutR, lo: 0, hi: up(HOUSING_TOP_REF.rail) },
    { n: 'right', l: x + sh.w - sh.cutR, r: x + sh.w, lo: 0, hi: up(HOUSING_TOP_REF.right) + tier },
  ];
}

/* do two boxes ({ l, r, lo, hi }) share any area */
export function meets(a, b) {
  return a.l < b.r && a.r > b.l && a.lo < b.hi && a.hi > b.lo;
}

/* the lowest a box of this span may stand (its `lo`) clear of every keep box it
   spans side to side: AIR over the highest one; 0 when it spans none */
function floorOver(l, r, keep, air) {
  let f = -Infinity;
  for (const k of keep) if (l < k.r && r > k.l) f = Math.max(f, k.hi + air);
  return f;
}

/** Where a message goes.  `want` { l, r, lo, hi } its wanted box (band units);
 *  `keep` the boxes it may not cover (housingBoxes, and any more the caller
 *  adds); opts: `ceil` the highest its top may reach (px up from the band;
 *  Infinity none), `air` (AIR), `slide` px it may move sideways to clear
 *  lower (0: straight up only), `minL` / `maxR` the span it must stay in.
 *  Returns { l, r, lo, hi, cut, moved }: `cut` px taken off its height
 *  where the room under the ceiling is short (0 when it fits whole). */
export function clearOf(want, keep, opts) {
  const o = opts || {};
  const air = typeof o.air === 'number' ? o.air : AIR;
  const ceil = typeof o.ceil === 'number' ? o.ceil : Infinity;
  const w = want.r - want.l, h = want.hi - want.lo;
  const list = Array.isArray(keep) ? keep : [];
  /* clear already: where it wants (the ceiling is the caller's own business
     then: the rule moves nothing it does not have to) */
  if (!list.some((k) => meets(want, k))) {
    return { l: want.l, r: want.r, lo: want.lo, hi: want.hi, cut: 0, moved: false };
  }
  /* the places it may stand side to side: where it wants, and (sliding) just
     beside each housing's edge, within `slide` of where it wants */
  const slide = o.slide > 0 ? o.slide : 0;
  const minL = typeof o.minL === 'number' ? o.minL : -Infinity;
  const maxR = typeof o.maxR === 'number' ? o.maxR : Infinity;
  const xs = [want.l];
  if (slide > 0) {
    for (const k of list) { xs.push(k.r + air); xs.push(k.l - air - w); }
  }
  let best = null;
  for (const x0 of xs) {
    const l = Math.max(minL, Math.min(maxR - w, x0));
    if (Math.abs(l - want.l) > slide + 1e-6) continue;
    const lo = Math.max(want.lo, floorOver(l, l + w, list, air));
    /* nearest to the wanted place: the least rise first, then the least slide */
    const cost = (lo - want.lo) * 1000 + Math.abs(l - want.l);
    if (!best || cost < best.cost) best = { l, lo, cost };
  }
  if (!best) best = { l: want.l, lo: Math.max(want.lo, floorOver(want.l, want.r, list, air)) };
  let lo = best.lo, hi = lo + h, cut = 0;
  if (hi > ceil) {
    /* no room for the whole of it under the ceiling: it stands on its floor
       and loses the top of its height, never its place over the controller */
    cut = Math.min(h, hi - ceil);
    hi = ceil;
    if (hi < lo) { hi = lo; }
  }
  return { l: best.l, r: best.l + w, lo, hi, cut, moved: true };
}

/** A box placed by `top` / `height` in the page, in band units: `bandTop` is
 *  the band's top edge in the same page px. */
export function fromTop(top, height, left, width, bandTop) {
  return { l: left, r: left + width, lo: bandTop - (top + height), hi: bandTop - top };
}
/** ...and back: the page `top` of a placed box. */
export function toTop(box, bandTop) {
  return bandTop - box.hi;
}

/* ═══ THE MESSAGES THAT ASK THE RULE ═══
   Each one is an element carrying `data-tutor="<id>"` whose place comes from
   a call to clearOf (or the glue's tutorOver / tutorTop: src/ui/tutorSpot.js).
   tools/guards/tutor-clear.test.mjs reads the syntax tree: every element in
   src/ui that carries one of the MESSAGE_ATTRS also carries its data-tutor,
   and its file calls the glue.  mp-tutorclear plays them on the phone page. */
export const TUTOR_MESSAGES = Object.freeze({
  coach: { attr: 'data-coach-card', file: 'src/ui/mobile/QuestCoach.jsx' },
  toast: { attr: 'data-store-toast', file: 'src/ui/mobile/StoreToast.jsx' },
  install: { attr: 'data-install-hint', file: 'src/ui/mobile/InstallHint.jsx' },
  arrow: { attr: 'data-guide-arrow-words', file: 'src/ui/guideArrow.js' },
  controls: { attr: 'data-ctltut-card', file: 'src/ui/mobile/ControlsTutorial.jsx' },
});
