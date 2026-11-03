/* ═══ v2.3.3957: YOUR PORTRAIT IS A HEMI BRO -- THE COMPOSITOR ═══
 *
 * The owner, 2026-11-03: "For profile picture art I want it in the style of
 * the original hemi bro NFT's as much as possible with the custom stuff added
 * on to it."  Hemi Bros, the collection the game is named for, is 3,333 busts
 * of 32 x 32 pixels turned to the viewer's left on a flat background.  The
 * townsfolk's dialogue heads are such busts already, stacked from the
 * collection's own trait layers by tools/qa/nft_portraits.py
 * (docs/specs/npc-creator-looks.md, "The dialogue portraits are Hemi Bros").
 * This is that tool's bake PORTED, rule for rule, so the game can stack a
 * bust for any look in the page: nothing here is a new rule.
 *
 *   - the skin is recoloured from the orange bro by brightness (`reskin`);
 *   - a recoloured trait keeps the collection's outline colour and puts every
 *     other colour on a ramp in its own order of brightness (`ramp`);
 *   - an eyewear's glass is a see-through tint, blended over what is under it
 *     (`over`; the tint is in the layer's alpha, found by the extract);
 *   - the tee is the collection's plain tee, its outline and light kept, every
 *     other cell the shirt colour or the pattern's ink (`tee`);
 *   - the beard is the collection's jaw beard grown long (`longBeard`);
 *   - a logo the game's piece has not got is painted out (`relogo`).
 *
 * Pure: pixel arrays in, a pixel array out.  No DOM, no Pixi, no imports, so
 * node runs it (server/test/hemi-portrait.test.mjs rebuilds the townsfolk's
 * baked busts with it, pixel for pixel).  A layer is a Uint8Array of
 * 32 x 32 x 4 (RGBA, straight alpha); the bust is the same, every alpha 255.
 *
 * Numbers that look odd are numpy's: `rint` is np.round (half to even), and
 * every `Math.trunc` is a float written into a uint8 array, which truncates.
 * Python's `//` and `%` floor (`fdiv`, `fmod`).  Change one and the busts
 * drift a level off the townsfolk's. */

export const GRID = 32;
export const OUTLINE = [31, 13, 27];          /* the collection's one outline colour, in every layer */
export const SKIN_REF = [233, 153, 73];        /* the bro's own orange, which the collection's every Bro wears */
export const SKIN_FAMILY = [[233, 153, 73], [224, 147, 70], [189, 124, 59], [148, 97, 46]];
export const TEE_MAIN = [247, 159, 50];        /* the plain tee's fill: the light a cell is measured against */
export const TEE = 'yellowshirt';
/* the order the collection stacks them (nft_portraits.py STACK) */
export const STACK = ['clothes', 'eyes', 'eyewear', 'hair', 'headwear', 'mouth'];

export function lum(c) { return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; }

/* np.round: half to even */
export function rint(x) {
  const f = Math.floor(x), d = x - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return (f % 2 === 0) ? f : f + 1;
}
const fdiv = (a, b) => Math.floor(a / b);
const fmod = (a, b) => ((a % b) + b) % b;
const clip255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const near = (c, o, i, tol) => Math.abs(c[i] - o[0]) + Math.abs(c[i + 1] - o[1]) + Math.abs(c[i + 2] - o[2]) <= tol;

export function blank() { return new Uint8Array(GRID * GRID * 4); }
export function copy(lay) { return new Uint8Array(lay); }

/** top over base, in place; a see-through cell (a lens) blends with what is
 *  under it (nft_portraits.py _over) */
export function over(base, top) {
  for (let i = 0; i < base.length; i += 4) {
    const a = top[i + 3];
    if (!a) continue;
    const k = a / 255;
    for (let c = 0; c < 3; c++) base[i + c] = rint(base[i + c] * (1 - k) + top[i + c] * k);
  }
  return base;
}

/** the bro's orange skin (and the eyes' own skin shading) to a game tone, by
 *  brightness, as the game's own recolour does (_reskin) */
export function reskin(lay, target) {
  const out = copy(lay);
  const ref = lum(SKIN_REF);
  for (let i = 0; i < lay.length; i += 4) {
    if (!lay[i + 3]) continue;
    let fam = false;
    for (const s of SKIN_FAMILY) if (near(lay, s, i, 24)) { fam = true; break; }
    if (!fam) continue;
    const r = lum([lay[i], lay[i + 1], lay[i + 2]]) / ref;
    for (let c = 0; c < 3; c++) out[i + c] = Math.trunc(clip255(target[c] * r));
  }
  return out;
}

