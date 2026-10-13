/* ═══ v2.3.3215: EVENTS BY PLACE (the split plan's Phase 0d) ═══
 *
 * eventplace.js + tick.js eventsFor: an event that happens at a place goes to
 * the players it is about, to v2 phones within EVENT_PLACE.R of it in the
 * Wheel, and to phones in its zone elsewhere; every other event to everyone,
 * as before.  Checked here:
 *
 *   1. where each kind of event is placed: at the live monster, at the fields
 *      the room wrote, at the SENDER as the room has them for a relay (never
 *      where a payload says); who is always told; the types left room-wide
 *      (chat, emotes, kills, loot, a hit between players, what a phone keeps,
 *      anything unknown) and an event with no zone are not placed;
 *   2. who hears a placed event (eventHeardBy): the ones it is about anywhere,
 *      a phone with no zone everything, another zone nothing, the zone
 *      without `near`, R with it (at R yes, a pixel past no);
 *   3. a room: a fight in the Wheel reaches the phones near it and a far
 *      archer whose arrow hit, and not a phone in Brotown's square, one in
 *      today's town or one on another spoke; a v1 phone in the Wheel hears
 *      the Wheel; a dungeon's events stay in the dungeon; kills, chat, loot
 *      and unknown types still reach everyone; a socket that never joined
 *      hears everything;
 *   4. a phone near every event is sent exactly the events JSON it was sent
 *      before, in order, byte for byte;
 *   5. the two message builders agree byte for byte over a busy mixed room
 *      with placed events, chat mutes and every zone kind (tick-share's
 *      check, with this change in it);
 *   6. `eventplace: false` sends everything to everyone again;
 *   7. R is the Wheel's monster interest (INTEREST_OUT): a phone hears every
 *      monster it still knows about;
 *   8. every placed type is a type the room really sends (a server push site)
 *      or a phone really relays (an `event: '...'` in src/) -- a typo would
 *      place nothing and fail here.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { EVENT_PLACE, EVENT_PLACED_TYPES, placeOf, eventHeardBy } from '../src/eventplace.js';
import { WHEEL, WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_SPAWNS } from '../src/wheelspawns.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

function mockState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }

let seed = 32151013;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);

async function makeRoom() {
  const room = new GameRoom(mockState(), mockEnv);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => {
    if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; }
    return realSetInterval(fn, ms);
  };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  return { room, tickFn };
}
async function join(room, id, { pv = 2, z = 'town', x = 1000, y = 1000 } = {}) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  const msg = { type: 'join', id, name: id, data: { x, y, z } };
  if (pv === 2) msg.protocolVersion = 2;
  await room.webSocketMessage(ws, JSON.stringify(msg));
  return { ws, id, pv };
}
async function move(room, p, x, y, z) {
  p.x = x; p.y = y; p.z = z;
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x, y, d: 'south', f: 'south', z, vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
}
/* put a player exactly where a check needs them, in the room's own state */
function place(room, p, x, y, z) {
  p.x = x; p.y = y; p.z = z;
  const ps = room.playerState[p.id];
  ps.x = x; ps.y = y; ps.z = z;
}
function keepAlive(room, ps) {
  for (const p of ps) {
    const s = room.playerState[p.id];
    if (s) { s.hp = Math.max(s.hp || 0, 1e6); s.maxHp = Math.max(s.maxHp || 0, 1e6); s.dead = false; s.dying = false; }
  }
}
/* the events a phone was sent since `from` (an index into its ws.sent) */
function eventsOf(p, from = 0) {
  const out = [];
  for (let i = from; i < p.ws.sent.length; i++) {
    const s = p.ws.sent[i];
    if (!s.startsWith('{"type":"tick"')) continue;
    const d = JSON.parse(s);
    if (Array.isArray(d.events)) out.push(...d.events);
  }
  return out;
}
/* the Wheel's monsters, there once someone has gone down to it */
async function wheelMonsters(room, tickFn, p) {
  if (!room.monsters[WHEEL_ZONE]) { await move(room, p, ARRIVAL.x, ARRIVAL.y, WHEEL_ZONE); tickFn(); }
  return room.monsters[WHEEL_ZONE] || [];
}
const tagsOf = (evs) => evs.map((e) => (e.payload && e.payload.tag) || null).filter(Boolean);

