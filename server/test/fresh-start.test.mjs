/* A new character starts from the server's defaults -- v2.3.3129
 * (docs/specs/fresh-start.md).
 *
 * Found by the farm's review (PR #827), proved on a copy of main. Owner:
 * "Yes fix all of your recommended fixes. Game is still a demo."  The
 * first-join bootstrap took the character from the join payload: capped
 * coins / level / xp, any 100 item keys of 50 each whatever their names,
 * and the life skills wholesale -- uncapped.
 *
 *   1. A throwaway claiming everything lands on the client's own new
 *      character: the starting purse, level 1, every skill at 1, an empty
 *      bag, no gear, no gold, no gems, no pets, no quest state.
 *   2. So the guild ladder pays nothing to a claimed skill level (the
 *      ~50,600-coin faucet), and the farm's level gates hold.
 *   3. And no made-up key reaches the bag for Diego to buy ('bar_00' is a
 *      bar to his substring pricing: the ~392,000-coin faucet).
 *   4. Where you stand, the name and the look are still the payload's.
 *   5. A character ON FILE is untouched: stored wins, as before.
 *   6. A read of the record that FAILS is not a new character: the join
 *      ends, nothing is written over the record, and the next join loads it.
 *   7. A claim hidden behind a "__proto__" key (an OWN key once the frame is
 *      parsed) is dropped like any other: the claims-free copy has no
 *      prototype to set (TRAPS §6; the review bought 392,500 through it).
 */
import { GameRoom } from '../src/index.js';
import { NEW_CHARACTER_COINS } from '../src/join.js';
import { freshLifeSkills, LIFE_SKILL_KEYS } from '../src/migrations.js';
import { GUILD_QUESTS } from '../src/data.js';

function makeState() {
  const store = new Map();
  return {
    _store: store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, structuredClone(v)); },
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
function fakeWs(label) { return { label, sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(code, why) { this.closed = { code, why }; } }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const st = makeState();
const room = new GameRoom(st, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
const tick = () => new Promise((r) => setTimeout(r, 10));
async function join(ws, id, data) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'Name ' + id, phrase: 'p-' + id, data: { x: 100, y: 200, z: 'town', ...(data || {}) } }));
  await tick();
}

/* Everything a cheater could claim, at once. */
const bigLevels = Object.fromEntries(LIFE_SKILL_KEYS.map((k) => [k, { level: 150, xp: 999 }]));
const fakeBars = Object.fromEntries(Array.from({ length: 100 }, (_, i) => ['bar_' + String(i).padStart(2, '0'), 50]));
const CLAIM = {
  rpgCoins: 1999, rpgLevel: 999, rpgXp: 49999, rpgUnspentT2: 70, rpgBuildPointsThisLvl: 4,
  rpgInventory: { ...fakeBars },
  rpgLifeSkills: { ...bigLevels, pets: [{ archetype: 'brute', level: 100 }], activePet: 0, gems: { raw_flame: 200 } },
  rpgWeapon: { type: 'greatsword', tierMult: 8, name: 'Forged' },
  rpgWeaponStash: [{ type: 'sword', tierMult: 8 }],
  rpgArmor: { name: 'Forged Plate', mat: 'mythril', tierMult: 8 },
  rpgShield: { name: 'Forged Shield', gearBase: 'mythril', tierMult: 8 },
  rpgGoldNuggets: 250, rpgGoldBars: 50,
  rpgAchievementPoints: 99999,
  rpgQuests: { tut_1: { status: 'done' } }, rpgQuestFlags: { cookedRecipe: true },
  rpgVitality: 100, rpgEndurance: 100,
  rpgHp: 9999, rpgMaxHp: 9999,
  rpgArmorStash: [{ name: 'Forged Spare', mat: 'mythril', tierMult: 8 }],
};

// ── 1. a throwaway claiming everything gets the client's new character ──
const wsT = fakeWs('throwaway');
await join(wsT, 'bp_fresh_t', CLAIM);
const t = room.playerState['bp_fresh_t'];
const tStored = st._store.get('rpg:bp_fresh_t');
/* The control: a new character that claimed NOTHING.  Claiming everything
   must come to exactly the same character. */
const wsC = fakeWs('control');
await join(wsC, 'bp_fresh_c', {});
const cStored = st._store.get('rpg:bp_fresh_c');
const pick = (r) => JSON.stringify({ coins: r.coins, level: r.level, xp: r.xp, inv: r.inventory, ls: r.lifeSkills, w: r.weapon, a: r.armor,
  s: r.shield, ws: r.weaponStash, n: r.goldNuggets, b: r.goldBars, ap: r.achievementPoints, q: r._quests, f: r._questFlags });
