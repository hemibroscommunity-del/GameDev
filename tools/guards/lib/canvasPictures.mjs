/* ═══ v2.3.5782: A PICTURE MADE ON A CANVAS GOES THROUGH THE MEMORY LAW (card U2 PR 3; CLAUDE.md §8 row "a picture made on a canvas") ═══
 *
 * CLAUDE.md §7 (MEMORY IS BUDGETED): a picture the game draws on a canvas is
 * `keepOnGpuOnly` when nothing reads it back (gpuOnly.js), `keepAsImage` when
 * something reads it but nothing draws into it again (canvasWitness.js), or
 * colour numbers (paletteTex.js makePaletteSource, heldNumbers.js).  gpu-only
 * and keep-as-image hold the helpers; nothing held their callers.
 *
 * A SITE is a texture made from something other than a file: a
 * `Texture.from(x)` whose argument is not a string, an image, a bitmap, a
 * video or an address (`img`, `image`, `url`, `src`, `bitmap`, `video` in
 * its first word, or a `createImageBitmap`), or a `new CanvasSource(`.
 * A site GOES THROUGH the law when one of the helpers is named within
 * WINDOW characters either side of it in the code (comments dropped,
 * whitespace minified: codeOnly.mjs): the same function, give or take.
 * A reading, not a proof: a census (rule 3) whose total only falls
 * (./canvasPicturesKnown.mjs).
 */
import { codeOf } from './codeOnly.mjs';

export const WINDOW = 1500;
export const HELPERS = /\b(?:keepOnGpuOnly|keepAsImage|emptyOnceDrawn|makePaletteSource|heldNumbers|numSrc)\b/;
const SITE = /\bTexture\.from\(\s*([^)]{0,80})|\bnew\s+CanvasSource\s*\(/g;
const FILE_LIKE = /img|image|url|src|bitmap|video|['"`]/i;

/** The sites in one file's code: [{ at, text, through }]. */
export function sitesIn(code) {
  const out = [];
  for (const m of code.matchAll(SITE)) {
    if (m[1] !== undefined) {
      const first = m[1].trim().split(/[\s,)?:]/)[0];
      if (!first || FILE_LIKE.test(first) || /createImageBitmap/.test(m[1])) continue;
    }
    const near = code.slice(Math.max(0, m.index - WINDOW), m.index + WINDOW);
    out.push({ at: m.index, text: code.slice(m.index, m.index + 60), through: HELPERS.test(near) });
  }
  return out;
}

/** Every site under src/: { all: [{ file, text, through }], bare: [...not through] }. */
export function canvasPictures() {
  const all = [];
  for (const [file, code] of codeOf(['src'])) for (const s of sitesIn(code)) all.push({ file, ...s });
  return { all, bare: all.filter((s) => !s.through) };
}
