/* ═══ v2.3.5301: THE SWITCH TABLE HOLDS (grand plan step 7.1, card T PR 1) ═══
 *
 * The table is tools/guards/lib/switches.mjs; the names in the code are the
 * scanner's (tools/guards/lib/switchScan.mjs); docs/SWITCHES.md is made from
 * the table.  The rules: docs/specs/switch-table.md.  This guard holds (the
 * plan's rule 3: a census, made strict by the gatekeeper alone):
 *
 *   1. every name the scanner finds is a row, or counted as UNLISTED: the
 *      count only falls (UNLISTED_LINE);
 *   2. a read in a shape the scanner does not know is counted apart: only
 *      falls (UNKNOWN_LINE); and every excuse it keeps (DYNAMIC, NOT_ADDRESS,
 *      NOT_A_FLAG) is still found, so none excuses a new line;
 *   3. every row is still found by the scanner (a switch removed takes its
 *      row with it);
 *   4. every row has every column, each of its kind;
 *   5. no name is in two rows;
 *   6. every `system` is in card B's map;
 *   7. `born: 'unknown'` only falls (BORN_UNKNOWN_LINE);
 *   8. docs/SWITCHES.md is what the table makes.
 *
 * BREAK PROOF (rule 8), each tried by hand once, 2026-11-14:
 *   - a method `_zzz() { if (this._flagOn('zzz')) return; }` in
 *     server/src/dice.js                 -> FAIL 1 (196 unlisted; zzz no row)
 *   - `const Z = /[?&]zzz=0/.test(location.search);` at the end of
 *     src/game/dice.js                   -> FAIL 1 (196 unlisted)
 *   - `risk: ''` on the `farm` row       -> FAIL 4 (and 8)
 *   - a method `_zzk(k) { const f = this._liveFlags; return f[k + 1]; }` in
 *     server/src/dice.js                 -> FAIL 2 (a read in no known shape)
 *   - the `bosschest` row named `bosschest2`
 *                                        -> FAIL 1 (bosschest no row), FAIL 3
 *
 * Run from the repository's root:
 *   node tools/guards/switches.test.mjs              the checks
 *   node tools/guards/switches.test.mjs --write      write docs/SWITCHES.md from the table
 *   node tools/guards/switches.test.mjs --list farm  a system's rows (`unlisted`: the names with no row)
 *   node tools/guards/switches.test.mjs --where farm where the code reads a name
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SWITCHES, SIDES, KINDS, RISKS, COLUMNS } from './lib/switches.mjs';
import { census, DYNAMIC, NOT_ADDRESS, NOT_A_FLAG, ROOT } from './lib/switchScan.mjs';
import { SYSTEMS } from './lib/systems.mjs';

/* the census lines: each only falls, and only the gatekeeper lowers one */
const UNLISTED_LINE = 195;      /* the page's names, until card T's PRs 2 and 3 */
const UNKNOWN_LINE = 0;
const BORN_UNKNOWN_LINE = 0;

const PAGE = join(ROOT, 'docs/SWITCHES.md');

function rowsBySystem(rows = SWITCHES) {
  const by = new Map();
  for (const r of rows) { if (!by.has(r.system)) by.set(r.system, []); by.get(r.system).push(r); }
  return by;
}

/* ── the page: the table, by system; never where a name is read (that moves
   with every edit of a file: --where) ── */
