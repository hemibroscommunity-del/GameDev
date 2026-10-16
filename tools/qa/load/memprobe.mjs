/* ═══ v2.3.3271: THE ROOM'S MEMORY WITH REAL CHARACTERS (the split plan's Phase 0f) ═══
 *
 * docs/SERVER-SPLIT-PLAN.md 0f: "The room keeps about 22 KB per bot player
 * after a full collection (heapprobe.mjs, cap-120.md).  Real characters carry
 * bags, quests and pets.  Measure a real character and the world's memory at
 * 1,000, against Cloudflare's 128 MB."
 *
 * The real GameRoom in Node (V8, as the runtime's), every player's records put
 * in storage BEFORE they join, so the room's own join code loads them the way
 * it does a real player's -- the rpg record, the gear ledger, the pets record,
 * the codex -- and keeps in memory what it keeps.  Three kinds of character:
 *   bot     the load test's: a real phone's look, nothing on file;
 *   played  weeks of play: a bag of 40 kinds, 4 weapons and 19 pieces stashed,
 *           40 quests, 60 rows in the gear ledger, 15 pets, two drawings;
 *   heavy   everything at its cap: a bag of 120 kinds, 8 weapons and 32 of
 *           each stashed piece, 150 quests, 256 ledger rows, 120 pets and a
 *           full journal, all eight drawings.
 * Each run: N of one kind join (with `nj: 1`), go down into the Wheel (a third
 * about BroTown, as roster-bench.mjs), and the room ticks 400 times with 30% of
 * them walking and every player tracking now and then; then two full garbage
 * collections and the heap, less an empty room's.  Then the parts: the gear
 * ledgers, the pets records, the lag-compensation history and the sessions'
 * looks are let go one at a time, each measured.
 *
 *   node --expose-gc tools/qa/load/memprobe.mjs [N,N,... 120,500,1000] [kinds bot,played,heavy] [server dir]
 */
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

if (typeof globalThis.gc !== 'function') { console.error('run with: node --expose-gc tools/qa/load/memprobe.mjs'); process.exit(2); }
const SIZES = (process.argv[2] || '120,500,1000').split(',').map(Number).filter((n) => n > 0);
const KINDS = (process.argv[3] || 'bot,played,heavy').split(',');
const dir = process.argv[4] ? pathToFileURL(process.argv[4] + '/').href : new URL('../../../server/', import.meta.url).href;
const { GameRoom } = await import(dir + 'src/index.js');
const SAMPLE = JSON.parse(readFileSync(new URL('./track-sample.json', import.meta.url), 'utf8'));
const SAMPLE_LOOK = SAMPLE.data || SAMPLE;

let NOW = 1_800_000_000_000;
Date.now = () => NOW;
let seed = 5;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);

function mockState() {
  const store = new Map();
  return {
    store,
    storage: { get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); }, list: async () => new Map(), delete: async (k) => { store.delete(k); } },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const HEX = '0123456789abcdef';
const drawing = (i) => Array.from({ length: 256 }, (_, k) => HEX[(i * 7 + k * 3) % 16]).join('');
const DRAWINGS = ['sa', 'sb', 'pa', 'pb', 'ta', 'tf', 'tm', 'tb'];

/* a piece of gear as the worker mints it (armorforge.js / gearprov.js rows) */
function piece(i, slot) {
  const mats = ['copper', 'iron', 'black steel', 'titanium'];
  const m = mats[i % mats.length];
  return { name: (m[0].toUpperCase() + m.slice(1)) + (slot === 'armor' ? ' Torso' : slot === 'legsArmor' ? ' Greaves' : slot === 'shield' ? ' Shield' : slot === 'amulet' ? ' Amulet' : ' Bandana'),
    mat: m, slot, tierMult: 1 + (i % 4), quality: ['common', 'rare', 'elite', 'godly'][i % 4], gid: 'g' + i.toString(36) + 'x' + (i * 7919).toString(36),
    element1: i % 3 ? null : 'flame', gems: i % 5 ? [] : ['ruby'] };
}
function weapon(i) {
  return { type: ['greatsword', 'bow', 'staff'][i % 3], name: ['Iron Great Sword', 'Maple Bow', 'Cedar Staff'][i % 3], tier: 'rare', tierMult: 2 + (i % 3),
    element1: 'flame', element2: i % 2 ? 'frost' : null, isVolatile: false, gearBase: ['iron', 'ww_maple', 'ww_cedar'][i % 3], hardening: i % 4, quality: 'rare' };
}

