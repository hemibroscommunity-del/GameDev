/* The boss's chest, and the clear's XP into the weapons you used (v2.3.3563,
 * server/src/dungeonreward.js, docs/specs/boss-chest.md).  The owner's "Yes"
 * to "a reward worth the trip": "the boss drops a chest with sure rewards, for
 * example extra gold, the land's shards and a chance at its gem.  The clear's
 * XP would go into the weapon you used."  Checks:
 *   1. THE CHEST: a world dungeon's clear pays each player in it 20 gold a
 *      level of the run, 3 of the land's shards and, one time in 10, a Rare
 *      Gem (never a raw gem: they come only from cracking shards); the event
 *      says what it held; saved with the clear.
 *   2. THE CLEAR'S XP: paid flat into the weapons the player fought with in
 *      THIS run, by their shares of the run's fight XP, adding up to the
 *      clear's XP; the old counter still gets it.
 *   3. ...a player who earned none in the run gets it in the weapon in their
 *      hand; a record from another run counts for nothing; a skill at its cap
 *      takes none; it fades as fight XP does.
 *   4. ONLY WHAT THE RUN EARNED: fight XP is noted only in a dungeon, never a
 *      flat award.
 *   5. THE WORKSHOP: no chest, and its clear's XP stays on the old counter.
 *   6. THE KILL SWITCHES: `bosschest: false`, `clearxp: false`.
 *   7. THE SPLIT: whole numbers that add up, the biggest share takes the rest.
 *   8. THE PHONE'S LINES (src/game/bossChest.js): what the clear's card says.
 */
import { GameRoom } from '../src/index.js';
import { WHEEL_DUNGEON } from '../src/wheeldungeon.js';
import { WHEEL_DOORS } from '../src/wheelspawns.js';
import { BOSS_CHEST, splitClearXp, CLEAR_SKILLS } from '../src/dungeonreward.js';
import { PROG3, prog3XpRequired } from '../src/prog3.js';
import { xpDecayMult } from '../src/xpdecay.js';
import { RARE_GEM_KEY } from '../src/data.js';
import { chestLines } from '../../src/game/bossChest.js';
import { startDungeonClear, setDungeonClearReward, dungeonClearView } from '../../src/game/dungeonClear.js';

function makeState() {
  const store = new Map();
  return {
    store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const msgsOfType = (ws, type) => ws.sent.filter((m) => m.type === type);

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  return room.playerState[id];
}
const put = (ps, z, x, y) => { ps.z = z; ps.x = x; ps.y = y; ps.dead = false; ps.dying = false; };
const endRuns = () => { for (const inst of [...(room._dungeons || new Map()).values()]) room._dungeonCleanup(inst); };
/* a skill's whole XP: every level below it, and what it holds now */
const cum = (ps, k) => {
  const s = ps.prog3.sk[k];
  let t = s.xp;
  for (let l = 1; l < s.level; l++) t += prog3XpRequired(l);
  return t;
};
const flush = () => new Promise((r) => setTimeout(r, 0));

const wsA = fakeWs('a');
const psA = await join(wsA, 'bp_dr_a');
const wsB = fakeWs('b');
const psB = await join(wsB, 'bp_dr_b');

/* A run at mouth `land` for a level-3 player: its waves killed, its boss up,
   `others` standing inside with it. */
async function runToBoss(land, others = []) {
  endRuns();
  const door = WHEEL_DOORS[land];
  put(psA, 'wheel', door.at[0], door.at[1]);
  psA.level = 3;
  wsA.sent.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'dungeon_start', payload: { entrance: land } }));
  const s = msgsOfType(wsA, 'dungeon_started')[0];
  if (!s) return {};
  const zone = s.payload.zone;
  const inst = [...room._dungeons.values()].find((i) => i.zone === zone);
  put(psA, zone, 400, 600);
  for (const ps of others) put(ps, zone, 460, 600);
  for (let w = 1; w <= WHEEL_DUNGEON.WAVES; w++) {
    for (const m of room.monsters[zone]) { m.alive = false; m.hp = 0; }
    room._tickDungeons(Date.now());
  }
  const boss = room.monsters[zone].find((m) => m.alive && m._dungeonBoss);
  return { zone, inst, boss };
}
/* the boss dies (a golem: at once) and the run clears */
function clear(R) {
  R.boss.alive = false; R.boss.hp = 0;
  wsA.sent.length = 0; wsB.sent.length = 0;
  room._tickDungeons(Date.now());
}
const done = (ws) => msgsOfType(ws, 'dungeon_complete')[0];

