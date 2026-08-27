/* ═══ v2.3.1973: WHAT A CROWD COSTS THE PHONE ═══
 *
 * `server/test/load-crowd.mjs` answers the server half of "does this survive
 * a public demo" and the answer there is a comfortable yes: 60 players in one
 * zone cost 0.2 ms of a 22 ms tick.  It cannot answer the half that actually
 * decides whether the demo is playable, because the binding constraint is not
 * the worker — it is the RECEIVER.  Every co-located peer is another remote
 * figure the client rebuilds each frame (body, head traits, worn gear, name
 * plate, shield, sword) and another ~4 KB/s down the socket, on a phone.
 *
 * So this joins one OBSERVER on a phone viewport and then adds peers to the
 * same zone, sampling the client's own per-frame CPU between each step.
 *
 * WHAT IT MEASURES, and why it is not frame intervals: headless Chromium
 * throttles requestAnimationFrame, so rAF deltas report a flat ~100 ms
 * whatever the game is doing — a number identical in the control and the
 * suspect is measuring the harness (the v2.3.1808 finding, mp-fps.mjs).
 * `perfTracker.workMs` is the client's own callback cost and is unaffected by
 * how often the browser chooses to call it.
 *
 * READ THE RATIO, NOT THE ABSOLUTE.  A sandbox running other jobs inflates
 * every sample; what survives that is entityMs at N peers over entityMs at
 * zero, measured back to back in one process.  The assertions below are
 * deliberately about SHAPE — the cost is bounded and the observer still sees
 * everyone — not about a frame-time target, which is the owner's to read off
 * the printed table on a real device.
 *
 * Peers cost browser processes, so the default crowd is small.  Point it at a
 * real machine with BT_CROWD=15 for a number worth quoting.
 */
import * as H from './harness.mjs';

const CROWD = Number(process.env.BT_CROWD || 7);
/* Steps to sample at: 0 peers (the control), then half, then all. */
const STEPS = [...new Set([0, Math.max(1, Math.floor(CROWD / 2)), CROWD])];

