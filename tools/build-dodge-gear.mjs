/* Build the dodge-roll GEAR sheets (v2.3.1535).
 *
 * v2.3.1534 shipped the roll body-only: getGearFrame 404'd for the pose, so a
 * fully plated knight went BARE for the ~300ms tumble.  This emits the three
 * missing slots from the clothed variants repack-dodge-grid.mjs already
 * produced:
 *
 *   tools/dodge-src/dodge-<dir>-armored.png -> gear/chest/steelplate/dodge-<dir>.png
 *                                            + gear/legs/steelgreaves/dodge-<dir>.png
 *   tools/dodge-src/dodge-<dir>-tshirt.png  -> gear/shirt/tshirt/dodge-<dir>.png
 *
 * This is tools/fit_hit_armor_art.py's pipeline MINUS its first two stages.
 * That tool had to chroma-key art off a magenta grid and then fit it to the
 * body at a solved per-direction scale, because the owner's harness art was
 * drawn independently of the body it had to sit on.  These variants are not:
 * they were generated as re-skins of the SAME nine poses and repacked through
 * the SAME scale and per-frame placement solved from the body grid, so they
 * arrive already registered (measured 1-3px on frames 1-8).  Only SPLIT and
 * SEAL are left.
 *
 * SPLIT.  The art is one figure but the game wears chest and legs as separate
 * slots, so each armour pixel is assigned to the slot of the BODY region it
 * covers -- torso skin -> chest, trousers/boots -> legs -- by nearest labelled
 * body pixel for the plate that overhangs the silhouette.  Chest-only wear
 * still shows bare legs, legs-only a bare chest.
 *
 * SEAL (owner, v2.3.1477: "make sure you remove the body beneath completely
 * ... otherwise AI drift will make the naked body beneath poke out").  The
 * enclosure test replaces that tool's neck-line rule, which does not survive a
 * pose where the body inverts: "below the neck" is meaningless on frame 5,
 * where the head is the LOWEST thing on screen.  Instead the background is
 * flooded inward through everything that is not armour -- any body pixel the
 * flood cannot reach is enclosed by plate and gets filled from the nearest
 * armour pixel.  Head and hands stay reachable from outside, so they stay
 * bare, which is what the runtime wants (it redraws the head over the plate).
 *
 * The t-shirt is deliberately NOT split and NOT sealed (v2.3.1480: "a tee is
 * SUPPOSED to leave the forearms and belly bare"), and stays WHITE-BASE --
 * gearCatalog tints the shirt slot at render time.
 *
 * Run:  node tools/build-dodge-gear.mjs [--dirs=south,east] [--dry-run]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { decode, encode } from './png.mjs';

const FRAME = 256;
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const flag = (n, d) => { const h = argv.find(a => a.startsWith('--' + n + '=')); return h ? h.slice(n.length + 3) : d; };
const DIRS = flag('dirs', 'south,east').split(',');
const PREVIEW = flag('preview', null);   /* 'DIR' in the path is replaced per direction */

/* ── pixel classifiers ────────────────────────────────────────────────────
   Measured off the shipped strips, not guessed:
     skin    (233,131,60) (229,124,53)   r-g ~100, r-b ~175
     pants   (117,116,66) (122,121,68)   r==g, r-b ~51
     boots   (76,76,76) (52,52,51)       neutral, dark
     outline (4,4,3) (11,11,10)          near-black
     plate   75..131 neutral grey        r==g==b
     tee     (253,253,253)               white
   Armour and boots share a grey range, which is only safe because the
   armoured figure is plated to the sole -- there are no boots left in it. */
const isSkin = (r, g, b) => (r - g) > 55 && (r - b) > 90 && r > 120;
const isPants = (r, g, b) => Math.abs(r - g) <= 14 && (r - b) >= 28 && r > 60 && r < 190;
const isNearBlack = (r, g, b) => r < 60 && g < 60 && b < 60 && Math.abs(r - g) <= 16 && Math.abs(g - b) <= 16;
const isBoot = (r, g, b) => Math.abs(r - g) <= 14 && Math.abs(g - b) <= 14 && r >= 40 && r < 110;
const isWhite = (r, g, b) => r > 200 && g > 200 && b > 200 && (Math.max(r, g, b) - Math.min(r, g, b)) <= 22;

const CHEST = 1, LEGS = 2;

function frameOf(img, i) {
  const out = Buffer.alloc(FRAME * FRAME * 4);
  for (let y = 0; y < FRAME; y++) {
    const s = (y * img.width + i * FRAME) * 4;
    out.set(img.data.subarray(s, s + FRAME * 4), y * FRAME * 4);
  }
  return out;
}
const A = (px, i) => px[i * 4 + 3];

