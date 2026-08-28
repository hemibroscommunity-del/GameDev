import {
  ART_W, ART_H, ART_LEN, emptyArt, isValidArt, artWithCells,
  getArt, setArt, onArtChange, CANVASES,
} from './playerArt.js';
import {
  shapeCells, expandCells, mirrorCells, fillCells, letterCells, LETTERS,
} from './artTools.js';

/* ═══ v2.3.1967: THE DRAWING REMEMBERS WHAT IT IS MADE OF ═══
 *
 * Owner, play-testing the tattoo editor: "During the tattoo editor can you add
 * a hand shape to tap the existing shape to reselect and edit it? Also can you
 * add an option to change layers?"
 *
 * Both halves of that need the same thing, and the editor did not have it. A
 * shape was rasterised into the flat 256-character string the moment you placed
 * it (v2.3.1951 held it PENDING for a while first, but the end was the same),
 * and after that there was no shape any more — only pixels that used to be one.
 * Nothing can be re-selected, and "layers" has no referent at all: a flat string
 * has exactly one layer.
 *
 * So a canvas is now a BASE string plus an ORDERED LIST OF OPS, and the art is
 * DERIVED — `replay(base, ops)`, from the bottom up, every time. Nothing edits
 * the string directly any more. Re-selecting a shape is finding its op;
 * changing layers is moving that op in the list.
 *
 * ── WHY AN OP LIST AND NOT "SHAPES ON TOP OF A PAINTED BASE" ──
 * The obvious cheaper model — keep freehand in one flat base layer and hold the
 * shapes above it as objects — is WRONG, and visibly so: a highlight you draw
 * ON TOP of a box would sink underneath the box the moment it was stored,
 * because everything freehand would live below everything shaped. Ops interleave
 * in the order the player made them, so what was drawn last is on top, which is
 * the only rule anybody expects from a drawing.
 *
 * A fill is order-dependent for a second reason: it floods against the grid AS
 * ACCUMULATED SO FAR, so it has to be re-run in sequence during the replay
 * rather than resolved once against the finished image. `opCells` therefore
 * takes the art built up to that point, and only the fill op reads it.
 *
 * ── WHY THE OPS NEVER TRAVEL ──
 * This is EDITOR-ONLY state. The wire, the renderers, the slots and the server
 * gates all keep taking exactly the same 256-character string they always did
 * (playerArt.js) — a peer, an old client and the worker cannot tell that this
 * file exists. That is deliberate: the drawing is the product, the ops are the
 * scaffolding, and putting scaffolding on the wire would mean a new sanitiser
 * on a server allowlist for something no other player can ever see.
 *
 * ── PERSISTENCE, AND WHEN THE LIST IS THROWN AWAY ──
 * The list is kept in localStorage beside the art (one `bt-artops` blob, the
 * way the design slots share one `bt-artslots`), so closing the panel and
 * coming back does not silently flatten your work — which would otherwise undo
 * the whole feature one panel-close later.
 *
 * But the ART is the truth and the ops are a convenience, so the list is
 * DROPPED the moment it stops describing the drawing that is actually stored:
 * on load, and on every art change that did not come from here (the listener at
 * the bottom of this file). A slot load, a hand-edited localStorage value, or a
 * drawing made by a client that predates this file all land that way. The
 * drawing itself is untouched — it becomes the new `base` — and all that is
 * lost is the ability to pick its pieces apart again, which is the correct
 * thing to lose, because at that point we genuinely do not know what its pieces
 * were.
 *
 * ── THE OP FORMS ──
 * Short keys, because this blob is written on every stroke and read at boot:
 *
 *   { k:'c', c:[cellIdx…], i:ink }                     freehand / body stroke
 *   { k:'s', t:'line'|'rect'|'ellipse', a:[x0,y0,x1,y1], i, b:brush, m:mirror }
 *   { k:'t', g:'A', x, y, i, m }                       a placed letter
 *   { k:'f', x, y, i, m }                              a bucket fill
 *
 * A freehand stroke stores the cells it FINISHED with (already widened by the
 * brush and already mirrored) rather than the path plus the settings: the pen
 * is the one tool with nothing left to adjust afterwards, and storing the
 * result means a replay can never disagree with what the player watched appear
 * under their finger.
 */

/* Where a hand-editable value indexes a table, a Set — never a plain object.
   `{ line:1 }['__proto__']` is truthy, and this table's key comes straight out
   of localStorage (CLAUDE.md rule 4 / TRAPS #6). */
const SHAPE_TOOLS = new Set(['line', 'rect', 'ellipse']);
const LETTER_SET = new Set(LETTERS);

/* A design that needs more than this many pieces has stopped being a design,
   and both the replay cost and the stored blob scale with the count. Past the
   cap the OLDEST ops are collapsed into the base (see `appendToDoc`): the
   drawing is preserved exactly, and only the ability to re-select its earliest
   pieces is spent — the same trade the drop rule above makes. */
export const MAX_OPS = 120;
const COLLAPSE = 40;

