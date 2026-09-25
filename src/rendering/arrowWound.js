/* ═══ v2.3.2923: AN ARROW GOES INTO SOMETHING ═══
 *
 * Owner: "Arrows that stick in monsters need to have their material around
 * the arrow injection site. like slimes especially need some kind of effect
 * because it looks like a headless arrow was just stickered on top of the
 * slime. I want it to look like the arrows are actually puncturing the enemy."
 *
 * WHAT IT WAS.  v2.3.1765 buried the head (a tip drawn over the body it is
 * embedded in is the one place it can never be seen) and v2.3.1825 pinned the
 * headless pine shaft by its cut end on the impact point.  Right as far as it
 * went -- but nothing marked the surface, so the cut end of the shaft sat on
 * top of the monster's art like a sticker.
 *
 * WHAT IT IS NOW.  Two passes round every stuck shaft, in the monster's own
 * material (the HIT_MATERIALS `fx`/`kind` and hitFxTintOf colour the hit
 * spray already uses, so a recoloured slime's wound follows its recolour):
 *   THE WOUND, under the shaft: the crater the arrow punched -- a collar of
 *   displaced material, a darker dimple, the hole itself -- plus what that
 *   material does next: goo and blood drip and run down, snow crumbles at the
 *   rim, bone and stone crack outward, linen frays, the goblin's embers glow.
 *   THE LIP, over the shaft: a little of the material climbing the shaft at
 *   the entry, so the shaft reads as going IN rather than stopping at a line.
 *   The slime's gel collar wobbles for the first half-second -- the hit
 *   landing in something soft.
 *
 * Every irregular piece (crack angles, rim chips, drip lengths) is seeded per
 * arrow, so a wound holds its shape frame to frame and no two look the same.
 *
 * NOTHING TO PRELOAD: Graphics calls only -- the animation-preloading law has
 * nothing to register.  LEAF MODULE: draws into a Graphics it is handed. */

const WOUND_SCALE = 1.45;

function mix(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (((ar + (br - ar) * t) | 0) << 16) | (((ag + (bg - ag) * t) | 0) << 8) | ((ab + (bb - ab) * t) | 0);
}
const darker = (c, t) => mix(c, 0x000000, t);
const lighter = (c, t) => mix(c, 0xffffff, t);

/* A small deterministic sequence from the arrow's seed (xorshift-ish). */
function seq(seed) {
  let s = ((seed * 2147483647) | 0) || 0x2f6b1d;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

/* An ellipse rotated by `rot`, as a closed polygon (Graphics.ellipse cannot
   rotate).  `rx` runs ACROSS the shaft, `ry` along it. */
function ell(gfx, cx, cy, rx, ry, rot, color, alpha) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const N = 14;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const lx = Math.cos(t) * ry, ly = Math.sin(t) * rx;
    const x = cx + lx * c - ly * s, y = cy + lx * s + ly * c;
    if (i === 0) gfx.moveTo(x, y); else gfx.lineTo(x, y);
  }
  gfx.closePath();
  gfx.fill({ color, alpha });
}

function line(gfx, x0, y0, x1, y1, w, color, alpha) {
  gfx.moveTo(x0, y0);
  gfx.lineTo(x1, y1);
  gfx.stroke({ color, width: w, alpha, cap: 'round' });
}

/* A drip running DOWN the screen from the wound: grows over ~1.4 s, then holds
   (a monster does not bleed out through one arrow). */
function drip(gfx, x, y, k, age, rand, color) {
  const n = rand() < 0.45 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const dx = (rand() - 0.5) * 3.2 * k;
    const maxLen = (3.5 + rand() * 4.5) * k;
    const t = Math.min(1, Math.max(0, (age - 60 - i * 260) / 1400));
    const len = maxLen * (1 - (1 - t) * (1 - t));
    if (len < 0.4 * k) continue;
    line(gfx, x + dx, y + 1.2 * k, x + dx, y + 1.2 * k + len, 1.35 * k, color, 0.9);
    gfx.circle(x + dx, y + 1.2 * k + len, 1.05 * k);
    gfx.fill({ color, alpha: 0.95 });
  }
}

/** The wound under the shaft.  (x, y) is the impact point, `ang` the flight
 *  angle (the shaft runs back out along ang + PI), `k` the monster's draw
 *  scale, `mat` its HIT_MATERIALS entry, `tint` its hit-fx colour, `age` ms
 *  since the arrow landed. */
