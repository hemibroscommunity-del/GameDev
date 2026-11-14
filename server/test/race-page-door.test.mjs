/* ═══ v2.3.5218: THE RACE'S PAGE DOOR -- ONE WRITER OF THE PHONE'S RACE (card L PR 5) ═══
 * (docs/specs/race-door.md, "the page")
 *
 * The phone's race is one field, `S._race` (none, or its record, whose
 * `phase` goes asked, count, run, done), written only by
 * src/game/raceDoor.js raceTo, by a way of RACE_PAGE_WAYS.  Its rules are
 * game/race.js's own checks (`?racedoor=0` lifts them).  This suite:
 *
 *   1. the door's own rules: each way's phase, the record's phase its way's,
 *      an ask while live, the gun only from the countdown, a dismiss only of
 *      the card, a timeout only of an ask or a run, the switch;
 *   2. A SECOND WRITER FAILS: a write of `._race` anywhere in src/ outside
 *      raceTo, or of the race record's `.phase` in race.js; every way has
 *      its caller in race.js.  The phase table's guard reads the same off
 *      the syntax tree (tools/guards/phase-table.test.mjs §2, DOOR_SUITES);
 *   3. game/race.js ITSELF, loaded here (its `@/` imports resolved to src/):
 *      an ask, the worker's race_state, the countdown and the gun, a flag,
 *      the end card and its close; an ask unanswered; a race never heard the
 *      end of; the rejoin's forget (runResets('rejoin'));
 *   4. step 1 changes nothing: requestRace still says no while a race is on,
 *      and a race_end with no race still makes the card.
 *
 * Break proof, tried by hand: `S._race = null;` put back in dismissRace ->
 * FAIL 2 (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* the page's `@/` alias, for race.js and what it imports (vite's, in node) */
const SRC = new URL('../../src/', import.meta.url).href;
const hook = 'export async function resolve(spec, ctx, next) { if (spec.startsWith("@/")) { let u = ' + JSON.stringify(SRC)
  + ' + spec.slice(2); if (!/\\.[a-z]+$/.test(u)) u += ".js"; return next(u, ctx); } return next(spec, ctx); }';
register('data:text/javascript,' + encodeURIComponent(hook));

const { raceTo, racePhase, RACE_PAGE_WAYS } = await import(SRC + 'game/raceDoor.js');
const R = await import(SRC + 'game/race.js');
const { runResets } = await import(SRC + 'game/resetOn.js');

let clock = 1_900_000_000_000;
Date.now = () => clock;
const setSearch = (s) => { globalThis.location = { search: s }; };

/* ── 1. the door's own rules ── */
{
  check('1. the ways and their phases',
    JSON.stringify(RACE_PAGE_WAYS) === JSON.stringify({ ask: 'asked', fail: 'none', state: 'count', gun: 'run', end: 'done', dismiss: 'none', timeout: 'none', forget: 'none' }));
  setSearch('');
  const S = { _race: null };
  check('1. an ask writes its record', raceTo(S, { phase: 'asked', at: 1 }, 'ask') === true && racePhase(S) === 'asked');
  check('1. ...and a second ask while live is refused', raceTo(S, { phase: 'asked', at: 2 }, 'ask') === false && S._race.at === 1);
  check('1. a record of another way\'s phase is refused', raceTo(S, { phase: 'done' }, 'state') === false && raceTo(S, { phase: 'count' }, 'end') === false && racePhase(S) === 'asked');
  check('1. the gun only from the countdown', raceTo(S, null, 'gun') === false && racePhase(S) === 'asked');
  check('1. the worker\'s race_state: the countdown', raceTo(S, { phase: 'count', t0: 5 }, 'state') === true && racePhase(S) === 'count');
  check('1. a timeout is no end of a countdown', raceTo(S, null, 'timeout') === false && racePhase(S) === 'count');
  const rec = S._race;
  check('1. the gun: count -> run, in place (the same record)', raceTo(S, null, 'gun') === true && S._race === rec && racePhase(S) === 'run');
  check('1. a dismiss is only of the card', raceTo(S, null, 'dismiss') === false && racePhase(S) === 'run');
  check('1. the end: the card', raceTo(S, { phase: 'done', result: {} }, 'end') === true && racePhase(S) === 'done');
  check('1. ...and its close', raceTo(S, null, 'dismiss') === true && S._race === null && racePhase(S) === 'none');
  check('1. a way to none takes no record', raceTo(S, { phase: 'asked' }, 'forget') === false);
  check('1. the forget and the failed ask end any race', (raceTo(S, { phase: 'asked', at: 1 }, 'ask'), raceTo(S, null, 'fail')) === true && S._race === null
    && (raceTo(S, { phase: 'done', result: {} }, 'end'), raceTo(S, null, 'forget')) === true && S._race === null);
  check('1. an unknown way, one off the prototype, or no state is refused',
    raceTo(S, null, 'nope') === false && raceTo(S, null, 'toString') === false && raceTo(null, { phase: 'asked' }, 'ask') === false);
  setSearch('?racedoor=0');
  raceTo(S, { phase: 'asked', at: 1 }, 'ask');
  check('1. ?racedoor=0: an ask while live writes, the gun from an ask, a dismiss of a run, as the old lines would have',
    raceTo(S, { phase: 'asked', at: 3 }, 'ask') === true && S._race.at === 3 && raceTo(S, null, 'gun') === true && racePhase(S) === 'run' && raceTo(S, null, 'dismiss') === true && S._race === null);
  check('1. ...but a record still of its own way\'s phase', raceTo(S, { phase: 'done' }, 'state') === false);
  setSearch('');
}

