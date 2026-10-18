/* ═══ mp-speedtest (v2.3.3339): THE SPEED TEST, AND ?res= ═══
 *
 * The owner, 2026-10-18: "Not so sure about the performance. The framerate is
 * definitely not totally smooth. It appears to be around 30fps to 40ish fps".
 * The frame rate that matters is the phone's, so the test panel measures it
 * there (game/speedTest.js); this checks the measuring, on a 3x phone-sized
 * page in the Wheel (`speedms` shortens each step for this box):
 *   1. the real panel's button closes the panel and shows the card's progress;
 *   2. it measures every step -- everything on, no shadows, no shine, still
 *      water, 2x resolution, all of those off -- each with frames counted;
 *   3. the switches really switched: the canvas was drawn at 2x during the
 *      lower resolution step and at 3x otherwise, and the graphics chip
 *      switched pictures fewer times a frame with the shadows off;
 *   4. everything is back afterwards: the canvas at 3x, its look crisp, the
 *      shadows and the water drawn again, and nothing written to this
 *      device's saved switches;
 *   5. the card shows a row a step and goes on Close;
 *   6. a page opened with ?res=2 draws its canvas at 2x, smoothly stretched,
 *      with the world the same size on screen as at 3x.
 * Plus the frame-time changes found by the same hunt:
 *   7. the overview under the Wheel's ground is shown only while a piece is
 *      missing, and the ground looks the same with it shown;
 *   8. the screen's empty graphics are not cleared every frame: the screen's
 *      draw list is not rebuilt every frame standing still.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const DPR = 3;

const holdTitle = async (P, ms) => {
  const at = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-zone-header__title');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  if (!at) return false;
  await P.page.mouse.move(at.x, at.y);
  await P.page.mouse.down();
  /* v2.3.3425: held until the panel is up (`ms` at the most), not a set
     time.  The title opens it from a 1.2 s timer that the release clears
     (ZoneHeader holdStart/holdEnd), and at this file's 3x a frame here
     outlasts the hold: the browser takes the queued release before the timer
     that came due during the frame, and clears it -- in the solo run of
     2026-10-18 every hold landed on the title and none opened the panel.
     A phone's 16 ms frame never holds the timer back. */
  const t0 = Date.now();
  await P.page.waitForTimeout(1400);
  while (Date.now() - t0 < ms && !(await panelUp(P))) await P.page.waitForTimeout(250);
  await P.page.mouse.up();
  return true;
};
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
async function openPanel(P) {
  for (let i = 0; i < 3; i++) {
    if (await panelUp(P)) return true;
    await holdTitle(P, 8000);
    for (const t0 = Date.now(); Date.now() - t0 < 8000;) {
      if (await panelUp(P)) return true;
      await P.page.waitForTimeout(250);
    }
  }
  return panelUp(P);
}

