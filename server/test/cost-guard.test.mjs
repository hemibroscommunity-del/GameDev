/* ═══ v2.3.3270: THE COST GUARD -- what play writes to storage stays what it is ═══
 *
 * The owner: "Build my game so that it's the most cost effective that it can
 * be without losing quality."  On Cloudflare's paid plan every storage put or
 * delete is a row written ($1.00 a million past 50 million a month), and at
 * 20,000 monthly players that is the biggest line of the bill
 * (docs/specs/cost-diet.md).  Measured (tools/qa/load/cost-audit.mjs), the
 * room already writes the least it can without a player ever seeing a reward
 * roll back (ARCHITECTURE-HANDOFF rule 10): nothing while you stand or walk,
 * one row a kill or a harvest, your health at most every REGEN_SAVE_MS.  This
 * suite holds those lines, so a feature that saves on a timer, on a move or
 * twice an event fails here instead of on the bill.  It has happened: the
 * regen tick once saved every 670 ms (5,455 rows a player-hour, v2.3.1619).
 *
 *   1. standing still in BroTown writes nothing of yours (and the idle
 *      logout's close a row or two);
 *   2. walking BroTown for 3 minutes writes nothing of yours;
 *   3. regenerating writes your record at most once a REGEN_SAVE_MS;
 *   4. a monster's hits (out of the near-death band) the same;
 *   5. a kill writes your record once, and the codex at most once a SAVE_MS;
 *   6. gathering: the bot statistics at most once a PUT_MIN_MS (5 minutes
 *      since v2.3.3270, was 30 s), your record at most once a harvest;
 *   7. a new character's join and arrival in the Wheel, and a returning
 *      one's, in a handful of rows;
 *   8. the room's own writes with one player in it for 10 minutes.
 *   9. v2.3.3293 (the architecture review): a tap a script can send as fast
 *      as it likes writes a bounded number of rows -- a shield on and off
 *      200 times in 2 s, a weapon in and out of a trade window 100 times
 *      (they wrote 200 and ~250);
 * A line here may move when a feature really needs the rows: say so in the
 * PR, in plain words, as the memory budget asks (CLAUDE.md).
 */
import { GameRoom } from '../src/index.js';
import { BOTFP } from '../src/botfp.js';
import { CODEX } from '../src/codex.js';
import { WHEEL_SPAWNS } from '../src/wheelspawns.js';
import { PACE } from '../src/flood.js';
import { shieldSig } from '../src/shieldwear.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

let NOW = 1_760_000_000_000;
Date.now = () => NOW;
/* the room's dice, the same every run */
{
  let a = 12345;
  Math.random = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; };
}

/* storage that keeps a copy of what is put, as a Durable Object's does, and
   counts every row written by its key */
function countingState() {
  const m = new Map();
  const writes = [];
  const clone = (v) => (v === undefined ? undefined : structuredClone(v));
  const note = (k) => writes.push(String(k));
  return {
    writes, store: m,
    storage: {
      async get(k) {
        if (Array.isArray(k)) { const r = new Map(); for (const x of k) if (m.has(x)) r.set(x, clone(m.get(x))); return r; }
        return clone(m.get(k));
      },
      async put(k, v) {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) { note(kk); m.set(kk, clone(vv)); } return; }
        note(k); m.set(k, clone(v));
      },
      async delete(k) {
        if (Array.isArray(k)) { for (const x of k) { note(x); m.delete(x); } return k.length; }
        note(k); return m.delete(k);
      },
      async list(opts) {
        const r = new Map(); const p = (opts && opts.prefix) || '';
        for (const [k, v] of m) if (k.startsWith(p)) r.set(k, clone(v));
        return r;
      },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } };
function fakeWs() { return { sent: 0, send() { this.sent++; }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }

async function makeRoom() {
  const state = countingState();
  const room = new GameRoom(state, mockEnv);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return realSetInterval(fn, ms); };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  room._liveFlags = {};
  return { room, tickFn, state };
}
const ARRIVAL = { x: 21504, y: 21792 };
const mv = (x, y, vx = 0, vy = 0, z = 'wheel') => ({ type: 'move', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: 'down', f: 'south',
  eqc: 'none', eql: 'none', eqs: 'none', ex: null, z, vx: Math.round(vx), vy: Math.round(vy), dodging: false, blocking: false, ba: null, dead: false });
