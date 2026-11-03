/* ═══ v2.3.3879: YOUR OWN PIN ON THE MAP ═══
 * ═══ v2.3.4045: TWO PINS, BLUE AND RED, WITH A LINE TO EACH (src/game/pinSlots.js) ═══
 * The owner: "Add a line path when you drop pins on your minimap. When you
 * get near the pin (in game) make a window pop up asking if you want to remove
 * pin. A no just makes it stay up until you drop a new pin and get close to it
 * again. To turn off the pin just tap it on minimap and choose remove pin. If
 * there's already 2 pins on map ask if you want to remove one of the pins
 * (give choice of which to remove - blue or red)."
 *   1. two slots: a dropped pin fills blue then red; both up, no free slot;
 *      a drop in a full slot replaces it; lifted; per character, back after a
 *      reload, never another's;
 *   2. the old pins: v2.3.3879's purple pin read once as blue (red when the
 *      board's blue is up, dropped when both are), its key gone; the
 *      board's old record read in its colours; the new record keeps the
 *      rows where an older page reads them;
 *   3. the board's API as it was: a row in a slot that held a place, pinsOf
 *      names rows only, the same press lifts;
 *   4. "Keep" marks a pin asked, stored; a new pin in that slot is unasked;
 *   5. arriving: within 160 px after being seen past 240; a pin dropped where
 *      you stand waits until you walk off and come back; an asked one never;
 *      a board row found by its resolver; a fight is told;
 *   6. a tap on the minimap finds the pin under it (the box's scale too);
 *   7. nonsense refused, a broken store survived, a tap told from a drag,
 *      ?mappin=0;
 *   8. the ask bus: one card at a time;
 *   9. the wiring: the cards (data-esc, data-enter, swallowTapClick,
 *      deskWords), the minimap's tap, the replace card, the lines redrawn
 *      only on a change, the UI review's states, nothing sent to the worker.
 */
import { readFileSync, existsSync } from 'node:fs';
import * as D from '../../src/game/pinSlots.js';
import * as M from '../../src/game/mapPins.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const rec = (st, who) => JSON.parse(st.get('bt_pins:' + who) || 'null');

