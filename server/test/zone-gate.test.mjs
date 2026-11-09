/* ═══ v2.3.4355: THE ZONE GATE'S WAIT, AND THE ORDER ITS GROUND IS LAID ═══
 *
 * src/game/zoneGate.js.  At the expo of 2026-11-05 the judges' computers
 * showed the world with squares of its ground not drawn.  One cause was the
 * gate: its loading screen was raced against a flat 15 s, so a way in that
 * was slow but still arriving (17.8 s on the test box's slowed 1920 x 1080
 * window) was let go like one that had hung, and its pieces of ground were
 * asked for row by row, so the ones cut off were whole strips.  Checked:
 *   1. gateCap with no progress to read: 15 s, exactly as before;
 *   2. a load that says nothing (hung): still 15 s;
 *   3. a load still arriving past 15 s: the gate waits for it, and lets go
 *      GATE_QUIET_MS after its last sign of life;
 *   4. a load that never stops arriving: never past GATE_CAP_MAX_MS;
 *   5. the clocks outside the gate stay longer than its longest wait (the
 *      failsafe's age, and wheelHome.js's trip veil);
 *   6. fillOrder: every piece once, nearest the arrival first, the same
 *      order every time;
 *   7. the gate and the fill really use them (zoneTransitions.js,
 *      wheelTrial.js): a flat setTimeout racing the load, or a row-by-row
 *      fill, coming back fails here.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateCap, fillOrder, GATE_CAP_MS, GATE_QUIET_MS, GATE_CAP_MAX_MS, GATE_STALE_MS } from '../../src/game/zoneGate.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/* a clock the test moves: `later` queues, run(ms) plays the queue forward */
function clock() {
  let t = 0;
  const q = [];
  return {
    env: { now: () => t, later: (fn, ms) => { q.push({ at: t + ms, fn }); } },
    now: () => t,
    async run(until, each) {
      for (;;) {
        q.sort((a, b) => a.at - b.at);
        if (!q.length || q[0].at > until) break;
        const j = q.shift();
        t = j.at;
        if (each) each(t);
        j.fn();
        await Promise.resolve();
      }
      t = until;
      await Promise.resolve();
    },
  };
}
async function liftAt(progressAt, horizon = 60000) {
  const c = clock();
  let done = null;
  const p = gateCap(progressAt ? () => progressAt(c.now()) : null, c.env).then(() => { done = c.now(); });
  await c.run(horizon);
  await Promise.race([p, Promise.resolve()]);
  return done;
}

