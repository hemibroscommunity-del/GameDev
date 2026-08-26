/* TATTOO THE BODY, NOT A GRID (v2.3.1965).
 *
 * Owner, play-testing: "In the tattoo editor I think it would be better if you
 * just allowed the user to zoom in on any part of the character skin to tattoo
 * it ... You're just making the tattoo on whatever zoomed in body part you want
 * (including forehead etc)."
 *
 * The claim this scenario has to defend is not "a canvas appeared".  It is the
 * one thing the whole surface exists to deliver and the one thing that fails
 * silently if any link in the transform chain is wrong: THE INK LANDS WHERE THE
 * FINGER WAS.  A grid designer that is off by three cells still looks like a
 * working designer; the drawing is simply in the wrong place, and you only find
 * out by squinting at a 125px preview, which is exactly the complaint.
 *
 * So it drives real pointer events at real screen coordinates and then checks
 * the STORE: a tap over the head must ink the face canvas and nothing else, a
 * tap over the chest must ink the chest canvas and nothing else.  It also pins
 * the forehead specifically, because "including forehead etc" was unreachable
 * before v2.3.1965 (the face box started at the brow).
 *
 * Driven through the real creator rather than by calling the component: the
 * bug class here lives in the composition of layout, canvas size, device pixel
 * ratio and the portrait's own transform, and every one of those is only real
 * once the panel is on screen at its actual size.
 */
import * as H from './harness.mjs';

const KEYS = { tattoo: 'bt-tattooart', tattooFace: 'bt-facetattoo', tattooArm: 'bt-armtattoo' };

/** Every stored skin canvas, as {key: art|''}. */
const readArts = (page) => page.evaluate((keys) => {
  const out = {};
  for (const k of Object.keys(keys)) { try { out[k] = localStorage.getItem(keys[k]) || ''; } catch (e) { out[k] = ''; } }
  return out;
}, KEYS);

