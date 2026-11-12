/* v2.3.4884: the party_state compare (src/game/partyEq.js) -- an identical
 * re-echo is the same, any changed field (hp, zone, leader, a member, an
 * extra like `joined`) is not. */
import { sameWire } from '../../src/game/partyEq.js';
let failures = 0, passes = 0;
function check(name, cond) { if (cond) { passes++; console.log('PASS ' + name); } else { failures++; console.log('FAIL ' + name); } }
const mk = () => ({ id: 'p1', leader: 'a', state: 'open', max: 50, members: [
  { id: 'a', name: 'A', level: 5, hp: 90, maxHp: 100, zone: 'town', away: false, dead: false },
  { id: 'b', name: 'B', level: 6, hp: 50, maxHp: 120, zone: 'town', away: false, dead: false, act: 1 }] });
check('identical copies are the same', sameWire(mk(), mk()));
let x = mk(); x.members[1].hp = 49;
check('a member hp change differs', !sameWire(mk(), x));
x = mk(); x.members[0].zone = 'fire';
check('a zone change differs', !sameWire(mk(), x));
x = mk(); x.leader = 'b';
check('a leader change differs', !sameWire(mk(), x));
x = mk(); x.members.pop();
check('a member leaving differs', !sameWire(mk(), x));
x = mk(); x.joined = 'c';
check('an extra field differs', !sameWire(mk(), x));
x = mk(); delete x.members[1].act;
check('a dropped field differs', !sameWire(mk(), x));
check('null vs object differs', !sameWire(null, mk()) && !sameWire(mk(), null));
check('array vs object differs', !sameWire([], {}));
console.log(passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