export function drawArrowWound(gfx, x, y, ang, k0, mat, tint, age, seed) {
  /* sized against the painted pine shaft (measured in-game: at 1x the wound
     read as a thin ring beside a shaft that thick) */
  const k = k0 * WOUND_SCALE;
  const kind = (mat && (mat.fx || mat.kind)) || 'goo';
  const rand = seq(seed == null ? 0.37 : seed);
  /* The crater lies across the shaft: its long axis is perpendicular to the
     flight line, foreshortened along it. */
  const rot = ang;
  const bx = x - Math.cos(ang) * 0.6 * k, by = y - Math.sin(ang) * 0.6 * k;
  switch (kind) {
    case 'goo': {
      const wob = age < 520 ? Math.sin(age / 38) * Math.exp(-age / 170) : 0;
      const sq = 1 + wob * 0.35;
      ell(gfx, bx, by, 5.8 * k * sq, 4.1 * k / sq, rot, darker(tint, 0.2), 0.9);      /* the displaced collar's shadow */
      ell(gfx, bx - 0.4 * k, by - 0.5 * k, 5.0 * k * sq, 3.5 * k / sq, rot, lighter(tint, 0.12), 0.95);   /* the collar, bulging */
      ell(gfx, bx, by, 3.4 * k * sq, 2.4 * k / sq, rot, darker(tint, 0.45), 0.95);    /* the dimple */
      ell(gfx, bx, by, 1.9 * k, 1.5 * k, rot, darker(tint, 0.78), 0.9);                /* the hole */
      /* wet highlight on the collar's upper lip */
      ell(gfx, bx - 1.4 * k, by - 2.2 * k, 1.5 * k, 0.8 * k, 0, 0xffffff, 0.55);
      drip(gfx, bx, by, k, age, rand, darker(tint, 0.25));
      break;
    }
    case 'goblin': {
      ell(gfx, bx, by, 4.2 * k, 3.0 * k, rot, 0x8c1208, 0.75);
      ell(gfx, bx, by, 2.4 * k, 1.8 * k, rot, 0x3b0704, 0.9);
      /* scorched fringe: the goblin's skin chars where it tears */
      for (let i = 0; i < 4; i++) {
        const a = rand() * Math.PI * 2, r = (3.6 + rand() * 1.6) * k;
        gfx.circle(bx + Math.cos(a) * r, by + Math.sin(a) * r * 0.75, (0.6 + rand() * 0.5) * k);
        gfx.fill({ color: 0x17120f, alpha: 0.8 });
      }
      drip(gfx, bx, by, k, age, rand, 0x9e1c10);
      break;
    }
    case 'ember': {
      const glow = 0.55 + 0.25 * Math.sin(age / 140 + (seed || 0) * 6);
      ell(gfx, bx, by, 4.6 * k, 3.3 * k, rot, 0xff7d1c, 0.35 * glow + 0.15);
      ell(gfx, bx, by, 2.8 * k, 2.0 * k, rot, 0xffc451, glow);
      ell(gfx, bx, by, 1.4 * k, 1.1 * k, rot, 0x5c1d0b, 0.9);
      break;
    }
    case 'snow': {
      ell(gfx, bx, by, 5.0 * k, 3.5 * k, rot, 0xa3bfe2, 0.7);   /* the crater's shade */
      ell(gfx, bx, by, 2.5 * k, 1.9 * k, rot, 0x6e8fbc, 0.9);
      /* packed snow shoved up round the rim, bright on top */
      for (let i = 0; i < 6; i++) {
        const a = rand() * Math.PI * 2, r = (4.2 + rand() * 1.8) * k, s = (1.0 + rand() * 0.9) * k;
        const cx = bx + Math.cos(a) * r, cy = by + Math.sin(a) * r * 0.72;
        gfx.rect(cx - s / 2, cy - s / 2, s, s);
        gfx.fill({ color: 0x6e8fbc, alpha: 0.85 });
        gfx.rect(cx - s / 2, cy - s / 2 - 0.5 * k, s, s * 0.75);
        gfx.fill({ color: 0xffffff, alpha: 0.95 });
      }
      break;
    }
    case 'bone':
    case 'stone': {
      const dark = kind === 'bone' ? 0x5c4630 : darker(tint, 0.6);
      const chip = kind === 'bone' ? 0xf8e2ac : lighter(tint, 0.25);
      /* cracks running out from the hole, each with a kink */
      const n = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2;
        const r1 = (2.6 + rand() * 2.2) * k, r2 = r1 + (1.5 + rand() * 2.5) * k;
        const a2 = a + (rand() - 0.5) * 0.9;
        const mx = bx + Math.cos(a) * r1, my = by + Math.sin(a) * r1 * 0.75;
        line(gfx, bx, by, mx, my, 0.9 * k, dark, 0.85);
        line(gfx, mx, my, bx + Math.cos(a2) * r2, by + Math.sin(a2) * r2 * 0.75, 0.7 * k, dark, 0.7);
      }
      ell(gfx, bx, by, 3.0 * k, 2.2 * k, rot, dark, 0.55);
      ell(gfx, bx, by, 1.8 * k, 1.4 * k, rot, darker(dark, 0.5), 0.9);
      /* splinters lifted at the rim */
      for (let i = 0; i < 3; i++) {
        const a = rand() * Math.PI * 2, r = (2.4 + rand() * 1.2) * k, s = (0.8 + rand() * 0.6) * k;
        gfx.rect(bx + Math.cos(a) * r - s / 2, by + Math.sin(a) * r * 0.75 - s / 2, s, s);
        gfx.fill({ color: chip, alpha: 0.95 });
      }
      break;
    }
    case 'ash': {
      /* torn wrappings: frayed linen threads pulled in round the hole */
      for (let i = 0; i < 7; i++) {
        const a = rand() * Math.PI * 2, r0 = (1.6 + rand()) * k, r1 = r0 + (2.4 + rand() * 2.6) * k;
        line(gfx, bx + Math.cos(a) * r1, by + Math.sin(a) * r1 * 0.75,
          bx + Math.cos(a + 0.25) * r0, by + Math.sin(a + 0.25) * r0 * 0.75,
          0.8 * k, rand() < 0.5 ? 0xefe6cd : 0xb3a684, 0.95);
      }
      ell(gfx, bx, by, 3.0 * k, 2.2 * k, rot, 0x6a604c, 0.8);
      ell(gfx, bx, by, 1.7 * k, 1.3 * k, rot, 0x2b261e, 0.92);
      /* the puff of grave dust the hit knocked loose, hanging then gone */
      if (age < 900) {
        const t = age / 900;
        gfx.circle(bx, by - 2 * k - t * 4 * k, (2.5 + t * 4) * k);
        gfx.fill({ color: 0xcfc7b7, alpha: 0.35 * (1 - t) });
      }
      break;
    }
    default: {
      ell(gfx, bx, by, 3.6 * k, 2.6 * k, rot, darker(tint, 0.45), 0.8);
      ell(gfx, bx, by, 1.8 * k, 1.4 * k, rot, darker(tint, 0.8), 0.9);
    }
  }
}

