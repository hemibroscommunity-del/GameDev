/* ═══ v2.3.5186: THE HOUSE BOTS (grand plan step 4.2, step 1; card K PR 6) ═══
 *
 * Every claim the worker believes inside a bound has a gain: the take of a
 * MAXIMAL LIAR (it sends the most the judge accepts) an hour, over an HONEST
 * player's (it plays as a phone does).  claims-gain.test.mjs runs these bots
 * and holds each gain to its line; docs/plan/census/claims.md is what they
 * measured.  Not a `*.test.mjs`: `npm test` never runs it by itself.
 *
 * THE WORLD.  One room a run, on card E's test room (testroom.mjs: its
 * storage, its seeded clock, its join), one bot in it.  The tick is the
 * room's own: `setInterval` is caught for the function named `tick`
 * (tick.js startTickLoop) and the bench calls it as the clock moves, so
 * monsters walk and strike, nodes and monsters come back, and the move's
 * follow runs exactly as on the worker.  Nothing is stubbed in the room.
 *
 * THE PHONE.  Every bot sends through a `Phone`, which carries one of card
 * E's DISTURBANCES (testroom.mjs: the one closed list):
 *   fps    the phone acts on its frames (1000/fps ms), and below 20 frames a
 *          second walks slower, as the page does (its step is clamped at 3
 *          frames' worth: BroTown.jsx _dtScale);
 *   delay  every message arrives `ms` late, and every answer comes back `ms`
 *          late (the bot waits for it);
 *   hidden at a third of the run the tab hides for `holdMs`: nothing is sent,
 *          and the message in hand goes when it is seen again;
 *   deploy at half the run the room restarts: what was written stays,
 *          memory is wiped, the bot joins again where it stands;
 *   loss   at half the run the socket drops: that message is lost, and the
 *          bot joins again where it stands;
 *   lane   the drawLane (card O): today `full`, which changes nothing here.
 * A bot meets a REFUSAL when the worker does not take what an honest phone
 * sent (a hit in reach that did not land, a strike not paid, a cook not
 * cooked, a step not taken): claims-gain fails on any one, on any
 * disturbance.
 *
 * NUMBERS, from the code (each says where):
 *   WALK 150 px a second (race.js: "A walk is 150 px a second"; the page's
 *   SPEED 2.5 a frame, gameSystems.js); a sword's honest reach about 100 px
 *   centre to centre, a swing every 600 ms; a bow 675 px, a shot every
 *   495 ms, an arrow 480 px a second; the harvest's swing 650 ms a hit and
 *   its gesture 1.2 to 1.75 s; the cook's 2 hits; an honest phone's grades
 *   (the bot lab's: 45% perfect, 44% good, 11% ok: tools/qa/load/bot-lab.mjs).
 */
import { makeStorage, openRoom, join as joinRoom } from './testroom.mjs';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { QUEST_REWARDS } from '../src/data.js';
import { HARVEST_GRADE } from '../src/harvestgrade.js';   /* v2.3.5900: the grade's judge, for its liar */
import { HONEST_CYCLE } from '../src/gathering.js';

export const MIN = 60_000;
export const WALK = 150;
const STEP_MS = 100;          /* a phone's moves, about 10 a second (the 33/66 ms batch, thinned) */

/* ══════════ THE TICK, CAUGHT ══════════ */
const realSetInterval = globalThis.setInterval, realClearInterval = globalThis.clearInterval;
globalThis.setInterval = (fn, ms, ...a) => (fn && fn.name === 'tick' ? { benchTick: fn } : realSetInterval(fn, ms, ...a));
globalThis.clearInterval = (h) => (h && h.benchTick ? undefined : realClearInterval(h));

/* a socket that keeps what a bot reads (the tick itself is skipped: the bench reads the room) */
export function botWs(label) {
  return { label, sent: [], closed: null,
    send(s) { if (s.startsWith('{"type":"tick"')) return; this.sent.push(JSON.parse(s)); if (this.sent.length > 4000) this.sent.splice(0, 2000); },
    close(code, why) { this.closed = { code, why }; } };
}
const soon = () => new Promise((r) => setImmediate(() => setImmediate(r)));

