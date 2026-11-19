/* ═══ v2.3.6309 (card RR PR 4): A GAP THE SOCKET CARRIED IS NOT A FREEZE ═══
 * (src/game/thawCarried.js; wsClient.js's alive timer)
 *
 * A page that misses the alive timer's beats for over 5 s was rejoined on
 * every such gap, so a slow device rejoined forever.  Now a gap is a freeze
 * only if the worker's pings from inside it did not all arrive:
 *   1. a slow page's gap, every ping inside it handled late: carried;
 *   2. a gap with its pings missing (the network slept): not carried, so the
 *      rejoin stands; one ping short of the count: not carried;
 *   3. no ping clock yet, or a gap of nothing: not carried (the old rule);
 *   4. the worker's clock offset maps its times onto the page's: pings sent
 *      before or after the gap are not counted;
 *   5. the count wanted: one ping a THAW.PING_MS, less one at an edge, at
 *      least one;
 *   6. wsClient.js wires it: the pings kept, the gap noted and judged a
 *      SETTLE beat later with the offset read when found, and only the forced
 *      rejoin skipped for a carried gap (the rest of the return runs);
 *      `?thawjudge=0` judges nothing (every gap rejoins, as before).
 * BREAK PROOF (rule 8), tried by hand once: thawCarried returning true for
 * an unknown clock -> FAIL 3; `carried === true` dropped from the rejoin's
 * branch in wsClient.js -> FAIL 6.
 */
import { readFileSync } from 'node:fs';
import { THAW, thawCarried, thawPingsWanted } from '../../src/game/thawCarried.js';

let passed = 0, failed = 0;
const check = (name, ok, detail) => {
  if (ok) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail))); }
};

const OFF = 1234567;   /* worker clock minus the page's */
const pingsEvery = (fromPage, toPage, every) => {
  const out = [];
  for (let t = fromPage + every; t <= toPage; t += every) out.push(t + OFF);
  return out;
};

// ── 1. a slow page: every ping of the gap came ──
{
  const from = 100000, to = from + 12000;
  const pings = pingsEvery(from - 6000, to + 2000, 2000);
  check('1. a 12 s gap with a ping every 2 s, all handled late: carried', thawCarried(from, to, pings, OFF, true), { pings: pings.length });
  const slow = pingsEvery(from, to, 3300);
  check('1. ...and with the worker running late (a ping every 3.3 s): carried', thawCarried(from, to, slow, OFF, true), { n: slow.length, want: thawPingsWanted(to - from) });
  check('1. a 5.5 s gap with one ping in it: carried', thawCarried(0, 5500, [3000 + OFF], OFF, true));
}

// ── 2. a frozen socket: its pings missing ──
{
  const from = 100000, to = from + 30000;
  const before = pingsEvery(from - 10000, from, 2000);
  check('2. a 30 s gap with no ping inside it: not carried (the rejoin stands)', !thawCarried(from, to, before, OFF, true));
  const want = thawPingsWanted(to - from);
  const short = pingsEvery(from, to, 2000).slice(0, want - 1);
  check(`2. ...one ping short of the ${want} wanted: not carried`, !thawCarried(from, to, short, OFF, true), { n: short.length, want });
  check('2. ...exactly the count: carried', thawCarried(from, to, pingsEvery(from, to, 2000).slice(0, want), OFF, true));
}

// ── 3. no clock, no gap ──
{
  const pings = pingsEvery(0, 20000, 2000);
  check('3. no ping clock known yet: not carried (the old rule: rejoin)', !thawCarried(0, 20000, pings, OFF, false));
  check('3. a gap of nothing (or backwards): not carried', !thawCarried(5000, 5000, pings, OFF, true) && !thawCarried(6000, 5000, pings, OFF, true));
  check('3. no list, or a bad offset: not carried', !thawCarried(0, 20000, null, OFF, true) && !thawCarried(0, 20000, pings, NaN, true));
}

// ── 4. the worker's times are mapped onto the page's ──
{
  const from = 50000, to = from + 10000;
  const pings = pingsEvery(from, to, 2000);
  check('4. read with the right offset: carried', thawCarried(from, to, pings, OFF, true));
  check('4. read as if the clocks agreed (offset 0): none of them falls in the gap', !thawCarried(from, to, pings, 0, true));
  const outside = [from - 1 + OFF, from + OFF, to + 1 + OFF, to + 5000 + OFF];
  check('4. pings before the gap (or at its very start) and after it are not counted', !thawCarried(from, to, outside, OFF, true));
}

// ── 5. the count wanted ──
check('5. a ping each THAW.PING_MS, less one at an edge, at least one',
  thawPingsWanted(5001) === 1 && thawPingsWanted(7000) === 1 && thawPingsWanted(10500) === 2 && thawPingsWanted(35000) === 9 && THAW.PING_MS === 3500,
  [thawPingsWanted(5001), thawPingsWanted(7000), thawPingsWanted(10500), thawPingsWanted(35000)]);
check('5. the page waits a beat (THAW.SETTLE_MS) before judging, and keeps enough pings for a long gap',
  THAW.SETTLE_MS >= 1000 && THAW.KEEP * 2000 >= 60000, THAW);

// ── 6. wsClient.js wires it ──
{
  const src = readFileSync(new URL('../../src/networking/wsClient.js', import.meta.url), 'utf8');
  check('6. it imports the rule', /import \{ THAW, thawCarried \} from '@\/game\/thawCarried\.js'/.test(src));
  check('6. each ping\'s worker time is kept (at most THAW.KEEP)', /_thawPings\.push\(Number\(msg\.ts\)\);\s*if \(_thawPings\.length > THAW\.KEEP\) _thawPings\.shift\(\);/.test(src));
  check('6. a gap over RESYNC_AWAY_MS is noted with the clock as known then, not rejoined at once',
    /_thawPending = \{ from: now - gap, to: now, gap: gap, off: workerClock\.offset\(\), known: workerClock\.known\(\) \};/.test(src)
      && !/_resumeRecover\('thaw', gap\)/.test(src));
  check('6. ...judged a SETTLE beat later, and handed on as `carried`',
    /now - _thawPending\.to >= THAW\.SETTLE_MS/.test(src) && /thawCarried\(_tp\.from, _tp\.to, _thawPings, _tp\.off, _tp\.known\)/.test(src)
      && /_resumeRecover\('thaw', _tp\.gap, _carried\)/.test(src));
  check('6. `?thawjudge=0` (its switch row) judges nothing: every gap rejoins, as before',
    /var _carried = !sw\('thawjudge'\) && thawCarried\(/.test(src));
  check('6. only the forced rejoin is skipped for a carried gap',
    /_awayMs > RESYNC_AWAY_MS && carried === true\) \{[\s\S]{0,300}?_thawStats\.carried\+\+;[\s\S]{0,40}?\} else if \(ws\.readyState === 1 && _awayMs > RESYNC_AWAY_MS\) \{/.test(src)
      && /_forceRejoin\('resume-resync'/.test(src));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
