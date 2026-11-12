/* v2.3.4902: THE DEATH'S OWN NOTES, SAVED -- the life door's step 2b
 * (server/src/life.js LIFE_NOTE; spec docs/specs/life-door.md).
 *
 * The dying seconds lived in memory.  A join after them stands the player up
 * (v2.3.4374 joinstandup, unchanged); a join INSIDE them now comes back as
 * the same death, from the note the death saved (`life:<pid>`).
 *
 * Against a real GameRoom, its storage counting every row:
 *   1. a death writes its note beside its record, in the same run, one row
 *      more and no more (cost-guard §13's line: 4);
 *   2. a quick rejoin inside the five seconds: dying again, the card with the
 *      seconds left (and "your bag is safe" for a kept bag), no second death,
 *      no second wipe, then the ordinary respawn in town at full health;
 *   3. a rejoin after the five seconds: the stand-up, as before, no card;
 *   4. an ordinary join reads no note, and the respawn writes nothing more;
 *   5. `lifesave: false`: no note written, none read -- the stand-up;
 *   6. the pure note: a newer `v`, a past `until`, a hand-edited far one;
 *   7. a character restart deletes the note.
 */
import { GameRoom } from '../src/index.js';
import { LIFE_NOTE, lifeNoteOf, lifeNoteLeft } from '../src/life.js';
import { flagNameOk } from '../src/liveops.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

let NOW = 1_760_000_000_000;
Date.now = () => NOW;

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
function fakeWs() { return { out: [], send(s) { this.out.push(JSON.parse(s)); }, close() {} }; }
const ofType = (ws, t) => ws.out.filter((m) => m && m.type === t);
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }

async function makeRoom(flags) {
  const state = countingState();
  const room = new GameRoom(state, mockEnv);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return realSetInterval(fn, ms); };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  room._liveFlags = { ...(flags || {}) };
  /* the join reloads the flags; keep the test's */
  room._liveFlagsEnsure = async () => {};
  /* every death pile, counted */
  const piles = [];
  const realPile = room._spawnDeathPile.bind(room);
  room._spawnDeathPile = (ps, id, o) => { piles.push(id); return realPile(ps, id, o); };
  return { room, state, piles, tick: async (ms) => { const end = NOW + ms; while (NOW < end) { NOW += room.TICK_RATE; tickFn(); } } };
}
/* the phone's join: v2 unless `v1`, naming a place (the death spot) */
async function join(room, id, place, v1) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  const msg = { type: 'join', id, name: id, data: { ...(place || { x: 1000, y: 1000, z: 'town' }) } };
  if (!v1) msg.protocolVersion = 2;
  await room.webSocketMessage(ws, JSON.stringify(msg));
  return ws;
}
const lastState = (ws) => { const l = ofType(ws, 'player_state'); return l.length ? l[l.length - 1].payload : null; };
const full = (p) => !!p && p.hp === p.maxHp && p.maxHp > 0 && p.stamina === p.maxStamina && p.mana === p.maxMana;


/* a death, with the bag kept or not, then the app closed `closeAt` ms in */
async function dieAndClose(flags, keep, closeAt) {
  const r = await makeRoom(flags);
  const id = 'ln_' + Math.random().toString(36).slice(2, 8);
  const ws0 = await join(r.room, id);
  const ps0 = r.room.playerState[id];
  ps0.inventory = { ore_copper: 5, wood_pine: 3 };
  ps0.hp = 0;
  if (keep) r.room._dungeonKeepsBag = () => true;
  const w0 = r.state.writes.length;
  r.room._handlePlayerDeath(ps0, id, 'monster:x');
  const atDeath = r.state.writes.slice(w0).filter((k) => k.endsWith(id));
  delete r.room._dungeonKeepsBag;
  NOW += closeAt;
  await r.room.webSocketClose(ws0, 1001, 'gone', true);
  return { ...r, id, ws0, atDeath, bagAtDeath: { ...ps0.inventory } };
}

