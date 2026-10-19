/* Achievements -- v2.3.3484 (server/src/achievements.js; spec
 * docs/specs/achievements.md).  The owner: "Achievement points are something
 * I'd like in the game. You get it by completing the game", then "Go
 * recommended on everything".
 *
 *   1. CAPS AND THE FIRST LOOK: caps.achievements; achv_state at join, after
 *      state_sync, empty for a new character.
 *   2. A KILL: the first kill is First Blood (+10 AP, the record and the rpg
 *      blob written in ONE synchronous run), told as `new`; the next kill
 *      writes no achievements row; Natural One on a killing blow's roll of 1,
 *      not on anyone else's.
 *   3. EACH PLACE: a combat level (10, 50, 100), a Wheel dungeon (never the
 *      Workshop) and Delver, a catch (golden, golden and big), an order, a
 *      duel won by the kill (not a forfeit, not an arena match), a No man's
 *      land kill, the story's ends (and not with one missing), a piece off a
 *      kill (the Iron Great Sword, elite, godly), a forged piece, H5, the
 *      spin's house limit, the codex's nine kinds and past level 20.
 *   4. ONCE: every achievement pays its points once a character; a counting
 *      row counts again and pays nothing.
 *   5. THE ARENA: the first crown pays the Gladiator achievement's 500 by the
 *      mail (its own credit beside the gold), the champion box says 500; a
 *      second crown pays gold, counts 2 and says no points; a champion away is
 *      paid at the next join (the record loads before the mail); a record that
 *      cannot be read keeps the achievement queued while the gold lands; a
 *      v2.3.3481 crown still in a mailbox goes through the achievement.
 *   6. LOCKED: a newer worker's record is never paid into or overwritten, nor
 *      a record whose read failed; the phone is told `unavailable`.
 *   7. THE KILL SWITCH: `achievements: false` -- no cap, no grant, no sweep;
 *      what was earned stays.
 *   8. WHAT YOU HAD BEFORE: the join's sweep grants a kill, a combat level,
 *      the story, the codex and pets quietly (`retro`), once.
 *   9. THE STAMP: the AP on the inspect card's blob is the worker's, at the
 *      join and on a track, whatever the phone said.
 *  10. THE LEVER, A RESTART, normalizeAchv, and the list's tiers and counts.
 */
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { ACHV, ACHV_KEY, achvAp, normalizeAchv } from '../src/achievements.js';
import { CODEX } from '../src/codex.js';
import { HARDEN } from '../src/hardening.js';
import { PETBOOK } from '../src/petbook.js';

function makeState() {
  const store = new Map();
  let failGet = null;
  return {
    storage: {
      get: async (k) => { if (failGet && failGet(k)) throw new Error('read failed'); return store.get(k); },
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async (opts) => {
        const out = new Map();
        for (const k of [...store.keys()].filter((x) => !opts?.prefix || x.startsWith(opts.prefix)).sort()) out.set(k, store.get(k));
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
    failReads(fn) { failGet = fn; },
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const msgsOfType = (ws, type) => ws.sent.filter((m) => m.type === type);
const last = (ws, type) => { const r = msgsOfType(ws, type); return r.length ? r[r.length - 1].payload : null; };

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail).slice(0, 700)); }
}

let state = makeState();
let room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, data) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'C', phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town', ...(data || {}) } }));
  return room.playerState[id];
}
const flush = () => new Promise((r) => setTimeout(r, 0));
const rec = (id) => state._store.get(ACHV_KEY(id));
const apOf = (id) => room.playerState[id] ? room.playerState[id].achievementPoints || 0 : null;

const wheel = room._ensureZoneMonsters(WHEEL_ZONE);
function standBy(ps, m) { ps.z = WHEEL_ZONE; ps.x = m.x + 60; ps.y = m.y; ps.dead = false; ps.dying = false; ps.disconnected = false; }
function revive(m) {
  m.alive = true; m.hp = m.maxHp; m.respawnAt = 0;
  m._burstDone = true; m._burstUntil = 0; m._burstKiller = null; m._armedBy = null; m._trapJudgeAt = 0;
  m.dmgByPlayer = Object.create(null);
}
function kill(m, contribs, killerId) {
  revive(m);
  for (const [pid, d] of Object.entries(contribs)) m.dmgByPlayer[pid] = d;
  m.hp = 0;
  room._resolveMonsterKill(WHEEL_ZONE, m, killerId, room.playerState[killerId], 'melee');
}
const aMonster = () => wheel.find((m) => m.home === 'frost' && !m.tier) || wheel[0];