/** The lip over the shaft: material standing up round it at the entry, so the
 *  cut end disappears INTO the body instead of stopping on it. */
export function drawArrowWoundLip(gfx, x, y, ang, k0, mat, tint, age) {
  const k = k0 * WOUND_SCALE;
  const kind = (mat && (mat.fx || mat.kind)) || 'goo';
  const c = Math.cos(ang), s = Math.sin(ang);
  /* centred a little way back up the shaft from the impact point */
  const lx = x - c * 1.1 * k, ly = y - s * 1.1 * k;
  switch (kind) {
    case 'goo': {
      const wob = age < 520 ? Math.sin(age / 38 + 1.2) * Math.exp(-age / 170) : 0;
      ell(gfx, lx, ly, 2.4 * k * (1 + wob * 0.3), 2.2 * k, ang, darker(tint, 0.15), 0.85);
      ell(gfx, lx - c * 0.5 * k, ly - s * 0.5 * k, 1.7 * k, 1.1 * k, ang, lighter(tint, 0.25), 0.7);
      gfx.circle(lx - 0.6 * k, ly - 1.1 * k, 0.55 * k);
      gfx.fill({ color: 0xffffff, alpha: 0.7 });
      break;
    }
    case 'goblin':
      ell(gfx, lx, ly, 2.0 * k, 1.4 * k, ang, 0x8c1208, 0.85);
      break;
    case 'ember':
      ell(gfx, lx, ly, 1.8 * k, 1.3 * k, ang, 0xffc451, 0.6);
      break;
    case 'snow':
      ell(gfx, lx, ly, 2.4 * k, 1.5 * k, ang, 0xffffff, 0.9);
      ell(gfx, lx + c * 0.6 * k, ly + s * 0.6 * k + 0.5 * k, 2.0 * k, 0.8 * k, ang, 0xa3bfe2, 0.7);
      break;
    case 'ash':
      line(gfx, lx - s * 2.2 * k, ly + c * 2.2 * k, lx + s * 1.6 * k, ly - c * 1.6 * k, 0.8 * k, 0xefe6cd, 0.9);
      break;
    case 'bone':
      ell(gfx, lx, ly, 1.8 * k, 1.1 * k, ang, 0xe6c886, 0.85);
      break;
    case 'stone':
      ell(gfx, lx, ly, 1.8 * k, 1.1 * k, ang, lighter(tint, 0.1), 0.85);
      break;
    default:
      ell(gfx, lx, ly, 1.8 * k, 1.2 * k, ang, tint, 0.6);
  }
}
