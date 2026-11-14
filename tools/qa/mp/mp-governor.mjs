/* ═══ mp-governor (v2.3.5222): THE GOVERNOR STEPS DOWN, AND MOVES NO KNOB YET ═══
 *
 * Card O's PR 2 (the grand plan's 2.3): the frame pacer, grown into the
 * governor (src/game/framePacer.js), judges late frames on EVERY screen and
 * moves the ladder's rung (src/game/drawLanes.js).  No knob reads the rung
 * yet (card O's PRs 4 to 13 each move one), so a step must SHOW -- on the
 * strip (`?perf=1`), to QA -- and change nothing a player sees.
 *
 * This box draws a few frames a second, so the phone's screen is SCRIPTED,
 * as mp-steadypace scripts its own: the page's clock moves one refresh of a
 * 60 screen for every call the browser makes, and after a frame the game
 * DREW, by that frame's scripted cost in whole refreshes -- here a phone
 * that misses one refresh in three (a 60 screen the governor now judges:
 * before, the pacer gave no verdict below about 70 a second).  The page is
 * slowed as a slow phone (BT_QA_CPU_THROTTLE, 2 unless set), in the world's
 * BroTown, with `?govern=1` (the governor asked for, as a test must once
 * every test's page names its lane) and `?perf=1` (the strip).  Asserted:
 *   1. the pacer reads a 60 screen and judges it (a verdict, frames late);
 *   2. the governor steps down a rung, and the strip MARKS the step
 *      ("STEP down chip: rate");
 *   3. no knob moved: the canvas's pixels and resolution, every refresh
 *      drawn, the water as it was -- while the lanes' table says where the
 *      rung stands (`__btLane()`).
 *
 *   node tools/qa/mp/run.mjs governor
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const B = 1000 / 60;

/* the scripted costs: two frames in three inside a refresh, one in three missing one (a third of the frames late,
   over the pacer's quarter), seeded as mp-steadypace's */
function costs(n) {
  let s = 20261114 >>> 0;
  const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const out = [];
  for (let i = 0; i < n; i++) out.push(r() < 0.66 ? 9 + r() * 6 : 18 + r() * 10);
  return out;
}

/* what a player could see of the knobs the ladder will move */
const knobsSeen = (P) => P.page.evaluate(() => {
  const cv = document.querySelector('.brotown-canvas');
  const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  const pace = window.__btPace ? window.__btPace() : null;
  let water = null;
  try { water = window.__btWaves && window.__btWaves.probe ? !!window.__btWaves.probe().on : null; } catch (e) { water = null; }
  return { cw: cv ? cv.width : null, ch: cv ? cv.height : null, res: R ? R.resolution : null, every: pace ? pace.every : null,
    soft: document.documentElement.hasAttribute('data-res-soft'), water };
});

export async function run({ browser, wsPort, webPort, rec }) {
  if (!process.env.BT_QA_CPU_THROTTLE) process.env.BT_QA_CPU_THROTTLE = '2';
  const P = await H.newPlayer(browser, { name: 'Governed', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, query: 'govern=1&perf=1' });
  const stopAlive = H.keepAlive(P);
  const said = [];
  P.page.on('pageerror', (e) => said.push('error: ' + String((e && e.message) || e).slice(0, 160)));
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the Wheel' }).then(() => true).catch(() => false);
    rec.ok('in BroTown (guard)', ok);
    if (!ok) return;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 20 }).catch(() => {});
    await P.page.waitForTimeout(2000);
    const before = await knobsSeen(P);
    const lad0 = await P.page.evaluate(() => (window.__btPace && window.__btPace() ? window.__btPace().ladder : null));
    rec.ok(`the governor is on (govern=1) and stands at the lane's row (${lad0 && lad0.lane}: ${lad0 && lad0.work}, ${lad0 && lad0.chip}) (guard)`,
      !!lad0 && lad0.on === true && lad0.lane === 'full' && lad0.depth === 0, lad0);

    /* the phone's screen, from here: a refresh a call, and a drawn frame's cost before the next (mp-steadypace's) */
    await P.page.evaluate(({ b, seqIn }) => {
      const raf = window.requestAnimationFrame.bind(window);
      let fake = performance.now(), i = 0, seen = -1, count = -1;
      performance.now = () => fake;
      window.requestAnimationFrame = (cb) => raf((t) => {
        if (t !== seen) {
          seen = t;
          const S = window._gameState && window._gameState.current;
          const n = S ? (S._frameCount | 0) : 0;
          const drew = n !== count;
          count = n;
          fake += drew ? Math.max(1, Math.ceil(seqIn[i++ % seqIn.length] / b - 1e-9)) * b : b;
        }
        cb(fake);
      });
    }, { b: B, seqIn: costs(4000) });

    /* 1 and 2: judged on a 60 screen, and a step down */
    const stepped = await H.waitFor(P, () => {
      const p = window.__btPace ? window.__btPace() : null;
      return p ? { hz: p.hz, every: p.every, late: p.lateShare, depth: p.ladder.depth, steps: p.ladder.steps.length, work: p.ladder.work, chip: p.ladder.chip } : null;
    }, (v) => v && v.depth > 0, { timeout: 420000, label: 'the governor\'s first step' }).catch(() => null);
    const pace = await P.page.evaluate(() => { const p = window.__btPace(); return { hz: p.hz, every: p.every, most: p.most, lateShare: p.lateShare, changes: p.changes, ladder: p.ladder }; });
    rec.ok(`1. the pacer reads a 60 screen and judges it (${pace.hz} a second; ${pace.lateShare != null ? Math.round(pace.lateShare * 100) + '% late' : 'no verdict'})`,
      pace.hz === 60 && pace.lateShare != null && pace.lateShare > 0.25, pace);
    rec.ok(`2. the governor steps down a rung on it (work ${pace.ladder.work}, chip ${pace.ladder.chip}: ${(pace.ladder.steps[0] || {}).axis} axis, ${((pace.ladder.steps[0] || {}).knobs || []).join(', ')})`,
      !!stepped && pace.ladder.depth >= 1 && pace.ladder.steps.length >= 1 && pace.ladder.steps[0].dir < 0, { stepped, ladder: pace.ladder });
    const strip = await H.waitFor(P, () => { const el = document.getElementById('bt-perf-hud'); return el ? el.textContent : ''; }, (t) => /STEP down/.test(t || ''), { timeout: 30000, label: 'the strip\'s mark' }).catch(() => '');
    const line = (String(strip).match(/ladder [^\n]*|STEP down[^\n]*/g) || []).join(' / ');
    rec.ok(`2. ...and the strip MARKS it ("${line.slice(0, 120)}")`, /ladder full\s+work \d\/\d\s+chip \d\/\d/.test(strip) && /STEP down (chip|work): \w+/.test(strip), strip && strip.slice(-400));

    /* 3: no knob moved */
    const after = await knobsSeen(P);
    const lane = await P.page.evaluate(() => (window.__btLane ? window.__btLane() : null));
    rec.ok(`3. no knob moved: the canvas ${after.cw} x ${after.ch} at ${after.res} as before, every refresh drawn (${after.every}), the water as it was`,
      after.cw === before.cw && after.ch === before.ch && after.res === before.res && after.soft === before.soft && after.every === 1 && after.water === before.water, { before, after });
    rec.ok(`3. ...while the lanes' table says where the rung stands (depth ${lane && lane.depth}; the rate's knob would read ${lane && lane.knobs && lane.knobs.rate})`,
      !!lane && lane.depth === pace.ladder.depth && lane.lane === 'full', lane);
    rec.ok('the page threw nothing', said.length === 0, said);
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