/* ── 0. the list ─────────────────────────────────────────────────────────── */
{
  const ids = ACHV.LIST.map((a) => a.id);
  check('0a 23 achievements, ids unique', ids.length === 23 && new Set(ids).size === 23, ids);
  const byTier = {};
  for (const a of ACHV.LIST) byTier[a.tier] = (byTier[a.tier] || 0) + 1;
  check('0b the tiers: 7 common, 9 rare, the arena, 6 super-rare', byTier.common === 7 && byTier.rare === 9 && byTier.arena === 1 && byTier.superrare === 6, byTier);
  check('0c the points: common 10, rare 100, arena 500, super-rare 1,000 (the owner\'s "Go recommended")',
    ACHV.TIER_AP.common === 10 && ACHV.TIER_AP.rare === 100 && ACHV.TIER_AP.arena === 500 && ACHV.TIER_AP.superrare === 1000 && achvAp('gladiator') === 500);
  const total = ACHV.LIST.reduce((n, a) => n + ACHV.TIER_AP[a.tier], 0);
  check('0d every achievement is worth 7,470 AP in all', total === 7470, total);
  check('0e the story ends are the last quest of every live chain', ['tut_4', 'life_2', 'beast_4', 'mayor_3'].every((q) => ACHV.STORY_ENDS.includes(q)) && ACHV.STORY_ENDS.length === 4, ACHV.STORY_ENDS);
  check('0f Delver needs the Wheel\'s three dungeons', ACHV.DUNGEONS.length === 3 && ['hollows', 'thunder', 'sky'].every((d) => ACHV.DUNGEONS.includes(d)), ACHV.DUNGEONS);
}

/* ── 1. CAPS AND THE FIRST LOOK ────────────────────────────────────────────── */
const wsA = fakeWs('A');
const A = await join(wsA, 'bp_av_a');
{
  const sync = wsA.sent.find((m) => m.type === 'state_sync');
  check('1a caps.achievements advertised', sync && sync.caps && sync.caps.achievements === true, sync && sync.caps && sync.caps.achievements);
  const st = last(wsA, 'achv_state');
  check('1b achv_state at join: a new character has none', !!st && st.v === ACHV.V && Object.keys(st.got).length === 0 && st.ap === 0 && !st.retro, st);
  const order = wsA.sent.map((m) => m.type);
  check('1c ...sent after state_sync and the codex', order.indexOf('achv_state') > order.indexOf('state_sync') && order.indexOf('achv_state') > order.indexOf('codex_state'), order.slice(-6));
}

/* ── 2. A KILL ─────────────────────────────────────────────────────────────── */
{
  const m = aMonster();
  standBy(A, m);
  const ap0 = apOf('bp_av_a');
  kill(m, { bp_av_a: 50 }, 'bp_av_a');
  const st = last(wsA, 'achv_state');
  check('2a the first kill is First Blood: +10 AP, told as new', apOf('bp_av_a') === ap0 + 10 && st && Array.isArray(st.new) && st.new[0] === 'first_blood' && st.got.first_blood > 0, { ap: apOf('bp_av_a'), st });
  check('2b ...the record has it', !!rec('bp_av_a') && rec('bp_av_a').got.first_blood > 0, rec('bp_av_a'));
  const writesBefore = [...state._store.keys()].length;
  const achvBefore = JSON.stringify(rec('bp_av_a'));
  let achvPuts = 0;
  const realPut = state.storage.put;
  state.storage.put = async (k, v) => { if (k === ACHV_KEY('bp_av_a')) achvPuts++; return realPut(k, v); };
  kill(m, { bp_av_a: 50 }, 'bp_av_a');
  state.storage.put = realPut;
  check('2c the next kill writes no achievements row and pays nothing more', achvPuts === 0 && apOf('bp_av_a') === ap0 + 10 && JSON.stringify(rec('bp_av_a')) === achvBefore, { achvPuts, ap: apOf('bp_av_a'), writesBefore });
  /* Natural One: the kill roll's 1, on the killing blow only */
  const wsB = fakeWs('B');
  const B = await join(wsB, 'bp_av_b');
  standBy(B, m);
  if (!(room._killRollForced instanceof Map)) room._killRollForced = new Map();
  room._killRollForced.set('bp_av_b', 1);
  kill(m, { bp_av_a: 50, bp_av_b: 50 }, 'bp_av_a');
  check('2d a roll of 1 forced for B, but A struck the blow: no Natural One for either',
    !rec('bp_av_a').got.natural_one && !(rec('bp_av_b') && rec('bp_av_b').got && rec('bp_av_b').got.natural_one), { a: rec('bp_av_a'), b: rec('bp_av_b') });
  room._killRollForced.set('bp_av_a', 1);
  const apA = apOf('bp_av_a');
  kill(m, { bp_av_a: 50 }, 'bp_av_a');
  check('2e the killing blow\'s roll of 1 is Natural One (+100 AP, counted)', rec('bp_av_a').got.natural_one > 0 && rec('bp_av_a').n.natural_one === 1 && apOf('bp_av_a') === apA + 100, { rec: rec('bp_av_a'), ap: apOf('bp_av_a') });
  room._killRollForced.set('bp_av_a', 1);
  kill(m, { bp_av_a: 50 }, 'bp_av_a');
  check('2f a second Natural One counts 2 and pays nothing', rec('bp_av_a').n.natural_one === 2 && apOf('bp_av_a') === apA + 100, { n: rec('bp_av_a').n, ap: apOf('bp_av_a') });
}