/** How many cells of `art` are inked (not '0'). */
const inked = (a) => (a ? [...a].filter((c) => c !== '0').length : 0);

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Inker', wsPort, webPort });
  const page = A.page;

  /* Start from a known-blank set, so any ink found afterwards is ink this
     scenario put there. */
  await page.evaluate((keys) => {
    for (const k of Object.keys(keys)) { try { localStorage.removeItem(keys[k]); } catch (e) { /* ignore */ } }
  }, KEYS);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  /* Into the creator.  A device with no character lands there already; one
     with a saved character needs the door. */
  const created = await page.$('[data-tut="login-create"]');
  if (created) await created.click();
  await page.waitForSelector('input.bt-cc-name', { timeout: 30000 });

  /* The skin tab, then its designer. */
  const skinTab = await page.$('[data-cc-tab="skin"]')
    || await page.$('button:has-text("Skin")');
  rec.ok('the creator has a skin tab to reach the designer from', !!skinTab, { found: !!skinTab });
  if (!skinTab) return;
  await skinTab.click();
  await page.waitForTimeout(300);
  await page.click('button.bt-cc-draw');
  await page.waitForSelector('.bt-bodyink-cv', { timeout: 20000 });
  rec.ok('the tattoo designer opens on the BODY surface, not a grid', true);

  /* The surface composites asynchronously (it is the real character), so wait
     for it to have reported its grids before aiming at it. */
  await page.waitForFunction(() => {
    const c = document.querySelector('.bt-bodyink-cv');
    return !!(c && c.width > 0);
  }, null, { timeout: 20000 });
  await page.waitForTimeout(900);

  const box = await page.$('.bt-bodyink-cv');
  const r = await box.boundingBox();
  rec.ok('the surface has a real on-screen size to aim at (guard)',
    !!r && r.width > 40 && r.height > 40, r);
  if (!r || r.width <= 40) return;

  /* WHERE THE REGIONS ARE.  Read from the surface itself (`__btInkAim`,
     v2.3.1965) rather than guessed as a fraction of the canvas: the view is
     zoomed and panned, so "46% down the canvas" is not the chest, and a
     scenario that aims by arithmetic tests its own arithmetic.  Aiming at the
     reported centre and then asserting WHICH CANVAS received the ink is the
     real claim — it fails if a region is misassigned, if a grid is off, or if
     the zoom is not in the transform. */
  const aim = await page.evaluate(() => {
    const c = document.querySelector('.bt-bodyink-cv');
    const a = c && c.__btInkAim;
    if (!a) return null;
    const out = {};
    for (const k of Object.keys(a)) out[k] = { x: a[k].x, y: a[k].y, target: a[k].target };
    return { w: c.width, h: c.height, regions: out };
  });
  rec.ok('the surface reports where each skin region is', !!(aim && aim.regions.face && aim.regions.tattoo),
    aim && Object.keys(aim.regions));
  if (!aim) return;

  /* Canvas backing-store px -> client px. */
  const at = (fx, fy) => ({ x: r.x + (fx / aim.w) * r.width, y: r.y + (fy / aim.h) * r.height });
  const tap = async (fx, fy) => {
    const p = at(fx, fy);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + 1, p.y + 1);
    await page.mouse.up();
    await page.waitForTimeout(420);
  };
  /* Rows of `art` that carry ink, top first. */
  const rows = (a) => {
    const out = [];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (a && a[y * 16 + x] && a[y * 16 + x] !== '0') { out.push(y); break; }
    }
    return out;
  };

  /* The reported face centre must actually BE on the head — the tie back to
     reality that stops the two checks below being self-referential. */
  rec.ok('the reported face region sits in the upper part of the figure (guard)',
    aim.regions.face.y < aim.regions.tattoo.y,
    { faceY: Math.round(aim.regions.face.y), chestY: Math.round(aim.regions.tattoo.y) });

  /* ── the face ─────────────────────────────────────────────────────────── */
  await tap(aim.regions.face.x, aim.regions.face.y);
  let arts = await readArts(page);
  rec.ok('a tap on the face inks the FACE canvas', inked(arts.tattooFace) > 0,
    { face: inked(arts.tattooFace), chest: inked(arts.tattoo), arm: inked(arts.tattooArm) });
  rec.ok('...and nothing else: the chest and arms are untouched',
    inked(arts.tattoo) === 0 && inked(arts.tattooArm) === 0,
    { chest: inked(arts.tattoo), arm: inked(arts.tattooArm) });

  /* ── THE FOREHEAD ─────────────────────────────────────────────────────────
     Named in the owner's note and unreachable before v2.3.1965: the face box
     used to start at the brow, so the top rows of the canvas had no forehead
     under them.  Asserted by WHICH ROW takes the ink, not by how many cells
     are inked — tapping a cell that is already inked the same colour is a
     no-op, so a count is silent about where you actually hit. */
  const faceH = await page.evaluate(() => {
    const c = document.querySelector('.bt-bodyink-cv');
    const g = (c.__btInkAim && c.__btInkAim.face) || null;
    return g ? { x: g.x, gy0: g.gy0, gh: g.gh } : null;
  });
  rec.ok('the face grid has a measurable height to aim within (guard)',
    !!faceH && faceH.gh > 4, faceH);
  /* The second row of the face canvas: high enough to be forehead, not the
     very edge row where a rounded skull can put the cell off the skin mask. */
  await tap(faceH.x, faceH.gy0 + faceH.gh * (1.5 / 16));
  arts = await readArts(page);
  const faceRows = rows(arts.tattooFace);
  rec.ok('the FOREHEAD takes ink (the owner\'s "including forehead etc")',
    faceRows.length > 0 && faceRows[0] <= 5,
    { topInkedRow: faceRows[0], rows: faceRows });

  /* ── the chest ────────────────────────────────────────────────────────── */
  const chestBefore = inked(arts.tattoo);
  const faceBefore = inked(arts.tattooFace);
  await tap(aim.regions.tattoo.x, aim.regions.tattoo.y);
  arts = await readArts(page);
  rec.ok('a tap on the chest inks the CHEST canvas', inked(arts.tattoo) > chestBefore,
    { before: chestBefore, after: inked(arts.tattoo) });
  rec.ok('...and did not leak onto the face', inked(arts.tattooFace) === faceBefore,
    { before: faceBefore, after: inked(arts.tattooFace) });

  /* ── the surface names the region it is on ────────────────────────────── */
  const where = await page.textContent('.bt-bodyink-where').catch(() => null);
  rec.ok('the surface names the body part under your finger',
    !!where && /face|arms|chest/i.test(where.trim()), { where });

  /* ── a drag paints a continuous stroke, not two dots ──────────────────── */
  const strokeBefore = inked(arts.tattoo);
  const p0 = at(aim.regions.tattoo.x - aim.w * 0.04, aim.regions.tattoo.y);
  const p1 = at(aim.regions.tattoo.x + aim.w * 0.04, aim.regions.tattoo.y + aim.h * 0.03);
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(p0.x + (p1.x - p0.x) * (i / 8), p0.y + (p1.y - p0.y) * (i / 8));
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
  arts = await readArts(page);
  rec.ok('a drag lays down a stroke, not a single cell',
    inked(arts.tattoo) >= strokeBefore + 2,
    { before: strokeBefore, after: inked(arts.tattoo) });

  /* ── zoom is really in the transform ──────────────────────────────────── */
  const zoomBtn = await page.$('.bt-bodyink-bar .bt-paint-size:nth-child(3)');
  rec.ok('the surface has a zoom control reachable with one hand (guard)', !!zoomBtn);
  if (zoomBtn) {
    await zoomBtn.click();
    await zoomBtn.click();
    await page.waitForTimeout(800);
    const aim2 = await page.evaluate(() => {
      const c = document.querySelector('.bt-bodyink-cv');
      const a = c && c.__btInkAim;
      if (!a || !a.face) return null;
      return { w: c.width, h: c.height, face: { x: a.face.x, y: a.face.y } };
    });
    rec.ok('zooming moved the reported face region (guard: the zoom did something)',
      !!aim2 && Math.abs(aim2.face.y - aim.regions.face.y) > 2,
      { before: aim.regions.face.y, after: aim2 && aim2.face.y });
    if (aim2) {
      const faceB = inked(arts.tattooFace), chestB = inked(arts.tattoo);
      const p = { x: r.x + (aim2.face.x / aim2.w) * r.width, y: r.y + (aim2.face.y / aim2.h) * r.height };
      await page.mouse.move(p.x, p.y);
      await page.mouse.down(); await page.mouse.move(p.x + 1, p.y + 1); await page.mouse.up();
      await page.waitForTimeout(500);
      const after = await readArts(page);
      rec.ok('after zooming in, a tap on the face STILL inks the face and not the chest',
        inked(after.tattooFace) >= faceB && inked(after.tattoo) === chestB,
        { faceBefore: faceB, faceAfter: inked(after.tattooFace),
          chestBefore: chestB, chestAfter: inked(after.tattoo) });
    }
  }

  const errs = A.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors while inking the body', errs.length === 0, errs.slice(0, 3));
  await A.ctx.close();
}