/* ══════════ THE WORLD: one room, one bot ══════════ */
export async function makeWorld(clock, { recs = {}, flags = {}, tickMs = 22, plant = null, prep = null } = {}) {
  const W = { clock, tickMs, recs, flags, plant, prep, ws: Object.create(null), at: Object.create(null), heal: false, hurt: 0, blows: 0 };
  W.st = makeStorage(new Map(Object.entries(recs).map(([pid, r]) => ['rpg:' + pid, structuredClone(r)])));
  W.room = await openRoom(W.st, { disable_event_capes: true, ...flags });
  if (prep) prep(W.room);
  if (plant) plant(W.room);
  W.ps = (pid) => W.room.playerState[pid];
  /* time passes: the room's own tick every tickMs, and the healer (when on)
     counts each blow and puts the hp back, so a run measures its claim and
     never a death */
  W.run = async (ms) => {
    let left = Math.max(0, ms);
    while (left > 0) {
      const dt = Math.min(W.tickMs, left);
      clock.advance(dt); left -= dt;
      const t = W.room.tickInterval && W.room.tickInterval.benchTick;
      if (t) t();
      if (W.heal) for (const pid of Object.keys(W.ws)) {
        const p = W.ps(pid);
        if (p && p.hp < p.maxHp) { W.hurt += p.maxHp - p.hp; W.blows++; p.hp = p.maxHp; }
      }
    }
    await soon();
  };
  /* the room's tick loop starts with its first web socket (GameRoom.fetch),
     which a test's join never opens: start it here, caught (above) */
  const tickOn = () => { if (!W.room.tickInterval) W.room.startTickLoop(); };
  W.join = async (pid, data, ph) => {
    const ws = botWs(pid);
    await joinRoom(W.room, ws, pid, { loginTaken: true, data });
    W.ws[pid] = ws;
    if (ph) ph.pid = pid;
    tickOn();
    return ws;
  };
  W.deliver = async (pid, msg) => {
    const ws = W.ws[pid];
    if (!ws || !W.room.sessions.get(ws)) return false;
    await W.room.webSocketMessage(ws, JSON.stringify(msg));
    await soon();
    return true;
  };
  /* a deploy: the room dies between two messages, what was written stays */
  W.deploy = async (where) => {
    await soon();
    W.st = makeStorage(W.st._store);
    W.room = await openRoom(W.st, { disable_event_capes: true, ...W.flags });
    if (W.prep) W.prep(W.room);
    if (W.plant) W.plant(W.room);
    for (const pid of Object.keys(W.ws)) await W.join(pid, where(pid));
    tickOn();
  };
  W.drop = async (pid, where) => {
    try { await W.room.webSocketClose(W.ws[pid], 1006, 'line lost', false); } catch {}
    await soon();
    await W.join(pid, where);
  };
  return W;
}

/* ══════════ THE PHONE: one disturbance on every send ══════════ */
export class Phone {
  constructor(W, pid, d, runMs) {
    Object.assign(this, { W, pid, d: d || { kind: 'lane' }, t0: W.clock.now(), runMs });
    this.frameMs = this.d.kind === 'fps' ? 1000 / this.d.fps : 0;
    this.walk = WALK * (this.frameMs ? Math.min(1, (3 * 1000 / this.frameMs) / 60) : 1);
    this.x = 0; this.y = 0; this.z = WHEEL_ZONE;
    this.done = { hide: false, deploy: false, loss: false };
    /* the time the tab was hidden: the page's own clocks (an arrow's flight)
       stand still while it is, as no script runs */
    this.held = 0;
    this.refusals = [];
  }
  get now() { return this.W.clock.now(); }
  get pageNow() { return this.now - this.held; }
  get ps() { return this.W.ps(this.pid); }
  get over() { return this.now - this.t0 >= this.runMs; }
  where() { return { x: Math.round(this.x), y: Math.round(this.y), z: this.z }; }
  async wait(ms) { await this.W.run(ms); }
  /* the answer to what was just sent comes back (a delay's second half) */
  async back() { if (this.d.kind === 'delay') await this.W.run(this.d.ms); }
  /* `atWorker` runs just before the worker reads the message: what the
     worker will judge it against (after the line's delay, a deploy, a hold) */
  async send(msg, atWorker) {
    const { d, W } = this;
    if (this.frameMs) { const into = (this.now - this.t0) % this.frameMs; if (into) await W.run(this.frameMs - into); }
    const half = this.t0 + this.runMs / 2;
    if (d.kind === 'hidden' && !this.done.hide && this.now >= this.t0 + this.runMs / 3) { this.done.hide = true; this.runMs += d.holdMs; this.held += d.holdMs; await W.run(d.holdMs); }
    if (d.kind === 'deploy' && !this.done.deploy && this.now >= half) { this.done.deploy = true; await W.deploy(() => this.where()); this.onRejoin && await this.onRejoin(); }
    if (d.kind === 'loss' && !this.done.loss && this.now >= half) {
      this.done.loss = true;
      await W.drop(this.pid, this.where());
      this.onRejoin && await this.onRejoin();
      return false;   /* this one is lost on the line */
    }
    if (d.kind === 'delay') await W.run(d.ms);
    if (atWorker) atWorker();
    return W.deliver(this.pid, msg);
  }
  refuse(what) { this.refusals.push(what); }
  /* a step of a walk: the page's move, top-level fields */
  moveMsg(extra) { return { type: 'move', x: Math.round(this.x), y: Math.round(this.y), z: this.z, d: 'down', vx: 0, vy: 0, ...(extra || {}) }; }
  /* walk toward (tx, ty) at `speed` until within `stop`, one step a phone's
     batch; an honest step is checked against where the worker put it */
  async walkTo(tx, ty, { speed = this.walk, stop = 0, honest = true, extra } = {}) {
    let guard = 0;
    while (!this.over && guard++ < 100000) {
      const dx = tx() - this.x, dy = ty() - this.y, dist = Math.hypot(dx, dy);
      if (dist <= stop) return true;
      const step = Math.min(dist - stop, speed * (this.frameMs ? Math.max(STEP_MS, this.frameMs) : STEP_MS) / 1000);
      this.x += (dx / dist) * step; this.y += (dy / dist) * step;
      await this.wait(this.frameMs ? Math.max(STEP_MS, this.frameMs) : STEP_MS);
      const sent = await this.send(this.moveMsg(typeof extra === 'function' ? extra() : extra));
      if (honest && sent && this.ps) {
        const off = Math.hypot(this.ps.x - Math.round(this.x), this.ps.y - Math.round(this.y));
        if (off > 2) { this.refuse('a step not taken: the worker kept ' + Math.round(off) + ' px back'); this.x = this.ps.x; this.y = this.ps.y; }
      }
    }
    return false;
  }
}

