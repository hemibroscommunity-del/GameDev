/* THE HAT PRESSES THE HAIR DOWN; IT DOES NOT SHAVE THE HEAD (v2.3.1993,
 * re-pinned to the preview's wide frame in v2.3.2001).
 *
 * Three owner reports off the character-design preview, all on the same
 * subsystem — the mask that carves hair away so it sits under a hat:
 *
 *   "Afro in bucket head looks good south and southwest but east by the ear
 *    looks like too much hair got erased where it meets the bucket outline"
 *   "Barb helm east and northeast hair isn't working right.  Giant bald spots"
 *   "Arabian headwear isn't working with hair mask"
 *
 * WHAT IS COUNTED, AND WHY IT IS NOT "hair pixels".
 * The mask is SUPPOSED to remove hair — that is the owner's own width rule
 * (v2.3.1957): an afro under a cap is pressed down, not left ballooning, and
 * the skin it leaves beside the cap is the point.  So "how much hair is gone"
 * says nothing; golden-bucket loses 44% of its visible hair on the facing the
 * owner called GOOD.  What separates a press from a bald spot is what is
 * BEHIND the pixel that lost its hair.  Four renders of the same figure make
 * that answerable without a single judgement call:
 *
 *     D  bald, bare-headed          the control
 *     B  haired, bare-headed        B != D  is exactly the hair
 *     C  bald, hatted               C != D  is exactly the hat
 *     A  haired, hatted             the thing under test
 *
 *   visible hair = (B!=D) & ~(C!=D)      hair with nothing drawn in front of it
 *   BALD         = visible hair where A==D and D is opaque
 *                  — the hair is gone AND the character's own head is showing
 *                    through, which is the defect in all three reports
 *
 * A colour classifier was deliberately not used (TRAPS #21: a loose filter
 * "confirms" things that are not on screen).  Every number here is a
 * before/after difference of four real renders of the same figure.
 *
 * WHY THE PREVIEW IS ZOOMED OUT, AND WHY THAT IS CHECKED RATHER THAN ASSUMED.
 * The creator's preview camera FRAMES THE HEAD on the hair and hat tabs, and
 * v2.3.1956 grows that frame until the whole head fits — so putting a hat on
 * MOVES THE CAMERA, and A and C would be photographed from a different
 * distance than B and D.  Every diff would then be garbage that still looked
 * like a picture of a bro.  Tapping the character toggles the zoomed-out
 * frame (v2.3.1307), for which `focusForCat` returns FOCUS_FULL — a frame
 * fitCrown leaves alone — so in that frame, and only in that frame, all four
 * renders share one camera whatever tab is open.
 *
 * ═══ v2.3.2001: AND THE FRAME IS RE-ESTABLISHED PER SHOT, NOT ONCE ═══
 * The first cut tapped once at the top of the run and wrote "no tab change can
 * move it" in this comment.  v2.3.1994 then made picking a category BE the
 * "aim the camera here" gesture (`pickPreviewCat` — setActiveCat plus
 * setPreviewZoom(false)), for an owner ask about the opening shot.  That is
 * correct product behaviour and it silently retired the invariant: every
 * pick() in this file zooms back IN, so the four comparison renders were taken
 * at three different framings and the arithmetic reported confident nonsense —
 * 45.66% bare scalp on bucket-hat south, whose mask had not been touched in
 * months.  Ten of fifteen assertions failed and NOT ONE of them was about the
 * masks.
 *
 * So the frame is now (1) re-established immediately before every read rather
 * than once, (2) TOGGLED ONLY WHEN IT NEEDS TO BE — a tap is a toggle, so a
 * blind tap is right half the time and inverts the bug the other half, and
 * (3) ASSERTED, per stored frame and again across the four of them.  The
 * readout is the canvas element's own inline `height`, which NameModal sets
 * straight from the frame preset (`_frame.h + '%'`): an exact string, not a
 * measurement, so no CSS transition can be caught mid-flight and no constant
 * has to be hardcoded here — the two values are learned by toggling once and
 * looking.  The class of bug being defended against is precisely a pinning
 * assumption that stopped holding without saying so, and the defence is that
 * the scenario now fails on the framing itself instead of blaming the art.
 *
 * THE GOOD FACINGS ARE ASSERTED TOO.  The owner named south and southwest as
 * correct on the bucket, so they are measured with the same threshold the
 * broken ones are: a fix that repairs east by loosening the mask everywhere
 * would light those up.  (Their mask PNGs are also byte-identical across this
 * change — golden-bucket rebuilt only east/north/northeast, and bucket-hat
 * not at all.)
 *
 * AND THE OPPOSITE FAILURE.  v2.3.1937 and v2.3.1974 are the reports in the
 * other direction — hair coming through the sides of a hat, hair standing on
 * top of a cowboy hat's crown.  `above` counts kept hair strictly above the
 * hat's topmost painted row, which is zero for every hat in the game and must
 * stay zero: a mask made generous enough to fix a bald spot by simply keeping
 * more is how that regression comes back.
 */
