/* ═══ v2.3.1926: WHAT A TRAIT IS MADE OF, SO A RECOLOUR CAN LEAVE THE REST ═══
 *
 * Owner: "sometimes it colors over spots it shouldn't.  Like the Kermit hat's
 * eyes should stay white and the rest of the hat's color is the only thing
 * that should change" — then, on a first attempt that guessed per pixel: "you
 * would have to understand the pattern of each item before assigning a
 * recoloring" — and "also leaving outlines alone (black outline)".
 *
 * The recolour is a brightness-RATIO pass (`target * luminance / ref`, see
 * recolorHairToCanvas).  It has no notion of which pixel is the hat and which
 * is a detail painted on it, so a white eye — high luminance — comes out as a
 * bright version of the chosen colour.  Same for the shark hat's teeth, the
 * old-school helmet's stripe, the top hat's band and the sombrero's
 * embroidery.
 *
 * ── MATERIALS ──
 * A material is one hue that varies only in LIGHT: the fabric and its own
 * shadow are the same material, a white eye is a different one.  So the art is
 * grouped by hue family, with two extra bands for the colours that have no
 * hue — near-black and near-white — because a keyline and a highlight are
 * different materials with the same (absent) chromaticity.  Measured on the
 * shipped art this comes out clean and semantic:
 *
 *     kermit-hat          green 80%   black 16%   WHITE 2%
 *     shark-hat           blue  69%   black 16%   WHITE 14%
 *     top-hat             black 85%   ORANGE 11%
 *     old-school-helmet   cream 43%   TEAL 28%    black 21%
 *     crown               gold  69%   black 23%   RED 8%
 *     red-cap             red   75%   black 25%
 *
 * ── THE RULE ──
 * The BIGGEST material is the hat's own colour and is recoloured exactly as it
 * is today.  Every other material keeps its own colour.  That one sentence
 * covers all of it: the eyes, the teeth, the band, the stripe, the gems, the
 * embroidery — and the outline, which is a material in its own right and is
 * never the biggest one on a hat that has a colour.
 *
 * It also carries its own safety property, per item rather than in aggregate:
 * a single-tone hat has ONE material, so every pixel is in it and the output
 * is identical to today.  That is a property of the decomposition rather than
 * something to hope for — bucket-hat-2 (100% one material) was rendered in
 * five colours against the shipped path and came out byte-identical.
 *
 * ── WHY NOT A HUE SHIFT ──
 * Rotating every pixel's hue by (target - the hat's own hue) is more elegant
 * and needs no notion of materials at all: whites, greys and blacks have no
 * hue and no saturation, so eyes, teeth and outlines survive for free.  It was
 * built and rendered.  Two things ruled it out.  It cannot work on the 14 hats
 * whose largest material is neutral (the white helmet, the black top hat) —
 * there is no hue to shift FROM.  And where it does work it drags coloured
 * accents along: the top hat's orange band came out magenta on a green hat.
 * The relationship is preserved, which is what was asked for, but it is not
 * what anyone wants to look at.
 */

const NEUTRAL_S = 0.18;   /* below this a pixel has no meaningful hue */
const DARK_V = 0.20;      /* ...and below this its hue is noise: (8,4,8) reads as magenta */
const LIGHT_V = 0.45;     /* neutral split: keyline below, highlight above */
const MIN_SHARE = 0.004;  /* a material smaller than this is anti-aliasing */

function hsv(r, g, b) {
  const M = Math.max(r, g, b), m = Math.min(r, g, b), c = M - m;
  let h = 0;
  if (c) h = 60 * (M === r ? ((g - b) / c + 6) % 6 : M === g ? (b - r) / c + 2 : (r - g) / c + 4);
  return [h, M ? c / M : 0, M / 255];
}
function angDist(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Decompose a trait into its materials, pooled over ALL its facings.
 * Pooling matters for the same reason the recolour reference is pooled
 * (v2.3.1109): decided per facing, one angle could spare a detail the next
 * angle repaints, and the hat would change as the character turned.
 *
 * @param {Array<Uint8ClampedArray|Uint8Array>} chunks  RGBA pixel runs
 * @returns {Array<{kind:'hue'|'dark'|'light', hue?:number, share:number}>}
 *          biggest first
 */
export function segmentMaterials(chunks) {
  const bins = new Float64Array(36);   /* 10-degree hue bins */
  let darkN = 0, lightN = 0, n = 0;
  const each = (fn) => {
    for (const d of chunks) {
      if (!d) continue;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 30) fn(d[i], d[i + 1], d[i + 2]);
    }
  };
  each((r, g, b) => {
    n++;
    const [h, s, v] = hsv(r, g, b);
    if (v < DARK_V || s < NEUTRAL_S) { if (v < LIGHT_V) darkN++; else lightN++; return; }
    bins[Math.floor(h / 10) % 36] += 1;
  });
  if (!n) return [];

  /* Merge adjacent bins into families.  This art is anti-aliased — 1122
     distinct colours in the Kermit hat's 1677 pixels — so one material spreads
     across neighbouring bins and a per-bin reading would split it. */
  const used = new Uint8Array(36);
  const out = [];
  for (;;) {
    let best = -1, bv = 0;
    for (let i = 0; i < 36; i++) if (!used[i] && bins[i] > bv) { bv = bins[i]; best = i; }
    if (best < 0 || bv < n * MIN_SHARE) break;
    /* Walk OUT from the peak while the histogram is still falling, instead of
       taking a fixed window.  One material's shading is a continuous run of
       bins -- the army helmet's green spans 135 deg to 141 deg, the russian
       hat's brown 25 to 33 -- and a fixed window cut those in half, so half of
       each hat's own fabric was left behind as a phantom "accent" and kept its
       original colour in patches.  Stopping when the count climbs again is
       what separates that from a real second material: the crown's red gems
       are 30 deg off its gold, but there is a valley between them. */
    let mass = 0, hs = 0, hc = 0;
    const take = (j) => {
      used[j] = 1; mass += bins[j];
      const a = ((j * 10 + 5) * Math.PI) / 180;
      hs += bins[j] * Math.sin(a); hc += bins[j] * Math.cos(a);
    };
    take(best);
    for (const step of [-1, 1]) {
      let prev = bv;
      for (let o = 1; o < 18; o++) {
        const j = (best + step * o + 36) % 36;
        if (used[j] || bins[j] < bv * 0.05 || bins[j] > prev * 1.3) break;
        prev = bins[j]; take(j);
      }
    }
    if (!mass) break;
    out.push({ kind: 'hue', hue: ((Math.atan2(hs, hc) * 180) / Math.PI + 360) % 360, share: mass / n });
  }
  if (darkN / n > MIN_SHARE) out.push({ kind: 'dark', share: darkN / n });
  if (lightN / n > MIN_SHARE) out.push({ kind: 'light', share: lightN / n });
  return out.sort((a, b) => b.share - a.share);
}