/* ══════════ SEEDS ══════════ */
const SWORD = { type: 'sword', tier: 'common', tierMult: 1.0, element1: null, element2: null, isVolatile: false, name: 'copper sword', gearBase: 'copper', quality: 'normal' };
const BOW = { type: 'bow', tier: 'common', tierMult: 1.0, element1: null, element2: null, isVolatile: false, name: 'pine bow', gearBase: 'pine', quality: 'normal' };
export const rec = (extra) => ({ _v: 21, coins: 100, level: 5, hp: 250, maxHp: 250, inventory: {}, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} }, ...(extra || {}) });
const u = (a, b) => a + Math.random() * (b - a);
const humanFp = () => ({ len: Math.round(u(300, 1400)), n: Math.round(u(40, 140)), dur: Math.round(u(1200, 2200)), ent: +u(0.06, 0.32).toFixed(3), tv: +u(2, 40).toFixed(2), vc: +u(0.06, 0.6).toFixed(3), h: (Math.random() * 4294967296) >>> 0 });

/* ══════════ COMBAT: the frost field's first monsters ══════════ */
const PID = 'bp_bench_a';
const inField = (m) => m.home === 'frost' && m.level <= 3 && !m.tier;
const field = (W) => W.room._ensureZoneMonsters(WHEEL_ZONE).filter(inField);
/* the Wheel's monsters within 4,000 px of the frost field's first: the rest
   (some 1,900) never meet a bot, and ticking them costs a run seconds.  The
   room makes them as it always does (_spawnZoneMonsters); the bench keeps
   the near ones (a world's `prep`, on every room it opens, a deploy's too) */
export function nearField(room) {
  if (room.monsters[WHEEL_ZONE]) return;
  const all = room._spawnZoneMonsters(WHEEL_ZONE);
  const f0 = all.find(inField);
  room.monsters[WHEEL_ZONE] = all.filter((m) => Math.hypot(m.x - f0.x, m.y - f0.y) < 4000);
  for (const m of room.monsters[WHEEL_ZONE]) room._markMonsterDirty(WHEEL_ZONE, m.id);
}
/* a monster that can be hurt now: alive, and not in its invulnerable
   window (combat.js _monsterDamageable: a leash home, a split) -- the game's
   own rule, which a player sees, so no bot swings at one */
const hurtable = (m) => m.alive && m.hp > 0 && !(m._invulnUntil && Date.now() < m._invulnUntil) && !(m._splitFloor > 0 && m.hp <= m._splitFloor);
const alive = (W) => field(W).filter(hurtable);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
async function combatStart(W, ph, gear) {
  /* the healer: a run measures its claim, never a death and the walk back
     (the guard's own runs count what it puts back: W.hurt) */
  W.heal = true;
  const f = field(W);
  const m0 = f[0];
  ph.x = m0.x + 300; ph.y = m0.y; ph.z = WHEEL_ZONE;
  await W.join(PID, ph.where(), ph);
  const arm = () => { const ps = W.ps(PID); if (!ps) return; ps.weapon = { ...SWORD }; if (gear === 'bow') ps.rangedWeapon = { ...BOW }; ps._zoneEntryGraceUntil = 0; };
  arm();
  ph.onRejoin = async () => { arm(); };
}
/* the take of a fight: kills, and the xp the worker credited */
function fightTake(ws) {
  let xp = 0;
  for (const m of ws.sent) if (m.type === 'combat_credit' && m.payload) xp += Number(m.payload.xpAmt) || 0;
  return xp;
}
/* the room's own monster by its id: a deploy makes the room, and its
   monsters, again */