/* Grow `seed` into `allowed` by `rad` px (4-connected).  Used to pull a
   garment's own black keyline in without swallowing every other outline in
   the frame -- the head's outline touches only skin and background, so it is
   never adjacent to a core garment pixel and never comes along. */
function grow(seed, allowed, rad) {
  let cur = seed.slice();
  for (let step = 0; step < rad; step++) {
    const next = cur.slice();
    for (let y = 0; y < FRAME; y++) for (let x = 0; x < FRAME; x++) {
      const i = y * FRAME + x;
      if (cur[i] || !allowed[i]) continue;
      if ((x > 0 && cur[i - 1]) || (x < FRAME - 1 && cur[i + 1]) ||
          (y > 0 && cur[i - FRAME]) || (y < FRAME - 1 && cur[i + FRAME])) next[i] = 1;
    }
    cur = next;
  }
  return cur;
}

/* Multi-source BFS: for every cell, the label of the nearest labelled source
   and the index of the nearest source pixel. */
function nearestField(labels) {
  const out = new Uint8Array(FRAME * FRAME);
  const src = new Int32Array(FRAME * FRAME).fill(-1);
  let q = [];
  for (let i = 0; i < FRAME * FRAME; i++) if (labels[i]) { out[i] = labels[i]; src[i] = i; q.push(i); }
  while (q.length) {
    const nq = [];
    for (const i of q) {
      const x = i % FRAME, y = (i / FRAME) | 0;
      const nb = [];
      if (x > 0) nb.push(i - 1);
      if (x < FRAME - 1) nb.push(i + 1);
      if (y > 0) nb.push(i - FRAME);
      if (y < FRAME - 1) nb.push(i + FRAME);
      for (const n of nb) if (!out[n]) { out[n] = out[i]; src[n] = src[i]; nq.push(n); }
    }
    q = nq;
  }
  return { label: out, src };
}

/* Drop components smaller than `min` px -- the character's white eye pixels
   are the reason the shirt mask needs this. */
function dropSmall(mask, min) {
  const seen = new Uint8Array(FRAME * FRAME);
  for (let s = 0; s < FRAME * FRAME; s++) {
    if (!mask[s] || seen[s]) continue;
    const comp = [s]; seen[s] = 1;
    for (let k = 0; k < comp.length; k++) {
      const i = comp[k], x = i % FRAME, y = (i / FRAME) | 0;
      const nb = [];
      if (x > 0) nb.push(i - 1);
      if (x < FRAME - 1) nb.push(i + 1);
      if (y > 0) nb.push(i - FRAME);
      if (y < FRAME - 1) nb.push(i + FRAME);
      for (const n of nb) if (mask[n] && !seen[n]) { seen[n] = 1; comp.push(n); }
    }
    if (comp.length < min) for (const i of comp) mask[i] = 0;
  }
  return mask;
}

const OUT = {
  chest: 'public/sprites/gear/chest/steelplate',
  legs: 'public/sprites/gear/legs/steelgreaves',
  shirt: 'public/sprites/gear/shirt/tshirt',
};

