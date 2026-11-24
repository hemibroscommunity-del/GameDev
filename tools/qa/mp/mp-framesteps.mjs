/* ═══ v2.3.5340: THE FRAME AS NAMED STEPS, ON A PHONE (grand plan 5.4, card M PR 1) ═══
 *
 * src/game/frameSteps.js marks the game's loop as named steps: `legacy` (the
 * body before the six calls at its end), then `visual`, `arrows`, `slime`,
 * `cleanup`, `render`, `afterFrame`.  The probe window.__btSteps() reads
 * them.  A phone plays BroTown three times:
 *
 *   - upright (390 x 844) and sideways (844 x 390), as it ships: the steps
 *     in order (seven; v2.3.5341: seventeen, the ten inside legacy named),
 *     each run every frame, each with time summed, no throws, no step left
 *     open between frames;
 *   - upright with `?framesteps=0`: the probe says off (no marks are made).
 *
 * This box draws a few frames a second (TRAPS §200): nothing here is timed
 * by a 60-a-second window.  The sums are read after a number of the page's
 * own frames; a step too small for the clock's grain reads 0 in a frame, so
 * "each with time" is asked of the sums after enough of them.
 *
 *   node tools/qa/mp/run.mjs framesteps
 */
import * as H from './harness.mjs';
export const lane = 'full';

/* v2.3.5341 (card M PR 2): + the ten steps inside legacy, in their places */
/* v2.3.6541: + 'input' (card CT PR 2) */
const WANT = ['legacy', 'tap', 'input', 'sound', 'ride', 'zone', 'farm', 'townsfolk', 'monsters', 'weaponFeel', 'loot', 'peers',
  'visual', 'arrows', 'slime', 'cleanup', 'render', 'afterFrame'];
const UPRIGHT = { width: 390, height: 844 };
const SIDEWAYS = { width: 844, height: 390 };
const FRAMES = 120;   /* the page's own frames the sums are read after, at least */

async function play(browser, wsPort, webPort, rec, label, viewport, query) {
  const P = await H.newPlayer(browser, { name: 'steps' + label.replace(/\W/g, '').slice(0, 8), wsPort, webPort, world: 'wheel', viewport, touch: true, dpr: 1, query });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 160)));
  P.page.on('console', (m) => { const t = m.text(); if (/GameLoop error/.test(t)) errors.push(t.slice(0, 200)); });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading, up: !!S.__introLiftedAt }), (v) => v.z === 'wheel' && !v.l && v.up, { timeout: 120000, label: 'into BroTown' }).then(() => true).catch(() => false);
    rec.ok(`${label}: in BroTown (guard)`, ok);
    if (!ok) return null;
    const has = await P.page.evaluate(() => typeof window.__btSteps === 'function');
    rec.ok(`${label}: the page offers window.__btSteps`, has);
    if (!has) return null;
    const first = await P.page.evaluate(() => window.__btSteps());
    if (!first.on) return { first };
    /* the sums after FRAMES of the page's own frames, and until each step has time (a step under the clock's grain
       reads 0 in most frames: its sum is asked again, up to a minute) */
    const enough = await H.waitFor(P, () => window.__btSteps(), (r) => r.now.frames + r.frames >= FRAMES && r.now.ms.every((v) => v > 0), { timeout: 240000, label: 'the steps\' sums' }).then(() => true).catch(() => false);
    const r = await P.page.evaluate(() => window.__btSteps());
    return { first, r, enough, errors };
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  for (const [label, vp] of [['upright', UPRIGHT], ['sideways', SIDEWAYS]]) {
    const got = await play(browser, wsPort, webPort, rec, label, vp, '');
    if (!got) continue;
    const { first, r, enough, errors } = got;
    console.log(`    ${label}: ${JSON.stringify(r)}`);
    rec.ok(`${label}: the probe is on`, first.on === true, first);
    if (!r) continue;
    rec.ok(`${label}: ${WANT.length} steps, in order (${r.names.join(', ')})`, JSON.stringify(r.names) === JSON.stringify(WANT), r.names);
    rec.ok(`${label}: ${r.now.frames + r.frames} frames summed; every step ran every frame (runs ${r.runs.join(', ')})`,
      r.runs.every((n) => n === r.runs[0]) && r.runs[0] >= FRAMES, r.runs);
    rec.ok(`${label}: each step with time (${WANT.map((n, i) => n + ' ' + r.now.ms[i]).join(', ')} ms)`, enough && r.now.ms.every((v) => v > 0), r.now.ms);
    rec.ok(`${label}: no step threw (${r.throws.join(', ')}), and no "GameLoop error" said`, r.throws.every((n) => n === 0) && errors.length === 0, { throws: r.throws, errors });
    rec.ok(`${label}: no step left open between frames (read between them: ${r.open})`, r.open === null, r.open);
  }
  const off = await play(browser, wsPort, webPort, rec, 'upright, ?framesteps=0', UPRIGHT, 'framesteps=0');
  if (off) {
    rec.ok('?framesteps=0: the probe says off (no marks made)', off.first && off.first.on === false && !off.r, off.first);
  }
}
