/* ═══ A PLACED DESIGN CAN BE DRAGGED OFF THE EDGE (v2.3.2463) ═══
 *
 * Owner: "the design is maximized to fit the area so when you go to move it
 * nothing happens because it can't move outside the drawing area.  Can you make
 * it so that any design can move away from the drawn area so that you can see
 * predesigns move once you've placed them but just cut off the portion that's
 * not on the drawable grid?"
 *
 * WHY THIS IS ITS OWN FILE AND NOT THREE MORE LINES IN mp-designs.  That
 * scenario ends by proving ONE tap of Undo takes a whole placement away, which
 * is a claim about how many history entries the placement banked -- so every
 * gesture added before it changes what it is measuring.  These assertions need
 * several drags, and they need a design that is still MAXIMISED (the owner's
 * case is precisely the untouched, whole-grid box), which mp-designs has
 * already resized away by the time it gets there.
 *
 * WHAT IS BEING DEFENDED, and why each half can fail on its own:
 *   1. THE DRAG DOES SOMETHING.  This is the report.  A design lands covering
 *      all 16x16 and the old translation clamp ("the box must stay wholly on
 *      the grid") worked out to exactly zero for it -- a dead drag, not a stiff
 *      one, and indistinguishable from a dead editor.
 *   2. THE PART THAT LEAVES IS CUT OFF, not wrapped, not squashed, and not
 *      re-sampled.  A clip that re-sampled would still "move" and would show
 *      the WRONG PART of the picture, which no assertion on the box alone can
 *      see.  So this reads the 256-character art string cell by cell and
 *      compares it against the catalogue's own art, shifted.
 *   3. IT SURVIVES A RELOAD.  The op blob is sanitised on the way back in and
 *      an off-grid box used to be refused there -- which drops the op silently,
 *      so the drawing would come back un-moved with nothing to see.
 *   4. IT CAN COME BACK.  Something dragged off and unreachable is worse than
 *      something that would not move.
 *   5. THE HANDLE IS STILL REACHABLE once the corner it sits on is off the
 *      grid, and grabbing it does not slam the box to the finger.
 */
import * as H from './harness.mjs';
import { DESIGN_CATALOG } from '../../../src/rendering/traits/designCatalog.js';
import { sanitizeOp } from '../../../src/rendering/traits/artOps.js';

const BLANK = '0'.repeat(256);

const openCreator = async (P) => {
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await P.page.waitForTimeout(2400);
};

const openPaint = async (P) => {
  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-cc-tabs .bt-cc-tab')]
      .find((x) => (x.textContent || '').trim() === 'Skin');
    if (b) b.click();
  });
  await P.page.waitForTimeout(600);
  await P.page.click('button.bt-cc-ink-pane');
  await P.page.waitForSelector('.bt-paint', { timeout: 15000 });
  await P.page.waitForTimeout(500);
};

const art = (P) => P.page.evaluate(() => localStorage.getItem('bt-tattooart') || '')
  .then((v) => (v.length === 256 ? v : BLANK));
const ops = (P) => P.page.evaluate(() => {
  const b = JSON.parse(localStorage.getItem('bt-artops') || '{}');
  return (b.tattoo && b.tattoo.o) || [];
});

/* Drag cell -> cell on the editor's grid, through __btInkAim, exactly as
   mp-designs does: the editor draws on the FIGURE, so a cell is a cell of the
   region's projected grid and not a fraction of the canvas. */
async function dragOnCanvas(P, fromCell, toCell) {
  const ok = await P.page.evaluate(({ f, t }) => {
    const cv = document.querySelector('.bt-bodyink-cv');
    const aim = cv && cv.__btInkAim;
    if (!cv || !aim) return false;
    const a = Object.keys(aim).map((k) => aim[k]).find((v) => v && v.target === 'tattoo');
    if (!a || !(a.gw > 0)) return false;
    const r = cv.getBoundingClientRect();
    const kx = r.width / cv.width, ky = r.height / cv.height;
    const pt = (c) => ({
      x: r.left + (a.gx0 + ((c[0] + 0.5) * a.gw) / 16) * kx,
      y: r.top + (a.gy0 + ((c[1] + 0.5) * a.gh) / 16) * ky,
    });
    const p0 = pt(f), p1 = pt(t);
    const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const ev = (type, p) => cv.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, composed: true,
      pointerId: 7, pointerType: 'touch', isPrimary: true,
      clientX: p.x, clientY: p.y, buttons: type === 'pointerup' ? 0 : 1 }));
    ev('pointerdown', p0); ev('pointermove', mid); ev('pointermove', p1); ev('pointerup', p1);
    return true;
  }, { f: fromCell, t: toCell });
  await P.page.waitForTimeout(500);
  return ok;
}