const liveOf = (W, id) => (W.room.monsters[WHEEL_ZONE] || []).find((x) => x.id === id) || null;
/* one claim on a monster, and whether it landed (its hp fell, or it died).
   `could`: the monster could be hurt, and stood within `reach` of the
   worker's copy of the player, when the claim reached the worker */
async function claim(W, ph, m0, slot, extra, bundle, reach = Infinity) {
  let hp0 = 0, a0 = false, could = false;
  const msg = { type: 'monster_damage', payload: { monsterId: m0.id, zone: WHEEL_ZONE, slot, ...(extra || {}) } };
  const sent = await ph.send(bundle ? [msg, bundle] : msg, () => {
    const m = liveOf(W, m0.id), ps = W.ps(ph.pid);
    hp0 = m ? m.hp : 0; a0 = !!(m && m.alive);
    could = !!(m && ps && hurtable(m) && dist(m, ps) <= reach);
  });
  const m = liveOf(W, m0.id);
  return { sent, landed: !!(a0 && m && (m.hp < hp0 || !m.alive)), could, killed: !!(a0 && m && !m.alive) };
}

/* the honest sword: walk in to ~90 px, swing every 600 ms, follow the shove */
export async function honestSword(W, ph, take, opts = {}) {
  await combatStart(W, ph, 'sword');
  let target = null;
  while (!ph.over) {
    target = target && liveOf(W, target.id);
    if (!target || !hurtable(target)) { const a = alive(W); target = a.sort((p, q) => dist(p, ph) - dist(q, ph))[0]; if (!target) { await ph.wait(500); continue; } }
    if (dist(target, ph) > 90) { const t = target; await ph.walkTo(() => t.x, () => t.y, { stop: 80, extra: opts.moveExtra && opts.moveExtra(t) }); continue; }
    const r = await claim(W, ph, target, 'melee', null, opts.bundle && opts.bundle(target), 100);
    if (r.sent && !r.landed && r.could) ph.refuse('a sword hit in reach did not land');
    if (r.killed) { take.kills++; if (opts.afterKill) await opts.afterKill(); }
    await ph.wait(600);
  }
  take.xp = fightTake(W.ws[PID]);
}
/* the liar's sword: every monster inside the judge's reach, every 210 ms (the
   per-monster lane), never shoved (`noKb`), walked to at the move's bound */
export async function liarSword(W, ph, take, opts = {}) {
  await combatStart(W, ph, 'sword');
  const reach = () => (W.room._swordReach ? W.room._swordReach() : W.room.PVE_MELEE_RANGE) - 1;   /* v2.3.5548: the judge's reach (swordswing.js) */
  while (!ph.over) {
    const ps = W.ps(PID);
    const inReach = alive(W).filter((m) => dist(m, ps) <= reach());
    if (!inReach.length) {
      const a = alive(W).sort((p, q) => dist(p, ph) - dist(q, ph))[0];
      if (!a) { await ph.wait(500); continue; }
      await ph.walkTo(() => a.x, () => a.y, { speed: opts.speed || 480, stop: reach() - 20, honest: false });   /* v2.3.5548: `opts.speed`, the sword's claim alone at an honest walk (the move's claim apart) */
      continue;
    }
    for (const m of inReach) { const r = await claim(W, ph, m, 'melee', { noKb: true }); if (r.killed) take.kills++; }
    await ph.wait(210);
  }
  take.xp = fightTake(W.ws[PID]);
}
/* the honest archer: in to ~600 px, a shot every 495 ms, each claim when its arrow lands.
   v2.3.5540: `opts.stepIn`, the stepping archer -- it walks in at a run (250
   px a second) while its arrows fly, down to 260 px, and backs out to 600
   when it gets there: each arrow's flight shorter than the last, so two land
   on one monster closer together than they were shot (combat.js's archer's
   lane, `arrowlane`) */
