/* ═══ v2.3.3717: THE RARE WINDOWS' CODE, LOADED WHEN FIRST OPENED (`?codelazy`) ═══
 *
 * The owner, 2026-10-28: "The game needs to be extremely memory efficient."
 * The page keeps all of its script's text, and every function the script
 * makes as it runs (the memory check's `buffers` and `heap` lines), whether
 * or not that code is ever used.  Windows a player opens now and then -- the
 * leaderboard, the codex, achievements, the guild, the exchange, the arena's
 * window, a player's profile... -- were all in the one main script.  Each is
 * its own small script now (vite splits at an `import()`), named in
 * lazyPanels.js, and stands in the page as the component this makes:
 *
 *   - `?codelazy` in the address: a window's script is fetched the first
 *     time it is opened (the Sound Studio and the Test panel already load
 *     that way), and kept from then on.  Until it has come the window draws
 *     nothing; it draws itself the moment it does (a few ms from the phone's
 *     cache, which public/_headers lets keep the hashed scripts).
 *   - without it (the default today): every one of them is fetched at once,
 *     as the page starts, behind the loading screen -- the page holds the
 *     same code it always did, each window draws on its first open exactly
 *     as before.
 *
 * Never a window a fight uses: the bag, the skills, the hero sheet, the
 * touch controls and the HUD stay in the main script (code is not art, so
 * PRELOADING IS LAW does not cover it; but a window must never hitch a
 * fight).  docs/specs/worker-code-diet.md.
 */
import React from 'react';
import { clientOffAtLoad } from '../game/clientOff.js';   /* v2.3.3755 */

/* v2.3.3755: ...unless the Test panel's Memory savers row turned it off, from
   the next load (game/clientOff.js) */
export const CODE_LAZY = (() => {
  try { return /(^|[?&])codelazy(=|&|$)/.test(window.location.search || '') && !clientOffAtLoad('codelazy'); } catch (e) { return false; }
})();

const _loaded = [];        /* the names of the windows whose code has come */
const _named = [];         /* every window made here */
/* the probe the memory tests read: is the switch on, and which windows' code
   has come (tools/qa/mp's membudget and the lazy-code check) */
try { if (typeof window !== 'undefined') window.__btLazyCode = { on: CODE_LAZY, loaded: () => _loaded.slice(), named: () => _named.slice() }; } catch (e) { /* no page */ }

/* A component that draws `name` from the module `load()` brings.  Tries a
   failed fetch again on the next open (and twice more while open, a few
   seconds apart: a phone's connection drops). */
export function lazyPanel(load, name) {
  let mod = null, pending = null;
  const get = () => {
    if (mod) return Promise.resolve(mod);
    if (!pending) {
      pending = load().then((m) => { mod = m; _loaded.push(name); return m; },
        (e) => { pending = null; throw e; });
    }
    return pending;
  };
  function LazyPanel(props) {
    const [, force] = React.useState(0);
    React.useEffect(() => {
      if (mod) return undefined;
      let live = true, tries = 0, timer = 0;
      const go = () => get().then(() => { if (live) force((v) => v + 1); },
        () => { if (live && ++tries < 3) timer = setTimeout(go, 2500); });
      go();
      return () => { live = false; clearTimeout(timer); };
    }, []);
    return mod ? React.createElement(mod[name], props) : null;
  }
  LazyPanel.displayName = 'Lazy(' + name + ')';
  _named.push(name);
  /* the switch off: fetched now, as the page starts, as part of it */
  if (!CODE_LAZY) get().catch(() => {});
  return LazyPanel;
}
