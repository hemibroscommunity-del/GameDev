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
/* ═══ v2.3.6380: A STATION'S OWN LINE (card SB PR 1) ═══
   The general line a station's unlisted holds are held to, where it is not HOLD_MAX_MS.  `ride` (mp-heldsweep: the
   board's ring round BroTown's safe ground, the owner's "freezes just for tiny fractions of a second while it
   loads", 2026-11-18): held to the general line, 12 ms.  This box, plain (no profile), two runs: every unlisted hold
   of the ride at or under it but two of 12.1 and 12.2 ms (the judge's noise), the ground's own (a piece's first
   upload, its colours' row) 12.2 ms the longest.  Slowed (budget-android, hotel-laptop), the ride is over it -- the
   ground 21.3 ms the longest, others' families to 34 ms: docs/plan/census/SB-ride.md, never a line (the profiles'
   rule, mp-heldsweep's header).  Lowered, never raised, as card SB's PRs land; `ridewalk` (the same ring walked,
   asked for only) keeps the general line. */
export const STATION_LINES = Object.freeze({ ride: HOLD_MAX_MS });

export const KNOWN = {
  /* v2.3.5049: 'body-bake' (was 13; 220 before v2.3.4960, 12 at the crowd's a-ink, b-fish, c-armour1, c-armour8,
     h-eight, d-prints) off the list.  A body or head sheet recoloured on the page for one look: in play every such bake
     runs on the body bake's worker since v2.3.4930 (docs/specs/body-bake-worker.md), and h-eight's last page bakes
     went with v2.3.5013.  The sample (the main tour's `peer` and `armour`, the crowd's a-ink, b-fish, c-armour1,
     c-armour8, h-eight and d-prints, three runs each, every crowd group there): not one body-bake hold.  And a worker
     never heard from is no longer started again at every return (the gatekeeper's sitting 1 on #1668: bodyBake.js
     _back, mp-bodyworker 6c) */
  /* v2.3.5043: 'masked-bake' (was 24; 140 before v2.3.4870) off the list.  What was left was the page cutting each
     input out of its sheet for the bake's worker (entityRenderer.js _frameInput > createImageBitmap): 4 to 15 ms a
     bake, 32.7 ms once at the main tour's `armour`, up to 12.9 at the crowd's armour stations.  Now a frame of a sheet
     that is an image goes as its address and rectangle, and the worker reads the sheet itself (maskedBakeWorker.js
     sheetOf).  The sample (peer and armour x3; c-armour1, c-armour8, h-eight and d-prints x3): 7.7 ms the longest,
     5 holds in all (docs/specs/held-sweep.md, "Card H") */
  /* v2.3.5253: 'pack-page' (was 20; 21 to 59 ms before v2.3.4873, 17 to 35 at card H's Found) off the list (card P,
     the planning session's road B).  A gear sheet first drawn in play is packed on the body bake's worker, which
     hands back the packed sheet as a PNG (gearSheets.js _buildShirtOnWorker; the page's own pack only with
     ?packworker=0, with no worker, or behind the loading screen).  The sample (the main tour's fight, peer and
     armour once; peer and armour x4): not one pack-page hold, and no worker sheet's page part noted at 4 ms or
     more.  The same sweeps with ?packworker=0: 27.5 and 22.2 ms the longest, 5 holds each (docs/specs/asset-door.md
     part 5, 5253) */
  'screen-check': { ms: 260, whose: 'box',
    why: "only with a SECOND page open in the SAME browser on this box (the other player's page, one browser's two tabs): both pages draw on one software graphics chip, and the black-screen check's collect waits for the other page's frames too, 106 to 208 ms (281 to 307 at the sweep's peer and armour, census/HB-holds.md row 1).  With one page it is 0 to 2 ms since the collect moved to the top of the frame (it was 110 to 206).  v2.3.6505 (card PH PR 6; TRAPS 177, the test first): mp-heldsweep's rider has a browser of its own (two chips, as two phones), and leaves before `armour`: the peer station read 6.5 ms, once, on the test box (2026-11-24).  The line stays for the scenarios that still open a second page in the one browser (the sword, bow and staff feel tests read this list)",
    next: 'nothing here: two pages are never on one phone.  On a phone the frame strip names it ("screen check N ms") if it is ever 4 ms or more',
    crowd: "(no line of its own: the crowd tour now plays the species last) with one page, when the chip is swamped (the first crowd tours, after the species churn, 377 MB on it): the fenced read is not back within its frames and the check falls back to its OLD way, a drawImage copy of the canvas that waits for the chip: 465 to 625 ms, a dozen times.  Fix the churn first (speciesArt, below); then the old way should not run in play at all (skip a check rather than copy)" },
  /* v2.3.5044: 'strip-made' (was 24) off the list.  What was left was the page putting a monster strip's numbers on its
     bundle's row of colours (picsNumbers.js stripAsNumbers: a loop over every byte of the strip) as its look came in:
     the main tour's `town`, three runs, 9.4 / 17.9 / 10.0 ms the longest, 34 holds.  Now the reader's worker numbers
     the strip for its row (stripRows.js; a colour variant retinted there first) and the page only checks the rows and
     makes the texture.  The sample (`town`, `lands` x3): 6.1 / 12.4 / 4.5 ms the longest, 11 holds in all (the 12.4: 9 ms of it the row's upload to this box's software chip; one hold just past the general line is the judge's noise) (docs/specs/held-sweep.md, "Card H") */
  /* v2.3.6505 (card PH PR 6): 'server-message' ON the list, a NEW named debt (not a line raised).  The gate's held
     sample (stand, town, ride: tools/dev/gatekeeper.mjs's `heldsample`) on main b966af81, on the test box,
     2026-11-24: 16.5 ms over the general 12 at `town`, twice in one run, unlisted, so every sitting would read red.
     A gate red at every sitting teaches everyone to read past it (orchestrator part 5's call); listed, it goes red
     only for what is new.  Seen before and listed only (census/HB-holds.md row 15: 33.0 ms at `lands`; SB-ride.md
     row 13: 19.6 on the board).  Not card PH's to fix: it is the message's own size and the work handed on */
  'server-message': { ms: 17, whose: 'ours',
    why: "a message from the worker worked through in one piece on the page (wsClient.js ws.onmessage and what it hands on: processGameEvent, the strip readers' replies): 16.5 ms twice at the gate sample's `town` on main b966af81, on the test box (2026-11-24); 33.0 once at the sweep's `lands` before (census/HB-holds.md row 15)",
    next: "split what one message makes the page do (the tick's per-entity work handed on a frame at a time), or send less in one message (the worker's message size, HB-holds row 15); then the row comes off" },
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
  /* v2.3.5042: 'gear-sheet' (was 195; 12 at d-prints) and 'portrait' (was 40) off the list.  The drawn shirts have
     been dressed on the body bake's worker since v2.3.5014: the crowd tour's b-fish, c-armour1, c-armour8, h-eight and
     d-prints, four runs, no gear-sheet hold.  What was left of both, and the body-bake hold over its line at the main
     tour's `armour` (28.8 ms), was ONE thing: the Equipment screen's figure drawn again as armour goes on and off
     (characterPortrait.js drawCharacterPortrait), in one piece of 10 to 29 ms, named by whichever family's function was
     most of it (composeShirt, recolorBodyToCanvas, or the portrait's own).  Now it lets a frame in after every step and
     keeps the recoloured body for the look: the figure's holds at `peer` and `armour`, three runs, the longest 7.9,
     12.5 and 8.1 ms (the 12.5 with 3 ms of another job, prog3CharLevel, in the same hold: one hold just past the
     general line is the judge's noise) (docs/specs/held-sweep.md, "Card H") */
  /* v2.3.4960: 'other: createObjectURL' off the list: 9.3 ms at most (h-eight; was 18) */
  /* v2.3.5048: 'other: wrapped > sweepPicsOnce' (was 16) off the list.  picsOnce.js's sweep of the cache's pictures
     had a 4 ms budget, but the budget only stopped the work on a picture: the walk went on over the WHOLE of Pixi's
     cache every second (Map.forEach cannot stop), and the cache holds a texture under each of its names.  Before:
     23.9, 17.6 and 13.7 ms at the main tour's `peer` and `armour`.  Now one walker is kept from turn to turn, a
     slice of 3 ms a turn (the next 100 ms later until the round ends), and a picture's address is read once, after
     the cheaper checks (its hold is now `wrapped > sweepPicsOnceTurn`).  The sample (`town`, `lands`, `peer`,
     `armour`, and the crowd's `c-armour8`, `h-eight`, `g-boards`, x3): 20 holds, 7.2 ms the longest but one of
     12.1 that the Leaderboard's faces shared (docs/specs/held-sweep.md, "Card H").
     v2.3.5049, SEEN BEFORE (the planning session's call: it stays off): #1747's sample showed three holds named
     `wrapped > sweepPicsOnceTurn` over the line, 18.3 ms once at `armour` (5 ms of it inside the browser's own
     setTimeout) and 12.1 + 12.3 ms in one crowd run (a-ink, b-fish).  `releasable` timed call by call there: 1.4 ms at
     most.  This box's pauses landing in the sweep's short turns, not the sweep: a line on this list says why
     something holds, and here nothing does.  If a later sweep TIMES a turn's own work over 12 ms, it goes on the list */
  /* v2.3.5047: 'ui:*' (was 16) off the list.  One component of the band drawn in one piece: React lets a frame in
     between components, never inside one.  The gear tab built its nine equipment cells in its own body (each with its
     rows, the amulet's stat card), and its gold badge said the page's first number with commas (about 10 ms, the
     browser readying its formatter).  Now each cell is a component (GearTab.jsx GearCellView) and the formatter is
     readied with the game's code, behind the loading screen (barNumbers.js).  Before, six runs of `town`, `lands`,
     `peer` and `armour`: 13.4 ms the longest.  The sample (the same, x3): 34 holds of a component, 9.9 ms the longest
     (docs/specs/held-sweep.md, "Card H") */
  /* v2.3.5045: 'other: BT_AUDIO$1._fold > foldToMono' (was 20) off the list.  A two-sided sound folded to one on its
     first play (soundFold.js), in one piece: 8.1 / 8.9 / 13.4 ms at the main tour's `lands` and `town`, three runs
     (18.9 once before).  Now walked a stretch at a time, a frame let in once a piece has run 4 ms (foldToMonoSliced:
     the same buffer, sample for sample, sound-fold.test 4).  The sample (`town`, `lands` x3): 5.2 / 4.9 / 6.9 ms the
     longest (docs/specs/held-sweep.md, "Card H") */
  /* v2.3.5429 (card J2): 'other: R > J' back on the list, at the main tour's `stand` and `town` (card TF's find:
     14.4 ms twice in one run of five on main, unlisted).  React working through a redraw with no game function on its
     stack.  Five runs of `stand,town` on the unminified build here: 5 to 11.3 ms, never over the line; the one hold
     of the game's own named beside it every run is the door prompt placed over your head (BroTown.jsx placeOverHead
     -> XpFlyOverlay.jsx playerScreenPoint), which measures the canvas and itself inside React's commit, a whole layout
     of the page: 10.7 to 12.5 ms at `town`, every run (one hold just past the line is the judge's noise).  Not a
     redraw a transition shortens: a measurement in the commit (CLAUDE.md §7, "nothing measures the page inside a
     frame").  Listed, not mended: the prompt's placement is game UI outside the card that found it */
  /* v2.3.6287 (card HB2 PR 8): 'other: R > J' (was 16; 14.4 twice in five runs at card TF's find, 10.7 to 12.5 ms
     beside it every run the door prompt placed in React's commit) off the list.  HB's #2209 (v2.3.6244) places the
     prompt at the top of the next frame (`?afterpaint`, ON).  The row's own rule, five runs of the main tour's
     `stand,town` on a profiled build of main 1cd3fce, unthrottled: 7.7, 10.6, 7.6, 7.0 and 9.8 ms the longest
     (7 to 15 holds a run, all under the general line); and on card HB2's stack (PRs 1-4, 7) 8.9, 10.4, 8.4, 6.7
     and 7.8.  With it the debt list has no row `ours`: the grand plan's step 3.1 (debtOf('ours'), empty).  Under
     O2's slow profiles React's redraws still hold longer (21 to 26 ms on budget-android, a 4x throttle): those
     are judged by the general line like any family, and their parts are card HB2's PRs 2, 4 and 6 */
  /* v2.3.5046: 'other: R > J' (was 20) off the list.  React working through one redraw in one piece: every equip
     change set BroTown's own `gearWorn` (gearWornSync.js), a blocking re-render of the game's root and all under it
     (named on a development build: BroTown, the GearTab, the band's keys, the ride button, the quest coach...).
     Before, twelve runs of `peer` and `armour`: 17.5 / 17.5 / 15.9 ms at `armour`, 12.4 at `peer`.  Now an equip that
     leaves the worn flags as they were sets nothing, and one that changes them is a transition (sliced, a frame
     between).  The sample (`peer`, `armour` x3): 8.6 ms the longest (docs/specs/held-sweep.md, "Card H") */
  /* v2.3.4960: 'other: _flushOutbox > Wrapped.ws.send' off the list: 4.7 ms at most (lands, fight; was 18 once) */
};