/* ── 2g. ONE SYNCHRONOUS RUN: the record's write and the save of its points
   are issued together -- both in storage before anything is awaited ── */
{
  const wsS = fakeWs('S');
  const S = await join(wsS, 'bp_av_sync');
  await flush();
  state._store.delete(ACHV_KEY('bp_av_sync'));
  state._store.delete('rpg:bp_av_sync');
  room._achvGrant('bp_av_sync', S, 'nml_kill', { save: true });   /* no await */
  const r = state._store.get(ACHV_KEY('bp_av_sync')), p = state._store.get('rpg:bp_av_sync');
  check('2g a grant with its save: the record and the points both reach storage in the same synchronous run',
    !!r && r.got.nml_kill > 0 && !!p && p.achievementPoints === 10, { r, p: p && p.achievementPoints });
}

/* ── 3. EACH PLACE ─────────────────────────────────────────────────────────── */
const wsC = fakeWs('C');
const C = await join(wsC, 'bp_av_c');
const gotC = (id) => !!(rec('bp_av_c') && rec('bp_av_c').got && rec('bp_av_c').got[id]);
{
  /* combat levels, through the real XP path */
  const ap0 = apOf('bp_av_c');
  C.prog3.sk.sword.level = 9; C.prog3.sk.sword.xp = 0;
  room._prog3AwardXp('bp_av_c', C, 'sword', 100000, { flat: true });
  check('3a a combat skill to 10 is Blooded (+10)', gotC('combat_10') && !gotC('combat_50'), rec('bp_av_c'));
  C.prog3.sk.bow.level = 99; C.prog3.sk.bow.xp = 0;
  room._prog3AwardXp('bp_av_c', C, 'bow', 1e12, { flat: true });
  check('3b another skill to 100 is Veteran and Centurion too (the highest of the three)', gotC('combat_50') && gotC('combat_100'), rec('bp_av_c'));
  check('3c ...10 + 100 + 1,000 AP', apOf('bp_av_c') === ap0 + 1110, apOf('bp_av_c') - ap0);

  /* a Wheel dungeon cleared, through the real clear */
  const inst = (home) => ({ zone: 'dungeon:t', state: 'running', cfg: { home, waves: 3, hasBoss: true, monsterLevel: 30 } });
  room._dungeonComplete(inst(undefined), ['bp_av_c'], Date.now());
  check('3d a Workshop run is no dungeon of the Wheel: nothing', !gotC('first_dungeon'), rec('bp_av_c'));
  room._dungeonComplete(inst('hollows'), ['bp_av_c'], Date.now());
  check('3e the Great Cave cleared: Into the Dark, counted 1, the cave remembered', gotC('first_dungeon') && rec('bp_av_c').n.first_dungeon === 1 && rec('bp_av_c').dg.hollows === 1 && !gotC('dungeons_all'), rec('bp_av_c'));
  room._dungeonComplete(inst('thunder'), ['bp_av_c'], Date.now());
  room._dungeonComplete(inst('hollows'), ['bp_av_c'], Date.now());
  check('3f two of three: no Delver yet (the cave twice counts once)', !gotC('dungeons_all') && rec('bp_av_c').n.first_dungeon === 3, rec('bp_av_c'));
  room._dungeonComplete(inst('sky'), ['bp_av_c'], Date.now());
  check('3g all three: Delver', gotC('dungeons_all'), rec('bp_av_c'));

  /* a catch */
  room._achvOnCatch('bp_av_c', C, { gold: false, size: 1 });
  check('3h a pet caught: Gotcha', gotC('first_pet') && !gotC('golden_pet'), rec('bp_av_c'));
  room._achvOnCatch('bp_av_c', C, { gold: true, size: 1 });
  check('3i a golden one: Golden Catch, not Golden Giant', gotC('golden_pet') && !gotC('golden_giant'), rec('bp_av_c'));
  room._achvOnCatch('bp_av_c', C, { gold: true, size: PETBOOK.BIG_AT });
  check('3j golden and big: Golden Giant; Golden Catch counted 2', gotC('golden_giant') && rec('bp_av_c').n.golden_pet === 2, rec('bp_av_c'));

  /* an order */
  room._achvOnOrder('bp_av_c', C);
  check('3k an order delivered: Farmhand', gotC('first_order'), rec('bp_av_c'));

  /* a duel, through the real resolve */
  const wsD = fakeWs('D');
  await join(wsD, 'bp_av_d');
  const duel = (how, arena) => {
    const d = { id: 'dl' + Math.random(), status: 'active', a: 'bp_av_c', b: 'bp_av_d', wager: 0, ...(arena ? { arenaMatch: 'm1' } : {}) };
    if (!room._duels) room._duels = new Map();
    room._duels.set(d.id, d);
    const saveArena = room._arenaOnMatchResolved;
    if (arena) room._arenaOnMatchResolved = () => {};
    room._resolveDuel(d, 'bp_av_c', 'bp_av_d', how);
    room._arenaOnMatchResolved = saveArena;
  };
  duel('forfeit');
  duel('timeout');
  check('3l a duel won by forfeit or the clock is no Duelist', !gotC('first_duel'), rec('bp_av_c'));
  duel('kill', true);
  check('3m an arena match won by the kill is no Duelist (the arena has its own)', !gotC('first_duel'), rec('bp_av_c'));
  duel('kill');
  check('3n a duel won by the kill: Duelist', gotC('first_duel') && rec('bp_av_c').n.first_duel === 1, rec('bp_av_c'));

  /* No man's land, through the real death */
  const D = room.playerState.bp_av_d;
  D._nmlLastHitBy = 'bp_av_c'; D._nmlLastHitAt = Date.now();
  room._nmlOnDeath(D, 'bp_av_d', 'pvp:bp_av_c');
  check('3o a player killed under No man\'s land\'s rule: Outlaw for the killer', gotC('nml_kill'), rec('bp_av_c'));

  /* the story */
  C._quests = Object.create(null);
  for (const q of ['tut_4', 'life_2', 'beast_4']) C._quests[q] = 'turnedIn';
  room._achvOnQuest('bp_av_c', C);
  check('3p three of the four chains\' ends: no Storyteller', !gotC('story_done'), rec('bp_av_c'));
  C._quests.mayor_3 = 'turnedIn';
  room._achvOnQuest('bp_av_c', C);
  check('3q every chain\'s end handed in: Storyteller', gotC('story_done'), rec('bp_av_c'));

  /* gear */
  room._achvOnPiece('bp_av_c', C, { type: 'greatsword', gearBase: 'Iron', quality: 'normal' }, 'kill');
  check('3r an Iron Great Sword off a kill: Iron Great Sword, not Elite', gotC('iron_blade') && !gotC('elite_piece') && !gotC('elite_iron'), rec('bp_av_c'));
  room._achvOnPiece('bp_av_c', C, { slot: 'armor', name: 'Iron Torso', quality: 'elite' }, 'kill');
  check('3s an Elite torso off a kill: Elite, not Elite Iron (armour is no blade)', gotC('elite_piece') && !gotC('elite_iron'), rec('bp_av_c'));
  room._achvOnPiece('bp_av_c', C, { type: 'greatsword', gearBase: 'Iron', quality: 'elite' }, 'kill');
  check('3t an Elite Iron Great Sword off a kill: Elite Iron', gotC('elite_iron') && rec('bp_av_c').n.iron_blade === 2, rec('bp_av_c'));
  room._achvOnPiece('bp_av_c', C, { type: 'sword', gearBase: 'copper', quality: 'godly' }, 'forge');
  check('3u a Godly forged blade: Godly (not an Iron Great Sword off a kill)', gotC('godly') && rec('bp_av_c').n.iron_blade === 2, rec('bp_av_c'));

  /* H5 and the spin */
  room._achvOnHarden('bp_av_c', C, HARDEN.MAX - 1);
  check('3v a harden short of the top: nothing', !gotC('tempered'), rec('bp_av_c'));
  room._achvOnHarden('bp_av_c', C, HARDEN.MAX);
  check('3w to H5: Perfectly Tempered', gotC('tempered'), rec('bp_av_c'));
  room._achvOnSpinTop('bp_av_c', C);
  check('3x the spin\'s pot to the house limit: Breaking the House', gotC('house_limit'), rec('bp_av_c'));

  /* the codex, through a real kill once its nine kinds are counted */
  room._codexDevSet('bp_av_c', { all: true, n: 1, n2: 0 });
  const m = aMonster();
  standBy(C, m);
  kill(m, { bp_av_c: 50 }, 'bp_av_c');
  check('3y all nine kinds: Know Thy Enemy, not Elder Hunter', gotC('codex_all') && !gotC('elder_all'), rec('bp_av_c'));
  room._codexDevSet('bp_av_c', { all: true, n: 2, n2: 1 });
  kill(m, { bp_av_c: 50 }, 'bp_av_c');
  check('3z all nine past level 20: Elder Hunter', gotC('elder_all'), rec('bp_av_c'));
}

