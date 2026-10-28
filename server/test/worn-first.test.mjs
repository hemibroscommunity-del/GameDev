/* ═══ v2.3.3742: AFTER AN EQUIP, THE SET YOU WEAR BEFORE THE SPARES ═══
 *
 * Right after the armour goes on, the first jog one way could show the plain
 * body under it for a frame or two (the trousers at the waist): the frame was
 * not baked yet.  An equip re-kicks both the worn set's prewarm and the spare
 * sets' trickle, whose jobs shared the worker turn about; now the spares wait
 * while the worn set bakes (docs/specs/worn-first.md):
 *   1. prewarmMaskedBodyFrames shuts the gate before its first bake and opens
 *      it in a finally (a throw never leaves the spares waiting for good);
 *   2. a spare set's frame waits on the gate in play, and gives up if a newer
 *      trickle has started; behind the loading screen (`fast`) it never waits;
 *   3. the gate only lets go of the promise it set (an overlapping pass cannot
 *      open another's).
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const er = readFileSync(new URL('../../src/rendering/systems/entityRenderer.js', import.meta.url), 'utf8');
const body = (sig) => { const i = er.indexOf(sig); return i < 0 ? '' : er.slice(i, er.indexOf('\n}\n', i)); };

/* ── 1. the worn pass holds the gate ── */
{
  const fn = body('export async function prewarmMaskedBodyFrames(opts) {');
  const shut = fn.indexOf('const gate = _holdSpareBakes();');
  const loop = fn.indexOf('for (const pose of PREWARM_POSES)');
  check('1a the worn prewarm shuts the gate before its first bake', shut > 0 && loop > shut, { shut, loop });
  check('1b ...and opens it in a finally, after its last job is back', /await Promise\.all\(pending\);\s*\} finally \{ gate\(\); \}/.test(fn));
}

/* ── 2. the spares wait, in play only ── */
{
  const fn = body('export async function prewarmAltWornSets(opts) {');
  check('2a a spare set\'s frame waits on the gate in play, never behind the loading screen',
    /if \(spare && !fast\) while \(_wornBakeGate\) \{ await _wornBakeGate; if \(seq !== _altPrewarmSeq\) return; \}/.test(fn));
  const wait = fn.indexOf('while (_wornBakeGate)'), bake = fn.indexOf('_prewarmBake(', wait);
  check('2b ...before it sends a bake', wait > 0 && bake > wait);
}

/* ── 3. the gate ── */
{
  const fn = body('function _holdSpareBakes() {');
  check('3a the gate lets go only of its own promise', /if \(_wornBakeGate === p\) _wornBakeGate = null;/.test(fn));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
