/* ═══ v2.3.6791: A MESSAGE'S PLACE, CLEAR OF THE CONTROLLER (card UI3, PR 11) ═══
 * The glue the messages call; the rule is game/tutorClear.js (its notes say
 * why).  The housings come from the layout the controls place themselves
 * with (panels/padSpot.js padNow: the play column's kept width, the switch,
 * never a read of the page) and the right lobe's tier as the buttons tell it
 * (panels/padTier.js).  No controller (a computer, `?padskin=0`): no
 * housings, and every message keeps its place.
 */
import { housingBoxes, clearOf, fromTop, toTop } from '@/game/tutorClear.js';
import { specialLayout } from '@/game/padSkin.js';
import { padNow } from '@/ui/panels/padSpot.js';
import { padTierBus } from '@/ui/panels/padTier.js';
import { playIsLandscape, playVw, winVw } from '@/ui/mobile/playViewport.js';
import { storeToastBus } from '@/ui/mobile/storeToastBus.js';
import { installHintBus } from '@/ui/mobile/installHintBus.js';
import { guideArrowKeep } from '@/ui/guideArrow.js';   /* the big arrow is handed the housings (it imports no glue: node tests it) */

/** the housings now, px up from the band's top, x from the shell's left
 *  (the window's: the shell is `left: 0`, fixed) */
export function tutorKeep() {
  /* sideways with the band's page open the controller steps aside (game.css
     html.bt-band-side-open: hidden, not touchable): nothing to keep clear of.
     A class asked, never the page's layout */
  try { if (document.documentElement.classList.contains('bt-band-side-open')) return []; } catch (e) { /* no page */ }
  const L = padNow(playIsLandscape());
  if (!L) return [];
  const T = specialLayout(L, padTierBus.get());
  return housingBoxes(L, T ? T.rise : 0, 0);
}

/** A message hung by `bottom` from the band, CENTRED in the play column:
 *  `width` its width, `over` the px over the band it wants, `height` about
 *  its height (only the ceiling reads it).  The px over the band it gets. */
export function tutorOver(width, over, height) {
  const vw = playVw() || winVw() || 390;
  const l = (vw - width) / 2;
  return clearOf({ l, r: l + width, lo: over, hi: over + (height || 44) }, tutorKeep()).lo;
}

/** A message placed by `top` in a layer whose box is `box` ({ x, y, h }: the
 *  coach's fixedBox), `sheet` the band's height (--sheet-h, as the caller read
 *  it), `want` { left, top, width, height } in the layer's px.  opts as
 *  clearOf's (`slide`; `ceil` given as a TOP in the layer's px).  Returns
 *  { left, top, cut, moved } in the layer's px. */
export function tutorTop(box, sheet, want, opts) {
  const keep = tutorKeep();
  if (!keep.length) return { left: want.left, top: want.top, cut: 0, moved: false };
  const bandTop = box.h - sheet;   /* the band's top edge, in the layer's px */
  const x0 = -box.x;               /* the shell's left (the window's 0), in the layer's px */
  const k = keep.map((b) => ({ n: b.n, l: b.l + x0, r: b.r + x0, lo: b.lo, hi: b.hi }));
  const o = Object.assign({}, opts || {});
  if (typeof o.ceil === 'number') o.ceil = bandTop - o.ceil;
  const got = clearOf(fromTop(want.top, want.height, want.left, want.width, bandTop), k, o);
  return { left: got.l, top: toTop(got, bandTop), cut: got.cut, moved: got.moved };
}

/** The coach's card (QuestCoach.jsx): its style as the coach worked it out
 *  (`left`, and `top` when it hangs below its target or `bottom` when above),
 *  `box` its layer's box and `pg` the coach's page reading (readCoachPage:
 *  the band's height `sheet`, the card's last height `cardH`, the world's
 *  span `wx` / `pw`).  The same style, moved only where it would cover a
 *  housing: sideways off the lobe into the open middle when that keeps it
 *  nearer its target (COACH_SLIDE px at most), else up; never over the top
 *  bar (COACH_CEIL), where a card too tall for the room left is cut to it
 *  and scrolls. */
export const COACH_SLIDE = 160;
export const COACH_CEIL = 56;   /* the top bar's foot (game.css --bt-hud-top's 56) */
export function coachClear(box, pg, style) {
  if (!box || !pg || pg.err || pg.fine || typeof style.left !== 'number') return style;
  const h = pg.cardH || 72;
  const w = typeof style.width === 'number' ? style.width : 220;
  const top = typeof style.top === 'number' ? style.top
    : typeof style.bottom === 'number' ? box.h - style.bottom - h : null;
  if (top == null) return style;
  const lo = (pg.wx || 0) + 8, hi = (pg.wx || 0) + (pg.pw || box.w) - 8;
  /* the ceiling: the top bar's foot, or under the top-left HUD and its quest
     line (the coach's own reading, pg.qh: charHudSpan's one box) where the
     card's span crosses it: clearing the controller never puts it there */
  let ceil = COACH_CEIL;
  const q = pg.qh;
  if (q && q.width > 0 && style.left < q.right - box.x && style.left + w > q.left - box.x) ceil = Math.max(ceil, q.bottom - box.y + 8);
  const got = tutorTop(box, pg.sheet || 0, { left: style.left, top, width: w, height: h },
    { slide: COACH_SLIDE, minL: lo, maxR: hi, ceil });
  if (!got.moved) return style;
  /* hung by its BOTTOM where the rule put it: the card's height is last paint's,
     and a card a line taller grows up, never down onto the housing */
  const out = Object.assign({}, style, { left: got.left, top: undefined, bottom: box.h - got.top - (h - (got.cut || 0)) });
  if (got.cut > 0) { out.maxHeight = Math.max(24, h - got.cut); out.overflowY = 'auto'; }
  return out;
}

/** The controls tour's card (ControlsTutorial.jsx): `box` its layer's box,
 *  `at` where the tour put it ('20%', '60%': its top; '50%': its middle),
 *  `shell` the shell's box as the tour measured it at open (its foot is the
 *  band's top).  Null where it covers no housing (it stays as it was); else
 *  { top (px), transform, maxHeight }.  Its height is CTL_CARD_H, never
 *  measured: the tour's card is a label, two lines and a row of buttons. */
export const CTL_CARD_H = 176;
export function ctlCardClear(box, at, shell) {
  if (!box || !shell || !(box.h > 0)) return null;
  const f = parseFloat(at) / 100;
  if (!(f >= 0)) return null;
  const w = Math.min(0.88 * box.w, 336);
  const top = f === 0.5 ? box.h / 2 - CTL_CARD_H / 2 : f * box.h;
  const sheet = (box.y + box.h) - (shell.top + shell.height);
  const got = tutorTop(box, sheet, { left: box.w / 2 - w / 2, top, width: w, height: CTL_CARD_H }, { ceil: 8 });
  if (!got.moved) return null;
  return { top: Math.round(got.top), transform: 'translateX(-50%)', maxHeight: got.cut > 0 ? CTL_CARD_H - got.cut : undefined };
}

guideArrowKeep(tutorKeep);

/* QA's probe (mp-tutorclear): the housings the rule clears, in the window's
   px, and the two messages a first minute may not bring on cue (a "Next:"
   toast, the Add to Home Screen card: iPhone Safari only, when quiet) */
if (typeof window !== 'undefined') {
  window.__btTutorClear = {
    keep: tutorKeep,
    say: (text) => storeToastBus.push(String(text)),
    install: () => installHintBus.open(),
  };
}
