/* TWO TATTOO SCREENS: BODY AND FACE (v2.3.1965; rewritten v2.3.1978).
 *
 * Owner: "For the tattoos just do two options: body and face.  If body, show
 * full upper body including head in preview.  In the editor show the actual
 * full upper torso region where you can just draw the tattoo directly on.  It
 * will be full zoom but fitting within the editor window.  For face, same
 * idea.  Full head is shown in the editor.  In the preview it shows the full
 * upper body."
 *
 * ── WHAT CHANGED, AND WHY THIS FILE CHANGED WITH IT ──
 * v2.3.1965 gave the designer one free-roaming surface: the whole character,
 * pan and zoom, and the region you touched decided which of three canvases got
 * the ink.  This scenario asserted exactly that — tap the head, the face canvas
 * fills; tap the chest, the chest canvas does.  That claim is gone on purpose.
 * The tab now chooses the region and the editor is framed on it, so a stroke
 * CANNOT land on a canvas you did not pick.  The assertions below say the new
 * thing rather than a loosened version of the old one.
 *
 * The arm canvas keeps rendering and keeps its data; it simply has no editor.
 *
 * ── WHAT IS ACTUALLY BEING DEFENDED ──
 * The same property as before, which is the one that fails silently: the ink
 * lands where the finger was. A designer that is off by three cells still looks
 * like a working designer — you only find out later, on your own character.
 * So this drives real pointer events at real coordinates and then reads the
 * STORE, on both tabs, and pins the framing the owner asked for (the region
 * fills the editor) with a number rather than a screenshot.
 */
import * as H from './harness.mjs';

const KEYS = { tattoo: 'bt-tattooart', tattooFace: 'bt-facetattoo', tattooArm: 'bt-armtattoo' };

const readArts = (page) => page.evaluate((keys) => {
  const out = {};
  for (const k of Object.keys(keys)) { try { out[k] = localStorage.getItem(keys[k]) || ''; } catch (e) { out[k] = ''; } }
  return out;
}, KEYS);

/** How many cells of `art` are inked (not '0'). */
const inked = (a) => (a ? [...a].filter((c) => c !== '0').length : 0);

/** Rows of `art` that carry ink, top first. */
const rows = (a) => {
  const out = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (a && a[y * 16 + x] && a[y * 16 + x] !== '0') { out.push(y); break; }
  }
  return out;
};