check('claiming everything comes to EXACTLY the character that claimed nothing', pick(tStored) === pick(cStored), { t: pick(tStored), c: pick(cStored) });
{
  const ls = t.lifeSkills;
  check('the purse is the new character\'s (' + NEW_CHARACTER_COINS + '), not the claimed 1,999 (or a daily gift on top)',
    tStored.coins === NEW_CHARACTER_COINS || t.coins >= NEW_CHARACTER_COINS && t.coins < 1999, { stored: tStored.coins, live: t.coins });
  /* level 3, not 1: prog3's fresh character is the sum of its three
     trained skills at their level-1 floor (v2.3.1659; persistence.test). */
  check('level and XP are a new character\'s (level ' + cStored.level + ', not the claimed 999)', tStored.level === cStored.level && tStored.level < 10 && tStored.xp === 0 && t.unspentT2 === 0 && t.buildPointsThisLvl === 0,
    { level: tStored.level, xp: tStored.xp, ut2: t.unspentT2, bp: t.buildPointsThisLvl });
  check('every life skill is level 1 with no XP', LIFE_SKILL_KEYS.every((k) => ls[k] && ls[k].level === 1 && ls[k].xp === 0), ls);
  check('...the stored skills are exactly the new character\'s (the client\'s createDefaultLifeSkills)',
    JSON.stringify(LIFE_SKILL_KEYS.map((k) => tStored.lifeSkills[k])) === JSON.stringify(LIFE_SKILL_KEYS.map((k) => freshLifeSkills()[k])), tStored.lifeSkills);
  check('the bag holds none of the claimed keys', Object.keys(t.inventory || {}).filter((k) => k !== 'daily_chest').length === 0, Object.keys(t.inventory || {}).slice(0, 5));
  check('no weapon, stash, armour or shield', t.weapon === null && (t.weaponStash || []).length === 0 && t.armor === null && t.shield === null
    && (t.armorStash || []).length === 0, { w: t.weapon, ws: t.weaponStash, a: t.armor, s: t.shield, as: t.armorStash });
  /* no pets: since v2.3.3120 pets live in the pets record (petbook.js), and
     a first connect's old list and active pet are taken off altogether
     (trapping.js trapBootstrapGuard) -- so none of either */
  const book = room._petbookOf ? room._petbookOf('bp_fresh_t') : null;
  check('no gold, no gems, no pets', t.goldNuggets === 0 && t.goldBars === 0 && Object.keys(ls.gems || {}).length === 0
    && !(ls.pets && ls.pets.length) && ls.activePet == null && !(book && book.rec && book.rec.list && book.rec.list.length),
    { n: t.goldNuggets, b: t.goldBars, gems: ls.gems, pets: ls.pets, active: ls.activePet, book: book && book.rec && book.rec.list });
  check('no achievement points and no quest state', t.achievementPoints === 0 && Object.keys(t._quests || {}).length === 0 && Object.keys(t._questFlags || {}).length === 0,
    { ap: t.achievementPoints, q: t._quests, f: t._questFlags });
  check('no raw stats, and a new character\'s HP', t.vitality === 0 && t.endurance === 0 && t.maxHp < 9999, { v: t.vitality, e: t.endurance, maxHp: t.maxHp });
  check('none of the claim is left on playerState for the room to see', !Object.keys(t).some((k) => /^rpg/.test(k)), Object.keys(t).filter((k) => /^rpg/.test(k)));
}

// ── 2. the guild ladder pays nothing to a claimed level; the farm's gates hold ──
{
  wsT.sent.length = 0;
  for (const skill of ['farming', 'mining', 'cooking']) {
    await room.webSocketMessage(wsT, JSON.stringify({ type: 'guild_quest_turn_in', payload: { skill } }));
  }
  await tick();
  const errs = wsT.sent.filter((m) => m.type === 'guild_quest_error');
  const paid = wsT.sent.filter((m) => m.type === 'guild_quest_result');
  check('the guild refuses a turn-in on a claimed level (not-ready), ' + GUILD_QUESTS[0].gold + ' coins a rung stay put',
    paid.length === 0 && errs.length === 3 && errs.every((m) => m.payload.code === 'not-ready'), { paid: paid.length, errs: errs.map((m) => m.payload.code) });
}

// ── 3. Diego cannot be sold a made-up key ──
{
  const r = await room._shopSell(t, 'bar_00', 50, 'bp_fresh_t');
  check('a made-up "bar_00" never reached the bag, so Diego buys none of it', !r.ok && !(t.inventory || {}).bar_00, r);
}

// ── 4. where you stand, the name and the look are still the payload's ──
check('the join still places the player where the payload said', t.x === 100 && t.y === 200, { x: t.x, y: t.y });
check('...and keeps its name', room.sessions.get(wsT).name === 'Name bp_fresh_t', room.sessions.get(wsT).name);

