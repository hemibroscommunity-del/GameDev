/* Tutorial-arc test (v2.3.1665) — zone-scoped objectives + item rewards.
 *
 * The arc is what makes the demo "completable by judges" rather than
 * merely playable, so the properties worth pinning are the ones that would
 * quietly break the run-through:
 *   - a kill in the WRONG zone must not count (otherwise "go to Frost
 *     Ridge" is a lie the player can ignore, and the tour collapses)
 *   - a legacy zone-less quest must keep counting kills anywhere
 *   - item rewards land, and their tiers are LOW ENOUGH TO EQUIP (since
 *     v2.3.1661 gear is gated on trained level / defense points, so a
 *     generous gift would be granted and then refused)
 *   - a full weapon stash must not swallow the gold and xp too
 *   - the chain unlocks step by step and pays each step exactly once
 */
import { GameRoom } from '../src/index.js';
import { QUEST_REWARDS, BLACKSMITH_TIERS } from '../src/data.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
function makeState() {
  const store = new Map();
  return {
    _store: store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async () => new Map(store),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}

const room = new GameRoom(makeState(), mockEnv);
const ws = fakeWs('t');
room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: Date.now() });
await room.webSocketMessage(ws, JSON.stringify({
  type: 'join', id: 'bp_t', name: 'Tourist', protocolVersion: 2,
  data: { x: -100000, y: -100000, z: 'meadow' },
}));
const ps = room.playerState.bp_t;
const sess = { id: 'bp_t' };

// ── 1. The chain is well-formed and reachable from a standing start ──
{
  const ids = ['tut_1', 'tut_2', 'tut_3', 'tut_4', 'tut_5'];
  for (const id of ids) check(`${id} exists server-side`, !!QUEST_REWARDS[id], id);
  check('the chain links tut_1 → … → tut_5 → end',
    QUEST_REWARDS.tut_1.next === 'tut_2' && QUEST_REWARDS.tut_2.next === 'tut_3'
    && QUEST_REWARDS.tut_3.next === 'tut_4' && QUEST_REWARDS.tut_4.next === 'tut_5'
    && QUEST_REWARDS.tut_5.next === null);
  check('every tutorial step is server-verified (has an objective)',
    ids.every((id) => !!QUEST_REWARDS[id].objective));
  check('every tutorial step names a zone',
    ids.every((id) => typeof QUEST_REWARDS[id].objective.zone === 'string'));
  /* The gate hazard: granted-then-unequippable is the worst new-player
     moment.  tierIndex 0 => requirement 0 under _prog3EquipOk. */
  check('the granted weapon is tierIndex 0 (equippable at any trained level)',
    Object.keys(BLACKSMITH_TIERS).indexOf(QUEST_REWARDS.tut_3.item.tierKey) === 0,
    QUEST_REWARDS.tut_3.item.tierKey);
  check('the granted armor estimates to tierIndex 0 (needs 0 defense points)',
    Math.round((QUEST_REWARDS.tut_2.item.tierMult - 1) * 6) === 0,
    QUEST_REWARDS.tut_2.item.tierMult);
}

// ── 2. Zone scoping: the whole point of the tour ──
{
  ps._quests = Object.create(null);
  ps._questKills = Object.create(null);
  room._handleQuestAccept(sess, { questId: 'tut_3' });     // "5 kills in frost"
  check('accept marks the quest active', ps._quests.tut_3 === 'active', ps._quests);

  room._creditQuestObjective('bp_t', 'kill', 'fodder', 'meadow');
  room._creditQuestObjective('bp_t', 'kill', 'fodder', 'verdant');
  check('kills in the wrong zone do not count',
    (ps._questKills.tut_3 || 0) === 0, ps._questKills.tut_3);

  room._creditQuestObjective('bp_t', 'kill', 'snowman', 'frost');
  check('a kill in the named zone counts', ps._questKills.tut_3 === 1, ps._questKills.tut_3);

  // A legacy quest with no zone must still count anywhere.
  room._handleQuestAccept(sess, { questId: 'mayor_2' });
  room._creditQuestObjective('bp_t', 'kill', 'fodder', 'ember');
  check('a zone-less legacy objective still counts anywhere',
    ps._questKills.mayor_2 === 1, ps._questKills.mayor_2);

  // An omitted zone argument (older call sites) must not break.
  room._creditQuestObjective('bp_t', 'kill', 'fodder');
  check('an omitted zone argument still credits zone-less quests',
    ps._questKills.mayor_2 === 2, ps._questKills.mayor_2);
  check('an omitted zone argument does NOT credit zone-scoped quests',
    ps._questKills.tut_3 === 1, ps._questKills.tut_3);
}

