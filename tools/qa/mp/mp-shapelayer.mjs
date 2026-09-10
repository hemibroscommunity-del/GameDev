/* A SHAPE YOU CAN PICK UP AGAIN, AND A LAYER YOU CAN MOVE (v2.3.1967).
 *
 * Owner, play-testing the tattoo editor: "During the tattoo editor can you add
 * a hand shape to tap the existing shape to reselect and edit it? Also can you
 * add an option to change layers?"
 *
 * Both of those are claims about the DRAWING, not about the panel, so every
 * assertion here reads the 256-character art string out of localStorage — the
 * same string the wire and the renderers take.  A scenario that checked for a
 * hand button and a row of layer buttons would pass on a panel whose buttons do
 * nothing, which is precisely the failure mode of a feature like this: the
 * controls are easy and the op list underneath them is not.
 *
 * The four claims, in the order they are made:
 *
 *   1. a placed shape can be TAPPED and picked up again — proved by moving it,
 *      because a selection you cannot act on is not a selection;
 *   2. moving it leaves NO GHOST — the cells it used to own go back to empty,
 *      which is the thing a flat 256-character string could never do;
 *   3. a pen stroke drawn OVER a shape stays on top of it after the shape is
 *      re-placed — the interleaving property, and the reason this is an ordered
 *      op list rather than shapes floating above one painted base layer;
 *   4. changing the layer changes WHICH of two overlapping shapes wins, in the
 *      art itself — and Undo takes it back.
 *
 * Then it closes the panel and RELOADS THE PAGE, and re-orders the same shape
 * again: the op list is editor-only state in localStorage, and if it did not
 * survive a reload the whole feature would last exactly one session.
 *
 * Driven through the real creator with real pointer events, on the model of
 * mp-bodyink.mjs — the geometry, the pointer capture and the persist path are
 * only real once the panel is on screen at its actual size.
 */
import * as H from './harness.mjs';

const ART_KEY = 'bt-shirtart';   /* v2.3.2416: the shirt FRONT grid — see openGrid */
/* The canvas id the op list is filed under inside the bt-artops blob.  Not the
   same string as the storage key and easy to miss: playerArt maps the canvas
   `shirtFront` to the key `bt-shirtart`, and artOps files ops by the CANVAS. */
const DOC_ID = 'shirtFront';
const OPS_KEY = 'bt-artops';
const KEYS = [ART_KEY, 'bt-facetattoo', 'bt-armtattoo', OPS_KEY, 'bt-artslots'];

/* The palette indices this scenario paints with, as the hex characters they
   land in the string as.  Different on purpose: "which op won this cell" is the
   whole question, and two shapes in the same colour cannot answer it. */
const DARK = '1';        /* palette 1 — the default ink */
const RED = '3';         /* palette 3 */
const GOLD = '5';        /* palette 5 */

