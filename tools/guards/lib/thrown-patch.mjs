/* ═══ v2.3.5307: the one thrown flag, put on GameRoom as index.js loads (card T) ═══
 *
 * tools/guards/lib/thrown.mjs registers a module hook that appends a call to
 * patchThrown(GameRoom) to server/src/index.js, so the class is patched at
 * the moment the SUITE imports it, after the suite's own setup (a suite that
 * sets `globalThis.WebSocketPair` first, as tick-pace.test does, sees its
 * modules read it).  v2.3.5304 imported index.js inside the preload, before
 * any suite line ran, and tickpace.js froze REAL_TIMERS false (the planning
 * session's finding, 2026-11-15: tick-pace.test red with a flag nothing
 * reads).
 *
 * The flags: `_liveFlags` is an accessor.  Whatever the room sets into it --
 * liveops.js's own `_liveFlagsEnsure` load from storage, a suite's own
 * `room._liveFlags = {...}` -- is kept, and every read finds the one flag at
 * its thrown value.  Before anything is set it reads absent, as the cache
 * does, and nothing here loads it: a room's cold start stays cold
 * (cold-flags.test; v2.3.5304 loaded the flags as the room was made, and
 * failed it).
 */
export function patchThrown(GameRoom) {
  const spec = process.env.BT_THROWN || '';
  const at = spec.lastIndexOf('=');
  if (at <= 0 || !GameRoom || !GameRoom.prototype) return;
  const name = spec.slice(0, at);
  const raw = spec.slice(at + 1);
  const value = raw === 'true' ? true : raw === 'false' ? false : Number(raw);
  Object.defineProperty(GameRoom.prototype, '_liveFlags', {
    configurable: true,
    get() {
      /* not set: absent (code that asks `if (this._liveFlags)` to know
         whether the flags are in must still be told no: clanparty.js) */
      if (!this.__btThrownLoaded) return undefined;
      const f = this.__btThrownFlags || (this.__btThrownFlags = {});
      f[name] = value;
      return f;
    },
    set(v) {
      /* null or undefined drops the cache, as it does plain: the next
         `_liveFlagsEnsure` loads again (roomfull.test's `room._liveFlags =
         null`, then a reload: v2.3.5307, found by --none) */
      if (v === null || v === undefined) { this.__btThrownFlags = null; this.__btThrownLoaded = false; return; }
      this.__btThrownFlags = typeof v === 'object' ? v : {};
      this.__btThrownLoaded = true;
    },
  });
  globalThis.__btThrown = { name, value };
}
