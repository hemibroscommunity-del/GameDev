/* ═══ v2.3.2925: THE GRIP POINT, CENTRED ON THE FIST -- AND THE FIST'S SHAPE ═══
 *
 * Owner: "The fist during jog south actually punches through the handle ...
 * You originally built an anchor tool for me where I tapped through my phone
 * on about where the characters hand was ... but it was imprecise because my
 * fingers were large relative to the tiny hand size."  And then: "The hand is
 * actually supposed to rest over the grip, not beneath it."
 *
 * TWO OUTPUTS, one measurement.
 *
 * 1. THE ANCHOR (anchors.json, the right hand).  The taps land ON the fist, but
 *    on its edge -- the knuckles' lower corner on the chest frames, the
 *    fingertips on the hip frames.  Starting from the tap (it is on the fist,
 *    which is the hard part), the point is pulled into the middle of the fist:
 *    the mean of the bare arm skin within FIST_R sheet px, twice.  Two short
 *    steps settle in a ~6 px fist and cannot wander up the forearm.  Measured
 *    on jog-south: every point moves 0.4-2.9 px.
 *
 * 2. THE FIST (src/rendering/fistMasks.js).  The grip hole (v2.3.2911) cuts
 *    the blade so the fist shows over the handle.  A CIRCLE cannot do that
 *    right: small, it shows the middle of the fist and the handle covers the
 *    rest ("beneath the grip"); large, it shows the ground round the fist ("punches
 *    through").  So the hole is the fist itself: every bare-skin pixel of the
 *    hand (connected to the fist, out to ARM_R, not above the fist) plus the body's dark keyline touching
 *    it, as offsets from the anchor in 256-space.  entityRenderer draws them as
 *    the stencil, so the whole fist -- outline included -- sits on the grip and
 *    nothing else is cut.
 *
 * "Bare skin" is the recolour's own _isSkin test (playerSkins.js) on pixels
 * the tee does not cover -- the tee sheet is read at its own resolution, which
 * for the stand is half the body's.
 *
 * Rerun BOTH outputs together (the masks are relative to the anchors), then
 * bump ANCHORS_URL's ?v= in src/rendering/playerAnchors.js.
 *
 * Starts from the taps at TAP_REV every time, so rerunning gives the same file.
 *
 * Run: node tools/art/fit-fist-anchors.mjs [--write] [key ...]
 *      (default: jog-south stand-south)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode } from '../gear/lib/png.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WRITE = process.argv.includes('--write');
const KEYS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const FIST_R = 3, STEPS = 2, ARM_R = 10;   /* in 128-px sheet units; scaled per sheet */
const ANCHORS = `${REPO}/public/sprites/player/anchors.json`;
const MASKS = `${REPO}/src/rendering/fistMasks.js`;
const isSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25;
const isInk = (r, g, b, a) => a > 128 && (r + g + b) / 3 < 60;
const isPants = (r, g, b, a) => a > 180 && g >= r - 10 && g > b + 8 && r < 150;

const A = JSON.parse(readFileSync(ANCHORS, 'utf8'));
/* IDEMPOTENT: every fit starts from the owner's TAPS as they stood before any
   fitting (TAP_REV), never from a previous run's output -- a mean shift
   restarted from its own answer keeps creeping. */
