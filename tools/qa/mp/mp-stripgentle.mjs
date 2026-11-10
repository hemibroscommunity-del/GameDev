/* ═══ A LOOK THAT LOADS AS YOU RIDE IS UNPACKED BETWEEN FRAMES (v2.3.4400) ═══
 *
 * The owner's iPhone 14 Pro Max: "It noticeably slowed when I rode by the
 * blacksmith hammering."  Not the hammer.  The Blacksmith stands on the
 * Flame Fields' side of the town, and riding up to him is where the fire
 * goblin's look starts to load (wheelMonsterArt.js: a monster's look loads as
 * you walk toward it): fourteen strips, each packed and read into its colour
 * numbers on the page in one go as its file arrives.  In play they are now
 * unpacked a cell and a band of rows at a time, one strip at a time, a slice
 * a frame (zoneTextures.js; server/test/strip-slices.test.mjs holds the
 * rules).
 *
 * A phone rides from the town's arrival to below the Blacksmith, twice: as
 * it ships (with `?stripslice=4`: a 60-a-second phone's slice, since this
 * box's own frames are 200 ms and its slice would be a whole strip), and
 * `?stripgentle=0` (each strip in one go, as before).  Every job that holds
 * the page names itself (window.__btMade).  Asserted:
 *   - the old way: the fire goblin's strips are each unpacked in one job, ten
 *     or more of them, the longest OLD_HOLD_MS or more (the fault);
 *   - as it ships: no strip is unpacked in one job; the page is held a slice
 *     at a time, none past SLICE_MAX_MS;
 *   - both end with the same look: every strip held as colour numbers, its
 *     packed picture the same size and the same pixels.
 *
 *   node tools/qa/mp/run.mjs stripgentle
 */
import * as H from './harness.mjs';

const PHONE = { width: 430, height: 932 };
const OLD_HOLD_MS = 10;       /* this box: 13 to 39 ms a strip in one go */
const SLICE_MAX_MS = 16;      /* a 4 ms slice and the one piece of work that ran past it (a band read, a strip's last step) */
const WANT = 14;              /* the fire goblin's strips: walk, attack and hit by facing, and its death */

