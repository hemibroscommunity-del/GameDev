/* ═══ THE WORLD'S GROUND IS KEPT ON A RETURN (v2.3.3775) ═══
 *
 * The 2026-10-28 UI review of a computer showed flat blocks of plain colour
 * where BroTown's ground should be, with the player standing still.  The
 * cause: coming back to the page -- a tab brought back ('visible'), or a page
 * frozen past 5 s ('thaw') -- ran the renderer's forceRefresh, which threw
 * away every piece of the Wheel's ground on screen and asked the worker for
 * each again (pixiRenderer.js, THE WORLD'S GROUND IS KEPT ON A RETURN).  Now,
 * on a context that was never lost, the pieces are kept.  On an upright phone
 * and on a computer (`wide: true`), each in BroTown, standing still:
 *   1. a 6.5 s freeze of the page (the thaw): every piece still on screen
 *      after it, none asked for again, no pop-in -- and the return was kept,
 *      not rebuilt (window.__btGroundKeep);
 *   2. the tab hidden and brought back (the 'visible' return): the same;
 *   3. a LOST context (WEBGL_lose_context) and a return: the black-screen
 *      recovery still rebuilds the whole renderer (__btLastGlRebuild), and the
 *      ground comes back -- that path untouched;
 *   4. the third way back: a context lost and restored within 1.5 s, then
 *      forceRefresh (wsClient's resume when the context was lost as it
 *      looked): the ground is REBUILT, never kept from a lost context --
 *      both a real loss and restore, and the rule alone (a loss stamped
 *      after the last renderer rebuild, on a healthy context);
 *   and with `?groundkeep=0` (the off-ramp) a freeze rebuilds, as before.
 *
 *   node tools/qa/mp/run.mjs groundkeep
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const DESK = { width: 1440, height: 900 };

const read = (P) => P.page.evaluate(() => {
  const w = window.__btWorldTrial && window.__btWorldTrial.stats;
  const k = window.__btGroundKeep;
  return { resident: w ? w.resident : null, loads: w ? w.loads : null, loading: w ? w.loading : null, popIns: w ? w.popIns : null,
    kept: k ? k.kept : null, rebuilt: k ? k.rebuilt : null, glRebuild: window.__btLastGlRebuild || 0 };
});
const freeze = (P, ms) => P.page.evaluate((t) => { const t0 = Date.now(); while (Date.now() - t0 < t) { /* frozen */ } }, ms);
const setVisible = (P, vis) => P.page.evaluate((v) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (v ? 'visible' : 'hidden') });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => !v });
  document.dispatchEvent(new Event('visibilitychange'));
}, vis);

async function settle(P) {
  await H.enterWorld(P);
  const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
    { timeout: 120000, label: 'into the Wheel' }).then(() => true).catch(() => false);
  if (!ok) return false;
  /* every piece on screen laid, and still for a while */
  await H.waitFor(P, () => { const w = window.__btWorldTrial.stats; return { r: w.resident, l: w.loading }; }, (v) => v.r > 0 && v.l === 0,
    { timeout: 60000, label: 'the ground laid' }).catch(() => null);
  await P.page.waitForTimeout(6000);
  return true;
}

