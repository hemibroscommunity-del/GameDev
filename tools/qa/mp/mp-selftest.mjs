/* ═══ v2.3.5234: THE SELF-TEST AT THE DOOR, ON A REAL PAGE (card O PR 14a) ═══
 *
 * Each of the game's own drawing programs draws a known 16 x 16 picture where
 * it is warmed, as the renderer is made, and is held to the CPU's answer
 * (src/rendering/selfTest.js).  14a tests the one program and the colour
 * numbers (the palette's program).  Here, three fresh pages:
 *
 *   1. as it ships, with the one program asked for (`onebatch=1`: this box's
 *      software renderer would keep the three): both pass, both are used, and
 *      the report's `self` names nothing;
 *   2. `selftest=fail:one`: the one program falls back ALONE -- the three
 *      programs draw, the colour numbers stay on -- and the report's `self`
 *      names `one`;
 *   3. `selftest=fail:palette`: the colour numbers fall back alone to whole
 *      colours, the one program stays on, `self` names `palette`;
 *   4. `selftest=0`: none run (the off-ramp), both programs used as today;
 *   5. as it ships again, straight after page 4: the added time is page 5's
 *      beside page 4's, both measured after the same programs were built in
 *      this browser before (page 1, the first, builds them cold: this box's
 *      software renderer keeps a built program for the next page, so page 1
 *      beside page 4 would charge the self-test for the cold build).  With
 *      BT_QA_CPU_THROTTLE, a slowed page's.
 *
 * Every page reaches BroTown and draws with no page error: a failed test
 * never stops the load.  The ms the tests took is printed (the loading
 * screen's added time; the PR's body has it on a slowed page too:
 * BT_QA_CPU_THROTTLE).
 */
import * as H from './harness.mjs';

export const lane = 'full';

const PHONE = { width: 390, height: 844 };

