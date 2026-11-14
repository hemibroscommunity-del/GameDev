/* ═══ v2.3.5120: ONE LIST OF HOLD NAMES (the grand plan's step 1.0) ═══
 *
 * A "hold" is a job that ran on the page's one thread between two frames and
 * held it (docs/specs/held-sweep.md).  Three lists named holds, and they did
 * not agree (docs/SHAPES.md part 7):
 *
 *   - the debt list, the families over their lines today
 *     (tools/qa/mp/held-budget.mjs `KNOWN`, card H's);
 *   - the sweep's families, named by the functions on a profiler's stack
 *     (tools/qa/mp/mp-heldsweep.mjs `FAMILIES`);
 *   - the phone's own notes, free strings (debug/madeLog.js `noteMade`:
 *     'strip made' on the phone was `strip-made` in the sweep).
 *
 * The field report (step 1.1) names the worst holds a phone met.  It can only
 * name what the sweep names if the phone's notes take the same names, so this
 * file is the ONE list, and noteMade keeps a note only under a name of it.
 *
 *   HOLD_NAMES  every name a hold may have.  It holds every name of the debt
 *               list, and KEEPS a name when its family comes off the debt
 *               list (it can come back).  A name is never renamed here alone:
 *               the debt list's names are card H's (with card A for this
 *               list), and the report's sink adds by name.
 *   MADE_AS     each string that reaches the ring of holds -> its name.  The
 *               callers of noteMade are not changed (their strings carry a
 *               pose, a facing, a file: the detail a test reads); this table
 *               says which hold each is.  A string no row maps is DROPPED.
 *   holdOf(s)   the name, or null.
 *
 * tools/guards/hold-names.test.mjs fails a debt-list name missing here, and a
 * noteMade call (or a call of a function that hands its string on to
 * noteMade) whose string no row maps.
 *
 * No imports: node reads it (the guard), and so does the page.  ASCII only
 * (CLAUDE.md §7).
 */

/** Every name a hold may have. */
export const HOLD_NAMES = Object.freeze([
  /* the sweep's families (mp-heldsweep.mjs FAMILIES), by the stack */
  'body-bake',          /* a body or head sheet recoloured for one look */
  'standin-bake',       /* a swing, bow or tool stand-in recoloured */
  'gear-sheet',         /* a gear or shirt sheet built */
  'head-piece',         /* a head piece (hair, hat, beard, eyes) coloured or cut */
  'masked-bake',        /* armour cut to the body */
  'strip-page',         /* a monster's strip unpacked on the page */
  'pack-page',          /* a sheet cropped and packed on the page */
  'strip-made',         /* a monster strip's texture made (read off the page) */
  'monster-recolour',   /* a monster recoloured on the page */
  'object-bases',       /* an object page's ground lines read */
  'object-page',        /* an object page loaded or placed */
  'screen-check',       /* the black-screen check reading the canvas */
  'portrait',           /* a portrait drawn */
  'map',                /* the World map redrawn */
  'codex',              /* the Codex's stage */
  'ground',             /* the ground laid or uploaded */
  'sound',              /* a sound decoded or started */
  'text',               /* words drawn on a canvas */
  'server-message',     /* a message from the server worked through */
  'gc',                 /* the browser's garbage collector */
  /* the debt list's names that are not a family of the sweep: a frame's own
     code, a window's redraw by its component ('ui:<Component>'), and a hold no
     family claims, named by the profiler's two outermost functions */
  'the frame itself',
  'ui:*',
  'other: wrapped > sweepPicsOnce',
  'other: BT_AUDIO$1._fold > foldToMono',
  'other: R > J',
  /* off the debt list (v2.3.4960), kept: a family can come back */
  'other: createObjectURL',
  'other: _flushOutbox > Wrapped.ws.send',
]);

const _NAMES = new Set(HOLD_NAMES);

/** Each string that reaches the ring of holds (perfTracker.recordExternal),
 *  as its writer passes it -> its name.  The first row that matches wins. */
export const MADE_AS = Object.freeze([
  /* BroTown.jsx: the black-screen check, its fenced read and its old copy */
  [/^screen check(?: \(copy\))?$/, 'screen-check'],
  /* playerSkins.js: `body ${pose}-${dir}` (the page's bake, and the page's
     part of the worker's), `head ${pose}-${dir}` (an armoured head) */
  [/^(?:body|head) /, 'body-bake'],
  /* gearSheets.js, effectsRenderer.js (through bodyBake.js noteWorkerSheet):
     a drawn shirt's sheet */
  [/^shirt /, 'gear-sheet'],
  /* effectsRenderer.js (noteWorkerSheet): a peer's stand-in */
  [/^standin /, 'standin-bake'],
  /* zoneTextures.js: a strip's texture made from its numbers */
  [/^strip made$/, 'strip-made'],
  /* zoneTextures.js: 'strip slice' (unpacked a few ms at a time), and
     'strip <file>' (unpacked in one go) */
  [/^strip /, 'strip-page'],
  /* wheelObjects.js: an object page's ground lines */
  [/^page bases$/, 'object-bases'],
  /* wsClient.js's slow message ('ws.<type>'), the ring's other writer: it
     does not pass through noteMade, and the report reads the same ring */
  [/^ws\./, 'server-message'],
]);

/** The hold's name for a string a job noted, or null (dropped). */
export function holdOf(made) {
  if (typeof made !== 'string') return null;
  if (_NAMES.has(made)) return made;
  for (let i = 0; i < MADE_AS.length; i++) {
    if (MADE_AS[i][0].test(made)) return _NAMES.has(MADE_AS[i][1]) ? MADE_AS[i][1] : null;
  }
  return null;
}