const cell = (s) => String(s).replace(/\|/g, '\\|');
function makePage(rows = SWITCHES) {
  const L = [];
  L.push('# The switch table');
  L.push('');
  L.push('MADE by `node tools/guards/switches.test.mjs --write` from `tools/guards/lib/switches.mjs`. Never edit it by hand:');
  L.push('`tools/guards/switches.test.mjs` fails a page that is not what the table makes. The rules are');
  L.push('`docs/specs/switch-table.md` (grand plan step 7.1, card T).');
  L.push('');
  L.push('Every switch of the game, one row a name: every live flag the worker reads (set from the Test panel, `liveops.js`)');
  L.push('and every `?name=` the page reads. **Where** each is read is the scanner\'s (`tools/guards/lib/switchScan.mjs`), not');
  L.push('this page\'s: `node tools/guards/switches.test.mjs --where <name>` prints it.');
  L.push('');
  L.push('- **name**: as it is thrown. A live flag by its name (`farm`); a page switch with its `?`; a memory saver by its id');
  L.push('  (`sfxcache`: `off_sfxcache` on the worker and `?sfxcache=0` on the page are one row).');
  L.push('- **kind**: `switch` (a way of the game turned off or on), `value` (a number to try) or `lever` (a test\'s or the owner\'s tool).');
  L.push('- **born**: the change that made it (v2.3.N). **thrown**: what throws it (on the worker the value; on the page its form).');
  L.push('- **risk**: what the old way guards against: `logic`, `memory`, `chip` (`none` for a lever). **needs**: the switches it');
  L.push('  turns off with. **fallback**: the trigger that still uses its old way, or no.');
  L.push('');
  L.push('**Out of reach** (no row, said here): the QA pages (`src/*-harness.html`, `public/tools/`), the phone scenarios\' own');
  L.push('addresses (`tools/qa/`), `localStorage` toggles, and the worker\'s `env` settings. A cap is a row only where the worker');
  L.push('reads it as a flag or a comment promises it as a kill switch; any other cap\'s override is the emergency lever of');
  L.push('`docs/specs/liveops.md` ("Caps override").');
  L.push('');
  const by = rowsBySystem(rows);
  const names = [...by.keys()].sort();
  const kinds = (k) => rows.filter((r) => r.kind === k).length;
  L.push(`${rows.length} rows: ${kinds('switch')} switches, ${kinds('value')} values, ${kinds('lever')} levers, in ${names.length} systems.`);
  L.push('');
  for (const sys of names) {
    L.push(`## ${sys}`);
    L.push('');
    L.push('| name | side | kind | born | thrown | risk | needs | fallback | off |');
    L.push('|---|---|---|---|---|---|---|---|---|');
    for (const r of by.get(sys)) {
      L.push(`| \`${cell(r.name)}\` | ${r.side} | ${r.kind} | ${typeof r.born === 'number' ? 'v2.3.' + r.born : r.born} | ${cell(r.thrown)} | ${r.risk} | ${r.needs.length ? r.needs.map((n) => '`' + n + '`').join(', ') : ''} | ${cell(r.fallback)} | ${cell(r.off)} |`);
    }
    L.push('');
  }
  return L.join('\n');
}

/* ── command lines ── */
const argv = process.argv.slice(2);
await main();

async function main() {
  if (argv.includes('--write')) {
    writeFileSync(PAGE, makePage());
    console.log('wrote docs/SWITCHES.md');
    process.exit(0);
  }
  const li = argv.indexOf('--list');
  if (li >= 0) {
    const want = argv[li + 1];
    if (want === 'unlisted') {
      const { found } = await census();
      const rows = new Set(SWITCHES.map((r) => r.name));
      for (const [n, v] of found) if (!rows.has(n)) console.log(`${n}  (${v.side}) ${v.reads.map((x) => x.file + ':' + x.line).slice(0, 3).join(', ')}`);
      process.exit(0);
    }
    const rows = SWITCHES.filter((r) => r.system === want);
    if (!rows.length && !Object.hasOwn(SYSTEMS, want)) { console.error(`no system "${want}": ${Object.keys(SYSTEMS).join(', ')}, unlisted`); process.exit(2); }
    for (const r of rows) console.log(`${r.name.padEnd(22)} ${r.side.padEnd(6)} ${r.kind.padEnd(6)} ${String(r.born).padEnd(7)} ${r.risk.padEnd(6)} ${r.thrown}  -- ${r.off}`);
    process.exit(0);
  }
  const wi = argv.indexOf('--where');
  if (wi >= 0) {
    const want = argv[wi + 1];
    const { found } = await census();
    const v = found.get(want);
    if (!v) { console.error(`the scanner finds no "${want}" (a page switch is written with its ?: ?guest)`); process.exit(2); }
    for (const x of v.reads) console.log(`${x.file}:${x.line}  ${x.shape}`);
    process.exit(0);
  }
  await checks();
}

