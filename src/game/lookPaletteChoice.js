/* ═══ v2.3.3838: THE LOOK PALETTE IS NOT BUILT ON WINDOWS ═══
 *
 * The owner, 2026-10-29, on a Windows laptop in Chrome and in Firefox: the
 * loading screen "stalls at the 75%, I wait what seems like 5-10 minutes,
 * loading bar goes to full", then "I'm back" -- the worker had logged the
 * character out for idling while the page stood frozen.  The judges play on
 * computers.
 *
 * WHY.  Both browsers draw WebGL on Windows through ANGLE's Direct3D, and its
 * shader compiler (FXC) inlines every function call.  The look palette's
 * fragment program (rendering/lookPalette.js) reads a sheet's header, then
 * runs its bilinear read twice, the second through a mip level of 2x2 boxes:
 * about eighty colourAt()s once inlined, each with every registered kind (the
 * shirt's, the head's, the stand-ins') and each read through the slot chain --
 * thousands of texture reads in one flat program.  Its prewarm, behind the
 * loading screen, asks whether it linked (lookPalette.js prewarmProgram), and
 * that question waits for the compile: the page, the beach clip with it,
 * stood still for minutes.  A phone builds it in well under a second (iPhone:
 * Metal; Android: GLES), and so does the QA box (SwiftShader).
 *
 * WHAT.  A computer on Windows keeps the old way: each look's copy baked on
 * first sight, as before the look palette (v2.3.3716) -- the same pixels, more
 * memory, which a computer has to spare (the palette is a phone's memory
 * saver: docs/MEMORY-MAP.md).  `?lookpalette=0` is off anywhere, as before;
 * `?lookpalette=1` builds it anyway, Windows too (QA).  Phones are unchanged.
 *
 * No imports, so node can test it (server/test/look-palette-choice.test.mjs).
 */

const WINDOWS_UA = /\bWindows\b|\bWin64\b|\bWin32\b/;

/** Is this browser on Windows (its user agent, or Chromium's own platform)? */
export function onWindows(ua, platform) {
  if (typeof platform === 'string' && /^windows$/i.test(platform.trim())) return true;
  return WINDOWS_UA.test(typeof ua === 'string' ? ua : '');
}

/** The look palette here, or not: the address first (`lookpalette=0|1`), then
 *  Windows (not built: its compiler takes minutes), else on.  `{ on, why }`. */
export function lookPaletteChoice(search, ua, platform) {
  const m = /(^|[?&])lookpalette=([01])(&|$)/.exec(typeof search === 'string' ? search : '');
  if (m) return { on: m[2] === '1', why: 'address' };
  if (onWindows(ua, platform)) return { on: false, why: 'windows' };
  return { on: true, why: 'default' };
}