async function device(browser, wsPort, webPort, rec, label, opts) {
  const P = await H.newPlayer(browser, { name: label, wsPort, webPort, world: 'wheel', ...opts });
  try {
    if (!(await settle(P))) { rec.ok(`${label}: in the Wheel (guard)`, false); return; }

    /* 1. the thaw */
    const a0 = await read(P);
    await freeze(P, 6500);
    await P.page.waitForTimeout(1800);
    const a1 = await read(P);
    await P.page.waitForTimeout(4000);
    const a2 = await read(P);
    rec.ok(`${label}: a 6.5 s freeze keeps the ground -- ${a0.resident} pieces on screen before, ${a1.resident} 1.8 s after, ${a2.resident} later; `
      + `${a2.loads - a0.loads} asked for again, ${a2.popIns - a0.popIns} pop-ins; the return kept (${a1.kept - a0.kept}), not rebuilt (${a1.rebuilt - a0.rebuilt})`,
      a0.resident > 0 && a1.resident >= a0.resident && a2.resident >= a0.resident && a2.loads - a0.loads <= 2 && a2.popIns === a0.popIns
        && a1.kept - a0.kept >= 1 && a1.rebuilt === a0.rebuilt, { a0, a1, a2 });

    /* 2. hidden, then back */
    const b0 = await read(P);
    await setVisible(P, false);
    await P.page.waitForTimeout(1500);
    await setVisible(P, true);
    await P.page.waitForTimeout(2500);
    const b1 = await read(P);
    rec.ok(`${label}: the tab hidden and brought back keeps the ground -- ${b0.resident} -> ${b1.resident} pieces, ${b1.loads - b0.loads} asked for again, the return kept (${b1.kept - b0.kept})`,
      b0.resident > 0 && b1.resident >= b0.resident && b1.loads - b0.loads <= 2 && b1.kept - b0.kept >= 1 && b1.rebuilt === b0.rebuilt, { b0, b1 });

    /* 3. a LOST context: the black-screen recovery, untouched */
    const c0 = await read(P);
    const lost = await P.page.evaluate(() => {
      const r = window._pixiRenderer;
      const gl = r && r.app && r.app.renderer && r.app.renderer.gl;
      const ext = gl && gl.getExtension('WEBGL_lose_context');
      if (!ext) return 'no WEBGL_lose_context';
      ext.loseContext();
      setTimeout(() => { try { ext.restoreContext(); } catch (e) { /* gone */ } }, 600);
      return null;
    });
    if (lost) { rec.ok(`${label}: a lost context (guard): ${lost}`, false); return; }
    await P.page.waitForTimeout(1500);
    await setVisible(P, false);
    await P.page.waitForTimeout(800);
    await setVisible(P, true);
    const rebuilt = await H.waitFor(P, () => window.__btLastGlRebuild || 0, (v) => v > c0.glRebuild, { timeout: 30000, label: 'the renderer rebuilt' })
      .then(() => true).catch(() => false);
    const back = await H.waitFor(P, () => { const w = window.__btWorldTrial.stats; return { r: w.resident, l: w.loading }; }, (v) => v.r > 0 && v.l === 0,
      { timeout: 60000, label: 'the ground laid again' }).then((v) => v).catch(() => null);
    const c1 = await read(P);
    rec.ok(`${label}: a lost context still rebuilds the whole renderer (${rebuilt ? 'rebuilt' : 'NOT rebuilt'}) and the ground comes back (${c1.resident} pieces; a return on the rebuilt, healthy context after it kept: ${c1.kept - c0.kept})`,
      rebuilt && !!back && c1.resident > 0, { c0, c1 });

    /* 4. the third way back: lost, restored, then forceRefresh (not a whole
       rebuild).  First the rule alone, on a healthy context: a loss stamped
       after the last renderer rebuild */
    await P.page.waitForTimeout(3000);
    const e0 = await read(P);
    await P.page.evaluate(() => { window.__btGlLostAt = Date.now() + 1; window._pixiRenderer.forceRefresh(); });
    await P.page.waitForTimeout(500);
    const e1 = await read(P);
    rec.ok(`${label}: a loss since the last renderer rebuild -- forceRefresh REBUILDS the ground (rebuilt ${e1.rebuilt - e0.rebuilt}), never keeps it (kept ${e1.kept - e0.kept})`,
      e1.rebuilt - e0.rebuilt === 1 && e1.kept === e0.kept, { e0, e1 });
    /* ...then for real: lost, restored after 600 ms, forceRefresh 1.5 s after
       the loss, as wsClient does -- rebuilt (or the whole renderer already
       rebuilt meanwhile, a fresh context), never kept; the ground back */
    await H.waitFor(P, () => { const w = window.__btWorldTrial.stats; return { r: w.resident, l: w.loading }; }, (v) => v.r > 0 && v.l === 0,
      { timeout: 60000, label: 'the ground laid again' }).catch(() => null);
    const f0 = await read(P);
    const lost2 = await P.page.evaluate(() => new Promise((res) => {
      const r = window._pixiRenderer;
      const gl = r && r.app && r.app.renderer && r.app.renderer.gl;
      const ext = gl && gl.getExtension('WEBGL_lose_context');
      if (!ext) { res('no WEBGL_lose_context'); return; }
      const before = window.__btLastGlRebuild || 0;
      ext.loseContext();
      setTimeout(() => { try { ext.restoreContext(); } catch (e) { /* gone */ } }, 600);
      setTimeout(() => {
        const fresh = (window.__btLastGlRebuild || 0) > before;
        const r2 = window._pixiRenderer;
        if (r2 && r2.forceRefresh) r2.forceRefresh();
        res({ fresh });
      }, 1500);
    }));
    if (typeof lost2 === 'string') { rec.ok(`${label}: lost and restored (guard): ${lost2}`, false); return; }
    await P.page.waitForTimeout(800);
    const f1 = await read(P);
    const back2 = await H.waitFor(P, () => { const w = window.__btWorldTrial.stats; return { r: w.resident, l: w.loading }; }, (v) => v.r > 0 && v.l === 0,
      { timeout: 60000, label: 'the ground back' }).then(() => true).catch(() => false);
    const keptFromLost = !lost2.fresh && f1.kept > f0.kept;
    rec.ok(`${label}: lost, restored within 1.5 s, then forceRefresh: the ground is not kept from the lost context (`
      + `${lost2.fresh ? 'the whole renderer was rebuilt meanwhile' : 'ground rebuilt ' + (f1.rebuilt - f0.rebuilt)}), and it comes back`,
      !keptFromLost && (lost2.fresh || f1.rebuilt - f0.rebuilt >= 1) && back2, { f0, f1, lost2 });
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  await device(browser, wsPort, webPort, rec, 'phone', { viewport: PHONE, touch: true });
  await device(browser, wsPort, webPort, rec, 'computer', { viewport: DESK, wide: true });

  /* the off-ramp: ?groundkeep=0 rebuilds on a return, as before */
  const P = await H.newPlayer(browser, { name: 'Rebuilt', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, query: 'groundkeep=0' });
  try {
    if (!(await settle(P))) { rec.ok('groundkeep=0: in the Wheel (guard)', false); return; }
    const d0 = await read(P);
    await freeze(P, 6500);
    await P.page.waitForTimeout(1800);
    const d1 = await read(P);
    rec.ok(`?groundkeep=0: a freeze rebuilds the ground as before (${d0.resident} -> ${d1.resident} pieces, rebuilt ${d1.rebuilt - d0.rebuilt})`,
      d1.rebuilt - d0.rebuilt >= 1 && d1.kept === d0.kept, { d0, d1 });
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
