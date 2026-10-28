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
 *   - ON (v2.3.3736: the default -- the owner, 2026-10-28: "I think
 *     including the new memory change work by default would be better. I
 *     can always revert the change if I don't like it or it doesn't work
 *     well."): a window's script is fetched the first time it is opened
 *     (the Sound Studio and the Test panel already load that way), and kept
 *     from then on.  Until it has come the window draws nothing; it draws
 *     itself the moment it does (a few ms from the phone's cache, which
 *     public/_headers lets keep the hashed scripts).
 *   - `?codelazy=0` in the address: every one of them is fetched at once,
 *     as the page starts, behind the loading screen -- the page holds the
 *     same code it did before v2.3.3717.
 *
 * ═══ v2.3.3736: A WINDOW WHOSE SCRIPT CANNOT COME ═══
 * A tab left open across a deploy asks for its OLD build's scripts, and
 * Cloudflare Pages no longer has them: a 404, or the page itself in their
 * place, which fails as a script.  A deploy can land while the judges play.
 * So a fetch that fails is tried once more (LAZY_RETRY_MS later: a dropped
 * connection), and failing again the window says so in plain words --
 * "Couldn't open this. Reload the game to get the newest version." -- with
 * Reload (the page again: the new build's scripts) and Close (the window's
 * own close, from lazyPanels.js, so the game is not left "busy"
 * (uiBusyBus) behind a window with no ✕).  Nothing else stops: the game
 * plays on under it.  Opened again later, the window tries again.
 *
 * Never a window a fight uses: the bag, the skills, the hero sheet, the
 * touch controls and the HUD stay in the main script (code is not art, so
 * PRELOADING IS LAW does not cover it; but a window must never hitch a
 * fight).  docs/specs/worker-code-diet.md.
 */
import React from 'react';
import { clientOffAtLoad } from '../game/clientOff.js';   /* v2.3.3755 */
import { createPortal } from 'react-dom';
import { fixedBox } from './fixedBox.js';
import { swallowTapClick } from './swallowTapClick.js';

/* v2.3.3755: ...unless the Test panel's Memory savers row turned it off, from
   the next load (game/clientOff.js) */
export const CODE_LAZY = (() => {
  try { return !/(^|[?&])codelazy=(0|off|false)(&|$)/.test(window.location.search || '') && !clientOffAtLoad('codelazy'); } catch (e) { return true; }
})();
const LAZY_RETRY_MS = 1500;

const _loaded = [];        /* the names of the windows whose code has come */
const _failed = [];        /* ...and those whose code could not come (v2.3.3736) */
const _named = [];         /* every window made here */
const _cards = { shown: 0, closed: 0 };   /* v2.3.3736: "Couldn't open this" cards shown and closed (QA) */
/* the probe the memory tests read: is the switch on, and which windows' code
   has come (tools/qa/mp's membudget and the lazy-code check) */
try { if (typeof window !== 'undefined') window.__btLazyCode = { on: CODE_LAZY, loaded: () => _loaded.slice(), named: () => _named.slice(), failed: () => _failed.slice(), cards: _cards }; } catch (e) { /* no page */ }

/* A component that draws `name` from the module `load()` brings.  A failed
   fetch is tried once more; failing again, the window says it could not open
   (CantOpen), and `close(props)` -- the window's own close, when it has one
   -- closes it.  Opened again, it tries again.  `quiet`: a part of a window
   whose window says so itself (the Achievements page's header row: two
   cards, stacked, and Close took only one away -- mp-lazyfail) draws
   nothing. */
export function lazyPanel(load, name, close, quiet) {
  let mod = null, pending = null, url = null, tries = 0;
  const get = () => {
    if (mod) return Promise.resolve(mod);
    if (!pending) {
      /* a browser keeps a failed module's failure (Chromium answers the same
         import() again at once, asking nothing of the network), so a try
         after a failure asks for the script's own address with a fresh query,
         read off the failure (Chromium and Firefox name it; where none is
         named, the plain import() again) */
      const go = url ? () => import(/* @vite-ignore */ url + (url.indexOf('?') < 0 ? '?' : '&') + 'try=' + (++tries)) : load;
      pending = go().then((m) => {
        if (!m || typeof m[name] !== 'function' && typeof m[name] !== 'object') throw new Error('no ' + name);
        mod = m; _loaded.push(name); return m;
      }, (e) => {
        pending = null;
        const hit = /(https?:\/\/[^\s'"]+?\.js)(?:[?#][^\s'"]*)?(?=$|[\s'"])/.exec(String((e && e.message) || e));
        if (hit && !url) url = hit[1];
        throw e;
      });
    }
    return pending;
  };
  function LazyPanel(props) {
    const [, force] = React.useState(0);
    const [failed, setFailed] = React.useState(false);
    React.useEffect(() => {
      if (mod) return undefined;
      let live = true, timer = 0;
      const fail = () => { if (!live) return; if (_failed.indexOf(name) < 0) _failed.push(name); setFailed(true); };
      get().then(() => { if (live) force((v) => v + 1); },
        () => {
          if (!live) return;
          timer = setTimeout(() => get().then(() => { if (live) force((v) => v + 1); }, fail), LAZY_RETRY_MS);
        });
      return () => { live = false; clearTimeout(timer); };
    }, []);
    if (mod) return React.createElement(mod[name], props);
    if (!failed || quiet) return null;
    return React.createElement(CantOpen, { onClose: close ? () => { try { close(props); } catch (e) { /* closed */ } } : null });
  }
  LazyPanel.displayName = 'Lazy(' + name + ')';
  _named.push(name);
  /* the switch off: fetched now, as the page starts, as part of it */
  if (!CODE_LAZY) get().catch(() => {});
  return LazyPanel;
}

/* v2.3.3736: the window that could not open.  Plain words, Reload and Close,
   in the middle of the play column (fixedBox), over the game but stopping
   nothing in it.  On the page's body (a portal), not where the window would
   have stood: a fixed box inside a moved or scaled panel (the dashboard's
   band, a building's card) is placed by that panel, not the screen. */
function CantOpen({ onClose }) {
  const [gone, setGone] = React.useState(false);
  React.useEffect(() => { _cards.shown++; }, []);
  if (gone) return null;
  if (typeof document === 'undefined' || !document.body) return null;
  const b = fixedBox(null);
  const btn = { touchAction: 'manipulation', minHeight: 40, padding: '8px 16px', borderRadius: 10, border: '1px solid #c9a24a',
    background: '#2b2116', color: '#f4e6c4', font: 'inherit', fontWeight: 700, cursor: 'pointer' };
  return createPortal(React.createElement('div', {
    'data-lazy-cantopen': '1',
    role: 'alertdialog',
    style: { position: 'fixed', left: b.x + b.w / 2, top: b.y + b.h / 2, transform: 'translate(-50%, -50%)', zIndex: 9000,
      width: Math.min(300, Math.max(200, b.w - 32)), boxSizing: 'border-box', padding: '16px 18px', borderRadius: 14,
      background: 'rgba(20, 15, 10, 0.94)', border: '1px solid #c9a24a', color: '#f4e6c4', textAlign: 'center',
      touchAction: 'manipulation', boxShadow: '0 6px 24px rgba(0,0,0,0.5)' },
  },
  React.createElement('div', { style: { fontWeight: 700, fontSize: 16, marginBottom: 6 } }, "Couldn't open this"),
  React.createElement('div', { style: { fontSize: 14, lineHeight: 1.35, marginBottom: 14 } }, 'Reload the game to get the newest version.'),
  React.createElement('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
    /* each acts on the lift, as the game's own controls do (swallowTapClick,
       TRAPS §247: the card is gone before the tap's click lands on the game
       under it), and on a click for a key (data-enter / data-esc) -- once */
    React.createElement('button', { type: 'button', 'data-enter': '1', style: btn, ...act(() => { try { window.location.reload(); } catch (e) { /* stays */ } }) }, 'Reload'),
    React.createElement('button', { type: 'button', 'data-esc': '1', style: btn, ...act(() => { _cards.closed++; setGone(true); if (onClose) onClose(); }) }, 'Close'))), document.body);
}
function act(fn) {
  let done = false;
  const go = () => { if (done) return; done = true; fn(); };
  return { onPointerUp: (e) => { swallowTapClick(e); go(); }, onClick: go };
}