/** Which columns of a 256-char drawing carry ink. */
const inkedCols = (a) => {
  const out = [];
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      if (a[y * 16 + x] !== '0') { out.push(x); break; }
    }
  }
  return out;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const tag = 'offgrid';
  const P = await H.newPlayer(browser, {
    name: 'Slider', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });

  await openCreator(P);
  await openPaint(P);

  /* A design with ink in EVERY column, so "the columns that left are empty" is
     a claim with something to lose -- a sparse design could pass it by having
     had nothing there in the first place. */
  const target = DESIGN_CATALOG.find((d) => inkedCols(d.art).length === 16)
    || DESIGN_CATALOG.slice().sort((a, b) => inkedCols(b.art).length - inkedCols(a.art).length)[0];
  const cols0 = inkedCols(target.art);
  rec.ok(`${tag}: the catalogue has a design wide enough to measure a clip with `
    + `("${target.name}", ink in ${cols0.length}/16 columns)`, cols0.length >= 12,
    { name: target.name, cols: cols0.length });

  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-paint-note button')]
      .find((x) => /designs/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await P.page.waitForTimeout(700);
  await P.page.evaluate((name) => {
    const s = [...document.querySelectorAll('.bt-modal-scrim')];
    const g = s[s.length - 1];
    const t = [...g.querySelectorAll('button')]
      .find((b) => b.querySelector('canvas') && (b.textContent || '').trim() === name);
    if (t) t.click();
  }, target.name);
  await P.page.waitForTimeout(900);

  const placed = (await ops(P))[0];
  rec.ok(`${tag}: it lands as one design op covering the WHOLE grid -- which is `
    + `the owner's case: a box with nowhere to go`,
    !!placed && placed.k === 'd' && placed.a.join(',') === '0,0,15,15', { placed: placed && placed.a });
  const artAfterPlace = await art(P);
  rec.ok(`${tag}: ...and the canvas is the design, unmoved (guard)`,
    artAfterPlace === target.art, { same: artAfterPlace === target.art });

  /* ── 1. THE DRAG DOES SOMETHING ──────────────────────────────────────────
     12 cells left.  The old clamp gave exactly 0 here however far you dragged,
     because the box is already the whole grid. */
  const SHIFT = 12;
  const dragged = await dragOnCanvas(P, [SHIFT, 8], [0, 8]);
  rec.ok(`${tag}: the drag reached the editor (guard)`, dragged);
  const movedBox = (await ops(P))[0].a.slice();
  rec.ok(`${tag}: dragging a MAXIMISED design moves it -- it used to be pinned `
    + `by a clamp that worked out to zero for a full-grid box `
    + `(0,0,15,15 -> ${movedBox.join(',')})`,
    movedBox[0] === -SHIFT && movedBox[2] === 15 - SHIFT, { movedBox });

  /* ── 2. THE PART THAT LEFT IS CUT OFF, AND THE REST IS THE RIGHT PART ────
     With the box at x0 = -12, grid column c shows the design's column c + 12,
     and columns 4..15 have nothing over them at all. */
  const moved = await art(P);
  const liveCols = inkedCols(moved);
  rec.ok(`${tag}: the columns the design no longer covers are EMPTY -- the part `
    + `off the grid is cut off, not wrapped round (inked columns: `
    + `${liveCols.join(',') || 'none'})`,
    liveCols.every((c) => c <= 15 - SHIFT), { liveCols, expectMax: 15 - SHIFT });

  let wrong = 0, checked = 0;
  for (let x = 0; x <= 15 - SHIFT; x++) {
    for (let y = 0; y < 16; y++) {
      const src = target.art[y * 16 + (x + SHIFT)];
      const got = moved[y * 16 + x];
      checked++;
      /* index 0 and a digit past the palette both paint nothing (designGroups),
         so compare "is there ink" plus the colour when there is. */
      const wantInk = src !== '0' && parseInt(src, 16) < 16;
      if (wantInk ? got !== src : got !== '0') wrong++;
    }
  }
  rec.ok(`${tag}: and what is still on the grid is the RIGHT part of the picture `
    + `-- column c shows the design's column c+${SHIFT}, cell for cell `
    + `(${checked - wrong}/${checked})`, wrong === 0, { wrong, checked });

  /* ── 3. IT CAN COME BACK ─────────────────────────────────────────────────
     The move keeps at least one column on the grid precisely so there is always
     something to grab; this is that promise, exercised.  Grabbed at cell 1,
     which is over the sliver that is still showing. */
  const back = await dragOnCanvas(P, [1, 8], [13, 8]);
  rec.ok(`${tag}: the drag back reached the editor (guard)`, back);
  const backBox = (await ops(P))[0].a.slice();
  rec.ok(`${tag}: a design dragged off the edge can be dragged back on -- it `
    + `keeps a sliver on the grid to be grabbed by `
    + `(${movedBox.join(',')} -> ${backBox.join(',')})`,
    backBox[0] > movedBox[0], { movedBox, backBox });

  /* ── 4. THE HANDLE IS STILL THERE ────────────────────────────────────────
     Its corner is the box's far corner, which goes off the grid the moment the
     box is dragged RIGHT -- so it is drawn PINNED onto the grid edge, and the
     grab carries the difference so the box does not snap to the finger. */
  await dragOnCanvas(P, [4, 8], [13, 8]);
  const rightBox = (await ops(P))[0].a.slice();
  rec.ok(`${tag}: pushed right, the box's far corner is off the grid `
    + `(${rightBox.join(',')})`, rightBox[2] > 15, { rightBox });
  /* Grab the handle where it is DRAWN -- the grid's own corner cell -- and pull
     it in.  If the pinned handle were unreachable this would be read as a move
     (the whole box would shift and its near corner would move with it); if the
     grab offset were missing the far corner would SNAP to the finger instead of
     coming in by what the finger travelled. */
  const beforeH = (await ops(P))[0].a.slice();
  await dragOnCanvas(P, [15, 15], [11, 11]);
  const resized = (await ops(P))[0].a.slice();
  rec.ok(`${tag}: the handle is still reachable with its corner off the grid -- `
    + `dragging it resizes (the near corner stays put) rather than moving the `
    + `whole box (${beforeH.join(',')} -> ${resized.join(',')})`,
    resized[0] === beforeH[0] && resized[1] === beforeH[1] && resized[2] < beforeH[2],
    { beforeH, resized });
  rec.ok(`${tag}: ...and it comes in by roughly what the finger travelled `
    + `rather than snapping to it -- a pinned handle grabbed at cell 15 with `
    + `its corner at ${beforeH[2]} keeps that ${beforeH[2] - 15}-cell offset`,
    resized[2] === 11 + (beforeH[2] - 15), { want: 11 + (beforeH[2] - 15), got: resized[2] });

  /* ── 5. THE OWNER'S OTHER ONE: A DESIGN THAT HAS BEEN RESIZED ────────────
     Owner, on a sword design sitting over the gap between the legs: "this
     design for instance I can't move closer to the outside of his leg.  It's
     stuck there."

     A DIFFERENT SYMPTOM OF THE SAME CLAMP, and the one a maximised design does
     not reach.  Resizing drags the FAR corner; the near one is left exactly
     where the design landed, which for a ready-made design is the grid's
     top-left (0,0).  So after the very first resize the box is [0, 0, w, h] --
     and the old rule's lower bound was `-bx0`, which for bx0 = 0 is ZERO.  Not
     "can only move a little left": could not move left, or up, AT ALL, ever,
     however small the design or however far the finger travelled.  Every
     ready-made design anybody resized was pinned to the top-left corner of its
     canvas.
     Driven exactly as the owner did it: apply, pull the corner in, drag left. */
  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-paint-note button')]
      .find((x) => /designs/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await P.page.waitForTimeout(700);
  await P.page.evaluate((name) => {
    const sc = [...document.querySelectorAll('.bt-modal-scrim')];
    const g = sc[sc.length - 1];
    const t = [...g.querySelectorAll('button')]
      .find((x) => x.querySelector('canvas') && (x.textContent || '').trim() === name);
    if (t) t.click();
  }, target.name);
  await P.page.waitForTimeout(900);
  const fresh = (await ops(P)).length - 1;
  const at = async () => ((await ops(P))[fresh] || {}).a;
  rec.ok(`${tag}: a second design lands maximised too (guard)`,
    (await at() || []).join(',') === '0,0,15,15', { a: await at() });

  await dragOnCanvas(P, [15, 15], [9, 9]);        /* pull the corner in */
  const shrunk = (await at()).slice();
  rec.ok(`${tag}: resizing drags the FAR corner and leaves the near one at the `
    + `grid's own corner (${shrunk.join(',')}) -- which is the state the old `
    + `clamp could not move left or up out of`,
    shrunk[0] === 0 && shrunk[1] === 0 && shrunk[2] < 15, { shrunk });

  await dragOnCanvas(P, [5, 5], [1, 5]);
  const nudged = (await at()).slice();
  rec.ok(`${tag}: a RESIZED design can be dragged left, off the edge -- the old `
    + `rule's lower bound was -bx0, exactly 0 for a box still anchored at the `
    + `grid corner, so it was stuck there (${shrunk.join(',')} -> `
    + `${nudged.join(',')})`, nudged[0] < 0, { shrunk, nudged });

  /* ── 6. THE LOAD GATE ACCEPTS THE MOVED BOX ──────────────────────────────
     Checked against the MODULE, not through the browser, and deliberately:
     `saveDoc` writes the blob without sanitising and `sanitizeOp` runs on the
     way back IN, so a scenario that reads localStorage after a reload -- the
     obvious test, and the first cut of this one -- proves only that the JSON
     round-tripped.  It cannot see the gate reject the op, because the rejection
     happens in memory, drops the op, and then (because the shortened list no
     longer replays to the stored drawing) throws away the WHOLE canvas's op
     list.  The pixels survive and every piece of the drawing becomes
     unselectable: the exact silent failure this bound had to be widened for.
     So: ask the gate. */
  /* FIRST, the half that was broken before this change and has nothing to do
     with moving anything: a design op carries no ink index (it brings its own
     colours), and the gate's ink guard used to run above the design branch and
     reject every one of them.  Pinned separately from the box bound because
     they fail for different reasons and a single assertion would hide one. */
  rec.ok(`${tag}: the load gate accepts a design op AS WRITTEN -- no ink index, `
    + `because a design brings its own colours.  It did not before v2.3.2463, `
    + `which is why a placed design stopped being a design on the next page load`,
    !!sanitizeOp({ k: 'd', art: target.art, a: [0, 0, 15, 15] }));
  const roomy = { k: 'd', art: target.art, a: [-12, 0, 3, 15] };
  rec.ok(`${tag}: the load gate ACCEPTS a design whose box hangs off the grid -- `
    + `without this the moved design comes back as pixels with nothing left to `
    + `select, move or resize`, !!sanitizeOp(roomy), { got: sanitizeOp(roomy) });
  rec.ok(`${tag}: ...and a shape's and a letter's boxes too, so the rule is the `
    + `drawing's and not one op kind's`,
    !!sanitizeOp({ k: 's', t: 'rect', a: [-8, -8, 4, 4], i: 3, b: 1 })
    && !!sanitizeOp({ k: 't', g: 'A', x: -8, y: 0, a: [-8, 0, -1, 6], i: 3 }));
  /* Still BOUNDED: every shape helper loops over the box, and designGroups
     samples w x h of it, so an unbounded corner out of a hand-edited blob is a
     loop of any size somebody else chose. */
  rec.ok(`${tag}: but a crafted box far outside the grid is still refused -- the `
    + `bound was widened, not removed, and every shape helper loops over it`,
    !sanitizeOp({ k: 'd', art: target.art, a: [-100000, 0, 3, 15] })
    && !sanitizeOp({ k: 'd', art: target.art, a: [0, 0, 999, 15] })
    && !sanitizeOp({ k: 's', t: 'rect', a: [0, 0, 5000, 4], i: 3, b: 1 }));

  /* ── 7. AND ALL OF IT SURVIVES A RELOAD ──────────────────────────────────
     The weaker half of the same claim, end to end: the blob really is written
     and read back with the off-grid box intact. */
  const artBeforeReload = await art(P);
  const boxBeforeReload = (await ops(P))[0].a.slice();
  const lastBeforeReload = (await ops(P)).slice(-1)[0].a.slice();
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await P.page.waitForTimeout(1800);
  const opsAfter = await ops(P);
  rec.ok(`${tag}: the moved design survives a reload -- the stored op still `
    + `carries its off-grid box (${opsAfter[0] && opsAfter[0].a.join(',')})`,
    !!opsAfter[0] && opsAfter[0].k === 'd'
    && opsAfter[0].a.join(',') === boxBeforeReload.join(',')
    && opsAfter.slice(-1)[0].a.join(',') === lastBeforeReload.join(','),
    { want: [boxBeforeReload, lastBeforeReload],
      got: [opsAfter[0] && opsAfter[0].a, opsAfter.slice(-1)[0] && opsAfter.slice(-1)[0].a] });
  rec.ok(`${tag}: ...and the drawing itself is byte-identical across the reload`,
    (await art(P)) === artBeforeReload);

  /* Network noise is not a designer error: the harness's static server drops a
     connection or two on teardown and those arrive as console errors.  Same
     filter mp-skinink uses, and the same reason. */
  const real = (P.logs || []).filter((l) => !/net::|Failed to load resource/i.test(l));
  rec.ok(`${tag}: the designer threw no errors while all of that happened`,
    real.length === 0, { logs: real.slice(0, 4) });

  /* Every scenario closes its own context: this box has 4 vCPUs and a leaked
     Chromium is what CLAUDE.md's 2026-09-10 directive is about. */
  await P.ctx.close();
}
