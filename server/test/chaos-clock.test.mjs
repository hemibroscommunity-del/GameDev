/* v2.3.4793: CHAOS -- A PHONE WHOSE CLOCK IS WRONG, AND AN APP SWITCH.
 *
 * A phone's Date.now() is never the date (CLAUDE.md §5: the server is the
 * authority): an iPhone set by hand, a computer a time zone's worth off, a
 * clock corrected on waking.  And an iPhone that puts the page in the
 * background freezes its timers while its clock runs on.  Every rule the
 * phone keeps that compares the WORKER's time to its own must read the
 * worker's clock through an offset, or say time LEFT.  The pile timers have
 * theirs (workerClock.js, loot-clock.test: ahead, behind, a correction
 * forgotten, the ping feeding it); this sweep is the other rules that read a
 * worker's time on the phone, each under a phone clock off by minutes, hours
 * and a day, and across ten minutes in the background:
 *
 *   1. the farm (farmBus.js: a bed is ripe when the worker's clock says so)
 *   2. the daily rewards' "ends in" (dailyRewards.js untilText, its `_skew`)
 *   3. Well Rested's time left (rest.js wellRestedLeft) -- KNOWN, below
 *
 * KNOWN: a case red on today's code is listed with its reason and kept out
 * of the failure count (CHAOS_KNOWN=1 counts it); a known case that turns
 * green prints a NOTE.  Found by this sweep and reported, not fixed (a lane
 * of tests only): the arena's "Bracket starts in" (PartyPanel.jsx,
 * `startsAt - Date.now()`) reads the worker's time on the phone's clock the
 * same way, in a screen node cannot run.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const KNOWN = new Map([
  ['rest-chip-clock', 'rest.js wellRestedLeft: wsClient.js mirrors the worker\'s `_buffs.wellRested` (an absolute time on the WORKER\'s clock) onto S.rpg._wellRestedUntil, and wellRestedLeft judges it against the phone\'s own Date.now(). A phone 30 min or more fast shows no Well Rested chip at all while the worker pays the +10%; one an hour slow shows 90 min. Display only (the worker pays by its own clock). The fix is the farm\'s: time left, or the worker clock\'s offset (workerClock.js).'],
]);
const COUNT_KNOWN = process.env.CHAOS_KNOWN === '1';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 500) : ''); }
}
function verdict(id, name, cond, detail) {
  if (!KNOWN.has(id) || COUNT_KNOWN) return check(name, cond, detail);
  if (cond) console.log('NOTE known case "' + id + '" passes now: take it off KNOWN --', name);
  else console.log('KNOWN', name, '--', KNOWN.get(id).slice(0, 160) + '...', detail !== undefined ? JSON.stringify(detail).slice(0, 300) : '');
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* The phone's clock: the worker's true time plus `skew`.  Date.now is the
   phone's for the length of `fn`; `sleep(ms)` is the page in the background
   for that long (the clock runs on; no timer fired meanwhile). */
const W0 = Date.UTC(2026, 10, 11, 12, 0, 0);
let workerT = W0;
const realNow = Date.now;
function onPhone(skew, fn) {
  workerT = W0;
  Date.now = () => workerT + skew;
  try { return fn({ sleep: (ms) => { workerT += ms; }, worker: () => workerT }); }
  finally { Date.now = realNow; }
}
const SKEWS = [
  ['in step', 0],
  ['3 min fast', 3 * 60000], ['3 min slow', -3 * 60000],
  ['5 h fast', 5 * 3600000], ['5 h slow', -5 * 3600000],
  ['a day fast', 86400000], ['a day slow', -86400000],
];
const MIN = 60000;

// ── 1. the farm ──
{
  const { farmBus } = await import('../../src/ui/mobile/farmBus.js');
  const bad = [];
  for (const [label, skew] of SKEWS) {
    onPhone(skew, ({ sleep, worker }) => {
      farmBus.reset();
      /* the worker's farm_state: a bed planted now, ripe in 20 minutes */
      farmBus.apply({ beds: 1, plots: [{ s: 0, crop: 'wheat', plantedAt: worker(), readyAt: worker() + 20 * MIN }], now: worker() });
      const bed = farmBus.view.plots[0];
      const leftAt0 = bed.readyAt - farmBus.serverNow();
      /* ten minutes with the page in the background, then back */
      sleep(10 * MIN);
      const leftAfter = bed.readyAt - farmBus.serverNow();
      sleep(10 * MIN + 1000);
      const ripe = farmBus.serverNow() >= bed.readyAt;
      if (Math.abs(leftAt0 - 20 * MIN) > 50 || Math.abs(leftAfter - 10 * MIN) > 50 || !ripe) bad.push({ label, leftAt0, leftAfter, ripe });
    });
  }
  check('1. the farm\'s bed counts down on the worker\'s clock: 20 min left, 10 after ten minutes in the background, ripe at 20, whatever the phone\'s clock says (off by minutes, hours, a day)', bad.length === 0, bad);
}