/* ── 4. ONCE ───────────────────────────────────────────────────────────────── */
{
  const r0 = rec('bp_av_c'), ap0 = apOf('bp_av_c');
  for (const a of ACHV.LIST) room._achvGrant('bp_av_c', C, a.id);
  const r1 = rec('bp_av_c');
  const paidFor = ACHV.LIST.filter((a) => !r0.got[a.id]).reduce((n, a) => n + ACHV.TIER_AP[a.tier], 0);
  check('4a granting all 23 again pays only the ones not had yet', apOf('bp_av_c') === ap0 + paidFor, { ap: apOf('bp_av_c'), ap0, paidFor });
  room._achvGrant('bp_av_c', C, 'first_blood');
  room._achvGrant('bp_av_c', C, 'gladiator');
  check('4b ...and once more pays nothing: a row that counts counts (Gladiator 2), one that does not stays (First Blood)',
    apOf('bp_av_c') === ap0 + paidFor && rec('bp_av_c').n.gladiator === 2 && !rec('bp_av_c').n.first_blood, rec('bp_av_c').n);
  check('4c every earned achievement keeps the time it was first earned', ACHV.LIST.every((a) => r1.got[a.id] > 0 && (!r0.got[a.id] || r1.got[a.id] === r0.got[a.id])));
}

