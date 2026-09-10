/* ═══ WHERE TWO PIECES OF EYEWEAR SIT ON THE FACE (v2.3.2395) ═══
 *
 * Owner, in one message:
 *   "In southwest view the eyeglass needs to hang off the eye more it's too
 *    far in the middle of the face"
 *   "Shrink the south view golden glasses a bit too"
 *
 * Both are claims about the piece's edge against the HEAD's edge, and both
 * were placement numbers in meta.json rather than art.
 *
 * ── THE MEASUREMENT PROBLEM THIS FILE EXISTS TO SOLVE ──
 * You cannot find the face's silhouette in a picture where the eyewear is
 * covering it.  Three attempts to measure the monocle's overhang statically
 * all failed for that reason or a cousin of it: one re-implemented the
 * renderer's placement arithmetic by hand and got a different answer from the
 * renderer (which is precisely what preload_headwear's own header warns a
 * hand-rolled preview is worth), and one measured the SKULL's widest point --
 * above the brow, where the head is wider -- and reported a piece that
 * visibly sat inside the face as sticking out of it.
 *
 * So: capture the character BARE, capture him WEARING the piece, and subtract.
 * The difference is the piece, exactly, with no colour threshold to tune; and
 * the BARE capture still has the face edge the piece is now covering, which is
 * the number the question actually turns on.  Same trick as mp-ccshades.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const grab = (P) => P.page.evaluate(() => {
  const c = document.querySelector('.bt-cc-stage canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  return { w: c.width, h: c.height, data: Array.from(d) };
});

const pickTab = (P, label) => P.page.evaluate((l) => {
  const b = [...document.querySelectorAll('.bt-cc-tab')].find((x) => (x.textContent || '').trim() === l);
  if (b) { b.click(); return true; }
  return false;
}, label);

const pickTile = (P, title) => P.page.evaluate((t) => {
  const el = [...document.querySelectorAll('.bt-cc-strip > *')]
    .find((x) => (x.getAttribute('title') || '').toLowerCase() === t.toLowerCase());
  if (!el) return { ok: false, saw: [...document.querySelectorAll('.bt-cc-strip > *')].map((x) => x.getAttribute('title')) };
  el.click();
  return { ok: true };
}, title);

/* The piece = worn minus bare.  The head = the BARE figure's own ink, taken
   over the piece's own row band so it is the face beside the piece and not
   the skull above it. */
