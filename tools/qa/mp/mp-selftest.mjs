/* ═══ v2.3.5234: THE SELF-TEST AT THE DOOR, ON A REAL PAGE (card O PR 14a) ═══
 *
 * Each of the game's own drawing programs draws a known 16 x 16 picture where
 * it is warmed, as the renderer is made, and is held to the CPU's answer
 * (src/rendering/selfTest.js).  14a tests the one program and the colour
 * numbers (the palette's program); v2.3.5236 (14b) the look program, the
 * sharp read (the one program's where it draws; the sharp batcher's where the
 * three do), the shine in the frame, the shadows' shade and the moving water.
 * Fresh pages:
 *
 *   1. as it ships, with the one program asked for (`onebatch=1`: this box's
 *      software renderer would keep the three): every program passes, every
 *      one is used, and the report's `self` names nothing;
 *   2. `selftest=fail:one`: the one program falls back ALONE -- the three
 *      programs draw, the colour numbers stay on -- and `self` names `one`;
 *   3. `selftest=fail:palette`: the colour numbers fall back alone to whole
 *      colours, the one program stays on, `self` names `palette`;
 *   4. `selftest=0`: none run (the off-ramp), every program used as today;
 *   5. as it ships again, straight after page 4: the added time is page 5's
 *      beside page 4's, both measured after the same programs were built in
 *      this browser before (page 1, the first, builds them cold: this box's
 *      software renderer keeps a built program for the next page, so page 1
 *      beside page 4 would charge the self-test for the cold build).  With
 *      BT_QA_CPU_THROTTLE, a slowed page's.
 *   6-9. v2.3.5236: `fail:look`, `fail:sheen`, `fail:shadow`, `fail:water`:
 *      each falls back ALONE to its way of today -- every look baked (the
 *      look program draws nothing more), every shine in a pass of its own,
 *      the shadows through the filter, the sea still -- the others passed and
 *      on, and `self` names it;
 *   10. `onebatch=0&selftest=fail:sharp`: the three programs draw, so the
 *      sharp batcher's own test runs, and fails: the plain read, `self`
 *      `sharp`, the others on -- but the shine in the frame, which rides the
 *      sharp read (sheenBatch.js: it reads its pieces with it, and draws only
 *      what the sharp batcher would), goes to its own pass with it, untested.
 *
 * Every page reaches BroTown and draws with no page error: a failed test
 * never stops the load.
 */
import * as H from './harness.mjs';

export const lane = 'full';

const PHONE = { width: 390, height: 844 };
/* the programs each page tests (the one program's route: its sharp read in
   its own test; the three's: the sharp batcher's) */
const TESTED_ONE = ['one', 'palette', 'look', 'sheen', 'shadow', 'water'];
const TESTED_THREE = ['sharp', 'palette', 'look', 'sheen', 'shadow', 'water'];

/* what the page says about every program: its verdict, and whether it is used */
function readPage() {
  const st = window.__btSelfTest ? window.__btSelfTest() : null;
  const one = window.__btOneBatch ? window.__btOneBatch() : null;
  const pal = window.__btPalette ? window.__btPalette() : null;
  const look = window.__btLookPalette ? window.__btLookPalette() : null;
  const sheen = window.__btSheenBatch ? window.__btSheenBatch() : null;
  const sp = window.__btShadowPrepass || null;
  const water = window.__btWaves && window.__btWaves.probe ? window.__btWaves.probe() : null;
  const sharp = window.__btSharp ? window.__btSharp() : null;
  let rep = null;
  try { const r = window.__btReport ? window.__btReport() : null; rep = r ? { lanesCap: r.lanesCap, self: r.open ? r.open.self || null : null } : null; } catch (e) { rep = null; }
  let lt = null;
  try { const L = window.__btLoadTimes ? window.__btLoadTimes() : null; lt = L ? { screen: L.screen, selfTest: (L.groups.find((g) => g.name === 'selfTest') || {}).s } : null; } catch (e) { lt = null; }
  const shadows = sp ? sp.stats() : [];
  return {
    st, rep, lt,
    one: one ? { on: one.on, ok: one.ok, linkError: one.linkError, warmMs: one.warmMs } : null,
    pal: pal ? { on: pal.on, ok: pal.ok, linkError: pal.linkError, warmMs: pal.warmMs, live: pal.live } : null,
    on: {
      one: !!(one && one.on),
      palette: !!(pal && pal.on),
      look: !!(look && look.on),
      sheen: !!(sheen && sheen.on),
      shadow: !!(sp && !sp.selfOff() && shadows.length && shadows.every((x) => x.home === 'cast')),
      water: !!(water && water.ok === true),
      sharp: !!(sharp && sharp.enabled && !sharp.selfOff),
    },
    lookDrawn: look ? look.drawn : null,
    shadowHomes: shadows.map((x) => x.home),
  };
}