/* ── 5. THE ARENA ──────────────────────────────────────────────────────────── */
{
  const wsG = fakeWs('G');
  const G = await join(wsG, 'bp_av_g');
  await flush();
  const crown = (tid, who) => {
    room._arena = { id: tid, status: 'running', players: [{ playerId: who, playerName: 'G' }, { playerId: 'bp_av_x', playerName: 'X' }], champion: null };
    room.eventBuffer.length = 0;
    room._arenaCrown({ playerId: who, playerName: 'G' });
    return room._arena.champion;
  };
  const coins0 = G.coins || 0, ap0 = apOf('bp_av_g');
  const c1 = crown('t_av_1', 'bp_av_g');
  for (let i = 0; i < 6; i++) await flush();
  await new Promise((r) => setTimeout(r, 20));
  check('5a the first crown: its gold, and the Gladiator achievement\'s 500 AP', (G.coins || 0) > coins0 && apOf('bp_av_g') === ap0 + 500 && rec('bp_av_g').got.gladiator > 0 && rec('bp_av_g').n.gladiator === 1,
    { coins: G.coins, coins0, ap: apOf('bp_av_g'), rec: rec('bp_av_g') });
  check('5b ...the champion box says 500, and the gold\'s credit carries no points', c1 && c1.ap === 500
    && !wsG.sent.some((m) => m.type === 'inbox_delivered' && (m.payload.entries || []).some((e) => e.kind === 'gold' && e.payload && e.payload.ap)), c1);
  check('5c ...the phone told it as new', wsG.sent.some((m) => m.type === 'achv_state' && Array.isArray(m.payload.new) && m.payload.new.includes('gladiator')));
  const coins1 = G.coins;
  const c2 = crown('t_av_2', 'bp_av_g');
  for (let i = 0; i < 6; i++) await flush();
  await new Promise((r) => setTimeout(r, 20));
  check('5d a second crown pays its gold and no points, and counts 2', G.coins > coins1 && apOf('bp_av_g') === ap0 + 500 && rec('bp_av_g').n.gladiator === 2, { coins: G.coins, ap: apOf('bp_av_g'), n: rec('bp_av_g').n });
  check('5e ...and its champion box says no points', c2 && !c2.ap, c2);

  /* a champion who left before the crown: paid at the next join */
  const wsH = fakeWs('H');
  await join(wsH, 'bp_av_h');
  await flush();
  room._handleClose ? null : null;
  await room.webSocketClose(wsH, 1000, 'bye', true);
  await flush();
  const c3 = crown('t_av_3', 'bp_av_h');
  for (let i = 0; i < 6; i++) await flush();
  await new Promise((r) => setTimeout(r, 20));
  const box = state._store.get('inbox:bp_av_h') || [];
  const list = Array.isArray(box) ? box : (box.entries || []);
  check('5f a champion who left: the box says no points (not known yet), the achievement waits in the mail beside the gold',
    c3 && !c3.ap && list.some((e) => e.kind === 'achv' && e.payload && e.payload.id === 'gladiator') && list.some((e) => e.kind === 'gold'), { c3, list });
  const wsH2 = fakeWs('H2');
  const H2 = await join(wsH2, 'bp_av_h');
  check('5g ...their next join pays it (the record loads before the mail)', H2 && H2.achievementPoints === 500 && rec('bp_av_h').got.gladiator > 0, { ap: H2 && H2.achievementPoints, rec: rec('bp_av_h') });

  /* a record that cannot be read: the achievement stays queued, the gold lands */
  const wsI = fakeWs('I');
  await join(wsI, 'bp_av_i');
  await room.webSocketClose(wsI, 1000, 'bye', true);
  await flush();
  crown('t_av_4', 'bp_av_i');
  for (let i = 0; i < 6; i++) await flush();
  await new Promise((r) => setTimeout(r, 20));
  state.failReads((k) => k === ACHV_KEY('bp_av_i'));
  const wsI2 = fakeWs('I2');
  const I2 = await join(wsI2, 'bp_av_i');
  state.failReads(null);
  const boxI = state._store.get('inbox:bp_av_i') || [];
  const listI = Array.isArray(boxI) ? boxI : (boxI.entries || []);
  check('5h the record unreadable at the join: the gold lands, the achievement stays in the mail, no points',
    I2 && (I2.coins || 0) > 0 && !(I2.achievementPoints > 0) && listI.some((e) => e.kind === 'achv') && !listI.some((e) => e.kind === 'gold'), { coins: I2 && I2.coins, ap: I2 && I2.achievementPoints, listI });
  await room.webSocketClose(wsI2, 1000, 'bye', true);
  await flush();
  const wsI3 = fakeWs('I3');
  const I3 = await join(wsI3, 'bp_av_i');
  check('5i ...readable at the next join: paid then', I3 && I3.achievementPoints === 500 && rec('bp_av_i').got.gladiator > 0, { ap: I3 && I3.achievementPoints });

  /* a v2.3.3481 crown still in a mailbox: through the achievement, once */
  const wsJ = fakeWs('J');
  await join(wsJ, 'bp_av_j');
  await room.webSocketClose(wsJ, 1000, 'bye', true);
  await flush();
  await room._inboxAppend('bp_av_j', { opId: 'arenapot:old1', source: 'arena', kind: 'gold', payload: { amount: 500, ap: 500 }, note: 'old' }, 'arenapot:old1');
  await room._inboxAppend('bp_av_j', { opId: 'arenapot:old2', source: 'arena', kind: 'gold', payload: { amount: 500, ap: 500 }, note: 'old' }, 'arenapot:old2');
  const wsJ2 = fakeWs('J2');
  const J2 = await join(wsJ2, 'bp_av_j');
  check('5j two v2.3.3481 crowns waiting in the mail: both their gold, the points once (Gladiator counted 2)',
    J2 && J2.coins >= 1000 && J2.achievementPoints === 500 && rec('bp_av_j').n.gladiator === 2, { coins: J2 && J2.coins, ap: J2 && J2.achievementPoints, rec: rec('bp_av_j') });
  room._arena = null; room._arenaClearAt = 0;
}

