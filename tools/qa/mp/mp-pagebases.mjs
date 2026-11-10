/* ═══ AN OBJECT PAGE'S GROUND LINES COME WITH THE PAGE (v2.3.4450) ═══
 *
 * The whole-game sweep (mp-heldsweep) found the most frequent thing to hold
 * the page on a ride: each object page's ground lines (where every column of
 * a building, a fence, a sign meets the ground: its shadow is cast from
 * there), read on the page as the page came in -- its file decoded a second
 * time as a picture, every frame scaled onto a canvas and read back: 64
 * holds on one tour, up to 39 ms each.  They are now worked out on the
 * reader's worker from the page's own colour numbers (artBottoms.js) and
 * arrive with the page.
 *
 * A phone rides the loop through the town, three ways:
 *   - as it ships: no ground line is read on the page at all;
 *   - `?pagebases=0`: read on the page, as before (the fault: jobs of
 *     OLD_HOLD_MS or more);
 *   - both at once (window.__btBasesVerify), every frame of every page that
 *     came: the worker's line against the page's own canvas reading, column
 *     by column.  The two cannot agree everywhere, and the page's reading
 *     was never one thing: each browser scales a picture its own way
 *     (Chromium halves it with Skia's filters and then blends coarsely;
 *     Safari does its own), so a column that half covers the EDGE of a post
 *     or a wall fell on either side of it by the browser.  The worker's rule
 *     is ONE reading for every browser.  Held here: at most DIFFER_MAX of
 *     the columns differ from Chromium's at all, at most FAR_MAX by more
 *     than a row, and all but STRAY_MAX of those are edge columns (the
 *     worker reads what the page read one or two columns along).
 *
 *   node tools/qa/mp/run.mjs pagebases
 */
import * as H from './harness.mjs';

const PHONE = { width: 430, height: 932 };
const OLD_HOLD_MS = 6;
/* measured 2026-11-10 on the town's pages: 4.8% differ, 0.56% by more than a row, 0.019% not on an edge */
const DIFFER_MAX = 0.08, FAR_MAX = 0.012, STRAY_MAX = 0.001;

async function ride(browser, wsPort, webPort, rec, label, query, init) {
  const P = await H.newPlayer(browser, { name: 'pb' + label.length, wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, query, init });
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the Wheel' }).then(() => true).catch(() => false);
    rec.ok(`${label}: in BroTown (guard)`, ok);
    if (!ok) return null;
    const G = await H.wheelGeom();
    await P.page.waitForTimeout(3000);
    await P.page.evaluate(() => { window.__btMade = []; });
    await P.page.keyboard.press('z');
    for (const [x, y] of [[G.cx - 1500, G.arrival.y], [G.cx + 1500, G.arrival.y], [G.cx + 1500, G.arrival.y - 1200], [G.cx - 1500, G.arrival.y - 1200], [G.cx, G.arrival.y]]) {
      await H.glideTo(P, x, y, { speed: 300, timeoutMs: 60000 });
    }
    const made = await P.page.evaluate(() => window.__btMade.slice());
    const jobs = [];
    for (let i = 0; i < made.length; i += 2) if (made[i] === 'page bases') jobs.push(made[i + 1]);
    const stats = await P.page.evaluate(() => (window.__btPageBases ? window.__btPageBases() : null));
    return { jobs, stats };
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const now = await ride(browser, wsPort, webPort, rec, 'as it ships', '', null);
  const old = await ride(browser, wsPort, webPort, rec, 'on the page (?pagebases=0)', 'pagebases=0', null);
  const both = await ride(browser, wsPort, webPort, rec, 'both ways, compared', '', 'window.__btBasesVerify = true;');
  if (!now || !old || !both) return;
  const top = (a) => Math.round(Math.max(0, ...a) * 10) / 10, sum = (a) => Math.round(a.reduce((t, v) => t + v, 0));
  console.log(`    on the page:  ${old.jobs.length} reads, ${sum(old.jobs)} ms in all, the longest ${top(old.jobs)} ms`);
  console.log(`    as it ships:  ${now.jobs.length} reads on the page; ${JSON.stringify(now.stats)}`);
  console.log(`    both ways:    ${JSON.stringify({ ...both.stats, worstCols: undefined })}`);
  for (const c of ((both.stats && both.stats.worstCols) || []).slice(0, 24)) console.log(`      ${JSON.stringify(c)}`);
  rec.ok(`on the page (the old way): the ride reads ground lines ${old.jobs.length} times, ${sum(old.jobs)} ms of the page held, the longest ${top(old.jobs)} ms (the fault: ten or more, the longest ${OLD_HOLD_MS} ms or more)`,
    old.jobs.length >= 10 && top(old.jobs) >= OLD_HOLD_MS, { n: old.jobs.length, top: top(old.jobs) });
  rec.ok(`as it ships: no ground line is read on the page (${now.jobs.length}); ${now.stats && now.stats.pages} pages came with theirs`, now.jobs.length === 0 && !!now.stats && now.stats.pages >= 10 && now.stats.way === true, now.stats);
  const s = both.stats || {};
  rec.ok(`both ways on ${s.frames} frames of ${s.pages} pages, ${s.cols} columns: ${s.differ} differ from this browser's own reading at all (${(100 * s.differ / Math.max(1, s.cols)).toFixed(1)}%, at most ${DIFFER_MAX * 100}%), ${s.far} by more than a row (${(100 * s.far / Math.max(1, s.cols)).toFixed(2)}%, at most ${FAR_MAX * 100}%), of which ${s.edge} are a column on an edge and ${s.stray} are not (${(100 * s.stray / Math.max(1, s.cols)).toFixed(3)}%, at most ${STRAY_MAX * 100}%)`,
    s.frames >= 20 && s.differ <= s.cols * DIFFER_MAX && s.far <= s.cols * FAR_MAX && s.stray <= s.cols * STRAY_MAX, s);
}
