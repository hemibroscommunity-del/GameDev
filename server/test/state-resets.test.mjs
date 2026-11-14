/* ═══ v2.3.5203: THE STATE'S RESETS (grand plan step 5.3, step 2; card L PR 3) ═══
 * (src/game/resetOn.js; docs/specs/state-resets.md)
 *
 * A reset is registered beside its state, in its own system's file
 * (resetOn(edge, fn, system)), and the edge's ONE door runs them all: the
 * zone's is changeZone (zoneTransitions.js), on a real change of place; the
 * rejoin's is rejoinClear (rejoinSlots.js), at every state_sync; the death
 * has no one door on the page yet.  The state ledger's guard
 * (tools/guards/state-ledger.test.mjs §6) holds the ledger's lifetimes to the
 * resets by the census; this suite PLAYS them:
 *
 *   1. resetOn: a wrong call is refused and counted, never thrown (a throw at
 *      a module's top would stop the page loading); the door runs every reset
 *      of its edge in order; one that throws is counted and the next runs;
 *   2. a system's switch, `?<system>reset=0` (lower case, the hyphen
 *      dropped), turns its resets off and no other system's;
 *   3. the zone's door, changeZone, built from its own text as
 *      zone-leftovers.test does: it runs the zone's resets on a real change
 *      of place, with { from, to }, and none on a flip to the zone you are in;
 *   4. the rejoin's door, rejoinClear: it runs the rejoin's resets, at every
 *      count (an old worker's 0 included);
 *   5. EVERY RESET A LEDGER ROW NAMES (a lifetime with an edge), built from
 *      its own text: its field goes back (`value v` to v; `fn f` away from
 *      what it was), and with ITS SYSTEM'S SWITCH THROWN (the plan's rule
 *      4: its node suite run once with it thrown) the field stays as it was.
 *      A reset that needs more than the state it is handed fails here: it
 *      writes its state itself.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resetOn, runResets, resetsOn, resetStats, resetsListed, resetSwitchSystems, RESET_EDGES } from '../../src/game/resetOn.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const ROOT = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const setSearch = (q) => { globalThis.location = { search: q }; };
setSearch('');

/* the body of the block that opens at `start` (zone-leftovers.test's) */
function block(text, start) {
  const at = text.indexOf(start);
  if (at < 0) return null;
  const open = text.indexOf('{', at + start.length - 1);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) return text.slice(open + 1, i); }
  }
  return null;
}

/* ── 1. the door's own rules ── */
{
  const refused0 = resetStats.refused;
  const r1 = resetOn('dawn', function t1() {}, 'audio');
  const r2 = resetOn('zone', 'not a function', 'audio');
  const r3 = resetOn('zone', function t3() {}, 'Not A System');
  check('1. a wrong edge, a non-function and a bad system name are refused, counted, never thrown',
    r1 === false && r2 === false && r3 === false && resetStats.refused === refused0 + 3);
  check('1. the edges are card D\'s three', RESET_EDGES.join() === 'zone,death,rejoin');
  const order = [];
  function ta(S) { order.push('a'); S.a = 0; }
  function tb() { throw new Error('boom'); }
  function tc(S) { order.push('c'); S.c = 0; }
  resetOn('death', ta, 'test-a'); resetOn('death', tb, 'test-b'); resetOn('death', tc, 'test-c');
  resetOn('death', ta, 'test-a');   /* twice: once */
  const threw0 = resetStats.threw;
  const S = { a: 1, c: 1 };
  const ran = runResets('death', S);
  check('1. the door runs its edge\'s resets in order, each once; one that throws is counted and the next runs',
    order.join() === 'a,c' && ran.join() === 'ta,tc' && S.a === 0 && S.c === 0 && resetStats.threw === threw0 + 1, { order, ran });
  check('1. another edge\'s door runs none of them', runResets('rejoin', { a: 1 }).every((n) => !['ta', 'tc'].includes(n)));
  check('1. no state, nothing run', runResets('death', null).length === 0);

  /* ── 2. the switches: each by its literal name (resetOn.js resetSwitches,
     card T's table) ── */
  const order2 = [];
  function sa(S) { order2.push('audio'); S.a = 0; }
  function sb(S) { order2.push('townsfolk'); S.b = 0; }
  resetOn('death', sa, 'audio'); resetOn('death', sb, 'townsfolk');
  setSearch('?audioreset=0');
  check('2. `?audioreset=0` turns the audio system off, and no other', resetsOn('audio') === false && resetsOn('townsfolk') === true);
  order2.length = 0;
  runResets('death', { a: 1, b: 1 });
  check('2. ...and only that system\'s resets run off: exactly one switch thrown', !order2.includes('audio') && order2.includes('townsfolk'), order2);
  setSearch('?audioreset=1');
  check('2. any other value is on', resetsOn('audio') === true);
  setSearch('?testareset=0');
  check('2. a system with no line in resetSwitches has no switch: always on', resetsOn('test-a') === true);
  setSearch('');
  globalThis.location = undefined;
  check('2. no page (node, a worker): on', resetsOn('audio') === true);
  setSearch('');
}