import * as H from './harness.mjs';

/* Catalogue display names — the trait tiles are found by their `title`
   (_thumbTile, BroTown.jsx), which is the same string a screen reader gets. */
const HAIR = 'Afro';                 /* big enough that the clip is the difference */
const REPORTED = [
  /* [tile title, facings the owner reported broken, facings he called good] */
  ['Golden Bucket', ['east'], ['south', 'southwest']],
  ['Barbarian Helmet', ['east', 'northeast'], ['south']],
  ['Arabian Robe', ['east'], ['south', 'southwest']],
];
const CONTROL = 'Bucket Hat';        /* measured clean before and after */
const DIRS = ['south', 'southeast', 'east', 'northeast', 'north', 'northwest', 'west', 'southwest'];

/* Bare scalp as a share of the hair the hat is not standing in front of.
   A RATIO rather than a pixel count, because the preview's pixel count is not
   a constant: this file zooms the stage out, which draws the figure ~2.8x
   larger than the resting frame does, and an absolute limit tuned against one
   of those is simply wrong against the other (the first cut of this file was,
   and read as two regressions that were not there).  A ratio is the same
   number at any size.
   Measured, worst case, over the sixteen hats in the sweep this came from:

       before   golden-bucket east 9.0%   barbarian east 21.7%
                barbarian northeast 36.9% arabian-robe east 21.9%
       after    0.11%                     0.57%
                0.29%                     0.10%
       and the facings the owner called GOOD, before AND after:
                golden-bucket south 0.71%, southwest 0.24%, barbarian south 0.16%

   2% sits an order of magnitude clear on both sides of the gap. */
