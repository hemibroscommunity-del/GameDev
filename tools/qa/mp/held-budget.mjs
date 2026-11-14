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
 *                    why.  v2.3.4499: `at` is a family's own line at a
 *                    named station of a tour that measured it higher (the
 *                    crowd tour's stations, mp-crowdsweep), and `crowd` what
 *                    that tour found; every other station keeps `ms`.
 *                    v2.3.5041: `whose` -- whose it is to bring down:
 *                      'ours'     the game's own work on the page.  The grand
 *                                 plan's step 3.1 is done when no row is ours
 *                                 (docs/GRAND-PLAN.md, pillar 3);
 *                      'box'      this QA box's: its software graphics chip,
 *                                 the quarter second of game it plays in one
 *                                 frame.  A phone has neither; the line only
 *                                 stops it growing;
 *                      'browser'  the browser's own (its garbage collector):
 *                                 the game can only give it less to do.
 *                    A new family is ours until a measurement says otherwise
 *                    (held-sweep.test 7b3 holds the box's and the browser's
 *                    to the three named today).
 *
 * Numbers are this QA box's (its JavaScript is about a phone's: a bake that
 * took 91 ms here took 101 on the owner's iPhone 14 Pro Max; its graphics
 * chip is software, many times slower than any phone's).  No imports: the
 * judge below is tested in node (server/test/held-sweep.test.mjs).
 */
export const HOLD_MAX_MS = 12;
export const FRAME_JS_MAX_MS = 16;
export const WINDOW_MAX_MS = 45;
export const AT_A_WINDOW = ['windows', 'folk', 'g-boards'];   /* v2.3.4499: + the crowd tour's Leaderboards (mp-crowdsweep) */
export const NOISE_K = 1.5;

export const KNOWN = {
  'body-bake': { ms: 13, whose: 'ours',   /* v2.3.4960: 220 -> 13: none in the main tour (peer, armour) since v2.3.4930's worker; held to just over the general line while h-eight keeps the family listed */
    why: 'the head an armoured player shows (<pose>-<dir>-head sheets) is recoloured on the page for each look the first time it is drawn: 28 to 164 ms a sheet as an armoured player circles you.  v2.3.5013: in play, only where the body bake\'s worker is off or let go of (bodyBake.js); the heads are drawn from colour numbers since v2.3.4961',
    next: 'key them by skin alone (they take no trouser or boot colour), then keep them as numbers like the bodies (a look set); the same for a body with an eye style or a drawing (STATE-MACHINES A2)',
    /* v2.3.4499: the crowd tour (mp-crowdsweep, docs/specs/held-sweep.md "The crowd tour"), five runs, the worst of each */
    at: { 'a-ink': 12, 'b-fish': 12, 'c-armour1': 12,   /* v2.3.4872: the pickaxe's outline turned round (toolWood.js solidTool): c-armour1 179 -> 62 ms, the crowd's armour stations 229 -> 169.  v2.3.4960: 90 -> 12 (none) */
      'c-armour8': 12, 'h-eight': 12, 'd-prints': 12 },   /* v2.3.5013: h-eight 120 -> 12 (none; 11.1 / 9.1 / 10.3 ms the longest hold of any family, three runs; was 208 to 238 ms, 7 times).  Not the heads (the numbers draw those since v2.3.4961): the fish sheets of the armoured players who had cast, baked on the page because the watch let both busy workers go.  bodyBakeWorker.js: one job at a time and a beat between its steps */   /* v2.3.4960: d-prints 190 -> 12 (none).  h-eight NOT lowered: 2026-11-12 it measured 227 ms, 29 bakes on the page (bakeBodyFull and mostly bakeHeadFull): with eight armoured players the body bake's worker stalls past its 20 s watch (bodyBake.js WORKER_MS), is let go of, and the page bakes.  Over its line, left as it was (never raised silently) */
    /* v2.3.4930: in play every one of these bakes runs on the body bake's worker (bodyBake.js, docs/specs/body-bake-worker.md):
       the body sheets (a drawing, an eye style, the fish), the armoured heads, a peer's drawn stand-ins.  The crowd tour,
       a-ink, b-fish and c-armour8, before (`?bodyworker=0`) and after: 546 / 179 / 202 ms longest, 53 holds and 6.2 s in all
       -> none (the longest hold of any family 10.5 / 7.7 / 36.1 ms).  Those three stations' lines are locked at the general
       line; the main tour (peer, armour) and the crowd's other stations were not run again here, and keep theirs */
    crowd: 'a player with a tattoo or a trouser print: every pose and facing they show is a body sheet baked on the page, 114 to 720 ms each, a dozen in the first 20 s (a-ink).  ANY player of a look not yet seen who fishes: the 32-frame fish sheet, 92 to 198 ms (b-fish, c-armour8: one per look, armour or not, a shirt or not).  Armoured players arriving: 36 to 267 ms per look and pose; walking about after, still 60 to 112 ms (h-eight).  The pickaxe made solid in the mining body (solidTool) is part of the same bake.  Fix: the bodies with drawings as a row of colours with the drawing stamped on the worker (the fish sheet too: it has no shirt or eye, lookBodyRefused already passes it), or the bake on a worker' },
  'masked-bake': { ms: 24, whose: 'ours',
    why: "v2.3.4870: no longer cut on the page in play (another player's armour drew it inline, in the frame, at first sight and each new facing: 17 to 107 ms; the crowd tour's c-armour stations 54 ms, 28 times).  What is left is the worker job's page-side part: the frames handed over as pictures (_frameInput > createImageBitmap) and the look sheets sent, 8 to 18 ms",
    next: 'hand the worker the sheets once (as the look sheets are) and send it frame rectangles, not a picture a frame; prewarm the poses of what was just put on' },
  'pack-page': { ms: 20, whose: 'ours',
    why: "v2.3.4873: a gear sheet first drawn in play is packed a few ms at a time (gearSheets.js _gearPack > packTrimmedSliced; was one go, 21 to 59 ms).  What is left: one cell's read on this box (getImageData, up to 9 ms) and the packed sheet handed to the page as a file of its own (keepAsImage): 9 to 15 ms",
    next: 'the strip door: gear strips as 256-colour files read and packed on the worker, as the monsters are' },
  'screen-check': { ms: 260, whose: 'box',
    why: "only with a SECOND page open on this box (the other player's own browser): both pages draw on one software graphics chip, and the black-screen check's collect waits for the other page's frames too, 106 to 208 ms.  With one page it is 0 to 2 ms since the collect moved to the top of the frame (it was 110 to 206)",
    next: 'nothing here: two pages are never on one phone.  On a phone the frame strip names it ("screen check N ms") if it is ever 4 ms or more',
    crowd: "(no line of its own: the crowd tour now plays the species last) with one page, when the chip is swamped (the first crowd tours, after the species churn, 377 MB on it): the fenced read is not back within its frames and the check falls back to its OLD way, a drawImage copy of the canvas that waits for the chip: 465 to 625 ms, a dozen times.  Fix the churn first (speciesArt, below); then the old way should not run in play at all (skip a check rather than copy)" },
  'strip-made': { ms: 24, whose: 'ours',
    why: "the page's own part of a monster's strip coming in: its numbers put on its bundle's row of colours and handed to the graphics chip, 5 to 19 ms for the biggest strips (the reading and packing are off the page)",
    next: "send the bundle's row with the ask so the worker numbers the strip for it, and the page only hands it to the chip" },
  'the frame itself': { ms: 70, whose: 'box',
    why: "one frame's own code on this box, which plays a quarter of a second of game in each (it draws four a second): every monster, bubble and name plate that changed in that time is done in one frame",
    next: 'mp-phoneframe is the measure of a frame at a phone\'s rate; here the line only stops it growing',
    crowd: 'v2.3.4871 FIXED, one 39 ms frame left as they arrive (each pair built once; was 25 frames of 30 to 36 ms).  Was: v2.3.4499: eight species-and-skin pairs churning their builds recolour fur inside the frame (speciesArt.js _compose > retintSkinPixels): 28 to 70 ms frames, 15 of them in a minute (e-species).  Goes with the churn (gc, below)' },
  gc: { ms: 60, whose: 'browser',
    why: "the browser's garbage collector, 8 to 45 ms at a time: it runs when the page has made enough garbage",
    next: 'make less of it per frame (the pools: docs/OPTIMIZATION-ROADMAP.md); nothing here calls it',
    /* v2.3.4499: the crowd tour: one armoured player walking about, 0 to 1 collections in 25 s (the longest 31 ms);
       eight, 3 to 7 (the longest 17 to 29 ms).  Then the species churn (played last): every collection longer and longer */
    /* v2.3.4871: the species churn fixed (speciesArt.js: a build kept while drawn): e-species 67.6 ms worst, 18 times
       -> 9 ms, 3 times; its own line (100) is gone, the family's 60 stands */
    crowd: 'v2.3.4871 FIXED (was:) eight species-and-skin pairs on screen (e-species) churn their builds (speciesArt.js _BUILD_CAP 6: each frame lets go of one and builds another, and what it let go of is freed 30 s later): 566 pictures of 256 x 256 made in a minute, 187 MB, then 757 and 250 MB.  The collector holds the page 35 to 100 ms at a time, and when the first tours went on after it, 336 to 698 ms walking into the crowd and up to 1076 ms at the Leaderboards.  On an iPhone this is the black screen, not a hitch.  Fix: a cap that is never under the looks on screen (or the build kept while its player is), and a let-go freed at once when nothing draws it' },
  /* ── v2.3.4499: found by the crowd tour (mp-crowdsweep) ── */
  'gear-sheet': { ms: 195, whose: 'ours',
    /* v2.3.5014: d-prints 12 (none: the longest hold of any family 8.2 / 11.9 / 7.4 ms, three runs; was 180.7 to 238.9 ms,
       7 to 15 times): a drawn shirt is dressed on the body bake's worker in play (gearSheets.js _buildShirtOnWorker,
       effectsRenderer.js _dressedOnWorker).  The family's own 195 stands: only d-prints was run again */
    at: { 'd-prints': 12 },
    why: "a drawn shirt composed on the page for each player who wears one, the first time each pose is drawn (composeShirt > stampShirtArt): 121 to 192 ms each, 8 to 13 times as ten players in drawn shirts swung, rolled and mined beside you (d-prints).  gearSheets.js keeps 8 drawings baked: with ten on screen none were seen to bake again in the 25 s",
    next: 'stamp the drawing on the worker (the shirt is a 256-colour file like the rest), or draw the drawing as its own layer over the plain shirt instead of baking it into a sheet' },
  portrait: { ms: 40, whose: 'ours',   /* v2.3.4960: 150 -> 40: the Leaderboards' faces 11.3 ms (g-boards, was 149); the bag's own portrait as armour goes on 37 ms (armour) */
    why: 'the Leaderboards draw the faces of the players on a board one after another in one piece (drawCharacterPortrait, a body recoloured for each): 140 to 149 ms held at once as a board of 56 faces opens',
    next: 'draw a few faces a frame (an idle callback, the rest as plain circles until their turn), and keep the faces a board drew' },
  /* v2.3.4960: 'other: createObjectURL' off the list: 9.3 ms at most (h-eight; was 18) */
  'other: wrapped > sweepPicsOnce': { ms: 16, whose: 'ours',
    why: "picsOnce.js's sweep of the cache's pictures, up to 15 ms with the crowd's pictures in it",
    next: 'sweep a slice a turn' },
  'ui:*': { ms: 16, whose: 'ours',
    why: 'one component of the band drawn in one piece (the gear tab is 10 ms of one function): React lets a frame in between components, not inside one',
    next: 'split the gear tab so no one piece of it is over 5 ms' },
  'other: BT_AUDIO$1._fold > foldToMono': { ms: 20, whose: 'ours',   /* v2.3.4960: 30 -> 20 (18.9 ms once, lands) */
    why: 'a sound with two sides folded to one the first time it plays: 14 to 21 ms',
    next: 'fold as it is decoded, behind the loading screen or off the first play'},
  /* v2.3.4872: found over the general line on main (mp-heldsweep `armour`, 15.4 and 16.5 ms, two runs; the crowd tour's
     armour stations up to 8 ms) */
  'other: R > J': { ms: 20, whose: 'ours',
    why: "React's scheduler working through a redraw (R > J > Gk is performConcurrentWorkOnRoot in the vendor chunk) where no one of the game's components is the outermost named one, so the sweep cannot say whose: 15 to 17 ms at the armour station (putting armour on and off: the gear tab, the band and the bag at once), most of it in React's own commit (Bj) and a createObjectURL",
    next: 'profile the armour station with React\'s profiler to name the components; then split or startTransition the redraw an equip causes' },
  /* v2.3.4960: 'other: _flushOutbox > Wrapped.ws.send' off the list: 4.7 ms at most (lands, fight; was 18 once) */
};

/** v2.3.5041: the listed families that are `whose` ('ours', 'box', 'browser').  debtOf('ours') is the grand plan's
 *  count for step 3.1: done when it is empty. */
export const debtOf = (whose) => Object.keys(KNOWN).filter((k) => KNOWN[k].whose === whose);

const lineFor = (key, kind, where) => {
  const k = KNOWN[key] || (key.startsWith('ui:') ? KNOWN['ui:*'] : null);
  /* v2.3.4499: `at` -- a listed family's own line at one station of a tour, where that station measured it higher (the
     crowd tour's, mp-crowdsweep): the rest of the tours keep the family's line */
  const base = k ? ((k.at && k.at[where]) || k.ms) : (kind === 'frame' ? FRAME_JS_MAX_MS : HOLD_MAX_MS);
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