export async function honestBow(W, ph, take, opts = {}) {
  await combatStart(W, ph, 'bow');
  let target = null; const flying = [];   /* each arrow's landing, on the page's clock (ph.pageNow) */
  let nextShot = ph.pageNow;
  while (!ph.over) {
    target = target && liveOf(W, target.id);
    if (!target || !hurtable(target)) { const a = alive(W); target = a.sort((p, q) => dist(p, ph) - dist(q, ph))[0]; if (!target) { await ph.wait(500); continue; } }
    /* it steps closer only with no arrow in the air (`opts.stepIn` is the
       archer who does not: v2.3.5540, combat.js's archer's lane) */
    if (dist(target, ph) > 620 && !flying.length) { const t = target; await ph.walkTo(() => t.x, () => t.y, { stop: 600 }); nextShot = Math.max(nextShot, ph.pageNow); continue; }
    /* v2.3.5540: the stepping archer backs out to 600 px once in to 260, with nothing in the air */
    if (opts.stepIn && dist(target, ph) < 270 && !flying.length) {
      const t = target, d0 = Math.max(1, dist(t, ph)), ox = ph.x + ((ph.x - t.x) / d0) * (600 - d0), oy = ph.y + ((ph.y - t.y) / d0) * (600 - d0);
      await ph.walkTo(() => ox, () => oy, { speed: 250 }); nextShot = Math.max(nextShot, ph.pageNow); continue;
    }
    if (dist(target, ph) > 620) nextShot = Infinity;
    if (nextShot === Infinity && !flying.length) { nextShot = ph.pageNow; continue; }
    if (ph.pageNow >= nextShot) {
      /* v2.3.5550: the arrow's relay, as a page looses it (monsterCombat.js: `player_projectile`; bowshot.js counts it) */
      await ph.send({ type: 'player_projectile', payload: { x: Math.round(ph.x), y: Math.round(ph.y), ang: Math.atan2(target.y - ph.y, target.x - ph.x), isStaff: false, ts: Math.round(ph.pageNow) } });
      flying.push({ m: target, at: ph.pageNow + (dist(target, ph) / 480) * 1000 }); nextShot = ph.pageNow + (opts.gap || 495);   /* v2.3.5550: `opts.gap`, the flicked bow's 371 ms */
    }
    flying.sort((a, b) => a.at - b.at);
    const due = Math.min(nextShot, flying.length ? flying[0].at : Infinity);
    /* v2.3.5540: the stepping archer runs in while it waits (to 260 px) */
    if (opts.stepIn && due > ph.pageNow && due !== Infinity && dist(target, ph) > 270) {
      /* to a point fixed now, so the step takes the wait and no longer: each
         arrow's claim goes when it lands, as a phone's does */
      const t = target, dt = due - ph.pageNow, d0 = dist(t, ph), step = Math.min(d0 - 260, (250 * dt) / 1000);
      const sx = ph.x + ((t.x - ph.x) / d0) * step, sy = ph.y + ((t.y - ph.y) / d0) * step;
      if (step > 1) await ph.walkTo(() => sx, () => sy, { speed: 250 });
    }
    if (due > ph.pageNow) await ph.wait(due - ph.pageNow);
    while (flying.length && flying[0].at <= ph.pageNow) {
      const f = flying.shift();
      const fm = liveOf(W, f.m.id);
      if (!fm || !hurtable(fm)) continue;
      const r = await claim(W, ph, fm, 'ranged', null, null, 675);
      if (r.sent && !r.landed && r.could) ph.refuse('an arrow in reach did not land');
      if (r.killed) take.kills++;
    }
  }
  take.xp = fightTake(W.ws[PID]);
}
/* the liar's bow label (TRAPS §329): a sword's blow sent as `ranged` with a
   bow worn, standing still, five claims a second over everything in the
   bow's whole reach */
export async function liarBowLabel(W, ph, take, opts = {}) {
  await combatStart(W, ph, 'bow');
  while (!ph.over) {
    const ps = W.ps(PID);
    const reach = W.room._hitReach ? W.room._hitReach(ps, 'ranged', ph.now) - 1 : 1489;
    const inReach = alive(W).filter((m) => dist(m, ps) <= reach).sort((p, q) => dist(p, ps) - dist(q, ps));
    if (!inReach.length) {
      const a = alive(W).sort((p, q) => dist(p, ph) - dist(q, ph))[0];
      if (!a) { await ph.wait(500); continue; }
      await ph.walkTo(() => a.x, () => a.y, { speed: 480, stop: reach - 40, honest: false });
      continue;
    }
    for (const m of inReach.slice(0, 5)) {
      /* v2.3.5550: `opts.shots`, the liar `bowshot` meets: an arrow's relay sent before each claim (bowshot.js counts it at the bow's rate) */
      if (opts.shots) await ph.send({ type: 'player_projectile', payload: { x: Math.round(ph.x), y: Math.round(ph.y), ang: 0, isStaff: false, ts: Math.round(ph.pageNow) } });
      const r = await claim(W, ph, m, 'ranged', { noKb: true }); if (r.killed) take.kills++; await ph.wait(200);
    }
  }
  take.xp = fightTake(W.ws[PID]);
}
/* the guard: the honest sword's fight with the monsters striking, its guard
   down while it swings; the liar sends each blow with a raised guard pointed
   at its target, and wears no shield */
export async function honestGuard(W, ph, take) {
  await honestSword(W, ph, take);
  take.hurt = W.hurt;
}
export async function liarGuard(W, ph, take) {
  const angle = (m) => Math.atan2(m.y - ph.y, m.x - ph.x);
  await honestSword(W, ph, take, {
    bundle: (m) => ph.moveMsg({ blocking: true, ba: angle(m) }),
    moveExtra: () => ({ blocking: true }),
  });
  take.hurt = W.hurt;
}

