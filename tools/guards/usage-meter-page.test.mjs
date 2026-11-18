/* ═══ v2.3.6001: THE USAGE METER'S SUMS ON THE PAGE (card CS PR 2) ═══
 *
 * src/game/usageMeter.js turns the worker's counts (GET /dev/usage,
 * server/src/usagemeter.js) into the Test panel's words.  This holds:
 *   1. the estimate spreads today's writes over the part of the UTC day
 *      they cover (the whole day so far, or since the server started);
 *   2. against the plans: the free plan's 100,000 rows written a day and
 *      the paid plan's 50 million a month;
 *   3. no projection from under 10 minutes; nothing from a bad answer;
 *   4. the biggest kinds first; the six switches all listed, each with words;
 *   5. the box is in the Test panel and reads the one route.
 *
 * BREAK PROOF (rule 8), tried by hand once, 2026-11-18:
 *   - the span measured from the day's start always    -> FAIL 1 (since start)
 *   - PAID_WRITES_MONTH 5,000,000                       -> FAIL 2
 *
 * Run from the repository's root: node tools/guards/usage-meter-page.test.mjs
 */
import { readFileSync } from 'node:fs';
import { USAGE_PLANS, USAGE_SWITCHES, usageEstimate, usageTop, usageWords } from '../../src/game/usageMeter.js';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400)));
};
const DAY = 86400000;
const day0 = Date.UTC(2026, 10, 18);
const answer = (now, since, writes) => ({ ok: true, on: true, now, dayEnds: day0 + DAY, today: { since, writes, reads: 0, sends: 0, byKind: {}, switches: {} }, sinceStart: { since, writes, reads: 0, sends: 0 } });

{
  const e = usageEstimate(answer(day0 + 6 * 3600000, day0 - 3600000, 5000));
  check('1. six hours into the day, counting all day: 5,000 rows -> 20,000 a day', e.whole === true && e.projected === 20000, e);
  const f = usageEstimate(answer(day0 + 12 * 3600000, day0 + 6 * 3600000, 5000));
  check('1. ...the server started at 06:00: 5,000 in six hours -> 20,000 a day', e.whole === true && f.whole === false && f.projected === 20000 && f.from === day0 + 6 * 3600000, f);
}
{
  const e = usageEstimate(answer(day0 + 12 * 3600000, day0, 25000));
  check('2. 50,000 a day: half the free plan\'s day, 3% of the paid plan\'s month', e.projected === 50000 && e.freeShare === 0.5 && Math.abs(e.paidShare - 0.03) < 1e-9, e);
  check('2. the plans as the card gives them', USAGE_PLANS.FREE_WRITES_DAY === 100000 && USAGE_PLANS.PAID_WRITES_MONTH === 50000000);
  const w = usageWords(answer(day0 + 12 * 3600000, day0, 25000)).join(' ');
  check('2. in words: the rows, the pace, both plans', /25,000 rows written today/.test(w) && /about 50,000 rows a day/.test(w) && /Free plan: 50%/.test(w) && /Paid plan: 3%/.test(w), w);
}
{
  const e = usageEstimate(answer(day0 + 5 * 60000, day0 - 1, 40));
  check('3. five minutes in: no projection, and the words say so', e.projected === null && /Too early/.test(usageWords(answer(day0 + 5 * 60000, day0 - 1, 40)).join(' ')));
  check('3. a bad answer: nothing', usageEstimate(null) === null && usageEstimate({ ok: false }) === null && usageWords(null)[0] === 'No usage counted yet.');
}
{
  const t = usageTop({ 'rpg:': 5, 'oplog:': 9, seats: 0, 'xfer:': 5 }, 2);
  check('4. the biggest kinds first, none of 0, at most n', JSON.stringify(t) === JSON.stringify([['oplog:', 9], ['rpg:', 5]]), t);
  const names = USAGE_SWITCHES.map((s) => s.name).sort().join();
  check('4. the six switches, each with words', names === 'freezedevice,fullsnap,reqstamp,resetbook,seathold,xferescrow' && USAGE_SWITCHES.every((s) => s.what.length > 10));
  const server = readFileSync(new URL('../../server/src/usagemeter.js', import.meta.url), 'utf8');
  check('4. ...the same six as the worker counts', USAGE_SWITCHES.every((s) => server.includes("'" + s.name + "'")));
}
{
  const panel = readFileSync(new URL('../../src/ui/panels/DevPanel.jsx', import.meta.url), 'utf8');
  const box = readFileSync(new URL('../../src/ui/panels/UsageMeter.jsx', import.meta.url), 'utf8');
  const dev = readFileSync(new URL('../../server/src/devtools.js', import.meta.url), 'utf8');
  check('5. the box is in the Test panel and reads GET /dev/usage, the route the worker answers', /<UsageMeter /.test(panel) && /call\('\/dev\/usage'\)/.test(box) && /path === '\/dev\/usage'/.test(dev));
}

console.log(failed ? `${failed} FAILED` : 'all green');
process.exit(failed ? 1 : 0);
