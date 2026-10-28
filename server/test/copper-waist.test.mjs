/* ═══ v2.3.3733: THE CHAIN AT THE WAIST IN THE ARMOUR'S OWN METAL ═══
 *
 * The owner, 2026-10-28: "Northeast and northwest jog while wearing full
 * copper armor the midsection with the belt is either gray (matching iron) or
 * leaves gaps (northwest jog)".  North-east has no knight figure, so the chain
 * belt is painted INTO the body by the masked bake, and the body is drawn
 * untinted: the chain stayed steel grey under a copper plate
 * (docs/specs/copper-waist.md; the phone test is mp-copperwaist):
 *   1. a worn plate's tint is its metal's (the multiply the plate sprite gets),
 *      and steel's is the white no-op;
 *   2. the bake reads the CHEST's tint and multiplies the chain by it before
 *      the paint copies a single chain pixel into the body;
 *   3. the bake's cache key holds the worn ids, so copper and iron never share
 *      a baked waist.
 */
import { readFileSync } from 'node:fs';
import { gearTint } from '../../src/rendering/gearVariants.js';
import { MATERIALS } from '../../src/rendering/traits/materialTints.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const root = new URL('../../', import.meta.url);

/* ── 1. each plate's tint is its metal's ── */
{
  check('1a copper plate: copper\'s tint', gearTint('copperplate') === MATERIALS.copper.tint, gearTint('copperplate').toString(16));
  check('1b iron plate: iron\'s tint', gearTint('ironplate') === MATERIALS.iron.tint);
  check('1c black steel plate: black steel\'s tint', gearTint('blacksteelplate') === MATERIALS.blacksteel.tint);
  check('1d the steel plate: white, the no-op (its chain as drawn)', gearTint('steelplate') === 0xFFFFFF);
  check('1e copper\'s tint is not grey (red well over blue)', ((MATERIALS.copper.tint >> 16) & 255) - (MATERIALS.copper.tint & 255) > 100);
}

/* ── 2. the bake multiplies the chain by the chest's tint, before the paint ── */
{
  const src = readFileSync(new URL('src/rendering/maskedBake.js', root), 'utf8');
  check('2a maskedBake imports gearTint', /import \{[^}]*\bgearTint\b[^}]*\} from '\.\/gearVariants\.js'/.test(src));
  const read = src.indexOf("const bd = bctx.getImageData(0, 0, 256, 256).data;");
  const tint = src.indexOf("gearTint(_cw.k.slice(6))");
  const chest = src.indexOf("w.k.indexOf('chest:') === 0", read);
  const paint = src.indexOf('d2[o] = bd[o]', read);
  check('2b the chain sheet is read, then tinted, then painted', read > 0 && tint > read && paint > tint, { read, tint, paint });
  check('2c ...by the CHEST\'s metal', chest > read && chest < tint, { chest, tint });
  const mul = /bd\[o\] = \(bd\[o\] \* tr[^;]*;\s*bd\[o \+ 1\] = \(bd\[o \+ 1\] \* tg[^;]*;\s*bd\[o \+ 2\] = \(bd\[o \+ 2\] \* tb/.test(src);
  check('2d ...as a multiply of all three channels (the sprite tint\'s own maths)', mul);
}

/* ── 3. each metal bakes its own waist ── */
{
  const er = readFileSync(new URL('src/rendering/systems/entityRenderer.js', root), 'utf8');
  const key = /function _maskedKey\(bodyTex, worn, dilate\) \{\s*return [^;]*worn\.map\(w => w\.k\)/.test(er);
  check('3a the bake\'s cache key holds the worn ids (chest:copperplate, chest:ironplate)', key);
  const wornK = (er.match(/k: _?sl \+ ':' \+ _?it/g) || []).length;
  check('3b ...and the worn ids are the gear ids, metal and all (not the art id)', wornK >= 3, wornK);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
