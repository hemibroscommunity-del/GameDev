/* ═══ v2.3.3825: NO MAN'S LAND EXPLAINED BEFORE YOU STEP IN, ONCE ═══
 * (src/game/nmlExplainOnce.js)
 *
 * A judge died reading No man's land's explainer among the first quest's
 * slimes.  Now it comes up by itself once per character on the safe ground
 * as you near the line, and a hit while it is open closes it.
 *
 *   1. the line: the safe ground's edge (SAFE_R) against a worker with
 *      caps.nmlnear (tier 1), the next tier's start against an older one --
 *      on both Wheels -- and No man's land's own level is 0 just inside it
 *      and 1 just past it (the plan's arithmetic, never a coordinate);
 *   2. "near": inside the line, within NEAR px of it -- never past it, never
 *      deep in town, never a nonsense spot;
 *   3. once per character: told is remembered by id (the browser's store,
 *      and the page's own when the browser keeps nothing), per character;
 *   4. due only in the Wheel, live, alive, with nothing else open, near the
 *      line, and not yet told;
 *   5. a hit while it is open: HP below what it was when it opened;
 *   6. the wiring, read from the source: the badge's clock opens it with its
 *      lead line and marks it told, closes it on a hit; every explainer is
 *      marked `nml`.
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');
const E = await import('../../src/game/nmlExplainOnce.js');
const R = await import('../../src/data/noMansLandRings.js');

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };

/* ── 1. the line ── */
for (const long of [1, 5]) {
  const C = R.NML_CENTRES[long];
  const L1 = E.nmlLineR(long, 1), L2 = E.nmlLineR(long, 2);
  check(`1a (Wheel x${long}) tier 1's line is the safe ground's edge`, L1 === R.NML.SAFE_R, L1);
  check(`1b (Wheel x${long}) an older worker's is the second tier's start`, L2 === R.NML.HUB + R.NML.TIER * long, L2);
  for (const [first, Lr] of [[1, L1], [2, L2]]) {
    const inside = R.nmlLevelAt('wheel', C[0] + Lr - 2, C[1], long, first), past = R.nmlLevelAt('wheel', C[0] + Lr + 2, C[1], long, first);
    check(`1c (Wheel x${long}, first ${first}) No man's land is 0 just inside the line and 1 just past it`, inside === 0 && past === 1, { inside, past });
  }
}

/* ── 2. near ── */
{
  const C = R.NML_CENTRES[5], L = E.nmlLineR(5, 1), N = E.NML_EXPLAIN.NEAR;
  check('2a within NEAR px inside the line: near', E.nearNmlLine(C[0] + L - 10, C[1], 5, 1) && E.nearNmlLine(C[0], C[1] - (L - N + 1), 5, 1));
  check('2b past the line: not (you are in it)', !E.nearNmlLine(C[0] + L + 1, C[1], 5, 1));
  check('2c deeper in town than NEAR: not', !E.nearNmlLine(C[0] + L - N - 5, C[1], 5, 1) && !E.nearNmlLine(C[0], C[1], 5, 1));
  check('2d a nonsense spot: not', !E.nearNmlLine(NaN, 1, 5, 1) && !E.nearNmlLine('1', 2, 5, 1) && !E.nearNmlLine(undefined, undefined));
}

/* ── 3. once per character ── */
{
  const st = mem();
  check('3a not yet told', !E.nmlToldAlready('bp_a', st));
  E.nmlMarkTold('bp_a', st);
  check('3b told, remembered by id', E.nmlToldAlready('bp_a', st) && st.m.get(E.NML_EXPLAIN.KEY + 'bp_a') === '1');
  check('3c another character is not told', !E.nmlToldAlready('bp_b', st));
  check('3d the page remembers even with no store', E.nmlToldAlready('bp_a', null));
  E._nmlForget('bp_a', st);
  check('3e forgotten (a new phone)', !E.nmlToldAlready('bp_a', st));
  check('3f no character yet: never told to nobody', E.nmlToldAlready('', st) && E.nmlToldAlready(null, st));
  const bad = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
  E.nmlMarkTold('bp_c', bad);
  check('3g a store that throws: the page still remembers', E.nmlToldAlready('bp_c', bad));
}

/* ── 4. due ── */
{
  const C = R.NML_CENTRES[5], L = E.nmlLineR(5, 1);
  const st = mem();
  const w = (o) => ({ live: true, inWheel: true, dying: false, open: false, x: C[0] + L - 50, y: C[1], long: 5, first: 1, id: 'bp_d', store: st, ...o });
  check('4a near the line, not told: due', E.nmlExplainDue(w({})));
  check('4b not live / not in the Wheel / dying / something open: not due',
    !E.nmlExplainDue(w({ live: false })) && !E.nmlExplainDue(w({ inWheel: false })) && !E.nmlExplainDue(w({ dying: true })) && !E.nmlExplainDue(w({ open: true })));
  check('4c in town or past the line: not due', !E.nmlExplainDue(w({ x: C[0] })) && !E.nmlExplainDue(w({ x: C[0] + L + 30 })));
  E.nmlMarkTold('bp_d', st);
  check('4d told: never again', !E.nmlExplainDue(w({})));
  check('4e no state: not due', !E.nmlExplainDue(null));
}

/* ── 5. a hit ── */
check('5a HP below what it was: a hit', E.nmlExplainHit(120, 110));
check('5b the same, or healed: not', !E.nmlExplainHit(120, 120) && !E.nmlExplainHit(120, 130));
check('5c no number: not', !E.nmlExplainHit(null, 10) && !E.nmlExplainHit(10, undefined));

/* ── 6. the wiring ── */
{
  const b = src('src/ui/mobile/NmlBadge.jsx');
  check('6a the badge\'s clock opens it once near the line, with its lead line, and marks it told',
    /nmlExplainDue\(\{/.test(b) && /nmlMarkTold\(S\.myId\)/.test(b) && /openNmlInfo\(S, 1, \{ lead: /.test(b));
  check('6b ...and closes it on a hit', /nmlExplainHit\(openHp, hp\)\) \{ infoPopupBus\.close\(\)/.test(b));
  check('6c every explainer is marked nml, and the lead shows over the rules', /nml: true,/.test(b) && /data-nml-lead=""/.test(b));
  check('6d the rule module reads the rings by a relative path (node runs it)', /from '\.\.\/data\/noMansLandRings\.js'/.test(src('src/game/nmlExplainOnce.js')));
  check('6e QA pages hold it back unless a scenario asks (the harness\'s nmlOnce, as the chest\'s window); mp-nmlonce asks',
    /window\.__btNoNmlOnce/.test(b) && /if \(!nmlOnce\) await page\.addInitScript\(\(\) => \{ window\.__btNoNmlOnce = true; \}\)/.test(src('tools/qa/mp/harness.mjs'))
      && /nmlOnce: true/.test(src('tools/qa/mp/mp-nmlonce.mjs')));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