/** every colour but the outline onto lo..hi, in its own order of brightness
 *  (_ramp).  Only the collection's outline colour stays: a dark shade kept as
 *  it was left half a grey afro black. */
export function ramp(lay, lo, hi) {
  const out = copy(lay);
  const seen = new Map();
  for (let i = 0; i < lay.length; i += 4) {
    if (!lay[i + 3] || near(lay, OUTLINE, i, 12)) continue;
    const key = (lay[i] << 16) | (lay[i + 1] << 8) | lay[i + 2];
    if (!seen.has(key)) seen.set(key, lum([lay[i], lay[i + 1], lay[i + 2]]));
  }
  if (!seen.size) return out;
  let l0 = Infinity, l1 = -Infinity;
  for (const l of seen.values()) { if (l < l0) l0 = l; if (l > l1) l1 = l; }
  for (let i = 0; i < lay.length; i += 4) {
    if (!lay[i + 3]) continue;
    const l = seen.get((lay[i] << 16) | (lay[i + 1] << 8) | lay[i + 2]);
    if (l === undefined) continue;
    const t = l1 === l0 ? 0 : (l - l0) / (l1 - l0);
    for (let c = 0; c < 3; c++) out[i + c] = Math.trunc(lo[c] + (hi[c] - lo[c]) * t);
  }
  return out;
}

/** the ramp a single colour gives (the beard's: nft_portraits.py bake) */
export function rampOf(t) {
  return [t.map((v) => Math.trunc(v * 0.55)), t.map((v) => Math.min(255, Math.trunc(v * 1.3)))];
}

/** a logo the game's piece does not wear, painted over in the piece's own colour */
export function relogo(lay, ink, fill) {
  const out = copy(lay);
  for (let i = 0; i < lay.length; i += 4) {
    if (lay[i + 3] && near(lay, ink, i, 12)) { out[i] = fill[0]; out[i + 1] = fill[1]; out[i + 2] = fill[2]; }
  }
  return out;
}

/** a layer cut off from a row down */
export function trim(lay, row) {
  const out = copy(lay);
  out.fill(0, Math.max(0, row) * GRID * 4);
  return out;
}

/** the T-shirt as the game dresses it: the collection's tee with its outline,
 *  every other cell the shirt colour or, where the pattern inks it, the
 *  pattern's colour -- each lit as the collection lit that cell (tee).
 *  `tile` {w, h, cells} is the game's own (patternCatalog.js), `cell` bust px a
 *  tile cell, from (`ox`, `oy`). */
export function tee(base, shirt, tile, ink, ox = 0, oy = 0, cell = 1) {
  const out = blank();
  const lm = lum(TEE_MAIN);
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = (y * GRID + x) * 4;
      if (!base[i + 3]) continue;
      out[i + 3] = 255;
      if (near(base, OUTLINE, i, 12)) { out[i] = OUTLINE[0]; out[i + 1] = OUTLINE[1]; out[i + 2] = OUTLINE[2]; continue; }
      let col = shirt;
      if (tile && ink) {
        const tx = fmod(fdiv(x - ox, cell), tile.w), ty = fmod(fdiv(y - oy, cell), tile.h);
        if (tile.cells.charCodeAt(ty * tile.w + tx) === 49) col = ink;
      }
      const k = lum([base[i], base[i + 1], base[i + 2]]) / lm;
      for (let c = 0; c < 3; c++) out[i + c] = Math.trunc(clip255(col[c] * k));
    }
  }
  return out;
}

/* The long beard's outline, row by row from the jaw down (LONG_BEARD): the
   world's beards reach the middle of the chest. */
export const BEARD_JAW = 22;
export const LONG_BEARD = { 23: [8, 19], 24: [8, 19], 25: [8, 19], 26: [8, 19], 27: [8, 19], 28: [9, 19], 29: [9, 18], 30: [10, 18], 31: [10, 17] };

/** the collection's beard grown long, in its own colours (a ramp gives it the
 *  player's): lit from the front-left, every third column a strand a shade
 *  darker (long_beard) */