const measure = (bare, worn) => {
  const { w: W, h: Hh } = bare;
  let pl = W, pr = -1, pt = Hh, pb = -1, n = 0;
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      let d = 0;
      for (let k = 0; k < 4; k++) d += Math.abs(bare.data[i + k] - worn.data[i + k]);
      if (d < 40) continue;
      n++;
      if (x < pl) pl = x; if (x > pr) pr = x;
      if (y < pt) pt = y; if (y > pb) pb = y;
    }
  }
  let hl = W, hr = -1;
  for (let y = pt; y <= pb; y++) {
    for (let x = 0; x < W; x++) {
      if (bare.data[(y * W + x) * 4 + 3] > 40) { if (x < hl) hl = x; break; }
    }
    for (let x = W - 1; x >= 0; x--) {
      if (bare.data[(y * W + x) * 4 + 3] > 40) { if (x > hr) hr = x; break; }
    }
  }
  return { piece: { l: pl, r: pr, t: pt, b: pb, w: pr - pl + 1, n }, head: { l: hl, r: hr, w: hr - hl + 1 } };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Fit', wsPort, webPort,
    viewport: PHONE, touch: true, dpr: 2 });
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('.bt-cc-stage canvas', { timeout: 30000 });
  await P.page.waitForTimeout(2500);

  /* ════ 1. THE MONOCLE, IN THE DEFAULT SOUTHWEST VIEW ════
     The creator opens on southwest (characterPortrait's _DMAP default), which
     is the facing the owner is talking about, so no drag is needed here. */
  const bareSW = await grab(P);
  rec.ok('the Eyewear tab opened (guard)', await pickTab(P, 'Eyewear'), null);
  await P.page.waitForTimeout(600);
  const gotMono = await pickTile(P, 'Golden Monocle');
  rec.ok('Golden Monocle is in the catalogue (guard)', gotMono.ok === true, gotMono);
  await P.page.waitForTimeout(1800);
  const wornSW = await grab(P);
  const m = measure(bareSW, wornSW);
  console.log('    monocle SW: ' + JSON.stringify(m));

  rec.ok(`putting the monocle on changed the picture (guard: ${m.piece.n}px)`, m.piece.n > 150, m);
  /* THE OWNER'S SENTENCE, as a number: it must HANG OFF, not sit inboard. */
  rec.ok(`the monocle hangs off the side of the head (piece left ${m.piece.l}, face left ${m.head.l})`,
    m.piece.l < m.head.l, m);
  const off = m.head.l - m.piece.l;
  /* 25%, and the number is load-bearing.  The placement the owner rejected as
     "too far in the middle of the face" ALREADY hung off by 14%, so a floor of
     12% -- which is what this assertion shipped with for one run -- passed the
     very state the fix exists to leave behind.  My own mutation check caught
     it: reverting the nudge turned the glasses assertions red and left this
     one green.  The fix measures 40%, so 25% sits clear of both. */
  rec.ok(`...by enough to read as hanging off (${off}px, ${Math.round(100 * off / m.piece.w)}% of the piece; the rejected placement managed 14%)`,
    off >= m.piece.w * 0.25, { off, piece: m.piece.w });
  /* ...and not so far that it has left the face behind. */
  rec.ok(`...while still resting ON him (${Math.round(100 * off / m.piece.w)}% off is under two thirds)`,
    off <= m.piece.w * 0.66, { off, piece: m.piece.w });

  /* ════ 2. THE GOLDEN GLASSES, TURNED TO SOUTH ════ */
  rec.ok('eyewear could be cleared (guard)', (await pickTile(P, 'None')).ok === true, null);
  await P.page.waitForTimeout(900);
  /* _PREVIEW_DIRS is clockwise from south and the preview starts on southwest,
     its last entry, so ONE step forward lands on south (TRAPS section 63). */
  const stage = await P.page.evaluate(() => {
    const r = document.querySelector('.bt-cc-stage canvas').getBoundingClientRect();
    return { mid: r.left + r.width / 2, y: r.top + r.height * 0.45 };
  });
  await P.page.mouse.move(stage.mid, stage.y);
  await P.page.mouse.down();
  await P.page.mouse.move(stage.mid + 40, stage.y, { steps: 4 });
  await P.page.mouse.up();
  await P.page.waitForTimeout(1400);

  const bareS = await grab(P);
  /* Prove it is the front view, from the BARE body's own symmetry -- evidence
     independent of the eyewear under test (TRAPS section 63 again). */
  const asym = await P.page.evaluate(() => {
    const c = document.querySelector('.bt-cc-stage canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let minX = c.width, maxX = -1, minY = c.height, maxY = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] < 40) continue;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const yBot = minY + Math.round((maxY - minY) * 0.28);
    const col = [];
    for (let x = minX; x <= maxX; x++) {
      let n = 0;
      for (let y = minY; y <= yBot; y++) if (d[(y * c.width + x) * 4 + 3] >= 40) n++;
      col.push(n);
    }
    let err = 0, tot = 0;
    for (let i = 0; i < col.length; i++) { err += Math.abs(col[i] - col[col.length - 1 - i]); tot += col[i]; }
    return tot ? err / tot : 1;
  });
  rec.ok(`one drag turned him face-on, so this is the SOUTH view (head asymmetry ${asym.toFixed(3)})`,
    asym < 0.06, { asym });

  const gotGG = await pickTile(P, 'Golden Glasses');
  rec.ok('Golden Glasses is in the catalogue (guard)', gotGG.ok === true, gotGG);
  await P.page.waitForTimeout(1800);
  const wornS = await grab(P);
  const g = measure(bareS, wornS);
  console.log('    golden glasses S: ' + JSON.stringify(g));

  rec.ok(`putting the glasses on changed the picture (guard: ${g.piece.n}px)`, g.piece.n > 150, g);
  /* "Shrink a bit" is not a size in isolation -- what made them read big was
     the frame reaching past the head on BOTH sides.  That is the property. */
  rec.ok(`the glasses no longer overhang his left (piece ${g.piece.l} vs face ${g.head.l})`,
    g.piece.l >= g.head.l, g);
  rec.ok(`...nor his right (piece ${g.piece.r} vs face ${g.head.r})`,
    g.piece.r <= g.head.r, g);
  /* And they are still GLASSES -- shrinking is a trim, not a vanishing act. */
  rec.ok(`...but still span most of the face (${Math.round(100 * g.piece.w / g.head.w)}% of its width)`,
    g.piece.w >= g.head.w * 0.6, { piece: g.piece.w, head: g.head.w });

  /* ── THE MONOCLE, SOUTH (v2.3.2411) ──────────────────────────────────────
     Owner: "The south facing monocle needs to be nudged a bit to the right
     too" -- "too" because v2.3.2395 had just moved the SOUTHWEST one for the
     same complaint.  crownNudge.south x went -12 -> -8.

     Both assertions are expressed against the HEAD SILHOUETTE rather than in
     canvas pixels, because canvas size follows the viewport (782px at 390x844,
     546px at 390x664) and a pixel threshold would pin the wrong thing.

     The two properties bracket the answer from opposite sides, which is what
     makes them worth having: at the old -12 the lens hung PAST the head and
     sat on the temple with the eye buried at its inner edge, and going too far
     the other way the rim crosses the face and covers the FAR eye.  -8 is the
     only value that satisfies both, and it was picked from a rendered
     ten-value sweep, not from arithmetic (see the note in the monocle's
     meta.json for the measured table). */
  const gotMS = await pickTile(P, 'Golden Monocle');
  rec.ok('Golden Monocle is in the catalogue (guard)', gotMS.ok === true, gotMS);
  await P.page.waitForTimeout(1800);
  const wornMS = await grab(P);
  const ms = measure(bareS, wornMS);
  const msInFrac = (ms.piece.l - ms.head.l) / ms.head.w;   /* + = inboard of the head edge */
  const msRightFrac = (ms.piece.r - ms.head.l) / ms.head.w; /* how far across the face the rim reaches */
  console.log('    monocle S: ' + JSON.stringify({ ...ms, msInFrac: +msInFrac.toFixed(3), msRightFrac: +msRightFrac.toFixed(3) }));

  rec.ok(`putting the monocle on changed the picture (guard: ${ms.piece.n}px)`, ms.piece.n > 150, ms);
  /* SIDE ONE: it is ON the face, not hanging off the temple.  At the rejected
     -12 the lens edge sat 2px OUTSIDE the silhouette, so this flips sign. */
  rec.ok(`the south monocle sits inboard of the head edge (piece ${ms.piece.l} vs face ${ms.head.l}, ${Math.round(msInFrac * 100)}% in)`,
    msInFrac > 0.02, { msInFrac, piece: ms.piece.l, head: ms.head.l });
  /* SIDE TWO: it has not crossed to the OTHER eye.  Measured: the far eye
     begins ~61% across the head at the eye row; -8 puts the rim at 59% and the
     rejected -6 at 63%, where it visibly clips the far eye's white. */
  rec.ok(`...and its rim stops short of the far eye (${Math.round(msRightFrac * 100)}% across, must stay under 61%)`,
    msRightFrac < 0.61, { msRightFrac, piece: ms.piece.r, head: ms.head });

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/ccfit.png` }).catch(() => {});
  await P.ctx.close().catch(() => {});
}