const ARRIVAL = { x: 21504, y: 21792 };

/* ── 1. where each kind of event is placed ─────────────────────────────── */
{
  const monsters = { wheel: new Map([['wm-a', { id: 'wm-a', x: 5000, y: 6000 }]]) };
  const players = { pa: { z: 'wheel', x: 7000, y: 8000 }, pb: { z: 'town', x: 100, y: 200 } };
  const monsterOf = (z, id) => (monsters[z] && monsters[z].get(id)) || null;
  const playerOf = (id) => players[id] || null;
  const P = (ev) => placeOf(ev, monsterOf, playerOf);

  const hit = P({ type: 'monster_hit', payload: { monsterId: 'wm-a', zone: 'wheel', dmg: 5, attackerId: 'pa', hpPct: 0.5 } });
  check('1a a monster hit is placed at the live monster, the attacker always told',
    hit && hit.z === 'wheel' && hit.x === 5000 && hit.y === 6000 && JSON.stringify(hit.who) === '["pa"]', hit);
  const gone = P({ type: 'monster_hit', payload: { monsterId: 'wm-gone', zone: 'wheel', dmg: 5, attackerId: 'pa', hpPct: 0 } });
  check('1b a hit on a monster the room no longer has: its zone, no place (the whole zone hears it)',
    gone && gone.z === 'wheel' && gone.x === null && gone.y === null, gone);
  const atk = P({ type: 'monster_attack', payload: { monsterId: 'wm-gone', targetId: 'pb', zone: 'wheel', attackerX: 11, attackerY: 22 } });
  check('1c a monster attack: at the monster, else where the room says it struck from; its target always told',
    atk && atk.x === 11 && atk.y === 22 && JSON.stringify(atk.who) === '["pb"]', atk);
  const shot = P({ type: 'monster_projectile', payload: { monsterId: 'wm-gone', kind: 'snowball', zone: 'wheel', x: 31, y: 32, tx: 40, ty: 40 } });
  const bad = P({ type: 'monster_attack', payload: { monsterId: 'wm-a', targetId: 7, zone: 'wheel' } });
  check('1d a thrown ball from a monster the room no longer has: where it was thrown from; a target that is not an id is not told',
    shot && shot.x === 31 && shot.y === 32 && shot.who === null && bad && bad.who === null && bad.x === 5000, { shot, bad });
  const relay = P({ type: 'player_swing', from: 'pa', payload: { id: 'pa', x: 1, y: 1, ts: 1, wpn: 'sword', ang: 0 } });
  check('1e a relay is placed where the ROOM has its sender, never where its payload says',
    relay && relay.z === 'wheel' && relay.x === 7000 && relay.y === 8000 && JSON.stringify(relay.who) === '["pa"]', relay);
  check('1f a relay from nobody the room knows goes to everyone',
    P({ type: 'player_swing', from: 'ghost', payload: {} }) === null && P({ type: 'player_swing', payload: {} }) === null);
  const wind = P({ type: 'ability_windup', payload: { playerId: 'pa', kind: 'bash', zone: 'wheel', ms: 300, radius: 70 } });
  check('1g an ability wind-up is placed at its player', wind && wind.x === 7000 && wind.y === 8000 && wind.who[0] === 'pa', wind);
  const windAway = P({ type: 'ability_windup', payload: { playerId: 'pb', kind: 'bash', zone: 'wheel' } });
  check('1h ... but not at a player the room has in another zone (the zone, no place)', windAway && windAway.x === null, windAway);
  const roomWide = ['chat', 'emote', 'loot_drop', 'loot_claimed', 'loot_despawn', 'pvp_hit', 'pvp_confirmed', 'duel_end',
    'clan_war_kill', 'arena_match_result', 'jackpot_result', 'player_died_to_monster', 'stunned', 'some_new_type',
    /* happen at a place, but a phone keeps what they say (eventplace.js) */
    'monster_kill', 'player_shield', 'monster_transform', 'campfire_lit'];
  const placedAny = roomWide.filter((t) => P({ type: t, from: 'pa', payload: { zone: 'wheel', monsterId: 'wm-a', x: 1, y: 1, id: 'pa' } }) !== null);
  check('1i chat, emotes, loot, hits between players, duels, clans, the arena, the jackpot, unknown types and what a phone keeps (a kill, a shield, a transformed mummy, a campfire) stay room-wide',
    placedAny.length === 0, placedAny);
  check('1j a room event with no zone stays room-wide',
    P({ type: 'monster_hit', payload: { monsterId: 'wm-a', attackerId: 'pa' } }) === null);
  check('1k junk is never placed (and never throws)',
    [null, undefined, 3, 'x', {}, { type: 7 }, { type: 'monster_hit' }, { type: 'monster_hit', payload: 'x' },
      { type: '__proto__', payload: { zone: 'wheel' } }, { type: 'toString', payload: { zone: 'wheel' } }].every((e) => P(e) === null));
}