async function join(room, id) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } }));
  await room.webSocketMessage(ws, JSON.stringify(mv(ARRIVAL.x, ARRIVAL.y)));   /* down the stairs, into the Wheel */
  return { ws, id };
}
const send = (room, p, m) => room.webSocketMessage(p.ws, JSON.stringify(m));
/* rows written under keys that carry this player's id */
const mine = (state, id, from = 0) => state.writes.slice(from).filter((k) => k.indexOf(id) >= 0);
const byPrefix = (keys) => keys.reduce((o, k) => { const p = k.split(':')[0]; o[p] = (o[p] || 0) + 1; return o; }, {});
/* `step`: the clock's stride.  The room's tick reads the clock, so a longer
   stride runs the same minutes in fewer ticks -- for what does not count ticks
   (a walk, a harvest, the idle logout); the regen tick does, so 3 and 4 keep
   the room's own TICK_RATE */
async function run(room, tickFn, ms, each, step) {
  const end = NOW + ms;
  const dt = step || room.TICK_RATE;
  while (NOW < end) { NOW += dt; if (each) await each(dt); tickFn(); }
}
const FAST = 110;

/* ── 1. standing still ─────────────────────────────────────────────────── */
{
  const { room, tickFn, state } = await makeRoom();
  const p = await join(room, 'cg_stand');
  const w0 = state.writes.length;
  /* the quiet phone standing: a copy of its move every 10 s (quietPhone.js) */
  let since = 0;
  const stand = (ms) => run(room, tickFn, ms, async (dt) => { since += dt; if (since >= 10000) { since = 0; await send(room, p, mv(ARRIVAL.x, ARRIVAL.y)); } }, FAST);
  await stand(100000);
  const w = mine(state, 'cg_stand', w0);
  check('1. standing still in BroTown writes nothing of yours', w.length === 0, byPrefix(w));
  /* with no thumb on anything for 2 minutes the room logs you out
     (IDLE_TIMEOUT_MS), and the close writes what it keeps for you once */
  await stand(3 * 60000);
  const w2 = mine(state, 'cg_stand', w0);
  check(`1b. ...and three minutes more, the idle logout included, writes ${w2.length} (${Object.entries(byPrefix(w2)).map((e) => e.join(' ')).join(', ') || 'none'}), at most 2`,
    w2.length <= 2, byPrefix(w2));
}

/* ── 2. walking ────────────────────────────────────────────────────────── */
{
  const { room, tickFn, state } = await makeRoom();
  const p = await join(room, 'cg_walk');
  const w0 = state.writes.length;
  let x = ARRIVAL.x, y = ARRIVAL.y, ang = 0, acc = 0;
  const SP = 0.165;   /* px a ms */
  await run(room, tickFn, 3 * 60000, async (stride) => {
    acc += stride;
    if (acc < 66) return;
    const dt = acc; acc = 0;
    ang += 0.02;
    const ux = Math.cos(ang), uy = Math.sin(ang);
    x += ux * SP * dt; y += uy * SP * dt;
    /* stay round the square: a circle of ~600 px */
    if (Math.hypot(x - ARRIVAL.x, y - ARRIVAL.y) > 600) { x = ARRIVAL.x; y = ARRIVAL.y; await send(room, p, mv(x, y)); return; }
    await send(room, p, mv(x, y, ux * SP * 1000 / 60 * 100, uy * SP * 1000 / 60 * 100));
  }, FAST);
  const w = mine(state, 'cg_walk', w0);
  check('2. walking BroTown for 3 minutes writes nothing of yours', w.length === 0, byPrefix(w));
}

/* ── 3. regenerating ───────────────────────────────────────────────────── */
{
  const { room, tickFn, state } = await makeRoom();
  await join(room, 'cg_regen');
  const ps = room.playerState.cg_regen;
  ps.hp = Math.round((ps.maxHp || 100) * 0.5); ps.stamina = 10; ps.mana = 10;
  const w0 = state.writes.length;
  const MS = 60000;
  await run(room, tickFn, MS);
  const w = mine(state, 'cg_regen', w0).filter((k) => k.startsWith('rpg:'));
  const lim = Math.ceil(MS / room.REGEN_SAVE_MS) + 1;
  check(`3. regenerating for a minute writes your record at most once a REGEN_SAVE_MS (${w.length}, at most ${lim}), and that is 10 s`,
    w.length <= lim && w.length >= 1 && room.REGEN_SAVE_MS >= 10000, { n: w.length, lim, REGEN_SAVE_MS: room.REGEN_SAVE_MS });
}

