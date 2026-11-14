/* ═══ v2.3.5202: THE PHASE TABLE, HELD (grand plan step 5.3b; card L PR 2) ═══
 *
 * The owner, 2026-11-13: every implicit state machine explicit, through one
 * door.  src/state/phases.js is the table: one row a state machine a side
 * (the worker, the page), with its one field, its states, its one transition
 * function, what clears it, what a rejoin re-sends, and whether it is a
 * `door` today (one field, one function, and something that fails a second
 * writer) or `todo` (today's fields and writers, read from the code).  The
 * spec is docs/specs/phase-table.md.  This guard holds it:
 *
 *   1. every row has its columns, each from its closed list; no machine is
 *      two rows on one side; every name the plan and SHAPES part 5 give is a
 *      row (MUST, below);
 *   2. a `door` row's field has no writer outside its function.  Where the
 *      door's OWN suite holds that today (life-door, zone-leftovers), this
 *      guard checks only that the suite names the field and the function, and
 *      never writes a second rule that could disagree.  Where nothing holds it
 *      (the session's phase, a monster's life), the row's `scan` is the rule
 *      and this guard runs it: every write of the field in the side's code is
 *      in one of the row's places (a write that is not the machine's field is
 *      in the row's `besides`, with why; a stale one fails);
 *   3. every slot of REJOIN_SLOTS (src/game/rejoinSlots.js) is named by a row,
 *      and every slot a row names is in REJOIN_SLOTS;
 *   4. every machine name in the wire table's `phase` column
 *      (server/src/wire/columns.js, card N's, and every row's demands) is a
 *      row;
 *   5. every ledger row with D's `phase` mark (src/state/<system>.js, card U's)
 *      is a page row's field (or one of a todo row's fields), or is listed in
 *      NOT_A_MACHINE with why; a page field a row names is a ledger row;
 *   6. a `todo` row's worker fields name files and functions that exist (each
 *      writer's file holds the field's name and the function's), and every
 *      row's `clears` names a function its file holds;
 *   7. the `todo` rows are a census (the plan's rule 3): their count may only
 *      fall.  TODO_LINE is the gatekeeper's alone to lower, and to make
 *      strict; nobody raises it.  A row turns `door` in its machine's PR
 *      (card L PR 5, one machine a PR).
 *
 * BREAK PROOF (the plan's rule 8), each tried by hand, 2026-11-14:
 *   1. a second writer of `ps.life` (`...playerState.x.life = 'alive';` in
 *      server/src/duel.js _resolveDuel) -> life-door.test FAIL 2, the suite
 *      the `life` row names.  This guard holds the row to that suite: the
 *      row's `fn` renamed `_lifeTo2`                        -> FAIL 2 here
 *   2. a second writer of `session.phase` (`_s.phase = 'joined';` in
 *      server/src/duel.js _resolveDuel)                    -> FAIL 2 (its scan)
 *   3. `Object.freeze({ slot: 'fish', since: 0, clears: ['rejoinClear'],
 *      resend: null, why: 'x' })` added to REJOIN_SLOTS      -> FAIL 3
 *   4. a ledger phase with no row: the `_facing` entry taken off
 *      NOT_A_MACHINE                                       -> FAIL 5
 *   5. the `race` worker row deleted -> FAIL 1 (4 stays green: the page's
 *      `race` row still carries the wire's name)
 *   6. TODO_LINE one under the count (30)                   -> FAIL 7
 *
 * Run from the repository's root: node tools/guards/phase-table.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './lib/systems.mjs';

/* Set 2026-11-14 at its first count.  Only the gatekeeper lowers it. */
export const TODO_LINE = 31;

/* the machines every side must have a row for: SHAPES part 5's names and
   step 5.3b's list (the plan's own `dungeon`, `connection`, `loading`,
   `window`, and a monster's life).  `worker` / `page` / `both`. */