for (const dir of DIRS) {
  const body = decode(readFileSync(`public/sprites/player/dodge-${dir}.png`));
  const armor = decode(readFileSync(`tools/dodge-src/dodge-${dir}-armored.png`));
  const tee = decode(readFileSync(`tools/dodge-src/dodge-${dir}-tshirt.png`));
  const N = Math.round(body.width / FRAME);
  const sheets = {
    chest: Buffer.alloc(N * FRAME * FRAME * 4),
    legs: Buffer.alloc(N * FRAME * FRAME * 4),
    shirt: Buffer.alloc(N * FRAME * FRAME * 4),
  };
  /* Body with every gear-covered pixel removed -- the runtime's
     _maskedBodyFrame, reproduced here so the QA composite is honest. */
  const maskedBody = Buffer.alloc(N * FRAME * FRAME * 4);
  let sealedTotal = 0, bareTotal = 0;
  const rows = [];

  for (let f = 0; f < N; f++) {
    const bp = frameOf(body, f), ap = frameOf(armor, f), tp = frameOf(tee, f);

    /* Body region labels: what slot covers this part of the character. */
    const bodyLabel = new Uint8Array(FRAME * FRAME);
    const bodyOpaque = new Uint8Array(FRAME * FRAME);
    for (let i = 0; i < FRAME * FRAME; i++) {
      if (A(bp, i) < 128) continue;
      bodyOpaque[i] = 1;
      const r = bp[i * 4], g = bp[i * 4 + 1], b = bp[i * 4 + 2];
      if (isSkin(r, g, b)) bodyLabel[i] = CHEST;
      else if (isPants(r, g, b) || isBoot(r, g, b)) bodyLabel[i] = LEGS;
      /* keyline stays unlabelled -> resolved by nearestField below */
    }
    const region = nearestField(bodyLabel).label;

    /* Armour mask: everything in the plated figure that is not bare skin.
       Dark pixels need a STRUCTURAL test, not just a darkness threshold.  The
       armoured boots shade down to (20,20,20)-(42,41,40), squarely inside any
       "this is keyline" brightness cut -- classifying them as keyline left the
       boot out of the mask, so the body's boot underneath came through as
       uncovered and sealed to the nearest donor, which was the keyline
       itself: a black block on the foot of every standing frame.
       A real keyline hugs the silhouette, so it always touches transparent
       (or the skin it encircles).  Dark that is fully INTERIOR to the plate,
       touching neither, is shading and belongs to the armour.  The skin test
       is what keeps the eyes and mouth -- dark, interior, surrounded by face
       -- from being baked into the chest sheet. */
    const coreArmor = new Uint8Array(FRAME * FRAME);
    const blackA = new Uint8Array(FRAME * FRAME);
    const skinOrBg = new Uint8Array(FRAME * FRAME);
    const anyPx = new Uint8Array(FRAME * FRAME).fill(1);
    for (let i = 0; i < FRAME * FRAME; i++) {
      if (A(ap, i) < 128) { skinOrBg[i] = 1; continue; }
      if (isSkin(ap[i * 4], ap[i * 4 + 1], ap[i * 4 + 2])) skinOrBg[i] = 1;
    }
    const nearSkinOrBg = grow(skinOrBg, anyPx, 2);
    for (let i = 0; i < FRAME * FRAME; i++) if (skinOrBg[i]) nearSkinOrBg[i] = 1;

    for (let i = 0; i < FRAME * FRAME; i++) {
      if (A(ap, i) < 128) continue;
      const r = ap[i * 4], g = ap[i * 4 + 1], b = ap[i * 4 + 2];
      if (isSkin(r, g, b)) continue;
      if (isNearBlack(r, g, b)) {
        if (nearSkinOrBg[i]) blackA[i] = 1;   /* silhouette / face keyline */
        else coreArmor[i] = 1;                /* interior plate shading */
        continue;
      }
      coreArmor[i] = 1;
    }
    const armorMask = grow(coreArmor, blackA, 2);
    for (let i = 0; i < FRAME * FRAME; i++) if (coreArmor[i]) armorMask[i] = 1;

    /* SEAL.  fit_hit_armor_art.py sealed "any body pixel BELOW THE NECK the
       art misses", which does not survive this pose: on frame 5 the body is
       inverted and the head is the LOWEST thing on screen, so a neck LINE
       protects nothing.  What that rule was really reaching for is "every
       part the harness is supposed to cover" -- and the plated art states
       that directly.  Bare skin left in the ARMOURED figure is exactly the
       head and hands; everything else is meant to be under plate.  So the
       protected set is the armoured figure's own skin, dilated a little to
       keep the seal off the jaw and knuckles, and every other uncovered body
       pixel is sealed -- edge slivers where the plate runs narrower than the
       body included, which an enclosure test alone would miss and let poke
       through. */
    const armorSkin = new Uint8Array(FRAME * FRAME);
    const anywhere = new Uint8Array(FRAME * FRAME).fill(1);
    for (let i = 0; i < FRAME * FRAME; i++) {
      if (A(ap, i) < 128) continue;
      if (isSkin(ap[i * 4], ap[i * 4 + 1], ap[i * 4 + 2])) armorSkin[i] = 1;
    }
    const keepBare = grow(armorSkin, anywhere, 3);
    for (let i = 0; i < FRAME * FRAME; i++) if (armorSkin[i]) keepBare[i] = 1;
    const armorSrc = nearestField(armorMask).src;   /* colour donor for sealed px */

    let sealed = 0, bare = 0;
    for (let i = 0; i < FRAME * FRAME; i++) {
      if (!bodyOpaque[i] || armorMask[i]) continue;
      if (keepBare[i]) { bare++; continue; }      /* head / hands: left bare */
      armorMask[i] = 2;                           /* 2 = sealed, colour from donor */
      sealed++;
    }
    sealedTotal += sealed; bareTotal += bare;

    /* Emit into the two slot sheets. */
    let cN = 0, lN = 0;
    for (let i = 0; i < FRAME * FRAME; i++) {
      if (!armorMask[i]) continue;
      const donor = armorMask[i] === 2 ? armorSrc[i] : i;
      if (donor < 0) continue;
      const slot = region[i] === LEGS ? 'legs' : 'chest';
      if (slot === 'legs') lN++; else cN++;
      const y = (i / FRAME) | 0, x = i % FRAME;
      const d = ((y * N * FRAME) + f * FRAME + x) * 4;
      sheets[slot][d] = ap[donor * 4];
      sheets[slot][d + 1] = ap[donor * 4 + 1];
      sheets[slot][d + 2] = ap[donor * 4 + 2];
      sheets[slot][d + 3] = 255;
    }

    /* Masked body for the QA composite: drop what the plate covers. */
    for (let i = 0; i < FRAME * FRAME; i++) {
      if (!bodyOpaque[i] || armorMask[i]) continue;
      const y = (i / FRAME) | 0, x = i % FRAME;
      const d = ((y * N * FRAME) + f * FRAME + x) * 4;
      maskedBody[d] = bp[i * 4]; maskedBody[d + 1] = bp[i * 4 + 1];
      maskedBody[d + 2] = bp[i * 4 + 2]; maskedBody[d + 3] = 255;
    }

    /* Shirt: white garment + its own keyline.  No split, no seal. */
    const coreTee = new Uint8Array(FRAME * FRAME);
    const blackT = new Uint8Array(FRAME * FRAME);
    for (let i = 0; i < FRAME * FRAME; i++) {
      if (A(tp, i) < 128) continue;
      const r = tp[i * 4], g = tp[i * 4 + 1], b = tp[i * 4 + 2];
      if (isNearBlack(r, g, b)) { blackT[i] = 1; continue; }
      if (isWhite(r, g, b)) coreTee[i] = 1;
    }
    dropSmall(coreTee, 40);                       /* eyes are white too */
    const teeMask = grow(coreTee, blackT, 1);
    for (let i = 0; i < FRAME * FRAME; i++) if (coreTee[i]) teeMask[i] = 1;
    let tN = 0;
    for (let i = 0; i < FRAME * FRAME; i++) {
      if (!teeMask[i]) continue;
      tN++;
      const y = (i / FRAME) | 0, x = i % FRAME;
      const d = ((y * N * FRAME) + f * FRAME + x) * 4;
      sheets.shirt[d] = tp[i * 4]; sheets.shirt[d + 1] = tp[i * 4 + 1];
      sheets.shirt[d + 2] = tp[i * 4 + 2]; sheets.shirt[d + 3] = 255;
    }
    rows.push({ f: f + 1, cN, lN, tN, sealed, bare });
  }

  console.log(`\n${dir}  (${N} frames)`);
  console.log(' fr   chest   legs   shirt   sealed   left-bare');
  for (const r of rows) {
    console.log(`  ${String(r.f).padStart(2)}  ${String(r.cN).padStart(6)} ${String(r.lN).padStart(6)} ` +
      `${String(r.tN).padStart(7)} ${String(r.sealed).padStart(8)} ${String(r.bare).padStart(11)}`);
  }
  console.log(`  sealed ${sealedTotal} px total; ${bareTotal} px left bare (head + hands, by design)`);

  /* QA composite: what the renderer actually shows with the full set worn --
     body with every gear-covered pixel masked away, then legs, then chest.
     Any SKIN visible in the result that is not head or hands is a hole. */
  if (PREVIEW) {
    const P = FRAME, W = 3 * P, H = 3 * P * 2;
    const out = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      const x = i % W, y = (i / W) | 0, c = (((x >> 4) + (y >> 4)) & 1) ? 64 : 48;
      out[i * 4] = c; out[i * 4 + 1] = c; out[i * 4 + 2] = c; out[i * 4 + 3] = 255;
    }
    const blit = (src, f, gx, gy, skinFlag) => {
      for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
        const s = ((y * N * P) + f * P + x) * 4;
        if (src[s + 3] < 128) continue;
        const d = ((gy + y) * W + gx + x) * 4;
        let r = src[s], g = src[s + 1], b = src[s + 2];
        if (skinFlag && isSkin(r, g, b)) { r = 255; g = 0; b = 255; }  /* exposed skin */
        out[d] = r; out[d + 1] = g; out[d + 2] = b;
      }
    };
    for (let f = 0; f < N; f++) {
      const gx = (f % 3) * P, gy = Math.floor(f / 3) * P;
      /* row block 1: plain composite.  row block 2: skin highlighted magenta. */
      for (const [blockY, hi] of [[0, false], [3 * P, true]]) {
        blit(maskedBody, f, gx, gy + blockY, hi);
        blit(sheets.legs, f, gx, gy + blockY, false);
        blit(sheets.chest, f, gx, gy + blockY, false);
      }
    }
    writeFileSync(PREVIEW.replace('DIR', dir), encode({ width: W, height: H, data: out }));
    console.log(`  wrote ${PREVIEW.replace('DIR', dir)} (lower block: magenta = skin still visible)`);
  }

  if (DRY) continue;
  for (const [slot, dirPath] of Object.entries(OUT)) {
    mkdirSync(dirPath, { recursive: true });
    const file = `${dirPath}/dodge-${dir}.png`;
    writeFileSync(file, encode({ width: N * FRAME, height: FRAME, data: sheets[slot] }));
    console.log(`  wrote ${file}`);
  }
}