/* ── 3. the zone's door ── */
{
  const zt = src('src/game/zoneTransitions.js');
  const changeBody = block(zt, 'export function changeZone(S, to) {');
  check('3. changeZone calls the zone\'s resets, on a real change of place only', !!changeBody && /if \(from !== to\) runResets\('zone', S, \{ from, to \}\);/.test(changeBody));
  const changeZone = new Function('clearZoneLocalFx', 'runResets', 'return function (S, to) {' + changeBody + '};')(() => {}, runResets);
  const seen = [];
  function zoneProbe(S, info) { seen.push(info && info.from + '>' + info.to); S._probe = null; }
  resetOn('zone', zoneProbe, 'test-zone');
  const S = { currentZone: 'wheel', _probe: 1 };
  changeZone(S, 'farm_home');
  check('3. a change of place runs the zone\'s resets, with where from and where to', S._probe === null && seen.join() === 'wheel>farm_home', seen);
  S._probe = 1;
  changeZone(S, 'farm_home');
  check('3. a flip to the zone you are in runs none (what belongs to it stays)', S._probe === 1 && seen.length === 1, seen);
}

/* ── 4. the rejoin's door ── */
{
  const { rejoinClear } = await import(pathToFileURL(new URL('src/game/rejoinSlots.js', ROOT).pathname).href);
  let runs = 0;
  function rejoinProbe(S) { runs++; S._probe2 = null; }
  resetOn('rejoin', rejoinProbe, 'test-rejoin');
  const S = { _probe2: 1 };
  rejoinClear(S, 0, () => {});
  check('4. rejoinClear runs the rejoin\'s resets, an old worker\'s count 0 included', S._probe2 === null && runs === 1);
  S._probe2 = 1;
  rejoinClear(S, 2, () => {}, () => {});
  check('4. ...and at the full count', S._probe2 === null && runs === 2);
}

