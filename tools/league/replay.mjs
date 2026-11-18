#!/usr/bin/env node
/* ═══ v2.3.6122: THE LEAGUE'S RUNG 4 -- A RECORDED PLAY, REPLAYED (GRAND-PLAN 10.7; card LG PR 3) ═══
 *
 *   node tools/league/replay.mjs [trace.json] [--fps 60|30|20|4] [--deploy]
 *
 * A trace (tools/league/traces/*.json) is what a page sent, in order, with
 * when: recorded off the real page's socket (bots/page-script.mjs).  This
 * plays it back into the worker's own room (score.mjs's: the GameRoom on the
 * shared test room, a record on file first, the join with `ws: [1, 5]`) and
 * reads every detector over it, as it would be read live.
 *
 * THE SPEEDS.  A phone sends on its frames: at `--fps N` every message waits
 * for the next frame of a phone drawing N a second (1000/N ms steps), and the
 * rest of the trace keeps its own spacing after it.  60, 30 (every Low Power
 * iPhone), 20 and 4 (a phone that can barely draw): docs/specs/honest-trouble.md.
 *
 * A DEPLOY.  `--deploy`: halfway through the trace the room restarts (what
 * was written stays, memory goes: claimbots.mjs W.deploy), and the player
 * joins again where it last stood, as every phone does.
 *
 * WHAT IS KEPT OF THE PERSON.  A recording is not a script: a person waits
 * for the game.  So a strike (`node_strike`, `cook_request` after a start)
 * keeps the person's own time AFTER the window opened (the trace's `after`):
 * it goes no sooner than this room's own plan for that harvest allows (the
 * plan's hits, the settle) plus what the person took in the recording.  Every
 * later message moves by the same wait, so the person's rhythm is kept.
 * Nothing else is changed: the places, the ids, the fingerprints, the grades
 * are the recording's. */
import { readFileSync } from 'node:fs';
import { seededClock } from '../../server/test/testroom.mjs';
import * as B from '../../server/test/claimbots.mjs';
import { SETUP, readDetectors, caughtBy, DETECTORS } from './score.mjs';

export const SPEEDS = [60, 30, 20, 4];
const PID = 'bp_league_trace';
const PLAN_LEAD = 90, PLAN_SETTLE = 220, SWING = 650;   /* gathering.js HONEST_CYCLE.LEAD_MS, .SETTLE_MS; the plan's swing (claimbots.mjs) */
const STARTS = new Set(['extraction_start']);
const STRIKES = new Set(['node_strike', 'cook_request']);
const seedOf = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

export function loadTrace(path) { return JSON.parse(readFileSync(path, 'utf8')); }

/** RUNG 4 AS A BOT: one person's recording played `n` times over in one
 *  account, the way a farm would use it.  Between two plays the bot walks
 *  back to where the recording began (a straight walk at 150 px a second, a
 *  step every 100 ms) and waits 5 s; everything else is the recording's. */
export function loopTrace(trace, n) {
  const one = trace.events.filter((e) => e.m && e.m.type !== 'join');
  const out = [];
  let shift = 0, end = { x: trace.start.x, y: trace.start.y };
  for (let k = 0; k < n; k++) {
    if (k > 0) {
      const d = Math.hypot(trace.start.x - end.x, trace.start.y - end.y), steps = Math.ceil(d / 15);
      for (let i = 1; i <= steps; i++) {
        shift += 100;
        const x = end.x + ((trace.start.x - end.x) * i) / steps, y = end.y + ((trace.start.y - end.y) * i) / steps;
        out.push({ t: shift, m: { type: 'move', x: Math.round(x), y: Math.round(y), z: trace.start.z, d: 'down', vx: 0, vy: 0 } });
      }
      shift += 5000;
    }
    for (const e of one) {
      out.push({ ...e, t: e.t + shift });
      if (e.m.type === 'move') end = { x: e.m.x, y: e.m.y };
    }
    shift = out[out.length - 1].t + 1000;
  }
  return { ...trace, name: trace.name + ' x' + n, events: out };
}

/** Play `trace` back at `fps`, through a deploy halfway when `deploy`.
 *  Returns { det, refusals, sent, ms }. */