/* ── 1. the death writes its note, once, beside its record ── */
{
  const { state, id, atDeath, room } = await dieAndClose({}, false, 0);
  const note = state.store.get(LIFE_NOTE.PREFIX + id);
  check('1. a death writes its note (phase, until, keepsBag, cause)', note && note.v === LIFE_NOTE.V && note.phase === 'dying' && note.until > 0 && note.keepsBag === 0 && note.cause === 'monster:x', note);
  check('1. ...in the same run as its record: the note, then the record, one row more (' + atDeath.length + ' rows, cost-guard §13 holds at 4)',
    atDeath.includes(LIFE_NOTE.PREFIX + id) && atDeath.includes('rpg:' + id) && atDeath.indexOf(LIFE_NOTE.PREFIX + id) < atDeath.indexOf('rpg:' + id) && atDeath.length <= 4, atDeath);
  check('1. the room has the step-2b switch on by default, a name the flags route stores', room._lifeSaveOn() && flagNameOk('lifesave'));
}

/* ── 2. back inside the five seconds: the same death ── */
for (const keep of [true, false]) {
  const tag = keep ? 'a kept bag' : 'a lost bag';
  const { room, state, piles, tick, id, bagAtDeath } = await dieAndClose({}, keep, 1500);
  NOW += 1000;   /* 2.5 s after the death */
  const ws = await join(room, id, { x: 22000, y: 23000, z: 'wheel' });
  const ps = room.playerState[id];
  const died = ofType(ws, 'player_died');
  check('2. ' + tag + ': back as the same death -- dying, at 0', ps.dying && ps.dead && ps.life === 'dying' && ps.hp === 0, { dying: ps.dying, life: ps.life, hp: ps.hp });
  check('2. ' + tag + ': the card again, with the seconds it had left', died.length === 1 && died[0].payload.respawnInMs === 2500 && died[0].payload.cause === 'monster:x' && !!died[0].payload.keptBag === keep, died);
  const order = ws.out.map((m) => m.type);
  check('2. ' + tag + ': the card after the join\'s player_state', order.indexOf('player_state') >= 0 && order.indexOf('player_died') > order.indexOf('player_state'), order.filter((t) => t === 'player_state' || t === 'player_died' || t === 'state_sync'));
  const bagBack = { ...ps.inventory };
  await tick(2400);
  check('2. ' + tag + ': still dying until its own five seconds are up', ps.dying, { dying: ps.dying });
  await tick(1000);
  check('2. ' + tag + ': then the ordinary respawn -- in town, full health, told', !ps.dying && ps.hp === ps.maxHp && ps.z === 'town' && ofType(ws, 'player_respawned').length === 1, { dying: ps.dying, hp: ps.hp, z: ps.z });
  check('2. ' + tag + ': no second death, no pile, no second wipe (the bag as the death saved it)', ofType(ws, 'player_died').length === 1 && piles.length === (keep ? 0 : 1)
    && JSON.stringify(ps.inventory) === JSON.stringify(bagBack) && (keep ? ps.inventory.ore_copper === 5 : true), { piles, inv: ps.inventory, bagAtDeath });
  check('2. ' + tag + ': the respawn saved the record standing', state.store.get('rpg:' + id).hp === ps.maxHp);
  await tick(12000);
  check('2. ' + tag + ': and nothing after (no stuck-at-zero death)', ofType(ws, 'player_died').length === 1 && !ps.dying);
}

/* ── 3. back after the five seconds: the stand-up, as before ── */
{
  const { room, tick, id } = await dieAndClose({}, true, 2000);
  NOW += 4000;
  const ws = await join(room, id);
  const ps = room.playerState[id];
  check('3. after the five seconds: standing in town at full health at once, no card', !ps.dying && ps.hp === ps.maxHp && ps.z === 'town' && ofType(ws, 'player_died').length === 0, { dying: ps.dying, hp: ps.hp });
  await tick(8000);
  check('3. ...and no second death', ofType(ws, 'player_died').length === 0 && !ps.dying && ps.inventory.ore_copper === 5, ps.inventory);
}

