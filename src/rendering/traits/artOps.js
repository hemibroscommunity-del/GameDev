import {
  ART_W, ART_H, ART_LEN, ART_PALETTE, emptyArt, isValidArt, artWithCells,
  getArt, setArt, onArtChange, CANVASES,
} from './playerArt.js';
import {
  shapeCells, expandCells, mirrorCells, fillCells, letterCells, letterBoxCells, LETTERS,
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
 *   { k:'d', art, a:[x0,y0,x1,y1] }                    a placed design
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

/* ═══ v2.3.2463: A PLACED THING MAY HANG OFF THE GRID ═══
 *
 * Owner: "the design is maximized to fit the area so when you go to move it
 * nothing happens because it can't move outside the drawing area.  Can you make
 * it so that any design can move away from the drawn area so that you can see
 * predesigns move once you've placed them but just cut off the portion that's
 * not on the drawable grid?"
 *
 * Exactly right, and it was two rules deep.  A design lands covering the WHOLE
 * grid, so a box that must stay inside the grid has nowhere to go -- the
 * translation clamp in PlayerPaint's moveTo worked out to zero for it, every
 * time, which is a drag that does nothing.  And `sanitizeOp` below rejected any
 * box with an off-grid corner, so even once the drag moved something the op
 * would have been dropped on the next load.
 *
 * So a box may now leave the grid, and what falls outside is CLIPPED.  Most of
 * that clip was already there: `artWithCells` has always skipped cells outside
 * 0..15, letterBoxCells tests every cell it emits, and mirrorCells drops an
 * x it cannot reflect back in.  What was missing is that the cells still got
 * HANDED OUT -- to the hit test, to the selection outline, to the body
 * surface's overlay -- so an off-grid design would have drawn its outline
 * across the character's arm while painting nothing there.  `clipCells` below
 * is that missing edge, applied in the two places cells leave this file.
 *
 * THE BOUND IS NOT REMOVED, ONLY WIDENED.  This blob is hand-editable, and
 * every shape helper loops over its box: rectCells walks ax..bx, ellipseCells
 * scans both axes of it, designGroups samples w x h.  One grid of slack each
 * way caps a box at 48 x 48 = 2304 samples, which is 9 full grids and cheap;
 * an unbounded corner would let a crafted localStorage entry ask for a loop of
 * any size at all.  `Number.isInteger` is not a bound and must not be mistaken
 * for one: Number.isInteger(1e308) is true, and a width of Infinity is a `for`
 * loop that never ends -- a white screen at startup, out of localStorage.
 *
 * AND THE EDITOR CLAMPS TO THESE SAME NUMBERS.  It has to, and not because the
 * gesture cannot reach past them -- it can: moveTo bounds a drag by how much of
 * the box still OVERLAPS the grid, which for a box wider than the grid permits
 * a corner well past BOX_HI, and a resize can grow one 15 cells per pull.  Two
 * rules that disagree is the worst shape this could take, because the
 * disagreement is invisible until a page load: the gate refuses the op, the
 * shortened list no longer replays to the stored drawing, and loadDocs bins the
 * WHOLE canvas's op list.  So PlayerPaint imports BOX_LO/BOX_HI_X/BOX_HI_Y and
 * clamps against them as well as against its own overlap rule, and this stays
 * the read-side backstop for a blob that was not written by this session. */
const BOX_OFF = ART_W;
/* EXPORTED, because the gesture and the gate have to agree about this.  They
   are two different rules -- the editor bounds a drag by how much of the box
   still OVERLAPS the grid, this bounds each corner ABSOLUTELY -- and for a box
   wider than the grid those two disagree: the overlap rule would happily put a
   corner past BOX_HI, and the next page load would then refuse the op and, with
   it, the whole canvas's op list.  So PlayerPaint clamps to these same numbers
   as well as to its own rule (moveTo / resizeTo, v2.3.2463). */
export const BOX_LO = -BOX_OFF, BOX_HI_X = ART_W - 1 + BOX_OFF, BOX_HI_Y = ART_H - 1 + BOX_OFF;

/** The cells of `list` that are actually on the grid.  Returns the SAME array
 *  when nothing is off it, which is every op on a drawing nobody has dragged
 *  off the edge -- the common case pays one scan and no allocation. */
function clipCells(list) {
  let off = 0;
  for (let i = 0; i < list.length; i++) {
    const x = list[i][0], y = list[i][1];
    if (x < 0 || y < 0 || x >= ART_W || y >= ART_H) { off = 1; break; }
  }
  if (!off) return list;
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const x = list[i][0], y = list[i][1];
    if (x >= 0 && y >= 0 && x < ART_W && y < ART_H) out.push(list[i]);
  }
  return out;
}

