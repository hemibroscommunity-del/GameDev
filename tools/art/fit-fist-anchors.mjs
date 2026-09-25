/* ═══ v2.3.2925: THE GRIP POINT, CENTRED ON THE FIST ═══
 *
 * Owner: "The fist during jog south actually punches through the handle ...
 * You originally built an anchor tool for me where I tapped through my phone
 * on about where the characters hand was ... but it was imprecise because my
 * fingers were large relative to the tiny hand size."
 *
 * The taps land ON the fist, but on its edge -- the knuckles' lower corner on
 * the chest frames, the fingertips on the hip frames.  That was fine while the
 * blade simply sat over the hand; since the grip hole (v2.3.2911) cuts the
 * blade at the anchor to show the fist through it, a point on the EDGE of the
 * fist shows the fist beside the handle instead of round it.
 *
 * THE RULE.  Start at the owner's tap -- it is on the fist, which is the hard
 * part -- and pull it into the middle of the fist: the mean of the bare arm
 * skin (the recolour's own _isSkin test, playerSkins.js, on pixels the tee
 * does not cover) within FIST_R sheet pixels, twice.  A fist is ~5-6 px
 * across on the 128 px sheet, so two short steps settle in its middle and
 * cannot wander up the forearm.  Measured on jog-south: every point moves
 * 0.2-1.9 px.  Frames where no bare skin is near the tap are left alone.
 *
 * Output is written back into anchors.json in its own 256-space, as the same
 * legacy [x, y] pairs, rounded to a quarter pixel.  Bump ANCHORS_URL's ?v= in
 * src/rendering/playerAnchors.js so the fitted points are fetched.
 *
 * Run: node tools/art/fit-fist-anchors.mjs [--write] [key ...]   (default: jog-south)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode } from '../gear/lib/png.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WRITE = process.argv.includes('--write');
const KEYS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const FIST_R = 3, STEPS = 2, FW = 128;
const ANCHORS = `${REPO}/public/sprites/player/anchors.json`;
const isSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25;

const A = JSON.parse(readFileSync(ANCHORS, 'utf8'));
let changed = 0;
for (const key of (KEYS.length ? KEYS : ['jog-south'])) {
  const B = decode(readFileSync(`${REPO}/public/sprites/player/${key}.png`));
  const T = decode(readFileSync(`${REPO}/public/sprites/gear/shirt/tshirt/${key}.png`));
  const list = A[key];
  if (!Array.isArray(list)) throw new Error(`${key}: no anchors`);
  const N = Math.round(B.width / FW);
  const at = (f, x, y) => (y * B.width + f * FW + x) * 4;
  console.log(`${key}: ${N} frames`);
  for (let f = 0; f < Math.min(N, list.length); f++) {
    const e = list[f];
    const legacy = Array.isArray(e);
    const r = legacy ? e : e && e.r;
    if (!r) continue;
    let cx = r[0] / 2, cy = r[1] / 2;   /* 256-space -> the 128 px sheet */
    const arm = (x, y) => {
      if (x < 0 || y < 0 || x >= FW || y >= B.height) return false;
      const i = at(f, x, y);
      return isSkin(B.data[i], B.data[i + 1], B.data[i + 2], B.data[i + 3]) && T.data[i + 3] < 60;
    };
    let ok = true;
    for (let s = 0; s < STEPS; s++) {
      let sx = 0, sy = 0, n = 0;
      for (let y = Math.floor(cy - FIST_R); y <= Math.ceil(cy + FIST_R); y++) {
        for (let x = Math.floor(cx - FIST_R); x <= Math.ceil(cx + FIST_R); x++) {
          const px = x + 0.5, py = y + 0.5;
          if ((px - cx) ** 2 + (py - cy) ** 2 > FIST_R * FIST_R) continue;
          if (arm(x, y)) { sx += px; sy += py; n++; }
        }
      }
      if (!n) { ok = false; break; }
      cx = sx / n; cy = sy / n;
    }
    if (!ok) { console.log(`  ${String(f).padStart(2)}: no bare skin at the tap, left alone`); continue; }
    const nx = Math.round(cx * 2 * 4) / 4, ny = Math.round(cy * 2 * 4) / 4;
    const moved = Math.hypot(nx - r[0], ny - r[1]) / 2;
    console.log(`  ${String(f).padStart(2)}: [${r[0]}, ${r[1]}] -> [${nx}, ${ny}]  (${moved.toFixed(1)} sheet px)`);
    if (legacy) list[f] = [nx, ny]; else e.r = [nx, ny];
    changed++;
  }
}
if (WRITE && changed) { writeFileSync(ANCHORS, JSON.stringify(A, null, 2) + (readFileSync(ANCHORS, 'utf8').endsWith('\n') ? '\n' : '')); console.log(`wrote ${changed} anchors`); }
else console.log(`${changed} anchors ${WRITE ? 'unchanged' : 'would change (dry run; --write to apply)'}`);