// ── 3. Turn-in gating and item grants ──
{
  ps._quests = Object.create(null);
  ps._questKills = Object.create(null);
  ps.coins = 0; ps.armor = null; ps.weapon = null; ps.weaponStash = [];

  // tut_2 pays armor after 5 meadow kills.
  room._handleQuestAccept(sess, { questId: 'tut_2' });
  for (let i = 0; i < 4; i++) room._creditQuestObjective('bp_t', 'kill', 'fodder', 'meadow');
  room._handleQuestTurnIn(sess, { questId: 'tut_2', xpCat: 'sword' });
  check('an unmet objective pays nothing and stays active',
    ps._quests.tut_2 === 'active' && ps.coins === 0 && ps.armor === null,
    { st: ps._quests.tut_2, coins: ps.coins, armor: ps.armor });

  room._creditQuestObjective('bp_t', 'kill', 'fodder', 'meadow');   // the 5th
  room._handleQuestTurnIn(sess, { questId: 'tut_2', xpCat: 'sword' });
  check('a met objective turns the quest in', ps._quests.tut_2 === 'turnedIn', ps._quests.tut_2);
  check('gold is paid', ps.coins === QUEST_REWARDS.tut_2.gold, ps.coins);
  check('the armor reward is granted and named',
    ps.armor && ps.armor.name === "Scout's Vest", ps.armor);
  check('granted armor raises maxHp (it went through _recomputeMaxes)',
    ps.maxHp > 100, ps.maxHp);
  check('the next quest unlocks as available', ps._quests.tut_3 === 'available', ps._quests.tut_3);

  const coinsAfter = ps.coins;
  room._handleQuestTurnIn(sess, { questId: 'tut_2', xpCat: 'sword' });
  check('a turned-in quest cannot be claimed twice', ps.coins === coinsAfter, ps.coins);

  // Armor already worn: the grant must not silently replace the player's.
  ps._quests.tut_2 = 'active';
  ps.armor = { name: 'Player Choice', tierMult: 3 };
  room._handleQuestTurnIn(sess, { questId: 'tut_2', xpCat: 'sword' });
  check('an armor grant never overwrites armor the player is wearing',
    ps.armor.name === 'Player Choice', ps.armor);
}

// ── 4. Weapon grant, and the stash-full hazard ──
{
  ps._quests = Object.create(null);
  ps._questKills = Object.create(null);
  ps.weapon = null; ps.weaponStash = [];

  room._handleQuestAccept(sess, { questId: 'tut_3' });
  for (let i = 0; i < 5; i++) room._creditQuestObjective('bp_t', 'kill', 'snowman', 'frost');
  room._handleQuestTurnIn(sess, { questId: 'tut_3', xpCat: 'bow' });
  check('an empty weapon slot receives the granted weapon',
    ps.weapon && ps.weapon.name === "Bro's Blade" && ps.weapon.type === 'greatsword', ps.weapon);
  check('the granted weapon has a forge-shaped blob',
    ps.weapon && ps.weapon.gearBase === 'wood' && ps.weapon.hardness === 0
    && ps.weapon.tier === 'common', ps.weapon);
  check('the granted weapon quality is FIXED, not rolled',
    ps.weapon.quality === 'normal', ps.weapon.quality);
  check('the granted weapon is equippable under the prog3 tier gate',
    room._prog3EquipOk(ps, 'weapon', ps.weapon) === true);

  // Occupied slot + full stash: the grant fails but must NOT eat the rest.
  ps._quests = Object.create(null); ps._questKills = Object.create(null);
  ps.weapon = { type: 'sword', tierMult: 1, name: 'Keeper' };
  ps.weaponStash = new Array(room.WEAPON_STASH_CAP).fill(0).map(() => ({ type: 'sword', tierMult: 1 }));
  ps.coins = 0;
  room._handleQuestAccept(sess, { questId: 'tut_3' });
  for (let i = 0; i < 5; i++) room._creditQuestObjective('bp_t', 'kill', 'snowman', 'frost');
  room._handleQuestTurnIn(sess, { questId: 'tut_3', xpCat: 'bow' });
  check('a full stash does not destroy the equipped weapon',
    ps.weapon.name === 'Keeper', ps.weapon);
  check('a full stash stays at cap (rule 3: no silent overflow)',
    ps.weaponStash.length === room.WEAPON_STASH_CAP, ps.weaponStash.length);
  check('a failed item grant still pays the gold and completes the quest',
    ps.coins === QUEST_REWARDS.tut_3.gold && ps._quests.tut_3 === 'turnedIn',
    { coins: ps.coins, st: ps._quests.tut_3 });
}

