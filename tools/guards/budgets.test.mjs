/* ═══ v2.3.5105: ONE CONTROLLER A SIGNAL, A BUDGET FOR WHAT IS SHARED (rule 6; card B PR 6) ═══
 *
 * The table is tools/guards/lib/budgets.mjs: a row a system (the system
 * map's names), what it reads, spends and controls of the seven shared
 * things (docs/BUDGETS.md part 9).  This guard:
 *
 *   1. every system has a row, and every row is a system;
 *   2. every controller's file exists and is in its row's system (the map
 *      decides: lib/systems.mjs), and every thing read or spent is one of
 *      the seven;
 *   3. FAILS A SIGNAL TWO CONTROLLERS ACT ON, unless it is one of BUDGETS
 *      part 8's sixteen (KNOWN_SECOND): a census (rule 3), which lands with
 *      the sixteen and whose count only falls (KNOWN_SECOND_LINE; the
 *      gatekeeper lowers it).  A known one whose signal is down to one
 *      controller is printed as room to take it off;
 *   4. FAILS A SUM OF SPENDS OVER ITS LINE, where the thing has a line and
 *      the spends are numbers.  Today no row's spend is measured (each is
 *      null), and the guard says so: a number nobody measured is not
 *      written here (scoreboard rule: it never guesses).
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   1. delete the `vendor:` row                                        -> FAIL 1
 *   2. `c('mb', 'src/game/quests.js')` in `audio`'s controls             -> FAIL 2
 *   3. a second `c('tick-rate', 'server/src/tick.js')` in server-core     -> FAIL 3
 *      (and KNOWN_SECOND_LINE 16 -> 15                                   -> FAIL 3)
 *   4. `spends: { 'page-ms': 17 }` on `ui`                               -> FAIL 4
 *
 * Run from the repository's root: node tools/guards/budgets.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SHARED, ROWS, KNOWN_SECOND, KNOWN_SECOND_LINE } from './lib/budgets.mjs';
import { SYSTEMS, ROOT, placeFiles } from './lib/systems.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

/* ── 1. a row a system ── */
{
  const systems = Object.keys(SYSTEMS), rows = Object.keys(ROWS);
  const missing = systems.filter((s) => !rows.includes(s)), extra = rows.filter((r) => !systems.includes(r));
  check(`1: every system has a row and every row is a system (${rows.length})`, missing.length === 0 && extra.length === 0, { missing, extra });
}

/* ── 2. the rows' files and things ── */
{
  const placed = placeFiles();
  const bad = [];
  for (const [sys, row] of Object.entries(ROWS)) {
    for (const t of [...row.reads, ...Object.keys(row.spends)]) if (!Object.hasOwn(SHARED, t)) bad.push(`${sys}: "${t}" is not a shared thing`);
    for (const k of row.controls) {
      if (!existsSync(join(ROOT, k.where))) { bad.push(`${sys}: ${k.where} does not exist`); continue; }
      if (!(placed.bySystem[sys] || []).includes(k.where)) bad.push(`${sys}: ${k.where} (${k.signal}) is not in ${sys}'s files`);
    }
  }
  check('2: every controller\'s file is in its row\'s system, every thing read or spent is a shared one', bad.length === 0, bad);
}

/* ── 3. one controller a signal ── */
{
  const by = new Map();
  for (const [sys, row] of Object.entries(ROWS)) for (const k of row.controls) {
    if (!by.has(k.signal)) by.set(k.signal, []);
    by.get(k.signal).push(`${sys}: ${k.where}`);
  }
  const known = new Set(KNOWN_SECOND.map((k) => k.signal));
  const second = [...by].filter(([, cs]) => cs.length > 1);
  const fresh = second.filter(([s]) => !known.has(s)).map(([s, cs]) => `${s}: ${cs.join(', ')}`);
  check(`3: no signal has a second controller beyond BUDGETS part 8's known ones (${second.length} signals controlled twice or more)`, fresh.length === 0, fresh);
  check(`3: the known second controllers only fall (${KNOWN_SECOND.length} <= ${KNOWN_SECOND_LINE})`, KNOWN_SECOND.length <= KNOWN_SECOND_LINE, KNOWN_SECOND.length);
  const room = KNOWN_SECOND.filter((k) => (by.get(k.signal) || []).length <= 1 && k.signal !== 'page-ms-line');
  if (room.length) console.log(`     (room: ${room.map((k) => '#' + k.n + ' ' + k.signal).join(', ')} down to one controller: may come off)`);
  const one = [...by].filter(([, cs]) => cs.length === 1).map(([s]) => s);
  console.log(`     signals with one controller: ${one.join(', ') || 'none'}`);
}

/* ── 4. a sum of spends over its line ── */
{
  const over = [];
  const unmeasured = [];
  for (const [thing, sh] of Object.entries(SHARED)) {
    if (sh.line === null) continue;
    let sum = 0, nums = 0, nulls = 0;
    for (const row of Object.values(ROWS)) {
      if (!Object.hasOwn(row.spends, thing)) continue;
      const v = row.spends[thing];
      if (typeof v === 'number') { sum += v; nums++; } else nulls++;
    }
    if (sum > sh.line) over.push(`${thing}: ${sum} ${sh.unit} over its line ${sh.line}`);
    if (nulls) unmeasured.push(`${thing} (${nulls} spender(s) not measured, ${nums} measured)`);
  }
  check('4: no sum of measured spends over its line', over.length === 0, over);
  if (unmeasured.length) console.log(`     not measured yet: ${unmeasured.join('; ')}`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