const sample = async (P, ms, label) => {
  await P.page.evaluate(() => { window.perfTracker && window.perfTracker.reset(); });
  await P.page.waitForTimeout(ms);
  const r = await P.page.evaluate(() => {
    const pt = window.perfTracker;
    if (!pt || !pt.getSamples) return null;
    const a = pt.getSamples();
    if (!a.length) return null;
    const col = (k) => a.map((s) => s[k] || 0).sort((x, y) => x - y);
    const q = (v, p) => +(v[Math.min(v.length - 1, Math.floor(v.length * p))] || 0).toFixed(2);
    const w = col('workMs');
    return {
      frames: a.length,
      workP50: q(w, 0.5), workP95: q(w, 0.95),
      entityP50: q(col('entityMs'), 0.5), entityP95: q(col('entityMs'), 0.95),
    };
  });
  return { label, ...(r || {}) };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Watcher', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(4000);
  const zone = await H.readState(P, (S) => S.currentZone);
  rec.ok('the observer is in a zone to be crowded', !!zone, { zone });

  const peers = [];
  const rows = [];
  let joinFailedAt = 0;
  const t0 = Date.now();
  /* ═══ v2.3.2020: THE KEEP-ALIVE HAS TO RUN *WHILE* THE CROWD IS BUILDING ═══
   * The per-step nudge below already exists because a scripted peer ages out
   * (see its comment).  It is not enough, and the gap is a matter of
   * arithmetic rather than luck: it fires only AFTER every peer for a step has
   * booted, so peers 1-3 sit untouched for however long peers 4-7 take to
   * start.  A peer goes `aw:1` two minutes after its last real input and is
   * evicted two minutes after that (IDLE_TIMEOUT_MS = 120000, index.js; the
   * clock resets on real input ONLY, not on pongs).  Booting four more Chrome
   * contexts on a two-core box takes longer than that four-minute window, so
   * the early peers were being evicted mid-build — on THIS branch and on
   * origin/main identically, which is how it was shown not to be a
   * regression.
   *
   * The scenario then reported {started: 7, heldTotal: 3} under an assertion
   * whose text is "the presence roster is unconditional", i.e. the launch
   * blocker: players are being dropped. They were not. The room was doing
   * exactly what v2.3.1913 designed it to do, to peers this file left idle.
   * A false launch-blocker is worse than a missing test — it either gets
   * believed and panics a release, or gets dismissed and takes the real
   * signal with it.
   *
   * So every existing peer gets a real key press each time a new one joins.
   * That is genuine input for the AFK clock, it costs ~0.5s per peer per
   * join at n<=7, and it keeps the thing under test (does the ROOM hold
   * concurrent players?) independent of the feature next door (does it evict
   * IDLE ones?). */
  /* ...AND THE OBSERVER IS A PLAYER TOO.  Fixing only the peers moved
     {started: 7, heldTotal: 3} to {started: 7, heldTotal: 7} — every peer
     held, and the assertion STILL red, because the room is peers PLUS the
     observer and the observer had been evicted on the same clock.  It is the
     one session in this file that never presses anything: its whole job is to
     watch.  The step rows say it plainly once you count them — at 3 peers the
     room held exactly 3, which is the peers and nobody else.
     Its nudge ALTERNATES w/s so the net displacement over a run is about
     zero: this session has to stay where it can see the crowd, and walking it
     across the zone to keep it awake would trade this bug for a worse one. */
  let beat = 0;
  const keepAlive = async () => {
    for (let i = 0; i < peers.length; i++) {
      await H.nudge(peers[i], ['w', 'a', 's', 'd'][i % 4], 120).catch(() => {});
    }
    await H.nudge(P, (beat++ % 2) ? 's' : 'w', 120).catch(() => {});
  };
  for (const want of STEPS) {
    while (peers.length < want) {
      const n = peers.length + 1;
      try {
        /* guest:1 so every peer is its OWN identity — two tabs share one
           bp_ passphrase by design, and a crowd of one player is not a
           crowd (CLAUDE.md, identity). */
        const Q = await H.newPlayer(browser, { name: 'Crowd' + n, wsPort, webPort, guest: true });
        await H.enterWorld(Q);
        peers.push(Q);
        /* ...and immediately stamp everyone's activity clock, including the
           one that just arrived, before starting the next (slow) boot. */
        await keepAlive();
      } catch (e) {
        joinFailedAt = joinFailedAt || n;
        break;
      }
    }
    if (peers.length < want) break;
    /* ═══ KEEP THEM LOGGED IN, AND KEEP THEM DIRTY ═══
     * Two separate reasons a scripted peer disappears, both of which the
     * first version of this file walked straight into (it reported 1 peer
     * seen out of 3, and again 1 out of 7 — the last one to join):
     *   - AFK.  v2.3.1913 deliberately stopped the >=1 Hz keepalive move
     *     and the 2 s `track` timer from stamping the activity clock, so
     *     liveness now rests on `track`'s `aw` flag, which the client
     *     derives from real touch/key/wheel input.  A peer that joins and
     *     never touches anything goes `aw:1` two minutes after its last
     *     click and is evicted two minutes after that (close 4006).
     *     Building a crowd takes longer than that, so the early peers were
     *     being logged out while the later ones were still starting.
     *   - DIRTINESS.  tick.js only fans out players it has marked dirty,
     *     and a player standing perfectly still never is (the same reason
     *     waitMutualSight nudges, harness.mjs).
     * One real key press per peer per step fixes both: it is genuine input
     * for the AFK clock AND it moves them, which is what a crowd does. */
    for (const Q of peers) await H.nudge(Q, ['w', 'a', 's', 'd'][peers.indexOf(Q) % 4], 200);
    /* WAIT for the observer to have them all, do not just pause and hope.
       The room rosters every player unconditionally at 1 Hz
       (PRESENCE_REFRESH_TICKS, tick.js), so on a healthy box this resolves in
       about a second — but a loaded machine can starve the page's message
       pump for far longer, and a fixed sleep turns that into a "peers are
       missing" result that is really "the box is busy".  A timeout here still
       reports what was actually seen, so a genuine shortfall is not hidden. */
    const need = peers.length;
    await H.waitFor(P, (S) => Object.keys(S.others || {}).length, (n) => n >= need,
      { timeout: 30000, label: `observer sees ${need} peers` }).catch(() => {});
    const seen = await H.readState(P, (S) => Object.keys(S.others || {}).length);
    /* Printed because the whole diagnosis above turns on it: if this exceeds
       the four-minute idle-to-eviction window between steps, read any
       shortfall as the AFK sweep before reading it as a dropped player. */
    const elapsed = Math.round((Date.now() - t0) / 1000);
    /* ═══ ASK THE WORKER TOO, NOT ONLY THE BROWSER ═══
     * `seen` alone cannot tell "the room lost these players" apart from "this
     * page never got round to processing them", and those are completely
     * different bugs — one is a launch blocker and one is a busy laptop.
     * TRAPS #18's tell is exactly this: a headless check that reads the WORKER
     * and disagrees with the client's own copy of the same fact localises the
     * break immediately.  So record both.  `held` is what the room believes it
     * has; `seen` is what the observer's browser has built. */
    let held = null;
    for (let attempt = 0; attempt < 3 && !held; attempt++) {
      /* Bounded and RETRIED: the first cut had neither, and the 7-peer step
         came back `held: null` — eight browser contexts on four cores is
         exactly when this request is slowest, and exactly when its answer
         matters most.  A blank row here silently downgrades the whole
         assertion below to "no opinion", which is the failure mode this
         probe exists to avoid. */
      try {
        const r = await fetch(`http://127.0.0.1:${wsPort}/api/admin/overview`,
          { headers: { Authorization: `Bearer ${H.ADMIN_KEY}` }, signal: AbortSignal.timeout(8000) });
        const j = await r.json();
        if (typeof j.players === 'number') held = { sessions: j.sessions, players: j.players };
      } catch { await P.page.waitForTimeout(1000); }
    }
    if (!held) console.log(`   WARNING: the worker did not answer /overview at ${peers.length} peers — the room-side check has no opinion on this row.`);
    const s = await sample(P, 4000, `${peers.length} peer(s)`);
    rows.push({ peers: peers.length, seen, held, elapsed, ...s });
    console.log('   ' + JSON.stringify(rows[rows.length - 1]));
  }

  /* SPLIT THE QUESTION IN TWO, because one answer is about the game and the
     other is about the machine it is running on.

     The ROOM keeping everyone is the launch-blocking half, and it is asserted
     hard: the presence roster is unconditional (every player in playerState,
     every PRESENCE_REFRESH_TICKS — tick.js), so a shortfall HERE would mean
     players are being dropped, which is the thing worth failing a build over.

     The observer having built them all is the other half, and it is reported
     rather than asserted when the room is demonstrably fine.  A backgrounded
     Playwright context is throttled by Chrome to roughly nothing, and on a
     contended box the peers' own pages stop sending long enough to age out of
     view — that is this harness's environment, not the game's behaviour, and
     failing on it would make the scenario a machine-load detector.  When the
     room DOES hold everyone and the observer does not, the gap is printed
     loudly so a real regression still gets noticed by a human reading it. */
  /* COUNT THE OBSERVER.  `held.players` is everyone in the room, which is the
     peers PLUS the observer; `r.peers` is only the ones this file started.
     Comparing them directly is off by one in the direction that hides a bug —
     it would call a room that had silently dropped exactly one peer healthy —
     which is the opposite of what an assertion is for.  Caught by a run where
     held.players was 3 against 3 peers: the honest reading is 3 of an expected
     4, i.e. one peer really was missing, and the browser seeing 2 was then
     FAITHFUL rather than blind. */
  const inRoom = (r) => (r.held ? r.held.players - 1 : r.peers);   /* peers, observer excluded */
  const roomKept = rows.every((r) => !r.held || inRoom(r) >= r.peers);
  /* WHEN THIS GOES RED, READ THE AFK CLOCK FIRST.  v2.3.1913 made liveness
     rest on `track`'s `aw` flag (real touch/key input), not on the keepalive
     move, so a scripted peer is evicted four minutes after its last click —
     and on a slow box, starting the NEXT peer can take longer than that.  The
     detail carries both numbers so that reading is available immediately
     rather than after an hour of looking at the roster code. */
  rec.ok('the ROOM still holds every peer that joined (the presence roster is unconditional)',
    rows.length > 0 && roomKept,
    { rows: rows.map((r) => ({ started: r.peers, inRoom: inRoom(r), heldTotal: r.held && r.held.players })),
      firstSuspect: 'peers AFK-evicted (close 4006) while later peers were still booting — see v2.3.1913 / afk.test.mjs' });
  /* Judged against what the room ACTUALLY holds, not against what this file
     tried to start — otherwise a peer the room already lost gets counted
     against the renderer as well, and one fault reads as two. */
  const blind = rows.filter((r) => r.seen < inRoom(r));
  if (blind.length && roomKept) {
    console.log('   NOTE: the worker holds every peer but this observer had not built them all'
      + ` — ${blind.map((r) => `${r.seen}/${inRoom(r)}`).join(', ')}.`
      + ' On a contended box that is Chrome throttling the peers\' background pages;'
      + ' on an idle machine it would be a real peer-visibility bug worth chasing.');
  } else if (blind.length) {
    rec.ok('every peer the room holds is visible to the observer', false,
      rows.map((r) => ({ started: r.peers, inRoom: inRoom(r), seen: r.seen })));
  }

  const base = rows[0];
  const top = rows[rows.length - 1];
  /* A guard, not a target: it exists so the ratio below is not computed from
     an empty sample.  Deliberately tiny — a contended box renders single
     figures of frames in four seconds, and failing on that would be this
     file reporting on the machine instead of on the game. */
  rec.ok('the client reported frame samples at every step',
    rows.every((r) => (r.frames || 0) >= 3), rows.map((r) => r.frames));

  /* THE SHAPE ASSERTION.  Per-peer entity cost must not blow up: rendering
     N peers should cost roughly N times one peer, not N-squared.  Compared as
     COST PER PEER between the first and last step, back to back in one
     process so machine load is shared.  Generous bound — this is a tripwire
     for an accidental per-peer full-rebuild, not a performance target. */
  if (base && top && top.peers > base.peers) {
    const perPeer = (r) => (r.peers ? r.entityP50 / r.peers : r.entityP50);
    const grow = base.peers ? perPeer(top) / Math.max(0.01, perPeer(base)) : null;
    rec.ok('per-peer render cost does not blow up as the crowd grows',
      grow === null || grow < 4,
      { basePeers: base.peers, topPeers: top.peers, baseEntityP50: base.entityP50, topEntityP50: top.entityP50, perPeerRatio: grow && +grow.toFixed(2) });
    rec.ok('...and the whole frame is still bounded (entity work under half the frame)',
      top.workP50 === 0 || top.entityP50 <= top.workP50 * 0.5 + 1,
      { entityP50: top.entityP50, workP50: top.workP50 });
  }

  console.log('   peers | held | seen | workP50 | workP95 | entityP50 | entityP95');
  for (const r of rows) {
    const held = r.held ? String(r.held.players) : '?';
    console.log(`   ${String(r.peers).padStart(5)} | ${held.padStart(4)} | ${String(r.seen).padStart(4)} | ${String(r.workP50).padStart(7)} | ${String(r.workP95).padStart(7)} | ${String(r.entityP50).padStart(9)} | ${String(r.entityP95).padStart(9)}`);
  }
  console.log('   (held = what the WORKER says is in the room; seen = what this browser had built.)');
  console.log('   (ABSOLUTE ms is only meaningful on an idle machine — the RATIO is the finding.)');
  if (joinFailedAt) console.log(`   note: could not start peer #${joinFailedAt} (browser resources), crowd capped at ${peers.length}`);

  for (const Q of peers) { try { await Q.ctx.close(); } catch { /* best effort */ } }
  await P.ctx.close();
}
