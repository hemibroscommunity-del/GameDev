/* ═══ v2.3.5007: PIXI'S SMALL GEOMETRY KEEPS ITS WHOLE NUMBERS UNBOXED ═══
 *
 * Heap snapshots of the memory check's fight (docs/specs/heap-trim-2026-11-13.md)
 * counted ~260,000 boxed numbers on the page's heap, ~2.3 MB: 60,000 of them
 * the four fields of Pixi's ~15,000 Rectangles (a frame's place on its sheet,
 * whole texels almost every one), 23,000 its Matrices', and more its
 * ObservablePoints' and Bounds'.
 *
 * Why boxed: Chrome's engine (V8, with its compressed pointers) keeps a field
 * that has EVER held a fraction, in any object of that class, as a "double"
 * field -- and stores every such field as a separate 12-byte box, a whole
 * number included.  A field that has once held something that is not a
 * number is "tagged" instead: a whole number then sits in the field itself
 * (no box), and only a fraction is boxed.  So each class's number fields are
 * made tagged once, here, as the renderer loads: one throwaway object of the
 * class is given `null` in each field and its number back.  Every later
 * object of the class follows the general shape; the old ones move to it as
 * they are next written.  Nothing the game computes changes (the same
 * numbers, read the same way); Safari (JavaScriptCore) never boxes numbers,
 * so there it does nothing.
 *
 * `?heaptrim=0` leaves the engine's own choice (rendering/heapTrim.js).
 */
import { Rectangle, Matrix, ObservablePoint, Bounds } from 'pixi.js';
import { heapTrimOn } from './heapTrim.js';

const _stats = { on: false, classes: 0 };
try { if (typeof window !== 'undefined') window.__btFieldLean = _stats; } catch (e) { /* no page */ }

function generalize(obj, fields) {
  for (const f of fields) {
    const v = obj[f];
    obj[f] = null;   /* not a number: the field is now "tagged" for the class */
    obj[f] = v;
  }
  _stats.classes++;
}

let _done = false;
export function installFieldLean() {
  if (_done || !heapTrimOn()) return false;
  _done = true;
  try {
    /* a fraction first, so the field is a "double" one before it is made
       general (the shape every Rectangle would reach anyway) */
    const r = new Rectangle(0.5, 0.5, 1.5, 1.5);
    generalize(r, ['x', 'y', 'width', 'height']);
    const m = new Matrix(1.5, 0.5, 0.5, 1.5, 0.5, 0.5);
    generalize(m, ['a', 'b', 'c', 'd', 'tx', 'ty']);
    const p = new ObservablePoint({ _onUpdate() {} }, 0.5, 0.5);
    generalize(p, ['_x', '_y']);
    const b = new Bounds(0.5, 0.5, 1.5, 1.5);
    generalize(b, ['minX', 'minY', 'maxX', 'maxY']);
    _stats.on = true;
  } catch (e) { /* a Pixi without one of them: the engine's own choice */ }
  return _stats.on;
}