/** The cells one op paints, given the art built up to just before it.
 *  `art` matters only to the bucket fill, which is the one op whose result
 *  depends on what is already on the grid. */
export function opCells(op, art) {
  if (!op) return [];
  if (op.k === 'c') {
    const out = [];
    for (let i = 0; i < op.c.length; i++) {
      const v = op.c[i];
      out.push([v % ART_W, (v / ART_W) | 0]);
    }
    return out;
  }
  if (op.k === 's') {
    return mirrorCells(expandCells(shapeCells(op.t, op.a[0], op.a[1], op.a[2], op.a[3]), op.b), !!op.m);
  }
  if (op.k === 't') return mirrorCells(letterCells(op.g, op.x, op.y), !!op.m);
  if (op.k === 'f') return mirrorCells(fillCells(art, op.x, op.y), !!op.m);
  return [];
}

/** The drawing `base` becomes once every op has been applied in order.
 *  Pass `outCells` to also collect, per op, the cells it painted — that list is
 *  what hit-testing ("which shape did I just tap?") and the selection outline
 *  are drawn from, and taking it out of the same pass means the picture and the
 *  hit test can never disagree about where a shape is. */
export function replay(base, ops, outCells) {
  let a = isValidArt(base) ? base : emptyArt();
  if (!ops || !ops.length) return a;
  for (let i = 0; i < ops.length; i++) {
    const cells = opCells(ops[i], a);
    if (outCells) outCells.push(cells);
    a = artWithCells(a, cells, ops[i].i);
  }
  return a;
}

/** Append an op to a {base, ops} pair, collapsing the oldest ops into the base
 *  if the list has grown past the cap.  Returns a NEW pair — nothing here is
 *  mutated, because undo snapshots share these arrays and objects. */
export function appendToDoc(doc, op) {
  const base = (doc && isValidArt(doc.base)) ? doc.base : emptyArt();
  const ops = ((doc && doc.ops) || []).concat([op]);
  if (ops.length <= MAX_OPS) return { base, ops };
  const k = ops.length - MAX_OPS + COLLAPSE;
  return { base: replay(base, ops.slice(0, k)), ops: ops.slice(k) };
}

const okInt = (v, lo, hi) => (typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi);

/** One op, checked field by field, or null.  Everything here can arrive from a
 *  hand-edited localStorage blob, and an op that replayed into a crash — or
 *  into a cell outside the grid — would take the whole designer down. */
export function sanitizeOp(op) {
  if (!op || typeof op !== 'object') return null;
  const i = op.i;
  if (!okInt(i, 0, 15)) return null;
  const m = op.m ? 1 : 0;
  if (op.k === 'c') {
    if (!Array.isArray(op.c) || op.c.length > ART_LEN) return null;
    const seen = new Uint8Array(ART_LEN);
    const c = [];
    for (let n = 0; n < op.c.length; n++) {
      const v = op.c[n];
      if (!okInt(v, 0, ART_LEN - 1) || seen[v]) continue;
      seen[v] = 1; c.push(v);
    }
    return c.length ? { k: 'c', c, i } : null;
  }
  if (op.k === 's') {
    if (!SHAPE_TOOLS.has(op.t) || !Array.isArray(op.a) || op.a.length !== 4) return null;
    if (!okInt(op.a[0], 0, ART_W - 1) || !okInt(op.a[2], 0, ART_W - 1)) return null;
    if (!okInt(op.a[1], 0, ART_H - 1) || !okInt(op.a[3], 0, ART_H - 1)) return null;
    if (!okInt(op.b, 1, 3)) return null;
    return { k: 's', t: op.t, a: op.a.slice(), i, b: op.b, m };
  }
  if (op.k === 't') {
    if (!LETTER_SET.has(op.g) || !okInt(op.x, 0, ART_W - 1) || !okInt(op.y, 0, ART_H - 1)) return null;
    return { k: 't', g: op.g, x: op.x, y: op.y, i, m };
  }
  if (op.k === 'f') {
    if (!okInt(op.x, 0, ART_W - 1) || !okInt(op.y, 0, ART_H - 1)) return null;
    return { k: 'f', x: op.x, y: op.y, i, m };
  }
  return null;
}

/* ── the store ───────────────────────────────────────────────────────────── */

const OPS_KEY = 'bt-artops';
const _docs = Object.create(null);   /* CLAUDE.md rule 4 */

/** The doc a canvas starts from when there is no usable stored list: whatever
 *  is already drawn, as a flat base with nothing selectable on top of it. */
function flat(id) { return { base: getArt(id), ops: [] }; }

(function loadDocs() {
  let raw = null;
  try { raw = typeof localStorage !== 'undefined' && localStorage.getItem(OPS_KEY); }
  catch (e) { /* localStorage unavailable (SSR / privacy mode) */ }
  let parsed = null;
  try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }
  for (const id of CANVASES) {
    const row = (parsed && parsed[id] && typeof parsed[id] === 'object') ? parsed[id] : null;
    if (!row || !Array.isArray(row.o) || !isValidArt(row.b)) { _docs[id] = flat(id); continue; }
    const ops = [];
    for (let i = 0; i < row.o.length && ops.length < MAX_OPS; i++) {
      const op = sanitizeOp(row.o[i]);
      if (op) ops.push(op);
    }
    /* THE DROP RULE.  A list that does not re-render to the drawing that is
       actually stored is not a description of it — it is a description of some
       older drawing, and replaying it would show the player something they did
       not draw.  Keep the pixels, bin the scaffolding. */
    _docs[id] = (replay(row.b, ops) === getArt(id)) ? { base: row.b, ops } : flat(id);
  }
}());