/* ═══ v2.3.2455: A PLACED DESIGN IS ONE OP, NOT A PILE OF THEM ═══
   Owner: "after first placing the predesigns it's still selected (you can move
   it around) and also resize it with the corner grab handle."

   v2.3.2442 wrote a ready-made design in as one op PER COLOUR, which is why
   neither was possible: there was no single thing to select, the pieces had no
   box between them, and dragging one colour's handle would have torn the
   picture apart.  A design op carries its own art plus the box it is drawn
   into, so it moves and resizes exactly like a shape or a letter -- one op,
   one selection, one handle.

   IT IS THE ONE OP THAT PAINTS MORE THAN ONE COLOUR, and that is why `replay`
   has a branch for it: every other op ends in `artWithCells(a, cells, op.i)`,
   a single ink.  This one hands back its colours in palette order and the
   replay lays them down in that order.

   SAMPLING IS NEAREST-NEIGHBOUR, deliberately: the source is a 16x16 pixel
   drawing and the destination is the same grid, so anything smoother would
   invent colours that are not in the palette and could not be stored in the
   256-character string.  Cells are addressed from the box's own top-left, so
   dragging the box moves the picture rather than re-sampling it differently.

   THE ART STRING TRAVELS IN THE OP.  The op list is editor-only scaffolding
   (see the header), so this costs nothing on the wire; the alternative -- an
   id into the catalogue -- would break the day a catalogue entry is retuned,
   and silently change a drawing the player already made. */
export function designGroups(op) {
  if (!op || !isValidArt(op.art) || !Array.isArray(op.a)) return [];
  const x0 = Math.min(op.a[0], op.a[2]), x1 = Math.max(op.a[0], op.a[2]);
  const y0 = Math.min(op.a[1], op.a[3]), y1 = Math.max(op.a[1], op.a[3]);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  if (w < 1 || h < 1) return [];
  /* Keyed by a palette index that comes off a hand-editable string -- a Map,
     never a plain object (CLAUDE.md rule 4). */
  const byInk = new Map();
  for (let y = 0; y < h; y++) {
    const sy = Math.min(ART_H - 1, Math.floor((y * ART_H) / h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(ART_W - 1, Math.floor((x * ART_W) / w));
      const v = parseInt(op.art[sy * ART_W + sx], 16);
      /* index 0 is transparent, and a digit past the palette paints nothing --
         designOps' rule (designCatalog), applied to the same strings here. */
      if (!(v > 0 && v < ART_PALETTE.length)) continue;
      /* v2.3.2463: the part of the picture that hangs off the grid is cut off
         here, at the SAMPLE, not after.  Sampling is unchanged -- sx/sy are
         still read from the cell's position within the BOX -- so the part you
         can still see is the same part of the picture it was before the drag,
         which is the whole point of being able to move it. */
      if (x0 + x < 0 || y0 + y < 0 || x0 + x >= ART_W || y0 + y >= ART_H) continue;
      let cells = byInk.get(v);
      if (!cells) byInk.set(v, (cells = []));
      cells.push([x0 + x, y0 + y]);
    }
  }
  /* Palette order, so a replay of the same op always lays the colours down the
     same way -- Map order would follow whichever colour the scan met first,
     which changes with the box. */
  return [...byInk.keys()].sort((p, q) => p - q).map((ink) => ({ ink, cells: byInk.get(ink) }));
}

/** The cells one op paints, given the art built up to just before it.
 *  `art` matters only to the bucket fill, which is the one op whose result
 *  depends on what is already on the grid. */
export function opCells(op, art) {
  return clipCells(rawOpCells(op, art));
}

/** opCells before the clip.  Split out so the clip is impossible to forget on
 *  a new op kind: every return below goes through `opCells` above. */
function rawOpCells(op, art) {
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
  /* v2.3.2427: a letter carries a BOX now (artTools letterBoxCells).  The
     legacy form -- x/y and no `a` -- is still stamped by the old centred
     5x7 path, so a drawing made before this version replays byte-identically
     rather than quietly resizing itself under a player who never asked. */
  if (op.k === 't') {
    return mirrorCells(op.a
      ? letterBoxCells(op.g, op.a[0], op.a[1], op.a[2], op.a[3])
      : letterCells(op.g, op.x, op.y), !!op.m);
  }
  if (op.k === 'f') return mirrorCells(fillCells(art, op.x, op.y), !!op.m);
  /* v2.3.2455: the union of the design's colours.  This is what the hit test
     and the selection outline read, and both want "where is it", not "what
     colour is each cell" -- the colours are `replay`'s business below. */
  if (op.k === 'd') {
    const out = [];
    const groups = designGroups(op);
    for (let g = 0; g < groups.length; g++) {
      const cells = groups[g].cells;
      for (let n = 0; n < cells.length; n++) out.push(cells[n]);
    }
    return out;
  }
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
    /* v2.3.2455: a design paints several inks in one op, so it lays its own
       colours down; everything else is one ink and takes the shared path. */
    if (ops[i].k === 'd') {
      const groups = designGroups(ops[i]);
      const all = [];
      for (let g = 0; g < groups.length; g++) {
        a = artWithCells(a, groups[g].cells, groups[g].ink);
        for (let n = 0; n < groups[g].cells.length; n++) all.push(groups[g].cells[n]);
      }
      if (outCells) outCells.push(all);
      continue;
    }
    const cells = opCells(ops[i], a);
    if (outCells) outCells.push(cells);
    a = artWithCells(a, cells, ops[i].i);
  }
  return a;
}

