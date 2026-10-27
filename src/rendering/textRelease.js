/* ═══ v2.3.3633: A TEXT LETS GO OF ITS STYLE WHEN IT IS DESTROYED ═══
 *
 * Owner, 2026-10-27: "simulate about 5 players ... to check for memory leaks
 * in long form play sessions".  mp-heapdiff (the memory check's trip six
 * times, the heap after a GC compared between trips) found the page's heap
 * still climbing after the first trips, and among what grew were Pixi Texts
 * the game had already destroyed -- a monster's name plate, a damage number,
 * a loot label -- each kept alive by its TextStyle:
 *
 *  - a Text listens to its style's 'update' (AbstractText's style setter),
 *    and Pixi 8.17's AbstractText.destroy never takes the listener off, so a
 *    style that lives on keeps every Text that ever used it;
 *  - styles do live on: Pixi's text-measuring cache keeps its last 1,000
 *    measurements, each holding its style (CanvasTextMetrics
 *    ._measurementCache);
 *  - and the game's way of deriving a style, `{ ...NAME_STYLE, fontSize: 9 }`,
 *    copies the base TextStyle's OWN fields, its event registry (`_events`)
 *    among them, so every Text derived from NAME_STYLE -- every monster's,
 *    pet's and townsperson's name -- listened on NAME_STYLE's one registry,
 *    which lives as long as the page: every such Text ever made was kept,
 *    with no cap, and every style change in the family (a damage number drawn
 *    as text -- a special's, one with an emoji -- sets its fill and size
 *    after it is made; DMG_STYLE and LABEL_STYLE are shared the same way)
 *    called all of them, the living and the destroyed, more with every minute
 *    of play.  mp-textrelease, two trips to a fight: 42 -> 154 destroyed
 *    Texts held as Pixi ships, 5 with this (and still 5 after five trips).
 *
 * So:
 *  - destroy() takes the Text's listener off its style before Pixi's own
 *    destroy lets go of the style;
 *  - a style given to a Text as a plain object carrying another style's
 *    event registry, listener count and id (the spread) is passed on without
 *    those three, so its new TextStyle makes a registry of its own, as Pixi
 *    means it to.  Everything else in the spread goes through as before: the
 *    base's private fields still overwrite the spread's own overrides
 *    (`{ ...NAME_STYLE, fontSize: 9 }` is drawn at NAME_STYLE's size, as it
 *    always has been -- the owner has tuned the plates by eye on that), so
 *    nothing on screen changes.
 *
 * `?textkeep` in the address is Pixi as it ships, to compare. */
import { AbstractText, Text, TextStyle } from 'pixi.js';

let _installed = false;
const _stats = { released: 0, unshared: 0 };

function urlOff() {
  try { return /[?&]textkeep(=|&|$)/.test(window.location.search || ''); } catch (e) { return false; }
}

/* the spread of a TextStyle: a plain object (not a TextStyle) that carries
   the EventEmitter's own registry */
function withoutRegistry(style) {
  if (!style || typeof style !== 'object' || style instanceof TextStyle) return style;
  if (!Object.prototype.hasOwnProperty.call(style, '_events')) return style;
  const own = { ...style };
  delete own._events;
  delete own._eventsCount;
  delete own.uid;
  _stats.unshared++;
  return own;
}

export function installTextRelease() {
  if (typeof window !== 'undefined' && !window.__btTextRelease) {
    /* probe only: listeners taken off at destroy, spread styles given their
       own registry; the classes for mp-textrelease to build its own family
       (set with ?textkeep too, to compare) */
    window.__btTextRelease = Object.assign(() => ({ on: _installed, ..._stats }), { Text, TextStyle });
  }
  if (_installed || urlOff()) return false;
  const proto = AbstractText && AbstractText.prototype;
  if (!proto || typeof proto.destroy !== 'function') return false;
  const desc = Object.getOwnPropertyDescriptor(proto, 'style');
  if (!desc || typeof desc.set !== 'function' || typeof desc.get !== 'function') return false;

  const destroy = proto.destroy;
  proto.destroy = function releasingDestroy(options) {
    const st = this._style;
    if (st && typeof st.off === 'function') {
      try { st.off('update', this.onViewUpdate, this); _stats.released++; } catch (e) { /* a style already gone */ }
    }
    return destroy.call(this, options);
  };

  const set = desc.set;
  Object.defineProperty(proto, 'style', {
    configurable: true,
    enumerable: desc.enumerable,
    get: desc.get,
    set(style) { set.call(this, withoutRegistry(style)); },
  });

  _installed = true;
  return true;
}

export function textReleaseOn() { return _installed; }