async function onePage(browser, wsPort, webPort, rec, name, query, tested) {
  const P = await H.newPlayer(browser, { name, wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel', query });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.enterWorld(P);
    const inWorld = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 120000, label: name + ': into the world' }).catch(() => null);
    /* every tested program's verdict in (the shine's comes at the loading
       chain's end, the water's behind the Wheel's own loading screen) */
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      const have = await P.page.evaluate((names) => {
        const r = window.__btSelfTest ? window.__btSelfTest().results : {};
        return names.every((n) => r[n] && r[n].result !== undefined);
      }, tested);
      if (have) break;
      await new Promise((res) => setTimeout(res, 500));
    }
    /* a second and a half of play, so a fallback's next frames are drawn
       (the look program's count read either side of it) */
    const a = await P.page.evaluate(readPage);
    await new Promise((res) => setTimeout(res, 1500));
    const got = await P.page.evaluate(readPage);
    got.lookDrawnDelta = (got.lookDrawn != null && a.lookDrawn != null) ? got.lookDrawn - a.lookDrawn : null;
    return { inWorld: !!inWorld, got, errors };
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

const res = (g) => (g.st && g.st.results) || {};
/* every program but `but` in `names` passed and is used */
function othersFine(g, names, but) {
  const r = res(g);
  const bad = names.filter((n) => n !== but && !(r[n] && r[n].result === 'pass' && g.on[n]));
  return { ok: bad.length === 0, bad };
}
const selfIs = (g, names) => !!g.rep && (!g.rep.lanesCap || JSON.stringify(g.rep.self) === JSON.stringify(names));

