/* ═══ v2.3.3879: YOUR OWN PIN ON THE MAP (src/game/dropPin.js) ═══
 * The owner: "add the ability to drop a pin to the map for where you want to
 * go ... You just need to also have an easy way to remove it afterwards".
 *   1. dropped, moved and lifted; kept per character in the store, back
 *      for the same character, never another's;
 *   2. nonsense places refused; a broken store is survived;
 *   3. a tap is a short press that hardly moved, a drag is not;
 *   4. ?mappin=0 turns it off;
 *   5. the wiring: the World map drops and lifts it on a tap and offers
 *      "Remove pin"; the minimap draws it; nothing is sent to the worker.
 */
import { readFileSync } from 'node:fs';
import * as D from '../../src/game/dropPin.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* 1 */
{
  const st = new Map();
  const S = { myId: 'bp_a' };
  check('1a no pin at first', D.dropPinAt(S, st) === null);
  const at = D.setDropPin(S, 1000.4, 2000.6, st);
  check('1b dropped where tapped (whole px)', at && at.x === 1000 && at.y === 2001, at);
  check('1c kept in the store by character', st.get('bt_droppin:bp_a') === JSON.stringify({ x: 1000, y: 2001 }));
  D.setDropPin(S, 50, 60, st);
  check('1d a second tap moves it', D.dropPinAt(S, st).x === 50);
  const S2 = { myId: 'bp_a' };
  check('1e back for the same character (a reload)', D.dropPinAt(S2, st) && D.dropPinAt(S2, st).y === 60);
  check('1f another character has none', D.dropPinAt({ myId: 'bp_b' }, st) === null);
  const v = D.dropPinVersion(S);
  check('1g lifted', D.clearDropPin(S, st) === true && D.dropPinAt(S, st) === null && !st.has('bt_droppin:bp_a') && D.dropPinVersion(S) > v);
  check('1h lifting nothing says so', D.clearDropPin(S, st) === false);
}
/* 2 */
{
  const st = new Map();
  const S = { myId: 'bp_c' };
  check('2a nonsense places refused', D.setDropPin(S, NaN, 1, st) === null && D.setDropPin(S, -5, 1, st) === null && D.setDropPin(S, '1', 2, st) === null && D.setDropPin(S, 1, 2e9, st) === null);
  st.set('bt_droppin:bp_d', '{not json');
  check('2b a broken store reads as no pin', D.dropPinAt({ myId: 'bp_d' }, st) === null);
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  const S3 = { myId: 'bp_e' };
  check('2c a store that throws: the page still keeps it', D.setDropPin(S3, 5, 6, bad) && D.dropPinAt(S3, bad).x === 5 && D.clearDropPin(S3, bad));
  check('2d no character: never stored', D.setDropPin({ myId: '' }, 1, 1, st) && ![...st.keys()].some((k) => k === 'bt_droppin:'));
}
/* 3 */
check('3a a still, short press is a tap', D.isMapTap(10, 10, 13, 12, 200));
check('3b a drag is not', !D.isMapTap(10, 10, 40, 10, 200));
check('3c a long press is not', !D.isMapTap(10, 10, 10, 10, 2000));
check('3d nonsense is not', !D.isMapTap(10, 10, NaN, NaN, 10));
/* 4 */
check('4a on by default', D.dropPinOn('') && D.dropPinOn('?x=1'));
check('4b ?mappin=0 turns it off', !D.dropPinOn('?mappin=0'));
/* 5 */
{
  const wm = src('src/ui/WorldMapOverlay.jsx');
  check('5a the World map drops it on a tap and lifts it on a tap on it', /isMapTap\(pr\.x, pr\.y, e\.clientX, e\.clientY/.test(wm) && /setDropPin\(S, wx, wy\)/.test(wm) && /clearDropPin\(S\); setPinSet\(false\)/.test(wm));
  check('5b ...and offers "Remove pin" while one is set, touch-action manipulation', /data-world-map-unpin=""/.test(wm) && /Remove pin/.test(wm) && /touchAction: 'manipulation'/.test(wm));
  check('5c ...its hint through deskWords', /deskWords\('Tap the map to drop a pin'\)/.test(wm));
  const mm = src('src/rendering/systems/wheelMinimap.js');
  check('5d the minimap draws it, on the edge when off the box', /this\._mark\(x, y - \(edge \? 0 : px \/ 2 \/ SCALE\), 'mappin', DROP_PIN\.COLOR, px\)/.test(mm));
  const dp = src('src/game/dropPin.js');
  check('5e nothing sent to the worker', !/send\(|channel|fetch\(/.test(dp.replace(/\/\*[\s\S]*?\*\//g, '')));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