export function longBeard(beard) {
  const lay = trim(beard, BEARD_JAW + 1);
  const hi = [114, 74, 56], mid = [91, 59, 47], lo = [83, 53, 43], dark = [66, 42, 36], deep = [50, 31, 27];
  for (const k of Object.keys(LONG_BEARD)) {
    const y = Number(k), [x0, x1] = LONG_BEARD[k];
    for (let x = x0; x <= x1; x++) {
      let c;
      if (x === x0 || x === x1) c = OUTLINE;
      else {
        const i = x - x0 - 1, n = x1 - x0 - 1;
        const t = i / Math.max(1, n - 1);
        c = t < 0.25 ? hi : t < 0.55 ? mid : t < 0.8 ? lo : dark;
        if (i % 3 === 2) c = c === hi ? mid : c === mid ? lo : c === lo ? dark : deep;
      }
      const o = (y * GRID + x) * 4;
      lay[o] = c[0]; lay[o + 1] = c[1]; lay[o + 2] = c[2]; lay[o + 3] = 255;
    }
  }
  return lay;
}

/* ═══ THE BUST ═══
 * `layers` name -> layer (the atlas's, or the source files' in the test);
 * `recipe`:
 *   bg       [r, g, b]          one of the collection's flat backgrounds
 *   skin     [r, g, b] | null   the game's tone; null keeps the bro's orange
 *   shirt    null | { color, tile, ink, ox, oy, cell }   null: bare chest
 *   eyes     layer name
 *   eyewear, hair, headwear: null | { name, relogo: [[ink, fill]], trim: row, ramp: [lo, hi] }
 *   beard    null | { ramp: [lo, hi] | null }   the long beard
 * Each piece is laid as the bake lays it: relogo, trim, ramp, then over. */
export function composeBust(layers, recipe) {
  const need = (n) => {
    const l = layers[n];
    if (!l) throw new Error('hemi bust: no layer ' + n);
    return l;
  };
  const img = blank();
  for (let i = 0; i < img.length; i += 4) {
    img[i] = recipe.bg[0]; img[i + 1] = recipe.bg[1]; img[i + 2] = recipe.bg[2]; img[i + 3] = 255;
  }
  const skinned = (lay) => (recipe.skin ? reskin(lay, recipe.skin) : lay);
  over(img, skinned(need('bro')));
  for (const slot of STACK) {
    if (slot === 'clothes') {
      const s = recipe.shirt;
      if (s) over(img, tee(need(TEE), s.color, s.tile || null, s.ink || null, s.ox || 0, s.oy || 0, s.cell || 1));
      continue;
    }
    if (slot === 'eyes') {
      if (recipe.eyes) over(img, skinned(need(recipe.eyes)));
      continue;
    }
    if (slot === 'mouth') {
      const b = recipe.beard;
      if (b) {
        let lay = longBeard(need('beard'));
        if (b.ramp) lay = ramp(lay, b.ramp[0], b.ramp[1]);
        over(img, lay);
      }
      continue;
    }
    const p = recipe[slot];
    if (!p) continue;
    let lay = need(p.name);
    for (const [ink, fill] of (p.relogo || [])) lay = relogo(lay, ink, fill);
    if (p.trim != null) lay = trim(lay, p.trim);
    if (p.ramp) lay = ramp(lay, p.ramp[0], p.ramp[1]);
    over(img, lay);
  }
  return img;
}

/** whole numbers only, nearest neighbour: every bust pixel an s x s block */
export function upscale(px, s, w = GRID, h = GRID) {
  const W = w * s, out = new Uint8ClampedArray(W * h * s * 4);
  for (let y = 0; y < h * s; y++) {
    const sy = (y / s) | 0;
    for (let x = 0; x < W; x++) {
      const si = (sy * w + ((x / s) | 0)) * 4, o = (y * W + x) * 4;
      out[o] = px[si]; out[o + 1] = px[si + 1]; out[o + 2] = px[si + 2]; out[o + 3] = 255;
    }
  }
  return out;
}

/** the atlas, read as RGBA, cut into its layers (name -> Uint8Array) */
export function sliceAtlas(rgba, width, names, cols, cell = GRID) {
  const out = Object.create(null);   /* keyed by layer names (CLAUDE.md: never a plain {}) */
  names.forEach((name, n) => {
    const ox = (n % cols) * cell, oy = Math.floor(n / cols) * cell;
    const lay = blank();
    for (let y = 0; y < cell; y++) {
      lay.set(rgba.subarray(((oy + y) * width + ox) * 4, ((oy + y) * width + ox + cell) * 4), y * cell * 4);
    }
    out[name] = lay;
  });
  return out;
}