/* ── 4. an ordinary join reads no note; the respawn writes nothing more ── */
{
  const { room, state, tick } = await makeRoom();
  const reads = [];
  const g = state.storage.get.bind(state.storage);
  state.storage.get = async (k) => { reads.push(k); return g(k); };
  const ws = await join(room, 'ln_live');
  check('4. a join with no record at 0 never reads a note', !reads.some((k) => String(k).startsWith(LIFE_NOTE.PREFIX)), reads.filter((k) => String(k).startsWith('life')));
  const ps = room.playerState.ln_live;
  ps.hp = 0;
  room._handlePlayerDeath(ps, 'ln_live', 'monster:y');
  await tick(4900);
  const w0 = state.writes.length;
  await tick(400);
  const atRespawn = state.writes.slice(w0).filter((k) => k.endsWith('ln_live'));
  check('4. the respawn writes its record and nothing for the note (' + atRespawn.join(', ') + ')', !ps.dying && atRespawn.length === 1 && atRespawn[0] === 'rpg:ln_live', atRespawn);
  await room.webSocketClose(ws, 1000, 'bye', true);
  /* a later join of that living record reads nothing either */
  reads.length = 0;
  await join(room, 'ln_live');
  check('4. ...nor a join of a living record', !reads.some((k) => String(k).startsWith(LIFE_NOTE.PREFIX)));
}

/* ── 5. lifesave: false -- no note, the stand-up ── */
{
  const { room, state, id } = await dieAndClose({ lifesave: false }, true, 1000);
  check('5. lifesave: false writes no note', !state.store.has(LIFE_NOTE.PREFIX + id));
  state.store.set(LIFE_NOTE.PREFIX + id, { v: 1, phase: 'dying', until: NOW + 3000, keepsBag: 1, cause: 'monster:x' });
  const ws = await join(room, id);
  const ps = room.playerState[id];
  check('5. ...and reads none: the join stands up as v2.3.4374 did', !ps.dying && ps.hp === ps.maxHp && ofType(ws, 'player_died').length === 0);
}

/* ── 6. the pure note ── */
{
  const now = 1000000;
  const n = lifeNoteOf({ respawnAt: now + 5000, _deathKeepsBag: true }, 'pvp:bp_x');
  check('6. lifeNoteOf: the shape a death saves', JSON.stringify(n) === JSON.stringify({ v: 1, phase: 'dying', until: now + 5000, keepsBag: 1, cause: 'pvp:bp_x' }), n);
  const l = lifeNoteLeft(n, now + 1000);
  check('6. lifeNoteLeft: the seconds left, the kept bag, the cause', l && l.ms === 4000 && l.until === now + 5000 && l.keptBag === 1 && l.cause === 'pvp:bp_x', l);
  check('6. a note whose time is up, a newer v, another phase, junk: nothing', lifeNoteLeft(n, now + 5000) === null && lifeNoteLeft({ ...n, v: 2 }, now) === null
    && lifeNoteLeft({ ...n, phase: 'alive' }, now) === null && lifeNoteLeft(null, now) === null && lifeNoteLeft('x', now) === null && lifeNoteLeft({ ...n, until: 'abc' }, now) === null);
  const far = lifeNoteLeft({ ...n, until: now + 9e9 }, now);
  check('6. a note far in the future (a clock gone back, a hand edit) is never longer than a death', far && far.ms === 5000 && far.until === now + 5000, far);
}

/* ── 7. a restart deletes it ── */
{
  const { room, state, id } = await dieAndClose({}, false, 0);
  await room._resetCharacterData(id);
  check('7. a character restart deletes the note', !state.store.has(LIFE_NOTE.PREFIX + id));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