/* 1 */
{
  const at = await liftAt(null);
  check('1. no progress to read: the gate lets go at 15 s, as before', at === GATE_CAP_MS && GATE_CAP_MS === 15000, at);
}
/* 2 */
{
  const at = await liftAt(() => 0);
  check('2. a load that says nothing (hung) is let go at 15 s', at !== null && at >= GATE_CAP_MS && at < GATE_CAP_MS + 500, at);
  const early = await liftAt((t) => (t < 3000 ? Math.floor(t / 500) : 6));
  check('2b. ...and one that stopped arriving long before 15 s, too', early !== null && early >= GATE_CAP_MS && early < GATE_CAP_MS + 500, early);
}
/* 3 */
{
  /* a piece every 400 ms until 17.8 s (the slowed computer's way in), then nothing: the load is done by then, so the real
     gate lifts on `done`; this is the cap alone, which must still be waiting at 17.8 s */
  const lastSign = 17800;
  const at = await liftAt((t) => Math.floor(Math.min(t, lastSign) / 400));
  check('3. a load still arriving at 15 s is waited for: the gate is still held at 17.8 s', at !== null && at > lastSign, at);
  check('3b. ...and (its quiet would end past the longest wait) is let go at GATE_CAP_MAX_MS', at !== null && at >= GATE_CAP_MAX_MS && at < GATE_CAP_MAX_MS + 500 && lastSign + GATE_QUIET_MS > GATE_CAP_MAX_MS, at);
  /* arriving until 15.5 s: quiet for 8 s at 23.5 s */
  const b = await liftAt((t) => Math.floor(Math.min(t, 15500) / 250));
  check('3c. one that stops at 15.5 s is let go about 8 s later, not at once', b !== null && b >= 15250 + GATE_QUIET_MS && b <= 15500 + GATE_QUIET_MS + 500, b);
}
/* 4 */
{
  const at = await liftAt((t) => t);
  check('4. a load that never stops arriving is let go at GATE_CAP_MAX_MS', at !== null && at >= GATE_CAP_MAX_MS && at < GATE_CAP_MAX_MS + 500, at);
  const boom = await liftAt(() => { throw new Error('reader broke'); });
  check('4b. a reader that throws is a load that says nothing: 15 s', boom !== null && boom >= GATE_CAP_MS && boom < GATE_CAP_MS + 500, boom);
}
/* 5 */
{
  const home = readFileSync(join(ROOT, 'src/game/wheelHome.js'), 'utf8');
  const m = /const TRIP_VEIL_MS = (\d+);/.exec(home);
  const veil = m ? Number(m[1]) : 0;
  check('5. the longest wait is under the failsafe\'s age and the trip veil, with room', GATE_CAP_MAX_MS + 5000 <= GATE_STALE_MS && GATE_CAP_MAX_MS + 5000 <= veil && GATE_QUIET_MS < GATE_CAP_MAX_MS - GATE_CAP_MS + 1,
    { GATE_CAP_MAX_MS, GATE_STALE_MS, veil });
  /* ...and the veil does not lean on that room: while the stairs' gate into the world is up, the trip is veiled whatever
     the clock says (on a phone drawing a frame every few seconds the 30 s could run out first, and today's town's 46 MB
     of art would load for a stop nobody sees: zoneTransitions.js syncTownScenery) */
  const veiled = home.slice(home.indexOf('export function wheelTripVeiled'), home.indexOf('/** Has the way in arrived'));
  check('5a. the trip\'s veil holds while the gate into the world is up, before it reads its own clock',
    /if \(S\._zoneLoading && isWorldViewZone\(S\._zoneLoading\.toZone\)\) return true;\s*return Date\.now\(\) - \(S\._spawnAskedAt \|\| 0\) < TRIP_VEIL_MS;/.test(veiled));
  /* the ground's pieces wait up to GATE_WAIT_MS for their pictures with nothing laid: that must not read as a hung load */
  const gw = readFileSync(join(ROOT, 'public/tools/world/core/ground-worker.js'), 'utf8');
  const g = /const GATE_WAIT_MS = (\d+);/.exec(gw);
  check('5b. the gate\'s quiet is longer than the ground\'s wait for its pictures', !!g && Number(g[1]) < GATE_QUIET_MS, g && g[1]);
}
/* 6 */
{
  const cs = 192, x = 5 * cs + 96, y = 3 * cs + 96;      /* the middle of piece 5,3 */
  const o = fillOrder(0, 9, 0, 6, x, y, cs);
  const keys = new Set(o.map((p) => p.join(',')));
  check('6. every piece of the box once', o.length === 70 && keys.size === 70, o.length);
  check('6b. the piece you arrive on first', o[0][0] === 5 && o[0][1] === 3, o[0]);
  const d = (p) => Math.hypot((p[0] + 0.5) * cs - x, (p[1] + 0.5) * cs - y);
  let sorted = true;
  for (let n = 1; n < o.length; n++) if (d(o[n]) < d(o[n - 1]) - 1e-9) sorted = false;
  check('6c. never a nearer piece after a further one', sorted);
  /* cut the fill anywhere: what is laid is a disc round the arrival, so every missing piece is at least as far as every laid one */
  const cut = o.slice(0, 46), rest = o.slice(46);
  check('6d. cut short at 46 of 70 (the slowed computer), the 24 missing are the furthest', Math.max(...cut.map(d)) <= Math.min(...rest.map(d)) + 1e-9,
    { laidMax: Math.round(Math.max(...cut.map(d))), missingMin: Math.round(Math.min(...rest.map(d))) });
  check('6e. the same order every time', JSON.stringify(fillOrder(0, 9, 0, 6, x, y, cs)) === JSON.stringify(o));
  check('6f. one piece, and an empty box', fillOrder(2, 2, 2, 2, 0, 0, cs).length === 1 && fillOrder(3, 2, 0, 0, 0, 0, cs).length === 0);
}
/* 7 */
{
  const zt = readFileSync(join(ROOT, 'src/game/zoneTransitions.js'), 'utf8');
  check('7. the zone gate races its load against gateCap', /Promise\.race\(\[\s*Promise\.resolve\(preloadZoneAssets\(_tz\)\)\.catch\(function \(\) \{\}\),\s*gateCap\(/.test(zt));
  check('7b. ...and no flat timer races a zone\'s load any more', !/preloadZoneAssets\(_tz\)[\s\S]{0,120}setTimeout\(r, \d+\)/.test(zt));
  check('7c. the failsafe reads the gate\'s own age', /_zoneLoading\.t > GATE_STALE_MS/.test(zt));
  const wt = readFileSync(join(ROOT, 'src/game/wheelTrial.js'), 'utf8');
  const warm = wt.slice(wt.indexOf('export async function wheelWarm'), wt.indexOf('export function wheelWarmGen'));
  check('7d. the gate\'s fill asks for its pieces in fillOrder', /for \(const \[i, j\] of fillOrder\(i0, i1, j0, j1, x, y, cs\)\)/.test(warm) && !/for \(let j = j0; j <= j1; j\+\+\) for \(let i = i0/.test(warm));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
