/* ═══ v2.3.5011: MANY TEXTURES OF ONE PICTURE LET GO OF IN ONE PASS ═══
 * (src/rendering/bulkTexDestroy.js)
 *
 * The look sweep let go of an idle look's frames one Texture.destroy() at a
 * time, and each destroy's source.off('resize') made eventemitter3 rebuild
 * the source's whole list of listeners (thousands, on a look atlas page):
 * 15 MB of garbage in a 26 s fight.  destroyTextures rebuilds each source's
 * list once.
 *
 *   1. the dying textures' 'resize' listeners are gone, every other listener
 *      kept, in order, with its own context;
 *   2. each texture is destroyed (destroy(false): its source never), and its
 *      own 'destroy' event still fires;
 *   3. the source's off() is its own again after (nothing left on the instance);
 *   4. the list is rebuilt once, not once a texture (no array made per destroy);
 *   5. all of a source's listeners going leaves the event cleared, the
 *      emitter's count right (eventemitter3's own clear); one listener left is
 *      kept as one object, as removeListener leaves it;
 *   6. an emitter of another shape: each destroyed the plain way, as before;
 *   7. the wiring, read from the source: lookPalette.js's sweep lets go through
 *      destroyTextures.
 *
 * Run against the eventemitter3 the page's Pixi uses where it is installed
 * (the repo's node_modules), else a stand-in with its removeListener and
 * clear (the server's own install has no Pixi).
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');
const { destroyTextures } = await import('../../src/rendering/bulkTexDestroy.js');

/* eventemitter3 (5.x) as the page has it, or its removeListener's stand-in */
let EE = null, real = false;
try { EE = createRequire(new URL('../../package.json', import.meta.url))('eventemitter3'); real = true; } catch (e) { /* the server's own install */ }
if (!EE) {
  function Events() {}
  Events.prototype = Object.create(null);
  EE = class {
    constructor() { this._events = new Events(); this._eventsCount = 0; }
    on(evt, fn, context) {
      const l = { fn, context: context || this, once: false };
      if (!this._events[evt]) { this._events[evt] = l; this._eventsCount++; }
      else if (!this._events[evt].fn) this._events[evt].push(l);
      else this._events[evt] = [this._events[evt], l];
      return this;
    }
    emit(evt, a) {
      const L = this._events[evt];
      if (!L) return false;
      for (const l of (L.fn ? [L] : L.slice())) l.fn.call(l.context, a);
      return true;
    }
    removeAllListeners(evt) {
      if (evt) { if (this._events[evt]) { if (--this._eventsCount === 0) this._events = new Events(); else delete this._events[evt]; } }
      else { this._events = new Events(); this._eventsCount = 0; }
      return this;
    }
    removeListener(evt, fn, context) {
      const L = this._events[evt];
      if (!L) return this;
      if (!fn) return this.removeAllListeners(evt);
      if (L.fn) { if (L.fn === fn && (!context || L.context === context)) this.removeAllListeners(evt); return this; }
      const events = [];
      for (const l of L) if (l.fn !== fn || (context && l.context !== context)) events.push(l);
      if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
      else this.removeAllListeners(evt);
      return this;
    }
  };
  EE.prototype.off = EE.prototype.removeListener;
}
console.log(`(eventemitter3: ${real ? 'the installed one' : 'the stand-in'})`);

/* Pixi's Texture, as far as this reads it: listens to its source's resize,
   takes it off in destroy(), emits its own 'destroy' */
class Tex extends EE {
  constructor(source) { super(); this._source = source; source.on('resize', this.update, this); this.destroyed = false; }
  update() { this.updated = (this.updated || 0) + 1; }
  destroy(destroySource = false) {
    if (this._source) { this._source.off('resize', this.update, this); if (destroySource) { this._source.destroyed = true; this._source = null; } }
    this.destroyed = true;
    this.emit('destroy', this);
    this.removeAllListeners();
  }
}
const listOf = (s) => { const L = s._events.resize; return !L ? [] : (L.fn ? [L] : L); };