/* ── 2. who hears a placed event ───────────────────────────────────────── */
{
  const R = EVENT_PLACE.R;
  const pl = { z: 'wheel', x: 10000, y: 10000, who: ['pa'] };
  const at = (dx, dy, z = 'wheel') => ({ z, x: 10000 + dx, y: 10000 + dy });
  check('2a the ones it is about hear it anywhere', eventHeardBy(pl, 'pa', at(50000, 0, 'town'), true) && eventHeardBy(pl, 'pa', at(R * 5, 0), true));
  check('2b a phone with no player or no zone yet hears everything', eventHeardBy(pl, 'px', null, false) && eventHeardBy(pl, 'px', { x: 0, y: 0 }, true));
  check('2c another zone hears nothing', !eventHeardBy(pl, 'px', at(0, 0, 'town'), false) && !eventHeardBy(pl, 'px', at(0, 0, 'town'), true));
  check('2d the zone hears it when the phone is not told by distance (not `near`)', eventHeardBy(pl, 'px', at(R * 10, 0), false));
  check('2e near: at R yes, a pixel past no', eventHeardBy(pl, 'px', at(R, 0), true) && !eventHeardBy(pl, 'px', at(R + 1, 0), true)
    && eventHeardBy(pl, 'px', at(-R * 0.6, R * 0.8), true) && !eventHeardBy(pl, 'px', at(R * 0.6 + 1, R * 0.8 + 1), true));
  check('2f a place known only by its zone: the whole zone hears it', eventHeardBy({ z: 'wheel', x: null, y: null, who: null }, 'px', at(R * 9, 0), true));
}

