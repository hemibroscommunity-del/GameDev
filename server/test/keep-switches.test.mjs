/* ═══ v2.3.3888: THE ADDRESS'S SWITCHES KEPT THROUGH THE DOOR ═══
 * (src/ui/keepSwitches.js) The game's own reloads kept only ?guest=1, so a
 * switch the owner typed was gone once a character was picked.
 *   1. the switches ride along, bare ones bare, guest among them;
 *   2. the door's own words never ride along; a reload's own word comes first;
 *   3. every reload uses it: Continue's resume, the list's pick, Create new,
 *      typing a key, logging out.
 */
import { readFileSync } from 'node:fs';
import { keptQuery, DOOR_WORDS } from '../../src/ui/keepSwitches.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

check('1a nothing typed: nothing carried', keptQuery('') === '' && keptQuery('?') === '');
check('1b a switch rides along', keptQuery('?lookpalette=0') === '?lookpalette=0', keptQuery('?lookpalette=0'));
check('1c a bare switch stays bare', keptQuery('?headframes&onebatch=0') === '?headframes&onebatch=0', keptQuery('?headframes&onebatch=0'));
check('1d guest rides along as before', keptQuery('?guest=1&mappin=0') === '?guest=1&mappin=0');
check('2a the door\'s own words never ride along', keptQuery('?noresume=1&login=1&mappin=0&create=1&play=1') === '?mappin=0', keptQuery('?noresume=1&login=1&mappin=0&create=1&play=1'));
check('2b a reload\'s own word comes first, the switches after', keptQuery('?guest=1&mappin=0', [['create', '1']]) === '?create=1&guest=1&mappin=0', keptQuery('?guest=1&mappin=0', [['create', '1']]));
check('2c logging out: its two words and the switches', keptQuery('?mappin=0', [['noresume', '1'], ['login', '1']]) === '?noresume=1&login=1&mappin=0');
check('2d the door\'s words are the four', DOOR_WORDS.join(',') === 'create,login,noresume,play');
{
  const bt = src('src/ui/BroTown.jsx'), ga = src('src/ui/GameApp.jsx'), ix = src('src/networking/index.js');
  check('3a Continue\'s resume keeps them', /window\.location\.replace\(window\.location\.pathname \+ keptQuery\(\)\)/.test(bt));
  check('3b the list\'s pick keeps them', /var _gp = '\/' \+ keptQuery\(\);/.test(bt));
  check('3c Create new keeps them', /'\/' \+ keptQuery\(undefined, \[\['create', '1'\]\]\)/.test(bt));
  check('3d typing a key keeps them', /window\.location\.replace\(window\.location\.pathname \+ keptQuery\(\)\)/.test(ix));
  check('3e logging out keeps them', /'\/' \+ keptQuery\(undefined, \[\['noresume', '1'\], \['login', '1'\]\]\)/.test(ga));
  check('3f no reload builds a guest-only address any more', !/\? '\/\?guest=1' : '\/'/.test(bt) && !/'\/\?create=1' \+ _g/.test(bt) && !/`\/\?noresume=1&login=1\$\{guest\}`/.test(ga));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
