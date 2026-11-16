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
 * HOW (v2.3.5307).  The room's flags live in `this._liveFlags`
 * (liveops.js).  A module hook (thrown-hooks.mjs) patches GameRoom as the
 * suite imports server/src/index.js (thrown-patch.mjs): `_liveFlags`
 * becomes an accessor that keeps whatever the room sets into it (its own
 * `_liveFlagsEnsure` load, a suite's `room._liveFlags = {...}`) and finds
 * the one flag in it at its thrown value.  Nothing is loaded early and no
 * game function is replaced: a room's cold start stays cold, and a suite's
 * own setup (its globals) runs before any game module loads.  A suite that
 * never makes a GameRoom (one that tests a module on a hand-made `this`)
 * runs as it is: the flag reaches rooms only.  With a flag nothing reads
 * (`__bt_none__`) every suite runs as it does plain (the guard holds it).
 *
 * The value: `false`, `true`, or a number.
 */
import { pathToFileURL } from 'node:url';
import { register } from 'node:module';
import { join } from 'node:path';
import { ROOT } from './switchScan.mjs';
/* v2.3.5307: no game code is imported here.  A hook appends the patch to
   server/src/index.js as the suite itself imports it (thrown-hooks.mjs,
   thrown-patch.mjs): the suite's own setup runs first, and a room's cold
   start stays cold.  The planning session's finding, 2026-11-15: v2.3.5304
   imported index.js here and loaded the flags as a room was made, so
   cold-flags.test and tick-pace.test failed with a flag nothing reads. */
if ((process.env.BT_THROWN || '').lastIndexOf('=') > 0) {
  register(pathToFileURL(join(ROOT, 'tools/guards/lib/thrown-hooks.mjs')).href, {
    data: {
      target: pathToFileURL(join(ROOT, 'server/src/index.js')).href,
      patch: pathToFileURL(join(ROOT, 'tools/guards/lib/thrown-patch.mjs')).href,
    },
  });
}