/* ── 6. LOCKED ─────────────────────────────────────────────────────────────── */
{
  state._store.set(ACHV_KEY('bp_av_new'), { v: ACHV.V + 1, got: { first_blood: 1 }, future: true });
  const wsN = fakeWs('N');
  const N = await join(wsN, 'bp_av_new');
  check('6a a newer worker\'s record: the phone is told unavailable', last(wsN, 'achv_state') && last(wsN, 'achv_state').unavailable === true, last(wsN, 'achv_state'));
  const ap0 = N.achievementPoints || 0;
  room._achvGrant('bp_av_new', N, 'nml_kill', { save: true });
  check('6b ...nothing is paid into it, and it is never written over', (N.achievementPoints || 0) === ap0 && state._store.get(ACHV_KEY('bp_av_new')).future === true && state._store.get(ACHV_KEY('bp_av_new')).v === ACHV.V + 1);
  state.failReads((k) => k === ACHV_KEY('bp_av_fail'));
  const wsF = fakeWs('F');
  const F = await join(wsF, 'bp_av_fail');
  state.failReads(null);
  room._achvGrant('bp_av_fail', F, 'nml_kill', { save: true });
  check('6c a record whose read failed is locked too: unavailable, nothing written', last(wsF, 'achv_state').unavailable === true && !state._store.has(ACHV_KEY('bp_av_fail')) && !(F.achievementPoints > 0));
}

