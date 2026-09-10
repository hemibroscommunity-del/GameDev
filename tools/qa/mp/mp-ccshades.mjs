/* ═══ THE THUG LIFE SHADES ARE NOT BENT UPWARD (v2.3.2390) ═══
 *
 * Owner: "The current south idle black glasses view (I think thug life
 * glasses) doesn't look correct the lenses look bent upward."
 *
 * ── WHAT WAS ACTUALLY BENT, WHICH IS NOT WHAT WAS REPORTED ──
 * Not the lenses.  Measured off the source art, both lens rectangles run dead
 * level -- top at bbox row 9, bottom at 22 -- and they still do.  What bowed
 * was the SILHOUETTE: the two temple arms sat as short fat wedges fused to the
 * frame's outer top corners, nine rows tall against a fourteen-row lens, so
 * the piece's outer extremes were higher than its bridge.  Two raised corners
 * over a level middle is an upward bow, and the eye reports it as the lenses
 * bending because the wedge is fused to the lens and reads as part of it.
 *
 * That is why this scenario measures a TOP-EDGE PROFILE rather than looking
 * for a tilt.  A test that asked "are the two lenses level with each other"
 * would have been green throughout the entire defect.
 *
 * ── AND WHY IT TURNS THE FIGURE FIRST ──
 * The creator's preview opens on SOUTHWEST (characterPortrait's _DMAP default),
 * not south.  The owner's report is about the south idle, and southwest draws
 * its arm genuinely asymmetrically -- a long one on the near side, a short one
 * on the far -- so measuring the default facing reports a bow that is simply
 * the 3/4 view being a 3/4 view.  The first cut of this file did exactly that
 * and failed four assertions against art that was already fixed.  So the
 * figure is turned to south, and that it IS south is established from the BARE
 * body's own symmetry, which is evidence independent of the thing under test.
 *
 * ── AND WHY IT DIFFS TWO CAPTURES ──
 * The glasses have to be separated from the head before they can be measured,
 * and every colour heuristic for that is a guess: the head outline is near
 * black too, so is hair, so is a beard.  Capturing the same character with and
 * without the eyewear and subtracting gives the piece EXACTLY, with no
 * threshold to tune and nothing that goes quietly wrong when the default look
 * changes.  It also means this scenario measures what the renderer paints, not
 * what the PNG contains.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* The preview canvas is a 2D canvas (mp-ccstand reads it the same way), so its
   pixels are readable directly rather than through a screenshot round trip. */
const grab = (P) => P.page.evaluate(() => {
  const c = document.querySelector('.bt-cc-stage canvas');
  if (!c) return null;
  try {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    return { w: c.width, h: c.height, data: Array.from(d) };
  } catch (e) { return { err: String(e) }; }
});

const pickTab = (P, label) => P.page.evaluate((l) => {
  const b = [...document.querySelectorAll('.bt-cc-tab')]
    .find((x) => (x.textContent || '').trim() === l);
  if (!b) return false;
  b.click();
  return true;
}, label);