/* 1 */
{
  const st = new Map();
  const S = { myId: 'bp_a' };
  D.loadPins(S, st);
  check('1a no pins at first; blue is the free slot', D.pinsUp(S).length === 0 && D.freePinSlot(S) === 'blue');
  const at = D.dropPin(S, D.freePinSlot(S), 1000.4, 2000.6, st);
  check('1b dropped where tapped (whole px), in blue', at && at.x === 1000 && at.y === 2001 && D.pinOf(S, 'blue').at.x === 1000, at);
  check('1c red is free next', D.freePinSlot(S) === 'red');
  D.dropPin(S, D.freePinSlot(S), 50, 60, st);
  check('1d both up, blue first; no free slot (the map asks "Replace which pin?")', D.pinsUp(S).join() === 'blue,red' && D.freePinSlot(S) === null);
  const v = D.pinsVersion(S);
  D.dropPin(S, 'red', 70, 80, st);
  check('1e replacing red moves red only', D.pinOf(S, 'red').at.x === 70 && D.pinOf(S, 'blue').at.x === 1000 && D.pinsVersion(S) > v);
  check('1f kept in the store by character', (() => { const r = rec(st, 'bp_a'); return r && r.v === 2 && r.at.blue.x === 1000 && r.at.red.y === 80 && r.red === null && r.blue === null; })(), rec(st, 'bp_a'));
  const S2 = { myId: 'bp_a' };
  D.loadPins(S2, st);
  check('1g back for the same character (a reload)', D.pinOf(S2, 'blue').at.y === 2001 && D.pinOf(S2, 'red').at.x === 70);
  const So = { myId: 'bp_b' };
  D.loadPins(So, st);
  check('1h another character has none', D.pinsUp(So).length === 0);
  check('1i lifted', D.liftPin(S, 'blue', st) === true && D.pinOf(S, 'blue') === null && D.freePinSlot(S) === 'blue' && rec(st, 'bp_a').at.blue === null);
  check('1j lifting nothing says so', D.liftPin(S, 'blue', st) === false);
}
/* 2 */
{
  const st = new Map();
  st.set('bt_droppin:bp_p', JSON.stringify({ x: 500, y: 600 }));
  const S = { myId: 'bp_p' };
  D.loadPins(S, st);
  check('2a the old purple pin is the blue pin now, its key gone', D.pinOf(S, 'blue') && D.pinOf(S, 'blue').at.x === 500 && !st.has('bt_droppin:bp_p') && rec(st, 'bp_p').at.blue.y === 600);
  const st2 = new Map();
  st2.set('bt_pins:bp_q', JSON.stringify({ red: null, blue: 'arena' }));
  st2.set('bt_droppin:bp_q', JSON.stringify({ x: 7, y: 8 }));
  const S2 = { myId: 'bp_q' };
  D.loadPins(S2, st2);
  check('2b ...the red pin when the board\'s blue is up (the board\'s blue kept)', D.pinOf(S2, 'blue').id === 'arena' && D.pinOf(S2, 'red').at.x === 7 && !st2.has('bt_droppin:bp_q'));
  const st3 = new Map();
  st3.set('bt_pins:bp_r', JSON.stringify({ red: 'forge', blue: 'arena' }));
  st3.set('bt_droppin:bp_r', JSON.stringify({ x: 7, y: 8 }));
  const S3 = { myId: 'bp_r' };
  D.loadPins(S3, st3);
  check('2c ...dropped when both board pins are up', D.pinOf(S3, 'red').id === 'forge' && D.pinOf(S3, 'blue').id === 'arena' && !st3.has('bt_droppin:bp_r'));
  check('2d the new record keeps the board\'s rows where an older page reads them', rec(st2, 'bp_q').blue === 'arena' && rec(st2, 'bp_q').red === null);
  const st4 = new Map();
  st4.set('bt_droppin:bp_s', '{broken');
  const S4 = { myId: 'bp_s' };
  D.loadPins(S4, st4);
  check('2e a broken old pin is no pin, and goes', D.pinsUp(S4).length === 0 && !st4.has('bt_droppin:bp_s'));
}
/* 3 */
{
  const st = new Map();
  const S = { myId: 'bp_t' };
  M.loadPins(S, st, () => true);
  D.dropPin(S, 'red', 10, 20, st);
  check('3a pinsOf names rows only (a place is no row)', M.pinsOf(S).red === null && M.pinsOn(S, 'forge').length === 0);
  M.togglePin(S, 'red', 'forge', st);
  check('3b the board\'s Red pin replaces the dropped red', M.pinsOf(S).red === 'forge' && D.pinOf(S, 'red').at === null && D.pinOf(S, 'red').id === 'forge');
  check('3c a row is found where it stands (the resolver)', D.pinPlace(S, 'red', (id) => (id === 'forge' ? { x: 3, y: 4 } : null)).x === 3);
  M.togglePin(S, 'red', 'forge', st);
  check('3d the same press lifts it', M.pinsOf(S).red === null && D.pinOf(S, 'red') === null);
  check('3e the board\'s names are the store\'s', M.PIN_KEYS.join() === 'red,blue' && M.PIN_CSS.blue === D.PIN_CSS.blue && M.togglePin === D.togglePin);
}
/* 4 */
{
  const st = new Map();
  const S = { myId: 'bp_u' };
  D.loadPins(S, st);
  D.dropPin(S, 'blue', 100, 100, st);
  check('4a Keep marks it asked, stored', D.markPinAsked(S, 'blue', st) && D.pinOf(S, 'blue').asked && rec(st, 'bp_u').asked.blue === 1);
  const S2 = { myId: 'bp_u' };
  D.loadPins(S2, st);
  check('4b asked after a reload too', D.pinOf(S2, 'blue').asked === true);
  D.dropPin(S2, 'blue', 900, 900, st);
  check('4c a new pin in that slot is unasked', D.pinOf(S2, 'blue').asked === false && rec(st, 'bp_u').asked.blue === 0);
  check('4d nothing to mark in a free slot', D.markPinAsked(S2, 'red', st) === false);
}
/* 5 */
{
  const st = new Map();
  const S = { myId: 'bp_v' };
  D.loadPins(S, st);
  D.dropPin(S, 'blue', 1000, 1000, st);
  check('5a dropped where you stand: no ask', D.pinArrival(S, { x: 1050, y: 1000 }) === null);
  check('5b walked off: none', D.pinArrival(S, { x: 1300, y: 1000 }) === null);
  check('5c back within 160: the blue pin asks', D.pinArrival(S, { x: 1150, y: 1000 }) === 'blue');
  check('5d ...and still, until it is answered', D.pinArrival(S, { x: 1100, y: 1000 }) === 'blue');
  D.markPinAsked(S, 'blue', st);
  D.pinArrival(S, { x: 3000, y: 1000 });
  check('5e asked (Keep): never again', D.pinArrival(S, { x: 1000, y: 1000 }) === null);
  D.dropPin(S, 'red', 5000, 5000, st);
  D.pinArrival(S, { x: 1000, y: 1000 });
  check('5f a pin dropped far arms at once, and asks on arriving', D.pinArrival(S, { x: 5100, y: 5050 }) === 'red');
  check('5g between 160 and 240: no ask', D.pinArrival(S, { x: 5200, y: 5000 }) === null);
  M.togglePin(S, 'blue', 'forge', st);
  const res = (id) => (id === 'forge' ? { x: 0, y: 0 } : null);
  D.pinArrival(S, { x: 900, y: 0 }, res);
  check('5h a board row asks where its resolver finds it', D.pinArrival(S, { x: 100, y: 0 }, res) === 'blue');
  check('5i blue before red when both are reached', (() => { const s = { myId: 'bp_w' }; const m = new Map(); D.loadPins(s, m); D.dropPin(s, 'red', 10, 10, m); D.dropPin(s, 'blue', 20, 20, m); D.pinArrival(s, { x: 900, y: 900 }); return D.pinArrival(s, { x: 15, y: 15 }) === 'blue'; })());
  const now = 100000;
  check('5j a fight: a blow taken, landed or a pvp hit in the last 5 s', D.pinsFighting({ lastDamageTaken: now - 4000 }, now) && D.pinsFighting({ _dealtAt: now - 100 }, now) && D.pinsFighting({ _pvpAt: now - 1 }, now));
  check('5k ...no fight after 5 s, or none at all', !D.pinsFighting({ lastDamageTaken: now - 5001 }, now) && !D.pinsFighting({}, now) && !D.pinsFighting(null, now));
}
/* 6 */
{
  const marks = [{ color: 'blue', x: 60, y: 50, edge: false }, { color: 'red', x: 120, y: 20, edge: true }];
  check('6a a tap on a pin\'s head finds it', D.miniPinAt(marks, 60, 41) === 'blue');
  check('6b an edge pin is found on its middle', D.miniPinAt(marks, 118, 22) === 'red');
  check('6c a tap elsewhere finds none (the map opens)', D.miniPinAt(marks, 20, 80) === null && D.miniPinAt(null, 1, 1) === null && D.miniPinAt(marks, NaN, 1) === null);
  check('6d at the box\'s scale (a computer\'s twice as big)', D.miniPinAt([{ color: 'blue', x: 120, y: 100, edge: false }], 120, 76, 2) === 'blue' && D.miniPinAt([{ color: 'blue', x: 120, y: 100, edge: false }], 120, 76, 1) === null);
}
/* 7 */
{
  const st = new Map();
  const S = { myId: 'bp_c' };
  D.loadPins(S, st);
  check('7a nonsense places and colours refused', D.dropPin(S, 'blue', NaN, 1, st) === null && D.dropPin(S, 'blue', -5, 1, st) === null && D.dropPin(S, 'blue', '1', 2, st) === null && D.dropPin(S, 'blue', 1, 2e9, st) === null && D.dropPin(S, 'green', 1, 1, st) === null && D.dropPin(S, '__proto__', 1, 1, st) === null);
  st.set('bt_pins:bp_d', '{not json');
  const Sd = { myId: 'bp_d' };
  D.loadPins(Sd, st);
  check('7b a broken store reads as no pins', D.pinsUp(Sd).length === 0);
  st.set('bt_pins:bp_d2', JSON.stringify({ v: 2, red: null, blue: null, at: { blue: { x: 'a', y: 1 }, red: { x: 1, y: 3e9 } }, asked: { blue: 1 } }));
  const Sd2 = { myId: 'bp_d2' };
  D.loadPins(Sd2, st);
  check('7c a stored place that is no place is dropped', D.pinsUp(Sd2).length === 0);
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  const S3 = { myId: 'bp_e' };
  check('7d a store that throws: the page still keeps them', D.dropPin(S3, 'blue', 5, 6, bad) && D.pinOf(S3, 'blue', bad).at.x === 5 && D.liftPin(S3, 'blue', bad));
  check('7e no character: never stored', D.dropPin({ myId: '' }, 'blue', 1, 1, st) && ![...st.keys()].some((k) => k === 'bt_pins:'));
  check('7f a still, short press is a tap; a drag, a long press or nonsense is not', D.isMapTap(10, 10, 13, 12, 200) && !D.isMapTap(10, 10, 40, 10, 200) && !D.isMapTap(10, 10, 10, 10, 2000) && !D.isMapTap(10, 10, NaN, NaN, 10));
  check('7g on by default; ?mappin=0 turns it off', D.mapPinsOn('') && D.mapPinsOn('?x=1') && !D.mapPinsOn('?mappin=0'));
}
/* 8 */
{
  let n = 0;
  const off = D.pinAskSubscribe(() => { n++; });
  check('8a a card opens and says which', D.pinAskOpen('arrive', 'blue') && D.pinAskNow().kind === 'arrive' && D.pinAskNow().color === 'blue');
  check('8b one at a time: a new one takes its place', D.pinAskOpen('remove', 'red') && D.pinAskNow().kind === 'remove' && D.pinAskNow().color === 'red');
  check('8c nonsense opens none', D.pinAskOpen('other', 'red') === false && D.pinAskOpen('remove', 'green') === false);
  D.pinAskClose();
  off();
  check('8d closed; the listener heard each change', D.pinAskNow() === null && n === 3, n);
}
/* 9 */
{
  const wm = src('src/ui/WorldMapOverlay.jsx');
  check('9a the World map drops a pin on a tap, in a free slot, else asks which to replace', /isMapTap\(pr\.x, pr\.y, e\.clientX, e\.clientY/.test(wm) && /const free = freePinSlot\(S\)/.test(wm) && /dropPin\(S, free, wx, wy\)/.test(wm) && /<PinReplaceCard onPick=\{pickReplace\} onCancel=\{cancelReplace\} \/>/.test(wm));
  check('9b ...a tap on a pin lifts it; a chip for each pin, touch-action manipulation; the hint through deskWords', /liftPin\(S, hitPin\)/.test(wm) && /data-world-map-unpin=\{k\}/.test(wm) && /touchAction: 'manipulation'/.test(wm) && /deskWords\('Tap the map to drop a pin'\)/.test(wm));
  check('9c the minimap\'s tap on a pin asks to remove it, elsewhere opens the map', /miniPinAt\(mm && mm\.mapPins, e\.clientX - rect\.left, e\.clientY - rect\.top, rect\.k \|\| 1\)/.test(wm) && /pinAskOpen\('remove', c\); return;/.test(wm) && /<PinAskCard stateRef=\{stateRef\} mapOpen=\{open\} \/>/.test(wm));
  const wp = src('src/ui/worldMapPins.js');
  check('9d the World map\'s lines are dashed, in each pin\'s colour', /g\.setLineDash\(DASH\)/.test(wp) && /g\.strokeStyle = PIN_CSS\[k\]/.test(wp));
  const mm = src('src/rendering/systems/wheelMinimap.js');
  check('9e the minimap draws each pin, and redraws its lines only when they move (TRAPS §218)', /this\._mark\(x, y - \(edge \? 0 : px \/ 2 \/ SCALE\), 'mappin', PIN_COLORS\[k\], px\)/.test(mm) && /if \(pinSig !== this\._pinSig\) \{\s*const G = this\.pinLines;\s*G\.clear\(\);/.test(mm) && /PIN_ARROW_TIP/.test(mm));
  const pc = src('src/ui/PinCards.jsx');
  check('9f every card: data-esc on its ✕, data-enter on its main button, swallowTapClick, deskWords', (pc.match(/data-esc="up" data-key="Esc"/g) || []).length === 2 && /data-pin-ask-remove="" data-enter=""/.test(pc) && /data-enter=\{i === 0 \? '' : undefined\}/.test(pc) && /swallowTapClick\(e\)/.test(pc) && (pc.match(/deskWords\(/g) || []).length >= 2);
  check('9g ...never in a fight, never over another card, placed as the "Attack?" window', /pinsFighting\(S, now\)/.test(pc) && /otherCardUp\(\)/.test(pc) && /import \{ cardPlace \} from '@\/ui\/mobile\/NmlAskCard\.jsx'/.test(pc));
  const ui = src('tools/qa/ui-review/states.mjs');
  check('9h the UI review shows each card', ['world-map-pin', 'map-pin-replace', 'map-pin-arrive', 'map-pin-remove'].every((id) => ui.includes(`id: '${id}'`)));
  const dp = src('src/game/pinSlots.js').replace(/\/\*[\s\S]*?\*\//g, '');
  check('9i nothing sent to the worker; no imports', !/send\(|channel|fetch\(|WebSocket/.test(dp) && !/^\s*import /m.test(dp));
  check('9j the purple pin\'s module is gone (one store)', !existsSync(new URL('../../src/game/dropPin.js', import.meta.url)));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