/** Append an op to a {base, ops} pair, collapsing the oldest ops into the base
 *  if the list has grown past the cap.  Returns a NEW pair — nothing here is
 *  mutated, because undo snapshots share these arrays and objects. */
/* v2.3.2463: A COLLAPSE CLIPS, AND THAT IS A ONE-WAY DOOR.  `replay` bakes the
   oldest ops into the 256-character base, and the base has no cells outside the
   grid -- so an op dragged half off the edge loses its off-grid half the moment
   it falls out of the window, and dragging it back afterwards brings back a
   shorter picture.  Stated rather than fixed: it takes 120 ops on one canvas to
   reach, nothing visible changes at the moment it happens (the lost part was
   already invisible), and preferring a fully on-grid op for the collapse would
   make the window depend on where things are rather than on how old they are,
   which is a worse rule to reason about.  It is the same trade MAX_OPS already
   makes: past the cap you keep the drawing and lose the pieces. */
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
  /* ═══ v2.3.2455: a placed design.  The art string is checked with the same
     isValidArt every stored drawing goes through -- this blob is hand-editable
     and the sampler indexes straight into the string, so a short or non-hex one
     would read undefined and paint nothing at best.  No `i`: the design brings
     its own colours (designGroups).

     ═══ v2.3.2463: AND THAT IS WHY IT IS CHECKED FIRST ═══
     It used to sit at the BOTTOM, below the ink guard two lines down -- and
     that guard rejects an op with no `i`, which is every design op ever
     written.  So the gate answered null for all of them, and since v2.3.2455
     a placed design has not survived a page load: on the way back in the op
     was dropped, the shortened list then failed the "does this still replay to
     the stored drawing" test in loadDocs, and the WHOLE canvas's op list was
     thrown away with it.  The pixels came back (they are the base now) and
     every piece of that drawing -- designs, shapes, letters, strokes -- became
     unselectable, unmovable and unlayerable.  Silent, because a flattened
     drawing looks exactly like the drawing.
     Verified against origin/main before the move: sanitizeOp({k:'d', art, a})
     returns null, and returns the op the moment a stray `i` is added. */
  if (op.k === 'd') {
    if (!isValidArt(op.art) || !Array.isArray(op.a) || op.a.length !== 4) return null;
    /* v2.3.2463: BOX_LO..BOX_HI.  This is the op the owner's report is about --
       a design lands covering the whole grid, so it has nowhere to go until a
       box is allowed past the edge. */
    for (let n = 0; n < 4; n++) {
      if (!okInt(op.a[n], BOX_LO, (n % 2) ? BOX_HI_Y : BOX_HI_X)) return null;
    }
    return { k: 'd', art: op.art, a: op.a.slice() };
  }
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
    /* v2.3.2463: BOX_LO..BOX_HI, not 0..15 -- a shape may be dragged off the
       edge like a design, and the cells that leave the grid are clipped rather
       than refused (see BOX_OFF).  Still an integer and still bounded: this
       blob is hand-editable and every shape helper loops over the box. */
    if (!okInt(op.a[0], BOX_LO, BOX_HI_X) || !okInt(op.a[2], BOX_LO, BOX_HI_X)) return null;
    if (!okInt(op.a[1], BOX_LO, BOX_HI_Y) || !okInt(op.a[3], BOX_LO, BOX_HI_Y)) return null;
    if (!okInt(op.b, 1, 3)) return null;
    return { k: 's', t: op.t, a: op.a.slice(), i, b: op.b, m };
  }
  if (op.k === 't') {
    if (!LETTER_SET.has(op.g)) return null;
    /* v2.3.2427: the box, when there is one.  Checked cell by cell like a
       shape's `a` -- this blob is hand-editable, and a letter box with a
       non-integer corner would sample outside any bound at all.
       v2.3.2463: the bound is BOX_LO..BOX_HI now, and so is x/y WHEN THERE IS
       A BOX -- moveTo keeps the legacy anchor in step with the box it moved,
       so a letter dragged off the left edge has a negative x by construction.
       Without a box, x/y IS the glyph's position and stays on the grid: the
       pre-v2.3.2427 form has no box to clip against and letterCells does not
       test its cells. */
    if (op.a !== undefined) {
      if (!Array.isArray(op.a) || op.a.length !== 4) return null;
      for (let n = 0; n < 4; n++) {
        if (!okInt(op.a[n], BOX_LO, (n % 2) ? BOX_HI_Y : BOX_HI_X)) return null;
      }
      if (!okInt(op.x, BOX_LO, BOX_HI_X) || !okInt(op.y, BOX_LO, BOX_HI_Y)) return null;
      return { k: 't', g: op.g, x: op.x, y: op.y, a: op.a.slice(), i, m };
    }
    if (!okInt(op.x, 0, ART_W - 1) || !okInt(op.y, 0, ART_H - 1)) return null;
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
