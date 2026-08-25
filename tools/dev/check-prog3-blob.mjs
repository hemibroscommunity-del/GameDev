/* v2.3.1902: the trained LEVEL comes from the blob, not from caps.prog3.
 *
 * Owner, after v2.3.1901: "Nope still says lvl 0 ... Defense and crit damage
 * are a dash".  HeroExpanded prints "—" for Crit Dmg and Defense on exactly
 * one condition — prog3Live false — so that session had the CAP off while the
 * blob still carried prog3.sk.  v2.3.1901 gated the stat screen on prog3Live,
 * so it fell straight back to the zeroed legacy weaponSkills map: the fix
 * could not reach the person who reported the bug.
 *
 * A unit check rather than a browser one, deliberately: _enabled is module
 * private and nothing exposes a setter to the page, so an in-page "flip the
 * cap" test would be flipping nothing and asserting against a state it never
 * produced.  Here the flip is real.
 */
import { setProg3Enabled, prog3Live, prog3HasSkills, prog3SkillLevel } from '../../src/data/prog3.js';

let fails = 0;
const ok = (name, cond, detail) => {
  if (cond) { console.log('PASS ' + name); return; }
  fails++; console.log('FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : ''));
};

const blob = { prog3: { sk: { sword: { level: 1, xp: 0 }, bow: { level: 1, xp: 0 }, staff: { level: 1, xp: 0 } } } };
const legacyOnly = { weaponSkills: { sword: { level: 0, xp: 0 } } };

setProg3Enabled(true);
ok('cap ON: prog3Live true for a blob with skills', prog3Live(blob) === true);
ok('cap ON: prog3HasSkills true', prog3HasSkills(blob) === true);

setProg3Enabled(false);
ok('cap OFF: prog3Live goes false (the math/messages gate still works)',
  prog3Live(blob) === false);
ok('cap OFF: prog3HasSkills STAYS true — the level is in the blob either way',
  prog3HasSkills(blob) === true);
ok('cap OFF: the level still reads 1, not 0',
  prog3SkillLevel(blob, 'sword') === 1, prog3SkillLevel(blob, 'sword'));

ok('a character with NO prog3 blob is not claimed by prog3HasSkills',
  prog3HasSkills(legacyOnly) === false);
ok('...nor is a null rpg', prog3HasSkills(null) === false);

setProg3Enabled(true);   /* leave the module as we found it */
console.log(fails ? `\n${fails} FAILED` : '\nprog3-blob: ALL PASS');
process.exit(fails ? 1 : 0);