// ── 2. the daily rewards' "ends in" ──
{
  /* untilText and applyRewardsState's `_skew`, cut from the module (it
     imports the page's aliases) and run here */
  const file = src('src/game/dailyRewards.js');
  const cut = (name) => {
    const at = file.indexOf('export function ' + name + '(');
    if (at < 0) return null;
    let i = file.indexOf('{', at), depth = 0;
    for (; i < file.length; i++) { if (file[i] === '{') depth++; else if (file[i] === '}' && --depth === 0) break; }
    return file.slice(at + 'export '.length, i + 1);
  };
  const untilSrc = cut('untilText');
  const skewLine = /_state = \{ \.\.\.payload, _at: Date\.now\(\), _skew: \(Number\(payload\.now\) \|\| Date\.now\(\)\) - Date\.now\(\) \};/.test(file);
  check('2. untilText cut from dailyRewards.js, and the state keeps the worker\'s `now` as `_skew`', !!untilSrc && skewLine, { untilSrc: !!untilSrc, skewLine });
  if (untilSrc) {
    const bad = [];
    for (const [label, skew] of SKEWS) {
      onPhone(skew, ({ sleep, worker }) => {
        const ctx = { Date, Math, Number, _state: null };
        vm.createContext(ctx);
        vm.runInContext(untilSrc + '\nthis.untilText = untilText;', ctx);
        /* rewards_state from the worker: the season ends in 7 h 12 m */
        const st = { now: worker(), season: { endsAt: worker() + 7 * 3600000 + 12 * MIN + 30000 } };
        const S = { ...st, _at: Date.now(), _skew: (Number(st.now) || Date.now()) - Date.now() };
        const t0 = ctx.untilText(st.season.endsAt, S);
        sleep(10 * MIN);
        const t1 = ctx.untilText(st.season.endsAt, S);
        if (t0 !== '7h 12m' || t1 !== '7h 2m') bad.push({ label, t0, t1 });
      });
    }
    check('2. "ends in" reads the worker\'s clock: 7h 12m, then 7h 2m after ten minutes in the background, whatever the phone\'s clock says', bad.length === 0, bad);
  }
}

// ── 3. Well Rested's time left ──
{
  const R = await import('../../src/game/rest.js');
  const wired = /S\.rpg\._wellRestedUntil = typeof _sb\.wellRested === 'number' \? _sb\.wellRested : 0/.test(src('src/networking/wsClient.js'));
  check('3. wsClient mirrors the worker\'s Well Rested time onto S.rpg._wellRestedUntil (what this case reads)', wired);
  const bad = [];
  for (const [label, skew] of SKEWS) {
    onPhone(skew, ({ sleep, worker }) => {
      /* the worker rested you: 30 minutes of Well Rested by ITS clock */
      const S = { rpg: {}, _serverCaps: { rest: true } };
      R.onRestResult(S, { ok: true, until: worker() + 30 * MIN, ms: 30 * MIN }, {});
      const left0 = R.wellRestedLeft(S);
      sleep(10 * MIN);
      const left1 = R.wellRestedLeft(S);
      if (Math.abs(left0 - 30 * MIN) > 1000 || Math.abs(left1 - 20 * MIN) > 1000) bad.push({ label, left0: Math.round(left0 / 1000), left1: Math.round(left1 / 1000) });
    });
  }
  verdict('rest-chip-clock', '3. Well Rested shows 30 min left, then 20 after ten minutes in the background, whatever the phone\'s clock says', bad.length === 0, bad);
  /* what holds today: a phone in step is right (the case the game was built on) */
  const inStep = onPhone(0, ({ worker }) => { const S = { rpg: {}, _serverCaps: { rest: true } }; R.onRestResult(S, { ok: true, until: worker() + 30 * MIN }, {}); return R.wellRestedLeft(S); });
  check('3. ...a phone in step with the worker reads 30 min', Math.abs(inStep - 30 * MIN) <= 1000, inStep);
}

console.log(failures === 0 ? '\nALL PASS' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