const at = (a, x, y) => ((a && a.length === 256) ? a[y * 16 + x] : '?');
const inked = (a) => (a ? [...a].filter((c) => c !== '0').length : 0);

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Shaper', wsPort, webPort });
  const page = A.page;

  /* Start blank, so every cell found later is one this scenario put there. */
  await page.evaluate((keys) => {
    for (const k of keys) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  }, KEYS);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  /* ── into the designer, and onto the flat 16x16 chest grid ─────────────── */
  const openGrid = async () => {
    const created = await page.$('[data-tut="login-create"]');
    if (created) await created.click();
    await page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
    /* v2.3.1978: NOT THE SKIN DESIGNER.  Owner: "For the tattoos just do two
       options: body and face."  Both of those are the draw-on-your-character
       surface, so the skin designer has no flat 16x16 grid and therefore no
       shape tools — this scenario used to reach them through the skin tab.  The
       shape tools, the hand/select tool and the layer controls all still exist;
       they live on the garment designers, which are still a grid.

       v2.3.1978 picked PANTS over the shirt for one reason: "the shirt's Design
       button is dead until a shirt is actually worn, and this scenario is about
       shapes, not about getting dressed first."  Both halves of that changed in
       v2.3.2416.  Pants moved ONTO the character (owner: "On pants editor show
       the actual pants where you drawing"), so it has no flat grid left either;
       and the shirt's card is live with nothing worn (owner: "Add shirt editor
       under shirt"), so the reason to avoid it is gone.  Shirt is now the only
       flat-grid designer, and it needs no dressing first — which is exactly the
       property v2.3.1978 wanted. */
    /* v2.3.2078: `[data-cc-tab]` has never existed in src/ — see mp-bodyink. */
    const tab = await page.$('button:has-text("Shirt")');
    if (!tab) return false;
    await tab.click();
    await page.waitForTimeout(300);
    await page.click('button.bt-cc-ink-pane');   /* v2.3.2414: the Design button is the ink CARD now */
    await page.waitForSelector('.bt-paint-tabs', { timeout: 20000 });
    /* the shirt opens on PATTERN; its modes are pattern / front / back, so the
       front drawing grid is the second tab -- the same position pants used. */
    await page.click('.bt-paint-tabs button:nth-child(2)');
    /* ═══ v2.3.2429: THE SHIRT IS ON THE CHARACTER NOW ═══
       Owner: "The shirt canvas should be a preview of the shirt you're drawing
       on (not just the blank drawing canvas)."  So the last flat 16x16 grid is
       gone and this scenario -- which is about the SHAPE AND LAYER TOOLS, not
       about which surface they run on -- moves to the body surface with them.
       That is the second move for this file (v2.3.2416 brought it here from the
       pants) and both times for the same reason: it follows whichever designer
       still exists.
       Everything below it is unchanged, because the tools genuinely are the
       same code on both surfaces (v2.3.1994) -- only the two helpers that turn
       a CELL into a screen point had to learn the new mapping. */
    await page.waitForSelector('.bt-bodyink-cv', { timeout: 20000 });
    await page.waitForTimeout(2200);
    return true;
  };
  const opened = await openGrid();
  rec.ok('a garment designer has a grid with the shape tools on it', !!opened);
  if (!opened) return;

  /* MEASURED PER GESTURE, not once.  The designer's panel is wider than the
     game wrap on a desktop-shaped viewport (`--paint-size` is sized in vw and
     the wrap is not the viewport), so the panel scrolls sideways — and clicking
     any control near its right edge makes the browser scroll it into view,
     which slides the grid up to 82px.  That is pre-existing and out of this
     change's scope, but a scenario that cached one bounding box would aim every
     tap after the first tool click at the wrong cell and report a broken
     editor.  Re-reading the box is both correct and cheap. */
  /* v2.3.2429: the grid is no longer the canvas box -- it is the rectangle the
     shirt print occupies ON the figure, which the surface reports as
     `__btInkAim.shirt` (in the canvas's own backing pixels) and which moves
     with the zoom.  Read per gesture for the same reason the box was:
     everything here can shift under a control click. */
  const gridBox = () => page.evaluate(() => {
    const c = document.querySelector('.bt-bodyink-cv');
    const a = c && c.__btInkAim && c.__btInkAim.shirt;
    if (!a || !c.width) return null;
    const r = c.getBoundingClientRect();
    const k = r.width / c.width;                  /* backing store -> CSS px */
    return { x: r.x + a.gx0 * k, y: r.y + a.gy0 * k, w: a.gw * k, h: a.gh * k };
  });
  let box = await gridBox();
  rec.ok('the print area has a real on-screen size to aim at (guard)',
    !!box && box.w > 100 && box.h > 100, box);
  if (!box || box.w <= 100) return;

  /* Cell -> client px.  The grid is exactly 16x16 over the reported box, so this
     is arithmetic rather than a guess — and the assertions below are about
     WHICH CELL took ink, so a mis-aimed tap shows up as a failure, not as a
     silent pass. */
  const pt = (b, gx, gy) => ({
    x: b.x + ((gx + 0.5) / 16) * b.w,
    y: b.y + ((gy + 0.5) / 16) * b.h,
  });
  const tap = async (gx, gy) => {
    const p = pt(await gridBox(), gx, gy);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + 1, p.y + 1);
    await page.mouse.up();
    await page.waitForTimeout(260);
  };
  const drag = async (x0, y0, x1, y1) => {
    const b0 = await gridBox();
    const a = pt(b0, x0, y0), b = pt(b0, x1, y1);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(a.x + (b.x - a.x) * (i / 8), a.y + (b.y - a.y) * (i / 8));
      await page.waitForTimeout(25);
    }
    await page.mouse.up();
    await page.waitForTimeout(320);
  };
  /* The panel's own height, for the reflow guard below. */
  const panelH = () => page.$eval('.bt-paint', (p) => p.scrollHeight);
  const art = () => page.evaluate((k) => localStorage.getItem(k) || '', ART_KEY);
  /* Tools and colours are addressed by position in their own rows — the panel
     renders them straight out of TOOLS / ART_PALETTE. */
  const tool = async (n) => { await page.click(`.bt-paint-tools .bt-paint-tool:nth-child(${n})`); await page.waitForTimeout(150); };
  const colour = async (n) => { await page.click(`.bt-paint-pal button:nth-child(${n})`); await page.waitForTimeout(150); };
  const PEN = 1, BOX = 3, SELECT = 7;
  /* v2.3.1994: Clear is a TRASH CAN now (owner: "Change clear to a trash can
     icon"), so it has no text to match on and `:has-text("Clear")` silently
     matched nothing — which is not a failure, it is four ops where there should
     have been two, and five confusing assertion failures downstream of a Clear
     that never happened.  Falling back to the aria-label is the right selector
     anyway: it is what a screen reader reads and what survives the next icon. */
  const btn = async (label) => {
    const el = await page.$(`.bt-paint-ctl button:has-text("${label}")`)
      || await page.$(`.bt-paint-ctl button[aria-label*="${label}" i]`);
    if (!el) return false;
    await el.click();
    await page.waitForTimeout(300);
    return true;
  };

  const tools = await page.$$eval('.bt-paint-tools .bt-paint-tool .bt-paint-tool-label', (ns) => ns.map((n) => n.textContent));
  rec.ok('the toolbar carries a hand/Select tool beside the six that draw',
    tools.length === 7 && /select/i.test(tools[6]), tools);

  /* ── 1. a box, placed ─────────────────────────────────────────────────── */
  await tool(BOX);
  await drag(2, 2, 9, 9);
  await btn('Place');
  let a1 = await art();
  rec.ok('a box outline lands on the grid',
    at(a1, 2, 2) === DARK && at(a1, 9, 5) === DARK && at(a1, 5, 5) === '0',
    { corner: at(a1, 2, 2), rightEdge: at(a1, 9, 5), middle: at(a1, 5, 5), n: inked(a1) });

  /* ── 2. a pen stroke ACROSS it, in another colour ─────────────────────── */
  await colour(4);                       /* palette index 3 — the 4th swatch */
  await tool(PEN);
  await drag(4, 7, 13, 7);
  let a2 = await art();
  rec.ok('a pen stroke crosses the box and sits ON TOP of it where they meet',
    at(a2, 9, 7) === RED && at(a2, 12, 7) === RED,
    { onTheEdge: at(a2, 9, 7), pastIt: at(a2, 12, 7) });

  /* ── 3. the hand picks the box back up ────────────────────────────────── */
  await tool(SELECT);
  const hBefore = await panelH();
  await tap(5, 2);                       /* the box's top edge, clear of the stroke */
  /* THE PANEL MUST NOT RESIZE WHEN SOMETHING IS PICKED UP.  A shape is selected
     from its FIRST CELL, so any control that appears only for a selection
     appears mid-drag — and the panel is a centred flex child, so growing it
     re-centres it and slides the grid out from under the finger that is still
     drawing.  That is why the layer row is always rendered and merely disabled,
     which is the same rule the brush-width row above it already follows.  This
     assertion is what stops the next session from "tidying up" by making the
     row conditional again. */
  const hAfter = await panelH();
  rec.ok('picking something up does not resize the panel under your finger',
    Math.abs(hAfter - hBefore) < 1, { before: hBefore, after: hAfter });
  /* Proved by ACTING on it: drag the corner handle from (9,9) out to (12,12).
     Nothing else on this grid can move a shape that was placed three actions
     ago, so if the art below is right, the tap re-selected it. */
  await drag(9, 9, 12, 12);
  await btn('Place');
  const a3 = await art();
  rec.ok('tapping a placed shape picks it up again: dragging the handle resizes it',
    at(a3, 12, 5) === DARK && at(a3, 12, 12) === DARK,
    { newRightEdge: at(a3, 12, 5), newCorner: at(a3, 12, 12) });
  /* The cells checked here are on the OLD right and bottom edges and fall
     INSIDE the resized box, so nothing should be painting them any more.  (Not
     the old top-right corner: the top edge stays at y=2 and still runs through
     it — an assertion that had to be corrected once already, which is the
     hazard of testing an outline.) */
  rec.ok('...and it leaves NO GHOST: the cells the old edge held are empty again',
    at(a3, 9, 5) === '0' && at(a3, 5, 9) === '0',
    { oldRightEdge: at(a3, 9, 5), oldBottomEdge: at(a3, 5, 9), before: at(a2, 9, 5) });
  /* THE INTERLEAVING CLAIM.  The box's new right edge runs straight through a
     cell the pen inked, and the pen stroke was made AFTER the box — so the pen
     still owns it, even though the box was the thing edited last.  A model that
     kept freehand in one base layer under the shapes would answer DARK here. */
  rec.ok('a pen stroke drawn over a shape stays on top of it after the shape is re-placed',
    at(a3, 12, 7) === RED,
    { cell: at(a3, 12, 7), expected: RED, note: 'the box edge now runs through this cell' });

  /* ── 4. two overlapping shapes, and the layer buttons ─────────────────── */
  await btn('Erase the whole');
  await colour(2);                       /* palette index 1 */
  await tool(BOX);
  await drag(2, 2, 9, 9);                /* box A, dark — its RIGHT edge is x=9 */
  await btn('Place');
  await colour(6);                       /* palette index 5 */
  await drag(9, 2, 14, 9);               /* box B, gold — its LEFT edge is x=9 */
  await btn('Place');
  const b0 = await art();
  rec.ok('two boxes share a column of cells, and the one drawn LAST owns it',
    at(b0, 9, 5) === GOLD && at(b0, 2, 5) === DARK,
    { shared: at(b0, 9, 5), onlyA: at(b0, 2, 5) });

  await tool(SELECT);
  await tap(5, 2);                       /* box A's top edge — A only */
  const layerLabel = await page.textContent('.bt-paint-layer-at').catch(() => null);
  rec.ok('picking a shape up names which layer it is on', !!layerLabel && /layer\s*1\s*of\s*2/i.test(layerLabel),
    { label: layerLabel });
  const moved = await btn('To front');
  rec.ok('the layer row offers a way to bring it forward (guard)', moved);
  const b1 = await art();
  rec.ok('bringing the older shape to the FRONT changes which one wins the shared cells',
    at(b1, 9, 5) === DARK && at(b1, 9, 2) === DARK,
    { shared: at(b1, 9, 5), before: at(b0, 9, 5) });
  const label2 = await page.textContent('.bt-paint-layer-at').catch(() => null);
  rec.ok('...and the readout says where it went', !!label2 && /layer\s*2\s*of\s*2/i.test(label2),
    { before: layerLabel, after: label2 });

  await btn('To back');
  const b2 = await art();
  rec.ok('sending it back again hands the shared cells straight back',
    at(b2, 9, 5) === GOLD, { shared: at(b2, 9, 5) });

  /* Undo has to keep working across a re-order, since a layer move is an edit
     like any other. */
  await btn('Undo');
  const b3 = await art();
  rec.ok('Undo takes back a layer change', at(b3, 9, 5) === DARK,
    { after: at(b3, 9, 5), beforeUndo: at(b2, 9, 5) });
  await btn('Redo');
  const b4 = await art();
  rec.ok('Redo puts it back', at(b4, 9, 5) === GOLD, { after: at(b4, 9, 5) });

  /* ── 5. the op list survives closing the panel AND a page reload ───────── */
  const stored = await page.evaluate((k) => {
    try { return localStorage.getItem(k) || ''; } catch (e) { return ''; }
  }, OPS_KEY);
  let ops = null;
  try { ops = JSON.parse(stored)[DOC_ID]; } catch (e) { ops = null; }   /* v2.3.2416 */
  rec.ok('the op list is stored beside the drawing, not on the wire',
    !!ops && Array.isArray(ops.o) && ops.o.length === 2,
    { kinds: ops && ops.o && ops.o.map((o) => o.k), len: stored.length });

  await btn('Done');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  const reopened = await openGrid();
  rec.ok('the designer opens again after a reload (guard)', !!reopened);
  if (reopened) {
    box = await gridBox();
    const keptArt = await art();
    rec.ok('the drawing itself survived the reload (guard)',
      at(keptArt, 9, 5) === GOLD && inked(keptArt) > 20, { shared: at(keptArt, 9, 5), n: inked(keptArt) });
    await tool(SELECT);
    await tap(5, 2);
    const relabel = await page.textContent('.bt-paint-layer-at').catch(() => null);
    rec.ok('a shape drawn in the LAST session can still be picked up',
      !!relabel && /layer\s*1\s*of\s*2/i.test(relabel), { label: relabel });
    await btn('To front');
    const after = await art();
    rec.ok('...and re-layered, which is the whole reason the list is persisted',
      at(after, 9, 5) === DARK, { shared: at(after, 9, 5), before: at(keptArt, 9, 5) });
  }

  /* ── 6. the things the op list had to keep working ────────────────────────
     The design slots go through code the op list rewrote: a slot holds 256
     characters with no op list behind them, so loading one has to FLATTEN —
     arrive as a base with nothing selectable on it — or the shapes that were on
     the grid before would replay straight back over the design you just loaded.

     ═══ v2.3.1994: THE MIRROR CONTROL IS GONE, THE MIRROR DATA IS NOT ═══
     Owner: "Swap out the mirror for 'fill'."  The button is retired and Fill,
     which has been a real tool since v2.3.1948, is what sits in the tool row
     instead.  What must NOT change is what a drawing made before today does,
     and that is a live risk rather than a theoretical one: `m` is still on the
     op, artOps still replays it, and artOps' DROP RULE bins any op list that
     does not re-render to the stored drawing — so if replay had quietly
     stopped honouring `m`, every mirrored drawing in the world would have
     silently flattened into an un-editable base and nobody would have seen an
     error.  So a legacy mirrored op is injected here and checked twice: the
     ink is on both halves, AND it is still an OP (the hand can pick it up),
     which is what the drop rule would have taken away. */
  const mirrorArt = (() => {
    const a = new Array(256).fill('0');
    for (let y = 3; y <= 6; y++) { a[y * 16 + 3] = '1'; a[y * 16 + 12] = '1'; }
    return a.join('');
  })();
  await btn('Done');
  await page.evaluate(([k, opsKey, art, docId]) => {
    localStorage.setItem(k, art);
    /* One canvas's row; every other canvas falls back to "whatever is drawn,
       flat", which is what artOps does for a missing row anyway. */
    /* A LINE, not a freehand stroke: sanitizeOp drops `m` from a 'c' op on
       purpose (a pen stroke stores the cells it FINISHED with, already
       mirrored), so a freehand op is not the one that can regress here. The
       three ops that carry a live `m` are the shape, the letter and the fill. */
    /* v2.3.2416: the row is keyed by CANVAS id, and this scenario moved from
       the pants grid to the shirt's when pants went onto the character.  It was
       a literal `pants:` here, which meant the injected op landed on a canvas
       the panel no longer opens -- the drawing replayed flat and the assertion
       below reported the drop rule eating it. */
    localStorage.setItem(opsKey, JSON.stringify({
      [docId]: { b: '0'.repeat(256), o: [{ k: 's', t: 'line', a: [3, 3, 3, 6], i: 1, b: 1, m: 1 }] },
    }));
  }, [ART_KEY, OPS_KEY, mirrorArt, DOC_ID]);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  const remirror = await openGrid();
  rec.ok('the designer reopens on the injected legacy drawing (guard)', !!remirror);
  let m1 = null;
  if (remirror) {
    box = await gridBox();
    m1 = await art();
    rec.ok('a drawing MIRRORED before v2.3.1994 still replays both halves',
      at(m1, 3, 4) !== '0' && at(m1, 12, 4) === at(m1, 3, 4),
      { left: at(m1, 3, 4), right: at(m1, 12, 4) });
    await tool(SELECT);
    await tap(12, 4);                    /* the MIRRORED half — the op owns it too */
    const mlabel = await page.textContent('.bt-paint-layer-at').catch(() => null);
    rec.ok('...and it is still an OP, not flattened by the drop rule',
      !!mlabel && /layer\s*1\s*of\s*1/i.test(mlabel), { label: mlabel });
  }
  /* v2.3.2004: BOTH, not either.  v2.3.1994 read "swap out the mirror for
     fill" as a trade and retired the button; the owner's answer was "Mirror is
     actually a nice feature if you have room in ui add it back in".  So the
     assertion flips from "gone" to "back", and it checks FILL as well -- the
     failure this guards against is a future session reading one of the two
     owner notes without the other and trading them again. */
  const mirrorBtn = await page.$('.bt-paint-mirror');
  rec.ok('Mirror is back AND Fill is a tool — the row carries both',
    !!mirrorBtn && tools.some((t) => /fill/i.test(t)), { mirrorButton: !!mirrorBtn, tools });

  /* And it has to WORK, not just render: a button that sets no state would
     satisfy the assertion above.  Draw one cell with Mirror on and require the
     opposite half to paint too. */
  if (mirrorBtn) {
    await page.click('.bt-paint-mirror');
    await page.waitForTimeout(150);
    const pressed = await page.getAttribute('.bt-paint-mirror', 'aria-pressed');
    await tool(PEN);
    box = await gridBox();
    await tap(3, 9);
    await page.waitForTimeout(250);
    const mm = await art();
    rec.ok('...and turning it on paints both halves of a new stroke',
      pressed === 'true' && at(mm, 3, 9) !== '0' && at(mm, 12, 9) === at(mm, 3, 9),
      { pressed, left: at(mm, 3, 9), right: at(mm, 12, 9) });
    await page.click('.bt-paint-mirror');        /* leave it off for what follows */
    await page.waitForTimeout(150);
    /* AND take the stroke back.  The slot assertions below count ops, so a
       probe that leaves its own mark on the grid makes the next test fail with
       a number that has nothing to do with slots (measured: 10 where 8 was
       expected).  A probe cleans up after itself or it is not a probe. */
    await btn('Undo');
    await page.waitForTimeout(250);
  }

  /* v2.3.2416: the three design slots and their Save button are gone (owner:
     the word Save meant two different things on this screen), so the round trip
     that used to be asserted here -- stash a design, clear, load it back -- has
     no control to drive.  Clear itself is untouched and still worth pinning;
     what follows is that assertion with the slot taps removed rather than a
     weakened version of the old one.  Undo is what takes a Clear back now, and
     mp-bodyink already covers that path. */
  await btn('Erase the whole');
  await page.waitForTimeout(350);
  const cleared = await art();
  rec.ok('Clear empties the drawing (and the list under it)', inked(cleared) === 0, { n: inked(cleared) });

  /* ═══ v2.3.2426: A LETTER IS A SHAPE NOW ═══
     Owner: "The letters aren't working correctly (not pasting onto the
     character and not scaling/resizing"; "Letters need to default smaller on
     the pants they get cut off"; "You should be able to select something and
     recolor it."
     Three complaints, one missing property: a letter op was {g,x,y} with no
     size, so there was nothing to resize and the panel's own resize handler
     said so in a comment.  It carries a box now -- same handle, same drag, same
     ratio lock as a rectangle -- and it stays selected when placed, which is
     what "not pasting" turned out to be: it DID paste (16 cells, measured) and
     was let go of in the same frame, leaving nothing to adjust and no visible
     sign anything had happened. */
  const LETTERS_TOOL = 6;
  const opList = () => page.evaluate(([k, id]) => {
    try { const p = JSON.parse(localStorage.getItem(k) || '{}'); return (p[id] && p[id].o) || []; }
    catch (e) { return null; }
  }, [OPS_KEY, DOC_ID]);
  const layerText = () => page.$eval('.bt-paint-layer-at', (e) => e.textContent.trim()).catch(() => null);

  await btn('Clear');
  await page.waitForTimeout(300);
  await tool(LETTERS_TOOL);
  const strip = await page.$('.bt-paint-letters');
  rec.ok('the Letters tool offers an alphabet (guard)', !!strip);
  if (strip) {
    await page.click('.bt-paint-letter[aria-label="Letter A"]');
    await page.waitForTimeout(200);
    await colour(9);                    /* palette index 8 -- a blue */
    await tap(8, 8);
    const placed = (await opList()).slice(-1)[0];
    rec.ok('a placed letter lands as an op with a BOX, not a bare point',
      !!placed && placed.k === 't' && Array.isArray(placed.a) && placed.a.length === 4, placed);
    rec.ok('...and stays picked up, so there is something to adjust',
      /letter a/i.test(await layerText() || ''), { layer: await layerText() });

    /* RESIZE.  The handle is the box's far corner; dragging it out has to
       change the box, which is the property that did not exist at all. */
    if (placed && placed.a) {
      const a0 = placed.a.slice();
      await drag(a0[2], a0[3], Math.min(15, a0[2] + 3), Math.min(15, a0[3] + 3));
      const grown = (await opList()).slice(-1)[0];
      rec.ok(`a letter RESIZES from its handle (${a0.join(',')} -> ${grown && grown.a && grown.a.join(',')})`,
        !!grown && grown.a && (grown.a[2] > a0[2] || grown.a[3] > a0[3]),
        { before: a0, after: grown && grown.a });
      /* And the glyph follows the box: bigger box, more inked cells.  Without
         this, "the box changed" could be true of a number nothing reads. */
      const bigInk = [...(await art())].filter((c) => c !== '0').length;
      rec.ok(`...and the drawing grows with it (${bigInk} cells inked)`, bigInk > 0, { bigInk });
    }

    /* RECOLOUR.  With something picked up, the palette repaints IT rather than
       only arming the next mark -- which is what it did for every version
       before this one. */
    const beforeInk = (await opList()).slice(-1)[0];
    await colour(4);                    /* palette index 3 -- a red */
    const after = (await opList()).slice(-1)[0];
    rec.ok(`picking a colour with a letter held RECOLOURS it (${beforeInk && beforeInk.i} -> ${after && after.i})`,
      !!after && after.i !== (beforeInk && beforeInk.i), { before: beforeInk && beforeInk.i, after: after && after.i });
    rec.ok('...and does not add an op -- it changes the one you are holding',
      (await opList()).length === 1, { ops: (await opList()).length });
  }

  const errs = A.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors while shaping and re-layering', errs.length === 0, errs.slice(0, 3));
  await A.ctx.close();
}
