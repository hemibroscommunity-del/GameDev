/* ═══ v2.3.4084: ONE VISIBLE AREA OF WORLD, WHATEVER THE SCREEN ═══
 *
 * A design review the owner shared: "I'd consider establishing a consistent
 * maximum gameplay visibility range regardless of screen dimensions".  A wide
 * screen saw more of the world than an upright phone -- a sideways phone
 * 2078 x 960 game px (2.0M px^2), a 1920 x 1080 computer 1221 x 960 (1.5M
 * with the controls folded), against an upright phone's 643-843 x 1330
 * (0.86-1.12M, the dashboard folded or open) --
 * and in a game where seeing another player first is the fight, that is an
 * edge bought with a screen.  The owner chose: "Cap it for everyone now".
 *
 * THE RULE.  Every screen sees about the same AREA of world as an upright
 * phone: REF_W x REF_H, 850 x 1330 game px at the default zoom.  A screen that
 * would see more is zoomed IN until it sees that much:
 *
 *     scale = max(scale today, sqrt(canvas area / REF area))
 *
 * and no further than leaves its SHORT side SHORT_MIN (680) game px: past
 * that a sideways phone would be looking through a letterbox (the area rule
 * alone gives it ~1479 x 683; a still wider strip would go lower), so the
 * cap stops there and that screen keeps a little more area.  Upright phones
 * are UNCHANGED: they are the reference, so the area term never beats their
 * scale (a narrow phone sees less area already and is not zoomed out further
 * either: the cap only ever zooms in).  A SHORT upright phone with its
 * dashboard open (an iPhone SE's 667 pt) sits on the character floor at
 * 974 x 1158, 1.13M: inside the reference too, so it does not move either.
 *
 * ONE SCALE, NOT A SECOND CONSTRAINT.  worldViewport.js's header warns
 * against a height term fighting the width term.  This is not one: it is one
 * more floor in the same max() (like the zone's no-void floor and the
 * character floors), on the one scale both axes share, so the view keeps its
 * screen's shape and the camera and the renderer still read one number.  And
 * every tap, aim and overlay converts with S._worldScaleX/Y, which the
 * renderer publishes from this same scale (TRAPS §210), so they follow it.
 *
 * At ?zoom=k the reference grows with the view (0.77 / k each way), so the
 * zoom-out lever still compares what it did.
 *
 * The switch: on by default.  `?viewcap=0` turns it off for one tab
 * (`?viewcap=1` forces it on); the Test panel's row ("Memory savers", "Same
 * view for every screen", clientOff.js `viewcap`) turns it off for every
 * phone, live.  docs/specs/view-cap.md has the numbers per screen.
 *
 * No imports: node tests it (server/test/view-cap.test.mjs). */

/* the upright phone's view at VIEW_OUT 0.77: 1330 = 1024 / 0.77 (the
   reference zone's depth, worldViewport.js v2.3.2257), 850 the widest an
   upright phone sees with the dashboard OPEN (390x844: 843, 375x812: 850,
   430x932: 830; mp-landscape-view).  The first cut took 760 (half way to the
   folded 643) and zoomed the open 390x844 in by 5%, 843x1330 -> 801x1263:
   an upright phone is the reference, so it must not move */
export const VIEW_CAP = Object.freeze({
  REF_W: 850,
  REF_H: 1330,
  SHORT_MIN: 680,
  VIEW_OUT_REF: 0.77,   /* VIEW_OUT_DEFAULT, the zoom these were measured at */
});

/** The scale after the cap.  `scale` is the rule's scale before it, cssW/cssH
 *  the canvas in CSS px, `viewOut` the zoom-out in force (worldViewport's
 *  VIEW_OUT).  Only ever returns `scale` or larger. */
export function capViewScale(scale, cssW, cssH, viewOut) {
  if (!(cssW > 0 && cssH > 0 && scale > 0)) return scale;
  const k = viewOut > 0 ? VIEW_CAP.VIEW_OUT_REF / viewOut : 1;
  const refArea = (VIEW_CAP.REF_W * k) * (VIEW_CAP.REF_H * k);
  const areaScale = Math.sqrt((cssW * cssH) / refArea);
  const shortScale = Math.min(cssW, cssH) / (VIEW_CAP.SHORT_MIN * k);
  return Math.max(scale, Math.min(areaScale, shortScale));
}

/** Is the cap on for this tab?  `search` is location.search; `offFromPanel`
 *  the Test panel's word (clientOff('viewcap')).  `?viewcap=0` off, `?viewcap=1`
 *  on whatever the panel says, else on unless the panel turned it off. */
export function viewCapChoice(search, offFromPanel) {
  const m = /(?:^|[?&])viewcap=([01])(?:&|$)/.exec(typeof search === 'string' ? search : '');
  if (m) return m[1] === '1';
  return !offFromPanel;
}