// ── 1 + 2. THE CHEST AND THE CLEAR'S XP ───────────────────────────────────
{
  const R = await runToBoss('hollows', [psB]);
  check('setup: a level-3 run of the Great Cave, its boss up, the player and a party member in it',
    !!R.boss && R.inst.cfg.home === 'hollows' && R.inst.cfg.monsterLevel === 3 && psA.z === R.zone && psB.z === R.zone, R.inst && R.inst.cfg);
  /* the fight: the player earns fight XP with the sword and the bow in this
     run (as every damage path pays it, prog3.js _prog3AwardXp) */
  room._prog3AwardXp('bp_dr_a', psA, 'sword', 1500);
  room._prog3AwardXp('bp_dr_a', psA, 'bow', 500);
  check('the run notes the fight XP by weapon (ps._dgXp, this run\'s zone)',
    !!psA._dgXp && psA._dgXp.zone === R.zone && psA._dgXp.sword === 1500 && psA._dgXp.bow === 500 && psA._dgXp.staff === 0, psA._dgXp);
  psB.activeSlot = 'staff';
  const coins0 = psA.coins, shards0 = (psA.inventory || {}).shard_hollows || 0, rare0 = (psA.inventory || {})[RARE_GEM_KEY] || 0;
  const raw0 = Object.keys(psA.inventory || {}).filter((k) => k.startsWith('gem_raw_')).length;
  const old0 = psA.xp || 0;
  const cumA = Object.fromEntries(CLEAR_SKILLS.map((k) => [k, cum(psA, k)]));
  const cumB = Object.fromEntries(CLEAR_SKILLS.map((k) => [k, cum(psB, k)]));
  const realRoll = room._bossChestRoll;
  room._bossChestRoll = () => 0.05;
  clear(R);
  room._bossChestRoll = realRoll;
  const ev = done(wsA);
  const clearGold = 30 * 3 + 3 * 2, clearXp = 80 * 3 + 3 * 5;
  const chestGold = BOSS_CHEST.GOLD_PER_LEVEL * 3;
  check(`chest: the clear pays its gold (${clearGold}) and the chest's 20 a level (${chestGold}): ${psA.coins - coins0}`,
    psA.coins - coins0 === clearGold + chestGold && BOSS_CHEST.GOLD_PER_LEVEL === 20, { got: psA.coins - coins0 });
  check('chest: ...3 of the land\'s own shards (shard_hollows)', (psA.inventory.shard_hollows || 0) - shards0 === 3 && BOSS_CHEST.SHARDS === 3);
  check('chest: ...and a Rare Gem on a roll under 1 in 10 -- never a raw gem (they come only from cracking shards)',
    (psA.inventory[RARE_GEM_KEY] || 0) - rare0 === 1 && BOSS_CHEST.RARE_IN === 10
      && Object.keys(psA.inventory).filter((k) => k.startsWith('gem_raw_')).length === raw0);
  check('chest: the clear\'s event says what it held: {gold, items: [{key, n}]}',
    !!ev && ev.payload.gold === clearGold && !!ev.payload.chest && ev.payload.chest.gold === chestGold
      && JSON.stringify(ev.payload.chest.items) === JSON.stringify([{ key: 'shard_hollows', n: 3 }, { key: RARE_GEM_KEY, n: 1 }]),
    ev && ev.payload);
  const evB = done(wsB);
  check('chest: ...and the party member in the run gets a chest of their own', !!evB && !!evB.payload.chest && evB.payload.chest.gold === chestGold);
  /* the clear's XP: 255, split 1500 : 500 into sword and bow */
  const want = splitClearXp(clearXp, { sword: 1500, bow: 500 });
  check(`xp: the clear's ${clearXp} XP goes into the weapons used in the run, by their shares (sword ${want.sword}, bow ${want.bow})`,
    !!ev.payload.skillXp && ev.payload.skillXp.sword === want.sword && ev.payload.skillXp.bow === want.bow && !('staff' in ev.payload.skillXp)
      && want.sword + want.bow === clearXp, ev.payload.skillXp);
  check('xp: ...paid flat into the skills themselves (each skill\'s whole XP rose by exactly that)',
    cum(psA, 'sword') - cumA.sword === want.sword && cum(psA, 'bow') - cumA.bow === want.bow && cum(psA, 'staff') === cumA.staff,
    { sword: cum(psA, 'sword') - cumA.sword, bow: cum(psA, 'bow') - cumA.bow });
  check('xp: ...and the old counter still gets the number, as before', (psA.xp || 0) - old0 === clearXp);
  check(`xp: a party member who earned none in the run gets it in the weapon in their hand (staff: ${evB && evB.payload.skillXp && evB.payload.skillXp.staff})`,
    !!evB && !!evB.payload.skillXp && evB.payload.skillXp.staff === clearXp && Object.keys(evB.payload.skillXp).length === 1
      && cum(psB, 'staff') - cumB.staff === clearXp, evB && evB.payload.skillXp);
  await flush();
  const saved = state.store.get('rpg:' + 'bp_dr_a');
  check('chest: saved with the clear (the stored record holds the gold, the shards and the Rare Gem)',
    !!saved && saved.coins === psA.coins && saved.inventory && saved.inventory.shard_hollows === psA.inventory.shard_hollows && saved.inventory[RARE_GEM_KEY] === psA.inventory[RARE_GEM_KEY],
    saved && { coins: saved.coins, inv: saved.inventory });
}

