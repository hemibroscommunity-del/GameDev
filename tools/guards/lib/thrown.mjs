/* ═══ v2.3.5304: ONE SWITCH THROWN ON EVERY ROOM (rule 4, card T PR 4) ═══
 *
 * The grand plan's rule 4: two configurations, all new or exactly one switch
 * thrown.  This preload holds ONE live flag thrown on every GameRoom a
 * process makes, so a suite runs as it is with that flag thrown -- no line
 * of game code and no suite changes:
 *
 *   BT_THROWN=farm=false node --import ./tools/guards/lib/thrown.mjs test/farm.test.mjs
 *
 * (tools/guards/switches-thrown.test.mjs runs it, the row's system's suites
 * and those of every row that needs it.)
 *
 * HOW.  The room's flags live in `this._liveFlags` (liveops.js).  Here it is
 * an accessor on GameRoom.prototype: whatever is set into it -- the cache's
 * load from storage, a suite's own `room._liveFlags = {...}` -- is kept, and
 * every read finds the one flag at its thrown value.  `_liveFlagsEnsure`
 * loads the stored map into the same object, once, as liveops.js does.  A
 * suite that never makes a GameRoom (one that tests a module on a hand-made
 * `this`) runs as it is: the flag reaches rooms only.
 *
 * The flags read absent until they are loaded or set (as liveops.js's cache
 * does), and they load as the room is made (the constructor's first call,
 * _roomRowStart), as a fetch warms them first in play.  The guard's baseline
 * runs through this same preload with a flag no code reads
 * (`__bt_none__`), so the only difference between its two runs is the one
 * flag.
 *
 * The value: `false`, `true`, or a number.
 */
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { ROOT } from './switchScan.mjs';

const spec = process.env.BT_THROWN || '';
const at = spec.lastIndexOf('=');
if (at > 0) {
  const name = spec.slice(0, at);
  const raw = spec.slice(at + 1);
  const value = raw === 'true' ? true : raw === 'false' ? false : Number(raw);
  const { GameRoom } = await import(pathToFileURL(join(ROOT, 'server/src/index.js')).href);
  const P = GameRoom.prototype;
  Object.defineProperty(P, '_liveFlags', {
    configurable: true,
    get() {
      /* not loaded and not set: absent, as liveops.js's cache is (code that
         asks `if (this._liveFlags)` to know whether the flags are in must
         still be told no: clanparty.js _clanPartyFlagsLoaded) */
      if (!this.__btThrownLoaded) return undefined;
      const f = this.__btThrownFlags || (this.__btThrownFlags = {});
      f[name] = value;
      return f;
    },
    set(v) {
      this.__btThrownFlags = v && typeof v === 'object' ? v : {};
      this.__btThrownLoaded = true;
    },
  });
  P._liveFlagsEnsure = async function () {
    if (!this.__btThrownLoaded) {
      this.__btThrownLoaded = true;
      let stored = null;
      try { stored = await this.state.storage.get('liveflags'); } catch (e) { stored = null; }
      if (stored && typeof stored === 'object') this.__btThrownFlags = stored;
      if (typeof this._syncBagCaps === 'function') this._syncBagCaps();
    }
    return this._liveFlags;
  };
  /* the flags load as the room is made, as a fetch warms them first in
     play (index.js fetch): the constructor's first call is _roomRowStart */
  const start = P._roomRowStart;
  P._roomRowStart = function (...a) {
    const r = typeof start === 'function' ? start.apply(this, a) : undefined;
    try { if (this.state && this.state.storage) this._liveFlagsEnsure().catch(() => {}); } catch (e) { /* a test's bare room */ }
    return r;
  };
  globalThis.__btThrown = { name, value };
}
