/* Colour arithmetic for QA scenarios (v2.3.2530)
 *
 * Added for the nameplate softening, which is a change whose whole risk is a
 * colour question: the plate had to get quieter WITHOUT the four difficulty
 * bands collapsing into each other at 2 px on a phone.  "It still looks
 * different to me" is not an answer that survives the next softening round, and
 * TRAPS §21 is explicit that counting coloured pixels in a crop is evidence
 * only against a control -- a 2 px ring over a textured scene is precisely the
 * crop where that fails.  So the question is answered as arithmetic on the
 * values the renderer reports it painted with, and the scenario asserts a
 * floor.
 *
 * Nothing here is BroTown-specific; it is WCAG relative luminance, Porter-Duff
 * source-over, and CIEDE2000, so any scenario with a colour claim can use it.
 *
 * WHY CIEDE2000 AND NOT A CHANNEL DIFFERENCE.  The pair at risk is yellow
 * (#F0DE2F) against orange (#F3821F), which differ by 3 in red and 92 in
 * green.  A naive RGB distance says they are far apart in one channel and
 * identical in another, and gives no useful single number; a perceptual metric
 * says how far apart an EYE puts them, which is the actual claim.  ΔE00 of 1 is
 * the just-noticeable difference under ideal viewing; 2-3 is "a careful side by
 * side comparison"; above ~10 is "nobody would call these the same colour".
 * The floor the plate is held to is far above that -- see the scenario.
 */

/** '#RRGGBB', 0xRRGGBB, or an existing [r,g,b] -> [r,g,b] 0..255.
 *  The array case is not decoration: `over()` below returns one, and its whole
 *  purpose is to be fed straight back into contrast() and deltaE00().  Without
 *  it a composited colour falls through to the numeric branch, gets bit-shifted
 *  as if an Array were an integer, and every measurement silently reads 0 --
 *  which is a green "the bands are identical" and a wrong contrast figure, both
 *  of which look like real results. */
export function rgb(c) {
  if (Array.isArray(c)) {
    return [0, 1, 2].map((i) => Math.min(255, Math.max(0, Number(c[i]) || 0)));
  }
  if (typeof c === 'string') {
    const h = c.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
}

const srgbToLinear = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

/** WCAG relative luminance. */
export function luminance(c) {
  const [r, g, b] = rgb(c);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG contrast ratio, 1..21. AA wants 4.5 for body text, 3.0 for large. */
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** `fg` drawn at `alpha` over `bg` (source-over), as [r,g,b].
 *  This is the operation a translucent Graphics fill performs, and it is LINEAR
 *  in fg -- which is the property the band-separation argument rests on: two
 *  colours drawn at the same alpha over the same background keep exactly
 *  `alpha` of the distance between them, whatever the background is. */
export function over(fg, alpha, bg) {
  const f = rgb(fg), b = rgb(bg);
  return [0, 1, 2].map((i) => alpha * f[i] + (1 - alpha) * b[i]);
}

function toLab(c) {
  const [r0, g0, b0] = rgb(c);
  const r = srgbToLinear(r0), g = srgbToLinear(g0), b = srgbToLinear(b0);
  let X = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  let Y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.0;
  let Z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIEDE2000 perceptual distance between two colours. */
export function deltaE00(c1, c2) {
  const [L1, a1, b1] = toLab(c1);
  const [L2, a2, b2] = toLab(c2);
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  let h1p = Math.atan2(b1, a1p) * deg; if (h1p < 0) h1p += 360;
  let h2p = Math.atan2(b2, a2p) * deg; if (h2p < 0) h2p += 360;
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * rad) / 2);
  const Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hbp;
  if (C1p * C2p === 0) hbp = h1p + h2p;
  else {
    hbp = (h1p + h2p) / 2;
    if (Math.abs(h1p - h2p) > 180) hbp += (h1p + h2p < 360) ? 180 : -180;
  }
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad)
    + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.20 * Math.cos((4 * hbp - 63) * rad);
  const dTh = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(Cbp, 7) / (Math.pow(Cbp, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lbp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const Sc = 1 + 0.045 * Cbp;
  const Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTh * rad) * Rc;
  return Math.sqrt(Math.pow(dLp / Sl, 2) + Math.pow(dCp / Sc, 2) + Math.pow(dHp / Sh, 2)
    + Rt * (dCp / Sc) * (dHp / Sh));
}

/* Backgrounds a world plate actually sits over in this game, plus the two
   mathematical extremes.  A softening argument has to hold over ALL of them --
   the frost snowfield is the bright case that a translucent plate washes out
   on, and the cave is the dark case a border loses itself in. */
export const SCENES = {
  'frost snow':  '#E8EEF2',
  'meadow':      '#5C8A3A',
  'town cobble': '#8A8175',
  'cave':        '#1A1614',
  'water':       '#2E6E9E',
  'pure white':  '#FFFFFF',
  'pure black':  '#000000',
};