// ── 1b. NO RARE GEM ON A HIGHER ROLL, AND THE GOO GROTTO'S SHARD ──────────
{
  room._liveFlags = { slimeboss: false };   /* one big boss, as before the splits */
  const R = await runToBoss('verdant');
  room._liveFlags = {};
  const rare0 = psA.inventory[RARE_GEM_KEY] || 0, sh0 = psA.inventory.shard_verdant || 0;
  const realRoll = room._bossChestRoll;
  room._bossChestRoll = () => 0.5;
  /* a blue slime goes off before it dies */
  R.boss.hp = 0;
  room._startSlimeBurst(R.zone, R.boss, 'bp_dr_a', 'melee', Date.now());
  room._resolveSlimeBurst(R.zone, R.boss, R.boss._burstUntil + 1);
  wsA.sent.length = 0;
  room._tickDungeons(Date.now());
  room._bossChestRoll = realRoll;
  const ev = done(wsA);
  check('chest: the Goo Grotto\'s holds 3 Verdant shards, and no Rare Gem on a roll of 1 in 2',
    !!ev && ev.payload.chest && JSON.stringify(ev.payload.chest.items) === JSON.stringify([{ key: 'shard_verdant', n: 3 }])
      && (psA.inventory.shard_verdant || 0) - sh0 === 3 && (psA.inventory[RARE_GEM_KEY] || 0) === rare0, ev && ev.payload);
  check('xp: with no fight XP in this run (the last run\'s record is another zone\'s), the clear\'s XP goes into the weapon in hand',
    !!ev && !!ev.payload.skillXp && Object.keys(ev.payload.skillXp).length === 1 && ev.payload.skillXp[{ melee: 'sword', ranged: 'bow', staff: 'staff' }[psA.activeSlot || 'melee']] > 0,
    ev && { slot: psA.activeSlot, xp: ev.payload.skillXp });
}