async function onePage(browser, wsPort, webPort, rec, name, query) {
  const P = await H.newPlayer(browser, { name, wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel', query });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inWorld = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 120000, label: name + ': into the world' }).catch(() => null);
    const got = await P.page.evaluate(() => {
      const st = window.__btSelfTest ? window.__btSelfTest() : null;
      const one = window.__btOneBatch ? window.__btOneBatch() : null;
      const pal = window.__btPalette ? window.__btPalette() : null;
      let rep = null;
      try { const r = window.__btReport ? window.__btReport() : null; rep = r ? { lanesCap: r.lanesCap, self: r.open ? r.open.self || null : null } : null; } catch (e) { rep = null; }
      let lt = null;
      try { const L = window.__btLoadTimes ? window.__btLoadTimes() : null; lt = L ? { screen: L.screen, selfTest: (L.groups.find((g) => g.name === 'selfTest') || {}).s } : null; } catch (e) { lt = null; }
      return { st, one: one ? { on: one.on, ok: one.ok, linkError: one.linkError, warmMs: one.warmMs } : null, pal: pal ? { on: pal.on, ok: pal.ok, linkError: pal.linkError, warmMs: pal.warmMs } : null, rep, lt };
    });
    return { inWorld: !!inWorld, got, errors };
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* 1. as it ships (the one program asked for: this box draws in software) */
  const a = await onePage(browser, wsPort, webPort, rec, 'selftest-ships', 'onebatch=1');
  const ra = a.got.st && a.got.st.results;
  console.log(`   as it ships: ${JSON.stringify(ra)}; the tests took ${a.got.st && a.got.st.ms} ms (each draw [made and drawn, read back] ms: ${JSON.stringify(a.got.st && a.got.st.draws)})`);
  rec.ok('1a. as it ships: the page reaches BroTown, no page error', a.inWorld && a.errors.length === 0, a.errors);
  rec.ok('1b. ...the one program and the colour numbers pass their self-test (on this box\'s software renderer), and both are used',
    !!ra && ra.one && ra.one.result === 'pass' && ra.palette && ra.palette.result === 'pass' && a.got.one.on === true && a.got.pal.on === true, { ra, one: a.got.one, pal: a.got.pal });
  rec.ok('1c. ...and the report\'s `self` names nothing', !a.got.rep || !a.got.rep.self, a.got.rep);

  /* 2. the one program made to fail */
  const b = await onePage(browser, wsPort, webPort, rec, 'selftest-one', 'onebatch=1&selftest=fail:one');
  const rb = b.got.st && b.got.st.results;
  rec.ok('2a. `selftest=fail:one`: the page still reaches BroTown and draws, no page error (a failed test never stops the load)', b.inWorld && b.errors.length === 0, b.errors);
  rec.ok('2b. ...the one program falls back ALONE: the three programs draw, the colour numbers stay on and passed',
    !!rb && rb.one && rb.one.result === 'forced' && b.got.one.on === false && b.got.one.ok === false && rb.palette && rb.palette.result === 'pass' && b.got.pal.on === true,
    { rb, one: b.got.one, pal: b.got.pal });
  rec.ok('2c. ...and the report\'s `self` names `one`', !!b.got.rep && (!b.got.rep.lanesCap || JSON.stringify(b.got.rep.self) === JSON.stringify(['one'])), b.got.rep);

  /* 3. the colour numbers made to fail */
  const c = await onePage(browser, wsPort, webPort, rec, 'selftest-palette', 'onebatch=1&selftest=fail:palette');
  const rc = c.got.st && c.got.st.results;
  rec.ok('3a. `selftest=fail:palette`: the page still reaches BroTown and draws, no page error', c.inWorld && c.errors.length === 0, c.errors);
  rec.ok('3b. ...the colour numbers fall back ALONE to whole colours; the one program stays on and passed',
    !!rc && rc.palette && rc.palette.result === 'forced' && c.got.pal.on === false && rc.one && rc.one.result === 'pass' && c.got.one.on === true,
    { rc, one: c.got.one, pal: c.got.pal });
  rec.ok('3c. ...and the report\'s `self` names `palette`', !!c.got.rep && (!c.got.rep.lanesCap || JSON.stringify(c.got.rep.self) === JSON.stringify(['palette'])), c.got.rep);

  /* 4. no self-test (the off-ramp) */
  const d = await onePage(browser, wsPort, webPort, rec, 'selftest-off', 'onebatch=1&selftest=0');
  const rd = d.got.st && d.got.st.results;
  rec.ok('4. `selftest=0`: none run, nothing falls back: both programs used as today',
    d.inWorld && d.errors.length === 0 && !!rd && rd.one && rd.one.result === 'skipped' && rd.palette && rd.palette.result === 'skipped' && d.got.one.on === true && d.got.pal.on === true,
    { rd, one: d.got.one, pal: d.got.pal, errors: d.errors });

  /* 5. as it ships again, beside page 4 (both after the programs were built once in this browser) */
  const e = await onePage(browser, wsPort, webPort, rec, 'selftest-again', 'onebatch=1');
  const re = e.got.st && e.got.st.results;
  const warm = (x) => `${x.got.pal && x.got.pal.warmMs} + ${x.got.one && x.got.one.warmMs} ms`;
  console.log(`   the added time (throttle ${process.env.BT_QA_CPU_THROTTLE || 'none'}): the tests' own ${e.got.st && e.got.st.ms} ms (each draw [made and drawn, read back, polls]: ${JSON.stringify(e.got.st && e.got.st.draws)}); `
    + `the two warm-ups (colour numbers + one), whole: ${warm(e)} with, ${warm(d)} without (cold, page 1: ${warm(a)}); `
    + `the loading screen ${e.got.lt && e.got.lt.screen} s with (its group ${e.got.lt && e.got.lt.selfTest} s from the groups' start), ${d.got.lt && d.got.lt.screen} s without (cold, page 1: ${a.got.lt && a.got.lt.screen} s)`);
  rec.ok('5. as it ships again (the programs built before in this browser): both pass and are used, no page error',
    e.inWorld && e.errors.length === 0 && !!re && re.one && re.one.result === 'pass' && re.palette && re.palette.result === 'pass' && e.got.one.on === true && e.got.pal.on === true,
    { re, errors: e.errors });
}
