/* THE ARMOUR YOU WEAR IS THE LAST TO GO -- v2.3.3704
 * (docs/specs/worn-bake-first.md).
 *
 * The owner: "Northwest jog has trouble loading reloading textures after
 * recovering from black screen".  The body baked under your armour is kept in
 * a cache of 900 frames, and in spare time the game bakes the sets one equip
 * away into it as well.  Those now ask for more than 900, so every spare bake
 * let go of the least recently drawn frame -- the worn set's, in a facing you
 * had not faced lately -- and that facing drew the plain body under the plate
 * while it was baked again.  The rule (src/rendering/maskedEvict.js) runs
 * here in node:
 *   1. the worn set as a key spells it;
 *   2. the frame let go of is the least recently drawn of any other armour,
 *      and of the worn set only when nothing else is held;
 *   3. replayed: a worn set baked, part of it drawn since, then three spare
 *      sets baked into a full cache -- the old rule loses the worn frames not
 *      drawn lately, the new one keeps every one;
 *   4. the wiring: _storeBake lets go by the rule, at MASKED_CAP, and the
 *      spare sets are baked only into room the cache has. */
import { readFileSync } from 'fs';
import { wornSigOf, pickEvictKey } from '../../src/rendering/maskedEvict.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const ROOT = new URL('../../', import.meta.url).pathname;

/* 1. the worn set's key */
check('1a. chest and legs: "chest:<id>,legs:<id>", the order every worn list is built in',
  wornSigOf('copperplate', 'coppergreaves') === 'chest:copperplate,legs:coppergreaves');
check('1b. one piece, or none', wornSigOf('ironplate', 'none') === 'chest:ironplate' && wornSigOf(null, 'irongreaves') === 'legs:irongreaves'
  && wornSigOf('none', 'none') === '' && wornSigOf(undefined, undefined) === '');

/* 2. which frame goes */
const W = 'chest:copperplate,legs:coppergreaves';
const k = (uid, worn, d = 6) => `${uid}|${worn}|${d}`;
check('2a. the least recently drawn frame of another set goes before any of the worn set',
  pickEvictKey([k(1, W), k(2, W), k(3, 'chest:ironplate,legs:coppergreaves'), k(4, W)], W) === k(3, 'chest:ironplate,legs:coppergreaves'));
check('2b. another player\'s frame, or an old look\'s, goes too', pickEvictKey([k(1, W), k(9, 'legs:steelgreaves')], W) === k(9, 'legs:steelgreaves'));
check('2c. one piece of the worn set is another set (exact, not a part)',
  pickEvictKey([k(1, W), k(2, 'chest:copperplate')], W) === k(2, 'chest:copperplate'));
check('2d. only the worn set held: its least recently drawn goes', pickEvictKey([k(5, W), k(6, W)], W) === k(5, W));
check('2e. nothing held: nothing to let go of', pickEvictKey([], W) === undefined);
check('2f. nothing worn: the least recently drawn of anything', pickEvictKey([k(1, W), k(2, 'chest:ironplate')], '') === k(1, W));

/* 3. replayed: the trickle into a full cache, the old rule and the new */
function replay(rule, guard) {
  const CAP = 900, cache = new Map();
  const store = (key) => {
    cache.set(key, 1);
    while (cache.size > CAP) cache.delete(rule === 'old' ? cache.keys().next().value : pickEvictKey(cache.keys(), W));
  };
  const hit = (key) => { if (cache.has(key)) { cache.delete(key); cache.set(key, 1); } };
  /* the worn set (177 frames), baked behind the loading screen */
  const worn = Array.from({ length: 177 }, (_, i) => k('w' + i, W));
  worn.forEach(store);
  /* play: the facings you jog in are drawn (refreshed); north-east and
     north-west (frames 120-176) not lately */
  for (let r = 0; r < 3; r++) for (let i = 0; i < 120; i++) hit(worn[i]);
  /* the spare sets, three of them, ~300 frames each, one bake a rendered
     frame in spare time -- and every rendered frame draws the facing you jog */
  let n = 0;
  for (const set of ['chest:ironplate,legs:coppergreaves', 'chest:copperplate,legs:irongreaves', 'chest:ironplate,legs:irongreaves']) {
    for (let i = 0; i < 300; i++) {
      hit(worn[n++ % 120]);
      const key = k('s' + i, set);
      if (guard && cache.size >= CAP && !cache.has(key)) continue;
      store(key);
    }
  }
  return { worn: worn.filter((x) => cache.has(x)).length, size: cache.size };
}
const before = replay('old', false), after = replay('new', true), ruleOnly = replay('new', false);
check(`3a. the old rule: the spare sets push out the worn frames not drawn lately, north-east and north-west (${before.worn} of 177 kept)`, before.worn === 120, before);
check(`3b. the new rule with the room check: every worn frame kept (${after.worn} of 177), the cache at its cap (${after.size})`, after.worn === 177 && after.size <= 900, after);
check(`3c. the rule alone keeps them too (${ruleOnly.worn} of 177)`, ruleOnly.worn === 177, ruleOnly);

/* 4. the wiring */
{
  const er = readFileSync(ROOT + 'src/rendering/systems/entityRenderer.js', 'utf8');
  check('4a. the renderer takes the rule from maskedEvict.js', /import \{ wornSigOf, pickEvictKey \} from '\.\.\/maskedEvict\.js'/.test(er));
  check('4b. _storeBake lets go by the rule, at MASKED_CAP (900)',
    /const MASKED_CAP = 900;/.test(er) && /while \(_maskedBodyCache\.size > MASKED_CAP\) \{\s*const k0 = _maskedEvictKey\(\);/.test(er)
    && /const _maskedEvictKey = \(\) => pickEvictKey\(_maskedBodyCache\.keys\(\), _localWornSig\(\)\);/.test(er)
    && !/while \(_maskedBodyCache\.size > 900\)/.test(er));
  check('4c. the spare sets are baked only into room the cache has',
    /const spare = set\.worn\.map\(\(w\) => w\[0\] \+ ':' \+ w\[1\]\)\.join\(','\) !== wornSig;/.test(er)
    && /if \(spare && _maskedBodyCache\.size >= MASKED_CAP && !_maskedBodyCache\.has\(_maskedKey\(tex, worn, 6\)\)\) \{ _spareSkipped\+\+; continue; \}/.test(er));
  check('4d. the worn list is built chest, then legs, everywhere the key is made', !/for \(const (_?sl|_sl) of \['legs', 'chest'\]\)/.test(er));
}

if (failures) { console.log(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nworn-bake: all pass');
