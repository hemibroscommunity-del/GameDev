/* ═══ A RIDE THROUGH THE TOWN HOLDS THE PAGE FOR NOTHING (v2.3.4355) ═══
 *
 * The owner's iPhone 14 Pro Max on the skateboard through BroTown, the step
 * already steady (mp-steadystep): "a little smoother but it's still gritty
 * looking", the frame meter reading "late frames 10 in 10s", "worst 170.0 =
 * game 40.0 + outside 130.0".  The time outside the frame was art being made
 * on the page the first time it came on screen:
 *   - four of the townsfolk have a look the shared colour numbers refuse (an
 *     eye style, patterned trousers), and each pose and direction of theirs
 *     was baked when first met: 80 to 250 ms a sheet on this box;
 *   - every frame of an object page was read for its ground line in one go
 *     as the page came.
 * Now the townsfolk's sheets are baked behind the world's loading screen
 * (their days are fixed loops: game/townsfolkWalk.js folkBakeJobs) and a
 * page's reads are a few ms at a time (wheelObjects.js readPageBottoms).
 *
 * A phone in the world rides a loop right through the town on the board,
 * every first-sight job on the page naming itself and how long it held it
 * (debug/madeLog.js, window.__btMade).  Two pages: the game as it ships, and
 * `?folkbake=0` (the townsfolk baked when first met, as before).  Asserted:
 *   - as before: at least one moving body sheet is baked on the ride and
 *     holds the page OLD_HOLD_MS or more (the fault, reproduced);
 *   - as it ships: the bakes were done behind the loading screen, no moving
 *     body sheet is baked on the ride, and no job holds the page past
 *     HOLD_MAX_MS, nor all of them together past SUM_MAX_MS;
 *   - the four still walk and work (their day is on).
 *
 *   node tools/qa/mp/run.mjs townride
 */
import * as H from './harness.mjs';

const PHONE = { width: 430, height: 932 };
/* this box, a phone page at dpr 1: measured 20 ms the longest job (a page's bases) and 248 ms in all as it ships;
   246 ms the longest and 890 in all before */
const HOLD_MAX_MS = 40;
const SUM_MAX_MS = 520;
const OLD_HOLD_MS = 50;

async function ride(browser, wsPort, webPort, rec, label, query) {
  const P = await H.newPlayer(browser, { name: 'tr' + (query ? 'old' : 'new'), wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, query });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the Wheel' }).then(() => true).catch(() => false);
    rec.ok(`${label}: in BroTown (guard)`, ok);
    if (!ok) return null;
    const G = await H.wheelGeom();
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 20 }).catch(() => {});
    const gate = await P.page.evaluate(() => { const s = window.__btWorldTrial.stats; return { bakes: s.folkBakes || null, entryMs: s.entryMs }; });
    await P.page.waitForTimeout(3000);
    await P.page.evaluate(() => { window.__btMade = []; });
    await P.page.keyboard.press('z');
    await H.waitFor(P, () => window.__btRideBtn && window.__btRideBtn(), (v) => v && v.on === true, { timeout: 8000, label: 'on the board' }).catch(() => null);
    /* right across the town, up, back across, and home: every townsperson's spot passes the screen */
    for (const [x, y] of [[G.cx - 1500, G.arrival.y], [G.cx + 1500, G.arrival.y], [G.cx + 1500, G.arrival.y - 1200], [G.cx - 1500, G.arrival.y - 1200], [G.cx, G.arrival.y]]) {
      await H.glideTo(P, x, y, { speed: 300, timeoutMs: 60000 });
    }
    const made = await P.page.evaluate(() => window.__btMade.slice());
    const jobs = [];
    for (let i = 0; i < made.length; i += 2) jobs.push({ name: made[i], ms: made[i + 1] });
    const folk = await P.page.evaluate(() => (window._gameState.current.npcs || []).filter((n) => /Blacksmith Bro|Farmer Bro|Beastmaster Bro|Old Man Reel/.test(n.name)).map((n) => ({ name: n.name, day: !!n._folkDay })));
    return { gate, jobs, folk };
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

/* a body sheet for a pose that MOVES (a stand is one frame, a few ms: the way he turns to face you is not known ahead) */
const moving = (j) => /^body /.test(j.name) && !/\|stand\//.test(j.name);
const read = (r) => {
  const mv = r.jobs.filter(moving);
  return { jobs: r.jobs.length, sum: Math.round(r.jobs.reduce((a, j) => a + j.ms, 0)), longest: Math.round(Math.max(0, ...r.jobs.map((j) => j.ms))),
    moving: mv.length, movingLongest: Math.round(Math.max(0, ...mv.map((j) => j.ms))), movingNames: mv.map((j) => j.name.split('|')[1]).slice(0, 8),
    pages: r.jobs.filter((j) => j.name === 'page bases').length };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const now = await ride(browser, wsPort, webPort, rec, 'as it ships', '');
  const old = await ride(browser, wsPort, webPort, rec, 'as before (?folkbake=0)', 'folkbake=0');
  if (!now || !old) return;
  const a = read(now), b = read(old);
  console.log(`    as it ships: ${JSON.stringify(a)}; at the gate ${JSON.stringify(now.gate)}`);
  console.log(`    as before:   ${JSON.stringify(b)}; at the gate ${JSON.stringify(old.gate)}`);
  rec.ok(`as before: a ride through the town bakes ${b.moving} moving body sheets on the page (${b.movingNames.join(', ')}), the longest holding it ${b.movingLongest} ms (the fault: at least one, ${OLD_HOLD_MS} ms or more)`,
    b.moving >= 1 && b.movingLongest >= OLD_HOLD_MS && !old.gate.bakes, b);
  rec.ok(`as it ships: the townsfolk's sheets were baked behind the loading screen -- ${now.gate.bakes && now.gate.bakes.n} of them in ${now.gate.bakes && now.gate.bakes.ms} ms (guard)`,
    !!now.gate.bakes && now.gate.bakes.n >= 4, now.gate);
  rec.ok(`as it ships: the ride bakes no moving body sheet (${a.moving}; ${b.moving} before)`, a.moving === 0, a);
  rec.ok(`as it ships: no job holds the page past ${HOLD_MAX_MS} ms (the longest ${a.longest}; ${b.longest} before), nor all ${a.jobs} together past ${SUM_MAX_MS} ms (${a.sum}; ${b.sum} before)`,
    a.longest <= HOLD_MAX_MS && a.sum <= SUM_MAX_MS && a.pages > 0, a);
  rec.ok(`the four still have their day -- ${now.folk.map((f) => f.name + (f.day ? '' : ' (none)')).join(', ')}`, now.folk.length === 4 && now.folk.every((f) => f.day), now.folk);
}