/* ── 7. THE KILL SWITCH ────────────────────────────────────────────────────── */
{
  room._liveFlags = { ...(room._liveFlags || {}), achievements: false };
  const wsK = fakeWs('K');
  const K = await join(wsK, 'bp_av_k', {});
  const sync = wsK.sent.find((m) => m.type === 'state_sync');
  check('7a achievements: false -- the cap is off', sync && sync.caps && sync.caps.achievements === false, sync && sync.caps && sync.caps.achievements);
  const m = aMonster();
  standBy(K, m);
  kill(m, { bp_av_k: 50 }, 'bp_av_k');
  check('7b ...a first kill grants nothing', !rec('bp_av_k') || !rec('bp_av_k').got || !rec('bp_av_k').got.first_blood, rec('bp_av_k'));
  const apC = apOf('bp_av_c'), gotCount = Object.keys(rec('bp_av_c').got).length;
  room._achvGrant('bp_av_c', C, 'first_blood');
  check('7c ...and what was earned stays, the points too', apOf('bp_av_c') === apC && Object.keys(rec('bp_av_c').got).length === gotCount);
  delete room._liveFlags.achievements;
}

/* ── 8. WHAT YOU HAD BEFORE ────────────────────────────────────────────────── */
{
  /* a character from before achievements: a kill, a combat level, the story done */
  const wsR = fakeWs('R');
  const R0 = await join(wsR, 'bp_av_r');
  R0.svKills = 12;
  R0.prog3.sk.staff.level = 14;
  R0._quests = Object.create(null);
  for (const q of ACHV.STORY_ENDS) R0._quests[q] = 'turnedIn';
  R0.achievementPoints = 65;
  await room._saveRpg('bp_av_r', R0);
  state._store.delete(ACHV_KEY('bp_av_r'));
  await room.webSocketClose(wsR, 1000, 'bye', true);
  room._achvForget('bp_av_r');
  await flush();
  const wsR2 = fakeWs('R2');
  const R = await join(wsR2, 'bp_av_r');
  const st = last(wsR2, 'achv_state');
  check('8a the join grants what they had done: First Blood, Blooded, Storyteller -- quietly, as retro',
    st && Array.isArray(st.retro) && ['first_blood', 'combat_10', 'story_done'].every((id) => st.retro.includes(id)) && !st.new, st);
  check('8b ...65 AP from quests + 10 + 10 + 100', R.achievementPoints === 185, R.achievementPoints);
  const sync = wsR2.sent.find((m) => m.type === 'state_sync');
  const order = wsR2.sent.map((m) => m.type);
  check('8c ...before the first snapshot (the points already in it)', order.indexOf('achv_state') > order.indexOf('state_sync') && !!sync, order.slice(0, 4));
  await room.webSocketClose(wsR2, 1000, 'bye', true);
  await flush();
  const wsR3 = fakeWs('R3');
  const R3 = await join(wsR3, 'bp_av_r');
  check('8d the next join grants nothing again', R3.achievementPoints === 185 && !last(wsR3, 'achv_state').retro, { ap: R3.achievementPoints, st: last(wsR3, 'achv_state') });
}

