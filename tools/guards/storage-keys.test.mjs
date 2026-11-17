/* ═══ v2.3.5781: EVERY STORAGE PREFIX IS IN THE REGISTRY, REPO-WIDE (card U2 PR 2; CLAUDE.md §8 row "a storage key") ═══
 *
 * CLAUDE.md §8: a storage key goes in ARCHITECTURE-HANDOFF's rule-2 registry
 * table (precheck `storage-keys`).  Precheck reads only the files a branch
 * changed, and only on a laptop; the plan's rule 1 says a gate is a test
 * GitHub runs.  This runs precheck's own rule (tools/guards/lib/storageKeys.mjs:
 * one copy, precheck calls it too) over EVERY file under server/src/:
 *
 *   1. every literal `storage.put/get('<prefix>:` names a registered prefix
 *      (GameRoom's storage; the other Durable Objects' files are exempt, as
 *      in precheck).  Strict from the start (the plan's rule 3: storage keys
 *      are a set value hangs on): on main at 2026-11-17 none is unregistered;
 *   2. the scan saw the server (over 150 files, over 100 literal keys), so a
 *      moved folder or a renamed call never reads as green.
 *
 * The marks and the restore ways of the same row are storage-marks' and
 * restore's (server/test/).
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-17:
 *   server/src/farm.js: `storage.put('farm:' + pid` as `storage.put('zzfarm:' + pid` -> FAIL 1 (naming farm.js and its line)
 *   storageKeys.mjs: the walk's folder `server/src` as `server/srcx`               -> FAIL (it throws: no folder)
 */
import { storageKeyRows, serverSrcFiles } from './lib/storageKeys.mjs';

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 1500))); }
}

const files = serverSrcFiles();
const { rows, scanned, seen } = storageKeyRows(undefined, files, 'server/src');
const bad = rows.filter((r) => r.level !== 'PASS');
check(`1. every literal storage prefix in server/src/ (${seen} in ${scanned} files) is in ARCHITECTURE-HANDOFF's rule-2 table`,
  bad.length === 0, bad.map((r) => r.msg).join('\n'));
check('2. ...and the scan saw the server (over 150 files, over 100 literal keys)', scanned > 150 && seen > 100, { scanned, seen });

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