async function intoWheel(P) {
  await H.enterWorld(P);
  return H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
    { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
}

const look = (P) => P.page.evaluate(() => {
  const cv = document.querySelector('.brotown-canvas');
  const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  const S = window._gameState && window._gameState.current;
  const lp = window.__btLightFx && window.__btLightFx.probe ? window.__btLightFx.probe() : null;
  return {
    cw: cv ? cv.width : 0, ch: cv ? cv.height : 0,
    cssW: cv ? cv.getBoundingClientRect().width : 0, cssH: cv ? cv.getBoundingClientRect().height : 0,
    res: R ? R.resolution : null,
    soft: document.documentElement.hasAttribute('data-res-soft'),
    rendering: cv ? getComputedStyle(cv).imageRendering : null,
    scale: S ? S._worldScaleX : null,
    pieces: lp && lp.shadows ? lp.shadows.pieces : null,
    water: window.__btWaves && window.__btWaves.probe ? window.__btWaves.probe().on : null,
    saved: { light: localStorage.getItem('bt-lightfx'), sheen: localStorage.getItem('bt-sheen') },
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Speedy', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: DPR, query: 'speedms=1500' });
  const stopAlive = H.keepAlive(P);
  let before = null;
  try {
    rec.ok('in the Wheel (guard)', !!(await intoWheel(P)));
    await P.page.waitForTimeout(5000);
    before = await look(P);
    console.log('    BEFORE ' + JSON.stringify(before));

    /* ── 7, 8: standing still, before the test ── */
    const still = await P.page.evaluate(async () => {
      const sys = window._pixiRenderer.app.renderer.renderGroup;
      const counts = Object.create(null);
      const orig = sys._buildInstructions;
      sys._buildInstructions = function (rg, r) { const k = (rg && rg.root && rg.root.label) || '?'; counts[k] = (counts[k] || 0) + 1; return orig.call(this, rg, r); };
      let frames = 0;
      await new Promise((res) => { const t0 = performance.now(); const f = (n) => { frames++; if (n - t0 < 4000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
      sys._buildInstructions = orig;
      const ws = window.__btWorldTrial && window.__btWorldTrial.stats;
      return { frames, counts: Object.assign({}, counts), under: ws ? ws.under : undefined };
    });
    console.log('    STILL ' + JSON.stringify(still));
    rec.ok(`8. standing still, the screen's draw list is not rebuilt every frame (${still.counts.screen || 0} times in ${still.frames} frames)`,
      still.frames > 3 && (still.counts.screen || 0) < still.frames / 2, still);

    /* the ground with and without the overview under it: the same picture */
    const under = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const same = window.__btUnderSame ? window.__btUnderSame(S.camera.x, S.camera.y, S._viewW, S._viewH, 0.5) : null;
      return { same, hidden: window.__btWorldTrial && window.__btWorldTrial.stats ? window.__btWorldTrial.stats.under === false : null };
    });
    console.log('    UNDER ' + JSON.stringify(under));
    rec.ok(`7. standing with the ground laid, the overview under it is not drawn, and the ground looks the same without it (${under.same && under.same.diff} of ${under.same && under.same.px} px differ)`,
      under.hidden === true && !!under.same && !under.same.error && under.same.px > 1000 && under.same.diff === 0 && under.same.alphaBelow === 0, under);

    /* ── 1-5: the speed test from the real panel ── */
    const opened = await openPanel(P);
    /* v2.3.3425: and if it does not, what the hold landed on -- in the run of
       2026-10-18 it never opened, with nothing to say why */
    const noPanel = opened ? null : await P.page.evaluate(() => {
      const el = document.querySelector('.bt-zone-header__title');
      if (!el) return { title: null };
      const r = el.getBoundingClientRect();
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const chain = [];
      for (let n = at; n && chain.length < 5; n = n.parentElement) chain.push(n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
      return { title: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), text: el.textContent }, hit: chain,
        hitIsTitle: !!at && (at === el || el.contains(at)), body: document.body.className };
    }).catch((e) => ({ err: String(e) }));
    if (noPanel) await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/speedtest-nopanel.png` }).catch(() => {});
    rec.ok('the test panel opens (guard)', opened, noPanel);
    const clicked = await P.page.evaluate(() => {
      const b = document.querySelector('[data-dev-speed-test]');
      if (!b) return false;
      b.click();
      return true;
    });
    let progress = null;
    for (let t0 = Date.now(); Date.now() - t0 < 8000;) {
      progress = await P.page.evaluate(() => {
        const c = document.querySelector('[data-speed-test]');
        return c ? c.textContent : null;
      });
      if (progress && /Speed test 1 of/.test(progress)) break;
      await P.page.waitForTimeout(150);
    }
    const panelGone = !(await panelUp(P));
    rec.ok(`1. the panel's button closes the panel and the card counts the steps ("${(progress || '').slice(0, 40)}")`,
      clicked && panelGone && /Speed test 1 of \d/.test(progress || ''), { clicked, panelGone, progress });

    const result = await H.waitFor(P, () => window.__btSpeedTest || null, (v) => !!v, { timeout: 120000, label: 'the speed test result' }).catch(() => null);
    const rows = (result && result.rows) || [];
    console.log('    RESULT ' + JSON.stringify(rows.map((r) => ({ k: r.k, fps: +r.fps.toFixed(1), p95: +r.p95.toFixed(0), work: r.work && +r.work.toFixed(1), passes: +r.passes.toFixed(2), draws: +r.draws.toFixed(0), cw: r.cw, res: r.res, frames: r.frames }))));
    const keys = rows.map((r) => r.k);
    rec.ok(`2. every step measured: ${keys.join(', ')}`,
      ['all', 'noshadow', 'noshine', 'still', 'res2', 'bare'].every((k) => keys.includes(k)) && rows.every((r) => r.frames > 1 && r.fps > 0), keys);
    const R0 = rows.find((r) => r.k === 'all'), R2 = rows.find((r) => r.k === 'res2'), NS = rows.find((r) => r.k === 'noshadow');
    rec.ok(`3. the lower resolution step drew the canvas at 2x (${R2 && R2.cw} px against ${R0 && R0.cw} at 3x)`,
      !!R0 && !!R2 && R2.res === 2 && Math.abs(R2.cw - Math.round(before.cssW * 2)) <= 2 && Math.abs(R0.cw - Math.round(before.cssW * 3)) <= 2, { R0, R2 });
    rec.ok(`...and with the shadows off the graphics chip switched pictures fewer times a frame (${NS && NS.passes.toFixed(2)} against ${R0 && R0.passes.toFixed(2)})`,
      !!R0 && !!NS && R0.passes > 0 && NS.passes < R0.passes, { all: R0 && R0.passes, noshadow: NS && NS.passes });

    await P.page.waitForTimeout(1500);
    const after = await look(P);
    console.log('    AFTER ' + JSON.stringify(after));
    rec.ok('4. everything is back: the canvas at 3x and crisp, the shadows and the water drawn, no saved switch written',
      after.res === before.res && after.cw === before.cw && after.ch === before.ch && !after.soft && after.rendering === before.rendering
        && after.pieces > 0 && after.water === before.water
        && after.saved.light === before.saved.light && after.saved.sheen === before.saved.sheen, { before, after });

    const cardRows = await P.page.evaluate(() => document.querySelectorAll('[data-speed-test] [data-speed-row]').length);
    const closed = await P.page.evaluate(async () => {
      const b = document.querySelector('[data-speed-test] [data-speed-close]');
      if (!b) return false;
      b.click();
      await new Promise((r) => setTimeout(r, 100));
      return !document.querySelector('[data-speed-test]');
    });
    rec.ok(`5. the card shows a row a step (${cardRows}) and goes on Close`, cardRows === rows.length && closed, { cardRows, closed });
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }

  /* ── 6. ?res=2 ── */
  const Q = await H.newPlayer(browser, { name: 'Lowres', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: DPR, query: 'res=2' });
  try {
    rec.ok('?res=2: in the Wheel (guard)', !!(await intoWheel(Q)));
    await Q.page.waitForTimeout(4000);
    const L = await look(Q);
    console.log('    RES2 ' + JSON.stringify(L));
    rec.ok(`6. with ?res=2 the canvas is drawn at 2x (${L.cw} x ${L.ch} for ${Math.round(L.cssW)} x ${Math.round(L.cssH)} CSS px), smoothly stretched`,
      L.res === 2 && Math.abs(L.cw - Math.round(L.cssW * 2)) <= 2 && Math.abs(L.ch - Math.round(L.cssH * 2)) <= 2 && L.soft && L.rendering === 'auto', L);
    rec.ok(`...and the world is the same size on screen as at 3x (scale ${L.scale} against ${before && before.scale})`,
      !!before && L.scale > 0 && Math.abs(L.scale - before.scale) < 1e-6, { now: L.scale, at3x: before && before.scale });
  } finally {
    await Q.ctx.close().catch(() => {});
  }
}