const BALD_SHARE = 0.02;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Masked', wsPort, webPort,
    viewport: { width: 1100, height: 950 }, dpr: 3 });
  const page = P.page;

  await page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await page.click('[data-tut="login-create"]');
  await page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await page.waitForTimeout(2500);   /* the first composite fetches its sheets */

  /* ── the frame, read straight off the element that carries it ──
     NameModal writes the frame preset into the canvas's inline height
     (`_frame.h + '%'`), so this is an exact statement of which frame the
     stage is in — not a measurement that a 180ms CSS ease could catch
     halfway.  A tap is a pointer journey with no rotation in it, which is
     what a plain click is. */
  const frameId = () => page.evaluate(() => {
    const el = document.querySelector('canvas[title^="Live preview"]');
    return (el && el.style && el.style.height) || '';
  });
  const tapCanvas = async () => {
    await page.click('canvas[title^="Live preview"]');
    await page.waitForTimeout(260);   /* the height/bottom ease is 180ms */
  };

  const tab = async (t) => {
    await page.click(`button[role="tab"]:has-text("${t}")`);
    await page.waitForTimeout(120);
  };
  const pick = async (t, title) => {
    await tab(t);
    await page.click(`.bt-cc-strip button[title="${title}"]`, { timeout: 15000 });
  };
  /* ── THE PIXELS STAY IN THE PAGE ──
     The preview is a million pixels at this dpr, and the first draft of this
     file shipped all four frames of every measurement across the CDP bridge
     as JSON arrays of four million numbers each.  It worked and it took 17
     minutes.  Frames are kept in the page under __hm and only the COUNTS come
     back, which is a handful of integers per hat/facing. */
  const store = (slot) => page.evaluate((s) => {
    const el = document.querySelector('canvas[title^="Live preview"]');
    if (!el || !el.width) return null;
    const c = document.createElement('canvas');
    c.width = el.width; c.height = el.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(el, 0, 0);
    window.__hm = window.__hm || Object.create(null);
    window.__hm[s] = x.getImageData(0, 0, c.width, c.height);
    return c.width;
  }, slot);

  /* ── WAIT FOR THE PIXELS, NOT FOR A NUMBER OF MILLISECONDS ──
     Every read here is preceded by something that visibly changes the figure
     — a hat, a hairstyle, a facing — so "the preview has caught up" is a fact
     this file can check rather than guess: the fingerprint has to MOVE off the
     last one it returned, and then hold still for one poll.  Requiring the
     move is what makes it safe; a plain stability test is satisfied by the OLD
     frame, which is still on screen and perfectly still.
     The fingerprint is taken off a 64px thumbnail — enough to tell two
     composites apart, cheap enough to poll ten times a second.
     The ceiling is generous and, if it is ever hit, the read still happens: a
     wrong number is caught by the guard assertion below, a hang is not caught
     by anything. */
  const fp = () => page.evaluate(() => {
    const el = document.querySelector('canvas[title^="Live preview"]');
    if (!el || !el.width) return 'none';
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(el, 0, 0, 64, 64);
    const d = x.getImageData(0, 0, 64, 64).data;
    let a = 0, b = 0;
    for (let i = 0; i < d.length; i++) { a = (a + d[i]) | 0; b = (b + a) | 0; }
    return `${el.width}:${a}:${b}`;
  });
  let last = '';
  const settle = async () => {
    let prev = null;
    for (let i = 0; i < 40; i++) {           /* ≤ ~4s */
      const now = await fp();
      if (now !== last && now === prev) { last = now; return; }
      prev = now;
      await page.waitForTimeout(100);
    }
    last = prev;
  };
  /* ── v2.3.2001: THE WIDE FRAME, RE-ESTABLISHED AND THEN PROVED ──
     Learned rather than hardcoded: toggle once and look at what the two
     frames call themselves.  If the tap does not change the readout at all
     the tap is not landing, and that is a scenario failure worth saying out
     loud rather than a silent pass on garbage. */
  let WIDE = '', NARROW = '', calibrated = false;
  const calibrate = async () => {
    const a = await frameId();
    await tapCanvas();
    const b = await frameId();
    const num = (v) => parseFloat(v) || 0;
    if (!a || !b || a === b) return { a, b, ok: false };
    /* The wide frame is the taller one: NameModal gives the stage 92% of its
       height zoomed out against 54.5% at rest. */
    WIDE = num(a) > num(b) ? a : b;
    NARROW = WIDE === a ? b : a;
    calibrated = true;
    return { wide: WIDE, narrow: NARROW, ok: true };
  };
  /* A tap TOGGLES, so ask first.  Tapping blind is right half the time and
     inverts the problem the other half. */
  const wideFails = [];
  const ensureWide = async (why) => {
    if (!calibrated) return true;
    if ((await frameId()) !== WIDE) await tapCanvas();
    const got = await frameId();
    if (got !== WIDE) { wideFails.push(`${why}: frame ${got || 'none'} (wanted ${WIDE})`); return false; }
    return true;
  };
  /* Read the preview at rest, in the wide frame.  Both halves matter: the
     frame is what makes the four renders comparable, and settle() is what
     makes each one finished. */
  const shot = async (slot, why) => {
    await ensureWide(why);
    await settle();
    const w = await store(slot);
    return { w, frame: await frameId() };
  };

  let cur = 'southwest';
  const face = async (d) => {
    const n = (DIRS.indexOf(d) - DIRS.indexOf(cur) + 8) % 8;
    for (let i = 0; i < n; i++) { await page.click('button[title="Rotate left"]'); await page.waitForTimeout(150); }
    cur = d;
    await settle();
  };

  /* The whole comparison is arithmetic on the four stored frames, run in the
     page over the ImageData it already holds. */
  const classify = () => page.evaluate(() => {
    const S = window.__hm || {};
    const A = S.A, B = S.B, C = S.C, D = S.D;
    if (!A || !B || !C || !D) return null;
    const w = A.width, n = A.data.length / 4;
    if (B.width !== w || C.width !== w || D.width !== w
      || B.data.length !== A.data.length || C.data.length !== A.data.length
      || D.data.length !== A.data.length) return { mismatched: true };
    const T = 12;   /* per-channel tolerance: the blit is a non-integer upscale */
    const dif = (X, Y, i) => (Math.abs(X.data[i] - Y.data[i]) > T
      || Math.abs(X.data[i + 1] - Y.data[i + 1]) > T
      || Math.abs(X.data[i + 2] - Y.data[i + 2]) > T
      || Math.abs(X.data[i + 3] - Y.data[i + 3]) > T);
    let bald = 0, vis = 0, above = 0, hatTop = -1;
    for (let p = 0; p < n; p++) if (dif(C, D, p * 4)) { hatTop = Math.floor(p / w); break; }
    for (let p = 0; p < n; p++) {
      const i = p * 4;
      if (!dif(B, D, i) || dif(C, D, i)) continue;      /* not hair, or the hat covers it */
      vis++;
      if (!dif(A, D, i)) { if (D.data[i + 3] > 8) bald++; }            /* head showing through */
      else if (hatTop >= 0 && Math.floor(p / w) < hatTop) above++;     /* standing over the crown */
    }
    return { vis, bald, above, hatTop };
  });

  const hats = [...new Set(REPORTED.map((r) => r[0])), CONTROL];
  const facings = [...new Set(REPORTED.flatMap((r) => [...r[1], ...r[2]]))];
  const out = Object.create(null);   /* keyed by strings this file supplies, but the rule is the rule */

  /* v2.3.2001: learn the two frames before measuring anything, and say so if
     they cannot be told apart — every number below is taken in the wide one. */
  const cal = await calibrate();
  rec.ok('the preview\'s two framings are distinguishable and the tap toggles between them '
    + '(guard: without this every render below could be at a different camera)',
    cal.ok === true, cal);
  await ensureWide('calibration');

  for (const d of facings) {
    await face(d);
    await pick('Hair', 'None'); await pick('Hats', 'None');
    const fD = await shot('D', `${d} D`);
    await pick('Hair', HAIR);
    const fB = await shot('B', `${d} B`);
    for (const hat of hats) {
      await pick('Hats', hat);
      const fA = await shot('A', `${hat} ${d} A`);
      await pick('Hair', 'None');
      const fC = await shot('C', `${hat} ${d} C`);
      await pick('Hair', HAIR);
      const m = await classify();
      /* v2.3.2001: the framing of the four renders travels WITH the numbers,
         so a measurement taken at a camera that moved cannot be read as a
         statement about the art. */
      out[`${hat}|${d}`] = m && Object.assign(m, {
        frames: [fD.frame, fB.frame, fA.frame, fC.frame],
        widths: [fD.w, fB.w, fA.w, fC.w],
      });
    }
    await pick('Hats', 'None');
  }

  /* ══ v2.3.2001: THE FRAMING, ASSERTED BEFORE ANY NUMBER IS BELIEVED ══
     Two claims, and it takes both.  The first is that every read happened in
     the wide frame — the one whose camera does not move with the open tab.
     The second is that the four renders of a measurement agree with each
     other AND came back the same size; that is what makes subtracting them
     mean anything, and a camera that moved between them shows up here as
     either a different frame id or a different bitmap width.
     These are stated FIRST and separately from the art assertions on purpose:
     when v2.3.1994 moved the camera out from under this file, ten failures
     all pointed at masks that were fine.  A framing failure should read as a
     framing failure. */
  rec.ok('every render was taken in the wide frame, the one whose camera does not '
    + 'follow the open tab (v2.3.1994 made picking a category re-aim it)',
    wideFails.length === 0, { wanted: WIDE, narrow: NARROW, failed: wideFails.slice(0, 8) });
  const framed = Object.entries(out).filter(([, v]) => v
    && v.frames && v.frames.every((f) => f === v.frames[0])
    && v.widths && v.widths.every((x) => x && x === v.widths[0])
    && !v.mismatched);
  rec.ok('...and the four renders of each measurement share one frame and one size, '
    + 'which is what makes subtracting them mean anything',
    framed.length === Object.keys(out).length,
    Object.fromEntries(Object.entries(out)
      .filter(([, v]) => !v || !v.frames || v.mismatched
        || !v.frames.every((f) => f === v.frames[0])
        || !v.widths.every((x) => x && x === v.widths[0]))
      .map(([k, v]) => [k, v && { frames: v.frames, widths: v.widths, mismatched: v.mismatched }])));

  /* ── the guard: the measurement has to be able to SEE hair at all ── */
  const sane = Object.entries(out).filter(([, v]) => v && v.vis > 3000);
  rec.ok('every hat/facing rendered hair the hat is not standing in front of (guard: '
    + 'without this the bald counts below are trivially zero)',
    sane.length === Object.keys(out).length,
    Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v && v.vis])));

  /* ── the three reports ── */
  const clean = (m) => !!m && m.vis > 0 && (m.bald / m.vis) < BALD_SHARE;
  const say = (m) => (m ? { ...m, share: +(100 * m.bald / Math.max(1, m.vis)).toFixed(2) } : m);
  for (const [hat, broken, good] of REPORTED) {
    for (const d of broken) {
      const m = out[`${hat}|${d}`];
      rec.ok(`${hat} ${d}: the hat presses the hair down without baring the head`,
        clean(m), say(m));
    }
    for (const d of good) {
      const m = out[`${hat}|${d}`];
      rec.ok(`${hat} ${d}: ...and the facing the owner called good is still good`,
        clean(m), say(m));
    }
  }
  for (const d of facings) {
    const m = out[`${CONTROL}|${d}`];
    rec.ok(`${CONTROL} ${d}: the control hat, clean before this change and after it`,
      clean(m), say(m));
  }

  /* ── the opposite failure: nothing stands above the hat ── */
  /* Measured zero for every hat and facing, before this change and after it,
     so the bar is "a few stray pixels" rather than a tuned fraction. */
  const poking = Object.entries(out).filter(([, v]) => v && v.above > 50);
  rec.ok('no hat has hair standing above its own crown (v2.3.1937 / v2.3.1974)',
    poking.length === 0, Object.fromEntries(poking));

  await P.ctx.close().catch(() => {});
}