const pickTile = (P, title) => P.page.evaluate((t) => {
  const el = [...document.querySelectorAll('.bt-cc-strip > *')]
    .find((x) => (x.getAttribute('title') || '').toLowerCase() === t.toLowerCase());
  if (!el) {
    return { ok: false, saw: [...document.querySelectorAll('.bt-cc-strip > *')]
      .map((x) => x.getAttribute('title')) };
  }
  el.click();
  return { ok: true };
}, title);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Shades', wsPort, webPort,
    viewport: PHONE, touch: true, dpr: 2 });
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('.bt-cc-stage canvas', { timeout: 30000 });
  await P.page.waitForTimeout(2500);

  /* ── turn him to face us ──
     _PREVIEW_DIRS is clockwise from south and the preview starts on southwest,
     its last entry, so ONE step forward lands on south. */
  const stage = await P.page.evaluate(() => {
    const c = document.querySelector('.bt-cc-stage canvas');
    const r = c.getBoundingClientRect();
    return { mid: r.left + r.width / 2, y: r.top + r.height * 0.45 };
  });
  await P.page.mouse.move(stage.mid, stage.y);
  await P.page.mouse.down();
  await P.page.mouse.move(stage.mid + 40, stage.y, { steps: 4 });
  await P.page.mouse.up();
  await P.page.waitForTimeout(1200);

  const bare = await grab(P);
  rec.ok('the creator canvas is readable (guard)',
    !!bare && !bare.err && bare.w > 0, bare && { w: bare.w, h: bare.h, err: bare.err });
  if (!bare || bare.err) return;

  /* THE FACING, ESTABLISHED WITHOUT THE EYEWEAR.  A bare bro is left-right
     symmetric only face-on; every 3/4 and profile view leans.  Measured as the
     silhouette's per-column ink against its own mirror, over the HEAD band
     only -- the arms hang differently even on a front view. */
  const sym = (cap) => {
    const { w: W, h: Hh, data } = cap;
    let minX = W, maxX = -1, minY = Hh, maxY = -1;
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] < 40) continue;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    if (maxX < 0) return null;
    const yTop = minY, yBot = minY + Math.round((maxY - minY) * 0.28);   /* the head */
    const col = [];
    for (let x = minX; x <= maxX; x++) {
      let n = 0;
      for (let y = yTop; y <= yBot; y++) if (data[(y * W + x) * 4 + 3] >= 40) n++;
      col.push(n);
    }
    let err = 0, tot = 0;
    for (let i = 0; i < col.length; i++) {
      const j = col.length - 1 - i;
      err += Math.abs(col[i] - col[j]); tot += col[i];
    }
    return { asym: tot ? err / tot : 1, minX, maxX, minY, maxY };
  };
  const facing = sym(bare);
  console.log('    bare-body head asymmetry: ' + JSON.stringify(facing));
  rec.ok(`one drag turned him face-on, so this is the SOUTH view the report is `
       + `about (head asymmetry ${facing && facing.asym.toFixed(3)})`,
    !!facing && facing.asym < 0.06, facing);

  rec.ok('the Eyewear tab opened (guard)', await pickTab(P, 'Eyewear'), null);
  await P.page.waitForTimeout(600);
  const picked = await pickTile(P, 'Thug Life');
  rec.ok('Thug Life is in the catalogue and was picked (guard)', picked.ok === true, picked);
  await P.page.waitForTimeout(1800);

  const worn = await grab(P);
  rec.ok('...and the canvas is still readable after (guard)', !!worn && !worn.err, worn && worn.err);
  if (!worn || worn.err) return;

  /* ── the glasses, as the difference between the two captures ── */
  const W = bare.w, Hh = bare.h;
  const cols = new Array(W).fill(null);   /* per column: [topY, botY] of changed ink */
  let n = 0;
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const d = Math.abs(bare.data[i] - worn.data[i])
        + Math.abs(bare.data[i + 1] - worn.data[i + 1])
        + Math.abs(bare.data[i + 2] - worn.data[i + 2])
        + Math.abs(bare.data[i + 3] - worn.data[i + 3]);
      if (d < 40) continue;
      n++;
      if (!cols[x]) cols[x] = [y, y]; else cols[x][1] = y;
    }
  }
  const filled = cols.map((c, x) => c ? { x, top: c[0], bot: c[1] } : null).filter(Boolean);
  rec.ok(`putting the shades on changed the picture (guard: ${n} px over ${filled.length} columns)`,
    n > 200 && filled.length > 10, { n, cols: filled.length });
  if (filled.length < 10) return;

  const x0 = filled[0].x, x1 = filled[filled.length - 1].x, span = x1 - x0 + 1;
  /* Outer sixth at each end vs the middle third.  The wedges lived in the
     outer ~15% of the piece's width, so that is where a bow shows. */
  const edge = Math.max(1, Math.round(span / 6));
  const inSpan = (a, b) => filled.filter((c) => c.x >= a && c.x <= b);
  const topOf = (list) => Math.min(...list.map((c) => c.top));
  const leftTop  = topOf(inSpan(x0, x0 + edge - 1));
  const rightTop = topOf(inSpan(x1 - edge + 1, x1));
  const midTop   = topOf(inSpan(x0 + Math.round(span / 3), x1 - Math.round(span / 3)));
  const detail = { span, edge, leftTop, rightTop, midTop };
  console.log('    top-edge profile: ' + JSON.stringify(detail));

  /* THE ASSERTION.  A y ABOVE the middle's is a smaller number, so a bow up at
     the ends is leftTop/rightTop < midTop.  One pixel of slack: the frame's
     own end-caps are legitimately a touch taller than the lens, and the piece
     is drawn through a 0.912 scale that can land an edge either side of a row
     boundary.  The wedges cleared this by nine 256-space rows, so nothing about
     the tolerance makes the defect pass. */
  rec.ok(`the LEFT end does not rise above the middle of the frame `
       + `(left top ${leftTop}, middle top ${midTop})`,
    leftTop >= midTop - 1, detail);
  rec.ok(`the RIGHT end does not rise above the middle either `
       + `(right top ${rightTop}, middle top ${midTop})`,
    rightTop >= midTop - 1, detail);
  /* And the bow is symmetric when it happens, so catch it as a pair too: an
     edit that fixed one arm and not the other would pass one of the two above. */
  rec.ok('...so the frame\'s top edge does not bow upward at all',
    leftTop >= midTop - 1 && rightTop >= midTop - 1, detail);

  /* The lenses themselves were never the problem and must not become one:
     the two halves of the piece keep the same top edge as each other. */
  const halfL = topOf(inSpan(x0, x0 + Math.round(span / 2)));
  const halfR = topOf(inSpan(x1 - Math.round(span / 2), x1));
  rec.ok(`...and the two lenses sit level with each other (${halfL} vs ${halfR})`,
    Math.abs(halfL - halfR) <= 1, { halfL, halfR });

  /* The temple END-CAPS survive: the fix removes the raised wing, not the arm's
     hinge, so the piece must still be wider than its two lenses alone. */
  rec.ok(`the frame still reaches the temples (${span}px of canvas)`,
    span >= 20, { span, x0, x1 });

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/ccshades.png` }).catch(() => {});
  await P.ctx.close().catch(() => {});
}