/* ── 4. a monster's hits ───────────────────────────────────────────────── */
{
  const { room, tickFn, state } = await makeRoom();
  await join(room, 'cg_hit');
  const ps = room.playerState.cg_hit;
  const w0 = state.writes.length;
  const MS = 60000;
  let since = 0, hits = 0;
  await run(room, tickFn, MS, async () => {
    since += room.TICK_RATE;
    if (since < 1500) return;
    since = 0;
    /* what _monsterStrikePlayer does with the hit's outcome: HP down, then
       the coalesced save (index.js) -- kept out of the near-death band,
       where every hit saves at once by design */
    ps.hp = Math.max(Math.ceil((ps.maxHp || 100) * 0.6), (ps.hp || 100) - 3);
    hits++;
    room._saveRpgVitals('cg_hit', ps);
  });
  const w = mine(state, 'cg_hit', w0).filter((k) => k.startsWith('rpg:'));
  const lim = Math.ceil(MS / room.REGEN_SAVE_MS) + 1;
  check(`4. ${hits} hits in a minute write your record at most once a REGEN_SAVE_MS (${w.length}, at most ${lim})`, w.length <= lim, { n: w.length, lim });
  /* and in the band, every hit at once: the carve-out that keeps it honest */
  ps.hp = Math.floor((ps.maxHp || 100) * room.HP_URGENT_SAVE_FRAC);
  const w1 = state.writes.length;
  room._saveRpgVitals('cg_hit', ps); room._saveRpgVitals('cg_hit', ps);
  check('4b. ...but near death (at or under HP_URGENT_SAVE_FRAC) every hit saves at once', mine(state, 'cg_hit', w1).length === 2, mine(state, 'cg_hit', w1));
}

/* ── 5. a kill ─────────────────────────────────────────────────────────── */
{
  const { room, tickFn, state } = await makeRoom();
  /* the crimson cape's "first three" (eventcapes.js) saves a winning kill a
     second time, at once, on purpose -- a prize, not what a kill costs; off
     here (the suite's own lever), so the dice cannot hand one out */
  room._eventLive = false;
  await join(room, 'cg_kill');
  const ps = room.playerState.cg_kill;
  /* a few ticks so the Wheel's monsters stand */
  await run(room, tickFn, 2000);
  const pts = (WHEEL_SPAWNS.frost && WHEEL_SPAWNS.frost.points) || [];
  const live = () => (room.monsters.wheel || []).filter((m) => m && m.alive);
  const kill = (m) => {
    ps.x = m.x + 20; ps.y = m.y; ps.lastMoveAt = undefined;
    m.dmgByPlayer = Object.create(null);
    m.dmgByPlayer.cg_kill = m.maxHp || 1;
    m.hp = 0;
    room._resolveMonsterKill('wheel', m, 'cg_kill', ps, 'melee');
  };
  const ms = live();
  check('5 (guard). the Wheel has monsters to kill', ms.length >= 3 && pts.length > 0, { n: ms.length });
  if (ms.length >= 3) {
    const w0 = state.writes.length;
    kill(ms[0]);
    const first = mine(state, 'cg_kill', w0);
    NOW += 5000;
    const w1 = state.writes.length;
    kill(ms[1]);
    const second = mine(state, 'cg_kill', w1);
    check(`5. a kill writes your record once (the first kill ${first.length} rows: ${Object.entries(byPrefix(first)).map((e) => e.join(' ')).join(', ')}; the next ${second.length})`,
      first.filter((k) => k.startsWith('rpg:')).length === 1 && first.length <= 2
      && second.filter((k) => k.startsWith('rpg:')).length === 1 && second.length <= 2, { first, second });
    /* v2.3.3305: ...and so does a melee kill that HEALS you.  The monster
       hurt you, so the kill's lifesteal refunds it: the heal used to run
       after the recipients loop and save the whole record a second time
       (every one of a fighter's melee kills in the cost audit) */
    {
      const m = live()[0];
      NOW += 5000;
      ps.maxHp = ps.maxHp || 100;
      ps.hp = Math.max(1, ps.maxHp - 50);
      ps.dmgFromMonster = { [m.id]: 40 };
      const hp0 = ps.hp;
      const w3 = state.writes.length;
      kill(m);
      const healed = mine(state, 'cg_kill', w3);
      const saved = state.store.get('rpg:cg_kill');
      check(`5c. a melee kill that heals you writes your record once too (${healed.filter((k) => k.startsWith('rpg:')).length}), the healed health in it`,
        ps.hp > hp0 && healed.filter((k) => k.startsWith('rpg:')).length === 1 && !!saved && saved.hp === ps.hp,
        { rows: healed, hp: [hp0, ps.hp, saved && saved.hp] });
    }
    /* the codex at most once a SAVE_MS: ten kills of a kind it knows inside it */
    const w2 = state.writes.length;
    let n = 0;
    for (const m of live().slice(0, 10)) { NOW += 1000; kill(m); n++; }
    const codex = mine(state, 'cg_kill', w2).filter((k) => k.startsWith('codex'));
    check(`5b. ${n} more kills inside a minute: the codex is written at most once a SAVE_MS (${codex.length}), and that is a minute`,
      codex.length <= Math.ceil((n * 1000) / CODEX.SAVE_MS) + 1 && CODEX.SAVE_MS >= 60000, { codex, SAVE_MS: CODEX.SAVE_MS });
  }
}