export async function replayTrace(trace, { fps = 60, deploy = false, seed = '' } = {}) {
  const S = SETUP[trace.kind];
  const clock = seededClock({ seed: seedOf(seed + '|' + trace.name + '|' + fps + '|' + deploy) }).install();
  const quiet = { l: console.log, w: console.warn, e: console.error };
  console.log = () => {}; console.warn = () => {}; console.error = () => {};
  try {
    const W = await B.makeWorld(clock, { tickMs: trace.kind === 'fight' ? 22 : 100, prep: S.prep, recs: { [PID]: S.rec() } });
    const frame = 1000 / fps;
    const t0 = clock.now();
    const at = () => clock.now() - t0;
    const refusals = [];
    let last = { x: trace.start.x, y: trace.start.y, z: trace.start.z || S.zone };
    await W.join(PID, { ...last });
    if (S.heal) W.heal = true;
    const evs = trace.events.filter((e) => e.m && e.m.type !== 'join');
    const half = Math.floor(evs.length / 2);
    let offset = 0, startAt = null, mark = 0, sent = 0;
    for (let i = 0; i < evs.length; i++) {
      const e = evs[i];
      if (deploy && i === half) { await W.deploy(() => ({ ...last })); }
      let due = e.t + offset;
      if (STRIKES.has(e.m.type) && typeof e.after === 'number' && startAt != null) {
        const ws = W.ws[PID];
        const plan = ws.sent.slice(mark).filter((m) => m.type === 'gather_hits').pop();
        const hits = plan && plan.payload && Array.isArray(plan.payload.hits) ? plan.payload.hits.length : 1;
        const earliest = startAt + PLAN_LEAD + Math.max(0, hits - 1) * SWING + PLAN_SETTLE + e.after;
        if (due < earliest) { offset += earliest - due; due = earliest; }
      }
      due = Math.ceil(due / frame - 1e-9) * frame;
      if (due > at()) await W.run(due - at());
      const msg = e.m;
      if (STARTS.has(msg.type)) { mark = W.ws[PID] ? W.ws[PID].sent.length : 0; }
      const ok = await W.deliver(PID, msg);
      if (!ok) { refusals.push('not delivered: ' + msg.type); continue; }
      sent++;
      if (STARTS.has(msg.type)) startAt = at();
      if (msg.type === 'move') {
        last = { x: msg.x, y: msg.y, z: msg.z || last.z };
        const ps = W.ps(PID);
        if (ps && Math.hypot(ps.x - msg.x, ps.y - msg.y) > 2) refusals.push('a step not taken: ' + Math.round(Math.hypot(ps.x - msg.x, ps.y - msg.y)) + ' px');
      }
      if (msg.type === 'node_strike') {
        const why = (W.room._lastStrikeFor(PID) || {}).why;
        if (why && why !== 'paid') refusals.push('a strike not paid: ' + why);
        startAt = null;
      }
      if (msg.type === 'cook_request') startAt = null;
    }
    return { det: readDetectors(W.room, PID), refusals, sent, ms: at() };
  } finally { console.log = quiet.l; console.warn = quiet.w; console.error = quiet.e; clock.restore(); }
}

/** Every speed, and the deploy (at 60): rows of { speed, deploy, caught, refusals }. */
export async function replayAll(trace, opts = {}) {
  const rows = [];
  for (const fps of SPEEDS) rows.push({ fps, deploy: false, ...(await replayTrace(trace, { ...opts, fps })) });
  rows.push({ fps: 60, deploy: true, ...(await replayTrace(trace, { ...opts, fps: 60, deploy: true })) });
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : new URL('./traces/honest-harvest.json', import.meta.url).pathname;
  const trace = loadTrace(file);
  const rows = await replayAll(trace);
  console.log('\nREPLAY ' + trace.name + ' (' + trace.events.length + ' messages, ' + trace.kind + ')\n');
  for (const r of rows) {
    const by = caughtBy(r.det);
    console.log(String(r.fps).padStart(3) + ' fps' + (r.deploy ? ' + deploy' : '         ') + '  sent ' + r.sent + '  ' +
      (by.length ? 'CAUGHT by ' + by.map((d) => d + ' (' + r.det[d].join('; ') + ')').join(', ') : 'passes every detector') +
      (r.refusals.length ? '  REFUSED ' + r.refusals.length + ': ' + r.refusals.slice(0, 3).join('; ') : ''));
  }
  console.log('\ndetectors read: ' + DETECTORS.join(', '));
  process.exit(0);
}
