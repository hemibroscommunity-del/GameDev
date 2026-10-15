/* ═══ THE WHEEL WITH NO GROUND, AND THE WATCHDOG THAT COULD NOT SEE IT (v2.3.3151) ═══
 *
 * Owner, 2026-10-11: "I also encountered an issue where the screen went black
 * up until the point I began fighting the fire goblins for that quest."
 *
 * The iPhone graphics reset of v2.3.3017 (mp-glrestore) blanks what the game
 * made on the GPU and keeps what was loaded from a file.  In the Wheel the
 * biggest thing the game makes is its GROUND -- every piece lives on the GPU
 * only (v2.3.3076), and so do the small map under them and the water -- while
 * the buildings, trees, lamps and townsfolk are pictures from files.  So the
 * screen it leaves is those, standing on the canvas's own navy: a black screen
 * to anyone looking, and 30-39% lit to the black-screen watchdog, whose line
 * was 1%.  Nothing struck until the walk out to the Flame Fields' open ground
 * left so little on screen that the line was crossed, and the rebuild came.
 *
 * Chromium cannot make the reset (WEBGL_lose_context gives everything back),
 * so the screen is made directly: the Wheel's ground container hidden (found
 * by its label through window._pixiRenderer, which main has too).  On a
 * phone-sized page against a real worker:
 *   1. with its ground, the Wheel reads lit, and 12 s there strike nothing;
 *   2. with the ground blanked, the buildings still drawn on the navy, the
 *      screen reads lit by the old rule (1%) but under the Wheel's line;
 *   3. within two strikes the watchdog asks for a rebuild that names the
 *      ground, and the crash log has the strikes;
 *   4. behind a loading veil it does not judge;
 *   5. left to itself, the watchdog's own rebuild brings the ground back, and
 *      the screen reads lit again with no more strikes;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/bareground-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const WHEEL_LINE = 75;   /* BroTown.jsx WD_WHEEL_LIT_MIN */

/* the Wheel's ground shown or hidden, on whichever renderer is live now */
const blankGround = (P, on) => P.page.evaluate((hide) => {
  const r = window._pixiRenderer;
  const st = r && r.app && r.app.stage;
  let g = null;
  const find = (n) => {
    if (!n || g) return;
    if (n.label === 'wheelGround') { g = n; return; }
    for (const c of n.children || []) find(c);
  };
  find(st);
  if (!g) return false;
  g.visible = !hide;
  return true;
}, on);

/* the watchdog's own sample, taken as it takes it (BroTown.jsx __btWdSample) */
const watchdogLit = async (P) => {
  const s = await P.page.evaluate(() => (window.__btWdSample ? window.__btWdSample() : null)).catch(() => null);
  if (!s) return null;
  return s.gl != null ? s.gl : s.image;
};