/* ── 6. gathering ──────────────────────────────────────────────────────── */
{
  const { room, tickFn, state } = await makeRoom();
  const p = await join(room, 'cg_gath');
  const ps = room.playerState.cg_gath;
  ps.inventory = Object.assign(ps.inventory || {}, { woodcutting_axe: 1, mining_pickaxe: 1, fishing_pole: 1 });
  await run(room, tickFn, 2000);
  const nodes = () => (room.nodes.wheel || []).filter((n) => n && n.alive && (n.tierLvl || 1) <= 1);
  check('6 (guard). the commons have nodes', nodes().length > 0, { n: (room.nodes.wheel || []).length });
  const w0 = state.writes.length;
  const MS = 6 * 60000;
  let since = 0, strikes = 0, node = null;
  const bagBefore = JSON.stringify(ps.inventory);
  await run(room, tickFn, MS, async (dt) => {
    since += dt;
    if (since < 2000) return;
    since = 0;
    if (!node || !node.alive) {
      const n = nodes()[0];
      if (!n) return;
      node = n;
      ps.x = n.x + 10; ps.y = n.y + 10; ps.lastMoveAt = undefined;
      await send(room, p, mv(ps.x, ps.y));
    }
    strikes++;
    await send(room, p, { type: 'node_strike', payload: { id: node.id, zone: 'wheel', accuracy: 'good' } });
  }, FAST);
  const w = mine(state, 'cg_gath', w0);
  const bot = w.filter((k) => k.startsWith('botstat:'));
  const rpg = w.filter((k) => k.startsWith('rpg:'));
  const lim = Math.ceil(MS / BOTFP.PUT_MIN_MS) + 1;
  check(`6. ${strikes} strikes in 6 minutes: the bot statistics written at most once a PUT_MIN_MS (${bot.length}, at most ${lim})`,
    bot.length <= lim && BOTFP.PUT_MIN_MS === 300000, { bot: bot.length, lim, PUT_MIN_MS: BOTFP.PUT_MIN_MS });
  check(`6b. ...your record at most once a strike (${rpg.length} for ${strikes}), and the harvests landed`,
    rpg.length <= strikes && rpg.length > 0 && JSON.stringify(ps.inventory) !== bagBefore, { rpg: rpg.length, strikes });
  /* and the statistics are not lost when you go: the close writes them */
  const w1 = state.writes.length;
  await room.webSocketClose(p.ws, 1000, 'bye', true);
  check('6c. ...and leaving writes them at once', mine(state, 'cg_gath', w1).some((k) => k.startsWith('botstat:')), mine(state, 'cg_gath', w1));
}

/* ── 7. joining ────────────────────────────────────────────────────────── */
{
  const { room, state } = await makeRoom();
  const w0 = state.writes.length;
  const p = await join(room, 'cg_new');
  const fresh = mine(state, 'cg_new', w0);
  check(`7. a new character's join and arrival in the Wheel: ${fresh.length} rows (${Object.entries(byPrefix(fresh)).map((e) => e.join(' ')).join(', ')}), at most 6`,
    fresh.length <= 6, fresh);
  await room.webSocketClose(p.ws, 1000, 'bye', true);
  NOW += 60000;
  const w1 = state.writes.length;
  await join(room, 'cg_new');
  const again = mine(state, 'cg_new', w1);
  check(`7b. coming back the same day: ${again.length} rows (${Object.entries(byPrefix(again)).map((e) => e.join(' ')).join(', ') || 'none'}), at most 4`,
    again.length <= 4, again);
}

