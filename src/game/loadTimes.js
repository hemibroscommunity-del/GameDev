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
 * v2.3.6760: AND WHAT THE SCREEN WAITED FOR, AND WHY IT LIFTED.  The owner's
 * phone (2026-11-26) read the pictures ready 11.9 s into the loading screen
 * and the world 13.1 s into it, yet the screen was up 21.3 s: IntroVideo's 20 s
 * limit plus its 1 s fade.  It lifted because the limit fired, not because
 * loading finished; what it still waited for is the end of
 * preloadPlayerAssets() -- the bro's own chain after the loads (the worn
 * armour's masked body frames baked, the spare sets, the uploads).  So the
 * bro's own steps (`bro-loads` .. `bro-done`, noted from pixiRenderer's
 * _preStep), the armour's frames ready of wanted at the moment the screen
 * lifted, and WHY it lifted ("ready" or "its 20 s limit", IntroVideo.jsx
 * markLift) are in the readout too, in the same order every time.  Marks and
 * words only: nothing about when the screen lifts changes.
 *
 * No imports, so node can test it.
 */

const _marks = [];                       /* [{ key, t }] in the order they came */
const _seen = Object.create(null);
const _waits = Object.create(null);      /* v2.3.6763: step -> who waits for it (whenMarked) */
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
  const w = _waits[key];
  if (w) { delete _waits[key]; for (const r of w) { try { r(); } catch (e) { /* a waiter's own */ } } }
}

/* v2.3.6763: a promise that settles when a step is noted (at once if it was):
   the spare armour sets wait for 'world', the loading screen gone
   (pixiRenderer.js preloadPlayerAssets, game/spareLater.js) */
export function whenMarked(key) {
  if (_seen[key]) return Promise.resolve();
  return new Promise((r) => { (_waits[key] || (_waits[key] = [])).push(r); });
}

/* v2.3.6763: the spare armour sets bake AFTER the loading screen (the owner's
   yes, 2026-11-27; `?sparelater=0` the old order).  Told once by
   pixiRenderer.js; the readout then lists 'bro-alt' after 'bro-done', the
   order the steps run in, and the panel's words say it was after the screen. */
let _spareLater = false;
export function noteSpareLater(on) { _spareLater = !!on; }

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

let _lift = null;                        /* v2.3.6760: { limit, capS, armour, t } */

/** v2.3.6760: the loading screen began to lift (IntroVideo.jsx maybeFinish):
 *  `limit` is false when the bro's own preload settled by itself ("ready"), true
 *  when the screen's safety limit (`capMs`) lifted it first (a flag, never a
 *  word: the words are DevPanel.jsx's).  The armour's frames
 *  ready of wanted are read at this moment (QA's __btMaskedCoverage; none
 *  worn reads want 0, no reader reads null).  The first call only. */
export function markLift(limit, capMs) {
  if (_lift) return;
  let armour = null;
  try {
    const f = typeof window !== 'undefined' ? window.__btMaskedCoverage : null;
    const c = typeof f === 'function' ? f() : null;
    if (c && typeof c.want === 'number' && typeof c.have === 'number') armour = { want: c.want, have: c.have };
  } catch (e) { /* the readout then says --, the screen lifts all the same */ }
  _lift = { limit: !!limit, capS: capMs ? Math.round(capMs / 1000) : null, armour, t: Math.round(now()) };
}

const STEPS = [
  ['app', 'The game started (downloaded and running)'],
  ['loading', 'The loading screen came up'],
  ['pictures', 'The pictures were ready'],
  ['arrival', 'The world began loading'],
  ['arrived', 'The world was loaded'],
  ['world', 'The loading screen was gone'],
];

/* v2.3.6760: the bro's own steps after the pictures, in the order
   preloadPlayerAssets() runs them (pixiRenderer.js _preStep notes each as
   'bro-<step>').  Keys only: the words the Test panel prints for them are
   DevPanel.jsx's (loadTimesLines), a developer-only file. */
const BRO_STEPS = ['bro-loads', 'bro-masks', 'bro-alt', 'bro-upload', 'bro-gear', 'bro-done'];
/* v2.3.6763: ...and with the spare sets after the screen, the order they run in now */
const BRO_STEPS_LATER = ['bro-loads', 'bro-masks', 'bro-upload', 'bro-gear', 'bro-done', 'bro-alt'];

/** This page's load so far: each step's moment (s since the page began), the
 *  loading screen's own length, and the slowest picture groups. */
export function loadTimes() {
  const at = Object.create(null);
  for (const m of _marks) at[m.key] = m.t;
  const s = (ms) => (ms == null ? null : +(ms / 1000).toFixed(1));
  const steps = STEPS.map(([key, label]) => ({ key, label, at: s(at[key]) }));
  const bro = (_spareLater ? BRO_STEPS_LATER : BRO_STEPS).map((key) => ({ key, at: s(at[key]) }));
  const screen = at.loading != null && at.world != null ? s(at.world - at.loading) : null;
  const groups = Object.keys(_groups).map((name) => ({ name, s: s(_groups[name]) }))
    .sort((a, b) => b.s - a.s);
  const lift = _lift ? { limit: _lift.limit, capS: _lift.capS, armour: _lift.armour, at: s(_lift.t) } : null;
  return { steps, screen, groups, groupsFrom: s(_groupsFrom), bro, lift, spareLater: _spareLater };
}

/** The same as lines of text, for the panel's copy button (and a screenshot).
 *  `middle`: lines to set after the loading screen's own length. */
export function loadTimesText(lt, middle) {
  const L = lt || loadTimes();
  const out = [];
  for (const st of L.steps) out.push((st.at == null ? '   --' : String(st.at.toFixed(1)).padStart(5) + ' s') + '  ' + st.label);
  if (L.screen != null) out.push('The loading screen was up ' + L.screen.toFixed(1) + ' s');
  /* v2.3.6760: the lines the panel puts here (why it lifted, the bro's own
     steps, the armour at the lift: DevPanel.jsx loadTimesLines), the same
     lines in the same order every time */
  for (const l of (middle || [])) out.push(l);
  if (L.groups.length) {
    out.push('Slowest pictures (s after they began):');
    for (const g of L.groups.slice(0, 6)) out.push('  ' + g.s.toFixed(1) + ' s  ' + g.name);
  }
  return out.join('\n');
}

if (typeof window !== 'undefined') {
  try { window.__btLoadTimes = () => loadTimes(); } catch (e) { /* QA only */ }
}