/** The framed region's grid box, in the editor canvas's own pixels. */
const aimFor = (page, key) => page.evaluate((k) => {
  const c = document.querySelector('.bt-bodyink-cv');
  const a = c && c.__btInkAim && c.__btInkAim[k];
  if (!a) return null;
  return { w: c.width, h: c.height, x: a.x, y: a.y, gx0: a.gx0, gy0: a.gy0, gw: a.gw, gh: a.gh };
}, key);

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Inker', wsPort, webPort });
  const page = A.page;

  await page.evaluate((keys) => {
    for (const k of Object.keys(keys)) { try { localStorage.removeItem(keys[k]); } catch (e) { /* ignore */ } }
  }, KEYS);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const created = await page.$('[data-tut="login-create"]');
  if (created) await created.click();
  await page.waitForSelector('input.bt-cc-name', { timeout: 30000 });

  /* v2.3.2078: the `[data-cc-tab]` half of this was dead — that attribute
     has never existed in src/ (checked across the whole history), so the
     text selector was always the one doing the work.  A selector that can
     never match is a lie about which handle the UI offers. */
  const skinTab = await page.$('button:has-text("Skin")');
  rec.ok('the creator has a skin tab to reach the designer from', !!skinTab, { found: !!skinTab });
  if (!skinTab) return;
  await skinTab.click();
  await page.waitForTimeout(300);
  await page.click('button.bt-cc-draw');
  await page.waitForSelector('.bt-bodyink-cv', { timeout: 20000 });
  await page.waitForTimeout(1800);

  /* ── TWO OPTIONS, NAMED ──────────────────────────────────────────────── */
  const tabs = await page.evaluate(() =>
    [...document.querySelectorAll('.bt-paint-tabs .bt-cc-tab')].map((b) => b.textContent.trim().toLowerCase()));
  rec.ok('the tattoo designer offers exactly two screens, body and face',
    tabs.length === 2 && tabs[0] === 'body' && tabs[1] === 'face', { tabs });

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
    await page.waitForTimeout(420);
  };

  /* ═══ BODY ═══════════════════════════════════════════════════════════ */
  const bodyAim = await aimFor(page, 'tattoo');
  rec.ok('the body screen reports where the torso is', !!bodyAim, bodyAim);
  if (!bodyAim) return;

  /* "full zoom but fitting within the editor window" — as a number: the torso's
     own grid has to occupy most of the editor, not sit in the middle of a
     zoomed-out character. Under 55% would be the v2.3.1965 framing. */
  const bodyFill = Math.max(bodyAim.gw / bodyAim.w, bodyAim.gh / bodyAim.h);
  rec.ok(`the torso FILLS the editor (${Math.round(bodyFill * 100)}% of it), rather than sitting in a zoomed-out figure`,
    bodyFill >= 0.55, { gw: Math.round(bodyAim.gw), gh: Math.round(bodyAim.gh), w: bodyAim.w, h: bodyAim.h });

  await tap(bodyAim, bodyAim.x, bodyAim.y);
  let arts = await readArts(page);
  rec.ok('a tap on the body screen inks the CHEST canvas', inked(arts.tattoo) > 0,
    { chest: inked(arts.tattoo), face: inked(arts.tattooFace), arm: inked(arts.tattooArm) });
  rec.ok('...and nothing else: the face and arms are untouched',
    inked(arts.tattooFace) === 0 && inked(arts.tattooArm) === 0,
    { face: inked(arts.tattooFace), arm: inked(arts.tattooArm) });

  /* A drag lays a stroke, not a dot. */
  const strokeBefore = inked(arts.tattoo);
  const p0 = at(bodyAim, bodyAim.x - bodyAim.gw * 0.18, bodyAim.y);
  const p1 = at(bodyAim, bodyAim.x + bodyAim.gw * 0.18, bodyAim.y + bodyAim.gh * 0.12);
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
    inked(arts.tattoo) >= strokeBefore + 2, { before: strokeBefore, after: inked(arts.tattoo) });

  const chestAfterBody = inked(arts.tattoo);

  /* ═══ FACE ═══════════════════════════════════════════════════════════ */
  const tabBtns = await page.$$('.bt-paint-tabs .bt-cc-tab');
  await tabBtns[1].click();
  await page.waitForTimeout(2000);

  const faceAim = await aimFor(page, 'face');
  rec.ok('the face screen reports where the head is', !!faceAim, faceAim);
  if (!faceAim) return;

  const faceFill = Math.max(faceAim.gw / faceAim.w, faceAim.gh / faceAim.h);
  rec.ok(`the head FILLS the editor (${Math.round(faceFill * 100)}% of it)`,
    faceFill >= 0.55, { gw: Math.round(faceAim.gw), gh: Math.round(faceAim.gh), w: faceAim.w, h: faceAim.h });
  rec.ok('...and the two screens really are framed differently (guard: not the same view twice)',
    Math.abs(faceAim.gh - bodyAim.gh) > 4 || Math.abs(faceAim.y - bodyAim.y) > 4,
    { body: { y: Math.round(bodyAim.y), gh: Math.round(bodyAim.gh) },
      face: { y: Math.round(faceAim.y), gh: Math.round(faceAim.gh) } });

  await tap(faceAim, faceAim.x, faceAim.y);
  arts = await readArts(page);
  rec.ok('a tap on the face screen inks the FACE canvas', inked(arts.tattooFace) > 0,
    { face: inked(arts.tattooFace), chest: inked(arts.tattoo) });
  rec.ok('...and did not touch the body you already drew',
    inked(arts.tattoo) === chestAfterBody,
    { before: chestAfterBody, after: inked(arts.tattoo) });

  /* THE FOREHEAD, named in the owner's earlier note and unreachable before
     v2.3.1965. Asserted by WHICH ROW takes the ink: re-inking a cell that is
     already that colour is a no-op, so a count says nothing about where you
     hit. */
  await tap(faceAim, faceAim.x, faceAim.gy0 + faceAim.gh * (1.5 / 16));
  arts = await readArts(page);
  const faceRows = rows(arts.tattooFace);
  rec.ok('the FOREHEAD takes ink (the owner\'s "including forehead etc")',
    faceRows.length > 0 && faceRows[0] <= 5, { topInkedRow: faceRows[0], rows: faceRows });

  const errs = A.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors while inking', errs.length === 0, errs.slice(0, 3));
  await A.ctx.close();
}