/* ── 8. the room's own ─────────────────────────────────────────────────── */
{
  const { room, tickFn, state } = await makeRoom();
  const p = await join(room, 'cg_room');
  const w0 = state.writes.length;
  let since = 0;
  /* the player keeps a thumb on the game (a look with aw 0 every 30 s, as
     the quiet phone sends it), so the room stays awake the whole time */
  await run(room, tickFn, 10 * 60000, async (dt) => { since += dt; if (since >= 10000) { since = 0; await send(room, p, mv(ARRIVAL.x, ARRIVAL.y + ((NOW / 10000) % 2 ? 4 : 0))); } }, FAST);
  const theirs = state.writes.slice(w0).filter((k) => k.indexOf('cg_room') < 0);
  check(`8. the room's own writes in 10 minutes with one player in it: ${theirs.length} (${Object.entries(byPrefix(theirs)).map((e) => e.join(' ')).join(', ') || 'none'}), at most 5`,
    theirs.length <= 5, byPrefix(theirs));
}

/* ── 9. a tap a script can repeat ─────────────────────────────────────── */
/* v2.3.3293.  At the flood budget's ~110 messages a second, under its close
   line; the free plan's 100,000 rows a day are ~15 minutes of one of these. */
{
  const { room, state } = await makeRoom();
  const p = await join(room, 'cg_shield');
  const ps = room.playerState.cg_shield;
  ps.shield = { name: 'Training Shield', gearBase: 'shield_wood', tierMult: 1, tier: 'common' };
  ps.shieldStash = [];
  const sig = shieldSig(ps.shield);
  const w0 = state.writes.length;
  for (let i = 0; i < 200; i++) {
    NOW += 9;
    await send(room, p, { type: 'shield_wear', payload: i % 2 ? { sig } : { none: true } });
  }
  const rows = mine(state, 'cg_shield', w0).filter((k) => k.startsWith('rpg:')).length;
  check(`9a. a shield on and off 200 times in 2 s writes the record ${rows} times, at most PACE.RPG's burst (${PACE.RPG.BURST}) -- it wrote 200`,
    rows <= PACE.RPG.BURST, byPrefix(mine(state, 'cg_shield', w0)));
  check('9a. ...and the arm is still what the last report said (the starter shield)', !!ps.shield && shieldSig(ps.shield) === sig && ps.shieldStash.length === 0, { shield: ps.shield, bag: ps.shieldStash });
  check('9a. ...and the record is marked to be written (the regen drain or the close flush)', ps._regenDirty === true);
}
{
  const { room, state } = await makeRoom();
  const a = await join(room, 'cg_ta');
  const b = await join(room, 'cg_tb');
  await send(room, a, { type: 'trade2_open', payload: { target: 'cg_tb' } });
  await send(room, b, { type: 'trade2_open', payload: { target: 'cg_ta' } });
  const psA = room.playerState.cg_ta;
  psA.weaponStash = [{ type: 'sword', gearBase: 'iron', tier: 'common', tierMult: 1, name: 'A-blade' }];
  const staged = () => { const s = room._t2SessionFor('cg_ta'); return (s && s.weapons && s.weapons.cg_ta) || []; };
  const w0 = state.writes.length;
  let moved = 0;
  for (let i = 0; i < 50; i++) {
    NOW += 9;
    const before = staged().length;
    await send(room, a, { type: 'trade2_stage_weapon', payload: { stashIdx: 0 } });
    if (staged().length > before) moved++;
    NOW += 9;
    const w = staged()[0];
    if (w) {
      await send(room, a, { type: 'trade2_unstage_weapon', payload: { seq: w.seq } });
      if (!staged().length) moved++;
    }
  }
  const rows = mine(state, 'cg_ta', w0).length;
  check('9b. the trade window took a weapon in and out (guard: the lane works)', moved >= 2, moved);
  check(`9b. 100 stage / unstage messages in ~1 s move it ${moved} times, at most PACE.T2WPN's burst (${PACE.T2WPN.BURST})`, moved <= PACE.T2WPN.BURST, moved);
  check(`9b. ...and write ${rows} rows (${Object.entries(byPrefix(mine(state, 'cg_ta', w0))).map((e) => e.join(' ')).join(', ')}), at most 3 a move -- it wrote ~250`,
    rows <= 3 * PACE.T2WPN.BURST, byPrefix(mine(state, 'cg_ta', w0)));
  const inStash = (psA.weaponStash || []).length, inTrade = staged().length;
  check('9b. ...and the weapon is in exactly one place, the stash or the window', inStash + inTrade === 1, { inStash, inTrade });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all cost-guard checks passed');
process.exit(0);