function persist() {
  try {
    const out = {};
    for (const id of CANVASES) out[id] = { b: _docs[id].base, o: _docs[id].ops };
    localStorage.setItem(OPS_KEY, JSON.stringify(out));
  } catch (e) { /* quota or unavailable -- the in-memory list still works */ }
}

/** One canvas's {base, ops}.  The array is copied on the way out so a caller
 *  cannot mutate the store — and, more to the point, cannot mutate an array an
 *  undo snapshot is also holding. */
export function getDoc(id) {
  const d = _docs[id] || flat(id);
  return { base: d.base, ops: d.ops.slice() };
}

/** Store a canvas's op list AND the drawing it renders to.  `art` is optional —
 *  pass it when the caller has already replayed, which the panel always has. */
export function saveDoc(id, base, ops, art) {
  if (!CANVASES.includes(id)) return null;
  const b = isValidArt(base) ? base : emptyArt();
  const list = (ops || []).slice(0, MAX_OPS);
  const a = isValidArt(art) ? art : replay(b, list);
  _docs[id] = { base: b, ops: list };
  persist();
  /* setArt is what tells the character, the store and every other listener; the
     onArtChange hook below sees its own write replay cleanly and leaves the
     list alone. */
  setArt(id, a);
  return a;
}

/** Append one op to a canvas the panel is NOT currently editing — the body
 *  surface's stroke on a region other than the selected one.  Returns the new
 *  doc, so the caller can bank the old one for undo. */
export function appendOp(id, op) {
  const next = appendToDoc(getDoc(id), op);
  saveDoc(id, next.base, next.ops);
  return next;
}

/* ═══ v2.3.2114: CLEARING THE PAINTED ART, SHAPES AND ALL ═══
 * Owner: "The tattoos are not resetting through character reset and
 * randomize."  They were not, and deliberately so until now — v2.3.2036's
 * Reset left the painted canvases alone on the reasoning that wiping someone's
 * drawing from a button labelled Reset is worse than leaving it.  The owner
 * has asked for the opposite, and they are right about what the buttons say:
 * "back to the default" and a fresh random look both plainly mean the drawings
 * go too, and a character that resets to bald and shirtless while keeping a
 * face tattoo reads as a broken reset, not a careful one.
 *
 * ═══ v2.3.2115: ...AND THE SHIRT AND PANTS WITH THEM ═══
 * Owner: "Yes make the shirt and pants reset too."  v2.3.2114 shipped the
 * tattoo canvases only, because tattoos were what was reported.  With the
 * clothing designs in, the set is simply CANVASES — every painted surface
 * there is — which is a better rule than any subset: it needs no prefix
 * convention to keep working, and a canvas added later is covered the day it
 * is added rather than the day someone notices it was missed.  Both of the
 * prefix rule's near-misses are already in the file's history (face and arm in
 * v2.3.1949, back-of-head in v2.3.2043).
 *
 * Through saveDoc, not setArt, and that is the part worth stating.  A drawing
 * has TWO representations here — the flat 256-char art and the op list that
 * still knows which shapes it is made of (v2.3.1967) — and clearing only the
 * first leaves the editor holding shapes for a drawing that no longer exists.
 * The onArtChange hook at the bottom of this file would notice and drop them,
 * so the end state is the same either way; going through saveDoc means the
 * clear is something this code DID rather than something a listener repaired,
 * which is the difference between a rule and a coincidence.
 *
 * The DESIGN SLOTS (v2.3.1950) are untouched, and that is what keeps this
 * honest rather than destructive: a drawing saved to a slot survives every
 * Reset and every Randomize, so "try something without losing what you had"
 * still means what it says. */
export function clearAllArt() {
  const empty = emptyArt();
  for (const id of CANVASES) saveDoc(id, empty, [], empty);
}

/** Copy one canvas's whole op list onto another (shirt front -> back), so the
 *  copy arrives with its shapes still separable rather than as a flat print. */
export function copyDoc(fromId, toId) {
  const d = getDoc(fromId);
  saveDoc(toId, d.base, d.ops);
  return d;
}

/* The runtime half of the drop rule.  Anything that writes a canvas without
   going through saveDoc — another panel, a code path that predates this file,
   a value re-read after a hand edit — invalidates the list for that canvas, and
   this listener is the one place that can see it happen. */
onArtChange((id, s) => {
  const d = _docs[id];
  if (!d) return;
  if (replay(d.base, d.ops) === s) return;
  _docs[id] = { base: isValidArt(s) ? s : emptyArt(), ops: [] };
  persist();
});