// ── 3. THE FADE AND THE CAP ───────────────────────────────────────────────
{
  const R = await runToBoss('hollows');
  room._prog3AwardXp('bp_dr_a', psA, 'sword', 900);
  room._prog3AwardXp('bp_dr_a', psA, 'bow', 900);
  /* the bow far above the run (level 20 against a level-3 run), the sword at its cap */
  const bowWas = { ...psA.prog3.sk.bow }, swordWas = { ...psA.prog3.sk.sword };
  psA.prog3.sk.bow.level = 20; psA.prog3.sk.bow.xp = 0;
  psA.prog3.sk.sword.level = PROG3.LEVEL_CAP; psA.prog3.sk.sword.xp = 0;
  const bow0 = cum(psA, 'bow');
  clear(R);
  const ev = done(wsA);
  const fade = xpDecayMult(20, 3);
  const clearXp = 80 * 3 + 3 * 5;
  check(`fade: a skill at its cap takes none, so all of it goes to the bow -- faded as fight XP is, ${clearXp} x ${fade.toFixed(3)} = ${Math.round(clearXp * fade)}`,
    !!ev && !!ev.payload.skillXp && !('sword' in ev.payload.skillXp) && ev.payload.skillXp.bow === Math.round(clearXp * fade) && fade < 1
      && cum(psA, 'bow') - bow0 === ev.payload.skillXp.bow,
    ev && ev.payload.skillXp);
  psA.prog3.sk.bow = bowWas; psA.prog3.sk.sword = swordWas;
}

// ── 4. ONLY WHAT THE RUN EARNED ──────────────────────────────────────────
{
  endRuns();
  put(psA, 'wheel', 1000, 1000);
  psA._dgXp = null;
  room._prog3AwardXp('bp_dr_a', psA, 'sword', 700);
  check('note: fight XP outside a dungeon is not noted', !psA._dgXp);
  put(psA, 'dungeon:xyz', 400, 600);
  room._prog3AwardXp('bp_dr_a', psA, 'sword', 50, { flat: true });
  check('note: ...nor a flat award (a quest\'s, the clear\'s own) in one', !psA._dgXp);
  room._prog3AwardXp('bp_dr_a', psA, 'staff', 80);
  check('note: ...fight XP in one is', !!psA._dgXp && psA._dgXp.zone === 'dungeon:xyz' && psA._dgXp.staff === 80);
  put(psA, 'wheel', 1000, 1000);
}

// ── 5. THE WORKSHOP ──────────────────────────────────────────────────────
{
  endRuns();
  put(psA, 'town', 100, 100);
  psA.level = 5;
  wsA.sent.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'dungeon_start', payload: { config: { waves: 1, monsterLevel: 3, hasBoss: true, monsters: [{ archetype: 'fodder', count: 4 }] } } }));
  const s = msgsOfType(wsA, 'dungeon_started')[0];
  const zone = s && s.payload.zone;
  const inst = zone && [...room._dungeons.values()].find((i) => i.zone === zone);
  put(psA, zone, 400, 600);
  room._prog3AwardXp('bp_dr_a', psA, 'sword', 500);
  for (let i = 0; i < 4; i++) {
    for (const m of room.monsters[zone]) { m.alive = false; m.hp = 0; }
    room._tickDungeons(Date.now());
    if (inst.state === 'done') break;
  }
  const ev = done(wsA);
  check('workshop: a Workshop run clears with no chest and its XP on the old counter only (its monsters are the player\'s choice)',
    !!inst && inst.state === 'done' && !!ev && !ev.payload.chest && !ev.payload.skillXp, ev && ev.payload);
}

