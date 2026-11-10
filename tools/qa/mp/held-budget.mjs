/* ═══ THE PAGE-HELD BUDGET (v2.3.4470) ═══
 *
 * mp-heldsweep.mjs plays a tour of the game with a profiler on the phone and
 * names every job that holds the page's one thread.  These are its lines, the
 * memory budget's way (memory-budget.mjs): a run fails when a family holds
 * the page longer than its line.
 *
 *   HOLD_MAX_MS      the longest any job may hold the page OUTSIDE the game's
 *                    frame while the world is in play, unless listed below;
 *   FRAME_JS_MAX_MS  the most of the game's own code one frame may run
 *                    (the browser's drawing calls are not counted: this box
 *                    draws in software; a call that WAITS for the graphics
 *                    chip is);
 *   WINDOW_MAX_MS    at a window (the stations in AT_A_WINDOW: a tap opened
 *                    it, the world is behind it), the tap's own redraw may
 *                    take this long in one piece;
 *   NOISE_K          one hold past its line by less than this much is the
 *                    profiler's noise (a garbage collection landed in it);
 *                    two are not, and one far past is not;
 *   KNOWN            the families that are over those today, each with the
 *                    line it is held to, WHY, and what fixes it NEXT.  This
 *                    is the DEBT LIST (docs/specs/held-sweep.md): a line is
 *                    lowered when its family is fixed, and the family comes
 *                    off the list when it is under the general line.  Never
 *                    raise one silently: say in the PR body how many ms and
 *                    why.
 *
 * Numbers are this QA box's (its JavaScript is about a phone's: a bake that
 * took 91 ms here took 101 on the owner's iPhone 14 Pro Max; its graphics
 * chip is software, many times slower than any phone's).  No imports: the
 * judge below is tested in node (server/test/held-sweep.test.mjs).
 */
export const HOLD_MAX_MS = 12;
export const FRAME_JS_MAX_MS = 16;
export const WINDOW_MAX_MS = 45;
export const AT_A_WINDOW = ['windows', 'folk'];
export const NOISE_K = 1.5;

export const KNOWN = {
  'body-bake': { ms: 220,
    why: 'the head an armoured player shows (<pose>-<dir>-head sheets) is recoloured on the page for each look the first time it is drawn: 28 to 164 ms a sheet as an armoured player circles you',
    next: 'key them by skin alone (they take no trouser or boot colour), then keep them as numbers like the bodies (a look set); the same for a body with an eye style or a drawing (STATE-MACHINES A2)' },
  'masked-bake': { ms: 140,
    why: 'armour cut to the body ON THE PAGE, inside a frame, when a frame is wanted before the worker has it (armour put on outside the Gear window, a pose first seen): 17 to 107 ms',
    next: 'draw the bare look until the worker answers (never bake inline in play), and prewarm the poses of what was just put on' },
  'pack-page': { ms: 80,
    why: "a gear strip cropped and packed on a canvas on the page the first time its pose is drawn (another player's gear, armour just put on): 21 to 59 ms",
    next: 'the strip door: gear strips are 256-colour files too (read and packed on the worker, as the monsters are)' },
  'screen-check': { ms: 260,
    why: "only with a SECOND page open on this box (the other player's own browser): both pages draw on one software graphics chip, and the black-screen check's collect waits for the other page's frames too, 106 to 208 ms.  With one page it is 0 to 2 ms since the collect moved to the top of the frame (it was 110 to 206)",
    next: 'nothing here: two pages are never on one phone.  On a phone the frame strip names it ("screen check N ms") if it is ever 4 ms or more' },
  'strip-made': { ms: 24,
    why: "the page's own part of a monster's strip coming in: its numbers put on its bundle's row of colours and handed to the graphics chip, 5 to 19 ms for the biggest strips (the reading and packing are off the page)",
    next: "send the bundle's row with the ask so the worker numbers the strip for it, and the page only hands it to the chip" },
  'the frame itself': { ms: 70,
    why: "one frame's own code on this box, which plays a quarter of a second of game in each (it draws four a second): every monster, bubble and name plate that changed in that time is done in one frame",
    next: 'mp-phoneframe is the measure of a frame at a phone\'s rate; here the line only stops it growing' },
  gc: { ms: 60,
    why: "the browser's garbage collector, 8 to 45 ms at a time: it runs when the page has made enough garbage",
    next: 'make less of it per frame (the pools: docs/OPTIMIZATION-ROADMAP.md); nothing here calls it' },
  'ui:*': { ms: 16,
    why: 'one component of the band drawn in one piece (the gear tab is 10 ms of one function): React lets a frame in between components, not inside one',
    next: 'split the gear tab so no one piece of it is over 5 ms' },
  'other: BT_AUDIO$1._fold > foldToMono': { ms: 30,
    why: 'a sound with two sides folded to one the first time it plays: 14 to 21 ms',
    next: 'fold as it is decoded, behind the loading screen or off the first play' },
  'other: _flushOutbox > Wrapped.ws.send': { ms: 30,
    why: 'a message to the server handed to the browser: 18 ms once a tour, on a change of armour',
    next: 'watch it; not understood yet' },
};

const lineFor = (key, kind, where) => {
  const k = KNOWN[key] || (key.startsWith('ui:') ? KNOWN['ui:*'] : null);
  const base = k ? k.ms : (kind === 'frame' ? FRAME_JS_MAX_MS : HOLD_MAX_MS);
  return AT_A_WINDOW.includes(where) ? Math.max(base, WINDOW_MAX_MS) : base;
};

/** A tour's stations -> its families ranked by their longest hold, and those over their lines.
 *  stations: [{ name, held: [{ ms, key, what, via }], frames: { long: [{ ms, key, via }] } }] */
export function judgeHeld(stations) {
  const fam = new Map();
  const bump = (key, what, ms, where, kind, via) => {
    let f = fam.get(key);
    if (!f) { f = { key, what, n: 0, sum: 0, longest: 0, where: new Set(), frame: 0, outside: 0, via: '', holds: [] }; fam.set(key, f); }
    f.n++; f.sum += ms; f[kind]++; f.where.add(where);
    if (ms > f.longest) { f.longest = ms; f.via = via || ''; }
    f.holds.push({ ms, where, kind });
  };
  for (const st of stations || []) {
    for (const s of st.held || []) bump(s.key === 'other' ? 'other: ' + s.what : s.key, s.what, s.ms, st.name, 'outside', s.via);
    for (const f of (st.frames && st.frames.long) || []) bump(f.key, f.key, f.ms, st.name, 'frame', f.via);
  }
  const ranked = [...fam.values()].sort((a, b) => b.longest - a.longest);
  const over = [];
  for (const f of ranked) {
    let n = 0, worst = 0, at = null;
    for (const h of f.holds) {
      const line = lineFor(f.key, h.kind, h.where);
      if (!(h.ms > line)) continue;
      n++;
      const k = h.ms / line;
      if (k > worst) { worst = k; at = { ms: h.ms, line, where: h.where }; }
    }
    if (n >= 2 || worst > NOISE_K) over.push({ key: f.key, times: n, longest: at.ms, line: at.line, where: at.where, via: f.via, listed: !!(KNOWN[f.key] || (f.key.startsWith('ui:') && KNOWN['ui:*'])) });
  }
  return {
    ranked: ranked.map((f) => ({ key: f.key, what: f.what, n: f.n, sum: Math.round(f.sum), longest: +f.longest.toFixed(1), where: [...f.where].join(', '), frame: f.frame, outside: f.outside, via: f.via })),
    over,
  };
}