function records(kind, i) {
  if (kind === 'bot') return null;
  const heavy = kind === 'heavy';
  const bag = heavy ? 120 : 40, quests = heavy ? 150 : 40, rows = heavy ? 256 : 60, pets = heavy ? 120 : 15;
  const stash = heavy ? 32 : null;
  const inventory = {};
  for (let k = 0; k < bag; k++) inventory['item_' + k + (k % 3 ? '_ore' : '_fish')] = 1 + (k * 7) % 250;
  const lifeSkills = { mining: { level: 22, xp: 31000 }, woodcutting: { level: 18, xp: 12000 }, fishing: { level: 25, xp: 40000 },
    cooking: { level: 12, xp: 9000 }, smithing: { level: 15, xp: 11000 }, woodworking: { level: 10, xp: 5000 }, farming: { level: 9, xp: 4000 },
    trapping: { level: 7, xp: 2000 }, firemaking: { level: 6, xp: 1500 }, gemcutting: { level: 5, xp: 900 },
    resources: {}, gems: {}, farmPlots: {}, dungeonClears: { cave: 4, foundry: 2 }, gathering: null, pets: [], activePet: null };
  for (let k = 0; k < 20; k++) lifeSkills.gems['gem_' + k] = k + 1;
  const _quests = {}, _questKills = {}, _questFlags = {};
  for (let k = 0; k < quests; k++) _quests['q_' + k] = { done: k % 4 !== 0, n: k % 7, at: NOW - k * 1000 };
  for (let k = 0; k < 40; k++) _questKills['kind_' + k] = k * 3;
  for (let k = 0; k < 30; k++) _questFlags['flag_' + k] = k;
  const gear = (slot, n) => Array.from({ length: n }, (_, k) => piece(i * 100 + k, slot));
  const rpg = {
    coins: 12345 + i, inventory, lifeSkills, goldNuggets: 40, goldBars: 6, gemsCaptured: true, level: 30, xp: 99999, unspentT2: 0, buildPointsThisLvl: 0,
    hp: 1600, maxHp: 1600, stamina: 300, maxStamina: 300, mana: 200, maxMana: 200, power: 20, vitality: 10, endurance: 5, agility: 5, mind: 5,
    _buffs: { food: { endsAt: NOW + 600000, mult: 1.2 } },
    weapon: weapon(i), rangedWeapon: weapon(i + 1), staffWeapon: weapon(i + 2), activeSlot: 'melee',
    armor: piece(i, 'armor'), legsArmor: piece(i, 'legsArmor'), shield: piece(i, 'shield'), amulet: piece(i, 'amulet'),
    weaponStash: Array.from({ length: heavy ? 8 : 4 }, (_, k) => weapon(i + k)),
    armorStash: gear('armor', stash || 6), legsStash: gear('legsArmor', stash || 4), shieldStash: gear('shield', stash || 3),
    gearStash: gear('gear', stash || 4), amuletStash: gear('amulet', stash || 2), gearStashCaptured: true,
    _quests, _questFlags, _questKills, achievementPoints: 120,
    _perfectHistory: Array.from({ length: 30 }, (_, k) => NOW - k * 5000), _cookHistory: Array.from({ length: 30 }, (_, k) => NOW - k * 7000),
    svKills: 4000, _v: 99,
  };
  const ledger = { _v: 1, seq: rows, forgotten: heavy ? 40 : 0,
    list: Array.from({ length: rows }, (_, k) => {
      const slot = ['armor', 'legsArmor', 'shield', 'amulet', 'gear'][k % 5];
      return { id: 'g' + i.toString(36) + '_' + k.toString(36), slot, src: ['forge', 'drop', 'quest', 'shop'][k % 4], at: NOW - k * 60000, p: piece(i * 1000 + k, slot) };
    }) };
  const kinds = ['snowling', 'gobling', 'mumling', 'pebbling', 'sparklet', 'finling', 'wisplet', 'lurkling', 'dewdrop'];
  const petList = Array.from({ length: pets }, (_, k) => ({ id: 'p_' + (i * 1000 + k).toString(36).padStart(8, '0'), kind: kinds[k % 9], stage: 1 + (k % 9),
    gold: k % 17 === 0, size: 1 + (k % 5) / 10, name: k % 3 ? 'Buddy ' + k : null, lv: 1 + (k % 30), xp: k * 37, at: NOW - k * 3600000,
    caughtBy: 'p' + i, owners: 1 + (k % 2), tradeAfter: NOW - 1 }));
  const journal = {};
  for (let k = 0; k < (heavy ? 81 : 18); k++) journal[kinds[k % 9] + '.' + (1 + (k % 9))] = { tries: k * 3, n: k % 4, gold: k % 2, big: 1.2 };
  const pets_ = { v: 1, cap: heavy ? 120 : 30, active: petList.length ? petList[0].id : null, moved: true, list: petList, journal };
  const codex = { v: 1, k: Object.fromEntries(kinds.map((k, n) => [k, [100 + n, n]])) };
  return { rpg, ledger, pets: pets_, codex };
}

function lookOf(kind, i) {
  const l = { ...SAMPLE_LOOK, name: 'Bro' + i, color: '#' + (0x100000 + i * 9973).toString(16).slice(-6) };
  delete l.x; delete l.y;
  const n = kind === 'heavy' ? 8 : kind === 'played' ? 2 : 0;
  for (let k = 0; k < n; k++) l[DRAWINGS[k]] = drawing(i + k);
  return l;
}

