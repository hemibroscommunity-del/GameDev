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
 * v2.3.3842: AND NOT ON A MAC.  Chrome and Safari on a Mac build WebGL's
 * programs through ANGLE's Metal, which inlines as FXC does.  Nothing measured
 * a Mac (this box has neither), and the judges play on computers: a computer
 * has the memory the palette saves, so a Mac draws the old way too.  An iPad
 * asking for the desktop site says "Macintosh" but has touch points: it keeps
 * the palette, as an iPhone does.  Linux (the QA box) is unchanged.
 *
 * v2.3.5228 (card O PR 8): THE CHOICE IS A KNOB OF THE LANES.  The address
 * first, as before; then `laneKnob('look')`, the lanes' `look` knob, which is
 * 'palette' in every lane and pinned to 'baked' by an override where the
 * device is Windows or a Mac (drawLanes.js OVERRIDES).  Windows and a Mac
 * are asked of deviceProfile.js alone (onWindows, onMac moved there; they are
 * re-exported here for the old importers).  Every device gets the answer it
 * got before, with the same `why` (server/test/one-program.test.mjs).
 *
 * Imports only the lanes' table and the device profile (neither imports this
 * file), so node can test it (server/test/look-palette-choice.test.mjs).
 */
import { laneKnob, pinOf, askingAs } from './drawLanes.js';
import { devAsk, onWindows, onMac, useLookChoice } from './deviceProfile.js';

export { onWindows, onMac };

/** The look palette here, or not: the address first (`lookpalette=0|1`), then
 *  the lanes' `look` knob for the device these facts are (pinned 'baked' on
 *  Windows and a Mac: a computer's compiler may take minutes, and a computer
 *  has the memory), else on.  `{ on, why }`, why 'address' | 'windows' |
 *  'mac' | 'default'.  The search alone: this page's own device. */
export function lookPaletteChoice(search, ua, platform, touchPoints) {
  const m = /(^|[?&])lookpalette=([01])(&|$)/.exec(typeof search === 'string' ? search : '');
  if (m) return { on: m[2] === '1', why: 'address' };
  const read = () => {
    const pin = pinOf('look');
    return { on: laneKnob('look') === 'palette', why: pin ? pin.when : 'default' };
  };
  /* the search alone: this page's own device (deviceProfile.js's answers,
     handed to the lanes); facts given, those facts, even an empty user agent */
  return arguments.length <= 1 ? read() : askingAs(devAsk({ ua, platform, touch: touchPoints }), read);
}

/* the device profile's `palette` (the Speed test's card) */
useLookChoice(lookPaletteChoice);
