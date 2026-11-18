/* ═══ v2.3.5900: THE HARVEST'S GRADE, JUDGED (grand plan step 4.2; card K4 PR 1) ═══
 *
 * A harvest strike (`node_strike`, gathering.js _handleNodeStrike) carries the
 * phone's own grade of the gesture: `perfect`, `good` or `ok`
 * (gesturePose.js gradeGesture).  A perfect mined ore pays two, and doubles
 * the skill's experience.  The worker never sees the gesture, so until now it
 * believed every perfect that came with a fingerprint (botfp.js), up to 45 a
 * minute: the claims' bench (server/test/claims-gain.test.mjs, `harvest`)
 * measured a liar sending every strike perfect, at the earliest the worker
 * takes it, at 1.86 times the ore of a phone (the bot lab's 45% perfect).
 *
 * TWO RULES, behind one switch (`harvestgrade`: OFF as merged at v2.3.5900,
 * ON by default since v2.3.5906, the owner's "Go recommended"; `harvestgrade:
 * false` in the live flags turns both off -- the second changes honest play):
 *
 *   1. THE TIME.  A perfect is believed only at or after the earliest moment
 *      an honest phone could have made it: the plan's hits played (the first
 *      no sooner than GATHER_HIT_LEAD_MS after the plan lands, one swing
 *      apart after that; lifeSkillRewards.js applyGatherHits), the settle
 *      before the window opens (GATHER_HIT_SETTLE_MS), and the gesture's
 *      floor of real motion (GESTURE_FLOOR_MS, 1.2 s: the meter cannot fill
 *      sooner, ExtractionSwipeLayer.jsx settle) -- gathering.js HONEST_CYCLE.
 *      The plan leaves the worker when the start arrives and the strike leaves
 *      the phone after the gesture, so both legs of the line only ADD to the
 *      time the worker sees: no slow line, lost frame or hidden tab brings an
 *      honest strike sooner.  SLACK_MS covers the phone's two clocks (the
 *      window on Date.now, the gesture on the event's time).  A strike on the
 *      old timer (no plan: an old phone, `gatherhits: false`, a plan that did
 *      not land) is held to the timer's own window as the too-early check
 *      is (its jitter and EXTRACTION_GRACE_MS: the re-declared start crossed
 *      the line too), plus the gesture's floor.  Changes nothing an honest
 *      phone sends.
 *   2. THE SHARE.  At most SHARE_MAX perfects believed in any SHARE_OF strikes
 *      in a row (a player's last strikes, every grade counted).  A phone at
 *      the bot lab's 45% perfect almost never meets it (15 of 20 is some 2.7
 *      deviations over its mean); a player whose every gesture is perfect
 *      is paid three in four (mined ore 1.75 a strike for 2; one perfect
 *      nine times in ten, 1.75 for 1.9).  This one the owner decides.
 *
 * A perfect refused by either is paid as `good` -- the grade a phone defaults
 * to and a strike with no fingerprint is paid (botfp.js) -- never refused:
 * the node is spent and the ore and experience paid as for any good strike.
 * Counted in the player's bot record (botfp.js _botfpGradeNote: `gradeEarly`,
 * `gradeShare`) for the admin view.  v2.3.5902: and told to the phone, which
 * showed "PERFECT!" and "x2" when it swung: `harvest_credit` carries the grade
 * paid (`grade`, `qty`), and a phone against a worker advertising
 * caps.harvestGrade says what was paid when it differs (wsClient.js).
 *
 * Not asked: a recovery strike (no start of its own: gathering.js
 * HARVEST_PROOF, at most one a player in ten minutes) has no record to time,
 * so only the share holds it; a test-mode character (testmode.js; gathering.js
 * passes its `_tm`), as the too-early check and the perfect rate.
 *
 * The share is kept on the player's bot record in memory (botfp.js
 * _botfpGradeRun), never written: a reconnect keeps it (the record outlives
 * the socket), a deploy forgets it, which gives a script at most SHARE_OF
 * more perfects a deploy.
 *
 * Plain functions (no `this`): gathering.js calls them with the room's
 * numbers, and the switch is liveops.js _harvestGradeOn. */

/* v2.3.5902: SHARE_OF and SHARE_MAX are the PUBLIC placeholders of the hidden
   settings GRADE_SHARE_OF and GRADE_SHARE_MAX (hidden.js): the owner's own
   values live there.  SLACK_MS is the phone's own clocks, not a secret. */
export const HARVEST_GRADE = {
  SLACK_MS: 100,
  SHARE_OF: 20,
  SHARE_MAX: 15,
};

/** The earliest worker time a perfect on this extraction record can be
 *  believed, or null when the record cannot say (no start time).
 *  `c`: { lead, settle, floor } (HONEST_CYCLE), `grace` (EXTRACTION_GRACE_MS)
 *  and `jitter` (EXTRACT_JITTER, a timer record's default). */
export function harvestGradeEarliest(ex, c) {
  if (!ex || typeof ex.startedAt !== 'number' || !Number.isFinite(ex.startedAt)) return null;
  const base = Math.max(0, Number(ex.openDelayBase) || 0);
  if (Array.isArray(ex.hits)) return ex.startedAt + base + c.lead + c.settle + c.floor - HARVEST_GRADE.SLACK_MS;
  const jit = typeof ex.jitter === 'number' ? ex.jitter : c.jitter;
  return ex.startedAt + Math.floor(base * (1 - jit)) - c.grace + c.floor;
}

/** The grade believed.  `claimed` is the grade so far (after botfp);
 *  `earliest` from harvestGradeEarliest (null: not timed); `run` the
 *  player's last grades (1 a perfect, 0 any other), changed in place.
 *  Returns { grade, why } -- why 'early', 'share' or null. */
export function harvestGradeJudge(claimed, now, earliest, run, share) {
  /* v2.3.5902: the share's two numbers from the hidden settings (hidden.js
     GRADE_SHARE_OF, GRADE_SHARE_MAX; gathering.js passes the room's), these
     the public placeholders */
  const of = (share && share.of) || HARVEST_GRADE.SHARE_OF;
  const max = (share && share.max) || HARVEST_GRADE.SHARE_MAX;
  let grade = claimed;
  let why = null;
  if (grade === 'perfect' && earliest != null && now < earliest) { grade = 'good'; why = 'early'; }
  if (grade === 'perfect') {
    let n = 0;
    for (let i = Math.max(0, run.length - (of - 1)); i < run.length; i++) n += run[i];
    if (n >= max) { grade = 'good'; why = 'share'; }
  }
  run.push(grade === 'perfect' ? 1 : 0);
  if (run.length > of) run.splice(0, run.length - of);
  return { grade, why };
}