/* ── 3. a room ─────────────────────────────────────────────────────────── */
{
  const { room, tickFn } = await makeRoom();
  const A = await join(room, 'pa');                 /* the fighter */
  const B = await join(room, 'pb');                 /* a phone near the fight */
  const C = await join(room, 'pc');                 /* in Brotown's square, paid by the kill */
  const D = await join(room, 'pd', { pv: 1 });      /* an old v1 phone in Brotown */
  const E = await join(room, 'pe');                 /* today's town (not the Wheel) */
  const G = await join(room, 'pg');                 /* on another spoke */
  const H = await join(room, 'ph');                 /* in a dungeon */
  const lurker = fakeWs();
  room.sessions.set(lurker, baseSession());
  const all = [A, B, C, D, E, G, H];
  const ms = await wheelMonsters(room, tickFn, A);
  /* the fight: by a monster on a spoke, far from Brotown */
  let mon = null;
  for (const m of ms) if (Math.hypot(m.x - ARRIVAL.x, m.y - ARRIVAL.y) > 9000) { mon = m; break; }
  const F = { x: mon.x + 60, y: mon.y };
  /* into the Wheel the way a phone goes (a zone change at the arrival), then
     each put where its check needs it: the room's movement bound refuses a
     jump across the map, as it should */
  for (const p of [A, B, C, D, G]) await move(room, p, ARRIVAL.x, ARRIVAL.y, WHEEL_ZONE);
  await move(room, E, 600, 600, 'town');
  await move(room, H, 500, 500, 'town');
  let other = null;
  for (const m of ms) if (Math.hypot(m.x - F.x, m.y - F.y) > 8000 && Math.hypot(m.x - ARRIVAL.x, m.y - ARRIVAL.y) > 6000) { other = m; break; }
  place(room, A, F.x, F.y, WHEEL_ZONE);
  place(room, B, F.x + 1500, F.y + 900, WHEEL_ZONE);
  place(room, D, ARRIVAL.x + 30, ARRIVAL.y, WHEEL_ZONE);
  place(room, G, other.x + 40, other.y, WHEEL_ZONE);
  place(room, H, 500, 500, 'dungeon_t1');
  keepAlive(room, all);
  tickFn();
  const mark = all.map((p) => p.ws.sent.length);
  const lurkMark = lurker.sent.length;

  room.eventBuffer.push({ type: 'monster_hit', payload: { monsterId: mon.id, zone: WHEEL_ZONE, dmg: 9, isCrit: false, attackerId: A.id, slot: 'melee', hpPct: 0.9, tag: 'hit' } });
  room.eventBuffer.push({ type: 'player_swing', from: A.id, payload: { id: A.id, ts: 1, wpn: 'sword', ang: 0, tag: 'swing' } });
  /* a relay whose payload claims Brotown's square: placed where the room has its sender */
  room.eventBuffer.push({ type: 'player_projectile', from: A.id, payload: { id: A.id, x: ARRIVAL.x, y: ARRIVAL.y, ang: 0, tag: 'arrow' } });
  /* a hit by C, whose stuck arrow chips the monster from Brotown: C is told */
  room.eventBuffer.push({ type: 'monster_hit', payload: { monsterId: mon.id, zone: WHEEL_ZONE, dmg: 3, isCrit: false, attackerId: C.id, slot: 'ranged', hpPct: 0.85, tag: 'farshot' } });
  room.eventBuffer.push({ type: 'monster_kill', payload: { monsterId: mon.id, zone: WHEEL_ZONE, killerId: A.id, x: mon.x, y: mon.y, recipients: [A.id, C.id], goldRecipients: [A.id], tag: 'kill' } });
  room.eventBuffer.push({ type: 'monster_attack', payload: { monsterId: other.id, targetId: G.id, zone: WHEEL_ZONE, dmg: 1, dmgTaken: 1, attackerX: other.x, attackerY: other.y, tag: 'otherfight' } });
  room.eventBuffer.push({ type: 'monster_hit', payload: { monsterId: 'dm-1', zone: 'dungeon_t1', dmg: 4, attackerId: H.id, hpPct: 0.5, tag: 'dungeon' } });
  room.eventBuffer.push({ type: 'chat', from: E.id, payload: { id: E.id, name: 'E', text: 'hi', color: '', tag: 'chat' } });
  room.eventBuffer.push({ type: 'loot_drop', payload: { pile: { id: 'l1', zone: WHEEL_ZONE, x: mon.x, y: mon.y }, tag: 'loot' } });
  room.eventBuffer.push({ type: 'brand_new_thing', from: A.id, payload: { tag: 'unknown' } });
  keepAlive(room, all);
  tickFn();

  const got = (p, i) => tagsOf(eventsOf(p, mark[i]));
  const want = {
    A: ['hit', 'swing', 'arrow', 'farshot', 'kill', 'chat', 'loot', 'unknown'],
    B: ['hit', 'swing', 'arrow', 'farshot', 'kill', 'chat', 'loot', 'unknown'],
    C: ['farshot', 'kill', 'chat', 'loot', 'unknown'],
    D: ['hit', 'swing', 'arrow', 'farshot', 'kill', 'otherfight', 'chat', 'loot', 'unknown'],
    E: ['kill', 'chat', 'loot', 'unknown'],
    G: ['kill', 'otherfight', 'chat', 'loot', 'unknown'],
    H: ['kill', 'dungeon', 'chat', 'loot', 'unknown'],
  };
  const names = ['A', 'B', 'C', 'D', 'E', 'G', 'H'];
  names.forEach((n, i) => {
    const g = got(all[i], i);
    check(`3${'abcdefg'[i]} ${{
      A: 'the fighter hears all of their own fight',
      B: 'a phone near the fight hears all of it',
      C: "a phone in Brotown's square hears only its own far arrow's hit (and the room-wide ones)",
      D: 'an old v1 phone in the Wheel hears the whole Wheel (its tick is shared)',
      E: "a phone in today's town hears nothing of the Wheel's fights or the dungeon",
      G: 'a phone on another spoke hears its own fight, not the first one',
      H: 'a dungeon keeps its events to itself',
    }[n]}`, JSON.stringify(g) === JSON.stringify(want[n]), { got: g, want: want[n] });
  });
  check('3h a socket that never joined hears everything, as before',
    JSON.stringify(tagsOf(eventsOf({ ws: lurker }, lurkMark))) === JSON.stringify(['hit', 'swing', 'arrow', 'farshot', 'kill', 'otherfight', 'dungeon', 'chat', 'loot', 'unknown']),
    tagsOf(eventsOf({ ws: lurker }, lurkMark)));
  {
    /* two v2 phones in today's town share their tick, unless one of them is
       owed an event from the Wheel (their arrow's hit, landing just after they
       left): then theirs is their own */
    const E2 = await join(room, 'pe2');
    await move(room, E2, 610, 600, 'town');
    keepAlive(room, [...all, E2]);
    tickFn();
    const me = E.ws.sent.length, me2 = E2.ws.sent.length;
    room.eventBuffer.push({ type: 'monster_hit', payload: { monsterId: mon.id, zone: WHEEL_ZONE, dmg: 2, attackerId: E.id, slot: 'ranged', hpPct: 0.8, tag: 'paysE' } });
    room.eventBuffer.push({ type: 'chat', from: A.id, payload: { id: A.id, text: 'x', tag: 'chat2' } });
    keepAlive(room, [...all, E2]);
    tickFn();
    const ge = tagsOf(eventsOf(E, me)), ge2 = tagsOf(eventsOf(E2, me2));
    check('3i two phones in today\'s town: the one whose arrow hit a Wheel monster gets the hit, the other does not',
      JSON.stringify(ge) === '["paysE","chat2"]' && JSON.stringify(ge2) === '["chat2"]', { E: ge, E2: ge2 });
  }

  /* ── 6. eventplace: false ── */
  room._liveFlags = Object.assign({}, room._liveFlags || {}, { eventplace: false });
  const mark2 = all.map((p) => p.ws.sent.length);
  room.eventBuffer.push({ type: 'monster_hit', payload: { monsterId: mon.id, zone: WHEEL_ZONE, dmg: 9, attackerId: A.id, hpPct: 0.8, tag: 'hit2' } });
  room.eventBuffer.push({ type: 'player_swing', from: A.id, payload: { id: A.id, tag: 'swing2' } });
  keepAlive(room, all);
  tickFn();
  const everyoneGot = all.every((p, i) => JSON.stringify(tagsOf(eventsOf(p, mark2[i]))) === '["hit2","swing2"]');
  check('6a eventplace:false sends every event to everyone again, from the next tick', everyoneGot,
    all.map((p, i) => tagsOf(eventsOf(p, mark2[i]))));
  room._liveFlags = Object.assign({}, room._liveFlags, { eventplace: true });
}