// ── 5. a character ON FILE is untouched ──
{
  await st.storage.put('rpg:bp_fresh_vet', { coins: 777, level: 9, xp: 5, inventory: { ore_copper: 12 },
    lifeSkills: { ...freshLifeSkills(), mining: { level: 7, xp: 40 } } });
  const wsV = fakeWs('vet');
  await join(wsV, 'bp_fresh_vet', { rpgCoins: 3, rpgInventory: { ore_copper: 1 }, rpgLifeSkills: { mining: { level: 1, xp: 0 } } });
  const v = room.playerState['bp_fresh_vet'];
  check('a character on file keeps its own coins, bag and skills -- the payload changes nothing',
    v.coins >= 777 && v.inventory.ore_copper === 12 && v.lifeSkills.mining.level === 7, { coins: v.coins, inv: v.inventory, mining: v.lifeSkills.mining });
}

// ── 6. a read that FAILS is not a new character ──
{
  await st.storage.put('rpg:bp_fresh_flaky', { coins: 4321, level: 12, inventory: { ore_iron: 3 }, lifeSkills: freshLifeSkills() });
  const before = JSON.stringify(st._store.get('rpg:bp_fresh_flaky'));
  const realGet = st.storage.get;
  st.storage.get = async (k) => { if (k === 'rpg:bp_fresh_flaky') throw new Error('test: storage hiccup'); return realGet(k); };
  const realErr = console.error;
  console.error = () => {};
  const wsF = fakeWs('flaky');
  await join(wsF, 'bp_fresh_flaky', CLAIM);
  console.error = realErr;
  st.storage.get = realGet;
  check('a failed read ends the join: the socket is closed to try again', !!wsF.closed && wsF.closed.code === 1011, wsF.closed);
  check('...no state_sync, no player in the room', !wsF.sent.some((m) => m.type === 'state_sync') && !room.playerState['bp_fresh_flaky'], wsF.sent.map((m) => m.type));
  check('...and NOTHING is written over the record (it used to be bootstrapped and saved)', JSON.stringify(st._store.get('rpg:bp_fresh_flaky')) === before);
  /* The player leaves at once, as the AFK sweep removes one: no half-joined
     session for the room to count or a joiner to draw, and the leaving told
     to the room. */
  check('...the player leaves the room at once: no half-joined session is left behind',
    !room.sessions.has(wsF) && !Object.prototype.hasOwnProperty.call(room.getAllPlayerData(), 'bp_fresh_flaky'),
    { kept: room.sessions.has(wsF) });
  check('...and the room is told it left', wsT.sent.some((m) => m.type === 'player_leave' && m.id === 'bp_fresh_flaky'), wsT.sent.slice(-3).map((m) => m.type));
  /* If the runtime fires the close later too, it finds nothing to do -- and
     writes nothing either. */
  await room.webSocketClose(wsF, 1011, 'try again', true);
  check('...nor does a later close from the runtime write anything', JSON.stringify(st._store.get('rpg:bp_fresh_flaky')) === before, st._store.get('rpg:bp_fresh_flaky'));
  const wsF2 = fakeWs('flaky2');
  await join(wsF2, 'bp_fresh_flaky', {});
  const f = room.playerState['bp_fresh_flaky'];
  check('the next join loads the real character', !!f && f.coins >= 4321 && f.inventory.ore_iron === 3, f && { coins: f.coins, inv: f.inventory });
}

// ── 7. a claim behind a "__proto__" key is dropped like any other ──
{
  /* JSON.parse makes "__proto__" an OWN key, and the join helper's spread
     keeps it one, so the frame on the wire carries it exactly as a hand-
     written one would. */
  const hidden = JSON.parse('{"__proto__":' + JSON.stringify(CLAIM) + '}');
  const wsP = fakeWs('proto');
  await join(wsP, 'bp_fresh_proto', hidden);
  const p = room.playerState['bp_fresh_proto'];
  const pStored = st._store.get('rpg:bp_fresh_proto');
  check('a claim behind "__proto__" comes to EXACTLY the character that claimed nothing', !!pStored && pick(pStored) === pick(cStored),
    pStored && { p: pick(pStored), c: pick(cStored) });
  check('...its purse is the new character\'s, not the claimed 1,999', !!pStored && pStored.coins === NEW_CHARACTER_COINS, pStored && pStored.coins);
  const r = p ? await room._shopSell(p, 'bar_00', 50, 'bp_fresh_proto') : { ok: false };
  check('...and Diego buys no made-up "bar_00" through it', !r.ok && !((p && p.inventory) || {}).bar_00, r);
  check('...and nothing leaked onto Object.prototype', ({}).rpgCoins === undefined && ({}).rpgLifeSkills === undefined);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall fresh-start checks passed');
process.exit(failures ? 1 : 0);
