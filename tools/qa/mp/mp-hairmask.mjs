/* THE HAT PRESSES THE HAIR DOWN; IT DOES NOT SHAVE THE HEAD (v2.3.1993).
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
 * WHY THE PREVIEW IS ZOOMED OUT FIRST.
 * The creator's preview camera FRAMES THE HEAD on the hair and hat tabs, and
 * v2.3.1956 grows that frame until the whole head fits — so putting a hat on
 * MOVES THE CAMERA, and A and C would be photographed from a different
 * distance than B and D.  Every diff would then be garbage that still looked
 * like a picture of a bro.  Tapping the character toggles the zoomed-out
 * frame (v2.3.1307), and `focusForCat` returns FOCUS_FULL for it whatever tab
 * is open — a frame fitCrown leaves alone — so all four renders share one
 * camera by construction and no tab change can move it.
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
  /* Zoom out and stay there — see the header.  A tap is a pointer journey with
     no rotation in it, which is what a plain click is. */
  await page.click('canvas[title^="Live preview"]');
  await page.waitForTimeout(600);

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
  /* Read the preview at rest.  The camera is pinned (see the header), so this
     is only ever waiting on the composite, never on a camera move. */
  const shot = async (slot) => { await settle(); return store(slot); };

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

  for (const d of facings) {
    await face(d);
    await pick('Hair', 'None'); await pick('Hats', 'None');
    await shot('D');
    await pick('Hair', HAIR);
    await shot('B');
    for (const hat of hats) {
      await pick('Hats', hat);
      await shot('A');
      await pick('Hair', 'None');
      await shot('C');
      await pick('Hair', HAIR);
      out[`${hat}|${d}`] = await classify();
    }
    await pick('Hats', 'None');
  }

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
