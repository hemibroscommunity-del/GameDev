/* ═══ v2.3.6101: THE CAPS' OLD WAYS ONLY FALL (card CAP PR 2; grand plan step 7.5, rule 3) ═══
 *
 * A cap keeps the page's old way for a worker without it.  The census
 * (docs/plan/census/caps.md, written by tools/dev/caps-census.mjs) lists every
 * cap whose old page way is still there (its `old way` column, `yes`): a cap
 * read on the page that is not a count.  Step 7.5 takes them out, in 7.3's
 * batches, so that number may only fall.  This guard holds it:
 *
 *   1. the census lists its old ways at all (more than 100: a census that
 *      went missing or a table that changed its form must never read as
 *      "nothing to hold, green");
 *   2. the page's own scan (the generator's scanner, no git) found the
 *      page's reads (more than 100);
 *   3. every cap whose old page way is there NOW is one the census lists,
 *      so their number never grows past the census's.  A new cap is still
 *      born as today (either side ships first): its own old way is listed by
 *      re-running the generator in the same PR;
 *   4. the break proof, run every time: a fabricated extra read of a cap
 *      the census does not list as an old way fails check 3's rule.
 *
 * Where the number FALLS (an old way taken out), nothing fails here: the
 * census is re-written in that PR (`node tools/dev/caps-census.mjs`; its
 * `--check` says when the file is out of date, and needs git's whole
 * history for the births, so it is not run here).
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-18:
 *   src/: a line `S._serverCaps.arena` added to any page file -> FAIL 3
 *     (naming arena and the command to re-run)
 *   docs/plan/census/caps.md: one `| yes |` row's last cell made `no` -> FAIL 3
 *   check 4 runs the first of those on a fabricated file, every run.
 *
 * Run from the repository's root: node tools/guards/caps-census.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { capGates, pageReads, oldWays, censusOldWays, COUNTS, CENSUS } from '../dev/caps-census.mjs';

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 2000))); }
}

const RERUN = 'node tools/dev/caps-census.mjs';

/* The rule: the old ways there now against the census's list. */
export function judge(live, listed) {
  const known = new Set(listed);
  const extra = live.filter((c) => !known.has(c));
  return { ok: extra.length === 0 && live.length <= listed.length, extra };
}

const gates = capGates();
const reads = pageReads(undefined, gates);
const live = oldWays(reads, gates);
let listed = [];
try { listed = censusOldWays(); } catch (e) { listed = []; }

check(`1. the census (${CENSUS}) lists the caps whose old page way is there (more than 100)`,
  listed.length > 100, listed.length);
const nReads = [...reads.values()].reduce((s, r) => s + r.length, 0);
check(`2. the scan found the page's reads of caps (more than 100)`, nReads > 100, nReads);

{
  const j = judge(live, listed);
  const where = (c) => (reads.get(c) || []).slice(0, 3).map((x) => `${x.file}:${x.line}`).join(', ');
  check(`3. the caps whose old page way is there (${live.length}) are all on the census (${listed.length}): the count only falls`,
    j.ok,
    `${j.extra.length} cap(s) read on the page are not listed as an old way in ${CENSUS}:\n`
    + j.extra.map((c) => `       ${c}  (${where(c)})`).join('\n')
    + `\n     A new cap is born as before (either side ships first); list its old way: run  ${RERUN}`
    + `\n     (it needs git's whole history: git fetch --unshallow) and commit ${CENSUS} in the same PR.`);
}

{
  /* a cap the census does not list as an old way: one in CAP_GATES not read
     on the page, else a name no cap has */
  const known = new Set(listed);
  const victim = gates.find((c) => !known.has(c) && !COUNTS[c]) || 'fabricatedCap';
  const fake = pageReads(undefined, gates, { 'src/fabricated.js': `export const x = S._serverCaps.${victim};\n` });
  const merged = new Map(reads);
  for (const [c, r] of fake) merged.set(c, [...(merged.get(c) || []), ...r]);
  const j = judge(oldWays(merged, gates), listed);
  check(`4. break proof: a fabricated read of \`${victim}\` fails rule 3, naming it`,
    !j.ok && j.extra.includes(victim), j);
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
