/* ═══ v2.3.6209: A DYING MONSTER'S SHADOW HANGS FROM ITS OWN FRAME'S FEET (card EN) ═══
 *
 * The owner, 2026-11-27: "The skeletons shadow during death animation (of mummy -
 * skeleton is second phase) is far too low".  src/game/frameFoot.js says ONCE where a
 * dying body's frame meets the ground; the strip packer reads each frame's foot in the
 * scan it already makes (trimRules.js trimCellOf `by`, stripPack.js `feet`), the
 * textures carry it (zoneTextures `__btFoot`), the renderer's death branches mark the
 * frame and the light's casters ask the rule.  The phone test mp-deathshadow plays it.
 *   1. the rule on plain sprites: unmarked or another texture since -> -1 (the caller's
 *      own rule); the skeleton's first frame -> its 130 empty rows at its scale; the
 *      mirror changes nothing; a foot under the anchor (a slime's splat) -> 0;
 *   2. the packer's foot: a frame's lowest painted row, packed or not, 0 when empty;
 *   3. every way in: the worker posts the feet, both texture makers set them, the three
 *      death branches show their frames through the rule's door, the casters ask.
 * In tools/guards, not server/test: a new file there deploys the worker on merge
 * (TRAPS §277), and this is the page's rule.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { showDeathFrame, deathGroundLift } from '../../src/game/frameFoot.js';
import { readSystem } from './lib/filesOf.mjs';
import { trimScanCellIdx, trimCellOf } from '../../src/rendering/trimRules.js';
import { packStripNumbers } from '../../src/rendering/stripPack.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const near = (a, b) => Math.abs(a - b) < 1e-6;

/* ── 1. the rule ── */
{
  const tex = (foot, oh = 256) => ({ orig: { width: oh, height: oh }, __btFoot: foot });
  const spr = (t, ay = 1, sx = 0.5625, sy = 0.5625) => ({ texture: t, anchor: { x: 0.5, y: ay }, scale: { x: sx, y: sy } });
  const sk0 = spr(tex(126));
  check('1a an unmarked frame is not the rule\'s (-1: the caller keeps its own)', deathGroundLift(sk0) === -1);
  showDeathFrame(sk0, sk0.texture);
  check('1b the skeleton\'s first death frame: 130 empty rows under its feet, at its scale', near(deathGroundLift(sk0), 130 * 0.5625), deathGroundLift(sk0));
  const last = spr(tex(237)); showDeathFrame(last, last.texture);
  check('1c its last frame: 19 rows', near(deathGroundLift(last), 19 * 0.5625), deathGroundLift(last));
  const mir = spr(tex(126), 1, -0.5625, 0.5625); showDeathFrame(mir, mir.texture);
  check('1d mirrored (scale.x < 0): the same', near(deathGroundLift(mir), deathGroundLift(sk0)));
  const flip = spr(tex(126), 1, 0.5625, -0.5625); showDeathFrame(flip, flip.texture);
  check('1e a negative scale.y still lifts (its size, not its sign)', near(deathGroundLift(flip), deathGroundLift(sk0)));
  sk0.texture = tex(248);
  check('1f a frame set since the mark (a living one) is not the rule\'s', deathGroundLift(sk0) === -1);
  const slime = spr(tex(113, 128), 108 / 128, 0.75, 0.75); showDeathFrame(slime, slime.texture);
  check('1g a foot under the anchor (a slime\'s splat on its base row) -> 0, never below the anchor', deathGroundLift(slime) === 0, deathGroundLift(slime));
  const slime2 = spr(tex(105, 128), 108 / 128, 0.75, 0.75); showDeathFrame(slime2, slime2.texture);
  check('1h a foot above that anchor: from the anchor row, not the cell\'s bottom', near(deathGroundLift(slime2), 3 * 0.75), deathGroundLift(slime2));
  const nofoot = spr({ orig: { width: 256, height: 256 } }); showDeathFrame(nofoot, nofoot.texture);
  check('1i a frame whose foot is not known -> -1', deathGroundLift(nofoot) === -1);
  check('1j no sprite, no texture -> -1', deathGroundLift(null) === -1 && deathGroundLift({}) === -1);
}