export async function run({ browser, wsPort, webPort, rec }) {
  /* 1. as it ships (the one program asked for: this box draws in software) */
  const a = await onePage(browser, wsPort, webPort, rec, 'selftest-ships', 'onebatch=1', TESTED_ONE);
  const ra = res(a.got);
  console.log(`   as it ships: ${JSON.stringify(ra)}; the tests took ${a.got.st && a.got.st.ms} ms (each draw [made and drawn, read back, polls] ms: ${JSON.stringify(a.got.st && a.got.st.draws)})`);
  rec.ok('1a. as it ships: the page reaches BroTown, no page error', a.inWorld && a.errors.length === 0, a.errors);
  const fa = othersFine(a.got, TESTED_ONE, null);
  rec.ok('1b. ...every program passes its self-test on this box\'s software renderer (one, palette, look, sheen, shadow, water) and is used; the sharp read is the one program\'s here',
    fa.ok && ra.sharp && ra.sharp.result === 'skipped', { bad: fa.bad, ra, on: a.got.on });
  rec.ok('1c. ...the report\'s `self` names nothing, and the look program draws (its count rises: page 6\'s check means something)',
    (!a.got.rep || !a.got.rep.self) && a.got.lookDrawnDelta > 0, { rep: a.got.rep, lookDrawnDelta: a.got.lookDrawnDelta });

  /* 2. the one program made to fail */
  const b = await onePage(browser, wsPort, webPort, rec, 'selftest-one', 'onebatch=1&selftest=fail:one', TESTED_ONE);
  const rb = res(b.got);
  rec.ok('2a. `selftest=fail:one`: the page still reaches BroTown and draws, no page error (a failed test never stops the load)', b.inWorld && b.errors.length === 0, b.errors);
  const fb = othersFine(b.got, TESTED_ONE, 'one');
  rec.ok('2b. ...the one program falls back ALONE: the three programs draw; the others passed and are on',
    rb.one && rb.one.result === 'forced' && b.got.one.on === false && b.got.one.ok === false && fb.ok, { rb, on: b.got.on, bad: fb.bad });
  rec.ok('2b2. ...and the sharp batcher, which the three draw the figures with, is tested at once (the same read the one program had: the gatekeeper\'s sitting 20) and passes here',
    rb.sharp && rb.sharp.result === 'pass' && b.got.on.sharp === true, { sharp: rb.sharp });
  rec.ok('2c. ...and the report\'s `self` names `one`', selfIs(b.got, ['one']), b.got.rep);

  /* 3. the colour numbers made to fail */
  const c = await onePage(browser, wsPort, webPort, rec, 'selftest-palette', 'onebatch=1&selftest=fail:palette', TESTED_ONE);
  const rc = res(c.got);
  rec.ok('3a. `selftest=fail:palette`: the page still reaches BroTown and draws, no page error', c.inWorld && c.errors.length === 0, c.errors);
  const fc = othersFine(c.got, TESTED_ONE, 'palette');
  rec.ok('3b. ...the colour numbers fall back ALONE to whole colours; the others passed and are on',
    rc.palette && rc.palette.result === 'forced' && c.got.pal.on === false && fc.ok, { rc, on: c.got.on, bad: fc.bad });
  rec.ok('3c. ...and the report\'s `self` names `palette`', selfIs(c.got, ['palette']), c.got.rep);
  rec.ok('3b2. ...and no colour-number picture is alive after it (as it ships, page 1, many are): nothing that loaded while the verdict was pending kept the program it found wrong (paletteDecided: the gatekeeper\'s sitting 20)',
    c.got.pal && c.got.pal.live === 0 && a.got.pal && a.got.pal.live > 0, { after: c.got.pal && c.got.pal.live, ships: a.got.pal && a.got.pal.live });

  /* 4. no self-test (the off-ramp) */
  const d = await onePage(browser, wsPort, webPort, rec, 'selftest-off', 'onebatch=1&selftest=0', []);
  const rd = res(d.got);
  const allSkipped = TESTED_ONE.every((n) => rd[n] && rd[n].result === 'skipped');
  const allOn = TESTED_ONE.every((n) => d.got.on[n]);
  rec.ok('4. `selftest=0`: none run, nothing falls back: every program used as today',
    d.inWorld && d.errors.length === 0 && allSkipped && allOn, { rd, on: d.got.on, errors: d.errors });

  /* 5. as it ships again, beside page 4 (both after the programs were built once in this browser) */
  const e = await onePage(browser, wsPort, webPort, rec, 'selftest-again', 'onebatch=1', TESTED_ONE);
  const fe = othersFine(e.got, TESTED_ONE, null);
  const warm = (x) => `${x.got.pal && x.got.pal.warmMs} + ${x.got.one && x.got.one.warmMs} ms`;
  console.log(`   the added time (throttle ${process.env.BT_QA_CPU_THROTTLE || 'none'}): the tests' own ${e.got.st && e.got.st.ms} ms (each draw [made and drawn, read back, polls]: ${JSON.stringify(e.got.st && e.got.st.draws)}); `
    + `the two warm-ups (colour numbers + one), whole: ${warm(e)} with, ${warm(d)} without (cold, page 1: ${warm(a)}); `
    + `the loading screen ${e.got.lt && e.got.lt.screen} s with (its group ${e.got.lt && e.got.lt.selfTest} s from the groups' start), ${d.got.lt && d.got.lt.screen} s without (cold, page 1: ${a.got.lt && a.got.lt.screen} s)`);
  rec.ok('5. as it ships again (the programs built before in this browser): every program passes and is used, no page error',
    e.inWorld && e.errors.length === 0 && fe.ok, { bad: fe.bad, errors: e.errors });

  /* 6-9. v2.3.5236 (14b): each of the others made to fail, alone */
  const ways = {
    look: ['every look baked: the look program draws nothing more', (g) => g.on.look === false && g.lookDrawnDelta === 0],
    sheen: ['every shine in a pass of its own', (g) => g.on.sheen === false],
    shadow: ['the shadows through the filter, every system moved over', (g) => g.on.shadow === false && g.shadowHomes.length > 0 && g.shadowHomes.every((h) => h === 'layer')],
    water: ['the sea still', (g) => g.on.water === false],
  };
  let n = 6;
  for (const name of Object.keys(ways)) {
    const [what, fellBack] = ways[name];
    const p = await onePage(browser, wsPort, webPort, rec, 'selftest-' + name, 'onebatch=1&selftest=fail:' + name, TESTED_ONE);
    const r = res(p.got);
    const f = othersFine(p.got, TESTED_ONE, name);
    rec.ok(`${n}a. \`selftest=fail:${name}\`: the page reaches BroTown and draws, no page error`, p.inWorld && p.errors.length === 0, p.errors);
    rec.ok(`${n}b. ...${name} falls back ALONE (${what}); the others passed and are on`,
      r[name] && r[name].result === 'forced' && fellBack(p.got) && f.ok, { r: r[name], on: p.got.on, bad: f.bad, lookDrawnDelta: p.got.lookDrawnDelta, homes: p.got.shadowHomes });
    rec.ok(`${n}c. ...and the report's \`self\` names \`${name}\``, selfIs(p.got, [name]), p.got.rep);
    n++;
  }

  /* 10. the three programs: the sharp batcher's own test, made to fail */
  const s = await onePage(browser, wsPort, webPort, rec, 'selftest-sharp', 'onebatch=0&selftest=fail:sharp', TESTED_THREE);
  const rs = res(s.got);
  const fs = othersFine(s.got, TESTED_THREE.filter((x) => x !== 'sheen'), 'sharp');
  rec.ok('10a. `onebatch=0&selftest=fail:sharp`: the page reaches BroTown and draws, no page error', s.inWorld && s.errors.length === 0, s.errors);
  rec.ok('10b. ...the three programs draw, so the sharp batcher is tested; made to fail, the figures take the plain read; the colour numbers, the look, the shadows and the water passed and are on',
    rs.sharp && rs.sharp.result === 'forced' && s.got.on.sharp === false && s.got.on.one === false && rs.one && rs.one.result === 'skipped' && fs.ok,
    { rs, on: s.got.on, bad: fs.bad });
  rec.ok('10b2. ...and the shine in the frame, which rides the sharp read, goes to its own pass with it (skipped, saying why)',
    s.got.on.sheen === false && rs.sheen && rs.sheen.result === 'skipped' && /sharp read fell back/.test(rs.sheen.why || ''), { sheen: rs.sheen });
  rec.ok('10c. ...and the report\'s `self` names `sharp`', selfIs(s.got, ['sharp']), s.got.rep);
}