// ── 5. A bad reward definition must never break a turn-in ──
{
  ps._quests = Object.create(null);
  check('an unknown item kind is ignored', room._grantQuestItem(ps, { kind: 'nonsense' }) === false);
  check('a weapon with an unknown tier key is refused',
    room._grantQuestItem(ps, { kind: 'weapon', weaponType: 'sword', tierKey: 'unobtanium' }) === false);
  check('a prototype tier key is refused',
    room._grantQuestItem(ps, { kind: 'weapon', weaponType: 'sword', tierKey: 'constructor' }) === false);
  check('a null item is refused', room._grantQuestItem(ps, null) === false);
  const before = JSON.stringify(ps.inventory || {});
  check('an inventory grant lands',
    room._grantQuestItem(ps, { kind: 'inv', key: 'ore_copper_ore', n: 3 }) === true
    && ps.inventory.ore_copper_ore === 3, { before, after: ps.inventory });
}

// ── 6. v2.3.1669: quest XP must name a trained skill ──
{
  const sess = { id: 'bp_t' };
  ps._quests = Object.create(null);
  ps._questKills = Object.create(null);
  ps.coins = 0; ps.armor = null;

  room._handleQuestAccept(sess, { questId: 'tut_1' });
  for (let i = 0; i < 3; i++) room._creditQuestObjective('bp_t', 'kill', 'fodder', 'meadow');

  /* No category, unknown category, prototype key — all refused, and
     refused WHOLE: the quest must stay claimable, not end up turnedIn
     with the reward unpaid. */
  for (const bad of [undefined, 'trebuchet', '__proto__', 42]) {
    room._handleQuestTurnIn(sess, { questId: 'tut_1', xpCat: bad });
  }
  check('an XP-paying turn-in with no valid skill is refused',
    ps._quests.tut_1 === 'active' && ps.coins === 0, { st: ps._quests.tut_1, coins: ps.coins });

  const bowBefore = ps.prog3.sk.bow.level + ps.prog3.sk.bow.xp;
  const swordBefore = ps.prog3.sk.sword.level + ps.prog3.sk.sword.xp;
  room._handleQuestTurnIn(sess, { questId: 'tut_1', xpCat: 'bow' });
  check('naming a skill completes the turn-in', ps._quests.tut_1 === 'turnedIn', ps._quests.tut_1);
  check('the XP went into the NAMED skill',
    ps.prog3.sk.bow.level + ps.prog3.sk.bow.xp > bowBefore, ps.prog3.sk.bow);
  check('the XP did NOT go anywhere else',
    ps.prog3.sk.sword.level + ps.prog3.sk.sword.xp === swordBefore, ps.prog3.sk.sword);
  check('gold is still paid alongside', ps.coins === QUEST_REWARDS.tut_1.gold, ps.coins);
}

console.log(failures === 0 ? '\ntutorial: ALL PASS' : `\ntutorial: ${failures} FAILURE(S)`);
if (failures > 0) process.exit(1);
