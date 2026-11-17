/* ═══ v2.3.5532: A RELAY'S DAMAGE FLOATER IS HELD TO ITS FORM (card SEC's find, card L) ═══
 *
 * `monster_dmg_at` is a relay: another phone's words, passed on by the worker
 * as they came (claims-gain.test: it writes nothing).  The phone drew its
 * `dmg` as the floater's text and its `x`, `y` as the place, as given: a
 * sender could put any string over your world.  Now the damage is a number
 * (Number(dmg) || 0) and the place finite.  This suite runs the REAL case
 * (cut from the event switch, run in a sandbox, as duel-pending.test does):
 *   1. a number draws as before;
 *   2. a string, an object, a NaN or an Infinity draws as a number, at a
 *      finite place.
 */
import vm from 'node:vm';
import { findIn, readSystem } from '../../tools/guards/lib/filesOf.mjs';   /* the event switch found by system, never by a big file's path */

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}

/* the event switch: the wire system's one file holding the case */
const hits = findIn('wire', /case 'monster_dmg_at':/);
check('0. one file of the wire system handles the relay', hits.length === 1, hits.map((h) => h.file));
const ge = hits.length ? readSystem('wire').get(hits[0].file) : '';
const at = ge.indexOf("case 'monster_dmg_at':");
const end = ge.indexOf("case '", at + 20);
const body = at > 0 && end > at ? ge.slice(at, end) : '';
check('0. the case is found', body.length > 100);

const drawn = [];
const ctx = vm.createContext({
  Number, String,
  _peerInZone: () => true,
  peerDmgKey: (a, x, y) => x + ':' + y,
  enqueuePeerDamage: (S, key, f) => drawn.push({ key, ...f }),
  DMG_CRIT_COLOR: '#f00',
});
const run = vm.runInContext(`(function (payload, S) { switch ('monster_dmg_at') { ${body} } })`, ctx);
const S = { myId: 'me' };
const draw = (p) => { drawn.length = 0; run(Object.assign({ id: 'them' }, p), S); return drawn[0]; };

{
  const d = draw({ x: 100, y: 200, dmg: 12 });
  check('1. a number draws as before', d && d.text === '-12' && d.x === 100 && d.y === 180, d);
}
{
  const bad = [
    { x: 'a<b>', y: {}, dmg: 'FREE GOLD http://x' },
    { x: NaN, y: Infinity, dmg: { toString: () => 'hi' } },
    { x: '50', y: '60', dmg: '7' },
  ];
  const out = bad.map(draw);
  check('2. a string damage draws as a number (0 when it is none)', out[0].text === '-0' && out[1].text === '-0' && out[2].text === '-7', out.map((o) => o.text));
  check('2. the place is always a finite number', out.every((o) => Number.isFinite(o.x) && Number.isFinite(o.y)), out.map((o) => [o.x, o.y]));
  check('2. ...a numeric string still lands where it says', out[2].x === 50 && out[2].y === 40, out[2]);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