// ── 6. THE KILL SWITCHES ─────────────────────────────────────────────────
{
  room._liveFlags = { bosschest: false };
  let R = await runToBoss('hollows');
  room._prog3AwardXp('bp_dr_a', psA, 'sword', 300);
  const c0 = psA.coins;
  clear(R);
  let ev = done(wsA);
  check('switch: `bosschest: false` -- no chest, the clear\'s gold alone; the XP still goes to the weapon',
    !!ev && !ev.payload.chest && psA.coins - c0 === 30 * 3 + 3 * 2 && !!ev.payload.skillXp, ev && ev.payload);
  room._liveFlags = { clearxp: false };
  R = await runToBoss('hollows');
  room._prog3AwardXp('bp_dr_a', psA, 'sword', 300);
  const sw0 = cum(psA, 'sword');
  clear(R);
  ev = done(wsA);
  check('switch: `clearxp: false` -- the chest, and the clear\'s XP on the old counter only',
    !!ev && !!ev.payload.chest && !ev.payload.skillXp && cum(psA, 'sword') === sw0, ev && ev.payload);
  room._liveFlags = {};
  endRuns();
}

// ── 7. THE SPLIT ─────────────────────────────────────────────────────────
{
  const a = splitClearXp(255, { sword: 1500, bow: 500 });
  const b = splitClearXp(100, { sword: 1, bow: 1, staff: 1 });
  const c = splitClearXp(7, { bow: 3 });
  check('split: whole numbers that add up to the clear\'s XP, the biggest share taking what rounding leaves',
    a.sword === 192 && a.bow === 63 && !('staff' in a) && b.sword + b.bow + b.staff === 100 && b.sword === 34 && c.bow === 7 && Object.keys(c).length === 1,
    { a, b, c });
  check('split: nothing to split, nothing paid',
    JSON.stringify(splitClearXp(0, { sword: 1 })) === '{}' && JSON.stringify(splitClearXp(50, {})) === '{}' && JSON.stringify(splitClearXp(50, { sword: 0 })) === '{}');
  check('split: an inherited key is never a skill', JSON.stringify(splitClearXp(10, Object.assign(Object.create({ sword: 5 }), {}))) === '{}');
}

// ── 8. THE PHONE'S LINES (src/game/bossChest.js) ────────────────────────
{
  const names = (k) => ({ shard_hollows: 'Stone Shard', rare_gem: 'Rare Gem' }[k] || k);
  const l = chestLines({ gold: 60, items: [{ key: 'shard_hollows', n: 3 }, { key: 'rare_gem', n: 1 }] }, { sword: 192, bow: 63 }, names);
  check('phone: the card lists the chest\'s gold, each item with its count, then each weapon\'s XP',
    JSON.stringify(l.map((x) => x.text)) === JSON.stringify(['+60 gold', 'Stone Shard \u00d73', 'Rare Gem', '+192 Sword XP', '+63 Bow XP'])
      && l[0].key === 'gold' && l[1].key === 'shard_hollows' && l[3].skill === 'sword', l);
  check('phone: nothing to show, nothing listed; a bad entry is skipped',
    chestLines(null, null, names).length === 0 && chestLines({ gold: 0, items: [{ key: 5, n: 2 }, { key: 'x', n: 0 }] }, { axe: 4 }, names).length === 0);
}

{
  /* the clear keeps what its event said, for its card (game/dungeonClear.js) */
  const S = { _serverDungeon: 'dungeon:q' };
  const timers = [];
  startDungeonClear(S, 'dungeon:q', 1000, () => {}, (fn) => timers.push(fn));
  const none = setDungeonClearReward(S, 'dungeon:other', { gold: 5, items: [] }, null, 1100);
  const empty = setDungeonClearReward(S, 'dungeon:q', null, null, 1100);
  const got = setDungeonClearReward(S, 'dungeon:q', { gold: 60, items: [{ key: 'shard_verdant', n: 3 }] }, { sword: 255 }, 1200);
  const v = dungeonClearView(S, 2000);
  check('phone: the clear keeps the chest and the XP its event said -- never another dungeon\'s, nor an event that said nothing',
    none === null && empty === null && !!got && !!v && !!v.reward && v.reward.chest.gold === 60 && v.reward.skillXp.sword === 255 && v.reward.at === 1200, v);
}

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\ndungeon-reward: all passed');