async function checks() {
  let failed = 0;
  const check = (name, ok, detail) => {
    if (!ok) failed++;
    console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
  };
  const { worker, page, found } = await census();
  const rowNames = new Set(SWITCHES.map((r) => r.name));

  /* 1. every name found is a row, or unlisted (only falls) */
  {
    const unlisted = [...found.keys()].filter((n) => !rowNames.has(n));
    const wk = unlisted.filter((n) => found.get(n).side !== 'page');
    check(`1: every name found is a row or unlisted: ${unlisted.length} unlisted, the line ${UNLISTED_LINE} (a new switch adds its row: tools/guards/lib/switches.mjs)`,
      unlisted.length <= UNLISTED_LINE, unlisted.slice(-12));
    if (unlisted.length < UNLISTED_LINE) console.log(`     (room: ${unlisted.length} under the line ${UNLISTED_LINE}; the gatekeeper may lower it)`);
    check(`1: every worker name is a row (${wk.length} not)`, wk.length === 0, wk);
  }

  /* 2. reads in no known shape (only falls), and no stale excuse */
  {
    const unknown = [...worker.unknown, ...page.unknown];
    check(`2: reads in a shape the scanner does not know: ${unknown.length}, the line ${UNKNOWN_LINE}`, unknown.length <= UNKNOWN_LINE,
      unknown.map((u) => `${u.file}:${u.line} ${u.text}`));
    const stale = [...worker.staleDynamic.map((d) => `DYNAMIC ${d.file} "${d.text}"`), ...page.staleNotAddress.map((x) => `NOT_ADDRESS ${x.name} ${x.file}`),
      ...NOT_A_FLAG.filter((x) => !worker.names.has(x.name)).map((x) => `NOT_A_FLAG ${x.name}`)];
    check(`2: every excuse the scanner keeps is still found (${DYNAMIC.length} dynamic, ${NOT_ADDRESS.length} not the address, ${NOT_A_FLAG.length} not a flag)`, stale.length === 0, stale);
  }

  /* 3. every row is still found, on its side */
  {
    const lost = SWITCHES.filter((r) => !found.has(r.name)).map((r) => r.name);
    const wrongSide = SWITCHES.filter((r) => found.has(r.name) && found.get(r.name).side !== r.side).map((r) => `${r.name}: the table says ${r.side}, the scanner ${found.get(r.name).side}`);
    check(`3: every row's name is found by the scanner (${SWITCHES.length} rows)`, lost.length === 0, lost);
    check('3: ...on the side the row says', wrongSide.length === 0, wrongSide);
  }

  /* 4. every column, each of its kind */
  {
    const bad = [];
    const str = (v) => typeof v === 'string' && v.trim().length > 0;
    for (const r of SWITCHES) {
      const why = [];
      for (const c of COLUMNS) if (!Object.hasOwn(r, c)) why.push('no ' + c);
      for (const c of Object.keys(r)) if (!COLUMNS.includes(c)) why.push('an unknown column ' + c);
      if (!str(r.name)) why.push('name');
      if (!SIDES.includes(r.side)) why.push('side');
      if (!str(r.system)) why.push('system');
      if (!KINDS.includes(r.kind)) why.push('kind');
      if (!(Number.isInteger(r.born) && r.born > 0) && r.born !== 'unknown') why.push('born');
      if (!str(r.thrown)) why.push('thrown');
      if (!RISKS.includes(r.risk)) why.push('risk');
      if ((r.kind === 'lever') !== (r.risk === 'none')) why.push('risk none is a lever\'s alone');
      if (!Array.isArray(r.needs) || !r.needs.every(str)) why.push('needs');
      if (!(r.fallback === 'no' || (str(r.fallback) && / in \S+$/.test(r.fallback)))) why.push('fallback (no, or "<trigger> in <file>")');
      if (!str(r.off)) why.push('off');
      if (why.length) bad.push(`${r.name || '?'}: ${why.join(', ')}`);
    }
    check(`4: every row has every column (${COLUMNS.join(', ')})`, bad.length === 0, bad);
  }

  /* 5. one row a name */
  {
    const seen = new Set(), twice = [];
    for (const r of SWITCHES) { if (seen.has(r.name)) twice.push(r.name); seen.add(r.name); }
    check('5: no name is in two rows', twice.length === 0, twice);
  }

  /* 6. B's systems */
  {
    const bad = SWITCHES.filter((r) => !Object.hasOwn(SYSTEMS, r.system)).map((r) => `${r.name}: ${r.system}`);
    check('6: every system is in card B\'s map (tools/guards/lib/systems.mjs)', bad.length === 0, bad);
  }

  /* 7. born unknown only falls */
  {
    const n = SWITCHES.filter((r) => r.born === 'unknown').length;
    check(`7: rows born 'unknown': ${n}, the line ${BORN_UNKNOWN_LINE}`, n <= BORN_UNKNOWN_LINE);
  }

  /* 8. the page */
  {
    const want = makePage();
    const have = existsSync(PAGE) ? readFileSync(PAGE, 'utf8') : '';
    check('8: docs/SWITCHES.md is what the table makes (node tools/guards/switches.test.mjs --write)', have === want, have ? 'stale' : 'missing');
  }

  const sw = SWITCHES.filter((r) => r.kind === 'switch').length;
  console.log(`\n${SWITCHES.length} rows (${sw} switches); ${found.size} names found.`);
  console.log(failed ? `${failed} FAILED` : 'all green');
  process.exit(failed ? 1 : 0);
}
