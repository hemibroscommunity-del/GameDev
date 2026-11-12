/* ═══ v2.3.4880: THE GLINT KEEPS A DRAWN PEER'S SLOTS (lightfx/glint.js) ═══
 *
 * Every armoured player on screen used to cost the glint's target build three
 * arrays, three key strings, three slot objects, a numbers object and a Map
 * each frame (docs/specs/crowd-lanes.md).  Now a peer's slots are kept and
 * filled again.  What must still hold (what is DRAWN does not change):
 *   1. the slots' content: keys, sprites, metal colour, grade look;
 *   2. a sprite hidden this frame is out of its slot this frame, back the next;
 *   3. a grade change (eqg) and an equip change show the frame they arrive;
 *   4. a player who leaves, or is not drawn (far, swimming), is dropped the
 *      same frame, and their slots are not left in the keep;
 *   5. nothing is made per frame: the same slot objects, the same arrays.
 */
import { register } from 'node:module';

/* v2.3.4880: Server CI installs only server/'s packages, so 'pixi.js' is not
   there to import (the first push of this suite failed on it).  glint.js
   reaches it for its Filter and, through sheenBatch.js, the shine batcher; the
   target build read here draws nothing.  So every name the graph imports from
   it is a do-nothing stand-in, the same here as in CI: a hook serves it before
   glint.js is loaded. */
const PIXI_NAMES = ['Filter', 'Matrix', 'Rectangle', 'Sprite', 'Texture', 'DefaultBatcher', 'ExtensionType', 'extensions',
  'Shader', 'GlProgram', 'Geometry', 'Buffer', 'BufferUsage', 'compileHighShaderGl', 'compileHighShaderGpuProgram',
  'vertexGlTemplate', 'fragmentGlTemplate', 'globalUniformsBitGl', 'colorBitGl', 'colorBit', 'roundPixelsBitGl',
  'roundPixelsBit', 'generateTextureBatchBit', 'getBatchSamplersUniformGroup', 'getMaxTexturesPerBatch', 'BatcherPipe'];
const PIXI_STUB = 'const P = new Proxy(function () {}, { get: (t, k) => (k === "prototype" ? t.prototype : (typeof k === "symbol" ? undefined : P)), apply: () => P, construct: () => ({}) });\n'
  + PIXI_NAMES.map((n) => `export const ${n} = P;`).join('\n');
register('data:text/javascript,' + encodeURIComponent(
  `export async function resolve(s, c, next) {
     if (s === 'pixi.js') return { url: 'data:text/javascript,' + encodeURIComponent(${JSON.stringify(PIXI_STUB)}), shortCircuit: true };
     return next(s, c);
   }`));
const { GlintSystem, GRADE_LOOK, METAL_SHINE } = await import('../../src/rendering/lightfx/glint.js');

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const spr = (label) => ({ visible: true, destroyed: false, label });
function peer(i, extra) {
  return {
    o: Object.assign({ zone: 'wheel', equip: { chest: 'ironplate', legs: 'steelgreaves' }, _eqg: 'nn', wpnType: 'sword', wpnMat: 'iron' }, extra),
    d: { visible: true, destroyed: false, _swimK: 0, _gearChest: spr('c' + i), _gearLegs: spr('l' + i), _weaponSprite: spr('w' + i), _spriteBody: spr('b' + i), _fullsetOn: false, _fullsetWaist: 0.5 },
  };
}
function crowd(n) {
  const others = {}, disp = new Map(), ps = [];
  for (let i = 0; i < n; i++) { const p = peer(i); others['bp_' + i] = p.o; disp.set('bp_' + i, p.d); ps.push(p); }
  return { S: { others, rpg: null }, er: { otherPlayerDisplays: disp }, ps };
}
const frame = (g, w) => { g._frameNo++; return g._targets(w.S, w.er, null, 'wheel'); };
const byKey = (t, k) => t.find((x) => x.key === k);

/* ── 1. content ────────────────────────────────────────────────────────── */
{
  const g = new GlintSystem(), w = crowd(3);
  const t = frame(g, w);
  check('1a. three slots a player (weapon, torso, greaves)', t.length === 9, t.length);
  const c = byKey(t, 'bp_1:c');
  check('1b. the torso slot: its sprite, its part, iron colour, plain look', c && c.sprites.length === 1 && c.sprites[0].label === 'c1' && c.part === 'c' && c.color === METAL_SHINE.iron && c.look === null, c && c.part);
  check('1c. the weapon slot has no part and no look', byKey(t, 'bp_2:w').part === null && byKey(t, 'bp_2:w').look === null);
  check('1d. each slot is told its figure', t.every((x) => x.fig === w.ps[+x.key.slice(3, 4)].d._spriteBody));
  w.ps[0].d._fullsetOn = true;
  const t2 = frame(g, w);
  check('1e. a full set puts the body in the torso slot and its half in _fullLegs', byKey(t2, 'bp_0:c').sprites.length === 2 && g._fullLegs.get(w.ps[0].d._spriteBody).key === 'bp_0');
  w.ps[0].d._fullsetOn = false;
  frame(g, w);
  check('1f. ...and not the frame after it goes', g._fullLegs.size === 0);
}