/* ── 5. every reset a ledger row names, played ── */
{
  /* the resets in the game's code: resetOn('<edge>', <fn>, '<system>') */
  const files = [];
  (function walk(rel) {
    for (const n of readdirSync(new URL(rel, ROOT))) {
      const r = rel + n;
      if (statSync(new URL(r, ROOT)).isDirectory()) { if (!n.startsWith('.')) walk(r + '/'); }
      else if (/\.(js|jsx|mjs)$/.test(n)) files.push(r);
    }
  })('src/');
  const calls = [];
  for (const f of files) {
    if (f === 'src/game/resetOn.js' || f.startsWith('src/state/')) continue;
    const t = src(f);
    for (const m of t.matchAll(/(?:^|[^\w$.])resetOn\(\s*'([a-z]+)'\s*,\s*([A-Za-z_$][\w$]*)\s*,\s*'([a-z-]+)'\s*\)/g)) calls.push({ file: f, edge: m[1], fn: m[2], system: m[3], text: t });
  }
  check(`5. the game registers its resets (${calls.length}: ${calls.map((c) => c.fn).join(', ')})`, calls.length >= 2);
  /* each system that registers a reset has its switch, by its literal name */
  const noSwitch = [...new Set(calls.map((c) => c.system))].filter((sys) => !resetSwitchSystems().includes(sys));
  check('5. every system that registers a reset has its switch in resetOn.js resetSwitches (and its row in card T\'s table)', noSwitch.length === 0, noSwitch);

  /* the ledger's decided rows */
  const rows = [];
  for (const n of readdirSync(new URL('src/state/', ROOT))) {
    if (!n.endsWith('.js') || n === 'phases.js') continue;
    const m = await import(pathToFileURL(new URL('src/state/' + n, ROOT).pathname).href);
    for (const r of m.ROWS || []) if (r.lifetime && r.lifetime !== 'sitting' && r.field !== undefined) rows.push(r);
  }
  /* each call's function, built from its own text: the state is all it gets */
  const built = new Map();
  for (const c of calls) {
    const head = new RegExp('(?:export\\s+)?function\\s+' + c.fn.replace(/\$/g, '\\$') + '\\s*\\(([^)]*)\\)\\s*\\{');
    const hm = head.exec(c.text);
    const body = hm ? block(c.text.slice(hm.index), hm[0]) : null;
    let fn = null;
    try { fn = body !== null ? new Function('return function ' + c.fn + '(' + hm[1] + ') {' + body + '};')() : null; } catch (e) { fn = null; }
    check(`5. ${c.file} ${c.fn}: a named function whose text builds on its own`, typeof fn === 'function');
    if (fn) built.set(c.file + ' ' + c.fn, { ...c, fn });
  }
  const SENT = { sentinel: true };
  let played = 0;
  for (const row of rows) {
    for (const edge of row.lifetime.split('+')) {
      /* the edge's door's own list resets it (the pose's rejoin half,
         rejoinClear): played by its own suite (rejoin-resend.test) */
      const mine = [...built.values()].filter((b) => b.edge === edge && row.writers.some((w) => w.replace(/~$/, '') === b.file));
      if (!mine.length) continue;
      for (const b of mine) {
        const msgs = [];
        const make = () => ({ [row.field]: SENT, channel: { send: (m) => { msgs.push(m); return true; } } });
        const want = /^value /.test(row.reset) ? JSON.parse(row.reset.slice(6)) : undefined;
        /* on: the field goes back */
        setSearch('');
        const S = make();
        b.fn(S, edge === 'zone' ? { from: 'wheel', to: 'town' } : null);
        const back = want !== undefined ? JSON.stringify(S[row.field]) === JSON.stringify(want) : S[row.field] !== SENT;
        check(`5. ${row.field} (${row.system}, ${row.reset}): ${b.fn.name} at the ${edge} door puts it back`, back, { now: S[row.field] });
        /* thrown: the system's resets are off at the door, the field stays */
        setSearch('?' + b.system.replace(/-/g, '') + 'reset=0');
        const S2 = make();
        const k = S2[row.field];
        runResetsOnly(edge, b, S2);
        check(`5. ${row.field}: with ?${b.system.replace(/-/g, '')}reset=0 thrown it stays as it was`, S2[row.field] === k);
        setSearch('');
        played++;
        if (row.field === '_pose') check('5. the pose\'s reset is its own end, with its word to the worker (as the frame check\'s)', msgs.some((m) => m && m.type === 'pose' && m.id === null), msgs);
      }
    }
  }
  check(`5. every decided row with a reset of its own is played (${played})`, played >= 2);
}

/* the door's run of ONE reset, as runResets runs it: through the registry,
   under its system's switch */
function runResetsOnly(edge, b, S) {
  resetOn(edge, b.fn, b.system);
  const ran = runResets(edge, S, edge === 'zone' ? { from: 'wheel', to: 'town' } : null);
  return ran;
}

check('6. what is registered is listed', resetsListed().some((r) => r.fn === 'zoneProbe' && r.edge === 'zone'));

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
