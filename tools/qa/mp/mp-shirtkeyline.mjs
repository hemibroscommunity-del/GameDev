/* THE TEE'S BLACK KEYLINES, ON THE CHARACTER PREVIEW (v2.3.1995).
 *
 * Owner, reviewing the character preview: "The shirt neckline south view has
 * too large of a black outline.  Northeast there's a big black outline where
 * the shirt meets the waistline.  Minor but Southwest his shoulders have a
 * pretty big black outline too."
 *
 * ── WHERE THE BLACK CAME FROM ──
 * Not from the artist.  tools/gear/seal-shirt-edges.mjs (v2.3.1873) fills thin
 * runs of "body visible, shirt absent" with the colour of the shirt pixel they
 * touch, and it measured those runs INSIDE the shirt's bounding box.  Every
 * one of the three spots the owner names is a garment OPENING — the neck hole,
 * the hem where the belly starts, the shoulder line where the body rises past
 * the sleeve — i.e. body that runs out of that box, so the clip made a long
 * run look short, it passed the "at most 2px" sliver test, and it was filled
 * from the pixel it touched, which at an opening is the tee's own black
 * keyline.  Measured on the shipped sheets: of 6267 pixels that pass wrote,
 * 4176 were near-black.  v2.3.1995 measures each run across the whole frame
 * and keeps writing only inside the box, which leaves openings alone.
 *
 * ── WHAT THIS SCENARIO CHECKS ──
 * 1. THE ART, at the three named spots, in the sheets as they ship: the
 *    thickness of the near-black band along the shirt's edge, per column.  The
 *    artist's line is 1px on every column in these windows; v2.3.1873 made it
 *    3px; the gate is 2px, so the defect cannot come back without failing.
 * 2. THE OPENINGS ARE STILL OPEN, on all five stand sheets, counted as
 *    near-black opaque pixels per sheet against the numbers this shipped with.
 *    A seal that compounds (running the tool on already-sealed art — see its
 *    header) shows up here as black going UP.
 * 3. THE PREVIEW ITSELF, photographed.  The owner is looking at the creator's
 *    live preview, which is the one surface that MAGNIFIES these 128px frames,
 *    and it loads the shirt sheet by its own URL (characterPortrait.js) rather
 *    than through gearSheets — so this photographs that surface at the three
 *    directions, in both of its framings, and measures how much of the drawn
 *    tee is near-black.  The tee is isolated by drawing the same figure with
 *    and without it: the pixels that differ ARE the shirt, so the number
 *    cannot be polluted by hair, eyes or a trouser edge.
 *
 * Crops land in tools/qa/mp/out/keyline-<dir>-close.png (the default framing,
 * which is what the owner is looking at) and -full.png (tapped out to the
 * whole figure, which is where the hem is).
 */
import * as H from './harness.mjs';

/* The three spots, in frame-local pixel columns of the 128px stand frames.
   Read off the sheets: each window is columns where the artist drew a 1px
   line and v2.3.1873 left 2-3.  `edge` says which side of the garment the
   line is on — 'top' counts down from the column's topmost opaque pixel,
   'bottom' counts up from its lowest. */
const SPOTS = [
  { name: 'south neckline', dir: 'south', edge: 'top', cols: [61, 66],
    was: 3, orig: 1 },
  { name: 'northeast waistline', dir: 'northeast', edge: 'bottom', cols: [54, 60],
    was: 3, orig: 1 },
  { name: 'southwest far shoulder', dir: 'southwest', edge: 'top', cols: [68, 70],
    was: 3, orig: 1 },
  { name: 'southwest near shoulder', dir: 'southwest', edge: 'top', cols: [60, 60],
    was: 3, orig: 1 },
];

/* Near-black opaque pixels per stand sheet.  Three numbers each, measured:
   the artist's pre-seal art, v2.3.1873's sealed art, and what ships now —
   south 75/96/82, southwest 92/114/105, east 63/75/68, northeast 85/110/86,
   north 71/98/78.  The budget is what ships plus 4px of slack for a small art
   tweak; every one of v2.3.1873's numbers is over it, and a compounding
   re-seal (running the tool on already-sealed art — see its header) adds more
   still, so both failures are caught. */
const BLACK_BUDGET = { south: 86, southwest: 109, east: 72, northeast: 90, north: 82 };

/* The same question asked of the DRAWN figure rather than the sheet: what
   share of the tee's own pixels in the creator preview are near-black.
   PREVIEW_WAS is what v2.3.1873's art drew, the budget is what ships plus
   ~1 point. */
const PREVIEW_WAS = { south: 12.4, northeast: 16.3, southwest: 12.6 };
const PREVIEW_BUDGET = { south: 11.5, northeast: 14.0, southwest: 12.2 };