/* ── 2. visibility ─────────────────────────────────────────────────────── */
{
  const g = new GlintSystem(), w = crowd(2);
  frame(g, w);
  w.ps[0].d._gearChest.visible = false;
  let t = frame(g, w);
  check('2a. a hidden torso piece is out of its slot at once (slot gone: no sprite)', !byKey(t, 'bp_0:c') && !!byKey(t, 'bp_1:c'));
  w.ps[0].d._gearChest.visible = true;
  t = frame(g, w);
  check('2b. ...and back the frame it shows', byKey(t, 'bp_0:c').sprites.length === 1);
  w.ps[0].d.visible = false;
  t = frame(g, w);
  check('2c. a hidden display shows no slot at all', !byKey(t, 'bp_0:c') && !byKey(t, 'bp_0:l') && !byKey(t, 'bp_0:w'));
}

/* ── 3. grade and equip ────────────────────────────────────────────────── */
{
  const g = new GlintSystem(), w = crowd(1);
  let t = frame(g, w);
  check('3a. plain grade: no look', byKey(t, 'bp_0:c').look === null && byKey(t, 'bp_0:c').grade === 'normal');
  w.S.others.bp_0._eqg = 'rg';
  t = frame(g, w);
  check('3b. eqg "rg": rare torso, godly greaves, the frame it arrives',
    byKey(t, 'bp_0:c').grade === 'rare' && byKey(t, 'bp_0:c').look === GRADE_LOOK.rare && byKey(t, 'bp_0:l').grade === 'godly' && byKey(t, 'bp_0:l').look === GRADE_LOOK.godly);
  w.S.others.bp_0.equip = { chest: 'copperplate', legs: 'none' };
  t = frame(g, w);
  check('3c. a new torso metal re-colours; no greaves, no greaves slot', byKey(t, 'bp_0:c').color === METAL_SHINE.copper && !byKey(t, 'bp_0:l'));
  w.S.others.bp_0.equip = { chest: 'none', legs: 'none' };
  t = frame(g, w);
  check('3d. no metal: only the weapon slot', t.length === 1 && t[0].key === 'bp_0:w');
  w.S.others.bp_0.equip = { chest: 'ironplate', legs: 'none' };
  w.S.others.bp_0._eqg = 'nn';
  t = frame(g, w);
  check('3e. worn again, plain: back to the plain look', byKey(t, 'bp_0:c').look === null && byKey(t, 'bp_0:c').color === METAL_SHINE.iron);
}

/* ── 4. leaving ────────────────────────────────────────────────────────── */
{
  const g = new GlintSystem(), w = crowd(3);
  frame(g, w);
  check('4a. three peers kept', g._peerE.size === 3);
  delete w.S.others.bp_1;
  let t = frame(g, w);
  check('4b. a peer who left is out of the targets and out of the keep that frame', !t.some((x) => x.key.startsWith('bp_1')) && g._peerE.size === 2 && !g._peerE.has('bp_1'));
  w.er.otherPlayerDisplays.get('bp_2')._swimK = 1;
  t = frame(g, w);
  check('4c. a swimmer is dropped', !t.some((x) => x.key.startsWith('bp_2')) && g._peerE.size === 1);
  w.er.otherPlayerDisplays.get('bp_2')._swimK = 0;
  w.er.otherPlayerDisplays.get('bp_0')._farHidden = true;
  t = frame(g, w);
  check('4d. a far one is dropped, a returned one is back', !t.some((x) => x.key.startsWith('bp_0')) && !!byKey(t, 'bp_2:c'));
  g.clear();
  check('4e. clear() empties the keep', g._peerE.size === 0);
}

/* ── 5. nothing made per frame ─────────────────────────────────────────── */
{
  const g = new GlintSystem(), w = crowd(5);
  const t1 = frame(g, w);
  const slots = t1.slice(), arrays = t1.map((x) => x.sprites), keys = t1.map((x) => x.key);
  const t2 = frame(g, w);
  check('5a. the same slot objects, arrays and key strings the next frame',
    t2.length === slots.length && t2.every((x, i) => x === slots[i] && x.sprites === arrays[i] && x.key === keys[i]));
  check('5b. the target list is the one array', t1 === t2);
  g.update({ others: w.S.others, rpg: null }, 0, w.er, null, 'wheel', { k: 1, sx: 0, sy: 0 }, true);
  const want1 = g._want;
  g.update({ others: w.S.others, rpg: null }, 0, w.er, null, 'wheel', { k: 1, sx: 0, sy: 0 }, true);
  check('5c. update() reuses its Map', g._want === want1);
}

console.log(`\nglint-peer-slots: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
