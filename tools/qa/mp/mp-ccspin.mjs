/* ═══ THE SPIN CUE (v2.3.2391) ═══
 *
 * Owner, with the art attached and a sketch of it drawn at the bro's feet:
 * "Can you put a little white arc with two dots at the end as a visual cue
 * that the character can spin around if you drag your finger on him?"
 *
 * v2.3.2006 removed the two rotate CIRCLES and its own note admits what that
 * cost: "the circles were the discoverability crutch for it".  This is that
 * crutch put back as a picture instead of a control.
 *
 * ── THE ASSERTION THAT MATTERS ──
 * Not that the image is on screen.  That an affordance laid ON TOP of a
 * gesture target does not EAT the gesture it advertises.  A cue that swallows
 * the drag is worse than no cue, and it is the exact failure a screenshot
 * cannot see: the picture looks perfect in both cases.  So this drags for
 * real, through the cue's own centre, and checks the bro actually turned.
 *
 * The facing is read off the canvas's inline transform, which NameModal keys
 * to previewDir (southwest gets an 8px drop, south gets none) -- a value that
 * only changes if rotatePreview really ran.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const read = (P) => P.page.evaluate(() => {
  const cue = document.querySelector('.bt-cc-spincue');
  const cv = document.querySelector('.bt-cc-stage canvas');
  const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
      cx: Math.round(b.x + b.width / 2), bottom: Math.round(b.bottom) }; };
  const cr = r(cue);
  /* WHO ACTUALLY GETS THE PRESS at the cue's own centre. */
  const hit = cr ? document.elementFromPoint(cr.cx, Math.round(cr.y + cr.h / 2)) : null;
  return {
    cue: cr, canvas: r(cv),
    natural: cue ? cue.naturalWidth : null,
    opacity: cue ? getComputedStyle(cue).opacity : null,
    pointer: cue ? getComputedStyle(cue).pointerEvents : null,
    hitTag: hit ? (hit.tagName + '.' + (typeof hit.className === 'string' ? hit.className.split(' ')[0] : '')) : null,
    facing: cv ? cv.style.transform : null,
    ariaHidden: cue ? cue.getAttribute('aria-hidden') : null,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Spin', wsPort, webPort,
    viewport: PHONE, touch: true, dpr: 2 });
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('.bt-cc-stage canvas', { timeout: 30000 });
  await P.page.waitForTimeout(2000);

  const a = await read(P);
  console.log('    at rest: ' + JSON.stringify(a));

  rec.ok('the spin cue is in the creator (guard)', !!a.cue, a);
  /* naturalWidth is the only honest "it is really there": a wrong path leaves a
     broken <img> that still keeps its class and still reports a box. */
  rec.ok('...and its art actually decoded, not a broken image', a.natural > 0, a);
  rec.ok('...and it is showing on arrival, before anything has been taught',
    a.opacity === '1', a);
  rec.ok('...and it is hidden from a screen reader', a.ariaHidden === 'true', a);

  /* At the bro's FEET, where the owner drew it -- centred on him, and low. */
  rec.ok(`the cue is centred on the character (cue ${a.cue.cx} vs canvas ${a.canvas.cx})`,
    Math.abs(a.cue.cx - a.canvas.cx) <= 3, { cue: a.cue.cx, canvas: a.canvas.cx });
  /* AGAINST HIS INK, NOT HIS BOX.  The canvas is a 261px square and his drawn
     figure occupies rather less of it, so "below 55% of the canvas box" passes
     with ~65px of slack while the cue sits on his shins.  The alpha scan below
     is the same method mp-ccstand and mp-ccfeet use to find the figure, and it
     is the only way to say anything true about where the cue is ON HIM. */
  const ink = await P.page.evaluate(() => {
    const c = document.querySelector('.bt-cc-stage canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let top = c.height, bot = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x += 2) {
        if (d[(y * c.width + x) * 4 + 3] > 40) { if (y < top) top = y; bot = y; break; }
      }
    }
    const r = c.getBoundingClientRect();
    const s = r.height / c.height;
    return { top: Math.round(r.top + top * s), bottom: Math.round(r.top + bot * s) };
  });
  const inkMid = (ink.top + ink.bottom) / 2;
  console.log('    figure ink: ' + JSON.stringify(ink) + '  mid ' + Math.round(inkMid));
  rec.ok(`the cue sits on his LOWER half, at the boots rather than his face `
       + `(cue centre ${Math.round(a.cue.y + a.cue.h / 2)}, his ink runs ${ink.top}-${ink.bottom})`,
    (a.cue.y + a.cue.h / 2) > inkMid, { cue: a.cue, ink });
  /* And it does not run off him into the gold plate below.  mp-ccfeet buys the
     boots only ~4px of air over that plate at 390x664, so a cue that hangs is
     the same defect that file was written for (v2.3.2378). */
  const plate = await P.page.evaluate(() => {
    const e = document.querySelector('.bt-cc-cluster');
    return e ? Math.round(e.getBoundingClientRect().top) : null;
  });
  rec.ok(`...without hanging into the name plate below (cue bottom ${a.cue.bottom}, plate top ${plate})`,
    plate === null || a.cue.bottom <= plate, { cueBottom: a.cue.bottom, plate });
  /* "a little arc" -- not a banner across the stage. */
  rec.ok(`...and it is little (${a.cue.w}px against a ${a.canvas.w}px character)`,
    a.cue.w < a.canvas.w, { cue: a.cue.w, canvas: a.canvas.w });

  /* ── THE ONE THAT MATTERS ── */
  rec.ok('the cue takes no pointer events', a.pointer === 'none', a);
  rec.ok(`...so a press at its very centre reaches the canvas underneath (got ${a.hitTag})`,
    a.hitTag === 'CANVAS.', a);

  /* A REAL drag, started on the cue's own middle. */
  const before = a.facing;
  const cx = a.cue.cx, cy = Math.round(a.cue.y + a.cue.h / 2);
  await P.page.mouse.move(cx, cy);
  await P.page.mouse.down();
  await P.page.mouse.move(cx + 45, cy, { steps: 5 });
  await P.page.mouse.up();
  await P.page.waitForTimeout(900);
  const b = await read(P);
  console.log('    after a drag through the cue: ' + JSON.stringify({ facing: b.facing, opacity: b.opacity }));

  rec.ok(`dragging THROUGH the cue still turns the bro (${before} -> ${b.facing})`,
    !!b.facing && b.facing !== before, { before, after: b.facing });
  /* And having taught its lesson, it leaves. */
  rec.ok('...and the cue stands down once he has been turned',
    b.opacity === '0', b);

  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/ccspin.png` }).catch(() => {});
  await P.ctx.close().catch(() => {});

  /* ── AND AGAIN ON THE SHORT PHONE ──
     390x664 is the same handset with the browser toolbars showing, and it is
     the tight one: the stage keeps its width but loses a third of its height
     (343x240 against 343x343), so anything sized off stage WIDTH grows against
     a character sized off stage HEIGHT.  mp-ccfeet measures only ~4px of air
     between the boots and the gold plate here, which is the budget the cue has
     to live inside. */
  const Q = await H.newPlayer(browser, { name: 'Spin2', wsPort, webPort,
    viewport: { width: 390, height: 664 }, touch: true, dpr: 2 });
  await Q.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await Q.page.click('[data-tut="login-create"]');
  await Q.page.waitForSelector('.bt-cc-stage canvas', { timeout: 30000 });
  await Q.page.waitForTimeout(2000);
  const q = await Q.page.evaluate(() => {
    const g = (s) => { const e = document.querySelector(s); if (!e) return null;
      const b = e.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom),
        cx: Math.round(b.x + b.width / 2) }; };
    return { cue: g('.bt-cc-spincue'), canvas: g('.bt-cc-stage canvas'),
      stage: g('.bt-cc-stage'), plate: g('.bt-cc-cluster') };
  });
  console.log('    390x664: ' + JSON.stringify(q));
  rec.ok('390x664: the cue is there too (guard)', !!q.cue, q);
  rec.ok(`390x664: it shrank with the character rather than with the column `
       + `(${q.cue.w}px cue against a ${q.canvas.w}px character)`,
    q.cue.w < q.canvas.w, q);
  rec.ok(`390x664: ...and still clears the name plate (${q.cue.bottom} vs ${q.plate.bottom - q.plate.h})`,
    q.cue.bottom <= (q.plate.bottom - q.plate.h), q);
  rec.ok('390x664: ...and stays centred on him', Math.abs(q.cue.cx - q.canvas.cx) <= 3, q);
  await Q.ctx.close().catch(() => {});
}