/* ── 2. no second writer ── */
{
  const ROOT = new URL('../../', import.meta.url);
  const files = [];
  (function walk(rel) {
    for (const n of readdirSync(new URL(rel, ROOT))) {
      const r = rel + n;
      if (statSync(new URL(r, ROOT)).isDirectory()) { if (n !== 'vendor' && n !== 'node_modules') walk(r + '/'); }
      else if (/\.(js|mjs|jsx)$/.test(n)) files.push(r);
    }
  })('src/');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  const WRITE = /(?:\._race|\[\s*['"`]_race['"`]\s*\])\s*(?:\?\?|\|\||&&|\*\*|[-+*/%])?=(?!=)|delete\s+[\w$.]+\._race\b|Object\.assign\(\s*[\w$.]+\s*,[^)]*\{[^}]*\b_race\s*:/;
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!raw.includes('_race')) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'src/game/raceDoor.js') {
        if (/^export function raceTo\(S, rec, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. raceTo writes the race (none, and a record)', doorWrites === 2, doorWrites);
  check('2. no write of ._race in src/ outside raceTo', outside.length === 0, outside);
  const race = strip(readFileSync(new URL('src/game/race.js', ROOT), 'utf8'));
  check('2. race.js writes no race record\'s .phase (the gun is the door\'s)', !/\.phase\s*=(?!=)/.test(race));
  const ways = [...race.matchAll(/raceTo\(S,\s*(?:null|\{[^}]*\}),\s*'([a-z]+)'\)/g)].map((m) => m[1]).sort();
  check('2. every way has its caller in race.js (timeout twice: the ask, the run)', ways.join() === 'ask,dismiss,end,fail,forget,gun,state,timeout,timeout', ways);
}

/* ── 3 and 4. game/race.js itself ── */
{
  setSearch('');
  const sent = [];
  const S = { channel: { send(m) { sent.push(m); } }, npcs: [] };
  check('3. requestRace: the ask, and race_start sent', R.requestRace(S) === true && racePhase(S) === 'asked' && sent.some((m) => m.type === 'race_start'));
  check('4. ...a second while it is on: no (raceLive, as before)', R.requestRace(S) === false && racePhase(S) === 'asked');
  const flags = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
  R.onRaceState(S, { in: 3000, lilMs: 9000, speed: 165, flagR: 80, flags, path: flags });
  check('3. the worker\'s race_state: the countdown, the gun 3 s off', racePhase(S) === 'count' && S._race.t0 === clock + 3000 && !!S._raceLil);
  clock += 1000; R.raceTick(S, clock);
  check('3. a tick in the countdown stays in it', racePhase(S) === 'count');
  clock += 2100; R.raceTick(S, clock);
  check('3. the gun at t0: run (the same record)', racePhase(S) === 'run' && S._race.next === 0);
  R.onRaceCheckpoint(S, { i: 0 });
  check('3. a flag counts on the record (no phase)', racePhase(S) === 'run' && S._race.next === 1);
  R.onRaceEnd(S, { won: true, ms: 8000, lilMs: 9000 });
  check('3. race_end: the card (done)', racePhase(S) === 'done' && S._race.result.won === true);
  clock += 1000; R.raceTick(S, clock);
  check('3. the card stays a while', racePhase(S) === 'done');
  clock += 6000; R.raceTick(S, clock);
  check('3. ...and closes by itself (dismiss)', S._race === null);
  R.requestRace(S);
  clock += 5000; R.raceTick(S, clock);
  check('3. an ask unanswered past ASK_MS is let go (timeout)', S._race === null);
  R.requestRace(S);
  R.onRaceState(S, { in: 0, lilMs: 1000, speed: 165, flags, path: flags });
  R.raceTick(S, clock);
  clock += 1000 + 37000; R.raceTick(S, clock);
  check('3. a race never heard the end of is forgotten (timeout)', S._race === null);
  R.requestRace(S);
  R.onRaceState(S, { in: 3000, lilMs: 9000, speed: 165, flags, path: flags });
  runResets('rejoin', S);
  check('3. the rejoin forgets it (and Lil Bro\'s run)', S._race === null && S._raceLil === null);
  const T = {};
  R.onRaceEnd(T, { won: false, err: 'quest' });
  check('4. a race_end with no race still makes the card, as before', racePhase(T) === 'done' && T._race.result.err === 'quest');
  R.dismissRace(T);
  check('4. ...and closes', T._race === null);
  const U = { channel: { send() { throw new Error('closed'); } } };
  check('3. an ask that cannot be sent: none (fail)', R.requestRace(U) === false && U._race === null);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
