#!/usr/bin/env node
/* ═══ v2.3.6121: THE LEAGUE'S SCOREBOARD (GRAND-PLAN 10.7; card LG PR 2) ═══
 *
 *   node tools/league/score.mjs [--minutes N] [--seed S] [--json]
 *   npm run league
 *
 * Runs each rung's bots (tools/league/bots/), and the honest players beside
 * them, each session in its own room, and reads every detector there is
 * over what each one did.  Prints, a session a row, what flagged it (a
 * detector that writes a flag: botfp.js, botsig.js) and what held its
 * claims (a judge that refuses or pays less: hitproof.js, swordswing.js,
 * bowshot.js, harvestgrade.js, the harvest's proof), then each rung caught
 * or missed by each detector.
 *
 * THE ROOM.  The worker's own GameRoom (server/src, at this commit: the
 * detectors frozen as they are), on the shared test room
 * (server/test/testroom.mjs) through the claims' bench (claimbots.mjs, read
 * only): its seeded clock, its tick, a record put on file before the join
 * (CLAUDE.md §5: a join with no record reads no claim), the join the world's
 * way with `ws: [1, 5]`.  The same code `wrangler dev --local` serves; this
 * way it runs in seconds, the same every time, and `npm test` can run it
 * (server/test/league.test.mjs).  The bots know only the wire (`w`, below):
 * what they send, and what a phone reads off the worker's messages.
 *
 * Tools only: nothing the game ships imports this. */
import { performance } from 'node:perf_hooks';
import { seededClock } from '../../server/test/testroom.mjs';
import * as B from '../../server/test/claimbots.mjs';
import { WHEEL_ZONE } from '../../server/src/wheelzone.js';
import * as R1 from './bots/wire-script.mjs';
import * as R2 from './bots/wire-noise.mjs';

export const RUNGS = [R1, R2];
const SWORD = { type: 'sword', tier: 'common', tierMult: 1.0, element1: null, element2: null, isVolatile: false, name: 'copper sword', gearBase: 'copper', quality: 'normal' };
const seedOf = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/* each session's world and starting record */
const ores = (room) => room._ensureZoneNodes(WHEEL_ZONE).filter((n) => n.nodeType === 'oreVein' && n.tierLvl === 1);
const noMonsters = (room) => { if (!room.monsters[WHEEL_ZONE]) room.monsters[WHEEL_ZONE] = []; };
export const SETUP = {
  harvest: { rec: () => B.harvestRec(), prep: noMonsters, zone: WHEEL_ZONE,
    at: (room) => { const n = ores(room)[0]; return { x: n.x + 90, y: n.y + 40 }; } },
  fight: { rec: () => B.rec(), prep: B.nearField, zone: WHEEL_ZONE, heal: true,
    at: (room) => { const m = room._ensureZoneMonsters(WHEEL_ZONE).filter((x) => x.home === 'frost' && x.level <= 3 && !x.tier)[0]; return { x: m.x + 160, y: m.y }; } },
  cook: { rec: () => B.cookRec(), prep: null, zone: 'town', at: () => ({ x: 100, y: 100 }) },
};

/* ══════════ THE WIRE: what a bot may do and read ══════════ */
export function makeWire(W, ph, pid, kind) {
  const S = SETUP[kind];
  const ps = () => W.ps(pid);
  let mark = 0;
  const arm = { sword: false };
  const doArm = () => { const p = ps(); if (p && arm.sword) { p.weapon = { ...SWORD }; p._zoneEntryGraceUntil = 0; } };
  ph.onRejoin = async () => { doArm(); };
  return {
    pid, zone: S.zone,
    async join() {
      const at = S.at(W.room);
      ph.x = at.x; ph.y = at.y; ph.z = S.zone;
      await W.join(pid, { x: Math.round(at.x), y: Math.round(at.y), z: S.zone }, ph);
      if (S.heal) W.heal = true;
    },
    send: (msg) => ph.send(msg),
    wait: (ms) => ph.wait(Math.max(0, ms)),
    now: () => W.clock.now(),
    over: () => ph.over,
    rand: () => Math.random(),
    me() { const p = ps(); return p ? { x: p.x, y: p.y } : { x: ph.x, y: ph.y }; },
    arm(kind2) { arm[kind2] = true; doArm(); },
    ores: () => ores(W.room).map((n) => ({ id: n.id, x: n.x, y: n.y, alive: n.alive !== false })),
    monsters: () => (W.room.monsters[S.zone] || []).filter((m) => m.alive && m.hp > 0).map((m) => ({ id: m.id, x: m.x, y: m.y })),
    windups() {
      const now = W.clock.now();
      return (W.room.monsters[S.zone] || []).filter((m) => m.alive && ((m._bwTarget === pid && (m._bwUntil || 0) > now) || (m._tgTarget === pid && m._tgPhase === 'telegraph')))
        .map((m) => ({ id: m.id, x: m.x, y: m.y, at: m._bwTarget === pid ? m._bwUntil : m._tgUntil }));
    },
    mark() { mark = (W.ws[pid] && W.ws[pid].sent.length) || 0; },
    plannedHits(dflt) {
      const sent = (W.ws[pid] && W.ws[pid].sent) || [];
      const plan = sent.slice(Math.min(mark, sent.length)).filter((m) => m.type === 'gather_hits').pop();
      return plan && plan.payload && Array.isArray(plan.payload.hits) ? plan.payload.hits.length : dflt;
    },
  };
}

