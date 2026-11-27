/* ═══ v2.3.6697: THE DASHBOARD'S PULL HANDLE IS GONE (card UI2-grip) ═══
 *
 * The owner, 2026-11-26, after trying the new controller on their iPhone:
 * "New controller looks good but remove the pull handle on the dashboard.  It
 * has an open button making pull handle redundant.  Also pull handle implies
 * stretching when dashboard is really just minimized or expanded".
 *
 * Upright, at 390 x 844 and 430 x 932, with the controller on (the default)
 * and the new frame on (the default) and off (`?ui2=0`), folded and open:
 *   1. no element matches .bt-band-grip, and a tap where the tab stood (the
 *      band's top-edge centre, 8 px above it) reaches what is under it, not
 *      the fold: the hit wears no [data-dash-fold], and the tap changes
 *      neither the fold nor the dashboard;
 *   2. the row's own control folds and unfolds (under the frame Gear and
 *      Close, under ?ui2=0 OPEN / CLOSE), and with a page open its Close
 *      closes the page and folds; exactly one control wears [data-dash-fold];
 *   3. `?bandgrip=1` draws today's handle, it alone wears the hook, and the
 *      same point hits it (so the point in 1 is where the tab stood);
 *   4. no page errors.
 *
 *   node tools/qa/mp/run.mjs bandgrip
 */
import * as H from './harness.mjs';
export const lane = 'full';

const SIZES = [{ width: 390, height: 844 }, { width: 430, height: 932 }];

const read = (P) => P.page.evaluate(() => {
  const folds = Array.from(document.querySelectorAll('[data-dash-fold]'));
  const b = window.__broDashPanelBus;
  const fr = document.querySelector('[data-dash-frame]');
  return {
    grips: document.querySelectorAll('.bt-band-grip').length,
    folds: folds.length,
    fold: folds[0] ? folds[0].getAttribute('data-dash-fold') : null,
    wearer: folds[0] ? (folds[0].className.includes('bt-band-grip') ? 'grip' : folds[0].getAttribute('data-dash-ctl') || (folds[0].hasAttribute('data-dash-close') ? 'chip' : folds[0].tagName)) : null,
    mode: b ? b.state.mode : null,
    frame: fr ? fr.getAttribute('data-dash-frame') : null,
  };
});

/* where the tab stood: the band's top-edge centre, 8 px above it; what the
   page puts there, and whether it (or a parent) is the fold */
const probe = (P) => P.page.evaluate(() => {
  const d = document.querySelector('.bt-dashboard');
  if (!d) return null;
  const r = d.getBoundingClientRect();
  const x = Math.round(r.left + r.width / 2);
  const y = Math.round(r.top - 8);
  const el = document.elementFromPoint(x, y);
  const name = (e) => !e ? null : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  return {
    x, y, hit: name(el),
    fold: !!(el && el.closest('[data-dash-fold]')),
    grip: !!(el && el.closest('.bt-band-grip')),
    inBand: !!(el && el.closest('.bt-dashboard')),
  };
});

async function tapFold(P, sel) {
  const loc = P.page.locator(sel).first();
  await loc.waitFor({ state: 'visible', timeout: 6000 });
  await loc.tap({ force: true });
  await P.page.waitForTimeout(900);
}

async function oneSetup(browser, wsPort, webPort, rec, { label, query, ui2 }) {
  const P = await H.newPlayer(browser, { name: 'Grip' + label.replace(/[^a-z0-9]/gi, '').slice(0, 6), wsPort, webPort, viewport: SIZES[0], touch: true, world: 'wheel', query });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    for (const vp of SIZES) {
      const at = `${label} ${vp.width}x${vp.height}`;
      await P.page.setViewportSize(vp);
      await P.page.waitForTimeout(1500);
      /* folded and open, each: no handle, and the tab's point is not the fold */
      for (const want of ['min', 'open']) {
        if (want === 'min') await H.foldBand(P); else await H.unfoldBand(P);
        const s = await read(P);
        const p = await probe(P);
        rec.ok(`1. ${at} ${want}: no .bt-band-grip, one control wears the fold, the tab's point is not the fold (hit ${p && p.hit})`,
          s.fold === want && s.grips === 0 && s.folds === 1 && p && !p.fold && !p.grip, { s, p });
        /* the tap itself: nothing about the band changes */
        await P.page.touchscreen.tap(p.x, p.y);
        await P.page.waitForTimeout(800);
        const s2 = await read(P);
        rec.ok(`1. ${at} ${want}: a tap there changes neither the fold nor the dashboard`,
          s2.fold === s.fold && s2.mode === s.mode && s2.frame === s.frame, { before: s, after: s2 });
      }
      /* 2. the row's control: folds and unfolds, and closes a page and folds */
      await H.unfoldBand(P);
      await tapFold(P, '[data-dash-fold="open"]');
      const f1 = await read(P);
      await tapFold(P, '[data-dash-fold="min"]');
      const f2 = await read(P);
      rec.ok(`2. ${at}: the row's control folds (${f1.fold}, ${f1.wearer}) and unfolds (${f2.fold}, ${f2.wearer})`,
        f1.fold === 'min' && f2.fold === 'open' && (ui2 ? f1.wearer === 'gear' && f2.wearer === 'close' : f1.wearer === 'chip' && f2.wearer === 'chip'), { f1, f2 });
      await H.dashOpen(P, 'quests');
      await P.page.waitForTimeout(700);
      const o = await read(P);
      await tapFold(P, '[data-dash-fold="open"]');
      const c = await read(P);
      rec.ok(`2. ${at}: with a page open (${o.mode}, ${o.frame}) its Close closes the page and folds (${c.mode}, ${c.frame}, ${c.fold})`,
        (ui2 ? o.frame === 'page' : o.mode === 'expanded') && c.fold === 'min' && (ui2 ? c.frame === 'closed' : c.mode === 'bar'), { o, c });
    }
    rec.ok(`4. ${label}: no page errors`, errs.length === 0, errs.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

async function gripBack(browser, wsPort, webPort, rec, { label, query }) {
  const P = await H.newPlayer(browser, { name: 'Grip' + label.replace(/[^a-z0-9]/gi, '').slice(0, 6), wsPort, webPort, viewport: SIZES[0], touch: true, world: 'wheel', query });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    await H.unfoldBand(P);
    const s = await read(P);
    const p = await probe(P);
    rec.ok(`3. ${label}: the handle is drawn, it alone wears the fold, and the tab's point hits it (hit ${p && p.hit})`,
      s.grips === 1 && s.folds === 1 && s.wearer === 'grip' && s.fold === 'open' && p && p.grip, { s, p });
    await tapFold(P, '.bt-band-grip');
    const f1 = await read(P);
    await tapFold(P, '.bt-band-grip');
    const f2 = await read(P);
    rec.ok(`3. ${label}: a tap on the handle folds (${f1.fold}) and unfolds (${f2.fold}), as before`, f1.fold === 'min' && f2.fold === 'open', { f1, f2 });
    rec.ok(`4. ${label}: no page errors`, errs.length === 0, errs.slice(0, 5));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  await oneSetup(browser, wsPort, webPort, rec, { label: 'frame', query: '', ui2: true });
  await oneSetup(browser, wsPort, webPort, rec, { label: 'ui2=0', query: 'ui2=0', ui2: false });
  await gripBack(browser, wsPort, webPort, rec, { label: 'bandgrip=1', query: 'bandgrip=1' });
  await gripBack(browser, wsPort, webPort, rec, { label: 'bandgrip=1 ui2=0', query: 'bandgrip=1&ui2=0' });
}
