/* ═══ v2.3.5781: A STORED LOOK KEY IS RESTORED AND BLANKED ON BOTH SIDES (card U2 PR 2; CLAUDE.md §8 row "a stored look key") ═══
 *
 * CLAUDE.md §8: "a stored look key -> its restore and its blank (precheck
 * look-parity, look-blank)".  Those ran only on a laptop; the plan's rule 1
 * says a gate is a test GitHub runs.  This runs precheck's own two rules
 * (tools/guards/lib/lookKeys.mjs: one copy, precheck calls it too):
 *
 *   1. look-parity: every key the worker stores (join.js JOIN_COSMETIC_KEYS)
 *      is restored (characterRecord.js LOOK_SETTERS, or an inline
 *      rec.look.<k>) or declared in LOOK_UNRESTORED with why, and no table
 *      names a key the gate does not carry;
 *   2. look-blank: every LOOK_SETTERS key has its LOOK_BLANK and is on the
 *      worker's RECORD_LOOK_KEYS;
 *   3. both found their tables (a WARN in precheck, "could not parse", is a
 *      FAIL here), and the tables are not empty.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-17:
 *   characterRecord.js: LOOK_UNRESTORED's `eqc: ...` line taken out -> FAIL 1 (eqc stored, neither restored nor declared)
 *   characterRecord.js: LOOK_BLANK's `hw: 'none', ` taken out      -> FAIL 2 (LOOK_BLANK is missing: hw)
 *   characterRecord.js: `const LOOK_BLANK =` as `const LOOK_BLANKS =` -> FAIL 3
 */
import { lookParityRows, lookBlankRows } from './lib/lookKeys.mjs';

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 1500))); }
}

const par = lookParityRows();
const bl = lookBlankRows();
const fails = (r) => r.rows.filter((x) => x.level === 'FAIL').map((x) => x.msg).join('\n');
const warns = (r) => r.rows.filter((x) => x.level === 'WARN').map((x) => x.msg).join('\n');
check(`1. every look key the worker stores (${par.gate.length}) is restored or declared unrestored, and no table names a key the gate lacks`, !fails(par), fails(par));
check(`2. every restored look key (${bl.setters.length}) has its blank and is on the worker's RECORD_LOOK_KEYS`, !fails(bl), fails(bl));
check('3. ...both found their tables, and they are not empty', !warns(par) && !warns(bl) && par.gate.length > 20 && bl.setters.length > 10,
  [warns(par), warns(bl)].filter(Boolean).join('\n') || { gate: par.gate.length, setters: bl.setters.length });

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