/* the cooking shield (moveclaims.js _cookShieldHolds): a liar lights its own
   fire by the field and, after each kill, claims `ex: 'cook'` with no fish
   (an `ex: null` then `'cook'` edge), waits out the 3 s re-arm and fights on.
   Its take is the damage it is kept from per kill (the shield guards no
   swing: the first attack ends it) */
export async function liarCookShield(W, ph, take) {
  await combatStart(W, ph, 'sword');
  const ps0 = W.ps(PID); if (ps0) ps0.inventory = { ...(ps0.inventory || {}), wood_pine_log: 200 };
  let fireAt = -Infinity, kills = 0;
  const light = async () => { const p = W.ps(PID); if (p && !(p.inventory && p.inventory.wood_pine_log)) p.inventory = { ...(p.inventory || {}), wood_pine_log: 200 }; await ph.send({ type: 'firemaking_request', payload: { invKey: 'wood_pine_log' } }); fireAt = ph.now; };
  await honestSword(W, ph, take, {
    afterKill: async () => {
      if (ph.now - fireAt > 50000) await light();
      await ph.send(ph.moveMsg({ ex: null }));
      await ph.send(ph.moveMsg({ ex: 'cook' }));
      kills++;
      await ph.wait(3200);
      await ph.send(ph.moveMsg({ ex: null }));
    },
  });
}

/* ══════════ THE MOVE: a route of far points ══════════ */
/* the liar names its next point at the bound's own speed, and marks every
   other step a sprint (`sp: 1`): a sprint step is billed only when the step
   before was one too (sprint.js), so the bound stays at the sprint's 1.33
   and no stamina is spent */
export async function mover(W, ph, take, { speed, sprintHole = false, sprinter = false }) {
  const pts = W.room._ensureZoneNodes(WHEEL_ZONE).filter((n) => n.tierLvl === 1).slice(0, 40);
  ph.x = pts[0].x; ph.y = pts[0].y;
  await W.join(PID, ph.where(), ph);
  let i = 1, last = { x: W.ps(PID).x, y: W.ps(PID).y };
  const count = () => { const p = W.ps(PID); if (p) { take.px += Math.hypot(p.x - last.x, p.y - last.y); last = { x: p.x, y: p.y }; } };
  ph.onRejoin = async () => { const p = W.ps(PID); if (p) last = { x: p.x, y: p.y }; };
  while (!ph.over) {
    const t = pts[i % pts.length];
    const honest = speed <= WALK;
    let k = 0;
    if (sprinter) {
      /* v2.3.5541: the honest sprinter -- half a second at a time it sprints
         (every move marked, the walk x 1.33) while the worker's stamina
         lasts (its bar), for 3 s, then lets go and walks 0.8 s, and presses
         again: inside the grace, so its run goes on (sprint.js) */
      const ps0 = W.ps(PID), st = ps0 && typeof ps0.stamina === 'number' ? ps0.stamina : 0;
      ph._spT = ph._spT || 0;
      const run = st >= 5 && ph._spT < 3000;
      const sp = run ? ph.walk * 1.33 : ph.walk, ms = run ? 500 : 800;   /* v2.3.5541 (review-z16): the walk is 0.8 s, one piece */
      const d = Math.hypot(t.x - ph.x, t.y - ph.y), step = Math.min(d, (sp * ms) / 1000);
      if (d > 1) { const sx = ph.x + ((t.x - ph.x) / d) * step, sy = ph.y + ((t.y - ph.y) / d) * step; await ph.walkTo(() => sx, () => sy, { speed: sp, honest: true, extra: run ? () => ({ sp: 1 }) : undefined }); }
      ph._spT = run ? ph._spT + ms : 0;
    } else
    await ph.walkTo(() => t.x, () => t.y, { speed: honest ? ph.walk : speed, honest, extra: sprintHole ? () => ({ sp: (k++ % 2) ? 1 : 0 }) : undefined });
    count();
    if (Math.hypot(t.x - ph.x, t.y - ph.y) < 1) { take.points++; i++; }
  }
  count();
}

/* ══════════ THE HARVEST: copper ore in the Wheel ══════════ */
const HPID = 'bp_bench_h';
export const harvestRec = () => rec({ inventory: { mining_pickaxe: 1 }, lifeSkills: { mining: { level: 15, xp: 0 } } });
function gradeOf(mix) {
  const r = Math.random();
  return r < mix.perfect ? 'perfect' : r < mix.perfect + mix.good ? 'good' : 'ok';
}
/* v2.3.5900 (card K4 PR 1): `graded`, the liar against the grade's judge
   (harvestgrade.js, `harvestgrade: true`): it keeps its own count of the
   perfects believed in its last strikes, as the judge does, and while one
   more would be believed it waits for the earliest a perfect is (the plan's
   hits, the settle and the gesture's floor, less the judge's slack); when
   its share is spent it strikes at once, a good */
