/* ═══ v2.3.3655: THE FIRE-LIGHTER'S STRIP WITHOUT ITS PAINTED FIRE ═══
 *
 * The owner, 2026-10-27: the fire-start animation's flame, smoke and glow out
 * of the art, the fire drawn in code ("actual lit fire is code drawn").
 * tools/build_fire_clean.py takes the painted fire out of the owner's frames
 * (kept as supplied in assets/skill-anim-src/firemaking-strip-painted.webp)
 * and writes the strip and src/data/fireStrip.js: each frame's shift that
 * lays its log on frame 0's, the figure's middle, the strike's frame, and the
 * strip file's fingerprint.  The tool needs Python; this suite does not:
 *   1. the strip on disk is the one the tool wrote (its SHA-256);
 *   2. it is eight 384 x 512 frames, lossless (the bake reads exact colours);
 *   3. the places are whole art px, eight of them, the first row's small and
 *      the second row's 26-27 px down (the owner's two rows of the sheet);
 *   4. the figure's middle is inside the frame and right of its middle;
 *   5. the game asks for the strip at FIRE_STRIP_V (a phone keeps a strip a
 *      year), places every frame by the table, and lights the fire at the
 *      strike's frame;
 *   6. the owner's frames are kept, as supplied, for the tool to read.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const root = new URL('../../', import.meta.url);
const bin = (p) => readFileSync(new URL(p, root));
const src = (p) => readFileSync(new URL(p, root), 'utf8');
const F = await import('../../src/data/fireStrip.js');
const STRIP = 'public/sprites/skills/firemaking-strip.webp';

/* ── 1. the strip is the tool's ── */
{
  const sha = createHash('sha256').update(bin(STRIP)).digest('hex');
  check('1a the strip on disk is the one tools/build_fire_clean.py wrote (FIRE_STRIP_SHA256)', sha === F.FIRE_STRIP_SHA256, { disk: sha, table: F.FIRE_STRIP_SHA256 });
}

/* ── 2. eight 384 x 512 frames, lossless ── */
{
  const b = bin(STRIP);
  const riff = b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
  // the image chunk follows an optional VP8X (+ ICCP); find VP8L
  let off = 12, vp8l = -1, kinds = [];
  while (off + 8 <= b.length) {
    const kind = b.toString('ascii', off, off + 4), len = b.readUInt32LE(off + 4);
    kinds.push(kind);
    if (kind === 'VP8L') { vp8l = off + 8; break; }
    off += 8 + len + (len & 1);
  }
  check('2a it is a WebP', riff, b.toString('ascii', 0, 12));
  check('2b ...lossless (VP8L): the skin and key colours the bake reads are exact', vp8l > 0, kinds);
  if (vp8l > 0) {
    const bits = b.readUInt32LE(vp8l + 1);
    const w = (bits & 0x3fff) + 1, h = ((bits >>> 14) & 0x3fff) + 1;
    check('2c eight 384 x 512 frames (3072 x 512)', w === 384 * 8 && h === 512, { w, h });
  }
}

/* ── 3. the frames' places ── */
{
  const P = F.FIRE_FRAME_OFF;
  check('3a eight places', Array.isArray(P) && P.length === 8, P);
  check('3b ...each a pair of whole art px', P.every((p) => p.length === 2 && p.every((v) => Number.isInteger(v))), P);
  check('3c frame 0 is the reference: [0, 0]', P[0][0] === 0 && P[0][1] === 0, P[0]);
  check('3d the first row (frames 0-3) is not moved up or down, and at most 3 px aside', P.slice(0, 4).every(([dx, dy]) => dy === 0 && Math.abs(dx) <= 3), P.slice(0, 4));
  check('3e the second row (frames 4-7) comes 26-27 px down, at most 6 px aside (the sheet drew it higher)', P.slice(4).every(([dx, dy]) => dy >= 26 && dy <= 27 && Math.abs(dx) <= 6), P.slice(4));
}

/* ── 4. the figure's middle ── */
check('4a the figure\'s middle is inside the frame and right of its middle (he stands at x 243 of 384)', F.FIRE_FIGURE_X > 192 && F.FIRE_FIGURE_X < 384, F.FIRE_FIGURE_X);
check('4b the strike is frame 3 (the first frame the owner painted fire on)', F.FIRE_STRIKE_FRAME === 3, F.FIRE_STRIKE_FRAME);

/* ── 5. the game reads it ── */
{
  const er = src('src/rendering/systems/effectsRenderer.js');
  check('5a the strip is asked for at FIRE_STRIP_V', /const FIRE_URL = `\/sprites\/skills\/firemaking-strip\.webp\?v=\$\{FIRE_STRIP_V\}`/.test(er));
  check('5b ...which is a version, not empty', /^2\.3\.\d+$/.test(F.FIRE_STRIP_V), F.FIRE_STRIP_V);
  check('5c every frame is placed by the table (_fireFrameShift reads FIRE_FRAME_OFF and FIRE_FIGURE_X)', /function _fireFrameShift[\s\S]{0,200}FIRE_FRAME_OFF[\s\S]{0,200}FIRE_FIGURE_X/.test(er));
  const used = (er.match(/_fireFrameShift\(/g) || []).length;
  check('5d ...for your own light and a peer\'s (two callers)', used >= 3, used);
  const cf = src('src/rendering/campfireFx.js');
  check('5e the light\'s fire catches at the strike (campfireFx gets FIRE_STRIKE_FRAME x FIRE_FRAME_MS)', /this\._campfireFx\.update\(S, now, this\._peerLights, FIRE_STRIKE_FRAME \* FIRE_FRAME_MS\)/.test(er) && /strikeAt/.test(cf), null);
  check('5f the campfire is lit where the light was (fireLightSpot, one place for both)', /export function fireLightSpot/.test(cf) && /fireLightSpot\(/.test(src('src/ui/BroTown.jsx')));
}

/* ── 6. the owner's frames, as supplied ── */
check('6a the owner\'s painted frames are kept for the tool (assets/skill-anim-src/firemaking-strip-painted.webp)', existsSync(new URL('assets/skill-anim-src/firemaking-strip-painted.webp', root)));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
