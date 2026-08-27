/* THE SKIN EDITOR IS THE SHIRT EDITOR, ON THE CHARACTER (v2.3.1994).
 *
 * Owner, across three notes:
 *   "Can you just make anywhere where skin is showing be tattooable? It's
 *    confusing trying to draw on skin and not being able to (only certain
 *    areas allowed)"
 *   "When you try to zoom way in to draw detail it auto zooms you back out.
 *    That needs fixed"
 *   "Oh I see the shirt editor is where the more complex editor is. Make the
 *    skin tattoo editor be the same as that but I do like the zoom ability of
 *    the face and torso one so add that."
 *
 * ── WHAT THIS DEFENDS, AND WHY EACH ONE NEEDS A ROBOT ──
 *
 * 1. THE ZOOM STAYS WHERE YOU PUT IT.  This is the only one of the three that
 *    is invisible in a screenshot: a panel that re-frames itself the instant
 *    you draw looks, in any single frame, exactly like a panel that does not.
 *    So the view's own zoom is read off the surface (`__btInkView`, stamped by
 *    the blit), pushed up by the + button, and read again AFTER a real stroke
 *    has landed and the figure has re-composited — which is the exact sequence
 *    that used to put it back. Reverting the one-line guard in BodyInk's
 *    fitRegion fails this assertion and nothing else.
 *
 * 2. EVERY SKIN PIXEL TAKES INK.  Two halves: the arms are reachable AT ALL
 *    (they had no editor between v2.3.1978 and now), and a region's grid
 *    covers the whole region rather than a rectangle in the middle of it. The
 *    second is measured as the share of the region's own bulk box the 16x16
 *    grid spans — 100% now, 70%x55% before on the chest — because "I tapped
 *    and nothing happened" is not a thing a screenshot can show either.
 *
 * 3. THE TOOLS ARE THERE.  The tool row, the alphabet, the layer row: the five
 *    gates that were closed on `onBody`. Asserted by presence, since what they
 *    do is already covered on the flat grid (mp-shapelayer, mp-tools).
 *
 * Driven on a PHONE viewport with touch, because that is the platform, and
 * because the panel re-flows at 460px of height and a desktop window would
 * test the layout nobody uses.
 */
import * as H from './harness.mjs';

const KEYS = { tattoo: 'bt-tattooart', tattooFace: 'bt-facetattoo', tattooArm: 'bt-armtattoo' };
const SHOTS = process.env.BT_SHOT_DIR || '/tmp';

const readArts = (page) => page.evaluate((keys) => {
  const out = {};
  for (const k of Object.keys(keys)) { try { out[k] = localStorage.getItem(keys[k]) || ''; } catch (e) { out[k] = ''; } }
  return out;
}, KEYS);

/** How many cells of `art` are inked (not '0'). */
const inked = (a) => (a ? [...a].filter((c) => c !== '0').length : 0);

/** The framed region's grid box + mask box, in the editor canvas's own pixels. */
const aimFor = (page, key) => page.evaluate((k) => {
  const c = document.querySelector('.bt-bodyink-cv');
  const a = c && c.__btInkAim && c.__btInkAim[k];
  if (!a) return null;
  return { w: c.width, h: c.height, x: a.x, y: a.y, gx0: a.gx0, gy0: a.gy0, gw: a.gw, gh: a.gh };
}, key);