/** Index of the material a pixel belongs to, or -1. */
export function materialIndex(r, g, b, mats) {
  const [h, s, v] = hsv(r, g, b);
  if (v < DARK_V || s < NEUTRAL_S) {
    const want = v < LIGHT_V ? 'dark' : 'light';
    let i = mats.findIndex((x) => x.kind === want);
    /* A hat with no highlight material at all (the red cap has only fabric and
       keyline) still has the odd pale anti-aliased pixel; put it on whichever
       neutral band exists rather than dropping it out of the recolour. */
    if (i < 0) i = mats.findIndex((x) => x.kind === 'dark' || x.kind === 'light');
    return i;
  }
  let bi = -1, bd = Infinity;
  for (let i = 0; i < mats.length; i++) {
    if (mats[i].kind !== 'hue') continue;
    const d = angDist(h, mats[i].hue);
    if (d < bd) { bd = d; bi = i; }
  }
  /* All-neutral art (bucket-hat-2 is 100% dark) has no hue material to fall
     back on; treat a stray saturated pixel as part of the neutral body. */
  if (bi < 0) bi = mats.findIndex((x) => x.kind === 'dark' || x.kind === 'light');
  return bi;
}

/* ── THE PER-ITEM CALLS ──
 *
 * The automatic pick is the biggest material, and rendered against every hat it
 * is right for most of them.  It is not right for all, and colour alone cannot
 * tell you which — that is the owner's point ("you would have to understand the
 * pattern of each item").  These are the ones that were looked at and decided,
 * with what was actually on screen written down next to each.
 *
 *   'all'  = recolour every pixel, exactly as the game does today.  For a hat
 *            whose "other materials" are not features at all but its own
 *            highlight and shadow: sparing those leaves a gold streak down a
 *            green bucket or a pair of dark-red horns on a green band.
 *   a hue  = the biggest material is the hat's SHADOW, not the hat.  Three hats
 *            are drawn dark enough that their shading outweighs their fabric.
 *
 * Everything not named here takes the automatic pick.
 *
 * Object.create(null): keyed by a trait id that arrives from a saved
 * appearance, and a plain {} silently no-ops on '__proto__' (CLAUDE.md rule 4).
 */
export const MAIN_MATERIAL = Object.create(null);
/* the biggest material is the shading, not the fabric */
MAIN_MATERIAL['sombrero'] = 18;      /* dark 46% is the underbrim; hue18 is the straw */
/* no features to spare -- what the segmenter finds is this hat's own lighting */
MAIN_MATERIAL['golden-bucket'] = 'all';  /* the "light" material is one specular streak */
MAIN_MATERIAL['devil-horns'] = 'all';    /* the "dark" material IS the horns, not an outline */
MAIN_MATERIAL['russian-hat'] = 'all';    /* fur reads as speckle; keeping it looks dirty */
MAIN_MATERIAL['wizard-hat'] = 'all';     /* the pale band is the brim's light side */
MAIN_MATERIAL['axe-head'] = 'all';       /* handle, blade and edge are three real materials
                                            and no one of them is "the hat" */
MAIN_MATERIAL['bucket-hat'] = 'all';     /* re-rendered on hue44 too: its dark half is the
                                            brim's shadow, and sparing it leaves the hat
                                            two-tone in a way the art never was */

/** Which material index recolours for this trait; -1 means recolour everything. */
export function mainMaterial(traitId, mats) {
  const want = MAIN_MATERIAL[traitId];
  if (want === 'all') return -1;
  if (want != null && mats.length) {
    const i = typeof want === 'number'
      ? mats.findIndex((x) => x.kind === 'hue' && angDist(x.hue, want) <= 20)
      : mats.findIndex((x) => x.kind === want);
    if (i >= 0) return i;
  }
  return mats.length ? 0 : -1;   /* segmentMaterials sorts biggest first */
}
