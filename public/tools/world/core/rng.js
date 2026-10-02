/* ═══ v2.3.2931: SEEDED RANDOMNESS FOR THE WORLD BLUEPRINT ═══
 *
 * The blueprint must come out IDENTICAL on every device -- the owner paints on
 * a phone and a desktop, and a square's template (and so its prompt) must not
 * depend on which one built it.  JavaScript engines agree bit-for-bit on + - *
 * / sqrt floor and on 32-bit integer maths, but NOT on Math.sin / cos / pow /
 * exp, which are allowed to differ in the last bits between V8 and Safari's
 * JavaScriptCore.  So nothing here, and nothing in layout.js, calls them.
 * Noise is value noise with a polynomial fade, hashed with Math.imul.
 */

/* mulberry32: small, fast, well distributed, and pure 32-bit integer maths. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Deterministic hash of an integer lattice point -> [0, 1). */
export function hash2(ix, iy, seed) {
  let h = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/* Value noise in [-1, 1], smooth (C1) between lattice points. */
export function valueNoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  const top = a + (b - a) * sx, bot = c + (d - c) * sx;
  return (top + (bot - top) * sy) * 2 - 1;
}

/* Fractal sum of `octaves` value-noise layers, each twice the frequency and
   half the weight of the last.  Normalised to roughly [-1, 1]. */
export function fbm(x, y, seed, octaves = 4) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * freq, y * freq, (seed + Math.imul(o + 1, 1013)) | 0);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/* A stable 32-bit FNV-1a hash of any number of typed arrays / strings --
   the blueprint's fingerprint, and the plan's. */
export function fnv1a(...parts) {
  let h = 0x811c9dc5;
  for (const p of parts) {
    if (typeof p === 'string') {
      for (let i = 0; i < p.length; i++) { h ^= p.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    } else {
      for (let i = 0; i < p.length; i++) { h ^= p[i] & 0xff; h = Math.imul(h, 0x01000193); }
    }
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
