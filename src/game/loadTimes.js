/* ═══ v2.3.5019: THE LOAD TIMER -- WHERE A PHONE'S LOADING TIME GOES ═══
 *
 * The loading time measured on the QA box (mp-coldload, 2026-11-13): 32 MB in
 * 1,808 requests, 27 to 44 s to playable, and only ~5 s of it the page's own
 * work -- the rest waiting (the downloads, the workers, the steps behind each
 * other), and how long each wait is depends on the machine and its line.  The
 * box cannot say what a phone waits on.  Offered a timer in the Test panel to
 * find out, the owner: "Continue Going recommended".
 *
 * So the page notes the moment each step of a load ends (performance.now(),
 * ms since the page began loading), once a page:
 *   app       the game's code is running (main.jsx)
 *   loading   the loading screen is up and the preload begun (BroTown.jsx,
 *             preloadPlayerAssets: after Continue, or at once on a resume)
 *   pictures  every picture group behind the loading screen settled
 *             (preloadAnimations.js: each group's own time is noted too)
 *   arrival / arrived   the world where you arrive began and finished
 *             loading (zoneTransitions.js: the Wheel's zone gate)
 *   world     the loading screen gone, the world on screen
 *             (onboardingPace.js markWorldIn)
 * and the Test panel shows them (DevPanel.jsx "Loading times"): each step's
 * length, the slowest picture groups, and a copy of it all as text.  Nothing
 * is sent anywhere, nothing is kept past the page.
 *
 * No imports, so node can test it.
 */

const _marks = [];                       /* [{ key, t }] in the order they came */
const _seen = Object.create(null);
const _groups = Object.create(null);     /* picture group -> ms after its wave began */
let _groupsFrom = null;

function now() {
  try { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); } catch (e) { return Date.now(); }
}

/** Note that a step of this page's load ended (the first time only). */
export function markLoad(key) {
  if (!key || _seen[key]) return;
  _seen[key] = true;
  _marks.push({ key: String(key), t: Math.round(now()) });
}

/** The picture groups behind the loading screen: each one's end, timed from
 *  when the groups began.  Returns the groups as given (the promises). */
export function timeLoadGroups(groups) {
  const from = now();
  if (_groupsFrom == null) _groupsFrom = Math.round(from);
  for (const name of Object.keys(groups || {})) {
    const done = () => { if (_groups[name] == null) _groups[name] = Math.round(now() - from); };
    try { Promise.resolve(groups[name]).then(done, done); } catch (e) { /* a group's own trouble */ }
  }
  return groups;
}

const STEPS = [
  ['app', 'The game started (downloaded and running)'],
  ['loading', 'The loading screen came up'],
  ['pictures', 'The pictures were ready'],
  ['arrival', 'The world began loading'],
  ['arrived', 'The world was loaded'],
  ['world', 'The loading screen was gone'],
];

/** This page's load so far: each step's moment (s since the page began), the
 *  loading screen's own length, and the slowest picture groups. */
export function loadTimes() {
  const at = Object.create(null);
  for (const m of _marks) at[m.key] = m.t;
  const s = (ms) => (ms == null ? null : +(ms / 1000).toFixed(1));
  const steps = STEPS.map(([key, label]) => ({ key, label, at: s(at[key]) }));
  const screen = at.loading != null && at.world != null ? s(at.world - at.loading) : null;
  const groups = Object.keys(_groups).map((name) => ({ name, s: s(_groups[name]) }))
    .sort((a, b) => b.s - a.s);
  return { steps, screen, groups, groupsFrom: s(_groupsFrom) };
}

/** The same as lines of text, for the panel's copy button (and a screenshot). */
export function loadTimesText(lt) {
  const L = lt || loadTimes();
  const out = [];
  for (const st of L.steps) out.push((st.at == null ? '   --' : String(st.at.toFixed(1)).padStart(5) + ' s') + '  ' + st.label);
  if (L.screen != null) out.push('The loading screen was up ' + L.screen.toFixed(1) + ' s');
  if (L.groups.length) {
    out.push('Slowest pictures (s after they began):');
    for (const g of L.groups.slice(0, 6)) out.push('  ' + g.s.toFixed(1) + ' s  ' + g.name);
  }
  return out.join('\n');
}

if (typeof window !== 'undefined') {
  try { window.__btLoadTimes = () => loadTimes(); } catch (e) { /* QA only */ }
}