/* ── 9. THE STAMP ──────────────────────────────────────────────────────────── */
{
  const wsT = fakeWs('T');
  const T = await join(wsT, 'bp_av_t', { rpgData: { ap: 999999, kills: 3 } });
  const sess = room.sessions.get(wsT);
  /* the join keeps no card blob at all (join.js _sanitizeJoinData admits
     strings and numbers): nothing of the phone's 999,999 survives it */
  check('9a the join\'s data carries no forged AP (no card blob, or the worker\'s)', !!sess && !!sess.data
    && (!sess.data.rpgData || sess.data.rpgData.ap === (T.achievementPoints || 0)), sess && sess.data && sess.data.rpgData);
  T.achievementPoints = 140;
  await room.webSocketMessage(wsT, JSON.stringify({ type: 'track', data: { rpgData: { ap: 888888, kills: 4 } } }));
  check('9b a track saying 888,888 is stamped back to the worker\'s 140', sess.data.rpgData && sess.data.rpgData.ap === 140 && sess.data.rpgData.kills === 4, sess.data.rpgData);
}

/* ── 10. THE LEVER, A RESTART, normalizeAchv ───────────────────────────────── */
{
  const wsL = fakeWs('L');
  const L = await join(wsL, 'bp_av_l');
  const ap0 = L.achievementPoints || 0;
  const one = room._achvDev('bp_av_l', { id: 'godly' });
  check('10a the lever lights one, with no points, told as new', one.ok && rec('bp_av_l').got.godly > 0 && (L.achievementPoints || 0) === ap0 && last(wsL, 'achv_state').new[0] === 'godly', { one, ap: L.achievementPoints });
  const all = room._achvDev('bp_av_l', { all: true });
  check('10b ...all of them, no points', all.ok && ACHV.LIST.every((a) => rec('bp_av_l').got[a.id] > 0) && (L.achievementPoints || 0) === ap0);
  const clr = room._achvDev('bp_av_l', { clear: true });
  check('10c ...clear forgets them, the points stay', clr.ok && Object.keys(rec('bp_av_l').got).length === 0 && (L.achievementPoints || 0) === ap0, rec('bp_av_l'));
  check('10d an unknown id is refused', room._achvDev('bp_av_l', { id: '__proto__' }).ok === false);
  await room._resetCharacterData('bp_av_l');
  check('10e a character restart deletes the record', !state._store.has(ACHV_KEY('bp_av_l')));
  const n = normalizeAchv(JSON.parse('{"v":1,"got":{"first_blood":5,"__proto__":7,"made_up":9},"n":{"gladiator":3,"first_blood":4,"__proto__":2},"dg":{"hollows":1,"atlantis":1}}'));
  check('10f normalizeAchv keeps only known ids, counts only on counting rows, and the Wheel\'s dungeons',
    !n.locked && n.rec.got.first_blood === 5 && Object.keys(n.rec.got).length === 1 && n.rec.n.gladiator === 3 && !('first_blood' in n.rec.n)
    && Object.keys(n.rec.dg).join() === 'hollows' && Object.getPrototypeOf(n.rec.got) === null, n);
  check('10g normalizeAchv locks a newer record', normalizeAchv({ v: ACHV.V + 1 }).locked === true);
  check('10h CODEX\'s kinds are what Know Thy Enemy counts', CODEX.KINDS.length === 9);
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
if (failures > 0) { console.log(failures + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