const crashLog = (P) => P.page.evaluate(() => { try { return JSON.parse(localStorage.getItem('bt-crashlog') || '[]'); } catch (e) { return []; } });

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Groundbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    await P.page.waitForTimeout(5000);

    /* 1: with its ground */
    await P.page.evaluate(() => {
      const S = window._gameState.current; S.__wdDark = 0;
      try { localStorage.removeItem('bt-crashlog'); } catch (e) { /* ignore */ }
    });
    const litBefore = await watchdogLit(P);
    await P.page.screenshot({ path: join(OUT, 'bareground-before.png') }).catch(() => {});
    await P.page.waitForTimeout(12000);
    const quiet = await P.page.evaluate(() => window._gameState.current.__wdDark || 0);
    const quietLog = (await crashLog(P)).filter((e) => e.kind === 'watchdog-dark' || e.kind === 'gl-rebuild');
    rec.ok(`with its ground the Wheel reads lit to the watchdog (${litBefore}%), and 12 s there strike nothing (${quiet} strikes)`,
      litBefore != null && litBefore >= 90 && quiet === 0 && quietLog.length === 0, { litBefore, quiet, quietLog });

    /* 2: the ground blanked; rebuilds counted, not done */
    await P.page.evaluate(() => {
      window.__btRebuilds = []; window.__btRealRebuild = window._rebuildRenderer;
      window._rebuildRenderer = (why) => { window.__btRebuilds.push(String(why)); };
    });
    const hidden = await blankGround(P, true);
    await P.page.waitForTimeout(800);
    const litBare = await watchdogLit(P);
    await P.page.screenshot({ path: join(OUT, 'bareground-bare.png') }).catch(() => {});
    rec.ok(`the ground blanked, the town still standing on the navy: ${litBare}% lit -- past the old 1% line, so it never struck, and under the Wheel's ${WHEEL_LINE}%`,
      hidden && litBare != null && litBare >= 1 && litBare < WHEEL_LINE, { hidden, litBare });

    /* 3: two strikes, 5 s apart, then a rebuild */
    const asked = await H.waitFor(P, () => (window.__btRebuilds || []).slice(), (a) => a.length >= 1, { timeout: 30000, label: 'watchdog rebuild' }).catch(() => []);
    const log = await crashLog(P);
    const strikes = log.filter((e) => e.kind === 'watchdog-dark');
    rec.ok(`...and within its two strikes the watchdog asks for a rebuild ("${asked[0] || 'none'}"), the strikes in the crash log (${strikes.length}, "${strikes[0] ? strikes[0].msg || strikes[0].message || '' : ''}")`,
      asked.length >= 1 && /ground/.test(asked[0]) && strikes.length >= 2, { asked, strikes: strikes.slice(0, 3) });

    /* 4: behind a veil it does not judge */
    await P.page.evaluate(() => {
      window.__btRebuilds = [];
      const S = window._gameState.current; S.__wdDark = 0;
      const v = document.createElement('div'); v.className = 'bt-zone-loading'; v.id = 'qa-veil'; document.body.appendChild(v);
    });
    await P.page.waitForTimeout(13000);
    const underVeil = await P.page.evaluate(() => ({ n: (window.__btRebuilds || []).length, dark: window._gameState.current.__wdDark || 0 }));
    rec.ok(`...but behind a loading veil it does not judge (${underVeil.n} rebuilds, ${underVeil.dark} strikes in 13 s)`,
      underVeil.n === 0 && underVeil.dark === 0, underVeil);

    /* 5: the watchdog left to itself, the ground still blank */
    await P.page.evaluate(() => {
      const v = document.getElementById('qa-veil'); if (v) v.remove();
      const S = window._gameState.current; S.__wdDark = 0;
      try { localStorage.removeItem('bt-crashlog'); } catch (e) { /* ignore */ }
      window._rebuildRenderer = window.__btRealRebuild;
      if (window._pixiRenderer) window._pixiRenderer.__qaOld = true;
    });
    const rebuilt = await H.waitFor(P, () => !!(window._pixiRenderer && !window._pixiRenderer.__qaOld), (v) => v, { timeout: 45000, label: 'the rebuild' }).catch(() => false);
    const why = (await crashLog(P)).filter((e) => e.kind === 'gl-rebuild').map((e) => e.msg || e.message || e.detail || '');
    await P.page.waitForTimeout(6000);
    await P.page.evaluate(() => { const S = window._gameState.current; S.__wdDark = 0; });
    const litAfter = await watchdogLit(P);
    await P.page.screenshot({ path: join(OUT, 'bareground-after.png') }).catch(() => {});
    await P.page.waitForTimeout(11000);
    const after = await P.page.evaluate(() => ({ dark: window._gameState.current.__wdDark || 0, zone: window._gameState.current.currentZone }));
    rec.ok(`...and left to itself the watchdog rebuilds (${JSON.stringify(why)}), the ground comes back (${litAfter}% lit) and nothing strikes after (${after.dark})`,
      !!rebuilt && litAfter != null && litAfter >= 90 && after.dark === 0 && after.zone === 'wheel', { rebuilt, why, litAfter, after });

    const errors = P.logs.filter((l) => /pageerror/.test(l));
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 4));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