/* Measure a sheet in the page (canvas is the only decoder here). */
async function sheetStats(page, dataUrl) {
  return page.evaluate(async (src) => {
    const i = new Image();
    await new Promise((r, j) => { i.onload = r; i.onerror = j; i.src = src; });
    const c = document.createElement('canvas');
    c.width = i.width; c.height = i.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(i, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const W = c.width, Hh = c.height;
    const lum = (k) => 0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2];
    const dark = (x, y) => { const k = (y * W + x) * 4; return d[k + 3] > 40 && lum(k) < 70; };
    const opaque = (x, y) => d[((y * W + x) * 4) + 3] > 40;
    let black = 0;
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (dark(x, y)) black++;
    /* per-column edge-keyline thickness, both edges */
    const top = [], bottom = [];
    for (let x = 0; x < W; x++) {
      const ys = [];
      for (let y = 0; y < Hh; y++) if (opaque(x, y)) ys.push(y);
      if (!ys.length) { top.push(-1); bottom.push(-1); continue; }
      let n = 0;
      for (const y of ys) { if (dark(x, y)) n++; else break; }
      top.push(n);
      n = 0;
      for (let k = ys.length - 1; k >= 0; k--) { if (dark(x, ys[k])) n++; else break; }
      bottom.push(n);
    }
    return { black, top, bottom, w: W, h: Hh };
  }, dataUrl);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const repo = path.resolve(H.REPO);
  const outDir = `${repo}/tools/qa/mp/out`;
  try { fs.mkdirSync(outDir, { recursive: true }); } catch (e) { /* exists */ }

  /* A player who is WEARING the tee, in white — the colour that shows a black
     keyline for exactly what it is.  Seeded through the cosmetic stores the
     way mp-cosmrelay does, then reloaded so the catalogs read it at module
     load, which is the path a returning player takes. */
  const P = await H.newPlayer(browser, {
    name: 'Keyline', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 3,
  });
  await P.page.evaluate(() => {
    localStorage.setItem('bt-shirt', 'tshirt');
    localStorage.setItem('bt-shirtcolor', 'white');
  });
  await P.page.reload({ waitUntil: 'domcontentloaded' });

  /* ── 1 + 2: the art as it ships ── */
  const stats = Object.create(null);
  for (const dir of ['south', 'southwest', 'east', 'northeast', 'north']) {
    const f = `${repo}/public/sprites/gear/shirt/tshirt/stand-${dir}.png`;
    if (!fs.existsSync(f)) { rec.ok(`stand-${dir} sheet exists (guard)`, false, { f }); continue; }
    stats[dir] = await sheetStats(P.page, 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'));
  }
  rec.ok('all five stand sheets were measured (guard)',
    ['south', 'southwest', 'east', 'northeast', 'north'].every((d) => stats[d] && stats[d].w === 128),
    Object.keys(stats).map((d) => `${d}:${stats[d] && stats[d].w}`).join(' '));

  for (const s of SPOTS) {
    const st = stats[s.dir];
    if (!st) continue;
    const arr = s.edge === 'top' ? st.top : st.bottom;
    let worst = 0, at = -1;
    for (let x = s.cols[0]; x <= s.cols[1]; x++) if (arr[x] > worst) { worst = arr[x]; at = x; }
    rec.ok(`${s.name}: the tee's black edge is ${worst}px, not a band (artist drew ${s.orig}, v2.3.1873 left ${s.was})`,
      worst <= 2, { worstPx: worst, atColumn: at, cols: s.cols, perColumn: arr.slice(s.cols[0], s.cols[1] + 1) });
  }

  for (const dir of Object.keys(BLACK_BUDGET)) {
    const st = stats[dir];
    if (!st) continue;
    rec.ok(`stand-${dir}: near-black pixels within budget (${st.black} <= ${BLACK_BUDGET[dir]}) — the openings are still open`,
      st.black <= BLACK_BUDGET[dir], { black: st.black, budget: BLACK_BUDGET[dir] });
  }

  /* ── 3: the creator's live preview, photographed at the three directions ──
   *
   * The preview is the surface the report came from, and it is the one that
   * MAGNIFIES these 128px frames — its canvas is a 256px bitmap CSS-upscaled
   * with `image-rendering: pixelated`, so one art pixel is a visible block and
   * the collar's 1px line is a line while a 3px one is a bar.
   *
   * The figure is photographed in BOTH framings: the default close one (what
   * the owner is looking at — head, collar, shoulders) and the tapped-out one
   * (the whole figure, which is where the hem is).
   *
   * The measurement isolates the SHIRT rather than guessing at geometry: the
   * same figure is drawn once with the tee and once with shirt 'none', and the
   * pixels that differ ARE the shirt.  Near-black inside that set is the tee's
   * own keyline and nothing else — no hair, no eyes, no trouser edge.
   */
  const DIRS = ['south', 'southeast', 'east', 'northeast', 'north', 'northwest', 'west', 'southwest'];
  const WANT = ['south', 'northeast', 'southwest'];

  /* One pass = one page load with one shirt setting, visiting the three
     directions.  Two passes rather than clicking the shirt tiles between
     shots: the catalogs read their store at module load (mp-cosmrelay), so a
     reload is the honest way to change what the figure is wearing. */
  const pass = async (shirt) => {
    await P.page.evaluate((s) => { localStorage.setItem('bt-shirt', s); }, shirt);
    await P.page.reload({ waitUntil: 'domcontentloaded' });
    await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
    await P.page.click('[data-tut="login-create"]');
    await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
    /* the figure has to be painted before any of this means anything (the
       same guard mp-ccload uses) */
    let painted = 0;
    for (let i = 0; i < 60; i++) {
      painted = await P.page.evaluate(() => {
        const el = document.querySelector('canvas[title^="Live preview"]');
        if (!el || !el.width) return -1;
        const c = document.createElement('canvas');
        c.width = el.width; c.height = el.height;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(el, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let k = 3; k < d.length; k += 4) if (d[k] > 32) n++;
        return n;
      });
      if (painted > 400) break;
      await P.page.waitForTimeout(150);
    }
    rec.ok(`the creator painted a character wearing "${shirt}" (guard)`, painted > 400, { pixels: painted, shirt });

    const shot = async (tag) => {
      const box = await P.page.evaluate(() => {
        const el = document.querySelector('canvas[title^="Live preview"]');
        const r = el.getBoundingClientRect();
        return { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)),
          width: Math.round(r.width), height: Math.round(r.height) };
      });
      await P.page.screenshot({ path: `${outDir}/${tag}.png`, clip: box });
    };
    /* the 256px bitmap itself, straight out of the canvas — no CSS scale in
       the numbers */
    const bitmap = () => P.page.evaluate(() => {
      const el = document.querySelector('canvas[title^="Live preview"]');
      if (!el || !el.width) return null;
      const c = document.createElement('canvas');
      c.width = el.width; c.height = el.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(el, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      return { w: c.width, h: c.height, px: Array.from(d) };
    });

  /* ═══ v2.3.2006: ROTATE BY DRAG — THE CIRCLES ARE GONE ═══
       Owner removed the two rotate buttons ("just keep behavior for using
       finger to turn"), so this drives the gesture that remains.  It is also
       the better probe: the drag IS the control now, and a scenario that
       rotated through a button was not exercising it at all.

       The handler (NameModal's canvas) steps ONE facing per 26px of travel and
       re-bases its origin each step, so a single 40px move is exactly one step
       clockwise -- the same direction the "Rotate left" button gave.  The move
       must land in one go: two 20px moves would each fall under the threshold
       and rotate nothing.  pointerup with the drag flag set is NOT a tap, so
       this does not toggle the zoom the way a click on the canvas would. */
    const rotateOnce = async (pg) => {
      const c = await pg.$('canvas[title^="Live preview"]');
      if (!c) throw new Error('no preview canvas to drag');
      const b = await c.boundingBox();
      const y = b.y + b.height / 2, x0 = b.x + b.width / 2 - 20;
      await pg.mouse.move(x0, y);
      await pg.mouse.down();
      await pg.mouse.move(x0 + 40, y);
      await pg.mouse.up();
      await pg.waitForTimeout(150);
    };

    /* ═══ v2.3.2006: THE FRAME IS ASKED FOR, NOT ASSUMED ═══
       This used to blind-tap the canvas to toggle between the close frame and
       the whole-figure one.  A blind toggle only works if you already know
       which state you are in, and two changes broke that: v2.3.1994 made
       picking a trait category re-aim the camera, and v2.3.2006 made ROTATION
       a drag on this very canvas.  The measured cost of assuming: the south
       shot came back 46773 shirt pixels against this morning's 41601 -- the
       same tee, photographed at a different size, silently.

       Same shape as mp-hairmask's fix: read the frame, tap only if it is not
       the one wanted, and fail loudly if the tap did not take.  The stage's
       inline height is written straight from NameModal's frame preset, so it
       is an exact string ("92%" wide, "54.5%" at rest) rather than a measured
       box that a mid-animation read could catch between values. */
    const frameId = () => P.page.evaluate(() => {
      const c = document.querySelector('canvas[title^="Live preview"]');
      const st = c && c.closest('[style*="height"]');
      return (c && c.style.height) || (st && st.style.height) || '';
    });
    const tapCanvas = async () => {
      await P.page.click('canvas[title^="Live preview"]');
      await P.page.waitForTimeout(420);
    };
    /* v2.3.2021: a CONSTANT frame is a pass, and a better one — see the long
       note in mp-hairmask.mjs.  This file's shots must all be taken at one
       framing (an unnoticed re-aim cost it 46773 shirt pixels against the
       morning's 41601, same tee, silently).  Since the per-category close-up
       was retired on every tab but eyes, the framing on the tabs used here no
       longer moves, so the invariant now holds by construction.  ensureFrame()
       still checks every shot against the pinned frame, so nothing is
       softened; the tap simply stopped being needed to get there. */
    let WIDE = '', NARROW = '', CONSTANT = false;
    {
      const a = await frameId();
      await tapCanvas();
      const b = await frameId();
      const num = (v) => parseFloat(v) || 0;
      if (a && b && a !== b) { WIDE = num(a) > num(b) ? a : b; NARROW = WIDE === a ? b : a; }
      else if (a && b) { WIDE = a; CONSTANT = true; }
      rec.ok('the preview framing is pinned before anything is measured (guard)',
        !!WIDE, { a, b, WIDE, NARROW, constant: CONSTANT });
    }
    const ensureFrame = async (want, why) => {
      if (!WIDE) return;
      /* With one frame there is nothing to toggle to, so every request
         resolves to it and the tap is skipped.  The `close` call below is only
         ever a SCREENSHOT for a human — the measurement (bitmap()) is taken
         after the WIDE call, which is the frame the two passes have to share.
         So a constant camera costs this file a redundant close-up artifact and
         nothing else. */
      const target = CONSTANT ? WIDE : want;
      if (!CONSTANT && (await frameId()) !== target) await tapCanvas();
      const got = await frameId();
      if (got !== target) rec.ok(`frame for ${why}`, false, { got, want: target, constant: CONSTANT });
    };

    let facing = 'southwest';
    const out = Object.create(null);
    for (const want of WANT) {
      while (facing !== want) {
        /* v2.3.2006: a rightward drag steps clockwise through DIRS, which is
           what the retired "Rotate left" button did. */
        await rotateOnce(P.page);
        facing = DIRS[(DIRS.indexOf(facing) + 1) % DIRS.length];
      }
      await ensureFrame(NARROW, `${want} close`);
      await P.page.waitForTimeout(450);
      if (shirt !== 'none') await shot(`keyline-${want}-close`);
      /* The whole-figure frame is where the hem is, and it is also the frame
         the two passes must SHARE for their difference to mean anything. */
      await ensureFrame(WIDE, `${want} full`);
      await P.page.waitForTimeout(400);
      if (shirt !== 'none') await shot(`keyline-${want}-full`);
      out[want] = await bitmap();
    }
    return out;
  };

  const bare = await pass('none');
  const worn = await pass('tshirt');

  for (const want of WANT) {
    const a = bare[want], b = worn[want];
    if (!a || !b || a.w !== b.w) { rec.ok(`preview ${want}: both passes returned a bitmap (guard)`, false, { a: !!a, b: !!b }); continue; }
    let shirtPx = 0, blackPx = 0;
    for (let i = 0; i < a.w * a.h; i++) {
      const k = i * 4;
      const changed = Math.abs(a.px[k] - b.px[k]) > 8 || Math.abs(a.px[k + 1] - b.px[k + 1]) > 8
        || Math.abs(a.px[k + 2] - b.px[k + 2]) > 8 || Math.abs(a.px[k + 3] - b.px[k + 3]) > 8;
      if (!changed || b.px[k + 3] <= 40) continue;
      shirtPx++;
      if (0.299 * b.px[k] + 0.587 * b.px[k + 1] + 0.114 * b.px[k + 2] < 70) blackPx++;
    }
    const pct = shirtPx ? +(100 * blackPx / shirtPx).toFixed(1) : -1;
    /* Measured on the drawn figure in a white tee, black as a share of the
       tee's OWN pixels.  v2.3.1873's sheets: 12.4% south, 16.3% northeast,
       12.6% southwest.  The corrected sheets: 10.6 / 13.1 / 11.7.  The budgets
       below sit between the two pairs with about a point of headroom each —
       the composite is deterministic (same art, same 256px bitmap), so this is
       a threshold, not a tolerance. */
    rec.ok(`preview facing ${want}: the tee's own black is ${pct}% of it, not a keyline bar`
      + ` (v2.3.1873 drew ${PREVIEW_WAS[want]}%)`,
      pct >= 0 && pct <= PREVIEW_BUDGET[want], { shirtPixels: shirtPx, blackPixels: blackPx, blackPct: pct, budget: PREVIEW_BUDGET[want] });
  }

  await P.ctx.close().catch(() => {});
}