const MUST = Object.freeze({
  session: 'worker', life: 'both', zone: 'both', monster: 'both',
  fight: 'both', duel: 'both', trade: 'both', party: 'both', ride: 'both',
  harvest: 'both', cook: 'both', guard: 'both', pose: 'both', race: 'both',
  arena: 'both', fishing: 'both', dungeon: 'both',
  connection: 'page', loading: 'page', window: 'page',
});
const SIDES = ['worker', 'page'];
const STATUS = ['door', 'todo'];
/* the edges a machine is cleared on: card D's three (the page's zone, death
   and rejoin), the worker's leave, its own end, or never */
const EDGES = ['zone', 'death', 'rejoin', 'leave', 'end', 'never'];
const SRC_OF = { worker: 'server/src', page: 'src' };

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 1200)));
};
const info = (s) => console.log('     ' + s);
const str = (x) => typeof x === 'string' && x.length > 0;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

const T = await import(pathToFileURL(join(ROOT, 'src/state/phases.js')).href);
const ROWS = Array.isArray(T.PHASES) ? T.PHASES : [];
const NOT_A_MACHINE = Array.isArray(T.NOT_A_MACHINE) ? T.NOT_A_MACHINE : [];

/* ── the code, comments blanked out, lines kept (life-door.test's strip) ── */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
const codeCache = new Map();
function codeOf(rel) {
  if (!codeCache.has(rel)) codeCache.set(rel, existsSync(join(ROOT, rel)) ? strip(readFileSync(join(ROOT, rel), 'utf8')) : null);
  return codeCache.get(rel);
}
function filesUnder(dir) {
  const out = [];
  const walk = (d) => {
    for (const n of readdirSync(join(ROOT, d)).sort()) {
      if (n === 'node_modules' || n.startsWith('.')) continue;
      const p = d + '/' + n;
      if (statSync(join(ROOT, p)).isDirectory()) walk(p);
      else if (/\.(js|jsx|mjs)$/.test(n)) out.push(p);
    }
  };
  walk(dir);
  return out;
}
/* the named function a line sits in: the nearest declaration above it that
   is less indented (a method, a `function`, a `const f = (...) =>`, an
   object's `f: (...) =>`).  An unnamed arrow inside is skipped, so a write
   in a callback belongs to the function around it. */