/* ══════════ THE DETECTORS, READ ══════════ */
export const DETECTORS = ['botfp', 'botsig', 'hitproof', 'swordswing', 'bowshot', 'harvestgrade', 'harvestproof'];
export function readDetectors(room, pid) {
  const now = Date.now();
  const rec = room._botfp && room._botfp.get(pid);
  const out = Object.fromEntries(DETECTORS.map((d) => [d, []]));
  if (rec) {
    /* the close's last judgement (botfp.js _botfpFlush) */
    if (rec.sig && typeof room._sigEval === 'function') room._sigEval(pid, rec, now);
    for (const f of rec.flags || []) {
      if (f.kind === 'test') continue;
      if (f.kind === 'server-signals') out.botsig.push('FLAG ' + ((f.detail && f.detail.reasons) || []).join('+'));
      else out.botfp.push('FLAG ' + f.kind);
    }
    if (rec.sig && rec.sig.reasons.length && !out.botsig.length) out.botsig.push('reasons ' + rec.sig.reasons.join('+') + ' (score ' + rec.sig.score + ', under the line)');
    const c = rec.counters || {};
    if (c.gradeEarly) out.harvestgrade.push(c.gradeEarly + ' early');
    if (c.gradeShare) out.harvestgrade.push(c.gradeShare + ' share');
    if (c.startless) out.harvestproof.push(c.startless + ' startless');
    if (c.entFloorHits) out.botfp.push(c.entFloorHits + ' perfect under the floor');
  }
  /* what the session did, so a miss is never an idle bot */
  const sg = rec && rec.sig, c2 = (rec && rec.counters) || {};
  out.did = { strikes: c2.strikes || 0, cooks: c2.cooks || 0, walksJudged: sg ? sg.aim.n : 0, reactions: sg ? sg.react.n : 0, hitsOneSpot: sg ? sg.root.max : 0 };
  const hp = room._hpCount || {};
  for (const k of ['noWeapon', 'far', 'rate', 'unpaid']) if (hp[k]) out.hitproof.push(hp[k] + ' ' + k);
  if (hp.swing) out.swordswing.push(hp.swing + ' swing');
  if (hp.shot) out.bowshot.push(hp.shot + ' shot');
  return out;
}
/* caught: a flag written, or a claim held */
export const caughtBy = (det) => DETECTORS.filter((d) => det[d].some((s) => !s.startsWith('reasons ')));
export const flaggedBy = (det) => DETECTORS.filter((d) => det[d].some((s) => s.startsWith('FLAG')));

/* ══════════ A SESSION ══════════ */
async function inRoom(seed, setup, fn) {
  const clock = seededClock({ seed: seedOf(seed) }).install();
  const quiet = { l: console.log, w: console.warn, e: console.error };
  console.log = () => {}; console.warn = () => {}; console.error = () => {};
  try { return await fn(clock); }
  finally { console.log = quiet.l; console.warn = quiet.w; console.error = quiet.e; clock.restore(); }
}

/** One bot session: `bot` a rung's module, `kind` harvest | fight | cook,
 *  `d` a disturbance (testroom.mjs DISTURBANCES) or null. */
export async function runBot(bot, kind, { minutes = 10, seed = '', d = null } = {}) {
  const pid = 'bp_league_' + bot.NAME.replace(/\W/g, '') + '_' + kind;
  const S = SETUP[kind];
  return inRoom(seed + '|' + bot.NAME + '|' + kind + '|' + (d ? d.id : ''), S, async (clock) => {
    const W = await B.makeWorld(clock, { tickMs: kind === 'fight' ? 22 : 100, prep: S.prep, recs: { [pid]: S.rec() } });
    const ph = new B.Phone(W, null, d, minutes * B.MIN);
    let err = null;
    try { await bot.SESSIONS[kind](makeWire(W, ph, pid, kind)); } catch (e) { err = (e && e.stack) || String(e); }
    return { who: bot.NAME, rung: bot.RUNG, kind, pid, det: readDetectors(W.room, pid), err, ms: clock.now() - ph.t0 };
  });
}