export async function harvester(W, ph, take, { mix, liar = false, graded = false }) {
  const run = [];
  const ores = () => W.room._ensureZoneNodes(WHEEL_ZONE).filter((n) => n.nodeType === 'oreVein' && n.tierLvl === 1);
  const n0 = ores()[0];
  ph.x = n0.x + 10; ph.y = n0.y + 10; ph.z = WHEEL_ZONE;
  await W.join(HPID, ph.where(), ph);
  let seq = 0;
  while (!ph.over) {
    const node = ores().filter((n) => n.alive !== false).sort((p, q) => dist(p, ph) - dist(q, ph))[0];
    if (!node) { await ph.wait(1000); continue; }
    if (dist(node, ph) > 30) { await ph.walkTo(() => node.x + 10, () => node.y + 10, { honest: !liar }); continue; }
    const ws = W.ws[HPID];
    const n0s = ws.sent.length;
    const sent = await ph.send({ type: 'extraction_start', payload: { nodeId: node.id, zone: WHEEL_ZONE, skill: 'mining', hitSeq: ++seq } });
    if (!sent) continue;
    await ph.back();
    const plan = ws.sent.slice(n0s).filter((m) => m.type === 'gather_hits').pop();
    const hits = plan && plan.payload && Array.isArray(plan.payload.hits) ? plan.payload.hits.length : 1;
    const ex = W.room.extractions[HPID];
    let perfect = liar;
    if (liar && graded) perfect = run.slice(-(HARVEST_GRADE.SHARE_OF - 1)).reduce((a, b) => a + b, 0) < HARVEST_GRADE.SHARE_MAX;
    if (liar && graded && perfect) {
      await ph.wait((hits - 1) * 650 + HONEST_CYCLE.LEAD_MS + HONEST_CYCLE.SETTLE_MS + HONEST_CYCLE.GESTURE_FLOOR_MS - HARVEST_GRADE.SLACK_MS);
    } else if (liar) {
      /* the earliest the worker takes: its own start plus the hits less its 250 ms slack */
      await ph.wait(Math.max(0, (hits - 1) * 650 - 249));
    } else {
      await ph.wait(80 + 90 + Math.max(0, hits - 1) * 650 + 220 + u(1350, 1750));
    }
    const grade = liar ? (perfect ? 'perfect' : 'good') : gradeOf(mix);
    if (graded) { run.push(perfect ? 1 : 0); if (run.length > HARVEST_GRADE.SHARE_OF) run.shift(); }
    const ore0 = (W.ps(HPID) && W.ps(HPID).inventory && W.ps(HPID).inventory.ore_copper_ore) || 0;
    const s2 = await ph.send({ type: 'node_strike', payload: { id: node.id, zone: WHEEL_ZONE, accuracy: grade, swipeFp: humanFp() } });
    if (!s2) continue;
    const why = W.room._lastStrikeFor ? (W.room._lastStrikeFor(HPID) || {}).why : 'paid';
    if (why !== 'paid' && !liar) ph.refuse('a strike not paid: ' + why + (ex ? '' : ' (no extraction)'));
    const ore1 = (W.ps(HPID) && W.ps(HPID).inventory && W.ps(HPID).inventory.ore_copper_ore) || 0;
    take.ore += Math.max(0, ore1 - ore0);
    /* v2.3.5900: an honest perfect paid as good is a refusal too (the grade's
       judge, harvestgrade.js: what the worker did not take of what it sent) */
    if (!liar && why === 'paid' && grade === 'perfect' && ore1 - ore0 === 1) ph.refuse('a perfect paid as good');
    if (!liar) await ph.wait(u(250, 600));
  }
}