/* ── 4. a phone near every event: the same events JSON, byte for byte ──── */
{
  const { room, tickFn } = await makeRoom();
  const A = await join(room, 'qa'), B = await join(room, 'qb'), C = await join(room, 'qc');
  const ms = await wheelMonsters(room, tickFn, A);
  let mon = null;
  for (const m of ms) if (Math.hypot(m.x - ARRIVAL.x, m.y - ARRIVAL.y) > 9000) { mon = m; break; }
  for (const p of [B, C]) await move(room, p, ARRIVAL.x, ARRIVAL.y, WHEEL_ZONE);
  place(room, A, mon.x + 40, mon.y, WHEEL_ZONE);
  place(room, B, mon.x - 300, mon.y + 200, WHEEL_ZONE);
  /* a socket that never joined is sent every event of every tick: the stream
     as it was before this change */
  const lurker = fakeWs();
  room.sessions.set(lurker, baseSession());
  keepAlive(room, [A, B, C]);
  tickFn();
  const evPart = (s) => {
    const k = s.indexOf(',"events":');
    if (k < 0) return null;
    return JSON.stringify(JSON.parse(s).events);
  };
  let same = 0, ticks = 0, firstDiff = null, cFewer = 0, mine = 0;
  for (let t = 0; t < 40; t++) {
    const pushed = [
      { type: 'monster_hit', payload: { monsterId: mon.id, zone: WHEEL_ZONE, dmg: t, isCrit: t % 3 === 0, attackerId: A.id, slot: 'melee', hpPct: 0.5, n: t } },
      { type: 'player_swing', from: A.id, payload: { id: A.id, ts: t, wpn: 'sword', ang: t / 10 } },
      { type: 'chat', from: C.id, payload: { id: C.id, name: 'C', text: 'é "quoted" \\ ' + t, color: '' } },
      { type: 'monster_ability', payload: { monsterId: mon.id, zone: WHEEL_ZONE, ability: 'slam', phase: 'wind', ms: 400, radius: 90, ax: mon.x, ay: mon.y } },
    ];
    const mb = B.ws.sent.length, mc = C.ws.sent.length, ml = lurker.sent.length;
    for (const e of pushed) room.eventBuffer.push(e);
    keepAlive(room, [A, B, C]);
    tickFn();
    const bt = B.ws.sent.slice(mb).filter((x) => x.startsWith('{"type":"tick"'));
    const lt = lurker.sent.slice(ml).filter((x) => x.startsWith('{"type":"tick"'));
    for (let i = 0; i < Math.max(bt.length, lt.length); i++) {
      ticks++;
      const b = bt[i] || '', l = lt[i] || '';
      /* the raw `"events":[...]` text of each, cut from the message itself */
      const cut = (x) => { const k = x.indexOf(',"events":'); if (k < 0) return null; const e = evPart(x); return x.indexOf(',"events":' + e, k) === k ? e : '(not canonical)'; };
      const eb = cut(b), el = cut(l);
      if (eb !== null && eb === el) { same++; if (pushed.every((e) => eb.indexOf(JSON.stringify(e)) !== -1)) mine++; }
      else if (!firstDiff) firstDiff = { b: (eb || '').slice(0, 300), l: (el || '').slice(0, 300) };
    }
    const cEv = eventsOf(C, mc);
    if (cEv.length < pushed.length && cEv.some((e) => e.type === 'chat')) cFewer++;
  }
  check('4a a phone near every event is sent the very events JSON a phone hearing everything is, tick by tick, byte for byte',
    ticks >= 40 && same === ticks && mine === 40, { ticks, same, mine, firstDiff });
  check('4b ... while a phone far from them gets only the chat (40 ticks)', cFewer === 40, cFewer);
}