const TAP_REV = 'e7fc906';
const TAPS = JSON.parse(execSync(`git -C "${REPO}" show ${TAP_REV}:public/sprites/player/anchors.json`, { encoding: 'utf8', maxBuffer: 1 << 26 }));
const masks = {};
let changed = 0;
for (const key of (KEYS.length ? KEYS : ['jog-south', 'stand-south'])) {
  const B = decode(readFileSync(`${REPO}/public/sprites/player/${key}.png`));
  const T = decode(readFileSync(`${REPO}/public/sprites/gear/shirt/tshirt/${key}.png`));
  const list = A[key], taps = TAPS[key];
  if (!Array.isArray(list) || !Array.isArray(taps)) throw new Error(`${key}: no anchors`);
  const FW = B.height, TW = T.height;          /* square frames */
  const N = Math.round(B.width / FW);
  const s = FW / 256;                          /* 256-space -> this sheet */
  const u = FW / 128;                          /* the radii are written for a 128 px sheet */
  const tk = TW / FW;
  const px4 = (I, W, f, x, y) => { const i = (y * I.width + f * W + x) * 4; return [I.data[i], I.data[i + 1], I.data[i + 2], I.data[i + 3]]; };
  const teeOver = (f, x, y) => px4(T, TW, f, Math.min(TW - 1, Math.floor(x * tk)), Math.min(TW - 1, Math.floor(y * tk)))[3] > 60;
  const inside = (x, y) => x >= 0 && y >= 0 && x < FW && y < FW;
  const arm = (f, x, y) => inside(x, y) && isSkin(...px4(B, FW, f, x, y)) && !teeOver(f, x, y);
  console.log(`${key}: ${N} frame(s) of ${FW} px`);
  const frames = [];
  for (let f = 0; f < N; f++) {
    const e = list[Math.min(f, list.length - 1)];
    const legacy = Array.isArray(e);
    const t = taps[Math.min(f, taps.length - 1)];
    const r = Array.isArray(t) ? t : t && t.r;   /* the owner's tap */
    if (!r) { frames.push(null); continue; }
    let cx = r[0] * s, cy = r[1] * s;
    let ok = true;
    for (let st = 0; st < STEPS; st++) {
      let sx = 0, sy = 0, n = 0;
      const R = FIST_R * u;
      for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) {
        for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
          const qx = x + 0.5, qy = y + 0.5;
          if ((qx - cx) ** 2 + (qy - cy) ** 2 > R * R) continue;
          if (arm(f, x, y)) { sx += qx; sy += qy; n++; }
        }
      }
      if (!n) { ok = false; break; }
      cx = sx / n; cy = sy / n;
    }
    if (!ok) { console.log(`  ${String(f).padStart(2)}: no bare skin at the tap, left alone`); frames.push(null); continue; }
    const nx = Math.round((cx / s) * 4) / 4, ny = Math.round((cy / s) * 4) / 4;
    if (f < list.length) {
      const moved = Math.hypot(nx - r[0], ny - r[1]) * s;
      console.log(`  ${String(f).padStart(2)}: [${r[0]}, ${r[1]}] -> [${nx}, ${ny}]  (${moved.toFixed(1)} sheet px)`);
      if (legacy) list[f] = [nx, ny]; else e.r = [nx, ny];
      changed++;
    }
    /* ═══ v2.3.2925b: THE WHOLE HAND, FINGERS INCLUDED ═══
       Owner: "The characters hand should occlude the handle with his entire
       hand ... his hand and fingers are over the handle grip."  A 3.6 px disc
       round the fist's centre left the fingers and knuckle edges under the
       handle.  So: the bare skin CONNECTED to the fist (8-way flood from its
       centre) out to 6 px -- the whole hand and the wrist, not the forearm
       up to the elbow, and never the other hand or the face, which are not
       connected to it inside that reach. */
    /* ═══ v2.3.2925c: THE BACK OF THE HAND COVERS THE WHOLE GRIP ═══
       Owner: "for south jog the player hand still needs to cover the whole
       handle.  There's a strip of the handle still coming through ... Think of
       it like looking at someone gripping something side profile with their
       right hand ... The back of the hand would be occluding the handle."
       Drawn in red in-game, the fist-only hole sat on the TOP of the grip: the
       anchor is just under the crossguard, and the grip slants down-left from
       there across the thumb and the wrist, so a strip of it showed over the
       hand.  The hand in front of the grip is every opaque body pixel reached
       from the fist -- skin and its shading and keyline alike -- that the tee
       does not cover and that is not the pants, out to ARM_R, but never above
       the fist's top row: that is where the crossguard sits, and it stays
       whole.  The tee is the sleeve and the torso; the reach keeps the flood
       off the face and the other hand. */
    /* the fist's own top row: the bare skin reached from its centre within
       FIST_R * 2 (what v2.3.2925b cut), measured before the wider flood */
    let top = Math.floor(cy);
    {
      const R0 = 2 * FIST_R * u, seen = new Set(), q = [];
      for (let y = Math.floor(cy - 1); y <= Math.ceil(cy + 1) && !q.length; y++) for (let x = Math.floor(cx - 1); x <= Math.ceil(cx + 1) && !q.length; x++) if (arm(f, x, y)) { q.push([x, y]); seen.add(x + ',' + y); }
      while (q.length) {
        const [x, y] = q.pop(); if (y < top) top = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy, k = xx + ',' + yy;
          if (seen.has(k) || (xx + 0.5 - cx) ** 2 + (yy + 0.5 - cy) ** 2 > R0 * R0 || !arm(f, xx, yy)) continue;
          seen.add(k); q.push([xx, yy]);
        }
      }
    }
    const handPx = (f, x, y) => y >= top && inside(x, y) && !teeOver(f, x, y) && (() => {
      const p = px4(B, FW, f, x, y);
      return p[3] > 128 && !isPants(...p);
    })();
    const R = ARM_R * u, skin = new Set(), out = [];
    {
      let seed = null, sd = 1e9;
      for (let y = Math.floor(cy - 3 * u); y <= Math.ceil(cy + 3 * u); y++) {
        for (let x = Math.floor(cx - 3 * u); x <= Math.ceil(cx + 3 * u); x++) {
          const d = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2;
          if (d < sd && arm(f, x, y)) { sd = d; seed = [x, y]; }
        }
      }
      const q = seed ? [seed] : [];
      if (seed) skin.add(seed.join(','));
      while (q.length) {
        const [x, y] = q.pop();
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy, k = xx + ',' + yy;
          if (skin.has(k) || (xx + 0.5 - cx) ** 2 + (yy + 0.5 - cy) ** 2 > R * R || !handPx(f, xx, yy)) continue;
          skin.add(k); q.push([xx, yy]);
        }
      }
    }
    const ink = new Set();
    for (const k of skin) {
      const [x, y] = k.split(',').map(Number);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy, kk = xx + ',' + yy;
        if (skin.has(kk) || ink.has(kk) || !inside(xx, yy)) continue;
        if (isInk(...px4(B, FW, f, xx, yy)) && !teeOver(f, xx, yy)) ink.add(kk);
      }
    }
    for (const k of [...skin, ...ink]) {
      const [x, y] = k.split(',').map(Number);
      /* offset of the pixel's top-left from the anchor, in 256-space */
      out.push(+(x / s - nx).toFixed(2), +(y / s - ny).toFixed(2));
    }
    frames.push(out);
  }
  masks[key] = { cell: +(1 / s).toFixed(4), frames };
  console.log(`  fist masks: ${frames.map((m) => (m ? m.length / 2 : 0)).join(' ')} px`);
}
if (WRITE) {
  if (changed) writeFileSync(ANCHORS, JSON.stringify(A, null, 2) + (readFileSync(ANCHORS, 'utf8').endsWith('\n') ? '\n' : ''));
  const body = Object.entries(masks).map(([k, v]) => `  '${k}': { cell: ${v.cell}, frames: [\n${v.frames.map((m) => `    ${m ? '[' + m.join(',') + ']' : 'null'},`).join('\n')}\n  ] },`).join('\n');
  writeFileSync(MASKS, `/* AUTO-GENERATED by tools/art/fit-fist-anchors.mjs -- do not edit by hand.
 * v2.3.2925: the fist's own pixels per frame, as [dx, dy, dx, dy, ...] offsets of
 * each pixel's top-left corner from that frame's right-hand anchor, in the
 * anchors' 256-space; \`cell\` is one sheet pixel in the same units.  The grip
 * hole is drawn from these so the whole fist -- keyline included -- rests on
 * the handle, and nothing but the fist is cut.  Regenerate with the anchors:
 * the offsets are relative to them. */
export const FIST_MASKS = {
${body}
};
`);
  console.log(`wrote ${changed} anchors and ${MASKS.slice(REPO.length + 1)}`);
} else console.log(`${changed} anchors would change (dry run; --write to apply)`);
