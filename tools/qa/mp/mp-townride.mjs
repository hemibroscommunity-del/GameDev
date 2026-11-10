/* ═══ A RIDE THROUGH THE TOWN HOLDS THE PAGE FOR NOTHING (v2.3.4395) ═══
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
 * (every pose they can be drawn in: game/townsfolkWalk.js folkBakeJobs) and a
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
 *   - the four still walk and work (their day is on);
 *   - OFF HIS LOOP (the owner's next ride: "way better with just a few
 *     occasional hiccups", "between frames: body jog-east 101.0 ms"): each of
 *     the four is set down a few steps off his route in each of the eight
 *     directions, as a wait leaves him (he stopped for you, the walkers' cap,
 *     a bump), and walks straight back, facing whichever way that is.  As it
 *     ships no body sheet is baked for it (all eight facings were, behind the
 *     loading screen); as before, they are baked on the page.
 *
 *   node tools/qa/mp/run.mjs townride
 */
import * as H from './harness.mjs';

const PHONE = { width: 430, height: 932 };
/* this box, a phone page at dpr 1: measured 18 to 43 ms the longest job (one read of a page's bases, which cannot be
   split; the 43 with another test running beside it) and 248 to 267 ms in all as it ships; 213 to 258 ms the longest
   and 712 to 890 in all before */
const HOLD_MAX_MS = 70;
const SUM_MAX_MS = 520;
const OLD_HOLD_MS = 50;

async function ride(browser, wsPort, webPort, rec, label, query) {
  const P = await H.newPlayer(browser, { name: 'tr' + (query ? 'old' : 'new'), wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, query });
  /* a real keystroke every 20 s: the page logs itself out after two minutes without one (wsClient idleLogout), and
     this box can take longer than that over the frames below -- it did once, run straight after another scenario:
     logged out and back in on foot, the loading screen up and down */
  const stopAlive = H.keepAlive(P);
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
    const off = await offLoop(P);
    return { gate, jobs, folk, off };
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}

/* ── off his loop: set down OFF_PX from where his loop has him, each of the eight ways in turn, he walks straight back ──
   You stand AWAY_PX below him: on the screen, and past a quest giver's reach (townsfolkWalk FOLK_GIVER_NEAR), or he
   would stand and face you instead.  A step into something solid is refused (townsfolkDay), so a direction can fail to
   be walked: counted, not asserted (the bakes are what is asserted). */
const OFF_PX = 44, AWAY_PX = 270, BACK_MS = 6000;
async function offLoop(P) {
  const names = ['Blacksmith Bro', 'Farmer Bro', 'Beastmaster Bro', 'Old Man Reel'];
  const out = { jobs: [], walked: 0, tried: 0 };
  for (const name of names) {
    const at = await P.page.evaluate((n) => { const f = (window._gameState.current.npcs || []).find((x) => x.name === n && x._folkDay); return f ? { x: f.x, y: f.y } : null; }, name);
    if (!at) continue;
    await H.glideTo(P, at.x, at.y + AWAY_PX, { speed: 300, timeoutMs: 60000 });
    await P.page.waitForTimeout(1500);
    await P.page.evaluate(() => { window.__btMade = []; });
    for (let k = 0; k < 8; k++) {
      out.tried++;
      const back = await P.page.evaluate(({ n, k, off, lim }) => new Promise((resolve) => {
        const f = (window._gameState.current.npcs || []).find((x) => x.name === n && x._folkDay);
        if (!f) { resolve(false); return; }
        f.x = f._folkDay.tx + Math.cos(k * Math.PI / 4) * off;
        f.y = f._folkDay.ty + Math.sin(k * Math.PI / 4) * off;
        const t0 = performance.now();
        const iv = setInterval(() => {
          const d = Math.hypot(f._folkDay.tx - f.x, f._folkDay.ty - f.y);
          if (d < 2 || performance.now() - t0 > lim) { clearInterval(iv); resolve(d < 2); }
        }, 100);
      }), { n: name, k, off: OFF_PX, lim: BACK_MS });
      if (back) out.walked++;
      await P.page.waitForTimeout(250);
    }
    const made = await P.page.evaluate(() => window.__btMade.slice());
    for (let i = 0; i < made.length; i += 2) out.jobs.push({ who: name, name: made[i], ms: made[i + 1] });
  }
  return out;
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
  const offBody = (r) => r.off.jobs.filter((j) => /^body /.test(j.name));
  const oa = offBody(now), ob = offBody(old);
  const tell = (l) => l.map((j) => `${j.who.split(' ')[0]} ${j.name.split('|')[1]} ${Math.round(j.ms)} ms`).slice(0, 10).join(', ');
  console.log(`    off his loop, as it ships: walked back ${now.off.walked} of ${now.off.tried}, body sheets baked ${oa.length}${oa.length ? ' (' + tell(oa) + ')' : ''}`);
  console.log(`    off his loop, as before:   walked back ${old.off.walked} of ${old.off.tried}, body sheets baked ${ob.length}${ob.length ? ' (' + tell(ob) + ')' : ''}`);
  rec.ok(`off his loop, each of the eight ways: the four walked straight back ${now.off.walked} times of ${now.off.tried} (guard: most of them)`, now.off.walked >= now.off.tried * 0.6 && now.off.tried === 32, now.off);
  rec.ok(`as before: walking straight back bakes ${ob.filter(moving).length} moving body sheets on the page, the longest ${Math.round(Math.max(0, ...ob.map((j) => j.ms)))} ms (the hiccup the owner's meter named; at least one)`, ob.filter(moving).length >= 1, tell(ob));
  rec.ok(`as it ships: walking straight back, whichever way, bakes no body sheet on the page (${oa.length}${oa.length ? ': ' + tell(oa) : ''})`, oa.length === 0, tell(oa));
  rec.ok(`the four still have their day -- ${now.folk.map((f) => f.name + (f.day ? '' : ' (none)')).join(', ')}`, now.folk.length === 4 && now.folk.every((f) => f.day), now.folk);
}