/* ── 5. the two builders agree byte for byte, events placed ─────────────── */
{
  const { room, tickFn } = await makeRoom();
  const LANDS = Object.keys(WHEEL_SPAWNS);
  const players = [];
  for (let i = 0; i < 24; i++) {
    const p = await join(room, 'vs' + i, { pv: 2 });
    const onSpoke = i >= 12;
    const pt = (WHEEL_SPAWNS[LANDS[i % LANDS.length]].points || [])[0] || [ARRIVAL.x, ARRIVAL.y];
    p.home = onSpoke ? { x: pt[0], y: pt[1] } : ARRIVAL;
    p.r = onSpoke ? 900 : 1200;
    await move(room, p, p.home.x + (rnd() - 0.5) * 200, p.home.y + (rnd() - 0.5) * 200, WHEEL_ZONE);
    players.push(p);
  }
  { const p = await join(room, 'vsv1', { pv: 1 }); p.home = ARRIVAL; p.r = 600; await move(room, p, ARRIVAL.x, ARRIVAL.y, WHEEL_ZONE); players.push(p); }
  for (const [id, pv, z] of [['vst1', 2, 'town'], ['vst2', 1, 'town'], ['vsm1', 2, 'meadow']]) {
    const p = await join(room, id, { pv, z, x: 600, y: 600 }); p.home = { x: 600, y: 600 }; p.r = 300;
    await move(room, p, 600, 600, z); players.push(p);
  }
  const lurker = fakeWs();
  room.sessions.set(lurker, baseSession());
  const speaker = players[0].id;
  room.chatMutes = new Map([[players[13].id, new Set([speaker])], [players[1].id, new Set([speaker])]]);
  const ms = await wheelMonsters(room, tickFn, players[0]);
  const verify = { checked: 0, mismatched: 0, first: null };
  room._tickShareVerify = verify;
  const placedSeen = new Set();
  for (let t = 0; t < 200; t++) {
    for (let k = 0; k < players.length; k++) {
      const p = players[k];
      if ((t + k) % 2) continue;
      let x = p.x + (rnd() - 0.5) * 14, y = p.y + (rnd() - 0.5) * 14;
      if (Math.hypot(x - p.home.x, y - p.home.y) > p.r) { x = p.home.x; y = p.home.y; }
      await move(room, p, x, y, p.z);
    }
    const a = players[(t * 7) % 24], m = ms[(t * 13) % ms.length];
    room.eventBuffer.push({ type: 'monster_hit', payload: { monsterId: m.id, zone: WHEEL_ZONE, dmg: t, attackerId: a.id, hpPct: 0.5 } });
    room.eventBuffer.push({ type: 'player_projectile', from: a.id, payload: { id: a.id, x: 0, y: 0, ang: 1 } });
    if (t % 3 === 0) room.eventBuffer.push({ type: 'monster_kill', payload: { monsterId: m.id, zone: WHEEL_ZONE, killerId: a.id, x: m.x, y: m.y, recipients: [a.id, players[(t * 5) % players.length].id], goldRecipients: [] } });
    if (t % 5 === 0) room.eventBuffer.push({ type: 'chat', from: speaker, payload: { id: speaker, text: 'l' + t } });
    if (t % 4 === 0) room.eventBuffer.push({ type: 'monster_hit', payload: { monsterId: 'mm', zone: 'meadow', dmg: 1, attackerId: 'vsm1', hpPct: 0.2 } });
    if (t % 9 === 0) room.eventBuffer.push({ type: 'loot_despawn', payload: { lootId: 'x' + t, zone: WHEEL_ZONE } });
    const places = room._eventPlaces(room.eventBuffer.slice());
    if (places) for (const pl of places) if (pl) placedSeen.add(pl.z + (pl.x === null ? ':zone' : ':xy'));
    keepAlive(room, players);
    tickFn();
  }
  check('5a every message built from shared parts equals the old build, byte for byte, events placed', verify.mismatched === 0, verify.first);
  check('5b ... over thousands of messages, with placed events in the Wheel and elsewhere',
    verify.checked > 3000 && placedSeen.has('wheel:xy') && placedSeen.has('meadow:zone'), { checked: verify.checked, placed: [...placedSeen] });
  const tickMsgs = players.flatMap((p) => p.ws.sent).filter((s) => s.startsWith('{"type":"tick"'));
  let bad = 0;
  for (const s of tickMsgs) { try { const d = JSON.parse(s); if (!d || d.type !== 'tick') bad++; } catch { bad++; } }
  check('5c every tick message is valid JSON', tickMsgs.length > 2000 && bad === 0, { n: tickMsgs.length, bad });
  const muted = players[13];
  check('5d a muter never gets the muted speaker\'s chat, placed events or not',
    eventsOf(muted).every((e) => !(e.type === 'chat' && e.from === speaker)) && eventsOf(players[2]).some((e) => e.type === 'chat'));
}