/* 1-4 */
{
  const page = new EE();
  const other = { onResize() {} };
  page.on('resize', other.onResize, other);
  const keep = [], die = [];
  for (let i = 0; i < 300; i++) (i % 3 ? die : keep).push(new Tex(page));
  page.on('update', () => {});
  let destroyedEvents = 0;
  for (const t of die) t.on('destroy', () => { destroyedEvents++; });
  /* count the arrays the rebuild makes: an off() that runs rebuilds one */
  let offs = 0;
  const realOff = page.off;
  page.off = function (...a) { offs++; return realOff.apply(this, a); };
  const n = destroyTextures(die);
  const wrapperBack = page.off !== realOff;   /* destroyTextures put back what it found (here the counter) */
  delete page.off;
  const L = listOf(page);
  const ctxs = L.map((l) => l.context);
  check('1. the dying textures\' resize listeners are gone, the rest kept in order', L.length === 1 + keep.length && ctxs[0] === other
    && keep.every((t, i) => ctxs[i + 1] === t) && die.every((t) => !ctxs.includes(t)), { left: L.length, want: 1 + keep.length });
  check('2. each destroyed (its source kept), its own destroy event fired', n === die.length && die.every((t) => t.destroyed && t._source === page)
    && destroyedEvents === die.length && !page.destroyed, { n, destroyedEvents });
  check('3. the source\'s off() is what it was again after (an own one put back, none left on the instance otherwise)', wrapperBack, { wrapperBack });
  {
    const p4 = new EE();
    destroyTextures([new Tex(p4), new Tex(p4)]);
    check('...with none of its own before, none left on the instance', !Object.prototype.hasOwnProperty.call(p4, 'off') && p4.off === EE.prototype.off);
  }
  check('4. no off() ran a rebuild: the list was rebuilt once, by destroyTextures', offs === 0, { offs });
  page.emit('resize');
  check('...and a resize still reaches every kept texture, and no dying one', keep.every((t) => t.updated === 1) && die.every((t) => !t.updated));
}

/* 5 */
{
  const page = new EE();
  page.on('update', () => {});
  const all = [new Tex(page), new Tex(page), new Tex(page)];
  const before = page._eventsCount;
  destroyTextures(all);
  check('5. every listener of a source going clears the event, the count right', !page._events.resize && page._eventsCount === before - 1, { before, after: page._eventsCount });
  const p2 = new EE();
  const a = new Tex(p2), b = new Tex(p2), c = new Tex(p2);
  destroyTextures([a, c]);
  const L = p2._events.resize;
  check('...one left is kept as one listener object, as removeListener leaves it', L && L.fn && L.context === b, L && { fn: !!L.fn, ctx: L.context === b });
  const p3 = new EE();
  const only = new Tex(p3);
  destroyTextures([only]);
  check('...a source with one listener (one object, not a list): cleared', !p3._events.resize && only.destroyed);
}

/* 6 */
{
  const odd = { offs: 0, off() { this.offs++; return this; } };   /* no _events */
  const t1 = { _source: odd, destroyed: false, destroy() { this.destroyed = true; this._source.off('resize', null, this); } };
  const t2 = { _source: odd, destroyed: false, destroy() { this.destroyed = true; this._source.off('resize', null, this); } };
  const n = destroyTextures([t1, t2, null, { destroyed: true, destroy() { throw new Error('twice'); } }]);
  check('6. an emitter of another shape: each destroyed the plain way (its own off each), null and destroyed ones passed over', n === 2 && t1.destroyed && t2.destroyed && odd.offs === 2, { n, offs: odd.offs });
}

/* 7 */
{
  const lp = src('src/rendering/lookPalette.js');
  const sw = (lp.match(/function sweep\(now\)[\s\S]*?\n}\n/) || [''])[0];
  check('7. lookPalette.js\'s sweep lets an idle look\'s frames go through destroyTextures, not one destroy() at a time',
    /import \{ destroyTextures \} from '\.\/bulkTexDestroy\.js'/.test(lp) && /destroyTextures\(/.test(sw) && !/\.destroy\(false\)/.test(sw), sw.slice(0, 300));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