const DECL = [
  /^(\s*)(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/,
  /^(\s*)(?:static\s+)?(?:async\s+)?(?!(?:if|for|while|switch|catch|with|return|function)\b)([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/,
  /^(\s*)(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/,
  /^(\s*)([A-Za-z_$][\w$]*)\s*:\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>)/,
];
function fnAt(lines, i) {
  const ind = /^\s*/.exec(lines[i])[0].length;
  for (let j = i; j >= 0; j--) {
    for (const re of DECL) {
      const m = re.exec(lines[j]);
      if (m && (m[1].length < ind || j === i)) return m[2];
    }
  }
  return null;
}
/* "server/src/leave.js _leaveRun" -> { file, fn } */
const place = (s) => { const m = /^(\S+)\s+(\S+)$/.exec(s || ''); return m ? { file: m[1], fn: m[2] } : null; };
const has = (src, word) => new RegExp('(^|[^\\w$])' + word.replace(/[$]/g, '\\$') + '(?![\\w$])').test(src);

/* ── 1. the rows' columns ── */
const keyOf = (r) => r.name + ' (' + r.side + ')';
{
  const bad = [];
  const seen = new Set();
  for (const [i, r] of ROWS.entries()) {
    const at = `row ${i + 1}${r && r.name ? ' ' + keyOf(r) : ''}`;
    if (!r || typeof r !== 'object') { bad.push(at + ': not an object'); continue; }
    if (!str(r.name) || !/^[a-z][a-zA-Z]*$/.test(r.name)) bad.push(at + ': name');
    if (!SIDES.includes(r.side)) bad.push(at + ': side');
    if (!STATUS.includes(r.status)) bad.push(at + ': status');
    if (seen.has(keyOf(r))) bad.push(at + ': two rows for one machine on one side');
    seen.add(keyOf(r));
    if (!Array.isArray(r.states) || !r.states.length || !r.states.every(str)) bad.push(at + ': states');
    if (!str(r.what)) bad.push(at + ': what (one sentence)');
    if (!Array.isArray(r.clears) || !r.clears.length || !r.clears.every((c) => c && EDGES.includes(c.edge) && str(c.at))) bad.push(at + ': clears ({ edge, at } each, the edge one of ' + EDGES.join(' ') + ')');
    if (!(Array.isArray(r.rejoin) && r.rejoin.length && r.rejoin.every(str)) && !(typeof r.rejoin === 'string' && /^none: \S/.test(r.rejoin))) bad.push(at + ': rejoin (REJOIN_SLOTS slots, or "none: <why>")');
    if (r.status === 'door') {
      if (!str(r.field) || !str(r.fn) || !str(r.file)) bad.push(at + ': a door has its field, fn and file');
      const held = r.held || {};
      if (!str(held.suite) && !(Array.isArray(held.scan) && held.scan.length)) bad.push(at + ': a door is held by its suite or its scan');
    } else if (r.status === 'todo') {
      if (r.field !== null || r.fn !== null || r.file !== null) bad.push(at + ': a todo row has no field, fn or file yet (null)');
      if (!Array.isArray(r.today) || !r.today.length) bad.push(at + ': a todo row lists today\'s fields');
      for (const t of r.today || []) {
        if (r.side === 'page' && !(str(t.field) && /^S\./.test(t.field)) && !(str(t.variable) && str(t.file))) bad.push(at + ': a page field is `S.<name>`, or a variable and its file');
        if (r.side === 'worker' && !(str(t.field) && str(t.file) && Array.isArray(t.writers) && t.writers.length && t.writers.every((w) => place(w)))) bad.push(at + ': a worker field has its file and writers ("<file> <function>")');
      }
    }
  }
  check(`1: every row has its columns, each from its closed list (${ROWS.length} rows)`, bad.length === 0, bad);
  const missing = [];
  for (const [name, sides] of Object.entries(MUST)) {
    for (const side of sides === 'both' ? SIDES : [sides]) if (!seen.has(name + ' (' + side + ')')) missing.push(name + ' (' + side + ')');
  }
  check(`1: every machine of step 5.3b and SHAPES part 5 is a row on its sides (${Object.keys(MUST).length} machines)`, missing.length === 0, missing);
}

/* ── 2. a door's field has no writer outside its function ── */
{
  const bad = [];
  const doors = ROWS.filter((r) => r && r.status === 'door');
  for (const r of doors) {
    const fnFile = codeOf(r.file);
    if (!fnFile || !has(fnFile, r.fn)) bad.push(`${keyOf(r)}: ${r.file} has no ${r.fn}`);
    const held = r.held || {};
    const prop = String(r.field).split('.').pop();
    if (str(held.suite)) {
      /* its own suite holds it: check only that the suite names both */
      const s = existsSync(join(ROOT, held.suite)) ? readFileSync(join(ROOT, held.suite), 'utf8') : null;
      if (!s) bad.push(`${keyOf(r)}: its suite ${held.suite} is gone`);
      else if (!has(s, prop) || !has(s, r.fn)) bad.push(`${keyOf(r)}: its suite ${held.suite} does not name ${prop} and ${r.fn}`);
      if (!/^(server\/test\/[^/]+|tools\/guards\/[^/]+)\.test\.mjs$/.test(held.suite)) bad.push(`${keyOf(r)}: ${held.suite} is not a suite npm test runs`);
      continue;
    }
    /* nothing else holds it: the row's scan is the rule.  src/state/ is
       data about the code (this table, the ledgers), never code */
    const files = filesUnder(SRC_OF[r.side]).filter((f) => !f.startsWith('src/state/'));
    const besidesSeen = new Set();
    for (const sc of held.scan) {
      const re = new RegExp(sc.write, 'g');
      const allowed = (sc.at || []).map(place);
      if (!allowed.length || allowed.some((p) => !p)) { bad.push(`${keyOf(r)}: a scan's places are "<file> <function>"`); continue; }
      let hits = 0;
      for (const f of files) {
        const src = codeOf(f);
        if (!src || !re.test(src)) { re.lastIndex = 0; continue; }
        re.lastIndex = 0;
        const lines = src.split('\n');
        for (const m of src.matchAll(re)) {
          const i = src.slice(0, m.index).split('\n').length - 1;
          const fn = fnAt(lines, i);
          if (allowed.some((p) => p.file === f && p.fn === fn)) { hits++; continue; }
          const b = (held.besides || []).find((x) => x.file === f && lines[i].includes(x.text));
          if (b) { besidesSeen.add(b); continue; }
          bad.push(`${keyOf(r)}: ${f}:${i + 1} (in ${fn || 'no function'}) writes it outside ${sc.at.join(', ')}: ${lines[i].trim().slice(0, 90)}`);
        }
      }
      if (!hits) bad.push(`${keyOf(r)}: the scan /${sc.write}/ finds no write in ${sc.at.join(', ')} (a stale row)`);
    }
    for (const b of held.besides || []) if (!besidesSeen.has(b)) bad.push(`${keyOf(r)}: its besides entry ${b.file} "${b.text}" is gone (delete it)`);
    for (const b of held.born || []) {
      const p = place(b.at);
      const src = p && codeOf(p.file);
      if (!src || !src.includes(b.text) || !has(src, p.fn)) bad.push(`${keyOf(r)}: its birth ${b.at} "${b.text}" is gone`);
    }
  }
  check(`2: a door's field has no writer outside its function (${doors.length} doors: ${doors.map(keyOf).join(', ')})`, bad.length === 0, bad);
}

/* ── 3. REJOIN_SLOTS, both ways ── */
{
  const { REJOIN_SLOTS } = await import(pathToFileURL(join(ROOT, 'src/game/rejoinSlots.js')).href);
  const slots = new Set(REJOIN_SLOTS.map((s) => s.slot));
  const named = new Set();
  const unknown = [];
  for (const r of ROWS) if (Array.isArray(r.rejoin)) for (const s of r.rejoin) { named.add(s); if (!slots.has(s)) unknown.push(`${keyOf(r)}: ${s}`); }
  const orphan = [...slots].filter((s) => !named.has(s));
  check(`3: every slot of REJOIN_SLOTS is named by a row (${slots.size} slots)`, orphan.length === 0, orphan);
  check('3: every slot a row names is in REJOIN_SLOTS', unknown.length === 0, unknown);
}

/* ── 4. the wire table's phase column ── */
{
  const { WIRE_COLUMNS } = await import(pathToFileURL(join(ROOT, 'server/src/wire/columns.js')).href);
  const P = WIRE_COLUMNS.phase;
  const names = new Set(Object.keys(P).filter((k) => k !== 'NONE' && k !== 'IMPLICIT').concat(Object.keys(P.IMPLICIT || {})));
  for (const f of ['in', 'relays', 'out', 'http']) {
    const m = await import(pathToFileURL(join(ROOT, 'server/src/wire/' + f + '.js')).href);
    for (const row of Object.values(m)[0]) for (const d of row.phase || []) if (d !== P.NONE) names.add(String(d).split(':')[0]);
  }
  const rowNames = new Set(ROWS.map((r) => r.name));
  const missing = [...names].filter((n) => !rowNames.has(n));
  check(`4: every machine the wire table's phase column names is a row (${names.size}: ${[...names].join(', ')})`, missing.length === 0, missing);
}

/* ── 5. the ledger's phase marks ── */
{
  const ledgerRows = [];
  for (const n of readdirSync(join(ROOT, 'src/state')).sort()) {
    if (!n.endsWith('.js') || n === 'phases.js') continue;
    const m = await import(pathToFileURL(join(ROOT, 'src/state', n)).href);
    for (const row of m.ROWS || []) ledgerRows.push(row);
  }
  const lkey = (x) => (x.field !== undefined ? 'S.' + x.field : x.file + ' ' + x.variable);
  const ledger = new Set(ledgerRows.map(lkey));
  const pageFields = new Set();
  const notLedger = [];
  for (const r of ROWS.filter((x) => x.side === 'page')) {
    const fields = r.status === 'door' ? [{ field: r.field }] : (r.today || []);
    for (const t of fields) {
      const k = t.variable ? t.file + ' ' + t.variable : t.field;
      if (!/^S\./.test(k) && !t.variable) continue;   /* a door on a monster's own field (m.alive) is no ledger row */
      pageFields.add(k);
      if (!ledger.has(k)) notLedger.push(`${keyOf(r)}: ${k}`);
    }
  }
  const nam = new Map();
  const namBad = [];
  for (const x of NOT_A_MACHINE) {
    if (!x || !str(x.why) || !(str(x.field) || (str(x.variable) && str(x.file)))) { namBad.push(x); continue; }
    nam.set(x.field ? 'S.' + x.field : x.file + ' ' + x.variable, x);
  }
  const marked = ledgerRows.filter((x) => x.phase !== null && x.phase !== undefined).map(lkey);
  const loose = marked.filter((k) => !pageFields.has(k) && !nam.has(k));
  const stale = [...nam.keys()].filter((k) => !marked.includes(k));
  check(`5: every ledger row with D's phase mark is a row's field or NOT_A_MACHINE, with why (${marked.length} marked)`, loose.length === 0 && namBad.length === 0, { loose, namBad });
  check('5: every NOT_A_MACHINE entry is still a marked ledger row (a stale one is deleted)', stale.length === 0, stale);
  check(`5: every page field a row names is a ledger row (${pageFields.size} fields)`, notLedger.length === 0, notLedger);
}

/* ── 6. a todo row's worker writers exist ── */
{
  const bad = [];
  for (const r of ROWS.filter((x) => x.status === 'todo' && x.side === 'worker')) {
    for (const t of r.today || []) {
      const prop = String(t.field).replace(/\[.*$/, '').split('.').pop();
      const src = codeOf(t.file);
      if (!src || !has(src, prop)) bad.push(`${keyOf(r)}: ${t.file} has no ${prop}`);
      for (const w of t.writers || []) {
        const p = place(w);
        const ws = p && codeOf(p.file);
        if (!ws || !has(ws, p.fn) || !has(ws, prop)) bad.push(`${keyOf(r)}: ${w} (for ${t.field}) is not there`);
      }
    }
  }
  /* and every row's clears, both sides */
  for (const r of ROWS) for (const c of r.clears || []) {
    const p = place(c.at);
    if (!p || !(codeOf(p.file) && has(codeOf(p.file), p.fn))) bad.push(`${keyOf(r)}: clears at ${c.at}: not there`);
  }
  check('6: a todo row\'s worker fields and writers, and every row\'s clears, are where it says', bad.length === 0, bad);
}

/* ── 7. the todo count, a census ── */
{
  const todo = ROWS.filter((r) => r.status === 'todo');
  check(`7: todo rows at or under the line ${TODO_LINE} (${todo.length}; a row turns door in its machine's PR, card L PR 5)`, todo.length <= TODO_LINE);
  if (todo.length < TODO_LINE) info(`(room: ${TODO_LINE - todo.length} under the line ${TODO_LINE}; the gatekeeper may lower it)`);
  info('door: ' + ROWS.filter((r) => r.status === 'door').map(keyOf).join(', '));
}

console.log(failed ? `\n${failed} failed` : '\nall green');
process.exit(failed ? 1 : 0);