/* ── 2. the packer's foot ── */
{
  const alpha = new Uint8Array(256); alpha[1] = 255; alpha[2] = 40;   /* 0 see-through, 1 solid, 2 faint */
  const fw = 64, fh = 64, n = 3, W = fw * n;
  const idx = new Uint8Array(W * fh);
  const put = (f, x, y, c) => { idx[y * W + f * fw + x] = c; };
  for (let y = 5; y <= 20; y++) put(0, 30, y, 1);        /* frame 0: art down to row 20 */
  put(0, 12, 33, 2);                                     /* ...and a faint fleck at 33: painted too */
  for (let y = 40; y <= 63; y++) put(1, 10, y, 1);       /* frame 1: to the bottom row */
  /* frame 2: empty */
  const b0 = trimScanCellIdx(idx, W, 0, fw, fh, alpha);
  check('2a trimCellOf\'s `by`: the row under the lowest painted pixel (a faint one counts, as the crop\'s)', trimCellOf(b0, fw, fh).by === 34, trimCellOf(b0, fw, fh));
  check('2b an empty frame\'s `by` is 0', trimCellOf(trimScanCellIdx(idx, W, 2 * fw, fw, fh, alpha), fw, fh).by === 0);
  const dec = { idx, w: W, h: fh, stride: W, alpha, rgb: new Uint8Array(256 * 3) };
  const out = packStripNumbers(dec, fw, fh, n);
  check('2c packStripNumbers gives every frame\'s foot', !!out && Array.isArray(out.feet) && out.feet.join(',') === '34,64,0', out && out.feet);
  /* a strip whose art fills its frames is not packed (cells null): its feet still come */
  const full = new Uint8Array(W * fh).fill(1);
  for (let x = 0; x < W; x++) full[(fh - 1) * W + x] = 0;   /* every frame's bottom row empty */
  const out2 = packStripNumbers({ idx: full, w: W, h: fh, stride: W, alpha, rgb: new Uint8Array(256 * 3) }, fw, fh, n);
  check('2d ...packed or not (art that fills its frames: cells null, feet still there)', !!out2 && out2.cells === null && out2.feet.join(',') === '63,63,63', out2 && { cells: out2.cells, feet: out2.feet });
  const whole = packStripNumbers(Object.assign({}, dec, { whole: true }), W, fh, 1);
  check('2e a picture loaded whole has no feet (it is not a strip)', !!whole && whole.feet === null);
}

/* ── 3. every way in ── */
{
  const src = (p) => readFileSync(join(REPO, p), 'utf8');
  const wk = src('src/rendering/png8Worker.js');
  check('3a the worker posts the strip\'s feet', /postMessage\(\{[^}]*feet: out\.feet/.test(wk));
  const zt = src('src/rendering/zoneTextures.js');
  check('3b both strip texture makers set __btFoot (from the worker\'s numbers; from the page\'s packer)',
    (zt.match(/__btFoot = /g) || []).length === 2 && /feet: m\.feet \}/.test(zt) && /pal: retintPalette\(m\.pal, m\.idx, rgb\), feet: m\.feet/.test(zt));
  /* the renderer read by its system, never by its path (tests-by-system) */
  const er = [...readSystem('render')].map(([, t]) => t).join('\n');
  const shows = (er.match(/showDeathFrame\(sb, tex\)/g) || []).length;
  check('3c the renderer shows its three death strips through the door (a variant\'s, the slime\'s, the snowman\'s), and sets no death texture of its own',
    shows === 3
    && /variantSprites\.death\.get\(frameIdx\);\s*const sb = display\._spriteBody;\s*showDeathFrame\(sb, tex\)/.test(er)
    && /getSlimeFrame\('death', frameIdx, variant\);[\s\S]{0,400}showDeathFrame\(sb, tex\)/.test(er)
    && /getSnowmanDeathFrame\(frameIdx\);\s*const sb = display\._spriteBody;\s*showDeathFrame\(sb, tex\)/.test(er), shows);
  {
    /* a frame shown through it: set on a change only, and marked */
    let writes = 0, cur = null;
    const sp = { anchor: { y: 1 }, scale: { y: 1 } };
    Object.defineProperty(sp, 'texture', { get: () => cur, set: (t) => { cur = t; writes++; } });
    const t1 = { orig: { height: 256 }, __btFoot: 200 };
    showDeathFrame(sp, t1); showDeathFrame(sp, t1); showDeathFrame(sp, null);
    check('3c2 showDeathFrame writes the texture only on a change, and a missing frame changes nothing', writes === 1 && cur === t1 && deathGroundLift(sp) === 56, { writes, lift: deathGroundLift(sp) });
  }
  const cs = src('src/rendering/lightfx/casters.js');
  check('3d the light\'s casters ask the rule for a monster, before the look\'s at-rest feetRow',
    /const own = deathGroundLift\(b\);\s*const pad = own >= 0 \? own \* d\.scale\.y\s*: v && v\.feetRow/.test(cs));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
