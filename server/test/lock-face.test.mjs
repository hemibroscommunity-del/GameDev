/* ═══ v2.3.6551: A LOCKED BODY FACES ITS LOCK IN MODE 5 (card CT part 18; src/game/lockFace.js) ═══
 *
 *   1. MODES 1 TO 4: with the two buttons off the answer is engagedStance's,
 *      whatever the latch or the lock say;
 *   2. MODE 5: a latched lock ('active' or 'auto') on a monster faces it;
 *      idle, no lock, a lock with no ref, or a townsperson's lock does not;
 *      engaged always does;
 *   3. THE WIRING: targeting.js bodyFacesLock hands the rule engagedStance,
 *      twoButtonsLive, latchPhase and the lock, and the three facing sites
 *      (monsterCombat.js's aim, BroTown.jsx _lkFace, entityRenderer.js
 *      lockFacing) ask it, not engagedStance.
 *
 * Mutants tried by hand (v2.3.6551): `if (engaged) return false` -> FAIL 1;
 * the twoLive line out -> FAIL 1; `phase !== 'active'` alone -> FAIL 2b;
 * `!== 'auto'` alone -> FAIL 2a; the type test out -> FAIL 2d; `lock.ref`
 * out -> FAIL 2e; any site back to engagedStance -> FAIL 3.
 */
import { systemNames, findIn } from '../../tools/guards/lib/filesOf.mjs';   /* the sites, found by system (tests-by-system) */
import { facesLock } from '../../src/game/lockFace.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const MON = { type: 'monster', ref: { id: 'm1' } };
const NPC = { type: 'npc', ref: { id: 'n1' } };
const PHASES = ['idle', 'active', 'auto', undefined];
const LOCKS = [MON, NPC, null, { type: 'monster', ref: null }];

/* 1 */
{
  const bad = [];
  for (const e of [true, false]) for (const p of PHASES) for (const l of LOCKS) {
    if (facesLock(e, false, p, l) !== e) bad.push([e, p, l && l.type]);
  }
  check('1. two buttons off: exactly engagedStance', bad.length === 0, bad);
}
/* 2 */
check('2a. mode 5, active, a monster: faces', facesLock(false, true, 'active', MON) === true);
check('2b. mode 5, auto, a monster: faces', facesLock(false, true, 'auto', MON) === true);
check('2c. mode 5, idle: does not', facesLock(false, true, 'idle', MON) === false && facesLock(false, true, undefined, MON) === false);
check('2d. mode 5, a townsperson locked: does not', facesLock(false, true, 'active', NPC) === false);
check('2e. mode 5, no lock or no ref: does not', facesLock(false, true, 'active', null) === false && facesLock(false, true, 'active', { type: 'monster', ref: null }) === false);
check('2f. engaged always faces', facesLock(true, true, 'idle', null) === true);

/* 3: found by system, never by a big file's path (tests-by-system) */
const where = (re) => systemNames().flatMap((sys) => findIn(sys, re));
const has = (re, tail) => where(re).some((h) => h.file.endsWith(tail));
check('3a. bodyFacesLock hands the rule its four facts', has(/^  return facesLock\(engagedStance\(S\), twoButtonsLive\(\), latchPhase\(S\), S && S\.lockedTarget\);$/, '/targeting.js'));
check('3b. the aim: monsterCombat.js asks bodyFacesLock', has(/\(_lkMon && bodyFacesLock\(S\)\)/, '/monsterCombat.js'));
check('3c. the walk: BroTown.jsx _lkFace asks bodyFacesLock', has(/var _lkFace = bodyFacesLock\(S\);/, '/BroTown.jsx'));
check('3d. the drawn body: entityRenderer.js lockFacing asks bodyFacesLock', has(/const lockFacing = bodyFacesLock\(S\);/, '/entityRenderer.js'));

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