/* ── 7. R is the Wheel's monster interest ──────────────────────────────── */
check('7a EVENT_PLACE.R is wheelzone.js INTEREST_OUT: a phone hears every monster it still knows about',
  EVENT_PLACE.R === WHEEL.INTEREST_OUT, { R: EVENT_PLACE.R, out: WHEEL.INTEREST_OUT });

/* ── 8. every placed type is real ──────────────────────────────────────── */
{
  const srv = new URL('../src/', import.meta.url);
  const client = new URL('../../src/', import.meta.url);
  const serverText = readdirSync(srv).filter((f) => f.endsWith('.js')).map((f) => readFileSync(new URL(f, srv), 'utf8')).join('\n');
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory()
    ? walk(new URL(d.name + '/', dir))
    : (/\.(js|jsx)$/.test(d.name) ? [readFileSync(new URL(d.name, dir), 'utf8')] : [])));
  const clientText = walk(client).join('\n');
  const missing = EVENT_PLACED_TYPES.filter((t) => !new RegExp(`type:\\s*'${t}'`).test(serverText) && !new RegExp(`event:\\s*'${t}'`).test(clientText));
  check('8a every placed type is pushed by the room or relayed by a phone (no typo places nothing)', missing.length === 0, missing);
}

console.log(`\nevent-place: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
process.exit(0);