/* the honest players: the claims' bench's own (claimbots.mjs), the server's
   fixtures of honest play until PR 3's recorded trace */
const PHONE_MIX = { perfect: 0.45, good: 0.44 };
export const HONEST = [
  { kind: 'harvest', pid: 'bp_bench_h', world: { tickMs: 100, prep: noMonsters, recs: () => ({ bp_bench_h: B.harvestRec() }) }, play: (W, ph, t) => B.harvester(W, ph, t, { mix: PHONE_MIX }) },
  { kind: 'fight', pid: 'bp_bench_a', world: { tickMs: 22, prep: B.nearField, recs: () => ({ bp_bench_a: B.rec() }) }, play: (W, ph, t) => B.honestSword(W, ph, t) },
  { kind: 'cook', pid: 'bp_bench_c', world: { tickMs: 100, prep: null, recs: () => ({ bp_bench_c: B.cookRec() }) }, play: (W, ph, t) => B.cook(W, ph, t, {}) },
];
export async function runHonest(h, { minutes = 10, seed = '', d = null } = {}) {
  return inRoom(seed + '|honest|' + h.kind + '|' + (d ? d.id : ''), null, async (clock) => {
    const W = await B.makeWorld(clock, { tickMs: h.world.tickMs, prep: h.world.prep, recs: h.world.recs() });
    const ph = new B.Phone(W, null, d, minutes * B.MIN);
    const take = { kills: 0, xp: 0, ore: 0, cooked: 0, gold: 0, px: 0, points: 0 };
    let err = null;
    try { await h.play(W, ph, take); } catch (e) { err = (e && e.stack) || String(e); }
    return { who: 'honest', rung: 0, kind: h.kind, pid: h.pid, det: readDetectors(W.room, h.pid), err, refusals: ph.refusals, ms: clock.now() - ph.t0 };
  });
}

/** Every rung's bots and the honest players. */
export async function runLeague({ minutes = 10, seed = '', rungs = RUNGS, honest = true, kinds = ['harvest', 'fight', 'cook'] } = {}) {
  const rows = [];
  for (const bot of rungs) for (const kind of kinds) rows.push(await runBot(bot, kind, { minutes, seed }));
  if (honest) for (const h of HONEST) if (kinds.includes(h.kind)) rows.push(await runHonest(h, { minutes, seed }));
  return rows;
}

/** Each rung caught (by which detectors) or missed. */
export function rungTable(rows) {
  const by = new Map();
  for (const r of rows) {
    const k = r.rung === 0 ? 'honest' : 'rung ' + r.rung + ' ' + r.who;
    const t = by.get(k) || { name: k, rung: r.rung, caught: new Set(), flagged: new Set(), sessions: 0 };
    t.sessions++;
    for (const d of caughtBy(r.det)) t.caught.add(d);
    for (const d of flaggedBy(r.det)) t.flagged.add(d);
    by.set(k, t);
  }
  return [...by.values()];
}

export function printLeague(rows, log = console.log) {
  const pad = (s, n) => String(s).padEnd(n);
  log('\nTHE LEAGUE: each session, what each detector did (FLAG = a flag written; counts = claims held)\n');
  for (const r of rows) {
    log(pad(r.rung === 0 ? 'honest' : 'rung ' + r.rung + ' ' + r.who, 20) + pad(r.kind, 9) + (r.err ? 'ERROR ' + r.err.split('\n')[0] : 'did ' + Object.entries(r.det.did).filter(([, v]) => v).map(([k, v]) => k + ' ' + v).join(', ')));
    for (const d of DETECTORS) if (r.det[d].length) log('    ' + pad(d, 13) + r.det[d].join('; '));
    if (!DETECTORS.some((d) => r.det[d].length)) log('    (nothing: every detector missed it)');
  }
  log('\nCAUGHT / MISSED, a rung by a detector\n');
  log(pad('', 24) + DETECTORS.map((d) => pad(d, 13)).join(''));
  for (const t of rungTable(rows)) {
    log(pad(t.name, 24) + DETECTORS.map((d) => pad(t.flagged.has(d) ? 'FLAGGED' : t.caught.has(d) ? 'held' : '-', 13)).join(''));
  }
  log('');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, dflt) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : dflt; };
  const t0 = performance.now();
  const rows = await runLeague({ minutes: Number(arg('--minutes', 10)), seed: arg('--seed', '') });
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else printLeague(rows);
  console.log('(' + ((performance.now() - t0) / 1000).toFixed(1) + ' s)');
  process.exit(0);
}