async function ride(browser, wsPort, webPort, rec, label, query) {
  const P = await H.newPlayer(browser, { name: 'sg' + (/gentle=0/.test(query) ? 'old' : 'new'), wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, query });
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the Wheel' }).then(() => true).catch(() => false);
    rec.ok(`${label}: in BroTown (guard)`, ok);
    if (!ok) return null;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 20 }).catch(() => {});
    await P.page.waitForTimeout(4000);
    const at = await P.page.evaluate(() => { const f = (window._gameState.current.npcs || []).find((x) => x.name === 'Blacksmith Bro'); return f ? { x: f.x, y: f.y } : null; });
    const before = await P.page.evaluate(() => (window.__btStripTrim ? window.__btStripTrim().filter((s) => /fire-goblin/.test(s.url)).length : -1));
    rec.ok(`${label}: the Blacksmith is found, and no fire goblin strip is loaded at the town's arrival (guard)`, !!at && before === 0, { at, before });
    if (!at) return null;
    await P.page.evaluate(() => { window.__btMade = []; });
    await P.page.keyboard.press('z');
    await H.glideTo(P, at.x, at.y + 270, { speed: 300, timeoutMs: 60000 });
    const got = await H.waitFor(P, () => (window.__btStripTrim ? window.__btStripTrim().filter((s) => /fire-goblin/.test(s.url)).length : 0), (n) => n >= WANT, { timeout: 180000, label: 'the fire goblin\'s strips' }).then(() => true).catch(() => false);
    await P.page.waitForTimeout(1500);
    const made = await P.page.evaluate(() => window.__btMade.slice());
    const jobs = [];
    for (let i = 0; i < made.length; i += 2) jobs.push({ name: String(made[i]), ms: made[i + 1] });
    /* each strip as the game holds it: its packed picture's size and its pixels as colours (the numbers' own order in
       a row of colours depends on which strip came first, so the colours are compared, not the numbers).  A crop a
       pixel off, or laid out elsewhere, is a different picture: the cells themselves are strip-slices.test's */
    const looks = await P.page.evaluate(() => {
      const out = {};
      for (const src of (window.__btPicNumSources ? window.__btPicNumSources() : [])) {
        const label = String(src.label || '');
        if (!/fire-goblin/.test(label)) continue;
        const nums = src._btNumbers;
        let h = 2166136261 >>> 0;
        if (nums) { const { idx, pal } = nums; for (let i = 0; i < idx.length; i++) h = Math.imul(h ^ pal[idx[i]], 16777619) >>> 0; }
        out[label.replace(/^.*\//, '').replace(/[?#].*$/, '')] = { numbers: !!nums, w: nums ? nums.w : 0, h: nums ? nums.h : 0, px: nums ? nums.idx.length : 0, hash: h };
      }
      return out;
    });
    const slices = await P.page.evaluate(() => (window.__btStripSlices ? window.__btStripSlices() : null));
    return { got, jobs, looks, slices };
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const now = await ride(browser, wsPort, webPort, rec, 'as it ships', 'stripslice=4');
  const old = await ride(browser, wsPort, webPort, rec, 'the old way (?stripgentle=0)', 'stripgentle=0');
  if (!now || !old) return;
  const whole = (r) => r.jobs.filter((j) => /^strip .*fire-goblin/.test(j.name));
  const sl = (r) => r.jobs.filter((j) => j.name === 'strip slice');
  const ow = whole(old), nw = whole(now), ns = sl(now);
  const sum = (a) => Math.round(a.reduce((t, j) => t + j.ms, 0)), top = (a) => Math.round(Math.max(0, ...a.map((j) => j.ms)));
  console.log(`    the old way:  ${ow.length} strips unpacked in one job each, ${sum(ow)} ms in all, the longest ${top(ow)} ms; slices ${JSON.stringify(old.slices)}`);
  console.log(`    as it ships:  ${nw.length} in one job; ${ns.length} slices, ${sum(ns)} ms in all, the longest ${top(ns)} ms; ${JSON.stringify(now.slices)}`);
  rec.ok(`both pages loaded the fire goblin's ${WANT} strips (guard)`, now.got && old.got && Object.keys(now.looks).length >= WANT && Object.keys(old.looks).length >= WANT, { now: Object.keys(now.looks).length, old: Object.keys(old.looks).length });
  rec.ok(`the old way: riding up to the Blacksmith unpacks ${ow.length} strips in one job each, ${sum(ow)} ms of the page held, the longest ${top(ow)} ms (the fault: at least ten, the longest ${OLD_HOLD_MS} ms or more)`,
    ow.length >= 10 && top(ow) >= OLD_HOLD_MS && sl(old).length === 0, { n: ow.length, top: top(ow) });
  rec.ok(`as it ships: no strip is unpacked in one job (${nw.length}); the page is held a slice at a time -- ${ns.length} of them, none past ${SLICE_MAX_MS} ms (the longest ${top(ns)}; ${top(ow)} before)`,
    nw.length === 0 && ns.length >= 8 && top(ns) <= SLICE_MAX_MS && !!now.slices && now.slices.strips >= WANT, { slices: now.slices, top: top(ns) });
  const names = Object.keys(old.looks).sort();
  console.log(`    a strip (${names[0]}), the old way: ${JSON.stringify(old.looks[names[0]])}; as it ships: ${JSON.stringify(now.looks[names[0]] || null)}`);
  const diff = names.filter((k) => JSON.stringify(now.looks[k]) !== JSON.stringify(old.looks[k]));
  rec.ok(`both end with the same look: all ${names.length} strips held as colour numbers, each packed picture the same size and the same pixels (${diff.length} differ)`,
    names.length >= WANT && diff.length === 0 && names.every((k) => old.looks[k].numbers && old.looks[k].px > 0), diff.slice(0, 3).map((k) => ({ k, now: now.looks[k], old: old.looks[k] })));
}