/** v2.3.5041: the listed families that are `whose` ('ours', 'box', 'browser').  debtOf('ours') is the grand plan's
 *  count for step 3.1: done when it is empty. */
export const debtOf = (whose) => Object.keys(KNOWN).filter((k) => KNOWN[k].whose === whose);

const lineFor = (key, kind, where) => {
  const k = KNOWN[key] || (key.startsWith('ui:') ? KNOWN['ui:*'] : null);
  /* v2.3.4499: `at` -- a listed family's own line at one station of a tour, where that station measured it higher (the
     crowd tour's, mp-crowdsweep): the rest of the tours keep the family's line */
  const base = k ? ((k.at && k.at[where]) || k.ms) : (kind === 'frame' ? FRAME_JS_MAX_MS : (STATION_LINES[where] || HOLD_MAX_MS));   /* v2.3.6380: + a station's own line */
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

/* v2.3.6506 (card PH, the sitting-59 mend): THE SWEEP'S VERDICT, here and not in the scenario.  The gate's held
   sample (gatekeeper.mjs `heldsample`) is only as red as mp-heldsweep's verdict, and sitting 59 dropped that
   verdict (`fresh.length === 0` forced true in mp-heldsweep.mjs) with every suite green: the scenario needs a
   browser for an hour, no suite could play it.  The verdict's rows are made here, from the stations the sweep
   measured, and gate-steps.test drives them with stations of its own (a new hold over its line, a listed one
   grown, a station unread, a station asked for and not played); the scenario passes each row to its `rec.ok` as
   it is.  `want` the stations asked for (BT_HS_STATIONS).  Returns judgeHeld's { ranked, over } and the rows,
   each { name, ok, detail }. */
export function sweepVerdict(stations, want) {
  const st = Array.isArray(stations) ? stations : [];
  const { ranked, over } = judgeHeld(st);
  const listed = over.filter((o) => o.listed), fresh = over.filter((o) => !o.listed);
  const say = (l) => l.slice(0, 6).map((o) => `${o.key} ${o.longest} ms > ${o.line} (${o.where}${o.times > 1 ? ', ' + o.times + ' times' : ''})`).join('; ');
  const asked = Array.isArray(want) ? want : [];
  const rows = [
    { name: `the profile reads by name (an unminified build: the game's loop found in ${st.filter((s) => s.readable).length} of ${st.length} stations)`,
      ok: st.length >= 1 && st.every((s) => s.readable),
      detail: 'build with: npx vite build --minify false --outDir dist-prof, and run with QA_DIST=dist-prof' },
    { name: `the budget: nothing NEW holds the page past its line -- ${HOLD_MAX_MS} ms a job outside the frame, ${FRAME_JS_MAX_MS} ms of the game's own code inside one, ${WINDOW_MAX_MS} ms at a window (${fresh.length} over${fresh.length ? ': ' + say(fresh) : ''})`,
      ok: fresh.length === 0, detail: fresh },
    { name: `...and nothing on the debt list has grown past its own line (${Object.keys(KNOWN).length} listed; ${listed.length} over${listed.length ? ': ' + say(listed) : ''})`,
      ok: listed.length === 0, detail: listed },
    { name: `every station asked for was played (${st.map((s) => s.name).filter((v, i, a) => a.indexOf(v) === i).join(', ')})`,
      ok: asked.length >= 1 && asked.every((w) => st.some((s) => s.name === w)), detail: asked },
  ];
  return { ranked, over, rows };
}
