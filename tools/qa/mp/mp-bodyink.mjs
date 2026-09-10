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

const KEYS = { tattoo: 'bt-tattooart', tattooBack: 'bt-tattooart-back', tattooFace: 'bt-facetattoo', tattooArm: 'bt-armtattoo',
  /* v2.3.2421: the back of the head. It has had a canvas since v2.3.2043 and a
     way to select it since v2.3.2150, and no scenario has ever read it -- which
     is how it stayed possible for the Face screen's Back side to be the one
     surface still showing you the FRONT drawing. */
  tattooHeadBack: 'bt-headbackart' };   /* v2.3.2150: +the back canvas */

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
  /* ═══ v2.3.2421: PUT A SHIRT ON HIM FIRST ═══
     Everything below is about a drawing that a shirt COVERS, and this scenario
     has always run on a fresh character, who wears none.  That made a whole
     rule untestable: each tattoo screen takes off what hides the canvas it is
     pointed at (a shirt for the chest and the back, a hat for the face), and
     with nothing worn, "take the shirt off" and "do nothing" are the same
     picture.  A back tattoo under a shirt is also simply the normal case --
     most players are wearing one by the time they open this.
     The tab is put back to Skin afterwards: the editor is reached from the ink
     card on Skin, and the pick persists across tabs. */
  const shirtTab = await page.$('button:has-text("Shirt")');
  rec.ok('the creator has a shirt tab (guard)', !!shirtTab);
  if (shirtTab) {
    await shirtTab.click();
    await page.waitForTimeout(700);
    const wore = await page.evaluate(() => {
      const t = [...document.querySelectorAll('.bt-cc-strip button')]
        .find((x) => (x.getAttribute('title') || '').toLowerCase() !== 'none');
      if (!t) return null;
      t.click();
      return t.getAttribute('title');
    });
    await page.waitForTimeout(900);
    /* Clicking a tile is not the same as wearing what it shows, and a scenario
       that assumes it would report on a bare chest while claiming a shirt. The
       creator marks the pick with a painted badge; that badge is the proof. */
    const worn = await page.evaluate(() => {
      const t = [...document.querySelectorAll('.bt-cc-strip button')]
        .find((x) => x.querySelector('img[src*="cc-selected"]'));
      return t ? (t.getAttribute('title') || '?') : null;
    });
    rec.ok(`the character is actually WEARING a shirt now ("${worn}") -- without `
      + 'one, "the editor takes off what covers the drawing" is untestable',
      !!worn && (worn || '').toLowerCase() !== 'none', { picked: wore, worn });
    await skinTab.click();
    await page.waitForTimeout(700);
  }

  await skinTab.click();
  await page.waitForTimeout(300);
  await page.click('button.bt-cc-ink-pane');   /* v2.3.2414: the Design button is the ink CARD now */
  await page.waitForSelector('.bt-bodyink-cv', { timeout: 20000 });
  await page.waitForTimeout(1800);

  /* ── TWO OPTIONS, NAMED ──────────────────────────────────────────────── */
  const tabs = await page.evaluate(() =>
    [...document.querySelectorAll('.bt-paint-tabs .bt-cc-tab')].map((b) => b.textContent.trim().toLowerCase()));
  rec.ok('the tattoo designer offers exactly two screens, body and face',
    tabs.length === 2 && tabs[0] === 'body' && tabs[1] === 'face', { tabs });

  /* ═══ v2.3.2150: AND A FRONT/BACK SWITCH ═══
     Owner, after the back canvas shipped: "I don't see a menu option that
     toggles tattooing the back." There was none, and the reason is structural:
     these screens have no canvas PICKER -- the tab frames a view and your
     FINGER chooses the canvas, off a figure that faces the camera, so a back
     canvas is unreachable by construction. That had also left the back of the
     HEAD unreachable ever since v2.3.2043 added it.

     Checked on its OWN class rather than folded into the tab count above: the
     two things answer different questions ("which screen" vs "which way
     round"), and sharing a selector is how a switch starts looking like two
     more screens. */
  const sideSwitch = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('[data-ink-side-btn]')];
    return {
      labels: btns.map((b) => b.getAttribute('data-ink-side-btn')),
      visible: btns.filter((b) => b.offsetParent).length,
      pressed: btns.filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => b.getAttribute('data-ink-side-btn')),
    };
  });
  rec.ok('the designer offers a FRONT/BACK switch, so the back canvases can be '
    + 'reached at all -- the menu option the owner could not find',
    sideSwitch.visible === 2 && sideSwitch.labels.join(',') === 'front,back', sideSwitch);
  rec.ok('...and it opens on FRONT, so nobody who never touches it sees any '
    + 'change', sideSwitch.pressed.join(',') === 'front', sideSwitch);

  /* ═══ v2.3.2421: EVERY STROKE BELOW IS BLUE, ON PURPOSE ═══
     The assertions this file gained for the back view ask what is PAINTED on
     the editor, not just what is stored, and "is my drawing showing" cannot be
     answered in the default near-black: it is the body sheet's own outline
     colour. Nor in yellow, which was tried first and is a trap -- the stamp is
     modulated by the sheet's shading, so a #f2c94c stroke lands as anything
     from 240,190,78 down to 197,128,73, and that darker end is indistinguishable
     from skin. Blue is the one family the figure has none of: shade it as far
     as you like and the BLUE channel still leads, which no skin tone does.
     Colour alone changes nothing else here -- every other assertion counts
     inked cells, which are counted the same whatever colour they are. */

  /* Pixels the figure cannot produce by itself, on any canvas in the panel:
     `.bt-bodyink-cv` is the big editor surface, `.bt-paint-pv` the little worn
     preview beside it.  Both are asked, because they are composited by
     different code (BodyInk's own pass and WornPreview's) and the v2.3.2421
     leak was in BOTH -- fixing one and testing only that one would have left
     the preview still showing a chest tattoo on a back. */
  /* THREE colours, and which one a pixel is answers WHOSE drawing it is:
       blue   drawn on a FRONT canvas (chest, face)
       green  drawn on a BACK-ONLY canvas (tattooBack, tattooHeadBack)
       pink   drawn on the ARM, which is neither -- an arm is the same arm from
              behind, so its canvas shows on both sides by design (artForFacing
              leaves it alone, playerSkins v2.3.2148)
     So "a front drawing came round", "the back's own drawing is showing" and
     "the arm shows from both sides" become separate readings of one frame
     rather than a single count that has to be interpreted.  The arm needed a
     colour of its own the moment this file drew on it: as green, a green pixel
     on the front view meant either a bug or the arm working exactly as
     designed, which is an assertion that cannot be written. */
  /* Each hue is a list of [channel, channel, minimum] tests, all of which must
     hold: enough to name a colour family through the shading the stamp applies
     (a #3f7fd0 stroke lands anywhere from 63,127,208 down to a third of that)
     and narrow enough that skin cannot answer to it.  PINK is the one that
     needs the two-channels-above-one shape -- skin is r > g > b, so "green is
     the lowest of the three" is what separates them. */
  const HUE = {
    blue: [[2, 0, 30], [2, 1, 20]],
    green: [[1, 0, 30], [1, 2, 20]],
    pink: [[0, 1, 20], [2, 1, 20]],
  };
  const hueIn = (sel, hue) => page.evaluate(([q, tests]) => {
    const c = document.querySelector(q);
    if (!c || !c.width) return -1;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 30) continue;
      let all = true;
      for (let t = 0; t < tests.length; t++) {
        if (d[i + tests[t][0]] - d[i + tests[t][1]] < tests[t][2]) { all = false; break; }
      }
      if (all) n++;
    }
    return n;
  }, [sel, HUE[hue]]);
  const blueIn = (sel) => hueIn(sel, 'blue');
  const blue = () => blueIn('.bt-bodyink-cv');
  const green = () => hueIn('.bt-bodyink-cv', 'green');
  const pickColour = async (i) => {
    await page.click(`.bt-paint-pal button[aria-label="Colour ${i}"]`);
    await page.waitForTimeout(200);
  };
  /* The whole editor canvas, for "is this even the same picture". */
  const frame = () => page.evaluate(() => {
    const c = document.querySelector('.bt-bodyink-cv');
    if (!c) return null;
    return { w: c.width, h: c.height,
      d: Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data) };
  });
  const framesDiffer = (a, b) => {
    if (!a || !b || a.w !== b.w || a.h !== b.h) return null;
    let seen = 0, diff = 0;
    for (let i = 0; i < a.d.length; i += 4) {
      if (a.d[i + 3] < 30 && b.d[i + 3] < 30) continue;
      seen++;
      if (a.d[i] !== b.d[i] || a.d[i + 1] !== b.d[i + 1] || a.d[i + 2] !== b.d[i + 2]) diff++;
    }
    return seen ? diff / seen : null;
  };

  await pickColour(8);   /* the FRONT is drawn in blue */

  const box = await page.$('.bt-bodyink-cv');
  const r = await box.boundingBox();
  /* ═══ v2.3.2421: A TAP THAT RE-READS WHERE THE CANVAS IS ═══
     `r` above is captured once, and after any click on a control it can be
     wrong -- not because the VIEW moved (the aim follows that: __btInkAim is
     re-stamped on every blit) but because .bt-paint scrolls, and Playwright
     scrolls a control into view before clicking it.  Measured: clicking the
     Back switch slid the canvas 67px LEFT, so a tap aimed at an arm landed on
     the torso and reported the wrong canvas -- an assertion failure that looks
     exactly like "the back view cannot reach the arms" and is not.
     Anything aimed after a click therefore re-reads the box. */
  const tapLive = async (a, fx, fy) => {
    const b = await (await page.$('.bt-bodyink-cv')).boundingBox();
    const p = { x: b.x + (fx / a.w) * b.width, y: b.y + (fy / a.h) * b.height };
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + 1, p.y + 1);
    await page.mouse.up();
    await page.waitForTimeout(500);
  };
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

  /* ═══ v2.3.2150: THE BACK, THROUGH THE SWITCH ═══
     The switch existing is not the feature -- inking the BACK with it is. So
     this flips it, taps the same torso, and checks where the ink went. The
     chest count is checked as well as the back one, because the failure this
     could plausibly have is not "nothing happens" but "it writes to the front
     canvas anyway", which a back-only assertion would call a pass. */
  const chestBeforeBack = inked(arts.tattoo);
  /* ═══ TAP THE EDITOR'S CENTRE, NOT A REMEMBERED AIM ═══
     The aim captured at the top of this scenario is STALE by here -- the zoom
     and drag steps above move the view, and __btInkAim does not follow, so a
     tap at those coordinates lands off the torso. That is not hypothetical:
     the control below was added precisely because the back check was failing,
     and the control failed too, with FRONT selected -- which is what proved
     the coordinates were the problem rather than the back canvas.

     The Body tab frames the torso to fill the editor (this scenario asserts
     exactly that, above), so the canvas's own centre is on the chest by
     construction and cannot go stale. */
  const centreTap = async () => {
    const box = await page.$('.bt-bodyink-cv');
    const b = await box.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 1, b.y + b.height / 2 + 1);
    await page.mouse.up();
    await page.waitForTimeout(420);
  };
  /* Counted in OPS, not in inked cells. The centre cell may already carry ink
     from the drag above, and a pen stroke over an inked cell changes no cell
     count at all -- the first version of this control read cells, reported
     7 -> 7, and looked exactly like a tap that had missed. An op is appended
     either way, so the op list is what says the gesture landed. */
  const opsFor = (id) => page.evaluate((k) => {
    try {
      const raw = localStorage.getItem('bt-artops');
      const p2 = raw ? JSON.parse(raw) : null;
      return p2 && p2[k] && p2[k].o ? p2[k].o.length : 0;
    } catch (e) { return -1; }
  }, id);
  const ctrlBefore = await opsFor('tattoo');
  await centreTap();
  const ctrlAfter = await opsFor('tattoo');
  rec.ok('control: a tap at the editor centre still reaches the CHEST with '
    + 'Front selected (guard: if this fails the tap is missing and the back '
    + 'check below proves nothing)', ctrlAfter > ctrlBefore, { ctrlBefore, ctrlAfter });

  const backBtn = await page.$('[data-ink-side-btn="back"]');
  rec.ok('the Back switch is tappable (guard)', !!backBtn);
  if (backBtn) {
    /* The editor as it stands with FRONT selected and a chest drawing on it --
       the picture the two assertions below are measured against. */
    const frontFrame = await frame();
    const frontBlue = await blue();
    const frontPv = await blueIn('.bt-paint-pv');
    rec.ok('guard: the chest drawing is actually PAINTED on the front view '
      + `(${frontBlue} blue pixels) -- without this the back checks below could `
      + 'pass on an editor that paints nothing at all', frontBlue > 40,
      { frontBlue });
    rec.ok('guard: ...and on the worn preview beside it '
      + `(${frontPv} blue pixels)`, frontPv > 0, { frontPv });

    await backBtn.click();
    await page.waitForTimeout(1800);
    await pickColour(6);   /* everything drawn on the BACK is green */

    /* ═══ v2.3.2421: THE FIGURE TURNS ROUND ═══
       Owner: "the back button does not make the large canvas rotate to the
       back."  It did not: v2.3.2150 shipped the switch as a canvas remap only
       and left the surface facing the camera, on the reasoning that there was
       no back view to paint on.  There is (`north` is a real sheet), so the
       switch now composites it.
       Measured as "is this the same picture", over opaque pixels only, because
       a claim about a rotation cannot be made from a stored string: the whole
       failure is that the DRAWING moved and the PICTURE did not.  Front and
       back of the same character share a silhouette and a palette, so this
       number is not near 100 even when it works -- but it is high: 98% measured
       over opaque pixels, because the shading of every limb moves.
       The bar is 60% rather than something near either end, and that is a
       measured choice: with the composite left facing south the same run
       reports 22-25%, NOT 0, because the drawings still swap under it and the
       chest piece vanishing is itself a difference.  A bar just above the
       broken reading would be one drawing-size away from passing on a figure
       that never turned. */
    const backFrame = await frame();
    const turned = framesDiffer(frontFrame, backFrame);
    rec.ok('the Back switch turns the LARGE canvas round -- '
      + `${turned == null ? '?' : Math.round(turned * 100)}% of the figure's own `
      + 'pixels are a different picture, not just a different label',
      turned != null && turned >= 0.6, { turned });

    /* ═══ ...AND THE FRONT'S DRAWING STAYS ON THE FRONT ═══
       Owner: "the front copies its drawings onto the back (these should be
       separate)."  They were separate in the store and on the walking
       character; the pane you draw on was the one place they were not, because
       drawCharacterPortrait reads an unset `tattooArt` from the live store --
       the FRONT canvas -- and nothing set it for a back canvas.
       So this is asked of the PIXELS: the chest drawing is on screen right now
       (the guard above counted it), and the back view must not be showing it. */
    const backBlue = await blue();
    rec.ok('...and the chest drawing does not come round with it '
      + `(${frontBlue} blue pixels on the front, ${backBlue} on the back)`,
      backBlue <= Math.max(8, frontBlue * 0.1), { frontBlue, backBlue });
    /* The worn preview is a SECOND composite of the same figure (WornPreview,
       not BodyInk), and it had the identical leak: with no branch for the back
       canvases it left `tattooArt` unset, which drawCharacterPortrait reads as
       "this device's own" -- the front chest drawing, stamped on a back. */
    const backPv = await blueIn('.bt-paint-pv');
    rec.ok('...and nor does it on the worn preview, which turned round too '
      + `(${frontPv} blue pixels on the front, ${backPv} on the back)`,
      backPv <= Math.max(4, frontPv * 0.1), { frontPv, backPv });
    /* The green baselines the two "and the back's own drawing shows" checks
       below are measured against -- read here, before anything green exists. */
    const backGreen = await green();
    const backPvGreen = await hueIn('.bt-paint-pv', 'green');

    const backAim = await aimFor(page, 'tattoo');
    rec.ok('the body screen still reports where the torso is with Back on '
      + '(guard: the north sheet reports the same `tattoo` region, so the '
      + 'finger keeps hit-testing -- it is now the back of the torso)',
      !!backAim, backAim);
    if (backAim) {
      await centreTap();
      await page.waitForTimeout(900);
      /* The converse of the separation check, and the one a player makes
         first: a mark on the back has to SHOW on the back.  Without it the
         two assertions above are satisfied by an editor that paints nothing. */
      const inkedGreen = await green();
      rec.ok('...while a stroke made ON the back does show there '
        + `(${backGreen} green pixels before it, ${inkedGreen} after)`,
        inkedGreen > backGreen + 10, { backGreen, inkedGreen });
      const inkedPv = await hueIn('.bt-paint-pv', 'green');
      rec.ok('...on the worn preview as well, which is where you check what it '
        + `looks like ON you (${backPvGreen} before, ${inkedPv} after)`,
        inkedPv > backPvGreen, { backPvGreen, inkedPv });

      /* ═══ v2.3.2421: THE ARM, WHICH IS THE CASE THE GENERAL FIX EXISTS FOR ═══
         The Body screen lets your FINGER move the canvas (v2.3.1994), so with
         Back selected the panel can be editing a THIRD canvas -- the arm, which
         has no back counterpart because an arm is the same arm from behind.
         Naming the two back canvases in WornPreview's table is not enough for
         that case: the pane is on `tattooArm`, neither back branch fires, and
         the torso slot falls back to the live store -- the front chest drawing,
         on a back.  Which is why the fix is a facing rule applied after the
         table rather than two more rows in it. */
      const armAim = await aimFor(page, 'arms');
      rec.ok('the surface reports where an arm is, with Back on (guard)',
        !!armAim, armAim);
      if (armAim) {
        await pickColour(11);   /* the ARM is pink: neither side owns it */
        await tapLive(armAim, armAim.x, armAim.y);
        arts = await readArts(page);
        rec.ok('guard: that tap really did move the panel onto the ARM canvas',
          inked(arts.tattooArm) > 0, { arm: inked(arts.tattooArm) });
        const armPv = await blueIn('.bt-paint-pv');
        rec.ok('...and with an arm selected the back view STILL does not show '
          + `the chest drawing (${frontPv} blue pixels on the front, ${armPv} `
          + 'here)', armPv <= Math.max(4, frontPv * 0.1), { frontPv, armPv });
      }
      arts = await readArts(page);
      rec.ok('with Back selected, a tap on the torso inks the BACK canvas -- '
        + "the owner's ask: \"a menu option that toggles tattooing the back\"",
        inked(arts.tattooBack) > 0,
        { back: inked(arts.tattooBack), chest: inked(arts.tattoo),
          down: await page.evaluate(() => window.__btInkDown || null) });
      rec.ok('...and left the CHEST drawing exactly as it was, so the switch '
        + 'moves the canvas rather than just the label',
        inked(arts.tattoo) === chestBeforeBack,
        { before: chestBeforeBack, after: inked(arts.tattoo) });
    }
    /* Back to front, or the face section below starts on the wrong side.
       v2.3.2421: and back to BLUE with it -- the colour tracks the SIDE, not
       the screen, so that a blue pixel means "drawn on a front canvas"
       everywhere in this file.  Missing this made the face section's separation
       check compare 0 against 0, which is a passing assertion that separates
       nothing (TRAPS #66). */
    const frontBtn = await page.$('[data-ink-side-btn="front"]');
    if (frontBtn) { await frontBtn.click(); await page.waitForTimeout(900); }
    await pickColour(8);
  }

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

  /* ═══ v2.3.2421: THE FACE SCREEN'S OTHER SIDE ═══
     The back of the head has had a canvas since v2.3.2043 and a switch to
     reach it since v2.3.2150, and no scenario has ever read it.  That gap is
     why it could sit there showing the FRONT face drawing on a head turned
     round: the torso half of the same bug was at least visible in a suite, the
     head half was not.
     Same three questions as the torso: does the picture change, does the face
     drawing stay off it, and does the ink land in the right canvas. */
  const faceBackBtn = await page.$('[data-ink-side-btn="back"]');
  rec.ok('the Face screen offers the same Front/Back switch (guard)', !!faceBackBtn);
  if (faceBackBtn) {
    const faceFrontFrame = await frame();
    const faceFrontBlue = await blue();
    const faceFrontPv = await blueIn('.bt-paint-pv');
    /* The separation runs both ways, and this is the direction a fix can break
       by over-reaching: a front view showing GREEN would mean it had pointed
       the front at the back's drawings. */
    const faceFrontGreen = await hueIn('.bt-paint-pv', 'green');
    rec.ok('with FRONT selected, nothing drawn on a back-only canvas shows on '
      + `the worn preview (${faceFrontGreen} green pixels)`,
      faceFrontGreen <= 4, { faceFrontGreen, faceFrontBlue, faceFrontPv });
    /* ...and the arm, which is the exception, is still the exception: drawn
       from BEHIND a moment ago and showing from the FRONT now, which is what
       "an arm is the same arm from behind" has to mean if it means anything.
       Without this the two rules above are satisfied by a fix that simply
       stopped drawing the far side's canvases at all. */
    const faceFrontPink = await hueIn('.bt-paint-pv', 'pink');
    rec.ok('...but the ARM drawing, made from behind, does show from the front '
      + `(${faceFrontPink} pink pixels) -- an arm is the same arm either way`,
      faceFrontPink > 4, { faceFrontPink });
    const faceBefore = inked(arts.tattooFace);
    await faceBackBtn.click();
    await page.waitForTimeout(1800);
    await pickColour(6);
    const faceTurned = framesDiffer(faceFrontFrame, await frame());
    rec.ok('the head turns round too -- '
      + `${faceTurned == null ? '?' : Math.round(faceTurned * 100)}% of it is a `
      + 'different picture', faceTurned != null && faceTurned >= 0.6, { faceTurned });
    const headBackBlue = await blue();
    rec.ok('...and nothing drawn on a FRONT canvas comes round with it '
      + `(${faceFrontBlue} blue pixels on the face, ${headBackBlue} on the back `
      + 'of the head)',
      headBackBlue <= Math.max(8, faceFrontBlue * 0.1), { faceFrontBlue, headBackBlue });
    const headPv = await blueIn('.bt-paint-pv');
    rec.ok('...on the worn preview either '
      + `(${faceFrontPv} blue pixels on the face, ${headPv} on the back of the `
      + 'head)', headPv <= Math.max(4, faceFrontPv * 0.1), { faceFrontPv, headPv });

    const headAim = await aimFor(page, 'face');
    rec.ok('the face screen still reports where the head is with Back on (guard)',
      !!headAim, headAim);
    if (headAim) {
      await tapLive(headAim, headAim.x, headAim.y);
      arts = await readArts(page);
      rec.ok('a tap with Back selected inks the BACK OF THE HEAD canvas',
        inked(arts.tattooHeadBack) > 0,
        { headBack: inked(arts.tattooHeadBack), face: inked(arts.tattooFace) });
      rec.ok('...and left the FACE drawing exactly as it was',
        inked(arts.tattooFace) === faceBefore,
        { before: faceBefore, after: inked(arts.tattooFace) });
    }
  }

  const errs = A.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors while inking', errs.length === 0, errs.slice(0, 3));
  await A.ctx.close();
}