/* ══════════ THE COOK ══════════ */
const CPID = 'bp_bench_c';
export const cookRec = () => rec({ inventory: { fish_minnow: 5000, wood_pine_log: 200 }, lifeSkills: { cooking: { level: 10, xp: 0 } } });
export async function cook(W, ph, take, { liar = false, start = false }) {
  ph.x = 0; ph.y = 0; ph.z = 'town';
  await W.join(CPID, { x: 100, y: 100, z: 'town' }, ph);
  ph.x = 100; ph.y = 100;
  let seq = 0, fireAt = -Infinity;
  const cooked = () => (W.ps(CPID) && W.ps(CPID).inventory && W.ps(CPID).inventory.cooked_fish_minnow) || 0;
  while (!ph.over) {
    const c0 = cooked();
    if (liar && start) {
      /* v2.3.5553: the liar `cookstart` meets -- the start, then the result at
         the plan's quickest (each beat after the first, at the judge's slack),
         no fire and no gesture */
      const ws = W.ws[CPID]; const n0 = ws.sent.length;
      const st = await ph.send({ type: 'extraction_start', payload: { skill: 'cooking', fishKey: 'fish_minnow', hitSeq: ++seq } });
      if (!st) continue;
      await ph.back();
      const plan = ws.sent.slice(n0).filter((m) => m.type === 'gather_hits').pop();
      const hits = plan && plan.payload && Array.isArray(plan.payload.hits) ? plan.payload.hits.length : 2;
      await ph.wait((Math.max(0, hits - 1) * 650 + 1510) * 0.7 + 1);
      const sent = await ph.send({ type: 'cook_request', payload: { fishKey: 'fish_minnow', kind: 'cooked' } });
      if (sent) take.cooked += Math.max(0, cooked() - c0);
      await ph.wait(60000 / 45 + 1);
      continue;
    }
    if (liar) {
      const sent = await ph.send({ type: 'cook_request', payload: { fishKey: 'fish_minnow', kind: 'cooked' } });
      if (sent) take.cooked += Math.max(0, cooked() - c0);
      await ph.wait(60000 / 45 + 1);
      continue;
    }
    if (ph.now - fireAt > 40000) { await ph.send({ type: 'firemaking_request', payload: { invKey: 'wood_pine_log' } }); fireAt = ph.now; await ph.back(); }
    const ws = W.ws[CPID]; const n0 = ws.sent.length;
    const sent = await ph.send({ type: 'extraction_start', payload: { skill: 'cooking', fishKey: 'fish_minnow', hitSeq: ++seq } });
    if (!sent) continue;
    await ph.back();
    const plan = ws.sent.slice(n0).filter((m) => m.type === 'gather_hits').pop();
    const hits = plan && plan.payload && Array.isArray(plan.payload.hits) ? plan.payload.hits.length : 2;
    await ph.wait(80 + 90 + Math.max(0, hits - 1) * 650 + 220 + u(1350, 1750));
    const s2 = await ph.send({ type: 'cook_request', payload: { fishKey: 'fish_minnow', kind: 'cooked' } });
    if (!s2) continue;
    const got = cooked() - c0;
    if (got <= 0) ph.refuse('a cook not cooked');
    take.cooked += Math.max(0, got);
    await ph.wait(u(250, 600));
  }
}

/* ══════════ THE QUEST HAND-IN AND THE WEAPON SALE ══════════ */
const QPID = 'bp_bench_q';
export const questRec = () => rec({ _quests: { tut_1: 'turnedIn', mayor_1: 'active' } });
export async function quests(W, ph, take, { liar = false }) {
  await W.join(QPID, { x: 100, y: 100, z: 'town' }, ph);
  const c0 = W.ps(QPID).coins;
  const ids = liar ? Object.keys(QUEST_REWARDS) : ['mayor_1'];
  for (let round = 0; round < (liar ? 20 : 1) && !ph.over; round++) {
    for (const q of ids) { await ph.send({ type: 'quest_turn_in', payload: { questId: q, xpCat: 'sword' } }); await ph.wait(250); }
  }
  take.gold += W.ps(QPID).coins - c0;
}
const WPID = 'bp_bench_w';
export const saleRec = () => rec({ weaponStash: [1, 2, 3, 4, 5].map((i) => ({ ...SWORD, name: 'sword ' + i, tierMult: 1 + i / 5 })) });
export async function sales(W, ph, take, { liar = false }) {
  await W.join(WPID, { x: 100, y: 100, z: 'town' }, ph);
  const c0 = W.ps(WPID).coins;
  const idx = liar ? [0, -1, 1e9, 1.5, 4, '0', null, 3, 0, 0, 2, 7, 0, 0, 0] : [0, 0, 0, 0, 0];
  for (let r = 0; r < (liar ? 10 : 1); r++) for (const i of idx) { await ph.send({ type: 'sell_weapon', payload: { stashIdx: i } }); await ph.wait(250); }
  take.gold += W.ps(WPID).coins - c0;
}

/* ══════════ THE LOCAL-MONSTER MODE: relays the worker only passes on ══════════ */
const LPID = 'bp_bench_l';
export async function localMonsters(W, ph, take, { liar = false }) {
  await W.join(LPID, { x: 100, y: 100, z: WHEEL_ZONE }, ph);
  const ps0 = W.ps(LPID);
  const c0 = ps0.coins, x0 = ps0.xp || 0, k0 = ps0.svKills || 0;
  for (let i = 0; i < (liar ? 600 : 0) && !ph.over; i++) {
    await ph.send({ type: 'monster_dmg_at', payload: { x: 100, y: 100, dmg: 99999, kill: true } });
    await ph.send({ type: 'player_hurt_by_monster', payload: { dmg: -99999 } });
    await ph.wait(200);
  }
  const ps = W.ps(LPID);
  take.gold += ps.coins - c0; take.xp += (ps.xp || 0) - x0; take.kills += (ps.svKills || 0) - k0;
}