async function room(N, kind) {
  const st = mockState();
  const r = new GameRoom(st, mockEnv);
  r.MAX_PLAYERS = N + 20;
  r._liveFlags = {};
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { if (ms === r.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return realSetInterval(fn, ms); };
  r.startTickLoop();
  globalThis.setInterval = realSetInterval;
  const ps = [];
  for (let i = 0; i < N; i++) {
    const id = 'mp' + kind[0] + i;
    const rec = records(kind, i);
    if (rec) {
      st.store.set('rpg:' + id, rec.rpg);
      st.store.set('gear_prov:' + id, rec.ledger);
      st.store.set('pets:' + id, rec.pets);
      st.store.set('codex:' + id, rec.codex);
    }
    const look = lookOf(kind, i);
    const ws = { send() {}, close() {} };
    r.sessions.set(ws, { id: null, name: 'B', data: {}, rtt: 80, lastPing: 0, lastRecv: NOW, moveSig: '' });
    await r.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: look.name, protocolVersion: 2, pres: 2, nj: 1, data: { ...look, x: 1000, y: 1000, z: 'town' } }));
    ps.push({ id, ws, look });
  }
  const tick = () => { NOW += r.TICK_RATE; for (const [, s] of r.sessions) s.lastRecv = NOW; tickFn(); };
  tick();
  const ARRIVAL = { x: 21504, y: 21792 };
  /* down into the Wheel (which spawns its monsters), then each to its place */
  for (const p of ps) await r.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x: ARRIVAL.x, y: ARRIVAL.y, d: 'south', f: 'south', z: 'wheel', vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
  tick();
  const mons = r.monsters.wheel || [];
  for (const [n, p] of ps.entries()) {
    let x, y;
    if (n % 3 === 0 || !mons.length) { x = ARRIVAL.x + (rnd() - 0.5) * 2400; y = ARRIVAL.y + (rnd() - 0.5) * 2400; }
    else { const m = mons[(n * 7) % mons.length]; x = m.x + (rnd() - 0.5) * 400; y = m.y + (rnd() - 0.5) * 400; }
    const s = r.playerState[p.id];
    if (s) { s.x = x; s.y = y; }
    await r.webSocketMessage(p.ws, JSON.stringify({ type: 'track', data: p.look }));
    p.moving = rnd() < 0.3;
  }
  for (let t = 0; t < 400; t++) {
    for (const p of ps) {
      const s = r.playerState[p.id];
      if (!s) continue;
      s.hp = s.maxHp = Math.max(s.maxHp || 0, 1e6); s.dead = false; s.dying = false;
      if (p.moving) {
        const a = (p.a = (p.a === undefined ? rnd() * 6.28 : p.a + (rnd() - 0.5) * 0.2));
        s.x += Math.cos(a) * 4; s.y += Math.sin(a) * 4; s.vx = Math.cos(a) * 250; s.vy = Math.sin(a) * 250; s.lastMoveAt = NOW;
        r.dirtyPlayers.add(p.id);
      }
    }
    if (t % 50 === 0) for (const p of ps) if (rnd() < 0.3) await r.webSocketMessage(p.ws, JSON.stringify({ type: 'track', data: p.look }));
    tick();
  }
  /* the storage mock is not the room's memory (on Cloudflare it is SQLite,
     outside the heap): let it go before measuring */
  st.store.clear();
  return { r, ps };
}

function heap() { globalThis.gc(); globalThis.gc(); return process.memoryUsage().heapUsed; }
const MB = (b) => (b / 1048576).toFixed(1);
const KB = (b) => (b / 1024).toFixed(1);

const base = heap();
{ const e = await room(0, 'bot'); e.r.sessions.size; }   /* the code's own first-use costs, kept below */
const empty = heap();
console.log(`an empty room (after the code's first use): ${MB(empty - base)} MB over Node's own; every figure below is over it\n`);
console.log('kind     players   the room keeps   per player   gear ledgers   pets    lag history   looks   sessions\' held looks');
for (const kind of KINDS) {
  for (const N of SIZES) {
    const h0 = heap();
    let { r, ps } = await room(N, kind);
    const total = heap() - h0;
    /* the parts, let go one at a time */
    const part = (fn) => { const a = heap(); fn(); return a - heap(); };
    const held = part(() => { for (const [, s] of r.sessions) { if (s._looks) s._looks = new Set(); } });
    const ledgers = part(() => { if (r._gearProvMap) r._gearProvMap().clear(); });
    const pets = part(() => { if (r._petbookMap) r._petbookMap().clear(); });
    const hist = part(() => { for (const id of Object.keys(r.stateHistory || {})) r.stateHistory[id] = []; });
    const looks = part(() => { for (const [, s] of r.sessions) { s.data = {}; s._look = null; } for (const id of Object.keys(r.playerState)) { const q = r.playerState[id]; for (const k of DRAWINGS) delete q[k]; } });
    console.log(`${kind.padEnd(8)} ${String(N).padStart(7)}   ${MB(total).padStart(9)} MB   ${KB(total / N).padStart(7)} KB   ${MB(ledgers).padStart(9)} MB   ${MB(pets).padStart(5)} MB   ${MB(hist).padStart(8)} MB   ${MB(looks).padStart(5)} MB   ${MB(held).padStart(6)} MB`);
    r = null; ps = null;
  }
}