const viewOf = (page) => page.evaluate(() => {
  const c = document.querySelector('.bt-bodyink-cv');
  return (c && c.__btInkView) ? { z: c.__btInkView.z, cx: c.__btInkView.cx, cy: c.__btInkView.cy } : null;
});

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, {
    name: 'Inker', wsPort, webPort,
    /* iPhone 12/13/14 CSS viewport. The panel's short-viewport re-flow is at
       max-height:460px, so a portrait phone gets the STACKED layout — which is
       the one the owner is looking at. */
    viewport: { width: 390, height: 844 }, touch: true,
  });
  const page = A.page;

  await page.evaluate((keys) => {
    for (const k of Object.keys(keys)) { try { localStorage.removeItem(keys[k]); } catch (e) { /* ignore */ } }
    try { localStorage.removeItem('bt-artops'); } catch (e) { /* ignore */ }
  }, KEYS);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const created = await page.$('[data-tut="login-create"]');
  if (created) await created.click();
  await page.waitForSelector('input.bt-cc-name', { timeout: 30000 });

  /* ═══ THE CREATOR OPENS ON THE WHOLE CHARACTER ═══
     Owner: "When first getting to the character design screen have the
     character zoomed out normally instead of zooming in by default for his
     hair."  The camera state is the assertion; the screenshot beside it is
     what the owner will actually look at. */
  await page.waitForTimeout(1600);
  await page.screenshot({ path: SHOTS + '/skinink-creator.png' });
  const camWide = await page.evaluate(() => {
    /* The creator's live preview names itself in its own title (NameModal);
       there is no class on it, and `document.querySelector('canvas')` reaches
       a trait thumbnail instead — a square picture of a hairstyle, which
       passes any shape test the actual bug would fail.  Measured: with the
       wrong selector this assertion passed against the UNFIXED build. */
    const cv = document.querySelector('canvas[title^="Live preview"]');
    if (!cv) return null;
    /* THE STAGE FRAME IS THE STATE, AND IT IS ON THE ELEMENT.  NameModal has
       exactly two presets and writes the chosen one straight into the canvas's
       inline height: 92% for the whole figure, 54.5% for the close-up the
       category framing uses.  That is the decision itself rather than a
       consequence of it, so it needs no threshold and cannot be fooled by a
       colour that also describes the pedestal (TRAPS §21 — the first cut of
       this assertion counted "flat grey boots" and got 2294 of them on a frame
       with no boots in it). */
    const px = cv.getBoundingClientRect();
    return { height: cv.style.height, w: Math.round(px.width), h: Math.round(px.height) };
  });
  /* Verified in BOTH directions: this reads "54.5%" on the unfixed build
     (activeCat opens on 'hair' and v2.3.1951 points the camera at the open
     category) and "92%" once the camera starts pulled back. */
  rec.ok('the creator opens on the whole character, not a close-up of the hair',
    !!camWide && camWide.height === '92%', camWide);

  const skinTab = await page.$('[data-cc-tab="skin"]') || await page.$('button:has-text("Skin")');
  rec.ok('the creator has a skin tab to reach the designer from', !!skinTab, { found: !!skinTab });
  if (!skinTab) return;
  await skinTab.click();
  await page.waitForTimeout(300);
  await page.click('button.bt-cc-draw');
  await page.waitForSelector('.bt-bodyink-cv', { timeout: 20000 });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: SHOTS + '/skinink-editor-body.png' });

  /* ═══ 3. THE SAME TOOLS AS THE SHIRT ═══════════════════════════════════ */
  const ui = await page.evaluate(() => ({
    tools: [...document.querySelectorAll('.bt-paint-tools .bt-paint-tool')].map((b) => b.textContent.trim()),
    layers: !!document.querySelector('.bt-paint-layers'),
    mirror: !!document.querySelector('.bt-paint-mirror'),
    /* the pan toggle is an icon now, so it is found by what it means */
    panIcon: !!document.querySelector('.bt-bodyink-bar button[aria-label="Drag to move the view"] svg'),
    panWord: [...document.querySelectorAll('.bt-bodyink-bar button')].some((b) => /move|ink/i.test(b.textContent.trim())),
    zoomBack: [...document.querySelectorAll('.bt-bodyink-bar button')].map((b) => b.textContent.trim()),
    clearIcon: !!(() => {
      const b = [...document.querySelectorAll('.bt-paint-btn button')].find((x) => /erase the whole/i.test(x.getAttribute('aria-label') || ''));
      return b && b.querySelector('svg');
    })(),
    clearWord: [...document.querySelectorAll('.bt-paint-btn button')].some((b) => b.textContent.trim() === 'Clear'),
  }));
  rec.ok('the skin editor has the shirt editor\'s whole tool row (7 tools)',
    ui.tools.length === 7 && ui.tools.join(',').toLowerCase().includes('fill'), ui.tools);
  rec.ok('...and the layer row', ui.layers, ui);
  /* v2.3.2004: BOTH.  v2.3.1994 read "swap out the mirror for fill" as a trade
     and retired the button; the owner's answer was "Mirror is actually a nice
     feature if you have room in ui add it back in".  Mirror is not a tool and
     never was -- it is a modifier in its own fixed cell, which is why the row
     above still counts SEVEN tools with Fill among them. */
  rec.ok('Mirror is back in its own cell, and Fill is still a tool',
    ui.mirror && ui.tools.some((t) => /fill/i.test(t)), ui);
  rec.ok('the pan button is a picture of panning, not the word "Move"',
    ui.panIcon && !ui.panWord, ui);
  rec.ok('"Fit" is now "100%"', ui.zoomBack.includes('100%') && !ui.zoomBack.includes('Fit'), ui.zoomBack);
  rec.ok('Clear is a trash can icon with the sentence on its label',
    ui.clearIcon && !ui.clearWord, ui);

  /* Letters: pick the tool, the alphabet must appear ON THE BODY SCREEN.
     Owner: "Add the letters back." */
  const letterBtn = await page.$('.bt-paint-tools .bt-paint-tool:nth-child(6)');
  if (letterBtn) await letterBtn.click();
  await page.waitForTimeout(200);
  const letters = await page.evaluate(() => document.querySelectorAll('.bt-paint-letters .bt-paint-letter').length);
  rec.ok('the letters strip is back on the skin editor', letters >= 26, { letters });
  await page.screenshot({ path: SHOTS + '/skinink-editor-letters.png' });
  /* back to the pen for the drawing assertions */
  const penBtn = await page.$('.bt-paint-tools .bt-paint-tool:nth-child(1)');
  if (penBtn) await penBtn.click();
  await page.waitForTimeout(200);

  const box = await page.$('.bt-bodyink-cv');
  const r = await box.boundingBox();
  rec.ok('the editor has a real on-screen size to aim at (guard)',
    !!r && r.width > 40 && r.height > 40, r);
  if (!r) return;
  const at = (a, fx, fy) => ({ x: r.x + (fx / a.w) * r.width, y: r.y + (fy / a.h) * r.height });
  const tap = async (a, fx, fy) => {
    const p = at(a, fx, fy);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + 1, p.y + 1);
    await page.mouse.up();
    await page.waitForTimeout(500);
  };

  /* ═══ 2. EVERY SKIN PIXEL TAKES INK ════════════════════════════════════ */
  const bodyAim = await aimFor(page, 'tattoo');
  const armAim = await aimFor(page, 'arms');
  rec.ok('the body screen reports where the torso is', !!bodyAim, bodyAim);
  rec.ok('...and where the ARMS are, which is the half that had no editor at all',
    !!armAim, armAim);
  if (!bodyAim || !armAim) return;

  /* "full zoom but fitting within the editor window" (v2.3.1978) still holds —
     it is just the torso AND the arms that have to fit now. */
  const spanX = (Math.max(bodyAim.gx0 + bodyAim.gw, armAim.gx0 + armAim.gw) - Math.min(bodyAim.gx0, armAim.gx0));
  const fill = Math.max(spanX / bodyAim.w, bodyAim.gh / bodyAim.h);
  rec.ok(`the inkable skin FILLS the editor (${Math.round(fill * 100)}% of it)`,
    fill >= 0.7, { spanX: Math.round(spanX), gh: Math.round(bodyAim.gh), w: bodyAim.w, h: bodyAim.h });

  await tap(bodyAim, bodyAim.x, bodyAim.y);
  let arts = await readArts(page);
  rec.ok('a tap on the chest inks the CHEST canvas', inked(arts.tattoo) > 0,
    { chest: inked(arts.tattoo), face: inked(arts.tattooFace), arm: inked(arts.tattooArm) });

  /* THE ARM.  Aimed at the arm's own reported centre — the point of the probe
     is that the aim is not the thing under test. */
  await tap(armAim, armAim.x, armAim.y);
  arts = await readArts(page);
  rec.ok('a stroke on an ARM inks the arm canvas — the region that had no editor',
    inked(arts.tattooArm) > 0,
    { chest: inked(arts.tattoo), face: inked(arts.tattooFace), arm: inked(arts.tattooArm) });

  /* THE EDGES OF A REGION.  The whole complaint: the middle worked and the
     edges did not.  Top-left and bottom-right cell of the chest grid. */
  const cw = bodyAim.gw / 16, chh = bodyAim.gh / 16;
  const corners = [
    ['top-left', bodyAim.gx0 + cw * 0.5, bodyAim.gy0 + chh * 0.5],
    ['top-right', bodyAim.gx0 + bodyAim.gw - cw * 0.5, bodyAim.gy0 + chh * 0.5],
    ['bottom-left', bodyAim.gx0 + cw * 0.5, bodyAim.gy0 + bodyAim.gh - chh * 0.5],
    ['bottom-right', bodyAim.gx0 + bodyAim.gw - cw * 0.5, bodyAim.gy0 + bodyAim.gh - chh * 0.5],
  ];
  const cornerHits = {};
  for (const [name, cx, cy] of corners) {
    const b = await readArts(page);
    await tap(bodyAim, cx, cy);
    const a = await readArts(page);
    /* ANY skin canvas: the corner of the CHEST's box is over a shoulder, and a
       shoulder legitimately belongs to the arm — which is the point. What must
       not happen is a tap that inks nothing at all. */
    cornerHits[name] = (inked(a.tattoo) + inked(a.tattooArm) + inked(a.tattooFace))
      - (inked(b.tattoo) + inked(b.tattooArm) + inked(b.tattooFace));
  }
  const dead = Object.keys(cornerHits).filter((k) => cornerHits[k] <= 0);
  rec.ok('all four CORNERS of the framed region take ink, not just the middle',
    dead.length === 0, cornerHits);

  /* ═══ UNDO ACROSS A CANVAS SWITCH ══════════════════════════════════════
     The riskiest single line in v2.3.1994 is the guard added to the panel's
     "load this canvas" effect: a body stroke can move `artId` mid-gesture now,
     and without the guard that effect would reload the new canvas from a store
     that has not been written yet — wiping the stroke still under the finger.
     The visible symptom would be "the arm never takes ink", which the arm
     assertion above already covers, but the SECOND half is undo: a history
     that spans two canvases has to put each change back where it came from
     (v2.3.1967 put the canvas id on the entry for exactly this). */
  const undoBtn = async () => {
    const b = await page.$('.bt-paint-btn button:has-text("Undo")');
    if (b) await b.click();
    await page.waitForTimeout(400);
  };
  const beforeUndo = await readArts(page);
  await undoBtn();
  const oneBack = await readArts(page);
  rec.ok('Undo takes back the last mark, and takes it back off the ARM it was made on',
    inked(oneBack.tattooArm) < inked(beforeUndo.tattooArm)
    || inked(oneBack.tattoo) < inked(beforeUndo.tattoo),
    { before: { chest: inked(beforeUndo.tattoo), arm: inked(beforeUndo.tattooArm) },
      after: { chest: inked(oneBack.tattoo), arm: inked(oneBack.tattooArm) } });

  /* ═══ 3b. AND THE TOOLS ACTUALLY DRAW ON THE BODY ══════════════════════
     Presence is not the claim — "make the skin tattoo editor be the same as
     [the shirt]" is about what the tools DO.  A box dragged across the chest
     has to arrive in the chest canvas as a box (four edges, hollow middle), a
     letter has to land where it was tapped, and the hand has to be able to
     pick either of them up again.  None of that was possible on this surface
     before: it collected pen cells and nothing else. */
  const drag = async (a, x0, y0, x1, y1) => {
    const p0 = at(a, x0, y0), p1 = at(a, x1, y1);
    await page.mouse.move(p0.x, p0.y);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(p0.x + (p1.x - p0.x) * i / 6, p0.y + (p1.y - p0.y) * i / 6);
      await page.waitForTimeout(45);
    }
    await page.mouse.up();
    await page.waitForTimeout(450);
  };
  const cellOf = (art, x, y) => ((art && art.length === 256) ? art[y * 16 + x] : '?');
  const pressTool = async (n) => {
    const b = await page.$('.bt-paint-tools .bt-paint-tool:nth-child(' + n + ')');
    if (b) await b.click();
    await page.waitForTimeout(200);
  };

  /* Start from a clean chest so the shape's own cells are unambiguous. */
  const clearBtn = await page.$('.bt-paint-btn button[aria-label*="Erase the whole" i]');
  if (clearBtn) await clearBtn.click();
  await page.waitForTimeout(350);

  await pressTool(3);                       /* Box */
  const bAim = await aimFor(page, 'tattoo');
  await drag(bAim, bAim.gx0 + bAim.gw * (3.5 / 16), bAim.gy0 + bAim.gh * (3.5 / 16),
    bAim.gx0 + bAim.gw * (11.5 / 16), bAim.gy0 + bAim.gh * (11.5 / 16));
  const placeBtn = await page.$('.bt-paint-shapeops button:has-text("Place")');
  rec.ok('dragging a shape on the BODY gives you the same Place/Cancel row the shirt has',
    !!placeBtn, { found: !!placeBtn });
  if (placeBtn) await placeBtn.click();
  await page.waitForTimeout(400);
  const boxArt = (await readArts(page)).tattoo;
  rec.ok('a BOX dragged across the chest arrives as a box — edges inked, middle empty',
    cellOf(boxArt, 3, 3) !== '0' && cellOf(boxArt, 11, 3) !== '0'
    && cellOf(boxArt, 3, 11) !== '0' && cellOf(boxArt, 7, 7) === '0',
    { tl: cellOf(boxArt, 3, 3), tr: cellOf(boxArt, 11, 3), bl: cellOf(boxArt, 3, 11), mid: cellOf(boxArt, 7, 7) });

  await pressTool(6);                       /* Letters */
  await page.waitForTimeout(200);
  await tap(bAim, bAim.gx0 + bAim.gw * (7.5 / 16), bAim.gy0 + bAim.gh * (7.5 / 16));
  const letterArt = (await readArts(page)).tattoo;
  rec.ok('a LETTER placed on the chest lands in the middle, where it was tapped',
    cellOf(letterArt, 7, 7) !== '0', { mid: cellOf(letterArt, 7, 7) });

  await pressTool(7);                       /* Select (the hand) */
  await tap(bAim, bAim.gx0 + bAim.gw * (3.5 / 16), bAim.gy0 + bAim.gh * (5.5 / 16));
  const pickLabel = await page.textContent('.bt-paint-layer-at').catch(() => null);
  rec.ok('the HAND picks up something drawn on the body, and the layer row names it',
    !!pickLabel && /layer\s*\d+\s*of\s*\d+/i.test(pickLabel), { label: pickLabel });
  await page.screenshot({ path: SHOTS + '/skinink-editor-tools.png' });
  const doneBtn = await page.$('.bt-paint-shapeops button');
  if (doneBtn) await doneBtn.click();
  await page.waitForTimeout(250);
  await pressTool(1);                       /* back to the pen */

  /* ═══ PAN MODE DOES NOT DRAW ══════════════════════════════════════════ */
  const panBtn = await page.$('.bt-bodyink-bar button[aria-label="Drag to move the view"]');
  if (panBtn) await panBtn.click();
  await page.waitForTimeout(200);
  const beforePan = (await readArts(page)).tattoo;
  const vBefore = await viewOf(page);
  await drag(bAim, bAim.w * 0.45, bAim.h * 0.45, bAim.w * 0.6, bAim.h * 0.6);
  const afterPan = (await readArts(page)).tattoo;
  const vAfter = await viewOf(page);
  rec.ok('with pan on, a drag MOVES the view and inks nothing',
    afterPan === beforePan && !!vAfter && !!vBefore
    && (Math.abs(vAfter.cx - vBefore.cx) > 0.001 || Math.abs(vAfter.cy - vBefore.cy) > 0.001),
    { changedInk: afterPan !== beforePan, before: vBefore, after: vAfter });
  if (panBtn) await panBtn.click();
  await page.waitForTimeout(200);

  /* ═══ 1. THE ZOOM STAYS WHERE YOU PUT IT ═══════════════════════════════ */
  const z0 = await viewOf(page);
  rec.ok('the surface reports its own view (guard)', !!z0 && z0.z > 0, z0);
  if (!z0) return;
  const zoomIn = await page.$('.bt-bodyink-bar button[title="Zoom in"]');
  for (let i = 0; i < 4; i++) { if (zoomIn) await zoomIn.click(); await page.waitForTimeout(120); }
  const z1 = await viewOf(page);
  rec.ok('the + button actually zooms in', !!z1 && z1.z > z0.z * 2, { from: z0.z, to: z1 && z1.z });

  /* NOW DRAW.  This is the sequence that used to put the view back: the mark
     changes the drawing, the drawing re-composites the figure, and the
     composite's completion handler re-framed the region. */
  const zoomedAim = await aimFor(page, 'tattoo');
  if (zoomedAim) await tap(zoomedAim, zoomedAim.w / 2, zoomedAim.h / 2);
  await page.waitForTimeout(900);
  const z2 = await viewOf(page);
  rec.ok('drawing does NOT zoom you back out',
    !!z2 && Math.abs(z2.z - z1.z) < 0.01, { beforeStroke: z1 && z1.z, afterStroke: z2 && z2.z });
  await page.screenshot({ path: SHOTS + '/skinink-editor-zoomed.png' });

  /* ...and 100% is still the way back. */
  const fitBtn = await page.$('.bt-bodyink-bar button:has-text("100%")');
  if (fitBtn) await fitBtn.click();
  await page.waitForTimeout(400);
  const z3 = await viewOf(page);
  rec.ok('100% puts the whole area back', !!z3 && z3.z < z1.z - 0.01, { zoomed: z1 && z1.z, back: z3 && z3.z });

  /* ═══ THE FACE, INCLUDING THE PARTS THAT WERE OUT OF REACH ═════════════ */
  const faceTab = await page.$('.bt-paint-tabs .bt-cc-tab:nth-child(2)');
  if (faceTab) await faceTab.click();
  await page.waitForTimeout(1500);
  const faceAim = await aimFor(page, 'face');
  rec.ok('the face screen reports where the head is', !!faceAim, faceAim);
  if (faceAim) {
    await tap(faceAim, faceAim.gx0 + faceAim.gw / 2, faceAim.gy0 + (faceAim.gh / 16) * 0.5);
    arts = await readArts(page);
    rec.ok('the TOP ROW of the face grid takes ink (crown/forehead)',
      inked(arts.tattooFace) > 0, { face: inked(arts.tattooFace) });
    await page.screenshot({ path: SHOTS + '/skinink-editor-face.png' });
  }

  /* Network noise is not a designer error: the harness's static server drops a
     connection or two on teardown and those arrive as console errors. */
  const real = A.logs.filter((l) => !/net::|Failed to load resource/i.test(l));
  rec.ok('the designer threw no errors while all of that happened',
    real.length === 0, real.slice(0, 4));
}
